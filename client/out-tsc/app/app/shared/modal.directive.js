import { Directive, ElementRef, EventEmitter, Input, Output, booleanAttribute, inject, } from '@angular/core';
import { FocusTrapFactory } from '@angular/cdk/a11y';
import * as i0 from "@angular/core";
/**
 * Makes a hand-rolled overlay panel an accessible modal dialog, in one attribute (U5).
 *
 * Applied to the dialog *panel* element (the box, not the backdrop), it supplies — by construction —
 * `role="dialog"`, `aria-modal="true"`, an `aria-label`, a CDK focus trap that captures focus on open
 * and restores it to the opener on close, Escape-to-dismiss, AND backdrop-click dismissal — the last of
 * which is **off by default**. This is the content-dialog counterpart to the CDK confirm-dialog wrapper.
 *
 * Backdrop dismissal is centralised here so no dialog hand-rolls a `(click)` on its scrim any more: a
 * stray click outside a data-entry dialog used to discard everything the user had typed. Now the panel
 * owns it, and it is **opt-in** — a form/wizard leaves it off (a click outside does nothing; close via
 * ✕ / Cancel / Escape), while a read-only or confirm dialog sets `appModalCloseOnBackdrop` to restore the
 * convenient click-away. Either way the directive emits `dismiss`; the consumer decides what that means
 * (close directly, or run an unsaved-changes guard first).
 *
 * Usage:
 *   `<div class="backdrop">                                  <!-- no (click) here any more -->`
 *   `  <div class="dialog" [appModal]="'x.title' | transloco" (dismiss)="close()"> … </div>`
 *   `</div>`
 * Read-only/confirm dialogs add `appModalCloseOnBackdrop` to the panel to keep click-away dismissal.
 *
 * The panel is expected to be a direct child of its backdrop element (the universal pattern here); the
 * directive attaches its backdrop listener to `parentElement` and only dismisses on a click that lands
 * on the backdrop itself, never one bubbling up from inside the panel.
 */
export class ModalDirective {
    constructor() {
        /**
         * Allow a click on the backdrop (outside the panel) to dismiss the dialog. **Off by default** so a
         * data-entry dialog never discards input on a stray click. Turn on only for read-only / confirm
         * dialogs where there is nothing to lose.
         */
        this.appModalCloseOnBackdrop = false;
        /** Emitted when the user asks to close: Escape, or a backdrop click when `appModalCloseOnBackdrop`. */
        this.dismiss = new EventEmitter();
        this.el = inject(ElementRef);
        this.trapFactory = inject(FocusTrapFactory);
        this.previouslyFocused = null;
        this.backdrop = null;
        this.onBackdropClick = (e) => {
            // Only a click that landed ON the backdrop itself — never one bubbling from inside the panel.
            if (this.appModalCloseOnBackdrop && e.target === this.backdrop)
                this.dismiss.emit();
        };
    }
    ngAfterViewInit() {
        this.previouslyFocused = document.activeElement;
        this.trap = this.trapFactory.create(this.el.nativeElement);
        // Focuses [cdkFocusInitial] if present, else the first tabbable element.
        this.trap.focusInitialElementWhenReady();
        this.backdrop = this.el.nativeElement.parentElement;
        this.backdrop?.addEventListener('click', this.onBackdropClick);
    }
    ngOnDestroy() {
        this.trap?.destroy();
        this.backdrop?.removeEventListener('click', this.onBackdropClick);
        // Restore focus to whatever opened the dialog so keyboard users aren't dumped at the top.
        this.previouslyFocused?.focus?.();
    }
    onEscape(e) {
        e.stopPropagation();
        this.dismiss.emit();
    }
    static { this.ɵfac = function ModalDirective_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || ModalDirective)(); }; }
    static { this.ɵdir = /*@__PURE__*/ i0.ɵɵdefineDirective({ type: ModalDirective, selectors: [["", "appModal", ""]], hostAttrs: ["role", "dialog", "aria-modal", "true"], hostVars: 1, hostBindings: function ModalDirective_HostBindings(rf, ctx) { if (rf & 1) {
            i0.ɵɵlistener("keydown.escape", function ModalDirective_keydown_escape_HostBindingHandler($event) { return ctx.onEscape($event); });
        } if (rf & 2) {
            i0.ɵɵattribute("aria-label", ctx.appModal || null);
        } }, inputs: { appModal: "appModal", appModalCloseOnBackdrop: [2, "appModalCloseOnBackdrop", "appModalCloseOnBackdrop", booleanAttribute] }, outputs: { dismiss: "dismiss" } }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(ModalDirective, [{
        type: Directive,
        args: [{
                selector: '[appModal]',
                standalone: true,
                host: {
                    'role': 'dialog',
                    'aria-modal': 'true',
                    '[attr.aria-label]': 'appModal || null',
                    '(keydown.escape)': 'onEscape($event)',
                },
            }]
    }], null, { appModal: [{
            type: Input,
            args: ['appModal']
        }], appModalCloseOnBackdrop: [{
            type: Input,
            args: [{ transform: booleanAttribute }]
        }], dismiss: [{
            type: Output
        }] }); })();
