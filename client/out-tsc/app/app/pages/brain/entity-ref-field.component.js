import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { EntitySearchComponent } from '../../shared/entity-search.component';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { EntityRefPicker } from './entity-ref-picker.service';
import { BRAIN_CHIP_STYLES } from './brain-form.styles';
import * as i0 from "@angular/core";
const _forTrack0 = ($index, $item) => $item.id;
function EntityRefFieldComponent_Conditional_0_For_2_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "span", 2)(1, "span", 3);
    i0.ɵɵtext(2);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(3, "button", 4);
    i0.ɵɵlistener("mousedown", function EntityRefFieldComponent_Conditional_0_For_2_Template_button_mousedown_3_listener() { const chip_r2 = i0.ɵɵrestoreView(_r1).$implicit; const ctx_r2 = i0.ɵɵnextContext(2); return i0.ɵɵresetView(ctx_r2.picker.removeEntityId(ctx_r2.target(), chip_r2.id)); });
    i0.ɵɵelement(4, "ph-icon", 5);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const chip_r2 = ctx.$implicit;
    i0.ɵɵproperty("title", chip_r2.id);
    i0.ɵɵadvance(2);
    i0.ɵɵtextInterpolate(chip_r2.name);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 12);
} }
function EntityRefFieldComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 0);
    i0.ɵɵrepeaterCreate(1, EntityRefFieldComponent_Conditional_0_For_2_Template, 5, 3, "span", 2, _forTrack0);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const ctx_r2 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵrepeater(ctx_r2.picker.entityChips(ctx_r2.target().entityIds));
} }
/**
 * The entity-chip field: linked-entity chips + an inline entity autocomplete, in one element.
 *
 * Extracted (slice 3-refactor) from the ~6 hand-written copies of this exact block — memories/chrono
 * create + inline-edit forms and the detail drawer (memory + chrono). Each copy was chips + an inline
 * `app-entity-search` wired to the shared `EntityRefPicker`; drift between them is what the visual/UX
 * lens keeps flagging, so it lives once here. Label-less by design: the caller supplies its own
 * `<label>` / `.drawer-label` and field wrapper, so the component drops into both the form and the
 * drawer contexts unchanged.
 *
 * Dumb + OnPush: it owns no state. `target` is the caller's form object (any `{ entityIds: string }`);
 * picking mutates `target.entityIds` and the shared name cache via the picker, exactly as the inline
 * copies did — `pickEntity`/`removeEntityId`/`entityChips` are unchanged, so behaviour is preserved.
 */
