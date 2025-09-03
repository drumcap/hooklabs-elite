/**
 * 소셜 미디어 콘텐츠 검증 유틸리티
 * 플랫폼별 제한사항 및 콘텐츠 품질 검증
 */

import { z } from 'zod';

// 플랫폼별 제한사항
export const PLATFORM_LIMITS = {
  twitter: {
    maxTextLength: 280,
    maxThreadLength: 25,
    maxMediaCount: 4,
    maxHashtags: 10,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxVideoSize: 512 * 1024 * 1024, // 512MB
    maxVideoDuration: 140, // seconds
  },
  threads: {
    maxTextLength: 500,
    maxThreadLength: 10,
    maxMediaCount: 10,
    maxHashtags: 30,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'],
    maxImageSize: 8 * 1024 * 1024, // 8MB
    maxVideoSize: 100 * 1024 * 1024, // 100MB
    maxVideoDuration: 300, // seconds
  },
  linkedin: {
    maxTextLength: 3000,
    maxThreadLength: 1, // LinkedIn doesn't support threads
    maxMediaCount: 9,
    maxHashtags: 10,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    maxImageSize: 20 * 1024 * 1024, // 20MB
    maxVideoSize: 5 * 1024 * 1024 * 1024, // 5GB
    maxVideoDuration: 600, // seconds
  },
} as const;

// 검증 입력 스키마
export const ValidationInputSchema = z.object({
  content: z.string(),
  platform: z.enum(['twitter', 'threads', 'linkedin']),
  hashtags: z.array(z.string()).optional(),
  mediaUrls: z.array(z.string()).optional(),
  threadCount: z.number().optional(),
});

export type ValidationInput = z.infer<typeof ValidationInputSchema>;

// 검증 결과 타입
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  limit?: number;
  current?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions: string[];
}

// 텍스트 길이 검증
export function validateTextLength(content: string, platform: keyof typeof PLATFORM_LIMITS): ValidationError[] {
  const errors: ValidationError[] = [];
  const limit = PLATFORM_LIMITS[platform].maxTextLength;
  const currentLength = content.length;

  if (currentLength > limit) {
    errors.push({
      field: 'content',
      message: `텍스트 길이가 ${platform}의 제한인 ${limit}자를 ${currentLength - limit}자 초과했습니다`,
      severity: 'error',
      limit,
      current: currentLength,
    });
  }

  // 경고 수준 (80% 이상)
  const warningThreshold = Math.floor(limit * 0.8);
  if (currentLength > warningThreshold && currentLength <= limit) {
    errors.push({
      field: 'content',
      message: `텍스트 길이가 제한의 80%를 초과했습니다 (${currentLength}/${limit}자)`,
      severity: 'warning',
      limit,
      current: currentLength,
    });
  }

  return errors;
}

// 해시태그 검증
export function validateHashtags(hashtags: string[], platform: keyof typeof PLATFORM_LIMITS): ValidationError[] {
  const errors: ValidationError[] = [];
  const limit = PLATFORM_LIMITS[platform].maxHashtags;
  
  if (hashtags.length > limit) {
    errors.push({
      field: 'hashtags',
      message: `해시태그 개수가 ${platform}의 제한인 ${limit}개를 ${hashtags.length - limit}개 초과했습니다`,
      severity: 'error',
      limit,
      current: hashtags.length,
    });
  }

  // 해시태그 형식 검증
  hashtags.forEach((hashtag, index) => {
    if (!hashtag.startsWith('#')) {
      errors.push({
        field: `hashtags[${index}]`,
        message: `해시태그는 #으로 시작해야 합니다: "${hashtag}"`,
        severity: 'error',
      });
    }

    if (hashtag.length > 100) {
      errors.push({
        field: `hashtags[${index}]`,
        message: `해시태그가 너무 깁니다 (최대 100자): "${hashtag}"`,
        severity: 'error',
      });
    }

    if (!/^#[\w가-힣\u4e00-\u9fff]+$/u.test(hashtag)) {
      errors.push({
        field: `hashtags[${index}]`,
        message: `해시태그에 허용되지 않는 문자가 포함되어 있습니다: "${hashtag}"`,
        severity: 'warning',
      });
    }
  });

  // 중복 해시태그 검증
  const uniqueHashtags = new Set(hashtags.map(tag => tag.toLowerCase()));
  if (uniqueHashtags.size < hashtags.length) {
    errors.push({
      field: 'hashtags',
      message: '중복된 해시태그가 있습니다',
      severity: 'warning',
    });
  }

  return errors;
}

