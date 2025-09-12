/**
 * 빌링 및 크레딧 관련 스키마 정의
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// 통합된 사용량 추적 테이블
export const usage = defineTable({
  userId: v.id("users"),
  subscriptionId: v.optional(v.id("subscriptions")),
  resourceType: v.string(), // "ai_generation", "api_call", "storage", "credits", "bandwidth" 등
  amount: v.number(),
  unit: v.string(), // "requests", "tokens", "MB", "credits", "GB" 등
  description: v.string(),
  // 관련 리소스 참조
  postId: v.optional(v.id("socialPosts")),
  personaId: v.optional(v.id("personas")),
  // 청구 관련 정보
  periodStart: v.optional(v.string()), // 청구 주기 시작일
  periodEnd: v.optional(v.string()), // 청구 주기 종료일
  // 메타데이터
  metadata: v.optional(v.any()),
  timestamp: v.string(),
  createdAt: v.string(),
})
  .index("byUserId", ["userId"])
  .index("bySubscriptionId", ["subscriptionId"])
  .index("byResourceType", ["resourceType"])
  .index("byTimestamp", ["timestamp"])
  .index("byCreatedAt", ["createdAt"])
  .index("byPostId", ["postId"])
  .index("byPeriod", ["periodStart", "periodEnd"]);

// 크레딧 관리 테이블
export const credits = defineTable({
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
  .index("byCreatedAt", ["createdAt"]);

// 쿠폰 관리 테이블
export const coupons = defineTable({
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
  .index("byValidUntil", ["validUntil"]);

// 쿠폰 사용 내역 테이블
export const couponUsages = defineTable({
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
  .index("byUsedAt", ["usedAt"]);

// 빌링 스키마 export
export const billingSchema = {
  usage, // usageRecords와 통합됨
  credits,
  coupons,
  couponUsages,
};