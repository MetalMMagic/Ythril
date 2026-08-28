/**
 * Cron scheduling for per-network sync.
 *
 * ## Why it moved out of `engine.ts`
 *
 * `no-new-god-files.test.js` froze `sync/engine.ts` at 966 code lines, and its failure message is the reason
 * this file exists: *"the failure mode of a god-file is not its size on any given day — it is that every change
 * lands in the same place because that is where the code already is. Put the new behaviour beside it rather than
 * inside it."* Adding the already-armed guard there would have been the fifth change to land inside it.
 *
 * Scheduling is a clean seam: it decides WHEN a sync runs, and `engine.ts` decides what a sync DOES. Nothing
 * here reaches into a sync cycle beyond calling it, and `runSyncForNetwork` is the whole interface.
 *
 * The three exports are re-exported from `engine.ts`, so every existing importer — `bootstrap.ts`, `index.ts`,
 * `api/networks/crud.ts`, `schedulers.ts` — keeps working untouched. That is the same courtesy `space-map.ts`
 * got when it was extracted, and it is what makes a move like this reviewable: the diff is a move, not a
 * rewiring.
 */
import { schedule as cronSchedule, type ScheduledTask } from 'node-cron';
import { getConfig } from '../config/loader.js';
import { log } from '../util/log.js';
import { armedSchedules } from '../util/armed-schedule.js';
import { resolveSyncCron } from './schedule.js';
import { runSyncForNetwork } from './engine.js';

const _scheduledTasks = new Map<string, ScheduledTask>();
/** Keyed by network id — see `util/armed-schedule.ts` for why re-arming an unchanged expression is not free. */
const _armed = armedSchedules();

/**
 * Start cron-based sync for every network that has a `syncSchedule`.
 *
 * Called at boot and again from the config-reload path, so it must be safe to call repeatedly — which is what
 * the already-armed guard below is for.
 */
export function startSyncScheduler(): void {
  const cfg = getConfig();
  for (const net of cfg.networks) {
    scheduleSyncForNetwork(net.id, net.syncSchedule);
  }
  log.debug(`Sync scheduler started (${cfg.networks.length} networks)`);
}

/** Stop every scheduled task, and forget what was armed so a later start re-arms rather than skipping. */
export function stopSyncScheduler(): void {
  for (const [id, task] of _scheduledTasks) {
    task.stop();
    log.debug(`Sync scheduler stopped for network ${id}`);
  }
  _scheduledTasks.clear();
  _armed.forget();
}

/**
 * Schedule, reschedule, or leave alone the sync for one network.
 *
 * `schedule` is a cron expression or one of the legacy shorthands — see `resolveSyncCron`. An absent one means
 * manual sync only, and clearing a schedule stops the running task rather than waiting for a restart.
 */
export function scheduleSyncForNetwork(networkId: string, schedule?: string): void {
  const cronExpr = schedule ? resolveSyncCron(schedule) : null;

  /*
   * ALREADY RUNNING ON EXACTLY THIS EXPRESSION — leave it alone.
   *
   * Compared on the RESOLVED expression, because that is what `cronSchedule` was given: a legacy shorthand and
   * its expansion behave identically, and treating them as different would restart a task for no change at all.
   */
  if (cronExpr && _armed.isArmed(networkId, cronExpr) && _scheduledTasks.has(networkId)) return;

  const old = _scheduledTasks.get(networkId);
  if (old) { old.stop(); _scheduledTasks.delete(networkId); _armed.forget(networkId); }

  if (!schedule) return;

  if (!cronExpr) {
    log.warn(`Unrecognised sync schedule '${schedule}' for network ${networkId} — using manual sync only`);
    return;
  }

  const task = cronSchedule(cronExpr, () => {
    runSyncForNetwork(networkId).catch(err =>
      log.error(`Scheduled sync failed for network ${networkId}: ${err}`),
    );
  });

  _scheduledTasks.set(networkId, task);
  _armed.note(networkId, cronExpr);
  log.info(`Sync scheduled for network ${networkId} (cron: "${cronExpr}")`);
}
