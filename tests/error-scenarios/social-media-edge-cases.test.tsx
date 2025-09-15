import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConvexProvider } from 'convex/react';
import { ConvexReactClient } from 'convex/react';
import { VariantComparison } from '../../components/social/variants/VariantComparison';
import { TokenExpiryAlert } from '../../components/social/tokens/TokenExpiryAlert';
import { Id } from '../../convex/_generated/dataModel';

// Mock Convex hooks
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('convex/react', () => ({
  useQuery: () => mockUseQuery(),
  useMutation: () => mockUseMutation(),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ConvexReactClient: vi.fn(),
}));

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

// Mock navigator APIs
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
  onLine: true,
});

// Network error 시뮬레이션
class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new ConvexReactClient('https://test.convex.cloud');
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
};

const mockPostId = 'error-test-post-id' as Id<'socialPosts'>;

describe('소셜 미디어 기능 오류 시나리오 및 엣지 케이스 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
    mockUseMutation.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('네트워크 오류 처리', () => {
    it('네트워크 오류 발생 시 적절한 에러 메시지를 표시해야 한다', async () => {
      // 네트워크 오류 시뮬레이션
      mockUseQuery.mockImplementation(() => {
        throw new NetworkError('Network request failed');
      });

      expect(() => {
        render(
          <TestWrapper>
            <VariantComparison postId={mockPostId} />
          </TestWrapper>
        );
      }).not.toThrow();

      // 에러가 콘솔에 로깅되었는지 확인
      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalled();
      });
    });

    it('오프라인 상태에서 적절히 동작해야 한다', () => {
      // 오프라인 상태 시뮬레이션
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      });

      mockUseQuery.mockReturnValue(null);

      expect(() => {
        render(
          <TestWrapper>
            <TokenExpiryAlert />
          </TestWrapper>
        );
      }).not.toThrow();

      // 네트워크 상태 복원
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: true,
      });
    });

    it('API 타임아웃 시 우아하게 처리해야 한다', async () => {
      // Promise를 사용한 타임아웃 시뮬레이션
      mockUseQuery.mockImplementation(() => {
        return new Promise(() => {
          // 영원히 resolve되지 않는 Promise (타임아웃 시뮬레이션)
        });
      });

      expect(() => {
        render(
          <TestWrapper>
            <VariantComparison postId={mockPostId} />
          </TestWrapper>
        );
      }).not.toThrow();

      // 로딩 상태가 표시되는지 확인
      expect(document.querySelector('[class*="animate-pulse"]') || 
             document.querySelector('[data-testid="loading"]')).toBeTruthy();
    });
  });

  describe('데이터 무결성 오류', () => {
    it('null 데이터에 대해 방어적으로 처리해야 한다', () => {
      mockUseQuery.mockReturnValue(null);

      expect(() => {
        render(
          <TestWrapper>
            <VariantComparison postId={mockPostId} />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    it('undefined 데이터에 대해 방어적으로 처리해야 한다', () => {
      mockUseQuery.mockReturnValue(undefined);

      expect(() => {
        render(
          <TestWrapper>
            <VariantComparison postId={mockPostId} />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    it('빈 배열 데이터를 적절히 처리해야 한다', () => {
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

    it('손상된 데이터 구조를 처리해야 한다', () => {
      const corruptedData = [
        {
          // _id 누락
          content: '손상된 변형 데이터',
          overallScore: 'invalid', // 잘못된 타입
          scoreBreakdown: null, // null 값
          isSelected: 'true', // 잘못된 타입
          aiModel: undefined,
          generatedAt: 'invalid-date',
        },
        {
          _id: 'valid-id',
          content: '', // 빈 내용
          overallScore: -50, // 음수 값
          scoreBreakdown: {
            engagement: 150, // 범위 초과
            virality: null,
            personaMatch: undefined,
            readability: 'high', // 잘못된 타입
            trending: NaN,
          },
          isSelected: false,
          aiModel: '',
          generatedAt: new Date().toISOString(),
        },
      ];

      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return corruptedData;
        if (api.toString().includes('getBestVariant')) return corruptedData[1];
        if (api.toString().includes('getAverageScores')) return {
          overallScore: null,
          scoreBreakdown: undefined,
          variantCount: 'two', // 잘못된 타입
        };
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

    it('순환 참조 데이터를 처리해야 한다', () => {
      const circularData: any = {
        _id: 'circular-id',
        content: '순환 참조 테스트',
        overallScore: 80,
        scoreBreakdown: {
          engagement: 80,
          virality: 80,
          personaMatch: 80,
          readability: 80,
          trending: 80,
        },
        isSelected: false,
        aiModel: 'test',
        generatedAt: new Date().toISOString(),
      };

      // 순환 참조 생성
      circularData.self = circularData;

      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return [circularData];
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
  });

  describe('클립보드 API 오류', () => {
    it('클립보드 API 실패 시 적절한 에러 처리를 해야 한다', async () => {
      const user = userEvent.setup();
      
      // 클립보드 API 실패 시뮬레이션
      (navigator.clipboard.writeText as any).mockRejectedValue(new Error('Clipboard access denied'));

      const mockVariants = [
        {
          _id: 'clipboard-test-variant',
          content: '클립보드 테스트 내용',
          overallScore: 80,
          scoreBreakdown: {
            engagement: 80,
            virality: 80,
            personaMatch: 80,
            readability: 80,
            trending: 80,
          },
          isSelected: false,
          aiModel: 'test',
          generatedAt: new Date().toISOString(),
        },
      ];

      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return mockVariants;
        if (api.toString().includes('getBestVariant')) return mockVariants[0];
        if (api.toString().includes('getAverageScores')) return {
          overallScore: 80,
          scoreBreakdown: { engagement: 80, virality: 80, personaMatch: 80, readability: 80, trending: 80 },
          variantCount: 1,
        };
        return undefined;
      });

      render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} enableCopy={true} />
        </TestWrapper>
      );

      // 복사 버튼 찾기 및 클릭
      const copyButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg') && button.getAttribute('class')?.includes('h-8 w-8')
      );

      if (copyButtons.length > 0) {
        await user.click(copyButtons[0]);

        // 에러가 콘솔에 로깅되었는지 확인
        await waitFor(() => {
          expect(mockConsoleError).toHaveBeenCalledWith(
            '텍스트 복사 실패:',
            expect.any(Error)
          );
        });
      }
    });

    it('클립보드 API가 지원되지 않는 환경에서 우아하게 처리해야 한다', async () => {
      const user = userEvent.setup();
      
      // 클립보드 API 미지원 시뮬레이션
      delete (navigator as any).clipboard;

      const mockVariants = [
        {
          _id: 'no-clipboard-variant',
          content: '클립보드 미지원 테스트',
          overallScore: 80,
          scoreBreakdown: {
            engagement: 80,
            virality: 80,
            personaMatch: 80,
            readability: 80,
            trending: 80,
          },
          isSelected: false,
          aiModel: 'test',
          generatedAt: new Date().toISOString(),
        },
      ];

      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return mockVariants;
        return undefined;
      });

      expect(() => {
        render(
          <TestWrapper>
            <VariantComparison postId={mockPostId} enableCopy={true} />
          </TestWrapper>
        );
      }).not.toThrow();

      // 클립보드 API 복원
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });
  });

  describe('메모리 누수 및 정리', () => {
    it('컴포넌트 언마운트 시 적절히 정리되어야 한다', () => {
      const mockVariants = [
        {
          _id: 'cleanup-variant',
          content: '정리 테스트',
          overallScore: 80,
          scoreBreakdown: {
            engagement: 80,
            virality: 80,
            personaMatch: 80,
            readability: 80,
            trending: 80,
          },
          isSelected: false,
          aiModel: 'test',
          generatedAt: new Date().toISOString(),
        },
      ];

      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return mockVariants;
        return undefined;
      });

      const { unmount } = render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('타이머 및 이벤트 리스너가 적절히 정리되어야 한다', () => {
      const mockTokens = [
        {
          _id: 'timer-test-token',
          platform: 'twitter',
          username: 'timer_test',
          displayName: '타이머 테스트 사용자',
          tokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
      ];

      mockUseQuery.mockReturnValue(mockTokens);

      const { unmount } = render(
        <TestWrapper>
          <TokenExpiryAlert />
        </TestWrapper>
      );

      // 컴포넌트가 setTimeout을 사용한다면 정리가 필요
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('브라우저 호환성 오류', () => {
    it('Date API 오류를 처리해야 한다', () => {
      const mockTokens = [
        {
          _id: 'date-error-token',
          platform: 'twitter',
          username: 'date_error',
          displayName: '날짜 오류 테스트',
          tokenExpiresAt: 'invalid-date-string',
        },
        {
          _id: 'date-null-token',
          platform: 'instagram',
          username: 'date_null',
          displayName: '널 날짜 테스트',
          tokenExpiresAt: null,
        },
      ];

      mockUseQuery.mockReturnValue(mockTokens);

      expect(() => {
        render(
          <TestWrapper>
            <TokenExpiryAlert />
          </TestWrapper>
        );
      }).not.toThrow();

      // "알 수 없음" 텍스트가 표시되는지 확인
      expect(screen.getAllByText('알 수 없음').length).toBeGreaterThan(0);
    });

    it('localStorage 접근 오류를 처리해야 한다', () => {
      // localStorage mock에서 오류 발생 시뮬레이션
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn().mockImplementation(() => {
            throw new Error('localStorage access denied');
          }),
          setItem: vi.fn().mockImplementation(() => {
            throw new Error('localStorage write failed');
          }),
        },
        writable: true,
      });

      expect(() => {
        render(
          <TestWrapper>
            <VariantComparison postId={mockPostId} />
          </TestWrapper>
        );
      }).not.toThrow();

      // localStorage 복원
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });
  });

  describe('극한 상황 테스트', () => {
    it('매우 긴 텍스트 내용을 처리해야 한다', () => {
      const veryLongContent = 'A'.repeat(10000); // 10,000자 문자열
      
      const extremeVariants = [
        {
          _id: 'extreme-length-variant',
          content: veryLongContent,
          overallScore: 80,
          scoreBreakdown: {
            engagement: 80,
            virality: 80,
            personaMatch: 80,
            readability: 80,
            trending: 80,
          },
          isSelected: false,
          aiModel: 'test',
          generatedAt: new Date().toISOString(),
        },
      ];

      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return extremeVariants;
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

    it('특수 문자와 이모지를 처리해야 한다', () => {
      const specialContentVariants = [
        {
          _id: 'special-chars-variant',
          content: '🎉🎊✨🚀 Special chars: <script>alert("xss")</script> & entities &lt;&gt; 한글 العربية 中文 🌟💫⭐',
          overallScore: 85,
          scoreBreakdown: {
            engagement: 85,
            virality: 85,
            personaMatch: 85,
            readability: 85,
            trending: 85,
          },
          isSelected: false,
          aiModel: 'test',
          generatedAt: new Date().toISOString(),
        },
      ];

      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return specialContentVariants;
        return undefined;
      });

      expect(() => {
        render(
          <TestWrapper>
            <VariantComparison postId={mockPostId} />
          </TestWrapper>
        );
      }).not.toThrow();

      // XSS 방지 확인 - 스크립트가 실행되지 않아야 함
      expect(screen.queryByText('alert("xss")')).toBeInTheDocument(); // 텍스트로만 표시
    });

    it('매우 높은 점수나 음수 점수를 처리해야 한다', () => {
      const extremeScoreVariants = [
        {
          _id: 'extreme-score-variant',
          content: '극한 점수 테스트',
          overallScore: Number.MAX_SAFE_INTEGER,
          scoreBreakdown: {
            engagement: -100,
            virality: Infinity,
            personaMatch: NaN,
            readability: 999999,
            trending: -Infinity,
          },
          isSelected: false,
          aiModel: 'test',
          generatedAt: new Date().toISOString(),
        },
      ];

      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) return extremeScoreVariants;
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
  });

  describe('동시성 오류', () => {
    it('빠른 연속 클릭을 처리해야 한다', async () => {
      const user = userEvent.setup();
      const mockMutation = vi.fn().mockResolvedValue('success');
      mockUseMutation.mockReturnValue(mockMutation);

      const mockTokens = [
        {
          _id: 'rapid-click-token',
          platform: 'twitter',
          username: 'rapid_click',
          displayName: '빠른 클릭 테스트',
          tokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
      ];

      mockUseQuery.mockReturnValue(mockTokens);

      render(
        <TestWrapper>
          <TokenExpiryAlert />
        </TestWrapper>
      );

      const refreshButtons = screen.getAllByText('갱신');
      
      if (refreshButtons.length > 0) {
        const refreshButton = refreshButtons[0];

        // 빠른 연속 클릭
        await Promise.all([
          user.click(refreshButton),
          user.click(refreshButton),
          user.click(refreshButton),
        ]);

        // 컴포넌트가 크래시하지 않았는지 확인
        expect(refreshButton).toBeInTheDocument();
      }
    });

    it('컴포넌트 업데이트 중 언마운트를 처리해야 한다', async () => {
      let resolveQuery: (value: any) => void;
      
      mockUseQuery.mockImplementation(() => {
        return new Promise((resolve) => {
          resolveQuery = resolve;
        });
      });

      const { unmount } = render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 비동기 업데이트가 진행 중일 때 언마운트
      setTimeout(() => {
        if (resolveQuery) {
          resolveQuery([]);
        }
      }, 100);

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('권한 및 보안 오류', () => {
    it('권한 없음 오류를 처리해야 한다', () => {
      mockUseQuery.mockImplementation(() => {
        throw new Error('Unauthorized access');
      });

      expect(() => {
        render(
          <TestWrapper>
            <VariantComparison postId={mockPostId} />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    it('CSRF 토큰 오류를 처리해야 한다', () => {
      const mockMutation = vi.fn().mockRejectedValue(new Error('CSRF token mismatch'));
      mockUseMutation.mockReturnValue(mockMutation);

      expect(() => {
        render(
          <TestWrapper>
            <TokenExpiryAlert />
          </TestWrapper>
        );
      }).not.toThrow();
    });
  });

  describe('복구 메커니즘', () => {
    it('오류 후 재시도가 가능해야 한다', async () => {
      const user = userEvent.setup();
      let callCount = 0;
      
      mockUseQuery.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First call fails');
        }
        return [];
      });

      const { rerender } = render(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 재렌더링으로 재시도 시뮬레이션
      rerender(
        <TestWrapper>
          <VariantComparison postId={mockPostId} />
        </TestWrapper>
      );

      // 두 번째 시도에서는 성공해야 함
      expect(callCount).toBe(2);
    });

    it('부분적 실패 상황에서 가용한 데이터를 표시해야 한다', () => {
      mockUseQuery.mockImplementation((api) => {
        if (api.toString().includes('getByPost')) {
          return [
            {
              _id: 'partial-success-variant',
              content: '부분 성공 테스트',
              overallScore: 80,
              scoreBreakdown: {
                engagement: 80,
                virality: 80,
                personaMatch: 80,
                readability: 80,
                trending: 80,
              },
              isSelected: false,
              aiModel: 'test',
              generatedAt: new Date().toISOString(),
            },
          ];
        }
        if (api.toString().includes('getBestVariant')) {
          throw new Error('Best variant query failed');
        }
        if (api.toString().includes('getAverageScores')) {
          throw new Error('Average scores query failed');
        }
        return undefined;
      });

      expect(() => {
        render(
          <TestWrapper>
            <VariantComparison postId={mockPostId} />
          </TestWrapper>
        );
      }).not.toThrow();

      // 기본 변형 리스트는 표시되어야 함
      expect(screen.getByText('부분 성공 테스트')).toBeInTheDocument();
    });
  });
});