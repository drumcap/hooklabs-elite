/**
 * Analytics 관련 내부 함수들
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// 세션 업데이트
export const updateSession = internalMutation({
  args: {
    sessionId: v.string(),
    pageUrl: v.string(),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    // 세션 추적 로직
    const existing = await ctx.db
      .query("sessions")
      .withIndex("bySessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        lastPageUrl: args.pageUrl,
        lastActivityAt: args.timestamp,
        pageCount: (existing.pageCount || 0) + 1,
      });
    } else {
      await ctx.db.insert("sessions", {
        sessionId: args.sessionId,
        firstPageUrl: args.pageUrl,
        lastPageUrl: args.pageUrl,
        startedAt: args.timestamp,
        lastActivityAt: args.timestamp,
        pageCount: 1,
      });
    }
  },
});

// 페이지 뷰 증가
export const incrementPageView = internalMutation({
  args: {
    url: v.string(),
    referrer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0];
    const key = `${today}_${args.url}`;
    
    const existing = await ctx.db
      .query("pageViews")
      .withIndex("byKey", (q) => q.eq("key", key))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        count: existing.count + 1,
      });
    } else {
      await ctx.db.insert("pageViews", {
        key,
        url: args.url,
        date: today,
        count: 1,
        referrers: args.referrer ? [args.referrer] : [],
      });
    }
  },
});

// 사용자 액션 추적
export const trackUserAction = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    metadata: v.optional(v.any()),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("userActions", {
      ...args,
    });
    
    // 사용자 활동 요약 업데이트
    const today = new Date().toISOString().split('T')[0];
    const summaryKey = `${args.userId}_${today}`;
    
    const existing = await ctx.db
      .query("userActivitySummary")
      .withIndex("byKey", (q) => q.eq("key", summaryKey))
      .first();
    
    if (existing) {
      const actions = existing.actions || {};
      actions[args.action] = (actions[args.action] || 0) + 1;
      
      await ctx.db.patch(existing._id, {
        actions,
        lastActivityAt: args.timestamp,
        totalActions: existing.totalActions + 1,
      });
    } else {
      await ctx.db.insert("userActivitySummary", {
        key: summaryKey,
        userId: args.userId,
        date: today,
        actions: { [args.action]: 1 },
        totalActions: 1,
        lastActivityAt: args.timestamp,
      });
    }
  },
});