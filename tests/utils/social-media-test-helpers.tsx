/**
 * 소셜 미디어 고급 기능 전용 테스트 헬퍼 유틸리티
 * Mock Service Worker 설정, 성능 측정, 접근성 테스트 도구
 */

import { vi } from 'vitest';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { createSocialMediaDataSet } from '../fixtures/social-media-advanced';

// MSW 핸들러 타입
interface MSWHandler {
  method: string;
  path: string;
  response: any;
  status?: number;
  delay?: number;
}

/**
 * Mock Service Worker 핸들러 생성
 */
export const createMSWHandlers = (handlers: MSWHandler[]) => {
  return handlers.map(({ method, path, response, status = 200, delay = 0 }) => {
    const mockHandler = vi.fn();
    
    mockHandler.mockImplementation(async () => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      return {
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response)),
      };
    });

    return {
      [method.toLowerCase()]: {
        [path]: mockHandler
      }
    };
  });
};

/**
 * 소셜 미디어 API Mock 핸들러들
 */
export const socialMediaApiHandlers = {
  // 토큰 만료 관리
  getExpiringTokens: (tokens: any[] = []) => ({
    method: 'GET',
    path: '/api/social-accounts/expiring-tokens',
    response: { data: tokens }
  }),

  updateTokens: (accountId: string, success: boolean = true) => ({
    method: 'PUT',
    path: `/api/social-accounts/${accountId}/tokens`,
    response: success 
      ? { success: true, accountId }
      : { error: 'Token update failed' },
    status: success ? 200 : 400
  }),

  getAccountStats: (accountId: string, stats: any) => ({
    method: 'GET',
    path: `/api/social-accounts/${accountId}/stats`,
    response: { data: stats }
  }),

  // A/B 테스트
  getPostVariants: (postId: string, variants: any[]) => ({
    method: 'GET',
    path: `/api/posts/${postId}/variants`,
    response: { data: variants }
  }),

  selectVariant: (variantId: string, success: boolean = true) => ({
    method: 'POST',
    path: `/api/posts/variants/${variantId}/select`,
    response: success 
      ? { success: true, variantId }
      : { error: 'Selection failed' },
    status: success ? 200 : 400
  }),

  // AI 생성 이력
  getAiGenerations: (generations: any[], pagination: any = {}) => ({
    method: 'GET',
    path: '/api/ai-generations',
    response: { 
      data: {
        page: generations,
        isDone: pagination.isDone || true,
        continueCursor: pagination.continueCursor || null
      }
    }
  }),

  createAiGeneration: (success: boolean = true, delay: number = 1000) => ({
    method: 'POST',
    path: '/api/ai-generations',
    response: success 
      ? { success: true, generationId: 'gen123' }
      : { error: 'Generation failed' },
    status: success ? 200 : 500,
    delay
  }),

  // 분석 대시보드
  getDashboardStats: (stats: any) => ({
    method: 'GET',
    path: '/api/analytics/dashboard',
    response: { data: stats }
  }),

  getAnalyticsOverview: (overview: any) => ({
    method: 'GET',
    path: '/api/analytics/overview',
    response: { data: overview }
  }),

  getEngagementData: (engagement: any) => ({
    method: 'GET',
    path: '/api/analytics/engagement',
    response: { data: engagement }
  }),
};

/**
 * 성능 측정 유틸리티
 */
export class PerformanceProfiler {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();

  start(name: string): void {
    this.marks.set(name, performance.now());
  }

