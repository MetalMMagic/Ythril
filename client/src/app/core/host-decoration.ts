/**
 * Wear the host page's decoration inks, when it supplies them.
 *
 * ## What this is answering
 *
 * The canary operator, 2026-08-18T1806Z (board record `2023b882`), as an explicit ask rather than a request:
 * *"Nothing here is urgent, nothing is blocked on you, and 'not our aesthetic' is a complete answer that we will
 * not raise again."* Owner ruled **A** — take the CSS — on 2026-08-19 (was P-11).
 *
 * Their portal serves a stylesheet that already declares eleven decoration custom properties on `:root`, under
 * their own names and mapped onto nothing of ours: `--tr-oxide`, `--tr-deep`, `--tr-mid`, `--tr-hot`, `--tr-cyan`,
 * `--tr-dead`, `--via-live`, `--via-cold`, `--electron`, `--glow`, `--decor-strength`. Raw material, not a restyle.
 * **Their ABSENCE is the signal**: no `--tr-hot` means render flat.
 *
 * They cannot do this from their side, and not for want of trying: a parent stylesheet does not cross an iframe
 * boundary, and our document paints its own background over anything behind the frame. They raised their own layer
 * in FRONT of the frame, saw traces over the content someone was reading, reverted it, and left a note telling the
 * next person not to retry it.
 *
 * ## Why a class rather than pure CSS fallbacks
 *
 * The decoration is not "swap one colour for another" — it is a translucent fill, a lit top hairline and a cast
 * shadow, which are declarations that must not exist at all on an undecorated theme. CSS has no portable way to ask
 * *"is this custom property set?"*: `var(--tr-hot, fallback)` can substitute a value but cannot switch a whole rule
 * off, and style container queries are not broadly available yet.
 *
 * So presence is resolved ONCE here and published as a class. Everything downstream is ordinary CSS under
 * `:root.ythril-decorated`, which means the undecorated path is not merely equivalent to today — it is the *same
 * declarations* as today, with nothing added to compute or composite.
 *
 * ## Read once, deliberately
 *
 * `getComputedStyle` on the root element forces style resolution, so doing it per component or on a resize would be
 * a layout read on a hot path for a value that cannot change without the host reloading its stylesheet. One call at
 * startup, and a `refresh()` for the one caller that has a reason: a test.
 */

/** The ink whose presence means "a decorated theme is in force". Their choice, and the one they told us to read. */
const SIGNAL_INK = '--tr-hot';

/** The class every decorated rule hangs off. Named for us, not for them — it describes our state, not their theme. */
export const DECORATED_CLASS = 'ythril-decorated';

/**
 * Is the host supplying decoration inks?
 *
 * Trimmed before testing: a custom property that is declared but empty comes back as `''` from
 * `getPropertyValue`, and an unset one comes back as `''` too — so both correctly read as "not decorated". A
 * whitespace-only value would otherwise be truthy and turn every fallback into a colour of nothing.
 */
export function hostSuppliesDecoration(root: Element = document.documentElement): boolean {
  try {
    return inkIsSet(getComputedStyle(root).getPropertyValue(SIGNAL_INK));
  } catch {
    // A detached element or a non-browser environment. Undecorated is the safe answer: it is what ships today.
    return false;
  }
}

/**
 * Is a raw custom-property value an actual choice?
 *
 * Split out as a pure function so the rule can be tested at all. Setting `--tr-hot: '   '` through
 * `element.style.setProperty` does not reach it: jsdom normalises the value on the way in, so a test written that
 * way passes whether or not the trim exists — mutation testing removed the trim and nothing failed. The rule is
 * worth keeping and therefore worth being able to check, so it is exported and asserted directly.
 *
 * `null` and `undefined` are included because `getPropertyValue` is typed as returning a string but a stubbed or
 * partial implementation can return neither, and a decoration that appears because of a missing value would be
 * the worst version of this feature.
 */
export function inkIsSet(raw: string | null | undefined): boolean {
  return typeof raw === 'string' && raw.trim() !== '';
}

/**
 * Add or remove the class to match what the host currently supplies. Returns whether decoration is on.
 *
 * Idempotent, and it REMOVES as well as adds — so a caller that runs it twice, or a test that changes the ink
 * between assertions, gets the truth rather than a latch.
 */
export function applyHostDecoration(root: HTMLElement = document.documentElement): boolean {
  const on = hostSuppliesDecoration(root);
  root.classList.toggle(DECORATED_CLASS, on);
  return on;
}
