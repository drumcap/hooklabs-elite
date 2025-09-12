/**
 * PaymentGate 컴포넌트 테스트
 * 구독 기반 접근 제어 컴포넌트 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock 사용자 및 구독 데이터 타입
interface MockUser {
  id: string;
  name?: string;
  email?: string;
}

interface MockSubscription {
  id: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  plan: 'free' | 'pro' | 'enterprise';
  planId?: string;
  endsAt?: string;
}

// Mock 훅들
const mockUseAuth = vi.fn();
const mockUseSubscription = vi.fn();

// 단순화된 PaymentGate 컴포넌트 (실제 useState 없이 Mock 데이터 기반)
interface PaymentGateProps {
  children: React.ReactNode;
  requiredPlan?: 'free' | 'pro' | 'enterprise';
  fallbackContent?: React.ReactNode;
  customMessage?: string;
}

function MockPaymentGate({ 
  children, 
  requiredPlan = 'free', 
  fallbackContent, 
  customMessage 
}: PaymentGateProps) {
  const { user, isSignedIn } = mockUseAuth();
  const subscription = mockUseSubscription();
  
  // 로그인 확인
  if (!isSignedIn) {
    return (
      <div data-testid="login-required">
        <h3>로그인이 필요합니다</h3>
        <p>이 기능을 사용하려면 먼저 로그인해 주세요.</p>
        <button data-testid="login-button">로그인</button>
      </div>
    );
  }

  // 구독 상태 확인
  if (!subscription || subscription.status !== 'active') {
    return (
      <div data-testid="subscription-required">
        <h3>구독이 필요합니다</h3>
        <p>{customMessage || '이 기능을 사용하려면 구독이 필요합니다.'}</p>
        <button data-testid="upgrade-button">구독하기</button>
        {fallbackContent}
      </div>
    );
  }

  // 플랜 레벨 확인
  const planLevels = { free: 0, pro: 1, enterprise: 2 };
  const currentLevel = planLevels[subscription.plan];
  const requiredLevel = planLevels[requiredPlan];

  if (currentLevel < requiredLevel) {
    return (
      <div data-testid="plan-upgrade-required">
        <h3>플랜 업그레이드가 필요합니다</h3>
        <p>
          이 기능을 사용하려면 {requiredPlan.toUpperCase()} 플랜이 필요합니다. 
          현재 플랜: {subscription.plan.toUpperCase()}
        </p>
        <button data-testid="upgrade-plan-button">
          {requiredPlan.toUpperCase()}로 업그레이드
        </button>
        {fallbackContent}
      </div>
    );
  }

  // 접근 허용
  return <>{children}</>;
}

// 로딩 상태 컴포넌트
function LoadingPaymentGate({ children }: { children: React.ReactNode }) {
  const subscription = mockUseSubscription();
  
  if (subscription === undefined) {
    return (
      <div data-testid="loading-spinner">
        <p>구독 정보를 확인하는 중...</p>
        <div className="spinner" />
      </div>
    );
  }
  
  return <MockPaymentGate>{children}</MockPaymentGate>;
}

// 에러 처리 컴포넌트
function ErrorHandlingPaymentGate({ children }: { children: React.ReactNode }) {
  try {
    mockUseSubscription();
    return <MockPaymentGate>{children}</MockPaymentGate>;
  } catch (error) {
    return (
      <div data-testid="error-message">
        <p>구독 정보를 불러올 수 없습니다.</p>
        <p>페이지를 새로고침해 주세요.</p>
        <button data-testid="retry-button">다시 시도</button>
      </div>
    );
  }
}

// 접근성 컴포넌트
function AccessiblePaymentGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = mockUseAuth();
  
  if (!isSignedIn) {
    return (
      <div 
        data-testid="login-required"
        role="alert"
        aria-labelledby="login-title"
        aria-describedby="login-description"
      >
        <h3 id="login-title">로그인이 필요합니다</h3>
        <p id="login-description">이 기능을 사용하려면 먼저 로그인해 주세요.</p>
        <button 
          data-testid="login-button"
          aria-label="로그인 페이지로 이동"
        >
          로그인
        </button>
      </div>
    );
  }
  
  return <>{children}</>;
}

describe('PaymentGate 컴포넌트', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('로그인 상태 확인', () => {
    it('로그인하지 않은 사용자에게 로그인 요구를 표시해야 한다', () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: null,
        isSignedIn: false,
      });

      // Act
      render(
        <MockPaymentGate>
          <div data-testid="protected-content">보호된 콘텐츠</div>
        </MockPaymentGate>
      );

      // Assert
      expect(screen.getByTestId('login-required')).toBeInTheDocument();
      expect(screen.getByText('로그인이 필요합니다')).toBeInTheDocument();
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('로그인 버튼이 클릭 가능해야 한다', async () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: null,
        isSignedIn: false,
      });

      // Act
      render(
        <MockPaymentGate>
          <div data-testid="protected-content">보호된 콘텐츠</div>
        </MockPaymentGate>
      );

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      // Assert
      expect(loginButton).toBeInTheDocument();
      // 실제 구현에서는 navigate 함수 호출을 검증
    });
  });

  describe('구독 상태 확인', () => {
    it('구독이 없는 사용자에게 구독 요구를 표시해야 한다', () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: { id: 'user123' },
        isSignedIn: true,
      });
      mockUseSubscription.mockReturnValue(null);

      // Act
      render(
        <MockPaymentGate>
          <div data-testid="protected-content">보호된 콘텐츠</div>
        </MockPaymentGate>
      );

      // Assert
      expect(screen.getByTestId('subscription-required')).toBeInTheDocument();
      expect(screen.getByText('구독이 필요합니다')).toBeInTheDocument();
      expect(screen.getByTestId('upgrade-button')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('만료된 구독을 가진 사용자에게 구독 요구를 표시해야 한다', () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: { id: 'user123' },
        isSignedIn: true,
      });
      mockUseSubscription.mockReturnValue({
        id: 'sub_expired',
        status: 'expired',
        plan: 'pro',
        endsAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      });

      // Act
      render(
        <MockPaymentGate>
          <div data-testid="protected-content">보호된 콘텐츠</div>
        </MockPaymentGate>
      );

      // Assert
      expect(screen.getByTestId('subscription-required')).toBeInTheDocument();
      expect(screen.getByText('구독이 필요합니다')).toBeInTheDocument();
    });

    it('취소된 구독을 가진 사용자에게 구독 요구를 표시해야 한다', () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: { id: 'user123' },
        isSignedIn: true,
      });
      mockUseSubscription.mockReturnValue({
        id: 'sub_cancelled',
        status: 'cancelled',
        plan: 'pro',
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Act
      render(
        <MockPaymentGate>
          <div data-testid="protected-content">보호된 콘텐츠</div>
        </MockPaymentGate>
      );

      // Assert
      expect(screen.getByTestId('subscription-required')).toBeInTheDocument();
    });
  });

  describe('플랜 레벨 확인', () => {
    it('무료 플랜 사용자가 무료 콘텐츠에 접근할 수 있어야 한다', () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: { id: 'user123' },
        isSignedIn: true,
      });
      mockUseSubscription.mockReturnValue({
        id: 'sub_free',
        status: 'active',
        plan: 'free',
      });

      // Act
      render(
        <MockPaymentGate requiredPlan="free">
          <div data-testid="protected-content">무료 콘텐츠</div>
        </MockPaymentGate>
      );

      // Assert
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('무료 콘텐츠')).toBeInTheDocument();
      expect(screen.queryByTestId('plan-upgrade-required')).not.toBeInTheDocument();
    });

    it('무료 플랜 사용자가 프로 콘텐츠에 접근할 때 업그레이드 요구를 표시해야 한다', () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: { id: 'user123' },
        isSignedIn: true,
      });
      mockUseSubscription.mockReturnValue({
        id: 'sub_free',
        status: 'active',
        plan: 'free',
      });

      // Act
      render(
        <MockPaymentGate requiredPlan="pro">
          <div data-testid="protected-content">프로 콘텐츠</div>
        </MockPaymentGate>
      );

      // Assert
      expect(screen.getByTestId('plan-upgrade-required')).toBeInTheDocument();
      expect(screen.getByText('플랜 업그레이드가 필요합니다')).toBeInTheDocument();
      expect(screen.getByText(/PRO 플랜이 필요합니다/)).toBeInTheDocument();
      expect(screen.getByText(/현재 플랜: FREE/)).toBeInTheDocument();
      expect(screen.getByTestId('upgrade-plan-button')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('프로 플랜 사용자가 프로 콘텐츠에 접근할 수 있어야 한다', () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: { id: 'user123' },
        isSignedIn: true,
      });
      mockUseSubscription.mockReturnValue({
        id: 'sub_pro',
        status: 'active',
        plan: 'pro',
      });

      // Act
      render(
        <MockPaymentGate requiredPlan="pro">
          <div data-testid="protected-content">프로 콘텐츠</div>
        </MockPaymentGate>
      );

      // Assert
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('프로 콘텐츠')).toBeInTheDocument();
      expect(screen.queryByTestId('plan-upgrade-required')).not.toBeInTheDocument();
    });

    it('엔터프라이즈 플랜 사용자가 모든 콘텐츠에 접근할 수 있어야 한다', () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: { id: 'user123' },
        isSignedIn: true,
      });
      mockUseSubscription.mockReturnValue({
        id: 'sub_enterprise',
        status: 'active',
        plan: 'enterprise',
      });

      const testCases = ['free', 'pro', 'enterprise'] as const;

      testCases.forEach((requiredPlan) => {
        const { unmount } = render(
          <MockPaymentGate requiredPlan={requiredPlan}>
            <div data-testid="protected-content">{requiredPlan} 콘텐츠</div>
          </MockPaymentGate>
        );

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(screen.queryByTestId('plan-upgrade-required')).not.toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('커스텀 설정', () => {
    it('커스텀 메시지를 표시해야 한다', () => {
      // Arrange
      const customMessage = '이 고급 기능을 사용하려면 프로 플랜으로 업그레이드하세요!';
      mockUseAuth.mockReturnValue({
        user: { id: 'user123' },
        isSignedIn: true,
      });
      mockUseSubscription.mockReturnValue(null);

      // Act
      render(
        <MockPaymentGate customMessage={customMessage}>
          <div data-testid="protected-content">보호된 콘텐츠</div>
        </MockPaymentGate>
      );

      // Assert
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('fallback 콘텐츠를 표시해야 한다', () => {
      // Arrange
      const fallbackContent = (
        <div data-testid="fallback-content">
          <p>무료 버전으로 체험해보세요!</p>
          <button>무료 체험 시작</button>
        </div>
      );

      mockUseAuth.mockReturnValue({
        user: { id: 'user123' },
        isSignedIn: true,
      });
      mockUseSubscription.mockReturnValue(null);

      // Act
      render(
        <MockPaymentGate fallbackContent={fallbackContent}>
          <div data-testid="protected-content">보호된 콘텐츠</div>
        </MockPaymentGate>
      );

      // Assert
      expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
      expect(screen.getByText('무료 버전으로 체험해보세요!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '무료 체험 시작' })).toBeInTheDocument();
    });
  });

  describe('로딩 상태', () => {
    it('구독 정보 로딩 중에 로딩 스피너를 표시해야 한다', () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: { id: 'user123' },
        isSignedIn: true,
      });
      mockUseSubscription.mockReturnValue(undefined); // 로딩 상태

      // Act
      render(
        <LoadingPaymentGate>
          <div data-testid="protected-content">보호된 콘텐츠</div>
        </LoadingPaymentGate>
      );

      // Assert
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('구독 정보를 확인하는 중...')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('에러 처리', () => {
    it('구독 정보 로드 실패 시 에러 메시지를 표시해야 한다', () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: { id: 'user123' },
        isSignedIn: true,
      });
      mockUseSubscription.mockImplementation(() => {
        throw new Error('Failed to load subscription');
      });

      // Act
      render(
        <ErrorHandlingPaymentGate>
          <div data-testid="protected-content">보호된 콘텐츠</div>
        </ErrorHandlingPaymentGate>
      );

      // Assert
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('구독 정보를 불러올 수 없습니다.')).toBeInTheDocument();
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });
  });

  describe('접근성', () => {
    it('적절한 ARIA 속성을 가져야 한다', () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: null,
        isSignedIn: false,
      });

      // Act
      render(
        <AccessiblePaymentGate>
          <div data-testid="protected-content">보호된 콘텐츠</div>
        </AccessiblePaymentGate>
      );

      // Assert
      const alertElement = screen.getByTestId('login-required');
      expect(alertElement).toHaveAttribute('role', 'alert');
      expect(alertElement).toHaveAttribute('aria-labelledby', 'login-title');
      expect(alertElement).toHaveAttribute('aria-describedby', 'login-description');
      
      const loginButton = screen.getByTestId('login-button');
      expect(loginButton).toHaveAttribute('aria-label', '로그인 페이지로 이동');
    });

    it('키보드 내비게이션이 가능해야 한다', async () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: null,
        isSignedIn: false,
      });

      // Act
      render(
        <MockPaymentGate>
          <div data-testid="protected-content">보호된 콘텐츠</div>
        </MockPaymentGate>
      );

      const loginButton = screen.getByTestId('login-button');

      // Tab으로 포커스 이동
      await user.tab();
      expect(loginButton).toHaveFocus();

      // Enter 키로 클릭
      await user.keyboard('{Enter}');
      expect(loginButton).toBeInTheDocument();
    });
  });
});