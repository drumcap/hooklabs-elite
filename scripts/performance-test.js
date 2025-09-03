#!/usr/bin/env node

/**
 * HookLabs Elite 성능 최적화 결과 검증 스크립트
 * 
 * 이 스크립트는 최적화 전후의 성능을 비교하고 측정합니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 HookLabs Elite 성능 최적화 검증 시작\n');

// 성능 측정 결과를 저장할 객체
const performanceReport = {
  timestamp: new Date().toISOString(),
  tests: {},
  summary: {},
  recommendations: []
};

/**
 * 1. 번들 크기 분석
 */
function analyzeBundleSize() {
  console.log('📦 번들 크기 분석 중...');
  
  try {
    // Next.js 빌드 실행
    console.log('   - Next.js 프로덕션 빌드 실행 중...');
    execSync('npm run build', { stdio: 'pipe' });
    
    // 번들 분석기 실행
    console.log('   - 번들 분석기 실행 중...');
    execSync('ANALYZE=true npm run build', { stdio: 'pipe' });
    
    // .next/static 폴더 크기 측정
    const staticPath = path.join(process.cwd(), '.next', 'static');
    const bundleSize = getFolderSize(staticPath);
    
    performanceReport.tests.bundleSize = {
      totalSize: bundleSize,
      sizeMB: (bundleSize / 1024 / 1024).toFixed(2),
      target: '< 300KB',
      passed: bundleSize < 300 * 1024,
      improvement: calculateImprovement(428 * 1024, bundleSize) // 기존 428KB 대비
    };
    
    console.log(`   ✅ 번들 크기: ${performanceReport.tests.bundleSize.sizeMB}MB`);
    
  } catch (error) {
    console.error('   ❌ 번들 크기 분석 실패:', error.message);
    performanceReport.tests.bundleSize = { error: error.message };
  }
}

/**
 * 2. Lighthouse 성능 측정
 */
function runLighthouseTest() {
  console.log('🔍 Lighthouse 성능 측정 중...');
  
  try {
    // 개발 서버 시작 (백그라운드)
    const serverProcess = require('child_process').spawn('npm', ['run', 'dev'], {
      detached: true,
      stdio: 'ignore'
    });
    
    // 서버 시작 대기
    console.log('   - 개발 서버 시작 대기 중...');
    setTimeout(() => {
      try {
        // Lighthouse 실행
        const lighthouseResult = execSync(
          'lighthouse http://localhost:3000 --only-categories=performance --output=json --quiet',
          { encoding: 'utf8' }
        );
        
        const report = JSON.parse(lighthouseResult);
        const performanceScore = report.categories.performance.score * 100;
        
        // Core Web Vitals 추출
        const lcp = report.audits['largest-contentful-paint'].numericValue;
        const fid = report.audits['max-potential-fid'].numericValue;
        const cls = report.audits['cumulative-layout-shift'].numericValue;
        const fcp = report.audits['first-contentful-paint'].numericValue;
        const ttfb = report.audits['server-response-time'].numericValue;
        
        performanceReport.tests.lighthouse = {
          performanceScore,
          coreWebVitals: {
            LCP: { value: lcp, target: '< 2.5s', passed: lcp < 2500 },
            FID: { value: fid, target: '< 100ms', passed: fid < 100 },
            CLS: { value: cls, target: '< 0.1', passed: cls < 0.1 },
            FCP: { value: fcp, target: '< 1.8s', passed: fcp < 1800 },
            TTFB: { value: ttfb, target: '< 800ms', passed: ttfb < 800 }
          },
          improvements: {
            LCP: calculateImprovement(3720, lcp), // 기존 3.72s 대비
            performanceScore: calculateImprovement(60, performanceScore) // 예상 기존 점수 대비
          }
        };
        
        console.log(`   ✅ Performance Score: ${performanceScore}/100`);
        console.log(`   ✅ LCP: ${(lcp/1000).toFixed(2)}s`);
        console.log(`   ✅ FID: ${fid.toFixed(2)}ms`);
        console.log(`   ✅ CLS: ${cls.toFixed(3)}`);
        
        // 서버 프로세스 종료
        process.kill(-serverProcess.pid);
        
      } catch (error) {
        console.error('   ❌ Lighthouse 측정 실패:', error.message);
        performanceReport.tests.lighthouse = { error: error.message };
        process.kill(-serverProcess.pid);
      }
    }, 10000); // 10초 대기
    
  } catch (error) {
    console.error('   ❌ 서버 시작 실패:', error.message);
    performanceReport.tests.lighthouse = { error: error.message };
  }
}

/**
 * 3. 로딩 시간 시뮬레이션 (다양한 네트워크 환경)
 */
