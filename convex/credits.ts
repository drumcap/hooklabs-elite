import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { InsufficientCreditsError, NotFoundError, withErrorHandling } from "./lib/errors";

// 사용자의 크레딧 잔액 조회
export const getUserCreditBalance = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // 집계 테이블에서 잔액 조회
    const balance = await ctx.db
      .query("userCreditBalances")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .first();

    if (balance) {
      return balance;
    }

    // 집계 테이블이 없으면 실시간 계산
    const credits = await ctx.db
      .query("credits")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .collect();

    const now = new Date().toISOString();
    
    const totalCredits = credits
      .filter((c: any) => c.type !== "expired")
      .reduce((sum: number, credit: any) => sum + credit.amount, 0);

    const availableCredits = credits
      .filter((c: any) => 
        c.type !== "expired" && 
        (!c.expiresAt || c.expiresAt > now)
      )
      .reduce((sum: number, credit: any) => sum + credit.amount, 0);

    const usedCredits = credits
      .filter((c: any) => c.type === "used")
      .reduce((sum: number, credit: any) => sum + Math.abs(credit.amount), 0);

    const expiredCredits = credits
      .filter((c: any) => c.type === "expired" || (c.expiresAt && c.expiresAt <= now))
      .reduce((sum: number, credit: any) => sum + Math.abs(credit.amount), 0);

    return {
      userId,
      totalCredits,
      availableCredits: Math.max(0, availableCredits),
      usedCredits,
      expiredCredits,
      lastUpdated: now,
    };
  },
});

// 크레딧 추가 (구매, 적립 등)
export const addCredits = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    type: v.string(), // earned, purchased, bonus, refunded
    description: v.string(),
    expiresAt: v.optional(v.string()),
    relatedOrderId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // 크레딧 기록 추가
    const creditId = await ctx.db.insert("credits", {
      userId: args.userId,
      amount: args.amount,
      type: args.type,
      description: args.description,
      expiresAt: args.expiresAt,
      relatedOrderId: args.relatedOrderId,
      metadata: args.metadata,
      createdAt: now,
    });

    // 집계 테이블 업데이트
    await updateCreditBalance(ctx, args.userId);

    return creditId;
  },
});

// 크레딧 사용
export const useCredits = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    description: v.string(),
    relatedOrderId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const balance = await ctx.db
      .query("userCreditBalances")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .first();

    if (!balance) {
      throw new NotFoundError("크레딧 잔액", args.userId);
    }
    
    if (balance.availableCredits < args.amount) {
      throw new InsufficientCreditsError(args.amount, balance.availableCredits);
    }

    const now = new Date().toISOString();

    // 크레딧 사용 기록
    const creditId = await ctx.db.insert("credits", {
      userId: args.userId,
      amount: -args.amount, // 음수로 저장
      type: "used",
      description: args.description,
      relatedOrderId: args.relatedOrderId,
      metadata: args.metadata,
      createdAt: now,
    });

    // 집계 테이블 업데이트
    await updateCreditBalance(ctx, args.userId);

    return creditId;
  },
});

// 크레딧 내역 조회
export const getCreditHistory = query({
  args: { 
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 50 }) => {
    const credits = await ctx.db
      .query("credits")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return credits;
  },
});

// 만료 예정 크레딧 조회
export const getExpiringCredits = query({
  args: {
    userId: v.id("users"),
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, { userId, daysAhead = 7 }) => {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

    const expiringCredits = await ctx.db
      .query("credits")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .filter((q) => 
        q.and(
          q.neq(q.field("type"), "used"),
          q.neq(q.field("type"), "expired"),
          q.lte(q.field("expiresAt"), expiryDate),
          q.gt(q.field("expiresAt"), now.toISOString())
        )
      )
      .collect();

    return expiringCredits;
  },
});

// 만료된 크레딧 처리 (일일 작업용)
export const expireCredits = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    
    // 만료된 크레딧 조회
    const expiredCredits = await ctx.db
      .query("credits")
      .withIndex("byExpiresAt")
      .filter((q) => 
        q.and(
          q.lt(q.field("expiresAt"), now),
          q.neq(q.field("type"), "expired")
        )
      )
      .collect();

    const processedUserIds = new Set<string>();

    for (const credit of expiredCredits) {
      // 만료 기록 추가
      await ctx.db.insert("credits", {
        userId: credit.userId,
        amount: -credit.amount,
        type: "expired",
        description: `크레딧 만료: ${credit.description}`,
        createdAt: now,
      });

      processedUserIds.add(credit.userId);
    }

    // 영향받은 사용자들의 잔액 업데이트
    for (const userId of processedUserIds) {
      await updateCreditBalance(ctx, userId as any);
    }

    return {
      expiredCount: expiredCredits.length,
      affectedUsers: processedUserIds.size,
    };
  },
});

