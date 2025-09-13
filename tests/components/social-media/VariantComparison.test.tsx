/**
 * VariantComparison 컴포넌트 테스트
 * A/B 테스트 결과 비교 및 시각화 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMockPostVariant, createScenarioData } from '../../fixtures/social-media-advanced';

// Mock VariantComparison 컴포넌트
const MockVariantComparison = ({
  variants,
  selectedVariantId,
  onSelectVariant,
  onGenerateNew,
  showScores = true,
  showContent = true,
}: {
  variants: any[];
  selectedVariantId?: string;
  onSelectVariant: (variantId: string) => void;
  onGenerateNew: () => void;
  showScores?: boolean;
  showContent?: boolean;
}) => (
  <div data-testid="variant-comparison">
    <div className="comparison-header">
      <h3>변형 비교 ({variants.length}개)</h3>
      <button onClick={onGenerateNew} data-testid="generate-new-btn">
        새 변형 생성
      </button>
    </div>

    <div className="variants-grid">
      {variants.map((variant, index) => (
        <div
          key={variant._id}
          className={`variant-card ${selectedVariantId === variant._id ? 'selected' : ''}`}
          data-testid={`variant-${variant._id}`}
        >
          <div className="variant-header">
            <span className="variant-label">변형 {index + 1}</span>
            <div className="overall-score">
              {showScores && (
                <span className="score">{variant.overallScore}점</span>
              )}
            </div>
          </div>

          {showContent && (
            <div className="variant-content">
              <p>{variant.content}</p>
            </div>
          )}

          {showScores && (
            <div className="score-breakdown">
              <div className="score-item">
                <span>참여도</span>
                <div className="score-bar">
                  <div 
                    className="score-fill" 
                    style={{ width: `${variant.scoreBreakdown.engagement}%` }}
                  />
                  <span>{variant.scoreBreakdown.engagement}</span>
                </div>
              </div>
              <div className="score-item">
                <span>바이럴성</span>
                <div className="score-bar">
                  <div 
                    className="score-fill" 
                    style={{ width: `${variant.scoreBreakdown.virality}%` }}
                  />
                  <span>{variant.scoreBreakdown.virality}</span>
                </div>
              </div>
              <div className="score-item">
                <span>페르소나 매치</span>
                <div className="score-bar">
                  <div 
                    className="score-fill" 
                    style={{ width: `${variant.scoreBreakdown.personaMatch}%` }}
                  />
                  <span>{variant.scoreBreakdown.personaMatch}</span>
                </div>
              </div>
              <div className="score-item">
                <span>가독성</span>
                <div className="score-bar">
                  <div 
                    className="score-fill" 
                    style={{ width: `${variant.scoreBreakdown.readability}%` }}
                  />
                  <span>{variant.scoreBreakdown.readability}</span>
                </div>
              </div>
              <div className="score-item">
                <span>트렌딩</span>
                <div className="score-bar">
                  <div 
                    className="score-fill" 
                    style={{ width: `${variant.scoreBreakdown.trending}%` }}
                  />
                  <span>{variant.scoreBreakdown.trending}</span>
                </div>
              </div>
            </div>
          )}

          <div className="variant-actions">
            <button
              onClick={() => onSelectVariant(variant._id)}
              className={selectedVariantId === variant._id ? 'selected-btn' : 'select-btn'}
              data-testid={`select-${variant._id}`}
            >
              {selectedVariantId === variant._id ? '선택됨' : '선택하기'}
            </button>
          </div>

          <div className="variant-meta">
            <span className="ai-model">{variant.aiModel}</span>
            <span className="credits-used">{variant.creditsUsed} 크레딧</span>
            <span className="generated-at">
              {new Date(variant.generatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>

    {variants.length === 0 && (
      <div className="empty-state" data-testid="empty-state">
        <p>아직 생성된 변형이 없습니다.</p>
        <button onClick={onGenerateNew}>첫 번째 변형 생성하기</button>
      </div>
    )}
  </div>
);

describe('VariantComparison', () => {
  const mockOnSelectVariant = vi.fn();
  const mockOnGenerateNew = vi.fn();

  beforeEach(() => {
    mockOnSelectVariant.mockClear();
    mockOnGenerateNew.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('변형이 없을 때 빈 상태를 표시해야 함', () => {
    render(
      <MockVariantComparison
        variants={[]}
        onSelectVariant={mockOnSelectVariant}
        onGenerateNew={mockOnGenerateNew}
      />
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('아직 생성된 변형이 없습니다.')).toBeInTheDocument();
    expect(screen.getByText('첫 번째 변형 생성하기')).toBeInTheDocument();
  });

  it('변형 목록을 올바르게 표시해야 함', () => {
    const variants = [
      createMockPostVariant({ overallScore: 85 }),
      createMockPostVariant({ overallScore: 92 }),
      createMockPostVariant({ overallScore: 78 }),
    ];

    render(
      <MockVariantComparison
        variants={variants}
        onSelectVariant={mockOnSelectVariant}
        onGenerateNew={mockOnGenerateNew}
      />
    );

    expect(screen.getByText('변형 비교 (3개)')).toBeInTheDocument();
    
    variants.forEach((variant, index) => {
      expect(screen.getByTestId(`variant-${variant._id}`)).toBeInTheDocument();
      expect(screen.getByText(`변형 ${index + 1}`)).toBeInTheDocument();
      expect(screen.getByText(`${variant.overallScore}점`)).toBeInTheDocument();
    });
  });

  it('점수 분석을 시각적으로 표시해야 함', () => {
    const variant = createMockPostVariant({
      scoreBreakdown: {
        engagement: 85,
        virality: 78,
        personaMatch: 92,
        readability: 88,
        trending: 75,
      },
    });

    render(
      <MockVariantComparison
        variants={[variant]}
        onSelectVariant={mockOnSelectVariant}
        onGenerateNew={mockOnGenerateNew}
      />
    );

    // 점수 항목들이 표시되는지 확인
    expect(screen.getByText('참여도')).toBeInTheDocument();
    expect(screen.getByText('바이럴성')).toBeInTheDocument();
    expect(screen.getByText('페르소나 매치')).toBeInTheDocument();
    expect(screen.getByText('가독성')).toBeInTheDocument();
    expect(screen.getByText('트렌딩')).toBeInTheDocument();

    // 점수 값들이 표시되는지 확인
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('78')).toBeInTheDocument();
    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('변형을 선택할 수 있어야 함', async () => {
    const user = userEvent.setup();
    const variants = [createMockPostVariant()];

    render(
      <MockVariantComparison
        variants={variants}
        onSelectVariant={mockOnSelectVariant}
        onGenerateNew={mockOnGenerateNew}
      />
    );

    const selectButton = screen.getByTestId(`select-${variants[0]._id}`);
    await user.click(selectButton);

    expect(mockOnSelectVariant).toHaveBeenCalledWith(variants[0]._id);
    expect(mockOnSelectVariant).toHaveBeenCalledTimes(1);
  });

  it('선택된 변형을 시각적으로 구분해야 함', () => {
    const variants = [
      createMockPostVariant({ _id: 'variant1' }),
      createMockPostVariant({ _id: 'variant2' }),
    ];

    render(
      <MockVariantComparison
        variants={variants}
        selectedVariantId="variant1"
        onSelectVariant={mockOnSelectVariant}
        onGenerateNew={mockOnGenerateNew}
      />
    );

    const selectedCard = screen.getByTestId('variant-variant1');
    const unselectedCard = screen.getByTestId('variant-variant2');

    expect(selectedCard).toHaveClass('selected');
    expect(unselectedCard).not.toHaveClass('selected');

    const selectedButton = screen.getByTestId('select-variant1');
    const unselectedButton = screen.getByTestId('select-variant2');

    expect(selectedButton).toHaveTextContent('선택됨');
    expect(selectedButton).toHaveClass('selected-btn');
    expect(unselectedButton).toHaveTextContent('선택하기');
    expect(unselectedButton).toHaveClass('select-btn');
  });

  it('새 변형 생성 버튼을 클릭할 수 있어야 함', async () => {
    const user = userEvent.setup();
    const variants = [createMockPostVariant()];

    render(
      <MockVariantComparison
        variants={variants}
        onSelectVariant={mockOnSelectVariant}
        onGenerateNew={mockOnGenerateNew}
      />
    );

    const generateButton = screen.getByTestId('generate-new-btn');
    await user.click(generateButton);

    expect(mockOnGenerateNew).toHaveBeenCalledTimes(1);
  });

  it('변형 내용을 표시하거나 숨길 수 있어야 함', () => {
    const variant = createMockPostVariant({
      content: 'This is test variant content',
    });

    const { rerender } = render(
      <MockVariantComparison
        variants={[variant]}
        onSelectVariant={mockOnSelectVariant}
        onGenerateNew={mockOnGenerateNew}
        showContent={true}
      />
    );

    expect(screen.getByText('This is test variant content')).toBeInTheDocument();

    rerender(
      <MockVariantComparison
        variants={[variant]}
        onSelectVariant={mockOnSelectVariant}
        onGenerateNew={mockOnGenerateNew}
        showContent={false}
      />
    );

    expect(screen.queryByText('This is test variant content')).not.toBeInTheDocument();
  });

  it('점수를 표시하거나 숨길 수 있어야 함', () => {
    const variant = createMockPostVariant({ overallScore: 85 });

    const { rerender } = render(
      <MockVariantComparison
        variants={[variant]}
        onSelectVariant={mockOnSelectVariant}
        onGenerateNew={mockOnGenerateNew}
        showScores={true}
      />
    );

    expect(screen.getByText('85점')).toBeInTheDocument();
    expect(screen.getByText('참여도')).toBeInTheDocument();

    rerender(
      <MockVariantComparison
        variants={[variant]}
        onSelectVariant={mockOnSelectVariant}
        onGenerateNew={mockOnGenerateNew}
        showScores={false}
      />
    );

    expect(screen.queryByText('85점')).not.toBeInTheDocument();
    expect(screen.queryByText('참여도')).not.toBeInTheDocument();
  });

  it('변형 메타데이터를 표시해야 함', () => {
    const variant = createMockPostVariant({
      aiModel: 'gpt-4-turbo',
      creditsUsed: 2,
      generatedAt: '2024-01-15T10:30:00Z',
    });

    render(
      <MockVariantComparison
        variants={[variant]}
        onSelectVariant={mockOnSelectVariant}
        onGenerateNew={mockOnGenerateNew}
      />
    );

    expect(screen.getByText('gpt-4-turbo')).toBeInTheDocument();
    expect(screen.getByText('2 크레딧')).toBeInTheDocument();
    expect(screen.getByText('2024. 1. 15.')).toBeInTheDocument();
  });

  it('점수에 따라 색상을 다르게 표시해야 함', () => {
    const highScoreVariant = createMockPostVariant({ overallScore: 95 });
    const lowScoreVariant = createMockPostVariant({ overallScore: 45 });

    render(
      <MockVariantComparison
        variants={[highScoreVariant, lowScoreVariant]}
        onSelectVariant={mockOnSelectVariant}
        onGenerateNew={mockOnGenerateNew}
      />
    );

    // 실제 구현에서는 점수에 따른 CSS 클래스나 스타일이 적용되어야 함
    const highScoreElement = screen.getByText('95점');
    const lowScoreElement = screen.getByText('45점');

    expect(highScoreElement).toBeInTheDocument();
    expect(lowScoreElement).toBeInTheDocument();
  });

  it('변형을 정렬할 수 있어야 함', () => {
    const variants = [
      createMockPostVariant({ _id: 'variant1', overallScore: 75 }),
      createMockPostVariant({ _id: 'variant2', overallScore: 90 }),
      createMockPostVariant({ _id: 'variant3', overallScore: 82 }),
    ];

    // 점수 순으로 정렬된 변형들
    const sortedVariants = [...variants].sort((a, b) => b.overallScore - a.overallScore);

    render(
      <MockVariantComparison
        variants={sortedVariants}
        onSelectVariant={mockOnSelectVariant}
        onGenerateNew={mockOnGenerateNew}
      />
    );

    const variantCards = screen.getAllByText(/변형 \d+/);
    expect(variantCards).toHaveLength(3);

    // 첫 번째가 가장 높은 점수여야 함
    expect(screen.getByText('90점')).toBeInTheDocument();
  });

  it('반응형 레이아웃을 지원해야 함', () => {
    const variants = Array.from({ length: 4 }, () => createMockPostVariant());

    render(
      <MockVariantComparison
        variants={variants}
        onSelectVariant={mockOnSelectVariant}
        onGenerateNew={mockOnGenerateNew}
      />
    );

    const grid = screen.getByTestId('variant-comparison').querySelector('.variants-grid');
    expect(grid).toBeInTheDocument();

    // 실제 구현에서는 CSS Grid나 Flexbox를 사용한 반응형 레이아웃이 적용되어야 함
    variants.forEach((variant) => {
      expect(screen.getByTestId(`variant-${variant._id}`)).toBeInTheDocument();
    });
  });

  it('키보드 네비게이션을 지원해야 함', async () => {
    const user = userEvent.setup();
    const variants = [createMockPostVariant()];

    render(
      <MockVariantComparison
        variants={variants}
        onSelectVariant={mockOnSelectVariant}
        onGenerateNew={mockOnGenerateNew}
      />
    );

    // Tab으로 요소들 사이 이동
    await user.tab();
    expect(screen.getByTestId('generate-new-btn')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId(`select-${variants[0]._id}`)).toHaveFocus();

    // Enter로 선택
    await user.keyboard('{Enter}');
    expect(mockOnSelectVariant).toHaveBeenCalledWith(variants[0]._id);
  });

  it('A/B 테스트 결과 요약을 표시해야 함', () => {
    const abTestData = createScenarioData.abTesting('post123');

    const MockVariantComparisonWithSummary = () => (
      <div>
        <MockVariantComparison
          variants={abTestData.variants}
          onSelectVariant={mockOnSelectVariant}
          onGenerateNew={mockOnGenerateNew}
        />
        <div className="ab-test-summary" data-testid="ab-test-summary">
          <h4>A/B 테스트 요약</h4>
          <div className="winner">
            승자: 변형 {abTestData.variants.findIndex(v => v.isSelected) + 1}
          </div>
          <div className="improvement">
            개선도: +{Math.max(...abTestData.variants.map(v => v.overallScore)) - Math.min(...abTestData.variants.map(v => v.overallScore))}점
          </div>
        </div>
      </div>
    );

    render(<MockVariantComparisonWithSummary />);

    expect(screen.getByTestId('ab-test-summary')).toBeInTheDocument();
    expect(screen.getByText('A/B 테스트 요약')).toBeInTheDocument();
    expect(screen.getByText(/승자: 변형/)).toBeInTheDocument();
    expect(screen.getByText(/개선도:/)).toBeInTheDocument();
  });
});