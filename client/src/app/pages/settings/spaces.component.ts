import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Space } from '../../core/api.service';

@Component({
  selector: 'app-spaces',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Create space -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div>
          <div class="card-title">Create space</div>
          <div class="card-subtitle">Spaces isolate brain and file storage.</div>
        </div>
      </div>

      @if (createError()) {
        <div class="alert alert-error">{{ createError() }}</div>
      }

      <form (ngSubmit)="createSpace()" style="display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap;">
        <div class="field" style="flex:1; min-width:140px; margin-bottom:0;">
          <label>Label</label>
          <input type="text" [(ngModel)]="form.label" name="label" placeholder="Work" maxlength="200" required />
        </div>
        <div class="field" style="width:140px; margin-bottom:0;">
          <label>ID (optional)</label>
          <input type="text" [(ngModel)]="form.id" name="id" placeholder="work" pattern="[a-z0-9-]+" />
        </div>
        <div class="field" style="width:120px; margin-bottom:0;">
          <label>Min GiB</label>
          <input type="number" [(ngModel)]="form.minGiB" name="minGiB" min="0" step="0.1" placeholder="—" />
        </div>
        <div class="field" style="flex-basis:100%; margin-bottom:0;">
          <label>Description (optional)</label>
          <textarea [(ngModel)]="form.description" name="description" placeholder="Surfaced to MCP clients as space-level instructions" maxlength="2000" rows="2" style="resize:vertical;"></textarea>
        </div>
        <div class="field" style="flex:1; min-width:200px; margin-bottom:0;">
          <label>Proxy for (optional, comma-separated space IDs)</label>
          <input type="text" [(ngModel)]="form.proxyFor" name="proxyFor" placeholder="eng-kb, research" />
        </div>
        <button class="btn-primary btn" type="submit" [disabled]="creating() || !form.label.trim()">
          @if (creating()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
          Create
        </button>
      </form>
    </div>

    <!-- Space list -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Spaces</div>
        <button class="btn-secondary btn btn-sm" (click)="load()">Refresh</button>
      </div>

      @if (loading()) {
        <div class="loading-overlay"><span class="spinner"></span></div>
      } @else {
        <div class="table-wrapper">
          <table>
            <thead>
              <tr><th>Label</th><th>ID</th><th>Description</th><th>Min storage</th><th>Proxy</th><th>Built-in</th><th></th></tr>
            </thead>
            <tbody>
              @for (s of spaces(); track s.id) {
                <tr>
                  <td style="font-weight:500;">{{ s.label }}</td>
                  <td><span class="badge badge-gray mono">{{ s.id }}</span></td>
                  <td style="color:var(--text-muted); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" [title]="s.description ?? ''">{{ s.description ?? '—' }}</td>
                  <td style="color:var(--text-muted)">{{ s.minGiB ? s.minGiB + ' GiB' : '—' }}</td>
                  <td>
                    @if (s.proxyFor && s.proxyFor.length) {
                      @for (pid of s.proxyFor; track pid) {
                        <span class="badge badge-blue" style="margin-right:4px;">{{ pid }}</span>
                      }
                    } @else { <span style="color:var(--text-muted)">—</span> }
                  </td>
                  <td>
                    @if (s.builtIn) { <span class="badge badge-blue">built-in</span> }
                  </td>
                  <td style="display:flex; gap:6px;">
                    <button class="icon-btn" aria-label="Edit space" (click)="openEdit(s)" title="Edit label/description">✎</button>
                    @if (!s.builtIn) {
                      <button class="icon-btn danger" aria-label="Delete space" (click)="deleteSpace(s)">✕</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7">
                  <div class="empty-state" style="padding:24px;"><h3>No spaces</h3></div>
                </td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- Edit space modal -->
    @if (editTarget()) {
      <div class="modal-backdrop" (click)="closeEdit()">
        <div class="modal" (click)="$event.stopPropagation()" style="min-width:360px; max-width:520px;">
          <div class="modal-header">
            <div class="card-title">Edit space</div>
            <button class="icon-btn" (click)="closeEdit()">✕</button>
          </div>
          @if (editError()) {
            <div class="alert alert-error" style="margin-bottom:12px;">{{ editError() }}</div>
          }
          <form (ngSubmit)="saveEdit()" style="display:flex; flex-direction:column; gap:12px;">
            <div class="field" style="margin-bottom:0;">
              <label>Label</label>
              <input type="text" [(ngModel)]="editForm.label" name="editLabel" maxlength="200" required />
            </div>
            <div class="field" style="margin-bottom:0;">
              <label>Description</label>
              <textarea [(ngModel)]="editForm.description" name="editDescription" maxlength="2000" rows="3" style="resize:vertical;" placeholder="Surfaced to MCP clients as space-level instructions"></textarea>
            </div>
            <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:4px;">
              <button type="button" class="btn btn-secondary" (click)="closeEdit()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="saving() || !editForm.label.trim()">
                @if (saving()) { <span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> }
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class SpacesComponent implements OnInit {
  private api = inject(ApiService);

  spaces = signal<Space[]>([]);
  loading = signal(true);
  creating = signal(false);
  createError = signal('');
  form = { label: '', id: '', minGiB: null as number | null, description: '', proxyFor: '' };

  editTarget = signal<Space | null>(null);
  editForm = { label: '', description: '' };
  saving = signal(false);
  editError = signal('');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.listSpaces().subscribe({
      next: ({ spaces }) => { this.spaces.set(spaces); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  createSpace(): void {
    if (!this.form.label.trim()) return;
    this.creating.set(true);
    this.createError.set('');

    const body: { label: string; id?: string; minGiB?: number; description?: string; proxyFor?: string[] } = { label: this.form.label.trim() };
    if (this.form.id.trim()) body.id = this.form.id.trim();
    if (this.form.minGiB) body.minGiB = this.form.minGiB;
    if (this.form.description.trim()) body.description = this.form.description.trim();
    const proxyIds = this.form.proxyFor.split(',').map(s => s.trim()).filter(Boolean);
    if (proxyIds.length) body.proxyFor = proxyIds;

    this.api.createSpace(body).subscribe({
      next: ({ space }) => {
        this.creating.set(false);
        this.spaces.update(list => [...list, space]);
        this.form = { label: '', id: '', minGiB: null, description: '', proxyFor: '' };
      },
      error: (err) => {
        this.creating.set(false);
        this.createError.set(err.error?.error ?? 'Failed to create space');
      },
    });
  }

  openEdit(s: Space): void {
    this.editTarget.set(s);
    this.editForm = { label: s.label, description: s.description ?? '' };
    this.editError.set('');
  }

  closeEdit(): void {
    this.editTarget.set(null);
    this.editError.set('');
  }

  saveEdit(): void {
    const target = this.editTarget();
    if (!target || !this.editForm.label.trim()) return;
    this.saving.set(true);
    this.editError.set('');

    const body: { label?: string; description?: string } = {};
    if (this.editForm.label.trim() !== target.label) body.label = this.editForm.label.trim();
    const newDesc = this.editForm.description.trim();
    const oldDesc = target.description ?? '';
    if (newDesc !== oldDesc) body.description = newDesc;

    if (Object.keys(body).length === 0) {
      this.saving.set(false);
      this.closeEdit();
      return;
    }

    this.api.updateSpace(target.id, body).subscribe({
      next: ({ space }) => {
        this.saving.set(false);
        this.spaces.update(list => list.map(s => s.id === space.id ? { ...s, ...space } : s));
        this.closeEdit();
      },
      error: (err) => {
        this.saving.set(false);
        this.editError.set(err.error?.error ?? 'Failed to update space');
      },
    });
  }

  deleteSpace(s: Space): void {
    if (!confirm(`Delete space "${s.label}" (${s.id})? All brain data and files in this space will be permanently removed.`)) return;
    this.api.deleteSpace(s.id).subscribe({
      next: () => this.spaces.update(list => list.filter(x => x.id !== s.id)),
      error: () => alert('Failed to delete space.'),
    });
  }
}
