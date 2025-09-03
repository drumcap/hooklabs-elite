import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Gauge } from 'k6/metrics';

// 메모리 관련 메트릭
const memoryLeakIndicator = new Trend('memory_leak_indicator');
const longRunningRequests = new Counter('long_running_requests');
const concurrentSessions = new Gauge('concurrent_sessions');
const resourceUsage = new Trend('resource_usage');

export const options = {
  // 장시간 실행으로 메모리 누수 감지
  stages: [
    { duration: '5m', target: 10 },   // 점진적 시작
    { duration: '20m', target: 50 },  // 안정적 로드로 장시간 실행
    { duration: '10m', target: 100 }, // 증가된 로드
    { duration: '30m', target: 50 },  // 장시간 안정적 실행
    { duration: '5m', target: 0 },    // 점진적 종료
  ],

  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
    memory_leak_indicator: ['p(95)<2000'], // 메모리 사용량 지표
    long_running_requests: ['count<50'],    // 장기 실행 요청 개수 제한
  },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

// 메모리 집약적 작업을 위한 대용량 데이터
const generateLargePayload = (size = 1024) => {
  return {
    data: 'x'.repeat(size),
    timestamp: Date.now(),
    randomData: Array.from({ length: 100 }, () => Math.random()),
    nestedObject: {
      level1: {
        level2: {
          level3: {
            data: 'nested data'.repeat(50)
          }
        }
      }
    }
  };
};

export function setup() {
  console.log('🧠 메모리 누수 테스트 시작');
  
  // 초기 메모리 기준선 설정
  const baseline = http.get(`${baseUrl}/api/health`);
  const baselineTime = baseline.timings.duration;
  
  console.log(`📊 기준선 응답시간: ${baselineTime}ms`);
  
  return { 
    baseUrl, 
    baselineResponseTime: baselineTime,
    startTime: Date.now(),
    requestCount: 0
  };
}

