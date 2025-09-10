/**
 * 소셜 미디어 관련 스키마 정의
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// 페르소나 테이블
export const personas = defineTable({
  userId: v.id("users"),
  name: v.string(),
  role: v.string(),
  tone: v.string(),
  interests: v.array(v.string()),
  expertise: v.array(v.string()),
  description: v.optional(v.string()),
  avatar: v.optional(v.string()),
  isActive: v.boolean(),
  settings: v.optional(v.any()),
  promptTemplates: v.optional(v.any()),
  createdAt: v.string(),
  updatedAt: v.string(),
}).index("byUserId", ["userId"]);

// 소셜 계정 테이블
export const socialAccounts = defineTable({
  userId: v.id("users"),
  platform: v.string(),
  accountId: v.string(),
  username: v.string(),
  displayName: v.string(),
  profileImage: v.optional(v.string()),
  accessToken: v.string(),
  refreshToken: v.optional(v.string()),
  tokenExpiresAt: v.optional(v.string()),
  followers: v.optional(v.number()),
  following: v.optional(v.number()),
  postsCount: v.optional(v.number()),
  verificationStatus: v.optional(v.string()),
  isActive: v.boolean(),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("byUserId", ["userId"])
  .index("byPlatform", ["platform", "userId"])
  .index("byAccountId", ["accountId"]);

// 소셜 게시물 테이블
export const socialPosts = defineTable({
  userId: v.id("users"),
  personaId: v.id("personas"),
  originalContent: v.string(),
  finalContent: v.string(),
  platforms: v.array(v.string()),
  status: v.string(),
  hashtags: v.optional(v.array(v.string())),
  mediaUrls: v.optional(v.array(v.string())),
  threadCount: v.optional(v.number()),
  scheduledFor: v.optional(v.string()),
  publishedAt: v.optional(v.string()),
  metrics: v.optional(v.any()),
  errorMessage: v.optional(v.string()),
  creditsUsed: v.number(),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("byUserId", ["userId"])
  .index("byPersonaId", ["personaId"])
  .index("byStatus", ["status"]);

// 게시물 변형 테이블
export const postVariants = defineTable({
  postId: v.id("socialPosts"),
  content: v.string(),
  overallScore: v.number(),
  scoreBreakdown: v.object({
    engagement: v.number(),
    virality: v.number(),
    personaMatch: v.number(),
    readability: v.number(),
    trending: v.number(),
  }),
  isSelected: v.boolean(),
  aiModel: v.string(),
  promptUsed: v.string(),
  generationMetadata: v.optional(v.any()),
  creditsUsed: v.number(),
  generatedAt: v.string(),
}).index("byPostId", ["postId"]);

// 예약 게시물 테이블
export const scheduledPosts = defineTable({
  postId: v.id("socialPosts"),
  accountId: v.id("socialAccounts"),
  platform: v.string(),
  scheduledFor: v.string(),
  status: v.string(),
  publishedAt: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  retryCount: v.number(),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("byPostId", ["postId"])
  .index("byAccountId", ["accountId"])
  .index("byScheduledTime", ["scheduledFor"])
  .index("byStatus", ["status"]);

// 소셜 메트릭 테이블
export const socialMetrics = defineTable({
  postId: v.id("socialPosts"),
  platform: v.string(),
  accountId: v.id("socialAccounts"),
  impressions: v.optional(v.number()),
  reach: v.optional(v.number()),
  engagement: v.optional(v.number()),
  likes: v.optional(v.number()),
  comments: v.optional(v.number()),
  shares: v.optional(v.number()),
  clicks: v.optional(v.number()),
  saves: v.optional(v.number()),
  profileVisits: v.optional(v.number()),
  follows: v.optional(v.number()),
  fetchedAt: v.string(),
})
  .index("byPostId", ["postId"])
  .index("byAccountId", ["accountId"])
  .index("byPlatform", ["platform"]);

// 소셜 스키마 export
export const socialSchema = {
  personas,
  socialAccounts,
  socialPosts,
  postVariants,
  scheduledPosts,
  socialMetrics,
};