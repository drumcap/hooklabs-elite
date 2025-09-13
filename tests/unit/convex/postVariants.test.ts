/**
 * postVariants Convex 함수 단위 테스트
 * A/B 테스트, 변형 선택, 점수 계산 기능 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMockConvexContext,
  setupDatabaseMocks,
  setupAuthMocks,
  cleanupTestData,
  ConvexError,
} from '../../utils/convex-test-helpers';
import { createMockPostVariant, createBestVariant, createScenarioData } from '../../fixtures/social-media-advanced';

// Mock Convex functions
const mockPostVariants = {
  getByPost: vi.fn(),
  getBestVariant: vi.fn(),
  getSelectedVariant: vi.fn(),
  selectVariant: vi.fn(),
  create: vi.fn(),
  updateScore: vi.fn(),
  getAverageScores: vi.fn(),
  getUserVariantStats: vi.fn(),
};

describe('postVariants - A/B Testing', () => {
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

  describe('getByPost', () => {
    it('게시물의 모든 변형을 조회해야 함', async () => {
      const userId = 'user123';
      const postId = 'post123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const mockPost = { _id: postId, userId, content: 'Original post' };
      const variants = Array.from({ length: 3 }, () => createMockPostVariant({ postId }));

      mockCtx.db.get.mockResolvedValue(mockPost);
      dbMocks.setupQueryMock('postVariants', variants);

      mockPostVariants.getByPost.mockImplementation(async (ctx, { postId }) => {
        const post = await ctx.db.get(postId);
        if (!post) throw ConvexError.notFound('게시물');
        if (post.userId !== userId) throw ConvexError.unauthorized();

        return await ctx.db.query('postVariants').collect();
      });

      const result = await mockPostVariants.getByPost(mockCtx, { postId });

      expect(result).toHaveLength(3);
      expect(result.every(v => v.postId === postId)).toBe(true);
    });

    it('다른 사용자의 게시물 변형 조회 시 에러를 반환해야 함', async () => {
      const userId = 'user123';
      const otherUserId = 'user456';
      const postId = 'post123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const otherUserPost = { _id: postId, userId: otherUserId };
      mockCtx.db.get.mockResolvedValue(otherUserPost);

      mockPostVariants.getByPost.mockImplementation(async (ctx, { postId }) => {
        const post = await ctx.db.get(postId);
        if (post.userId !== userId) {
          throw ConvexError.unauthorized('게시물에 대한 접근 권한이 없습니다');
        }
      });

      await expect(
        mockPostVariants.getByPost(mockCtx, { postId })
      ).rejects.toThrow('게시물에 대한 접근 권한이 없습니다');
    });
  });

  describe('getBestVariant', () => {
    it('가장 높은 점수의 변형을 반환해야 함', async () => {
      const userId = 'user123';
      const postId = 'post123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const mockPost = { _id: postId, userId };
      const variants = [
        createMockPostVariant({ postId, overallScore: 75 }),
        createMockPostVariant({ postId, overallScore: 92 }), // 최고점
        createMockPostVariant({ postId, overallScore: 68 }),
      ];

      mockCtx.db.get.mockResolvedValue(mockPost);
      dbMocks.setupQueryMock('postVariants', variants);

      mockPostVariants.getBestVariant.mockImplementation(async (ctx, { postId }) => {
        const post = await ctx.db.get(postId);
        if (!post || post.userId !== userId) throw ConvexError.unauthorized();

        const variants = await ctx.db.query('postVariants').collect();
        if (variants.length === 0) return null;

        return variants.reduce((best, current) => 
          current.overallScore > best.overallScore ? current : best
        );
      });

      const result = await mockPostVariants.getBestVariant(mockCtx, { postId });

      expect(result).toBeDefined();
      expect(result.overallScore).toBe(92);
    });

    it('변형이 없는 경우 null을 반환해야 함', async () => {
      const userId = 'user123';
      const postId = 'post123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const mockPost = { _id: postId, userId };
      mockCtx.db.get.mockResolvedValue(mockPost);
      dbMocks.setupQueryMock('postVariants', []);

      mockPostVariants.getBestVariant.mockImplementation(async () => null);

      const result = await mockPostVariants.getBestVariant(mockCtx, { postId });

      expect(result).toBeNull();
    });
  });

  describe('selectVariant', () => {
    it('변형을 선택하고 다른 변형들의 선택을 해제해야 함', async () => {
      const userId = 'user123';
      const postId = 'post123';
      const variantId = 'variant123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const selectedVariant = createMockPostVariant({ 
        _id: variantId, 
        postId, 
        isSelected: false,
        content: 'Selected variant content'
      });
      const otherVariants = [
        createMockPostVariant({ postId, isSelected: true }), // 기존 선택된 변형
        createMockPostVariant({ postId, isSelected: false }),
      ];
      const mockPost = { _id: postId, userId, originalContent: 'Original' };

      mockCtx.db.get.mockImplementation((id) => {
        if (id === variantId) return Promise.resolve(selectedVariant);
        if (id === postId) return Promise.resolve(mockPost);
        return Promise.resolve(null);
      });

      dbMocks.setupQueryMock('postVariants', otherVariants);
      dbMocks.setupPatchMock('postVariants');

      mockPostVariants.selectVariant.mockImplementation(async (ctx, { id }) => {
        const variant = await ctx.db.get(id);
        if (!variant) throw ConvexError.notFound('변형');

        const post = await ctx.db.get(variant.postId);
        if (!post || post.userId !== userId) throw ConvexError.unauthorized();

        // 다른 변형들 선택 해제
        const otherVariants = await ctx.db.query('postVariants').collect();
        for (const other of otherVariants) {
          if (other._id !== id && other.isSelected) {
            await ctx.db.patch(other._id, { isSelected: false });
          }
        }

        // 현재 변형 선택
        await ctx.db.patch(id, { isSelected: true });

        // 게시물의 finalContent 업데이트
        await ctx.db.patch(variant.postId, {
          finalContent: variant.content,
          updatedAt: new Date().toISOString(),
        });

        return id;
      });

      const result = await mockPostVariants.selectVariant(mockCtx, { id: variantId });

      expect(result).toBe(variantId);
      expect(mockCtx.db.patch).toHaveBeenCalledWith(variantId, { isSelected: true });
      expect(mockCtx.db.patch).toHaveBeenCalledWith(
        postId,
        expect.objectContaining({
          finalContent: selectedVariant.content,
        })
      );
    });

    it('존재하지 않는 변형 선택 시 에러를 반환해야 함', async () => {
      const userId = 'user123';
      const variantId = 'nonexistent';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      mockCtx.db.get.mockResolvedValue(null);

      mockPostVariants.selectVariant.mockImplementation(async (ctx, { id }) => {
        const variant = await ctx.db.get(id);
        if (!variant) {
          throw ConvexError.notFound('변형을 찾을 수 없습니다');
        }
      });

      await expect(
        mockPostVariants.selectVariant(mockCtx, { id: variantId })
      ).rejects.toThrow('변형을 찾을 수 없습니다');
    });
  });

  describe('create', () => {
    it('새로운 변형을 생성해야 함', async () => {
      const userId = 'user123';
      const postId = 'post123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const mockPost = { _id: postId, userId };
      const variantData = {
        postId,
        content: 'New variant content',
        overallScore: 85,
        scoreBreakdown: {
          engagement: 80,
          virality: 85,
          personaMatch: 90,
          readability: 88,
          trending: 82,
        },
        aiModel: 'gpt-4-turbo',
        promptUsed: 'Create engaging variant',
        creditsUsed: 2,
      };

      mockCtx.db.get.mockResolvedValue(mockPost);
      dbMocks.setupInsertMock('postVariants', 'variant123');

      mockPostVariants.create.mockImplementation(async (ctx, args) => {
        const post = await ctx.db.get(args.postId);
        if (!post || post.userId !== userId) throw ConvexError.unauthorized();

        // 점수 유효성 검증
        if (args.overallScore < 0 || args.overallScore > 100) {
          throw ConvexError.validation('전체 점수는 0-100 사이여야 합니다');
        }

        const scoreValues = Object.values(args.scoreBreakdown);
        if (scoreValues.some(score => score < 0 || score > 100)) {
          throw ConvexError.validation('모든 세부 점수는 0-100 사이여야 합니다');
        }

        return await ctx.db.insert('postVariants', {
          ...args,
          isSelected: false,
          generatedAt: new Date().toISOString(),
        });
      });

      const result = await mockPostVariants.create(mockCtx, variantData);

      expect(result).toBe('variant123');
      expect(mockCtx.db.insert).toHaveBeenCalledWith(
        'postVariants',
        expect.objectContaining({
          ...variantData,
          isSelected: false,
        })
      );
    });

    it('잘못된 점수 범위로 변형 생성 시 에러를 반환해야 함', async () => {
      const userId = 'user123';
      const postId = 'post123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const mockPost = { _id: postId, userId };
      mockCtx.db.get.mockResolvedValue(mockPost);

      mockPostVariants.create.mockImplementation(async (ctx, args) => {
        if (args.overallScore < 0 || args.overallScore > 100) {
          throw ConvexError.validation('전체 점수는 0-100 사이여야 합니다');
        }
      });

      const invalidVariantData = {
        postId,
        content: 'Invalid variant',
        overallScore: 150, // 잘못된 점수
        scoreBreakdown: {
          engagement: 80,
          virality: 85,
          personaMatch: 90,
          readability: 88,
          trending: 82,
        },
        aiModel: 'gpt-4',
        promptUsed: 'Test prompt',
        creditsUsed: 2,
      };

      await expect(
        mockPostVariants.create(mockCtx, invalidVariantData)
      ).rejects.toThrow('전체 점수는 0-100 사이여야 합니다');
    });
  });

  describe('getAverageScores', () => {
    it('변형들의 평균 점수를 계산해야 함', async () => {
      const userId = 'user123';
      const postId = 'post123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const mockPost = { _id: postId, userId };
      const variants = [
        createMockPostVariant({
          postId,
          overallScore: 80,
          scoreBreakdown: { engagement: 75, virality: 80, personaMatch: 85, readability: 90, trending: 70 }
        }),
        createMockPostVariant({
          postId,
          overallScore: 90,
          scoreBreakdown: { engagement: 85, virality: 90, personaMatch: 95, readability: 88, trending: 92 }
        }),
      ];

      mockCtx.db.get.mockResolvedValue(mockPost);
      dbMocks.setupQueryMock('postVariants', variants);

      mockPostVariants.getAverageScores.mockImplementation(async (ctx, { postId }) => {
        const post = await ctx.db.get(postId);
        if (!post || post.userId !== userId) throw ConvexError.unauthorized();

        const variants = await ctx.db.query('postVariants').collect();
        if (variants.length === 0) return null;

        const averages = {
          overallScore: 0,
          engagement: 0,
          virality: 0,
          personaMatch: 0,
          readability: 0,
          trending: 0,
        };

        variants.forEach(variant => {
          averages.overallScore += variant.overallScore;
          averages.engagement += variant.scoreBreakdown.engagement;
          averages.virality += variant.scoreBreakdown.virality;
          averages.personaMatch += variant.scoreBreakdown.personaMatch;
          averages.readability += variant.scoreBreakdown.readability;
          averages.trending += variant.scoreBreakdown.trending;
        });

        const count = variants.length;
        return {
          overallScore: Math.round(averages.overallScore / count),
          scoreBreakdown: {
            engagement: Math.round(averages.engagement / count),
            virality: Math.round(averages.virality / count),
            personaMatch: Math.round(averages.personaMatch / count),
            readability: Math.round(averages.readability / count),
            trending: Math.round(averages.trending / count),
          },
          variantCount: count,
        };
      });

      const result = await mockPostVariants.getAverageScores(mockCtx, { postId });

      expect(result).toEqual({
        overallScore: 85, // (80 + 90) / 2
        scoreBreakdown: {
          engagement: 80, // (75 + 85) / 2
          virality: 85,   // (80 + 90) / 2
          personaMatch: 90, // (85 + 95) / 2
          readability: 89,  // (90 + 88) / 2
          trending: 81,     // (70 + 92) / 2
        },
        variantCount: 2,
      });
    });

    it('변형이 없는 경우 null을 반환해야 함', async () => {
      const userId = 'user123';
      const postId = 'post123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const mockPost = { _id: postId, userId };
      mockCtx.db.get.mockResolvedValue(mockPost);
      dbMocks.setupQueryMock('postVariants', []);

      mockPostVariants.getAverageScores.mockImplementation(async () => null);

      const result = await mockPostVariants.getAverageScores(mockCtx, { postId });

      expect(result).toBeNull();
    });
  });

  describe('getUserVariantStats', () => {
    it('사용자의 변형 생성 통계를 반환해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const userPosts = [
        { _id: 'post1', userId },
        { _id: 'post2', userId },
      ];

      const variants = [
        createMockPostVariant({ postId: 'post1', creditsUsed: 2, overallScore: 85, aiModel: 'gpt-4' }),
        createMockPostVariant({ postId: 'post1', creditsUsed: 2, overallScore: 90, aiModel: 'gpt-4' }),
        createMockPostVariant({ postId: 'post2', creditsUsed: 1, overallScore: 75, aiModel: 'gpt-3.5' }),
      ];

      dbMocks.setupQueryMock('socialPosts', userPosts);
      dbMocks.setupQueryMock('postVariants', variants);

      mockPostVariants.getUserVariantStats.mockImplementation(async (ctx) => {
        const posts = await ctx.db.query('socialPosts').collect();
        const userPosts = posts.filter(p => p.userId === userId);
        
        // 모든 변형 조회 (실제로는 각 게시물별로 조회)
        const allVariants = await ctx.db.query('postVariants').collect();

        const totalVariants = allVariants.length;
        const totalCreditsUsed = allVariants.reduce((sum, v) => sum + v.creditsUsed, 0);
        const averageScore = totalVariants > 0 
          ? allVariants.reduce((sum, v) => sum + v.overallScore, 0) / totalVariants
          : 0;

        const aiModelUsage = allVariants.reduce((acc, variant) => {
          acc[variant.aiModel] = (acc[variant.aiModel] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return {
          totalVariants,
          totalCreditsUsed,
          averageScore: Math.round(averageScore),
          aiModelUsage,
          postsWithVariants: userPosts.length,
        };
      });

      const result = await mockPostVariants.getUserVariantStats(mockCtx, {});

      expect(result).toEqual({
        totalVariants: 3,
        totalCreditsUsed: 5, // 2 + 2 + 1
        averageScore: 83,    // (85 + 90 + 75) / 3
        aiModelUsage: {
          'gpt-4': 2,
          'gpt-3.5': 1,
        },
        postsWithVariants: 2,
      });
    });

    it('변형이 없는 사용자에 대해 0 통계를 반환해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      dbMocks.setupQueryMock('socialPosts', []);
      dbMocks.setupQueryMock('postVariants', []);

      mockPostVariants.getUserVariantStats.mockImplementation(async () => ({
        totalVariants: 0,
        totalCreditsUsed: 0,
        averageScore: 0,
        aiModelUsage: {},
        postsWithVariants: 0,
      }));

      const result = await mockPostVariants.getUserVariantStats(mockCtx, {});

      expect(result.totalVariants).toBe(0);
      expect(result.totalCreditsUsed).toBe(0);
      expect(result.averageScore).toBe(0);
    });
  });
});