# 소셜 미디어 고급 기능 컴포넌트

이 디렉토리는 소셜 미디어 자동화와 분석을 위한 고급 React 컴포넌트들을 포함합니다.

## 🚀 주요 기능

### 1. 토큰 관리 (Token Management)
- **TokenExpiryAlert**: 만료 예정 소셜 미디어 토큰 알림 및 새로고침

### 2. 변형 테스팅 (Variant Testing)
- **VariantComparison**: A/B 테스트 결과 시각적 비교
- **VariantSelector**: 최적 콘텐츠 변형 선택 인터페이스

### 3. AI 분석 (AI Analytics)
- **GenerationHistory**: AI 콘텐츠 생성 히스토리 및 필터링
- **AIUsageStats**: AI 사용량 통계 및 트렌드 분석

### 4. 종합 분석 (Analytics)
- **AccountStats**: 계정별 상세 성과 분석
- **AnalyticsDashboard**: 종합 소셜 미디어 분석 대시보드
- **RealtimeMonitor**: 실시간 활동 모니터링

## 📦 설치 및 설정

```bash
# 의존성이 이미 설치되어 있어야 함
bun install
```

## 🎯 사용법

### 기본 임포트

```typescript
import {
  TokenExpiryAlert,
  AccountStats,
  VariantComparison,
  VariantSelector,
  GenerationHistory,
  AIUsageStats,
  AnalyticsDashboard,
  RealtimeMonitor,
  
  // 커스텀 훅
  useTokenExpiry,
  useVariantTesting,
  useAIGenerations,
  useAnalytics,
  
  // 타입
  type TokenExpiryAlertType,
  type VariantPerformance,
  type DashboardMetrics,
} from "@/components/social";
```

### 1. 토큰 만료 알림

```tsx
function TokenManagement() {
  return (
    <TokenExpiryAlert 
      hoursThreshold={24}      // 24시간 이내 만료 토큰 표시
      className="w-full"
      autoRefresh={true}       // 자동 새로고침 활성화
    />
  );
}
```

### 2. 계정 통계

```tsx
function AccountAnalytics({ accountId }: { accountId: Id<"socialAccounts"> }) {
  return (
    <AccountStats 
      accountId={accountId}
      startDate="2024-01-01"   // 선택사항: 시작 날짜
      endDate="2024-01-31"     // 선택사항: 종료 날짜
      detailed={true}          // 상세 모드
      className="w-full"
    />
  );
}
```

### 3. 변형 A/B 테스팅

```tsx
function VariantTesting({ postId }: { postId: Id<"socialPosts"> }) {
  const handleSelectionChange = (variantId: string | null) => {
    console.log("Selected variant:", variantId);
  };

  return (
    <div className="space-y-6">
      {/* 변형 비교 */}
      <VariantComparison 
        postId={postId}
        enableCopy={true}        // 텍스트 복사 기능
        compact={false}          // 상세 모드
      />
      
      {/* 변형 선택 */}
      <VariantSelector 
        postId={postId}
        onSelectionChange={handleSelectionChange}
        preview={false}          // 실제 선택 모드
      />
    </div>
  );
}
```

### 4. AI 생성 히스토리

```tsx
function AIHistory() {
  return (
    <GenerationHistory 
      pageSize={10}            // 페이지당 항목 수
      enableFilters={true}     // 필터 활성화
      detailed={true}          // 상세 정보 표시
      className="w-full"
    />
  );
}
```

### 5. AI 사용량 통계

```tsx
function AIStats() {
  return (
    <AIUsageStats 
      timeRange={30}           // 30일 기간
      detailed={true}          // 상세 분석 포함
      className="w-full"
    />
  );
}
```

### 6. 종합 분석 대시보드

```tsx
function Dashboard() {
  return (
    <AnalyticsDashboard 
      defaultTimeRange={30}    // 기본 30일
      autoRefreshInterval={5}  // 5분마다 자동 새로고침
      className="w-full"
    />
  );
}
```

