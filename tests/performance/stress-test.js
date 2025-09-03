import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// 커스텀 메트릭
const errorRate = new Rate('stress_errors');
const failureCounter = new Counter('failure_count');
const recoveryTime = new Trend('recovery_time');

export const options = {
  stages: [
    // 점진적 증가 단계
    { duration: '2m', target: 50 },   // 50 사용자
    { duration: '3m', target: 200 },  // 200 사용자
    { duration: '3m', target: 500 },  // 500 사용자
    { duration: '5m', target: 1000 }, // 1000 사용자 (스트레스 포인트)
    { duration: '3m', target: 1500 }, // 1500 사용자 (한계 테스트)
    { duration: '5m', target: 2000 }, // 2000 사용자 (극한 스트레스)
    { duration: '10m', target: 0 },   // 복구 테스트
  ],

  thresholds: {
    // 스트레스 테스트 임계값 (더 관대함)
    http_req_duration: ['p(95)<2000'], // 95%가 2초 이하
    http_req_failed: ['rate<0.2'],     // 오류율 20% 이하
    stress_errors: ['rate<0.3'],       // 스트레스 오류율 30% 이하
  },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  console.log('🔥 스트레스 테스트 시작');
  
  // 초기 서버 상태 확인
  const healthCheck = http.get(`${baseUrl}/api/health`);
  const initialResponse = check(healthCheck, {
    '초기 서버 상태 정상': (r) => r.status === 200,
  });

  return { 
    baseUrl,
    startTime: Date.now(),
    initialHealthy: initialResponse
  };
}

export default function(data) {
  const testStartTime = Date.now();

  // 1. 메인 페이지 스트레스 테스트
  const mainPageResponse = http.get(`${data.baseUrl}/`, {
    timeout: '30s', // 스트레스 상황에서 더 긴 타임아웃
  });

  const mainPageCheck = check(mainPageResponse, {
    '메인 페이지 응답': (r) => r.status === 200,
    '메인 페이지 응답시간 < 5초': (r) => r.timings.duration < 5000,
  });

  if (!mainPageCheck) {
    errorRate.add(1);
    failureCounter.add(1);
  }

  // 2. 동시 API 호출 스트레스
  const apiCalls = [
    http.get(`${data.baseUrl}/api/health`),
    http.get(`${data.baseUrl}/api/lemonsqueezy/checkout`),
    http.get(`${data.baseUrl}/dashboard`),
  ];

  apiCalls.forEach((response, index) => {
    const success = check(response, {
      [`API ${index} 응답`]: (r) => r.status < 500, // 5xx 에러만 실패로 간주
    });
    
    if (!success) {
      errorRate.add(1);
      failureCounter.add(1);
    }
  });

  // 3. 리소스 집약적 작업 시뮬레이션
  if (__VU % 10 === 0) { // 10% 사용자만 실행
    const heavyRequest = http.post(`${data.baseUrl}/api/lemonsqueezy/checkout`, 
      JSON.stringify({
        variantId: '12345',
        customData: { test: 'stress-test', timestamp: Date.now() }
      }), 
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: '60s',
      }
    );

    check(heavyRequest, {
      '무거운 요청 처리': (r) => r.status < 500,
    }) || errorRate.add(1);
  }

  // 4. 메모리 집약적 작업 시뮬레이션
  const largePage = http.get(`${data.baseUrl}/dashboard/payment-gated`, {
    timeout: '30s',
  });

  check(largePage, {
    '큰 페이지 로드': (r) => r.status === 200 || r.status === 302,
  }) || errorRate.add(1);

  // 5. 연결 유지 및 재시도 로직
  if (mainPageResponse.status >= 500) {
    console.log(`🔴 서버 오류 감지: ${mainPageResponse.status}`);
    
    // 재시도 로직
    sleep(1);
    const retryResponse = http.get(`${data.baseUrl}/api/health`, {
      timeout: '10s',
    });
    
    if (retryResponse.status === 200) {
      const recoveryDuration = Date.now() - testStartTime;
      recoveryTime.add(recoveryDuration);
      console.log(`🟢 서버 복구 감지: ${recoveryDuration}ms`);
    }
  }

  // 가변적 대기 시간 (스트레스 증가에 따라 대기 시간 감소)
  const waitTime = Math.max(0.1, Math.random() * (3 - (__VU / 1000)));
  sleep(waitTime);
}

export function teardown(data) {
  console.log('🏁 스트레스 테스트 완료');
  
  // 복구 시간 측정
  const recoveryStartTime = Date.now();
  let recovered = false;
  let attempts = 0;
  const maxAttempts = 20;

  while (!recovered && attempts < maxAttempts) {
    sleep(5); // 5초 대기
    attempts++;
    
    const healthCheck = http.get(`${data.baseUrl}/api/health`);
    recovered = check(healthCheck, {
      [`복구 시도 ${attempts}`]: (r) => r.status === 200,
    });
    
    if (recovered) {
      const totalRecoveryTime = Date.now() - recoveryStartTime;
      console.log(`✅ 서버 복구 완료: ${totalRecoveryTime}ms`);
      break;
    }
  }

  if (!recovered) {
    console.log('❌ 서버 복구 실패 - 수동 개입 필요');
  }

  // 최종 상태 리포트
  const testDuration = Date.now() - data.startTime;
  console.log(`📊 전체 테스트 시간: ${testDuration}ms`);
}