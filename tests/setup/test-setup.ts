// 테스트 환경 전역 설정
import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

// jest-axe matcher 추가
expect.extend(toHaveNoViolations);

// Testing Library 자동 정리
afterEach(() => {
  cleanup();
});

// Global test setup
beforeAll(() => {
  // Mock implementations for browser APIs
  
  // IntersectionObserver Mock
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // ResizeObserver Mock
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // matchMedia Mock
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });

  // scrollTo Mock
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: () => {},
  });

  // getComputedStyle Mock (기본값)
  Object.defineProperty(window, 'getComputedStyle', {
    writable: true,
    value: (element: Element) => ({
      fontSize: '16px',
      height: '32px',
      minHeight: '32px',
      opacity: '1',
      visibility: 'visible',
      getPropertyValue: (property: string) => {
        const defaults: Record<string, string> = {
          'font-size': '16px',
          'height': '32px',
          'min-height': '32px',
          'opacity': '1',
          'visibility': 'visible',
        };
        return defaults[property] || '';
      },
    }),
  });

  // performance Mock
  if (!global.performance) {
    global.performance = {
      now: () => Date.now(),
      mark: () => {},
      measure: () => {},
      getEntriesByType: () => [],
      getEntriesByName: () => [],
    } as any;
  }

  // crypto Mock
  if (!global.crypto) {
    global.crypto = {
      getRandomValues: (arr: any) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    } as any;
  }
});

// Global test teardown
afterAll(() => {
  // Clean up any global state if needed
});

// Error handling for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Suppress console errors/warnings in tests unless explicitly testing them
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    // Allow console.error in tests that explicitly test error handling
    if (expect.getState().currentTestName?.includes('error') || 
        expect.getState().currentTestName?.includes('오류')) {
      originalConsoleError(...args);
    }
    // Otherwise suppress to keep test output clean
  };

  console.warn = (...args: any[]) => {
    // Allow console.warn in tests that explicitly test warning handling
    if (expect.getState().currentTestName?.includes('warn') || 
        expect.getState().currentTestName?.includes('경고')) {
      originalConsoleWarn(...args);
    }
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Custom test utilities
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockTimers = () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });
};

