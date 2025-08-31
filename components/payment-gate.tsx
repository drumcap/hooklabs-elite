'use client'

import { ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import PricingTable, { defaultPlans } from "./pricing-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock } from "lucide-react";

interface PaymentGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredPlan?: string;
  title?: string;
  description?: string;
}

export default function PaymentGate({ 
  children, 
  fallback,
  requiredPlan,
  title = "프리미엄 기능",
  description = "이 기능을 사용하려면 유료 플랜이 필요합니다."
}: PaymentGateProps) {
  const { user, isLoaded } = useUser();

  // 사용자의 구독 정보 조회 (Clerk external ID 사용)
  const hasActiveSubscription = useQuery(
    api.subscriptions.hasActiveSubscriptionByExternalId,
    user ? { externalId: user.id } : "skip"
  );

  // 특정 플랜 확인은 아직 external ID 버전이 없으므로 임시 비활성화
  // TODO: hasSubscriptionToPlanByExternalId 함수 구현 필요
  const hasRequiredPlan = undefined;

  // 로딩 상태
  if (!isLoaded || hasActiveSubscription === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // 로그인하지 않은 경우
  if (!user) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <CardTitle>로그인이 필요합니다</CardTitle>
          <CardDescription>
            이 기능을 사용하려면 먼저 로그인해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a 
            href="/sign-in" 
            className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            로그인
          </a>
        </CardContent>
      </Card>
    );
  }

  // 구독 여부 확인
  const hasAccess = requiredPlan 
    ? hasRequiredPlan 
    : hasActiveSubscription;

  // 접근 권한이 있는 경우 콘텐츠 표시
  if (hasAccess) {
    return <>{children}</>;
  }

  // 커스텀 fallback이 있는 경우
  if (fallback) {
    return <>{fallback}</>;
  }

  // 기본 업그레이드 UI
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <Lock className="h-16 w-16 mx-auto text-muted-foreground" />
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground mt-2">{description}</p>
        </div>
      </div>
      
      <PricingTable plans={defaultPlans} />
    </div>
  );
}

// 특정 플랜 전용 게이트
export function PlanGate({ 
  children, 
  planName, 
  fallback 
}: { 
  children: ReactNode; 
  planName: string; 
  fallback?: ReactNode; 
}) {
  return (
    <PaymentGate
      requiredPlan={planName}
      title={`${planName} 플랜 전용 기능`}
      description={`이 기능은 ${planName} 플랜 이상에서 사용할 수 있습니다.`}
      fallback={fallback}
    >
      {children}
    </PaymentGate>
  );
}

// 간단한 프리미엄 체크 훅
export function usePremiumStatus() {
  const { user } = useUser();
  
  const hasActiveSubscription = useQuery(
    api.subscriptions.hasActiveSubscriptionByExternalId,
    user ? { externalId: user.id } : "skip"
  );

  return {
    isPremium: !!hasActiveSubscription,
    isLoading: hasActiveSubscription === undefined,
  };
}