export class EntityRefFieldComponent {
    constructor() {
        this.picker = inject(EntityRefPicker);
        /** The caller's form object; picking appends to its `entityIds`. */
        this.target = input.required(...(ngDevMode ? [{ debugName: "target" }] : /* istanbul ignore next */ []));
        this.spaceId = input.required(...(ngDevMode ? [{ debugName: "spaceId" }] : /* istanbul ignore next */ []));
    }
    static { this.ɵfac = function EntityRefFieldComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || EntityRefFieldComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: EntityRefFieldComponent, selectors: [["app-entity-ref-field"]], inputs: { target: [1, "target"], spaceId: [1, "spaceId"] }, decls: 2, vars: 2, consts: [[1, "entity-multi"], ["mode", "picker", "placeholder", "common.searchEntitiesPlaceholder", 3, "selected", "spaceId"], [1, "chip", 3, "title"], [1, "chip-name"], ["type", "button", 1, "chip-remove", 3, "mousedown"], ["name", "x", 3, "size"]], template: function EntityRefFieldComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, EntityRefFieldComponent_Conditional_0_Template, 3, 0, "div", 0);
            i0.ɵɵelementStart(1, "app-entity-search", 1);
            i0.ɵɵlistener("selected", function EntityRefFieldComponent_Template_app_entity_search_selected_1_listener($event) { return ctx.picker.pickEntity($event, ctx.target()); });
            i0.ɵɵelementEnd();
        } if (rf & 2) {
            i0.ɵɵconditional(ctx.picker.entityChips(ctx.target().entityIds).length ? 0 : -1);
            i0.ɵɵadvance();
            i0.ɵɵproperty("spaceId", ctx.spaceId());
        } }, dependencies: [EntitySearchComponent, PhIconComponent], styles: [".chip-list[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; min-height: 24px; }\n    .chip[_ngcontent-%COMP%] {\n      display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;\n      border-radius: 10px; background: var(--accent-dim); border: 1px solid var(--accent);\n      color: var(--accent); font-size: 11px; font-weight: 500; max-width: 200px;\n    }\n    .chip-name[_ngcontent-%COMP%] { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .chip-remove[_ngcontent-%COMP%] {\n      background: none; border: none; color: var(--accent); cursor: pointer;\n      font-size: 13px; line-height: 1; padding: 0 1px; flex-shrink: 0;\n    }\n    .entity-multi[_ngcontent-%COMP%] { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-height: 28px; padding: 2px 0; }\n    .chip-add[_ngcontent-%COMP%] { font-size: 11px; padding: 2px 8px; background: transparent;\n      border: 1px dashed var(--border); border-radius: 10px;\n      color: var(--text-muted); cursor: pointer;\n    }\n    .chip-add[_ngcontent-%COMP%]:hover { border-color: var(--accent); color: var(--accent); }\n    \n\n    .mem-pick[_ngcontent-%COMP%] { position: relative; }\n    .mem-pick-menu[_ngcontent-%COMP%] {\n      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60;\n      background: var(--bg-surface); border: 1px solid var(--border);\n      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);\n      max-height: 200px; overflow-y: auto;\n    }\n    .mem-pick-item[_ngcontent-%COMP%] {\n      display: block; width: 100%; text-align: left; padding: 6px 10px;\n      background: transparent; border: none; border-bottom: 1px solid var(--border-muted);\n      color: var(--text-primary); font-size: 12px; cursor: pointer;\n    }\n    .mem-pick-item[_ngcontent-%COMP%]:last-child { border-bottom: none; }\n    .mem-pick-item[_ngcontent-%COMP%]:hover { background: var(--bg-elevated); }"], changeDetection: 0 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(EntityRefFieldComponent, [{
        type: Component,
        args: [{ selector: 'app-entity-ref-field', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, imports: [EntitySearchComponent, PhIconComponent], template: `
    @if (picker.entityChips(target().entityIds).length) {
      <div class="entity-multi">
        @for (chip of picker.entityChips(target().entityIds); track chip.id) {
          <span class="chip" [title]="chip.id"><span class="chip-name">{{ chip.name }}</span><button type="button" class="chip-remove" (mousedown)="picker.removeEntityId(target(), chip.id)"><ph-icon name="x" [size]="12"/></button></span>
        }
      </div>
    }
    <app-entity-search mode="picker" [spaceId]="spaceId()" placeholder="common.searchEntitiesPlaceholder" (selected)="picker.pickEntity($event, target())" />
  `, styles: ["\n    .chip-list { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; min-height: 24px; }\n    .chip {\n      display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;\n      border-radius: 10px; background: var(--accent-dim); border: 1px solid var(--accent);\n      color: var(--accent); font-size: 11px; font-weight: 500; max-width: 200px;\n    }\n    .chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n    .chip-remove {\n      background: none; border: none; color: var(--accent); cursor: pointer;\n      font-size: 13px; line-height: 1; padding: 0 1px; flex-shrink: 0;\n    }\n    .entity-multi { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-height: 28px; padding: 2px 0; }\n    .chip-add { font-size: 11px; padding: 2px 8px; background: transparent;\n      border: 1px dashed var(--border); border-radius: 10px;\n      color: var(--text-muted); cursor: pointer;\n    }\n    .chip-add:hover { border-color: var(--accent); color: var(--accent); }\n    /* Inline memory picker (chrono form + drawer, slice 3c): input + absolute results dropdown. */\n    .mem-pick { position: relative; }\n    .mem-pick-menu {\n      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60;\n      background: var(--bg-surface); border: 1px solid var(--border);\n      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);\n      max-height: 200px; overflow-y: auto;\n    }\n    .mem-pick-item {\n      display: block; width: 100%; text-align: left; padding: 6px 10px;\n      background: transparent; border: none; border-bottom: 1px solid var(--border-muted);\n      color: var(--text-primary); font-size: 12px; cursor: pointer;\n    }\n    .mem-pick-item:last-child { border-bottom: none; }\n    .mem-pick-item:hover { background: var(--bg-elevated); }\n"] }]
    }], null, { target: [{ type: i0.Input, args: [{ isSignal: true, alias: "target", required: true }] }], spaceId: [{ type: i0.Input, args: [{ isSignal: true, alias: "spaceId", required: true }] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(EntityRefFieldComponent, { className: "EntityRefFieldComponent", filePath: "app/pages/brain/entity-ref-field.component.ts", lineNumber: 38 }); })();
