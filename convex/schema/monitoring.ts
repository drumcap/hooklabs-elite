/**
 * 간소화된 모니터링 관련 스키마 정의
 * 핵심적인 에러 로그와 시스템 상태만 유지
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// 에러 및 이벤트 로그 (필수)
export const errorLogs = defineTable({
  userId: v.optional(v.id("users")),
  level: v.string(), // error, warn, info, debug
  category: v.string(), // api, database, frontend, payment, ai 등
  message: v.string(),
  // 에러 상세
  errorName: v.optional(v.string()),
  errorStack: v.optional(v.string()),
  errorCode: v.optional(v.string()),
  // 컨텍스트
  pathname: v.optional(v.string()),
  endpoint: v.optional(v.string()),
  component: v.optional(v.string()),
  action: v.optional(v.string()),
  // 추적 정보
  traceId: v.optional(v.string()),
  sessionId: v.optional(v.string()),
  requestId: v.optional(v.string()),
  // 메타데이터
  metadata: v.optional(v.any()),
  userAgent: v.optional(v.string()),
  ip: v.optional(v.string()),
  timestamp: v.string(),
})
  .index("byUserId", ["userId"])
  .index("byLevel", ["level"])
  .index("byCategory", ["category"])
  .index("byTimestamp", ["timestamp"])
  .index("bySessionId", ["sessionId"]);

// 간단한 시스템 상태 확인 (필수)
export const systemHealth = defineTable({
  service: v.string(), // "api", "database", "auth", "payment" 등
  status: v.string(), // "healthy", "degraded", "down"
  responseTime: v.optional(v.number()), // 평균 응답시간 (ms)
  errorRate: v.optional(v.number()), // 에러율 (0-100)
  lastCheckedAt: v.string(),
  metadata: v.optional(v.any()),
})
  .index("byService", ["service"])
  .index("byStatus", ["status"])
  .index("byLastCheckedAt", ["lastCheckedAt"]);

// 간소화된 모니터링 스키마 export
export const monitoringSchema = {
  errorLogs,
  systemHealth,
};