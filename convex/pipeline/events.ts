// 파이프라인 이벤트 처리 관련 함수들
import { internalMutation, internalQuery, internalAction } from "../_generated/server";
import { v } from "convex/values";

// 실시간 이벤트 처리
export const processRealtimeEvent = internalAction({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    console.log(`Processing realtime event: ${args.eventId} of type ${args.eventType}`);
    // 실제 이벤트 처리 로직은 여기에 구현
    // 예: 변환, 메트릭 업데이트, 알림 발송 등
  },
});

// 이벤트 처리 완료 표시
export const markEventProcessed = internalMutation({
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
export const moveToDeadLetterQueue = internalMutation({
  args: {
    eventId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("deadLetterQueue", {
      eventId: args.eventId,
      error: args.error,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
    });
  },
});

// 최근 이벤트 조회
export const getRecentEvents = internalQuery({
  args: {
    limit: v.number(),
    eventType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("eventStreams")
      .order("desc")
      .take(args.limit);

    if (args.eventType) {
      return await ctx.db
        .query("eventStreams")
        .withIndex("byEventType", (q) => q.eq("eventType", args.eventType!))
        .order("desc")
        .take(args.limit);
    }

    return await query;
  },
});