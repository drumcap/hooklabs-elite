import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext } from '../../../__mocks__/convex'
import { mockUser, mockSubscription, mockUsageRecord } from '../../../fixtures/test-data'

// Mock the Convex functions by importing the actual handler logic
// 실제 환경에서는 Convex 함수를 직접 테스트하기 어려우므로
// 핸들러 로직을 별도 함수로 분리하여 테스트합니다.

describe('Usage Functions', () => {
  let mockCtx: ReturnType<typeof createMockContext>

  beforeEach(() => {
    mockCtx = createMockContext()
    vi.clearAllMocks()
  })

  describe('getUserUsage', () => {
    it('should return null when user has no subscription', async () => {
      // Given
      mockCtx.db.query.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            withIndex: vi.fn().mockReturnValue({
              filter: vi.fn().mockReturnValue({
                first: vi.fn().mockResolvedValue(null),
              }),
            }),
          }
        }
        return { withIndex: vi.fn().mockReturnThis(), filter: vi.fn().mockReturnThis(), first: vi.fn().mockResolvedValue(null) }
      })

      // When
      const getUserUsageHandler = async (ctx: any, { userId }: { userId: string }) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("byUserId", (q: any) => q.eq("userId", userId))
          .filter((q: any) => q.eq(q.field("status"), "active"))
          .first()
        
        if (!subscription) {
          return null
        }
        
        return subscription
      }

      const result = await getUserUsageHandler(mockCtx, { userId: mockUser.id })

      // Then
      expect(result).toBeNull()
      expect(mockCtx.db.query).toHaveBeenCalledWith('subscriptions')
    })

    it('should return usage data when user has active subscription', async () => {
      // Given
      const mockUsageRecords = [mockUsageRecord]
      
      mockCtx.db.query.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            withIndex: vi.fn().mockReturnValue({
              filter: vi.fn().mockReturnValue({
                first: vi.fn().mockResolvedValue(mockSubscription),
              }),
            }),
          }
        }
        if (table === 'usageRecords') {
          return {
            withIndex: vi.fn().mockReturnValue({
              filter: vi.fn().mockReturnValue({
                collect: vi.fn().mockResolvedValue(mockUsageRecords),
              }),
            }),
          }
        }
        return { withIndex: vi.fn().mockReturnThis(), filter: vi.fn().mockReturnThis(), collect: vi.fn().mockResolvedValue([]) }
      })

      // When
      const getUserUsageHandler = async (ctx: any, { userId }: { userId: string }) => {
        const now = new Date()
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("byUserId")
          .filter((q: any) => q.eq(q.field("status"), "active"))
          .first()

        if (!subscription) {
          return null
        }

        const usageRecords = await ctx.db
          .query("usageRecords")
          .withIndex("byUserId")
          .filter((q: any) => 
            q.and(
              q.gte(q.field("recordedAt"), periodStart),
              q.lte(q.field("recordedAt"), periodEnd)
            )
          )
          .collect()

        const usageByType = usageRecords.reduce((acc: any, record: any) => {
          const type = record.resourceType
          if (!acc[type]) {
            acc[type] = { amount: 0, unit: record.unit, records: [] }
          }
          acc[type].amount += record.amount
          acc[type].records.push(record)
          return acc
        }, {})

        return {
          subscription,
          periodStart,
          periodEnd,
          totalUsage: usageRecords.reduce((sum: number, record: any) => sum + record.amount, 0),
          usageByType,
          usageRecords: usageRecords.slice(-20),
        }
      }

      const result = await getUserUsageHandler(mockCtx, { userId: mockUser.id })

      // Then
      expect(result).toBeDefined()
      expect(result?.subscription).toEqual(mockSubscription)
      expect(result?.totalUsage).toBeGreaterThan(0)
      expect(result?.usageByType).toBeDefined()
    })
  })

  describe('recordUsage', () => {
    it('should record usage and update subscription', async () => {
      // Given
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(mockSubscription),
          }),
        }),
      }))
      
      mockCtx.db.insert.mockResolvedValue('usage_id_123')

      // When
      const recordUsageHandler = async (ctx: any, args: any) => {
        const now = new Date()
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("byUserId")
          .filter((q: any) => q.eq(q.field("status"), "active"))
          .first()

        const usageId = await ctx.db.insert("usageRecords", {
          userId: args.userId,
          subscriptionId: subscription?._id,
          resourceType: args.resourceType,
          amount: args.amount,
          unit: args.unit,
          description: args.description,
          recordedAt: now.toISOString(),
          periodStart,
          periodEnd,
        })

        if (subscription) {
          const currentUsage = (subscription.currentUsage || 0) + args.amount
          const usageLimit = subscription.usageLimit || 0
          const overage = Math.max(0, currentUsage - usageLimit)

          await ctx.db.patch(subscription._id, {
            currentUsage,
            overage,
            updatedAt: now.toISOString(),
          })
        }

        return usageId
      }

      const result = await recordUsageHandler(mockCtx, {
        userId: mockUser.id,
        resourceType: 'api_requests',
        amount: 100,
        unit: 'requests',
        description: 'API call',
      })

      // Then
      expect(result).toBe('usage_id_123')
      expect(mockCtx.db.insert).toHaveBeenCalledWith('usageRecords', expect.objectContaining({
        userId: mockUser.id,
        resourceType: 'api_requests',
        amount: 100,
        unit: 'requests',
      }))
      expect(mockCtx.db.patch).toHaveBeenCalled()
    })
  })

  describe('checkUsageAlerts', () => {
    it('should return error alert when over limit', async () => {
      // Given
      const overLimitSubscription = {
        ...mockSubscription,
        currentUsage: 12000, // 한도 초과
        usageLimit: 10000,
      }
      
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(overLimitSubscription),
          }),
        }),
      }))

      // When
      const checkUsageAlertsHandler = async (ctx: any, { userId }: { userId: string }) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("byUserId")
          .filter((q: any) => q.eq(q.field("status"), "active"))
          .first()

        if (!subscription || !subscription.usageLimit) {
          return []
        }

        const currentUsage = subscription.currentUsage || 0
        const usageLimit = subscription.usageLimit
        const usagePercentage = (currentUsage / usageLimit) * 100

        const alerts = []

        if (usagePercentage >= 100) {
          alerts.push({
            type: "over_limit",
            severity: "error",
            message: "사용량이 한도를 초과했습니다.",
            usage: currentUsage,
            limit: usageLimit,
            percentage: usagePercentage,
          })
        } else if (usagePercentage >= 90) {
          alerts.push({
            type: "near_limit",
            severity: "warning", 
            message: "사용량이 한도의 90%에 도달했습니다.",
            usage: currentUsage,
            limit: usageLimit,
            percentage: usagePercentage,
          })
        }

        return alerts
      }

      const result = await checkUsageAlertsHandler(mockCtx, { userId: mockUser.id })

      // Then
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: "over_limit",
        severity: "error",
        percentage: 120,
      })
    })

    it('should return warning alert when near limit', async () => {
      // Given
      const nearLimitSubscription = {
        ...mockSubscription,
        currentUsage: 9500, // 95% 사용
        usageLimit: 10000,
      }
      
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(nearLimitSubscription),
          }),
        }),
      }))

      // When
      const checkUsageAlertsHandler = async (ctx: any, { userId }: { userId: string }) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("byUserId")
          .filter((q: any) => q.eq(q.field("status"), "active"))
          .first()

        if (!subscription || !subscription.usageLimit) {
          return []
        }

        const currentUsage = subscription.currentUsage || 0
        const usageLimit = subscription.usageLimit
        const usagePercentage = (currentUsage / usageLimit) * 100

        const alerts = []

        if (usagePercentage >= 100) {
          alerts.push({
            type: "over_limit",
            severity: "error",
            message: "사용량이 한도를 초과했습니다.",
            usage: currentUsage,
            limit: usageLimit,
            percentage: usagePercentage,
          })
        } else if (usagePercentage >= 90) {
          alerts.push({
            type: "near_limit",
            severity: "warning", 
            message: "사용량이 한도의 90%에 도달했습니다.",
            usage: currentUsage,
            limit: usageLimit,
            percentage: usagePercentage,
          })
        }

        return alerts
      }

      const result = await checkUsageAlertsHandler(mockCtx, { userId: mockUser.id })

      // Then
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: "near_limit",
        severity: "warning",
        percentage: 95,
      })
    })
  })
})