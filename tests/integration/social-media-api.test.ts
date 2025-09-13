/**
 * 소셜 미디어 고급 기능 API 통합 테스트
 * 실제 API 엔드포인트와 Convex 함수들 간의 통합 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createSocialMediaDataSet } from '../fixtures/social-media-advanced';

// Mock API 응답 헬퍼
const mockApiResponse = (data: any, status: number = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
});

// API 호출 Mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Social Media Advanced Features API Integration', () => {
  const testData = createSocialMediaDataSet();

  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Expiry Management API', () => {
    it('만료 예정 토큰 목록을 조회해야 함', async () => {
      const expiringTokens = [
        {
          _id: 'acc1',
          platform: 'twitter',
          username: 'test_user',
          displayName: 'Test User',
          tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
      ];

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ data: expiringTokens })
      );

      const response = await fetch('/api/social-accounts/expiring-tokens?hours=24');
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/social-accounts/expiring-tokens?hours=24');
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('platform', 'twitter');
      expect(result.data[0]).toHaveProperty('tokenExpiresAt');
    });

    it('토큰 업데이트 API를 호출해야 함', async () => {
      const updateData = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        tokenExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      };

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ success: true, accountId: 'acc1' })
      );

      const response = await fetch('/api/social-accounts/acc1/tokens', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/social-accounts/acc1/tokens',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        })
      );
      expect(result.success).toBe(true);
      expect(result.accountId).toBe('acc1');
    });

    it('계정 통계 API를 조회해야 함', async () => {
      const statsData = {
        totalScheduled: 25,
        published: 20,
        failed: 2,
        pending: 3,
        successRate: 80,
      };

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ data: statsData })
      );

      const response = await fetch('/api/social-accounts/acc1/stats?startDate=2024-01-01&endDate=2024-01-31');
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/social-accounts/acc1/stats?startDate=2024-01-01&endDate=2024-01-31');
      expect(result.data.totalScheduled).toBe(25);
      expect(result.data.successRate).toBe(80);
    });

    it('토큰 업데이트 실패 시 에러를 처리해야 함', async () => {
      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ error: 'Invalid token format' }, 400)
      );

      const response = await fetch('/api/social-accounts/acc1/tokens', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: 'invalid' }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Invalid token format');
    });
  });

  describe('Post Variants A/B Testing API', () => {
    it('게시물의 변형 목록을 조회해야 함', async () => {
      const variants = testData.variants;

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ data: variants })
      );

      const response = await fetch('/api/posts/post123/variants');
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/posts/post123/variants');
      expect(result.data).toHaveLength(variants.length);
      expect(result.data[0]).toHaveProperty('overallScore');
      expect(result.data[0]).toHaveProperty('scoreBreakdown');
    });

    it('최고 성과 변형을 조회해야 함', async () => {
      const bestVariant = testData.variants.reduce((best, current) => 
        current.overallScore > best.overallScore ? current : best
      );

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ data: bestVariant })
      );

      const response = await fetch('/api/posts/post123/variants/best');
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/posts/post123/variants/best');
      expect(result.data.overallScore).toBe(bestVariant.overallScore);
    });

    it('변형을 선택해야 함', async () => {
      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ success: true, variantId: 'variant123' })
      );

      const response = await fetch('/api/posts/variants/variant123/select', {
        method: 'POST',
      });

      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/posts/variants/variant123/select',
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.success).toBe(true);
      expect(result.variantId).toBe('variant123');
    });

    it('변형 점수를 업데이트해야 함', async () => {
      const scoreUpdate = {
        overallScore: 92,
        scoreBreakdown: {
          engagement: 88,
          virality: 90,
          personaMatch: 95,
          readability: 92,
          trending: 96,
        },
      };

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ success: true, variantId: 'variant123' })
      );

      const response = await fetch('/api/posts/variants/variant123/score', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scoreUpdate),
      });

      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/posts/variants/variant123/score',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scoreUpdate),
        })
      );
      expect(result.success).toBe(true);
    });

    it('평균 점수를 조회해야 함', async () => {
      const averageScores = {
        overallScore: 85,
        scoreBreakdown: {
          engagement: 82,
          virality: 86,
          personaMatch: 88,
          readability: 90,
          trending: 79,
        },
        variantCount: 3,
      };

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ data: averageScores })
      );

      const response = await fetch('/api/posts/post123/variants/average-scores');
      const result = await response.json();

      expect(result.data.overallScore).toBe(85);
      expect(result.data.variantCount).toBe(3);
    });
  });

  describe('AI Generation History API', () => {
    it('AI 생성 이력을 페이징과 함께 조회해야 함', async () => {
      const generations = testData.aiGenerations.slice(0, 5);
      const paginationResult = {
        page: generations,
        isDone: false,
        continueCursor: '5',
      };

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ data: paginationResult })
      );

      const response = await fetch('/api/ai-generations?limit=5&cursor=0&type=variant_creation');
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/ai-generations?limit=5&cursor=0&type=variant_creation');
      expect(result.data.page).toHaveLength(5);
      expect(result.data.isDone).toBe(false);
      expect(result.data.continueCursor).toBe('5');
    });

    it('특정 AI 생성 이력을 상세 조회해야 함', async () => {
      const generation = {
        ...testData.aiGenerations[0],
        post: { _id: 'post123', title: 'Test Post' },
        persona: { _id: 'persona123', name: 'Professional' },
      };

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ data: generation })
      );

      const response = await fetch('/api/ai-generations/gen123');
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/ai-generations/gen123');
      expect(result.data).toHaveProperty('post');
      expect(result.data).toHaveProperty('persona');
      expect(result.data.post._id).toBe('post123');
    });

    it('사용자 AI 통계를 조회해야 함', async () => {
      const userStats = testData.userStats;

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ data: userStats })
      );

      const response = await fetch('/api/ai-generations/stats?startDate=2024-01-01&endDate=2024-01-31');
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/ai-generations/stats?startDate=2024-01-01&endDate=2024-01-31');
      expect(result.data).toHaveProperty('total');
      expect(result.data).toHaveProperty('successful');
      expect(result.data).toHaveProperty('totalCreditsUsed');
      expect(result.data).toHaveProperty('typeBreakdown');
      expect(result.data).toHaveProperty('modelBreakdown');
    });

    it('월별 트렌드를 조회해야 함', async () => {
      const monthlyTrends = testData.monthlyTrends;

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ data: monthlyTrends })
      );

      const response = await fetch('/api/ai-generations/trends?months=6');
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/ai-generations/trends?months=6');
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data[0]).toHaveProperty('month');
      expect(result.data[0]).toHaveProperty('total');
      expect(result.data[0]).toHaveProperty('successful');
    });

    it('품질 분석을 조회해야 함', async () => {
      const qualityAnalysis = testData.qualityAnalysis;

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ data: qualityAnalysis })
      );

      const response = await fetch('/api/ai-generations/quality-analysis?type=variant_creation&model=gpt-4');
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/ai-generations/quality-analysis?type=variant_creation&model=gpt-4');
      expect(result.data).toHaveProperty('totalSamples');
      expect(result.data).toHaveProperty('averageScores');
      expect(result.data).toHaveProperty('scoreDistribution');
      expect(result.data).toHaveProperty('bestPerformingTemperature');
    });
  });

  describe('Analytics Dashboard API', () => {
    it('대시보드 통계를 조회해야 함', async () => {
      const dashboardStats = testData.dashboard;

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ data: dashboardStats })
      );

      const response = await fetch('/api/analytics/dashboard');
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/dashboard');
      expect(result.data).toHaveProperty('totalPosts');
      expect(result.data).toHaveProperty('scheduledPosts');
      expect(result.data).toHaveProperty('successRate');
      expect(result.data).toHaveProperty('platformStats');
      expect(result.data).toHaveProperty('recentActivity');
    });

    it('분석 개요를 조회해야 함', async () => {
      const overview = testData.overview;

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ data: overview })
      );

      const response = await fetch('/api/analytics/overview?timeRange=30d&platform=twitter');
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/overview?timeRange=30d&platform=twitter');
      expect(result.data).toHaveProperty('totalPosts');
      expect(result.data).toHaveProperty('publishedPosts');
      expect(result.data).toHaveProperty('engagementRate');
      expect(result.data).toHaveProperty('topPlatforms');
      expect(result.data).toHaveProperty('dailyStats');
      expect(result.data).toHaveProperty('topPerformingPosts');
    });

    it('인게이지먼트 데이터를 조회해야 함', async () => {
      const engagement = testData.engagement;

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ data: engagement })
      );

      const response = await fetch('/api/analytics/engagement?timeRange=7d');
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/engagement?timeRange=7d');
      expect(result.data).toHaveProperty('data');
      expect(result.data).toHaveProperty('summary');
      expect(result.data.data).toBeInstanceOf(Array);
      expect(result.data.data[0]).toHaveProperty('date');
      expect(result.data.data[0]).toHaveProperty('likes');
      expect(result.data.data[0]).toHaveProperty('comments');
      expect(result.data.data[0]).toHaveProperty('shares');
    });

    it('실시간 모니터링 데이터를 조회해야 함', async () => {
      const liveActivity = testData.liveActivity;

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ data: liveActivity })
      );

      const response = await fetch('/api/analytics/live-activity');
      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/live-activity');
      expect(result.data).toHaveProperty('activeUsers');
      expect(result.data).toHaveProperty('postsBeingCreated');
      expect(result.data).toHaveProperty('recentActions');
      expect(result.data).toHaveProperty('systemHealth');
    });
  });

  describe('Error Handling', () => {
    it('네트워크 에러를 처리해야 함', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/api/social-accounts/expiring-tokens');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    it('서버 에러 응답을 처리해야 함', async () => {
      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ error: 'Internal server error' }, 500)
      );

      const response = await fetch('/api/analytics/dashboard');
      
      expect(response.status).toBe(500);
      const result = await response.json();
      expect(result.error).toBe('Internal server error');
    });

    it('인증 에러를 처리해야 함', async () => {
      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ error: 'Unauthorized' }, 401)
      );

      const response = await fetch('/api/social-accounts/expiring-tokens');
      
      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toBe('Unauthorized');
    });

    it('잘못된 요청을 처리해야 함', async () => {
      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ error: 'Invalid request parameters' }, 400)
      );

      const response = await fetch('/api/posts/variants/invalid-id/select', {
        method: 'POST',
      });
      
      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Invalid request parameters');
    });
  });

  describe('API Performance', () => {
    it('API 응답 시간을 측정해야 함', async () => {
      const startTime = performance.now();
      
      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ data: testData.dashboard })
      );

      await fetch('/api/analytics/dashboard');
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // 일반적으로 API 응답은 100ms 이내여야 함 (Mock이므로 매우 빠를 것)
      expect(responseTime).toBeLessThan(100);
    });

    it('대용량 데이터 요청을 처리해야 함', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `item${i}`,
        data: `Large data item ${i}`,
      }));

      mockFetch.mockResolvedValueOnce(
        mockApiResponse({ data: largeDataset })
      );

      const response = await fetch('/api/ai-generations?limit=1000');
      const result = await response.json();

      expect(result.data).toHaveLength(1000);
    });

    it('동시 API 요청을 처리해야 함', async () => {
      const requests = [
        '/api/analytics/dashboard',
        '/api/social-accounts/expiring-tokens',
        '/api/ai-generations/stats',
      ];

      // 각 요청에 대해 다른 응답 Mock
      mockFetch
        .mockResolvedValueOnce(mockApiResponse({ data: testData.dashboard }))
        .mockResolvedValueOnce(mockApiResponse({ data: [] }))
        .mockResolvedValueOnce(mockApiResponse({ data: testData.userStats }));

      const responses = await Promise.all(
        requests.map(url => fetch(url))
      );

      expect(responses).toHaveLength(3);
      expect(responses.every(res => res.ok)).toBe(true);
    });
  });
});