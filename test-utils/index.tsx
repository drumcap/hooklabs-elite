import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { vi } from 'vitest'

// Mock providers for testing
const MockClerkProvider = ({ children }: { children: ReactNode }) => <div data-testid="clerk-provider">{children}</div>
const MockConvexProvider = ({ children }: { children: ReactNode }) => <div data-testid="convex-provider">{children}</div>
const MockThemeProvider = ({ children }: { children: ReactNode }) => <div data-testid="theme-provider">{children}</div>

// 테스트용 Provider 래퍼
interface TestProvidersProps {
  children: ReactNode
}

function TestProviders({ children }: TestProvidersProps) {
  return (
    <MockClerkProvider>
      <MockConvexProvider>
        <MockThemeProvider>
          {children}
        </MockThemeProvider>
      </MockConvexProvider>
    </MockClerkProvider>
  )
}

// 커스텀 렌더 함수
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }