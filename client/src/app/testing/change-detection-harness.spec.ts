/**
 * Change-detection harness proof.
 *
 * This is the reason the client test infra exists (for P5). Adding
 * `ChangeDetectionStrategy.OnPush` to a component is a perf win, but its failure mode is a
 * view that silently stops updating after a state change — invisible to `tsc` and to a
 * production build. So the FIRST thing to prove is that this harness can actually SEE that
 * failure. If it can't, every OnPush "verification" built on it is worthless (exactly the
 * vacuous-test trap this project has been rooting out).
 *
 * These specs are the negative and positive controls:
 *   - a signal-driven OnPush component DOES update (the pattern P5 relies on)
 *   - an OnPush component mutating a plain field WITHOUT signals or markForCheck does NOT
 *     update — and the harness observes the stale DOM. That proves the harness has teeth.
 */
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

@Component({
  selector: 'test-signal-onpush',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="val">{{ count() }}</span>`,
})
class SignalOnPushComponent {
  readonly count = signal(0);
  bump() { this.count.update(n => n + 1); }
}

@Component({
  selector: 'test-mutable-onpush',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Plain field, no signal — the classic pattern OnPush breaks. Mutating it does NOT mark the
  // component for check, so an OnPush view must go stale.
  template: `<span class="val">{{ count }}</span>`,
})
class MutableOnPushComponent {
  count = 0;
  bump() { this.count += 1; }
}

describe('change-detection harness — it can see OnPush staleness', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SignalOnPushComponent, MutableOnPushComponent] });
  });

  it('POSITIVE: a signal-driven OnPush component re-renders when the signal changes', () => {
    const fixture = TestBed.createComponent(SignalOnPushComponent);
    fixture.detectChanges();
    const el = () => fixture.nativeElement.querySelector('.val').textContent;
    expect(el()).toBe('0');

    fixture.componentInstance.bump();
    fixture.detectChanges();
    expect(el()).toBe('1'); // signals notify OnPush — this is the pattern P5 depends on
  });

  it('NEGATIVE: an OnPush component mutating a plain field goes STALE — and the harness catches it', () => {
    const fixture = TestBed.createComponent(MutableOnPushComponent);
    fixture.detectChanges();
    const el = () => fixture.nativeElement.querySelector('.val').textContent;
    expect(el()).toBe('0');

    fixture.componentInstance.bump(); // count is now 1 on the instance...
    fixture.detectChanges();          // ...but nothing marked the OnPush view for check
    // The DOM still shows 0. If this asserted '1' and passed, the harness would be blind to
    // exactly the bug OnPush introduces — which is the whole thing it must be able to detect.
    expect(el()).toBe('0');
    expect(fixture.componentInstance.count).toBe(1); // proof the mutation happened; only the VIEW is stale
  });
});
