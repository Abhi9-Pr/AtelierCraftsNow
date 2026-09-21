import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { artworkAssets } from './vite/artworkAssets.ts'
import { contentModule } from './vite/contentModule.ts'
import { pageSecurity } from './vite/pageSecurity.ts'
import { routeHeads } from './vite/routeHeads.ts'
import { siteFiles } from './vite/siteFiles.ts'
import { webAnalytics } from './vite/webAnalytics.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), artworkAssets(), contentModule(), routeHeads(), siteFiles(), webAnalytics(), pageSecurity()],
  build: {
    // The owner's order dashboard is a second page of its own, so none of its code is in what visitors download.
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        dashboard: fileURLToPath(new URL('./admin/dashboard/index.html', import.meta.url)),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
