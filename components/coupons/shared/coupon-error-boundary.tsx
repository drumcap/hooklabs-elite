"use client";

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showErrorDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class CouponErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // 다음 렌더링에서 폴백 UI를 보여주도록 상태를 업데이트합니다.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CouponErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // 에러 리포팅 서비스로 에러를 전송
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      // 커스텀 폴백 UI가 제공된 경우 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 에러 UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">문제가 발생했습니다</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  쿠폰 시스템에서 예기치 못한 오류가 발생했습니다. 
                  잠시 후 다시 시도해보세요.
                </AlertDescription>
              </Alert>

              {this.props.showErrorDetails && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    에러 세부 정보 보기
                  </summary>
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <pre className="text-xs overflow-auto">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={this.handleRetry}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  다시 시도
                </Button>
                
                <Button
                  variant="default"
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  대시보드로
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withCouponErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <CouponErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </CouponErrorBoundary>
  );
  
  WrappedComponent.displayName = `withCouponErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Functional component version for simpler error handling
interface CouponErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
  onGoHome?: () => void;
  title?: string;
  description?: string;
}

export function CouponErrorFallback({
  error,
  onRetry,
  onGoHome,
  title = "문제가 발생했습니다",
  description = "쿠폰 시스템에서 오류가 발생했습니다. 다시 시도해보세요."
}: CouponErrorFallbackProps) {
  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-[300px] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          
          <div className="flex gap-2 justify-center">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                다시 시도
              </Button>
            )}
            
            <Button
              variant="default"
              size="sm"
              onClick={handleGoHome}
              className="flex items-center gap-2"
            >
              <Home className="h-3 w-3" />
              대시보드로
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}