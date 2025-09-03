'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function ClerkLoadingWrapper({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useAuth()
  const [showTimeout, setShowTimeout] = useState(false)

  useEffect(() => {
    // 10초 후에 타임아웃 메시지 표시
    const timer = setTimeout(() => {
      if (!isLoaded) {
        setShowTimeout(true)
      }
    }, 10000)

    return () => clearTimeout(timer)
  }, [isLoaded])

  if (!isLoaded) {
    if (showTimeout) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">인증 서비스 연결 중...</h2>
            <p className="text-muted-foreground">
              네트워크 상태를 확인하고 잠시 후 새로고침해주세요.
            </p>
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

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}