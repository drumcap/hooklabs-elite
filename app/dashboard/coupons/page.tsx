"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, History, Gift } from "lucide-react";
import { CouponValidationForm } from "@/components/coupons/user/coupon-validation-form";
import { CouponUsageHistory } from "@/components/coupons/user/coupon-usage-history";
import { useCouponUsageHistory } from "@/hooks/use-coupon-usage-history";
import { formatCurrency } from "@/lib/coupon-utils";

export default function CouponsPage() {
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const { usages } = useCouponUsageHistory(5); // Get last 5 usages for quick summary

  // Calculate total savings from usage history
  const totalSavings = usages?.reduce((sum, usage) => sum + usage.discountAmount, 0) || 0;
  const totalUsageCount = usages?.length || 0;

  return (
    <div className="space-y-8">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">쿠폰 센터</h1>
        <p className="text-muted-foreground">
          쿠폰을 적용하여 할인 혜택을 받아보세요
        </p>
      </div>

      {/* 요약 통계 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 절약 금액</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalSavings)}
            </div>
            <p className="text-xs text-muted-foreground">
              쿠폰으로 절약한 총 금액
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">사용한 쿠폰</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsageCount}</div>
            <p className="text-xs text-muted-foreground">
              지금까지 사용한 쿠폰 수
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 할인율</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalUsageCount > 0 ? (totalSavings / totalUsageCount).toLocaleString() : '0'}원
            </div>
            <p className="text-xs text-muted-foreground">
              쿠폰 당 평균 할인 금액
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 메인 컨텐츠 */}
      <Tabs defaultValue="validate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="validate" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            쿠폰 적용
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            사용 내역
          </TabsTrigger>
        </TabsList>

        <TabsContent value="validate" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* 쿠폰 검증 폼 */}
            <div>
              <CouponValidationForm
                orderAmount={50000} // 예시 주문 금액
                onCouponApplied={(coupon) => {
                  setAppliedCoupon(coupon);
                }}
                onCouponRemoved={() => {
                  setAppliedCoupon(null);
                }}
                autoFocus
              />
            </div>

            {/* 쿠폰 사용 안내 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  쿠폰 사용 안내
                </CardTitle>
                <CardDescription>
                  쿠폰을 효과적으로 사용하는 방법을 알아보세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-sm">쿠폰 코드 입력</p>
                      <p className="text-xs text-muted-foreground">
                        위의 입력 필드에 쿠폰 코드를 입력하세요
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-sm">할인 확인</p>
                      <p className="text-xs text-muted-foreground">
                        할인 금액과 조건을 확인하세요
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-sm">결제 시 적용</p>
                      <p className="text-xs text-muted-foreground">
                        결제 페이지에서 쿠폰이 자동 적용됩니다
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-sm text-blue-900 mb-2">💡 팁</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• 쿠폰은 대소문자를 구분하지 않습니다</li>
                    <li>• 일부 쿠폰은 최소 주문 금액이 있을 수 있습니다</li>
                    <li>• 쿠폰은 중복 사용이 불가능합니다</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 적용된 쿠폰 정보 */}
          {appliedCoupon && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">쿠폰이 적용되었습니다!</CardTitle>
                <CardDescription className="text-green-700">
                  결제 시 아래 할인이 적용됩니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-green-700 mb-1">적용된 쿠폰</p>
                    <p className="font-semibold text-green-800">{appliedCoupon.name}</p>
                    <p className="font-mono text-sm text-green-600">{appliedCoupon.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 mb-1">할인 금액</p>
                    <p className="text-2xl font-bold text-green-800">
                      {formatCurrency(appliedCoupon.discountAmount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <CouponUsageHistory showExport={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Fix missing import
function DollarSign({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  );
}