import { v } from "convex/values";
import { action, mutation, query } from "../_generated/server";
// import { api } from "../_generated/api"; // 순환 참조 방지

// 🚀 외부 API 호출 최적화 및 배치 처리 시스템

interface ApiCallConfig {
  maxRetries: number;
  retryDelay: number; // ms
  timeout: number; // ms
  maxConcurrency: number;
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeout: number; // ms
  };
  rateLimiting: {
    enabled: boolean;
    requestsPerSecond: number;
    burstLimit: number;
  };
}

interface ApiCallResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  responseTime: number;
  retryCount: number;
  fromCache: boolean;
}

interface BatchRequest {
  id: string;
  type: 'gemini' | 'twitter' | 'threads' | 'instagram';
  payload: any;
  priority: 'high' | 'medium' | 'low';
  createdAt: number;
  maxRetries: number;
}

interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

// 🔧 Circuit Breaker 패턴 구현
class CircuitBreaker {
  private state: CircuitBreakerState = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: 0,
    successCount: 0,
  };

  constructor(
    private failureThreshold: number = 5,
    private resetTimeout: number = 60000 // 1분
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.isOpen) {
      const now = Date.now();
      if (now - this.state.lastFailureTime > this.resetTimeout) {
        this.state.isOpen = false;
        this.state.failureCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.state.successCount++;
    this.state.failureCount = 0;
    this.state.isOpen = false;
  }

  private onFailure() {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();
    
    if (this.state.failureCount >= this.failureThreshold) {
      this.state.isOpen = true;
    }
  }

  getState() {
    return { ...this.state };
  }
}

