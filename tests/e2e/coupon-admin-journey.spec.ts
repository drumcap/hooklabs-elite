import { test, expect } from '@playwright/test'

test.describe('Coupon Admin Journey E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin authentication state
    await page.addInitScript(() => {
      window.localStorage.setItem('clerk-session', JSON.stringify({
        id: 'admin-session',
        user: {
          id: 'admin-user-123',
          emailAddress: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          publicMetadata: {
            role: 'admin'
          }
        }
      }))
    })

    // Mock API responses
    await page.route('**/api/convex/**', async (route) => {
      const url = route.request().url()
      const body = JSON.parse(route.request().postData() || '{}')
      
      if (url.includes('getCoupons')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              _id: 'coupon1',
              code: 'ACTIVE20',
              name: '활성 쿠폰',
              type: 'percentage',
              value: 20,
              isActive: true,
              usageCount: 10,
              usageLimit: 100,
              validFrom: '2024-01-01T00:00:00Z',
              validUntil: '2024-12-31T23:59:59Z',
              createdAt: '2024-01-01T00:00:00Z'
            },
            {
              _id: 'coupon2',
              code: 'INACTIVE10',
              name: '비활성 쿠폰',
              type: 'fixed_amount',
              value: 1000,
              isActive: false,
              usageCount: 50,
              usageLimit: 100,
              validFrom: '2024-01-01T00:00:00Z',
              validUntil: '2024-12-31T23:59:59Z',
              createdAt: '2024-01-02T00:00:00Z'
            }
          ])
        })
      } else if (url.includes('getCouponStats')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total: 2,
            active: 1,
            inactive: 1,
            expired: 0,
            usageRate: 30,
            totalRevenue: 15000
          })
        })
      } else if (url.includes('createCoupon')) {
        const newCoupon = body.args
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            _id: 'new-coupon-id',
            ...newCoupon,
            usageCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        })
      } else if (url.includes('updateCoupon')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
      } else if (url.includes('deleteCoupon')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
      } else {
        await route.continue()
      }
    })
  })

  test('관리자가 쿠폰 대시보드에 접근하고 개요를 확인할 수 있음', async ({ page }) => {
    // Given: 관리자 쿠폰 대시보드 방문
    await page.goto('/admin/coupons')
    
    // Then: 대시보드 헤더가 표시됨
    await expect(page.locator('h1:has-text("쿠폰 관리")')).toBeVisible()
    
    // Then: 통계 카드들이 표시됨
    const statsSection = page.locator('[data-testid="coupon-stats"]')
    await expect(statsSection).toBeVisible()
    
    await expect(statsSection.locator('text=전체 쿠폰')).toBeVisible()
    await expect(statsSection.locator('text=2')).toBeVisible()
    
    await expect(statsSection.locator('text=활성 쿠폰')).toBeVisible()
    await expect(statsSection.locator('text=1')).toBeVisible()
    
    await expect(statsSection.locator('text=평균 사용률')).toBeVisible()
    await expect(statsSection.locator('text=30%')).toBeVisible()
    
    // Then: 새 쿠폰 생성 버튼이 표시됨
    await expect(page.locator('button:has-text("새 쿠폰 생성")')).toBeVisible()
    
    // Then: 쿠폰 목록이 표시됨
    const couponList = page.locator('[data-testid="coupon-list"]')
    await expect(couponList).toBeVisible()
    
    await expect(couponList.locator('text=ACTIVE20')).toBeVisible()
    await expect(couponList.locator('text=활성 쿠폰')).toBeVisible()
    await expect(couponList.locator('text=INACTIVE10')).toBeVisible()
    await expect(couponList.locator('text=비활성 쿠폰')).toBeVisible()
  })

  test('관리자가 새 쿠폰을 생성할 수 있음', async ({ page }) => {
    await page.goto('/admin/coupons')
    
    // When: 새 쿠폰 생성 버튼 클릭
    await page.locator('button:has-text("새 쿠폰 생성")').click()
    
    // Then: 쿠폰 생성 페이지로 이동
    await expect(page).toHaveURL('/admin/coupons/create')
    await expect(page.locator('h1:has-text("새 쿠폰 생성")')).toBeVisible()
    
    // When: 쿠폰 정보 입력
    const form = page.locator('[data-testid="coupon-creation-form"]')
    
    await form.locator('input[name="code"]').fill('SUMMER30')
    await form.locator('input[name="name"]').fill('여름 할인')
    await form.locator('textarea[name="description"]').fill('여름 시즌 30% 할인')
    
    // 할인 타입 선택
    const typeSelect = form.locator('select[name="type"], [role="combobox"][name="type"]')
    await typeSelect.click()
    await page.locator('text=비율 할인').click()
    
    // 할인값 입력
    await form.locator('input[name="value"]').fill('30')
    
    // 사용 제한 설정
    await form.locator('input[name="usageLimit"]').fill('100')
    await form.locator('input[name="userLimit"]').fill('1')
    
    // 최소 주문 금액 설정
    await form.locator('input[name="minAmount"]').fill('5000')
    
    // 유효 기간 설정
    await form.locator('input[name="validFrom"]').fill('2024-06-01')
    await form.locator('input[name="validUntil"]').fill('2024-08-31')
    
    // When: 쿠폰 생성 제출
    await form.locator('button:has-text("쿠폰 생성")').click()
    
    // Then: 성공 메시지 표시
    await expect(page.locator('text=쿠폰이 성공적으로 생성되었습니다')).toBeVisible({ timeout: 3000 })
    
    // Then: 대시보드로 리디렉트
    await expect(page).toHaveURL('/admin/coupons')
  })

  test('관리자가 쿠폰 생성 시 유효성 검증을 확인할 수 있음', async ({ page }) => {
    await page.goto('/admin/coupons/create')
    
    const form = page.locator('[data-testid="coupon-creation-form"]')
    
    // When: 빈 폼으로 제출 시도
    await form.locator('button:has-text("쿠폰 생성")').click()
    
    // Then: 유효성 검증 에러 메시지들이 표시됨
    await expect(form.locator('text=쿠폰 코드를 입력해주세요')).toBeVisible()
    await expect(form.locator('text=쿠폰 이름을 입력해주세요')).toBeVisible()
    await expect(form.locator('text=할인 타입을 선택해주세요')).toBeVisible()
    
    // When: 잘못된 형식으로 입력
    await form.locator('input[name="code"]').fill('inv@lid')
    await form.locator('input[name="value"]').fill('-10')
    
    // Then: 형식 검증 에러 메시지가 표시됨
    await expect(form.locator('text=영문자와 숫자만 사용 가능합니다')).toBeVisible()
    await expect(form.locator('text=0보다 큰 값을 입력해주세요')).toBeVisible()
  })

  test('관리자가 쿠폰 검색 및 필터링을 사용할 수 있음', async ({ page }) => {
    await page.goto('/admin/coupons')
    
    // When: 검색어 입력
    const searchInput = page.locator('input[placeholder*="검색"]')
    await searchInput.fill('ACTIVE')
    
    // Then: 검색 결과가 필터링됨 (디바운스 고려)
    await page.waitForTimeout(1000)
    await expect(page.locator('text=ACTIVE20')).toBeVisible()
    
    // When: 상태 필터 적용
    const statusFilter = page.locator('select[name="status"], [role="combobox"][aria-label*="상태"]')
    await statusFilter.click()
    await page.locator('text=활성').click()
    
    // Then: 필터링된 결과만 표시됨
    await expect(page.locator('text=ACTIVE20')).toBeVisible()
    
    // When: 타입 필터 적용
    const typeFilter = page.locator('[role="combobox"][aria-label*="타입"]')
    await typeFilter.click()
    await page.locator('text=비율 할인').click()
    
    // When: 정렬 옵션 변경
    const sortSelect = page.locator('select[name="sort"], [role="combobox"][aria-label*="정렬"]')
    await sortSelect.click()
    await page.locator('text=사용량 순').click()
  })

  test('관리자가 쿠폰을 일괄 선택하고 활성화/비활성화할 수 있음', async ({ page }) => {
    await page.goto('/admin/coupons')
    
    const couponList = page.locator('[data-testid="coupon-list"]')
    
    // When: 개별 쿠폰 선택
    const firstCouponCheckbox = couponList.locator('input[type="checkbox"]').first()
    await firstCouponCheckbox.check()
    
    // Then: 선택 카운터가 표시됨
    await expect(page.locator('text=1개 선택됨')).toBeVisible()
    
    // When: 전체 선택
    const selectAllCheckbox = page.locator('input[type="checkbox"][aria-label*="모든"]')
    await selectAllCheckbox.check()
    
    // Then: 모든 쿠폰이 선택됨
    await expect(page.locator('text=2개 선택됨')).toBeVisible()
    
    // When: 일괄 활성화 실행
    const bulkActivateButton = page.locator('button:has-text("선택 활성화")')
    await expect(bulkActivateButton).toBeVisible()
    await bulkActivateButton.click()
    
    // Then: 확인 다이얼로그가 표시됨
    const confirmDialog = page.locator('[role="dialog"]')
    await expect(confirmDialog).toBeVisible()
    await expect(confirmDialog.locator('text=2개의 쿠폰을 활성화하시겠습니까?')).toBeVisible()
    
    // When: 확인 버튼 클릭
    await confirmDialog.locator('button:has-text("확인")').click()
    
    // Then: 성공 메시지 표시
    await expect(page.locator('text=쿠폰이 성공적으로 업데이트되었습니다')).toBeVisible({ timeout: 3000 })
  })

  test('관리자가 쿠폰을 개별 편집할 수 있음', async ({ page }) => {
    await page.goto('/admin/coupons')
    
    // When: 쿠폰 카드의 편집 버튼 클릭
    const couponCard = page.locator('[data-testid="coupon-card"]').first()
    const editButton = couponCard.locator('button[aria-label*="편집"]')
    await editButton.click()
    
    // Then: 편집 모달이 표시됨
    const editModal = page.locator('[data-testid="coupon-edit-modal"]')
    await expect(editModal).toBeVisible()
    
    // When: 쿠폰 정보 수정
    const nameInput = editModal.locator('input[name="name"]')
    await nameInput.fill('수정된 쿠폰 이름')
    
    const descriptionInput = editModal.locator('textarea[name="description"]')
    await descriptionInput.fill('수정된 설명')
    
    // 사용 제한 변경
    const usageLimitInput = editModal.locator('input[name="usageLimit"]')
    await usageLimitInput.fill('200')
    
    // When: 저장 버튼 클릭
    await editModal.locator('button:has-text("저장")').click()
    
    // Then: 성공 메시지 표시
    await expect(page.locator('text=쿠폰이 성공적으로 업데이트되었습니다')).toBeVisible({ timeout: 3000 })
    
    // Then: 모달이 닫힘
    await expect(editModal).not.toBeVisible()
  })

  test('관리자가 쿠폰을 삭제할 수 있음', async ({ page }) => {
    await page.goto('/admin/coupons')
    
    const couponList = page.locator('[data-testid="coupon-list"]')
    
    // When: 쿠폰 선택
    const couponCheckbox = couponList.locator('input[type="checkbox"]').first()
    await couponCheckbox.check()
    
    // When: 삭제 버튼 클릭
    const deleteButton = page.locator('button:has-text("선택 삭제")')
    await deleteButton.click()
    
    // Then: 삭제 확인 다이얼로그가 표시됨
    const confirmDialog = page.locator('[role="dialog"]')
    await expect(confirmDialog).toBeVisible()
    await expect(confirmDialog.locator('text=정말 삭제하시겠습니까?')).toBeVisible()
    await expect(confirmDialog.locator('text=이 작업은 되돌릴 수 없습니다')).toBeVisible()
    
    // When: 삭제 확인
    await confirmDialog.locator('button:has-text("삭제")').click()
    
    // Then: 성공 메시지 표시
    await expect(page.locator('text=쿠폰이 성공적으로 삭제되었습니다')).toBeVisible({ timeout: 3000 })
  })

  test('관리자가 CSV로 쿠폰 데이터를 내보낼 수 있음', async ({ page }) => {
    await page.goto('/admin/coupons')
    
    // When: 쿠폰들 선택
    const selectAllCheckbox = page.locator('input[type="checkbox"][aria-label*="모든"]')
    await selectAllCheckbox.check()
    
    // When: CSV 내보내기 버튼 클릭
    const downloadPromise = page.waitForEvent('download')
    const exportButton = page.locator('button:has-text("CSV 내보내기")')
    await exportButton.click()
    
    // Then: 파일 다운로드가 시작됨
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/coupons.*\.csv$/)
    
    // Then: 성공 메시지 표시
    await expect(page.locator('text=CSV 파일이 다운로드됩니다')).toBeVisible({ timeout: 3000 })
  })

  test('관리자가 쿠폰 통계를 확인할 수 있음', async ({ page }) => {
    await page.goto('/admin/coupons')
    
    // Then: 통계 차트가 표시됨
    const chartSection = page.locator('[data-testid="coupon-stats-chart"]')
    await expect(chartSection).toBeVisible()
    
    // When: 통계 기간 변경
    const periodSelect = chartSection.locator('select[name="period"], [role="combobox"][aria-label*="기간"]')
    await periodSelect.click()
    await page.locator('text=최근 30일').click()
    
    // Then: 차트가 업데이트됨
    await expect(chartSection.locator('[data-testid="usage-chart"]')).toBeVisible()
    
    // When: 개별 쿠폰 통계 보기
    const couponCard = page.locator('[data-testid="coupon-card"]').first()
    const statsButton = couponCard.locator('button:has-text("통계")')
    await statsButton.click()
    
    // Then: 쿠폰별 상세 통계 모달이 표시됨
    const statsModal = page.locator('[data-testid="coupon-stats-modal"]')
    await expect(statsModal).toBeVisible()
    await expect(statsModal.locator('text=사용량 분석')).toBeVisible()
    await expect(statsModal.locator('text=총 사용 횟수')).toBeVisible()
    await expect(statsModal.locator('text=총 할인 금액')).toBeVisible()
  })

  test('권한이 없는 사용자는 관리자 페이지에 접근할 수 없음', async ({ page }) => {
    // Given: 일반 사용자로 설정
    await page.addInitScript(() => {
      window.localStorage.setItem('clerk-session', JSON.stringify({
        id: 'user-session',
        user: {
          id: 'user-123',
          emailAddress: 'user@example.com',
          firstName: 'Regular',
          lastName: 'User',
          publicMetadata: {
            role: 'user'
          }
        }
      }))
    })
    
    // When: 관리자 페이지 접근 시도
    await page.goto('/admin/coupons')
    
    // Then: 접근 거부 메시지가 표시됨
    await expect(page.locator('text=접근 권한이 없습니다')).toBeVisible()
    await expect(page.locator('text=관리자 권한이 필요합니다')).toBeVisible()
    
    // Then: 관리자 기능이 표시되지 않음
    await expect(page.locator('button:has-text("새 쿠폰 생성")')).not.toBeVisible()
    await expect(page.locator('[data-testid="coupon-list"]')).not.toBeVisible()
  })

  test('로그인하지 않은 사용자는 관리자 페이지에 접근할 수 없음', async ({ page }) => {
    // Given: 로그인하지 않은 상태
    await page.addInitScript(() => {
      window.localStorage.removeItem('clerk-session')
    })
    
    // When: 관리자 페이지 접근 시도
    await page.goto('/admin/coupons')
    
    // Then: 로그인 페이지로 리디렉트되거나 접근 거부 메시지 표시
    const isLoginPage = await page.locator('text=로그인').isVisible()
    const isAccessDenied = await page.locator('text=로그인이 필요합니다').isVisible()
    
    expect(isLoginPage || isAccessDenied).toBe(true)
  })

  test('관리자가 모바일 환경에서도 쿠폰을 관리할 수 있음', async ({ page }) => {
    // Given: 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/admin/coupons')
    
    // Then: 모바일에서도 대시보드가 올바르게 표시됨
    await expect(page.locator('h1:has-text("쿠폰 관리")')).toBeVisible()
    await expect(page.locator('[data-testid="coupon-stats"]')).toBeVisible()
    
    // When: 모바일에서 햄버거 메뉴나 축소된 UI 사용
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-toggle"]')
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.tap()
    }
    
    // When: 모바일에서 새 쿠폰 생성
    await page.locator('button:has-text("새 쿠폰 생성")').tap()
    await expect(page).toHaveURL('/admin/coupons/create')
    
    // Then: 모바일에서도 폼이 올바르게 표시됨
    const form = page.locator('[data-testid="coupon-creation-form"]')
    await expect(form).toBeVisible()
    
    // 모바일에서 입력 필드들이 적절한 크기로 표시되는지 확인
    const codeInput = form.locator('input[name="code"]')
    await expect(codeInput).toBeVisible()
    const inputBox = await codeInput.boundingBox()
    expect(inputBox?.width).toBeGreaterThan(200) // 최소 너비 확인
  })

  test('관리자가 키보드만으로 쿠폰 관리 기능을 사용할 수 있음', async ({ page }) => {
    await page.goto('/admin/coupons')
    
    // When: Tab으로 새 쿠폰 생성 버튼에 포커스
    await page.keyboard.press('Tab')
    // 다른 요소들을 지나 생성 버튼까지 Tab
    let focused = false
    for (let i = 0; i < 10; i++) {
      const createButton = page.locator('button:has-text("새 쿠폰 생성")')
      if (await createButton.isFocused()) {
        focused = true
        break
      }
      await page.keyboard.press('Tab')
    }
    expect(focused).toBe(true)
    
    // When: Enter로 버튼 클릭
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/admin/coupons/create')
    
    // When: 키보드로 폼 네비게이션
    await page.keyboard.press('Tab')
    const codeInput = page.locator('input[name="code"]')
    await expect(codeInput).toBeFocused()
    
    await page.keyboard.type('KEYBOARD')
    
    // Tab으로 다음 필드로 이동
    await page.keyboard.press('Tab')
    const nameInput = page.locator('input[name="name"]')
    await expect(nameInput).toBeFocused()
    
    await page.keyboard.type('키보드 테스트')
  })

  test('관리자 페이지의 접근성 속성들이 올바르게 설정됨', async ({ page }) => {
    await page.goto('/admin/coupons')
    
    // Then: 적절한 헤딩 구조가 설정됨
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h2')).toBeVisible() // 통계 섹션 등
    
    // Then: 테이블이나 목록에 적절한 ARIA 속성이 설정됨
    const couponList = page.locator('[data-testid="coupon-list"]')
    await expect(couponList).toHaveAttribute('role', 'table')
    
    // Then: 체크박스들이 적절한 레이블을 가짐
    const checkboxes = page.locator('input[type="checkbox"]')
    const checkboxCount = await checkboxes.count()
    
    for (let i = 0; i < checkboxCount; i++) {
      const checkbox = checkboxes.nth(i)
      const hasAriaLabel = await checkbox.getAttribute('aria-label')
      const hasLabel = await checkbox.locator('..').locator('label').count() > 0
      
      expect(hasAriaLabel || hasLabel).toBe(true)
    }
    
    // Then: 버튼들이 적절한 접근성 이름을 가짐
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) { // 처음 5개만 체크
      const button = buttons.nth(i)
      const text = await button.textContent()
      const ariaLabel = await button.getAttribute('aria-label')
      
      expect(text || ariaLabel).toBeTruthy()
    }
  })
})