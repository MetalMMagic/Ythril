import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { PropertySchema } from '../core/api.service';

export interface PropSchemaRow {
  key: string;
  s: PropertySchema;
  _enumInput: string;
}

@Component({
  selector: 'app-prop-schema-table',
  standalone: true,
  imports: [FormsModule, TranslocoPipe],
  styles: [`
    .prop-table { width:100%; border-collapse:collapse; font-size:13px; }
    .prop-table th { text-align:left; font-size:11px; font-weight:600; color:var(--text-muted); padding:5px 8px; border-bottom:1px solid var(--border); }
    .prop-table td { padding:6px 8px; border-bottom:1px solid var(--border); vertical-align:middle; }
    .prop-row { cursor:pointer; }
    .prop-row:hover td { background:var(--bg-elevated); }
    .prop-row.prow-open td { background:color-mix(in srgb,var(--accent) 6%,transparent); }
    .prop-expand-row td { background:var(--bg-elevated); padding:0; }
    .pdet { background:var(--bg-surface); border-top:2px solid color-mix(in srgb,var(--accent) 30%,transparent); }
    .pdet-fields { display:grid; grid-template-columns:repeat(3,1fr); gap:10px 16px; padding:14px; }
    .pdet-full { padding:0 14px 14px; }
    .req-toggle { display:inline-flex; align-items:center; gap:6px; font-size:12px; cursor:pointer; color:var(--text-muted); background:none; border:1px solid var(--border); font-family:var(--font); padding:3px 10px; border-radius:var(--radius-sm); transition:all .15s; }
    .req-toggle:hover { background:var(--bg-elevated); color:var(--text-primary); border-color:color-mix(in srgb,var(--accent) 40%,transparent); }
    .req-toggle.is-req { color:var(--warning); border-color:color-mix(in srgb,var(--warning) 50%,transparent); background:color-mix(in srgb,var(--warning) 8%,transparent); font-weight:600; }
    .chip-wrap { display:flex; flex-wrap:wrap; gap:4px; align-items:center; border:1px solid var(--border); border-radius:var(--radius-sm); padding:4px 8px; min-height:34px; background:var(--bg-surface); cursor:text; }
    .chip { display:inline-flex; align-items:center; gap:3px; background:color-mix(in srgb,var(--accent) 15%,transparent); color:var(--accent); border-radius:3px; padding:1px 6px; font-size:12px; }
    .chip-rm { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; }
    .chip-rm:hover { color:var(--danger); }
    .chip-field { border:none; background:none; outline:none; font-size:12px; min-width:100px; flex:1; color:var(--text-primary); font-family:var(--font); padding:1px 0; }
    .add-prop-row { display:flex; gap:8px; align-items:center; margin-top:10px; padding-top:10px; border-top:1px solid var(--border); }
  `],
  template: `
    @if (rows.length) {
      <table class="prop-table">
        <thead><tr>
          <th style="width:160px;">{{ 'spaces.schema.propTable.property' | transloco }}</th>
          <th style="width:80px;">{{ 'spaces.schema.propTable.type' | transloco }}</th>
          <th>{{ 'spaces.schema.propTable.constraints' | transloco }}</th>
          <th></th>
        </tr></thead>
        <tbody>
          @for (p of rows; track p.key) {
            <tr class="prop-row" [class.prow-open]="expandedKey() === p.key" (click)="toggleExpand(p.key)">
              <td>
                <div style="display:flex;align-items:center;gap:7px;">
                  <span style="font-family:var(--font-mono);font-size:12px;">{{ p.key }}</span>
                  <label class="req-toggle" [class.is-req]="p.s.required" (click)="$event.stopPropagation()">
                    <input type="checkbox" [checked]="p.s.required" (change)="p.s.required = !p.s.required; changed.emit()" style="pointer-events:none;" />
                    {{ 'spaces.schema.propDetail.required' | transloco }}
                  </label>
                </div>
              </td>
              <td><span class="badge badge-gray" style="font-size:11px;">{{ p.s.type ?? 'any' }}</span></td>
              <td style="font-size:11px;color:var(--text-muted);">
                @if (p.s.enum?.length) { <span class="badge badge-gray" style="font-size:10px;margin-right:3px;">enum {{ p.s.enum!.length }}</span> }
                @if (p.s.minimum !== undefined) { <span style="margin-right:4px;">min:{{ p.s.minimum }}</span> }
                @if (p.s.maximum !== undefined) { <span style="margin-right:4px;">max:{{ p.s.maximum }}</span> }
                @if (p.s.pattern) { <span style="margin-right:4px;">pattern</span> }
                @if (p.s.default !== undefined) { <span style="margin-right:4px;">default:{{ p.s.default }}</span> }
                @if (p.s.mergeFn) { <span class="badge badge-blue" style="font-size:10px;">{{ p.s.mergeFn }}</span> }
              </td>
              <td>
                <div style="display:flex;gap:4px;justify-content:flex-end;">
                  <button class="icon-btn danger" type="button" (click)="removeRow(p.key); $event.stopPropagation()" [attr.title]="'common.remove' | transloco">✕</button>
                </div>
              </td>
            </tr>
            @if (expandedKey() === p.key) {
              <tr class="prop-expand-row" (click)="$event.stopPropagation()">
                <td colspan="4" style="padding:0;">
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
                        <input type="text" [(ngModel)]="p.s.default" placeholder="—" (ngModelChange)="changed.emit()" />
                      </div>
                      <div class="field" style="margin:0;">
                        <label>{{ 'spaces.schema.propDetail.mergeFn' | transloco }}</label>
                        <select [(ngModel)]="p.s.mergeFn" (ngModelChange)="changed.emit()">
                          <option [ngValue]="undefined">—</option>
                          <option value="avg">avg</option><option value="min">min</option>
                          <option value="max">max</option><option value="sum">sum</option>
                          <option value="and">and</option><option value="or">or</option>
                          <option value="xor">xor</option>
                        </select>
                      </div>
                      @if (p.s.type === 'string' || p.s.type === undefined) {
                        <div class="field" style="margin:0;">
                          <label>{{ 'spaces.schema.propDetail.pattern' | transloco }} <span style="font-size:10px;font-weight:400;color:var(--text-muted);">{{ 'spaces.schema.propDetail.patternHint' | transloco }}</span></label>
                          <input type="text" [(ngModel)]="p.s.pattern" placeholder="^[A-Z].*" (ngModelChange)="changed.emit()" />
                        </div>
                      }
                      @if (p.s.type === 'number' || p.s.type === undefined) {
                        <div class="field" style="margin:0;">
                          <label>{{ 'spaces.schema.propDetail.min' | transloco }}</label>
                          <input type="number" [(ngModel)]="p.s.minimum" placeholder="—" (ngModelChange)="changed.emit()" />
                        </div>
                        <div class="field" style="margin:0;">
                          <label>{{ 'spaces.schema.propDetail.max' | transloco }}</label>
                          <input type="number" [(ngModel)]="p.s.maximum" placeholder="—" (ngModelChange)="changed.emit()" />
                        </div>
                      }
                    </div>
                    @if (p.s.type !== 'boolean') {
                      <div class="pdet-full">
                        <div class="field" style="margin:0;">
                          <label>{{ 'spaces.schema.propDetail.enumValues' | transloco }} <span style="font-size:11px;font-weight:normal;color:var(--text-muted);">{{ 'spaces.schema.propDetail.enumHint' | transloco }}</span></label>
                          <div class="chip-wrap">
                            @for (ev of (p.s.enum ?? []); track ev) {
                              <span class="chip">{{ ev }}<button type="button" class="chip-rm" (click)="removeEnumVal(p, ev)">×</button></span>
                            }
                            <input type="text" class="chip-field" [(ngModel)]="p._enumInput"
                              [placeholder]="'spaces.schema.propDetail.enumPlaceholder' | transloco"
                              (keydown)="onEnumKey($event, p)" />
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    } @else {
      <p style="font-size:12px;color:var(--text-muted);margin:4px 0 8px;">{{ 'spaces.schema.noProps' | transloco }}</p>
    }
    <div class="add-prop-row">
      <input type="text" [(ngModel)]="newPropInput"
        [placeholder]="'spaces.schema.newPropNamePlaceholder' | transloco"
        style="flex:1;max-width:220px;"
        (keydown.enter)="addRow(); $event.preventDefault()" />
      <button class="btn btn-secondary btn-sm" type="button"
        (click)="addRow()" [disabled]="!newPropInput.trim()">{{ 'spaces.schema.addPropertyButton' | transloco }}</button>
    </div>
  `,
})
export class PropSchemaTableComponent {
  @Input() rows: PropSchemaRow[] = [];
  @Output() changed = new EventEmitter<void>();

