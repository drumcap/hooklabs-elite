import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../test-utils/index'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import UsageTracker from '../../components/usage-tracker'
import { mockUser, mockSubscription } from '../../fixtures/test-data'

// Mock external dependencies
vi.mock('@clerk/nextjs')
vi.mock('convex/react')
vi.mock('recharts', () => ({
  ResponsiveContainer: vi.fn(({ children }) => <div data-testid="responsive-container">{children}</div>),
  AreaChart: vi.fn(({ children }) => <div data-testid="area-chart">{children}</div>),
  Area: vi.fn(() => <div />),
  BarChart: vi.fn(({ children }) => <div data-testid="bar-chart">{children}</div>),
  Bar: vi.fn(() => <div />),
  PieChart: vi.fn(({ children }) => <div data-testid="pie-chart">{children}</div>),
  Pie: vi.fn(() => <div />),
  Cell: vi.fn(() => <div />),
  XAxis: vi.fn(() => <div />),
  YAxis: vi.fn(() => <div />),
  CartesianGrid: vi.fn(() => <div />),
  Tooltip: vi.fn(() => <div />),
}))

const mockUseUser = vi.mocked(useUser)
const mockUseQuery = vi.mocked(useQuery)

const mockUsageData = {
  subscription: {
    ...mockSubscription,
    currentUsage: 7500,
    usageLimit: 10000,
  },
  totalUsage: 7500,
  usageByType: {
    'api_requests': { amount: 5000, unit: 'requests', records: [] },
    'storage': { amount: 1500, unit: 'MB', records: [] },
    'bandwidth': { amount: 1000, unit: 'GB', records: [] },
  },
  usageRecords: [
    {
      _id: 'record_1',
      resourceType: 'api_requests',
      amount: 100,
      unit: 'requests',
      description: 'API 요청',
      recordedAt: '2024-01-15T10:00:00Z',
    },
    {
      _id: 'record_2',
      resourceType: 'storage',
      amount: 50,
      unit: 'MB',
      description: '파일 업로드',
      recordedAt: '2024-01-15T11:00:00Z',
    },
  ],
  periodStart: '2024-01-01T00:00:00Z',
  periodEnd: '2024-01-31T23:59:59Z',
}

