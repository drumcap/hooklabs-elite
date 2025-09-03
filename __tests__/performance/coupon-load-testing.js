// K6 Performance Test for Coupon System
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const couponValidationFailureRate = new Rate('coupon_validation_failures');
const couponValidationDuration = new Trend('coupon_validation_duration');
const couponUsageRate = new Rate('coupon_usage_failures');
const couponCreationRate = new Rate('coupon_creation_failures');
const apiErrorCount = new Counter('api_errors');

// Test configuration
export const options = {
  stages: [
    // Warm-up
    { duration: '30s', target: 10 },
    
    // Normal load
    { duration: '2m', target: 50 },
    
    // Peak load
    { duration: '3m', target: 100 },
    
    // Stress test
    { duration: '2m', target: 200 },
    
    // Spike test
    { duration: '1m', target: 500 },
    
    // Recovery
    { duration: '2m', target: 50 },
    
    // Cool down
    { duration: '30s', target: 0 },
  ],
  
  thresholds: {
    // Overall performance thresholds
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.05'],    // Error rate under 5%
    
    // Coupon-specific thresholds
    coupon_validation_duration: ['p(95)<200'], // Coupon validation under 200ms
    coupon_validation_failures: ['rate<0.02'], // Validation failure rate under 2%
    coupon_usage_failures: ['rate<0.01'],      // Usage failure rate under 1%
    coupon_creation_failures: ['rate<0.05'],   // Creation failure rate under 5%
    
    // System thresholds
    http_reqs: ['rate>100'],          // Minimum 100 RPS
    checks: ['rate>0.95'],            // 95% of checks should pass
  },
  
  // Test data
  ext: {
    loadimpact: {
      name: 'Coupon System Load Test',
      projectID: 'hooklabs-elite-coupons'
    }
  }
};

// Base URL - should be set via environment variable
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data generators
const generateCouponCode = () => {
  const prefix = ['SAVE', 'DISCOUNT', 'OFFER', 'DEAL', 'PROMO'];
  const suffix = Math.floor(Math.random() * 9999);
  return prefix[Math.floor(Math.random() * prefix.length)] + suffix;
};

const generateTestUser = () => ({
  id: `user_${__VU}_${__ITER}`,
  email: `test${__VU}_${__ITER}@example.com`,
  role: Math.random() > 0.9 ? 'admin' : 'user' // 10% admin users
});

const validCoupons = [
  'WELCOME20', 'SAVE10', 'DISCOUNT15', 'OFFER25', 'PROMO30',
  'FIRST20', 'NEW15', 'SPECIAL10', 'BONUS25', 'EXTRA30'
];

const expiredCoupons = [
  'EXPIRED10', 'OLD20', 'PAST15', 'GONE25'
];

const invalidCoupons = [
  'INVALID', 'FAKE20', 'WRONG15', 'BAD25', 'NOTFOUND'
];

// Authentication setup
const getAuthHeaders = (user) => ({
  'Authorization': `Bearer mock-jwt-${user.id}`,
  'Content-Type': 'application/json',
  'X-User-ID': user.id,
  'X-User-Role': user.role
});