  end(name: string): number {
    const startTime = this.marks.get(name);
    if (!startTime) {
      throw new Error(`Performance mark '${name}' not found`);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    this.measures.set(name, duration);
    
    return duration;
  }

  getMeasure(name: string): number | undefined {
    return this.measures.get(name);
  }

  getAllMeasures(): Record<string, number> {
    return Object.fromEntries(this.measures);
  }

  reset(): void {
    this.marks.clear();
    this.measures.clear();
  }

  // 성능 임계값 검증
  assertPerformance(name: string, maxDuration: number): void {
    const duration = this.measures.get(name);
    if (duration === undefined) {
      throw new Error(`No performance measure found for '${name}'`);
    }

    if (duration > maxDuration) {
      throw new Error(
        `Performance test failed: ${name} took ${duration}ms, expected < ${maxDuration}ms`
      );
    }
  }
}

/**
 * 접근성 테스트 유틸리티
 */
export class AccessibilityTester {
  // ARIA 라벨 검증
  static validateAriaLabels(element: HTMLElement): string[] {
    const issues: string[] = [];
    
    // 버튼에 접근 가능한 이름이 있는지 확인
    const buttons = element.querySelectorAll('button');
    buttons.forEach((button, index) => {
      const hasLabel = button.getAttribute('aria-label') || 
                      button.getAttribute('aria-labelledby') ||
                      button.textContent?.trim();
      
      if (!hasLabel) {
        issues.push(`Button ${index + 1} is missing accessible name`);
      }
    });

    // 입력 필드에 라벨이 있는지 확인
    const inputs = element.querySelectorAll('input, select, textarea');
    inputs.forEach((input, index) => {
      const hasLabel = input.getAttribute('aria-label') ||
                      input.getAttribute('aria-labelledby') ||
                      element.querySelector(`label[for="${input.id}"]`);
      
      if (!hasLabel) {
        issues.push(`Input ${index + 1} is missing label`);
      }
    });

    return issues;
  }

  // 키보드 네비게이션 테스트
  static async testKeyboardNavigation(element: HTMLElement): Promise<string[]> {
    const issues: string[] = [];
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // 모든 포커스 가능한 요소가 실제로 포커스될 수 있는지 확인
    for (const el of Array.from(focusableElements)) {
      try {
        (el as HTMLElement).focus();
        if (document.activeElement !== el) {
          issues.push(`Element ${el.tagName} cannot receive focus`);
        }
      } catch (error) {
        issues.push(`Error focusing element ${el.tagName}: ${error}`);
      }
    }

    return issues;
  }

  // 색상 대비 검증 (간단한 구현)
  static validateColorContrast(element: HTMLElement): string[] {
    const issues: string[] = [];
    
    // 실제 구현에서는 색상 대비 비율을 계산해야 함
    // 여기서는 CSS 클래스 기반으로 간단히 검증
    const lowContrastElements = element.querySelectorAll('.low-contrast');
    lowContrastElements.forEach((el, index) => {
      issues.push(`Element ${index + 1} may have insufficient color contrast`);
    });

    return issues;
  }

  // 종합 접근성 검증
  static async validateAccessibility(element: HTMLElement): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const allIssues = [
      ...this.validateAriaLabels(element),
      ...await this.testKeyboardNavigation(element),
      ...this.validateColorContrast(element),
    ];

    return {
      isValid: allIssues.length === 0,
      issues: allIssues,
    };
  }
}

/**
 * 커스텀 렌더 함수 (테스트 프로바이더 포함)
 */
interface CustomRenderOptions extends RenderOptions {
  withMockData?: boolean;
  mockApiHandlers?: MSWHandler[];
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { withMockData = false, mockApiHandlers = [], ...renderOptions } = options;

  // Mock 데이터 설정
  if (withMockData) {
    const testData = createSocialMediaDataSet();
    // Context Provider에 테스트 데이터 주입 (실제 구현에서)
  }

  // MSW 핸들러 설정
  if (mockApiHandlers.length > 0) {
    const handlers = createMSWHandlers(mockApiHandlers);
    // MSW 서버에 핸들러 등록 (실제 구현에서)
  }

  // 테스트 프로바이더로 래핑
  const Wrapper = ({ children }: { children: ReactNode }) => {
    return (
      <div data-testid="test-wrapper">
        {/* 실제 구현에서는 Context Providers 추가 */}
        {children}
      </div>
    );
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

/**
 * 비동기 작업 대기 헬퍼
 */
export const waitForAsyncOperation = async (
  operation: () => Promise<any>,
  timeout: number = 5000
): Promise<any> => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeout);
  });

  return Promise.race([operation(), timeoutPromise]);
};

