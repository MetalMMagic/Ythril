/**
 * MarkdownRenderService — heading ids and sanitization.
 *
 * The heading ids are not cosmetic. The user guide's table of contents carries 30 anchor links, all
 * authored against GitHub's slug rules; without matching ids every one of them points at nothing, and the
 * per-page help links have nowhere to scroll to. They address a chapter file since the guide was split,
 * but the Help page joins the chapters and strips the prefix, so the fragment still resolves here.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownRenderService, headingSlug } from './markdown-render.service';

describe('headingSlug — GitHub-compatible, because the documents are', () => {
  it('lowercases and hyphenates', () => {
    expect(headingSlug('Logging in')).toBe('logging-in');
    expect(headingSlug('Schema Library')).toBe('schema-library');
  });

  it('drops punctuation but keeps the spaces around it — this is what makes the double hyphen', () => {
    // `## Settings — Spaces` is the form every settings heading uses, and it slugs with two hyphens.
    expect(headingSlug('Settings — Spaces')).toBe('settings--spaces');
    expect(headingSlug('Brain — Review tab')).toBe('brain--review-tab');
  });

  it('strips parentheses without eating the word inside', () => {
    expect(headingSlug('Multi-factor authentication (MFA)')).toBe('multi-factor-authentication-mfa');
  });

  it('keeps existing hyphens and digits', () => {
    expect(headingSlug('Form NMK-SI-11 in 2026')).toBe('form-nmk-si-11-in-2026');
  });
});

describe('MarkdownRenderService', () => {
  let svc: MarkdownRenderService;
  beforeEach(() => {
    TestBed.resetTestingModule();
    svc = TestBed.inject(MarkdownRenderService);
  });

  it('gives every heading an id, so a table of contents can reach it', async () => {
    const html = await svc.render('# Top\n\n## Settings — Spaces\n\n### Deep one\n');
    expect(html).toContain('id="top"');
    expect(html).toContain('id="settings--spaces"');
    expect(html).toContain('id="deep-one"');
  });

  it('an intra-document link and its heading agree', async () => {
    const html = await svc.render('[jump](#settings--tokens)\n\n## Settings — Tokens\n');
    expect(html).toContain('href="#settings--tokens"');
    expect(html).toContain('id="settings--tokens"');
  });

  it('keeps inline markup inside a heading while slugging the plain text', async () => {
    const html = await svc.render('## The `recall` tool\n');
    expect(html).toContain('id="the-recall-tool"');
    expect(html).toContain('<code>recall</code>');
  });

  it('disambiguates repeated headings the way GitHub does', async () => {
    const html = await svc.render('## Notes\n\n## Notes\n\n## Notes\n');
    expect(html).toContain('id="notes"');
    expect(html).toContain('id="notes-1"');
    expect(html).toContain('id="notes-2"');
  });

  it('still strips scripts and event handlers', async () => {
    // The sanitization is a security boundary; adding heading ids must not have loosened it.
    const html = await svc.render('# T\n\n<img src=x onerror="alert(1)">\n\n<script>alert(2)</script>\n');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<script');
  });
});
