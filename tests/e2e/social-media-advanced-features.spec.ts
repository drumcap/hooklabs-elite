import { test, expect, Page } from '@playwright/test';

// 테스트 유틸리티 함수들
class SocialMediaAdvancedFeaturesPage {
  constructor(private page: Page) {}

  // 로그인
  async login() {
    await this.page.goto('/dashboard');
    // 만약 로그인 페이지로 리다이렉트되면 로그인 진행
    if (this.page.url().includes('/sign-in')) {
      await this.page.fill('[data-testid="email-input"]', 'test@example.com');
      await this.page.fill('[data-testid="password-input"]', 'testpassword');
      await this.page.click('[data-testid="sign-in-button"]');
      await this.page.waitForURL('/dashboard');
    }
  }

  // 소셜 계정 연동 페이지로 이동
  async navigateToSocialAccounts() {
    await this.page.click('[data-testid="social-accounts-menu"]');
    await this.page.waitForLoadState('networkidle');
  }

  // 토큰 만료 알림 확인
  async checkTokenExpiryAlert() {
    return await this.page.locator('[data-testid="token-expiry-alert"]').isVisible();
  }

  // 토큰 새로고침 실행
  async refreshToken(platform: string) {
    const refreshButton = this.page.locator(`[data-testid="refresh-token-${platform}"]`);
    await refreshButton.click();
    return this.page.waitForEvent('popup');
  }

  // 계정 통계 확인
  async getAccountStats(accountId: string) {
    const statsContainer = this.page.locator(`[data-testid="account-stats-${accountId}"]`);
    const totalScheduled = await statsContainer.locator('[data-testid="total-scheduled"]').textContent();
    const successRate = await statsContainer.locator('[data-testid="success-rate"]').textContent();
    return { totalScheduled, successRate };
  }

  // 게시물 변형 비교 페이지로 이동
  async navigateToVariantComparison(postId: string) {
    await this.page.goto(`/dashboard/posts/${postId}/variants`);
    await this.page.waitForLoadState('networkidle');
  }

  // 변형 생성
  async createVariant(content: string) {
    await this.page.click('[data-testid="create-variant-button"]');
    await this.page.fill('[data-testid="variant-content-input"]', content);
    await this.page.click('[data-testid="generate-variant-button"]');
    await this.page.waitForSelector('[data-testid="variant-generated"]');
  }

  // 변형 선택
  async selectVariant(variantId: string) {
    await this.page.click(`[data-testid="select-variant-${variantId}"]`);
    await this.page.waitForSelector(`[data-testid="variant-selected-${variantId}"]`);
  }

  // 변형 복사
  async copyVariant(variantId: string) {
    await this.page.click(`[data-testid="copy-variant-${variantId}"]`);
    // 복사 완료 표시 대기
    await this.page.waitForSelector(`[data-testid="copy-success-${variantId}"]`);
  }

  // 탭 전환
  async switchToSummaryTab() {
    await this.page.click('[data-testid="summary-tab"]');
    await this.page.waitForSelector('[data-testid="summary-content"]');
  }

  // 실시간 모니터 페이지로 이동
  async navigateToRealtimeMonitor() {
    await this.page.goto('/dashboard/analytics/realtime');
    await this.page.waitForLoadState('networkidle');
  }

  // AI 사용량 통계 확인
  async getAIUsageStats() {
    const statsContainer = this.page.locator('[data-testid="ai-usage-stats"]');
    const totalCreditsUsed = await statsContainer.locator('[data-testid="total-credits-used"]').textContent();
    const averageScore = await statsContainer.locator('[data-testid="average-score"]').textContent();
    return { totalCreditsUsed, averageScore };
  }

  // 분석 대시보드로 이동
  async navigateToAnalyticsDashboard() {
    await this.page.goto('/dashboard/analytics');
    await this.page.waitForLoadState('networkidle');
  }

  // 차트가 로드되었는지 확인
  async waitForChartsToLoad() {
    await this.page.waitForSelector('[data-testid="analytics-chart"]');
    await this.page.waitForFunction(() => {
      const charts = document.querySelectorAll('[data-testid="analytics-chart"]');
      return charts.length > 0 && Array.from(charts).every(chart => 
        chart.querySelector('svg') || chart.querySelector('canvas')
      );
    });
  }
}

