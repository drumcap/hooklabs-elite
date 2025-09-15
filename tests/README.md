# 소셜 미디어 고급 기능 테스트 스위트

이 문서는 소셜 미디어 고급 기능의 포괄적인 테스트 스위트에 대한 설명입니다.

## 📋 테스트 개요

### 커버리지 범위

#### 백엔드 API 엔드포인트
- **토큰 관리**: `api.socialAccounts.getExpiringTokens`, `updateTokens`, `getAccountStats`, `toggleActive`
- **게시물 변형 A/B 테스트**: `api.postVariants.getByPost`, `getBestVariant`, `selectVariant`, `getAverageScores`
- **AI 분석**: `api.aiGenerations.getUserStats`, `getMonthlyTrends`, `getPersonaPerformance`, `getRecentFailures`
- **고급 스케줄링**: `api.scheduledPosts.getCalendarSchedules`, `getPendingRetries`, `getUserStats`

#### 프론트엔드 컴포넌트
- **TokenExpiryAlert.tsx** - 토큰 만료 알림 및 새로고침
- **AccountStats.tsx** - 계정 성능 통계
- **VariantComparison.tsx** - A/B 테스트 결과 시각화
- **VariantSelector.tsx** - 변형 선택 인터페이스
- **GenerationHistory.tsx** - AI 생성 히스토리 및 필터링
- **AIUsageStats.tsx** - AI 사용량 통계 및 트렌드
- **AnalyticsDashboard.tsx** - 종합 분석 대시보드
- **RealtimeMonitor.tsx** - 실시간 모니터링 인터페이스

## 🧪 테스트 유형

### 1. 단위 테스트 (Unit Tests)
**위치**: `tests/unit/`

- **Convex 함수**: 개별 백엔드 함수의 로직 및 데이터 변환
- **유틸리티**: 헬퍼 함수 및 데이터 처리 로직
- **비즈니스 로직**: 점수 계산, 시간 변환 등

```bash
# 단위 테스트 실행
bun run test:unit

# 특정 모듈만 테스트
bun run test tests/unit/convex/socialAccounts.test.ts
```

### 2. 컴포넌트 테스트 (Component Tests)
**위치**: `tests/components/`

- **렌더링**: 다양한 상태에서의 올바른 렌더링
- **상호작용**: 사용자 이벤트 및 상태 변화
- **데이터 처리**: props 변화에 따른 반응
- **에러 핸들링**: 오류 상황에서의 우아한 처리

```bash
# 컴포넌트 테스트 실행
bun run test:components

# 특정 컴포넌트 테스트
bun run test tests/components/social-media/TokenExpiryAlert.test.tsx
```

### 3. 통합 테스트 (Integration Tests)
**위치**: `tests/integration/`

- **API 플로우**: 백엔드-프론트엔드 데이터 흐름
- **상태 동기화**: 실시간 데이터 업데이트
- **사용자 시나리오**: 완전한 기능 워크플로우
- **데이터 일관성**: 여러 엔티티 간의 데이터 무결성

```bash
# 통합 테스트 실행
bun run test:integration

# 소셜 미디어 통합 테스트
bun run test tests/integration/social-media-api.test.ts
```

### 4. E2E 테스트 (End-to-End Tests)
**위치**: `tests/e2e/`

- **사용자 여정**: 실제 사용자 관점에서의 완전한 워크플로우
- **크로스 브라우저**: 다양한 브라우저/디바이스 환경
- **성능**: 실제 환경에서의 로딩 시간 및 응답성
- **접근성**: 키보드 탐색 및 스크린 리더 호환성

```bash
# E2E 테스트 실행
bun run test:e2e

# 헤드리스 모드 (빠른 실행)
bun run test:e2e:social-media

# 브라우저 표시 모드 (디버깅용)
bun run test:e2e:headed

# 디버그 모드
bun run test:e2e:debug
```

### 5. 성능 테스트 (Performance Tests)
**위치**: `tests/performance/`

- **렌더링 성능**: 컴포넌트 렌더링 시간 측정
- **메모리 사용량**: 메모리 누수 및 최적화 검증
- **대량 데이터**: 많은 데이터 처리 시 성능
- **가상화**: 대량 리스트 가상화 성능

```bash
# 성능 테스트 실행
bun run test:performance

# 성능 프로파일링 포함
bun run test:performance --reporter=verbose
```

### 6. 접근성 테스트 (Accessibility Tests)
**위치**: `tests/accessibility/`

- **WCAG 준수**: 웹 접근성 가이드라인 준수
- **키보드 탐색**: 키보드만으로 모든 기능 접근
- **스크린 리더**: 시각 장애인을 위한 호환성
- **고대비 모드**: 시각적 장애를 고려한 디자인

