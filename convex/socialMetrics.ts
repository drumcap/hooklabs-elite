/**
 * 소셜 미디어 메트릭 관련 내부 함수들
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// 포스트 메트릭 초기화
export const initializePostMetrics = internalMutation({
  args: {
    postId: v.id("socialPosts"),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("socialMetrics")
      .withIndex("byPostId", (q) => q.eq("postId", args.postId))
      .first();
    
    if (!existing) {
      await ctx.db.insert("socialMetrics", {
        postId: args.postId,
        platform: args.platform,
        metrics: {
          views: 0,
          likes: 0,
          replies: 0,
        },
        engagementRate: 0,
        fetchedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
  },
});

// 참여 메트릭 업데이트
export const updateEngagement = internalMutation({
  args: {
    postId: v.id("socialPosts"),
    type: v.string(), // views, likes, replies
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
        case 'replies':
          newMetrics.replies = (newMetrics.replies || 0) + args.count;
          break;
      }
      
      // 참여율 재계산
      const engagementRate = newMetrics.views > 0
        ? ((newMetrics.likes + newMetrics.replies) / newMetrics.views) * 100
        : 0;
      
      await ctx.db.patch(metric._id, {
        metrics: newMetrics,
        engagementRate: Math.round(engagementRate * 100) / 100,
        fetchedAt: new Date().toISOString(),
      });
    }
  },
});

