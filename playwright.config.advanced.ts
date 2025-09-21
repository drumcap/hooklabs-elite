import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright 고급 설정
 * E2E, 성능, 접근성 테스트를 위한 포괄적인 설정
 */
export default defineConfig({
  testDir: './tests/e2e',

  // 테스트 실행 설정
  timeout: 60 * 1000, // 60초
  expect: {
    timeout: 10 * 1000, // 10초
  },

  // 테스트 병렬 실행
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,

  // 실패 설정
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // 리포터 설정
  reporter: process.env.CI
    ? [
        ['list'],
        ['junit', { outputFile: 'test-results/e2e-results.xml' }],
        ['json', { outputFile: 'test-results/e2e-results.json' }],
        ['html', { open: 'never', outputFolder: 'test-results/html-report' }]
      ]
    : [
        ['list'],
        ['html', { open: 'on-failure' }]
      ],

  // 출력 디렉토리
  outputDir: 'test-results/screenshots',

  // 글로벌 설정
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  use: {
    // 기본 URL
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // 브라우저 컨텍스트 설정
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // 스크린샷 및 비디오
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    // 네트워크 설정
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },

    // 로케일 설정
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',

    // 쿠키 및 스토리지 설정
    storageState: undefined, // 각 테스트마다 초기화
  },

  // 프로젝트별 설정
  projects: [
    // 설정 프로젝트 (로그인 상태 등)
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/,
    },

    // 데스크톱 브라우저
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },

    // 모바일 브라우저
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
    },

    // 태블릿
    {
      name: 'tablet',
      use: { ...devices['iPad Pro'] },
      dependencies: ['setup'],
    },

    // 성능 테스트 (Chrome만)
    {
      name: 'performance',
      testDir: './tests/performance',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
      dependencies: ['setup'],
    },

    // 접근성 테스트
    {
      name: 'accessibility',
      testDir: './tests/accessibility',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
      dependencies: ['setup'],
    },

    // 시각적 회귀 테스트
    {
      name: 'visual-regression',
      testDir: './tests/visual',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
      dependencies: ['setup'],
    },

    // API 테스트 (헤드리스)
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api',
      },
    },
  ],

  // 웹서버 설정 (로컬 개발용)
  webServer: process.env.CI ? undefined : {
    command: 'bun dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      NODE_ENV: 'test',
    },
  },

  // 테스트 매칭 패턴
  testMatch: [
    '**/*.e2e.{js,ts}',
    '**/*.spec.{js,ts}',
    '**/*.test.{js,ts}',
  ],

  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
  ],
});