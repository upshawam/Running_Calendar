import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/Running_Calendar/",
  build: {
    outDir: 'docs',
    emptyOutDir: false
  }
})
