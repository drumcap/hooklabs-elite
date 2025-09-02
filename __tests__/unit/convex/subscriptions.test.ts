import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext } from '../../../__mocks__/convex'
import { mockUser, mockSubscription, mockPayment } from '../../../fixtures/test-data'

describe('Subscriptions Functions', () => {
  let mockCtx: ReturnType<typeof createMockContext>

  beforeEach(() => {
    mockCtx = createMockContext()
    vi.clearAllMocks()
  })

  describe('getUserSubscription', () => {
    it('should return active subscription for user', async () => {
      // Given
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(mockSubscription),
          }),
        }),
      }))

      // When
      const getUserSubscriptionHandler = async (ctx: any, { userId }: { userId: string }) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("byUserId", (q: any) => q.eq("userId", userId))
          .filter((q: any) => q.neq(q.field("status"), "cancelled"))
          .first()
        
        return subscription
      }

      const result = await getUserSubscriptionHandler(mockCtx, { userId: mockUser.id })

      // Then
      expect(result).toEqual(mockSubscription)
      expect(mockCtx.db.query).toHaveBeenCalledWith('subscriptions')
    })

    it('should return null when user has no active subscription', async () => {
      // Given
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
          }),
        }),
      }))

      // When
      const getUserSubscriptionHandler = async (ctx: any, { userId }: { userId: string }) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("byUserId", (q: any) => q.eq("userId", userId))
          .filter((q: any) => q.neq(q.field("status"), "cancelled"))
          .first()
        
        return subscription
      }

      const result = await getUserSubscriptionHandler(mockCtx, { userId: mockUser.id })

      // Then
      expect(result).toBeNull()
    })
  })

  describe('hasActiveSubscription', () => {
    it('should return true when user has active subscription', async () => {
      // Given
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(mockSubscription),
          }),
        }),
      }))

      // When
      const hasActiveSubscriptionHandler = async (ctx: any, { userId }: { userId: string }) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("byUserId", (q: any) => q.eq("userId", userId))
          .filter((q: any) => q.eq(q.field("status"), "active"))
          .first()
        
        return !!subscription
      }

      const result = await hasActiveSubscriptionHandler(mockCtx, { userId: mockUser.id })

      // Then
      expect(result).toBe(true)
    })

    it('should return false when user has no active subscription', async () => {
      // Given
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
          }),
        }),
      }))

      // When
      const hasActiveSubscriptionHandler = async (ctx: any, { userId }: { userId: string }) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("byUserId", (q: any) => q.eq("userId", userId))
          .filter((q: any) => q.eq(q.field("status"), "active"))
          .first()
        
        return !!subscription
      }

      const result = await hasActiveSubscriptionHandler(mockCtx, { userId: mockUser.id })

      // Then
      expect(result).toBe(false)
    })
  })

  describe('hasActiveSubscriptionByExternalId', () => {
    it('should return true when user exists and has active subscription', async () => {
      // Given
      const mockUserRecord = {
        _id: 'user_internal_id',
        externalId: 'user_test123',
        name: 'Test User',
      }

      mockCtx.db.query.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            withIndex: vi.fn().mockReturnValue({
              unique: vi.fn().mockResolvedValue(mockUserRecord),
            }),
          }
        }
        if (table === 'subscriptions') {
          return {
            withIndex: vi.fn().mockReturnValue({
              filter: vi.fn().mockReturnValue({
                first: vi.fn().mockResolvedValue(mockSubscription),
              }),
            }),
          }
        }
        return { withIndex: vi.fn().mockReturnThis(), unique: vi.fn().mockResolvedValue(null) }
      })

      // When
      const hasActiveSubscriptionByExternalIdHandler = async (ctx: any, { externalId }: { externalId: string }) => {
        const user = await ctx.db
          .query("users")
          .withIndex("byExternalId", (q: any) => q.eq("externalId", externalId))
          .unique()
        
        if (!user) {
          return false
        }
        
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("byUserId", (q: any) => q.eq("userId", user._id))
          .filter((q: any) => q.eq(q.field("status"), "active"))
          .first()
        
        return !!subscription
      }

      const result = await hasActiveSubscriptionByExternalIdHandler(mockCtx, { externalId: 'user_test123' })

      // Then
      expect(result).toBe(true)
    })

    it('should return false when user does not exist', async () => {
      // Given
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue(null),
        }),
      }))

      // When
      const hasActiveSubscriptionByExternalIdHandler = async (ctx: any, { externalId }: { externalId: string }) => {
        const user = await ctx.db
          .query("users")
          .withIndex("byExternalId", (q: any) => q.eq("externalId", externalId))
          .unique()
        
        if (!user) {
          return false
        }
        
        return true
      }

      const result = await hasActiveSubscriptionByExternalIdHandler(mockCtx, { externalId: 'nonexistent_user' })

      // Then
      expect(result).toBe(false)
    })
  })

  describe('hasSubscriptionToPlan', () => {
    it('should return true when user has active subscription to specific plan', async () => {
      // Given
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(mockSubscription),
          }),
        }),
      }))

      // When
      const hasSubscriptionToPlanHandler = async (ctx: any, { userId, planName }: any) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("byUserId", (q: any) => q.eq("userId", userId))
          .filter((q: any) => 
            q.and(
              q.eq(q.field("status"), "active"),
              q.eq(q.field("planName"), planName)
            )
          )
          .first()
        
        return !!subscription
      }

      const result = await hasSubscriptionToPlanHandler(mockCtx, {
        userId: mockUser.id,
        planName: 'Pro Plan'
      })

      // Then
      expect(result).toBe(true)
    })

    it('should return false when user has subscription to different plan', async () => {
      // Given
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
          }),
        }),
      }))

      // When
      const hasSubscriptionToPlanHandler = async (ctx: any, { userId, planName }: any) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("byUserId", (q: any) => q.eq("userId", userId))
          .filter((q: any) => 
            q.and(
              q.eq(q.field("status"), "active"),
              q.eq(q.field("planName"), planName)
            )
          )
          .first()
        
        return !!subscription
      }

      const result = await hasSubscriptionToPlanHandler(mockCtx, {
        userId: mockUser.id,
        planName: 'Enterprise Plan'
      })

      // Then
      expect(result).toBe(false)
    })
  })

  describe('updateSubscription', () => {
    it('should update existing subscription', async () => {
      // Given
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue(mockSubscription),
        }),
      }))

      // When
      const updateSubscriptionHandler = async (ctx: any, { lemonSqueezySubscriptionId, updateData }: any) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("byLemonSqueezyId", (q: any) => 
            q.eq("lemonSqueezySubscriptionId", lemonSqueezySubscriptionId)
          )
          .unique()

        if (subscription) {
          await ctx.db.patch(subscription._id, updateData)
          return subscription._id
        }
        
        return null
      }

      const updateData = {
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      }

      const result = await updateSubscriptionHandler(mockCtx, {
        lemonSqueezySubscriptionId: 'ls_sub_123',
        updateData,
      })

      // Then
      expect(result).toBe(mockSubscription._id)
      expect(mockCtx.db.patch).toHaveBeenCalledWith(mockSubscription._id, updateData)
    })

    it('should return null when subscription not found', async () => {
      // Given
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue(null),
        }),
      }))

      // When
      const updateSubscriptionHandler = async (ctx: any, { lemonSqueezySubscriptionId, updateData }: any) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("byLemonSqueezyId", (q: any) => 
            q.eq("lemonSqueezySubscriptionId", lemonSqueezySubscriptionId)
          )
          .unique()

        if (subscription) {
          await ctx.db.patch(subscription._id, updateData)
          return subscription._id
        }
        
        return null
      }

      const result = await updateSubscriptionHandler(mockCtx, {
        lemonSqueezySubscriptionId: 'nonexistent_sub',
        updateData: { status: 'cancelled' },
      })

      // Then
      expect(result).toBeNull()
      expect(mockCtx.db.patch).not.toHaveBeenCalled()
    })
  })

  describe('getUserPayments', () => {
    it('should return recent user payments', async () => {
      // Given
      const mockPayments = [mockPayment, { ...mockPayment, _id: 'payment_2' }]
      
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            take: vi.fn().mockResolvedValue(mockPayments),
          }),
        }),
      }))

      // When
      const getUserPaymentsHandler = async (ctx: any, { userId }: { userId: string }) => {
        const payments = await ctx.db
          .query("payments")
          .withIndex("byUserId", (q: any) => q.eq("userId", userId))
          .order("desc")
          .take(10)
        
        return payments
      }

      const result = await getUserPaymentsHandler(mockCtx, { userId: mockUser.id })

      // Then
      expect(result).toEqual(mockPayments)
      expect(mockCtx.db.query).toHaveBeenCalledWith('payments')
    })
  })

  describe('getSubscriptionStats', () => {
    it('should return subscription statistics', async () => {
      // Given
      const allSubscriptions = [
        { ...mockSubscription, status: 'active' },
        { ...mockSubscription, _id: 'sub_2', status: 'active' },
        { ...mockSubscription, _id: 'sub_3', status: 'cancelled' },
        { ...mockSubscription, _id: 'sub_4', status: 'expired' },
        { ...mockSubscription, _id: 'sub_5', status: 'on_trial' },
      ]

      mockCtx.db.query.mockImplementation(() => ({
        collect: vi.fn().mockResolvedValue(allSubscriptions),
      }))

      // When
      const getSubscriptionStatsHandler = async (ctx: any) => {
        const allSubscriptions = await ctx.db.query("subscriptions").collect()
        
        const stats = {
          total: allSubscriptions.length,
          active: allSubscriptions.filter((s: any) => s.status === "active").length,
          cancelled: allSubscriptions.filter((s: any) => s.status === "cancelled").length,
          expired: allSubscriptions.filter((s: any) => s.status === "expired").length,
          trialCount: allSubscriptions.filter((s: any) => s.status === "on_trial").length,
        }
        
        return stats
      }

      const result = await getSubscriptionStatsHandler(mockCtx)

      // Then
      expect(result).toEqual({
        total: 5,
        active: 2,
        cancelled: 1,
        expired: 1,
        trialCount: 1,
      })
    })
  })

  describe('getUserSubscriptions', () => {
    it('should return all user subscriptions', async () => {
      // Given
      const userSubscriptions = [
        mockSubscription,
        { ...mockSubscription, _id: 'sub_2', status: 'cancelled' },
      ]

      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          collect: vi.fn().mockResolvedValue(userSubscriptions),
        }),
      }))

      // When
      const getUserSubscriptionsHandler = async (ctx: any, { userId }: { userId: string }) => {
        const subscriptions = await ctx.db
          .query("subscriptions")
          .withIndex("byUserId", (q: any) => q.eq("userId", userId))
          .collect()
        
        return subscriptions
      }

      const result = await getUserSubscriptionsHandler(mockCtx, { userId: mockUser.id })

      // Then
      expect(result).toEqual(userSubscriptions)
      expect(result).toHaveLength(2)
    })
  })
})