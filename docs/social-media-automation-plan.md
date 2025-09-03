# 🐦 트위터/쓰레드 자동 발행 SaaS 플랫폼 개발 계획

## 📋 프로젝트 개요
현재 HookLabs Elite 프로젝트 기반으로 소셜 미디어 자동 발행 플랫폼을 구축합니다.

## 🎯 핵심 기능 요구사항

### 1. 페르소나 관리 시스템
- **CRUD 기능**: 페르소나 추가/수정/삭제
- **페르소나 속성**: 이름, 역할(예: SaaS 대표), 톤&매너, 관심사, 전문 분야
- **템플릿**: 사전 정의된 페르소나 템플릿 제공

### 2. AI 기반 콘텐츠 생성 (Gemini)
- **기초 글 입력**: 사용자가 아이디어나 초안 제공
- **Variant 생성**: 3-5개의 다양한 버전 자동 생성
- **점수화 시스템**: 
  - 참여도 예측 점수
  - 바이럴 가능성 점수
  - 페르소나 일치도 점수

### 3. 크레딧 기반 과금 시스템
- **크레딧 소비**: 
  - AI 생성당 10 크레딧
  - 게시물당 5 크레딧
  - 자동 리서치당 20 크레딧
- **크레딧 패키지**: 100, 500, 1000, 5000 크레딧
- **구독 플랜**: 월간 크레딧 충전

### 4. 스케줄링 시스템
- **멀티 플랫폼**: Twitter, Threads 동시 발행
- **일정 관리**: 캘린더 UI로 예약 관리
- **최적 시간 추천**: AI 기반 최적 발행 시간 제안

### 5. 자동 콘텐츠 수집 (향후)
- **RSS 피드 연동**: 관련 뉴스 자동 수집
- **트렌드 분석**: 실시간 트렌드 기반 주제 추천
- **자동 초안 생성**: 수집된 내용 기반 자동 작성

## 🏗️ 기술 스택 계획

### 백엔드 (Convex)
```
새로운 테이블:
- personas: 페르소나 정보
- socialPosts: 게시물 데이터
- postVariants: AI 생성 변형
- scheduledPosts: 예약된 게시물
- socialAccounts: 연결된 소셜 계정
- contentSources: RSS/웹 소스
- aiGenerations: AI 생성 이력
```

### API 통합
- **Gemini API**: 콘텐츠 생성 및 분석
- **Twitter API v2**: 트윗 발행
- **Threads API**: 쓰레드 게시
- **Cron Jobs**: 예약 발행 처리

### 프론트엔드 컴포넌트
```
components/
├── personas/
│   ├── PersonaManager.tsx
│   ├── PersonaCard.tsx
│   └── PersonaForm.tsx
├── content/
│   ├── ContentEditor.tsx
│   ├── VariantGenerator.tsx
│   └── VariantScorer.tsx
├── scheduling/
│   ├── PostScheduler.tsx
│   ├── CalendarView.tsx
│   └── TimeOptimizer.tsx
├── social/
│   ├── AccountConnector.tsx
│   ├── PostPreview.tsx
│   └── PublishStatus.tsx
└── analytics/
    ├── PostAnalytics.tsx
    └── EngagementChart.tsx
```

## 📊 데이터베이스 스키마 확장

### personas 테이블
```typescript
personas: defineTable({
  userId: v.id("users"),
  name: v.string(),
  role: v.string(), // "SaaS 창업자", "마케터", "개발자" 등
  tone: v.string(), // "전문적", "친근한", "유머러스" 등
  interests: v.array(v.string()),
  expertise: v.array(v.string()),
  avatar: v.optional(v.string()),
  isActive: v.boolean(),
  settings: v.optional(v.any()), // 추가 설정
  createdAt: v.string(),
  updatedAt: v.string(),
})
```

