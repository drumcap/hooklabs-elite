/**
 * SLO 위반 알림 웹훅 엔드포인트
 * SLO 위반 발생 시 외부 시스템 (Slack, Discord, 이메일 등)으로 알림 전송
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Slack 웹훅 URL (환경변수로 설정)
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      alert_id,
      service,
      metric_type,
      alert_type,
      severity,
      title,
      description,
      current_value,
      threshold_value,
      status
    } = body;

    // 알림 데이터 검증
    if (!alert_id || !service || !severity || !title) {
      return NextResponse.json(
        { error: 'Required fields missing: alert_id, service, severity, title' },
        { status: 400 }
      );
    }

    // Convex에 알림 기록
    await convex.mutation(api.sloTracking.recordSLOAlert, {
      alert_id,
      service,
      metric_type: metric_type || 'unknown',
      alert_type: alert_type || 'slo_breach',
      severity,
      title,
      description: description || '',
      current_value: current_value || 0,
      threshold_value: threshold_value || 0,
      status: status || 'firing',
      fired_at: Date.now()
    });

    // 심각도에 따른 알림 전송
    const alertPromises = [];

    // Slack 알림 전송
    if (SLACK_WEBHOOK_URL && (severity === 'critical' || severity === 'warning')) {
      alertPromises.push(sendSlackAlert({
        alert_id,
        service,
        metric_type,
        severity,
        title,
        description,
        current_value,
        threshold_value
      }));
    }

    // Discord 알림 전송
    if (DISCORD_WEBHOOK_URL && severity === 'critical') {
      alertPromises.push(sendDiscordAlert({
        alert_id,
        service,
        metric_type,
        severity,
        title,
        description,
        current_value,
        threshold_value
      }));
    }

    // 이메일 알림 (critical만)
    if (severity === 'critical') {
      alertPromises.push(sendEmailAlert({
        alert_id,
        service,
        metric_type,
        severity,
        title,
        description,
        current_value,
        threshold_value
      }));
    }

    // 모든 알림 병렬 전송
    await Promise.allSettled(alertPromises);

    return NextResponse.json({
      success: true,
      message: 'SLO alert processed and notifications sent'
    });
  } catch (error) {
    console.error('SLO 알림 처리 오류:', error);
    return NextResponse.json(
      { error: 'Failed to process SLO alert' },
      { status: 500 }
    );
  }
}

// Slack 알림 전송
async function sendSlackAlert(alertData: any) {
  if (!SLACK_WEBHOOK_URL) return;

  const color = alertData.severity === 'critical' ? '#dc2626' : '#f59e0b';
  const emoji = alertData.severity === 'critical' ? '🚨' : '⚠️';

  const slackMessage = {
    text: `${emoji} SLO 위반 알림`,
    attachments: [
      {
        color,
        title: `[${alertData.severity.toUpperCase()}] ${alertData.title}`,
        fields: [
          {
            title: '서비스',
            value: getServiceDisplayName(alertData.service),
            short: true
          },
          {
            title: '메트릭',
            value: getMetricDisplayName(alertData.metric_type),
            short: true
          },
          {
            title: '현재 값',
            value: `${alertData.current_value?.toFixed(2) || 'N/A'}`,
            short: true
          },
          {
            title: '목표 값',
            value: `${alertData.threshold_value?.toFixed(2) || 'N/A'}`,
            short: true
          }
        ],
        text: alertData.description,
        footer: 'HookLabs Elite SLO 모니터링',
        ts: Math.floor(Date.now() / 1000)
      }
    ]
  };

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage)
    });

    if (!response.ok) {
      console.error('Slack 알림 전송 실패:', await response.text());
    }
  } catch (error) {
    console.error('Slack 알림 전송 오류:', error);
  }
}

// Discord 알림 전송
async function sendDiscordAlert(alertData: any) {
  if (!DISCORD_WEBHOOK_URL) return;

  const color = alertData.severity === 'critical' ? 0xdc2626 : 0xf59e0b;
  const emoji = alertData.severity === 'critical' ? '🚨' : '⚠️';

  const discordMessage = {
    embeds: [
      {
        title: `${emoji} SLO 위반 알림`,
        description: `**[${alertData.severity.toUpperCase()}]** ${alertData.title}`,
        color,
        fields: [
          {
            name: '서비스',
            value: getServiceDisplayName(alertData.service),
            inline: true
          },
          {
            name: '메트릭',
            value: getMetricDisplayName(alertData.metric_type),
            inline: true
          },
          {
            name: '현재 값',
            value: `${alertData.current_value?.toFixed(2) || 'N/A'}`,
            inline: true
          },
          {
            name: '목표 값',
            value: `${alertData.threshold_value?.toFixed(2) || 'N/A'}`,
            inline: true
          },
          {
            name: '상세 내용',
            value: alertData.description || '상세 정보 없음',
            inline: false
          }
        ],
        footer: {
          text: 'HookLabs Elite SLO 모니터링'
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordMessage)
    });

    if (!response.ok) {
      console.error('Discord 알림 전송 실패:', await response.text());
    }
  } catch (error) {
    console.error('Discord 알림 전송 오류:', error);
  }
}

// 이메일 알림 전송 (예시)
async function sendEmailAlert(alertData: any) {
  // 실제 이메일 서비스 (SendGrid, Resend, etc.) 연동
  console.log('이메일 알림 전송 (구현 예정):', alertData);

  // 예시: Resend 사용
  // const { Resend } = require('resend');
  // const resend = new Resend(process.env.RESEND_API_KEY);
  //
  // await resend.emails.send({
  //   from: 'alerts@hooklabs.com',
  //   to: ['admin@hooklabs.com'],
  //   subject: `[CRITICAL] SLO 위반 - ${alertData.service}`,
  //   html: generateEmailTemplate(alertData)
  // });
}

// 유틸리티 함수들
function getServiceDisplayName(service: string) {
  const names: Record<string, string> = {
    'web': '웹 프론트엔드',
    'api': 'API 백엔드',
    'content-generation': 'AI 콘텐츠 생성'
  };
  return names[service] || service;
}

function getMetricDisplayName(metricType: string) {
  const names: Record<string, string> = {
    'availability': '가용성',
    'latency': '지연시간',
    'error_rate': '에러율',
    'performance': '성능',
    'quality': '품질',
    'lcp_performance': 'LCP 성능',
    'fid_performance': 'FID 성능',
    'overall_performance': '전체 웹 성능',
    'success_rate': '성공률'
  };
  return names[metricType] || metricType;
}