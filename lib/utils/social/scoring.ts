/**
 * 소셜 미디어 게시물 점수 계산 유틸리티
 * AI 생성 변형의 품질을 평가하는 알고리즘들
 */

import { z } from 'zod';

// 점수 계산 입력 스키마
export const ScoringInputSchema = z.object({
  content: z.string().min(1, '콘텐츠는 필수입니다'),
  persona: z.object({
    interests: z.array(z.string()),
    expertise: z.array(z.string()),
    tone: z.string(),
  }),
  platform: z.enum(['twitter', 'threads', 'linkedin']),
  hashtags: z.array(z.string()).optional(),
  mediaUrls: z.array(z.string()).optional(),
});

export type ScoringInput = z.infer<typeof ScoringInputSchema>;

// 점수 결과 타입
export interface ScoreBreakdown {
  engagement: number;      // 참여도 예측 점수 (0-100)
  virality: number;        // 바이럴 가능성 점수 (0-100)
  personaMatch: number;    // 페르소나 일치도 점수 (0-100)
  readability: number;     // 가독성 점수 (0-100)
  trending: number;        // 트렌드 적합도 점수 (0-100)
}

export interface ScoringResult {
  overallScore: number;
  breakdown: ScoreBreakdown;
  feedback: string[];
  recommendations: string[];
}

// 플랫폼별 최적 길이 기준
const PLATFORM_OPTIMAL_LENGTHS = {
  twitter: { min: 100, max: 240, optimal: 180 },
  threads: { min: 150, max: 400, optimal: 300 },
  linkedin: { min: 300, max: 1200, optimal: 800 },
} as const;

