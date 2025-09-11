# 쿠폰 관리 시스템 기술적 제약 및 가정사항

## 개요

이 문서는 쿠폰 관리 시스템 UI 개발에 적용되는 기술적 제약사항, 아키텍처 결정사항, 그리고 개발 시 고려해야 할 가정사항들을 정의합니다.

## 기술 스택 제약사항

### 필수 기술 스택 (변경 불가)

#### 프론트엔드 프레임워크
- **Next.js 15**: App Router 구조 사용 필수
  - `app/` 디렉토리 구조 준수
  - Server Components와 Client Components 적절한 분리
  - 라우팅은 파일 시스템 기반 라우팅 사용
  - Turbopack 개발 서버 활용

#### 스타일링 시스템
- **TailwindCSS v4**: 스타일링 시스템 표준
  - 커스텀 CSS 최소화
  - TailwindCSS 유틸리티 클래스 우선 사용
  - 다크 모드 지원 (`dark:` 프리픽스)
  - 반응형 브레이크포인트: `sm`, `md`, `lg`, `xl`, `2xl`

#### UI 컴포넌트 라이브러리
- **shadcn/ui**: 재사용 가능한 컴포넌트 표준
  - 새로운 shadcn/ui 컴포넌트 설치 시 `bunx --bun shadcn@latest add [component]` 사용
  - 기존 컴포넌트 우선 활용, 필요시에만 새 컴포넌트 설치
  - 컴포넌트 커스터마이징은 `/components/ui/` 에서만 수행

#### 프로그래밍 언어
- **TypeScript**: 엄격 모드 (`"strict": true`) 사용
  - 모든 `.tsx`, `.ts` 파일에서 타입 안정성 보장
  - `any` 타입 사용 금지 (eslint 규칙으로 강제)
  - 인터페이스 우선, `type` 별칭은 유니온/교차 타입에만 사용

### 백엔드 통합 제약사항

#### 데이터베이스 및 실시간 동기화
- **Convex**: 유일한 데이터 액세스 방법
  - REST API나 GraphQL 사용 불가
  - 모든 데이터 CRUD는 Convex 쿼리/뮤테이션을 통해서만
  - 실시간 업데이트는 `useQuery` 훅의 자동 재구독 기능 활용
  - 서버 사이드 렌더링 시 `preloadQuery` 사용

#### 인증 시스템
- **Clerk**: 인증 및 사용자 관리 전담
  - 커스텀 인증 로직 구현 금지
  - JWT 토큰은 Convex 템플릿으로만 처리
  - 사용자 권한은 `publicMetadata.role` 필드로만 관리
  - 관리자 권한: `role: 'admin'`, 일반 사용자: `role: undefined`

#### 결제 시스템
- **Lemon Squeezy**: 결제 및 구독 관리
  - 직접적인 결제 API 호출 금지
  - 쿠폰 적용은 Lemon Squeezy 체크아웃 URL 파라미터로만 처리
  - 웹훅을 통한 결제 상태 동기화에만 의존

## 아키텍처 제약사항

### 컴포넌트 구조

#### 디렉토리 구조 규칙
```
app/
├── (dashboard)/           # 대시보드 레이아웃 그룹
│   ├── admin/            # 관리자 전용 페이지
│   │   ├── coupons/      # 쿠폰 관리 페이지들
│   │   └── layout.tsx    # 관리자 레이아웃 (권한 체크)
│   └── coupons/          # 사용자 쿠폰 페이지들
├── api/                  # API 라우트 (웹훅 전용)
└── globals.css           # TailwindCSS imports만 포함

components/
├── ui/                   # shadcn/ui 컴포넌트들
├── coupons/              # 쿠폰 관련 비즈니스 컴포넌트들
├── admin/                # 관리자 전용 컴포넌트들
└── providers/            # Context Providers
```

#### 컴포넌트 설계 원칙
- **단일 책임 원칙**: 각 컴포넌트는 하나의 명확한 역할만 수행
- **합성 우선**: Higher-Order Components보다 Composition 패턴 사용
- **Server/Client 분리**: 
  - Server Components: 데이터 페칭, 초기 렌더링
  - Client Components: 상호작용, 상태 관리, 실시간 업데이트

### 상태 관리 제약사항

#### 클라이언트 상태 관리
- **React Built-in**: 복잡한 상태 관리 라이브러리 사용 금지
  - `useState`, `useReducer`, `useContext`만 사용
  - Zustand, Redux 등 외부 상태 관리 라이브러리 금지
  - 전역 상태는 React Context로만 관리

#### 서버 상태 관리
- **Convex Hooks**: 서버 데이터는 Convex 훅으로만 관리
  - `useQuery`: 데이터 조회 및 실시간 구독
  - `useMutation`: 데이터 변경
  - React Query, SWR 등 추가 캐싱 라이브러리 금지

#### 폼 상태 관리
- **React Hook Form**: 폼 관리 표준 라이브러리
  - Formik, 순수 React state 기반 폼 관리 금지
  - **Zod**: 스키마 검증 라이브러리
  - `@hookform/resolvers/zod`로 검증 로직 연동

