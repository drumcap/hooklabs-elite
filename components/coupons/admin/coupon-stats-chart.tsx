"use client";

import { useMemo, useState } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Calendar, TrendingUp, Users, DollarSign, BarChart3, Download, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCouponStats } from "@/hooks/use-coupon-stats";
import { formatCurrency, formatDate, convertToCSV, downloadCSV } from "@/lib/coupon-utils";
import { getCouponStatus, COUPON_STATUS_COLORS } from "@/lib/coupon-utils";
import type { CouponStatsViewProps } from "@/types/coupon";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'
];

export function CouponStatsChart({
  couponId,
  showExportButton = true,
  compact = false
}: CouponStatsViewProps) {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  
  const { stats, isLoading, notFound } = useCouponStats(couponId);

  const chartData = useMemo(() => {
    if (!stats?.stats.usagesByDate) return [];

    const entries = Object.entries(stats.stats.usagesByDate);
    
    // 날짜별로 정렬
    const sortedEntries = entries.sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
    
    // 시간 범위 필터링
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeRange) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case 'all':
        cutoffDate.setFullYear(now.getFullYear() - 10); // 모든 데이터
        break;
    }

    const filteredEntries = sortedEntries.filter(([date]) => 
      new Date(date) >= cutoffDate
    );

    return filteredEntries.map(([date, count]) => ({
      date,
      count,
      formattedDate: formatDate(date),
      shortDate: new Date(date).toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric' 
      })
    }));
  }, [stats?.stats.usagesByDate, timeRange]);

  const summaryStats = useMemo(() => {
    if (!stats) return null;

    const couponStatus = getCouponStatus({
      isActive: stats.coupon.usageLimit ? stats.stats.totalUsages < stats.coupon.usageLimit : true,
      validFrom: '',
      validUntil: '',
      usageCount: stats.stats.totalUsages,
      usageLimit: stats.coupon.usageLimit
    } as any);

    return {
      totalUsages: stats.stats.totalUsages,
      totalDiscount: stats.stats.totalDiscount,
      uniqueUsers: stats.stats.uniqueUsers,
      remainingUses: stats.stats.remainingUses,
      avgDiscountPerUse: stats.stats.totalUsages > 0 
        ? stats.stats.totalDiscount / stats.stats.totalUsages 
        : 0,
      usageRate: stats.coupon.usageLimit 
        ? (stats.stats.totalUsages / stats.coupon.usageLimit) * 100 
        : 0,
      status: couponStatus
    };
  }, [stats]);

  const handleExportStats = () => {
    if (!stats || !chartData.length) return;

    const csvData = [
      // 요약 정보
      { 항목: '쿠폰 정보', 값: '' },
      { 항목: '쿠폰명', 값: stats.coupon.name },
      { 항목: '쿠폰코드', 값: stats.coupon.code },
      { 항목: '쿠폰타입', 값: stats.coupon.type },
      { 항목: '할인값', 값: stats.coupon.value },
      { 항목: '', 값: '' },
      
      // 통계 정보
      { 항목: '사용 통계', 값: '' },
      { 항목: '총 사용 횟수', 값: summaryStats?.totalUsages || 0 },
      { 항목: '총 할인 금액', 값: summaryStats?.totalDiscount || 0 },
      { 항목: '고유 사용자 수', 값: summaryStats?.uniqueUsers || 0 },
      { 항목: '평균 할인 금액', 값: summaryStats?.avgDiscountPerUse || 0 },
      { 항목: '잔여 사용 횟수', 값: summaryStats?.remainingUses || '무제한' },
      { 항목: '', 값: '' },
      
      // 일별 사용량
      { 항목: '일별 사용량', 값: '' },
      ...chartData.map(item => ({
        항목: item.formattedDate,
        값: item.count
      }))
    ];

    const csv = convertToCSV(csvData);
    downloadCSV(csv, `coupon-stats-${stats.coupon.code}-${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (isLoading) {
    return (
      <Card className={cn(compact && "h-96")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-6 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (notFound || !stats) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">쿠폰을 찾을 수 없습니다</p>
          <p className="text-muted-foreground">쿠폰이 삭제되었거나 존재하지 않습니다</p>
        </CardContent>
      </Card>
    );
  }

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    description, 
    color = "text-primary" 
  }: {
    icon: any;
    label: string;
    value: string | number;
    description?: string;
    color?: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg bg-muted", color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold">{stats.coupon.name}</h2>
            <Badge 
              variant="outline" 
              className={cn("text-xs", COUPON_STATUS_COLORS[summaryStats?.status || 'active'])}
            >
              {summaryStats?.status === 'active' ? '활성' : '비활성'}
            </Badge>
          </div>
          <p className="text-muted-foreground font-mono">
            {stats.coupon.code}
          </p>
        </div>

        {showExportButton && (
          <Button variant="outline" onClick={handleExportStats}>
            <Download className="h-4 w-4 mr-2" />
            통계 내보내기
          </Button>
        )}
      </div>

      {/* 요약 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Eye}
          label="총 사용 횟수"
          value={summaryStats?.totalUsages.toLocaleString() || '0'}
          description="전체 기간"
          color="text-blue-600"
        />
        
        <StatCard
          icon={DollarSign}
          label="총 할인 금액"
          value={formatCurrency(summaryStats?.totalDiscount || 0)}
          description={summaryStats?.avgDiscountPerUse ? `평균 ${formatCurrency(summaryStats.avgDiscountPerUse)}` : undefined}
          color="text-green-600"
        />
        
        <StatCard
          icon={Users}
          label="고유 사용자"
          value={summaryStats?.uniqueUsers.toLocaleString() || '0'}
          description="중복 제거"
          color="text-purple-600"
        />
        
        <StatCard
          icon={TrendingUp}
          label="잔여 사용량"
          value={summaryStats?.remainingUses?.toLocaleString() || '무제한'}
          description={stats.coupon.usageLimit ? `${summaryStats?.usageRate.toFixed(1)}% 사용` : undefined}
          color="text-orange-600"
        />
      </div>

      {/* 차트 섹션 */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                사용량 추이
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Select
                  value={timeRange}
                  onValueChange={(value: any) => setTimeRange(value)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">최근 7일</SelectItem>
                    <SelectItem value="30d">최근 30일</SelectItem>
                    <SelectItem value="90d">최근 90일</SelectItem>
                    <SelectItem value="all">전체 기간</SelectItem>
                  </SelectContent>
                </Select>
                
                <Tabs value={chartType} onValueChange={(value: any) => setChartType(value)}>
                  <TabsList>
                    <TabsTrigger value="line">선형</TabsTrigger>
                    <TabsTrigger value="bar">막대</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="shortDate" 
                      className="text-xs fill-muted-foreground"
                    />
                    <YAxis className="text-xs fill-muted-foreground" />
                    <Tooltip
                      labelFormatter={(value, payload) => {
                        const item = payload?.[0]?.payload;
                        return item ? item.formattedDate : value;
                      }}
                      formatter={(value: number) => [value, '사용 횟수']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "hsl(var(--primary))" }}
                      activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="shortDate" 
                      className="text-xs fill-muted-foreground"
                    />
                    <YAxis className="text-xs fill-muted-foreground" />
                    <Tooltip
                      labelFormatter={(value, payload) => {
                        const item = payload?.[0]?.payload;
                        return item ? item.formattedDate : value;
                      }}
                      formatter={(value: number) => [value, '사용 횟수']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))" 
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            
            {chartData.length === 0 && (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>선택한 기간에 사용 데이터가 없습니다</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 추가 인사이트 */}
      {summaryStats && summaryStats.totalUsages > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">사용 패턴 분석</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>일 평균 사용량</span>
                  <span className="font-medium">
                    {chartData.length > 0 
                      ? (summaryStats.totalUsages / chartData.length).toFixed(1)
                      : '0'
                    }회
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>사용자당 평균 사용량</span>
                  <span className="font-medium">
                    {(summaryStats.totalUsages / summaryStats.uniqueUsers).toFixed(1)}회
                  </span>
                </div>
                
                {stats.coupon.usageLimit && (
                  <div className="flex justify-between text-sm">
                    <span>사용률</span>
                    <span className="font-medium">
                      {summaryStats.usageRate.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">쿠폰 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">타입</span>
                  <span className="font-medium">
                    {{
                      percentage: '퍼센트 할인',
                      fixed_amount: '고정 금액',
                      credits: '크레딧 지급'
                    }[stats.coupon.type]}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">할인 값</span>
                  <span className="font-medium">{stats.coupon.value}</span>
                </div>
              </div>
              
              {stats.coupon.usageLimit && (
                <div>
                  <span className="text-muted-foreground text-sm block">사용 제한</span>
                  <span className="font-medium">
                    {stats.coupon.usageLimit.toLocaleString()}회
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

CouponStatsChart.displayName = 'CouponStatsChart';