import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./auth";

// AI 생성 이력 목록 조회
export const list = query({
  args: {
    type: v.optional(v.string()),
    postId: v.optional(v.id("socialPosts")),
    personaId: v.optional(v.id("personas")),
    success: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    paginationOpts: v.optional(v.object({ 
      cursor: v.optional(v.string()),
      numItems: v.number() 
    })),
  },
  handler: async (ctx, { type, postId, personaId, success, limit = 50, paginationOpts }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    let query = ctx.db
      .query("aiGenerations")
      .withIndex("byUserId", (q) => q.eq("userId", userId));

    // 타입 필터링
    if (type) {
      query = query.filter((q) => q.eq(q.field("type"), type));
    }

    // 게시물 필터링
    if (postId) {
      query = query.filter((q) => q.eq(q.field("postId"), postId));
    }

    // 페르소나 필터링
    if (personaId) {
      query = query.filter((q) => q.eq(q.field("personaId"), personaId));
    }

    // 성공/실패 필터링
    if (success !== undefined) {
      query = query.filter((q) => q.eq(q.field("success"), success));
    }

    // 페이징 처리
    if (paginationOpts) {
      return await query
        .order("desc")
        .paginate({
          cursor: paginationOpts.cursor ?? null,
          numItems: paginationOpts.numItems
        });
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

// 특정 AI 생성 이력 조회
export const get = query({
  args: { id: v.id("aiGenerations") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const generation = await ctx.db.get(id);
    if (!generation) {
      throw new Error("AI 생성 이력을 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (generation.userId !== userId) {
      throw new Error("접근 권한이 없습니다");
    }

    // 관련 정보와 함께 반환
    const post = generation.postId ? await ctx.db.get(generation.postId) : null;
    const persona = generation.personaId ? await ctx.db.get(generation.personaId) : null;

    return {
      ...generation,
      post,
      persona,
    };
  },
});

// AI 생성 이력 생성
export const create = mutation({
  args: {
    userId: v.id("users"),
    postId: v.optional(v.id("socialPosts")),
    personaId: v.optional(v.id("personas")),
    type: v.string(),
    prompt: v.string(),
    response: v.string(),
    model: v.string(),
    creditsUsed: v.number(),
    generationTime: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
    metadata: v.optional(v.any()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    return await ctx.db.insert("aiGenerations", {
      ...args,
      createdAt: now,
    });
  },
});

// 사용자 AI 생성 통계
export const getUserStats = query({
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
      .query("aiGenerations")
      .withIndex("byUserId", (q) => q.eq("userId", userId));

    const generations = await query.collect();

    // 날짜 필터링
    let filteredGenerations = generations;
    if (startDate || endDate) {
      filteredGenerations = generations.filter(gen => {
        const genDate = gen.createdAt;
        return (!startDate || genDate >= startDate) && 
               (!endDate || genDate <= endDate);
      });
    }

    const stats = {
      total: filteredGenerations.length,
      successful: filteredGenerations.filter(g => g.success).length,
      failed: filteredGenerations.filter(g => !g.success).length,
      totalCreditsUsed: filteredGenerations.reduce((sum, g) => sum + g.creditsUsed, 0),
      averageGenerationTime: 0,
      totalTokensUsed: {
        input: filteredGenerations.reduce((sum, g) => sum + (g.inputTokens || 0), 0),
        output: filteredGenerations.reduce((sum, g) => sum + (g.outputTokens || 0), 0),
      },
      typeBreakdown: {} as Record<string, number>,
      modelBreakdown: {} as Record<string, number>,
      successRate: 0,
    };

    if (stats.total > 0) {
      stats.successRate = Math.round((stats.successful / stats.total) * 100);
      
      const totalTime = filteredGenerations.reduce((sum, g) => sum + g.generationTime, 0);
      stats.averageGenerationTime = Math.round(totalTime / stats.total);
    }

    // 타입별 분석
    filteredGenerations.forEach(gen => {
      stats.typeBreakdown[gen.type] = (stats.typeBreakdown[gen.type] || 0) + 1;
      stats.modelBreakdown[gen.model] = (stats.modelBreakdown[gen.model] || 0) + 1;
    });

    return stats;
  },
});

// 월별 AI 생성 트렌드
export const getMonthlyTrends = query({
  args: {
    months: v.optional(v.number()), // 지난 몇 개월
  },
  handler: async (ctx, { months = 12 }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const generations = await ctx.db
      .query("aiGenerations")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();

    // 최근 N개월 데이터만 필터링
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    
    const recentGenerations = generations.filter(gen => 
      new Date(gen.createdAt) >= cutoffDate
    );

    // 월별로 그룹화
    const monthlyData: Record<string, {
      month: string;
      total: number;
      successful: number;
      creditsUsed: number;
      averageTime: number;
    }> = {};

    recentGenerations.forEach(gen => {
      const date = new Date(gen.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          total: 0,
          successful: 0,
          creditsUsed: 0,
          averageTime: 0,
        };
      }

      monthlyData[monthKey].total += 1;
      if (gen.success) {
        monthlyData[monthKey].successful += 1;
      }
      monthlyData[monthKey].creditsUsed += gen.creditsUsed;
    });

    // 평균 시간 계산
    Object.keys(monthlyData).forEach(monthKey => {
      const monthGens = recentGenerations.filter(gen => {
        const date = new Date(gen.createdAt);
        const genMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return genMonthKey === monthKey;
      });

      const totalTime = monthGens.reduce((sum, g) => sum + g.generationTime, 0);
      monthlyData[monthKey].averageTime = monthGens.length > 0 
        ? Math.round(totalTime / monthGens.length) 
        : 0;
    });

    // 시간순 정렬
    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  },
});

// 페르소나별 AI 생성 성과 분석
export const getPersonaPerformance = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 사용자의 페르소나들 가져오기
    const personas = await ctx.db
      .query("personas")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();

    const results = [];

    for (const persona of personas) {
      let query = ctx.db
        .query("aiGenerations")
        .withIndex("byPersonaId", (q) => q.eq("personaId", persona._id));

      const generations = await query.collect();

      // 날짜 필터링
      let filteredGenerations = generations;
      if (startDate || endDate) {
        filteredGenerations = generations.filter(gen => {
          const genDate = gen.createdAt;
          return (!startDate || genDate >= startDate) && 
                 (!endDate || genDate <= endDate);
        });
      }

      const stats = {
        personaId: persona._id,
        personaName: persona.name,
        total: filteredGenerations.length,
        successful: filteredGenerations.filter(g => g.success).length,
        creditsUsed: filteredGenerations.reduce((sum, g) => sum + g.creditsUsed, 0),
        averageTime: 0,
        successRate: 0,
        averageScore: 0, // 생성된 변형들의 평균 점수
      };

      if (stats.total > 0) {
        stats.successRate = Math.round((stats.successful / stats.total) * 100);
        
        const totalTime = filteredGenerations.reduce((sum, g) => sum + g.generationTime, 0);
        stats.averageTime = Math.round(totalTime / stats.total);

        // 해당 페르소나로 생성된 변형들의 평균 점수 계산
        const personaPosts = await ctx.db
          .query("socialPosts")
          .withIndex("byPersonaId", (q) => q.eq("personaId", persona._id))
          .collect();

        let totalScore = 0;
        let variantCount = 0;

        for (const post of personaPosts) {
          const variants = await ctx.db
            .query("postVariants")
            .withIndex("byPostId", (q) => q.eq("postId", post._id))
            .collect();

          variants.forEach(variant => {
            totalScore += variant.overallScore;
            variantCount++;
          });
        }

        stats.averageScore = variantCount > 0 ? Math.round(totalScore / variantCount) : 0;
      }

      results.push(stats);
    }

    // 성공률 순으로 정렬
    return results.sort((a, b) => b.successRate - a.successRate);
  },
});

// 최근 실패한 AI 생성들 조회 (디버깅용)
export const getRecentFailures = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 10 }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    return await ctx.db
      .query("aiGenerations")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("success"), false))
      .order("desc")
      .take(limit);
  },
});

