/**
 * SLO 모니터링 프로바이더 컴포넌트
 * 클라이언트 사이드에서 SLO 모니터링 시스템 초기화
 */

'use client';

import { useEffect } from 'react';
import { initializeSLOMonitoring } from '@/monitoring/slo-monitoring';

export default function SLOMonitoringProvider() {
  useEffect(() => {
    // SLO 모니터링 시스템 초기화
    initializeSLOMonitoring();

    // 페이지 가시성 변경 시 동기화
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && (window as any).sloMonitoring) {
        (window as any).sloMonitoring.syncToConvex();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
}