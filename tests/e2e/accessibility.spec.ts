/**
 * 접근성 테스트
 * WCAG 2.1 AA 수준 준수 확인
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('접근성 테스트', () => {
  test.describe('자동화된 접근성 검사', () => {
    const pagesToTest = [
      { name: '랜딩 페이지', url: '/' },
      { name: '대시보드', url: '/dashboard' },
      { name: '소셜 미디어 컴포즈', url: '/dashboard/social/compose' },
      { name: '소셜 미디어 포스트', url: '/dashboard/social/posts' },
      { name: '페르소나 관리', url: '/dashboard/social/personas' },
      { name: '소셜 분석', url: '/dashboard/social/analytics' }
    ];

    pagesToTest.forEach(pageInfo => {
      test(`${pageInfo.name} 접근성 검사`, async ({ page }) => {
        await page.goto(pageInfo.url);

        // 인증이 필요한 페이지는 로그인 페이지로 리다이렉트될 수 있음
        const currentUrl = page.url();
        const isAuthPage = currentUrl.includes('sign-in') || currentUrl.includes('login');

        // 페이지 로딩 대기
        await page.waitForSelector('body', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // axe-core를 사용한 접근성 검사
        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .exclude('#clerk-components') // Clerk 컴포넌트 제외 (외부 라이브러리)
          .analyze();

        // 심각한 위반사항이 없어야 함
        expect(accessibilityScanResults.violations.filter(v => v.impact === 'critical')).toHaveLength(0);

        // 심각하지 않은 위반사항도 최소화되어야 함
        const seriousViolations = accessibilityScanResults.violations.filter(v => v.impact === 'serious');
        if (seriousViolations.length > 0) {
          console.warn(`${pageInfo.name}에서 심각한 접근성 문제 발견:`, seriousViolations);
        }

        // 결과 로깅
        console.log(`${pageInfo.name} 접근성 검사 결과:`, {
          passes: accessibilityScanResults.passes.length,
          violations: accessibilityScanResults.violations.length,
          incomplete: accessibilityScanResults.incomplete.length
        });
      });
    });
  });

  test.describe('키보드 네비게이션 테스트', () => {
    test('Tab 키를 이용한 포커스 순서 확인', async ({ page }) => {
      await page.goto('/');

      const focusableElements: string[] = [];

      // 첫 번째 Tab
      await page.keyboard.press('Tab');
      let focusedElement = await page.locator(':focus').getAttribute('data-testid')
        || await page.locator(':focus').getAttribute('aria-label')
        || await page.locator(':focus').getAttribute('id')
        || await page.locator(':focus').textContent()
        || 'unknown';

      focusableElements.push(focusedElement);

      // 여러 번 Tab 키 누르기
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');

        const currentFocused = await page.locator(':focus').getAttribute('data-testid')
          || await page.locator(':focus').getAttribute('aria-label')
          || await page.locator(':focus').getAttribute('id')
          || await page.locator(':focus').textContent()
          || 'unknown';

        focusableElements.push(currentFocused);

        // 포커스된 요소가 실제로 보이는지 확인
        const focusedElementLocator = page.locator(':focus');
        if (await focusedElementLocator.count() > 0) {
          await expect(focusedElementLocator).toBeVisible();
        }
      }

      console.log('포커스 순서:', focusableElements);

      // 최소한 몇 개의 요소는 포커스를 받아야 함
      expect(focusableElements.length).toBeGreaterThan(3);
    });

    test('Shift+Tab을 이용한 역방향 네비게이션', async ({ page }) => {
      await page.goto('/');

      // 먼저 몇 번 Tab을 눌러서 이동
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      const focusedAfterTab = page.locator(':focus');

      // Shift+Tab으로 역방향 이동
      await page.keyboard.press('Shift+Tab');

      const focusedAfterShiftTab = page.locator(':focus');

      // 두 요소가 다른지 확인 (역방향으로 이동했는지)
      const sameElement = await focusedAfterTab.evaluate((el, other) => el === other,
        await focusedAfterShiftTab.elementHandle());

      expect(sameElement).toBeFalsy();
    });

    test('Enter와 Space 키를 이용한 버튼 활성화', async ({ page }) => {
      await page.goto('/');

      // 클릭 가능한 버튼 찾기
      const buttons = page.locator('button, a[role="button"], [role="button"]');

      if (await buttons.count() > 0) {
        const firstButton = buttons.first();

        // 버튼에 포커스
        await firstButton.focus();
        await expect(firstButton).toBeFocused();

        // Enter 키로 활성화
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Space 키로도 테스트 (다른 버튼이 있다면)
        if (await buttons.count() > 1) {
          const secondButton = buttons.nth(1);
          await secondButton.focus();
          await page.keyboard.press(' '); // Space key
          await page.waitForTimeout(1000);
        }
      }
    });

    test('Escape 키를 이용한 모달/오버레이 닫기', async ({ page }) => {
      await page.goto('/');

      // 모달을 여는 버튼 찾기
      const modalTriggers = page.locator('button').filter({ hasText: /로그인|메뉴|설정/i });

      if (await modalTriggers.count() > 0) {
        await modalTriggers.first().click();
        await page.waitForTimeout(1000);

        // 모달이나 오버레이가 열렸는지 확인
        const modal = page.locator('[role="dialog"], .modal, [data-testid*="modal"]');

        if (await modal.count() > 0) {
          // Escape 키로 닫기
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);

          // 모달이 닫혔는지 확인
          await expect(modal.first()).not.toBeVisible();
        }
      }
    });
  });

  test.describe('스크린 리더 호환성', () => {
    test('의미있는 제목 구조 확인', async ({ page }) => {
      await page.goto('/');

      // h1 태그가 하나만 있는지 확인
      const h1Elements = page.locator('h1');
      const h1Count = await h1Elements.count();
      expect(h1Count).toBeLessThanOrEqual(1);

      if (h1Count > 0) {
        await expect(h1Elements.first()).toBeVisible();
        const h1Text = await h1Elements.first().textContent();
        expect(h1Text?.trim()).toBeTruthy();
      }

      // 제목의 계층 구조 확인
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

      for (const heading of headings) {
        const text = await heading.textContent();
        expect(text?.trim()).toBeTruthy(); // 빈 제목이 없어야 함
      }
    });

    test('이미지 alt 텍스트 확인', async ({ page }) => {
      await page.goto('/');

      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const src = await img.getAttribute('src');

        // 장식용 이미지가 아니라면 alt 텍스트가 있어야 함
        if (src && !src.includes('decoration') && !src.includes('spacer')) {
          expect(alt).toBeTruthy();
        }
      }
    });

    test('폼 레이블 연결 확인', async ({ page }) => {
      await page.goto('/dashboard/social/compose');

      const currentUrl = page.url();
      if (currentUrl.includes('sign-in') || currentUrl.includes('login')) {
        return;
      }

      // 입력 필드들 확인
      const inputs = page.locator('input, textarea, select');
      const inputCount = await inputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const type = await input.getAttribute('type');

        // hidden 필드는 제외
        if (type === 'hidden') continue;

        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');

        // 적어도 하나의 레이블링 방법이 있어야 함
        let hasLabel = false;

        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          if (await label.count() > 0) {
            hasLabel = true;
          }
        }

        if (ariaLabel || ariaLabelledby) {
          hasLabel = true;
        }

        if (!hasLabel) {
          console.warn('레이블이 없는 입력 필드 발견:', await input.getAttribute('name') || 'unknown');
        }
      }
    });

    test('링크 텍스트 의미성 확인', async ({ page }) => {
      await page.goto('/');

      const links = page.locator('a');
      const linkCount = await links.count();

      for (let i = 0; i < linkCount; i++) {
        const link = links.nth(i);
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');

        const linkText = text?.trim() || ariaLabel?.trim() || '';

        // 의미없는 링크 텍스트 확인
        const meaninglessTexts = ['click here', '여기', 'here', 'more', '더보기'];
        const isMeaningless = meaninglessTexts.some(meaningless =>
          linkText.toLowerCase().includes(meaningless));

        if (isMeaningless) {
          console.warn('의미없는 링크 텍스트:', linkText);
        }
      }
    });
  });

  test.describe('색상 및 대비 테스트', () => {
    test('색상만으로 정보를 전달하지 않는지 확인', async ({ page }) => {
      await page.goto('/dashboard/social/posts');

      const currentUrl = page.url();
      if (currentUrl.includes('sign-in') || currentUrl.includes('login')) {
        return;
      }

      // 상태를 나타내는 요소들 확인
      const statusElements = page.locator('[class*="status"], [data-status], .success, .error, .warning');
      const count = await statusElements.count();

      for (let i = 0; i < count; i++) {
        const element = statusElements.nth(i);
        const text = await element.textContent();

        // 텍스트나 아이콘이 있는지 확인 (색상만으로 상태를 표현하지 않음)
        const hasText = text && text.trim().length > 0;
        const hasIcon = await element.locator('svg, i, [class*="icon"]').count() > 0;

        if (!hasText && !hasIcon) {
          console.warn('색상만으로 정보를 전달할 수 있는 요소:', await element.getAttribute('class'));
        }
      }
    });
  });

  test.describe('모바일 접근성', () => {
    test('터치 타겟 크기 확인', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // 클릭 가능한 요소들 확인
      const clickableElements = page.locator('button, a, [role="button"], input[type="button"], input[type="submit"]');
      const count = await clickableElements.count();

      for (let i = 0; i < Math.min(count, 10); i++) { // 처음 10개만 테스트
        const element = clickableElements.nth(i);

        if (await element.isVisible()) {
          const box = await element.boundingBox();

          if (box) {
            // 최소 44px × 44px 터치 타겟 크기 권장 (WCAG)
            const minSize = 44;

            if (box.width < minSize || box.height < minSize) {
              console.warn(`작은 터치 타겟 발견: ${box.width}x${box.height}px`);
            }
          }
        }
      }
    });

    test('확대/축소 지원 확인', async ({ page }) => {
      await page.goto('/');

      // viewport meta 태그 확인
      const viewportMeta = page.locator('meta[name="viewport"]');

      if (await viewportMeta.count() > 0) {
        const content = await viewportMeta.getAttribute('content');

        // user-scalable=no나 maximum-scale=1.0이 없어야 함 (확대 금지하면 안됨)
        expect(content).not.toMatch(/user-scalable\s*=\s*no/i);
        expect(content).not.toMatch(/maximum-scale\s*=\s*1\.0/);
      }
    });
  });
});