/**
 * 결제 및 구독 관련 스키마 정의
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// 구독 테이블
export const subscriptions = defineTable({
  userId: v.id("users"),
  lemonSqueezySubscriptionId: v.string(),
  productId: v.string(),
  variantId: v.string(),
  status: v.string(),
  renewsAt: v.optional(v.string()),
  endsAt: v.optional(v.string()),
  trialEndsAt: v.optional(v.string()),
  currentPeriodStart: v.optional(v.string()),
  currentPeriodEnd: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("byUserId", ["userId"])
  .index("byLemonSqueezyId", ["lemonSqueezySubscriptionId"]);

// 결제 테이블
export const payments = defineTable({
  userId: v.id("users"),
  lemonSqueezyOrderId: v.string(),
  subscriptionId: v.optional(v.id("subscriptions")),
  amount: v.number(),
  currency: v.string(),
  status: v.string(),
  productName: v.string(),
  variantName: v.string(),
  paymentMethod: v.optional(v.string()),
  createdAt: v.string(),
})
  .index("byUserId", ["userId"])
  .index("byLemonSqueezyOrderId", ["lemonSqueezyOrderId"]);

// 체크아웃 세션
export const checkouts = defineTable({
  userId: v.id("users"),
  lemonSqueezyCheckoutId: v.string(),
  productId: v.string(),
  variantId: v.string(),
  status: v.string(),
  url: v.string(),
  expiresAt: v.optional(v.string()),
  createdAt: v.string(),
})
  .index("byUserId", ["userId"])
  .index("byLemonSqueezyCheckoutId", ["lemonSqueezyCheckoutId"]);

// 라이센스 키
export const licenses = defineTable({
  userId: v.id("users"),
  key: v.string(),
  lemonSqueezyLicenseId: v.string(),
  status: v.string(),
  activationLimit: v.optional(v.number()),
  activationUsage: v.number(),
  createdAt: v.string(),
  expiresAt: v.optional(v.string()),
})
  .index("byUserId", ["userId"])
  .index("byKey", ["key"]);

// 결제 시도 (레거시)
export const paymentAttempts = defineTable({
  userId: v.id("users"),
  status: v.string(),
  amount: v.optional(v.number()),
  errorMessage: v.optional(v.string()),
  attemptedAt: v.string(),
}).index("byUserId", ["userId"]);

// 결제 스키마 export
export const paymentsSchema = {
  subscriptions,
  payments,
  checkouts,
  licenses,
  paymentAttempts,
};