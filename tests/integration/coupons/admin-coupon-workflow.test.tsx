import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { AdminCouponDashboard } from '@/components/coupons/admin/admin-coupon-dashboard'
import { AdminCouponForm } from '@/components/coupons/admin/admin-coupon-form'
import { mockUser, mockCoupon } from '../../../fixtures/test-data'
import { toast } from 'sonner'

// Mock external dependencies
vi.mock('next/navigation')
vi.mock('@clerk/nextjs')
vi.mock('convex/react')
vi.mock('sonner')
vi.mock('@/hooks/use-admin-coupons')
vi.mock('@/hooks/use-coupon-mutations')

const mockRouter = vi.mocked(useRouter)
const mockUseUser = vi.mocked(useUser)
const mockUseQuery = vi.mocked(useQuery)
const mockUseMutation = vi.mocked(useMutation)
const mockToast = vi.mocked(toast)

describe('Admin Coupon Workflow Integration', () => {
  const user = userEvent.setup()
  const mockPush = vi.fn()
  const mockCreateCoupon = vi.fn()
  const mockUpdateCoupon = vi.fn()
  const mockDeleteCoupon = vi.fn()
  
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
    }
  ]

  const mockStats = {
    total: 2,
    active: 1,
    inactive: 1,
    expired: 0,
    usageRate: 30,
    totalRevenue: 15000
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockRouter.mockReturnValue({
      push: mockPush,
      refresh: vi.fn(),
    } as any)
    
    mockUseUser.mockReturnValue({
      user: { ...mockUser, publicMetadata: { role: 'admin' } } as any,
      isLoaded: true,
      isSignedIn: true,
    } as any)

    mockUseMutation
      .mockReturnValueOnce(mockCreateCoupon)
      .mockReturnValueOnce(mockUpdateCoupon)
      .mockReturnValueOnce(mockDeleteCoupon)
    
    // Mock toast methods
    mockToast.success = vi.fn()
    mockToast.error = vi.fn()
    mockToast.loading = vi.fn()
    mockToast.dismiss = vi.fn()

    // Setup default hooks
    vi.doMock('@/hooks/use-admin-coupons', () => ({
      useAdminCoupons: vi.fn(() => ({
        coupons: mockCoupons,
        isLoading: false,
        error: null,
        stats: mockStats
      }))
    }))
    
    vi.doMock('@/hooks/use-coupon-mutations', () => ({
      useCouponMutations: vi.fn(() => ({
        createCoupon: mockCreateCoupon,
        updateCoupon: mockUpdateCoupon,
        deleteCoupon: mockDeleteCoupon
      }))
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('쿠폰 생성 플로우', () => {
    it('새 쿠폰 생성 전체 플로우가 올바르게 작동해야 함', async () => {
      mockCreateCoupon.mockResolvedValue('new-coupon-id')
      
      // Step 1: 대시보드에서 생성 버튼 클릭
      render(<AdminCouponDashboard />)
      
      const createButton = screen.getByText('새 쿠폰 생성')
      await user.click(createButton)
      
      expect(mockPush).toHaveBeenCalledWith('/admin/coupons/create')
      
      // Step 2: 쿠폰 생성 폼 렌더링
      const { unmount } = render(<AdminCouponForm onSuccess={vi.fn()} />)
      
      // Step 3: 쿠폰 정보 입력
      const codeInput = screen.getByLabelText(/쿠폰 코드/i)
      const nameInput = screen.getByLabelText(/쿠폰 이름/i)
      const typeSelect = screen.getByRole('combobox', { name: /할인 타입/i })
      
      await user.type(codeInput, 'SUMMER30')
      await user.type(nameInput, '여름 할인')
      
      // 타입 선택
      await user.click(typeSelect)
      const percentageOption = screen.getByText('비율 할인')
      await user.click(percentageOption)
      
      // 할인값 입력
      const valueInput = screen.getByLabelText(/할인값/i)
      await user.type(valueInput, '30')
      
      // Step 4: 유효 기간 설정
      const validFromInput = screen.getByLabelText(/시작일/i)
      const validUntilInput = screen.getByLabelText(/종료일/i)
      
      await user.type(validFromInput, '2024-06-01')
      await user.type(validUntilInput, '2024-08-31')
      
      // Step 5: 쿠폰 생성 제출
      const submitButton = screen.getByText('쿠폰 생성')
      await user.click(submitButton)
      
      // Step 6: 생성 결과 확인
      await waitFor(() => {
        expect(mockCreateCoupon).toHaveBeenCalledWith({
          code: 'SUMMER30',
          name: '여름 할인',
          type: 'percentage',
          value: 30,
          validFrom: '2024-06-01',
          validUntil: '2024-08-31',
          isActive: true
        })
        expect(mockToast.success).toHaveBeenCalledWith('쿠폰이 성공적으로 생성되었습니다')
      })
      
      unmount()
    })

    it('쿠폰 생성 시 유효성 검증이 올바르게 작동해야 함', async () => {
      render(<AdminCouponForm onSuccess={vi.fn()} />)
      
      // 빈 폼으로 제출 시도
      const submitButton = screen.getByText('쿠폰 생성')
      await user.click(submitButton)
      
      // 유효성 검증 메시지 확인
      await waitFor(() => {
        expect(screen.getByText('쿠폰 코드를 입력해주세요')).toBeInTheDocument()
        expect(screen.getByText('쿠폰 이름을 입력해주세요')).toBeInTheDocument()
      })
      
      // 생성 함수가 호출되지 않았는지 확인
      expect(mockCreateCoupon).not.toHaveBeenCalled()
    })

    it('중복 쿠폰 코드 에러를 적절히 처리해야 함', async () => {
      mockCreateCoupon.mockRejectedValue(new Error('이미 존재하는 쿠폰 코드입니다'))
      
      render(<AdminCouponForm onSuccess={vi.fn()} />)
      
      // 기본 정보 입력
      const codeInput = screen.getByLabelText(/쿠폰 코드/i)
      const nameInput = screen.getByLabelText(/쿠폰 이름/i)
      
      await user.type(codeInput, 'DUPLICATE')
      await user.type(nameInput, '중복 테스트')
      
      const typeSelect = screen.getByRole('combobox', { name: /할인 타입/i })
      await user.click(typeSelect)
      const fixedOption = screen.getByText('고정 할인')
      await user.click(fixedOption)
      
      const valueInput = screen.getByLabelText(/할인값/i)
      await user.type(valueInput, '1000')
      
      // 제출
      const submitButton = screen.getByText('쿠폰 생성')
      await user.click(submitButton)
      
      // 에러 처리 확인
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('쿠폰 생성 실패: 이미 존재하는 쿠폰 코드입니다')
      })
    })
  })

  describe('쿠폰 관리 플로우', () => {
    it('쿠폰 활성화/비활성화가 올바르게 작동해야 함', async () => {
      mockUpdateCoupon.mockResolvedValue(undefined)
      
      render(<AdminCouponDashboard />)
      
      // Step 1: 비활성 쿠폰 선택
      const inactiveCouponCheckbox = screen.getByLabelText('쿠폰 선택: INACTIVE10')
      await user.click(inactiveCouponCheckbox)
      
      // Step 2: 일괄 활성화
      const activateButton = screen.getByText('선택 활성화')
      await user.click(activateButton)
      
      // Step 3: 결과 확인
      await waitFor(() => {
        expect(mockUpdateCoupon).toHaveBeenCalledWith({
          id: 'coupon2',
          isActive: true
        })
        expect(mockToast.success).toHaveBeenCalledWith('쿠폰이 성공적으로 업데이트되었습니다')
      })
    })

    it('여러 쿠폰 일괄 작업이 올바르게 작동해야 함', async () => {
      mockUpdateCoupon.mockResolvedValue(undefined)
      
      render(<AdminCouponDashboard />)
      
      // Step 1: 전체 선택
      const selectAllCheckbox = screen.getByLabelText('모든 쿠폰 선택')
      await user.click(selectAllCheckbox)
      
      // 모든 쿠폰이 선택되었는지 확인
      expect(screen.getByText('2개 선택됨')).toBeInTheDocument()
      
      // Step 2: 일괄 비활성화
      const deactivateButton = screen.getByText('선택 비활성화')
      await user.click(deactivateButton)
      
      // Step 3: 각 쿠폰에 대해 업데이트 호출 확인
      await waitFor(() => {
        expect(mockUpdateCoupon).toHaveBeenCalledTimes(2)
        expect(mockUpdateCoupon).toHaveBeenCalledWith({
          id: 'coupon1',
          isActive: false
        })
        expect(mockUpdateCoupon).toHaveBeenCalledWith({
          id: 'coupon2',
          isActive: false
        })
      })
    })

    it('쿠폰 삭제 플로우가 올바르게 작동해야 함', async () => {
      mockDeleteCoupon.mockResolvedValue(undefined)
      
      render(<AdminCouponDashboard showActions={true} />)
      
      // Step 1: 쿠폰 선택
      const couponCheckbox = screen.getByLabelText('쿠폰 선택: ACTIVE20')
      await user.click(couponCheckbox)
      
      // Step 2: 삭제 버튼 클릭
      const deleteButton = screen.getByText('선택 삭제')
      await user.click(deleteButton)
      
      // Step 3: 확인 다이얼로그
      const confirmButton = await screen.findByText('삭제')
      await user.click(confirmButton)
      
      // Step 4: 삭제 결과 확인
      await waitFor(() => {
        expect(mockDeleteCoupon).toHaveBeenCalledWith('coupon1')
        expect(mockToast.success).toHaveBeenCalledWith('쿠폰이 성공적으로 삭제되었습니다')
      })
    })
  })

  describe('필터링 및 검색 플로우', () => {
    it('검색 기능이 올바르게 작동해야 함', async () => {
      const mockUseAdminCoupons = vi.fn(() => ({
        coupons: mockCoupons.filter(c => c.code.includes('ACTIVE')),
        isLoading: false,
        error: null,
        stats: { ...mockStats, total: 1 }
      }))
      
      vi.doMock('@/hooks/use-admin-coupons', () => ({
        useAdminCoupons: mockUseAdminCoupons
      }))
      
      render(<AdminCouponDashboard />)
      
      // Step 1: 검색어 입력
      const searchInput = screen.getByPlaceholderText('쿠폰 코드 또는 이름으로 검색...')
      await user.type(searchInput, 'ACTIVE')
      
      // Step 2: 디바운스 후 필터 적용 확인
      await waitFor(() => {
        expect(mockUseAdminCoupons).toHaveBeenCalledWith(
          expect.objectContaining({
            searchTerm: 'ACTIVE'
          })
        )
      }, { timeout: 1000 })
    })

    it('복합 필터가 올바르게 작동해야 함', async () => {
      const mockUseAdminCoupons = vi.fn(() => ({
        coupons: [],
        isLoading: false,
        error: null,
        stats: { ...mockStats, total: 0 }
      }))
      
      vi.doMock('@/hooks/use-admin-coupons', () => ({
        useAdminCoupons: mockUseAdminCoupons
      }))
      
      render(<AdminCouponDashboard />)
      
      // Step 1: 상태 필터 설정
      const statusFilter = screen.getByRole('combobox', { name: /상태 필터/ })
      await user.click(statusFilter)
      const activeOption = screen.getByText('활성')
      await user.click(activeOption)
      
      // Step 2: 타입 필터 설정
      const typeFilter = screen.getByRole('combobox', { name: /타입 필터/ })
      await user.click(typeFilter)
      const percentageOption = screen.getByText('비율 할인')
      await user.click(percentageOption)
      
      // Step 3: 복합 필터 적용 확인
      await waitFor(() => {
        expect(mockUseAdminCoupons).toHaveBeenCalledWith(
          expect.objectContaining({
            isActive: true,
            type: 'percentage'
          })
        )
      })
    })
  })

  describe('CSV 내보내기 플로우', () => {
    it('선택된 쿠폰을 CSV로 내보낼 수 있어야 함', async () => {
      const mockDownloadCSV = vi.fn()
      vi.doMock('@/lib/coupon-utils', () => ({
        getCouponStatus: vi.fn(() => 'active'),
        convertToCSV: vi.fn(() => 'code,name,type,value\nACTIVE20,활성 쿠폰,percentage,20'),
        downloadCSV: mockDownloadCSV
      }))
      
      render(<AdminCouponDashboard />)
      
      // Step 1: 쿠폰 선택
      const couponCheckbox = screen.getByLabelText('쿠폰 선택: ACTIVE20')
      await user.click(couponCheckbox)
      
      // Step 2: CSV 내보내기
      const exportButton = screen.getByText('CSV 내보내기')
      await user.click(exportButton)
      
      // Step 3: 다운로드 실행 확인
      await waitFor(() => {
        expect(mockDownloadCSV).toHaveBeenCalledWith(
          'code,name,type,value\nACTIVE20,활성 쿠폰,percentage,20',
          'coupons-export.csv'
        )
        expect(mockToast.success).toHaveBeenCalledWith('CSV 파일이 다운로드됩니다')
      })
    })
  })

  describe('실시간 업데이트 플로우', () => {
    it('쿠폰 생성 후 목록이 자동으로 업데이트되어야 함', async () => {
      mockCreateCoupon.mockResolvedValue('new-coupon-id')
      
      // 쿠폰 생성 후 새로운 목록 반환
      const updatedCoupons = [
        ...mockCoupons,
        {
          _id: 'new-coupon-id',
          code: 'NEWCOUPON',
          name: '새 쿠폰',
          isActive: true,
          type: 'percentage',
          value: 25
        }
      ]
      
      const mockUseAdminCoupons = vi.fn()
        .mockReturnValueOnce({
          coupons: mockCoupons,
          isLoading: false,
          error: null,
          stats: mockStats
        })
        .mockReturnValueOnce({
          coupons: updatedCoupons,
          isLoading: false,
          error: null,
          stats: { ...mockStats, total: 3 }
        })
      
      vi.doMock('@/hooks/use-admin-coupons', () => ({
        useAdminCoupons: mockUseAdminCoupons
      }))
      
      const { rerender } = render(<AdminCouponDashboard />)
      
      // 초기 상태 확인
      expect(screen.getByText('전체 쿠폰')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      
      // 쿠폰 생성 후 리렌더링
      rerender(<AdminCouponDashboard />)
      
      // 업데이트된 목록 확인
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  describe('에러 처리 플로우', () => {
    it('권한 없는 사용자의 접근을 차단해야 함', () => {
      mockUseUser.mockReturnValue({
        user: { ...mockUser, publicMetadata: { role: 'user' } } as any,
        isLoaded: true,
        isSignedIn: true,
      } as any)
      
      render(<AdminCouponDashboard />)
      
      expect(screen.getByText('접근 권한이 없습니다')).toBeInTheDocument()
      expect(screen.queryByText('새 쿠폰 생성')).not.toBeInTheDocument()
    })

    it('데이터 로딩 실패 시 적절한 에러 메시지를 표시해야 함', () => {
      vi.doMock('@/hooks/use-admin-coupons', () => ({
        useAdminCoupons: vi.fn(() => ({
          coupons: null,
          isLoading: false,
          error: '쿠폰 데이터를 불러올 수 없습니다',
          stats: null
        }))
      }))
      
      render(<AdminCouponDashboard />)
      
      expect(screen.getByText('쿠폰 데이터를 불러올 수 없습니다')).toBeInTheDocument()
      expect(screen.getByText('다시 시도')).toBeInTheDocument()
    })

    it('네트워크 에러 시 재시도 기능이 작동해야 함', async () => {
      const mockRetry = vi.fn()
      
      vi.doMock('@/hooks/use-admin-coupons', () => ({
        useAdminCoupons: vi.fn(() => ({
          coupons: null,
          isLoading: false,
          error: '네트워크 오류',
          stats: null,
          retry: mockRetry
        }))
      }))
      
      render(<AdminCouponDashboard />)
      
      const retryButton = screen.getByText('다시 시도')
      await user.click(retryButton)
      
      expect(mockRetry).toHaveBeenCalled()
    })
  })

  describe('성능 최적화', () => {
    it('대량의 쿠폰 데이터도 효율적으로 렌더링해야 함', () => {
      const largeCouponList = Array.from({ length: 100 }, (_, i) => ({
        ...mockCoupon,
        _id: `coupon${i}`,
        code: `CODE${i}`,
        name: `쿠폰 ${i}`
      }))
      
      vi.doMock('@/hooks/use-admin-coupons', () => ({
        useAdminCoupons: vi.fn(() => ({
          coupons: largeCouponList,
          isLoading: false,
          error: null,
          stats: { ...mockStats, total: 100 }
        }))
      }))
      
      const startTime = performance.now()
      render(<AdminCouponDashboard />)
      const endTime = performance.now()
      
      // 렌더링 시간이 합리적인 범위 내에 있는지 확인
      expect(endTime - startTime).toBeLessThan(1000) // 1초 이내
      
      // 첫 번째와 마지막 쿠폰이 렌더링되었는지 확인
      expect(screen.getByText('CODE0')).toBeInTheDocument()
      expect(screen.getByText('CODE99')).toBeInTheDocument()
    })
  })
})