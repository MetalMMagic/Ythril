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

## Client: prefer the BUILT bundle over `ng serve`

The server already serves the compiled SPA — `express.static(client/dist/browser)` with an index.html
fallback — so `npm run build:client` and then driving **`http://localhost:3260`** needs no second process, no
proxy file, and tests the bundle that actually ships. Rebuild after each client edit (~7 s).

Only reach for the dev server when you need HMR or source maps. `proxy.conf.json` targets 3210, so make a
scratch copy pointing at 3260 (must be UTF-8 **without BOM**; PowerShell 5.1 `-Encoding utf8` writes a BOM
and ng fails with `[1,1] InvalidSymbol`):

```powershell
Set-Location client; npx ng serve --port 4260 --proxy-config <scratch>\proxy.conf.json
```

## Driving the UI (Playwright, no install needed beyond npm)

`npm i playwright` in a scratch dir; launch with `channel: 'msedge'` (installed on this machine — no browser download).

Flow and selectors that work (verified 2026-08-01 against the built bundle on :3260):
- Served from the bundle, the **server itself** redirects `/` → `/setup` on a first run. There is no `/login`
  hop to click through, so wait for `/(setup|login)` and branch.
- Setup is **label-only**: `#label` then `#submitBtn`. There are no `#pw`/`#pw2` fields and no
  `.alert-success`.
- **Read the new token from the page TEXT, not from `input#token`** (corrected 2026-08-05, against the built
  bundle on :3260). After submit the page has **no inputs at all**, so `waitForSelector('input#token')` burns
  its full timeout and the run dies having already consumed the one-time token — the next attempt then lands
  on `/login` with no way in. Match `/ythril_[A-Za-z0-9_-]+/` against `page.textContent('body')` after a short
  wait, and **write it to a file immediately**. If you do lose it: stop the server, delete the scratch config,
  drop the scratch DB, restart — that is the only way back to `/setup`.
  Behind the dev proxy the older flow (`.code-block span`, "Continue to sign in") may still apply.
- Login: `#token` + submit; bad token → "Invalid or expired token.".
- **`/files` redirects to `/brain`.** The file manager is a Brain **tab** ("Files", with a count badge), not
  its own route. Its upload `<input type=file>` is `hidden` inside a label — `setInputFiles` works on it, but
  only once the tab is open.
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
