/**
 * Analytics 관련 내부 함수들
 */

import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { getAuthUserId } from "./auth";

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

// 대시보드 통계 조회
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 기본 통계 데이터
    const stats = {
      totalPosts: 0,
      scheduledPosts: 0,
      totalViews: 0,
      totalLikes: 0,
      totalEngagement: 0,
      successRate: 0,
      platformStats: {} as Record<string, number>,
      recentActivity: [] as any[],
    };

    try {
      // 사용자의 소셜 게시물 수 조회
      const userPosts = await ctx.db
        .query("socialPosts")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .collect();
      
      stats.totalPosts = userPosts.length;

      // 스케줄링된 게시물 수 조회
      const userPostIds = userPosts.map(post => post._id);
      const scheduledPosts = await ctx.db
        .query("scheduledPosts")
        .collect();
      
      const userScheduledPosts = scheduledPosts.filter(schedule => 
        userPostIds.includes(schedule.postId)
      );
      
      stats.scheduledPosts = userScheduledPosts.length;

      // 플랫폼별 통계
      userPosts.forEach(post => {
        if (post.platforms && Array.isArray(post.platforms)) {
          post.platforms.forEach(platform => {
            stats.platformStats[platform] = (stats.platformStats[platform] || 0) + 1;
          });
        }
      });

      // 성공률 계산 (발행된 게시물 기준)
      const publishedPosts = userScheduledPosts.filter(s => s.status === "published");
      if (userScheduledPosts.length > 0) {
        stats.successRate = Math.round((publishedPosts.length / userScheduledPosts.length) * 100);
      }

      // 최근 활동 (간단한 더미 데이터)
      stats.recentActivity = [
        { action: "post_created", timestamp: new Date().toISOString(), count: userPosts.length },
        { action: "posts_scheduled", timestamp: new Date().toISOString(), count: stats.scheduledPosts },
      ];

    } catch (error) {
      console.error("대시보드 통계 조회 중 오류:", error);
      // 오류 발생 시 기본값 반환
    }

    return stats;
  },
});
