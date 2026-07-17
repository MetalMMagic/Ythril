/**
 * RecordSearchBarComponent — the dumb search bar the record tabs share (A17.9c). Verifies the
 * value/mode inputs, the valueChange/modeChange outputs, and that the pill is shown only when a mode
 * is provided (file-meta omits it).
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { RecordSearchBarComponent } from './record-search-bar.component';

function create(inputs: { value: string; placeholder: string; mode?: 'text' | 'semantic' | null; ariaLabel?: string }) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [RecordSearchBarComponent, getTranslocoModule()] });
  const fixture = TestBed.createComponent(RecordSearchBarComponent);
  fixture.componentRef.setInput('value', inputs.value);
  fixture.componentRef.setInput('placeholder', inputs.placeholder);
  if ('mode' in inputs) fixture.componentRef.setInput('mode', inputs.mode);
  if (inputs.ariaLabel) fixture.componentRef.setInput('ariaLabel', inputs.ariaLabel);
  fixture.detectChanges();
  return fixture;
}

describe('RecordSearchBarComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('is compiled as OnPush', () => {
    expect(RecordSearchBarComponent.ɵcmp?.onPush).toBe(true);
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

  it('hides the mode pill when no mode is given (file-meta case)', () => {
    const fixture = create({ value: '', placeholder: 'ph' });
    expect(fixture.nativeElement.querySelector('.pill-group')).toBeNull();
  });

  it('shows the pill and marks the active mode when a mode is given', () => {
    const fixture = create({ value: '', placeholder: 'ph', mode: 'semantic' });
    const pill = fixture.nativeElement.querySelector('.pill-group');
    expect(pill).toBeTruthy();
    const buttons = pill.querySelectorAll('button');
    expect(buttons[0].classList.contains('active')).toBe(false); // text
    expect(buttons[1].classList.contains('active')).toBe(true);  // semantic
  });

  it('emits modeChange when a pill button is clicked', () => {
    const fixture = create({ value: '', placeholder: 'ph', mode: 'text' });
    const emitted: string[] = [];
    fixture.componentInstance.modeChange.subscribe(m => emitted.push(m));
    const buttons = fixture.nativeElement.querySelectorAll('.pill-group button');
    (buttons[1] as HTMLButtonElement).click(); // semantic
    expect(emitted).toEqual(['semantic']);
  });

  it('uses a distinct aria-label when provided, else the placeholder', () => {
    const withAria = create({ value: '', placeholder: 'ph', ariaLabel: 'distinctAria' });
    // transloco test harness echoes the key, so aria-label reflects the ariaLabel key
    expect((withAria.nativeElement.querySelector('input') as HTMLInputElement).getAttribute('aria-label')).toBe('distinctAria');

    const withoutAria = create({ value: '', placeholder: 'ph' });
    expect((withoutAria.nativeElement.querySelector('input') as HTMLInputElement).getAttribute('aria-label')).toBe('ph');
  });
});
