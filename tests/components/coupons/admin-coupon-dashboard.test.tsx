import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { AdminCouponDashboard } from '@/components/coupons/admin/admin-coupon-dashboard'
import { mockUser, mockCoupon } from '../../../fixtures/test-data'

// Mock external dependencies
vi.mock('next/navigation')
vi.mock('@clerk/nextjs')
vi.mock('@/hooks/use-admin-coupons')
vi.mock('@/hooks/use-coupon-mutations')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}))

const mockRouter = vi.mocked(useRouter)
const mockUseUser = vi.mocked(useUser)

describe('AdminCouponDashboard', () => {
  const user = userEvent.setup()
  const mockPush = vi.fn()
  const mockOnCouponSelect = vi.fn()
  
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
      value: 20
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
      value: 1000
    },
    {
      ...mockCoupon,
      _id: 'coupon3',
      code: 'EXPIRED30',
      name: '만료된 쿠폰',
      isActive: true,
      usageCount: 100,
      usageLimit: 100,
      validUntil: new Date(Date.now() - 86400000).toISOString() // 어제 만료
    }
  ]

  const mockUseAdminCoupons = vi.fn()
  const mockUseCouponUpdate = vi.fn()
  const mockUpdateCoupon = vi.fn()

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

    mockUseAdminCoupons.mockReturnValue({
      coupons: mockCoupons,
      isLoading: false,
      error: null,
      stats: {
        total: 3,
        active: 1,
        expired: 1,
        usageRate: 0.53
      }
    })

    mockUseCouponUpdate.mockReturnValue(mockUpdateCoupon)
    
    // Import mocks after setting up
    vi.doMock('@/hooks/use-admin-coupons', () => ({
      useAdminCoupons: mockUseAdminCoupons
    }))
    
    vi.doMock('@/hooks/use-coupon-mutations', () => ({
      useCouponUpdate: mockUseCouponUpdate
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('권한 관리', () => {
    it('관리자가 아닌 경우 접근 거부 화면이 표시되어야 함', () => {
      mockUseUser.mockReturnValue({
        user: { ...mockUser, publicMetadata: { role: 'user' } } as any,
        isLoaded: true,
        isSignedIn: true,
      } as any)

      render(<AdminCouponDashboard />)
      
      expect(screen.getByText('접근 권한이 없습니다')).toBeInTheDocument()
    })

    it('로그인하지 않은 경우 접근 거부 화면이 표시되어야 함', () => {
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: true,
        isSignedIn: false,
      } as any)

      render(<AdminCouponDashboard />)
      
      expect(screen.getByText('접근 권한이 없습니다')).toBeInTheDocument()
    })

    it('관리자인 경우 대시보드가 표시되어야 함', () => {
      render(<AdminCouponDashboard />)
      
      expect(screen.getByText('쿠폰 관리')).toBeInTheDocument()
      expect(screen.getByText('새 쿠폰 생성')).toBeInTheDocument()
    })
  })

  describe('대시보드 렌더링', () => {
    it('통계 정보가 올바르게 표시되어야 함', () => {
      render(<AdminCouponDashboard />)
      
      expect(screen.getByText('전체 쿠폰')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('활성 쿠폰')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('만료 쿠폰')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('평균 사용률')).toBeInTheDocument()
      expect(screen.getByText('53%')).toBeInTheDocument()
    })

    it('로딩 상태에서 스켈레톤이 표시되어야 함', () => {
      mockUseAdminCoupons.mockReturnValue({
        coupons: null,
        isLoading: true,
        error: null,
        stats: null
      })

      render(<AdminCouponDashboard />)
      
      expect(screen.getByTestId('coupon-dashboard-skeleton')).toBeInTheDocument()
    })

    it('에러 상태가 올바르게 처리되어야 함', () => {
      mockUseAdminCoupons.mockReturnValue({
        coupons: null,
        isLoading: false,
        error: '데이터를 불러올 수 없습니다',
        stats: null
      })

      render(<AdminCouponDashboard />)
      
      expect(screen.getByText('데이터를 불러올 수 없습니다')).toBeInTheDocument()
    })
  })

  describe('필터링 기능', () => {
    it('검색 기능이 올바르게 작동해야 함', async () => {
      render(<AdminCouponDashboard />)
      
      const searchInput = screen.getByPlaceholderText('쿠폰 코드 또는 이름으로 검색...')
      await user.type(searchInput, 'ACTIVE')
      
      expect(searchInput).toHaveValue('ACTIVE')
      
      // 디바운스 후 필터링된 결과 확인
      await waitFor(() => {
        expect(mockUseAdminCoupons).toHaveBeenCalledWith(
          expect.objectContaining({
            searchTerm: 'ACTIVE'
          })
        )
      }, { timeout: 1000 })
    })

    it('상태 필터가 올바르게 작동해야 함', async () => {
      render(<AdminCouponDashboard />)
      
      const statusFilter = screen.getByRole('combobox', { name: /상태 필터/ })
      await user.click(statusFilter)
      
      const activeOption = screen.getByText('활성')
      await user.click(activeOption)
      
      await waitFor(() => {
        expect(mockUseAdminCoupons).toHaveBeenCalledWith(
          expect.objectContaining({
            isActive: true
          })
        )
      })
    })

    it('타입 필터가 올바르게 작동해야 함', async () => {
      render(<AdminCouponDashboard />)
      
      const typeFilter = screen.getByRole('combobox', { name: /타입 필터/ })
      await user.click(typeFilter)
      
      const percentageOption = screen.getByText('비율 할인')
      await user.click(percentageOption)
      
      await waitFor(() => {
        expect(mockUseAdminCoupons).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'percentage'
          })
        )
      })
    })

    it('정렬 기능이 올바르게 작동해야 함', async () => {
      render(<AdminCouponDashboard />)
      
      const sortSelect = screen.getByRole('combobox', { name: /정렬/ })
      await user.click(sortSelect)
      
      const usageOption = screen.getByText('사용량 순')
      await user.click(usageOption)
      
      await waitFor(() => {
        expect(mockUseAdminCoupons).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'usage'
          })
        )
      })
    })
  })

  describe('벌크 작업', () => {
    it('전체 선택/해제가 올바르게 작동해야 함', async () => {
      render(<AdminCouponDashboard />)
      
      const selectAllCheckbox = screen.getByLabelText('모든 쿠폰 선택')
      await user.click(selectAllCheckbox)
      
      // 모든 개별 체크박스가 선택되었는지 확인
      const individualCheckboxes = screen.getAllByRole('checkbox', { name: /쿠폰 선택/ })
      individualCheckboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked()
      })
    })

    it('개별 쿠폰 선택이 올바르게 작동해야 함', async () => {
      render(<AdminCouponDashboard />)
      
      const firstCouponCheckbox = screen.getByLabelText('쿠폰 선택: ACTIVE20')
      await user.click(firstCouponCheckbox)
      
      expect(firstCouponCheckbox).toBeChecked()
      expect(screen.getByText('1개 선택됨')).toBeInTheDocument()
    })

    it('선택된 쿠폰들을 일괄 활성화할 수 있어야 함', async () => {
      render(<AdminCouponDashboard />)
      
      // 쿠폰 선택
      const firstCouponCheckbox = screen.getByLabelText('쿠폰 선택: INACTIVE10')
      await user.click(firstCouponCheckbox)
      
      // 일괄 활성화
      const activateButton = screen.getByText('선택 활성화')
      await user.click(activateButton)
      
      await waitFor(() => {
        expect(mockUpdateCoupon).toHaveBeenCalledWith({
          id: 'coupon2',
          isActive: true
        })
      })
    })

    it('선택된 쿠폰들을 일괄 비활성화할 수 있어야 함', async () => {
      render(<AdminCouponDashboard />)
      
      // 쿠폰 선택
      const firstCouponCheckbox = screen.getByLabelText('쿠폰 선택: ACTIVE20')
      await user.click(firstCouponCheckbox)
      
      // 일괄 비활성화
      const deactivateButton = screen.getByText('선택 비활성화')
      await user.click(deactivateButton)
      
      await waitFor(() => {
        expect(mockUpdateCoupon).toHaveBeenCalledWith({
          id: 'coupon1',
          isActive: false
        })
      })
    })

    it('선택된 쿠폰들을 CSV로 내보낼 수 있어야 함', async () => {
      const mockDownloadCSV = vi.fn()
      vi.doMock('@/lib/coupon-utils', () => ({
        getCouponStatus: vi.fn(() => 'active'),
        convertToCSV: vi.fn(() => 'csv,data'),
        downloadCSV: mockDownloadCSV
      }))

      render(<AdminCouponDashboard />)
      
      // 쿠폰 선택
      const firstCouponCheckbox = screen.getByLabelText('쿠폰 선택: ACTIVE20')
      await user.click(firstCouponCheckbox)
      
      // CSV 내보내기
      const exportButton = screen.getByText('CSV 내보내기')
      await user.click(exportButton)
      
      await waitFor(() => {
        expect(mockDownloadCSV).toHaveBeenCalled()
      })
    })
  })

  describe('쿠폰 생성', () => {
    it('새 쿠폰 생성 버튼 클릭 시 생성 페이지로 이동해야 함', async () => {
      render(<AdminCouponDashboard />)
      
      const createButton = screen.getByText('새 쿠폰 생성')
      await user.click(createButton)
      
      expect(mockPush).toHaveBeenCalledWith('/admin/coupons/create')
    })
  })

  describe('쿠폰 목록 표시', () => {
    it('쿠폰 카드들이 올바르게 렌더링되어야 함', () => {
      render(<AdminCouponDashboard />)
      
      expect(screen.getByText('ACTIVE20')).toBeInTheDocument()
      expect(screen.getByText('활성 쿠폰')).toBeInTheDocument()
      expect(screen.getByText('INACTIVE10')).toBeInTheDocument()
      expect(screen.getByText('비활성 쿠폰')).toBeInTheDocument()
      expect(screen.getByText('EXPIRED30')).toBeInTheDocument()
      expect(screen.getByText('만료된 쿠폰')).toBeInTheDocument()
    })

    it('쿠폰 상태 배지가 올바르게 표시되어야 함', () => {
      render(<AdminCouponDashboard />)
      
      // 활성 쿠폰
      expect(screen.getByText('활성')).toBeInTheDocument()
      // 비활성 쿠폰
      expect(screen.getByText('비활성')).toBeInTheDocument()
      // 만료된 쿠폰 (사용량 완료)
      expect(screen.getByText('사용 완료')).toBeInTheDocument()
    })

    it('쿠폰 사용률이 올바르게 표시되어야 함', () => {
      render(<AdminCouponDashboard />)
      
      // ACTIVE20: 10/100 = 10%
      expect(screen.getByText('10% 사용됨')).toBeInTheDocument()
      // INACTIVE10: 50/100 = 50%
      expect(screen.getByText('50% 사용됨')).toBeInTheDocument()
      // EXPIRED30: 100/100 = 100%
      expect(screen.getByText('100% 사용됨')).toBeInTheDocument()
    })
  })

  describe('컴팩트 모드', () => {
    it('컴팩트 모드에서는 간소화된 UI가 표시되어야 함', () => {
      render(<AdminCouponDashboard compact={true} />)
      
      // 통계 카드가 표시되지 않아야 함
      expect(screen.queryByText('전체 쿠폰')).not.toBeInTheDocument()
      
      // 쿠폰 목록만 표시
      expect(screen.getByText('ACTIVE20')).toBeInTheDocument()
    })
  })

  describe('콜백 함수', () => {
    it('쿠폰 선택 시 onCouponSelect 콜백이 호출되어야 함', async () => {
      render(<AdminCouponDashboard onCouponSelect={mockOnCouponSelect} />)
      
      const couponCard = screen.getByText('ACTIVE20').closest('[role="button"]')
      if (couponCard) {
        await user.click(couponCard)
        expect(mockOnCouponSelect).toHaveBeenCalledWith(mockCoupons[0])
      }
    })
  })

  describe('빈 상태', () => {
    it('쿠폰이 없을 때 빈 상태가 표시되어야 함', () => {
      mockUseAdminCoupons.mockReturnValue({
        coupons: [],
        isLoading: false,
        error: null,
        stats: {
          total: 0,
          active: 0,
          expired: 0,
          usageRate: 0
        }
      })

      render(<AdminCouponDashboard />)
      
      expect(screen.getByText('등록된 쿠폰이 없습니다')).toBeInTheDocument()
      expect(screen.getByText('새 쿠폰을 생성해보세요')).toBeInTheDocument()
    })

    it('검색 결과가 없을 때 적절한 메시지가 표시되어야 함', () => {
      mockUseAdminCoupons.mockReturnValue({
        coupons: [],
        isLoading: false,
        error: null,
        stats: null
      })

      render(<AdminCouponDashboard initialFilter={{ searchTerm: 'NOTFOUND' }} />)
      
      expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('적절한 ARIA 레이블과 역할이 설정되어야 함', () => {
      render(<AdminCouponDashboard />)
      
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('search')).toBeInTheDocument()
      expect(screen.getByLabelText('모든 쿠폰 선택')).toBeInTheDocument()
      
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAccessibleName()
      })
    })

    it('키보드 네비게이션이 올바르게 작동해야 함', async () => {
      render(<AdminCouponDashboard />)
      
      // Tab을 통한 네비게이션
      await user.tab()
      expect(screen.getByText('새 쿠폰 생성')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByPlaceholderText('쿠폰 코드 또는 이름으로 검색...')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('combobox', { name: /상태 필터/ })).toHaveFocus()
    })
  })
})