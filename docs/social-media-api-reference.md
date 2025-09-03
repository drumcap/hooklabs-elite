# 📚 소셜 미디어 플랫폼 API 레퍼런스

## 목차
- [Convex Functions](#convex-functions)
- [REST API Endpoints](#rest-api-endpoints)
- [WebSocket Events](#websocket-events)
- [Data Types](#data-types)
- [Error Codes](#error-codes)

---

## Convex Functions

### Personas API

#### `personas.create`
페르소나를 생성합니다.

**Arguments:**
```typescript
{
  name: string;
  role: string;
  tone: string;
  interests: string[];
  expertise: string[];
  avatar?: string;
  promptTemplate?: string;
  settings?: any;
}
```

**Returns:**
```typescript
{
  _id: Id<"personas">;
  _creationTime: number;
  ...personaData
}
```

**Example:**
```typescript
const persona = await ctx.runMutation(api.personas.create, {
  name: "Tech CEO",
  role: "스타트업 창업자",
  tone: "비전있고 열정적인",
  interests: ["AI", "스타트업", "혁신"],
  expertise: ["제품 개발", "팀 빌딩", "투자 유치"]
});
```

#### `personas.list`
사용자의 모든 페르소나를 조회합니다.

**Arguments:**
```typescript
{
  userId?: Id<"users">;  // 옵션, 기본값은 현재 사용자
}
```

**Returns:**
```typescript
Array<{
  _id: Id<"personas">;
  name: string;
  role: string;
  tone: string;
  interests: string[];
  expertise: string[];
  isActive: boolean;
  createdAt: string;
}>
```

#### `personas.update`
페르소나를 수정합니다.

**Arguments:**
```typescript
{
  personaId: Id<"personas">;
  updates: Partial<PersonaData>;
}
```

#### `personas.delete`
페르소나를 삭제합니다.

**Arguments:**
```typescript
{
  personaId: Id<"personas">;
}
```

#### `personas.getTemplates`
사전 정의된 페르소나 템플릿을 조회합니다.

**Returns:**
```typescript
Array<{
  id: string;
  name: string;
  role: string;
  tone: string;
  interests: string[];
  expertise: string[];
  description: string;
}>
```

---

### Social Posts API

#### `socialPosts.create`
새 게시물을 생성합니다.

**Arguments:**
```typescript
{
  personaId: Id<"personas">;
  originalContent: string;
  finalContent?: string;
  platform: ("twitter" | "threads")[];
  status?: "draft" | "scheduled" | "published";
  tags?: string[];
}
```

**Returns:**
```typescript
{
  _id: Id<"socialPosts">;
  _creationTime: number;
  userId: Id<"users">;
  personaId: Id<"personas">;
  originalContent: string;
  finalContent: string;
  platform: string[];
  status: string;
  createdAt: string;
}
```

#### `socialPosts.list`
게시물 목록을 조회합니다.

**Arguments:**
```typescript
{
  status?: "draft" | "scheduled" | "published" | "failed";
  platform?: "twitter" | "threads";
  personaId?: Id<"personas">;
  limit?: number;  // 기본값: 50
  cursor?: string;
}
```

**Returns:**
```typescript
{
  posts: Array<SocialPost>;
  nextCursor?: string;
}
```

#### `socialPosts.updateMetrics`
게시물의 메트릭을 업데이트합니다.

**Arguments:**
```typescript
{
  postId: Id<"socialPosts">;
  metrics: {
    views?: number;
    likes?: number;
    shares?: number;
    comments?: number;
  };
}
```

---

### Content Generation API

#### `contentGeneration.generateVariants`
AI를 사용하여 콘텐츠 변형을 생성합니다.

**Action Arguments:**
```typescript
{
  content: string;
  personaId: Id<"personas">;
  platform: ("twitter" | "threads")[];
  count?: number;  // 기본값: 5
  temperature?: number;  // 0.0-1.0, 기본값: 0.7
}
```

**Returns:**
```typescript
{
  variants: Array<{
    _id: Id<"postVariants">;
    content: string;
    score: number;
    scoreBreakdown: {
      engagement: number;
      virality: number;
      personaMatch: number;
      readability: number;
      trendAlignment: number;
    };
    aiModel: string;
    generatedAt: string;
  }>;
  creditsUsed: number;
}
```

**Example:**
```typescript
const result = await ctx.runAction(api.contentGeneration.generateVariants, {
  content: "우리 제품이 v2.0을 출시했습니다!",
  personaId: personaId,
  platform: ["twitter"],
  count: 5
});
```

#### `contentGeneration.improveContent`
기존 콘텐츠를 개선합니다.

**Action Arguments:**
```typescript
{
  content: string;
  improvementType: "clarity" | "engagement" | "professional" | "casual";
  personaId?: Id<"personas">;
}
```

#### `contentGeneration.suggestHashtags`
콘텐츠에 적합한 해시태그를 제안합니다.

**Action Arguments:**
```typescript
{
  content: string;
  platform: "twitter" | "threads";
  count?: number;  // 기본값: 5
}
```

**Returns:**
```typescript
{
  hashtags: string[];
  relevanceScores: number[];
}
```

---

### Scheduling API

#### `scheduledPosts.schedule`
게시물을 예약합니다.

**Arguments:**
```typescript
{
  postId: Id<"socialPosts">;
  variantId?: Id<"postVariants">;
  scheduledFor: string;  // ISO 8601
  timezone?: string;  // 기본값: "Asia/Seoul"
  platform: ("twitter" | "threads")[];
  accountIds: Id<"socialAccounts">[];
  retryOnFailure?: boolean;  // 기본값: true
  maxRetries?: number;  // 기본값: 3
}
```

**Returns:**
```typescript
{
  scheduledPostIds: Id<"scheduledPosts">[];
  scheduledFor: string;
  estimatedCredits: number;
}
```

#### `scheduledPosts.cancel`
예약된 게시물을 취소합니다.

**Arguments:**
```typescript
{
  scheduledPostId: Id<"scheduledPosts">;
}
```

#### `scheduledPosts.reschedule`
게시물을 재예약합니다.

**Arguments:**
```typescript
{
  scheduledPostId: Id<"scheduledPosts">;
  newScheduledFor: string;
}
```

#### `scheduledPosts.getUpcoming`
예정된 게시물 목록을 조회합니다.

**Arguments:**
```typescript
{
  platform?: "twitter" | "threads";
  accountId?: Id<"socialAccounts">;
  startDate?: string;
  endDate?: string;
  limit?: number;
}
```

---

### Social Accounts API

#### `socialAccounts.connectTwitter`
Twitter 계정을 연결합니다.

**Action Arguments:**
```typescript
{
  code: string;  // OAuth authorization code
  redirectUri: string;
}
```

**Returns:**
```typescript
{
  accountId: Id<"socialAccounts">;
  username: string;
  displayName: string;
  profileImage?: string;
}
```

#### `socialAccounts.connectThreads`
Threads 계정을 연결합니다.

**Action Arguments:**
```typescript
{
  accessToken: string;
  userId: string;
}
```

#### `socialAccounts.disconnect`
소셜 계정 연결을 해제합니다.

**Arguments:**
```typescript
{
  accountId: Id<"socialAccounts">;
}
```

#### `socialAccounts.refreshToken`
액세스 토큰을 갱신합니다.

**Action Arguments:**
```typescript
{
  accountId: Id<"socialAccounts">;
}
```

---

### Publishing API

#### `socialPublishing.publishToTwitter`
Twitter에 게시물을 발행합니다.

**Action Arguments:**
```typescript
{
  content: string;
  accountId: Id<"socialAccounts">;
  mediaUrls?: string[];
  replyToId?: string;  // 스레드 생성 시
  scheduledPostId?: Id<"scheduledPosts">;
}
```

**Returns:**
```typescript
{
  tweetId: string;
  url: string;
  publishedAt: string;
  metrics?: {
    impressions: number;
    engagements: number;
  };
}
```

#### `socialPublishing.publishToThreads`
Threads에 게시물을 발행합니다.

**Action Arguments:**
```typescript
{
  content: string;
  accountId: Id<"socialAccounts">;
  mediaUrls?: string[];
  mediaType?: "IMAGE" | "VIDEO";
  scheduledPostId?: Id<"scheduledPosts">;
}
```

#### `socialPublishing.deletePost`
발행된 게시물을 삭제합니다.

**Action Arguments:**
```typescript
{
  platform: "twitter" | "threads";
  postId: string;  // 플랫폼의 게시물 ID
  accountId: Id<"socialAccounts">;
}
```

---

### Analytics API

#### `analytics.getPostPerformance`
게시물 성과를 조회합니다.

**Arguments:**
```typescript
{
  postId?: Id<"socialPosts">;
  platform?: "twitter" | "threads";
  startDate?: string;
  endDate?: string;
  groupBy?: "day" | "week" | "month";
}
```

**Returns:**
```typescript
{
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  engagementRate: number;
  timeline: Array<{
    date: string;
    metrics: PostMetrics;
  }>;
}
```

#### `analytics.getPersonaPerformance`
페르소나별 성과를 분석합니다.

**Arguments:**
```typescript
{
  personaId: Id<"personas">;
  period?: "7d" | "30d" | "90d";
}
```

#### `analytics.getBestPostingTimes`
최적 게시 시간을 분석합니다.

**Returns:**
```typescript
{
  weekdays: {
    [key: string]: {
      hour: number;
      engagementScore: number;
    }[];
  };
  recommendations: string[];
}
```

---

## REST API Endpoints

### Authentication

#### POST `/api/auth/twitter`
Twitter OAuth 플로우를 시작합니다.

**Request:**
```json
{
  "redirectUri": "http://localhost:3000/api/auth/twitter/callback"
}
```

**Response:**
```json
{
  "authUrl": "https://twitter.com/i/oauth2/authorize?..."
}
```

#### POST `/api/auth/twitter/callback`
Twitter OAuth 콜백을 처리합니다.

**Query Parameters:**
- `code`: Authorization code
- `state`: State parameter

---

### Webhooks

#### POST `/api/webhooks/twitter`
Twitter 웹훅 이벤트를 처리합니다.

**Headers:**
```
X-Twitter-Signature: <signature>
```

**Body:**
```json
{
  "event_type": "tweet.created",
  "tweet": {
    "id": "1234567890",
    "text": "Hello World!",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## WebSocket Events

Convex는 자동으로 실시간 업데이트를 제공합니다.

### 구독 가능한 이벤트

#### `posts:created`
새 게시물이 생성될 때 발생합니다.

```typescript
useQuery(api.socialPosts.watchByUser);
```

#### `posts:published`
게시물이 발행될 때 발생합니다.

```typescript
useQuery(api.socialPosts.watchPublished);
```

#### `metrics:updated`
메트릭이 업데이트될 때 발생합니다.

```typescript
useQuery(api.analytics.watchMetrics, { postId });
```

---

## Data Types

### Core Types

```typescript
// 페르소나
type Persona = {
  _id: Id<"personas">;
  userId: Id<"users">;
  name: string;
  role: string;
  tone: string;
  interests: string[];
  expertise: string[];
  avatar?: string;
  isActive: boolean;
  promptTemplate?: string;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

// 소셜 게시물
type SocialPost = {
  _id: Id<"socialPosts">;
  userId: Id<"users">;
  personaId: Id<"personas">;
  originalContent: string;
  finalContent: string;
  platform: Platform[];
  status: PostStatus;
  publishedAt?: string;
  metrics?: PostMetrics;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

// 게시물 변형
type PostVariant = {
  _id: Id<"postVariants">;
  postId: Id<"socialPosts">;
  content: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  isSelected: boolean;
  aiModel: string;
  aiResponse?: string;
  generatedAt: string;
};

// 예약된 게시물
type ScheduledPost = {
  _id: Id<"scheduledPosts">;
  postId: Id<"socialPosts">;
  variantId?: Id<"postVariants">;
  scheduledFor: string;
  timezone: string;
  platform: Platform;
  accountId: Id<"socialAccounts">;
  status: ScheduleStatus;
  publishedAt?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
};

// 소셜 계정
type SocialAccount = {
  _id: Id<"socialAccounts">;
  userId: Id<"users">;
  platform: Platform;
  accountId: string;
  username: string;
  displayName: string;
  profileImage?: string;
  accessToken: string;  // 암호화됨
  refreshToken?: string;  // 암호화됨
  tokenExpiresAt?: string;
  isActive: boolean;
  lastSyncedAt: string;
  metrics?: AccountMetrics;
  createdAt: string;
  updatedAt: string;
};
```

### Enums

```typescript
type Platform = "twitter" | "threads";

type PostStatus = "draft" | "scheduled" | "published" | "failed";

type ScheduleStatus = "pending" | "processing" | "published" | "failed";

type ImprovementType = "clarity" | "engagement" | "professional" | "casual";
```

### Metrics Types

```typescript
type PostMetrics = {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  clicks?: number;
  profileVisits?: number;
};

type ScoreBreakdown = {
  engagement: number;      // 0-100
  virality: number;        // 0-100
  personaMatch: number;    // 0-100
  readability: number;     // 0-100
  trendAlignment: number;  // 0-100
};

type AccountMetrics = {
  followers: number;
  following: number;
  posts: number;
  engagement_rate: number;
};
```

---

## Error Codes

### Convex Function Errors

| Code | Description | Resolution |
|------|-------------|------------|
| `PERSONA_NOT_FOUND` | 페르소나를 찾을 수 없음 | 페르소나 ID 확인 |
| `INSUFFICIENT_CREDITS` | 크레딧 부족 | 크레딧 충전 필요 |
| `INVALID_PLATFORM` | 지원하지 않는 플랫폼 | twitter, threads만 가능 |
| `ACCOUNT_NOT_CONNECTED` | 계정이 연결되지 않음 | 계정 연결 필요 |
| `TOKEN_EXPIRED` | 액세스 토큰 만료 | 토큰 갱신 필요 |
| `RATE_LIMIT_EXCEEDED` | API 요청 한도 초과 | 잠시 후 재시도 |
| `CONTENT_TOO_LONG` | 콘텐츠 길이 초과 | 플랫폼 제한 확인 |
| `DUPLICATE_SCHEDULE` | 중복된 스케줄 | 기존 스케줄 확인 |
| `AI_GENERATION_FAILED` | AI 생성 실패 | 재시도 또는 지원 문의 |
| `PUBLISH_FAILED` | 발행 실패 | 에러 메시지 확인 |

### HTTP Status Codes

| Status | Description |
|--------|-------------|
| 200 | 성공 |
| 201 | 생성됨 |
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 찾을 수 없음 |
| 429 | 너무 많은 요청 |
| 500 | 서버 오류 |

### Error Response Format

```json
{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Not enough credits to perform this action",
    "details": {
      "required": 10,
      "available": 5
    }
  }
}
```

---

## Rate Limits

### API Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Content Generation | 100 requests | 1 hour |
| Publishing | 50 requests | 1 hour |
| Analytics | 200 requests | 1 hour |
| General API | 1000 requests | 1 hour |

### Platform Limits

| Platform | Daily Posts | Character Limit |
|----------|------------|-----------------|
| Twitter | 300 | 280 |
| Threads | 100 | 500 |

---

## Code Examples

### Complete Publishing Flow

```typescript
import { api } from "@/convex/_generated/api";
import { useMutation, useAction } from "convex/react";

function PublishingFlow() {
  const createPost = useMutation(api.socialPosts.create);
  const generateVariants = useAction(api.contentGeneration.generateVariants);
  const schedulePost = useMutation(api.scheduledPosts.schedule);
  
  const publishContent = async () => {
    // 1. 게시물 생성
    const post = await createPost({
      personaId: selectedPersona,
      originalContent: content,
      platform: ["twitter", "threads"]
    });
    
    // 2. AI 변형 생성
    const { variants } = await generateVariants({
      content: content,
      personaId: selectedPersona,
      platform: ["twitter", "threads"]
    });
    
    // 3. 최고 점수 변형 선택
    const bestVariant = variants.reduce((a, b) => 
      a.score > b.score ? a : b
    );
    
    // 4. 게시물 예약
    const scheduled = await schedulePost({
      postId: post._id,
      variantId: bestVariant._id,
      scheduledFor: selectedDate.toISOString(),
      platform: ["twitter", "threads"],
      accountIds: selectedAccounts
    });
    
    return scheduled;
  };
}
```

### Real-time Analytics

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function RealtimeAnalytics({ postId }: { postId: Id<"socialPosts"> }) {
  // 실시간 메트릭 구독
  const metrics = useQuery(api.analytics.watchMetrics, { postId });
  
  // 자동 업데이트되는 UI
  return (
    <div>
      <h3>실시간 성과</h3>
      <div>조회수: {metrics?.views || 0}</div>
      <div>좋아요: {metrics?.likes || 0}</div>
      <div>공유: {metrics?.shares || 0}</div>
      <div>참여율: {metrics?.engagementRate || 0}%</div>
    </div>
  );
}
```

---

## Migration Guide

### From v0.x to v1.0

```typescript
// Old API (deprecated)
const post = await createPost(content, persona);

// New API
const post = await ctx.runMutation(api.socialPosts.create, {
  originalContent: content,
  personaId: persona._id,
  platform: ["twitter"]
});
```

---

## Support

### API Support
- Email: api@hooklabs.com
- Discord: #api-support
- Documentation: https://docs.hooklabs.com/api

### Rate Limit Increases
엔터프라이즈 요금제로 업그레이드하여 더 높은 한도를 받으세요.

---

*Last Updated: 2024-01-XX*
*API Version: 1.0.0*