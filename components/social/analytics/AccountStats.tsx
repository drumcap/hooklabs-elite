"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { Separator } from "../../ui/separator";
import { Progress } from "../../ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageCircle, 
  Send, 
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Activity
} from "lucide-react";
import { cn } from "../../../lib/utils";

interface AccountStatsProps {
  /** 통계를 조회할 소셜 계정 ID */
  accountId: Id<"socialAccounts">;
  /** 시작 날짜 (선택사항) */
  startDate?: string;
  /** 종료 날짜 (선택사항) */
  endDate?: string;
  /** 컴포넌트의 스타일 클래스 */
  className?: string;
  /** 상세 모드 활성화 여부 */
  detailed?: boolean;
}

interface AccountStatsData {
  totalScheduled: number;
  published: number;
  failed: number;
  pending: number;
  successRate: number;
}

/**
 * 소셜 미디어 계정의 상세 통계를 표시하는 대시보드 컴포넌트
 */
export function AccountStats({
  accountId,
  startDate,
  endDate,
  className,
  detailed = true,
}: AccountStatsProps) {
  // 계정 정보 조회
  const account = useQuery(api.socialAccounts.get, { id: accountId });
  
  // 계정 통계 조회
  const stats = useQuery(api.socialAccounts.getAccountStats, {
    accountId,
    startDate,
    endDate,
  });

  // 성공률 색상 결정
  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  // 성공률 바 색상 결정
  const getSuccessRateBarColor = (rate: number): string => {
    if (rate >= 90) return "bg-green-500";
    if (rate >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  // 통계 상태 아이콘
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  // 플랫폼 이모지
  const getPlatformEmoji = (platform: string): string => {
    const emojis: Record<string, string> = {
      twitter: "🐦",
      instagram: "📷",
      linkedin: "💼",
      facebook: "👥",
      youtube: "🎥",
    };
    return emojis[platform?.toLowerCase()] || "🔗";
  };

  // 로딩 상태
  if (account === undefined || stats === undefined) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!account || !stats) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-muted-foreground">
            <AlertCircle className="h-5 w-5 mr-2" />
            계정 통계를 불러올 수 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    {
      title: "총 예약",
      value: stats.totalScheduled,
      icon: <Send className="h-4 w-4" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "발행 완료",
      value: stats.published,
      icon: <CheckCircle className="h-4 w-4" />,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "발행 실패",
      value: stats.failed,
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-900/20",
    },
    {
      title: "대기 중",
      value: stats.pending,
      icon: <Clock className="h-4 w-4" />,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    },
  ];

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center space-x-3">
          {/* 플랫폼 아이콘 */}
          <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-lg text-lg">
            {getPlatformEmoji(account.platform)}
          </div>
          
          <div className="flex-1">
            <CardTitle className="flex items-center space-x-2">
              <span>{account.displayName}</span>
              <Badge variant="outline" className="text-xs">
                {account.platform}
              </Badge>
              {account.verificationStatus === "verified" && (
                <Badge variant="secondary" className="text-xs">
                  인증됨
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              @{account.username} • 게시물 통계
            </CardDescription>
          </div>

          {/* 계정 활성 상태 */}
          <Badge variant={account.isActive ? "default" : "secondary"}>
            {account.isActive ? "활성" : "비활성"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 메인 통계 카드들 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card, index) => (
            <div
              key={index}
              className={cn(
                "p-4 rounded-lg border transition-colors hover:shadow-sm",
                card.bgColor
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </span>
                <div className={cn("p-1 rounded", card.color)}>
                  {card.icon}
                </div>
              </div>
              <div className="text-2xl font-bold">{card.value}</div>
            </div>
          ))}
        </div>

        {/* 성공률 섹션 */}
        <div className="space-y-4">
          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">발행 성공률</span>
              </div>
              <div className={cn("text-lg font-bold", getSuccessRateColor(stats.successRate))}>
                {stats.successRate}%
              </div>
            </div>
            
            <div className="space-y-2">
              <Progress 
                value={stats.successRate} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 상세 정보 (detailed 모드일 때만 표시) */}
        {detailed && (
          <>
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 계정 메트릭 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>계정 메트릭</span>
                </h4>
                
                <div className="space-y-2 text-sm">
                  {account.followers !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">팔로워</span>
                      <span className="font-medium">{account.followers.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {account.following !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">팔로잉</span>
                      <span className="font-medium">{account.following.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {account.postsCount !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">총 게시물</span>
                      <span className="font-medium">{account.postsCount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 연결 정보 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center space-x-2">
                  <Activity className="h-4 w-4" />
                  <span>연결 정보</span>
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">마지막 동기화</span>
                    <span className="font-medium">
                      {new Date(account.lastSyncedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">연결 날짜</span>
                    <span className="font-medium">
                      {new Date(account.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">토큰 상태</span>
                    <div className="flex items-center space-x-1">
                      {account.tokenExpiresAt ? (
                        <>
                          <Clock className="h-3 w-3 text-amber-500" />
                          <span className="text-xs font-medium text-amber-600">
                            {(() => {
                              const expiry = new Date(account.tokenExpiresAt);
                              const now = new Date();
                              const diff = expiry.getTime() - now.getTime();
                              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                              return days > 0 ? `${days}일 후 만료` : "만료됨";
                            })()}
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-xs font-medium text-green-600">정상</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// 접근성 개선을 위한 ARIA 레이블
AccountStats.displayName = "AccountStats";

export default AccountStats;