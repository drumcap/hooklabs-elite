// Convex 모킹
import { vi } from 'vitest'

// Mock Convex database context
export const createMockContext = () => {
  const mockData = new Map()
  
  return {
    db: {
      query: vi.fn().mockImplementation((table: string) => ({
        withIndex: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        unique: vi.fn().mockResolvedValue(null),
        collect: vi.fn().mockResolvedValue([]),
        take: vi.fn().mockResolvedValue([]),
        order: vi.fn().mockReturnThis(),
      })),
      insert: vi.fn().mockResolvedValue('mock_id'),
      patch: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
    },
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue({
        subject: 'user_test123',
        email: 'test@example.com',
      }),
    },
  }
}

// Mock query and mutation builders
export const mockQuery = vi.fn()
export const mockMutation = vi.fn()

// Export mocks
export const query = mockQuery
export const mutation = mockMutation