import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 사용자 정의 메트릭
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

// 테스트 옵션
export const options = {
  // 단계별 로드 테스트 시나리오
  stages: [
    { duration: '2m', target: 10 }, // 워밍업: 10 사용자까지 증가
    { duration: '5m', target: 100 }, // 정상 로드: 100 사용자
    { duration: '3m', target: 200 }, // 피크 로드: 200 사용자
    { duration: '5m', target: 100 }, // 스케일 다운: 100 사용자
    { duration: '2m', target: 0 },   // 종료: 0 사용자
  ],
  
  // 성능 임계값
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%가 500ms 이하
    http_req_failed: ['rate<0.05'],   // 오류율 5% 이하
    errors: ['rate<0.1'],             // 커스텀 오류율 10% 이하
    api_response_time: ['p(95)<200'], // API 응답시간 200ms 이하
  },
};

// 테스트 데이터
const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
const apiEndpoints = [
  '/api/health',
  '/api/lemonsqueezy/checkout',
  '/api/lemonsqueezy/portal',
];

export function setup() {
  console.log(`🚀 로드 테스트 시작: ${baseUrl}`);
  
  // 서버 헬스 체크
  const healthCheck = http.get(`${baseUrl}/api/health`);
  check(healthCheck, {
    '서버가 정상 응답함': (r) => r.status === 200,
  });
  
  return { baseUrl };
}

export default function(data) {
  // 1. 랜딩 페이지 로드
  const landingPage = http.get(`${data.baseUrl}/`);
  check(landingPage, {
    '랜딩 페이지 로드 성공': (r) => r.status === 200,
    '랜딩 페이지 응답시간 < 2초': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  sleep(Math.random() * 2 + 1); // 1-3초 대기

  // 2. 대시보드 접근 (인증 없이)
  const dashboard = http.get(`${data.baseUrl}/dashboard`);
  check(dashboard, {
    '대시보드 리디렉션 또는 로드 성공': (r) => r.status === 200 || r.status === 302,
  }) || errorRate.add(1);

  sleep(Math.random() * 3 + 1); // 1-4초 대기

  // 3. API 엔드포인트 테스트
  for (const endpoint of apiEndpoints) {
    const startTime = Date.now();
    const response = http.get(`${data.baseUrl}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      timeout: '10s',
    });
    
    const responseTime = Date.now() - startTime;
    apiResponseTime.add(responseTime);
    
    check(response, {
      [`${endpoint} 응답 성공`]: (r) => r.status < 400,
      [`${endpoint} 응답시간 적절`]: (r) => responseTime < 1000,
    }) || errorRate.add(1);

    sleep(0.5); // 500ms 대기
  }

  // 4. 정적 리소스 로드 테스트
  const staticResources = [
    '/_next/static/css/',
    '/_next/static/chunks/',
    '/favicon.ico',
  ];

  staticResources.forEach(resource => {
    const response = http.get(`${data.baseUrl}${resource}`, {
      timeout: '5s',
    });
    check(response, {
      [`정적 리소스 ${resource} 로드`]: (r) => r.status === 200 || r.status === 404,
    });
  });

  sleep(Math.random() * 2 + 1); // 1-3초 대기
}

export function teardown(data) {
  console.log('🏁 로드 테스트 완료');
  
  // 테스트 후 정리 작업
  const finalHealthCheck = http.get(`${data.baseUrl}/api/health`);
  check(finalHealthCheck, {
    '테스트 후 서버 상태 정상': (r) => r.status === 200,
  });
}