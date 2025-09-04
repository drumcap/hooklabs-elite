import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUserId } from "../auth";

// 최적화된 스케줄링된 게시물 쿼리 - N+1 문제 해결
export const listOptimized = query({
  args: {
    status: v.optional(v.string()),
    platform: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, platform, startDate, endDate, limit = 50 }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 1. 사용자의 모든 게시물 ID를 한번에 조회
    const userPosts = await ctx.db
      .query("socialPosts")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();

    const userPostIds = new Set(userPosts.map(post => post._id));
    const postLookup = new Map(userPosts.map(post => [post._id, post]));

    // 2. 인덱스를 활용한 효율적인 쿼리 구성
    // 다양한 인덱스 조건에 따른 쿼리 최적화
    let baseQuery;
    if (startDate && endDate) {
      baseQuery = ctx.db.query("scheduledPosts")
        .withIndex("byScheduledFor", (q) => 
          q.gte("scheduledFor", startDate).lte("scheduledFor", endDate)
        );
    } else if (startDate) {
      baseQuery = ctx.db.query("scheduledPosts")
        .withIndex("byScheduledFor", (q) => 
          q.gte("scheduledFor", startDate)
        );
    } else if (status) {
      baseQuery = ctx.db.query("scheduledPosts")
        .withIndex("byStatus", (q) => q.eq("status", status));
    } else if (platform) {
      baseQuery = ctx.db.query("scheduledPosts")
        .withIndex("byPlatform", (q) => q.eq("platform", platform));
    } else {
      baseQuery = ctx.db.query("scheduledPosts");
    }

    // 3. 배치로 스케줄 조회
    const schedules = await baseQuery.collect();

    // 4. 메모리에서 효율적인 필터링 (Set 사용)
    let filteredSchedules = schedules.filter(schedule => 
      userPostIds.has(schedule.postId)
    );

    // 추가 필터링 (인덱스로 처리되지 않은 조건들)
    if (status && !baseQuery) {
      filteredSchedules = filteredSchedules.filter(s => s.status === status);
    }
    if (platform && !baseQuery) {
      filteredSchedules = filteredSchedules.filter(s => s.platform === platform);
    }
    if (startDate && !baseQuery) {
      filteredSchedules = filteredSchedules.filter(s => s.scheduledFor >= startDate);
    }
    if (endDate && !baseQuery) {
      filteredSchedules = filteredSchedules.filter(s => s.scheduledFor <= endDate);
    }

    // 5. 소셜 계정 ID들을 모아서 배치 조회
    const socialAccountIds = new Set(filteredSchedules.map(s => s.socialAccountId));
    const socialAccounts = await Promise.all(
      Array.from(socialAccountIds).map(id => ctx.db.get(id))
    );
    const socialAccountLookup = new Map(
      socialAccounts.filter(Boolean).map(account => [account!._id, account])
    );

    // 6. 변형 ID들을 모아서 배치 조회
    const variantIds = new Set(
      filteredSchedules
        .map(s => s.variantId)
        .filter(Boolean) as Array<string>
    );
    const variants = await Promise.all(
      Array.from(variantIds).map(id => ctx.db.get(id as any))
    );
    const variantLookup = new Map(
      variants.filter(Boolean).map(variant => [variant!._id, variant])
    );

    // 7. 결과 조합 및 정렬
    const enrichedSchedules = filteredSchedules.map(schedule => {
      const post = postLookup.get(schedule.postId);
      const socialAccount = socialAccountLookup.get(schedule.socialAccountId);
      const variant = schedule.variantId ? variantLookup.get(schedule.variantId) : null;

      return {
        ...schedule,
        post,
        socialAccount,
        variant,
      };
    });

    // 8. 날짜순 정렬 및 제한 (메모리 효율성을 위해 마지막에 수행)
    enrichedSchedules.sort((a, b) => 
      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    );

    return enrichedSchedules.slice(0, limit);
  },
});

