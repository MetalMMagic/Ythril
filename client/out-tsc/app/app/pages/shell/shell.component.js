import { Component, inject, signal, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { FilesApi } from '../../core/files-api.service';
import { EmbedService } from '../../core/embed.service';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { BrandLogoComponent } from '../../shared/brand-logo.component';
import { HelpLinkComponent } from '../../shared/help-link.component';
import { helpTargetFor } from '../../shared/help-anchors';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import * as i0 from "@angular/core";
import * as i1 from "@angular/cdk/a11y";
function ShellComponent_Conditional_0_Template(rf, ctx) { if (rf & 1) {
    const _r1 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "header", 0)(1, "button", 37);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("click", function ShellComponent_Conditional_0_Template_button_click_1_listener() { i0.ɵɵrestoreView(_r1); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.toggleDrawer()); });
    i0.ɵɵelement(3, "ph-icon", 38);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(2, 4, "nav.menu"))("aria-expanded", ctx_r1.drawerOpen());
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("name", ctx_r1.drawerOpen() ? "x" : "list")("size", 20);
} }
function ShellComponent_Conditional_1_Template(rf, ctx) { if (rf & 1) {
    const _r3 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "header", 1)(1, "button", 37);
    i0.ɵɵpipe(2, "transloco");
    i0.ɵɵlistener("click", function ShellComponent_Conditional_1_Template_button_click_1_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.toggleDrawer()); });
    i0.ɵɵelement(3, "ph-icon", 38);
    i0.ɵɵelementEnd();
    i0.ɵɵelementStart(4, "a", 39);
    i0.ɵɵelement(5, "app-brand-logo", 40);
    i0.ɵɵelementEnd();
    i0.ɵɵelement(6, "span", 41);
    i0.ɵɵelementStart(7, "button", 42);
    i0.ɵɵlistener("click", function ShellComponent_Conditional_1_Template_button_click_7_listener() { i0.ɵɵrestoreView(_r3); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.logout()); });
    i0.ɵɵtext(8);
    i0.ɵɵpipe(9, "transloco");
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance();
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(2, 6, "nav.menu"))("aria-expanded", ctx_r1.drawerOpen());
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("name", ctx_r1.drawerOpen() ? "x" : "list")("size", 20);
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 21);
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(9, 8, "nav.signOut"));
} }
function ShellComponent_Conditional_3_Template(rf, ctx) { if (rf & 1) {
    const _r4 = i0.ɵɵgetCurrentView();
    i0.ɵɵelementStart(0, "button", 43);
    i0.ɵɵpipe(1, "transloco");
    i0.ɵɵlistener("click", function ShellComponent_Conditional_3_Template_button_click_0_listener() { i0.ɵɵrestoreView(_r4); const ctx_r1 = i0.ɵɵnextContext(); return i0.ɵɵresetView(ctx_r1.closeDrawer()); });
    i0.ɵɵelementEnd();
} if (rf & 2) {
    i0.ɵɵattribute("aria-label", i0.ɵɵpipeBind1(1, 1, "common.close"));
} }
function ShellComponent_Conditional_18_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "a", 11)(1, "span", 7);
    i0.ɵɵelement(2, "ph-icon", 44);
    i0.ɵɵelementEnd();
    i0.ɵɵtext(3);
    i0.ɵɵpipe(4, "transloco");
    i0.ɵɵelementStart(5, "span", 45);
    i0.ɵɵtext(6);
    i0.ɵɵelementEnd()();
} if (rf & 2) {
    const ctx_r1 = i0.ɵɵnextContext();
    i0.ɵɵadvance(2);
    i0.ɵɵproperty("size", 16);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(4, 3, "nav.conflicts"), " ");
    i0.ɵɵadvance(3);
    i0.ɵɵtextInterpolate(ctx_r1.conflictCount());
} }
function ShellComponent_Conditional_83_Template(rf, ctx) { if (rf & 1) {
    i0.ɵɵelementStart(0, "div", 36);
    i0.ɵɵelement(1, "app-help-link", 46);
    i0.ɵɵelementEnd();
} if (rf & 2) {
    const h_r5 = ctx;
    i0.ɵɵadvance();
    i0.ɵɵproperty("doc", h_r5.doc)("anchor", h_r5.anchor);
} }
export class ShellComponent {
    constructor() {
        this.auth = inject(AuthService);
        this.router = inject(Router);
        this.filesApi = inject(FilesApi);
        this.transloco = inject(TranslocoService);
        /** Public — the template reads embed.embedded() to hide the topbar. */
        this.embed = inject(EmbedService);
        this.conflictCount = signal(0, ...(ngDevMode ? [{ debugName: "conflictCount" }] : /* istanbul ignore next */ []));
        /** Help target for the page currently routed, or null when there is no section for it. Kept in a
         *  signal rather than read from `router.url` in the template so it re-evaluates on navigation. */
        this.helpTarget = signal(helpTargetFor(this.router.url), ...(ngDevMode ? [{ debugName: "helpTarget" }] : /* istanbul ignore next */ []));
        /** Mobile nav drawer open state. Always closed on desktop (the hamburger that
         *  toggles it is hidden ≥ 769px). */
        this.drawerOpen = signal(false, ...(ngDevMode ? [{ debugName: "drawerOpen" }] : /* istanbul ignore next */ []));
        this._pollTimer = null;
        this._navSub = null;
    }
    toggleDrawer() { this.drawerOpen.update(v => !v); }
    closeDrawer() { this.drawerOpen.set(false); }
    /** Escape closes the drawer (backdrop click and navigation also close it). */
    onEscape() { if (this.drawerOpen())
        this.closeDrawer(); }
    /** Resizing above the breakpoint returns to the static sidebar — drop the
     *  drawer/focus-trap state so it can't linger open on desktop. */
    onResize() { if (this.drawerOpen() && window.innerWidth > 768)
        this.closeDrawer(); }
    ngOnInit() {
        this.loadConflictCount();
        // Refresh badge every 60 s so it tracks new conflicts without a page reload
        this._pollTimer = setInterval(() => this.loadConflictCount(), 60_000);
        // Close the drawer whenever navigation completes, so tapping a link on
        // mobile takes the user to the page and dismisses the overlay.
        this._navSub = this.router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe(e => {
            this.closeDrawer();
            this.helpTarget.set(helpTargetFor(e.urlAfterRedirects));
        });
    }
    ngOnDestroy() {
        if (this._pollTimer !== null)
            clearInterval(this._pollTimer);
        this._navSub?.unsubscribe();
    }
    loadConflictCount() {
        this.filesApi.listConflicts().subscribe({
            next: ({ conflicts }) => this.conflictCount.set(conflicts.length),
            error: () => { },
        });
    }
    async logout() {
        if (this._pollTimer !== null)
            clearInterval(this._pollTimer);
        // Attempt a full OIDC sign-out (calls end_session_endpoint + clears local
        // state and redirects to the IdP).  When no OIDC session is active (PAT or
        // no session) the method returns false and we do a plain local logout.
        const oidcLogoutInitiated = await this.auth.logoutOidc();
        if (!oidcLogoutInitiated) {
            this.auth.logout();
            void this.router.navigate(['/login']);
        }
    }
    static { this.ɵfac = function ShellComponent_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || ShellComponent)(); }; }
    static { this.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: ShellComponent, selectors: [["app-shell"]], hostBindings: function ShellComponent_HostBindings(rf, ctx) { if (rf & 1) {
            i0.ɵɵlistener("keydown.escape", function ShellComponent_keydown_escape_HostBindingHandler() { return ctx.onEscape(); }, i0.ɵɵresolveDocument)("resize", function ShellComponent_resize_HostBindingHandler() { return ctx.onResize(); }, i0.ɵɵresolveWindow);
        } }, decls: 85, vars: 70, consts: [[1, "topbar", "topbar-embedded"], [1, "topbar"], [1, "layout"], ["type", "button", 1, "drawer-backdrop"], ["id", "app-sidebar", 1, "sidebar", 3, "cdkTrapFocus", "cdkTrapFocusAutoCapture"], [1, "nav-section-label"], ["routerLink", "/brain", "routerLinkActive", "active", 1, "nav-link"], [1, "nav-icon"], ["name", "brain", 3, "size"], ["routerLink", "/schema-library", "routerLinkActive", "active", 1, "nav-link"], ["name", "bookmarks", 3, "size"], ["routerLink", "/files/conflicts", "routerLinkActive", "active", 1, "nav-link"], ["routerLink", "/settings/tokens", "routerLinkActive", "active", 1, "nav-link"], ["name", "key", 3, "size"], ["routerLink", "/settings/spaces", "routerLinkActive", "active", 1, "nav-link"], ["name", "package", 3, "size"], ["routerLink", "/settings/storage", "routerLinkActive", "active", 1, "nav-link"], ["name", "chart-bar", 3, "size"], ["routerLink", "/settings/networks", "routerLinkActive", "active", 1, "nav-link"], ["name", "link", 3, "size"], ["routerLink", "/settings/preferences", "routerLinkActive", "active", 1, "nav-link"], ["name", "gear", 3, "size"], ["routerLink", "/settings/audit-log", "routerLinkActive", "active", 1, "nav-link"], ["name", "list-bullets", 3, "size"], ["routerLink", "/settings/data", "routerLinkActive", "active", 1, "nav-link"], ["name", "database", 3, "size"], ["routerLink", "/settings/webhooks", "routerLinkActive", "active", 1, "nav-link"], ["name", "broadcast", 3, "size"], ["routerLink", "/settings/media-processing", "routerLinkActive", "active", 1, "nav-link"], ["routerLink", "/settings/embedding", "routerLinkActive", "active", 1, "nav-link"], ["name", "corners-out", 3, "size"], ["routerLink", "/settings/help", "routerLinkActive", "active", 1, "nav-link"], ["name", "question", 3, "size"], ["routerLink", "/settings/about", "routerLinkActive", "active", 1, "nav-link"], ["name", "info", 3, "size"], [1, "main"], [1, "page-help"], ["type", "button", "aria-controls", "app-sidebar", 1, "menu-btn", 3, "click"], [3, "name", "size"], ["routerLink", "/", 1, "topbar-logo"], [3, "size"], [1, "topbar-spacer"], ["type", "button", 1, "btn", "btn-sm", "btn-secondary", 3, "click"], ["type", "button", 1, "drawer-backdrop", 3, "click"], ["name", "warning", 3, "size"], [1, "nav-badge"], [3, "doc", "anchor"]], template: function ShellComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵconditionalCreate(0, ShellComponent_Conditional_0_Template, 4, 6, "header", 0)(1, ShellComponent_Conditional_1_Template, 10, 10, "header", 1);
            i0.ɵɵelementStart(2, "div", 2);
            i0.ɵɵconditionalCreate(3, ShellComponent_Conditional_3_Template, 2, 3, "button", 3);
            i0.ɵɵelementStart(4, "nav", 4)(5, "span", 5);
            i0.ɵɵtext(6);
            i0.ɵɵpipe(7, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(8, "a", 6)(9, "span", 7);
            i0.ɵɵelement(10, "ph-icon", 8);
            i0.ɵɵelementEnd();
            i0.ɵɵtext(11);
            i0.ɵɵpipe(12, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(13, "a", 9)(14, "span", 7);
            i0.ɵɵelement(15, "ph-icon", 10);
            i0.ɵɵelementEnd();
            i0.ɵɵtext(16);
            i0.ɵɵpipe(17, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵconditionalCreate(18, ShellComponent_Conditional_18_Template, 7, 5, "a", 11);
            i0.ɵɵelementStart(19, "span", 5);
            i0.ɵɵtext(20);
            i0.ɵɵpipe(21, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(22, "a", 12)(23, "span", 7);
            i0.ɵɵelement(24, "ph-icon", 13);
            i0.ɵɵelementEnd();
            i0.ɵɵtext(25);
            i0.ɵɵpipe(26, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(27, "a", 14)(28, "span", 7);
            i0.ɵɵelement(29, "ph-icon", 15);
            i0.ɵɵelementEnd();
            i0.ɵɵtext(30);
            i0.ɵɵpipe(31, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(32, "a", 16)(33, "span", 7);
            i0.ɵɵelement(34, "ph-icon", 17);
            i0.ɵɵelementEnd();
            i0.ɵɵtext(35);
            i0.ɵɵpipe(36, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(37, "a", 18)(38, "span", 7);
            i0.ɵɵelement(39, "ph-icon", 19);
            i0.ɵɵelementEnd();
            i0.ɵɵtext(40);
            i0.ɵɵpipe(41, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(42, "a", 20)(43, "span", 7);
            i0.ɵɵelement(44, "ph-icon", 21);
            i0.ɵɵelementEnd();
            i0.ɵɵtext(45);
            i0.ɵɵpipe(46, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(47, "a", 22)(48, "span", 7);
            i0.ɵɵelement(49, "ph-icon", 23);
            i0.ɵɵelementEnd();
            i0.ɵɵtext(50);
            i0.ɵɵpipe(51, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(52, "a", 24)(53, "span", 7);
            i0.ɵɵelement(54, "ph-icon", 25);
            i0.ɵɵelementEnd();
            i0.ɵɵtext(55);
            i0.ɵɵpipe(56, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(57, "a", 26)(58, "span", 7);
            i0.ɵɵelement(59, "ph-icon", 27);
            i0.ɵɵelementEnd();
            i0.ɵɵtext(60);
            i0.ɵɵpipe(61, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(62, "a", 28)(63, "span", 7);
            i0.ɵɵelement(64, "ph-icon", 8);
            i0.ɵɵelementEnd();
            i0.ɵɵtext(65);
            i0.ɵɵpipe(66, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(67, "a", 29)(68, "span", 7);
            i0.ɵɵelement(69, "ph-icon", 30);
            i0.ɵɵelementEnd();
            i0.ɵɵtext(70);
            i0.ɵɵpipe(71, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(72, "a", 31)(73, "span", 7);
            i0.ɵɵelement(74, "ph-icon", 32);
            i0.ɵɵelementEnd();
            i0.ɵɵtext(75);
            i0.ɵɵpipe(76, "transloco");
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(77, "a", 33)(78, "span", 7);
            i0.ɵɵelement(79, "ph-icon", 34);
            i0.ɵɵelementEnd();
            i0.ɵɵtext(80);
            i0.ɵɵpipe(81, "transloco");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(82, "main", 35);
            i0.ɵɵconditionalCreate(83, ShellComponent_Conditional_83_Template, 2, 2, "div", 36);
            i0.ɵɵelement(84, "router-outlet");
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            let tmp_36_0;
            i0.ɵɵconditional(ctx.embed.embedded() ? 0 : 1);
            i0.ɵɵadvance(3);
            i0.ɵɵconditional(ctx.drawerOpen() ? 3 : -1);
            i0.ɵɵadvance();
            i0.ɵɵclassProp("open", ctx.drawerOpen());
            i0.ɵɵproperty("cdkTrapFocus", ctx.drawerOpen())("cdkTrapFocusAutoCapture", ctx.drawerOpen());
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(7, 38, "nav.section.workspace"));
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(12, 40, "nav.brain"), " ");
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(17, 42, "nav.schemaLibrary"), " ");
            i0.ɵɵadvance(2);
            i0.ɵɵconditional(ctx.conflictCount() > 0 ? 18 : -1);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(i0.ɵɵpipeBind1(21, 44, "nav.section.admin"));
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(26, 46, "nav.tokens"), " ");
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(31, 48, "nav.spaces"), " ");
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(36, 50, "nav.metrics"), " ");
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(41, 52, "nav.networks"), " ");
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(46, 54, "nav.settings"), " ");
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(51, 56, "nav.logs"), " ");
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(56, 58, "nav.data"), " ");
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(61, 60, "nav.webhooks"), " ");
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(66, 62, "nav.models"), " ");
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(71, 64, "nav.embedding"), " ");
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(76, 66, "nav.help"), " ");
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("size", 16);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("", i0.ɵɵpipeBind1(81, 68, "nav.about"), " ");
            i0.ɵɵadvance(3);
            i0.ɵɵconditional((tmp_36_0 = ctx.helpTarget()) ? 83 : -1, tmp_36_0);
        } }, dependencies: [RouterOutlet, RouterLink, RouterLinkActive, PhIconComponent, A11yModule, i1.CdkTrapFocus, BrandLogoComponent, HelpLinkComponent, TranslocoPipe], styles: ["[_nghost-%COMP%] { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }\n\n    .topbar[_ngcontent-%COMP%] {\n      height: var(--topbar-height);\n      min-height: var(--topbar-height);\n      background: var(--bg-surface);\n      border-bottom: 1px solid var(--border);\n      display: flex;\n      align-items: center;\n      padding: 0 20px;\n      gap: 16px;\n      z-index: 10;\n    }\n\n    .topbar-logo[_ngcontent-%COMP%] {\n      font-size: 16px;\n      font-weight: 700;\n      color: var(--text-primary);\n      letter-spacing: -0.03em;\n      display: flex;\n      align-items: center;\n      gap: 3px;\n      text-decoration: none;\n    }\n\n\n    .topbar-spacer[_ngcontent-%COMP%] { flex: 1; }\n\n    \n\n\n    .topbar-embedded[_ngcontent-%COMP%] { display: none; }\n\n    \n\n    .menu-btn[_ngcontent-%COMP%] {\n      display: none;\n      align-items: center;\n      justify-content: center;\n      background: none;\n      border: none;\n      color: var(--text-secondary);\n      cursor: pointer;\n      padding: 6px;\n      border-radius: var(--radius-sm);\n      margin-left: -6px;\n    }\n    .menu-btn[_ngcontent-%COMP%]:hover { color: var(--text-primary); background: var(--bg-elevated); }\n\n    \n\n\n\n\n\n    .layout[_ngcontent-%COMP%] {\n      display: flex;\n      flex: 1;\n      overflow: hidden;\n    }\n\n    .sidebar[_ngcontent-%COMP%] {\n      width: var(--sidebar-width);\n      min-width: var(--sidebar-width);\n      background: var(--bg-surface);\n      border-right: 1px solid var(--border);\n      display: flex;\n      flex-direction: column;\n      overflow-y: auto;\n      padding: 16px 12px;\n    }\n\n    .nav-section-label[_ngcontent-%COMP%] {\n      font-size: 10px;\n      font-weight: 600;\n      text-transform: uppercase;\n      letter-spacing: 0.08em;\n      color: var(--text-muted);\n      padding: 4px 8px;\n      margin-bottom: 4px;\n      margin-top: 12px;\n    }\n\n    .nav-section-label[_ngcontent-%COMP%]:first-child { margin-top: 0; }\n\n    .nav-link[_ngcontent-%COMP%] {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      padding: 7px 10px;\n      border-radius: var(--radius-sm);\n      color: var(--text-secondary);\n      font-size: 13px;\n      font-weight: 500;\n      text-decoration: none;\n      transition: color var(--transition), background var(--transition);\n      cursor: pointer;\n      border: none;\n      background: none;\n      width: 100%;\n      text-align: left;\n      font-family: var(--font);\n    }\n\n    .nav-link[_ngcontent-%COMP%]:hover { color: var(--text-primary); background: var(--bg-elevated); }\n\n    .nav-link.active[_ngcontent-%COMP%] {\n      color: var(--text-primary);\n      background: var(--nav-active-dim);\n    }\n    .nav-link.active[_ngcontent-%COMP%]   .nav-icon[_ngcontent-%COMP%] { opacity: 1; color: var(--nav-active); }\n\n    .nav-link[_ngcontent-%COMP%]   .nav-icon[_ngcontent-%COMP%] {\n      width: 16px;\n      text-align: center;\n      opacity: 0.8;\n    }\n\n    .nav-badge[_ngcontent-%COMP%] {\n      margin-left: auto;\n      background: var(--error);\n      color: var(--text-on-accent);\n      font-size: 10px;\n      font-weight: 700;\n      border-radius: 999px;\n      padding: 1px 6px;\n      min-width: 18px;\n      text-align: center;\n      line-height: 16px;\n    }\n\n    .main[_ngcontent-%COMP%] {\n      flex: 1;\n      \n\n\n\n\n\n\n\n\n\n      min-width: 0;\n      overflow-y: auto;\n      padding: 28px 32px;\n    }\n\n    \n\n\n\n\n\n    .page-help[_ngcontent-%COMP%] { display: flex; justify-content: flex-end; margin-bottom: 6px; }\n\n    \n\n    .drawer-backdrop[_ngcontent-%COMP%] {\n      position: fixed;\n      inset: var(--topbar-height) 0 0 0;\n      background: var(--bg-scrim);\n      z-index: 190;\n      border: none;\n      padding: 0;\n      cursor: default;\n    }\n\n    @media (max-width: 768px) {\n      .menu-btn[_ngcontent-%COMP%] { display: inline-flex; }\n      .topbar-embedded[_ngcontent-%COMP%] { display: flex; }\n      .main[_ngcontent-%COMP%] { padding: 20px 16px; }\n\n      \n\n\n      .sidebar[_ngcontent-%COMP%] {\n        position: fixed;\n        top: var(--topbar-height);\n        left: 0;\n        bottom: 0;\n        width: min(280px, 82vw);\n        min-width: 0;\n        z-index: 200;\n        transform: translateX(-100%);\n        transition: transform 180ms ease;\n        box-shadow: var(--shadow-drawer, 0 8px 32px rgba(0,0,0,0.4));\n      }\n      .sidebar.open[_ngcontent-%COMP%] { transform: translateX(0); }\n    }\n    @media (prefers-reduced-motion: reduce) {\n      .sidebar[_ngcontent-%COMP%] { transition: none; }\n    }"] }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(ShellComponent, [{
        type: Component,
        args: [{ selector: 'app-shell', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive, PhIconComponent, TranslocoPipe, A11yModule, BrandLogoComponent, HelpLinkComponent], template: `
    <!-- Top bar — hidden in embedded mode (?embedded=1): it duplicates the host
         portal's chrome, and its Sign out would end only the Ythril session. -->
    @if (embed.embedded()) {
      <!-- …but the hamburger is not chrome, it is the ONLY way to open the sidebar below 768px, where the
           sidebar is an off-canvas drawer. Without this an embedded narrow iframe rendered whatever page it
           landed on and no navigation at all: measured at 420px, sidebar at left:-280 and no control able to
           reach it. This bar is nav-only (no logo, no Sign out, so neither objection above applies) and is
           display:none above the breakpoint, where the sidebar is inline and needs no opener. -->
      <header class="topbar topbar-embedded">
        <button
          class="menu-btn"
          type="button"
          [attr.aria-label]="'nav.menu' | transloco"
          [attr.aria-expanded]="drawerOpen()"
          aria-controls="app-sidebar"
          (click)="toggleDrawer()"
        >
          <ph-icon [name]="drawerOpen() ? 'x' : 'list'" [size]="20"/>
        </button>
      </header>
    } @else {
      <header class="topbar">
        <button
          class="menu-btn"
          type="button"
          [attr.aria-label]="'nav.menu' | transloco"
          [attr.aria-expanded]="drawerOpen()"
          aria-controls="app-sidebar"
          (click)="toggleDrawer()"
        >
          <ph-icon [name]="drawerOpen() ? 'x' : 'list'" [size]="20"/>
        </button>
        <a class="topbar-logo" routerLink="/">
          <app-brand-logo [size]="21" />
        </a>
        <span class="topbar-spacer"></span>
        <button class="btn btn-sm btn-secondary" type="button" (click)="logout()">{{ 'nav.signOut' | transloco }}</button>
      </header>
    }

    <div class="layout">
      <!-- Mobile drawer backdrop — only present when the drawer is open. -->
      @if (drawerOpen()) {
        <button
          class="drawer-backdrop"
          type="button"
          [attr.aria-label]="'common.close' | transloco"
          (click)="closeDrawer()"
        ></button>
      }
      <!-- Sidebar navigation — an off-canvas drawer below 768px. -->
      <nav
        id="app-sidebar"
        class="sidebar"
        [class.open]="drawerOpen()"
        [cdkTrapFocus]="drawerOpen()"
        [cdkTrapFocusAutoCapture]="drawerOpen()"
      >
        <span class="nav-section-label">{{ 'nav.section.workspace' | transloco }}</span>
        <a class="nav-link" routerLink="/brain" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="brain" [size]="16"/></span>{{ 'nav.brain' | transloco }}
        </a>
        <a class="nav-link" routerLink="/schema-library" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="bookmarks" [size]="16"/></span>{{ 'nav.schemaLibrary' | transloco }}
        </a>
        @if (conflictCount() > 0) {
          <a class="nav-link" routerLink="/files/conflicts" routerLinkActive="active">
            <span class="nav-icon"><ph-icon name="warning" [size]="16"/></span>{{ 'nav.conflicts' | transloco }}
            <span class="nav-badge">{{ conflictCount() }}</span>
          </a>
        }

        <span class="nav-section-label">{{ 'nav.section.admin' | transloco }}</span>
        <a class="nav-link" routerLink="/settings/tokens" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="key" [size]="16"/></span>{{ 'nav.tokens' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/spaces" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="package" [size]="16"/></span>{{ 'nav.spaces' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/storage" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="chart-bar" [size]="16"/></span>{{ 'nav.metrics' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/networks" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="link" [size]="16"/></span>{{ 'nav.networks' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/preferences" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="gear" [size]="16"/></span>{{ 'nav.settings' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/audit-log" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="list-bullets" [size]="16"/></span>{{ 'nav.logs' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/data" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="database" [size]="16"/></span>{{ 'nav.data' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/webhooks" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="broadcast" [size]="16"/></span>{{ 'nav.webhooks' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/media-processing" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="brain" [size]="16"/></span>{{ 'nav.models' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/embedding" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="corners-out" [size]="16"/></span>{{ 'nav.embedding' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/help" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="question" [size]="16"/></span>{{ 'nav.help' | transloco }}
        </a>
        <a class="nav-link" routerLink="/settings/about" routerLinkActive="active">
          <span class="nav-icon"><ph-icon name="info" [size]="16"/></span>{{ 'nav.about' | transloco }}
        </a>
      </nav>

      <!-- Page content -->
      <main class="main">
        <!-- One help control, placed once, resolved from the route.
             The alternative was a "?" hand-added to eight heterogeneous page headers, which would have
             drifted in position on every one of them and quietly gone missing on the ninth page anyone
             added. Here a page becomes documented by adding a row to HELP_ANCHORS, and a page with no
             row renders nothing at all rather than a link to the top of a 900-line guide. -->
        @if (helpTarget(); as h) {
          <div class="page-help"><app-help-link [doc]="h.doc" [anchor]="h.anchor" /></div>
        }
        <router-outlet />
      </main>
    </div>
  `, styles: ["\n    :host { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }\n\n    .topbar {\n      height: var(--topbar-height);\n      min-height: var(--topbar-height);\n      background: var(--bg-surface);\n      border-bottom: 1px solid var(--border);\n      display: flex;\n      align-items: center;\n      padding: 0 20px;\n      gap: 16px;\n      z-index: 10;\n    }\n\n    .topbar-logo {\n      font-size: 16px;\n      font-weight: 700;\n      color: var(--text-primary);\n      letter-spacing: -0.03em;\n      display: flex;\n      align-items: center;\n      gap: 3px;\n      text-decoration: none;\n    }\n\n\n    .topbar-spacer { flex: 1; }\n\n    /* The embedded nav bar exists only below the breakpoint. Above it the sidebar is inline, so a bar\n       holding nothing but a drawer opener would be 56px of host-portal space spent on a no-op. */\n    .topbar-embedded { display: none; }\n\n    /* Hamburger \u2014 hidden on desktop, shown below the breakpoint. */\n    .menu-btn {\n      display: none;\n      align-items: center;\n      justify-content: center;\n      background: none;\n      border: none;\n      color: var(--text-secondary);\n      cursor: pointer;\n      padding: 6px;\n      border-radius: var(--radius-sm);\n      margin-left: -6px;\n    }\n    .menu-btn:hover { color: var(--text-primary); background: var(--bg-elevated); }\n\n    /* Sign out was the product's only bespoke button: borderless, 13px, 5px/10px padding \u2014 28px tall where the\n       house small button is 27px. It appeared on every page because it lives here, which made a one-off look like a\n       second app-wide style in the drift measurement. It uses .btn .btn-sm .btn-secondary now, so there is one small\n       button and this block is gone. */\n\n    .layout {\n      display: flex;\n      flex: 1;\n      overflow: hidden;\n    }\n\n    .sidebar {\n      width: var(--sidebar-width);\n      min-width: var(--sidebar-width);\n      background: var(--bg-surface);\n      border-right: 1px solid var(--border);\n      display: flex;\n      flex-direction: column;\n      overflow-y: auto;\n      padding: 16px 12px;\n    }\n\n    .nav-section-label {\n      font-size: 10px;\n      font-weight: 600;\n      text-transform: uppercase;\n      letter-spacing: 0.08em;\n      color: var(--text-muted);\n      padding: 4px 8px;\n      margin-bottom: 4px;\n      margin-top: 12px;\n    }\n\n    .nav-section-label:first-child { margin-top: 0; }\n\n    .nav-link {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      padding: 7px 10px;\n      border-radius: var(--radius-sm);\n      color: var(--text-secondary);\n      font-size: 13px;\n      font-weight: 500;\n      text-decoration: none;\n      transition: color var(--transition), background var(--transition);\n      cursor: pointer;\n      border: none;\n      background: none;\n      width: 100%;\n      text-align: left;\n      font-family: var(--font);\n    }\n\n    .nav-link:hover { color: var(--text-primary); background: var(--bg-elevated); }\n\n    .nav-link.active {\n      color: var(--text-primary);\n      background: var(--nav-active-dim);\n    }\n    .nav-link.active .nav-icon { opacity: 1; color: var(--nav-active); }\n\n    .nav-link .nav-icon {\n      width: 16px;\n      text-align: center;\n      opacity: 0.8;\n    }\n\n    .nav-badge {\n      margin-left: auto;\n      background: var(--error);\n      color: var(--text-on-accent);\n      font-size: 10px;\n      font-weight: 700;\n      border-radius: 999px;\n      padding: 1px 6px;\n      min-width: 18px;\n      text-align: center;\n      line-height: 16px;\n    }\n\n    .main {\n      flex: 1;\n      /* Defensive, and honestly labelled after measuring it.\n         A flex item defaults to min-width:auto, so this column will not shrink below its content's\n         intrinsic width; anything wider then overflows it and .layout's overflow:hidden CLIPS that\n         overflow \u2014 no scrollbar, nothing to scroll, the content is just gone.\n         What this does NOT do is fix the two cases reported in #534: audit-log was fixed by giving its\n         table a .table-wrapper, and the tab strips by wrapping. Measured with this line removed, both\n         still behave. It is kept because it is the correct value for a flex column that holds arbitrary\n         page content, and it is what lets the NEXT inner scroller work without anyone rediscovering\n         this. It is insurance, not the cure \u2014 the original comment here claimed otherwise. */\n      min-width: 0;\n      overflow-y: auto;\n      padding: 28px 32px;\n    }\n\n    /* The help control sits above the page, right-aligned, in normal flow.\n       It was briefly height:0 so pages would not shift down \u2014 but a zero-height element floating over\n       the first row can land on top of a page's own top-right controls (the Brain's space chips, the\n       Files toolbar), and a control that sometimes overlaps another control is worse than every page\n       starting 22px lower. Uniform and predictable beats compact and occasionally broken. */\n    .page-help { display: flex; justify-content: flex-end; margin-bottom: 6px; }\n\n    /* Backdrop behind the mobile drawer. Only rendered below the breakpoint. */\n    .drawer-backdrop {\n      position: fixed;\n      inset: var(--topbar-height) 0 0 0;\n      background: var(--bg-scrim);\n      z-index: 190;\n      border: none;\n      padding: 0;\n      cursor: default;\n    }\n\n    @media (max-width: 768px) {\n      .menu-btn { display: inline-flex; }\n      .topbar-embedded { display: flex; }\n      .main { padding: 20px 16px; }\n\n      /* The sidebar becomes an off-canvas overlay drawer. It stays in the DOM\n         (so focus trap + links keep working); it slides in from the left. */\n      .sidebar {\n        position: fixed;\n        top: var(--topbar-height);\n        left: 0;\n        bottom: 0;\n        width: min(280px, 82vw);\n        min-width: 0;\n        z-index: 200;\n        transform: translateX(-100%);\n        transition: transform 180ms ease;\n        box-shadow: var(--shadow-drawer, 0 8px 32px rgba(0,0,0,0.4));\n      }\n      .sidebar.open { transform: translateX(0); }\n    }\n    @media (prefers-reduced-motion: reduce) {\n      .sidebar { transition: none; }\n    }\n  "] }]
    }], null, { onEscape: [{
            type: HostListener,
            args: ['document:keydown.escape']
        }], onResize: [{
            type: HostListener,
            args: ['window:resize']
        }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(ShellComponent, { className: "ShellComponent", filePath: "app/pages/shell/shell.component.ts", lineNumber: 334 }); })();
