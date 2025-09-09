/**
 * 실시간 이벤트 수집 시스템
 */

import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { EventStream, DataQualityResult } from "./types";
import { withErrorHandling, ValidationError } from "../lib/errors";

// 이벤트 스트림 저장
export const ingestEvent = mutation({
  args: {
    source: v.union(
      v.literal("web"),
      v.literal("mobile"),
      v.literal("api"),
      v.literal("social"),
      v.literal("webhook")
    ),
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
  },
  handler: async (ctx, args) => {
    return await withErrorHandling(
      async () => {
        const timestamp = new Date().toISOString();
        
        // 이벤트 ID 생성 (UUID 대체)
        const eventId = `${args.source}_${args.eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // 데이터 검증
        validateEvent(args);
        
        // 이벤트 저장
        const event = await ctx.db.insert("eventStreams", {
          eventId,
          source: args.source,
          eventType: args.eventType,
          userId: args.userId,
          sessionId: args.sessionId,
          payload: args.payload,
          metadata: args.metadata,
          timestamp,
          processed: false,
        });
        
        // 실시간 처리 트리거 (비동기)
        await ctx.scheduler.runAfter(0, internal.pipeline.events.processRealtimeEvent, {
          eventId,
          eventType: args.eventType,
          payload: args.payload,
        });
        
        return { eventId, timestamp };
      },
      {
        context: { action: 'ingestEvent', source: args.source, eventType: args.eventType },
        maxRetries: 3,
      }
    );
  },
});

// 배치 이벤트 수집
export const ingestBatch = mutation({
  args: {
    events: v.array(v.object({
      source: v.string(),
      eventType: v.string(),
      userId: v.optional(v.id("users")),
      payload: v.any(),
      timestamp: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { events }) => {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    for (const event of events) {
      try {
        validateEvent(event);
        
        const eventId = `batch_${event.source}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = event.timestamp || new Date().toISOString();
        
        await ctx.db.insert("eventStreams", {
          eventId,
          source: event.source as any,
          eventType: event.eventType,
          userId: event.userId,
          payload: event.payload,
          timestamp,
          processed: false,
        });
        
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Event ${event.eventType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return results;
  },
});

// 이벤트 검증 함수
function validateEvent(event: any): void {
  // 필수 필드 검증
  if (!event.source || !event.eventType) {
    throw new ValidationError("이벤트에 필수 필드가 누락되었습니다", "source/eventType");
  }
  
  // 페이로드 크기 제한 (1MB)
  const payloadSize = JSON.stringify(event.payload).length;
  if (payloadSize > 1024 * 1024) {
    throw new ValidationError("페이로드 크기가 1MB를 초과합니다", "payload", payloadSize);
  }
  
  // 이벤트 타입별 검증
  switch (event.eventType) {
    case 'page_view':
      if (!event.payload?.url) {
        throw new ValidationError("page_view 이벤트에 URL이 필요합니다", "payload.url");
      }
      break;
      
    case 'post_published':
      if (!event.payload?.postId || !event.payload?.platform) {
        throw new ValidationError("post_published 이벤트에 postId와 platform이 필요합니다");
      }
      break;
      
    case 'credit_consumed':
      if (!event.userId || !event.payload?.amount) {
        throw new ValidationError("credit_consumed 이벤트에 userId와 amount가 필요합니다");
      }
      break;
  }
}

// 실시간 이벤트 처리
export const processRealtimeEvent = action({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, { eventId, eventType, payload }) => {
    try {
      // 이벤트 타입별 처리 로직
      switch (eventType) {
        case 'page_view':
          await processPageView(ctx, payload);
          break;
          
        case 'post_published':
          await processPostPublished(ctx, payload);
          break;
          
        case 'engagement_received':
          await processEngagement(ctx, payload);
          break;
          
        case 'credit_consumed':
          await processCreditUsage(ctx, payload);
          break;
          
        case 'user_action':
          await processUserAction(ctx, payload);
          break;
          
        default:
          console.log(`Unknown event type: ${eventType}`);
      }
      
      // 처리 완료 표시
      await ctx.runMutation(internal.pipeline.events.markEventProcessed, { eventId });
      
      // 실시간 메트릭 업데이트
      await updateRealtimeMetrics(ctx, eventType);
      
    } catch (error) {
      console.error(`Failed to process event ${eventId}:`, error);
      
      // Dead Letter Queue로 이동
      await ctx.runMutation(internal.pipeline.events.moveToDeadLetterQueue, {
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
});

// 페이지 뷰 처리
async function processPageView(ctx: any, payload: any) {
  // 세션 추적
  if (payload.sessionId) {
    await ctx.runMutation(internal.analytics.updateSession, {
      sessionId: payload.sessionId,
      pageUrl: payload.url,
      timestamp: new Date().toISOString(),
    });
  }
  
  // 페이지 메트릭 업데이트
  await ctx.runMutation(internal.analytics.incrementPageView, {
    url: payload.url,
    referrer: payload.referrer,
  });
}

// 포스트 발행 처리
async function processPostPublished(ctx: any, payload: any) {
  // 포스트 메트릭 초기화
  await ctx.runMutation(internal.socialMetrics.initializePostMetrics, {
    postId: payload.postId,
    platform: payload.platform,
    userId: payload.userId,
  });
  
  // 발행 알림
  if (payload.notifyFollowers) {
    await ctx.runAction(internal.notifications.notifyNewPost, {
      postId: payload.postId,
      userId: payload.userId,
    });
  }
}

// 참여 처리
async function processEngagement(ctx: any, payload: any) {
  await ctx.runMutation(internal.socialMetrics.updateEngagement, {
    postId: payload.postId,
    type: payload.type,
    count: payload.count || 1,
  });
}

// 크레딧 사용 처리
async function processCreditUsage(ctx: any, payload: any) {
  // 사용량 추적
  await ctx.runMutation(internal.usage.trackCreditUsage, {
    userId: payload.userId,
    amount: payload.amount,
    feature: payload.feature,
    timestamp: new Date().toISOString(),
  });
  
  // 임계값 체크
  const balance = await ctx.runQuery(internal.credits.getBalanceInternal, {
    userId: payload.userId,
  });
  
  if (balance.availableCredits < 10) {
    // 낮은 크레딧 알림
    await ctx.runAction(internal.notifications.sendLowCreditAlert, {
      userId: payload.userId,
      credits: balance.availableCredits,
    });
  }
}

// 사용자 액션 처리
async function processUserAction(ctx: any, payload: any) {
  await ctx.runMutation(internal.analytics.trackUserAction, {
    userId: payload.userId,
    action: payload.action,
    metadata: payload.metadata,
    timestamp: new Date().toISOString(),
  });
}

// 실시간 메트릭 업데이트
async function updateRealtimeMetrics(ctx: any, eventType: string) {
  await ctx.runMutation(internal.metrics.incrementEventCount, {
    eventType,
    timestamp: new Date().toISOString(),
  });
}

// 이벤트 처리 완료 표시
export const markEventProcessed = mutation({
  args: { eventId: v.string() },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db
      .query("eventStreams")
      .withIndex("byEventId", (q) => q.eq("eventId", eventId))
      .first();
    
    if (event) {
      await ctx.db.patch(event._id, {
        processed: true,
        processedAt: new Date().toISOString(),
      });
    }
  },
});

// Dead Letter Queue로 이동
export const moveToDeadLetterQueue = mutation({
  args: {
    eventId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, { eventId, error }) => {
    await ctx.db.insert("deadLetterQueue", {
      eventId,
      error,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
    });
  },
});

// 미처리 이벤트 조회
export const getUnprocessedEvents = query({
  args: {
    limit: v.optional(v.number()),
    olderThan: v.optional(v.string()),
  },
  handler: async (ctx, { limit = 100, olderThan }) => {
    let query = ctx.db
      .query("eventStreams")
      .withIndex("byProcessed", (q) => q.eq("processed", false));
    
    if (olderThan) {
      query = query.filter((q) => q.lt(q.field("timestamp"), olderThan));
    }
    
    return await query.take(limit);
  },
});

// 이벤트 통계 조회
export const getEventStats = query({
  args: {
    timeRange: v.optional(v.string()),
  },
  handler: async (ctx, { timeRange = '24h' }) => {
    const now = Date.now();
    const ranges: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    
    const startTime = new Date(now - (ranges[timeRange] || ranges['24h'])).toISOString();
    
    const events = await ctx.db
      .query("eventStreams")
      .withIndex("byTimestamp")
      .filter((q) => q.gte(q.field("timestamp"), startTime))
      .collect();
    
    // 이벤트 타입별 집계
    const byType = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 소스별 집계
    const bySource = events.reduce((acc, event) => {
      acc[event.source] = (acc[event.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 처리 상태별 집계
    const processed = events.filter(e => e.processed).length;
    const unprocessed = events.length - processed;
    
    return {
      total: events.length,
      processed,
      unprocessed,
      byType,
      bySource,
      timeRange,
      startTime,
      endTime: new Date().toISOString(),
    };
  },
});

// 데이터 품질 체크
export const checkDataQuality = action({
  args: {
    dataset: v.string(),
    sampleSize: v.optional(v.number()),
  },
  handler: async (ctx, { dataset, sampleSize = 1000 }): Promise<DataQualityResult> => {
    const events = await ctx.runQuery(internal.pipeline.events.getRecentEvents, {
      limit: sampleSize,
    });
    
    let validRecords = 0;
    const issues: any[] = [];
    const issueCount: Record<string, number> = {};
    
    for (const event of events) {
      let isValid = true;
      
      // 필수 필드 체크
      if (!event.eventId || !event.source || !event.eventType) {
        isValid = false;
        const issue = '필수 필드 누락';
        issueCount[issue] = (issueCount[issue] || 0) + 1;
      }
      
      // 타임스탬프 형식 체크
      if (!isValidISO8601(event.timestamp)) {
        isValid = false;
        const issue = '잘못된 타임스탬프 형식';
        issueCount[issue] = (issueCount[issue] || 0) + 1;
      }
      
      // 페이로드 검증
      if (event.payload && typeof event.payload !== 'object') {
        isValid = false;
        const issue = '잘못된 페이로드 형식';
        issueCount[issue] = (issueCount[issue] || 0) + 1;
      }
      
      if (isValid) {
        validRecords++;
      }
    }
    
    // 이슈 정리
    for (const [issue, count] of Object.entries(issueCount)) {
      issues.push({
        field: 'various',
        issue,
        count,
        severity: count > sampleSize * 0.1 ? 'high' : count > sampleSize * 0.05 ? 'medium' : 'low',
      });
    }
    
    const qualityScore = Math.round((validRecords / events.length) * 100);
    
    return {
      dataset,
      timestamp: new Date().toISOString(),
      totalRecords: events.length,
      validRecords,
      invalidRecords: events.length - validRecords,
      qualityScore,
      issues,
    };
  },
});

// ISO 8601 형식 검증
function isValidISO8601(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return date.toISOString() === dateString;
  } catch {
    return false;
  }
}

// 최근 이벤트 조회 (내부용)
export const getRecentEvents = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query("eventStreams")
      .order("desc")
      .take(limit);
  },
});