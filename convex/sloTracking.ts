/**
 * SLO 추적 및 에러 예산 관리 Convex 함수들
 */

import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Web Vitals 메트릭 저장
export const recordWebVitals = mutation({
  args: {
    timestamp: v.number(),
    event: v.string(),
    data: v.object({
      metric: v.string(),
      value: v.number(),
      rating: v.string(),
      page: v.string(),
    }),
    session_id: v.string(),
    user_agent: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("webVitalsMetrics", {
      timestamp: args.timestamp,
      metric: args.data.metric,
      value: args.data.value,
      rating: args.data.rating,
      page: args.data.page,
      session_id: args.session_id,
      user_agent: args.user_agent,
    });

    // SLO 메트릭도 함께 기록
    await ctx.db.insert("sloMetrics", {
      timestamp: args.timestamp,
      service: "web",
      metric_type: args.data.metric,
      value: args.data.value,
      target: getSLOTarget(args.data.metric),
      window_duration: "5m",
      measurement_period: 5 * 60 * 1000,
      session_id: args.session_id,
      additional_data: {
        rating: args.data.rating,
        page: args.data.page,
      },
    });
  },
});

// API 성능 메트릭 저장
export const recordAPIPerformance = mutation({
  args: {
    endpoint: v.string(),
    method: v.string(),
    status: v.number(),
    duration: v.number(),
    timestamp: v.number(),
    session_id: v.string(),
    page: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("apiPerformanceMetrics", {
      timestamp: args.timestamp,
      endpoint: args.endpoint,
      method: args.method,
      status: args.status,
      duration: args.duration,
      session_id: args.session_id,
      page: args.page,
    });

    // 가용성 SLO 메트릭 계산
    const isSuccessful = args.status >= 200 && args.status < 500;
    await ctx.db.insert("sloMetrics", {
      timestamp: args.timestamp,
      service: "api",
      metric_type: "availability",
      value: isSuccessful ? 100 : 0,
      target: 99.9,
      window_duration: "5m",
      measurement_period: 5 * 60 * 1000,
      session_id: args.session_id,
      additional_data: {
        endpoint: args.endpoint,
        method: args.method,
        status: args.status,
      },
    });

    // 지연시간 SLO 메트릭 계산
    if (isSuccessful) {
      const latencyThreshold = getLatencyThreshold(args.endpoint);
      await ctx.db.insert("sloMetrics", {
        timestamp: args.timestamp,
        service: "api",
        metric_type: "latency",
        value: args.duration,
        target: 95, // 95% of requests should be under threshold
        threshold: latencyThreshold,
        window_duration: "5m",
        measurement_period: 5 * 60 * 1000,
        session_id: args.session_id,
        additional_data: {
          endpoint: args.endpoint,
        },
      });
    }
  },
});

// Content Generation 메트릭 저장
export const recordContentGeneration = mutation({
  args: {
    id: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    success: v.boolean(),
    duration: v.optional(v.number()),
    qualityScore: v.optional(v.number()),
    type: v.string(),
    session_id: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("contentGenerationMetrics", {
      timestamp: args.endTime || args.startTime,
      generation_id: args.id,
      type: args.type,
      start_time: args.startTime,
      end_time: args.endTime,
      duration: args.duration,
      success: args.success,
      quality_score: args.qualityScore,
      session_id: args.session_id,
    });

    // 성공률 SLO 메트릭
    await ctx.db.insert("sloMetrics", {
      timestamp: args.endTime || args.startTime,
      service: "content-generation",
      metric_type: "success_rate",
      value: args.success ? 100 : 0,
      target: 99.5,
      window_duration: "1h",
      measurement_period: 60 * 60 * 1000,
      session_id: args.session_id,
      additional_data: {
        type: args.type,
        generation_id: args.id,
      },
    });

    // 지연시간 SLO 메트릭 (성공한 경우만)
    if (args.success && args.duration) {
      await ctx.db.insert("sloMetrics", {
        timestamp: args.endTime!,
        service: "content-generation",
        metric_type: "latency",
        value: args.duration,
        target: 95, // 95% under 30 seconds
        threshold: 30000,
        window_duration: "1h",
        measurement_period: 60 * 60 * 1000,
        session_id: args.session_id,
        additional_data: {
          type: args.type,
        },
      });
    }

    // 품질 SLO 메트릭
    if (args.qualityScore) {
      await ctx.db.insert("sloMetrics", {
        timestamp: args.endTime!,
        service: "content-generation",
        metric_type: "quality",
        value: args.qualityScore >= 3.0 ? 100 : 0,
        target: 90, // 90% should be rated 3.0 or higher
        threshold: 3.0,
        window_duration: "24h",
        measurement_period: 24 * 60 * 60 * 1000,
        session_id: args.session_id,
        additional_data: {
          quality_score: args.qualityScore,
        },
      });
    }
  },
});

