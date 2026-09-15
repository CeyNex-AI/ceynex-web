import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end and accessibility checks against a running app.
 *
 * Two processes are expected: the backend (`uvicorn ceynex.api.main:app`, by
 * convention on 8079 and *degraded* — no model key — so a run is free and
 * deterministic) and `vite preview` serving the production bundle and proxying
 * to it, which this config builds and starts itself unless `E2E_BASE_URL`
 * points at a server already running. See e2e/README.md.
 */
const API = process.env.VITE_API_TARGET ?? "http://127.0.0.1:8079";
const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";

export default defineConfig<{ theme: "classic" | "signal-deck" }>({
  testDir: "./e2e",
  // Creates the policymaker the specs sign in as and checks the seeded admin
  // exists, since RBAC has no fixed demo accounts (e2e/global-setup.ts).
  globalSetup: "./e2e/global-setup.ts",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  // One worker: the specs share one backend and one demo account, and a turn
  // is a real graph run — parallel turns would only race each other.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/report" }]],
  outputDir: "e2e/results",
  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      // The same accessibility pass with the OS motion preference set, so the
      // `motion-safe:` animations are asserted absent rather than assumed.
      name: "reduced-motion",
      testMatch: /a11y\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], contextOptions: { reducedMotion: "reduce" } },
    },
    {
      // The same accessibility pass again, this time with the site-wide
      // Signal Deck theme on (e2e/helpers.ts's `theme` fixture flips it on
      // for this project's tests and back to classic after) -- added
      // 2026-09-15 after a live axe-core scan against production found a
      // real WCAG contrast failure that lived only in Signal Deck's
      // confidence gauge. Without this project, `a11y.spec.ts` at 100% pass
      // would still say nothing about that theme at all: the other two
      // projects only ever render Classic, a fresh site's default.
      name: "signal-deck",
      testMatch: /a11y\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], theme: "signal-deck" },
    },
  ],
  // The production bundle, served by `vite preview` with the proxy from
  // vite.config.ts. Not the dev server: its on-demand dependency optimisation
  // reloads the page mid-test, and the bundle is what a reader gets anyway.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
        url: BASE,
        reuseExistingServer: true,
        timeout: 120_000,
        env: { VITE_API_TARGET: API },
      },
});
