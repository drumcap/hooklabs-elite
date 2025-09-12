import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 테스트 설정
 * 크로스 브라우저 E2E 테스트 및 시각적 회귀 테스트 설정
 */
export default defineConfig({
  // 테스트 파일 위치
  testDir: '__tests__/e2e',
  
  // 병렬 실행 설정
  fullyParallel: true,
  
  // CI에서 실패 시 재시도하지 않음
  forbidOnly: !!process.env.CI,
  
  // CI에서 3회까지 재시도
  retries: process.env.CI ? 3 : 0,
  
  // 로컬에서는 1개, CI에서는 병렬 실행
  workers: process.env.CI ? 1 : undefined,
  
  // 리포터 설정
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
  ],
  
  // 전역 설정
  use: {
    // 베이스 URL
    baseURL: 'http://localhost:3000',
    
    // 스크린샷 및 비디오 설정
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // 액션 대기 시간
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  // 테스트 실행 전 서버 시작 설정
  webServer: process.env.CI ? undefined : {
    command: 'bun dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  // 브라우저별 테스트 설정
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
    
    // 모바일 테스트
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // 태블릿 테스트
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro'] },
    },
  ],
  
  // 출력 디렉토리
  outputDir: 'playwright-results/',
});