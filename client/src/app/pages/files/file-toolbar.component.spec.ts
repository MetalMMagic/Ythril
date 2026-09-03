/**
 * FileToolbarComponent — the two things it decides for itself.
 *
 * Everything else is a pass-through: a click emits, an input draws. These two are not, and both were pinned
 * on the page before `G-3.3` moved the markup here, so the cases moved with their subject rather than being
 * rewritten.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { FileToolbarComponent } from './file-toolbar.component';

function create() {
  TestBed.configureTestingModule({
    imports: [FileToolbarComponent, getTranslocoModule()],
  });
  const fixture = TestBed.createComponent(FileToolbarComponent);
  fixture.detectChanges();
  return fixture;
}

beforeEach(() => TestBed.resetTestingModule());

function fakeFileList(names: string[]): FileList {
  const files = names.map(n => new File(['x'], n));
  return { ...files, length: files.length, item: (i: number) => files[i] } as unknown as FileList;
}

describe('FileToolbarComponent — the file picker', () => {
  it('picking the same file twice still uploads it — the input is cleared after each pick', () => {
    const fx = create();
    const picked: FileList[] = [];
    fx.componentInstance.filesPicked.subscribe(f => picked.push(f));

    const input = { files: fakeFileList(['a.txt']), value: 'C:/fake/a.txt' } as unknown as HTMLInputElement;
    fx.componentInstance.onFileInput({ target: input } as unknown as Event);

    // A file input fires `change` only when its value CHANGES. Left set, picking the same file again is
    // silent — the row never appears, the upload never happens, and nothing on screen explains either.
    expect(picked.length).toBe(1);
    expect(input.value).toBe('');
  });

  it('an empty pick emits nothing — cancelling the dialog is not a gesture', () => {
    const fx = create();
    let emitted = 0;
    fx.componentInstance.filesPicked.subscribe(() => emitted++);

    fx.componentInstance.onFileInput({
      target: { files: fakeFileList([]), value: '' } as unknown as HTMLInputElement,
    } as unknown as Event);

    expect(emitted).toBe(0);
  });
});

describe('FileToolbarComponent — what it draws and what it hides', () => {
  it('the space selector is hidden when embedded, and the toolbar is not', () => {
    const fx = create();
    fx.componentRef.setInput('spaces', [{ id: 'work', label: 'work' }]);
    fx.componentRef.setInput('embedded', false);
    fx.detectChanges();
    expect(fx.nativeElement.querySelector('.space-selector')).toBeTruthy();

    // Embedded in the Brain the host has already chosen the space, so offering the choice again is a
    // control that would change something outside this page's view of the world.
    fx.componentRef.setInput('embedded', true);
    fx.detectChanges();
    expect(fx.nativeElement.querySelector('.space-selector')).toBeNull();
    // The rest of the strip is NOT hidden with it: hiding a container hides everything inside, and the
    // breadcrumb, the upload button and the sidebar toggle have nothing to do with picking a space.
    expect(fx.nativeElement.querySelector('.toolbar')).toBeTruthy();
    expect(fx.nativeElement.querySelector('.sidebar-toggle')).toBeTruthy();
  });

  it('the last breadcrumb segment is the current one and does not navigate', () => {
    const fx = create();
    const went: string[] = [];
    fx.componentInstance.navigate.subscribe(p => went.push(p));
    fx.componentRef.setInput('breadcrumbs', [
      { label: 'root', path: '/' },
      { label: 'docs', path: '/docs' },
    ]);
    fx.detectChanges();

    const items = Array.from(fx.nativeElement.querySelectorAll('.breadcrumb-item')) as HTMLElement[];
    expect(items.length).toBe(2);
    expect(items[1].classList.contains('current')).toBe(true);
    expect(items[0].classList.contains('current')).toBe(false);

    // It still emits when clicked — `current` is styling, and re-navigating to where you already are is
    // harmless. Pinned so a later change to make it inert is a deliberate edit rather than a surprise.
    items[1].click();
    expect(went).toEqual(['/docs']);
  });

  it('the new-folder form replaces its button, and cancelling puts the button back', () => {
    const fx = create();
    expect(fx.nativeElement.querySelector('.rename-form')).toBeNull();

    fx.componentInstance.folderFormOpen.set(true);
    fx.detectChanges();
    expect(fx.nativeElement.querySelector('.rename-form')).toBeTruthy();

    // `folderFormOpen` is two-way BECAUSE the page decides when it closes on a successful create — a
    // refused one keeps the form open with what was typed. Cancelling is the one close this owns.
    const cancel = Array.from(fx.nativeElement.querySelectorAll('.rename-form button'))
      .find(b => (b as HTMLElement).getAttribute('type') === 'button') as HTMLElement;
    cancel.click();
    fx.detectChanges();
    expect(fx.componentInstance.folderFormOpen()).toBe(false);
    expect(fx.nativeElement.querySelector('.rename-form')).toBeNull();
  });

  it('the sidebar toggle says which direction it goes', () => {
    const fx = create();
    fx.componentRef.setInput('sidebarOpen', true);
    fx.detectChanges();
    expect(fx.nativeElement.querySelector('.sidebar-toggle').textContent).toContain('hideTree');

    fx.componentRef.setInput('sidebarOpen', false);
    fx.detectChanges();
    expect(fx.nativeElement.querySelector('.sidebar-toggle').textContent).toContain('showTree');
  });
});
