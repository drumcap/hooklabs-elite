/**
 * PersonaCard 컴포넌트 테스트
 * 페르소나 카드 UI 및 상호작용 테스트
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonaCard } from '../../../components/social/personas/PersonaCard';
import { mockPersonas } from '../../fixtures/social/personas';

// UI 컴포넌트 모킹
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => 
    <div data-testid="persona-card" className={className} {...props}>{children}</div>,
  CardContent: ({ children, className, ...props }: any) => 
    <div data-testid="card-content" className={className} {...props}>{children}</div>,
  CardDescription: ({ children, className, ...props }: any) => 
    <div data-testid="card-description" className={className} {...props}>{children}</div>,
  CardHeader: ({ children, className, ...props }: any) => 
    <div data-testid="card-header" className={className} {...props}>{children}</div>,
  CardTitle: ({ children, className, ...props }: any) => 
    <h3 data-testid="card-title" className={className} {...props}>{children}</h3>
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className, ...props }: any) => 
    <div data-testid="avatar" className={className} {...props}>{children}</div>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className, ...props }: any) => 
    <button 
      data-testid="button"
      onClick={onClick} 
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
      {...props}
    >
      {children}
    </button>
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className, ...props }: any) => 
    <span data-testid="badge" data-variant={variant} className={className} {...props}>
      {children}
    </span>
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, disabled, className, ...props }: any) => 
    <input
      type="checkbox"
      data-testid="switch"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      className={className}
      {...props}
    />
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children, align, ...props }: any) => 
    <div data-testid="dropdown-content" data-align={align} {...props}>{children}</div>,
  DropdownMenuItem: ({ children, onClick, className, ...props }: any) => 
    <button 
      data-testid="dropdown-item" 
      onClick={onClick} 
      className={className}
      {...props}
    >
      {children}
    </button>,
  DropdownMenuTrigger: ({ children, asChild, ...props }: any) => 
    <div data-testid="dropdown-trigger" {...props}>{children}</div>
}));

// Lucide React 아이콘 모킹
vi.mock('lucide-react', () => ({
  Edit: () => <span data-testid="edit-icon">Edit</span>,
  MoreVertical: () => <span data-testid="more-vertical-icon">MoreVertical</span>,
  Trash2: () => <span data-testid="trash-icon">Trash2</span>,
  User: () => <span data-testid="user-icon">User</span>,
  MessageCircle: () => <span data-testid="message-circle-icon">MessageCircle</span>,
  TrendingUp: () => <span data-testid="trending-up-icon">TrendingUp</span>,
  Settings: () => <span data-testid="settings-icon">Settings</span>
}));

describe('PersonaCard', () => {
  const mockPersona = mockPersonas.saasFounder;
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnToggleActive = vi.fn();

  const defaultProps = {
    persona: mockPersona,
    postCount: 5,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onToggleActive: mockOnToggleActive
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('렌더링', () => {
    it('페르소나 정보를 올바르게 표시해야 함', () => {
      render(<PersonaCard {...defaultProps} />);

      expect(screen.getByText(mockPersona.name)).toBeInTheDocument();
      expect(screen.getByText(mockPersona.role)).toBeInTheDocument();
      expect(screen.getByText(`톤: ${mockPersona.tone}`)).toBeInTheDocument();
      
      if (mockPersona.description) {
        expect(screen.getByText(mockPersona.description)).toBeInTheDocument();
      }
    });

    it('관심사 배지들을 표시해야 함', () => {
      render(<PersonaCard {...defaultProps} />);

      const interestBadges = screen.getAllByTestId('badge').filter(
        badge => mockPersona.interests.includes(badge.textContent || '')
      );
      
      expect(interestBadges).toHaveLength(mockPersona.interests.length);
      
      mockPersona.interests.forEach(interest => {
        expect(screen.getByText(interest)).toBeInTheDocument();
      });
    });

    it('전문분야 배지들을 표시해야 함', () => {
      render(<PersonaCard {...defaultProps} />);

      mockPersona.expertise.forEach(skill => {
        expect(screen.getByText(skill)).toBeInTheDocument();
      });
    });

    it('게시물 개수를 표시해야 함', () => {
      render(<PersonaCard {...defaultProps} />);

      expect(screen.getByText('게시물 5개')).toBeInTheDocument();
    });

    it('생성 날짜를 표시해야 함', () => {
      render(<PersonaCard {...defaultProps} />);

      const expectedDate = new Date(mockPersona.createdAt).toLocaleDateString('ko-KR');
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });

    it('활성 상태를 올바르게 표시해야 함', () => {
      // 활성 페르소나
      render(<PersonaCard {...defaultProps} />);
      expect(screen.getByText('활성')).toBeInTheDocument();

      // 비활성 페르소나
      const inactivePersona = { ...mockPersona, isActive: false };
      render(<PersonaCard {...defaultProps} persona={inactivePersona} />);
      expect(screen.getByText('비활성')).toBeInTheDocument();
    });
  });

  describe('아바타', () => {
    it('아바타 이미지가 있을 때 이미지를 표시해야 함', () => {
      const personaWithAvatar = { ...mockPersona, avatar: 'https://example.com/avatar.jpg' };
      render(<PersonaCard {...defaultProps} persona={personaWithAvatar} />);

      const avatarImg = screen.getByRole('img');
      expect(avatarImg).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(avatarImg).toHaveAttribute('alt', personaWithAvatar.name);
    });

    it('아바타 이미지가 없을 때 이니셜을 표시해야 함', () => {
      const personaWithoutAvatar = { ...mockPersona, avatar: undefined };
      render(<PersonaCard {...defaultProps} persona={personaWithoutAvatar} />);

      expect(screen.getByText(mockPersona.name.charAt(0).toUpperCase())).toBeInTheDocument();
    });
  });

  describe('스위치 상호작용', () => {
    it('활성/비활성 스위치가 현재 상태를 반영해야 함', () => {
      render(<PersonaCard {...defaultProps} />);

      const switch_ = screen.getByTestId('switch') as HTMLInputElement;
      expect(switch_.checked).toBe(mockPersona.isActive);
    });

    it('스위치 클릭 시 onToggleActive가 호출되어야 함', async () => {
      const user = userEvent.setup();
      render(<PersonaCard {...defaultProps} />);

      const switch_ = screen.getByTestId('switch');
      await user.click(switch_);

      expect(mockOnToggleActive).toHaveBeenCalledWith(mockPersona._id);
    });

    it('토글 중에는 스위치가 비활성화되어야 함', async () => {
      // onToggleActive가 Promise를 반환하도록 모킹
      let resolveToggle: (value?: any) => void;
      const togglePromise = new Promise(resolve => {
        resolveToggle = resolve;
      });
      mockOnToggleActive.mockReturnValue(togglePromise);

      const user = userEvent.setup();
      render(<PersonaCard {...defaultProps} />);

      const switch_ = screen.getByTestId('switch') as HTMLInputElement;
      
      // 스위치 클릭
      await user.click(switch_);
      
      // 토글 중에는 비활성화
      expect(switch_.disabled).toBe(true);

      // Promise 해결 후에는 다시 활성화
      resolveToggle!();
      await waitFor(() => {
        expect(switch_.disabled).toBe(false);
      });
    });
  });

  describe('드롭다운 메뉴', () => {
    it('수정 버튼 클릭 시 onEdit가 호출되어야 함', async () => {
      const user = userEvent.setup();
      render(<PersonaCard {...defaultProps} />);

      const editButton = screen.getByText('수정').closest('button');
      expect(editButton).toBeInTheDocument();
      
      if (editButton) {
        await user.click(editButton);
        expect(mockOnEdit).toHaveBeenCalledWith(mockPersona);
      }
    });

    it('삭제 버튼 클릭 시 onDelete가 호출되어야 함', async () => {
      const user = userEvent.setup();
      render(<PersonaCard {...defaultProps} />);

      const deleteButton = screen.getByText('삭제').closest('button');
      expect(deleteButton).toBeInTheDocument();
      
      if (deleteButton) {
        await user.click(deleteButton);
        expect(mockOnDelete).toHaveBeenCalledWith(mockPersona._id);
      }
    });

    it('수정 및 삭제 버튼이 올바른 아이콘과 텍스트를 표시해야 함', () => {
      render(<PersonaCard {...defaultProps} />);

      expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
      expect(screen.getByText('수정')).toBeInTheDocument();
      
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
      expect(screen.getByText('삭제')).toBeInTheDocument();
    });
  });

  describe('props 기본값', () => {
    it('postCount가 제공되지 않으면 0으로 표시해야 함', () => {
      const propsWithoutPostCount = {
        ...defaultProps,
        postCount: undefined
      };
      render(<PersonaCard {...propsWithoutPostCount} />);

      expect(screen.getByText('게시물 0개')).toBeInTheDocument();
    });

    it('description이 없으면 표시하지 않아야 함', () => {
      const personaWithoutDescription = { ...mockPersona, description: undefined };
      render(<PersonaCard {...defaultProps} persona={personaWithoutDescription} />);

      // description이 있는 경우의 텍스트가 없어야 함
      expect(screen.queryByText(mockPersona.description || '')).not.toBeInTheDocument();
    });
  });

  describe('스타일링', () => {
    it('활성 상태에 따른 올바른 CSS 클래스가 적용되어야 함', () => {
      // 활성 페르소나
      const { rerender } = render(<PersonaCard {...defaultProps} />);
      
      const activeStatus = screen.getByText('활성');
      expect(activeStatus).toHaveClass('bg-green-50', 'text-green-700');

      // 비활성 페르소나
      const inactivePersona = { ...mockPersona, isActive: false };
      rerender(<PersonaCard {...defaultProps} persona={inactivePersona} />);
      
      const inactiveStatus = screen.getByText('비활성');
      expect(inactiveStatus).toHaveClass('bg-gray-50', 'text-gray-500');
    });

    it('카드에 올바른 CSS 클래스가 적용되어야 함', () => {
      render(<PersonaCard {...defaultProps} />);

      const card = screen.getByTestId('persona-card');
      expect(card).toHaveClass('group', 'hover:shadow-md', 'transition-shadow');
    });

    it('삭제 버튼에 위험 색상 클래스가 적용되어야 함', () => {
      render(<PersonaCard {...defaultProps} />);

      const deleteButton = screen.getByText('삭제').closest('button');
      expect(deleteButton).toHaveClass('text-red-600', 'hover:text-red-700');
    });
  });

  describe('접근성', () => {
    it('아바타 이미지에 올바른 alt 텍스트가 있어야 함', () => {
      const personaWithAvatar = { ...mockPersona, avatar: 'https://example.com/avatar.jpg' };
      render(<PersonaCard {...defaultProps} persona={personaWithAvatar} />);

      const avatarImg = screen.getByRole('img');
      expect(avatarImg).toHaveAttribute('alt', personaWithAvatar.name);
    });

    it('스위치가 체크박스 역할을 해야 함', () => {
      render(<PersonaCard {...defaultProps} />);

      const switch_ = screen.getByTestId('switch');
      expect(switch_).toHaveAttribute('type', 'checkbox');
    });

    it('버튼들이 올바른 역할을 가져야 함', () => {
      render(<PersonaCard {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('에러 처리', () => {
    it('빈 관심사 배열을 처리할 수 있어야 함', () => {
      const personaWithEmptyInterests = { ...mockPersona, interests: [] };
      render(<PersonaCard {...defaultProps} persona={personaWithEmptyInterests} />);

      // 관심사 섹션은 표시되지만 배지는 없어야 함
      expect(screen.getByText('관심사')).toBeInTheDocument();
      
      const interestBadges = screen.getAllByTestId('badge').filter(
        badge => badge.getAttribute('data-variant') === 'secondary'
      );
      expect(interestBadges).toHaveLength(0);
    });

    it('빈 전문분야 배열을 처리할 수 있어야 함', () => {
      const personaWithEmptyExpertise = { ...mockPersona, expertise: [] };
      render(<PersonaCard {...defaultProps} persona={personaWithEmptyExpertise} />);

      expect(screen.getByText('전문분야')).toBeInTheDocument();
      
      const expertiseBadges = screen.getAllByTestId('badge').filter(
        badge => badge.getAttribute('data-variant') === 'outline'
      );
      expect(expertiseBadges).toHaveLength(0);
    });

    it('잘못된 날짜를 처리할 수 있어야 함', () => {
      const personaWithInvalidDate = { ...mockPersona, createdAt: 'invalid-date' };
      
      // 컴포넌트가 에러 없이 렌더링되어야 함
      expect(() => {
        render(<PersonaCard {...defaultProps} persona={personaWithInvalidDate} />);
      }).not.toThrow();
    });
  });

  describe('이벤트 핸들러 에러', () => {
    it('onToggleActive에서 에러가 발생해도 스위치가 다시 활성화되어야 함', async () => {
      const errorMessage = 'Toggle failed';
      mockOnToggleActive.mockRejectedValue(new Error(errorMessage));

      const user = userEvent.setup();
      render(<PersonaCard {...defaultProps} />);

      const switch_ = screen.getByTestId('switch') as HTMLInputElement;
      
      // 스위치 클릭
      await user.click(switch_);
      
      // 에러 후에도 스위치가 다시 활성화되어야 함
      await waitFor(() => {
        expect(switch_.disabled).toBe(false);
      });
    });
  });

  describe('성능 최적화', () => {
    it('불필요한 리렌더링을 방지해야 함', () => {
      const { rerender } = render(<PersonaCard {...defaultProps} />);
      
      // 같은 props로 리렌더링
      rerender(<PersonaCard {...defaultProps} />);
      
      // 컴포넌트가 여전히 올바르게 표시되어야 함
      expect(screen.getByText(mockPersona.name)).toBeInTheDocument();
    });
  });

  describe('다양한 데이터 시나리오', () => {
    it('다양한 페르소나 타입을 처리할 수 있어야 함', () => {
      Object.values(mockPersonas).forEach((persona) => {
        const { unmount } = render(
          <PersonaCard 
            persona={persona}
            postCount={Math.floor(Math.random() * 20)}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
            onToggleActive={mockOnToggleActive}
          />
        );

        expect(screen.getByText(persona.name)).toBeInTheDocument();
        expect(screen.getByText(persona.role)).toBeInTheDocument();
        
        unmount();
      });
    });

    it('긴 이름과 역할을 처리할 수 있어야 함', () => {
      const personaWithLongStrings = {
        ...mockPersona,
        name: '매우 긴 페르소나 이름을 가진 소셜 미디어 마케팅 전문가',
        role: '글로벌 디지털 마케팅 및 소셜 미디어 전략 컨설턴트 겸 콘텐츠 크리에이터'
      };

      render(<PersonaCard {...defaultProps} persona={personaWithLongStrings} />);

      expect(screen.getByText(personaWithLongStrings.name)).toBeInTheDocument();
      expect(screen.getByText(personaWithLongStrings.role)).toBeInTheDocument();
    });

    it('많은 관심사와 전문분야를 처리할 수 있어야 함', () => {
      const personaWithManyItems = {
        ...mockPersona,
        interests: Array.from({ length: 10 }, (_, i) => `관심사${i + 1}`),
        expertise: Array.from({ length: 8 }, (_, i) => `전문분야${i + 1}`)
      };

      render(<PersonaCard {...defaultProps} persona={personaWithManyItems} />);

      personaWithManyItems.interests.forEach(interest => {
        expect(screen.getByText(interest)).toBeInTheDocument();
      });

      personaWithManyItems.expertise.forEach(skill => {
        expect(screen.getByText(skill)).toBeInTheDocument();
      });
    });
  });
});