/**
 * The tokens page CSS, lifted out of the component.
 *
 * Not a tidy-up: `tokens.component.ts` is on the god-file ratchet, and adding the own-rights panel pushed it
 * past its frozen line count. The rule for that is to pay the growth with an extraction rather than raise the
 * ceiling, and two hundred lines of CSS in a file whose job is behaviour is the honest thing to move. Same
 * pattern as `dialog.styles.ts` and `space-dialog.styles.ts` beside it.
 */
export const TOKENS_PAGE_STYLES = `
    .new-token-banner {
      background: var(--success-dim);
      border: 2px solid color-mix(in srgb, var(--success) 50%, transparent);
      border-radius: var(--radius-md);
      padding: 20px;
      margin-bottom: 20px;
    }
    .new-token-banner-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--success);
      margin-bottom: 4px;
    }
    .new-token-banner-warn {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }
    .token-copy-row {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
    }
    .token-copy-value {
      flex: 1;
      font-family: var(--font-mono);
      font-size: 13px;
      word-break: break-all;
      color: var(--text-primary);
    }
    .btn-copy-prominent {
      background: var(--success);
      color: var(--text-on-accent);
      border: none;
      border-radius: var(--radius-sm);
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: opacity var(--transition);
    }
    .btn-copy-prominent:hover { opacity: 0.88; }
    .scope-hint {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 3px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 160px;
      gap: 12px;
      align-items: start;
    }
    .form-grid-bottom {
      display: flex;
      gap: 12px;
      align-items: flex-end;
      flex-wrap: wrap;
      margin-top: 4px;
    }
    .checkbox-field {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-bottom: 6px;
    }
    .checkbox-field label {
      margin: 0;
      font-size: 13px;
      color: var(--text-secondary);
      text-transform: none;
      letter-spacing: 0;
      font-weight: 400;
    }
    .spaces-toggle-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }
    .space-toggle-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 12px;
      background: var(--bg-surface);
      transition: background var(--transition), border-color var(--transition);
      user-select: none;
    }
    .space-toggle-item:hover { background: var(--bg-elevated); }
    .space-toggle-item input[type=checkbox] { width: 13px; height: 13px; margin: 0; flex-shrink: 0; }
    .space-toggle-item .space-id { color: var(--text-muted); font-size: 11px; font-family: var(--font-mono); }
    .permission-radio-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 6px;
    }
    .permission-radio-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      background: var(--bg-surface);
      transition: background var(--transition), border-color var(--transition);
      user-select: none;
    }
    .permission-radio-item:hover { background: var(--bg-elevated); }
    .permission-radio-item input[type=radio] { width: 14px; height: 14px; margin: 0; flex-shrink: 0; }
    .permission-help {
      display: flex; align-items: flex-start; gap: 7px; margin: 8px 0 0;
      font-size: 12px; line-height: 1.45; color: var(--text-secondary);
    }
    .permission-help ph-icon { color: var(--text-muted); flex-shrink: 0; margin-top: 1px; }
    .capability-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 10px;
      color: var(--text-secondary);
    }
    .capability-table th {
      text-align: center;
      font-weight: 600;
      padding: 4px 6px;
      border-bottom: 1px solid var(--border-muted);
      white-space: nowrap;
    }
    .capability-table th:first-child { text-align: left; }
    .capability-table td {
      text-align: center;
      padding: 4px 6px;
      border-bottom: 1px solid var(--border-muted);
    }
    .capability-table td:first-child { text-align: left; font-weight: 500; color: var(--text-primary); }
    .capability-table tr.active-row { background: var(--bg-elevated); }
    .cap-yes { color: var(--success); }
    .cap-no  { color: var(--text-muted); }
    .token-status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 5px;
      flex-shrink: 0;
    }
    .dot-active { background: var(--success); }
    .dot-expired { background: var(--error); }
    .styled-input {
      padding: 5px 8px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 13px;
      background: var(--bg-surface);
      color: var(--text-primary);
      font-family: var(--font);
    }
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: var(--bg-scrim);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .dialog {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 24px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
`;
