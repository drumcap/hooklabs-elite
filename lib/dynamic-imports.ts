import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

/**
 * 동적 임포트 최적화
 * - 코드 스플리팅으로 번들 크기 최적화
 * - 사용자가 실제로 필요할 때만 컴포넌트 로드
 */

// =======================
// 📊 차트 및 분석 컴포넌트
// =======================

export const DynamicChart = dynamic(
  () => import('@/components/charts/analytics-chart'),
  {
    loading: () => <div className="animate-pulse bg-muted h-64 rounded-lg" />,
    ssr: false, // 차트는 클라이언트에서만 렌더링
  }
);

export const DynamicMetricsDashboard = dynamic(
  () => import('@/components/dashboard/metrics-dashboard'),
  {
    loading: () => <div className="animate-pulse bg-muted h-96 rounded-lg" />,
    ssr: false,
  }
);

// =======================
// 🎨 에디터 및 콘텐츠 관리
// =======================

export const DynamicContentEditor = dynamic(
  () => import('@/components/content/content-editor'),
  {
    loading: () => (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-muted rounded" />
        <div className="h-64 bg-muted rounded" />
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-muted rounded" />
          <div className="h-10 w-24 bg-muted rounded" />
        </div>
      </div>
    ),
    ssr: false,
  }
);

export const DynamicRichTextEditor = dynamic(
  () => import('@/components/ui/rich-text-editor'),
  {
    loading: () => <div className="animate-pulse bg-muted h-40 rounded border" />,
    ssr: false,
  }
);

// =======================
// 📱 소셜 미디어 컴포넌트
// =======================

export const DynamicSocialAccountManager = dynamic(
  () => import('@/components/social/social-account-manager'),
  {
    loading: () => (
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded">
            <div className="w-12 h-12 bg-muted rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-32" />
              <div className="h-3 bg-muted rounded w-24" />
            </div>
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    ),
  }
);

export const DynamicPostScheduler = dynamic(
  () => import('@/components/scheduler/post-scheduler'),
  {
    loading: () => (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    ),
  }
);

// =======================
// 💳 결제 및 구독 관리
// =======================

export const DynamicPricingTable = dynamic(
  () => import('@/components/pricing/pricing-table'),
  {
    loading: () => (
      <div className="animate-pulse grid md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-6 space-y-4">
            <div className="h-6 bg-muted rounded w-24" />
            <div className="h-12 bg-muted rounded w-32" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-4 bg-muted rounded" />
              ))}
            </div>
            <div className="h-10 bg-muted rounded" />
          </div>
        ))}
      </div>
    ),
  }
);

export const DynamicSubscriptionManager = dynamic(
  () => import('@/components/subscription/subscription-manager'),
  {
    loading: () => (
      <div className="animate-pulse space-y-6">
        <div className="border rounded-lg p-6 space-y-4">
          <div className="h-6 bg-muted rounded w-40" />
          <div className="h-4 bg-muted rounded w-64" />
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-muted rounded" />
            <div className="h-10 w-24 bg-muted rounded" />
          </div>
        </div>
      </div>
    ),
  }
);

// =======================
// 📋 테이블 및 데이터 표시
// =======================

export const DynamicDataTable = dynamic(
  () => import('@/components/ui/data-table'),
  {
    loading: () => (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-muted rounded" />
        <div className="border rounded">
          <div className="h-12 bg-muted border-b" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/50 border-b last:border-b-0" />
          ))}
        </div>
      </div>
    ),
  }
);

// =======================
// 🎯 모달 및 다이얼로그
// =======================

export const DynamicPersonaModal = dynamic(
  () => import('@/components/personas/persona-modal'),
  {
    loading: () => null, // 모달은 로딩 상태를 보여주지 않음
    ssr: false,
  }
);

export const DynamicImageUploadModal = dynamic(
  () => import('@/components/ui/image-upload-modal'),
  {
    loading: () => null,
    ssr: false,
  }
);

// =======================
// 🎨 미디어 및 파일 관리
// =======================

export const DynamicImageOptimizer = dynamic(
  () => import('@/components/media/image-optimizer'),
  {
    loading: () => <div className="animate-pulse bg-muted h-32 rounded" />,
    ssr: false,
  }
);

export const DynamicFileUpload = dynamic(
  () => import('@/components/ui/file-upload'),
  {
    loading: () => (
      <div className="animate-pulse border-dashed border-2 h-32 rounded-lg bg-muted/20" />
    ),
    ssr: false,
  }
);

// =======================
// 📊 실시간 데이터 컴포넌트
// =======================

export const DynamicLiveMetrics = dynamic(
  () => import('@/components/metrics/live-metrics'),
  {
    loading: () => (
      <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <div className="h-4 bg-muted rounded w-16" />
            <div className="h-8 bg-muted rounded w-12" />
          </div>
        ))}
      </div>
    ),
    ssr: false,
  }
);

// =======================
// 🎨 테마 및 사용자 설정
// =======================

export const DynamicThemeCustomizer = dynamic(
  () => import('@/components/settings/theme-customizer'),
  {
    loading: () => (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-muted rounded w-32" />
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="w-8 h-8 bg-muted rounded-full" />
          ))}
        </div>
      </div>
    ),
    ssr: false,
  }
);

// =======================
// 🔧 유틸리티 함수
// =======================

/**
 * 컴포넌트 동적 임포트 도우미
 */
export function createDynamicComponent<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options?: {
    loading?: ComponentType;
    ssr?: boolean;
  }
) {
  return dynamic(importFn, {
    loading: options?.loading || (() => <div className="animate-pulse bg-muted h-8 rounded" />),
    ssr: options?.ssr ?? true,
  });
}

/**
 * 지연 로딩 도우미
 */
export function lazyLoad<T>(
  importFn: () => Promise<T>,
  delay: number = 0
): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(async () => {
      const module = await importFn();
      resolve(module);
    }, delay);
  });
}