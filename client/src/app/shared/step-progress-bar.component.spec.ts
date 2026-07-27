/**
 * StepProgressBarComponent — the rendered contract.
 *
 * The arithmetic is tested in `step-progress.model.spec.ts`; this covers what only a real render can
 * show: that the degrade path actually draws one bar instead of a row of sections, and that the
 * accessible name is a translated sentence rather than a raw i18n key.
 *
 * That second one is not a nicety. This component exists to answer "is this file done?", and a bar
 * that communicates only by width answers it for nobody using a screen reader. It is also the exact
 * mistake that is easy to make and invisible on screen — building the label in a `computed()` puts
 * `files.progress.working` into `aria-valuetext` and looks perfect to a sighted reviewer.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { getTranslocoModule } from '../testing/transloco-testing';
import { StepProgressBarComponent } from './step-progress-bar.component';

/** Real translations, so a key that skipped the pipe is distinguishable from one that went through
 *  it. With an empty translation map transloco echoes the key back and both look identical. */
const TRANSLATIONS = {
  en: { 'mediaProcessing.step.vlm': 'Transcribing', 'mediaProcessing.step.ocr': 'Reading text', 'files.progress.working': 'Working' },
};

function render(inputs: Record<string, unknown>) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [StepProgressBarComponent, getTranslocoModule({ translation: TRANSLATIONS })] });
  const fixture = TestBed.createComponent(StepProgressBarComponent);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture;
}

const track = (f: ReturnType<typeof render>) => f.nativeElement.querySelector('[role="progressbar"]') as HTMLElement;
const segments = (f: ReturnType<typeof render>) => f.nativeElement.querySelectorAll('.seg') as NodeListOf<HTMLElement>;

describe('StepProgressBarComponent — the degrade path is visible, not just modelled', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('draws one bar for a single-stage route', () => {
    // The OCR route really is one stage. A single bordered box reads as "step 1 of several".
    const f = render({ progress: { step: 'ocr', steps: ['ocr'], done: 3, total: 10 } });
    expect(segments(f)).toHaveLength(1);
  });

  it('draws one section per stage for a real route', () => {
    const f = render({ progress: { step: 'vlm', steps: ['ocr', 'render', 'vlm', 'validate'] } });
    expect(segments(f)).toHaveLength(4);
  });

  it('renders without a progress report at all', () => {
    const f = render({ progress: null });
    expect(track(f)).toBeTruthy();
    expect(segments(f)).toHaveLength(1);
  });
});

describe('StepProgressBarComponent — the accessible contract', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('is a progressbar with real values', () => {
    const f = render({ progress: { step: 'vlm', steps: ['ocr', 'vlm'], done: 5, total: 10 } });
    const el = track(f);
    expect(el.getAttribute('role')).toBe('progressbar');
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('100');
    expect(Number(el.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  });

  it('THE ONE THAT MATTERS: the accessible name is TRANSLATED, not a raw i18n key', () => {
    // Building this label in a `computed()` instead of through the pipe puts `mediaProcessing.step.vlm` into
    // aria-valuetext and looks perfect on screen. Asserting the resolved words are present is what
    // separates "went through the pipe" from "echoed the key back" — with an empty translation map
    // those two are indistinguishable, which is why TRANSLATIONS above is not empty.
    const cases: Array<[unknown, string]> = [
      [{ step: 'vlm', steps: ['ocr', 'vlm'], done: 5, total: 10 }, 'Transcribing'],
      [{ step: 'ocr', steps: ['ocr'] }, 'Reading text'],
      [{ step: 'nothing-we-know', steps: ['nothing-we-know'] }, 'Working'],
      [null, 'Working'],
    ];
    for (const [progress, expected] of cases) {
      const text = track(render({ progress })).getAttribute('aria-valuetext') ?? '';
      expect(text).toContain(expected);
      expect(text).not.toMatch(/\b(files|models)\.[a-z]+\.[a-z]/i);
    }
  });

  it('names the units when a stage can count them, and does not invent them when it cannot', () => {
    const counted = render({ progress: { step: 'vlm', steps: ['ocr', 'vlm'], done: 5, total: 40 } });
    expect(track(counted).getAttribute('aria-valuetext')).toContain('5 / 40');

    const uncounted = render({ progress: { step: 'vlm', steps: ['ocr', 'vlm'] } });
    expect(track(uncounted).getAttribute('aria-valuetext')).not.toMatch(/\d+\s*\/\s*\d+/);
  });

  it('clamps a displayed count that overshoots its own total', () => {
    const f = render({ progress: { step: 'vlm', steps: ['ocr', 'vlm'], done: 99, total: 40 } });
    expect(track(f).getAttribute('aria-valuetext')).toContain('40 / 40');
  });
});

describe('StepProgressBarComponent — an unlabelled stage fails silently', () => {
  beforeEach(() => TestBed.resetTestingModule());

  // A stage the component does not recognise falls back to a generic "working" label. That is the right
  // behaviour for an unknown stage, but it means a stage the pipeline REALLY runs — one with a perfectly
  // good translation sitting in the locale files — degrades to "working" for want of a set entry, with no
  // error anywhere. `faces` was exactly that: labelled in en/de/pl, absent from the set.
  const PIPELINE_STAGES = ['ocr', 'render', 'vlm', 'validate', 'repair', 'verify',
    'embed', 'chunk', 'caption', 'transcribe', 'split', 'faces'];

  it('names every stage the pipeline can report, rather than shrugging at some of them', () => {
    // A recognised stage resolves to its own `mediaProcessing.step.*` key; an unrecognised one resolves to
    // the shared "working" fallback. Matched case-insensitively — the fixture translates it as "Working",
    // and a case-sensitive check would report every stage as fine whether or not it was.
    const unlabelled = PIPELINE_STAGES.filter(step => {
      const f = render({ progress: { step, steps: [step] } });
      return /working/i.test(f.nativeElement.querySelector('.label .step')?.textContent ?? '');
    });
    expect(unlabelled).toEqual([]);
  });

  it('still degrades gracefully for a stage it genuinely does not know', () => {
    const f = render({ progress: { step: 'teleport', steps: ['teleport'] } });
    expect(f.nativeElement.querySelector('.label .step')?.textContent).toMatch(/working/i);
  });
});

describe('StepProgressBarComponent — a stalled job does not look like a working one', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('says so when nothing has been reported for longer than the timeout', () => {
    const f = render({
      progress: { step: 'vlm', steps: ['ocr', 'vlm'], done: 5, total: 10 },
      progressAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      stallTimeoutMs: 60_000,
    });
    expect(f.nativeElement.querySelector('.label.stale')).toBeTruthy();
    expect(f.nativeElement.querySelector('.seg.stale')).toBeTruthy();
  });

  it('does not accuse a job that is still reporting', () => {
    const f = render({
      progress: { step: 'vlm', steps: ['ocr', 'vlm'], done: 5, total: 10 },
      progressAt: new Date().toISOString(),
      stallTimeoutMs: 60_000,
    });
    expect(f.nativeElement.querySelector('.label.stale')).toBeFalsy();
  });

  it('does not accuse a job that has never reported', () => {
    // "No heartbeat yet" is not "stopped heartbeating" — a freshly claimed job must look normal.
    const f = render({ progress: { step: 'ocr', steps: ['ocr', 'vlm'] }, progressAt: null });
    expect(f.nativeElement.querySelector('.label.stale')).toBeFalsy();
  });
});
