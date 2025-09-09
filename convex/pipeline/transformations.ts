/**
 * 데이터 변환 및 집계 레이어
 */

import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import type { 
  SocialMetric, 
  AggregationWindow, 
  AggregationResult,
  TransformationRule 
} from "./types";
import { withErrorHandling, ValidationError } from "../lib/errors";

// 변환 규칙 정의
const transformationRules: Record<string, TransformationRule> = {
  // 소셜 미디어 메트릭 정규화
  normalizeSocialMetrics: {
    id: 'normalize_social',
    name: '소셜 미디어 메트릭 정규화',
    sourceType: 'raw_social',
    targetType: 'social_metric',
    transform: (raw: any): SocialMetric => {
      // 플랫폼별 매핑
      const platformMappings: Record<string, any> = {
        twitter: {
          views: raw.impressions || raw.views || 0,
          likes: raw.favorites || raw.likes || 0,
          shares: raw.retweets || raw.shares || 0,
          comments: raw.replies || raw.comments || 0,
        },
        threads: {
          views: raw.views || 0,
          likes: raw.likes || 0,
          shares: raw.reposts || 0,
          comments: raw.replies || 0,
        },
        linkedin: {
          views: raw.impressions || 0,
          likes: raw.reactions || 0,
          shares: raw.shares || 0,
          comments: raw.comments || 0,
        },
      };
      
      const metrics = platformMappings[raw.platform] || {
        views: 0,
        likes: 0,
        shares: 0,
        comments: 0,
      };
      
      // 참여율 계산
      const engagementRate = metrics.views > 0 
        ? ((metrics.likes + metrics.shares + metrics.comments) / metrics.views) * 100
        : 0;
      
      return {
        platform: raw.platform,
        postId: raw.postId || raw.id,
        userId: raw.userId,
        metrics,
        engagementRate: Math.round(engagementRate * 100) / 100,
        timestamp: raw.timestamp || new Date().toISOString(),
        raw,
      };
    },
    validation: (output: SocialMetric) => {
      return Boolean(output.platform && 
             output.postId && 
             output.metrics.views >= 0);
    },
  },
  
  // 사용자 이벤트 강화
  enrichUserEvent: {
    id: 'enrich_user_event',
    name: '사용자 이벤트 강화',
    sourceType: 'user_event',
    targetType: 'enriched_event',
    transform: async (event: any) => {
      return {
        ...event,
        deviceInfo: parseUserAgent(event.userAgent),
        sessionDuration: calculateSessionDuration(event.sessionId),
        userSegment: getUserSegment(event.userId),
        timestamp: new Date().toISOString(),
      };
    },
  },
  
  // 크레딧 사용 집계
  aggregateCreditUsage: {
    id: 'aggregate_credits',
    name: '크레딧 사용 집계',
    sourceType: 'credit_event',
    targetType: 'credit_summary',
    transform: (events: any[]) => {
      const summary = events.reduce((acc, event) => {
        acc.total += event.amount;
        acc.byFeature[event.feature] = (acc.byFeature[event.feature] || 0) + event.amount;
        acc.count++;
        return acc;
      }, {
        total: 0,
        byFeature: {} as Record<string, number>,
        count: 0,
      });
      
      return {
        ...summary,
        average: summary.total / summary.count,
        timestamp: new Date().toISOString(),
      };
    },
  },
};

// 데이터 변환 실행
export const transformData = action({
  args: {
    sourceType: v.string(),
    data: v.any(),
    transformationId: v.string(),
  },
  handler: async (ctx, { sourceType, data, transformationId }) => {
    return await withErrorHandling(
      async () => {
        const rule = transformationRules[transformationId];
        
        if (!rule) {
          throw new ValidationError(`변환 규칙을 찾을 수 없습니다: ${transformationId}`);
        }
        
        if (rule.sourceType !== sourceType) {
          throw new ValidationError(
            `소스 타입 불일치`,
            'sourceType',
            { expected: rule.sourceType, actual: sourceType }
          );
        }
        
        // 변환 실행
        const transformed = await rule.transform(data);
        
        // 검증
        if (rule.validation && !rule.validation(transformed)) {
          throw new ValidationError('변환 결과 검증 실패', 'validation');
        }
        
        // 변환된 데이터 저장
        await ctx.runMutation(internal.pipeline.storage.saveTransformedData, {
          transformationId,
          sourceType,
          targetType: rule.targetType,
          data: transformed,
        });
        
        return transformed;
      },
      {
        context: { transformationId, sourceType },
        maxRetries: 2,
      }
    );
  },
});

// 변환된 데이터 저장
export const saveTransformedData = internalMutation({
  args: {
    transformationId: v.string(),
    sourceType: v.string(),
    targetType: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("transformedData", {
      ...args,
      timestamp: new Date().toISOString(),
    });
  },
});

