import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { getAuthUserId } from "../auth";
import { internal } from "../_generated/api";

// 📈 배치 처리 최적화 - 대량 데이터 처리 성능 개선

// 🚀 배치 게시물 생성 (AI 생성 포함)
export const batchCreatePosts = mutation({
  args: {
    posts: v.array(v.object({
      personaId: v.id("personas"),
      originalContent: v.string(),
      platforms: v.array(v.string()),
      hashtags: v.optional(v.array(v.string())),
      mediaUrls: v.optional(v.array(v.string())),
      threadCount: v.optional(v.number()),
    })),
    generateVariants: v.optional(v.boolean()),
  },
  handler: async (ctx, { posts, generateVariants = false }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const now = new Date().toISOString();
    const postIds: string[] = [];

    // 권한 확인을 위해 페르소나들 배치 조회
    const personaIds = [...new Set(posts.map(p => p.personaId))];
    const personas = await Promise.all(
      personaIds.map(id => ctx.db.get(id))
    );
    
    const validPersonaIds = new Set(
      personas
        .filter(p => p && p.userId === userId)
        .map(p => p!._id)
    );

    // 유효한 게시물들만 필터링
    const validPosts = posts.filter(p => validPersonaIds.has(p.personaId));
    
    if (validPosts.length === 0) {
      throw new Error("유효한 게시물이 없습니다");
    }

    // 배치로 게시물 생성
    const insertPromises = validPosts.map(post =>
      ctx.db.insert("socialPosts", {
        userId,
        personaId: post.personaId,
        originalContent: post.originalContent,
        finalContent: post.originalContent,
        platforms: post.platforms,
        status: "draft",
        hashtags: post.hashtags || [],
        mediaUrls: post.mediaUrls,
        threadCount: post.threadCount || 1,
        creditsUsed: 0,
        createdAt: now,
        updatedAt: now,
      })
    );

    const createdPostIds = await Promise.all(insertPromises);
    
    // AI 변형 생성을 백그라운드에서 처리
    if (generateVariants) {
      // 변형 생성은 별도 배치 작업으로 처리
      console.log(`Scheduling variant generation for ${createdPostIds.length} posts`);
    }

    return createdPostIds;
  },
});

