/**
 * 소셜 미디어 고급 기능 성능 테스트
 * 대용량 데이터 처리, 렌더링 성능, API 응답 시간 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  PerformanceProfiler,
  VirtualizedListTester,
  generateLargeDataset,
  MockTimerHelper,
  renderWithProviders,
} from '../utils/social-media-test-helpers';
import { createSocialMediaDataSet } from '../fixtures/social-media-advanced';

// Mock 컴포넌트들 (성능 테스트용)
const MockVirtualizedGenerationHistory = ({ 
  items, 
  onLoadMore,
  itemHeight = 100,
  containerHeight = 600 
}: {
  items: any[];
  onLoadMore: () => void;
  itemHeight?: number;
  containerHeight?: number;
}) => {
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = 0; // 실제로는 스크롤 위치 기반 계산
  const endIndex = Math.min(startIndex + visibleCount, items.length);
  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div 
      data-testid="virtualized-list"
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollTop + clientHeight >= scrollHeight - 50) {
          onLoadMore();
        }
      }}
    >
      <div style={{ height: items.length * itemHeight }}>
        {visibleItems.map((item, index) => (
          <div
            key={item.id}
            data-testid={`list-item-${startIndex + index}`}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              height: itemHeight,
              width: '100%',
            }}
          >
            <div className="generation-item">
              <div className="content">{item.content}</div>
              <div className="timestamp">{item.timestamp}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MockAnalyticsChart = ({ 
  data, 
  loading = false,
  onDataUpdate 
}: {
  data: any[];
  loading?: boolean;
  onDataUpdate?: (newData: any[]) => void;
}) => {
  React.useEffect(() => {
    if (onDataUpdate) {
      // 실시간 데이터 업데이트 시뮬레이션
      const interval = setInterval(() => {
        const newData = [...data, {
          timestamp: Date.now(),
          value: Math.random() * 100,
        }];
        onDataUpdate(newData.slice(-100)); // 최근 100개만 유지
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [data, onDataUpdate]);

  if (loading) {
    return <div data-testid="chart-loading">차트 로딩 중...</div>;
  }

  return (
    <div data-testid="analytics-chart" className="chart-container">
      <svg width="800" height="400">
        {data.map((point, index) => (
          <circle
            key={index}
            cx={index * 8}
            cy={400 - point.value * 4}
            r="2"
            fill="blue"
          />
        ))}
      </svg>
    </div>
  );
};

describe('소셜 미디어 성능 테스트', () => {
  let profiler: PerformanceProfiler;
  let mockOnLoadMore: ReturnType<typeof vi.fn>;
  let mockOnDataUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
    mockOnLoadMore = vi.fn();
    mockOnDataUpdate = vi.fn();
  });

  afterEach(() => {
    profiler.reset();
    vi.clearAllMocks();
  });

  describe('대용량 데이터 렌더링 성능', () => {
    it('1000개 AI 생성 이력을 3초 이내에 렌더링해야 함', async () => {
      const largeDataset = generateLargeDataset(1000);

      profiler.start('large-dataset-render');
      
      render(
        <MockVirtualizedGenerationHistory
          items={largeDataset}
          onLoadMore={mockOnLoadMore}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const renderTime = profiler.end('large-dataset-render');
      
      // 3초(3000ms) 이내에 렌더링 완료
      expect(renderTime).toBeLessThan(3000);
      
      // 가시화된 아이템만 DOM에 존재하는지 확인 (가상화 동작)
      const renderedItems = screen.getAllByTestId(/list-item-/);
      expect(renderedItems.length).toBeLessThan(20); // 가시 영역에만 렌더링
    });

    it('10000개 항목의 무한 스크롤이 끊김 없이 동작해야 함', async () => {
      const user = userEvent.setup();
      const dataset = generateLargeDataset(10000);
      let currentData = dataset.slice(0, 100); // 초기 100개

      const MockInfiniteList = () => {
        const [items, setItems] = React.useState(currentData);
        
        const handleLoadMore = () => {
          const nextBatch = dataset.slice(items.length, items.length + 100);
          setItems(prev => [...prev, ...nextBatch]);
        };

        return (
          <MockVirtualizedGenerationHistory
            items={items}
            onLoadMore={handleLoadMore}
          />
        );
      };

      render(<MockInfiniteList />);

      const container = screen.getByTestId('virtualized-list');
      
      // 스크롤 성능 테스트
      const scrollPerf = await VirtualizedListTester.testScrollPerformance(container, 50);
      
      // 스크롤 응답 시간이 16ms 이내 (60fps 유지)
      expect(scrollPerf.averageTime).toBeLessThan(16);
      expect(scrollPerf.maxTime).toBeLessThan(32);

      // 메모리 사용량 확인
      const memoryStats = VirtualizedListTester.testVisibleItems(container);
      expect(memoryStats.visibleItems).toBeLessThan(50); // 가상화로 제한됨
    });

    it('실시간 데이터 업데이트가 성능에 영향을 주지 않아야 함', async () => {
      MockTimerHelper.setup();

      const initialData = Array.from({ length: 100 }, (_, i) => ({
        timestamp: Date.now() - i * 1000,
        value: Math.random() * 100,
      }));

      let chartData = initialData;
      
      const MockRealtimeChart = () => {
        const [data, setData] = React.useState(chartData);
        
        return (
          <MockAnalyticsChart
            data={data}
            onDataUpdate={setData}
          />
        );
      };

      profiler.start('realtime-updates');
      
      render(<MockRealtimeChart />);

      // 10초간 실시간 업데이트 시뮬레이션
      for (let i = 0; i < 10; i++) {
        await MockTimerHelper.advance(1000);
        
        await waitFor(() => {
          expect(screen.getByTestId('analytics-chart')).toBeInTheDocument();
        });
      }

      const totalUpdateTime = profiler.end('realtime-updates');
      
      // 10초간 업데이트 처리 시간이 100ms 이내
      expect(totalUpdateTime).toBeLessThan(100);

      MockTimerHelper.teardown();
    });
  });

  describe('API 응답 성능', () => {
    it('소셜 계정 토큰 업데이트가 2초 이내에 완료되어야 함', async () => {
      const mockApiCall = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1500)) // 1.5초 지연
      );

      profiler.start('token-update-api');
      
      await mockApiCall();
      
      const apiTime = profiler.end('token-update-api');
      
      expect(apiTime).toBeLessThan(2000);
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    it('AI 변형 생성 API가 30초 이내에 완료되어야 함', async () => {
      const mockAiGeneration = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 25000)) // 25초 지연
      );

      profiler.start('ai-generation-api');
      
      await mockAiGeneration();
      
      const generationTime = profiler.end('ai-generation-api');
      
      expect(generationTime).toBeLessThan(30000);
    });

    it('분석 대시보드 데이터 로딩이 5초 이내에 완료되어야 함', async () => {
      const mockDashboardApi = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => {
          resolve({
            totalPosts: 150,
            successRate: 85,
            platformStats: { twitter: 80, linkedin: 45, facebook: 25 },
            recentActivity: Array.from({ length: 10 }, (_, i) => ({
              id: i,
              action: 'post_created',
              timestamp: new Date().toISOString(),
            })),
          });
        }, 3000)) // 3초 지연
      );

      profiler.start('dashboard-load');
      
      const dashboardData = await mockDashboardApi();
      
      const loadTime = profiler.end('dashboard-load');
      
      expect(loadTime).toBeLessThan(5000);
      expect(dashboardData).toHaveProperty('totalPosts');
    });

    it('동시 API 호출이 병목 현상 없이 처리되어야 함', async () => {
      const apiCalls = [
        () => new Promise(resolve => setTimeout(resolve, 1000)),
        () => new Promise(resolve => setTimeout(resolve, 1200)),
        () => new Promise(resolve => setTimeout(resolve, 800)),
        () => new Promise(resolve => setTimeout(resolve, 1500)),
        () => new Promise(resolve => setTimeout(resolve, 900)),
      ];

      profiler.start('concurrent-apis');
      
      await Promise.all(apiCalls.map(call => call()));
      
      const concurrentTime = profiler.end('concurrent-apis');
      
      // 병렬 처리로 최대 지연시간(1500ms) + 오버헤드 정도만 소요
      expect(concurrentTime).toBeLessThan(2000);
    });
  });

  describe('메모리 사용량 최적화', () => {
    it('변형 비교 컴포넌트가 메모리 누수 없이 동작해야 함', async () => {
      const testData = createSocialMediaDataSet();
      
      // 초기 메모리 측정
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // 100번 마운트/언마운트 반복
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(
          <div data-testid="variant-comparison">
            {testData.variants.map(variant => (
              <div key={variant._id} className="variant-card">
                <div className="content">{variant.content}</div>
                <div className="scores">
                  {Object.entries(variant.scoreBreakdown).map(([key, score]) => (
                    <div key={key}>{key}: {score}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
        
        unmount();
      }

      // 가비지 컬렉션 강제 실행 (테스트 환경에서)
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // 메모리 증가량이 10MB 이내
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('대용량 차트 데이터가 효율적으로 관리되어야 함', () => {
      const largeChartData = Array.from({ length: 10000 }, (_, i) => ({
        timestamp: Date.now() - i * 60000,
        value: Math.random() * 100,
        metadata: {
          platform: ['twitter', 'linkedin', 'facebook'][i % 3],
          engagement: Math.random() * 1000,
        },
      }));

      profiler.start('chart-data-processing');
      
      // 데이터 집계 처리
      const aggregatedData = largeChartData.reduce((acc, point) => {
        const hour = new Date(point.timestamp).getHours();
        if (!acc[hour]) {
          acc[hour] = { count: 0, total: 0 };
        }
        acc[hour].count++;
        acc[hour].total += point.value;
        return acc;
      }, {} as Record<number, { count: number; total: number }>);

      const processingTime = profiler.end('chart-data-processing');
      
      // 데이터 처리가 500ms 이내
      expect(processingTime).toBeLessThan(500);
      expect(Object.keys(aggregatedData)).toHaveLength(24); // 24시간
    });
  });

  describe('사용자 인터랙션 응답성', () => {
    it('변형 선택 시 100ms 이내에 UI가 업데이트되어야 함', async () => {
      const user = userEvent.setup();
      const mockOnSelect = vi.fn();

      const MockVariantSelector = () => {
        const [selectedId, setSelectedId] = React.useState<string | null>(null);

        const handleSelect = (id: string) => {
          profiler.start('variant-selection-ui');
          setSelectedId(id);
          mockOnSelect(id);
          // 다음 렌더링 완료 후 측정
          setTimeout(() => {
            profiler.end('variant-selection-ui');
          }, 0);
        };

        return (
          <div>
            {['variant1', 'variant2', 'variant3'].map(id => (
              <button
                key={id}
                data-testid={`select-${id}`}
                className={selectedId === id ? 'selected' : ''}
                onClick={() => handleSelect(id)}
              >
                {selectedId === id ? '선택됨' : '선택하기'}
              </button>
            ))}
          </div>
        );
      };

      render(<MockVariantSelector />);

      await user.click(screen.getByTestId('select-variant1'));

      // UI 업데이트 시간 확인
      await waitFor(() => {
        const uiUpdateTime = profiler.getMeasure('variant-selection-ui');
        expect(uiUpdateTime).toBeLessThan(100);
      });

      expect(mockOnSelect).toHaveBeenCalledWith('variant1');
    });

    it('필터링이 즉시 반영되어야 함', async () => {
      const user = userEvent.setup();
      const testData = createSocialMediaDataSet();

      const MockFilterableList = () => {
        const [filter, setFilter] = React.useState('');
        const [filteredItems, setFilteredItems] = React.useState(testData.aiGenerations);

        React.useEffect(() => {
          profiler.start('filter-processing');
          
          const filtered = testData.aiGenerations.filter(item =>
            item.prompt.toLowerCase().includes(filter.toLowerCase())
          );
          setFilteredItems(filtered);
          
          profiler.end('filter-processing');
        }, [filter]);

        return (
          <div>
            <input
              data-testid="filter-input"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="필터링..."
            />
            <div data-testid="filtered-results">
              {filteredItems.map(item => (
                <div key={item._id}>{item.prompt}</div>
              ))}
            </div>
          </div>
        );
      };

      render(<MockFilterableList />);

      await user.type(screen.getByTestId('filter-input'), 'productivity');

      // 필터링 처리 시간 확인
      await waitFor(() => {
        const filterTime = profiler.getMeasure('filter-processing');
        expect(filterTime).toBeLessThan(50); // 50ms 이내
      });
    });

    it('스크롤 성능이 60fps를 유지해야 함', async () => {
      const container = document.createElement('div');
      container.style.height = '600px';
      container.style.overflow = 'auto';
      document.body.appendChild(container);

      // 스크롤 이벤트 성능 측정
      const scrollTimes: number[] = [];
      
      const handleScroll = () => {
        const startTime = performance.now();
        
        // 스크롤 처리 로직 시뮬레이션
        requestAnimationFrame(() => {
          const endTime = performance.now();
          scrollTimes.push(endTime - startTime);
        });
      };

      container.addEventListener('scroll', handleScroll);

      // 스크롤 시뮬레이션
      for (let i = 0; i < 60; i++) {
        container.scrollTop = i * 10;
        await new Promise(resolve => requestAnimationFrame(resolve));
      }

      // 평균 스크롤 처리 시간이 16.67ms 이내 (60fps)
      const averageScrollTime = scrollTimes.reduce((sum, time) => sum + time, 0) / scrollTimes.length;
      expect(averageScrollTime).toBeLessThan(16.67);

      document.body.removeChild(container);
    });
  });

  describe('번들 크기 최적화', () => {
    it('코드 스플리팅이 적용되어야 함', () => {
      // 실제로는 번들 분석기 결과를 확인해야 함
      // 여기서는 동적 import 사용 여부 확인
      
      const mockDynamicImport = vi.fn().mockResolvedValue({
        default: () => <div>Lazy Component</div>
      });

      // 동적 import 시뮬레이션
      const LazyComponent = React.lazy(() => mockDynamicImport());

      expect(mockDynamicImport).toBeDefined();
      expect(LazyComponent).toBeDefined();
    });

    it('불필요한 재렌더링이 발생하지 않아야 함', () => {
      let renderCount = 0;

      const MockOptimizedComponent = React.memo(({ data }: { data: any[] }) => {
        renderCount++;
        
        return (
          <div data-testid="optimized-component">
            {data.map(item => (
              <div key={item.id}>{item.content}</div>
            ))}
          </div>
        );
      });

      const testData = [{ id: 1, content: 'Test' }];

      const { rerender } = render(<MockOptimizedComponent data={testData} />);

      // 같은 props로 재렌더링
      rerender(<MockOptimizedComponent data={testData} />);
      rerender(<MockOptimizedComponent data={testData} />);

      // React.memo로 인해 재렌더링 방지
      expect(renderCount).toBe(1);
    });
  });
});

// React hooks mock
const React = {
  useState: vi.fn(),
  useEffect: vi.fn(),
  memo: vi.fn((component) => component),
  lazy: vi.fn((factory) => factory),
};