### socialPosts 테이블
```typescript
socialPosts: defineTable({
  userId: v.id("users"),
  personaId: v.id("personas"),
  content: v.string(),
  platform: v.array(v.string()), // ["twitter", "threads"]
  status: v.string(), // "draft", "scheduled", "published", "failed"
  publishedAt: v.optional(v.string()),
  metrics: v.optional(v.object({
    views: v.number(),
    likes: v.number(),
    retweets: v.number(),
    replies: v.number(),
  })),
  tags: v.array(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
```

### postVariants 테이블
```typescript
postVariants: defineTable({
  postId: v.id("socialPosts"),
  content: v.string(),
  score: v.number(), // 0-100
  scoreBreakdown: v.object({
    engagement: v.number(),
    virality: v.number(),
    personaMatch: v.number(),
    readability: v.number(),
  }),
  isSelected: v.boolean(),
  geminiModel: v.string(),
  generatedAt: v.string(),
})
```

### scheduledPosts 테이블
```typescript
scheduledPosts: defineTable({
  postId: v.id("socialPosts"),
  variantId: v.id("postVariants"),
  scheduledFor: v.string(),
  platform: v.string(),
  status: v.string(), // "pending", "processing", "published", "failed"
  publishedAt: v.optional(v.string()),
  error: v.optional(v.string()),
  retryCount: v.number(),
  createdAt: v.string(),
})
```

### socialAccounts 테이블
```typescript
socialAccounts: defineTable({
  userId: v.id("users"),
  platform: v.string(), // "twitter", "threads"
  accountId: v.string(),
  username: v.string(),
  displayName: v.string(),
  profileImage: v.optional(v.string()),
  accessToken: v.string(), // 암호화 필요
  refreshToken: v.optional(v.string()), // 암호화 필요
  tokenExpiresAt: v.optional(v.string()),
  isActive: v.boolean(),
  lastSyncedAt: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
})
```

### aiGenerations 테이블
```typescript
aiGenerations: defineTable({
  userId: v.id("users"),
  postId: v.id("socialPosts"),
  prompt: v.string(),
  model: v.string(),
  creditsUsed: v.number(),
  generationTime: v.number(), // milliseconds
  metadata: v.optional(v.any()),
  createdAt: v.string(),
})
```

## 🔐 보안 고려사항
- OAuth 2.0 소셜 계정 연동
- 암호화된 토큰 저장 (AES-256)
- Rate limiting per user (분당 10 요청)
- Content moderation (부적절한 콘텐츠 필터링)
- GDPR 준수 (개인정보 처리)

## 📈 구현 단계

### Phase 1: 기본 구조 (Day 1-2)
1. Convex 스키마 확장
2. 페르소나 CRUD 구현
3. 기본 UI 레이아웃
4. 네비게이션 구조

### Phase 2: AI 통합 (Day 3-4)
1. Gemini API 연동
2. Variant 생성 로직
3. 점수화 알고리즘
4. 프롬프트 엔지니어링

### Phase 3: 소셜 연동 (Day 5-6)
1. Twitter OAuth 설정
2. Threads API 연동
3. 발행 로직 구현
4. 에러 핸들링

### Phase 4: 스케줄링 (Day 7)
1. Cron job 설정 (Convex scheduled functions)
2. 캘린더 UI (React Big Calendar)
3. 예약 발행 시스템
4. 시간대 처리

### Phase 5: 크레딧 시스템 (Day 8)
1. 크레딧 차감 로직
2. Lemon Squeezy 통합
3. 사용량 추적
4. 크레딧 구매 플로우

## 🎨 UI/UX 디자인

### 대시보드
- 오늘의 예약 게시물
- 크레딧 잔액 위젯
- 최근 게시물 성과
- 빠른 작성 버튼

### 콘텐츠 에디터
- Split view (원본/변형)
- 실시간 문자 수 카운트
- 플랫폼별 프리뷰
- 페르소나 선택 드롭다운