// 참여도 점수 계산
export function calculateEngagementScore(input: ScoringInput): number {
  const { content, platform, hashtags = [], mediaUrls = [] } = input;
  let score = 50; // 기본 점수

  // 길이 최적화 점수 (30점 만점)
  const lengthLimits = PLATFORM_OPTIMAL_LENGTHS[platform];
  const contentLength = content.length;
  
  if (contentLength >= lengthLimits.min && contentLength <= lengthLimits.max) {
    const distanceFromOptimal = Math.abs(contentLength - lengthLimits.optimal);
    const maxDistance = Math.max(lengthLimits.optimal - lengthLimits.min, lengthLimits.max - lengthLimits.optimal);
    const lengthScore = 30 * (1 - distanceFromOptimal / maxDistance);
    score += lengthScore;
  }

  // 콜투액션 존재 (10점)
  const ctaKeywords = ['확인', '방문', '댓글', '공유', '클릭', '링크', '더보기'];
  if (ctaKeywords.some(keyword => content.includes(keyword))) {
    score += 10;
  }

  // 질문 포함 (10점)
  if (content.includes('?') || content.includes('어떻게') || content.includes('무엇을')) {
    score += 10;
  }

  // 이모지 사용 (5점)
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  if (emojiRegex.test(content)) {
    score += 5;
  }

  // 해시태그 최적화 (5점)
  const optimalHashtagCount = platform === 'twitter' ? 2 : platform === 'threads' ? 5 : 3;
  if (hashtags.length > 0 && hashtags.length <= optimalHashtagCount) {
    score += 5;
  }

  // 미디어 첨부 (10점)
  if (mediaUrls.length > 0) {
    score += 10;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

// 바이럴 가능성 점수 계산
export function calculateViralityScore(input: ScoringInput): number {
  const { content, hashtags = [] } = input;
  let score = 30; // 기본 점수

  // 감정적 키워드 (25점 만점)
  const emotionalWords = [
    '놀라운', '충격적인', '혁신적인', '감동적인', '대박', '헉', '와',
    '최고', '완전', '진짜', '레전드', '미쳤다', '사랑', '행복',
    '성공', '실패', '극복', '도전', '변화', '성장'
  ];
  
  const emotionalWordCount = emotionalWords.filter(word => 
    content.includes(word)
  ).length;
  score += Math.min(25, emotionalWordCount * 5);

  // 숫자/통계 포함 (15점)
  const hasNumbers = /\d+%|\d+배|\d+\$|\d+원|\d+명|\d+개/.test(content);
  if (hasNumbers) {
    score += 15;
  }

  // 트렌드 해시태그 (20점)
  const trendingHashtags = [
    'AI', '혁신', '스타트업', '성장', '마케팅', '개발',
    '디자인', '트렌드', '인사이트', '팁', '성공'
  ];
  
  const trendingHashtagCount = hashtags.filter(tag => 
    trendingHashtags.some(trending => 
      tag.toLowerCase().includes(trending.toLowerCase())
    )
  ).length;
  score += Math.min(20, trendingHashtagCount * 5);

  // 대조적/비교적 표현 (10점)
  const contrastWords = ['vs', '대비', '비교', '차이', '전후', 'Before', 'After'];
  if (contrastWords.some(word => content.includes(word))) {
    score += 10;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

// 페르소나 일치도 점수 계산  
export function calculatePersonaMatchScore(input: ScoringInput): number {
  const { content, persona } = input;
  let score = 40; // 기본 점수

  // 관심사 키워드 매칭 (30점 만점)
  const interestMatches = persona.interests.filter(interest => 
    content.toLowerCase().includes(interest.toLowerCase())
  ).length;
  score += Math.min(30, interestMatches * 10);

  // 전문분야 키워드 매칭 (20점 만점)
  const expertiseMatches = persona.expertise.filter(expertise => 
    content.toLowerCase().includes(expertise.toLowerCase())
  ).length;
  score += Math.min(20, expertiseMatches * 7);

  // 톤 일치도 (10점)
  const toneKeywords = {
    '전문적': ['전문', '분석', '연구', '데이터', '결과'],
    '친근한': ['함께', '우리', '여러분', '공유', '이야기'],
    '열정적': ['열정', '도전', '최고', '완전', '정말'],
    '유머러스': ['ㅋㅋ', 'ㅎㅎ', '재밌', '웃긴', '농담']
  };

  const toneWords = toneKeywords[persona.tone as keyof typeof toneKeywords] || [];
  if (toneWords.some(word => content.includes(word))) {
    score += 10;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

// 가독성 점수 계산
export function calculateReadabilityScore(input: ScoringInput): number {
  const { content, platform } = input;
  let score = 50; // 기본 점수

  // 문장 길이 분석 (20점)
  const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((sum, sentence) => 
    sum + sentence.length, 0) / sentences.length;
    
  if (avgSentenceLength < 50) { // 적절한 문장 길이
    score += 20;
  } else if (avgSentenceLength < 80) {
    score += 10;
  }

  // 단락 구분 (15점)
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
  if (paragraphs.length > 1) {
    score += 15;
  }

  // 불릿 포인트 사용 (10점)
  if (/[•·▪▫◦‣⁃]|[1-9]\.|✅|❌/.test(content)) {
    score += 10;
  }

  // 적절한 공백 사용 (5점)
  const hasProperSpacing = content.includes('\n') && !content.includes('\n\n\n');
  if (hasProperSpacing) {
    score += 5;
  }

  // 플랫폼별 최적화 (10점)
  const wordCount = content.split(/\s+/).length;
  const optimalWordCount = platform === 'twitter' ? 25 : 
                           platform === 'threads' ? 50 : 150;
                           
  if (Math.abs(wordCount - optimalWordCount) < optimalWordCount * 0.3) {
    score += 10;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

// 트렌드 적합도 점수 계산
export function calculateTrendingScore(input: ScoringInput): number {
  const { content, hashtags = [], platform } = input;
  let score = 30; // 기본 점수

  // 현재 트렌드 키워드 (30점 만점)
  const trendingKeywords = [
    'AI', '인공지능', '자동화', '디지털', '온라인', '리모트',
    '지속가능', '친환경', '웰빙', '성장', '혁신', '창업',
    '마케팅', '브랜딩', 'SNS', '인플루언서', '콘텐츠'
  ];
  
  const trendingWordCount = trendingKeywords.filter(keyword => 
    content.toLowerCase().includes(keyword.toLowerCase())
  ).length;
  score += Math.min(30, trendingWordCount * 5);

  // 계절성/시기적절성 (20점)
  const currentMonth = new Date().getMonth();
  const seasonalKeywords = {
    spring: ['봄', '새학기', '시작', '신규'],
    summer: ['여름', '휴가', '더위'],
    autumn: ['가을', '추석', '추수', '성과'],
    winter: ['겨울', '연말', '정산', '계획']
  };
  
  // 간단한 계절 판별 (3-5월: 봄, 6-8월: 여름, 9-11월: 가을, 12-2월: 겨울)
  let season: keyof typeof seasonalKeywords = 'spring';
  if (currentMonth >= 5 && currentMonth <= 7) season = 'summer';
  else if (currentMonth >= 8 && currentMonth <= 10) season = 'autumn';  
  else if (currentMonth >= 11 || currentMonth <= 1) season = 'winter';

  if (seasonalKeywords[season].some(keyword => content.includes(keyword))) {
    score += 20;
  }

  // 플랫폼별 트렌드 (20점)
  const platformTrends = {
    twitter: ['실시간', '속보', '논란', '이슈'],
    threads: ['일상', '공유', '스토리', '경험'], 
    linkedin: ['전문', '비즈니스', '네트워킹', '커리어']
  };

  if (platformTrends[platform].some(trend => content.includes(trend))) {
    score += 20;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

// 전체 점수 계산
export function calculateOverallScore(breakdown: ScoreBreakdown): number {
  const weights = {
    engagement: 0.3,
    virality: 0.25,
    personaMatch: 0.25,
    readability: 0.15,
    trending: 0.05,
  };

  const weightedSum = Object.entries(breakdown).reduce((sum, [key, value]) => {
    const weight = weights[key as keyof ScoreBreakdown] || 0;
    return sum + (value * weight);
  }, 0);

  return Math.round(weightedSum);
}

// 피드백 생성
export function generateFeedback(input: ScoringInput, breakdown: ScoreBreakdown): string[] {
  const feedback: string[] = [];
  const { content, platform } = input;

  if (breakdown.engagement < 60) {
    feedback.push('참여도를 높이기 위해 질문이나 콜투액션을 추가해보세요');
  }

  if (breakdown.virality < 50) {
    feedback.push('바이럴 가능성을 높이기 위해 감정적인 요소나 놀라운 사실을 포함해보세요');
  }

  if (breakdown.personaMatch < 70) {
    feedback.push('페르소나의 관심사와 전문분야를 더 많이 반영해보세요');
  }

  if (breakdown.readability < 70) {
    feedback.push('가독성 향상을 위해 문단을 나누고 불릿 포인트를 활용해보세요');
  }

  const lengthLimits = PLATFORM_OPTIMAL_LENGTHS[platform];
  if (content.length > lengthLimits.max) {
    feedback.push(`${platform} 최적 길이를 초과했습니다. ${lengthLimits.optimal}자 내외로 조정해보세요`);
  }

  return feedback;
}

// 개선 추천사항 생성
export function generateRecommendations(input: ScoringInput, breakdown: ScoreBreakdown): string[] {
  const recommendations: string[] = [];
  const { hashtags = [], mediaUrls = [] } = input;

  if (breakdown.engagement < 80) {
    recommendations.push('이모지와 해시태그를 활용하여 시각적 매력도를 높여보세요');
  }

  if (breakdown.virality < 60) {
    recommendations.push('통계나 수치를 포함하여 신뢰성을 높여보세요');
  }

  if (hashtags.length === 0) {
    recommendations.push('관련 해시태그를 2-3개 추가하여 도달 범위를 넓혀보세요');
  }

  if (mediaUrls.length === 0) {
    recommendations.push('이미지나 동영상을 첨부하여 참여도를 높여보세요');
  }

  if (breakdown.trending < 70) {
    recommendations.push('현재 트렌드에 맞는 키워드를 포함해보세요');
  }

  return recommendations;
}

// 메인 점수 계산 함수
export function calculateContentScore(input: ScoringInput): ScoringResult {
  // 입력 검증
  const validatedInput = ScoringInputSchema.parse(input);

  // 각 항목별 점수 계산
  const breakdown: ScoreBreakdown = {
    engagement: calculateEngagementScore(validatedInput),
    virality: calculateViralityScore(validatedInput),
    personaMatch: calculatePersonaMatchScore(validatedInput),
    readability: calculateReadabilityScore(validatedInput),
    trending: calculateTrendingScore(validatedInput),
  };

  // 전체 점수 계산
  const overallScore = calculateOverallScore(breakdown);

  // 피드백과 추천사항 생성
  const feedback = generateFeedback(validatedInput, breakdown);
  const recommendations = generateRecommendations(validatedInput, breakdown);

  return {
    overallScore,
    breakdown,
    feedback,
    recommendations,
  };
}