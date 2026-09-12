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

export default defineConfig({
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