// SLO 상태 조회
export const getSLOStatus = query({
  args: {
    service: v.optional(v.string()),
    timeWindow: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timeWindow = args.timeWindow || "30m";
    const windowMs = parseTimeWindow(timeWindow);
    const cutoff = Date.now() - windowMs;

    const services = args.service ? [args.service] : ["web", "api", "content-generation"];
    const sloStatus: Record<string, any> = {};

    for (const service of services) {
      const metrics = await ctx.db
        .query("sloMetrics")
        .withIndex("by_service_and_timestamp", (q) =>
          q.eq("service", service).gte("timestamp", cutoff)
        )
        .collect();

      sloStatus[service] = calculateSLOPerformance(metrics);
    }

    return sloStatus;
  },
});

// Error Budget 상태 조회
export const getErrorBudgetStatus = query({
  args: {
    service: v.string(),
    windowDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const windowDays = args.windowDays || 30;
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - windowMs;

    // 최근 Error Budget 상태 조회
    const latestStatus = await ctx.db
      .query("errorBudgetStatus")
      .withIndex("by_service", (q) => q.eq("service", args.service))
      .order("desc")
      .first();

    // 실시간 계산
    const metrics = await ctx.db
      .query("sloMetrics")
      .withIndex("by_service_and_timestamp", (q) =>
        q.eq("service", args.service).gte("timestamp", cutoff)
      )
      .collect();

    const performance = calculateSLOPerformance(metrics);
    const errorBudget = calculateErrorBudget(performance.availability, 99.9, windowDays);

    return {
      ...errorBudget,
      historical: latestStatus,
      performance,
    };
  },
});

// SLO 알림 확인 및 생성
export const checkSLOAlerts = action({
  args: {},
  handler: async (ctx) => {
    const services = ["web", "api", "content-generation"];
    const alerts = [];

    for (const service of services) {
      const errorBudget = await ctx.runQuery(internal.sloTracking.getErrorBudgetStatus, {
        service,
      });

      // Burn rate 알림 확인
      const burnRateAlerts = checkBurnRateAlerts(service, errorBudget);
      alerts.push(...burnRateAlerts);

      // SLO breach 알림 확인
      const sloBreachAlerts = checkSLOBreachAlerts(service, errorBudget);
      alerts.push(...sloBreachAlerts);
    }

    // 새로운 알림들을 저장
    for (const alert of alerts) {
      await ctx.runMutation(internal.sloTracking.createSLOAlert, alert);
    }

    return alerts;
  },
});

// SLO 알림 생성
export const createSLOAlert = mutation({
  args: {
    alert_id: v.string(),
    service: v.string(),
    metric_type: v.string(),
    alert_type: v.string(),
    severity: v.string(),
    title: v.string(),
    description: v.string(),
    current_value: v.number(),
    threshold_value: v.number(),
  },
  handler: async (ctx, args) => {
    // 중복 알림 확인
    const existingAlert = await ctx.db
      .query("sloAlerts")
      .filter((q) =>
        q.and(
          q.eq(q.field("alert_id"), args.alert_id),
          q.eq(q.field("status"), "firing")
        )
      )
      .first();

    if (existingAlert) {
      return existingAlert._id;
    }

    return await ctx.db.insert("sloAlerts", {
      ...args,
      status: "firing",
      fired_at: Date.now(),
    });
  },
});

