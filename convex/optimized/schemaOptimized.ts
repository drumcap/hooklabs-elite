import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// 📈 최적화된 스키마 - 복합 인덱스 및 성능 최적화
export const optimizedSchemaAdditions = defineSchema({
  // 기존 스키마는 유지하고, 최적화된 인덱스들만 추가
  
  // 📈 소셜 게시물 테이블 - 복합 인덱스 추가
  socialPostsOptimized: defineTable({
    userId: v.id("users"),
    personaId: v.id("personas"),
    originalContent: v.string(),
    finalContent: v.string(),
    platforms: v.array(v.string()),
    status: v.string(),
    scheduledFor: v.optional(v.string()),
    publishedAt: v.optional(v.string()),
    metrics: v.optional(v.any()),
    hashtags: v.array(v.string()),
    mediaUrls: v.optional(v.array(v.string())),
    threadCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    creditsUsed: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    // 🔥 기본 인덱스들
    .index("byUserId", ["userId"])
    .index("byPersonaId", ["personaId"])
    .index("byStatus", ["status"])
    .index("byScheduledFor", ["scheduledFor"])
    .index("byCreatedAt", ["createdAt"])
    
    // 📈 복합 인덱스들 (쿼리 성능 대폭 개선)
    .index("byUserIdAndStatus", ["userId", "status"])
    .index("byUserIdAndPersonaId", ["userId", "personaId"])
    .index("byUserIdAndCreatedAt", ["userId", "createdAt"])
    .index("byStatusAndScheduledFor", ["status", "scheduledFor"])
    .index("byUserIdStatusAndCreatedAt", ["userId", "status", "createdAt"])
    
    // 📈 특수 쿼리를 위한 인덱스
    .index("byUserIdAndPlatforms", ["userId", "platforms"]) // 플랫폼별 필터링
    .index("byPersonaIdAndStatus", ["personaId", "status"])
    .index("byPublishedAt", ["publishedAt"]) // 발행일 기준 정렬
    .index("byCreditsUsed", ["creditsUsed"]), // 크레딧 사용량 분석

  // 📈 스케줄된 게시물 테이블 - 복합 인덱스 최적화
  scheduledPostsOptimized: defineTable({
    postId: v.id("socialPosts"),
    variantId: v.optional(v.id("postVariants")),
    platform: v.string(),
    socialAccountId: v.id("socialAccounts"),
    scheduledFor: v.string(),
    status: v.string(),
    publishedAt: v.optional(v.string()),
    publishedPostId: v.optional(v.string()),
    error: v.optional(v.string()),
    retryCount: v.number(),
    maxRetries: v.number(),
    nextRetryAt: v.optional(v.string()),
    publishMetadata: v.optional(v.any()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    // 🔥 기본 인덱스들
    .index("byPostId", ["postId"])
    .index("byPlatform", ["platform"])
    .index("byStatus", ["status"])
    .index("byScheduledFor", ["scheduledFor"])
    .index("bySocialAccountId", ["socialAccountId"])
    .index("byNextRetryAt", ["nextRetryAt"])
    
    // 📈 복합 인덱스들 (쿼리 최적화)
    .index("byStatusAndScheduledFor", ["status", "scheduledFor"])
    .index("byPlatformAndStatus", ["platform", "status"])
    .index("byAccountIdAndStatus", ["socialAccountId", "status"])
    .index("byStatusAndNextRetryAt", ["status", "nextRetryAt"])
    .index("byPlatformAndScheduledFor", ["platform", "scheduledFor"])
    
    // 📈 Cron 작업 최적화를 위한 인덱스
    .index("pendingSchedules", ["status", "scheduledFor"]) // status="pending" AND scheduledFor <= now
    .index("failedRetries", ["status", "nextRetryAt"]) // 재시도 대상
    .index("accountActivity", ["socialAccountId", "publishedAt"]), // 계정별 활동 분석

  // 📈 AI 생성 이력 테이블 - 분석 쿼리 최적화
  aiGenerationsOptimized: defineTable({
    userId: v.id("users"),
    postId: v.optional(v.id("socialPosts")),
    personaId: v.optional(v.id("personas")),
    type: v.string(),
    prompt: v.string(),
    response: v.string(),
    model: v.string(),
    creditsUsed: v.number(),
    generationTime: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
    metadata: v.optional(v.any()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    createdAt: v.string(),
  })
    // 🔥 기본 인덱스들
    .index("byUserId", ["userId"])
    .index("byPostId", ["postId"])
    .index("byPersonaId", ["personaId"])
    .index("byType", ["type"])
    .index("bySuccess", ["success"])
    .index("byCreatedAt", ["createdAt"])
    
    // 📈 분석 쿼리 최적화를 위한 복합 인덱스
    .index("byUserIdAndType", ["userId", "type"])
    .index("byUserIdAndSuccess", ["userId", "success"])
    .index("byUserIdAndCreatedAt", ["userId", "createdAt"])
    .index("byTypeAndSuccess", ["type", "success"])
    .index("byModelAndSuccess", ["model", "success"])
    .index("byPersonaIdAndSuccess", ["personaId", "success"])
    
    // 📈 성능 분석을 위한 특수 인덱스
    .index("byCreditsAndTime", ["creditsUsed", "generationTime"]) // 비용/시간 분석
    .index("bySuccessAndCreatedAt", ["success", "createdAt"]) // 시간별 성공률
    .index("performanceAnalysis", ["model", "temperature", "generationTime"]), // 모델별 성능

  // 📈 게시물 분석 테이블 - 메트릭 분석 최적화  
  postAnalyticsOptimized: defineTable({
    postId: v.id("socialPosts"),
    userId: v.id("users"),
    platform: v.string(),
    metrics: v.object({
      impressions: v.number(),
      engagements: v.number(),
      likes: v.number(),
      shares: v.number(),
      comments: v.number(),
      clicks: v.number(),
      saves: v.optional(v.number()),
      profileVisits: v.optional(v.number()),
    }),
    engagementRate: v.number(),
    viralityScore: v.number(),
    bestPerformingTime: v.optional(v.string()),
    audienceInsights: v.optional(v.any()),
    competitorComparison: v.optional(v.any()),
    recordedAt: v.string(),
    createdAt: v.string(),
  })
    // 🔥 기본 인덱스들
    .index("byPostId", ["postId"])
    .index("byUserId", ["userId"])
    .index("byPlatform", ["platform"])
    .index("byEngagementRate", ["engagementRate"])
    .index("byRecordedAt", ["recordedAt"])
    
    // 📈 성능 분석을 위한 복합 인덱스
    .index("byUserIdAndPlatform", ["userId", "platform"])
    .index("byUserIdAndRecordedAt", ["userId", "recordedAt"])
    .index("byPlatformAndEngagementRate", ["platform", "engagementRate"])
    .index("byViralityScore", ["viralityScore"])
    .index("topPerforming", ["userId", "engagementRate"]) // 최고 성과 게시물
    .index("platformPerformance", ["platform", "viralityScore", "recordedAt"]), // 플랫폼별 성과 트렌드

  // 📈 사용량 기록 테이블 - 빌링 최적화
  usageRecordsOptimized: defineTable({
    userId: v.id("users"),
    subscriptionId: v.optional(v.id("subscriptions")),
    resourceType: v.string(),
    amount: v.number(),
    unit: v.string(),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
    recordedAt: v.string(),
    periodStart: v.string(),
    periodEnd: v.string(),
  })
    // 🔥 기본 인덱스들
    .index("byUserId", ["userId"])
    .index("bySubscriptionId", ["subscriptionId"])
    .index("byResourceType", ["resourceType"])
    .index("byPeriod", ["periodStart", "periodEnd"])
    .index("byRecordedAt", ["recordedAt"])
    
    // 📈 빌링 쿼리 최적화를 위한 복합 인덱스
    .index("billingPeriod", ["userId", "periodStart", "periodEnd"])
    .index("resourceUsage", ["userId", "resourceType", "recordedAt"])
    .index("subscriptionUsage", ["subscriptionId", "resourceType", "recordedAt"])
    .index("periodAnalysis", ["resourceType", "periodStart", "amount"]) // 리소스별 기간 분석
});

// 📈 마이그레이션을 위한 인덱스 생성 가이드
export const indexMigrationGuide = {
  // 1단계: 가장 중요한 성능 개선 인덱스들
  phase1: [
    "socialPosts.byUserIdAndStatus",
    "scheduledPosts.byStatusAndScheduledFor", 
    "aiGenerations.byUserIdAndSuccess",
  ],
  
  // 2단계: 분석 쿼리 최적화 인덱스들
  phase2: [
    "socialPosts.byUserIdStatusAndCreatedAt",
    "postAnalytics.byUserIdAndPlatform",
    "usageRecords.billingPeriod",
  ],
  
  // 3단계: 고급 분석을 위한 인덱스들
  phase3: [
    "aiGenerations.performanceAnalysis",
    "postAnalytics.platformPerformance",
    "scheduledPosts.accountActivity",
  ],
};

// 📈 쿼리 최적화 예시들
export const optimizedQueryExamples = {
  // 사용자의 특정 상태 게시물들 (기존: 2개 쿼리 → 최적화: 1개 쿼리)
  userPostsByStatus: `
    // Before: O(n) 필터링
    const posts = await ctx.db.query("socialPosts")
      .withIndex("byUserId", q => q.eq("userId", userId))
      .filter(q => q.eq(q.field("status"), "published"))
      .collect();
      
    // After: O(log n) 인덱스 활용
    const posts = await ctx.db.query("socialPosts") 
      .withIndex("byUserIdAndStatus", q => 
        q.eq("userId", userId).eq("status", "published")
      )
      .collect();
  `,
  
  // 예약 시간이 된 pending 스케줄들 조회
  dueSchedules: `
    // Before: 전체 스캔 후 필터링
    const schedules = await ctx.db.query("scheduledPosts")
      .filter(q => 
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lte(q.field("scheduledFor"), now)
        )
      )
      .collect();
      
    // After: 복합 인덱스로 직접 조회
    const schedules = await ctx.db.query("scheduledPosts")
      .withIndex("byStatusAndScheduledFor", q =>
        q.eq("status", "pending").lte("scheduledFor", now)
      )
      .collect();
  `,
  
  // 사용자별 AI 생성 성공/실패 통계
  userAiStats: `
    // Before: 모든 생성 이력 로드 후 필터링
    const generations = await ctx.db.query("aiGenerations")
      .withIndex("byUserId", q => q.eq("userId", userId))
      .collect();
    const successful = generations.filter(g => g.success);
    
    // After: 인덱스를 활용한 분리 쿼리
    const [successful, failed] = await Promise.all([
      ctx.db.query("aiGenerations")
        .withIndex("byUserIdAndSuccess", q =>
          q.eq("userId", userId).eq("success", true)
        )
        .collect(),
      ctx.db.query("aiGenerations")  
        .withIndex("byUserIdAndSuccess", q =>
          q.eq("userId", userId).eq("success", false)
        )
        .collect()
    ]);
  `
};