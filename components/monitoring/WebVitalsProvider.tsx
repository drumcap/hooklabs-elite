"use client";

import { useEffect } from 'react';
// import { initializeWebVitals } from '@/lib/monitoring/webVitals';
// import { businessMetrics } from '@/lib/monitoring/businessMetrics';
import { usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export function WebVitalsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userId } = useAuth();

  useEffect(() => {
    // TODO: 모니터링 모듈들이 활성화되면 재활성화
    // Web Vitals 초기화 및 페이지 뷰 추적
    console.log('Page view:', pathname);
  }, [pathname]);

  useEffect(() => {
    // TODO: 모니터링 모듈들이 활성화되면 재활성화
    // 사용자 활동 추적
    console.log('User activity:', userId ? 'logged in' : 'logged out');
  }, [userId]);

  return <>{children}</>;
}