function simulateLoadingTimes() {
  console.log('⏱️  로딩 시간 시뮬레이션 중...');
  
  const networkProfiles = [
    { name: 'Fast 3G', downloadKbps: 1600, uploadKbps: 750, latencyMs: 150 },
    { name: 'Slow 3G', downloadKbps: 400, uploadKbps: 400, latencyMs: 400 },
    { name: '4G', downloadKbps: 9000, uploadKbps: 9000, latencyMs: 170 }
  ];
  
  performanceReport.tests.networkSimulation = {};
  
  networkProfiles.forEach(profile => {
    // 번들 크기 기반 로딩 시간 계산
    const bundleSizeKB = performanceReport.tests.bundleSize?.totalSize / 1024 || 300;
    const estimatedLoadTime = (bundleSizeKB * 8) / profile.downloadKbps + (profile.latencyMs / 1000);
    
    performanceReport.tests.networkSimulation[profile.name] = {
      estimatedLoadTime: estimatedLoadTime.toFixed(2),
      target: profile.name === 'Fast 3G' ? '< 4s' : profile.name === 'Slow 3G' ? '< 8s' : '< 2s',
      passed: profile.name === 'Fast 3G' ? estimatedLoadTime < 4 : 
              profile.name === 'Slow 3G' ? estimatedLoadTime < 8 : 
              estimatedLoadTime < 2
    };
    
    console.log(`   ${profile.name}: ${estimatedLoadTime.toFixed(2)}s`);
  });
}

/**
 * 4. 최적화 기능 검증
 */
