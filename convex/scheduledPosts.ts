import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./auth";

// 스케줄링된 게시물 목록 조회
export const list = query({
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

    // 사용자의 게시물들 먼저 가져오기
    const userPosts = await ctx.db
      .query("socialPosts")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();

    const userPostIds = userPosts.map(post => post._id);

    let query = ctx.db.query("scheduledPosts");

    // 사용자 소유 게시물만 필터링
    const schedules = await query.collect();
    let filteredSchedules = schedules.filter(schedule => 
      userPostIds.includes(schedule.postId)
    );

    // 추가 필터링
    if (status) {
      filteredSchedules = filteredSchedules.filter(s => s.status === status);
    }

    if (platform) {
      filteredSchedules = filteredSchedules.filter(s => s.platform === platform);
    }

    if (startDate) {
      filteredSchedules = filteredSchedules.filter(s => s.scheduledFor >= startDate);
    }

    if (endDate) {
      filteredSchedules = filteredSchedules.filter(s => s.scheduledFor <= endDate);
    }

    // 날짜순 정렬 및 제한
    filteredSchedules.sort((a, b) => 
      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    );

    return filteredSchedules.slice(0, limit);
  },
});

// 특정 게시물의 스케줄 조회
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
      .query("scheduledPosts")
      .withIndex("byPostId", (q) => q.eq("postId", postId))
      .collect();
  },
});

// 특정 스케줄 조회
export const get = query({
  args: { id: v.id("scheduledPosts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const schedule = await ctx.db.get(id);
    if (!schedule) {
      throw new Error("스케줄을 찾을 수 없습니다");
    }

    // 게시물 소유 확인
    const post = await ctx.db.get(schedule.postId);
    if (!post || post.userId !== userId) {
      throw new Error("접근 권한이 없습니다");
    }

    // 관련 정보와 함께 반환
    const socialAccount = await ctx.db.get(schedule.socialAccountId);
    const variant = schedule.variantId ? await ctx.db.get(schedule.variantId) : null;

    return {
      ...schedule,
      post,
      socialAccount,
      variant,
    };
  },
});

// 캘린더용 스케줄 조회
export const getCalendarSchedules = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 사용자의 게시물들 먼저 가져오기
    const userPosts = await ctx.db
      .query("socialPosts")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();

    const userPostIds = userPosts.map(post => post._id);
    const postLookup = new Map(userPosts.map(post => [post._id, post]));

    // 스케줄 조회
    const schedules = await ctx.db
      .query("scheduledPosts")
      .withIndex("byScheduledFor", (q) => 
        q.gte("scheduledFor", startDate).lte("scheduledFor", endDate)
      )
      .collect();

    // 사용자 소유 스케줄만 필터링하고 추가 정보 포함
    const calendarEvents = [];

    for (const schedule of schedules) {
      if (!userPostIds.includes(schedule.postId)) continue;

      const post = postLookup.get(schedule.postId);
      const socialAccount = await ctx.db.get(schedule.socialAccountId);
      const persona = post ? await ctx.db.get(post.personaId) : null;

      calendarEvents.push({
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
      });
    }

    return calendarEvents;
  },
});

