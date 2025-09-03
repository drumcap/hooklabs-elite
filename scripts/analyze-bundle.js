#!/usr/bin/env node

/**
 * 번들 크기 분석 스크립트
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundle() {
  console.log(`${colors.cyan}${colors.bright}🔍 번들 크기 분석 시작...${colors.reset}\n`);

  try {
    // .next 디렉토리 확인
    const nextDir = path.join(process.cwd(), '.next');
    if (!fs.existsSync(nextDir)) {
      console.log(`${colors.yellow}⚠️  빌드가 필요합니다. 빌드를 실행합니다...${colors.reset}`);
      execSync('npm run build', { stdio: 'inherit' });
    }

    // 번들 크기 분석
    const staticDir = path.join(nextDir, 'static');
    const serverDir = path.join(nextDir, 'server');
    
    const results = {
      client: {
        js: [],
        css: [],
        total: 0,
      },
      server: {
        pages: [],
        chunks: [],
        total: 0,
      },
      images: [],
      fonts: [],
    };

    // 클라이언트 번들 분석
    if (fs.existsSync(staticDir)) {
      const chunks = fs.readdirSync(path.join(staticDir, 'chunks')).filter(f => f.endsWith('.js'));
      chunks.forEach(chunk => {
        const stats = fs.statSync(path.join(staticDir, 'chunks', chunk));
        results.client.js.push({
          name: chunk,
          size: stats.size,
          gzipped: estimateGzipSize(stats.size),
        });
        results.client.total += stats.size;
      });

      // CSS 파일 분석
      const cssDir = path.join(staticDir, 'css');
      if (fs.existsSync(cssDir)) {
        const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
        cssFiles.forEach(css => {
          const stats = fs.statSync(path.join(cssDir, css));
          results.client.css.push({
            name: css,
            size: stats.size,
            gzipped: estimateGzipSize(stats.size),
          });
          results.client.total += stats.size;
        });
      }
    }

    // 서버 번들 분석
    if (fs.existsSync(serverDir)) {
      const serverFiles = fs.readdirSync(serverDir);
      serverFiles.forEach(file => {
        if (file.endsWith('.js')) {
          const stats = fs.statSync(path.join(serverDir, file));
          results.server.chunks.push({
            name: file,
            size: stats.size,
          });
          results.server.total += stats.size;
        }
      });
    }

    // 결과 출력
    console.log(`${colors.bright}📊 번들 분석 결과${colors.reset}\n`);
    console.log('=' .repeat(60));

    // 클라이언트 번들
    console.log(`\n${colors.blue}${colors.bright}📱 클라이언트 번들${colors.reset}`);
    console.log('-'.repeat(40));
    
    // 큰 청크 경고
    const largeChunks = results.client.js.filter(c => c.size > 200 * 1024);
    if (largeChunks.length > 0) {
      console.log(`${colors.red}⚠️  경고: 200KB를 초과하는 청크:${colors.reset}`);
      largeChunks.forEach(chunk => {
        console.log(`  - ${chunk.name}: ${formatBytes(chunk.size)}`);
      });
    }

    // JavaScript 파일
    console.log(`\n${colors.cyan}JavaScript 파일:${colors.reset}`);
    results.client.js
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .forEach(file => {
        const sizeColor = file.size > 100 * 1024 ? colors.yellow : colors.green;
        console.log(`  ${file.name}: ${sizeColor}${formatBytes(file.size)}${colors.reset} (gzip: ~${formatBytes(file.gzipped)})`);
      });

    // CSS 파일
    if (results.client.css.length > 0) {
      console.log(`\n${colors.cyan}CSS 파일:${colors.reset}`);
      results.client.css.forEach(file => {
        console.log(`  ${file.name}: ${colors.green}${formatBytes(file.size)}${colors.reset} (gzip: ~${formatBytes(file.gzipped)})`);
      });
    }

    // 총 크기
    console.log(`\n${colors.bright}총 클라이언트 번들 크기: ${formatBytes(results.client.total)}${colors.reset}`);
    console.log(`예상 gzip 크기: ~${formatBytes(estimateGzipSize(results.client.total))}`);

    // 서버 번들
    console.log(`\n${colors.blue}${colors.bright}🖥️  서버 번들${colors.reset}`);
    console.log('-'.repeat(40));
    console.log(`총 서버 번들 크기: ${formatBytes(results.server.total)}`);

    // 최적화 제안
    console.log(`\n${colors.bright}💡 최적화 제안${colors.reset}`);
    console.log('=' .repeat(60));

    const suggestions = [];

    // 큰 청크 최적화
    if (largeChunks.length > 0) {
      suggestions.push({
        priority: 'high',
        message: '큰 청크를 동적 임포트로 분할하세요',
        files: largeChunks.map(c => c.name),
      });
    }

    // 전체 크기 최적화
    if (results.client.total > 1024 * 1024) {
      suggestions.push({
        priority: 'high',
        message: '전체 번들 크기가 1MB를 초과합니다. 코드 분할을 고려하세요',
      });
    }

    // 중복 패키지 확인
    const duplicates = findDuplicatePackages();
    if (duplicates.length > 0) {
      suggestions.push({
        priority: 'medium',
        message: '중복된 패키지가 발견되었습니다',
        packages: duplicates,
      });
    }

    // 제안 출력
    suggestions.forEach(suggestion => {
      const icon = suggestion.priority === 'high' ? '🔴' : '🟡';
      console.log(`${icon} ${suggestion.message}`);
      if (suggestion.files) {
        suggestion.files.forEach(file => console.log(`    - ${file}`));
      }
      if (suggestion.packages) {
        suggestion.packages.forEach(pkg => console.log(`    - ${pkg}`));
      }
    });

    if (suggestions.length === 0) {
      console.log(`${colors.green}✅ 번들 크기가 최적화되어 있습니다!${colors.reset}`);
    }

    // 상세 보고서 생성
    generateDetailedReport(results);

  } catch (error) {
    console.error(`${colors.red}❌ 분석 중 오류 발생:${colors.reset}`, error.message);
    process.exit(1);
  }
}

function estimateGzipSize(size) {
  // 일반적으로 gzip은 약 30-40% 압축률
  return Math.round(size * 0.35);
}

function findDuplicatePackages() {
  // package-lock.json 분석하여 중복 패키지 찾기
  try {
    const lockFile = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
    const packages = new Map();
    
    // 간단한 중복 검사 (실제로는 더 복잡한 로직 필요)
    return [];
  } catch {
    return [];
  }
}

function generateDetailedReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    client: results.client,
    server: results.server,
    metrics: {
      totalSize: results.client.total + results.server.total,
      clientSize: results.client.total,
      serverSize: results.server.total,
      jsSize: results.client.js.reduce((sum, f) => sum + f.size, 0),
      cssSize: results.client.css.reduce((sum, f) => sum + f.size, 0),
    },
    performance: {
      estimatedLoadTime: {
        '3g': Math.round((results.client.total / 1024 / 50) * 1000), // 50KB/s
        '4g': Math.round((results.client.total / 1024 / 300) * 1000), // 300KB/s
        'broadband': Math.round((results.client.total / 1024 / 5000) * 1000), // 5MB/s
      },
    },
  };

  // 보고서 저장
  const reportPath = path.join(process.cwd(), 'bundle-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n${colors.green}📄 상세 보고서 저장됨: ${reportPath}${colors.reset}`);
}

// 실행
analyzeBundle();