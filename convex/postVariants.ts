import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./auth";

// 특정 게시물의 변형들 조회
export const getByPost = query({
  args: { postId: v.id("socialPosts") },
  handler: async (ctx, { postId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 게시물 소유 확인
    const post = await ctx.db.get(postId);
    if (!post || post.userId !== userId) {
      throw new Error("게시물에 대한 접근 권한이 없습니다");
    }

    return await ctx.db
      .query("postVariants")
      .withIndex("byPostId", (q) => q.eq("postId", postId))
      .order("desc")
      .collect();
  },
});

// 특정 변형 조회
export const get = query({
  args: { id: v.id("postVariants") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const variant = await ctx.db.get(id);
    if (!variant) {
      throw new Error("변형을 찾을 수 없습니다");
    }

    // 게시물 소유 확인
    const post = await ctx.db.get(variant.postId);
    if (!post || post.userId !== userId) {
      throw new Error("접근 권한이 없습니다");
    }

    return variant;
  },
});

// 최고 점수 변형 조회
export const getBestVariant = query({
  args: { postId: v.id("socialPosts") },
  handler: async (ctx, { postId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 게시물 소유 확인
    const post = await ctx.db.get(postId);
    if (!post || post.userId !== userId) {
      throw new Error("게시물에 대한 접근 권한이 없습니다");
    }

    const variants = await ctx.db
      .query("postVariants")
      .withIndex("byPostId", (q) => q.eq("postId", postId))
      .collect();

    if (variants.length === 0) {
      return null;
    }

    // 점수순으로 정렬하여 최고점 변형 반환
    const bestVariant = variants.reduce((best, current) => 
      current.overallScore > best.overallScore ? current : best
    );

    return bestVariant;
  },
});

// 선택된 변형 조회
export const getSelectedVariant = query({
  args: { postId: v.id("socialPosts") },
  handler: async (ctx, { postId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 게시물 소유 확인
    const post = await ctx.db.get(postId);
    if (!post || post.userId !== userId) {
      throw new Error("게시물에 대한 접근 권한이 없습니다");
    }

    return await ctx.db
      .query("postVariants")
      .withIndex("byPostId", (q) => q.eq("postId", postId))
      .filter((q) => q.eq(q.field("isSelected"), true))
      .first();
  },
});

// 변형 생성
export const create = mutation({
  args: {
    postId: v.id("socialPosts"),
    content: v.string(),
    overallScore: v.number(),
    scoreBreakdown: v.object({
      engagement: v.number(),
      virality: v.number(),
      personaMatch: v.number(),
      readability: v.number(),
      trending: v.number(),
    }),
    aiModel: v.string(),
    promptUsed: v.string(),
    generationMetadata: v.optional(v.any()),
    creditsUsed: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 게시물 소유 확인
    const post = await ctx.db.get(args.postId);
    if (!post || post.userId !== userId) {
      throw new Error("게시물에 대한 접근 권한이 없습니다");
    }

    const now = new Date().toISOString();

    // 점수 유효성 검증
    if (args.overallScore < 0 || args.overallScore > 100) {
      throw new Error("전체 점수는 0-100 사이여야 합니다");
    }

    const scoreValues = Object.values(args.scoreBreakdown);
    if (scoreValues.some(score => score < 0 || score > 100)) {
      throw new Error("모든 세부 점수는 0-100 사이여야 합니다");
    }

    return await ctx.db.insert("postVariants", {
      postId: args.postId,
      content: args.content,
      overallScore: args.overallScore,
      scoreBreakdown: args.scoreBreakdown,
      isSelected: false, // 기본적으로 선택되지 않음
      aiModel: args.aiModel,
      promptUsed: args.promptUsed,
      generationMetadata: args.generationMetadata,
      creditsUsed: args.creditsUsed,
      generatedAt: now,
    });
  },
});

// 변형 선택/선택해제
export const selectVariant = mutation({
  args: {
    id: v.id("postVariants"),
  },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const variant = await ctx.db.get(id);
    if (!variant) {
      throw new Error("변형을 찾을 수 없습니다");
    }

    // 게시물 소유 확인
    const post = await ctx.db.get(variant.postId);
    if (!post || post.userId !== userId) {
      throw new Error("접근 권한이 없습니다");
    }

    // 같은 게시물의 다른 변형들 선택 해제
    const otherVariants = await ctx.db
      .query("postVariants")
      .withIndex("byPostId", (q) => q.eq("postId", variant.postId))
      .filter((q) => q.neq(q.field("_id"), id))
      .collect();

    for (const otherVariant of otherVariants) {
      if (otherVariant.isSelected) {
        await ctx.db.patch(otherVariant._id, { isSelected: false });
      }
    }

    // 현재 변형 선택
    await ctx.db.patch(id, { isSelected: true });

    // 게시물의 finalContent를 선택된 변형으로 업데이트
    await ctx.db.patch(variant.postId, {
      finalContent: variant.content,
      updatedAt: new Date().toISOString(),
    });

    return id;
  },
});

// 변형 선택 해제
export const deselectVariant = mutation({
  args: {
    id: v.id("postVariants"),
  },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const variant = await ctx.db.get(id);
    if (!variant) {
      throw new Error("변형을 찾을 수 없습니다");
    }

    // 게시물 소유 확인
    const post = await ctx.db.get(variant.postId);
    if (!post || post.userId !== userId) {
      throw new Error("접근 권한이 없습니다");
    }

    await ctx.db.patch(id, { isSelected: false });

    // 게시물의 finalContent를 원본으로 되돌리기
    await ctx.db.patch(variant.postId, {
      finalContent: post.originalContent,
      updatedAt: new Date().toISOString(),
    });

    return id;
  },
});

// 변형 삭제
export const remove = mutation({
  args: { id: v.id("postVariants") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const variant = await ctx.db.get(id);
    if (!variant) {
      throw new Error("변형을 찾을 수 없습니다");
    }

    // 게시물 소유 확인
    const post = await ctx.db.get(variant.postId);
    if (!post || post.userId !== userId) {
      throw new Error("삭제 권한이 없습니다");
    }

    // 선택된 변형이면 게시물의 finalContent를 원본으로 되돌리기
    if (variant.isSelected) {
      await ctx.db.patch(variant.postId, {
        finalContent: post.originalContent,
        updatedAt: new Date().toISOString(),
      });
    }

    await ctx.db.delete(id);
    return id;
  },
});

// 변형들의 평균 점수 조회
export const getAverageScores = query({
  args: { postId: v.id("socialPosts") },
  handler: async (ctx, { postId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 게시물 소유 확인
    const post = await ctx.db.get(postId);
    if (!post || post.userId !== userId) {
      throw new Error("게시물에 대한 접근 권한이 없습니다");
    }

    const variants = await ctx.db
      .query("postVariants")
      .withIndex("byPostId", (q) => q.eq("postId", postId))
      .collect();

    if (variants.length === 0) {
      return null;
    }

    const averages = {
      overallScore: 0,
      engagement: 0,
      virality: 0,
      personaMatch: 0,
      readability: 0,
      trending: 0,
    };

    variants.forEach(variant => {
      averages.overallScore += variant.overallScore;
      averages.engagement += variant.scoreBreakdown.engagement;
      averages.virality += variant.scoreBreakdown.virality;
      averages.personaMatch += variant.scoreBreakdown.personaMatch;
      averages.readability += variant.scoreBreakdown.readability;
      averages.trending += variant.scoreBreakdown.trending;
    });

    const count = variants.length;
    return {
      overallScore: Math.round(averages.overallScore / count),
      scoreBreakdown: {
        engagement: Math.round(averages.engagement / count),
        virality: Math.round(averages.virality / count),
        personaMatch: Math.round(averages.personaMatch / count),
        readability: Math.round(averages.readability / count),
        trending: Math.round(averages.trending / count),
      },
      variantCount: count,
    };
  },
});

// 사용자의 변형 생성 통계
export const getUserVariantStats = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 사용자의 모든 게시물 가져오기
    const posts = await ctx.db
      .query("socialPosts")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();

    const postIds = posts.map(post => post._id);
    const variants = await Promise.all(
      postIds.map(postId =>
        ctx.db
          .query("postVariants")
          .withIndex("byPostId", (q) => q.eq("postId", postId))
          .collect()
      )
    );

    const allVariants = variants.flat();

    // 날짜 필터링 (필요시 구현)
    // TODO: startDate, endDate로 필터링

    const totalVariants = allVariants.length;
    const totalCreditsUsed = allVariants.reduce((sum, v) => sum + v.creditsUsed, 0);
    const averageScore = totalVariants > 0 
      ? allVariants.reduce((sum, v) => sum + v.overallScore, 0) / totalVariants
      : 0;

    const aiModelUsage = allVariants.reduce((acc, variant) => {
      acc[variant.aiModel] = (acc[variant.aiModel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalVariants,
      totalCreditsUsed,
      averageScore: Math.round(averageScore),
      aiModelUsage,
      postsWithVariants: postIds.filter(postId => 
        allVariants.some(v => v.postId === postId)
      ).length,
    };
  },
});