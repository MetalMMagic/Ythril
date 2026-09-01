# Ythril — project conventions

## MCP and REST are ONE API with two doors

**Every capability must exist on both surfaces, and take the same parameters.** Owner rule, 2026-08-13.

Not "eventually", not "the tool wraps the route later" — the same commit. This is the single most expensive lesson this
codebase has: five capabilities shipped REST-only because a route was written and its tool "would follow", and
the canary operator had to report all five from the outside before anyone noticed. `mcp-rest-parity.test.js` gates the
capability half and `REST_ONLY_CAPABILITIES` is EMPTY — a row added there is a regression, not a plan.

**Parameters count too, and this is the half that hides.** A capability present on both surfaces still violates the rule
if one door accepts less:

- **The example this rule was written from, and it is FIXED — kept because the shape recurs.** `recall`'s `filter`
  accepted one operator object per key, ANDed, while `query`'s took `$or`/`$and`/`$not`/`$regex`/`$elemMatch` nested to
  depth 8. Same store, same policy, two grammars — so a caller who wanted meaning-ranking *and* a real predicate had to
  make two calls. Reported by the fleet integrator 2026-08-13T1035Z §2 as a parity defect rather than a feature request,
  and `recall` now accepts either grammar (mixing them is refused rather than resolved). What to take from it: both
  doors were individually defensible and the gap was only visible from outside.
- A parameter added to one surface alone is the same defect arriving as an omission. When `/query` gained `skip`, `sort`,
  `dir` and `total`, the MCP tool gained them in the same commit.

**When they must differ, the difference is the narrowing, not the vocabulary.** REST narrows a proxy space by request
(`memberSpacesForRequest`); MCP narrows by the connection's accessible spaces (`memberSpacesWithin`). That is one rule
expressed against two different sources of scope — it is not one surface offering less.

**Check both when you change either.** The parameter names, the defaults, the caps, the refusals, and the error text. A
`400` on one door and a silent default on the other is worse than either alone, because it makes the behaviour depend on
which client the caller happened to pick.

## The five places a capability lives — all of them, same commit

Owner rule, extended 2026-08-13. "MCP and REST" is not the whole list. A capability change is not done until all five
agree:

1. **the REST route**
2. **the MCP tool** — same parameters, same defaults, same caps, same refusals
3. **`docs/integration-guide/`** — the integrator's reference
4. **`docs/userguide/` — the page an operator would actually open for this capability.** Six pages, and which one it is
   follows the surface the operator uses: a search parameter is `02-brain.md` → Brain → Search, a token control is
   `04-settings.md`, retention and audit are `05-storage-data-and-audit.md`. Do not read this row as "the Brain page" —
   that is only where it was learned, and a capability documented on the wrong page is the failure it prevents. A
   parameter that exists on both APIs and is absent from the operator's page is a capability nobody using the UI knows
   about; a control described there that no longer matches the API is worse
5. **token rights** — `auth/space-rights.ts`. A new route with no rights row is either unreachable or ungoverned, and both
   fail silently

The failure this prevents is not "documentation drift". It is that **each of these is somebody's authoritative source**,
and the one that is wrong is invisible to whoever reads it: The fleet integrator designed around a stale sentence in an MCP schema;
the canary operator could not find an env var that was documented on the wrong page; a user reading the Search page cannot
discover a `skip` that only the API has.

**Check all five when you change any one.** If one genuinely does not apply, say which and why in the commit — not in your
head.

## A schema description is the authoritative reference — treat it as code

An MCP tool's `inputSchema` description is what a caller reads *while constructing arguments*, and `help()` says so in as
many words. A stale sentence there is invisible: nobody reports a capability they were told they did not have.

The fleet integrator read *"filter applied after vector search"* on `recall`, believed it, and built a skill that deliberately avoided
filtered recall — because a post-filter behind `topK` could silently drop results. The filter is a **pre**-filter. Our own
`help()` said so correctly at the same time. Two surfaces describing one behaviour, and the wrong one was the one being
read.

## The defect class this repo produces most

