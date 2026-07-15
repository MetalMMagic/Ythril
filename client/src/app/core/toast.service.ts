/**
 * Toast / snackbar service — the app's single channel for transient success,
 * error, and info messages. Replaces the scattered native `alert()` calls,
 * which blocked the main thread, ignored the theme, and could not be localised
 * per the active language.
 *
 * Mount <app-toast-container /> once at the app shell; it renders whatever this
 * service holds. Toasts auto-dismiss (errors linger a little longer than
 * successes so they aren't missed) and can be dismissed manually.
 */
import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

/** Default lifetimes (ms). Errors persist longer; 0 means sticky. */
const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 4000,
  info: 5000,
  error: 8000,
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  /** The live toast stack, newest last. Read by the container component. */
  readonly toasts = signal<Toast[]>([]);

  private nextId = 1;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  /** Show a toast. `duration` overrides the per-kind default; 0 keeps it sticky. */
  show(message: string, kind: ToastKind = 'info', duration?: number): number {
    const id = this.nextId++;
    this.toasts.update(list => [...list, { id, kind, message }]);

    const ttl = duration ?? DEFAULT_DURATION[kind];
    if (ttl > 0) {
      this.timers.set(id, setTimeout(() => this.dismiss(id), ttl));
    }
    return id;
  }

  success(message: string, duration?: number): number { return this.show(message, 'success', duration); }
  error(message: string, duration?: number): number { return this.show(message, 'error', duration); }
  info(message: string, duration?: number): number { return this.show(message, 'info', duration); }

  /** Remove a toast (auto-dismiss timer or the close button). */
  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) { clearTimeout(timer); this.timers.delete(id); }
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  /** Clear everything (e.g. on navigation away from a noisy screen). */
  clear(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.toasts.set([]);
  }
}