// 스케줄 생성
export const create = mutation({
  args: {
    postId: v.id("socialPosts"),
    variantId: v.optional(v.id("postVariants")),
    platform: v.string(),
    socialAccountId: v.id("socialAccounts"),
    scheduledFor: v.string(),
    maxRetries: v.optional(v.number()),
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

    // 소셜 계정 소유 확인
    const socialAccount = await ctx.db.get(args.socialAccountId);
    if (!socialAccount || socialAccount.userId !== userId) {
      throw new Error("소셜 계정에 대한 접근 권한이 없습니다");
    }

    // 플랫폼 일치 확인
    if (socialAccount.platform !== args.platform) {
      throw new Error("소셜 계정과 플랫폼이 일치하지 않습니다");
    }

    // 변형 소유 확인 (있는 경우)
    if (args.variantId) {
      const variant = await ctx.db.get(args.variantId);
      if (!variant || variant.postId !== args.postId) {
        throw new Error("변형에 대한 접근 권한이 없습니다");
      }
    }

    // 중복 스케줄 확인
    const existingSchedule = await ctx.db
      .query("scheduledPosts")
      .withIndex("byPostId", (q) => q.eq("postId", args.postId))
      .filter((q) => 
        q.and(
          q.eq(q.field("platform"), args.platform),
          q.eq(q.field("socialAccountId"), args.socialAccountId),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .first();

    if (existingSchedule) {
      throw new Error("이미 같은 플랫폼과 계정으로 스케줄이 등록되어 있습니다");
    }

    const now = new Date().toISOString();

    // 예약 시간이 과거인지 확인
    if (new Date(args.scheduledFor) <= new Date()) {
      throw new Error("예약 시간은 현재 시간보다 미래여야 합니다");
    }

    const scheduleId = await ctx.db.insert("scheduledPosts", {
      postId: args.postId,
      variantId: args.variantId,
      platform: args.platform,
      socialAccountId: args.socialAccountId,
      scheduledFor: args.scheduledFor,
      status: "pending",
      retryCount: 0,
      maxRetries: args.maxRetries || 3,
      createdAt: now,
      updatedAt: now,
    });

    // 게시물 상태를 스케줄됨으로 업데이트
    await ctx.db.patch(args.postId, {
      status: "scheduled",
      scheduledFor: args.scheduledFor,
      updatedAt: now,
    });

    return scheduleId;
  },
});

// 스케줄 수정
export const update = mutation({
  args: {
    id: v.id("scheduledPosts"),
    scheduledFor: v.optional(v.string()),
    variantId: v.optional(v.id("postVariants")),
    socialAccountId: v.optional(v.id("socialAccounts")),
  },
  handler: async (ctx, { id, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const schedule = await ctx.db.get(id);
    if (!schedule) {
      throw new Error("스케줄을 찾을 수 없습니다");
    }

    // 게시물 소유 확인
    const post = await ctx.db.get(schedule.postId);
    if (!post || post.userId !== userId) {
      throw new Error("수정 권한이 없습니다");
    }

    // 이미 처리된 스케줄은 수정 불가
    if (["published", "failed", "cancelled"].includes(schedule.status)) {
      throw new Error("이미 처리된 스케줄은 수정할 수 없습니다");
    }

    // 소셜 계정 확인 (변경하는 경우)
    if (updates.socialAccountId) {
      const socialAccount = await ctx.db.get(updates.socialAccountId);
      if (!socialAccount || socialAccount.userId !== userId) {
        throw new Error("소셜 계정에 대한 접근 권한이 없습니다");
      }

      if (socialAccount.platform !== schedule.platform) {
        throw new Error("소셜 계정과 플랫폼이 일치하지 않습니다");
      }
    }

    // 변형 확인 (변경하는 경우)
    if (updates.variantId) {
      const variant = await ctx.db.get(updates.variantId);
      if (!variant || variant.postId !== schedule.postId) {
        throw new Error("변형에 대한 접근 권한이 없습니다");
      }
    }

    // 예약 시간 확인 (변경하는 경우)
    if (updates.scheduledFor) {
      if (new Date(updates.scheduledFor) <= new Date()) {
        throw new Error("예약 시간은 현재 시간보다 미래여야 합니다");
      }
    }

    const now = new Date().toISOString();

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });

    // 게시물의 예약 시간도 업데이트 (변경한 경우)
    if (updates.scheduledFor) {
      await ctx.db.patch(schedule.postId, {
        scheduledFor: updates.scheduledFor,
        updatedAt: now,
      });
    }

    return id;
  },
});

// 스케줄 취소
export const cancel = mutation({
  args: { id: v.id("scheduledPosts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const schedule = await ctx.db.get(id);
    if (!schedule) {
      throw new Error("스케줄을 찾을 수 없습니다");
    }

    // 게시물 소유 확인
    const post = await ctx.db.get(schedule.postId);
    if (!post || post.userId !== userId) {
      throw new Error("취소 권한이 없습니다");
    }

    // 이미 발행되었거나 취소된 스케줄은 취소 불가
    if (["published", "cancelled"].includes(schedule.status)) {
      throw new Error("이미 처리된 스케줄은 취소할 수 없습니다");
    }

    const now = new Date().toISOString();

    await ctx.db.patch(id, {
      status: "cancelled",
      updatedAt: now,
    });

    // 해당 게시물의 다른 활성 스케줄이 있는지 확인
    const otherActiveSchedules = await ctx.db
      .query("scheduledPosts")
      .withIndex("byPostId", (q) => q.eq("postId", schedule.postId))
      .filter((q) => 
        q.and(
          q.neq(q.field("_id"), id),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    // 다른 활성 스케줄이 없으면 게시물 상태를 draft로 변경
    if (otherActiveSchedules.length === 0) {
      await ctx.db.patch(schedule.postId, {
        status: "draft",
        scheduledFor: undefined,
        updatedAt: now,
      });
    }

    return id;
  },
});

// 스케줄 상태 업데이트 (시스템용)
export const updateStatus = mutation({
  args: {
    id: v.id("scheduledPosts"),
    status: v.string(),
    publishedAt: v.optional(v.string()),
    publishedPostId: v.optional(v.string()),
    error: v.optional(v.string()),
    publishMetadata: v.optional(v.any()),
  },
  handler: async (ctx, { id, status, publishedAt, publishedPostId, error, publishMetadata }) => {
    const schedule = await ctx.db.get(id);
    if (!schedule) {
      throw new Error("스케줄을 찾을 수 없습니다");
    }

    const now = new Date().toISOString();
    const updates: any = {
      status,
      updatedAt: now,
    };

    if (publishedAt) updates.publishedAt = publishedAt;
    if (publishedPostId) updates.publishedPostId = publishedPostId;
    if (error) updates.error = error;
    if (publishMetadata) updates.publishMetadata = publishMetadata;

    // 실패한 경우 재시도 카운트 증가
    if (status === "failed") {
      updates.retryCount = schedule.retryCount + 1;
      
      // 재시도 가능한 경우 다음 재시도 시간 설정
      if (schedule.retryCount < schedule.maxRetries) {
        const retryDelay = Math.pow(2, schedule.retryCount) * 5; // 5분, 10분, 20분...
        const nextRetry = new Date(Date.now() + retryDelay * 60 * 1000).toISOString();
        updates.nextRetryAt = nextRetry;
        updates.status = "pending"; // 재시도를 위해 pending 상태로
      }
    }

    await ctx.db.patch(id, updates);
    return id;
  },
});

// 재시도 대기 중인 스케줄 조회 (Cron용)
export const getPendingRetries = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    
    return await ctx.db
      .query("scheduledPosts")
      .withIndex("byNextRetryAt")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lte(q.field("nextRetryAt"), now)
        )
      )
      .collect();
  },
});

