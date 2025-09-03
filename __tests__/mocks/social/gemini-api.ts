/**
 * Google Gemini AI API 모킹
 * AI 콘텐츠 생성 관련 기능 테스트용
 */

import { vi } from 'vitest';

// Gemini API 응답 모킹
export const mockGeminiResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: `🚀 새로운 기능을 출시했습니다!

사용자들이 요청했던 기능을 드디어 공개합니다. 더 나은 사용자 경험을 위한 혁신적인 업데이트입니다.

주요 개선사항:
✅ 직관적인 UI/UX 개선
✅ 성능 최적화 (50% 향상)
✅ 새로운 자동화 기능

#스타트업 #제품출시 #혁신 #사용자경험`
          }
        ]
      },
      finishReason: 'STOP',
      index: 0,
      safetyRatings: [
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          probability: 'NEGLIGIBLE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          probability: 'NEGLIGIBLE'
        }
      ]
    }
  ],
  usageMetadata: {
    promptTokenCount: 150,
    candidatesTokenCount: 200,
    totalTokenCount: 350
  }
};

// 변형 생성 응답들
export const mockVariantResponses = [
  {
    content: '🎉 오늘 큰 발표가 있습니다! 사용자들이 그토록 기다렸던 새 기능을 공개합니다.',
    score: 92
  },
  {
    content: '💡 혁신적인 업데이트를 선보입니다. 사용자 피드백을 바탕으로 완전히 새로워진 경험!',
    score: 88
  },
  {
    content: '🔥 게임 체인저가 될 새 기능 출시! 생산성이 2배 향상되는 마법을 경험해보세요.',
    score: 85
  },
  {
    content: '⚡ 빠르고 스마트해진 새 버전이 나왔어요. 직접 써보시고 놀라운 변화를 느껴보세요!',
    score: 90
  }
];

// Gemini API 클라이언트 모킹
export const mockGeminiClient = {
  generateContent: vi.fn().mockResolvedValue(mockGeminiResponse),
  generateContentStream: vi.fn(),
  embedContent: vi.fn(),
  batchEmbedContents: vi.fn(),
  countTokens: vi.fn().mockResolvedValue({ totalTokens: 150 })
};

// 점수 계산 모킹
export const mockScoreCalculation = {
  engagement: 85,
  virality: 78,
  personaMatch: 92,
  readability: 88,
  trending: 82,
  overall: 85
};

// 프롬프트 템플릿 모킹
export const mockPromptTemplates = {
  contentGeneration: `당신은 {persona}입니다. 
다음 주제에 대해 {tone} 톤으로 소셜 미디어 게시물을 작성해주세요:
주제: {topic}
플랫폼: {platforms}
관심사: {interests}
전문분야: {expertise}`,
  
  variantCreation: `다음 게시물의 변형을 5개 생성해주세요:
원본: {originalContent}
페르소나: {persona}
플랫폼: {platform}`,
  
  optimization: `다음 게시물을 최적화해주세요:
내용: {content}
목표: {goals}
타겟 오디언스: {audience}`
};

// API 에러 모킹
export const mockGeminiError = {
  code: 400,
  message: 'Invalid request: Missing required parameter',
  status: 'INVALID_ARGUMENT'
};

// 토큰 사용량 모킹
export const mockTokenUsage = {
  inputTokens: 120,
  outputTokens: 180,
  totalTokens: 300
};

// 안전성 등급 모킹
export const mockSafetyRatings = [
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    probability: 'NEGLIGIBLE'
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH', 
    probability: 'NEGLIGIBLE'
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    probability: 'NEGLIGIBLE'
  },
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    probability: 'NEGLIGIBLE'
  }
];

// 생성 설정 모킹
export const mockGenerationConfig = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
  stopSequences: []
};

// 모델 정보 모킹
export const mockModelInfo = {
  name: 'models/gemini-1.5-pro',
  version: '1.5',
  displayName: 'Gemini 1.5 Pro',
  description: 'Advanced multimodal model',
  inputTokenLimit: 1000000,
  outputTokenLimit: 8192,
  supportedGenerationMethods: ['generateContent', 'streamGenerateContent']
};