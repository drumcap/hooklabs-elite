"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// 쿠폰 카드 스켈레톤
export function CouponCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Skeleton className="h-6 w-6 rounded mt-1" />
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <Skeleton className="h-3 w-3/4 mb-4" />
        
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <div>
              <Skeleton className="h-3 w-12 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <div>
              <Skeleton className="h-3 w-12 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 컴팩트 쿠폰 카드 스켈레톤
export function CouponCardSkeletonCompact({ className }: { className?: string }) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-4 w-4" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-right">
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 쿠폰 사용 내역 스켈레톤
export function CouponUsageHistorySkeleton({ count = 5 }: { count?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-32" />
        </div>
        
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-20" />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-18" />
                </div>
              </div>
              
              <div className="text-right">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-3 w-8 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 관리자 대시보드 스켈레톤
export function AdminCouponDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* 헤더 스켈레톤 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* 필터 카드 스켈레톤 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardContent>
      </Card>

      {/* 쿠폰 카드들 스켈레톤 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <CouponCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// 쿠폰 통계 스켈레톤
export function CouponStatsSkeleton() {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* 요약 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div>
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-5 w-20 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 차트 스켈레톤 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Skeleton className="h-6 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>

      {/* 인사이트 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex justify-between text-sm">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// 쿠폰 폼 스켈레톤
export function CouponFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        {/* 스텝 인디케이터 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center">
                <Skeleton className="h-8 w-8 rounded-full" />
                {i < 3 && <Skeleton className="w-12 h-0.5 mx-2" />}
              </div>
            ))}
          </div>
          <div className="text-center">
            <Skeleton className="h-5 w-24 mx-auto mb-2" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
          <Skeleton className="h-2 w-full mt-4" />
        </div>

        {/* 폼 필드들 */}
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-3 w-64 mt-1" />
            </div>
          ))}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="flex justify-between pt-6 border-t mt-8">
          <Skeleton className="h-9 w-16" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}