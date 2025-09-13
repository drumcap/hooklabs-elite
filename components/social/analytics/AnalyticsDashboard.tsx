"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { Separator } from "../../ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
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
  Filter
} from "lucide-react";
import { cn } from "../../../lib/utils";

interface AnalyticsDashboardProps {
  /** 기본 시간 범위 (일) */
  defaultTimeRange?: number;
  /** 컴포넌트의 스타일 클래스 */
  className?: string;
  /** 자동 새로고침 간격 (분) */
  autoRefreshInterval?: number;
}

interface DashboardMetrics {
  totalPosts: number;
  totalEngagement: number;
  totalReach: number;
  averageEngagementRate: number;
  topPerformingPost?: {
    id: string;
    content: string;
    engagement: number;
    platform: string;
  };
  platformBreakdown: Record<string, {
    posts: number;
    engagement: number;
    reach: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    posts: number;
    engagement: number;
    reach: number;
  }>;
}

interface ActivityItem {
  id: string;
  type: "post_published" | "high_engagement" | "milestone_reached" | "error_occurred";
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

/**
 * 소셜 미디어 종합 분석 대시보드 컴포넌트
 */
export function AnalyticsDashboard({
  defaultTimeRange = 30,
  className,
  autoRefreshInterval = 5,
}: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = React.useState(defaultTimeRange);
  const [selectedPlatform, setSelectedPlatform] = React.useState<string>("all");
  const [lastRefresh, setLastRefresh] = React.useState(new Date());
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // 자동 새로고침 설정
  React.useEffect(() => {
    if (autoRefreshInterval > 0) {
      const interval = setInterval(() => {
        setLastRefresh(new Date());
      }, autoRefreshInterval * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [autoRefreshInterval]);

  // 모의 대시보드 데이터
  const mockDashboardData: DashboardMetrics = React.useMemo(() => ({
    totalPosts: 142,
    totalEngagement: 3547,
    totalReach: 45230,
    averageEngagementRate: 7.8,
    topPerformingPost: {
      id: "post1",
      content: "AI 기술의 미래와 우리의 일상생활에 미치는 영향에 대해 이야기해보겠습니다...",
      engagement: 345,
      platform: "linkedin",
    },
    platformBreakdown: {
      twitter: { posts: 65, engagement: 1523, reach: 18400 },
      linkedin: { posts: 42, engagement: 1245, reach: 15600 },
      instagram: { posts: 35, engagement: 779, reach: 11230 },
    },
    timeSeriesData: Array.from({ length: timeRange }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (timeRange - 1 - i));
      return {
        date: date.toISOString().split('T')[0],
        posts: Math.floor(Math.random() * 8) + 1,
        engagement: Math.floor(Math.random() * 200) + 50,
        reach: Math.floor(Math.random() * 2000) + 500,
      };
    }),
  }), [timeRange]);

  // 모의 활동 데이터
  const mockActivities: ActivityItem[] = [
    {
      id: "1",
      type: "post_published",
      title: "새 게시물 발행됨",
      description: "LinkedIn에 AI 기술 관련 게시물이 성공적으로 발행되었습니다",
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: "2",
      type: "high_engagement",
      title: "높은 참여도 달성",
      description: "Twitter 게시물이 100회 이상의 상호작용을 기록했습니다",
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: "3",
      type: "milestone_reached",
      title: "월간 목표 달성",
      description: "이달 게시물 수가 목표인 100개를 달성했습니다",
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
    {
      id: "4",
      type: "error_occurred",
      title: "발행 오류 발생",
      description: "Instagram 게시물 발행 중 토큰 만료 오류가 발생했습니다",
      timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    },
  ];

  // 수동 새로고침 핸들러
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // 실제로는 여기서 데이터를 다시 로드
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  // 활동 아이콘 가져오기
  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "post_published":
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case "high_engagement":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "milestone_reached":
        return <Award className="h-4 w-4 text-amber-600" />;
      case "error_occurred":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  // 플랫폼 이모지
  const getPlatformEmoji = (platform: string): string => {
    const emojis: Record<string, string> = {
      twitter: "🐦",
      linkedin: "💼",
      instagram: "📷",
      facebook: "👥",
    };
    return emojis[platform] || "🔗";
  };

  // 트렌드 계산 (최근 7일 vs 이전 7일)
  const calculateTrend = (data: number[]): number => {
    if (data.length < 14) return 0;
    const recent = data.slice(-7).reduce((a, b) => a + b, 0);
    const previous = data.slice(-14, -7).reduce((a, b) => a + b, 0);
    if (previous === 0) return 0;
    return ((recent - previous) / previous) * 100;
  };

  const engagementTrend = calculateTrend(mockDashboardData.timeSeriesData.map(d => d.engagement));
  const reachTrend = calculateTrend(mockDashboardData.timeSeriesData.map(d => d.reach));
  const postsTrend = calculateTrend(mockDashboardData.timeSeriesData.map(d => d.posts));

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <BarChart3 className="h-6 w-6" />
            <span>분석 대시보드</span>
          </h2>
          <p className="text-muted-foreground mt-1">
            소셜 미디어 성과를 한눈에 확인하세요
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="text-xs text-muted-foreground">
            마지막 업데이트: {lastRefresh.toLocaleTimeString('ko-KR')}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", isRefreshing && "animate-spin")} />
            새로고침
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            내보내기
          </Button>
        </div>
      </div>

      {/* 필터 섹션 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">필터</span>
            </div>
            
            <Select value={timeRange.toString()} onValueChange={(value) => setTimeRange(Number(value))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">최근 7일</SelectItem>
                <SelectItem value="30">최근 30일</SelectItem>
                <SelectItem value="90">최근 90일</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 플랫폼</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 게시물</p>
                <p className="text-2xl font-bold">{mockDashboardData.totalPosts}</p>
                <div className="flex items-center mt-1">
                  {postsTrend > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                  )}
                  <span className={cn(
                    "text-xs",
                    postsTrend > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {Math.abs(postsTrend).toFixed(1)}%
                  </span>
                </div>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 참여도</p>
                <p className="text-2xl font-bold">{mockDashboardData.totalEngagement.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  {engagementTrend > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                  )}
                  <span className={cn(
                    "text-xs",
                    engagementTrend > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {Math.abs(engagementTrend).toFixed(1)}%
                  </span>
                </div>
              </div>
              <Heart className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 도달률</p>
                <p className="text-2xl font-bold">{mockDashboardData.totalReach.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  {reachTrend > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                  )}
                  <span className={cn(
                    "text-xs",
                    reachTrend > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {Math.abs(reachTrend).toFixed(1)}%
                  </span>
                </div>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">평균 참여율</p>
                <p className="text-2xl font-bold">{mockDashboardData.averageEngagementRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">업계 평균 대비</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 대시보드 탭 */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="performance">성과</TabsTrigger>
          <TabsTrigger value="platforms">플랫폼별</TabsTrigger>
          <TabsTrigger value="activity">활동</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* 트렌드 차트 영역 */}
          <Card>
            <CardHeader>
              <CardTitle>성과 트렌드</CardTitle>
              <CardDescription>최근 {timeRange}일간의 성과 변화</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-16 w-16 mx-auto mb-3 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">트렌드 차트</h3>
                  <p>실제 구현에서는 Chart.js 또는 Recharts를 사용하여</p>
                  <p>시계열 데이터를 시각화합니다.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 최고 성과 게시물 */}
          {mockDashboardData.topPerformingPost && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>최고 성과 게시물</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-4">
                  <div className="text-2xl">
                    {getPlatformEmoji(mockDashboardData.topPerformingPost.platform)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">
                      {mockDashboardData.topPerformingPost.content}
                    </p>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span>{mockDashboardData.topPerformingPost.engagement} 참여</span>
                      </div>
                      <Badge variant="outline">
                        {mockDashboardData.topPerformingPost.platform}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>참여도 분석</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">좋아요</span>
                    <span className="text-sm font-medium">60%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">댓글</span>
                    <span className="text-sm font-medium">25%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">공유</span>
                    <span className="text-sm font-medium">15%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>게시 시간 분석</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">최적 시간</span>
                    <span className="text-sm font-medium">오후 2-4시</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">최적 요일</span>
                    <span className="text-sm font-medium">화요일, 목요일</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">평균 응답 시간</span>
                    <span className="text-sm font-medium">2.5시간</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(mockDashboardData.platformBreakdown).map(([platform, data]) => (
              <Card key={platform}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span className="text-xl">{getPlatformEmoji(platform)}</span>
                    <span className="capitalize">{platform}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">게시물</span>
                      <span className="text-sm font-medium">{data.posts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">참여도</span>
                      <span className="text-sm font-medium">{data.engagement.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">도달률</span>
                      <span className="text-sm font-medium">{data.reach.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">참여율</span>
                      <span className="text-sm font-medium">
                        {((data.engagement / data.reach) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>최근 활동</span>
              </CardTitle>
              <CardDescription>실시간 활동 피드</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      <div className="flex items-center space-x-1 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleString('ko-KR')}
                        </span>
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

// 접근성 개선을 위한 ARIA 레이블
AnalyticsDashboard.displayName = "AnalyticsDashboard";

export default AnalyticsDashboard;