One rule, two implementations, and the weaker one wins silently. It has shipped as: a proxy lens computed and discarded on
three routes; an empty allowlist read as "unrestricted" on three more; REST validating existence where MCP checked only
shape; a paging window inline in one route and correct in another. When you find yourself writing the same rule a second
time, extract it instead — `spaces/page-across-members.ts` exists because of this.

**It is not only a server pattern, and the count is usually higher than it looks.** An edge endpoint's shape rule had
FIVE copies — the REST route, the MCP tool, the bulk importer, sync's link-violation check, and the embed-text resolver —
each correct while every endpoint was an entity, and each about to be wrong in a different way. The one to check hardest
is the copy that RECORDS rather than refuses: sync's would have logged two link violations per legitimate edge, which an
operator reads as real damage. `bulkDelete{Edges,Entities,Memories,Chrono}` is the same rule four times and is still
open (`R-4`).

## A field on a replicated document is HASHED and replicated, or excluded from the hash — never neither

Found while shipping M-1 and finished by W-10, 2026-09-01. A rule rather than an incident because both halves
are invisible from both ends.

**Stripping.** `api/sync/_shared.ts` validates every PUSHED document with a bare `z.object({...})`, and **zod
strips keys the schema does not declare.** The pull path validates nothing. So a field on `EdgeDoc`,
`MemoryDoc`, `EntityDoc` or `ChronoEntry` that is missing from its `Incoming*` twin is **kept when the record
arrives by pull and deleted when the same record arrives by push** — same version of the code, same document,
one direction, no error, no statistic, and a 200 on the way back.

**Hashing.** `brain/merkle.ts` hashes every field of every brain document except the five it excludes. That
hash is what tells an operator whether two instances hold the same data.

Put them together and the rule has no judgement left in it: **a field that is hashed must replicate.** If it
does not, the sender's copy has the key, the receiver's does not, and a network with `merkle: true` logs a
`MERKLE_DIVERGENCE` warning every cycle for a space where nothing is wrong. The check is advisory, so nothing
ever contradicts it — and a permanent false alarm teaches an operator to ignore the one signal that means data
really is missing.

`a-replicated-field-reaches-its-incoming-schema.test.js` derives its exemptions from `merkle.ts` rather than
keeping a list. Adding a field means declaring it on the ingest schema, or excluding it from the hash in BOTH
places `merkle.ts` states the set (`DERIVED_FIELDS`, and the projection).

- **What is legitimately excluded, and why the two categories differ.** A vector and its model name are derived
  by the LOCAL embedding model; the two retention stamps are computed from the LOCAL space policy. Neither can
  travel: peers running different models hold different vectors for identical content, and shipping a retention
  stamp would let one instance decide when another deletes its data.
- **What a local schedule DID to a record is not local.** `contentRedacted` and `contentRedactedAt` say that an
  entry had a description and no longer has it. They replicate and they are hashed — excluded, a redacted entry
  would hash identically to one that still has its detail, which is real divergence going unreported.
- **Deriving the rule is what found the fields nobody had reported.** A hand-written list of exemptions named
  none of `MemoryDoc.type` (it selects the memory's type schema, so a pushed memory was validated against
  nothing on the receiver) or the two chrono redaction marks. A reason once written is never re-read; a rule
  read out of the code that governs the behaviour cannot go stale the same way.

## What a receiver does after the write is the RECEIVER's decision

Owner's ruling, 2026-09-01: *"dont transfer embeddings... on transfer the receiver applies its rules. if the
space has supressembeddings dont embed at all. if it should embed use the receivers embedding mechanism."*

No ingest schema declares `embedding` or `embeddingModel`, on any of the four types. Every arriving document is
written and queued for embedding in one call — `ingestBrainDoc` in `api/sync/_shared.ts` is the only thing in
the ingest router permitted to write a brain document, so a new ingest site cannot be written without the
queue. Whether to embed is then `embeddingSuppressedFor`, resolving `record > schema > space` against THIS
instance's configuration.

- **The record tier has to cross the wire for that to be true.** Both spellings of the suppression mark
  replicate. Stripped, a record its author retired from meaning-ranked search would re-enter it on every peer.
- **A vector from another instance is not a saving.** Ranking one model's vectors against another's does not
  fail — it returns plausible results in the wrong order, which is the kind of wrong nobody reports.
