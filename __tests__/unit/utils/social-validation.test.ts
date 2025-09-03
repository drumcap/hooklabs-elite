/**
 * 소셜 미디어 콘텐츠 검증 유틸리티 테스트
 * 플랫폼별 제한사항 및 콘텐츠 품질 검증 로직 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  validateContent,
  validateTextLength,
  validateHashtags,
  validateMedia,
  validateThreadCount,
  validateContentQuality,
  validateContentSafety,
  checkPlatformOptimization,
  generateSuggestions,
  PLATFORM_LIMITS,
  type ValidationInput
} from '../../../lib/utils/social/validation';

describe('Social Media Validation Utils', () => {
  const baseValidationInput: ValidationInput = {
    content: '새로운 AI 기능을 출시했습니다! 사용자 경험이 크게 향상되었어요.',
    platform: 'twitter',
    hashtags: ['#AI', '#혁신'],
    mediaUrls: ['https://example.com/image.png'],
    threadCount: 1
  };

  describe('validateTextLength', () => {
    it('플랫폼별 텍스트 길이 제한을 올바르게 검증해야 함', () => {
      // 트위터 제한 초과
      const longTwitterContent = 'A'.repeat(281);
      const twitterErrors = validateTextLength(longTwitterContent, 'twitter');
      
      expect(twitterErrors).toHaveLength(1);
      expect(twitterErrors[0].severity).toBe('error');
      expect(twitterErrors[0].message).toContain('280자를');
      expect(twitterErrors[0].current).toBe(281);
      expect(twitterErrors[0].limit).toBe(280);

      // Threads 제한 내
      const validThreadsContent = 'A'.repeat(400);
      const threadsErrors = validateTextLength(validThreadsContent, 'threads');
      
      expect(threadsErrors).toHaveLength(0);

      // LinkedIn 제한 초과
      const longLinkedInContent = 'A'.repeat(3001);
      const linkedinErrors = validateTextLength(longLinkedInContent, 'linkedin');
      
      expect(linkedinErrors).toHaveLength(1);
      expect(linkedinErrors[0].severity).toBe('error');
    });

    it('경고 수준(80% 초과)에서 경고를 발생시켜야 함', () => {
      const warningLengthContent = 'A'.repeat(225); // 280의 80% = 224, 225는 경고 구간
      const warnings = validateTextLength(warningLengthContent, 'twitter');
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0].severity).toBe('warning');
      expect(warnings[0].message).toContain('80%를 초과');
    });

    it('적절한 길이에서는 에러를 반환하지 않아야 함', () => {
      const validContent = '적절한 길이의 콘텐츠입니다.';
      const errors = validateTextLength(validContent, 'twitter');
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateHashtags', () => {
    it('해시태그 개수 제한을 검증해야 함', () => {
      const tooManyHashtags = Array.from({ length: 11 }, (_, i) => `#tag${i + 1}`);
      const errors = validateHashtags(tooManyHashtags, 'twitter');
      
      expect(errors.some(e => e.message.includes('개수가'))).toBe(true);
      expect(errors.some(e => e.severity === 'error')).toBe(true);
    });

    it('해시태그 형식을 검증해야 함', () => {
      const invalidHashtags = ['noHash', '#valid', '#', '#too-many-special!@#$%'];
      const errors = validateHashtags(invalidHashtags, 'twitter');
      
      // '#'로 시작하지 않는 해시태그
      expect(errors.some(e => e.message.includes('#으로 시작'))).toBe(true);
      
      // 허용되지 않는 문자
      expect(errors.some(e => e.message.includes('허용되지 않는 문자'))).toBe(true);
    });

    it('중복 해시태그를 감지해야 함', () => {
      const duplicateHashtags = ['#AI', '#ai', '#AI'];
      const errors = validateHashtags(duplicateHashtags, 'twitter');
      
      expect(errors.some(e => e.message.includes('중복된'))).toBe(true);
      expect(errors.some(e => e.severity === 'warning')).toBe(true);
    });

    it('해시태그 길이를 검증해야 함', () => {
      const tooLongHashtag = ['#' + 'A'.repeat(100)];
      const errors = validateHashtags(tooLongHashtag, 'twitter');
      
      expect(errors.some(e => e.message.includes('너무 깁니다'))).toBe(true);
    });

    it('유효한 해시태그는 에러를 발생시키지 않아야 함', () => {
      const validHashtags = ['#AI', '#혁신', '#스타트업', '#기술'];
      const errors = validateHashtags(validHashtags, 'twitter');
      
      const errorLevel = errors.filter(e => e.severity === 'error');
      expect(errorLevel).toHaveLength(0);
    });
  });

  describe('validateMedia', () => {
    it('미디어 개수 제한을 검증해야 함', () => {
      const tooManyMedia = Array.from({ length: 5 }, (_, i) => `https://example.com/image${i}.jpg`);
      const errors = validateMedia(tooManyMedia, 'twitter');
      
      expect(errors.some(e => e.message.includes('개수가'))).toBe(true);
      expect(errors.some(e => e.severity === 'error')).toBe(true);
    });

    it('유효하지 않은 URL을 감지해야 함', () => {
      const invalidUrls = ['not-a-url', 'ftp://invalid.com/file.jpg'];
      const errors = validateMedia(invalidUrls, 'twitter');
      
      expect(errors.some(e => e.message.includes('유효하지 않은 URL'))).toBe(true);
    });

    it('지원하지 않는 미디어 타입을 감지해야 함', () => {
      const unsupportedMedia = ['https://example.com/file.bmp', 'https://example.com/video.avi'];
      const errors = validateMedia(unsupportedMedia, 'twitter');
      
      expect(errors.some(e => e.message.includes('지원하지 않는 미디어 타입'))).toBe(true);
    });

    it('플랫폼별로 다른 미디어 제한을 적용해야 함', () => {
      const movFile = ['https://example.com/video.mov'];
      
      // Twitter에서는 .mov 지원하지 않음
      const twitterErrors = validateMedia(movFile, 'twitter');
      expect(twitterErrors.some(e => e.message.includes('지원하지 않는'))).toBe(true);
      
      // Threads에서는 .mov 지원
      const threadsErrors = validateMedia(movFile, 'threads');
      expect(threadsErrors.some(e => e.message.includes('지원하지 않는'))).toBe(false);
    });

    it('유효한 미디어 URL은 에러를 발생시키지 않아야 함', () => {
      const validMedia = [
        'https://example.com/image.jpg',
        'https://example.com/video.mp4',
        'https://example.com/photo.png'
      ];
      const errors = validateMedia(validMedia, 'twitter');
      
      const errorLevel = errors.filter(e => e.severity === 'error');
      expect(errorLevel).toHaveLength(0);
    });
  });

  describe('validateThreadCount', () => {
    it('스레드 개수 제한을 검증해야 함', () => {
      const tooManyThreads = 26; // 트위터 최대 25개
      const errors = validateThreadCount(tooManyThreads, 'twitter');
      
      expect(errors.some(e => e.message.includes('개수가'))).toBe(true);
      expect(errors.some(e => e.severity === 'error')).toBe(true);
    });

    it('최소 스레드 개수를 검증해야 함', () => {
      const zeroThreads = 0;
      const errors = validateThreadCount(zeroThreads, 'twitter');
      
      expect(errors.some(e => e.message.includes('최소 1개'))).toBe(true);
    });

    it('LinkedIn에서 스레드 제한을 검증해야 함', () => {
      const multipleThreads = 2; // LinkedIn은 스레드 지원하지 않음 (최대 1개)
      const errors = validateThreadCount(multipleThreads, 'linkedin');
      
      expect(errors.some(e => e.message.includes('개수가'))).toBe(true);
    });

    it('유효한 스레드 개수는 에러를 발생시키지 않아야 함', () => {
      const validThreadCount = 5;
      const errors = validateThreadCount(validThreadCount, 'twitter');
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateContentQuality', () => {
    it('빈 콘텐츠를 감지해야 함', () => {
      const emptyContent = '';
      const errors = validateContentQuality(emptyContent);
      
      expect(errors.some(e => e.message.includes('비어있습니다'))).toBe(true);
      expect(errors.some(e => e.severity === 'error')).toBe(true);
    });

    it('너무 짧은 콘텐츠에 경고를 발생시켜야 함', () => {
      const shortContent = '짧음';
      const errors = validateContentQuality(shortContent);
      
      expect(errors.some(e => e.message.includes('너무 짧습니다'))).toBe(true);
      expect(errors.some(e => e.severity === 'warning')).toBe(true);
    });

    it('반복 문자를 감지해야 함', () => {
      const repeatedContent = '와아아아아아아 정말 놀라워요!';
      const errors = validateContentQuality(repeatedContent);
      
      expect(errors.some(e => e.message.includes('연속으로 반복'))).toBe(true);
    });

    it('과도한 대문자 사용을 감지해야 함', () => {
      const uppercaseContent = 'THIS IS TOO MUCH UPPERCASE CONTENT FOR NORMAL READING';
      const errors = validateContentQuality(uppercaseContent);
      
      expect(errors.some(e => e.message.includes('대문자 사용이 과도'))).toBe(true);
    });

    it('과도한 특수문자 사용을 감지해야 함', () => {
      const specialCharContent = '!!!@@@###$$$%%% 너무 많은 특수문자 사용 !!!@@@###$$$%%%';
      const errors = validateContentQuality(specialCharContent);
      
      expect(errors.some(e => e.message.includes('특수문자 사용이 과도'))).toBe(true);
    });

    it('과도한 이모지 사용을 감지해야 함', () => {
      const emojiContent = '🚀🎉💡⚡🔥✨🌟💪🎯📈 이모지가 너무 많아요 🚀🎉💡⚡🔥✨🌟💪🎯📈';
      const errors = validateContentQuality(emojiContent);
      
      expect(errors.some(e => e.message.includes('이모지 사용이 과도'))).toBe(true);
    });

    it('스팸성 키워드를 감지해야 함', () => {
      const spamContent = '무료 공짜 대박 돈벌이 클릭만 하세요! 지금바로 한정시간 놓치면후회';
      const errors = validateContentQuality(spamContent);
      
      expect(errors.some(e => e.message.includes('스팸성 키워드'))).toBe(true);
    });

    it('품질이 좋은 콘텐츠는 에러를 발생시키지 않아야 함', () => {
      const goodContent = '새로운 AI 기능을 출시했습니다! 사용자 경험이 크게 향상되었고, 생산성도 높아졌어요. 여러분의 의견을 듣고 싶습니다.';
      const errors = validateContentQuality(goodContent);
      
      const errorLevel = errors.filter(e => e.severity === 'error');
      expect(errorLevel).toHaveLength(0);
    });
  });

  describe('validateContentSafety', () => {
    it('부적절한 키워드를 감지해야 함', () => {
      const unsafeContent = '이것은 혐오 발언이 포함된 내용입니다';
      const errors = validateContentSafety(unsafeContent);
      
      expect(errors.some(e => e.message.includes('부적절한 키워드'))).toBe(true);
      expect(errors.some(e => e.severity === 'error')).toBe(true);
    });

    it('이메일 주소를 감지해야 함', () => {
      const contentWithEmail = '연락주세요: test@example.com';
      const errors = validateContentSafety(contentWithEmail);
      
      expect(errors.some(e => e.message.includes('개인정보(email)'))).toBe(true);
      expect(errors.some(e => e.severity === 'warning')).toBe(true);
    });

    it('전화번호를 감지해야 함', () => {
      const contentWithPhone = '문의사항은 010-1234-5678로 연락주세요';
      const errors = validateContentSafety(contentWithPhone);
      
      expect(errors.some(e => e.message.includes('개인정보(phone)'))).toBe(true);
    });

    it('카드번호 패턴을 감지해야 함', () => {
      const contentWithCard = '카드번호: 1234-5678-9012-3456';
      const errors = validateContentSafety(contentWithCard);
      
      expect(errors.some(e => e.message.includes('개인정보(cardNumber)'))).toBe(true);
    });

    it('안전한 콘텐츠는 에러를 발생시키지 않아야 함', () => {
      const safeContent = '건전하고 안전한 콘텐츠입니다. 모두에게 도움이 되는 정보를 공유합니다.';
      const errors = validateContentSafety(safeContent);
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('generateSuggestions', () => {
    it('길이 초과 시 적절한 제안을 생성해야 함', () => {
      const longInput = {
        ...baseValidationInput,
        content: 'A'.repeat(300)
      };
      
      const errors = validateTextLength(longInput.content, 'twitter');
      const suggestions = generateSuggestions(longInput, errors);
      
      expect(suggestions.some(s => s.includes('줄여주세요'))).toBe(true);
      expect(suggestions.some(s => s.includes('스레드로 나누어'))).toBe(true);
    });

    it('해시태그 문제 시 적절한 제안을 생성해야 함', () => {
      const hashtagErrors = [{
        field: 'hashtags',
        message: '해시태그 개수가 초과',
        severity: 'error' as const
      }];
      
      const suggestions = generateSuggestions(baseValidationInput, hashtagErrors);
      
      expect(suggestions.some(s => s.includes('해시태그는'))).toBe(true);
    });

    it('품질 문제 시 적절한 제안을 생성해야 함', () => {
      const qualityErrors = [
        { field: 'content', message: '대문자 사용이 과도합니다', severity: 'warning' as const },
        { field: 'content', message: '이모지 사용이 과도합니다', severity: 'warning' as const }
      ];
      
      const suggestions = generateSuggestions(baseValidationInput, qualityErrors);
      
      expect(suggestions.some(s => s.includes('대소문자 조합'))).toBe(true);
      expect(suggestions.some(s => s.includes('이모지 사용을 줄이'))).toBe(true);
    });

    it('플랫폼별 최적화 제안을 생성해야 함', () => {
      const twitterSuggestions = generateSuggestions({
        ...baseValidationInput,
        platform: 'twitter'
      }, []);
      
      const linkedinSuggestions = generateSuggestions({
        ...baseValidationInput,
        platform: 'linkedin'
      }, []);
      
      expect(twitterSuggestions.some(s => s.includes('트위터에서는'))).toBe(true);
      expect(linkedinSuggestions.some(s => s.includes('LinkedIn에서는'))).toBe(true);
    });
  });

  describe('checkPlatformOptimization', () => {
    it('플랫폼별 최적화 권장사항을 제공해야 함', () => {
      const shortInput = {
        ...baseValidationInput,
        content: '짧은 내용',
        hashtags: []
      };
      
      const recommendations = checkPlatformOptimization(shortInput);
      
      expect(recommendations.some(r => r.includes('더 상세한 설명'))).toBe(true);
      expect(recommendations.some(r => r.includes('해시태그 사용'))).toBe(true);
    });

    it('트위터 최적화 권장사항을 제공해야 함', () => {
      const twitterInput = {
        ...baseValidationInput,
        platform: 'twitter' as const,
        content: '질문이나 감탄사가 없는 평범한 내용입니다',
        hashtags: []
      };
      
      const recommendations = checkPlatformOptimization(twitterInput);
      
      expect(recommendations.some(r => r.includes('해시태그'))).toBe(true);
      expect(recommendations.some(r => r.includes('질문이나 감탄사'))).toBe(true);
    });

    it('Threads 최적화 권장사항을 제공해야 함', () => {
      const threadsInput = {
        ...baseValidationInput,
        platform: 'threads' as const,
        content: '단일 단락으로만 작성된 내용입니다.',
        mediaUrls: []
      };
      
      const recommendations = checkPlatformOptimization(threadsInput);
      
      expect(recommendations.some(r => r.includes('이미지나 동영상'))).toBe(true);
      expect(recommendations.some(r => r.includes('단락을 나누어'))).toBe(true);
    });

    it('LinkedIn 최적화 권장사항을 제공해야 함', () => {
      const linkedinInput = {
        ...baseValidationInput,
        platform: 'linkedin' as const,
        content: '일반적인 내용입니다. 단순한 업데이트 공지사항입니다.',
        hashtags: ['#일반']
      };
      
      const recommendations = checkPlatformOptimization(linkedinInput);
      
      expect(recommendations.some(r => r.includes('3-5개의'))).toBe(true);
      expect(recommendations.some(r => r.includes('전문적 경험'))).toBe(true);
    });
  });

  describe('validateContent (통합 테스트)', () => {
    it('유효한 콘텐츠에 대해 올바른 결과를 반환해야 함', () => {
      const validInput: ValidationInput = {
        content: '새로운 AI 기능을 출시했습니다! 사용자 경험이 크게 향상되었어요. 여러분은 어떻게 생각하시나요?',
        platform: 'twitter',
        hashtags: ['#AI', '#혁신'],
        mediaUrls: ['https://example.com/image.jpg'],
        threadCount: 1
      };
      
      const result = validateContent(validInput);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('문제가 있는 콘텐츠에 대해 올바른 에러를 반환해야 함', () => {
      const invalidInput: ValidationInput = {
        content: 'A'.repeat(300), // 트위터 길이 초과
        platform: 'twitter',
        hashtags: Array.from({ length: 15 }, (_, i) => `#tag${i}`), // 해시태그 개수 초과
        mediaUrls: Array.from({ length: 10 }, (_, i) => `https://example.com/image${i}.jpg`), // 미디어 개수 초과
        threadCount: 30 // 스레드 개수 초과
      };
      
      const result = validateContent(invalidInput);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('경고만 있는 경우 유효한 것으로 판단해야 함', () => {
      const warningInput: ValidationInput = {
        content: 'A'.repeat(225), // 경고 수준 길이
        platform: 'twitter',
        hashtags: ['#valid'],
        mediaUrls: [],
        threadCount: 1
      };
      
      const result = validateContent(warningInput);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('플랫폼별로 다른 검증 결과를 반환해야 함', () => {
      const baseContent = 'A'.repeat(400);
      
      const twitterResult = validateContent({
        content: baseContent,
        platform: 'twitter',
        hashtags: [],
        mediaUrls: []
      });
      
      const threadsResult = validateContent({
        content: baseContent,
        platform: 'threads',
        hashtags: [],
        mediaUrls: []
      });
      
      const linkedinResult = validateContent({
        content: baseContent,
        platform: 'linkedin',
        hashtags: [],
        mediaUrls: []
      });
      
      // 트위터에서는 길이 초과로 에러
      expect(twitterResult.isValid).toBe(false);
      expect(twitterResult.errors.some(e => e.message.includes('길이'))).toBe(true);
      
      // Threads와 LinkedIn에서는 유효
      expect(threadsResult.isValid).toBe(true);
      expect(linkedinResult.isValid).toBe(true);
    });

    it('잘못된 입력에 대해 에러를 던져야 함', () => {
      const invalidInput = {
        content: '유효한 콘텐츠',
        platform: 'invalid-platform' as any,
        hashtags: [],
        mediaUrls: []
      };
      
      expect(() => validateContent(invalidInput)).toThrow();
    });
  });

  describe('PLATFORM_LIMITS 상수', () => {
    it('모든 플랫폼에 필요한 제한사항이 정의되어 있어야 함', () => {
      const platforms = ['twitter', 'threads', 'linkedin'] as const;
      const requiredFields = [
        'maxTextLength',
        'maxThreadLength', 
        'maxMediaCount',
        'maxHashtags',
        'supportedMediaTypes',
        'maxImageSize',
        'maxVideoSize',
        'maxVideoDuration'
      ];
      
      platforms.forEach(platform => {
        const limits = PLATFORM_LIMITS[platform];
        expect(limits).toBeDefined();
        
        requiredFields.forEach(field => {
          expect(limits).toHaveProperty(field);
          expect(limits[field as keyof typeof limits]).toBeDefined();
        });
      });
    });

    it('제한값들이 합리적인 범위에 있어야 함', () => {
      Object.values(PLATFORM_LIMITS).forEach(limits => {
        expect(limits.maxTextLength).toBeGreaterThan(0);
        expect(limits.maxTextLength).toBeLessThan(10000);
        
        expect(limits.maxThreadLength).toBeGreaterThan(0);
        expect(limits.maxThreadLength).toBeLessThan(100);
        
        expect(limits.maxMediaCount).toBeGreaterThan(0);
        expect(limits.maxMediaCount).toBeLessThan(50);
        
        expect(limits.maxHashtags).toBeGreaterThan(0);
        expect(limits.maxHashtags).toBeLessThan(100);
      });
    });
  });

  describe('에러 메시지 품질', () => {
    it('에러 메시지에 구체적인 정보가 포함되어야 함', () => {
      const longContent = 'A'.repeat(300);
      const errors = validateTextLength(longContent, 'twitter');
      
      expect(errors[0].message).toContain('280자');
      expect(errors[0].message).toContain('20자 초과');
      expect(errors[0].current).toBe(300);
      expect(errors[0].limit).toBe(280);
    });

    it('필드명이 정확하게 지정되어야 함', () => {
      const invalidHashtags = ['invalid'];
      const errors = validateHashtags(invalidHashtags, 'twitter');
      
      expect(errors[0].field).toBe('hashtags[0]');
    });

    it('심각도가 적절하게 분류되어야 함', () => {
      const longContent = 'A'.repeat(300);
      const lengthErrors = validateTextLength(longContent, 'twitter');
      
      const shortContent = 'A'.repeat(5);
      const qualityErrors = validateContentQuality(shortContent);
      
      // 길이 초과는 에러
      expect(lengthErrors[0].severity).toBe('error');
      
      // 짧은 콘텐츠는 경고
      expect(qualityErrors[0].severity).toBe('warning');
    });
  });
});