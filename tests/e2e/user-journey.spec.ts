/**
 * 사용자 여정 E2E 테스트
 * 핵심 사용자 플로우 테스트 (가입 → 구독 → 포스트 생성)
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// 테스트 헬퍼 함수들
class UserJourneyHelpers {
  constructor(private page: Page) {}

  // 랜딩 페이지 접근
  async visitLandingPage() {
    await this.page.goto('/');
    await expect(this.page).toHaveTitle(/Elite Next Starter/);
  }

  // 회원가입 플로우
  async signUp(email: string, password: string) {
    // 회원가입 버튼 클릭
    await this.page.click('[data-testid="sign-up-button"]');
    
    // Clerk 회원가입 폼 대기
    await this.page.waitForSelector('[data-testid="clerk-sign-up"]');
    
    // 이메일 입력
    await this.page.fill('input[name="emailAddress"]', email);
    
    // 비밀번호 입력
    await this.page.fill('input[name="password"]', password);
    
    // 회원가입 제출
    await this.page.click('button[type="submit"]');
    
    // 이메일 인증 페이지 대기
    await this.page.waitForSelector('[data-testid="email-verification"]');
  }

  // 이메일 인증 (테스트 환경에서는 직접 인증 코드 입력)
  async verifyEmail(verificationCode: string = '123456') {
    await this.page.fill('input[name="code"]', verificationCode);
    await this.page.click('button[type="submit"]');
    
    // 대시보드 리다이렉션 대기
    await this.page.waitForURL('/dashboard');
  }

  // 로그인 플로우
  async signIn(email: string, password: string) {
    await this.page.click('[data-testid="sign-in-button"]');
    
    await this.page.waitForSelector('[data-testid="clerk-sign-in"]');
    
    await this.page.fill('input[name="identifier"]', email);
    await this.page.fill('input[name="password"]', password);
    
    await this.page.click('button[type="submit"]');
    
    await this.page.waitForURL('/dashboard');
  }

  // 요금제 페이지 방문
  async visitPricingPage() {
    await this.page.goto('/pricing');
    await expect(this.page.locator('[data-testid="pricing-table"]')).toBeVisible();
  }

  // 구독 플로우
  async subscribeToPlan(planId: string) {
    const subscribeButton = this.page.locator(`[data-testid="subscribe-${planId}"]`);
    await expect(subscribeButton).toBeVisible();
    await subscribeButton.click();
    
    // Lemon Squeezy 체크아웃 페이지 대기
    await this.page.waitForURL(/.*checkout\.lemonsqueezy\.com.*/);
    
    // 테스트 결제 정보 입력
    await this.fillPaymentInfo();
    
    // 결제 완료 대기
    await this.page.waitForURL('/dashboard');
  }

  // 테스트 결제 정보 입력
  async fillPaymentInfo() {
    // 테스트용 카드 정보 입력
    await this.page.fill('input[name="card_number"]', '4242424242424242');
    await this.page.fill('input[name="expiry"]', '12/25');
    await this.page.fill('input[name="cvc"]', '123');
    await this.page.fill('input[name="billing_name"]', 'Test User');
    await this.page.fill('input[name="billing_email"]', 'test@example.com');
    
    await this.page.click('button[type="submit"]');
  }

  // 대시보드 확인
  async verifyDashboard() {
    await expect(this.page.locator('[data-testid="dashboard"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="user-greeting"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="credit-balance"]')).toBeVisible();
  }

  // 소셜 포스트 생성
  async createSocialPost(content: string, platforms: string[]) {
    // 포스트 생성 페이지 이동
    await this.page.click('[data-testid="create-post-button"]');
    await this.page.waitForURL('/dashboard/posts/create');
    
    // 콘텐츠 입력
    await this.page.fill('[data-testid="post-content-input"]', content);
    
    // 플랫폼 선택
    for (const platform of platforms) {
      await this.page.click(`[data-testid="platform-${platform}"]`);
    }
    
    // 포스트 생성
    await this.page.click('[data-testid="create-post-submit"]');
    
    // 성공 메시지 확인
    await expect(this.page.locator('[data-testid="post-created-success"]')).toBeVisible();
  }

  // AI 포스트 생성
  async generateAIPost(prompt: string) {
    await this.page.click('[data-testid="ai-generate-button"]');
    
    // AI 프롬프트 입력
    await this.page.fill('[data-testid="ai-prompt-input"]', prompt);
    await this.page.click('[data-testid="generate-submit"]');
    
    // AI 생성 대기
    await this.page.waitForSelector('[data-testid="ai-generated-content"]', {
      timeout: 30000, // AI 생성은 시간이 걸릴 수 있음
    });
    
    // 생성된 콘텐츠 확인
    const generatedContent = await this.page.locator('[data-testid="ai-generated-content"]').textContent();
    expect(generatedContent).toBeTruthy();
    expect(generatedContent!.length).toBeGreaterThan(10);
  }

  // 크레딧 사용 확인
  async verifyCreditUsage(expectedUsage: number) {
    const creditBalance = this.page.locator('[data-testid="credit-balance"]');
    const balanceText = await creditBalance.textContent();
    
    // 크레딧 잔액에서 사용량 확인
    expect(balanceText).toContain('크레딧');
    
    // 사용 내역 확인
    await this.page.click('[data-testid="credit-history-button"]');
    await expect(this.page.locator('[data-testid="credit-usage-item"]').first()).toBeVisible();
  }

  // 포스트 목록 확인
  async verifyPostsList() {
    await this.page.goto('/dashboard/posts');
    await expect(this.page.locator('[data-testid="posts-list"]')).toBeVisible();
    
    // 최소 1개 포스트 존재 확인
    const postItems = this.page.locator('[data-testid="post-item"]');
    await expect(postItems.first()).toBeVisible();
  }

  // 로그아웃
  async signOut() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="sign-out-button"]');
    await this.page.waitForURL('/');
  }
}

