import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { paymentAttemptSchemaValidator } from "./paymentAttemptTypes";

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
      .index("byStatus", ["status"]),
    
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
      .index("byStatus", ["status"]),
    
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
      .index("byStatus", ["status"]),
    
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
      .index("byStatus", ["status"]),
    
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
      .index("byRecordedAt", ["recordedAt"]),

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
      .index("byCreatedAt", ["createdAt"]),

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
      .index("byValidUntil", ["validUntil"]),

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
      .index("byUsedAt", ["usedAt"]),

    // 사용자 크레딧 잔액 (집계 테이블)
    userCreditBalances: defineTable({
      userId: v.id("users"),
      totalCredits: v.number(), // 전체 크레딧 잔액
      availableCredits: v.number(), // 사용 가능한 크레딧 (만료되지 않은)
      usedCredits: v.number(), // 사용된 크레딧
      expiredCredits: v.number(), // 만료된 크레딧
      lastUpdated: v.string(),
    })
      .index("byUserId", ["userId"]),

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
      .index("byCreatedAt", ["createdAt"]),

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
      .index("byAccountId", ["accountId"]),

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
      .index("byUserId", ["userId"])
      .index("byPersonaId", ["personaId"])
      .index("byStatus", ["status"])
      .index("byScheduledFor", ["scheduledFor"])
      .index("byCreatedAt", ["createdAt"]),

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
      .index("byGeneratedAt", ["generatedAt"]),

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
      .index("byPostId", ["postId"])
      .index("byPlatform", ["platform"])
      .index("byStatus", ["status"])
      .index("byScheduledFor", ["scheduledFor"])
      .index("bySocialAccountId", ["socialAccountId"])
      .index("byNextRetryAt", ["nextRetryAt"]),

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
      .index("byUserId", ["userId"])
      .index("byPostId", ["postId"])
      .index("byPersonaId", ["personaId"])
      .index("byType", ["type"])
      .index("bySuccess", ["success"])
      .index("byCreatedAt", ["createdAt"]),

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
      .index("byPersonaId", ["personaId"]),

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
      .index("byCreatedAt", ["createdAt"]),

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
      .index("byPostId", ["postId"])
      .index("byUserId", ["userId"])
      .index("byPlatform", ["platform"])
      .index("byEngagementRate", ["engagementRate"])
      .index("byRecordedAt", ["recordedAt"]),

    // === 성능 모니터링 테이블들 ===
    
    // Web Vitals 메트릭
    webVitals: defineTable({
      userId: v.optional(v.id("users")),
      sessionId: v.string(),
      pathname: v.string(),
      // Core Web Vitals
      lcp: v.optional(v.number()), // Largest Contentful Paint
      fid: v.optional(v.number()), // First Input Delay
      cls: v.optional(v.number()), // Cumulative Layout Shift
      fcp: v.optional(v.number()), // First Contentful Paint
      ttfb: v.optional(v.number()), // Time to First Byte
      inp: v.optional(v.number()), // Interaction to Next Paint
      // 추가 메트릭
      navigationTiming: v.optional(v.object({
        domContentLoaded: v.number(),
        loadComplete: v.number(),
        domInteractive: v.number(),
        redirectTime: v.number(),
        dnsTime: v.number(),
        connectionTime: v.number(),
        requestTime: v.number(),
        responseTime: v.number(),
      })),
      // 디바이스 정보
      deviceType: v.string(), // mobile, tablet, desktop
      browser: v.string(),
      browserVersion: v.string(),
      os: v.string(),
      connectionType: v.optional(v.string()), // 4g, 3g, wifi 등
      viewport: v.object({
        width: v.number(),
        height: v.number(),
      }),
      // 메타데이터
      url: v.string(),
      referrer: v.optional(v.string()),
      userAgent: v.string(),
      timestamp: v.string(),
    })
      .index("byUserId", ["userId"])
      .index("bySessionId", ["sessionId"])
      .index("byPathname", ["pathname"])
      .index("byTimestamp", ["timestamp"])
      .index("byDeviceType", ["deviceType"]),

    // API 성능 메트릭
    apiMetrics: defineTable({
      userId: v.optional(v.id("users")),
      endpoint: v.string(),
      method: v.string(), // GET, POST, PUT, DELETE 등
      // 성능 지표
      responseTime: v.number(), // 밀리초
      statusCode: v.number(),
      success: v.boolean(),
      // 상세 타이밍
      timing: v.optional(v.object({
        dns: v.optional(v.number()),
        connection: v.optional(v.number()),
        tls: v.optional(v.number()),
        firstByte: v.optional(v.number()),
        download: v.optional(v.number()),
        total: v.number(),
      })),
      // 요청/응답 크기
      requestSize: v.optional(v.number()), // bytes
      responseSize: v.optional(v.number()), // bytes
      // 에러 정보
      errorMessage: v.optional(v.string()),
      errorStack: v.optional(v.string()),
      // 컨텍스트
      traceId: v.optional(v.string()),
      spanId: v.optional(v.string()),
      parentSpanId: v.optional(v.string()),
      // 메타데이터
      userAgent: v.optional(v.string()),
      ip: v.optional(v.string()),
      country: v.optional(v.string()),
      timestamp: v.string(),
    })
      .index("byUserId", ["userId"])
      .index("byEndpoint", ["endpoint"])
      .index("byMethod", ["method"])
      .index("bySuccess", ["success"])
      .index("byStatusCode", ["statusCode"])
      .index("byTimestamp", ["timestamp"])
      .index("byResponseTime", ["responseTime"]),

    // 데이터베이스 쿼리 성능
    queryMetrics: defineTable({
      userId: v.optional(v.id("users")),
      queryName: v.string(), // Convex 함수 이름
      queryType: v.string(), // query, mutation, action
      // 성능 지표
      executionTime: v.number(), // 밀리초
      success: v.boolean(),
      // 쿼리 상세
      tableName: v.optional(v.string()),
      operation: v.optional(v.string()), // get, list, create, update, delete
      rowsAffected: v.optional(v.number()),
      rowsReturned: v.optional(v.number()),
      // 캐시 정보
      cacheHit: v.optional(v.boolean()),
      cacheKey: v.optional(v.string()),
      // 에러 정보
      errorMessage: v.optional(v.string()),
      errorCode: v.optional(v.string()),
      // 컨텍스트
      traceId: v.optional(v.string()),
      requestId: v.optional(v.string()),
      timestamp: v.string(),
    })
      .index("byUserId", ["userId"])
      .index("byQueryName", ["queryName"])
      .index("byQueryType", ["queryType"])
      .index("bySuccess", ["success"])
      .index("byTimestamp", ["timestamp"])
      .index("byExecutionTime", ["executionTime"]),

    // 시스템 리소스 메트릭
    systemMetrics: defineTable({
      instanceId: v.string(), // 서버/컨테이너 인스턴스 ID
      // CPU 메트릭
      cpuUsage: v.number(), // 백분율
      cpuCores: v.number(),
      cpuModel: v.optional(v.string()),
      // 메모리 메트릭
      memoryUsage: v.number(), // 백분율
      memoryUsed: v.number(), // MB
      memoryTotal: v.number(), // MB
      heapUsed: v.number(), // MB (Node.js heap)
      heapTotal: v.number(), // MB
      // 네트워크 메트릭
      networkIn: v.number(), // bytes/sec
      networkOut: v.number(), // bytes/sec
      activeConnections: v.number(),
      // 디스크 메트릭
      diskUsage: v.optional(v.number()), // 백분율
      diskRead: v.optional(v.number()), // bytes/sec
      diskWrite: v.optional(v.number()), // bytes/sec
      // 프로세스 정보
      processUptime: v.number(), // 초
      processId: v.number(),
      nodeVersion: v.string(),
      // 메타데이터
      region: v.optional(v.string()),
      environment: v.string(), // production, staging, development
      timestamp: v.string(),
    })
      .index("byInstanceId", ["instanceId"])
      .index("byEnvironment", ["environment"])
      .index("byTimestamp", ["timestamp"]),

    // 비즈니스 메트릭
    businessMetrics: defineTable({
      userId: v.optional(v.id("users")),
      metricType: v.string(), // user_activity, content_generation, payment, engagement 등
      metricName: v.string(),
      value: v.number(),
      // 세부 메트릭
      dimensions: v.optional(v.object({
        platform: v.optional(v.string()),
        personaId: v.optional(v.string()),
        planType: v.optional(v.string()),
        source: v.optional(v.string()),
        campaign: v.optional(v.string()),
      })),
      // 집계 정보
      aggregationType: v.optional(v.string()), // count, sum, avg, min, max
      period: v.optional(v.string()), // minute, hour, day, week, month
      // 메타데이터
      metadata: v.optional(v.any()),
      timestamp: v.string(),
    })
      .index("byUserId", ["userId"])
      .index("byMetricType", ["metricType"])
      .index("byMetricName", ["metricName"])
      .index("byTimestamp", ["timestamp"]),

    // 에러 및 이벤트 로그
    errorLogs: defineTable({
      userId: v.optional(v.id("users")),
      level: v.string(), // error, warn, info, debug
      category: v.string(), // api, database, frontend, payment, ai 등
      message: v.string(),
      // 에러 상세
      errorName: v.optional(v.string()),
      errorStack: v.optional(v.string()),
      errorCode: v.optional(v.string()),
      // 컨텍스트
      pathname: v.optional(v.string()),
      endpoint: v.optional(v.string()),
      component: v.optional(v.string()),
      action: v.optional(v.string()),
      // 추적 정보
      traceId: v.optional(v.string()),
      sessionId: v.optional(v.string()),
      requestId: v.optional(v.string()),
      // 메타데이터
      metadata: v.optional(v.any()),
      userAgent: v.optional(v.string()),
      ip: v.optional(v.string()),
      timestamp: v.string(),
    })
      .index("byUserId", ["userId"])
      .index("byLevel", ["level"])
      .index("byCategory", ["category"])
      .index("byTimestamp", ["timestamp"])
      .index("bySessionId", ["sessionId"]),

    // 알림 규칙
    alertRules: defineTable({
      name: v.string(),
      description: v.optional(v.string()),
      isActive: v.boolean(),
      // 조건
      metricType: v.string(), // webVitals, api, query, system, business
      metricName: v.string(),
      condition: v.string(), // gt, lt, gte, lte, eq, neq
      threshold: v.number(),
      // 집계 설정
      aggregationWindow: v.number(), // 분 단위
      aggregationType: v.string(), // avg, sum, min, max, count
      consecutiveBreaches: v.number(), // 연속 위반 횟수
      // 알림 채널
      channels: v.array(v.object({
        type: v.string(), // email, slack, discord, webhook
        config: v.any(), // 채널별 설정
      })),
      // 알림 설정
      severity: v.string(), // critical, high, medium, low
      cooldownMinutes: v.number(), // 재알림 쿨다운
      maxAlertsPerDay: v.optional(v.number()),
      // 메타데이터
      tags: v.optional(v.array(v.string())),
      owner: v.optional(v.string()),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
      .index("byIsActive", ["isActive"])
      .index("byMetricType", ["metricType"])
      .index("bySeverity", ["severity"])
      .index("byCreatedAt", ["createdAt"]),

    // 알림 이력
    alertHistory: defineTable({
      ruleId: v.id("alertRules"),
      ruleName: v.string(),
      // 알림 상세
      status: v.string(), // triggered, resolved, acknowledged, ignored
      severity: v.string(),
      message: v.string(),
      // 위반 정보
      metricValue: v.number(),
      threshold: v.number(),
      condition: v.string(),
      // 알림 전송 정보
      channelsSent: v.array(v.string()),
      sendSuccess: v.boolean(),
      sendErrors: v.optional(v.array(v.string())),
      // 응답 정보
      acknowledgedBy: v.optional(v.id("users")),
      acknowledgedAt: v.optional(v.string()),
      resolvedAt: v.optional(v.string()),
      notes: v.optional(v.string()),
      // 메타데이터
      metadata: v.optional(v.any()),
      triggeredAt: v.string(),
    })
      .index("byRuleId", ["ruleId"])
      .index("byStatus", ["status"])
      .index("bySeverity", ["severity"])
      .index("byTriggeredAt", ["triggeredAt"]),

    // 성능 보고서
    performanceReports: defineTable({
      reportType: v.string(), // daily, weekly, monthly
      period: v.object({
        start: v.string(),
        end: v.string(),
      }),
      // 요약 메트릭
      summary: v.object({
        avgResponseTime: v.number(),
        p95ResponseTime: v.number(),
        p99ResponseTime: v.number(),
        errorRate: v.number(),
        availability: v.number(),
        // Web Vitals 평균
        avgLCP: v.optional(v.number()),
        avgFID: v.optional(v.number()),
        avgCLS: v.optional(v.number()),
        // 비즈니스 메트릭
        totalUsers: v.number(),
        activeUsers: v.number(),
        totalRevenue: v.optional(v.number()),
        conversionRate: v.optional(v.number()),
      }),
      // 상세 데이터
      details: v.optional(v.any()),
      // 추천 사항
      recommendations: v.optional(v.array(v.object({
        type: v.string(),
        priority: v.string(),
        description: v.string(),
        impact: v.string(),
      }))),
      // 메타데이터
      generatedAt: v.string(),
      generatedBy: v.optional(v.string()), // system, user
    })
      .index("byReportType", ["reportType"])
      .index("byGeneratedAt", ["generatedAt"]),
  });