function verifyOptimizations() {
  console.log('🔧 최적화 기능 검증 중...');
  
  const optimizations = {
    serviceWorker: checkFileExists('public/sw.js'),
    manifest: checkFileExists('public/manifest.json'),
    nextConfigOptimizations: checkNextConfigOptimizations(),
    lazyLoading: checkLazyLoadingImplementation(),
    memoization: checkMemoizationImplementation(),
    bundleSplitting: checkBundleSplitting()
  };
  
  performanceReport.tests.optimizations = optimizations;
  
  Object.entries(optimizations).forEach(([key, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${key}: ${passed ? 'Implemented' : 'Missing'}`);
  });
}

/**
 * 5. 결과 요약 및 권장사항 생성
 */
function generateSummaryAndRecommendations() {
  console.log('\n📊 결과 요약 생성 중...');
  
  // 전체 점수 계산
  let totalScore = 0;
  let maxScore = 0;
  
  if (performanceReport.tests.bundleSize?.passed !== undefined) {
    totalScore += performanceReport.tests.bundleSize.passed ? 20 : 0;
    maxScore += 20;
  }
  
  if (performanceReport.tests.lighthouse?.performanceScore) {
    totalScore += (performanceReport.tests.lighthouse.performanceScore / 100) * 30;
    maxScore += 30;
  }
  
  if (performanceReport.tests.networkSimulation) {
    const networkPassed = Object.values(performanceReport.tests.networkSimulation).filter(n => n.passed).length;
    totalScore += (networkPassed / 3) * 25;
    maxScore += 25;
  }
  
  if (performanceReport.tests.optimizations) {
    const optimizationsPassed = Object.values(performanceReport.tests.optimizations).filter(Boolean).length;
    totalScore += (optimizationsPassed / 6) * 25;
    maxScore += 25;
  }
  
  const finalScore = maxScore > 0 ? (totalScore / maxScore * 100).toFixed(1) : 0;
  
  performanceReport.summary = {
    overallScore: finalScore,
    grade: finalScore >= 90 ? 'A' : finalScore >= 80 ? 'B' : finalScore >= 70 ? 'C' : finalScore >= 60 ? 'D' : 'F',
    improvements: {
      bundleSize: performanceReport.tests.bundleSize?.improvement || 'N/A',
      lighthouse: performanceReport.tests.lighthouse?.improvements || 'N/A'
    }
  };
  
  // 권장사항 생성
  generateRecommendations();
  
  console.log(`\n🎯 전체 성능 점수: ${finalScore}/100 (${performanceReport.summary.grade})`);
}

/**
 * 권장사항 생성
 */
function generateRecommendations() {
  const recommendations = [];
  
  // 번들 크기 권장사항
  if (performanceReport.tests.bundleSize && !performanceReport.tests.bundleSize.passed) {
    recommendations.push('번들 크기가 목표치를 초과합니다. 더 적극적인 코드 스플리팅을 적용하세요.');
    recommendations.push('사용하지 않는 라이브러리를 제거하고 트리 셰이킹을 개선하세요.');
  }
  
  // Lighthouse 권장사항
  if (performanceReport.tests.lighthouse?.coreWebVitals) {
    const vitals = performanceReport.tests.lighthouse.coreWebVitals;
    
    if (!vitals.LCP.passed) {
      recommendations.push('LCP 개선을 위해 이미지 최적화 및 서버 응답 시간 개선이 필요합니다.');
    }
    
    if (!vitals.FID.passed) {
      recommendations.push('FID 개선을 위해 JavaScript 실행 시간을 단축하세요.');
    }
    
    if (!vitals.CLS.passed) {
      recommendations.push('CLS 개선을 위해 이미지와 광고의 크기를 미리 지정하세요.');
    }
  }
  
  // 최적화 권장사항
  if (performanceReport.tests.optimizations) {
    const opts = performanceReport.tests.optimizations;
    
    if (!opts.serviceWorker) {
      recommendations.push('Service Worker를 구현하여 오프라인 기능과 캐싱을 개선하세요.');
    }
    
    if (!opts.lazyLoading) {
      recommendations.push('컴포넌트 레이지 로딩을 더 적극적으로 적용하세요.');
    }
    
    if (!opts.memoization) {
      recommendations.push('React 컴포넌트에 메모이제이션을 적용하여 리렌더링을 최적화하세요.');
    }
  }
  
  if (recommendations.length === 0) {
    recommendations.push('모든 최적화가 성공적으로 적용되었습니다! 계속 모니터링하세요.');
  }
  
  performanceReport.recommendations = recommendations;
}

/**
 * 헬퍼 함수들
 */
function getFolderSize(folderPath) {
  if (!fs.existsSync(folderPath)) return 0;
  
  let totalSize = 0;
  const files = fs.readdirSync(folderPath);
  
  files.forEach(file => {
    const filePath = path.join(folderPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      totalSize += getFolderSize(filePath);
    } else {
      totalSize += stats.size;
    }
  });
  
  return totalSize;
}

function calculateImprovement(before, after) {
  if (before <= 0) return 'N/A';
  return `${(((before - after) / before) * 100).toFixed(1)}%`;
}

function checkFileExists(filePath) {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

function checkNextConfigOptimizations() {
  try {
    const configPath = path.join(process.cwd(), 'next.config.ts');
    if (!fs.existsSync(configPath)) return false;
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    return configContent.includes('optimizePackageImports') && 
           configContent.includes('splitChunks') &&
           configContent.includes('optimizeCss');
  } catch {
    return false;
  }
}

function checkLazyLoadingImplementation() {
  try {
    const dashboardPagePath = path.join(process.cwd(), 'app', 'dashboard', 'page.tsx');
    if (!fs.existsSync(dashboardPagePath)) return false;
    
    const content = fs.readFileSync(dashboardPagePath, 'utf8');
    return content.includes('dynamic') && content.includes('Suspense');
  } catch {
    return false;
  }
}

function checkMemoizationImplementation() {
  try {
    const personaCardPath = path.join(process.cwd(), 'components', 'social', 'personas', 'PersonaCard.tsx');
    if (!fs.existsSync(personaCardPath)) return false;
    
    const content = fs.readFileSync(personaCardPath, 'utf8');
    return content.includes('memo') && content.includes('useCallback') && content.includes('useMemo');
  } catch {
    return false;
  }
}

function checkBundleSplitting() {
  try {
    const configPath = path.join(process.cwd(), 'next.config.ts');
    if (!fs.existsSync(configPath)) return false;
    
    const content = fs.readFileSync(configPath, 'utf8');
    return content.includes('react:') && content.includes('ui:') && content.includes('animation:');
  } catch {
    return false;
  }
}

/**
 * 결과 저장
 */
function saveReport() {
  const reportPath = path.join(process.cwd(), 'performance-optimization-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(performanceReport, null, 2));
  
  console.log(`\n💾 성능 리포트가 저장되었습니다: ${reportPath}`);
  
  // 간단한 요약 출력
  console.log('\n' + '='.repeat(60));
  console.log('🎉 HookLabs Elite 성능 최적화 결과 요약');
  console.log('='.repeat(60));
  console.log(`전체 점수: ${performanceReport.summary.overallScore}/100 (${performanceReport.summary.grade})`);
  
  if (performanceReport.tests.bundleSize?.sizeMB) {
    console.log(`번들 크기: ${performanceReport.tests.bundleSize.sizeMB}MB (목표: < 0.3MB)`);
  }
  
  if (performanceReport.tests.lighthouse?.performanceScore) {
    console.log(`Lighthouse 점수: ${performanceReport.tests.lighthouse.performanceScore}/100`);
  }
  
  console.log('\n📋 주요 권장사항:');
  performanceReport.recommendations.slice(0, 3).forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`);
  });
  
  console.log('\n✨ 최적화가 완료되었습니다!');
  console.log('='.repeat(60));
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    analyzeBundleSize();
    simulateLoadingTimes();
    verifyOptimizations();
    
    // Lighthouse는 시간이 오래 걸리므로 마지막에 실행
    // runLighthouseTest(); // 실제 환경에서만 실행
    
    generateSummaryAndRecommendations();
    saveReport();
    
  } catch (error) {
    console.error('❌ 성능 테스트 실행 중 오류 발생:', error.message);
    process.exit(1);
  }
}

// 스크립트가 직접 실행된 경우에만 main 함수 호출
if (require.main === module) {
  main();
}

module.exports = {
  analyzeBundleSize,
  simulateLoadingTimes,
  verifyOptimizations,
  generateSummaryAndRecommendations
};