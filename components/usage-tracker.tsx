'use client'

import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity,
  AlertTriangle,
  TrendingUp,
  Zap,
  Target,
  Clock,
  BarChart3,
  Loader2,
  Eye,
} from "lucide-react";
import { format, startOfDay, subDays, endOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface UsageTrackerProps {
  showHeader?: boolean;
  compact?: boolean;
}

export default function UsageTracker({ showHeader = true, compact = false }: UsageTrackerProps) {
  const { user } = useUser();

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

  // 색상 팔레트
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  // 가짜 데이터 생성 (실제 구현에서는 실제 데이터를 사용)
  const generateMockData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, 'MM/dd'),
        fullDate: format(date, 'yyyy-MM-dd'),
        usage: Math.floor(Math.random() * 1000) + 100,
        requests: Math.floor(Math.random() * 800) + 50,
        storage: Math.floor(Math.random() * 200) + 20,
        bandwidth: Math.floor(Math.random() * 150) + 10,
      };
    });
    return last7Days;
  };

  const generateHourlyData = () => {
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      usage: Math.floor(Math.random() * 100) + 10,
    }));
  };

  // 사용량 퍼센티지 계산
  const getUsagePercentage = () => {
    if (!usageData?.subscription || !usageData.subscription.usageLimit) {
      return 0;
    }
    return (usageData.subscription.currentUsage / usageData.subscription.usageLimit) * 100;
  };

  // 사용량 색상 반환
  const getUsageColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 90) return 'text-orange-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  // 로딩 상태
  if (usageData === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // 구독이 없는 경우
  if (!usageData?.subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            사용량 추적
          </CardTitle>
          <CardDescription>
            활성 구독이 필요합니다.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const usagePercentage = getUsagePercentage();
  const mockDailyData = generateMockData();
  const mockHourlyData = generateHourlyData();

  // 리소스 타입별 사용량 데이터
  const resourceUsageData = usageData.usageByType ? 
    Object.entries(usageData.usageByType).map(([type, data]) => ({
      name: type,
      value: data.amount,
      unit: data.unit,
    })) : [];

  const compactView = (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">이번 달 사용량</span>
          <Badge variant={usagePercentage >= 90 ? "destructive" : "secondary"}>
            {Math.round(usagePercentage)}%
          </Badge>
        </div>
        <Progress value={Math.min(usagePercentage, 100)} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{usageData.subscription.currentUsage?.toLocaleString() || 0}</span>
          <span>{usageData.subscription.usageLimit?.toLocaleString() || "무제한"}</span>
        </div>
      </CardContent>
    </Card>
  );

  if (compact) return compactView;

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">사용량 추적</h2>
          <Badge variant="outline" className="flex items-center">
            <Eye className="mr-1 h-3 w-3" />
            실시간 모니터링
          </Badge>
        </div>
      )}

      {/* 사용량 경고 */}
      {usageAlerts && usageAlerts.length > 0 && (
        <div className="space-y-3">
          {usageAlerts.map((alert, index) => (
            <Alert key={index} variant={alert.severity === "error" ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>{alert.message}</span>
                  <Badge variant="outline">
                    {Math.round(alert.percentage)}%
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* 사용량 게이지 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 전체 사용량 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 사용량</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageData.subscription.currentUsage?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {usageData.subscription.usageUnit || "requests"}
            </p>
            <div className="mt-2">
              <Progress 
                value={Math.min(usagePercentage, 100)} 
                className="h-2" 
              />
              <div className="flex justify-between text-xs mt-1">
                <span className={getUsageColor(usagePercentage)}>
                  {Math.round(usagePercentage)}%
                </span>
                <span className="text-muted-foreground">
                  한도: {usageData.subscription.usageLimit?.toLocaleString() || "무제한"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 일평균 사용량 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">일평균 사용량</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((usageData.subscription.currentUsage || 0) / new Date().getDate()).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {usageData.subscription.usageUnit || "requests"}/일
            </p>
          </CardContent>
        </Card>

        {/* 남은 사용량 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">남은 사용량</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageData.subscription.usageLimit ? 
                Math.max(0, usageData.subscription.usageLimit - (usageData.subscription.currentUsage || 0)).toLocaleString() :
                "무제한"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              이번 달 남은 한도
            </p>
          </CardContent>
        </Card>

        {/* 리셋까지 남은 시간 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">리셋까지</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()}일
            </div>
            <p className="text-xs text-muted-foreground">
              다음 달 1일 리셋
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 초과 사용량 경고 */}
      {usageData.subscription.overage && usageData.subscription.overage > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>한도 초과 사용량: {usageData.subscription.overage.toLocaleString()}</strong>
                <p className="text-sm mt-1">
                  초과 사용 요금이 발생할 수 있습니다.
                </p>
              </div>
              {usageData.subscription.overageRate && (
                <Badge variant="destructive">
                  {(usageData.subscription.overage * usageData.subscription.overageRate / 100).toLocaleString()}원
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 사용량 차트 */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">일별 트렌드</TabsTrigger>
          <TabsTrigger value="hourly">시간별 트렌드</TabsTrigger>
          <TabsTrigger value="resources">리소스별</TabsTrigger>
        </TabsList>

        {/* 일별 트렌드 */}
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>지난 7일간 사용량</CardTitle>
              <CardDescription>
                일별 사용량 변화 추이
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockDailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date"
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      labelFormatter={(label) => `날짜: ${label}`}
                      formatter={(value: number) => [value.toLocaleString(), '사용량']}
                    />
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

        {/* 시간별 트렌드 */}
        <TabsContent value="hourly">
          <Card>
            <CardHeader>
              <CardTitle>오늘의 시간별 사용량</CardTitle>
              <CardDescription>
                24시간 사용량 분포
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockHourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour"
                      formatter={(value) => `${value}시`}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      labelFormatter={(label) => `${label}시`}
                      formatter={(value: number) => [value.toLocaleString(), '사용량']}
                    />
                    <Bar 
                      dataKey="usage" 
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 리소스별 사용량 */}
        <TabsContent value="resources">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>리소스별 사용량 분포</CardTitle>
                <CardDescription>
                  사용 중인 리소스 유형별 분석
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resourceUsageData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={resourceUsageData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {resourceUsageData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [value.toLocaleString(), '사용량']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    사용량 데이터가 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>리소스별 상세 정보</CardTitle>
                <CardDescription>
                  각 리소스 유형의 사용량 상세
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {resourceUsageData.length > 0 ? (
                    resourceUsageData.map((resource, index) => (
                      <div key={resource.name} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-3"
                            style={{ backgroundColor: colors[index % colors.length] }}
                          />
                          <span className="font-medium">{resource.name}</span>
                        </div>
                        <Badge variant="outline">
                          {resource.value.toLocaleString()} {resource.unit}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      아직 리소스 사용 데이터가 없습니다.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 최근 사용량 기록 */}
      {usageData.usageRecords && usageData.usageRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>최근 사용량 기록</CardTitle>
            <CardDescription>
              최근 20개의 사용량 기록
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {usageData.usageRecords.map((record, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{record.resourceType}</Badge>
                    <span className="text-sm">{record.description || `${record.resourceType} 사용`}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {record.amount.toLocaleString()} {record.unit}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(record.recordedAt), "MM/dd HH:mm", { locale: ko })}
                    </div>
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