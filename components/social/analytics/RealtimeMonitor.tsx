"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Skeleton } from "../../ui/skeleton";
import { Separator } from "../../ui/separator";
import { 
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Zap,
  Eye,
  Calendar,
  TrendingUp,
  Wifi,
  WifiOff,
  Send,
  AlertCircle,
  Pause
} from "lucide-react";
import { cn } from "../../../lib/utils";

interface RealtimeMonitorProps {
  /** 컴포넌트의 스타일 클래스 */
  className?: string;
  /** 자동 새로고침 간격 (밀리초) */
  refreshInterval?: number;
  /** 상세 모드 활성화 여부 */
  detailed?: boolean;
}

/**
 * 실시간 시스템 상태와 재시도 대기 중인 작업을 모니터링하는 컴포넌트
 */
export function RealtimeMonitor({
  className,
  refreshInterval = 5000,
  detailed = true,
}: RealtimeMonitorProps) {
  const [lastUpdate, setLastUpdate] = React.useState<Date>(new Date());
  const [isConnected, setIsConnected] = React.useState(true);

  // 재시도 대기 중인 스케줄 조회
  const pendingRetries = useQuery(api.scheduledPosts.getPendingRetries, {});
  
  // 사용자 스케줄 통계 조회
  const userStats = useQuery(api.scheduledPosts.getUserStats, {});
  
  // 예정된 게시물 조회
  const upcomingSchedules = useQuery(api.scheduledPosts.getUpcoming, { limit: 5 });

  // 자동 새로고침
  React.useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // 연결 상태 체크
  React.useEffect(() => {
    const checkConnection = () => {
      setIsConnected(navigator.onLine);
    };

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    checkConnection();

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);

  // 상태별 아이콘과 색상
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "published":
        return { icon: <CheckCircle className="h-4 w-4" />, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" };
      case "failed":
        return { icon: <AlertCircle className="h-4 w-4" />, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" };
      case "pending":
        return { icon: <Clock className="h-4 w-4" />, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" };
      default:
        return { icon: <Activity className="h-4 w-4" />, color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-900/20" };
    }
  };

  // 로딩 상태
  if (pendingRetries === undefined || userStats === undefined || upcomingSchedules === undefined) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 bg-muted/30 rounded-lg">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-2 h-2 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-16 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <CardTitle>실시간 모니터링</CardTitle>
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            {pendingRetries && pendingRetries.length > 0 && (
              <Badge variant="secondary" className="text-amber-600">
                {pendingRetries.length}개 재시도 대기
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}</span>
          </div>
        </div>
        <CardDescription>
          게시물 스케줄링 상태와 재시도 대기 작업을 실시간으로 모니터링합니다
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 시스템 상태 요약 */}
        {userStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">총 예약</span>
                <Send className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-lg font-bold">{userStats.total}</div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">발행 완료</span>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-lg font-bold">{userStats.published}</div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">대기 중</span>
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="text-lg font-bold">{userStats.pending}</div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">성공률</span>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-lg font-bold">{userStats.successRate}%</div>
            </div>
          </div>
        )}

        {/* 재시도 대기 중인 작업 */}
        {pendingRetries && pendingRetries.length > 0 && (
          <>
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4" />
                  <span>재시도 대기 중</span>
                  <Badge variant="secondary">{pendingRetries.length}</Badge>
                </h4>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  모두 재시도
                </Button>
              </div>

              <div className="space-y-2">
                {pendingRetries.slice(0, 5).map((retry) => {
                  const statusInfo = getStatusInfo(retry.status);
                  const nextRetry = retry.nextRetryAt ? new Date(retry.nextRetryAt) : null;
                  const isOverdue = nextRetry && nextRetry <= new Date();

                  return (
                    <div
                      key={retry._id}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                        statusInfo.bg,
                        isOverdue && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20"
                      )}
                    >
                      <div className={cn("flex items-center", statusInfo.color)}>
                        {statusInfo.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            {retry.platform} 게시물
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {retry.retryCount}/{retry.maxRetries} 시도
                          </Badge>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs">
                              지연됨
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {retry.error && `오류: ${retry.error}`}
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground text-right">
                        {nextRetry ? (
                          <div>
                            <div>{nextRetry.toLocaleTimeString('ko-KR')}</div>
                            <div>{nextRetry.toLocaleDateString('ko-KR')}</div>
                          </div>
                        ) : (
                          <div>재시도 예정</div>
                        )}
                      </div>
                      
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {pendingRetries.length > 5 && (
                <div className="text-center">
                  <Button variant="outline" size="sm">
                    {pendingRetries.length - 5}개 더 보기
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* 예정된 게시물 */}
        {detailed && upcomingSchedules && upcomingSchedules.length > 0 && (
          <>
            <Separator />
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>예정된 게시물</span>
                <Badge variant="secondary">{upcomingSchedules.length}</Badge>
              </h4>

              <div className="space-y-2">
                {upcomingSchedules.map((schedule) => {
                  const scheduledTime = new Date(schedule.scheduledFor);
                  const isUpcoming = scheduledTime > new Date();
                  const timeUntil = scheduledTime.getTime() - new Date().getTime();
                  const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
                  const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

                  return (
                    <div
                      key={schedule._id}
                      className="flex items-center space-x-3 p-3 rounded-lg bg-background border"
                    >
                      <div className="flex items-center text-blue-600">
                        <Send className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            {schedule.socialAccount?.displayName || schedule.socialAccount?.username}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {schedule.platform}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {schedule.post?.finalContent?.substring(0, 50)}...
                        </div>
                      </div>
                      
                      <div className="text-xs text-right">
                        <div className="font-medium">
                          {isUpcoming && timeUntil > 0 && (
                            <span className="text-green-600">
                              {hoursUntil > 0 ? `${hoursUntil}시간 ` : ''}
                              {minutesUntil}분 후
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          {scheduledTime.toLocaleString('ko-KR')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* 빈 상태 */}
        {(!pendingRetries || pendingRetries.length === 0) && (!upcomingSchedules || upcomingSchedules.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
            <h3 className="text-lg font-medium mb-2">모든 작업이 정상입니다</h3>
            <p>재시도 대기 중인 작업이나 문제가 없습니다.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 접근성 개선을 위한 ARIA 레이블
RealtimeMonitor.displayName = "RealtimeMonitor";

export default RealtimeMonitor;