export default function(data) {
  const iterationStart = Date.now();
  data.requestCount = (data.requestCount || 0) + 1;
  
  // 현재 동시 세션 수 추적
  concurrentSessions.add(__VU);
  
  // 1. 메모리 집약적 페이지 요청
  const heavyPageResponse = http.get(`${data.baseUrl}/dashboard`, {
    timeout: '30s'
  });
  
  const heavyPageTime = heavyPageResponse.timings.duration;
  
  // 메모리 누수 지표 계산 (응답시간 증가 패턴 감지)
  const memoryIndicator = heavyPageTime - data.baselineResponseTime;
  memoryLeakIndicator.add(memoryIndicator);
  
  check(heavyPageResponse, {
    '대용량 페이지 로드 성공': (r) => r.status === 200 || r.status === 302,
    '응답시간 급증 없음': (r) => memoryIndicator < 5000, // 기준선보다 5초 이상 느려지면 문제
  });

  // 2. 대용량 데이터 POST 요청 (메모리 사용량 증가)
  const largePayload = generateLargePayload(2048); // 2KB 페이로드
  const postResponse = http.post(
    `${data.baseUrl}/api/lemonsqueezy/checkout`,
    JSON.stringify(largePayload),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '45s'
    }
  );
  
  const postResponseTime = postResponse.timings.duration;
  resourceUsage.add(postResponseTime);
  
  if (postResponseTime > 10000) { // 10초 이상 걸리는 요청
    longRunningRequests.add(1);
  }

  // 3. 세션 상태 유지 시뮬레이션
  if (__VU % 5 === 0) { // 20% 사용자만 수행
    // 여러 연속 요청으로 세션 상태 유지
    for (let i = 0; i < 5; i++) {
      const sessionRequest = http.get(`${data.baseUrl}/api/health`, {
        headers: { 
          'Session-Id': `session-${__VU}-${Date.now()}`,
          'Keep-Alive': 'timeout=30, max=100'
        }
      });
      
      check(sessionRequest, {
        '세션 유지 요청 성공': (r) => r.status === 200,
      });
      
      sleep(0.5); // 세션 요청 간 대기
    }
  }

  // 4. 동적 컨텐츠 로드 (JavaScript 실행 시뮬레이션)
  if (data.requestCount % 10 === 0) { // 10번째 요청마다
    const dynamicContent = http.get(`${data.baseUrl}/dashboard/payment-gated`, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache'
      },
      timeout: '20s'
    });
    
    check(dynamicContent, {
      '동적 컨텐츠 로드': (r) => r.status === 200 || r.status === 302,
    });
  }

  // 5. 주기적 메모리 사용량 점검
  const currentTime = Date.now();
  const runDuration = currentTime - data.startTime;
  
  if (data.requestCount % 50 === 0) { // 50번째 요청마다 리포트
    console.log(`🔍 메모리 체크 #${data.requestCount}:`);
    console.log(`   - 실행 시간: ${runDuration}ms`);
    console.log(`   - 현재 응답시간: ${heavyPageTime}ms`);
    console.log(`   - 기준선 대비: +${memoryIndicator}ms`);
    console.log(`   - VU: ${__VU}, 동시 세션: ${__VU}`);
    
    // 메모리 누수 경고
    if (memoryIndicator > 3000) {
      console.log('⚠️  잠재적 메모리 누수 감지!');
    }
  }

  // 6. 가비지 컬렉션 유발을 위한 대용량 객체 생성 후 해제
  if (__VU % 3 === 0) {
    const tempLargeObject = {
      data: generateLargePayload(5120), // 5KB
      timestamp: Date.now(),
      garbage: Array.from({ length: 1000 }, (_, i) => ({ id: i, data: Math.random() }))
    };
    
    // 객체 사용 시뮬레이션
    const objSize = JSON.stringify(tempLargeObject).length;
    resourceUsage.add(objSize / 1024); // KB 단위로 추적
  }

  const iterationEnd = Date.now();
  const iterationDuration = iterationEnd - iterationStart;
  
  // 비정상적으로 긴 반복 시간 감지
  if (iterationDuration > 30000) { // 30초 이상
    console.log(`🐌 느린 반복 감지: ${iterationDuration}ms (VU: ${__VU})`);
  }

  // 적응적 대기 시간 (메모리 사용량에 따라 조정)
  const adaptiveSleep = Math.min(5, Math.max(0.5, memoryIndicator / 1000));
  sleep(adaptiveSleep);
}

export function teardown(data) {
  console.log('🏁 메모리 누수 테스트 완료');
  
  const totalDuration = Date.now() - data.startTime;
  console.log(`📊 총 테스트 시간: ${totalDuration}ms`);
  console.log(`📊 총 요청 수: ${data.requestCount}`);
  
  // 최종 메모리 상태 확인
  const finalCheck = http.get(`${data.baseUrl}/api/health`);
  const finalResponseTime = finalCheck.timings.duration;
  const memoryDrift = finalResponseTime - data.baselineResponseTime;
  
  console.log('📈 메모리 분석 결과:');
  console.log(`   - 초기 응답시간: ${data.baselineResponseTime}ms`);
  console.log(`   - 최종 응답시간: ${finalResponseTime}ms`);
  console.log(`   - 메모리 드리프트: ${memoryDrift}ms`);
  
  if (memoryDrift > 2000) {
    console.log('❌ 잠재적 메모리 누수 발견!');
    console.log('   - 추가 조사 필요');
    console.log('   - 힙 덤프 분석 권장');
  } else if (memoryDrift > 1000) {
    console.log('⚠️  메모리 사용량 증가 관찰');
    console.log('   - 지속적 모니터링 권장');
  } else {
    console.log('✅ 메모리 사용량 안정적');
  }
  
  // 정리 확인
  sleep(5);
  const cleanupCheck = http.get(`${data.baseUrl}/api/health`);
  console.log(`🧹 정리 후 응답시간: ${cleanupCheck.timings.duration}ms`);
}