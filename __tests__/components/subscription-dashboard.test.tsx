import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../../test-utils/index'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import SubscriptionDashboard from '../../components/subscription-dashboard'
import { mockUser, mockSubscription, mockCreditBalance, mockUsageStats } from '../../fixtures/test-data'

// Mock external dependencies
vi.mock('@clerk/nextjs')
vi.mock('convex/react')
vi.mock('recharts', () => ({
  LineChart: vi.fn(({ children }) => <div data-testid="line-chart">{children}</div>),
  Line: vi.fn(() => <div />),
  AreaChart: vi.fn(({ children }) => <div data-testid="area-chart">{children}</div>),
  Area: vi.fn(() => <div />),
  XAxis: vi.fn(() => <div />),
  YAxis: vi.fn(() => <div />),
  CartesianGrid: vi.fn(() => <div />),
  Tooltip: vi.fn(() => <div />),
  ResponsiveContainer: vi.fn(({ children }) => <div data-testid="responsive-container">{children}</div>),
  BarChart: vi.fn(({ children }) => <div data-testid="bar-chart">{children}</div>),
  Bar: vi.fn(() => <div />),
}))

const mockUseUser = vi.mocked(useUser)
const mockUseQuery = vi.mocked(useQuery)

describe('SubscriptionDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseUser.mockReturnValue({
      user: mockUser as any,
      isLoaded: true,
      isSignedIn: true,
    } as any)

    // Default mock responses
    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('getUserSubscription')) {
        return mockSubscription
      }
      if (api.toString().includes('getUserUsage')) {
        return {
          subscription: mockSubscription,
          totalUsage: 2500,
          usageByType: {
            'api_requests': { amount: 2000, unit: 'requests', records: [] },
            'storage': { amount: 500, unit: 'MB', records: [] },
          },
          usageRecords: [],
          periodStart: '2024-01-01T00:00:00Z',
          periodEnd: '2024-01-31T23:59:59Z',
        }
      }
      if (api.toString().includes('getUserCreditBalance')) {
        return mockCreditBalance
      }
      if (api.toString().includes('checkUsageAlerts')) {
        return []
      }
      if (api.toString().includes('getUserPayments')) {
        return []
      }
      return undefined
    })

    // Mock fetch for API calls
    global.fetch = vi.fn()
  })

  it('should render loading state when subscription data is loading', () => {
    mockUseQuery.mockReturnValue(undefined)

    render(<SubscriptionDashboard />)

    expect(screen.getByTestId('loader')).toBeDefined()
  })

  it('should render no subscription message when user has no subscription', () => {
    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('getUserSubscription')) {
        return null
      }
      return undefined
    })

    render(<SubscriptionDashboard />)

    expect(screen.getByText('현재 활성 구독이 없습니다.')).toBeDefined()
    expect(screen.getByRole('link', { name: '플랜 보기' })).toBeDefined()
  })

  it('should render subscription dashboard with active subscription', async () => {
    render(<SubscriptionDashboard />)

    // 주요 메트릭 카드들이 렌더링되는지 확인
    expect(screen.getByText('현재 플랜')).toBeDefined()
    expect(screen.getByText('Pro Plan')).toBeDefined()
    expect(screen.getByText('이번 달 사용량')).toBeDefined()
    expect(screen.getByText('크레딧 잔액')).toBeDefined()
    expect(screen.getByText('다음 결제일')).toBeDefined()

    // 구독 상태 확인
    expect(screen.getByText('활성')).toBeDefined()
    
    // 사용량 정보 확인
    expect(screen.getByText('2,500')).toBeDefined() // currentUsage
    expect(screen.getByText('/ 10,000')).toBeDefined() // usageLimit
  })

  it('should display usage alerts when usage is high', () => {
    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('checkUsageAlerts')) {
        return [{
          type: "near_limit",
          severity: "warning",
          message: "사용량이 한도의 90%에 도달했습니다.",
          usage: 9000,
          limit: 10000,
          percentage: 90,
        }]
      }
      if (api.toString().includes('getUserSubscription')) {
        return mockSubscription
      }
      return undefined
    })

    render(<SubscriptionDashboard />)

    expect(screen.getByText('사용량이 한도의 90%에 도달했습니다.')).toBeDefined()
  })

  it('should display overage warning when usage exceeds limit', () => {
    const overageSubscription = {
      ...mockSubscription,
      currentUsage: 12000,
      overage: 2000,
      overageRate: 5,
    }

    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('getUserSubscription')) {
        return overageSubscription
      }
      if (api.toString().includes('getUserUsage')) {
        return {
          subscription: overageSubscription,
          totalUsage: 12000,
          usageByType: {},
          usageRecords: [],
          periodStart: '2024-01-01T00:00:00Z',
          periodEnd: '2024-01-31T23:59:59Z',
        }
      }
      return undefined
    })

    render(<SubscriptionDashboard />)

    expect(screen.getByText('12,000')).toBeDefined() // Current usage
    expect(screen.getByText(/초과 사용: 2,000/)).toBeDefined()
  })

  it('should handle portal opening', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ portalUrl: 'https://portal.example.com' })
    }
    
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)
    
    // Mock window.open
    const mockOpen = vi.fn()
    Object.defineProperty(window, 'open', { value: mockOpen })

    render(<SubscriptionDashboard />)

    const portalButton = screen.getByText('구독 관리')
    fireEvent.click(portalButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/lemonsqueezy/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: mockSubscription.lemonSqueezyCustomerId,
        }),
      })
    })

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledWith('https://portal.example.com', '_blank')
    })
  })

  it('should handle portal opening error', async () => {
    const mockResponse = {
      ok: false,
      json: () => Promise.resolve({ error: 'Customer not found' })
    }
    
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)
    
    // Mock alert
    const mockAlert = vi.fn()
    Object.defineProperty(window, 'alert', { value: mockAlert })

    render(<SubscriptionDashboard />)

    const portalButton = screen.getByText('구독 관리')
    fireEvent.click(portalButton)

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('고객 포털을 여는 중 오류가 발생했습니다.')
    })
  })

  it('should display payment history when available', () => {
    const mockPayments = [{
      _id: 'payment_1',
      productName: 'Pro Plan',
      total: 2900,
      currency: 'USD',
      status: 'paid',
      createdAt: '2024-01-15T10:00:00Z',
    }]

    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('getUserPayments')) {
        return mockPayments
      }
      if (api.toString().includes('getUserSubscription')) {
        return mockSubscription
      }
      return undefined
    })

    render(<SubscriptionDashboard />)

    // 결제 탭으로 이동
    const billingTab = screen.getByRole('tab', { name: '결제' })
    fireEvent.click(billingTab)

    expect(screen.getByText('최근 결제 내역')).toBeDefined()
    expect(screen.getByText('Pro Plan')).toBeDefined()
  })

  it('should display usage charts', () => {
    render(<SubscriptionDashboard />)

    // 사용량 탭으로 이동
    const usageTab = screen.getByRole('tab', { name: '사용량' })
    fireEvent.click(usageTab)

    expect(screen.getByText('사용량 트렌드')).toBeDefined()
    expect(screen.getByTestId('responsive-container')).toBeDefined()
  })

  it('should handle tab navigation', () => {
    render(<SubscriptionDashboard />)

    // 각 탭 클릭 테스트
    const overviewTab = screen.getByRole('tab', { name: '개요' })
    const usageTab = screen.getByRole('tab', { name: '사용량' })
    const billingTab = screen.getByRole('tab', { name: '결제' })
    const settingsTab = screen.getByRole('tab', { name: '설정' })

    fireEvent.click(usageTab)
    expect(screen.getByText('사용량 트렌드')).toBeDefined()

    fireEvent.click(billingTab)
    expect(screen.getByText('최근 결제 내역')).toBeDefined()

    fireEvent.click(settingsTab)
    expect(screen.getByText('구독 설정')).toBeDefined()

    fireEvent.click(overviewTab)
    expect(screen.getByText('구독 정보')).toBeDefined()
  })

  it('should format prices correctly', () => {
    render(<SubscriptionDashboard />)

    // 한국 원화 포맷 확인 (mockSubscription에서 USD로 설정되어 있음)
    expect(screen.getByText(/\$29.00/)).toBeDefined()
  })

  it('should show credit balance information', () => {
    render(<SubscriptionDashboard />)

    expect(screen.getByText('3,500')).toBeDefined() // Available credits
    expect(screen.getByText('사용 가능한 크레딧')).toBeDefined()
  })

  it('should display subscription interval information', () => {
    render(<SubscriptionDashboard />)

    expect(screen.getByText('/month')).toBeDefined()
  })

  it('should handle missing payment method gracefully', () => {
    const subscriptionWithoutCard = {
      ...mockSubscription,
      cardBrand: undefined,
      cardLastFour: undefined,
    }

    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('getUserSubscription')) {
        return subscriptionWithoutCard
      }
      return undefined
    })

    render(<SubscriptionDashboard />)

    // 결제 수단 정보가 없을 때 표시되지 않는지 확인
    expect(screen.queryByText(/VISA/)).toBeNull()
  })
})