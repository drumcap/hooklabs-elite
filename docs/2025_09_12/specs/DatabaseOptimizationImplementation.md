# 데이터베이스 스키마 최적화 구현 가이드

## 구현 우선순위 및 단계

### Phase 1: 중복 해결 및 핵심 테이블 정리 (즉시 시행 가능)

#### 1.1 socialMetrics 중복 해결
```typescript
// convex/schema/social.ts - 기존 유지
export const socialMetrics = defineTable({
  postId: v.id("socialPosts"),
  platform: v.string(),
  accountId: v.id("socialAccounts"),
  // 통합된 메트릭 (analytics.ts의 postAnalytics 필드들 추가)
  impressions: v.optional(v.number()),
  reach: v.optional(v.number()),
  engagement: v.optional(v.number()),
  engagementRate: v.number(),
  viralityScore: v.optional(v.number()),
  likes: v.optional(v.number()),
  comments: v.optional(v.number()),
  shares: v.optional(v.number()),
  clicks: v.optional(v.number()),
  saves: v.optional(v.number()),
  profileVisits: v.optional(v.number()),
  follows: v.optional(v.number()),
  bestPerformingTime: v.optional(v.string()),
  audienceInsights: v.optional(v.any()),
  competitorComparison: v.optional(v.any()),
  fetchedAt: v.string(),
})
  .index("byPostId", ["postId"])
  .index("byPostPlatform", ["postId", "platform"])
  .index("byAccountPlatform", ["accountId", "platform"]);

// convex/schema/analytics.ts - socialMetrics 제거
export const analyticsSchema = {
  // socialMetrics 제거됨
  // pageViews, postAnalytics도 제거 예정
};
```

#### 1.2 사용량 테이블 통합
```typescript
// convex/schema/billing.ts
// usageRecords 제거, usage만 유지하되 필드 보완
export const usage = defineTable({
  userId: v.id("users"),
  resourceType: v.string(),
  amount: v.number(),
  unit: v.string(),
  description: v.string(),
  postId: v.optional(v.id("socialPosts")),
  personaId: v.optional(v.id("personas")),
  // usageRecords의 필수 필드들 추가
  subscriptionId: v.optional(v.id("subscriptions")),
  periodStart: v.optional(v.string()),
  periodEnd: v.optional(v.string()),
  metadata: v.optional(v.any()),
  timestamp: v.string(),
  createdAt: v.string(),
})
  .index("byUserId", ["userId"])
  .index("byUserResource", ["userId", "resourceType"])
  .index("byUserTime", ["userId", "timestamp"])
  .index("byPostId", ["postId"])
  .index("byPeriod", ["periodStart", "periodEnd"]);

// usageRecords, userCreditBalances 제거
export const billingSchema = {
  usage,
  credits,
  coupons,
  couponUsages,
  // usageRecords, userCreditBalances 제거됨
};
```

