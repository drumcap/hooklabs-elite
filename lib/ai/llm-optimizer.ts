/**
 * LLM Optimization Module
 * 비용 최적화, 캐싱, 스트리밍 구현
 */

import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

/**
 * LLM 응답 캐시
 */
export class LLMResponseCache {
  private cache: LRUCache<string, CachedResponse>;
  private hits = 0;
  private misses = 0;
  
  constructor(options?: {
    maxSize?: number;  // 최대 캐시 항목 수
    ttl?: number;      // Time to live (ms)
    maxMemory?: number; // 최대 메모리 (bytes)
  }) {
    this.cache = new LRUCache({
      max: options?.maxSize || 500,
      ttl: options?.ttl || 1000 * 60 * 60, // 1시간 기본값
      maxSize: options?.maxMemory || 100 * 1024 * 1024, // 100MB
      sizeCalculation: (value) => {
        return JSON.stringify(value).length;
      },
    });
  }
  
  /**
   * 캐시 키 생성
   */
  private generateKey(
    prompt: string,
    model: string,
    temperature: number,
    maxTokens: number
  ): string {
    const hash = crypto.createHash('sha256');
    hash.update(`${model}:${temperature}:${maxTokens}:${prompt}`);
    return hash.digest('hex');
  }
  
  /**
   * 캐시에서 응답 가져오기
   */
  get(
    prompt: string,
    model: string,
    temperature: number,
    maxTokens: number
  ): CachedResponse | undefined {
    // temperature가 0일 때만 캐싱 (deterministic)
    if (temperature > 0) return undefined;
    
    const key = this.generateKey(prompt, model, temperature, maxTokens);
    const result = this.cache.get(key);
    
    if (result) {
      this.hits++;
    } else {
      this.misses++;
    }
    
    return result;
  }
  
  /**
   * 캐시에 응답 저장
   */
  set(
    prompt: string,
    model: string,
    temperature: number,
    maxTokens: number,
    response: string,
    metadata?: any
  ): void {
    // temperature가 0일 때만 캐싱
    if (temperature > 0) return;
    
    const key = this.generateKey(prompt, model, temperature, maxTokens);
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      metadata,
    });
  }
  
  /**
   * 캐시 통계
   */
  getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits / (this.hits + this.misses) || 0,
    };
  }
  
  /**
   * 캐시 초기화
   */
  clear(): void {
    this.cache.clear();
  }
}

interface CachedResponse {
  response: string;
  timestamp: number;
  metadata?: any;
}

/**
 * 스트리밍 응답 처리
 */
export class StreamingHandler {
  private decoder = new TextDecoder();
  
