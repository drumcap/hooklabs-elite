import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { CouponValidationForm } from '@/components/coupons/user/coupon-validation-form'
import { CouponUsageHistory } from '@/components/coupons/user/coupon-usage-history'
import { mockUser, mockCoupon, mockCouponUsage } from '../../../fixtures/test-data'
import { toast } from 'sonner'

// Mock external dependencies
vi.mock('@clerk/nextjs')
vi.mock('convex/react')
vi.mock('sonner')
vi.mock('@/hooks/use-debounce', () => ({
  useDebounce: vi.fn((value) => value)
}))

const mockUseUser = vi.mocked(useUser)
const mockUseQuery = vi.mocked(useQuery)
const mockUseMutation = vi.mocked(useMutation)
const mockToast = vi.mocked(toast)

describe('User Coupon Workflow Integration', () => {
  const user = userEvent.setup()
  const mockUseCoupon = vi.fn()
  
  const validCoupon = {
    id: 'coupon-valid',
    code: 'WELCOME20',
    name: '신규 가입 할인',
    description: '20% 할인',
    type: 'percentage',
    value: 20,
    discountAmount: 2000 // $20 discount on $100 order
  }

  const mockUsageHistory = [
    {
      _id: 'usage1',
      coupon: {
        code: 'USED20',
        name: '이미 사용한 쿠폰',
        type: 'percentage',
        value: 20
      },
      discountAmount: 1000,
      currency: 'USD',
      usedAt: '2024-01-15T10:30:00Z',
      orderId: 'order_123'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseUser.mockReturnValue({
      user: mockUser as any,
      isLoaded: true,
      isSignedIn: true,
    } as any)

    mockUseMutation.mockReturnValue(mockUseCoupon)
    
    // Mock toast methods
    mockToast.success = vi.fn()
    mockToast.error = vi.fn()
    mockToast.loading = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('쿠폰 검증 및 적용 플로우', () => {
    it('유효한 쿠폰을 입력하고 적용하는 전체 플로우가 작동해야 함', async () => {
      // Setup: 유효한 쿠폰 응답
      mockUseQuery.mockReturnValue({ valid: true, coupon: validCoupon })
      mockUseCoupon.mockResolvedValue('usage-id-123')

      const mockOnCouponApplied = vi.fn()
      
      render(
        <CouponValidationForm
          orderAmount={10000} // $100 order
          onCouponApplied={mockOnCouponApplied}
        />
      )

      // Step 1: 쿠폰 코드 입력
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'WELCOME20')
      
      expect(input).toHaveValue('WELCOME20')

      // Step 2: 쿠폰 검증 결과 확인
      await waitFor(() => {
        expect(screen.getByText('신규 가입 할인')).toBeInTheDocument()
        expect(screen.getByText('$20.00 할인')).toBeInTheDocument()
      })

      // Step 3: 쿠폰 적용
      const applyButton = screen.getByText('적용')
      await user.click(applyButton)

      // Step 4: 적용 결과 확인
      await waitFor(() => {
        expect(mockOnCouponApplied).toHaveBeenCalledWith(validCoupon)
        expect(screen.getByText('제거')).toBeInTheDocument()
        
        // 할인 요약 표시 확인
        expect(screen.getByText('주문 금액:')).toBeInTheDocument()
        expect(screen.getByText('100,000원')).toBeInTheDocument()
        expect(screen.getByText('쿠폰 할인:')).toBeInTheDocument()
        expect(screen.getByText('-20,000원')).toBeInTheDocument()
        expect(screen.getByText('최종 결제 금액:')).toBeInTheDocument()
        expect(screen.getByText('80,000원')).toBeInTheDocument()
      })
    })

    it('유효하지 않은 쿠폰에 대한 에러 처리가 올바르게 작동해야 함', async () => {
      // Setup: 유효하지 않은 쿠폰 응답
      mockUseQuery.mockReturnValue({ 
        valid: false, 
        error: '유효하지 않은 쿠폰 코드입니다.' 
      })

      render(<CouponValidationForm orderAmount={5000} />)

      // Step 1: 잘못된 쿠폰 코드 입력
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'INVALID')
      
      // Step 2: 에러 메시지 확인
      await waitFor(() => {
        expect(screen.getByText('유효하지 않은 쿠폰 코드입니다.')).toBeInTheDocument()
      })

      // Step 3: 적용 버튼이 표시되지 않는지 확인
      expect(screen.queryByText('적용')).not.toBeInTheDocument()
    })

    it('만료된 쿠폰에 대한 처리가 올바르게 작동해야 함', async () => {
      mockUseQuery.mockReturnValue({ 
        valid: false, 
        error: '만료된 쿠폰입니다.' 
      })

      render(<CouponValidationForm orderAmount={5000} />)

      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'EXPIRED')
      
      await waitFor(() => {
        expect(screen.getByText('만료된 쿠폰입니다.')).toBeInTheDocument()
        expect(screen.getByText('만료된 쿠폰입니다.')).toHaveClass('text-red-600')
      })
    })

    it('최소 주문 금액 미달 시 적절한 안내가 표시되어야 함', async () => {
      mockUseQuery.mockReturnValue({ 
        valid: false, 
        error: '최소 주문 금액 $50.00 이상이어야 합니다.' 
      })

      render(<CouponValidationForm orderAmount={2000} />)

      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'MIN50')
      
      await waitFor(() => {
        expect(screen.getByText('최소 주문 금액 $50.00 이상이어야 합니다.')).toBeInTheDocument()
      })
    })
  })

  describe('쿠폰 제거 플로우', () => {
    it('적용된 쿠폰을 제거할 수 있어야 함', async () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: validCoupon })
      
      const mockOnCouponRemoved = vi.fn()
      
      render(
        <CouponValidationForm
          orderAmount={10000}
          onCouponRemoved={mockOnCouponRemoved}
        />
      )

      // Step 1: 쿠폰 적용
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'WELCOME20')
      
      const applyButton = await screen.findByText('적용')
      await user.click(applyButton)

      // Step 2: 제거 버튼 확인
      await waitFor(() => {
        expect(screen.getByText('제거')).toBeInTheDocument()
      })

      // Step 3: 쿠폰 제거
      const removeButton = screen.getByText('제거')
      await user.click(removeButton)

      // Step 4: 제거 결과 확인
      await waitFor(() => {
        expect(mockOnCouponRemoved).toHaveBeenCalled()
        expect(input).toHaveValue('')
        expect(screen.queryByText('제거')).not.toBeInTheDocument()
        expect(screen.queryByText('최종 결제 금액:')).not.toBeInTheDocument()
      })
    })

    it('X 버튼으로도 쿠폰을 제거할 수 있어야 함', async () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: validCoupon })
      
      const mockOnCouponRemoved = vi.fn()
      
      render(
        <CouponValidationForm
          orderAmount={5000}
          onCouponRemoved={mockOnCouponRemoved}
        />
      )

      // 쿠폰 적용
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'WELCOME20')
      
      const applyButton = await screen.findByText('적용')
      await user.click(applyButton)

      // X 버튼으로 제거
      await waitFor(() => {
        const xButton = screen.getByLabelText('쿠폰 제거')
        expect(xButton).toBeInTheDocument()
      })
      
      const xButton = screen.getByLabelText('쿠폰 제거')
      await user.click(xButton)

      await waitFor(() => {
        expect(mockOnCouponRemoved).toHaveBeenCalled()
      })
    })
  })

  describe('쿠폰 사용 이력 통합', () => {
    it('쿠폰 사용 후 이력에서 확인할 수 있어야 함', async () => {
      // Setup: 사용 이력이 있는 상태
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('getCouponUsageHistory')) {
          return mockUsageHistory
        }
        return undefined
      })

      render(<CouponUsageHistory />)

      // 사용 이력 확인
      await waitFor(() => {
        expect(screen.getByText('USED20')).toBeInTheDocument()
        expect(screen.getByText('이미 사용한 쿠폰')).toBeInTheDocument()
        expect(screen.getByText('$10.00 할인')).toBeInTheDocument()
        expect(screen.getByText('2024년 1월 15일')).toBeInTheDocument()
      })
    })

    it('사용 이력이 없을 때 적절한 빈 상태가 표시되어야 함', async () => {
      mockUseQuery.mockReturnValue([])

      render(<CouponUsageHistory />)

      await waitFor(() => {
        expect(screen.getByText('쿠폰 사용 내역이 없습니다')).toBeInTheDocument()
        expect(screen.getByText('아직 사용한 쿠폰이 없어요')).toBeInTheDocument()
      })
    })
  })

  describe('실시간 쿠폰 검증', () => {
    it('입력 중 실시간으로 쿠폰 검증이 이루어져야 함', async () => {
      let validationCallCount = 0
      mockUseQuery.mockImplementation(() => {
        validationCallCount++
        if (validationCallCount === 1) {
          return { valid: false, error: '유효하지 않은 쿠폰입니다.' }
        }
        return { valid: true, coupon: validCoupon }
      })

      render(<CouponValidationForm orderAmount={5000} />)

      const input = screen.getByLabelText('쿠폰 코드')
      
      // 첫 번째 입력 - 유효하지 않음
      await user.type(input, 'INV')
      await waitFor(() => {
        expect(screen.getByText('유효하지 않은 쿠폰입니다.')).toBeInTheDocument()
      })

      // 입력 수정 - 유효함
      await user.clear(input)
      await user.type(input, 'WELCOME20')
      
      await waitFor(() => {
        expect(screen.queryByText('유효하지 않은 쿠폰입니다.')).not.toBeInTheDocument()
        expect(screen.getByText('신규 가입 할인')).toBeInTheDocument()
      })
    })

    it('디바운싱이 적용되어 과도한 API 호출을 방지해야 함', async () => {
      const { useDebounce } = await import('@/hooks/use-debounce')
      
      render(<CouponValidationForm orderAmount={5000} />)

      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'FAST_TYPING')
      
      // useDebounce가 호출되었는지 확인
      expect(useDebounce).toHaveBeenCalled()
    })
  })

  describe('에러 복구 시나리오', () => {
    it('네트워크 에러 후 재시도가 가능해야 함', async () => {
      let attemptCount = 0
      mockUseQuery.mockImplementation(() => {
        attemptCount++
        if (attemptCount === 1) {
          throw new Error('Network Error')
        }
        return { valid: true, coupon: validCoupon }
      })

      render(<CouponValidationForm orderAmount={5000} />)

      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'RETRY')
      
      // 첫 번째 시도에서 에러
      await waitFor(() => {
        expect(screen.getByText('네트워크 오류가 발생했습니다')).toBeInTheDocument()
      })

      // 재시도 버튼 클릭
      const retryButton = screen.getByText('다시 시도')
      await user.click(retryButton)

      // 재시도 성공
      await waitFor(() => {
        expect(screen.getByText('신규 가입 할인')).toBeInTheDocument()
      })
    })
  })

  describe('접근성 통합 테스트', () => {
    it('키보드만으로 전체 플로우를 완료할 수 있어야 함', async () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: validCoupon })
      
      const mockOnCouponApplied = vi.fn()
      
      render(
        <CouponValidationForm
          orderAmount={5000}
          onCouponApplied={mockOnCouponApplied}
          autoFocus={true}
        />
      )

      // Tab으로 입력 필드에 포커스 (autoFocus로 자동 포커스됨)
      const input = screen.getByLabelText('쿠폰 코드')
      expect(input).toHaveFocus()

      // 쿠폰 코드 입력
      await user.type(input, 'WELCOME20')

      // Enter로 쿠폰 적용
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockOnCouponApplied).toHaveBeenCalledWith(validCoupon)
      })

      // Tab으로 제거 버튼에 포커스
      await user.tab()
      const removeButton = screen.getByText('제거')
      expect(removeButton).toHaveFocus()

      // Space로 쿠폰 제거
      await user.keyboard(' ')

      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })

    it('스크린 리더를 위한 적절한 안내가 제공되어야 함', () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: validCoupon })
      
      render(<CouponValidationForm orderAmount={5000} />)

      // ARIA 속성 확인
      const input = screen.getByLabelText('쿠폰 코드')
      expect(input).toHaveAttribute('aria-describedby', 'coupon-status coupon-help')
      
      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toHaveAttribute('aria-live', 'polite')
      expect(statusRegion).toHaveAttribute('aria-atomic', 'true')

      const helpText = screen.getByText('쿠폰 코드는 3자 이상 입력해주세요')
      expect(helpText).toHaveAttribute('id', 'coupon-help')
    })
  })

  describe('다양한 쿠폰 타입 처리', () => {
    it('비율 할인 쿠폰이 올바르게 처리되어야 함', async () => {
      const percentageCoupon = {
        ...validCoupon,
        type: 'percentage',
        value: 15, // 15%
        discountAmount: 1500 // 15% of $100 = $15
      }
      
      mockUseQuery.mockReturnValue({ valid: true, coupon: percentageCoupon })

      render(<CouponValidationForm orderAmount={10000} />)

      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'PERCENT15')
      
      const applyButton = await screen.findByText('적용')
      await user.click(applyButton)

      await waitFor(() => {
        expect(screen.getByText('-15,000원')).toBeInTheDocument()
        expect(screen.getByText('85,000원')).toBeInTheDocument()
      })
    })

    it('고정 할인 쿠폰이 올바르게 처리되어야 함', async () => {
      const fixedCoupon = {
        ...validCoupon,
        type: 'fixed_amount',
        value: 1000, // $10 fixed
        discountAmount: 1000
      }
      
      mockUseQuery.mockReturnValue({ valid: true, coupon: fixedCoupon })

      render(<CouponValidationForm orderAmount={5000} />)

      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'FIXED10')
      
      const applyButton = await screen.findByText('적용')
      await user.click(applyButton)

      await waitFor(() => {
        expect(screen.getByText('-10,000원')).toBeInTheDocument()
        expect(screen.getByText('40,000원')).toBeInTheDocument()
      })
    })

    it('크레딧 쿠폰이 올바르게 처리되어야 함', async () => {
      const creditCoupon = {
        ...validCoupon,
        type: 'credits',
        value: 100, // 100 credits
        creditsEarned: 100
      }
      
      mockUseQuery.mockReturnValue({ valid: true, coupon: creditCoupon })

      render(<CouponValidationForm orderAmount={0} />)

      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'CREDIT100')
      
      const applyButton = await screen.findByText('적용')
      await user.click(applyButton)

      await waitFor(() => {
        expect(screen.getByText('100 크레딧 지급')).toBeInTheDocument()
      })
    })
  })
})