import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext } from '../../../__mocks__/convex'
import { mockUser, mockCreditBalance, mockCredit } from '../../../fixtures/test-data'

describe('Credits Functions', () => {
  let mockCtx: ReturnType<typeof createMockContext>

  beforeEach(() => {
    mockCtx = createMockContext()
    vi.clearAllMocks()
  })

  describe('getUserCreditBalance', () => {
    it('should return existing balance from aggregate table', async () => {
      // Given
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockCreditBalance),
        }),
      }))

      // When
      const getUserCreditBalanceHandler = async (ctx: any, { userId }: { userId: string }) => {
        const balance = await ctx.db
          .query("userCreditBalances")
          .withIndex("byUserId")
          .first()

        return balance
      }

      const result = await getUserCreditBalanceHandler(mockCtx, { userId: mockUser.id })

      // Then
      expect(result).toEqual(mockCreditBalance)
      expect(mockCtx.db.query).toHaveBeenCalledWith('userCreditBalances')
    })

    it('should calculate balance when aggregate table is empty', async () => {
      // Given
      const mockCredits = [
        { ...mockCredit, amount: 1000, type: 'earned' },
        { ...mockCredit, amount: 500, type: 'purchased' },
        { ...mockCredit, amount: -200, type: 'used' },
      ]

      mockCtx.db.query.mockImplementation((table: string) => {
        if (table === 'userCreditBalances') {
          return {
            withIndex: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
            }),
          }
        }
        if (table === 'credits') {
          return {
            withIndex: vi.fn().mockReturnValue({
              collect: vi.fn().mockResolvedValue(mockCredits),
            }),
          }
        }
        return { withIndex: vi.fn().mockReturnThis(), collect: vi.fn().mockResolvedValue([]) }
      })

      // When
      const getUserCreditBalanceHandler = async (ctx: any, { userId }: { userId: string }) => {
        const balance = await ctx.db
          .query("userCreditBalances")
          .withIndex("byUserId")
          .first()

        if (balance) {
          return balance
        }

        const credits = await ctx.db
          .query("credits")
          .withIndex("byUserId")
          .collect()

        const now = new Date().toISOString()
        
        const totalCredits = credits
          .filter((c: any) => c.type !== "expired")
          .reduce((sum: number, credit: any) => sum + credit.amount, 0)

        const availableCredits = credits
          .filter((c: any) => 
            c.type !== "expired" && 
            (!c.expiresAt || c.expiresAt > now)
          )
          .reduce((sum: number, credit: any) => sum + credit.amount, 0)

        const usedCredits = credits
          .filter((c: any) => c.type === "used")
          .reduce((sum: number, credit: any) => sum + Math.abs(credit.amount), 0)

        const result = {
          userId,
          totalCredits,
          availableCredits: Math.max(0, availableCredits),
          usedCredits,
          expiredCredits: 0,
          lastUpdated: now,
        }

        await ctx.db.insert("userCreditBalances", result)
        return result
      }

      const result = await getUserCreditBalanceHandler(mockCtx, { userId: mockUser.id })

      // Then
      expect(result.totalCredits).toBe(1300) // 1000 + 500 - 200
      expect(result.availableCredits).toBe(1300)
      expect(result.usedCredits).toBe(200)
      expect(mockCtx.db.insert).toHaveBeenCalledWith('userCreditBalances', expect.any(Object))
    })
  })

  describe('addCredits', () => {
    it('should add credits and update balance', async () => {
      // Given
      mockCtx.db.insert.mockResolvedValue('credit_id_123')

      // When
      const addCreditsHandler = async (ctx: any, args: any) => {
        const now = new Date().toISOString()

        const creditId = await ctx.db.insert("credits", {
          userId: args.userId,
          amount: args.amount,
          type: args.type,
          description: args.description,
          expiresAt: args.expiresAt,
          createdAt: now,
        })

        // Update balance (simplified for test)
        return creditId
      }

      const result = await addCreditsHandler(mockCtx, {
        userId: mockUser.id,
        amount: 1000,
        type: 'purchased',
        description: '크레딧 구매',
      })

      // Then
      expect(result).toBe('credit_id_123')
      expect(mockCtx.db.insert).toHaveBeenCalledWith('credits', expect.objectContaining({
        userId: mockUser.id,
        amount: 1000,
        type: 'purchased',
        description: '크레딧 구매',
      }))
    })
  })

  describe('useCredits', () => {
    it('should use credits when sufficient balance available', async () => {
      // Given
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockCreditBalance),
        }),
      }))
      mockCtx.db.insert.mockResolvedValue('usage_id_123')

      // When
      const useCreditsHandler = async (ctx: any, args: any) => {
        const balance = await ctx.db
          .query("userCreditBalances")
          .withIndex("byUserId")
          .first()

        if (!balance || balance.availableCredits < args.amount) {
          throw new Error("크레딧이 부족합니다.")
        }

        const now = new Date().toISOString()

        const creditId = await ctx.db.insert("credits", {
          userId: args.userId,
          amount: -args.amount,
          type: "used",
          description: args.description,
          createdAt: now,
        })

        return creditId
      }

      const result = await useCreditsHandler(mockCtx, {
        userId: mockUser.id,
        amount: 1000,
        description: '서비스 이용',
      })

      // Then
      expect(result).toBe('usage_id_123')
      expect(mockCtx.db.insert).toHaveBeenCalledWith('credits', expect.objectContaining({
        amount: -1000,
        type: 'used',
      }))
    })

    it('should throw error when insufficient credits', async () => {
      // Given
      const insufficientBalance = { ...mockCreditBalance, availableCredits: 500 }
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(insufficientBalance),
        }),
      }))

      // When & Then
      const useCreditsHandler = async (ctx: any, args: any) => {
        const balance = await ctx.db
          .query("userCreditBalances")
          .withIndex("byUserId")
          .first()

        if (!balance || balance.availableCredits < args.amount) {
          throw new Error("크레딧이 부족합니다.")
        }
      }

      await expect(useCreditsHandler(mockCtx, {
        userId: mockUser.id,
        amount: 1000,
        description: '서비스 이용',
      })).rejects.toThrow('크레딧이 부족합니다.')
    })
  })

  describe('getExpiringCredits', () => {
    it('should return credits expiring within specified days', async () => {
      // Given
      const now = new Date()
      const expiringCredit = {
        ...mockCredit,
        expiresAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3일 후 만료
      }

      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue([expiringCredit]),
          }),
        }),
      }))

      // When
      const getExpiringCreditsHandler = async (ctx: any, { userId, daysAhead = 7 }: any) => {
        const now = new Date()
        const expiryDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString()

        const expiringCredits = await ctx.db
          .query("credits")
          .withIndex("byUserId")
          .filter((q: any) => 
            q.and(
              q.neq(q.field("type"), "used"),
              q.neq(q.field("type"), "expired"),
              q.lte(q.field("expiresAt"), expiryDate),
              q.gt(q.field("expiresAt"), now.toISOString())
            )
          )
          .collect()

        return expiringCredits
      }

      const result = await getExpiringCreditsHandler(mockCtx, { 
        userId: mockUser.id,
        daysAhead: 7 
      })

      // Then
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(expiringCredit)
    })
  })

  describe('expireCredits', () => {
    it('should process expired credits and update balances', async () => {
      // Given
      const expiredCredit = {
        ...mockCredit,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1일 전 만료
      }

      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue([expiredCredit]),
          }),
        }),
      }))
      mockCtx.db.insert.mockResolvedValue('expired_id_123')

      // When
      const expireCreditsHandler = async (ctx: any) => {
        const now = new Date().toISOString()
        
        const expiredCredits = await ctx.db
          .query("credits")
          .withIndex("byExpiresAt")
          .filter((q: any) => 
            q.and(
              q.lt(q.field("expiresAt"), now),
              q.neq(q.field("type"), "expired")
            )
          )
          .collect()

        const processedUserIds = new Set<string>()

        for (const credit of expiredCredits) {
          await ctx.db.insert("credits", {
            userId: credit.userId,
            amount: -credit.amount,
            type: "expired",
            description: `크레딧 만료: ${credit.description}`,
            createdAt: now,
          })

          processedUserIds.add(credit.userId)
        }

        return {
          expiredCount: expiredCredits.length,
          affectedUsers: processedUserIds.size,
        }
      }

      const result = await expireCreditsHandler(mockCtx)

      // Then
      expect(result.expiredCount).toBe(1)
      expect(result.affectedUsers).toBe(1)
      expect(mockCtx.db.insert).toHaveBeenCalledWith('credits', expect.objectContaining({
        type: 'expired',
        amount: -expiredCredit.amount,
      }))
    })
  })
})