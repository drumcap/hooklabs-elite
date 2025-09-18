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
  settings: v.optional(v.object({
    defaultPlatforms: v.optional(v.array(v.string())),
    contentStyle: v.optional(v.string()),
    hashtagStrategy: v.optional(v.string()),
    mediaPreferences: v.optional(v.object({
      includeImages: v.optional(v.boolean()),
      includeVideos: v.optional(v.boolean()),
      imageStyle: v.optional(v.string()),
    })),
    postingSchedule: v.optional(v.object({
      frequency: v.optional(v.string()),
      bestTimes: v.optional(v.array(v.string())),
      timezone: v.optional(v.string()),
    })),
  })),
  promptTemplates: v.optional(v.object({
    system: v.optional(v.string()),
    intro: v.optional(v.string()),
    hook: v.optional(v.string()),
    body: v.optional(v.string()),
    callToAction: v.optional(v.string()),
    custom: v.optional(v.array(v.object({
      name: v.string(),
      template: v.string(),
      category: v.optional(v.string()),
    }))),
  })),
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
  lastSyncedAt: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("byUserId", ["userId"])
  .index("byPlatform", ["platform"])
  .index("byIsActive", ["isActive"])
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
  metrics: v.optional(v.object({
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
    lastUpdated: v.optional(v.string()),
  })),
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
  generationMetadata: v.optional(v.object({
    model: v.optional(v.string()),
    temperature: v.optional(v.number()),
    maxTokens: v.optional(v.number()),
    processingTime: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    requestId: v.optional(v.string()),
    version: v.optional(v.string()),
  })),
  creditsUsed: v.number(),
  generatedAt: v.string(),
}).index("byPostId", ["postId"]);

// 예약 게시물 테이블
export const scheduledPosts = defineTable({
  postId: v.id("socialPosts"),
  variantId: v.optional(v.id("postVariants")),
  platform: v.string(),
  socialAccountId: v.id("socialAccounts"),
  scheduledFor: v.string(),
  status: v.string(), // "pending", "processing", "published", "failed", "cancelled"
  publishedAt: v.optional(v.string()),
  publishedPostId: v.optional(v.string()), // 플랫폼에서 반환된 게시물 ID
  error: v.optional(v.string()),
  retryCount: v.number(),
  maxRetries: v.number(),
  nextRetryAt: v.optional(v.string()),
  publishMetadata: v.optional(v.object({
    platform: v.optional(v.string()),
    apiVersion: v.optional(v.string()),
    requestId: v.optional(v.string()),
    responseHeaders: v.optional(v.record(v.string(), v.string())),
    rateLimitRemaining: v.optional(v.number()),
    publishedUrl: v.optional(v.string()),
    platformPostId: v.optional(v.string()),
    mediaIds: v.optional(v.array(v.string())),
    hashtags: v.optional(v.array(v.string())),
    mentions: v.optional(v.array(v.string())),
  })), // 플랫폼별 발행 메타데이터
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("byPostId", ["postId"])
  .index("byPlatform", ["platform"])
  .index("byStatus", ["status"])
  .index("byScheduledFor", ["scheduledFor"])
  .index("bySocialAccountId", ["socialAccountId"])
  .index("byNextRetryAt", ["nextRetryAt"]);

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