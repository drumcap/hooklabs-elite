"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { CouponStatsChart } from "@/components/coupons/admin/coupon-stats-chart";
import { CouponCard } from "@/components/coupons/shared/coupon-card";
import { useCouponUpdate } from "@/hooks/use-coupon-mutations";
import { getCouponStatus, formatDate, formatCurrency } from "@/lib/coupon-utils";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export default function CouponDetailPage() {
  const params = useParams();
  const router = useRouter();
  const couponId = params.couponId as Id<"coupons">;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const { updateCoupon } = useCouponUpdate();

  // Fetch coupon data - using getAllCoupons as a workaround since we don't have getCoupon
  const allCoupons = useQuery(api.coupons.getAllCoupons, { limit: 1000 });
  const coupon = allCoupons?.find(c => c._id === couponId);

  const handleToggleStatus = async () => {
    if (!coupon) return;
    
    try {
      await updateCoupon(coupon._id, { isActive: !coupon.isActive });
      toast.success(`쿠폰이 ${coupon.isActive ? '비활성화' : '활성화'}되었습니다.`);
    } catch (error) {
      toast.error('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!coupon) return;
    
    try {
      // Note: We would need a deleteCoupon mutation in the backend
      // For now, we'll just show a message
      toast.info('쿠폰 삭제 기능은 아직 구현되지 않았습니다.');
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error('쿠폰 삭제 중 오류가 발생했습니다.');
    }
  };

  if (!coupon) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <h1 className="text-2xl font-bold">쿠폰 정보</h1>
        </div>
        
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-lg font-medium">쿠폰을 찾을 수 없습니다</p>
            <p className="text-muted-foreground">
              쿠폰이 삭제되었거나 존재하지 않습니다
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = getCouponStatus(coupon);
  const hasBeenUsed = coupon.usageCount > 0;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{coupon.name}</h1>
              <Badge variant={status === 'active' ? 'default' : 'secondary'}>
                {{
                  active: '활성',
                  inactive: '비활성',
                  expired: '만료',
                  depleted: '소진'
                }[status]}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono">
              {coupon.code}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => router.push(`/dashboard/admin/coupons/${couponId}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              편집
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleStatus}>
              {coupon.isActive ? (
                <>비활성화</>
              ) : (
                <>활성화</>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 쿠폰 정보 카드 */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <CouponCard 
            coupon={coupon} 
            variant="detailed"
            showActions={false}
          />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">쿠폰 세부정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">생성일:</span>
                <span>{formatDate(coupon.createdAt, true)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">수정일:</span>
                <span>{formatDate(coupon.updatedAt, true)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">타입:</span>
                <span>
                  {{
                    percentage: '퍼센트 할인',
                    fixed_amount: '고정 금액',
                    credits: '크레딧 지급'
                  }[coupon.type]}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">할인 값:</span>
                <span className="font-medium">
                  {coupon.type === 'percentage' && `${coupon.value}%`}
                  {coupon.type === 'fixed_amount' && formatCurrency(coupon.value)}
                  {coupon.type === 'credits' && `${coupon.value} 크레딧`}
                </span>
              </div>
              
              {coupon.minAmount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">최소 주문금액:</span>
                  <span>{formatCurrency(coupon.minAmount)}</span>
                </div>
              )}
              
              {coupon.maxDiscount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">최대 할인금액:</span>
                  <span>{formatCurrency(coupon.maxDiscount)}</span>
                </div>
              )}
              
              {coupon.usageLimit && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">사용 제한:</span>
                  <span>{coupon.usageLimit.toLocaleString()}회</span>
                </div>
              )}
              
              {coupon.userLimit && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">사용자별 제한:</span>
                  <span>{coupon.userLimit}회</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">현재 사용량:</span>
                <span className="font-medium text-primary">
                  {coupon.usageCount.toLocaleString()}회
                </span>
              </div>
            </div>

            {hasBeenUsed && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs text-orange-800">
                  ⚠️ 이미 사용된 쿠폰은 일부 정보만 수정할 수 있습니다
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 통계 차트 */}
      <CouponStatsChart 
        couponId={couponId}
        showExportButton={true}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>쿠폰 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 쿠폰을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              {hasBeenUsed && (
                <>
                  <br />
                  <strong className="text-destructive">
                    주의: 이 쿠폰은 이미 {coupon.usageCount}회 사용되었습니다.
                  </strong>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}