// 미디어 검증 (URL 기반)
export function validateMedia(mediaUrls: string[], platform: keyof typeof PLATFORM_LIMITS): ValidationError[] {
  const errors: ValidationError[] = [];
  const limits = PLATFORM_LIMITS[platform];

  if (mediaUrls.length > limits.maxMediaCount) {
    errors.push({
      field: 'mediaUrls',
      message: `미디어 개수가 ${platform}의 제한인 ${limits.maxMediaCount}개를 ${mediaUrls.length - limits.maxMediaCount}개 초과했습니다`,
      severity: 'error',
      limit: limits.maxMediaCount,
      current: mediaUrls.length,
    });
  }

  // URL 형식 검증
  mediaUrls.forEach((url, index) => {
    try {
      new URL(url);
    } catch {
      errors.push({
        field: `mediaUrls[${index}]`,
        message: `유효하지 않은 URL입니다: "${url}"`,
        severity: 'error',
      });
    }

    // 파일 확장자 기반 미디어 타입 추정
    const extension = url.split('.').pop()?.toLowerCase();
    const mimeTypeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      bmp: 'image/bmp',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/avi',
      webm: 'video/webm',
    };

    const mimeType = extension ? mimeTypeMap[extension] : undefined;
    if (mimeType && !limits.supportedMediaTypes.includes(mimeType as any)) {
      errors.push({
        field: `mediaUrls[${index}]`,
        message: `${platform}에서 지원하지 않는 미디어 타입입니다: ${mimeType}`,
        severity: 'error',
      });
    }
  });

  return errors;
}

// 스레드 개수 검증
export function validateThreadCount(threadCount: number, platform: keyof typeof PLATFORM_LIMITS): ValidationError[] {
  const errors: ValidationError[] = [];
  const limit = PLATFORM_LIMITS[platform].maxThreadLength;

  if (threadCount > limit) {
    errors.push({
      field: 'threadCount',
      message: `스레드 개수가 ${platform}의 제한인 ${limit}개를 ${threadCount - limit}개 초과했습니다`,
      severity: 'error',
      limit,
      current: threadCount,
    });
  }

  if (threadCount < 1) {
    errors.push({
      field: 'threadCount',
      message: '스레드 개수는 최소 1개여야 합니다',
      severity: 'error',
    });
  }

  return errors;
}

