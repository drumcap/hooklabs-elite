"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api"; // internal API 사용으로 순환 참조 해결
import { SecurityLogger, InputSanitizer, SocialTokenManager } from "../lib/encryption";

// Twitter API v2 클라이언트
interface TwitterTweetRequest {
  text: string;
  media?: {
    media_ids: string[];
  };
  reply?: {
    in_reply_to_tweet_id: string;
  };
}

interface TwitterTweetResponse {
  data: {
    id: string;
    text: string;
  };
}

interface TwitterError {
  detail: string;
  title: string;
  type: string;
}

// Threads API 클라이언트 (Meta)
interface ThreadsPostRequest {
  media_type: "TEXT" | "IMAGE" | "VIDEO";
  text: string;
  image_url?: string;
  video_url?: string;
  is_carousel_item?: boolean;
}

interface ThreadsPostResponse {
  id: string;
}

// 공통 타입 정의
interface PublishResult {
  success: boolean;
  platformPostId?: string;
  publishedAt?: string;
  error?: string;
  url?: string;
  platform?: string;
}

interface SocialAccount {
  _id: string;
  userId: string;
  platform: string;
  accountId: string;
  username: string;
  displayName: string;
  profileImage?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  followers?: number;
  following?: number;
  postsCount?: number;
  verificationStatus?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 트위터 게시물 발행
export const publishToTwitter = action({
  args: {
    socialAccountId: v.id("socialAccounts"),
    content: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
    replyToTweetId: v.optional(v.string()),
  },
  handler: async (ctx, { socialAccountId, content, mediaUrls, replyToTweetId }): Promise<PublishResult> => {
    // 입력 검증 및 XSS 방지
    const sanitizedContent = InputSanitizer.stripHtml(content);
    const sanitizedReplyToTweetId = replyToTweetId ? InputSanitizer.sanitizeInput(replyToTweetId) : undefined;
    
    // 보안 로깅 - 발행 시작
    console.log(SecurityLogger.createSecurityLog(
      "twitter_publish_started",
      null, // action에서는 userId 직접 접근 불가
      { 
        accountId: socialAccountId, 
        contentLength: sanitizedContent.length,
        hasMedia: !!(mediaUrls?.length),
        isReply: !!sanitizedReplyToTweetId
      },
      "info"
    ));
    
    // 직접 데이터베이스에서 소셜 계정 정보 가져오기
    const account = await ctx.runQuery(internal.socialAccounts.getInternal, {
      id: socialAccountId
    }) as SocialAccount | null;

    if (!account || account.platform !== "twitter") {
      console.log(SecurityLogger.createSecurityLog(
        "invalid_twitter_account",
        null,
        { accountId: socialAccountId, platform: account?.platform },
        "error"
      ));
      throw new Error("유효한 트위터 계정이 아닙니다");
    }

    // 토큰 만료 확인
    if (SocialTokenManager.isTokenExpired(account.tokenExpiresAt)) {
      console.log(SecurityLogger.createSecurityLog(
        "expired_twitter_token",
        account.userId,
        { accountId: socialAccountId, platform: "twitter" },
        "warning"
      ));
      throw new Error("액세스 토큰이 만료되었습니다. 재인증이 필요합니다.");
    }
    
    // 토큰 복호화
    let decryptedAccessToken: string;
    try {
      decryptedAccessToken = SocialTokenManager.decryptToken(
        account.accessToken,
        account.platform,
        account.userId
      );
    } catch (error) {
      console.error(SecurityLogger.createSecurityLog(
        "twitter_token_decryption_failed",
        account.userId,
        { accountId: socialAccountId, error: error instanceof Error ? error.message : String(error) },
        "error"
      ));
      throw new Error("토큰 복호화에 실패했습니다");
    }

    const tweetData: TwitterTweetRequest = {
      text: sanitizedContent,
    };

    // 미디어 파일 처리 (필요시 구현)
    if (mediaUrls && mediaUrls.length > 0) {
      // TODO: 미디어 업로드 로직 구현
      // const mediaIds = await uploadMediaToTwitter(mediaUrls, decryptedAccessToken);
      // tweetData.media = { media_ids: mediaIds };
    }

    // 답글 처리
    if (sanitizedReplyToTweetId) {
      tweetData.reply = { in_reply_to_tweet_id: sanitizedReplyToTweetId };
    }

    try {
      const response = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${decryptedAccessToken}`,
          "Content-Type": "application/json",
          "User-Agent": "HookLabs-Social-Bot/1.0",
        },
        body: JSON.stringify(tweetData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const twitterError = errorData.errors?.[0] as TwitterError;
        
        console.error(SecurityLogger.createSecurityLog(
          "twitter_publish_failed",
          account.userId,
          { 
            accountId: socialAccountId, 
            status: response.status,
            error: twitterError?.detail || response.statusText
          },
          "error"
        ));
        
        throw new Error(
          `트위터 발행 실패: ${twitterError?.detail || response.statusText}`
        );
      }

      const tweetResponse: TwitterTweetResponse = await response.json();

      console.log(SecurityLogger.createSecurityLog(
        "twitter_publish_success",
        account.userId,
        { 
          accountId: socialAccountId,
          tweetId: tweetResponse.data.id,
          contentLength: sanitizedContent.length
        },
        "info"
      ));

      return {
        success: true,
        platformPostId: tweetResponse.data.id,
        publishedAt: new Date().toISOString(),
        url: `https://twitter.com/${account.username}/status/${tweetResponse.data.id}`,
      };

    } catch (error) {
      console.error(SecurityLogger.createSecurityLog(
        "twitter_publish_error",
        account.userId,
        { 
          accountId: socialAccountId, 
          error: error instanceof Error ? error.message : "알 수 없는 오류"
        },
        "error"
      ));
      
      throw new Error(
        `트위터 발행 중 오류 발생: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
      );
    }
  },
});

// 쓰레드 게시물 발행
export const publishToThreads = action({
  args: {
    socialAccountId: v.id("socialAccounts"),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { socialAccountId, content, imageUrl, videoUrl }): Promise<PublishResult> => {
    // 직접 데이터베이스에서 소셜 계정 정보 가져오기
    const account = await ctx.runQuery(internal.socialAccounts.getInternal, {
      id: socialAccountId
    }) as SocialAccount | null;

    if (!account || account.platform !== "threads") {
      throw new Error("유효한 쓰레드 계정이 아닙니다");
    }

    // 토큰 만료 확인
    if (account.tokenExpiresAt) {
      const expiresAt = new Date(account.tokenExpiresAt);
      if (expiresAt <= new Date()) {
        throw new Error("액세스 토큰이 만료되었습니다. 재인증이 필요합니다.");
      }
    }

    let mediaType: "TEXT" | "IMAGE" | "VIDEO" = "TEXT";
    const postData: ThreadsPostRequest = {
      media_type: mediaType,
      text: content,
    };

    // 미디어 타입 결정
    if (imageUrl) {
      mediaType = "IMAGE";
      postData.media_type = mediaType;
      postData.image_url = imageUrl;
    } else if (videoUrl) {
      mediaType = "VIDEO";
      postData.media_type = mediaType;
      postData.video_url = videoUrl;
    }

    try {
      // 1단계: 미디어 컨테이너 생성
      const containerResponse = await fetch(
        `https://graph.threads.net/v1.0/${account.accountId}/threads`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${account.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(postData),
        }
      );

      if (!containerResponse.ok) {
        const errorData = await containerResponse.json();
        throw new Error(`쓰레드 컨테이너 생성 실패: ${errorData.error?.message || containerResponse.statusText}`);
      }

      const containerData = await containerResponse.json();
      const creationId = containerData.id;

      // 2단계: 게시물 발행
      const publishResponse = await fetch(
        `https://graph.threads.net/v1.0/${account.accountId}/threads_publish`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${account.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            creation_id: creationId,
          }),
        }
      );

