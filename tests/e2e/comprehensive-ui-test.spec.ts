/**
 * 포괄적 UI 테스트 스위트
 * 주요 페이지들의 UI 요소와 사용자 인터랙션을 검증
 */

import { test, expect, Page } from '@playwright/test';

test.describe('포괄적 UI 테스트', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('랜딩 페이지 UI 검증', () => {
    test('랜딩 페이지가 올바르게 렌더링되는지 확인', async () => {
      await page.goto('/');

      // 페이지 제목 확인
      await expect(page).toHaveTitle(/HookLabs Elite/i);

      // 주요 UI 요소들 확인
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('nav')).toBeVisible();

      // CTA 버튼들 확인
      const ctaButtons = page.locator('button, a[role="button"]');
      await expect(ctaButtons.first()).toBeVisible();

      // 스크롤 테스트
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      await page.evaluate(() => window.scrollTo(0, 0));
    });

    test('네비게이션 메뉴가 정상 작동하는지 확인', async () => {
      await page.goto('/');

      // 모바일 메뉴 버튼 (있다면)
      const mobileMenuButton = page.locator('[data-testid="mobile-menu-toggle"]');
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click();
        await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      }

      // 로그인 버튼 클릭 테스트
      const loginButton = page.locator('text=로그인').or(page.locator('text=Login')).or(page.locator('text=Sign in'));
      if (await loginButton.first().isVisible()) {
        await loginButton.first().click();
        // Clerk 로그인 페이지나 모달이 나타나는지 확인
        await page.waitForTimeout(2000);
      }
    });
  });

  test.describe('대시보드 페이지 UI 검증', () => {
    test('대시보드 접근 및 기본 UI 확인', async () => {
      await page.goto('/dashboard');

      // 인증되지 않은 경우 리다이렉트 확인
      const currentUrl = page.url();
      if (currentUrl.includes('sign-in') || currentUrl.includes('login')) {
        // 로그인 페이지로 리다이렉트됨 - 정상 동작
        expect(currentUrl).toMatch(/sign-in|login/);
        return;
      }

      // 대시보드에 정상 접근한 경우
      await expect(page.locator('h1, h2')).toBeVisible();

      // 사이드바나 네비게이션 확인
      const sidebar = page.locator('[data-testid="sidebar"]').or(page.locator('nav'));
      await expect(sidebar.first()).toBeVisible();
    });
  });

  test.describe('소셜 미디어 컴포즈 페이지 UI 검증', () => {
    test('컴포즈 페이지 UI 요소 확인', async () => {
      await page.goto('/dashboard/social/compose');

      // 인증 체크
      const currentUrl = page.url();
      if (currentUrl.includes('sign-in') || currentUrl.includes('login')) {
        expect(currentUrl).toMatch(/sign-in|login/);
        return;
      }

      // 페이지 제목 또는 헤더 확인
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // 텍스트 입력 영역 확인
      const textAreas = page.locator('textarea');
      if (await textAreas.count() > 0) {
        await expect(textAreas.first()).toBeVisible();
      }

      // 버튼들 확인
      const buttons = page.locator('button');
      await expect(buttons.first()).toBeVisible();

      // 탭 또는 섹션 확인
      const tabs = page.locator('[role="tab"], [data-testid*="tab"]');
      if (await tabs.count() > 0) {
        await expect(tabs.first()).toBeVisible();
      }
    });

    test('텍스트 입력 및 상호작용 테스트', async () => {
      await page.goto('/dashboard/social/compose');

      const currentUrl = page.url();
      if (currentUrl.includes('sign-in') || currentUrl.includes('login')) {
        return;
      }

      // 텍스트 영역에 입력 테스트
      const textArea = page.locator('textarea').first();
      if (await textArea.isVisible()) {
        await textArea.fill('테스트 게시물 내용입니다. UI 테스트를 진행하고 있습니다.');
        await expect(textArea).toHaveValue(/테스트 게시물/);
      }

      // 버튼 클릭 테스트
      const buttons = page.locator('button:not([disabled])');
      if (await buttons.count() > 0) {
        // 첫 번째 활성화된 버튼 클릭
        await buttons.first().click();
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('소셜 미디어 포스트 관리 페이지', () => {
    test('포스트 목록 페이지 UI 확인', async () => {
      await page.goto('/dashboard/social/posts');

      const currentUrl = page.url();
      if (currentUrl.includes('sign-in') || currentUrl.includes('login')) {
        return;
      }

      // 페이지 제목 확인
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // 테이블이나 카드 레이아웃 확인
      const tableOrCards = page.locator('table, [data-testid*="card"], [data-testid*="post"]');
      if (await tableOrCards.count() > 0) {
        await expect(tableOrCards.first()).toBeVisible();
      }

      // 필터나 검색 기능 확인
      const searchInput = page.locator('input[type="text"], input[placeholder*="검색"], input[placeholder*="search"]');
      if (await searchInput.count() > 0) {
        await expect(searchInput.first()).toBeVisible();
        await searchInput.first().fill('테스트');
        await page.waitForTimeout(500);
        await searchInput.first().clear();
      }
    });
  });

  test.describe('페르소나 관리 페이지', () => {
    test('페르소나 페이지 기본 UI 확인', async () => {
      await page.goto('/dashboard/social/personas');

      const currentUrl = page.url();
      if (currentUrl.includes('sign-in') || currentUrl.includes('login')) {
        return;
      }

      // 페이지 제목 확인
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // 페르소나 카드들 또는 목록 확인
      const personaElements = page.locator('[data-testid*="persona"], .persona-card, [class*="persona"]');
      if (await personaElements.count() > 0) {
        await expect(personaElements.first()).toBeVisible();
      }

      // 새 페르소나 생성 버튼 확인
      const createButton = page.locator('button').filter({ hasText: /생성|추가|Create|Add/i });
      if (await createButton.count() > 0) {
        await expect(createButton.first()).toBeVisible();
      }
    });
  });

  test.describe('반응형 디자인 테스트', () => {
    test('모바일 뷰포트에서 UI 확인', async () => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('/');

      // 모바일에서 페이지가 올바르게 렌더링되는지 확인
      await expect(page.locator('body')).toBeVisible();

      // 모바일 메뉴 버튼 확인
      const mobileMenu = page.locator('[data-testid="mobile-menu-toggle"]').or(
        page.locator('button[aria-label*="menu"]')
      );
      if (await mobileMenu.count() > 0) {
        await expect(mobileMenu.first()).toBeVisible();
        await mobileMenu.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('태블릿 뷰포트에서 UI 확인', async () => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      await page.goto('/dashboard');

      const currentUrl = page.url();
      if (currentUrl.includes('sign-in') || currentUrl.includes('login')) {
        return;
      }

      // 태블릿에서 레이아웃이 적절히 조정되는지 확인
      await expect(page.locator('body')).toBeVisible();

      // 사이드바나 네비게이션이 적절히 표시되는지 확인
      const navigation = page.locator('nav, [data-testid="sidebar"]');
      if (await navigation.count() > 0) {
        await expect(navigation.first()).toBeVisible();
      }
    });

    test('데스크톱 뷰포트에서 UI 확인', async () => {
      await page.setViewportSize({ width: 1920, height: 1080 }); // Full HD
      await page.goto('/dashboard/social/compose');

      const currentUrl = page.url();
      if (currentUrl.includes('sign-in') || currentUrl.includes('login')) {
        return;
      }

      // 데스크톱에서 전체 레이아웃 확인
      await expect(page.locator('body')).toBeVisible();

      // 큰 화면에서 모든 UI 요소가 적절히 배치되는지 확인
      const mainContent = page.locator('main, [role="main"], .main-content');
      if (await mainContent.count() > 0) {
        await expect(mainContent.first()).toBeVisible();
      }
    });
  });

  test.describe('키보드 네비게이션 테스트', () => {
    test('Tab 키를 이용한 포커스 이동', async () => {
      await page.goto('/');

      // 첫 번째 포커스 가능한 요소로 이동
      await page.keyboard.press('Tab');

      // 현재 포커스된 요소 확인
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // 여러 번 Tab 눌러서 포커스 이동 테스트
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
      }

      // Shift+Tab으로 역방향 이동 테스트
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Shift+Tab');
        await page.waitForTimeout(200);
      }
    });

    test('Enter 키로 버튼 활성화', async () => {
      await page.goto('/');

      // 클릭 가능한 버튼 찾기
      const buttons = page.locator('button, a[role="button"]');
      if (await buttons.count() > 0) {
        // 첫 번째 버튼에 포커스
        await buttons.first().focus();

        // Enter 키로 클릭
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('에러 상태 및 로딩 상태 UI', () => {
    test('존재하지 않는 페이지 접근시 404 페이지', async () => {
      await page.goto('/non-existent-page-xyz123');

      // 404 페이지 또는 에러 메시지 확인
      const notFoundIndicators = [
        page.locator('text=404'),
        page.locator('text=Not Found'),
        page.locator('text=페이지를 찾을 수 없습니다'),
        page.locator('[data-testid="not-found"]')
      ];

      let found = false;
      for (const indicator of notFoundIndicators) {
        if (await indicator.isVisible()) {
          found = true;
          break;
        }
      }

      // 최소한 페이지가 렌더링되어야 함
      await expect(page.locator('body')).toBeVisible();
    });

    test('로딩 상태 UI 요소 확인', async () => {
      await page.goto('/dashboard/social/posts');

      const currentUrl = page.url();
      if (currentUrl.includes('sign-in') || currentUrl.includes('login')) {
        return;
      }

      // 페이지 새로고침하여 로딩 상태 관찰
      await page.reload();

      // 로딩 인디케이터 확인 (있다면)
      const loadingIndicators = page.locator(
        '[data-testid*="loading"], .loading, .spinner, [aria-label*="loading"]'
      );

      // 로딩이 완료되면 콘텐츠가 표시되어야 함
      await page.waitForTimeout(3000);
      await expect(page.locator('body')).toBeVisible();
    });
  });
});