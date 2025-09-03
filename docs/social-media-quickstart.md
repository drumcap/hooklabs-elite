# 🚀 소셜 미디어 자동화 플랫폼 - 빠른 시작 가이드

## 5분 안에 시작하기

### 1️⃣ 환경 설정 (2분)

#### 필수 API 키 발급
1. **Gemini API**
   - [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
   - API 키 생성
   - `.env.local`에 추가: `GEMINI_API_KEY=your_key`

2. **Twitter API**
   - [Twitter Developer Portal](https://developer.twitter.com) 접속
   - App 생성 → OAuth 2.0 설정
   - Client ID와 Secret 복사
   - `.env.local`에 추가:
     ```
     TWITTER_CLIENT_ID=your_id
     TWITTER_CLIENT_SECRET=your_secret
     ```

3. **Threads API** (선택)
   - [Meta for Developers](https://developers.facebook.com) 접속
   - 앱 생성 → Threads API 추가
   - App ID와 Secret 복사

### 2️⃣ 프로젝트 실행 (1분)

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (터미널 1)
npm run dev

# Convex 개발 서버 실행 (터미널 2)
npx convex dev
```

브라우저에서 http://localhost:3000 접속

### 3️⃣ 첫 게시물 발행하기 (2분)

#### Step 1: 페르소나 생성
1. 좌측 메뉴 → "Social Media" → "Personas"
2. "Create Persona" 클릭
3. 템플릿 선택 (예: "SaaS Founder")
4. Save

#### Step 2: 계정 연결
1. "Accounts" 탭으로 이동
2. "Connect Twitter" 클릭
3. OAuth 인증 완료

#### Step 3: 콘텐츠 생성
1. "Compose" 탭 이동
2. 페르소나 선택
3. 아래 예시 입력:
   ```
   우리 제품이 ProductHunt에서 
   오늘의 제품 1위를 달성했습니다! 🚀
   ```
4. "Generate Variants" 클릭
5. 마음에 드는 변형 선택

#### Step 4: 발행
1. "Publish Now" 또는 시간 선택
2. "Schedule Post" 클릭
3. 완료! 🎉

---

## 📱 주요 기능 사용법

### AI 페르소나 활용하기

#### 제공되는 템플릿
| 페르소나 | 특징 | 적합한 콘텐츠 |
|---------|------|--------------|
| SaaS 창업자 | 비전 있고 열정적 | 제품 업데이트, 비전 공유 |
| 콘텐츠 마케터 | 데이터 기반, 전략적 | 마케팅 팁, 사례 연구 |
| 테크 인플루언서 | 트렌디, 전문적 | 기술 트렌드, 리뷰 |
| 개발자 애드보케이트 | 기술적, 도움되는 | 코딩 팁, 튜토리얼 |

#### 커스텀 페르소나 만들기
```javascript
{
  name: "내 브랜드 보이스",
  role: "스타트업 CEO",
  tone: "친근하면서도 전문적인",
  interests: ["AI", "스타트업", "프로덕티비티"],
  expertise: ["SaaS", "B2B 마케팅", "제품 개발"]
}
```

### 콘텐츠 최적화 점수 이해하기

#### 점수 항목 (0-100)
- **참여도**: 좋아요, 댓글 유도 가능성
- **바이럴성**: 공유/리트윗 가능성
- **페르소나 일치도**: 설정한 페르소나와 얼마나 일치하는지
- **가독성**: 읽기 쉬운 정도
- **트렌드 적합도**: 현재 트렌드와 관련성

#### 좋은 점수 기준
- 종합 80점 이상: 우수
- 종합 60-79점: 양호
- 종합 60점 미만: 개선 필요

### 스케줄링 전략

#### 최적 발행 시간 (한국 기준)
- **Twitter**: 오전 8-9시, 오후 12-1시, 저녁 7-9시
- **Threads**: 오전 7-9시, 오후 5-7시

#### 주간 발행 계획 예시
```
월요일: 주간 목표 공유
화요일: 교육 콘텐츠
수요일: 제품 업데이트
목요일: 커뮤니티 참여
금요일: 주간 회고
```

---

## 💰 크레딧 시스템

### 크레딧 사용량
| 작업 | 크레딧 |
|-----|--------|
| AI 변형 생성 | 10 |
| 게시물 발행 | 5 |
| 자동 리서치 (예정) | 20 |

### 크레딧 절약 팁
1. 한 번에 여러 플랫폼 선택하여 발행
2. 변형 생성 전 초안 다듬기
3. 재사용 가능한 콘텐츠 템플릿 만들기

---

## 🔧 문제 해결

### 일반적인 문제

#### "AI 변형이 생성되지 않습니다"
```bash
# 1. API 키 확인
echo $GEMINI_API_KEY

# 2. Convex 함수 로그 확인
npx convex logs

# 3. 크레딧 잔액 확인 (대시보드)
```

#### "계정 연결이 실패합니다"
1. Callback URL 확인:
   - Twitter: `http://localhost:3000/api/auth/twitter/callback`
   - Threads: `http://localhost:3000/api/auth/threads/callback`
2. API 키와 Secret 재확인
3. OAuth 앱 설정에서 권한 확인

#### "게시물이 발행되지 않습니다"
1. 계정 연결 상태 확인 (Accounts 페이지)
2. 스케줄 시간이 과거가 아닌지 확인
3. 플랫폼 API 상태 확인

### 디버깅 명령어

```bash
# Convex 로그 실시간 확인
npx convex logs --follow

# 특정 함수 로그만 보기
npx convex logs --function socialPublishing

# 데이터베이스 상태 확인
npx convex dashboard
```

---

## 📚 추가 리소스

### 문서
- [전체 구현 문서](./social-media-platform-implementation.md)
- [API 레퍼런스](./api-reference.md)
- [보안 가이드](./security-architecture.md)

### 예제 코드

#### 프로그래매틱 게시물 발행
```typescript
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

function PublishButton() {
  const publish = useMutation(api.socialPosts.create);
  
  const handlePublish = async () => {
    await publish({
      content: "Hello World! 🚀",
      personaId: "persona_123",
      platforms: ["twitter", "threads"],
      scheduledFor: new Date().toISOString()
    });
  };
  
  return <button onClick={handlePublish}>Publish</button>;
}
```

#### 크레딧 잔액 확인
```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function CreditBalance() {
  const balance = useQuery(api.credits.getBalance);
  
  return (
    <div>
      남은 크레딧: {balance?.availableCredits || 0}
    </div>
  );
}
```

---

## 🎯 다음 단계

### 초급 사용자
1. ✅ 3가지 다른 페르소나 만들어보기
2. ✅ 일주일 콘텐츠 미리 스케줄링
3. ✅ Analytics에서 성과 확인

### 중급 사용자
1. 📈 A/B 테스트로 최적 페르소나 찾기
2. 📈 플랫폼별 최적화 전략 수립
3. 📈 자동화 워크플로우 구축

### 고급 사용자
1. 🚀 API를 활용한 커스텀 통합
2. 🚀 팀 협업 워크플로우 구축
3. 🚀 고급 분석 대시보드 커스터마이징

---

## 💬 지원

### 도움이 필요하신가요?
- 📧 이메일: support@hooklabs.com
- 💬 Discord: [커뮤니티 참여](https://discord.gg/hooklabs)
- 📖 문서: [docs.hooklabs.com](https://docs.hooklabs.com)

### 버그 리포트
GitHub Issues: [github.com/hooklabs/issues](https://github.com/hooklabs/issues)

---

*Happy Publishing! 🚀*