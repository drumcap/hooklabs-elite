/**
 * AI 및 콘텐츠 생성 관련 스키마 정의
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// AI 생성 이력
export const aiGenerations = defineTable({
  userId: v.id("users"),
  postId: v.optional(v.id("socialPosts")), // 관련 게시물 (없을 수도 있음)
  personaId: v.optional(v.id("personas")),
  type: v.string(), // "content_generation", "variant_creation", "optimization", "analysis"
  prompt: v.string(),
  response: v.string(),
  model: v.string(),
  creditsUsed: v.number(),
  generationTime: v.number(), // 밀리초 단위
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  temperature: v.optional(v.number()),
  metadata: v.optional(v.any()),
  success: v.boolean(),
  errorMessage: v.optional(v.string()),
  createdAt: v.string(),
})
  .index("byUserId", ["userId"])
  .index("byPostId", ["postId"])
  .index("byPersonaId", ["personaId"])
  .index("byType", ["type"])
  .index("bySuccess", ["success"])
  .index("byCreatedAt", ["createdAt"]);

// 콘텐츠 소스 (향후 자동화용)
export const contentSources = defineTable({
  userId: v.id("users"),
  name: v.string(),
  type: v.string(), // "rss", "twitter_user", "website", "keyword"
  url: v.optional(v.string()),
  keywords: v.optional(v.array(v.string())),
  settings: v.optional(v.any()), // 소스별 설정
  isActive: v.boolean(),
  lastFetchedAt: v.optional(v.string()),
  nextFetchAt: v.optional(v.string()),
  fetchInterval: v.number(), // 시간 단위 (시간)
  personaId: v.optional(v.id("personas")), // 연결된 페르소나
  autoGenerate: v.boolean(), // 자동 콘텐츠 생성 여부
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("byUserId", ["userId"])
  .index("byType", ["type"])
  .index("byIsActive", ["isActive"])
  .index("byNextFetchAt", ["nextFetchAt"])
  .index("byPersonaId", ["personaId"]);

// 수집된 콘텐츠 아이템
export const contentItems = defineTable({
  sourceId: v.id("contentSources"),
  userId: v.id("users"),
  title: v.string(),
  content: v.string(),
  url: v.optional(v.string()),
  author: v.optional(v.string()),
  publishedAt: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  status: v.string(), // "new", "processed", "used", "archived"
  relevanceScore: v.optional(v.number()), // AI가 평가한 관련성 점수
  generatedPostId: v.optional(v.id("socialPosts")), // 이 아이템으로 생성된 게시물
  metadata: v.optional(v.any()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("bySourceId", ["sourceId"])
  .index("byUserId", ["userId"])
  .index("byStatus", ["status"])
  .index("byRelevanceScore", ["relevanceScore"])
  .index("byCreatedAt", ["createdAt"]);

// AI 스키마 export
export const aiSchema = {
  aiGenerations,
  contentSources,
  contentItems,
};