import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Web Vitals 저장
export const recordWebVitals = mutation({
  args: {
    sessionId: v.string(),
    pathname: v.string(),
    lcp: v.optional(v.number()),
    fid: v.optional(v.number()),
    cls: v.optional(v.number()),
    fcp: v.optional(v.number()),
    ttfb: v.optional(v.number()),
    inp: v.optional(v.number()),
    navigationTiming: v.optional(v.object({
      domContentLoaded: v.number(),
      loadComplete: v.number(),
      domInteractive: v.number(),
      redirectTime: v.number(),
      dnsTime: v.number(),
      connectionTime: v.number(),
      requestTime: v.number(),
      responseTime: v.number(),
    })),
    deviceType: v.string(),
    browser: v.string(),
    browserVersion: v.string(),
    os: v.string(),
    connectionType: v.optional(v.string()),
    viewport: v.object({
      width: v.number(),
      height: v.number(),
    }),
    url: v.string(),
    referrer: v.optional(v.string()),
    userAgent: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity ? await getUserId(ctx, identity.subject) : undefined;

    return await ctx.db.insert("webVitals", {
      ...args,
      userId,
      timestamp: new Date().toISOString(),
    });
  },
});

// API 메트릭 저장
export const recordApiMetric = mutation({
  args: {
    endpoint: v.string(),
    method: v.string(),
    responseTime: v.number(),
    statusCode: v.number(),
    success: v.boolean(),
    timing: v.optional(v.object({
      dns: v.optional(v.number()),
      connection: v.optional(v.number()),
      tls: v.optional(v.number()),
      firstByte: v.optional(v.number()),
      download: v.optional(v.number()),
      total: v.number(),
    })),
    requestSize: v.optional(v.number()),
    responseSize: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    errorStack: v.optional(v.string()),
    traceId: v.optional(v.string()),
    spanId: v.optional(v.string()),
    parentSpanId: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ip: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity ? await getUserId(ctx, identity.subject) : undefined;

    return await ctx.db.insert("apiMetrics", {
      ...args,
      userId,
      timestamp: new Date().toISOString(),
    });
  },
});

// 쿼리 메트릭 저장
export const recordQueryMetric = mutation({
  args: {
    queryName: v.string(),
    queryType: v.string(),
    executionTime: v.number(),
    success: v.boolean(),
    tableName: v.optional(v.string()),
    operation: v.optional(v.string()),
    rowsAffected: v.optional(v.number()),
    rowsReturned: v.optional(v.number()),
    cacheHit: v.optional(v.boolean()),
    cacheKey: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    traceId: v.optional(v.string()),
    requestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity ? await getUserId(ctx, identity.subject) : undefined;

    return await ctx.db.insert("queryMetrics", {
      ...args,
      userId,
      timestamp: new Date().toISOString(),
    });
  },
});

// 시스템 메트릭 저장
export const recordSystemMetric = mutation({
  args: {
    instanceId: v.string(),
    cpuUsage: v.number(),
    cpuCores: v.number(),
    cpuModel: v.optional(v.string()),
    memoryUsage: v.number(),
    memoryUsed: v.number(),
    memoryTotal: v.number(),
    heapUsed: v.number(),
    heapTotal: v.number(),
    networkIn: v.number(),
    networkOut: v.number(),
    activeConnections: v.number(),
    diskUsage: v.optional(v.number()),
    diskRead: v.optional(v.number()),
    diskWrite: v.optional(v.number()),
    processUptime: v.number(),
    processId: v.number(),
    nodeVersion: v.string(),
    region: v.optional(v.string()),
    environment: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("systemMetrics", {
      ...args,
      timestamp: new Date().toISOString(),
    });
  },
});

// 비즈니스 메트릭 저장
export const recordBusinessMetric = mutation({
  args: {
    metricType: v.string(),
    metricName: v.string(),
    value: v.number(),
    dimensions: v.optional(v.object({
      platform: v.optional(v.string()),
      personaId: v.optional(v.string()),
      planType: v.optional(v.string()),
      source: v.optional(v.string()),
      campaign: v.optional(v.string()),
    })),
    aggregationType: v.optional(v.string()),
    period: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity ? await getUserId(ctx, identity.subject) : undefined;

    return await ctx.db.insert("businessMetrics", {
      ...args,
      userId,
      timestamp: new Date().toISOString(),
    });
  },
});

