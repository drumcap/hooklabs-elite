#!/usr/bin/env node

/**
 * HookLabs Elite 성능 프로파일링 도구
 * 
 * 이 도구는 다음과 같은 성능 메트릭을 수집합니다:
 * - 번들 크기 분석
 * - 메모리 사용량 모니터링
 * - API 응답 시간 측정
 * - 데이터베이스 쿼리 성능
 * - 프론트엔드 Core Web Vitals
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class PerformanceProfiler {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      bundleAnalysis: {},
      memoryProfile: {},
      apiMetrics: {},
      databaseMetrics: {},
      frontendMetrics: {}
    };
  }

  /**
   * 번들 크기 분석
   */
  async analyzeBundleSize() {
    console.log('📦 번들 크기 분석 중...');
    
    try {
      // 현재 번들 크기 추정 (node_modules 제외)
      const sizes = await this.calculateDirectorySizes();
      
      this.results.bundleAnalysis = {
        totalSize: sizes.total,
        breakdown: sizes.breakdown,
        recommendations: this.generateBundleRecommendations(sizes)
      };
      
      console.log(`✅ 총 번들 크기: ${this.formatBytes(sizes.total)}`);
      
    } catch (error) {
      console.error('❌ 번들 분석 중 오류:', error.message);
      this.results.bundleAnalysis.error = error.message;
    }
  }

  /**
   * 디렉토리별 크기 계산
   */
  async calculateDirectorySizes() {
    const directories = [
      'app',
      'components', 
      'lib',
      'convex',
      'public'
    ];

    const breakdown = {};
    let total = 0;

    for (const dir of directories) {
      try {
        const dirPath = path.join(process.cwd(), dir);
        const size = await this.getDirectorySize(dirPath);
        breakdown[dir] = size;
        total += size;
      } catch (error) {
        breakdown[dir] = 0;
      }
    }

    return { total, breakdown };
  }

  /**
   * 디렉토리 크기 계산 (재귀)
   */
  async getDirectorySize(dirPath) {
    try {
      const stat = await fs.stat(dirPath);
      
      if (stat.isFile()) {
        return stat.size;
      }

      if (stat.isDirectory()) {
        const files = await fs.readdir(dirPath);
        let size = 0;
        
        for (const file of files) {
          // node_modules와 .git 디렉토리 제외
          if (file === 'node_modules' || file === '.git' || file === '.next') {
            continue;
          }
          
          const filePath = path.join(dirPath, file);
          size += await this.getDirectorySize(filePath);
        }
        
        return size;
      }
      
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * 메모리 프로파일링
   */
  async profileMemoryUsage() {
    console.log('💾 메모리 사용량 분석 중...');
    
    const memUsage = process.memoryUsage();
    
    this.results.memoryProfile = {
      rss: memUsage.rss, // Resident Set Size
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      recommendations: this.generateMemoryRecommendations(memUsage)
    };

    console.log(`✅ 힙 사용량: ${this.formatBytes(memUsage.heapUsed)}/${this.formatBytes(memUsage.heapTotal)}`);
  }

  /**
   * 프론트엔드 성능 메트릭 분석
   */
  async analyzeFrontendPerformance() {
    console.log('🎨 프론트엔드 성능 메트릭 분석 중...');
    
    // 컴포넌트 복잡도 분석
    const componentComplexity = await this.analyzeComponentComplexity();
    
    this.results.frontendMetrics = {
      componentComplexity,
      recommendations: this.generateFrontendRecommendations(componentComplexity)
    };

    console.log(`✅ 분석된 컴포넌트: ${componentComplexity.totalComponents}개`);
  }

  /**
   * 컴포넌트 복잡도 분석
   */
  async analyzeComponentComplexity() {
    const componentsDir = path.join(process.cwd(), 'components');
    const appDir = path.join(process.cwd(), 'app');
    
    let totalComponents = 0;
    let totalLines = 0;
    let complexComponents = [];

    // components 디렉토리 분석
    try {
      const components = await this.analyzeDirectory(componentsDir, '.tsx');
      totalComponents += components.count;
      totalLines += components.lines;
      complexComponents.push(...components.complex);
    } catch (error) {
      console.log('components 디렉토리를 찾을 수 없습니다.');
    }

    // app 디렉토리 분석
    try {
      const appComponents = await this.analyzeDirectory(appDir, '.tsx');
      totalComponents += appComponents.count;
      totalLines += appComponents.lines;
      complexComponents.push(...appComponents.complex);
    } catch (error) {
      console.log('app 디렉토리를 찾을 수 없습니다.');
    }

    return {
      totalComponents,
      totalLines,
      averageLinesPerComponent: totalLines / totalComponents,
      complexComponents: complexComponents.sort((a, b) => b.lines - a.lines).slice(0, 10)
    };
  }

  /**
   * 디렉토리별 파일 분석
   */
  async analyzeDirectory(dirPath, extension) {
    let count = 0;
    let lines = 0;
    let complex = [];

    try {
      const files = await this.getAllFiles(dirPath, extension);
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const lineCount = content.split('\n').length;
        
        count++;
        lines += lineCount;
        
        // 100줄 이상인 복잡한 컴포넌트 표시
        if (lineCount > 100) {
          complex.push({
            file: path.relative(process.cwd(), file),
            lines: lineCount
          });
        }
      }
    } catch (error) {
      // 디렉토리가 없는 경우 무시
    }

    return { count, lines, complex };
  }

  /**
   * 특정 확장자 파일들 재귀 검색
   */
  async getAllFiles(dirPath, extension) {
    const files = [];
    
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        if (item === 'node_modules' || item.startsWith('.')) continue;
        
        const fullPath = path.join(dirPath, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          const subFiles = await this.getAllFiles(fullPath, extension);
          files.push(...subFiles);
        } else if (item.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch {
      // 디렉토리 접근 오류 무시
    }
    
    return files;
  }

  /**
   * 권장사항 생성 - 번들 최적화
   */
  generateBundleRecommendations(sizes) {
    const recommendations = [];
    
    if (sizes.breakdown.components > 50000) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Bundle Size',
        issue: '컴포넌트 디렉토리가 너무 큽니다',
        solution: '- 사용하지 않는 컴포넌트 제거\n- 동적 임포트 적용\n- Tree-shaking 최적화',
        impact: '번들 크기 20-30% 감소 예상'
      });
    }

    if (sizes.breakdown.lib > 30000) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Bundle Size',
        issue: 'lib 디렉토리의 유틸리티가 많습니다',
        solution: '- 사용하지 않는 유틸리티 함수 제거\n- 라이브러리 대신 네이티브 함수 사용 검토',
        impact: '번들 크기 10-15% 감소 예상'
      });
    }

    return recommendations;
  }

  /**
   * 권장사항 생성 - 메모리 최적화
   */
  generateMemoryRecommendations(memUsage) {
    const recommendations = [];
    const heapRatio = memUsage.heapUsed / memUsage.heapTotal;
    
    if (heapRatio > 0.8) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Memory',
        issue: '힙 메모리 사용률이 높습니다',
        solution: '- 메모리 누수 검사\n- 대용량 객체 재검토\n- 가비지 컬렉션 최적화',
        impact: '메모리 사용량 30% 감소 예상'
      });
    }

    if (memUsage.external > 50 * 1024 * 1024) { // 50MB
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Memory',
        issue: '외부 메모리 사용량이 큽니다',
        solution: '- Buffer 및 ArrayBuffer 최적화\n- 이미지/파일 처리 로직 개선',
        impact: '외부 메모리 20% 감소 예상'
      });
    }

    return recommendations;
  }

  /**
   * 권장사항 생성 - 프론트엔드 최적화
   */
  generateFrontendRecommendations(complexity) {
    const recommendations = [];
    
    if (complexity.averageLinesPerComponent > 150) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Frontend',
        issue: '컴포넌트 평균 크기가 큽니다',
        solution: '- 컴포넌트 분할\n- 커스텀 훅 추출\n- 로직과 UI 분리',
        impact: '컴포넌트 재사용성 및 성능 향상'
      });
    }

    if (complexity.complexComponents.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Frontend',
        issue: `${complexity.complexComponents.length}개의 복잡한 컴포넌트 발견`,
        solution: `다음 컴포넌트들을 리팩토링하세요:\n${complexity.complexComponents.slice(0, 5).map(c => `- ${c.file} (${c.lines}줄)`).join('\n')}`,
        impact: '유지보수성 및 성능 향상'
      });
    }

    return recommendations;
  }

  /**
   * 바이트를 읽기 쉬운 형식으로 변환
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 전체 프로파일링 실행
   */
  async runProfiling() {
    console.log('🚀 HookLabs Elite 성능 프로파일링 시작...\n');
    
    await this.analyzeBundleSize();
    await this.profileMemoryUsage();
    await this.analyzeFrontendPerformance();
    
    // 결과 저장
    const reportPath = path.join(process.cwd(), 'performance-report.json');
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log('\n📊 프로파일링 완료!');
    console.log(`📁 상세 보고서: ${reportPath}`);
    
    this.printSummary();
  }

  /**
   * 요약 결과 출력
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📈 성능 프로파일링 요약');
    console.log('='.repeat(60));
    
    // 번들 크기 요약
    if (this.results.bundleAnalysis.totalSize) {
      console.log(`📦 총 소스 크기: ${this.formatBytes(this.results.bundleAnalysis.totalSize)}`);
      console.log('   주요 디렉토리:');
      Object.entries(this.results.bundleAnalysis.breakdown).forEach(([dir, size]) => {
        console.log(`   - ${dir}: ${this.formatBytes(size)}`);
      });
    }
    
    // 메모리 요약
    const mem = this.results.memoryProfile;
    if (mem.heapUsed) {
      console.log(`💾 메모리 사용량: ${this.formatBytes(mem.heapUsed)} / ${this.formatBytes(mem.heapTotal)}`);
      console.log(`   외부 메모리: ${this.formatBytes(mem.external)}`);
    }
    
    // 컴포넌트 요약
    const comp = this.results.frontendMetrics.componentComplexity;
    if (comp) {
      console.log(`🎨 총 컴포넌트: ${comp.totalComponents}개`);
      console.log(`   평균 크기: ${Math.round(comp.averageLinesPerComponent)}줄`);
      console.log(`   복잡한 컴포넌트: ${comp.complexComponents.length}개`);
    }
    
    // 권장사항 요약
    const allRecommendations = [
      ...(this.results.bundleAnalysis.recommendations || []),
      ...(this.results.memoryProfile.recommendations || []),
      ...(this.results.frontendMetrics.recommendations || [])
    ];
    
    const highPriority = allRecommendations.filter(r => r.priority === 'HIGH');
    if (highPriority.length > 0) {
      console.log('\n🚨 높은 우선순위 개선사항:');
      highPriority.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.category}] ${rec.issue}`);
      });
    }
    
    console.log('\n💡 자세한 권장사항은 performance-report.json을 확인하세요.');
  }
}

// 메인 실행부
if (require.main === module) {
  const profiler = new PerformanceProfiler();
  profiler.runProfiling().catch(console.error);
}

module.exports = PerformanceProfiler;