export default function() {
  const user = generateTestUser();
  const headers = getAuthHeaders(user);

  group('Coupon Validation Performance', () => {
    // Test valid coupon validation
    group('Valid Coupon Validation', () => {
      const validCoupon = validCoupons[Math.floor(Math.random() * validCoupons.length)];
      const orderAmount = Math.floor(Math.random() * 10000) + 1000; // $10-$100
      
      const payload = JSON.stringify({
        code: validCoupon,
        userId: user.id,
        orderAmount: orderAmount
      });

      const response = http.post(`${BASE_URL}/api/convex/validateCoupon`, payload, { headers });
      
      const validationSuccess = check(response, {
        'validation status is 200': (r) => r.status === 200,
        'validation response time < 200ms': (r) => r.timings.duration < 200,
        'valid coupon returns correct structure': (r) => {
          if (r.status === 200) {
            const body = JSON.parse(r.body);
            return body.valid === true && body.coupon && body.coupon.code === validCoupon;
          }
          return false;
        },
        'discount amount calculated': (r) => {
          if (r.status === 200) {
            const body = JSON.parse(r.body);
            return body.coupon && body.coupon.discountAmount > 0;
          }
          return false;
        }
      });

      couponValidationDuration.add(response.timings.duration);
      couponValidationFailureRate.add(!validationSuccess);
      
      if (response.status !== 200) {
        apiErrorCount.add(1);
      }
    });

    // Test invalid coupon validation
    group('Invalid Coupon Validation', () => {
      const invalidCoupon = invalidCoupons[Math.floor(Math.random() * invalidCoupons.length)];
      
      const payload = JSON.stringify({
        code: invalidCoupon,
        userId: user.id,
        orderAmount: 5000
      });

      const response = http.post(`${BASE_URL}/api/convex/validateCoupon`, payload, { headers });
      
      check(response, {
        'invalid coupon status is 200': (r) => r.status === 200,
        'invalid coupon response time < 100ms': (r) => r.timings.duration < 100,
        'invalid coupon returns error': (r) => {
          if (r.status === 200) {
            const body = JSON.parse(r.body);
            return body.valid === false && body.error;
          }
          return false;
        }
      });

      couponValidationDuration.add(response.timings.duration);
    });

    // Test expired coupon validation
    group('Expired Coupon Validation', () => {
      const expiredCoupon = expiredCoupons[Math.floor(Math.random() * expiredCoupons.length)];
      
      const payload = JSON.stringify({
        code: expiredCoupon,
        userId: user.id,
        orderAmount: 5000
      });

      const response = http.post(`${BASE_URL}/api/convex/validateCoupon`, payload, { headers });
      
      check(response, {
        'expired coupon handled correctly': (r) => {
          if (r.status === 200) {
            const body = JSON.parse(r.body);
            return body.valid === false && body.error.includes('만료');
          }
          return false;
        }
      });
    });
  });

  group('Coupon Usage Performance', () => {
    // Only test coupon usage with valid coupons occasionally
    if (Math.random() < 0.3) { // 30% of iterations
      const validCoupon = validCoupons[Math.floor(Math.random() * validCoupons.length)];
      const orderId = `order_${__VU}_${__ITER}_${Date.now()}`;
      
      const payload = JSON.stringify({
        couponCode: validCoupon,
        userId: user.id,
        orderId: orderId,
        discountAmount: Math.floor(Math.random() * 2000) + 500,
        currency: 'USD'
      });

      const response = http.post(`${BASE_URL}/api/convex/useCoupon`, payload, { headers });
      
      const usageSuccess = check(response, {
        'coupon usage status is 200': (r) => r.status === 200,
        'coupon usage response time < 300ms': (r) => r.timings.duration < 300,
        'usage returns success': (r) => {
          if (r.status === 200) {
            const body = JSON.parse(r.body);
            return body.success || body.usageId;
          }
          return false;
        }
      });

      couponUsageRate.add(!usageSuccess);
    }
  });

  // Admin-only operations
  if (user.role === 'admin') {
    group('Admin Coupon Management Performance', () => {
      // Test coupon creation
      group('Coupon Creation', () => {
        const newCoupon = {
          code: generateCouponCode(),
          name: `Performance Test Coupon ${__ITER}`,
          description: `Generated during load test - VU ${__VU}`,
          type: Math.random() > 0.5 ? 'percentage' : 'fixed_amount',
          value: Math.random() > 0.5 ? Math.floor(Math.random() * 30) + 5 : Math.floor(Math.random() * 5000) + 500,
          currency: 'USD',
          usageLimit: Math.floor(Math.random() * 1000) + 100,
          userLimit: Math.floor(Math.random() * 3) + 1,
          validFrom: new Date().toISOString(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true
        };

        const response = http.post(`${BASE_URL}/api/convex/createCoupon`, JSON.stringify(newCoupon), { headers });
        
        const creationSuccess = check(response, {
          'coupon creation status is 200': (r) => r.status === 200,
          'coupon creation response time < 500ms': (r) => r.timings.duration < 500,
          'creation returns coupon ID': (r) => {
            if (r.status === 200) {
              const body = JSON.parse(r.body);
              return body.couponId || body._id;
            }
            return false;
          }
        });

        couponCreationRate.add(!creationSuccess);
      });

      // Test coupon list retrieval
      group('Coupon List Retrieval', () => {
        const params = {
          limit: 20,
          offset: Math.floor(Math.random() * 100),
          sortBy: 'created',
          sortOrder: 'desc'
        };

        const response = http.get(`${BASE_URL}/api/convex/getCoupons?${Object.entries(params).map(([k,v]) => `${k}=${v}`).join('&')}`, { headers });
        
        check(response, {
          'coupon list status is 200': (r) => r.status === 200,
          'coupon list response time < 300ms': (r) => r.timings.duration < 300,
          'coupon list returns array': (r) => {
            if (r.status === 200) {
              const body = JSON.parse(r.body);
              return Array.isArray(body) || Array.isArray(body.coupons);
            }
            return false;
          },
          'coupon list limited correctly': (r) => {
            if (r.status === 200) {
              const body = JSON.parse(r.body);
              const coupons = Array.isArray(body) ? body : body.coupons;
              return coupons && coupons.length <= params.limit;
            }
            return false;
          }
        });
      });

      // Test coupon statistics
      group('Coupon Statistics', () => {
        const response = http.get(`${BASE_URL}/api/convex/getCouponStats`, { headers });
        
        check(response, {
          'stats status is 200': (r) => r.status === 200,
          'stats response time < 200ms': (r) => r.timings.duration < 200,
          'stats returns required fields': (r) => {
            if (r.status === 200) {
              const body = JSON.parse(r.body);
              return body.total !== undefined && body.active !== undefined && body.usageRate !== undefined;
            }
            return false;
          }
        });
      });
    });
  }

  // User coupon history
  group('User Coupon History', () => {
    const response = http.get(`${BASE_URL}/api/convex/getCouponUsageHistory?userId=${user.id}&limit=10`, { headers });
    
    check(response, {
      'history status is 200': (r) => r.status === 200,
      'history response time < 250ms': (r) => r.timings.duration < 250,
      'history returns array': (r) => {
        if (r.status === 200) {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || Array.isArray(body.usages);
        }
        return false;
      }
    });
  });

  // Concurrent validation stress test
  group('Concurrent Validation Stress', () => {
    // Simulate multiple rapid validations (shopping cart updates)
    const requests = [];
    const concurrentCount = Math.floor(Math.random() * 3) + 2; // 2-4 concurrent requests
    
    for (let i = 0; i < concurrentCount; i++) {
      const coupon = validCoupons[Math.floor(Math.random() * validCoupons.length)];
      const payload = JSON.stringify({
        code: coupon,
        userId: user.id,
        orderAmount: Math.floor(Math.random() * 5000) + 1000
      });

      requests.push({
        method: 'POST',
        url: `${BASE_URL}/api/convex/validateCoupon`,
        body: payload,
        params: { headers }
      });
    }

    const responses = http.batch(requests);
    
    check(responses, {
      'all concurrent validations succeed': (responses) => {
        return responses.every(r => r.status === 200);
      },
      'concurrent responses are consistent': (responses) => {
        // All responses for the same coupon should be identical
        const validResponses = responses.filter(r => r.status === 200);
        if (validResponses.length <= 1) return true;
        
        const firstResponse = JSON.parse(validResponses[0].body);
        return validResponses.every(r => {
          const body = JSON.parse(r.body);
          return body.valid === firstResponse.valid;
        });
      }
    });
  });

  // Random sleep to simulate user think time
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
}

// Setup function - runs once per VU
export function setup() {
  console.log('Starting Coupon System Load Test');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test duration: ~11 minutes`);
  console.log(`Max VUs: 500`);
  
  // Warmup request to ensure system is ready
  const response = http.get(`${BASE_URL}/api/health`);
  if (response.status !== 200) {
    console.warn('Health check failed, proceeding anyway...');
  }
  
  return {
    startTime: new Date().toISOString(),
    baseUrl: BASE_URL
  };
}

// Teardown function - runs once after all VUs finish
export function teardown(data) {
  console.log('Coupon System Load Test completed');
  console.log(`Started at: ${data.startTime}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
  
  // Could send results to monitoring system here
}

// Handle summary to customize the end-of-test summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/coupon-load-test-results.json': JSON.stringify(data),
    'reports/coupon-load-test-summary.html': htmlReport(data),
  };
}

