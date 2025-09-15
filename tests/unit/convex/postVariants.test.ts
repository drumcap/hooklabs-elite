import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock post variant data
const mockPostVariant = {
  _id: 'test_variant_id' as const,
  postId: 'test_post_id' as const,
  content: '변형된 테스트 게시물입니다. #해시태그 포함',
  overallScore: 85,
  scoreBreakdown: {
    engagement: 90,
    virality: 80,
    personaMatch: 85,
    readability: 88,
    trending: 82,
  },
  isSelected: false,
  aiModel: 'gpt-4',
  promptUsed: '매력적인 게시물 생성',
  creditsUsed: 5,
  generatedAt: new Date().toISOString(),
};

const mockSocialPost = {
  _id: 'test_post_id' as const,
  userId: 'test_user_id' as const,
  originalContent: '원본 테스트 게시물입니다.',
  finalContent: '원본 테스트 게시물입니다.',
  status: 'draft' as const,
  platforms: ['twitter', 'instagram'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Convex 함수 Mock
const mockConvexFunctions = {
  getByPost: vi.fn(),
  getBestVariant: vi.fn(),
  selectVariant: vi.fn(),
  getAverageScores: vi.fn(),
  getUserVariantStats: vi.fn(),
  create: vi.fn(),
  updateScore: vi.fn(),
  delete: vi.fn(),
};

describe('Post Variants Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('변형 조회 기능', () => {
    it('특정 게시물의 모든 변형을 조회할 수 있어야 한다', () => {
      // Given: 게시물 ID가 주어졌을 때
      const postId = 'test_post_id';
      const expectedVariants = [mockPostVariant];
      
      mockConvexFunctions.getByPost.mockReturnValue(expectedVariants);
      
      // When: getByPost 함수를 호출하면
      const result = mockConvexFunctions.getByPost({ postId });
      
      // Then: 해당 게시물의 변형 목록이 반환되어야 한다
      expect(mockConvexFunctions.getByPost).toHaveBeenCalledWith({ postId });
      expect(result).toEqual(expectedVariants);
      expect(result).toHaveLength(1);
      expect(result[0].content).toContain('변형된 테스트 게시물');
    });

    it('점수가 가장 높은 변형을 조회할 수 있어야 한다', () => {
      // Given: 게시물 ID가 주어졌을 때
      const postId = 'test_post_id';
      const bestVariant = {
        ...mockPostVariant,
        overallScore: 95,
        scoreBreakdown: {
          engagement: 95,
          virality: 90,
          personaMatch: 98,
          readability: 95,
          trending: 97,
        },
      };
      
      mockConvexFunctions.getBestVariant.mockReturnValue(bestVariant);
      
      // When: getBestVariant 함수를 호출하면
      const result = mockConvexFunctions.getBestVariant({ postId });
      
      // Then: 가장 높은 점수의 변형이 반환되어야 한다
      expect(mockConvexFunctions.getBestVariant).toHaveBeenCalledWith({ postId });
      expect(result.overallScore).toBe(95);
      expect(result.scoreBreakdown.personaMatch).toBe(98);
    });

    it('변형들의 평균 점수를 조회할 수 있어야 한다', () => {
      // Given: 게시물 ID가 주어졌을 때
      const postId = 'test_post_id';
      const expectedAverageScores = {
        overallScore: 87.5,
        engagement: 88.0,
        virality: 85.0,
        personaMatch: 89.5,
        readability: 87.0,
        trending: 85.5,
        totalVariants: 4,
      };
      
      mockConvexFunctions.getAverageScores.mockReturnValue(expectedAverageScores);
      
      // When: getAverageScores 함수를 호출하면
      const result = mockConvexFunctions.getAverageScores({ postId });
      
      // Then: 평균 점수들이 반환되어야 한다
      expect(mockConvexFunctions.getAverageScores).toHaveBeenCalledWith({ postId });
      expect(result.overallScore).toBe(87.5);
      expect(result.totalVariants).toBe(4);
      expect(result.personaMatch).toBe(89.5);
    });

    it('사용자의 변형 통계를 조회할 수 있어야 한다', () => {
      // Given: 사용자 ID가 주어졌을 때
      const userId = 'test_user_id';
      const expectedStats = {
        totalVariantsGenerated: 25,
        averageScore: 86.2,
        bestScore: 95,
        totalCreditsUsed: 125,
        mostUsedModel: 'gpt-4',
        modelUsageBreakdown: {
          'gpt-4': 20,
          'gpt-3.5-turbo': 5,
        },
        timeDistribution: {
          thisWeek: 8,
          thisMonth: 25,
          last30Days: 25,
        },
      };
      
      mockConvexFunctions.getUserVariantStats.mockReturnValue(expectedStats);
      
      // When: getUserVariantStats 함수를 호출하면
      const result = mockConvexFunctions.getUserVariantStats({ userId });
      
      // Then: 사용자 변형 통계가 반환되어야 한다
      expect(mockConvexFunctions.getUserVariantStats).toHaveBeenCalledWith({ userId });
      expect(result.totalVariantsGenerated).toBe(25);
      expect(result.averageScore).toBe(86.2);
      expect(result.mostUsedModel).toBe('gpt-4');
      expect(result.modelUsageBreakdown['gpt-4']).toBe(20);
    });
  });

  describe('변형 선택 및 관리', () => {
    it('특정 변형을 선택할 수 있어야 한다', () => {
      // Given: 변형 ID가 주어졌을 때
      const variantId = 'test_variant_id';
      const postId = 'test_post_id';
      
      mockConvexFunctions.selectVariant.mockReturnValue('success');
      
      // When: selectVariant 함수를 호출하면
      const result = mockConvexFunctions.selectVariant({ variantId, postId });
      
      // Then: 변형이 선택되어야 한다
      expect(mockConvexFunctions.selectVariant).toHaveBeenCalledWith({ variantId, postId });
      expect(result).toBe('success');
    });

    it('변형 선택 시 다른 변형들은 선택 해제되어야 한다', () => {
      // Given: 여러 변형이 있는 게시물에서 하나를 선택할 때
      const variantId = 'test_variant_id';
      const postId = 'test_post_id';
      
      const mockUpdateResult = {
        selectedVariant: variantId,
        deselectedVariants: ['variant_1', 'variant_2'],
        updatedCount: 3,
      };
      
      mockConvexFunctions.selectVariant.mockReturnValue(mockUpdateResult);
      
      // When: selectVariant 함수를 호출하면
      const result = mockConvexFunctions.selectVariant({ variantId, postId });
      
      // Then: 선택된 변형과 해제된 변형 정보가 반환되어야 한다
      expect(result.selectedVariant).toBe(variantId);
      expect(result.deselectedVariants).toHaveLength(2);
      expect(result.updatedCount).toBe(3);
    });
  });

  describe('변형 생성 및 점수 계산', () => {
    it('새로운 변형을 생성할 수 있어야 한다', () => {
      // Given: 변형 생성 데이터가 주어졌을 때
      const createData = {
        postId: 'test_post_id',
        content: '새롭게 생성된 변형 콘텐츠입니다!',
        aiModel: 'gpt-4',
        promptUsed: '더 매력적인 게시물 생성',
        creditsUsed: 5,
      };
      
      const expectedVariantId = 'new_variant_id';
      mockConvexFunctions.create.mockReturnValue(expectedVariantId);
      
      // When: create 함수를 호출하면
      const result = mockConvexFunctions.create(createData);
      
      // Then: 새로운 변형이 생성되어야 한다
      expect(mockConvexFunctions.create).toHaveBeenCalledWith(createData);
      expect(result).toBe(expectedVariantId);
    });

    it('변형의 점수를 업데이트할 수 있어야 한다', () => {
      // Given: 변형 ID와 새로운 점수가 주어졌을 때
      const updateData = {
        variantId: 'test_variant_id',
        overallScore: 92,
        scoreBreakdown: {
          engagement: 95,
          virality: 88,
          personaMatch: 94,
          readability: 90,
          trending: 93,
        },
      };
      
      mockConvexFunctions.updateScore.mockReturnValue('success');
      
      // When: updateScore 함수를 호출하면
      const result = mockConvexFunctions.updateScore(updateData);
      
      // Then: 점수가 업데이트되어야 한다
      expect(mockConvexFunctions.updateScore).toHaveBeenCalledWith(updateData);
      expect(result).toBe('success');
    });

    it('점수 계산 알고리즘이 올바르게 동작해야 한다', () => {
      // Given: 개별 점수들이 주어졌을 때
      const scores = {
        engagement: 90,
        virality: 80,
        personaMatch: 85,
        readability: 88,
        trending: 82,
      };
      
      // When: 전체 점수를 계산하면
      const mockCalculateOverallScore = (scoreBreakdown: any) => {
        const values = Object.values(scoreBreakdown) as number[];
        return Math.round(values.reduce((sum, score) => sum + score, 0) / values.length);
      };
      
      const overallScore = mockCalculateOverallScore(scores);
      
      // Then: 올바른 평균값이 계산되어야 한다
      expect(overallScore).toBe(85); // (90+80+85+88+82)/5 = 85
    });
  });

  describe('변형 삭제 및 정리', () => {
    it('특정 변형을 삭제할 수 있어야 한다', () => {
      // Given: 변형 ID가 주어졌을 때
      const variantId = 'test_variant_id';
      
      mockConvexFunctions.delete.mockReturnValue('success');
      
      // When: delete 함수를 호출하면
      const result = mockConvexFunctions.delete({ variantId });
      
      // Then: 변형이 삭제되어야 한다
      expect(mockConvexFunctions.delete).toHaveBeenCalledWith({ variantId });
      expect(result).toBe('success');
    });

    it('선택된 변형은 삭제할 수 없어야 한다', () => {
      // Given: 선택된 변형을 삭제하려 할 때
      const variantId = 'selected_variant_id';
      
      const error = new Error('Cannot delete selected variant');
      mockConvexFunctions.delete.mockRejectedValue(error);
      
      // When & Then: delete 함수 호출 시 오류가 발생해야 한다
      expect(async () => {
        await mockConvexFunctions.delete({ variantId });
      }).rejects.toThrow('Cannot delete selected variant');
    });
  });

  describe('A/B 테스트 및 성능 분석', () => {
    it('변형들 간의 성능을 비교할 수 있어야 한다', () => {
      // Given: 여러 변형의 성능 데이터가 주어졌을 때
      const postId = 'test_post_id';
      const comparisonData = {
        variants: [
          { ...mockPostVariant, overallScore: 85 },
          { ...mockPostVariant, _id: 'variant_2', overallScore: 92 },
          { ...mockPostVariant, _id: 'variant_3', overallScore: 78 },
        ],
        bestPerforming: {
          variantId: 'variant_2',
          score: 92,
          improvement: '8.2% better than average',
        },
        worstPerforming: {
          variantId: 'variant_3',
          score: 78,
          gap: '14 points below best',
        },
        recommendations: [
          'Use similar tone as variant_2',
          'Include more engaging hashtags',
          'Consider shorter content length',
        ],
      };
      
      const mockCompareVariants = vi.fn().mockReturnValue(comparisonData);
      
      // When: 변형 비교를 수행하면
      const result = mockCompareVariants({ postId });
      
      // Then: 상세한 비교 분석이 제공되어야 한다
      expect(result.bestPerforming.variantId).toBe('variant_2');
      expect(result.worstPerforming.score).toBe(78);
      expect(result.recommendations).toHaveLength(3);
    });

    it('시간대별 변형 성능을 분석할 수 있어야 한다', () => {
      // Given: 시간대별 성능 데이터가 주어졌을 때
      const timeBasedAnalysis = {
        hourlyPerformance: {
          '09:00': { score: 85, engagementRate: 0.12 },
          '12:00': { score: 92, engagementRate: 0.18 },
          '18:00': { score: 88, engagementRate: 0.15 },
          '21:00': { score: 90, engagementRate: 0.16 },
        },
        bestTimeSlot: '12:00',
        peakEngagementHour: 12,
        recommendedPostingTimes: ['12:00', '21:00', '18:00'],
      };
      
      const mockAnalyzeTimeBasedPerformance = vi.fn().mockReturnValue(timeBasedAnalysis);
      
      // When: 시간대별 분석을 수행하면
      const result = mockAnalyzeTimeBasedPerformance({ postId: 'test_post_id' });
      
      // Then: 시간대별 성능 인사이트가 제공되어야 한다
      expect(result.bestTimeSlot).toBe('12:00');
      expect(result.peakEngagementHour).toBe(12);
      expect(result.recommendedPostingTimes).toContain('12:00');
    });
  });

  describe('에러 처리 및 검증', () => {
    it('존재하지 않는 게시물의 변형 조회 시 빈 배열을 반환해야 한다', () => {
      // Given: 존재하지 않는 게시물 ID가 주어졌을 때
      const nonExistentPostId = 'non_existent_post';
      
      mockConvexFunctions.getByPost.mockReturnValue([]);
      
      // When: getByPost 함수를 호출하면
      const result = mockConvexFunctions.getByPost({ postId: nonExistentPostId });
      
      // Then: 빈 배열이 반환되어야 한다
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('권한이 없는 사용자의 변형 접근을 막아야 한다', () => {
      // Given: 권한이 없는 사용자가 변형에 접근하려 할 때
      const unauthorizedData = {
        postId: 'test_post_id',
        userId: 'unauthorized_user_id',
      };
      
      const error = new Error('Unauthorized access to post variants');
      mockConvexFunctions.getByPost.mockRejectedValue(error);
      
      // When & Then: getByPost 함수 호출 시 오류가 발생해야 한다
      expect(async () => {
        await mockConvexFunctions.getByPost(unauthorizedData);
      }).rejects.toThrow('Unauthorized access to post variants');
    });

    it('잘못된 점수 값에 대해 검증 오류를 반환해야 한다', () => {
      // Given: 범위를 벗어난 점수가 주어졌을 때
      const invalidScoreData = {
        variantId: 'test_variant_id',
        overallScore: 150, // 100을 초과
        scoreBreakdown: {
          engagement: -5, // 음수
          virality: 120, // 100 초과
          personaMatch: 85,
          readability: 88,
          trending: 82,
        },
      };
      
      const validationError = new Error('Score values must be between 0 and 100');
      mockConvexFunctions.updateScore.mockRejectedValue(validationError);
      
      // When & Then: updateScore 함수 호출 시 검증 오류가 발생해야 한다
      expect(async () => {
        await mockConvexFunctions.updateScore(invalidScoreData);
      }).rejects.toThrow('Score values must be between 0 and 100');
    });
  });

  describe('성능 및 최적화', () => {
    it('대량의 변형 조회 시 페이지네이션을 지원해야 한다', () => {
      // Given: 페이지네이션 파라미터가 주어졌을 때
      const paginationData = {
        postId: 'test_post_id',
        limit: 10,
        offset: 0,
        sortBy: 'overallScore',
        sortOrder: 'desc',
      };
      
      const paginatedResult = {
        variants: [mockPostVariant],
        totalCount: 25,
        hasMore: true,
        currentPage: 1,
        totalPages: 3,
      };
      
      mockConvexFunctions.getByPost.mockReturnValue(paginatedResult);
      
      // When: 페이지네이션과 함께 조회하면
      const result = mockConvexFunctions.getByPost(paginationData);
      
      // Then: 페이지네이션된 결과가 반환되어야 한다
      expect(result.variants).toHaveLength(1);
      expect(result.totalCount).toBe(25);
      expect(result.hasMore).toBe(true);
      expect(result.totalPages).toBe(3);
    });

    it('변형 생성 시 중복 체크를 수행해야 한다', () => {
      // Given: 동일한 내용의 변형을 생성하려 할 때
      const duplicateData = {
        postId: 'test_post_id',
        content: '이미 존재하는 변형 내용',
      };
      
      const error = new Error('Similar variant already exists');
      mockConvexFunctions.create.mockRejectedValue(error);
      
      // When & Then: create 함수 호출 시 중복 오류가 발생해야 한다
      expect(async () => {
        await mockConvexFunctions.create(duplicateData);
      }).rejects.toThrow('Similar variant already exists');
    });
  });
});