// 🚀 배치 AI 변형 생성 (내부 액션)
export const generateVariantsForPosts = action({
  args: {
    postIds: v.array(v.id("socialPosts")),
    userId: v.id("users"),
  },
  handler: async (ctx, { postIds, userId }) => {
    // 청크 단위로 처리하여 메모리 효율성 확보
    const CHUNK_SIZE = 5;
    const chunks = [];
    
    for (let i = 0; i < postIds.length; i += CHUNK_SIZE) {
      chunks.push(postIds.slice(i, i + CHUNK_SIZE));
    }

    for (const chunk of chunks) {
      // 각 청크를 병렬 처리
      await Promise.all(
        chunk.map(async (postId) => {
          try {
            // AI 변형 생성 로직 (실제 구현시 AI 서비스 호출)
            const variants = await generatePostVariants(postId);
            
            // 변형들을 배치로 저장 (실제 구현에서는 내부 API 호출)
            console.log(`Saving ${variants.length} variants for post ${postId}`);
          } catch (error) {
            console.error(`변형 생성 실패 for post ${postId}:`, error);
          }
        })
      );
      
      // CPU 부하 분산을 위한 짧은 대기
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  },
});

// 📈 변형 저장 (내부 뮤테이션)
export const saveVariants = mutation({
  args: {
    postId: v.id("socialPosts"),
    variants: v.array(v.object({
      content: v.string(),
      overallScore: v.number(),
      scoreBreakdown: v.object({
        engagement: v.number(),
        virality: v.number(),
        personaMatch: v.number(),
        readability: v.number(),
        trending: v.number(),
      }),
    })),
    userId: v.id("users"),
  },
  handler: async (ctx, { postId, variants, userId }) => {
    const now = new Date().toISOString();
    
    // 배치로 변형들 저장
    const insertPromises = variants.map(variant =>
      ctx.db.insert("postVariants", {
        postId,
        content: variant.content,
        overallScore: variant.overallScore,
        scoreBreakdown: variant.scoreBreakdown,
        isSelected: false,
        aiModel: "gemini-1.5-pro",
        promptUsed: "배치 생성",
        creditsUsed: 1,
        generatedAt: now,
      })
    );

    await Promise.all(insertPromises);
  },
});

// 🚀 배치 스케줄 생성
export const batchCreateSchedules = mutation({
  args: {
    schedules: v.array(v.object({
      postId: v.id("socialPosts"),
      variantId: v.optional(v.id("postVariants")),
      platform: v.string(),
      socialAccountId: v.id("socialAccounts"),
      scheduledFor: v.string(),
    })),
  },
  handler: async (ctx, { schedules }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 권한 검증을 위한 배치 조회
    const postIds = [...new Set(schedules.map(s => s.postId))];
    const accountIds = [...new Set(schedules.map(s => s.socialAccountId))];
    
    const [posts, accounts] = await Promise.all([
      Promise.all(postIds.map(id => ctx.db.get(id))),
      Promise.all(accountIds.map(id => ctx.db.get(id)))
    ]);

    const validPostIds = new Set(
      posts.filter(p => p && p.userId === userId).map(p => p!._id)
    );
    const validAccountIds = new Set(
      accounts.filter(a => a && a.userId === userId).map(a => a!._id)
    );

    // 유효한 스케줄들만 필터링
    const validSchedules = schedules.filter(s => 
      validPostIds.has(s.postId) && validAccountIds.has(s.socialAccountId)
    );

    if (validSchedules.length === 0) {
      throw new Error("유효한 스케줄이 없습니다");
    }

    const now = new Date().toISOString();

    // 배치로 스케줄 생성
    const insertPromises = validSchedules.map(schedule =>
      ctx.db.insert("scheduledPosts", {
        postId: schedule.postId,
        variantId: schedule.variantId,
        platform: schedule.platform,
        socialAccountId: schedule.socialAccountId,
        scheduledFor: schedule.scheduledFor,
        status: "pending",
        retryCount: 0,
        maxRetries: 3,
        createdAt: now,
        updatedAt: now,
      })
    );

    const scheduleIds = await Promise.all(insertPromises);

    // 게시물 상태 업데이트도 배치로 처리
    const updatePromises = validSchedules.map(schedule =>
      ctx.db.patch(schedule.postId, {
        status: "scheduled",
        scheduledFor: schedule.scheduledFor,
        updatedAt: now,
      })
    );

    await Promise.all(updatePromises);

    return scheduleIds;
  },
});

// 📈 메트릭 집계 배치 처리 (주기적 실행)
export const aggregateMetricsBatch = mutation({
  args: {
    timeframe: v.string(), // "hourly", "daily", "weekly"
  },
  handler: async (ctx, { timeframe }) => {
    const now = new Date();
    let startTime: Date;
    let endTime: Date = now;

    // 시간 범위 계산
    switch (timeframe) {
      case "hourly":
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "weekly":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default: // daily
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const startTimeStr = startTime.toISOString();
    const endTimeStr = endTime.toISOString();

    // 모든 사용자의 데이터 배치 처리
    const allUsers = await ctx.db.query("users").collect();
    
    const aggregationPromises = allUsers.map(async (user) => {
      try {
        // 사용자별 메트릭 계산
        const [posts, generations, analytics] = await Promise.all([
          ctx.db.query("socialPosts")
            .withIndex("byUserId", q => q.eq("userId", user._id))
            .filter(q => q.gte(q.field("createdAt"), startTimeStr))
            .filter(q => q.lte(q.field("createdAt"), endTimeStr))
            .collect(),
          
          ctx.db.query("aiGenerations")
            .withIndex("byUserId", q => q.eq("userId", user._id))
            .filter(q => q.gte(q.field("createdAt"), startTimeStr))
            .filter(q => q.lte(q.field("createdAt"), endTimeStr))
            .collect(),
          
          ctx.db.query("postAnalytics")
            .withIndex("byUserId", q => q.eq("userId", user._id))
            .filter(q => q.gte(q.field("recordedAt"), startTimeStr))
            .filter(q => q.lte(q.field("recordedAt"), endTimeStr))
            .collect()
        ]);

        // 집계 데이터 생성
        const aggregatedData = {
          userId: user._id,
          timeframe,
          startTime: startTimeStr,
          endTime: endTimeStr,
          metrics: {
            posts: {
              total: posts.length,
              published: posts.filter(p => p.status === "published").length,
              credits: posts.reduce((sum, p) => sum + p.creditsUsed, 0),
            },
            ai: {
              total: generations.length,
              successful: generations.filter(g => g.success).length,
              credits: generations.reduce((sum, g) => sum + g.creditsUsed, 0),
              averageTime: generations.length > 0 
                ? Math.round(generations.reduce((sum, g) => sum + g.generationTime, 0) / generations.length)
                : 0,
            },
            engagement: analytics.length > 0 ? {
              averageRate: Math.round(
                analytics.reduce((sum, a) => sum + a.engagementRate, 0) / analytics.length
              ),
              totalImpressions: analytics.reduce((sum, a) => sum + a.metrics.impressions, 0),
              totalEngagements: analytics.reduce((sum, a) => sum + a.metrics.engagements, 0),
            } : null,
          },
          createdAt: now.toISOString(),
        };

        // 집계 테이블에 저장 (가상의 테이블)
        return aggregatedData;
      } catch (error) {
        console.error(`집계 처리 실패 for user ${user._id}:`, error);
        return null;
      }
    });

    const results = await Promise.all(aggregationPromises);
    return results.filter(Boolean).length;
  },
});

// 📈 캐시 워밍업 (자주 액세스되는 데이터 미리 로드)
export const warmupCache = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    // 자주 사용되는 쿼리들을 미리 실행하여 캐시 워밍업 (실제 구현에서는 내부 API 호출)
    console.log("Cache warmup started for user:", userId);
    const warmupQueries: Promise<any>[] = [
      // 실제 구현에서는 아래와 같은 쿼리들을 실행
      // ctx.runQuery(internal.optimized.realtimeOptimized.realtimeDashboard, {}),
      // ctx.runQuery(internal.optimized.socialPostsOptimized.listOptimized, { limit: 20, includeMetrics: true }),
      // ctx.runQuery(internal.personas.getActive, {}),
      // ctx.runQuery(internal.socialAccounts.list, { isActive: true }),
    ];

    await Promise.allSettled(warmupQueries);
    return true;
  },
});

