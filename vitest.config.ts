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
      include: ["src/**/*.test.{ts,tsx}"],
    },
  }),
);