// SLO 월간 리포트 생성
export const generateMonthlyReport = action({
  args: {
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    const periodStart = new Date(args.year, args.month - 1, 1).getTime();
    const periodEnd = new Date(args.year, args.month, 0, 23, 59, 59).getTime();

    const services = ["web", "api", "content-generation"];
    const servicesPerformance: Record<string, any> = {};

    let totalCompliance = 0;
    let totalIncidents = 0;
    let totalErrorBudgetConsumed = 0;

    for (const service of services) {
      const metrics = await ctx.runQuery(internal.sloTracking.getSLOMetricsForPeriod, {
        service,
        startTime: periodStart,
        endTime: periodEnd,
      });

      const incidents = await ctx.runQuery(internal.sloTracking.getIncidentsForPeriod, {
        service,
        startTime: periodStart,
        endTime: periodEnd,
      });

      const performance = calculateSLOPerformance(metrics);
      const errorBudget = calculateErrorBudget(performance.availability, 99.9, 30);

      servicesPerformance[service] = {
        performance,
        errorBudget,
        incidents: incidents.length,
      };

      totalCompliance += performance.availability;
      totalIncidents += incidents.length;
      totalErrorBudgetConsumed += errorBudget.consumed;
    }

    const report = {
      report_id: `monthly_${args.year}_${args.month}`,
      report_type: "monthly",
      period_start: periodStart,
      period_end: periodEnd,
      services_performance: servicesPerformance,
      overall_slo_compliance: totalCompliance / services.length,
      total_incidents: totalIncidents,
      total_error_budget_consumed: totalErrorBudgetConsumed / services.length,
      performance_trend: "stable", // TODO: Calculate trend
      key_insights: generateInsights(servicesPerformance),
      recommendations: generateRecommendations(servicesPerformance),
      generated_at: Date.now(),
    };

    return await ctx.runMutation(internal.sloTracking.createSLOReport, report);
  },
});

// Helper functions
function getSLOTarget(metric: string): number {
  const targets: Record<string, number> = {
    lcp: 2000, // 2 seconds
    fid: 100, // 100ms
    cls: 0.1, // 0.1 CLS score
  };
  return targets[metric] || 0;
}

function getLatencyThreshold(endpoint: string): number {
  if (endpoint.includes("/auth")) return 200;
  if (endpoint.includes("/generate")) return 15000;
  return 500;
}

function parseTimeWindow(window: string): number {
  const unit = window.slice(-1);
  const value = parseInt(window.slice(0, -1));

  switch (unit) {
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 30 * 60 * 1000; // default 30 minutes
  }
}

function calculateSLOPerformance(metrics: any[]): any {
  const metricsByType = metrics.reduce((acc, metric) => {
    if (!acc[metric.metric_type]) acc[metric.metric_type] = [];
    acc[metric.metric_type].push(metric);
    return acc;
  }, {} as Record<string, any[]>);

  const performance: Record<string, number> = {};

  for (const [type, typeMetrics] of Object.entries(metricsByType)) {
    if (type === "availability" || type === "success_rate") {
      const successfulRequests = typeMetrics.filter((m) => m.value > 0).length;
      performance[type] = (successfulRequests / typeMetrics.length) * 100;
    } else if (type === "latency") {
      const fastRequests = typeMetrics.filter(
        (m) => m.threshold && m.value <= m.threshold
      ).length;
      performance[type] = (fastRequests / typeMetrics.length) * 100;
    } else if (type === "quality") {
      const qualityRequests = typeMetrics.filter((m) => m.value > 0).length;
      performance[type] = (qualityRequests / typeMetrics.length) * 100;
    }
  }

  return performance;
}

function calculateErrorBudget(actualSLI: number, targetSLO: number, windowDays: number) {
  const totalBudgetPercent = 100 - targetSLO;
  const consumedPercent = 100 - actualSLI;
  const remainingPercent = totalBudgetPercent - consumedPercent;
  const burnRate = consumedPercent / totalBudgetPercent;

  let status: "healthy" | "attention" | "warning" | "critical" | "exhausted";
  if (remainingPercent <= 0) {
    status = "exhausted";
  } else if (burnRate >= 0.9) {
    status = "critical";
  } else if (burnRate >= 0.7) {
    status = "warning";
  } else if (burnRate >= 0.5) {
    status = "attention";
  } else {
    status = "healthy";
  }

  return {
    total_budget_percent: totalBudgetPercent,
    consumed_percent: consumedPercent,
    remaining_percent: remainingPercent,
    burn_rate: burnRate,
    status,
  };
}

