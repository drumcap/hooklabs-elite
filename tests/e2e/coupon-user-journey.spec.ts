import { test, expect } from '@playwright/test'

test.describe('Coupon User Journey E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the authentication state
    await page.addInitScript(() => {
      window.localStorage.setItem('clerk-session', JSON.stringify({
        id: 'test-session',
        user: {
          id: 'test-user-123',
          emailAddress: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        }
      }))
    })

    // Mock API responses
    await page.route('**/api/convex/**', async (route) => {
      const url = route.request().url()
      
      if (url.includes('validateCoupon')) {
        const body = JSON.parse(route.request().postData() || '{}')
        const code = body.args?.code
        
        if (code === 'VALID20') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              valid: true,
              coupon: {
                id: 'coupon-123',
                code: 'VALID20',
                name: '20% 할인 쿠폰',
                type: 'percentage',
                value: 20,
                discountAmount: 2000
              }
            })
          })
        } else if (code === 'EXPIRED') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              valid: false,
              error: '만료된 쿠폰입니다.'
            })
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              valid: false,
              error: '유효하지 않은 쿠폰 코드입니다.'
            })
          })
        }
      } else if (url.includes('getCouponUsageHistory')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              _id: 'usage1',
              coupon: {
                code: 'USED20',
                name: '사용한 쿠폰',
                type: 'percentage',
                value: 20
              },
              discountAmount: 1500,
              currency: 'USD',
              usedAt: '2024-01-15T10:30:00Z',
              orderId: 'order_123'
            }
          ])
        })
      } else {
        await route.continue()
      }
    })
  })

  test('유저가 유효한 쿠폰을 검증하고 적용하는 전체 플로우', async ({ page }) => {
    // Given: 체크아웃 페이지 방문
    await page.goto('/checkout')
    
    // When: 쿠폰 섹션 찾기
    const couponSection = page.locator('[data-testid="coupon-validation"]')
    await expect(couponSection).toBeVisible()
    
    // Then: 쿠폰 입력 폼이 표시됨
    const couponInput = couponSection.locator('input[placeholder*="쿠폰"]')
    const couponLabel = couponSection.locator('text=쿠폰 적용')
    
    await expect(couponLabel).toBeVisible()
    await expect(couponInput).toBeVisible()
    await expect(couponInput).toBeEnabled()
    
    // When: 유효한 쿠폰 코드 입력
    await couponInput.fill('VALID20')
    
    // Then: 실시간 검증 결과가 표시됨
    await expect(couponSection.locator('text=20% 할인 쿠폰')).toBeVisible({ timeout: 2000 })
    await expect(couponSection.locator('text=$20.00 할인')).toBeVisible()
    
    // When: 적용 버튼 클릭
    const applyButton = couponSection.locator('button:has-text("적용")')
    await expect(applyButton).toBeVisible()
    await expect(applyButton).toBeEnabled()
    await applyButton.click()
    
    // Then: 쿠폰이 적용되고 할인 요약이 표시됨
    await expect(couponSection.locator('button:has-text("제거")')).toBeVisible()
    await expect(couponSection.locator('text=주문 금액:')).toBeVisible()
    await expect(couponSection.locator('text=쿠폰 할인:')).toBeVisible()
    await expect(couponSection.locator('text=최종 결제 금액:')).toBeVisible()
    
    // Then: 성공 토스트 메시지 확인
    await expect(page.locator('text=쿠폰이 적용되었습니다')).toBeVisible({ timeout: 1000 })
  })

  test('유저가 유효하지 않은 쿠폰에 대한 에러 메시지를 확인', async ({ page }) => {
    await page.goto('/checkout')
    
    const couponSection = page.locator('[data-testid="coupon-validation"]')
    const couponInput = couponSection.locator('input[placeholder*="쿠폰"]')
    
    // When: 유효하지 않은 쿠폰 코드 입력
    await couponInput.fill('INVALID')
    
    // Then: 에러 메시지가 표시됨
    await expect(couponSection.locator('text=유효하지 않은 쿠폰 코드입니다.')).toBeVisible({ timeout: 2000 })
    
    // Then: 에러 스타일이 적용됨
    await expect(couponInput).toHaveClass(/border-destructive|border-red/)
    
    // Then: 적용 버튼이 표시되지 않음
    await expect(couponSection.locator('button:has-text("적용")')).not.toBeVisible()
  })

  test('유저가 만료된 쿠폰에 대한 적절한 안내를 받음', async ({ page }) => {
    await page.goto('/checkout')
    
    const couponSection = page.locator('[data-testid="coupon-validation"]')
    const couponInput = couponSection.locator('input[placeholder*="쿠폰"]')
    
    // When: 만료된 쿠폰 코드 입력
    await couponInput.fill('EXPIRED')
    
    // Then: 만료 에러 메시지가 표시됨
    await expect(couponSection.locator('text=만료된 쿠폰입니다.')).toBeVisible({ timeout: 2000 })
    
    // Then: 에러 아이콘이 표시됨
    await expect(couponSection.locator('[data-icon="alert-circle"]')).toBeVisible()
  })

  test('유저가 적용된 쿠폰을 제거할 수 있음', async ({ page }) => {
    await page.goto('/checkout')
    
    const couponSection = page.locator('[data-testid="coupon-validation"]')
    const couponInput = couponSection.locator('input[placeholder*="쿠폰"]')
    
    // Given: 유효한 쿠폰 적용
    await couponInput.fill('VALID20')
    const applyButton = couponSection.locator('button:has-text("적용")')
    await applyButton.click()
    
    await expect(couponSection.locator('button:has-text("제거")')).toBeVisible()
    
    // When: 제거 버튼 클릭
    const removeButton = couponSection.locator('button:has-text("제거")')
    await removeButton.click()
    
    // Then: 쿠폰이 제거되고 초기 상태로 복원됨
    await expect(couponInput).toHaveValue('')
    await expect(couponSection.locator('button:has-text("제거")')).not.toBeVisible()
    await expect(couponSection.locator('text=최종 결제 금액:')).not.toBeVisible()
    
    // Then: 제거 확인 토스트 메시지
    await expect(page.locator('text=쿠폰이 제거되었습니다')).toBeVisible({ timeout: 1000 })
  })

  test('유저가 X 버튼으로도 쿠폰을 제거할 수 있음', async ({ page }) => {
    await page.goto('/checkout')
    
    const couponSection = page.locator('[data-testid="coupon-validation"]')
    const couponInput = couponSection.locator('input[placeholder*="쿠폰"]')
    
    // Given: 유효한 쿠폰 적용
    await couponInput.fill('VALID20')
    const applyButton = couponSection.locator('button:has-text("적용")')
    await applyButton.click()
    
    // When: X 버튼 클릭
    const xButton = couponSection.locator('button[aria-label="쿠폰 제거"]')
    await expect(xButton).toBeVisible()
    await xButton.click()
    
    // Then: 쿠폰이 제거됨
    await expect(couponInput).toHaveValue('')
    await expect(xButton).not.toBeVisible()
  })

  test('유저가 Enter 키로 쿠폰을 적용할 수 있음', async ({ page }) => {
    await page.goto('/checkout')
    
    const couponSection = page.locator('[data-testid="coupon-validation"]')
    const couponInput = couponSection.locator('input[placeholder*="쿠폰"]')
    
    // When: 쿠폰 코드 입력 후 Enter
    await couponInput.fill('VALID20')
    await couponInput.press('Enter')
    
    // Then: 쿠폰이 자동으로 적용됨
    await expect(couponSection.locator('button:has-text("제거")')).toBeVisible({ timeout: 2000 })
    await expect(couponSection.locator('text=최종 결제 금액:')).toBeVisible()
  })

  test('유저가 쿠폰 사용 내역을 확인할 수 있음', async ({ page }) => {
    // Given: 마이페이지 방문
    await page.goto('/dashboard/coupons')
    
    // When: 사용 내역 섹션 확인
    const historySection = page.locator('[data-testid="coupon-usage-history"]')
    await expect(historySection).toBeVisible()
    
    // Then: 헤더가 표시됨
    await expect(historySection.locator('text=쿠폰 사용 내역')).toBeVisible()
    
    // Then: 사용한 쿠폰 정보가 표시됨
    await expect(historySection.locator('text=USED20')).toBeVisible()
    await expect(historySection.locator('text=사용한 쿠폰')).toBeVisible()
    await expect(historySection.locator('text=$15.00 할인')).toBeVisible()
    await expect(historySection.locator('text=2024년 1월 15일')).toBeVisible()
    await expect(historySection.locator('text=주문: order_123')).toBeVisible()
    
    // Then: 쿠폰 타입 배지가 표시됨
    await expect(historySection.locator('text=비율 할인')).toBeVisible()
  })

  test('유저가 빈 사용 내역 상태를 확인할 수 있음', async ({ page }) => {
    // Mock empty usage history
    await page.route('**/api/convex/**', async (route) => {
      const url = route.request().url()
      
      if (url.includes('getCouponUsageHistory')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        })
      } else {
        await route.continue()
      }
    })
    
    await page.goto('/dashboard/coupons')
    
    const historySection = page.locator('[data-testid="coupon-usage-history"]')
    
    // Then: 빈 상태 메시지가 표시됨
    await expect(historySection.locator('text=쿠폰 사용 내역이 없습니다')).toBeVisible()
    await expect(historySection.locator('text=아직 사용한 쿠폰이 없어요')).toBeVisible()
    
    // Then: 빈 상태 일러스트나 아이콘이 표시됨
    await expect(historySection.locator('[data-testid="empty-state-icon"]')).toBeVisible()
  })

  test('모바일 환경에서 쿠폰 기능이 올바르게 작동함', async ({ page }) => {
    // Given: 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/checkout')
    
    const couponSection = page.locator('[data-testid="coupon-validation"]')
    const couponInput = couponSection.locator('input[placeholder*="쿠폰"]')
    
    // Then: 모바일에서도 쿠폰 섹션이 올바르게 표시됨
    await expect(couponSection).toBeVisible()
    await expect(couponInput).toBeVisible()
    
    // When: 터치로 입력 필드 포커스
    await couponInput.tap()
    await expect(couponInput).toBeFocused()
    
    // When: 모바일 키보드로 쿠폰 입력
    await couponInput.fill('VALID20')
    
    // Then: 모바일에서도 검증 결과가 올바르게 표시됨
    await expect(couponSection.locator('text=20% 할인 쿠폰')).toBeVisible({ timeout: 2000 })
    
    // When: 터치로 적용 버튼 클릭
    const applyButton = couponSection.locator('button:has-text("적용")')
    await applyButton.tap()
    
    // Then: 모바일에서도 쿠폰이 정상 적용됨
    await expect(couponSection.locator('text=최종 결제 금액:')).toBeVisible()
  })

  test('키보드 네비게이션으로 쿠폰 기능을 사용할 수 있음', async ({ page }) => {
    await page.goto('/checkout')
    
    const couponSection = page.locator('[data-testid="coupon-validation"]')
    const couponInput = couponSection.locator('input[placeholder*="쿠폰"]')
    
    // When: Tab으로 쿠폰 입력 필드에 포커스
    await page.keyboard.press('Tab')
    // 다른 요소들을 지나 쿠폰 입력 필드까지 Tab
    while (!await couponInput.isFocused()) {
      await page.keyboard.press('Tab')
    }
    
    await expect(couponInput).toBeFocused()
    
    // When: 키보드로 쿠폰 코드 입력
    await page.keyboard.type('VALID20')
    
    // When: Tab으로 적용 버튼에 포커스 이동
    await page.keyboard.press('Tab')
    const applyButton = couponSection.locator('button:has-text("적용")')
    await expect(applyButton).toBeFocused()
    
    // When: Space 또는 Enter로 적용
    await page.keyboard.press('Space')
    
    // Then: 쿠폰이 적용됨
    await expect(couponSection.locator('button:has-text("제거")')).toBeVisible()
    
    // When: Tab으로 제거 버튼에 포커스 이동
    await page.keyboard.press('Tab')
    const removeButton = couponSection.locator('button:has-text("제거")')
    await expect(removeButton).toBeFocused()
    
    // When: Space로 제거
    await page.keyboard.press('Space')
    
    // Then: 쿠폰이 제거됨
    await expect(couponInput).toHaveValue('')
  })

  test('스크린 리더 지원을 위한 접근성 속성들이 올바르게 설정됨', async ({ page }) => {
    await page.goto('/checkout')
    
    const couponSection = page.locator('[data-testid="coupon-validation"]')
    const couponInput = couponSection.locator('input[placeholder*="쿠폰"]')
    
    // Then: ARIA 속성들이 올바르게 설정됨
    await expect(couponInput).toHaveAttribute('aria-describedby')
    await expect(couponInput).toHaveAttribute('aria-invalid', 'false')
    
    // Then: 상태 영역이 live region으로 설정됨
    const statusRegion = couponSection.locator('[role="status"]')
    await expect(statusRegion).toBeVisible()
    await expect(statusRegion).toHaveAttribute('aria-live', 'polite')
    await expect(statusRegion).toHaveAttribute('aria-atomic', 'true')
    
    // When: 에러 상태에서 aria-invalid 변경 확인
    await couponInput.fill('INVALID')
    await expect(couponInput).toHaveAttribute('aria-invalid', 'true', { timeout: 2000 })
    
    // Then: 에러 메시지가 적절한 역할로 표시됨
    const errorMessage = couponSection.locator('[role="alert"]')
    await expect(errorMessage).toBeVisible()
  })

  test('다크 모드에서도 쿠폰 UI가 올바르게 표시됨', async ({ page }) => {
    // Given: 다크 모드 설정
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/checkout')
    
    const couponSection = page.locator('[data-testid="coupon-validation"]')
    
    // Then: 다크 모드 스타일이 적용됨
    await expect(couponSection).toHaveCSS('background-color', /rgb\(/)
    
    // When: 쿠폰 입력 및 적용
    const couponInput = couponSection.locator('input[placeholder*="쿠폰"]')
    await couponInput.fill('VALID20')
    
    const applyButton = couponSection.locator('button:has-text("적용")')
    await applyButton.click()
    
    // Then: 다크 모드에서도 할인 요약이 올바르게 표시됨
    await expect(couponSection.locator('text=최종 결제 금액:')).toBeVisible()
    
    // Then: 다크 모드 색상이 적절히 적용됨
    const discountText = couponSection.locator('text*="할인"').first()
    await expect(discountText).toBeVisible()
  })
})