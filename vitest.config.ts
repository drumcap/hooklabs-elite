/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // 테스트 환경 설정 - 브라우저 환경 시뮬레이션
    environment: 'happy-dom',
    
    // 전역 설정 파일
    setupFiles: ['./tests/setup/test-setup.ts'],
    
    // 테스트 파일 패턴
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'tests/e2e/**/*'],
    
    // 테스트 실행 시간 제한 (기본: 5초)
    testTimeout: 10000,
    
    // 병렬 실행 설정
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        isolate: true,
      },
    },
    
    // 커버리지 설정
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'convex/**/*.{ts,js}',
        'lib/**/*.{ts,js}',
        'components/**/*.{tsx,jsx}',
        'app/**/*.{tsx,jsx}',
      ],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.*',
        'convex/_generated/',
        '.next/',
        'dist/',
        'types/',
        '**/*.d.ts',
        '**/*.test.*',
        '**/*.spec.*',
      ],
      // 80% 커버리지 목표 설정
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    
    // 글로벌 설정
    globals: true,
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname),
      '@/components': resolve(__dirname, 'components'),
      '@/lib': resolve(__dirname, 'lib'),
      '@/convex': resolve(__dirname, 'convex'),
      '@/app': resolve(__dirname, 'app'),
    },
  },
});