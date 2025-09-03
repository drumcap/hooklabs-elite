"use client";

import { useEffect } from 'react';
import { initializeWebVitals } from '@/lib/monitoring/webVitals';
import { businessMetrics } from '@/lib/monitoring/businessMetrics';
import { usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export function WebVitalsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userId } = useAuth();

  useEffect(() => {
    // Web Vitals 초기화
    const vitalsCollector = initializeWebVitals();

    // 페이지 뷰 추적
    businessMetrics.trackPageView(pathname);

    return () => {
      // 페이지 언로드 시 메트릭 전송
      vitalsCollector?.flush();
    };
  }, [pathname]);

  useEffect(() => {
    // 사용자 로그인/로그아웃 추적
    if (userId) {
      businessMetrics.trackUserActivity('login');
    }

    return () => {
      if (userId) {
        businessMetrics.trackUserActivity('logout');
      }
    };
  }, [userId]);

  return <>{children}</>;
}