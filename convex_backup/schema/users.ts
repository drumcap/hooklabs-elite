/**
 * 사용자 관련 스키마 정의
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// 사용자 테이블
export const users = defineTable({
  externalId: v.string(),
  attributes: v.optional(v.object({
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    timezone: v.optional(v.string()),
    locale: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    company: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    customFields: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean()))),
  })),
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
  settings: v.optional(v.object({
    theme: v.optional(v.string()),
    language: v.optional(v.string()),
    notifications: v.optional(v.object({
      email: v.optional(v.boolean()),
      push: v.optional(v.boolean()),
      sms: v.optional(v.boolean()),
    })),
    privacy: v.optional(v.object({
      profileVisibility: v.optional(v.string()),
      dataSharing: v.optional(v.boolean()),
    })),
  })),
  preferences: v.optional(v.object({
    contentTypes: v.optional(v.array(v.string())),
    platforms: v.optional(v.array(v.string())),
    autoPublish: v.optional(v.boolean()),
    defaultPersona: v.optional(v.id("personas")),
    workflowSettings: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean()))),
  })),
  metadata: v.optional(v.object({
    onboardingComplete: v.optional(v.boolean()),
    lastActiveAt: v.optional(v.string()),
    featureFlags: v.optional(v.array(v.string())),
    experiments: v.optional(v.record(v.string(), v.string())),
    analytics: v.optional(v.object({
      source: v.optional(v.string()),
      campaign: v.optional(v.string()),
      referrer: v.optional(v.string()),
    })),
  })),
  createdAt: v.string(),
  updatedAt: v.string(),
}).index("byUserId", ["userId"]);

// 사용자 스키마 export
export const usersSchema = {
  users,
  userProfiles,
};