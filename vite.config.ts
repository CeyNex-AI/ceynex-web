import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev-only: mirrors nginx.conf.template's same-origin /api/ and /health
  // proxies (ceynex-infra/frontend/) so `npm run dev` can talk to a locally
  // running `uvicorn ceynex.api.main:app` without every fetch() call needing
  // an absolute backend URL. Has no effect on the production build.
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
    },
  },
})
