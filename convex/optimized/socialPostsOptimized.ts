import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUserId } from "../auth";

// 📈 최적화된 게시물 상세 조회 - 배치 처리로 N+1 문제 해결
export const getOptimized = query({
  args: { id: v.id("socialPosts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 1. 메인 게시물 조회
    const post = await ctx.db.get(id);
    if (!post || post.userId !== userId) {
      throw new Error("접근 권한이 없습니다");
    }

    // 2. 배치로 관련 데이터 동시 조회 (N+1 해결)
    const [persona, variants, schedules] = await Promise.all([
      ctx.db.get(post.personaId),
      ctx.db.query("postVariants")
        .withIndex("byPostId", (q) => q.eq("postId", id))
        .order("desc")
        .collect(),
      ctx.db.query("scheduledPosts")
        .withIndex("byPostId", (q) => q.eq("postId", id))
        .collect()
    ]);

    return {
      ...post,
      persona,
      variants,
      schedules,
      // 계산된 메트릭 추가
      variantCount: variants.length,
      selectedVariant: variants.find(v => v.isSelected),
      bestVariant: variants.reduce((best, current) => 
        current.overallScore > best.overallScore ? current : best, variants[0]
      ),
    };
  },
});

// 📈 최적화된 게시물 목록 - 페이징과 프리로딩 결합
export const listOptimized = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    status: v.optional(v.string()),
    personaId: v.optional(v.id("personas")),
    includeMetrics: v.optional(v.boolean()),
  },
  handler: async (ctx, { limit = 20, cursor, status, personaId, includeMetrics = false }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    let query = ctx.db
      .query("socialPosts")
      .withIndex("byUserId", (q) => q.eq("userId", userId));

    // 효율적인 필터링
    if (status) {
      query = query.filter((q) => q.eq(q.field("status"), status));
    }
    if (personaId) {
      query = query.filter((q) => q.eq(q.field("personaId"), personaId));
    }

    // 페이지네이션 적용
    const result = await query
      .order("desc")
      .paginate({ cursor: cursor ?? null, numItems: limit });

    // 메트릭이 필요한 경우에만 추가 데이터 로드
    if (includeMetrics && result.page.length > 0) {
      const postIds = result.page.map(p => p._id);
      const [personas, variantCounts] = await Promise.all([
        // 페르소나 정보 배치 조회
        Promise.all(
          [...new Set(result.page.map(p => p.personaId))].map(id => ctx.db.get(id))
        ),
        // 변형 개수 배치 조회
        Promise.all(
          postIds.map(async (postId) => {
            const count = await ctx.db
              .query("postVariants")
              .withIndex("byPostId", (q) => q.eq("postId", postId))
              .collect()
              .then(variants => variants.length);
            return { postId, count };
          })
        )
      ]);

      const personaMap = new Map(personas.filter(Boolean).map(p => [p._id, p]));
      const variantCountMap = new Map(variantCounts.map(vc => [vc.postId, vc.count]));

      return {
        ...result,
        page: result.page.map(post => ({
          ...post,
          persona: personaMap.get(post.personaId),
          variantCount: variantCountMap.get(post._id) || 0,
        }))
      };
    }

    return result;
  },
});

// 📈 대시보드 통계 최적화 - 단일 쿼리로 집계
export const getDashboardStatsOptimized = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 날짜 필터링이 있는 경우에만 적용
    let query = ctx.db
      .query("socialPosts")
      .withIndex("byUserId", (q) => q.eq("userId", userId));

    const posts = await query.collect();
    
    // 메모리에서 효율적인 집계 (단일 패스)
    const stats = posts.reduce((acc, post) => {
      const postDate = post.createdAt;
      
      // 날짜 필터링
      if (startDate && postDate < startDate) return acc;
      if (endDate && postDate > endDate) return acc;
      
      acc.total++;
      acc.statusCount[post.status] = (acc.statusCount[post.status] || 0) + 1;
      acc.totalCreditsUsed += post.creditsUsed;
      
      return acc;
    }, {
      total: 0,
      statusCount: {} as Record<string, number>,
      totalCreditsUsed: 0,
    });

    return {
      total: stats.total,
      draft: stats.statusCount.draft || 0,
      scheduled: stats.statusCount.scheduled || 0,
      published: stats.statusCount.published || 0,
      failed: stats.statusCount.failed || 0,
      totalCreditsUsed: stats.totalCreditsUsed,
    };
  },
});

// 📈 페르소나별 게시물 통계 최적화
export const getPersonaPostStatsOptimized = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 병렬로 데이터 조회
    const [personas, allPosts] = await Promise.all([
      ctx.db.query("personas")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db.query("socialPosts")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .collect()
    ]);

    // 메모리에서 효율적인 그룹화
    const postsByPersona = allPosts.reduce((acc, post) => {
      const personaId = post.personaId;
      if (!acc[personaId]) {
        acc[personaId] = [];
      }
      acc[personaId].push(post);
      return acc;
    }, {} as Record<string, typeof allPosts>);

    return personas.map(persona => ({
      personaId: persona._id,
      personaName: persona.name,
      postCount: postsByPersona[persona._id]?.length || 0,
      drafts: postsByPersona[persona._id]?.filter(p => p.status === "draft").length || 0,
      published: postsByPersona[persona._id]?.filter(p => p.status === "published").length || 0,
      totalCredits: postsByPersona[persona._id]?.reduce((sum, p) => sum + p.creditsUsed, 0) || 0,
    }));
  },
});

// 📈 벌크 게시물 상태 업데이트 (배치 처리)
export const updateMultipleStatus = mutation({
  args: {
    postIds: v.array(v.id("socialPosts")),
    status: v.string(),
    publishedAt: v.optional(v.string()),
  },
  handler: async (ctx, { postIds, status, publishedAt }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const now = new Date().toISOString();
    
    // 권한 확인을 위해 배치 조회
    const posts = await Promise.all(
      postIds.map(id => ctx.db.get(id))
    );

    const validPosts = posts.filter(post => 
      post && post.userId === userId
    );

    if (validPosts.length !== postIds.length) {
      throw new Error("일부 게시물에 대한 권한이 없습니다");
    }

    // 배치 업데이트
    await Promise.all(
      validPosts.map(post =>
        ctx.db.patch(post._id, {
          status,
          publishedAt,
          updatedAt: now,
        })
      )
    );

    return validPosts.map(p => p._id);
  },
});