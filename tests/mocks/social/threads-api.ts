/**
 * Meta Threads API 모킹
 * 스레드 게시물 발행 및 계정 관리 테스트용
 */

import { vi } from 'vitest';

// Threads API 응답 타입들
export interface ThreadsUser {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
  is_verified?: boolean;
}

export interface ThreadsMedia {
  id: string;
  media_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  permalink?: string;
  text?: string;
  timestamp: string;
  username: string;
  is_quote_post?: boolean;
  children?: {
    data: ThreadsMedia[];
  };
}

export interface ThreadsMetrics {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
}

// 모킹된 사용자 정보
export const mockThreadsUser: ThreadsUser = {
  id: 'threads_user_123',
  username: 'test_user_threads',
  name: '테스트 사용자',
  profile_picture_url: 'https://scontent.threads.net/profile_pic.jpg',
  followers_count: 850,
  media_count: 127,
  is_verified: false
};

// 모킹된 미디어 응답
export const mockThreadsMedia: ThreadsMedia = {
  id: 'threads_post_456',
  media_type: 'TEXT',
  text: '🚀 새로운 기능을 출시했습니다! Threads에서도 만나요. #스타트업 #제품출시',
  timestamp: '2024-11-21T10:30:00.000Z',
  username: 'test_user_threads',
  permalink: 'https://threads.net/@test_user_threads/post/threads_post_456',
  is_quote_post: false
};

// 모킹된 메트릭스
export const mockThreadsMetrics: ThreadsMetrics = {
  views: 1800,
  likes: 45,
  replies: 12,
  reposts: 8,
  quotes: 3
};

// Threads API 클라이언트 모킹
export const mockThreadsClient = {
  // 게시물 생성
  createMedia: vi.fn().mockResolvedValue({
    id: 'threads_post_456'
  }),
  
  // 게시물 발행
  publishMedia: vi.fn().mockResolvedValue({
    id: 'threads_post_456'
  }),
  
  // 사용자 정보 조회
  getUser: vi.fn().mockResolvedValue(mockThreadsUser),
  
  // 미디어 조회
  getMedia: vi.fn().mockResolvedValue(mockThreadsMedia),
  
  // 사용자 미디어 목록
  getUserMedia: vi.fn().mockResolvedValue({
    data: [mockThreadsMedia],
    paging: {
      cursors: {
        before: 'before_cursor',
        after: 'after_cursor'
      }
    }
  }),
  
  // 미디어 인사이트
  getMediaInsights: vi.fn().mockResolvedValue({
    data: [
      { name: 'views', values: [{ value: 1800 }] },
      { name: 'likes', values: [{ value: 45 }] },
      { name: 'replies', values: [{ value: 12 }] },
      { name: 'reposts', values: [{ value: 8 }] },
      { name: 'quotes', values: [{ value: 3 }] }
    ]
  }),
  
  // 미디어 삭제
  deleteMedia: vi.fn().mockResolvedValue({
    success: true
  })
};

// OAuth 관련 모킹
export const mockThreadsOAuth = {
  access_token: 'mock-threads-access-token',
  token_type: 'bearer',
  expires_in: 3600
};

export const mockThreadsOAuthClient = {
  getAuthorizationUrl: vi.fn().mockReturnValue('https://threads.net/oauth/authorize?...'),
  exchangeCodeForToken: vi.fn().mockResolvedValue(mockThreadsOAuth),
  refreshAccessToken: vi.fn().mockResolvedValue(mockThreadsOAuth)
};

// 에러 응답 모킹
export const mockThreadsError = {
  error: {
    message: 'Invalid access token',
    type: 'OAuthException',
    code: 190
  }
};

export const mockThreadsRateLimitError = {
  error: {
    message: 'Application request limit reached',
    type: 'ApplicationRequestLimitReached',
    code: 4
  }
};

// Threads 제한사항 모킹
export const mockThreadsLimits = {
  maxTextLength: 500,
  maxImageCount: 10,
  maxVideoCount: 1,
  supportedImageFormats: ['image/jpeg', 'image/png'],
  supportedVideoFormats: ['video/mp4', 'video/quicktime'],
  maxImageSize: 8 * 1024 * 1024, // 8MB
  maxVideoSize: 100 * 1024 * 1024, // 100MB
  maxVideoDuration: 300 // 5분
};

// 멀티미디어 게시물 모킹
export const mockThreadsImagePost: ThreadsMedia = {
  id: 'threads_image_789',
  media_type: 'IMAGE',
  media_url: 'https://scontent.threads.net/image.jpg',
  text: '새 기능 스크린샷 공유합니다! 🎨',
  timestamp: '2024-11-21T11:00:00.000Z',
  username: 'test_user_threads',
  permalink: 'https://threads.net/@test_user_threads/post/threads_image_789'
};

export const mockThreadsVideoPost: ThreadsMedia = {
  id: 'threads_video_101',
  media_type: 'VIDEO',
  media_url: 'https://scontent.threads.net/video.mp4',
  text: '새 기능 데모 영상입니다! 📹',
  timestamp: '2024-11-21T12:00:00.000Z',
  username: 'test_user_threads',
  permalink: 'https://threads.net/@test_user_threads/post/threads_video_101'
};

// 캐러셀 게시물 모킹
export const mockThreadsCarouselPost: ThreadsMedia = {
  id: 'threads_carousel_202',
  media_type: 'CAROUSEL_ALBUM',
  text: '새 기능들을 한번에 보여드려요! 📸✨',
  timestamp: '2024-11-21T13:00:00.000Z',
  username: 'test_user_threads',
  permalink: 'https://threads.net/@test_user_threads/post/threads_carousel_202',
  children: {
    data: [
      { ...mockThreadsImagePost, id: 'carousel_item_1' },
      { ...mockThreadsImagePost, id: 'carousel_item_2' },
      { ...mockThreadsImagePost, id: 'carousel_item_3' }
    ]
  }
};

// 계정 연결 상태 모킹
export const mockThreadsAccountStatus = {
  connected: true,
  username: 'test_user_threads',
  verified: false,
  permissions: ['threads_basic', 'threads_content_publish', 'threads_manage_insights'],
  lastConnected: '2024-11-21T10:00:00.000Z'
};

// 발행 이력 모킹
export const mockThreadsPublishHistory = [
  {
    id: 'threads_post_456',
    content: '🚀 새로운 기능을 출시했습니다!',
    publishedAt: '2024-11-21T10:30:00.000Z',
    metrics: mockThreadsMetrics,
    status: 'published'
  },
  {
    id: 'threads_post_455',
    content: '개발자들을 위한 팁 공유 💡',
    publishedAt: '2024-11-20T16:15:00.000Z',
    metrics: {
      views: 1200,
      likes: 28,
      replies: 7,
      reposts: 5,
      quotes: 2
    },
    status: 'published'
  }
];

// 인사이트 데이터 모킹
export const mockThreadsInsights = {
  reach: 2500,
  impressions: 3200,
  profile_views: 150,
  total_interactions: 68,
  engagement_rate: 2.1,
  top_posts: [mockThreadsMedia],
  audience_demographics: {
    age_ranges: [
      { range: '18-24', percentage: 25 },
      { range: '25-34', percentage: 45 },
      { range: '35-44', percentage: 20 },
      { range: '45+', percentage: 10 }
    ],
    top_countries: [
      { country: 'US', percentage: 40 },
      { country: 'KR', percentage: 35 },
      { country: 'JP', percentage: 15 },
      { country: 'Others', percentage: 10 }
    ]
  }
};