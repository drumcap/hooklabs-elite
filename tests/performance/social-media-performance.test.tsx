import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConvexProvider } from 'convex/react';
import { ConvexReactClient } from 'convex/react';
import { VariantComparison } from '../../components/social/variants/VariantComparison';
import { TokenExpiryAlert } from '../../components/social/tokens/TokenExpiryAlert';
import { Id } from '../../convex/_generated/dataModel';

// 성능 측정 유틸리티
const measureRenderTime = (renderFn: () => void): number => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

// 메모리 사용량 측정 (가능한 경우)
const measureMemoryUsage = (): number | null => {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return null;
};

// Mock Convex hooks
const mockUseQuery = vi.fn();

vi.mock('convex/react', () => ({
  useQuery: () => mockUseQuery(),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ConvexReactClient: vi.fn(),
}));

// 대량의 테스트 데이터 생성
const generateLargeVariantDataset = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    _id: `variant-${index}`,
    content: `변형 ${index + 1}: ${'매우 '.repeat(10)}긴 콘텐츠입니다. #테스트 #성능 #AI ${'🚀'.repeat(5)}`,
    overallScore: Math.floor(Math.random() * 40) + 60, // 60-100 점수
    scoreBreakdown: {
      engagement: Math.floor(Math.random() * 40) + 60,
      virality: Math.floor(Math.random() * 40) + 60,
      personaMatch: Math.floor(Math.random() * 40) + 60,
      readability: Math.floor(Math.random() * 40) + 60,
      trending: Math.floor(Math.random() * 40) + 60,
    },
    isSelected: index === 0,
    aiModel: ['gpt-4', 'claude-3', 'gpt-3.5'][index % 3],
    generatedAt: new Date(Date.now() - index * 1000 * 60).toISOString(),
  }));
};

const generateLargeTokenDataset = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    _id: `token-${index}`,
    platform: ['twitter', 'instagram', 'linkedin', 'facebook'][index % 4],
    username: `user${index}`,
    displayName: `사용자 ${index + 1}`,
    tokenExpiresAt: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
  }));
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new ConvexReactClient('https://test.convex.cloud');
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
};

const mockPostId = 'test-post-id' as Id<'socialPosts'>;

