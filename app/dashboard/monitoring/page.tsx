"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, CheckCircle, XCircle, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function MonitoringDashboard() {
  const [timeRange, setTimeRange] = useState("1h");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30초

  // 실시간 데이터 쿼리
  const webVitalsSummary = useQuery(api.performanceMetrics.getWebVitalsSummary, { timeRange });
  const apiPerformance = useQuery(api.performanceMetrics.getApiPerformanceSummary, { timeRange });
  const businessMetrics = useQuery(api.performanceMetrics.getBusinessMetricsDashboard, { timeRange });
  const recentErrors = useQuery(api.performanceMetrics.getRecentErrors, { limit: 10 });
  const alertHistory = useQuery(api.alerting.getAlertHistory, { limit: 5 });

  // 자동 새로고침
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        // Convex는 자동으로 실시간 업데이트를 제공하므로 추가 작업 불필요
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Web Vitals 점수 계산
  const getWebVitalsScore = (metric: string, value: number | null) => {
    if (!value) return { score: 0, status: "unknown" };
    
    const thresholds: Record<string, { good: number; needs_improvement: number }> = {
      lcp: { good: 2500, needs_improvement: 4000 },
      fid: { good: 100, needs_improvement: 300 },
      cls: { good: 0.1, needs_improvement: 0.25 },
      fcp: { good: 1800, needs_improvement: 3000 },
      ttfb: { good: 800, needs_improvement: 1800 },
    };

    const threshold = thresholds[metric];
    if (!threshold) return { score: 50, status: "unknown" };

    if (value <= threshold.good) {
      return { score: 100, status: "good" };
    } else if (value <= threshold.needs_improvement) {
      return { score: 50, status: "needs-improvement" };
    } else {
      return { score: 0, status: "poor" };
    }
  };

  // 상태 색상 가져오기
  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-500";
      case "needs-improvement":
        return "text-yellow-500";
      case "poor":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  // 심각도 색상
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">성능 모니터링 대시보드</h1>
          <p className="text-muted-foreground">실시간 애플리케이션 성능 및 비즈니스 메트릭</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">지난 1시간</SelectItem>
              <SelectItem value="24h">지난 24시간</SelectItem>
              <SelectItem value="7d">지난 7일</SelectItem>
              <SelectItem value="30d">지난 30일</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "자동 새로고침" : "수동"}
          </Button>
        </div>
      </div>

      {/* 상태 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">시스템 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">정상</span>
              </div>
              <Badge variant="outline" className="bg-green-50">
                99.9% 가용성
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">활성 알림</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold">
                  {alertHistory?.filter((a: any) => a.status === "triggered").length || 0}
                </span>
              </div>
              <Badge variant="outline" className="bg-yellow-50">
                {alertHistory?.filter((a: any) => a.severity === "critical").length || 0} 심각
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">평균 응답 시간</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">
                  {apiPerformance?.summary.avgResponseTime.toFixed(0) || "0"}ms
                </span>
              </div>
              <Badge variant="outline" className="bg-blue-50">
                P95: {apiPerformance?.summary.p95ResponseTime.toFixed(0) || "0"}ms
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">에러율</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold">
                  {apiPerformance ? (100 - apiPerformance.summary.successRate).toFixed(2) : "0"}%
                </span>
              </div>
              <Badge variant="outline" className="bg-red-50">
                {apiPerformance?.summary.failedRequests || 0} 실패
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 메인 탭 */}
      <Tabs defaultValue="webvitals" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="webvitals">Web Vitals</TabsTrigger>
          <TabsTrigger value="api">API 성능</TabsTrigger>
          <TabsTrigger value="business">비즈니스 메트릭</TabsTrigger>
          <TabsTrigger value="errors">에러 로그</TabsTrigger>
          <TabsTrigger value="alerts">알림</TabsTrigger>
        </TabsList>

        {/* Web Vitals 탭 */}
        <TabsContent value="webvitals" className="space-y-4">
          {webVitalsSummary && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries({
                  lcp: "LCP",
                  fid: "FID",
                  cls: "CLS",
                  fcp: "FCP",
                  ttfb: "TTFB",
                  inp: "INP",
                }).map(([key, label]) => {
                  const metric = webVitalsSummary.metrics[key as keyof typeof webVitalsSummary.metrics];
                  if (!metric) return null;
                  
                  const { score, status } = getWebVitalsScore(key, metric.p75);
                  
                  return (
                    <Card key={key}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{label}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className={`text-2xl font-bold ${getStatusColor(status)}`}>
                            {metric.p75.toFixed(0)}
                            <span className="text-xs ml-1">
                              {key === "cls" ? "" : "ms"}
                            </span>
                          </div>
                          <Progress value={score} className="h-2" />
                          <div className="text-xs text-muted-foreground">
                            P50: {metric.p50.toFixed(0)} | P95: {metric.p95.toFixed(0)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* 디바이스 및 브라우저 분석 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>디바이스별 분포</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={webVitalsSummary.deviceBreakdown}
                          dataKey="count"
                          nameKey="type"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {webVitalsSummary.deviceBreakdown.map((entry: any, index: any) => (
                            <Cell key={`cell-${index}`} fill={["#0088FE", "#00C49F", "#FFBB28"][index]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>브라우저별 분포</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={webVitalsSummary.browserBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="browser" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* API 성능 탭 */}
        <TabsContent value="api" className="space-y-4">
          {apiPerformance && (
            <>
              {/* 엔드포인트별 성능 */}
              <Card>
                <CardHeader>
                  <CardTitle>엔드포인트별 성능</CardTitle>
                  <CardDescription>상위 10개 엔드포인트의 성능 지표</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {apiPerformance.endpoints.slice(0, 10).map((endpoint: any, index: any) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex-1">
                          <div className="font-medium">
                            <Badge variant="outline" className="mr-2">{endpoint.method}</Badge>
                            {endpoint.endpoint}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            호출: {endpoint.count} | 평균: {endpoint.avgResponseTime.toFixed(0)}ms | 성공률: {endpoint.successRate.toFixed(1)}%
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {endpoint.successRate < 95 && (
                            <Badge variant="destructive">성능 저하</Badge>
                          )}
                          {endpoint.avgResponseTime > 1000 && (
                            <Badge variant="destructive">느림</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 상태 코드 분포 */}
              <Card>
                <CardHeader>
                  <CardTitle>HTTP 상태 코드 분포</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={apiPerformance.statusCodeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="code" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* 비즈니스 메트릭 탭 */}
        <TabsContent value="business" className="space-y-4">
          {businessMetrics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">활성 사용자</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{businessMetrics.activeUsers || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">실시간 접속자</p>
                  </CardContent>
                </Card>

                {Object.entries(businessMetrics.metrics).map(([type, metrics]) => (
                  Object.entries(metrics as any).slice(0, 3).map(([name, data]: [string, any]) => (
                    <Card key={`${type}-${name}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">{name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{data.sum || data.count || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          평균: {data.avg?.toFixed(2) || 0}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* 에러 로그 탭 */}
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>최근 에러</CardTitle>
              <CardDescription>최근 발생한 에러 로그</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentErrors?.map((error: any, index: any) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Badge 
                      variant={error.level === "error" ? "destructive" : "secondary"}
                      className="mt-0.5"
                    >
                      {error.level}
                    </Badge>
                    <div className="flex-1">
                      <div className="font-medium">{error.message}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {error.category} • {error.pathname || error.endpoint || "Unknown"}
                      </div>
                      {error.errorStack && (
                        <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto">
                          {error.errorStack.split('\n').slice(0, 3).join('\n')}
                        </pre>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(error.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 알림 탭 */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>활성 알림</CardTitle>
              <CardDescription>현재 트리거된 알림</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alertHistory?.map((alert: any, index: any) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(alert.severity)}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{alert.ruleName}</div>
                        <Badge variant={alert.status === "triggered" ? "destructive" : "outline"}>
                          {alert.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {alert.message}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>값: {alert.metricValue.toFixed(2)}</span>
                        <span>임계값: {alert.threshold}</span>
                        <span>{new Date(alert.triggeredAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}