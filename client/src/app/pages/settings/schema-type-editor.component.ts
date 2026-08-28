/**
 * The per-type schema editor — one component, two hosts.
 *
 * ## Why it exists
 *
 * This body lived inside `space-schema-tab.component.ts`, bound to `SpaceSettingsState` through
 * `state.typeState(kt, name)` on roughly thirty template expressions. That made it unreachable from
 * anywhere else, and the Brain Overview's data-model panel needs exactly this editor in place — sending an
 * operator to Space Settings to change one field, and then back, is the flow this whole feature exists to
 * remove.
 *
 * `SpaceSettingsState` is `@Injectable()` with no `providedIn`, so it is provided by the settings page and
 * the Brain page cannot inject it. Root-providing it would turn per-space editing state into a cross-page
 * singleton, which is worse than the problem. So this component takes a DRAFT and edits it.
 *
 * ## What it deliberately does NOT do
 *
 * **It does not save.** The two hosts persist differently and must keep doing so: Space Settings is STAGED
 * (edit several types, then Save) while the Overview panel is IMMEDIATE (edit one type, write it now). A
 * save in here would force one host to adopt the other's model. The panel's write must additionally go
 * through `PATCH /api/spaces/:id` rather than `PUT /:id/schema`, which applies directly and would be a
 * silent consensus bypass on a networked space.
 *
 * **It does not own the library actions.** Export, save-to-library, unlink and remove stay with the settings
 * tab's header. Those are about the schema LIBRARY and about deleting a type, not about editing one, and the
 * Overview panel has no business offering them — a dialog that could delete a type would be answerable for
 * something no caller asked it to do. `unlink` is emitted rather than performed, because the read-only
 * notice that offers it lives in this body while the action belongs to the host.
 *
 * **It does not read the space config.** The inherited retention window arrives as an input; the component
 * has no opinion about where a space keeps its defaults.
 *
 * ## What it DOES own
 *
 * Which property rows are expanded. That is view state, not schema — the settings tab kept one set spanning
 * every type it had open, and a dialog editing a single type has no use for that. It is also why
 * `addProp` in `type-schema-edits.ts` returns the key it added rather than a boolean: the caller expands the
 * row it just created.
 */
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import type { KnowledgeType, PropertySchema } from '../../core/api.types';
import type { TypeSchemaState } from './space-settings-state.service';
import { addProp, removeProp, addEnumVal, removeEnumVal } from './type-schema-edits';
import { SCHEMA_MD_STYLES } from './schema-styles';
import { CHIP_STYLES } from '../../shared/chip.styles';
import { PROP_TABLE_STYLES } from '../../shared/prop-table.styles';
import { mergeFnsFor, mergeFnAfterTypeChange } from '../../shared/merge-fns';

