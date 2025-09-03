# 🔄 백업 및 재해복구 전략

## 개요

이 문서는 HookLabs Elite 플랫폼의 데이터 백업, 재해복구, 비즈니스 연속성 계획을 다룹니다.

## 📊 백업 전략

### 1. 데이터 분류

#### 중요도별 분류
- **Critical (중요)**: 사용자 데이터, 구독 정보, 결제 내역
- **Important (중요함)**: 소셜 계정 연동, 게시물 데이터, 분석 데이터
- **Standard (표준)**: 로그 데이터, 캐시 데이터, 임시 파일

#### 백업 주기
- **Critical**: 실시간 + 매일
- **Important**: 매일 + 매주
- **Standard**: 매주 + 매월

### 2. Convex 데이터베이스 백업

#### 자동 백업 설정

```bash
# Convex CLI를 통한 백업 스크립트
#!/bin/bash

BACKUP_DIR="/backups/convex"
DATE=$(date +%Y-%m-%d-%H-%M-%S)
DEPLOYMENT="prod:your-deployment"

# 백업 생성
npx convex export --deployment $DEPLOYMENT --output "$BACKUP_DIR/backup-$DATE.json"

# 압축
gzip "$BACKUP_DIR/backup-$DATE.json"

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "*.json.gz" -mtime +7 -delete

echo "Backup completed: backup-$DATE.json.gz"
```

#### 백업 스케줄링 (GitHub Actions)

```yaml
# .github/workflows/backup.yml
name: 🔄 Database Backup

on:
  schedule:
    # 매일 오전 3시 (UTC)
    - cron: '0 3 * * *'
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install Convex CLI
        run: npm install -g convex
        
      - name: Create Backup
        run: |
          npx convex export \
            --deployment ${{ secrets.CONVEX_DEPLOYMENT }} \
            --output backup-$(date +%Y-%m-%d).json
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}
          
      - name: Upload to S3
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
          
      - name: Sync to S3
        run: |
          aws s3 cp backup-$(date +%Y-%m-%d).json \
            s3://your-backup-bucket/convex/daily/
```

### 3. 파일 및 미디어 백업

#### S3 백업 전략

```bash
#!/bin/bash
# S3 백업 스크립트

AWS_PROFILE="backup"
SOURCE_BUCKET="your-media-bucket"
BACKUP_BUCKET="your-backup-bucket"
DATE=$(date +%Y-%m-%d)

# 전체 백업
aws s3 sync s3://$SOURCE_BUCKET s3://$BACKUP_BUCKET/full/$DATE/ \
  --delete --storage-class STANDARD_IA

# 증분 백업 (변경된 파일만)
aws s3 sync s3://$SOURCE_BUCKET s3://$BACKUP_BUCKET/incremental/$DATE/ \
  --exclude "*" --include "*.jpg" --include "*.png" --include "*.pdf" \
  --size-only --storage-class GLACIER

echo "Media backup completed: $DATE"
```

### 4. 설정 및 환경변수 백업

#### 환경변수 백업 스크립트

```bash
#!/bin/bash
# 환경변수 백업 (민감한 정보 제외)

BACKUP_FILE="config-backup-$(date +%Y-%m-%d).env"

cat > $BACKUP_FILE << EOF
# Application Configuration Backup
# Generated: $(date)

NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Database
CONVEX_DEPLOYMENT=your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_key
# CLERK_SECRET_KEY=[REDACTED]

# Payment
LEMONSQUEEZY_STORE_ID=your_store_id
# LEMONSQUEEZY_API_KEY=[REDACTED]

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project

EOF

echo "Configuration backup created: $BACKUP_FILE"
```

## 🚨 재해복구 계획

### 1. 재해 시나리오 분류

#### Level 1: 서비스 일시 중단
- **원인**: 코드 배포 실패, 일시적 API 장애
- **RTO**: 15분
- **RPO**: 0분
- **대응**: 즉시 롤백, Hot fix 배포

#### Level 2: 데이터베이스 장애
- **원인**: Convex 서비스 장애, 데이터 손상
- **RTO**: 2시간
- **RPO**: 24시간
- **대응**: 백업 복원, 대체 서비스 활성화

#### Level 3: 전체 시스템 장애
- **원인**: 플랫폼 전체 장애, 보안 사고
- **RTO**: 6시간
- **RPO**: 24시간
- **대응**: 완전 재구축, 백업에서 복원

### 2. 복구 절차

#### 데이터베이스 복구