// 윈도우 집계 실행
export const aggregateByWindow = action({
  args: {
    metric: v.string(),
    window: v.union(
      v.literal("5min"),
      v.literal("1hour"),
      v.literal("24hour"),
      v.literal("7days"),
      v.literal("30days")
    ),
    dimensions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { metric, window, dimensions = [] }): Promise<AggregationResult> => {
    const windowMillis = getWindowMillis(window);
    const now = Date.now();
    const startTime = new Date(now - windowMillis).toISOString();
    const endTime = new Date(now).toISOString();
    
    // 해당 기간의 데이터 조회
    const data = await ctx.runQuery(internal.pipeline.storage.getMetricData, {
      metric,
      startTime,
      endTime,
    });
    
    // 집계 계산
    const values = data.map((d: any) => d.value).filter((v: any) => typeof v === 'number');
    
    if (values.length === 0) {
      return {
        window,
        startTime,
        endTime,
        metrics: {
          count: 0,
          sum: 0,
          avg: 0,
          min: 0,
          max: 0,
        },
      };
    }
    
    const sorted = values.sort((a: number, b: number) => a - b);
    
    const result: AggregationResult = {
      window,
      startTime,
      endTime,
      metrics: {
        count: values.length,
        sum: values.reduce((a: number, b: number) => a + b, 0),
        avg: values.reduce((a: number, b: number) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      },
    };
    
    // 차원별 집계
    if (dimensions.length > 0) {
      result.dimensions = aggregateByDimensions(data, dimensions);
    }
    
    // 집계 결과 저장
    await ctx.runMutation(internal.pipeline.storage.saveAggregation, {
      metric,
      window,
      result,
    });
    
    return result;
  },
});

// 메트릭 데이터 조회
export const getMetricData = internalQuery({
  args: {
    metric: v.string(),
    startTime: v.string(),
    endTime: v.string(),
  },
  handler: async (ctx, { metric, startTime, endTime }) => {
    // 실제 구현에서는 적절한 테이블에서 데이터 조회
    return await ctx.db
      .query("metrics")
      .withIndex("byMetricAndTime", (q) => 
        q.eq("metric", metric)
         .gte("timestamp", startTime)
         .lte("timestamp", endTime)
      )
      .collect();
  },
});

// 집계 결과 저장
export const saveAggregation = internalMutation({
  args: {
    metric: v.string(),
    window: v.string(),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aggregations", {
      ...args,
      timestamp: new Date().toISOString(),
    });
  },
});

// 실시간 집계 업데이트
export const updateRealtimeAggregation = mutation({
  args: {
    metric: v.string(),
    value: v.number(),
    dimensions: v.optional(v.object({
      platform: v.optional(v.string()),
      userId: v.optional(v.id("users")),
      feature: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { metric, value, dimensions }) => {
    const timestamp = new Date().toISOString();
    
    // 메트릭 포인트 저장
    await ctx.db.insert("metrics", {
      metric,
      value,
      dimensions,
      timestamp,
    });
    
    // 5분 윈도우 업데이트
    await updateWindowAggregation(ctx, metric, value, '5min');
    
    // 1시간 윈도우 업데이트 (5분마다)
    const minute = new Date().getMinutes();
    if (minute % 5 === 0) {
      await updateWindowAggregation(ctx, metric, value, '1hour');
    }
    
    // 24시간 윈도우 업데이트 (1시간마다)
    if (minute === 0) {
      await updateWindowAggregation(ctx, metric, value, '24hour');
    }
  },
});

// 윈도우 집계 업데이트
async function updateWindowAggregation(
  ctx: any,
  metric: string,
  value: number,
  window: string
) {
  const now = new Date();
  const windowKey = `${metric}_${window}_${getWindowKey(now, window)}`;
  
  // 기존 집계 조회
  const existing = await ctx.db
    .query("windowAggregations")
    .withIndex("byWindowKey", (q: any) => q.eq("windowKey", windowKey))
    .first();
  
  if (existing) {
    // 기존 집계 업데이트
    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
      sum: existing.sum + value,
      min: Math.min(existing.min, value),
      max: Math.max(existing.max, value),
      lastUpdated: now.toISOString(),
    });
  } else {
    // 새 집계 생성
    await ctx.db.insert("windowAggregations", {
      windowKey,
      metric,
      window,
      count: 1,
      sum: value,
      min: value,
      max: value,
      startTime: getWindowStart(now, window).toISOString(),
      lastUpdated: now.toISOString(),
    });
  }
}

// 배치 변환 작업
export const runBatchTransformation = action({
  args: {
    sourceTable: v.string(),
    transformationId: v.string(),
    batchSize: v.optional(v.number()),
    startFrom: v.optional(v.string()),
  },
  handler: async (ctx, { sourceTable, transformationId, batchSize = 100, startFrom }) => {
    const rule = transformationRules[transformationId];
    
    if (!rule) {
      throw new ValidationError(`변환 규칙을 찾을 수 없습니다: ${transformationId}`);
    }
    
    let processed = 0;
    let failed = 0;
    let cursor = startFrom;
    
    while (true) {
      // 배치 데이터 조회
      const batchResult = await ctx.runQuery(internal.pipeline.storage.getBatchData, {
        table: sourceTable,
        limit: batchSize,
        cursor,
      });
      
      const batch = batchResult.data;
      if (batch.length === 0) break;
      
      // 각 레코드 변환
      for (const record of batch) {
        try {
          const transformed = await rule.transform(record);
          
          if (rule.validation && !rule.validation(transformed)) {
            failed++;
            continue;
          }
          
          await ctx.runMutation(internal.pipeline.storage.saveTransformedData, {
            transformationId,
            sourceType: rule.sourceType,
            targetType: rule.targetType,
            data: transformed,
          });
          
          processed++;
        } catch (error) {
          failed++;
          console.error(`변환 실패:`, error);
        }
      }
      
      // 다음 배치를 위한 커서 업데이트 (실제 구현에서는 nextCursor 사용)
      cursor = batchResult.nextCursor || undefined;
      
      // 진행 상황 업데이트
      await ctx.runMutation(internal.pipeline.storage.updateBatchProgress, {
        transformationId,
        processed,
        failed,
      });
    }
    
    return {
      transformationId,
      processed,
      failed,
      completed: true,
    };
  },
});

// 배치 데이터 조회
export const getBatchData = internalQuery({
  args: {
    table: v.string(),
    limit: v.number(),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { table, limit, cursor }) => {
    // 실제 구현에서는 동적 테이블 조회
    // 여기서는 예시로 eventStreams 사용
    let query = ctx.db.query("eventStreams");
    
    if (cursor) {
      // 커서 이후 데이터 조회
      query = query.filter((q) => q.gt(q.field("_id"), cursor));
    }
    
    return await query.take(limit);
  },
});

// 배치 진행 상황 업데이트
export const updateBatchProgress = internalMutation({
  args: {
    transformationId: v.string(),
    processed: v.number(),
    failed: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("batchJobs")
      .withIndex("byTransformationId", (q) => q.eq("transformationId", args.transformationId))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        processed: args.processed,
        failed: args.failed,
        lastUpdated: new Date().toISOString(),
      });
    }
  },
});

