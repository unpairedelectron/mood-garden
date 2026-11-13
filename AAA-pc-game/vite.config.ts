import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so the build can be hosted from any sub-folder.
  base: './',
  plugins: [react()],
  build: {
    // three.js is one large module; the default 500 kB warning is noise here.
    chunkSizeWarningLimit: 1200,
  },
})
