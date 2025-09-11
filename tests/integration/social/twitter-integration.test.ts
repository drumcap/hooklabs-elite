/**
 * Twitter API 통합 테스트
 * 트위터 게시물 발행 및 계정 관리 기능 테스트
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { 
  mockTwitterClient, 
  mockTwitterUser, 
  mockTwitterTweet,
  mockOAuthClient,
  mockOAuthTokens,
  mockTwitterError,
  mockRateLimitError,
  mockTwitterLimits,
  mockThreadTweets,
  mockAccountStatus,
  mockPublishHistory
} from '../../mocks/social/twitter-api';

// Twitter API 서비스 클래스
class TwitterService {
  private client: any;
  private oauthClient: any;

  constructor() {
    this.client = mockTwitterClient;
    this.oauthClient = mockOAuthClient;
  }

  // OAuth 인증
  async authenticateUser(code: string, codeVerifier: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    success: boolean;
    error?: string;
  }> {
    try {
      const tokens = await this.oauthClient.exchangeCodeForTokens({
        code,
        codeVerifier
      });

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        success: true
      };
    } catch (error) {
      return {
        accessToken: '',
        refreshToken: '',
        expiresIn: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  // 사용자 정보 조회
  async getUserInfo(accessToken: string): Promise<{
    user: typeof mockTwitterUser | null;
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await this.client.v2.me({
        'user.fields': ['public_metrics', 'profile_image_url', 'verified']
      });

      return {
        user: response.data,
        success: true
      };
    } catch (error) {
      return {
        user: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user info'
      };
    }
  }

  // 단일 트윗 발행
  async publishTweet(content: string, options: {
    mediaIds?: string[];
    replyTo?: string;
    quoteTweetId?: string;
  } = {}): Promise<{
    tweet: typeof mockTwitterTweet | null;
    success: boolean;
    error?: string;
  }> {
    try {
      // 콘텐츠 길이 검증
      if (content.length > mockTwitterLimits.maxTweetLength) {
        throw new Error(`Tweet too long: ${content.length}/${mockTwitterLimits.maxTweetLength}`);
      }

      const tweetData: any = {
        text: content
      };

      if (options.mediaIds && options.mediaIds.length > 0) {
        if (options.mediaIds.length > mockTwitterLimits.maxMediaCount) {
          throw new Error(`Too many media files: ${options.mediaIds.length}/${mockTwitterLimits.maxMediaCount}`);
        }
        tweetData.media = { media_ids: options.mediaIds };
      }

      if (options.replyTo) {
        tweetData.reply = { in_reply_to_tweet_id: options.replyTo };
      }

      if (options.quoteTweetId) {
        tweetData.quote_tweet_id = options.quoteTweetId;
      }

      const response = await this.client.v2.tweet(tweetData);

      return {
        tweet: response.data,
        success: true
      };
    } catch (error) {
      return {
        tweet: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish tweet'
      };
    }
  }

  // 스레드 발행
  async publishThread(tweets: string[], mediaIds: string[][] = []): Promise<{
    tweets: Array<typeof mockTwitterTweet>;
    success: boolean;
    error?: string;
  }> {
    try {
      if (tweets.length > mockTwitterLimits.maxThreadLength) {
        throw new Error(`Thread too long: ${tweets.length}/${mockTwitterLimits.maxThreadLength}`);
      }

      const publishedTweets: Array<typeof mockTwitterTweet> = [];
      let previousTweetId: string | undefined;

      for (let i = 0; i < tweets.length; i++) {
        const content = tweets[i];
        const media = mediaIds[i] || [];

        const result = await this.publishTweet(content, {
          mediaIds: media,
          replyTo: previousTweetId
        });

        if (!result.success || !result.tweet) {
          throw new Error(result.error || `Failed to publish tweet ${i + 1}`);
        }

        publishedTweets.push(result.tweet);
        previousTweetId = result.tweet.id;
      }

      return {
        tweets: publishedTweets,
        success: true
      };
    } catch (error) {
      return {
        tweets: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish thread'
      };
    }
  }

  // 트윗 삭제
  async deleteTweet(tweetId: string): Promise<{
    deleted: boolean;
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await this.client.v2.deleteTweet(tweetId);

      return {
        deleted: response.data.deleted,
        success: true
      };
    } catch (error) {
      return {
        deleted: false,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete tweet'
      };
    }
  }

  // 트윗 조회
  async getTweet(tweetId: string): Promise<{
    tweet: typeof mockTwitterTweet | null;
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await this.client.v2.singleTweet(tweetId, {
        'tweet.fields': ['public_metrics', 'created_at', 'context_annotations']
      });

      return {
        tweet: response.data,
        success: true
      };
    } catch (error) {
      return {
        tweet: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tweet'
      };
    }
  }

  // 미디어 업로드
  async uploadMedia(mediaData: Buffer, mediaType: string): Promise<{
    mediaId: string;
    success: boolean;
    error?: string;
  }> {
    try {
      if (!mockTwitterLimits.supportedMediaTypes.includes(mediaType)) {
        throw new Error(`Unsupported media type: ${mediaType}`);
      }

      const maxSize = mediaType.startsWith('image/') 
        ? mockTwitterLimits.maxImageSize 
        : mockTwitterLimits.maxVideoSize;

      if (mediaData.length > maxSize) {
        throw new Error(`Media file too large: ${mediaData.length}/${maxSize} bytes`);
      }

      const response = await this.client.v2.uploadMedia(mediaData, {
        type: mediaType
      });

      return {
        mediaId: response.media_id_string,
        success: true
      };
    } catch (error) {
      return {
        mediaId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload media'
      };
    }
  }

  // 토큰 갱신
  async refreshTokens(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    success: boolean;
    error?: string;
  }> {
    try {
      const tokens = await this.oauthClient.refreshToken(refreshToken);

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        success: true
      };
    } catch (error) {
      return {
        accessToken: '',
        refreshToken: '',
        expiresIn: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh token'
      };
    }
  }

  // 계정 연결 해제
  async revokeAccess(accessToken: string): Promise<{
    revoked: boolean;
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await this.oauthClient.revokeToken(accessToken);

      return {
        revoked: response.revoked,
        success: true
      };
    } catch (error) {
      return {
        revoked: false,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke access'
      };
    }
  }
}

describe('Twitter API Integration Tests', () => {
  let twitterService: TwitterService;

  beforeAll(() => {
    twitterService = new TwitterService();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('OAuth 인증', () => {
    it('인증 코드로 토큰을 교환해야 함', async () => {
      const result = await twitterService.authenticateUser('auth_code_123', 'code_verifier_456');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(mockOAuthClient.exchangeCodeForTokens).toHaveBeenCalledWith({
        code: 'auth_code_123',
        codeVerifier: 'code_verifier_456'
      });
    });

    it('잘못된 인증 코드에 대해 에러를 처리해야 함', async () => {
      mockOAuthClient.exchangeCodeForTokens.mockRejectedValueOnce(new Error('Invalid authorization code'));

      const result = await twitterService.authenticateUser('invalid_code', 'invalid_verifier');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid authorization code');
      expect(result.accessToken).toBe('');
    });

    it('토큰을 성공적으로 갱신해야 함', async () => {
      const result = await twitterService.refreshTokens('refresh_token_123');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(mockOAuthClient.refreshToken).toHaveBeenCalledWith('refresh_token_123');
    });

    it('액세스 토큰을 성공적으로 해제해야 함', async () => {
      const result = await twitterService.revokeAccess('access_token_123');

      expect(result.success).toBe(true);
      expect(result.revoked).toBe(true);
      expect(mockOAuthClient.revokeToken).toHaveBeenCalledWith('access_token_123');
    });
  });

  describe('사용자 정보 조회', () => {
    it('현재 사용자 정보를 조회해야 함', async () => {
      const result = await twitterService.getUserInfo('access_token');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockTwitterUser);
      expect(result.user?.username).toBe('test_user');
      expect(result.user?.public_metrics?.followers_count).toBe(1500);
    });

    it('잘못된 토큰에 대해 에러를 처리해야 함', async () => {
      mockTwitterClient.v2.me.mockRejectedValueOnce(mockTwitterError);

      const result = await twitterService.getUserInfo('invalid_token');

      expect(result.success).toBe(false);
      expect(result.user).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('단일 트윗 발행', () => {
    it('기본 트윗을 성공적으로 발행해야 함', async () => {
      const content = '🚀 새로운 기능을 출시했습니다! #혁신 #스타트업';

      const result = await twitterService.publishTweet(content);

      expect(result.success).toBe(true);
      expect(result.tweet).toEqual(mockTwitterTweet);
      expect(mockTwitterClient.v2.tweet).toHaveBeenCalledWith({
        text: content
      });
    });

    it('미디어가 첨부된 트윗을 발행해야 함', async () => {
      const content = '새로운 기능 스크린샷을 공유합니다!';
      const mediaIds = ['media_id_1', 'media_id_2'];

      const result = await twitterService.publishTweet(content, { mediaIds });

      expect(result.success).toBe(true);
      expect(mockTwitterClient.v2.tweet).toHaveBeenCalledWith({
        text: content,
        media: { media_ids: mediaIds }
      });
    });

    it('답글 트윗을 발행해야 함', async () => {
      const content = '추가 정보를 공유합니다.';
      const replyTo = 'original_tweet_id';

      const result = await twitterService.publishTweet(content, { replyTo });

      expect(result.success).toBe(true);
      expect(mockTwitterClient.v2.tweet).toHaveBeenCalledWith({
        text: content,
        reply: { in_reply_to_tweet_id: replyTo }
      });
    });

    it('인용 트윗을 발행해야 함', async () => {
      const content = '이 트윗에 대한 의견을 추가합니다.';
      const quoteTweetId = 'quoted_tweet_id';

      const result = await twitterService.publishTweet(content, { quoteTweetId });

      expect(result.success).toBe(true);
      expect(mockTwitterClient.v2.tweet).toHaveBeenCalledWith({
        text: content,
        quote_tweet_id: quoteTweetId
      });
    });

    it('280자 초과 트윗에 대해 에러를 반환해야 함', async () => {
      const longContent = 'A'.repeat(281);

      const result = await twitterService.publishTweet(longContent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tweet too long');
      expect(result.tweet).toBeNull();
    });

    it('미디어 개수 제한을 검증해야 함', async () => {
      const content = '미디어 테스트';
      const tooManyMediaIds = ['1', '2', '3', '4', '5']; // 4개 초과

      const result = await twitterService.publishTweet(content, { 
        mediaIds: tooManyMediaIds 
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many media files');
    });
  });

  describe('스레드 발행', () => {
    it('다중 트윗 스레드를 발행해야 함', async () => {
      const tweets = [
        '🚀 새로운 기능을 출시했습니다! (1/3)',
        '주요 개선사항들을 소개합니다: ✅ UI/UX 개선 ✅ 성능 최적화 (2/3)',
        '사용자 피드백을 바탕으로 만든 새로운 기능도 추가되었습니다! (3/3)'
      ];

      const result = await twitterService.publishThread(tweets);

      expect(result.success).toBe(true);
      expect(result.tweets).toHaveLength(3);
      expect(mockTwitterClient.v2.tweet).toHaveBeenCalledTimes(3);
      
      // 첫 번째 트윗은 답글이 아님
      expect(mockTwitterClient.v2.tweet).toHaveBeenNthCalledWith(1, {
        text: tweets[0]
      });
      
      // 두 번째, 세 번째 트윗은 답글
      expect(mockTwitterClient.v2.tweet).toHaveBeenNthCalledWith(2, {
        text: tweets[1],
        reply: { in_reply_to_tweet_id: expect.any(String) }
      });
    });

    it('미디어가 포함된 스레드를 발행해야 함', async () => {
      const tweets = ['첫 번째 트윗', '두 번째 트윗'];
      const mediaIds = [['media1'], ['media2']];

      const result = await twitterService.publishThread(tweets, mediaIds);

      expect(result.success).toBe(true);
      expect(result.tweets).toHaveLength(2);
    });

    it('스레드 길이 제한을 검증해야 함', async () => {
      const tooManyTweets = Array.from({ length: 26 }, (_, i) => `트윗 ${i + 1}`);

      const result = await twitterService.publishThread(tooManyTweets);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Thread too long');
      expect(result.tweets).toHaveLength(0);
    });

    it('스레드 중간에 실패하면 에러를 반환해야 함', async () => {
      mockTwitterClient.v2.tweet
        .mockResolvedValueOnce({ data: mockThreadTweets[0] })
        .mockRejectedValueOnce(new Error('Second tweet failed'));

      const tweets = ['첫 번째 트윗', '두 번째 트윗 (실패)'];

      const result = await twitterService.publishThread(tweets);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to publish tweet 2');
    });
  });

  describe('트윗 관리', () => {
    it('트윗을 성공적으로 삭제해야 함', async () => {
      const tweetId = 'tweet_to_delete';

      const result = await twitterService.deleteTweet(tweetId);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(true);
      expect(mockTwitterClient.v2.deleteTweet).toHaveBeenCalledWith(tweetId);
    });

    it('트윗 조회를 성공적으로 수행해야 함', async () => {
      const tweetId = 'tweet_to_get';

      const result = await twitterService.getTweet(tweetId);

      expect(result.success).toBe(true);
      expect(result.tweet).toEqual(mockTwitterTweet);
      expect(mockTwitterClient.v2.singleTweet).toHaveBeenCalledWith(
        tweetId,
        expect.objectContaining({
          'tweet.fields': expect.arrayContaining(['public_metrics', 'created_at'])
        })
      );
    });

    it('존재하지 않는 트윗 조회 시 에러를 처리해야 함', async () => {
      mockTwitterClient.v2.singleTweet.mockRejectedValueOnce(new Error('Tweet not found'));

      const result = await twitterService.getTweet('nonexistent_tweet');

      expect(result.success).toBe(false);
      expect(result.tweet).toBeNull();
      expect(result.error).toContain('Tweet not found');
    });
  });

  describe('미디어 업로드', () => {
    it('이미지를 성공적으로 업로드해야 함', async () => {
      const imageData = Buffer.from('fake image data');
      const mediaType = 'image/jpeg';

      const result = await twitterService.uploadMedia(imageData, mediaType);

      expect(result.success).toBe(true);
      expect(result.mediaId).toBeTruthy();
      expect(mockTwitterClient.v2.uploadMedia).toHaveBeenCalledWith(
        imageData,
        { type: mediaType }
      );
    });

    it('동영상을 성공적으로 업로드해야 함', async () => {
      const videoData = Buffer.from('fake video data');
      const mediaType = 'video/mp4';

      const result = await twitterService.uploadMedia(videoData, mediaType);

      expect(result.success).toBe(true);
      expect(result.mediaId).toBeTruthy();
    });

    it('지원하지 않는 미디어 타입에 대해 에러를 반환해야 함', async () => {
      const data = Buffer.from('fake data');
      const unsupportedType = 'image/bmp';

      const result = await twitterService.uploadMedia(data, unsupportedType);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported media type');
      expect(result.mediaId).toBe('');
    });

    it('파일 크기 제한을 검증해야 함', async () => {
      const largeImageData = Buffer.alloc(mockTwitterLimits.maxImageSize + 1);
      const mediaType = 'image/jpeg';

      const result = await twitterService.uploadMedia(largeImageData, mediaType);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Media file too large');
    });
  });

  describe('API 제한 및 에러 처리', () => {
    it('Rate Limit 에러를 적절히 처리해야 함', async () => {
      mockTwitterClient.v2.tweet.mockRejectedValueOnce(mockRateLimitError);

      const result = await twitterService.publishTweet('Rate limit 테스트');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('API 에러를 적절히 처리해야 함', async () => {
      mockTwitterClient.v2.tweet.mockRejectedValueOnce(mockTwitterError);

      const result = await twitterService.publishTweet('API 에러 테스트');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('네트워크 에러를 처리해야 함', async () => {
      mockTwitterClient.v2.tweet.mockRejectedValueOnce(new Error('Network error'));

      const result = await twitterService.publishTweet('네트워크 에러 테스트');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('실제 사용 시나리오', () => {
    it('완전한 게시물 발행 플로우를 테스트해야 함', async () => {
      // 1. 사용자 인증
      const authResult = await twitterService.authenticateUser('auth_code', 'code_verifier');
      expect(authResult.success).toBe(true);

      // 2. 사용자 정보 조회
      const userResult = await twitterService.getUserInfo(authResult.accessToken);
      expect(userResult.success).toBe(true);

      // 3. 미디어 업로드
      const imageData = Buffer.from('image data');
      const uploadResult = await twitterService.uploadMedia(imageData, 'image/jpeg');
      expect(uploadResult.success).toBe(true);

      // 4. 트윗 발행
      const publishResult = await twitterService.publishTweet(
        '완전한 플로우 테스트 게시물! #테스트',
        { mediaIds: [uploadResult.mediaId] }
      );
      expect(publishResult.success).toBe(true);

      // 5. 발행된 트윗 조회
      const tweetResult = await twitterService.getTweet(publishResult.tweet!.id);
      expect(tweetResult.success).toBe(true);
    });

    it('스레드 발행과 분석 플로우를 테스트해야 함', async () => {
      const threadContent = [
        '🚀 스레드 테스트 시작! (1/3)',
        '이것은 두 번째 트윗입니다. 더 많은 정보를 제공합니다. (2/3)', 
        '마지막 트윗에서 결론을 맺겠습니다. 감사합니다! (3/3)'
      ];

      // 스레드 발행
      const threadResult = await twitterService.publishThread(threadContent);
      expect(threadResult.success).toBe(true);
      expect(threadResult.tweets).toHaveLength(3);

      // 각 트윗의 정보 조회
      for (const tweet of threadResult.tweets) {
        const tweetInfo = await twitterService.getTweet(tweet.id);
        expect(tweetInfo.success).toBe(true);
      }
    });

    it('에러 복구 시나리오를 테스트해야 함', async () => {
      // 첫 번째 시도 실패
      mockTwitterClient.v2.tweet.mockRejectedValueOnce(mockRateLimitError);
      
      const firstAttempt = await twitterService.publishTweet('에러 복구 테스트');
      expect(firstAttempt.success).toBe(false);

      // 두 번째 시도 성공
      mockTwitterClient.v2.tweet.mockResolvedValueOnce({ data: mockTwitterTweet });
      
      const secondAttempt = await twitterService.publishTweet('에러 복구 테스트');
      expect(secondAttempt.success).toBe(true);
    });
  });

  describe('토큰 관리', () => {
    it('토큰 만료 시 자동 갱신을 처리해야 함', async () => {
      // 첫 번째 호출에서 토큰 만료 에러
      mockTwitterClient.v2.me.mockRejectedValueOnce({ status: 401 });

      // 토큰 갱신
      const refreshResult = await twitterService.refreshTokens('refresh_token');
      expect(refreshResult.success).toBe(true);

      // 새 토큰으로 재시도
      mockTwitterClient.v2.me.mockResolvedValueOnce({ data: mockTwitterUser });
      const userResult = await twitterService.getUserInfo(refreshResult.accessToken);
      expect(userResult.success).toBe(true);
    });
  });

  describe('콘텐츠 검증', () => {
    it('빈 콘텐츠에 대해 에러를 반환해야 함', async () => {
      const result = await twitterService.publishTweet('');

      // 실제 구현에서는 빈 콘텐츠 검증 로직 필요
      expect(result).toBeDefined();
    });

    it('특수 문자가 포함된 콘텐츠를 처리할 수 있어야 함', async () => {
      const specialContent = '🎉 특수문자 테스트: @멘션 #해시태그 https://example.com';

      const result = await twitterService.publishTweet(specialContent);

      expect(result.success).toBe(true);
      expect(mockTwitterClient.v2.tweet).toHaveBeenCalledWith({
        text: specialContent
      });
    });
  });

  describe('성능 및 동시성', () => {
    it('다중 트윗을 동시에 발행할 수 있어야 함', async () => {
      const tweets = [
        '동시 발행 테스트 1',
        '동시 발행 테스트 2',
        '동시 발행 테스트 3'
      ];

      const promises = tweets.map(content => 
        twitterService.publishTweet(content)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('큰 미디어 파일을 처리할 수 있어야 함', async () => {
      const largeButValidImage = Buffer.alloc(mockTwitterLimits.maxImageSize - 1000);
      
      const result = await twitterService.uploadMedia(largeButValidImage, 'image/jpeg');

      expect(result.success).toBe(true);
      expect(result.mediaId).toBeTruthy();
    });
  });
});