// AI 생성 품질 분석
export const getQualityAnalysis = query({
  args: {
    type: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { type, model }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    let query = ctx.db
      .query("aiGenerations")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("success"), true));

    const generations = await query.collect();

    // 필터링
    let filteredGenerations = generations;
    if (type) {
      filteredGenerations = filteredGenerations.filter(g => g.type === type);
    }
    if (model) {
      filteredGenerations = filteredGenerations.filter(g => g.model === model);
    }

    if (filteredGenerations.length === 0) {
      return null;
    }

    // 각 생성에 대한 변형 점수들 가져오기
    const qualityScores = [];

    for (const gen of filteredGenerations) {
      if (gen.postId && gen.type === "variant_creation") {
        const variants = await ctx.db
          .query("postVariants")
          .withIndex("byPostId", (q) => q.eq("postId", gen.postId))
          .collect();

        variants.forEach(variant => {
          qualityScores.push({
            generationId: gen._id,
            overallScore: variant.overallScore,
            engagement: variant.scoreBreakdown.engagement,
            virality: variant.scoreBreakdown.virality,
            personaMatch: variant.scoreBreakdown.personaMatch,
            readability: variant.scoreBreakdown.readability,
            trending: variant.scoreBreakdown.trending,
            generationTime: gen.generationTime,
            temperature: gen.temperature,
          });
        });
      }
    }

    if (qualityScores.length === 0) {
      return null;
    }

    // 평균값 계산
    const analysis = {
      totalSamples: qualityScores.length,
      averageScores: {
        overall: Math.round(qualityScores.reduce((sum, s) => sum + s.overallScore, 0) / qualityScores.length),
        engagement: Math.round(qualityScores.reduce((sum, s) => sum + s.engagement, 0) / qualityScores.length),
        virality: Math.round(qualityScores.reduce((sum, s) => sum + s.virality, 0) / qualityScores.length),
        personaMatch: Math.round(qualityScores.reduce((sum, s) => sum + s.personaMatch, 0) / qualityScores.length),
        readability: Math.round(qualityScores.reduce((sum, s) => sum + s.readability, 0) / qualityScores.length),
        trending: Math.round(qualityScores.reduce((sum, s) => sum + s.trending, 0) / qualityScores.length),
      },
      scoreDistribution: {
        excellent: qualityScores.filter(s => s.overallScore >= 80).length,
        good: qualityScores.filter(s => s.overallScore >= 60 && s.overallScore < 80).length,
        average: qualityScores.filter(s => s.overallScore >= 40 && s.overallScore < 60).length,
        poor: qualityScores.filter(s => s.overallScore < 40).length,
      },
      averageGenerationTime: Math.round(
        filteredGenerations.reduce((sum, g) => sum + g.generationTime, 0) / filteredGenerations.length
      ),
      bestPerformingTemperature: null as number | null,
    };

    // 온도별 성능 분석 (가장 좋은 평균 점수를 내는 온도 찾기)
    const temperatureGroups: Record<string, number[]> = {};
    qualityScores.forEach(score => {
      const temp = score.temperature?.toString() || "unknown";
      if (!temperatureGroups[temp]) {
        temperatureGroups[temp] = [];
      }
      temperatureGroups[temp].push(score.overallScore);
    });

    let bestTemp = null;
    let bestAvgScore = 0;
    
    Object.entries(temperatureGroups).forEach(([temp, scores]) => {
      if (temp !== "unknown" && scores.length >= 5) { // 충분한 샘플이 있는 경우만
        const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        if (avgScore > bestAvgScore) {
          bestAvgScore = avgScore;
          bestTemp = parseFloat(temp);
        }
      }
    });

    analysis.bestPerformingTemperature = bestTemp;

    return analysis;
  },
});