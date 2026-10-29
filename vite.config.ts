/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves the app from /<repo>/, so assets need this prefix.
export default defineConfig({
  base: '/pdf-insight/',
  plugins: [react()],
  test: {
    include: ['shared/**/*.test.ts', 'src/**/*.test.ts'],
  },
})
