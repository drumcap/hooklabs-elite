/**
 * 메트릭 수집 및 관리
 */

import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";

// 이벤트 카운트 증가
export const incrementEventCount = internalMutation({
  args: {
    eventType: v.string(),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    const hour = args.timestamp.substring(0, 13); // YYYY-MM-DDTHH
    const key = `events_${args.eventType}_${hour}`;
    
    const existing = await ctx.db
      .query("metrics")
      .withIndex("byMetric", (q) => q.eq("metric", key))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: existing.value + 1,
      });
    } else {
      await ctx.db.insert("metrics", {
        metric: key,
        value: 1,
        dimensions: { eventType: args.eventType, hour },
        timestamp: args.timestamp,
      });
    }
  },
});

// 실시간 메트릭 조회
export const getRealtimeMetrics = query({
  args: {
    window: v.optional(v.string()),
  },
  handler: async (ctx, { window = '1hour' }) => {
    const now = Date.now();
    const windowMillis: Record<string, number> = {
      '5min': 5 * 60 * 1000,
      '1hour': 60 * 60 * 1000,
      '24hour': 24 * 60 * 60 * 1000,
    };
    
    const since = new Date(now - (windowMillis[window] || windowMillis['1hour'])).toISOString();
    
    // 윈도우 집계 조회
    const aggregations = await ctx.db
      .query("windowAggregations")
      .withIndex("byWindow", (q) => q.eq("window", window))
      .collect();
    
    // 최근 이벤트 수
    const events = await ctx.db
      .query("eventStreams")
      .withIndex("byTimestamp")
      .filter((q) => q.gte(q.field("timestamp"), since))
      .take(1000);
    
    // 이벤트 타입별 집계
    const byType: Record<string, number> = {};
    for (const event of events) {
      byType[event.eventType] = (byType[event.eventType] || 0) + 1;
    }
    
    // 처리율 계산
    const processed = events.filter(e => e.processed).length;
    const processingRate = events.length > 0 ? (processed / events.length) * 100 : 0;
    
    return {
      window,
      timestamp: new Date().toISOString(),
      summary: {
        totalEvents: events.length,
        processedEvents: processed,
        processingRate: Math.round(processingRate * 100) / 100,
        eventsPerSecond: events.length / (windowMillis[window] / 1000),
      },
      byType,
      aggregations: aggregations.map(agg => ({
        metric: agg.metric,
        count: agg.count,
        sum: agg.sum,
        avg: agg.count > 0 ? agg.sum / agg.count : 0,
        min: agg.min,
        max: agg.max,
      })),
    };
  },
});

// 메트릭 대시보드 데이터
export const getDashboardMetrics = query({
  args: {},
  handler: async (ctx) => {
    // 오늘 날짜
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // 실시간 메트릭 (최근 5분)
    const realtimeWindow = await ctx.db
      .query("windowAggregations")
      .withIndex("byWindow", (q) => q.eq("window", "5min"))
      .order("desc")
      .first();
    
    // 오늘 총 이벤트
    const todayEvents = await ctx.db
      .query("eventStreams")
      .withIndex("byTimestamp")
      .filter((q) => q.gte(q.field("timestamp"), today))
      .collect();
    
    // 어제 총 이벤트 (비교용)
    const yesterdayEvents = await ctx.db
      .query("eventStreams")
      .withIndex("byTimestamp")
      .filter((q) => 
        q.and(
          q.gte(q.field("timestamp"), yesterday),
          q.lt(q.field("timestamp"), today)
        )
      )
      .collect();
    
    // Dead Letter Queue 크기
    const dlqSize = await ctx.db
      .query("deadLetterQueue")
      .collect();
    
    // 데이터 품질 점수 (최신)
    const latestQuality = await ctx.db
      .query("dataQualityChecks")
      .order("desc")
      .first();
    
    return {
      realtime: {
        eventsPerSecond: realtimeWindow ? realtimeWindow.count / 300 : 0, // 5분 = 300초
        lastUpdated: realtimeWindow?.lastUpdated || null,
      },
      today: {
        totalEvents: todayEvents.length,
        processedEvents: todayEvents.filter(e => e.processed).length,
        failedEvents: dlqSize.length,
      },
      comparison: {
        yesterdayTotal: yesterdayEvents.length,
        change: todayEvents.length - yesterdayEvents.length,
        changePercent: yesterdayEvents.length > 0 
          ? ((todayEvents.length - yesterdayEvents.length) / yesterdayEvents.length) * 100
          : 0,
      },
      dataQuality: {
        score: latestQuality?.qualityScore || 0,
        lastChecked: latestQuality?.timestamp || null,
      },
      timestamp: new Date().toISOString(),
    };
  },
});