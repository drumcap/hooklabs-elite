import { test, expect } from '@playwright/test'

test.describe('Credit Management', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 환경 설정
    await page.addInitScript(() => {
      window.localStorage.setItem('test-mode', 'true')
    })

    // 활성 구독이 있는 사용자로 로그인
    await page.goto('/sign-in')
    await page.getByLabel(/email/i).fill('subscriber@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
  })

  test('크레딧 관리 대시보드가 올바르게 표시되어야 함', async ({ page }) => {
    await page.goto('/dashboard/credits')

    // 1. 페이지 제목 확인
    await expect(page.getByRole('heading', { name: /크레딧.*쿠폰 관리/ })).toBeVisible()

    // 2. 크레딧 잔액 카드들 확인
    await expect(page.getByText(/사용 가능 크레딧/)).toBeVisible()
    await expect(page.getByText(/사용된 크레딧/)).toBeVisible()
    await expect(page.getByText(/만료된 크레딧/)).toBeVisible()

    // 3. 크레딧 수치 확인
    await expect(page.getByTestId('available-credits')).toContainText(/\d+/)
    await expect(page.getByTestId('used-credits')).toContainText(/\d+/)
    await expect(page.getByTestId('expired-credits')).toContainText(/\d+/)

    // 4. 쿠폰 적용 섹션 확인
    await expect(page.getByText(/쿠폰 적용/)).toBeVisible()
    await expect(page.getByPlaceholder(/쿠폰 코드를 입력하세요/)).toBeVisible()
  })

  test('유효한 쿠폰을 적용할 수 있어야 함', async ({ page }) => {
    await page.goto('/dashboard/credits')

    // 1. 쿠폰 코드 입력
    const couponInput = page.getByPlaceholder(/쿠폰 코드를 입력하세요/)
    await couponInput.fill('WELCOME20')

    // 2. 쿠폰 검증 결과 확인
    await expect(page.getByText(/20% 할인 쿠폰/)).toBeVisible()
    await expect(page.getByText(/전 상품 20% 할인/)).toBeVisible()
    await expect(page.locator('[data-testid="coupon-valid-icon"]')).toBeVisible()

    // 3. 적용 버튼 클릭
    await page.getByRole('button', { name: /적용/ }).click()

    // 4. 로딩 상태 확인
    await expect(page.getByTestId('loading-spinner')).toBeVisible()

    // 5. 성공 메시지 확인
    await expect(page.getByText(/쿠폰이 성공적으로 적용되었습니다/)).toBeVisible()
    await expect(page.getByText(/20% 할인 쿠폰/)).toBeVisible()

    // 6. 입력 필드가 클리어되었는지 확인
    await expect(couponInput).toHaveValue('')
  })

  test('크레딧 쿠폰을 적용할 수 있어야 함', async ({ page }) => {
    await page.goto('/dashboard/credits')

    // 1. 크레딧 쿠폰 코드 입력
    await page.getByPlaceholder(/쿠폰 코드를 입력하세요/).fill('CREDITS500')

    // 2. 크레딧 쿠폰 검증 결과 확인
    await expect(page.getByText(/500 크레딧/)).toBeVisible()
    await expect(page.getByText(/\(\+500 크레딧\)/)).toBeVisible()

    // 3. 적용 버튼 클릭
    await page.getByRole('button', { name: /적용/ }).click()

    // 4. 성공 메시지 확인
    await expect(page.getByText(/쿠폰이 성공적으로 적용되었습니다.*500 크레딧/)).toBeVisible()

    // 5. 크레딧 잔액 증가 확인
    const updatedCredits = await page.getByTestId('available-credits').textContent()
    expect(parseInt(updatedCredits!.replace(/,/g, ''))).toBeGreaterThan(3500) // 초기 잔액보다 증가
  })

  test('유효하지 않은 쿠폰에 대한 오류 메시지가 표시되어야 함', async ({ page }) => {
    await page.goto('/dashboard/credits')

    // 1. 유효하지 않은 쿠폰 코드 입력
    await page.getByPlaceholder(/쿠폰 코드를 입력하세요/).fill('INVALID')

    // 2. 오류 메시지 확인
    await expect(page.getByText(/유효하지 않은 쿠폰 코드입니다/)).toBeVisible()
    await expect(page.locator('[data-testid="coupon-invalid-icon"]')).toBeVisible()

    // 3. 적용 버튼이 비활성화되어 있는지 확인
    const applyButton = page.getByRole('button', { name: /적용/ })
    await expect(applyButton).toBeDisabled()
  })

  test('만료된 쿠폰에 대한 오류 메시지가 표시되어야 함', async ({ page }) => {
    await page.goto('/dashboard/credits')

    // 1. 만료된 쿠폰 설정
    await page.addInitScript(() => {
      window.localStorage.setItem('mock-expired-coupon', 'true')
    })

    // 2. 만료된 쿠폰 코드 입력
    await page.getByPlaceholder(/쿠폰 코드를 입력하세요/).fill('EXPIRED20')

    // 3. 만료 오류 메시지 확인
    await expect(page.getByText(/만료된 쿠폰입니다/)).toBeVisible()
  })

  test('크레딧 내역이 올바르게 표시되어야 함', async ({ page }) => {
    await page.goto('/dashboard/credits')

    // 1. 크레딧 내역 탭 클릭
    await page.getByRole('tab', { name: /크레딧 내역/ }).click()

    // 2. 내역 목록 확인
    await expect(page.getByText(/최근 크레딧 적립 및 사용 내역/)).toBeVisible()

    // 3. 적립 내역 확인
    await expect(page.getByText(/회원가입 보너스/)).toBeVisible()
    await expect(page.getByText(/\+1,000/)).toBeVisible()
    await expect(page.getByText(/적립/)).toBeVisible()

    // 4. 사용 내역 확인
    await expect(page.getByText(/서비스 이용/)).toBeVisible()
    await expect(page.getByText(/-500/)).toBeVisible()
    await expect(page.getByText(/사용/)).toBeVisible()

    // 5. 날짜 정보 확인
    const firstRecord = page.locator('[data-testid="credit-record"]').first()
    await expect(firstRecord).toContainText(/\d{4}년 \d{1,2}월 \d{1,2}일/)

    // 6. 아이콘 확인
    await expect(page.locator('[data-testid="credit-earned-icon"]')).toBeVisible()
    await expect(page.locator('[data-testid="credit-used-icon"]')).toBeVisible()
  })

  test('쿠폰 사용 내역이 올바르게 표시되어야 함', async ({ page }) => {
    await page.goto('/dashboard/credits')

    // 1. 쿠폰 사용 내역 탭 클릭
    await page.getByRole('tab', { name: /쿠폰 사용 내역/ }).click()

    // 2. 사용 내역 목록 확인
    await expect(page.getByText(/지금까지 사용한 쿠폰 내역/)).toBeVisible()

    // Mock 데이터가 있는 경우
    if (await page.getByText(/신규 회원 할인/).isVisible()) {
      // 3. 쿠폰 정보 확인
      await expect(page.getByText(/신규 회원 할인/)).toBeVisible()
      await expect(page.getByText(/5원 할인/)).toBeVisible()
      await expect(page.getByText(/percentage/)).toBeVisible()

      // 4. 사용 일자 확인
      await expect(page.getByText(/\d{4}년 \d{1,2}월 \d{1,2}일/)).toBeVisible()
    } else {
      // 빈 상태 메시지 확인
      await expect(page.getByText(/아직 사용한 쿠폰이 없습니다/)).toBeVisible()
    }
  })

  test('만료 예정 크레딧이 표시되어야 함', async ({ page }) => {
    // 1. 만료 예정 크레딧이 있는 사용자 설정
    await page.addInitScript(() => {
      window.localStorage.setItem('mock-expiring-credits', 'true')
    })

    await page.goto('/dashboard/credits')

    // 2. 만료 예정 경고 메시지 확인
    await expect(page.getByText(/30일 내 만료 예정 크레딧이 있습니다/)).toBeVisible()
    await expect(page.getByText(/1,000 크레딧이 만료 예정입니다/)).toBeVisible()

    // 3. 만료 예정 탭으로 이동
    await page.getByRole('tab', { name: /만료 예정/ }).click()

    // 4. 만료 예정 크레딧 목록 확인
    await expect(page.getByText(/30일 내에 만료될 크레딧 목록/)).toBeVisible()
    await expect(page.getByText(/이벤트 크레딧/)).toBeVisible()
    await expect(page.getByText(/500 크레딧/)).toBeVisible()
    await expect(page.getByText(/만료 예정/)).toBeVisible()

    // 5. 만료일 확인
    await expect(page.getByText(/만료일:.*\d{4}년 \d{1,2}월 \d{1,2}일/)).toBeVisible()

    // 6. 경고 색상 스타일 확인
    const expiringRecord = page.locator('[data-testid="expiring-credit"]')
    await expect(expiringRecord).toHaveClass(/border-orange-200/)
  })

  test('쿠폰 코드 입력 시 자동 대문자 변환이 작동해야 함', async ({ page }) => {
    await page.goto('/dashboard/credits')

    // 1. 소문자로 쿠폰 코드 입력
    const couponInput = page.getByPlaceholder(/쿠폰 코드를 입력하세요/)
    await couponInput.fill('welcome20')

    // 2. 자동으로 대문자로 변환되는지 확인
    await expect(couponInput).toHaveValue('WELCOME20')
  })

  test('쿠폰 적용 중 오류 발생 시 적절한 메시지가 표시되어야 함', async ({ page }) => {
    // 1. 쿠폰 적용 오류 시나리오 설정
    await page.addInitScript(() => {
      window.localStorage.setItem('mock-coupon-apply-error', 'true')
    })

    await page.goto('/dashboard/credits')

    // 2. 쿠폰 코드 입력
    await page.getByPlaceholder(/쿠폰 코드를 입력하세요/).fill('ERROR_COUPON')

    // 3. 적용 버튼 클릭
    await page.getByRole('button', { name: /적용/ }).click()

    // 4. 오류 메시지 확인
    await expect(page.getByText(/쿠폰 적용 중 오류가 발생했습니다/)).toBeVisible()

    // 5. 입력 필드가 클리어되지 않았는지 확인 (재시도 가능)
    await expect(page.getByPlaceholder(/쿠폰 코드를 입력하세요/)).toHaveValue('ERROR_COUPON')
  })

  test('사용량 기반 크레딧 적립이 작동해야 함', async ({ page }) => {
    await page.goto('/dashboard/credits')

    // 1. 크레딧 내역 탭으로 이동
    await page.getByRole('tab', { name: /크레딧 내역/ }).click()

    // 2. 사용량 기반 적립 내역 확인
    await expect(page.getByText(/API 사용량 적립/)).toBeVisible()
    await expect(page.getByText(/매 1,000회 API 호출 시 10 크레딧 적립/)).toBeVisible()

    // 3. 적립 주기 정보 확인
    await expect(page.getByText(/다음 적립 예정:.*\d+ requests/)).toBeVisible()
  })

  test('크레딧 구매 버튼이 올바르게 작동해야 함', async ({ page }) => {
    await page.goto('/dashboard/credits')

    // 1. 크레딧 구매 버튼 클릭
    await page.getByRole('button', { name: /크레딧 구매/ }).click()

    // 2. 구매 모달 확인
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/크레딧 구매/)).toBeVisible()

    // 3. 구매 옵션들 확인
    await expect(page.getByText(/1,000 크레딧.*\$10/)).toBeVisible()
    await expect(page.getByText(/5,000 크레딧.*\$45/)).toBeVisible()
    await expect(page.getByText(/10,000 크레딧.*\$80/)).toBeVisible()

    // 4. 구매 옵션 선택
    await page.getByRole('radio', { name: /5,000 크레딧/ }).check()
    await page.getByRole('button', { name: /구매하기/ }).click()

    // 5. 결제 페이지로 리다이렉트 확인
    await expect(page).toHaveURL(/.*checkout.*/)
  })

  test('크레딧 선물 기능이 작동해야 함', async ({ page }) => {
    await page.goto('/dashboard/credits')

    // 1. 크레딧 선물하기 버튼 클릭
    await page.getByRole('button', { name: /크레딧 선물하기/ }).click()

    // 2. 선물 모달 확인
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/크레딧 선물하기/)).toBeVisible()

    // 3. 선물 정보 입력
    await page.getByLabel(/받는 사람 이메일/).fill('friend@example.com')
    await page.getByLabel(/선물할 크레딧 수/).fill('500')
    await page.getByLabel(/선물 메시지/).fill('생일 축하해!')

    // 4. 선물하기 버튼 클릭
    await page.getByRole('button', { name: /선물하기/ }).click()

    // 5. 확인 메시지
    await expect(page.getByText(/크레딧 선물이 전송되었습니다/)).toBeVisible()

    // 6. 본인 크레딧 차감 확인
    const updatedCredits = await page.getByTestId('available-credits').textContent()
    expect(parseInt(updatedCredits!.replace(/,/g, ''))).toBe(3000) // 3500 - 500
  })

  test('크레딧 환불 요청이 가능해야 함', async ({ page }) => {
    await page.goto('/dashboard/credits')

    // 1. 크레딧 내역 탭으로 이동
    await page.getByRole('tab', { name: /크레딧 내역/ }).click()

    // 2. 구매 내역에서 환불 버튼 클릭 (구매한 크레딧만 환불 가능)
    await page.locator('[data-testid="credit-record"][data-type="purchased"]').first()
      .getByRole('button', { name: /환불 요청/ }).click()

    // 3. 환불 요청 모달 확인
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/환불 요청/)).toBeVisible()

    // 4. 환불 사유 입력
    await page.getByLabel(/환불 사유/).fill('서비스를 더 이상 이용하지 않음')

    // 5. 환불 요청 제출
    await page.getByRole('button', { name: /요청 제출/ }).click()

    // 6. 성공 메시지
    await expect(page.getByText(/환불 요청이 접수되었습니다/)).toBeVisible()
    await expect(page.getByText(/영업일 기준 3-5일 내 처리/)).toBeVisible()
  })

  test('크레딧 만료 알림 설정이 작동해야 함', async ({ page }) => {
    await page.goto('/dashboard/credits')

    // 1. 설정 버튼 클릭
    await page.getByRole('button', { name: /설정/ }).click()

    // 2. 알림 설정 모달 확인
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/크레딧 알림 설정/)).toBeVisible()

    // 3. 만료 알림 설정
    await page.getByLabel(/30일 전 만료 알림/).check()
    await page.getByLabel(/7일 전 만료 알림/).check()
    await page.getByLabel(/1일 전 만료 알림/).check()

    // 4. 잔액 부족 알림 설정
    await page.getByLabel(/잔액 부족 알림/).check()
    await page.getByLabel(/알림 기준 잔액/).fill('100')

    // 5. 설정 저장
    await page.getByRole('button', { name: /저장/ }).click()

    // 6. 성공 메시지 확인
    await expect(page.getByText(/알림 설정이 저장되었습니다/)).toBeVisible()
  })
})