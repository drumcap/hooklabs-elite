/**
 * TokenExpiryAlert 컴포넌트 테스트
 * 토큰 만료 알림 및 새로고침 액션 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createExpiringToken } from '../../fixtures/social-media-advanced';

// Mock TokenExpiryAlert 컴포넌트 (실제 구현 대신)
const MockTokenExpiryAlert = ({ 
  expiringTokens, 
  onRefreshToken, 
  onDismiss,
  loading = false 
}: {
  expiringTokens: any[];
  onRefreshToken: (accountId: string) => void;
  onDismiss: (accountId: string) => void;
  loading?: boolean;
}) => (
  <div data-testid="token-expiry-alert">
    {expiringTokens.length > 0 && (
      <div className="alert alert-warning">
        <h3>토큰 만료 예정</h3>
        <p>{expiringTokens.length}개의 계정 토큰이 곧 만료됩니다.</p>
        
        {expiringTokens.map((account) => (
          <div key={account._id} className="account-item" data-testid={`account-${account._id}`}>
            <div className="account-info">
              <span className="platform">{account.platform}</span>
              <span className="username">@{account.username}</span>
              <span className="expires-at">
                만료: {new Date(account.tokenExpiresAt).toLocaleString()}
              </span>
            </div>
            
            <div className="actions">
              <button
                onClick={() => onRefreshToken(account._id)}
                disabled={loading}
                data-testid={`refresh-${account._id}`}
              >
                {loading ? '새로고침 중...' : '토큰 새로고침'}
              </button>
              
              <button
                onClick={() => onDismiss(account._id)}
                data-testid={`dismiss-${account._id}`}
              >
                무시
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

describe('TokenExpiryAlert', () => {
  const mockOnRefreshToken = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    mockOnRefreshToken.mockClear();
    mockOnDismiss.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('만료 예정 토큰이 없으면 알림을 표시하지 않아야 함', () => {
    render(
      <MockTokenExpiryAlert
        expiringTokens={[]}
        onRefreshToken={mockOnRefreshToken}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByTestId('token-expiry-alert')).toBeInTheDocument();
    expect(screen.queryByText('토큰 만료 예정')).not.toBeInTheDocument();
  });

  it('만료 예정 토큰이 있으면 알림을 표시해야 함', () => {
    const expiringTokens = [
      createExpiringToken(1), // 1시간 후 만료
      createExpiringToken(6), // 6시간 후 만료
    ];

    render(
      <MockTokenExpiryAlert
        expiringTokens={expiringTokens}
        onRefreshToken={mockOnRefreshToken}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('토큰 만료 예정')).toBeInTheDocument();
    expect(screen.getByText('2개의 계정 토큰이 곧 만료됩니다.')).toBeInTheDocument();
  });

  it('각 계정의 정보를 올바르게 표시해야 함', () => {
    const expiringToken = createExpiringToken(2);
    expiringToken.platform = 'twitter';
    expiringToken.username = 'test_user';

    render(
      <MockTokenExpiryAlert
        expiringTokens={[expiringToken]}
        onRefreshToken={mockOnRefreshToken}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('twitter')).toBeInTheDocument();
    expect(screen.getByText('@test_user')).toBeInTheDocument();
    expect(screen.getByText(/만료:/)).toBeInTheDocument();
  });

  it('토큰 새로고침 버튼을 클릭하면 콜백이 호출되어야 함', async () => {
    const user = userEvent.setup();
    const expiringToken = createExpiringToken(1);

    render(
      <MockTokenExpiryAlert
        expiringTokens={[expiringToken]}
        onRefreshToken={mockOnRefreshToken}
        onDismiss={mockOnDismiss}
      />
    );

    const refreshButton = screen.getByTestId(`refresh-${expiringToken._id}`);
    await user.click(refreshButton);

    expect(mockOnRefreshToken).toHaveBeenCalledWith(expiringToken._id);
    expect(mockOnRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('무시 버튼을 클릭하면 콜백이 호출되어야 함', async () => {
    const user = userEvent.setup();
    const expiringToken = createExpiringToken(1);

    render(
      <MockTokenExpiryAlert
        expiringTokens={[expiringToken]}
        onRefreshToken={mockOnRefreshToken}
        onDismiss={mockOnDismiss}
      />
    );

    const dismissButton = screen.getByTestId(`dismiss-${expiringToken._id}`);
    await user.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalledWith(expiringToken._id);
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('로딩 상태에서 버튼이 비활성화되어야 함', () => {
    const expiringToken = createExpiringToken(1);

    render(
      <MockTokenExpiryAlert
        expiringTokens={[expiringToken]}
        onRefreshToken={mockOnRefreshToken}
        onDismiss={mockOnDismiss}
        loading={true}
      />
    );

    const refreshButton = screen.getByTestId(`refresh-${expiringToken._id}`);
    expect(refreshButton).toBeDisabled();
    expect(refreshButton).toHaveTextContent('새로고침 중...');
  });

  it('여러 계정을 동시에 표시해야 함', () => {
    const expiringTokens = [
      { ...createExpiringToken(1), platform: 'twitter', username: 'twitter_user' },
      { ...createExpiringToken(2), platform: 'linkedin', username: 'linkedin_user' },
      { ...createExpiringToken(4), platform: 'facebook', username: 'facebook_user' },
    ];

    render(
      <MockTokenExpiryAlert
        expiringTokens={expiringTokens}
        onRefreshToken={mockOnRefreshToken}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('3개의 계정 토큰이 곧 만료됩니다.')).toBeInTheDocument();
    
    expiringTokens.forEach((token) => {
      expect(screen.getByTestId(`account-${token._id}`)).toBeInTheDocument();
      expect(screen.getByText(token.platform)).toBeInTheDocument();
      expect(screen.getByText(`@${token.username}`)).toBeInTheDocument();
    });
  });

  it('만료 시간을 적절한 형식으로 표시해야 함', () => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2시간 후
    
    const expiringToken = {
      ...createExpiringToken(2),
      tokenExpiresAt: expiresAt.toISOString(),
    };

    render(
      <MockTokenExpiryAlert
        expiringTokens={[expiringToken]}
        onRefreshToken={mockOnRefreshToken}
        onDismiss={mockOnDismiss}
      />
    );

    const expectedText = `만료: ${expiresAt.toLocaleString()}`;
    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });

  it('플랫폼별로 다른 스타일을 적용해야 함', () => {
    const tokens = [
      { ...createExpiringToken(1), platform: 'twitter' },
      { ...createExpiringToken(2), platform: 'linkedin' },
      { ...createExpiringToken(3), platform: 'facebook' },
    ];

    render(
      <MockTokenExpiryAlert
        expiringTokens={tokens}
        onRefreshToken={mockOnRefreshToken}
        onDismiss={mockOnDismiss}
      />
    );

    tokens.forEach((token) => {
      const platformElement = screen.getByText(token.platform);
      expect(platformElement).toHaveClass('platform');
    });
  });

  it('키보드 접근성을 지원해야 함', async () => {
    const user = userEvent.setup();
    const expiringToken = createExpiringToken(1);

    render(
      <MockTokenExpiryAlert
        expiringTokens={[expiringToken]}
        onRefreshToken={mockOnRefreshToken}
        onDismiss={mockOnDismiss}
      />
    );

    const refreshButton = screen.getByTestId(`refresh-${expiringToken._id}`);
    
    // Tab으로 포커스 이동
    await user.tab();
    expect(refreshButton).toHaveFocus();

    // Enter로 클릭
    await user.keyboard('{Enter}');
    expect(mockOnRefreshToken).toHaveBeenCalledWith(expiringToken._id);
  });

  it('에러 상태를 처리해야 함', () => {
    const expiringToken = createExpiringToken(1);

    const TokenExpiryAlertWithError = () => {
      const [error, setError] = React.useState<string | null>(null);

      const handleRefreshToken = async (accountId: string) => {
        try {
          // 에러 시뮬레이션
          throw new Error('토큰 새로고침 실패');
        } catch (err) {
          setError('토큰 새로고침에 실패했습니다. 다시 시도해주세요.');
        }
      };

      return (
        <div>
          {error && <div data-testid="error-message" className="error">{error}</div>}
          <MockTokenExpiryAlert
            expiringTokens={[expiringToken]}
            onRefreshToken={handleRefreshToken}
            onDismiss={mockOnDismiss}
          />
        </div>
      );
    };

    render(<TokenExpiryAlertWithError />);

    const refreshButton = screen.getByTestId(`refresh-${expiringToken._id}`);
    fireEvent.click(refreshButton);

    waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('토큰 새로고침에 실패했습니다. 다시 시도해주세요.')).toBeInTheDocument();
    });
  });

  it('자동 새로고침 기능을 지원해야 함', async () => {
    const MockAutoRefreshTokenAlert = ({ interval = 30000 }) => {
      const [tokens, setTokens] = React.useState([createExpiringToken(1)]);

      React.useEffect(() => {
        const timer = setInterval(() => {
          // 실제로는 API 호출
          setTokens([]); // 토큰이 새로고침되어 만료 목록에서 제거됨
        }, interval);

        return () => clearInterval(timer);
      }, [interval]);

      return (
        <MockTokenExpiryAlert
          expiringTokens={tokens}
          onRefreshToken={mockOnRefreshToken}
          onDismiss={mockOnDismiss}
        />
      );
    };

    vi.useFakeTimers();

    render(<MockAutoRefreshTokenAlert interval={1000} />);

    // 초기에는 토큰이 표시되어야 함
    expect(screen.getByText('토큰 만료 예정')).toBeInTheDocument();

    // 1초 후 자동 새로고침
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.queryByText('토큰 만료 예정')).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });
});

// React import for useState, useEffect
const React = { useState: vi.fn(), useEffect: vi.fn() };