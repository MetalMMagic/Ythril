---
name: verify
description: Runtime-verify a client or server change by booting an isolated Ythril instance (scratch config + scratch Mongo DB) and driving the Angular UI with Playwright. Use before committing nontrivial client/server changes.
---

# Verifying Ythril changes end-to-end

The user's real instance runs in Docker on port 3210 with real data — never drive it.
Boot an isolated copy instead; it takes ~30 s.

## Isolated server (from source, scratch state)

```powershell
$env:PORT='3260'; $env:TRUST_PROXY='1'                 # TRUST_PROXY=1 or the dev proxy's xfwd header 500s every API call (rate limiter)
$env:CONFIG_PATH='<scratch>\config\config.json'        # nonexistent file → server boots in first-run /setup mode
$env:DATA_ROOT='<scratch>\data'
$env:MONGO_URI='mongodb://127.0.0.1:27017/ythril_scratch'   # host mongod (8.2+, supports $vectorSearch); distinct DB name isolates it
Set-Location server; npx tsx src/index.ts              # run in background, redirect output to a log
```

Wait for `http://localhost:3260/health` → 200. To reset to first-run: stop the server,
delete the scratch config files, drop the scratch DB
(`node -e "...MongoClient... db('ythril_scratch').dropDatabase()"` using the repo's mongodb package),
restart. The server caches config in memory — a restart is required.

## Client dev server

`proxy.conf.json` targets 3210 — make a scratch copy pointing at 3260 (must be UTF-8 **without BOM**;
PowerShell 5.1 `-Encoding utf8` writes a BOM and ng fails with `[1,1] InvalidSymbol`):

```powershell
Set-Location client; npx ng serve --port 4260 --proxy-config <scratch>\proxy.conf.json
```

## Driving the UI (Playwright, no install needed beyond npm)

`npm i playwright` in a scratch dir; launch with `channel: 'msedge'` (installed on this machine — no browser download).

Flow and selectors that work:
- `/` unauthenticated → redirects to `/login`; click "Run first-time setup" → `/setup`.
- Setup: `#label`, `#pw`, `#pw2`, submit → `.alert-success`, token in `.code-block span` (save it!), "Continue to sign in".
- Login: `#token` + submit; bad token → "Invalid or expired token.".
- Spaces/Tokens create flows are dialogs: "Create New Space" / "Create Token" buttons open them; submit with
  `getByRole('button', {name: 'Create', exact: true})` — `has-text` is case-insensitive and matches the opener button too.
- Brain tabs (Query, Graph, Files, Entities, Edges, Memories, Chrono, File Meta) carry count badges —
  match with non-exact `getByText(tab).first()`.
- Entity add-form's NAME field is the only visible input without a placeholder: `input:not([placeholder]):visible`.
- Strong CD probes: language switch on `/settings/preferences` (`.lang-btn` "Deutsch" → nav shows "Abmelden"),
  token create → success panel → list update, entity create → tab badge increments.

Routes to sweep: `/brain`, `/files/conflicts`, `/schema-library`, `/settings/{tokens,spaces,storage,networks,preferences,audit-log,data,about,models,duplicates}`.

## Gotchas

- Setup auto-creates a "General" space.
- Collect page console errors; filter for `NG0`/zone patterns after change-detection work.
- One benign 500 ("Config not loaded") is logged during first-run before setup completes — pre-existing server behavior, not a client bug.
- On plain host mongod the server logs "Could not list search indexes" warnings — harmless in scratch runs.
