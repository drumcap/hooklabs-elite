import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { useCouponValidation } from '@/hooks/use-coupon-validation'
import { mockUser, mockCoupon } from '../../fixtures/test-data'

// Mock external dependencies
vi.mock('@clerk/nextjs')
vi.mock('convex/react')

const mockUseUser = vi.mocked(useUser)
const mockUseQuery = vi.mocked(useQuery)

describe('useCouponValidation', () => {
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

  describe('초기 상태', () => {
    it('빈 코드에 대해서는 쿼리가 실행되지 않아야 함', () => {
      mockUseQuery.mockReturnValue(undefined)
      
      const { result } = renderHook(() => useCouponValidation('', 1000))
      
      expect(mockUseQuery).toHaveBeenCalledWith(expect.anything(), 'skip')
      expect(result.current.validation).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isValid).toBe(false)
    })

    it('3자 미만의 코드에 대해서는 쿼리가 실행되지 않아야 함', () => {
      mockUseQuery.mockReturnValue(undefined)
      
      const { result } = renderHook(() => useCouponValidation('AB', 1000))
      
      expect(mockUseQuery).toHaveBeenCalledWith(expect.anything(), 'skip')
      expect(result.current.validation).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
    })

    it('3자 이상의 코드에 대해서는 쿼리가 실행되어야 함', () => {
      mockUseQuery.mockReturnValue(undefined)
      
      const { result } = renderHook(() => useCouponValidation('ABC', 1000))
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          code: 'ABC',
          userId: mockUser.id,
          orderAmount: 1000
        })
      )
    })
  })

  describe('로딩 상태', () => {
    it('쿼리가 진행 중일 때 isLoading이 true여야 함', () => {
      mockUseQuery.mockReturnValue(undefined)
      
      const { result } = renderHook(() => useCouponValidation('LOADING', 1000))
      
      expect(result.current.isLoading).toBe(true)
    })

    it('쿼리가 완료되면 isLoading이 false여야 함', () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: mockCoupon })
      
      const { result } = renderHook(() => useCouponValidation('LOADED', 1000))
      
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('유효한 쿠폰 검증', () => {
    const validCoupon = {
      id: 'coupon-123',
      code: 'VALID20',
      name: '20% 할인',
      type: 'percentage',
      value: 20,
      discountAmount: 200
    }

    it('유효한 쿠폰에 대해 올바른 응답을 반환해야 함', () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: validCoupon })
      
      const { result } = renderHook(() => useCouponValidation('VALID20', 1000))
      
      expect(result.current.validation).toEqual({ valid: true, coupon: validCoupon })
      expect(result.current.isValid).toBe(true)
      expect(result.current.error).toBeUndefined()
      expect(result.current.discountAmount).toBe(200)
      expect(result.current.couponData).toEqual(validCoupon)
    })

    it('할인 금액이 있는 쿠폰의 정보가 올바르게 반환되어야 함', () => {
      const couponWithDiscount = {
        ...validCoupon,
        discountAmount: 500
      }
      mockUseQuery.mockReturnValue({ valid: true, coupon: couponWithDiscount })
      
      const { result } = renderHook(() => useCouponValidation('DISCOUNT', 2500))
      
      expect(result.current.discountAmount).toBe(500)
      expect(result.current.couponData).toEqual(couponWithDiscount)
    })
  })

  describe('유효하지 않은 쿠폰 검증', () => {
    it('존재하지 않는 쿠폰에 대해 에러를 반환해야 함', () => {
      const errorResponse = { 
        valid: false, 
        error: '유효하지 않은 쿠폰 코드입니다.' 
      }
      mockUseQuery.mockReturnValue(errorResponse)
      
      const { result } = renderHook(() => useCouponValidation('INVALID', 1000))
      
      expect(result.current.validation).toEqual(errorResponse)
      expect(result.current.isValid).toBe(false)
      expect(result.current.error).toBe('유효하지 않은 쿠폰 코드입니다.')
      expect(result.current.discountAmount).toBe(0)
      expect(result.current.couponData).toBeUndefined()
    })

    it('만료된 쿠폰에 대해 적절한 에러를 반환해야 함', () => {
      const errorResponse = { 
        valid: false, 
        error: '만료된 쿠폰입니다.' 
      }
      mockUseQuery.mockReturnValue(errorResponse)
      
      const { result } = renderHook(() => useCouponValidation('EXPIRED', 1000))
      
      expect(result.current.error).toBe('만료된 쿠폰입니다.')
    })

    it('비활성화된 쿠폰에 대해 적절한 에러를 반환해야 함', () => {
      const errorResponse = { 
        valid: false, 
        error: '비활성화된 쿠폰입니다.' 
      }
      mockUseQuery.mockReturnValue(errorResponse)
      
      const { result } = renderHook(() => useCouponValidation('INACTIVE', 1000))
      
      expect(result.current.error).toBe('비활성화된 쿠폰입니다.')
    })

    it('사용 횟수 초과 쿠폰에 대해 적절한 에러를 반환해야 함', () => {
      const errorResponse = { 
        valid: false, 
        error: '사용 횟수가 초과된 쿠폰입니다.' 
      }
      mockUseQuery.mockReturnValue(errorResponse)
      
      const { result } = renderHook(() => useCouponValidation('EXCEEDED', 1000))
      
      expect(result.current.error).toBe('사용 횟수가 초과된 쿠폰입니다.')
    })

    it('최소 주문 금액 미달에 대해 적절한 에러를 반환해야 함', () => {
      const errorResponse = { 
        valid: false, 
        error: '최소 주문 금액 $20.00 이상이어야 합니다.' 
      }
      mockUseQuery.mockReturnValue(errorResponse)
      
      const { result } = renderHook(() => useCouponValidation('MINORDER', 500))
      
      expect(result.current.error).toBe('최소 주문 금액 $20.00 이상이어야 합니다.')
    })
  })

  describe('코드 정규화', () => {
    it('코드가 대문자로 변환되고 트림되어야 함', () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: mockCoupon })
      
      renderHook(() => useCouponValidation('  lowercase  ', 1000))
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          code: 'LOWERCASE'
        })
      )
    })

    it('공백과 특수문자가 있는 코드도 정규화되어야 함', () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: mockCoupon })
      
      renderHook(() => useCouponValidation('\tWelcome-20\n', 1000))
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          code: 'WELCOME-20'
        })
      )
    })
  })

  describe('주문 금액 처리', () => {
    it('주문 금액이 없을 때도 올바르게 처리되어야 함', () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: mockCoupon })
      
      renderHook(() => useCouponValidation('NOORDER'))
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          code: 'NOORDER',
          orderAmount: undefined
        })
      )
    })

    it('주문 금액이 0일 때도 올바르게 처리되어야 함', () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: mockCoupon })
      
      renderHook(() => useCouponValidation('ZERO', 0))
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          orderAmount: 0
        })
      )
    })

    it('음수 주문 금액도 처리되어야 함', () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: mockCoupon })
      
      renderHook(() => useCouponValidation('NEGATIVE', -100))
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          orderAmount: -100
        })
      )
    })
  })

  describe('사용자 인증', () => {
    it('로그인하지 않은 사용자도 쿠폰 검증이 가능해야 함', () => {
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: true,
        isSignedIn: false,
      } as any)
      mockUseQuery.mockReturnValue({ valid: true, coupon: mockCoupon })
      
      renderHook(() => useCouponValidation('ANONYMOUS', 1000))
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: undefined
        })
      )
    })

    it('사용자 정보가 로딩 중일 때도 처리되어야 함', () => {
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: false,
        isSignedIn: false,
      } as any)
      mockUseQuery.mockReturnValue(undefined)
      
      renderHook(() => useCouponValidation('LOADING_USER', 1000))
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: undefined
        })
      )
    })
  })

  describe('실시간 업데이트', () => {
    it('코드가 변경되면 새로운 쿼리가 실행되어야 함', () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: mockCoupon })
      
      const { rerender } = renderHook(
        ({ code }) => useCouponValidation(code, 1000),
        { initialProps: { code: 'FIRST' } }
      )
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ code: 'FIRST' })
      )
      
      rerender({ code: 'SECOND' })
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ code: 'SECOND' })
      )
    })

    it('주문 금액이 변경되면 새로운 쿼리가 실행되어야 함', () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: mockCoupon })
      
      const { rerender } = renderHook(
        ({ orderAmount }) => useCouponValidation('SAME', orderAmount),
        { initialProps: { orderAmount: 1000 } }
      )
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ orderAmount: 1000 })
      )
      
      rerender({ orderAmount: 2000 })
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ orderAmount: 2000 })
      )
    })
  })

  describe('에러 처리', () => {
    it('네트워크 에러가 발생해도 Hook이 안전하게 처리되어야 함', () => {
      mockUseQuery.mockReturnValue(null)
      
      const { result } = renderHook(() => useCouponValidation('ERROR', 1000))
      
      expect(result.current.validation).toBeNull()
      expect(result.current.isValid).toBe(false)
      expect(result.current.discountAmount).toBe(0)
    })

    it('예상치 못한 응답 형식도 처리되어야 함', () => {
      mockUseQuery.mockReturnValue({ unexpected: 'response' } as any)
      
      const { result } = renderHook(() => useCouponValidation('UNEXPECTED', 1000))
      
      expect(result.current.isValid).toBe(false)
      expect(result.current.discountAmount).toBe(0)
    })
  })

  describe('메모이제이션', () => {
    it('동일한 파라미터에 대해서는 동일한 객체를 반환해야 함', () => {
      const response = { valid: true, coupon: mockCoupon }
      mockUseQuery.mockReturnValue(response)
      
      const { result, rerender } = renderHook(() => 
        useCouponValidation('MEMO', 1000)
      )
      
      const firstResult = result.current
      rerender()
      const secondResult = result.current
      
      expect(firstResult.validation).toBe(secondResult.validation)
    })
  })

  describe('타입 안전성', () => {
    it('TypeScript 타입이 올바르게 추론되어야 함', () => {
      mockUseQuery.mockReturnValue({ valid: true, coupon: mockCoupon })
      
      const { result } = renderHook(() => useCouponValidation('TYPE', 1000))
      
      // 타입스크립트 컴파일 시점에서 확인됨
      expect(typeof result.current.isLoading).toBe('boolean')
      expect(typeof result.current.isValid).toBe('boolean')
      expect(typeof result.current.discountAmount).toBe('number')
      
      if (result.current.error) {
        expect(typeof result.current.error).toBe('string')
      }
      
      if (result.current.couponData) {
        expect(typeof result.current.couponData.code).toBe('string')
      }
    })
  })
})