/**
 * SLO 메트릭 카드 컴포넌트
 * 개별 SLO 메트릭의 현재 상태와 트렌드를 표시
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';

interface SLOMetricCardProps {
  title: string;
  value: number;
  target: number;
  unit: string;
  trend: 'improving' | 'degrading' | 'stable';
  status: 'healthy' | 'warning' | 'critical';
  description?: string;
}

export function SLOMetricCard({
  title,
  value,
  target,
  unit,
  trend,
  status,
  description
}: SLOMetricCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className=\"h-4 w-4 text-green-600\" />;
      case 'warning':
        return <AlertTriangle className=\"h-4 w-4 text-yellow-600\" />;
      case 'critical':
        return <XCircle className=\"h-4 w-4 text-red-600\" />;
      default:
        return <Minus className=\"h-4 w-4 text-gray-600\" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className=\"h-4 w-4 text-green-600\" />;
      case 'degrading':
        return <TrendingDown className=\"h-4 w-4 text-red-600\" />;
      case 'stable':
        return <Minus className=\"h-4 w-4 text-gray-600\" />;
      default:
        return <Minus className=\"h-4 w-4 text-gray-600\" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return '정상';
      case 'warning':
        return '주의';
      case 'critical':
        return '위험';
      default:
        return '알 수 없음';
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '개선';
      case 'degrading':
        return '악화';
      case 'stable':
        return '안정';
      default:
        return '안정';
    }
  };

  // 목표 대비 진행률 계산
  const progressValue = Math.min((value / target) * 100, 100);
  const isAboveTarget = value >= target;

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${\n      status === 'critical' ? 'border-red-200 bg-red-50/50' :\n      status === 'warning' ? 'border-yellow-200 bg-yellow-50/50' :\n      'border-green-200 bg-green-50/50'\n    }`}>
      <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
        <CardTitle className=\"text-sm font-medium\">{title}</CardTitle>
        <div className=\"flex items-center gap-2\">
          {getStatusIcon(status)}
          {getTrendIcon(trend)}
        </div>
      </CardHeader>
      <CardContent className=\"space-y-3\">
        {/* 현재 값 */}
        <div className=\"space-y-1\">
          <div className=\"flex items-baseline justify-between\">
            <span className={`text-2xl font-bold ${getStatusColor(status)}`}>
              {value.toFixed(1)}{unit}
            </span>
            <span className=\"text-sm text-muted-foreground\">
              목표: {target}{unit}
            </span>
          </div>

          {/* 진행률 바 */}
          <div className=\"space-y-1\">
            <Progress
              value={progressValue}
              className={`w-full h-2 ${\n                status === 'critical' ? '[&>div]:bg-red-500' :\n                status === 'warning' ? '[&>div]:bg-yellow-500' :\n                '[&>div]:bg-green-500'\n              }`}\n            />\n            <div className=\"flex justify-between text-xs text-muted-foreground\">\n              <span>0{unit}</span>\n              <span>{target}{unit}</span>\n            </div>\n          </div>\n        </div>\n\n        {/* 상태 및 트렌드 배지 */}\n        <div className=\"flex items-center justify-between\">\n          <Badge variant={getStatusBadgeVariant(status)}>\n            {getStatusText(status)}\n          </Badge>\n          \n          <div className=\"flex items-center gap-1 text-xs text-muted-foreground\">\n            {getTrendIcon(trend)}\n            <span>{getTrendText(trend)}</span>\n          </div>\n        </div>\n\n        {/* 목표 달성 여부 */}\n        {isAboveTarget ? (\n          <div className=\"flex items-center gap-1 text-xs text-green-600\">\n            <CheckCircle className=\"h-3 w-3\" />\n            <span>목표 달성</span>\n          </div>\n        ) : (\n          <div className=\"text-xs text-muted-foreground\">\n            목표까지: {(target - value).toFixed(1)}{unit}\n          </div>\n        )}\n\n        {/* 추가 설명 */}\n        {description && (\n          <p className=\"text-xs text-muted-foreground\">{description}</p>\n        )}\n      </CardContent>\n    </Card>\n  );\n}