import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { getAuthUserId } from "./auth";
import { 
  SocialTokenManager, 
  SecurityLogger, 
  InputSanitizer, 
  DataMasker 
} from "./lib/encryption";

// 소셜 계정 목록 조회
export const list = query({
  args: {
    platform: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { platform, isActive }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      // 보안 이벤트 로깅
      console.log(SecurityLogger.createSecurityLog(
        "unauthorized_access_attempt",
        null,
        { action: "list_social_accounts", platform },
        "warning"
      ));
      throw new Error("인증이 필요합니다");
    }

    // 입력 검증
    if (platform && typeof platform !== 'string') {
      throw new Error("올바르지 않은 플랫폼 형식입니다");
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

    // 민감한 토큰 정보 마스킹 처리하고 반환 (로그용)
    console.log(SecurityLogger.createSecurityLog(
      "social_accounts_accessed",
      userId,
      { 
        accountsCount: accounts.length, 
        platform,
        isActive 
      },
      "info"
    ));

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
      console.log(SecurityLogger.createSecurityLog(
        "unauthorized_access_attempt",
        null,
        { action: "get_social_account", accountId: id },
        "warning"
      ));
      throw new Error("인증이 필요합니다");
    }

    const account = await ctx.db.get(id);
    if (!account) {
      throw new Error("소셜 계정을 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (account.userId !== userId) {
      console.log(SecurityLogger.createSecurityLog(
        "unauthorized_account_access",
        userId,
        { accountId: id, attemptedUserId: userId, actualUserId: account.userId },
        "error"
      ));
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
      console.log(SecurityLogger.createSecurityLog(
        "unauthorized_token_access_attempt",
        null,
        { action: "get_tokens", accountId: id },
        "error"
      ));
      throw new Error("인증이 필요합니다");
    }

    const account = await ctx.db.get(id);
    if (!account) {
      throw new Error("소셜 계정을 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (account.userId !== userId) {
      console.log(SecurityLogger.createSecurityLog(
        "unauthorized_token_access",
        userId,
        { accountId: id, attemptedUserId: userId, actualUserId: account.userId },
        "error"
      ));
      throw new Error("접근 권한이 없습니다");
    }

    // 토큰 만료 확인
    if (SocialTokenManager.isTokenExpired(account.tokenExpiresAt)) {
      console.log(SecurityLogger.createSecurityLog(
        "expired_token_access",
        userId,
        { accountId: id, platform: account.platform },
        "warning"
      ));
    }

    // 토큰 복호화
    let decryptedAccount = { ...account };
    try {
      if (account.accessToken) {
        decryptedAccount.accessToken = SocialTokenManager.decryptToken(
          account.accessToken, 
          account.platform, 
          userId
        );
      }
      if (account.refreshToken) {
        decryptedAccount.refreshToken = SocialTokenManager.decryptToken(
          account.refreshToken, 
          account.platform, 
          userId
        );
      }
      
      console.log(SecurityLogger.createSecurityLog(
        "token_decryption_success",
        userId,
        { 
          accountId: id, 
          platform: account.platform,
          hasAccessToken: !!account.accessToken,
          hasRefreshToken: !!account.refreshToken
        },
        "info"
      ));
    } catch (error) {
      console.error(SecurityLogger.createSecurityLog(
        "token_decryption_failed",
        userId,
        { accountId: id, platform: account.platform, error: error instanceof Error ? error.message : String(error) },
        "error"
      ));
      throw new Error("토큰 복호화에 실패했습니다");
    }

    return decryptedAccount;
  },
});

// Internal query for action use (순환 참조 해결용)
export const getInternal = internalQuery({
  args: { id: v.id("socialAccounts") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
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
      // 입력 검증
      const sanitizedDisplayName = InputSanitizer.stripHtml(args.displayName);
      const sanitizedVerificationStatus = args.verificationStatus ? 
        InputSanitizer.sanitizeInput(args.verificationStatus) : undefined;
      
      // 토큰 암호화
      let encryptedAccessToken: string;
      let encryptedRefreshToken: string | undefined;
      
      try {
        encryptedAccessToken = SocialTokenManager.encryptToken(
          args.accessToken,
          args.platform,
          userId
        );
        
        if (args.refreshToken) {
          encryptedRefreshToken = SocialTokenManager.encryptToken(
            args.refreshToken,
            args.platform,
            userId
          );
        }
      } catch (error) {
        console.error(SecurityLogger.createSecurityLog(
          "token_update_encryption_failed",
          userId,
          { accountId: existingAccount._id, platform: args.platform, error: error instanceof Error ? error.message : String(error) },
          "error"
        ));
        throw new Error("토큰 암호화에 실패했습니다");
      }
      
      await ctx.db.patch(existingAccount._id, {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: args.tokenExpiresAt,
        displayName: sanitizedDisplayName,
        profileImage: args.profileImage,
        followers: args.followers,
        following: args.following,
        postsCount: args.postsCount,
        verificationStatus: sanitizedVerificationStatus,
        isActive: true,
        lastSyncedAt: now,
        updatedAt: now,
      });
      
      console.log(SecurityLogger.createSecurityLog(
        "social_account_tokens_updated",
        userId,
        { 
          accountId: existingAccount._id,
          platform: args.platform 
        },
        "info"
      ));

      return existingAccount._id;
    }

    // 입력 검증 및 XSS 방지
    const sanitizedArgs = {
      platform: InputSanitizer.sanitizeInput(args.platform),
      accountId: InputSanitizer.sanitizeInput(args.accountId),
      username: InputSanitizer.sanitizeInput(args.username),
      displayName: InputSanitizer.stripHtml(args.displayName),
      profileImage: args.profileImage,
      verificationStatus: args.verificationStatus ? InputSanitizer.sanitizeInput(args.verificationStatus) : undefined,
    };

    // 토큰 암호화
    let encryptedAccessToken: string;
    let encryptedRefreshToken: string | undefined;
    
    try {
      encryptedAccessToken = SocialTokenManager.encryptToken(
        args.accessToken,
        sanitizedArgs.platform,
        userId
      );
      
      if (args.refreshToken) {
        encryptedRefreshToken = SocialTokenManager.encryptToken(
          args.refreshToken,
          sanitizedArgs.platform,
          userId
        );
      }
      
      console.log(SecurityLogger.createSecurityLog(
        "token_encryption_success",
        userId,
        { 
          platform: sanitizedArgs.platform,
          accountId: sanitizedArgs.accountId,
          hasRefreshToken: !!args.refreshToken
        },
        "info"
      ));
    } catch (error) {
      console.error(SecurityLogger.createSecurityLog(
        "token_encryption_failed",
        userId,
        { platform: sanitizedArgs.platform, error: error instanceof Error ? error.message : String(error) },
        "error"
      ));
      throw new Error("토큰 암호화에 실패했습니다");
    }

    // 새 계정 생성
    const newAccountId = await ctx.db.insert("socialAccounts", {
      userId,
      platform: sanitizedArgs.platform,
      accountId: sanitizedArgs.accountId,
      username: sanitizedArgs.username,
      displayName: sanitizedArgs.displayName,
      profileImage: sanitizedArgs.profileImage,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt: args.tokenExpiresAt,
      followers: args.followers,
      following: args.following,
      postsCount: args.postsCount,
      verificationStatus: sanitizedArgs.verificationStatus,
      isActive: true,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    console.log(SecurityLogger.createSecurityLog(
      "social_account_created",
      userId,
      { 
        accountId: newAccountId,
        platform: sanitizedArgs.platform,
        username: sanitizedArgs.username
      },
      "info"
    ));

    return newAccountId;
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
      console.log(SecurityLogger.createSecurityLog(
        "unauthorized_token_update_attempt",
        null,
        { action: "update_tokens", accountId: id },
        "warning"
      ));
      throw new Error("인증이 필요합니다");
    }

    const account = await ctx.db.get(id);
    if (!account) {
      throw new Error("소셜 계정을 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (account.userId !== userId) {
      console.log(SecurityLogger.createSecurityLog(
        "unauthorized_token_update",
        userId,
        { accountId: id, attemptedUserId: userId, actualUserId: account.userId },
        "error"
      ));
      throw new Error("수정 권한이 없습니다");
    }

    // 토큰 암호화
    let encryptedAccessToken: string;
    let encryptedRefreshToken: string | undefined;
    
    try {
      encryptedAccessToken = SocialTokenManager.encryptToken(
        accessToken,
        account.platform,
        userId
      );
      
      if (refreshToken) {
        encryptedRefreshToken = SocialTokenManager.encryptToken(
          refreshToken,
          account.platform,
          userId
        );
      }
      
      console.log(SecurityLogger.createSecurityLog(
        "tokens_updated",
        userId,
        { 
          accountId: id,
          platform: account.platform,
          hasRefreshToken: !!refreshToken
        },
        "info"
      ));
    } catch (error) {
      console.error(SecurityLogger.createSecurityLog(
        "token_update_failed",
        userId,
        { accountId: id, platform: account.platform, error: error instanceof Error ? error.message : String(error) },
        "error"
      ));
      throw new Error("토큰 업데이트에 실패했습니다");
    }

    const now = new Date().toISOString();

    await ctx.db.patch(id, {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
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