```bash
# 1. 최신 백업 파일 확인
ls -la /backups/convex/ | head -10

# 2. 백업 파일 압축 해제
gunzip backup-YYYY-MM-DD-HH-MM-SS.json.gz

# 3. 새 Convex 배포 생성 (필요시)
npx convex deploy --create-deployment

# 4. 데이터 복원
npx convex import backup-YYYY-MM-DD-HH-MM-SS.json \
  --deployment new-deployment-name

# 5. 애플리케이션 환경변수 업데이트
# CONVEX_DEPLOYMENT=new-deployment-name
# NEXT_PUBLIC_CONVEX_URL=https://new-deployment.convex.cloud

# 6. 배포 및 테스트
vercel --prod
```

#### 애플리케이션 복구

```bash
# 1. 이전 버전으로 롤백
vercel rollback <deployment-id>

# 2. 또는 새로운 배포
git checkout <stable-commit>
vercel --prod

# 3. DNS 확인
nslookup your-domain.com

# 4. Health check 확인
curl -I https://your-domain.com/api/health
```

### 3. 복구 시간 목표 (RTO) & 복구 시점 목표 (RPO)

| 서비스 | RTO | RPO | 백업 주기 |
|--------|-----|-----|-----------|
| 웹 애플리케이션 | 15분 | 0분 | 실시간 |
| 데이터베이스 | 2시간 | 24시간 | 매일 |
| 파일 저장소 | 4시간 | 24시간 | 매일 |
| 설정 데이터 | 1시간 | 1주일 | 매주 |

## 🔄 데이터 복제 전략

### 1. Multi-Region 백업

#### 지역별 백업 분산

```bash
# 주 백업 지역: us-east-1
aws s3 sync /local/backup s3://backup-us-east-1/

# 보조 백업 지역: eu-west-1  
aws s3 sync /local/backup s3://backup-eu-west-1/ --region eu-west-1

# 아시아 백업 지역: ap-northeast-1
aws s3 sync /local/backup s3://backup-ap-northeast-1/ --region ap-northeast-1
```

### 2. 백업 무결성 검증

#### 자동 검증 스크립트

```bash
#!/bin/bash
# 백업 무결성 검증

BACKUP_FILE="$1"
TEST_DEPLOYMENT="test-recovery"

echo "백업 파일 검증 시작: $BACKUP_FILE"

# 1. 파일 무결성 확인
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 백업 파일을 찾을 수 없습니다"
    exit 1
fi

# 2. JSON 형식 검증
if ! jq empty "$BACKUP_FILE"; then
    echo "❌ 백업 파일이 유효한 JSON이 아닙니다"
    exit 1
fi

# 3. 테스트 복원
echo "🧪 테스트 환경에서 복원 테스트..."
npx convex import "$BACKUP_FILE" --deployment $TEST_DEPLOYMENT

# 4. 기본 쿼리 테스트
echo "🔍 데이터 무결성 확인..."
npx convex run --deployment $TEST_DEPLOYMENT users:list | head -5

# 5. 테스트 환경 정리
npx convex delete-deployment $TEST_DEPLOYMENT

echo "✅ 백업 검증 완료"
```

## 📋 비즈니스 연속성 계획

### 1. 중요 연락처 목록

```bash
# 긴급 연락처
DEVOPS_TEAM="devops@company.com"
CEO="ceo@company.com"
CTO="cto@company.com"

# 서비스 제공업체
VERCEL_SUPPORT="https://vercel.com/support"
CONVEX_SUPPORT="support@convex.dev"
CLERK_SUPPORT="support@clerk.dev"
```

### 2. 커뮤니케이션 계획

#### 사용자 커뮤니케이션

```markdown
# 서비스 중단 공지 템플릿

🚨 **서비스 점검 안내**

안녕하세요, HookLabs Elite 팀입니다.

현재 시스템 점검으로 인해 서비스 이용이 일시적으로 제한될 수 있습니다.

**점검 시간**: YYYY-MM-DD HH:MM ~ HH:MM (KST)
**영향 범위**: [전체 서비스 / 특정 기능]
**복구 예상 시간**: HH:MM

점검 완료 후 즉시 서비스가 정상화됩니다.
이용에 불편을 드려 죄송합니다.

실시간 상황은 status.hooklabs.io에서 확인하실 수 있습니다.
```

### 3. 상태 페이지 설정

#### Simple Status Page

