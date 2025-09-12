/**
 * Vitest 전역 테스트 설정 파일
 * 테스트 실행 전에 필요한 Mock, 전역 변수, DOM 설정 등을 구성
 */

import '@testing-library/jest-dom';
import { beforeAll, afterEach, vi } from 'vitest';

// 환경 변수 Mock 설정
beforeAll(() => {
  // Convex 관련 환경 변수
  process.env.CONVEX_DEPLOYMENT = 'test-deployment';
  process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test.convex.dev';
  
  // Clerk 인증 관련 환경 변수
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mock_key';
  process.env.CLERK_SECRET_KEY = 'sk_test_mock_key';
  process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL = 'https://test-clerk-frontend.convex.dev';
  
  // Lemon Squeezy 결제 관련 환경 변수
  process.env.LEMONSQUEEZY_API_KEY = 'test_api_key';
  process.env.LEMONSQUEEZY_STORE_ID = 'test_store_id';
  process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test_webhook_secret';
  
  // Next.js 관련 환경 변수
  process.env.NODE_ENV = 'test';
});

// 각 테스트 후 Mock 정리
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// 전역 Mock 설정
global.fetch = vi.fn();

// ResizeObserver Mock (UI 테스트용)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// IntersectionObserver Mock (무한 스크롤 등 UI 테스트용)
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// matchMedia Mock (반응형 디자인 테스트용)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// localStorage Mock
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(() => null),
    removeItem: vi.fn(() => null),
    clear: vi.fn(() => null),
  },
  writable: true,
});

// sessionStorage Mock
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(() => null),
    removeItem: vi.fn(() => null),
    clear: vi.fn(() => null),
  },
  writable: true,
});

// URL.createObjectURL Mock (파일 업로드 테스트용)
global.URL.createObjectURL = vi.fn(() => 'mocked-url');
global.URL.revokeObjectURL = vi.fn();

// 콘솔 경고/에러 제거 (테스트 출력 깔끔하게)
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render is deprecated')
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render is deprecated')
  ) {
    return;
  }
  originalConsoleError(...args);
};