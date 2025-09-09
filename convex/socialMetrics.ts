/**
 * 소셜 미디어 메트릭 관련 내부 함수들
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// 포스트 메트릭 초기화
export const initializePostMetrics = internalMutation({
  args: {
    postId: v.string(),
    platform: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("socialMetrics")
      .withIndex("byPostId", (q) => q.eq("postId", args.postId))
      .first();
    
    if (!existing) {
      await ctx.db.insert("socialMetrics", {
        postId: args.postId,
        platform: args.platform as any,
        userId: args.userId,
        postVariantId: undefined,
        metrics: {
          views: 0,
          likes: 0,
          shares: 0,
          comments: 0,
          clicks: 0,
        },
        engagementRate: 0,
        viralityScore: 0,
        recordedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
  },
});

// 참여 메트릭 업데이트
export const updateEngagement = internalMutation({
  args: {
    postId: v.string(),
    type: v.string(), // views, likes, shares, comments
    count: v.number(),
  },
  handler: async (ctx, args) => {
    const metric = await ctx.db
      .query("socialMetrics")
      .withIndex("byPostId", (q) => q.eq("postId", args.postId))
      .first();
    
    if (metric) {
      const newMetrics = { ...metric.metrics };
      
      // 메트릭 타입에 따라 업데이트
      switch (args.type) {
        case 'views':
          newMetrics.views = (newMetrics.views || 0) + args.count;
          break;
        case 'likes':
          newMetrics.likes = (newMetrics.likes || 0) + args.count;
          break;
        case 'shares':
          newMetrics.shares = (newMetrics.shares || 0) + args.count;
          break;
        case 'comments':
          newMetrics.comments = (newMetrics.comments || 0) + args.count;
          break;
        case 'clicks':
          newMetrics.clicks = (newMetrics.clicks || 0) + args.count;
          break;
      }
      
      // 참여율 재계산
      const engagementRate = newMetrics.views > 0
        ? ((newMetrics.likes + newMetrics.shares + newMetrics.comments) / newMetrics.views) * 100
        : 0;
      
      // 바이럴 점수 계산 (간단한 공식)
      const viralityScore = calculateViralityScore(newMetrics);
      
      await ctx.db.patch(metric._id, {
        metrics: newMetrics,
        engagementRate: Math.round(engagementRate * 100) / 100,
        viralityScore,
        recordedAt: new Date().toISOString(),
      });
    }
  },
});

// 바이럴 점수 계산
function calculateViralityScore(metrics: any): number {
  const weights = {
    views: 0.1,
    likes: 0.3,
    shares: 0.4,
    comments: 0.2,
  };
  
  const score = 
    (metrics.views || 0) * weights.views +
    (metrics.likes || 0) * weights.likes +
    (metrics.shares || 0) * weights.shares +
    (metrics.comments || 0) * weights.comments;
  
  // 0-100 범위로 정규화
  return Math.min(100, Math.round(score / 10));
}