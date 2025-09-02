'use client'

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Check, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  Calculator,
  Zap,
  Crown,
  Shield,
  Info,
  ArrowRight,
  XCircle,
} from "lucide-react";
import { PricingPlan } from "@/types/pricing";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface EnhancedPricingTableProps {
  plans: PricingPlan[];
  onSelectPlan?: (plan: PricingPlan) => void;
  showComparison?: boolean;
  showProration?: boolean;
}

export default function EnhancedPricingTable({ 
  plans, 
  onSelectPlan, 
  showComparison = true,
  showProration = true
}: EnhancedPricingTableProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

  // 현재 사용자 구독 정보 조회
  const userSubscription = useQuery(
    api.subscriptions.getUserSubscription,
    user ? { userId: user.id as any } : "skip"
  );

  // 크레딧 잔액 조회
  const creditBalance = useQuery(
    api.credits.getUserCreditBalance,
    user ? { userId: user.id as any } : "skip"
  );

  // 프로레이션 계산
  const calculateProration = (newPlan: PricingPlan) => {
    if (!userSubscription || !userSubscription.renewsAt) return null;

    const currentPrice = userSubscription.price;
    const newPrice = isYearly ? newPlan.price * 10 : newPlan.price; // 연간 할인 적용
    const renewDate = new Date(userSubscription.renewsAt);
    const today = new Date();
    const daysRemaining = Math.max(0, Math.ceil((renewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const daysInMonth = 30; // 간소화된 계산

    // 현재 플랜의 미사용 금액
    const unusedAmount = Math.round((currentPrice * daysRemaining) / daysInMonth);
    
    // 새 플랜의 비례 금액
    const proratedAmount = Math.round((newPrice * daysRemaining) / daysInMonth);
    
    // 즉시 결제할 금액
    const immediateCharge = Math.max(0, proratedAmount - unusedAmount);

    // 크레딧 적용 후 최종 금액
    const availableCredits = creditBalance?.availableCredits || 0;
    const finalAmount = Math.max(0, immediateCharge - (availableCredits * 100)); // 크레딧을 센트로 변환

    return {
      currentPrice,
      newPrice,
      daysRemaining,
      unusedAmount,
      proratedAmount,
      immediateCharge,
      availableCredits,
      finalAmount,
      creditDiscount: Math.min(immediateCharge, availableCredits * 100),
    };
  };

  // 플랜 선택 처리
  const handleSelectPlan = async (plan: PricingPlan) => {
    if (!user) {
      window.location.href = "/sign-in";
      return;
    }

    // 현재 플랜과 동일한 경우
    if (userSubscription?.planName === plan.name) {
      return;
    }

    setLoading(plan.id);

    try {
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
            isUpgrade: userSubscription ? true : false,
            currentSubscriptionId: userSubscription?.lemonSqueezySubscriptionId,
            billing: isYearly ? "yearly" : "monthly",
          },
        }),
      });

      if (!response.ok) {
        throw new Error("체크아웃 생성 실패");
      }

      const data = await response.json();
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }

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

  // 가격 포맷팅
  const formatPrice = (price: number, currency: string) => {
    const finalPrice = isYearly ? price * 10 : price; // 연간은 10개월 가격
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(finalPrice / 100);
  };

  // 플랜 상태 반환
  const getPlanStatus = (plan: PricingPlan) => {
    if (!userSubscription) return "new";
    
    if (userSubscription.planName === plan.name) {
      return "current";
    }
    
    const currentPlanIndex = plans.findIndex(p => p.name === userSubscription.planName);
    const targetPlanIndex = plans.findIndex(p => p.id === plan.id);
    
    if (targetPlanIndex > currentPlanIndex) {
      return "upgrade";
    } else if (targetPlanIndex < currentPlanIndex) {
      return "downgrade";
    }
    
    return "change";
  };

  // 플랜 상태별 아이콘
  const getPlanStatusIcon = (status: string) => {
    switch (status) {
      case "upgrade":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "downgrade":
        return <TrendingDown className="h-4 w-4 text-orange-600" />;
      case "current":
        return <Crown className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  // 플랜 상태별 버튼 텍스트
  const getPlanButtonText = (plan: PricingPlan, status: string) => {
    switch (status) {
      case "current":
        return "현재 플랜";
      case "upgrade":
        return "업그레이드";
      case "downgrade":
        return "다운그레이드";
      default:
        return plan.buttonText || "시작하기";
    }
  };

  return (
    <div className="space-y-6">
      {/* 연간/월간 토글 */}
      <div className="flex items-center justify-center space-x-4">
        <span className={`text-sm ${!isYearly ? 'font-medium' : 'text-muted-foreground'}`}>
          월간 결제
        </span>
        <Switch
          checked={isYearly}
          onCheckedChange={setIsYearly}
        />
        <span className={`text-sm ${isYearly ? 'font-medium' : 'text-muted-foreground'}`}>
          연간 결제
        </span>
        {isYearly && (
          <Badge variant="secondary" className="ml-2">
            2개월 무료!
          </Badge>
        )}
      </div>

      {/* 현재 구독 정보 */}
      {userSubscription && (
        <Alert>
          <Crown className="h-4 w-4" />
          <AlertDescription>
            현재 <strong>{userSubscription.planName}</strong> 플랜을 사용 중입니다. 
            {userSubscription.renewsAt && (
              <span className="ml-1">
                다음 결제일: {format(new Date(userSubscription.renewsAt), "PPP", { locale: ko })}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 플랜 카드들 */}
      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        {plans.map((plan) => {
          const status = getPlanStatus(plan);
          const prorationData = showProration ? calculateProration(plan) : null;
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${
                plan.popular ? "border-primary shadow-lg scale-105" : ""
              } ${status === "current" ? "border-blue-500 bg-blue-50/50" : ""}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                  인기 플랜
                </Badge>
              )}
              
              {status === "current" && (
                <Badge variant="outline" className="absolute -top-2 right-4 bg-blue-100 border-blue-300">
                  현재 플랜
                </Badge>
              )}
              
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl flex items-center justify-center">
                  {plan.name}
                  {getPlanStatusIcon(status)}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                
                <div className="mt-4">
                  <div className="flex items-center justify-center">
                    <span className="text-3xl font-bold">
                      {formatPrice(plan.price, plan.currency)}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      /{isYearly ? "년" : plan.interval}
                    </span>
                  </div>
                  
                  {isYearly && (
                    <div className="mt-1">
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(plan.price * 12, plan.currency)}/년
                      </span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        17% 할인
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                {/* 프로레이션 정보 */}
                {prorationData && status !== "current" && status !== "new" && showProration && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center text-sm font-medium mb-2">
                      <Calculator className="mr-1 h-4 w-4" />
                      {status === "upgrade" ? "업그레이드" : "다운그레이드"} 비용
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>미사용 금액 환불</span>
                        <span>-{(prorationData.unusedAmount / 100).toLocaleString()}원</span>
                      </div>
                      <div className="flex justify-between">
                        <span>새 플랜 비례 금액</span>
                        <span>+{(prorationData.proratedAmount / 100).toLocaleString()}원</span>
                      </div>
                      {prorationData.creditDiscount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>크레딧 적용</span>
                          <span>-{(prorationData.creditDiscount / 100).toLocaleString()}원</span>
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between font-medium text-foreground">
                        <span>즉시 결제</span>
                        <span>{(prorationData.finalAmount / 100).toLocaleString()}원</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 플랜 선택 버튼 */}
                <Button
                  className="w-full mb-6"
                  onClick={() => handleSelectPlan(plan)}
                  disabled={loading !== null || status === "current"}
                  variant={plan.popular ? "default" : status === "current" ? "secondary" : "outline"}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    <>
                      {getPlanStatusIcon(status)}
                      <span className="ml-2">
                        {getPlanButtonText(plan, status)}
                      </span>
                      {status !== "current" && <ArrowRight className="ml-2 h-4 w-4" />}
                    </>
                  )}
                </Button>
                
                {/* 기능 리스트 */}
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* 추가 정보 */}
                {plan.id === "pro" && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <div className="flex items-center text-sm font-medium text-blue-800 mb-1">
                      <Zap className="mr-1 h-4 w-4" />
                      Pro 플랜 특별 혜택
                    </div>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• 사용량 기반 과금으로 비용 최적화</li>
                      <li>• 월 1,000 크레딧 무료 제공</li>
                      <li>• 전담 고객 지원</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 플랜 비교 테이블 */}
      {showComparison && (
        <Card>
          <CardHeader>
            <CardTitle>플랜 비교</CardTitle>
            <CardDescription>
              각 플랜의 세부 기능을 비교해보세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">기능</th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="text-center p-4 font-medium">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-4 text-sm font-medium">월간 가격</td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="p-4 text-center">
                        <div className="font-bold">
                          {formatPrice(plan.price, plan.currency)}
                        </div>
                        {isYearly && (
                          <div className="text-xs text-muted-foreground">
                            연간 결제시
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 text-sm font-medium">API 요청</td>
                    <td className="p-4 text-center">10,000/월</td>
                    <td className="p-4 text-center">무제한</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 text-sm font-medium">스토리지</td>
                    <td className="p-4 text-center">1GB</td>
                    <td className="p-4 text-center">100GB</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 text-sm font-medium">고급 분석</td>
                    <td className="p-4 text-center">
                      <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                    </td>
                    <td className="p-4 text-center">
                      <Check className="h-4 w-4 text-green-500 mx-auto" />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 text-sm font-medium">우선 지원</td>
                    <td className="p-4 text-center">
                      <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                    </td>
                    <td className="p-4 text-center">
                      <Check className="h-4 w-4 text-green-500 mx-auto" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 추가 안내 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>주의사항:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• 플랜 변경은 즉시 적용되며, 기존 구독은 자동으로 취소됩니다.</li>
            <li>• 업그레이드 시 미사용 금액은 새 플랜에 적용됩니다.</li>
            <li>• 크레딧을 보유하고 있다면 자동으로 결제에 적용됩니다.</li>
            <li>• 언제든지 고객 포털에서 구독을 관리할 수 있습니다.</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}