### 캘린더 뷰
- 월간/주간/일간 보기
- 드래그 앤 드롭 스케줄링
- 색상별 플랫폼 구분
- 빠른 편집 모달

### 분석 페이지
- 참여도 차트 (Line/Bar)
- 최적 발행 시간 히트맵
- 인기 해시태그 클라우드
- 성과 비교 테이블

## 🚀 예상 결과물

### 사용자 워크플로우
1. **페르소나 선택**: 드롭다운에서 페르소나 선택 또는 새로 생성
2. **초안 작성**: 기본 아이디어나 주제 입력 (최소 50자)
3. **AI 변형 생성**: "Generate Variants" 버튼 클릭 → 5개 버전 생성
4. **점수 확인 및 선택**: 각 변형의 점수 확인 후 최적 버전 선택
5. **스케줄 설정**: 캘린더에서 날짜/시간 선택 또는 "최적 시간" 자동 설정
6. **발행 확인**: 예약 완료 및 크레딧 차감 확인

### 주요 기능 특징
- **실시간 동기화**: Convex를 통한 실시간 상태 업데이트
- **멀티 계정 지원**: 여러 Twitter/Threads 계정 관리
- **A/B 테스팅**: 동일 콘텐츠의 다른 버전 성과 비교
- **팀 협업**: 팀원 초대 및 권한 관리
- **API 접근**: 외부 도구 연동을 위한 REST API

## 💰 수익 모델

### 크레딧 패키지
- Starter: 100 크레딧 ($9)
- Growth: 500 크레딧 ($39)
- Professional: 1000 크레딧 ($69)
- Enterprise: 5000 크레딧 ($299)

### 구독 플랜
- Free: 월 10 크레딧
- Basic: 월 100 크레딧 + 기본 분석 ($19/월)
- Pro: 월 500 크레딧 + 고급 분석 + API ($49/월)
- Business: 무제한 크레딧 + 팀 기능 ($199/월)

## 🔄 향후 확장 계획

### Phase 6: 자동화 (Month 2)
- RSS 피드 통합
- Google Alerts 연동
- 자동 해시태그 추천
- 트렌드 기반 주제 제안

### Phase 7: 고급 분석 (Month 3)
- 경쟁사 분석
- 센티먼트 분석
- 팔로워 성장 추적
- ROI 계산기

### Phase 8: 확장 플랫폼 (Month 4)
- LinkedIn 지원
- Instagram 지원
- TikTok 지원
- YouTube Community 지원

## 📝 기술 문서 참고

### API 문서
- [Gemini API](https://ai.google.dev/docs)
- [Twitter API v2](https://developer.twitter.com/en/docs/twitter-api)
- [Threads API](https://developers.facebook.com/docs/threads)
- [Convex Scheduled Functions](https://docs.convex.dev/scheduling/scheduled-functions)

### 라이브러리
- React Big Calendar: 스케줄링 UI
- Recharts: 차트 및 분석
- React Hook Form: 폼 관리
- Zod: 스키마 검증
- Date-fns: 날짜 처리

## ✅ 체크리스트

### 개발 전 준비
- [ ] Gemini API 키 발급
- [ ] Twitter Developer 계정 생성
- [ ] Threads/Instagram 앱 등록
- [ ] Convex 프로젝트 설정
- [ ] 환경 변수 설정

### MVP 필수 기능
- [ ] 사용자 인증 (Clerk)
- [ ] 페르소나 CRUD
- [ ] AI 콘텐츠 생성
- [ ] 기본 스케줄링
- [ ] 크레딧 시스템
- [ ] Twitter 발행
- [ ] 기본 대시보드

### 추가 기능
- [ ] Threads 발행
- [ ] 고급 분석
- [ ] 팀 협업
- [ ] API 제공
- [ ] 자동화 기능

이 계획서는 지속적으로 업데이트되며, 개발 진행 상황에 따라 조정될 수 있습니다.