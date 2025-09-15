/**
 * 테스트 유틸리티 함수들
 * React Testing Library와 MSW를 위한 설정들
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { vi } from 'vitest';

// 테스트용 래퍼 컴포넌트들
interface TestWrapperProps {
  children: React.ReactNode;
}

export const TestWrapper = ({ children }: TestWrapperProps) => {
  return <div data-testid="test-wrapper">{children}</div>;
};

// 커스텀 렌더 함수
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestWrapper, ...options });

export * from '@testing-library/react';
export { customRender as render };

// 공통 테스트 유틸리티들
export const createMockUser = (overrides = {}) => ({
  _id: 'test-user-id',
  name: '테스트 사용자',
  externalId: 'clerk-user-id',
  lemonSqueezyCustomerId: 'ls-customer-id',
  ...overrides,
});

export const createMockPersona = (overrides = {}) => ({
  _id: 'test-persona-id',
  userId: 'test-user-id',
  name: 'SaaS 창업자',
  role: '스타트업 CEO',
  tone: '전문적이고 친근한',
  interests: ['스타트업', '기술', '마케팅'],
  expertise: ['SaaS', '제품 개발', '비즈니스'],
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockSocialPost = (overrides = {}) => ({
  _id: 'test-post-id',
  userId: 'test-user-id',
  personaId: 'test-persona-id',
  originalContent: '오늘 새로운 기능을 출시했습니다!',
  finalContent: '🚀 오늘 새로운 기능을 출시했습니다! 사용자 경험을 한 단계 업그레이드했어요.',
  platforms: ['twitter', 'threads'],
  status: 'draft',
  hashtags: ['#스타트업', '#제품출시'],
  creditsUsed: 5,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockPostVariant = (overrides = {}) => ({
  _id: 'test-variant-id',
  postId: 'test-post-id',
  content: '🎉 새로운 기능을 공개합니다! 더 나은 사용자 경험을 위한 혁신적인 업데이트입니다.',
  overallScore: 85,
  scoreBreakdown: {
    engagement: 90,
    virality: 80,
    personaMatch: 85,
    readability: 88,
    trending: 82,
  },
  isSelected: false,
  aiModel: 'gemini-1.5-pro',
  promptUsed: '페르소나에 맞는 흥미로운 게시물 생성',
  creditsUsed: 3,
  generatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockSocialAccount = (overrides = {}) => ({
  _id: 'test-account-id',
  userId: 'test-user-id',
  platform: 'twitter',
  accountId: 'twitter-account-id',
  username: 'test_user',
  displayName: '테스트 사용자',
  accessToken: 'mock-access-token',
  followers: 1500,
  following: 300,
  postsCount: 150,
  isActive: true,
  lastSyncedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockScheduledPost = (overrides = {}) => ({
  _id: 'test-scheduled-id',
  postId: 'test-post-id',
  platform: 'twitter',
  socialAccountId: 'test-account-id',
  scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 내일
  status: 'pending',
  retryCount: 0,
  maxRetries: 3,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockAIGeneration = (overrides = {}) => ({
  _id: 'test-generation-id',
  userId: 'test-user-id',
  postId: 'test-post-id',
  personaId: 'test-persona-id',
  type: 'content_generation',
  prompt: '흥미로운 소셜 미디어 게시물을 생성해주세요',
  response: '생성된 콘텐츠입니다.',
  model: 'gemini-1.5-pro',
  creditsUsed: 5,
  generationTime: 2500,
  inputTokens: 150,
  outputTokens: 200,
  temperature: 0.7,
  success: true,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// 날짜 관련 유틸리티
export const mockDateNow = (date: Date) => {
  const spy = vi.spyOn(Date, 'now');
  spy.mockReturnValue(date.getTime());
  return spy;
};

// API 응답 모킹 유틸리티
export const mockApiResponse = <T,>(data: T, delay = 0) => {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

export const mockApiError = (message: string, status = 500, delay = 0) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error(message);
      (error as any).status = status;
      reject(error);
    }, delay);
  });
};

// 크레딧 계산 관련 유틸리티
export const calculateExpectedCredits = (
  type: 'content_generation' | 'variant_creation' | 'optimization' | 'analysis',
  variantCount = 1
) => {
  const baseCosts = {
    content_generation: 5,
    variant_creation: 3,
    optimization: 2,
    analysis: 1,
  };
  
  return baseCosts[type] * variantCount;
};

// 점수 검증 유틸리티
export const validateScoreRange = (score: number, min = 0, max = 100) => {
  return score >= min && score <= max;
};

export const validateScoreBreakdown = (breakdown: any) => {
  const requiredFields = ['engagement', 'virality', 'personaMatch', 'readability', 'trending'];
  return requiredFields.every(field => 
    field in breakdown && 
    validateScoreRange(breakdown[field])
  );
};

// 테스트 환경 설정 헬퍼
export const setupTestEnvironment = () => {
  // 환경 변수 모킹
  process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test-convex-url.convex.cloud';
  process.env.CONVEX_DEPLOYMENT = 'test-deployment';
  
  // console 메서드 모킹 (필요시)
  global.console = {
    ...console,
    warn: vi.fn(),
    error: vi.fn(),
  };
};

// 클린업 헬퍼
export const cleanupTestEnvironment = () => {
  vi.restoreAllMocks();
};