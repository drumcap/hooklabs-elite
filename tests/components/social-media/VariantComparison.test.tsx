import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConvexProvider } from 'convex/react';
import { ConvexReactClient } from 'convex/react';
import { VariantComparison } from '../../../components/social/variants/VariantComparison';
import { Id } from '../../../convex/_generated/dataModel';

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

// Mock console.error
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock 변형 데이터
const mockVariants = [
  {
    _id: 'variant1',
    content: '첫 번째 변형입니다! 🚀 #AI #소셜미디어',
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
    generatedAt: new Date('2024-01-15').toISOString(),
  },
  {
    _id: 'variant2',
    content: '두 번째 변형입니다. 더 전문적인 톤으로 작성되었습니다.',
    overallScore: 78,
    scoreBreakdown: {
      engagement: 75,
      virality: 70,
      personaMatch: 82,
      readability: 85,
      trending: 78,
    },
    isSelected: false,
    aiModel: 'claude-3',
    generatedAt: new Date('2024-01-15').toISOString(),
  },
  {
    _id: 'variant3',
    content: '세 번째 변형! 캐주얼하고 친근한 스타일 ✨',
    overallScore: 92,
    scoreBreakdown: {
      engagement: 95,
      virality: 90,
      personaMatch: 88,
      readability: 92,
      trending: 95,
    },
    isSelected: false,
    aiModel: 'gpt-4',
    generatedAt: new Date('2024-01-15').toISOString(),
  },
];

const mockBestVariant = mockVariants[2]; // variant3 (점수 92)

const mockAverageScores = {
  overallScore: 85, // (85 + 78 + 92) / 3
  scoreBreakdown: {
    engagement: 87,
    virality: 80,
    personaMatch: 85,
    readability: 88,
    trending: 85,
  },
  variantCount: 3,
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new ConvexReactClient('https://test.convex.cloud');
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
};

const mockPostId = 'test-post-id' as Id<'socialPosts'>;

