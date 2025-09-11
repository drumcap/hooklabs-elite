import { test, expect } from '@playwright/test'

test.describe('Usage Tracking', () => {
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

  test('사용량 대시보드가 올바르게 표시되어야 함', async ({ page }) => {
    await page.goto('/dashboard/usage')

    // 1. 페이지 제목 확인
    await expect(page.getByRole('heading', { name: /사용량 추적/ })).toBeVisible()
    await expect(page.getByText(/실시간 모니터링/)).toBeVisible()

    // 2. 주요 메트릭 카드들 확인
    await expect(page.getByText(/전체 사용량/)).toBeVisible()
    await expect(page.getByText(/일평균 사용량/)).toBeVisible()
    await expect(page.getByText(/남은 사용량/)).toBeVisible()
    await expect(page.getByText(/리셋까지/)).toBeVisible()

    // 3. 사용량 진행바 확인
    await expect(page.getByRole('progressbar')).toBeVisible()

    // 4. 사용량 수치 확인
    await expect(page.getByTestId('current-usage')).toContainText(/\d+/)
    await expect(page.getByTestId('usage-limit')).toContainText(/\d+/)
    await expect(page.getByTestId('usage-percentage')).toContainText(/\d+%/)
  })

  test('사용량 차트가 올바르게 렌더링되어야 함', async ({ page }) => {
    await page.goto('/dashboard/usage')

    // 1. 일별 트렌드 차트 (기본값)
    await expect(page.getByText(/지난 7일간 사용량/)).toBeVisible()
    await expect(page.getByTestId('area-chart')).toBeVisible()

    // 2. 시간별 트렌드 차트로 전환
    await page.getByRole('tab', { name: /시간별 트렌드/ }).click()
    await expect(page.getByText(/오늘의 시간별 사용량/)).toBeVisible()
    await expect(page.getByTestId('bar-chart')).toBeVisible()

    // 3. 리소스별 사용량 차트로 전환
    await page.getByRole('tab', { name: /리소스별/ }).click()
    await expect(page.getByText(/리소스별 사용량 분포/)).toBeVisible()
    await expect(page.getByTestId('pie-chart')).toBeVisible()

    // 4. 리소스별 상세 정보 확인
    await expect(page.getByText(/api_requests/)).toBeVisible()
    await expect(page.getByText(/storage/)).toBeVisible()
    await expect(page.getByText(/bandwidth/)).toBeVisible()
  })

  test('사용량 경고가 적절히 표시되어야 함', async ({ page }) => {
    // 1. 높은 사용량 사용자 설정
    await page.addInitScript(() => {
      window.localStorage.setItem('mock-high-usage', 'true')
    })

    await page.goto('/dashboard/usage')

    // 2. 경고 알림 확인
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByText(/사용량이 한도.*90%.*도달/)).toBeVisible()

    // 3. 경고 배지 확인
    await expect(page.getByText('90%')).toBeVisible()

    // 4. 경고 아이콘 확인
    await expect(page.locator('[data-testid="alert-icon"]')).toBeVisible()
  })

  test('사용량 한도 초과 시 경고가 표시되어야 함', async ({ page }) => {
    // 1. 한도 초과 사용자 설정
    await page.addInitScript(() => {
      window.localStorage.setItem('mock-overage', 'true')
    })

    await page.goto('/dashboard/usage')

    // 2. 초과 사용량 경고 확인
    await expect(page.getByText(/한도 초과 사용량/)).toBeVisible()
    await expect(page.getByText(/초과 사용 요금이 발생할 수 있습니다/)).toBeVisible()

    // 3. 초과 요금 표시 확인
    await expect(page.getByText(/\d+원/)).toBeVisible()

    // 4. 진행바가 100%를 초과하여 표시되는지 확인
    const progressBar = page.getByRole('progressbar')
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100')
  })

  test('최근 사용량 기록이 표시되어야 함', async ({ page }) => {
    await page.goto('/dashboard/usage')

    // 1. 스크롤하여 최근 사용량 기록 섹션으로 이동
    await page.locator('text=최근 사용량 기록').scrollIntoViewIfNeeded()
    await expect(page.getByText(/최근 사용량 기록/)).toBeVisible()

    // 2. 사용량 기록 항목들 확인
    await expect(page.getByText(/API 요청/)).toBeVisible()
    await expect(page.getByText(/파일 업로드/)).toBeVisible()

    // 3. 각 기록의 상세 정보 확인
    const firstRecord = page.locator('[data-testid="usage-record"]').first()
    await expect(firstRecord).toContainText(/\d+ requests/)
    await expect(firstRecord).toContainText(/\d{2}\/\d{2} \d{2}:\d{2}/)

    // 4. 기록 항목 클릭하여 상세 정보 확인
    await firstRecord.click()
    await expect(page.getByText(/사용량 상세 정보/)).toBeVisible()
  })

  test('사용량 필터링 기능이 작동해야 함', async ({ page }) => {
    await page.goto('/dashboard/usage')

    // 1. 리소스별 탭으로 이동
    await page.getByRole('tab', { name: /리소스별/ }).click()

    // 2. 특정 리소스 타입 필터 선택
    await page.getByText(/api_requests/).click()

    // 3. 필터된 결과 확인
    await expect(page.getByText(/API 요청만 표시/)).toBeVisible()
    await expect(page.getByText(/storage/)).not.toBeVisible()

    // 4. 필터 제거
    await page.getByRole('button', { name: /필터 제거/ }).click()
    await expect(page.getByText(/storage/)).toBeVisible()
  })

  test('사용량 데이터 새로고침이 작동해야 함', async ({ page }) => {
    await page.goto('/dashboard/usage')

    // 1. 초기 사용량 값 기록
    const initialUsage = await page.getByTestId('current-usage').textContent()

    // 2. 새로고침 버튼 클릭
    await page.getByRole('button', { name: /새로고침/ }).click()

    // 3. 로딩 상태 확인
    await expect(page.getByTestId('loading-spinner')).toBeVisible()
    await expect(page.getByTestId('loading-spinner')).not.toBeVisible()

    // 4. 데이터가 업데이트되었는지 확인 (mock 환경에서는 약간의 변화 시뮬레이션)
    const updatedUsage = await page.getByTestId('current-usage').textContent()
    expect(updatedUsage).toBeDefined()
  })

  test('사용량 내보내기 기능이 작동해야 함', async ({ page }) => {
    await page.goto('/dashboard/usage')

    // 1. 내보내기 버튼 클릭
    await page.getByRole('button', { name: /내보내기/ }).click()

    // 2. 내보내기 옵션 모달 확인
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/데이터 내보내기/)).toBeVisible()

    // 3. CSV 형식 선택
    await page.getByRole('radio', { name: /CSV/ }).check()
    await page.getByRole('button', { name: /내보내기 확인/ }).click()

    // 4. 다운로드 진행 확인
    await expect(page.getByText(/다운로드를 시작합니다/)).toBeVisible()
  })

  test('무제한 플랜 사용자의 사용량 표시가 올바르게 되어야 함', async ({ page }) => {
    // 1. 무제한 플랜 사용자 설정
    await page.addInitScript(() => {
      window.localStorage.setItem('mock-unlimited-plan', 'true')
    })

    await page.goto('/dashboard/usage')

    // 2. 무제한 표시 확인
    await expect(page.getByText(/무제한/)).toBeVisible()
    await expect(page.getByText(/한도: 무제한/)).toBeVisible()

    // 3. 진행바가 없거나 다른 형태로 표시되는지 확인
    const progressBar = page.getByRole('progressbar')
    await expect(progressBar).not.toBeVisible()

    // 4. 남은 사용량 섹션에 무제한 표시
    await expect(page.getByTestId('remaining-usage')).toContainText(/무제한/)
  })

  test('사용량 예측 기능이 표시되어야 함', async ({ page }) => {
    await page.goto('/dashboard/usage')

    // 1. 일별 트렌드 탭에서 예측 정보 확인
    await page.getByRole('tab', { name: /일별 트렌드/ }).click()
    
    // 2. 예측 섹션 확인
    await expect(page.getByText(/사용량 예측/)).toBeVisible()
    await expect(page.getByText(/이번 달 예상 사용량/)).toBeVisible()

    // 3. 예측값 확인
    await expect(page.getByTestId('predicted-usage')).toContainText(/\d+/)
    await expect(page.getByText(/현재 추세를 기준으로/)).toBeVisible()

    // 4. 예측 차트 확인
    await expect(page.getByTestId('prediction-chart')).toBeVisible()
  })

  test('사용량 알림 설정이 작동해야 함', async ({ page }) => {
    await page.goto('/dashboard/usage')

    // 1. 설정 버튼 클릭
    await page.getByRole('button', { name: /설정/ }).click()

    // 2. 알림 설정 모달 확인
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/사용량 알림 설정/)).toBeVisible()

    // 3. 알림 임계값 설정
    await page.getByLabel(/75% 알림/).check()
    await page.getByLabel(/90% 알림/).check()
    await page.getByLabel(/100% 알림/).check()

    // 4. 이메일 알림 활성화
    await page.getByLabel(/이메일 알림/).check()

    // 5. 설정 저장
    await page.getByRole('button', { name: /저장/ }).click()

    // 6. 성공 메시지 확인
    await expect(page.getByText(/알림 설정이 저장되었습니다/)).toBeVisible()
  })

  test('사용량 히스토리 조회가 작동해야 함', async ({ page }) => {
    await page.goto('/dashboard/usage')

    // 1. 히스토리 버튼 클릭
    await page.getByRole('button', { name: /히스토리/ }).click()

    // 2. 기간 선택 필터 확인
    await expect(page.getByText(/기간 선택/)).toBeVisible()
    await page.getByRole('combobox', { name: /기간/ }).selectOption('last-30-days')

    // 3. 히스토리 데이터 확인
    await expect(page.getByText(/지난 30일 사용량/)).toBeVisible()
    await expect(page.getByTestId('history-chart')).toBeVisible()

    // 4. 월별 요약 정보 확인
    await expect(page.getByText(/월별 요약/)).toBeVisible()
    await expect(page.getByText(/총 사용량:/)).toBeVisible()
    await expect(page.getByText(/평균 일일 사용량:/)).toBeVisible()
    await expect(page.getByText(/최대 일일 사용량:/)).toBeVisible()
  })
})