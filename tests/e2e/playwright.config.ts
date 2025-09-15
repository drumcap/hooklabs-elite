import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* 병렬 테스트 실행 */
  fullyParallel: true,
  
  /* CI에서 빌드 실패 시 테스트 실행 안 함 */
  forbidOnly: !!process.env.CI,
  
  /* CI에서 재시도 횟수 */
  retries: process.env.CI ? 2 : 0,
  
  /* 병렬 실행 워커 수 */
  workers: process.env.CI ? 1 : undefined,
  
  /* 테스트 리포터 설정 */
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],
  
  /* 공용 테스트 설정 */
  use: {
    /* 베이스 URL */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* 액션 간 대기 시간 */
    actionTimeout: 15000,
    
    /* 탐색 타임아웃 */
    navigationTimeout: 30000,
    
    /* 실패 시 스크린샷 저장 */
    screenshot: 'only-on-failure',
    
    /* 실패 시 비디오 저장 */
    video: 'retain-on-failure',
    
    /* 실패 시 트레이스 저장 */
    trace: 'retain-on-failure',
    
    /* 사용자 에이전트 */
    userAgent: 'Social Media Advanced Features E2E Test',
  },

  /* 다양한 브라우저/디바이스 환경에서 테스트 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* 모바일 디바이스 테스트 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* 태블릿 테스트 */
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },

    /* Microsoft Edge */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    /* Google Chrome 브랜드 채널 */
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  /* 로컬 개발 서버 실행 */
  webServer: process.env.CI ? undefined : {
    command: 'bun dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2분 대기
  },

  /* 테스트 출력 디렉터리 */
  outputDir: 'test-results/',
  
  /* 전역 설정 */
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),
  
  /* 테스트 타임아웃 (30초) */
  timeout: 30 * 1000,
  
  /* expect 타임아웃 (10초) */
  expect: {
    timeout: 10 * 1000,
  },

  /* 실험적 기능 */
  experimentalCTComponent: './tests/e2e/component-testing.config.ts',
});