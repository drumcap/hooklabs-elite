/**
 * SLO 대시보드 메인 컴포넌트
 * 실시간 SLO 상태 및 에러 예산 모니터링
 */

'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Brain
} from 'lucide-react';
import { SLOMetricCard } from './SLOMetricCard';
import { ErrorBudgetChart } from './ErrorBudgetChart';
import { SLOTrendChart } from './SLOTrendChart';

export function SLODashboard() {
  // 실시간 SLO 메트릭 조회
  const webSLOs = useQuery(api.sloTracking.getServiceSLOs, { service: 'web' });
  const apiSLOs = useQuery(api.sloTracking.getServiceSLOs, { service: 'api' });
  const contentSLOs = useQuery(api.sloTracking.getServiceSLOs, { service: 'content-generation' });

  // 에러 예산 상태 조회
  const errorBudgets = useQuery(api.sloTracking.getErrorBudgetStatus, {});

  // 최근 SLO 인시던트 조회
  const recentIncidents = useQuery(api.sloTracking.getRecentIncidents, { limit: 5 });

  // 전체 SLO 상태 계산
  const overallStatus = calculateOverallStatus(webSLOs, apiSLOs, contentSLOs);

  if (!webSLOs || !apiSLOs || !contentSLOs || !errorBudgets) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 전체 상태 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 SLO 상태</CardTitle>
            {getStatusIcon(overallStatus.status)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStatus.percentage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {overallStatus.status === 'healthy' ? '모든 서비스 정상' : '일부 서비스에 문제 발생'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">에러 예산 소모</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculateAverageErrorBudgetConsumption(errorBudgets).toFixed(1)}%
            </div>
            <Progress
              value={calculateAverageErrorBudgetConsumption(errorBudgets)}
              className="w-full mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 인시던트</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentIncidents?.filter(i => !i.end_time).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              현재 진행 중인 인시던트
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLO 준수율</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculateSLOCompliance(webSLOs, apiSLOs, contentSLOs).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              지난 30일 평균
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 심각한 알림이 있는 경우 표시 */}
      {errorBudgets.some(eb => eb.status === 'critical' || eb.status === 'exhausted') && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>에러 예산 위험 상태</AlertTitle>
          <AlertDescription>
            일부 서비스의 에러 예산이 위험 수준에 도달했습니다. 즉시 확인이 필요합니다.
          </AlertDescription>
        </Alert>
      )}

      {/* 서비스별 SLO 메트릭 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Web Frontend SLOs */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            웹 프론트엔드
          </h3>
          <SLOMetricCard
            title="페이지 로딩 성능"
            value={getLatestSLO(webSLOs, 'lcp_performance')?.value || 0}
            target={95}
            unit="%"
            trend={calculateTrend(webSLOs, 'lcp_performance')}
            status={getSLOStatus(getLatestSLO(webSLOs, 'lcp_performance')?.value || 0, 95)}
          />
          <SLOMetricCard
            title="사용자 인터랙션"
            value={getLatestSLO(webSLOs, 'fid_performance')?.value || 0}
            target={95}
            unit="%"
            trend={calculateTrend(webSLOs, 'fid_performance')}
            status={getSLOStatus(getLatestSLO(webSLOs, 'fid_performance')?.value || 0, 95)}
          />
          <SLOMetricCard
            title="전체 웹 성능"
            value={getLatestSLO(webSLOs, 'overall_performance')?.value || 0}
            target={95}
            unit="%"
            trend={calculateTrend(webSLOs, 'overall_performance')}
            status={getSLOStatus(getLatestSLO(webSLOs, 'overall_performance')?.value || 0, 95)}
          />
        </div>

        {/* API Backend SLOs */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5" />
            API 백엔드
          </h3>
          <SLOMetricCard
            title="API 가용성"
            value={getLatestSLO(apiSLOs, 'availability')?.value || 0}
            target={99.9}
            unit="%"
            trend={calculateTrend(apiSLOs, 'availability')}
            status={getSLOStatus(getLatestSLO(apiSLOs, 'availability')?.value || 0, 99.9)}
          />
          <SLOMetricCard
            title="응답 지연시간"
            value={getLatestSLO(apiSLOs, 'latency')?.value || 0}
            target={95}
            unit="%"
            trend={calculateTrend(apiSLOs, 'latency')}
            status={getSLOStatus(getLatestSLO(apiSLOs, 'latency')?.value || 0, 95)}
          />
          <SLOMetricCard
            title="에러율"
            value={100 - (getLatestSLO(apiSLOs, 'error_rate')?.value || 100)}
            target={1}
            unit="%"
            trend={calculateTrend(apiSLOs, 'error_rate', true)}
            status={getSLOStatus(100 - (getLatestSLO(apiSLOs, 'error_rate')?.value || 100), 1, true)}
          />
        </div>

        {/* Content Generation SLOs */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI 콘텐츠 생성
          </h3>
          <SLOMetricCard
            title="생성 성공률"
            value={getLatestSLO(contentSLOs, 'success_rate')?.value || 0}
            target={99.5}
            unit="%"
            trend={calculateTrend(contentSLOs, 'success_rate')}
            status={getSLOStatus(getLatestSLO(contentSLOs, 'success_rate')?.value || 0, 99.5)}
          />
          <SLOMetricCard
            title="생성 지연시간"
            value={getLatestSLO(contentSLOs, 'latency')?.value || 0}
            target={95}
            unit="%"
            trend={calculateTrend(contentSLOs, 'latency')}
            status={getSLOStatus(getLatestSLO(contentSLOs, 'latency')?.value || 0, 95)}
          />
          <SLOMetricCard
            title="콘텐츠 품질"
            value={getLatestSLO(contentSLOs, 'quality')?.value || 0}
            target={90}
            unit="%"
            trend={calculateTrend(contentSLOs, 'quality')}
            status={getSLOStatus(getLatestSLO(contentSLOs, 'quality')?.value || 0, 90)}
          />
        </div>
      </div>

      {/* 에러 예산 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorBudgetChart errorBudgets={errorBudgets} />
        <SLOTrendChart
          webSLOs={webSLOs}
          apiSLOs={apiSLOs}
          contentSLOs={contentSLOs}
        />
      </div>
    </div>
  );
}

// 유틸리티 함수들
function calculateOverallStatus(webSLOs: any, apiSLOs: any, contentSLOs: any) {
  // 각 서비스의 최신 SLO 값들을 가져와서 가중 평균 계산
  const webScore = getLatestSLO(webSLOs, 'overall_performance')?.value || 0;
  const apiScore = getLatestSLO(apiSLOs, 'availability')?.value || 0;
  const contentScore = getLatestSLO(contentSLOs, 'success_rate')?.value || 0;

  const weightedAvg = (webScore * 0.3 + apiScore * 0.4 + contentScore * 0.3);

  let status: 'healthy' | 'warning' | 'critical';
  if (weightedAvg >= 99) status = 'healthy';
  else if (weightedAvg >= 95) status = 'warning';
  else status = 'critical';

  return { percentage: weightedAvg, status };
}

function calculateAverageErrorBudgetConsumption(errorBudgets: any[]) {
  if (!errorBudgets.length) return 0;
  const totalConsumption = errorBudgets.reduce((sum, eb) => sum + eb.consumed_percent, 0);
  return totalConsumption / errorBudgets.length;
}

function calculateSLOCompliance(webSLOs: any, apiSLOs: any, contentSLOs: any) {
  // 지난 30일간의 SLO 준수율 계산 (실제로는 더 복잡한 로직이 필요)
  return 98.5; // 임시 값
}

function getLatestSLO(slos: any[], metricType: string) {
  if (!slos) return null;
  return slos
    .filter(slo => slo.metric_type === metricType)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
}

function calculateTrend(slos: any[], metricType: string, invert = false) {
  if (!slos) return 'stable';

  const metrics = slos
    .filter(slo => slo.metric_type === metricType)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  if (metrics.length < 2) return 'stable';

  const recent = metrics.slice(0, 5).reduce((sum, m) => sum + m.value, 0) / 5;
  const older = metrics.slice(5, 10).reduce((sum, m) => sum + m.value, 0) / 5;

  const diff = invert ? older - recent : recent - older;

  if (diff > 1) return 'improving';
  if (diff < -1) return 'degrading';
  return 'stable';
}

function getSLOStatus(value: number, target: number, invert = false) {
  const threshold = invert ? value <= target : value >= target;
  if (threshold) return 'healthy';
  if (invert ? value <= target * 1.5 : value >= target * 0.95) return 'warning';
  return 'critical';
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'warning':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'critical':
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    default:
      return <Activity className="h-4 w-4 text-gray-600" />;
  }
}