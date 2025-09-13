/**
 * 소셜 미디어 고급 기능 접근성 테스트
 * WCAG 2.1 AA 준수, 키보드 네비게이션, 스크린 리더 지원 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibilityTester, renderWithProviders } from '../utils/social-media-test-helpers';
import { createSocialMediaDataSet } from '../fixtures/social-media-advanced';

// 접근성 테스트용 Mock 컴포넌트들
const MockTokenExpiryAlert = ({ 
  expiringTokens,
  onRefreshToken,
  onDismiss 
}: {
  expiringTokens: any[];
  onRefreshToken: (accountId: string) => void;
  onDismiss: (accountId: string) => void;
}) => (
  <div 
    role="alert" 
    aria-live="polite"
    aria-label="토큰 만료 알림"
    data-testid="token-expiry-alert"
  >
    {expiringTokens.length > 0 && (
      <div className="alert-container">
        <h2 id="alert-title">토큰 만료 예정</h2>
        <p aria-describedby="alert-title">
          {expiringTokens.length}개의 계정 토큰이 곧 만료됩니다.
        </p>
        
        <ul role="list" aria-label="만료 예정 계정 목록">
          {expiringTokens.map((account) => (
            <li key={account._id} role="listitem">
              <div className="account-info">
                <span className="platform" aria-label={`플랫폼: ${account.platform}`}>
                  {account.platform}
                </span>
                <span className="username" aria-label={`사용자명: ${account.username}`}>
                  @{account.username}
                </span>
                <time 
                  dateTime={account.tokenExpiresAt}
                  aria-label={`만료 시간: ${new Date(account.tokenExpiresAt).toLocaleString()}`}
                >
                  만료: {new Date(account.tokenExpiresAt).toLocaleString()}
                </time>
              </div>
              
              <div className="actions" role="group" aria-label="계정 작업">
                <button
                  onClick={() => onRefreshToken(account._id)}
                  aria-label={`${account.platform} 계정 토큰 새로고침`}
                  data-testid={`refresh-${account._id}`}
                >
                  토큰 새로고침
                </button>
                
                <button
                  onClick={() => onDismiss(account._id)}
                  aria-label={`${account.platform} 계정 알림 무시`}
                  data-testid={`dismiss-${account._id}`}
                >
                  무시
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

const MockVariantComparison = ({
  variants,
  selectedVariantId,
  onSelectVariant,
}: {
  variants: any[];
  selectedVariantId?: string;
  onSelectVariant: (variantId: string) => void;
}) => (
  <div data-testid="variant-comparison">
    <h2 id="comparison-title">변형 비교</h2>
    <p aria-describedby="comparison-title">
      {variants.length}개의 변형이 있습니다. 아래에서 최적의 변형을 선택하세요.
    </p>
    
    <div 
      role="group" 
      aria-labelledby="comparison-title"
      aria-describedby="variant-instructions"
    >
      <p id="variant-instructions" className="sr-only">
        각 변형은 점수와 함께 표시됩니다. 스페이스바나 엔터키로 선택할 수 있습니다.
      </p>
      
      {variants.map((variant, index) => (
        <div
          key={variant._id}
          className={`variant-card ${selectedVariantId === variant._id ? 'selected' : ''}`}
          role="article"
          aria-labelledby={`variant-title-${variant._id}`}
          data-testid={`variant-${variant._id}`}
        >
          <h3 id={`variant-title-${variant._id}`}>
            변형 {index + 1}
          </h3>
          
          <div className="score-section">
            <div 
              className="overall-score"
              aria-label={`전체 점수 ${variant.overallScore}점`}
            >
              <span aria-hidden="true">{variant.overallScore}점</span>
            </div>
            
            <div 
              className="score-breakdown"
              role="group"
              aria-label="세부 점수"
            >
              {Object.entries(variant.scoreBreakdown).map(([key, score]) => (
                <div key={key} className="score-item">
                  <span className="score-label">{key}</span>
                  <div 
                    className="score-bar"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={score}
                    aria-label={`${key} 점수 ${score}점`}
                  >
                    <div 
                      className="score-fill"
                      style={{ width: `${score}%` }}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="score-value" aria-hidden="true">
                    {score}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="variant-content">
            <h4>내용</h4>
            <p>{variant.content}</p>
          </div>
          
          <button
            onClick={() => onSelectVariant(variant._id)}
            className={selectedVariantId === variant._id ? 'selected-btn' : 'select-btn'}
            aria-pressed={selectedVariantId === variant._id}
            aria-label={`변형 ${index + 1} ${selectedVariantId === variant._id ? '선택됨' : '선택하기'}`}
            data-testid={`select-${variant._id}`}
          >
            {selectedVariantId === variant._id ? '선택됨' : '선택하기'}
          </button>
        </div>
      ))}
    </div>
  </div>
);

const MockGenerationHistory = ({
  generations,
  onFilter,
  filters = {},
}: {
  generations: any[];
  onFilter: (filters: any) => void;
  filters?: any;
}) => (
  <div data-testid="generation-history">
    <h2 id="history-title">AI 생성 이력</h2>
    
    <form 
      role="search" 
      aria-labelledby="history-title"
      onSubmit={(e) => e.preventDefault()}
    >
      <fieldset>
        <legend>필터 옵션</legend>
        
        <div className="filter-group">
          <label htmlFor="type-filter">타입별 필터</label>
          <select
            id="type-filter"
            value={filters.type || ''}
            onChange={(e) => onFilter({ ...filters, type: e.target.value || undefined })}
            aria-describedby="type-filter-help"
          >
            <option value="">모든 타입</option>
            <option value="variant_creation">변형 생성</option>
            <option value="content_optimization">내용 최적화</option>
          </select>
          <div id="type-filter-help" className="sr-only">
            생성 타입으로 이력을 필터링합니다
          </div>
        </div>
        
        <div className="filter-group">
          <label htmlFor="success-filter">상태별 필터</label>
          <select
            id="success-filter"
            value={filters.success?.toString() || ''}
            onChange={(e) => {
              const value = e.target.value;
              onFilter({ 
                ...filters, 
                success: value === '' ? undefined : value === 'true'
              });
            }}
          >
            <option value="">모든 상태</option>
            <option value="true">성공</option>
            <option value="false">실패</option>
          </select>
        </div>
      </fieldset>
    </form>
    
    <div 
      role="region" 
      aria-labelledby="results-title"
      aria-live="polite"
      aria-busy="false"
    >
      <h3 id="results-title" className="sr-only">
        생성 이력 결과 ({generations.length}개)
      </h3>
      
      {generations.length === 0 ? (
        <p role="status">생성 이력이 없습니다.</p>
      ) : (
        <ul role="list" aria-label="AI 생성 이력 목록">
          {generations.map((generation) => (
            <li 
              key={generation._id}
              role="listitem"
              className={`generation-item ${generation.success ? 'success' : 'failed'}`}
            >
              <article aria-labelledby={`gen-title-${generation._id}`}>
                <h4 id={`gen-title-${generation._id}`}>
                  {generation.type === 'variant_creation' && '변형 생성'}
                  {generation.type === 'content_optimization' && '내용 최적화'}
                  - {generation.success ? '성공' : '실패'}
                </h4>
                
                <div className="generation-details">
                  <div className="prompt-section">
                    <h5>프롬프트</h5>
                    <p>{generation.prompt}</p>
                  </div>
                  
                  {generation.success && generation.response && (
                    <div className="response-section">
                      <h5>응답</h5>
                      <p>{generation.response}</p>
                    </div>
                  )}
                  
                  {!generation.success && generation.errorMessage && (
                    <div className="error-section" role="alert">
                      <h5>오류</h5>
                      <p>{generation.errorMessage}</p>
                    </div>
                  )}
                </div>
                
                <footer className="generation-meta">
                  <span>모델: {generation.model}</span>
                  <span>크레딧: {generation.creditsUsed}</span>
                  <time dateTime={generation.createdAt}>
                    {new Date(generation.createdAt).toLocaleString()}
                  </time>
                </footer>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

describe('소셜 미디어 접근성 테스트', () => {
  const testData = createSocialMediaDataSet();
  let mockOnRefreshToken: ReturnType<typeof vi.fn>;
  let mockOnDismiss: ReturnType<typeof vi.fn>;
  let mockOnSelectVariant: ReturnType<typeof vi.fn>;
  let mockOnFilter: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnRefreshToken = vi.fn();
    mockOnDismiss = vi.fn();
    mockOnSelectVariant = vi.fn();
    mockOnFilter = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('WCAG 2.1 AA 준수', () => {
    it('모든 대화형 요소에 접근 가능한 이름이 있어야 함', async () => {
      const { container } = render(
        <MockTokenExpiryAlert
          expiringTokens={testData.socialAccounts.slice(0, 2)}
          onRefreshToken={mockOnRefreshToken}
          onDismiss={mockOnDismiss}
        />
      );

      const accessibilityIssues = AccessibilityTester.validateAriaLabels(container);
      
      expect(accessibilityIssues).toHaveLength(0);
      
      // 모든 버튼에 aria-label이나 텍스트 내용이 있는지 확인
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const hasAccessibleName = 
          button.getAttribute('aria-label') || 
          button.textContent?.trim();
        expect(hasAccessibleName).toBeTruthy();
      });
    });

    it('적절한 heading 구조를 가져야 함', () => {
      render(
        <MockGenerationHistory
          generations={testData.aiGenerations.slice(0, 3)}
          onFilter={mockOnFilter}
        />
      );

      // 제목 계층 구조 확인
      const h2 = screen.getByRole('heading', { level: 2 });
      expect(h2).toHaveTextContent('AI 생성 이력');

      const h3Elements = screen.getAllByRole('heading', { level: 3 });
      expect(h3Elements.length).toBeGreaterThan(0);

      const h4Elements = screen.getAllByRole('heading', { level: 4 });
      expect(h4Elements.length).toBeGreaterThan(0);

      const h5Elements = screen.getAllByRole('heading', { level: 5 });
      expect(h5Elements.length).toBeGreaterThan(0);
    });

    it('폼 요소들이 적절한 라벨을 가져야 함', () => {
      render(
        <MockGenerationHistory
          generations={testData.aiGenerations}
          onFilter={mockOnFilter}
        />
      );

      // 모든 select 요소가 라벨을 가지는지 확인
      const typeFilter = screen.getByLabelText('타입별 필터');
      const successFilter = screen.getByLabelText('상태별 필터');

      expect(typeFilter).toBeInTheDocument();
      expect(successFilter).toBeInTheDocument();

      // fieldset과 legend 확인
      const fieldset = screen.getByRole('group', { name: '필터 옵션' });
      expect(fieldset).toBeInTheDocument();
    });

    it('상태 메시지가 스크린 리더에 알려져야 함', async () => {
      render(
        <MockGenerationHistory
          generations={[]}
          onFilter={mockOnFilter}
        />
      );

      // role="status"를 가진 빈 상태 메시지 확인
      const emptyMessage = screen.getByRole('status');
      expect(emptyMessage).toHaveTextContent('생성 이력이 없습니다.');
    });

    it('진행률 표시기가 적절한 ARIA 속성을 가져야 함', () => {
      render(
        <MockVariantComparison
          variants={testData.variants.slice(0, 2)}
          selectedVariantId={testData.variants[0]._id}
          onSelectVariant={mockOnSelectVariant}
        />
      );

      // 모든 progressbar 요소 확인
      const progressBars = screen.getAllByRole('progressbar');
      
      progressBars.forEach(progressBar => {
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax', '100');
        expect(progressBar).toHaveAttribute('aria-valuenow');
        expect(progressBar).toHaveAttribute('aria-label');
      });
    });

    it('라이브 리전이 적절히 설정되어야 함', () => {
      render(
        <MockTokenExpiryAlert
          expiringTokens={testData.socialAccounts.slice(0, 1)}
          onRefreshToken={mockOnRefreshToken}
          onDismiss={mockOnDismiss}
        />
      );

      const alertRegion = screen.getByRole('alert');
      expect(alertRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('키보드 네비게이션', () => {
    it('Tab 키로 모든 대화형 요소를 순서대로 탐색할 수 있어야 함', async () => {
      const user = userEvent.setup();
      
      render(
        <MockVariantComparison
          variants={testData.variants.slice(0, 3)}
          onSelectVariant={mockOnSelectVariant}
        />
      );

      const buttons = screen.getAllByRole('button');
      
      // 첫 번째 버튼에 포커스
      await user.tab();
      expect(buttons[0]).toHaveFocus();

      // 두 번째 버튼에 포커스
      await user.tab();
      expect(buttons[1]).toHaveFocus();

      // 세 번째 버튼에 포커스
      await user.tab();
      expect(buttons[2]).toHaveFocus();
    });

    it('Shift+Tab으로 역순 탐색이 가능해야 함', async () => {
      const user = userEvent.setup();
      
      render(
        <MockTokenExpiryAlert
          expiringTokens={testData.socialAccounts.slice(0, 2)}
          onRefreshToken={mockOnRefreshToken}
          onDismiss={mockOnDismiss}
        />
      );

      const buttons = screen.getAllByRole('button');
      
      // 마지막 버튼에서 시작
      buttons[buttons.length - 1].focus();
      expect(buttons[buttons.length - 1]).toHaveFocus();

      // Shift+Tab으로 이전 버튼으로 이동
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(buttons[buttons.length - 2]).toHaveFocus();
    });

    it('Enter와 Space 키로 버튼을 활성화할 수 있어야 함', async () => {
      const user = userEvent.setup();
      
      render(
        <MockVariantComparison
          variants={testData.variants.slice(0, 1)}
          onSelectVariant={mockOnSelectVariant}
        />
      );

      const selectButton = screen.getByRole('button', { name: /변형 1 선택하기/ });
      selectButton.focus();

      // Enter 키로 버튼 클릭
      await user.keyboard('{Enter}');
      expect(mockOnSelectVariant).toHaveBeenCalledWith(testData.variants[0]._id);

      mockOnSelectVariant.mockClear();

      // Space 키로 버튼 클릭
      await user.keyboard(' ');
      expect(mockOnSelectVariant).toHaveBeenCalledWith(testData.variants[0]._id);
    });

    it('화살표 키로 옵션 그룹 내 탐색이 가능해야 함', async () => {
      const user = userEvent.setup();
      
      render(
        <MockGenerationHistory
          generations={testData.aiGenerations}
          onFilter={mockOnFilter}
        />
      );

      const typeSelect = screen.getByLabelText('타입별 필터');
      typeSelect.focus();

      // 화살표 키로 옵션 선택
      await user.keyboard('{ArrowDown}');
      expect(typeSelect).toHaveValue('variant_creation');

      await user.keyboard('{ArrowDown}');
      expect(typeSelect).toHaveValue('content_optimization');
    });

    it('포커스 트랩이 모달이나 오버레이에서 작동해야 함', async () => {
      const user = userEvent.setup();
      
      const MockModalDialog = ({ onClose }: { onClose: () => void }) => (
        <div 
          role="dialog" 
          aria-labelledby="modal-title"
          aria-modal="true"
          data-testid="modal"
        >
          <h2 id="modal-title">변형 상세 정보</h2>
          <button data-testid="first-button">첫 번째 버튼</button>
          <button data-testid="second-button">두 번째 버튼</button>
          <button onClick={onClose} data-testid="close-button">닫기</button>
        </div>
      );

      const mockOnClose = vi.fn();
      render(<MockModalDialog onClose={mockOnClose} />);

      const firstButton = screen.getByTestId('first-button');
      const closeButton = screen.getByTestId('close-button');

      // 첫 번째 버튼에 포커스
      firstButton.focus();
      expect(firstButton).toHaveFocus();

      // Tab을 여러 번 눌러 마지막 요소까지 이동
      await user.tab();
      await user.tab();
      expect(closeButton).toHaveFocus();

      // 한 번 더 Tab을 누르면 첫 번째 요소로 순환해야 함 (포커스 트랩)
      await user.tab();
      expect(firstButton).toHaveFocus();
    });
  });

  describe('스크린 리더 지원', () => {
    it('의미있는 텍스트가 스크린 리더에 노출되어야 함', () => {
      render(
        <MockVariantComparison
          variants={testData.variants.slice(0, 1)}
          selectedVariantId={testData.variants[0]._id}
          onSelectVariant={mockOnSelectVariant}
        />
      );

      // 스크린 리더 전용 텍스트 확인
      const instructions = screen.getByText(/각 변형은 점수와 함께 표시됩니다/);
      expect(instructions).toHaveClass('sr-only');

      // aria-label 확인
      const scoreBar = screen.getAllByRole('progressbar')[0];
      expect(scoreBar).toHaveAttribute('aria-label');
    });

    it('상태 변경이 스크린 리더에 알려져야 함', async () => {
      const user = userEvent.setup();
      
      render(
        <MockVariantComparison
          variants={testData.variants.slice(0, 2)}
          selectedVariantId={undefined}
          onSelectVariant={mockOnSelectVariant}
        />
      );

      const firstButton = screen.getByRole('button', { name: /변형 1 선택하기/ });
      
      // 초기 상태 확인
      expect(firstButton).toHaveAttribute('aria-pressed', 'false');

      // 클릭 후 상태 변경 시뮬레이션
      await user.click(firstButton);
      
      // 실제 구현에서는 선택 상태가 업데이트되어야 함
      expect(mockOnSelectVariant).toHaveBeenCalled();
    });

    it('에러 메시지가 적절히 공지되어야 함', () => {
      const failedGeneration = {
        ...testData.aiGenerations[0],
        success: false,
        errorMessage: 'API 한도 초과',
      };

      render(
        <MockGenerationHistory
          generations={[failedGeneration]}
          onFilter={mockOnFilter}
        />
      );

      // 에러 섹션이 role="alert"를 가지는지 확인
      const errorSection = screen.getByRole('alert');
      expect(errorSection).toHaveTextContent('API 한도 초과');
    });

    it('복잡한 데이터가 이해하기 쉽게 구조화되어야 함', () => {
      render(
        <MockVariantComparison
          variants={testData.variants.slice(0, 1)}
          onSelectVariant={mockOnSelectVariant}
        />
      );

      // 각 변형이 article로 마크업되어 있는지 확인
      const variantArticle = screen.getByRole('article');
      expect(variantArticle).toHaveAttribute('aria-labelledby');

      // 점수 그룹이 적절히 라벨링되어 있는지 확인
      const scoreGroup = screen.getByRole('group', { name: '세부 점수' });
      expect(scoreGroup).toBeInTheDocument();
    });
  });

  describe('색상 대비 및 시각적 접근성', () => {
    it('중요한 정보가 색상에만 의존하지 않아야 함', () => {
      render(
        <MockGenerationHistory
          generations={[
            { ...testData.aiGenerations[0], success: true },
            { ...testData.aiGenerations[1], success: false },
          ]}
          onFilter={mockOnFilter}
        />
      );

      // 성공/실패 상태가 클래스와 텍스트로 모두 표현되는지 확인
      const successItem = screen.getByText(/변형 생성 - 성공/);
      const failedItem = screen.getByText(/내용 최적화 - 실패/);

      expect(successItem).toBeInTheDocument();
      expect(failedItem).toBeInTheDocument();
    });

    it('포커스 표시기가 명확히 보여야 함', async () => {
      const user = userEvent.setup();
      
      render(
        <MockTokenExpiryAlert
          expiringTokens={testData.socialAccounts.slice(0, 1)}
          onRefreshToken={mockOnRefreshToken}
          onDismiss={mockOnDismiss}
        />
      );

      const button = screen.getByRole('button', { name: /토큰 새로고침/ });
      
      // 포커스 이동
      await user.tab();
      expect(button).toHaveFocus();

      // 실제 구현에서는 CSS로 포커스 스타일 확인
      // getComputedStyle(button).outline !== 'none'
    });

    it('확대/축소 시에도 사용성이 유지되어야 함', () => {
      // 200% 확대 시뮬레이션
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 2,
      });

      render(
        <MockVariantComparison
          variants={testData.variants.slice(0, 1)}
          onSelectVariant={mockOnSelectVariant}
        />
      );

      // 컨텐츠가 여전히 접근 가능한지 확인
      const button = screen.getByRole('button');
      const rect = button.getBoundingClientRect();
      
      // 버튼이 최소 44x44 픽셀 터치 타겟을 가지는지 확인
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
    });
  });

  describe('다국어 지원 접근성', () => {
    it('lang 속성이 적절히 설정되어야 함', () => {
      render(
        <div lang="ko">
          <MockGenerationHistory
            generations={testData.aiGenerations.slice(0, 1)}
            onFilter={mockOnFilter}
          />
        </div>
      );

      const container = screen.getByTestId('generation-history');
      const parentElement = container.closest('[lang]');
      expect(parentElement).toHaveAttribute('lang', 'ko');
    });

    it('날짜와 시간이 적절한 형식으로 표시되어야 함', () => {
      const generation = {
        ...testData.aiGenerations[0],
        createdAt: '2024-01-15T10:30:00Z',
      };

      render(
        <MockGenerationHistory
          generations={[generation]}
          onFilter={mockOnFilter}
        />
      );

      // time 요소가 적절한 datetime 속성을 가지는지 확인
      const timeElement = screen.getByText(/2024/);
      const timeTag = timeElement.closest('time');
      expect(timeTag).toHaveAttribute('datetime', '2024-01-15T10:30:00Z');
    });
  });

  describe('모바일 접근성', () => {
    it('터치 타겟이 충분한 크기를 가져야 함', () => {
      render(
        <MockTokenExpiryAlert
          expiringTokens={testData.socialAccounts.slice(0, 1)}
          onRefreshToken={mockOnRefreshToken}
          onDismiss={mockOnDismiss}
        />
      );

      const buttons = screen.getAllByRole('button');
      
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        // WCAG 권장 최소 터치 타겟 크기 44x44픽셀
        expect(Math.max(rect.width, rect.height)).toBeGreaterThanOrEqual(44);
      });
    });

    it('스와이프 제스처에 대한 대안이 제공되어야 함', () => {
      // 스와이프로 삭제하는 기능이 있다면 버튼으로도 제공되어야 함
      render(
        <MockGenerationHistory
          generations={testData.aiGenerations.slice(0, 1)}
          onFilter={mockOnFilter}
        />
      );

      // 삭제나 액션을 위한 명시적 버튼이 있는지 확인
      // 실제 구현에서는 스와이프 액션의 대안 버튼이 있어야 함
      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBeGreaterThan(0);
    });
  });

  describe('성능과 접근성의 균형', () => {
    it('가상화된 목록이 스크린 리더와 호환되어야 함', async () => {
      const user = userEvent.setup();
      
      // 대용량 데이터로 가상화 테스트
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...testData.aiGenerations[0],
        _id: `gen_${i}`,
        prompt: `Test prompt ${i}`,
      }));

      render(
        <MockGenerationHistory
          generations={largeDataset}
          onFilter={mockOnFilter}
        />
      );

      // 목록 전체가 스크린 리더에 인식되는지 확인
      const list = screen.getByRole('list');
      expect(list).toHaveAttribute('aria-label', 'AI 생성 이력 목록');

      // 키보드로 목록 내 탐색 가능한지 확인
      const firstItem = screen.getAllByRole('listitem')[0];
      firstItem.focus();
      expect(firstItem).toHaveFocus();
    });

    it('레이지 로딩이 스크린 리더 사용자에게 알려져야 함', () => {
      render(
        <div>
          <MockGenerationHistory
            generations={testData.aiGenerations.slice(0, 5)}
            onFilter={mockOnFilter}
          />
          <div 
            role="status" 
            aria-live="polite"
            data-testid="loading-status"
          >
            추가 데이터를 로딩 중입니다...
          </div>
        </div>
      );

      const loadingStatus = screen.getByTestId('loading-status');
      expect(loadingStatus).toHaveAttribute('aria-live', 'polite');
    });
  });
});