// ======================
// 피처 플래그 클라이언트 유틸리티
// HookLabs Elite - 소셜 미디어 자동화 플랫폼
// 클라이언트 사이드 피처 플래그 평가 및 관리
// ======================

import React, { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/nextjs';

// 피처 플래그 컨텍스트 타입
export interface FeatureFlagContext {
  userId: string;
  userAttributes?: {
    groups?: string[];
    plan?: string;
    country?: string;
    language?: string;
    [key: string]: any;
  };
  environment?: string;
}

// 피처 플래그 결과 타입
export interface FeatureFlagResult {
  enabled: boolean;
  reason: string;
  loading: boolean;
  error?: string;
}

// 여러 피처 플래그 결과 타입
export type MultiFeatureFlagResult = Record<string, FeatureFlagResult>;

/**
 * 단일 피처 플래그 훅
 */
export function useFeatureFlag(
  flagKey: string,
  context?: Partial<FeatureFlagContext>
): FeatureFlagResult {
  const { user } = useUser();
  const userId = context?.userId || user?.id || '';

  // TODO: Convex 배포 후 실제 API 연결
  const flagResult = useQuery(
    null as any, // api.featureFlags.evaluateFeatureFlag,
    userId ? {
      key: flagKey,
      userId,
      userAttributes: context?.userAttributes,
      environment: context?.environment || process.env.NEXT_PUBLIC_APP_ENV
    } : 'skip'
  );

  return useMemo(() => {
    if (!userId) {
      return { enabled: false, reason: 'no_user', loading: false };
    }

    if (flagResult === undefined) {
      return { enabled: false, reason: 'loading', loading: true };
    }

    if (flagResult === null) {
      return { enabled: false, reason: 'flag_not_found', loading: false };
    }

    return {
      enabled: flagResult.enabled,
      reason: flagResult.reason,
      loading: false
    };
  }, [flagResult, userId]);
}

/**
 * 여러 피처 플래그 훅
 */
export function useFeatureFlags(
  flagKeys: string[],
  context?: Partial<FeatureFlagContext>
): MultiFeatureFlagResult {
  const { user } = useUser();
  const userId = context?.userId || user?.id || '';

  // TODO: Convex 배포 후 실제 API 연결
  const flagsResult = useQuery(
    null as any, // api.featureFlags.evaluateMultipleFlags,
    userId && flagKeys.length > 0 ? {
      flagKeys,
      userId,
      userAttributes: context?.userAttributes,
      environment: context?.environment || process.env.NEXT_PUBLIC_APP_ENV
    } : 'skip'
  );

  return useMemo(() => {
    if (!userId) {
      return flagKeys.reduce((acc, key) => {
        acc[key] = { enabled: false, reason: 'no_user', loading: false };
        return acc;
      }, {} as MultiFeatureFlagResult);
    }

    if (flagsResult === undefined) {
      return flagKeys.reduce((acc, key) => {
        acc[key] = { enabled: false, reason: 'loading', loading: true };
        return acc;
      }, {} as MultiFeatureFlagResult);
    }

    return flagKeys.reduce((acc, key) => {
      const result = flagsResult?.[key];
      acc[key] = {
        enabled: result?.enabled || false,
        reason: result?.reason || 'flag_not_found',
        loading: false
      };
      return acc;
    }, {} as MultiFeatureFlagResult);
  }, [flagsResult, flagKeys, userId]);
}

/**
 * 소셜 미디어 기능 플래그 훅
 */
export function useSocialMediaFeatureFlags(
  context?: Partial<FeatureFlagContext>
) {
  const socialMediaFlags = [
    'realtime_sync',
    'ai_content_generation',
    'ab_testing_variants',
    'advanced_analytics',
    'token_expiry_alerts',
    'auto_scheduling'
  ];

  return useFeatureFlags(socialMediaFlags, context);
}

/**
 * 피처 플래그 기반 컴포넌트 래퍼
 */
export interface FeatureGateProps {
  flagKey: string;
  context?: Partial<FeatureFlagContext>;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  children: React.ReactNode;
}

export function FeatureGate({
  flagKey,
  context,
  fallback = null,
  loadingFallback = null,
  children
}: FeatureGateProps) {
  const flag = useFeatureFlag(flagKey, context);

  if (flag.loading) {
    return <>{loadingFallback}</>;
  }

  if (!flag.enabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * 여러 피처 플래그 기반 컴포넌트 래퍼
 */
export interface MultiFeatureGateProps {
  flags: {
    key: string;
    required?: boolean; // 필수 플래그인지 (기본값: true)
  }[];
  context?: Partial<FeatureFlagContext>;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  children: React.ReactNode;
  operator?: 'and' | 'or'; // 플래그 조합 로직 (기본값: 'and')
}

export function MultiFeatureGate({
  flags,
  context,
  fallback = null,
  loadingFallback = null,
  children,
  operator = 'and'
}: MultiFeatureGateProps) {
  const flagKeys = flags.map(f => f.key);
  const flagResults = useFeatureFlags(flagKeys, context);

  // 로딩 상태 확인
  const isLoading = Object.values(flagResults).some(result => result.loading);
  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  // 플래그 평가
  const evaluations = flags.map(flag => {
    const result = flagResults[flag.key];
    const isRequired = flag.required !== false; // 기본값은 true
    return { ...flag, enabled: result.enabled, required: isRequired };
  });

  let shouldShow = false;
  if (operator === 'and') {
    // 모든 필수 플래그가 활성화되어야 함
    shouldShow = evaluations
      .filter(e => e.required)
      .every(e => e.enabled);
  } else {
    // 하나 이상의 플래그가 활성화되면 됨
    shouldShow = evaluations.some(e => e.enabled);
  }

  if (!shouldShow) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * 환경 변수 기반 피처 플래그 (빠른 우회용)
 */
export function getEnvironmentFlag(flagKey: string): boolean {
  const envKey = `FEATURE_${flagKey.toUpperCase()}`;
  const envValue = process.env[envKey];
  
  if (envValue === undefined) {
    return false;
  }
  
  return envValue === 'true' || envValue === '1';
}

/**
 * 소셜 미디어 환경 플래그 체크
 */
export function getSocialMediaEnvironmentFlags() {
  return {
    realtimeSync: getEnvironmentFlag('realtime_sync'),
    aiGeneration: getEnvironmentFlag('ai_content_generation'),
    abTesting: getEnvironmentFlag('ab_testing_variants'),
    advancedAnalytics: getEnvironmentFlag('advanced_analytics'),
    tokenAlerts: getEnvironmentFlag('token_expiry_alerts'),
    autoScheduling: getEnvironmentFlag('auto_scheduling')
  };
}

/**
 * 개발자 도구용 피처 플래그 디버그 정보
 */
export function useFeatureFlagDebug(flagKey: string) {
  const { user } = useUser();
  const flag = useFeatureFlag(flagKey);
  
  const debugInfo = useMemo(() => {
    return {
      flagKey,
      userId: user?.id,
      userAttributes: {
        plan: 'free', // 실제 사용자 플랜으로 교체
        country: 'KR',
        language: 'ko'
      },
      environment: process.env.NEXT_PUBLIC_APP_ENV,
      result: flag
    };
  }, [flagKey, user?.id, flag]);

  // 개발 환경에서만 콘솔에 출력
  if (process.env.NODE_ENV === 'development') {
    console.debug('Feature Flag Debug:', debugInfo);
  }

  return debugInfo;
}