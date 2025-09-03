import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// 쿠폰 코드로 쿠폰 조회 및 유효성 검증
export const validateCoupon = query({
  args: { 
    code: v.string(),
    userId: v.optional(v.id("users")),
    orderAmount: v.optional(v.number()),
  },
  handler: async (ctx, { code, userId, orderAmount }) => {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("byCode", (q) => q.eq("code", code.toUpperCase()))
      .first();

    if (!coupon) {
      return { valid: false, error: "유효하지 않은 쿠폰 코드입니다." };
    }

    const now = new Date().toISOString();

    // 기본 유효성 검사
    if (!coupon.isActive) {
      return { valid: false, error: "비활성화된 쿠폰입니다." };
    }

    if (coupon.validFrom > now) {
      return { valid: false, error: "아직 사용할 수 없는 쿠폰입니다." };
    }

    if (coupon.validUntil && coupon.validUntil < now) {
      return { valid: false, error: "만료된 쿠폰입니다." };
    }

    // 사용 횟수 제한 확인
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, error: "사용 횟수가 초과된 쿠폰입니다." };
    }

    // 최소 주문 금액 확인
    if (orderAmount && coupon.minAmount && orderAmount < coupon.minAmount) {
      return { 
        valid: false, 
        error: `최소 주문 금액 ${coupon.minAmount / 100}원 이상이어야 합니다.` 
      };
    }

    // 사용자별 사용 횟수 제한 확인
    if (userId && coupon.userLimit) {
      const userUsageCount = await ctx.db
        .query("couponUsages")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("couponId"), coupon._id))
        .collect();

      if (userUsageCount.length >= coupon.userLimit) {
        return { valid: false, error: "이미 사용 한도에 도달한 쿠폰입니다." };
      }
    }

    // 할인 금액 계산
    let discountAmount = 0;
    if (orderAmount) {
      if (coupon.type === "percentage") {
        discountAmount = (orderAmount * coupon.value) / 100;
        if (coupon.maxDiscount) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscount);
        }
      } else if (coupon.type === "fixed_amount") {
        discountAmount = Math.min(coupon.value, orderAmount);
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
    };
  },
});

// 쿠폰 사용 기록
export const useCoupon = mutation({
  args: {
    userId: v.id("users"),
    couponCode: v.string(),
    orderId: v.optional(v.string()),
    subscriptionId: v.optional(v.id("subscriptions")),
    discountAmount: v.number(),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("byCode", (q) => q.eq("code", args.couponCode.toUpperCase()))
      .first();

    if (!coupon) {
      throw new Error("유효하지 않은 쿠폰 코드입니다.");
    }

    const now = new Date().toISOString();

    // 사용 기록 추가
    const usageId = await ctx.db.insert("couponUsages", {
      userId: args.userId,
      couponId: coupon._id,
      orderId: args.orderId,
      subscriptionId: args.subscriptionId,
      discountAmount: args.discountAmount,
      currency: args.currency,
      usedAt: now,
    });

    // 쿠폰 사용 횟수 업데이트
    await ctx.db.patch(coupon._id, {
      usageCount: coupon.usageCount + 1,
      updatedAt: now,
    });

    // 크레딧 타입 쿠폰인 경우 크레딧 지급
    if (coupon.type === "credits") {
      // credits.ts의 addCredits 함수를 직접 호출하는 대신
      // 여기서 직접 크레딧을 추가
      await ctx.db.insert("credits", {
        userId: args.userId,
        amount: coupon.value,
        type: "earned",
        description: `쿠폰 적용: ${coupon.name}`,
        relatedCouponId: coupon._id,
        createdAt: now,
      });
    }

    return usageId;
  },
});

// 사용자의 쿠폰 사용 내역 조회
export const getUserCouponUsages = query({
  args: { 
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 20 }) => {
    const usages = await ctx.db
      .query("couponUsages")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    // 쿠폰 정보와 함께 반환
    const usagesWithCoupons = await Promise.all(
      usages.map(async (usage) => {
        const coupon = await ctx.db.get(usage.couponId);
        return {
          ...usage,
          coupon: coupon ? {
            code: coupon.code,
            name: coupon.name,
            type: coupon.type,
          } : null,
        };
      })
    );

    return usagesWithCoupons;
  },
});

// 관리자용: 모든 쿠폰 조회
export const getAllCoupons = query({
  args: {
    isActive: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { isActive, limit = 100 }) => {
    if (isActive !== undefined) {
      const coupons = await ctx.db
        .query("coupons")
        .withIndex("byIsActive", (q) => q.eq("isActive", isActive))
        .order("desc")
        .take(limit);
      return coupons;
    }

    const coupons = await ctx.db
      .query("coupons")
      .order("desc")
      .take(limit);
    return coupons;
  },
});

// 관리자용: 쿠폰 생성
export const createCoupon = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(), // percentage, fixed_amount, credits
    value: v.number(),
    currency: v.optional(v.string()),
    minAmount: v.optional(v.number()),
    maxDiscount: v.optional(v.number()),
    usageLimit: v.optional(v.number()),
    userLimit: v.optional(v.number()),
    validFrom: v.string(),
    validUntil: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // 중복 코드 확인
    const existingCoupon = await ctx.db
      .query("coupons")
      .withIndex("byCode", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (existingCoupon) {
      throw new Error("이미 존재하는 쿠폰 코드입니다.");
    }

    const now = new Date().toISOString();

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
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });

    return couponId;
  },
});

// 관리자용: 쿠폰 업데이트
export const updateCoupon = mutation({
  args: {
    couponId: v.id("coupons"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      value: v.optional(v.number()),
      minAmount: v.optional(v.number()),
      maxDiscount: v.optional(v.number()),
      usageLimit: v.optional(v.number()),
      userLimit: v.optional(v.number()),
      validUntil: v.optional(v.string()),
      isActive: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { couponId, updates }) => {
    const now = new Date().toISOString();
    
    await ctx.db.patch(couponId, {
      ...updates,
      updatedAt: now,
    });

    return couponId;
  },
});

// 쿠폰 통계 조회
export const getCouponStats = query({
  args: { couponId: v.id("coupons") },
  handler: async (ctx, { couponId }) => {
    const coupon = await ctx.db.get(couponId);
    if (!coupon) {
      return null;
    }

    const usages = await ctx.db
      .query("couponUsages")
      .withIndex("byCouponId", (q) => q.eq("couponId", couponId))
      .collect();

    const totalUsages = usages.length;
    const totalDiscount = usages.reduce((sum, usage) => sum + usage.discountAmount, 0);
    const uniqueUsers = new Set(usages.map(usage => usage.userId)).size;

    // 일별 사용량
    const usagesByDate = usages.reduce((acc, usage) => {
      const date = usage.usedAt.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

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
    };
  },
});