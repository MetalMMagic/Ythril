import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import type { RecallKnowledgeType } from '../../core/api.types';

/** The recall form's state, mutated IN PLACE by the controls. The host owns it and decides when it runs. */
export interface RecallFormState {
  query: string;
  topK: number;
  minScore: number;
  filter: string;
  tags: string;
  type: string;
  maxPerType: number;
  includeFreshWrites: boolean;
  includeContent: boolean;
  includeDiagnostics: boolean;
  traverse: number;
  maxTimeMS: number;
  maxBytes: number;
}

/** One row of the per-type restriction: ticked or not, with an optional guaranteed minimum. */
export interface RecallTypeOpt {
  type: RecallKnowledgeType;
  on: boolean;
  min: number | null;
}

/**
 * The semantic-search form, as its own component and laid out across the width.
 *
 * ## Why it left the tab
 *
 * `U-1` is owner-directed and adds eleven more parameters to this form: *"one input field for EACH AND EVERY
 * available option a recall has… FULL CAPABILITIES."* `query-tab.component.ts` was 652 lines with the form
 * and the results in one template, so that is a split rather than an insertion — and the split comes first,
 * because the layout is what makes room for the controls and doing them the other way round means laying
 * them out twice.
 *
 * The characterization net for it is `query-tab.characterization.spec.ts`: 19 cases over the request the
 * host builds, every one mutation-tested. **Not one of its assertions is edited by this change** — the
 * request-building logic did not move, only the controls that feed it.
 *
 * ## The disclosure is GONE, not replaced
 *
 * Six of these parameters lived behind a "Show advanced" button, which is the arrangement the owner's
 * instruction rules out: a field an operator cannot see is a capability they do not know they have. The
 * answer is not a second disclosure but GROUPS — and the row this came from says exactly that.
 *
 * ## Grouped by what a parameter DOES
 *
 * Owner, 2026-08-30: *"uniform fields, use width and not every item below each other."* Four groups, because
 * four is what the parameters actually divide into:
 *
 * - **the question** — what to look for, and which records are eligible at all;
 * - **ranking** — how many come back and how good they have to be;
 * - **the graph** — how far to walk from a hit;
 * - **the answer** — the size and time ceilings, and what the envelope carries.
 *
 * They sit in a grid that reflows by available width rather than in one stacked column, so the whole form is
 * visible at once on a normal screen. The question spans the full width because it is the only field that is
 * always used, and `traverse` sits next to nothing else on purpose: `U-1`'s next change turns it into six
 * controls, and this is the space they go in.
 *
 * NOTE: no backticks anywhere in this template, including comments. One ends the template string and the
 * error then points at @Component rather than at the line.
 */
