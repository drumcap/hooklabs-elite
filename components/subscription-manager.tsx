'use client'

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Settings,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function SubscriptionManager() {
  const { user } = useUser();
  const [loading, setLoading] = useState<string | null>(null);

  // 사용자의 구독 정보 조회
  const userSubscription = useQuery(
    api.subscriptions.getUserSubscription,
    user ? { userId: user.id as any } : "skip"
  );

  // 사용자의 결제 내역 조회
  const userPayments = useQuery(
    api.subscriptions.getUserPayments,
    user ? { userId: user.id as any } : "skip"
  );

  // 고객 포털 열기
  const handleOpenPortal = async () => {
    if (!userSubscription?.lemonSqueezyCustomerId) return;

    setLoading("portal");
    
    try {
      const response = await fetch("/api/lemonsqueezy/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: userSubscription.lemonSqueezyCustomerId,
        }),
      });

      if (!response.ok) {
        throw new Error("포털 열기 실패");
      }

      const data = await response.json();
      
      if (data.portalUrl) {
        window.open(data.portalUrl, "_blank");
      }
    } catch (error) {
      console.error("Portal error:", error);
      alert("고객 포털을 여는 중 오류가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  };

  // 구독 취소
  const handleCancelSubscription = async () => {
    if (!userSubscription?.lemonSqueezySubscriptionId) return;
    
    const confirmed = confirm("정말 구독을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.");
    if (!confirmed) return;

    setLoading("cancel");
    
    try {
      const response = await fetch("/api/lemonsqueezy/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: userSubscription.lemonSqueezySubscriptionId,
          action: "cancel",
        }),
      });

      if (!response.ok) {
        throw new Error("구독 취소 실패");
      }

      alert("구독이 취소되었습니다.");
      // 페이지 새로고침 또는 상태 업데이트
      window.location.reload();
    } catch (error) {
      console.error("Cancel error:", error);
      alert("구독 취소 중 오류가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  };

  // 상태에 따른 배지 색상
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      cancelled: "destructive", 
      expired: "secondary",
      on_trial: "outline",
    };
    
    const labels: Record<string, string> = {
      active: "활성",
      cancelled: "취소됨",
      expired: "만료됨", 
      on_trial: "체험 중",
      past_due: "연체",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  // 가격 포맷팅
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(price / 100);
  };

  // 로딩 상태
  if (userSubscription === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // 구독이 없는 경우
  if (!userSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            구독 정보
          </CardTitle>
          <CardDescription>
            현재 활성 구독이 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/pricing">플랜 보기</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 구독 정보 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              현재 구독
            </span>
            {getStatusBadge(userSubscription.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">플랜</p>
              <p className="font-medium">{userSubscription.planName}</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">가격</p>
              <p className="font-medium">
                {formatPrice(userSubscription.price, userSubscription.currency)}
                <span className="text-sm text-muted-foreground ml-1">
                  /{userSubscription.intervalCount} {userSubscription.intervalUnit}
                </span>
              </p>
            </div>

            {userSubscription.renewsAt && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">다음 결제일</p>
                <p className="font-medium flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  {format(new Date(userSubscription.renewsAt), "PPP", { locale: ko })}
                </p>
              </div>
            )}

            {userSubscription.cardBrand && userSubscription.cardLastFour && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">결제 수단</p>
                <p className="font-medium">
                  {userSubscription.cardBrand.toUpperCase()} **** **** **** {userSubscription.cardLastFour}
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleOpenPortal}
              disabled={loading !== null}
              className="flex items-center"
            >
              {loading === "portal" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Settings className="mr-2 h-4 w-4" />
              )}
              구독 관리
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>

            {userSubscription.status === "active" && (
              <Button
                variant="destructive"
                onClick={handleCancelSubscription}
                disabled={loading !== null}
              >
                {loading === "cancel" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="mr-2 h-4 w-4" />
                )}
                구독 취소
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 결제 내역 카드 */}
      {userPayments && userPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              최근 결제 내역
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userPayments.map((payment) => (
                <div 
                  key={payment._id} 
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{payment.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(payment.createdAt), "PPP", { locale: ko })}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-medium">
                      {formatPrice(payment.total, payment.currency)}
                    </p>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}