// 최적화된 캘린더 스케줄 조회
export const getCalendarSchedulesOptimized = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 1. 날짜 범위로 인덱스 활용하여 스케줄 조회
    const schedules = await ctx.db
      .query("scheduledPosts")
      .withIndex("byScheduledFor", (q) => 
        q.gte("scheduledFor", startDate).lte("scheduledFor", endDate)
      )
      .collect();

    if (schedules.length === 0) {
      return [];
    }

    // 2. 관련 게시물들을 배치로 조회
    const postIds = [...new Set(schedules.map(s => s.postId))];
    const posts = await Promise.all(postIds.map(id => ctx.db.get(id)));
    const userPosts = posts.filter(post => post && post.userId === userId);
    
    if (userPosts.length === 0) {
      return [];
    }

    const userPostLookup = new Map(userPosts.map(post => [post._id, post]));
    const validSchedules = schedules.filter(s => userPostLookup.has(s.postId));

    // 3. 소셜 계정들을 배치로 조회
    const socialAccountIds = [...new Set(validSchedules.map(s => s.socialAccountId))];
    const socialAccounts = await Promise.all(
      socialAccountIds.map(id => ctx.db.get(id))
    );
    const socialAccountLookup = new Map(
      socialAccounts.filter(Boolean).map(account => [account!._id, account])
    );

    // 4. 페르소나들을 배치로 조회
    const personaIds = [...new Set(userPosts.map(post => post.personaId))];
    const personas = await Promise.all(personaIds.map(id => ctx.db.get(id)));
    const personaLookup = new Map(
      personas.filter(Boolean).map(persona => [persona!._id, persona])
    );

    // 5. 캘린더 이벤트 생성
    const calendarEvents = validSchedules.map(schedule => {
      const post = userPostLookup.get(schedule.postId);
      const socialAccount = socialAccountLookup.get(schedule.socialAccountId);
      const persona = post ? personaLookup.get(post.personaId) : null;

      return {
        id: schedule._id,
        title: `${socialAccount?.displayName || socialAccount?.username} (${schedule.platform})`,
        content: post?.finalContent.substring(0, 100) + (post?.finalContent.length > 100 ? "..." : ""),
        scheduledFor: schedule.scheduledFor,
        status: schedule.status,
        platform: schedule.platform,
        personaName: persona?.name,
        accountDisplayName: socialAccount?.displayName,
        accountUsername: socialAccount?.username,
        postId: schedule.postId,
        error: schedule.error,
      };
    });

    return calendarEvents;
  },
});

// 배치 스케줄 생성 (성능 최적화)
export const createBatch = mutation({
  args: {
    schedules: v.array(v.object({
      postId: v.id("socialPosts"),
      variantId: v.optional(v.id("postVariants")),
      platform: v.string(),
      socialAccountId: v.id("socialAccounts"),
      scheduledFor: v.string(),
      maxRetries: v.optional(v.number()),
    })),
  },
  handler: async (ctx, { schedules }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const now = new Date().toISOString();
    const results = [];

    // 1. 모든 관련 데이터를 배치로 미리 검증
    const postIds = [...new Set(schedules.map(s => s.postId))];
    const posts = await Promise.all(postIds.map(id => ctx.db.get(id)));
    const postLookup = new Map(posts.filter(Boolean).map(post => [post!._id, post]));

    const socialAccountIds = [...new Set(schedules.map(s => s.socialAccountId))];
    const socialAccounts = await Promise.all(socialAccountIds.map(id => ctx.db.get(id)));
    const socialAccountLookup = new Map(
      socialAccounts.filter(Boolean).map(account => [account!._id, account])
    );

    // 2. 기존 스케줄 중복 체크를 배치로 처리
    const existingSchedules = await ctx.db
      .query("scheduledPosts")
      .collect();
    
    const existingScheduleLookup = new Set(
      existingSchedules
        .filter(s => s.status !== "cancelled")
        .map(s => `${s.postId}_${s.platform}_${s.socialAccountId}`)
    );

    // 3. 배치로 스케줄 생성
    const validSchedules = [];
    
    for (const schedule of schedules) {
      // 권한 검증
      const post = postLookup.get(schedule.postId);
      if (!post || post.userId !== userId) {
        results.push({ 
          postId: schedule.postId, 
          success: false, 
          error: "게시물에 대한 접근 권한이 없습니다" 
        });
        continue;
      }

      const socialAccount = socialAccountLookup.get(schedule.socialAccountId);
      if (!socialAccount || socialAccount.userId !== userId) {
        results.push({ 
          postId: schedule.postId, 
          success: false, 
          error: "소셜 계정에 대한 접근 권한이 없습니다" 
        });
        continue;
      }

      if (socialAccount.platform !== schedule.platform) {
        results.push({ 
          postId: schedule.postId, 
          success: false, 
          error: "소셜 계정과 플랫폼이 일치하지 않습니다" 
        });
        continue;
      }

      // 중복 체크
      const scheduleKey = `${schedule.postId}_${schedule.platform}_${schedule.socialAccountId}`;
      if (existingScheduleLookup.has(scheduleKey)) {
        results.push({ 
          postId: schedule.postId, 
          success: false, 
          error: "이미 같은 플랫폼과 계정으로 스케줄이 등록되어 있습니다" 
        });
        continue;
      }

      // 시간 검증
      if (new Date(schedule.scheduledFor) <= new Date()) {
        results.push({ 
          postId: schedule.postId, 
          success: false, 
          error: "예약 시간은 현재 시간보다 미래여야 합니다" 
        });
        continue;
      }

      validSchedules.push(schedule);
    }

    // 4. 유효한 스케줄들을 배치로 생성
    for (const schedule of validSchedules) {
      try {
        const scheduleId = await ctx.db.insert("scheduledPosts", {
          postId: schedule.postId,
          variantId: schedule.variantId,
          platform: schedule.platform,
          socialAccountId: schedule.socialAccountId,
          scheduledFor: schedule.scheduledFor,
          status: "pending",
          retryCount: 0,
          maxRetries: schedule.maxRetries || 3,
          createdAt: now,
          updatedAt: now,
        });

        // 게시물 상태 업데이트
        await ctx.db.patch(schedule.postId, {
          status: "scheduled",
          scheduledFor: schedule.scheduledFor,
          updatedAt: now,
        });

        results.push({ 
          postId: schedule.postId, 
          scheduleId,
          success: true 
        });

      } catch (error) {
        results.push({ 
          postId: schedule.postId, 
          success: false, 
          error: error instanceof Error ? error.message : "스케줄 생성 중 오류 발생" 
        });
      }
    }

    return {
      totalSchedules: schedules.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      results,
    };
  },
});

