/**
 * 실시간 SLO 상태 업데이트 API 엔드포인트
 * 클라이언트에서 계산된 전체 SLO 상태를 수신하여 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timestamp, sloData, session_id } = body;

    if (!sloData || !timestamp) {
      return NextResponse.json(
        { error: 'Required fields missing: sloData, timestamp' },
        { status: 400 }
      );
    }

    const currentTimestamp = timestamp || Date.now();

    // Web Performance SLO 메트릭 기록
    if (sloData.webPerformance) {
      const { lcp, fid, overall } = sloData.webPerformance;

      // LCP SLO 기록
      if (lcp !== undefined) {
        await convex.mutation(api.sloTracking.recordSLOMetric, {
          timestamp: currentTimestamp,
          service: 'web',
          metric_type: 'lcp_performance',
          value: lcp,
          target: 95,
          window_duration: '5m',
          measurement_period: 5 * 60 * 1000,
          session_id: session_id,
          additional_data: { source: 'dashboard_sync' }
        });
      }

      // FID SLO 기록
      if (fid !== undefined) {
        await convex.mutation(api.sloTracking.recordSLOMetric, {
          timestamp: currentTimestamp,
          service: 'web',
          metric_type: 'fid_performance',
          value: fid,
          target: 95,
          window_duration: '5m',
          measurement_period: 5 * 60 * 1000,
          session_id: session_id,
          additional_data: { source: 'dashboard_sync' }
        });
      }

      // 전체 웹 성능 SLO 기록
      if (overall !== undefined) {
        await convex.mutation(api.sloTracking.recordSLOMetric, {
          timestamp: currentTimestamp,
          service: 'web',
          metric_type: 'overall_performance',
          value: overall,
          target: 95,
          window_duration: '5m',
          measurement_period: 5 * 60 * 1000,
          session_id: session_id,
          additional_data: { source: 'dashboard_sync', lcp, fid }
        });
      }
    }

    // API Performance SLO 메트릭 기록
    if (sloData.apiPerformance) {
      const { availability, latency, errorRate } = sloData.apiPerformance;

      if (availability !== undefined) {
        await convex.mutation(api.sloTracking.recordSLOMetric, {
          timestamp: currentTimestamp,
          service: 'api',
          metric_type: 'availability',
          value: availability,
          target: 99.9,
          window_duration: '5m',
          measurement_period: 5 * 60 * 1000,
          session_id: session_id,
          additional_data: { source: 'dashboard_sync' }
        });
      }

      if (latency !== undefined) {
        await convex.mutation(api.sloTracking.recordSLOMetric, {
          timestamp: currentTimestamp,
          service: 'api',
          metric_type: 'latency',
          value: latency,
          target: 95,
          window_duration: '5m',
          measurement_period: 5 * 60 * 1000,
          session_id: session_id,
          additional_data: { source: 'dashboard_sync' }
        });
      }

      if (errorRate !== undefined) {
        await convex.mutation(api.sloTracking.recordSLOMetric, {
          timestamp: currentTimestamp,
          service: 'api',
          metric_type: 'error_rate',
          value: 100 - errorRate, // 에러율을 성공률로 변환
          target: 99,
          window_duration: '5m',
          measurement_period: 5 * 60 * 1000,
          session_id: session_id,
          additional_data: { source: 'dashboard_sync', raw_error_rate: errorRate }
        });
      }
    }

    // Content Generation SLO 메트릭 기록
    if (sloData.contentGeneration) {
      const { successRate, latency, quality } = sloData.contentGeneration;

      if (successRate !== undefined) {
        await convex.mutation(api.sloTracking.recordSLOMetric, {
          timestamp: currentTimestamp,
          service: 'content-generation',
          metric_type: 'success_rate',
          value: successRate,
          target: 99.5,
          window_duration: '1h',
          measurement_period: 60 * 60 * 1000,
          session_id: session_id,
          additional_data: { source: 'dashboard_sync' }
        });
      }

      if (latency !== undefined) {
        await convex.mutation(api.sloTracking.recordSLOMetric, {
          timestamp: currentTimestamp,
          service: 'content-generation',
          metric_type: 'latency',
          value: latency,
          target: 95,
          window_duration: '1h',
          measurement_period: 60 * 60 * 1000,
          session_id: session_id,
          additional_data: { source: 'dashboard_sync' }
        });
      }

      if (quality !== undefined) {
        await convex.mutation(api.sloTracking.recordSLOMetric, {
          timestamp: currentTimestamp,
          service: 'content-generation',
          metric_type: 'quality',
          value: quality,
          target: 90,
          window_duration: '24h',
          measurement_period: 24 * 60 * 60 * 1000,
          session_id: session_id,
          additional_data: { source: 'dashboard_sync' }
        });
      }
    }

    // Error Budget 상태 업데이트 트리거
    if (sloData.errorBudgets) {
      await convex.mutation(api.sloTracking.updateErrorBudgetStatus, {
        timestamp: currentTimestamp,
        errorBudgets: sloData.errorBudgets,
        session_id: session_id
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SLO 상태 업데이트 오류:', error);
    return NextResponse.json(
      { error: 'Failed to update SLO status' },
      { status: 500 }
    );
  }
}