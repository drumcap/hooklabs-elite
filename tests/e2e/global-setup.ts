import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');

  // 브라우저 시작
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // 기본 URL에 접근하여 애플리케이션이 실행 중인지 확인
    const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';
    
    console.log(`🔍 Checking if application is running at ${baseURL}`);
    
    await page.goto(baseURL, { timeout: 60000 });
    
    // 애플리케이션 로딩 완료 대기
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Application is running and accessible');

    // 테스트 사용자 로그인 상태 준비 (필요한 경우)
    if (process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
      console.log('🔐 Setting up test user authentication...');
      
      try {
        // 로그인 페이지로 이동
        await page.goto(`${baseURL}/sign-in`);
        
        // 로그인 폼 작성
        await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL);
        await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD);
        await page.click('[data-testid="sign-in-button"]');
        
        // 로그인 성공 확인
        await page.waitForURL('**/dashboard**', { timeout: 10000 });
        
        // 인증 상태 저장
        const storageState = await page.context().storageState();
        process.env.STORAGE_STATE = JSON.stringify(storageState);
        
        console.log('✅ Test user authentication completed');
      } catch (error) {
        console.warn('⚠️ Test user authentication failed, continuing without auth:', error);
      }
    }

    // 테스트 데이터 시드 (필요한 경우)
    if (process.env.SEED_TEST_DATA) {
      console.log('🌱 Seeding test data...');
      
      try {
        // API 호출로 테스트 데이터 생성
        const response = await page.request.post(`${baseURL}/api/test/seed`, {
          data: {
            createSocialAccounts: true,
            createPosts: true,
            createVariants: true,
          },
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
          },
        });
        
        if (response.ok()) {
          console.log('✅ Test data seeded successfully');
        } else {
          console.warn('⚠️ Test data seeding failed');
        }
      } catch (error) {
        console.warn('⚠️ Test data seeding error:', error);
      }
    }

    // 성능 기준점 설정
    console.log('📊 Setting up performance baselines...');
    
    // 메인 페이지 성능 측정
    const performanceTiming = await page.evaluate(() => {
      return {
        navigationStart: performance.timing.navigationStart,
        loadEventEnd: performance.timing.loadEventEnd,
        domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd,
      };
    });
    
    const loadTime = performanceTiming.loadEventEnd - performanceTiming.navigationStart;
    const domReadyTime = performanceTiming.domContentLoadedEventEnd - performanceTiming.navigationStart;
    
    console.log(`📈 Baseline performance metrics:`);
    console.log(`   Load time: ${loadTime}ms`);
    console.log(`   DOM ready time: ${domReadyTime}ms`);
    
    // 환경 변수로 성능 기준 저장
    process.env.BASELINE_LOAD_TIME = loadTime.toString();
    process.env.BASELINE_DOM_READY_TIME = domReadyTime.toString();

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ E2E test global setup completed successfully');
}

export default globalSetup;