/**
 * 소셜 미디어 자동화 플랫폼 E2E 테스트
 * 전체 사용자 워크플로우 시나리오 테스트 (Playwright)
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// 테스트 데이터
const testPersona = {
  name: 'AI 스타트업 창업자',
  role: '스타트업 CEO',
  tone: '전문적이고 혁신적인',
  interests: ['AI', '스타트업', '기술혁신'],
  expertise: ['제품개발', '비즈니스전략', 'AI기술'],
  description: '혁신적인 AI 기술로 세상을 바꾸는 스타트업을 운영하는 CEO입니다.'
};

const testContent = '🚀 새로운 AI 기능을 출시했습니다! 사용자 경험이 획기적으로 개선되었어요.';

// 페이지 객체 모델
class SocialMediaAutomationPage {
  constructor(private page: Page) {}

  // 로그인 페이지
  async navigateToLogin() {
    await this.page.goto('/sign-in');
    await expect(this.page).toHaveTitle(/로그인/);
  }

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/dashboard');
  }

  // 대시보드
  async navigateToDashboard() {
    await this.page.goto('/dashboard');
    await expect(this.page.locator('[data-testid="dashboard-title"]')).toBeVisible();
  }

  async getDashboardStats() {
    const totalPosts = await this.page.textContent('[data-testid="total-posts-count"]');
    const activePosts = await this.page.textContent('[data-testid="active-posts-count"]');
    const scheduledPosts = await this.page.textContent('[data-testid="scheduled-posts-count"]');
    
    return {
      total: parseInt(totalPosts || '0'),
      active: parseInt(activePosts || '0'),
      scheduled: parseInt(scheduledPosts || '0')
    };
  }

  // 페르소나 관리
  async navigateToPersonas() {
    await this.page.click('[data-testid="personas-nav-link"]');
    await expect(this.page.locator('[data-testid="personas-page-title"]')).toBeVisible();
  }

  async createPersona(persona: typeof testPersona) {
    await this.page.click('[data-testid="create-persona-button"]');
    
    // 기본 정보 입력
    await this.page.fill('[data-testid="persona-name-input"]', persona.name);
    await this.page.fill('[data-testid="persona-role-input"]', persona.role);
    await this.page.fill('[data-testid="persona-tone-input"]', persona.tone);
    await this.page.fill('[data-testid="persona-description-input"]', persona.description);

    // 관심사 추가
    for (const interest of persona.interests) {
      await this.page.fill('[data-testid="interest-input"]', interest);
      await this.page.click('[data-testid="add-interest-button"]');
    }

    // 전문분야 추가
    for (const skill of persona.expertise) {
      await this.page.fill('[data-testid="expertise-input"]', skill);
      await this.page.click('[data-testid="add-expertise-button"]');
    }

    // 저장
    await this.page.click('[data-testid="save-persona-button"]');
    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible();
  }

  async getPersonaList() {
    const personas = await this.page.locator('[data-testid="persona-card"]').all();
    return personas.length;
  }

  async selectPersona(personaName: string) {
    await this.page.click(`[data-testid="persona-card"]:has-text("${personaName}")`);
  }

  async togglePersonaStatus(personaName: string) {
    const personaCard = this.page.locator(`[data-testid="persona-card"]:has-text("${personaName}")`);
    await personaCard.locator('[data-testid="persona-toggle-switch"]').click();
  }

  // 콘텐츠 에디터
  async navigateToContentEditor() {
    await this.page.click('[data-testid="content-editor-nav-link"]');
    await expect(this.page.locator('[data-testid="content-editor-title"]')).toBeVisible();
  }

  async createPost(content: string, platforms: string[] = ['twitter']) {
    // 페르소나 선택
    await this.page.click('[data-testid="persona-selector"]');
    await this.page.click('[data-testid="persona-option"]:first-child');

    // 콘텐츠 입력
    await this.page.fill('[data-testid="content-textarea"]', content);

    // 플랫폼 선택
    for (const platform of platforms) {
      await this.page.check(`[data-testid="platform-${platform}"]`);
    }

    // 게시물 생성
    await this.page.click('[data-testid="create-post-button"]');
    await expect(this.page.locator('[data-testid="post-created-message"]')).toBeVisible();
  }

  async generateVariants() {
    await this.page.click('[data-testid="generate-variants-button"]');
    await expect(this.page.locator('[data-testid="variants-loading"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="variants-loading"]')).toBeHidden({ timeout: 30000 });
    
    const variants = await this.page.locator('[data-testid="variant-card"]').all();
    return variants.length;
  }

  async selectBestVariant() {
    const variants = await this.page.locator('[data-testid="variant-card"]').all();
    if (variants.length > 0) {
      // 첫 번째 변형의 점수 확인
      const firstVariant = variants[0];
      await firstVariant.locator('[data-testid="select-variant-button"]').click();
      await expect(this.page.locator('[data-testid="variant-selected-message"]')).toBeVisible();
    }
  }

  async getContentScore() {
    const scoreElement = await this.page.locator('[data-testid="overall-score"]');
    const scoreText = await scoreElement.textContent();
    return parseInt(scoreText?.match(/\d+/)?.[0] || '0');
  }

  // 스케줄러
  async navigateToScheduler() {
    await this.page.click('[data-testid="scheduler-nav-link"]');
    await expect(this.page.locator('[data-testid="scheduler-title"]')).toBeVisible();
  }

  async schedulePost(dateTime: string) {
    await this.page.click('[data-testid="schedule-post-button"]');
    
    // 날짜/시간 선택
    await this.page.fill('[data-testid="schedule-datetime-input"]', dateTime);
    
    // 스케줄 확정
    await this.page.click('[data-testid="confirm-schedule-button"]');
    await expect(this.page.locator('[data-testid="schedule-success-message"]')).toBeVisible();
  }

  async getScheduledPosts() {
    const posts = await this.page.locator('[data-testid="scheduled-post-item"]').all();
    return posts.length;
  }

  async cancelScheduledPost(postTitle: string) {
    const postItem = this.page.locator(`[data-testid="scheduled-post-item"]:has-text("${postTitle}")`);
    await postItem.locator('[data-testid="cancel-schedule-button"]').click();
    
    // 확인 대화상자
    await this.page.click('[data-testid="confirm-cancel-button"]');
    await expect(this.page.locator('[data-testid="schedule-canceled-message"]')).toBeVisible();
  }

  // 계정 연결
  async navigateToAccounts() {
    await this.page.click('[data-testid="accounts-nav-link"]');
    await expect(this.page.locator('[data-testid="accounts-title"]')).toBeVisible();
  }

  async connectSocialAccount(platform: 'twitter' | 'threads' | 'linkedin') {
    await this.page.click(`[data-testid="connect-${platform}-button"]`);
    
    // OAuth 플로우 시뮬레이션 (실제 테스트에서는 모킹)
    await this.page.waitForURL('**/oauth/**');
    await this.page.click('[data-testid="mock-oauth-approve"]');
    await this.page.waitForURL('/dashboard/accounts');
    
    await expect(this.page.locator(`[data-testid="${platform}-connected"]`)).toBeVisible();
  }

  async getConnectedAccounts() {
    const accounts = await this.page.locator('[data-testid="connected-account"]').all();
    const accountData = [];
    
    for (const account of accounts) {
      const platform = await account.getAttribute('data-platform');
      const username = await account.locator('[data-testid="account-username"]').textContent();
      const status = await account.locator('[data-testid="account-status"]').textContent();
      
      accountData.push({ platform, username, status });
    }
    
    return accountData;
  }

  // 게시물 발행
  async publishPost() {
    await this.page.click('[data-testid="publish-now-button"]');
    
    // 발행 확인 대화상자
    await this.page.click('[data-testid="confirm-publish-button"]');
    
    // 발행 완료 대기
    await expect(this.page.locator('[data-testid="publish-success-message"]')).toBeVisible();
  }

  async getPublishedPosts() {
    const posts = await this.page.locator('[data-testid="published-post-item"]').all();
    return posts.length;
  }

  // 성과 분석
  async navigateToAnalytics() {
    await this.page.click('[data-testid="analytics-nav-link"]');
    await expect(this.page.locator('[data-testid="analytics-title"]')).toBeVisible();
  }

  async getPostMetrics(postId: string) {
    const postCard = this.page.locator(`[data-testid="post-metrics-${postId}"]`);
    
    const views = await postCard.locator('[data-testid="views-count"]').textContent();
    const likes = await postCard.locator('[data-testid="likes-count"]').textContent();
    const shares = await postCard.locator('[data-testid="shares-count"]').textContent();
    
    return {
      views: parseInt(views || '0'),
      likes: parseInt(likes || '0'),
      shares: parseInt(shares || '0')
    };
  }

  // 크레딧 관리
  async navigateToCredits() {
    await this.page.click('[data-testid="credits-nav-link"]');
    await expect(this.page.locator('[data-testid="credits-title"]')).toBeVisible();
  }

  async getCreditBalance() {
    const balanceText = await this.page.textContent('[data-testid="credit-balance"]');
    return parseInt(balanceText?.match(/\d+/)?.[0] || '0');
  }

  async purchaseCredits(amount: number) {
    await this.page.click('[data-testid="purchase-credits-button"]');
    await this.page.fill('[data-testid="credit-amount-input"]', amount.toString());
    await this.page.click('[data-testid="confirm-purchase-button"]');
    
    // 결제 처리 대기 (모킹된 결제)
    await expect(this.page.locator('[data-testid="purchase-success-message"]')).toBeVisible();
  }

  // 유틸리티 메서드
  async waitForLoading() {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }
}

// 테스트 설정
test.describe('소셜 미디어 자동화 플랫폼 E2E 테스트', () => {
  let context: BrowserContext;
  let page: Page;
  let app: SocialMediaAutomationPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      // 테스트용 뷰포트 설정
      viewport: { width: 1920, height: 1080 },
      // 모바일 테스트를 위한 옵션
      // ...devices['iPhone 13'],
    });
  });

  test.beforeEach(async () => {
    page = await context.newPage();
    app = new SocialMediaAutomationPage(page);

    // API 모킹 설정
    await page.route('**/api/convex/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} })
      });
    });

    await page.route('**/api/social/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('사용자 인증', () => {
    test('로그인 플로우가 정상적으로 작동해야 함', async () => {
      await app.navigateToLogin();
      await app.login('test@example.com', 'password123');
      
      // 대시보드로 리다이렉트 확인
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('로그아웃 기능이 정상적으로 작동해야 함', async () => {
      await app.navigateToLogin();
      await app.login('test@example.com', 'password123');
      
      // 로그아웃
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // 로그인 페이지로 리다이렉트 확인
      await expect(page).toHaveURL('/sign-in');
    });
  });

  test.describe('페르소나 관리', () => {
    test.beforeEach(async () => {
      await app.navigateToLogin();
      await app.login('test@example.com', 'password123');
    });

    test('새 페르소나를 생성할 수 있어야 함', async () => {
      await app.navigateToPersonas();
      const initialCount = await app.getPersonaList();
      
      await app.createPersona(testPersona);
      
      const newCount = await app.getPersonaList();
      expect(newCount).toBe(initialCount + 1);
      
      // 생성된 페르소나가 목록에 표시되는지 확인
      await expect(page.locator(`text=${testPersona.name}`)).toBeVisible();
    });

    test('페르소나 상태를 토글할 수 있어야 함', async () => {
      await app.navigateToPersonas();
      await app.createPersona(testPersona);
      
      // 활성화 상태 토글
      await app.togglePersonaStatus(testPersona.name);
      
      // 상태 변경 확인
      const personaCard = page.locator(`[data-testid="persona-card"]:has-text("${testPersona.name}")`);
      await expect(personaCard.locator('[data-testid="status-inactive"]')).toBeVisible();
    });
  });

  test.describe('콘텐츠 생성 및 관리', () => {
    test.beforeEach(async () => {
      await app.navigateToLogin();
      await app.login('test@example.com', 'password123');
      
      // 테스트용 페르소나 생성
      await app.navigateToPersonas();
      await app.createPersona(testPersona);
    });

    test('새 게시물을 생성할 수 있어야 함', async () => {
      await app.navigateToContentEditor();
      await app.createPost(testContent, ['twitter', 'threads']);
      
      // 게시물 생성 성공 메시지 확인
      await expect(page.locator('[data-testid="post-created-message"]')).toBeVisible();
      
      // 콘텐츠가 에디터에 표시되는지 확인
      const contentTextarea = page.locator('[data-testid="content-textarea"]');
      await expect(contentTextarea).toHaveValue(testContent);
    });

    test('AI 변형을 생성하고 선택할 수 있어야 함', async () => {
      await app.navigateToContentEditor();
      await app.createPost(testContent);
      
      const variantCount = await app.generateVariants();
      expect(variantCount).toBeGreaterThan(0);
      
      await app.selectBestVariant();
      
      // 변형이 선택되었다는 피드백 확인
      await expect(page.locator('[data-testid="variant-selected-message"]')).toBeVisible();
    });

    test('콘텐츠 점수를 확인할 수 있어야 함', async () => {
      await app.navigateToContentEditor();
      await app.createPost(testContent);
      
      const score = await app.getContentScore();
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
      
      // 점수 상세 정보 확인
      await expect(page.locator('[data-testid="score-breakdown"]')).toBeVisible();
    });
  });

  test.describe('스케줄링', () => {
    test.beforeEach(async () => {
      await app.navigateToLogin();
      await app.login('test@example.com', 'password123');
      
      // 테스트용 콘텐츠 생성
      await app.navigateToPersonas();
      await app.createPersona(testPersona);
      await app.navigateToContentEditor();
      await app.createPost(testContent);
    });

    test('게시물을 예약할 수 있어야 함', async () => {
      await app.navigateToScheduler();
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const scheduleTime = tomorrow.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM 형식
      
      await app.schedulePost(scheduleTime);
      
      // 스케줄 목록에 추가되었는지 확인
      const scheduledCount = await app.getScheduledPosts();
      expect(scheduledCount).toBeGreaterThan(0);
    });

    test('예약된 게시물을 취소할 수 있어야 함', async () => {
      await app.navigateToScheduler();
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const scheduleTime = tomorrow.toISOString().slice(0, 16);
      
      await app.schedulePost(scheduleTime);
      const initialCount = await app.getScheduledPosts();
      
      await app.cancelScheduledPost(testContent.substring(0, 20));
      
      const newCount = await app.getScheduledPosts();
      expect(newCount).toBe(initialCount - 1);
    });
  });

  test.describe('소셜 계정 연결', () => {
    test.beforeEach(async () => {
      await app.navigateToLogin();
      await app.login('test@example.com', 'password123');
    });

    test('Twitter 계정을 연결할 수 있어야 함', async () => {
      await app.navigateToAccounts();
      await app.connectSocialAccount('twitter');
      
      const accounts = await app.getConnectedAccounts();
      const twitterAccount = accounts.find(account => account.platform === 'twitter');
      
      expect(twitterAccount).toBeDefined();
      expect(twitterAccount?.status).toContain('연결됨');
    });

    test('여러 플랫폼 계정을 동시에 연결할 수 있어야 함', async () => {
      await app.navigateToAccounts();
      
      await app.connectSocialAccount('twitter');
      await app.connectSocialAccount('threads');
      
      const accounts = await app.getConnectedAccounts();
      expect(accounts.length).toBe(2);
      
      const platforms = accounts.map(account => account.platform);
      expect(platforms).toContain('twitter');
      expect(platforms).toContain('threads');
    });
  });

  test.describe('게시물 발행', () => {
    test.beforeEach(async () => {
      await app.navigateToLogin();
      await app.login('test@example.com', 'password123');
      
      // 필요한 설정들 준비
      await app.navigateToPersonas();
      await app.createPersona(testPersona);
      await app.navigateToAccounts();
      await app.connectSocialAccount('twitter');
      await app.navigateToContentEditor();
      await app.createPost(testContent);
    });

    test('게시물을 즉시 발행할 수 있어야 함', async () => {
      const initialCount = await app.getPublishedPosts();
      
      await app.publishPost();
      
      const newCount = await app.getPublishedPosts();
      expect(newCount).toBe(initialCount + 1);
    });

    test('발행된 게시물의 상태가 올바르게 업데이트되어야 함', async () => {
      await app.publishPost();
      
      // 게시물 상태 확인
      await expect(page.locator('[data-testid="post-status-published"]')).toBeVisible();
      
      // 발행 시간 확인
      await expect(page.locator('[data-testid="published-at"]')).toBeVisible();
    });
  });

  test.describe('통합 워크플로우', () => {
    test('전체 콘텐츠 생성 → 최적화 → 스케줄링 → 발행 플로우', async () => {
      // 1. 로그인
      await app.navigateToLogin();
      await app.login('test@example.com', 'password123');
      
      // 2. 페르소나 생성
      await app.navigateToPersonas();
      await app.createPersona(testPersona);
      
      // 3. 소셜 계정 연결
      await app.navigateToAccounts();
      await app.connectSocialAccount('twitter');
      
      // 4. 콘텐츠 생성 및 최적화
      await app.navigateToContentEditor();
      await app.createPost(testContent);
      
      const variantCount = await app.generateVariants();
      expect(variantCount).toBeGreaterThan(0);
      
      await app.selectBestVariant();
      
      const score = await app.getContentScore();
      expect(score).toBeGreaterThan(50); // 양질의 콘텐츠 기준
      
      // 5. 스케줄링
      await app.navigateToScheduler();
      const futureTime = new Date();
      futureTime.setHours(futureTime.getHours() + 1);
      const scheduleTime = futureTime.toISOString().slice(0, 16);
      
      await app.schedulePost(scheduleTime);
      
      // 6. 대시보드에서 전체 현황 확인
      await app.navigateToDashboard();
      const stats = await app.getDashboardStats();
      
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.scheduled).toBeGreaterThan(0);
      
      // 전체 플로우 완료 스크린샷
      await app.takeScreenshot('complete-workflow');
    });

    test('크레딧 시스템이 정상적으로 작동해야 함', async () => {
      await app.navigateToLogin();
      await app.login('test@example.com', 'password123');
      
      // 초기 크레딧 확인
      await app.navigateToCredits();
      const initialCredits = await app.getCreditBalance();
      
      // 크레딧 구매
      await app.purchaseCredits(100);
      const afterPurchase = await app.getCreditBalance();
      expect(afterPurchase).toBe(initialCredits + 100);
      
      // AI 기능 사용으로 크레딧 차감 테스트
      await app.navigateToPersonas();
      await app.createPersona(testPersona);
      await app.navigateToContentEditor();
      await app.createPost(testContent);
      
      // 변형 생성 (크레딧 사용)
      await app.generateVariants();
      
      // 크레딧이 차감되었는지 확인
      await app.navigateToCredits();
      const afterUsage = await app.getCreditBalance();
      expect(afterUsage).toBeLessThan(afterPurchase);
    });
  });

  test.describe('성능 및 사용성', () => {
    test.beforeEach(async () => {
      await app.navigateToLogin();
      await app.login('test@example.com', 'password123');
    });

    test('페이지 로딩 시간이 합리적이어야 함', async () => {
      const startTime = Date.now();
      
      await app.navigateToContentEditor();
      await app.waitForLoading();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 3초 이내
    });

    test('대량의 콘텐츠를 처리할 수 있어야 함', async () => {
      await app.navigateToPersonas();
      await app.createPersona(testPersona);
      
      // 여러 게시물 생성
      await app.navigateToContentEditor();
      
      for (let i = 1; i <= 5; i++) {
        await app.createPost(`테스트 게시물 ${i}: ${testContent}`);
        
        // 각 게시물에 대한 처리 시간 체크
        const startTime = Date.now();
        await app.generateVariants();
        const generationTime = Date.now() - startTime;
        
        expect(generationTime).toBeLessThan(10000); // 10초 이내
      }
    });

    test('모바일 반응형이 정상적으로 작동해야 함', async ({ browser }) => {
      // 모바일 뷰포트로 테스트
      const mobileContext = await browser.newContext({
        viewport: { width: 375, height: 667 }, // iPhone SE
      });
      
      const mobilePage = await mobileContext.newPage();
      const mobileApp = new SocialMediaAutomationPage(mobilePage);
      
      await mobileApp.navigateToLogin();
      await mobileApp.login('test@example.com', 'password123');
      
      // 모바일에서 주요 기능들이 접근 가능한지 확인
      await expect(mobilePage.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      await mobilePage.click('[data-testid="mobile-menu-button"]');
      await expect(mobilePage.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
      
      await mobileContext.close();
    });
  });

  test.describe('에러 처리 및 복구', () => {
    test.beforeEach(async () => {
      await app.navigateToLogin();
      await app.login('test@example.com', 'password123');
    });

    test('API 에러 시 적절한 에러 메시지를 표시해야 함', async () => {
      // API 에러 시뮬레이션
      await page.route('**/api/convex/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      await app.navigateToPersonas();
      
      // 에러 상황에서 사용자 친화적인 메시지 확인
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('문제가 발생했습니다');
    });

    test('네트워크 연결 문제 시 오프라인 모드를 제공해야 함', async () => {
      // 네트워크 차단
      await context.setOffline(true);
      
      await app.navigateToContentEditor();
      
      // 오프라인 상태 표시 확인
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // 로컬 저장 기능 확인 (초안 저장)
      await page.fill('[data-testid="content-textarea"]', '오프라인 테스트 콘텐츠');
      await page.click('[data-testid="save-draft-button"]');
      
      await expect(page.locator('[data-testid="draft-saved-message"]')).toBeVisible();
      
      // 네트워크 복구
      await context.setOffline(false);
    });

    test('세션 만료 시 자동 로그아웃 및 재로그인 유도', async () => {
      // 세션 만료 시뮬레이션
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' })
        });
      });

      await app.navigateToContentEditor();
      
      // 자동 로그아웃 확인
      await expect(page).toHaveURL('/sign-in');
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
    });
  });
});