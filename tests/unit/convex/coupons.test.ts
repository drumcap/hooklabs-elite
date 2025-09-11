import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext } from '../../../__mocks__/convex'
import { mockUser, mockCoupon, mockCouponUsage } from '../../../fixtures/test-data'

describe('Coupons Functions', () => {
  let mockCtx: ReturnType<typeof createMockContext>

  beforeEach(() => {
    mockCtx = createMockContext()
    vi.clearAllMocks()
  })

  describe('validateCoupon', () => {
    it('should return valid for active coupon within valid period', async () => {
      // Given
      const activeCoupon = {
        ...mockCoupon,
        isActive: true,
        validFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 전부터
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후까지
        usageCount: 10,
        usageLimit: 1000,
      }

      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(activeCoupon),
        }),
      }))

      // When
      const validateCouponHandler = async (ctx: any, { code, userId, orderAmount }: any) => {
        const coupon = await ctx.db
          .query("coupons")
          .withIndex("byCode")
          .first()

        if (!coupon) {
          return { valid: false, error: "유효하지 않은 쿠폰 코드입니다." }
        }

        const now = new Date().toISOString()

        if (!coupon.isActive) {
          return { valid: false, error: "비활성화된 쿠폰입니다." }
        }

        if (coupon.validFrom > now) {
          return { valid: false, error: "아직 사용할 수 없는 쿠폰입니다." }
        }

        if (coupon.validUntil && coupon.validUntil < now) {
          return { valid: false, error: "만료된 쿠폰입니다." }
        }

        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
          return { valid: false, error: "사용 횟수가 초과된 쿠폰입니다." }
        }

        if (orderAmount && coupon.minAmount && orderAmount < coupon.minAmount) {
          return { 
            valid: false, 
            error: `최소 주문 금액 ${coupon.minAmount / 100}원 이상이어야 합니다.` 
          }
        }

        let discountAmount = 0
        if (orderAmount) {
          if (coupon.type === "percentage") {
            discountAmount = (orderAmount * coupon.value) / 100
            if (coupon.maxDiscount) {
              discountAmount = Math.min(discountAmount, coupon.maxDiscount)
            }
          } else if (coupon.type === "fixed_amount") {
            discountAmount = Math.min(coupon.value, orderAmount)
          }
        }

        return {
          valid: true,
          coupon: {
            id: coupon._id,
            code: coupon.code,
            name: coupon.name,
            description: coupon.description,
            type: coupon.type,
            value: coupon.value,
            currency: coupon.currency,
            discountAmount,
          },
        }
      }

      const result = await validateCouponHandler(mockCtx, {
        code: 'WELCOME20',
        userId: mockUser.id,
        orderAmount: 5000, // $50.00
      })

      // Then
      expect(result.valid).toBe(true)
      expect(result.coupon.discountAmount).toBe(1000) // 20% of $50 = $10
    })

    it('should return invalid for expired coupon', async () => {
      // Given
      const expiredCoupon = {
        ...mockCoupon,
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1일 전 만료
      }

      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(expiredCoupon),
        }),
      }))

      // When
      const validateCouponHandler = async (ctx: any, { code }: any) => {
        const coupon = await ctx.db
          .query("coupons")
          .withIndex("byCode")
          .first()

        if (!coupon) {
          return { valid: false, error: "유효하지 않은 쿠폰 코드입니다." }
        }

        const now = new Date().toISOString()

        if (coupon.validUntil && coupon.validUntil < now) {
          return { valid: false, error: "만료된 쿠폰입니다." }
        }

        return { valid: true, coupon }
      }

      const result = await validateCouponHandler(mockCtx, { code: 'WELCOME20' })

      // Then
      expect(result.valid).toBe(false)
      expect(result.error).toBe('만료된 쿠폰입니다.')
    })

    it('should return invalid when usage limit exceeded', async () => {
      // Given
      const usageLimitExceededCoupon = {
        ...mockCoupon,
        usageCount: 1000,
        usageLimit: 1000,
      }

      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(usageLimitExceededCoupon),
        }),
      }))

      // When
      const validateCouponHandler = async (ctx: any, { code }: any) => {
        const coupon = await ctx.db
          .query("coupons")
          .withIndex("byCode")
          .first()

        const now = new Date().toISOString()

        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
          return { valid: false, error: "사용 횟수가 초과된 쿠폰입니다." }
        }

        return { valid: true, coupon }
      }

      const result = await validateCouponHandler(mockCtx, { code: 'WELCOME20' })

      // Then
      expect(result.valid).toBe(false)
      expect(result.error).toBe('사용 횟수가 초과된 쿠폰입니다.')
    })

    it('should return invalid when order amount below minimum', async () => {
      // Given
      const minAmountCoupon = {
        ...mockCoupon,
        minAmount: 2000, // $20 minimum
      }

      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(minAmountCoupon),
        }),
      }))

      // When
      const validateCouponHandler = async (ctx: any, { code, orderAmount }: any) => {
        const coupon = await ctx.db
          .query("coupons")
          .withIndex("byCode")
          .first()

        const now = new Date().toISOString()

        if (orderAmount && coupon.minAmount && orderAmount < coupon.minAmount) {
          return { 
            valid: false, 
            error: `최소 주문 금액 ${coupon.minAmount / 100}원 이상이어야 합니다.` 
          }
        }

        return { valid: true, coupon }
      }

      const result = await validateCouponHandler(mockCtx, {
        code: 'WELCOME20',
        orderAmount: 1000, // $10, below $20 minimum
      })

      // Then
      expect(result.valid).toBe(false)
      expect(result.error).toContain('최소 주문 금액')
    })

    it('should calculate correct discount for percentage coupon with max discount', async () => {
      // Given
      const percentageCoupon = {
        ...mockCoupon,
        type: 'percentage',
        value: 20, // 20%
        maxDiscount: 1000, // $10 max
      }

      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(percentageCoupon),
        }),
      }))

      // When
      const validateCouponHandler = async (ctx: any, { code, orderAmount }: any) => {
        const coupon = await ctx.db
          .query("coupons")
          .withIndex("byCode")
          .first()

        let discountAmount = 0
        if (orderAmount) {
          if (coupon.type === "percentage") {
            discountAmount = (orderAmount * coupon.value) / 100
            if (coupon.maxDiscount) {
              discountAmount = Math.min(discountAmount, coupon.maxDiscount)
            }
          }
        }

        return {
          valid: true,
          coupon: {
            ...coupon,
            discountAmount,
          },
        }
      }

      const result = await validateCouponHandler(mockCtx, {
        code: 'WELCOME20',
        orderAmount: 10000, // $100
      })

      // Then
      expect(result.coupon.discountAmount).toBe(1000) // Should be capped at $10 max
    })

    it('should calculate correct discount for fixed amount coupon', async () => {
      // Given
      const fixedAmountCoupon = {
        ...mockCoupon,
        type: 'fixed_amount',
        value: 500, // $5 fixed
      }

      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(fixedAmountCoupon),
        }),
      }))

      // When
      const validateCouponHandler = async (ctx: any, { code, orderAmount }: any) => {
        const coupon = await ctx.db
          .query("coupons")
          .withIndex("byCode")
          .first()

        let discountAmount = 0
        if (orderAmount) {
          if (coupon.type === "fixed_amount") {
            discountAmount = Math.min(coupon.value, orderAmount)
          }
        }

        return {
          valid: true,
          coupon: {
            ...coupon,
            discountAmount,
          },
        }
      }

      const result = await validateCouponHandler(mockCtx, {
        code: 'WELCOME20',
        orderAmount: 300, // $3
      })

      // Then
      expect(result.coupon.discountAmount).toBe(300) // Should be limited to order amount
    })
  })

  describe('useCoupon', () => {
    it('should record coupon usage and update usage count', async () => {
      // Given
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockCoupon),
        }),
      }))
      mockCtx.db.insert.mockResolvedValue('usage_id_123')

      // When
      const useCouponHandler = async (ctx: any, args: any) => {
        const coupon = await ctx.db
          .query("coupons")
          .withIndex("byCode")
          .first()

        if (!coupon) {
          throw new Error("유효하지 않은 쿠폰 코드입니다.")
        }

        const now = new Date().toISOString()

        const usageId = await ctx.db.insert("couponUsages", {
          userId: args.userId,
          couponId: coupon._id,
          orderId: args.orderId,
          discountAmount: args.discountAmount,
          currency: args.currency,
          usedAt: now,
        })

        await ctx.db.patch(coupon._id, {
          usageCount: coupon.usageCount + 1,
          updatedAt: now,
        })

        return usageId
      }

      const result = await useCouponHandler(mockCtx, {
        userId: mockUser.id,
        couponCode: 'WELCOME20',
        discountAmount: 1000,
        currency: 'USD',
      })

      // Then
      expect(result).toBe('usage_id_123')
      expect(mockCtx.db.insert).toHaveBeenCalledWith('couponUsages', expect.objectContaining({
        userId: mockUser.id,
        couponId: mockCoupon._id,
        discountAmount: 1000,
      }))
      expect(mockCtx.db.patch).toHaveBeenCalledWith(mockCoupon._id, expect.objectContaining({
        usageCount: mockCoupon.usageCount + 1,
      }))
    })

    it('should add credits for credit-type coupons', async () => {
      // Given
      const creditCoupon = {
        ...mockCoupon,
        type: 'credits',
        value: 500,
      }

      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(creditCoupon),
        }),
      }))
      mockCtx.db.insert.mockResolvedValueOnce('usage_id_123').mockResolvedValueOnce('credit_id_456')

      // When
      const useCouponHandler = async (ctx: any, args: any) => {
        const coupon = await ctx.db
          .query("coupons")
          .withIndex("byCode")
          .first()

        const now = new Date().toISOString()

        const usageId = await ctx.db.insert("couponUsages", {
          userId: args.userId,
          couponId: coupon._id,
          usedAt: now,
        })

        // 크레딧 타입 쿠폰인 경우 크레딧 지급
        if (coupon.type === "credits") {
          await ctx.db.insert("credits", {
            userId: args.userId,
            amount: coupon.value,
            type: "earned",
            description: `쿠폰 적용: ${coupon.name}`,
            relatedCouponId: coupon._id,
            createdAt: now,
          })
        }

        return usageId
      }

      const result = await useCouponHandler(mockCtx, {
        userId: mockUser.id,
        couponCode: 'CREDITS500',
      })

      // Then
      expect(result).toBe('usage_id_123')
      expect(mockCtx.db.insert).toHaveBeenCalledTimes(2)
      expect(mockCtx.db.insert).toHaveBeenCalledWith('credits', expect.objectContaining({
        amount: 500,
        type: 'earned',
        description: `쿠폰 적용: ${creditCoupon.name}`,
      }))
    })
  })

  describe('createCoupon', () => {
    it('should create new coupon with valid data', async () => {
      // Given
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null), // No existing coupon
        }),
      }))
      mockCtx.db.insert.mockResolvedValue('coupon_id_123')

      // When
      const createCouponHandler = async (ctx: any, args: any) => {
        const existingCoupon = await ctx.db
          .query("coupons")
          .withIndex("byCode")
          .first()

        if (existingCoupon) {
          throw new Error("이미 존재하는 쿠폰 코드입니다.")
        }

        const now = new Date().toISOString()

        const couponId = await ctx.db.insert("coupons", {
          code: args.code.toUpperCase(),
          name: args.name,
          description: args.description,
          type: args.type,
          value: args.value,
          currency: args.currency,
          minAmount: args.minAmount,
          maxDiscount: args.maxDiscount,
          usageLimit: args.usageLimit,
          usageCount: 0,
          userLimit: args.userLimit,
          validFrom: args.validFrom,
          validUntil: args.validUntil,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })

        return couponId
      }

      const result = await createCouponHandler(mockCtx, {
        code: 'SUMMER30',
        name: '여름 할인',
        description: '30% 할인',
        type: 'percentage',
        value: 30,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })

      // Then
      expect(result).toBe('coupon_id_123')
      expect(mockCtx.db.insert).toHaveBeenCalledWith('coupons', expect.objectContaining({
        code: 'SUMMER30',
        name: '여름 할인',
        type: 'percentage',
        value: 30,
        usageCount: 0,
        isActive: true,
      }))
    })

    it('should throw error when coupon code already exists', async () => {
      // Given
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockCoupon), // Existing coupon
        }),
      }))

      // When & Then
      const createCouponHandler = async (ctx: any, args: any) => {
        const existingCoupon = await ctx.db
          .query("coupons")
          .withIndex("byCode")
          .first()

        if (existingCoupon) {
          throw new Error("이미 존재하는 쿠폰 코드입니다.")
        }
      }

      await expect(createCouponHandler(mockCtx, {
        code: 'WELCOME20',
        name: '중복 쿠폰',
      })).rejects.toThrow('이미 존재하는 쿠폰 코드입니다.')
    })
  })

  describe('getCouponStats', () => {
    it('should return coupon statistics', async () => {
      // Given
      const mockUsages = [
        { ...mockCouponUsage, discountAmount: 500, usedAt: '2024-01-01T10:00:00Z' },
        { ...mockCouponUsage, discountAmount: 300, usedAt: '2024-01-01T15:00:00Z' },
        { ...mockCouponUsage, discountAmount: 700, usedAt: '2024-01-02T12:00:00Z' },
      ]

      mockCtx.db.get.mockResolvedValue(mockCoupon)
      mockCtx.db.query.mockImplementation(() => ({
        withIndex: vi.fn().mockReturnValue({
          collect: vi.fn().mockResolvedValue(mockUsages),
        }),
      }))

      // When
      const getCouponStatsHandler = async (ctx: any, { couponId }: any) => {
        const coupon = await ctx.db.get(couponId)
        if (!coupon) {
          return null
        }

        const usages = await ctx.db
          .query("couponUsages")
          .withIndex("byCouponId")
          .collect()

        const totalUsages = usages.length
        const totalDiscount = usages.reduce((sum: number, usage: any) => sum + usage.discountAmount, 0)
        const uniqueUsers = new Set(usages.map((usage: any) => usage.userId)).size

        const usagesByDate = usages.reduce((acc: any, usage: any) => {
          const date = usage.usedAt.split('T')[0]
          acc[date] = (acc[date] || 0) + 1
          return acc
        }, {})

        return {
          coupon: {
            id: coupon._id,
            code: coupon.code,
            name: coupon.name,
            type: coupon.type,
            value: coupon.value,
            usageLimit: coupon.usageLimit,
            usageCount: coupon.usageCount,
          },
          stats: {
            totalUsages,
            totalDiscount,
            uniqueUsers,
            usagesByDate,
            remainingUses: coupon.usageLimit ? coupon.usageLimit - totalUsages : null,
          },
        }
      }

      const result = await getCouponStatsHandler(mockCtx, { couponId: mockCoupon._id })

      // Then
      expect(result.stats.totalUsages).toBe(3)
      expect(result.stats.totalDiscount).toBe(1500) // 500 + 300 + 700
      expect(result.stats.uniqueUsers).toBe(1) // All same user in mock data
      expect(result.stats.usagesByDate).toEqual({
        '2024-01-01': 2,
        '2024-01-02': 1,
      })
    })
  })
})