// 스케줄 메트릭 집계 (캐시된 결과)
export const getScheduleMetrics = query({
  args: {
    timeRange: v.optional(v.string()), // "week", "month", "quarter"
  },
  handler: async (ctx, { timeRange = "month" }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 시간 범위 설정
    const now = new Date();
    const ranges = {
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      quarter: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    };
    
    const startDate = ranges[timeRange as keyof typeof ranges] || ranges.month;

    // 사용자 게시물 조회
    const userPosts = await ctx.db
      .query("socialPosts")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();

    const userPostIds = new Set(userPosts.map(post => post._id));

    // 해당 기간의 스케줄들 조회
    const schedules = await ctx.db
      .query("scheduledPosts")
      .withIndex("byScheduledFor", (q) => 
        q.gte("scheduledFor", startDate.toISOString())
      )
      .collect();

    const userSchedules = schedules.filter(s => userPostIds.has(s.postId));

    // 메트릭 계산
    const metrics = {
      total: userSchedules.length,
      published: userSchedules.filter(s => s.status === "published").length,
      failed: userSchedules.filter(s => s.status === "failed").length,
      pending: userSchedules.filter(s => s.status === "pending").length,
      cancelled: userSchedules.filter(s => s.status === "cancelled").length,
      successRate: 0,
      platformStats: {} as Record<string, number>,
      hourlyDistribution: {} as Record<number, number>,
      retryStats: {
        totalRetries: userSchedules.reduce((sum, s) => sum + s.retryCount, 0),
        avgRetriesPerSchedule: 0,
      },
    };

    if (metrics.total > 0) {
      metrics.successRate = Math.round((metrics.published / metrics.total) * 100);
      metrics.retryStats.avgRetriesPerSchedule = 
        Math.round((metrics.retryStats.totalRetries / metrics.total) * 100) / 100;
    }

    // 플랫폼별 통계
    userSchedules.forEach(schedule => {
      metrics.platformStats[schedule.platform] = 
        (metrics.platformStats[schedule.platform] || 0) + 1;
    });

    // 시간별 분포 계산
    userSchedules.forEach(schedule => {
      const hour = new Date(schedule.scheduledFor).getHours();
      metrics.hourlyDistribution[hour] = (metrics.hourlyDistribution[hour] || 0) + 1;
    });

    return metrics;
  },
});