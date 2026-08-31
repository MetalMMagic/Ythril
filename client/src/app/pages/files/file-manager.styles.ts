/**
 * Styles for the pieces extracted out of `file-manager.component.ts` (G-3).
 *
 * They had to travel with their markup rather than stay on the page. Angular scopes a component's styles to
 * its own template, so a rule the page declares cannot reach an element a child renders — and the failure is
 * silent: no error, no warning, just an unstyled control that still works. This repo has been bitten twice by
 * exactly that, which is why `shared-styles-reach-their-renderers` exists.
 *
 * **Two rules changed shape on the way, and that is the load-bearing part.** `.preview-body img` and
 * `.preview-body iframe` were written against the page's wrapper, which is now the PARENT of the component
 * that renders the image. Left qualified they would have matched nothing at all: an image with no width cap
 * and a PDF frame with no height, on a page that still looked fine until you opened one.
 */
export const FILE_PREVIEW_STYLES = `
  .md-rendered { line-height: 1.6; word-break: break-word; }
  .md-rendered ::ng-deep h1, .md-rendered ::ng-deep h2, .md-rendered ::ng-deep h3 { margin: 0.8em 0 0.4em; line-height: 1.25; }
  .md-rendered ::ng-deep h1 { font-size: 1.5em; } .md-rendered ::ng-deep h2 { font-size: 1.3em; } .md-rendered ::ng-deep h3 { font-size: 1.12em; }
  .md-rendered ::ng-deep p { margin: 0.5em 0; }
  .md-rendered ::ng-deep ul, .md-rendered ::ng-deep ol { margin: 0.5em 0; padding-left: 1.5em; }
  .md-rendered ::ng-deep code { background: var(--bg-muted); padding: 0.1em 0.35em; border-radius: 4px; font-family: var(--font-mono, monospace); font-size: 0.9em; }
  .md-rendered ::ng-deep pre { background: var(--bg-muted); padding: 12px; border-radius: 6px; overflow: auto; margin: 0.6em 0; }
  .md-rendered ::ng-deep pre code { background: none; padding: 0; }
  .md-rendered ::ng-deep a { color: var(--accent, #6ea8fe); }
  .md-rendered ::ng-deep blockquote { margin: 0.5em 0; padding-left: 12px; border-left: 3px solid var(--border); color: var(--text-muted); }
  .md-rendered ::ng-deep table { border-collapse: collapse; margin: 0.5em 0; }
  .md-rendered ::ng-deep th, .md-rendered ::ng-deep td { border: 1px solid var(--border); padding: 4px 8px; }
  .md-rendered ::ng-deep img { max-width: 100%; }

  /* xlsx grid preview */
  .xlsx-note { font-size: 0.8em; color: var(--text-muted); margin-bottom: 8px; }
  .xlsx-wrap { overflow: auto; max-width: 100%; }
  .xlsx-grid { border-collapse: collapse; font-size: 0.82em; font-variant-numeric: tabular-nums; }
  .xlsx-grid th, .xlsx-grid td { border: 1px solid var(--border); padding: 3px 8px; text-align: left; white-space: nowrap; max-width: 320px; overflow: hidden; text-overflow: ellipsis; }
  .xlsx-grid th { background: var(--bg-muted); font-weight: 600; position: sticky; top: 0; }
  .xlsx-grid tbody tr:nth-child(even) { background: color-mix(in srgb, var(--bg-muted) 40%, transparent); }

  img {
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
  }
  iframe {
    width: 100%;
    height: 100%;
    border: none;
  }

  .preview-code {
    background: var(--bg-muted);
    border-radius: 6px;
    padding: 16px;
    overflow: auto;
    font-family: var(--font-mono, monospace);
    font-size: 0.85em;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .preview-code code { background: none; }
  .preview-meta { display: grid; grid-template-columns: 100px 1fr; gap: 6px 12px; }
  .preview-meta dt { color: var(--text-muted); font-weight: 500; }
  .preview-meta dd { margin: 0; }
`;

/**
 * The upload panel's rules, moved with its markup (G-3).
 *
 * `.upload-panel` became `:host`, for the reason the graph extraction records: the host is the element the
 * page lays out, and a wrapper inside it would leave the host unsized.
 *
 * `.upload-zone` did NOT come along. It is the drop target on the page — the area you drag a file onto — and
 * it exists whether or not anything is queued, so it belongs to the page rather than to the panel that
 * appears once an upload starts.
 */
export const UPLOAD_QUEUE_STYLES = `
  :host {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    margin-bottom: 16px;
    overflow: hidden;
  }
  .upload-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
  }
  .upload-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
  }
  .upload-row + .upload-row { border-top: 1px solid var(--border); }
  .upload-row-icon { flex-shrink: 0; color: var(--text-secondary); }
  .upload-row.done .upload-row-icon { color: var(--success); }
  .upload-row.failed .upload-row-icon { color: var(--error); }
  .upload-row-body { flex: 1; min-width: 0; }
  .upload-row-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .upload-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }
  .upload-state {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .upload-row.failed .upload-state { color: var(--error); }
  .upload-bar {
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 6px;
  }
  .upload-bar-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.2s;
  }
  .upload-row-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

`;

/**
 * The file-meta form's rules, moved with its markup (G-3).
 *
 * They stay QUALIFIED by `.detail-meta-form` rather than becoming `:host`. The form is one element inside this
 * component and the host is its wrapper in the pane, so the class is doing real work here — unlike the panel
 * and card extractions, where the class WAS the host and leaving it qualified would have matched nothing.
 */
export const FILE_META_EDITOR_STYLES = `
  .detail-meta-form .field { margin-bottom: 12px; }
  .detail-meta-form label { display: block; margin-bottom: 4px; font-size: 0.8em; color: var(--text-muted); }
  .detail-meta-form textarea { width: 100%; resize: vertical; }
  .detail-meta-actions { display: flex; gap: 8px; align-items: center; margin-top: 6px; }
`;