// 에러 로그 저장
export const recordError = mutation({
  args: {
    level: v.string(),
    category: v.string(),
    message: v.string(),
    errorName: v.optional(v.string()),
    errorStack: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    pathname: v.optional(v.string()),
    endpoint: v.optional(v.string()),
    component: v.optional(v.string()),
    action: v.optional(v.string()),
    traceId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    requestId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    userAgent: v.optional(v.string()),
    ip: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity ? await getUserId(ctx, identity.subject) : undefined;

    return await ctx.db.insert("errorLogs", {
      ...args,
      userId,
      timestamp: new Date().toISOString(),
    });
  },
});

// Web Vitals 요약 조회
export const getWebVitalsSummary = query({
  args: {
    timeRange: v.optional(v.string()), // "1h", "24h", "7d", "30d"
    pathname: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    const timeRange = args.timeRange || "24h";
    const startTime = getStartTime(now, timeRange);

    let query = ctx.db
      .query("webVitals")
      .filter((q) => q.gte(q.field("timestamp"), startTime.toISOString()));

    if (args.pathname) {
      query = query.filter((q) => q.eq(q.field("pathname"), args.pathname));
    }

    const metrics = await query.collect();

    if (metrics.length === 0) {
      return null;
    }

    // 메트릭 집계
    const aggregate = (values: (number | undefined)[]) => {
      const filtered = values.filter((v): v is number => v !== undefined);
      if (filtered.length === 0) return null;
      
      const sorted = filtered.sort((a, b) => a - b);
      return {
        avg: filtered.reduce((a, b) => a + b, 0) / filtered.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p75: sorted[Math.floor(sorted.length * 0.75)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
        min: sorted[0],
        max: sorted[sorted.length - 1],
        count: filtered.length,
      };
    };

    return {
      timeRange,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      totalSessions: new Set(metrics.map(m => m.sessionId)).size,
      totalPageViews: metrics.length,
      metrics: {
        lcp: aggregate(metrics.map(m => m.lcp)),
        fid: aggregate(metrics.map(m => m.fid)),
        cls: aggregate(metrics.map(m => m.cls)),
        fcp: aggregate(metrics.map(m => m.fcp)),
        ttfb: aggregate(metrics.map(m => m.ttfb)),
        inp: aggregate(metrics.map(m => m.inp)),
      },
      deviceBreakdown: getDeviceBreakdown(metrics),
      browserBreakdown: getBrowserBreakdown(metrics),
    };
  },
});

// API 성능 요약 조회
export const getApiPerformanceSummary = query({
  args: {
    timeRange: v.optional(v.string()),
    endpoint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    const timeRange = args.timeRange || "24h";
    const startTime = getStartTime(now, timeRange);

    let query = ctx.db
      .query("apiMetrics")
      .filter((q) => q.gte(q.field("timestamp"), startTime.toISOString()));

    if (args.endpoint) {
      query = query.filter((q) => q.eq(q.field("endpoint"), args.endpoint));
    }

    const metrics = await query.collect();

    if (metrics.length === 0) {
      return null;
    }

    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter(m => m.success).length;
    const failedRequests = totalRequests - successfulRequests;

    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);

    // 엔드포인트별 집계
    const endpointStats = new Map<string, any>();
    metrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      if (!endpointStats.has(key)) {
        endpointStats.set(key, {
          endpoint: m.endpoint,
          method: m.method,
          count: 0,
          successCount: 0,
          totalTime: 0,
          errors: [],
        });
      }
      const stat = endpointStats.get(key)!;
      stat.count++;
      if (m.success) stat.successCount++;
      stat.totalTime += m.responseTime;
      if (!m.success && m.errorMessage) {
        stat.errors.push(m.errorMessage);
      }
    });

    return {
      timeRange,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      summary: {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: (successfulRequests / totalRequests) * 100,
        avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        p50ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.5)],
        p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
        p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)],
      },
      endpoints: Array.from(endpointStats.values())
        .map(stat => ({
          ...stat,
          avgResponseTime: stat.totalTime / stat.count,
          successRate: (stat.successCount / stat.count) * 100,
        }))
        .sort((a, b) => b.count - a.count),
      statusCodeDistribution: getStatusCodeDistribution(metrics),
    };
  },
});

