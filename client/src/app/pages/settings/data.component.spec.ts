/**
 * DataComponent — CHARACTERIZATION tests.
 *
 * The Settings → Data page (backups, schedule, destination, maintenance, DB migration) is 775 lines and
 * shipped with NO coverage. It is next in line for the PR-U11 design-system redesign (SettingsCards,
 * StatusPills, a SummaryStrip, a quarantined Danger Zone, and routing its hardcoded error strings +
 * schedule summary through transloco). Per characterization-tests-before-refactor these are written and
 * proven green against the ORIGINAL code first, so the redesign has a safety net — a test written after
 * the change just proves the new code agrees with itself.
 *
 * They pin what the redesign MUST preserve (the cron round-trip, the config builder, the API call flows
 * and their error fallbacks, the confirm-gating on the two irreversible actions) and also the things the
 * redesign will deliberately CHANGE — `scheduleSummary()`'s hardcoded English and `sourceBadgeClass()`'s
 * badge classes — so those changes show up as explicit diffs against this spec rather than silently.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { DataComponent } from './data.component';
import { AdminApi } from '../../core/admin-api.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';

/** A fully-stubbed AdminApi; each test overrides the methods it exercises. */
function makeAdmin(over: Partial<Record<string, unknown>> = {}) {
  return {
    getDataConfig:       () => of({ source: 'config', mongoUriRedacted: 'mongodb://***@db/ythril', migrationEnabled: false }),
    getMaintenanceStatus:() => of({ active: false }),
    getBackupConfig:     () => of({ config: null, backupsPath: '' }),
    listBackups:         () => of({ backups: [] }),
    triggerBackup:       () => of({ backup: { id: 'b1', dir: '/x', manifest: {} } }),
    restoreBackup:       () => of({ ok: true }),
    saveBackupConfig:    (config: unknown) => of({ ok: true, config }),
    testMongoConnection: () => of({ ok: true }),
    setMaintenance:      (active: boolean) => of({ active }),
    startMigration:      () => of({ ok: true, backupDir: '/x', manifest: {} }),
    ...over,
  } as unknown as AdminApi;
}

function make(admin: AdminApi = makeAdmin(), confirmResult: unknown = true) {
  TestBed.resetTestingModule();
  const confirm = vi.fn().mockResolvedValue(confirmResult);
  TestBed.configureTestingModule({
    imports: [DataComponent, getTranslocoModule()],
    providers: [
      { provide: AdminApi, useValue: admin },
      { provide: ConfirmDialogService, useValue: { confirm } },
    ],
  });
  const fixture = TestBed.createComponent(DataComponent);
  const c = fixture.componentInstance;
  return { c, confirm, fixture };
}

/** Reach a private method/field for characterization without changing visibility. */
const priv = (c: unknown) => c as Record<string, (...a: unknown[]) => unknown> & Record<string, unknown>;

describe('DataComponent — cron build/parse (schedule round-trip)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('buildCron maps each frequency to the expected cron expression', () => {
    const { c } = make();
    const build = (f: string, extra: Record<string, number> = {}) => {
      c.scheduleForm = { ...c.scheduleForm, frequency: f as never, hour: 2, minute: 0, weekday: 1, monthDay: 1, ...extra };
      return priv(c)['buildCron']();
    };
    expect(build('never')).toBeUndefined();
    expect(build('hourly')).toBe('0 * * * *');
    expect(build('daily', { hour: 3, minute: 15 })).toBe('15 3 * * *');
    expect(build('weekly', { hour: 4, minute: 0, weekday: 5 })).toBe('0 4 * * 5');
    expect(build('monthly', { hour: 6, minute: 30, monthDay: 12 })).toBe('30 6 12 * *');
  });

  it('parseCron is the inverse of buildCron and clamps out-of-range fields', () => {
    const { c } = make();
    const parse = (cron: string | undefined) => { priv(c)['parseCron'](cron); return { ...c.scheduleForm }; };
    expect(parse(undefined).frequency).toBe('never');
    expect(parse('nonsense').frequency).toBe('never');            // wrong field count → never
    expect(parse('0 * * * *').frequency).toBe('hourly');
    expect(parse('15 3 * * *')).toMatchObject({ frequency: 'daily', hour: 3, minute: 15 });
    expect(parse('0 4 * * 5')).toMatchObject({ frequency: 'weekly', weekday: 5 });
    expect(parse('30 6 12 * *')).toMatchObject({ frequency: 'monthly', monthDay: 12 });
    // clamping: hour 99 → 23, minute 88 → 59, monthDay 40 → 28, weekday 9 → 6
    expect(parse('88 99 * * *')).toMatchObject({ hour: 23, minute: 59 });
    expect(parse('0 2 40 * *').monthDay).toBe(28);
    expect(parse('0 2 * * 9').weekday).toBe(6);
  });

  it('build→parse→build is stable for a weekly schedule', () => {
    const { c } = make();
    c.scheduleForm = { frequency: 'weekly', hour: 9, minute: 45, weekday: 3, monthDay: 1 };
    const cron = priv(c)['buildCron']() as string;
    priv(c)['parseCron'](cron);
    expect(priv(c)['buildCron']()).toBe(cron);
  });
});

