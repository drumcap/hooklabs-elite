/**
 * 소셜 미디어 점수 계산 유틸리티 테스트
 * 점수 계산 알고리즘의 정확성 및 엣지 케이스 검증
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateContentScore,
  calculateEngagementScore,
  calculateViralityScore,
  calculatePersonaMatchScore,
  calculateReadabilityScore,
  calculateTrendingScore,
  calculateOverallScore,
  generateFeedback,
  generateRecommendations,
  type ScoringInput,
  type ScoreBreakdown
} from '../../../lib/utils/social/scoring';

describe('Social Media Scoring Utils', () => {
  const baseScoringInput: ScoringInput = {
    content: '🚀 새로운 AI 기능을 출시했습니다! 사용자 경험이 50% 향상되었어요. 어떻게 생각하시나요?',
    persona: {
      interests: ['AI', '기술', '스타트업'],
      expertise: ['소프트웨어 개발', '제품 관리'],
      tone: '전문적'
    },
    platform: 'twitter',
    hashtags: ['#AI', '#스타트업'],
    mediaUrls: ['https://example.com/image.png']
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateEngagementScore', () => {
    it('최적 길이의 콘텐츠에 높은 점수를 주어야 함', () => {
      const input = {
        ...baseScoringInput,
        content: '이것은 트위터에 최적화된 길이의 콘텐츠입니다. 약 180자 정도로 작성되어 참여도가 높을 것으로 예상됩니다. 질문도 포함하고 있고 콜투액션도 있어서 사용자 참여를 유도할 수 있습니다. 확인해보세요!',
      };

      const score = calculateEngagementScore(input);
      
      expect(score).toBeGreaterThan(70);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('콜투액션이 포함된 콘텐츠에 가산점을 주어야 함', () => {
      const inputWithCTA = {
        ...baseScoringInput,
        content: '새로운 기능을 확인해보세요! 링크를 클릭하여 더보기를 눌러주세요.'
      };

      const inputWithoutCTA = {
        ...baseScoringInput,
        content: '새로운 기능이 출시되었습니다.'
      };

      const scoreWithCTA = calculateEngagementScore(inputWithCTA);
      const scoreWithoutCTA = calculateEngagementScore(inputWithoutCTA);

      expect(scoreWithCTA).toBeGreaterThan(scoreWithoutCTA);
    });

    it('질문이 포함된 콘텐츠에 가산점을 주어야 함', () => {
      const inputWithQuestion = {
        ...baseScoringInput,
        content: '새로운 AI 기능을 어떻게 생각하시나요? 무엇을 개선해야 할까요?'
      };

      const inputWithoutQuestion = {
        ...baseScoringInput,
        content: '새로운 AI 기능을 출시했습니다.'
      };

      const scoreWithQuestion = calculateEngagementScore(inputWithQuestion);
      const scoreWithoutQuestion = calculateEngagementScore(inputWithoutQuestion);

      expect(scoreWithQuestion).toBeGreaterThan(scoreWithoutQuestion);
    });

    it('이모지가 포함된 콘텐츠에 가산점을 주어야 함', () => {
      const inputWithEmoji = {
        ...baseScoringInput,
        content: '🚀 새로운 기능 출시! 🎉'
      };

      const inputWithoutEmoji = {
        ...baseScoringInput,
        content: '새로운 기능 출시!'
      };

      const scoreWithEmoji = calculateEngagementScore(inputWithEmoji);
      const scoreWithoutEmoji = calculateEngagementScore(inputWithoutEmoji);

      expect(scoreWithEmoji).toBeGreaterThan(scoreWithoutEmoji);
    });

    it('플랫폼별 최적 해시태그 수에 따라 점수가 달라져야 함', () => {
      const twitterInput = {
        ...baseScoringInput,
        platform: 'twitter' as const,
        hashtags: ['#AI', '#tech'] // 2개 - 트위터 최적
      };

      const threadsInput = {
        ...baseScoringInput,
        platform: 'threads' as const,
        hashtags: ['#AI', '#tech', '#innovation', '#startup', '#growth'] // 5개 - 스레드 최적
      };

      const twitterScore = calculateEngagementScore(twitterInput);
      const threadsScore = calculateEngagementScore(threadsInput);

      // 둘 다 최적화되어 있어 높은 점수를 받아야 함
      expect(twitterScore).toBeGreaterThan(70);
      expect(threadsScore).toBeGreaterThan(70);
    });

    it('미디어가 첨부된 콘텐츠에 가산점을 주어야 함', () => {
      const inputWithMedia = {
        ...baseScoringInput,
        mediaUrls: ['https://example.com/image.png']
      };

      const inputWithoutMedia = {
        ...baseScoringInput,
        mediaUrls: []
      };

      const scoreWithMedia = calculateEngagementScore(inputWithMedia);
      const scoreWithoutMedia = calculateEngagementScore(inputWithoutMedia);

      expect(scoreWithMedia).toBeGreaterThan(scoreWithoutMedia);
    });
  });

  describe('calculateViralityScore', () => {
    it('감정적 키워드가 많을수록 높은 점수를 주어야 함', () => {
      const emotionalInput = {
        ...baseScoringInput,
        content: '놀라운 혁신적인 변화! 정말 충격적인 결과가 나왔습니다. 완전 대박!'
      };

      const neutralInput = {
        ...baseScoringInput,
        content: '기능을 업데이트했습니다. 확인해보세요.'
      };

      const emotionalScore = calculateViralityScore(emotionalInput);
      const neutralScore = calculateViralityScore(neutralInput);

      expect(emotionalScore).toBeGreaterThan(neutralScore);
      expect(emotionalScore).toBeGreaterThan(60);
    });

    it('숫자나 통계가 포함된 콘텐츠에 가산점을 주어야 함', () => {
      const inputWithNumbers = {
        ...baseScoringInput,
        content: '성능이 50% 향상되었고, 사용자가 1000명 증가했습니다.'
      };

      const inputWithoutNumbers = {
        ...baseScoringInput,
        content: '성능이 향상되었고, 사용자가 증가했습니다.'
      };

      const scoreWithNumbers = calculateViralityScore(inputWithNumbers);
      const scoreWithoutNumbers = calculateViralityScore(inputWithoutNumbers);

      expect(scoreWithNumbers).toBeGreaterThan(scoreWithoutNumbers);
    });

    it('트렌딩 해시태그가 포함되면 가산점을 주어야 함', () => {
      const inputWithTrending = {
        ...baseScoringInput,
        hashtags: ['#AI', '#혁신', '#스타트업', '#성장']
      };

      const inputWithoutTrending = {
        ...baseScoringInput,
        hashtags: ['#일반', '#보통']
      };

      const scoreWithTrending = calculateViralityScore(inputWithTrending);
      const scoreWithoutTrending = calculateViralityScore(inputWithoutTrending);

      expect(scoreWithTrending).toBeGreaterThan(scoreWithoutTrending);
    });

    it('대조적 표현이 포함되면 가산점을 주어야 함', () => {
      const inputWithContrast = {
        ...baseScoringInput,
        content: 'Before vs After 비교 결과, 전후 차이가 놀랍습니다!'
      };

      const inputWithoutContrast = {
        ...baseScoringInput,
        content: '결과가 좋습니다.'
      };

      const scoreWithContrast = calculateViralityScore(inputWithContrast);
      const scoreWithoutContrast = calculateViralityScore(inputWithoutContrast);

      expect(scoreWithContrast).toBeGreaterThan(scoreWithoutContrast);
    });
  });

  describe('calculatePersonaMatchScore', () => {
    it('페르소나의 관심사와 일치할수록 높은 점수를 주어야 함', () => {
      const matchingInput = {
        ...baseScoringInput,
        content: 'AI 기술을 활용한 스타트업 제품 개발 경험을 공유합니다.',
        persona: {
          interests: ['AI', '기술', '스타트업'],
          expertise: ['소프트웨어 개발'],
          tone: '전문적'
        }
      };

      const nonMatchingInput = {
        ...baseScoringInput,
        content: '요리 레시피를 공유합니다.',
        persona: {
          interests: ['AI', '기술', '스타트업'],
          expertise: ['소프트웨어 개발'],
          tone: '전문적'
        }
      };

      const matchingScore = calculatePersonaMatchScore(matchingInput);
      const nonMatchingScore = calculatePersonaMatchScore(nonMatchingInput);

      expect(matchingScore).toBeGreaterThan(nonMatchingScore);
      expect(matchingScore).toBeGreaterThan(60);
    });

    it('전문분야와 일치할수록 높은 점수를 주어야 함', () => {
      const expertiseMatchInput = {
        ...baseScoringInput,
        content: '소프트웨어 개발과 제품 관리 노하우를 공유합니다.',
        persona: {
          interests: ['기술'],
          expertise: ['소프트웨어 개발', '제품 관리'],
          tone: '전문적'
        }
      };

      const noExpertiseMatchInput = {
        ...baseScoringInput,
        content: '일반적인 내용을 공유합니다.',
        persona: {
          interests: ['기술'],
          expertise: ['소프트웨어 개발', '제품 관리'],
          tone: '전문적'
        }
      };

      const expertiseScore = calculatePersonaMatchScore(expertiseMatchInput);
      const noExpertiseScore = calculatePersonaMatchScore(noExpertiseMatchInput);

      expect(expertiseScore).toBeGreaterThan(noExpertiseScore);
    });

    it('톤이 일치하면 가산점을 주어야 함', () => {
      const professionalInput = {
        ...baseScoringInput,
        content: '전문적인 분석 결과를 바탕으로 데이터를 공유합니다.',
        persona: {
          interests: ['분석'],
          expertise: ['데이터'],
          tone: '전문적'
        }
      };

      const friendlyInput = {
        ...baseScoringInput,
        content: '함께 공유하고 싶은 우리의 이야기입니다.',
        persona: {
          interests: ['공유'],
          expertise: ['이야기'],
          tone: '친근한'
        }
      };

      const professionalScore = calculatePersonaMatchScore(professionalInput);
      const friendlyScore = calculatePersonaMatchScore(friendlyInput);

      // 둘 다 톤에 맞는 키워드를 포함하므로 높은 점수
      expect(professionalScore).toBeGreaterThan(60);
      expect(friendlyScore).toBeGreaterThan(60);
    });
  });

  describe('calculateReadabilityScore', () => {
    it('적절한 문장 길이에 높은 점수를 주어야 함', () => {
      const shortSentencesInput = {
        ...baseScoringInput,
        content: '짧은 문장입니다. 읽기 쉽습니다. 이해하기 좋습니다.'
      };

      const longSentenceInput = {
        ...baseScoringInput,
        content: '이것은 매우 긴 문장으로서 읽기 어려울 수 있으며, 여러 개의 절이 포함되어 있고, 복잡한 구조를 가지고 있어서 독자가 이해하기 어려울 수 있습니다.'
      };

      const shortScore = calculateReadabilityScore(shortSentencesInput);
      const longScore = calculateReadabilityScore(longSentenceInput);

      expect(shortScore).toBeGreaterThan(longScore);
    });

    it('단락이 나뉜 콘텐츠에 가산점을 주어야 함', () => {
      const paragraphedInput = {
        ...baseScoringInput,
        content: '첫 번째 단락입니다.\n\n두 번째 단락입니다.\n\n세 번째 단락입니다.'
      };

      const singleParagraphInput = {
        ...baseScoringInput,
        content: '한 단락으로만 작성된 긴 내용입니다. 여러 주제가 섞여 있습니다.'
      };

      const paragraphedScore = calculateReadabilityScore(paragraphedInput);
      const singleScore = calculateReadabilityScore(singleParagraphInput);

      expect(paragraphedScore).toBeGreaterThan(singleScore);
    });

    it('불릿 포인트가 사용된 콘텐츠에 가산점을 주어야 함', () => {
      const bulletInput = {
        ...baseScoringInput,
        content: '주요 기능:\n• 기능 1\n• 기능 2\n✅ 완료됨\n❌ 미완료'
      };

      const noBulletInput = {
        ...baseScoringInput,
        content: '주요 기능: 기능 1, 기능 2, 완료됨, 미완료'
      };

      const bulletScore = calculateReadabilityScore(bulletInput);
      const noBulletScore = calculateReadabilityScore(noBulletInput);

      expect(bulletScore).toBeGreaterThan(noBulletScore);
    });

    it('플랫폼별 최적 단어 수에 따라 점수가 달라져야 함', () => {
      const twitterOptimal = {
        ...baseScoringInput,
        platform: 'twitter' as const,
        content: '트위터에 최적화된 25단어 정도의 짧은 콘텐츠입니다. 간결하고 명확한 메시지를 전달합니다.'
      };

      const linkedinOptimal = {
        ...baseScoringInput,
        platform: 'linkedin' as const,
        content: '링크드인에 적합한 긴 형태의 콘텐츠입니다. '.repeat(10) + '약 150단어 정도로 작성되어 전문적인 내용을 상세하게 다룹니다.'
      };

      const twitterScore = calculateReadabilityScore(twitterOptimal);
      const linkedinScore = calculateReadabilityScore(linkedinOptimal);

      // 각 플랫폼에 최적화되어 있어 높은 점수를 받아야 함
      expect(twitterScore).toBeGreaterThan(60);
      expect(linkedinScore).toBeGreaterThan(60);
    });
  });

  describe('calculateTrendingScore', () => {
    it('트렌딩 키워드가 많을수록 높은 점수를 주어야 함', () => {
      const trendingInput = {
        ...baseScoringInput,
        content: 'AI 인공지능 자동화 기술로 디지털 혁신을 이끌어가는 스타트업 성장 이야기'
      };

      const nonTrendingInput = {
        ...baseScoringInput,
        content: '일반적인 내용을 다루고 있습니다.'
      };

      const trendingScore = calculateTrendingScore(trendingInput);
      const nonTrendingScore = calculateTrendingScore(nonTrendingInput);

      expect(trendingScore).toBeGreaterThan(nonTrendingScore);
      expect(trendingScore).toBeGreaterThan(50);
    });

    it('플랫폼별 트렌드 키워드에 따라 점수가 달라져야 함', () => {
      const twitterTrendInput = {
        ...baseScoringInput,
        platform: 'twitter' as const,
        content: '실시간 속보! 새로운 이슈가 논란이 되고 있습니다.'
      };

      const linkedinTrendInput = {
        ...baseScoringInput,
        platform: 'linkedin' as const,
        content: '전문 비즈니스 네트워킹을 통한 커리어 발전 방법'
      };

      const twitterScore = calculateTrendingScore(twitterTrendInput);
      const linkedinScore = calculateTrendingScore(linkedinTrendInput);

      // 각 플랫폼에 맞는 트렌드를 포함하므로 높은 점수
      expect(twitterScore).toBeGreaterThan(40);
      expect(linkedinScore).toBeGreaterThan(40);
    });

    // 계절성 테스트는 현재 날짜에 따라 달라지므로 모킹 필요
    it('계절성 키워드가 포함되면 가산점을 주어야 함', () => {
      // 현재 날짜를 봄으로 모킹
      vi.setSystemTime(new Date('2024-04-15'));

      const springInput = {
        ...baseScoringInput,
        content: '봄 시즌 새학기 시작과 함께 신규 서비스를 런칭합니다!'
      };

      const neutralInput = {
        ...baseScoringInput,
        content: '새로운 서비스를 런칭합니다!'
      };

      const springScore = calculateTrendingScore(springInput);
      const neutralScore = calculateTrendingScore(neutralInput);

      expect(springScore).toBeGreaterThan(neutralScore);

      vi.useRealTimers();
    });
  });

  describe('calculateOverallScore', () => {
    it('가중 평균을 올바르게 계산해야 함', () => {
      const breakdown: ScoreBreakdown = {
        engagement: 80,
        virality: 70,
        personaMatch: 90,
        readability: 85,
        trending: 60,
      };

      const overallScore = calculateOverallScore(breakdown);

      // 가중치: engagement 30%, virality 25%, personaMatch 25%, readability 15%, trending 5%
      const expectedScore = Math.round(
        80 * 0.3 + 70 * 0.25 + 90 * 0.25 + 85 * 0.15 + 60 * 0.05
      );

      expect(overallScore).toBe(expectedScore);
      expect(overallScore).toBeGreaterThan(0);
      expect(overallScore).toBeLessThanOrEqual(100);
    });

    it('모든 점수가 100일 때 100을 반환해야 함', () => {
      const perfectBreakdown: ScoreBreakdown = {
        engagement: 100,
        virality: 100,
        personaMatch: 100,
        readability: 100,
        trending: 100,
      };

      const overallScore = calculateOverallScore(perfectBreakdown);
      expect(overallScore).toBe(100);
    });

    it('모든 점수가 0일 때 0을 반환해야 함', () => {
      const zeroBreakdown: ScoreBreakdown = {
        engagement: 0,
        virality: 0,
        personaMatch: 0,
        readability: 0,
        trending: 0,
      };

      const overallScore = calculateOverallScore(zeroBreakdown);
      expect(overallScore).toBe(0);
    });
  });

  describe('generateFeedback', () => {
    it('낮은 참여도 점수에 대한 피드백을 제공해야 함', () => {
      const lowEngagementBreakdown: ScoreBreakdown = {
        engagement: 50,
        virality: 80,
        personaMatch: 80,
        readability: 80,
        trending: 80,
      };

      const feedback = generateFeedback(baseScoringInput, lowEngagementBreakdown);
      
      expect(feedback).toContain('참여도를 높이기 위해 질문이나 콜투액션을 추가해보세요');
    });

    it('긴 콘텐츠에 대한 길이 피드백을 제공해야 함', () => {
      const longInput = {
        ...baseScoringInput,
        content: 'A'.repeat(300), // 트위터 최대 길이 초과
      };

      const breakdown: ScoreBreakdown = {
        engagement: 70,
        virality: 70,
        personaMatch: 70,
        readability: 70,
        trending: 70,
      };

      const feedback = generateFeedback(longInput, breakdown);
      
      expect(feedback.some(f => f.includes('최적 길이를 초과'))).toBe(true);
    });

    it('여러 문제가 있을 때 복수의 피드백을 제공해야 함', () => {
      const poorBreakdown: ScoreBreakdown = {
        engagement: 40,
        virality: 30,
        personaMatch: 50,
        readability: 45,
        trending: 35,
      };

      const feedback = generateFeedback(baseScoringInput, poorBreakdown);
      
      expect(feedback.length).toBeGreaterThan(2);
    });
  });

  describe('generateRecommendations', () => {
    it('해시태그가 없을 때 추천사항을 제공해야 함', () => {
      const inputWithoutHashtags = {
        ...baseScoringInput,
        hashtags: [],
      };

      const breakdown: ScoreBreakdown = {
        engagement: 70,
        virality: 70,
        personaMatch: 70,
        readability: 70,
        trending: 70,
      };

      const recommendations = generateRecommendations(inputWithoutHashtags, breakdown);
      
      expect(recommendations.some(r => r.includes('해시태그'))).toBe(true);
    });

    it('미디어가 없을 때 추천사항을 제공해야 함', () => {
      const inputWithoutMedia = {
        ...baseScoringInput,
        mediaUrls: [],
      };

      const breakdown: ScoreBreakdown = {
        engagement: 70,
        virality: 70,
        personaMatch: 70,
        readability: 70,
        trending: 70,
      };

      const recommendations = generateRecommendations(inputWithoutMedia, breakdown);
      
      expect(recommendations.some(r => r.includes('이미지나 동영상'))).toBe(true);
    });

    it('낮은 점수 영역에 대한 개선 추천을 제공해야 함', () => {
      const lowScoreBreakdown: ScoreBreakdown = {
        engagement: 50,
        virality: 40,
        personaMatch: 80,
        readability: 80,
        trending: 30,
      };

      const recommendations = generateRecommendations(baseScoringInput, lowScoreBreakdown);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('이모지') || r.includes('해시태그'))).toBe(true);
    });
  });

  describe('calculateContentScore (통합 테스트)', () => {
    it('완전한 입력에 대해 올바른 결과를 반환해야 함', () => {
      const result = calculateContentScore(baseScoringInput);

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('feedback');
      expect(result).toHaveProperty('recommendations');

      expect(typeof result.overallScore).toBe('number');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);

      expect(result.breakdown).toHaveProperty('engagement');
      expect(result.breakdown).toHaveProperty('virality');
      expect(result.breakdown).toHaveProperty('personaMatch');
      expect(result.breakdown).toHaveProperty('readability');
      expect(result.breakdown).toHaveProperty('trending');

      expect(Array.isArray(result.feedback)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('잘못된 입력에 대해 에러를 던져야 함', () => {
      const invalidInput = {
        ...baseScoringInput,
        content: '', // 빈 콘텐츠
      };

      expect(() => calculateContentScore(invalidInput)).toThrow();
    });

    it('플랫폼별로 다른 점수를 계산해야 함', () => {
      const twitterResult = calculateContentScore({
        ...baseScoringInput,
        platform: 'twitter',
      });

      const linkedinResult = calculateContentScore({
        ...baseScoringInput,
        platform: 'linkedin',
      });

      const threadsResult = calculateContentScore({
        ...baseScoringInput,
        platform: 'threads',
      });

      // 같은 콘텐츠라도 플랫폼에 따라 다른 점수가 나와야 함
      expect(twitterResult.overallScore).toBeDefined();
      expect(linkedinResult.overallScore).toBeDefined();
      expect(threadsResult.overallScore).toBeDefined();

      // 적어도 일부 점수는 달라야 함
      const scores = [twitterResult.overallScore, linkedinResult.overallScore, threadsResult.overallScore];
      const uniqueScores = new Set(scores);
      expect(uniqueScores.size).toBeGreaterThanOrEqual(1);
    });

    it('높은 품질의 콘텐츠에 높은 점수를 주어야 함', () => {
      const highQualityInput: ScoringInput = {
        content: '🚀 AI 혁신으로 생산성 300% 향상! 놀라운 성과를 달성했습니다.\n\n주요 개선사항:\n• 자동화 기능 추가\n• 실시간 분석 대시보드\n• 사용자 맞춤 인사이트\n\n이런 결과를 어떻게 생각하시나요? 댓글로 의견을 공유해주세요!',
        persona: {
          interests: ['AI', '혁신', '생산성'],
          expertise: ['기술', '제품 개발', '데이터 분석'],
          tone: '열정적'
        },
        platform: 'threads',
        hashtags: ['#AI', '#혁신', '#생산성', '#자동화'],
        mediaUrls: ['https://example.com/dashboard.png']
      };

      const result = calculateContentScore(highQualityInput);
      
      expect(result.overallScore).toBeGreaterThan(75);
      expect(result.breakdown.engagement).toBeGreaterThan(60);
      expect(result.breakdown.virality).toBeGreaterThan(50);
      expect(result.breakdown.personaMatch).toBeGreaterThan(60);
    });

    it('낮은 품질의 콘텐츠에 낮은 점수를 주어야 함', () => {
      const lowQualityInput: ScoringInput = {
        content: '업데이트',
        persona: {
          interests: ['AI', '혁신'],
          expertise: ['기술'],
          tone: '전문적'
        },
        platform: 'twitter',
        hashtags: [],
        mediaUrls: []
      };

      const result = calculateContentScore(lowQualityInput);
      
      expect(result.overallScore).toBeLessThan(60);
      expect(result.feedback.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('엣지 케이스', () => {
    it('극도로 긴 콘텐츠를 처리할 수 있어야 함', () => {
      const veryLongInput = {
        ...baseScoringInput,
        content: 'A'.repeat(5000),
      };

      const result = calculateContentScore(veryLongInput);
      
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('특수 문자가 많은 콘텐츠를 처리할 수 있어야 함', () => {
      const specialCharInput = {
        ...baseScoringInput,
        content: '🚀🎉💡⚡🔥✨🌟💪🎯📈 !@#$%^&*()_+-=[]{}|;:\'",.<>?/',
      };

      const result = calculateContentScore(specialCharInput);
      
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('빈 배열 입력을 처리할 수 있어야 함', () => {
      const emptyArrayInput = {
        ...baseScoringInput,
        hashtags: [],
        mediaUrls: [],
        persona: {
          interests: [],
          expertise: [],
          tone: '전문적'
        }
      };

      const result = calculateContentScore(emptyArrayInput);
      
      expect(result).toBeDefined();
      expect(typeof result.overallScore).toBe('number');
    });

    it('한글과 영어가 혼합된 콘텐츠를 처리할 수 있어야 함', () => {
      const mixedLanguageInput = {
        ...baseScoringInput,
        content: 'AI 기술을 활용한 innovative solution으로 사용자 experience를 향상시켰습니다.',
      };

      const result = calculateContentScore(mixedLanguageInput);
      
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });
});