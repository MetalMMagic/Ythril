import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Redirect to /login if not authenticated, or if OIDC enforceForBrowser evicts a cached PAT. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  // When OIDC is configured with enforceForBrowser: true, a cached PAT is not
  // acceptable for the browser UI.  The enforcement check is cached so it only
  // hits the server once per page load.
  const evicted = await auth.enforceOidcBrowserSession();
  if (evicted) {
    return router.createUrlTree(['/login']);
  }

  return true;
};
