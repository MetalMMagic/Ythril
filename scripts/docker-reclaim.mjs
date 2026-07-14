#!/usr/bin/env node
/**
 * Reclaim Docker disk space.
 *
 * Why this exists: repeatedly rebuilding the test image (each bakes a ~520 MB embedding
 * model, node_modules and ffmpeg) leaves an orphaned multi-GB image behind every time and
 * grows the BuildKit cache without bound. On one workstation this reached 35 GB of build
 * cache plus 20 GB of orphaned images, filled the drive, and took Docker Desktop down.
 *
 * `npm run test:up:rebuild` now auto-prunes, so day to day you should not need this. Run it
 * when Docker's disk has already ballooned.
 *
 * Two things to understand about Docker Desktop on WSL2:
 *
 *  1. Pruning frees space INSIDE the VM's filesystem. It does NOT shrink the host-side
 *     `docker_data.vhdx` — that is a dynamically-expanding disk which only ever grows, and
 *     stays at its high-water mark forever.
 *  2. To return the space to the host you must TRIM (deallocate the freed blocks) and then
 *     COMPACT the .vhdx. Compaction needs the VM stopped and an elevated shell, so it cannot
 *     be done from here — this script prints the exact commands.
 *
 * (WSL's `--set-sparse` would make the disk auto-shrink, but WSL currently refuses it as
 * "disabled due to potential data corruption" behind an `--allow-unsafe` flag. Not worth it.)
 */

import { execSync } from 'node:child_process';

const run = (cmd, opts = {}) => {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts });
  } catch (err) {
    return err.stdout ?? '';
  }
};

const isWindows = process.platform === 'win32';

console.log('\n── Docker disk usage BEFORE ──────────────────────────────────');
console.log(run('docker system df').trim());

console.log('\n── Reclaiming ────────────────────────────────────────────────');

// Dangling (untagged) images: every `--build` orphans the previous image. Only removes
// images no container references, so a running stack is never disturbed.
console.log('• Removing dangling images…');
run('docker image prune -f');

// BuildKit cache: the biggest offender. Keep a working set so the next build is still warm.
console.log('• Trimming build cache (keeping 5 GB)…');
run('docker builder prune --keep-storage 5g --force');

// Deallocate the freed blocks inside the VM so a later compaction can actually reclaim them.
// Without this, compaction finds nothing to remove.
if (isWindows) {
  console.log('• fstrim inside the Docker VM…');
  const trimmed = run('wsl -d docker-desktop -e sh -c "fstrim -av"').trim();
  if (trimmed) console.log(`  ${trimmed.split('\n').join('\n  ')}`);
}

console.log('\n── Docker disk usage AFTER ───────────────────────────────────');
console.log(run('docker system df').trim());

if (isWindows) {
  // Docker Desktop records the disk location in its settings store — the disk is often
  // NOT under the default path (an operator can relocate it to any drive).
  // The disk is frequently NOT in the default location — Docker Desktop lets you relocate
  // it to another drive, and records that as `CustomWslDistroDir` (or `DataFolder`).
  const vhdx = run(
    'powershell -NoProfile -Command "' +
      '$s = Get-Content \\"$env:APPDATA\\Docker\\settings-store.json\\" -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json; ' +
      '$roots = @($s.CustomWslDistroDir, $s.DataFolder, \\"$env:LOCALAPPDATA\\Docker\\wsl\\") | Where-Object { $_ }; ' +
      'foreach ($r in $roots) { ' +
      '  $hit = Get-ChildItem $r -Recurse -Filter docker_data.vhdx -ErrorAction SilentlyContinue | Select-Object -First 1; ' +
      '  if ($hit) { $hit.FullName; break } }"',
  ).trim();

  console.log(`
── Returning the space to the host drive ─────────────────────────

  Pruning frees space INSIDE the VM; the docker_data.vhdx file itself does not
  shrink. To reclaim it on the host, stop Docker and compact the disk from an
  ELEVATED shell:

    1. Quit Docker Desktop, then:   wsl --shutdown
    2. In an elevated PowerShell / cmd, run diskpart with:

         select vdisk file="<PATH-TO>\\docker_data.vhdx"
         attach vdisk readonly
         compact vdisk
         detach vdisk

    3. Start Docker Desktop again.
${vhdx ? `\n  Detected disk: ${vhdx}` : `\n  Find the disk: it lives under Docker Desktop's "Disk image location"
  (Settings → Resources), named docker_data.vhdx.`}

  (Compaction is safe — it only removes empty space, never images or volumes.)
`);
}
