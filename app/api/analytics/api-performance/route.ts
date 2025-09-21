/**
 * API 성능 메트릭 수집 API 엔드포인트
 * API 요청 성능 데이터를 수신하여 Convex에 저장
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      endpoint,
      method,
      status,
      duration,
      timestamp,
      session_id,
      page,
      response_size,
      cache_hit,
      error_type,
      error_message,
      dns_time,
      connect_time,
      ssl_time,
      wait_time,
      download_time
    } = body;

    // API 성능 데이터 검증
    if (!endpoint || !method || !status || duration === undefined) {
      return NextResponse.json(
        { error: 'Required fields missing: endpoint, method, status, duration' },
        { status: 400 }
      );
    }

    // Convex에 API 성능 메트릭 저장
    await convex.mutation(api.sloTracking.recordAPIPerformance, {
      timestamp: timestamp || Date.now(),
      endpoint,
      method,
      status,
      duration,
      session_id: session_id || 'unknown',
      page: page || 'unknown',
      response_size,
      cache_hit,
      error_type,
      error_message,
      dns_time,
      connect_time,
      ssl_time,
      wait_time,
      download_time
    });

    // API 가용성 SLO 메트릭 계산 및 기록
    const isSuccessful = status >= 200 && status < 500 && status !== 0;
    const availabilityValue = isSuccessful ? 100 : 0;

    await convex.mutation(api.sloTracking.recordSLOMetric, {
      timestamp: timestamp || Date.now(),
      service: 'api',
      metric_type: 'availability',
      value: availabilityValue,
      target: 99.9, // 99.9% availability target
      window_duration: '5m',
      measurement_period: 5 * 60 * 1000,
      session_id: session_id,
      page: page,
      additional_data: {
        endpoint,
        method,
        status,
        duration,
        error_type
      }
    });

    // API 지연시간 SLO 메트릭 계산 및 기록
    const latencyThreshold = endpoint.includes('/api/generate') ? 15000 : 500; // AI 생성은 15초, 일반 API는 500ms
    const latencyValue = duration <= latencyThreshold ? 100 : 0;

    await convex.mutation(api.sloTracking.recordSLOMetric, {
      timestamp: timestamp || Date.now(),
      service: 'api',
      metric_type: 'latency',
      value: latencyValue,
      target: 95, // 95% under threshold
      threshold: latencyThreshold,
      window_duration: '5m',
      measurement_period: 5 * 60 * 1000,
      session_id: session_id,
      page: page,
      additional_data: {
        endpoint,
        duration,
        threshold: latencyThreshold
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API 성능 메트릭 저장 오류:', error);
    return NextResponse.json(
      { error: 'Failed to record API performance metric' },
      { status: 500 }
    );
  }
}