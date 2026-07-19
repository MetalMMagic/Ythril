/**
 * UsageBar — level classifier (pure) + a render check that width/level track the inputs.
 */
import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { UsageBarComponent, usageLevel } from './usage-bar.component';

describe('usageLevel', () => {
  it('classifies ok / warn / danger against the threshold', () => {
    expect(usageLevel(10, 80)).toBe('ok');
    expect(usageLevel(79.9, 80)).toBe('ok');
    expect(usageLevel(80, 80)).toBe('warn');
    expect(usageLevel(94, 80)).toBe('warn');
    expect(usageLevel(95, 80)).toBe('danger');
    expect(usageLevel(120, 80)).toBe('danger');
  });
});

describe('UsageBarComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<UsageBarComponent>>;
  let ref: ComponentRef<UsageBarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [UsageBarComponent] });
    fixture = TestBed.createComponent(UsageBarComponent);
    ref = fixture.componentRef;
  });

  it('renders a fill whose width is the clamped percentage and class is the level', () => {
    ref.setInput('used', 90);
    ref.setInput('total', 100);
    fixture.detectChanges();
    const fill = fixture.nativeElement.querySelector('.fill') as HTMLElement;
    expect(fill.style.width).toBe('90%');
    expect(fill.classList.contains('warn')).toBe(true);
  });

  it('clamps over-limit width to 100% and flags danger', () => {
    ref.setInput('used', 150);
    ref.setInput('total', 100);
    fixture.detectChanges();
    const fill = fixture.nativeElement.querySelector('.fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
    expect(fill.classList.contains('danger')).toBe(true);
  });

  it('is 0% (ok) when no total is provided', () => {
    ref.setInput('used', 5);
    ref.setInput('total', null);
    fixture.detectChanges();
    const fill = fixture.nativeElement.querySelector('.fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
    expect(fill.classList.contains('ok')).toBe(true);
  });
});
