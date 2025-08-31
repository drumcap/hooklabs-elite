import { v } from "convex/values";

// Lemon Squeezy Webhook Event Types
export const lemonSqueezyWebhookEventValidator = v.object({
  meta: v.object({
    event_name: v.string(),
    webhook_id: v.string(),
    custom_data: v.optional(v.any()),
  }),
  data: v.any(),
});

// Subscription webhook data
export const subscriptionWebhookValidator = v.object({
  type: v.literal("subscriptions"),
  id: v.string(),
  attributes: v.object({
    store_id: v.number(),
    customer_id: v.number(),
    order_id: v.number(),
    order_item_id: v.number(),
    product_id: v.number(),
    variant_id: v.number(),
    product_name: v.string(),
    variant_name: v.string(),
    user_name: v.string(),
    user_email: v.string(),
    status: v.string(),
    status_formatted: v.string(),
    card_brand: v.optional(v.string()),
    card_last_four: v.optional(v.string()),
    pause: v.optional(v.any()),
    cancelled: v.boolean(),
    trial_ends_at: v.optional(v.string()),
    billing_anchor: v.number(),
    first_subscription_item: v.object({
      id: v.number(),
      subscription_id: v.number(),
      price_id: v.number(),
      quantity: v.number(),
      is_usage_based: v.boolean(),
      created_at: v.string(),
      updated_at: v.string(),
    }),
    urls: v.object({
      update_payment_method: v.string(),
      customer_portal: v.string(),
    }),
    renews_at: v.string(),
    ends_at: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
    test_mode: v.boolean(),
  }),
});

// Order (payment) webhook data
export const orderWebhookValidator = v.object({
  type: v.literal("orders"),
  id: v.string(),
  attributes: v.object({
    store_id: v.number(),
    customer_id: v.number(),
    identifier: v.string(),
    order_number: v.number(),
    user_name: v.string(),
    user_email: v.string(),
    currency: v.string(),
    currency_rate: v.string(),
    subtotal: v.number(),
    discount_total: v.number(),
    tax: v.number(),
    total: v.number(),
    subtotal_usd: v.number(),
    discount_total_usd: v.number(),
    tax_usd: v.number(),
    total_usd: v.number(),
    tax_name: v.optional(v.string()),
    tax_rate: v.optional(v.string()),
    status: v.string(),
    status_formatted: v.string(),
    refunded: v.boolean(),
    refunded_at: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
    first_order_item: v.object({
      id: v.number(),
      order_id: v.number(),
      product_id: v.number(),
      variant_id: v.number(),
      product_name: v.string(),
      variant_name: v.string(),
      price: v.number(),
      created_at: v.string(),
      updated_at: v.string(),
    }),
    test_mode: v.boolean(),
  }),
});

// License webhook data
export const licenseWebhookValidator = v.object({
  type: v.literal("license-keys"),
  id: v.string(),
  attributes: v.object({
    store_id: v.number(),
    customer_id: v.number(),
    order_id: v.number(),
    order_item_id: v.number(),
    product_id: v.number(),
    user_name: v.string(),
    user_email: v.string(),
    key: v.string(),
    key_short: v.string(),
    activation_limit: v.number(),
    instances_count: v.number(),
    disabled: v.boolean(),
    status: v.string(),
    status_formatted: v.string(),
    expires_at: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
    test_mode: v.boolean(),
  }),
});

// Helper functions to transform webhook data
export function transformSubscriptionData(data: any) {
  return {
    lemonSqueezySubscriptionId: data.id,
    lemonSqueezyCustomerId: data.attributes.customer_id.toString(),
    lemonSqueezyProductId: data.attributes.product_id.toString(),
    lemonSqueezyVariantId: data.attributes.variant_id.toString(),
    lemonSqueezyOrderId: data.attributes.order_id.toString(),
    status: data.attributes.status,
    planName: data.attributes.variant_name,
    cardBrand: data.attributes.card_brand || undefined,
    cardLastFour: data.attributes.card_last_four || undefined,
    intervalUnit: "month", // Lemon Squeezy doesn't provide this directly
    intervalCount: 1,
    trialEndsAt: data.attributes.trial_ends_at,
    renewsAt: data.attributes.renews_at,
    endsAt: data.attributes.ends_at,
    price: data.attributes.first_subscription_item?.price || 0,
    currency: "USD", // TODO: Extract actual currency from subscription data
    isUsageBased: data.attributes.first_subscription_item?.is_usage_based || false,
    subscriptionItemId: data.attributes.first_subscription_item?.id?.toString(),
    createdAt: data.attributes.created_at,
    updatedAt: data.attributes.updated_at,
  };
}

export function transformOrderData(data: any) {
  return {
    lemonSqueezyOrderId: data.id,
    lemonSqueezyCustomerId: data.attributes.customer_id.toString(),
    lemonSqueezyProductId: data.attributes.first_order_item.product_id.toString(),
    lemonSqueezyVariantId: data.attributes.first_order_item.variant_id.toString(),
    lemonSqueezySubscriptionId: undefined, // Will be set if this is a subscription order
    identifier: data.attributes.identifier,
    orderNumber: data.attributes.order_number,
    productName: data.attributes.first_order_item.product_name,
    variantName: data.attributes.first_order_item.variant_name,
    userEmail: data.attributes.user_email,
    userName: data.attributes.user_name,
    status: data.attributes.status,
    statusFormatted: data.attributes.status_formatted,
    refunded: data.attributes.refunded,
    refundedAt: data.attributes.refunded_at,
    subtotal: data.attributes.subtotal,
    discountTotal: data.attributes.discount_total,
    taxInclusiveTotal: data.attributes.tax,
    total: data.attributes.total,
    subtotalUsd: data.attributes.subtotal_usd,
    discountTotalUsd: data.attributes.discount_total_usd,
    taxInclusiveUsdTotal: data.attributes.tax_usd,
    totalUsd: data.attributes.total_usd,
    taxName: data.attributes.tax_name,
    taxRate: data.attributes.tax_rate,
    currency: data.attributes.currency,
    currencyRate: data.attributes.currency_rate,
    createdAt: data.attributes.created_at,
    updatedAt: data.attributes.updated_at,
  };
}

export function transformLicenseData(data: any) {
  return {
    lemonSqueezyLicenseId: data.id,
    lemonSqueezyOrderId: data.attributes.order_id.toString(),
    lemonSqueezyProductId: data.attributes.product_id.toString(),
    lemonSqueezyCustomerId: data.attributes.customer_id.toString(),
    identifier: data.attributes.key_short,
    licenseKey: data.attributes.key,
    activationLimit: data.attributes.activation_limit,
    instancesCount: data.attributes.instances_count,
    disabled: data.attributes.disabled,
    status: data.attributes.status,
    statusFormatted: data.attributes.status_formatted,
    expiresAt: data.attributes.expires_at,
    createdAt: data.attributes.created_at,
    updatedAt: data.attributes.updated_at,
  };
}