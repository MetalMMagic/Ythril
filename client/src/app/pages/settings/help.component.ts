/**
 * Settings → Help. The shipped guides, rendered inside the instance.
 *
 * **Why the docs are bundled rather than linked.** The gap this closes is "an operator has to leave the
 * UI to answer *what does this setting do?*", and a link to github.com does not close it — it restates
 * it, and fails hardest exactly where it matters most: an air-gapped or internal-network install has no
 * route out. So `angular.json` copies `docs/*.md` into the client's assets and this page fetches them
 * from the instance itself. No server route, no path parameter, no traversal surface: the document set
 * is a fixed list compiled into the page, and anything not in it is not fetchable.
 *
 * The markdown goes through `MarkdownRenderService` — the same sanitizing pipeline as the Files preview,
 * because the sanitization rules are a security boundary and a second copy is a second place to drift.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { MarkdownRenderService } from '../../shared/markdown-render.service';
import { httpErrorReason } from '../../core/http-error';

/**
 * The guides this page offers, in reading order.
 *
 * A fixed list, not a directory listing: it is what makes the document id un-abusable (nothing here is
 * concatenated from user input), and it lets the order be *pedagogical* rather than alphabetical — a new
 * operator should meet the user guide before the sync protocol. A doc added to `docs/` and not added
 * here simply is not offered, which the coverage test below turns into a failure rather than a silence.
 */
export const HELP_DOCS = [
  { id: 'userguide', file: 'userguide.md' },
  { id: 'integration-guide', file: 'integration-guide.md' },
  { id: 'usecase-examples', file: 'usecase-examples.md' },
  { id: 'workstation-mode-guide', file: 'workstation-mode-guide.md' },
  { id: 'network-types', file: 'network-types.md' },
  { id: 'sync-protocol', file: 'sync-protocol.md' },
  { id: 'dependencies', file: 'dependencies.md' },
  { id: 'contribution-guide', file: 'contribution-guide.md' },
] as const;

export type HelpDocId = typeof HELP_DOCS[number]['id'];

@Component({
  selector: 'app-help',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, PhIconComponent, ErrorStateComponent],
  styles: [`
    :host { display: block; }
    .help { display: grid; grid-template-columns: 1fr; gap: 16px; }
    /* The index becomes a sidebar only when there is room for one; below that it is a scrollable
       chip row above the document, which keeps every guide one tap away on a phone. */
    @media (min-width: 900px) { .help { grid-template-columns: 232px minmax(0, 1fr); align-items: start; } }

    .index { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
    @media (min-width: 900px) {
      .index { flex-direction: column; overflow-x: visible; position: sticky; top: 12px; }
    }
    .index button { font: inherit; font-size: 13px; text-align: left; cursor: pointer; white-space: nowrap;
      padding: 7px 11px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-surface);
      color: var(--text-secondary); transition: border-color var(--transition), color var(--transition); }
    @media (min-width: 900px) { .index button { white-space: normal; } }
    .index button:hover { border-color: var(--accent); color: var(--text-primary); }
    .index button.active { border-color: var(--accent); color: var(--accent); background: var(--bg-elevated); }
    .index button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

    .doc { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px;
      padding: 20px 24px; min-width: 0; }
    /* Long tables and code blocks scroll inside the document rather than widening the page. */
    .doc :is(pre, table) { max-width: 100%; overflow-x: auto; }
    .doc table { display: block; border-collapse: collapse; }
    .doc :is(th, td) { border: 1px solid var(--border-muted); padding: 5px 9px; font-size: 13px; text-align: left; }
    .doc img { max-width: 100%; height: auto; }
    .doc h1 { font-size: 22px; margin-top: 0; }
    .doc h2 { font-size: 18px; margin-top: 28px; }
    .doc h3 { font-size: 15px; margin-top: 22px; }
    .doc :is(p, li) { font-size: 13.5px; line-height: 1.6; }
    .doc code { font-family: var(--font-mono, monospace); font-size: 0.9em; }
    .doc :not(pre) > code { background: var(--bg-elevated); padding: 1px 5px; border-radius: 4px; }
    .doc pre { background: var(--bg-elevated); border: 1px solid var(--border-muted); border-radius: 8px; padding: 12px 14px; }
    .doc blockquote { margin: 14px 0; padding: 2px 14px; border-left: 3px solid var(--accent); color: var(--text-secondary); }
    .doc hr { border: 0; border-top: 1px solid var(--border-muted); margin: 26px 0; }

    .loading { display: flex; align-items: center; gap: 9px; color: var(--text-secondary); font-size: 13px; }
  `],
  template: `
    <div class="help">
      <nav class="index" [attr.aria-label]="'help.indexAria' | transloco">
        @for (d of docs; track d.id) {
          <button type="button" [class.active]="active() === d.id" (click)="open(d.id)"
                  [attr.aria-current]="active() === d.id ? 'page' : null">
            {{ 'help.doc.' + d.id | transloco }}
          </button>
        }
      </nav>

      <section class="doc">
        @if (loading()) {
          <div class="loading"><span class="spinner"></span>{{ 'common.loading' | transloco }}</div>
        } @else if (error(); as e) {
          <!-- A guide that failed to load is not a guide with no content. Say which, and offer a retry. -->
          <app-error-state [message]="'help.loadError' | transloco" [reason]="e" (retry)="reload()" />
        } @else {
          <article [innerHTML]="html()"></article>
          <p class="loading" style="margin-top:22px;">
            <ph-icon name="info" [size]="14"/>{{ 'help.shippedNote' | transloco }}
          </p>
        }
      </section>
    </div>
  `,
})
export class HelpComponent implements OnInit {
  readonly docs = HELP_DOCS;

  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private markdown = inject(MarkdownRenderService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly active = signal<HelpDocId>(HELP_DOCS[0].id);
  readonly loading = signal(true);
  readonly error = signal('');
  private readonly rendered = signal<SafeHtml>('');

  readonly html = computed(() => this.rendered());

  ngOnInit(): void {
    // `?doc=` makes a guide linkable, which is what lets a settings screen point at the paragraph that
    // explains it. An unknown id falls back to the first guide rather than erroring: a stale bookmark
    // should land somewhere useful, not on a failure.
    const requested = this.route.snapshot.queryParamMap.get('doc');
    const known = HELP_DOCS.find(d => d.id === requested);
    this.load(known?.id ?? HELP_DOCS[0].id);
  }

  open(id: HelpDocId): void {
    if (id === this.active() && !this.error()) return;
    // Reflected in the URL so the guide can be linked to and survives a reload.
    void this.router.navigate([], { relativeTo: this.route, queryParams: { doc: id }, replaceUrl: true });
    this.load(id);
  }

  reload(): void { this.load(this.active()); }

  private load(id: HelpDocId): void {
    this.active.set(id);
    this.loading.set(true);
    this.error.set('');
    const file = HELP_DOCS.find(d => d.id === id)!.file;
    this.http.get(`assets/docs/${file}`, { responseType: 'text' }).subscribe({
      next: async text => {
        if (this.active() !== id) return;              // a faster click won the race
        const html = await this.markdown.render(text);
        if (this.active() !== id) return;
        this.rendered.set(this.sanitizer.bypassSecurityTrustHtml(html));
        this.loading.set(false);
      },
      // Bundled assets do not normally 404 — if one does, the build dropped it, and saying so beats
      // rendering an empty page that looks like a guide with nothing in it.
      error: e => {
        if (this.active() !== id) return;
        this.error.set(httpErrorReason(e));
        this.loading.set(false);
      },
    });
  }
}
