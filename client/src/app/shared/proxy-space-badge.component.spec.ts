import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { ProxySpaceBadgeComponent } from './proxy-space-badge.component';

/**
 * The badge renders something a human can actually see.
 *
 * ## Why this exists rather than only a screenshot
 *
 * A screenshot is still owed for layout inside the live space strip, and this does not replace it. What it *does*
 * close is the specific failure this repo has been bitten by twice: **an unregistered `ph-icon` name renders a
 * blank SVG with no error and no failing test.** Every measurement passes, the markup is present, and the user sees
 * nothing. `globe` is registered today; nothing stopped someone renaming it.
 *
 * The second thing it pins is the tooltip, because a tooltip is where an untranslated string hides — the first
 * draft of this component returned hardcoded English from `titleText()` while the visible label went through
 * transloco, and no gate would have noticed a *tooltip* in the wrong language.
 */
describe('ProxySpaceBadgeComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProxySpaceBadgeComponent],
      providers: [
        provideTransloco({
          config: { availableLangs: ['en'], defaultLang: 'en', reRenderOnLangChange: false, prodMode: true },
        }),
      ],
    });
    // Real strings, so an assertion cannot pass on a key echoed back as its own translation.
    TestBed.inject(TranslocoService).setTranslation({
      'spaces.badge.proxy': 'Proxy space',
      'spaces.badge.proxyTitle': 'Proxy space — mirrors {{ids}} on the peer',
      'spaces.badge.proxyAllTitle': 'Proxy space — mirrors every space on the peer',
    }, 'en');
  });

  const render = (proxyFor: string[] | null, showLabel = false) => {
    const f = TestBed.createComponent(ProxySpaceBadgeComponent);
    f.componentRef.setInput('proxyFor', proxyFor);
    f.componentRef.setInput('showLabel', showLabel);
    f.detectChanges();
    return f;
  };

  it('draws a NON-EMPTY icon — an unregistered name renders blank with no error', () => {
    const el: HTMLElement = render(['other-space']).nativeElement;
    const path = el.querySelector('svg path');
    expect(path, 'no <path> in the badge svg — the icon name is not in the registry').not.toBeNull();
    const d = path?.getAttribute('d') ?? '';
    expect(d.length, `the icon path is empty (d="${d}"), so the badge renders as blank space`).toBeGreaterThan(10);
  });

  it('puts a translated tooltip on the badge, naming which spaces are mirrored', () => {
    const el: HTMLElement = render(['alpha', 'beta']).nativeElement;
    const title = el.querySelector('.proxy-space-badge')?.getAttribute('title') ?? '';
    expect(title).toContain('alpha, beta');
    // Not the raw key, and not English-by-accident: it came through transloco with interpolation applied.
    expect(title).not.toContain('spaces.badge');
    expect(title).not.toContain('{{ids}}');
  });

  it('says "every space" for the wildcard, which is the case most likely to be misread as a typo', () => {
    const el: HTMLElement = render(['*']).nativeElement;
    const title = el.querySelector('.proxy-space-badge')?.getAttribute('title') ?? '';
    expect(title).toContain('every space');
    expect(title).not.toContain('*');
  });

  it('mirrors the tooltip into aria-label, so the marker is not sighted-only', () => {
    const el: HTMLElement = render(['alpha']).nativeElement;
    const badge = el.querySelector('.proxy-space-badge');
    expect(badge?.getAttribute('aria-label')).toBe(badge?.getAttribute('title'));
    expect(badge?.getAttribute('aria-label')).toBeTruthy();
  });

  it('shows a text label only when asked, so a dense chip strip stays dense', () => {
    expect(render(['alpha'], false).nativeElement.textContent?.trim()).toBe('');
    expect(render(['alpha'], true).nativeElement.textContent).toContain('Proxy space');
  });
});
