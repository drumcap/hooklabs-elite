import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { useAdminCoupons } from '@/hooks/use-admin-coupons'
import { mockUser, mockCoupon } from '../../fixtures/test-data'

// Mock external dependencies
vi.mock('@clerk/nextjs')
vi.mock('convex/react')

const mockUseUser = vi.mocked(useUser)
const mockUseQuery = vi.mocked(useQuery)

describe('useAdminCoupons', () => {
  const mockCoupons = [
    {
      ...mockCoupon,
      _id: 'coupon1',
      code: 'ACTIVE20',
      name: '활성 쿠폰',
      isActive: true,
      usageCount: 10,
      usageLimit: 100,
      type: 'percentage',
      value: 20,
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      ...mockCoupon,
      _id: 'coupon2',
      code: 'INACTIVE10',
      name: '비활성 쿠폰',
      isActive: false,
      usageCount: 50,
      usageLimit: 100,
      type: 'fixed_amount',
      value: 1000,
      createdAt: '2024-01-02T00:00:00Z'
    },
    {
      ...mockCoupon,
      _id: 'coupon3',
      code: 'EXPIRED30',
      name: '만료된 쿠폰',
      isActive: true,
      usageCount: 100,
      usageLimit: 100,
      validUntil: new Date(Date.now() - 86400000).toISOString(), // 어제 만료
      createdAt: '2024-01-03T00:00:00Z'
    }
  ]

  const mockStats = {
    total: 3,
    active: 1,
    inactive: 1,
    expired: 1,
    usageRate: 53.3,
    totalRevenue: 15000
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseUser.mockReturnValue({
      user: { ...mockUser, publicMetadata: { role: 'admin' } } as any,
      isLoaded: true,
      isSignedIn: true,
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('권한 확인', () => {
    it('관리자가 아닌 경우 에러를 반환해야 함', () => {
      mockUseUser.mockReturnValue({
        user: { ...mockUser, publicMetadata: { role: 'user' } } as any,
        isLoaded: true,
        isSignedIn: true,
      } as any)

      const { result } = renderHook(() => useAdminCoupons())
      
      expect(result.current.error).toBe('관리자 권한이 필요합니다')
      expect(result.current.coupons).toBeNull()
    })

    it('로그인하지 않은 경우 에러를 반환해야 함', () => {
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: true,
        isSignedIn: false,
      } as any)

      const { result } = renderHook(() => useAdminCoupons())
      
      expect(result.current.error).toBe('로그인이 필요합니다')
      expect(result.current.coupons).toBeNull()
    })

    it('사용자 정보가 로딩 중일 때는 로딩 상태를 반환해야 함', () => {
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: false,
        isSignedIn: false,
      } as any)

      const { result } = renderHook(() => useAdminCoupons())
      
      expect(result.current.isLoading).toBe(true)
      expect(result.current.error).toBeNull()
    })
  })

  describe('기본 조회', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValueOnce(mockCoupons) // getCoupons
        .mockReturnValueOnce(mockStats)   // getCouponStats
    })

    it('관리자인 경우 쿠폰 목록을 정상적으로 반환해야 함', () => {
      const { result } = renderHook(() => useAdminCoupons())
      
      expect(result.current.coupons).toEqual(mockCoupons)
      expect(result.current.stats).toEqual(mockStats)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('기본 필터 옵션으로 쿼리가 실행되어야 함', () => {
      renderHook(() => useAdminCoupons())
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filters: {
            isActive: undefined,
            searchTerm: '',
            type: undefined,
            sortBy: 'created',
            sortOrder: 'desc'
          },
          limit: 50
        })
      )
    })
  })

  describe('필터링', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValue(mockCoupons.filter(c => c.isActive))
        .mockReturnValueOnce(mockStats)
    })

    it('활성 쿠폰만 필터링할 수 있어야 함', () => {
      const { result } = renderHook(() => 
        useAdminCoupons({ isActive: true })
      )
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filters: expect.objectContaining({
            isActive: true
          })
        })
      )
    })

    it('검색어로 필터링할 수 있어야 함', () => {
      renderHook(() => 
        useAdminCoupons({ searchTerm: 'ACTIVE' })
      )
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filters: expect.objectContaining({
            searchTerm: 'ACTIVE'
          })
        })
      )
    })

    it('쿠폰 타입으로 필터링할 수 있어야 함', () => {
      renderHook(() => 
        useAdminCoupons({ type: 'percentage' })
      )
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filters: expect.objectContaining({
            type: 'percentage'
          })
        })
      )
    })

    it('복합 필터가 올바르게 적용되어야 함', () => {
      renderHook(() => 
        useAdminCoupons({
          isActive: true,
          searchTerm: 'WELCOME',
          type: 'percentage'
        })
      )
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filters: expect.objectContaining({
            isActive: true,
            searchTerm: 'WELCOME',
            type: 'percentage'
          })
        })
      )
    })
  })

  describe('정렬', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValue(mockCoupons)
        .mockReturnValueOnce(mockStats)
    })

    it('생성일 순으로 정렬할 수 있어야 함', () => {
      renderHook(() => 
        useAdminCoupons({ sortBy: 'created', sortOrder: 'asc' })
      )
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filters: expect.objectContaining({
            sortBy: 'created',
            sortOrder: 'asc'
          })
        })
      )
    })

    it('사용량 순으로 정렬할 수 있어야 함', () => {
      renderHook(() => 
        useAdminCoupons({ sortBy: 'usage' })
      )
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filters: expect.objectContaining({
            sortBy: 'usage'
          })
        })
      )
    })

    it('이름 순으로 정렬할 수 있어야 함', () => {
      renderHook(() => 
        useAdminCoupons({ sortBy: 'name' })
      )
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filters: expect.objectContaining({
            sortBy: 'name'
          })
        })
      )
    })
  })

  describe('페이지네이션', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValue(mockCoupons.slice(0, 2))
        .mockReturnValueOnce(mockStats)
    })

    it('커스텀 limit을 적용할 수 있어야 함', () => {
      renderHook(() => 
        useAdminCoupons({}, { limit: 20 })
      )
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          limit: 20
        })
      )
    })

    it('오프셋을 적용할 수 있어야 함', () => {
      renderHook(() => 
        useAdminCoupons({}, { offset: 10 })
      )
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          offset: 10
        })
      )
    })
  })

  describe('로딩 상태', () => {
    it('쿠폰 데이터 로딩 중일 때 isLoading이 true여야 함', () => {
      mockUseQuery
        .mockReturnValueOnce(undefined) // getCoupons loading
        .mockReturnValueOnce(mockStats)

      const { result } = renderHook(() => useAdminCoupons())
      
      expect(result.current.isLoading).toBe(true)
      expect(result.current.coupons).toBeNull()
    })

    it('통계 데이터 로딩 중일 때도 isLoading이 true여야 함', () => {
      mockUseQuery
        .mockReturnValueOnce(mockCoupons)
        .mockReturnValueOnce(undefined) // getCouponStats loading

      const { result } = renderHook(() => useAdminCoupons())
      
      expect(result.current.isLoading).toBe(true)
      expect(result.current.stats).toBeNull()
    })

    it('모든 데이터가 로딩되면 isLoading이 false여야 함', () => {
      mockUseQuery
        .mockReturnValueOnce(mockCoupons)
        .mockReturnValueOnce(mockStats)

      const { result } = renderHook(() => useAdminCoupons())
      
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('에러 처리', () => {
    it('쿠폰 조회 에러를 처리해야 함', () => {
      mockUseQuery
        .mockImplementationOnce(() => {
          throw new Error('쿠폰 데이터를 불러올 수 없습니다')
        })
        .mockReturnValueOnce(mockStats)

      const { result } = renderHook(() => useAdminCoupons())
      
      expect(result.current.error).toBe('쿠폰 데이터를 불러올 수 없습니다')
      expect(result.current.coupons).toBeNull()
    })

    it('통계 조회 에러를 처리해야 함', () => {
      mockUseQuery
        .mockReturnValueOnce(mockCoupons)
        .mockImplementationOnce(() => {
          throw new Error('통계 데이터를 불러올 수 없습니다')
        })

      const { result } = renderHook(() => useAdminCoupons())
      
      expect(result.current.error).toBe('통계 데이터를 불러올 수 없습니다')
      expect(result.current.stats).toBeNull()
    })

    it('네트워크 에러도 적절히 처리해야 함', () => {
      mockUseQuery
        .mockImplementationOnce(() => {
          throw new Error('Network Error')
        })
        .mockReturnValueOnce(mockStats)

      const { result } = renderHook(() => useAdminCoupons())
      
      expect(result.current.error).toBe('Network Error')
    })
  })

  describe('실시간 업데이트', () => {
    it('필터가 변경되면 새로운 쿼리가 실행되어야 함', () => {
      mockUseQuery
        .mockReturnValue(mockCoupons)
        .mockReturnValue(mockStats)

      const { rerender } = renderHook(
        ({ filters }) => useAdminCoupons(filters),
        { initialProps: { filters: { isActive: true } } }
      )
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filters: expect.objectContaining({
            isActive: true
          })
        })
      )
      
      rerender({ filters: { isActive: false } })
      
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filters: expect.objectContaining({
            isActive: false
          })
        })
      )
    })
  })

  describe('데이터 변환', () => {
    beforeEach(() => {
      mockUseQuery
        .mockReturnValue(mockCoupons)
        .mockReturnValueOnce(mockStats)
    })

    it('쿠폰 데이터가 올바른 형태로 변환되어야 함', () => {
      const { result } = renderHook(() => useAdminCoupons())
      
      expect(result.current.coupons).toHaveLength(3)
      
      const firstCoupon = result.current.coupons?.[0]
      expect(firstCoupon).toMatchObject({
        _id: 'coupon1',
        code: 'ACTIVE20',
        name: '활성 쿠폰',
        isActive: true,
        usageCount: 10,
        usageLimit: 100
      })
    })

    it('통계 데이터가 올바른 형태로 변환되어야 함', () => {
      const { result } = renderHook(() => useAdminCoupons())
      
      expect(result.current.stats).toMatchObject({
        total: 3,
        active: 1,
        inactive: 1,
        expired: 1,
        usageRate: 53.3,
        totalRevenue: 15000
      })
    })
  })

  describe('빈 상태 처리', () => {
    it('쿠폰이 없을 때도 적절히 처리해야 함', () => {
      mockUseQuery
        .mockReturnValueOnce([])
        .mockReturnValueOnce({
          total: 0,
          active: 0,
          inactive: 0,
          expired: 0,
          usageRate: 0,
          totalRevenue: 0
        })

      const { result } = renderHook(() => useAdminCoupons())
      
      expect(result.current.coupons).toEqual([])
      expect(result.current.stats?.total).toBe(0)
      expect(result.current.error).toBeNull()
    })
  })

  describe('메모이제이션', () => {
    it('동일한 파라미터에 대해서는 재렌더링을 방지해야 함', () => {
      mockUseQuery
        .mockReturnValue(mockCoupons)
        .mockReturnValue(mockStats)

      const { result, rerender } = renderHook(() => 
        useAdminCoupons({ isActive: true })
      )
      
      const firstResult = result.current
      rerender()
      const secondResult = result.current
      
      expect(firstResult).toBe(secondResult)
    })
  })

  describe('성능 최적화', () => {
    it('불필요한 쿼리 호출을 방지해야 함', () => {
      mockUseQuery
        .mockReturnValue(mockCoupons)
        .mockReturnValue(mockStats)

      const { rerender } = renderHook(() => useAdminCoupons())
      
      const initialCallCount = mockUseQuery.mock.calls.length
      
      // 동일한 파라미터로 재렌더링
      rerender()
      
      expect(mockUseQuery.mock.calls.length).toBe(initialCallCount)
    })
  })
})