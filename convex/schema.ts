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
  });