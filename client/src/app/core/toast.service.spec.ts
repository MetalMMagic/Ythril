import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let toast: ToastService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ToastService] });
    toast = TestBed.inject(ToastService);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('adds a toast with the requested kind and message', () => {
    toast.success('done');
    const list = toast.toasts();
    expect(list.length).toBe(1);
    expect(list[0].kind).toBe('success');
    expect(list[0].message).toBe('done');
  });

  it('gives each toast a distinct id and preserves order (newest last)', () => {
    const a = toast.info('first');
    const b = toast.error('second');
    expect(a).not.toBe(b);
    const list = toast.toasts();
    expect(list.map(t => t.message)).toEqual(['first', 'second']);
  });

  it('auto-dismisses after the per-kind lifetime', () => {
    toast.success('bye'); // success default 4000ms
    expect(toast.toasts().length).toBe(1);
    vi.advanceTimersByTime(3999);
    expect(toast.toasts().length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(toast.toasts().length).toBe(0);
  });

  it('errors linger longer than successes', () => {
    toast.error('err'); // error default 8000ms
    vi.advanceTimersByTime(4000);
    expect(toast.toasts().length).toBe(1); // a success would already be gone
    vi.advanceTimersByTime(4000);
    expect(toast.toasts().length).toBe(0);
  });

  it('a duration of 0 keeps the toast sticky', () => {
    toast.show('sticky', 'info', 0);
    vi.advanceTimersByTime(1_000_000);
    expect(toast.toasts().length).toBe(1);
  });

  it('dismiss removes a specific toast and cancels its timer', () => {
    const id = toast.info('gone');
    toast.dismiss(id);
    expect(toast.toasts().length).toBe(0);
    // advancing time must not throw or resurrect anything
    vi.advanceTimersByTime(10_000);
    expect(toast.toasts().length).toBe(0);
  });

  it('clear removes everything', () => {
    toast.info('a'); toast.error('b'); toast.success('c');
    expect(toast.toasts().length).toBe(3);
    toast.clear();
    expect(toast.toasts().length).toBe(0);
  });
});
