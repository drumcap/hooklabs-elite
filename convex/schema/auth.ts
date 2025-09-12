/**
 * 사용자 인증 및 계정 관련 스키마 정의
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// 사용자 테이블
export const users = defineTable({
  name: v.string(),
  // Clerk ID
  externalId: v.string(),
  // Lemon Squeezy customer ID
  lemonSqueezyCustomerId: v.optional(v.string()),
}).index("byExternalId", ["externalId"])
  .index("byLemonSqueezyCustomerId", ["lemonSqueezyCustomerId"]);

// 세션 추적
export const sessions = defineTable({
  sessionId: v.string(),
  userId: v.optional(v.id("users")),
  firstPageUrl: v.string(),
  lastPageUrl: v.string(),
  startedAt: v.string(),
  lastActivityAt: v.string(),
  pageCount: v.number(),
  duration: v.optional(v.number()),
})
  .index("bySessionId", ["sessionId"])
  .index("byUserId", ["userId"])
  .index("byStartedAt", ["startedAt"]);

// 사용자 액션
export const userActions = defineTable({
  userId: v.id("users"),
  action: v.string(),
  metadata: v.optional(v.any()),
  timestamp: v.string(),
})
  .index("byUserId", ["userId"])
  .index("byAction", ["action"])
  .index("byTimestamp", ["timestamp"]);

// 사용자 활동 요약
export const userActivitySummary = defineTable({
  key: v.string(), // userId_date
  userId: v.id("users"),
  date: v.string(),
  actions: v.any(), // action counts
  totalActions: v.number(),
  lastActivityAt: v.string(),
})
  .index("byKey", ["key"])
  .index("byUserId", ["userId"])
  .index("byDate", ["date"]);

// 인증 스키마 export
export const authSchema = {
  users,
  sessions,
  userActions,
  userActivitySummary,
};