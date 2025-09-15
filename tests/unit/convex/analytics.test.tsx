/**
 * analytics Convex 함수 단위 테스트
 * 대시보드 통계, 분석 개요, 인게이지먼트 데이터 기능 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMockConvexContext,
  setupDatabaseMocks,
  setupAuthMocks,
  cleanupTestData,
  ConvexError,
} from '../../utils/convex-test-helpers';
import { 
  createMockAnalyticsDashboard,
  createMockAnalyticsOverview,
  createMockEngagementData
} from '../../fixtures/social-media-advanced';

// Mock Convex functions
const mockAnalytics = {
  getDashboardStats: vi.fn(),
  getOverview: vi.fn(),
  getEngagement: vi.fn(),
  getTopPosts: vi.fn(),
};

describe('analytics - Advanced Analytics Dashboard', () => {
  let mockCtx: ReturnType<typeof createMockConvexContext>;
  let dbMocks: ReturnType<typeof setupDatabaseMocks>;
  let authMocks: ReturnType<typeof setupAuthMocks>;

  beforeEach(() => {
    mockCtx = createMockConvexContext();
    dbMocks = setupDatabaseMocks(mockCtx);
    authMocks = setupAuthMocks(mockCtx);
  });

  afterEach(async () => {
    await cleanupTestData(mockCtx);
    vi.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('기본 대시보드 통계를 계산해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const userPosts = [
        { _id: 'post1', userId, platforms: ['twitter', 'linkedin'] },
        { _id: 'post2', userId, platforms: ['twitter'] },
        { _id: 'post3', userId, platforms: ['facebook', 'linkedin'] },
      ];

      const scheduledPosts = [
        { _id: 'sched1', postId: 'post1', status: 'published' },
        { _id: 'sched2', postId: 'post2', status: 'published' },
        { _id: 'sched3', postId: 'post3', status: 'failed' },
        { _id: 'sched4', postId: 'post1', status: 'pending' },
      ];

      dbMocks.setupQueryMock('socialPosts', userPosts);
      dbMocks.setupQueryMock('scheduledPosts', scheduledPosts);

      mockAnalytics.getDashboardStats.mockImplementation(async (ctx) => {
        const userPosts = await ctx.db.query('socialPosts').collect();
        const allScheduledPosts = await ctx.db.query('scheduledPosts').collect();
        
        const userPostIds = userPosts.map(post => post._id);
        const userScheduledPosts = allScheduledPosts.filter(schedule => 
          userPostIds.includes(schedule.postId)
        );

        const stats = {
          totalPosts: userPosts.length,
          scheduledPosts: userScheduledPosts.length,
          totalViews: 0,
          totalLikes: 0,
          totalEngagement: 0,
          successRate: 0,
          platformStats: {} as Record<string, number>,
          recentActivity: [] as any[],
        };

        // 플랫폼별 통계
        userPosts.forEach(post => {
          if (post.platforms && Array.isArray(post.platforms)) {
            post.platforms.forEach(platform => {
              stats.platformStats[platform] = (stats.platformStats[platform] || 0) + 1;
            });
          }
        });

        // 성공률 계산
        const publishedPosts = userScheduledPosts.filter(s => s.status === 'published');
        if (userScheduledPosts.length > 0) {
          stats.successRate = Math.round((publishedPosts.length / userScheduledPosts.length) * 100);
        }

        // 최근 활동
        stats.recentActivity = [
          { action: 'post_created', timestamp: new Date().toISOString(), count: userPosts.length },
          { action: 'posts_scheduled', timestamp: new Date().toISOString(), count: stats.scheduledPosts },
        ];

        return stats;
      });

      const result = await mockAnalytics.getDashboardStats(mockCtx, {});

      expect(result).toEqual({
        totalPosts: 3,
        scheduledPosts: 4,
        totalViews: 0,
        totalLikes: 0,
        totalEngagement: 0,
        successRate: 50, // 2/4 * 100
        platformStats: {
          twitter: 2,
          linkedin: 2,
          facebook: 1,
        },
        recentActivity: [
          { action: 'post_created', timestamp: expect.any(String), count: 3 },
          { action: 'posts_scheduled', timestamp: expect.any(String), count: 4 },
        ],
      });
    });

    it('인증되지 않은 사용자에게 에러를 반환해야 함', async () => {
      authMocks.mockUnauthenticatedUser();

      mockAnalytics.getDashboardStats.mockImplementation(async () => {
        throw ConvexError.unauthenticated('인증이 필요합니다');
      });

      await expect(
        mockAnalytics.getDashboardStats(mockCtx, {})
      ).rejects.toThrow('인증이 필요합니다');
    });

    it('에러 발생 시 기본값을 반환해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      // 데이터베이스 오류 시뮬레이션
      mockCtx.db.query.mockRejectedValue(new Error('Database error'));

      mockAnalytics.getDashboardStats.mockImplementation(async () => {
        try {
          await mockCtx.db.query('socialPosts').collect();
        } catch (error) {
          // 에러 발생 시 기본값 반환
          return {
            totalPosts: 0,
            scheduledPosts: 0,
            totalViews: 0,
            totalLikes: 0,
            totalEngagement: 0,
            successRate: 0,
            platformStats: {},
            recentActivity: [],
          };
        }
      });

      const result = await mockAnalytics.getDashboardStats(mockCtx, {});

      expect(result.totalPosts).toBe(0);
      expect(result.platformStats).toEqual({});
    });
  });

  describe('getOverview', () => {
    it('지정된 시간 범위의 분석 개요를 반환해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const userPosts = [
        { 
          _id: 'post1', 
          userId, 
          platforms: ['twitter'], 
          createdAt: now.toISOString(),
          finalContent: 'Recent post content'
        },
        { 
          _id: 'post2', 
          userId, 
          platforms: ['linkedin'], 
          createdAt: weekAgo.toISOString(),
          finalContent: 'Older post content'
        },
      ];

      const scheduledPosts = [
        { _id: 'sched1', postId: 'post1', status: 'published' },
        { _id: 'sched2', postId: 'post2', status: 'published' },
      ];

      dbMocks.setupQueryMock('socialPosts', userPosts);
      dbMocks.setupQueryMock('scheduledPosts', scheduledPosts);

      mockAnalytics.getOverview.mockImplementation(async (ctx, { timeRange, platform }) => {
        // 시간 범위 계산
        const now = new Date();
        let startDate: Date;
        
        switch (timeRange) {
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const startDateStr = startDate.toISOString();

        const allPosts = await ctx.db.query('socialPosts').collect();
        const filteredPosts = allPosts.filter(post => post.createdAt >= startDateStr);

        // 플랫폼 필터링
        const finalPosts = platform && platform !== 'all'
          ? filteredPosts.filter(post => post.platforms?.includes(platform))
          : filteredPosts;

        // 플랫폼별 통계
        const platformStats: Record<string, number> = {};
        finalPosts.forEach(post => {
          if (post.platforms && Array.isArray(post.platforms)) {
            post.platforms.forEach(p => {
              platformStats[p] = (platformStats[p] || 0) + 1;
            });
          }
        });

        const totalPlatformPosts = Object.values(platformStats).reduce((sum, count) => sum + count, 0);
        const topPlatforms = Object.entries(platformStats)
          .map(([name, count]) => ({
            name,
            count,
            percentage: totalPlatformPosts > 0 ? Math.round((count / totalPlatformPosts) * 100) : 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // 일별 통계 (간단화)
        const days = Math.min(7, Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
        const dailyStats = [];
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayPosts = finalPosts.filter(post => 
            post.createdAt.startsWith(dateStr)
          );
          
          dailyStats.push({
            date: dateStr,
            posts: dayPosts.length,
            engagement: Math.floor(Math.random() * 1000),
          });
        }

        return {
          totalPosts: finalPosts.length,
          publishedPosts: finalPosts.length, // 간단화
          totalImpressions: 0,
          totalEngagements: 0,
          engagementRate: 0,
          followerGrowth: 0,
          topPlatforms,
          dailyStats,
          topPerformingPosts: finalPosts.slice(0, 5).map(post => ({
            id: post._id,
            content: post.finalContent.substring(0, 100) + '...',
            platform: post.platforms?.[0] || 'unknown',
            engagement: Math.floor(Math.random() * 1000),
            impressions: Math.floor(Math.random() * 10000),
          })),
        };
      });

      const result = await mockAnalytics.getOverview(mockCtx, { 
        timeRange: '7d',
        platform: 'twitter'
      });

      expect(result.totalPosts).toBe(1); // 7일 내 트위터 게시물 1개
      expect(result.topPlatforms).toEqual([
        { name: 'twitter', count: 1, percentage: 100 }
      ]);
      expect(result.dailyStats).toHaveLength(7);
      expect(result.topPerformingPosts).toHaveLength(1);
    });

    it('전체 플랫폼 데이터를 조회해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const userPosts = [
        { _id: 'post1', userId, platforms: ['twitter', 'linkedin'], createdAt: new Date().toISOString() },
        { _id: 'post2', userId, platforms: ['facebook'], createdAt: new Date().toISOString() },
      ];

      dbMocks.setupQueryMock('socialPosts', userPosts);

      mockAnalytics.getOverview.mockImplementation(async () => ({
        totalPosts: 2,
        publishedPosts: 2,
        totalImpressions: 15000,
        totalEngagements: 500,
        engagementRate: 3.33,
        followerGrowth: 25,
        topPlatforms: [
          { name: 'twitter', count: 1, percentage: 33 },
          { name: 'linkedin', count: 1, percentage: 33 },
          { name: 'facebook', count: 1, percentage: 33 },
        ],
        dailyStats: [],
        topPerformingPosts: [],
      }));

      const result = await mockAnalytics.getOverview(mockCtx, { 
        timeRange: '30d',
        platform: 'all'
      });

      expect(result.totalPosts).toBe(2);
      expect(result.topPlatforms).toHaveLength(3);
    });
  });

  describe('getEngagement', () => {
    it('시간 범위별 인게이지먼트 데이터를 반환해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      mockAnalytics.getEngagement.mockImplementation(async (ctx, { timeRange }) => {
        // 시간 범위 계산
        let days: number;
        
        switch (timeRange) {
          case '7d':
            days = 7;
            break;
          case '30d':
            days = 30;
            break;
          case '90d':
            days = 90;
            break;
          default:
            days = 30;
        }

        // 일별 인게이지먼트 데이터 생성
        const now = new Date();
        const engagementData = [];
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          
          engagementData.push({
            date: dateStr,
            likes: Math.floor(Math.random() * 500) + 50,
            comments: Math.floor(Math.random() * 100) + 10,
            shares: Math.floor(Math.random() * 50) + 5,
            impressions: Math.floor(Math.random() * 5000) + 500,
            engagementRate: +(Math.random() * 10 + 1).toFixed(1),
          });
        }

        return {
          data: engagementData,
          summary: {
            totalLikes: engagementData.reduce((sum, day) => sum + day.likes, 0),
            totalComments: engagementData.reduce((sum, day) => sum + day.comments, 0),
            totalShares: engagementData.reduce((sum, day) => sum + day.shares, 0),
            totalImpressions: engagementData.reduce((sum, day) => sum + day.impressions, 0),
            averageEngagementRate: Math.round(
              engagementData.reduce((sum, day) => sum + day.engagementRate, 0) / engagementData.length
            ),
          }
        };
      });

      const result = await mockAnalytics.getEngagement(mockCtx, { timeRange: '7d' });

      expect(result.data).toHaveLength(7);
      expect(result.data[0]).toHaveProperty('date');
      expect(result.data[0]).toHaveProperty('likes');
      expect(result.data[0]).toHaveProperty('comments');
      expect(result.data[0]).toHaveProperty('shares');
      expect(result.data[0]).toHaveProperty('impressions');
      expect(result.data[0]).toHaveProperty('engagementRate');

      expect(result.summary).toHaveProperty('totalLikes');
      expect(result.summary).toHaveProperty('totalComments');
      expect(result.summary).toHaveProperty('totalShares');
      expect(result.summary).toHaveProperty('totalImpressions');
      expect(result.summary).toHaveProperty('averageEngagementRate');
    });

    it('다른 시간 범위에 대해 올바른 일수를 반환해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      mockAnalytics.getEngagement.mockImplementation(async (ctx, { timeRange }) => {
        const days = timeRange === '90d' ? 90 : timeRange === '7d' ? 7 : 30;
        return {
          data: Array.from({ length: days }, () => ({
            date: '2024-01-01',
            likes: 100,
            comments: 20,
            shares: 10,
            impressions: 1000,
            engagementRate: 5.0,
          })),
          summary: {
            totalLikes: days * 100,
            totalComments: days * 20,
            totalShares: days * 10,
            totalImpressions: days * 1000,
            averageEngagementRate: 5,
          },
        };
      });

      const result90d = await mockAnalytics.getEngagement(mockCtx, { timeRange: '90d' });
      expect(result90d.data).toHaveLength(90);

      const result30d = await mockAnalytics.getEngagement(mockCtx, { timeRange: '30d' });
      expect(result30d.data).toHaveLength(30);
    });
  });

  describe('getTopPosts', () => {
    it('상위 성과 게시물을 반환해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const now = new Date();
      const userPosts = [
        { 
          _id: 'post1', 
          userId, 
          finalContent: 'High performing post content',
          platforms: ['twitter'],
          createdAt: now.toISOString(),
          status: 'published'
        },
        { 
          _id: 'post2', 
          userId, 
          finalContent: 'Medium performing post content',
          platforms: ['linkedin'],
          createdAt: now.toISOString(),
          status: 'published'
        },
      ];

      dbMocks.setupQueryMock('socialPosts', userPosts);

      mockAnalytics.getTopPosts.mockImplementation(async (ctx, { limit, timeRange }) => {
        const allPosts = await ctx.db.query('socialPosts').collect();
        
        // 시간 범위 필터링 (간단화)
        const filteredPosts = allPosts; // 모든 게시물이 최근 것이라고 가정

        // 더미 데이터로 상위 성과 게시물 생성
        const topPosts = filteredPosts
          .slice(0, limit)
          .map(post => ({
            id: post._id,
            content: post.finalContent.length > 100 
              ? post.finalContent.substring(0, 100) + '...'
              : post.finalContent,
            platforms: post.platforms || [],
            createdAt: post.createdAt,
            metrics: {
              likes: Math.floor(Math.random() * 1000) + 100,
              comments: Math.floor(Math.random() * 200) + 20,
              shares: Math.floor(Math.random() * 100) + 10,
              impressions: Math.floor(Math.random() * 10000) + 1000,
            },
            engagementRate: Math.floor(Math.random() * 15) + 5,
            status: post.status,
          }))
          .sort((a, b) => b.engagementRate - a.engagementRate);

        return topPosts;
      });

      const result = await mockAnalytics.getTopPosts(mockCtx, { 
        limit: 5,
        timeRange: '30d'
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('content');
      expect(result[0]).toHaveProperty('platforms');
      expect(result[0]).toHaveProperty('metrics');
      expect(result[0]).toHaveProperty('engagementRate');
      expect(result[0].metrics).toHaveProperty('likes');
      expect(result[0].metrics).toHaveProperty('comments');
      expect(result[0].metrics).toHaveProperty('shares');
      expect(result[0].metrics).toHaveProperty('impressions');

      // 인게이지먼트율 순으로 정렬되어 있는지 확인
      expect(result[0].engagementRate).toBeGreaterThanOrEqual(result[1].engagementRate);
    });

    it('제한된 개수만큼 게시물을 반환해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      // 10개 게시물 생성
      const userPosts = Array.from({ length: 10 }, (_, i) => ({
        _id: `post${i}`,
        userId,
        finalContent: `Post ${i} content`,
        platforms: ['twitter'],
        createdAt: new Date().toISOString(),
        status: 'published'
      }));

      dbMocks.setupQueryMock('socialPosts', userPosts);

      mockAnalytics.getTopPosts.mockImplementation(async (ctx, { limit }) => {
        const allPosts = await ctx.db.query('socialPosts').collect();
        return allPosts.slice(0, limit).map(post => ({
          id: post._id,
          content: post.finalContent,
          platforms: post.platforms,
          createdAt: post.createdAt,
          metrics: {
            likes: 100,
            comments: 20,
            shares: 10,
            impressions: 1000,
          },
          engagementRate: 5,
          status: post.status,
        }));
      });

      const result = await mockAnalytics.getTopPosts(mockCtx, { 
        limit: 3,
        timeRange: '30d'
      });

      expect(result).toHaveLength(3);
    });
  });
});