/**
 * SortableHeaderComponent (slice 2b-i) — the sortable `<th>` primitive shared by the Brain list
 * tables. Verifies it renders the label, emits its field on click, and reflects the active sort
 * state (caret + `aria-sort`) so the header honestly shows what the server is ordering by.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { SortableHeaderComponent } from './sortable-header.component';

@Component({
  standalone: true,
  imports: [SortableHeaderComponent],
  template: `
    <table><thead><tr>
      <th app-sort-th
        field="name"
        label="brain.entities.table.name"
        [activeField]="active()"
        [dir]="dir()"
        (sort)="last = $event"></th>
    </tr></thead></table>`,
})
class HostComponent {
  active = signal('');
  dir = signal<'asc' | 'desc'>('desc');
  last: string | null = null;
}

function mount() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent, getTranslocoModule()] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SortableHeaderComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('is compiled as OnPush', () => {
    expect(SortableHeaderComponent.ɵcmp?.onPush).toBe(true);
  });

  it('renders the translated label', () => {
    const fixture = mount();
    const btn = fixture.nativeElement.querySelector('.sort-btn') as HTMLButtonElement;
    // getTranslocoModule echoes the key when no translation is registered.
    expect(btn.textContent).toContain('brain.entities.table.name');
  });

  it('emits its field on click', () => {
    const fixture = mount();
    const host = fixture.componentInstance;
    (fixture.nativeElement.querySelector('.sort-btn') as HTMLButtonElement).click();
    expect(host.last).toBe('name');
  });

  it('is aria-sort=none and the caret is inactive when this column is not the sort key', () => {
    const fixture = mount();
    const th = fixture.nativeElement.querySelector('th') as HTMLElement;
    expect(th.getAttribute('aria-sort')).toBe('none');
    expect(fixture.nativeElement.querySelector('.sort-caret.active')).toBeNull();
  });

  it('reflects an active ascending sort in aria-sort and the caret', () => {
    const fixture = mount();
    fixture.componentInstance.active.set('name');
    fixture.componentInstance.dir.set('asc');
    fixture.detectChanges();
    const th = fixture.nativeElement.querySelector('th') as HTMLElement;
    expect(th.getAttribute('aria-sort')).toBe('ascending');
    expect(fixture.nativeElement.querySelector('.sort-caret.active')).toBeTruthy();
  });

  it('reflects an active descending sort as aria-sort=descending', () => {
    const fixture = mount();
    fixture.componentInstance.active.set('name');
    fixture.componentInstance.dir.set('desc');
    fixture.detectChanges();
    const th = fixture.nativeElement.querySelector('th') as HTMLElement;
    expect(th.getAttribute('aria-sort')).toBe('descending');
  });
});

@Component({
  standalone: true,
  imports: [SortableHeaderComponent],
  template: `
    <table><thead><tr>
      <th app-sort-th label="brain.entities.table.tags">
        <input class="my-filter" />
      </th>
    </tr></thead></table>`,
})
class FilterOnlyHost {}

describe('SortableHeaderComponent — filter-only (no field) column', () => {
  beforeEach(() => TestBed.resetTestingModule());

  function mountFilterOnly() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [FilterOnlyHost, getTranslocoModule()] });
    const fixture = TestBed.createComponent(FilterOnlyHost);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the label as plain text with no sort button when field is omitted', () => {
    const fixture = mountFilterOnly();
    expect(fixture.nativeElement.querySelector('.sort-btn')).toBeNull();
    expect(fixture.nativeElement.querySelector('.col-label')).toBeTruthy();
  });

  it('is aria-sort=none and projects the docked filter control', () => {
    const fixture = mountFilterOnly();
    const th = fixture.nativeElement.querySelector('th') as HTMLElement;
    expect(th.getAttribute('aria-sort')).toBe('none');
    expect(fixture.nativeElement.querySelector('.col-filter .my-filter')).toBeTruthy();
  });
});
