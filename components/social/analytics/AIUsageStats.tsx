"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { Separator } from "../../ui/separator";
import { Progress } from "../../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { 
  Brain,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  CreditCard,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Sparkles,
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { cn } from "../../../lib/utils";

interface AIUsageStatsProps {
  /** 통계 기간 (일) */
  timeRange?: number;
  /** 컴포넌트의 스타일 클래스 */
  className?: string;
  /** 상세 모드 활성화 여부 */
  detailed?: boolean;
}

interface UsageStats {
  totalVariants: number;
  totalCreditsUsed: number;
  averageScore: number;
  aiModelUsage: Record<string, number>;
  postsWithVariants: number;
}

interface TrendData {
  date: string;
  generations: number;
  credits: number;
  averageScore: number;
}

/**
 * AI 사용량 통계와 트렌드를 표시하는 컴포넌트
 */
export function AIUsageStats({
  timeRange = 30,
  className,
  detailed = true,
}: AIUsageStatsProps) {
  // 변형 통계 조회
  const variantStats = useQuery(api.postVariants.getUserVariantStats, {});

  // AI 생성 통계 조회
  const aiStats = useQuery(api.aiGenerations.getUserStats, {});

  // 페르소나별 성능 조회
  const personaPerformance = useQuery(api.aiGenerations.getPersonaPerformance, {});

  // 월별 트렌드 조회
  const monthlyTrends = useQuery(api.aiGenerations.getMonthlyTrends, { months: 3 });

  // 모의 트렌드 데이터 (실제로는 Convex에서 날짜별 통계 조회)
  const mockTrendData: TrendData[] = React.useMemo(() => {
    const data: TrendData[] = [];
    const now = new Date();
    
    for (let i = timeRange - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      data.push({
        date: date.toISOString().split('T')[0],
        generations: Math.floor(Math.random() * 10) + 1,
        credits: Math.floor(Math.random() * 50) + 10,
        averageScore: Math.floor(Math.random() * 30) + 70,
      });
    }
    
    return data;
  }, [timeRange]);

  // 계산된 통계
  const calculatedStats = React.useMemo(() => {
    if (!variantStats) return null;

    const totalTrendCredits = mockTrendData.reduce((sum, day) => sum + day.credits, 0);
    const totalTrendGenerations = mockTrendData.reduce((sum, day) => sum + day.generations, 0);
    const avgTrendScore = mockTrendData.reduce((sum, day) => sum + day.averageScore, 0) / mockTrendData.length;

    // 어제와 오늘 비교 (트렌드 계산)
    const today = mockTrendData[mockTrendData.length - 1];
    const yesterday = mockTrendData[mockTrendData.length - 2];
    
    const creditsTrend = yesterday ? ((today.credits - yesterday.credits) / yesterday.credits) * 100 : 0;
    const generationsTrend = yesterday ? ((today.generations - yesterday.generations) / yesterday.generations) * 100 : 0;
    const scoreTrend = yesterday ? ((today.averageScore - yesterday.averageScore) / yesterday.averageScore) * 100 : 0;

    return {
      ...variantStats,
      totalTrendCredits,
      totalTrendGenerations,
      avgTrendScore: Math.round(avgTrendScore),
      creditsTrend,
      generationsTrend,
      scoreTrend,
    };
  }, [variantStats, mockTrendData]);

  // AI 모델별 색상
  const modelColors = {
    "gemini-1.5-pro": "bg-blue-500",
    "gpt-4": "bg-green-500",
    "claude-3": "bg-purple-500",
    "gpt-3.5-turbo": "bg-orange-500",
  };

  // 트렌드 아이콘 결정
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  // 트렌드 색상 결정
  const getTrendColor = (trend: number): string => {
    if (trend > 0) return "text-green-600";
    if (trend < 0) return "text-red-600";
    return "text-gray-600";
  };

  // 로딩 상태
  if (variantStats === undefined) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!calculatedStats) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-medium mb-2">통계를 불러올 수 없습니다</h3>
            <p>AI 사용 데이터가 없거나 오류가 발생했습니다.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <span>AI 사용량 통계</span>
          <Badge variant="secondary">{timeRange}일</Badge>
        </CardTitle>
        <CardDescription>
          AI 콘텐츠 생성의 사용량과 성능 트렌드를 분석합니다
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="trends">트렌드</TabsTrigger>
            <TabsTrigger value="models">모델별</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* 주요 지표 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">총 변형</span>
                  </div>
                  {getTrendIcon(calculatedStats.generationsTrend)}
                </div>
                <div className="text-2xl font-bold">{calculatedStats.totalVariants}</div>
                <div className={cn("text-xs", getTrendColor(calculatedStats.generationsTrend))}>
                  {calculatedStats.generationsTrend > 0 ? "+" : ""}{calculatedStats.generationsTrend.toFixed(1)}% vs 어제
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">사용 크레딧</span>
                  </div>
                  {getTrendIcon(calculatedStats.creditsTrend)}
                </div>
                <div className="text-2xl font-bold">{calculatedStats.totalCreditsUsed}</div>
                <div className={cn("text-xs", getTrendColor(calculatedStats.creditsTrend))}>
                  {calculatedStats.creditsTrend > 0 ? "+" : ""}{calculatedStats.creditsTrend.toFixed(1)}% vs 어제
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">평균 점수</span>
                  </div>
                  {getTrendIcon(calculatedStats.scoreTrend)}
                </div>
                <div className="text-2xl font-bold">{calculatedStats.averageScore}</div>
                <div className={cn("text-xs", getTrendColor(calculatedStats.scoreTrend))}>
                  {calculatedStats.scoreTrend > 0 ? "+" : ""}{calculatedStats.scoreTrend.toFixed(1)}% vs 어제
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">활성 게시물</span>
                  </div>
                </div>
                <div className="text-2xl font-bold">{calculatedStats.postsWithVariants}</div>
                <div className="text-xs text-muted-foreground">
                  변형이 있는 게시물
                </div>
              </Card>
            </div>

            {/* 효율성 지표 */}
            {detailed && (
              <>
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium flex items-center space-x-2">
                    <Zap className="h-4 w-4" />
                    <span>효율성 분석</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">변형당 평균 크레딧</span>
                        <Award className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="text-xl font-bold">
                        {calculatedStats.totalVariants > 0 
                          ? (calculatedStats.totalCreditsUsed / calculatedStats.totalVariants).toFixed(1)
                          : "0"
                        }
                      </div>
                      <Progress 
                        value={Math.min(100, (calculatedStats.totalCreditsUsed / calculatedStats.totalVariants) * 10)} 
                        className="h-2 mt-2" 
                      />
                    </div>

                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">생성 성공률</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="text-xl font-bold">95.2%</div>
                      <Progress value={95.2} className="h-2 mt-2" />
                    </div>

                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">품질 지수</span>
                        <Activity className="h-4 w-4 text-purple-500" />
                      </div>
                      <div className="text-xl font-bold">
                        {(calculatedStats.averageScore / 100 * 10).toFixed(1)}/10
                      </div>
                      <Progress value={calculatedStats.averageScore} className="h-2 mt-2" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-6 mt-4">
            {/* 트렌드 차트 영역 (실제로는 Chart.js나 recharts 사용) */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>일별 트렌드 ({timeRange}일)</span>
              </h4>

              <div className="p-6 bg-muted/30 rounded-lg">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-16 w-16 mx-auto mb-3 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">트렌드 차트</h3>
                  <p>실제 구현에서는 Chart.js 또는 Recharts를 사용하여</p>
                  <p>일별 생성량, 크레딧 사용량, 평균 점수 차트를 표시합니다.</p>
                </div>
              </div>

              {/* 최근 7일 요약 */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                {mockTrendData.slice(-7).map((day, index) => (
                  <div key={day.date} className="p-3 bg-background border rounded-lg text-center">
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(day.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-sm font-bold mb-1">{day.generations}</div>
                    <div className="text-xs text-muted-foreground">{day.credits} 크레딧</div>
                    <div className="text-xs text-green-600">{day.averageScore}점</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="models" className="space-y-6 mt-4">
            {/* 페르소나별 성능 */}
            {personaPerformance && personaPerformance.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>페르소나별 AI 성능</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {personaPerformance.slice(0, 6).map((persona) => (
                    <Card key={persona.personaId} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-sm">{persona.personaName}</h5>
                          <Badge variant={persona.successRate >= 80 ? "default" : "secondary"}>
                            {persona.successRate}%
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">총 생성</span>
                            <span>{persona.total}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">평균 점수</span>
                            <span className="font-medium">{persona.averageScore}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">크레딧</span>
                            <span>{persona.creditsUsed}</span>
                          </div>
                        </div>
                        
                        <Progress value={persona.successRate} className="h-1" />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* AI 모델별 사용량 */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center space-x-2">
                <PieChart className="h-4 w-4" />
                <span>AI 모델별 사용량</span>
              </h4>

              {Object.entries(calculatedStats.aiModelUsage).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(calculatedStats.aiModelUsage)
                    .sort(([,a], [,b]) => b - a)
                    .map(([model, count]) => {
                      const percentage = (count / calculatedStats.totalVariants) * 100;
                      const colorClass = modelColors[model as keyof typeof modelColors] || "bg-gray-500";
                      
                      return (
                        <div key={model} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className={cn("w-3 h-3 rounded", colorClass)} />
                              <span className="text-sm font-medium">{model}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-muted-foreground">{count}회</span>
                              <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                            </div>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">모델 사용 데이터가 없습니다</h3>
                  <p>AI 콘텐츠를 생성하면 모델별 통계가 표시됩니다.</p>
                </div>
              )}

              {/* 모델 성능 비교 */}
              {detailed && Object.entries(calculatedStats.aiModelUsage).length > 0 && (
                <>
                  <Separator />
                  
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium flex items-center space-x-2">
                      <Target className="h-4 w-4" />
                      <span>모델 성능 비교</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">평균 응답 시간</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Gemini 1.5 Pro</span>
                            <span>2.1초</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GPT-4</span>
                            <span>1.8초</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Claude 3</span>
                            <span>1.5초</span>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Award className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-medium">평균 품질 점수</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Gemini 1.5 Pro</span>
                            <span className="font-medium">87점</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GPT-4</span>
                            <span className="font-medium">85점</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Claude 3</span>
                            <span className="font-medium">82점</span>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// 접근성 개선을 위한 ARIA 레이블
AIUsageStats.displayName = "AIUsageStats";

export default AIUsageStats;