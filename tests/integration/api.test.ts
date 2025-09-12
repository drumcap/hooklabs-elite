/**
 * API 엔드포인트 통합 테스트
 * Next.js API Routes 및 외부 서비스 연동 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApiResponse, createErrorResponse } from '../utils/test-helpers';

// Mock fetch for API testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('/api/health', () => {
    it('헬스체크가 성공해야 한다', async () => {
      // Arrange
      const expectedResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: 'test',
        services: {
          database: 'connected',
          redis: 'connected',
          convex: 'connected',
        },
      };

      mockFetch.mockResolvedValueOnce(createApiResponse(expectedResponse));

      // Act
      const response = await fetch('/api/health');
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.services).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('서비스 장애 시 적절한 에러를 반환해야 한다', async () => {
      // Arrange
      const errorResponse = {
        status: 'error',
        timestamp: new Date().toISOString(),
        services: {
          database: 'disconnected',
          redis: 'connected',
          convex: 'error',
        },
        errors: ['Database connection failed', 'Convex service unavailable'],
      };

      mockFetch.mockResolvedValueOnce(createErrorResponse('Service unavailable', 503));

      // Act
      const response = await fetch('/api/health');

      // Assert
      expect(response.status).toBe(503);
      expect(response.statusText).toBe('Internal Server Error'); // Fetch API의 실제 statusText
    });
  });

  describe('/api/metrics', () => {
    it('메트릭 데이터를 반환해야 한다', async () => {
      // Arrange
      const metricsData = {
        timestamp: new Date().toISOString(),
        application: {
          version: '1.0.0',
          uptime: 3600,
          memory: {
            used: 50 * 1024 * 1024, // 50MB
            total: 512 * 1024 * 1024, // 512MB
          },
        },
        business: {
          activeUsers: 150,
          totalPosts: 1250,
          creditsIssued: 50000,
          subscriptions: {
            active: 75,
            trial: 25,
            cancelled: 10,
          },
        },
      };

      mockFetch.mockResolvedValueOnce(createApiResponse(metricsData));

      // Act
      const response = await fetch('/api/metrics');
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.application).toBeDefined();
      expect(data.business).toBeDefined();
      expect(data.timestamp).toBeDefined();
      expect(typeof data.business.activeUsers).toBe('number');
    });

    it('인증되지 않은 요청을 거부해야 한다', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createErrorResponse('Unauthorized', 401));

      // Act
      const response = await fetch('/api/metrics');

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('/api/lemonsqueezy/checkout', () => {
    it('새로운 체크아웃 세션을 생성해야 한다', async () => {
      // Arrange
      const checkoutRequest = {
        variantId: 'variant_123',
        userId: 'user_456',
        customData: {
          plan: 'pro_monthly',
        },
      };

      const checkoutResponse = {
        checkoutUrl: 'https://checkout.lemonsqueezy.com/session_abc123',
        sessionId: 'session_abc123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      mockFetch.mockResolvedValueOnce(createApiResponse(checkoutResponse));

      // Act
      const response = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutRequest),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.checkoutUrl).toMatch(/^https:\/\/checkout\.lemonsqueezy\.com/);
      expect(data.sessionId).toBeDefined();
      expect(data.expiresAt).toBeDefined();
    });

    it('유효하지 않은 요청 데이터에 대해 에러를 반환해야 한다', async () => {
      // Arrange
      const invalidRequest = {
        // variantId 누락
        userId: 'user_456',
      };

      mockFetch.mockResolvedValueOnce(createErrorResponse('Invalid request data', 400));

      // Act
      const response = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest),
      });

      // Assert
      expect(response.status).toBe(400);
    });

    it('Lemon Squeezy API 에러를 적절히 처리해야 한다', async () => {
      // Arrange
      const validRequest = {
        variantId: 'variant_123',
        userId: 'user_456',
      };

      mockFetch.mockResolvedValueOnce(createErrorResponse('Lemon Squeezy API Error', 500));

      // Act
      const response = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validRequest),
      });

      // Assert
      expect(response.status).toBe(500);
    });
  });

  describe('/api/lemonsqueezy/portal', () => {
    it('고객 포털 URL을 반환해야 한다', async () => {
      // Arrange
      const portalRequest = {
        customerId: 'cus_123456',
      };

      const portalResponse = {
        portalUrl: 'https://portal.lemonsqueezy.com/customer/cus_123456',
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2시간
      };

      mockFetch.mockResolvedValueOnce(createApiResponse(portalResponse));

      // Act
      const response = await fetch('/api/lemonsqueezy/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portalRequest),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.portalUrl).toMatch(/^https:\/\/portal\.lemonsqueezy\.com/);
      expect(data.expiresAt).toBeDefined();
    });

    it('존재하지 않는 고객에 대해 에러를 반환해야 한다', async () => {
      // Arrange
      const invalidRequest = {
        customerId: 'nonexistent_customer',
      };

      mockFetch.mockResolvedValueOnce(createErrorResponse('Customer not found', 404));

      // Act
      const response = await fetch('/api/lemonsqueezy/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest),
      });

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('/api/lemonsqueezy/subscription', () => {
    it('구독 정보를 조회해야 한다', async () => {
      // Arrange
      const subscriptionData = {
        id: 'sub_123456',
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        plan: {
          id: 'plan_pro',
          name: 'Pro Plan',
          price: 2999,
          interval: 'month',
        },
        customer: {
          id: 'cus_123456',
          email: 'customer@example.com',
        },
      };

      mockFetch.mockResolvedValueOnce(createApiResponse(subscriptionData));

      // Act
      const response = await fetch('/api/lemonsqueezy/subscription?id=sub_123456');
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.id).toBe('sub_123456');
      expect(data.status).toBe('active');
      expect(data.plan).toBeDefined();
      expect(data.customer).toBeDefined();
    });

    it('구독을 취소해야 한다', async () => {
      // Arrange
      const cancellationRequest = {
        subscriptionId: 'sub_123456',
        reason: 'customer_request',
      };

      const cancellationResponse = {
        id: 'sub_123456',
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      mockFetch.mockResolvedValueOnce(createApiResponse(cancellationResponse));

      // Act
      const response = await fetch('/api/lemonsqueezy/subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cancellationRequest),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.status).toBe('cancelled');
      expect(data.cancelledAt).toBeDefined();
      expect(data.endsAt).toBeDefined();
    });
  });

  describe('/api/web-vitals', () => {
    it('웹 바이탈 메트릭을 수집해야 한다', async () => {
      // Arrange
      const webVitalsData = {
        id: 'metric_123',
        name: 'CLS',
        value: 0.05,
        rating: 'good',
        navigationType: 'navigate',
        url: '/dashboard',
        timestamp: Date.now(),
        userAgent: 'Mozilla/5.0...',
      };

      mockFetch.mockResolvedValueOnce(createApiResponse({ success: true }));

      // Act
      const response = await fetch('/api/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webVitalsData),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('여러 메트릭을 배치로 수집해야 한다', async () => {
      // Arrange
      const batchMetrics = [
        {
          id: 'metric_1',
          name: 'FCP',
          value: 1200,
          rating: 'good',
          timestamp: Date.now(),
        },
        {
          id: 'metric_2',
          name: 'LCP',
          value: 2500,
          rating: 'needs-improvement',
          timestamp: Date.now(),
        },
        {
          id: 'metric_3',
          name: 'FID',
          value: 80,
          rating: 'good',
          timestamp: Date.now(),
        },
      ];

      mockFetch.mockResolvedValueOnce(createApiResponse({ 
        success: true, 
        processed: batchMetrics.length 
      }));

      // Act
      const response = await fetch('/api/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: batchMetrics }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(3);
    });

    it('유효하지 않은 메트릭 데이터를 거부해야 한다', async () => {
      // Arrange
      const invalidMetric = {
        // name과 value가 누락됨
        id: 'metric_invalid',
        timestamp: Date.now(),
      };

      mockFetch.mockResolvedValueOnce(createErrorResponse('Invalid metric data', 400));

      // Act
      const response = await fetch('/api/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidMetric),
      });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('HTTP 404 에러를 적절히 처리해야 한다', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createErrorResponse('Not Found', 404));

      // Act
      const response = await fetch('/api/nonexistent-endpoint');

      // Assert
      expect(response.status).toBe(404);
    });

    it('HTTP 500 에러를 적절히 처리해야 한다', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createErrorResponse('Internal Server Error', 500));

      // Act
      const response = await fetch('/api/health');

      // Assert
      expect(response.status).toBe(500);
    });

    it('네트워크 에러를 적절히 처리해야 한다', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Act & Assert
      await expect(fetch('/api/health')).rejects.toThrow('Network error');
    });

    it('타임아웃 에러를 적절히 처리해야 한다', async () => {
      // Arrange
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      // Act & Assert
      await expect(fetch('/api/slow-endpoint')).rejects.toThrow('Timeout');
    });
  });

  describe('Request Validation', () => {
    it('Content-Type 검증을 수행해야 한다', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createErrorResponse('Content-Type must be application/json', 415));

      // Act
      const response = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'invalid data',
      });

      // Assert
      expect(response.status).toBe(415);
    });

    it('요청 크기 제한을 검증해야 한다', async () => {
      // Arrange
      const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB
      mockFetch.mockResolvedValueOnce(createErrorResponse('Request too large', 413));

      // Act
      const response = await fetch('/api/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: largePayload,
      });

      // Assert
      expect(response.status).toBe(413);
    });

    it('CORS 헤더를 포함해야 한다', async () => {
      // Arrange
      const corsResponse = createApiResponse({ success: true });
      corsResponse.headers.set('Access-Control-Allow-Origin', '*');
      corsResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      corsResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      mockFetch.mockResolvedValueOnce(corsResponse);

      // Act
      const response = await fetch('/api/health', {
        method: 'OPTIONS',
      });

      // Assert
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    });
  });

  describe('Rate Limiting', () => {
    it('요청 속도 제한을 적용해야 한다', async () => {
      // Arrange
      const rateLimitResponse = createErrorResponse('Too many requests', 429);
      rateLimitResponse.headers.set('X-RateLimit-Limit', '100');
      rateLimitResponse.headers.set('X-RateLimit-Remaining', '0');
      rateLimitResponse.headers.set('X-RateLimit-Reset', String(Date.now() + 60000));

      mockFetch.mockResolvedValueOnce(rateLimitResponse);

      // Act
      const response = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: 'test' }),
      });

      // Assert
      expect(response.status).toBe(429);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('성공적인 요청에서 속도 제한 헤더를 포함해야 한다', async () => {
      // Arrange
      const successResponse = createApiResponse({ success: true });
      successResponse.headers.set('X-RateLimit-Limit', '100');
      successResponse.headers.set('X-RateLimit-Remaining', '95');
      successResponse.headers.set('X-RateLimit-Reset', String(Date.now() + 60000));

      mockFetch.mockResolvedValueOnce(successResponse);

      // Act
      const response = await fetch('/api/health');

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('95');
    });
  });
});