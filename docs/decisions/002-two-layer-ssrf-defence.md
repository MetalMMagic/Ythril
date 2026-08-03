# 002 — SSRF is checked twice: a string check at config time, a DNS-resolved check at use time

**Status:** accepted · **Scope:** `server/src/util/ssrf.ts` and every caller that takes a URL from a user

## Context

Ythril accepts URLs from operators in several places: network peers, invite bundles, webhook destinations, model
endpoints, the schema library, and the Mongo URI. Each one is a server-side fetch to an address a user chose, which is
the definition of an SSRF surface — and the interesting targets are internal: `127.0.0.1`, RFC-1918 ranges, and cloud
instance metadata at `169.254.169.254`.

A single check cannot cover this, because the two failure modes are different in kind:

- a **literal** internal address, which can be written in a dozen encodings — dotted-decimal, decimal/hex/octal
  integers, short forms like `127.1`, IPv4-mapped IPv6 like `[::ffff:127.0.0.1]`;
- a **hostname** that resolves to an internal address, or resolves safely and then redirects to one, or resolves
  differently the second time it is asked (DNS rebinding).

The first is catchable when the value is saved. The second is only catchable when the request is made.

## Decision

Two layers, deliberately overlapping:

1. **`isSsrfSafeUrl`** — synchronous, no allocation, no DNS. Used inside Zod refinements at **config time**. Rejects
   unsafe schemes, embedded credentials, and any host that is *literally* a blocked address in any of its encodings.
   Its job is to reject bad input where the user can still see the form and fix it.
2. **`assertUrlSafeResolved` / `ssrfSafeFetch`** — asynchronous and **authoritative**, at **use time**. Resolves the
   hostname and validates **every** A/AAAA record, then follows redirects **manually**, re-validating each hop.

Private addresses can be permitted **per slot** (`allowPrivateForSlot`) so an on-cluster embedding server works
without relaxing the guard for a public vendor endpoint. Even then, DNS pinning and redirect re-validation still
apply, and the crown jewels — loopback, link-local/IMDS, the unspecified address — stay blocked regardless.

## Consequences

- Two checks means two places to keep in step; the block ranges live in one module so they cannot diverge.
- The use-time check costs a DNS resolution per outbound call to a user-supplied host. That is the price of catching
  rebinding.
- **This is the reversal to prevent:** the layers look redundant. Someone tidies up by deleting the config-time check
  ("the fetch validates anyway") or by trusting the config-time check and using a plain `fetch` ("we already
  validated") — and each of those reopens a different hole. The first loses the immediate feedback that stops a
  mistake being saved; the second loses everything DNS can do between save and use.
- A relaxation must be **per slot**, never global. A single `allowPrivate` flag would be one config mistake away from
  turning the whole product into an internal-network scanner.

## Where the detail lives

- `server/src/util/ssrf.ts` — the module docstring enumerates both layers and every blocked range, IPv4 and IPv6.
- `server/src/config/model-egress-policy.ts` — the per-slot private-address policy.
- `docs/integration-guide/02-hosting.md` — the operator-facing view, including `SYNC_ALLOW_PRIVATE_PEERS`.
- The SSRF and peer-policy suites under `testing/` — including a test that a request for an unresolvable hostname is
  still routed to the pinned IP, so DNS cannot be bypassed.
