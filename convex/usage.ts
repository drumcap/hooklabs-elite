import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// 사용자의 현재 사용량 조회
export const getUserUsage = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // 현재 월의 시작과 끝 날짜 계산
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // 사용자의 활성 구독 조회
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!subscription) {
      return null;
    }

    // 현재 기간의 사용량 집계
    const usageRecords = await ctx.db
      .query("usageRecords")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("recordedAt"), periodStart),
          q.lte(q.field("recordedAt"), periodEnd)
        )
      )
      .collect();

    // 리소스 타입별 사용량 집계
    const usageByType = usageRecords.reduce((acc, record) => {
      const type = record.resourceType;
      if (!acc[type]) {
        acc[type] = { amount: 0, unit: record.unit, records: [] };
      }
      acc[type].amount += record.amount;
      acc[type].records.push(record);
      return acc;
    }, {} as Record<string, { amount: number; unit: string; records: any[] }>);

    return {
      subscription: {
        id: subscription._id,
        planName: subscription.planName,
        usageLimit: subscription.usageLimit || 0,
        currentUsage: subscription.currentUsage || 0,
        usageUnit: subscription.usageUnit || "requests",
        overage: subscription.overage || 0,
        overageRate: subscription.overageRate || 0,
      },
      periodStart,
      periodEnd,
      totalUsage: usageRecords.reduce((sum, record) => sum + record.amount, 0),
      usageByType,
      usageRecords: usageRecords.slice(-20), // 최근 20개 기록
    };
  },
});

// 사용량 기록 추가
export const recordUsage = mutation({
  args: {
    userId: v.id("users"),
    resourceType: v.string(),
    amount: v.number(),
    unit: v.string(),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // 사용자의 활성 구독 조회
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    // 사용량 기록 생성
    const usageId = await ctx.db.insert("usageRecords", {
      userId: args.userId,
      subscriptionId: subscription?._id,
      resourceType: args.resourceType,
      amount: args.amount,
      unit: args.unit,
      description: args.description,
      metadata: args.metadata,
      recordedAt: now.toISOString(),
      periodStart,
      periodEnd,
    });

    // 구독이 있다면 현재 사용량 업데이트
    if (subscription) {
      const currentUsage = (subscription.currentUsage || 0) + args.amount;
      const usageLimit = subscription.usageLimit || 0;
      const overage = Math.max(0, currentUsage - usageLimit);

      await ctx.db.patch(subscription._id, {
        currentUsage,
        overage,
        updatedAt: now.toISOString(),
      });
    }

    return usageId;
  },
});

// 사용량 통계 조회 (관리자용)
export const getUsageStats = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30일 전
    const end = endDate || new Date().toISOString();

    // 기간 내 모든 사용량 기록
    const allRecords = await ctx.db
      .query("usageRecords")
      .withIndex("byRecordedAt")
      .filter((q) => 
        q.and(
          q.gte(q.field("recordedAt"), start),
          q.lte(q.field("recordedAt"), end)
        )
      )
      .collect();

    // 총 사용량
    const totalUsage = allRecords.reduce((sum, record) => sum + record.amount, 0);

    // 리소스 타입별 사용량
    const usageByType = allRecords.reduce((acc, record) => {
      const type = record.resourceType;
      acc[type] = (acc[type] || 0) + record.amount;
      return acc;
    }, {} as Record<string, number>);

    // 일별 사용량
    const usageByDate = allRecords.reduce((acc, record) => {
      const date = record.recordedAt.split('T')[0];
      acc[date] = (acc[date] || 0) + record.amount;
      return acc;
    }, {} as Record<string, number>);

    // 활성 사용자 수
    const activeUsers = new Set(allRecords.map(record => record.userId)).size;

    return {
      totalUsage,
      totalRecords: allRecords.length,
      activeUsers,
      usageByType,
      usageByDate,
      periodStart: start,
      periodEnd: end,
    };
  },
});

// 사용량 리셋 (월간 청구 주기 시작 시)
export const resetUserUsage = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!subscription) {
      return null;
    }

    const now = new Date().toISOString();
    
    await ctx.db.patch(subscription._id, {
      currentUsage: 0,
      overage: 0,
      resetDate: now,
      updatedAt: now,
    });

    return subscription._id;
  },
});

// 사용량 한도 경고 확인
export const checkUsageAlerts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!subscription || !subscription.usageLimit) {
      return [];
    }

    const currentUsage = subscription.currentUsage || 0;
    const usageLimit = subscription.usageLimit;
    const usagePercentage = (currentUsage / usageLimit) * 100;

    const alerts = [];

    if (usagePercentage >= 100) {
      alerts.push({
        type: "over_limit",
        severity: "error",
        message: "사용량이 한도를 초과했습니다.",
        usage: currentUsage,
        limit: usageLimit,
        percentage: usagePercentage,
      });
    } else if (usagePercentage >= 90) {
      alerts.push({
        type: "near_limit",
        severity: "warning", 
        message: "사용량이 한도의 90%에 도달했습니다.",
        usage: currentUsage,
        limit: usageLimit,
        percentage: usagePercentage,
      });
    } else if (usagePercentage >= 75) {
      alerts.push({
        type: "approaching_limit",
        severity: "info",
        message: "사용량이 한도의 75%에 도달했습니다.",
        usage: currentUsage,
        limit: usageLimit,
        percentage: usagePercentage,
      });
    }

    return alerts;
  },
});