'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ClerkErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Clerk 관련 에러인 경우에만 캐치
    if (error.message?.includes('Clerk')) {
      return { hasError: true, error }
    }
    throw error // 다른 에러는 그대로 throw
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('Clerk Error caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">인증 서비스 로딩 중...</h2>
            <p className="text-muted-foreground">잠시 후 새로고침해주세요.</p>
            <button 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              onClick={() => window.location.reload()}
            >
              새로고침
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}