/**
 * Brain-scoped styles shared by the record tabs' list views (memories/entities/edges/chrono/filemeta)
 * — the search/filter header, the create form, the filter chips, the inline delete confirm, and the
 * clamped description cell. Extracted alongside the first tab component (A17.9b-6d); each tab component
 * imports this so its Emulated-encapsulated view keeps the same look. The table/pagination/empty-state/
 * tag styles are GLOBAL (styles.scss), so they are not duplicated here.
 *
 * The shell still carries its own copies inline while the remaining tabs live there; once all five tabs
 * are components the shell's copies become dead and get removed in a final cleanup.
 */
export const BRAIN_RECORD_TABLE_STYLES = `
    .content-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .content-header input[type=search] {
      flex: 1;
      min-width: 180px;
      max-width: 400px;
      padding: 5px 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 13px;
      background: var(--bg-surface);
      color: var(--text-primary);
    }
    .content-header app-entity-search {
      flex: 1;
      min-width: 180px;
      max-width: 520px;
    }
    .list-filter-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 10px;
      background: var(--accent-dim);
      border: 1px solid var(--accent);
      color: var(--accent);
      font-size: 11px;
      font-weight: 500;
    }
    .filter-chip button {
      background: none;
      border: none;
      color: var(--accent);
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      padding: 0 2px;
    }
    .tag-clickable, .entity-clickable {
      cursor: pointer;
      transition: opacity var(--transition);
    }
    .tag-clickable:hover, .entity-clickable:hover { opacity: 0.7; }
    .create-form {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      flex-wrap: wrap;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      margin-bottom: 12px;
    }
    .create-form .field { margin-bottom: 0; }
    .create-form label { font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 2px; }
    .create-form input, .create-form textarea {
      padding: 5px 8px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 13px;
      background: var(--bg-primary);
      color: var(--text-primary);
    }
    .create-form textarea { resize: vertical; }
    .inline-confirm {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--error);
    }
    .inline-confirm button { font-size: 11px; }
    /* The td stays a real table cell so it fills its column; the 3-line clamp lives on an inner box
       (setting display:-webkit-box on the td itself drops it out of table layout). */
    .desc-cell {
      font-size: 12px;
      color: var(--text-muted);
    }
    .desc-cell .desc-clamp {
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .pill-group { display:flex; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; flex-shrink:0; }
    .pill-group button { padding:5px 10px; font-size:11px; background:transparent; border:none; border-right:1px solid var(--border); color:var(--text-secondary); cursor:pointer; white-space:nowrap; }
    .pill-group button:last-child { border-right:none; }
    .pill-group button.active { background:var(--accent-dim); color:var(--accent); }
    .pill-group button:hover:not(.active) { background:var(--bg-surface); }
`;
