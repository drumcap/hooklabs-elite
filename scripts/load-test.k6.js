import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// 커스텀 메트릭
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const webVitalsLCP = new Trend('web_vitals_lcp');
const convexQueryTime = new Trend('convex_query_time');

// 테스트 설정
export const options = {
  // 스테이지별 부하 테스트
  stages: [
    { duration: '2m', target: 10 },   // Ramp-up: 2분 동안 10명까지 증가
    { duration: '5m', target: 50 },   // 5분 동안 50명까지 증가
    { duration: '10m', target: 100 }, // 10분 동안 100명 유지 (피크 부하)
    { duration: '5m', target: 200 },  // 스트레스 테스트: 200명까지 증가
    { duration: '5m', target: 50 },   // Ramp-down: 50명으로 감소
    { duration: '2m', target: 0 },    // 테스트 종료
  ],
  
  // 성능 임계값
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95%는 500ms, 99%는 1초 이내
    http_req_failed: ['rate<0.1'],                   // 에러율 10% 미만
    errors: ['rate<0.1'],                             // 커스텀 에러율 10% 미만
    api_response_time: ['p(95)<200'],                // API 응답 95%가 200ms 이내
    web_vitals_lcp: ['p(75)<2500'],                  // LCP 75%가 2.5초 이내
  },
  
  // 추가 설정
  ext: {
    loadimpact: {
      projectID: 123456, // Load Impact 프로젝트 ID (선택사항)
      name: 'HookLabs Elite Load Test',
    },
  },
};

// 테스트 환경 설정
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const CONVEX_URL = __ENV.CONVEX_URL || 'https://your-app.convex.cloud';

// 테스트 데이터
const testUsers = [
  { email: 'test1@example.com', password: 'Test123!@#' },
  { email: 'test2@example.com', password: 'Test123!@#' },
  { email: 'test3@example.com', password: 'Test123!@#' },
];

const testPosts = [
  '새로운 SaaS 제품 출시! 🚀 #startup #saas',
  'AI 기반 콘텐츠 생성이 마케팅의 미래입니다.',
  '소셜 미디어 자동화로 시간을 절약하세요.',
];

// 헬퍼 함수
function makeRequest(url, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-load-test',
    },
    timeout: '30s',
  };
  
  const response = http.request(
    options.method || 'GET',
    `${BASE_URL}${url}`,
    options.body ? JSON.stringify(options.body) : null,
    { ...defaultOptions, ...options }
  );
  
  // 응답 시간 기록
  if (url.startsWith('/api/')) {
    apiResponseTime.add(response.timings.duration);
  }
  
  // 에러 체크
  const success = check(response, {
    'status is 200-299': (r) => r.status >= 200 && r.status < 300,
  });
  
  errorRate.add(!success);
  
  return response;
}

// Convex 쿼리 테스트
function testConvexQuery() {
  const startTime = Date.now();
  
  const response = http.post(
    `${CONVEX_URL}/api/query`,
    JSON.stringify({
      path: 'performanceMetrics:getWebVitalsSummary',
      args: { timeRange: '1h' },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  const duration = Date.now() - startTime;
  convexQueryTime.add(duration);
  
  check(response, {
    'Convex query successful': (r) => r.status === 200,
  });
}

// 시나리오 함수들
function browseHomePage() {
  const response = makeRequest('/');
  
  check(response, {
    'homepage loaded': (r) => r.status === 200,
    'has expected content': (r) => r.body.includes('HookLabs Elite'),
  });
  
  // Web Vitals 시뮬레이션
  webVitalsLCP.add(Math.random() * 3000 + 1000); // 1-4초 사이의 랜덤 LCP
  
  sleep(Math.random() * 3 + 1); // 1-4초 대기
}

function browseDashboard() {
  const response = makeRequest('/dashboard');
  
  check(response, {
    'dashboard loaded': (r) => r.status === 200 || r.status === 302, // 리다이렉트 가능
  });
  
  sleep(Math.random() * 2 + 1);
}

function testAPIEndpoints() {
  // 헬스 체크
  const healthResponse = makeRequest('/api/health');
  check(healthResponse, {
    'health check passed': (r) => r.status === 200,
  });
  
  // 성능 메트릭 API
  makeRequest('/api/monitoring/web-vitals', {
    method: 'POST',
    body: {
      sessionId: randomString(10),
      pathname: '/dashboard',
      lcp: Math.random() * 3000 + 1000,
      fid: Math.random() * 200 + 50,
      cls: Math.random() * 0.2,
    },
  });
  
  sleep(1);
}

function testContentCreation() {
  const content = randomItem(testPosts);
  
  const response = makeRequest('/api/content/generate', {
    method: 'POST',
    body: {
      prompt: content,
      personaId: 'test-persona',
      platforms: ['twitter', 'threads'],
    },
  });
  
  check(response, {
    'content generated': (r) => r.status === 200,
    'has variants': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.variants && body.variants.length > 0;
      } catch {
        return false;
      }
    },
  });
  
  sleep(2);
}

function testSocialPosting() {
  const response = makeRequest('/api/social/schedule', {
    method: 'POST',
    body: {
      content: randomItem(testPosts),
      platforms: ['twitter'],
      scheduledFor: new Date(Date.now() + 3600000).toISOString(), // 1시간 후
    },
  });
  
  check(response, {
    'post scheduled': (r) => r.status === 200 || r.status === 201,
  });
  
  sleep(1);
}

function testPaymentFlow() {
  // Lemon Squeezy 체크아웃 생성
  const checkoutResponse = makeRequest('/api/lemonsqueezy/checkout', {
    method: 'POST',
    body: {
      variantId: process.env.LEMONSQUEEZY_VARIANT_ID || '12345',
      email: randomItem(testUsers).email,
    },
  });
  
  check(checkoutResponse, {
    'checkout created': (r) => r.status === 200,
    'has checkout URL': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.checkoutUrl !== undefined;
      } catch {
        return false;
      }
    },
  });
  
  sleep(2);
}

