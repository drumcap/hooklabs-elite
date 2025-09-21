# 🧪 포괄적 테스트 가이드

이 문서는 HookLabs Elite 프로젝트의 포괄적인 테스트 전략과 실행 방법을 설명합니다.

## 📋 목차

- [테스트 아키텍처](#테스트-아키텍처)
- [테스트 유형](#테스트-유형)
- [설정 및 실행](#설정-및-실행)
- [CI/CD 통합](#cicd-통합)
- [성능 테스트](#성능-테스트)
- [보안 테스트](#보안-테스트)
- [문제 해결](#문제-해결)

## 🏗️ 테스트 아키텍처

### 테스트 스택
- **Vitest**: 단위 및 통합 테스트
- **Playwright**: E2E 테스트
- **React Testing Library**: 컴포넌트 테스트
- **K6**: 성능 및 부하 테스트
- **OWASP ZAP**: 보안 취약점 스캔
- **Lighthouse CI**: 성능 감사

### 디렉토리 구조
```
tests/
├── setup/                    # 테스트 설정 및 유틸리티
│   ├── convex-setup.ts      # Convex 모킹 및 테스트 데이터
│   ├── auth-setup.ts        # 인증 테스트 유틸리티
│   └── vitest-setup.ts      # Vitest 글로벌 설정
├── unit/                     # 단위 테스트
│   ├── convex/              # Convex 함수 테스트
│   └── utils/               # 유틸리티 함수 테스트
├── integration/              # 통합 테스트
│   ├── api/                 # API 엔드포인트 테스트
│   └── social-media-api.test.ts
├── components/               # 컴포넌트 테스트
│   ├── social/              # 소셜 미디어 컴포넌트
│   └── ui/                  # UI 컴포넌트
├── e2e/                     # E2E 테스트
│   ├── utils/               # E2E 테스트 유틸리티
│   └── social-media-workflow.e2e.ts
├── performance/             # 성능 테스트
│   └── k6-load-test.js      # K6 부하 테스트
├── security/                # 보안 테스트
│   └── security-test-suite.test.ts
└── accessibility/           # 접근성 테스트
```

## 🔬 테스트 유형

### 1. 단위 테스트 (Unit Tests)
**목적**: 개별 함수와 컴포넌트의 로직 검증

```bash
# 단위 테스트 실행
bun run test:unit

# 커버리지 포함
bun run test:unit --coverage

# 특정 파일 테스트
bun run test:unit tests/unit/convex/socialAccounts.test.ts
```

**예시 테스트**:
```typescript
// tests/unit/convex/socialAccounts.test.ts
import { describe, it, expect } from 'vitest';
import { createSocialAccount } from '@/convex/socialAccounts';

describe('createSocialAccount', () => {
  it('소셜 계정을 성공적으로 생성해야 함', async () => {
    const account = await createSocialAccount({
      platform: 'twitter',
      username: 'testuser',
      accessToken: 'token123'
    });

    expect(account).toBeDefined();
    expect(account.platform).toBe('twitter');
  });
});
```

### 2. 통합 테스트 (Integration Tests)
**목적**: 여러 모듈 간의 상호작용 검증

```bash
# 통합 테스트 실행
bun run test:integration

# 소셜 미디어 API 통합 테스트
bun run test:integration tests/integration/social-media-api.test.ts
```

### 3. 컴포넌트 테스트 (Component Tests)
**목적**: React 컴포넌트의 렌더링과 상호작용 검증

```bash
# 컴포넌트 테스트 실행
bun run test:components

# 특정 컴포넌트 테스트
bun run test:components tests/components/social/VariantGenerator.test.tsx
```

**예시 테스트**:
```typescript
// tests/components/social/VariantGenerator.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { VariantGenerator } from '@/components/social/content/VariantGenerator';

describe('VariantGenerator', () => {
  it('변형 생성 버튼을 클릭하면 변형이 생성되어야 함', async () => {
    render(<VariantGenerator postId="test-post-id" />);

    const generateButton = screen.getByText('변형 생성');
    fireEvent.click(generateButton);

    expect(screen.getByText('생성 중...')).toBeInTheDocument();
  });
});
```

### 4. E2E 테스트 (End-to-End Tests)
**목적**: 실제 사용자 시나리오의 전체 워크플로우 검증

```bash
# E2E 테스트 실행
bun run test:e2e

# 브라우저 UI와 함께 실행
bun run test:e2e:headed

# 디버그 모드
bun run test:e2e:debug

# 특정 브라우저에서만 실행
bunx playwright test --project=chromium
```

**브라우저 지원**:
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)
- 모바일 브라우저 (Android Chrome, iOS Safari)

### 5. 성능 테스트 (Performance Tests)
**목적**: 애플리케이션의 성능과 확장성 검증

```bash
# K6 부하 테스트
bun run perf:load

# 스트레스 테스트
bun run perf:stress

# Lighthouse 성능 감사
bun run perf:lighthouse

# 전체 성능 테스트 스위트
bun run perf:all
```

**성능 기준**:
- 첫 콘텐츠풀 페인트(FCP): < 2초
- 최대 콘텐츠풀 페인트(LCP): < 3초
- 누적 레이아웃 시프트(CLS): < 0.1
- 총 차단 시간(TBT): < 300ms

### 6. 보안 테스트 (Security Tests)
**목적**: 보안 취약점 및 위협 요소 검증

```bash
# 보안 테스트 실행
bun run security:test

# 의존성 보안 감사
bun run security:audit

# OWASP ZAP 스캔 (별도 실행 필요)
bun run security:zap
```

**검증 항목**:
- XSS (Cross-Site Scripting) 방어
- SQL 인젝션 방어
- CSRF (Cross-Site Request Forgery) 방어
- JWT 토큰 보안
- 입력 값 검증
- 보안 헤더 설정

## 🚀 설정 및 실행

### 개발 환경 설정

1. **의존성 설치**:
```bash
bun install
```

2. **Playwright 브라우저 설치**:
```bash
bunx playwright install
```

3. **테스트 환경 변수 설정**:
```bash
# .env.test 파일 생성
NODE_ENV=test
CONVEX_DEPLOYMENT=your-test-deployment
NEXT_PUBLIC_CONVEX_URL=your-test-convex-url
```

### 빠른 시작

```bash
# 전체 테스트 스위트 실행
bun run test:all

# CI 환경 시뮬레이션
bun run test:ci

# 소셜 미디어 기능 전용 테스트
bun run test:all:social-media
```

### Docker를 이용한 테스트

```bash
# 전체 테스트 환경 구축
docker-compose -f docker-compose.test.yml up --build

# 특정 테스트 유형만 실행
docker-compose -f docker-compose.test.yml --profile unit up
docker-compose -f docker-compose.test.yml --profile e2e up
docker-compose -f docker-compose.test.yml --profile performance up
```

## 🔄 CI/CD 통합

### GitHub Actions 워크플로우

테스트는 다음 상황에서 자동 실행됩니다:
- `main`, `develop` 브랜치에 푸시
- Pull Request 생성/업데이트
- 매일 오전 2시 (UTC) 전체 테스트 실행

### 워크플로우 단계

1. **린팅 및 타입 체크**
2. **단위 테스트** (병렬 실행)
3. **통합 테스트** (병렬 실행)
4. **컴포넌트 테스트** (병렬 실행)
5. **E2E 테스트** (브라우저별 병렬 실행)
6. **보안 테스트**
7. **성능 테스트** (선택적)
8. **빌드 검증**

### 품질 게이트

- **커버리지 임계값**: 85% (라인, 함수, 문장), 80% (브랜치)
- **성능 기준**: Core Web Vitals 통과
- **보안 기준**: OWASP 베이스라인 통과
- **접근성 기준**: WCAG 2.1 AA 수준

## 📊 성능 테스트

### K6 부하 테스트 시나리오

```javascript
// tests/performance/k6-load-test.js
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // 램프업
    { duration: '5m', target: 10 },   // 안정
    { duration: '1m', target: 50 },   // 스파이크
    { duration: '2m', target: 50 },   // 스파이크 유지
    { duration: '2m', target: 0 },    // 램프다운
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
  },
};
```

### 성능 메트릭

- **응답 시간**: 95%가 2초 이내
- **실패율**: 10% 미만
- **동시 사용자**: 최대 50명 지원
- **API 응답**: 90%가 1.5초 이내

## 🛡️ 보안 테스트

### 자동화된 보안 검증

```typescript
// tests/security/security-test-suite.test.ts
describe('보안 테스트', () => {
  describe('XSS 방어', () => {
    it('스크립트 태그가 이스케이프되어야 함', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).not.toContain('<script>');
    });
  });

  describe('JWT 토큰 보안', () => {
    it('만료된 토큰을 거부해야 함', () => {
      const expiredToken = createExpiredToken();
      expect(() => validateToken(expiredToken)).toThrow();
    });
  });
});
```

### OWASP ZAP 통합

```bash
# OWASP ZAP 베이스라인 스캔
docker run -v $(pwd):/zap/wrk/:rw \
  owasp/zap2docker-stable \
  zap-baseline.py -t http://localhost:3000 \
  -c .zap/rules.tsv
```

## 🔧 문제 해결

### 일반적인 문제

**1. Playwright 브라우저 설치 오류**
```bash
# 브라우저 재설치
bunx playwright install --force
```

**2. Convex 테스트 데이터베이스 연결 오류**
```bash
# Convex 개발 서버 재시작
bunx convex dev --clear
```

**3. 포트 충돌**
```bash
# 사용 중인 포트 확인
lsof -i :3000
kill -9 <PID>
```

**4. 메모리 부족**
```bash
# Node.js 메모리 한도 증가
export NODE_OPTIONS="--max-old-space-size=4096"
```

### 테스트 디버깅

**단위 테스트 디버깅**:
```bash
# 특정 테스트만 실행
bun run test:unit --run tests/unit/specific-test.test.ts

# watch 모드로 개발
bun run test:watch
```

**E2E 테스트 디버깅**:
```bash
# 브라우저 UI와 함께 실행
bun run test:e2e:headed

# 단계별 디버깅
bun run test:e2e:debug
```

**성능 테스트 디버깅**:
```bash
# 상세 로그와 함께 실행
K6_WEB_DASHBOARD=true k6 run tests/performance/k6-load-test.js
```

## 📈 테스트 메트릭 및 리포팅

### 커버리지 보고서
```bash
# HTML 커버리지 보고서 생성
bun run test:coverage
open coverage/index.html
```

### E2E 테스트 결과
```bash
# Playwright 보고서 보기
bunx playwright show-report
```

### 성능 테스트 결과
```bash
# K6 결과를 HTML로 변환
k6 run --out json=results.json tests/performance/k6-load-test.js
```

## 🎯 베스트 프랙티스

### 테스트 작성 가이드라인

1. **명확한 테스트 이름**: 무엇을 테스트하는지 명확히 표현
2. **AAA 패턴**: Arrange, Act, Assert 구조 사용
3. **독립적인 테스트**: 각 테스트는 독립적으로 실행 가능해야 함
4. **적절한 모킹**: 외부 의존성은 모킹하여 격리
5. **엣지 케이스 고려**: 경계값과 오류 상황 테스트

### 성능 최적화

1. **병렬 실행**: 가능한 한 테스트를 병렬로 실행
2. **선택적 실행**: 변경된 부분과 관련된 테스트만 실행
3. **캐싱 활용**: 의존성과 빌드 결과 캐싱
4. **리소스 정리**: 테스트 후 리소스 정리로 메모리 누수 방지

---

이 가이드를 통해 HookLabs Elite 프로젝트의 품질을 보장하고 안정적인 소프트웨어를 제공할 수 있습니다. 추가 질문이나 개선 사항이 있다면 개발팀에 문의해 주세요.