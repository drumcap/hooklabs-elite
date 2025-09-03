import { test, expect, Page, BrowserContext } from '@playwright/test';
import { createMetricsCollector } from '../utils/performance-metrics';

/**
 * E2E 성능 테스트 스위트
 * Core Web Vitals, 사용자 시나리오 기반 성능 측정
 */

// 성능 기준값 설정
const PERFORMANCE_THRESHOLDS = {
  LCP: 2500, // Largest Contentful Paint
  FID: 100,  // First Input Delay  
  CLS: 0.1,  // Cumulative Layout Shift
  FCP: 1800, // First Contentful Paint
  TTI: 3900, // Time to Interactive
  TBT: 300,  // Total Blocking Time
};

// 테스트 설정
test.describe('E2E 성능 테스트', () => {
  let metricsCollector: any;

  test.beforeAll(async ({ browser }) => {
    // 성능 메트릭 수집기 초기화
    metricsCollector = createMetricsCollector();
  });

  test.beforeEach(async ({ page, context }) => {
    // CDP(Chrome DevTools Protocol) 세션 시작
    const client = await context.newCDPSession(page);
    
    // 성능 추적 시작
    await client.send('Performance.enable');
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    
    // 네트워크 이벤트 리스너 등록
    await setupNetworkListeners(client, metricsCollector);
  });

  test.describe('랜딩 페이지 성능', () => {
    test('랜딩 페이지 로드 성능 측정', async ({ page }) => {
      const startTime = Date.now();
      
      // Web Vitals 측정 스크립트 주입
      await page.addInitScript(getWebVitalsScript());
      
      // 랜딩 페이지 로드
      const response = await page.goto('/');
      expect(response?.status()).toBe(200);

      // FCP (First Contentful Paint) 측정
      const fcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) resolve(fcpEntry.startTime);
          }).observe({ entryTypes: ['paint'] });
        });
      });

      console.log(`FCP: ${fcp}ms`);
      expect(fcp).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP);

      // LCP (Largest Contentful Paint) 측정
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // 5초 후 타임아웃
          setTimeout(() => resolve(5000), 5000);
        });
      });

      console.log(`LCP: ${lcp}ms`);
      expect(lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP);

      // CLS (Cumulative Layout Shift) 측정
      await page.waitForLoadState('networkidle');
      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
          }).observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => resolve(clsValue), 3000);
        });
      });

      console.log(`CLS: ${cls}`);
      expect(cls).toBeLessThan(PERFORMANCE_THRESHOLDS.CLS);

      // 전체 로드 시간
      const loadTime = Date.now() - startTime;
      console.log(`Total Load Time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
    });

    test('랜딩 페이지 리소스 로딩 성능', async ({ page }) => {
      const resourceMetrics: { [key: string]: number } = {};
      
      // 리소스 로딩 모니터링
      page.on('response', async (response) => {
        const url = response.url();
        const resourceType = response.request().resourceType();
        const responseTime = response.timing().responseEnd;
        
        resourceMetrics[`${resourceType}_${url.split('/').pop()}`] = responseTime;
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // CSS 파일 로딩 시간 검증
      const cssResponses = Object.entries(resourceMetrics)
        .filter(([key]) => key.includes('stylesheet'))
        .map(([, time]) => time);
      
      if (cssResponses.length > 0) {
        const avgCssTime = cssResponses.reduce((a, b) => a + b, 0) / cssResponses.length;
        console.log(`Average CSS Load Time: ${avgCssTime}ms`);
        expect(avgCssTime).toBeLessThan(1000);
      }

      // JavaScript 파일 로딩 시간 검증
      const jsResponses = Object.entries(resourceMetrics)
        .filter(([key]) => key.includes('script'))
        .map(([, time]) => time);
      
      if (jsResponses.length > 0) {
        const avgJsTime = jsResponses.reduce((a, b) => a + b, 0) / jsResponses.length;
        console.log(`Average JS Load Time: ${avgJsTime}ms`);
        expect(avgJsTime).toBeLessThan(1500);
      }
    });
  });

  test.describe('대시보드 성능', () => {
    test('대시보드 로드 및 인터랙션 성능', async ({ page }) => {
      await page.goto('/dashboard');
      
      // 리디렉션 또는 로그인 페이지로 이동 확인
      await page.waitForLoadState('networkidle');
      
      // TTI (Time to Interactive) 측정
      const tti = await page.evaluate(() => {
        return new Promise((resolve) => {
          const checkTTI = () => {
            // 메인 스레드가 50ms 이상 블록되지 않은 구간 찾기
            const entries = performance.getEntriesByType('measure');
            let lastLongTask = 0;
            
            for (const entry of entries) {
              if (entry.duration > 50) {
                lastLongTask = entry.startTime + entry.duration;
              }
            }
            
            // 마지막 긴 작업 이후 5초가 지나면 TTI로 간주
            const now = performance.now();
            if (now - lastLongTask > 5000) {
              resolve(lastLongTask);
            } else {
              setTimeout(checkTTI, 100);
            }
          };
          
          checkTTI();
          
          // 최대 10초 대기
          setTimeout(() => resolve(10000), 10000);
        });
      });

      console.log(`TTI: ${tti}ms`);
      expect(tti).toBeLessThan(PERFORMANCE_THRESHOLDS.TTI);

      // 인터랙션 성능 테스트 (버튼 클릭 등)
      const interactionElements = await page.$$('[role="button"], button, a[href]');
      
      if (interactionElements.length > 0) {
        const startTime = performance.now();
        await interactionElements[0].click();
        
        // 클릭 후 화면 변화 대기
        await page.waitForTimeout(100);
        
        const interactionTime = performance.now() - startTime;
        console.log(`Interaction Time: ${interactionTime}ms`);
        expect(interactionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FID);
      }
    });
  });

  test.describe('결제 플로우 성능', () => {
    test('결제 플로우 전체 성능 측정', async ({ page }) => {
      const flowMetrics = {
        pricingPageLoad: 0,
        checkoutClick: 0,
        checkoutPageLoad: 0,
        totalFlow: 0,
      };

      const flowStart = performance.now();

      // 1. 프라이싱 페이지 로드
      const pricingStart = performance.now();
      await page.goto('/');
      await page.waitForSelector('[data-testid="pricing-section"], .pricing', { timeout: 10000 });
      flowMetrics.pricingPageLoad = performance.now() - pricingStart;

      // 2. 결제 버튼 클릭 성능
      const checkoutButton = page.locator('button:has-text("Start"), button:has-text("구독")').first();
      
      if (await checkoutButton.count() > 0) {
        const clickStart = performance.now();
        await checkoutButton.click();
        flowMetrics.checkoutClick = performance.now() - clickStart;

        // 3. 결제 페이지 로드 대기 (리디렉션 포함)
        const checkoutLoadStart = performance.now();
        
        // Lemon Squeezy 결제 페이지나 로그인 페이지로의 이동 대기
        await Promise.race([
          page.waitForURL(/lemonsqueezy\.com/, { timeout: 10000 }),
          page.waitForURL(/sign-in/, { timeout: 5000 }),
          page.waitForSelector('.checkout, [data-testid="checkout"]', { timeout: 5000 }),
        ]).catch(() => {
          // 타임아웃 시에도 계속 진행
          console.log('Checkout redirect timeout - continuing...');
        });
        
        flowMetrics.checkoutPageLoad = performance.now() - checkoutLoadStart;
      }

      flowMetrics.totalFlow = performance.now() - flowStart;

      // 성능 기준 검증
      console.log('결제 플로우 성능:', flowMetrics);
      expect(flowMetrics.pricingPageLoad).toBeLessThan(3000);
      expect(flowMetrics.checkoutClick).toBeLessThan(500);
      expect(flowMetrics.totalFlow).toBeLessThan(10000);
    });
  });

  test.describe('모바일 성능', () => {
    test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12 크기

    test('모바일 디바이스 성능 측정', async ({ page }) => {
      // CPU 슬로우다운 시뮬레이션
      const client = await page.context().newCDPSession(page);
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      
      const mobileMetrics: { [key: string]: number } = {};

      // 터치 인터랙션 준비
      await page.goto('/');
      
      // 모바일 FCP 측정
      const mobileFcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) resolve(fcpEntry.startTime);
          }).observe({ entryTypes: ['paint'] });
          setTimeout(() => resolve(3000), 3000);
        });
      });

      mobileMetrics.fcp = mobileFcp as number;
      console.log(`Mobile FCP: ${mobileFcp}ms`);
      expect(mobileFcp).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP * 1.5); // 모바일은 1.5배 관대

      // 터치 이벤트 응답성 테스트
      const touchTarget = page.locator('button, a').first();
      if (await touchTarget.count() > 0) {
        const touchStart = performance.now();
        await touchTarget.tap();
        const touchResponse = performance.now() - touchStart;
        
        mobileMetrics.touchResponse = touchResponse;
        console.log(`Touch Response: ${touchResponse}ms`);
        expect(touchResponse).toBeLessThan(300);
      }

      // 스크롤 성능 테스트
      const scrollStart = performance.now();
      await page.evaluate(() => {
        window.scrollBy(0, 1000);
      });
      await page.waitForTimeout(100);
      const scrollTime = performance.now() - scrollStart;
      
      mobileMetrics.scroll = scrollTime;
      console.log(`Scroll Performance: ${scrollTime}ms`);
      expect(scrollTime).toBeLessThan(200);

      // CPU 스로틀링 해제
      await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    });
  });

  test.describe('네트워크 조건별 성능', () => {
    test('Fast 3G 네트워크에서의 성능', async ({ page, context }) => {
      // Fast 3G 네트워크 시뮬레이션
      await context.route('**/*', async (route) => {
        // 1.6Mbps, 150ms 지연 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 150));
        await route.continue();
      });

      const networkMetrics = await measurePageLoad(page, '/');
      
      console.log('Fast 3G 성능:', networkMetrics);
      expect(networkMetrics.fcp).toBeLessThan(4000); // 느린 네트워크에서는 4초
      expect(networkMetrics.lcp).toBeLessThan(6000);
    });

    test('Slow 3G 네트워크에서의 성능', async ({ page, context }) => {
      // Slow 3G 네트워크 시뮬레이션 (400kbps, 300ms 지연)
      await context.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        await route.continue();
      });

      const networkMetrics = await measurePageLoad(page, '/');
      
      console.log('Slow 3G 성능:', networkMetrics);
      expect(networkMetrics.fcp).toBeLessThan(8000); // 매우 느린 네트워크에서는 8초
      expect(networkMetrics.lcp).toBeLessThan(10000);
    });
  });
});

// 헬퍼 함수들
async function setupNetworkListeners(client: any, metricsCollector: any) {
  await client.send('Network.enable');
  
  client.on('Network.responseReceived', (params: any) => {
    metricsCollector.addNetworkEvent({
      url: params.response.url,
      status: params.response.status,
      mimeType: params.response.mimeType,
      encodedDataLength: params.response.encodedDataLength,
      timestamp: params.timestamp,
    });
  });
}

function getWebVitalsScript(): string {
  return `
    // Web Vitals 측정 라이브러리
    window.webVitalsData = {};
    
    // CLS 측정
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          window.webVitalsData.cls = clsValue;
        }
      }
    }).observe({entryTypes: ['layout-shift']});
    
    // LCP 측정
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      window.webVitalsData.lcp = lastEntry.startTime;
    }).observe({entryTypes: ['largest-contentful-paint']});
    
    // FID 측정
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.webVitalsData.fid = entry.processingStart - entry.startTime;
      }
    }).observe({entryTypes: ['first-input']});
  `;
}

async function measurePageLoad(page: Page, url: string) {
  const startTime = performance.now();
  
  await page.addInitScript(getWebVitalsScript());
  await page.goto(url);
  
  // FCP 측정
  const fcp = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) resolve(fcpEntry.startTime);
      }).observe({ entryTypes: ['paint'] });
      setTimeout(() => resolve(5000), 5000);
    });
  });

  // LCP 측정
  const lcp = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry.startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });
      setTimeout(() => resolve(8000), 8000);
    });
  });

  await page.waitForLoadState('networkidle');
  
  const totalTime = performance.now() - startTime;

  return {
    fcp: fcp as number,
    lcp: lcp as number,
    totalTime,
  };
}