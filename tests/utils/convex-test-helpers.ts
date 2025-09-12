/**
 * Convex 테스트 헬퍼 유틸리티
 * Convex 함수와 데이터베이스 작업을 테스트하기 위한 유틸리티
 */

import { vi } from 'vitest';
import { ConvexTestingHelper } from 'convex/testing';

/**
 * Convex Mock Context 생성
 */
export const createMockConvexContext = () => {
  const mockDb = {
    query: vi.fn(),
    insert: vi.fn(),
    patch: vi.fn(),
    replace: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
    system: {
      query: vi.fn(),
    },
  };

  const mockAuth = {
    getUserIdentity: vi.fn(),
    getUserToken: vi.fn(),
  };

  const mockScheduler = {
    runAfter: vi.fn(),
    runAt: vi.fn(),
    cancel: vi.fn(),
  };

  const mockStorage = {
    getUrl: vi.fn(),
    store: vi.fn(),
    delete: vi.fn(),
  };

  return {
    db: mockDb,
    auth: mockAuth,
    scheduler: mockScheduler,
    storage: mockStorage,
  };
};

/**
 * Convex 쿼리 결과 Mock 생성
 */
export const createMockQueryResult = <T>(data: T[], options: {
  first?: () => T | null;
  unique?: () => T | null;
  collect?: () => T[];
  take?: (n: number) => T[];
} = {}) => {
  const result = {
    [Symbol.asyncIterator]: async function* () {
      for (const item of data) {
        yield item;
      }
    },
    first: options.first || (() => data[0] || null),
    unique: options.unique || (() => data.length === 1 ? data[0] : null),
    collect: options.collect || (() => data),
    take: options.take || ((n: number) => data.slice(0, n)),
  };
  
  return result;
};

/**
 * 인증된 사용자 Mock 생성
 */
export const createMockUser = (overrides: any = {}) => ({
  tokenIdentifier: 'test-token-id',
  subject: 'user_test123',
  name: 'Test User',
  email: 'test@example.com',
  pictureUrl: 'https://example.com/picture.jpg',
  ...overrides,
});

/**
 * 인증되지 않은 사용자 시뮬레이션
 */
export const mockUnauthenticatedUser = () => null;

/**
 * Convex 함수 테스트 래퍼
 */
export const testConvexFunction = async <TArgs extends any[], TResult>(
  fn: (...args: any[]) => Promise<TResult>,
  args: TArgs,
  mockContext: ReturnType<typeof createMockConvexContext>
): Promise<TResult> => {
  // 함수에 Mock 컨텍스트 바인딩
  const boundFn = fn.bind(null, mockContext);
  return await boundFn(...args);
};

/**
 * 데이터베이스 작업 Mock 설정
 */
export const setupDatabaseMocks = (mockCtx: ReturnType<typeof createMockConvexContext>) => {
  const setupQueryMock = <T>(table: string, data: T[]) => {
    mockCtx.db.query.mockImplementation((tableName: string) => {
      if (tableName === table) {
        return {
          filter: vi.fn().mockReturnThis(),
          withIndex: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          take: vi.fn().mockReturnThis(),
          collect: vi.fn().mockResolvedValue(data),
          first: vi.fn().mockResolvedValue(data[0] || null),
          unique: vi.fn().mockResolvedValue(data.length === 1 ? data[0] : null),
        };
      }
      return createMockQueryResult([]);
    });
  };

  const setupInsertMock = <T>(table: string, insertedData: T) => {
    mockCtx.db.insert.mockImplementation((tableName: string, data: any) => {
      if (tableName === table) {
        return Promise.resolve(insertedData);
      }
      return Promise.resolve('mock-id');
    });
  };

  const setupPatchMock = (table: string) => {
    mockCtx.db.patch.mockImplementation((id: any, updates: any) => {
      return Promise.resolve();
    });
  };

  const setupDeleteMock = (table: string) => {
    mockCtx.db.delete.mockImplementation((id: any) => {
      return Promise.resolve();
    });
  };

  return {
    setupQueryMock,
    setupInsertMock,
    setupPatchMock,
    setupDeleteMock,
  };
};

