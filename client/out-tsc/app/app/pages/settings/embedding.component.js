import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { SettingsCardComponent } from '../../shared/settings-card.component';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
import * as i2 from "@jsverse/transloco";
function EmbeddingComponent_Conditional_9_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 4);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "embedding.origins.none"));
} }
function EmbeddingComponent_For_12_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "div", 6)(1, "input", 13);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("ngModelChange", function EmbeddingComponent_For_12_Template_input_ngModelChange_1_listener($event) { const $index_r2 = i0.ɵɵrestoreView(_r1).$index; const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.setOrigin($index_r2, $event)); });
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "button", 14);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵlistener("click", function EmbeddingComponent_For_12_Template_button_click_3_listener() { const $index_r2 = i0.ɵɵrestoreView(_r1).$index; const ctx_r2 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r2.removeOrigin($index_r2)); });
    i0.ɵɵelement(5, "ph-icon", 15);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const o_r4 = ctx.$implicit;
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵclassProp("rejected", ctx_r2.rejected().includes(o_r4));
    i0.ɵɵproperty("ngModel", o_r4);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(2, 6, "embedding.origins.entryLabel"));
    i0.ɵɵadvance(2);
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(4, 8, "common.remove"));
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 12);
} }
function EmbeddingComponent_Conditional_20_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 10);
    i0.ɵɵtext(1);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(2, 1, "embedding.origins.saved"));
} }
function EmbeddingComponent_Conditional_21_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "p", 11);
    i0.ɵɵtext(1);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate(ctx_r2.problem());
} }
/**
 * Who may frame and restyle this instance.
 *
 * ## Why this page exists
 *
 * `embed.allowedOrigins` has worked since embedding shipped, and it lived only in `config.json` — so granting a
 * portal permission to frame a brain meant shell access to the server and a text editor. The canary operator asked
 * for this on 2026-08-19, and their case is the one that shape does not serve: **someone runs a brain, someone else
 * wants to use it inside a portal, and the person who must act has to be talked through editing JSON on a server.**
 * In practice that does not happen and the brain stays in a browser tab.
 *
 * ## The warning is on the page, not only in the guide
 *
 * Listing an origin grants two things TOGETHER — framing (a clickjacking primitive) and runtime theming (a
 * UI-spoofing one) — and it is a deliberate design that they share one list: an origin you trust to render Ythril
 * inside its chrome is exactly the origin you trust to restyle it. An operator adding a line to a text box has to
 * be told that, at the moment they do it.
 *
 * ## Nothing here validates an origin
 *
 * The server does, with the same function the config-file path uses, and a refused entry comes back named. A copy of
 * that rule here would be the defect this repo produces most — and the weaker copy would be deciding who may frame
 * the admin UI. What this page must NOT do is drop a bad entry quietly: the operator typed it and is watching, so
 * the failure is shown rather than absorbed.
 */
