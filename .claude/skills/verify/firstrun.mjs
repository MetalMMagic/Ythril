/**
 * D-12's proof: a genuine first run completed through the SPA's own /setup page.
 *
 * The legacy mount used to intercept /setup with a server-rendered form, so the Angular route had never
 * served one. This must be run against a RESET instance — config deleted, scratch DB dropped — or the
 * server answers `configured: true` and the page redirects away.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const DIR = 'C:/Users/Menne/AppData/Local/Temp/claude/o--Projects-Ythril/c196d4b7-bba0-4847-a326-fb95254ac3bd/scratchpad/verify';
const BASE = 'http://localhost:3260';

const status = await (await fetch(`${BASE}/api/setup/status`)).json();
console.log('setup status before:', JSON.stringify(status));
if (status.configured) { console.log('NOT A FIRST RUN — reset and retry'); process.exit(1); }

// The removed mount would have answered this with HTML. Anything but the SPA shell means it is still there.
const raw = await fetch(`${BASE}/setup`);
const body = await raw.text();
console.log('GET /setup ->', raw.status, raw.headers.get('content-type'));
console.log('served by the SPA shell:', body.includes('<app-root') || body.includes('app-root'));
console.log('still the legacy form:', /name="label"|id="submitBtn"/.test(body) && !body.includes('app-root'));

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

await page.goto(`${BASE}/setup`);
await page.waitForTimeout(3000);
await page.screenshot({ path: `${DIR}/fr-01-setup.png` });
console.log('at:', page.url());

// Angular renders a label field; the legacy form used id="label" too, so identify by the SPA being present.
const isSpa = await page.evaluate(() => !!document.querySelector('app-root'));
console.log('app-root present:', isSpa);

const field = page.locator('input#label, input[formcontrolname="label"], input[name="label"]').first();
if (!(await field.count())) { console.log('NO LABEL FIELD'); await browser.close(); process.exit(1); }
await field.fill('first-run-through-the-spa');

// The SPA page asks for MORE than the legacy form did: a settings password and its confirmation, and the
// submit button stays disabled until both are filled. The legacy form was label-only. That difference is the
// whole reason this proof exists — the two pages are not the same flow.
const pw = page.locator('input[type=password]');
const pwCount = await pw.count();
console.log('password fields on the SPA page:', pwCount, '(legacy form had 0)');
for (let i = 0; i < pwCount; i++) await pw.nth(i).fill('a-long-enough-password');

const submit = page.locator('button[type=submit], #submitBtn').first();
console.log('submit enabled after filling:', await submit.isEnabled());
await submit.click({ timeout: 20000 });
// The first boot creates the default space and starts an index build, so "Setting up…" runs for a while.
// A 5s wait screenshotted the spinner and reported NO TOKEN — which would have been a false alarm about the
// one thing that matters here: whether the operator ever receives a token they can sign in with.
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(5000);
  const t = await page.textContent('body');
  if (/ythril_[A-Za-z0-9_-]+/.test(t ?? '')) { console.log(`token appeared after ~${(i + 1) * 5}s`); break; }
  if (i === 11) console.log('no token after 60s');
}
await page.screenshot({ path: `${DIR}/fr-02-done.png` });

const text = await page.textContent('body');
const m = /ythril_[A-Za-z0-9_-]+/.exec(text ?? '');
if (m) { writeFileSync(`${DIR}/token.txt`, m[0]); console.log('TOKEN ISSUED, written to token.txt'); }
else console.log('NO TOKEN IN PAGE TEXT');

const after = await (await fetch(`${BASE}/api/setup/status`)).json();
console.log('setup status after:', JSON.stringify(after));
console.log('console errors:', errs.length ? errs.slice(0, 4) : 'none');
await browser.close();
