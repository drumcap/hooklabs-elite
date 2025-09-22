"use client"

import { useEffect, useCallback, useRef } from 'react'
import { onTTFB, onCLS, onLCP, onINP, onFCP } from 'web-vitals'

interface MetricData {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  entries?: PerformanceEntry[]
}

export default function WebVitalsMonitor() {
  const analyticsQueue = useRef<MetricData[]>([])
  const isOnline = useRef(typeof navigator !== 'undefined' ? navigator.onLine : true)

  // 배치 전송을 위한 디바운스된 함수
  const flushAnalytics = useCallback(() => {
    if (analyticsQueue.current.length === 0 || !isOnline.current) return

    const metrics = [...analyticsQueue.current]
    analyticsQueue.current = []

    // 다양한 분석 도구로 전송
    sendToMultipleAnalytics(metrics)
  }, [])

  // 온라인/오프라인 상태 감지
  useEffect(() => {
    const handleOnline = () => {
      isOnline.current = true
      flushAnalytics() // 온라인이 되면 대기 중인 메트릭 전송
    }
    
    const handleOffline = () => {
      isOnline.current = false
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [flushAnalytics])

  // 페이지 언로드 시 대기 중인 메트릭 전송
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushAnalytics()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [flushAnalytics])

  useEffect(() => {
    // Core Web Vitals 측정
    onCLS((metric) => {
      sendToAnalytics('CLS', metric)
    })
    
    // FID는 더 이상 사용되지 않고 INP로 대체됨
    
    onLCP((metric) => {
      sendToAnalytics('LCP', metric)
    })

    onINP((metric) => {
      sendToAnalytics('INP', metric)
    })

    onFCP((metric) => {
      sendToAnalytics('FCP', metric)
    })

    onTTFB((metric) => {
      sendToAnalytics('TTFB', metric)
    })

    // 커스텀 성능 메트릭
    measureCustomMetrics()

    // 주기적으로 대기 중인 메트릭 전송 (5초마다)
    const interval = setInterval(flushAnalytics, 5000)
    
    return () => clearInterval(interval)
  }, [flushAnalytics])

  const sendToAnalytics = useCallback((name: string, metric: any) => {
    const metricData: MetricData = {
      name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      entries: metric.entries
    }

    analyticsQueue.current.push(metricData)

    // 즉시 전송이 필요한 중요 메트릭
    if (['LCP', 'CLS', 'INP'].includes(name) && metric.rating === 'poor') {
      flushAnalytics()
    }
  }, [flushAnalytics])

  const sendToMultipleAnalytics = useCallback((metrics: MetricData[]) => {
    metrics.forEach(metric => {
      // Google Analytics 4
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'performance',
          event_label: metric.name,
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          metric_rating: metric.rating,
          metric_delta: metric.delta,
          custom_parameter_user_agent: navigator.userAgent.slice(0, 100),
          custom_parameter_connection_type: getConnectionType()
        })
      }

      // Mixpanel (프로젝트에 이미 있는 경우)
      if (typeof window !== 'undefined' && window.mixpanel) {
        window.mixpanel.track('Performance Metric', {
          metric_name: metric.name,
          metric_value: metric.value,
          metric_rating: metric.rating,
          metric_delta: metric.delta,
          page_url: window.location.pathname,
          connection_type: getConnectionType(),
          device_type: getDeviceType()
        })
      }

      // 콘솔 로깅 (개발 환경)
      if (process.env.NODE_ENV === 'development') {
        console.group(`🚀 Performance Metric: ${metric.name}`)
        console.log(`Value: ${metric.value}${metric.name === 'CLS' ? '' : 'ms'}`)
        console.log(`Rating: ${metric.rating}`)
        console.log(`Delta: ${metric.delta}`)
        console.log(`ID: ${metric.id}`)
        if (metric.entries) {
          console.log('Entries:', metric.entries)
        }
        console.groupEnd()
      }

      // 커스텀 이벤트 발생 (다른 컴포넌트에서 리스닝 가능)
      window.dispatchEvent(new CustomEvent('performance-metric', {
        detail: metric
      }))
    })
  }, [])

  const measureCustomMetrics = useCallback(() => {
    // React 하이드레이션 시간 측정
    if (typeof window !== 'undefined' && window.performance) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0]
        
        // DOM 컨텐츠 로드 시간
        const domContentLoaded = nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart
        sendToAnalytics('DOM_CONTENT_LOADED', {
          value: domContentLoaded,
          rating: domContentLoaded < 1600 ? 'good' : domContentLoaded < 2500 ? 'needs-improvement' : 'poor',
          delta: domContentLoaded,
          id: generateId(),
          name: 'DOM_CONTENT_LOADED'
        })

        // 전체 페이지 로드 시간
        const pageLoadTime = nav.loadEventEnd - nav.loadEventStart
        if (pageLoadTime > 0) {
          sendToAnalytics('PAGE_LOAD_TIME', {
            value: pageLoadTime,
            rating: pageLoadTime < 2000 ? 'good' : pageLoadTime < 4000 ? 'needs-improvement' : 'poor',
            delta: pageLoadTime,
            id: generateId(),
            name: 'PAGE_LOAD_TIME'
          })
        }
      }

      // 리소스 로딩 성능 측정
      const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      if (resourceEntries.length > 0) {
        const slowResources = resourceEntries.filter(entry => entry.duration > 1000)
        if (slowResources.length > 0) {
          console.warn('Slow loading resources:', slowResources)
        }
      }
    }
  }, [sendToAnalytics])

  return null
}

// 헬퍼 함수들
function getConnectionType(): string {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as any).connection
    return connection?.effectiveType || 'unknown'
  }
  return 'unknown'
}

function getDeviceType(): string {
  if (typeof window !== 'undefined') {
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }
  return 'unknown'
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

// 전역 타입 확장
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    mixpanel: {
      track: (event: string, properties: Record<string, any>) => void
    }
  }
}