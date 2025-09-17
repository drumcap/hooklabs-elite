import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { requireAuth, requireResourceOwnership } from "./lib/auth";
import { createResource, getResource, updateResource, deleteResource, listResources, batchDeleteResources } from "./lib/crud";
import { ValidatorComposer, DataSanitizer } from "./lib/validators";
import { SecurityLogger, InputSanitizer, DataMasker } from "./lib/encryption";

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
    const userId = await requireAuth(ctx);

    // 입력 검증
    if (status && typeof status !== 'string') {
      throw new Error("올바르지 않은 상태 형식입니다");
    }
    
    // 보안 로깅
    console.log(SecurityLogger.createSecurityLog(
      "social_posts_accessed",
      userId,
      { 
        limit, 
        status, 
        personaId,
        hasPagination: !!paginationOpts 
      },
      "info"
    ));

    const options = {
      pagination: paginationOpts ? {
        cursor: paginationOpts.cursor,
        limit: paginationOpts.numItems
      } : { limit },
      sort: { field: "_creationTime", direction: "desc" as const },
      indexName: "byUserId",
      filter: {
        status,
        personaId
      }
    };

    const posts = await listResources(ctx, "socialPosts", userId, options);

    // 페이징 처리
    if (paginationOpts) {
      let query = ctx.db
        .query("socialPosts")
        .withIndex("byUserId", (q) => q.eq("userId", userId));

      if (status) query = query.filter((q) => q.eq(q.field("status"), status));
      if (personaId) query = query.filter((q) => q.eq(q.field("personaId"), personaId));

      const result = await query
        .order("desc")
        .paginate({
          cursor: paginationOpts.cursor ?? null,
          numItems: paginationOpts.numItems
        });

      // 페르소나 정보 추가
      const postsWithPersona = await Promise.all(
        result.page.map(async (post) => {
          const persona = await ctx.db.get(post.personaId);
          return { ...post, persona };
        })
      );

      return {
        ...result,
        page: postsWithPersona,
      };
    }

    // 페르소나 정보 추가
    const postsWithPersona = await Promise.all(
      posts.slice(0, limit).map(async (post) => {
        const persona = await ctx.db.get(post.personaId);
        return { ...post, persona };
      })
    );

    return {
      page: postsWithPersona,
      isDone: true,
      continueCursor: null
    };
  },
});

