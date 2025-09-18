/**
 * 분석 및 리포팅 관련 스키마 정의
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// 페이지 뷰
export const pageViews = defineTable({
  key: v.string(), // date_url
  url: v.string(),
  date: v.string(),
  count: v.number(),
  referrers: v.array(v.string()),
})
  .index("byKey", ["key"])
  .index("byDate", ["date"])
  .index("byUrl", ["url"]);

// 분석 및 인사이트
export const postAnalytics = defineTable({
  postId: v.id("socialPosts"),
  userId: v.id("users"),
  platform: v.string(),
  metrics: v.object({
    impressions: v.number(),
    engagements: v.number(),
    likes: v.number(),
    shares: v.number(),
    comments: v.number(),
    clicks: v.number(),
    saves: v.optional(v.number()),
    profileVisits: v.optional(v.number()),
  }),
  engagementRate: v.number(),
  viralityScore: v.number(), // 바이럴 점수 계산
  bestPerformingTime: v.optional(v.string()),
  audienceInsights: v.optional(v.any()),
  competitorComparison: v.optional(v.any()),
  recordedAt: v.string(),
  createdAt: v.string(),
})
  .index("byPostId", ["postId"])
  .index("byUserId", ["userId"])
  .index("byPlatform", ["platform"])
  .index("byEngagementRate", ["engagementRate"])
  .index("byRecordedAt", ["recordedAt"]);

// socialMetrics는 social.ts에 정의됨 (중복 제거)

// 분석 스키마 export
export const analyticsSchema = {
  pageViews,
  postAnalytics,
};