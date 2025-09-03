"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, Search, Filter, Download, CheckSquare, Square } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAdminCoupons } from "@/hooks/use-admin-coupons";
import { useCouponUpdate } from "@/hooks/use-coupon-mutations";
import { CouponCard } from "@/components/coupons/shared/coupon-card";
import { AccessDenied } from "@/components/coupons/shared/access-denied";
import { getCouponStatus, convertToCSV, downloadCSV } from "@/lib/coupon-utils";
import { AdminCouponDashboardSkeleton } from "@/components/coupons/shared/coupon-skeletons";
import type { CouponDashboardProps, CouponFilters } from "@/types/coupon";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export function AdminCouponDashboard({
  initialFilter,
  pageSize = 20,
  onCouponSelect,
  showActions = true,
  compact = false
}: CouponDashboardProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<CouponFilters>({
    isActive: initialFilter?.isActive,
    searchTerm: initialFilter?.searchTerm || '',
    sortBy: 'created',
    sortOrder: 'desc'
  });

  const [selectedCoupons, setSelectedCoupons] = useState<Set<Id<"coupons">>>(new Set());
  const [bulkActionDialog, setBulkActionDialog] = useState<{
    isOpen: boolean;
    action: 'activate' | 'deactivate' | 'delete';
    count: number;
  }>({ isOpen: false, action: 'activate', count: 0 });
  
  const { coupons, isLoading, isAdmin } = useAdminCoupons(filters.isActive, 100);
  const { updateCoupon } = useCouponUpdate();

  // 권한 확인
  if (!isAdmin) {
    return <AccessDenied />;
  }

  const filteredAndSortedCoupons = useMemo(() => {
    if (!coupons) return [];

    let filtered = coupons;

    // 검색 필터
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(coupon =>
        coupon.code.toLowerCase().includes(searchLower) ||
        coupon.name.toLowerCase().includes(searchLower) ||
        coupon.description?.toLowerCase().includes(searchLower)
      );
    }

    // 정렬
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (filters.sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'created':
          compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'usage':
          compareValue = a.usageCount - b.usageCount;
          break;
        case 'expiry':
          const aExpiry = a.validUntil ? new Date(a.validUntil).getTime() : Infinity;
          const bExpiry = b.validUntil ? new Date(b.validUntil).getTime() : Infinity;
          compareValue = aExpiry - bExpiry;
          break;
        default:
          compareValue = 0;
      }
      
      return filters.sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [coupons, filters]);

  const handleSelectCoupon = useCallback((couponId: Id<"coupons">, selected: boolean) => {
    setSelectedCoupons(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(couponId);
      } else {
        newSet.delete(couponId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedCoupons.size === filteredAndSortedCoupons.length) {
      setSelectedCoupons(new Set());
    } else {
      setSelectedCoupons(new Set(filteredAndSortedCoupons.map(c => c._id)));
    }
  }, [selectedCoupons.size, filteredAndSortedCoupons]);

  const handleBulkAction = useCallback(async () => {
    const { action } = bulkActionDialog;
    const couponIds = Array.from(selectedCoupons);
    
    try {
      for (const couponId of couponIds) {
        if (action === 'activate' || action === 'deactivate') {
          await updateCoupon(couponId, { 
            isActive: action === 'activate' 
          });
        }
        // Delete action would require a new mutation in the backend
      }
      
      const actionText = {
        activate: '활성화',
        deactivate: '비활성화',
        delete: '삭제'
      }[action];
      
      toast.success(`${couponIds.length}개의 쿠폰이 ${actionText}되었습니다.`);
      setSelectedCoupons(new Set());
    } catch (error) {
      toast.error('작업 중 오류가 발생했습니다.');
    }
    
    setBulkActionDialog({ isOpen: false, action: 'activate', count: 0 });
  }, [bulkActionDialog, selectedCoupons, updateCoupon]);

  const handleExportCSV = useCallback(() => {
    if (!filteredAndSortedCoupons.length) return;

    const csvData = filteredAndSortedCoupons.map(coupon => ({
      '쿠폰코드': coupon.code,
      '쿠폰명': coupon.name,
      '설명': coupon.description || '',
      '타입': coupon.type,
      '할인값': coupon.value,
      '최소주문금액': coupon.minAmount || 0,
      '최대할인금액': coupon.maxDiscount || 0,
      '사용제한': coupon.usageLimit || 0,
      '사용횟수': coupon.usageCount,
      '사용자제한': coupon.userLimit || 0,
      '유효기간시작': coupon.validFrom,
      '유효기간종료': coupon.validUntil || '',
      '활성상태': coupon.isActive ? '활성' : '비활성',
      '생성일': coupon.createdAt,
      '수정일': coupon.updatedAt
    }));

    const csv = convertToCSV(csvData);
    downloadCSV(csv, `coupons-${new Date().toISOString().split('T')[0]}.csv`);
  }, [filteredAndSortedCoupons]);

  const statusCounts = useMemo(() => {
    if (!coupons) return { all: 0, active: 0, inactive: 0, expired: 0 };
    
    return coupons.reduce((acc, coupon) => {
      acc.all++;
      const status = getCouponStatus(coupon);
      if (status === 'active') acc.active++;
      else if (status === 'inactive') acc.inactive++;
      else if (status === 'expired') acc.expired++;
      return acc;
    }, { all: 0, active: 0, inactive: 0, expired: 0 });
  }, [coupons]);

  if (isLoading) {
    return <AdminCouponDashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">쿠폰 관리</h1>
          <p className="text-muted-foreground">
            총 {statusCounts.all}개 쿠폰 (활성: {statusCounts.active}개, 비활성: {statusCounts.inactive}개)
          </p>
        </div>
        
        <Button onClick={() => router.push('/dashboard/admin/coupons/create')}>
          <Plus className="h-4 w-4 mr-2" />
          새 쿠폰 생성
        </Button>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="쿠폰명, 코드 또는 설명 검색..."
                value={filters.searchTerm || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-9"
              />
            </div>
            
            <Select
              value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
              onValueChange={(value) => {
                setFilters(prev => ({ 
                  ...prev, 
                  isActive: value === 'all' ? undefined : value === 'active'
                }));
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 ({statusCounts.all})</SelectItem>
                <SelectItem value="active">활성 ({statusCounts.active})</SelectItem>
                <SelectItem value="inactive">비활성 ({statusCounts.inactive})</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onValueChange={(value) => {
                const [sortBy, sortOrder] = value.split('-') as [typeof filters.sortBy, typeof filters.sortOrder];
                setFilters(prev => ({ ...prev, sortBy, sortOrder }));
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created-desc">최신순</SelectItem>
                <SelectItem value="created-asc">오래된순</SelectItem>
                <SelectItem value="name-asc">이름순</SelectItem>
                <SelectItem value="usage-desc">사용량 많은순</SelectItem>
                <SelectItem value="usage-asc">사용량 적은순</SelectItem>
                <SelectItem value="expiry-asc">만료임박순</SelectItem>
              </SelectContent>
            </Select>
            
            {filteredAndSortedCoupons.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                내보내기
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 대량 작업 바 */}
      {selectedCoupons.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox 
                  checked={selectedCoupons.size === filteredAndSortedCoupons.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="font-medium">
                  {selectedCoupons.size}개 쿠폰 선택됨
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkActionDialog({ 
                    isOpen: true, 
                    action: 'activate',
                    count: selectedCoupons.size
                  })}
                >
                  활성화
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkActionDialog({ 
                    isOpen: true, 
                    action: 'deactivate',
                    count: selectedCoupons.size
                  })}
                >
                  비활성화
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedCoupons(new Set())}
                >
                  선택 해제
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 쿠폰 목록 */}
      {filteredAndSortedCoupons.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Filter className="h-16 w-16 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">
                  {filters.searchTerm ? '검색 결과가 없습니다' : '쿠폰이 없습니다'}
                </p>
                <p className="text-muted-foreground">
                  {filters.searchTerm ? '다른 검색어를 입력해보세요' : '새로운 쿠폰을 생성해보세요'}
                </p>
              </div>
              {!filters.searchTerm && (
                <Button onClick={() => router.push('/dashboard/admin/coupons/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  쿠폰 생성
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={cn("grid gap-4", compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
          {filteredAndSortedCoupons.map((coupon) => (
            <div key={coupon._id} className="relative">
              {showActions && (
                <div className="absolute top-4 left-4 z-10">
                  <Checkbox
                    checked={selectedCoupons.has(coupon._id)}
                    onCheckedChange={(checked) => handleSelectCoupon(coupon._id, !!checked)}
                    className="bg-white shadow-sm"
                  />
                </div>
              )}
              
              <CouponCard
                coupon={coupon}
                variant={compact ? 'compact' : 'default'}
                showActions={showActions}
                onEdit={() => router.push(`/dashboard/admin/coupons/${coupon._id}/edit`)}
                onToggleStatus={() => updateCoupon(coupon._id, { isActive: !coupon.isActive })}
                className={cn(
                  "cursor-pointer transition-all",
                  selectedCoupons.has(coupon._id) && "ring-2 ring-primary ring-offset-2",
                  showActions && "ml-8"
                )}
                onClick={() => {
                  onCouponSelect?.(coupon._id);
                  router.push(`/dashboard/admin/coupons/${coupon._id}`);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* 대량 작업 확인 다이얼로그 */}
      <AlertDialog 
        open={bulkActionDialog.isOpen} 
        onOpenChange={(open) => 
          setBulkActionDialog(prev => ({ ...prev, isOpen: open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>작업 확인</AlertDialogTitle>
            <AlertDialogDescription>
              선택된 {bulkActionDialog.count}개의 쿠폰을{' '}
              {{
                activate: '활성화',
                deactivate: '비활성화', 
                delete: '삭제'
              }[bulkActionDialog.action]}
              하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkAction}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

AdminCouponDashboard.displayName = 'AdminCouponDashboard';