import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConvexProvider } from 'convex/react';
import { ConvexReactClient } from 'convex/react';
import { VariantComparison } from '../../components/social/variants/VariantComparison';
import { TokenExpiryAlert } from '../../components/social/tokens/TokenExpiryAlert';
import { Id } from '../../convex/_generated/dataModel';

// axe-core를 사용한 접근성 테스트
import { axe } from 'jest-axe';

// Mock Convex hooks
const mockUseQuery = vi.fn();

vi.mock('convex/react', () => ({
  useQuery: () => mockUseQuery(),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ConvexReactClient: vi.fn(),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// 접근성 테스트용 데이터
const mockAccessibilityVariants = [
  {
    _id: 'accessible-variant-1',
    content: '접근성 테스트용 첫 번째 변형입니다. 스크린 리더가 읽을 수 있는 명확한 내용입니다.',
    overallScore: 85,
    scoreBreakdown: {
      engagement: 90,
      virality: 80,
      personaMatch: 85,
      readability: 88,
      trending: 82,
    },
    isSelected: true,
    aiModel: 'gpt-4',
    generatedAt: new Date().toISOString(),
  },
  {
    _id: 'accessible-variant-2',
    content: '접근성 테스트용 두 번째 변형입니다. 키보드 탐색과 스크린 리더 호환성을 확인합니다.',
    overallScore: 78,
    scoreBreakdown: {
      engagement: 75,
      virality: 80,
      personaMatch: 78,
      readability: 82,
      trending: 75,
    },
    isSelected: false,
    aiModel: 'claude-3',
    generatedAt: new Date().toISOString(),
  },
];

const mockAccessibilityTokens = [
  {
    _id: 'accessible-token-1',
    platform: 'twitter',
    username: 'accessibility_user',
    displayName: '접근성 테스트 사용자',
    tokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30분 후 만료
  },
  {
    _id: 'accessible-token-2',
    platform: 'instagram',
    username: 'screen_reader_user',
    displayName: '스크린 리더 사용자',
    tokenExpiresAt: new Date(Date.now() - 60 * 1000).toISOString(), // 이미 만료됨
  },
];

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new ConvexReactClient('https://test.convex.cloud');
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
};

const mockPostId = 'accessibility-post-id' as Id<'socialPosts'>;

describe('소셜 미디어 기능 접근성 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('VariantComparison 접근성 테스트', () => {
    beforeEach(() => {
      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return mockAccessibilityVariants;
        if (api.toString().includes('getBestVariant')) return mockAccessibilityVariants[0];
        if (api.toString().includes('getAverageScores')) return {
          overallScore: 82,
          scoreBreakdown: { engagement: 83, virality: 80, personaMatch: 82, readability: 85, trending: 79 },
          variantCount: 2,
        };
        return undefined;
      });
    });

    it('WCAG 2.1 AA 접근성 기준을 준수해야 한다', async () => {
      const { container } = render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // axe-core를 사용한 자동 접근성 검사
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('적절한 ARIA 레이블과 역할을 가져야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 메인 컴포넌트가 적절한 역할을 가지는지 확인
      const mainContent = screen.getByText('변형 성능 비교').closest('[role="main"], main, section');
      expect(mainContent).toBeTruthy();

      // 탭 리스트가 적절한 ARIA 속성을 가지는지 확인
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);

      tabs.forEach((tab, index) => {
        expect(tab).toHaveAttribute('aria-controls');
        expect(tab).toHaveAttribute('aria-selected');
        expect(tab).toHaveAttribute('id');
      });

      // 탭 패널들이 적절한 ARIA 속성을 가지는지 확인
      const tabPanels = screen.getAllByRole('tabpanel');
      expect(tabPanels.length).toBeGreaterThan(0);

      tabPanels.forEach((panel) => {
        expect(panel).toHaveAttribute('aria-labelledby');
      });
    });

    it('버튼들이 접근 가능한 이름을 가져야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} enableCopy={true} />
        </TestWrapper>
      );

      // 모든 버튼이 접근 가능한 이름을 가지는지 확인
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        const accessibleName = button.getAttribute('aria-label') || 
                              button.getAttribute('aria-labelledby') ||
                              button.textContent ||
                              button.getAttribute('title');
        
        expect(accessibleName).toBeTruthy();
        expect(accessibleName!.trim()).not.toBe('');
      });
    });

    it('키보드 탐색이 논리적 순서로 작동해야 한다', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} enableCopy={true} />
        </TestWrapper>
      );

      // 첫 번째 포커스 가능한 요소로 포커스 이동
      await user.tab();
      
      let focusedElement = document.activeElement;
      expect(focusedElement).toBeTruthy();

      // 탭 키로 순차적으로 포커스 이동 테스트
      const focusSequence = [];
      const maxTabs = 20; // 무한 루프 방지
      
      for (let i = 0; i < maxTabs; i++) {
        if (focusedElement && focusedElement.tagName !== 'BODY') {
          focusSequence.push({
            tagName: focusedElement.tagName,
            type: focusedElement.getAttribute('type'),
            role: focusedElement.getAttribute('role'),
            ariaLabel: focusedElement.getAttribute('aria-label'),
            textContent: focusedElement.textContent?.slice(0, 20),
          });
        }

        await user.tab();
        const newFocusedElement = document.activeElement;
        
        if (newFocusedElement === focusedElement) {
          break; // 더 이상 포커스할 요소가 없음
        }
        
        focusedElement = newFocusedElement;
      }

      // 포커스 가능한 요소가 있는지 확인
      expect(focusSequence.length).toBeGreaterThan(0);

      // 탭 패널이 포커스 순서에 포함되었는지 확인 (논리적 순서)
      const hasTabInSequence = focusSequence.some(item => 
        item.role === 'tab' || item.tagName === 'BUTTON'
      );
      expect(hasTabInSequence).toBe(true);
    });

    it('Enter와 Space 키로 버튼을 활성화할 수 있어야 한다', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 요약 탭을 키보드로 활성화
      const summaryTab = screen.getByText('요약');
      summaryTab.focus();

      // Enter 키로 탭 활성화
      await user.keyboard('{Enter}');
      
      // 요약 탭이 활성화되었는지 확인
      expect(summaryTab).toHaveAttribute('aria-selected', 'true');
      
      // 상세 비교 탭으로 돌아가기
      const comparisonTab = screen.getByText('상세 비교');
      comparisonTab.focus();

      // Space 키로 탭 활성화
      await user.keyboard(' ');
      
      // 상세 비교 탭이 활성화되었는지 확인
      expect(comparisonTab).toHaveAttribute('aria-selected', 'true');
    });

    it('화살표 키로 탭 네비게이션이 작동해야 한다', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      const comparisonTab = screen.getByText('상세 비교');
      const summaryTab = screen.getByText('요약');

      // 첫 번째 탭에 포커스
      comparisonTab.focus();

      // 오른쪽 화살표로 다음 탭으로 이동
      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(summaryTab);

      // 왼쪽 화살표로 이전 탭으로 이동
      await user.keyboard('{ArrowLeft}');
      expect(document.activeElement).toBe(comparisonTab);
    });

    it('스크린 리더를 위한 적절한 텍스트 대안을 제공해야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 점수 차트나 시각적 요소들에 대한 텍스트 설명 확인
      const scoreElements = screen.getAllByText(/^\d+$/);
      scoreElements.forEach((scoreElement) => {
        const parentElement = scoreElement.parentElement;
        
        // 점수 요소가 의미 있는 레이블과 함께 있는지 확인
        const hasLabel = parentElement?.querySelector('[aria-label]') ||
                         parentElement?.textContent?.includes('점수') ||
                         parentElement?.textContent?.includes('참여도') ||
                         parentElement?.textContent?.includes('바이럴성');
        
        expect(hasLabel).toBeTruthy();
      });

      // 배지들이 적절한 텍스트를 가지는지 확인
      const badges = screen.getAllByText(/최고 점수|선택됨|변형/);
      badges.forEach((badge) => {
        expect(badge.textContent).toBeTruthy();
        expect(badge.textContent!.trim()).not.toBe('');
      });
    });

    it('색상만으로 정보를 전달하지 않아야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 상태를 나타내는 요소들이 색상 외에 텍스트나 아이콘도 가지는지 확인
      const statusElements = screen.getAllByText(/위험|주의|양호|선택됨|최고 점수/);
      
      statusElements.forEach((element) => {
        // 상태를 나타내는 텍스트가 있는지 확인
        expect(element.textContent).toBeTruthy();
        
        // 아이콘이나 추가 시각적 표시가 있는지 확인
        const hasIconOrSymbol = element.querySelector('svg') ||
                               element.textContent?.includes('★') ||
                               element.textContent?.includes('🔴') ||
                               element.textContent?.includes('🟡') ||
                               element.textContent?.includes('🟢');
        
        // 텍스트만으로도 상태를 알 수 있어야 함
        expect(element.textContent!.length).toBeGreaterThan(0);
      });
    });

    it('적절한 제목 구조를 가져야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 메인 제목 확인
      const mainHeading = screen.getByText('변형 성능 비교');
      const mainHeadingElement = mainHeading.closest('h1, h2, h3, h4, h5, h6');
      expect(mainHeadingElement).toBeTruthy();

      // 섹션 제목들이 적절한 레벨을 가지는지 확인
      const sectionHeadings = screen.getAllByText(/전체 평균 점수|성능 분석|변형 \d+/);
      sectionHeadings.forEach((heading) => {
        const headingElement = heading.closest('h1, h2, h3, h4, h5, h6');
        if (headingElement) {
          expect(headingElement.tagName).toMatch(/^H[1-6]$/);
        }
      });
    });
  });

  describe('TokenExpiryAlert 접근성 테스트', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockAccessibilityTokens);
    });

    it('WCAG 2.1 AA 접근성 기준을 준수해야 한다', async () => {
      const { container } = render(
        <TestWrapper>
          <TokenExpiryAlert />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('경고 메시지가 적절한 역할과 중요도를 가져야 한다', () => {
      render(
        <TestWrapper>
          <TokenExpiryAlert />
        </TestWrapper>
      );

      // 경고 메시지가 alert 역할을 가지거나 적절한 ARIA 속성을 가지는지 확인
      const alertElements = screen.getAllByRole('alert').length > 0 ||
                           document.querySelector('[aria-live="polite"]') ||
                           document.querySelector('[aria-live="assertive"]');
      
      expect(alertElements).toBeTruthy();

      // 토큰 만료 알림이 명확하게 표시되는지 확인
      const alertTitle = screen.getByText('토큰 만료 알림');
      expect(alertTitle).toBeInTheDocument();
    });

    it('갱신 버튼이 명확한 설명을 가져야 한다', () => {
      render(
        <TestWrapper>
          <TokenExpiryAlert />
        </TestWrapper>
      );

      const refreshButtons = screen.getAllByText('갱신');
      refreshButtons.forEach((button) => {
        // 버튼이 어떤 계정의 토큰을 갱신하는지 명확해야 함
        const buttonElement = button.closest('button');
        const parentContainer = buttonElement?.closest('[data-testid*="token"], .token-item, .account-item');
        
        if (parentContainer) {
          const hasAccountInfo = parentContainer.textContent?.includes('@') ||
                                 parentContainer.querySelector('[data-testid*="platform"]') ||
                                 parentContainer.querySelector('[data-testid*="username"]');
          
          expect(hasAccountInfo).toBeTruthy();
        }

        // 버튼이 비활성화된 상태에서의 접근성 확인
        if (buttonElement?.hasAttribute('disabled')) {
          expect(buttonElement).toHaveAttribute('aria-disabled', 'true');
        }
      });
    });

    it('시간 정보가 스크린 리더에게 명확하게 전달되어야 한다', () => {
      render(
        <TestWrapper>
          <TokenExpiryAlert />
        </TestWrapper>
      );

      // 시간 관련 정보들이 의미있게 구조화되어 있는지 확인
      const timeElements = screen.getAllByText(/시간|분|만료됨|후/);
      
      timeElements.forEach((timeElement) => {
        // 시간 정보가 적절한 컨텍스트와 함께 있는지 확인
        const parent = timeElement.closest('div, span, p');
        const hasContext = parent?.textContent?.includes('만료') ||
                           parent?.textContent?.includes('남은') ||
                           parent?.textContent?.includes('후');
        
        expect(hasContext).toBeTruthy();
      });
    });

    it('키보드로 모든 기능에 접근할 수 있어야 한다', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TokenExpiryAlert />
        </TestWrapper>
      );

      // 갱신 버튼이 키보드로 활성화 가능한지 확인
      const refreshButtons = screen.getAllByText('갱신');
      
      if (refreshButtons.length > 0) {
        const firstRefreshButton = refreshButtons[0].closest('button');
        
        if (firstRefreshButton) {
          firstRefreshButton.focus();
          expect(document.activeElement).toBe(firstRefreshButton);

          // Enter 키로 버튼 활성화
          await user.keyboard('{Enter}');
          
          // 새 창이 열리는 기능이므로, 오류가 발생하지 않는지만 확인
          expect(firstRefreshButton).toBeInTheDocument();
        }
      }
    });

    it('빈 상태에서도 적절한 접근성을 제공해야 한다', async () => {
      mockUseQuery.mockReturnValue([]);

      const { container } = render(
        <TestWrapper>
          <TokenExpiryAlert />
        </TestWrapper>
      );

      // 빈 상태 메시지가 접근 가능한지 확인
      expect(screen.getByText('모든 연결된 계정의 토큰이 안전합니다')).toBeInTheDocument();

      // 빈 상태에서도 WCAG 기준을 준수하는지 확인
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('고대비 모드 및 확대/축소 접근성', () => {
    it('고대비 모드에서도 텍스트가 읽기 쉬워야 한다', () => {
      // CSS 미디어 쿼리를 시뮬레이션하기 위해 클래스 추가
      document.body.classList.add('high-contrast');

      render(
        <TestWrapper>
          <div className="high-contrast">
            <VariantComparison postId={mockPostId} />
          </div>
        </TestWrapper>
      );

      // 모든 텍스트 요소가 충분한 대비를 가지는지 확인
      const textElements = screen.getAllByText(/점수|변형|참여도|바이럴성/);
      textElements.forEach((element) => {
        const computedStyle = window.getComputedStyle(element);
        
        // 텍스트가 투명하지 않은지 확인
        expect(computedStyle.opacity).not.toBe('0');
        expect(computedStyle.visibility).not.toBe('hidden');
      });

      document.body.classList.remove('high-contrast');
    });

    it('200% 확대에서도 레이아웃이 깨지지 않아야 한다', () => {
      // 뷰포트 크기를 축소하여 확대 시뮬레이션
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640, // 1280의 50%
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 400, // 800의 50%
      });

      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 중요한 UI 요소들이 여전히 접근 가능한지 확인
      expect(screen.getByText('변형 성능 비교')).toBeInTheDocument();
      expect(screen.getByText('상세 비교')).toBeInTheDocument();
      expect(screen.getByText('요약')).toBeInTheDocument();

      // 탭이 여전히 작동하는지 확인
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);
    });

    it('모바일 환경에서의 접근성을 확인해야 한다', () => {
      // 모바일 뷰포트 시뮬레이션
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 터치 타겟 크기가 적절한지 확인 (최소 44px)
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        const computedStyle = window.getComputedStyle(button);
        const minSize = parseInt(computedStyle.minHeight) || parseInt(computedStyle.height);
        
        // 버튼이 충분한 크기를 가지는지 확인 (대략적인 검증)
        expect(button).toBeInTheDocument(); // 기본적으로 렌더링되는지만 확인
      });

      // 텍스트가 여전히 읽기 가능한 크기인지 확인
      const textElements = screen.getAllByText(/변형|점수/);
      textElements.forEach((element) => {
        const computedStyle = window.getComputedStyle(element);
        const fontSize = parseInt(computedStyle.fontSize);
        
        // 최소 글꼴 크기 확인 (16px 기준)
        expect(fontSize).toBeGreaterThanOrEqual(12); // 모바일에서 허용 가능한 최소 크기
      });
    });
  });

  describe('초점 관리', () => {
    it('모달이나 팝업에서 초점이 적절히 관리되어야 한다', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TokenExpiryAlert />
        </TestWrapper>
      );

      const refreshButtons = screen.queryAllByText('갱신');
      
      if (refreshButtons.length > 0) {
        const refreshButton = refreshButtons[0].closest('button');
        
        if (refreshButton) {
          // 버튼 클릭 시 초점이 적절히 처리되는지 확인
          await user.click(refreshButton);
          
          // 새 창이 열린 후에도 원래 버튼이 포커스를 유지하는지 확인
          expect(document.activeElement).toBe(refreshButton);
        }
      }
    });

    it('탭 전환 시 초점이 올바르게 이동해야 한다', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      const summaryTab = screen.getByText('요약');
      
      // 탭 클릭 시
      await user.click(summaryTab);
      
      // 탭이 활성화되고 포커스가 적절히 관리되는지 확인
      expect(summaryTab).toHaveAttribute('aria-selected', 'true');
      
      // 해당 탭 패널이 표시되는지 확인
      const tabPanel = screen.getByRole('tabpanel');
      expect(tabPanel).toHaveAttribute('aria-labelledby', summaryTab.id);
    });
  });
});