### 성능 제약사항

#### 코드 분할 (Code Splitting)
```typescript
// 동적 임포트 필수 사용처
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard'));
const CouponStatsModal = lazy(() => import('@/components/coupons/CouponStatsModal'));
```

#### 번들 크기 제한
- 초기 JavaScript 번들: 200KB 이하 (gzipped)
- 각 페이지별 청크: 100KB 이하 (gzipped)
- 이미지 최적화: Next.js `Image` 컴포넌트 필수 사용
- 아이콘: Lucide React 아이콘만 사용 (tree shaking 지원)

#### 렌더링 최적화
- **React.memo**: 순수 컴포넌트에 필수 적용
- **useMemo/useCallback**: 계산 비용 높은 연산에만 선별 적용
- **가상화**: 100개 이상 리스트 항목 시 `@tanstack/react-virtual` 사용

## 데이터 모델 제약사항

### Convex 스키마 호환성
기존 데이터베이스 스키마 변경 최소화 원칙:

```typescript
// 사용 가능한 쿠폰 관련 테이블들
interface CouponTable {
  _id: Id<"coupons">;
  code: string;              // 변경 불가
  name: string;              // 변경 가능
  description?: string;      // 변경 가능
  type: "percentage" | "fixed_amount" | "credits"; // 변경 불가
  value: number;             // 변경 불가 (사용된 쿠폰)
  // ... 기타 필드들
}

interface CouponUsageTable {
  _id: Id<"couponUsages">;
  userId: Id<"users">;
  couponId: Id<"coupons">;
  // ... 변경 불가 필드들
}
```

### API 인터페이스 호환성
기존 Convex 함수 시그니처 변경 금지:

```typescript
// 사용해야 하는 기존 함수들 (변경 불가)
validateCoupon: Query<{ code: string; userId?: Id<"users">; orderAmount?: number }>
useCoupon: Mutation<{ userId: Id<"users">; couponCode: string; ... }>
getAllCoupons: Query<{ isActive?: boolean; limit?: number }>
// ... 기타 함수들
```

## 환경 및 배포 제약사항

### 개발 환경 요구사항

#### Node.js 및 패키지 매니저
- **Node.js**: v18.17.0 이상 (LTS 버전)
- **Bun**: v1.0.0 이상 (패키지 매니저 및 런타임)
- **npm**: 패키지 설치 시에만 사용, 실행은 bun 사용

#### 필수 개발 도구
```json
{
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0", 
    "@types/react-dom": "^18.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "15.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "vitest": "^1.0.0",
    "@playwright/test": "^1.40.0"
  }
}
```

#### 환경변수 요구사항
```bash
# 필수 환경변수들
CONVEX_DEPLOYMENT=dev:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
LEMONSQUEEZY_API_KEY=ls_...
LEMONSQUEEZY_STORE_ID=12345
LEMONSQUEEZY_WEBHOOK_SECRET=ls_webhook_...
```

### 배포 제약사항

#### Vercel 배포 요구사항
- **Runtime**: Edge Runtime 사용 금지 (Clerk와 호환성 문제)
- **Node.js Runtime**: 18.x 버전 고정
- **Build Command**: `bun run build`
- **Install Command**: `bun install`

#### 성능 기준
- **Core Web Vitals**: 모든 페이지에서 다음 기준 만족
  - LCP (Largest Contentful Paint): 2.5초 이하
  - FID (First Input Delay): 100ms 이하  
  - CLS (Cumulative Layout Shift): 0.1 이하
- **SEO**: Lighthouse 점수 90점 이상
- **Accessibility**: axe-core 테스트 통과율 100%

## 보안 제약사항

### 클라이언트 사이드 보안
- **XSS 방지**: 모든 사용자 입력 sanitization
- **CSRF 방지**: Clerk의 내장 CSRF 보호 의존
- **민감 정보**: 클라이언트에서 쿠폰 생성 로직 노출 금지
- **API 키**: 클라이언트 사이드에 서버 API 키 노출 절대 금지

### 권한 관리 제약사항
```typescript
// 관리자 권한 체크 패턴 (필수)
function useAdminAuth() {
  const { user } = useUser();
  return user?.publicMetadata?.role === 'admin';
}

// 서버 사이드에서도 동일한 권한 체크 필수
export default async function AdminPage() {
  const { userId } = auth();
  const user = await clerkClient.users.getUser(userId);
  
  if (user.publicMetadata?.role !== 'admin') {
    redirect('/dashboard');
  }
  // ...
}
```

## 테스트 제약사항

### 테스트 환경 구성
- **단위 테스트**: Vitest (Jest 사용 금지)
- **컴포넌트 테스트**: Testing Library
- **E2E 테스트**: Playwright (Cypress 사용 금지)
- **시각적 테스트**: Chromatic (추후 도입 검토)

### 테스트 커버리지 요구사항
- **전체 커버리지**: 80% 이상
- **비즈니스 로직**: 90% 이상
- **UI 컴포넌트**: 70% 이상
- **E2E 테스트**: 핵심 사용자 플로우 100% 커버

