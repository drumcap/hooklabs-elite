/**
 * 테스트 헬퍼 유틸리티
 * 공통적으로 사용되는 테스트 유틸리티 함수들
 */

import { vi } from 'vitest';

/**
 * 비동기 함수 실행 대기 헬퍼
 * @param ms 대기할 시간(밀리초)
 */
export const wait = (ms: number = 0) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 랜덤 문자열 생성
 * @param length 문자열 길이 (기본: 10)
 * @param prefix 접두사 (선택)
 */
export const generateRandomString = (length: number = 10, prefix?: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix ? `${prefix}_` : '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

/**
 * 랜덤 이메일 생성
 * @param domain 도메인 (기본: 'test.com')
 */
export const generateRandomEmail = (domain: string = 'test.com'): string => {
  const username = generateRandomString(8);
  return `${username}@${domain}`;
};

/**
 * 랜덤 날짜 생성
 * @param start 시작 날짜 (기본: 1년 전)
 * @param end 종료 날짜 (기본: 현재)
 */
export const generateRandomDate = (
  start: Date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  end: Date = new Date()
): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

/**
 * Mock Promise 생성
 * @param value 반환할 값
 * @param delay 지연 시간 (선택)
 */
export const createMockPromise = <T>(value: T, delay?: number): Promise<T> => {
  return new Promise(resolve => {
    if (delay) {
      setTimeout(() => resolve(value), delay);
    } else {
      resolve(value);
    }
  });
};

/**
 * Mock Error Promise 생성
 * @param error 에러 객체 또는 메시지
 * @param delay 지연 시간 (선택)
 */
export const createMockErrorPromise = (
  error: Error | string,
  delay?: number
): Promise<never> => {
  return new Promise((_, reject) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    if (delay) {
      setTimeout(() => reject(errorObj), delay);
    } else {
      reject(errorObj);
    }
  });
};

/**
 * 깊은 객체 비교 (테스트용)
 */
export const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false;
};

/**
 * Mock 함수 호출 검증 헬퍼
 */
export const expectMockToHaveBeenCalledWith = (
  mockFn: ReturnType<typeof vi.fn>,
  ...args: any[]
) => {
  expect(mockFn).toHaveBeenCalledWith(...args);
};

/**
 * Mock 함수 호출 횟수 검증 헬퍼
 */
export const expectMockToHaveBeenCalledTimes = (
  mockFn: ReturnType<typeof vi.fn>,
  times: number
) => {
  expect(mockFn).toHaveBeenCalledTimes(times);
};

/**
 * 테스트 컨텍스트 생성기
 */
export const createTestContext = <T extends Record<string, any>>(
  initialContext: Partial<T> = {}
): T & { reset: () => void } => {
  const context = { ...initialContext } as T & { reset: () => void };
  const initial = { ...initialContext };
  
  context.reset = () => {
    // 모든 속성 제거 후 초기값으로 재설정
    Object.keys(context).forEach(key => {
      if (key !== 'reset') {
        delete (context as any)[key];
      }
    });
    Object.assign(context, initial);
  };
  
  return context;
};

/**
 * DOM 요소 테스트 헬퍼
 */
export const domHelpers = {
  /**
   * 요소가 화면에 보이는지 확인
   */
  isVisible: (element: HTMLElement): boolean => {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  },
  
  /**
   * 요소의 텍스트 내용 가져오기 (공백 제거)
   */
  getTextContent: (element: HTMLElement): string => {
    return element.textContent?.trim() || '';
  },
  
  /**
   * 요소의 특정 클래스 존재 확인
   */
  hasClass: (element: HTMLElement, className: string): boolean => {
    return element.classList.contains(className);
  },
};

/**
 * API 응답 Mock 생성기
 */
export const createApiResponse = <T>(
  data: T,
  options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {}
): Response => {
  const { status = 200, statusText = 'OK', headers = {} } = options;
  
  return new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
};

/**
 * 에러 응답 Mock 생성기
 */
export const createErrorResponse = (
  message: string,
  status: number = 500
): Response => {
  return new Response(JSON.stringify({ error: message }), {
    status,
    statusText: 'Internal Server Error',
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

/**
 * 로컬스토리지 Mock 헬퍼
 */
export const localStorageHelpers = {
  /**
   * 로컬스토리지 Mock 설정
   */
  setup: () => {
    const store: Record<string, string> = {};
    
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(key => store[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      store[key] = value;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(key => {
      delete store[key];
    });
    vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {
      Object.keys(store).forEach(key => delete store[key]);
    });
    
    return store;
  },
  
  /**
   * 로컬스토리지 Mock 정리
   */
  cleanup: () => {
    vi.restoreAllMocks();
  },
};