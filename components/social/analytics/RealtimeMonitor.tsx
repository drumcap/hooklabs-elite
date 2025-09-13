"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { Separator } from "../../ui/separator";
import { Switch } from "../../ui/switch";
import { Progress } from "../../ui/progress";
import { 
  Activity,
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Heart,
  Share2,
  Eye,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RefreshCw,
  Bell,
  BellOff,
  Wifi,
  WifiOff
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { toast } from "sonner";

interface RealtimeMonitorProps {
  /** 업데이트 간격 (초) */
  updateInterval?: number;
  /** 컴포넌트의 스타일 클래스 */
  className?: string;
  /** 알림 활성화 여부 */
  enableNotifications?: boolean;
  /** 자동 시작 여부 */
  autoStart?: boolean;
}

interface RealTimeUpdate {
  id: string;
  type: "new_post" | "engagement" | "mention" | "error" | "milestone";
  title: string;
  description: string;
  value?: number;
  change?: number;
  platform?: string;
  priority: "low" | "medium" | "high";
  timestamp: string;
}

interface LiveMetrics {
  activeUsers: number;
  engagementRate: number;
  postsToday: number;
  impressions: number;
  reach: number;
  errorRate: number;
  systemLoad: number;
}

/**
 * 실시간 소셜 미디어 활동 모니터링 컴포넌트
 */
export function RealtimeMonitor({
  updateInterval = 5,
  className,
  enableNotifications = true,
  autoStart = true,
}: RealtimeMonitorProps) {
  const [isMonitoring, setIsMonitoring] = React.useState(autoStart);
  const [notifications, setNotifications] = React.useState(enableNotifications);
  const [isConnected, setIsConnected] = React.useState(true);
  const [lastUpdate, setLastUpdate] = React.useState(new Date());
  const [updates, setUpdates] = React.useState<RealTimeUpdate[]>([]);

  // 실시간 지표 모의 데이터
  const [liveMetrics, setLiveMetrics] = React.useState<LiveMetrics>({
    activeUsers: 23,
    engagementRate: 7.2,
    postsToday: 15,
    impressions: 2847,
    reach: 1924,
    errorRate: 0.8,
    systemLoad: 34,
  });

  // 실시간 업데이트 시뮬레이션
  React.useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      // 지표 업데이트
      setLiveMetrics(prev => ({
        activeUsers: Math.max(0, prev.activeUsers + (Math.random() - 0.5) * 5),
        engagementRate: Math.max(0, prev.engagementRate + (Math.random() - 0.5) * 0.5),
        postsToday: prev.postsToday + (Math.random() > 0.8 ? 1 : 0),
        impressions: prev.impressions + Math.floor(Math.random() * 50),
        reach: prev.reach + Math.floor(Math.random() * 30),
        errorRate: Math.max(0, Math.min(10, prev.errorRate + (Math.random() - 0.5) * 0.3)),
        systemLoad: Math.max(0, Math.min(100, prev.systemLoad + (Math.random() - 0.5) * 10)),
      }));

      // 새로운 업데이트 생성 (확률적)
      if (Math.random() > 0.7) {
        const newUpdate = generateRandomUpdate();
        setUpdates(prev => [newUpdate, ...prev.slice(0, 19)]); // 최대 20개 유지
        
        // 높은 우선순위 알림
        if (notifications && newUpdate.priority === "high") {
          toast.info(`실시간 알림: ${newUpdate.title}`);
        }
      }

      setLastUpdate(new Date());
    }, updateInterval * 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, updateInterval, notifications]);

  // 연결 상태 시뮬레이션
  React.useEffect(() => {
    const connectionCheck = setInterval(() => {
      // 간헐적인 연결 끊김 시뮬레이션
      setIsConnected(Math.random() > 0.05);
    }, 10000);

    return () => clearInterval(connectionCheck);
  }, []);

  // 랜덤 업데이트 생성
  const generateRandomUpdate = (): RealTimeUpdate => {
    const updateTypes = [
      {
        type: "new_post" as const,
        title: "새 게시물 발행",
        description: "LinkedIn에 새 게시물이 성공적으로 발행되었습니다",
        priority: "medium" as const,
        platform: "linkedin",
      },
      {
        type: "engagement" as const,
        title: "높은 참여도 감지",
        description: "Twitter 게시물이 평소보다 높은 참여율을 보이고 있습니다",
        priority: "high" as const,
        platform: "twitter",
        value: Math.floor(Math.random() * 100) + 50,
        change: Math.floor(Math.random() * 30) + 10,
      },
      {
        type: "mention" as const,
        title: "새로운 멘션",
        description: "Instagram에서 브랜드가 언급되었습니다",
        priority: "medium" as const,
        platform: "instagram",
      },
      {
        type: "error" as const,
        title: "게시 오류 발생",
        description: "Facebook 게시물 예약 중 오류가 발생했습니다",
        priority: "high" as const,
        platform: "facebook",
      },
      {
        type: "milestone" as const,
        title: "마일스톤 달성",
        description: "일일 노출 수가 목표를 달성했습니다",
        priority: "medium" as const,
        value: 5000,
      },
    ];

    const randomUpdate = updateTypes[Math.floor(Math.random() * updateTypes.length)];
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      ...randomUpdate,
      timestamp: new Date().toISOString(),
    };
  };

  // 모니터링 토글
  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    if (!isMonitoring) {
      toast.success("실시간 모니터링이 시작되었습니다");
    } else {
      toast.info("실시간 모니터링이 중지되었습니다");
    }
  };

  // 업데이트 아이콘 가져오기
  const getUpdateIcon = (type: RealTimeUpdate["type"]) => {
    switch (type) {
      case "new_post":
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case "engagement":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "mention":
        return <Users className="h-4 w-4 text-purple-600" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "milestone":
        return <CheckCircle className="h-4 w-4 text-amber-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  // 우선순위 색상
  const getPriorityColor = (priority: RealTimeUpdate["priority"]): string => {
    switch (priority) {
      case "high":
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20";
      case "medium":
        return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20";
      case "low":
        return "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20";
    }
  };

  // 플랫폼 이모지
  const getPlatformEmoji = (platform?: string): string => {
    if (!platform) return "";
    const emojis: Record<string, string> = {
      twitter: "🐦",
      linkedin: "💼",
      instagram: "📷",
      facebook: "👥",
    };
    return emojis[platform] || "🔗";
  };

  // 상대 시간 포맷팅
  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return `${seconds}초 전`;
  };

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* 헤더 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>실시간 모니터</span>
                <div className="flex items-center space-x-1">
                  {isConnected ? (
                    <Wifi className="h-4 w-4 text-green-600" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-600" />
                  )}
                  <Badge variant={isMonitoring ? "default" : "secondary"}>
                    {isMonitoring ? "활성" : "비활성"}
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                소셜 미디어 활동을 실시간으로 모니터링합니다
                {isMonitoring && (
                  <span className="ml-2 text-xs">
                    • 마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
                  </span>
                )}
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 알림 토글 */}
              <div className="flex items-center space-x-2">
                {notifications ? (
                  <Bell className="h-4 w-4 text-blue-600" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
                <span className="text-sm text-muted-foreground">알림</span>
              </div>

              {/* 모니터링 토글 */}
              <Button
                variant={isMonitoring ? "default" : "outline"}
                size="sm"
                onClick={toggleMonitoring}
              >
                {isMonitoring ? (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    중지
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    시작
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 실시간 지표 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-sm text-muted-foreground">활성 사용자</div>
            <div className="text-xl font-bold">{Math.round(liveMetrics.activeUsers)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Heart className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-sm text-muted-foreground">참여율</div>
            <div className="text-xl font-bold">{liveMetrics.engagementRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-sm text-muted-foreground">오늘 게시물</div>
            <div className="text-xl font-bold">{liveMetrics.postsToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Eye className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-sm text-muted-foreground">노출 수</div>
            <div className="text-xl font-bold">{liveMetrics.impressions.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Share2 className="h-4 w-4 text-orange-600" />
            </div>
            <div className="text-sm text-muted-foreground">도달 수</div>
            <div className="text-xl font-bold">{liveMetrics.reach.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className={cn(
                "h-4 w-4",
                liveMetrics.errorRate > 5 ? "text-red-600" : "text-yellow-600"
              )} />
            </div>
            <div className="text-sm text-muted-foreground">오류율</div>
            <div className={cn(
              "text-xl font-bold",
              liveMetrics.errorRate > 5 ? "text-red-600" : "text-yellow-600"
            )}>
              {liveMetrics.errorRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Zap className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-sm text-muted-foreground">시스템 부하</div>
            <div className="text-xl font-bold">{Math.round(liveMetrics.systemLoad)}%</div>
            <Progress 
              value={liveMetrics.systemLoad} 
              className="h-1 mt-1"
            />
          </CardContent>
        </Card>
      </div>

      {/* 실시간 업데이트 스트림 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className={cn(
                "h-5 w-5",
                isMonitoring && "animate-spin"
              )} />
              <span>실시간 업데이트</span>
              <Badge variant="secondary">{updates.length}</Badge>
            </CardTitle>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUpdates([])}
              disabled={updates.length === 0}
            >
              모두 지우기
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!isMonitoring ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-medium mb-2">모니터링이 중지됨</h3>
              <p>실시간 업데이트를 보려면 모니터링을 시작하세요.</p>
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-medium mb-2">업데이트 대기 중</h3>
              <p>새로운 활동이 감지되면 여기에 표시됩니다.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {updates.map((update) => (
                <div
                  key={update.id}
                  className={cn(
                    "flex items-start space-x-3 p-3 rounded-lg border transition-all",
                    getPriorityColor(update.priority)
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getUpdateIcon(update.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium">{update.title}</h4>
                      {update.platform && (
                        <span className="text-sm">
                          {getPlatformEmoji(update.platform)}
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          update.priority === "high" && "border-red-500 text-red-600",
                          update.priority === "medium" && "border-yellow-500 text-yellow-600"
                        )}
                      >
                        {update.priority}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-1">
                      {update.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{formatRelativeTime(update.timestamp)}</span>
                      
                      {update.value && (
                        <span className="font-medium">
                          값: {update.value.toLocaleString()}
                        </span>
                      )}
                      
                      {update.change && (
                        <span className={cn(
                          "flex items-center space-x-1",
                          update.change > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {update.change > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span>{Math.abs(update.change)}%</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 연결 상태 표시 */}
      {!isConnected && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-600">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm font-medium">연결이 끊어졌습니다</span>
            </div>
            <p className="text-sm text-red-600/80 mt-1">
              실시간 업데이트가 일시적으로 중단되었습니다. 자동으로 재연결을 시도합니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 접근성 개선을 위한 ARIA 레이블
RealtimeMonitor.displayName = "RealtimeMonitor";

export default RealtimeMonitor;