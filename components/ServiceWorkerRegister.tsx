"use client"

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      registerServiceWorker()
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'imports', // 성능 최적화
      })

      console.log('[PWA] Service Worker registered successfully:', registration.scope)

      // 업데이트 확인
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // 새 버전이 사용 가능하다는 사용자 알림 표시
                console.log('[PWA] New version available! Please refresh.')
                
                // 선택적: 자동으로 새 버전을 활성화
                if ('skipWaiting' in newWorker) {
                  newWorker.postMessage({ action: 'SKIP_WAITING' })
                }
              } else {
                console.log('[PWA] Content is cached for offline use.')
              }
            }
          })
        }
      })

      // 서비스 워커가 제어권을 얻었을 때
      registration.addEventListener('controlling', () => {
        console.log('[PWA] Service Worker is now controlling the page')
        window.location.reload()
      })

      // 주기적으로 업데이트 확인 (1시간마다)
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error)
    }
  }

  // PWA 설치 프롬프트 처리
  useEffect(() => {
    let deferredPrompt: BeforeInstallPromptEvent | null = null

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      deferredPrompt = e
      console.log('[PWA] Install prompt available')
      
      // 사용자가 설치할 수 있음을 알리는 UI를 표시할 수 있습니다
      // 예: 버튼 활성화, 배너 표시 등
    }

    const handleAppInstalled = (e: Event) => {
      console.log('[PWA] App was installed')
      deferredPrompt = null
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  return null
}

// BeforeInstallPromptEvent 타입 정의
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}