  expandedKey = signal<string | null>(null);
  newPropInput = '';

  toggleExpand(key: string): void {
    this.expandedKey.set(this.expandedKey() === key ? null : key);
  }

  addRow(): void {
    const key = this.newPropInput.trim();
    if (!key || this.rows.some(r => r.key === key)) { this.newPropInput = ''; return; }
    this.rows.push({ key, s: {}, _enumInput: '' });
    this.newPropInput = '';
    this.expandedKey.set(key);
    this.changed.emit();
  }

  removeRow(key: string): void {
    const idx = this.rows.findIndex(r => r.key === key);
    if (idx !== -1) this.rows.splice(idx, 1);
    if (this.expandedKey() === key) this.expandedKey.set(null);
    this.changed.emit();
  }

  onTypeChange(p: PropSchemaRow): void {
    if (p.s.type === 'boolean' && p.s.mergeFn && ['avg', 'min', 'max', 'sum'].includes(p.s.mergeFn)) p.s.mergeFn = undefined;
    if (p.s.type === 'number'  && p.s.mergeFn && ['and', 'or', 'xor'].includes(p.s.mergeFn))         p.s.mergeFn = undefined;
    this.changed.emit();
  }

  onEnumKey(e: KeyboardEvent, p: PropSchemaRow): void {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); this.addEnumVal(p); }
  }

  addEnumVal(p: PropSchemaRow): void {
    const val = (p._enumInput ?? '').trim();
    if (!val) return;
    const curr = p.s.enum ?? [];
    if (!curr.some(v => String(v) === val)) p.s = { ...p.s, enum: [...curr, val] };
    p._enumInput = '';
    this.changed.emit();
  }

  removeEnumVal(p: PropSchemaRow, val: string | number | boolean): void {
    p.s = { ...p.s, enum: (p.s.enum ?? []).filter(v => v !== val) };
    this.changed.emit();
  }
}
