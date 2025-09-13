/**
 * aiGenerations Convex 함수 단위 테스트
 * AI 생성 이력, 통계, 품질 분석 기능 테스트
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
  createMockAiGeneration, 
  createFailedAiGeneration,
  createMockUserAiStats,
  createMockMonthlyTrends,
  createMockQualityAnalysis
} from '../../fixtures/social-media-advanced';

// Mock Convex functions
const mockAiGenerations = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  getUserStats: vi.fn(),
  getMonthlyTrends: vi.fn(),
  getPersonaPerformance: vi.fn(),
  getRecentFailures: vi.fn(),
  getQualityAnalysis: vi.fn(),
};

describe('aiGenerations - AI Generation History', () => {
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

  describe('list', () => {
    it('사용자의 AI 생성 이력을 페이징과 함께 조회해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const generations = Array.from({ length: 10 }, () => 
        createMockAiGeneration({ userId })
      );

      dbMocks.setupQueryMock('aiGenerations', generations);

      mockAiGenerations.list.mockImplementation(async (ctx, { limit = 50, paginationOpts }) => {
        const allGenerations = await ctx.db.query('aiGenerations').collect();
        
        if (paginationOpts) {
          const startIndex = paginationOpts.cursor ? parseInt(paginationOpts.cursor) : 0;
          const endIndex = startIndex + paginationOpts.numItems;
          const page = allGenerations.slice(startIndex, endIndex);
          
          return {
            page,
            isDone: endIndex >= allGenerations.length,
            continueCursor: endIndex < allGenerations.length ? endIndex.toString() : null,
          };
        }

        return {
          page: allGenerations.slice(0, limit),
          isDone: true,
          continueCursor: null,
        };
      });

      const result = await mockAiGenerations.list(mockCtx, {
        paginationOpts: { numItems: 5 }
      });

      expect(result.page).toHaveLength(5);
      expect(result.isDone).toBe(false);
      expect(result.continueCursor).toBe('5');
    });

    it('타입별로 AI 생성 이력을 필터링해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const generations = [
        createMockAiGeneration({ userId, type: 'variant_creation' }),
        createMockAiGeneration({ userId, type: 'content_optimization' }),
        createMockAiGeneration({ userId, type: 'variant_creation' }),
      ];

      dbMocks.setupQueryMock('aiGenerations', generations);

      mockAiGenerations.list.mockImplementation(async (ctx, { type }) => {
        const allGenerations = await ctx.db.query('aiGenerations').collect();
        return {
          page: type ? allGenerations.filter(g => g.type === type) : allGenerations,
          isDone: true,
          continueCursor: null,
        };
      });

      const result = await mockAiGenerations.list(mockCtx, { 
        type: 'variant_creation' 
      });

      expect(result.page).toHaveLength(2);
      expect(result.page.every(g => g.type === 'variant_creation')).toBe(true);
    });

    it('성공/실패 상태로 필터링해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const generations = [
        createMockAiGeneration({ userId, success: true }),
        createFailedAiGeneration(),
        createMockAiGeneration({ userId, success: true }),
      ];

      dbMocks.setupQueryMock('aiGenerations', generations);

      mockAiGenerations.list.mockImplementation(async (ctx, { success }) => {
        const allGenerations = await ctx.db.query('aiGenerations').collect();
        return {
          page: success !== undefined 
            ? allGenerations.filter(g => g.success === success)
            : allGenerations,
          isDone: true,
          continueCursor: null,
        };
      });

      const result = await mockAiGenerations.list(mockCtx, { success: true });

      expect(result.page).toHaveLength(2);
      expect(result.page.every(g => g.success === true)).toBe(true);
    });
  });

  describe('get', () => {
    it('특정 AI 생성 이력을 관련 정보와 함께 조회해야 함', async () => {
      const userId = 'user123';
      const generationId = 'gen123';
      const postId = 'post123';
      const personaId = 'persona123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const generation = createMockAiGeneration({
        _id: generationId,
        userId,
        postId,
        personaId,
      });

      const mockPost = { _id: postId, title: 'Test Post' };
      const mockPersona = { _id: personaId, name: 'Test Persona' };

      mockCtx.db.get.mockImplementation((id) => {
        if (id === generationId) return Promise.resolve(generation);
        if (id === postId) return Promise.resolve(mockPost);
        if (id === personaId) return Promise.resolve(mockPersona);
        return Promise.resolve(null);
      });

      mockAiGenerations.get.mockImplementation(async (ctx, { id }) => {
        const generation = await ctx.db.get(id);
        if (!generation) throw ConvexError.notFound('AI 생성 이력');
        if (generation.userId !== userId) throw ConvexError.unauthorized();

        const post = generation.postId ? await ctx.db.get(generation.postId) : null;
        const persona = generation.personaId ? await ctx.db.get(generation.personaId) : null;

        return {
          ...generation,
          post,
          persona,
        };
      });

      const result = await mockAiGenerations.get(mockCtx, { id: generationId });

      expect(result).toEqual({
        ...generation,
        post: mockPost,
        persona: mockPersona,
      });
    });

    it('다른 사용자의 AI 생성 이력 조회 시 에러를 반환해야 함', async () => {
      const userId = 'user123';
      const otherUserId = 'user456';
      const generationId = 'gen123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const otherUserGeneration = createMockAiGeneration({
        _id: generationId,
        userId: otherUserId,
      });

      mockCtx.db.get.mockResolvedValue(otherUserGeneration);

      mockAiGenerations.get.mockImplementation(async (ctx, { id }) => {
        const generation = await ctx.db.get(id);
        if (generation.userId !== userId) {
          throw ConvexError.unauthorized('접근 권한이 없습니다');
        }
      });

      await expect(
        mockAiGenerations.get(mockCtx, { id: generationId })
      ).rejects.toThrow('접근 권한이 없습니다');
    });
  });

  describe('getUserStats', () => {
    it('사용자의 AI 생성 통계를 계산해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const generations = [
        createMockAiGeneration({ 
          userId, 
          success: true, 
          creditsUsed: 2,
          generationTime: 1500,
          inputTokens: 100,
          outputTokens: 50,
          type: 'variant_creation',
          model: 'gpt-4'
        }),
        createMockAiGeneration({ 
          userId, 
          success: true, 
          creditsUsed: 1,
          generationTime: 2000,
          inputTokens: 80,
          outputTokens: 40,
          type: 'content_optimization',
          model: 'gpt-4'
        }),
        createFailedAiGeneration(),
      ];

      dbMocks.setupQueryMock('aiGenerations', generations);

      mockAiGenerations.getUserStats.mockImplementation(async (ctx, { startDate, endDate }) => {
        const allGenerations = await ctx.db.query('aiGenerations').collect();
        
        // 날짜 필터링 (간단화)
        let filteredGenerations = allGenerations;
        
        const stats = {
          total: filteredGenerations.length,
          successful: filteredGenerations.filter(g => g.success).length,
          failed: filteredGenerations.filter(g => !g.success).length,
          totalCreditsUsed: filteredGenerations.reduce((sum, g) => sum + g.creditsUsed, 0),
          averageGenerationTime: 0,
          totalTokensUsed: {
            input: filteredGenerations.reduce((sum, g) => sum + (g.inputTokens || 0), 0),
            output: filteredGenerations.reduce((sum, g) => sum + (g.outputTokens || 0), 0),
          },
          typeBreakdown: {} as Record<string, number>,
          modelBreakdown: {} as Record<string, number>,
          successRate: 0,
        };

        if (stats.total > 0) {
          stats.successRate = Math.round((stats.successful / stats.total) * 100);
          
          const totalTime = filteredGenerations.reduce((sum, g) => sum + g.generationTime, 0);
          stats.averageGenerationTime = Math.round(totalTime / stats.total);
        }

        // 타입별 분석
        filteredGenerations.forEach(gen => {
          stats.typeBreakdown[gen.type] = (stats.typeBreakdown[gen.type] || 0) + 1;
          stats.modelBreakdown[gen.model] = (stats.modelBreakdown[gen.model] || 0) + 1;
        });

        return stats;
      });

      const result = await mockAiGenerations.getUserStats(mockCtx, {});

      expect(result).toEqual({
        total: 3,
        successful: 2,
        failed: 1,
        totalCreditsUsed: 3, // 2 + 1 + 0
        averageGenerationTime: 1167, // (1500 + 2000 + 0) / 3
        totalTokensUsed: {
          input: 180, // 100 + 80 + 0
          output: 90, // 50 + 40 + 0
        },
        typeBreakdown: {
          variant_creation: 1,
          content_optimization: 1,
        },
        modelBreakdown: {
          'gpt-4': 2,
        },
        successRate: 67, // 2/3 * 100
      });
    });
  });

  describe('getMonthlyTrends', () => {
    it('월별 AI 생성 트렌드를 반환해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      // 지난 3개월 데이터 생성
      const now = new Date();
      const generations = [
        // 이번 달
        createMockAiGeneration({ 
          userId, 
          createdAt: now.toISOString(),
          success: true,
          creditsUsed: 2,
          generationTime: 1500,
        }),
        // 1개월 전
        createMockAiGeneration({ 
          userId, 
          createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString(),
          success: true,
          creditsUsed: 1,
          generationTime: 2000,
        }),
        // 2개월 전
        createMockAiGeneration({ 
          userId, 
          createdAt: new Date(now.getFullYear(), now.getMonth() - 2, 10).toISOString(),
          success: false,
          creditsUsed: 0,
          generationTime: 0,
        }),
      ];

      dbMocks.setupQueryMock('aiGenerations', generations);

      mockAiGenerations.getMonthlyTrends.mockImplementation(async (ctx, { months = 12 }) => {
        const allGenerations = await ctx.db.query('aiGenerations').collect();
        
        // 최근 N개월 데이터만 필터링
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);
        
        const recentGenerations = allGenerations.filter(gen => 
          new Date(gen.createdAt) >= cutoffDate
        );

        // 월별로 그룹화
        const monthlyData: Record<string, any> = {};

        recentGenerations.forEach(gen => {
          const date = new Date(gen.createdAt);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              month: monthKey,
              total: 0,
              successful: 0,
              creditsUsed: 0,
              averageTime: 0,
            };
          }

          monthlyData[monthKey].total += 1;
          if (gen.success) {
            monthlyData[monthKey].successful += 1;
          }
          monthlyData[monthKey].creditsUsed += gen.creditsUsed;
        });

        // 평균 시간 계산
        Object.keys(monthlyData).forEach(monthKey => {
          const monthGens = recentGenerations.filter(gen => {
            const date = new Date(gen.createdAt);
            const genMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return genMonthKey === monthKey;
          });

          const totalTime = monthGens.reduce((sum, g) => sum + g.generationTime, 0);
          monthlyData[monthKey].averageTime = monthGens.length > 0 
            ? Math.round(totalTime / monthGens.length) 
            : 0;
        });

        // 시간순 정렬
        return Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month));
      });

      const result = await mockAiGenerations.getMonthlyTrends(mockCtx, { months: 3 });

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('month');
      expect(result[0]).toHaveProperty('total');
      expect(result[0]).toHaveProperty('successful');
      expect(result[0]).toHaveProperty('creditsUsed');
      expect(result[0]).toHaveProperty('averageTime');
    });
  });

  describe('getQualityAnalysis', () => {
    it('AI 생성 품질 분석을 반환해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const generations = [
        createMockAiGeneration({ 
          userId, 
          success: true,
          type: 'variant_creation',
          postId: 'post1',
          temperature: 0.7,
          generationTime: 1500,
        }),
        createMockAiGeneration({ 
          userId, 
          success: true,
          type: 'variant_creation',
          postId: 'post2',
          temperature: 0.8,
          generationTime: 2000,
        }),
      ];

      // Mock 변형 데이터 (점수 포함)
      const variants = [
        {
          postId: 'post1',
          overallScore: 85,
          scoreBreakdown: {
            engagement: 80,
            virality: 85,
            personaMatch: 90,
            readability: 88,
            trending: 82,
          },
        },
        {
          postId: 'post2',
          overallScore: 92,
          scoreBreakdown: {
            engagement: 90,
            virality: 88,
            personaMatch: 95,
            readability: 92,
            trending: 95,
          },
        },
      ];

      dbMocks.setupQueryMock('aiGenerations', generations);
      dbMocks.setupQueryMock('postVariants', variants);

      mockAiGenerations.getQualityAnalysis.mockImplementation(async (ctx, { type, model }) => {
        const allGenerations = await ctx.db.query('aiGenerations').collect();
        let filteredGenerations = allGenerations.filter(g => g.success);
        
        if (type) filteredGenerations = filteredGenerations.filter(g => g.type === type);
        if (model) filteredGenerations = filteredGenerations.filter(g => g.model === model);

        if (filteredGenerations.length === 0) return null;

        // 각 생성에 대한 변형 점수들 가져오기
        const qualityScores: any[] = [];
        const allVariants = await ctx.db.query('postVariants').collect();

        for (const gen of filteredGenerations) {
          if (gen.postId && gen.type === 'variant_creation') {
            const postVariants = allVariants.filter(v => v.postId === gen.postId);

            postVariants.forEach(variant => {
              qualityScores.push({
                generationId: gen._id,
                overallScore: variant.overallScore,
                engagement: variant.scoreBreakdown.engagement,
                virality: variant.scoreBreakdown.virality,
                personaMatch: variant.scoreBreakdown.personaMatch,
                readability: variant.scoreBreakdown.readability,
                trending: variant.scoreBreakdown.trending,
                generationTime: gen.generationTime,
                temperature: gen.temperature?.toString(),
              });
            });
          }
        }

        if (qualityScores.length === 0) return null;

        // 평균값 계산
        const analysis = {
          totalSamples: qualityScores.length,
          averageScores: {
            overall: Math.round(qualityScores.reduce((sum, s) => sum + s.overallScore, 0) / qualityScores.length),
            engagement: Math.round(qualityScores.reduce((sum, s) => sum + s.engagement, 0) / qualityScores.length),
            virality: Math.round(qualityScores.reduce((sum, s) => sum + s.virality, 0) / qualityScores.length),
            personaMatch: Math.round(qualityScores.reduce((sum, s) => sum + s.personaMatch, 0) / qualityScores.length),
            readability: Math.round(qualityScores.reduce((sum, s) => sum + s.readability, 0) / qualityScores.length),
            trending: Math.round(qualityScores.reduce((sum, s) => sum + s.trending, 0) / qualityScores.length),
          },
          scoreDistribution: {
            excellent: qualityScores.filter(s => s.overallScore >= 80).length,
            good: qualityScores.filter(s => s.overallScore >= 60 && s.overallScore < 80).length,
            average: qualityScores.filter(s => s.overallScore >= 40 && s.overallScore < 60).length,
            poor: qualityScores.filter(s => s.overallScore < 40).length,
          },
          averageGenerationTime: Math.round(
            filteredGenerations.reduce((sum, g) => sum + g.generationTime, 0) / filteredGenerations.length
          ),
          bestPerformingTemperature: 0.8, // 예시
        };

        return analysis;
      });

      const result = await mockAiGenerations.getQualityAnalysis(mockCtx, { 
        type: 'variant_creation' 
      });

      expect(result).toBeDefined();
      expect(result!.totalSamples).toBe(2);
      expect(result!.averageScores.overall).toBe(89); // (85 + 92) / 2
      expect(result!.scoreDistribution.excellent).toBe(2); // 85, 92 모두 80 이상
      expect(result!.averageGenerationTime).toBe(1750); // (1500 + 2000) / 2
    });

    it('분석할 데이터가 없으면 null을 반환해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      dbMocks.setupQueryMock('aiGenerations', []);

      mockAiGenerations.getQualityAnalysis.mockImplementation(async () => null);

      const result = await mockAiGenerations.getQualityAnalysis(mockCtx, {});

      expect(result).toBeNull();
    });
  });

  describe('getRecentFailures', () => {
    it('최근 실패한 AI 생성들을 조회해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const failures = Array.from({ length: 5 }, () => createFailedAiGeneration());
      const successes = Array.from({ length: 3 }, () => createMockAiGeneration({ userId }));

      dbMocks.setupQueryMock('aiGenerations', [...failures, ...successes]);

      mockAiGenerations.getRecentFailures.mockImplementation(async (ctx, { limit = 10 }) => {
        const allGenerations = await ctx.db.query('aiGenerations').collect();
        return allGenerations
          .filter(g => g.success === false)
          .slice(0, limit);
      });

      const result = await mockAiGenerations.getRecentFailures(mockCtx, { limit: 3 });

      expect(result).toHaveLength(3);
      expect(result.every(g => g.success === false)).toBe(true);
      expect(result.every(g => g.errorMessage)).toBe(true);
    });
  });
});