describe('DataComponent — buildConfig assembly', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('assembles schedule + keepLocal retention, and only adds offsite for a custom path', () => {
    const { c } = make();
    c.scheduleForm = { frequency: 'daily', hour: 2, minute: 0, weekday: 1, monthDay: 1 };
    c.destForm = { ythrilInternal: true, customPath: '', keepLocal: 7 };
    expect(priv(c)['buildConfig']()).toEqual({ schedule: '0 2 * * *', retention: { keepLocal: 7 } });

    // custom offsite path → offsite block carries destPath + keepCount
    c.destForm = { ythrilInternal: false, customPath: '  /mnt/backups  ', keepLocal: 3 };
    expect(priv(c)['buildConfig']()).toEqual({
      schedule: '0 2 * * *',
      retention: { keepLocal: 3 },
      offsite: { destPath: '/mnt/backups', retention: { keepCount: 3 } },
    });
  });

  it('omits schedule when never and retention when keepLocal is null/0', () => {
    const { c } = make();
    c.scheduleForm = { frequency: 'never', hour: 2, minute: 0, weekday: 1, monthDay: 1 };
    c.destForm = { ythrilInternal: true, customPath: '', keepLocal: null };
    expect(priv(c)['buildConfig']()).toEqual({});
    c.destForm = { ythrilInternal: true, customPath: '', keepLocal: 0 };
    expect(priv(c)['buildConfig']()).toEqual({});
  });
});

describe('DataComponent — display helpers (redesign will change these)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('scheduleSummary returns the current hardcoded-English phrasing per frequency', () => {
    const { c } = make();
    const sum = (f: string, extra: Record<string, number> = {}) => {
      c.scheduleForm = { ...c.scheduleForm, frequency: f as never, hour: 14, minute: 0, weekday: 1, monthDay: 1, ...extra };
      return c.scheduleSummary();
    };
    expect(sum('never')).toBe('');
    expect(sum('hourly')).toBe('Every hour, on the hour');
    expect(sum('daily')).toBe('Every day at 2:00 PM');
    expect(sum('weekly', { weekday: 1 })).toBe('Every Monday at 2:00 PM');
    expect(sum('monthly', { monthDay: 3 })).toBe('On the 3rd of every month at 2:00 PM');
    expect(sum('monthly', { monthDay: 11 })).toBe('On the 11th of every month at 2:00 PM');
  });

  it('sourceBadgeClass maps the URI source to a badge class', () => {
    const { c } = make();
    c.uriSource.set('env');    expect(c.sourceBadgeClass()).toBe('badge-warning');
    c.uriSource.set('config'); expect(c.sourceBadgeClass()).toBe('badge-info');
    c.uriSource.set('default');expect(c.sourceBadgeClass()).toBe('badge-secondary');
  });

  it('destConfigured / scheduleConfigured reflect the forms', () => {
    const { c } = make();
    c.destForm = { ythrilInternal: true, customPath: '/x', keepLocal: null };
    expect(c.destConfigured()).toBe(false);                         // internal → not "configured" offsite
    c.destForm = { ythrilInternal: false, customPath: '/x', keepLocal: null };
    expect(c.destConfigured()).toBe(true);
    c.scheduleForm = { ...c.scheduleForm, frequency: 'never' };
    expect(c.scheduleConfigured()).toBe(false);
    c.scheduleForm = { ...c.scheduleForm, frequency: 'daily' };
    expect(c.scheduleConfigured()).toBe(true);
  });
});

describe('DataComponent — API flows and error fallbacks', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('takeBackup sets backupTaken on success; falls back to "Backup failed" on error', () => {
    const okc = make().c;
    okc.takeBackup();
    expect(okc.backupTaken()).toBe(true);
    expect(okc.backingUp()).toBe(false);

    const errc = make(makeAdmin({ triggerBackup: () => throwError(() => ({ error: {} })) })).c;
    errc.takeBackup();
    expect(errc.backupError()).toBe('Backup failed');
  });

  it('confirmRestore does NOT call restoreBackup when the confirm is cancelled', async () => {
    const restoreBackup = vi.fn().mockReturnValue(of({ ok: true }));
    const { c } = make(makeAdmin({ restoreBackup }), false); // confirm resolves false
    await c.confirmRestore('bkp-9');
    expect(restoreBackup).not.toHaveBeenCalled();
  });

  it('confirmRestore requires typing the backup id, then restores on confirm', async () => {
    const restoreBackup = vi.fn().mockReturnValue(of({ ok: true }));
    const { c, confirm } = make(makeAdmin({ restoreBackup }), true);
    await c.confirmRestore('bkp-9');
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ danger: true, requireText: 'bkp-9' }));
    expect(restoreBackup).toHaveBeenCalledWith('bkp-9');
    expect(c.restoreSuccess()).toBe(true);
  });

  it('saveSchedule / saveDest post buildConfig() and surface a "Save failed" fallback on error', () => {
    const saveOk = vi.fn().mockReturnValue(of({ ok: true, config: {} }));
    const okc = make(makeAdmin({ saveBackupConfig: saveOk })).c;
    okc.saveSchedule();
    expect(saveOk).toHaveBeenCalledTimes(1);
    expect(okc.scheduleSaveSuccess()).toBe(true);

    const errc = make(makeAdmin({ saveBackupConfig: () => throwError(() => ({ error: {} })) })).c;
    errc.saveDest();
    expect(errc.destSaveError()).toBe('Save failed');
  });

  it('toggleMaintenance flips the active flag through setMaintenance', () => {
    const setMaintenance = vi.fn().mockImplementation((active: boolean) => of({ active }));
    const { c } = make(makeAdmin({ setMaintenance }));
    c.maintenanceActive.set(false);
    c.toggleMaintenance();
    expect(setMaintenance).toHaveBeenCalledWith(true);
    expect(c.maintenanceActive()).toBe(true);
  });

  it('testMigrateConnection ignores an empty URI and records the result otherwise', () => {
    const testMongoConnection = vi.fn().mockReturnValue(of({ ok: true }));
    const { c } = make(makeAdmin({ testMongoConnection }));
    c.migrateUri = '   ';
    c.testMigrateConnection();
    expect(testMongoConnection).not.toHaveBeenCalled();
    c.migrateUri = 'mongodb://other/db';
    c.testMigrateConnection();
    expect(testMongoConnection).toHaveBeenCalledWith('mongodb://other/db');
    expect(c.testResult()).toEqual({ ok: true });
  });

  it('confirmMigrate maps FEATURE_DISABLED / INFRA_MANAGED / generic errors to distinct messages', async () => {
    const mk = (code?: string) => make(makeAdmin({ startMigration: () => throwError(() => ({ error: { code } })) }), true).c;
    const disabled = mk('FEATURE_DISABLED');
    disabled.migrateUri = 'mongodb://x/y';
    await disabled.confirmMigrate();
    expect(disabled.migrateError()).toContain('YTHRIL_DB_MIGRATION_ENABLED');

    const infra = mk('INFRA_MANAGED');
    infra.migrateUri = 'mongodb://x/y';
    await infra.confirmMigrate();
    expect(infra.migrateError()).toContain('MONGO_URI');

    const generic = mk(undefined);
    generic.migrateUri = 'mongodb://x/y';
    await generic.confirmMigrate();
    expect(generic.migrateError()).toBe('Migration failed');
  });

  it('confirmMigrate does NOT start a migration when the confirm is cancelled', async () => {
    const startMigration = vi.fn().mockReturnValue(of({ ok: true }));
    const { c } = make(makeAdmin({ startMigration }), false);
    c.migrateUri = 'mongodb://x/y';
    await c.confirmMigrate();
    expect(startMigration).not.toHaveBeenCalled();
  });
});
