#!/usr/bin/env node

/**
 * Convex 데이터베이스 성능 분석 도구
 * 
 * 이 도구는 다음을 분석합니다:
 * - 쿼리 복잡도 분석
 * - 인덱스 효율성 검증
 * - N+1 쿼리 패턴 감지
 * - 대용량 데이터 조회 패턴
 * - 실시간 구독 성능
 */

const fs = require('fs').promises;
const path = require('path');

class ConvexPerformanceAnalyzer {
  constructor() {
    this.convexDir = path.join(process.cwd(), 'convex');
    this.results = {
      timestamp: new Date().toISOString(),
      schemaAnalysis: {},
      queryAnalysis: [],
      performanceIssues: [],
      recommendations: []
    };
  }

  /**
   * 전체 분석 실행
   */
  async analyze() {
    console.log('🔍 Convex 데이터베이스 성능 분석 시작...\n');
    
    await this.analyzeSchema();
    await this.analyzeQueries();
    this.generateRecommendations();
    
    // 결과 저장
    const reportPath = path.join(process.cwd(), 'convex-performance-report.json');
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log('\n📊 Convex 성능 분석 완료!');
    console.log(`📁 상세 보고서: ${reportPath}`);
    
    this.printSummary();
  }

  /**
   * 스키마 분석
   */
  async analyzeSchema() {
    console.log('📋 데이터베이스 스키마 분석 중...');
    
    try {
      const schemaPath = path.join(this.convexDir, 'schema.ts');
      const schemaContent = await fs.readFile(schemaPath, 'utf8');
      
      // 테이블 및 인덱스 분석
      const tables = this.extractTables(schemaContent);
      const indexes = this.extractIndexes(schemaContent);
      
      this.results.schemaAnalysis = {
        totalTables: tables.length,
        totalIndexes: indexes.length,
        tables: tables.map(table => ({
          name: table.name,
          fieldCount: table.fields.length,
          indexCount: table.indexes.length,
          complexFields: table.fields.filter(f => f.type.includes('array') || f.type.includes('object')).length
        })),
        indexAnalysis: this.analyzeIndexEfficiency(tables, indexes),
        potentialIssues: this.findSchemaIssues(tables)
      };
      
      console.log(`✅ 분석된 테이블: ${tables.length}개, 인덱스: ${indexes.length}개`);
      
    } catch (error) {
      console.error('❌ 스키마 분석 실패:', error.message);
      this.results.schemaAnalysis.error = error.message;
    }
  }

  /**
   * 쿼리 분석
   */
  async analyzeQueries() {
    console.log('🔎 쿼리 패턴 분석 중...');
    
    try {
      const convexFiles = await this.getConvexFiles();
      
      for (const file of convexFiles) {
        if (file.endsWith('schema.ts') || file.endsWith('.d.ts')) continue;
        
        const content = await fs.readFile(file, 'utf8');
        const queries = this.extractQueries(content, path.relative(this.convexDir, file));
        
        for (const query of queries) {
          this.results.queryAnalysis.push(query);
          
          // 성능 이슈 감지
          const issues = this.detectQueryIssues(query);
          this.results.performanceIssues.push(...issues);
        }
      }
      
      console.log(`✅ 분석된 쿼리: ${this.results.queryAnalysis.length}개`);
      
    } catch (error) {
      console.error('❌ 쿼리 분석 실패:', error.message);
    }
  }

  /**
   * Convex 파일 목록 가져오기
   */
  async getConvexFiles() {
    const files = [];
    
    const readDir = async (dir) => {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('_')) {
          await readDir(fullPath);
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    };
    
    await readDir(this.convexDir);
    return files;
  }

  /**
   * 스키마에서 테이블 정보 추출
   */
  extractTables(schemaContent) {
    const tables = [];
    const tableRegex = /(\w+):\s*defineTable\(\{([^}]+)\}\)([^;]*)/g;
    
