import { defineConfig, mergeConfig } from "vite";
import viteConfig from "./vite.config.ts";

// Separate from vite.config.ts rather than one shared file with a `test`
// block bolted on: vite.config.ts is read by `vite build`/`vite dev` too,
// and Vite warns about (and ignores) an unrecognized `test` key there.
// mergeConfig keeps the real app config (react + tailwind plugins, the dev
// proxy) as the base so a test can't silently drift from what actually builds.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      globals: false,
      css: false,
    },
  }),
);
