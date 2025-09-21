/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // 테스트 환경 설정
    environment: 'happy-dom',

    // 전역 설정 파일들
    setupFiles: [
      './tests/setup/test-setup.ts',
      './tests/setup/convex-setup.ts',
      './tests/setup/auth-setup.ts'
    ],

    // 테스트 파일 패턴
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'tests/e2e/**/*',
      'tests/performance/**/*.spec.ts'
    ],

    // 테스트 시간 설정
    testTimeout: 30000, // 30초 (API 테스트 고려)
    hookTimeout: 30000,

    // 병렬 실행 최적화
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: process.env.CI ? 2 : 4,
        minThreads: 1,
        isolate: true,
        singleThread: false,
      },
    },

    // 커버리지 설정 강화
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'text-summary', 'cobertura'],
      reportsDirectory: './coverage',

      // 포함할 파일들
      include: [
        'convex/**/*.{ts,js}',
        'lib/**/*.{ts,js}',
        'components/**/*.{tsx,jsx}',
        'app/**/*.{tsx,jsx}',
        'hooks/**/*.{ts,tsx}',
        'utils/**/*.{ts,js}',
      ],

      // 제외할 파일들
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.*',
        'convex/_generated/',
        'convex_backup/',
        '.next/',
        'dist/',
        'types/',
        '**/*.d.ts',
        '**/*.test.*',
        '**/*.spec.*',
        '**/index.ts', // 단순 re-export 파일
        'app/layout.tsx', // Next.js 레이아웃
        'app/globals.css',
        'tailwind.config.ts',
        'next.config.js',
      ],

      // 높은 커버리지 기준 설정
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
        // 특정 파일별 기준
        'convex/**/*.ts': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
        'components/**/*.tsx': {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
      },

      // 커버리지 제외 패턴
      skipFull: false,
      all: true,
      clean: true,
    },

    // 글로벌 설정
    globals: true,

    // 리포터 설정
    reporter: process.env.CI
      ? ['verbose', 'junit', 'json']
      : ['verbose', 'html'],

    outputFile: {
      junit: './test-results/junit.xml',
      json: './test-results/results.json',
      html: './test-results/index.html',
    },

    // 실패 시 동작
    bail: process.env.CI ? 1 : 0, // CI에서는 첫 실패시 중단
    passWithNoTests: false,

    // 메모리 및 성능 최적화
    maxConcurrency: 5,
    forceRerunTriggers: ['**/package.json/**', '**/vitest.config.*/**'],

    // 워치 모드 설정
    watch: !process.env.CI,
    watchExclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],

    // 실험적 기능들
    experimentalVmThreads: true,

    // 테스트 분류를 위한 시퀀스 설정
    sequence: {
      shuffle: false,
      concurrent: true,
      hooks: 'parallel',
    },

    // 환경 변수
    env: {
      NODE_ENV: 'test',
      CONVEX_DEPLOYMENT: 'test',
      NEXT_PUBLIC_CONVEX_URL: 'http://localhost:3210',
      // 테스트용 API 키들 (실제 값은 .env.test에서)
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname),
      '@/components': resolve(__dirname, 'components'),
      '@/lib': resolve(__dirname, 'lib'),
      '@/convex': resolve(__dirname, 'convex'),
      '@/app': resolve(__dirname, 'app'),
      '@/hooks': resolve(__dirname, 'hooks'),
      '@/utils': resolve(__dirname, 'utils'),
      '@/types': resolve(__dirname, 'types'),
      '@/tests': resolve(__dirname, 'tests'),
    },
  },

  define: {
    // 테스트 환경에서 필요한 전역 변수들
    __TEST__: true,
    __VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});