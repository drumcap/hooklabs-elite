'use client';

import { useEffect, useState } from 'react';
import { performanceMonitor } from '@/lib/performance-metrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

export function PerformanceMonitor() {
  const [report, setReport] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 개발 환경에서만 표시
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
      
      // 5초마다 리포트 업데이트
      const interval = setInterval(() => {
        const newReport = performanceMonitor.generateReport();
        setReport(newReport);
      }, 5000);

      // 초기 리포트 생성
      setTimeout(() => {
        const initialReport = performanceMonitor.generateReport();
        setReport(initialReport);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, []);

  if (!isVisible || !report) return null;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge variant="default" className="bg-green-500">우수</Badge>;
    if (score >= 70) return <Badge variant="default" className="bg-yellow-500">양호</Badge>;
    return <Badge variant="destructive">개선 필요</Badge>;
  };

  const formatMetricValue = (value: number | null, unit: string = 'ms') => {
    if (value === null) return '측정 중...';
    return `${value.toFixed(2)}${unit}`;
  };

  const getMetricStatus = (metric: string, value: number | null) => {
    if (value === null) return null;
    
    const thresholds: Record<string, { good: number; bad: number; reverse?: boolean }> = {
      LCP: { good: 2500, bad: 4000 },
      FID: { good: 100, bad: 300 },
      CLS: { good: 0.1, bad: 0.25 },
      FCP: { good: 1800, bad: 3000 },
      TTFB: { good: 800, bad: 1800 },
      INP: { good: 200, bad: 500 },
    };

    const threshold = thresholds[metric];
    if (!threshold) return null;

    if (value <= threshold.good) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (value <= threshold.bad) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[600px] overflow-auto">
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">성능 모니터</CardTitle>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getScoreColor(report.score)}`}>
                {report.score}
              </span>
              {getScoreBadge(report.score)}
            </div>
          </div>
          <CardDescription>실시간 성능 메트릭</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Web Vitals */}
          <div>
            <h3 className="font-semibold mb-2 text-sm">Core Web Vitals</h3>
            <div className="space-y-2">
              {Object.entries(report.webVitals).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{key}:</span>
                    {getMetricStatus(key, value as number | null)}
                  </div>
                  <span className="font-mono">
                    {key === 'CLS' 
                      ? formatMetricValue(value as number | null, '') 
                      : formatMetricValue(value as number | null)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Memory Usage */}
          <div>
            <h3 className="font-semibold mb-2 text-sm">메모리 사용량</h3>
            <div className="space-y-2">
              <Progress value={report.memory.usagePercentage || 0} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {((report.memory.usedJSHeapSize || 0) / 1024 / 1024).toFixed(2)} MB
                </span>
                <span>
                  {((report.memory.jsHeapSizeLimit || 0) / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            </div>
          </div>

          {/* API Performance */}
          {report.api.averageResponseTime > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-sm">API 성능</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>평균 응답 시간:</span>
                  <span className="font-mono">
                    {report.api.averageResponseTime.toFixed(2)}ms
                  </span>
                </div>
                {report.api.slowestEndpoints.length > 0 && (
                  <div className="text-xs space-y-1">
                    <span className="text-muted-foreground">느린 엔드포인트:</span>
                    {report.api.slowestEndpoints.slice(0, 3).map((endpoint: any, idx: number) => (
                      <div key={idx} className="flex justify-between pl-2">
                        <span className="truncate max-w-[200px]">
                          {endpoint.endpoint.split('/').pop()}
                        </span>
                        <span className="font-mono text-red-500">
                          {endpoint.responseTime.toFixed(0)}ms
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cache Effectiveness */}
          <div>
            <h3 className="font-semibold mb-2 text-sm">캐시 효율성</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {report.cache.effectiveness >= 70 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm">Hit Rate</span>
              </div>
              <span className="font-mono text-sm">
                {report.cache.effectiveness.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Realtime Metrics */}
          {report.realtime.activeConnections > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-sm">실시간 연결</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>활성 연결:</span>
                  <span>{report.realtime.activeConnections}</span>
                </div>
                <div className="flex justify-between">
                  <span>연결 지연:</span>
                  <span className="font-mono">
                    {report.realtime.connectionLatency.toFixed(2)}ms
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-sm">개선 권장사항</h3>
              <div className="space-y-1">
                {report.recommendations.map((rec: string, idx: number) => (
                  <div key={idx} className="text-xs text-muted-foreground">
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}