function checkBurnRateAlerts(service: string, errorBudget: any): any[] {
  const alerts = [];

  if (errorBudget.burn_rate >= 14.4) {
    alerts.push({
      alert_id: `${service}_fast_burn_${Date.now()}`,
      service,
      metric_type: "error_budget",
      alert_type: "burn_rate",
      severity: "critical",
      title: `Fast error budget burn for ${service}`,
      description: `Service ${service} is burning error budget at ${errorBudget.burn_rate.toFixed(
        2
      )}x rate`,
      current_value: errorBudget.burn_rate,
      threshold_value: 14.4,
    });
  } else if (errorBudget.burn_rate >= 3.0) {
    alerts.push({
      alert_id: `${service}_slow_burn_${Date.now()}`,
      service,
      metric_type: "error_budget",
      alert_type: "burn_rate",
      severity: "warning",
      title: `Slow error budget burn for ${service}`,
      description: `Service ${service} is burning error budget at ${errorBudget.burn_rate.toFixed(
        2
      )}x rate`,
      current_value: errorBudget.burn_rate,
      threshold_value: 3.0,
    });
  }

  return alerts;
}

function checkSLOBreachAlerts(service: string, errorBudget: any): any[] {
  const alerts = [];

  if (errorBudget.status === "exhausted") {
    alerts.push({
      alert_id: `${service}_slo_breach_${Date.now()}`,
      service,
      metric_type: "slo_compliance",
      alert_type: "slo_breach",
      severity: "critical",
      title: `SLO breached for ${service}`,
      description: `Service ${service} has exhausted its error budget`,
      current_value: errorBudget.remaining_percent,
      threshold_value: 0,
    });
  }

  return alerts;
}

function generateInsights(servicesPerformance: Record<string, any>): string[] {
  const insights = [];

  for (const [service, data] of Object.entries(servicesPerformance)) {
    if (data.performance.availability < 99.5) {
      insights.push(`${service} availability below target (${data.performance.availability.toFixed(2)}%)`);
    }
    if (data.incidents > 5) {
      insights.push(`${service} had ${data.incidents} incidents this month`);
    }
  }

  return insights;
}

function generateRecommendations(servicesPerformance: Record<string, any>): string[] {
  const recommendations = [];

  for (const [service, data] of Object.entries(servicesPerformance)) {
    if (data.errorBudget.status === "critical") {
      recommendations.push(`Focus on reliability improvements for ${service}`);
    }
    if (data.incidents > 10) {
      recommendations.push(`Investigate root causes for frequent ${service} incidents`);
    }
  }

  return recommendations;
}

// Internal helper mutations and queries
export const getSLOMetricsForPeriod = query({
  args: {
    service: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sloMetrics")
      .withIndex("by_service_and_timestamp", (q) =>
        q.eq("service", args.service).gte("timestamp", args.startTime).lte("timestamp", args.endTime)
      )
      .collect();
  },
});

export const getIncidentsForPeriod = query({
  args: {
    service: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sloIncidents")
      .withIndex("by_service", (q) => q.eq("service", args.service))
      .filter((q) =>
        q.and(
          q.gte(q.field("start_time"), args.startTime),
          q.lte(q.field("start_time"), args.endTime)
        )
      )
      .collect();
  },
});

export const createSLOReport = mutation({
  args: {
    report_id: v.string(),
    report_type: v.string(),
    period_start: v.number(),
    period_end: v.number(),
    services_performance: v.any(),
    overall_slo_compliance: v.number(),
    total_incidents: v.number(),
    total_error_budget_consumed: v.number(),
    performance_trend: v.string(),
    key_insights: v.array(v.string()),
    recommendations: v.array(v.string()),
    generated_at: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sloReports", args);
  },
});