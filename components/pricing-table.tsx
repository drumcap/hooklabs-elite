'use client'

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  variantId: string;
  features: string[];
  popular?: boolean;
  buttonText?: string;
}

interface PricingTableProps {
  plans: PricingPlan[];
  onSelectPlan?: (plan: PricingPlan) => void;
}

export default function PricingTable({ plans, onSelectPlan }: PricingTableProps) {
  const { user } = useUser();
  const { theme } = useTheme();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (!user) {
      // 로그인 페이지로 리다이렉트
      window.location.href = "/sign-in";
      return;
    }

    setLoading(plan.id);

    try {
      // Lemon Squeezy checkout 생성
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

      if (!response.ok) {
        throw new Error("체크아웃 생성 실패");
      }

      const data = await response.json();
      
      // 외부 결제 페이지로 리다이렉트
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }

      // 선택적으로 onSelectPlan 콜백 호출
      if (onSelectPlan) {
        onSelectPlan(plan);
      }
    } catch (error) {
      console.error("Plan selection error:", error);
      alert("결제 페이지로 이동하는 중 오류가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(price / 100); // Assuming price is in cents
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
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
            <Button
              className="w-full mb-6"
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
                plan.buttonText || "시작하기"
              )}
            </Button>
            
            <ul className="space-y-3">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// 기본 플랜 데이터 (실제 사용 시에는 props로 전달받거나 API에서 가져옴)
export const defaultPlans: PricingPlan[] = [
  {
    id: "basic",
    name: "베이직",
    description: "개인 사용자에게 적합한 플랜",
    price: 999, // $9.99 in cents
    currency: "usd",
    interval: "월",
    variantId: "your-lemon-squeezy-variant-id-1",
    features: [
      "기본 기능 접근",
      "월 1,000 요청",
      "이메일 지원",
      "기본 템플릿",
    ],
    buttonText: "베이직 플랜 시작",
  },
  {
    id: "pro",
    name: "프로",
    description: "전문가와 팀을 위한 고급 플랜",
    price: 2999, // $29.99 in cents
    currency: "usd",
    interval: "월",
    variantId: "your-lemon-squeezy-variant-id-2",
    features: [
      "모든 베이직 기능",
      "월 10,000 요청",
      "우선 지원",
      "고급 템플릿",
      "팀 협업 기능",
      "API 접근",
    ],
    popular: true,
    buttonText: "프로 플랜 시작",
  },
  {
    id: "enterprise",
    name: "엔터프라이즈",
    description: "대규모 조직을 위한 맞춤형 솔루션",
    price: 9999, // $99.99 in cents
    currency: "usd",
    interval: "월",
    variantId: "your-lemon-squeezy-variant-id-3",
    features: [
      "모든 프로 기능",
      "무제한 요청",
      "24/7 전용 지원",
      "맞춤형 통합",
      "고급 보안",
      "온프레미스 배포",
    ],
    buttonText: "엔터프라이즈 시작",
  },
];