```bash
# 접근성 테스트 실행
bun run test:accessibility

# axe-core 접근성 검사 포함
bun run test tests/accessibility/social-media-accessibility.test.ts
```

### 7. 오류 시나리오 테스트 (Error Scenario Tests)
**위치**: `tests/error-scenarios/`

- **네트워크 오류**: 오프라인 상태 및 API 실패
- **데이터 무결성**: 손상된 데이터 처리
- **브라우저 호환성**: 다양한 브라우저 환경
- **극한 상황**: 매우 큰 데이터셋이나 특수 문자

```bash
# 에러 시나리오 테스트 실행
bun run test tests/error-scenarios/social-media-edge-cases.test.ts
```

## 🚀 전체 테스트 실행

### 소셜 미디어 기능 전체 테스트
```bash
# 모든 소셜 미디어 관련 테스트 실행
bun run test:all:social-media

# 커버리지 포함 실행
bun run test:social-media:coverage
```

### 개발 워크플로우
```bash
# 개발 중 실시간 테스트 (Watch 모드)
bun run test:watch

# 테스트 UI (브라우저에서 테스트 결과 확인)
bun run test:ui

# 특정 파일 패턴 테스트
bun run test --run tests/**/*social*.test.ts
```

## 📊 테스트 보고서 및 커버리지

### 커버리지 임계값
- **Line Coverage**: 70% 이상
- **Function Coverage**: 70% 이상
- **Branch Coverage**: 70% 이상
- **Statement Coverage**: 70% 이상

### 보고서 생성
```bash
# HTML 커버리지 보고서 생성
bun run test:coverage

# 보고서 파일 위치
open coverage/index.html
```

### CI/CD 통합
```bash
# CI 환경에서 실행 (병렬 처리 및 재시도 포함)
CI=true bun run test:all:social-media

# JUnit XML 형식 보고서 생성
bun run test --reporter=junit --outputFile=test-results.xml
```

## 🛠️ 테스트 설정

### 환경 변수
```bash
# 테스트 환경 설정
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword
SEED_TEST_DATA=true
CLEANUP_TEST_DATA=true
BASE_URL=http://localhost:3000
```

### Mock 설정
테스트는 다음과 같은 Mock을 사용합니다:
- **Convex 클라이언트**: 실제 데이터베이스 연결 없이 테스트
- **브라우저 API**: 클립보드, IntersectionObserver 등
- **외부 서비스**: OAuth 프로바이더, AI 서비스 등

## 🐛 디버깅

### 테스트 디버깅
```bash
# 특정 테스트만 실행 (디버깅용)
bun run test --run tests/components/social-media/TokenExpiryAlert.test.tsx

# 상세 로그 출력
DEBUG=* bun run test

# E2E 테스트 디버깅 (브라우저 표시)
bun run test:e2e:debug
```

### 일반적인 문제 해결

1. **테스트 타임아웃**
   - `testTimeout` 값을 증가시키거나 비동기 로직을 최적화

2. **Mock 데이터 불일치**
   - `tests/setup/test-setup.ts`에서 Mock 데이터 팩토리 확인

3. **접근성 테스트 실패**
   - `jest-axe` 규칙 확인 및 ARIA 속성 추가

4. **성능 테스트 불안정**
   - 하드웨어 사양에 따라 임계값 조정 필요

## 📝 테스트 작성 가이드

### 새 테스트 작성 시 고려사항

1. **테스트 피라미드 준수**: 많은 단위 테스트, 적절한 통합 테스트, 최소한의 E2E 테스트
2. **Arrange-Act-Assert 패턴**: 설정-실행-검증 구조
3. **의미있는 테스트 이름**: 한국어 설명으로 테스트 의도 명확히
4. **독립적인 테스트**: 다른 테스트에 의존하지 않는 독립적 실행
5. **적절한 Mock 사용**: 외부 의존성은 Mock으로 처리

### 베스트 프랙티스

- ✅ **Happy Path + Edge Case**: 정상 케이스와 경계 케이스 모두 테스트
- ✅ **에러 핸들링**: 예상 가능한 모든 오류 상황 테스트
- ✅ **접근성 고려**: 키보드 탐색, 스크린 리더 등 접근성 테스트
- ✅ **성능 임계값**: 적절한 성능 기준 설정
- ✅ **실제 사용자 시나리오**: 사용자 관점에서 테스트 작성

## 🔗 관련 문서

- [Vitest 공식 문서](https://vitest.dev/)
- [Playwright 공식 문서](https://playwright.dev/)
- [Testing Library 가이드](https://testing-library.com/)
- [WCAG 2.1 가이드라인](https://www.w3.org/WAI/WCAG21/quickref/)
- [jest-axe 접근성 테스팅](https://github.com/nickcolley/jest-axe)