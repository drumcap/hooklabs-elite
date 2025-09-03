#!/usr/bin/env node

/**
 * 종합 테스트 실행 스크립트
 * 단위 테스트, 통합 테스트, 컴포넌트 테스트, E2E 테스트를 순차적으로 실행하고
 * 커버리지 리포트를 생성합니다.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// 테스트 구성 정의
const TEST_SUITES = {
  unit: {
    name: '단위 테스트 (Unit Tests)',
    command: 'npm',
    args: ['run', 'test:unit'],
    description: 'Convex 함수 및 유틸리티 함수 테스트'
  },
  integration: {
    name: '통합 테스트 (Integration Tests)',
    command: 'npm',
    args: ['run', 'test:integration'],
    description: 'API 통합 및 데이터 플로우 테스트'
  },
  components: {
    name: '컴포넌트 테스트 (Component Tests)',
    command: 'npm',
    args: ['run', 'test:components'],
    description: 'React 컴포넌트 테스트'
  },
  coverage: {
    name: '커버리지 리포트 (Coverage Report)',
    command: 'npm',
    args: ['run', 'test:coverage'],
    description: '코드 커버리지 분석 및 리포트 생성'
  },
  e2e: {
    name: 'E2E 테스트 (End-to-End Tests)',
    command: 'npm',
    args: ['run', 'test:e2e'],
    description: '전체 사용자 워크플로우 테스트 (Playwright)'
  }
};

// CLI 옵션 파싱
const args = process.argv.slice(2);
const options = {
  suite: args.includes('--suite') ? args[args.indexOf('--suite') + 1] : 'all',
  skipE2E: args.includes('--skip-e2e'),
  parallel: args.includes('--parallel'),
  watch: args.includes('--watch'),
  verbose: args.includes('--verbose'),
  coverage: args.includes('--coverage'),
  help: args.includes('--help') || args.includes('-h')
};

// 도움말 출력
function showHelp() {
  console.log(chalk.blue.bold('\n📋 테스트 실행 스크립트 사용법\n'));
  
  console.log(chalk.white('사용법:'));
  console.log('  node scripts/test-runner.js [옵션]\n');
  
  console.log(chalk.white('옵션:'));
  console.log('  --suite <name>     특정 테스트 스위트만 실행 (unit|integration|components|e2e)');
  console.log('  --skip-e2e         E2E 테스트 건너뛰기');
  console.log('  --parallel         병렬 테스트 실행 (해당되는 경우)');
  console.log('  --watch            감시 모드로 테스트 실행');
  console.log('  --verbose          상세한 로그 출력');
  console.log('  --coverage         커버리지 리포트 생성');
  console.log('  --help, -h         도움말 표시\n');
  
  console.log(chalk.white('예시:'));
  console.log('  node scripts/test-runner.js                    # 모든 테스트 실행');
  console.log('  node scripts/test-runner.js --suite unit       # 단위 테스트만 실행');
  console.log('  node scripts/test-runner.js --skip-e2e         # E2E 제외하고 실행');
  console.log('  node scripts/test-runner.js --coverage         # 커버리지 포함 실행');
  console.log('  node scripts/test-runner.js --watch            # 감시 모드 실행\n');

  console.log(chalk.white('테스트 스위트:'));
  Object.entries(TEST_SUITES).forEach(([key, suite]) => {
    console.log(`  ${chalk.cyan(key.padEnd(12))} ${suite.description}`);
  });
  console.log();
}

// 명령어 실행 함수
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.verbose ? 'inherit' : 'pipe',
      shell: process.platform === 'win32',
      cwd: process.cwd()
    });

    let stdout = '';
    let stderr = '';

    if (!options.verbose) {
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject({ stdout, stderr, code });
      }
    });

    child.on('error', (error) => {
      reject({ error, code: -1 });
    });
  });
}

// 테스트 결과 통계
const testResults = {
  passed: 0,
  failed: 0,
  suites: {},
  startTime: Date.now(),
  endTime: null
};

// 단일 테스트 스위트 실행
async function runTestSuite(suiteKey, suite) {
  const startTime = Date.now();
  
  console.log(chalk.blue(`\n🧪 ${suite.name} 실행 중...`));
  console.log(chalk.gray(`   ${suite.description}`));
  
  if (options.verbose) {
    console.log(chalk.gray(`   명령어: ${suite.command} ${suite.args.join(' ')}`));
  }

  try {
    const result = await runCommand(suite.command, suite.args, {
      verbose: options.verbose
    });
    
    const duration = Date.now() - startTime;
    
    console.log(chalk.green(`✅ ${suite.name} 통과 (${duration}ms)`));
    
    testResults.passed++;
    testResults.suites[suiteKey] = {
      status: 'passed',
      duration,
      output: result.stdout
    };

    // 커버리지 정보 추출 (coverage 스위트인 경우)
    if (suiteKey === 'coverage' && result.stdout) {
      extractCoverageInfo(result.stdout);
    }

    return { success: true, duration, output: result.stdout };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.log(chalk.red(`❌ ${suite.name} 실패 (${duration}ms)`));
    
    if (!options.verbose && error.stderr) {
      console.log(chalk.red('에러 출력:'));
      console.log(error.stderr);
    }

    testResults.failed++;
    testResults.suites[suiteKey] = {
      status: 'failed',
      duration,
      error: error.stderr || error.error?.message
    };

    return { success: false, duration, error: error.stderr };
  }
}

// 커버리지 정보 추출
function extractCoverageInfo(output) {
  try {
    // 커버리지 정보를 파싱하여 표시
    const coverageRegex = /All files\s*\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)/;
    const match = output.match(coverageRegex);
    
    if (match) {
      const [, statements, branches, functions, lines] = match;
      
      console.log(chalk.blue('\n📊 코드 커버리지 요약:'));
      console.log(`  Statements: ${statements}%`);
      console.log(`  Branches:   ${branches}%`);
      console.log(`  Functions:  ${functions}%`);
      console.log(`  Lines:      ${lines}%`);

      // 커버리지 임계값 체크 (80% 목표)
      const minCoverage = 80;
      const allMetrics = [statements, branches, functions, lines].map(Number);
      const avgCoverage = allMetrics.reduce((sum, val) => sum + val, 0) / allMetrics.length;

      if (avgCoverage >= minCoverage) {
        console.log(chalk.green(`✅ 목표 커버리지 (${minCoverage}%) 달성! (평균: ${avgCoverage.toFixed(1)}%)`));
      } else {
        console.log(chalk.yellow(`⚠️  목표 커버리지 미달 (목표: ${minCoverage}%, 현재: ${avgCoverage.toFixed(1)}%)`));
      }
    }
  } catch (error) {
    console.log(chalk.gray('커버리지 정보 파싱 중 오류 발생'));
  }
}

// 병렬 테스트 실행
async function runTestsParallel(suitesToRun) {
  console.log(chalk.blue('\n🚀 병렬 테스트 실행 시작...\n'));

  const promises = suitesToRun.map(([key, suite]) => 
    runTestSuite(key, suite).catch(error => ({ success: false, error, suite: key }))
  );

  const results = await Promise.all(promises);
  
  return results;
}

// 순차 테스트 실행
async function runTestsSequential(suitesToRun) {
  console.log(chalk.blue('\n🔄 순차 테스트 실행 시작...\n'));

  const results = [];
  
  for (const [key, suite] of suitesToRun) {
    const result = await runTestSuite(key, suite);
    results.push({ ...result, suite: key });
    
    // 실패 시 중단할지 여부 (옵션으로 제어 가능)
    if (!result.success && !process.env.CONTINUE_ON_FAILURE) {
      console.log(chalk.yellow(`\n⚠️  ${suite.name} 실패로 인해 나머지 테스트를 중단합니다.`));
      console.log(chalk.gray('CONTINUE_ON_FAILURE=true 환경변수를 설정하면 계속 진행됩니다.\n'));
      break;
    }
  }
  
  return results;
}

// 최종 결과 리포트
function generateReport() {
  testResults.endTime = Date.now();
  const totalDuration = testResults.endTime - testResults.startTime;
  
  console.log(chalk.blue.bold('\n📋 테스트 실행 결과 요약\n'));
  
  // 전체 통계
  const total = testResults.passed + testResults.failed;
  console.log(`총 테스트 스위트: ${total}`);
  console.log(`${chalk.green('통과:')} ${testResults.passed}`);
  console.log(`${chalk.red('실패:')} ${testResults.failed}`);
  console.log(`실행 시간: ${totalDuration}ms\n`);

  // 스위트별 상세 결과
  console.log(chalk.white('스위트별 결과:'));
  Object.entries(testResults.suites).forEach(([suite, result]) => {
    const statusIcon = result.status === 'passed' ? '✅' : '❌';
    const statusColor = result.status === 'passed' ? chalk.green : chalk.red;
    
    console.log(`  ${statusIcon} ${suite.padEnd(12)} ${statusColor(result.status)} (${result.duration}ms)`);
  });

  // 성공률 계산
  const successRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : '0';
  console.log(`\n성공률: ${successRate}%`);

  // 리포트 파일 생성
  const reportPath = path.join(process.cwd(), 'test-results', 'test-summary.json');
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: parseFloat(successRate),
      duration: totalDuration,
      timestamp: new Date().toISOString()
    },
    suites: testResults.suites
  }, null, 2));

  console.log(chalk.gray(`\n리포트 저장: ${reportPath}`));

  return testResults.failed === 0;
}

// 환경 검증
function checkEnvironment() {
  console.log(chalk.blue('🔍 환경 검증 중...\n'));

  const checks = [
    {
      name: 'Node.js 버전',
      check: () => {
        const version = process.version;
        const majorVersion = parseInt(version.slice(1));
        return majorVersion >= 18;
      },
      message: 'Node.js 18+ 필요'
    },
    {
      name: 'package.json 존재',
      check: () => fs.existsSync('package.json'),
      message: 'package.json 파일이 필요합니다'
    },
    {
      name: 'node_modules 존재',
      check: () => fs.existsSync('node_modules'),
      message: 'npm install을 실행해주세요'
    },
    {
      name: 'Vitest 설정',
      check: () => fs.existsSync('vitest.config.ts'),
      message: 'vitest.config.ts 파일이 필요합니다'
    },
    {
      name: 'Playwright 설정',
      check: () => fs.existsSync('playwright.config.ts'),
      message: 'playwright.config.ts 파일이 필요합니다'
    }
  ];

  let allPassed = true;

  checks.forEach(({ name, check, message }) => {
    try {
      const passed = check();
      console.log(passed ? chalk.green(`✅ ${name}`) : chalk.red(`❌ ${name}: ${message}`));
      if (!passed) allPassed = false;
    } catch (error) {
      console.log(chalk.red(`❌ ${name}: ${error.message}`));
      allPassed = false;
    }
  });

  if (!allPassed) {
    console.log(chalk.red('\n환경 검증 실패. 위 문제들을 해결한 후 다시 실행해주세요.\n'));
    process.exit(1);
  }

  console.log(chalk.green('\n✅ 환경 검증 완료\n'));
}

// 메인 실행 함수
async function main() {
  console.log(chalk.blue.bold('🧪 소셜 미디어 자동화 플랫폼 테스트 스위트\n'));

  if (options.help) {
    showHelp();
    return;
  }

  // 환경 검증
  checkEnvironment();

  // 실행할 테스트 스위트 결정
  let suitesToRun;
  
  if (options.suite === 'all') {
    suitesToRun = Object.entries(TEST_SUITES);
    
    // E2E 테스트 스킵 옵션
    if (options.skipE2E) {
      suitesToRun = suitesToRun.filter(([key]) => key !== 'e2e');
    }

    // 커버리지 옵션
    if (options.coverage && !suitesToRun.find(([key]) => key === 'coverage')) {
      suitesToRun.push(['coverage', TEST_SUITES.coverage]);
    }
    
  } else if (TEST_SUITES[options.suite]) {
    suitesToRun = [[options.suite, TEST_SUITES[options.suite]]];
  } else {
    console.log(chalk.red(`❌ 알 수 없는 테스트 스위트: ${options.suite}\n`));
    showHelp();
    process.exit(1);
  }

  console.log(chalk.blue(`실행할 테스트 스위트 (${suitesToRun.length}개):`));
  suitesToRun.forEach(([key, suite]) => {
    console.log(`  • ${chalk.cyan(key)}: ${suite.description}`);
  });

  try {
    // 테스트 실행
    const results = options.parallel 
      ? await runTestsParallel(suitesToRun)
      : await runTestsSequential(suitesToRun);

    // 결과 리포트 생성
    const success = generateReport();

    // 종료 코드 설정
    process.exit(success ? 0 : 1);

  } catch (error) {
    console.log(chalk.red('\n❌ 테스트 실행 중 예기치 않은 오류가 발생했습니다:'));
    console.log(chalk.red(error.message));
    
    if (options.verbose) {
      console.log(chalk.gray(error.stack));
    }
    
    process.exit(1);
  }
}

// 프로세스 시그널 처리
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n⚠️  테스트가 중단되었습니다.'));
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n\n⚠️  테스트가 종료되었습니다.'));
  process.exit(143);
});

// 처리되지 않은 Promise 거부 처리
process.on('unhandledRejection', (reason, promise) => {
  console.log(chalk.red('\n❌ 처리되지 않은 Promise 거부:'));
  console.log(reason);
  process.exit(1);
});

// 스크립트 실행
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('스크립트 실행 오류:'), error);
    process.exit(1);
  });
}

module.exports = { runTestSuite, generateReport, checkEnvironment };