/**
 * 인증 Mock 설정
 */
export const setupAuthMocks = (mockCtx: ReturnType<typeof createMockConvexContext>) => {
  const mockAuthenticatedUser = (user: ReturnType<typeof createMockUser>) => {
    mockCtx.auth.getUserIdentity.mockResolvedValue(user);
    mockCtx.auth.getUserToken.mockResolvedValue('mock-jwt-token');
  };

  const mockUnauthenticatedUser = () => {
    mockCtx.auth.getUserIdentity.mockResolvedValue(null);
    mockCtx.auth.getUserToken.mockResolvedValue(null);
  };

  return {
    mockAuthenticatedUser,
    mockUnauthenticatedUser,
  };
};

/**
 * 스케줄러 Mock 설정
 */
export const setupSchedulerMocks = (mockCtx: ReturnType<typeof createMockConvexContext>) => {
  const mockScheduledJob = (jobId: string = 'mock-job-id') => {
    mockCtx.scheduler.runAfter.mockResolvedValue(jobId);
    mockCtx.scheduler.runAt.mockResolvedValue(jobId);
    mockCtx.scheduler.cancel.mockResolvedValue();
  };

  return {
    mockScheduledJob,
  };
};

/**
 * 스토리지 Mock 설정
 */
export const setupStorageMocks = (mockCtx: ReturnType<typeof createMockConvexContext>) => {
  const mockFileUpload = (storageId: string = 'mock-storage-id') => {
    mockCtx.storage.store.mockResolvedValue(storageId);
    mockCtx.storage.getUrl.mockResolvedValue(`https://example.com/files/${storageId}`);
    mockCtx.storage.delete.mockResolvedValue();
  };

  return {
    mockFileUpload,
  };
};

/**
 * Convex 에러 Mock
 */
export const ConvexError = {
  /**
   * 일반 Convex 에러
   */
  generic: (message: string) => new Error(`ConvexError: ${message}`),
  
  /**
   * 인증 에러
   */
  unauthenticated: (message: string = 'User not authenticated') => 
    new Error(`ConvexError: ${message}`),
  
  /**
   * 권한 에러
   */
  unauthorized: (message: string = 'User not authorized') => 
    new Error(`ConvexError: ${message}`),
  
  /**
   * 데이터 검증 에러
   */
  validation: (message: string) => 
    new Error(`ConvexError: Validation failed - ${message}`),
  
  /**
   * 리소스 없음 에러
   */
  notFound: (resource: string) => 
    new Error(`ConvexError: ${resource} not found`),
};

/**
 * 테스트 데이터 정리 헬퍼
 */
export const cleanupTestData = async (mockCtx: ReturnType<typeof createMockConvexContext>) => {
  // Mock 함수들 초기화
  Object.values(mockCtx.db).forEach(mockFn => {
    if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
      mockFn.mockReset();
    }
  });
  
  Object.values(mockCtx.auth).forEach(mockFn => {
    if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
      mockFn.mockReset();
    }
  });
  
  Object.values(mockCtx.scheduler).forEach(mockFn => {
    if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
      mockFn.mockReset();
    }
  });
  
  Object.values(mockCtx.storage).forEach(mockFn => {
    if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
      mockFn.mockReset();
    }
  });
};

/**
 * 테스트 시간 Mock 헬퍼
 */
export const timeHelpers = {
  /**
   * 현재 시간 Mock
   */
  mockNow: (timestamp: number) => {
    vi.spyOn(Date, 'now').mockReturnValue(timestamp);
  },
  
  /**
   * 특정 날짜로 시간 Mock
   */
  mockDate: (date: Date) => {
    vi.spyOn(global, 'Date').mockImplementation(() => date as any);
  },
  
  /**
   * 시간 Mock 정리
   */
  restoreTime: () => {
    vi.restoreAllMocks();
  },
};