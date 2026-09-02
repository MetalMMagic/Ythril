import { Injectable, inject, signal } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { FilesApi } from '../../core/files-api.service';
import { httpErrorReason } from '../../core/http-error';
// The row's shape lives with the panel that RENDERS it, as `FileMetaModel` lives with the editor that binds
// to it. This adds the two fields the queue needs and the panel does not.
import type { UploadItem } from './upload-queue.component';

/** One queued file: the renderer's row, plus where it was dropped. */
type QueuedUpload = UploadItem & { spaceId: string; path: string };

/**
 * The upload queue: one row per file, uploaded one at a time, each cancellable.
 *
 * `G-3.1`, and the cut that takes the page's last `filesApi` request.
 *
 * ## Why a store and not a component
 *
 * **An upload in flight owns a subscription.** A component that owned it would abort on destroy, so
 * navigating away from the tab — or any structural change that remounted the panel — would silently cancel a
 * running upload. The panel is already a component for exactly that reason and deliberately holds no state;
 * this is where the state went. Provided by the PAGE, so an upload outlives every remount inside it and
 * still cannot outlive the page itself.
 *
 * ## The destination is captured when the file is QUEUED
 *
 * Each row remembers the space and path it was dropped on. The page used to read the CURRENT path when a
 * row's turn came, which meant that queueing twenty files and then opening another folder sent the
 * remainder wherever you happened to be standing — with a `done` row claiming success and the file nowhere
 * the person looked for it. The queue is serialised, so the gap between dropping and starting is as long as
 * everything ahead of it.
 *
 * ## What this store deliberately does NOT do
 *
 * **It does not ask about overwriting.** Uploading over an existing path is a REPLACE and it takes the
 * derived records with it — conversion chunks, the converted Markdown, extracted images, and any description
 * generated from them. Asking is the page's, twice over: the set of existing names is the LISTING store's
 * data, and the wording is a translation, which this file holds none of. `enqueue` is called once the answer
 * is yes.
 *
 * **It does not refresh the directory or tell the host.** A completed upload publishes `completed`, and the
 * page does both — the listing is another store's, and the host's record counts are an `@Output`. Same rule
 * as the meta store: what a write means to the rest of the page is not the writer's decision.
 */
@Injectable()
export class FileUploadStore {
  private readonly filesApi = inject(FilesApi);

  /** One row per file, in the order they were queued. Replaced immutably so an OnPush view re-renders. */
  readonly items = signal<QueuedUpload[]>([]);

  /** Subscriptions for rows that are queued or in flight, by id — unsubscribing aborts. */
  private readonly subs = new Map<number, Subscription>();
  private seq = 0;

  /** True while a row is mid-flight. This is what serialises the queue. */
  private processing = false;

  /** An upload finished. The page refreshes the listing and tells its host; both are its business. */
  readonly completed = new Subject<void>();

  /**
   * Queue files for one destination and start the next upload.
   *
   * Called once per batch, after the page has asked about any overwrites — a drop of twenty files where
   * three collide is one question, not three.
   */
  enqueue(spaceId: string, path: string, files: readonly File[]): void {
    const rows: QueuedUpload[] = files.map(file => ({
      id: ++this.seq,
      file,
      name: file.name,
      status: 'queued' as const,
      percent: 0,
      spaceId,
      path,
    }));
    this.items.update(list => [...list, ...rows]);
    this.processNext();
  }

  /** Re-queue a failed row. Its destination is the one it was dropped on, not wherever you are now. */
  retry(item: UploadItem): void {
    if (item.status !== 'failed') return;
    this.patch(item.id, { status: 'queued', percent: 0, error: undefined });
    this.processNext();
  }

  /**
   * Cancel a queued or in-flight row.
   *
   * Unsubscribing tears down the cold upload observable, which aborts the in-flight chunk request. The row
   * is removed rather than marked, and the queue advances only if this row was the one holding it.
   */
  cancel(item: UploadItem): void {
    const wasUploading = item.status === 'uploading';
    this.subs.get(item.id)?.unsubscribe();
    this.subs.delete(item.id);
    this.items.update(list => list.filter(u => u.id !== item.id));
    if (wasUploading) {
      this.processing = false;
      this.processNext();
    }
  }

  /** Remove one finished row from the panel. */
  dismiss(item: UploadItem): void {
    this.items.update(list => list.filter(u => u.id !== item.id));
  }

  hasFinished(): boolean {
    return this.items().some(u => u.status === 'done' || u.status === 'failed');
  }

  /** Clear every finished row, leaving queued and in-flight ones alone. */
  clearFinished(): void {
    this.items.update(list => list.filter(u => u.status === 'queued' || u.status === 'uploading'));
  }

  /**
   * Abort everything still running, on page destroy.
   *
   * Without this an upload's request outlives the view that started it, and its callbacks write to signals
   * nothing is reading. The page calls it; the store cannot, because being page-provided is the whole reason
   * it survives the panel remounting.
   */
  abortAll(): void {
    for (const sub of this.subs.values()) sub.unsubscribe();
    this.subs.clear();
  }

  /** Immutably patch one row so the OnPush view re-renders. */
  private patch(id: number, changes: Partial<UploadItem>): void {
    this.items.update(list => list.map(u => (u.id === id ? { ...u, ...changes } : u)));
  }

  /** Start the next queued row, unless one is already in flight. */
  private processNext(): void {
    if (this.processing) return;
    const next = this.items().find(u => u.status === 'queued');
    if (!next) return;
    this.processing = true;
    this.start(next);
  }

  private start(row: QueuedUpload): void {
    this.patch(row.id, { status: 'uploading', percent: 0, error: undefined });
    const sub = this.filesApi.uploadFileChunked(row.spaceId, row.path, row.file).subscribe({
      next: (progress) => this.patch(row.id, { percent: progress.percent }),
      error: (err) => {
        this.subs.delete(row.id);
        this.patch(row.id, { status: 'failed', error: httpErrorReason(err) || undefined });
        // The queue advances past a failure. The row keeps its reason and offers Retry, which is the only
        // place the failure needs to be visible — nothing else on the page is waiting on it.
        this.processing = false;
        this.processNext();
      },
      complete: () => {
        this.subs.delete(row.id);
        this.patch(row.id, { status: 'done', percent: 100 });
        this.processing = false;
        this.completed.next();
        this.processNext();
      },
    });
    this.subs.set(row.id, sub);
  }
}
