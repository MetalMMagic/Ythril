/**
 * StatusPill — the ONE status-badge vocabulary for the app (settings design system, PR-U1).
 *
 * Before this, three divergent badge dialects existed (`badge-red/green/gray`, `badge-active/failing`,
 * `badge-2xx/4xx`). Every "what state is this in?" signal now goes through one component with one
 * colour map, so a pill reads the same on tokens, webhooks, networks, storage, etc.
 *
 * Usage:  <app-status-pill variant="warn" [dot]="true">Expiring</app-status-pill>
 *         <app-status-pill variant="error" icon="warning">Failing</app-status-pill>
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PhIconComponent } from './ph-icon.component';

/** active/ok = good · warn = attention · error = bad · off/env = inert · pending = in-progress. */
export type StatusVariant = 'active' | 'ok' | 'warn' | 'error' | 'off' | 'env' | 'pending';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PhIconComponent],
  styles: [`
    .pill {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11.5px; font-weight: 600; letter-spacing: .01em; line-height: 1.5;
      padding: 2px 9px; border-radius: 999px; border: 1px solid transparent; white-space: nowrap;
    }
    .pill.active  { color: var(--accent);  background: rgba(206,255,128,.12); border-color: rgba(206,255,128,.28); }
    .pill.ok      { color: var(--success); background: rgba(63,185,80,.13);   border-color: rgba(63,185,80,.30); }
    .pill.warn    { color: var(--warning); background: rgba(210,153,34,.14);  border-color: rgba(210,153,34,.32); }
    .pill.error   { color: var(--error);   background: rgba(248,81,73,.10);   border-color: rgba(248,81,73,.30); }
    .pill.pending { color: var(--info);    background: rgba(88,166,255,.13);  border-color: rgba(88,166,255,.30); }
    .pill.off, .pill.env { color: var(--text-muted); background: var(--bg-elevated); border-color: var(--border); }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }
  `],
  template: `
    <span [class]="'pill ' + variant()">
      @if (icon()) { <ph-icon [name]="icon()" [size]="12"/> }
      @else if (dot()) { <span class="dot"></span> }
      <ng-content/>
    </span>
  `,
})
export class StatusPillComponent {
  variant = input<StatusVariant>('off');
  /** Optional leading ph-icon name; takes precedence over the dot. */
  icon = input<string>('');
  /** Show a leading status dot (ignored when an icon is set). */
  dot = input<boolean>(false);
}
