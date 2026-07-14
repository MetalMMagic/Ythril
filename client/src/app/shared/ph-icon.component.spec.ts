/**
 * Smoke test for a REAL app component — proves the harness compiles and drives actual
 * production components (with @Input, ngOnChanges, DomSanitizer injection), not just toy ones
 * defined inline. This is what makes the harness credibly usable for the P5 OnPush work.
 */
import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { PhIconComponent } from './ph-icon.component';

describe('PhIconComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<PhIconComponent>>;
  let ref: ComponentRef<PhIconComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PhIconComponent] });
    fixture = TestBed.createComponent(PhIconComponent);
    ref = fixture.componentRef;
  });

  it('renders the SVG for a known icon at the requested size', () => {
    ref.setInput('name', 'trash');
    ref.setInput('size', 18);
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg') as SVGElement | null;
    expect(svg, 'an <svg> should be rendered').toBeTruthy();
    expect(svg!.getAttribute('width')).toBe('18');
    expect(svg!.getAttribute('height')).toBe('18');
    expect(svg!.querySelector('path'), 'the icon should have path data').toBeTruthy();
  });

  it('updates the rendered icon when the name input changes', () => {
    ref.setInput('name', 'trash');
    fixture.detectChanges();
    const first = fixture.nativeElement.querySelector('svg').innerHTML;

    ref.setInput('name', 'gear');
    fixture.detectChanges();
    const second = fixture.nativeElement.querySelector('svg').innerHTML;

    expect(second).not.toBe(first);
  });

  it('renders an empty <svg> (no path) for an unknown icon name', () => {
    ref.setInput('name', 'definitely-not-an-icon');
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.querySelector('path')).toBeNull();
  });

  it('is OnPush and still re-renders on input change (the P5 contract)', () => {
    // Guards the OnPush conversion specifically. An OnPush leaf must skip the whole-tree CD
    // sweep BUT still update when its own @Input changes. If someone reverted OnPush this would
    // still pass (default CD also updates), so it is not a full mutation test — but paired with
    // the harness's negative control (which proves the harness CAN see a stale OnPush view),
    // an input-driven update failing here would mean the conversion broke the component.
    expect(PhIconComponent.ɵcmp?.onPush).toBe(true);

    ref.setInput('name', 'trash');
    ref.setInput('size', 12);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('svg').getAttribute('width')).toBe('12');

    ref.setInput('size', 40);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('svg').getAttribute('width')).toBe('40');
  });
});