@Component({
  selector: 'app-schema-type-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoPipe, PhIconComponent, HscrollTopDirective],
  // Neither of these is decoration, and BOTH came loose when this editor was extracted out of the schema tab.
  // Angular scopes styles, so a class this template renders and this array does not define gets browser
  // defaults — with no error, in a component that still works perfectly.
  //
  // CHIP_STYLES: `.chip-wrap`/`.chip`/`.chip-rm`/`.chip-field`, the oversized enum remove button
  // the canary operator reported.
  //
  // PROP_TABLE_STYLES: `.prop-table`/`.prop-row`/`.prop-caret`/`.pdet`/`.pdet-fields`/`.req-toggle`. Missing
  // for longer and reported by the owner on 2026-08-15 with a screenshot — the Required pill rendered as a
  // raw checkbox with its label wrapped under it, and the detail card lost both its column grid and its
  // padding, so every field ran edge to edge with its label against the dialog border.
  styles: [SCHEMA_MD_STYLES, CHIP_STYLES, PROP_TABLE_STYLES],
  template: `
@if (libRef(); as libRef) {
  <!-- Linked library schema — editable only after unlinking; shown read-only meanwhile. -->
  <div style="display:flex;align-items:center;gap:10px;padding:4px 0;color:var(--text-secondary);font-size:13px;">
    <ph-icon name="bookmarks" [size]="16" style="color:var(--accent);flex-shrink:0;"/>
    <span>{{ 'spaces.schema.libRef.linkedHint' | transloco: {name: libRef} }}</span>
    <button class="btn btn-secondary btn-sm" type="button" style="margin-left:auto;flex-shrink:0;"
      (click)="unlink.emit()" [attr.title]="'spaces.schema.libRef.unlinkTitle' | transloco">{{ 'spaces.schema.libRef.unlinkButton' | transloco }}</button>
  </div>
  <!-- Read-only view of the linked entry's properties, so you can see what the type enforces
       without unlinking first. -->
  @if (linkedProps(); as props) {
    @if (props.length) {
      <div class="sch-section-label" style="margin-top:12px;">{{ 'spaces.schema.propertySchemas' | transloco }}</div>
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th style="width:150px;">{{ 'spaces.schema.propTable.property' | transloco }}</th>
              <th style="width:80px;">{{ 'spaces.schema.propTable.type' | transloco }}</th>
              <th>{{ 'spaces.schema.propTable.constraints' | transloco }}</th>
            </tr>
          </thead>
          <tbody>
            @for (p of props; track p.key) {
              <tr>
                <td style="font-family:var(--font-mono);font-size:12.5px;">{{ p.key }}</td>
                <td>{{ p.s.type || '—' }}</td>
                <td style="color:var(--text-secondary);font-size:12.5px;">{{ propConstraintSummary(p.s) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="sch-hint" style="margin-top:8px;">{{ 'spaces.schema.libRef.noProps' | transloco }}</div>
    }
  }
} @else {
  <!-- Naming pattern (entity only) -->
  @if (knowledgeType() === 'entity') {
    <div class="field" style="margin:0 0 12px;">
      <label>{{ 'spaces.schema.namingPattern' | transloco }} <span class="sch-hint">{{ 'spaces.schema.namingPatternHint' | transloco }}</span></label>
      <input type="text" [(ngModel)]="d().namingPattern" [placeholder]="'spaces.schema.namingPatternPlaceholder' | transloco" style="max-width:320px;" />
    </div>
  }
  <!-- Retention — the SCHEMA tier of record > schema > space, and the control the Danger Zone, the
       integration guide and the API have all been pointing at. It belongs here, beside the type's
       other rules, rather than in a second parallel map an operator has to know exists.

       The hint names what an empty field inherits, with the space default's actual number in it: the
       operator who asked for this said the old arrangement was a convention they had to know, and
       "inherit" without saying inherit-WHAT is the same failure one level down.

       NOTE: no backticks anywhere in this comment — one kills the whole template string and the
       error then points at @Component. -->
  <div class="sch-section-label">{{ 'spaces.schema.retention.label' | transloco }}
    <!-- The inherited number is THIS collection's bucket, not one space-wide figure: the space tier is
         five windows, and naming the wrong one would be worse than naming none. -->
    <span class="sch-hint">
      @if (spaceWindowDays(); as days) {
        {{ 'spaces.schema.retention.hintSpace' | transloco: { days } }}
      } @else {
        {{ 'spaces.schema.retention.hintNoSpace' | transloco }}
      }
    </span>
  </div>
  <div class="ret-row">
    <div class="field" style="margin:0;">
      <label>{{ 'spaces.schema.retention.days' | transloco }}</label>
      <input type="number" min="1" step="1" [(ngModel)]="d().retentionDays"
        [placeholder]="'spaces.schema.retention.inherit' | transloco" />
    </div>
    <!-- chrono only, because that is the only collection whose sweep implements it. Offering it on
         the others would store a number that never fires. -->
    @if (knowledgeType() === 'chrono') {
      <div class="field" style="margin:0;">
        <label>{{ 'spaces.schema.retention.contentDays' | transloco }}</label>
        <input type="number" min="1" step="1" [(ngModel)]="d().retentionContentDays"
          [placeholder]="'spaces.schema.retention.never' | transloco" />
        <div class="sch-hint" style="margin-top:3px;">{{ 'spaces.schema.retention.contentDaysHint' | transloco }}</div>
      </div>
    }
  </div>
  <!-- The server CLAMPS a content window that is not strictly inside the delete window (it would
       never fire), so without this the field would accept a number and silently do nothing. -->
  @if (contentWindowNeverFires(); as total) {
    <div class="sch-msg err">{{ 'spaces.schema.retention.contentTooLate' | transloco: { total } }}</div>
  }
  <!-- Three states, not a checkbox. "Inherit" is the space setting and is the DEFAULT; the other two are
       deliberate overrides in each direction. A two-state control could not express "embed this type even
       though the space suppresses", and it would write a value on every save for types nobody touched. -->
  <div class="field">
    <label>{{ 'spaces.schema.suppressEmbeddings.label' | transloco }}</label>
    <select [ngModel]="suppressValue()" (ngModelChange)="setSuppress($event)" style="max-width:320px;">
      <option value="inherit">{{ 'spaces.schema.suppressEmbeddings.inherit' | transloco }}</option>
      <option value="on">{{ 'spaces.schema.suppressEmbeddings.on' | transloco }}</option>
      <option value="off">{{ 'spaces.schema.suppressEmbeddings.off' | transloco }}</option>
    </select>
    <div class="sch-hint" style="margin-top:3px;">{{ 'spaces.schema.suppressEmbeddings.hint' | transloco }}</div>
    @if (d().suppressEmbeddings === true) {
      <div class="sch-msg warn">{{ 'spaces.schema.suppressEmbeddings.noBackfill' | transloco }}</div>
    }
  </div>
  <!-- Per-type tag suggestions were retired here. The editor reached nothing: not the Brain
       record forms (they suggest from tags already in use) and not the schema guidance sent to
       MCP clients. Offering a control that does nothing is the dishonesty the Models rebuild
       spent four PRs removing, and it is the same reasoning that retired the space-wide list
       in #365. Stored values are preserved — see the note on TypeSchema.tagSuggestions. -->
  <!-- Property schemas -->
  <!-- Every other section in this pane explains itself; this one did not, and it is the one
       doing the most work. The hint also points at the control that decides enforcement,
       which is a whole panel away at the top of the tab. -->
  <div class="sch-section-label">{{ 'spaces.schema.propertySchemas' | transloco }}
    <span class="sch-hint">{{ 'spaces.schema.propertySchemasHint' | transloco }}</span></div>
  <div class="table-wrapper" hscrollTop style="margin-bottom:0;">
    <table class="prop-table" style="margin-bottom:0;">
      <thead>
        <tr>
          <th style="width:30px;"></th>
          <th style="width:150px;">{{ 'spaces.schema.propTable.property' | transloco }}</th>
          <th style="width:80px;">{{ 'spaces.schema.propTable.type' | transloco }}</th>
          <th>{{ 'spaces.schema.propTable.constraints' | transloco }}</th>
          <th style="width:40px;"></th>
        </tr>
      </thead>
      <tbody>
        @for (p of d().propertySchemas; track p.key) {
          <tr class="prop-row" [class.prow-open]="isOpen(p.key)"
            (click)="toggleOpen(p.key)">
            <td><span class="prop-caret"><ph-icon [name]="isOpen(p.key) ? 'caret-up' : 'caret-down'" [size]="13"/></span></td>
            <td>
              <div class="prop-name">
                <span class="prop-name-key">{{ p.key }}</span>
                <label class="req-toggle" [class.is-req]="p.s.required" (click)="$event.stopPropagation()">
                  <input type="checkbox" [checked]="p.s.required" (change)="p.s.required = !p.s.required" />
                  {{ 'spaces.schema.propDetail.required' | transloco }}
                </label>
              </div>
            </td>
            <td><span class="badge badge-gray">{{ p.s.type ?? 'any' }}</span></td>
            <td style="font-size:11px;color:var(--text-muted);">
              @if (p.s.enum?.length) { <span class="badge badge-gray" style="margin-right:3px">enum {{ p.s.enum!.length }}</span> }
              @if (p.s.minimum!==undefined) { <span style="margin-right:4px;">min:{{ p.s.minimum }}</span> }
              @if (p.s.maximum!==undefined) { <span style="margin-right:4px;">max:{{ p.s.maximum }}</span> }
              @if (p.s.pattern) { <span style="margin-right:4px;">pattern</span> }
              @if (p.s.default!==undefined) { <span style="margin-right:4px;">default:{{ p.s.default }}</span> }
              @if (p.s.mergeFn) { <span class="badge badge-blue">{{ p.s.mergeFn }}</span> }
            </td>
            <td (click)="$event.stopPropagation()">
              <button class="icon-btn danger" type="button" (click)="onRemoveProp(p.key)" [attr.title]="'common.remove' | transloco"><ph-icon name="x" [size]="14"/></button>
            </td>
          </tr>
          @if (isOpen(p.key)) {
            <tr class="prop-expand-row" (click)="$event.stopPropagation()">
              <td colspan="5" style="padding:0;">
                <div class="pdet">
                  <div class="pdet-fields">
                    <div class="field" style="margin:0;">
                      <label>{{ 'spaces.schema.propDetail.type' | transloco }}</label>
                      <select [(ngModel)]="p.s.type" (ngModelChange)="onTypeChange(p)">
                        <option [ngValue]="undefined">any</option>
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="date">date</option>
                      </select>
                    </div>
                    <div class="field" style="margin:0;">
                      <label>{{ 'spaces.schema.propDetail.default' | transloco }}</label>
                      <input type="text" [(ngModel)]="p.s.default" placeholder="—" />
                    </div>
                    <!-- Only the functions the API accepts for this type. Offering all seven is what let a
                         date + min be chosen and then refused at save with a wall of zod JSON. -->
                    <div class="field" style="margin:0;">
                      <label>{{ 'spaces.schema.propDetail.mergeFn' | transloco }}</label>
                      <select [(ngModel)]="p.s.mergeFn" [disabled]="!mergeFnsFor(p.s.type).length">
                        <option [ngValue]="undefined">—</option>
                        @for (fn of mergeFnsFor(p.s.type); track fn) { <option [value]="fn">{{ fn }}</option> }
                      </select>
                      @if (!mergeFnsFor(p.s.type).length) {
                        <span class="sch-hint">{{ 'spaces.schema.propDetail.mergeFnUnavailable' | transloco }}</span>
                      }
                    </div>
                    @if (p.s.type==='string'||p.s.type===undefined) {
                      <div class="field" style="margin:0;">
                        <label>{{ 'spaces.schema.propDetail.pattern' | transloco }} <span class="sch-hint">{{ 'spaces.schema.propDetail.patternHint' | transloco }}</span></label>
                        <input type="text" [(ngModel)]="p.s.pattern" placeholder="^[A-Z].*" />
                      </div>
                    }
                    @if (p.s.type==='number'||p.s.type===undefined) {
                      <div class="field" style="margin:0;">
                        <label>{{ 'spaces.schema.propDetail.min' | transloco }}</label>
                        <input type="number" [(ngModel)]="p.s.minimum" placeholder="—" />
                      </div>
                      <div class="field" style="margin:0;">
                        <label>{{ 'spaces.schema.propDetail.max' | transloco }}</label>
                        <input type="number" [(ngModel)]="p.s.maximum" placeholder="—" />
                      </div>
                    }
                  </div>
                  @if (p.s.type !== 'boolean') {
                    <div class="pdet-full">
                      <div class="field" style="margin:0;">
                        <label>{{ 'spaces.schema.propDetail.enumValues' | transloco }} <span class="sch-hint">{{ 'spaces.schema.propDetail.enumHint' | transloco }}</span></label>
                        <div class="chip-wrap">
                          @for (ev of (p.s.enum??[]); track ev) {
                            <span class="chip">{{ ev }}<button type="button" class="chip-rm" (click)="onRemoveEnum(p.key,ev)"><ph-icon name="x" [size]="12"/></button></span>
                          }
                          <input type="text" class="chip-field" [(ngModel)]="p._enumInput"
                            [placeholder]="'spaces.schema.propDetail.enumPlaceholder' | transloco" (keydown)="onEnumKey($event,p.key)" />
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </td>
            </tr>
          }
        } @empty {
          <tr>
            <td colspan="5" style="padding:24px 0;text-align:center;color:var(--text-muted);font-size:13px;font-style:italic;">
              {{ 'spaces.schema.noProps' | transloco }}
            </td>
          </tr>
        }
      </tbody>
    </table>
  </div>
  <!-- add property — the same inline [input][+] affordance as the add-type row, so the two
       "add something" controls on this tab read and behave identically. -->
  <div class="sch-add-row sch-add-prop">
    <input type="text" [(ngModel)]="d()._newPropInput" [placeholder]="'spaces.schema.newPropNamePlaceholder' | transloco"
      [attr.aria-label]="'spaces.schema.addPropertyButton' | transloco"
      (keydown.enter)="$event.preventDefault();onAddProp()" />
    <button class="sch-add-btn" type="button"
      (click)="onAddProp()" [disabled]="!d()._newPropInput.trim()"
      [attr.title]="'spaces.schema.addPropertyButton' | transloco" [attr.aria-label]="'spaces.schema.addPropertyButton' | transloco">
      <ph-icon name="plus-circle" [size]="18"/>
    </button>
  </div>
}
  `,
})
export class SchemaTypeEditorComponent {
  private readonly transloco = inject(TranslocoService);