  /**
   * SSE (Server-Sent Events) 스트림 파싱
   */
  async *parseSSEStream(
    stream: ReadableStream<Uint8Array>
  ): AsyncGenerator<string, void, unknown> {
    const reader = stream.getReader();
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += this.decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // 마지막 줄은 불완전할 수 있으므로 버퍼에 유지
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = this.extractContent(parsed);
              if (content) {
                yield content;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  /**
   * 콘텐츠 추출 (모델별 차이 처리)
   */
  private extractContent(data: any): string | null {
    // OpenAI 형식
    if (data.choices?.[0]?.delta?.content) {
      return data.choices[0].delta.content;
    }
    
    // Anthropic 형식
    if (data.delta?.text) {
      return data.delta.text;
    }
    
    // Google 형식
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    
    return null;
  }
  
  /**
   * 스트림을 문자열로 수집
   */
  async collectStream(
    stream: AsyncGenerator<string, void, unknown>
  ): Promise<string> {
    let result = '';
    for await (const chunk of stream) {
      result += chunk;
    }
    return result;
  }
}

/**
 * 비용 최적화 전략
 */
export class CostOptimizer {
  private modelCosts = {
    'gpt-4-turbo': { input: 0.01, output: 0.03 },    // per 1K tokens
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
    'gemini-1.5-flash': { input: 0.00025, output: 0.001 },
  };
  
  /**
   * 최적 모델 선택
   */
  selectOptimalModel(
    task: 'simple' | 'moderate' | 'complex',
    budget: number,
    estimatedTokens: { input: number; output: number }
  ): string {
    const candidates = this.getModelCandidates(task);
    
    // 예상 비용 계산
    const costs = candidates.map(model => ({
      model,
      cost: this.calculateCost(model, estimatedTokens),
    }));
    
    // 예산 내에서 최고 성능 모델 선택
    const affordable = costs.filter(c => c.cost <= budget);
    
    if (affordable.length === 0) {
      // 예산 초과 시 가장 저렴한 모델
      return costs.sort((a, b) => a.cost - b.cost)[0].model;
    }
    
    // 예산 내 최고 성능 모델 (리스트 순서가 성능 순)
    return affordable[0].model;
  }
  
  /**
   * 작업별 모델 후보
   */
  private getModelCandidates(task: string): string[] {
    switch (task) {
      case 'simple':
        return ['gemini-1.5-flash', 'gpt-3.5-turbo'];
      case 'moderate':
        return ['gemini-1.5-pro', 'claude-3-sonnet', 'gpt-3.5-turbo'];
      case 'complex':
        return ['gpt-4-turbo', 'claude-3-opus', 'gemini-1.5-pro'];
      default:
        return ['gemini-1.5-flash'];
    }
  }
  
  /**
   * 비용 계산
   */
  calculateCost(
    model: string,
    tokens: { input: number; output: number }
  ): number {
    const costs = this.modelCosts[model as keyof typeof this.modelCosts];
    if (!costs) return Infinity;
    
    return (tokens.input * costs.input + tokens.output * costs.output) / 1000;
  }
  
  /**
   * 프롬프트 압축 (토큰 절약)
   */
  compressPrompt(prompt: string): string {
    let compressed = prompt;
    
    // 1. 중복 공백 제거
    compressed = compressed.replace(/\s+/g, ' ');
    
    // 2. 불필요한 줄바꿈 제거
    compressed = compressed.replace(/\n{3,}/g, '\n\n');
    
    // 3. 예시가 너무 많으면 줄이기
    const examples = compressed.match(/Example \d+:/gi) || [];
    if (examples.length > 3) {
      // 처음 3개만 유지
      const examplePattern = /Example \d+:.*?(?=Example \d+:|$)/gi;
      const allExamples = compressed.match(examplePattern) || [];
      if (allExamples.length > 3) {
        const kept = allExamples.slice(0, 3).join('\n');
        const firstExample = allExamples[0];
        const idx = firstExample ? compressed.indexOf(firstExample) : -1;
        if (idx !== -1) {
          compressed = compressed.substring(0, idx) + kept + 
                      '\n[Additional examples omitted for brevity]';
        }
      }
    }
    
    return compressed.trim();
  }
}

/**
 * Fallback 전략 관리
 */
export class FallbackStrategy {
  private providers: LLMProvider[] = [];
  
  /**
   * Provider 추가
   */
  addProvider(provider: LLMProvider): void {
    this.providers.push(provider);
  }
  
  /**
   * Fallback 체인 실행
   */
  async execute(prompt: string, options: any): Promise<string> {
    const errors: Error[] = [];
    
    for (const provider of this.providers) {
      try {
        // 타임아웃 설정
        const result = await this.withTimeout(
          provider.generate(prompt, options),
          provider.timeout || 30000
        );
        
        // 성공 시 반환
        return result;
      } catch (error) {
        errors.push(error as Error);
        console.error(`Provider ${provider.name} failed:`, error);
        
        // 다음 provider로 fallback
        continue;
      }
    }
    
    // 모든 provider 실패
    throw new Error(`All providers failed: ${errors.map(e => e.message).join(', ')}`);
  }
  
  /**
   * 타임아웃 래퍼
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });
    
    return Promise.race([promise, timeout]);
  }
}

interface LLMProvider {
  name: string;
  generate: (prompt: string, options: any) => Promise<string>;
  timeout?: number;
}

/**
 * 배치 처리 최적화
 */
export class BatchProcessor {
  private queue: BatchItem[] = [];
  private processing = false;
  
  constructor(
    private batchSize: number = 10,
    private batchDelayMs: number = 1000
  ) {}
  
  /**
   * 요청 추가
   */
  async add(prompt: string, options: any): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ prompt, options, resolve, reject });
      
      if (!this.processing) {
        this.startProcessing();
      }
    });
  }
  
  /**
   * 배치 처리 시작
   */
  private async startProcessing(): Promise<void> {
    this.processing = true;
    
    while (this.queue.length > 0) {
      // 배치 크기만큼 또는 남은 전체 가져오기
      const batch = this.queue.splice(0, this.batchSize);
      
      // 배치가 가득 차지 않았으면 잠시 대기
      if (batch.length < this.batchSize && this.queue.length === 0) {
        await this.delay(this.batchDelayMs);
        
        // 대기 중 더 들어왔는지 확인
        const moreBatch = this.queue.splice(0, this.batchSize - batch.length);
        batch.push(...moreBatch);
      }
      
      // 배치 처리
      await this.processBatch(batch);
    }
    
    this.processing = false;
  }
  
  /**
   * 배치 처리 실행
   */
  private async processBatch(batch: BatchItem[]): Promise<void> {
    try {
      // 병렬 처리
      const promises = batch.map(item => 
        this.processItem(item).catch(error => {
          item.reject(error);
        })
      );
      
      await Promise.all(promises);
    } catch (error) {
      // 배치 전체 실패 처리
      batch.forEach(item => item.reject(error));
    }
  }
  
  /**
   * 개별 항목 처리
   */
  private async processItem(item: BatchItem): Promise<void> {
    // 실제 LLM 호출 (예시)
    const response = await this.callLLM(item.prompt, item.options);
    item.resolve(response);
  }
  
  /**
   * LLM 호출 (구현 필요)
   */
  private async callLLM(prompt: string, options: any): Promise<string> {
    // TODO: 실제 LLM API 호출
    return `Response for: ${prompt}`;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface BatchItem {
  prompt: string;
  options: any;
  resolve: (value: string) => void;
  reject: (error: any) => void;
}

// 통합 Export
export const LLMOptimizer = {
  ResponseCache: LLMResponseCache,
  StreamingHandler,
  CostOptimizer,
  FallbackStrategy,
  BatchProcessor,
};