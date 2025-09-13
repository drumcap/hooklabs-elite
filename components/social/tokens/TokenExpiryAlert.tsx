"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Alert, AlertDescription } from "../../ui/alert";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { RefreshCw, AlertTriangle, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { cn } from "../../../lib/utils";

interface TokenExpiryAlertProps {
  /** 몇 시간 이내에 만료되는 토큰을 조회할지 설정 (기본값: 24시간) */
  hoursThreshold?: number;
  /** 컴포넌트의 스타일 클래스 */
  className?: string;
  /** 자동 새로고침 활성화 여부 (기본값: true) */
  autoRefresh?: boolean;
}

interface ExpiringToken {
  _id: string;
  platform: string;
  username: string;
  displayName: string;
  tokenExpiresAt?: string;
}

/**
 * 만료 예정인 소셜 미디어 계정 토큰을 표시하고 새로고침 기능을 제공하는 컴포넌트
 */
export function TokenExpiryAlert({
  hoursThreshold = 24,
  className,
  autoRefresh = true,
}: TokenExpiryAlertProps) {
  // 만료 예정 토큰 조회
  const expiringTokens = useQuery(api.socialAccounts.getExpiringTokens, {
    hoursThreshold,
  });

  // 토큰 새로고침 뮤테이션 (실제 구현은 백엔드에서 처리)
  const refreshToken = useMutation(api.socialAccounts.updateTokens);

  const [refreshingTokens, setRefreshingTokens] = React.useState<Set<string>>(new Set());

  // 토큰 만료까지 남은 시간 계산
  const getTimeUntilExpiry = (expiresAt?: string): string => {
    if (!expiresAt) return "알 수 없음";
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return "만료됨";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분 후`;
    }
    return `${minutes}분 후`;
  };

  // 만료 위험도에 따른 스타일 결정
  const getExpiryVariant = (expiresAt?: string): "default" | "secondary" | "destructive" => {
    if (!expiresAt) return "secondary";
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    const hoursLeft = diff / (1000 * 60 * 60);
    
    if (hoursLeft <= 0) return "destructive";
    if (hoursLeft <= 2) return "destructive";
    if (hoursLeft <= 12) return "secondary";
    return "default";
  };

  // 플랫폼 아이콘 매핑
  const getPlatformIcon = (platform: string): string => {
    const icons: Record<string, string> = {
      twitter: "🐦",
      instagram: "📷",
      linkedin: "💼",
      facebook: "👥",
      youtube: "🎥",
    };
    return icons[platform.toLowerCase()] || "🔗";
  };

  // 토큰 새로고침 핸들러
  const handleRefreshToken = async (tokenId: string, platform: string) => {
    setRefreshingTokens(prev => new Set(prev).add(tokenId));
    
    try {
      // 실제 OAuth 플로우를 통한 토큰 새로고침은 백엔드에서 처리
      // 여기서는 사용자를 OAuth 플로우로 리다이렉트
      window.open(`/auth/${platform.toLowerCase()}/refresh?accountId=${tokenId}`, '_blank');
    } catch (error) {
      console.error("토큰 새로고침 오류:", error);
    } finally {
      setRefreshingTokens(prev => {
        const newSet = new Set(prev);
        newSet.delete(tokenId);
        return newSet;
      });
    }
  };

  // 로딩 상태
  if (expiringTokens === undefined) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-9 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 만료 예정 토큰이 없는 경우
  if (!expiringTokens || expiringTokens.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <CardTitle className="text-lg">토큰 상태</CardTitle>
          </div>
          <CardDescription>
            모든 연결된 계정의 토큰이 안전합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              현재 {hoursThreshold}시간 이내에 만료 예정인 토큰이 없습니다.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">토큰 만료 알림</CardTitle>
          </div>
          <Badge variant="secondary" className="ml-auto">
            {expiringTokens.length}개 계정
          </Badge>
        </div>
        <CardDescription>
          {hoursThreshold}시간 이내에 만료 예정인 계정의 토큰을 새로고침해 주세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {expiringTokens.map((token) => (
            <div
              key={token._id}
              className="flex items-center space-x-4 p-4 border border-border rounded-lg"
            >
              {/* 플랫폼 아이콘 */}
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-muted rounded-lg text-lg">
                {getPlatformIcon(token.platform)}
              </div>

              {/* 계정 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium truncate">
                    {token.displayName}
                  </h4>
                  <Badge
                    variant={getExpiryVariant(token.tokenExpiresAt)}
                    className="text-xs"
                  >
                    {token.platform}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-muted-foreground truncate">
                    @{token.username}
                  </p>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{getTimeUntilExpiry(token.tokenExpiresAt)}</span>
                  </div>
                </div>
              </div>

              {/* 만료 상태 */}
              <div className="flex-shrink-0">
                <Badge variant={getExpiryVariant(token.tokenExpiresAt)}>
                  {(() => {
                    const variant = getExpiryVariant(token.tokenExpiresAt);
                    if (variant === "destructive") return "위험";
                    if (variant === "secondary") return "주의";
                    return "양호";
                  })()}
                </Badge>
              </div>

              {/* 새로고침 버튼 */}
              <div className="flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRefreshToken(token._id, token.platform)}
                  disabled={refreshingTokens.has(token._id)}
                  className="h-9"
                >
                  {refreshingTokens.has(token._id) ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      갱신
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* 도움말 텍스트 */}
        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>토큰 갱신 방법:</strong> 갱신 버튼을 클릭하면 새 창에서 해당 플랫폼의 재인증 과정이 시작됩니다. 
            인증을 완료하면 토큰이 자동으로 갱신됩니다.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// 접근성 개선을 위한 ARIA 레이블
TokenExpiryAlert.displayName = "TokenExpiryAlert";

export default TokenExpiryAlert;