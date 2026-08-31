import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import * as i0 from "@angular/core";
/**
 * Sets the browser tab title from each route's `title` (treated as a Transloco
 * key), formatted as `<Page> · Ythril`. Uses `selectTranslate` so the title is
 * correct even before the active language file has finished loading, and
 * re-emits when the language changes. Routes without a `title` fall back to the
 * bare app name.
 */
export class TranslocoTitleStrategy extends TitleStrategy {
    constructor() {
        super(...arguments);
        this.title = inject(Title);
        this.transloco = inject(TranslocoService);
    }
    updateTitle(snapshot) {
        this.sub?.unsubscribe();
        const key = this.buildTitle(snapshot);
        if (!key) {
            this.title.setTitle('Ythril');
            return;
        }
        this.sub = this.transloco.selectTranslate(key).subscribe(page => {
            this.title.setTitle(`${page} · Ythril`);
        });
    }
    static { this.ɵfac = /*@__PURE__*/ (() => { let ɵTranslocoTitleStrategy_BaseFactory; return function TranslocoTitleStrategy_Factory(__ngFactoryType__) { return (ɵTranslocoTitleStrategy_BaseFactory || (ɵTranslocoTitleStrategy_BaseFactory = i0.ɵɵgetInheritedFactory(TranslocoTitleStrategy)))(__ngFactoryType__ || TranslocoTitleStrategy); }; })(); }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: TranslocoTitleStrategy, factory: TranslocoTitleStrategy.ɵfac, providedIn: 'root' }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(TranslocoTitleStrategy, [{
        type: Injectable,
        args: [{ providedIn: 'root' }]
    }], null, null); })();
