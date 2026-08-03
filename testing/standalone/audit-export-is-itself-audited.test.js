/**
 * Taking a copy of the entire audit log is the one read of it that must be recorded.
 *
 * ## Why the export exists
 *
 * The paged endpoint caps at 1,000 rows, because a browser table has to stop somewhere. That cap is what made
 * "produce everything you hold about this subject's activity" a paging script rather than a request — the filters
 * (`oidcSubject`, `tokenId`, `ip`) were already there, only the way out was missing.
 *
 * ## The two traps it has to avoid
 *
 * **1. The audit middleware skipped `/api/admin/audit-log` by PREFIX.** That exemption is right for reads: one entry
 * per page of every scroll would bury the record it describes. Applied to an export it means the single most
 * sensitive read of the audit log — the one somebody covering their tracks performs first — is the one read that
 * leaves no trace. A prefix skip also silently swallows any future sub-route added under that path.
 *
 * **2. `read: true` would have hidden it behind `logReads`,** which is off by default. An export that is only
 * recorded on instances that opted into logging reads is not recorded.
 *
 * ## What this gate cannot do
 *
 * It cannot prove an entry lands in Mongo — that is an integration concern. It pins the four decisions that make the
 * entry possible: the route is MFA-gated, the skip is exact, the rule exists, and the rule is not a read.
 *
 * Run: node --test testing/standalone/audit-export-is-itself-audited.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const ROUTE = read('server/src/api/audit.ts');
const MIDDLEWARE = read('server/src/audit/middleware.ts');
const AUDIT = read('server/src/audit/audit.ts');

/** The handler body for a route, sliced from its registration to the closing `});`. */
function handler(src, path) {
  const at = src.indexOf(`auditRouter.get('${path}'`);
  assert.ok(at > 0, `no route registered for '${path}'`);
  const end = src.indexOf('\n});', at);
  assert.ok(end > at, `could not find the end of the '${path}' handler`);
  return src.slice(at, end);
}

describe('the export is gated like a backup, not like a list', () => {
  it('found the routes — the parse still matches', () => {
    // Guards every assertion below against passing by examining nothing.
    assert.ok(handler(ROUTE, '/').length > 50, 'the paged route vanished');
    assert.ok(handler(ROUTE, '/export').length > 200, 'the export route vanished');
  });

  it('requires the second factor', () => {
    const reg = ROUTE.slice(ROUteAt(), ROUteAt() + 200);
    assert.match(reg, /requireAdminMfa/,
      'the export must require MFA: paging through the log and taking a copy of the whole record are different acts, '
      + 'and the second belongs behind the same gate as a database backup');
    function ROUteAt() { return ROUTE.indexOf("auditRouter.get('/export'"); }
  });

  it('the paged route is NOT gated behind MFA — this must stay usable for ordinary review', () => {
    // Stated so the previous assertion cannot be "satisfied" by putting MFA on everything, which would make the
    // audit page unusable and push operators towards turning MFA off.
    const reg = ROUTE.slice(ROUTE.indexOf("auditRouter.get('/',"), ROUTE.indexOf("auditRouter.get('/',") + 120);
    assert.match(reg, /requireAdmin\b/, 'the paged route should stay admin-gated');
    assert.doesNotMatch(reg, /requireAdminMfa/, 'reading a page of the log should not demand a TOTP code every time');
  });
});