// Helper function for text summary (simplified)
function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = `${indent}Coupon System Load Test Results\n`;
  summary += `${indent}=====================================\n\n`;
  
  // Add key metrics
  const httpReqs = data.metrics.http_reqs?.values;
  const httpDuration = data.metrics.http_req_duration?.values;
  const httpFailures = data.metrics.http_req_failed?.values;
  
  if (httpReqs) {
    summary += `${indent}HTTP Requests: ${httpReqs.count} (${httpReqs.rate.toFixed(2)} RPS)\n`;
  }
  
  if (httpDuration) {
    summary += `${indent}Response Time: avg=${httpDuration.avg.toFixed(2)}ms p95=${httpDuration['p(95)'].toFixed(2)}ms\n`;
  }
  
  if (httpFailures) {
    summary += `${indent}Failure Rate: ${(httpFailures.rate * 100).toFixed(2)}%\n`;
  }
  
  // Add coupon-specific metrics
  const validationDuration = data.metrics.coupon_validation_duration?.values;
  const validationFailures = data.metrics.coupon_validation_failures?.values;
  
  if (validationDuration) {
    summary += `${indent}Coupon Validation: avg=${validationDuration.avg.toFixed(2)}ms p95=${validationDuration['p(95)'].toFixed(2)}ms\n`;
  }
  
  if (validationFailures) {
    summary += `${indent}Validation Failures: ${(validationFailures.rate * 100).toFixed(2)}%\n`;
  }
  
  return summary;
}

// Simplified HTML report generator
function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Coupon System Load Test Results</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
    .pass { color: green; }
    .fail { color: red; }
  </style>
</head>
<body>
  <h1>Coupon System Load Test Results</h1>
  <div class="metric">
    <h3>HTTP Requests</h3>
    <p>Total: ${data.metrics.http_reqs?.values.count || 0}</p>
    <p>Rate: ${data.metrics.http_reqs?.values.rate?.toFixed(2) || 0} RPS</p>
  </div>
  <div class="metric">
    <h3>Response Times</h3>
    <p>Average: ${data.metrics.http_req_duration?.values.avg?.toFixed(2) || 0}ms</p>
    <p>95th Percentile: ${data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0}ms</p>
  </div>
  <div class="metric">
    <h3>Failure Rate</h3>
    <p class="${(data.metrics.http_req_failed?.values.rate || 0) < 0.05 ? 'pass' : 'fail'}">
      ${((data.metrics.http_req_failed?.values.rate || 0) * 100).toFixed(2)}%
    </p>
  </div>
</body>
</html>`;
}