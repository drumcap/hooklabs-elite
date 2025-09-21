/**
 * K6 부하 테스트 시나리오
 * 다양한 부하 상황에서 애플리케이션 성능 측정
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// 커스텀 메트릭 정의
const errorRate = new Rate('error_rate');
const apiResponseTime = new Trend('api_response_time');
const authSuccessRate = new Rate('auth_success_rate');
const contentGenerationTime = new Trend('content_generation_time');

// 테스트 설정
export const options = {
  stages: [
    // 램프업: 0 → 10 사용자 (2분)
    { duration: '2m', target: 10 },
    // 안정: 10 사용자 (5분)
    { duration: '5m', target: 10 },
    // 스파이크: 10 → 50 사용자 (1분)
    { duration: '1m', target: 50 },
    // 스파이크 유지: 50 사용자 (2분)
    { duration: '2m', target: 50 },
    // 램프다운: 50 → 0 사용자 (2분)
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    // 기본 성능 기준
    http_req_duration: ['p(95)<2000'], // 95%가 2초 이내
    http_req_failed: ['rate<0.1'],     // 실패율 10% 미만

    // 커스텀 메트릭 기준
    error_rate: ['rate<0.05'],          // 에러율 5% 미만
    api_response_time: ['p(90)<1500'],  // API 응답 90%가 1.5초 이내
    auth_success_rate: ['rate>0.95'],   // 인증 성공률 95% 이상
    content_generation_time: ['p(95)<5000'], // 컨텐츠 생성 95%가 5초 이내
  },
};

// 환경 설정
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// 테스트 데이터
const testUsers = [
  { email: 'loadtest1@example.com', password: 'LoadTest123!' },
  { email: 'loadtest2@example.com', password: 'LoadTest123!' },
  { email: 'loadtest3@example.com', password: 'LoadTest123!' },
  { email: 'loadtest4@example.com', password: 'LoadTest123!' },
  { email: 'loadtest5@example.com', password: 'LoadTest123!' },
];

const samplePersonas = [
  {
    name: 'Tech Enthusiast',
    role: 'Developer',
    tone: 'Professional',
    interests: ['React', 'AI', 'Web Development'],
  },
  {
    name: 'Marketing Expert',
    role: 'Marketer',
    tone: 'Casual',
    interests: ['Digital Marketing', 'Social Media', 'Analytics'],
  },
];

const samplePosts = [
  'Excited to share insights about React 19 features!',
  'Working on an amazing AI project that will revolutionize content creation.',
  'Just published a new blog post about modern web development practices.',
  'Celebrating a successful product launch with the team!',
  'Sharing some productivity tips for remote developers.',
];

// 유틸리티 함수들
function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

function getRandomPersona() {
  return samplePersonas[Math.floor(Math.random() * samplePersonas.length)];
}

function getRandomPost() {
  return samplePosts[Math.floor(Math.random() * samplePosts.length)];
}

function generateAuthToken() {
  // 실제 환경에서는 Clerk JWT 토큰을 사용
  return 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
}

// 메인 테스트 시나리오
export default function () {
  const user = getRandomUser();
  let authToken = '';

  // 1. 인증 테스트
  const authResult = authenticate(user);
  if (authResult.success) {
    authToken = authResult.token;
    authSuccessRate.add(1);
  } else {
    authSuccessRate.add(0);
    errorRate.add(1);
    return; // 인증 실패시 나머지 테스트 중단
  }

  sleep(1);

  // 2. 대시보드 로드 테스트
  loadDashboard(authToken);
  sleep(1);

  // 3. 페르소나 관련 작업
  const personaTests = Math.random() < 0.7; // 70% 확률로 페르소나 테스트
  if (personaTests) {
    testPersonaOperations(authToken);
    sleep(1);
  }

  // 4. 소셜 포스트 관련 작업
  const postTests = Math.random() < 0.8; // 80% 확률로 포스트 테스트
  if (postTests) {
    testSocialPostOperations(authToken);
    sleep(2);
  }

  // 5. AI 컨텐츠 생성 테스트 (가장 부하가 큰 작업)
  const aiTests = Math.random() < 0.3; // 30% 확률로 AI 테스트
  if (aiTests) {
    testAIContentGeneration(authToken);
    sleep(3);
  }

  // 6. 분석 대시보드 테스트
  const analyticsTests = Math.random() < 0.5; // 50% 확률로 분석 테스트
  if (analyticsTests) {
    testAnalyticsDashboard(authToken);
  }
}

// 인증 함수
function authenticate(user) {
  console.log(`Authenticating user: ${user.email}`);

  const response = http.post(`${API_URL}/auth/login`, {
    email: user.email,
    password: user.password,
  }, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'auth_login' },
  });

  const success = check(response, {
    'auth: status 200': (r) => r.status === 200,
    'auth: has token': (r) => r.json('token') !== undefined,
    'auth: response time < 1s': (r) => r.timings.duration < 1000,
  });

  apiResponseTime.add(response.timings.duration);

  if (!success) {
    errorRate.add(1);
    return { success: false };
  }

  return {
    success: true,
    token: response.json('token') || generateAuthToken(),
  };
}

// 대시보드 로드 테스트
function loadDashboard(authToken) {
  console.log('Loading dashboard...');

  const response = http.get(`${BASE_URL}/dashboard`, {
    headers: {
      'Authorization': authToken,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    tags: { name: 'dashboard_load' },
  });

  const success = check(response, {
    'dashboard: status 200': (r) => r.status === 200,
    'dashboard: contains dashboard': (r) => r.body.includes('dashboard'),
    'dashboard: response time < 2s': (r) => r.timings.duration < 2000,
  });

  apiResponseTime.add(response.timings.duration);

  if (!success) {
    errorRate.add(1);
  }
}

// 페르소나 관련 테스트
function testPersonaOperations(authToken) {
  console.log('Testing persona operations...');

  // 페르소나 목록 조회
  let response = http.get(`${API_URL}/personas`, {
    headers: { 'Authorization': authToken },
    tags: { name: 'personas_list' },
  });

  check(response, {
    'personas list: status 200': (r) => r.status === 200,
    'personas list: is array': (r) => Array.isArray(r.json()),
  });

  // 새 페르소나 생성 (30% 확률)
  if (Math.random() < 0.3) {
    const persona = getRandomPersona();
    response = http.post(`${API_URL}/personas`, JSON.stringify(persona), {
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json',
      },
      tags: { name: 'persona_create' },
    });

    check(response, {
      'persona create: status 201': (r) => r.status === 201,
      'persona create: has id': (r) => r.json('id') !== undefined,
    });
  }

  apiResponseTime.add(response.timings.duration);
}

// 소셜 포스트 관련 테스트
function testSocialPostOperations(authToken) {
  console.log('Testing social post operations...');

  // 포스트 목록 조회
  let response = http.get(`${API_URL}/social/posts`, {
    headers: { 'Authorization': authToken },
    tags: { name: 'posts_list' },
  });

  check(response, {
    'posts list: status 200': (r) => r.status === 200,
    'posts list: response time < 1.5s': (r) => r.timings.duration < 1500,
  });

  // 새 포스트 생성 (50% 확률)
  if (Math.random() < 0.5) {
    const postData = {
      content: getRandomPost(),
      platforms: ['twitter', 'linkedin'],
      personaId: 'persona_test_id',
    };

    response = http.post(`${API_URL}/social/posts`, JSON.stringify(postData), {
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json',
      },
      tags: { name: 'post_create' },
    });

    check(response, {
      'post create: status 201': (r) => r.status === 201,
      'post create: has id': (r) => r.json('id') !== undefined,
    });
  }

  apiResponseTime.add(response.timings.duration);
}

// AI 컨텐츠 생성 테스트
function testAIContentGeneration(authToken) {
  console.log('Testing AI content generation...');

  const startTime = Date.now();

  const generationData = {
    originalContent: getRandomPost(),
    personaId: 'persona_test_id',
    platforms: ['twitter', 'linkedin'],
    variantCount: 3,
  };

  const response = http.post(`${API_URL}/ai/generate-variants`, JSON.stringify(generationData), {
    headers: {
      'Authorization': authToken,
      'Content-Type': 'application/json',
    },
    tags: { name: 'ai_generation' },
    timeout: '30s', // AI 생성은 시간이 오래 걸릴 수 있음
  });

  const generationTime = Date.now() - startTime;
  contentGenerationTime.add(generationTime);

  const success = check(response, {
    'ai generation: status 200': (r) => r.status === 200,
    'ai generation: has variants': (r) => r.json('variants') !== undefined,
    'ai generation: response time < 10s': (r) => r.timings.duration < 10000,
  });

  if (!success) {
    errorRate.add(1);
  }
}

// 분석 대시보드 테스트
function testAnalyticsDashboard(authToken) {
  console.log('Testing analytics dashboard...');

  const response = http.get(`${API_URL}/analytics/dashboard`, {
    headers: { 'Authorization': authToken },
    tags: { name: 'analytics_dashboard' },
  });

  check(response, {
    'analytics: status 200': (r) => r.status === 200,
    'analytics: has metrics': (r) => r.json('metrics') !== undefined,
    'analytics: response time < 2s': (r) => r.timings.duration < 2000,
  });

  apiResponseTime.add(response.timings.duration);
}

// 테스트 설정 단계
export function setup() {
  console.log('Setting up load test...');

  // 테스트 사용자 생성 (실제로는 미리 생성되어 있어야 함)
  const setupResponse = http.post(`${API_URL}/test/setup`, {
    users: testUsers,
    personas: samplePersonas,
  });

  console.log(`Setup response: ${setupResponse.status}`);

  return {
    baseUrl: BASE_URL,
    apiUrl: API_URL,
    testStartTime: Date.now(),
  };
}

// 테스트 정리 단계
export function teardown(data) {
  console.log('Tearing down load test...');

  const testDuration = Date.now() - data.testStartTime;
  console.log(`Test completed in ${testDuration}ms`);

  // 테스트 데이터 정리 (선택적)
  http.post(`${API_URL}/test/cleanup`, {
    testSession: data.testStartTime,
  });
}

// 스트레스 테스트 옵션 (별도 실행)
export const stressOptions = {
  stages: [
    { duration: '1m', target: 20 },   // 빠른 램프업
    { duration: '3m', target: 100 },  // 높은 부하
    { duration: '2m', target: 200 },  // 스트레스 레벨
    { duration: '1m', target: 0 },    // 빠른 램프다운
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 스트레스 상황에서는 기준 완화
    http_req_failed: ['rate<0.3'],     // 실패율 30% 미만
  },
};

// 스파이크 테스트 옵션
export const spikeOptions = {
  stages: [
    { duration: '2m', target: 10 },   // 정상 상태
    { duration: '30s', target: 500 }, // 급격한 스파이크
    { duration: '1m', target: 500 },  // 스파이크 유지
    { duration: '30s', target: 10 },  // 정상 복귀
  ],
  thresholds: {
    http_req_duration: ['p(95)<8000'], // 스파이크 시 기준 완화
    http_req_failed: ['rate<0.5'],     // 실패율 50% 미만
  },
};