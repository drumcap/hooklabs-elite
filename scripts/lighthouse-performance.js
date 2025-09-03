#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * Lighthouse 성능 테스트 및 회귀 분석 스크립트
 */
class LighthousePerformanceTester {
  constructor() {
    this.reportsDir = path.join(process.cwd(), 'reports', 'lighthouse');
    this.baselineFile = path.join(this.reportsDir, 'baseline.json');
    this.currentResultsFile = path.join(this.reportsDir, 'current.json');
    this.trendFile = path.join(this.reportsDir, 'trends.json');
    
    // 성능 목표값 설정
    this.performanceTargets = {
      'first-contentful-paint': 1800,
      'largest-contentful-paint': 2500,
      'cumulative-layout-shift': 0.1,
      'total-blocking-time': 300,
      'speed-index': 3400,
      'interactive': 3900,
      'performance': 90, // Lighthouse 점수
    };
  }

  /**
   * 디렉토리 생성
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
      console.log('📁 리포트 디렉토리 생성 완료');
    } catch (error) {
      console.error('❌ 디렉토리 생성 실패:', error.message);
    }
  }

  /**
   * Lighthouse CI 실행
   */
  async runLighthouseCI(profile = 'default') {
    console.log(`🚦 Lighthouse CI 실행 중 (프로파일: ${profile})...`);
    
    try {
      const command = profile === 'default' 
        ? 'npx lhci autorun' 
        : `npx lhci autorun --config=lighthouserc.${profile}.js`;
        
      const result = execSync(command, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        env: { ...process.env, CI: 'true' }
      });
      
      console.log('✅ Lighthouse CI 실행 완료');
      return result;
    } catch (error) {
      console.error('❌ Lighthouse CI 실행 실패:', error.message);
      throw error;
    }
  }

  /**
   * 여러 프로파일로 테스트 실행
   */
  async runMultipleProfiles() {
    const profiles = ['default', 'mobile', 'slow3g'];
    const results = {};

    for (const profile of profiles) {
      console.log(`\n🔄 ${profile.toUpperCase()} 프로파일 테스트 중...`);
      
      try {
        await this.runLighthouseCI(profile);
        results[profile] = await this.parseLatestResults(profile);
      } catch (error) {
        console.error(`❌ ${profile} 프로파일 실패:`, error.message);
        results[profile] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * 최신 Lighthouse 결과 파싱
   */
  async parseLatestResults(profile = 'default') {
    const resultsPattern = path.join(this.reportsDir, '**', 'lhr-*.json');
    
    try {
      const { glob } = await import('glob');
      const files = await glob(resultsPattern);
      
      if (files.length === 0) {
        throw new Error('Lighthouse 결과 파일을 찾을 수 없습니다');
      }

      // 가장 최근 파일 찾기
      const latestFile = files.sort((a, b) => {
        const statA = fs.stat(a);
        const statB = fs.stat(b);
        return statB.mtime - statA.mtime;
      })[0];

      const rawData = await fs.readFile(latestFile, 'utf8');
      const lighthouseResult = JSON.parse(rawData);

      return this.extractKeyMetrics(lighthouseResult, profile);
    } catch (error) {
      console.error('결과 파싱 실패:', error.message);
      return null;
    }
  }

  /**
   * 주요 메트릭 추출
   */
  extractKeyMetrics(lhr, profile) {
    const metrics = {
      profile,
      timestamp: Date.now(),
      url: lhr.finalUrl,
      scores: {
        performance: Math.round(lhr.categories.performance.score * 100),
        accessibility: Math.round(lhr.categories.accessibility.score * 100),
        bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
        seo: Math.round(lhr.categories.seo.score * 100),
      },
      vitals: {
        'first-contentful-paint': lhr.audits['first-contentful-paint']?.numericValue || 0,
        'largest-contentful-paint': lhr.audits['largest-contentful-paint']?.numericValue || 0,
        'cumulative-layout-shift': lhr.audits['cumulative-layout-shift']?.numericValue || 0,
        'total-blocking-time': lhr.audits['total-blocking-time']?.numericValue || 0,
        'speed-index': lhr.audits['speed-index']?.numericValue || 0,
        'interactive': lhr.audits['interactive']?.numericValue || 0,
      },
      opportunities: this.extractOpportunities(lhr.audits),
      diagnostics: this.extractDiagnostics(lhr.audits),
    };

    return metrics;
  }

  /**
   * 개선 기회 추출
   */
  extractOpportunities(audits) {
    const opportunityAudits = [
      'unused-javascript',
      'unused-css-rules',
      'render-blocking-resources',
      'unminified-css',
      'unminified-javascript',
      'uses-text-compression',
      'modern-image-formats',
    ];

    return opportunityAudits.reduce((opportunities, auditId) => {
      const audit = audits[auditId];
      if (audit && audit.details && audit.details.overallSavingsMs > 100) {
        opportunities[auditId] = {
          savings: audit.details.overallSavingsMs,
          items: audit.details.items?.length || 0,
          score: audit.score,
        };
      }
      return opportunities;
    }, {});
  }

  /**
   * 진단 정보 추출
   */
  extractDiagnostics(audits) {
    return {
      'dom-size': audits['dom-size']?.numericValue || 0,
      'network-requests': audits['network-requests']?.details?.items?.length || 0,
      'total-byte-weight': audits['total-byte-weight']?.numericValue || 0,
      'third-party-summary': audits['third-party-summary']?.details?.summary?.wastedMs || 0,
    };
  }

  /**
   * 기준선 저장
   */
  async saveBaseline(results) {
    try {
      await fs.writeFile(this.baselineFile, JSON.stringify(results, null, 2));
      console.log('📊 성능 기준선 저장 완료');
    } catch (error) {
      console.error('❌ 기준선 저장 실패:', error.message);
    }
  }

  /**
   * 기준선과 비교
   */
  async compareWithBaseline(currentResults) {
    try {
      const baselineData = await fs.readFile(this.baselineFile, 'utf8');
      const baseline = JSON.parse(baselineData);

      const comparison = {};
      
      Object.keys(currentResults).forEach(profile => {
        if (baseline[profile] && currentResults[profile]) {
          comparison[profile] = this.compareMetrics(
            baseline[profile], 
            currentResults[profile]
          );
        }
      });

      return comparison;
    } catch (error) {
      console.log('📊 기준선 파일이 없습니다. 새로 생성합니다.');
      await this.saveBaseline(currentResults);
      return null;
    }
  }

  /**
   * 메트릭 비교
   */
  compareMetrics(baseline, current) {
    const comparison = {
      scores: {},
      vitals: {},
      regression: false,
      improvements: [],
      regressions: [],
    };

    // 점수 비교
    Object.keys(baseline.scores).forEach(scoreType => {
      const diff = current.scores[scoreType] - baseline.scores[scoreType];
      comparison.scores[scoreType] = {
        baseline: baseline.scores[scoreType],
        current: current.scores[scoreType],
        diff,
        improved: diff > 0,
      };

      if (diff < -5) { // 5점 이상 하락
        comparison.regressions.push(`${scoreType} 점수 ${diff}점 하락`);
        comparison.regression = true;
      } else if (diff > 5) { // 5점 이상 상승
        comparison.improvements.push(`${scoreType} 점수 ${diff}점 상승`);
      }
    });

    // 바이탈 메트릭 비교
    Object.keys(baseline.vitals).forEach(vital => {
      const baselineValue = baseline.vitals[vital];
      const currentValue = current.vitals[vital];
      const diff = currentValue - baselineValue;
      const percentChange = baselineValue > 0 ? (diff / baselineValue) * 100 : 0;

      comparison.vitals[vital] = {
        baseline: baselineValue,
        current: currentValue,
        diff,
        percentChange,
        improved: diff < 0, // 메트릭은 낮을수록 좋음
      };

      // 성능 회귀 감지 (10% 이상 악화)
      if (percentChange > 10) {
        comparison.regressions.push(
          `${vital}: ${Math.round(percentChange)}% 악화 (${Math.round(diff)}ms)`
        );
        comparison.regression = true;
      } else if (percentChange < -10) { // 10% 이상 개선
        comparison.improvements.push(
          `${vital}: ${Math.round(Math.abs(percentChange))}% 개선 (${Math.round(Math.abs(diff))}ms)`
        );
      }
    });

    return comparison;
  }

  /**
   * 트렌드 분석 및 저장
   */
  async saveTrends(results) {
    try {
      let trends = [];
      
      // 기존 트렌드 데이터 로드
      try {
        const trendData = await fs.readFile(this.trendFile, 'utf8');
        trends = JSON.parse(trendData);
      } catch (error) {
        // 트렌드 파일이 없으면 새로 생성
        console.log('📈 새 트렌드 파일 생성');
      }

      // 현재 결과 추가
      trends.push({
        timestamp: Date.now(),
        date: new Date().toISOString(),
        ...results,
      });

      // 최근 100개만 유지
      if (trends.length > 100) {
        trends = trends.slice(-100);
      }

      await fs.writeFile(this.trendFile, JSON.stringify(trends, null, 2));
      console.log('📈 트렌드 데이터 저장 완료');
    } catch (error) {
      console.error('❌ 트렌드 저장 실패:', error.message);
    }
  }

  /**
   * 성능 리포트 생성
   */
  async generateReport(results, comparison) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(results, comparison),
      results,
      comparison,
      recommendations: this.generateRecommendations(results),
    };

    const reportFile = path.join(
      this.reportsDir, 
      `performance-report-${Date.now()}.json`
    );

    try {
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
      console.log(`📄 성능 리포트 생성: ${reportFile}`);

      // HTML 리포트도 생성
      await this.generateHTMLReport(report);
      
      return report;
    } catch (error) {
      console.error('❌ 리포트 생성 실패:', error.message);
      return null;
    }
  }

  /**
   * HTML 리포트 생성
   */
  async generateHTMLReport(report) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HookLabs Elite - 성능 테스트 리포트</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
        .header { background: #1f2937; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
        .score { font-size: 2em; font-weight: bold; margin: 8px 0; }
        .good { color: #059669; }
        .needs-improvement { color: #d97706; }
        .poor { color: #dc2626; }
        .regression { background-color: #fee2e2; border-color: #fca5a5; }
        .improvement { background-color: #d1fae5; border-color: #86efac; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background-color: #f3f4f6; font-weight: 600; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 HookLabs Elite 성능 테스트 리포트</h1>
        <p>생성 시간: ${report.timestamp}</p>
        <p>요약: ${report.summary}</p>
    </div>

    <div class="metric-grid">
        ${Object.entries(report.results).map(([profile, data]) => `
            <div class="metric-card ${data.error ? 'regression' : ''}">
                <h3>${profile.toUpperCase()} 프로파일</h3>
                ${data.error ? `<p style="color: red;">오류: ${data.error}</p>` : `
                    <div class="scores">
                        ${Object.entries(data.scores).map(([metric, score]) => `
                            <div>
                                <span>${metric}:</span>
                                <span class="score ${this.getScoreClass(score)}">${score}</span>
                            </div>
                        `).join('')}
                    </div>
                    <table>
                        <tr><th>Core Web Vitals</th><th>값</th><th>목표</th></tr>
                        ${Object.entries(data.vitals).map(([vital, value]) => {
                          const target = this.performanceTargets[vital];
                          const isGood = target ? value <= target : true;
                          return `<tr class="${isGood ? 'good' : 'poor'}">
                            <td>${vital}</td>
                            <td>${Math.round(value)}ms</td>
                            <td>${target || 'N/A'}</td>
                          </tr>`;
                        }).join('')}
                    </table>
                `}
            </div>
        `).join('')}
    </div>

    ${report.comparison ? `
        <div class="comparison">
            <h2>📊 기준선 비교</h2>
            ${Object.entries(report.comparison).map(([profile, comp]) => `
                <div class="metric-card ${comp.regression ? 'regression' : ''}">
                    <h3>${profile} 비교</h3>
                    <div>
                        <h4>개선사항:</h4>
                        <ul>${comp.improvements.map(imp => `<li class="improvement">${imp}</li>`).join('')}</ul>
                        <h4>회귀사항:</h4>
                        <ul>${comp.regressions.map(reg => `<li class="regression">${reg}</li>`).join('')}</ul>
                    </div>
                </div>
            `).join('')}
        </div>
    ` : ''}

    <div class="recommendations">
        <h2>💡 성능 최적화 권장사항</h2>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
</body>
</html>`;

    const htmlFile = path.join(this.reportsDir, `performance-report-${Date.now()}.html`);
    await fs.writeFile(htmlFile, htmlContent);
    console.log(`📄 HTML 리포트 생성: ${htmlFile}`);
  }

  getScoreClass(score) {
    if (score >= 90) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  }

  /**
   * 요약 생성
   */
  generateSummary(results, comparison) {
    const profiles = Object.keys(results);
    const avgPerformance = profiles.reduce((sum, profile) => {
      return sum + (results[profile].scores?.performance || 0);
    }, 0) / profiles.length;

    let summary = `평균 성능 점수: ${Math.round(avgPerformance)}점`;

    if (comparison) {
      const hasRegression = Object.values(comparison).some(c => c.regression);
      summary += hasRegression ? ' ⚠️ 성능 회귀 감지' : ' ✅ 성능 안정';
    }

    return summary;
  }

  /**
   * 최적화 권장사항 생성
   */
  generateRecommendations(results) {
    const recommendations = [];

    Object.values(results).forEach(result => {
      if (!result.scores) return;

      // 성능 점수가 낮은 경우
      if (result.scores.performance < 85) {
        recommendations.push('성능 최적화가 필요합니다. Core Web Vitals를 개선하세요.');
      }

      // Core Web Vitals 문제
      if (result.vitals) {
        if (result.vitals['largest-contentful-paint'] > 2500) {
          recommendations.push('LCP 개선: 이미지 최적화, CDN 사용, 서버 응답시간 개선을 검토하세요.');
        }
        if (result.vitals['cumulative-layout-shift'] > 0.1) {
          recommendations.push('CLS 개선: 이미지와 광고에 명시적 크기를 지정하고, 폰트 로딩을 최적화하세요.');
        }
        if (result.vitals['total-blocking-time'] > 300) {
          recommendations.push('TBT 개선: JavaScript 번들을 분할하고, 불필요한 폴리필을 제거하세요.');
        }
      }

      // 기회 분석
      if (result.opportunities) {
        Object.entries(result.opportunities).forEach(([audit, data]) => {
          if (data.savings > 1000) { // 1초 이상 절약 가능
            recommendations.push(`${audit} 최적화로 ${Math.round(data.savings)}ms 개선 가능`);
          }
        });
      }
    });

    return [...new Set(recommendations)]; // 중복 제거
  }

  /**
   * 메인 실행 함수
   */
  async run(options = {}) {
    console.log('🚀 Lighthouse 성능 분석 시작\n');

    try {
      await this.ensureDirectories();

      // 테스트 실행
      const results = options.profile 
        ? { [options.profile]: await this.parseLatestResults(options.profile) }
        : await this.runMultipleProfiles();

      // 기준선과 비교
      const comparison = await this.compareWithBaseline(results);

      // 트렌드 저장
      await this.saveTrends(results);

      // 리포트 생성
      const report = await this.generateReport(results, comparison);

      // 결과 출력
      this.printSummary(results, comparison);

      // CI 환경에서 회귀 감지 시 실패 처리
      if (process.env.CI && comparison) {
        const hasRegression = Object.values(comparison).some(c => c.regression);
        if (hasRegression) {
          console.error('\n❌ 성능 회귀가 감지되어 빌드를 실패처리합니다.');
          process.exit(1);
        }
      }

      console.log('\n✅ Lighthouse 성능 분석 완료');
      return report;

    } catch (error) {
      console.error('\n❌ Lighthouse 성능 분석 실패:', error.message);
      if (process.env.CI) process.exit(1);
      throw error;
    }
  }

  /**
   * 요약 출력
   */
  printSummary(results, comparison) {
    console.log('\n📊 성능 테스트 결과 요약:');
    console.log('================================');

    Object.entries(results).forEach(([profile, data]) => {
      if (data.error) {
        console.log(`❌ ${profile}: ${data.error}`);
        return;
      }

      console.log(`\n🔍 ${profile.toUpperCase()} 프로파일:`);
      console.log(`   성능: ${data.scores?.performance || 0}점`);
      console.log(`   FCP: ${Math.round(data.vitals?.['first-contentful-paint'] || 0)}ms`);
      console.log(`   LCP: ${Math.round(data.vitals?.['largest-contentful-paint'] || 0)}ms`);
      console.log(`   TBT: ${Math.round(data.vitals?.['total-blocking-time'] || 0)}ms`);
      console.log(`   CLS: ${data.vitals?.['cumulative-layout-shift']?.toFixed(3) || 0}`);
    });

    if (comparison) {
      console.log('\n📈 기준선 대비 변화:');
      Object.entries(comparison).forEach(([profile, comp]) => {
        if (comp.improvements.length > 0) {
          console.log(`✅ ${profile} 개선사항:`);
          comp.improvements.forEach(imp => console.log(`   - ${imp}`));
        }
        if (comp.regressions.length > 0) {
          console.log(`⚠️  ${profile} 회귀사항:`);
          comp.regressions.forEach(reg => console.log(`   - ${reg}`));
        }
      });
    }
  }
}

// CLI 실행 부분
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // 명령행 인수 파싱
  args.forEach((arg, index) => {
    if (arg === '--profile' && args[index + 1]) {
      options.profile = args[index + 1];
    }
    if (arg === '--save-baseline') {
      options.saveBaseline = true;
    }
  });

  const tester = new LighthousePerformanceTester();
  tester.run(options).catch(error => {
    console.error('실행 실패:', error);
    process.exit(1);
  });
}

module.exports = LighthousePerformanceTester;