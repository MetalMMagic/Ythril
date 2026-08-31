/**
 * The Brain's tab identifiers, in one place.
 *
 * `BrainTab` lived in `brain.component.ts` and a subset of it, `StatKey`, was declared independently in
 * `overview-tab.component.ts` for the Overview's clickable stat tiles. The two agreed by hand, which meant
 * the drift was one-directional and silent: adding a key to the child's copy that the parent lacked failed
 * the build, but adding a TAB to the parent and a matching tile still typed against the stale child copy
 * did not — the tile simply could not open its tab, and nothing said so.
 *
 * Deriving the whole union from the collection tabs removes the possibility rather than documenting it.
 * `CollectionTab` is a subset of `BrainTab` **by construction**, so no assertion is needed and no
 * `Extract<>` can quietly evaluate to `never` on a typo.
 *
 * It lives in its own file rather than being exported from `brain.component.ts` so the Overview tab does
 * not import from its own parent — that edge would make the two mutually dependent for a string union.
 */
/**
 * Tabs backed by a per-space collection. These are exactly the tabs an Overview stat tile can open,
 * because a tile shows a count and only a collection has one.
 *
 * A runtime array as well as a type: the Overview builds its tiles from data, and a second hand-written
 * list of the same five strings is the thing this file exists to prevent.
 */
export const COLLECTION_TABS = ['memories', 'entities', 'edges', 'chrono', 'files'];
/** The views that are not backed by one collection. */
const NON_COLLECTION_TABS = ['overview', 'query', 'graph', 'review'];
/**
 * Every Brain tab, at runtime.
 *
 * Needed because the tab is now readable from the URL, and a value arriving from outside the app has to be
 * checked against something that exists at runtime — a type cannot reject `?tab=nonsense`. Derived from the
 * same two lists the type is, for the reason this whole file exists: a second hand-written copy would agree
 * by hand until it did not.
 */
export const BRAIN_TABS = [...COLLECTION_TABS, ...NON_COLLECTION_TABS];
