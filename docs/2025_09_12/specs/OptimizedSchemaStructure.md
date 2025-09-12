# 최적화된 데이터베이스 스키마 구조

## 현재 문제점
- 58개 테이블 → 너무 많은 복잡성
- 중복 테이블 및 미사용 테이블 다수
- 과도한 모니터링/파이프라인 테이블

## 제안된 구조 (35개 테이블)

### 1. Core Auth (1개 테이블)
```typescript
// auth.ts
users: {
  externalId: string,        // Clerk ID
  name: string,
  lemonSqueezyCustomerId?: string,
  createdAt: string,
}
```

### 2. Payments & Subscriptions (5개 테이블)
```typescript
// payments.ts
subscriptions: { /* 기존 유지 */ }
checkouts: { /* 기존 유지 */ }
payments: { /* 기존 유지 */ }
licenses: { /* 기존 유지 */ }
paymentAttempts: { /* Legacy - 점진적 제거 */ }
```

### 3. Billing System (3개 테이블)
```typescript
// billing.ts
usage: { 
  userId: Id<"users">,
  resourceType: string,      // "ai_generation", "api_call", "storage", "credits"
  amount: number,
  unit: string,             // "requests", "tokens", "MB", "credits"
  description: string,
  postId?: Id<"socialPosts">,
  personaId?: Id<"personas">,
  metadata?: any,
  timestamp: string,
  createdAt: string,
}

credits: {
  userId: Id<"users">,
  amount: number,           // 양수=적립, 음수=사용
  type: string,            // earned, purchased, used, refunded, expired
  description: string,
  expiresAt?: string,
  relatedOrderId?: string,
  relatedCouponId?: Id<"coupons">,
  metadata?: any,
  createdAt: string,
}

coupons: { /* 기존 유지 */ }
couponUsages: { /* 기존 유지 */ }
```

### 4. Social Media (6개 테이블)
```typescript
// social.ts
personas: { /* 기존 유지 */ }
socialAccounts: { /* 기존 유지 */ }
socialPosts: { /* 기존 유지 */ }
postVariants: { /* 기존 유지 */ }
scheduledPosts: { /* 기존 유지 */ }

socialMetrics: {
  postId: Id<"socialPosts">,
  platform: string,
  accountId: Id<"socialAccounts">,
  // 통합된 메트릭
  impressions?: number,
  reach?: number,
  engagement?: number,
  likes?: number,
  comments?: number,
  shares?: number,
  clicks?: number,
  saves?: number,
  profileVisits?: number,
  follows?: number,
  // 분석 데이터 추가
  engagementRate: number,
  viralityScore?: number,
  bestPerformingTime?: string,
  audienceInsights?: any,
  competitorComparison?: any,
  fetchedAt: string,
}
```

### 5. AI & Content (1개 테이블)
```typescript
// ai.ts
aiGenerations: { /* 기존 유지 */ }
```

### 6. Essential Analytics (2개 테이블)
```typescript
// analytics.ts - 꼭 필요한 것만
userSessions: {           // sessions 단순화
  sessionId: string,
  userId?: Id<"users">,
  startedAt: string,
  lastActivityAt: string,
  pageCount: number,
  duration?: number,
}

basicMetrics: {          // 기본 메트릭만
  userId?: Id<"users">,
  metricType: string,     // "page_view", "user_action", "conversion"
  metricName: string,
  value: number,
  dimensions?: {
    page?: string,
    action?: string,
    source?: string,
  },
  timestamp: string,
}
```

### 7. Simplified Monitoring (2개 테이블)
```typescript
// monitoring.ts - 필수 모니터링만
errorLogs: {
  userId?: Id<"users">,
  level: string,          // error, warn, info
  category: string,       // api, frontend, payment, ai
  message: string,
  errorName?: string,
  errorStack?: string,
  pathname?: string,
  endpoint?: string,
  sessionId?: string,
  metadata?: any,
  timestamp: string,
}

systemHealth: {          // 기본 시스템 상태만
  metric: string,         // "response_time", "error_rate", "active_users"
  value: number,
  status: string,         // "healthy", "warning", "critical"
  timestamp: string,
}
```

## 제거할 테이블 (23개)

### 완전 제거
1. **monitoring.ts** - 8개 테이블 모두
   - webVitals, apiMetrics, queryMetrics, systemMetrics
   - businessMetrics, alertRules, alertHistory
   
2. **pipeline.ts** - 10개 테이블 모두
   - eventStreams, transformedData, metrics, windowAggregations
   - aggregations, deadLetterQueue, batchJobs, dataQualityChecks
   - pipelineStatus, performanceReports

3. **analytics.ts** - 기존 3개 테이블 모두
   - pageViews, postAnalytics, socialMetrics

4. **auth.ts**에서 3개 제거
   - sessions, userActions, userActivitySummary

5. **ai.ts**에서 2개 제거
   - contentSources, contentItems

6. **billing.ts**에서 1개 제거
   - usageRecords (usage로 통합)
   - userCreditBalances (실시간 계산으로 대체)

## 마이그레이션 전략

### Phase 1: 중복 제거
1. `socialMetrics` 중복 해결
2. `usageRecords` → `usage` 통합
3. `userCreditBalances` 실시간 계산으로 변경

### Phase 2: 미사용 테이블 제거
1. monitoring/pipeline 도메인 전체 제거
2. analytics 기존 테이블 제거 후 단순화된 버전으로 교체
3. auth에서 세션 관련 테이블 제거

### Phase 3: 최적화
1. 인덱스 최적화
2. 쿼리 성능 개선
3. 데이터 일관성 검증

## 예상 효과

- **테이블 수 감소**: 58개 → 35개 (40% 감소)
- **복잡도 감소**: 과도한 모니터링/분석 테이블 제거
- **유지보수성 향상**: 실제 사용되는 테이블만 유지
- **성능 향상**: 불필요한 인덱스 및 쿼리 제거
- **개발 생산성 향상**: 단순하고 명확한 스키마 구조