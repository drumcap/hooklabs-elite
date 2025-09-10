/**
 * 사용자 관련 스키마 정의
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// 사용자 테이블
export const users = defineTable({
  externalId: v.string(),
  attributes: v.optional(v.any()),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  bio: v.optional(v.string()),
  lemonSqueezyCustomerId: v.optional(v.string()),
  createdAt: v.optional(v.string()),
  updatedAt: v.optional(v.string()),
}).index("byExternalId", ["externalId"]);

// 사용자 프로필 확장 (향후 사용)
export const userProfiles = defineTable({
  userId: v.id("users"),
  settings: v.optional(v.any()),
  preferences: v.optional(v.any()),
  metadata: v.optional(v.any()),
  createdAt: v.string(),
  updatedAt: v.string(),
}).index("byUserId", ["userId"]);

// 사용자 스키마 export
export const usersSchema = {
  users,
  userProfiles,
};