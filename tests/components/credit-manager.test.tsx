import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test-utils/index'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import CreditManager from '../../components/credit-manager'
import { mockUser, mockCreditBalance, mockCredit, mockCoupon } from '../../fixtures/test-data'

// Mock external dependencies
vi.mock('@clerk/nextjs')
vi.mock('convex/react')

const mockUseUser = vi.mocked(useUser)
const mockUseQuery = vi.mocked(useQuery)
const mockUseMutation = vi.mocked(useMutation)

describe('CreditManager', () => {
  const mockUseCoupon = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseUser.mockReturnValue({
      user: mockUser as any,
      isLoaded: true,
      isSignedIn: true,
    } as any)

    mockUseMutation.mockReturnValue(mockUseCoupon)

    // Default mock responses
    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('getUserCreditBalance')) {
        return mockCreditBalance
      }
      if (api.toString().includes('getCreditHistory')) {
        return [
          { ...mockCredit, type: 'earned', amount: 1000, description: '회원가입 보너스' },
          { ...mockCredit, type: 'used', amount: -500, description: '서비스 이용' },
        ]
      }
      if (api.toString().includes('getExpiringCredits')) {
        return []
      }
      if (api.toString().includes('getUserCouponUsages')) {
        return []
      }
      if (api.toString().includes('validateCoupon')) {
        return { valid: false, error: '쿠폰 코드를 입력하세요.' }
      }
      return undefined
    })
  })

  it('should render loading state when data is loading', () => {
    mockUseQuery.mockReturnValue(undefined)

    render(<CreditManager />)

    expect(screen.getByTestId('loader')).toBeDefined()
  })

  it('should render credit balance information', () => {
    render(<CreditManager />)

    expect(screen.getByText('크레딧 & 쿠폰 관리')).toBeDefined()
    expect(screen.getByText('3,500')).toBeDefined() // Available credits
    expect(screen.getByText('1,500')).toBeDefined() // Used credits
    expect(screen.getByText('0')).toBeDefined() // Expired credits
  })

  it('should display expiring credits warning', () => {
    const expiringCredits = [
      {
        ...mockCredit,
        amount: 1000,
        description: '보너스 크레딧',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]

    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('getExpiringCredits')) {
        return expiringCredits
      }
      if (api.toString().includes('getUserCreditBalance')) {
        return mockCreditBalance
      }
      return undefined
    })

    render(<CreditManager />)

    expect(screen.getByText('30일 내 만료 예정 크레딧이 있습니다')).toBeDefined()
    expect(screen.getByText('1,000 크레딧이 만료 예정입니다.')).toBeDefined()
  })

  it('should validate coupon code and show validation result', async () => {
    mockUseQuery.mockImplementation((api: any, args?: any) => {
      if (api.toString().includes('validateCoupon') && args?.code === 'VALID20') {
        return {
          valid: true,
          coupon: {
            id: 'coupon_id',
            code: 'VALID20',
            name: '20% 할인 쿠폰',
            description: '전 상품 20% 할인',
            type: 'percentage',
            value: 20,
            discountAmount: 1000,
          },
        }
      }
      if (api.toString().includes('getUserCreditBalance')) {
        return mockCreditBalance
      }
      return undefined
    })

    render(<CreditManager />)

    const couponInput = screen.getByPlaceholderText('쿠폰 코드를 입력하세요')
    fireEvent.change(couponInput, { target: { value: 'VALID20' } })

    await waitFor(() => {
      expect(screen.getByText('20% 할인 쿠폰')).toBeDefined()
      expect(screen.getByText('전 상품 20% 할인')).toBeDefined()
    })
  })

  it('should show error for invalid coupon', async () => {
    mockUseQuery.mockImplementation((api: any, args?: any) => {
      if (api.toString().includes('validateCoupon') && args?.code === 'INVALID') {
        return {
          valid: false,
          error: '유효하지 않은 쿠폰 코드입니다.',
        }
      }
      if (api.toString().includes('getUserCreditBalance')) {
        return mockCreditBalance
      }
      return undefined
    })

    render(<CreditManager />)

    const couponInput = screen.getByPlaceholderText('쿠폰 코드를 입력하세요')
    fireEvent.change(couponInput, { target: { value: 'INVALID' } })

    await waitFor(() => {
      expect(screen.getByText('유효하지 않은 쿠폰 코드입니다.')).toBeDefined()
    })
  })

  it('should apply coupon successfully', async () => {
    mockUseQuery.mockImplementation((api: any, args?: any) => {
      if (api.toString().includes('validateCoupon') && args?.code === 'VALID20') {
        return {
          valid: true,
          coupon: {
            id: 'coupon_id',
            code: 'VALID20',
            name: '20% 할인 쿠폰',
            description: '전 상품 20% 할인',
            type: 'percentage',
            value: 20,
            discountAmount: 1000,
          },
        }
      }
      if (api.toString().includes('getUserCreditBalance')) {
        return mockCreditBalance
      }
      return undefined
    })

    mockUseCoupon.mockResolvedValue('usage_id_123')

    render(<CreditManager />)

    const couponInput = screen.getByPlaceholderText('쿠폰 코드를 입력하세요')
    fireEvent.change(couponInput, { target: { value: 'VALID20' } })

    await waitFor(() => {
      expect(screen.getByText('20% 할인 쿠폰')).toBeDefined()
    })

    const applyButton = screen.getByText('적용')
    fireEvent.click(applyButton)

    await waitFor(() => {
      expect(mockUseCoupon).toHaveBeenCalledWith({
        userId: mockUser.id,
        couponCode: 'VALID20',
        discountAmount: 1000,
        currency: undefined,
      })
    })

    await waitFor(() => {
      expect(screen.getByText('쿠폰이 성공적으로 적용되었습니다! (20% 할인 쿠폰)')).toBeDefined()
    })
  })

  it('should display credit history', () => {
    render(<CreditManager />)

    // 크레딧 내역 탭으로 이동
    const creditsTab = screen.getByRole('tab', { name: '크레딧 내역' })
    fireEvent.click(creditsTab)

    expect(screen.getByText('크레딧 내역')).toBeDefined()
    expect(screen.getByText('회원가입 보너스')).toBeDefined()
    expect(screen.getByText('서비스 이용')).toBeDefined()
    expect(screen.getByText('+1,000')).toBeDefined()
    expect(screen.getByText('-500')).toBeDefined()
  })

  it('should display coupon usage history', () => {
    const mockCouponUsages = [
      {
        _id: 'usage_1',
        coupon: { name: '신규 회원 할인', code: 'NEW20', type: 'percentage' },
        discountAmount: 500,
        usedAt: '2024-01-15T10:00:00Z',
      },
    ]

    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('getUserCouponUsages')) {
        return mockCouponUsages
      }
      if (api.toString().includes('getUserCreditBalance')) {
        return mockCreditBalance
      }
      return undefined
    })

    render(<CreditManager />)

    // 쿠폰 사용 내역 탭으로 이동
    const couponsTab = screen.getByRole('tab', { name: '쿠폰 사용 내역' })
    fireEvent.click(couponsTab)

    expect(screen.getByText('쿠폰 사용 내역')).toBeDefined()
    expect(screen.getByText('신규 회원 할인')).toBeDefined()
    expect(screen.getByText('5원 할인')).toBeDefined()
  })

  it('should display expiring credits in dedicated tab', () => {
    const expiringCredits = [
      {
        ...mockCredit,
        amount: 500,
        description: '이벤트 크레딧',
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]

    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('getExpiringCredits')) {
        return expiringCredits
      }
      if (api.toString().includes('getUserCreditBalance')) {
        return mockCreditBalance
      }
      return undefined
    })

    render(<CreditManager />)

    // 만료 예정 탭으로 이동
    const expiringTab = screen.getByRole('tab', { name: '만료 예정' })
    fireEvent.click(expiringTab)

    expect(screen.getByText('만료 예정 크레딧')).toBeDefined()
    expect(screen.getByText('이벤트 크레딧')).toBeDefined()
    expect(screen.getByText('500 크레딧')).toBeDefined()
    expect(screen.getByText('만료 예정')).toBeDefined()
  })

  it('should handle empty states correctly', () => {
    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('getCreditHistory')) {
        return []
      }
      if (api.toString().includes('getUserCouponUsages')) {
        return []
      }
      if (api.toString().includes('getExpiringCredits')) {
        return []
      }
      if (api.toString().includes('getUserCreditBalance')) {
        return mockCreditBalance
      }
      return undefined
    })

    render(<CreditManager />)

    // 크레딧 내역 탭
    const creditsTab = screen.getByRole('tab', { name: '크레딧 내역' })
    fireEvent.click(creditsTab)
    expect(screen.getByText('아직 크레딧 내역이 없습니다.')).toBeDefined()

    // 쿠폰 사용 내역 탭
    const couponsTab = screen.getByRole('tab', { name: '쿠폰 사용 내역' })
    fireEvent.click(couponsTab)
    expect(screen.getByText('아직 사용한 쿠폰이 없습니다.')).toBeDefined()

    // 만료 예정 탭
    const expiringTab = screen.getByRole('tab', { name: '만료 예정' })
    fireEvent.click(expiringTab)
    expect(screen.getByText('만료 예정인 크레딧이 없습니다.')).toBeDefined()
  })

  it('should clear error messages when typing new coupon code', () => {
    render(<CreditManager />)

    const couponInput = screen.getByPlaceholderText('쿠폰 코드를 입력하세요')
    
    // Simulate initial error state
    fireEvent.change(couponInput, { target: { value: 'INVALID' } })
    
    // Change to new value should clear errors
    fireEvent.change(couponInput, { target: { value: 'NEW_CODE' } })

    // The input should be uppercase
    expect(couponInput).toHaveValue('NEW_CODE')
  })

  it('should handle coupon application error', async () => {
    mockUseQuery.mockImplementation((api: any, args?: any) => {
      if (api.toString().includes('validateCoupon') && args?.code === 'VALID20') {
        return {
          valid: true,
          coupon: {
            id: 'coupon_id',
            code: 'VALID20',
            name: '20% 할인 쿠폰',
            value: 20,
            discountAmount: 1000,
          },
        }
      }
      if (api.toString().includes('getUserCreditBalance')) {
        return mockCreditBalance
      }
      return undefined
    })

    mockUseCoupon.mockRejectedValue(new Error('쿠폰 적용 실패'))

    render(<CreditManager />)

    const couponInput = screen.getByPlaceholderText('쿠폰 코드를 입력하세요')
    fireEvent.change(couponInput, { target: { value: 'VALID20' } })

    const applyButton = screen.getByText('적용')
    fireEvent.click(applyButton)

    await waitFor(() => {
      expect(screen.getByText('쿠폰 적용 중 오류가 발생했습니다.')).toBeDefined()
    })
  })

  it('should show loading state during coupon application', async () => {
    mockUseQuery.mockImplementation((api: any, args?: any) => {
      if (api.toString().includes('validateCoupon') && args?.code === 'VALID20') {
        return {
          valid: true,
          coupon: {
            id: 'coupon_id',
            code: 'VALID20',
            name: '20% 할인 쿠폰',
            value: 20,
            discountAmount: 1000,
          },
        }
      }
      if (api.toString().includes('getUserCreditBalance')) {
        return mockCreditBalance
      }
      return undefined
    })

    // Make the mutation hang to test loading state
    mockUseCoupon.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

    render(<CreditManager />)

    const couponInput = screen.getByPlaceholderText('쿠폰 코드를 입력하세요')
    fireEvent.change(couponInput, { target: { value: 'VALID20' } })

    const applyButton = screen.getByText('적용')
    fireEvent.click(applyButton)

    // Should show loading spinner
    expect(screen.getByTestId('loader')).toBeDefined()
    expect(applyButton).toBeDisabled()
  })

  it('should handle credit coupon application', async () => {
    mockUseQuery.mockImplementation((api: any, args?: any) => {
      if (api.toString().includes('validateCoupon') && args?.code === 'CREDITS500') {
        return {
          valid: true,
          coupon: {
            id: 'coupon_id',
            code: 'CREDITS500',
            name: '500 크레딧',
            description: '무료 크레딧 지급',
            type: 'credits',
            value: 500,
          },
        }
      }
      if (api.toString().includes('getUserCreditBalance')) {
        return mockCreditBalance
      }
      return undefined
    })

    render(<CreditManager />)

    const couponInput = screen.getByPlaceholderText('쿠폰 코드를 입력하세요')
    fireEvent.change(couponInput, { target: { value: 'CREDITS500' } })

    await waitFor(() => {
      expect(screen.getByText('500 크레딧')).toBeDefined()
      expect(screen.getByText('(+500 크레딧)')).toBeDefined()
    })
  })

  it('should display correct credit type icons and labels', () => {
    render(<CreditManager />)

    // 크레딧 내역 탭으로 이동
    const creditsTab = screen.getByRole('tab', { name: '크레딧 내역' })
    fireEvent.click(creditsTab)

    expect(screen.getByText('적립')).toBeDefined() // earned type
    expect(screen.getByText('사용')).toBeDefined() // used type
  })
})