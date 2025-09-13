"use client";

import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import { UseTokenExpiryOptions, TokenExpiryAlert } from "../../types/social-analytics";

/**
 * 토큰 만료 관리를 위한 커스텀 훅
 * 
 * @param options - 훅 옵션
 * @returns 토큰 만료 관련 데이터와 유틸리티 함수들
 */
export function useTokenExpiry(options: UseTokenExpiryOptions = {}) {
  const {
    hoursThreshold = 24,
    autoRefresh = true,
    onExpiry
  } = options;

  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  // 만료 예정 토큰 조회
  const expiringTokens = useQuery(api.socialAccounts.getExpiringTokens, {
    hoursThreshold,
  });

  // 토큰 만료 상태 분석
  const tokenAnalysis = useMemo(() => {
    if (!expiringTokens) {
      return {
        total: 0,
        critical: 0,
        warning: 0,
        normal: 0,
        alerts: [] as TokenExpiryAlert[],
      };
    }

    const now = new Date();
    const alerts: TokenExpiryAlert[] = expiringTokens.map((token) => {
      const expiresAt = token.tokenExpiresAt ? new Date(token.tokenExpiresAt) : null;
      const hoursUntilExpiry = expiresAt 
        ? Math.max(0, (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))
        : 0;

      let urgencyLevel: "normal" | "warning" | "critical" = "normal";
      if (hoursUntilExpiry <= 0) urgencyLevel = "critical";
      else if (hoursUntilExpiry <= 2) urgencyLevel = "critical";
      else if (hoursUntilExpiry <= 12) urgencyLevel = "warning";

      return {
        ...token,
        hoursUntilExpiry,
        urgencyLevel,
      };
    });

    const critical = alerts.filter(a => a.urgencyLevel === "critical").length;
    const warning = alerts.filter(a => a.urgencyLevel === "warning").length;
    const normal = alerts.filter(a => a.urgencyLevel === "normal").length;

    return {
      total: alerts.length,
      critical,
      warning,
      normal,
      alerts: alerts.sort((a, b) => a.hoursUntilExpiry - b.hoursUntilExpiry),
    };
  }, [expiringTokens]);

  // 만료 콜백 실행
  useEffect(() => {
    if (tokenAnalysis.critical > 0 && onExpiry) {
      const criticalTokens = tokenAnalysis.alerts.filter(
        alert => alert.urgencyLevel === "critical"
      );
      onExpiry(criticalTokens);
    }
  }, [tokenAnalysis.critical, onExpiry, tokenAnalysis.alerts]);

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLastCheck(new Date());
    }, 60000); // 1분마다 체크

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // 토큰 새로고침 URL 생성
  const getRefreshUrl = (accountId: string, platform: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/auth/${platform.toLowerCase()}/refresh?accountId=${accountId}`;
  };

  // 만료 시간까지의 포맷된 시간 반환
  const formatTimeUntilExpiry = (hoursUntilExpiry: number): string => {
    if (hoursUntilExpiry <= 0) return "만료됨";
    
    const hours = Math.floor(hoursUntilExpiry);
    const minutes = Math.floor((hoursUntilExpiry % 1) * 60);
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분 후`;
    }
    return `${minutes}분 후`;
  };

  // 긴급도별 색상 반환
  const getUrgencyColor = (urgency: "normal" | "warning" | "critical"): string => {
    switch (urgency) {
      case "critical":
        return "text-red-600 bg-red-50 border-red-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default:
        return "text-green-600 bg-green-50 border-green-200";
    }
  };

  // 전체 시스템 상태 평가
  const systemStatus = useMemo(() => {
    if (tokenAnalysis.critical > 0) return "critical";
    if (tokenAnalysis.warning > 0) return "warning";
    if (tokenAnalysis.total === 0) return "healthy";
    return "normal";
  }, [tokenAnalysis]);

  // 다음 만료 예정 토큰
  const nextExpiring = tokenAnalysis.alerts[0] || null;

  // 통계 요약
  const summary = {
    totalAccounts: tokenAnalysis.total,
    criticalCount: tokenAnalysis.critical,
    warningCount: tokenAnalysis.warning,
    healthyCount: tokenAnalysis.normal,
    systemStatus,
    nextExpiring,
    lastCheck,
  };

  return {
    // 데이터
    expiringTokens: tokenAnalysis.alerts,
    summary,
    isLoading: expiringTokens === undefined,
    
    // 유틸리티 함수들
    getRefreshUrl,
    formatTimeUntilExpiry,
    getUrgencyColor,
    
    // 새로고침 함수
    refresh: () => setLastCheck(new Date()),
  };
}

export default useTokenExpiry;