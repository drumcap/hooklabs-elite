#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * 종합 성능 리포트 생성 스크립트
 */
class ComprehensivePerformanceReporter {
  constructor() {
    this.reportsDir = path.join(process.cwd(), 'reports', 'performance');
    this.allReportsDir = path.join(process.cwd(), 'all-reports');
    this.outputFile = path.join(this.reportsDir, 'comprehensive-report.html');
    
    // GitHub 컨텍스트 (환경변수에서 파싱)
    this.githubContext = this.parseGitHubContext();
  }

  parseGitHubContext() {
    try {
      const contextStr = process.env.GITHUB_CONTEXT || '{}';
      return JSON.parse(contextStr);
    } catch {
      return {
        sha: process.env.GITHUB_SHA || 'unknown',
        ref: process.env.GITHUB_REF || 'unknown',
        run_id: process.env.GITHUB_RUN_ID || 'unknown',
        repository: process.env.GITHUB_REPOSITORY || 'unknown'
      };
    }
  }

  /**
   * 모든 성능 리포트 수집
   */
  async collectAllReports() {
    console.log('📊 성능 리포트 수집 중...');
    
    const reports = {
      api: await this.collectAPIReports(),
      lighthouse: await this.collectLighthouseReports(),
      e2e: await this.collectE2EReports(),
      regression: await this.collectRegressionReports(),
      metadata: {
        timestamp: new Date().toISOString(),
        commit: this.githubContext.sha?.substring(0, 7) || 'unknown',
        branch: this.githubContext.ref?.replace('refs/heads/', '') || 'unknown',
        runId: this.githubContext.run_id || 'unknown',
        repository: this.githubContext.repository || 'unknown'
      }
    };

    return reports;
  }

  /**
   * API 성능 리포트 수집
   */
  async collectAPIReports() {
    const apiReports = {};
    
    try {
      const files = await this.findFiles('**/*api*metrics*.json');
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const data = JSON.parse(content);
          
          const reportName = path.basename(file, '.json');
          apiReports[reportName] = data;
        } catch (error) {
          console.warn(`⚠️ API 리포트 파싱 실패: ${file}`, error.message);
        }
      }
      
