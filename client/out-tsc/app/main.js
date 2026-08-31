import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { applyHostDecoration } from './app/core/host-decoration';
// Before bootstrap, so the very first paint is already decorated (or already flat) and no card is seen
// changing appearance a frame later. It is one `getComputedStyle` read on the root element; see the module for
// why presence is resolved once here rather than asked per component.
applyHostDecoration();
bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
