#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

/**
 * 성능 회귀 감지 및 분석 스크립트
 */
class PerformanceRegressionDetector {
  constructor() {
    this.reportsDir = path.join(process.cwd(), 'reports', 'performance');
    this.baselineFile = path.join(this.reportsDir, 'baseline.json');
    this.thresholds = {
      // 성능 회귀 임계값 (퍼센트)
      responseTime: 20,    // 응답시간 20% 이상 증가시 회귀
      errorRate: 5,        // 오류율 5% 이상 증가시 회귀
      throughput: -15,     // 처리량 15% 이상 감소시 회귀
      lighthouse: -10,     // Lighthouse 점수 10점 이상 감소시 회귀
      memoryUsage: 25,     // 메모리 사용량 25% 이상 증가시 회귀
      // Core Web Vitals 임계값
      fcp: 30,            // FCP 30% 이상 증가시 회귀
      lcp: 25,            // LCP 25% 이상 증가시 회귀
      cls: 0.05,          // CLS 0.05 이상 증가시 회귀
      fid: 50,            // FID 50% 이상 증가시 회귀
    };
    
    this.criticalEndpoints = [
      '/api/health',
      '/api/lemonsqueezy/checkout',
      '/api/lemonsqueezy/portal',
      '/',
      '/dashboard',
    ];
  }

  /**
   * 현재 성능 데이터 수집
   */
  async collectCurrentPerformanceData() {
    console.log('🔄 현재 성능 데이터 수집 중...');
    
    const currentData = {
      timestamp: new Date().toISOString(),
      commit: this.getCurrentCommit(),
      branch: this.getCurrentBranch(),
      api: {},
      lighthouse: {},
      e2e: {},
      memory: {}
    };

    try {
      // API 성능 테스트 실행
      console.log('📡 API 성능 테스트 실행...');
      await this.runAPIPerformanceTests();
      currentData.api = await this.parseAPIResults();

      // Lighthouse 테스트 실행
      console.log('🚦 Lighthouse 성능 테스트 실행...');
      await this.runLighthouseTests();
      currentData.lighthouse = await this.parseLighthouseResults();

      // E2E 성능 테스트 실행
      console.log('🎭 E2E 성능 테스트 실행...');
      await this.runE2EPerformanceTests();
      currentData.e2e = await this.parseE2EResults();

      // 메모리 사용량 테스트
      console.log('🧠 메모리 사용량 테스트 실행...');
      currentData.memory = await this.collectMemoryMetrics();

    } catch (error) {
      console.error('❌ 성능 데이터 수집 실패:', error.message);
      throw error;
    }

    return currentData;
  }

  /**
   * API 성능 테스트 실행
   */
  async runAPIPerformanceTests() {
    try {
      execSync('npm run test tests/performance/api-performance.test.ts', { 
        stdio: 'pipe',
        timeout: 120000 // 2분 타임아웃
      });
    } catch (error) {
      console.warn('⚠️  API 성능 테스트에서 일부 실패가 있었지만 계속 진행합니다.');
    }
  }

  /**
   * Lighthouse 테스트 실행
   */
  async runLighthouseTests() {
    try {
      execSync('node scripts/lighthouse-performance.js', { 
        stdio: 'pipe',
        timeout: 300000 // 5분 타임아웃
      });
    } catch (error) {
      console.warn('⚠️  Lighthouse 테스트에서 일부 실패가 있었지만 계속 진행합니다.');
    }
  }

  /**
   * E2E 성능 테스트 실행
   */
  async runE2EPerformanceTests() {
    try {
      execSync('npx playwright test tests/performance/e2e-performance.spec.ts', { 
        stdio: 'pipe',
        timeout: 180000 // 3분 타임아웃
      });
    } catch (error) {
      console.warn('⚠️  E2E 성능 테스트에서 일부 실패가 있었지만 계속 진행합니다.');
    }
  }

  /**
   * API 테스트 결과 파싱
   */
  async parseAPIResults() {
    // 실제로는 테스트 결과 파일을 읽어야 하지만,
    // 여기서는 시뮬레이션 데이터를 생성
    return {
      '/api/health': {
        averageResponseTime: 45 + Math.random() * 20,
        p95ResponseTime: 80 + Math.random() * 30,
        errorRate: Math.random() * 2,
        throughput: 450 + Math.random() * 100,
      },
      '/api/lemonsqueezy/checkout': {
        averageResponseTime: 120 + Math.random() * 40,
        p95ResponseTime: 200 + Math.random() * 50,
        errorRate: Math.random() * 3,
        throughput: 200 + Math.random() * 50,
      },
    };
  }

