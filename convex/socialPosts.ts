import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./auth";

// 게시물 목록 조회 (페이징 지원)
export const list = query({
  args: {
    limit: v.optional(v.number()),
    paginationOpts: v.optional(v.object({ 
      cursor: v.optional(v.string()),
      numItems: v.number() 
    })),
    status: v.optional(v.string()),
    personaId: v.optional(v.id("personas")),
  },
  handler: async (ctx, { limit = 50, paginationOpts, status, personaId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    let query = ctx.db
      .query("socialPosts")
      .withIndex("byUserId", (q) => q.eq("userId", userId));

    // 상태 필터링
    if (status) {
      query = query.filter((q) => q.eq(q.field("status"), status));
    }

    // 페르소나 필터링
    if (personaId) {
      query = query.filter((q) => q.eq(q.field("personaId"), personaId));
    }

    // 페이징 처리
    if (paginationOpts) {
      return await query
        .order("desc")
        .paginate(paginationOpts);
    }

    return {
      page: await query
        .order("desc")
        .take(limit),
      isDone: true,
      continueCursor: null
    };
  },
});

// 특정 게시물 조회
export const get = query({
  args: { id: v.id("socialPosts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const post = await ctx.db.get(id);
    if (!post) {
      throw new Error("게시물을 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (post.userId !== userId) {
      throw new Error("접근 권한이 없습니다");
    }

    // 페르소나 정보 함께 조회
    const persona = await ctx.db.get(post.personaId);
    
    // 변형 게시물들 조회
    const variants = await ctx.db
      .query("postVariants")
      .withIndex("byPostId", (q) => q.eq("postId", id))
      .order("desc")
      .collect();

    return {
      ...post,
      persona,
      variants,
    };
  },
});

// 게시물 생성 (초안)
export const create = mutation({
  args: {
    personaId: v.id("personas"),
    originalContent: v.string(),
    platforms: v.array(v.string()),
    hashtags: v.optional(v.array(v.string())),
    mediaUrls: v.optional(v.array(v.string())),
    threadCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 페르소나 소유 확인
    const persona = await ctx.db.get(args.personaId);
    if (!persona || persona.userId !== userId) {
      throw new Error("페르소나에 대한 접근 권한이 없습니다");
    }

    const now = new Date().toISOString();

    return await ctx.db.insert("socialPosts", {
      userId,
      personaId: args.personaId,
      originalContent: args.originalContent,
      finalContent: args.originalContent, // 초기값은 원본과 동일
      platforms: args.platforms,
      status: "draft",
      hashtags: args.hashtags || [],
      mediaUrls: args.mediaUrls,
      threadCount: args.threadCount || 1,
      creditsUsed: 0, // 초기 생성시에는 크레딧 미사용
      createdAt: now,
      updatedAt: now,
    });
  },
});

// 게시물 수정
export const update = mutation({
  args: {
    id: v.id("socialPosts"),
    originalContent: v.optional(v.string()),
    finalContent: v.optional(v.string()),
    platforms: v.optional(v.array(v.string())),
    hashtags: v.optional(v.array(v.string())),
    mediaUrls: v.optional(v.array(v.string())),
    threadCount: v.optional(v.number()),
    status: v.optional(v.string()),
    scheduledFor: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const post = await ctx.db.get(id);
    if (!post) {
      throw new Error("게시물을 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (post.userId !== userId) {
      throw new Error("수정 권한이 없습니다");
    }

    // 이미 발행된 게시물은 일부 필드만 수정 가능
    if (post.status === "published") {
      const allowedUpdates = ["hashtags"];
      const updateKeys = Object.keys(updates);
      const invalidUpdates = updateKeys.filter(key => !allowedUpdates.includes(key));
      
      if (invalidUpdates.length > 0) {
        throw new Error(`발행된 게시물은 ${allowedUpdates.join(", ")} 필드만 수정할 수 있습니다`);
      }
    }

    const now = new Date().toISOString();

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });

    return id;
  },
});

// 게시물 삭제
export const remove = mutation({
  args: { id: v.id("socialPosts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const post = await ctx.db.get(id);
    if (!post) {
      throw new Error("게시물을 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (post.userId !== userId) {
      throw new Error("삭제 권한이 없습니다");
    }

    // 예약된 게시물은 삭제 불가
    if (post.status === "scheduled") {
      throw new Error("예약된 게시물은 먼저 예약을 취소한 후 삭제할 수 있습니다");
    }

    // 관련된 변형 게시물들 삭제
    const variants = await ctx.db
      .query("postVariants")
      .withIndex("byPostId", (q) => q.eq("postId", id))
      .collect();

    for (const variant of variants) {
      await ctx.db.delete(variant._id);
    }

    // 관련된 스케줄 삭제
    const schedules = await ctx.db
      .query("scheduledPosts")
      .withIndex("byPostId", (q) => q.eq("postId", id))
      .collect();

    for (const schedule of schedules) {
      await ctx.db.delete(schedule._id);
    }

    // 게시물 삭제
    await ctx.db.delete(id);
    return id;
  },
});

// 게시물 상태 업데이트
export const updateStatus = mutation({
  args: {
    id: v.id("socialPosts"),
    status: v.string(),
    publishedAt: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const post = await ctx.db.get(args.id);
    if (!post) {
      throw new Error("게시물을 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (post.userId !== userId) {
      throw new Error("수정 권한이 없습니다");
    }

    const now = new Date().toISOString();

    await ctx.db.patch(args.id, {
      status: args.status,
      publishedAt: args.publishedAt,
      errorMessage: args.errorMessage,
      updatedAt: now,
    });

    return args.id;
  },
});

// 게시물 메트릭 업데이트
export const updateMetrics = mutation({
  args: {
    id: v.id("socialPosts"),
    platform: v.string(),
    metrics: v.object({
      views: v.optional(v.number()),
      likes: v.optional(v.number()),
      retweets: v.optional(v.number()),
      replies: v.optional(v.number()),
      quotes: v.optional(v.number()),
      reposts: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { id, platform, metrics }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const post = await ctx.db.get(id);
    if (!post) {
      throw new Error("게시물을 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (post.userId !== userId) {
      throw new Error("수정 권한이 없습니다");
    }

    const now = new Date().toISOString();
    const currentMetrics = post.metrics || {};

    // 플랫폼별 메트릭 업데이트
    const updatedMetrics = {
      ...currentMetrics,
      [platform]: {
        ...currentMetrics[platform as keyof typeof currentMetrics],
        ...metrics,
      },
      lastUpdatedAt: now,
    };

    await ctx.db.patch(id, {
      metrics: updatedMetrics,
      updatedAt: now,
    });

    return id;
  },
});

// 대시보드용 통계 조회
export const getDashboardStats = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    let query = ctx.db
      .query("socialPosts")
      .withIndex("byUserId", (q) => q.eq("userId", userId));

    // 날짜 필터링 (필요시 구현)
    const posts = await query.collect();

    const stats = {
      total: posts.length,
      draft: posts.filter(p => p.status === "draft").length,
      scheduled: posts.filter(p => p.status === "scheduled").length,
      published: posts.filter(p => p.status === "published").length,
      failed: posts.filter(p => p.status === "failed").length,
      totalCreditsUsed: posts.reduce((sum, p) => sum + p.creditsUsed, 0),
    };

    return stats;
  },
});

// 특정 페르소나의 게시물 조회
export const getByPersona = query({
  args: {
    personaId: v.id("personas"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { personaId, limit = 20 }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 페르소나 소유 확인
    const persona = await ctx.db.get(personaId);
    if (!persona || persona.userId !== userId) {
      throw new Error("페르소나에 대한 접근 권한이 없습니다");
    }

    return await ctx.db
      .query("socialPosts")
      .withIndex("byPersonaId", (q) => q.eq("personaId", personaId))
      .order("desc")
      .take(limit);
  },
});