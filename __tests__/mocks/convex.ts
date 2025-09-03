/**
 * Convex 관련 모킹 유틸리티
 * 데이터베이스 쿼리와 뮤테이션을 모킹합니다.
 */

import { vi } from 'vitest';

// Convex 클라이언트 모킹
export const mockConvexClient = {
  query: vi.fn(),
  mutation: vi.fn(),
  action: vi.fn(),
};

// useQuery 훅 모킹
export const mockUseQuery = vi.fn();

// useMutation 훅 모킹  
export const mockUseMutation = vi.fn();

// useAction 훅 모킹
export const mockUseAction = vi.fn();

// 일반적인 Convex 응답 패턴들
export const mockConvexSuccess = <T>(data: T) => ({
  success: true,
  data,
  error: null,
});

export const mockConvexError = (message: string) => ({
  success: false,
  data: null,
  error: { message },
});

// Convex 쿼리 결과 모킹 헬퍼
export const mockQueryResult = <T>(data: T | undefined, isLoading = false) => {
  if (isLoading) {
    return undefined;
  }
  return data;
};

// Convex 뮤테이션 결과 모킹 헬퍼
export const mockMutationResult = <T>(
  fn: () => Promise<T>,
  isLoading = false
) => {
  return {
    mutate: fn,
    isLoading,
  };
};

// 페이지네이션 결과 모킹
export const mockPaginatedResult = <T>(
  items: T[],
  hasMore = false,
  continueCursor?: string
) => ({
  items,
  hasMore,
  continueCursor,
});

// Convex ID 생성 모킹
export const generateMockId = (prefix: string = 'test') => 
  `${prefix}_${Math.random().toString(36).substring(2, 15)}`;

// 데이터베이스 테이블별 기본 모킹 데이터
export const mockConvexData = {
  personas: [],
  socialPosts: [],
  postVariants: [],
  socialAccounts: [],
  scheduledPosts: [],
  aiGenerations: [],
  credits: [],
  usageRecords: [],
};