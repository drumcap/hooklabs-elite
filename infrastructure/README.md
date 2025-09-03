# HookLabs Elite 클라우드 인프라

## 📋 개요

HookLabs Elite 소셜 미디어 자동화 플랫폼을 위한 확장 가능하고 비용 효율적인 클라우드 인프라입니다.

### 주요 특징
- 🚀 자동 스케일링 (100명 → 1000명 동시 사용자)
- 💰 비용 최적화 (37% 절감)
- 🌍 글로벌 CDN 및 멀티 리전 지원
- 🔒 엔터프라이즈급 보안
- 📊 실시간 모니터링 및 알림
- 🔄 자동 백업 및 재해 복구

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                         사용자                               │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    CloudFront CDN                           │
│                  (글로벌 엣지 네트워크)                       │
└─────────────────────────────────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                              ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│      Vercel (Next.js)    │    │        S3 (정적)          │
│      - SSR/SSG           │    │      - 이미지/자산        │
│      - Edge Functions    │    │      - 백업              │
└──────────────────────────┘    └──────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Load Balancer                │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   ECS Fargate (Auto Scaling)                │
│                   - API 서버 (Spot 인스턴스)                 │
└─────────────────────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Convex    │    │  Upstash     │    │   외부 API   │
│  (실시간 DB) │    │   Redis      │    │  - Clerk     │
└──────────────┘    └──────────────┘    │  - Lemon     │
                                         │  - Gemini    │
                                         └──────────────┘
```

## 🚀 빠른 시작

### 사전 요구사항

```bash
# 필수 도구 설치
brew install terraform awscli

# AWS 자격 증명 설정
aws configure

# 환경 변수 설정
export TF_VAR_vercel_api_token="your-vercel-token"
export TF_VAR_cloudflare_api_token="your-cloudflare-token"
export TF_VAR_upstash_email="your-email"
export TF_VAR_upstash_api_key="your-upstash-key"
```

### 배포

```bash
# 1. 초기화
./deploy.sh production init

# 2. 계획 검토
./deploy.sh production plan

# 3. 인프라 배포
./deploy.sh production apply

# 4. 출력 확인
./deploy.sh production output
```

## 📁 프로젝트 구조

```
infrastructure/
├── terraform/
│   ├── main.tf                 # 메인 구성
│   ├── variables.tf            # 변수 정의
│   ├── production.tfvars       # 프로덕션 환경 변수
│   ├── staging.tfvars          # 스테이징 환경 변수
│   └── modules/
│       ├── networking/         # VPC, 서브넷, 라우팅
│       ├── cdn/               # CloudFront, WAF
│       ├── redis/             # 캐싱 레이어
│       ├── autoscaling/       # ECS, Fargate, ALB
│       ├── monitoring/        # CloudWatch, X-Ray
│       ├── security/          # IAM, KMS, GuardDuty
│       └── backup/            # 백업 및 재해 복구
├── deploy.sh                   # 배포 스크립트
├── OPTIMIZATION_REPORT.md      # 최적화 보고서
└── README.md                   # 이 파일
```

## 💰 비용 분석

### 월간 예상 비용 (프로덕션)

| 서비스 | 비용 | 설명 |
|--------|------|------|
| Vercel Pro | $20 | Next.js 호스팅 |
| Convex Pro | $25 | 실시간 데이터베이스 |
| CloudFront | $50 | CDN 및 대역폭 |
| Fargate | $60 | 컨테이너 실행 (Spot) |
| Upstash Redis | $30 | 캐싱 레이어 |
| ALB | $20 | 로드 밸런서 |
| 기타 | $5 | S3, 로그, 모니터링 |
| **총계** | **$210** | 최적화 후 |

### 비용 절감 전략

1. **Fargate Spot**: 80% 워크로드를 Spot으로 처리 (70% 절감)
2. **예약 인스턴스**: 1년 약정 시 30% 할인
3. **자동 스케일링**: 야간 50% 축소
4. **S3 Intelligent-Tiering**: 자동 스토리지 최적화
5. **CloudFront 압축**: 대역폭 50% 절감

## 🔧 환경별 설정

### Production
- 멀티 AZ 배포
- 자동 백업 (일/주/월)
- WAF 및 DDoS 보호
- 상세 모니터링
- 99.99% 가용성

### Staging
- 단일 AZ
- 일일 백업
- 기본 모니터링
- Spot 인스턴스 100%
- 비용 최적화 우선

### Development
- 최소 리소스
- 프리 티어 활용
- 로컬 개발 우선

## 📊 모니터링

### CloudWatch 대시보드
- 실시간 메트릭
- 사용자 정의 알람
- 로그 인사이트
- 비용 추적

### 알림 임계값
```yaml
CPU 사용률: >80%
메모리 사용률: >85%
API 응답 시간: >2초
5xx 오류: >10개/5분
월간 비용: >$500
```

## 🔒 보안

### 구현된 보안 기능
- 🔐 모든 데이터 암호화 (전송/저장)
- 🛡️ WAF 규칙 (SQL 인젝션, XSS 방지)
- 🔍 GuardDuty 위협 탐지
- 📝 CloudTrail 감사 로깅
- 🔑 Secrets Manager 시크릿 관리
- 🔄 자동 시크릿 로테이션

## 🔄 백업 및 복구

### 백업 전략
- **RTO**: 30분 (복구 시간 목표)
- **RPO**: 5분 (복구 시점 목표)

### 백업 스케줄
- 일일: 30일 보관
- 주간: 90일 보관 (프로덕션)
- 월간: 1년 보관 (프로덕션)

## 🚨 장애 대응

### 자동 복구
1. 헬스 체크 실패 → 자동 재시작
2. AZ 장애 → 자동 페일오버
3. 리전 장애 → 수동 페일오버 (30분)

### 수동 복구 절차
```bash
# 1. 백업에서 복구
terraform apply -var-file=production.tfvars -target=module.backup

# 2. 보조 리전 활성화
terraform apply -var-file=production.tfvars -var="enable_multi_region=true"

# 3. DNS 전환
terraform apply -var-file=production.tfvars -target=module.cdn
```

## 📈 성능 최적화

### 구현된 최적화
- HTTP/3 지원
- Brotli 압축
- 이미지 자동 최적화 (WebP)
- 캐시 워밍
- 프리페치/프리로드

### 성능 목표
```yaml
First Contentful Paint: <1.8초
Time to Interactive: <3.9초
Cumulative Layout Shift: <0.1
Core Web Vitals: 모두 녹색
```

## 🛠️ 유지보수

### 정기 작업
- [ ] 주간: 비용 리뷰
- [ ] 월간: 보안 패치
- [ ] 분기: 성능 튜닝
- [ ] 반기: DR 테스트

### 모니터링 체크리스트
- [ ] CloudWatch 알람 확인
- [ ] 비용 이상 징후
- [ ] 보안 알림
- [ ] 백업 검증

## 📚 추가 리소스

- [Terraform 문서](https://www.terraform.io/docs)
- [AWS Well-Architected](https://aws.amazon.com/architecture/well-architected/)
- [Vercel 문서](https://vercel.com/docs)
- [Convex 문서](https://docs.convex.dev)

## 🤝 기여

인프라 개선 제안은 언제든 환영합니다!

1. 이슈 생성
2. 브랜치 생성 (`feature/improvement`)
3. 변경사항 커밋
4. PR 생성

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.