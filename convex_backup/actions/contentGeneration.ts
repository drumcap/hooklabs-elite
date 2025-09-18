"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// Gemini API 클라이언트 설정
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

interface GeminiRequest {
  contents: {
    parts: { text: string }[];
  }[];
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: {
    category: string;
    threshold: string;
  }[];
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
    finishReason: string;
    safetyRatings: {
      category: string;
      probability: string;
    }[];
  }[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// 콘텐츠 점수 계산 함수
function calculateContentScores(content: string, persona: any): {
  overallScore: number;
  scoreBreakdown: {
    engagement: number;
    virality: number;
    personaMatch: number;
    readability: number;
    trending: number;
  };
} {
  // 실제로는 더 정교한 알고리즘 구현
  // 여기서는 간단한 휴리스틱으로 구현

  const engagement = calculateEngagementScore(content);
  const virality = calculateViralityScore(content);
  const personaMatch = calculatePersonaMatchScore(content, persona);
  const readability = calculateReadabilityScore(content);
  const trending = calculateTrendingScore(content);

  const overallScore = Math.round(
    (engagement * 0.3 + virality * 0.25 + personaMatch * 0.25 + readability * 0.1 + trending * 0.1)
  );

  return {
    overallScore,
    scoreBreakdown: {
      engagement,
      virality,
      personaMatch,
      readability,
      trending,
    },
  };
}

function calculateEngagementScore(content: string): number {
  let score = 50; // 기본 점수

  // 질문 포함 여부 (+15점)
  if (content.includes("?") || content.match(/어떻게|왜|언제|어디서|무엇을|어떤/)) {
    score += 15;
  }

  // 감정표현 이모지 (+10점)
  if (content.match(/[🚀💡🔥✨🎯👍💪]/)) {
    score += 10;
  }

  // Call-to-Action 포함 (+10점)
  if (content.match(/댓글로|공유해|생각해|의견을|경험을/)) {
    score += 10;
  }

  // 적절한 길이 (100-280자) (+5점)
  if (content.length >= 100 && content.length <= 280) {
    score += 5;
  }

  // 해시태그 포함 (+5점)
  if (content.includes("#")) {
    score += 5;
  }

  return Math.min(100, score);
}

function calculateViralityScore(content: string): number {
  let score = 40; // 기본 점수

  // 트렌딩 키워드 (+20점)
  const trendingKeywords = ["AI", "ChatGPT", "자동화", "생산성", "스타트업", "개발자"];
  const foundTrends = trendingKeywords.filter(keyword => 
    content.toLowerCase().includes(keyword.toLowerCase())
  );
  score += Math.min(20, foundTrends.length * 5);

  // 숫자나 통계 포함 (+15점)
  if (content.match(/\d+%|\d+배|\d+개|\d+시간/)) {
    score += 15;
  }

  // 놀라운/충격적인 표현 (+10점)
  if (content.match(/놀라운|충격적인|믿을 수 없는|대박|완전/)) {
    score += 10;
  }

  // 대조/비교 표현 (+10점)
  if (content.match(/vs|비교|차이|전후|이전/)) {
    score += 10;
  }

  return Math.min(100, score);
}

function calculatePersonaMatchScore(content: string, persona: any): number {
  let score = 50; // 기본 점수

  // 페르소나의 관심사와 매치 (+25점)
  const interests = persona?.interests || [];
  const matchedInterests = interests.filter((interest: string) =>
    content.toLowerCase().includes(interest.toLowerCase())
  );
  score += Math.min(25, matchedInterests.length * 8);

  // 페르소나의 전문분야와 매치 (+25점)
  const expertise = persona?.expertise || [];
  const matchedExpertise = expertise.filter((expert: string) =>
    content.toLowerCase().includes(expert.toLowerCase())
  );
  score += Math.min(25, matchedExpertise.length * 8);

  // 톤 매치 확인
  const tone = persona?.tone || "";
  if (tone === "전문적" && content.match(/분석|연구|데이터|결과|효과/)) {
    score += 10;
  } else if (tone === "친근한" && content.match(/여러분|우리|함께|같이/)) {
    score += 10;
  } else if (tone === "유머러스" && content.match(/ㅋㅋ|재미있는|웃긴|농담/)) {
    score += 10;
  }

  return Math.min(100, score);
}

function calculateReadabilityScore(content: string): number {
  let score = 70; // 기본 점수

  // 적절한 문장 길이
  const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 0);
  const avgSentenceLength = content.length / sentences.length;
  
  if (avgSentenceLength > 50 && avgSentenceLength < 100) {
    score += 15;
  } else if (avgSentenceLength > 100) {
    score -= 10;
  }

  // 문단 구성 (줄바꿈 사용)
  if (content.includes("\n")) {
    score += 10;
  }

  // 너무 긴 텍스트 페널티
  if (content.length > 500) {
    score -= 15;
  }

  return Math.min(100, Math.max(0, score));
}