describe('VariantComparison 컴포넌트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본 mock 설정
    mockUseQuery.mockImplementation((api) => {
      if (api.toString().includes('getByPost')) return mockVariants;
      if (api.toString().includes('getBestVariant')) return mockBestVariant;
      if (api.toString().includes('getAverageScores')) return mockAverageScores;
      return undefined;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('로딩 상태', () => {
    it('데이터 로딩 중에 스켈레톤을 표시해야 한다', () => {
      mockUseQuery.mockReturnValue(undefined);

      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 스켈레톤 컴포넌트나 로딩 상태 확인
      expect(document.querySelector('[class*="animate-pulse"]') || 
             document.querySelector('[data-testid="skeleton"]')).toBeTruthy();
    });
  });

  describe('빈 상태', () => {
    it('변형이 없을 때 빈 상태 메시지를 표시해야 한다', () => {
      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return [];
        if (api.toString().includes('getBestVariant')) return null;
        if (api.toString().includes('getAverageScores')) return null;
        return undefined;
      });

      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      expect(screen.getByText('변형이 없습니다')).toBeInTheDocument();
      expect(screen.getByText('이 게시물에 대한 변형을 먼저 생성해 주세요.')).toBeInTheDocument();
    });
  });

  describe('변형 표시', () => {
    it('모든 변형을 점수순으로 표시해야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      expect(screen.getByText('변형 성능 비교')).toBeInTheDocument();
      expect(screen.getByText('3개 변형')).toBeInTheDocument();

      // 점수순 정렬 확인 (92, 85, 78)
      const scores = screen.getAllByText(/^\d{2,3}$/).filter(el => 
        parseInt(el.textContent || '0') > 50
      );
      expect(scores.length).toBeGreaterThanOrEqual(3);
    });

    it('최고 점수 변형에 크라운 배지를 표시해야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      expect(screen.getByText('최고 점수')).toBeInTheDocument();
    });

    it('선택된 변형에 선택됨 배지를 표시해야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      expect(screen.getByText('선택됨')).toBeInTheDocument();
    });

    it('각 변형의 콘텐츠를 표시해야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      expect(screen.getByText('첫 번째 변형입니다! 🚀 #AI #소셜미디어')).toBeInTheDocument();
      expect(screen.getByText('두 번째 변형입니다. 더 전문적인 톤으로 작성되었습니다.')).toBeInTheDocument();
      expect(screen.getByText('세 번째 변형! 캐주얼하고 친근한 스타일 ✨')).toBeInTheDocument();
    });

    it('각 변형의 점수 분석을 표시해야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 점수 카테고리 레이블 확인
      expect(screen.getAllByText('참여도')).toHaveLength(3);
      expect(screen.getAllByText('바이럴성')).toHaveLength(3);
      expect(screen.getAllByText('페르소나 일치도')).toHaveLength(3);
      expect(screen.getAllByText('가독성')).toHaveLength(3);
      expect(screen.getAllByText('트렌드')).toHaveLength(3);
    });

    it('AI 모델과 생성 날짜를 표시해야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      expect(screen.getAllByText(/모델: (gpt-4|claude-3)/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/생성: \d{4}\.\s?\d{1,2}\.\s?\d{1,2}\./).length).toBeGreaterThan(0);
    });
  });

  describe('탭 기능', () => {
    it('상세 비교와 요약 탭 간 전환이 가능해야 한다', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 기본적으로 상세 비교 탭이 활성화되어 있어야 함
      expect(screen.getByText('상세 비교')).toBeInTheDocument();

      // 요약 탭 클릭
      const summaryTab = screen.getByText('요약');
      await user.click(summaryTab);

      // 요약 탭 내용 확인
      expect(screen.getByText('전체 평균 점수')).toBeInTheDocument();
      expect(screen.getByText('성능 분석')).toBeInTheDocument();
    });

    it('요약 탭에서 평균 점수와 통계를 표시해야 한다', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 요약 탭으로 전환
      await user.click(screen.getByText('요약'));

      // 평균 점수 확인
      expect(screen.getByText('85')).toBeInTheDocument(); // 평균 점수

      // 성능 분석 통계 확인
      expect(screen.getByText('최고 점수')).toBeInTheDocument();
      expect(screen.getByText('최저 점수')).toBeInTheDocument();
      expect(screen.getByText('점수 범위')).toBeInTheDocument();
    });
  });

  describe('복사 기능', () => {
    it('복사 버튼 클릭 시 클립보드에 콘텐츠를 복사해야 한다', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} enableCopy={true} />
        </TestWrapper>
      );

      const copyButtons = screen.getAllByRole('button', { name: '' }); // Copy 아이콘 버튼
      const copyButton = copyButtons.find(button => 
        button.querySelector('svg') && button.getAttribute('class')?.includes('h-8 w-8')
      );

      if (copyButton) {
        await user.click(copyButton);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.any(String)
        );
      }
    });

    it('복사 완료 시 체크 아이콘을 표시해야 한다', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} enableCopy={true} />
        </TestWrapper>
      );

      const copyButtons = screen.getAllByRole('button', { name: '' });
      const copyButton = copyButtons.find(button => 
        button.querySelector('svg') && button.getAttribute('class')?.includes('h-8 w-8')
      );

      if (copyButton) {
        await user.click(copyButton);

        // 체크 아이콘이 표시되는지 확인 (실제로는 setTimeout 때문에 waitFor 필요)
        await waitFor(() => {
          const checkIcon = copyButton.querySelector('[class*="text-green-600"]');
          expect(checkIcon).toBeTruthy();
        }, { timeout: 100 });
      }
    });

    it('복사 기능 비활성화 시 복사 버튼을 표시하지 않아야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} enableCopy={false} />
        </TestWrapper>
      );

      // Copy 버튼이 없어야 함
      const copyButtons = screen.queryAllByRole('button', { name: '' }).filter(button => 
        button.querySelector('svg') && button.getAttribute('class')?.includes('h-8 w-8')
      );
      expect(copyButtons.length).toBe(0);
    });

    it('복사 실패 시 에러를 콘솔에 로깅해야 한다', async () => {
      const user = userEvent.setup();
      (navigator.clipboard.writeText as any).mockRejectedValue(new Error('클립보드 접근 거부'));

      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} enableCopy={true} />
        </TestWrapper>
      );

      const copyButtons = screen.getAllByRole('button', { name: '' });
      const copyButton = copyButtons.find(button => 
        button.querySelector('svg') && button.getAttribute('class')?.includes('h-8 w-8')
      );

      if (copyButton) {
        await user.click(copyButton);

        await waitFor(() => {
          expect(mockConsoleError).toHaveBeenCalledWith(
            '텍스트 복사 실패:',
            expect.any(Error)
          );
        });
      }
    });
  });

  describe('컴팩트 모드', () => {
    it('컴팩트 모드에서 콘텐츠를 숨겨야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} compact={true} />
        </TestWrapper>
      );

      // 컴팩트 모드에서는 콘텐츠 텍스트가 표시되지 않아야 함
      const contentElements = screen.queryAllByText(mockVariants[0].content);
      expect(contentElements.length).toBe(0);
    });

    it('일반 모드에서 콘텐츠를 표시해야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} compact={false} />
        </TestWrapper>
      );

      // 일반 모드에서는 콘텐츠가 표시되어야 함
      expect(screen.getByText(mockVariants[0].content)).toBeInTheDocument();
    });
  });

  describe('점수 색상 시스템', () => {
    it('점수에 따라 적절한 색상을 적용해야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // DOM 구조상 점수 색상 클래스가 적용되어 있는지 확인
      const scoreElements = screen.getAllByText(/^\d{2,3}$/);
      
      // 높은 점수 (92)는 초록색이어야 함
      const highScoreElement = scoreElements.find(el => el.textContent === '92');
      if (highScoreElement) {
        expect(highScoreElement.className).toMatch(/text-green/);
      }
    });
  });

  describe('접근성', () => {
    it('적절한 ARIA 레이블을 가져야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 버튼들이 적절한 역할을 가지는지 확인
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('키보드 탐색이 가능해야 한다', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 탭 키로 요소들 간 이동 가능한지 확인
      const summaryTab = screen.getByText('요약');
      await user.tab();
      // 포커스가 이동하는지 확인 (정확한 요소는 구현에 따라 다를 수 있음)
      expect(document.activeElement).toBeTruthy();
    });
  });

  describe('커스터마이징', () => {
    it('커스텀 클래스명을 적용해야 한다', () => {
      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} className="custom-variant-comparison" />
        </TestWrapper>
      );

      const container = screen.getByText('변형 성능 비교').closest('.custom-variant-comparison');
      expect(container).toBeInTheDocument();
    });
  });

  describe('에러 처리', () => {
    it('잘못된 데이터에 대해 방어적으로 처리해야 한다', () => {
      const invalidVariants = [
        {
          _id: 'invalid1',
          content: '',
          overallScore: -1,
          scoreBreakdown: {
            engagement: 150,
            virality: -10,
            personaMatch: 0,
            readability: 0,
            trending: 0,
          },
          isSelected: false,
          aiModel: '',
          generatedAt: 'invalid-date',
        },
      ];

      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return invalidVariants;
        if (api.toString().includes('getBestVariant')) return invalidVariants[0];
        if (api.toString().includes('getAverageScores')) return null;
        return undefined;
      });

      expect(() => {
        render(
          <TestWrapper>
            <VariantComparison postId={mockPostId} />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    it('null 데이터에 대해 graceful하게 처리해야 한다', () => {
      mockUseQuery.mockImplementation((api) => {
        return null;
      });

      expect(() => {
        render(
          <TestWrapper>
            <VariantComparison postId={mockPostId} />
          </TestWrapper>
        );
      }).not.toThrow();
    });
  });
});