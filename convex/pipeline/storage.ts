// 파이프라인 스토리지 관련 함수들
import { query, mutation, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

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
      transformationId: args.transformationId,
      sourceType: args.sourceType,
      targetType: args.targetType,
      data: args.data,
      timestamp: new Date().toISOString(),
    });
  },
});

// 메트릭 데이터 조회
export const getMetricData = internalQuery({
  args: {
    metric: v.string(),
    startTime: v.string(),
    endTime: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("metrics")
      .withIndex("byMetric", (q) => q.eq("metric", args.metric))
      .filter((q) => 
        q.and(
          q.gte(q.field("timestamp"), args.startTime),
          q.lte(q.field("timestamp"), args.endTime)
        )
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
      metric: args.metric,
      window: args.window,
      result: args.result,
      timestamp: new Date().toISOString(),
    });
  },
});

// 배치 데이터 조회
export const getBatchData = internalQuery({
  args: {
    table: v.string(),
    limit: v.number(),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 실제 구현에서는 테이블에 따라 다른 쿼리를 수행해야 합니다
    // 여기서는 기본적인 구조만 제공합니다
    return {
      data: [],
      nextCursor: null,
      hasMore: false,
    };
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
    const existingJob = await ctx.db
      .query("batchJobs")
      .withIndex("byTransformationId", (q) => q.eq("transformationId", args.transformationId))
      .first();

    if (existingJob) {
      await ctx.db.patch(existingJob._id, {
        processed: args.processed,
        failed: args.failed,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("batchJobs", {
        transformationId: args.transformationId,
        type: "transform",
        status: "running",
        config: {},
        processed: args.processed,
        failed: args.failed,
        startedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      });
    }
  },
});