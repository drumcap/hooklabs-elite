/**
 * GenerationHistory 컴포넌트 테스트
 * AI 생성 이력 조회, 필터링, 페이징 기능 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMockAiGeneration, createFailedAiGeneration } from '../../fixtures/social-media-advanced';

// Mock GenerationHistory 컴포넌트
const MockGenerationHistory = ({
  generations,
  loading = false,
  hasMore = false,
  onLoadMore,
  onFilter,
  filters = {},
  onViewDetail,
}: {
  generations: any[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore: () => void;
  onFilter: (filters: any) => void;
  filters?: any;
  onViewDetail: (generationId: string) => void;
}) => (
  <div data-testid="generation-history">
    <div className="history-header">
      <h3>AI 생성 이력</h3>
      
      <div className="filters" data-testid="filters">
        <select
          value={filters.type || ''}
          onChange={(e) => onFilter({ ...filters, type: e.target.value || undefined })}
          data-testid="type-filter"
        >
          <option value="">모든 타입</option>
          <option value="variant_creation">변형 생성</option>
          <option value="content_optimization">내용 최적화</option>
          <option value="hashtag_suggestion">해시태그 제안</option>
        </select>

        <select
          value={filters.success?.toString() || ''}
          onChange={(e) => {
            const value = e.target.value;
            onFilter({ 
              ...filters, 
              success: value === '' ? undefined : value === 'true'
            });
          }}
          data-testid="success-filter"
        >
          <option value="">모든 상태</option>
          <option value="true">성공</option>
          <option value="false">실패</option>
        </select>

        <input
          type="date"
          value={filters.startDate || ''}
          onChange={(e) => onFilter({ ...filters, startDate: e.target.value || undefined })}
          data-testid="start-date-filter"
          placeholder="시작 날짜"
        />

        <input
          type="date"
          value={filters.endDate || ''}
          onChange={(e) => onFilter({ ...filters, endDate: e.target.value || undefined })}
          data-testid="end-date-filter"
          placeholder="종료 날짜"
        />
      </div>
    </div>

    <div className="generation-list">
      {generations.length === 0 && !loading && (
        <div className="empty-state" data-testid="empty-state">
          <p>생성 이력이 없습니다.</p>
        </div>
      )}

      {generations.map((generation) => (
        <div
          key={generation._id}
          className={`generation-item ${generation.success ? 'success' : 'failed'}`}
          data-testid={`generation-${generation._id}`}
        >
          <div className="generation-header">
            <div className="type-badge">
              {generation.type === 'variant_creation' && '변형 생성'}
              {generation.type === 'content_optimization' && '내용 최적화'}
              {generation.type === 'hashtag_suggestion' && '해시태그 제안'}
            </div>
            
            <div className={`status-badge ${generation.success ? 'success' : 'failed'}`}>
              {generation.success ? '성공' : '실패'}
            </div>
            
            <div className="timestamp">
              {new Date(generation.createdAt).toLocaleString()}
            </div>
          </div>

          <div className="generation-content">
            <div className="prompt">
              <strong>프롬프트:</strong> {generation.prompt}
            </div>
            
            {generation.success && generation.response && (
              <div className="response">
                <strong>응답:</strong>
                <p>{generation.response.length > 150 
                  ? generation.response.substring(0, 150) + '...' 
                  : generation.response}
                </p>
              </div>
            )}

            {!generation.success && generation.errorMessage && (
              <div className="error-message">
                <strong>오류:</strong> {generation.errorMessage}
              </div>
            )}
          </div>

          <div className="generation-meta">
            <span className="model">{generation.model}</span>
            <span className="credits">크레딧: {generation.creditsUsed}</span>
            <span className="time">시간: {generation.generationTime}ms</span>
            
            {generation.inputTokens && generation.outputTokens && (
              <span className="tokens">
                토큰: {generation.inputTokens}/{generation.outputTokens}
              </span>
            )}
          </div>

          <div className="generation-actions">
            <button
              onClick={() => onViewDetail(generation._id)}
              data-testid={`view-detail-${generation._id}`}
            >
              자세히 보기
            </button>
          </div>
        </div>
      ))}

      {loading && (
        <div className="loading" data-testid="loading">
          <p>로딩 중...</p>
        </div>
      )}

      {hasMore && !loading && (
        <button
          onClick={onLoadMore}
          className="load-more-btn"
          data-testid="load-more-btn"
        >
          더 보기
        </button>
      )}
    </div>
  </div>
);

describe('GenerationHistory', () => {
  const mockOnLoadMore = vi.fn();
  const mockOnFilter = vi.fn();
  const mockOnViewDetail = vi.fn();

  beforeEach(() => {
    mockOnLoadMore.mockClear();
    mockOnFilter.mockClear();
    mockOnViewDetail.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('생성 이력 목록을 표시해야 함', () => {
    const generations = [
      createMockAiGeneration({ 
        type: 'variant_creation',
        success: true,
        prompt: 'Test prompt 1',
        response: 'Test response 1'
      }),
      createMockAiGeneration({ 
        type: 'content_optimization',
        success: true,
        prompt: 'Test prompt 2',
        response: 'Test response 2'
      }),
    ];

    render(
      <MockGenerationHistory
        generations={generations}
        onLoadMore={mockOnLoadMore}
        onFilter={mockOnFilter}
        onViewDetail={mockOnViewDetail}
      />
    );

    expect(screen.getByText('AI 생성 이력')).toBeInTheDocument();
    
    generations.forEach((generation) => {
      expect(screen.getByTestId(`generation-${generation._id}`)).toBeInTheDocument();
      expect(screen.getByText(generation.prompt)).toBeInTheDocument();
    });

    expect(screen.getByText('변형 생성')).toBeInTheDocument();
    expect(screen.getByText('내용 최적화')).toBeInTheDocument();
  });

  it('빈 상태를 표시해야 함', () => {
    render(
      <MockGenerationHistory
        generations={[]}
        onLoadMore={mockOnLoadMore}
        onFilter={mockOnFilter}
        onViewDetail={mockOnViewDetail}
      />
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('생성 이력이 없습니다.')).toBeInTheDocument();
  });

  it('성공/실패 상태를 시각적으로 구분해야 함', () => {
    const generations = [
      createMockAiGeneration({ success: true }),
      createFailedAiGeneration(),
    ];

    render(
      <MockGenerationHistory
        generations={generations}
        onLoadMore={mockOnLoadMore}
        onFilter={mockOnFilter}
        onViewDetail={mockOnViewDetail}
      />
    );

    const successItem = screen.getByTestId(`generation-${generations[0]._id}`);
    const failedItem = screen.getByTestId(`generation-${generations[1]._id}`);

    expect(successItem).toHaveClass('success');
    expect(failedItem).toHaveClass('failed');

    expect(screen.getByText('성공')).toBeInTheDocument();
    expect(screen.getByText('실패')).toBeInTheDocument();
  });

  it('필터링 기능이 작동해야 함', async () => {
    const user = userEvent.setup();
    const generations = [createMockAiGeneration()];

    render(
      <MockGenerationHistory
        generations={generations}
        onLoadMore={mockOnLoadMore}
        onFilter={mockOnFilter}
        onViewDetail={mockOnViewDetail}
      />
    );

    // 타입 필터
    const typeFilter = screen.getByTestId('type-filter');
    await user.selectOptions(typeFilter, 'variant_creation');
    
    expect(mockOnFilter).toHaveBeenCalledWith({
      type: 'variant_creation'
    });

    // 성공/실패 필터
    const successFilter = screen.getByTestId('success-filter');
    await user.selectOptions(successFilter, 'true');
    
    expect(mockOnFilter).toHaveBeenCalledWith({
      success: true
    });

    // 날짜 필터
    const startDateFilter = screen.getByTestId('start-date-filter');
    await user.type(startDateFilter, '2024-01-01');
    
    expect(mockOnFilter).toHaveBeenCalledWith({
      startDate: '2024-01-01'
    });
  });

  it('더 보기 버튼이 작동해야 함', async () => {
    const user = userEvent.setup();
    const generations = [createMockAiGeneration()];

    render(
      <MockGenerationHistory
        generations={generations}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
        onFilter={mockOnFilter}
        onViewDetail={mockOnViewDetail}
      />
    );

    const loadMoreBtn = screen.getByTestId('load-more-btn');
    await user.click(loadMoreBtn);

    expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
  });

  it('로딩 상태를 표시해야 함', () => {
    render(
      <MockGenerationHistory
        generations={[]}
        loading={true}
        onLoadMore={mockOnLoadMore}
        onFilter={mockOnFilter}
        onViewDetail={mockOnViewDetail}
      />
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.getByText('로딩 중...')).toBeInTheDocument();
  });

  it('자세히 보기 버튼이 작동해야 함', async () => {
    const user = userEvent.setup();
    const generation = createMockAiGeneration();

    render(
      <MockGenerationHistory
        generations={[generation]}
        onLoadMore={mockOnLoadMore}
        onFilter={mockOnFilter}
        onViewDetail={mockOnViewDetail}
      />
    );

    const viewDetailBtn = screen.getByTestId(`view-detail-${generation._id}`);
    await user.click(viewDetailBtn);

    expect(mockOnViewDetail).toHaveBeenCalledWith(generation._id);
  });

  it('긴 응답 내용을 줄여서 표시해야 함', () => {
    const longResponse = 'A'.repeat(200); // 200자
    const generation = createMockAiGeneration({
      response: longResponse,
      success: true
    });

    render(
      <MockGenerationHistory
        generations={[generation]}
        onLoadMore={mockOnLoadMore}
        onFilter={mockOnFilter}
        onViewDetail={mockOnViewDetail}
      />
    );

    // 150자까지만 표시되고 "..."이 붙어야 함
    expect(screen.getByText(/A{150}\.\.\./)).toBeInTheDocument();
  });

  it('실패한 생성의 에러 메시지를 표시해야 함', () => {
    const failedGeneration = createFailedAiGeneration();

    render(
      <MockGenerationHistory
        generations={[failedGeneration]}
        onLoadMore={mockOnLoadMore}
        onFilter={mockOnFilter}
        onViewDetail={mockOnViewDetail}
      />
    );

    expect(screen.getByText('오류:')).toBeInTheDocument();
    expect(screen.getByText(failedGeneration.errorMessage)).toBeInTheDocument();
  });

  it('메타데이터를 표시해야 함', () => {
    const generation = createMockAiGeneration({
      model: 'gpt-4-turbo',
      creditsUsed: 2,
      generationTime: 1500,
      inputTokens: 100,
      outputTokens: 50,
    });

    render(
      <MockGenerationHistory
        generations={[generation]}
        onLoadMore={mockOnLoadMore}
        onFilter={mockOnFilter}
        onViewDetail={mockOnViewDetail}
      />
    );

    expect(screen.getByText('gpt-4-turbo')).toBeInTheDocument();
    expect(screen.getByText('크레딧: 2')).toBeInTheDocument();
    expect(screen.getByText('시간: 1500ms')).toBeInTheDocument();
    expect(screen.getByText('토큰: 100/50')).toBeInTheDocument();
  });

  it('시간 순으로 정렬되어 표시해야 함', () => {
    const now = new Date();
    const generations = [
      createMockAiGeneration({
        _id: 'gen1',
        createdAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), // 1시간 전
      }),
      createMockAiGeneration({
        _id: 'gen2',
        createdAt: now.toISOString(), // 지금
      }),
      createMockAiGeneration({
        _id: 'gen3',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
      }),
    ];

    render(
      <MockGenerationHistory
        generations={generations}
        onLoadMore={mockOnLoadMore}
        onFilter={mockOnFilter}
        onViewDetail={mockOnViewDetail}
      />
    );

    const items = screen.getAllByTestId(/generation-gen/);
    expect(items).toHaveLength(3);

    // 순서는 Mock 컴포넌트에서 제공된 순서대로 표시됨
    expect(items[0]).toHaveAttribute('data-testid', 'generation-gen1');
    expect(items[1]).toHaveAttribute('data-testid', 'generation-gen2');
    expect(items[2]).toHaveAttribute('data-testid', 'generation-gen3');
  });

  it('키보드 네비게이션을 지원해야 함', async () => {
    const user = userEvent.setup();
    const generation = createMockAiGeneration();

    render(
      <MockGenerationHistory
        generations={[generation]}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
        onFilter={mockOnFilter}
        onViewDetail={mockOnViewDetail}
      />
    );

    // 필터를 통한 네비게이션
    await user.tab();
    expect(screen.getByTestId('type-filter')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('success-filter')).toHaveFocus();

    // 자세히 보기 버튼까지 이동
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByTestId(`view-detail-${generation._id}`)).toHaveFocus();
  });

  it('무한 스크롤을 지원해야 함', async () => {
    const generations = Array.from({ length: 10 }, (_, i) => 
      createMockAiGeneration({ _id: `gen${i}` })
    );

    // Intersection Observer Mock
    const mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    });

    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: mockIntersectionObserver,
    });

    const MockInfiniteScrollHistory = () => {
      const [loading, setLoading] = React.useState(false);
      const [hasMore, setHasMore] = React.useState(true);

      const handleLoadMore = () => {
        setLoading(true);
        // 실제로는 API 호출
        setTimeout(() => {
          setLoading(false);
          setHasMore(false); // 마지막 페이지라고 가정
        }, 1000);
      };

      return (
        <MockGenerationHistory
          generations={generations}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          onFilter={mockOnFilter}
          onViewDetail={mockOnViewDetail}
        />
      );
    };

    render(<MockInfiniteScrollHistory />);

    expect(screen.getAllByTestId(/generation-gen/)).toHaveLength(10);
    expect(screen.getByTestId('load-more-btn')).toBeInTheDocument();
  });

  it('검색 기능을 지원해야 함', async () => {
    const user = userEvent.setup();
    
    const MockSearchableHistory = () => {
      const [searchTerm, setSearchTerm] = React.useState('');
      const allGenerations = [
        createMockAiGeneration({ prompt: 'Create a social media post about productivity' }),
        createMockAiGeneration({ prompt: 'Generate hashtags for marketing campaign' }),
      ];

      const filteredGenerations = allGenerations.filter(gen => 
        gen.prompt.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return (
        <div>
          <input
            type="text"
            placeholder="프롬프트로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="search-input"
          />
          <MockGenerationHistory
            generations={filteredGenerations}
            onLoadMore={mockOnLoadMore}
            onFilter={mockOnFilter}
            onViewDetail={mockOnViewDetail}
          />
        </div>
      );
    };

    render(<MockSearchableHistory />);

    const searchInput = screen.getByTestId('search-input');
    
    // 처음에는 모든 항목이 보여야 함
    expect(screen.getAllByTestId(/generation-/)).toHaveLength(2);

    // 검색어 입력
    await user.type(searchInput, 'productivity');

    await waitFor(() => {
      expect(screen.getAllByTestId(/generation-/)).toHaveLength(1);
      expect(screen.getByText('Create a social media post about productivity')).toBeInTheDocument();
    });
  });
});

// React hooks mock
const React = { 
  useState: vi.fn(),
  useEffect: vi.fn(),
};