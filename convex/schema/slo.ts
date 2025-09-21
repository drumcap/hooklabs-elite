/**
 * SLO (Service Level Objective) 데이터 스키마
 * 실시간 SLO 추적 및 에러 예산 관리
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// SLO 메트릭 데이터
export const sloMetrics = defineTable({
  // 기본 정보
  timestamp: v.number(),
  service: v.string(), // 'web', 'api', 'content-generation'
  metric_type: v.string(), // 'availability', 'latency', 'error_rate', 'quality'

  // SLI 값들
  value: v.number(), // 실제 측정값 (백분율 또는 밀리초)
  target: v.number(), // 목표값
  threshold: v.optional(v.number()), // 임계값 (latency 등)

  // 메타데이터
  window_duration: v.string(), // '5m', '1h', '24h', '30d'
  measurement_period: v.number(), // 측정 기간 (ms)
  session_id: v.optional(v.string()),
  user_agent: v.optional(v.string()),
  page: v.optional(v.string()),

  // 추가 컨텍스트
  additional_data: v.optional(v.any()), // 서비스별 추가 데이터
})
.index("by_service_and_timestamp", ["service", "timestamp"])
.index("by_metric_type", ["metric_type"])
.index("by_service_and_metric", ["service", "metric_type"])
.index("by_timestamp", ["timestamp"]);

// Web Vitals 메트릭
export const webVitalsMetrics = defineTable({
  timestamp: v.number(),
  metric: v.string(), // 'lcp', 'fid', 'cls', 'ttfb', 'inp'
  value: v.number(),
  rating: v.string(), // 'good', 'needs-improvement', 'poor'
  page: v.string(),
  session_id: v.string(),
  user_agent: v.string(),

  // Core Web Vitals 세부 정보
  navigation_type: v.optional(v.string()), // 'navigate', 'reload', 'back_forward'
  connection_type: v.optional(v.string()), // '4g', 'wifi', etc.
  device_memory: v.optional(v.number()),

  // 사용자 정보
  user_id: v.optional(v.id("users")),
  geo_location: v.optional(v.string()),
})
.index("by_timestamp", ["timestamp"])
.index("by_metric", ["metric"])
.index("by_page", ["page"])
.index("by_session", ["session_id"])
.index("by_user", ["user_id"]);

// API 성능 메트릭
export const apiPerformanceMetrics = defineTable({
  timestamp: v.number(),
  endpoint: v.string(),
  method: v.string(), // 'GET', 'POST', etc.
  status: v.number(), // HTTP status code
  duration: v.number(), // milliseconds

  // 요청 정보
  session_id: v.string(),
  page: v.string(),
  user_id: v.optional(v.id("users")),

  // 응답 정보
  response_size: v.optional(v.number()),
  cache_hit: v.optional(v.boolean()),

  // 에러 정보
  error_type: v.optional(v.string()),
  error_message: v.optional(v.string()),

  // 성능 분석
  dns_time: v.optional(v.number()),
  connect_time: v.optional(v.number()),
  ssl_time: v.optional(v.number()),
  wait_time: v.optional(v.number()),
  download_time: v.optional(v.number()),
})
.index("by_timestamp", ["timestamp"])
.index("by_endpoint", ["endpoint"])
.index("by_status", ["status"])
.index("by_duration", ["duration"])
.index("by_user", ["user_id"]);

// Content Generation 성능 메트릭
export const contentGenerationMetrics = defineTable({
  timestamp: v.number(),
  generation_id: v.string(),
  type: v.string(), // 'post', 'variation', 'persona'

  // 성능 메트릭
  start_time: v.number(),
  end_time: v.optional(v.number()),
  duration: v.optional(v.number()),
  success: v.boolean(),

  // 품질 메트릭
  quality_score: v.optional(v.number()), // 1-5 scale
  user_feedback: v.optional(v.string()), // 'good', 'bad', 'excellent'

  // 기술적 메트릭
  model_used: v.optional(v.string()),
  token_count: v.optional(v.number()),
  credits_used: v.optional(v.number()),

  // 사용자 정보
  user_id: v.optional(v.id("users")),
  session_id: v.string(),

  // 에러 정보
  error_type: v.optional(v.string()),
  error_message: v.optional(v.string()),
})
.index("by_timestamp", ["timestamp"])
.index("by_type", ["type"])
.index("by_success", ["success"])
.index("by_user", ["user_id"])
.index("by_generation_id", ["generation_id"]);

// SLO 목표 및 설정
export const sloTargets = defineTable({
  service: v.string(), // 'web', 'api', 'content-generation'
  metric_type: v.string(), // 'availability', 'latency', 'error_rate'

  // SLO 정의
  target_percentage: v.number(), // 99.9, 95.0, etc.
  threshold_value: v.optional(v.number()), // latency threshold in ms
  window_days: v.number(), // 30, 7, 1

  // Error Budget
  total_budget_percent: v.number(), // 0.1 for 99.9% SLO

  // 메타데이터
  description: v.string(),
  owner: v.string(), // team or person responsible
  created_at: v.number(),
  updated_at: v.number(),
  active: v.boolean(),

  // 알림 설정
  alert_thresholds: v.object({
    critical: v.number(), // burn rate multiplier
    warning: v.number(),
    attention: v.number(),
  }),
})
.index("by_service", ["service"])
.index("by_active", ["active"])
.index("by_service_and_metric", ["service", "metric_type"]);

// Error Budget 상태 추적
export const errorBudgetStatus = defineTable({
  timestamp: v.number(),
  service: v.string(),
  metric_type: v.string(),
  window_days: v.number(),

  // Error Budget 계산
  total_budget_percent: v.number(),
  consumed_percent: v.number(),
  remaining_percent: v.number(),
  burn_rate: v.number(),

  // 상태
  status: v.string(), // 'healthy', 'attention', 'warning', 'critical', 'exhausted'
  projected_exhaustion_days: v.optional(v.number()),

  // 알림 상태
  alert_fired: v.boolean(),
  alert_level: v.optional(v.string()),

  // 메타데이터
  calculation_window_start: v.number(),
  calculation_window_end: v.number(),
})
.index("by_timestamp", ["timestamp"])
.index("by_service", ["service"])
.index("by_status", ["status"])
.index("by_service_and_metric", ["service", "metric_type"]);

// SLO 인시던트 및 영향
export const sloIncidents = defineTable({
  incident_id: v.string(),
  service: v.string(),
  metric_type: v.string(),

  // 인시던트 정보
  start_time: v.number(),
  end_time: v.optional(v.number()),
  duration: v.optional(v.number()),
  severity: v.string(), // 'low', 'medium', 'high', 'critical'

  // SLO 영향
  slo_breach: v.boolean(),
  error_budget_consumed: v.number(), // percentage
  affected_users: v.optional(v.number()),

  // 근본 원인
  root_cause: v.optional(v.string()),
  contributing_factors: v.optional(v.array(v.string())),

  // 대응
  resolution_time: v.optional(v.number()),
  actions_taken: v.optional(v.array(v.string())),

  // 메타데이터
  reported_by: v.optional(v.string()),
  resolved_by: v.optional(v.string()),
  post_mortem_link: v.optional(v.string()),

  created_at: v.number(),
  updated_at: v.number(),
})
.index("by_service", ["service"])
.index("by_start_time", ["start_time"])
.index("by_severity", ["severity"])
.index("by_slo_breach", ["slo_breach"]);

// SLO 리포트 및 히스토리
export const sloReports = defineTable({
  report_id: v.string(),
  report_type: v.string(), // 'weekly', 'monthly', 'quarterly'
  period_start: v.number(),
  period_end: v.number(),

  // 서비스별 성과
  services_performance: v.any(), // JSON object with service SLO performance

  // 전체 요약
  overall_slo_compliance: v.number(), // percentage
  total_incidents: v.number(),
  total_error_budget_consumed: v.number(),

  // 트렌드 분석
  performance_trend: v.string(), // 'improving', 'degrading', 'stable'
  key_insights: v.array(v.string()),
  recommendations: v.array(v.string()),

  // 메타데이터
  generated_at: v.number(),
  generated_by: v.optional(v.string()),
  stakeholders: v.optional(v.array(v.string())),
})
.index("by_report_type", ["report_type"])
.index("by_period", ["period_start", "period_end"])
.index("by_generated_at", ["generated_at"]);

// Real-time SLO 대시보드 상태
export const sloAlerts = defineTable({
  alert_id: v.string(),
  service: v.string(),
  metric_type: v.string(),
  alert_type: v.string(), // 'slo_breach', 'burn_rate', 'budget_exhaustion'
  severity: v.string(), // 'critical', 'warning', 'info'

  // 알림 내용
  title: v.string(),
  description: v.string(),
  current_value: v.number(),
  threshold_value: v.number(),

  // 상태
  status: v.string(), // 'firing', 'resolved', 'acknowledged'
  fired_at: v.number(),
  resolved_at: v.optional(v.number()),
  acknowledged_at: v.optional(v.number()),
  acknowledged_by: v.optional(v.string()),

  // 액션
  runbook_url: v.optional(v.string()),
  dashboard_url: v.optional(v.string()),
  escalation_policy: v.optional(v.string()),

  // 메타데이터
  tags: v.optional(v.array(v.string())),
  additional_context: v.optional(v.any()),
})
.index("by_service", ["service"])
.index("by_status", ["status"])
.index("by_fired_at", ["fired_at"])
.index("by_severity", ["severity"]);

export default {
  sloMetrics,
  webVitalsMetrics,
  apiPerformanceMetrics,
  contentGenerationMetrics,
  sloTargets,
  errorBudgetStatus,
  sloIncidents,
  sloReports,
  sloAlerts,
};