// 비즈니스 메트릭 대시보드 데이터
export const getBusinessMetricsDashboard = query({
  args: {
    timeRange: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    const timeRange = args.timeRange || "24h";
    const startTime = getStartTime(now, timeRange);

    const metrics = await ctx.db
      .query("businessMetrics")
      .filter((q) => q.gte(q.field("timestamp"), startTime.toISOString()))
      .collect();

    // 메트릭 타입별 그룹화
    const metricsByType = new Map<string, any[]>();
    metrics.forEach(m => {
      if (!metricsByType.has(m.metricType)) {
        metricsByType.set(m.metricType, []);
      }
      metricsByType.get(m.metricType)!.push(m);
    });

    const dashboard: any = {
      timeRange,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      metrics: {},
    };

    // 각 메트릭 타입별 집계
    for (const [type, typeMetrics] of metricsByType) {
      const metricNames = new Map<string, number[]>();
      
      typeMetrics.forEach(m => {
        if (!metricNames.has(m.metricName)) {
          metricNames.set(m.metricName, []);
        }
        metricNames.get(m.metricName)!.push(m.value);
      });

      dashboard.metrics[type] = {};
      for (const [name, values] of metricNames) {
        const sorted = values.sort((a, b) => a - b);
        dashboard.metrics[type][name] = {
          count: values.length,
          sum: values.reduce((a, b) => a + b, 0),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          p50: sorted[Math.floor(sorted.length * 0.5)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
        };
      }
    }

    // 활성 사용자 수 계산
    const uniqueUsers = new Set(metrics.filter(m => m.userId).map(m => m.userId));
    dashboard.activeUsers = uniqueUsers.size;

    return dashboard;
  },
});

// 최근 에러 조회
export const getRecentErrors = query({
  args: {
    limit: v.optional(v.number()),
    level: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    
    let query = ctx.db.query("errorLogs");
    
    if (args.level) {
      query = query.filter((q) => q.eq(q.field("level"), args.level));
    }
    
    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category));
    }

    const errors = await query
      .order("desc")
      .take(limit);

    return errors;
  },
});

// 헬퍼 함수들
async function getUserId(ctx: any, externalId: string): Promise<Id<"users"> | undefined> {
  const user = await ctx.db
    .query("users")
    .withIndex("byExternalId", (q: any) => q.eq("externalId", externalId))
    .first();
  return user?._id;
}

function getStartTime(now: Date, timeRange: string): Date {
  const startTime = new Date(now);
  switch (timeRange) {
    case "1h":
      startTime.setHours(startTime.getHours() - 1);
      break;
    case "24h":
      startTime.setDate(startTime.getDate() - 1);
      break;
    case "7d":
      startTime.setDate(startTime.getDate() - 7);
      break;
    case "30d":
      startTime.setDate(startTime.getDate() - 30);
      break;
    default:
      startTime.setDate(startTime.getDate() - 1);
  }
  return startTime;
}

function getDeviceBreakdown(metrics: any[]) {
  const devices = new Map<string, number>();
  metrics.forEach(m => {
    devices.set(m.deviceType, (devices.get(m.deviceType) || 0) + 1);
  });
  return Array.from(devices.entries()).map(([type, count]) => ({
    type,
    count,
    percentage: (count / metrics.length) * 100,
  }));
}

function getBrowserBreakdown(metrics: any[]) {
  const browsers = new Map<string, number>();
  metrics.forEach(m => {
    browsers.set(m.browser, (browsers.get(m.browser) || 0) + 1);
  });
  return Array.from(browsers.entries()).map(([browser, count]) => ({
    browser,
    count,
    percentage: (count / metrics.length) * 100,
  }));
}

function getStatusCodeDistribution(metrics: any[]) {
  const statusCodes = new Map<number, number>();
  metrics.forEach(m => {
    statusCodes.set(m.statusCode, (statusCodes.get(m.statusCode) || 0) + 1);
  });
  return Array.from(statusCodes.entries()).map(([code, count]) => ({
    code,
    count,
    percentage: (count / metrics.length) * 100,
  }));
}