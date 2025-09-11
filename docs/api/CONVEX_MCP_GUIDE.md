# Convex MCP 연결 및 사용 가이드

Convex MCP를 사용하여 프로젝트의 Convex 환경에 연결하고 관리하는 방법을 설명합니다.

## 📊 현재 프로젝트 상태

✅ **Convex MCP가 이미 연결되어 있습니다!**

- **Deployment**: `neighborly-guineapig-830`
- **URL**: `https://neighborly-guineapig-830.convex.cloud`
- **Dashboard**: `https://dashboard.convex.dev/d/neighborly-guineapig-830`
- **Team**: moonklabs
- **Project**: hooklabs

## 🔗 Convex MCP 연결 방법

### 1. MCP 연결 확인

```bash
# Claude Code CLI에서 MCP 연결 상태 확인
/mcp

# 연결 성공 시 출력: "Authentication successful. Connected to convex."
```

### 2. 프로젝트 디렉토리 지정

모든 Convex MCP 명령에서 `projectDir` 파라미터 사용:
```typescript
{
  "projectDir": "/Users/drumcap/workspace/hooklabs-elite"
}
```

### 3. Deployment Selector 획득

```typescript
// status 명령으로 deployment 정보 확인
mcp__convex__status({ projectDir: "/path/to/project" })

// 결과에서 deploymentSelector 사용
"deploymentSelector": "ownDev:eyJwcm9qZWN0RGlyIjoiL1VzZXJzL2RydW1jYXAvd29ya3NwYWNlL2hvb2tsYWJzLWVsaXRlIiwiZGVwbG95bWVudCI6eyJraW5kIjoib3duRGV2In19"
```

## 🛠️ Convex MCP 주요 기능

### 1. 프로젝트 상태 확인

```typescript
mcp__convex__status({ 
  projectDir: "/Users/drumcap/workspace/hooklabs-elite" 
})
```

**응답 예시:**
```json
{
  "availableDeployments": [{
    "kind": "ownDev",
    "deploymentSelector": "ownDev:...",
    "url": "https://neighborly-guineapig-830.convex.cloud",
    "dashboardUrl": "https://dashboard.convex.dev/d/neighborly-guineapig-830"
  }]
}
```

### 2. 환경 변수 관리

#### 환경 변수 목록 조회
```typescript
mcp__convex__envList({ 
  deploymentSelector 
})
```

#### 특정 환경 변수 조회
```typescript
mcp__convex__envGet({ 
  deploymentSelector, 
  name: "LEMONSQUEEZY_WEBHOOK_SECRET" 
})
```

#### 환경 변수 설정
```typescript
mcp__convex__envSet({ 
  deploymentSelector, 
  name: "LEMONSQUEEZY_WEBHOOK_SECRET", 
  value: "your_webhook_secret" 
})
```

#### 환경 변수 삭제
```typescript
mcp__convex__envRemove({ 
  deploymentSelector, 
  name: "OLD_ENV_VAR" 
})
```

### 3. 데이터베이스 조작

#### 테이블 스키마 조회
```typescript
mcp__convex__tables({ 
  deploymentSelector 
})
```

#### 데이터 읽기
```typescript
mcp__convex__data({ 
  deploymentSelector,
  tableName: "users",
  order: "asc",  // "asc" | "desc"
  limit: 10,
  cursor: "optional_cursor_for_pagination"
})
```

**응답 구조:**
```json
{
  "page": [...],           // 결과 데이터
  "isDone": false,        // 더 많은 데이터가 있는지
  "continueCursor": "..." // 다음 페이지용 커서
}
```

### 4. 함수 관리 및 실행

#### 함수 스펙 조회
```typescript
mcp__convex__functionSpec({ 
  deploymentSelector 
})
```

#### 함수 실행
```typescript
mcp__convex__run({
  deploymentSelector,
  functionName: "subscriptions.js:hasActiveSubscription",
  args: JSON.stringify({ 
    userId: "j97fzaan25gc8zg2jcmqdvzx157ppwzm" 
  })
})
```

**주요 함수들:**
- `users.js:current` - 현재 사용자 정보
- `subscriptions.js:hasActiveSubscription` - 구독 활성 상태 확인
- `subscriptions.js:getUserSubscription` - 사용자 구독 정보
- `subscriptions.js:getSubscriptionStats` - 구독 통계

### 5. 원타임 쿼리 실행

개발 및 디버깅용 임시 쿼리 실행:

