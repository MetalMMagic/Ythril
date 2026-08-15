import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RungPickerComponent } from './rung-picker.component';
import { getTranslocoModule } from '../../testing/transloco-testing';
import type { Rung } from './rights-glyph.component';

/**
 * The cell control. Two of its behaviours are the whole reason it is a component rather than four
 * checkboxes, and both are easy to lose in a refactor: clicking the current rung steps DOWN, and rungs
 * below the floor are visibly clamped rather than silently ignored.
 */
describe('RungPickerComponent', () => {
  let fixture: ComponentFixture<RungPickerComponent>;
  let emitted: Rung[];

  const render = (value: Rung, floor: Rung = 'none') => {
    fixture = TestBed.createComponent(RungPickerComponent);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('floor', floor);
    emitted = [];
    fixture.componentInstance.changed.subscribe(r => emitted.push(r));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };
  const buttons = (el: HTMLElement) => [...el.querySelectorAll('button')] as HTMLButtonElement[];

  beforeEach(async () => {
    // Transloco is needed because the clamp titles are translated — the picker states WHY a cell will not
    // go lower, and "held by the floor" and "held by an implication" are different sentences.
    await TestBed.configureTestingModule({
      imports: [RungPickerComponent, getTranslocoModule()],
    }).compileComponents();
  });

  it('says what the rung GRANTS before what the click does', () => {
    // Owner, 2026-08-15: "the tooltip on hovering a rung is still missing." It was not absent — it read
    // "Set write", which describes the CLICK. A reader hovering a permissions cell is asking what the rung
    // grants; the click is confirmation of a choice already made.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RungPickerComponent, getTranslocoModule({
        translation: { en: { 'tokens.rights.plain.files.write': 'Your agent can upload and delete files.' } },
      })],
    });
    const f = TestBed.createComponent(RungPickerComponent);
    f.componentRef.setInput('value', 'read');
    f.componentRef.setInput('area', 'files');
    f.detectChanges();
    const title = [...(f.nativeElement as HTMLElement).querySelectorAll('button')][2]!.getAttribute('title');
    expect(title).toBe('Your agent can upload and delete files. Set write');
  });

  it('falls back to the action alone when no area is wired', () => {
    // A caller that forgets [area] must degrade to the old tooltip, not print a raw translation key at a
    // user — and must not leave a leading space where the capability half would have been.
    const el = render('read');
    expect([...el.querySelectorAll('button')][2]!.getAttribute('title')).toBe('Set write');
  });

  it('renders one segment per rung', () => {
    expect(buttons(render('none')).map(b => b.textContent?.trim())).toEqual(['—', 'R', 'W', 'A']);
  });

  it('fills every segment up to the held rung, because rungs CONTAIN the ones below', () => {
    // Not "the selected one is highlighted": write includes read, and the control has to show that or it
    // reads as four independent choices.
    const el = render('write');
    expect(buttons(el).map(b => b.className.includes('on'))).toEqual([true, true, true, false]);
  });

  it('emits the rung that was clicked', () => {
    const el = render('none');
    buttons(el)[2]!.click();
    expect(emitted).toEqual(['write']);
  });

  it('clicking the CURRENT rung steps down one', () => {
    // A control that can only climb reads as resisting being narrowed — the direction anyone auditing wants.
    const el = render('write');
    buttons(el)[2]!.click();
    expect(emitted).toEqual(['read']);
  });

  it('stepping down stops at the floor rather than going under it', () => {
    const el = render('write', 'write');
    buttons(el)[2]!.click();
    expect(emitted).toEqual([]);
  });

  it('clamps the rungs below the floor, and says why', () => {
    // Dimmed and titled, not hidden: the floor is set on a different row, so a cell that silently refuses
    // to go lower with no visible reason looks broken rather than governed.
    const el = render('write', 'read');
    const bs = buttons(el);
    expect(bs[0]!.disabled).toBe(true);
    expect(bs[0]!.className).toContain('clamped');
    expect(bs[0]!.getAttribute('title')).toContain('floor');
    expect(bs[1]!.disabled).toBe(false);
  });

  it('emits nothing for a clamped rung', () => {
    const el = render('write', 'read');
    buttons(el)[0]!.click();
    expect(emitted).toEqual([]);
  });

  it('emits nothing when the value would not change', () => {
    // An event per click regardless of effect would make a parent mark itself dirty for nothing, and a diff
    // on save would show an edit nobody made.
    const el = render('read');
    buttons(el)[1]!.click();          // clicking `read` while on `read` steps to `none`
    expect(emitted).toEqual(['none']);
    const el2 = render('none');
    buttons(el2)[0]!.click();         // already at the bottom
    expect(emitted).toEqual([]);
  });

  it('exposes pressed state for assistive tech', () => {
    const el = render('read');
    expect(buttons(el).map(b => b.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'false', 'false']);
  });
});
