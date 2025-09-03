"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminCouponForm } from "@/components/coupons/admin/admin-coupon-form";

export default function CreateCouponPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/dashboard/admin/coupons');
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </Button>
        <div>
          <h1 className="text-2xl font-bold">새 쿠폰 생성</h1>
          <p className="text-muted-foreground">
            새로운 할인 쿠폰을 생성합니다
          </p>
        </div>
      </div>

      {/* 쿠폰 생성 폼 */}
      <AdminCouponForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        useSteps={true}
      />
    </div>
  );
}