  /** Which collection the type belongs to. Only `chrono` offers a content-retention window. */
  readonly knowledgeType = input.required<KnowledgeType>();
  /** The draft being edited, IN PLACE. The host owns it and decides when it is persisted. */
  readonly draft = input.required<TypeSchemaState>();
  /** The library entry this type is linked to, if any — a linked type is read-only until unlinked. */
  readonly libRef = input<string | null>(null);
  /** A linked entry's properties, resolved by the host, for the read-only view. */
  readonly linkedProps = input<{ key: string; s: PropertySchema }[]>([]);
  /** The retention window this collection inherits from the space, or null. Shown as the fallback hint. */
  readonly spaceWindowDays = input<number | null>(null);

  /** Asked for, not done: the notice lives here, the action belongs to the host. */
  readonly unlink = output<void>();

  /** Short alias so the template reads as `d().field` rather than repeating `draft()`. */
  readonly d = this.draft;

  // ── Expanded rows. Local, because it is view state and each host wants its own.
  private readonly openRows = signal<ReadonlySet<string>>(new Set());
  isOpen(key: string): boolean { return this.openRows().has(key); }
  toggleOpen(key: string): void {
    const next = new Set(this.openRows());
    if (!next.delete(key)) next.add(key);
    this.openRows.set(next);
  }

