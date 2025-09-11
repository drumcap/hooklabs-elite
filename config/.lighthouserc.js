module.exports = {
  ci: {
    // 수집 설정
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/dashboard/payment-gated',
      ],
      startServerCommand: 'npm run build && npm start',
      startServerReadyPattern: 'ready',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3, // 안정적인 결과를 위해 3회 실행
      settings: {
        // 모바일 및 데스크톱 테스트
        preset: 'desktop',
        chromeFlags: '--no-sandbox --headless --disable-gpu',
        // 네트워크 조건 시뮬레이션
        throttling: {
          rttMs: 40,
          throughputKbps: 10240, // 10 Mbps
          cpuSlowdownMultiplier: 1,
        },
        // 추가 감사 활성화
        onlyAudits: [
          'first-contentful-paint',
          'largest-contentful-paint',
          'cumulative-layout-shift',
          'total-blocking-time',
          'speed-index',
          'interactive',
          'performance-budget',
          'resource-summary',
          'third-party-summary',
          'network-requests',
          'unused-javascript',
          'unused-css-rules',
          'modern-image-formats',
          'uses-webp-images',
          'efficient-animated-content',
          'render-blocking-resources',
          'unminified-css',
          'unminified-javascript',
          'uses-text-compression',
          'uses-rel-preconnect',
          'uses-rel-preload',
          'font-display',
          'dom-size',
        ],
      },
    },
    
    // 업로드 설정 (GitHub Pages나 별도 서버에)
    upload: {
      target: 'filesystem',
      outputDir: './reports/lighthouse',
    },
    
    // 성능 임계값 설정 (엄격한 기준)
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': ['warn', { minScore: 0.8 }],
        
        // Core Web Vitals 임계값
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'speed-index': ['error', { maxNumericValue: 3400 }],
        'interactive': ['error', { maxNumericValue: 3900 }],
        
        // 리소스 최적화
        'unused-javascript': ['warn', { maxLength: 3 }],
        'unused-css-rules': ['warn', { maxLength: 3 }],
        'render-blocking-resources': ['warn', { maxLength: 2 }],
        'dom-size': ['warn', { maxNumericValue: 1500 }],
        
        // 네트워크 효율성
        'network-requests': ['warn', { maxLength: 50 }],
        'total-byte-weight': ['warn', { maxNumericValue: 1048576 }], // 1MB
      },
    },
    
    // 서버 설정
    server: {
      port: 9001,
      storage: {
        storageMethod: 'sql',
        sqlDialect: 'sqlite',
        sqlDatabasePath: './reports/lighthouse/lhci.db',
      },
    },
  },
  
  // 다양한 설정 프로파일
  profiles: {
    // 모바일 테스트
    mobile: {
      collect: {
        settings: {
          preset: 'mobile',
          formFactor: 'mobile',
          throttling: {
            rttMs: 150,
            throughputKbps: 1638.4, // 3G 속도
            cpuSlowdownMultiplier: 4,
          },
        },
      },
      assert: {
        assertions: {
          'categories:performance': ['error', { minScore: 0.85 }], // 모바일은 조금 더 관대
          'first-contentful-paint': ['error', { maxNumericValue: 2200 }],
          'largest-contentful-paint': ['error', { maxNumericValue: 3500 }],
        },
      },
    },
    
    // 느린 네트워크 테스트
    slow3g: {
      collect: {
        settings: {
          throttling: {
            rttMs: 300,
            throughputKbps: 400, // 느린 3G
            cpuSlowdownMultiplier: 4,
          },
        },
      },
      assert: {
        assertions: {
          'categories:performance': ['warn', { minScore: 0.7 }],
          'first-contentful-paint': ['error', { maxNumericValue: 4000 }],
          'largest-contentful-paint': ['error', { maxNumericValue: 6000 }],
        },
      },
    },
  },
};