// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // ESSENCIAL!
  build: {
    outDir: 'dist' // Garanta que a saída seja para a pasta 'dist'
  }
})