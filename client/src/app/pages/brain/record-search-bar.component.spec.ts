/**
 * RecordSearchBarComponent — the dumb search bar the record tabs share (A17.9c). Since 2b-iii-c it is
 * a single styled search input (the A–Z / Semantic pill was removed when the top bar became
 * semantic-only). Verifies the value input, the valueChange output, and the aria-label fallback.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { RecordSearchBarComponent } from './record-search-bar.component';
import { isOnPush } from '../../testing/onpush';

function create(inputs: { value: string; placeholder: string; ariaLabel?: string }) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [RecordSearchBarComponent, getTranslocoModule()] });
  const fixture = TestBed.createComponent(RecordSearchBarComponent);
  fixture.componentRef.setInput('value', inputs.value);
  fixture.componentRef.setInput('placeholder', inputs.placeholder);
  if (inputs.ariaLabel) fixture.componentRef.setInput('ariaLabel', inputs.ariaLabel);
  fixture.detectChanges();
  return fixture;
}

describe('RecordSearchBarComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('is compiled as OnPush', () => {
    expect(isOnPush(RecordSearchBarComponent)).toBe(true);
  });

  it('renders the search input with the bound value', () => {
    const fixture = create({ value: 'hello', placeholder: 'ph' });
    const input = fixture.nativeElement.querySelector('input[type=search]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('hello');
  });

  it('emits valueChange with the typed string on input', () => {
    const fixture = create({ value: '', placeholder: 'ph' });
    const emitted: string[] = [];
    fixture.componentInstance.valueChange.subscribe(v => emitted.push(v));
    const input = fixture.nativeElement.querySelector('input[type=search]') as HTMLInputElement;
    input.value = 'abc';
    input.dispatchEvent(new Event('input'));
    expect(emitted).toEqual(['abc']);
  });

  it('has no mode pill (removed in 2b-iii-c — the bar is single-purpose now)', () => {
    const fixture = create({ value: '', placeholder: 'ph' });
    expect(fixture.nativeElement.querySelector('.pill-group')).toBeNull();
  });

  it('uses a distinct aria-label when provided, else the placeholder', () => {
    const withAria = create({ value: '', placeholder: 'ph', ariaLabel: 'distinctAria' });
    // transloco test harness echoes the key, so aria-label reflects the ariaLabel key
    expect((withAria.nativeElement.querySelector('input') as HTMLInputElement).getAttribute('aria-label')).toBe('distinctAria');

    const withoutAria = create({ value: '', placeholder: 'ph' });
    expect((withoutAria.nativeElement.querySelector('input') as HTMLInputElement).getAttribute('aria-label')).toBe('ph');
  });
});
