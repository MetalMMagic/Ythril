/**
 * PropertiesViewComponent — verifies the OnPush conversion (P5).
 *
 * The two things OnPush must preserve here: it still re-renders when the `properties` @Input
 * changes, and when the local `mode` signal toggles (table ↔ json). Both are exercised below.
 */
import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { getTranslocoModule } from '../testing/transloco-testing';
import { PropertiesViewComponent } from './properties-view.component';

describe('PropertiesViewComponent (OnPush)', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<PropertiesViewComponent>>;
  let ref: ComponentRef<PropertiesViewComponent>;
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PropertiesViewComponent, getTranslocoModule()] });
    fixture = TestBed.createComponent(PropertiesViewComponent);
    ref = fixture.componentRef;
  });

  it('is compiled as OnPush', () => {
    expect(PropertiesViewComponent.ɵcmp?.onPush).toBe(true);
  });

  it('renders an em-dash when there are no properties', () => {
    ref.setInput('properties', {});
    fixture.detectChanges();
    expect(text()).toContain('—');
  });

  it('renders a table row per property', () => {
    ref.setInput('properties', { status: 'open', owner: 'ada' });
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('table.props-table tr');
    expect(rows.length).toBe(2);
    expect(text()).toContain('status');
    expect(text()).toContain('open');
  });

  it('re-renders when the properties input reference changes (OnPush contract)', () => {
    ref.setInput('properties', { a: '1' });
    fixture.detectChanges();
    expect(text()).toContain('a');
    expect(text()).not.toContain('zzz');

    ref.setInput('properties', { zzz: '9' });
    fixture.detectChanges();
    expect(text()).toContain('zzz');
    expect(text()).not.toContain('"a"');
  });

  it('toggling the local mode signal switches to the JSON view', () => {
    ref.setInput('properties', { k: 'v' });
    fixture.detectChanges();
    // table mode by default — no <pre>
    expect(fixture.nativeElement.querySelector('pre.props-pre')).toBeNull();

    // Flip the signal that a (click) handler sets; OnPush must still re-render on it.
    fixture.componentInstance.mode.set('json');
    fixture.detectChanges();
    const pre = fixture.nativeElement.querySelector('pre.props-pre');
    expect(pre).toBeTruthy();
    expect(pre.textContent).toContain('"k": "v"');
  });
});
