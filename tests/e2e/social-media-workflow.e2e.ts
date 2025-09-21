/**
 * 소셜 미디어 워크플로우 E2E 테스트
 * 사용자 여정 전체를 테스트하는 포괄적인 E2E 테스트
 */

import { test, expect, Page } from '@playwright/test';
import { SocialMediaTestUtils } from './utils/social-media-utils';
import { AuthTestUtils } from './utils/auth-utils';

// 테스트 데이터
const testUser = {
  email: 'e2e-test@example.com',
  password: 'SecurePass123!',
  firstName: 'E2E',
  lastName: 'Test',
};

const testPersona = {
  name: 'Tech Influencer',
  role: 'Software Developer',
  tone: 'Professional',
  interests: ['React', 'TypeScript', 'AI'],
  expertise: ['Frontend Development', 'DevOps'],
};

const testPost = {
  content: 'Excited to share my latest insights on React 19 and its new features! The concurrent rendering improvements are game-changing for performance. What are your thoughts on the new use() hook? #React19 #WebDev',
  platforms: ['twitter', 'linkedin'],
};

test.describe('소셜 미디어 완전 워크플로우', () => {
  let page: Page;
  let authUtils: AuthTestUtils;
  let socialUtils: SocialMediaTestUtils;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    authUtils = new AuthTestUtils(page);
    socialUtils = new SocialMediaTestUtils(page);

    // 테스트용 인증 상태 설정
    await authUtils.setupTestAuth(testUser);
  });

  test.afterAll(async () => {
    await authUtils.cleanup();
    await page.close();
  });

  test('전체 소셜 미디어 게시물 생성 및 발행 워크플로우', async () => {
    // 1. 대시보드 접근
    await test.step('대시보드에 접근한다', async () => {
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-profile"]')).toContainText(testUser.firstName);
    });

    // 2. 소셜 미디어 컴포즈 페이지로 이동
    await test.step('소셜 미디어 컴포즈 페이지로 이동한다', async () => {
      await page.click('[data-testid="nav-social-compose"]');
      await expect(page).toHaveURL('/dashboard/social/compose');
      await expect(page.locator('[data-testid="compose-header"]')).toBeVisible();
    });

    // 3. 페르소나 생성
    let personaId: string;
    await test.step('새로운 페르소나를 생성한다', async () => {
      personaId = await socialUtils.createPersona(testPersona);

      // 페르소나가 목록에 나타나는지 확인
      await expect(page.locator(`[data-testid="persona-${personaId}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="persona-${personaId}"]`)).toContainText(testPersona.name);
    });

    // 4. 소셜 계정 연결 (모킹)
    await test.step('소셜 계정을 연결한다', async () => {
      // Twitter 계정 연결
      await socialUtils.connectSocialAccount('twitter', {
        username: 'test_twitter_user',
        displayName: 'Test Twitter User',
      });

      // LinkedIn 계정 연결
      await socialUtils.connectSocialAccount('linkedin', {
        username: 'test_linkedin_user',
        displayName: 'Test LinkedIn User',
      });

      // 연결된 계정들이 표시되는지 확인
      await expect(page.locator('[data-testid="connected-account-twitter"]')).toBeVisible();
      await expect(page.locator('[data-testid="connected-account-linkedin"]')).toBeVisible();
    });

    // 5. 게시물 작성
    let postId: string;
    await test.step('게시물을 작성한다', async () => {
      // 페르소나 선택
      await page.click(`[data-testid="select-persona-${personaId}"]`);

      // 플랫폼 선택
      await page.click('[data-testid="platform-twitter"]');
      await page.click('[data-testid="platform-linkedin"]');

      // 게시물 내용 입력
      await page.fill('[data-testid="post-content-input"]', testPost.content);

      // 게시물 생성
      await page.click('[data-testid="create-post-button"]');

      // 게시물이 생성되었는지 확인
      await expect(page.locator('[data-testid="post-created-success"]')).toBeVisible();

      // 게시물 ID 추출
      const postElement = page.locator('[data-testid="created-post"]');
      postId = await postElement.getAttribute('data-post-id') || '';
      expect(postId).toBeTruthy();
    });

    // 6. AI 변형 생성
    await test.step('AI 변형을 생성한다', async () => {
      // 변형 생성 버튼 클릭
      await page.click('[data-testid="generate-variants-button"]');

      // 생성 중 로딩 상태 확인
      await expect(page.locator('[data-testid="variants-generating"]')).toBeVisible();

      // 변형 생성 완료 대기 (최대 30초)
      await page.waitForSelector('[data-testid="variants-generated"]', { timeout: 30000 });

      // 변형들이 표시되는지 확인
      const variants = page.locator('[data-testid^="variant-"]');
      await expect(variants).toHaveCount.greaterThan(0);

      // 각 변형의 점수가 표시되는지 확인
      const firstVariant = variants.first();
      await expect(firstVariant.locator('[data-testid="variant-score"]')).toBeVisible();
      await expect(firstVariant.locator('[data-testid="score-breakdown"]')).toBeVisible();
    });

    // 7. 최적의 변형 선택
    await test.step('최적의 변형을 선택한다', async () => {
      // 점수 순으로 정렬된 첫 번째 변형 선택
      const bestVariant = page.locator('[data-testid^="variant-"]').first();
      await bestVariant.click();

      // 선택된 변형이 강조 표시되는지 확인
      await expect(bestVariant).toHaveClass(/selected/);
      await expect(bestVariant.locator('[data-testid="selected-badge"]')).toBeVisible();

      // 선택 확인 버튼 클릭
      await page.click('[data-testid="confirm-variant-selection"]');

      // 선택 완료 메시지 확인
      await expect(page.locator('[data-testid="variant-selected-success"]')).toBeVisible();
    });

    // 8. 게시물 예약 또는 즉시 발행
    await test.step('게시물을 예약한다', async () => {
      // 예약 발행 탭 클릭
      await page.click('[data-testid="schedule-tab"]');

      // 날짜 및 시간 선택
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0); // 내일 오후 2시

      await socialUtils.setScheduleDateTime(tomorrow);

      // 예약 발행 버튼 클릭
      await page.click('[data-testid="schedule-post-button"]');

      // 예약 완료 확인
      await expect(page.locator('[data-testid="post-scheduled-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="scheduled-time"]')).toContainText('내일');
    });

    // 9. 게시물 관리 페이지에서 확인
    await test.step('게시물 관리 페이지에서 예약된 게시물을 확인한다', async () => {
      await page.goto('/dashboard/social/posts');

      // 예약된 게시물이 목록에 있는지 확인
      const scheduledPost = page.locator(`[data-testid="post-${postId}"]`);
      await expect(scheduledPost).toBeVisible();
      await expect(scheduledPost.locator('[data-testid="post-status"]')).toContainText('예약됨');

      // 게시물 세부 정보 확인
      await scheduledPost.click();
      await expect(page.locator('[data-testid="post-detail-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="post-content"]')).toContainText(testPost.content);
      await expect(page.locator('[data-testid="selected-platforms"]')).toContainText('Twitter');
      await expect(page.locator('[data-testid="selected-platforms"]')).toContainText('LinkedIn');
    });

    // 10. 성능 분석 대시보드 확인
    await test.step('성능 분석 대시보드에서 데이터를 확인한다', async () => {
      await page.goto('/dashboard/analytics');

      // 분석 대시보드가 로드되는지 확인
      await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();

      // 게시물 통계가 업데이트되었는지 확인
      await expect(page.locator('[data-testid="total-posts-count"]')).not.toContainText('0');

      // 예약된 게시물이 차트에 반영되었는지 확인
      await expect(page.locator('[data-testid="scheduled-posts-chart"]')).toBeVisible();
    });
  });

  test('게시물 편집 및 삭제 워크플로우', async () => {
    await test.step('기존 게시물을 편집한다', async () => {
      await page.goto('/dashboard/social/posts');

      // 첫 번째 게시물 편집
      const firstPost = page.locator('[data-testid^="post-"]').first();
      await firstPost.locator('[data-testid="edit-post-button"]').click();

      // 편집 모달이 열리는지 확인
      await expect(page.locator('[data-testid="edit-post-modal"]')).toBeVisible();

      // 내용 수정
      const editedContent = testPost.content + ' #Updated';
      await page.fill('[data-testid="edit-post-content"]', editedContent);

      // 저장
      await page.click('[data-testid="save-changes-button"]');

      // 수정 완료 확인
      await expect(page.locator('[data-testid="post-updated-success"]')).toBeVisible();
      await expect(firstPost.locator('[data-testid="post-content"]')).toContainText('#Updated');
    });

    await test.step('게시물을 삭제한다', async () => {
      const firstPost = page.locator('[data-testid^="post-"]').first();

      // 삭제 버튼 클릭
      await firstPost.locator('[data-testid="delete-post-button"]').click();

      // 삭제 확인 다이얼로그
      await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();
      await page.click('[data-testid="confirm-delete-button"]');

      // 삭제 완료 확인
      await expect(page.locator('[data-testid="post-deleted-success"]')).toBeVisible();

      // 게시물이 목록에서 제거되었는지 확인
      await expect(firstPost).not.toBeVisible();
    });
  });

  test('오류 처리 및 복구 시나리오', async () => {
    await test.step('네트워크 오류 시 적절한 오류 메시지를 표시한다', async () => {
      // 네트워크 차단
      await page.route('**/api/**', route => route.abort());

      await page.goto('/dashboard/social/compose');

      // 페르소나 로드 실패 메시지 확인
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      // 네트워크 복구
      await page.unroute('**/api/**');

      // 재시도 버튼 클릭
      await page.click('[data-testid="retry-button"]');

      // 정상 로드 확인
      await expect(page.locator('[data-testid="compose-form"]')).toBeVisible();
    });

    await test.step('폼 검증 오류를 올바르게 처리한다', async () => {
      await page.goto('/dashboard/social/compose');

      // 빈 내용으로 게시물 생성 시도
      await page.click('[data-testid="create-post-button"]');

      // 검증 오류 메시지 확인
      await expect(page.locator('[data-testid="content-required-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="platform-required-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="persona-required-error"]')).toBeVisible();

      // 오류 필드가 강조 표시되는지 확인
      await expect(page.locator('[data-testid="post-content-input"]')).toHaveClass(/error/);
    });
  });

  test('반응형 디자인 및 모바일 지원', async () => {
    await test.step('모바일 뷰포트에서 정상적으로 동작한다', async () => {
      // 모바일 뷰포트로 변경
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/dashboard/social/compose');

      // 모바일 네비게이션 확인
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

      // 모바일 레이아웃 확인
      await expect(page.locator('[data-testid="compose-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="compose-form"]')).toHaveCSS('flex-direction', 'column');

      // 터치 인터랙션 테스트
      await page.tap('[data-testid="platform-twitter"]');
      await expect(page.locator('[data-testid="platform-twitter"]')).toHaveClass(/selected/);
    });

    await test.step('태블릿 뷰포트에서 정상적으로 동작한다', async () => {
      // 태블릿 뷰포트로 변경
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.reload();

      // 태블릿 레이아웃 확인
      await expect(page.locator('[data-testid="compose-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    });
  });

  test('성능 최적화 검증', async () => {
    await test.step('페이지 로드 성능을 검증한다', async () => {
      const startTime = Date.now();

      await page.goto('/dashboard/social/compose');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      // 3초 내에 로드되어야 함
      expect(loadTime).toBeLessThan(3000);
    });

    await test.step('대용량 데이터 처리 성능을 검증한다', async () => {
      // 많은 페르소나가 있는 상황 시뮬레이션
      await socialUtils.createMultiplePersonas(50);

      await page.goto('/dashboard/social/compose');

      // 페르소나 드롭다운이 빠르게 로드되는지 확인
      const startTime = Date.now();
      await page.click('[data-testid="persona-selector"]');
      await page.waitForSelector('[data-testid="persona-option"]');
      const openTime = Date.now() - startTime;

      // 500ms 내에 열려야 함
      expect(openTime).toBeLessThan(500);

      // 가상화나 페이징이 적용되었는지 확인
      const visibleOptions = page.locator('[data-testid="persona-option"]');
      const optionCount = await visibleOptions.count();

      // 50개 모두 렌더링하지 않고 일부만 표시해야 함 (가상화)
      expect(optionCount).toBeLessThan(50);
    });
  });
});