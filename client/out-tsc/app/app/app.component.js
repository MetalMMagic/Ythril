import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MfaPromptComponent } from './shared/mfa-prompt.component';
import { ToastContainerComponent } from './shared/toast-container.component';
import * as i0 from "@angular/core";
export class AppComponent {
    static { this.ɵfac = function AppComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || AppComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: AppComponent, selectors: [["app-root"]], decls: 3, vars: 0, template: function AppComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelement(0, "router-outlet")(1, "app-mfa-prompt")(2, "app-toast-container");
        } }, dependencies: [RouterOutlet, MfaPromptComponent, ToastContainerComponent], encapsulation: 2 }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(AppComponent, [{
        type: Component,
        args: [{
                selector: 'app-root',
                standalone: true,
                imports: [RouterOutlet, MfaPromptComponent, ToastContainerComponent],
                template: `<router-outlet /><app-mfa-prompt /><app-toast-container />`,
            }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(AppComponent, { className: "AppComponent", filePath: "app/app.component.ts", lineNumber: 12 }); })();
