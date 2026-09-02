/**
 * The preview's object URL, and the only thing on the files page that owns a resource which must be RELEASED.
 *
 * ## Why it is a class of its own
 *
 * Everything else on this page is a signal or a request: forget one and nothing is lost. A blob URL is
 * different in both directions, and both directions are invisible.
 *
 * - **Leak it** and the blob stays alive for the life of the tab. Nothing reports it, no test notices, and
 *   the page keeps working.
 * - **Release it too early** and an `<img>` or `<iframe>` still bound to it silently fails to load, which
 *   looks like a slow network rather than a bug.
 *
 * So the lifetime lives in one place with three ways out — the pane closing, the selection moving, and the
 * view being destroyed — instead of three call sites each remembering to release. That is also what made the
 * ninth cut of `G-3` possible without growing the component: the guard below had to go somewhere, and the
 * god-file ratchet is explicit that new behaviour goes BESIDE a frozen file rather than inside it.
 *
 * ## The race `bindIfCurrent` closes
 *
 * `openPreview` releases the current URL synchronously and then fetches; the fetch resolves later. Arrow from
 * A to B before A's response arrives and the order is: release nothing (A has not resolved yet), start B,
 * **A resolves and takes the pane**, B resolves and overwrites it. A's blob is then unreachable and never
 * released, and between the two responses A's image is on screen under B's name.
 *
 * The spreadsheet branch had guarded exactly this since it was written — *"fast arrow-nav moved on"* — while
 * the image and PDF branch, the only one that ALLOCATES anything, had not. One rule, two implementations, and
 * the weaker one where being wrong costs more than a stale table.
 *
 * A stale URL is RELEASED rather than dropped: it was created by the caller a line earlier, so returning
 * without releasing it would trade a wrong image for a certain leak.
 */
export class PreviewObjectUrl {
  private current: string | null = null;

  /** The URL currently bound to the pane, or `null`. Read-only on purpose — binding goes through the guard. */
  get value(): string | null {
    return this.current;
  }

  /**
   * Take ownership of `objUrl` if the pane is still showing what the caller fetched, or release it if not.
   *
   * `stillCurrent` is a predicate rather than a value so the check happens HERE, at the moment of binding.
   * Passing a boolean would move the decision back to the caller and let it be computed too early, which is
   * the same mistake in a different place.
   *
   * @returns the URL if it was bound, or `null` if it was released as stale.
   */
  bindIfCurrent(objUrl: string, stillCurrent: () => boolean): string | null {
    if (!stillCurrent()) {
      URL.revokeObjectURL(objUrl);
      return null;
    }
    this.release();
    this.current = objUrl;
    return objUrl;
  }

  /** Release the bound URL, if any. Idempotent — closing twice must not double-revoke. */
  release(): void {
    if (this.current) {
      URL.revokeObjectURL(this.current);
      this.current = null;
    }
  }

/*
 * There was an `adopt(url)` here for a caller that already knows the pane is current. It had no production
 * caller — the download path creates its own URL bound to an `<a download>` and releases it on a timer, which
 * is a different lifetime — and the only thing that wanted it was the tests, which now stand a URL up through
 * `bindIfCurrent(url, () => true)`: the real path, with a predicate that holds. A method kept alive by its own
 * test is how a third way to bind would have arrived.
 */
}
