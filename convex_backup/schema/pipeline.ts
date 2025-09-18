/**
 * 데이터 파이프라인 및 집계 관련 스키마 정의
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// 이벤트 스트림
export const eventStreams = defineTable({
  eventId: v.string(),
  source: v.string(), // web, mobile, api, social, webhook
  eventType: v.string(),
  userId: v.optional(v.id("users")),
  sessionId: v.optional(v.string()),
  payload: v.any(),
  metadata: v.optional(v.object({
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    referer: v.optional(v.string()),
    platform: v.optional(v.string()),
  })),
  timestamp: v.string(),
  processed: v.boolean(),
  processedAt: v.optional(v.string()),
})
  .index("byEventId", ["eventId"])
  .index("bySource", ["source"])
  .index("byEventType", ["eventType"])
  .index("byUserId", ["userId"])
  .index("byTimestamp", ["timestamp"])
  .index("byProcessed", ["processed"]);

// 변환된 데이터
export const transformedData = defineTable({
  transformationId: v.string(),
  sourceType: v.string(),
  targetType: v.string(),
  data: v.any(),
  timestamp: v.string(),
})
  .index("byTransformationId", ["transformationId"])
  .index("bySourceType", ["sourceType"])
  .index("byTargetType", ["targetType"])
  .index("byTimestamp", ["timestamp"]);

// 메트릭 포인트
export const metrics = defineTable({
  metric: v.string(),
  value: v.number(),
  dimensions: v.optional(v.any()),
  timestamp: v.string(),
})
  .index("byMetric", ["metric"])
  .index("byMetricAndTime", ["metric", "timestamp"])
  .index("byTimestamp", ["timestamp"]);

// 윈도우 집계
export const windowAggregations = defineTable({
  windowKey: v.string(),
  metric: v.string(),
  window: v.string(), // 5min, 1hour, 24hour, 7days, 30days
  count: v.number(),
  sum: v.number(),
  min: v.number(),
  max: v.number(),
  startTime: v.string(),
  lastUpdated: v.string(),
})
  .index("byWindowKey", ["windowKey"])
  .index("byMetric", ["metric"])
  .index("byWindow", ["window"]);

// 집계 결과
export const aggregations = defineTable({
  metric: v.string(),
  window: v.string(),
  result: v.any(),
  timestamp: v.string(),
})
  .index("byMetric", ["metric"])
  .index("byWindow", ["window"])
  .index("byTimestamp", ["timestamp"]);

// Dead Letter Queue
export const deadLetterQueue = defineTable({
  eventId: v.string(),
  error: v.string(),
  timestamp: v.string(),
  retryCount: v.number(),
  maxRetries: v.number(),
  lastRetryAt: v.optional(v.string()),
})
  .index("byEventId", ["eventId"])
  .index("byTimestamp", ["timestamp"])
  .index("byRetryCount", ["retryCount"]);

// 배치 작업
export const batchJobs = defineTable({
  transformationId: v.string(),
  type: v.string(), // import, export, transform, aggregate
  status: v.string(), // pending, running, completed, failed
  config: v.any(),
  processed: v.number(),
  failed: v.number(),
  startedAt: v.optional(v.string()),
  completedAt: v.optional(v.string()),
  lastUpdated: v.string(),
  error: v.optional(v.string()),
})
  .index("byTransformationId", ["transformationId"])
  .index("byType", ["type"])
  .index("byStatus", ["status"]);

// 데이터 품질 체크
export const dataQualityChecks = defineTable({
  dataset: v.string(),
  timestamp: v.string(),
  totalRecords: v.number(),
  validRecords: v.number(),
  invalidRecords: v.number(),
  qualityScore: v.number(),
  issues: v.array(v.object({
    field: v.string(),
    issue: v.string(),
    count: v.number(),
    severity: v.string(),
  })),
})
  .index("byDataset", ["dataset"])
  .index("byTimestamp", ["timestamp"])
  .index("byQualityScore", ["qualityScore"]);

// 파이프라인 상태
export const pipelineStatus = defineTable({
  name: v.string(),
  status: v.string(), // running, completed, failed, paused
  startedAt: v.string(),
  completedAt: v.optional(v.string()),
  processedCount: v.number(),
  failedCount: v.number(),
  errorMessages: v.optional(v.array(v.string())),
  nextRun: v.optional(v.string()),
})
  .index("byName", ["name"])
  .index("byStatus", ["status"]);

// 성능 보고서
export const performanceReports = defineTable({
  reportType: v.string(), // daily, weekly, monthly
  period: v.object({
    start: v.string(),
    end: v.string(),
  }),
  // 요약 메트릭
  summary: v.object({
    avgResponseTime: v.number(),
    p95ResponseTime: v.number(),
    p99ResponseTime: v.number(),
    errorRate: v.number(),
    availability: v.number(),
    // Web Vitals 평균
    avgLCP: v.optional(v.number()),
    avgFID: v.optional(v.number()),
    avgCLS: v.optional(v.number()),
    // 비즈니스 메트릭
    totalUsers: v.number(),
    activeUsers: v.number(),
    totalRevenue: v.optional(v.number()),
    conversionRate: v.optional(v.number()),
  }),
  // 상세 데이터
  details: v.optional(v.any()),
  // 추천 사항
  recommendations: v.optional(v.array(v.object({
    type: v.string(),
    priority: v.string(),
    description: v.string(),
    impact: v.string(),
  }))),
  // 메타데이터
  generatedAt: v.string(),
  generatedBy: v.optional(v.string()), // system, user
})
  .index("byReportType", ["reportType"])
  .index("byGeneratedAt", ["generatedAt"]);

// 파이프라인 스키마 export
export const pipelineSchema = {
  eventStreams,
  transformedData,
  metrics,
  windowAggregations,
  aggregations,
  deadLetterQueue,
  batchJobs,
  dataQualityChecks,
  pipelineStatus,
  performanceReports,
};