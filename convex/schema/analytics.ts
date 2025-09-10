/**
 * 분석 및 모니터링 관련 스키마 정의
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// 분석 이벤트 테이블
export const analytics = defineTable({
  userId: v.optional(v.id("users")),
  sessionId: v.string(),
  eventType: v.string(),
  eventName: v.string(),
  eventData: v.optional(v.any()),
  pageUrl: v.optional(v.string()),
  referrer: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  ipAddress: v.optional(v.string()),
  country: v.optional(v.string()),
  city: v.optional(v.string()),
  device: v.optional(v.string()),
  browser: v.optional(v.string()),
  os: v.optional(v.string()),
  timestamp: v.string(),
})
  .index("byUserId", ["userId"])
  .index("bySessionId", ["sessionId"])
  .index("byEventType", ["eventType"])
  .index("byTimestamp", ["timestamp"]);

// 분석 스키마 export
export const analyticsSchema = {
  analytics,
};