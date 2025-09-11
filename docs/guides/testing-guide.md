# 테스트 가이드

이 문서는 Hooklabs Elite 프로젝트의 종합적인 테스트 전략과 실행 방법을 설명합니다.

## 📋 테스트 개요

우리의 테스트 전략은 테스트 피라미드를 따라 다음과 같이 구성되어 있습니다:

- **Unit Tests (단위 테스트)**: Convex 함수와 유틸리티 함수
- **Integration Tests (통합 테스트)**: API 엔드포인트와 웹훅 처리
- **Component Tests (컴포넌트 테스트)**: React 컴포넌트
- **E2E Tests (종단간 테스트)**: 전체 사용자 플로우

## 🛠️ 테스트 도구

### 주요 도구
- **Vitest**: 빠른 단위/통합 테스트 프레임워크
- **React Testing Library**: React 컴포넌트 테스트
- **Playwright**: E2E 테스트 자동화
- **MSW**: API 모킹
- **Happy-DOM**: 브라우저 환경 시뮬레이션

### 코드 커버리지
- **@vitest/coverage-v8**: V8 기반 코드 커버리지
- **Codecov**: 커버리지 리포팅 및 분석
- **목표**: 80% 이상의 코드 커버리지

## 🚀 테스트 실행

### 기본 테스트 명령어

```bash
# 모든 테스트 실행
npm test

# 단위 테스트만 실행
npm run test:unit

# 통합 테스트만 실행
npm run test:integration

# 컴포넌트 테스트만 실행
npm run test:components

# E2E 테스트 실행
npm run test:e2e

# 코드 커버리지 포함 테스트
npm run test:coverage

# 와치 모드로 테스트 실행
npm run test:watch

# 테스트 UI로 실행
npm run test:ui
```

### E2E 테스트 옵션

```bash
# 브라우저 UI와 함께 실행
npm run test:e2e:headed

# 디버그 모드로 실행
npm run test:e2e:debug

# 특정 테스트 파일만 실행
npx playwright test subscription-flow

# 특정 브라우저에서만 실행
npx playwright test --project=chromium
```

## 📁 테스트 파일 구조

```
__tests__/
├── unit/                   # 단위 테스트
│   └── convex/
│       ├── usage.test.ts
│       ├── credits.test.ts
│       ├── coupons.test.ts
│       └── subscriptions.test.ts
├── integration/            # 통합 테스트
│   ├── api/
│   │   ├── lemonsqueezy-checkout.test.ts
│   │   └── lemonsqueezy-portal.test.ts
│   └── webhooks/
│       └── lemonsqueezy-webhooks.test.ts
└── components/            # 컴포넌트 테스트
    ├── subscription-dashboard.test.tsx
    ├── usage-tracker.test.tsx
    └── credit-manager.test.tsx

e2e/                       # E2E 테스트
├── subscription-flow.spec.ts
├── usage-tracking.spec.ts
└── credit-management.spec.ts

test-utils/                # 테스트 유틸리티
├── index.ts              # 커스텀 렌더 함수
└── setup.ts              # 테스트 셋업

fixtures/                  # 테스트 데이터
└── test-data.ts          # Mock 데이터

__mocks__/                # Mock 파일
└── convex.ts             # Convex mock
```

## 🧪 테스트 작성 가이드

### 단위 테스트

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext } from '../../../__mocks__/convex'
import { mockUser, mockSubscription } from '../../../fixtures/test-data'

describe('getUserUsage', () => {
  let mockCtx: ReturnType<typeof createMockContext>

  beforeEach(() => {
    mockCtx = createMockContext()
    vi.clearAllMocks()
  })

  it('should return usage data when user has active subscription', async () => {
    // Given
    mockCtx.db.query.mockImplementation(/* ... */)

    // When
    const result = await getUserUsageHandler(mockCtx, { userId: mockUser.id })

    // Then
    expect(result).toBeDefined()
    expect(result?.totalUsage).toBeGreaterThan(0)
  })
})
```

### 컴포넌트 테스트

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../../test-utils'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import SubscriptionDashboard from '../../components/subscription-dashboard'

vi.mock('@clerk/nextjs')
vi.mock('convex/react')

describe('SubscriptionDashboard', () => {
  it('should render subscription information', () => {
    // Given
    vi.mocked(useUser).mockReturnValue({ user: mockUser })
    vi.mocked(useQuery).mockReturnValue(mockSubscription)

    // When
    render(<SubscriptionDashboard />)

    // Then
    expect(screen.getByText('Pro Plan')).toBeVisible()
    expect(screen.getByText('활성')).toBeVisible()
  })
})
```

### E2E 테스트