@Component({
  selector: 'app-recall-form',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, PhIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    /* One grid for every group, reflowing by width rather than by a breakpoint: the panel is rendered inside
       a tab that is itself sometimes beside a detail pane, so a media query would be measuring the wrong box. */
    .rf-groups { display:grid; grid-template-columns:repeat(auto-fit, minmax(230px, 1fr)); gap:12px; align-items:start; }
    /* The three lower groups are a FLEX row, not grid tracks, and that is the difference between using the
       width and merely wrapping in it: auto-fit cuts the container into as many 230px tracks as fit - five
       at 1216px — so three groups sat in three of them and 40% of the row was empty. Measured, not guessed:
       the boxes came back at x=252/498/743 with the row ending at 1468. A flex basis of 230px makes the three
       share whatever there is and wrap only when 230 stops fitting. */
    .rf-row { display:flex; flex-wrap:wrap; gap:12px; align-items:stretch; margin-top:12px; }
    .rf-row > .rf-group { flex:1 1 230px; min-width:0; }
    .rf-wide { grid-column:1 / -1; }
    .rf-group { border:1px solid var(--border); border-radius:var(--radius-sm); padding:10px 12px; min-width:0; }
    .rf-legend { font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--text-muted);
      margin-bottom:8px; }
    /* Uniform, which is the half of the instruction a grid alone does not satisfy: every input fills its
       column, so the fields line up down the group instead of each sizing to its own placeholder. */
    .rf-field { margin:0 0 8px; min-width:0; }
    .rf-field:last-child { margin-bottom:0; }
    .rf-field > label { display:block; font-size:11px; color:var(--text-dim); margin-bottom:3px; }
    .rf-field input[type=text], .rf-field input[type=number], .rf-field select, .rf-field textarea { width:100%; }
    .rf-check { display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer; margin:0 0 6px;
      text-transform:none; }
    .rf-check:last-child { margin-bottom:0; }
    .rf-check input { margin:0; }
    .rf-types { display:flex; flex-wrap:wrap; gap:10px; }
    .rf-type { display:inline-flex; align-items:center; gap:4px; font-size:12px; }
    .rf-type input[type=number] { width:52px; }
    .rf-hint { color:var(--text-muted); font-size:11px; display:inline-flex; vertical-align:middle; }
    .rf-actions { display:flex; align-items:center; gap:10px; margin-top:10px; }
  `],
  template: `
<!-- The question. Its own block at full width, because it is the only field that is always used. -->
<div class="rf-group">
    <div class="rf-legend">{{ 'brain.query.group.question' | transloco }}</div>
    <div class="rf-field">
      <label>{{ 'brain.query.search.label' | transloco }}</label>
      <input
        type="text"
        [(ngModel)]="form().query"
        name="recallQuery"
        [placeholder]="'brain.query.search.placeholder' | transloco"
        style="font-size:14px; padding:8px 12px;"
        (keydown.enter)="run.emit()"
        [attr.aria-label]="'brain.query.search.label' | transloco"
      />
    </div>
    <div class="rf-groups">
      <div class="rf-field">
        <label>{{ 'brain.query.tags' | transloco }}</label>
        <input type="text" [(ngModel)]="form().tags" name="recallTags"
          [placeholder]="'brain.query.tags.placeholder' | transloco" />
      </div>
      <div class="rf-field">
        <label>{{ 'brain.query.filterByType' | transloco }}</label>
        <select [(ngModel)]="form().type" name="recallType">
          <option value="">{{ 'brain.query.anyType' | transloco }}</option>
          @for (t of typeNames(); track t) {
            <option [value]="t">{{ t }}</option>
          }
        </select>
      </div>
      <div class="rf-field rf-wide">
        <label>{{ 'brain.query.filter' | transloco }}</label>
        <textarea [(ngModel)]="form().filter" name="recallFilter" rows="2"
          [placeholder]="'brain.query.filter.placeholder' | transloco"
          style="font-family:var(--font-mono, monospace); font-size:12px;"></textarea>
      </div>
    </div>
</div>

<div class="rf-row">
  <!-- Ranking. -->
  <div class="rf-group">
    <div class="rf-legend">{{ 'brain.query.group.ranking' | transloco }}</div>
    <div class="rf-field">
      <label>{{ 'brain.query.topK' | transloco }}
        <span class="rf-hint" [attr.title]="'brain.query.topK.tooltip' | transloco"><ph-icon name="info" [size]="11"/></span>
      </label>
      <input type="number" [(ngModel)]="form().topK" name="recallTopK" min="1" max="100" />
    </div>
    <div class="rf-field">
      <label>{{ 'brain.query.minScore' | transloco }}
        <span class="rf-hint" [attr.title]="'brain.query.minScore.tooltip' | transloco"><ph-icon name="info" [size]="11"/></span>
      </label>
      <input type="number" [(ngModel)]="form().minScore" name="recallMinScore" min="0" max="1" step="0.05" />
    </div>
    <div class="rf-field">
      <label>{{ 'brain.query.maxPerType' | transloco }}
        <span class="rf-hint" [attr.title]="'brain.query.maxPerType.tooltip' | transloco"><ph-icon name="info" [size]="11"/></span>
      </label>
      <input type="number" [(ngModel)]="form().maxPerType" name="recallMaxPerType" min="0" max="100"
        [placeholder]="'brain.query.maxPerType.none' | transloco" />
    </div>
    <div class="rf-field">
      <label>{{ 'brain.query.types' | transloco }}
        <span class="rf-hint" [attr.title]="'brain.query.types.tooltip' | transloco"><ph-icon name="info" [size]="11"/></span>
      </label>
      <div class="rf-types">
        @for (opt of typeOpts(); track opt.type) {
          <span class="rf-type">
            <input type="checkbox" [(ngModel)]="opt.on" [name]="'recallType-' + opt.type" [attr.aria-label]="opt.type" />
            <span>{{ opt.type }}</span>
            <!-- The per-type minimum appears only for a ticked type: a floor on a type you are not asking
                 for is a number with no effect, and it is also what the request builder ignores. -->
            @if (opt.on) {
              <input type="number" [(ngModel)]="opt.min" [name]="'recallMin-' + opt.type" min="0"
                [max]="form().topK" [placeholder]="'brain.query.minPerType.placeholder' | transloco"
                [attr.title]="'brain.query.minPerType.tooltip' | transloco" />
            }
          </span>
        }
      </div>
    </div>
  </div>

  <!-- The graph. One control today; U-1's next change makes it six, and this is where they go. -->
  <div class="rf-group">
    <div class="rf-legend">{{ 'brain.query.group.graph' | transloco }}</div>
    <div class="rf-field">
      <label>{{ 'brain.query.traverse' | transloco }}
        <span class="rf-hint" [attr.title]="'brain.query.traverse.tooltip' | transloco"><ph-icon name="info" [size]="11"/></span>
      </label>
      <input type="number" [(ngModel)]="form().traverse" name="recallTraverse" min="0" max="5"
        [placeholder]="'brain.query.traverse.none' | transloco" />
    </div>
  </div>

  <!-- The answer: the two ceilings, and what the envelope carries. -->
  <div class="rf-group">
    <div class="rf-legend">{{ 'brain.query.group.answer' | transloco }}</div>
    <div class="rf-field">
      <!-- ONE control for the size ceiling, not two. maxTokens is a convenience onto the same number and the
           server applies whichever is smaller, so offering both would let an operator set two limits and then
           have to work out which one won. -->
      <label>{{ 'brain.query.recallMaxBytes' | transloco }}
        <span class="rf-hint" [attr.title]="'brain.query.recallMaxBytes.tooltip' | transloco"><ph-icon name="info" [size]="11"/></span>
      </label>
      <input type="number" [(ngModel)]="form().maxBytes" name="recallMaxBytes" min="0" max="5000000" step="1000"
        [placeholder]="'brain.query.recallMaxBytes.default' | transloco" />
    </div>
    <div class="rf-field">
      <label>{{ 'brain.query.maxTimeMs' | transloco }}
        <span class="rf-hint" [attr.title]="'brain.query.recallMaxTimeMs.tooltip' | transloco"><ph-icon name="info" [size]="11"/></span>
      </label>
      <input type="number" [(ngModel)]="form().maxTimeMS" name="recallMaxTimeMS" min="0" max="30000"
        [placeholder]="'brain.query.recallMaxTimeMs.none' | transloco" />
    </div>
    <label class="rf-check">
      <input type="checkbox" [(ngModel)]="form().includeContent" name="recallIncludeContent" />
      <span>{{ 'brain.query.includeContent' | transloco }}</span>
      <span class="rf-hint" [attr.title]="'brain.query.includeContent.tooltip' | transloco"><ph-icon name="info" [size]="11"/></span>
    </label>
    <label class="rf-check">
      <input type="checkbox" [(ngModel)]="form().includeDiagnostics" name="recallIncludeDiagnostics" />
      <span>{{ 'brain.query.includeDiagnostics' | transloco }}</span>
      <span class="rf-hint" [attr.title]="'brain.query.includeDiagnostics.tooltip' | transloco"><ph-icon name="info" [size]="11"/></span>
    </label>
    <label class="rf-check">
      <input type="checkbox" [(ngModel)]="form().includeFreshWrites" name="recallFresh" />
      <span>{{ 'brain.query.includeFreshWrites' | transloco }}</span>
      <span class="rf-hint" [attr.title]="'brain.query.includeFreshWrites.tooltip' | transloco"><ph-icon name="info" [size]="11"/></span>
    </label>
  </div>
</div>

<div class="rf-actions">
  <button class="btn btn-sm btn-primary" [disabled]="running() || !form().query.trim()" (click)="run.emit()">
    @if (running()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> }
    {{ 'brain.query.searchButton' | transloco }}
  </button>
  @if (hasResults()) {
    <button class="btn btn-sm btn-secondary" (click)="clear.emit()">{{ 'brain.query.clearResults' | transloco }}</button>
  }
  @if (error()) {
    <span style="font-size:12px; color:var(--error);">{{ error() }}</span>
  }
</div>
`,
})
export class RecallFormComponent {
  /** The form state, mutated IN PLACE. The host owns it, builds the request from it, and decides when. */
  readonly form = input.required<RecallFormState>();
  /** The per-type rows, also mutated in place — one array, two derivations in the host's request builder. */
  readonly typeOpts = input.required<RecallTypeOpt[]>();
  /** Type names for the restrict-to-type shortcut. Resolved by the host, which is what knows the space. */
  readonly typeNames = input<string[]>([]);
  readonly running = input(false);
  readonly error = input('');
  /** Whether there is anything to clear — the button is pointless otherwise. */
  readonly hasResults = input(false);

  /**
   * Asked for, not done. Both of these belong to the host for the reason the tree store's docblock gives:
   * a form that decided when a search happens would be deciding what the panel is for.
   */
  readonly run = output<void>();
  readonly clear = output<void>();
}
