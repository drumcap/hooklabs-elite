'use client'

import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Activity,
  BarChart3,
  CreditCard, 
  Calendar, 
  DollarSign, 
  Settings,
  ExternalLink,
  AlertTriangle,
  TrendingUp,
  Zap,
  Clock,
  Target,
  Loader2,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function SubscriptionDashboard() {
  const { user } = useUser();
  const [loading, setLoading] = useState<string | null>(null);

  // 사용자의 구독 정보 조회
  const userSubscription = useQuery(
    api.subscriptions.getUserSubscription,
    user ? { userId: user.id as any } : "skip"
  );

  // 사용량 데이터 조회
  const usageData = useQuery(
    api.usage.getUserUsage,
    user ? { userId: user.id as any } : "skip"
  );

  // 사용량 경고 조회
  const usageAlerts = useQuery(
    api.usage.checkUsageAlerts,
    user ? { userId: user.id as any } : "skip"
  );

  // 크레딧 잔액 조회
  const creditBalance = useQuery(
    api.credits.getUserCreditBalance,
    user ? { userId: user.id as any } : "skip"
  );

  // 결제 내역 조회
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

  // 가격 포맷팅
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(price / 100);
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

  // 사용량 차트 데이터 준비
  const prepareUsageChartData = () => {
    if (!usageData?.usageByType) return [];

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, 'MM/dd'),
        usage: Math.floor(Math.random() * 1000), // 실제 데이터로 교체 필요
      };
    });

    return last7Days;
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

  const usagePercentage = userSubscription.usageLimit && userSubscription.currentUsage
    ? (userSubscription.currentUsage / userSubscription.usageLimit) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* 사용량 경고 */}
      {usageAlerts && usageAlerts.length > 0 && (
        <div className="space-y-3">
          {usageAlerts.map((alert: any, index: number) => (
            <Alert key={index} variant={alert.severity === "error" ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* 주요 메트릭 카드들 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 현재 플랜 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">현재 플랜</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userSubscription.planName}</div>
            <div className="flex items-center justify-between mt-2">
              {getStatusBadge(userSubscription.status)}
              <p className="text-xs text-muted-foreground">
                {formatPrice(userSubscription.price, userSubscription.currency)}
                /{userSubscription.intervalUnit}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 사용량 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 사용량</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userSubscription.currentUsage?.toLocaleString() || 0}
            </div>
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span>{userSubscription.usageUnit || "requests"}</span>
                <span>
                  {userSubscription.usageLimit ? 
                    `/ ${userSubscription.usageLimit.toLocaleString()}` : 
                    "무제한"
                  }
                </span>
              </div>
              {userSubscription.usageLimit && (
                <Progress value={Math.min(usagePercentage, 100)} className="h-2" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* 크레딧 잔액 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">크레딧 잔액</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {creditBalance?.availableCredits?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              사용 가능한 크레딧
            </p>
          </CardContent>
        </Card>

        {/* 다음 결제일 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">다음 결제일</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userSubscription.renewsAt ? 
                format(new Date(userSubscription.renewsAt), "d일") : 
                "—"
              }
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {userSubscription.renewsAt ? 
                format(new Date(userSubscription.renewsAt), "yyyy년 MM월", { locale: ko }) : 
                "결제일 없음"
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 탭 컨텐츠 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="usage">사용량</TabsTrigger>
          <TabsTrigger value="billing">결제</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        {/* 개요 탭 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 구독 정보 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="mr-2 h-5 w-5" />
                  구독 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">플랜</p>
                    <p className="font-medium">{userSubscription.planName}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">상태</p>
                    {getStatusBadge(userSubscription.status)}
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

                  {userSubscription.cardBrand && userSubscription.cardLastFour && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">결제 수단</p>
                      <p className="font-medium">
                        {userSubscription.cardBrand.toUpperCase()} **** {userSubscription.cardLastFour}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                <Button
                  variant="outline"
                  onClick={handleOpenPortal}
                  disabled={loading !== null}
                  className="w-full"
                >
                  {loading === "portal" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Settings className="mr-2 h-4 w-4" />
                  )}
                  구독 관리
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>

            {/* 사용량 개요 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  사용량 개요
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold">
                    {Math.round(usagePercentage)}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    이번 달 사용률
                  </p>
                </div>

                <Progress value={Math.min(usagePercentage, 100)} className="h-3" />

                <div className="flex justify-between text-sm">
                  <span>{userSubscription.currentUsage?.toLocaleString() || 0}</span>
                  <span>{userSubscription.usageLimit?.toLocaleString() || "무제한"}</span>
                </div>

                {userSubscription.overage && userSubscription.overage > 0 && (
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <div className="flex items-center text-orange-800">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">
                        초과 사용: {userSubscription.overage.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 사용량 탭 */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>사용량 트렌드</CardTitle>
              <CardDescription>지난 7일간의 사용량 추이</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={prepareUsageChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="usage" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 결제 탭 */}
        <TabsContent value="billing" className="space-y-4">
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
                  {userPayments.map((payment: any) => (
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
        </TabsContent>

        {/* 설정 탭 */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>구독 설정</CardTitle>
              <CardDescription>
                구독 및 결제 설정을 관리하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                onClick={handleOpenPortal}
                disabled={loading !== null}
                className="w-full justify-start"
              >
                {loading === "portal" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Settings className="mr-2 h-4 w-4" />
                )}
                결제 정보 및 구독 관리
                <ExternalLink className="ml-auto h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                asChild
                className="w-full justify-start"
              >
                <a href="/pricing">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  플랜 변경하기
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}