### Mock 전략 제약사항
```typescript
// Convex 함수 모킹 패턴
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useConvex: vi.fn(),
}));

// Clerk 모킹 패턴  
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(),
  useAuth: vi.fn(),
  auth: vi.fn(),
}));
```

## 접근성 제약사항

### WCAG 2.1 AA 준수 필수사항
- **키보드 탐색**: Tab, Enter, Space, Escape 키 지원
- **스크린 리더**: ARIA 레이블, 역할, 상태 정보 제공
- **색상 대비**: 4.5:1 이상 (대형 텍스트는 3:1)
- **포커스 관리**: 모달, 드롭다운에서 포커스 트랩 구현

### 접근성 테스트 자동화
```typescript
// axe-core 통합 테스트 (필수)
import { axe, toHaveNoViolations } from 'jest-axe';

test('쿠폰 입력 폼 접근성', async () => {
  const { container } = render(<CouponForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## 국제화(i18n) 제약사항

### 다국어 지원 범위
- **주요 언어**: 한국어(기본), 영어
- **라이브러리**: next-intl (next-i18next 사용 금지)
- **번역 키**: 네임스페이스 방식으로 구조화
- **숫자/통화**: Intl.NumberFormat 사용 필수

### 번역 파일 구조
```json
// messages/ko.json
{
  "coupons": {
    "validation": {
      "invalid": "유효하지 않은 쿠폰 코드입니다",
      "expired": "만료된 쿠폰입니다"
    },
    "form": {
      "code": "쿠폰 코드",
      "apply": "적용하기"
    }
  }
}
```

## 모니터링 및 로깅 제약사항

### 에러 트래킹
- **Sentry**: 클라이언트 에러 모니터링
- **로그 레벨**: ERROR, WARN만 프로덕션 전송
- **민감 정보**: 쿠폰 코드, 사용자 정보 로깅 금지

### 성능 모니터링
- **Web Vitals**: @next/third-parties를 통한 자동 수집
- **사용자 행동**: Vercel Analytics 활용
- **비즈니스 메트릭**: 쿠폰 사용률, 변환율 추적

## 브라우저 지원 제약사항

### 지원 브라우저 범위
- **데스크톱**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **모바일**: iOS Safari 14+, Android Chrome 90+
- **미지원**: Internet Explorer (모든 버전)

### Polyfill 정책
- **자동 Polyfill**: Next.js의 자동 polyfill 기능 활용
- **수동 Polyfill**: 필요 시에만 core-js 선별 적용
- **번들 크기**: Polyfill로 인한 크기 증가 10% 이내

## 데이터 제한사항

### 쿠폰 데이터 제한
- **최대 쿠폰 개수**: 10,000개
- **최대 쿠폰 코드 길이**: 20자
- **최대 쿠폰 이름 길이**: 100자
- **최대 설명 길이**: 500자
- **동시 사용자**: 1,000명

### 성능 임계점
- **리스트 페이지네이션**: 100개 단위
- **검색 디바운싱**: 500ms
- **실시간 업데이트**: 5초 간격 제한
- **캐시 TTL**: 클라이언트 캐시 5분

## 규정 준수 제약사항

### 개인정보보호
- **GDPR**: 유럽 사용자 데이터 처리 규정 준수
- **개인정보보호법**: 한국 개인정보 처리 방침 준수
- **데이터 최소화**: 필요한 데이터만 수집 및 처리
- **데이터 보존**: 사용자 삭제 시 관련 쿠폰 데이터 익명화

### 결제 관련 규정
- **PCI DSS**: Lemon Squeezy를 통한 간접 준수
- **전자상거래법**: 쿠폰 사용 약관 명시 필수
- **소비자 보호**: 쿠폰 사용 조건 명확 고지

---

## 의사결정 기록 (ADR)

### ADR-001: shadcn/ui 컴포넌트 라이브러리 선택
**결정**: Material-UI, Ant Design 대신 shadcn/ui 사용
**이유**: 
- TailwindCSS와 완벽 호환
- 복사/수정 가능한 컴포넌트 구조
- 번들 크기 최적화 가능
- 프로젝트 기존 설정과 일관성

### ADR-002: 실시간 업데이트 방식
**결정**: WebSocket 기반 폴링 대신 Convex 내장 실시간 기능 사용
**이유**:
- 서버 복잡성 감소
- 자동 재연결 및 에러 처리
- 타입 안전성 보장
- 개발 생산성 향상

### ADR-003: 상태 관리 전략
**결정**: Redux/Zustand 대신 React Context + Convex 조합 사용
**이유**:
- 서버 상태와 클라이언트 상태 명확한 분리
- 번들 크기 최적화
- 러닝 커브 감소
- Convex와의 자연스러운 통합

---

**문서 버전**: v1.0  
**작성일**: 2025년 9월 3일  
**작성자**: Technical Architect  
**검토자**: [검토 예정]  
**승인자**: [승인 예정]