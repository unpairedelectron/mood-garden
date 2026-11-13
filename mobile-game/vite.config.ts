import { defineConfig } from 'vite'

export default defineConfig({
  // Relative paths so the build can be hosted from any folder or wrapped in a native shell.
  base: './',
  build: { chunkSizeWarningLimit: 900 },
})