#### 1.3 마이그레이션 함수 작성
```typescript
// convex/migrations/schemaOptimization.ts
import { internalMutation } from "../_generated/server";

export const migrateUsageData = internalMutation({
  handler: async (ctx) => {
    // 1. usageRecords 데이터를 usage로 마이그레이션
    const usageRecords = await ctx.db.query("usageRecords").collect();
    
    for (const record of usageRecords) {
      await ctx.db.insert("usage", {
        userId: record.userId,
        resourceType: record.resourceType,
        amount: record.amount,
        unit: record.unit,
        description: record.description || `${record.resourceType} usage`,
        subscriptionId: record.subscriptionId,
        periodStart: record.periodStart,
        periodEnd: record.periodEnd,
        metadata: record.metadata,
        timestamp: record.recordedAt,
        createdAt: record.recordedAt,
      });
    }
    
    console.log(`Migrated ${usageRecords.length} usage records`);
  },
});

export const migrateSocialMetrics = internalMutation({
  handler: async (ctx) => {
    // analytics.socialMetrics를 social.socialMetrics로 통합
    const analyticsMetrics = await ctx.db.query("socialMetrics")
      .filter(q => q.neq(q.field("engagementRate"), undefined))
      .collect();
    
    for (const metric of analyticsMetrics) {
      // social.socialMetrics에 없는 데이터만 추가
      const existing = await ctx.db.query("socialMetrics")
        .withIndex("byPostPlatform", q => 
          q.eq("postId", metric.postId).eq("platform", metric.platform)
        )
        .first();
        
      if (!existing) {
        await ctx.db.insert("socialMetrics", {
          postId: metric.postId,
          platform: metric.platform,
          accountId: metric.accountId,
          impressions: metric.metrics?.impressions,
          engagement: metric.metrics?.engagements,
          engagementRate: metric.engagementRate,
          viralityScore: metric.viralityScore,
          likes: metric.metrics?.likes,
          comments: metric.metrics?.comments,
          shares: metric.metrics?.shares,
          clicks: metric.metrics?.clicks,
          saves: metric.metrics?.saves,
          profileVisits: metric.metrics?.profileVisits,
          bestPerformingTime: metric.bestPerformingTime,
          audienceInsights: metric.audienceInsights,
          competitorComparison: metric.competitorComparison,
          fetchedAt: metric.recordedAt,
        });
      }
    }
  },
});
```

### Phase 2: 미사용 테이블 제거 (데이터 백업 후 시행)

#### 2.1 스키마 파일 제거/단순화
```bash
# 완전 제거할 파일들
rm convex/schema/monitoring.ts
rm convex/schema/pipeline.ts

# analytics.ts 단순화
# auth.ts에서 sessions, userActions, userActivitySummary 제거
# ai.ts에서 contentSources, contentItems 제거
```

#### 2.2 새로운 단순화된 스키마
```typescript
// convex/schema/auth.ts
export const users = defineTable({
  name: v.string(),
  externalId: v.string(),
  lemonSqueezyCustomerId: v.optional(v.string()),
  createdAt: v.string(),
}).index("byExternalId", ["externalId"]);

export const authSchema = {
  users,
  // sessions, userActions, userActivitySummary 제거됨
};

// convex/schema/analytics.ts (단순화)
export const userSessions = defineTable({
  sessionId: v.string(),
  userId: v.optional(v.id("users")),
  startedAt: v.string(),
  lastActivityAt: v.string(),
  pageCount: v.number(),
  duration: v.optional(v.number()),
})
  .index("bySessionId", ["sessionId"])
  .index("byUserId", ["userId"]);

export const basicMetrics = defineTable({
  userId: v.optional(v.id("users")),
  metricType: v.string(),
  metricName: v.string(),
  value: v.number(),
  dimensions: v.optional(v.object({
    page: v.optional(v.string()),
    action: v.optional(v.string()),
    source: v.optional(v.string()),
  })),
  timestamp: v.string(),
})
  .index("byUserId", ["userId"])
  .index("byMetricType", ["metricType"])
  .index("byTimestamp", ["timestamp"]);

export const analyticsSchema = {
  userSessions,
  basicMetrics,
  // pageViews, postAnalytics, socialMetrics 제거됨
};

// convex/schema/monitoring.ts (단순화)
export const errorLogs = defineTable({
  userId: v.optional(v.id("users")),
  level: v.string(),
  category: v.string(),
  message: v.string(),
  errorName: v.optional(v.string()),
  errorStack: v.optional(v.string()),
  pathname: v.optional(v.string()),
  endpoint: v.optional(v.string()),
  sessionId: v.optional(v.string()),
  metadata: v.optional(v.any()),
  timestamp: v.string(),
})
  .index("byLevel", ["level"])
  .index("byCategory", ["category"])
  .index("byTimestamp", ["timestamp"]);

export const systemHealth = defineTable({
  metric: v.string(),
  value: v.number(),
  status: v.string(),
  timestamp: v.string(),
})
  .index("byMetric", ["metric"])
  .index("byStatus", ["status"])
  .index("byTimestamp", ["timestamp"]);

export const monitoringSchema = {
  errorLogs,
  systemHealth,
  // 기존 8개 테이블 모두 제거됨
};
```