// 유틸리티 함수들
function getWindowMillis(window: AggregationWindow): number {
  const windows: Record<AggregationWindow, number> = {
    '5min': 5 * 60 * 1000,
    '1hour': 60 * 60 * 1000,
    '24hour': 24 * 60 * 60 * 1000,
    '7days': 7 * 24 * 60 * 60 * 1000,
    '30days': 30 * 24 * 60 * 60 * 1000,
  };
  return windows[window];
}

function getWindowKey(date: Date, window: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  
  switch (window) {
    case '5min':
      return `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}_${hour.toString().padStart(2, '0')}${Math.floor(minute / 5) * 5}`;
    case '1hour':
      return `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}_${hour.toString().padStart(2, '0')}`;
    case '24hour':
      return `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
    default:
      return `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
  }
}

function getWindowStart(date: Date, window: string): Date {
  const d = new Date(date);
  
  switch (window) {
    case '5min':
      d.setMinutes(Math.floor(d.getMinutes() / 5) * 5, 0, 0);
      break;
    case '1hour':
      d.setMinutes(0, 0, 0);
      break;
    case '24hour':
      d.setHours(0, 0, 0, 0);
      break;
  }
  
  return d;
}

function parseUserAgent(userAgent?: string): any {
  if (!userAgent) return {};
  
  // 간단한 UA 파싱 (실제로는 ua-parser-js 같은 라이브러리 사용)
  const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
  const isTablet = /iPad|Tablet/i.test(userAgent);
  
  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    browser: getBrowser(userAgent),
    os: getOS(userAgent),
  };
}

function getBrowser(ua: string): string {
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edge')) return 'Edge';
  return 'Other';
}

function getOS(ua: string): string {
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
}

function calculateSessionDuration(sessionId?: string): number {
  // 실제 구현에서는 세션 시작/종료 시간 계산
  return 0;
}

function getUserSegment(userId?: string): string {
  // 실제 구현에서는 사용자 세그먼트 조회
  return 'default';
}

function aggregateByDimensions(data: any[], dimensions: string[]): Record<string, any> {
  // 차원별 집계 로직
  const result: Record<string, any> = {};
  
  for (const dimension of dimensions) {
    result[dimension] = {};
    
    for (const item of data) {
      const key = item[dimension] || 'unknown';
      if (!result[dimension][key]) {
        result[dimension][key] = { count: 0, sum: 0 };
      }
      result[dimension][key].count++;
      result[dimension][key].sum += item.value || 0;
    }
  }
  
  return result;
}