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
  metadata: v.optional(v.object({
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    path: v.optional(v.string()),
    method: v.optional(v.string()),
    statusCode: v.optional(v.number()),
    responseTime: v.optional(v.number()),
    additionalData: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean()))),
  })),
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
  actions: v.record(v.string(), v.number()), // action counts: { "login": 5, "post_create": 3, ... }
  totalActions: v.number(),
  lastActivityAt: v.string(),
})
  .index("byKey", ["key"])
  .index("byUserId", ["userId"])
  .index("byDate", ["date"]);

// 사용자 역할 및 권한 시스템
export const userRoles = defineTable({
  userId: v.id("users"),
  role: v.union(
    v.literal("guest"),
    v.literal("user"), 
    v.literal("premium"),
    v.literal("admin"),
    v.literal("super_admin")
  ),
  isActive: v.boolean(),
  assignedBy: v.optional(v.id("users")), // 누가 이 역할을 부여했는지
  assignedAt: v.string(),
  expiresAt: v.optional(v.string()), // 임시 역할의 경우 만료 시간
  metadata: v.optional(v.object({
    reason: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    restrictions: v.optional(v.array(v.string())),
  })),
})
  .index("byUserId", ["userId"])
  .index("byRole", ["role"])
  .index("byIsActive", ["isActive"])
  .index("byAssignedBy", ["assignedBy"]);

// 권한 정의 테이블 (세분화된 권한 관리)
export const permissions = defineTable({
  name: v.string(), // 권한 이름 (예: "posts:create", "users:admin")
  description: v.string(),
  category: v.string(), // 카테고리 (예: "posts", "users", "billing")
  isActive: v.boolean(),
  createdAt: v.string(),
})
  .index("byName", ["name"])
  .index("byCategory", ["category"])
  .index("byIsActive", ["isActive"]);

// 역할-권한 매핑
export const rolePermissions = defineTable({
  role: v.string(),
  permission: v.string(),
  isActive: v.boolean(),
  createdAt: v.string(),
})
  .index("byRole", ["role"])
  .index("byPermission", ["permission"])
  .index("byIsActive", ["isActive"]);

// 사용자별 추가 권한 (역할 외 개별 권한)
export const userPermissions = defineTable({
  userId: v.id("users"),
  permission: v.string(),
  granted: v.boolean(), // true: 허용, false: 거부
  grantedBy: v.id("users"),
  grantedAt: v.string(),
  expiresAt: v.optional(v.string()),
  reason: v.optional(v.string()),
})
  .index("byUserId", ["userId"])
  .index("byPermission", ["permission"])
  .index("byGrantedBy", ["grantedBy"]);

// 인증 스키마 export
export const authSchema = {
  users,
  sessions,
  userActions,
  userActivitySummary,
  userRoles,
  permissions,
  rolePermissions,
  userPermissions,
};