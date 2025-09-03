"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AdminCouponForm } from "@/components/coupons/admin/admin-coupon-form";
import type { Id } from "@/convex/_generated/dataModel";
import type { CreateCouponFormData } from "@/types/coupon";

export default function EditCouponPage() {
  const params = useParams();
  const router = useRouter();
  const couponId = params.couponId as Id<"coupons">;

  // Fetch coupon data - using getAllCoupons as a workaround
  const allCoupons = useQuery(api.coupons.getAllCoupons, { limit: 1000 });
  const coupon = allCoupons?.find(c => c._id === couponId);

  const handleSuccess = () => {
    router.push(`/dashboard/admin/coupons/${couponId}`);
  };

  const handleCancel = () => {
    router.back();
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
          <h1 className="text-2xl font-bold">쿠폰 편집</h1>
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

  // Convert coupon data to form format
  const defaultValues: Partial<CreateCouponFormData> = {
    code: coupon.code,
    name: coupon.name,
    description: coupon.description || undefined,
    type: coupon.type as any,
    value: coupon.value,
    currency: coupon.currency || 'KRW',
    minAmount: coupon.minAmount || undefined,
    maxDiscount: coupon.maxDiscount || undefined,
    usageLimit: coupon.usageLimit || undefined,
    userLimit: coupon.userLimit || undefined,
    validFrom: new Date(coupon.validFrom),
    validUntil: coupon.validUntil ? new Date(coupon.validUntil) : undefined,
    isActive: coupon.isActive,
  };

  const hasBeenUsed = coupon.usageCount > 0;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
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
          <h1 className="text-2xl font-bold">쿠폰 편집</h1>
          <p className="text-muted-foreground">
            {coupon.name} ({coupon.code}) 편집
          </p>
        </div>
      </div>

      {/* 사용된 쿠폰 경고 */}
      {hasBeenUsed && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-medium mt-0.5">
                !
              </div>
              <div>
                <h3 className="font-medium text-orange-900">편집 제한 사항</h3>
                <p className="text-sm text-orange-800 mt-1">
                  이 쿠폰은 이미 {coupon.usageCount}회 사용되었습니다. 
                  쿠폰 코드, 타입, 할인 값 등 핵심 정보는 수정할 수 없습니다.
                </p>
                <p className="text-xs text-orange-700 mt-2">
                  수정 가능: 쿠폰명, 설명, 사용 제한, 유효기간, 활성화 상태
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 편집 폼 */}
      <div className="max-w-4xl">
        {/* Note: We would need to implement an EditCouponForm component
            or modify AdminCouponForm to handle editing */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <p className="text-lg font-medium mb-2">편집 폼 구현 중</p>
              <p className="text-muted-foreground mb-4">
                쿠폰 편집 기능은 현재 개발 중입니다.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>현재 값:</strong></p>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
                  <div>
                    <strong>코드:</strong> {coupon.code}
                  </div>
                  <div>
                    <strong>이름:</strong> {coupon.name}
                  </div>
                  <div>
                    <strong>타입:</strong> {coupon.type}
                  </div>
                  <div>
                    <strong>값:</strong> {coupon.value}
                  </div>
                  <div>
                    <strong>상태:</strong> {coupon.isActive ? '활성' : '비활성'}
                  </div>
                  <div>
                    <strong>사용횟수:</strong> {coupon.usageCount}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}