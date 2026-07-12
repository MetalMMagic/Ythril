import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, DuplicateRecord } from '../../core/api.service';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-duplicates',
  standalone: true,
  imports: [DatePipe, FormsModule, PhIconComponent, TranslocoPipe],
  template: `
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
      <h2 style="margin:0; flex:1; font-size:18px;">{{ 'duplicates.title' | transloco }}</h2>
      <select [(ngModel)]="statusFilter" (change)="load()"
              [attr.aria-label]="'duplicates.statusFilterAria' | transloco"
              style="font-size:13px; padding:4px 8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-primary);">
        <option value="open">{{ 'duplicates.status.open' | transloco }}</option>
        <option value="dismissed">{{ 'duplicates.status.dismissed' | transloco }}</option>
        <option value="all">{{ 'duplicates.status.all' | transloco }}</option>
      </select>
      <button class="btn btn-sm btn-secondary" (click)="scan()" [disabled]="scanning()">
        @if (scanning()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
        {{ 'duplicates.scanNow' | transloco }}
      </button>
    </div>

    <p style="color:var(--text-muted); font-size:13px; margin:-8px 0 16px;">{{ 'duplicates.intro' | transloco }}</p>

    @if (loading()) {
      <div class="loading-overlay"><span class="spinner"></span></div>
    } @else if (error()) {
      <div class="alert alert-warning">{{ 'duplicates.loadError' | transloco }}</div>
    } @else if (rows().length === 0) {
      <div class="empty-state">
        <div class="empty-state-icon"><ph-icon name="check-circle" [size]="48"/></div>
        <h3>{{ 'duplicates.empty.title' | transloco }}</h3>
        <p>{{ 'duplicates.empty.body' | transloco }}</p>
      </div>
    } @else {
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>{{ 'duplicates.table.space' | transloco }}</th>
              <th>{{ 'duplicates.table.type' | transloco }}</th>
              <th>{{ 'duplicates.table.recordA' | transloco }}</th>
              <th>{{ 'duplicates.table.recordB' | transloco }}</th>
              <th>{{ 'duplicates.table.score' | transloco }}</th>
              <th>{{ 'duplicates.table.status' | transloco }}</th>
              <th>{{ 'duplicates.table.detected' | transloco }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (d of rows(); track d.id) {
              <tr>
                <td><span class="badge badge-blue mono">{{ d.spaceId }}</span></td>
                <td><span class="mono" style="font-size:12px">{{ d.type }}</span></td>
                <td style="font-size:12px; max-width:260px; white-space:pre-wrap">{{ d.aSummary }}</td>
                <td style="font-size:12px; max-width:260px; white-space:pre-wrap; color:var(--text-muted)">{{ d.bSummary }}</td>
                <td class="mono" style="white-space:nowrap">{{ d.score.toFixed(2) }}</td>
                <td>
                  <span class="badge" [class.badge-green]="d.status==='resolved'" [class.badge-blue]="d.status==='open'">
                    {{ ('duplicates.status.' + d.status) | transloco }}{{ d.resolution ? ' · ' + (('duplicates.resolution.' + d.resolution) | transloco) : '' }}
                  </span>
                </td>
                <td style="color:var(--text-muted); white-space:nowrap">{{ d.detectedAt | date:'dd.MM.yyyy HH:mm' }}</td>
                <td style="white-space:nowrap">
                  @if (d.status !== 'resolved') {
                    @if (d.type === 'entity') {
                      <button class="btn btn-sm btn-primary" (click)="merge(d)" [disabled]="busy() === d.id">
                        {{ 'duplicates.merge' | transloco }}
                      </button>
                    }
                    <button class="btn btn-sm btn-secondary" style="margin-left:4px" (click)="dismiss(d)" [disabled]="busy() === d.id"
                            [attr.title]="'duplicates.dismiss' | transloco" [attr.aria-label]="'duplicates.dismiss' | transloco">
                      <ph-icon name="x" [size]="16"/>
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class DuplicatesComponent implements OnInit {
  private api = inject(ApiService);
  private transloco = inject(TranslocoService);

  loading = signal(true);
  error = signal(false);
  scanning = signal(false);
  busy = signal<string | null>(null);
  rows = signal<DuplicateRecord[]>([]);
  statusFilter: 'open' | 'dismissed' | 'all' = 'open';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.listDuplicates(this.statusFilter).subscribe({
      next: ({ duplicates }) => { this.rows.set(duplicates); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  scan(): void {
    this.scanning.set(true);
    this.api.scanDuplicates().subscribe({
      next: () => { this.scanning.set(false); this.load(); },
      error: () => { this.scanning.set(false); alert(this.transloco.translate('duplicates.scanError')); },
    });
  }

  dismiss(d: DuplicateRecord): void {
    this.busy.set(d.id);
    this.api.dismissDuplicate(d.id).subscribe({
      next: () => { this.rows.update(list => this.statusFilter === 'open' ? list.filter(x => x.id !== d.id) : list.map(x => x.id === d.id ? { ...x, status: 'dismissed' } : x)); this.busy.set(null); },
      error: () => this.busy.set(null),
    });
  }

  merge(d: DuplicateRecord): void {
    if (!confirm(this.transloco.translate('duplicates.confirmMerge'))) return;
    this.busy.set(d.id);
    this.api.mergeDuplicate(d.id).subscribe({
      next: () => { this.rows.update(list => list.filter(x => x.id !== d.id)); this.busy.set(null); },
      error: (e) => { this.busy.set(null); alert(e?.error?.error || this.transloco.translate('duplicates.mergeError')); },
    });
  }
}
