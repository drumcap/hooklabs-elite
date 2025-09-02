/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules',
      '.next',
      'e2e',
      'convex/_generated',
    ],
    server: {
      deps: {
        external: ['@clerk/nextjs', '@clerk/clerk-react', '@clerk/shared']
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'convex/_generated/',
        '.next/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/test-utils/**',
        '**/__mocks__/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/convex': path.resolve(__dirname, './convex'),
      '@/components': path.resolve(__dirname, './components'),
    }
  }
})