// 예약 시간이 된 스케줄 조회 (Cron용)
export const getDueSchedules = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    
    return await ctx.db
      .query("scheduledPosts")
      .withIndex("byScheduledFor")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lte(q.field("scheduledFor"), now)
        )
      )
      .collect();
  },
});

// 사용자 스케줄 통계
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

    // 사용자의 게시물들 가져오기
    const userPosts = await ctx.db
      .query("socialPosts")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();

    const userPostIds = userPosts.map(post => post._id);

    // 스케줄들 가져오기
    const schedules = await ctx.db
      .query("scheduledPosts")
      .collect();

    const userSchedules = schedules.filter(schedule => 
      userPostIds.includes(schedule.postId)
    );

    // 날짜 필터링
    let filteredSchedules = userSchedules;
    if (startDate || endDate) {
      filteredSchedules = userSchedules.filter(schedule => {
        const scheduleDate = schedule.scheduledFor;
        return (!startDate || scheduleDate >= startDate) && 
               (!endDate || scheduleDate <= endDate);
      });
    }

    const stats = {
      total: filteredSchedules.length,
      pending: filteredSchedules.filter(s => s.status === "pending").length,
      published: filteredSchedules.filter(s => s.status === "published").length,
      failed: filteredSchedules.filter(s => s.status === "failed").length,
      cancelled: filteredSchedules.filter(s => s.status === "cancelled").length,
      successRate: 0,
      platformBreakdown: {} as Record<string, number>,
    };

    if (stats.total > 0) {
      stats.successRate = Math.round((stats.published / stats.total) * 100);
    }

    // 플랫폼별 분석
    filteredSchedules.forEach(schedule => {
      stats.platformBreakdown[schedule.platform] = 
        (stats.platformBreakdown[schedule.platform] || 0) + 1;
    });

    return stats;
  },
});