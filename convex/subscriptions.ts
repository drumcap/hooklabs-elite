import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// 사용자의 활성 구독 조회
export const getUserSubscription = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .first();
    
    return subscription;
  },
});

// 사용자의 모든 구독 내역 조회
export const getUserSubscriptions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();
    
    return subscriptions;
  },
});

// 구독 상태 확인 (플랜 기반 접근 제어용) - Convex 내부 ID 사용
export const hasActiveSubscription = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    
    return !!subscription;
  },
});

// 구독 상태 확인 (Clerk external ID 사용)
export const hasActiveSubscriptionByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    // 먼저 Clerk external ID로 사용자를 찾기
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
      .unique();
    
    if (!user) {
      return false;
    }
    
    // 사용자의 활성 구독 확인
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    
    return !!subscription;
  },
});

// 특정 플랜에 대한 구독 확인
export const hasSubscriptionToPlan = query({
  args: { 
    userId: v.id("users"), 
    planName: v.string(),
  },
  handler: async (ctx, { userId, planName }) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("planName"), planName)
        )
      )
      .first();
    
    return !!subscription;
  },
});

// 구독 정보 업데이트 (내부용 - webhook에서 사용)
export const updateSubscription = mutation({
  args: {
    lemonSqueezySubscriptionId: v.string(),
    updateData: v.any(),
  },
  handler: async (ctx, { lemonSqueezySubscriptionId, updateData }) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("byLemonSqueezyId", (q) => 
        q.eq("lemonSqueezySubscriptionId", lemonSqueezySubscriptionId)
      )
      .unique();

    if (subscription) {
      await ctx.db.patch(subscription._id, updateData);
      return subscription._id;
    }
    
    return null;
  },
});

// 사용자의 결제 내역 조회
export const getUserPayments = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10); // 최근 10개만
    
    return payments;
  },
});

// 사용자의 라이센스 조회
export const getUserLicenses = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const licenses = await ctx.db
      .query("licenses")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    
    return licenses;
  },
});

// 관리자용: 모든 구독 통계
export const getSubscriptionStats = query({
  args: {},
  handler: async (ctx) => {
    const allSubscriptions = await ctx.db.query("subscriptions").collect();
    
    const stats = {
      total: allSubscriptions.length,
      active: allSubscriptions.filter(s => s.status === "active").length,
      cancelled: allSubscriptions.filter(s => s.status === "cancelled").length,
      expired: allSubscriptions.filter(s => s.status === "expired").length,
      trialCount: allSubscriptions.filter(s => s.status === "on_trial").length,
    };
    
    return stats;
  },
});