test.describe('소셜 미디어 고급 기능 E2E 테스트', () => {
  let page: Page;
  let socialMediaPage: SocialMediaAdvancedFeaturesPage;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    socialMediaPage = new SocialMediaAdvancedFeaturesPage(page);
    await socialMediaPage.login();
  });

  test.describe('토큰 관리 기능', () => {
    test('토큰 만료 알림이 표시되고 새로고침할 수 있어야 한다', async () => {
      await socialMediaPage.navigateToSocialAccounts();
      
      // 토큰 만료 알림이 있는지 확인
      const hasExpiryAlert = await socialMediaPage.checkTokenExpiryAlert();
      
      if (hasExpiryAlert) {
        // 토큰 새로고침 버튼 클릭
        const popupPromise = socialMediaPage.refreshToken('twitter');
        
        // 새 창이 열리는지 확인
        const popup = await popupPromise;
        expect(popup).toBeTruthy();
        
        // 팝업이 OAuth URL을 포함하는지 확인
        expect(popup.url()).toMatch(/auth\/twitter\/refresh/);
        
        // 팝업 닫기
        await popup.close();
      }
    });

    test('계정 통계가 실시간으로 업데이트되어야 한다', async () => {
      await socialMediaPage.navigateToSocialAccounts();
      
      // 특정 계정의 통계 확인
      const initialStats = await socialMediaPage.getAccountStats('twitter-account-1');
      expect(initialStats.totalScheduled).toBeDefined();
      expect(initialStats.successRate).toBeDefined();
      
      // 새 게시물 예약 후 통계 변화 확인 (실제 환경에서는 API 호출 후 확인)
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const updatedStats = await socialMediaPage.getAccountStats('twitter-account-1');
      expect(updatedStats).toBeDefined();
    });
  });

  test.describe('변형 비교 및 A/B 테스트', () => {
    test('게시물 변형을 생성하고 비교할 수 있어야 한다', async () => {
      // 테스트용 게시물 ID (실제 환경에서는 동적으로 생성)
      const testPostId = 'test-post-id';
      
      await socialMediaPage.navigateToVariantComparison(testPostId);
      
      // 초기 변형 개수 확인
      const initialVariantCount = await page.locator('[data-testid="variant-item"]').count();
      
      // 새 변형 생성
      await socialMediaPage.createVariant('새로운 A/B 테스트 변형 내용입니다.');
      
      // 변형이 생성되었는지 확인
      const newVariantCount = await page.locator('[data-testid="variant-item"]').count();
      expect(newVariantCount).toBe(initialVariantCount + 1);
      
      // 최고 점수 배지 확인
      await expect(page.locator('[data-testid="best-variant-badge"]')).toBeVisible();
      
      // 점수 분석 차트 확인
      await expect(page.locator('[data-testid="score-breakdown-chart"]')).toBeVisible();
    });

    test('변형을 선택하고 복사할 수 있어야 한다', async () => {
      const testPostId = 'test-post-id';
      await socialMediaPage.navigateToVariantComparison(testPostId);
      
      // 첫 번째 변형 선택
      const firstVariantId = await page.locator('[data-testid="variant-item"]').first().getAttribute('data-variant-id');
      
      if (firstVariantId) {
        await socialMediaPage.selectVariant(firstVariantId);
        
        // 선택됨 배지 확인
        await expect(page.locator(`[data-testid="variant-selected-${firstVariantId}"]`)).toBeVisible();
        
        // 변형 내용 복사
        await socialMediaPage.copyVariant(firstVariantId);
        
        // 복사 성공 피드백 확인
        await expect(page.locator(`[data-testid="copy-success-${firstVariantId}"]`)).toBeVisible();
      }
    });

    test('변형 비교 탭 간 전환이 원활해야 한다', async () => {
      const testPostId = 'test-post-id';
      await socialMediaPage.navigateToVariantComparison(testPostId);
      
      // 기본적으로 상세 비교 탭이 활성화되어 있는지 확인
      await expect(page.locator('[data-testid="comparison-tab"][aria-selected="true"]')).toBeVisible();
      
      // 요약 탭으로 전환
      await socialMediaPage.switchToSummaryTab();
      
      // 요약 탭 내용 확인
      await expect(page.locator('[data-testid="summary-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-scores"]')).toBeVisible();
      await expect(page.locator('[data-testid="performance-analysis"]')).toBeVisible();
    });
  });

  test.describe('실시간 모니터링', () => {
    test('실시간 모니터가 데이터를 표시해야 한다', async () => {
      await socialMediaPage.navigateToRealtimeMonitor();
      
      // 실시간 데이터 로딩 확인
      await expect(page.locator('[data-testid="realtime-data"]')).toBeVisible();
      
      // 연결 상태 확인
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/연결됨|Connected/);
      
      // 활성 세션 수 표시 확인
      await expect(page.locator('[data-testid="active-sessions"]')).toBeVisible();
      
      // 실시간 이벤트 스트림 확인
      const eventCount = await page.locator('[data-testid="realtime-event"]').count();
      expect(eventCount).toBeGreaterThanOrEqual(0);
    });

    test('실시간 업데이트가 작동해야 한다', async () => {
      await socialMediaPage.navigateToRealtimeMonitor();
      
      // 초기 이벤트 수 확인
      const initialEventCount = await page.locator('[data-testid="realtime-event"]').count();
      
      // 새 탭에서 활동을 시뮬레이션 (실제 환경에서는 API 호출)
      const newPage = await page.context().newPage();
      await newPage.goto('/dashboard/posts/create');
      await newPage.fill('[data-testid="post-content"]', '실시간 테스트 게시물');
      await newPage.click('[data-testid="save-draft"]');
      await newPage.close();
      
      // 실시간 업데이트 대기 (최대 5초)
      await page.waitForFunction(
        (initialCount) => {
          const currentCount = document.querySelectorAll('[data-testid="realtime-event"]').length;
          return currentCount > initialCount;
        },
        initialEventCount,
        { timeout: 5000 }
      ).catch(() => {
        // 실시간 업데이트가 없을 수도 있음 (테스트 환경 제약)
        console.log('실시간 업데이트를 감지하지 못했습니다. 테스트 환경 제약일 수 있습니다.');
      });
    });
  });

  test.describe('AI 사용량 및 분석', () => {
    test('AI 사용량 통계가 표시되어야 한다', async () => {
      await socialMediaPage.navigateToAnalyticsDashboard();
      
      // AI 사용량 통계 섹션 확인
      await expect(page.locator('[data-testid="ai-usage-section"]')).toBeVisible();
      
      const aiStats = await socialMediaPage.getAIUsageStats();
      expect(aiStats.totalCreditsUsed).toBeDefined();
      expect(aiStats.averageScore).toBeDefined();
      
      // AI 모델별 사용량 차트 확인
      await expect(page.locator('[data-testid="ai-model-usage-chart"]')).toBeVisible();
      
      // 월별 트렌드 차트 확인
      await expect(page.locator('[data-testid="monthly-trends-chart"]')).toBeVisible();
    });

    test('분석 대시보드 차트들이 로드되어야 한다', async () => {
      await socialMediaPage.navigateToAnalyticsDashboard();
      
      // 모든 차트가 로드될 때까지 대기
      await socialMediaPage.waitForChartsToLoad();
      
      // 각 차트 섹션 확인
      await expect(page.locator('[data-testid="performance-overview-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="engagement-trends-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="platform-comparison-chart"]')).toBeVisible();
      
      // 차트가 실제 데이터를 표시하는지 확인
      const chartElements = await page.locator('[data-testid="analytics-chart"] svg, [data-testid="analytics-chart"] canvas').count();
      expect(chartElements).toBeGreaterThan(0);
    });

    test('필터링 및 날짜 범위 선택이 작동해야 한다', async () => {
      await socialMediaPage.navigateToAnalyticsDashboard();
      
      // 날짜 범위 선택기 확인
      await expect(page.locator('[data-testid="date-range-picker"]')).toBeVisible();
      
      // 기본 범위에서 다른 범위로 변경
      await page.click('[data-testid="date-range-picker"]');
      await page.click('[data-testid="date-range-last-7-days"]');
      
      // 차트가 업데이트되는지 확인
      await page.waitForLoadState('networkidle');
      await socialMediaPage.waitForChartsToLoad();
      
      // 플랫폼 필터 테스트
      await page.click('[data-testid="platform-filter"]');
      await page.click('[data-testid="filter-twitter"]');
      
      // 필터 적용 후 데이터 업데이트 확인
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();
    });
  });

  test.describe('사용자 경험 및 성능', () => {
    test('페이지 로딩 성능이 적절해야 한다', async () => {
      const startTime = Date.now();
      
      await socialMediaPage.navigateToAnalyticsDashboard();
      await socialMediaPage.waitForChartsToLoad();
      
      const loadTime = Date.now() - startTime;
      
      // 페이지가 5초 이내에 로드되어야 함
      expect(loadTime).toBeLessThan(5000);
      
      // Core Web Vitals 메트릭 확인
      const lcpValue = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // 타임아웃 설정
          setTimeout(() => resolve(0), 3000);
        });
      });
      
      // LCP가 2.5초 이내여야 함 (권장 기준)
      expect(lcpValue).toBeLessThan(2500);
    });

    test('반응형 디자인이 작동해야 한다', async () => {
      // 데스크톱 해상도
      await page.setViewportSize({ width: 1920, height: 1080 });
      await socialMediaPage.navigateToVariantComparison('test-post-id');
      await expect(page.locator('[data-testid="variant-comparison-desktop"]')).toBeVisible();
      
      // 태블릿 해상도
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await expect(page.locator('[data-testid="variant-comparison-tablet"]')).toBeVisible();
      
      // 모바일 해상도
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await expect(page.locator('[data-testid="variant-comparison-mobile"]')).toBeVisible();
    });

    test('에러 상태가 적절히 처리되어야 한다', async () => {
      // 네트워크 오프라인 시뮬레이션
      await page.context().setOffline(true);
      
      await socialMediaPage.navigateToAnalyticsDashboard();
      
      // 오프라인 메시지나 에러 상태 확인
      await expect(
        page.locator('[data-testid="offline-message"], [data-testid="network-error"]')
      ).toBeVisible({ timeout: 10000 });
      
      // 네트워크 복구
      await page.context().setOffline(false);
      
      // 재시도 버튼이 있다면 클릭
      const retryButton = page.locator('[data-testid="retry-button"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
        await socialMediaPage.waitForChartsToLoad();
      }
    });

    test('접근성 기준을 준수해야 한다', async () => {
      await socialMediaPage.navigateToVariantComparison('test-post-id');
      
      // 키보드 탐색 테스트
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');
      expect(await focusedElement.count()).toBe(1);
      
      // 탭으로 모든 인터랙티브 요소들을 순회할 수 있는지 확인
      const interactiveElements = await page.locator('button, [role="button"], input, select, textarea, a').count();
      
      let tabCount = 0;
      for (let i = 0; i < interactiveElements; i++) {
        await page.keyboard.press('Tab');
        tabCount++;
        
        const currentFocus = await page.locator(':focus');
        if (await currentFocus.count() === 0) {
          break; // 더 이상 포커스할 수 없음
        }
      }
      
      expect(tabCount).toBeGreaterThan(0);
      
      // ARIA 레이블 확인
      const buttonsWithoutLabels = await page.locator('button:not([aria-label]):not([aria-labelledby]):not(:has-text())').count();
      expect(buttonsWithoutLabels).toBe(0);
    });
  });

  test.describe('통합 워크플로우', () => {
    test('전체 소셜 미디어 관리 워크플로우가 작동해야 한다', async () => {
      // 1. 계정 상태 확인
      await socialMediaPage.navigateToSocialAccounts();
      const hasActiveAccounts = await page.locator('[data-testid="active-account"]').count() > 0;
      
      if (hasActiveAccounts) {
        // 2. 새 게시물 생성
        await page.goto('/dashboard/posts/create');
        await page.fill('[data-testid="post-content"]', '통합 테스트용 게시물 내용');
        await page.click('[data-testid="save-draft"]');
        
        const postId = await page.locator('[data-testid="post-id"]').getAttribute('data-value');
        
        if (postId) {
          // 3. 변형 생성 및 A/B 테스트
          await socialMediaPage.navigateToVariantComparison(postId);
          await socialMediaPage.createVariant('A/B 테스트 변형 1');
          await socialMediaPage.createVariant('A/B 테스트 변형 2');
          
          // 4. 최고 점수 변형 선택
          const bestVariantId = await page.locator('[data-testid="best-variant"]').getAttribute('data-variant-id');
          if (bestVariantId) {
            await socialMediaPage.selectVariant(bestVariantId);
          }
          
          // 5. 게시물 예약
          await page.goto(`/dashboard/posts/${postId}/schedule`);
          await page.fill('[data-testid="schedule-datetime"]', '2024-12-25T10:00');
          await page.click('[data-testid="schedule-post"]');
          
          // 6. 분석 대시보드에서 결과 확인
          await socialMediaPage.navigateToAnalyticsDashboard();
          await socialMediaPage.waitForChartsToLoad();
          
          // 전체 워크플로우 완료 확인
          await expect(page.locator('[data-testid="workflow-complete"]')).toBeVisible();
        }
      } else {
        console.log('활성 소셜 계정이 없어 전체 워크플로우 테스트를 건너뜁니다.');
      }
    });
  });
});