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

// 분석 개요 조회
export const getOverview = query({
  args: {
    timeRange: v.string(),
    platform: v.optional(v.string()),
  },
  handler: async (ctx, { timeRange, platform }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 시간 범위 계산
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const startDateStr = startDate.toISOString();

    // 사용자의 소셜 게시물 조회 (시간 범위 내)
    const userPosts = await ctx.db
      .query("socialPosts")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("createdAt"), startDateStr))
      .collect();

    // 플랫폼 필터링
    const filteredPosts = platform && platform !== "all"
      ? userPosts.filter(post => post.platforms?.includes(platform))
      : userPosts;

    // 기본 통계
    const overview = {
      totalPosts: filteredPosts.length,
      publishedPosts: 0,
      totalImpressions: 0,
      totalEngagements: 0,
      engagementRate: 0,
      followerGrowth: 0,
      topPlatforms: [] as Array<{ name: string; count: number; percentage: number }>,
      dailyStats: [] as Array<{ date: string; posts: number; engagement: number }>,
      topPerformingPosts: [] as any[],
    };

    // 스케줄링된/발행된 게시물 통계
    const userPostIds = filteredPosts.map(post => post._id);
    const scheduledPosts = await ctx.db
      .query("scheduledPosts")
      .collect();
    
    const userScheduledPosts = scheduledPosts.filter(schedule => 
      userPostIds.includes(schedule.postId)
    );

    overview.publishedPosts = userScheduledPosts.filter(s => s.status === "published").length;

    // 플랫폼별 통계
    const platformStats: Record<string, number> = {};
    filteredPosts.forEach(post => {
      if (post.platforms && Array.isArray(post.platforms)) {
        post.platforms.forEach(p => {
          platformStats[p] = (platformStats[p] || 0) + 1;
        });
      }
    });

    const totalPlatformPosts = Object.values(platformStats).reduce((sum, count) => sum + count, 0);
    overview.topPlatforms = Object.entries(platformStats)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalPlatformPosts > 0 ? Math.round((count / totalPlatformPosts) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 일별 통계 (더미 데이터)
    const days = Math.min(30, Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayPosts = filteredPosts.filter(post => 
        post.createdAt.startsWith(dateStr)
      );
      
      overview.dailyStats.push({
        date: dateStr,
        posts: dayPosts.length,
        engagement: Math.floor(Math.random() * 1000), // 더미 데이터
      });
    }

    // 상위 성과 게시물 (더미 데이터)
    overview.topPerformingPosts = filteredPosts
      .slice(0, 5)
      .map(post => ({
        id: post._id,
        content: post.finalContent.substring(0, 100) + "...",
        platform: post.platforms?.[0] || "unknown",
        engagement: Math.floor(Math.random() * 1000),
        impressions: Math.floor(Math.random() * 10000),
      }));

    return overview;
  },
});

// 인게이지먼트 데이터 조회
export const getEngagement = query({
  args: {
    timeRange: v.string(),
  },
  handler: async (ctx, { timeRange }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 시간 범위 계산
    const now = new Date();
    let days: number;
    
    switch (timeRange) {
      case "7d":
        days = 7;
        break;
      case "30d":
        days = 30;
        break;
      case "90d":
        days = 90;
        break;
      default:
        days = 30;
    }

    // 일별 인게이지먼트 데이터 (더미 데이터)
    const engagementData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      engagementData.push({
        date: dateStr,
        likes: Math.floor(Math.random() * 500),
        comments: Math.floor(Math.random() * 100),
        shares: Math.floor(Math.random() * 50),
        impressions: Math.floor(Math.random() * 5000),
        engagementRate: Math.floor(Math.random() * 10),
      });
    }

    return {
      data: engagementData,
      summary: {
        totalLikes: engagementData.reduce((sum, day) => sum + day.likes, 0),
        totalComments: engagementData.reduce((sum, day) => sum + day.comments, 0),
        totalShares: engagementData.reduce((sum, day) => sum + day.shares, 0),
        totalImpressions: engagementData.reduce((sum, day) => sum + day.impressions, 0),
        averageEngagementRate: Math.round(
          engagementData.reduce((sum, day) => sum + day.engagementRate, 0) / engagementData.length
        ),
      }
    };
  },
});

// 상위 성과 게시물 조회
export const getTopPosts = query({
  args: {
    limit: v.number(),
    timeRange: v.string(),
  },
  handler: async (ctx, { limit, timeRange }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 시간 범위 계산
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const startDateStr = startDate.toISOString();

    // 사용자의 소셜 게시물 조회
    const userPosts = await ctx.db
      .query("socialPosts")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("createdAt"), startDateStr))
      .collect();

    // 더미 데이터로 상위 성과 게시물 생성
    const topPosts = userPosts
      .slice(0, limit)
      .map(post => ({
        id: post._id,
        content: post.finalContent.length > 100 
          ? post.finalContent.substring(0, 100) + "..."
          : post.finalContent,
        platforms: post.platforms || [],
        createdAt: post.createdAt,
        metrics: {
          likes: Math.floor(Math.random() * 1000),
          comments: Math.floor(Math.random() * 200),
          shares: Math.floor(Math.random() * 100),
          impressions: Math.floor(Math.random() * 10000),
        },
        engagementRate: Math.floor(Math.random() * 15),
        status: post.status,
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate);

    return topPosts;
  },
});
