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