function testMonitoringDashboard() {
  const response = makeRequest('/dashboard/monitoring');
  
  check(response, {
    'monitoring dashboard loaded': (r) => r.status === 200 || r.status === 302,
  });
  
  // 대시보드 데이터 요청들
  testConvexQuery();
  
  sleep(3);
}

// 스트레스 테스트 시나리오
function stressTestScenario() {
  // 동시에 여러 작업 수행
  const batch = http.batch([
    ['GET', `${BASE_URL}/`],
    ['GET', `${BASE_URL}/api/health`],
    ['GET', `${BASE_URL}/dashboard`],
    ['POST', `${BASE_URL}/api/monitoring/web-vitals`, JSON.stringify({
      sessionId: randomString(10),
      pathname: '/',
      lcp: 2000,
    }), { headers: { 'Content-Type': 'application/json' } }],
  ]);
  
  check(batch[0], { 'batch request 1 OK': (r) => r.status === 200 });
  check(batch[1], { 'batch request 2 OK': (r) => r.status === 200 });
}

// 메인 테스트 함수
export default function () {
  // 사용자 시나리오 시뮬레이션 (확률 기반)
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    // 30% - 일반 브라우징
    browseHomePage();
    browseDashboard();
  } else if (scenario < 0.5) {
    // 20% - API 테스트
    testAPIEndpoints();
  } else if (scenario < 0.65) {
    // 15% - 콘텐츠 생성
    testContentCreation();
  } else if (scenario < 0.75) {
    // 10% - 소셜 포스팅
    testSocialPosting();
  } else if (scenario < 0.85) {
    // 10% - 결제 플로우
    testPaymentFlow();
  } else if (scenario < 0.95) {
    // 10% - 모니터링 대시보드
    testMonitoringDashboard();
  } else {
    // 5% - 스트레스 테스트
    stressTestScenario();
  }
}

// 테스트 설정 함수
export function setup() {
  // 테스트 시작 전 준비 작업
  console.log('🚀 로드 테스트 시작');
  console.log(`대상 URL: ${BASE_URL}`);
  
  // 헬스 체크
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    throw new Error('서버가 응답하지 않습니다');
  }
  
  return {
    startTime: Date.now(),
    testId: randomString(10),
  };
}

// 테스트 정리 함수
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`✅ 로드 테스트 완료 (${duration}초)`);
  
  // 테스트 결과 저장 (선택사항)
  http.post(
    `${BASE_URL}/api/monitoring/load-test-results`,
    JSON.stringify({
      testId: data.testId,
      duration,
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// 커스텀 체크 함수
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
    'load-test-results.html': htmlReport(data),
  };
}

function textSummary(data, options) {
  // 텍스트 요약 생성 (k6 기본 제공)
  return JSON.stringify(data, null, 2);
}

function htmlReport(data) {
  // HTML 리포트 생성
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Load Test Results</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; }
        .pass { color: green; }
        .fail { color: red; }
      </style>
    </head>
    <body>
      <h1>HookLabs Elite Load Test Results</h1>
      <div class="metric">
        <h3>Request Duration</h3>
        <p>P95: ${data.metrics.http_req_duration.values['p(95)']}ms</p>
        <p>P99: ${data.metrics.http_req_duration.values['p(99)']}ms</p>
      </div>
      <div class="metric">
        <h3>Error Rate</h3>
        <p class="${data.metrics.http_req_failed.values.rate < 0.1 ? 'pass' : 'fail'}">
          ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
        </p>
      </div>
    </body>
    </html>
  `;
}