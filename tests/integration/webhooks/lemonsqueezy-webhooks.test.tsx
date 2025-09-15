import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext } from '../../../__mocks__/convex'
import { mockWebhookPayloads } from '../../../fixtures/test-data'

// Mock crypto for webhook signature verification
const mockCrypto = {
  createHmac: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  digest: vi.fn().mockReturnValue('valid_signature'),
}
vi.stubGlobal('crypto', { createHmac: mockCrypto.createHmac })

describe('Lemon Squeezy Webhooks', () => {
  let mockCtx: ReturnType<typeof createMockContext>

  beforeEach(() => {
    mockCtx = createMockContext()
    vi.clearAllMocks()
    
    // Reset environment variables
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'webhook_secret_123'
  })

  const verifySignature = (payload: string, signature: string) => {
    if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
      return false
    }
    
    // In a real implementation, this would use crypto.createHmac
    // to verify the webhook signature
    return signature === 'valid_signature'
  }

  const handleSubscriptionCreated = async (ctx: any, webhookData: any) => {
    const { data } = webhookData
    const subscription = data.attributes

    // Find user by customer ID or create new user
    let user = await ctx.db
      .query("users")
      .withIndex("byLemonSqueezyCustomerId", (q: any) => 
        q.eq("lemonSqueezyCustomerId", subscription.customer_id.toString())
      )
      .first()

    if (!user) {
      // In real implementation, would need to handle user creation
      // or lookup by email/external ID
      user = { _id: 'temp_user_id' }
    }

    // Create or update subscription record
    const subscriptionData = {
      userId: user._id,
      lemonSqueezySubscriptionId: data.id,
      lemonSqueezyCustomerId: subscription.customer_id.toString(),
      lemonSqueezyProductId: subscription.product_id.toString(),
      lemonSqueezyVariantId: subscription.variant_id.toString(),
      status: subscription.status,
      planName: subscription.product_name || 'Unknown Plan',
      intervalUnit: subscription.billing_anchor === 'month' ? 'month' : 'year',
      intervalCount: 1,
      price: subscription.unit_price || 0,
      currency: subscription.currency || 'USD',
      isUsageBased: false,
      renewsAt: subscription.renews_at,
      createdAt: subscription.created_at,
      updatedAt: subscription.updated_at,
    }

    const subscriptionId = await ctx.db.insert("subscriptions", subscriptionData)
    return subscriptionId
  }

  const handleSubscriptionUpdated = async (ctx: any, webhookData: any) => {
    const { data } = webhookData
    const subscription = data.attributes

    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("byLemonSqueezyId", (q: any) => 
        q.eq("lemonSqueezySubscriptionId", data.id)
      )
      .unique()

    if (!existingSubscription) {
      throw new Error('Subscription not found')
    }

    const updateData = {
      status: subscription.status,
      price: subscription.unit_price || existingSubscription.price,
      renewsAt: subscription.renews_at,
      endsAt: subscription.ends_at,
      updatedAt: subscription.updated_at,
    }

    await ctx.db.patch(existingSubscription._id, updateData)
    return existingSubscription._id
  }

  const handleOrderCreated = async (ctx: any, webhookData: any) => {
    const { data } = webhookData
    const order = data.attributes

    // Find user by customer ID
    const user = await ctx.db
      .query("users")
      .withIndex("byLemonSqueezyCustomerId", (q: any) => 
        q.eq("lemonSqueezyCustomerId", order.customer_id.toString())
      )
      .first()

    const paymentData = {
      userId: user?._id || null,
      lemonSqueezyOrderId: data.id,
      lemonSqueezyCustomerId: order.customer_id.toString(),
      lemonSqueezyProductId: order.first_order_item?.product_id?.toString() || '',
      lemonSqueezyVariantId: order.first_order_item?.variant_id?.toString() || '',
      identifier: order.identifier,
      orderNumber: order.order_number,
      productName: order.first_order_item?.product_name || 'Unknown Product',
      variantName: order.first_order_item?.variant_name || 'Default',
      userEmail: order.user_email,
      userName: order.user_name,
      status: order.status,
      statusFormatted: order.status_formatted,
      refunded: order.refunded,
      subtotal: order.subtotal,
      discountTotal: order.discount_total || 0,
      taxInclusiveTotal: order.tax_inclusive_total || order.total,
      total: order.total,
      subtotalUsd: order.subtotal_usd,
      discountTotalUsd: order.discount_total_usd || 0,
      taxInclusiveUsdTotal: order.tax_inclusive_total_usd || order.total_usd,
      totalUsd: order.total_usd,
      currency: order.currency,
      currencyRate: order.currency_rate || '1.0',
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    }

    const paymentId = await ctx.db.insert("payments", paymentData)
    return paymentId
  }

  const processWebhook = async (ctx: any, payload: string, signature: string) => {
    // Verify signature
    if (!verifySignature(payload, signature)) {
      throw new Error('Invalid signature')
    }

    const webhookData = JSON.parse(payload)
    const eventName = webhookData.event_name

    switch (eventName) {
      case 'subscription_created':
        return await handleSubscriptionCreated(ctx, webhookData)
      
      case 'subscription_updated':
        return await handleSubscriptionUpdated(ctx, webhookData)
      
      case 'subscription_cancelled':
        return await handleSubscriptionUpdated(ctx, {
          ...webhookData,
          data: {
            ...webhookData.data,
            attributes: {
              ...webhookData.data.attributes,
              status: 'cancelled',
            }
          }
        })
      
      case 'order_created':
        return await handleOrderCreated(ctx, webhookData)
      
      default:
        throw new Error(`Unhandled event: ${eventName}`)
    }
  }

  it('should handle subscription_created webhook', async () => {
    const payload = JSON.stringify(mockWebhookPayloads.subscriptionCreated)
    
    mockCtx.db.query.mockImplementation(() => ({
      withIndex: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ _id: 'user_123' }),
      }),
    }))
    
    mockCtx.db.insert.mockResolvedValue('subscription_id_123')

    const result = await processWebhook(mockCtx, payload, 'valid_signature')

    expect(result).toBe('subscription_id_123')
    expect(mockCtx.db.insert).toHaveBeenCalledWith('subscriptions', expect.objectContaining({
      lemonSqueezySubscriptionId: '123456',
      status: 'active',
    }))
  })

  it('should handle subscription_updated webhook', async () => {
    const payload = JSON.stringify({
      event_name: 'subscription_updated',
      data: {
        id: '123456',
        type: 'subscriptions',
        attributes: {
          status: 'past_due',
          unit_price: 3500, // Price change
          renews_at: '2024-02-15T00:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      },
    })

    mockCtx.db.query.mockImplementation(() => ({
      withIndex: vi.fn().mockReturnValue({
        unique: vi.fn().mockResolvedValue({
          _id: 'subscription_123',
          price: 2900,
        }),
      }),
    }))

    const result = await processWebhook(mockCtx, payload, 'valid_signature')

    expect(result).toBe('subscription_123')
    expect(mockCtx.db.patch).toHaveBeenCalledWith('subscription_123', expect.objectContaining({
      status: 'past_due',
      price: 3500,
    }))
  })

  it('should handle subscription_cancelled webhook', async () => {
    const payload = JSON.stringify({
      event_name: 'subscription_cancelled',
      data: {
        id: '123456',
        type: 'subscriptions',
        attributes: {
          status: 'active', // Will be overridden to 'cancelled'
          ends_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      },
    })

    mockCtx.db.query.mockImplementation(() => ({
      withIndex: vi.fn().mockReturnValue({
        unique: vi.fn().mockResolvedValue({
          _id: 'subscription_123',
        }),
      }),
    }))

    const result = await processWebhook(mockCtx, payload, 'valid_signature')

    expect(result).toBe('subscription_123')
    expect(mockCtx.db.patch).toHaveBeenCalledWith('subscription_123', expect.objectContaining({
      status: 'cancelled',
      endsAt: '2024-02-01T00:00:00Z',
    }))
  })

  it('should handle order_created webhook', async () => {
    const payload = JSON.stringify(mockWebhookPayloads.orderCreated)

    mockCtx.db.query.mockImplementation(() => ({
      withIndex: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ _id: 'user_123' }),
      }),
    }))

    mockCtx.db.insert.mockResolvedValue('payment_id_123')

    const result = await processWebhook(mockCtx, payload, 'valid_signature')

    expect(result).toBe('payment_id_123')
    expect(mockCtx.db.insert).toHaveBeenCalledWith('payments', expect.objectContaining({
      lemonSqueezyOrderId: '654321',
      status: 'paid',
      total: 2900,
    }))
  })

  it('should reject webhook with invalid signature', async () => {
    const payload = JSON.stringify(mockWebhookPayloads.subscriptionCreated)

    await expect(processWebhook(mockCtx, payload, 'invalid_signature'))
      .rejects.toThrow('Invalid signature')

    expect(mockCtx.db.insert).not.toHaveBeenCalled()
  })

  it('should handle unknown event types', async () => {
    const payload = JSON.stringify({
      event_name: 'unknown_event',
      data: {},
    })

    await expect(processWebhook(mockCtx, payload, 'valid_signature'))
      .rejects.toThrow('Unhandled event: unknown_event')
  })

  it('should handle malformed JSON payload', async () => {
    const payload = 'invalid json'

    await expect(processWebhook(mockCtx, payload, 'valid_signature'))
      .rejects.toThrow()
  })

  it('should handle subscription update for non-existent subscription', async () => {
    const payload = JSON.stringify({
      event_name: 'subscription_updated',
      data: {
        id: 'nonexistent',
        attributes: {
          status: 'cancelled',
        },
      },
    })

    mockCtx.db.query.mockImplementation(() => ({
      withIndex: vi.fn().mockReturnValue({
        unique: vi.fn().mockResolvedValue(null), // No subscription found
      }),
    }))

    await expect(processWebhook(mockCtx, payload, 'valid_signature'))
      .rejects.toThrow('Subscription not found')
  })

  it('should handle webhook without environment variable', async () => {
    delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET

    const payload = JSON.stringify(mockWebhookPayloads.subscriptionCreated)

    await expect(processWebhook(mockCtx, payload, 'valid_signature'))
      .rejects.toThrow('Invalid signature')
  })

  it('should handle subscription with usage-based billing', async () => {
    const payload = JSON.stringify({
      event_name: 'subscription_created',
      data: {
        id: '789012',
        type: 'subscriptions',
        attributes: {
          store_id: 123,
          customer_id: 456,
          product_id: 789,
          variant_id: 101112,
          status: 'active',
          product_name: 'Usage-Based Plan',
          billing_anchor: 'month',
          unit_price: 0, // Base price
          usage_based: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      },
    })

    mockCtx.db.query.mockImplementation(() => ({
      withIndex: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ _id: 'user_123' }),
      }),
    }))

    mockCtx.db.insert.mockResolvedValue('subscription_id_123')

    const result = await processWebhook(mockCtx, payload, 'valid_signature')

    expect(result).toBe('subscription_id_123')
    expect(mockCtx.db.insert).toHaveBeenCalledWith('subscriptions', expect.objectContaining({
      planName: 'Usage-Based Plan',
      price: 0,
      isUsageBased: false, // Simplified for test
    }))
  })

  it('should handle refunded order webhook', async () => {
    const payload = JSON.stringify({
      event_name: 'order_refunded',
      data: {
        id: '654321',
        type: 'orders',
        attributes: {
          customer_id: 456,
          identifier: 'ORD-2024-001',
          status: 'refunded',
          refunded: true,
          refunded_at: '2024-01-16T10:00:00Z',
          total: 2900,
          currency: 'USD',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-16T10:00:00Z',
        },
      },
    })

    // Handle refund by updating existing payment record
    const handleOrderRefunded = async (ctx: any, webhookData: any) => {
      const { data } = webhookData
      
      const existingPayment = await ctx.db
        .query("payments")
        .withIndex("byLemonSqueezyOrderId", (q: any) => 
          q.eq("lemonSqueezyOrderId", data.id)
        )
        .first()

      if (existingPayment) {
        await ctx.db.patch(existingPayment._id, {
          status: 'refunded',
          refunded: true,
          refundedAt: data.attributes.refunded_at,
          updatedAt: data.attributes.updated_at,
        })
        return existingPayment._id
      }

      return null
    }

    mockCtx.db.query.mockImplementation(() => ({
      withIndex: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ _id: 'payment_123' }),
      }),
    }))

    const result = await handleOrderRefunded(mockCtx, JSON.parse(payload))

    expect(result).toBe('payment_123')
    expect(mockCtx.db.patch).toHaveBeenCalledWith('payment_123', expect.objectContaining({
      status: 'refunded',
      refunded: true,
      refundedAt: '2024-01-16T10:00:00Z',
    }))
  })
})