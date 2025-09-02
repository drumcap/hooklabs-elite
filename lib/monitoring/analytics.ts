/**
 * 통합 분석 시스템
 * Google Analytics, Mixpanel, Vercel Analytics 등을 통합 관리합니다.
 */

import { getEnvironmentConfig, getCurrentEnvironment } from '@/config/environments'

const config = getEnvironmentConfig()
const environment = getCurrentEnvironment()

interface EventProperties {
  [key: string]: string | number | boolean | undefined
}

interface UserProperties {
  id?: string
  email?: string
  plan?: string
  signupDate?: string
  [key: string]: any
}

class Analytics {
  private isEnabled: boolean
  private userId?: string
  private userProperties: UserProperties = {}

  constructor() {
    this.isEnabled = config.enableAnalytics && typeof window !== 'undefined'
    
    if (this.isEnabled) {
      this.initializeProviders()
    }
  }

  // 분석 도구 초기화
  private async initializeProviders() {
    await Promise.all([
      this.initGoogleAnalytics(),
      this.initMixpanel(),
      this.initVercelAnalytics(),
    ])

    console.log('✅ Analytics 초기화 완료')
  }

  // Google Analytics 초기화
  private async initGoogleAnalytics() {
    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    if (!gaId) return

    try {
      // Google Analytics 4 스크립트 로드
      const script1 = document.createElement('script')
      script1.async = true
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
      document.head.appendChild(script1)

      const script2 = document.createElement('script')
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}', {
          page_title: document.title,
          page_location: window.location.href,
          anonymize_ip: true,
          allow_google_signals: false,
          allow_ad_personalization_signals: false
        });
      `
      document.head.appendChild(script2)

      // 글로벌 객체에 gtag 함수 추가
      ;(window as any).gtag = function(...args: any[]) {
        ;(window as any).dataLayer = (window as any).dataLayer || []
        ;(window as any).dataLayer.push(arguments)
      }

      console.log('✅ Google Analytics 초기화 완료')
    } catch (error) {
      console.warn('Google Analytics 초기화 실패:', error)
    }
  }

  // Mixpanel 초기화
  private async initMixpanel() {
    const mixpanelToken = process.env.NEXT_PUBLIC_MIXPANEL_PROJECT_TOKEN
    if (!mixpanelToken) return

    try {
      const { default: mixpanel } = await import('mixpanel-browser')
      
      mixpanel.init(mixpanelToken, {
        debug: environment === 'development',
        track_pageview: true,
        persistence: 'localStorage',
        ignore_dnt: false,
        api_host: 'https://api.mixpanel.com',
      })

      ;(window as any).mixpanel = mixpanel
      console.log('✅ Mixpanel 초기화 완료')
    } catch (error) {
      console.warn('Mixpanel 초기화 실패:', error)
    }
  }

  // Vercel Analytics 초기화
  private async initVercelAnalytics() {
    try {
      const { Analytics } = await import('@vercel/analytics/react')
      console.log('✅ Vercel Analytics 준비 완료')
    } catch (error) {
      console.warn('Vercel Analytics 초기화 실패:', error)
    }
  }

  // 사용자 식별
  identify(userId: string, properties?: UserProperties) {
    if (!this.isEnabled) return

    this.userId = userId
    this.userProperties = { ...this.userProperties, id: userId, ...properties }

    // Google Analytics 사용자 ID 설정
    if ((window as any).gtag) {
      ;(window as any).gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
        user_id: userId,
        custom_map: { custom_dimension_1: 'user_plan' },
      })
    }

    // Mixpanel 사용자 식별
    if ((window as any).mixpanel) {
      ;(window as any).mixpanel.identify(userId)
      ;(window as any).mixpanel.people.set(properties)
    }

    console.log('🎯 사용자 식별:', { userId, properties })
  }

  // 이벤트 추적
  track(eventName: string, properties?: EventProperties) {
    if (!this.isEnabled) return

    const eventData = {
      ...properties,
      userId: this.userId,
      timestamp: new Date().toISOString(),
      environment,
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
    }

    // Google Analytics 이벤트
    if ((window as any).gtag) {
      ;(window as any).gtag('event', eventName, {
        event_category: properties?.category || 'engagement',
        event_label: properties?.label,
        value: properties?.value,
        user_id: this.userId,
        custom_parameters: eventData,
      })
    }

    // Mixpanel 이벤트
    if ((window as any).mixpanel) {
      ;(window as any).mixpanel.track(eventName, eventData)
    }

    // 개발 환경에서는 콘솔에 출력
    if (environment === 'development') {
      console.log('📊 이벤트 추적:', { eventName, properties: eventData })
    }
  }

  // 페이지뷰 추적
  trackPageView(pagePath?: string, pageTitle?: string) {
    if (!this.isEnabled) return

    const path = pagePath || window.location.pathname
    const title = pageTitle || document.title

    // Google Analytics 페이지뷰
    if ((window as any).gtag) {
      ;(window as any).gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
        page_path: path,
        page_title: title,
      })
    }

    // Mixpanel 페이지뷰
    if ((window as any).mixpanel) {
      ;(window as any).mixpanel.track('Page View', {
        page: path,
        title,
        url: window.location.href,
      })
    }

    console.log('📄 페이지뷰:', { path, title })
  }

  // 사용자 속성 설정
  setUserProperties(properties: UserProperties) {
    if (!this.isEnabled) return

    this.userProperties = { ...this.userProperties, ...properties }

    // Mixpanel 사용자 속성 설정
    if ((window as any).mixpanel) {
      ;(window as any).mixpanel.people.set(properties)
    }

    console.log('👤 사용자 속성 설정:', properties)
  }

  // 구매/결제 이벤트 (e-commerce)
  trackPurchase(transactionId: string, value: number, currency = 'USD', items?: any[]) {
    if (!this.isEnabled) return

    const purchaseData = {
      transaction_id: transactionId,
      value,
      currency,
      items,
    }

    // Google Analytics Enhanced E-commerce
    if ((window as any).gtag) {
      ;(window as any).gtag('event', 'purchase', purchaseData)
    }

    // Mixpanel 구매 이벤트
    if ((window as any).mixpanel) {
      ;(window as any).mixpanel.track('Purchase', {
        ...purchaseData,
        revenue: value,
      })
      
      // 수익 추적
      ;(window as any).mixpanel.people.track_charge(value, {
        transaction_id: transactionId,
        currency,
      })
    }

    console.log('💰 구매 이벤트:', purchaseData)
  }

  // 구독 이벤트
  trackSubscription(planName: string, planPrice: number, billingCycle: 'monthly' | 'yearly') {
    this.track('Subscription Started', {
      category: 'subscription',
      plan_name: planName,
      plan_price: planPrice,
      billing_cycle: billingCycle,
      value: planPrice,
    })

    // 사용자 속성 업데이트
    this.setUserProperties({
      plan: planName,
      subscription_status: 'active',
      last_subscription_date: new Date().toISOString(),
    })
  }

  // 에러 이벤트
  trackError(error: Error, context?: Record<string, any>) {
    if (!this.isEnabled) return

    this.track('Error Occurred', {
      category: 'error',
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack?.substring(0, 500), // 스택 트레이스는 축약
      ...context,
    })
  }

  // 성능 메트릭 추적
  trackPerformance(metricName: string, value: number, unit = 'ms') {
    if (!this.isEnabled) return

    this.track('Performance Metric', {
      category: 'performance',
      metric_name: metricName,
      metric_value: value,
      metric_unit: unit,
    })
  }

  // A/B 테스트 이벤트
  trackExperiment(experimentName: string, variant: string) {
    if (!this.isEnabled) return

    this.track('Experiment Viewed', {
      category: 'experiment',
      experiment_name: experimentName,
      variant,
    })

    // 사용자 속성으로도 저장
    this.setUserProperties({
      [`experiment_${experimentName}`]: variant,
    })
  }

  // 사용자 행동 흐름 추적
  trackFunnel(step: string, funnelName: string, properties?: EventProperties) {
    this.track(`${funnelName} - ${step}`, {
      category: 'funnel',
      funnel_name: funnelName,
      funnel_step: step,
      ...properties,
    })
  }

  // 기능 사용량 추적
  trackFeatureUsage(featureName: string, action: string, properties?: EventProperties) {
    this.track('Feature Used', {
      category: 'feature',
      feature_name: featureName,
      action,
      ...properties,
    })
  }
}

// 싱글톤 인스턴스
const analytics = new Analytics()

export { analytics }
export default analytics

// React Hook 형태로도 제공
export function useAnalytics() {
  return analytics
}