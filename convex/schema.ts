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
  });