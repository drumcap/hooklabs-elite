'use client'

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Loader2, ArrowRight, AlertCircle, X } from "lucide-react";
import { useTheme } from "next-themes";
import { PricingPlan } from "@/types/pricing";

interface PricingTableProps {
  plans: PricingPlan[];
  onSelectPlan?: (plan: PricingPlan) => void;
}

export default function PricingTable({ plans, onSelectPlan }: PricingTableProps) {
  const { user } = useUser();
  const { theme } = useTheme();
  const [loading, setLoading] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // 에러 자동 숨김 (10초 후)
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (!user) {
      // 로그인 페이지로 리다이렉트
      window.location.href = "/sign-in";
      return;
    }

    setError(null);
    setLoading(plan.id);
    setLoadingStep('결제 정보 생성 중...');
    setLoadingProgress(10);

    try {
      // Lemon Squeezy checkout 생성
      setLoadingProgress(30);
      
      const response = await fetch("/api/lemonsqueezy/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variantId: plan.variantId,
          email: user.emailAddresses[0]?.emailAddress,
          name: user.fullName || user.firstName || "Customer",
          customData: {
            planId: plan.id,
            planName: plan.name,
          },
        }),
      });

      setLoadingProgress(60);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`결제 정보 생성 실패: ${response.status}`);
      }

      const data = await response.json();
      
      setLoadingProgress(80);
      setLoadingStep('결제 페이지로 이동 중...');
      
      // 외부 결제 페이지로 리다이렉트
      if (data.checkoutUrl) {
        setLoadingProgress(100);
        // 약간의 지연 후 리다이렉트 (사용자가 진행 상황을 볼 수 있도록)
        setTimeout(() => {
          window.location.href = data.checkoutUrl;
        }, 1000);
      } else {
        throw new Error('결제 URL을 받지 못했습니다');
      }

      // 선택적으로 onSelectPlan 콜백 호출
      if (onSelectPlan) {
        onSelectPlan(plan);
      }
    } catch (error) {
      console.error("Plan selection error:", error);
      setError(error instanceof Error ? error.message : '결제 페이지로 이동하는 중 오류가 발생했습니다');
      setLoading(null);
      setLoadingStep('');
      setLoadingProgress(0);
    }
    // finally 블록 제거 - 리다이렉트 후에는 상태 초기화가 필요 없음
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(price / 100); // Assuming price is in cents
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:gap-8 mt-8">
      {plans.map((plan) => (
        <Card 
          key={plan.id} 
          className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}
        >
          {plan.popular && (
            <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
              인기 플랜
            </Badge>
          )}
          
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
            <div className="mt-4">
              <span className="text-3xl font-bold">
                {formatPrice(plan.price, plan.currency)}
              </span>
              <span className="text-muted-foreground ml-1">
                /{plan.interval}
              </span>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* 기능 목록 */}
            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            
            {/* 버튼 및 상태 메시지 */}
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => handleSelectPlan(plan)}
                disabled={loading !== null}
                variant={plan.popular ? "default" : "outline"}
              >
                {loading === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    {plan.buttonText || `${plan.name} 플랜 시작`}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              
              {/* 로딩 단계 표시 */}
              {loading === plan.id && loadingStep && (
                <div className="space-y-2">
                  <Progress value={loadingProgress} className="h-1" />
                  <div className="flex items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    {loadingStep}
                  </div>
                </div>
              )}
              
              {/* 에러 메시지 표시 */}
              {error && (
                <div className="flex items-center justify-between text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-200 dark:border-red-800">
                  <div className="flex items-center">
                    <AlertCircle className="mr-2 h-3 w-3 flex-shrink-0" />
                    <span className="flex-1">{error}</span>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="ml-2 text-red-400 hover:text-red-600 transition-colors"
                    aria-label="에러 메시지 닫기"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