      console.log(`✅ ${Object.keys(apiReports).length}개의 API 리포트 수집`);
    } catch (error) {
      console.warn('⚠️ API 리포트 수집 실패:', error.message);
    }

    return apiReports;
  }

  /**
   * Lighthouse 리포트 수집
   */
  async collectLighthouseReports() {
    const lighthouseReports = {};
    
    try {
      const files = await this.findFiles('**/lhr-*.json');
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const data = JSON.parse(content);
          
          const profile = file.includes('mobile') ? 'mobile' : 'desktop';
          lighthouseReports[profile] = this.parseLighthouseData(data);
        } catch (error) {
          console.warn(`⚠️ Lighthouse 리포트 파싱 실패: ${file}`, error.message);
        }
      }

      // 성능 리포트 JSON 파일도 확인
      const performanceFiles = await this.findFiles('**/performance-report-*.json');
      for (const file of performanceFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const data = JSON.parse(content);
          
          if (data.results) {
            Object.assign(lighthouseReports, data.results);
          }
        } catch (error) {
          console.warn(`⚠️ 성능 리포트 파싱 실패: ${file}`, error.message);
        }
      }
      
      console.log(`✅ ${Object.keys(lighthouseReports).length}개의 Lighthouse 리포트 수집`);
    } catch (error) {
      console.warn('⚠️ Lighthouse 리포트 수집 실패:', error.message);
    }

    return lighthouseReports;
  }

  /**
   * E2E 성능 리포트 수집
   */
  async collectE2EReports() {
    const e2eReports = {};
    
    try {
      const files = await this.findFiles('**/e2e-*-metrics.json');
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const data = JSON.parse(content);
          
          const browser = data.browser || path.basename(file).split('-')[1];
          e2eReports[browser] = data;
        } catch (error) {
          console.warn(`⚠️ E2E 리포트 파싱 실패: ${file}`, error.message);
        }
      }
      
      console.log(`✅ ${Object.keys(e2eReports).length}개의 E2E 리포트 수집`);
    } catch (error) {
      console.warn('⚠️ E2E 리포트 수집 실패:', error.message);
    }

    return e2eReports;
  }

  /**
   * 회귀 분석 리포트 수집
   */
  async collectRegressionReports() {
    const regressionReports = {};
    
    try {
      const files = await this.findFiles('**/regression-report-*.json');
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const data = JSON.parse(content);
          
          regressionReports.latest = data;
          break; // 최신 것 하나만
        } catch (error) {
          console.warn(`⚠️ 회귀 분석 리포트 파싱 실패: ${file}`, error.message);
        }
      }
      
      console.log(`✅ 회귀 분석 리포트 수집 완료`);
    } catch (error) {
      console.warn('⚠️ 회귀 분석 리포트 수집 실패:', error.message);
    }

    return regressionReports;
  }

  /**
   * 파일 검색 헬퍼
   */
  async findFiles(pattern) {
    try {
      const { glob } = await import('glob');
      return await glob(pattern, { cwd: this.allReportsDir });
    } catch (error) {
      console.warn(`파일 검색 실패 (${pattern}):`, error.message);
      return [];
    }
  }

  /**
   * Lighthouse 데이터 파싱
   */
  parseLighthouseData(lhr) {
    return {
      finalUrl: lhr.finalUrl,
      fetchTime: lhr.fetchTime,
      scores: {
        performance: Math.round((lhr.categories?.performance?.score || 0) * 100),
        accessibility: Math.round((lhr.categories?.accessibility?.score || 0) * 100),
        bestPractices: Math.round((lhr.categories?.['best-practices']?.score || 0) * 100),
        seo: Math.round((lhr.categories?.seo?.score || 0) * 100),
      },
      vitals: {
        fcp: lhr.audits?.['first-contentful-paint']?.numericValue || 0,
        lcp: lhr.audits?.['largest-contentful-paint']?.numericValue || 0,
        cls: lhr.audits?.['cumulative-layout-shift']?.numericValue || 0,
        fid: lhr.audits?.['max-potential-fid']?.numericValue || 0,
        tti: lhr.audits?.['interactive']?.numericValue || 0,
        tbt: lhr.audits?.['total-blocking-time']?.numericValue || 0,
      },
      opportunities: this.extractOpportunities(lhr.audits),
    };
  }

  /**
   * 성능 개선 기회 추출
   */
  extractOpportunities(audits) {
    const opportunities = [];
    const opportunityAudits = [
      'unused-javascript',
      'unused-css-rules',
      'render-blocking-resources',
      'unminified-css',
      'unminified-javascript',
      'uses-text-compression',
      'modern-image-formats',
      'uses-webp-images',
      'efficient-animated-content',
      'dom-size',
    ];

    opportunityAudits.forEach(auditId => {
      const audit = audits[auditId];
      if (audit && audit.details && audit.details.overallSavingsMs > 100) {
        opportunities.push({
          id: auditId,
          title: audit.title,
          savings: audit.details.overallSavingsMs,
          description: audit.description,
        });
      }
    });

    return opportunities.sort((a, b) => b.savings - a.savings).slice(0, 5);
  }

  /**
   * 전체 성능 점수 계산
   */
  calculateOverallScore(reports) {
    let totalScore = 0;
    let count = 0;

    // Lighthouse 점수
    Object.values(reports.lighthouse).forEach(report => {
      if (report.scores?.performance) {
        totalScore += report.scores.performance;
        count++;
      }
    });

    // API 성능 점수 (응답시간 기반)
    Object.values(reports.api).forEach(report => {
      if (report.summary?.averageResponseTime) {
        const apiScore = Math.max(0, 100 - (report.summary.averageResponseTime / 10));
        totalScore += apiScore;
        count++;
      }
    });

    return count > 0 ? Math.round(totalScore / count) : 0;
  }

  /**
   * 성능 트렌드 분석
   */
  analyzeTrends(reports) {
    const trends = {
      performance: 'stable',
      issues: [],
      improvements: [],
    };

    // 회귀 분석 결과에서 트렌드 추출
    if (reports.regression.latest) {
      const regression = reports.regression.latest;
      
      if (regression.summary?.totalRegressions > 0) {
        trends.performance = 'degrading';
        trends.issues = regression.regressions?.slice(0, 3) || [];
      } else if (regression.summary?.totalImprovements > 5) {
        trends.performance = 'improving';
        trends.improvements = regression.improvements?.slice(0, 3) || [];
      }
    }

    return trends;
  }

  /**
   * HTML 리포트 생성
   */
  async generateHTMLReport(reports) {
    const overallScore = this.calculateOverallScore(reports);
    const trends = this.analyzeTrends(reports);
    
    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HookLabs Elite - 종합 성능 리포트</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    <style>
        .score-ring { transition: all 0.3s ease; }
        .score-excellent { color: #10b981; }
        .score-good { color: #f59e0b; }
        .score-poor { color: #ef4444; }
        .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
    </style>
</head>
<body class="bg-gray-50 font-sans">
    <!-- Header -->
    <div class="gradient-bg text-white py-8">
        <div class="container mx-auto px-4">
            <h1 class="text-4xl font-bold mb-2">🚀 HookLabs Elite 성능 리포트</h1>
            <div class="flex flex-wrap gap-4 text-sm opacity-90">
                <span>📅 ${new Date(reports.metadata.timestamp).toLocaleString('ko-KR')}</span>
                <span>🔗 커밋: ${reports.metadata.commit}</span>
                <span>🌿 브랜치: ${reports.metadata.branch}</span>
                <span>🆔 Run ID: ${reports.metadata.runId}</span>
            </div>
        </div>
    </div>

    <!-- Overall Score -->
    <div class="container mx-auto px-4 py-8">
        <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div class="text-center">
                <h2 class="text-2xl font-bold mb-4">전체 성능 점수</h2>
                <div class="flex justify-center items-center space-x-8">
                    <div class="text-center">
                        <div class="text-6xl font-bold ${this.getScoreColorClass(overallScore)}">${overallScore}</div>
                        <div class="text-gray-500">점 / 100점</div>
                    </div>
                    <div class="text-left">
                        <div class="mb-2">
                            <span class="inline-block w-3 h-3 rounded-full mr-2 ${trends.performance === 'improving' ? 'bg-green-500' : trends.performance === 'degrading' ? 'bg-red-500' : 'bg-yellow-500'}"></span>
                            <span class="font-medium">${this.getTrendText(trends.performance)}</span>
                        </div>
                        <div class="text-sm text-gray-600">
                            ${trends.issues.length > 0 ? `⚠️ ${trends.issues.length}개 이슈 발견` : ''}
                            ${trends.improvements.length > 0 ? `✅ ${trends.improvements.length}개 개선사항` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Lighthouse Results -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            ${Object.entries(reports.lighthouse).map(([profile, data]) => `
                <div class="bg-white rounded-lg shadow-lg p-6 card-hover">
                    <h3 class="text-xl font-bold mb-4 capitalize">🚦 ${profile} Lighthouse</h3>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div class="text-center">
                            <div class="text-3xl font-bold ${this.getScoreColorClass(data.scores?.performance || 0)}">${data.scores?.performance || 0}</div>
                            <div class="text-sm text-gray-500">성능</div>
                        </div>
                        <div class="text-center">
                            <div class="text-3xl font-bold ${this.getScoreColorClass(data.scores?.accessibility || 0)}">${data.scores?.accessibility || 0}</div>
                            <div class="text-sm text-gray-500">접근성</div>
                        </div>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span>FCP:</span>
                            <span class="font-mono">${Math.round(data.vitals?.fcp || 0)}ms</span>
                        </div>
                        <div class="flex justify-between">
                            <span>LCP:</span>
                            <span class="font-mono">${Math.round(data.vitals?.lcp || 0)}ms</span>
                        </div>
                        <div class="flex justify-between">
                            <span>CLS:</span>
                            <span class="font-mono">${(data.vitals?.cls || 0).toFixed(3)}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        <!-- API Performance -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h3 class="text-xl font-bold mb-4">📡 API 성능</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b">
                            <th class="text-left py-2">엔드포인트</th>
                            <th class="text-right py-2">평균 응답시간</th>
                            <th class="text-right py-2">P95</th>
                            <th class="text-right py-2">오류율</th>
                            <th class="text-right py-2">처리량</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(reports.api).map(([name, data]) => `
                            <tr class="border-b">
                                <td class="py-2 font-mono text-xs">${name}</td>
                                <td class="text-right py-2">${data.averageResponseTime ? Math.round(data.averageResponseTime) + 'ms' : 'N/A'}</td>
                                <td class="text-right py-2">${data.p95ResponseTime ? Math.round(data.p95ResponseTime) + 'ms' : 'N/A'}</td>
                                <td class="text-right py-2 ${(data.errorRate || 0) > 5 ? 'text-red-600' : 'text-green-600'}">${data.errorRate ? data.errorRate.toFixed(1) + '%' : '0%'}</td>
                                <td class="text-right py-2">${data.throughput ? Math.round(data.throughput) + ' RPS' : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- E2E Performance -->
        ${Object.keys(reports.e2e).length > 0 ? `
        <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h3 class="text-xl font-bold mb-4">🎭 E2E 성능</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${Object.entries(reports.e2e).map(([browser, data]) => `
                    <div class="border rounded-lg p-4">
                        <h4 class="font-medium mb-2 capitalize">${browser}</h4>
                        <div class="space-y-1 text-sm">
                            ${Object.entries(data.results || {}).map(([scenario, time]) => `
                                <div class="flex justify-between">
                                    <span>${scenario}:</span>
                                    <span class="font-mono">${Math.round(time)}ms</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Performance Regression -->
        ${reports.regression.latest ? `
        <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h3 class="text-xl font-bold mb-4">📊 성능 회귀 분석</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div class="text-center p-4 bg-red-50 rounded-lg">
                    <div class="text-2xl font-bold text-red-600">${reports.regression.latest.summary?.totalRegressions || 0}</div>
                    <div class="text-sm text-red-700">회귀</div>
                </div>
                <div class="text-center p-4 bg-orange-50 rounded-lg">
                    <div class="text-2xl font-bold text-orange-600">${reports.regression.latest.summary?.criticalRegressions || 0}</div>
                    <div class="text-sm text-orange-700">치명적 회귀</div>
                </div>
                <div class="text-center p-4 bg-green-50 rounded-lg">
                    <div class="text-2xl font-bold text-green-600">${reports.regression.latest.summary?.totalImprovements || 0}</div>
                    <div class="text-sm text-green-700">개선</div>
                </div>
            </div>
            
            ${reports.regression.latest.regressions?.length > 0 ? `
            <div class="mb-4">
                <h4 class="font-medium mb-2 text-red-700">⚠️ 주요 회귀사항</h4>
                ${reports.regression.latest.regressions.slice(0, 5).map(reg => `
                    <div class="bg-red-50 border-l-4 border-red-500 p-3 mb-2">
                        <div class="font-medium">${reg.message}</div>
                        <div class="text-sm text-gray-600">
                            ${reg.baseline} → ${reg.current} (${reg.change > 0 ? '+' : ''}${typeof reg.change === 'number' ? reg.change.toFixed(1) : reg.change}${reg.metric === 'cls' ? '' : '%'})
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : ''}

            ${reports.regression.latest.improvements?.length > 0 ? `
            <div class="mb-4">
                <h4 class="font-medium mb-2 text-green-700">✅ 주요 개선사항</h4>
                ${reports.regression.latest.improvements.slice(0, 3).map(imp => `
                    <div class="bg-green-50 border-l-4 border-green-500 p-3 mb-2">
                        <div class="font-medium">${imp.message}</div>
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
        ` : ''}

        <!-- Recommendations -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h3 class="text-xl font-bold mb-4">💡 성능 최적화 권장사항</h3>
            <div class="space-y-3">
                ${this.generateRecommendations(reports).map(rec => `
                    <div class="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <div class="text-blue-600 mt-1">${rec.icon}</div>
                        <div>
                            <div class="font-medium">${rec.title}</div>
                            <div class="text-sm text-gray-600">${rec.description}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Footer -->
        <div class="text-center text-gray-500 text-sm py-4">
            <p>🚀 HookLabs Elite 성능 모니터링 시스템</p>
            <p>생성 시간: ${new Date().toLocaleString('ko-KR')}</p>
        </div>
    </div>

    <script>
        // 페이지 로드 애니메이션
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.card-hover');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    card.style.animation = 'fadeInUp 0.6s ease forwards';
                }, index * 100);
            });
        });

        // CSS 애니메이션 추가
        const style = document.createElement('style');
        style.textContent = \`
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        \`;
        document.head.appendChild(style);
    </script>
</body>
</html>`;

    await fs.mkdir(this.reportsDir, { recursive: true });
    await fs.writeFile(this.outputFile, html);
    console.log(`📄 종합 성능 리포트 생성: ${this.outputFile}`);
  }

  /**
   * 점수별 색상 클래스 반환
   */
  getScoreColorClass(score) {
    if (score >= 90) return 'score-excellent';
    if (score >= 70) return 'score-good';
    return 'score-poor';
  }

  /**
   * 트렌드 텍스트 반환
   */
  getTrendText(trend) {
    switch (trend) {
      case 'improving': return '📈 성능 개선 중';
      case 'degrading': return '📉 성능 저하';
      case 'stable': return '📊 성능 안정';
      default: return '❔ 분석 중';
    }
  }

  /**
   * 권장사항 생성
   */
  generateRecommendations(reports) {
    const recommendations = [];

    // Lighthouse 기반 권장사항
    Object.entries(reports.lighthouse).forEach(([profile, data]) => {
      if (data.scores?.performance < 85) {
        recommendations.push({
          icon: '🚦',
          title: `${profile} 성능 개선 필요`,
          description: 'Core Web Vitals 최적화 및 리소스 압축을 검토하세요.'
        });
      }

      // 주요 개선 기회
      if (data.opportunities?.length > 0) {
        data.opportunities.slice(0, 2).forEach(opp => {
          recommendations.push({
            icon: '⚡',
            title: opp.title,
            description: `${Math.round(opp.savings)}ms 절약 가능 - ${opp.description}`
          });
        });
      }
    });

    // API 성능 기반 권장사항
    Object.entries(reports.api).forEach(([name, data]) => {
      if (data.averageResponseTime > 200) {
        recommendations.push({
          icon: '📡',
          title: 'API 응답시간 최적화',
          description: `${name}: 평균 ${Math.round(data.averageResponseTime)}ms - 데이터베이스 쿼리 최적화를 검토하세요.`
        });
      }

      if (data.errorRate > 2) {
        recommendations.push({
          icon: '🚨',
          title: 'API 안정성 개선',
          description: `${name}: 오류율 ${data.errorRate.toFixed(1)}% - 에러 핸들링 및 재시도 로직을 강화하세요.`
        });
      }
    });

    // 회귀 기반 권장사항
    if (reports.regression.latest?.regressions?.length > 0) {
      recommendations.push({
        icon: '⚠️',
        title: '성능 회귀 해결',
        description: `${reports.regression.latest.regressions.length}개의 성능 회귀가 감지되었습니다. 최근 변경사항을 검토하세요.`
      });
    }

    // 기본 권장사항
    if (recommendations.length === 0) {
      recommendations.push({
        icon: '✅',
        title: '성능 상태 양호',
        description: '현재 성능 상태가 우수합니다. 지속적인 모니터링을 유지하세요.'
      });
    }

    return recommendations.slice(0, 6); // 최대 6개
  }

  /**
   * 메인 실행 함수
   */
  async run() {
    console.log('📊 종합 성능 리포트 생성 시작\n');

    try {
      const reports = await this.collectAllReports();
      await this.generateHTMLReport(reports);

      // JSON 리포트도 저장
      const jsonReportFile = path.join(this.reportsDir, 'comprehensive-report.json');
      await fs.writeFile(jsonReportFile, JSON.stringify(reports, null, 2));
      console.log(`📄 JSON 리포트 저장: ${jsonReportFile}`);

      console.log('\n✅ 종합 성능 리포트 생성 완료');
      console.log(`📄 HTML 리포트: ${this.outputFile}`);
      console.log(`📊 전체 성능 점수: ${this.calculateOverallScore(reports)}점`);

      return reports;

    } catch (error) {
      console.error('\n❌ 종합 성능 리포트 생성 실패:', error.message);
      throw error;
    }
  }
}

// CLI 실행
if (require.main === module) {
  const reporter = new ComprehensivePerformanceReporter();
  reporter.run().catch(error => {
    console.error('실행 실패:', error);
    process.exit(1);
  });
}

module.exports = ComprehensivePerformanceReporter;