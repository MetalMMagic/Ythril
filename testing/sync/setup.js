#!/usr/bin/env node
/**
 * Test setup script — run once after `docker compose -f docker-compose.test.yml up`.
 *
 * For each instance:
 *  1. Reads the setup code from Docker logs
 *  2. Completes setup via POST /api/setup/json (returns the first admin token directly)
 *  3. Stores the PAT in configs/<x>/token.txt
 *
 * Pre-requisites:
 *  - All 6 containers are healthy
 *  - configs/a/, configs/b/, configs/c/ directories exist (or will be created)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS_DIR = path.join(__dirname, 'configs');

const INSTANCES = [
  { name: 'a', container: 'ythril-a', url: 'http://localhost:3200', port: 3200 },
  { name: 'b', container: 'ythril-b', url: 'http://localhost:3201', port: 3201 },
  { name: 'c', container: 'ythril-c', url: 'http://localhost:3202', port: 3202 },
];

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForHealth(url, timeout = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const r = await fetch(`${url}/health`);
      if (r.ok) return;
    } catch { /* not ready yet */ }
    await wait(1000);
  }
  throw new Error(`${url} did not become healthy in ${timeout}ms`);
}

async function getSetupCode(container) {
  // The setup code is printed to logs on first run
  const logs = execSync(`docker logs ${container} 2>&1`).toString();
  const match = logs.match(/Setup code[:\s]+([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})/i);
  if (!match) throw new Error(`Could not find setup code in logs for ${container}. Is it a first run?`);
  return match[1];
}

async function setupInstance(inst) {
  console.log(`\nSetting up instance ${inst.name} (${inst.container})...`);

  // Ensure config directory exists
  const configDir = path.join(CONFIGS_DIR, inst.name);
  fs.mkdirSync(configDir, { recursive: true });

  // Wait for the instance to be up
  console.log(`  Waiting for ${inst.url} to be healthy...`);
  await waitForHealth(inst.url);

  // Check if already setup — require non-empty token.txt AND server configured
  const tok = path.join(configDir, 'token.txt');
  if (fs.existsSync(tok)) {
    const existing = fs.readFileSync(tok, 'utf8').trim();
    if (existing.length > 0) {
      // Verify the token is still valid (avoids stale tokens after down -v)
      const check = await fetch(`${inst.url}/api/tokens`, {
        headers: { Authorization: `Bearer ${existing}` },
      });
      if (check.ok) {
        console.log(`  Already set up — skipping (token.txt valid)`);
        return { url: inst.url, token: existing };
      }
      console.log(`  token.txt exists but token is invalid — re-running setup`);
    }
  }

  // Get setup code from container logs
  const code = await getSetupCode(inst.container);
  console.log(`  Setup code: ${code}`);

  // Complete setup via JSON API — returns the first admin token directly
  const setupRes = await fetch(`${inst.url}/api/setup/json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      label: `Test Instance ${inst.name.toUpperCase()}`,
      settingsPassword: 'testpassword123!',
    }),
  });

  if (!setupRes.ok) {
    const body = await setupRes.text();
    throw new Error(`Setup failed for ${inst.name}: ${setupRes.status} ${body}`);
  }

  const { plaintext } = await setupRes.json();
  if (!plaintext) {
    throw new Error(`Setup response for ${inst.name} did not include a token`);
  }

  fs.writeFileSync(tok, plaintext, { mode: 0o600 });
  console.log(`  Setup complete. PAT saved to ${tok}`);
  console.log(`  Token: ${plaintext.slice(0, 20)}...`);

  return { url: inst.url, token: plaintext };
}

async function main() {
  console.log('Ythril test setup');
  console.log('=================');

  const results = [];
  for (const inst of INSTANCES) {
    try {
      const r = await setupInstance(inst);
      results.push({ ...inst, ...r });
    } catch (err) {
      console.error(`  ERROR for instance ${inst.name}: ${err.message}`);
    }
  }

  console.log('\nSetup summary:');
  for (const r of results) {
    const tok = path.join(CONFIGS_DIR, r.name, 'token.txt');
    const exists = fs.existsSync(tok);
    console.log(`  ${r.name}: ${r.url}  token=${exists ? '✓' : '✗ MISSING'}`);
  }

  console.log('\nRun tests with:');
  console.log('  node --test testing/sync/*.test.js');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
