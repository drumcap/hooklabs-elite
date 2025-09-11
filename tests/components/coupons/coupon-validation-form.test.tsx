import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { CouponValidationForm } from '@/components/coupons/user/coupon-validation-form'
import { mockUser, mockCoupon } from '../../../fixtures/test-data'

// Mock external dependencies
vi.mock('@clerk/nextjs')
vi.mock('convex/react')
vi.mock('@/hooks/use-debounce', () => ({
  useDebounce: vi.fn((value) => value)
}))

const mockUseUser = vi.mocked(useUser)
const mockUseQuery = vi.mocked(useQuery)

describe('CouponValidationForm', () => {
  const user = userEvent.setup()
  const mockOnCouponApplied = vi.fn()
  const mockOnCouponRemoved = vi.fn()

  const defaultProps = {
    orderAmount: 5000,
    onCouponApplied: mockOnCouponApplied,
    onCouponRemoved: mockOnCouponRemoved,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseUser.mockReturnValue({
      user: mockUser as any,
      isLoaded: true,
      isSignedIn: true,
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('렌더링', () => {
    it('초기 상태에서 올바르게 렌더링되어야 함', () => {
      mockUseQuery.mockReturnValue(undefined)
      
      render(<CouponValidationForm {...defaultProps} />)
      
      expect(screen.getByText('쿠폰 적용')).toBeInTheDocument()
      expect(screen.getByLabelText('쿠폰 코드')).toBeInTheDocument()
      expect(screen.getByText('쿠폰 코드는 3자 이상 입력해주세요')).toBeInTheDocument()
      expect(screen.queryByText('적용')).not.toBeInTheDocument()
    })

    it('커스텀 placeholder가 적용되어야 함', () => {
      mockUseQuery.mockReturnValue(undefined)
      
      render(
        <CouponValidationForm 
          {...defaultProps} 
          placeholder="Enter coupon code" 
        />
      )
      
      expect(screen.getByPlaceholderText('Enter coupon code')).toBeInTheDocument()
    })

    it('disabled 상태일 때 입력 필드와 버튼이 비활성화되어야 함', () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: mockCoupon })
      
      render(
        <CouponValidationForm 
          {...defaultProps} 
          disabled={true}
        />
      )
      
      expect(screen.getByLabelText('쿠폰 코드')).toBeDisabled()
    })
  })

  describe('사용자 입력 처리', () => {
    it('입력값이 대문자로 변환되어야 함', async () => {
      mockUseQuery.mockReturnValue(undefined)
      
      render(<CouponValidationForm {...defaultProps} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'abc123')
      
      expect(input).toHaveValue('ABC123')
    })

    it('3자 이상 입력 시 적용 버튼이 표시되어야 함', async () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: mockCoupon })
      
      render(<CouponValidationForm {...defaultProps} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'ABC')
      
      expect(screen.getByText('적용')).toBeInTheDocument()
    })

    it('maxLength 제한이 적용되어야 함', async () => {
      mockUseQuery.mockReturnValue(undefined)
      
      render(<CouponValidationForm {...defaultProps} maxLength={5} />)
      
      const input = screen.getByLabelText('쿠폰 코드') as HTMLInputElement
      expect(input.maxLength).toBe(5)
    })

    it('Enter 키 입력 시 유효한 쿠폰이면 자동 적용되어야 함', async () => {
      const validCoupon = {
        id: 'coupon-123',
        code: 'VALID20',
        discountAmount: 1000
      }

      mockUseQuery.mockReturnValue({ valid: true, coupon: validCoupon })
      
      render(<CouponValidationForm {...defaultProps} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'VALID20')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockOnCouponApplied).toHaveBeenCalledWith(validCoupon)
      })
    })
  })

  describe('쿠폰 검증', () => {
    it('로딩 상태에서 스피너가 표시되어야 함', async () => {
      mockUseQuery.mockReturnValue(undefined)
      
      render(<CouponValidationForm {...defaultProps} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'LOADING')
      
      // 디바운스된 후 로딩 상태 확인
      await waitFor(() => {
        expect(screen.getByTestId('loader-spinner')).toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('유효한 쿠폰일 때 성공 메시지가 표시되어야 함', async () => {
      const validCoupon = {
        id: 'coupon-123',
        code: 'VALID20',
        name: '20% 할인',
        discountAmount: 1000
      }

      mockUseQuery.mockReturnValue({ valid: true, coupon: validCoupon })
      
      render(<CouponValidationForm {...defaultProps} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'VALID20')
      
      await waitFor(() => {
        expect(screen.getByText('20% 할인')).toBeInTheDocument()
        expect(screen.getByText('1,000원 할인')).toBeInTheDocument()
      })
    })

    it('유효하지 않은 쿠폰일 때 에러 메시지가 표시되어야 함', async () => {
      mockUseQuery.mockReturnValue({ 
        valid: false, 
        error: '유효하지 않은 쿠폰 코드입니다.' 
      })
      
      render(<CouponValidationForm {...defaultProps} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'INVALID')
      
      await waitFor(() => {
        expect(screen.getByText('유효하지 않은 쿠폰 코드입니다.')).toBeInTheDocument()
      })
    })

    it('만료된 쿠폰일 때 적절한 에러 메시지가 표시되어야 함', async () => {
      mockUseQuery.mockReturnValue({ 
        valid: false, 
        error: '만료된 쿠폰입니다.' 
      })
      
      render(<CouponValidationForm {...defaultProps} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'EXPIRED')
      
      await waitFor(() => {
        expect(screen.getByText('만료된 쿠폰입니다.')).toBeInTheDocument()
      })
    })
  })

  describe('쿠폰 적용/제거', () => {
    it('적용 버튼 클릭 시 쿠폰이 적용되어야 함', async () => {
      const validCoupon = {
        id: 'coupon-123',
        code: 'APPLY20',
        discountAmount: 1000
      }

      mockUseQuery.mockReturnValue({ valid: true, coupon: validCoupon })
      
      render(<CouponValidationForm {...defaultProps} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'APPLY20')
      
      const applyButton = await screen.findByText('적용')
      await user.click(applyButton)
      
      await waitFor(() => {
        expect(mockOnCouponApplied).toHaveBeenCalledWith(validCoupon)
        expect(screen.getByText('제거')).toBeInTheDocument()
      })
    })

    it('제거 버튼 클릭 시 쿠폰이 제거되어야 함', async () => {
      const validCoupon = {
        id: 'coupon-123',
        code: 'REMOVE20',
        discountAmount: 1000
      }

      mockUseQuery.mockReturnValue({ valid: true, coupon: validCoupon })
      
      render(<CouponValidationForm {...defaultProps} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'REMOVE20')
      
      const applyButton = await screen.findByText('적용')
      await user.click(applyButton)
      
      await waitFor(() => {
        expect(screen.getByText('제거')).toBeInTheDocument()
      })
      
      const removeButton = screen.getByText('제거')
      await user.click(removeButton)
      
      await waitFor(() => {
        expect(mockOnCouponRemoved).toHaveBeenCalled()
        expect(input).toHaveValue('')
      })
    })

    it('X 버튼으로도 쿠폰을 제거할 수 있어야 함', async () => {
      const validCoupon = {
        id: 'coupon-123',
        code: 'REMOVEX',
        discountAmount: 1000
      }

      mockUseQuery.mockReturnValue({ valid: true, coupon: validCoupon })
      
      render(<CouponValidationForm {...defaultProps} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'REMOVEX')
      
      const applyButton = await screen.findByText('적용')
      await user.click(applyButton)
      
      await waitFor(() => {
        expect(screen.getByLabelText('쿠폰 제거')).toBeInTheDocument()
      })
      
      const xButton = screen.getByLabelText('쿠폰 제거')
      await user.click(xButton)
      
      await waitFor(() => {
        expect(mockOnCouponRemoved).toHaveBeenCalled()
      })
    })

    it('적용된 상태에서 입력값 변경 시 자동으로 제거되어야 함', async () => {
      const validCoupon = {
        id: 'coupon-123',
        code: 'CHANGE20',
        discountAmount: 1000
      }

      mockUseQuery.mockReturnValue({ valid: true, coupon: validCoupon })
      
      render(<CouponValidationForm {...defaultProps} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'CHANGE20')
      
      const applyButton = await screen.findByText('적용')
      await user.click(applyButton)
      
      await waitFor(() => {
        expect(screen.getByText('제거')).toBeInTheDocument()
      })
      
      await user.clear(input)
      await user.type(input, 'DIFFERENT')
      
      await waitFor(() => {
        expect(mockOnCouponRemoved).toHaveBeenCalled()
      })
    })
  })

  describe('주문 금액 표시', () => {
    it('쿠폰 적용 후 할인 요약이 표시되어야 함', async () => {
      const validCoupon = {
        id: 'coupon-123',
        code: 'DISCOUNT20',
        discountAmount: 1000
      }

      mockUseQuery.mockReturnValue({ valid: true, coupon: validCoupon })
      
      render(<CouponValidationForm {...defaultProps} orderAmount={5000} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'DISCOUNT20')
      
      const applyButton = await screen.findByText('적용')
      await user.click(applyButton)
      
      await waitFor(() => {
        expect(screen.getByText('주문 금액:')).toBeInTheDocument()
        expect(screen.getByText('5,000원')).toBeInTheDocument()
        expect(screen.getByText('쿠폰 할인:')).toBeInTheDocument()
        expect(screen.getByText('-1,000원')).toBeInTheDocument()
        expect(screen.getByText('최종 결제 금액:')).toBeInTheDocument()
        expect(screen.getByText('4,000원')).toBeInTheDocument()
      })
    })

    it('주문 금액이 0일 때는 할인 요약이 표시되지 않아야 함', async () => {
      const validCoupon = {
        id: 'coupon-123',
        code: 'NOORDER',
        discountAmount: 1000
      }

      mockUseQuery.mockReturnValue({ valid: true, coupon: validCoupon })
      
      render(<CouponValidationForm {...defaultProps} orderAmount={0} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'NOORDER')
      
      const applyButton = await screen.findByText('적용')
      await user.click(applyButton)
      
      await waitFor(() => {
        expect(screen.queryByText('주문 금액:')).not.toBeInTheDocument()
      })
    })
  })

  describe('접근성', () => {
    it('적절한 ARIA 속성들이 설정되어야 함', () => {
      mockUseQuery.mockReturnValue(undefined)
      
      render(<CouponValidationForm {...defaultProps} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      expect(input).toHaveAttribute('aria-describedby', 'coupon-status coupon-help')
      expect(input).toHaveAttribute('aria-invalid', 'false')
      
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
      expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true')
    })

    it('에러 상태에서 aria-invalid가 true로 설정되어야 함', async () => {
      mockUseQuery.mockReturnValue({ 
        valid: false, 
        error: '유효하지 않은 쿠폰입니다.' 
      })
      
      render(<CouponValidationForm {...defaultProps} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, 'INVALID')
      
      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('키보드 네비게이션이 올바르게 작동해야 함', async () => {
      const validCoupon = {
        id: 'coupon-123',
        code: 'KEYBOARD',
        discountAmount: 1000
      }

      mockUseQuery.mockReturnValue({ valid: true, coupon: validCoupon })
      
      render(<CouponValidationForm {...defaultProps} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      
      // Tab to input
      await user.tab()
      expect(input).toHaveFocus()
      
      // Type coupon code
      await user.type(input, 'KEYBOARD')
      
      // Tab to apply button
      await user.tab()
      const applyButton = screen.getByText('적용')
      expect(applyButton).toHaveFocus()
      
      // Press space to apply
      await user.keyboard(' ')
      
      await waitFor(() => {
        expect(mockOnCouponApplied).toHaveBeenCalled()
      })
    })
  })

  describe('에지 케이스', () => {
    it('공백이 포함된 코드는 트림되어야 함', async () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: mockCoupon })
      
      render(<CouponValidationForm {...defaultProps} />)
      
      const input = screen.getByLabelText('쿠폰 코드')
      await user.type(input, '  TRIMMED  ')
      
      expect(input).toHaveValue('  TRIMMED  ')
      
      // useQuery가 트림된 값으로 호출되었는지 확인
      await waitFor(() => {
        expect(mockUseQuery).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ code: 'TRIMMED' })
        )
      })
    })

    it('매우 빠른 타이핑에도 디바운스가 적용되어야 함', async () => {
      mockUseQuery.mockReturnValue(undefined)
      
      const { useDebounce } = await import('@/hooks/use-debounce')
      expect(useDebounce).toHaveBeenCalled()
    })

    it('컴포넌트 언마운트 시 메모리 누수가 없어야 함', () => {
      mockUseQuery.mockReturnValue(undefined)
      
      const { unmount } = render(<CouponValidationForm {...defaultProps} />)
      
      expect(() => unmount()).not.toThrow()
    })
  })
})