/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare global {
  namespace Vi {
    interface JestAssertion<T = any>
      extends jest.Matchers<void, T>,
        TestingLibraryMatchers<T, void> {}
  }
}

// Convex Mock 타입 정의
declare module 'convex/testing' {
  export class ConvexTestingHelper {
    query(functionName: string): jest.MockedFunction<any>;
    mutation(functionName: string): jest.MockedFunction<any>;
    action(functionName: string): jest.MockedFunction<any>;
    setMockData(key: string, data: any): void;
    getMockData(key: string): any;
    resetMocks(): void;
  }
}

// React 타입 확장
declare global {
  namespace React {
    interface ReactNode {}
  }
}