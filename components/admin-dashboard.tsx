'use client'

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  CreditCard,
  BarChart3,
  PieChart,
  Calendar,
  Target,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Eye,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

interface AdminDashboardProps {
  isAdmin?: boolean;
}

export default function AdminDashboard({ isAdmin = false }: AdminDashboardProps) {
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [loading, setLoading] = useState<string | null>(null);

  // 구독 통계 조회
  const subscriptionStats = useQuery(api.subscriptions.getSubscriptionStats);

  // 사용량 통계 조회
  const usageStats = useQuery(
    api.usage.getUsageStats,
    {
      startDate: dateRange.start,
      endDate: dateRange.end,
    }
  );

  // 모든 쿠폰 조회
  const allCoupons = useQuery(api.coupons.getAllCoupons);

  // 관리자 권한 체크
  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          관리자 권한이 필요합니다.
        </AlertDescription>
      </Alert>
    );
  }

  // 가짜 수익 데이터 생성 (실제 구현에서는 실제 데이터 사용)
  const generateRevenueData = () => {
    const days = 30;
    return Array.from({ length: days }, (_, i) => {
      const date = subDays(new Date(), days - 1 - i);
      return {
        date: format(date, 'MM/dd'),
        revenue: Math.floor(Math.random() * 5000) + 1000,
        subscriptions: Math.floor(Math.random() * 10) + 1,
        usage: Math.floor(Math.random() * 100000) + 10000,
      };
    });
  };

  const generatePlanDistribution = () => {
    return [
      { name: 'Basic', value: 65, color: '#3b82f6' },
      { name: 'Pro', value: 30, color: '#10b981' },
      { name: 'Enterprise', value: 5, color: '#8b5cf6' },
    ];
  };

  const revenueData = generateRevenueData();
  const planDistribution = generatePlanDistribution();

  // 색상 팔레트
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // 총 수익 계산
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const avgDailyRevenue = totalRevenue / revenueData.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">관리자 대시보드</h1>
        <Badge variant="outline" className="flex items-center">
          <Eye className="mr-1 h-3 w-3" />
          실시간 모니터링
        </Badge>
      </div>

      {/* 주요 메트릭 카드들 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 총 구독자 수 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 구독자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptionStats?.total.toLocaleString() || 0}
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Badge variant="secondary">
                활성: {subscriptionStats?.active || 0}
              </Badge>
              <Badge variant="outline">
                체험: {subscriptionStats?.trialCount || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 월간 수익 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">월간 수익</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₩{totalRevenue.toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              <span>일평균 ₩{Math.round(avgDailyRevenue).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* 총 사용량 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 사용량</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageStats?.totalUsage.toLocaleString() || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              활성 사용자: {usageStats?.activeUsers || 0}명
            </div>
          </CardContent>
        </Card>

        {/* 취소율 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">취소율</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptionStats?.total ? 
                Math.round((subscriptionStats.cancelled / subscriptionStats.total) * 100) : 0
              }%
            </div>
            <div className="text-sm text-muted-foreground">
              취소: {subscriptionStats?.cancelled || 0}건
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 날짜 범위 선택 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="start-date">시작일:</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                className="w-40"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="end-date">종료일:</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 차트 및 분석 탭 */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">수익 분석</TabsTrigger>
          <TabsTrigger value="subscriptions">구독 분석</TabsTrigger>
          <TabsTrigger value="usage">사용량 분석</TabsTrigger>
          <TabsTrigger value="coupons">쿠폰 관리</TabsTrigger>
        </TabsList>

        {/* 수익 분석 */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>수익 트렌드</CardTitle>
                <CardDescription>
                  지난 30일간의 일별 수익
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip 
                        formatter={(value: number) => [`₩${value.toLocaleString()}`, '수익']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>플랜별 수익 분포</CardTitle>
                <CardDescription>
                  각 플랜의 수익 기여도
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={planDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {planDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 구독 분석 */}
        <TabsContent value="subscriptions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>구독 상태별 분포</CardTitle>
                <CardDescription>
                  현재 구독 상태 현황
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                      <span>활성</span>
                    </div>
                    <Badge variant="secondary">
                      {subscriptionStats?.active || 0}건
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                      <span>취소됨</span>
                    </div>
                    <Badge variant="secondary">
                      {subscriptionStats?.cancelled || 0}건
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-500 rounded-full mr-2" />
                      <span>만료됨</span>
                    </div>
                    <Badge variant="secondary">
                      {subscriptionStats?.expired || 0}건
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
                      <span>체험 중</span>
                    </div>
                    <Badge variant="secondary">
                      {subscriptionStats?.trialCount || 0}건
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>신규 구독 트렌드</CardTitle>
                <CardDescription>
                  일별 신규 구독 추이
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar 
                        dataKey="subscriptions" 
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 사용량 분석 */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>사용량 통계</CardTitle>
              <CardDescription>
                {dateRange.start} ~ {dateRange.end} 기간의 사용량 분석
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {usageStats?.totalUsage.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">총 사용량</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {usageStats?.totalRecords.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">총 기록 수</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {usageStats?.activeUsers || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">활성 사용자</div>
                </div>
              </div>

              {usageStats?.usageByType && Object.keys(usageStats.usageByType).length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">리소스 타입별 사용량</h4>
                  <div className="space-y-2">
                    {Object.entries(usageStats.usageByType).map(([type, usage], index) => (
                      <div key={type} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-3"
                            style={{ backgroundColor: colors[index % colors.length] }}
                          />
                          <span className="font-medium">{type}</span>
                        </div>
                        <Badge variant="outline">
                          {usage.toLocaleString()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 쿠폰 관리 */}
        <TabsContent value="coupons" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">쿠폰 관리</h3>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              새 쿠폰 생성
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              {allCoupons && allCoupons.length > 0 ? (
                <div className="space-y-3">
                  {allCoupons.map((coupon) => (
                    <div key={coupon._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{coupon.name}</div>
                        <div className="text-sm text-muted-foreground">
                          코드: {coupon.code} | 타입: {coupon.type} | 
                          값: {coupon.type === 'percentage' ? `${coupon.value}%` : `${coupon.value}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          사용: {coupon.usageCount} / {coupon.usageLimit || '무제한'}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={coupon.isActive ? "default" : "secondary"}>
                          {coupon.isActive ? "활성" : "비활성"}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  등록된 쿠폰이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 시스템 상태 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            시스템 상태
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>데이터베이스</span>
              <Badge variant="default">정상</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>결제 시스템</span>
              <Badge variant="default">정상</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>API 서버</span>
              <Badge variant="default">정상</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}