describe('the export is itself audited', () => {
  it('the middleware skip is an EXACT match, not a prefix', () => {
    const at = MIDDLEWARE.indexOf('/api/admin/audit-log');
    assert.ok(at > 0, 'the audit-log skip is gone entirely — reads would now write to the log on every scroll');
    const line = MIDDLEWARE.slice(MIDDLEWARE.lastIndexOf('\n', at) + 1, MIDDLEWARE.indexOf('\n', at));
    assert.doesNotMatch(line, /startsWith\(/,
      'a prefix skip swallows the export — and any future sub-route — so the most sensitive read of the audit log '
      + 'would be the one read it never records');
    assert.match(line, /===/, 'the skip must compare the paged path exactly');
  });

  it('there is an audit.export operation rule', () => {
    assert.match(MIDDLEWARE, /operation:\s*'audit\.export'/,
      'without a rule the middleware resolves no operation and drops the entry silently');
  });

  it('the rule is NOT marked read: true', () => {
    // `logReads` is off by default. An export recorded only when an operator opted into logging reads is not
    // recorded — and this is the entry that matters most.
    const at = MIDDLEWARE.indexOf("operation: 'audit.export'");
    const rule = MIDDLEWARE.slice(MIDDLEWARE.lastIndexOf('{', at), MIDDLEWARE.indexOf('}', at) + 1);
    assert.doesNotMatch(rule, /read:\s*true/,
      'marking the export as a read hides it behind logReads, which is off by default');
  });
});

describe('the stream itself', () => {
  const body = handler(ROUTE, '/export');

  it('is NDJSON with no row cap', () => {
    assert.match(body, /application\/x-ndjson/, 'the response must declare NDJSON');
    assert.match(body, /delete params\.limit/, 'limit must be dropped — it would look like it narrowed the file');
    assert.match(body, /delete params\.offset/, 'offset must be dropped for the same reason');
    assert.match(AUDIT, /export function streamAuditEntries/, 'the cursor helper is gone');
    const stream = AUDIT.slice(AUDIT.indexOf('export function streamAuditEntries'), AUDIT.indexOf('export async function queryAuditLog'));
    assert.doesNotMatch(stream, /\.limit\(/,
      'the export cursor must not impose a limit — that ceiling is what made this a paging script');
  });

  it('shares its filter with the paged query', () => {
    // An export that interpreted `operation=a,b` differently from the screen the operator built the filter on
    // would be worse than no export, because the difference is invisible in the result.
    assert.match(AUDIT, /export function buildAuditFilter/, 'the shared filter builder is gone');
    const paged = AUDIT.slice(AUDIT.indexOf('export async function queryAuditLog'));
    assert.match(paged, /buildAuditFilter\(params\)/, 'the paged query must use the shared builder');
    const stream = AUDIT.slice(AUDIT.indexOf('export function streamAuditEntries'), AUDIT.indexOf('export async function queryAuditLog'));
    assert.match(stream, /buildAuditFilter\(params\)/, 'the export must use the shared builder');
  });

  it('respects backpressure', () => {
    assert.match(body, /res\.write\(chunk\)\s*\?/,
      'a slow client must pause the cursor walk, or the response buffer grows without bound');
    assert.match(body, /once\('drain'/, 'the write helper must wait for drain');
  });

  it('DESTROYS the connection on a mid-stream failure instead of ending it cleanly', () => {
    // The status and the first bytes are already sent by then. Ending gracefully would hand the operator a
    // well-formed file that is silently missing entries — for an audit record, the worst possible failure, because
    // it looks complete.
    assert.match(body, /res\.destroy\(/,
      'a truncated audit export must be visibly truncated, never a clean end to a partial file');
  });

  it('sorts oldest first, so the file reads like a log', () => {
    const stream = AUDIT.slice(AUDIT.indexOf('export function streamAuditEntries'), AUDIT.indexOf('export async function queryAuditLog'));
    assert.match(stream, /timestamp:\s*1/, 'the export must be ascending — appending a later export must stay in order');
    const paged = AUDIT.slice(AUDIT.indexOf('export async function queryAuditLog'));
    assert.match(paged, /timestamp:\s*-1/, 'the page must stay newest-first — a screen wants the recent thing on top');
  });
});

describe('the UI does not claim to export more than it does', () => {
  it('the page-scoped buttons say so', () => {
    // They exported `entries()` — one page, up to 100 rows out of thousands — while saying only "Export JSON".
    // An operator asked for someone's activity record could hand over a truncated file believing it complete.
    const en = JSON.parse(read('client/public/assets/i18n/en.json'));
    for (const k of ['auditLog.exportJson', 'auditLog.exportCsv']) {
      assert.match(en[k], /page/i, `${k} exports only the current page and must say so: "${en[k]}"`);
    }
    assert.match(en['auditLog.exportAll'], /all/i, 'the full export must be distinguishable from the page export');
  });

  it('every locale has the new strings', () => {
    // A missing key renders as the raw key in the UI, which looks like a bug rather than a translation gap.
    const keys = ['auditLog.exportAll', 'auditLog.exportAllBusy', 'auditLog.exportAllTitle', 'auditLog.exportAllFailed'];
    for (const lang of ['en', 'de', 'pl']) {
      const t = JSON.parse(read(`client/public/assets/i18n/${lang}.json`));
      for (const k of keys) {
        assert.ok(typeof t[k] === 'string' && t[k].length > 0, `${lang}.json is missing ${k}`);
      }
    }
  });

  it('the full export goes through HttpClient so the MFA interceptor can prompt', () => {
    // An `<a download>` or `window.open` bypasses Angular's HTTP stack, so `mfaInterceptor` cannot prompt-and-retry
    // and the button would simply 403 on any instance with MFA enabled.
    const svc = read('client/src/app/core/admin-api.service.ts');
    const at = svc.indexOf('exportAuditLog(');
    assert.ok(at > 0, 'exportAuditLog is gone');
    const fn = svc.slice(at, svc.indexOf('\n  }', at));
    assert.match(fn, /this\.http\.get\(/, 'the export must be fetched through HttpClient, not a plain link');
    assert.match(fn, /responseType:\s*'blob'/, 'NDJSON must not be parsed as JSON');
  });
});

describe('it is documented', () => {
  it('the audit-log guide covers the export, the MFA gate, and that it is audited', () => {
    const doc = read('docs/integration-guide/13-audit-log-api.md');
    const at = doc.indexOf('### Export the whole record');
    assert.ok(at > 0, 'the export section is gone');
    const section = doc.slice(at, doc.indexOf('\n### ', at + 10));
    assert.match(section, /NDJSON/, 'the format must be named');
    assert.match(section, /second factor|MFA/i, 'the MFA requirement must be stated');
    assert.match(section, /audited|`audit\.export`/, 'it must say the export is itself recorded');
    // Both halves, because either alone can survive a rewrite that removes the warning: the word "truncated"
    // appears in ordinary prose about the endpoint, and "destroys the connection" without the consequence does not
    // tell an operator what to DO. Caught by mutating the paragraph away and watching this pass on the leftovers.
    assert.match(section, /destroys the connection/i,
      'it must state the mechanism — a partial export is deliberately made a broken transfer');
    assert.match(section, /truncated transfer as a failed export/i,
      'it must say what to do: treat a truncated transfer as a failure, never as a short result');
    assert.match(doc, /`audit\.export`/, 'the tracked-operations table must list it');
  });
});