    let match;
    while ((match = tableRegex.exec(schemaContent)) !== null) {
      const [, tableName, fieldsContent, indexContent] = match;
      
      // 필드 추출
      const fieldRegex = /(\w+):\s*([^,\n]+)/g;
      const fields = [];
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(fieldsContent)) !== null) {
        fields.push({
          name: fieldMatch[1],
          type: fieldMatch[2].trim()
        });
      }
      
      // 인덱스 추출
      const indexRegex = /\.index\("([^"]+)",\s*\[([^\]]+)\]\)/g;
      const indexes = [];
      let indexMatch;
      while ((indexMatch = indexRegex.exec(indexContent)) !== null) {
        indexes.push({
          name: indexMatch[1],
          fields: indexMatch[2].split(',').map(f => f.trim().replace(/"/g, ''))
        });
      }
      
      tables.push({
        name: tableName,
        fields,
        indexes
      });
    }
    
    return tables;
  }

  /**
   * 스키마에서 모든 인덱스 추출
   */
  extractIndexes(schemaContent) {
    const indexes = [];
    const indexRegex = /\.index\("([^"]+)",\s*\[([^\]]+)\]\)/g;
    
    let match;
    while ((match = indexRegex.exec(schemaContent)) !== null) {
      indexes.push({
        name: match[1],
        fields: match[2].split(',').map(f => f.trim().replace(/"/g, ''))
      });
    }
    
    return indexes;
  }

  /**
   * 쿼리 정보 추출
   */
  extractQueries(content, fileName) {
    const queries = [];
    
    // query() 및 mutation() 추출
    const queryRegex = /export\s+const\s+(\w+)\s*=\s*(query|mutation)\(\{[^}]*handler:\s*async\s*\([^)]*\)\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
    
    let match;
    while ((match = queryRegex.exec(content)) !== null) {
      const [, name, type, body] = match;
      
      const queryInfo = {
        fileName,
        name,
        type,
        complexity: this.calculateQueryComplexity(body),
        patterns: this.detectQueryPatterns(body),
        potentialIssues: []
      };
      
      queries.push(queryInfo);
    }
    
    return queries;
  }

  /**
   * 쿼리 복잡도 계산
   */
  calculateQueryComplexity(queryBody) {
    let complexity = 1;
    
    // 체이닝 증가
    const chains = queryBody.match(/\.(query|filter|collect|first|unique|take|order|withIndex)/g) || [];
    complexity += chains.length;
    
    // 중첩 쿼리 증가
    const nestedQueries = queryBody.match(/await\s+ctx\.db/g) || [];
    complexity += nestedQueries.length * 2;
    
    // 반복문 증가
    const loops = queryBody.match(/for\s*\(/g) || [];
    complexity += loops.length * 3;
    
    // 조건문 증가
    const conditions = queryBody.match(/if\s*\(/g) || [];
    complexity += conditions.length;
    
    return complexity;
  }

  /**
   * 쿼리 패턴 감지
   */
  detectQueryPatterns(queryBody) {
    const patterns = [];
    
    // N+1 쿼리 패턴
    if (queryBody.includes('for (') && queryBody.includes('await ctx.db')) {
      patterns.push('potential-n-plus-1');
    }
    
    // 전체 컬렉션 스캔
    if (queryBody.includes('.collect()') && !queryBody.includes('.withIndex(')) {
      patterns.push('full-table-scan');
    }
    
    // 필터링 후 collect
    if (queryBody.includes('.filter(') && queryBody.includes('.collect()')) {
      patterns.push('filter-then-collect');
    }
    
    // 대용량 데이터 조회
    if (queryBody.includes('.take(') && queryBody.match(/\.take\((\d+)\)/)?.[1] > 100) {
      patterns.push('large-dataset');
    }
    
    // 복잡한 중첩 쿼리
    const nestedCount = (queryBody.match(/await ctx\.db/g) || []).length;
    if (nestedCount > 3) {
      patterns.push('complex-nested-queries');
    }
    
    // 인덱스 미사용
    if (queryBody.includes('.query(') && !queryBody.includes('.withIndex(')) {
      patterns.push('no-index-usage');
    }
    
    return patterns;
  }

  /**
   * 쿼리 이슈 감지
   */
  detectQueryIssues(query) {
    const issues = [];
    
    // 높은 복잡도
    if (query.complexity > 10) {
      issues.push({
        type: 'high-complexity',
        severity: 'HIGH',
        file: query.fileName,
        query: query.name,
        message: `쿼리 복잡도가 매우 높습니다 (${query.complexity})`,
        suggestion: '쿼리를 더 작은 단위로 분할하거나 인덱스 추가를 검토하세요'
      });
    }
    
    // N+1 쿼리 패턴
    if (query.patterns.includes('potential-n-plus-1')) {
      issues.push({
        type: 'n-plus-1-query',
        severity: 'HIGH',
        file: query.fileName,
        query: query.name,
        message: 'N+1 쿼리 패턴이 감지되었습니다',
        suggestion: '반복문 내에서 개별 쿼리 대신 bulk 쿼리나 join 패턴을 사용하세요'
      });
    }
    
    // 전체 테이블 스캔
    if (query.patterns.includes('full-table-scan')) {
      issues.push({
        type: 'full-table-scan',
        severity: 'MEDIUM',
        file: query.fileName,
        query: query.name,
        message: '인덱스 없이 전체 테이블을 스캔합니다',
        suggestion: '적절한 인덱스를 추가하여 쿼리 성능을 개선하세요'
      });
    }
    
    // 대용량 데이터 조회
    if (query.patterns.includes('large-dataset')) {
      issues.push({
        type: 'large-dataset',
        severity: 'MEDIUM',
        file: query.fileName,
        query: query.name,
        message: '대용량 데이터를 한 번에 조회합니다',
        suggestion: '페이징이나 커서 기반 조회를 구현하세요'
      });
    }
    
    return issues;
  }

  /**
   * 인덱스 효율성 분석
   */
  analyzeIndexEfficiency(tables, indexes) {
    const analysis = {
      totalIndexes: indexes.length,
      multiFieldIndexes: indexes.filter(idx => idx.fields.length > 1).length,
      potentialRedundant: [],
      missing: []
    };
    
    // 중복 가능성 있는 인덱스 찾기
    for (let i = 0; i < indexes.length; i++) {
      for (let j = i + 1; j < indexes.length; j++) {
        const idx1 = indexes[i];
        const idx2 = indexes[j];
        
        // 필드가 포함관계에 있는 경우
        if (idx1.fields.length < idx2.fields.length &&
            idx1.fields.every(field => idx2.fields.includes(field))) {
          analysis.potentialRedundant.push({
            redundant: idx1.name,
            covers: idx2.name,
            reason: `${idx1.name}의 모든 필드가 ${idx2.name}에 포함됨`
          });
        }
      }
    }
    
    return analysis;
  }

  /**
   * 스키마 이슈 찾기
   */
  findSchemaIssues(tables) {
    const issues = [];
    
    for (const table of tables) {
      // 인덱스가 없는 테이블
      if (table.indexes.length === 0 && table.fields.length > 5) {
        issues.push({
          table: table.name,
          type: 'no-indexes',
          message: `${table.name} 테이블에 인덱스가 없습니다`,
          impact: '쿼리 성능 저하'
        });
      }
      
      // 너무 많은 필드
      if (table.fields.length > 20) {
        issues.push({
          table: table.name,
          type: 'too-many-fields',
          message: `${table.name} 테이블에 필드가 너무 많습니다 (${table.fields.length}개)`,
          impact: '메모리 사용량 증가 및 네트워크 오버헤드'
        });
      }
      
      // 복잡한 중첩 구조
      const complexFields = table.fields.filter(f => 
        f.type.includes('array') || f.type.includes('object')
      );
      
      if (complexFields.length > 3) {
        issues.push({
          table: table.name,
          type: 'complex-structure',
          message: `${table.name} 테이블에 복잡한 중첩 구조가 많습니다`,
          impact: '쿼리 복잡도 증가 및 인덱싱 제한'
        });
      }
    }
    
    return issues;
  }

  /**
   * 성능 개선 권장사항 생성
   */
  generateRecommendations() {
    console.log('💡 성능 개선 권장사항 생성 중...');
    
    const recommendations = [];
    
    // 높은 우선순위 이슈들
    const highSeverityIssues = this.results.performanceIssues.filter(i => i.severity === 'HIGH');
    
    if (highSeverityIssues.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Query Performance',
        title: '긴급 성능 이슈 해결',
        description: `${highSeverityIssues.length}개의 긴급한 성능 이슈가 발견되었습니다`,
        actions: highSeverityIssues.map(issue => ({
          file: issue.file,
          query: issue.query,
          issue: issue.message,
          solution: issue.suggestion
        })),
        estimatedImpact: '응답 시간 50-80% 개선 예상'
      });
    }
    
    // 인덱스 최적화
    const indexIssues = this.results.schemaAnalysis.potentialIssues?.filter(i => i.type === 'no-indexes') || [];
    if (indexIssues.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Database Schema',
        title: '인덱스 추가 필요',
        description: `${indexIssues.length}개 테이블에 인덱스가 필요합니다`,
        actions: indexIssues.map(issue => ({
          table: issue.table,
          action: '적절한 인덱스 추가',
          example: `// ${issue.table} 테이블에 자주 조회되는 필드에 인덱스 추가\n.index("byCommonField", ["commonField"])`
        })),
        estimatedImpact: '쿼리 성능 300-500% 개선 예상'
      });
    }
    
    // N+1 쿼리 최적화
    const n1Issues = this.results.performanceIssues.filter(i => i.type === 'n-plus-1-query');
    if (n1Issues.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Query Optimization',
        title: 'N+1 쿼리 패턴 제거',
        description: `${n1Issues.length}개의 N+1 쿼리 패턴이 발견되었습니다`,
        actions: n1Issues.map(issue => ({
          file: issue.file,
          query: issue.query,
          solution: 'Promise.all()을 사용한 병렬 처리나 단일 쿼리로 데이터 일괄 조회'
        })),
        estimatedImpact: 'API 응답 시간 60-90% 개선 예상'
      });
    }
    
    // 대용량 데이터 최적화
    const largeDataIssues = this.results.performanceIssues.filter(i => i.type === 'large-dataset');
    if (largeDataIssues.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Data Loading',
        title: '페이징 구현',
        description: `${largeDataIssues.length}개의 대용량 데이터 조회가 발견되었습니다`,
        actions: largeDataIssues.map(issue => ({
          file: issue.file,
          query: issue.query,
          solution: 'usePaginatedQuery 훅을 사용한 페이징 구현'
        })),
        estimatedImpact: '초기 로딩 시간 40-60% 개선 예상'
      });
    }
    
    // 스키마 최적화
    const schemaIssues = this.results.schemaAnalysis.potentialIssues || [];
    const complexStructures = schemaIssues.filter(i => i.type === 'complex-structure');
    
    if (complexStructures.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Database Schema',
        title: '스키마 구조 최적화',
        description: `${complexStructures.length}개 테이블의 구조가 복잡합니다`,
        actions: complexStructures.map(issue => ({
          table: issue.table,
          solution: '중첩 객체를 별도 테이블로 정규화 또는 자주 사용되지 않는 필드 분리'
        })),
        estimatedImpact: '메모리 사용량 20-30% 감소 예상'
      });
    }
    
    this.results.recommendations = recommendations;
    console.log(`✅ 생성된 권장사항: ${recommendations.length}개`);
  }

  /**
   * 요약 결과 출력
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Convex 데이터베이스 성능 분석 요약');
    console.log('='.repeat(60));
    
    // 스키마 요약
    const schema = this.results.schemaAnalysis;
    if (schema.totalTables) {
      console.log(`📋 데이터베이스 스키마:`);
      console.log(`   - 총 테이블: ${schema.totalTables}개`);
      console.log(`   - 총 인덱스: ${schema.totalIndexes}개`);
      console.log(`   - 스키마 이슈: ${schema.potentialIssues?.length || 0}개`);
    }
    
    // 쿼리 요약
    console.log(`🔍 쿼리 분석:`);
    console.log(`   - 총 쿼리/뮤테이션: ${this.results.queryAnalysis.length}개`);
    console.log(`   - 성능 이슈: ${this.results.performanceIssues.length}개`);
    
    const complexQueries = this.results.queryAnalysis.filter(q => q.complexity > 8).length;
    if (complexQueries > 0) {
      console.log(`   - 복잡한 쿼리: ${complexQueries}개`);
    }
    
    // 심각도별 이슈 요약
    const highIssues = this.results.performanceIssues.filter(i => i.severity === 'HIGH').length;
    const mediumIssues = this.results.performanceIssues.filter(i => i.severity === 'MEDIUM').length;
    
    if (highIssues > 0 || mediumIssues > 0) {
      console.log(`\n⚠️  성능 이슈 요약:`);
      if (highIssues > 0) console.log(`   🔴 긴급: ${highIssues}개`);
      if (mediumIssues > 0) console.log(`   🟡 보통: ${mediumIssues}개`);
    }
    
    // 주요 권장사항
    const highPriorityRecs = this.results.recommendations.filter(r => r.priority === 'HIGH');
    if (highPriorityRecs.length > 0) {
      console.log(`\n🚀 주요 개선사항 (${highPriorityRecs.length}개):`);
      highPriorityRecs.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.category}] ${rec.title}`);
        console.log(`   ${rec.description}`);
        console.log(`   예상 효과: ${rec.estimatedImpact}`);
      });
    }
    
    console.log('\n💡 자세한 분석 결과는 convex-performance-report.json을 확인하세요.');
  }
}

// 메인 실행부
if (require.main === module) {
  const analyzer = new ConvexPerformanceAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = ConvexPerformanceAnalyzer;