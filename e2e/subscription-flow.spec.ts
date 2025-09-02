import { test, expect } from '@playwright/test'

test.describe('Subscription Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 환경에서는 mock 데이터를 사용하도록 설정
    await page.addInitScript(() => {
      window.localStorage.setItem('test-mode', 'true')
    })
  })

  test('사용자가 회원가입부터 구독까지 전체 플로우를 완주할 수 있어야 함', async ({ page }) => {
    // 1. 홈페이지 방문
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()

    // 2. 가격 페이지로 이동
    await page.getByRole('link', { name: /pricing/i }).click()
    await expect(page.getByRole('heading', { name: /choose your plan/i })).toBeVisible()

    // 3. Pro 플랜 선택
    await page.getByRole('button', { name: /pro.*시작하기/i }).click()

    // 4. 로그인 페이지로 리다이렉트 확인 (비로그인 사용자)
    await expect(page).toHaveURL(/.*sign-in.*/)

    // 5. 회원가입으로 전환
    await page.getByRole('link', { name: /sign up/i }).click()
    await expect(page).toHaveURL(/.*sign-up.*/)

    // 6. 회원가입 양식 작성
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('TestPassword123!')
    await page.getByRole('button', { name: /sign up/i }).click()

    // 7. 이메일 확인 프로세스 (mock 환경에서는 자동으로 확인됨)
    await expect(page).toHaveURL(/.*dashboard.*/)

    // 8. 대시보드에서 구독 상태 확인 (아직 구독 없음)
    await expect(page.getByText(/현재 활성 구독이 없습니다/)).toBeVisible()

    // 9. 플랜 보기 버튼 클릭
    await page.getByRole('link', { name: /플랜 보기/ }).click()
    await expect(page).toHaveURL(/.*pricing.*/)

    // 10. Pro 플랜 선택 (이제 로그인 상태)
    await page.getByRole('button', { name: /pro.*시작하기/i }).click()

    // 11. Lemon Squeezy 결제 페이지로 리다이렉트 (mock)
    await page.waitForURL('**/checkout/**', { timeout: 5000 })
    await expect(page.getByText(/checkout/i)).toBeVisible()

    // 12. 결제 정보 입력 (mock 환경)
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/name/i).fill('Test User')
    await page.getByLabel(/card.*number/i).fill('4242424242424242')
    await page.getByLabel(/expiry/i).fill('12/25')
    await page.getByLabel(/cvc/i).fill('123')

    // 13. 결제 완료
    await page.getByRole('button', { name: /complete payment/i }).click()
    await expect(page.getByText(/payment successful/i)).toBeVisible()

    // 14. 대시보드로 돌아가기
    await page.getByRole('link', { name: /back to dashboard/i }).click()
    await expect(page).toHaveURL(/.*dashboard.*/)

    // 15. 활성 구독 확인
    await expect(page.getByText(/Pro Plan/)).toBeVisible()
    await expect(page.getByText(/활성/)).toBeVisible()
    await expect(page.getByText(/\$29\.00.*month/)).toBeVisible()

    // 16. 사용량 정보 확인
    await expect(page.getByText(/이번 달 사용량/)).toBeVisible()
    await expect(page.getByText(/0.*10,000/)).toBeVisible() // 0 / 10,000 usage

    // 17. 크레딧 잔액 확인
    await expect(page.getByText(/크레딧 잔액/)).toBeVisible()
  })

  test('기존 사용자가 플랜을 업그레이드할 수 있어야 함', async ({ page }) => {
    // 1. 기존 Basic 플랜 사용자로 로그인
    await page.goto('/sign-in')
    await page.getByLabel(/email/i).fill('existing@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL(/.*dashboard.*/)

    // 2. 현재 Basic 플랜 확인
    await expect(page.getByText(/Basic Plan/)).toBeVisible()

    // 3. 플랜 변경하기 클릭
    await page.getByRole('button', { name: /플랜 변경하기/ }).click()
    await expect(page).toHaveURL(/.*pricing.*/)

    // 4. Pro 플랜 선택
    await page.getByRole('button', { name: /pro.*업그레이드/i }).click()

    // 5. 업그레이드 확인 대화상자
    await expect(page.getByText(/플랜을 업그레이드하시겠습니까/)).toBeVisible()
    await page.getByRole('button', { name: /확인/ }).click()

    // 6. 결제 페이지로 이동 (프로레이션 적용)
    await page.waitForURL('**/checkout/**')
    await expect(page.getByText(/proration/i)).toBeVisible()

    // 7. 결제 완료
    await page.getByRole('button', { name: /complete payment/i }).click()

    // 8. 업그레이드 완료 확인
    await page.goto('/dashboard')
    await expect(page.getByText(/Pro Plan/)).toBeVisible()
    await expect(page.getByText(/업그레이드가 완료되었습니다/)).toBeVisible()
  })

  test('사용자가 구독을 취소할 수 있어야 함', async ({ page }) => {
    // 1. 활성 구독이 있는 사용자로 로그인
    await page.goto('/sign-in')
    await page.getByLabel(/email/i).fill('subscriber@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // 2. 대시보드에서 구독 관리 클릭
    await page.getByRole('button', { name: /구독 관리/ }).click()

    // 3. 외부 포털 페이지로 이동 확인
    await page.waitForURL('**/billing.lemonsqueezy.com/**')
    await expect(page.getByText(/billing portal/i)).toBeVisible()

    // 4. 구독 취소 버튼 클릭
    await page.getByRole('button', { name: /cancel subscription/i }).click()

    // 5. 취소 확인 대화상자
    await expect(page.getByText(/are you sure.*cancel/i)).toBeVisible()
    await page.getByRole('button', { name: /yes.*cancel/i }).click()

    // 6. 취소 완료 메시지
    await expect(page.getByText(/subscription cancelled/i)).toBeVisible()

    // 7. 대시보드로 돌아가서 상태 확인
    await page.goto('/dashboard')
    await expect(page.getByText(/취소됨/)).toBeVisible()
    await expect(page.getByText(/구독이.*만료될 예정입니다/)).toBeVisible()
  })

  test('사용량이 한도에 근접했을 때 경고가 표시되어야 함', async ({ page }) => {
    // 1. 사용량이 높은 사용자로 로그인
    await page.goto('/sign-in')
    await page.addInitScript(() => {
      window.localStorage.setItem('mock-high-usage', 'true')
    })
    
    await page.getByLabel(/email/i).fill('highusage@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // 2. 대시보드에서 경고 메시지 확인
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByText(/사용량이 한도.*90%.*도달/)).toBeVisible()

    // 3. 사용량 탭으로 이동
    await page.getByRole('tab', { name: /사용량/ }).click()
    
    // 4. 사용량 상세 정보 확인
    await expect(page.getByText(/9,000.*10,000/)).toBeVisible() // 90% usage
    await expect(page.getByText(/90%/)).toBeVisible()

    // 5. 남은 사용량 확인
    await expect(page.getByText(/1,000/)).toContainText(/남은 한도/)
  })

  test('사용자가 쿠폰을 적용할 수 있어야 함', async ({ page }) => {
    // 1. 로그인된 사용자
    await page.goto('/sign-in')
    await page.getByLabel(/email/i).fill('couponuser@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // 2. 크레딧 & 쿠폰 관리 페이지로 이동
    await page.goto('/dashboard/credits')
    await expect(page.getByText(/크레딧.*쿠폰 관리/)).toBeVisible()

    // 3. 쿠폰 코드 입력
    await page.getByPlaceholder(/쿠폰 코드를 입력하세요/).fill('WELCOME20')

    // 4. 쿠폰 검증 결과 확인
    await expect(page.getByText(/20% 할인 쿠폰/)).toBeVisible()
    await expect(page.getByText(/전 상품 20% 할인/)).toBeVisible()

    // 5. 쿠폰 적용
    await page.getByRole('button', { name: /적용/ }).click()

    // 6. 성공 메시지 확인
    await expect(page.getByText(/쿠폰이 성공적으로 적용되었습니다/)).toBeVisible()

    // 7. 쿠폰 사용 내역 탭에서 확인
    await page.getByRole('tab', { name: /쿠폰 사용 내역/ }).click()
    await expect(page.getByText(/20% 할인 쿠폰/)).toBeVisible()
  })

  test('관리자가 대시보드에서 통계를 확인할 수 있어야 함', async ({ page }) => {
    // 1. 관리자로 로그인
    await page.goto('/sign-in')
    await page.getByLabel(/email/i).fill('admin@example.com')
    await page.getByLabel(/password/i).fill('adminpassword123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // 2. 관리자 대시보드로 이동
    await page.goto('/dashboard/admin')
    await expect(page.getByRole('heading', { name: /관리자 대시보드/ })).toBeVisible()

    // 3. 주요 메트릭 확인
    await expect(page.getByText(/총 구독자/)).toBeVisible()
    await expect(page.getByText(/월간 수익/)).toBeVisible()
    await expect(page.getByText(/총 사용량/)).toBeVisible()
    await expect(page.getByText(/취소율/)).toBeVisible()

    // 4. 수익 분석 탭 확인
    await page.getByRole('tab', { name: /수익 분석/ }).click()
    await expect(page.getByText(/수익 트렌드/)).toBeVisible()
    await expect(page.getByTestId('responsive-container')).toBeVisible()

    // 5. 구독 분석 탭 확인  
    await page.getByRole('tab', { name: /구독 분석/ }).click()
    await expect(page.getByText(/구독 상태별 분포/)).toBeVisible()

    // 6. 쿠폰 관리 탭 확인
    await page.getByRole('tab', { name: /쿠폰 관리/ }).click()
    await expect(page.getByRole('button', { name: /새 쿠폰 생성/ })).toBeVisible()
  })

  test('사용량 추적이 실시간으로 업데이트되어야 함', async ({ page }) => {
    // 1. 활성 구독이 있는 사용자로 로그인
    await page.goto('/sign-in')
    await page.getByLabel(/email/i).fill('activeuser@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // 2. 사용량 추적 페이지로 이동
    await page.goto('/dashboard/usage')
    await expect(page.getByText(/사용량 추적/)).toBeVisible()

    // 3. 초기 사용량 확인
    const initialUsage = await page.getByTestId('current-usage').textContent()
    expect(initialUsage).toContain('2,500') // Mock initial usage

    // 4. API 호출을 시뮬레이션하여 사용량 증가
    await page.evaluate(() => {
      // Mock API call that increases usage
      window.dispatchEvent(new CustomEvent('usage-updated', {
        detail: { newUsage: 2600 }
      }))
    })

    // 5. 업데이트된 사용량 확인
    await expect(page.getByTestId('current-usage')).toContainText('2,600')

    // 6. 퍼센테이지 업데이트 확인
    await expect(page.getByTestId('usage-percentage')).toContainText('26%')

    // 7. 차트 데이터 업데이트 확인
    await page.getByRole('tab', { name: /일별 트렌드/ }).click()
    await expect(page.getByTestId('area-chart')).toBeVisible()

    // 8. 최근 사용량 기록에 새 항목 추가 확인
    await expect(page.getByText(/API 요청.*방금 전/)).toBeVisible()
  })

  test('결제 실패 시 적절한 오류 메시지가 표시되어야 함', async ({ page }) => {
    // 1. 결제 실패 시나리오 설정
    await page.addInitScript(() => {
      window.localStorage.setItem('mock-payment-failure', 'true')
    })

    // 2. 사용자 로그인
    await page.goto('/sign-in')
    await page.getByLabel(/email/i).fill('paymentfail@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // 3. 플랜 선택
    await page.goto('/pricing')
    await page.getByRole('button', { name: /pro.*시작하기/i }).click()

    // 4. 결제 페이지에서 정보 입력
    await page.waitForURL('**/checkout/**')
    await page.getByLabel(/card.*number/i).fill('4000000000000002') // Decline card

    // 5. 결제 시도
    await page.getByRole('button', { name: /complete payment/i }).click()

    // 6. 오류 메시지 확인
    await expect(page.getByText(/payment failed/i)).toBeVisible()
    await expect(page.getByText(/your card was declined/i)).toBeVisible()

    // 7. 재시도 버튼 확인
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible()

    // 8. 대시보드로 돌아가서 구독 상태 확인 (여전히 구독 없음)
    await page.goto('/dashboard')
    await expect(page.getByText(/현재 활성 구독이 없습니다/)).toBeVisible()
  })

  test('체험 기간 만료 알림이 적절히 표시되어야 함', async ({ page }) => {
    // 1. 체험 기간이 곧 만료되는 사용자 설정
    await page.addInitScript(() => {
      window.localStorage.setItem('mock-trial-expiring', 'true')
    })

    // 2. 사용자 로그인
    await page.goto('/sign-in')
    await page.getByLabel(/email/i).fill('trialuser@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // 3. 체험 상태 확인
    await expect(page.getByText(/체험 중/)).toBeVisible()
    
    // 4. 만료 경고 메시지 확인
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByText(/체험 기간이.*3일 후.*만료됩니다/)).toBeVisible()

    // 5. 업그레이드 유도 버튼 확인
    await expect(page.getByRole('button', { name: /지금 업그레이드/i })).toBeVisible()

    // 6. 업그레이드 버튼 클릭
    await page.getByRole('button', { name: /지금 업그레이드/i }).click()
    await expect(page).toHaveURL(/.*pricing.*/)
  })
})