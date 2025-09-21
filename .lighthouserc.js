/**
 * Lighthouse CI 설정
 * 성능, 접근성, SEO, 베스트 프랙티스 검증
 */
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/dashboard/social/compose',
        'http://localhost:3000/dashboard/analytics',
      ],
      startServerCommand: 'bun start',
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        formFactor: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
      },
    },
    assert: {
      assertions: {
        // 성능 기준
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'categories:seo': ['warn', { minScore: 0.8 }],

        // Core Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],

        // 추가 성능 메트릭
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        'interactive': ['warn', { maxNumericValue: 4000 }],

        // 보안 및 베스트 프랙티스
        'uses-https': 'error',
        'is-on-https': 'error',
        'redirects-http': 'error',
        'uses-http2': 'warn',

        // 접근성
        'color-contrast': 'error',
        'heading-order': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',

        // SEO
        'document-title': 'error',
        'meta-description': 'error',
        'link-text': 'error',
        'crawlable-anchors': 'error',

        // 리소스 최적화
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',
        'modern-image-formats': 'warn',
        'uses-optimized-images': 'warn',
        'uses-webp-images': 'warn',
        'efficient-animated-content': 'warn',

        // 캐싱
        'uses-long-cache-ttl': 'warn',
        'uses-rel-preconnect': 'warn',
        'uses-rel-preload': 'warn',

        // JavaScript 최적화
        'unminified-css': 'warn',
        'unminified-javascript': 'warn',
        'render-blocking-resources': 'warn',
        'uses-responsive-images': 'warn',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
  // 성능 예산 설정
  budgets: [
    {
      path: '/*',
      timings: [
        {
          metric: 'first-contentful-paint',
          budget: 2000,
        },
        {
          metric: 'largest-contentful-paint',
          budget: 3000,
        },
        {
          metric: 'speed-index',
          budget: 3000,
        },
        {
          metric: 'interactive',
          budget: 4000,
        },
      ],
      resourceSizes: [
        {
          resourceType: 'script',
          budget: 400,
        },
        {
          resourceType: 'stylesheet',
          budget: 100,
        },
        {
          resourceType: 'image',
          budget: 200,
        },
        {
          resourceType: 'document',
          budget: 50,
        },
        {
          resourceType: 'font',
          budget: 100,
        },
        {
          resourceType: 'total',
          budget: 1000,
        },
      ],
      resourceCounts: [
        {
          resourceType: 'third-party',
          budget: 10,
        },
      ],
    },
  ],
};