### Phase 3: 인덱스 최적화 (성능 테스트 후 적용)

#### 3.1 핵심 테이블 인덱스 최적화
```typescript
// convex/schema/social.ts
export const socialPosts = defineTable({
  userId: v.id("users"),
  personaId: v.id("personas"),
  originalContent: v.string(),
  finalContent: v.string(),
  platforms: v.array(v.string()),
  status: v.string(),
  hashtags: v.optional(v.array(v.string())),
  mediaUrls: v.optional(v.array(v.string())),
  threadCount: v.optional(v.number()),
  scheduledFor: v.optional(v.string()),
  publishedAt: v.optional(v.string()),
  metrics: v.optional(v.any()),
  errorMessage: v.optional(v.string()),
  creditsUsed: v.number(),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("byUserId", ["userId"])
  .index("byUserStatus", ["userId", "status"])  // 복합 인덱스
  .index("byPersonaId", ["personaId"])
  .index("byScheduled", ["scheduledFor"]);
  // byStatus 제거 (단독 사용 빈도 낮음)
```

#### 3.2 성능 모니터링 함수
```typescript
// convex/monitoring/performance.ts
import { internalQuery } from "../_generated/server";

export const analyzeQueryPerformance = internalQuery({
  handler: async (ctx) => {
    const start = Date.now();
    
    // 주요 쿼리 패턴들의 성능 측정
    const queries = [
      {
        name: "getUserPosts",
        query: () => ctx.db.query("socialPosts")
          .withIndex("byUserId", q => q.eq("userId", "example"))
          .collect(),
      },
      {
        name: "getActiveSubscriptions", 
        query: () => ctx.db.query("subscriptions")
          .withIndex("byUserStatus", q => 
            q.eq("userId", "example").eq("status", "active")
          )
          .collect(),
      },
      {
        name: "getUserUsage",
        query: () => ctx.db.query("usage")
          .withIndex("byUserResource", q => 
            q.eq("userId", "example").eq("resourceType", "ai_generation")
          )
          .collect(),
      },
    ];
    
    const results = [];
    for (const { name, query } of queries) {
      const queryStart = Date.now();
      await query();
      const queryTime = Date.now() - queryStart;
      results.push({ name, executionTime: queryTime });
    }
    
    return {
      totalTime: Date.now() - start,
      queryResults: results,
    };
  },
});
```

## 구현 체크리스트

### 준비 작업
- [ ] 현재 데이터 전체 백업
- [ ] 마이그레이션 스크립트 테스트
- [ ] 롤백 계획 수립
- [ ] 성능 기준선 측정

### Phase 1 구현
- [ ] socialMetrics 중복 해결
- [ ] usage 테이블 통합
- [ ] 마이그레이션 실행
- [ ] 데이터 무결성 검증

### Phase 2 구현  
- [ ] 미사용 테이블 식별 및 데이터 아카이브
- [ ] 스키마 파일 정리
- [ ] 관련 함수 코드 정리
- [ ] 빌드 및 테스트 통과 확인

### Phase 3 구현
- [ ] 인덱스 최적화 적용
- [ ] 성능 테스트 실행
- [ ] 쿼리 실행 계획 검토
- [ ] 프로덕션 배포

### 모니터링 및 검증
- [ ] 쿼리 응답 시간 모니터링
- [ ] 리소스 사용량 추적
- [ ] 오류 발생 모니터링
- [ ] 사용자 경험 영향 평가

## 예상 결과

### 정량적 개선
- **테이블 수**: 58개 → 35개 (40% 감소)
- **인덱스 수**: 약 150개 → 80개 (47% 감소)
- **쿼리 성능**: 평균 20-40% 향상
- **메모리 사용량**: 30-50% 감소

### 정성적 개선
- 스키마 구조 단순화로 개발 생산성 향상
- 유지보수 복잡도 감소
- 새로운 기능 개발 시 의사결정 속도 향상
- 코드베이스 이해도 향상