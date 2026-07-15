/**
 * Vitest setup — initialise the Angular test environment once per worker.
 *
 * The app is zoneless (P13): `provideZonelessChangeDetection()` in app.config.ts, no zone.js
 * polyfill. Tests must run under the SAME change-detection regime, or the OnPush/staleness
 * assertions (see change-detection-harness.spec.ts) would be exercising a scheduler that
 * production doesn't use. `ZonelessTestModule` injects the zoneless providers into every
 * TestBed the same way app.config.ts does for the app.
 */
import { NgModule, provideZonelessChangeDetection } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

@NgModule({ providers: [provideZonelessChangeDetection()] })
class ZonelessTestModule {}

// Each spec file runs in its own isolated fork (see vitest.config.ts), so the platform is
// created once per file — exactly what Angular's global TestBed expects.
getTestBed().initTestEnvironment([BrowserTestingModule, ZonelessTestModule], platformBrowserTesting());
