'use client'

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Coins,
  Gift,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Plus,
  Minus,
  History,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function CreditManager() {
  const { user } = useUser();
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  // 크레딧 잔액 조회
  const creditBalance = useQuery(
    api.credits.getUserCreditBalance,
    user ? { userId: user.id as any } : "skip"
  );

  // 크레딧 내역 조회
  const creditHistory = useQuery(
    api.credits.getCreditHistory,
    user ? { userId: user.id as any, limit: 20 } : "skip"
  );

  // 만료 예정 크레딧 조회
  const expiringCredits = useQuery(
    api.credits.getExpiringCredits,
    user ? { userId: user.id as any, daysAhead: 30 } : "skip"
  );

  // 쿠폰 사용 내역 조회
  const couponUsages = useQuery(
    api.coupons.getUserCouponUsages,
    user ? { limit: 10 } : "skip"
  );

  // 쿠폰 검증
  const validateCoupon = useQuery(
    api.coupons.validateCoupon,
    couponCode.trim() ? { 
      code: couponCode.trim(),
      userId: user?.id as any,
    } : "skip"
  );

  // 쿠폰 사용 뮤테이션
  const useCoupon = useMutation(api.coupons.useCoupon);

  // 쿠폰 적용 처리
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !user) return;

    setLoading("coupon");
    setCouponError("");
    setCouponSuccess("");

    try {
      // 쿠폰 검증
      const validation = validateCoupon;
      if (!validation?.valid) {
        setCouponError(validation?.error || "유효하지 않은 쿠폰입니다.");
        return;
      }

      // 쿠폰 사용
      await useCoupon({
        userId: user.id as any,
        couponCode: couponCode.trim(),
        discountAmount: validation.coupon.discountAmount || validation.coupon.value,
        currency: validation.coupon.currency,
      });

      setCouponSuccess(`쿠폰이 성공적으로 적용되었습니다! (${validation.coupon.name})`);
      setCouponCode("");
    } catch (error) {
      console.error("Coupon error:", error);
      setCouponError("쿠폰 적용 중 오류가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  };

  // 크레딧 타입 아이콘
  const getCreditTypeIcon = (type: string) => {
    switch (type) {
      case "earned":
        return <Gift className="h-4 w-4 text-green-600" />;
      case "purchased":
        return <ShoppingCart className="h-4 w-4 text-blue-600" />;
      case "used":
        return <Minus className="h-4 w-4 text-red-600" />;
      case "expired":
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case "refunded":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Coins className="h-4 w-4" />;
    }
  };

  // 크레딧 타입 라벨
  const getCreditTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      earned: "적립",
      purchased: "구매",
      used: "사용",
      expired: "만료",
      refunded: "환불",
      bonus: "보너스",
    };
    return labels[type] || type;
  };

  // 로딩 상태
  if (creditBalance === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">크레딧 & 쿠폰 관리</h2>
      </div>

      {/* 크레딧 잔액 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">사용 가능 크레딧</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {creditBalance?.availableCredits?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              현재 사용 가능한 크레딧
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">사용된 크레딧</CardTitle>
            <Minus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {creditBalance?.usedCredits?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              지금까지 사용한 크레딧
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">만료된 크레딧</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {creditBalance?.expiredCredits?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              만료되어 사용할 수 없는 크레딧
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 만료 예정 크레딧 경고 */}
      {expiringCredits && expiringCredits.length > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>30일 내 만료 예정 크레딧이 있습니다</strong>
                <p className="text-sm mt-1">
                  {expiringCredits.reduce((sum, credit) => sum + credit.amount, 0).toLocaleString()} 
                  크레딧이 만료 예정입니다. 빠른 시일 내에 사용해주세요.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 쿠폰 적용 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Tag className="mr-2 h-5 w-5" />
            쿠폰 적용
          </CardTitle>
          <CardDescription>
            쿠폰 코드를 입력하여 크레딧을 받거나 할인을 적용하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="coupon">쿠폰 코드</Label>
              <Input
                id="coupon"
                placeholder="쿠폰 코드를 입력하세요"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponError("");
                  setCouponSuccess("");
                }}
                className="uppercase"
              />
            </div>
            <Button
              onClick={handleApplyCoupon}
              disabled={!couponCode.trim() || loading === "coupon"}
              className="mt-6"
            >
              {loading === "coupon" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              적용
            </Button>
          </div>

          {/* 쿠폰 검증 결과 */}
          {validateCoupon && couponCode.trim() && (
            <div className="p-3 border rounded-lg">
              {validateCoupon.valid ? (
                <div className="flex items-center text-green-700">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  <div>
                    <div className="font-medium">{validateCoupon.coupon.name}</div>
                    <div className="text-sm">
                      {validateCoupon.coupon.description}
                      {validateCoupon.coupon.type === "credits" && 
                        ` (+${validateCoupon.coupon.value} 크레딧)`
                      }
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center text-red-700">
                  <XCircle className="mr-2 h-4 w-4" />
                  <div className="text-sm">{validateCoupon.error}</div>
                </div>
              )}
            </div>
          )}

          {couponError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{couponError}</AlertDescription>
            </Alert>
          )}

          {couponSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{couponSuccess}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 내역 탭 */}
      <Tabs defaultValue="credits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="credits">크레딧 내역</TabsTrigger>
          <TabsTrigger value="coupons">쿠폰 사용 내역</TabsTrigger>
          <TabsTrigger value="expiring">만료 예정</TabsTrigger>
        </TabsList>

        {/* 크레딧 내역 */}
        <TabsContent value="credits">
          <Card>
            <CardHeader>
              <CardTitle>크레딧 내역</CardTitle>
              <CardDescription>
                최근 크레딧 적립 및 사용 내역
              </CardDescription>
            </CardHeader>
            <CardContent>
              {creditHistory && creditHistory.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {creditHistory.map((credit) => (
                    <div key={credit._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getCreditTypeIcon(credit.type)}
                        <div>
                          <div className="font-medium">{credit.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(credit.createdAt), "PPP p", { locale: ko })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${
                          credit.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {credit.amount > 0 ? '+' : ''}{credit.amount.toLocaleString()}
                        </div>
                        <Badge variant="outline">
                          {getCreditTypeLabel(credit.type)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  아직 크레딧 내역이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 쿠폰 사용 내역 */}
        <TabsContent value="coupons">
          <Card>
            <CardHeader>
              <CardTitle>쿠폰 사용 내역</CardTitle>
              <CardDescription>
                지금까지 사용한 쿠폰 내역
              </CardDescription>
            </CardHeader>
            <CardContent>
              {couponUsages && couponUsages.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {couponUsages.map((usage) => (
                    <div key={usage._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Tag className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium">
                            {usage.coupon?.name || usage.coupon?.code || "쿠폰"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(usage.usedAt), "PPP p", { locale: ko })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {usage.discountAmount > 0 ? 
                            `${(usage.discountAmount / 100).toLocaleString()}원 할인` :
                            "크레딧 지급"
                          }
                        </div>
                        <Badge variant="outline">
                          {usage.coupon?.type || "쿠폰"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  아직 사용한 쿠폰이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 만료 예정 크레딧 */}
        <TabsContent value="expiring">
          <Card>
            <CardHeader>
              <CardTitle>만료 예정 크레딧</CardTitle>
              <CardDescription>
                30일 내에 만료될 크레딧 목록
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expiringCredits && expiringCredits.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {expiringCredits.map((credit) => (
                    <div key={credit._id} className="flex items-center justify-between p-3 border rounded-lg border-orange-200 bg-orange-50">
                      <div className="flex items-center space-x-3">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <div>
                          <div className="font-medium">{credit.description}</div>
                          <div className="text-sm text-orange-700">
                            만료일: {credit.expiresAt && format(new Date(credit.expiresAt), "PPP", { locale: ko })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-600">
                          {credit.amount.toLocaleString()} 크레딧
                        </div>
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          만료 예정
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  만료 예정인 크레딧이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}