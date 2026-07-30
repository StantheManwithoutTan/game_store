/// <reference types="vitest/config" />

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  test: {
    include: ['src/**/*.{test,spec}.{ts,js,tsx,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
    },
  },
})