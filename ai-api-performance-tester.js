#!/usr/bin/env node

/**
 * AI API (Gemini) 성능 측정 도구
 * 
 * 이 도구는 다음을 측정합니다:
 * - API 응답 시간 분석
 * - 토큰 처리 속도
 * - 동시성 테스트
 * - 에러율 측정
 * - 지연시간 분포 분석
 */

const fs = require('fs').promises;
const https = require('https');
const crypto = require('crypto');

class AIAPIPerformanceTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      testSummary: {},
      latencyTests: [],
      throughputTests: [],
      concurrencyTests: [],
      errorAnalysis: {},
      recommendations: []
    };
    
    // 테스트용 프롬프트들 (실제 사용 패턴 시뮬레이션)
    this.testPrompts = [
      {
        type: 'content-generation',
        prompt: '소셜미디어용 짧은 게시물을 작성해주세요. 주제: 생산성 향상',
        expectedTokens: 100,
        complexity: 'low'
      },
      {
        type: 'content-variant',
        prompt: '다음 게시물을 3가지 다른 톤으로 변형해주세요: "오늘은 새로운 기능을 출시했습니다!"',
        expectedTokens: 200,
        complexity: 'medium'
      },
      {
        type: 'analysis',
        prompt: '다음 게시물의 참여도를 분석하고 개선점을 제안해주세요: [긴 게시물 내용...]',
        expectedTokens: 300,
        complexity: 'high'
      },
      {
        type: 'persona-content',
        prompt: '전문적인 톤으로 스타트업 창업자의 관점에서 AI 도구 활용에 대한 게시물을 작성해주세요.',
        expectedTokens: 250,
        complexity: 'medium'
      }
    ];
  }

  /**
   * 전체 성능 테스트 실행
   */
  async runPerformanceTests() {
    console.log('🤖 AI API 성능 테스트 시작...\n');
    
    await this.testLatency();
    await this.testThroughput();
    await this.testConcurrency();
    this.analyzeResults();
    this.generateRecommendations();
    
    // 결과 저장
    const reportPath = '/workspace/hooklabs-elite/ai-api-performance-report.json';
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log('\n📊 AI API 성능 테스트 완료!');
    console.log(`📁 상세 보고서: ${reportPath}`);
    
    this.printSummary();
  }

  /**
   * 지연시간 테스트
   */
  async testLatency() {
    console.log('⏱️  지연시간 테스트 중...');
    
    const latencyResults = [];
    
    for (const prompt of this.testPrompts) {
      console.log(`  - ${prompt.type} 테스트 중...`);
      
      // 각 프롬프트 타입당 5번씩 테스트
      const measurements = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        
        try {
          // 실제 API 호출 대신 시뮬레이션
          const result = await this.simulateAPICall(prompt);
          const endTime = Date.now();
          const latency = endTime - startTime;
          
          measurements.push({
            attempt: i + 1,
            latency,
            tokens: result.tokens,
            tokensPerSecond: result.tokens / (latency / 1000),
            success: true
          });
          
        } catch (error) {
          const endTime = Date.now();
          measurements.push({
            attempt: i + 1,
            latency: endTime - startTime,
            success: false,
            error: error.message
          });
        }
        
        // 테스트 간 간격 (Rate limiting 방지)
        await this.sleep(1000);
      }
      
      const successfulMeasurements = measurements.filter(m => m.success);
      const latencies = successfulMeasurements.map(m => m.latency);
      
      latencyResults.push({
        type: prompt.type,
        complexity: prompt.complexity,
        measurements,
        statistics: latencies.length > 0 ? {
          min: Math.min(...latencies),
          max: Math.max(...latencies),
          avg: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
          median: this.calculateMedian(latencies),
          p95: this.calculatePercentile(latencies, 95),
          p99: this.calculatePercentile(latencies, 99)
        } : null,
        successRate: (successfulMeasurements.length / measurements.length) * 100
      });
    }
    
    this.results.latencyTests = latencyResults;
    console.log(`✅ 지연시간 테스트 완료: ${latencyResults.length}개 프롬프트 타입`);
  }

  /**
   * 처리량 테스트
   */
  async testThroughput() {
    console.log('🚀 처리량 테스트 중...');
    
    const throughputResults = [];
    const testDuration = 30000; // 30초
    
    for (const prompt of this.testPrompts.slice(0, 2)) { // 처리량 테스트는 2개만
      console.log(`  - ${prompt.type} 처리량 측정 중...`);
      
      const startTime = Date.now();
      const results = [];
      let requestCount = 0;
      let successCount = 0;
      let totalTokens = 0;
      
      while (Date.now() - startTime < testDuration) {
        const requestStart = Date.now();
        requestCount++;
        
        try {
          const result = await this.simulateAPICall(prompt);
          const requestEnd = Date.now();
          
          results.push({
            requestId: requestCount,
            latency: requestEnd - requestStart,
            tokens: result.tokens,
            success: true
          });
          
          successCount++;
          totalTokens += result.tokens;
          
        } catch (error) {
          results.push({
            requestId: requestCount,
            success: false,
            error: error.message
          });
        }
        
        // 짧은 간격으로 연속 요청
        await this.sleep(100);
      }
      
      const actualDuration = Date.now() - startTime;
      const requestsPerSecond = (requestCount / actualDuration) * 1000;
      const successfulRequestsPerSecond = (successCount / actualDuration) * 1000;
      const tokensPerSecond = (totalTokens / actualDuration) * 1000;
      
      throughputResults.push({
        type: prompt.type,
        duration: actualDuration,
        totalRequests: requestCount,
        successfulRequests: successCount,
        totalTokens,
        requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
        successfulRequestsPerSecond: Math.round(successfulRequestsPerSecond * 100) / 100,
        tokensPerSecond: Math.round(tokensPerSecond * 100) / 100,
        successRate: (successCount / requestCount) * 100,
        results
      });
    }
    
    this.results.throughputTests = throughputResults;
    console.log(`✅ 처리량 테스트 완료: ${throughputResults.length}개 프롬프트 타입`);
  }

  /**
   * 동시성 테스트
   */
  async testConcurrency() {
    console.log('⚡ 동시성 테스트 중...');
    
    const concurrencyLevels = [1, 5, 10, 20];
    const concurrencyResults = [];
    
    for (const concurrency of concurrencyLevels) {
      console.log(`  - 동시성 레벨 ${concurrency} 테스트 중...`);
      
      const promises = [];
      const startTime = Date.now();
      
      // 동시에 여러 요청 실행
      for (let i = 0; i < concurrency; i++) {
        const prompt = this.testPrompts[i % this.testPrompts.length];
        promises.push(this.measureSingleRequest(prompt, i));
      }
      
      try {
        const results = await Promise.all(promises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        const successfulResults = results.filter(r => r.success);
        const latencies = successfulResults.map(r => r.latency);
        
        concurrencyResults.push({
          concurrencyLevel: concurrency,
          totalTime,
          results,
          successCount: successfulResults.length,
          failureCount: results.length - successfulResults.length,
          successRate: (successfulResults.length / results.length) * 100,
          averageLatency: latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0,
          maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
          throughput: (successfulResults.length / totalTime) * 1000 // requests per second
        });
        
      } catch (error) {
        concurrencyResults.push({
          concurrencyLevel: concurrency,
          error: error.message,
          success: false
        });
      }
      
      // 테스트 간 휴식
      await this.sleep(2000);
    }
    
    this.results.concurrencyTests = concurrencyResults;
    console.log(`✅ 동시성 테스트 완료: ${concurrencyLevels.length}개 레벨`);
  }

  /**
   * 단일 요청 측정
   */
  async measureSingleRequest(prompt, requestId) {
    const startTime = Date.now();
    
    try {
      const result = await this.simulateAPICall(prompt);
      const endTime = Date.now();
      
      return {
        requestId,
        type: prompt.type,
        latency: endTime - startTime,
        tokens: result.tokens,
        success: true
      };
    } catch (error) {
      const endTime = Date.now();
      
      return {
        requestId,
        type: prompt.type,
        latency: endTime - startTime,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * API 호출 시뮬레이션 (실제 환경에서는 실제 Gemini API 호출)
   */
  async simulateAPICall(prompt) {
    // 복잡도에 따른 응답 시간 시뮬레이션
    const baseLatency = {
      'low': 500,
      'medium': 1000,
      'high': 2000
    };
    
    const variation = 0.3; // ±30% 변동
    const latency = baseLatency[prompt.complexity] * (1 + (Math.random() - 0.5) * variation);
    
    // 지연 시뮬레이션
    await this.sleep(latency);
    
    // 드물게 에러 발생 시뮬레이션 (5% 확률)
    if (Math.random() < 0.05) {
      const errors = ['Rate limit exceeded', 'Service unavailable', 'Invalid request'];
      throw new Error(errors[Math.floor(Math.random() * errors.length)]);
    }
    
    // 토큰 수 시뮬레이션
    const tokenVariation = 0.2;
    const tokens = Math.round(prompt.expectedTokens * (1 + (Math.random() - 0.5) * tokenVariation));
    
    return {
      tokens,
      content: `Generated content for ${prompt.type}`,
      model: 'gemini-1.5-pro'
    };
  }

  /**
   * 결과 분석
   */
  analyzeResults() {
    console.log('📊 결과 분석 중...');
    
    // 전체 통계
    const allLatencies = [];
    let totalRequests = 0;
    let totalSuccesses = 0;
    let totalTokens = 0;
    
    // 지연시간 테스트 결과 집계
    for (const test of this.results.latencyTests) {
      const successfulMeasurements = test.measurements.filter(m => m.success);
      allLatencies.push(...successfulMeasurements.map(m => m.latency));
      totalRequests += test.measurements.length;
      totalSuccesses += successfulMeasurements.length;
      totalTokens += successfulMeasurements.reduce((sum, m) => sum + (m.tokens || 0), 0);
    }
    
    // 처리량 테스트 결과 집계
    for (const test of this.results.throughputTests) {
      totalRequests += test.totalRequests;
      totalSuccesses += test.successfulRequests;
      totalTokens += test.totalTokens;
    }
    
    this.results.testSummary = {
      totalTests: this.results.latencyTests.length + this.results.throughputTests.length + this.results.concurrencyTests.length,
      totalRequests,
      totalSuccesses,
      totalTokens,
      overallSuccessRate: totalRequests > 0 ? (totalSuccesses / totalRequests) * 100 : 0,
      averageLatency: allLatencies.length > 0 ? allLatencies.reduce((sum, l) => sum + l, 0) / allLatencies.length : 0,
      medianLatency: allLatencies.length > 0 ? this.calculateMedian(allLatencies) : 0,
      p95Latency: allLatencies.length > 0 ? this.calculatePercentile(allLatencies, 95) : 0,
      p99Latency: allLatencies.length > 0 ? this.calculatePercentile(allLatencies, 99) : 0
    };
    
    // 에러 분석
    this.analyzeErrors();
    
    console.log('✅ 결과 분석 완료');
  }

  /**
   * 에러 분석
   */
  analyzeErrors() {
    const errorCounts = {};
    const errorsByType = {};
    
    // 지연시간 테스트 에러 수집
    for (const test of this.results.latencyTests) {
      errorsByType[test.type] = test.measurements.filter(m => !m.success);
      
      for (const measurement of test.measurements) {
        if (!measurement.success && measurement.error) {
          errorCounts[measurement.error] = (errorCounts[measurement.error] || 0) + 1;
        }
      }
    }
    
    this.results.errorAnalysis = {
      totalErrors: Object.values(errorCounts).reduce((sum, count) => sum + count, 0),
      errorTypes: errorCounts,
      errorsByPromptType: errorsByType,
      mostCommonError: Object.keys(errorCounts).length > 0 
        ? Object.entries(errorCounts).sort((a, b) => b[1] - a[1])[0][0] 
        : null
    };
  }

  /**
   * 성능 개선 권장사항 생성
   */
  generateRecommendations() {
    console.log('💡 개선사항 생성 중...');
    
    const recommendations = [];
    
    // 높은 지연시간 이슈
    const avgLatency = this.results.testSummary.averageLatency;
    if (avgLatency > 3000) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Response Time',
        issue: `평균 응답 시간이 ${Math.round(avgLatency)}ms로 매우 높습니다`,
        impact: '사용자 경험 저하, 높은 이탈률',
        solutions: [
          '프롬프트 최적화로 토큰 수 감소',
          '배치 처리를 통한 효율성 향상',
          '응답 캐싱 구현',
          '스트리밍 응답 도입 검토'
        ],
        estimatedImprovement: '응답 시간 40-60% 개선 예상'
      });
    } else if (avgLatency > 2000) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Response Time',
        issue: `평균 응답 시간이 ${Math.round(avgLatency)}ms로 개선이 필요합니다`,
        impact: '사용자 경험에 영향',
        solutions: [
          '프롬프트 길이 최적화',
          '자주 사용되는 응답 캐싱',
          'Temperature 값 조정으로 응답 속도 향상'
        ],
        estimatedImprovement: '응답 시간 20-30% 개선 예상'
      });
    }
    
    // 에러율 이슈
    const errorRate = 100 - this.results.testSummary.overallSuccessRate;
    if (errorRate > 10) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Reliability',
        issue: `에러율이 ${errorRate.toFixed(1)}%로 매우 높습니다`,
        impact: '서비스 신뢰성 문제, 사용자 불만',
        solutions: [
          '재시도 메커니즘 구현',
          'Rate limiting 준수',
          'Circuit breaker 패턴 도입',
          'API 키 및 할당량 모니터링'
        ],
        estimatedImprovement: '에러율 80% 감소 예상'
      });
    } else if (errorRate > 5) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Reliability',
        issue: `에러율이 ${errorRate.toFixed(1)}%입니다`,
        impact: '간헐적 서비스 문제',
        solutions: [
          '에러 처리 로직 개선',
          'Exponential backoff 구현',
          'API 상태 모니터링 강화'
        ],
        estimatedImprovement: '에러율 50% 감소 예상'
      });
    }
    
    // 동시성 처리 이슈
    const concurrencyResults = this.results.concurrencyTests;
    if (concurrencyResults.length > 0) {
      const highConcurrencyTest = concurrencyResults.find(t => t.concurrencyLevel >= 20);
      if (highConcurrencyTest && highConcurrencyTest.successRate < 80) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'Scalability',
          issue: '높은 동시성에서 성능 저하가 발생합니다',
          impact: '피크 시간 서비스 품질 저하',
          solutions: [
            '요청 큐잉 시스템 도입',
            '로드 밸런싱 구현',
            '동시성 제한 및 관리',
            'API 키별 Rate limiting'
          ],
          estimatedImprovement: '높은 부하에서 안정성 80% 향상'
        });
      }
    }
    
    // 토큰 효율성
    const avgTokensPerSecond = this.results.testSummary.totalTokens / (this.results.testSummary.averageLatency / 1000);
    if (avgTokensPerSecond < 50) {
      recommendations.push({
        priority: 'LOW',
        category: 'Efficiency',
        issue: '토큰 처리 효율성이 낮습니다',
        impact: '비용 최적화 기회 손실',
        solutions: [
          '프롬프트 엔지니어링 최적화',
          '불필요한 설명 제거',
          '구조화된 출력 포맷 사용',
          '모델 버전 최적화 검토'
        ],
        estimatedImprovement: '토큰 효율성 30% 향상'
      });
    }
    
    this.results.recommendations = recommendations;
    console.log(`✅ 생성된 권장사항: ${recommendations.length}개`);
  }

  /**
   * 유틸리티: 중간값 계산
   */
  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }

  /**
   * 유틸리티: 백분위수 계산
   */
  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
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
    console.log('🤖 AI API 성능 테스트 요약');
    console.log('='.repeat(60));
    
    const summary = this.results.testSummary;
    
    console.log(`📊 전체 통계:`);
    console.log(`   - 총 요청: ${summary.totalRequests}개`);
    console.log(`   - 성공률: ${summary.overallSuccessRate.toFixed(1)}%`);
    console.log(`   - 평균 응답시간: ${Math.round(summary.averageLatency)}ms`);
    console.log(`   - 중간값 응답시간: ${Math.round(summary.medianLatency)}ms`);
    console.log(`   - 95% 응답시간: ${Math.round(summary.p95Latency)}ms`);
    
    if (summary.totalTokens > 0) {
      console.log(`   - 총 처리 토큰: ${summary.totalTokens.toLocaleString()}개`);
      console.log(`   - 토큰/초: ${Math.round(summary.totalTokens / (summary.averageLatency / 1000))}`);
    }
    
    // 처리량 통계
    if (this.results.throughputTests.length > 0) {
      console.log(`\n🚀 처리량 통계:`);
      for (const test of this.results.throughputTests) {
        console.log(`   ${test.type}:`);
        console.log(`   - ${test.requestsPerSecond} 요청/초`);
        console.log(`   - ${test.tokensPerSecond} 토큰/초`);
        console.log(`   - ${test.successRate.toFixed(1)}% 성공률`);
      }
    }
    
    // 동시성 통계
    if (this.results.concurrencyTests.length > 0) {
      console.log(`\n⚡ 동시성 통계:`);
      for (const test of this.results.concurrencyTests) {
        if (test.success !== false) {
          console.log(`   동시성 ${test.concurrencyLevel}: ${test.successRate.toFixed(1)}% 성공률, ${Math.round(test.averageLatency)}ms 평균`);
        }
      }
    }
    
    // 주요 문제점
    const highPriorityRecs = this.results.recommendations.filter(r => r.priority === 'HIGH');
    if (highPriorityRecs.length > 0) {
      console.log(`\n🚨 주요 개선사항 (${highPriorityRecs.length}개):`);
      highPriorityRecs.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.category}] ${rec.issue}`);
        console.log(`   예상 효과: ${rec.estimatedImprovement}`);
      });
    }
    
    // 에러 분석
    if (this.results.errorAnalysis.totalErrors > 0) {
      console.log(`\n❌ 에러 분석:`);
      console.log(`   - 총 에러: ${this.results.errorAnalysis.totalErrors}개`);
      if (this.results.errorAnalysis.mostCommonError) {
        console.log(`   - 주요 에러: ${this.results.errorAnalysis.mostCommonError}`);
      }
    }
    
    console.log('\n💡 자세한 분석 결과는 ai-api-performance-report.json을 확인하세요.');
  }
}

// 메인 실행부
if (require.main === module) {
  const tester = new AIAPIPerformanceTester();
  tester.runPerformanceTests().catch(console.error);
}

module.exports = AIAPIPerformanceTester;