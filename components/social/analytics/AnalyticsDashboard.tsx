"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { Separator } from "../../ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Progress } from "../../ui/progress";
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  MessageSquare,
  Heart,
  Share2,
  Eye,
  Calendar,
  Clock,
  Target,
  Zap,
  Award,
  AlertTriangle,
  RefreshCw,
  Download,
  Filter,
  Send,
  CheckCircle,
  Brain,
  Sparkles
} from "lucide-react";
import { cn } from "../../../lib/utils";

// 다른 컴포넌트들을 임포트
import { AccountStats } from "./AccountStats";
import { AIUsageStats } from "./AIUsageStats";
import { GenerationHistory } from "./GenerationHistory";
import { RealtimeMonitor } from "./RealtimeMonitor";

interface AnalyticsDashboardProps {
  /** 기본 시간 범위 (일) */
  defaultTimeRange?: number;
  /** 컴포넌트의 스타일 클래스 */
  className?: string;
  /** 자동 새로고침 간격 (분) */
  autoRefreshInterval?: number;
  /** 선택된 계정 ID (옵션) */
  selectedAccountId?: Id<"socialAccounts">;
}

/**
 * 종합 분석 대시보드 - 모든 통계와 분석 기능을 통합한 메인 대시보드
 */
export function AnalyticsDashboard({
  defaultTimeRange = 30,
  className,
  autoRefreshInterval = 5,
  selectedAccountId,
}: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = React.useState(defaultTimeRange);
  const [selectedView, setSelectedView] = React.useState<"overview" | "detailed" | "realtime">("overview");
  const [lastRefresh, setLastRefresh] = React.useState(new Date());

  // 모든 통계 API 호출
  const socialAccounts = useQuery(api.socialAccounts.list, {});
  const scheduledStats = useQuery(api.scheduledPosts.getUserStats, {});
  const variantStats = useQuery(api.postVariants.getUserVariantStats, {});
  const aiStats = useQuery(api.aiGenerations.getUserStats, {});
  const personaPerformance = useQuery(api.aiGenerations.getPersonaPerformance, {});
  const monthlyTrends = useQuery(api.aiGenerations.getMonthlyTrends, { months: 3 });
  const pendingRetries = useQuery(api.scheduledPosts.getPendingRetries, {});
  const upcomingSchedules = useQuery(api.scheduledPosts.getUpcoming, { limit: 10 });

  // 자동 새로고침
  React.useEffect(() => {
    if (autoRefreshInterval > 0) {
      const interval = setInterval(() => {
        setLastRefresh(new Date());
        // 실제로는 Convex가 자동으로 데이터를 새로고침함
      }, autoRefreshInterval * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [autoRefreshInterval]);

  // 로딩 상태 체크
  const isLoading = socialAccounts === undefined || 
                   scheduledStats === undefined || 
                   variantStats === undefined || 
                   aiStats === undefined;

  // 요약 통계 계산
  const summaryStats = React.useMemo(() => {
    if (!scheduledStats || !variantStats || !aiStats || !socialAccounts) {
      return null;
    }

    const activeAccounts = socialAccounts.filter(acc => acc.isActive).length;
    const failureRate = scheduledStats.total > 0 
      ? ((scheduledStats.failed / scheduledStats.total) * 100).toFixed(1)
      : '0';

    return {
      activeAccounts,
      totalPosts: scheduledStats.total,
      publishedPosts: scheduledStats.published,
      pendingPosts: scheduledStats.pending,
      successRate: scheduledStats.successRate,
      failureRate: parseFloat(failureRate),
      totalVariants: variantStats.totalVariants,
      totalCreditsUsed: aiStats.totalCreditsUsed,
      aiSuccessRate: aiStats.successRate || 0,
      averageGenerationTime: aiStats.averageGenerationTime || 0,
    };
  }, [scheduledStats, variantStats, aiStats, socialAccounts]);

  if (isLoading) {
    return (
      <div className={cn("w-full space-y-6", className)}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!summaryStats) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">데이터를 불러올 수 없습니다</h3>
          <p className="text-muted-foreground">통계 데이터에 접근할 수 없거나 오류가 발생했습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* 헤더 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2 text-2xl">
                <BarChart3 className="h-6 w-6" />
                <span>소셜 미디어 분석 대시보드</span>
              </CardTitle>
              <CardDescription>
                AI 기반 콘텐츠 생성과 소셜 미디어 자동화의 종합 성과 분석
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>마지막 업데이트: {lastRefresh.toLocaleTimeString('ko-KR')}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setLastRefresh(new Date())}>
                <RefreshCw className="h-4 w-4 mr-2" />
                새로고침
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* 주요 지표 카드들 */}
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <Badge variant="secondary">{summaryStats.activeAccounts}</Badge>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">연결된 계정</div>
                <div className="text-2xl font-bold">{summaryStats.activeAccounts}</div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Send className="h-5 w-5 text-green-600" />
                <Badge variant="secondary">{summaryStats.publishedPosts}</Badge>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">발행 완료</div>
                <div className="text-2xl font-bold">{summaryStats.publishedPosts}</div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <Badge variant="secondary">{summaryStats.pendingPosts}</Badge>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">대기 중</div>
                <div className="text-2xl font-bold">{summaryStats.pendingPosts}</div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-5 w-5 text-indigo-600" />
                <Badge variant={summaryStats.successRate >= 90 ? "default" : "secondary"}>
                  {summaryStats.successRate}%
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">성공률</div>
                <div className="text-2xl font-bold">{summaryStats.successRate}%</div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <Badge variant="secondary">{summaryStats.totalVariants}</Badge>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">AI 변형</div>
                <div className="text-2xl font-bold">{summaryStats.totalVariants}</div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Brain className="h-5 w-5 text-orange-600" />
                <Badge variant="secondary">{summaryStats.totalCreditsUsed}</Badge>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">사용 크레딧</div>
                <div className="text-2xl font-bold">{summaryStats.totalCreditsUsed}</div>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* 탭 기반 상세 분석 */}
      <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="detailed">상세 분석</TabsTrigger>
          <TabsTrigger value="realtime">실시간 모니터링</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* AI 사용량 통계 */}
          <AIUsageStats detailed={false} />

          {/* 계정별 성능 (선택된 계정이 있는 경우) */}
          {selectedAccountId && (
            <AccountStats accountId={selectedAccountId} />
          )}

          {/* 성과 요약 카드들 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">발행 성과</h3>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>성공률</span>
                    <span className="font-medium">{summaryStats.successRate}%</span>
                  </div>
                  <Progress value={summaryStats.successRate} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>실패: {summaryStats.failureRate}%</span>
                    <span>총 {summaryStats.totalPosts}개 게시물</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">AI 성능</h3>
                  <Brain className="h-4 w-4 text-purple-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>AI 성공률</span>
                    <span className="font-medium">{summaryStats.aiSuccessRate}%</span>
                  </div>
                  <Progress value={summaryStats.aiSuccessRate} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>평균 {summaryStats.averageGenerationTime}ms</span>
                    <span>총 {summaryStats.totalCreditsUsed} 크레딧</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">시스템 상태</h3>
                  <Activity className="h-4 w-4 text-green-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>재시도 대기</span>
                    <span className="font-medium">{pendingRetries?.length || 0}개</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>예약 대기</span>
                    <span className="font-medium">{upcomingSchedules?.length || 0}개</span>
                  </div>
                  <div className="mt-3">
                    {(pendingRetries?.length || 0) === 0 ? (
                      <div className="flex items-center text-xs text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        시스템 정상 운영 중
                      </div>
                    ) : (
                      <div className="flex items-center text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        일부 작업 재처리 필요
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6 mt-6">
          {/* 상세 AI 사용량 통계 */}
          <AIUsageStats detailed={true} />

          {/* 생성 히스토리 */}
          <GenerationHistory enableFilters={true} />

          {/* 페르소나 성능 분석 */}
          {personaPerformance && personaPerformance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>페르소나별 성능 순위</span>
                </CardTitle>
                <CardDescription>
                  각 페르소나의 AI 생성 성능과 콘텐츠 품질을 비교합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {personaPerformance.slice(0, 10).map((persona, index) => (
                    <div key={persona.personaId} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <span className="text-sm font-bold">#{index + 1}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{persona.personaName}</h4>
                          <Badge variant={persona.successRate >= 80 ? "default" : "secondary"}>
                            {persona.successRate}%
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {persona.total}개 생성 • 평균 {persona.averageScore}점 • {persona.creditsUsed} 크레딧
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm font-medium">{persona.averageScore}/100</div>
                        <div className="w-20">
                          <Progress value={persona.averageScore} className="h-2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6 mt-6">
          {/* 실시간 모니터링 */}
          <RealtimeMonitor detailed={true} />
          
          {/* 빠른 액션 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Send className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">새 게시물 작성</div>
                  <div className="text-sm text-muted-foreground">AI 콘텐츠 생성</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="font-medium">일정 관리</div>
                  <div className="text-sm text-muted-foreground">스케줄 캘린더</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium">계정 관리</div>
                  <div className="text-sm text-muted-foreground">소셜 계정 연결</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Download className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="font-medium">보고서 내보내기</div>
                  <div className="text-sm text-muted-foreground">PDF/CSV 다운로드</div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 접근성 개선을 위한 ARIA 레이블
AnalyticsDashboard.displayName = "AnalyticsDashboard";

export default AnalyticsDashboard;