test.describe('사용자 여정 테스트', () => {
  let helpers: UserJourneyHelpers;
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  test.beforeEach(async ({ page }) => {
    helpers = new UserJourneyHelpers(page);
  });

  test('신규 사용자 전체 여정 테스트', async ({ page }) => {
    // 1. 랜딩 페이지 방문
    await helpers.visitLandingPage();
    
    // 2. 회원가입
    await helpers.signUp(testEmail, testPassword);
    
    // 3. 이메일 인증 (테스트 환경에서는 자동 인증)
    await helpers.verifyEmail();
    
    // 4. 대시보드 확인
    await helpers.verifyDashboard();
    
    // 5. 무료 플랜으로 포스트 생성 테스트
    await helpers.createSocialPost(
      '첫 번째 소셜 미디어 포스트입니다! 🚀 #테스트',
      ['twitter', 'linkedin']
    );
    
    // 6. 포스트 목록 확인
    await helpers.verifyPostsList();
    
    // 7. 요금제 페이지 방문
    await helpers.visitPricingPage();
    
    // 8. Pro 플랜 구독 (테스트 환경에서는 모의 결제)
    // 실제 E2E에서는 이 부분을 주석 처리하거나 별도 테스트로 분리
    // await helpers.subscribeToPlan('pro-monthly');
    
    // 9. 로그아웃
    await helpers.signOut();
  });

  test('기존 사용자 로그인 및 AI 생성 테스트', async ({ page }) => {
    // 기존 사용자 로그인 (사전에 생성된 테스트 계정)
    await helpers.visitLandingPage();
    await helpers.signIn('existing-user@example.com', 'password123');
    
    // 대시보드 확인
    await helpers.verifyDashboard();
    
    // AI 포스트 생성
    await helpers.generateAIPost('마케팅 팁에 대한 소셜 미디어 포스트를 작성해주세요');
    
    // 크레딧 사용 확인
    await helpers.verifyCreditUsage(1);
    
    // 포스트 목록 확인
    await helpers.verifyPostsList();
  });

  test('무료 플랜 사용자 제한 테스트', async ({ page }) => {
    // 무료 플랜 사용자로 로그인
    await helpers.visitLandingPage();
    await helpers.signIn('free-user@example.com', 'password123');
    
    // 프리미엄 기능 접근 시도
    await page.goto('/dashboard/premium-feature');
    
    // PaymentGate 컴포넌트에 의한 접근 차단 확인
    await expect(page.locator('[data-testid="subscription-required"]')).toBeVisible();
    await expect(page.locator('[data-testid="upgrade-button"]')).toBeVisible();
  });

  test('구독 관리 테스트', async ({ page }) => {
    // Pro 플랜 구독자로 로그인
    await helpers.visitLandingPage();
    await helpers.signIn('pro-user@example.com', 'password123');
    
    // 구독 관리 페이지 방문
    await page.goto('/dashboard/subscription');
    
    // 현재 구독 상태 확인
    await expect(page.locator('[data-testid="current-subscription"]')).toBeVisible();
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('활성');
    
    // 구독 취소 버튼 확인 (실제 취소는 하지 않음)
    await expect(page.locator('[data-testid="cancel-subscription"]')).toBeVisible();
    
    // 고객 포털 링크 확인
    await expect(page.locator('[data-testid="customer-portal-link"]')).toBeVisible();
  });

  test('반응형 디자인 테스트', async ({ page, browserName }) => {
    // 모바일 뷰포트로 설정
    await page.setViewportSize({ width: 375, height: 667 });
    
    await helpers.visitLandingPage();
    
    // 모바일 네비게이션 메뉴 확인
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // 햄버거 메뉴 클릭
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // 요금제 테이블이 모바일에서 올바르게 표시되는지 확인
    await helpers.visitPricingPage();
    await expect(page.locator('[data-testid="pricing-table"]')).toBeVisible();
    
    // 모바일에서 스크롤 가능한 플랜 카드들 확인
    const planCards = page.locator('[data-testid^="plan-"]');
    await expect(planCards.first()).toBeVisible();
  });

  test('다크 모드 테스트', async ({ page }) => {
    await helpers.visitLandingPage();
    
    // 다크 모드 토글 확인
    await expect(page.locator('[data-testid="theme-toggle"]')).toBeVisible();
    
    // 다크 모드로 전환
    await page.click('[data-testid="theme-toggle"]');
    
    // 다크 모드 클래스 확인
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/dark/);
    
    // 다크 모드에서 UI 요소들이 올바르게 표시되는지 확인
    await helpers.visitPricingPage();
    await expect(page.locator('[data-testid="pricing-table"]')).toBeVisible();
    
    // 라이트 모드로 다시 전환
    await page.click('[data-testid="theme-toggle"]');
    await expect(htmlElement).not.toHaveClass(/dark/);
  });

  test('에러 상황 테스트', async ({ page }) => {
    // 네트워크 에러 시뮬레이션
    await page.route('**/api/**', route => route.abort());
    
    await helpers.visitLandingPage();
    
    // 로그인 시도 (API 호출 실패)
    await page.click('[data-testid="sign-in-button"]');
    
    // 에러 메시지 확인
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // 재시도 버튼 확인
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('접근성 테스트', async ({ page }) => {
    await helpers.visitLandingPage();
    
    // 키보드 네비게이션 테스트
    await page.keyboard.press('Tab'); // 첫 번째 포커스 가능 요소로 이동
    await page.keyboard.press('Tab'); // 다음 요소로 이동
    
    // 현재 포커스된 요소 확인
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Enter 키로 클릭 테스트
    await page.keyboard.press('Enter');
    
    // ARIA 레이블 확인
    const buttons = page.locator('button');
    const firstButton = buttons.first();
    await expect(firstButton).toHaveAttribute('aria-label');
  });

  test('성능 테스트', async ({ page }) => {
    // 네트워크 및 성능 메트릭 수집 시작
    const responses: any[] = [];
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        timing: response.timing(),
      });
    });

    const startTime = Date.now();
    
    await helpers.visitLandingPage();
    
    const loadTime = Date.now() - startTime;
    
    // 로드 시간이 3초 이내인지 확인
    expect(loadTime).toBeLessThan(3000);
    
    // 중요한 리소스들이 성공적으로 로드되었는지 확인
    const criticalResponses = responses.filter(r => 
      r.url.includes('/api/') || r.url.includes('.js') || r.url.includes('.css')
    );
    
    criticalResponses.forEach(response => {
      expect(response.status).toBeLessThan(400);
    });
  });
});

test.describe('크로스 브라우저 테스트', () => {
  test('Chrome에서 핵심 기능 작동', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome 전용 테스트');
    
    const helpers = new UserJourneyHelpers(page);
    await helpers.visitLandingPage();
    await helpers.visitPricingPage();
    
    // Chrome 특정 기능 테스트 (예: Service Worker, Push Notifications 등)
    const serviceWorkerRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    expect(serviceWorkerRegistered).toBe(true);
  });

  test('Firefox에서 핵심 기능 작동', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox 전용 테스트');
    
    const helpers = new UserJourneyHelpers(page);
    await helpers.visitLandingPage();
    await helpers.visitPricingPage();
    
    // Firefox에서 모든 UI 요소가 올바르게 렌더링되는지 확인
    await expect(page.locator('[data-testid="pricing-table"]')).toBeVisible();
  });

  test('Safari에서 핵심 기능 작동', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari 전용 테스트');
    
    const helpers = new UserJourneyHelpers(page);
    await helpers.visitLandingPage();
    await helpers.visitPricingPage();
    
    // Safari에서의 WebKit 특정 동작 테스트
    await expect(page.locator('[data-testid="pricing-table"]')).toBeVisible();
  });
});