```typescript
import { test, expect } from '@playwright/test'

test.describe('Subscription Flow', () => {
  test('사용자가 플랜을 구독할 수 있어야 함', async ({ page }) => {
    // Given
    await page.goto('/')
    
    // When
    await page.getByRole('link', { name: /pricing/ }).click()
    await page.getByRole('button', { name: /pro.*시작하기/ }).click()
    
    // Then
    await expect(page).toHaveURL(/.*sign-in.*/)
  })
})
```

## 🎯 테스트 전략

### 테스트 커버리지 목표

| 컴포넌트 유형 | 최소 커버리지 | 목표 커버리지 |
|---------------|---------------|---------------|
| Convex 함수   | 90%           | 95%           |
| React 컴포넌트 | 80%          | 90%           |
| API 엔드포인트 | 85%          | 95%           |
| 유틸리티 함수  | 95%          | 98%           |

### 테스트 우선순위

1. **Critical Path**: 결제, 구독 관리, 사용량 추적
2. **Business Logic**: 크레딧 시스템, 쿠폰 검증
3. **UI Components**: 대시보드, 차트, 폼
4. **Edge Cases**: 오류 처리, 경계 값

### 모킹 전략

#### API 모킹
```typescript
// MSW를 사용한 API 모킹
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.post('/api/lemonsqueezy/checkout', (req, res, ctx) => {
    return res(ctx.json({ checkoutUrl: 'https://mock-checkout.com' }))
  })
)
```

#### Convex 모킹
```typescript
// Convex 함수 모킹
const mockCtx = {
  db: {
    query: vi.fn().mockImplementation((table) => ({
      withIndex: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(mockData),
    })),
    insert: vi.fn().mockResolvedValue('mock_id'),
    patch: vi.fn().mockResolvedValue(undefined),
  },
}
```

## 🔧 CI/CD 통합

### GitHub Actions 워크플로우

우리의 CI/CD 파이프라인은 다음 단계로 구성됩니다:

1. **Lint & Type Check**: 코드 품질 검사
2. **Unit Tests**: 빠른 단위 테스트 실행
3. **Integration Tests**: API 및 웹훅 테스트
4. **Component Tests**: React 컴포넌트 테스트
5. **E2E Tests**: 전체 플로우 테스트
6. **Security Scan**: 보안 취약점 검사
7. **Performance Test**: Lighthouse를 통한 성능 측정
8. **Coverage Report**: 커버리지 리포트 생성

### 브랜치 보호 규칙

- `main` 브랜치에 직접 푸시 금지
- PR 머지 전 모든 테스트 통과 필수
- 최소 1명의 코드 리뷰 필요
- 커버리지 80% 이상 유지

## 🐛 디버깅

### 테스트 디버깅

```bash
# Vitest 디버그 모드
npm run test:watch -- --reporter=verbose

# E2E 테스트 디버그
npm run test:e2e:debug

# 특정 테스트만 디버그
npx vitest run --reporter=verbose usage.test.ts
```

### 일반적인 문제 해결

#### 1. 비동기 테스트 타임아웃
```typescript
// waitFor 사용
await waitFor(() => {
  expect(screen.getByText('로딩 완료')).toBeVisible()
}, { timeout: 5000 })
```

#### 2. Mock 초기화 문제
```typescript
beforeEach(() => {
  vi.clearAllMocks()
  vi.resetAllMocks()
})
```

#### 3. 환경 변수 설정
```typescript
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_mock')
})
```

## 📊 테스트 메트릭

### 주요 지표

- **테스트 실행 시간**: < 10분 (전체 스위트)
- **E2E 테스트 안정성**: > 95%
- **평균 버그 발견 시간**: < 1일
- **코드 커버리지**: > 80%

### 성능 벤치마크

| 테스트 타입 | 목표 시간 | 현재 시간 |
|-------------|-----------|-----------|
| Unit Tests  | < 30초    | ~25초     |
| Integration | < 2분     | ~1.5분    |
| Components  | < 1분     | ~45초     |
| E2E Tests   | < 5분     | ~4분      |

## 🔄 지속적 개선

### 정기적 검토 항목

- [ ] 테스트 커버리지 분석
- [ ] 플레이키 테스트 식별 및 수정
- [ ] 테스트 실행 시간 최적화
- [ ] 새로운 테스트 도구 평가
- [ ] 테스트 데이터 관리 개선

### 베스트 프랙티스

1. **의미 있는 테스트 이름** 작성
2. **AAA 패턴** 사용 (Arrange-Act-Assert)
3. **독립적인 테스트** 작성
4. **Edge case** 포함
5. **빠른 피드백** 제공
6. **유지보수 가능한** 테스트 코드

## 📚 참고 자료

- [Vitest 공식 문서](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright 가이드](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**문의사항이나 개선 제안이 있으시면 팀에 공유해 주세요!**