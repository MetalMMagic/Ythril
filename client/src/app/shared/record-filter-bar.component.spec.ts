/**
 * RecordFilterBarComponent (F6) — the shared type/tag filter reused across the
 * Brain list tabs. Verifies it emits `{type, tag}` on change, reflects an
 * externally-set `value` without looping, and clears.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { getTranslocoModule } from '../testing/transloco-testing';
import { RecordFilterBarComponent, type RecordFilter } from './record-filter-bar.component';

@Component({
  standalone: true,
  imports: [RecordFilterBarComponent],
  template: `
    <app-record-filter-bar
      [typeOptions]="types"
      [tagSuggestions]="tags"
      [value]="value()"
      (filterChange)="last = $event"
    />`,
})
class HostComponent {
  types = ['person', 'place'];
  tags = ['work', 'home'];
  value = signal<RecordFilter | null>(null);
  last: RecordFilter | null = null;
}

function mount() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent, getTranslocoModule()] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

describe('RecordFilterBarComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders an option per type plus an "all" option', () => {
    const fixture = mount();
    const opts = Array.from(fixture.nativeElement.querySelectorAll('select option')) as HTMLOptionElement[];
    // "All types" + person + place
    expect(opts.length).toBe(3);
    expect(opts[0].value).toBe('');
    expect(opts.map(o => o.value)).toContain('person');
  });

  it('emits the selected type', () => {
    const fixture = mount();
    const host = fixture.componentInstance;
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'person';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(host.last).toEqual({ type: 'person', tag: '' });
  });

  it('emits the trimmed tag', () => {
    const fixture = mount();
    const host = fixture.componentInstance;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = '  work  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(host.last).toEqual({ type: '', tag: 'work' });
  });

  it('reflects an externally-set value into the controls without emitting', async () => {
    const fixture = mount();
    const host = fixture.componentInstance;
    host.value.set({ type: 'place', tag: 'home' });
    fixture.detectChanges();
    await fixture.whenStable(); // the effect sets the signals; ngModel writes the DOM in a microtask
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(select.value).toBe('place');
    expect(input.value).toBe('home');
    // Pushing `value` must NOT fire filterChange (guards against a host<->bar loop).
    expect(host.last).toBeNull();
  });

  it('shows a Clear affordance only when a filter is active, and clearing emits empty', () => {
    const fixture = mount();
    const host = fixture.componentInstance;
    expect(fixture.nativeElement.querySelector('.filter-clear')).toBeNull();

    host.value.set({ type: 'person', tag: '' });
    fixture.detectChanges();
    const clearBtn = fixture.nativeElement.querySelector('.filter-clear') as HTMLButtonElement;
    expect(clearBtn).toBeTruthy();

    clearBtn.click();
    fixture.detectChanges();
    expect(host.last).toEqual({ type: '', tag: '' });
  });
});