// Test data factories
export const createMockUser = (overrides?: Partial<any>) => ({
  _id: 'test-user-id',
  email: 'test@example.com',
  externalId: 'external-test-id',
  firstName: '테스트',
  lastName: '사용자',
  imageUrl: null,
  isActive: true,
  lastSignInAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockSocialAccount = (overrides?: Partial<any>) => ({
  _id: 'test-social-account-id',
  userId: 'test-user-id',
  platform: 'twitter',
  accountId: 'twitter_123',
  username: 'testuser',
  displayName: '테스트 사용자',
  profileImage: 'https://example.com/profile.jpg',
  accessToken: 'encrypted_access_token',
  refreshToken: 'encrypted_refresh_token',
  tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  followers: 1000,
  following: 500,
  postsCount: 100,
  verificationStatus: 'verified',
  isActive: true,
  lastSyncedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockSocialPost = (overrides?: Partial<any>) => ({
  _id: 'test-social-post-id',
  userId: 'test-user-id',
  originalContent: '테스트 게시물 내용',
  finalContent: '테스트 게시물 내용',
  status: 'draft',
  platforms: ['twitter'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockPostVariant = (overrides?: Partial<any>) => ({
  _id: 'test-variant-id',
  postId: 'test-social-post-id',
  content: 'AI 생성 변형 내용',
  overallScore: 85,
  scoreBreakdown: {
    engagement: 90,
    virality: 80,
    personaMatch: 85,
    readability: 88,
    trending: 82,
  },
  isSelected: false,
  aiModel: 'gpt-4',
  promptUsed: '매력적인 게시물 생성',
  creditsUsed: 5,
  generatedAt: new Date().toISOString(),
  ...overrides,
});

// Test assertion helpers
export const expectNoConsoleErrors = () => {
  expect(console.error).not.toHaveBeenCalled();
};

export const expectNoConsoleWarnings = () => {
  expect(console.warn).not.toHaveBeenCalled();
};

// Accessibility test helpers
export const expectAccessibleName = (element: HTMLElement, expectedName?: string) => {
  const accessibleName = element.getAttribute('aria-label') ||
                         element.getAttribute('aria-labelledby') ||
                         element.textContent ||
                         element.getAttribute('title');
  
  expect(accessibleName).toBeTruthy();
  if (expectedName) {
    expect(accessibleName).toBe(expectedName);
  }
};

export const expectFocusable = (element: HTMLElement) => {
  const isFocusable = element.tabIndex >= 0 ||
                     ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(element.tagName) ||
                     element.getAttribute('role') === 'button';
  
  expect(isFocusable).toBe(true);
};

// Performance test helpers
export const measureRenderPerformance = (renderFn: () => void): number => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

// Network simulation helpers
export const simulateNetworkError = () => {
  throw new Error('Network request failed');
};

export const simulateTimeout = () => {
  return new Promise(() => {
    // Promise that never resolves (timeout simulation)
  });
};

// DOM manipulation helpers
export const createMockClipboard = (shouldFail = false) => {
  return {
    writeText: vi.fn().mockImplementation(() => {
      if (shouldFail) {
        return Promise.reject(new Error('Clipboard access denied'));
      }
      return Promise.resolve();
    }),
  };
};

export const createMockIntersectionObserver = (isIntersecting = true) => {
  const mockObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Simulate intersection
  const mockEntry = {
    isIntersecting,
    target: {},
    boundingClientRect: {},
    intersectionRatio: isIntersecting ? 1 : 0,
    intersectionRect: {},
    rootBounds: {},
    time: Date.now(),
  };

  return { mockObserver, mockEntry };
};

// Convex 테스트를 위한 Mock 구현
class MockConvexTestingHelper {
  private mockData: Map<string, any> = new Map();
  private queryMocks: Map<string, vi.MockedFunction<any>> = new Map();
  private mutationMocks: Map<string, vi.MockedFunction<any>> = new Map();

  // Query Mock 생성
  query(functionName: string) {
    if (!this.queryMocks.has(functionName)) {
      this.queryMocks.set(functionName, vi.fn());
    }
    return this.queryMocks.get(functionName);
  }

  // Mutation Mock 생성
  mutation(functionName: string) {
    if (!this.mutationMocks.has(functionName)) {
      this.mutationMocks.set(functionName, vi.fn());
    }
    return this.mutationMocks.get(functionName);
  }

  // Action Mock 생성
  action(functionName: string) {
    return vi.fn();
  }

  // Mock 데이터 설정
  setMockData(key: string, data: any) {
    this.mockData.set(key, data);
  }

  // Mock 데이터 조회
  getMockData(key: string) {
    return this.mockData.get(key);
  }

  // 모든 Mock 초기화
  resetMocks() {
    this.mockData.clear();
    this.queryMocks.clear();
    this.mutationMocks.clear();
  }
}

// Convex 관련 Mock 설정 - convex/testing은 존재하지 않으므로 주석 처리
// vi.mock('convex/testing', () => ({
//   ConvexTestingHelper: MockConvexTestingHelper,
// }));

// Convex React Hook Mock
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useAction: vi.fn(),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
  ConvexReactClient: vi.fn().mockImplementation(() => ({
    query: vi.fn(),
    mutation: vi.fn(),
    action: vi.fn(),
  })),
}));

// Clerk Auth Mock
vi.mock('@clerk/nextjs', () => ({
  useAuth: vi.fn(() => ({
    userId: 'test-user-id',
    isSignedIn: true,
    isLoaded: true,
  })),
  useUser: vi.fn(() => ({
    user: {
      id: 'test-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    },
    isLoaded: true,
  })),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// 전역으로 사용할 테스트 헬퍼 내보내기
export { MockConvexTestingHelper };