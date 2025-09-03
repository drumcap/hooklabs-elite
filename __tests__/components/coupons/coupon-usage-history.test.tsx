import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useUser } from '@clerk/nextjs'
import { CouponUsageHistory } from '@/components/coupons/user/coupon-usage-history'
import { mockUser, mockCouponUsage } from '../../../fixtures/test-data'

// Mock external dependencies
vi.mock('@clerk/nextjs')
vi.mock('@/hooks/use-coupon-usage-history')

const mockUseUser = vi.mocked(useUser)
const mockUseCouponUsageHistory = vi.fn()

describe('CouponUsageHistory', () => {
  const user = userEvent.setup()
  
  const mockUsageHistory = [
    {
      _id: 'usage1',
      coupon: {
        _id: 'coupon1',
        code: 'WELCOME20',
        name: '신규 가입 할인',
        type: 'percentage',
        value: 20
      },
      discountAmount: 1000,
      currency: 'USD',
      usedAt: '2024-01-15T10:30:00Z',
      orderId: 'order_123'
    },
    {
      _id: 'usage2',
      coupon: {
        _id: 'coupon2',
        code: 'FIXED500',
        name: '고정 할인',
        type: 'fixed_amount',
        value: 500
      },
      discountAmount: 500,
      currency: 'USD',
      usedAt: '2024-01-10T15:45:00Z',
      orderId: 'order_456'
    },
    {
      _id: 'usage3',
      coupon: {
        _id: 'coupon3',
        code: 'CREDITS100',
        name: '크레딧 지급',
        type: 'credits',
        value: 100
      },
      creditsEarned: 100,
      currency: 'USD',
      usedAt: '2024-01-05T09:15:00Z',
      orderId: null
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseUser.mockReturnValue({
      user: mockUser as any,
      isLoaded: true,
      isSignedIn: true,
    } as any)

    // Import mock after setting up
    vi.doMock('@/hooks/use-coupon-usage-history', () => ({
      useCouponUsageHistory: mockUseCouponUsageHistory
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('로딩 상태', () => {
    it('로딩 중일 때 스켈레톤이 표시되어야 함', () => {
      mockUseCouponUsageHistory.mockReturnValue({
        usageHistory: null,
        isLoading: true,
        error: null,
        hasMore: false,
        loadMore: vi.fn()
      })

      render(<CouponUsageHistory />)
      
      expect(screen.getByTestId('usage-history-skeleton')).toBeInTheDocument()
    })
  })

  describe('에러 상태', () => {
    it('에러가 발생했을 때 에러 메시지가 표시되어야 함', () => {
      const errorMessage = '사용 내역을 불러올 수 없습니다'
      mockUseCouponUsageHistory.mockReturnValue({
        usageHistory: null,
        isLoading: false,
        error: errorMessage,
        hasMore: false,
        loadMore: vi.fn()
      })

      render(<CouponUsageHistory />)
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(screen.getByText('다시 시도')).toBeInTheDocument()
    })

    it('다시 시도 버튼이 올바르게 작동해야 함', async () => {
      const mockRetry = vi.fn()
      mockUseCouponUsageHistory.mockReturnValue({
        usageHistory: null,
        isLoading: false,
        error: '에러 발생',
        hasMore: false,
        loadMore: vi.fn(),
        retry: mockRetry
      })

      render(<CouponUsageHistory />)
      
      const retryButton = screen.getByText('다시 시도')
      await user.click(retryButton)
      
      expect(mockRetry).toHaveBeenCalled()
    })
  })

  describe('빈 상태', () => {
    it('사용 내역이 없을 때 빈 상태가 표시되어야 함', () => {
      mockUseCouponUsageHistory.mockReturnValue({
        usageHistory: [],
        isLoading: false,
        error: null,
        hasMore: false,
        loadMore: vi.fn()
      })

      render(<CouponUsageHistory />)
      
      expect(screen.getByText('쿠폰 사용 내역이 없습니다')).toBeInTheDocument()
      expect(screen.getByText('아직 사용한 쿠폰이 없어요')).toBeInTheDocument()
    })
  })

  describe('사용 내역 표시', () => {
    beforeEach(() => {
      mockUseCouponUsageHistory.mockReturnValue({
        usageHistory: mockUsageHistory,
        isLoading: false,
        error: null,
        hasMore: false,
        loadMore: vi.fn()
      })
    })

    it('사용 내역이 올바르게 렌더링되어야 함', () => {
      render(<CouponUsageHistory />)
      
      expect(screen.getByText('쿠폰 사용 내역')).toBeInTheDocument()
      expect(screen.getByText('WELCOME20')).toBeInTheDocument()
      expect(screen.getByText('신규 가입 할인')).toBeInTheDocument()
      expect(screen.getByText('FIXED500')).toBeInTheDocument()
      expect(screen.getByText('고정 할인')).toBeInTheDocument()
      expect(screen.getByText('CREDITS100')).toBeInTheDocument()
      expect(screen.getByText('크레딧 지급')).toBeInTheDocument()
    })

    it('할인 금액이 올바르게 표시되어야 함', () => {
      render(<CouponUsageHistory />)
      
      // 할인 쿠폰들
      expect(screen.getByText('$10.00 할인')).toBeInTheDocument() // 1000 cents
      expect(screen.getByText('$5.00 할인')).toBeInTheDocument() // 500 cents
      
      // 크레딧 쿠폰
      expect(screen.getByText('100 크레딧 지급')).toBeInTheDocument()
    })

    it('사용 날짜가 올바른 형식으로 표시되어야 함', () => {
      render(<CouponUsageHistory />)
      
      expect(screen.getByText('2024년 1월 15일')).toBeInTheDocument()
      expect(screen.getByText('2024년 1월 10일')).toBeInTheDocument()
      expect(screen.getByText('2024년 1월 5일')).toBeInTheDocument()
    })

    it('쿠폰 타입에 따른 배지가 올바르게 표시되어야 함', () => {
      render(<CouponUsageHistory />)
      
      expect(screen.getByText('비율 할인')).toBeInTheDocument()
      expect(screen.getByText('고정 할인')).toBeInTheDocument()
      expect(screen.getByText('크레딧')).toBeInTheDocument()
    })

    it('주문 ID가 있는 경우 표시되어야 함', () => {
      render(<CouponUsageHistory />)
      
      expect(screen.getByText('주문: order_123')).toBeInTheDocument()
      expect(screen.getByText('주문: order_456')).toBeInTheDocument()
      
      // 주문 ID가 없는 경우는 표시되지 않아야 함
      expect(screen.queryByText('주문: null')).not.toBeInTheDocument()
    })
  })

  describe('필터링 기능', () => {
    beforeEach(() => {
      mockUseCouponUsageHistory.mockReturnValue({
        usageHistory: mockUsageHistory,
        isLoading: false,
        error: null,
        hasMore: false,
        loadMore: vi.fn()
      })
    })

    it('쿠폰 타입 필터가 올바르게 작동해야 함', async () => {
      render(<CouponUsageHistory showFilters={true} />)
      
      const typeFilter = screen.getByRole('combobox', { name: /쿠폰 타입/ })
      await user.click(typeFilter)
      
      const percentageOption = screen.getByText('비율 할인')
      await user.click(percentageOption)
      
      await waitFor(() => {
        expect(mockUseCouponUsageHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'percentage'
          })
        )
      })
    })

    it('기간 필터가 올바르게 작동해야 함', async () => {
      render(<CouponUsageHistory showFilters={true} />)
      
      const periodFilter = screen.getByRole('combobox', { name: /기간/ })
      await user.click(periodFilter)
      
      const lastWeekOption = screen.getByText('최근 1주일')
      await user.click(lastWeekOption)
      
      await waitFor(() => {
        expect(mockUseCouponUsageHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            period: 'week'
          })
        )
      })
    })

    it('검색 기능이 올바르게 작동해야 함', async () => {
      render(<CouponUsageHistory showFilters={true} />)
      
      const searchInput = screen.getByPlaceholderText('쿠폰 코드로 검색...')
      await user.type(searchInput, 'WELCOME')
      
      await waitFor(() => {
        expect(mockUseCouponUsageHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            searchTerm: 'WELCOME'
          })
        )
      }, { timeout: 1000 }) // 디바운스 고려
    })
  })

  describe('무한 스크롤', () => {
    const mockLoadMore = vi.fn()

    beforeEach(() => {
      mockUseCouponUsageHistory.mockReturnValue({
        usageHistory: mockUsageHistory,
        isLoading: false,
        error: null,
        hasMore: true,
        loadMore: mockLoadMore
      })
    })

    it('더 많은 데이터가 있을 때 "더 보기" 버튼이 표시되어야 함', () => {
      render(<CouponUsageHistory />)
      
      expect(screen.getByText('더 보기')).toBeInTheDocument()
    })

    it('"더 보기" 버튼 클릭 시 loadMore가 호출되어야 함', async () => {
      render(<CouponUsageHistory />)
      
      const loadMoreButton = screen.getByText('더 보기')
      await user.click(loadMoreButton)
      
      expect(mockLoadMore).toHaveBeenCalled()
    })

    it('로딩 중일 때 "더 보기" 버튼이 비활성화되어야 함', () => {
      mockUseCouponUsageHistory.mockReturnValue({
        usageHistory: mockUsageHistory,
        isLoading: true,
        error: null,
        hasMore: true,
        loadMore: mockLoadMore
      })

      render(<CouponUsageHistory />)
      
      const loadMoreButton = screen.getByText('더 보기')
      expect(loadMoreButton).toBeDisabled()
    })

    it('더 이상 데이터가 없을 때 "더 보기" 버튼이 표시되지 않아야 함', () => {
      mockUseCouponUsageHistory.mockReturnValue({
        usageHistory: mockUsageHistory,
        isLoading: false,
        error: null,
        hasMore: false,
        loadMore: mockLoadMore
      })

      render(<CouponUsageHistory />)
      
      expect(screen.queryByText('더 보기')).not.toBeInTheDocument()
    })
  })

  describe('컴팩트 모드', () => {
    beforeEach(() => {
      mockUseCouponUsageHistory.mockReturnValue({
        usageHistory: mockUsageHistory,
        isLoading: false,
        error: null,
        hasMore: false,
        loadMore: vi.fn()
      })
    })

    it('컴팩트 모드에서는 간소화된 UI가 표시되어야 함', () => {
      render(<CouponUsageHistory compact={true} />)
      
      // 헤더가 표시되지 않아야 함
      expect(screen.queryByText('쿠폰 사용 내역')).not.toBeInTheDocument()
      
      // 쿠폰 코드는 표시되어야 함
      expect(screen.getByText('WELCOME20')).toBeInTheDocument()
    })

    it('컴팩트 모드에서는 필터가 표시되지 않아야 함', () => {
      render(<CouponUsageHistory compact={true} showFilters={true} />)
      
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    beforeEach(() => {
      mockUseCouponUsageHistory.mockReturnValue({
        usageHistory: mockUsageHistory,
        isLoading: false,
        error: null,
        hasMore: false,
        loadMore: vi.fn()
      })
    })

    it('적절한 ARIA 레이블이 설정되어야 함', () => {
      render(<CouponUsageHistory />)
      
      expect(screen.getByRole('region', { name: '쿠폰 사용 내역' })).toBeInTheDocument()
      expect(screen.getByRole('list')).toBeInTheDocument()
      
      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(mockUsageHistory.length)
    })

    it('키보드 네비게이션이 올바르게 작동해야 함', async () => {
      render(<CouponUsageHistory showFilters={true} />)
      
      // Tab을 통한 네비게이션
      await user.tab()
      expect(screen.getByPlaceholderText('쿠폰 코드로 검색...')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('combobox', { name: /쿠폰 타입/ })).toHaveFocus()
    })

    it('스크린 리더를 위한 적절한 텍스트가 제공되어야 함', () => {
      render(<CouponUsageHistory />)
      
      // 할인 금액에 대한 설명
      expect(screen.getByText('10달러 할인 받음')).toBeInTheDocument()
      expect(screen.getByText('5달러 할인 받음')).toBeInTheDocument()
      expect(screen.getByText('100 크레딧 지급 받음')).toBeInTheDocument()
    })
  })

  describe('날짜 포맷팅', () => {
    beforeEach(() => {
      mockUseCouponUsageHistory.mockReturnValue({
        usageHistory: [
          {
            ...mockUsageHistory[0],
            usedAt: '2024-12-25T00:00:00Z' // 크리스마스
          }
        ],
        isLoading: false,
        error: null,
        hasMore: false,
        loadMore: vi.fn()
      })
    })

    it('한국어 날짜 형식으로 표시되어야 함', () => {
      render(<CouponUsageHistory />)
      
      expect(screen.getByText('2024년 12월 25일')).toBeInTheDocument()
    })

    it('시간도 함께 표시되는 옵션이 작동해야 함', () => {
      render(<CouponUsageHistory showTime={true} />)
      
      expect(screen.getByText('오전 12:00')).toBeInTheDocument()
    })
  })

  describe('통화 형식', () => {
    beforeEach(() => {
      mockUseCouponUsageHistory.mockReturnValue({
        usageHistory: [
          {
            ...mockUsageHistory[0],
            currency: 'KRW',
            discountAmount: 1000000 // 1,000,000 won
          }
        ],
        isLoading: false,
        error: null,
        hasMore: false,
        loadMore: vi.fn()
      })
    })

    it('다른 통화도 올바르게 표시되어야 함', () => {
      render(<CouponUsageHistory />)
      
      expect(screen.getByText('₩10,000 할인')).toBeInTheDocument()
    })
  })
})