import { defineConfig, mergeConfig, type ConfigEnv, type UserConfig } from "vite";
import viteConfig from "./vite.config.ts";

// Separate from vite.config.ts rather than one shared file with a `test`
// block bolted on: vite.config.ts is read by `vite build`/`vite dev` too,
// and Vite warns about (and ignores) an unrecognized `test` key there.
// mergeConfig keeps the real app config (react + tailwind plugins, the dev
// proxy) as the base so a test can't silently drift from what actually builds.
//
// vite.config.ts is a function of the mode (it reads VITE_API_TARGET through
// loadEnv), and mergeConfig cannot merge a function, so it is called here with
// the same environment Vitest passes in.
export default defineConfig((env: ConfigEnv) =>
  mergeConfig((viteConfig as (env: ConfigEnv) => UserConfig)(env), {
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      globals: false,
      css: false,
      // The unit tests only. The Playwright specs under e2e/ match Vitest's
      // default pattern too, and fail on import outside Playwright's runner.
      // scripts/ holds the build-time plugins.
      include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
      // `npm run coverage`. The floor is a ratchet, as in ceynex-core: set just
      // under what the suite measured when it was introduced (2026-10-01), so a
      // PR that lowers coverage fails, and raised whenever coverage rises.
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/main.tsx", "src/vite-env.d.ts"],
        reporter: ["text-summary", "json-summary"],
        // Measured 2026-10-01: statements 22.2, branches 17.8, functions 15.8,
        // lines 21.7. Most pages are covered by the Playwright suite instead.
        thresholds: { statements: 21, branches: 17, functions: 15, lines: 21 },
      },
    },
  }),
);