export class EmbeddingComponent {
    constructor() {
        this.http = inject(HttpClient);
        this.origins = signal([], ...(ngDevMode ? [{ debugName: "origins" }] : /* istanbul ignore next */ []));
        /** Entries the SERVER refused, so the row that is wrong is the row that is marked. */
        this.rejected = signal([], ...(ngDevMode ? [{ debugName: "rejected" }] : /* istanbul ignore next */ []));
        this.problem = signal(null, ...(ngDevMode ? [{ debugName: "problem" }] : /* istanbul ignore next */ []));
        this.saving = signal(false, ...(ngDevMode ? [{ debugName: "saving" }] : /* istanbul ignore next */ []));
        this.savedAt = signal(false, ...(ngDevMode ? [{ debugName: "savedAt" }] : /* istanbul ignore next */ []));
        this.load();
    }
    load() {
        this.http.get('/api/admin/embed-config').subscribe({
            next: r => {
                this.origins.set([...(r.allowedOrigins ?? [])]);
                /*
                 * A stored entry the validator drops is shown as rejected on arrival, not only after a save. An operator
                 * whose portal will not frame is looking at this page to find out why, and an invalid line in config.json
                 * that rendered identically to a valid one would be the whole answer, hidden.
                 */
                this.rejected.set([...(r.invalid ?? [])]);
            },
            error: () => this.problem.set('Could not load the embed configuration.'),
        });
    }
    addOrigin() {
        this.origins.update(list => [...list, '']);
    }
    setOrigin(i, value) {
        /*
         * The PREVIOUS value is what leaves the rejected list — read before the update, because after it the old text
         * is gone. My first version filtered the NEW value instead, which removes nothing and leaves the old entry
         * sitting in `rejected` forever. It looked right on screen (the row compares against its current text, which no
         * longer matches) and was wrong in the state, so a row could come back red on an edit that had cleared it.
         */
        const previous = this.origins()[i];
        this.origins.update(list => list.map((o, n) => (n === i ? value : o)));
        if (previous !== undefined)
            this.rejected.update(list => list.filter(o => o !== previous));
        this.savedAt.set(false);
    }
    removeOrigin(i) {
        this.origins.update(list => list.filter((_, n) => n !== i));
        this.savedAt.set(false);
    }
    save() {
        this.saving.set(true);
        this.problem.set(null);
        this.savedAt.set(false);
        // Blank rows are dropped rather than sent: an empty input is somebody who clicked Add and changed their mind,
        // not an origin they want refused.
        const allowedOrigins = this.origins().map(o => o.trim()).filter(Boolean);
        this.http.patch('/api/admin/embed-config', { allowedOrigins }).subscribe({
            next: r => {
                this.origins.set([...r.allowedOrigins]);
                this.rejected.set([]);
                this.saving.set(false);
                this.savedAt.set(true);
            },
            error: err => {
                this.saving.set(false);
                const invalid = err?.error?.invalid ?? [];
                this.rejected.set(invalid);
                this.problem.set(err?.error?.error ?? 'The change was refused.');
            },
        });
    }
    static { this.ɵfac = function EmbeddingComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || EmbeddingComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: EmbeddingComponent, selectors: [["app-embedding"]], decls: 25, vars: 23, consts: [[1, "embed-page"], ["icon", "corners-out", 3, "heading", "purpose"], [1, "danger-note"], ["name", "warning", 3, "size"], [1, "empty"], [1, "origins"], [1, "origin-row"], [1, "actions"], ["type", "button", 1, "btn", 3, "click"], ["type", "button", 1, "btn", "btn-primary", 3, "click", "disabled"], [1, "saved"], [1, "problem"], [1, "hint"], ["type", "text", "spellcheck", "false", "autocomplete", "off", "placeholder", "https://portal.example.com", 3, "ngModelChange", "ngModel"], ["type", "button", 1, "rm", 3, "click"], ["name", "x", 3, "size"]], template: function EmbeddingComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "div", 0)(1, "app-settings-card", 1);
            i0.ɵɵpipe(2, "transloco");
            i0.ɵɵpipe(3, "transloco");
            i0.ɵɵelementStart(4, "p", 2);
            i0.ɵɵelement(5, "ph-icon", 3);
            i0.ɵɵelementStart(6, "span");
            i0.ɵɵtext(7);
            i0.ɵɵpipe(8, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵconditionalCreate(9, EmbeddingComponent_Conditional_9_Template, 3, 3, "p", 4);
            i0.ɵɵelementStart(10, "div", 5);
            i0.ɵɵrepeaterCreate(11, EmbeddingComponent_For_12_Template, 6, 10, "div", 6, i0.ɵɵrepeaterTrackByIndex);
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(13, "div", 7)(14, "button", 8);
            i0.ɵɵlistener("click", function EmbeddingComponent_Template_button_click_14_listener() { return ctx.addOrigin(); });
            i0.ɵɵtext(15);
            i0.ɵɵpipe(16, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(17, "button", 9);
            i0.ɵɵlistener("click", function EmbeddingComponent_Template_button_click_17_listener() { return ctx.save(); });
            i0.ɵɵtext(18);
            i0.ɵɵpipe(19, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(20, EmbeddingComponent_Conditional_20_Template, 3, 3, "p", 10);
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(21, EmbeddingComponent_Conditional_21_Template, 2, 1, "p", 11);
            i0.ɵɵelementStart(22, "p", 12);
            i0.ɵɵtext(23);
            i0.ɵɵpipe(24, "transloco");
            i0.ɵɵelementEnd()()();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵproperty("heading", i0.ɵɵpipeBind1(2, 11, "embedding.origins.title"))("purpose", i0.ɵɵpipeBind1(3, 13, "embedding.origins.subtitle"));
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(8, 15, "embedding.origins.warning"));
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.origins().length === 0 ? 9 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵrepeater(ctx.origins());
            i0.ɵɵadvance(4);
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(16, 17, "embedding.origins.add"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵproperty("disabled", ctx.saving());
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1(" ", i0.ɵɵpipeBind1(19, 19, ctx.saving() ? "common.saving" : "common.save"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.savedAt() ? 20 : -1);
            i0.ɵɵadvance();
            i0.ɵɵconditional(ctx.problem() ? 21 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(24, 21, "embedding.origins.hint"));
        } }, dependencies: [FormsModule, i1.DefaultValueAccessor, i1.NgControlStatus, i1.NgModel, TranslocoModule, PhIconComponent, SettingsCardComponent, i2.TranslocoPipe], styles: [".embed-page[_ngcontent-%COMP%] { display: flex; flex-direction: column; gap: 16px; }\n    .origins[_ngcontent-%COMP%] { display: flex; flex-direction: column; gap: 8px; }\n    .origin-row[_ngcontent-%COMP%] { display: flex; gap: 8px; align-items: center; }\n    .origin-row[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n      flex: 1; padding: 8px 10px; font-family: var(--font-mono); font-size: 13px;\n      background: var(--bg-primary); color: var(--text-primary);\n      border: 1px solid var(--border); border-radius: var(--radius-sm);\n    }\n    .origin-row[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus { outline: none; border-color: var(--accent); }\n    .origin-row[_ngcontent-%COMP%]   input.rejected[_ngcontent-%COMP%] { border-color: var(--error); }\n    .rm[_ngcontent-%COMP%] {\n      display: grid; place-items: center; width: 30px; height: 30px; flex: none;\n      background: none; border: 1px solid var(--border); border-radius: var(--radius-sm);\n      color: var(--text-muted); cursor: pointer;\n    }\n    .rm[_ngcontent-%COMP%]:hover { color: var(--error); border-color: var(--error); }\n    .actions[_ngcontent-%COMP%] { display: flex; gap: 8px; align-items: center; margin-top: 12px; }\n    .danger-note[_ngcontent-%COMP%] {\n      display: flex; gap: 8px; padding: 10px 12px; margin: 0 0 12px;\n      border: 1px solid var(--warning); border-radius: var(--radius-sm);\n      background: color-mix(in srgb, var(--warning) 8%, transparent);\n      font-size: 13px; line-height: 1.5; color: var(--text-primary);\n    }\n    .danger-note[_ngcontent-%COMP%]   ph-icon[_ngcontent-%COMP%] { flex: none; color: var(--warning); margin-top: 2px; }\n    .hint[_ngcontent-%COMP%] { font-size: 12px; color: var(--text-muted); line-height: 1.5; }\n    .problem[_ngcontent-%COMP%] { font-size: 13px; color: var(--error); margin: 8px 0 0; }\n    .problem[_ngcontent-%COMP%]   code[_ngcontent-%COMP%] { font-family: var(--font-mono); }\n    .saved[_ngcontent-%COMP%] { font-size: 13px; color: var(--success); margin: 0; }\n    .empty[_ngcontent-%COMP%] { font-size: 13px; color: var(--text-muted); margin: 0; }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(EmbeddingComponent, [{
        type: Component,
        args: [{ selector: 'app-embedding', standalone: true, imports: [FormsModule, TranslocoModule, PhIconComponent, SettingsCardComponent], template: `
    <div class="embed-page">
      <app-settings-card
        icon="corners-out"
        [heading]="'embedding.origins.title' | transloco"
        [purpose]="'embedding.origins.subtitle' | transloco">

        <p class="danger-note">
          <ph-icon name="warning" [size]="16"/>
          <span>{{ 'embedding.origins.warning' | transloco }}</span>
        </p>

        @if (origins().length === 0) {
          <p class="empty">{{ 'embedding.origins.none' | transloco }}</p>
        }

        <div class="origins">
          @for (o of origins(); track $index) {
            <div class="origin-row">
              <input
                type="text" spellcheck="false" autocomplete="off"
                placeholder="https://portal.example.com"
                [class.rejected]="rejected().includes(o)"
                [ngModel]="o" (ngModelChange)="setOrigin($index, $event)"
                [attr.aria-label]="'embedding.origins.entryLabel' | transloco" />
              <button type="button" class="rm" (click)="removeOrigin($index)"
                [attr.aria-label]="'common.remove' | transloco">
                <ph-icon name="x" [size]="12"/>
              </button>
            </div>
          }
        </div>

        <div class="actions">
          <button type="button" class="btn" (click)="addOrigin()">
            {{ 'embedding.origins.add' | transloco }}
          </button>
          <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="save()">
            {{ (saving() ? 'common.saving' : 'common.save') | transloco }}
          </button>
          @if (savedAt()) {
            <p class="saved">{{ 'embedding.origins.saved' | transloco }}</p>
          }
        </div>

        @if (problem()) {
          <p class="problem">{{ problem() }}</p>
        }

        <p class="hint">{{ 'embedding.origins.hint' | transloco }}</p>
      </app-settings-card>
    </div>
  `, styles: ["\n    .embed-page { display: flex; flex-direction: column; gap: 16px; }\n    .origins { display: flex; flex-direction: column; gap: 8px; }\n    .origin-row { display: flex; gap: 8px; align-items: center; }\n    .origin-row input {\n      flex: 1; padding: 8px 10px; font-family: var(--font-mono); font-size: 13px;\n      background: var(--bg-primary); color: var(--text-primary);\n      border: 1px solid var(--border); border-radius: var(--radius-sm);\n    }\n    .origin-row input:focus { outline: none; border-color: var(--accent); }\n    .origin-row input.rejected { border-color: var(--error); }\n    .rm {\n      display: grid; place-items: center; width: 30px; height: 30px; flex: none;\n      background: none; border: 1px solid var(--border); border-radius: var(--radius-sm);\n      color: var(--text-muted); cursor: pointer;\n    }\n    .rm:hover { color: var(--error); border-color: var(--error); }\n    .actions { display: flex; gap: 8px; align-items: center; margin-top: 12px; }\n    .danger-note {\n      display: flex; gap: 8px; padding: 10px 12px; margin: 0 0 12px;\n      border: 1px solid var(--warning); border-radius: var(--radius-sm);\n      background: color-mix(in srgb, var(--warning) 8%, transparent);\n      font-size: 13px; line-height: 1.5; color: var(--text-primary);\n    }\n    .danger-note ph-icon { flex: none; color: var(--warning); margin-top: 2px; }\n    .hint { font-size: 12px; color: var(--text-muted); line-height: 1.5; }\n    .problem { font-size: 13px; color: var(--error); margin: 8px 0 0; }\n    .problem code { font-family: var(--font-mono); }\n    .saved { font-size: 13px; color: var(--success); margin: 0; }\n    .empty { font-size: 13px; color: var(--text-muted); margin: 0; }\n  "] }]
    }], () => [], null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(EmbeddingComponent, { className: "EmbeddingComponent", filePath: "app/pages/settings/embedding.component.ts", lineNumber: 124 }); })();