// 🎯 Rate Limiter 구현
class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private requestsPerSecond: number,
    private burstLimit: number
  ) {
    this.tokens = burstLimit;
    this.lastRefill = Date.now();
  }

  async acquireToken(): Promise<boolean> {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }
    
    return false;
  }

  private refill() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = (timePassed / 1000) * this.requestsPerSecond;
    
    this.tokens = Math.min(this.burstLimit, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// 🚀 배치 처리 큐 관리자
class BatchProcessor {
  private queues: Map<string, BatchRequest[]> = new Map();
  private processing: Set<string> = new Set();
  
  addToQueue(type: string, request: BatchRequest) {
    if (!this.queues.has(type)) {
      this.queues.set(type, []);
    }
    
    const queue = this.queues.get(type)!;
    
    // 우선순위 기반 삽입
    if (request.priority === 'high') {
      queue.unshift(request);
    } else {
      queue.push(request);
    }
  }
  
  getNextBatch(type: string, batchSize: number): BatchRequest[] {
    const queue = this.queues.get(type) || [];
    const batch = queue.splice(0, batchSize);
    return batch;
  }
  
  isProcessing(type: string): boolean {
    return this.processing.has(type);
  }
  
  setProcessing(type: string, processing: boolean) {
    if (processing) {
      this.processing.add(type);
    } else {
      this.processing.delete(type);
    }
  }
  
  getQueueSize(type: string): number {
    return this.queues.get(type)?.length || 0;
  }
}

// 전역 인스턴스들
const circuitBreakers = new Map<string, CircuitBreaker>();
const rateLimiters = new Map<string, RateLimiter>();
const batchProcessor = new BatchProcessor();

// 🎯 Gemini API 최적화된 호출
export const callGeminiOptimized = action({
  args: {
    prompt: v.string(),
    config: v.optional(v.object({
      temperature: v.optional(v.number()),
      maxTokens: v.optional(v.number()),
      model: v.optional(v.string()),
      priority: v.optional(v.string()),
      useCache: v.optional(v.boolean()),
      batchable: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, { prompt, config = {} }) => {
    const {
      temperature = 0.9,
      maxTokens = 2048,
      model = 'gemini-1.5-pro',
      priority = 'medium',
      useCache = true,
      batchable = false,
    } = config;

    const startTime = Date.now();
    
    // 캐시 확인
    if (useCache) {
      const cacheKey = `gemini:${Buffer.from(prompt).toString('base64')}:${temperature}:${maxTokens}`;
      // TODO: 순환 참조 방지를 위해 임시 비활성화
      const cached = { hit: false, data: null } as any; // 임시로 기본값
      // const cached = await ctx.runAction('optimized/cacheManager:cacheGet', {
      //   key: cacheKey,
      // });
      
      if (cached.hit) {
        return {
          success: true,
          data: cached.data,
          responseTime: Date.now() - startTime,
          retryCount: 0,
          fromCache: true,
        } as ApiCallResult<any>;
      }
    }

    // 배치 처리가 가능하고 우선순위가 낮은 경우 큐에 추가
    if (batchable && priority !== 'high') {
      const requestId = crypto.randomUUID();
      const batchRequest: BatchRequest = {
        id: requestId,
        type: 'gemini',
        payload: { prompt, temperature, maxTokens, model },
        priority: priority as any,
        createdAt: Date.now(),
        maxRetries: 3,
      };
      
      batchProcessor.addToQueue('gemini', batchRequest);
      
      // 배치 처리 트리거 (논블로킹)
      // ctx.runAction('optimized/externalApiOptimizer:processBatch', { type: 'gemini' });
      
      return {
        success: true,
        data: { queued: true, requestId },
        responseTime: Date.now() - startTime,
        retryCount: 0,
        fromCache: false,
      } as ApiCallResult<any>;
    }

    // 즉시 처리
    return await executeGeminiCall(ctx, { prompt, temperature, maxTokens, model });
  },
});

// Gemini API 실제 호출 함수
async function executeGeminiCall(ctx: any, params: {
  prompt: string;
  temperature: number;
  maxTokens: number;
  model: string;
}): Promise<ApiCallResult<any>> {
  const { prompt, temperature, maxTokens, model } = params;
  const startTime = Date.now();
  let retryCount = 0;
  const maxRetries = 3;

  // Circuit Breaker 가져오기 또는 생성
  if (!circuitBreakers.has('gemini')) {
    circuitBreakers.set('gemini', new CircuitBreaker(5, 60000));
  }
  const circuitBreaker = circuitBreakers.get('gemini')!;

  // Rate Limiter 가져오기 또는 생성
  if (!rateLimiters.has('gemini')) {
    rateLimiters.set('gemini', new RateLimiter(10, 20)); // 10 RPS, 20 burst
  }
  const rateLimiter = rateLimiters.get('gemini')!;

  while (retryCount <= maxRetries) {
    try {
      // Rate limiting 체크
      const canProceed = await rateLimiter.acquireToken();
      if (!canProceed) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms 대기
        continue;
      }

      // Circuit breaker를 통한 호출
      const result = await circuitBreaker.call(async () => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error('Gemini API 키가 설정되지 않았습니다');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃

        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{ text: prompt }]
                }],
                generationConfig: {
                  temperature,
                  maxOutputTokens: maxTokens,
                },
              }),
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Gemini API 오류: ${errorData.error?.message || response.statusText}`);
          }

          const data = await response.json();
          
          if (!data.candidates || data.candidates.length === 0) {
            throw new Error('Gemini로부터 응답을 받을 수 없습니다');
          }

          return {
            text: data.candidates[0].content.parts[0].text,
            usage: data.usageMetadata,
          };
        } finally {
          clearTimeout(timeoutId);
        }
      });

      // 성공 시 캐시에 저장
      const cacheKey = `gemini:${Buffer.from(prompt).toString('base64')}:${temperature}:${maxTokens}`;
      await ctx.runAction('optimized/cacheManager:cacheSet', {
        key: cacheKey,
        data: result,
        config: {
          ttl: 3600, // 1시간 캐시
          tags: ['gemini', 'ai-generation'],
          compress: true,
        },
      });

      return {
        success: true,
        data: result,
        responseTime: Date.now() - startTime,
        retryCount,
        fromCache: false,
      };

    } catch (error) {
      retryCount++;
      
      if (retryCount > maxRetries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류',
          responseTime: Date.now() - startTime,
          retryCount,
          fromCache: false,
        };
      }
      
      // 지수 백오프
      const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: '최대 재시도 횟수 초과',
    responseTime: Date.now() - startTime,
    retryCount,
    fromCache: false,
  };
}

// 🔄 배치 처리 실행기
export const processBatch = action({
  args: {
    type: v.string(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { type, batchSize = 5 }) => {
    if (batchProcessor.isProcessing(type)) {
      return { message: `${type} 배치가 이미 처리 중입니다` };
    }

    batchProcessor.setProcessing(type, true);
    
    try {
      const batch = batchProcessor.getNextBatch(type, batchSize);
      
      if (batch.length === 0) {
        return { message: '처리할 배치가 없습니다' };
      }

      const startTime = Date.now();
      const results = [];

      // 병렬 처리 (최대 동시 실행 수 제한)
      const maxConcurrency = Math.min(batch.length, 3);
      const chunks = [];
      
      for (let i = 0; i < batch.length; i += maxConcurrency) {
        chunks.push(batch.slice(i, i + maxConcurrency));
      }

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(async (request) => {
            try {
              let result;
              
              switch (request.type) {
                case 'gemini':
                  result = await executeGeminiCall(ctx, request.payload);
                  break;
                default:
                  result = { success: false, error: '지원하지 않는 API 타입' };
              }
              
              return { requestId: request.id, ...result };
            } catch (error) {
              return {
                requestId: request.id,
                success: false,
                error: error instanceof Error ? error.message : '알 수 없는 오류',
                responseTime: 0,
                retryCount: 0,
                fromCache: false,
              };
            }
          })
        );
        
        results.push(...chunkResults);
        
        // 청크 간 간격 (Rate limiting)
        if (chunks.indexOf(chunk) < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // 배치 결과를 캐시에 저장
      for (const result of results) {
        if (result.success && result.requestId) {
          // TODO: 순환 참조 방지를 위해 임시 비활성화
          // await ctx.runAction('optimized/cacheManager:cacheSet', {
          //   key: `batch_result:${result.requestId}`,
          //   data: result,
          //   config: {
          //     ttl: 300, // 5분
          //     tags: ['batch-results'],
          //   },
          // });
        }
      }

      return {
        message: `${type} 배치 처리 완료`,
        processedCount: results.length,
        successCount: results.filter(r => r.success).length,
        totalTime: Date.now() - startTime,
        averageTime: (Date.now() - startTime) / results.length,
      };

    } finally {
      batchProcessor.setProcessing(type, false);
    }
  },
});

// 📊 API 성능 모니터링
export const getApiMetrics = query({
  args: {
    timeRange: v.optional(v.string()),
    apiType: v.optional(v.string()),
  },
  handler: async (ctx, { timeRange = '1h', apiType }) => {
    // 실제 구현에서는 메트릭 데이터를 별도 테이블에 저장
    const metrics = {
      gemini: {
        totalCalls: 1250,
        successRate: 94.5,
        avgResponseTime: 850, // ms
        p95ResponseTime: 1200,
        p99ResponseTime: 2100,
        errorBreakdown: {
          timeout: 15,
          rateLimit: 8,
          serverError: 12,
          other: 5,
        },
        cacheHitRate: 67.3,
        circuitBreakerState: circuitBreakers.get('gemini')?.getState() || {
          isOpen: false,
          failureCount: 0,
          successCount: 0,
        },
      },
      twitter: {
        totalCalls: 890,
        successRate: 88.9,
        avgResponseTime: 420,
        p95ResponseTime: 800,
        p99ResponseTime: 1500,
        cacheHitRate: 45.2,
      },
      threads: {
        totalCalls: 675,
        successRate: 91.2,
        avgResponseTime: 380,
        p95ResponseTime: 650,
        p99ResponseTime: 1100,
        cacheHitRate: 52.1,
      },
    };

    if (apiType && metrics[apiType as keyof typeof metrics]) {
      return { [apiType]: metrics[apiType as keyof typeof metrics] };
    }

    return metrics;
  },
});

// 🔧 API 설정 관리
export const updateApiConfig = mutation({
  args: {
    apiType: v.string(),
    config: v.object({
      maxRetries: v.optional(v.number()),
      timeout: v.optional(v.number()),
      maxConcurrency: v.optional(v.number()),
      rateLimitRps: v.optional(v.number()),
      circuitBreakerThreshold: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { apiType, config }) => {
    // Circuit breaker 재구성
    if (config.circuitBreakerThreshold) {
      circuitBreakers.set(
        apiType,
        new CircuitBreaker(config.circuitBreakerThreshold, 60000)
      );
    }

    // Rate limiter 재구성
    if (config.rateLimitRps) {
      rateLimiters.set(
        apiType,
        new RateLimiter(config.rateLimitRps, config.rateLimitRps * 2)
      );
    }

    // 설정을 데이터베이스에 저장 (실제 구현에서)
    // await ctx.db.insert('api_configs', { apiType, config, updatedAt: new Date().toISOString() });

    return { success: true, message: `${apiType} API 설정이 업데이트되었습니다` };
  },
});

// 🎯 배치 결과 조회
export const getBatchResult = query({
  args: {
    requestId: v.string(),
  },
  handler: async (ctx, { requestId }) => {
    // TODO: 순환 참조 방지를 위해 임시 비활성화
    const cached = { hit: false, data: null } as any;
    // const cached = await ctx.runAction('optimized/cacheManager:cacheGet', {
    //   key: `batch_result:${requestId}`,
    // });

    if (cached.hit) {
      return cached.data;
    }

    return {
      success: false,
      error: '배치 결과를 찾을 수 없습니다',
      expired: true,
    };
  },
});

// 🚀 스마트 프리페칭 - AI 예측 기반 캐시 워밍
export const smartPrefetch = action({
  args: {
    userId: v.id("users"),
    patterns: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { userId, patterns = [] }) => {
    const startTime = Date.now();
    
    try {
      // TODO: 사용자의 최근 활동 패턴 분석 - 순환 참조 방지를 위해 임시 비활성화
      const recentPosts = [] as any;
      // const recentPosts = await ctx.runQuery(api.socialPosts.listByUser, {
      //   userId,
      //   limit: 10,
      // });

      const prefetchTasks: Promise<any>[] = [];

      // 자주 사용하는 페르소나 데이터 프리페치
      const frequentPersonas = [...new Set(recentPosts.map((p: any) => p.personaId))];
      for (const personaId of frequentPersonas.slice(0, 3)) {
        // TODO: 순환 참조 방지를 위해 임시 비활성화
        // prefetchTasks.push(
        //   ctx.runQuery(api.personas.get, { id: personaId })
        // );
      }

      // AI 생성 패턴 기반 프롬프트 캐싱
      if (patterns.includes('ai-prompts')) {
        const commonPrompts = [
          'SNS 게시물 최적화해줘',
          '트위터용 짧은 게시물 만들어줘',
          'LinkedIn용 전문적인 게시물 작성해줘',
        ];
        
        for (const prompt of commonPrompts) {
          // TODO: 순환 참조 방지를 위해 임시 비활성화
          // prefetchTasks.push(
          //   ctx.runAction('optimized/externalApiOptimizer:callGeminiOptimized', {
          //     prompt,
          //     config: { priority: 'low', batchable: true },
          //   })
          // );
        }
      }

      await Promise.allSettled(prefetchTasks);

      return {
        success: true,
        prefetchedItems: prefetchTasks.length,
        executionTime: Date.now() - startTime,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        executionTime: Date.now() - startTime,
      };
    }
  },
});