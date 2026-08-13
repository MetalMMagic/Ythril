# Ythril — project conventions

## MCP and REST are ONE API with two doors

**Every capability must exist on both surfaces, and take the same parameters.** Owner rule, 2026-08-13.

Not "eventually", not "the tool wraps the route later" — the same commit. This is the single most expensive lesson this
codebase has: five capabilities shipped REST-only because a route was written and its tool "would follow", and
breituai-platform had to report all five from the outside before anyone noticed. `mcp-rest-parity.test.js` gates the
capability half and `REST_ONLY_CAPABILITIES` is EMPTY — a row added there is a regression, not a plan.

**Parameters count too, and this is the half that hides.** A capability present on both surfaces still violates the rule
if one door accepts less:

- `recall`'s `filter` accepts one operator object per key, ANDed. `query`'s accepts `$or`/`$and`/`$not`/`$regex`/
  `$elemMatch` nested to depth 8. Same store, same policy, two grammars — so a caller who wants meaning-ranking *and* a
  real predicate has to make two calls. Reported by aigents 2026-08-13T1035Z §2, and it is a parity defect rather than a
  feature request.
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
4. **`docs/userguide/02-brain.md` → Brain → Search** — what an operator reads in the product. A parameter that exists on
   both APIs and is absent from that page is a capability nobody using the UI knows about; a control described there that
   no longer matches the API is worse
5. **token rights** — `auth/space-rights.ts`. A new route with no rights row is either unreachable or ungoverned, and both
   fail silently

The failure this prevents is not "documentation drift". It is that **each of these is somebody's authoritative source**,
and the one that is wrong is invisible to whoever reads it: aigents designed around a stale sentence in an MCP schema;
breituai-platform could not find an env var that was documented on the wrong page; a user reading the Search page cannot
discover a `skip` that only the API has.

**Check all five when you change any one.** If one genuinely does not apply, say which and why in the commit — not in your
head.

## A schema description is the authoritative reference — treat it as code

An MCP tool's `inputSchema` description is what a caller reads *while constructing arguments*, and `help()` says so in as
many words. A stale sentence there is invisible: nobody reports a capability they were told they did not have.

aigents read *"filter applied after vector search"* on `recall`, believed it, and built a skill that deliberately avoided
filtered recall — because a post-filter behind `topK` could silently drop results. The filter is a **pre**-filter. Our own
`help()` said so correctly at the same time. Two surfaces describing one behaviour, and the wrong one was the one being
read.

## The defect class this repo produces most

One rule, two implementations, and the weaker one wins silently. It has shipped as: a proxy lens computed and discarded on
three routes; an empty allowlist read as "unrestricted" on three more; REST validating existence where MCP checked only
shape; a paging window inline in one route and correct in another. When you find yourself writing the same rule a second
time, extract it instead — `spaces/page-across-members.ts` exists because of this.