/**
 * Mock 타이머 헬퍼
 */
export class MockTimerHelper {
  static setup(): void {
    vi.useFakeTimers();
  }

  static teardown(): void {
    vi.useRealTimers();
  }

  static async advance(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    // 다음 틱까지 대기
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  static async advanceToNext(): Promise<void> {
    vi.runOnlyPendingTimers();
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

/**
 * 네트워크 에러 시뮬레이션
 */
export const simulateNetworkError = (errorType: 'timeout' | 'offline' | 'server_error' = 'server_error') => {
  switch (errorType) {
    case 'timeout':
      return {
        method: 'GET',
        path: '*',
        response: { error: 'Request timeout' },
        status: 408,
        delay: 30000, // 30초 타임아웃
      };
    
    case 'offline':
      return {
        method: 'GET',
        path: '*',
        response: { error: 'Network unavailable' },
        status: 0,
      };
    
    case 'server_error':
    default:
      return {
        method: 'GET',
        path: '*',
        response: { error: 'Internal server error' },
        status: 500,
      };
  }
};

/**
 * 대용량 데이터 생성 헬퍼
 */
export const generateLargeDataset = (size: number) => {
  const dataset = [];
  
  for (let i = 0; i < size; i++) {
    dataset.push({
      id: `item_${i}`,
      content: `Large dataset item ${i} with some content`,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      metadata: {
        index: i,
        category: `category_${i % 10}`,
        tags: [`tag${i % 5}`, `tag${(i + 1) % 5}`],
      },
    });
  }
  
  return dataset;
};

/**
 * 가상화된 목록 테스트 헬퍼
 */
export class VirtualizedListTester {
  static async testScrollPerformance(
    container: HTMLElement,
    iterations: number = 100
  ): Promise<{ averageTime: number; maxTime: number }> {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      // 스크롤 시뮬레이션
      container.scrollTop = (i * container.scrollHeight) / iterations;
      
      // 렌더링 완료 대기
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      const endTime = performance.now();
      times.push(endTime - startTime);
    }
    
    return {
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      maxTime: Math.max(...times),
    };
  }

  static testVisibleItems(container: HTMLElement): {
    totalItems: number;
    visibleItems: number;
    memoryUsage: number;
  } {
    const allItems = container.querySelectorAll('[data-testid^="list-item-"]');
    const visibleItems = Array.from(allItems).filter(item => {
      const rect = item.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });

    return {
      totalItems: allItems.length,
      visibleItems: visibleItems.length,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
    };
  }
}

/**
 * 테스트 데이터 검증 헬퍼
 */
export const validateTestData = {
  // 날짜 형식 검증
  isValidDate: (dateString: string): boolean => {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  },

  // 점수 범위 검증 (0-100)
  isValidScore: (score: number): boolean => {
    return typeof score === 'number' && score >= 0 && score <= 100;
  },

  // 이메일 형식 검증
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // 소셜 미디어 플랫폼 검증
  isValidPlatform: (platform: string): boolean => {
    const validPlatforms = ['twitter', 'linkedin', 'facebook', 'instagram'];
    return validPlatforms.includes(platform);
  },

  // AI 모델명 검증
  isValidAiModel: (model: string): boolean => {
    const validModels = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3'];
    return validModels.includes(model);
  },
};

/**
 * 테스트 리포터 (결과 수집 및 분석)
 */
export class TestReporter {
  private static results: Map<string, any> = new Map();

  static recordResult(testName: string, result: any): void {
    this.results.set(testName, {
      ...result,
      timestamp: new Date().toISOString(),
    });
  }

  static getResults(): Record<string, any> {
    return Object.fromEntries(this.results);
  }

  static generateSummary(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageExecutionTime: number;
  } {
    const results = Array.from(this.results.values());
    
    return {
      totalTests: results.length,
      passedTests: results.filter(r => r.passed).length,
      failedTests: results.filter(r => !r.passed).length,
      averageExecutionTime: results.reduce((sum, r) => sum + (r.executionTime || 0), 0) / results.length,
    };
  }

  static reset(): void {
    this.results.clear();
  }
}