function calculateTrendingScore(content: string): number {
  let score = 30; // 기본 점수

  // 현재 트렌드 키워드들 (실제로는 외부 API에서 가져와야 함)
  const currentTrends = ["GPT-4", "멀티모달", "RAG", "Agent", "자동화", "개발자도구"];
  const foundTrends = currentTrends.filter(trend => 
    content.toLowerCase().includes(trend.toLowerCase())
  );
  score += foundTrends.length * 15;

  // 시의성 있는 표현
  if (content.match(/최신|새로운|2024년|올해|최근|트렌드/)) {
    score += 20;
  }

  return Math.min(100, score);
}

// AI 콘텐츠 변형 생성
export const generateVariants = action({
  args: {
    userId: v.id("users"),
    postId: v.id("socialPosts"),
    personaId: v.id("personas"),
    originalContent: v.string(),
    platforms: v.array(v.string()),
    variantCount: v.optional(v.number()),
  },
  handler: async (ctx, { userId, postId, personaId, originalContent, platforms, variantCount = 5 }): Promise<{
    success: boolean;
    variantIds: string[];
    creditsUsed: number;
    totalVariants: number;
  }> => {
    // 페르소나 정보 가져오기 (내부 쿼리 사용)
    const persona = await ctx.runQuery(internal.personas.getByUserIdInternal, { 
      userId,
      personaId 
    });
    if (!persona) {
      throw new Error("페르소나를 찾을 수 없습니다");
    }

    // 크레딧 확인 및 차감
    const creditsPerVariant = 2; // 변형 1개당 2크레딧
    const totalCreditsNeeded = variantCount * creditsPerVariant;
    
    // 크레딧 차감 실행
    await ctx.runMutation(internal.credits.useCreditsInternal, { 
      userId, 
      amount: totalCreditsNeeded,
      description: `AI 콘텐츠 변형 생성 (${variantCount}개)`
    });

    // 중앙화된 config 사용 (서버 사이드에서는 직접 process.env 접근 필요)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API 키가 설정되지 않았습니다");
    }

    // 플랫폼별 특성을 고려한 프롬프트 생성
    const platformConstraints = platforms.map(platform => {
      switch (platform) {
        case "twitter":
          return "트위터용 (280자 이내, 해시태그 1-3개)";
        case "threads":
          return "쓰레드용 (500자 이내, 여러 문단 가능)";
        case "linkedin":
          return "링크드인용 (전문적인 톤, 1000자 이내)";
        default:
          return "일반 소셜 미디어용";
      }
    }).join(", ");

    const systemPrompt = persona.promptTemplates?.system || 
      `당신은 ${persona.role} 역할을 하는 ${persona.name}입니다. ${persona.tone} 톤으로 소통하며, ${persona.interests.join(", ")}에 관심이 있고 ${persona.expertise.join(", ")} 분야의 전문성을 가지고 있습니다.`;

    const prompt = `
${systemPrompt}

다음 원본 내용을 바탕으로 ${variantCount}개의 다양한 변형 게시물을 생성해주세요.

원본 내용: "${originalContent}"

플랫폼: ${platformConstraints}

요구사항:
1. 각 변형은 서로 다른 관점이나 접근 방식을 사용해주세요
2. 적절한 이모지와 해시태그를 포함해주세요
3. 독자의 관심을 끌 수 있는 매력적인 내용으로 작성해주세요
4. 페르소나의 톤과 전문성을 반영해주세요
5. 각 변형 사이에 "---"로 구분해주세요

변형 ${variantCount}개를 생성해주세요:
`;

    const geminiRequest: GeminiRequest = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.9,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      }
    };

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API 오류: ${errorData.error?.message || response.statusText}`);
      }

      const geminiResponse: GeminiResponse = await response.json();
      
      if (!geminiResponse.candidates || geminiResponse.candidates.length === 0) {
        throw new Error("Gemini로부터 응답을 받을 수 없습니다");
      }

      const generatedText = geminiResponse.candidates[0].content.parts[0].text;
      const variants = generatedText.split('---').map(v => v.trim()).filter(v => v.length > 0);

      // AI 생성 이력 기록
      await ctx.runMutation(api.aiGenerations.create, {
        userId: persona.userId,
        postId,
        personaId,
        type: "variant_creation",
        prompt,
        response: generatedText,
        model: "gemini-1.5-pro",
        creditsUsed: totalCreditsNeeded,
        generationTime: 0, // TODO: 실제 시간 측정
        inputTokens: geminiResponse.usageMetadata.promptTokenCount,
        outputTokens: geminiResponse.usageMetadata.candidatesTokenCount,
        temperature: 0.9,
        success: true,
      });

      // 각 변형에 대해 점수 계산하고 데이터베이스에 저장
      const variantIds = [];
      
      for (let i = 0; i < Math.min(variants.length, variantCount); i++) {
        const content = variants[i];
        const scores = calculateContentScores(content, persona);
        
        const variantId: Id<"postVariants"> = await ctx.runMutation(api.postVariants.create, {
          postId,
          content,
          overallScore: scores.overallScore,
          scoreBreakdown: scores.scoreBreakdown,
          aiModel: "gemini-1.5-pro",
          promptUsed: prompt,
          generationMetadata: {
            temperature: 0.9,
            inputTokens: Math.floor(geminiResponse.usageMetadata.promptTokenCount / variants.length),
            outputTokens: Math.floor(geminiResponse.usageMetadata.candidatesTokenCount / variants.length),
            variantIndex: i,
          },
          creditsUsed: creditsPerVariant,
        });

        variantIds.push(variantId);
      }

      // 게시물 상태 업데이트 (creditsUsed는 별도 처리)
      await ctx.runMutation(api.socialPosts.update, {
        id: postId,
        status: "generated",
      });
      
      // TODO: 크레딧 사용량은 별도 테이블에서 관리 필요
      // creditsUsed: totalCreditsNeeded는 socialPosts 스키마에 없음

      return {
        success: true,
        variantIds,
        creditsUsed: totalCreditsNeeded,
        totalVariants: variantIds.length,
      };

    } catch (error) {
      // 에러 로깅
      await ctx.runMutation(api.aiGenerations.create, {
        userId: persona.userId,
        postId,
        personaId,
        type: "variant_creation",
        prompt,
        response: "",
        model: "gemini-1.5-pro",
        creditsUsed: 0,
        generationTime: 0,
        success: false,
        errorMessage: error instanceof Error ? error.message : "알 수 없는 오류",
      });

      throw error;
    }
  },
});

// 통합 콘텐츠 생성 플로우 (초안 생성 + 변형 생성)
export const createPostWithVariants = action({
  args: {
    userId: v.id("users"),
    personaId: v.id("personas"),
    originalContent: v.string(),
    platforms: v.array(v.string()),
    hashtags: v.optional(v.array(v.string())),
    mediaUrls: v.optional(v.array(v.string())),
    threadCount: v.optional(v.number()),
    variantCount: v.optional(v.number()),
    generateVariants: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    postId: string;
    variantIds?: string[];
    creditsUsed: number;
    message: string;
  }> => {
    const { 
      userId, 
      personaId, 
      originalContent, 
      platforms, 
      hashtags, 
      mediaUrls, 
      threadCount,
      variantCount = 5,
      generateVariants: shouldGenerateVariants = true 
    } = args;

    try {
      // 1. 페르소나 검증
      const persona = await ctx.runQuery(internal.personas.getByUserIdInternal, { 
        userId,
        personaId 
      });
      if (!persona) {
        throw new Error("페르소나를 찾을 수 없습니다");
      }

      // 2. 초안 게시물 생성
      const postId = await ctx.runMutation(internal.socialPosts.createInternal, {
        userId,
        personaId,
        originalContent,
        finalContent: originalContent, // 초기에는 원본과 동일
        platforms,
        hashtags,
        mediaUrls,
        threadCount,
      });

      if (!postId) {
        throw new Error("게시물 생성에 실패했습니다");
      }

      // 3. 변형 생성 (선택적)
      let variantIds: string[] = [];
      let totalCreditsUsed = 0;

      if (shouldGenerateVariants) {
        try {
          // generateVariants 액션을 직접 호출
          const variantResult = await ctx.runAction(api.actions.contentGeneration.generateVariants, {
            userId,
            postId: postId as Id<"socialPosts">,
            personaId,
            originalContent,
            platforms,
            variantCount,
          });
          
          variantIds = variantResult.variantIds;
          totalCreditsUsed = variantResult.creditsUsed;
        } catch (variantError) {
          console.error("변형 생성 중 오류:", variantError);
          // 변형 생성 실패해도 초안은 생성되었으므로 부분 성공으로 처리
          return {
            success: true,
            postId: postId.toString(),
            variantIds: [],
            creditsUsed: 0,
            message: `초안은 생성되었으나 변형 생성에 실패했습니다: ${(variantError as Error).message}`,
          };
        }
      }

      return {
        success: true,
        postId: postId.toString(),
        variantIds,
        creditsUsed: totalCreditsUsed,
        message: shouldGenerateVariants 
          ? `게시물과 ${variantIds.length}개의 변형이 성공적으로 생성되었습니다`
          : "게시물 초안이 성공적으로 생성되었습니다",
      };
    } catch (error) {
      console.error("게시물 생성 중 오류:", error);
      return {
        success: false,
        postId: "",
        variantIds: [],
        creditsUsed: 0,
        message: `게시물 생성 실패: ${(error as Error).message}`,
      };
    }
  },
});

// 단일 콘텐츠 최적화
export const optimizeContent = action({
  args: {
    content: v.string(),
    personaId: v.id("personas"),
    platform: v.string(),
    optimizationGoal: v.string(), // "engagement", "virality", "readability"
  },
  handler: async (ctx, { content, personaId, platform, optimizationGoal }) => {
    const persona = await ctx.runQuery(api.personas.get, { id: personaId });
    if (!persona) {
      throw new Error("페르소나를 찾을 수 없습니다");
    }

    // 중앙화된 config 사용 (서버 사이드에서는 직접 process.env 접근 필요)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API 키가 설정되지 않았습니다");
    }

    const systemPrompt = persona.promptTemplates?.system || 
      `당신은 ${persona.role} 역할을 하는 ${persona.name}입니다.`;

    const goalDescriptions = {
      engagement: "참여도를 높이기 위해 질문을 포함하고 독자와 상호작용을 유도",
      virality: "바이럴 가능성을 높이기 위해 공유하고 싶은 매력적인 내용으로 작성",
      readability: "가독성을 높이기 위해 명확하고 이해하기 쉬운 문장으로 작성"
    };

    const prompt = `