```html
<!DOCTYPE html>
<html>
<head>
    <title>HookLabs Elite Status</title>
    <style>
        body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
        .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
        .operational { background: #d4edda; color: #155724; }
        .degraded { background: #fff3cd; color: #856404; }
        .outage { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <h1>🚀 HookLabs Elite Status</h1>
    
    <div class="status operational">
        ✅ Web Application - Operational
    </div>
    
    <div class="status operational">
        ✅ API Services - Operational  
    </div>
    
    <div class="status operational">
        ✅ Authentication - Operational
    </div>
    
    <div class="status operational">
        ✅ Payment System - Operational
    </div>
    
    <div class="status operational">
        ✅ AI Services - Operational
    </div>
    
    <p><small>Last updated: <span id="timestamp"></span></small></p>
    
    <script>
        document.getElementById('timestamp').textContent = new Date().toLocaleString();
        
        // 30초마다 상태 확인
        setInterval(async () => {
            try {
                const response = await fetch('https://your-app.vercel.app/api/health');
                const data = await response.json();
                updateStatus(data);
            } catch (error) {
                console.error('Status check failed:', error);
            }
        }, 30000);
        
        function updateStatus(health) {
            // 상태에 따른 UI 업데이트 로직
        }
    </script>
</body>
</html>
```

## 🧪 복구 테스트

### 월간 복구 테스트 절차

```bash
#!/bin/bash
# 월간 재해복구 테스트

echo "🧪 재해복구 테스트 시작 - $(date)"

# 1. 백업 파일 검증
echo "1️⃣ 백업 파일 검증 중..."
./scripts/verify-backup.sh

# 2. 테스트 환경 복원
echo "2️⃣ 테스트 환경 복원 중..."
TEST_DEPLOYMENT="disaster-recovery-test"
LATEST_BACKUP=$(ls -t /backups/convex/*.json | head -1)

npx convex import "$LATEST_BACKUP" --deployment $TEST_DEPLOYMENT

# 3. 기능 테스트
echo "3️⃣ 기능 테스트 실행 중..."
npm run test:integration

# 4. 성능 테스트
echo "4️⃣ 성능 테스트 실행 중..."
curl -o /dev/null -s -w "%{time_total}\n" \
  https://$TEST_DEPLOYMENT.convex.cloud/api/health

# 5. 정리
echo "5️⃣ 테스트 환경 정리 중..."
npx convex delete-deployment $TEST_DEPLOYMENT

echo "✅ 재해복구 테스트 완료 - $(date)"
```

## 📊 백업 모니터링

### 백업 상태 모니터링

```javascript
// 백업 상태 확인 스크립트
const checkBackupStatus = async () => {
    const today = new Date().toISOString().split('T')[0];
    const backupFile = `backup-${today}.json`;
    
    try {
        // S3에서 백업 파일 확인
        const response = await s3.headObject({
            Bucket: 'your-backup-bucket',
            Key: `convex/daily/${backupFile}`
        }).promise();
        
        const fileSize = response.ContentLength;
        const lastModified = response.LastModified;
        
        // 파일 크기가 너무 작으면 경고
        if (fileSize < 1024 * 1024) { // 1MB 미만
            await sendAlert('백업 파일 크기 이상', {
                file: backupFile,
                size: fileSize
            });
        }
        
        // 12시간 이상 오래된 백업이면 경고
        const hoursOld = (new Date() - lastModified) / (1000 * 60 * 60);
        if (hoursOld > 12) {
            await sendAlert('백업이 오래됨', {
                file: backupFile,
                hoursOld: Math.round(hoursOld)
            });
        }
        
        console.log(`✅ 백업 상태 정상: ${backupFile}`);
        
    } catch (error) {
        await sendAlert('백업 파일 누락', {
            file: backupFile,
            error: error.message
        });
    }
};
```

## 📱 긴급 대응 절차

### 1. 장애 감지

- 자동 모니터링 (Uptime Robot, Sentry)
- Health check 실패 알림
- 사용자 신고

### 2. 초기 대응 (5분 이내)

1. 장애 범위 파악
2. 긴급 대응팀 알림
3. 상태 페이지 업데이트
4. 임시 해결책 적용

### 3. 복구 작업 (30분 이내)

1. 근본 원인 분석
2. 백업에서 복원
3. 서비스 정상화 확인
4. 사용자 통지

### 4. 사후 조치 (24시간 이내)

1. 장애 보고서 작성
2. 재발 방지 대책 수립
3. 백업 시스템 점검
4. 프로세스 개선

## 📋 체크리스트

### 일일 체크리스트
- [ ] 백업 파일 생성 확인
- [ ] Health check 상태 확인
- [ ] 에러 로그 검토
- [ ] 모니터링 시스템 정상 작동 확인

### 주간 체크리스트
- [ ] 백업 파일 무결성 검증
- [ ] 복구 시나리오 검토
- [ ] 연락처 목록 업데이트
- [ ] 문서화 업데이트

### 월간 체크리스트
- [ ] 전체 재해복구 테스트 실행
- [ ] 백업 보관 정책 검토
- [ ] RTO/RPO 목표 달성 여부 확인
- [ ] 비즈니스 연속성 계획 업데이트

---

**⚠️ 중요**: 이 문서는 정기적으로 업데이트되어야 하며, 모든 팀원이 재해복구 절차를 숙지해야 합니다.