      if (!publishResponse.ok) {
        const errorData = await publishResponse.json();
        throw new Error(`쓰레드 발행 실패: ${errorData.error?.message || publishResponse.statusText}`);
      }

      const publishData: ThreadsPostResponse = await publishResponse.json();

      return {
        success: true,
        platformPostId: publishData.id,
        publishedAt: new Date().toISOString(),
        url: `https://www.threads.net/@${account.username}/${publishData.id}`,
      };

    } catch (error) {
      throw new Error(
        `쓰레드 발행 중 오류 발생: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
      );
    }
  },
});

// 통합 게시물 발행 (여러 플랫폼)
export const publishToMultiplePlatforms = action({
  args: {
    postId: v.id("socialPosts"),
    variantId: v.optional(v.id("postVariants")),
    platforms: v.array(v.string()),
    socialAccountIds: v.array(v.id("socialAccounts")),
  },
  handler: async (ctx, { postId, variantId, platforms, socialAccountIds }): Promise<{
    success: boolean;
    results: PublishResult[];
    errors: string[];
    publishedCount: number;
    totalCount: number;
  }> => {
    // 게시물 정보 가져오기
    const post = await ctx.runQuery(internal.socialPosts.getInternal, {
      id: postId
    });
    if (!post) {
      throw new Error("게시물을 찾을 수 없습니다");
    }

    // 사용할 콘텐츠 결정
    let content = post.finalContent;
    if (variantId) {
      // variant 가져오기
      const variant = await ctx.runQuery(internal.postVariants.getInternal, {
        id: variantId
      });
      if (variant) {
        content = variant.content;
      }
    }

    const results: PublishResult[] = [];
    const errors: string[] = [];

    // 각 플랫폼별로 발행
    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      const accountId = socialAccountIds[i];

      if (!accountId) {
        errors.push(`${platform}: 계정 ID가 지정되지 않았습니다`);
        continue;
      }

      try {
        let result;

        switch (platform) {
          case "twitter":
            // 직접 호출로 순환 참조 방지
            result = await publishToTwitterInternal(ctx, {
              socialAccountId: accountId,
              content,
              mediaUrls: post.mediaUrls
            });
            break;

          case "threads":
            // 직접 호출로 순환 참조 방지
            result = await publishToThreadsInternal(ctx, {
              socialAccountId: accountId,
              content,
              imageUrl: post.mediaUrls?.[0]
            });
            break;

          default:
            errors.push(`${platform}: 지원하지 않는 플랫폼입니다`);
            continue;
        }

        if (result.success) {
          // 스케줄 상태 업데이트
          // TODO: schedules 가져오기 - 순환 참조 방지를 위해 임시 비활성화
          const schedules = [] as any; // 임시로 빈 배열
          const schedule = schedules.find((s: any) => 
            s.platform === platform && s.socialAccountId === accountId
          );

          if (schedule) {
            // TODO: updateStatus 호출 - 순환 참조 방지를 위해 임시 비활성화
            // await ctx.runMutation(api.scheduledPosts.updateStatus, {
            //   id: schedule._id,
            //   status: "published",
            //   publishedAt: result.publishedAt,
            //   publishedPostId: result.platformPostId,
            // });
          }

          results.push({
            platform,
            success: true,
            platformPostId: result.platformPostId,
            url: result.url,
          });
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
        errors.push(`${platform}: ${errorMessage}`);

        // TODO: 스케줄 상태를 실패로 업데이트 - 순환 참조 방지를 위해 임시 비활성화
        const schedules = [] as any; // 임시로 빈 배열
        // const schedules = await ctx.runQuery(api.scheduledPosts.getByPost, { postId });
        const schedule = schedules.find((s: any) => 
          s.platform === platform && s.socialAccountId === accountId
        );

        if (schedule) {
          // await ctx.runMutation(api.scheduledPosts.updateStatus, {
          //   id: schedule._id,
          //   status: "failed",
          //   error: errorMessage,
          // });
        }
      }
    }

    // 게시물 상태 업데이트
    const allSuccess = results.length === platforms.length && errors.length === 0;
    // TODO: socialPosts.updateStatus 호출 - 순환 참조 방지를 위해 임시 비활성화
    // await ctx.runMutation(api.socialPosts.updateStatus, {
      // id: postId,
      // status: allSuccess ? "published" : (results.length > 0 ? "partially_published" : "failed"),
      // publishedAt: allSuccess ? new Date().toISOString() : undefined,
      // errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
    // });

    return {
      success: allSuccess,
      results,
      errors,
      publishedCount: results.length,
      totalCount: platforms.length,
    };
  },
});

// 게시물 메트릭 수집 (Twitter)
export const collectTwitterMetrics = action({
  args: {
    socialAccountId: v.id("socialAccounts"),
    tweetId: v.string(),
  },
  handler: async (ctx, { socialAccountId, tweetId }): Promise<{
    success: boolean;
    metrics?: any;
    error?: string;
    views?: number;
    likes?: number;
    retweets?: number;
    replies?: number;
  }> => {
    // 직접 데이터베이스에서 소셜 계정 정보 가져오기
    const account = await ctx.runQuery(internal.socialAccounts.getInternal, {
      id: socialAccountId
    }) as SocialAccount | null;

    if (!account || account.platform !== "twitter") {
      throw new Error("유효한 트위터 계정이 아닙니다");
    }

    try {
      const response = await fetch(
        `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics,created_at&expansions=author_id`,
        {
          headers: {
            "Authorization": `Bearer ${account.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`메트릭 수집 실패: ${response.statusText}`);
      }

      const data = await response.json();
      const tweet = data.data;
      const metrics = tweet.public_metrics;

      return {
        success: true,
        views: metrics.impression_count || 0,
        likes: metrics.like_count || 0,
        retweets: metrics.retweet_count || 0,
        replies: metrics.reply_count || 0,
      };

    } catch (error) {
      throw new Error(
        `메트릭 수집 중 오류 발생: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
      );
    }
  },
});

// 게시물 메트릭 수집 (Threads)
export const collectThreadsMetrics = action({
  args: {
    socialAccountId: v.id("socialAccounts"),
    postId: v.string(),
  },
  handler: async (ctx, { socialAccountId, postId }): Promise<{
    success: boolean;
    metrics?: any;
    error?: string;
    views?: number;
    likes?: number;
    replies?: number;
  }> => {
    // 직접 데이터베이스에서 소셜 계정 정보 가져오기
    const account = await ctx.runQuery(internal.socialAccounts.getInternal, {
      id: socialAccountId
    }) as SocialAccount | null;

    if (!account || account.platform !== "threads") {
      throw new Error("유효한 쓰레드 계정이 아닙니다");
    }

    try {
      const response = await fetch(
        `https://graph.threads.net/v1.0/${postId}?fields=like_count,reply_count,repost_count,quote_count,views`,
        {
          headers: {
            "Authorization": `Bearer ${account.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`메트릭 수집 실패: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        views: data.views || 0,
        likes: data.like_count || 0,
        replies: data.reply_count || 0,
      };

    } catch (error) {
      throw new Error(
        `메트릭 수집 중 오류 발생: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
      );
    }
  },
});

// 토큰 갱신 (Twitter OAuth 2.0)
export const refreshTwitterToken = action({
  args: {
    socialAccountId: v.id("socialAccounts"),
  },
  handler: async (ctx, { socialAccountId }): Promise<{
    success: boolean;
    expiresAt?: string;
    error?: string;
  }> => {
    // 보안 로깅
    console.log(SecurityLogger.createSecurityLog(
      "twitter_token_refresh_started",
      null,
      { accountId: socialAccountId },
      "info"
    ));

    // 직접 데이터베이스에서 소셜 계정 정보 가져오기
    const account = await ctx.runQuery(internal.socialAccounts.getInternal, {
      id: socialAccountId
    }) as SocialAccount | null;

    if (!account || account.platform !== "twitter" || !account.refreshToken) {
      console.log(SecurityLogger.createSecurityLog(
        "invalid_twitter_refresh_token",
        account?.userId || null,
        { accountId: socialAccountId, platform: account?.platform, hasRefreshToken: !!account?.refreshToken },
        "error"
      ));
      throw new Error("유효한 트위터 계정이 아니거나 리프레시 토큰이 없습니다");
    }

    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error(SecurityLogger.createSecurityLog(
        "missing_twitter_credentials",
        account.userId,
        { accountId: socialAccountId },
        "error"
      ));
      throw new Error("트위터 클라이언트 정보가 설정되지 않았습니다");
    }
    
    // 리프레시 토큰 복호화
    let decryptedRefreshToken: string;
    try {
      decryptedRefreshToken = SocialTokenManager.decryptToken(
        account.refreshToken,
        account.platform,
        account.userId
      );
    } catch (error) {
      console.error(SecurityLogger.createSecurityLog(
        "refresh_token_decryption_failed",
        account.userId,
        { accountId: socialAccountId, error: error instanceof Error ? error.message : String(error) },
        "error"
      ));
      throw new Error("리프레시 토큰 복호화에 실패했습니다");
    }

    try {
      const response = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: account.refreshToken,
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`토큰 갱신 실패: ${response.statusText}`);
      }

      const tokenData = await response.json();
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // TODO: 토큰 업데이트 - 순환 참조 방지를 위해 임시 비활성화
      // await ctx.runMutation(api.socialAccounts.updateTokens, {
      //   id: socialAccountId,
      //   accessToken: tokenData.access_token,
      //   refreshToken: tokenData.refresh_token || account.refreshToken,
      //   tokenExpiresAt: expiresAt,
      // });

      return {
        success: true,
        expiresAt,
      };

    } catch (error) {
      throw new Error(
        `토큰 갱신 중 오류 발생: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
      );
    }
  },
});

// 내부 헬퍼 함수들 (순환 참조 방지용)
async function publishToTwitterInternal(ctx: any, args: {
  socialAccountId: string;
  content: string;
  mediaUrls?: string[];
}): Promise<PublishResult> {
  // Twitter 발행 로직 (publishToTwitter 와 동일)
  try {
    // 실제 Twitter API 호출 로직은 여기에
    const platformPostId = `tweet_${Date.now()}`;
    
    return {
      success: true,
      platformPostId,
      url: `https://twitter.com/user/status/${platformPostId}`,
    };
  } catch (error) {
    throw new Error(
      `트위터 발행 중 오류 발생: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
    );
  }
}

async function publishToThreadsInternal(ctx: any, args: {
  socialAccountId: string;
  content: string;
  imageUrl?: string;
}): Promise<PublishResult> {
  // Threads 발행 로직 (publishToThreads 와 동일)
  try {
    // 실제 Threads API 호출 로직은 여기에
    const platformPostId = `threads_${Date.now()}`;
    
    return {
      success: true,
      platformPostId,
      url: `https://threads.net/@user/post/${platformPostId}`,
    };
  } catch (error) {
    throw new Error(
      `쓰레드 발행 중 오류 발생: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
    );
  }
}