import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { Subscription } from 'rxjs';

/**
 * Sets the browser tab title from each route's `title` (treated as a Transloco
 * key), formatted as `<Page> · Ythril`. Uses `selectTranslate` so the title is
 * correct even before the active language file has finished loading, and
 * re-emits when the language changes. Routes without a `title` fall back to the
 * bare app name.
 */
@Injectable({ providedIn: 'root' })
export class TranslocoTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);
  private sub?: Subscription;

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.sub?.unsubscribe();
    const key = this.buildTitle(snapshot);
    if (!key) {
      this.title.setTitle('Ythril');
      return;
    }
    this.sub = this.transloco.selectTranslate(key).subscribe(page => {
      this.title.setTitle(`${page} · Ythril`);
    });
  }
}
