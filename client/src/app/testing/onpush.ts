import type { Type } from '@angular/core';

/**
 * Whether a component was compiled with `ChangeDetectionStrategy.OnPush`.
 *
 * ## Why a helper rather than the expression
 *
 * `Component.ɵcmp.onPush` is the only way to ask, and `ɵcmp` is Angular's compiled definition — deliberately
 * absent from the public types, so every one of the 23 places that asked was a type error under
 * `tsconfig.spec.json`. Twenty-three copies of the same cast is also twenty-three places to get it subtly
 * wrong, and `?.onPush` returning `undefined` reads as "not OnPush" when it actually means "not compiled yet".
 *
 * So: one function, one cast, and the distinction stated. A component that has not been compiled returns
 * `undefined` here rather than `false`, because a test asserting `toBe(true)` on an uncompiled component
 * should fail loudly rather than report the strategy it did not read.
 *
 * ## Why the check is worth having at all
 *
 * OnPush is not cosmetic in this app: the graph page's cytoscape handlers fire OUTSIDE Angular, and they are
 * safe only because every one of them writes a signal. A component that silently lost OnPush would keep
 * working and quietly undo the change-detection work those specs exist to pin.
 */
export function onPushStrategy(component: Type<unknown>): boolean | undefined {
  const def = (component as unknown as { ɵcmp?: { onPush?: boolean } }).ɵcmp;
  return def?.onPush;
}

/** `true` only when the component is compiled AND OnPush — the assertion nearly every caller wants. */
export function isOnPush(component: Type<unknown>): boolean {
  return onPushStrategy(component) === true;
}