// 내부 함수: 크레딧 잔액 집계 업데이트
async function updateCreditBalance(ctx: any, userId: any) {
  const credits = await ctx.db
    .query("credits")
    .withIndex("byUserId", (q: any) => q.eq("userId", userId))
    .collect();

  const now = new Date().toISOString();
  
  const totalCredits = credits
    .filter((c: any) => c.type !== "expired")
    .reduce((sum: number, credit: any) => sum + credit.amount, 0);

  const availableCredits = credits
    .filter((c: any) => 
      c.type !== "expired" && 
      c.amount > 0 &&
      (!c.expiresAt || c.expiresAt > now)
    )
    .reduce((sum: number, credit: any) => sum + credit.amount, 0);

  const usedCredits = credits
    .filter((c: any) => c.type === "used")
    .reduce((sum: number, credit: any) => sum + Math.abs(credit.amount), 0);

  const expiredCredits = credits
    .filter((c: any) => c.type === "expired")
    .reduce((sum: number, credit: any) => sum + Math.abs(credit.amount), 0);

  // 기존 잔액 레코드 확인
  const existingBalance = await ctx.db
    .query("userCreditBalances")
    .withIndex("byUserId", (q: any) => q.eq("userId", userId))
    .first();

  const balanceData = {
    totalCredits,
    availableCredits: Math.max(0, availableCredits),
    usedCredits,
    expiredCredits,
    lastUpdated: now,
  };

  if (existingBalance) {
    await ctx.db.patch(existingBalance._id, balanceData);
  } else {
    await ctx.db.insert("userCreditBalances", {
      userId,
      ...balanceData,
    });
  }
}

// 간단한 잔액 조회 함수 (대시보드 사이드바용) - 인증된 사용자 자동 감지
export const getBalance = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("인증되지 않은 사용자입니다.");
    }

    // 외부 ID로 사용자 찾기
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .first();

    if (!user) {
      // 사용자가 없으면 기본값 반환 (신규 사용자일 수 있음)
      return {
        availableCredits: 0,
        totalCredits: 0,
        usedCredits: 0,
        expiredCredits: 0,
      };
    }

    const balance = await ctx.db
      .query("userCreditBalances")
      .withIndex("byUserId", (q: any) => q.eq("userId", user._id))
      .first();

    if (balance) {
      return {
        availableCredits: balance.availableCredits,
        totalCredits: balance.totalCredits,
        usedCredits: balance.usedCredits,
        expiredCredits: balance.expiredCredits,
      };
    }

    // 집계 테이블이 없으면 기본값 반환
    return {
      availableCredits: 0,
      totalCredits: 0,
      usedCredits: 0,
      expiredCredits: 0,
    };
  },
});

// 사용량 통계 조회 (인증된 사용자 자동 감지)
export const getUsageStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("인증되지 않은 사용자입니다.");
    }

    // 외부 ID로 사용자 찾기
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .first();

    if (!user) {
      return {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        average: 0,
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 사용된 크레딧 내역 조회
    const usedCredits = await ctx.db
      .query("credits")
      .withIndex("byUserId", (q: any) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("type"), "used"))
      .collect();

    const todayUsage = usedCredits
      .filter((c) => c.createdAt >= today)
      .reduce((sum, c) => sum + Math.abs(c.amount), 0);

    const thisWeekUsage = usedCredits
      .filter((c) => c.createdAt >= thisWeekStart)
      .reduce((sum, c) => sum + Math.abs(c.amount), 0);

    const thisMonthUsage = usedCredits
      .filter((c) => c.createdAt >= thisMonthStart)
      .reduce((sum, c) => sum + Math.abs(c.amount), 0);

    // 일평균 계산 (지난 30일 기준)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const last30DaysUsage = usedCredits
      .filter((c) => c.createdAt >= thirtyDaysAgo)
      .reduce((sum, c) => sum + Math.abs(c.amount), 0);
    
    const average = Math.round(last30DaysUsage / 30);

    return {
      today: todayUsage,
      thisWeek: thisWeekUsage,
      thisMonth: thisMonthUsage,
      average,
    };
  },
});

// 최근 크레딧 거래 내역 조회 (인증된 사용자 자동 감지)
export const getRecentTransactions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("인증되지 않은 사용자입니다.");
    }

    // 외부 ID로 사용자 찾기
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    const transactions = await ctx.db
      .query("credits")
      .withIndex("byUserId", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return transactions.map((transaction) => ({
      _id: transaction._id,
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description,
      createdAt: transaction.createdAt,
      relatedOrderId: transaction.relatedOrderId,
      metadata: transaction.metadata,
    }));
  },
});

// Internal mutations for avoiding circular references
export const useCreditsInternal = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    description: v.string(),
    relatedOrderId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const balance = await ctx.db
      .query("userCreditBalances")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .first();

    if (!balance) {
      throw new NotFoundError("크레딧 잔액", args.userId);
    }
    
    if (balance.availableCredits < args.amount) {
      throw new InsufficientCreditsError(args.amount, balance.availableCredits);
    }

    const now = new Date().toISOString();

    // 크레딧 사용 기록
    const creditId = await ctx.db.insert("credits", {
      userId: args.userId,
      amount: -args.amount, // 음수로 저장
      type: "used",
      description: args.description,
      relatedOrderId: args.relatedOrderId,
      metadata: args.metadata,
      createdAt: now,
    });

    // 집계 테이블 업데이트
    await updateCreditBalance(ctx, args.userId);

    return creditId;
  },
});

// Internal query for checking credit balance
export const getBalanceInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const balance = await ctx.db
      .query("userCreditBalances")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .first();
    
    return balance || { availableCredits: 0 };
  },
});