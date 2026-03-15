# Ythril User Guide

Practical reference for operating a Ythril brain: managing networks, controlling membership, and understanding the governance rules that govern each network type.

For high-level concepts (what the network types *mean*) see [network-types.md](network-types.md).  
For the wire protocol see [sync-protocol.md](sync-protocol.md).

---

## Table of contents

1. [Creating a network](#creating-a-network)
2. [Managing members](#managing-members)
3. [Governance and voting](#governance-and-voting)
4. [Braintree governance in detail](#braintree-governance-in-detail)
5. [Leaving a network](#leaving-a-network)
6. [Triggering sync manually](#triggering-sync-manually)
7. [Merkle integrity](#merkle-integrity)

---

## Creating a network

```
POST /api/networks
Authorization: Bearer <PAT>
```

Body fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | string | yes | Human-readable name |
| `type` | `"closed"` \| `"democratic"` \| `"club"` \| `"braintree"` | yes | Governance model |
| `spaces` | string[] | yes | Space IDs to include in this network |
| `votingDeadlineHours` | integer (1–72) | no (default 24) | How long a vote round stays open |
| `id` | UUID | no | Pre-specify an ID; useful when registering the same network on a second brain |
| `myParentInstanceId` | UUID | no | **Braintree only.** This brain's parent in the tree. Omit to declare this brain the root. |

**Example — create root of a braintree:**

```json
POST /api/networks
{
  "label": "Engineering team",
  "type": "braintree",
  "spaces": ["eng-kb"],
  "votingDeadlineHours": 48
}
```

Response `201`:

```json
{
  "id": "a1b2c3d4-...",
  "label": "Engineering team",
  "type": "braintree",
  "spaces": ["eng-kb"],
  "votingDeadlineHours": 48,
  "members": [],
  "pendingRounds": [],
  "createdAt": "2026-03-15T12:00:00.000Z"
}
```

**Example — register the same network on a second brain (intermediate node):**

If Brain B wants to join the network and knows it will sit one level below Brain A:

```json
POST /api/networks
{
  "id": "a1b2c3d4-...",
  "label": "Engineering team",
  "type": "braintree",
  "spaces": ["eng-kb"],
  "votingDeadlineHours": 48,
  "myParentInstanceId": "<instanceId of Brain A>"
}
```

`myParentInstanceId` tells Brain B: *"My position in this tree is directly below Brain A."* This is used during governance to build the ancestor path for any join or removal round Brain B opens.

---

## Managing members

### Add a member

```
POST /api/networks/:id/members
Authorization: Bearer <PAT>
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `instanceId` | string | yes | The candidate brain's instance ID |
| `label` | string | yes | Human-readable name for this peer |
| `url` | string (URL) | yes | Base URL of the peer's API |
| `token` | string | yes | Plaintext peer authentication token |
| `direction` | `"both"` \| `"push"` | no (default `"both"`) | Sync direction; braintree networks always use `"push"` |
| `parentInstanceId` | UUID | no | **Braintree only.** Declares who the new member's parent is in the tree |
| `skipTlsVerify` | boolean | no | Disable TLS verification (dev/test only; shows security warning) |

**Possible responses:**

| Status | Meaning |
|--------|---------|
| `201` | Member added immediately (club, braintree root, or single-ancestor braintree that auto-approved) |
| `202` | Vote round opened; member pending approval — see [Governance and voting](#governance-and-voting) |
| `409` | Member already exists |

### Remove a member

```
DELETE /api/networks/:id/members/:instanceId
Authorization: Bearer <PAT>
```

| Status | Meaning |
|--------|---------|
| `204` | Member removed immediately |
| `202` | Vote round opened for removal |

---

## Governance and voting

When a join or removal triggers a vote round, the caller receives `202` with a `roundId`:

```json
{
  "status": "vote_pending",
  "roundId": "59cb42c5-..."
}
```

### List open rounds

```
GET /api/networks/:id/votes
Authorization: Bearer <PAT>
```

Returns all rounds (open and concluded) for that network.

### Cast a vote

```
POST /api/networks/:id/votes/:roundId
Authorization: Bearer <PAT>
Content-Type: application/json

{ "vote": "yes" }
```

or

```json
{ "vote": "veto" }
```

Response:

```json
{
  "concluded": true,
  "round": { "roundId": "...", "passed": true, ... }
}
```

- If the round has not yet reached its threshold, `concluded` is `false` and the round stays open until more votes arrive or the deadline passes.
- A single `"veto"` always concludes the round immediately with `passed: false` (for `closed` and `braintree` networks). For `democratic` networks a veto also blocks regardless of yes count.

### Vote propagation

Votes are gossiped between peers during each sync cycle — you do not need to call every relevant brain directly. Cast your vote once on your own brain; the engine pushes it to all peers during the next sync.

---

## Braintree governance in detail

Braintree is the only network type where governance is **position-dependent** in the tree.

### The ancestor path rule

Every join or removal triggers a vote round on the **inviting/proposing brain**. The required voters are exactly the brains on the path from the proposer up to the root, including the proposer itself.

```
Root (must vote)
  └── Node A (must vote — opened the round)
        └── Leaf B (candidate — not a required voter)
```

If Node A opens a round to add Leaf B, **both Node A and Root must vote yes**. Node A is always one of the required voters because it opened the round (it implicitly approves its own proposal by auto-casting yes). Root then decides whether to allow the addition deeper in its tree.

For a **root-level add** (the root itself is inviting a direct child), the ancestor path is just `[root]`. The root auto-casts yes and the round concludes immediately → `201` returned directly, no 202.

### `requiredVoters`

The vote round stores the computed path at creation time:

```json
{
  "roundId": "...",
  "type": "join",
  "requiredVoters": ["<instanceId of Node A>", "<instanceId of Root>"],
  "votes": [
    { "instanceId": "<instanceId of Node A>", "vote": "yes", "castAt": "..." }
  ],
  "concluded": false
}
```

The round concludes (passes) when every entry in `requiredVoters` has a yes vote. Any single veto in `requiredVoters` immediately concludes the round as failed.

### Setting up a multi-level tree

**Step 1.** Create the network on the root brain (no `myParentInstanceId`):

```json
POST /api/networks  (on Root)
{
  "type": "braintree",
  "label": "My tree",
  "spaces": ["shared"]
}
→ 201, id = "net-123"
```

**Step 2.** Add Node A as a direct child of Root:

```json
POST /api/networks/net-123/members  (on Root)
{
  "instanceId": "<Node A instanceId>",
  "label": "Node A",
  "url": "https://node-a.example.com",
  "token": "<PAT from Node A>",
  "direction": "push",
  "parentInstanceId": "<Root instanceId>"
}
→ 201 (root auto-approves, single ancestor)
```

**Step 3.** Register the network on Node A, declaring Root as parent:

```json
POST /api/networks  (on Node A)
{
  "id": "net-123",
  "type": "braintree",
  "label": "My tree",
  "spaces": ["shared"],
  "myParentInstanceId": "<Root instanceId>"
}
```

**Step 4.** Node A adds Leaf B (requires both Node A and Root to approve):

```json
POST /api/networks/net-123/members  (on Node A)
{
  "instanceId": "<Leaf B instanceId>",
  "label": "Leaf B",
  "url": "https://leaf-b.example.com",
  "token": "<PAT from Leaf B>",
  "direction": "push",
  "parentInstanceId": "<Node A instanceId>"
}
→ 202 { "status": "vote_pending", "roundId": "..." }
```

Node A auto-cast its yes vote. The round now waits for Root.

**Step 5.** Root discovers the round via gossip (trigger sync or wait for the scheduled cycle), then votes:

```json
POST /api/networks/net-123/votes/<roundId>  (on Root)
{ "vote": "yes" }
→ 200 { "concluded": true }
```

**Step 6.** Root's engine pushes the yes vote back to Node A on the next sync. Node A's round concludes and Leaf B is added to Node A's member list. Sync from Node A to Leaf B begins.

### Removal in a braintree

Same ancestor-path rule applies. The required voters are the ancestors of the **subject's parent** — i.e. the path from the subject's direct parent up to the root.

If Root removes Node A directly: `requiredVoters = [Root]` → immediate `204`.  
If Node A removes Leaf B: `requiredVoters = [Node A, Root]` → same two-step approval as joining.

### What happens if an ancestor vetoes

A veto from any `requiredVoter` concludes the round immediately as failed. The candidate is not added (or the subject is not removed). The veto is propagated via gossip and the opening brain sees `concluded=true, passed=false` on its next sync cycle.

### Backward compatibility

Rounds created before `requiredVoters` was introduced (i.e. rounds with no `requiredVoters` field) fall back to the old behaviour: all current members must vote yes. This means existing data is never broken by upgrades.

---

## Leaving a network

A brain can leave any network it belongs to:

```
DELETE /api/networks/:id
Authorization: Bearer <PAT>
```

This broadcasts a `member_departed` event to all peers before removing the network locally. Peers remove this brain from their member list on the next sync. All local data in the network's spaces is retained — the network config is removed, not the underlying space data.

For braintree networks, a departing intermediate node partitions its subtree. Leaves that were beneath it must either wait for the parent to return or be re-admitted under a different parent.

---

## Going off-grid: forking a network

A departing or ejected member can create a new, independent network seeded from their local copy of the data — they become the root of a new tree.

```
POST /api/networks/:id/fork
Authorization: Bearer <PAT>
Content-Type: application/json

{
  "label": "My fork",
  "type": "closed",
  "votingDeadlineHours": 24,
  "spaces": ["space-id-1"]
}
```

| Field | Required | Description |
|---|---|---|
| `label` | Yes | Human-readable name for the new network |
| `type` | No | `closed` (default) or `club` |
| `votingDeadlineHours` | No | Defaults to the source network's value, or 24 if unavailable |
| `spaces` | Conditional | Required if the source network has already been removed locally (ejection case); optional override otherwise |

**Scenarios:**

- **Still a member** — `:id` matches a live network in `cfg.networks`. `spaces` and `votingDeadlineHours` are inherited from the source; you can override both in the body.
- **Ejected** — when a `member_removed` notification is received, the source `NetworkConfig` is deleted from `cfg.networks` and the network id is recorded in `ejectedFromNetworks`. After ejection the source network is gone, so you **must** supply `spaces` explicitly. All requested space ids must exist locally.
- **Unknown id** — if the id is in neither `cfg.networks` nor `ejectedFromNetworks` the call returns `404`.

**What the fork produces:**

- A brand-new `NetworkConfig` with a fresh UUID
- No members and no pending rounds — the fork is a clean starting point
- The caller is implicitly the root; they can then invite peers via the normal `POST /api/networks/:id/invite` → join flow
- The original network (if still present) is not touched

**Status codes:**

| Code | Meaning |
|------|---------|
| `201` | Fork created; response body is the new `NetworkConfig` |
| `400` | Validation error: missing `label`, unknown space id, or ejected network with no `spaces` in body |
| `404` | Network id not found and not in `ejectedFromNetworks` |

---

## Triggering sync manually

```
POST /api/notify/trigger
Authorization: Bearer <PAT>
Content-Type: application/json

{ "networkId": "<network id>" }
```

Runs a full sync cycle immediately for the given network (all spaces, all peers including gossip and vote propagation). Returns `200 { "status": "triggered" }` before the cycle completes — it runs asynchronously.

This is useful during governance flows where you want to pull a peer's open vote rounds or push a just-cast vote without waiting for the scheduled sync interval.

---

## Merkle integrity

Each network can opt in to Merkle-based divergence detection by setting `"merkle": true` in its network config. When enabled, the sync engine computes a SHA-256 binary Merkle tree over the contents of each shared space after every sync cycle and compares roots with the remote peer. A mismatch is logged as a `MERKLE_DIVERGENCE` warning — no automatic corrective action is taken; the warning is an alert for manual investigation.

### Enabling Merkle for a network

Add `"merkle": true` when creating the network:

```json
POST /api/networks
{
  "label": "My secure net",
  "spaces": ["shared"],
  "merkle": true
}
```

Or include it when registering a network that was created by a peer:

```json
POST /api/networks
{
  "id": "<existing network id>",
  "label": "My secure net",
  "spaces": ["shared"],
  "merkle": true
}
```

### Querying the Merkle root

```
GET /api/sync/merkle?spaceId=<space id>&networkId=<network id>
Authorization: Bearer <PAT>
```

Response:

```json
{
  "spaceId": "shared",
  "networkId": "<network id>",
  "root": "<64-char hex SHA-256>",
  "leafCount": 42,
  "computedAt": "2025-01-01T00:00:00.000Z"
}
```

| Field | Description |
|-------|-------------|
| `root` | SHA-256 Merkle root of all memory documents and files in the space. An empty space returns `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (SHA-256 of the empty string). |
| `leafCount` | Number of leaf nodes (documents + files) that were hashed. |
| `computedAt` | ISO timestamp when the root was computed. |

Returns `403` if the caller's PAT does not have access to the requested space (or the space does not exist).

### Divergence warning

When the sync engine detects that two peers' roots differ after sync, it emits a log line:

```
WARN [engine] MERKLE_DIVERGENCE spaceId=<id> networkId=<id> local=<hex> remote=<hex>
```

Common causes:
- In-flight writes on either side that haven't replicated yet (transient — resolves on the next sync cycle)
- A document was mutated directly in the database without going through the API (permanent until the document is written through the API again)
- Data loss or corruption on one peer
