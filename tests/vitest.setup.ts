import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock global objects
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}))

// 환경 변수 설정
vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_mock')
vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', 'https://mock-convex.cloud')
vi.stubEnv('LEMONSQUEEZY_API_KEY', 'mock_api_key')
vi.stubEnv('LEMONSQUEEZY_STORE_ID', 'mock_store_id')

// Clerk 모듈 전체 모킹
vi.mock('@clerk/nextjs', () => ({
  ClerkProvider: vi.fn(({ children }) => children),
  useUser: vi.fn(() => ({
    user: null,
    isLoaded: true,
    isSignedIn: false
  })),
  useAuth: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: false,
    userId: null
  })),
  SignInButton: vi.fn(() => null),
  SignUpButton: vi.fn(() => null),
  UserButton: vi.fn(() => null)
}))

// Convex 모듈 모킹
vi.mock('convex/react', () => ({
  ConvexProvider: vi.fn(({ children }) => children),
  ConvexReactClient: vi.fn(() => ({})),
  useQuery: vi.fn(() => null),
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn())
}))

// Next themes 모킹
vi.mock('next-themes', () => ({
  ThemeProvider: vi.fn(({ children }) => children),
  useTheme: vi.fn(() => ({
    theme: 'light',
    setTheme: vi.fn()
  }))
}))