/**
 * FilemetaTabComponent — file-meta edit/delete/load behaviour, relocated from
 * brain.component.records.spec.ts (A17.9b-6b) when the tab became its own component (A17.9b-6g), plus
 * the self-load / `mutated` / `openInManager` wiring. File-meta is the odd tab: no create, files API,
 * delete by PATH (emits `mutated` — it DOES refresh stats), no semantic search.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import type { FileMeta } from '../../core/api.types';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { FilesApi } from '../../core/files-api.service';
import { ToastService } from '../../core/toast.service';
import { BrainStore } from './brain-store.service';
import { EntityRefPicker } from './entity-ref-picker.service';
import { RecordListState } from './record-list-state.service';
import { FilemetaTabComponent } from './filemeta-tab.component';

const filesApi = {
  listFileMeta: vi.fn(() => of({ files: [] as FileMeta[], limit: 20, skip: 0 })),
  updateFileMeta: vi.fn((_s: string, id: string) => of({ _id: id, description: 'UPDATED' } as FileMeta)),
  deleteFileMeta: vi.fn(() => of(undefined)),
  retryEmbedding: vi.fn(() => of({ queued: true })),
};

function make() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [FilemetaTabComponent, getTranslocoModule()],
    providers: [
      RecordListState, BrainStore, EntityRefPicker,
      { provide: FilesApi, useValue: filesApi },
      { provide: ToastService, useValue: { error: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(FilemetaTabComponent);
  fixture.componentRef.setInput('spaceId', 'work');
  fixture.detectChanges();
  return fixture;
}

beforeEach(() => { for (const fn of Object.values(filesApi)) (fn as any).mockClear(); });

describe('FilemetaTabComponent', () => {
  it('is compiled as OnPush', () => {
    expect(FilemetaTabComponent.ɵcmp?.onPush).toBe(true);
  });

  it('self-loads on the spaceId input (files API, no filters/sort)', () => {
    make();
    expect(filesApi.listFileMeta).toHaveBeenCalledWith('work', 20, 0, {}, undefined);
  });

  // Slice 4a: file-meta list wires the (already server-supported) sort + tag column filter.
  it('sort + tag column filter flow through to the files list endpoint', () => {
    const c = make().componentInstance;
    filesApi.listFileMeta.mockClear();
    c.setTagFilter('code');
    expect(filesApi.listFileMeta).toHaveBeenLastCalledWith('work', 20, 0, { tag: 'code' }, undefined);
    c.setSort('updatedAt'); // first click → desc
    expect(filesApi.listFileMeta).toHaveBeenLastCalledWith('work', 20, 0, { tag: 'code' }, { field: 'updatedAt', dir: 'desc' });
  });

  // Slice 4c-i: the docked Path column freetext filter feeds the server ?search= (debounced).
  it('the Path column freetext filter flows through as filters.search (debounced)', () => {
    const c = make().componentInstance;
    filesApi.listFileMeta.mockClear();
    vi.useFakeTimers();
    c.setSearchFilter('readme');
    vi.advanceTimersByTime(250);
    vi.useRealTimers();
    expect(filesApi.listFileMeta).toHaveBeenLastCalledWith('work', 20, 0, { search: 'readme' }, undefined);
  });

  it('saveEditFileMeta sends description/tags/entityIds/memoryIds/chronoIds and clears editingId', () => {
    const c = make().componentInstance;
    c.store.fileMetas.set([{ _id: 'f1', path: '/a.md', description: 'old' } as FileMeta]);
    c.recordList.editingId.set('f1');
    c.editFileMeta = { description: ' d ', tags: ['t'], entityIds: 'e1, e2', memoryIds: ['m1'], chronoIds: [] };
    c.saveEditFileMeta('f1');
    expect(filesApi.updateFileMeta).toHaveBeenCalledWith('work', 'f1', {
      description: 'd', tags: ['t'], entityIds: ['e1', 'e2'], memoryIds: ['m1'], chronoIds: [],
    });
    expect(c.recordList.editingId()).toBe('');
    expect(c.store.fileMetas()[0].description).toBe('UPDATED');
  });

  it('deleteFileMeta deletes by PATH via the files API, removes the record, and emits mutated', () => {
    const fixture = make();
    const c = fixture.componentInstance;
    const mutated = vi.fn();
    c.mutated.subscribe(mutated);
    c.store.fileMetas.set([{ _id: 'f1', path: '/docs/a.md' } as FileMeta]);
    c.recordList.confirmDeleteId.set('f1');
    c.deleteFileMeta('f1');
    expect(filesApi.deleteFileMeta).toHaveBeenCalledWith('work', '/docs/a.md');
    expect(c.store.fileMetas()).toEqual([]);
    expect(c.recordList.confirmDeleteId()).toBe('');
    expect(mutated).toHaveBeenCalled();
  });

  it('retryFileEmbedding queues via the files API and reloads', () => {
    const c = make().componentInstance;
    filesApi.listFileMeta.mockClear();
    c.retryFileEmbedding({ path: '/a.md' } as FileMeta);
    expect(filesApi.retryEmbedding).toHaveBeenCalledWith('work', '/a.md');
    expect(filesApi.listFileMeta).toHaveBeenCalled(); // reload after done
  });
});