// 콘텐츠 품질 검증
export function validateContentQuality(content: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // 빈 콘텐츠
  if (!content.trim()) {
    errors.push({
      field: 'content',
      message: '콘텐츠가 비어있습니다',
      severity: 'error',
    });
    return errors;
  }

  // 너무 짧은 콘텐츠
  if (content.trim().length < 10) {
    errors.push({
      field: 'content',
      message: '콘텐츠가 너무 짧습니다 (최소 10자)',
      severity: 'warning',
    });
  }

  // 반복 문자 검증
  if (/(.)\1{4,}/.test(content)) {
    errors.push({
      field: 'content',
      message: '같은 문자가 5번 이상 연속으로 반복됩니다',
      severity: 'warning',
    });
  }

  // 과도한 대문자 사용
  const uppercaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (uppercaseRatio > 0.5 && content.length > 20) {
    errors.push({
      field: 'content',
      message: '대문자 사용이 과도합니다',
      severity: 'warning',
    });
  }

  // 과도한 특수문자 사용
  const specialCharRatio = (content.match(/[!@#$%^&*()_+=\[\]{}|;':",./<>?]/g) || []).length / content.length;
  if (specialCharRatio > 0.2 && content.length > 20) {
    errors.push({
      field: 'content',
      message: '특수문자 사용이 과도합니다',
      severity: 'warning',
    });
  }

  // 과도한 이모지 사용
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojiCount = (content.match(emojiRegex) || []).length;
  const emojiRatio = emojiCount / content.length;
  
  if (emojiRatio > 0.1 && content.length > 20) {
    errors.push({
      field: 'content',
      message: '이모지 사용이 과도합니다',
      severity: 'warning',
    });
  }

  // 스팸성 키워드 검증
  const spamKeywords = [
    '무료', '공짜', '대박', '돈벌이', '클릭만', '지금바로', '한정시간',
    '놓치면후회', '100%보장', '완전무료', '즉시', '긴급'
  ];
  
  const spamKeywordCount = spamKeywords.filter(keyword => 
    content.toLowerCase().includes(keyword.toLowerCase())
  ).length;

  if (spamKeywordCount >= 3) {
    errors.push({
      field: 'content',
      message: '스팸성 키워드가 많이 포함되어 있습니다',
      severity: 'warning',
    });
  }

  return errors;
}

// 제안사항 생성
export function generateSuggestions(input: ValidationInput, errors: ValidationError[]): string[] {
  const suggestions: string[] = [];
  const { content, platform, hashtags = [], mediaUrls = [] } = input;

  // 길이 관련 제안
  const lengthErrors = errors.filter(e => e.field === 'content' && e.message.includes('길이'));
  if (lengthErrors.length > 0) {
    const limit = PLATFORM_LIMITS[platform].maxTextLength;
    const currentLength = content.length;
    
    if (currentLength > limit) {
      suggestions.push(`텍스트를 ${currentLength - limit}자 줄여주세요. 핵심 메시지만 남기고 부가 설명은 제거하는 것을 고려해보세요.`);
      suggestions.push('긴 내용은 스레드로 나누어 작성하는 것을 고려해보세요.');
    }
  }

  // 해시태그 관련 제안
  const hashtagErrors = errors.filter(e => e.field === 'hashtags' || e.field.startsWith('hashtags['));
  if (hashtagErrors.length > 0) {
    suggestions.push('해시태그는 관련성이 높고 인기 있는 것들로 선별해서 사용해보세요.');
    
    if (hashtags.length > PLATFORM_LIMITS[platform].maxHashtags) {
      suggestions.push('핵심적인 해시태그만 남기고 나머지는 제거해보세요.');
    }
  }

  // 품질 관련 제안
  const qualityErrors = errors.filter(e => e.message.includes('짧습니다') || e.message.includes('반복') || e.message.includes('과도'));
  if (qualityErrors.length > 0) {
    suggestions.push('콘텐츠의 가독성과 품질을 높이기 위해 문장을 다듬어보세요.');
    
    if (qualityErrors.some(e => e.message.includes('대문자'))) {
      suggestions.push('적절한 대소문자 조합을 사용하여 자연스러운 문장을 만들어보세요.');
    }
    
    if (qualityErrors.some(e => e.message.includes('이모지'))) {
      suggestions.push('이모지 사용을 줄이고 텍스트로 감정과 의미를 표현해보세요.');
    }
  }

  // 미디어 관련 제안
  const mediaErrors = errors.filter(e => e.field === 'mediaUrls' || e.field.startsWith('mediaUrls['));
  if (mediaErrors.length > 0) {
    suggestions.push('플랫폼에서 지원하는 미디어 형식과 크기 제한을 확인해보세요.');
    
    if (mediaUrls.length > PLATFORM_LIMITS[platform].maxMediaCount) {
      suggestions.push('가장 중요한 미디어만 선택하여 첨부해보세요.');
    }
  }

  // 플랫폼별 최적화 제안
  if (platform === 'twitter') {
    suggestions.push('트위터에서는 간결하고 임팩트 있는 메시지가 효과적입니다.');
  } else if (platform === 'threads') {
    suggestions.push('Threads에서는 개인적인 스토리와 경험 공유가 좋은 반응을 얻습니다.');
  } else if (platform === 'linkedin') {
    suggestions.push('LinkedIn에서는 전문적이고 인사이트가 있는 콘텐츠가 선호됩니다.');
  }

  return suggestions;
}

// 메인 검증 함수
export function validateContent(input: ValidationInput): ValidationResult {
  // 입력 검증
  const validatedInput = ValidationInputSchema.parse(input);
  const { content, platform, hashtags = [], mediaUrls = [], threadCount = 1 } = validatedInput;

  const allErrors: ValidationError[] = [];

  // 각 항목별 검증
  allErrors.push(...validateTextLength(content, platform));
  allErrors.push(...validateHashtags(hashtags, platform));
  allErrors.push(...validateMedia(mediaUrls, platform));
  allErrors.push(...validateThreadCount(threadCount, platform));
  allErrors.push(...validateContentQuality(content));

  // 에러와 경고 분리
  const errors = allErrors.filter(e => e.severity === 'error');
  const warnings = allErrors.filter(e => e.severity === 'warning');

  // 제안사항 생성
  const suggestions = generateSuggestions(validatedInput, allErrors);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

// 플랫폼별 최적화 점검
export function checkPlatformOptimization(input: ValidationInput): string[] {
  const { content, platform, hashtags = [], mediaUrls = [] } = input;
  const recommendations: string[] = [];
  const limits = PLATFORM_LIMITS[platform];

  // 길이 최적화
  const optimalLength = Math.floor(limits.maxTextLength * 0.7); // 70% 활용 권장
  if (content.length < optimalLength * 0.5) {
    recommendations.push(`${platform}에서는 더 상세한 설명을 추가할 수 있습니다 (현재: ${content.length}자, 권장: ${optimalLength}자 내외)`);
  }

  // 플랫폼별 특성 권장사항
  switch (platform) {
    case 'twitter':
      if (!hashtags.length) {
        recommendations.push('트위터에서는 1-2개의 관련 해시태그 사용을 권장합니다');
      }
      if (!content.includes('?') && !content.includes('!')) {
        recommendations.push('트위터에서는 질문이나 감탄사를 활용한 참여 유도가 효과적입니다');
      }
      break;

    case 'threads':
      if (!mediaUrls.length) {
        recommendations.push('Threads에서는 이미지나 동영상 첨부가 참여도를 높입니다');
      }
      if (content.split('\n').length < 2) {
        recommendations.push('Threads에서는 단락을 나누어 가독성을 높이는 것이 좋습니다');
      }
      break;

    case 'linkedin':
      if (hashtags.length < 3) {
        recommendations.push('LinkedIn에서는 3-5개의 전문적인 해시태그 사용을 권장합니다');
      }
      if (!content.includes('경험') && !content.includes('인사이트') && !content.includes('전문')) {
        recommendations.push('LinkedIn에서는 전문적 경험과 인사이트 공유가 효과적입니다');
      }
      break;
  }

  return recommendations;
}

// 콘텐츠 안전성 검증
export function validateContentSafety(content: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // 금지된 키워드 (예시 - 실제로는 더 포괄적인 목록 필요)
  const prohibitedKeywords = [
    '혐오', '차별', '욕설', '비하', '폭력', '불법',
    '사기', '도박', '마약', '성인', '아동', '테러'
  ];

  const foundProhibited = prohibitedKeywords.filter(keyword =>
    content.toLowerCase().includes(keyword.toLowerCase())
  );

  if (foundProhibited.length > 0) {
    errors.push({
      field: 'content',
      message: `부적절한 키워드가 포함되어 있습니다: ${foundProhibited.join(', ')}`,
      severity: 'error',
    });
  }

  // 개인정보 패턴 검증
  const patterns = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /(\+?\d{1,3}[.-]?)?\(?\d{2,3}\)?[.-]?\d{3,4}[.-]?\d{4}/g,
    cardNumber: /\d{4}[.\-\s]?\d{4}[.\-\s]?\d{4}[.\-\s]?\d{4}/g,
  };

  Object.entries(patterns).forEach(([type, pattern]) => {
    if (pattern.test(content)) {
      errors.push({
        field: 'content',
        message: `개인정보(${type})가 포함되어 있을 수 있습니다`,
        severity: 'warning',
      });
    }
  });

  return errors;
}