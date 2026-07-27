/**
 * Route-shape tests.
 *
 * The Models page was renamed to **Media Processing** once it grew past model endpoints to cover the whole
 * media/document pipeline. The rename moved the path too (a label-only rename leaves the route, folder and
 * i18n namespace all saying something the UI no longer says), which makes the OLD path a compatibility
 * surface: it is in bookmarks, in shipped docs, and in links people have already sent each other.
 *
 * These assert the redirect exists and stays exact — the kind of thing that breaks silently, because a
 * missing redirect looks like a 404 only to someone following an old link, never to whoever removed it.
 */
import { describe, it, expect } from 'vitest';
import type { Route } from '@angular/router';
import { routes } from './app.routes';

/** Depth-first walk of the route tree, yielding every node with its full path. */
function walk(rs: Route[], prefix = ''): Array<{ path: string; route: Route }> {
  const out: Array<{ path: string; route: Route }> = [];
  for (const r of rs) {
    const here = [prefix, r.path ?? ''].filter(Boolean).join('/');
    out.push({ path: here, route: r });
    if (r.children) out.push(...walk(r.children, here));
  }
  return out;
}

describe('app routes — Models → Media Processing rename', () => {
  const all = walk(routes);
  const find = (p: string) => all.find(x => x.path === p);

  it('serves the page at the new settings/media-processing path', () => {
    const target = find('settings/media-processing');
    expect(target).toBeDefined();
    expect(target!.route.loadComponent).toBeTypeOf('function');
  });

  it('still answers the old settings/models path, as a full-match redirect', () => {
    const legacy = find('settings/models');
    expect(legacy, 'the old path must keep working — it is in bookmarks and shipped docs').toBeDefined();
    expect(legacy!.route.redirectTo).toBe('media-processing');
    // pathMatch:'full' matters: a prefix match would also swallow any future settings/media-processing/* child.
    expect(legacy!.route.pathMatch).toBe('full');
    expect(legacy!.route.loadComponent, 'the legacy path redirects, it does not load the page again').toBeUndefined();
  });

  it('leaves exactly one route loading the page component', () => {
    const loaders = all.filter(x => x.path.startsWith('settings/media-processing') && x.route.loadComponent);
    expect(loaders.length).toBe(1);
  });
});
