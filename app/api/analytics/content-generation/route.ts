/**
 * 콘텐츠 생성 성능 메트릭 수집 API 엔드포인트
 * AI 콘텐츠 생성 성능 데이터를 수신하여 Convex에 저장
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id: generation_id,
      startTime: start_time,
      endTime: end_time,
      duration,
      success,
      type,
      qualityScore: quality_score,
      session_id,
      model_used,
      token_count,
      credits_used,
      error_type,
      error_message
    } = body;

    // 콘텐츠 생성 데이터 검증
    if (!generation_id || !start_time || success === undefined || !type) {
      return NextResponse.json(
        { error: 'Required fields missing: generation_id, start_time, success, type' },
        { status: 400 }
      );
    }

    // Convex에 콘텐츠 생성 메트릭 저장
    await convex.mutation(api.sloTracking.recordContentGeneration, {
      timestamp: start_time,
      generation_id,
      type,
      start_time,
      end_time,
      duration,
      success,
      quality_score,
      user_feedback: quality_score ? (quality_score >= 4 ? 'excellent' : quality_score >= 3 ? 'good' : 'bad') : undefined,
      model_used,
      token_count,
      credits_used,
      session_id: session_id || 'unknown',
      error_type,
      error_message
    });

    // 콘텐츠 생성 성공률 SLO 메트릭 기록
    const successValue = success ? 100 : 0;

    await convex.mutation(api.sloTracking.recordSLOMetric, {
      timestamp: start_time,
      service: 'content-generation',
      metric_type: 'availability',
      value: successValue,
      target: 99.5, // 99.5% success rate target
      window_duration: '1h',
      measurement_period: 60 * 60 * 1000,
      session_id: session_id,
      additional_data: {
        generation_id,
        type,
        success,
        model_used,
        credits_used
      }
    });

    // 콘텐츠 생성 지연시간 SLO 메트릭 기록 (성공한 생성만)
    if (success && duration) {
      const latencyThreshold = 30000; // 30초 목표
      const latencyValue = duration <= latencyThreshold ? 100 : 0;

      await convex.mutation(api.sloTracking.recordSLOMetric, {
        timestamp: start_time,
        service: 'content-generation',
        metric_type: 'latency',
        value: latencyValue,
        target: 95, // 95% under 30 seconds
        threshold: latencyThreshold,
        window_duration: '1h',
        measurement_period: 60 * 60 * 1000,
        session_id: session_id,
        additional_data: {
          generation_id,
          type,
          duration,
          threshold: latencyThreshold
        }
      });
    }

    // 콘텐츠 품질 SLO 메트릭 기록 (품질 점수가 있는 경우)
    if (quality_score !== undefined) {
      const qualityThreshold = 3.0; // 5점 만점에 3점 이상
      const qualityValue = quality_score >= qualityThreshold ? 100 : 0;

      await convex.mutation(api.sloTracking.recordSLOMetric, {
        timestamp: start_time,
        service: 'content-generation',
        metric_type: 'quality',
        value: qualityValue,
        target: 90, // 90% good quality
        threshold: qualityThreshold,
        window_duration: '24h',
        measurement_period: 24 * 60 * 60 * 1000,
        session_id: session_id,
        additional_data: {
          generation_id,
          type,
          quality_score,
          threshold: qualityThreshold
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('콘텐츠 생성 메트릭 저장 오류:', error);
    return NextResponse.json(
      { error: 'Failed to record content generation metric' },
      { status: 500 }
    );
  }
}