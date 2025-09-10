/**
 * AI 및 콘텐츠 생성 관련 스키마 정의
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// AI 생성 내역 테이블
export const aiGenerations = defineTable({
  userId: v.id("users"),
  postId: v.optional(v.id("socialPosts")),
  personaId: v.optional(v.id("personas")),
  type: v.string(),
  prompt: v.string(),
  response: v.string(),
  model: v.string(),
  creditsUsed: v.number(),
  generationTime: v.number(),
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  temperature: v.optional(v.number()),
  success: v.boolean(),
  errorMessage: v.optional(v.string()),
  createdAt: v.string(),
})
  .index("byUserId", ["userId"])
  .index("byPostId", ["postId"])
  .index("byType", ["type"])
  .index("byCreatedAt", ["createdAt"]);

// 프롬프트 템플릿 테이블
export const promptTemplates = defineTable({
  userId: v.optional(v.id("users")),
  name: v.string(),
  category: v.string(),
  description: v.string(),
  template: v.string(),
  variables: v.array(v.string()),
  isPublic: v.boolean(),
  usageCount: v.number(),
  rating: v.optional(v.number()),
  metadata: v.optional(v.any()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("byUserId", ["userId"])
  .index("byCategory", ["category"])
  .index("byIsPublic", ["isPublic"])
  .index("byRating", ["rating"]);

// AI 스키마 export
export const aiSchema = {
  aiGenerations,
  promptTemplates,
};