```typescript
mcp__convex__runOneoffQuery({
  deploymentSelector,
  query: `
    import { query } from "convex:/_system/repl/wrappers.js";
    
    export default query({
      handler: async (ctx) => {
        // 모든 사용자 수 조회
        const users = await ctx.db.query("users").collect();
        return {
          totalUsers: users.length,
          users: users.slice(0, 5) // 처음 5명만
        };
      },
    });
  `
})
```

### 6. 로그 모니터링

```typescript
mcp__convex__logs({ 
  deploymentSelector,
  limit: 100,      // 최대 로그 수
  cursor: 0        // 시작 위치 (ms 단위)
})
```

## 🎯 실제 사용 예시

### Lemon Squeezy Webhook Secret 설정

```typescript
// 1. 현재 환경 변수 확인
const envVars = await mcp__convex__envList({ 
  deploymentSelector 
});

console.log("현재 환경 변수:", envVars.variables.map(v => v.name));

// 2. Webhook Secret 설정
await mcp__convex__envSet({
  deploymentSelector,
  name: "LEMONSQUEEZY_WEBHOOK_SECRET",
  value: "whsec_your_webhook_secret_from_lemonsqueezy"
});

// 3. 설정 확인
const webhookSecret = await mcp__convex__envGet({
  deploymentSelector,
  name: "LEMONSQUEEZY_WEBHOOK_SECRET"
});

console.log("설정 완료:", webhookSecret.value ? "✅" : "❌");
```

### 사용자 데이터 분석

```typescript
// 사용자 데이터 조회
const users = await mcp__convex__data({
  deploymentSelector,
  tableName: "users",
  order: "desc",
  limit: 10
});

// 구독 현황 조회
const subscriptions = await mcp__convex__data({
  deploymentSelector,
  tableName: "subscriptions", 
  order: "desc",
  limit: 20
});

// 통계 조회
const stats = await mcp__convex__run({
  deploymentSelector,
  functionName: "subscriptions.js:getSubscriptionStats",
  args: "{}"
});

console.log("사용자 수:", users.page.length);
console.log("활성 구독:", stats);
```

## 💡 디버깅 팁

### 1. 실시간 로그 모니터링

```bash
# 터미널에서 실시간 로그 확인
npx convex logs --watch

# 또는 MCP로 최신 로그 조회
mcp__convex__logs({ 
  deploymentSelector, 
  limit: 50 
})
```

### 2. Webhook 이벤트 디버깅

```typescript
// Webhook 이벤트 처리 후 로그 확인
const logs = await mcp__convex__logs({ 
  deploymentSelector,
  limit: 10
});

// 특정 사용자의 구독 상태 확인
const userSubscription = await mcp__convex__run({
  deploymentSelector,
  functionName: "subscriptions.js:getUserSubscription",
  args: JSON.stringify({ 
    userId: "user_id_here" 
  })
});
```

### 3. 데이터 무결성 검증

```typescript
// 사용자-구독 매핑 확인
const query = `
  import { query } from "convex:/_system/repl/wrappers.js";
  
  export default query({
    handler: async (ctx) => {
      const users = await ctx.db.query("users").collect();
      const subscriptions = await ctx.db.query("subscriptions").collect();
      
      const usersWithoutSub = users.filter(user => 
        !subscriptions.some(sub => sub.userId === user._id)
      );
      
      return {
        totalUsers: users.length,
        totalSubscriptions: subscriptions.length,
        usersWithoutSubscriptions: usersWithoutSub.length
      };
    },
  });
`;

const result = await mcp__convex__runOneoffQuery({
  deploymentSelector,
  query
});
```

## ⚠️ 주의사항

1. **Deployment Selector는 세션마다 고정**: 한 번 획득한 deploymentSelector는 같은 프로젝트에서 계속 사용 가능

2. **환경 변수 보안**: 민감한 정보는 Convex Dashboard에서만 설정하고 로컬 파일에 저장하지 않음

3. **함수 실행 시 타입**: args는 항상 JSON 문자열로 전달

4. **페이지네이션**: 대량 데이터 조회 시 `cursor`와 `isDone`을 사용하여 페이지네이션 구현

5. **Rate Limiting**: MCP 명령도 Convex API 제한에 영향받으므로 과도한 요청 주의

## 🔗 관련 문서

- [Lemon Squeezy Webhook 설정 가이드](./LEMON_SQUEEZY_SETUP.md)
- [Convex 공식 문서](https://docs.convex.dev/)
- [Convex Dashboard](https://dashboard.convex.dev/d/neighborly-guineapig-830)