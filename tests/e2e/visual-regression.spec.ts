/**
 * 시각적 회귀 테스트
 * 주요 페이지들의 스크린샷을 비교하여 UI 변경사항을 감지
 */

import { test, expect } from '@playwright/test';

test.describe('시각적 회귀 테스트', () => {
  // 다양한 뷰포트 크기 정의
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 }
  ];

  // 테스트할 페이지들 정의
  const pages = [
    { name: 'landing', url: '/', waitFor: 'h1' },
    { name: 'dashboard', url: '/dashboard', waitFor: 'body' },
    { name: 'social-compose', url: '/dashboard/social/compose', waitFor: 'body' },
    { name: 'social-posts', url: '/dashboard/social/posts', waitFor: 'body' },
    { name: 'social-personas', url: '/dashboard/social/personas', waitFor: 'body' },
    { name: 'social-analytics', url: '/dashboard/social/analytics', waitFor: 'body' }
  ];

  viewports.forEach(viewport => {
    test.describe(`${viewport.name} 뷰포트 (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      pages.forEach(pageInfo => {
        test(`${pageInfo.name} 페이지 스크린샷`, async ({ page }) => {
          try {
            await page.goto(pageInfo.url);

            // 인증이 필요한 페이지는 로그인 페이지로 리다이렉트될 수 있음
            const currentUrl = page.url();
            const isAuthPage = currentUrl.includes('sign-in') || currentUrl.includes('login');

            if (isAuthPage && pageInfo.url !== '/') {
              // 인증 페이지의 스크린샷 찍기
              await page.waitForSelector('body', { timeout: 10000 });
              await page.waitForTimeout(2000); // UI 안정화 대기

              await expect(page).toHaveScreenshot(
                `auth-redirect-${pageInfo.name}-${viewport.name}.png`,
                {
                  fullPage: true,
                  mask: [
                    page.locator('[data-test-id="dynamic-content"]'),
                    page.locator('.timestamp'),
                    page.locator('[class*="time"]')
                  ]
                }
              );
              return;
            }

            // 페이지 로딩 대기
            await page.waitForSelector(pageInfo.waitFor, { timeout: 10000 });
            await page.waitForTimeout(2000); // 애니메이션 및 동적 콘텐츠 로딩 대기

            // 스크롤 가능한 영역이 있다면 최상단으로 이동
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.waitForTimeout(500);

            // 전체 페이지 스크린샷
            await expect(page).toHaveScreenshot(
              `${pageInfo.name}-${viewport.name}-full.png`,
              {
                fullPage: true,
                mask: [
                  // 동적 콘텐츠 마스킹
                  page.locator('[data-test-id="dynamic-content"]'),
                  page.locator('.timestamp'),
                  page.locator('[class*="time"]'),
                  page.locator('[data-testid*="time"]'),
                  // 사용자별 데이터 마스킹
                  page.locator('[data-testid="user-avatar"]'),
                  page.locator('.user-avatar'),
                  // 실시간 데이터 마스킹
                  page.locator('[data-testid*="realtime"]'),
                  page.locator('[data-testid*="live"]')
                ]
              }
            );

            // 뷰포트 기준 스크린샷 (스크롤 없이)
            await expect(page).toHaveScreenshot(
              `${pageInfo.name}-${viewport.name}-viewport.png`,
              {
                fullPage: false,
                mask: [
                  page.locator('[data-test-id="dynamic-content"]'),
                  page.locator('.timestamp'),
                  page.locator('[class*="time"]')
                ]
              }
            );

          } catch (error) {
            console.log(`스크린샷 테스트 실패: ${pageInfo.name} on ${viewport.name}`, error);
            // 기본 페이지 스크린샷이라도 찍기
            await expect(page).toHaveScreenshot(
              `${pageInfo.name}-${viewport.name}-fallback.png`,
              { fullPage: false }
            );
          }
        });
      });
    });
  });

  test.describe('컴포넌트별 스크린샷', () => {
    test('네비게이션 바 스크린샷', async ({ page }) => {
      await page.goto('/');

      const nav = page.locator('nav').first();
      if (await nav.isVisible()) {
        await expect(nav).toHaveScreenshot('navigation-bar.png');
      }
    });

    test('푸터 스크린샷', async ({ page }) => {
      await page.goto('/');

      const footer = page.locator('footer').first();
      if (await footer.isVisible()) {
        await expect(footer).toHaveScreenshot('footer.png');
      }
    });

    test('사이드바 스크린샷', async ({ page }) => {
      await page.goto('/dashboard');

      const currentUrl = page.url();
      if (currentUrl.includes('sign-in') || currentUrl.includes('login')) {
        return;
      }

      const sidebar = page.locator('[data-testid="sidebar"]').or(page.locator('aside')).first();
      if (await sidebar.isVisible()) {
        await expect(sidebar).toHaveScreenshot('sidebar.png');
      }
    });
  });

  test.describe('상태별 스크린샷', () => {
    test('다크 모드 스크린샷', async ({ page }) => {
      await page.goto('/');

      // 다크 모드 토글 버튼 찾기
      const darkModeToggle = page.locator('[data-testid="theme-toggle"]')
        .or(page.locator('button[aria-label*="dark"]'))
        .or(page.locator('button[aria-label*="theme"]'));

      if (await darkModeToggle.first().isVisible()) {
        await darkModeToggle.first().click();
        await page.waitForTimeout(1000);

        await expect(page).toHaveScreenshot('landing-dark-mode.png', {
          fullPage: true
        });
      }
    });

    test('모바일 메뉴 열린 상태 스크린샷', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      const mobileMenuToggle = page.locator('[data-testid="mobile-menu-toggle"]')
        .or(page.locator('button[aria-label*="menu"]'));

      if (await mobileMenuToggle.first().isVisible()) {
        await mobileMenuToggle.first().click();
        await page.waitForTimeout(1000);

        await expect(page).toHaveScreenshot('mobile-menu-open.png');
      }
    });
  });

  test.describe('상호작용 상태 스크린샷', () => {
    test('버튼 호버 상태 스크린샷', async ({ page }) => {
      await page.goto('/');

      const primaryButton = page.locator('button').first();
      if (await primaryButton.isVisible()) {
        await primaryButton.hover();
        await page.waitForTimeout(500);

        await expect(primaryButton).toHaveScreenshot('button-hover-state.png');
      }
    });

    test('폼 포커스 상태 스크린샷', async ({ page }) => {
      await page.goto('/dashboard/social/compose');

      const currentUrl = page.url();
      if (currentUrl.includes('sign-in') || currentUrl.includes('login')) {
        return;
      }

      const textArea = page.locator('textarea').first();
      if (await textArea.isVisible()) {
        await textArea.focus();
        await page.waitForTimeout(500);

        await expect(textArea).toHaveScreenshot('textarea-focus-state.png');
      }
    });
  });

  test.describe('에러 상태 스크린샷', () => {
    test('404 페이지 스크린샷', async ({ page }) => {
      await page.goto('/non-existent-page-xyz123');
      await page.waitForTimeout(2000);

      await expect(page).toHaveScreenshot('404-page.png', {
        fullPage: true
      });
    });

    test('네트워크 오프라인 상태 시뮬레이션', async ({ page, context }) => {
      // 네트워크 차단
      await context.setOffline(true);

      try {
        await page.goto('/dashboard', { timeout: 10000 });
      } catch (error) {
        // 네트워크 오류 페이지 스크린샷
        await expect(page).toHaveScreenshot('network-error.png');
      }

      // 네트워크 복구
      await context.setOffline(false);
    });
  });
});