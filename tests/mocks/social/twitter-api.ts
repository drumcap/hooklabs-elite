/**
 * Twitter API 모킹
 * 트위터 게시물 발행 및 계정 관리 테스트용
 */

import { vi } from 'vitest';

// Twitter API 응답 타입들
export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
  verified?: boolean;
}

export interface TwitterTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics?: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
    bookmark_count: number;
    impression_count: number;
  };
  context_annotations?: Array<{
    domain: { id: string; name: string; description: string };
    entity: { id: string; name: string; description: string };
  }>;
}

// 모킹된 사용자 정보
export const mockTwitterUser: TwitterUser = {
  id: '1234567890',
  username: 'test_user',
  name: '테스트 사용자',
  profile_image_url: 'https://pbs.twimg.com/profile_images/test.jpg',
  public_metrics: {
    followers_count: 1500,
    following_count: 300,
    tweet_count: 450
  },
  verified: false
};

// 모킹된 트윗 응답
export const mockTwitterTweet: TwitterTweet = {
  id: '1594563982395432960',
  text: '🚀 새로운 기능을 출시했습니다! 사용자 경험을 한 단계 업그레이드했어요. #스타트업 #제품출시',
  author_id: '1234567890',
  created_at: '2024-11-21T10:30:00.000Z',
  public_metrics: {
    retweet_count: 5,
    like_count: 23,
    reply_count: 8,
    quote_count: 2,
    bookmark_count: 12,
    impression_count: 1250
  }
};

// Twitter API 클라이언트 모킹
export const mockTwitterClient = {
  // 트윗 발행
  v2: {
    tweet: vi.fn().mockResolvedValue({
      data: mockTwitterTweet
    }),
    
    // 사용자 정보 조회
    userByUsername: vi.fn().mockResolvedValue({
      data: mockTwitterUser
    }),
    
    me: vi.fn().mockResolvedValue({
      data: mockTwitterUser
    }),
    
    // 트윗 조회
    singleTweet: vi.fn().mockResolvedValue({
      data: mockTwitterTweet
    }),
    
    // 트윗 삭제
    deleteTweet: vi.fn().mockResolvedValue({
      data: { deleted: true }
    }),
    
    // 미디어 업로드
    uploadMedia: vi.fn().mockResolvedValue({
      media_id_string: '1594563982395432961'
    }),
    
    // 스레드 발행
    tweetThread: vi.fn().mockResolvedValue({
      data: [mockTwitterTweet, { ...mockTwitterTweet, id: '1594563982395432961' }]
    })
  }
};

// OAuth 관련 모킹
export const mockOAuthTokens = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 7200,
  token_type: 'bearer'
};

export const mockOAuthClient = {
  generateAuthURL: vi.fn().mockReturnValue('https://twitter.com/i/oauth2/authorize?...'),
  exchangeCodeForTokens: vi.fn().mockResolvedValue(mockOAuthTokens),
  refreshToken: vi.fn().mockResolvedValue(mockOAuthTokens),
  revokeToken: vi.fn().mockResolvedValue({ revoked: true })
};

// 에러 응답 모킹
export const mockTwitterError = {
  title: 'Unauthorized',
  detail: 'Unauthorized',
  type: 'about:blank',
  status: 401
};

export const mockRateLimitError = {
  title: 'Too Many Requests',
  detail: 'Too Many Requests',
  type: 'https://api.twitter.com/2/problems/too-many-requests',
  status: 429
};

// 트윗 제한사항 모킹
export const mockTwitterLimits = {
  maxTweetLength: 280,
  maxThreadLength: 25,
  maxMediaCount: 4,
  supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
  maxImageSize: 5 * 1024 * 1024, // 5MB
  maxVideoSize: 512 * 1024 * 1024 // 512MB
};

// 트윗 메트릭스 업데이트 모킹
export const mockUpdatedMetrics = {
  ...mockTwitterTweet.public_metrics,
  retweet_count: 12,
  like_count: 45,
  reply_count: 15,
  quote_count: 5,
  bookmark_count: 28,
  impression_count: 3200
};

// 스레드 트윗들
export const mockThreadTweets = [
  {
    ...mockTwitterTweet,
    id: '1594563982395432960',
    text: '🚀 새로운 기능을 출시했습니다! (1/3)'
  },
  {
    ...mockTwitterTweet,
    id: '1594563982395432961', 
    text: '주요 개선사항들을 소개합니다: ✅ 직관적인 UI/UX ✅ 성능 최적화 50% 향상 (2/3)'
  },
  {
    ...mockTwitterTweet,
    id: '1594563982395432962',
    text: '사용자 피드백을 바탕으로 만든 새로운 자동화 기능도 추가되었습니다! #혁신 #사용자경험 (3/3)'
  }
];

// 계정 연결 상태 모킹
export const mockAccountStatus = {
  connected: true,
  username: 'test_user',
  verified: false,
  permissions: ['read', 'write', 'offline.access'],
  lastConnected: '2024-11-21T10:00:00.000Z'
};

// 발행 이력 모킹
export const mockPublishHistory = [
  {
    id: '1594563982395432960',
    content: '🚀 새로운 기능을 출시했습니다!',
    publishedAt: '2024-11-21T10:30:00.000Z',
    metrics: mockTwitterTweet.public_metrics,
    status: 'published'
  },
  {
    id: '1594563982395432959',
    content: '오늘의 개발 팁을 공유합니다 💡',
    publishedAt: '2024-11-20T15:20:00.000Z',
    metrics: {
      retweet_count: 8,
      like_count: 34,
      reply_count: 12,
      quote_count: 3,
      bookmark_count: 19,
      impression_count: 2100
    },
    status: 'published'
  }
];