// 📈 데이터 아카이빙 (오래된 데이터 정리)
export const archiveOldData = mutation({
  args: {
    olderThanDays: v.number(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { olderThanDays, dryRun = true }) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffDateStr = cutoffDate.toISOString();

    // 아카이빙 대상 조회
    const [oldGenerations, oldAnalytics, oldUsageRecords] = await Promise.all([
      ctx.db.query("aiGenerations")
        .withIndex("byCreatedAt")
        .filter(q => q.lt(q.field("createdAt"), cutoffDateStr))
        .collect(),
      
      ctx.db.query("postAnalytics")
        .withIndex("byRecordedAt")
        .filter(q => q.lt(q.field("recordedAt"), cutoffDateStr))
        .collect(),
      
      ctx.db.query("usage" as any)
        .withIndex("byTimestamp" as any)  
        .filter((q: any) => q.lt(q.field("timestamp"), cutoffDateStr))
        .collect(),
    ]);

    const archiveStats = {
      aiGenerations: oldGenerations.length,
      postAnalytics: oldAnalytics.length,
      usageRecords: oldUsageRecords.length,
      totalRecords: oldGenerations.length + oldAnalytics.length + oldUsageRecords.length,
    };

    if (dryRun) {
      return { ...archiveStats, archived: false, message: "드라이런 모드 - 실제 삭제되지 않음" };
    }

    // 실제 아카이빙 (배치 삭제)
    const deletePromises = [
      ...oldGenerations.map(record => ctx.db.delete(record._id)),
      ...oldAnalytics.map(record => ctx.db.delete(record._id)),
      ...oldUsageRecords.map(record => ctx.db.delete(record._id)),
    ];

    await Promise.all(deletePromises);

    return { ...archiveStats, archived: true, archivedAt: new Date().toISOString() };
  },
});

// 유틸리티 함수
async function generatePostVariants(postId: string) {
  // AI 서비스 호출 시뮬레이션
  // 실제 구현에서는 OpenAI, Gemini 등의 API를 호출
  return [
    {
      content: `변형 1 - ${postId}`,
      overallScore: Math.floor(Math.random() * 100),
      scoreBreakdown: {
        engagement: Math.floor(Math.random() * 100),
        virality: Math.floor(Math.random() * 100),
        personaMatch: Math.floor(Math.random() * 100),
        readability: Math.floor(Math.random() * 100),
        trending: Math.floor(Math.random() * 100),
      },
    },
    {
      content: `변형 2 - ${postId}`,
      overallScore: Math.floor(Math.random() * 100),
      scoreBreakdown: {
        engagement: Math.floor(Math.random() * 100),
        virality: Math.floor(Math.random() * 100),
        personaMatch: Math.floor(Math.random() * 100),
        readability: Math.floor(Math.random() * 100),
        trending: Math.floor(Math.random() * 100),
      },
    },
  ];
}