import { Component, inject, OnInit, OnDestroy, signal, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { filter } from 'rxjs';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { FilesApi } from '../../core/files-api.service';
import { EmbedService } from '../../core/embed.service';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { BrandLogoComponent } from '../../shared/brand-logo.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PhIconComponent, TranslocoPipe, A11yModule, BrandLogoComponent],
  styles: [`
    :host { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

    .topbar {
      height: var(--topbar-height);
      min-height: var(--topbar-height);
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 16px;
      z-index: 10;
    }

    .topbar-logo {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.03em;
      display: flex;
      align-items: center;
      gap: 3px;
      text-decoration: none;
    }


    .topbar-spacer { flex: 1; }

    /* Hamburger — hidden on desktop, shown below the breakpoint. */
    .menu-btn {
      display: none;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 6px;
      border-radius: var(--radius-sm);
      margin-left: -6px;
    }
    .menu-btn:hover { color: var(--text-primary); background: var(--bg-elevated); }

    .topbar-logout {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 13px;
      cursor: pointer;
      padding: 5px 10px;
      border-radius: var(--radius-sm);
      transition: color var(--transition), background var(--transition);
      font-family: var(--font);
    }
    .topbar-logout:hover { color: var(--text-primary); background: var(--bg-elevated); }

    .layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .sidebar {
      width: var(--sidebar-width);
      min-width: var(--sidebar-width);
      background: var(--bg-surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 16px 12px;
    }

    .nav-section-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      padding: 4px 8px;
      margin-bottom: 4px;
      margin-top: 12px;
    }

    .nav-section-label:first-child { margin-top: 0; }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 10px;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
      transition: color var(--transition), background var(--transition);
      cursor: pointer;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-family: var(--font);
    }

    .nav-link:hover { color: var(--text-primary); background: var(--bg-elevated); }

    .nav-link.active {
      color: var(--text-primary);
      background: var(--nav-active-dim);
    }
    .nav-link.active .nav-icon { opacity: 1; color: var(--nav-active); }

    .nav-link .nav-icon {
      width: 16px;
      text-align: center;
      opacity: 0.8;
    }

    .nav-badge {
      margin-left: auto;
      background: var(--error);
      color: var(--text-on-accent);
      font-size: 10px;
      font-weight: 700;
      border-radius: 999px;
      padding: 1px 6px;
      min-width: 18px;
      text-align: center;
      line-height: 16px;
    }

    .main {
      flex: 1;
      overflow-y: auto;
      padding: 28px 32px;
    }

    /* Backdrop behind the mobile drawer. Only rendered below the breakpoint. */
    .drawer-backdrop {
      position: fixed;
      inset: var(--topbar-height) 0 0 0;
      background: var(--bg-scrim);
      z-index: 190;
      border: none;
      padding: 0;
      cursor: default;
    }

    @media (max-width: 768px) {
      .menu-btn { display: inline-flex; }
      .main { padding: 20px 16px; }

      /* The sidebar becomes an off-canvas overlay drawer. It stays in the DOM
         (so focus trap + links keep working); it slides in from the left. */
      .sidebar {
        position: fixed;
        top: var(--topbar-height);
        left: 0;
        bottom: 0;
        width: min(280px, 82vw);
        min-width: 0;
        z-index: 200;
        transform: translateX(-100%);
        transition: transform 180ms ease;
        box-shadow: var(--shadow-drawer, 0 8px 32px rgba(0,0,0,0.4));
      }
      .sidebar.open { transform: translateX(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .sidebar { transition: none; }
    }
  `],
  template: `
    <!-- Top bar — hidden in embedded mode (?embedded=1): it duplicates the host
         portal's chrome, and its Sign out would end only the Ythril session. -->
    @if (!embed.embedded()) {
      <header class="topbar">
        <button
          class="menu-btn"
          type="button"
          [attr.aria-label]="'nav.menu' | transloco"
          [attr.aria-expanded]="drawerOpen()"
          aria-controls="app-sidebar"
          (click)="toggleDrawer()"
        >
          <ph-icon [name]="drawerOpen() ? 'x' : 'list'" [size]="20"/>
        </button>
        <a class="topbar-logo" routerLink="/">
          <app-brand-logo [size]="21" />
        </a>
        <span class="topbar-spacer"></span>
        <button class="topbar-logout" (click)="logout()">{{ 'nav.signOut' | transloco }}</button>
      </header>
    }

    <div class="layout">
      <!-- Mobile drawer backdrop — only present when the drawer is open. -->
      @if (drawerOpen()) {
        <button
          class="drawer-backdrop"
          type="button"
          [attr.aria-label]="'common.close' | transloco"
          (click)="closeDrawer()"
        ></button>
      }
      <!-- Sidebar navigation — an off-canvas drawer below 768px. -->
      <nav
        id="app-sidebar"
        class="sidebar"
        [class.open]="drawerOpen()"
        [cdkTrapFocus]="drawerOpen()"
        [cdkTrapFocusAutoCapture]="drawerOpen()"
      >
        <span class="nav-section-label">{{ 'nav.section.workspace' | transloco }}</span>
        <a class="nav-link" routerLink="/brain" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="brain" [size]="16"/></span>{{ 'nav.brain' | transloco }}
        </a>
        <a class="nav-link" routerLink="/schema-library" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="bookmarks" [size]="16"/></span>{{ 'nav.schemaLibrary' | transloco }}
        </a>
        @if (conflictCount() > 0) {
          <a class="nav-link" routerLink="/files/conflicts" routerLinkActive="active">
            <span class="nav-icon"><ph-icon name="warning" [size]="16"/></span>{{ 'nav.conflicts' | transloco }}
            <span class="nav-badge">{{ conflictCount() }}</span>
          </a>
        }

        <span class="nav-section-label">{{ 'nav.section.admin' | transloco }}</span>
        <a class="nav-link" routerLink="/settings/tokens" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="key" [size]="16"/></span>{{ 'nav.tokens' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/spaces" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="package" [size]="16"/></span>{{ 'nav.spaces' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/storage" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="chart-bar" [size]="16"/></span>{{ 'nav.metrics' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/networks" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="link" [size]="16"/></span>{{ 'nav.networks' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/preferences" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="gear" [size]="16"/></span>{{ 'nav.settings' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/audit-log" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="list-bullets" [size]="16"/></span>{{ 'nav.logs' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/data" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="database" [size]="16"/></span>{{ 'nav.data' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/webhooks" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="broadcast" [size]="16"/></span>{{ 'nav.webhooks' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/models" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="brain" [size]="16"/></span>{{ 'nav.models' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/duplicates" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="copy" [size]="16"/></span>{{ 'nav.duplicates' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/about" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="info" [size]="16"/></span>{{ 'nav.about' | transloco }}
        </a>
      </nav>

      <!-- Page content -->
      <main class="main">
        <router-outlet />
      </main>
    </div>
  `,
})
export class ShellComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private filesApi = inject(FilesApi);
  private transloco = inject(TranslocoService);
  /** Public — the template reads embed.embedded() to hide the topbar. */
  protected embed = inject(EmbedService);

  conflictCount = signal(0);

  /** Mobile nav drawer open state. Always closed on desktop (the hamburger that
   *  toggles it is hidden ≥ 769px). */
  drawerOpen = signal(false);

  private _pollTimer: ReturnType<typeof setInterval> | null = null;
  private _navSub: Subscription | null = null;

  toggleDrawer(): void { this.drawerOpen.update(v => !v); }
  closeDrawer(): void { this.drawerOpen.set(false); }

  /** Escape closes the drawer (backdrop click and navigation also close it). */
  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.drawerOpen()) this.closeDrawer(); }

  /** Resizing above the breakpoint returns to the static sidebar — drop the
   *  drawer/focus-trap state so it can't linger open on desktop. */
  @HostListener('window:resize')
  onResize(): void { if (this.drawerOpen() && window.innerWidth > 768) this.closeDrawer(); }

  ngOnInit(): void {
    this.loadConflictCount();
    // Refresh badge every 60 s so it tracks new conflicts without a page reload
    this._pollTimer = setInterval(() => this.loadConflictCount(), 60_000);
    // Close the drawer whenever navigation completes, so tapping a link on
    // mobile takes the user to the page and dismisses the overlay.
    this._navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.closeDrawer());
  }

  ngOnDestroy(): void {
    if (this._pollTimer !== null) clearInterval(this._pollTimer);
    this._navSub?.unsubscribe();
  }

  private loadConflictCount(): void {
    this.filesApi.listConflicts().subscribe({
      next: ({ conflicts }) => this.conflictCount.set(conflicts.length),
      error: () => { /* non-fatal — badge stays at last known value */ },
    });
  }

  async logout(): Promise<void> {
    if (this._pollTimer !== null) clearInterval(this._pollTimer);
    // Attempt a full OIDC sign-out (calls end_session_endpoint + clears local
    // state and redirects to the IdP).  When no OIDC session is active (PAT or
    // no session) the method returns false and we do a plain local logout.
    const oidcLogoutInitiated = await this.auth.logoutOidc();
    if (!oidcLogoutInitiated) {
      this.auth.logout();
      void this.router.navigate(['/login']);
    }
  }
}
