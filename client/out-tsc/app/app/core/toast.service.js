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
import * as i0 from "@angular/core";
/** Default lifetimes (ms). Errors persist longer; 0 means sticky. */
const DEFAULT_DURATION = {
    success: 4000,
    info: 5000,
    error: 8000,
};
export class ToastService {
    constructor() {
        /** The live toast stack, newest last. Read by the container component. */
        this.toasts = signal([], ...(ngDevMode ? [{ debugName: "toasts" }] : /* istanbul ignore next */ []));
        this.nextId = 1;
        this.timers = new Map();
    }
    /** Show a toast. `duration` overrides the per-kind default; 0 keeps it sticky. */
    show(message, kind = 'info', duration) {
        const id = this.nextId++;
        this.toasts.update(list => [...list, { id, kind, message }]);
        const ttl = duration ?? DEFAULT_DURATION[kind];
        if (ttl > 0) {
            this.timers.set(id, setTimeout(() => this.dismiss(id), ttl));
        }
        return id;
    }
    success(message, duration) { return this.show(message, 'success', duration); }
    error(message, duration) { return this.show(message, 'error', duration); }
    info(message, duration) { return this.show(message, 'info', duration); }
    /** Remove a toast (auto-dismiss timer or the close button). */
    dismiss(id) {
        const timer = this.timers.get(id);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(id);
        }
        this.toasts.update(list => list.filter(t => t.id !== id));
    }
    /** Clear everything (e.g. on navigation away from a noisy screen). */
    clear() {
        for (const timer of this.timers.values())
            clearTimeout(timer);
        this.timers.clear();
        this.toasts.set([]);
    }
    static { this.ɵfac = function ToastService_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || ToastService)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: ToastService, factory: ToastService.ɵfac, providedIn: 'root' }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(ToastService, [{
        type: Injectable,
        args: [{ providedIn: 'root' }]
    }], null, null); })();