// 특정 게시물 조회
export const get = query({
  args: { id: v.id("socialPosts") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    
    const post = await getResource(ctx, "socialPosts", id, userId);
    if (!post) {
      throw new Error("게시물을 찾을 수 없습니다");
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

// Internal query for action use (순환 참조 해결용)
export const getInternal = internalQuery({
  args: { id: v.id("socialPosts") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// 게시물 생성 (초안)
export const create = mutation({
  args: {
    personaId: v.id("personas"),
    originalContent: v.string(),
    finalContent: v.string(),
    platforms: v.array(v.string()),
    status: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    mediaUrls: v.optional(v.array(v.string())),
    threadCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // 페르소나 소유 확인
    await requireResourceOwnership(ctx, "personas", args.personaId);

    // 입력 검증 및 XSS 방지
    const sanitizedArgs = {
      originalContent: InputSanitizer.stripHtml(args.originalContent),
      platforms: args.platforms.map(platform => InputSanitizer.sanitizeInput(platform)),
      hashtags: args.hashtags?.map(tag => InputSanitizer.sanitizeInput(tag)),
      mediaUrls: args.mediaUrls, // URL은 별도 검증 필요
      threadCount: args.threadCount
    };

    // 데이터 검증
    const validation = ValidatorComposer.validateSocialPost({
      content: sanitizedArgs.originalContent,
      platforms: sanitizedArgs.platforms,
      hashtags: sanitizedArgs.hashtags,
    });
    
    if (!validation.isValid) {
      console.log(SecurityLogger.createSecurityLog(
        "social_post_validation_failed",
        userId,
        { errors: validation.errors, personaId: args.personaId },
        "warning"
      ));
      throw new Error(validation.errors[0]);
    }

    // 보안 로깅
    console.log(SecurityLogger.createSecurityLog(
      "social_post_created",
      userId,
      { 
        personaId: args.personaId,
        platforms: sanitizedArgs.platforms,
        hasHashtags: !!(sanitizedArgs.hashtags?.length),
        hasMedia: !!(sanitizedArgs.mediaUrls?.length),
        contentLength: sanitizedArgs.originalContent.length
      },
      "info"
    ));

    // 데이터 정규화
    const sanitizedData = {
      userId,
      personaId: args.personaId,
      originalContent: DataSanitizer.text(args.originalContent),
      finalContent: DataSanitizer.text(args.originalContent), // 초기값은 원본과 동일
      platforms: args.platforms,
      status: "draft",
      hashtags: args.hashtags?.map(tag => DataSanitizer.hashtag(tag)) || [],
      mediaUrls: args.mediaUrls?.map(url => DataSanitizer.url(url)),
      threadCount: args.threadCount || 1,
      creditsUsed: 0, // 초기 생성시에는 크레딧 미사용
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return await createResource(ctx, "socialPosts", sanitizedData, userId);
  },
});

// Internal mutation for action use (초안 생성)
export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    personaId: v.id("personas"),
    originalContent: v.string(),
    finalContent: v.string(),
    platforms: v.array(v.string()),
    status: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    mediaUrls: v.optional(v.array(v.string())),
    threadCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 페르소나 확인 (소유권 검증은 action에서 이미 수행)
    const persona = await ctx.db.get(args.personaId);
    if (!persona) {
      throw new Error("페르소나를 찾을 수 없습니다");
    }

    const now = new Date().toISOString();

    return await ctx.db.insert("socialPosts", {
      userId: args.userId,
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
    const userId = await requireAuth(ctx);

    const post = await getResource(ctx, "socialPosts", id, userId);
    if (!post) {
      throw new Error("게시물을 찾을 수 없습니다");
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

    // 데이터 정규화
    const sanitizedUpdates = {
      ...updates,
      ...(updates.originalContent && { originalContent: DataSanitizer.text(updates.originalContent) }),
      ...(updates.finalContent && { finalContent: DataSanitizer.text(updates.finalContent) }),
      ...(updates.hashtags && { hashtags: updates.hashtags.map(tag => DataSanitizer.hashtag(tag)) }),
      ...(updates.mediaUrls && { mediaUrls: updates.mediaUrls.map(url => DataSanitizer.url(url)) }),
    };

    await updateResource(ctx, "socialPosts", id, sanitizedUpdates, userId);
    return id;
  },
});

// 게시물 삭제
export const remove = mutation({
  args: { id: v.id("socialPosts") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);

    const post = await getResource(ctx, "socialPosts", id, userId);
    if (!post) {
      throw new Error("게시물을 찾을 수 없습니다");
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

    const variantIds = variants.map(v => v._id);
    if (variantIds.length > 0) {
      await batchDeleteResources(ctx, "postVariants", variantIds, undefined, false);
    }

    // 관련된 스케줄 삭제
    const schedules = await ctx.db
      .query("scheduledPosts")
      .withIndex("byPostId", (q) => q.eq("postId", id))
      .collect();

    const scheduleIds = schedules.map(s => s._id);
    if (scheduleIds.length > 0) {
      await batchDeleteResources(ctx, "scheduledPosts", scheduleIds, undefined, false);
    }

    // 게시물 삭제
    await deleteResource(ctx, "socialPosts", id, userId);
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
    const userId = await requireAuth(ctx);

    const updates = {
      status: args.status,
      publishedAt: args.publishedAt,
      errorMessage: args.errorMessage,
    };

    await updateResource(ctx, "socialPosts", args.id, updates, userId);
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
    const userId = await requireAuth(ctx);

    const post = await getResource(ctx, "socialPosts", id, userId);
    if (!post) {
      throw new Error("게시물을 찾을 수 없습니다");
    }

    const now = new Date().toISOString();
    const currentMetrics = post.metrics || {};

    // 플랫폼별 메트릭 업데이트
    const platformMetrics = currentMetrics?.[platform as keyof typeof currentMetrics] || {};
    const updatedMetrics = {
      ...currentMetrics,
      [platform]: {
        ...(typeof platformMetrics === 'object' && platformMetrics !== null ? platformMetrics : {}),
        ...metrics,
      },
      lastUpdatedAt: now,
    };

    await updateResource(ctx, "socialPosts", id, { metrics: updatedMetrics }, userId);
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
    const userId = await requireAuth(ctx);

    const posts = await listResources(ctx, "socialPosts", userId, {
      indexName: "byUserId"
    });

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
    const userId = await requireAuth(ctx);

    // 페르소나 소유 확인
    await requireResourceOwnership(ctx, "personas", personaId);

    return await ctx.db
      .query("socialPosts")
      .withIndex("byPersonaId", (q) => q.eq("personaId", personaId))
      .order("desc")
      .take(limit);
  },
});

// 최근 소셜 게시물 조회 (대시보드용)
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 10 }) => {
    const userId = await requireAuth(ctx);

    return await listResources(ctx, "socialPosts", userId, {
      pagination: { limit },
      sort: { field: "_creationTime", direction: "desc" },
      indexName: "byUserId"
    });
  },
});