### 7. 실시간 모니터링

```tsx
function LiveMonitoring() {
  return (
    <RealtimeMonitor 
      updateInterval={5}       // 5초마다 업데이트
      enableNotifications={true} // 알림 활성화
      autoStart={true}         // 자동 시작
      className="w-full"
    />
  );
}
```

## 🪝 커스텀 훅 사용법

### useTokenExpiry

```tsx
function TokenManagement() {
  const {
    expiringTokens,          // 만료 예정 토큰 목록
    summary,                 // 요약 정보
    isLoading,              // 로딩 상태
    getRefreshUrl,          // 새로고침 URL 생성
    formatTimeUntilExpiry,  // 시간 포맷팅
    getUrgencyColor,        // 긴급도 색상
    refresh,                // 수동 새로고침
  } = useTokenExpiry({
    hoursThreshold: 24,
    autoRefresh: true,
    onExpiry: (tokens) => {
      console.log("Critical tokens:", tokens);
    }
  });

  return (
    <div>
      {summary.systemStatus === "critical" && (
        <div className="text-red-600">
          긴급: {summary.criticalCount}개의 토큰이 곧 만료됩니다!
        </div>
      )}
    </div>
  );
}
```

### useVariantTesting

```tsx
function VariantManagement({ postId }: { postId: Id<"socialPosts"> }) {
  const {
    variants,               // 변형 목록
    comparison,            // 비교 데이터
    performanceAnalysis,   // 성능 분석
    isLoading,
    selectVariant,         // 변형 선택
    selectBestVariant,     // 최고 변형 선택
    getScoreColor,         // 점수 색상
  } = useVariantTesting({
    postId,
    includeMetrics: true
  });

  return (
    <div>
      <button 
        onClick={selectBestVariant}
        disabled={!comparison?.bestVariant}
      >
        최고 변형 선택
      </button>
      
      {variants.map(variant => (
        <div key={variant._id}>
          <span className={getScoreColor(variant.overallScore)}>
            {variant.overallScore}점
          </span>
        </div>
      ))}
    </div>
  );
}
```

### useAIGenerations

```tsx
function AIGenerationsManagement() {
  const {
    generations,           // 생성 히스토리
    statistics,           // 통계
    pagination,           // 페이지네이션
    filters,              // 현재 필터
    updateFilters,        // 필터 업데이트
    changePage,           // 페이지 변경
    exportData,           // 데이터 내보내기
    refresh,              // 새로고침
  } = useAIGenerations({
    filters: {
      type: "content_generation",
      success: true,
    },
    pagination: { page: 1, limit: 20 },
    realtime: true
  });

  return (
    <div>
      <div>
        총 {statistics.totalGenerations}개 생성, 
        성공률: {statistics.successRate.toFixed(1)}%
      </div>
      
      <button onClick={() => exportData("csv")}>
        CSV로 내보내기
      </button>
    </div>
  );
}
```

### useAnalytics

```tsx
function AnalyticsManagement() {
  const {
    overview,              // 종합 개요
    metrics,              // 메트릭 데이터
    trends,               // 트렌드 분석
    insights,             // 인사이트
    recommendations,      // 추천사항
    isLoading,
    refresh,              // 새로고침
    compareMetrics,       // 메트릭 비교
    getPlatformAnalysis,  // 플랫폼별 분석
  } = useAnalytics({
    timeRange: {
      start: "2024-01-01",
      end: "2024-01-31"
    },
    platforms: ["twitter", "linkedin"],
    includeInsights: true,
    includeRecommendations: true
  });

  return (
    <div>
      <div>
        총 게시물: {metrics.totalPosts}개
        평균 참여율: {metrics.averageEngagementRate.toFixed(1)}%
      </div>
      
      {recommendations.map(rec => (
        <div key={rec.id} className="p-4 border rounded">
          <h3>{rec.title}</h3>
          <p>{rec.description}</p>
          <span className="text-sm">예상 효과: {rec.estimatedImpact}</span>
        </div>
      ))}
    </div>
  );
}
```

