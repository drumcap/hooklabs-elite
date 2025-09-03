import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useUser } from '@clerk/nextjs'
import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { useCouponMutations, useCouponUpdate, useCouponCreation, useCouponUsage } from '@/hooks/use-coupon-mutations'
import { mockUser, mockCoupon } from '../../fixtures/test-data'

// Mock external dependencies
vi.mock('@clerk/nextjs')
vi.mock('convex/react')
vi.mock('sonner')

const mockUseUser = vi.mocked(useUser)
const mockUseMutation = vi.mocked(useMutation)
const mockToast = vi.mocked(toast)

describe('Coupon Mutation Hooks', () => {
  const mockCreateCoupon = vi.fn()
  const mockUpdateCoupon = vi.fn()
  const mockUseCoupon = vi.fn()
  const mockDeleteCoupon = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseUser.mockReturnValue({
      user: { ...mockUser, publicMetadata: { role: 'admin' } } as any,
      isLoaded: true,
      isSignedIn: true,
    } as any)

    mockUseMutation
      .mockReturnValueOnce(mockCreateCoupon)
      .mockReturnValueOnce(mockUpdateCoupon)
      .mockReturnValueOnce(mockUseCoupon)
      .mockReturnValueOnce(mockDeleteCoupon)

    // Mock toast methods
    mockToast.success = vi.fn()
    mockToast.error = vi.fn()
    mockToast.loading = vi.fn().mockReturnValue('toast-id')
    mockToast.dismiss = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('useCouponMutations', () => {
    it('모든 mutation 함수들을 반환해야 함', () => {
      const { result } = renderHook(() => useCouponMutations())
      
      expect(result.current.createCoupon).toBeDefined()
      expect(result.current.updateCoupon).toBeDefined()
      expect(result.current.useCoupon).toBeDefined()
      expect(result.current.deleteCoupon).toBeDefined()
      expect(typeof result.current.createCoupon).toBe('function')
      expect(typeof result.current.updateCoupon).toBe('function')
      expect(typeof result.current.useCoupon).toBe('function')
      expect(typeof result.current.deleteCoupon).toBe('function')
    })

    describe('createCoupon', () => {
      it('쿠폰 생성에 성공하면 성공 메시지를 표시해야 함', async () => {
        mockCreateCoupon.mockResolvedValueOnce('new-coupon-id')
        
        const { result } = renderHook(() => useCouponMutations())
        
        await act(async () => {
          await result.current.createCoupon({
            code: 'NEW20',
            name: '새 쿠폰',
            type: 'percentage',
            value: 20,
            validFrom: new Date().toISOString(),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          })
        })
        
        expect(mockCreateCoupon).toHaveBeenCalledWith({
          code: 'NEW20',
          name: '새 쿠폰',
          type: 'percentage',
          value: 20,
          validFrom: expect.any(String),
          validUntil: expect.any(String)
        })
        expect(mockToast.success).toHaveBeenCalledWith('쿠폰이 성공적으로 생성되었습니다')
      })

      it('쿠폰 생성에 실패하면 에러 메시지를 표시해야 함', async () => {
        mockCreateCoupon.mockRejectedValueOnce(new Error('이미 존재하는 쿠폰 코드입니다'))
        
        const { result } = renderHook(() => useCouponMutations())
        
        await act(async () => {
          try {
            await result.current.createCoupon({
              code: 'DUPLICATE',
              name: '중복 쿠폰',
              type: 'percentage',
              value: 10
            })
          } catch (error) {
            // 예상된 에러
          }
        })
        
        expect(mockToast.error).toHaveBeenCalledWith('쿠폰 생성 실패: 이미 존재하는 쿠폰 코드입니다')
      })

      it('로딩 토스트를 적절히 관리해야 함', async () => {
        mockCreateCoupon.mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve('coupon-id'), 100))
        )
        
        const { result } = renderHook(() => useCouponMutations())
        
        const promise = act(async () => {
          await result.current.createCoupon({
            code: 'LOADING',
            name: '로딩 테스트',
            type: 'fixed_amount',
            value: 1000
          })
        })
        
        expect(mockToast.loading).toHaveBeenCalledWith('쿠폰을 생성하는 중...')
        
        await promise
        
        expect(mockToast.dismiss).toHaveBeenCalledWith('toast-id')
      })
    })

    describe('updateCoupon', () => {
      it('쿠폰 업데이트에 성공하면 성공 메시지를 표시해야 함', async () => {
        mockUpdateCoupon.mockResolvedValueOnce(undefined)
        
        const { result } = renderHook(() => useCouponMutations())
        
        await act(async () => {
          await result.current.updateCoupon({
            id: 'coupon-123',
            isActive: false
          })
        })
        
        expect(mockUpdateCoupon).toHaveBeenCalledWith({
          id: 'coupon-123',
          isActive: false
        })
        expect(mockToast.success).toHaveBeenCalledWith('쿠폰이 성공적으로 업데이트되었습니다')
      })

      it('존재하지 않는 쿠폰 업데이트 시 에러를 처리해야 함', async () => {
        mockUpdateCoupon.mockRejectedValueOnce(new Error('쿠폰을 찾을 수 없습니다'))
        
        const { result } = renderHook(() => useCouponMutations())
        
        await act(async () => {
          try {
            await result.current.updateCoupon({
              id: 'not-found',
              name: '새 이름'
            })
          } catch (error) {
            // 예상된 에러
          }
        })
        
        expect(mockToast.error).toHaveBeenCalledWith('쿠폰 업데이트 실패: 쿠폰을 찾을 수 없습니다')
      })
    })

    describe('useCoupon', () => {
      it('쿠폰 사용에 성공하면 성공 메시지를 표시해야 함', async () => {
        mockUseCoupon.mockResolvedValueOnce('usage-id')
        
        const { result } = renderHook(() => useCouponMutations())
        
        await act(async () => {
          await result.current.useCoupon({
            couponCode: 'USE20',
            orderId: 'order-123',
            discountAmount: 1000,
            currency: 'USD'
          })
        })
        
        expect(mockUseCoupon).toHaveBeenCalledWith({
          couponCode: 'USE20',
          orderId: 'order-123',
          discountAmount: 1000,
          currency: 'USD'
        })
        expect(mockToast.success).toHaveBeenCalledWith('쿠폰이 성공적으로 적용되었습니다')
      })

      it('유효하지 않은 쿠폰 사용 시 에러를 처리해야 함', async () => {
        mockUseCoupon.mockRejectedValueOnce(new Error('유효하지 않은 쿠폰입니다'))
        
        const { result } = renderHook(() => useCouponMutations())
        
        await act(async () => {
          try {
            await result.current.useCoupon({
              couponCode: 'INVALID',
              orderId: 'order-456'
            })
          } catch (error) {
            // 예상된 에러
          }
        })
        
        expect(mockToast.error).toHaveBeenCalledWith('쿠폰 사용 실패: 유효하지 않은 쿠폰입니다')
      })
    })

    describe('deleteCoupon', () => {
      it('쿠폰 삭제에 성공하면 성공 메시지를 표시해야 함', async () => {
        mockDeleteCoupon.mockResolvedValueOnce(undefined)
        
        const { result } = renderHook(() => useCouponMutations())
        
        await act(async () => {
          await result.current.deleteCoupon('coupon-to-delete')
        })
        
        expect(mockDeleteCoupon).toHaveBeenCalledWith({
          id: 'coupon-to-delete'
        })
        expect(mockToast.success).toHaveBeenCalledWith('쿠폰이 성공적으로 삭제되었습니다')
      })
    })
  })

  describe('useCouponCreation', () => {
    it('생성 전용 mutation을 반환해야 함', () => {
      const { result } = renderHook(() => useCouponCreation())
      
      expect(result.current.createCoupon).toBeDefined()
      expect(result.current.isCreating).toBe(false)
      expect(typeof result.current.createCoupon).toBe('function')
    })

    it('생성 중 상태를 추적해야 함', async () => {
      let resolveCreate: (value: string) => void
      const createPromise = new Promise<string>(resolve => {
        resolveCreate = resolve
      })
      mockCreateCoupon.mockReturnValueOnce(createPromise)
      
      const { result } = renderHook(() => useCouponCreation())
      
      // 생성 시작
      act(() => {
        result.current.createCoupon({
          code: 'CREATING',
          name: '생성 중',
          type: 'percentage',
          value: 15
        })
      })
      
      expect(result.current.isCreating).toBe(true)
      
      // 생성 완료
      await act(async () => {
        resolveCreate('new-coupon-id')
        await createPromise
      })
      
      expect(result.current.isCreating).toBe(false)
    })

    it('생성 에러 상태를 추적해야 함', async () => {
      mockCreateCoupon.mockRejectedValueOnce(new Error('생성 실패'))
      
      const { result } = renderHook(() => useCouponCreation())
      
      await act(async () => {
        try {
          await result.current.createCoupon({
            code: 'FAIL',
            name: '실패 테스트',
            type: 'fixed_amount',
            value: 500
          })
        } catch (error) {
          // 예상된 에러
        }
      })
      
      expect(result.current.error).toBe('생성 실패')
      expect(result.current.isCreating).toBe(false)
    })
  })

  describe('useCouponUpdate', () => {
    it('업데이트 전용 mutation을 반환해야 함', () => {
      const { result } = renderHook(() => useCouponUpdate())
      
      expect(result.current.updateCoupon).toBeDefined()
      expect(result.current.isUpdating).toBe(false)
    })

    it('여러 쿠폰을 일괄 업데이트할 수 있어야 함', async () => {
      mockUpdateCoupon.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useCouponUpdate())
      
      await act(async () => {
        await result.current.batchUpdate([
          { id: 'coupon1', isActive: false },
          { id: 'coupon2', isActive: false }
        ])
      })
      
      expect(mockUpdateCoupon).toHaveBeenCalledTimes(2)
      expect(mockToast.success).toHaveBeenCalledWith('2개 쿠폰이 성공적으로 업데이트되었습니다')
    })

    it('일괄 업데이트 중 일부 실패 시 적절히 처리해야 함', async () => {
      mockUpdateCoupon
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('업데이트 실패'))
      
      const { result } = renderHook(() => useCouponUpdate())
      
      await act(async () => {
        await result.current.batchUpdate([
          { id: 'coupon1', isActive: false },
          { id: 'coupon2', isActive: false }
        ])
      })
      
      expect(mockToast.success).toHaveBeenCalledWith('1개 쿠폰이 성공적으로 업데이트되었습니다')
      expect(mockToast.error).toHaveBeenCalledWith('1개 쿠폰 업데이트에 실패했습니다')
    })
  })

  describe('useCouponUsage', () => {
    it('사용 전용 mutation을 반환해야 함', () => {
      const { result } = renderHook(() => useCouponUsage())
      
      expect(result.current.useCoupon).toBeDefined()
      expect(result.current.isUsing).toBe(false)
    })

    it('쿠폰 사용 히스토리를 기록해야 함', async () => {
      mockUseCoupon.mockResolvedValueOnce('usage-id')
      
      const { result } = renderHook(() => useCouponUsage())
      
      await act(async () => {
        await result.current.useCoupon({
          couponCode: 'HISTORY',
          orderId: 'order-789',
          discountAmount: 1500
        })
      })
      
      expect(result.current.usageHistory).toContainEqual(
        expect.objectContaining({
          couponCode: 'HISTORY',
          orderId: 'order-789',
          discountAmount: 1500,
          usedAt: expect.any(String)
        })
      )
    })

    it('사용 통계를 업데이트해야 함', async () => {
      mockUseCoupon.mockResolvedValue('usage-id')
      
      const { result } = renderHook(() => useCouponUsage())
      
      // 첫 번째 사용
      await act(async () => {
        await result.current.useCoupon({
          couponCode: 'STATS1',
          discountAmount: 1000
        })
      })
      
      // 두 번째 사용
      await act(async () => {
        await result.current.useCoupon({
          couponCode: 'STATS2',
          discountAmount: 500
        })
      })
      
      expect(result.current.totalUsed).toBe(2)
      expect(result.current.totalSavings).toBe(1500)
    })
  })

  describe('권한 관리', () => {
    it('관리자가 아닌 경우 생성/수정/삭제가 제한되어야 함', () => {
      mockUseUser.mockReturnValue({
        user: { ...mockUser, publicMetadata: { role: 'user' } } as any,
        isLoaded: true,
        isSignedIn: true,
      } as any)
      
      const { result } = renderHook(() => useCouponMutations())
      
      act(() => {
        result.current.createCoupon({
          code: 'UNAUTHORIZED',
          name: '권한 없음',
          type: 'percentage',
          value: 10
        })
      })
      
      expect(mockToast.error).toHaveBeenCalledWith('관리자 권한이 필요합니다')
      expect(mockCreateCoupon).not.toHaveBeenCalled()
    })

    it('로그인하지 않은 사용자는 제한되어야 함', () => {
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: true,
        isSignedIn: false,
      } as any)
      
      const { result } = renderHook(() => useCouponMutations())
      
      act(() => {
        result.current.updateCoupon({
          id: 'some-coupon',
          isActive: false
        })
      })
      
      expect(mockToast.error).toHaveBeenCalledWith('로그인이 필요합니다')
      expect(mockUpdateCoupon).not.toHaveBeenCalled()
    })

    it('일반 사용자는 쿠폰 사용만 가능해야 함', async () => {
      mockUseUser.mockReturnValue({
        user: { ...mockUser, publicMetadata: { role: 'user' } } as any,
        isLoaded: true,
        isSignedIn: true,
      } as any)
      
      mockUseCoupon.mockResolvedValueOnce('usage-id')
      
      const { result } = renderHook(() => useCouponMutations())
      
      await act(async () => {
        await result.current.useCoupon({
          couponCode: 'USER_COUPON',
          discountAmount: 800
        })
      })
      
      expect(mockUseCoupon).toHaveBeenCalled()
      expect(mockToast.success).toHaveBeenCalledWith('쿠폰이 성공적으로 적용되었습니다')
    })
  })

  describe('에러 복구', () => {
    it('일시적 네트워크 에러 시 재시도할 수 있어야 함', async () => {
      mockCreateCoupon
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce('success-id')
      
      const { result } = renderHook(() => useCouponCreation())
      
      // 첫 번째 시도 - 실패
      await act(async () => {
        try {
          await result.current.createCoupon({
            code: 'RETRY',
            name: '재시도 테스트',
            type: 'percentage',
            value: 25
          })
        } catch (error) {
          // 예상된 에러
        }
      })
      
      expect(result.current.error).toBe('Network Error')
      
      // 재시도 - 성공
      await act(async () => {
        await result.current.retry()
      })
      
      expect(result.current.error).toBeNull()
      expect(mockToast.success).toHaveBeenCalledWith('쿠폰이 성공적으로 생성되었습니다')
    })
  })
})