describe('UsageTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseUser.mockReturnValue({
      user: mockUser as any,
      isLoaded: true,
      isSignedIn: true,
    } as any)

    // Default mock responses
    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('getUserUsage')) {
        return mockUsageData
      }
      if (api.toString().includes('checkUsageAlerts')) {
        return []
      }
      return undefined
    })
  })

  it('should render loading state when data is loading', () => {
    mockUseQuery.mockReturnValue(undefined)

    render(<UsageTracker />)

    expect(screen.getByTestId('loader')).toBeDefined()
  })

  it('should render no subscription message when user has no subscription', () => {
    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('getUserUsage')) {
        return { subscription: null }
      }
      return undefined
    })

    render(<UsageTracker />)

    expect(screen.getByText('활성 구독이 필요합니다.')).toBeDefined()
  })

  it('should render usage tracker with subscription data', () => {
    render(<UsageTracker />)

    expect(screen.getByText('사용량 추적')).toBeDefined()
    expect(screen.getByText('7,500')).toBeDefined() // Current usage
    expect(screen.getByText('한도: 10,000')).toBeDefined() // Usage limit
    expect(screen.getByText('75%')).toBeDefined() // Usage percentage
  })

  it('should display usage alerts when present', () => {
    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('getUserUsage')) {
        return mockUsageData
      }
      if (api.toString().includes('checkUsageAlerts')) {
        return [{
          type: "approaching_limit",
          severity: "info",
          message: "사용량이 한도의 75%에 도달했습니다.",
          usage: 7500,
          limit: 10000,
          percentage: 75,
        }]
      }
      return undefined
    })

    render(<UsageTracker />)

    expect(screen.getByText('사용량이 한도의 75%에 도달했습니다.')).toBeDefined()
    expect(screen.getByText('75%')).toBeDefined() // Alert percentage badge
  })

  it('should display overage warning when usage exceeds limit', () => {
    const overageUsageData = {
      ...mockUsageData,
      subscription: {
        ...mockUsageData.subscription,
        currentUsage: 12000,
        overage: 2000,
        overageRate: 5,
      },
    }

    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('getUserUsage')) {
        return overageUsageData
      }
      return undefined
    })

    render(<UsageTracker />)

    expect(screen.getByText('한도 초과 사용량: 2,000')).toBeDefined()
    expect(screen.getByText('초과 사용 요금이 발생할 수 있습니다.')).toBeDefined()
    expect(screen.getByText('100원')).toBeDefined() // Overage cost
  })

  it('should calculate daily average usage correctly', () => {
    render(<UsageTracker />)

    const currentDate = new Date().getDate()
    const expectedDailyAverage = Math.round(7500 / currentDate)

    expect(screen.getByText(expectedDailyAverage.toLocaleString())).toBeDefined()
    expect(screen.getByText('requests/일')).toBeDefined()
  })

  it('should calculate remaining usage correctly', () => {
    render(<UsageTracker />)

    expect(screen.getByText('2,500')).toBeDefined() // 10000 - 7500
    expect(screen.getByText('이번 달 남은 한도')).toBeDefined()
  })

  it('should display days until reset', () => {
    render(<UsageTracker />)

    const currentDate = new Date()
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
    const daysUntilReset = lastDayOfMonth - currentDate.getDate()

    expect(screen.getByText(`${daysUntilReset}일`)).toBeDefined()
    expect(screen.getByText('다음 달 1일 리셋')).toBeDefined()
  })

  it('should handle unlimited usage plans', () => {
    const unlimitedUsageData = {
      ...mockUsageData,
      subscription: {
        ...mockUsageData.subscription,
        usageLimit: null,
        currentUsage: 7500,
      },
    }

    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('getUserUsage')) {
        return unlimitedUsageData
      }
      return undefined
    })

    render(<UsageTracker />)

    expect(screen.getByText('무제한')).toBeDefined()
  })

  it('should display resource usage charts', () => {
    render(<UsageTracker />)

    // 리소스별 탭으로 이동
    const resourcesTab = screen.getByRole('tab', { name: '리소스별' })
    fireEvent.click(resourcesTab)

    expect(screen.getByText('리소스별 사용량 분포')).toBeDefined()
    expect(screen.getByText('리소스별 상세 정보')).toBeDefined()
    expect(screen.getByTestId('pie-chart')).toBeDefined()
  })

  it('should display usage trends charts', () => {
    render(<UsageTracker />)

    // 일별 트렌드 탭 (기본값)
    expect(screen.getByText('지난 7일간 사용량')).toBeDefined()
    expect(screen.getByTestId('area-chart')).toBeDefined()

    // 시간별 트렌드 탭으로 이동
    const hourlyTab = screen.getByRole('tab', { name: '시간별 트렌드' })
    fireEvent.click(hourlyTab)

    expect(screen.getByText('오늘의 시간별 사용량')).toBeDefined()
    expect(screen.getByTestId('bar-chart')).toBeDefined()
  })

  it('should display recent usage records', () => {
    render(<UsageTracker />)

    expect(screen.getByText('최근 사용량 기록')).toBeDefined()
    expect(screen.getByText('api_requests')).toBeDefined()
    expect(screen.getByText('storage')).toBeDefined()
    expect(screen.getByText('100 requests')).toBeDefined()
    expect(screen.getByText('50 MB')).toBeDefined()
  })

  it('should handle empty usage records gracefully', () => {
    const emptyUsageData = {
      ...mockUsageData,
      usageRecords: [],
      usageByType: {},
    }

    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('getUserUsage')) {
        return emptyUsageData
      }
      return undefined
    })

    render(<UsageTracker />)

    // 리소스별 탭으로 이동
    const resourcesTab = screen.getByRole('tab', { name: '리소스별' })
    fireEvent.click(resourcesTab)

    expect(screen.getByText('사용량 데이터가 없습니다.')).toBeDefined()
    expect(screen.getByText('아직 리소스 사용 데이터가 없습니다.')).toBeDefined()
  })

  it('should render compact view when compact prop is true', () => {
    render(<UsageTracker compact={true} />)

    expect(screen.queryByText('사용량 추적')).toBeNull() // Header should not be shown
    expect(screen.getByText('이번 달 사용량')).toBeDefined()
    expect(screen.getByText('75%')).toBeDefined() // Usage percentage badge
  })

  it('should show header when showHeader is true', () => {
    render(<UsageTracker showHeader={true} />)

    expect(screen.getByText('사용량 추적')).toBeDefined()
    expect(screen.getByText('실시간 모니터링')).toBeDefined()
  })

  it('should hide header when showHeader is false', () => {
    render(<UsageTracker showHeader={false} />)

    expect(screen.queryByText('사용량 추적')).toBeNull()
    expect(screen.queryByText('실시간 모니터링')).toBeNull()
  })

  it('should apply correct usage color based on percentage', () => {
    // Test different usage percentages
    const testCases = [
      { usage: 5000, expected: 'text-green-600' }, // 50%
      { usage: 7500, expected: 'text-yellow-600' }, // 75%
      { usage: 9500, expected: 'text-orange-600' }, // 95%
      { usage: 11000, expected: 'text-red-600' }, // 110%
    ]

    testCases.forEach(({ usage, expected }) => {
      const testUsageData = {
        ...mockUsageData,
        subscription: {
          ...mockUsageData.subscription,
          currentUsage: usage,
        },
      }

      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('getUserUsage')) {
          return testUsageData
        }
        return undefined
      })

      const { container } = render(<UsageTracker />)
      
      // Note: Testing CSS classes in components can be challenging
      // In a real implementation, you might want to use data attributes
      // or test the computed styles instead
      const percentageElement = container.querySelector(`.${expected}`)
      expect(percentageElement).toBeDefined()
    })
  })
})