## 🎨 스타일링

모든 컴포넌트는 Tailwind CSS를 사용하며, shadcn/ui 컴포넌트를 기반으로 구축되었습니다.

### 커스텀 클래스

```tsx
// 기본 사용
<TokenExpiryAlert className="w-full max-w-4xl mx-auto" />

// 다크 모드 대응
<AnalyticsDashboard className="dark:bg-gray-900 dark:text-white" />

// 반응형 디자인
<RealtimeMonitor className="w-full lg:w-1/2 xl:w-1/3" />
```

## 🔧 커스터마이징

### 테마 설정

```tsx
// 컴포넌트별 색상 테마 설정
<VariantComparison 
  className="
    [&_.score-excellent]:text-green-600
    [&_.score-good]:text-blue-600
    [&_.score-average]:text-yellow-600
  "
/>
```

### 이벤트 핸들링

```tsx
function CustomDashboard() {
  const handleTokenExpiry = (tokens: TokenExpiryAlert[]) => {
    // 커스텀 알림 로직
    toast.error(`${tokens.length}개의 토큰이 곧 만료됩니다!`);
  };

  const handleVariantSelection = (variantId: string | null) => {
    // 선택 이벤트 커스텀 처리
    if (variantId) {
      analytics.track("variant_selected", { variantId });
    }
  };

  return (
    <div>
      <TokenExpiryAlert onExpiry={handleTokenExpiry} />
      <VariantSelector onSelectionChange={handleVariantSelection} />
    </div>
  );
}
```

## 📱 접근성 (Accessibility)

모든 컴포넌트는 WCAG 2.1 AA 기준을 준수합니다:

- 키보드 네비게이션 지원
- 스크린 리더 호환성
- 적절한 색상 대비
- ARIA 레이블 및 속성

```tsx
// 접근성 향상을 위한 추가 속성
<TokenExpiryAlert 
  aria-label="소셜 미디어 토큰 만료 알림"
  role="alert"
/>

<VariantSelector 
  aria-describedby="variant-help-text"
/>
```

## 🧪 테스팅

컴포넌트 테스트 예시:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { TokenExpiryAlert } from "@/components/social";

test("토큰 만료 알림이 올바르게 렌더링된다", () => {
  render(<TokenExpiryAlert hoursThreshold={24} />);
  
  expect(screen.getByText("토큰 상태")).toBeInTheDocument();
});

test("새로고침 버튼이 작동한다", () => {
  const onRefresh = jest.fn();
  render(<TokenExpiryAlert onRefresh={onRefresh} />);
  
  fireEvent.click(screen.getByRole("button", { name: /갱신/ }));
  expect(onRefresh).toHaveBeenCalled();
});
```

## 🚨 문제 해결

### 자주 발생하는 오류

1. **Convex 연결 오류**
   ```
   Error: useQuery can only be used within ConvexProvider
   ```
   해결: 앱을 ConvexProvider로 래핑했는지 확인

2. **타입 오류**
   ```
   Type 'string' is not assignable to type 'Id<"socialPosts">'
   ```
   해결: Convex Id 타입을 올바르게 사용

3. **스타일 미적용**
   - Tailwind CSS 설정 확인
   - shadcn/ui 컴포넌트 설치 확인

### 성능 최적화

```tsx
// 메모이제이션 사용
const MemoizedAnalyticsDashboard = React.memo(AnalyticsDashboard);

// 조건부 렌더링
{isVisible && <RealtimeMonitor />}

// 지연 로딩
const LazyGenerationHistory = React.lazy(() => 
  import("@/components/social").then(module => ({ 
    default: module.GenerationHistory 
  }))
);
```

## 📞 지원

추가 도움이 필요하시면:

1. GitHub Issues 생성
2. 문서 참조: `/docs/social-components.md`
3. 예제 코드: `/examples/social-analytics/`

## 📄 라이센스

이 컴포넌트들은 MIT 라이센스 하에 제공됩니다.