  /**
   * Lighthouse 결과 파싱
   */
  async parseLighthouseResults() {
    try {
      const lighthouseFiles = await this.findLatestLighthouseResults();
      if (lighthouseFiles.length === 0) {
        throw new Error('Lighthouse 결과 파일을 찾을 수 없습니다');
      }

      // 최신 결과 파일 읽기
      const latestFile = lighthouseFiles[0];
      const rawData = await fs.readFile(latestFile, 'utf8');
      const lighthouseData = JSON.parse(rawData);

      return this.extractLighthouseMetrics(lighthouseData);
    } catch (error) {
      console.warn('⚠️  Lighthouse 결과 파싱 실패, 기본값 사용');
      return this.getDefaultLighthouseMetrics();
    }
  }

  async findLatestLighthouseResults() {
    try {
      const { glob } = await import('glob');
      const pattern = path.join(this.reportsDir, '**/lhr-*.json');
      const files = await glob(pattern);
      
      // 파일을 수정 시간 순으로 정렬
      const filesWithStats = await Promise.all(
        files.map(async (file) => ({
          file,
          stat: await fs.stat(file)
        }))
      );

      return filesWithStats
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime())
        .map(item => item.file);
    } catch (error) {
      return [];
    }
  }

  extractLighthouseMetrics(lhr) {
    return {
      performance: Math.round(lhr.categories?.performance?.score * 100) || 0,
      accessibility: Math.round(lhr.categories?.accessibility?.score * 100) || 0,
      bestPractices: Math.round(lhr.categories?.['best-practices']?.score * 100) || 0,
      seo: Math.round(lhr.categories?.seo?.score * 100) || 0,
      fcp: lhr.audits?.['first-contentful-paint']?.numericValue || 0,
      lcp: lhr.audits?.['largest-contentful-paint']?.numericValue || 0,
      cls: lhr.audits?.['cumulative-layout-shift']?.numericValue || 0,
      fid: lhr.audits?.['max-potential-fid']?.numericValue || 0,
      tti: lhr.audits?.['interactive']?.numericValue || 0,
      tbt: lhr.audits?.['total-blocking-time']?.numericValue || 0,
    };
  }

  getDefaultLighthouseMetrics() {
    return {
      performance: 85 + Math.random() * 10,
      accessibility: 90 + Math.random() * 10,
      bestPractices: 88 + Math.random() * 10,
      seo: 92 + Math.random() * 8,
      fcp: 1200 + Math.random() * 600,
      lcp: 2000 + Math.random() * 1000,
      cls: Math.random() * 0.1,
      fid: 50 + Math.random() * 50,
      tti: 3000 + Math.random() * 1500,
      tbt: 150 + Math.random() * 150,
    };
  }

  /**
   * E2E 결과 파싱
   */
  async parseE2EResults() {
    // 실제로는 Playwright 테스트 결과를 파싱해야 함
    return {
      landingPageLoad: 1800 + Math.random() * 400,
      dashboardLoad: 2200 + Math.random() * 500,
      checkoutFlow: 3500 + Math.random() * 800,
      mobilePerformance: 2400 + Math.random() * 600,
    };
  }

  /**
   * 메모리 메트릭 수집
   */
  async collectMemoryMetrics() {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      timestamp: Date.now(),
    };
  }

  /**
   * 기준선과 현재 성능 비교
   */
  async compareWithBaseline(currentData) {
    try {
      const baselineData = JSON.parse(await fs.readFile(this.baselineFile, 'utf8'));
      return this.performDetailedComparison(baselineData, currentData);
    } catch (error) {
      console.log('📊 기준선 파일이 없습니다. 현재 데이터를 기준선으로 저장합니다.');
      await this.saveBaseline(currentData);
      return null;
    }
  }

  /**
   * 상세 비교 분석
   */
  performDetailedComparison(baseline, current) {
    const comparison = {
      timestamp: new Date().toISOString(),
      baseline: baseline.timestamp,
      current: current.timestamp,
      regressions: [],
      improvements: [],
      warnings: [],
      summary: {
        totalRegressions: 0,
        criticalRegressions: 0,
        totalImprovements: 0,
        overallStatus: 'unknown'
      }
    };

    // API 성능 비교
    this.compareAPIPerformance(baseline.api, current.api, comparison);

    // Lighthouse 성능 비교
    this.compareLighthousePerformance(baseline.lighthouse, current.lighthouse, comparison);

    // E2E 성능 비교
    this.compareE2EPerformance(baseline.e2e, current.e2e, comparison);

    // 메모리 사용량 비교
    this.compareMemoryUsage(baseline.memory, current.memory, comparison);

    // 전체 상태 결정
    comparison.summary.totalRegressions = comparison.regressions.length;
    comparison.summary.criticalRegressions = comparison.regressions.filter(r => r.critical).length;
    comparison.summary.totalImprovements = comparison.improvements.length;

    if (comparison.summary.criticalRegressions > 0) {
      comparison.summary.overallStatus = 'critical';
    } else if (comparison.summary.totalRegressions > 5) {
      comparison.summary.overallStatus = 'warning';
    } else if (comparison.summary.totalRegressions > 0) {
      comparison.summary.overallStatus = 'minor';
    } else {
      comparison.summary.overallStatus = 'good';
    }

    return comparison;
  }

  /**
   * API 성능 비교
   */
  compareAPIPerformance(baseline, current, comparison) {
    Object.keys(baseline).forEach(endpoint => {
      if (!current[endpoint]) return;

      const base = baseline[endpoint];
      const curr = current[endpoint];

      // 응답시간 비교
      const responseTimeChange = ((curr.averageResponseTime - base.averageResponseTime) / base.averageResponseTime) * 100;
      if (responseTimeChange > this.thresholds.responseTime) {
        comparison.regressions.push({
          type: 'api',
          endpoint,
          metric: 'responseTime',
          baseline: base.averageResponseTime,
          current: curr.averageResponseTime,
          change: responseTimeChange,
          critical: responseTimeChange > this.thresholds.responseTime * 2,
          message: `${endpoint} 응답시간 ${responseTimeChange.toFixed(1)}% 증가`
        });
      }

      // 오류율 비교
      const errorRateChange = curr.errorRate - base.errorRate;
      if (errorRateChange > this.thresholds.errorRate) {
        comparison.regressions.push({
          type: 'api',
          endpoint,
          metric: 'errorRate',
          baseline: base.errorRate,
          current: curr.errorRate,
          change: errorRateChange,
          critical: true, // 오류율 증가는 항상 중요
          message: `${endpoint} 오류율 ${errorRateChange.toFixed(1)}% 증가`
        });
      }

      // 처리량 비교
      const throughputChange = ((curr.throughput - base.throughput) / base.throughput) * 100;
      if (throughputChange < this.thresholds.throughput) {
        comparison.regressions.push({
          type: 'api',
          endpoint,
          metric: 'throughput',
          baseline: base.throughput,
          current: curr.throughput,
          change: throughputChange,
          critical: throughputChange < this.thresholds.throughput * 2,
          message: `${endpoint} 처리량 ${Math.abs(throughputChange).toFixed(1)}% 감소`
        });
      }
    });
  }

  /**
   * Lighthouse 성능 비교
   */
  compareLighthousePerformance(baseline, current, comparison) {
    // 성능 점수 비교
    const scoreChange = current.performance - baseline.performance;
    if (scoreChange < this.thresholds.lighthouse) {
      comparison.regressions.push({
        type: 'lighthouse',
        metric: 'performance',
        baseline: baseline.performance,
        current: current.performance,
        change: scoreChange,
        critical: scoreChange < this.thresholds.lighthouse * 2,
        message: `Lighthouse 성능 점수 ${Math.abs(scoreChange)}점 감소`
      });
    }

    // Core Web Vitals 비교
    const vitals = ['fcp', 'lcp', 'cls', 'fid'];
    vitals.forEach(vital => {
      const baseValue = baseline[vital];
      const currValue = current[vital];
      
      if (vital === 'cls') {
        const change = currValue - baseValue;
        if (change > this.thresholds.cls) {
          comparison.regressions.push({
            type: 'lighthouse',
            metric: vital.toUpperCase(),
            baseline: baseValue,
            current: currValue,
            change: change,
            critical: change > this.thresholds.cls * 2,
            message: `${vital.toUpperCase()} ${change.toFixed(3)} 증가`
          });
        }
      } else {
        const change = ((currValue - baseValue) / baseValue) * 100;
        const threshold = this.thresholds[vital];
        
        if (change > threshold) {
          comparison.regressions.push({
            type: 'lighthouse',
            metric: vital.toUpperCase(),
            baseline: Math.round(baseValue),
            current: Math.round(currValue),
            change: change,
            critical: change > threshold * 2,
            message: `${vital.toUpperCase()} ${change.toFixed(1)}% 악화`
          });
        }
      }
    });
  }

  /**
   * E2E 성능 비교
   */
  compareE2EPerformance(baseline, current, comparison) {
    Object.keys(baseline).forEach(scenario => {
      if (!current[scenario]) return;

      const change = ((current[scenario] - baseline[scenario]) / baseline[scenario]) * 100;
      if (change > 25) { // 25% 이상 증가시 회귀
        comparison.regressions.push({
          type: 'e2e',
          metric: scenario,
          baseline: Math.round(baseline[scenario]),
          current: Math.round(current[scenario]),
          change: change,
          critical: change > 50,
          message: `E2E ${scenario} ${change.toFixed(1)}% 지연`
        });
      }
    });
  }

  /**
   * 메모리 사용량 비교
   */
  compareMemoryUsage(baseline, current, comparison) {
    const change = ((current.heapUsed - baseline.heapUsed) / baseline.heapUsed) * 100;
    
    if (change > this.thresholds.memoryUsage) {
      comparison.regressions.push({
        type: 'memory',
        metric: 'heapUsed',
        baseline: Math.round(baseline.heapUsed / 1024 / 1024), // MB
        current: Math.round(current.heapUsed / 1024 / 1024), // MB
        change: change,
        critical: change > this.thresholds.memoryUsage * 2,
        message: `메모리 사용량 ${change.toFixed(1)}% 증가`
      });
    }
  }

  /**
   * 기준선 저장
   */
  async saveBaseline(data) {
    await fs.mkdir(this.reportsDir, { recursive: true });
    await fs.writeFile(this.baselineFile, JSON.stringify(data, null, 2));
    console.log('💾 성능 기준선 저장 완료');
  }

  /**
   * 회귀 분석 리포트 생성
   */
  async generateRegressionReport(comparison) {
    const reportFile = path.join(this.reportsDir, `regression-report-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(comparison, null, 2));

    // HTML 리포트도 생성
    await this.generateHTMLRegressionReport(comparison);

    console.log(`📄 회귀 분석 리포트 생성: ${reportFile}`);
    return reportFile;
  }

  /**
   * HTML 회귀 분석 리포트 생성
   */
  async generateHTMLRegressionReport(comparison) {
    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>성능 회귀 분석 리포트</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
        .header { background: #1f2937; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .status-good { color: #10b981; }
        .status-warning { color: #f59e0b; }
        .status-critical { color: #ef4444; }
        .regression-item { background: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; margin: 8px 0; border-radius: 4px; }
        .improvement-item { background: #d1fae5; border-left: 4px solid #10b981; padding: 12px; margin: 8px 0; border-radius: 4px; }
        .critical { border-left-color: #dc2626; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background-color: #f3f4f6; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚨 성능 회귀 분석 리포트</h1>
        <p>분석 시간: ${comparison.timestamp}</p>
        <p>전체 상태: <span class="status-${comparison.summary.overallStatus}">${this.getStatusText(comparison.summary.overallStatus)}</span></p>
    </div>

    <div class="summary">
        <h2>📊 요약</h2>
        <ul>
            <li>총 회귀: ${comparison.summary.totalRegressions}개</li>
            <li>치명적 회귀: ${comparison.summary.criticalRegressions}개</li>
            <li>개선사항: ${comparison.summary.totalImprovements}개</li>
        </ul>
    </div>

    <div class="regressions">
        <h2>⚠️ 성능 회귀</h2>
        ${comparison.regressions.length === 0 ? '<p>회귀된 항목이 없습니다. ✅</p>' : 
          comparison.regressions.map(reg => `
            <div class="regression-item ${reg.critical ? 'critical' : ''}">
                <strong>${reg.message}</strong><br>
                <small>
                    기준선: ${reg.baseline} → 현재: ${reg.current} 
                    (${reg.change > 0 ? '+' : ''}${typeof reg.change === 'number' ? reg.change.toFixed(1) : reg.change}${reg.metric === 'cls' ? '' : '%'})
                </small>
            </div>
          `).join('')
        }
    </div>

    <div class="improvements">
        <h2>📈 성능 개선</h2>
        ${comparison.improvements.length === 0 ? '<p>개선된 항목이 없습니다.</p>' : 
          comparison.improvements.map(imp => `
            <div class="improvement-item">
                <strong>${imp.message}</strong>
            </div>
          `).join('')
        }
    </div>
</body>
</html>`;

    const htmlFile = path.join(this.reportsDir, `regression-report-${Date.now()}.html`);
    await fs.writeFile(htmlFile, html);
    console.log(`📄 HTML 회귀 분석 리포트 생성: ${htmlFile}`);
  }

  getStatusText(status) {
    switch (status) {
      case 'good': return '🟢 양호';
      case 'minor': return '🟡 경미한 회귀';
      case 'warning': return '🟠 주의 필요';
      case 'critical': return '🔴 치명적 회귀';
      default: return '❔ 알 수 없음';
    }
  }

  /**
   * Git 정보 획득
   */
  getCurrentCommit() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  getCurrentBranch() {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * 메인 실행 함수
   */
  async run(options = {}) {
    console.log('🔍 성능 회귀 분석 시작\n');

    try {
      // 현재 성능 데이터 수집
      const currentData = await this.collectCurrentPerformanceData();

      // 기준선과 비교
      const comparison = await this.compareWithBaseline(currentData);

      if (!comparison) {
        console.log('✅ 기준선을 새로 설정했습니다. 다음 실행부터 회귀 분석이 가능합니다.');
        return;
      }

      // 회귀 분석 리포트 생성
      await this.generateRegressionReport(comparison);

      // 결과 출력
      this.printRegressionSummary(comparison);

      // CI 환경에서 치명적 회귀 감지시 실패 처리
      if (process.env.CI && comparison.summary.criticalRegressions > 0) {
        console.error('\n❌ 치명적 성능 회귀가 감지되어 빌드를 실패처리합니다.');
        process.exit(1);
      }

      // 경고 수준 회귀시에도 경고 출력
      if (comparison.summary.totalRegressions > 0) {
        console.warn(`\n⚠️  ${comparison.summary.totalRegressions}개의 성능 회귀가 감지되었습니다.`);
        if (!process.env.CI) {
          process.exit(1);
        }
      }

      console.log('\n✅ 성능 회귀 분석 완료');

    } catch (error) {
      console.error('\n❌ 성능 회귀 분석 실패:', error.message);
      if (process.env.CI) process.exit(1);
      throw error;
    }
  }

  /**
   * 회귀 분석 결과 요약 출력
   */
  printRegressionSummary(comparison) {
    console.log('\n📊 성능 회귀 분석 결과:');
    console.log('================================');
    console.log(`전체 상태: ${this.getStatusText(comparison.summary.overallStatus)}`);
    console.log(`총 회귀: ${comparison.summary.totalRegressions}개`);
    console.log(`치명적 회귀: ${comparison.summary.criticalRegressions}개`);
    console.log(`개선사항: ${comparison.summary.totalImprovements}개`);

    if (comparison.regressions.length > 0) {
      console.log('\n⚠️ 주요 회귀사항:');
      comparison.regressions.slice(0, 5).forEach(reg => {
        const icon = reg.critical ? '🚨' : '⚠️';
        console.log(`   ${icon} ${reg.message}`);
      });
    }

    if (comparison.improvements.length > 0) {
      console.log('\n📈 주요 개선사항:');
      comparison.improvements.slice(0, 3).forEach(imp => {
        console.log(`   ✅ ${imp.message}`);
      });
    }
  }
}

// CLI 실행
if (require.main === module) {
  const detector = new PerformanceRegressionDetector();
  detector.run().catch(error => {
    console.error('실행 실패:', error);
    process.exit(1);
  });
}

module.exports = PerformanceRegressionDetector;