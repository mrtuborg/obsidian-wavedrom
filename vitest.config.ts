import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['main.ts', 'src/**/*.ts'],
      exclude: ['src/__mocks__/**'],
    },
  },
  resolve: {
    // Put .ts before .js so Vitest resolves main.ts instead of the built main.js bundle
    extensions: ['.ts', '.mts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
    alias: {
      obsidian: new URL('./src/__mocks__/obsidian.ts', import.meta.url).pathname,
    },
  },
})
