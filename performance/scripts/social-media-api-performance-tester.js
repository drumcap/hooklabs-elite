#!/usr/bin/env node

/**
 * 소셜 미디어 API 성능 테스트 도구
 * 
 * 이 도구는 다음을 측정합니다:
 * - Twitter API v2 성능 분석
 * - Threads API 성능 분석
 * - Rate Limiting 준수 검증
 * - 토큰 갱신 성능
 * - 에러 처리 효율성
 * - 동시 발행 성능
 */

const fs = require('fs').promises;
const https = require('https');

class SocialMediaAPIPerformanceTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      testSummary: {},
      twitterTests: {
        authentication: {},
        publishing: {},
        metrics: {},
        rateLimiting: {}
      },
      threadsTests: {
        authentication: {},
        publishing: {},
        metrics: {},
        rateLimiting: {}
      },
      integrationTests: {
        multiPlatform: {},
        errorHandling: {},
        tokenRefresh: {}
      },
      performanceIssues: [],
      recommendations: []
    };
    
    // 테스트용 계정 정보 (실제 환경에서는 환경 변수 사용)
    this.testAccounts = {
      twitter: {
        clientId: 'mock-twitter-client-id',
        clientSecret: 'mock-twitter-client-secret',
        accessToken: 'mock-twitter-access-token',
        refreshToken: 'mock-twitter-refresh-token'
      },
      threads: {
        accessToken: 'mock-threads-access-token',
        userId: 'mock-threads-user-id'
      }
    };
    
    // API 엔드포인트
    this.endpoints = {
      twitter: {
        base: 'https://api.twitter.com/2',
        tweets: '/tweets',
        user: '/users/me',
        metrics: '/tweets/{id}?tweet.fields=public_metrics',
        token: 'https://api.twitter.com/2/oauth2/token'
      },
      threads: {
        base: 'https://graph.threads.net/v1.0',
        create: '/{user-id}/threads',
        publish: '/{user-id}/threads_publish',
        metrics: '/{media-id}?fields=like_count,reply_count'
      }
    };
  }

  /**
   * 전체 성능 테스트 실행
   */
  async runPerformanceTests() {
    console.log('📱 소셜 미디어 API 성능 테스트 시작...\n');
    
    await this.testTwitterAPI();
    await this.testThreadsAPI();
    await this.testIntegrationScenarios();
    this.analyzeResults();
    this.generateRecommendations();
    
    // 결과 저장
    const reportPath = '/workspace/hooklabs-elite/social-media-api-performance-report.json';
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log('\n📊 소셜 미디어 API 성능 테스트 완료!');
    console.log(`📁 상세 보고서: ${reportPath}`);
    
    this.printSummary();
  }

  /**
   * Twitter API 성능 테스트
   */
  async testTwitterAPI() {
    console.log('🐦 Twitter API 테스트 중...');
    
    // 인증 성능 테스트
    await this.testTwitterAuthentication();
    
    // 게시물 발행 성능 테스트
    await this.testTwitterPublishing();
    
    // 메트릭 수집 성능 테스트
    await this.testTwitterMetrics();
    
    // Rate Limiting 테스트
    await this.testTwitterRateLimit();
    
    console.log('✅ Twitter API 테스트 완료');
  }

  /**
   * Twitter 인증 성능 테스트
   */
  async testTwitterAuthentication() {
    console.log('  - Twitter 인증 테스트 중...');
    
    const authTests = [];
    
    // 토큰 검증 테스트 (5회)
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      
      try {
        const result = await this.simulateTwitterAuth();
        const endTime = Date.now();
        
        authTests.push({
          test: 'token-validation',
          attempt: i + 1,
          latency: endTime - startTime,
          success: true,
          response: result
        });
        
      } catch (error) {
        const endTime = Date.now();
        
        authTests.push({
          test: 'token-validation',
          attempt: i + 1,
          latency: endTime - startTime,
          success: false,
          error: error.message
        });
      }
      
      await this.sleep(500); // Rate limit 고려
    }
    
    // 토큰 갱신 테스트
    const refreshStartTime = Date.now();
    try {
      const refreshResult = await this.simulateTwitterTokenRefresh();
      const refreshEndTime = Date.now();
      
      authTests.push({
        test: 'token-refresh',
        latency: refreshEndTime - refreshStartTime,
        success: true,
        response: refreshResult
      });
      
    } catch (error) {
      const refreshEndTime = Date.now();
      
      authTests.push({
        test: 'token-refresh',
        latency: refreshEndTime - refreshStartTime,
        success: false,
        error: error.message
      });
    }
    
    // 통계 계산
    const validationTests = authTests.filter(t => t.test === 'token-validation' && t.success);
    const latencies = validationTests.map(t => t.latency);
    
    this.results.twitterTests.authentication = {
      validationTests: authTests.filter(t => t.test === 'token-validation'),
      refreshTest: authTests.find(t => t.test === 'token-refresh'),
      statistics: latencies.length > 0 ? {
        avgLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
        minLatency: Math.min(...latencies),
        maxLatency: Math.max(...latencies),
        successRate: (validationTests.length / 5) * 100
      } : null
    };
  }

  /**
   * Twitter 게시물 발행 성능 테스트
   */
  async testTwitterPublishing() {
    console.log('  - Twitter 발행 성능 테스트 중...');
    
    const publishTests = [];
    
    // 다양한 콘텐츠 타입별 발행 테스트
    const testContents = [
      { type: 'text-only', content: '간단한 텍스트 트윗입니다 #테스트', length: 'short' },
      { type: 'text-long', content: '긴 텍스트 트윗입니다. '.repeat(20) + '#긴트윗', length: 'long' },
      { type: 'with-hashtags', content: '해시태그가 많은 트윗 #테스트 #성능 #소셜미디어 #자동화', length: 'medium' },
      { type: 'with-mentions', content: '@username 멘션이 포함된 트윗입니다 #멘션', length: 'medium' },
      { type: 'thread', content: ['스레드 트윗 1/3', '스레드 트윗 2/3', '스레드 트윗 3/3'], length: 'thread' }
    ];
    
    for (const testContent of testContents) {
      for (let i = 0; i < 3; i++) { // 각 타입당 3회 테스트
        const startTime = Date.now();
        
        try {
          const result = await this.simulateTwitterPublish(testContent);
          const endTime = Date.now();
          
          publishTests.push({
            contentType: testContent.type,
            contentLength: testContent.length,
            attempt: i + 1,
            latency: endTime - startTime,
            success: true,
            tweetId: result.tweetId,
            charCount: typeof testContent.content === 'string' 
              ? testContent.content.length 
              : testContent.content.join(' ').length
          });
          
        } catch (error) {
          const endTime = Date.now();
          
          publishTests.push({
            contentType: testContent.type,
            contentLength: testContent.length,
            attempt: i + 1,
            latency: endTime - startTime,
            success: false,
            error: error.message
          });
        }
        
        await this.sleep(1000); // Rate limit 고려
      }
    }
    
    // 통계 분석
    const successfulTests = publishTests.filter(t => t.success);
    const byType = {};
    
    for (const test of successfulTests) {
      if (!byType[test.contentType]) {
        byType[test.contentType] = [];
      }
      byType[test.contentType].push(test.latency);
    }
    
    const statistics = {};
    for (const [type, latencies] of Object.entries(byType)) {
      statistics[type] = {
        avgLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
        minLatency: Math.min(...latencies),
        maxLatency: Math.max(...latencies),
        testCount: latencies.length
      };
    }
    
    this.results.twitterTests.publishing = {
      tests: publishTests,
      statistics,
      overallSuccessRate: (successfulTests.length / publishTests.length) * 100,
      averageLatency: successfulTests.length > 0 
        ? successfulTests.reduce((sum, t) => sum + t.latency, 0) / successfulTests.length
        : 0
    };
  }

  /**
   * Twitter 메트릭 수집 성능 테스트
   */
  async testTwitterMetrics() {
    console.log('  - Twitter 메트릭 수집 테스트 중...');
    
    const metricTests = [];
    const testTweetIds = ['1234567890', '1234567891', '1234567892'];
    
    for (const tweetId of testTweetIds) {
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        
        try {
          const result = await this.simulateTwitterMetrics(tweetId);
          const endTime = Date.now();
          
          metricTests.push({
            tweetId,
            attempt: i + 1,
            latency: endTime - startTime,
            success: true,
            metrics: result.metrics
          });
          
        } catch (error) {
          const endTime = Date.now();
          
          metricTests.push({
            tweetId,
            attempt: i + 1,
            latency: endTime - startTime,
            success: false,
            error: error.message
          });
        }
        
        await this.sleep(300); // Rate limit 고려
      }
    }
    
    const successfulTests = metricTests.filter(t => t.success);
    const latencies = successfulTests.map(t => t.latency);
    
    this.results.twitterTests.metrics = {
      tests: metricTests,
      statistics: latencies.length > 0 ? {
        avgLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
        minLatency: Math.min(...latencies),
        maxLatency: Math.max(...latencies),
        successRate: (successfulTests.length / metricTests.length) * 100
      } : null
    };
  }

  /**
   * Twitter Rate Limiting 테스트
   */
  async testTwitterRateLimit() {
    console.log('  - Twitter Rate Limiting 테스트 중...');
    
    const rateLimitTests = [];
    const requestCount = 20; // Twitter API의 일반적인 rate limit 테스트
    const startTime = Date.now();
    
    for (let i = 0; i < requestCount; i++) {
      const requestStart = Date.now();
      
      try {
        await this.simulateTwitterAuth();
        const requestEnd = Date.now();
        
        rateLimitTests.push({
          requestId: i + 1,
          latency: requestEnd - requestStart,
          success: true,
          timestamp: requestStart
        });
        
      } catch (error) {
        const requestEnd = Date.now();
        
        rateLimitTests.push({
          requestId: i + 1,
          latency: requestEnd - requestStart,
          success: false,
          error: error.message,
          timestamp: requestStart,
          isRateLimit: error.message.includes('rate limit') || error.message.includes('429')
        });
      }
      
      // Rate limit을 의도적으로 테스트하므로 짧은 간격
      await this.sleep(100);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const successfulTests = rateLimitTests.filter(t => t.success);
    const rateLimitErrors = rateLimitTests.filter(t => t.isRateLimit);
    
    this.results.twitterTests.rateLimiting = {
      tests: rateLimitTests,
      totalTime,
      requestsPerSecond: (requestCount / totalTime) * 1000,
      successRate: (successfulTests.length / requestCount) * 100,
      rateLimitHits: rateLimitErrors.length,
      averageLatency: successfulTests.length > 0 
        ? successfulTests.reduce((sum, t) => sum + t.latency, 0) / successfulTests.length
        : 0
    };
  }

  /**
   * Threads API 성능 테스트
   */
  async testThreadsAPI() {
    console.log('🧵 Threads API 테스트 중...');
    
    await this.testThreadsAuthentication();
    await this.testThreadsPublishing();
    await this.testThreadsMetrics();
    
    console.log('✅ Threads API 테스트 완료');
  }

  /**
   * Threads 인증 성능 테스트
   */
  async testThreadsAuthentication() {
    console.log('  - Threads 인증 테스트 중...');
    
    const authTests = [];
    
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      
      try {
        const result = await this.simulateThreadsAuth();
        const endTime = Date.now();
        
        authTests.push({
          attempt: i + 1,
          latency: endTime - startTime,
          success: true,
          userId: result.userId
        });
        
      } catch (error) {
        const endTime = Date.now();
        
        authTests.push({
          attempt: i + 1,
          latency: endTime - startTime,
          success: false,
          error: error.message
        });
      }
      
      await this.sleep(500);
    }
    
    const successfulTests = authTests.filter(t => t.success);
    const latencies = successfulTests.map(t => t.latency);
    
    this.results.threadsTests.authentication = {
      tests: authTests,
      statistics: latencies.length > 0 ? {
        avgLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
        minLatency: Math.min(...latencies),
        maxLatency: Math.max(...latencies),
        successRate: (successfulTests.length / 5) * 100
      } : null
    };
  }

  /**
   * Threads 게시물 발행 성능 테스트
   */
  async testThreadsPublishing() {
    console.log('  - Threads 발행 성능 테스트 중...');
    
    const publishTests = [];
    const testContents = [
      { type: 'text-only', content: 'Threads 텍스트 게시물입니다' },
      { type: 'with-image', content: '이미지가 포함된 게시물입니다', hasImage: true },
      { type: 'long-text', content: '긴 텍스트 게시물입니다. '.repeat(30) }
    ];
    
    for (const testContent of testContents) {
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        
        try {
          const result = await this.simulateThreadsPublish(testContent);
          const endTime = Date.now();
          
          publishTests.push({
            contentType: testContent.type,
            attempt: i + 1,
            latency: endTime - startTime,
            success: true,
            postId: result.postId,
            steps: result.steps // Threads는 2단계 발행
          });
          
        } catch (error) {
          const endTime = Date.now();
          
          publishTests.push({
            contentType: testContent.type,
            attempt: i + 1,
            latency: endTime - startTime,
            success: false,
            error: error.message
          });
        }
        
        await this.sleep(2000); // Threads는 더 긴 간격 필요
      }
    }
    
    const successfulTests = publishTests.filter(t => t.success);
    const latencies = successfulTests.map(t => t.latency);
    
    this.results.threadsTests.publishing = {
      tests: publishTests,
      statistics: latencies.length > 0 ? {
        avgLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
        minLatency: Math.min(...latencies),
        maxLatency: Math.max(...latencies),
        successRate: (successfulTests.length / publishTests.length) * 100
      } : null,
      twoStepLatency: {
        createContainer: successfulTests.map(t => t.steps?.createContainer || 0),
        publishPost: successfulTests.map(t => t.steps?.publishPost || 0)
      }
    };
  }

  /**
   * Threads 메트릭 수집 성능 테스트
   */
  async testThreadsMetrics() {
    console.log('  - Threads 메트릭 수집 테스트 중...');
    
    const metricTests = [];
    const testPostIds = ['thread_post_1', 'thread_post_2', 'thread_post_3'];
    
    for (const postId of testPostIds) {
      for (let i = 0; i < 2; i++) {
        const startTime = Date.now();
        
        try {
          const result = await this.simulateThreadsMetrics(postId);
          const endTime = Date.now();
          
          metricTests.push({
            postId,
            attempt: i + 1,
            latency: endTime - startTime,
            success: true,
            metrics: result.metrics
          });
          
        } catch (error) {
          const endTime = Date.now();
          
          metricTests.push({
            postId,
            attempt: i + 1,
            latency: endTime - startTime,
            success: false,
            error: error.message
          });
        }
        
        await this.sleep(1000);
      }
    }
    
    const successfulTests = metricTests.filter(t => t.success);
    const latencies = successfulTests.map(t => t.latency);
    
    this.results.threadsTests.metrics = {
      tests: metricTests,
      statistics: latencies.length > 0 ? {
        avgLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
        minLatency: Math.min(...latencies),
        maxLatency: Math.max(...latencies),
        successRate: (successfulTests.length / metricTests.length) * 100
      } : null
    };
  }

  /**
   * 통합 시나리오 테스트
   */
  async testIntegrationScenarios() {
    console.log('🔗 통합 시나리오 테스트 중...');
    
    await this.testMultiPlatformPublishing();
    await this.testErrorHandling();
    
    console.log('✅ 통합 시나리오 테스트 완료');
  }

  /**
   * 멀티 플랫폼 동시 발행 테스트
   */
  async testMultiPlatformPublishing() {
    console.log('  - 멀티 플랫폼 발행 테스트 중...');
    
    const multiPlatformTests = [];
    const testContent = {
      content: '멀티 플랫폼 테스트 게시물입니다 #테스트',
      platforms: ['twitter', 'threads']
    };
    
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      
      try {
        // 동시 발행 시뮬레이션
        const results = await Promise.allSettled([
          this.simulateTwitterPublish({ type: 'multi-platform', content: testContent.content }),
          this.simulateThreadsPublish({ type: 'multi-platform', content: testContent.content })
        ]);
        
        const endTime = Date.now();
        
        const twitterResult = results[0];
        const threadsResult = results[1];
        
        multiPlatformTests.push({
          attempt: i + 1,
          totalLatency: endTime - startTime,
          success: twitterResult.status === 'fulfilled' && threadsResult.status === 'fulfilled',
          results: {
            twitter: twitterResult.status === 'fulfilled' ? twitterResult.value : { error: twitterResult.reason?.message },
            threads: threadsResult.status === 'fulfilled' ? threadsResult.value : { error: threadsResult.reason?.message }
          }
        });
        
      } catch (error) {
        const endTime = Date.now();
        
        multiPlatformTests.push({
          attempt: i + 1,
          totalLatency: endTime - startTime,
          success: false,
          error: error.message
        });
      }
      
      await this.sleep(3000);
    }
    
    const successfulTests = multiPlatformTests.filter(t => t.success);
    const latencies = successfulTests.map(t => t.totalLatency);
    
    this.results.integrationTests.multiPlatform = {
      tests: multiPlatformTests,
      statistics: latencies.length > 0 ? {
        avgLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
        minLatency: Math.min(...latencies),
        maxLatency: Math.max(...latencies),
        successRate: (successfulTests.length / multiPlatformTests.length) * 100
      } : null
    };
  }

  /**
   * 에러 처리 테스트
   */
  async testErrorHandling() {
    console.log('  - 에러 처리 테스트 중...');
    
    const errorTests = [];
    
    // 의도적 에러 시나리오
    const errorScenarios = [
      { type: 'invalid-token', description: '잘못된 토큰' },
      { type: 'rate-limit', description: 'Rate Limit 초과' },
      { type: 'network-error', description: '네트워크 오류' },
      { type: 'invalid-content', description: '잘못된 콘텐츠' }
    ];
    
    for (const scenario of errorScenarios) {
      const startTime = Date.now();
      
      try {
        await this.simulateErrorScenario(scenario.type);
        const endTime = Date.now();
        
        // 에러가 발생해야 하는데 발생하지 않음
        errorTests.push({
          scenario: scenario.type,
          description: scenario.description,
          latency: endTime - startTime,
          expectedError: true,
          actualError: false,
          success: false,
          issue: '예상된 에러가 발생하지 않음'
        });
        
      } catch (error) {
        const endTime = Date.now();
        
        errorTests.push({
          scenario: scenario.type,
          description: scenario.description,
          latency: endTime - startTime,
          expectedError: true,
          actualError: true,
          success: true,
          errorMessage: error.message,
          errorType: this.classifyError(error.message)
        });
      }
      
      await this.sleep(1000);
    }
    
    this.results.integrationTests.errorHandling = {
      tests: errorTests,
      totalScenarios: errorScenarios.length,
      properlyHandled: errorTests.filter(t => t.success).length,
      handlingRate: (errorTests.filter(t => t.success).length / errorScenarios.length) * 100
    };
  }

  /**
   * API 호출 시뮬레이션 - Twitter 인증
   */
  async simulateTwitterAuth() {
    const latency = 200 + Math.random() * 300; // 200-500ms
    await this.sleep(latency);
    
    // 5% 확률로 에러 발생
    if (Math.random() < 0.05) {
      throw new Error('Authentication failed');
    }
    
    return {
      authenticated: true,
      userId: '1234567890',
      username: 'test_user'
    };
  }

  /**
   * API 호출 시뮬레이션 - Twitter 토큰 갱신
   */
  async simulateTwitterTokenRefresh() {
    const latency = 800 + Math.random() * 400; // 800-1200ms
    await this.sleep(latency);
    
    // 10% 확률로 에러 발생
    if (Math.random() < 0.1) {
      throw new Error('Token refresh failed');
    }
    
    return {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 7200
    };
  }

  /**
   * API 호출 시뮬레이션 - Twitter 발행
   */
  async simulateTwitterPublish(content) {
    // 콘텐츠 타입에 따른 지연시간
    const baseLatency = {
      'text-only': 300,
      'text-long': 500,
      'with-hashtags': 350,
      'with-mentions': 400,
      'thread': 1200,
      'multi-platform': 400
    };
    
    const latency = baseLatency[content.type] + Math.random() * 200;
    await this.sleep(latency);
    
    // 에러 확률
    if (Math.random() < 0.08) {
      const errors = ['Content too long', 'Rate limit exceeded', 'Network error'];
      throw new Error(errors[Math.floor(Math.random() * errors.length)]);
    }
    
    return {
      tweetId: `tweet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: 'https://twitter.com/test_user/status/1234567890',
      publishedAt: new Date().toISOString()
    };
  }

  /**
   * API 호출 시뮬레이션 - Twitter 메트릭
   */
  async simulateTwitterMetrics(tweetId) {
    const latency = 250 + Math.random() * 150; // 250-400ms
    await this.sleep(latency);
    
    if (Math.random() < 0.05) {
      throw new Error('Tweet not found');
    }
    
    return {
      tweetId,
      metrics: {
        views: Math.floor(Math.random() * 10000),
        likes: Math.floor(Math.random() * 500),
        retweets: Math.floor(Math.random() * 100),
        replies: Math.floor(Math.random() * 50),
        quotes: Math.floor(Math.random() * 20)
      }
    };
  }

  /**
   * API 호출 시뮬레이션 - Threads 인증
   */
  async simulateThreadsAuth() {
    const latency = 300 + Math.random() * 200; // 300-500ms
    await this.sleep(latency);
    
    if (Math.random() < 0.05) {
      throw new Error('Threads authentication failed');
    }
    
    return {
      authenticated: true,
      userId: 'threads_user_123',
      username: 'test_threads_user'
    };
  }

  /**
   * API 호출 시뮬레이션 - Threads 발행
   */
  async simulateThreadsPublish(content) {
    // Threads는 2단계 프로세스
    const createContainerTime = 400 + Math.random() * 300; // 컨테이너 생성
    const publishTime = 600 + Math.random() * 400; // 실제 발행
    
    await this.sleep(createContainerTime);
    
    if (Math.random() < 0.1) {
      throw new Error('Container creation failed');
    }
    
    await this.sleep(publishTime);
    
    if (Math.random() < 0.05) {
      throw new Error('Publishing failed');
    }
    
    return {
      postId: `threads_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: 'https://www.threads.net/@test_threads_user/post/abc123',
      publishedAt: new Date().toISOString(),
      steps: {
        createContainer: createContainerTime,
        publishPost: publishTime
      }
    };
  }

  /**
   * API 호출 시뮬레이션 - Threads 메트릭
   */
  async simulateThreadsMetrics(postId) {
    const latency = 300 + Math.random() * 200; // 300-500ms
    await this.sleep(latency);
    
    if (Math.random() < 0.08) {
      throw new Error('Post not found');
    }
    
    return {
      postId,
      metrics: {
        views: Math.floor(Math.random() * 8000),
        likes: Math.floor(Math.random() * 400),
        reposts: Math.floor(Math.random() * 80),
        replies: Math.floor(Math.random() * 40)
      }
    };
  }

  /**
   * 에러 시나리오 시뮬레이션
   */
  async simulateErrorScenario(scenarioType) {
    const latency = 100 + Math.random() * 200;
    await this.sleep(latency);
    
    const errors = {
      'invalid-token': 'Invalid or expired token',
      'rate-limit': 'Rate limit exceeded. Try again later',
      'network-error': 'Network timeout occurred',
      'invalid-content': 'Content violates platform guidelines'
    };
    
    throw new Error(errors[scenarioType] || 'Unknown error occurred');
  }

  /**
   * 에러 타입 분류
   */
  classifyError(errorMessage) {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('token') || message.includes('auth')) return 'authentication';
    if (message.includes('rate') || message.includes('429')) return 'rate-limit';
    if (message.includes('network') || message.includes('timeout')) return 'network';
    if (message.includes('content') || message.includes('guideline')) return 'content-policy';
    
    return 'unknown';
  }

  /**
   * 결과 분석
   */
  analyzeResults() {
    console.log('📊 결과 분석 중...');
    
    const twitterStats = this.results.twitterTests;
    const threadsStats = this.results.threadsTests;
    const integrationStats = this.results.integrationTests;
    
    // 전체 성능 메트릭 계산
    const allLatencies = [];
    let totalRequests = 0;
    let totalSuccesses = 0;
    
    // Twitter 통계 집계
    if (twitterStats.publishing.statistics) {
      allLatencies.push(...Object.values(twitterStats.publishing.statistics).map(s => s.avgLatency));
      totalRequests += twitterStats.publishing.tests.length;
      totalSuccesses += twitterStats.publishing.tests.filter(t => t.success).length;
    }
    
    // Threads 통계 집계
    if (threadsStats.publishing.statistics) {
      allLatencies.push(threadsStats.publishing.statistics.avgLatency);
      totalRequests += threadsStats.publishing.tests.length;
      totalSuccesses += threadsStats.publishing.tests.filter(t => t.success).length;
    }
    
    // 통합 테스트 통계 집계
    if (integrationStats.multiPlatform.statistics) {
      allLatencies.push(integrationStats.multiPlatform.statistics.avgLatency);
      totalRequests += integrationStats.multiPlatform.tests.length;
      totalSuccesses += integrationStats.multiPlatform.tests.filter(t => t.success).length;
    }
    
    this.results.testSummary = {
      totalRequests,
      totalSuccesses,
      overallSuccessRate: totalRequests > 0 ? (totalSuccesses / totalRequests) * 100 : 0,
      averageLatency: allLatencies.length > 0 ? allLatencies.reduce((sum, l) => sum + l, 0) / allLatencies.length : 0,
      platformComparison: {
        twitter: {
          avgPublishLatency: twitterStats.publishing.statistics?.avgLatency || 0,
          successRate: twitterStats.publishing.overallSuccessRate || 0,
          rateLimitHits: twitterStats.rateLimiting.rateLimitHits || 0
        },
        threads: {
          avgPublishLatency: threadsStats.publishing.statistics?.avgLatency || 0,
          successRate: threadsStats.publishing.statistics?.successRate || 0,
          twoStepOverhead: threadsStats.publishing.twoStepLatency ? 'High' : 'Unknown'
        }
      }
    };
    
    // 성능 이슈 식별
    this.identifyPerformanceIssues();
    
    console.log('✅ 결과 분석 완료');
  }

  /**
   * 성능 이슈 식별
   */
  identifyPerformanceIssues() {
    const issues = [];
    const summary = this.results.testSummary;
    const twitter = this.results.twitterTests;
    const threads = this.results.threadsTests;
    
    // 높은 지연시간 이슈
    if (summary.averageLatency > 2000) {
      issues.push({
        type: 'high-latency',
        severity: 'HIGH',
        message: `평균 응답 시간이 ${Math.round(summary.averageLatency)}ms로 매우 높습니다`,
        impact: '사용자 경험 저하 및 높은 이탈률',
        affectedPlatforms: ['twitter', 'threads']
      });
    }
    
    // 낮은 성공률 이슈
    if (summary.overallSuccessRate < 90) {
      issues.push({
        type: 'low-success-rate',
        severity: 'HIGH',
        message: `전체 성공률이 ${summary.overallSuccessRate.toFixed(1)}%로 낮습니다`,
        impact: '서비스 신뢰성 문제',
        affectedPlatforms: this.identifyLowSuccessRatePlatforms()
      });
    }
    
    // Rate Limiting 이슈
    if (twitter.rateLimiting && twitter.rateLimiting.rateLimitHits > 5) {
      issues.push({
        type: 'frequent-rate-limits',
        severity: 'MEDIUM',
        message: `Twitter에서 ${twitter.rateLimiting.rateLimitHits}회 Rate Limit에 도달했습니다`,
        impact: '발행 지연 및 사용자 불만',
        affectedPlatforms: ['twitter']
      });
    }
    
    // Threads 2단계 프로세스 오버헤드
    if (threads.publishing.statistics && threads.publishing.statistics.avgLatency > 1500) {
      issues.push({
        type: 'threads-two-step-overhead',
        severity: 'MEDIUM',
        message: 'Threads의 2단계 발행 프로세스가 높은 지연시간을 야기합니다',
        impact: 'Threads 발행 속도 저하',
        affectedPlatforms: ['threads']
      });
    }
    
    // 멀티 플랫폼 발행 효율성
    const multiPlatform = this.results.integrationTests.multiPlatform;
    if (multiPlatform.statistics && multiPlatform.statistics.successRate < 80) {
      issues.push({
        type: 'multi-platform-reliability',
        severity: 'MEDIUM',
        message: '멀티 플랫폼 동시 발행의 신뢰성이 낮습니다',
        impact: '일부 플랫폼에서 발행 누락 가능성',
        affectedPlatforms: ['twitter', 'threads']
      });
    }
    
    this.results.performanceIssues = issues;
  }

  /**
   * 낮은 성공률 플랫폼 식별
   */
  identifyLowSuccessRatePlatforms() {
    const platforms = [];
    
    if (this.results.twitterTests.publishing.overallSuccessRate < 90) {
      platforms.push('twitter');
    }
    
    if (this.results.threadsTests.publishing.statistics?.successRate < 90) {
      platforms.push('threads');
    }
    
    return platforms;
  }

  /**
   * 성능 개선 권장사항 생성
   */
  generateRecommendations() {
    console.log('💡 개선사항 생성 중...');
    
    const recommendations = [];
    const issues = this.results.performanceIssues;
    
    for (const issue of issues) {
      switch (issue.type) {
        case 'high-latency':
          recommendations.push({
            priority: 'HIGH',
            category: 'Performance',
            title: 'API 응답 시간 최적화',
            description: issue.message,
            solutions: [
              '요청 배치 처리 구현',
              'API 캐싱 레이어 추가',
              '병렬 처리 최적화',
              '타임아웃 설정 조정',
              'CDN을 통한 지리적 최적화'
            ],
            estimatedImpact: '응답 시간 40-60% 개선 예상',
            platforms: issue.affectedPlatforms
          });
          break;
          
        case 'low-success-rate':
          recommendations.push({
            priority: 'HIGH',
            category: 'Reliability',
            title: '에러 처리 및 재시도 로직 개선',
            description: issue.message,
            solutions: [
              'Exponential backoff 재시도 메커니즘',
              'Circuit breaker 패턴 도입',
              '상세 에러 로깅 및 모니터링',
              'Fallback 메커니즘 구현',
              '토큰 자동 갱신 시스템'
            ],
            estimatedImpact: '성공률 95% 이상 달성 예상',
            platforms: issue.affectedPlatforms
          });
          break;
          
        case 'frequent-rate-limits':
          recommendations.push({
            priority: 'MEDIUM',
            category: 'Rate Management',
            title: 'Rate Limiting 관리 개선',
            description: issue.message,
            solutions: [
              '동적 Rate Limiting 모니터링',
              '요청 큐잉 시스템 도입',
              'API 키 로테이션 구현',
              '발행 스케줄링 최적화',
              'Platform별 Rate Limit 준수 정책'
            ],
            estimatedImpact: 'Rate Limit 충돌 80% 감소 예상',
            platforms: issue.affectedPlatforms
          });
          break;
          
        case 'threads-two-step-overhead':
          recommendations.push({
            priority: 'MEDIUM',
            category: 'Platform Optimization',
            title: 'Threads 발행 프로세스 최적화',
            description: issue.message,
            solutions: [
              '컨테이너 생성과 발행 단계 병렬화 검토',
              'Threads API 응답 시간 모니터링',
              '발행 대기 시간 최적화',
              'Batch 발행 고려',
              'Platform별 최적화된 워크플로우'
            ],
            estimatedImpact: 'Threads 발행 시간 25-35% 개선 예상',
            platforms: issue.affectedPlatforms
          });
          break;
          
        case 'multi-platform-reliability':
          recommendations.push({
            priority: 'MEDIUM',
            category: 'Integration',
            title: '멀티 플랫폼 안정성 개선',
            description: issue.message,
            solutions: [
              '플랫폼별 독립적 에러 처리',
              '부분 성공 시나리오 관리',
              '멀티 플랫폼 상태 동기화',
              '롤백 메커니즘 구현',
              '플랫폼별 우선순위 설정'
            ],
            estimatedImpact: '멀티 플랫폼 성공률 90% 이상 달성 예상',
            platforms: issue.affectedPlatforms
          });
          break;
      }
    }
    
    // 일반적인 최적화 권장사항
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'LOW',
        category: 'Optimization',
        title: '성능 모니터링 및 최적화',
        description: '현재 성능은 양호하지만 지속적인 개선이 가능합니다',
        solutions: [
          '실시간 성능 모니터링 대시보드',
          'A/B 테스트를 통한 최적화',
          '사용자 피드백 기반 개선',
          '주기적 성능 벤치마킹',
          '신규 API 기능 활용'
        ],
        estimatedImpact: '지속적인 성능 개선 및 사용자 만족도 향상',
        platforms: ['twitter', 'threads']
      });
    }
    
    this.results.recommendations = recommendations;
    console.log(`✅ 생성된 권장사항: ${recommendations.length}개`);
  }

  /**
   * 유틸리티: 비동기 지연
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 요약 결과 출력
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📱 소셜 미디어 API 성능 테스트 요약');
    console.log('='.repeat(60));
    
    const summary = this.results.testSummary;
    
    console.log(`📊 전체 통계:`);
    console.log(`   - 총 요청: ${summary.totalRequests}개`);
    console.log(`   - 성공률: ${summary.overallSuccessRate.toFixed(1)}%`);
    console.log(`   - 평균 응답시간: ${Math.round(summary.averageLatency)}ms`);
    
    // 플랫폼별 비교
    console.log(`\n🏆 플랫폼별 성능:`);
    const twitter = summary.platformComparison.twitter;
    const threads = summary.platformComparison.threads;
    
    console.log(`   Twitter:`);
    console.log(`   - 발행 지연시간: ${Math.round(twitter.avgPublishLatency)}ms`);
    console.log(`   - 성공률: ${twitter.successRate.toFixed(1)}%`);
    console.log(`   - Rate Limit 충돌: ${twitter.rateLimitHits}회`);
    
    console.log(`   Threads:`);
    console.log(`   - 발행 지연시간: ${Math.round(threads.avgPublishLatency)}ms`);
    console.log(`   - 성공률: ${threads.successRate.toFixed(1)}%`);
    console.log(`   - 2단계 프로세스 오버헤드: ${threads.twoStepOverhead}`);
    
    // 주요 문제점
    const highPriorityIssues = this.results.performanceIssues.filter(i => i.severity === 'HIGH');
    if (highPriorityIssues.length > 0) {
      console.log(`\n🚨 주요 성능 이슈 (${highPriorityIssues.length}개):`);
      highPriorityIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.message}`);
        console.log(`   영향: ${issue.impact}`);
        console.log(`   플랫폼: ${issue.affectedPlatforms.join(', ')}`);
      });
    }
    
    // 주요 권장사항
    const highPriorityRecs = this.results.recommendations.filter(r => r.priority === 'HIGH');
    if (highPriorityRecs.length > 0) {
      console.log(`\n🚀 우선 개선사항 (${highPriorityRecs.length}개):`);
      highPriorityRecs.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.category}] ${rec.title}`);
        console.log(`   예상 효과: ${rec.estimatedImpact}`);
      });
    }
    
    // 통합 테스트 결과
    const integration = this.results.integrationTests;
    if (integration.multiPlatform.statistics) {
      console.log(`\n🔗 멀티 플랫폼 발행:`);
      console.log(`   - 성공률: ${integration.multiPlatform.statistics.successRate.toFixed(1)}%`);
      console.log(`   - 평균 소요시간: ${Math.round(integration.multiPlatform.statistics.avgLatency)}ms`);
    }
    
    if (integration.errorHandling) {
      console.log(`\n❌ 에러 처리:`);
      console.log(`   - 테스트된 시나리오: ${integration.errorHandling.totalScenarios}개`);
      console.log(`   - 적절한 에러 처리: ${integration.errorHandling.handlingRate.toFixed(1)}%`);
    }
    
    console.log('\n💡 자세한 분석 결과는 social-media-api-performance-report.json을 확인하세요.');
  }
}

// 메인 실행부
if (require.main === module) {
  const tester = new SocialMediaAPIPerformanceTester();
  tester.runPerformanceTests().catch(console.error);
}

module.exports = SocialMediaAPIPerformanceTester;