describe('소셜 미디어 기능 성능 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('VariantComparison 성능 테스트', () => {
    it('소량의 변형 데이터 렌더링 성능을 측정해야 한다', () => {
      const smallDataset = generateLargeVariantDataset(5);
      
      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return smallDataset;
        if (api.toString().includes('getBestVariant')) return smallDataset[0];
        if (api.toString().includes('getAverageScores')) return {
          overallScore: 85,
          scoreBreakdown: { engagement: 85, virality: 85, personaMatch: 85, readability: 85, trending: 85 },
          variantCount: 5,
        };
        return undefined;
      });

      const renderTime = measureRenderTime(() => {
        render(
          <TestWrapper>
            <VariantComparison postId={mockPostId} />
          </TestWrapper>
        );
      });

      // 소량 데이터는 100ms 이내에 렌더링되어야 함
      expect(renderTime).toBeLessThan(100);
    });

    it('중간 규모 변형 데이터 렌더링 성능을 측정해야 한다', () => {
      const mediumDataset = generateLargeVariantDataset(25);
      
      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return mediumDataset;
        if (api.toString().includes('getBestVariant')) return mediumDataset[0];
        if (api.toString().includes('getAverageScores')) return {
          overallScore: 85,
          scoreBreakdown: { engagement: 85, virality: 85, personaMatch: 85, readability: 85, trending: 85 },
          variantCount: 25,
        };
        return undefined;
      });

      const renderTime = measureRenderTime(() => {
        render(
          <TestWrapper>
            <VariantComparison postId={mockPostId} />
          </TestWrapper>
        );
      });

      // 중간 규모 데이터는 300ms 이내에 렌더링되어야 함
      expect(renderTime).toBeLessThan(300);
    });

    it('대량의 변형 데이터 렌더링 성능을 측정해야 한다', () => {
      const largeDataset = generateLargeVariantDataset(100);
      
      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return largeDataset;
        if (api.toString().includes('getBestVariant')) return largeDataset[0];
        if (api.toString().includes('getAverageScores')) return {
          overallScore: 85,
          scoreBreakdown: { engagement: 85, virality: 85, personaMatch: 85, readability: 85, trending: 85 },
          variantCount: 100,
        };
        return undefined;
      });

      const renderTime = measureRenderTime(() => {
        render(
          <TestWrapper>
            <VariantComparison postId={mockPostId} />
          </TestWrapper>
        );
      });

      // 대량 데이터도 1초 이내에 렌더링되어야 함
      expect(renderTime).toBeLessThan(1000);
    });

    it('컴팩트 모드에서 성능이 향상되어야 한다', () => {
      const largeDataset = generateLargeVariantDataset(50);
      
      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return largeDataset;
        if (api.toString().includes('getBestVariant')) return largeDataset[0];
        if (api.toString().includes('getAverageScores')) return {
          overallScore: 85,
          scoreBreakdown: { engagement: 85, virality: 85, personaMatch: 85, readability: 85, trending: 85 },
          variantCount: 50,
        };
        return undefined;
      });

      // 일반 모드 렌더링 시간 측정
      const normalModeTime = measureRenderTime(() => {
        render(
          <TestWrapper>
            <VariantComparison postId={mockPostId} compact={false} />
          </TestWrapper>
        );
      });

      // 컴팩트 모드 렌더링 시간 측정
      const compactModeTime = measureRenderTime(() => {
        render(
          <TestWrapper>
            <VariantComparison postId={mockPostId} compact={true} />
          </TestWrapper>
        );
      });

      // 컴팩트 모드가 일반 모드보다 빠르거나 비슷해야 함
      expect(compactModeTime).toBeLessThanOrEqual(normalModeTime * 1.1); // 10% 여유
    });

    it('메모리 사용량이 적정 수준을 유지해야 한다', () => {
      const largeDataset = generateLargeVariantDataset(100);
      
      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return largeDataset;
        if (api.toString().includes('getBestVariant')) return largeDataset[0];
        if (api.toString().includes('getAverageScores')) return {
          overallScore: 85,
          scoreBreakdown: { engagement: 85, virality: 85, personaMatch: 85, readability: 85, trending: 85 },
          variantCount: 100,
        };
        return undefined;
      });

      const initialMemory = measureMemoryUsage();
      
      const { unmount } = render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      const afterRenderMemory = measureMemoryUsage();
      
      unmount();
      
      const afterUnmountMemory = measureMemoryUsage();

      if (initialMemory && afterRenderMemory && afterUnmountMemory) {
        const memoryIncrease = afterRenderMemory - initialMemory;
        const memoryLeaked = afterUnmountMemory - initialMemory;

        // 메모리 사용량 증가는 10MB 이하여야 함
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
        
        // 메모리 누수는 1MB 이하여야 함
        expect(memoryLeaked).toBeLessThan(1 * 1024 * 1024);
      }
    });
  });

  describe('TokenExpiryAlert 성능 테스트', () => {
    it('소량의 토큰 데이터 렌더링 성능을 측정해야 한다', () => {
      const smallTokens = generateLargeTokenDataset(3);
      mockUseQuery.mockReturnValue(smallTokens);

      const renderTime = measureRenderTime(() => {
        render(
          <TestWrapper>
            <TokenExpiryAlert />
          </TestWrapper>
        );
      });

      // 소량 토큰 데이터는 50ms 이내에 렌더링되어야 함
      expect(renderTime).toBeLessThan(50);
    });

    it('대량의 토큰 데이터 렌더링 성능을 측정해야 한다', () => {
      const largeTokens = generateLargeTokenDataset(50);
      mockUseQuery.mockReturnValue(largeTokens);

      const renderTime = measureRenderTime(() => {
        render(
          <TestWrapper>
            <TokenExpiryAlert />
          </TestWrapper>
        );
      });

      // 대량 토큰 데이터도 200ms 이내에 렌더링되어야 함
      expect(renderTime).toBeLessThan(200);
    });

    it('시간 계산 함수의 성능을 측정해야 한다', () => {
      const tokens = generateLargeTokenDataset(1000);
      mockUseQuery.mockReturnValue(tokens);

      const start = performance.now();
      
      render(
        <TestWrapper>
          <TokenExpiryAlert />
        </TestWrapper>
      );

      // DOM에서 시간 표시 요소들을 찾아 모든 계산이 완료되었는지 확인
      const timeElements = screen.getAllByText(/시간|분|만료됨|알 수 없음/);
      
      const end = performance.now();
      const totalTime = end - start;

      // 1000개의 토큰 시간 계산이 500ms 이내에 완료되어야 함
      expect(totalTime).toBeLessThan(500);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  describe('렌더링 최적화 테스트', () => {
    it('여러 컴포넌트의 동시 렌더링 성능을 측정해야 한다', () => {
      const variantData = generateLargeVariantDataset(20);
      const tokenData = generateLargeTokenDataset(10);

      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return variantData;
        if (api.toString().includes('getBestVariant')) return variantData[0];
        if (api.toString().includes('getAverageScores')) return {
          overallScore: 85,
          scoreBreakdown: { engagement: 85, virality: 85, personaMatch: 85, readability: 85, trending: 85 },
          variantCount: 20,
        };
        if (api.toString().includes('getExpiringTokens')) return tokenData;
        return undefined;
      });

      const renderTime = measureRenderTime(() => {
        render(
          <TestWrapper>
            <div>
              <TokenExpiryAlert />
              <VariantComparison postId={mockPostId} />
            </div>
          </TestWrapper>
        );
      });

      // 여러 컴포넌트 동시 렌더링이 400ms 이내에 완료되어야 함
      expect(renderTime).toBeLessThan(400);
    });

    it('props 변경 시 리렌더링 성능을 측정해야 한다', () => {
      const variantData = generateLargeVariantDataset(30);
      
      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return variantData;
        if (api.toString().includes('getBestVariant')) return variantData[0];
        if (api.toString().includes('getAverageScores')) return {
          overallScore: 85,
          scoreBreakdown: { engagement: 85, virality: 85, personaMatch: 85, readability: 85, trending: 85 },
          variantCount: 30,
        };
        return undefined;
      });

      const { rerender } = render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} compact={false} />
        </TestWrapper>
      );

      // 초기 렌더링 후 props 변경으로 인한 리렌더링 시간 측정
      const rerenderTime = measureRenderTime(() => {
        rerender(
          <TestWrapper>
            <VariantComparison postId={mockPostId} compact={true} />
          </TestWrapper>
        );
      });

      // 리렌더링은 초기 렌더링보다 빨라야 함 (일반적으로 50ms 이내)
      expect(rerenderTime).toBeLessThan(50);
    });
  });

  describe('스트레스 테스트', () => {
    it('극대량 데이터에서도 안정적으로 작동해야 한다', () => {
      const extremeDataset = generateLargeVariantDataset(500);
      
      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return extremeDataset;
        if (api.toString().includes('getBestVariant')) return extremeDataset[0];
        if (api.toString().includes('getAverageScores')) return {
          overallScore: 85,
          scoreBreakdown: { engagement: 85, virality: 85, personaMatch: 85, readability: 85, trending: 85 },
          variantCount: 500,
        };
        return undefined;
      });

      expect(() => {
        const renderTime = measureRenderTime(() => {
          render(
            <TestWrapper>
              <VariantComparison postId={mockPostId} />
            </TestWrapper>
          );
        });

        // 극대량 데이터도 5초 이내에 렌더링되어야 함 (타임아웃 방지)
        expect(renderTime).toBeLessThan(5000);
      }).not.toThrow();
    });

    it('빈번한 데이터 업데이트에 대응해야 한다', () => {
      let dataVersion = 0;
      
      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) {
          return generateLargeVariantDataset(10).map(item => ({
            ...item,
            _id: `${item._id}-v${dataVersion}`,
          }));
        }
        return undefined;
      });

      const { rerender } = render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 10번의 연속 업데이트 시뮬레이션
      const start = performance.now();
      
      for (let i = 0; i < 10; i++) {
        dataVersion = i;
        rerender(
          <TestWrapper>
            <VariantComparison postId={mockPostId} />
          </TestWrapper>
        );
      }
      
      const end = performance.now();
      const totalUpdateTime = end - start;

      // 10번의 연속 업데이트가 1초 이내에 완료되어야 함
      expect(totalUpdateTime).toBeLessThan(1000);
    });
  });

  describe('가상화 및 최적화 검증', () => {
    it('대량 리스트가 적절히 가상화되어야 한다', () => {
      const hugeDataset = generateLargeVariantDataset(1000);
      
      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return hugeDataset;
        if (api.toString().includes('getBestVariant')) return hugeDataset[0];
        if (api.toString().includes('getAverageScores')) return {
          overallScore: 85,
          scoreBreakdown: { engagement: 85, virality: 85, personaMatch: 85, readability: 85, trending: 85 },
          variantCount: 1000,
        };
        return undefined;
      });

      const { container } = render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // DOM에 실제로 렌더링된 변형 항목 수 확인
      const renderedItems = container.querySelectorAll('[data-testid*="variant"]').length;
      
      // 1000개 데이터가 있어도 실제 DOM에는 합리적인 수만 렌더링되어야 함
      // (가상화가 구현되지 않았다면 이 테스트는 실패할 수 있음)
      expect(renderedItems).toBeLessThan(100);
    });

    it('스크롤 성능이 적절해야 한다', () => {
      const scrollDataset = generateLargeVariantDataset(200);
      
      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return scrollDataset;
        if (api.toString().includes('getBestVariant')) return scrollDataset[0];
        if (api.toString().includes('getAverageScores')) return {
          overallScore: 85,
          scoreBreakdown: { engagement: 85, virality: 85, personaMatch: 85, readability: 85, trending: 85 },
          variantCount: 200,
        };
        return undefined;
      });

      const { container } = render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      const scrollContainer = container.querySelector('[data-testid="scrollable-content"]') || container;
      
      // 스크롤 이벤트 시뮬레이션 및 성능 측정
      const scrollStart = performance.now();
      
      for (let i = 0; i < 10; i++) {
        scrollContainer.scrollTop = i * 100;
        // 스크롤 이벤트 트리거
        scrollContainer.dispatchEvent(new Event('scroll'));
      }
      
      const scrollEnd = performance.now();
      const scrollTime = scrollEnd - scrollStart;

      // 스크롤 처리가 100ms 이내에 완료되어야 함
      expect(scrollTime).toBeLessThan(100);
    });
  });
});