  // ── Edits, delegated to the pure operations so the settings tab and this component cannot diverge.
  onAddProp(): void {
    const key = addProp(this.draft());
    if (key !== null) this.toggleOpen(key);   // expand what was just created
  }
  onRemoveProp(key: string): void {
    removeProp(this.draft(), key);
    const next = new Set(this.openRows());
    next.delete(key);
    this.openRows.set(next);
  }
  /**
   * The merge functions this type may declare — the API's own rule, so the control cannot offer a refusal.
   *
   * A method rather than a pipe because the answer depends on a field the row owns and changes in place.
   */
  mergeFnsFor = mergeFnsFor;

  /**
   * Changing the type clears a merge function the new type cannot hold.
   *
   * This component had NO type-change handler at all — the shared `prop-schema-table` had one and this copy
   * did not, which is the same one-rule-two-implementations split that lost its stylesheet. Without it,
   * switching `number` to `date` leaves `min` behind, invisible, until the save is refused for a field the
   * operator was not editing.
   */
  onTypeChange(p: { s: PropertySchema }): void {
    p.s.mergeFn = mergeFnAfterTypeChange(p.s.type, p.s.mergeFn);
  }

  onAddEnum(key: string): void { addEnumVal(this.draft(), key); }
  onRemoveEnum(key: string, val: string | number | boolean): void { removeEnumVal(this.draft(), key, val); }
  onEnumKey(e: KeyboardEvent, key: string): void {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); this.onAddEnum(key); }
  }

  /**
   * The effective delete window when a chrono type's content window sits at or beyond it — else null.
   *
   * Mirrors `contentDays()` on the server exactly, including its fall-through: a type with no `days` of its
   * own is still deleted at the SPACE default, so a 30-day content window under a 30-day space default never
   * fires either. Returning the number lets the message say which window it lost to, which is the part an
   * operator cannot work out from the two fields in front of them.
   */
  readonly contentWindowNeverFires = computed<number | null>(() => {
    if (this.knowledgeType() !== 'chrono') return null;
    const s = this.draft();
    const content = Number(s.retentionContentDays);
    if (!Number.isFinite(content) || content <= 0) return null;
    const total = Number(s.retentionDays) || this.spaceWindowDays() || 0;
    return total > 0 && content >= total ? total : null;
  });

  /**
   * The tri-state suppression control, as a select value.
   *
   * `null` is "inherit" and must round-trip as `null` — mapping it to `false` would write a decision on every
   * save for every type nobody edited, and pin each of them to embedding regardless of the space setting.
   */
  readonly suppressValue = computed<'inherit' | 'on' | 'off'>(() => {
    const v = this.draft().suppressEmbeddings;
    return v === null || v === undefined ? 'inherit' : v ? 'on' : 'off';
  });

  setSuppress(v: 'inherit' | 'on' | 'off'): void {
    this.draft().suppressEmbeddings = v === 'inherit' ? null : v === 'on';
  }
  /**
   * One line summarising a property's constraints, for the collapsed row.
   *
   * Moved here with the body it serves. It reads nothing but the property it is given, so it had no reason
   * to stay behind on the tab once the rows did.
   */
  propConstraintSummary(s: PropertySchema): string {
    const parts: string[] = [];
    if (s.required) parts.push(this.transloco.translate('spaces.schema.propDetail.required'));
    if (s.enum?.length) parts.push(`${this.transloco.translate('spaces.schema.propDetail.enumValues')}: ${s.enum.join(', ')}`);
    if (s.minimum != null) parts.push(`${this.transloco.translate('spaces.schema.propDetail.min')} ${s.minimum}`);
    if (s.maximum != null) parts.push(`${this.transloco.translate('spaces.schema.propDetail.max')} ${s.maximum}`);
    if (s.pattern) parts.push(`/${s.pattern}/`);
    if (s.default != null) parts.push(`${this.transloco.translate('spaces.schema.propDetail.default')} ${s.default}`);
    return parts.join(' · ') || '—';
  }
}
