import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...');

  try {
    // 테스트 데이터 정리 (필요한 경우)
    if (process.env.CLEANUP_TEST_DATA) {
      console.log('🗑️ Cleaning up test data...');
      
      const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';
      
      // 테스트 데이터 삭제 API 호출
      try {
        const response = await fetch(`${baseURL}/api/test/cleanup`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          console.log('✅ Test data cleaned up successfully');
        } else {
          console.warn('⚠️ Test data cleanup failed');
        }
      } catch (error) {
        console.warn('⚠️ Test data cleanup error:', error);
      }
    }

    // 테스트 결과 통계 출력
    console.log('📊 Test execution summary:');
    
    if (process.env.BASELINE_LOAD_TIME) {
      console.log(`   Baseline load time: ${process.env.BASELINE_LOAD_TIME}ms`);
    }
    
    if (process.env.BASELINE_DOM_READY_TIME) {
      console.log(`   Baseline DOM ready time: ${process.env.BASELINE_DOM_READY_TIME}ms`);
    }

    // 임시 파일 정리
    console.log('🗂️ Cleaning up temporary files...');
    
    // 테스트 중 생성된 임시 파일들 삭제
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const tempDirs = [
      'test-results/temp',
      'playwright-report/temp',
    ];
    
    for (const tempDir of tempDirs) {
      try {
        const fullPath = path.resolve(tempDir);
        await fs.rmdir(fullPath, { recursive: true });
        console.log(`   Removed ${tempDir}`);
      } catch (error) {
        // 디렉터리가 없는 경우는 무시
        if ((error as any).code !== 'ENOENT') {
          console.warn(`   Warning: Could not remove ${tempDir}:`, error);
        }
      }
    }

    // 환경 변수 정리
    delete process.env.STORAGE_STATE;
    delete process.env.BASELINE_LOAD_TIME;
    delete process.env.BASELINE_DOM_READY_TIME;

    console.log('✅ E2E test global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown error:', error);
    // teardown 오류는 치명적이지 않으므로 throw하지 않음
  }
}

export default globalTeardown;