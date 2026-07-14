/**
 * Vitest setup — initialise the Angular test environment once per worker.
 *
 * The app runs with zone.js (not zoneless yet — that is the P5 endgame), so the tests load
 * zone.js + its testing patch and use the browser testing platform. When the app goes
 * zoneless, this file (and the `provideZonelessChangeDetection()` decision) is where that
 * flips.
 */
import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

// Each spec file runs in its own isolated fork (see vitest.config.ts), so the platform is
// created once per file — exactly what Angular's global TestBed expects.
getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
