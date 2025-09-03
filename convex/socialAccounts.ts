import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./auth";

// 소셜 계정 목록 조회
export const list = query({
  args: {
    platform: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { platform, isActive }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    let query = ctx.db
      .query("socialAccounts")
      .withIndex("byUserId", (q) => q.eq("userId", userId));

    // 플랫폼 필터링
    if (platform) {
      query = query.filter((q) => q.eq(q.field("platform"), platform));
    }

    // 활성 상태 필터링
    if (isActive !== undefined) {
      query = query.filter((q) => q.eq(q.field("isActive"), isActive));
    }

    const accounts = await query
      .order("desc")
      .collect();

    // 민감한 토큰 정보 제거하고 반환
    return accounts.map(account => ({
      ...account,
      accessToken: undefined,
      refreshToken: undefined,
    }));
  },
});

// 특정 소셜 계정 조회
export const get = query({
  args: { id: v.id("socialAccounts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const account = await ctx.db.get(id);
    if (!account) {
      throw new Error("소셜 계정을 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (account.userId !== userId) {
      throw new Error("접근 권한이 없습니다");
    }

    // 민감한 토큰 정보 제거하고 반환
    return {
      ...account,
      accessToken: undefined,
      refreshToken: undefined,
    };
  },
});

// 토큰 포함 계정 조회 (내부 사용용)
export const getWithTokens = query({
  args: { id: v.id("socialAccounts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const account = await ctx.db.get(id);
    if (!account) {
      throw new Error("소셜 계정을 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (account.userId !== userId) {
      throw new Error("접근 권한이 없습니다");
    }

    return account;
  },
});

// 소셜 계정 생성/연동
export const create = mutation({
  args: {
    platform: v.string(),
    accountId: v.string(),
    username: v.string(),
    displayName: v.string(),
    profileImage: v.optional(v.string()),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.string()),
    followers: v.optional(v.number()),
    following: v.optional(v.number()),
    postsCount: v.optional(v.number()),
    verificationStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const now = new Date().toISOString();

    // 기존에 같은 계정이 연동되어 있는지 확인
    const existingAccount = await ctx.db
      .query("socialAccounts")
      .withIndex("byAccountId", (q) => q.eq("accountId", args.accountId))
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .first();

    if (existingAccount) {
      // 다른 사용자의 계정인 경우
      if (existingAccount.userId !== userId) {
        throw new Error("이미 다른 사용자에게 연동된 계정입니다");
      }
      
      // 같은 사용자의 계정인 경우 토큰 업데이트
      await ctx.db.patch(existingAccount._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        tokenExpiresAt: args.tokenExpiresAt,
        displayName: args.displayName,
        profileImage: args.profileImage,
        followers: args.followers,
        following: args.following,
        postsCount: args.postsCount,
        verificationStatus: args.verificationStatus,
        isActive: true,
        lastSyncedAt: now,
        updatedAt: now,
      });

      return existingAccount._id;
    }

    // 새 계정 생성
    return await ctx.db.insert("socialAccounts", {
      userId,
      platform: args.platform,
      accountId: args.accountId,
      username: args.username,
      displayName: args.displayName,
      profileImage: args.profileImage,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiresAt: args.tokenExpiresAt,
      followers: args.followers,
      following: args.following,
      postsCount: args.postsCount,
      verificationStatus: args.verificationStatus,
      isActive: true,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// 소셜 계정 정보 업데이트
export const update = mutation({
  args: {
    id: v.id("socialAccounts"),
    displayName: v.optional(v.string()),
    profileImage: v.optional(v.string()),
    followers: v.optional(v.number()),
    following: v.optional(v.number()),
    postsCount: v.optional(v.number()),
    verificationStatus: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const account = await ctx.db.get(id);
    if (!account) {
      throw new Error("소셜 계정을 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (account.userId !== userId) {
      throw new Error("수정 권한이 없습니다");
    }

    const now = new Date().toISOString();

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });

    return id;
  },
});

// 토큰 업데이트
export const updateTokens = mutation({
  args: {
    id: v.id("socialAccounts"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.string()),
  },
  handler: async (ctx, { id, accessToken, refreshToken, tokenExpiresAt }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const account = await ctx.db.get(id);
    if (!account) {
      throw new Error("소셜 계정을 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (account.userId !== userId) {
      throw new Error("수정 권한이 없습니다");
    }

    const now = new Date().toISOString();

    await ctx.db.patch(id, {
      accessToken,
      refreshToken,
      tokenExpiresAt,
      lastSyncedAt: now,
      updatedAt: now,
    });

    return id;
  },
});

// 소셜 계정 연동 해제
export const disconnect = mutation({
  args: { id: v.id("socialAccounts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const account = await ctx.db.get(id);
    if (!account) {
      throw new Error("소셜 계정을 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (account.userId !== userId) {
      throw new Error("삭제 권한이 없습니다");
    }

    // 해당 계정을 사용하는 예약된 게시물이 있는지 확인
    const scheduledPosts = await ctx.db
      .query("scheduledPosts")
      .withIndex("bySocialAccountId", (q) => q.eq("socialAccountId", id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    if (scheduledPosts.length > 0) {
      throw new Error("이 계정을 사용하는 예약된 게시물이 있습니다. 먼저 예약을 취소한 후 연동을 해제해주세요.");
    }

    await ctx.db.delete(id);
    return id;
  },
});

// 계정 활성화/비활성화
export const toggleActive = mutation({
  args: { id: v.id("socialAccounts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const account = await ctx.db.get(id);
    if (!account) {
      throw new Error("소셜 계정을 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (account.userId !== userId) {
      throw new Error("수정 권한이 없습니다");
    }

    await ctx.db.patch(id, {
      isActive: !account.isActive,
      updatedAt: new Date().toISOString(),
    });

    return id;
  },
});

// 계정별 게시물 통계
export const getAccountStats = query({
  args: {
    accountId: v.id("socialAccounts"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, { accountId, startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const account = await ctx.db.get(accountId);
    if (!account || account.userId !== userId) {
      throw new Error("계정에 대한 접근 권한이 없습니다");
    }

    // 해당 계정으로 예약/발행된 게시물들 조회
    const scheduledPosts = await ctx.db
      .query("scheduledPosts")
      .withIndex("bySocialAccountId", (q) => q.eq("socialAccountId", accountId))
      .collect();

    const stats = {
      totalScheduled: scheduledPosts.length,
      published: scheduledPosts.filter(p => p.status === "published").length,
      failed: scheduledPosts.filter(p => p.status === "failed").length,
      pending: scheduledPosts.filter(p => p.status === "pending").length,
      successRate: 0,
    };

    if (stats.totalScheduled > 0) {
      stats.successRate = Math.round((stats.published / stats.totalScheduled) * 100);
    }

    return stats;
  },
});

// 토큰 만료 확인
export const getExpiringTokens = query({
  args: {
    hoursThreshold: v.optional(v.number()), // 몇 시간 이내에 만료되는 토큰들
  },
  handler: async (ctx, { hoursThreshold = 24 }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const accounts = await ctx.db
      .query("socialAccounts")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const now = new Date();
    const thresholdTime = new Date(now.getTime() + hoursThreshold * 60 * 60 * 1000);

    const expiringAccounts = accounts.filter(account => {
      if (!account.tokenExpiresAt) return false;
      
      const expiresAt = new Date(account.tokenExpiresAt);
      return expiresAt <= thresholdTime;
    });

    return expiringAccounts.map(account => ({
      _id: account._id,
      platform: account.platform,
      username: account.username,
      displayName: account.displayName,
      tokenExpiresAt: account.tokenExpiresAt,
    }));
  },
});