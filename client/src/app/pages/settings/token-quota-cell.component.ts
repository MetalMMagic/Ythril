import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';

/**
 * One token's request quota, as a table cell.
 *
 * ## Why this is its own component
 *
 * `no-new-god-files.test.js` refused it inside `tokens.component.ts`, which is already among the largest files
 * and frozen at its size. Its reasoning is the right one here: *"the failure mode of a god-file is not its size
 * on any given day — it is that every change lands in the same place because that is where the code already
 * is."* The quota cell is also the third thing in that table with a real display RULE rather than a value, so it
 * benefits from being somewhere it can be read on its own.
 *
 * ## The rule, which is the whole reason this is not a `{{ }}`
 *
 * Two numbers arrive and they answer different questions:
 *
 *   `perToken`   what an admin SET on this token. Absent on most tokens.
 *   `effective`  what is actually enforced, resolved by the server from token, then instance, then default.
 *
 * **Showing only the first would make "inherits 300" and "inherits 50 because infra capped it" identical** —
 * both blank — which is the absent-versus-not-checked ambiguity this product keeps having to fix. So the
 * effective number is always shown, and an explicitly-set one is badged, because "somebody chose this" and
 * "this is what the instance gives you" are different facts and an operator acts on them differently.
 *
 * NOTE: no backticks anywhere below. A backtick inside an inline template terminates the string and Angular
 * reports `NG1001: Decorator argument must be literal`, pointing at the decorator rather than at the line.
 */
@Component({
  selector: 'app-token-quota-cell',
  standalone: true,
  imports: [TranslocoModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .inherited { color: var(--text-muted); }
    .note { font-style: italic; }
  `],
  template: `
    @if (perToken()) {
      <span class="badge badge-gray">{{ perToken() }}{{ 'tokens.table.perMin' | transloco }}</span>
    } @else if (effective()) {
      <span class="inherited">{{ effective() }}{{ 'tokens.table.perMin' | transloco }}
        <span class="note">{{ 'tokens.table.quotaInherited' | transloco }}</span></span>
    } @else {
      <!-- Neither number known: an OIDC-derived record carries no stored quota, and an older server does not
           send the derived one. A dash is honest; inventing 300 here would be this component asserting a
           default the server may not be using. -->
      <span class="inherited">&mdash;</span>
    }
  `,
})
export class TokenQuotaCellComponent {
  /** What an admin set on this token. Absent means inherit — never unlimited. */
  perToken = input<number | undefined>(undefined);
  /** What the server says is actually enforced. */
  effective = input<number | undefined>(undefined);
}
