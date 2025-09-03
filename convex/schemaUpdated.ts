import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { paymentAttemptSchemaValidator } from "./paymentAttemptTypes";

// 📈 최적화된 스키마 - 기존 스키마에 성능 최적화 인덱스 추가
export default defineSchema({
    users: defineTable({
      name: v.string(),
      // this the Clerk ID, stored in the subject JWT field
      externalId: v.string(),
      // Lemon Squeezy customer ID
      lemonSqueezyCustomerId: v.optional(v.string()),
    }).index("byExternalId", ["externalId"])
      .index("byLemonSqueezyCustomerId", ["lemonSqueezyCustomerId"]),
    
    // Legacy payment attempts table (will be replaced with payments)
    paymentAttempts: defineTable(paymentAttemptSchemaValidator)
      .index("byPaymentId", ["payment_id"])
      .index("byUserId", ["userId"])
      .index("byPayerUserId", ["payer.user_id"]),
    
    // Lemon Squeezy subscriptions
    subscriptions: defineTable({
      userId: v.id("users"),
      lemonSqueezySubscriptionId: v.string(),
      lemonSqueezyCustomerId: v.string(),
      lemonSqueezyProductId: v.string(),
      lemonSqueezyVariantId: v.string(),
      lemonSqueezyOrderId: v.optional(v.string()),
      status: v.string(), // active, cancelled, expired, on_trial, paused, past_due, unpaid
      planName: v.string(),
      cardBrand: v.optional(v.string()),
      cardLastFour: v.optional(v.string()),
      intervalUnit: v.string(), // day, week, month, year
      intervalCount: v.number(),
      trialEndsAt: v.optional(v.string()),
      renewsAt: v.optional(v.string()),
      endsAt: v.optional(v.string()),
      price: v.number(), // 가격 (센트 단위)
      currency: v.string(),
      isUsageBased: v.boolean(),
      subscriptionItemId: v.optional(v.string()),
      // 사용량 기반 과금 관련 필드
      usageLimit: v.optional(v.number()), // 월간 사용 한도
      currentUsage: v.optional(v.number()), // 현재 사용량
      usageUnit: v.optional(v.string()), // 사용량 단위 (예: requests, storage, bandwidth)
      overage: v.optional(v.number()), // 초과 사용량
      overageRate: v.optional(v.number()), // 초과 사용량당 요금 (센트)
      resetDate: v.optional(v.string()), // 사용량 리셋 날짜
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("byUserId", ["userId"])
      .index("byLemonSqueezyId", ["lemonSqueezySubscriptionId"])
      .index("byCustomerId", ["lemonSqueezyCustomerId"])
      .index("byStatus", ["status"])
      // 📈 최적화 인덱스 추가
      .index("byUserIdAndStatus", ["userId", "status"]) // 사용자별 구독 상태 조회
      .index("activeSubscriptions", ["status", "renewsAt"]) // 활성 구독 관리
      .index("usageBilling", ["userId", "resetDate"]), // 사용량 기반 빌링
    
    // Lemon Squeezy checkout sessions
    checkouts: defineTable({
      userId: v.id("users"),
      lemonSqueezyCheckoutId: v.string(),
      lemonSqueezyProductId: v.string(),
      lemonSqueezyVariantId: v.string(),
      status: v.string(), // draft, pending, completed, expired
      checkoutUrl: v.string(),
      customData: v.optional(v.any()),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("byUserId", ["userId"])
      .index("byLemonSqueezyId", ["lemonSqueezyCheckoutId"])
      .index("byStatus", ["status"])
      // 📈 최적화 인덱스 추가
      .index("byUserIdAndStatus", ["userId", "status"]) // 사용자별 체크아웃 상태
      .index("pendingCheckouts", ["status", "createdAt"]), // 대기 중인 체크아웃 정리

    // Lemon Squeezy payments (orders)
    payments: defineTable({
      userId: v.optional(v.id("users")),
      lemonSqueezyOrderId: v.string(),
      lemonSqueezyCustomerId: v.string(),
      lemonSqueezyProductId: v.string(),
      lemonSqueezyVariantId: v.string(),
      lemonSqueezySubscriptionId: v.optional(v.string()),
      identifier: v.string(), // Order number
      orderNumber: v.number(),
      productName: v.string(),
      variantName: v.string(),
      userEmail: v.string(),
      userName: v.string(),
      status: v.string(), // pending, paid, refunded, partial_refund
      statusFormatted: v.string(),
      refunded: v.boolean(),
      refundedAt: v.optional(v.string()),
      subtotal: v.number(),
      discountTotal: v.number(),
      taxInclusiveTotal: v.number(),
      total: v.number(),
      subtotalUsd: v.number(),
      discountTotalUsd: v.number(),
      taxInclusiveUsdTotal: v.number(),
      totalUsd: v.number(),
      taxName: v.optional(v.string()),
      taxRate: v.optional(v.string()),
      currency: v.string(),
      currencyRate: v.string(),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("byUserId", ["userId"])
      .index("byLemonSqueezyOrderId", ["lemonSqueezyOrderId"])
      .index("byCustomerId", ["lemonSqueezyCustomerId"])
      .index("bySubscriptionId", ["lemonSqueezySubscriptionId"])
      .index("byStatus", ["status"])
      // 📈 최적화 인덱스 추가
      .index("byUserIdAndStatus", ["userId", "status"]) // 사용자별 결제 상태
      .index("revenueAnalysis", ["status", "createdAt", "total"]) // 매출 분석
      .index("refundTracking", ["refunded", "refundedAt"]), // 환불 추적

    // Lemon Squeezy licenses (if using license keys)
    licenses: defineTable({
      userId: v.optional(v.id("users")),
      lemonSqueezyLicenseId: v.string(),
      lemonSqueezyOrderId: v.string(),
      lemonSqueezyProductId: v.string(),
      lemonSqueezyCustomerId: v.string(),
      identifier: v.string(),
      licenseKey: v.string(),
      activationLimit: v.number(),
      instancesCount: v.number(),
      disabled: v.boolean(),
      status: v.string(), // inactive, active, expired, disabled
      statusFormatted: v.string(),
      expiresAt: v.optional(v.string()),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("byUserId", ["userId"])
      .index("byLemonSqueezyId", ["lemonSqueezyLicenseId"])
      .index("byOrderId", ["lemonSqueezyOrderId"])
      .index("byLicenseKey", ["licenseKey"])
      .index("byStatus", ["status"])
      // 📈 최적화 인덱스 추가
      .index("activeLicenses", ["status", "expiresAt"]) // 활성 라이선스 관리
      .index("expiringLicenses", ["expiresAt", "status"]), // 만료 예정 라이선스

    // 사용량 추적 테이블
    usageRecords: defineTable({
      userId: v.id("users"),
      subscriptionId: v.optional(v.id("subscriptions")),
      resourceType: v.string(), // API 요청, 스토리지, 대역폭 등
      amount: v.number(), // 사용량
      unit: v.string(), // 단위 (requests, MB, GB 등)
      description: v.optional(v.string()),
      metadata: v.optional(v.any()), // 추가 정보
      recordedAt: v.string(),
      periodStart: v.string(), // 청구 주기 시작일
      periodEnd: v.string(), // 청구 주기 종료일
    })
      .index("byUserId", ["userId"])
      .index("bySubscriptionId", ["subscriptionId"])
      .index("byResourceType", ["resourceType"])
      .index("byPeriod", ["periodStart", "periodEnd"])
      .index("byRecordedAt", ["recordedAt"])
      // 📈 빌링 최적화 인덱스
      .index("billingPeriod", ["userId", "periodStart", "periodEnd"]) // 사용자별 청구 기간
      .index("resourceUsage", ["userId", "resourceType", "recordedAt"]) // 리소스별 사용량 추적
      .index("subscriptionUsage", ["subscriptionId", "resourceType", "recordedAt"]) // 구독별 사용량
      .index("periodAnalysis", ["resourceType", "periodStart", "amount"]), // 리소스별 기간 분석

    // 크레딧 관리 테이블
    credits: defineTable({
      userId: v.id("users"),
      amount: v.number(), // 크레딧 양 (양수는 적립, 음수는 사용)
      type: v.string(), // earned, purchased, used, refunded, expired
      description: v.string(),
      expiresAt: v.optional(v.string()),
      relatedOrderId: v.optional(v.string()), // 관련 주문 ID
      relatedCouponId: v.optional(v.id("coupons")),
      metadata: v.optional(v.any()),
      createdAt: v.string(),
    })
      .index("byUserId", ["userId"])
      .index("byType", ["type"])
      .index("byExpiresAt", ["expiresAt"])
      .index("byCreatedAt", ["createdAt"])
      // 📈 크레딧 관리 최적화
      .index("userCreditsActive", ["userId", "expiresAt"]) // 사용자별 활성 크레딧
      .index("creditsByType", ["userId", "type", "createdAt"]) // 크레딧 유형별 조회
      .index("expiringCredits", ["expiresAt", "type"]), // 만료 예정 크레딧

    // 쿠폰 관리 테이블
    coupons: defineTable({
      code: v.string(), // 쿠폰 코드
      name: v.string(),
      description: v.optional(v.string()),
      type: v.string(), // percentage, fixed_amount, credits
      value: v.number(), // 할인 금액 또는 크레딧 양
      currency: v.optional(v.string()),
      minAmount: v.optional(v.number()), // 최소 주문 금액
      maxDiscount: v.optional(v.number()), // 최대 할인 금액
      usageLimit: v.optional(v.number()), // 전체 사용 횟수 제한
      usageCount: v.number(), // 현재 사용 횟수
      userLimit: v.optional(v.number()), // 사용자당 사용 횟수 제한
      validFrom: v.string(),
      validUntil: v.optional(v.string()),
      isActive: v.boolean(),
      metadata: v.optional(v.any()),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("byCode", ["code"])
      .index("byIsActive", ["isActive"])
      .index("byValidFrom", ["validFrom"])
      .index("byValidUntil", ["validUntil"])
      // 📈 쿠폰 최적화
      .index("activeCoupons", ["isActive", "validFrom", "validUntil"]) // 활성 쿠폰 조회
      .index("couponUsage", ["usageCount", "usageLimit"]), // 쿠폰 사용량 추적

    // 쿠폰 사용 내역 테이블
    couponUsages: defineTable({
      userId: v.id("users"),
      couponId: v.id("coupons"),
      orderId: v.optional(v.string()),
      subscriptionId: v.optional(v.id("subscriptions")),
      discountAmount: v.number(),
      currency: v.optional(v.string()),
      usedAt: v.string(),
    })
      .index("byUserId", ["userId"])
      .index("byCouponId", ["couponId"])
      .index("byOrderId", ["orderId"])
      .index("byUsedAt", ["usedAt"])
      // 📈 쿠폰 사용 분석 최적화
      .index("userCouponHistory", ["userId", "usedAt"]) // 사용자별 쿠폰 이력
      .index("couponAnalytics", ["couponId", "usedAt"]), // 쿠폰별 사용 분석

    // 사용자 크레딧 잔액 (집계 테이블)
    userCreditBalances: defineTable({
      userId: v.id("users"),
      totalCredits: v.number(), // 전체 크레딧 잔액
      availableCredits: v.number(), // 사용 가능한 크레딧 (만료되지 않은)
      usedCredits: v.number(), // 사용된 크레딧
      expiredCredits: v.number(), // 만료된 크레딧
      lastUpdated: v.string(),
    })
      .index("byUserId", ["userId"])
      // 📈 크레딧 잔액 관리 최적화
      .index("creditBalanceUpdated", ["lastUpdated"]), // 잔액 업데이트 추적

    // === 소셜 미디어 자동화 테이블들 ===
    
    // 페르소나 관리
    personas: defineTable({
      userId: v.id("users"),
      name: v.string(),
      role: v.string(), // "SaaS 창업자", "마케터", "개발자" 등
      tone: v.string(), // "전문적", "친근한", "유머러스" 등
      interests: v.array(v.string()),
      expertise: v.array(v.string()),
      avatar: v.optional(v.string()),
      description: v.optional(v.string()),
      isActive: v.boolean(),
      settings: v.optional(v.any()), // 페르소나 관련 추가 설정
      promptTemplates: v.optional(v.object({
        system: v.string(),
        content: v.string(),
        tone: v.string(),
      })),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("byUserId", ["userId"])
      .index("byIsActive", ["isActive"])
      .index("byCreatedAt", ["createdAt"])
      // 📈 페르소나 최적화
      .index("userActivePersonas", ["userId", "isActive"]) // 사용자별 활성 페르소나
      .index("personasByRole", ["userId", "role"]), // 역할별 페르소나

    // 소셜 계정 관리
    socialAccounts: defineTable({
      userId: v.id("users"),
      platform: v.string(), // "twitter", "threads", "linkedin" 등
      accountId: v.string(),
      username: v.string(),
      displayName: v.string(),
      profileImage: v.optional(v.string()),
      // 보안상 민감한 토큰들 - 실제로는 암호화해서 저장
      accessToken: v.string(),
      refreshToken: v.optional(v.string()),
      tokenExpiresAt: v.optional(v.string()),
      // 계정 메타데이터
      followers: v.optional(v.number()),
      following: v.optional(v.number()),
      postsCount: v.optional(v.number()),
      verificationStatus: v.optional(v.string()),
      isActive: v.boolean(),
      lastSyncedAt: v.string(),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("byUserId", ["userId"])
      .index("byPlatform", ["platform"])
      .index("byIsActive", ["isActive"])
      .index("byAccountId", ["accountId"])
      // 📈 소셜 계정 최적화
      .index("userActivePlatforms", ["userId", "isActive", "platform"]) // 사용자별 활성 플랫폼
      .index("tokenExpiration", ["tokenExpiresAt", "isActive"]) // 토큰 만료 관리
      .index("platformAccounts", ["platform", "isActive"]), // 플랫폼별 계정 관리

    // 소셜 게시물 관리
    socialPosts: defineTable({
      userId: v.id("users"),
      personaId: v.id("personas"),
      originalContent: v.string(), // 사용자가 입력한 원본 내용
      finalContent: v.string(), // 최종 선택된 콘텐츠
      platforms: v.array(v.string()), // ["twitter", "threads"] 등
      status: v.string(), // "draft", "scheduled", "published", "failed"
      scheduledFor: v.optional(v.string()),
      publishedAt: v.optional(v.string()),
      // 메트릭스 데이터
      metrics: v.optional(v.object({
        twitter: v.optional(v.object({
          views: v.number(),
          likes: v.number(),
          retweets: v.number(),
          replies: v.number(),
          quotes: v.number(),
        })),
        threads: v.optional(v.object({
          views: v.number(),
          likes: v.number(),
          reposts: v.number(),
          replies: v.number(),
        })),
        lastUpdatedAt: v.string(),
      })),
      hashtags: v.array(v.string()),
      mediaUrls: v.optional(v.array(v.string())),
      threadCount: v.optional(v.number()), // 스레드 게시물 개수
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
      // 📈 최적화된 복합 인덱스들 - 핵심 성능 개선!
      .index("byUserIdAndStatus", ["userId", "status"]) // 사용자별 상태 조회 (가장 중요)
      .index("byUserIdAndPersonaId", ["userId", "personaId"]) // 사용자별 페르소나 조회
      .index("byUserIdAndCreatedAt", ["userId", "createdAt"]) // 사용자별 시간순 조회
      .index("byStatusAndScheduledFor", ["status", "scheduledFor"]) // 스케줄링용
      .index("byUserIdStatusAndCreatedAt", ["userId", "status", "createdAt"]) // 복합 필터링
      // 📈 특수 쿼리를 위한 인덱스
      .index("byUserIdAndPlatforms", ["userId", "platforms"]) // 플랫폼별 필터링
      .index("byPersonaIdAndStatus", ["personaId", "status"]) // 페르소나별 상태
      .index("byPublishedAt", ["publishedAt"]) // 발행일 기준 정렬
      .index("byCreditsUsed", ["creditsUsed"]) // 크레딧 사용량 분석
      .index("publishedPosts", ["status", "publishedAt"]) // 발행된 게시물 분석
      .index("scheduledPostsQueue", ["status", "scheduledFor"]), // 스케줄 큐 관리

    // AI 생성 변형 게시물
    postVariants: defineTable({
      postId: v.id("socialPosts"),
      content: v.string(),
      // 점수 시스템
      overallScore: v.number(), // 0-100 전체 점수
      scoreBreakdown: v.object({
        engagement: v.number(), // 참여도 예측 점수
        virality: v.number(), // 바이럴 가능성 점수
        personaMatch: v.number(), // 페르소나 일치도 점수
        readability: v.number(), // 가독성 점수
        trending: v.number(), // 트렌드 적합도 점수
      }),
      isSelected: v.boolean(),
      // AI 메타데이터
      aiModel: v.string(), // "gemini-1.5-pro" 등
      promptUsed: v.string(),
      generationMetadata: v.optional(v.any()),
      creditsUsed: v.number(),
      generatedAt: v.string(),
    })
      .index("byPostId", ["postId"])
      .index("byIsSelected", ["isSelected"])
      .index("byOverallScore", ["overallScore"])
      .index("byGeneratedAt", ["generatedAt"])
      // 📈 변형 분석 최적화
      .index("bestVariants", ["postId", "overallScore"]) // 최고 점수 변형
      .index("selectedVariants", ["isSelected", "postId"]) // 선택된 변형들
      .index("scoreAnalysis", ["overallScore", "generatedAt"]), // 점수 분석

    // 스케줄링된 게시물
    scheduledPosts: defineTable({
      postId: v.id("socialPosts"),
      variantId: v.optional(v.id("postVariants")),
      platform: v.string(), // "twitter", "threads"
      socialAccountId: v.id("socialAccounts"),
      scheduledFor: v.string(),
      status: v.string(), // "pending", "processing", "published", "failed", "cancelled"
      publishedAt: v.optional(v.string()),
      publishedPostId: v.optional(v.string()), // 플랫폼에서 반환된 게시물 ID
      error: v.optional(v.string()),
      retryCount: v.number(),
      maxRetries: v.number(),
      nextRetryAt: v.optional(v.string()),
      publishMetadata: v.optional(v.any()), // 플랫폼별 발행 메타데이터
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
      // 📈 스케줄링 최적화 복합 인덱스 - 핵심 성능 개선!
      .index("byStatusAndScheduledFor", ["status", "scheduledFor"]) // 실행 대기 큐 (매우 중요)
      .index("byPlatformAndStatus", ["platform", "status"]) // 플랫폼별 상태
      .index("byAccountIdAndStatus", ["socialAccountId", "status"]) // 계정별 상태
      .index("byStatusAndNextRetryAt", ["status", "nextRetryAt"]) // 재시도 큐
      .index("byPlatformAndScheduledFor", ["platform", "scheduledFor"]) // 플랫폼별 스케줄
      // 📈 Cron 작업 최적화를 위한 특수 인덱스
      .index("pendingSchedules", ["status", "scheduledFor"]) // 대기 중인 스케줄 (Cron용)
      .index("failedRetries", ["status", "nextRetryAt"]) // 재시도 대상 (Cron용)
      .index("accountActivity", ["socialAccountId", "publishedAt"]) // 계정별 활동 분석
      .index("platformPerformance", ["platform", "status", "publishedAt"]), // 플랫폼별 성과

    // AI 생성 이력
    aiGenerations: defineTable({
      userId: v.id("users"),
      postId: v.optional(v.id("socialPosts")), // 관련 게시물 (없을 수도 있음)
      personaId: v.optional(v.id("personas")),
      type: v.string(), // "content_generation", "variant_creation", "optimization", "analysis"
      prompt: v.string(),
      response: v.string(),
      model: v.string(),
      creditsUsed: v.number(),
      generationTime: v.number(), // 밀리초 단위
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
      // 📈 AI 분석 최적화 복합 인덱스
      .index("byUserIdAndType", ["userId", "type"]) // 사용자별 생성 타입
      .index("byUserIdAndSuccess", ["userId", "success"]) // 사용자별 성공률 분석
      .index("byUserIdAndCreatedAt", ["userId", "createdAt"]) // 사용자별 생성 이력
      .index("byTypeAndSuccess", ["type", "success"]) // 타입별 성공률
      .index("byModelAndSuccess", ["model", "success"]) // 모델별 성공률
      .index("byPersonaIdAndSuccess", ["personaId", "success"]) // 페르소나별 성공률
      // 📈 성능 분석을 위한 특수 인덱스
      .index("byCreditsAndTime", ["creditsUsed", "generationTime"]) // 비용/시간 분석
      .index("bySuccessAndCreatedAt", ["success", "createdAt"]) // 시간별 성공률
      .index("performanceAnalysis", ["model", "temperature", "generationTime"]) // 모델 성능 분석
      .index("userGenerationTrends", ["userId", "type", "createdAt"]), // 사용자별 생성 트렌드

    // 콘텐츠 소스 (향후 자동화용)
    contentSources: defineTable({
      userId: v.id("users"),
      name: v.string(),
      type: v.string(), // "rss", "twitter_user", "website", "keyword"
      url: v.optional(v.string()),
      keywords: v.optional(v.array(v.string())),
      settings: v.optional(v.any()), // 소스별 설정
      isActive: v.boolean(),
      lastFetchedAt: v.optional(v.string()),
      nextFetchAt: v.optional(v.string()),
      fetchInterval: v.number(), // 시간 단위 (시간)
      personaId: v.optional(v.id("personas")), // 연결된 페르소나
      autoGenerate: v.boolean(), // 자동 콘텐츠 생성 여부
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("byUserId", ["userId"])
      .index("byType", ["type"])
      .index("byIsActive", ["isActive"])
      .index("byNextFetchAt", ["nextFetchAt"])
      .index("byPersonaId", ["personaId"])
      // 📈 콘텐츠 소스 최적화
      .index("activeSourcesByUser", ["userId", "isActive"]) // 사용자별 활성 소스
      .index("fetchSchedule", ["isActive", "nextFetchAt"]) // 페치 스케줄
      .index("autoGenerationSources", ["autoGenerate", "isActive"]), // 자동 생성 소스

    // 수집된 콘텐츠 아이템
    contentItems: defineTable({
      sourceId: v.id("contentSources"),
      userId: v.id("users"),
      title: v.string(),
      content: v.string(),
      url: v.optional(v.string()),
      author: v.optional(v.string()),
      publishedAt: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      status: v.string(), // "new", "processed", "used", "archived"
      relevanceScore: v.optional(v.number()), // AI가 평가한 관련성 점수
      generatedPostId: v.optional(v.id("socialPosts")), // 이 아이템으로 생성된 게시물
      metadata: v.optional(v.any()),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("bySourceId", ["sourceId"])
      .index("byUserId", ["userId"])
      .index("byStatus", ["status"])
      .index("byRelevanceScore", ["relevanceScore"])
      .index("byCreatedAt", ["createdAt"])
      // 📈 콘텐츠 아이템 최적화
      .index("userContentByStatus", ["userId", "status"]) // 사용자별 콘텐츠 상태
      .index("qualityContent", ["relevanceScore", "status"]) // 고품질 콘텐츠
      .index("sourceContentByStatus", ["sourceId", "status"]), // 소스별 콘텐츠 상태

    // 분석 및 인사이트
    postAnalytics: defineTable({
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
      viralityScore: v.number(), // 바이럴 점수 계산
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
      // 📈 성능 분석 최적화 복합 인덱스
      .index("byUserIdAndPlatform", ["userId", "platform"]) // 사용자별 플랫폼 분석
      .index("byUserIdAndRecordedAt", ["userId", "recordedAt"]) // 사용자별 시계열 분석
      .index("byPlatformAndEngagementRate", ["platform", "engagementRate"]) // 플랫폼별 성과
      .index("byViralityScore", ["viralityScore"]) // 바이럴 콘텐츠 분석
      .index("topPerforming", ["userId", "engagementRate"]) // 최고 성과 게시물
      .index("platformPerformance", ["platform", "viralityScore", "recordedAt"]) // 플랫폼별 성과 트렌드
      .index("engagementTrends", ["userId", "recordedAt", "engagementRate"]), // 참여도 트렌드

    // 📈 성능 프로필 테이블 (모니터링용) - 새로 추가
    performanceProfiles: defineTable({
      queryName: v.string(),
      executionTime: v.number(), // milliseconds
      memoryUsed: v.number(), // bytes
      resultSize: v.number(), // bytes
      timestamp: v.string(),
      success: v.boolean(),
      error: v.optional(v.string()),
      userId: v.optional(v.id("users")), // 쿼리 실행한 사용자 (있는 경우)
      metadata: v.optional(v.any()), // 추가 성능 메타데이터
    })
      .index("byQueryName", ["queryName"])
      .index("byExecutionTime", ["executionTime"])
      .index("byTimestamp", ["timestamp"])
      .index("bySuccess", ["success"])
      // 📈 성능 분석 인덱스
      .index("performanceAnalysis", ["queryName", "timestamp"]) // 쿼리별 성능 분석
      .index("slowQueries", ["executionTime", "timestamp"]) // 느린 쿼리 추적
      .index("errorTracking", ["success", "queryName", "timestamp"]), // 오류 추적

    // 📈 집계 테이블 (성능 최적화용) - 새로 추가
    aggregatedMetrics: defineTable({
      userId: v.id("users"),
      metricType: v.string(), // "daily", "weekly", "monthly"
      timeframe: v.string(), // "2024-01-15", "2024-W03", "2024-01" 등
      data: v.any(), // 집계된 메트릭 데이터
      calculatedAt: v.string(),
    })
      .index("byUserId", ["userId"])
      .index("byMetricType", ["metricType"])
      .index("byTimeframe", ["timeframe"])
      // 📈 집계 데이터 최적화
      .index("userMetricsByType", ["userId", "metricType", "timeframe"]) // 사용자별 메트릭
      .index("recentAggregations", ["calculatedAt"]), // 최신 집계 데이터

    // 📈 캐시 테이블 (성능 최적화용) - 새로 추가
    cachedQueries: defineTable({
      cacheKey: v.string(), // 캐시 키 (쿼리 + 파라미터 해시)
      queryName: v.string(),
      queryArgs: v.any(),
      result: v.any(),
      expiresAt: v.string(),
      hitCount: v.number(),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("byCacheKey", ["cacheKey"])
      .index("byExpiresAt", ["expiresAt"])
      .index("byQueryName", ["queryName"])
      // 📈 캐시 관리 인덱스
      .index("expiredCache", ["expiresAt"]) // 만료된 캐시 정리
      .index("popularQueries", ["hitCount", "queryName"]), // 인기 쿼리 추적
  });