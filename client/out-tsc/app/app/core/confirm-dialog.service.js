/**
 * ConfirmDialogService — opens the themed, CDK-backed confirm dialog and
 * resolves a promise with the user's choice. Replaces native `confirm()`.
 *
 * Usage:
 *   if (await this.confirmDialog.confirm({ title, message })) { ... }
 *
 * For irreversible actions, pass `requireText` (e.g. the space id) to force the
 * type-to-confirm ritual. `danger: true` styles the confirm button red.
 */
import { Injectable, inject } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import * as i0 from "@angular/core";
export class ConfirmDialogService {
    constructor() {
        this.dialog = inject(Dialog);
    }
    /** Open a confirm dialog. Resolves true only if the user confirmed. */
    async confirm(data) {
        const ref = this.dialog.open(ConfirmDialogComponent, {
            data,
            // CDK provides role, aria-modal, focus trap, Escape + backdrop dismiss,
            // and focus restore. A dismissal (Escape/backdrop) resolves undefined,
            // which we treat as "not confirmed".
            ariaModal: true,
            ariaLabelledBy: 'confirm-title',
            // First-tabbable is the Cancel button (a safe default for destructive
            // actions); the type-to-confirm tier re-focuses its input in the
            // component's ngAfterViewInit.
            autoFocus: 'first-tabbable',
            restoreFocus: true,
            hasBackdrop: true,
        });
        const result = await firstValueFrom(ref.closed);
        return result === true;
    }
    static { this.ɵfac = function ConfirmDialogService_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || ConfirmDialogService)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: ConfirmDialogService, factory: ConfirmDialogService.ɵfac, providedIn: 'root' }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(ConfirmDialogService, [{
        type: Injectable,
        args: [{ providedIn: 'root' }]
    }], null, null); })();
