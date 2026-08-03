/**
 * helpTargetFor — which guide section answers the page you are on.
 *
 * The rules worth pinning are the two that decide whether the control is honest: longest-prefix wins (so
 * a general section cannot answer a specific page), and an unmapped page gets *nothing* rather than a
 * link to the top of a long guide.
 */
import { describe, it, expect } from 'vitest';
import type { Routes } from '@angular/router';
import { HELP_ANCHORS, helpTargetFor } from './help-anchors';
import { routes } from '../app.routes';

describe('helpTargetFor', () => {
  it('matches a page and its children', () => {
    expect(helpTargetFor('/settings/tokens')?.anchor).toBe('settings--tokens');
    expect(helpTargetFor('/brain')?.anchor).toBe('brain');
  });

  it('ignores query strings and fragments', () => {
    expect(helpTargetFor('/settings/spaces?tab=schema')?.anchor).toBe('settings--spaces');
    expect(helpTargetFor('/brain#somewhere')?.anchor).toBe('brain');
  });

  it('longest prefix wins, so a general entry cannot answer a specific page', () => {
    // `/settings/audit-log` must not be answered by anything shorter that happens to prefix it.
    expect(helpTargetFor('/settings/audit-log')?.anchor).toBe('settings--audit-log');
    expect(helpTargetFor('/settings/media-processing')?.anchor).toBe('settings--media-processing');
  });

  it('a prefix must end at a path segment — /brainstorm is not /brain', () => {
    expect(helpTargetFor('/brainstorm')).toBeNull();
  });

  it('an unmapped page gets no control at all', () => {
    // Deliberate: a link to the top of a 900-line guide moves the search rather than answering it, so
    // "no section for this yet" has to look different from "here is the section".
    expect(helpTargetFor('/settings/about')).toBeNull();
    expect(helpTargetFor('/login')).toBeNull();
  });

  it('the Help page itself has no help link', () => {
    expect(helpTargetFor('/settings/help')).toBeNull();
    expect(helpTargetFor('/settings/help?doc=userguide')).toBeNull();
  });

  /**
   * The two directions the table can be wrong in, checked against the ROUTER rather than against the table.
   *
   * A table that only checks itself cannot see the failure that happened here: `/settings/schema-library`
   * looked like a complete entry, matched nothing (there is no such route), and the real `/schema-library`
   * page — a top-level nav item — silently had no Help control at all. Every assertion above passed.
   */
  describe('against the routes actually declared', () => {
    /** Full paths of every content route in app.routes.ts, redirects excluded. */
    const declared = (() => {
      const walk = (rs: Routes, base: string): string[] =>
        rs.flatMap(r => {
          if (r.redirectTo !== undefined || r.path === undefined || r.path === '**') return [];
          const full = r.path ? `${base}/${r.path}` : base;
          const self = r.loadComponent || r.component ? [full] : [];
          return [...self, ...(r.children ? walk(r.children, full) : [])];
        });
      return walk(routes, '').filter(p => p !== '');
    })();

    /** Routes that deliberately have no guide section. Each needs a reason, not a shrug. */
    const NO_HELP: Record<string, string> = {
      '/setup': 'The first-run wizard is its own instructions; there is nobody signed in to read a guide.',
      '/login': 'A sign-in form with one field. Nothing to explain, and the guide is behind auth anyway.',
      '/oidc-callback': 'A redirect target with no UI — it is never on screen long enough to click anything.',
      '/settings/about': 'Version and build facts. The page IS the reference.',
      '/settings': 'The settings shell itself — a nav frame that redirects to /settings/tokens; never rendered alone.',
      '/settings/help': 'The help page. A help link on the help page is furniture (asserted above).',
      '': 'The shell itself, which redirects to /brain.',
    };

    it('found the routes (guards against a vacuous pass)', () => {
      expect(declared.length).toBeGreaterThanOrEqual(14);
      expect(declared).toContain('/schema-library');
      expect(declared).toContain('/settings/tokens');
    });

    it('every declared page either resolves to a guide section or says why not', () => {
      const unexplained = declared.filter(p => !helpTargetFor(p) && !(p in NO_HELP));
      expect(
        unexplained,
        `These routes exist but have no Help target and no recorded reason:\n` +
          unexplained.map(p => `  - ${p}`).join('\n') +
          `\n\nAdd a HELP_ANCHORS entry, or add the path to NO_HELP with the reason it needs none.`,
      ).toEqual([]);
    });

    it('every HELP_ANCHORS prefix matches a route that exists', () => {
      // The direction that caught the bug: an entry for a path nothing routes to is not a harmless extra,
      // it is the reason the real page looked covered.
      const orphans = HELP_ANCHORS.map(e => e.prefix).filter(
        prefix => !declared.some(p => p === prefix || p.startsWith(`${prefix}/`)),
      );
      expect(
        orphans,
        `These HELP_ANCHORS prefixes match no declared route, so they answer nothing:\n` +
          orphans.map(p => `  - ${p}`).join('\n'),
      ).toEqual([]);
    });

    it('no NO_HELP entry outlives its reason', () => {
      for (const [path, reason] of Object.entries(NO_HELP)) {
        expect(reason.length, `NO_HELP ${path} needs a real reason, not a placeholder.`).toBeGreaterThan(30);
        if (path === '') continue;
        expect(declared.includes(path), `NO_HELP lists ${path}, which is not a declared route — renamed?`).toBe(true);
        expect(
          helpTargetFor(path),
          `${path} now HAS a Help target, so its NO_HELP entry is stale — delete it. Reason given: ${reason}`,
        ).toBeNull();
      }
    });
  });

  it('every entry carries both a doc and an anchor', () => {
    // An unanchored entry would render a control that opens a guide at the top — the thing this
    // feature exists to avoid. (That the anchors RESOLVE is checked against docs/ in preflight.)
    for (const e of HELP_ANCHORS) {
      expect(e.target.doc).toBeTruthy();
      expect(e.target.anchor).toBeTruthy();
      expect(e.prefix.startsWith('/')).toBe(true);
    }
  });
});
