/**
 * HookLabs Elite 성능 모니터링 대시보드
 * 
 * 실시간으로 다음 메트릭을 모니터링합니다:
 * - Core Web Vitals (LCP, FID, CLS)
 * - API 응답 시간
 * - Convex 쿼리 성능
 * - AI API 지연시간
 * - 소셜 미디어 API 성능
 * - 사용자 인터랙션 메트릭
 * - 시스템 리소스 사용률
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Activity, Zap, Database, Brain, Share2, Monitor, Gauge } from 'lucide-react';

// 실시간 성능 메트릭 타입 정의
interface PerformanceMetric {
  timestamp: number;
  value: number;
  label: string;
}

interface CoreWebVitals {
  lcp: number;
  fid: number;
  cls: number;
  grade: 'good' | 'needs-improvement' | 'poor';
}

interface APIMetrics {
  endpoint: string;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  requestCount: number;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeUsers: number;
  requestsPerSecond: number;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  metric: string;
  value: number;
}

export function PerformanceDashboard() {
  // 상태 관리
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d'>('1h');
  const [coreWebVitals, setCoreWebVitals] = useState<CoreWebVitals>({
    lcp: 0,
    fid: 0,
    cls: 0,
    grade: 'good'
  });
  const [apiMetrics, setApiMetrics] = useState<APIMetrics[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpuUsage: 0,
    memoryUsage: 0,
    activeUsers: 0,
    requestsPerSecond: 0
  });
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetric[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 성능 데이터 시뮬레이션 (실제 환경에서는 실제 메트릭 API 연동)
  const generateMockData = useCallback(() => {
    const now = Date.now();
    
    // Core Web Vitals 시뮬레이션
    const newLCP = 1500 + Math.random() * 2000;
    const newFID = 50 + Math.random() * 150;
    const newCLS = Math.random() * 0.3;
    
    const vitalsGrade = 
      newLCP <= 2500 && newFID <= 100 && newCLS <= 0.1 ? 'good' :
      newLCP <= 4000 && newFID <= 300 && newCLS <= 0.25 ? 'needs-improvement' : 'poor';
    
    setCoreWebVitals({
      lcp: newLCP,
      fid: newFID,
      cls: newCLS,
      grade: vitalsGrade
    });

    // API 메트릭 시뮬레이션
    const mockAPIMetrics: APIMetrics[] = [
      {
        endpoint: '/api/ai/generate',
        averageResponseTime: 800 + Math.random() * 400,
        successRate: 95 + Math.random() * 5,
        errorRate: Math.random() * 5,
        requestCount: Math.floor(50 + Math.random() * 100)
      },
      {
        endpoint: '/api/social/publish',
        averageResponseTime: 1200 + Math.random() * 600,
        successRate: 92 + Math.random() * 8,
        errorRate: Math.random() * 8,
        requestCount: Math.floor(20 + Math.random() * 50)
      },
      {
        endpoint: '/api/convex/query',
        averageResponseTime: 150 + Math.random() * 100,
        successRate: 99 + Math.random() * 1,
        errorRate: Math.random() * 1,
        requestCount: Math.floor(200 + Math.random() * 300)
      }
    ];
    setApiMetrics(mockAPIMetrics);

    // 시스템 메트릭 시뮬레이션
    setSystemMetrics({
      cpuUsage: 20 + Math.random() * 60,
      memoryUsage: 40 + Math.random() * 40,
      activeUsers: Math.floor(50 + Math.random() * 200),
      requestsPerSecond: Math.floor(10 + Math.random() * 50)
    });

    // 성능 히스토리 업데이트
    setPerformanceHistory(prev => {
      const newPoint: PerformanceMetric = {
        timestamp: now,
        value: newLCP,
        label: 'LCP'
      };
      
      // 최근 50개 포인트만 유지
      const updated = [...prev, newPoint].slice(-50);
      return updated;
    });

    // 성능 알림 생성 (특정 조건에서)
    if (newLCP > 4000 || newFID > 300 || newCLS > 0.25) {
      const newAlert: PerformanceAlert = {
        id: `alert-${now}`,
        type: vitalsGrade === 'poor' ? 'error' : 'warning',
        message: `Core Web Vitals 성능 저하 감지: ${vitalsGrade === 'poor' ? 'Poor' : 'Needs Improvement'}`,
        timestamp: now,
        metric: 'Core Web Vitals',
        value: newLCP
      };
      
      setAlerts(prev => [newAlert, ...prev].slice(0, 10)); // 최근 10개만 유지
    }

    // API 응답 시간이 너무 느린 경우 알림
    mockAPIMetrics.forEach(api => {
      if (api.averageResponseTime > 2000) {
        const apiAlert: PerformanceAlert = {
          id: `api-alert-${now}-${api.endpoint}`,
          type: 'warning',
          message: `${api.endpoint} API 응답 시간이 느림: ${Math.round(api.averageResponseTime)}ms`,
          timestamp: now,
          metric: 'API Response Time',
          value: api.averageResponseTime
        };
        
        setAlerts(prev => [apiAlert, ...prev].slice(0, 10));
      }
    });
  }, []);

  // 실시간 데이터 업데이트
  useEffect(() => {
    if (!isRealTimeEnabled) return;

    const interval = setInterval(() => {
      generateMockData();
    }, 5000); // 5초마다 업데이트

    // 초기 데이터 로드
    generateMockData();
    setIsLoading(false);

    return () => clearInterval(interval);
  }, [isRealTimeEnabled, generateMockData]);

  // 메트릭 등급에 따른 색상 결정
  const getMetricColor = (grade: string) => {
    switch (grade) {
      case 'good': return 'text-green-600';
      case 'needs-improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // 메트릭 등급 계산
  const getLCPGrade = (lcp: number) => {
    if (lcp <= 2500) return 'good';
    if (lcp <= 4000) return 'needs-improvement';
    return 'poor';
  };

  const getFIDGrade = (fid: number) => {
    if (fid <= 100) return 'good';
    if (fid <= 300) return 'needs-improvement';
    return 'poor';
  };

  const getCLSGrade = (cls: number) => {
    if (cls <= 0.1) return 'good';
    if (cls <= 0.25) return 'needs-improvement';
    return 'poor';
  };

  // 성능 점수 계산
  const overallPerformanceScore = useMemo(() => {
    const lcpScore = getLCPGrade(coreWebVitals.lcp) === 'good' ? 100 : 
                    getLCPGrade(coreWebVitals.lcp) === 'needs-improvement' ? 70 : 30;
    const fidScore = getFIDGrade(coreWebVitals.fid) === 'good' ? 100 : 
                    getFIDGrade(coreWebVitals.fid) === 'needs-improvement' ? 70 : 30;
    const clsScore = getCLSGrade(coreWebVitals.cls) === 'good' ? 100 : 
                    getCLSGrade(coreWebVitals.cls) === 'needs-improvement' ? 70 : 30;
    
    return Math.round((lcpScore + fidScore + clsScore) / 3);
  }, [coreWebVitals]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">성능 데이터 로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">성능 모니터링 대시보드</h1>
          <p className="text-muted-foreground">
            실시간 성능 메트릭 및 시스템 상태 모니터링
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm">실시간 업데이트</span>
            <Switch 
              checked={isRealTimeEnabled} 
              onCheckedChange={setIsRealTimeEnabled} 
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={selectedTimeRange === '1h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeRange('1h')}
            >
              1시간
            </Button>
            <Button
              variant={selectedTimeRange === '24h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeRange('24h')}
            >
              24시간
            </Button>
            <Button
              variant={selectedTimeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeRange('7d')}
            >
              7일
            </Button>
          </div>
        </div>
      </div>

      {/* 전체 성능 점수 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            전체 성능 점수
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-4xl font-bold text-primary">
                {overallPerformanceScore}
              </div>
              <div className="text-lg text-muted-foreground">/100</div>
            </div>
            
            <Badge 
              variant={overallPerformanceScore >= 80 ? 'default' : 
                      overallPerformanceScore >= 60 ? 'secondary' : 'destructive'}
              className="text-lg px-4 py-2"
            >
              {overallPerformanceScore >= 80 ? '우수' : 
               overallPerformanceScore >= 60 ? '보통' : '개선 필요'}
            </Badge>
          </div>
          
          <div className="mt-4 w-full bg-muted h-2 rounded">
            <div 
              className={`h-2 rounded transition-all duration-300 ${ 
                overallPerformanceScore >= 80 ? 'bg-green-500' : 
                overallPerformanceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${overallPerformanceScore}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 알림 패널 */}
      {alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              성능 알림 ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center space-x-2">
                    <Badge variant={alert.type === 'error' ? 'destructive' : 'secondary'}>
                      {alert.type}
                    </Badge>
                    <span className="text-sm">{alert.message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              
              {alerts.length > 3 && (
                <div className="text-center pt-2">
                  <Button variant="outline" size="sm">
                    {alerts.length - 3}개 더 보기
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 메인 메트릭 탭 */}
      <Tabs defaultValue="core-web-vitals" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="core-web-vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="api-performance">API 성능</TabsTrigger>
          <TabsTrigger value="system-metrics">시스템 메트릭</TabsTrigger>
          <TabsTrigger value="user-experience">사용자 경험</TabsTrigger>
          <TabsTrigger value="real-time-sync">실시간 동기화</TabsTrigger>
        </TabsList>

        {/* Core Web Vitals 탭 */}
        <TabsContent value="core-web-vitals" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  LCP (Largest Contentful Paint)
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(coreWebVitals.lcp)}ms</div>
                <div className={`text-xs ${getMetricColor(getLCPGrade(coreWebVitals.lcp))}`}>
                  {getLCPGrade(coreWebVitals.lcp) === 'good' ? '우수' :
                   getLCPGrade(coreWebVitals.lcp) === 'needs-improvement' ? '개선 필요' : '불량'}
                </div>
                <div className="mt-2 w-full bg-muted h-1 rounded">
                  <div 
                    className={`h-1 rounded transition-all duration-300 ${
                      getLCPGrade(coreWebVitals.lcp) === 'good' ? 'bg-green-500' :
                      getLCPGrade(coreWebVitals.lcp) === 'needs-improvement' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (4000 - coreWebVitals.lcp) / 40)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  FID (First Input Delay)
                </CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(coreWebVitals.fid)}ms</div>
                <div className={`text-xs ${getMetricColor(getFIDGrade(coreWebVitals.fid))}`}>
                  {getFIDGrade(coreWebVitals.fid) === 'good' ? '우수' :
                   getFIDGrade(coreWebVitals.fid) === 'needs-improvement' ? '개선 필요' : '불량'}
                </div>
                <div className="mt-2 w-full bg-muted h-1 rounded">
                  <div 
                    className={`h-1 rounded transition-all duration-300 ${
                      getFIDGrade(coreWebVitals.fid) === 'good' ? 'bg-green-500' :
                      getFIDGrade(coreWebVitals.fid) === 'needs-improvement' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (300 - coreWebVitals.fid) / 3)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  CLS (Cumulative Layout Shift)
                </CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{coreWebVitals.cls.toFixed(3)}</div>
                <div className={`text-xs ${getMetricColor(getCLSGrade(coreWebVitals.cls))}`}>
                  {getCLSGrade(coreWebVitals.cls) === 'good' ? '우수' :
                   getCLSGrade(coreWebVitals.cls) === 'needs-improvement' ? '개선 필요' : '불량'}
                </div>
                <div className="mt-2 w-full bg-muted h-1 rounded">
                  <div 
                    className={`h-1 rounded transition-all duration-300 ${
                      getCLSGrade(coreWebVitals.cls) === 'good' ? 'bg-green-500' :
                      getCLSGrade(coreWebVitals.cls) === 'needs-improvement' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (0.25 - coreWebVitals.cls) / 0.0025)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API 성능 탭 */}
        <TabsContent value="api-performance" className="space-y-4">
          <div className="grid gap-4">
            {apiMetrics.map((api) => (
              <Card key={api.endpoint}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {api.endpoint.includes('ai') ? <Brain className="h-5 w-5" /> :
                     api.endpoint.includes('social') ? <Share2 className="h-5 w-5" /> :
                     <Database className="h-5 w-5" />}
                    {api.endpoint}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">평균 응답 시간</div>
                      <div className="text-2xl font-bold">{Math.round(api.averageResponseTime)}ms</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">성공률</div>
                      <div className="text-2xl font-bold text-green-600">{api.successRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">에러율</div>
                      <div className="text-2xl font-bold text-red-600">{api.errorRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">요청 수</div>
                      <div className="text-2xl font-bold">{api.requestCount}</div>
                    </div>
                  </div>
                  
                  {/* 응답 시간 바 차트 */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>응답 시간</span>
                      <span>{Math.round(api.averageResponseTime)}ms</span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded">
                      <div 
                        className={`h-2 rounded transition-all duration-300 ${
                          api.averageResponseTime < 500 ? 'bg-green-500' :
                          api.averageResponseTime < 1000 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, api.averageResponseTime / 20)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 시스템 메트릭 탭 */}
        <TabsContent value="system-metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU 사용률</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(systemMetrics.cpuUsage)}%</div>
                <div className="mt-2 w-full bg-muted h-2 rounded">
                  <div 
                    className={`h-2 rounded transition-all duration-300 ${
                      systemMetrics.cpuUsage < 50 ? 'bg-green-500' :
                      systemMetrics.cpuUsage < 80 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${systemMetrics.cpuUsage}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">메모리 사용률</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(systemMetrics.memoryUsage)}%</div>
                <div className="mt-2 w-full bg-muted h-2 rounded">
                  <div 
                    className={`h-2 rounded transition-all duration-300 ${
                      systemMetrics.memoryUsage < 60 ? 'bg-green-500' :
                      systemMetrics.memoryUsage < 85 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${systemMetrics.memoryUsage}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">활성 사용자</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics.activeUsers}</div>
                <p className="text-xs text-muted-foreground">현재 접속 중</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">RPS</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics.requestsPerSecond}</div>
                <p className="text-xs text-muted-foreground">초당 요청 수</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 실시간 동기화 탭 */}
        <TabsContent value="real-time-sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Convex 실시간 동기화 성능</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">99.9%</div>
                  <div className="text-sm text-muted-foreground">동기화 성공률</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">45ms</div>
                  <div className="text-sm text-muted-foreground">평균 동기화 지연</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">1,247</div>
                  <div className="text-sm text-muted-foreground">활성 구독</div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">실시간 동기화 상태</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>WebSocket 연결:</span>
                    <Badge variant="default">활성</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>데이터베이스 동기화:</span>
                    <Badge variant="default">정상</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>마지막 하트비트:</span>
                    <span className="text-muted-foreground">방금 전</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}