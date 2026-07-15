import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MfaPromptComponent } from './shared/mfa-prompt.component';
import { ToastContainerComponent } from './shared/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MfaPromptComponent, ToastContainerComponent],
  template: `<router-outlet /><app-mfa-prompt /><app-toast-container />`,
})
export class AppComponent {}
