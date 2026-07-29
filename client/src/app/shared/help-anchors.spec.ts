/**
 * helpTargetFor — which guide section answers the page you are on.
 *
 * The rules worth pinning are the two that decide whether the control is honest: longest-prefix wins (so
 * a general section cannot answer a specific page), and an unmapped page gets *nothing* rather than a
 * link to the top of a long guide.
 */
import { describe, it, expect } from 'vitest';
import { HELP_ANCHORS, helpTargetFor } from './help-anchors';

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
    // `/settings/schema-library` must not be answered by anything shorter that happens to prefix it.
    expect(helpTargetFor('/settings/schema-library')?.anchor).toBe('schema-library');
  });

  it('a prefix must end at a path segment — /brainstorm is not /brain', () => {
    expect(helpTargetFor('/brainstorm')).toBeNull();
  });

  it('an unmapped page gets no control at all', () => {
    // Deliberate: a link to the top of a 900-line guide moves the search rather than answering it, so
    // "no section for this yet" has to look different from "here is the section".
    expect(helpTargetFor('/settings/preferences')).toBeNull();
    expect(helpTargetFor('/login')).toBeNull();
  });

  it('the Help page itself has no help link', () => {
    expect(helpTargetFor('/settings/help')).toBeNull();
    expect(helpTargetFor('/settings/help?doc=userguide')).toBeNull();
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
