/**
 * 빌링 및 크레딧 관련 스키마 정의
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// 사용량 추적 테이블
export const usage = defineTable({
  userId: v.id("users"),
  subscriptionId: v.optional(v.id("subscriptions")),
  type: v.string(),
  amount: v.number(),
  unit: v.string(),
  description: v.string(),
  metadata: v.optional(v.any()),
  billingPeriod: v.optional(v.string()),
  timestamp: v.string(),
})
  .index("byUserId", ["userId"])
  .index("bySubscriptionId", ["subscriptionId"])
  .index("byTimestamp", ["timestamp"])
  .index("byType", ["type", "userId"]);

// 크레딧 관리 테이블
export const credits = defineTable({
  userId: v.id("users"),
  amount: v.number(),
  type: v.string(),
  source: v.string(),
  description: v.string(),
  expiresAt: v.optional(v.string()),
  usedAmount: v.number(),
  isActive: v.boolean(),
  metadata: v.optional(v.any()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("byUserId", ["userId"])
  .index("byType", ["type"])
  .index("byExpiresAt", ["expiresAt"])
  .index("byIsActive", ["isActive", "userId"]);

// 쿠폰 테이블
export const coupons = defineTable({
  code: v.string(),
  type: v.string(),
  value: v.number(),
  currency: v.optional(v.string()),
  description: v.string(),
  usageLimit: v.optional(v.number()),
  usageCount: v.number(),
  validFrom: v.string(),
  validUntil: v.optional(v.string()),
  restrictions: v.optional(v.any()),
  isActive: v.boolean(),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("byCode", ["code"])
  .index("byIsActive", ["isActive"])
  .index("byValidUntil", ["validUntil"]);

// 쿠폰 사용 내역
export const couponUsage = defineTable({
  couponId: v.id("coupons"),
  userId: v.id("users"),
  orderId: v.optional(v.string()),
  discountAmount: v.number(),
  usedAt: v.string(),
})
  .index("byCouponId", ["couponId"])
  .index("byUserId", ["userId"])
  .index("byOrderId", ["orderId"]);

// 빌링 스키마 export
export const billingSchema = {
  usage,
  credits,
  coupons,
  couponUsage,
};