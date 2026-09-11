import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Dev-only: mirrors nginx.conf.template's same-origin /api/ and /health
  // proxies (ceynex-infra/frontend/) so `npm run dev` can talk to a locally
  // running `uvicorn ceynex.api.main:app` without every fetch() call needing
  // an absolute backend URL. Has no effect on the production build.
  //
  // VITE_API_TARGET (env or .env.local) moves the target: port 8000 is not
  // always free on a developer machine, and the evaluation runs use 8079.
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_TARGET || 'http://127.0.0.1:8000'
  const proxy = { '/api': target, '/health': target }
  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
    // `vite preview` serves the production bundle with the same proxy, which
    // is what the Playwright suite drives: the dev server's on-demand
    // dependency optimisation reloads the page under the first tests.
    preview: { proxy },
    // Vitest owns `src/**/*.test.ts`; the Playwright specs under e2e/ match its
    // default pattern too and would fail on import.
    test: { include: ['src/**/*.test.ts'] },
  }
})
