/**
 * StatusPill — variant drives the colour class; icon/dot are mutually exclusive leading markers.
 */
import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { StatusPillComponent } from './status-pill.component';
import { isOnPush } from '../testing/onpush';

describe('StatusPillComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<StatusPillComponent>>;
  let ref: ComponentRef<StatusPillComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StatusPillComponent] });
    fixture = TestBed.createComponent(StatusPillComponent);
    ref = fixture.componentRef;
  });

  it('applies the variant as a class alongside .pill', () => {
    ref.setInput('variant', 'warn');
    fixture.detectChanges();
    const pill = fixture.nativeElement.querySelector('.pill') as HTMLElement;
    expect(pill.classList.contains('warn')).toBe(true);
    expect(pill.classList.contains('pill')).toBe(true);
  });

  it('renders a leading dot when dot=true and no icon', () => {
    ref.setInput('variant', 'active');
    ref.setInput('dot', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dot')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
  });

  it('prefers an icon over the dot when both are set', () => {
    ref.setInput('variant', 'error');
    ref.setInput('dot', true);
    ref.setInput('icon', 'warning');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('svg')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.dot')).toBeNull();
  });

  it('is OnPush', () => {
    expect(isOnPush(StatusPillComponent)).toBe(true);
  });
});
