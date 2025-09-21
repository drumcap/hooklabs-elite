/**
 * VariantGenerator 컴포넌트 단위 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VariantGenerator } from '@/components/social/content/VariantGenerator';
import { TestDataFactory, ConvexTestUtils } from '@/tests/setup/convex-setup';
import { AuthTestUtils } from '@/tests/setup/auth-setup';
import { useQuery, useMutation, useAction } from 'convex/react';
import { toast } from 'sonner';

// 모킹
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('convex/react');

const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;
const mockUseMutation = useMutation as ReturnType<typeof vi.fn>;
const mockUseAction = useAction as ReturnType<typeof vi.fn>;

// 테스트 데이터 설정
const mockPersona = TestDataFactory.createPersona();
const mockUser = TestDataFactory.createUser();
const mockVariants = [
  TestDataFactory.createPostVariant({
    _id: 'variant_1' as any,
    content: 'First variant content',
    overallScore: 85,
    isSelected: false,
  }),
  TestDataFactory.createPostVariant({
    _id: 'variant_2' as any,
    content: 'Second variant content',
    overallScore: 92,
    isSelected: true,
  }),
];

const defaultProps = {
  postId: 'post_test_id' as any,
  originalContent: 'This is the original content',
  persona: mockPersona,
  onVariantSelect: vi.fn(),
  onGenerateMore: vi.fn(),
};

// 테스트 유틸리티
const renderVariantGenerator = (props = {}) => {
  const mergedProps = { ...defaultProps, ...props };
  return render(<VariantGenerator {...mergedProps} />);
};

describe('VariantGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 기본 모킹 설정
    AuthTestUtils.mockSignedInUser();
    mockUseQuery.mockImplementation((apiFunction) => {
      switch (apiFunction) {
        case 'postVariants:getByPostId':
          return mockVariants;
        case 'users:current':
          return mockUser;
        default:
          return undefined;
      }
    });

    mockUseMutation.mockReturnValue(vi.fn().mockResolvedValue({}));
    mockUseAction.mockReturnValue(vi.fn().mockResolvedValue({
      success: true,
      totalVariants: 3,
      creditsUsed: 15,
    }));
  });

  describe('렌더링', () => {
    it('postId가 없을 때 준비 상태를 표시한다', () => {
      renderVariantGenerator({ postId: undefined });

      expect(screen.getByText('AI 변형 생성 준비됨')).toBeInTheDocument();
      expect(screen.getByText('콘텐츠를 입력하고 "AI 변형 생성" 버튼을 클릭하세요')).toBeInTheDocument();
    });

    it('variants가 로딩 중일 때 로딩 스피너를 표시한다', () => {
      mockUseQuery.mockImplementation((apiFunction) => {
        if (apiFunction === 'postVariants:getByPostId') return undefined;
        if (apiFunction === 'users:current') return mockUser;
        return undefined;
      });

      renderVariantGenerator();

      expect(screen.getByRole('status')).toBeInTheDocument(); // 로딩 스피너
    });

    it('변형이 없을 때 빈 상태를 표시한다', () => {
      mockUseQuery.mockImplementation((apiFunction) => {
        if (apiFunction === 'postVariants:getByPostId') return [];
        if (apiFunction === 'users:current') return mockUser;
        return undefined;
      });

      renderVariantGenerator();

      expect(screen.getByText('아직 생성된 변형이 없습니다')).toBeInTheDocument();
      expect(screen.getByText('첫 변형 생성하기')).toBeInTheDocument();
    });

    it('변형 목록을 올바르게 렌더링한다', () => {
      renderVariantGenerator();

      expect(screen.getByText('AI 생성 변형')).toBeInTheDocument();
      expect(screen.getByText(`${mockPersona.name}의 스타일로 생성된 2개의 변형`)).toBeInTheDocument();

      // 변형 카드들 확인
      expect(screen.getByText('First variant content')).toBeInTheDocument();
      expect(screen.getByText('Second variant content')).toBeInTheDocument();

      // 점수 표시 확인
      expect(screen.getByText('85점')).toBeInTheDocument();
      expect(screen.getByText('92점')).toBeInTheDocument();
    });

    it('원본 콘텐츠를 올바르게 표시한다', () => {
      renderVariantGenerator();

      expect(screen.getByText('원본 콘텐츠')).toBeInTheDocument();
      expect(screen.getByText(defaultProps.originalContent)).toBeInTheDocument();
      expect(screen.getByText(mockPersona.name)).toBeInTheDocument();
    });

    it('선택된 변형을 강조 표시한다', () => {
      renderVariantGenerator();

      const selectedVariant = screen.getByText('Second variant content').closest('[class*="ring-"]');
      expect(selectedVariant).toBeInTheDocument();

      const selectedBadge = screen.getByText('선택됨');
      expect(selectedBadge).toBeInTheDocument();
    });
  });

  describe('변형 생성', () => {
    it('변형 생성 버튼을 클릭하면 새 변형을 생성한다', async () => {
      const user = userEvent.setup();
      const mockGenerateVariants = vi.fn().mockResolvedValue({
        success: true,
        totalVariants: 3,
        creditsUsed: 15,
      });

      mockUseAction.mockReturnValue(mockGenerateVariants);

      renderVariantGenerator();

      const generateButton = screen.getByText('더 생성');
      await user.click(generateButton);

      expect(mockGenerateVariants).toHaveBeenCalledWith({
        userId: mockUser._id,
        postId: defaultProps.postId,
        personaId: mockPersona._id,
        originalContent: defaultProps.originalContent,
        platforms: ['twitter', 'threads'],
        variantCount: 5,
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('3개의 새로운 변형이 생성되었습니다! (15 크레딧 사용)');
      });
    });

    it('사용자가 없을 때 에러 메시지를 표시한다', async () => {
      const user = userEvent.setup();

      mockUseQuery.mockImplementation((apiFunction) => {
        if (apiFunction === 'postVariants:getByPostId') return mockVariants;
        if (apiFunction === 'users:current') return null; // 사용자 없음
        return undefined;
      });

      renderVariantGenerator();

      const generateButton = screen.getByText('더 생성');
      await user.click(generateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('사용자 정보를 불러올 수 없습니다. 페이지를 새로고침 해주세요.');
      });
    });

    it('변형 생성 실패 시 에러 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      const mockGenerateVariants = vi.fn().mockRejectedValue(new Error('크레딧이 부족합니다'));

      mockUseAction.mockReturnValue(mockGenerateVariants);

      renderVariantGenerator();

      const generateButton = screen.getByText('더 생성');
      await user.click(generateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('크레딧이 부족합니다. 크레딧을 충전한 후 다시 시도해주세요.');
      });
    });

    it('생성 중일 때 로딩 상태를 표시한다', async () => {
      const user = userEvent.setup();
      let resolveGeneration: (value: any) => void;
      const generationPromise = new Promise((resolve) => {
        resolveGeneration = resolve;
      });

      const mockGenerateVariants = vi.fn().mockReturnValue(generationPromise);
      mockUseAction.mockReturnValue(mockGenerateVariants);

      renderVariantGenerator();

      const generateButton = screen.getByText('더 생성');
      await user.click(generateButton);

      // 로딩 상태 확인
      expect(screen.getByText('생성 중...')).toBeInTheDocument();
      expect(generateButton).toBeDisabled();

      // 생성 완료
      resolveGeneration!({
        success: true,
        totalVariants: 2,
        creditsUsed: 10,
      });

      await waitFor(() => {
        expect(screen.queryByText('생성 중...')).not.toBeInTheDocument();
      });
    });
  });

  describe('변형 선택', () => {
    it('변형을 클릭하면 선택된다', async () => {
      const user = userEvent.setup();
      const mockSelectVariant = vi.fn().mockResolvedValue({});

      mockUseMutation.mockImplementation((apiFunction) => {
        if (apiFunction === 'postVariants:selectVariant') return mockSelectVariant;
        return vi.fn();
      });

      renderVariantGenerator();

      const firstVariantButton = screen.getByText('이 변형 선택').closest('button');
      await user.click(firstVariantButton!);

      expect(mockSelectVariant).toHaveBeenCalledWith({
        id: 'variant_1',
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('변형이 선택되었습니다');
      });

      expect(defaultProps.onVariantSelect).toHaveBeenCalledWith(mockVariants[0]);
    });

    it('이미 선택된 변형을 클릭하면 선택이 해제된다', async () => {
      const user = userEvent.setup();
      const mockDeselectVariant = vi.fn().mockResolvedValue({});

      mockUseMutation.mockImplementation((apiFunction) => {
        if (apiFunction === 'postVariants:deselectVariant') return mockDeselectVariant;
        return vi.fn();
      });

      renderVariantGenerator();

      // 이미 선택된 변형(variant_2)의 버튼 찾기
      const selectedVariantContainer = screen.getByText('Second variant content').closest('.group');
      const deselectButton = selectedVariantContainer?.querySelector('button');

      await user.click(deselectButton!);

      expect(mockDeselectVariant).toHaveBeenCalledWith({
        id: 'variant_2',
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('변형 선택이 해제되었습니다');
      });
    });

    it('변형 선택 실패 시 에러 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      const mockSelectVariant = vi.fn().mockRejectedValue(new Error('선택 실패'));

      mockUseMutation.mockImplementation((apiFunction) => {
        if (apiFunction === 'postVariants:selectVariant') return mockSelectVariant;
        return vi.fn();
      });

      renderVariantGenerator();

      const firstVariantButton = screen.getByText('이 변형 선택').closest('button');
      await user.click(firstVariantButton!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('선택 실패');
      });
    });
  });

  describe('변형 복사', () => {
    it('복사 버튼을 클릭하면 클립보드에 복사된다', async () => {
      const user = userEvent.setup();

      // Clipboard API 모킹
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });

      renderVariantGenerator();

      // 첫 번째 변형에 호버하여 복사 버튼 표시
      const firstVariantCard = screen.getByText('First variant content').closest('.group');
      await user.hover(firstVariantCard!);

      const copyButton = firstVariantCard?.querySelector('[data-testid="copy-button"]') ||
                        firstVariantCard?.querySelector('button[aria-label*="copy"]') ||
                        screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      await user.click(copyButton!);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('First variant content');

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('변형이 클립보드에 복사되었습니다!');
      });
    });

    it('복사 실패 시 에러 메시지를 표시한다', async () => {
      const user = userEvent.setup();

      // Clipboard API 실패 모킹
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard error')),
        },
      });

      renderVariantGenerator();

      const firstVariantCard = screen.getByText('First variant content').closest('.group');
      await user.hover(firstVariantCard!);

      const copyButton = firstVariantCard?.querySelector('button');
      await user.click(copyButton!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('복사에 실패했습니다');
      });
    });
  });

  describe('점수 시스템', () => {
    it('변형 점수에 따른 등급을 올바르게 표시한다', () => {
      const highScoreVariant = TestDataFactory.createPostVariant({
        _id: 'high_score' as any,
        content: 'High score content',
        overallScore: 95,
      });

      const lowScoreVariant = TestDataFactory.createPostVariant({
        _id: 'low_score' as any,
        content: 'Low score content',
        overallScore: 45,
      });

      mockUseQuery.mockImplementation((apiFunction) => {
        if (apiFunction === 'postVariants:getByPostId') return [highScoreVariant, lowScoreVariant];
        if (apiFunction === 'users:current') return mockUser;
        return undefined;
      });

      renderVariantGenerator();

      // S등급 (90점 이상)
      expect(screen.getByText('S')).toBeInTheDocument();

      // D등급 (50점 미만)
      expect(screen.getByText('D')).toBeInTheDocument();
    });

    it('점수 세부 정보를 올바르게 표시한다', () => {
      renderVariantGenerator();

      // 점수 카테고리들 확인
      expect(screen.getByText('참여도')).toBeInTheDocument();
      expect(screen.getByText('바이럴')).toBeInTheDocument();
      expect(screen.getByText('페르소나')).toBeInTheDocument();
      expect(screen.getByText('가독성')).toBeInTheDocument();
    });
  });

  describe('접근성', () => {
    it('적절한 ARIA 라벨을 가지고 있다', () => {
      renderVariantGenerator();

      const generateButton = screen.getByRole('button', { name: /더 생성/i });
      expect(generateButton).toBeInTheDocument();

      const selectButtons = screen.getAllByRole('button', { name: /이 변형 선택/i });
      expect(selectButtons.length).toBeGreaterThan(0);
    });

    it('키보드 네비게이션이 가능하다', async () => {
      const user = userEvent.setup();

      renderVariantGenerator();

      // Tab으로 네비게이션
      await user.tab();

      const generateButton = screen.getByText('더 생성');
      expect(generateButton).toHaveFocus();
    });

    it('스크린 리더용 텍스트를 제공한다', () => {
      renderVariantGenerator();

      // 점수 정보에 대한 설명 텍스트 확인
      expect(screen.getByText('좋아요, 댓글 예상')).toBeInTheDocument();
      expect(screen.getByText('공유 가능성')).toBeInTheDocument();
      expect(screen.getByText('톤 일치도')).toBeInTheDocument();
      expect(screen.getByText('읽기 편함')).toBeInTheDocument();
    });
  });

  describe('성능', () => {
    it('많은 변형이 있어도 렌더링이 빠르다', () => {
      const manyVariants = Array.from({ length: 100 }, (_, index) =>
        TestDataFactory.createPostVariant({
          _id: `variant_${index}` as any,
          content: `Variant content ${index}`,
          overallScore: Math.floor(Math.random() * 100),
        })
      );

      mockUseQuery.mockImplementation((apiFunction) => {
        if (apiFunction === 'postVariants:getByPostId') return manyVariants;
        if (apiFunction === 'users:current') return mockUser;
        return undefined;
      });

      const startTime = performance.now();
      renderVariantGenerator();
      const endTime = performance.now();

      // 렌더링이 100ms 이내에 완료되어야 함
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});