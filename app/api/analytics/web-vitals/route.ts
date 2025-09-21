/**
 * Web Vitals 메트릭 수집 API 엔드포인트
 * Core Web Vitals (LCP, FID, CLS, TTFB, INP) 데이터를 수신하여 Convex에 저장
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timestamp, event, data, session_id, user_agent } = body;

    // Web Vitals 데이터 검증
    if (!data.metric || !data.value || !data.rating || !data.page) {
      return NextResponse.json(
        { error: 'Required fields missing: metric, value, rating, page' },
        { status: 400 }
      );
    }

    // Convex에 Web Vitals 메트릭 저장
    await convex.mutation(api.sloTracking.recordWebVitals, {
      timestamp: timestamp || Date.now(),
      metric: data.metric,
      value: data.value,
      rating: data.rating,
      page: data.page,
      session_id: session_id || 'unknown',
      user_agent: user_agent || 'unknown',
      navigation_type: data.navigation_type,
      connection_type: data.connection_type,
      device_memory: data.device_memory,
      geo_location: data.geo_location
    });

    // SLO 메트릭도 함께 기록
    const sloValue = data.rating === 'good' ? 100 : data.rating === 'needs-improvement' ? 50 : 0;

    await convex.mutation(api.sloTracking.recordSLOMetric, {
      timestamp: timestamp || Date.now(),
      service: 'web',
      metric_type: 'performance',
      value: sloValue,
      target: 95, // 95% good rating target
      window_duration: '5m',
      measurement_period: 5 * 60 * 1000,
      session_id: session_id,
      user_agent: user_agent,
      page: data.page,
      additional_data: {
        web_vital: data.metric,
        raw_value: data.value,
        rating: data.rating
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Web Vitals 메트릭 저장 오류:', error);
    return NextResponse.json(
      { error: 'Failed to record web vitals metric' },
      { status: 500 }
    );
  }
}