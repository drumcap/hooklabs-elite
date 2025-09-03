import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Gauge } from 'k6/metrics';

// API별 커스텀 메트릭
const apiErrorRate = new Rate('api_errors');
const apiResponseTime = new Trend('api_response_time', true);
const activeConnections = new Gauge('active_connections');
const throughput = new Rate('requests_per_second');

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // 워밍업
    { duration: '10m', target: 100 }, // 안정적 로드
    { duration: '2m', target: 0 },    // 쿨다운
  ],

  thresholds: {
    http_req_duration: ['p(95)<200'],     // API는 더 엄격한 기준
    http_req_failed: ['rate<0.01'],       // 오류율 1% 이하
    api_response_time: ['p(99)<500'],     // 99%가 500ms 이하
    api_errors: ['rate<0.02'],            // API 오류율 2% 이하
    checks: ['rate>0.98'],                // 체크 성공률 98% 이상
  },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

// API 엔드포인트 정의
const apiEndpoints = {
  health: {
    method: 'GET',
    url: '/api/health',
    expectedStatus: 200,
    timeout: '5s'
  },
  checkout: {
    method: 'POST',
    url: '/api/lemonsqueezy/checkout',
    payload: {
      variantId: '123456',
      customData: { userId: 'test-user', source: 'k6-test' }
    },
    expectedStatus: 200,
    timeout: '10s'
  },
  portal: {
    method: 'POST',
    url: '/api/lemonsqueezy/portal',
    payload: {
      customerId: 'test-customer'
    },
    expectedStatus: 200,
    timeout: '8s'
  },
  webhookLemonSqueezy: {
    method: 'POST',
    url: '/api/lemonsqueezy/webhook',
    payload: {
      event: 'subscription_created',
      data: {
        id: '123',
        type: 'subscriptions',
        attributes: {
          store_id: 1,
          customer_id: 1,
          order_id: 1,
          status: 'active'
        }
      }
    },
    headers: {
      'X-Event-Name': 'subscription_created',
      'X-Signature': 'test-signature'
    },
    expectedStatus: 200,
    timeout: '15s'
  }
};

export function setup() {
  console.log('🔧 API 성능 테스트 시작');
  
  // 각 API 엔드포인트 기본 연결 테스트
  const setupResults = {};
  
  Object.keys(apiEndpoints).forEach(apiName => {
    const api = apiEndpoints[apiName];
    let response;
    
    try {
      if (api.method === 'GET') {
        response = http.get(`${baseUrl}${api.url}`, { timeout: api.timeout });
      } else {
        response = http.post(
          `${baseUrl}${api.url}`,
          JSON.stringify(api.payload || {}),
          {
            headers: { 'Content-Type': 'application/json', ...api.headers },
            timeout: api.timeout
          }
        );
      }
      
      setupResults[apiName] = {
        available: response.status < 500,
        responseTime: response.timings.duration,
        status: response.status
      };
      
      console.log(`✅ ${apiName}: ${response.status} (${response.timings.duration}ms)`);
    } catch (error) {
      setupResults[apiName] = { available: false, error: error.message };
      console.log(`❌ ${apiName}: ${error.message}`);
    }
  });
  
  return { baseUrl, setupResults };
}

export default function(data) {
  activeConnections.add(1);
  
  // 각 API 엔드포인트 순차 테스트
  Object.keys(apiEndpoints).forEach(apiName => {
    const api = apiEndpoints[apiName];
    
    // 설정 단계에서 사용 불가능한 API는 건너뛰기
    if (!data.setupResults[apiName]?.available) {
      return;
    }
    
    const startTime = Date.now();
    let response;
    
    try {
      if (api.method === 'GET') {
        response = http.get(`${data.baseUrl}${api.url}`, {
          timeout: api.timeout,
          tags: { api: apiName }
        });
      } else {
        response = http.post(
          `${data.baseUrl}${api.url}`,
          JSON.stringify(api.payload || {}),
          {
            headers: { 'Content-Type': 'application/json', ...api.headers },
            timeout: api.timeout,
            tags: { api: apiName }
          }
        );
      }
      
      const responseTime = Date.now() - startTime;
      apiResponseTime.add(responseTime, { api: apiName });
      throughput.add(1);
      
      // API별 상세 검증
      const checks = {
        [`${apiName} 응답 상태`]: (r) => r.status === api.expectedStatus || r.status < 400,
        [`${apiName} 응답 시간`]: (r) => responseTime < parseInt(api.timeout) * 1000,
        [`${apiName} 응답 형식`]: (r) => {
          try {
            // JSON 응답 검증 (해당하는 경우)
            if (r.headers['Content-Type']?.includes('application/json')) {
              JSON.parse(r.body);
              return true;
            }
            return r.body.length > 0;
          } catch {
            return r.status === api.expectedStatus;
          }
        }
      };
      
      const checkResult = check(response, checks);
      
      if (!checkResult) {
        apiErrorRate.add(1, { api: apiName });
        console.log(`❌ ${apiName} 실패: ${response.status}`);
      }
      
      // API별 특별 검증 로직
      switch (apiName) {
        case 'health':
          check(response, {
            'Health API 정상': (r) => r.json('status') === 'ok' || r.status === 200
          });
          break;
          
        case 'checkout':
          check(response, {
            'Checkout 응답에 URL 포함': (r) => {
              try {
                const body = JSON.parse(r.body);
                return body.url || body.checkout_url || r.status < 400;
              } catch {
                return r.status < 400;
              }
            }
          });
          break;
          
        case 'portal':
          check(response, {
            'Portal 응답에 URL 포함': (r) => {
              try {
                const body = JSON.parse(r.body);
                return body.customer_portal_url || r.status < 400;
              } catch {
                return r.status < 400;
              }
            }
          });
          break;
      }
      
    } catch (error) {
      apiErrorRate.add(1, { api: apiName });
      console.log(`💥 ${apiName} 예외: ${error.message}`);
    }
    
    // API 호출 간 짧은 대기
    sleep(0.1);
  });
  
  activeConnections.add(-1);
  
  // 사용자 시뮬레이션 대기 시간
  sleep(Math.random() * 3 + 1);
}

export function teardown(data) {
  console.log('🏁 API 성능 테스트 완료');
  
  // 최종 API 상태 확인
  const finalCheck = {};
  
  Object.keys(apiEndpoints).forEach(apiName => {
    const api = apiEndpoints[apiName];
    
    try {
      let response;
      if (api.method === 'GET') {
        response = http.get(`${data.baseUrl}${api.url}`, { timeout: '5s' });
      }
      
      finalCheck[apiName] = {
        status: response?.status || 'no-response',
        healthy: response?.status < 500
      };
      
    } catch (error) {
      finalCheck[apiName] = { status: 'error', error: error.message };
    }
  });
  
  console.log('📊 최종 API 상태:', JSON.stringify(finalCheck, null, 2));
  
  // 성능 요약 로그
  console.log('📈 API 성능 테스트 요약:');
  console.log('- 총 처리량: throughput 메트릭 참조');
  console.log('- 평균 응답시간: api_response_time 메트릭 참조');
  console.log('- 오류율: api_errors 메트릭 참조');
}