/**
 * 소셜 미디어 고급 기능 E2E 테스트
 * 토큰 만료 관리, A/B 테스트, AI 생성 이력, 분석 대시보드 전체 워크플로우 테스트
 */

import { test, expect, Page } from '@playwright/test';

// 테스트 헬퍼 함수들
const loginUser = async (page: Page) => {
  await page.goto('/sign-in');
  await page.fill('[data-testid="email-input"]', 'test@example.com');
  await page.fill('[data-testid="password-input"]', 'testpassword123');
  await page.click('[data-testid="sign-in-button"]');
  await page.waitForURL('/dashboard');
};

const navigateToSocialMedia = async (page: Page) => {
  await page.click('[data-testid="nav-social-media"]');
  await page.waitForURL('/dashboard/social-media');
};

const waitForApiResponse = async (page: Page, apiPath: string) => {
  return await page.waitForResponse(response => 
    response.url().includes(apiPath) && response.status() === 200
  );
};

test.describe('소셜 미디어 고급 기능 E2E 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 로그인
    await loginUser(page);
  });

  test.describe('토큰 만료 관리 워크플로우', () => {
    test('만료 예정 토큰 알림 및 새로고침', async ({ page }) => {
      await navigateToSocialMedia(page);

      // 토큰 만료 알림이 표시되는지 확인
      await expect(page.locator('[data-testid="token-expiry-alert"]')).toBeVisible();
      await expect(page.locator('text=토큰 만료 예정')).toBeVisible();

      // 만료 예정 계정 정보 확인
      const expiringAccount = page.locator('[data-testid="account-twitter_123"]');
      await expect(expiringAccount).toBeVisible();
      await expect(expiringAccount.locator('.platform')).toHaveText('twitter');
      await expect(expiringAccount.locator('.username')).toContainText('@test_user');

      // 토큰 새로고침 버튼 클릭
      const refreshButton = expiringAccount.locator('[data-testid="refresh-twitter_123"]');
      await refreshButton.click();

      // 로딩 상태 확인
      await expect(refreshButton).toHaveText('새로고침 중...');
      await expect(refreshButton).toBeDisabled();

      // API 호출 대기
      await waitForApiResponse(page, '/api/social-accounts/twitter_123/tokens');

      // 성공 메시지 확인
      await expect(page.locator('.toast-success')).toBeVisible();
      await expect(page.locator('text=토큰이 성공적으로 새로고침되었습니다')).toBeVisible();

      // 알림이 사라지는지 확인
      await expect(page.locator('[data-testid="token-expiry-alert"]')).not.toBeVisible();
    });

    test('계정 통계 조회', async ({ page }) => {
      await navigateToSocialMedia(page);
      await page.click('[data-testid="nav-accounts"]');

      // 계정 목록에서 특정 계정 선택
      const accountCard = page.locator('[data-testid="account-card-twitter_123"]');
      await accountCard.click();

      // 계정 상세 페이지로 이동
      await page.waitForURL('**/accounts/twitter_123');

      // 통계 정보 확인
      await expect(page.locator('[data-testid="account-stats"]')).toBeVisible();
      
      const stats = page.locator('[data-testid="account-stats"]');
      await expect(stats.locator('[data-testid="total-scheduled"]')).toContainText('25');
      await expect(stats.locator('[data-testid="published"]')).toContainText('20');
      await expect(stats.locator('[data-testid="success-rate"]')).toContainText('80%');

      // 플랫폼별 성과 차트 확인
      await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
      await expect(page.locator('.recharts-wrapper')).toBeVisible();
    });

    test('토큰 새로고침 실패 처리', async ({ page }) => {
      await navigateToSocialMedia(page);

      // 실패할 것으로 예상되는 계정의 새로고침 버튼 클릭
      const failingAccount = page.locator('[data-testid="account-facebook_456"]');
      await failingAccount.locator('[data-testid="refresh-facebook_456"]').click();

      // API 에러 응답 대기
      await page.waitForResponse(response => 
        response.url().includes('/api/social-accounts/facebook_456/tokens') && 
        response.status() === 400
      );

      // 에러 메시지 확인
      await expect(page.locator('.toast-error')).toBeVisible();
      await expect(page.locator('text=토큰 새로고침에 실패했습니다')).toBeVisible();

      // 재시도 버튼 확인
      await expect(page.locator('[data-testid="retry-refresh"]')).toBeVisible();
    });
  });

  test.describe('A/B 테스트 워크플로우', () => {
    test('포스트 변형 생성 및 비교', async ({ page }) => {
      await navigateToSocialMedia(page);
      await page.click('[data-testid="nav-posts"]');

      // 새 포스트 생성
      await page.click('[data-testid="create-post-btn"]');
      await page.fill('[data-testid="post-content"]', '생산성을 높이는 5가지 팁');
      await page.click('[data-testid="save-post-btn"]');

      // 포스트 상세 페이지로 이동
      await page.waitForURL('**/posts/*');

      // 변형 생성 탭 클릭
      await page.click('[data-testid="variants-tab"]');

      // 변형 생성 버튼 클릭
      await page.click('[data-testid="generate-variants-btn"]');

      // 변형 생성 옵션 설정
      await page.selectOption('[data-testid="persona-select"]', 'professional');
      await page.fill('[data-testid="variant-count"]', '3');
      await page.click('[data-testid="start-generation-btn"]');

      // 생성 진행 상태 확인
      await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible();
      await expect(page.locator('text=변형 생성 중...')).toBeVisible();

      // API 완료 대기 (최대 30초)
      await waitForApiResponse(page, '/api/ai-generations');

      // 변형 비교 컴포넌트 확인
      await expect(page.locator('[data-testid="variant-comparison"]')).toBeVisible();

      // 3개의 변형이 생성되었는지 확인
      const variants = page.locator('[data-testid^="variant-"]');
      await expect(variants).toHaveCount(3);

      // 각 변형의 점수 확인
      for (let i = 0; i < 3; i++) {
        const variant = variants.nth(i);
        await expect(variant.locator('.overall-score')).toBeVisible();
        await expect(variant.locator('.score-breakdown')).toBeVisible();
        
        // 점수 항목들 확인
        await expect(variant.locator('text=참여도')).toBeVisible();
        await expect(variant.locator('text=바이럴성')).toBeVisible();
        await expect(variant.locator('text=페르소나 매치')).toBeVisible();
        await expect(variant.locator('text=가독성')).toBeVisible();
        await expect(variant.locator('text=트렌딩')).toBeVisible();
      }
    });

    test('최고 성과 변형 선택', async ({ page }) => {
      await navigateToSocialMedia(page);
      
      // 기존 포스트로 이동 (변형이 이미 있는 포스트)
      await page.goto('/dashboard/posts/post_with_variants');

      await page.click('[data-testid="variants-tab"]');

      // 최고 점수 변형 찾기
      const bestVariantBtn = page.locator('[data-testid="select-best-variant"]');
      await bestVariantBtn.click();

      // 최고 성과 변형이 자동 선택되는지 확인
      const selectedVariant = page.locator('.variant-card.selected');
      await expect(selectedVariant).toBeVisible();
      await expect(selectedVariant.locator('.selected-btn')).toHaveText('선택됨');

      // 다른 변형들은 선택되지 않았는지 확인
      const unselectedVariants = page.locator('.variant-card:not(.selected)');
      await expect(unselectedVariants.locator('.select-btn')).toHaveText('선택하기');

      // 포스트 내용이 선택된 변형으로 업데이트되는지 확인
      await page.click('[data-testid="content-tab"]');
      const postContent = await page.locator('[data-testid="final-content"]').textContent();
      
      await page.click('[data-testid="variants-tab"]');
      const selectedVariantContent = await selectedVariant.locator('.variant-content p').textContent();
      
      expect(postContent).toBe(selectedVariantContent);
    });

    test('수동 변형 선택', async ({ page }) => {
      await navigateToSocialMedia(page);
      await page.goto('/dashboard/posts/post_with_variants');
      await page.click('[data-testid="variants-tab"]');

      // 두 번째 변형 선택
      const secondVariant = page.locator('[data-testid="variant-variant_2"]');
      await secondVariant.locator('[data-testid="select-variant_2"]').click();

      // API 호출 대기
      await waitForApiResponse(page, '/api/posts/variants/variant_2/select');

      // 선택 상태 변경 확인
      await expect(secondVariant).toHaveClass(/selected/);
      await expect(secondVariant.locator('.selected-btn')).toHaveText('선택됨');

      // 다른 변형들이 선택 해제되었는지 확인
      const otherVariants = page.locator('[data-testid^="variant-"]:not([data-testid="variant-variant_2"])');
      await expect(otherVariants).not.toHaveClass(/selected/);
    });

    test('변형 성과 분석', async ({ page }) => {
      await navigateToSocialMedia(page);
      await page.goto('/dashboard/posts/post_with_variants');
      await page.click('[data-testid="variants-tab"]');

      // 분석 탭 클릭
      await page.click('[data-testid="analysis-tab"]');

      // 평균 점수 확인
      await expect(page.locator('[data-testid="average-scores"]')).toBeVisible();
      await expect(page.locator('[data-testid="overall-average"]')).toContainText('85점');

      // 점수 분포 차트 확인
      await expect(page.locator('[data-testid="score-distribution-chart"]')).toBeVisible();

      // 개선 제안 확인
      await expect(page.locator('[data-testid="improvement-suggestions"]')).toBeVisible();
      await expect(page.locator('text=참여도를 높이기 위해')).toBeVisible();
    });
  });

  test.describe('AI 생성 이력 워크플로우', () => {
    test('생성 이력 조회 및 필터링', async ({ page }) => {
      await navigateToSocialMedia(page);
      await page.click('[data-testid="nav-ai-history"]');

      // 생성 이력 목록 확인
      await expect(page.locator('[data-testid="generation-history"]')).toBeVisible();
      await expect(page.locator('text=AI 생성 이력')).toBeVisible();

      // 필터링 기능 테스트
      await page.selectOption('[data-testid="type-filter"]', 'variant_creation');
      await waitForApiResponse(page, '/api/ai-generations');

      // 필터링된 결과 확인
      const filteredItems = page.locator('[data-testid^="generation-"]');
      await expect(filteredItems).toHaveCountGreaterThan(0);

      // 모든 항목이 변형 생성 타입인지 확인
      const typeBadges = page.locator('.type-badge');
      for (let i = 0; i < await typeBadges.count(); i++) {
        await expect(typeBadges.nth(i)).toHaveText('변형 생성');
      }

      // 성공/실패 필터 테스트
      await page.selectOption('[data-testid="success-filter"]', 'true');
      await waitForApiResponse(page, '/api/ai-generations');

      // 성공한 생성만 표시되는지 확인
      const statusBadges = page.locator('.status-badge');
      for (let i = 0; i < await statusBadges.count(); i++) {
        await expect(statusBadges.nth(i)).toHaveText('성공');
        await expect(statusBadges.nth(i)).toHaveClass(/success/);
      }
    });

    test('생성 이력 상세 조회', async ({ page }) => {
      await navigateToSocialMedia(page);
      await page.click('[data-testid="nav-ai-history"]');

      // 첫 번째 생성 이력 상세 보기
      const firstGeneration = page.locator('[data-testid^="generation-"]').first();
      await firstGeneration.locator('[data-testid^="view-detail-"]').click();

      // 상세 모달 또는 페이지 확인
      await expect(page.locator('[data-testid="generation-detail"]')).toBeVisible();

      // 상세 정보 확인
      await expect(page.locator('[data-testid="prompt-detail"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-detail"]')).toBeVisible();
      await expect(page.locator('[data-testid="metadata-detail"]')).toBeVisible();

      // 관련 포스트 및 페르소나 정보 확인
      await expect(page.locator('[data-testid="related-post"]')).toBeVisible();
      await expect(page.locator('[data-testid="related-persona"]')).toBeVisible();

      // 토큰 사용량 상세 정보 확인
      await expect(page.locator('[data-testid="token-usage"]')).toBeVisible();
      await expect(page.locator('text=입력 토큰:')).toBeVisible();
      await expect(page.locator('text=출력 토큰:')).toBeVisible();
    });

    test('무한 스크롤 페이징', async ({ page }) => {
      await navigateToSocialMedia(page);
      await page.click('[data-testid="nav-ai-history"]');

      // 초기 항목 수 확인
      const initialItems = await page.locator('[data-testid^="generation-"]').count();

      // 스크롤 또는 더 보기 버튼 클릭
      if (await page.locator('[data-testid="load-more-btn"]').isVisible()) {
        await page.click('[data-testid="load-more-btn"]');
      } else {
        // 페이지 끝까지 스크롤
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      }

      // API 호출 대기
      await waitForApiResponse(page, '/api/ai-generations');

      // 더 많은 항목이 로드되었는지 확인
      const newItemsCount = await page.locator('[data-testid^="generation-"]').count();
      expect(newItemsCount).toBeGreaterThan(initialItems);
    });

    test('검색 기능', async ({ page }) => {
      await navigateToSocialMedia(page);
      await page.click('[data-testid="nav-ai-history"]');

      // 검색 입력란에 검색어 입력
      await page.fill('[data-testid="search-input"]', '생산성');

      // 검색 결과 대기
      await page.waitForTimeout(500); // 디바운스 대기

      // 검색 결과 확인
      const searchResults = page.locator('[data-testid^="generation-"]');
      await expect(searchResults).toHaveCountGreaterThan(0);

      // 검색어가 포함된 프롬프트만 표시되는지 확인
      for (let i = 0; i < await searchResults.count(); i++) {
        const promptText = await searchResults.nth(i).locator('.prompt').textContent();
        expect(promptText?.toLowerCase()).toContain('생산성');
      }
    });
  });

  test.describe('분석 대시보드 워크플로우', () => {
    test('대시보드 메인 통계 확인', async ({ page }) => {
      await navigateToSocialMedia(page);
      await page.click('[data-testid="nav-analytics"]');

      // 대시보드 로딩 대기
      await waitForApiResponse(page, '/api/analytics/dashboard');

      // 주요 지표 카드들 확인
      await expect(page.locator('[data-testid="total-posts-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="scheduled-posts-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-rate-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="engagement-card"]')).toBeVisible();

      // 수치 확인
      await expect(page.locator('[data-testid="total-posts-value"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="success-rate-value"]')).toContainText(/%/);

      // 플랫폼별 통계 차트 확인
      await expect(page.locator('[data-testid="platform-stats-chart"]')).toBeVisible();
      await expect(page.locator('.recharts-pie-chart')).toBeVisible();

      // 최근 활동 타임라인 확인
      await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible();
      await expect(page.locator('[data-testid="activity-item"]')).toHaveCountGreaterThan(0);
    });

    test('시간 범위별 분석', async ({ page }) => {
      await navigateToSocialMedia(page);
      await page.click('[data-testid="nav-analytics"]');

      // 시간 범위 선택기 확인
      await expect(page.locator('[data-testid="time-range-selector"]')).toBeVisible();

      // 7일 범위 선택
      await page.click('[data-testid="time-range-7d"]');
      await waitForApiResponse(page, '/api/analytics/overview');

      // 차트 업데이트 확인
      await expect(page.locator('[data-testid="daily-stats-chart"]')).toBeVisible();

      // 30일 범위로 변경
      await page.click('[data-testid="time-range-30d"]');
      await waitForApiResponse(page, '/api/analytics/overview');

      // 더 많은 데이터 포인트 확인
      const dataPoints = page.locator('.recharts-line-dot');
      await expect(dataPoints).toHaveCountGreaterThan(7);
    });

    test('인게이지먼트 분석', async ({ page }) => {
      await navigateToSocialMedia(page);
      await page.click('[data-testid="nav-analytics"]');
      await page.click('[data-testid="engagement-tab"]');

      // 인게이지먼트 차트 확인
      await expect(page.locator('[data-testid="engagement-chart"]')).toBeVisible();
      await expect(page.locator('.recharts-area-chart')).toBeVisible();

      // 인게이지먼트 지표들 확인
      await expect(page.locator('[data-testid="total-likes"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-comments"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-shares"]')).toBeVisible();
      await expect(page.locator('[data-testid="avg-engagement-rate"]')).toBeVisible();

      // 플랫폼별 인게이지먼트 비교
      await page.click('[data-testid="platform-comparison"]');
      await expect(page.locator('[data-testid="platform-engagement-chart"]')).toBeVisible();

      // 차트 상호작용 테스트
      const chartPoint = page.locator('.recharts-dot').first();
      await chartPoint.hover();
      await expect(page.locator('.recharts-tooltip')).toBeVisible();
    });

    test('상위 성과 게시물 분석', async ({ page }) => {
      await navigateToSocialMedia(page);
      await page.click('[data-testid="nav-analytics"]');
      await page.click('[data-testid="top-posts-tab"]');

      // 상위 게시물 목록 확인
      await expect(page.locator('[data-testid="top-posts-list"]')).toBeVisible();

      const topPosts = page.locator('[data-testid^="top-post-"]');
      await expect(topPosts).toHaveCountGreaterThan(0);

      // 첫 번째 상위 게시물 상세 확인
      const firstPost = topPosts.first();
      await expect(firstPost.locator('[data-testid="post-content"]')).toBeVisible();
      await expect(firstPost.locator('[data-testid="engagement-metrics"]')).toBeVisible();
      await expect(firstPost.locator('[data-testid="impressions-count"]')).toBeVisible();

      // 게시물 클릭하여 상세 분석으로 이동
      await firstPost.click();
      await page.waitForURL('**/posts/*/analytics');

      // 상세 분석 페이지 확인
      await expect(page.locator('[data-testid="post-analytics-detail"]')).toBeVisible();
      await expect(page.locator('[data-testid="performance-timeline"]')).toBeVisible();
    });

    test('실시간 모니터링', async ({ page }) => {
      await navigateToSocialMedia(page);
      await page.click('[data-testid="nav-analytics"]');
      await page.click('[data-testid="live-monitor-tab"]');

      // 실시간 지표 확인
      await expect(page.locator('[data-testid="live-activity"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-users"]')).toBeVisible();
      await expect(page.locator('[data-testid="posts-being-created"]')).toBeVisible();

      // 실시간 활동 피드 확인
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
      const activityItems = page.locator('[data-testid^="activity-"]');
      await expect(activityItems).toHaveCountGreaterThan(0);

      // 시스템 상태 확인
      await expect(page.locator('[data-testid="system-health"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-status"]')).toHaveText('정상');
      await expect(page.locator('[data-testid="db-status"]')).toHaveText('정상');

      // 자동 새로고침 확인 (5초 대기)
      const initialActivityCount = await activityItems.count();
      await page.waitForTimeout(5000);
      
      const newActivityCount = await page.locator('[data-testid^="activity-"]').count();
      // 실시간으로 새 활동이 추가될 수 있음
      expect(newActivityCount).toBeGreaterThanOrEqual(initialActivityCount);
    });
  });

  test.describe('통합 워크플로우', () => {
    test('완전한 소셜 미디어 관리 워크플로우', async ({ page }) => {
      await navigateToSocialMedia(page);

      // 1. 토큰 상태 확인 및 새로고침
      if (await page.locator('[data-testid="token-expiry-alert"]').isVisible()) {
        await page.locator('[data-testid^="refresh-"]').first().click();
        await waitForApiResponse(page, '/api/social-accounts/*/tokens');
      }

      // 2. 새 포스트 생성
      await page.click('[data-testid="nav-posts"]');
      await page.click('[data-testid="create-post-btn"]');
      
      await page.fill('[data-testid="post-content"]', '원격 근무 생산성을 높이는 완벽한 가이드');
      await page.selectOption('[data-testid="persona-select"]', 'professional');
      await page.check('[data-testid="platform-twitter"]');
      await page.check('[data-testid="platform-linkedin"]');
      
      await page.click('[data-testid="save-post-btn"]');
      await page.waitForURL('**/posts/*');

      // 3. AI 변형 생성
      await page.click('[data-testid="variants-tab"]');
      await page.click('[data-testid="generate-variants-btn"]');
      await page.fill('[data-testid="variant-count"]', '3');
      await page.click('[data-testid="start-generation-btn"]');

      // 생성 완료 대기
      await waitForApiResponse(page, '/api/ai-generations');
      await expect(page.locator('[data-testid="variant-comparison"]')).toBeVisible();

      // 4. 최고 성과 변형 선택
      await page.click('[data-testid="select-best-variant"]');
      await waitForApiResponse(page, '/api/posts/variants/*/select');

      // 5. 포스트 스케줄링
      await page.click('[data-testid="schedule-tab"]');
      await page.fill('[data-testid="schedule-datetime"]', '2024-12-25T10:00');
      await page.click('[data-testid="schedule-post-btn"]');

      // 6. 분석 대시보드에서 결과 확인
      await page.click('[data-testid="nav-analytics"]');
      await waitForApiResponse(page, '/api/analytics/dashboard');

      // 새로 생성된 포스트가 통계에 반영되었는지 확인
      await expect(page.locator('[data-testid="total-posts-value"]')).toContainText(/\d+/);
      
      // 7. AI 생성 이력에서 기록 확인
      await page.click('[data-testid="nav-ai-history"]');
      await expect(page.locator('[data-testid^="generation-"]').first()).toBeVisible();
      
      // 최근 생성 기록이 맨 위에 있는지 확인
      const firstGeneration = page.locator('[data-testid^="generation-"]').first();
      await expect(firstGeneration.locator('.type-badge')).toHaveText('변형 생성');
      await expect(firstGeneration.locator('.status-badge')).toHaveText('성공');
    });

    test('에러 상황 처리 워크플로우', async ({ page }) => {
      await navigateToSocialMedia(page);

      // 1. API 에러 상황 시뮬레이션
      await page.route('**/api/ai-generations', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'AI 서비스 일시 중단' })
        });
      });

      // 2. 변형 생성 시도
      await page.click('[data-testid="nav-posts"]');
      await page.goto('/dashboard/posts/existing_post');
      await page.click('[data-testid="variants-tab"]');
      await page.click('[data-testid="generate-variants-btn"]');
      await page.click('[data-testid="start-generation-btn"]');

      // 3. 에러 메시지 확인
      await expect(page.locator('.toast-error')).toBeVisible();
      await expect(page.locator('text=AI 서비스 일시 중단')).toBeVisible();

      // 4. 재시도 기능 확인
      await page.unroute('**/api/ai-generations');
      await page.click('[data-testid="retry-generation"]');

      // 5. 성공적인 재시도 확인
      await waitForApiResponse(page, '/api/ai-generations');
      await expect(page.locator('.toast-success')).toBeVisible();
    });

    test('대용량 데이터 처리 성능', async ({ page }) => {
      await navigateToSocialMedia(page);

      // 1. 대량의 생성 이력 로드 테스트
      await page.click('[data-testid="nav-ai-history"]');
      
      const startTime = Date.now();
      await waitForApiResponse(page, '/api/ai-generations');
      const loadTime = Date.now() - startTime;

      // 로딩 시간이 합리적인 범위 내인지 확인 (5초 이내)
      expect(loadTime).toBeLessThan(5000);

      // 2. 스크롤 성능 테스트
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(100);
      }

      // 스크롤 후에도 페이지가 반응하는지 확인
      await expect(page.locator('[data-testid="load-more-btn"]')).toBeVisible();

      // 3. 분석 차트 렌더링 성능 테스트
      await page.click('[data-testid="nav-analytics"]');
      
      const chartStartTime = Date.now();
      await expect(page.locator('.recharts-wrapper')).toBeVisible();
      const chartLoadTime = Date.now() - chartStartTime;

      // 차트 로딩 시간 확인 (3초 이내)
      expect(chartLoadTime).toBeLessThan(3000);
    });
  });
});