${systemPrompt}

다음 게시물을 ${platform} 플랫폼에 최적화하여 ${goalDescriptions[optimizationGoal as keyof typeof goalDescriptions]}해주세요.

원본 내용: "${content}"

최적화 목표: ${optimizationGoal}
플랫폼: ${platform}

최적화된 버전을 제공해주세요:
`;

    const geminiRequest: GeminiRequest = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 1024,
      }
    };

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiRequest),
      });

      if (!response.ok) {
        throw new Error(`Gemini API 오류: ${response.statusText}`);
      }

      const geminiResponse: GeminiResponse = await response.json();
      const optimizedContent = geminiResponse.candidates[0].content.parts[0].text;

      const scores = calculateContentScores(optimizedContent, persona);

      // AI 생성 이력 기록
      await ctx.runMutation(api.aiGenerations.create, {
        userId: persona.userId,
        personaId,
        type: "optimization",
        prompt,
        response: optimizedContent,
        model: "gemini-1.5-pro",
        creditsUsed: 3, // 최적화는 3크레딧
        generationTime: 0,
        inputTokens: geminiResponse.usageMetadata.promptTokenCount,
        outputTokens: geminiResponse.usageMetadata.candidatesTokenCount,
        temperature: 0.7,
        success: true,
      });

      return {
        optimizedContent,
        scores,
        originalContent: content,
        creditsUsed: 3,
      };

    } catch (error) {
      throw error;
    }
  },
});