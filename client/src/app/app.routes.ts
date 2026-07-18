import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { setupGuard } from './core/setup.guard';
import { oidcCallbackGuard } from './core/oidc-callback.guard';
import { spacesCanDeactivate } from './pages/settings/spaces-can-deactivate.guard';

export const routes: Routes = [
  // Public routes
  {
    path: 'setup',
    title: 'titles.setup',
    canActivate: [setupGuard],
    loadComponent: () =>
      import('./pages/setup/setup.component').then(m => m.SetupComponent),
  },
  {
    path: 'login',
    title: 'login.signIn',
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'oidc-callback',
    canActivate: [oidcCallbackGuard],
    loadComponent: () =>
      import('./pages/oidc-callback/oidc-callback.component').then(
        m => m.OidcCallbackComponent,
      ),
  },

  // Protected shell (all main app pages live inside)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'brain', pathMatch: 'full' },
      {
        path: 'brain',
        title: 'nav.brain',
        loadComponent: () =>
          import('./pages/brain/brain.component').then(m => m.BrainComponent),
      },
      {
        path: 'files/conflicts',
        title: 'nav.conflicts',
        loadComponent: () =>
          import('./pages/files/conflicts.component').then(m => m.ConflictsComponent),
      },
      {
        path: 'schema-library',
        title: 'nav.schemaLibrary',
        loadComponent: () =>
          import('./pages/schema-library/schema-library.component').then(m => m.SchemaLibraryComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then(m => m.SettingsComponent),
        children: [
          { path: '', redirectTo: 'tokens', pathMatch: 'full' },
          {
            path: 'preferences',
            title: 'nav.settings',
            loadComponent: () =>
              import('./pages/settings/preferences.component').then(m => m.PreferencesComponent),
          },
          {
            path: 'tokens',
            title: 'nav.tokens',
            loadComponent: () =>
              import('./pages/settings/tokens.component').then(m => m.TokensComponent),
          },
          {
            path: 'spaces',
            title: 'nav.spaces',
            loadComponent: () =>
              import('./pages/settings/spaces.component').then(m => m.SpacesComponent),
            canDeactivate: [spacesCanDeactivate],
          },
          {
            path: 'storage',
            title: 'nav.metrics',
            loadComponent: () =>
              import('./pages/settings/storage.component').then(m => m.StorageComponent),
          },
          {
            path: 'networks',
            title: 'nav.networks',
            loadComponent: () =>
              import('./pages/settings/networks.component').then(m => m.NetworksComponent),
          },
          {
            path: 'audit-log',
            title: 'nav.logs',
            loadComponent: () =>
              import('./pages/settings/audit-log.component').then(m => m.AuditLogComponent),
          },
          {
            path: 'data',
            title: 'nav.data',
            loadComponent: () =>
              import('./pages/settings/data.component').then(m => m.DataComponent),
          },
          {
            path: 'about',
            title: 'nav.about',
            loadComponent: () =>
              import('./pages/settings/about.component').then(m => m.AboutComponent),
          },
          {
            path: 'models',
            title: 'titles.models',
            loadComponent: () =>
              import('./pages/settings/models.component').then(m => m.ModelsComponent),
          },
          {
            path: 'duplicates',
            title: 'nav.duplicates',
            loadComponent: () =>
              import('./pages/settings/duplicates.component').then(m => m.DuplicatesComponent),
          },
        ],
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
