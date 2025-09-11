# Lemon Squeezy Webhook 설정 가이드

Convex와 Lemon Squeezy를 연동하여 결제 및 구독 이벤트를 실시간으로 처리하는 방법을 설명합니다.

## 🏗️ 아키텍처 개요

```
Lemon Squeezy → Webhook Event → Convex HTTP Endpoint → Event Handler → Database Update → Real-time UI Update
```

## 📋 필수 환경 변수

### Local 개발 환경 (.env.local)
```bash
# Lemon Squeezy API 설정
LEMONSQUEEZY_API_KEY=your_api_key_here
LEMONSQUEEZY_STORE_ID=202895
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://repricewiz.lemonsqueezy.com/checkout

# Note: LEMONSQUEEZY_WEBHOOK_SECRET은 Convex Dashboard에서만 설정
```

### Convex Dashboard 환경 변수
```bash
# 반드시 Convex Dashboard에서 설정 (보안상 중요)
LEMONSQUEEZY_WEBHOOK_SECRET=whsec_your_webhook_secret
CLERK_WEBHOOK_SECRET=whsec_your_clerk_webhook_secret
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-clerk-domain.clerk.accounts.dev
```

## 🎯 Lemon Squeezy Dashboard 설정

### 1. Webhook 엔드포인트 등록

1. **Lemon Squeezy 대시보드 접속**
   - [Settings → Webhooks](https://app.lemonsqueezy.com/settings/webhooks)

2. **새 Webhook 추가**
   ```
   Webhook URL: https://neighborly-guineapig-830.convex.site/lemonsqueezy-webhook
   ```

3. **이벤트 선택**
   ```
   ✅ subscription_created      - 구독 생성
   ✅ subscription_updated      - 구독 업데이트
   ✅ subscription_cancelled    - 구독 취소
   ✅ subscription_resumed      - 구독 재개
   ✅ subscription_expired      - 구독 만료
   ✅ subscription_paused       - 구독 일시중지
   ✅ subscription_unpaused     - 구독 재개
   ✅ subscription_payment_success - 결제 성공
   ✅ subscription_payment_failed  - 결제 실패
   ✅ order_created            - 주문 생성
   ✅ order_refunded           - 환불
   ✅ license_key_created      - 라이선스 키 생성
   ✅ license_key_updated      - 라이선스 키 업데이트
   ```

4. **Signing Secret 복사**
   - 생성된 Webhook의 Signing Secret을 복사

### 2. Convex 환경 변수 설정

Convex MCP를 사용하여 환경 변수 설정:

```typescript
// 1. 현재 환경 변수 확인
const deploymentSelector = "ownDev:eyJwcm9qZWN0RGlyIjoiL1VzZXJzL2RydW1jYXAvd29ya3NwYWNlL2hvb2tsYWJzLWVsaXRlIiwiZGVwbG95bWVudCI6eyJraW5kIjoib3duRGV2In19";

await mcp__convex__envList({ deploymentSelector });

// 2. Webhook Secret 설정
await mcp__convex__envSet({
  deploymentSelector,
  name: "LEMONSQUEEZY_WEBHOOK_SECRET",
  value: "whsec_복사한_signing_secret"
});

// 3. 설정 확인
await mcp__convex__envGet({
  deploymentSelector,
  name: "LEMONSQUEEZY_WEBHOOK_SECRET"
});
```

## 🔧 Convex Webhook 처리 구조

### 1. HTTP 엔드포인트 (convex/http.ts)

```typescript
// Webhook 엔드포인트: /lemonsqueezy-webhook
http.route({
  path: "/lemonsqueezy-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // 1. 서명 검증
    const event = await validateLemonSqueezyRequest(request);
    
    if (!event) {
      return new Response("Error occurred", { status: 400 });
    }

    // 2. 이벤트 타입별 처리
    const eventName = event.meta.event_name;
    
    switch (eventName) {
      case "subscription_created":
        await ctx.runMutation(internal.lemonSqueezyWebhooks.handleSubscriptionCreated, {
          eventData: event,
        });
        break;
      
      case "subscription_updated":
        await ctx.runMutation(internal.lemonSqueezyWebhooks.handleSubscriptionUpdated, {
          eventData: event,
        });
        break;
        
      // ... 기타 이벤트 처리
    }

    return new Response(null, { status: 200 });
  }),
});
```

### 2. 서명 검증 (HMAC-SHA256)

```typescript
async function validateLemonSqueezyRequest(req: Request): Promise<any | null> {
  const body = await req.text();
  const signature = req.headers.get("X-Signature");
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  
  if (!signature || !secret) {
    console.error("Missing signature or secret");
    return null;
  }

  try {
    // HMAC-SHA256 검증
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const bodyData = encoder.encode(body);
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const expectedSigBuffer = await crypto.subtle.sign("HMAC", key, bodyData);
    const expectedSigArray = new Uint8Array(expectedSigBuffer);
    const expectedSig = Array.from(expectedSigArray, byte => 
      byte.toString(16).padStart(2, '0')
    ).join('');
    
    const providedSig = signature.replace(/^sha256=/, '');
    
    if (expectedSig !== providedSig) {
      console.error("Signature verification failed");
      return null;
    }
    
    return JSON.parse(body);
  } catch (error) {
    console.error("Error verifying webhook:", error);
    return null;
  }
}
```

## 📊 데이터베이스 스키마

### 주요 테이블 구조

```typescript
// convex/schema.ts

users: defineTable({
  name: v.string(),
  externalId: v.string(),                    // Clerk ID
  lemonSqueezyCustomerId: v.optional(v.string()), // LS Customer ID 매핑
}),

subscriptions: defineTable({
  userId: v.id("users"),
  lemonSqueezySubscriptionId: v.string(),    // LS 구독 ID
  lemonSqueezyCustomerId: v.string(),        // LS 고객 ID
  lemonSqueezyProductId: v.string(),         // LS 제품 ID  
  lemonSqueezyVariantId: v.string(),         // LS 변형 ID
  status: v.string(),                        // active, cancelled, expired 등
  planName: v.string(),                      // 플랜명 (Basic, Pro)
  price: v.number(),                         // 가격 (센트 단위)
  currency: v.string(),                      // 통화
  renewsAt: v.optional(v.string()),          // 갱신일
  endsAt: v.optional(v.string()),            // 종료일
  trialEndsAt: v.optional(v.string()),       // 평가판 종료일
}),

payments: defineTable({
  userId: v.optional(v.id("users")),
  lemonSqueezyOrderId: v.string(),           // LS 주문 ID
  lemonSqueezySubscriptionId: v.optional(v.string()), // 구독 연결
  status: v.string(),                        // pending, paid, refunded
  total: v.number(),                         // 총 금액
  userEmail: v.string(),                     // 결제자 이메일
  productName: v.string(),                   // 제품명
}),
```

## 🎮 이벤트 핸들러 구현

### 1. 구독 생성 처리

```typescript
// convex/lemonSqueezyWebhooks.ts

export const handleSubscriptionCreated = internalMutation({
  args: { eventData: lemonSqueezyWebhookEventValidator },
  handler: async (ctx, { eventData }) => {
    const subscriptionData = transformSubscriptionData(eventData.data);
    
    // 1. 사용자 찾기 (custom_data에서 clerk_user_id 사용)
    let user = null;
    if (eventData.meta.custom_data?.clerk_user_id) {
      user = await ctx.db
        .query("users")
        .withIndex("byExternalId", (q) => 
          q.eq("externalId", eventData.meta.custom_data.clerk_user_id))
        .unique();
    }
    
    // 2. Fallback: 이메일로 사용자 찾기
    if (!user) {
      user = await findUserByCustomerData(
        ctx, 
        subscriptionData.lemonSqueezyCustomerId, 
        eventData.data.attributes.user_email
      );
    }

    if (!user) {
      console.error(`User not found for subscription: ${subscriptionData.lemonSqueezySubscriptionId}`);
      return null;
    }

    // 3. 중복 체크
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("byLemonSqueezyId", (q) => 
        q.eq("lemonSqueezySubscriptionId", subscriptionData.lemonSqueezySubscriptionId))
      .unique();

    if (existingSubscription) {
      console.log(`Subscription already exists: ${subscriptionData.lemonSqueezySubscriptionId}`);
      return null;
    }

    // 4. 구독 생성
    await ctx.db.insert("subscriptions", {
      userId: user._id,
      ...subscriptionData,
    });

    // 5. 사용자에 Lemon Squeezy 고객 ID 연결
    if (!user.lemonSqueezyCustomerId) {
      await ctx.db.patch(user._id, {
        lemonSqueezyCustomerId: subscriptionData.lemonSqueezyCustomerId,
      });
    }

    console.log(`✅ Created subscription for user ${user._id}: ${subscriptionData.lemonSqueezySubscriptionId}`);
    return null;
  },
});
```

### 2. 주요 이벤트별 처리 로직

```typescript
// 구독 업데이트 (상태 변경, 플랜 변경 등)
handleSubscriptionUpdated: 기존 구독 찾아서 정보 업데이트

// 구독 취소
handleSubscriptionCancelled: status를 'cancelled'로, endsAt 설정

// 주문 생성 (일회성 결제)
handleOrderCreated: payments 테이블에 주문 정보 저장

// 환불 처리
handleOrderRefunded: 기존 결제 기록에 환불 상태 업데이트
```

## 💡 체크아웃 연동

### 1. Checkout 생성 시 사용자 매핑

```typescript
// components/pricing-table.tsx

const handleSelectPlan = async (plan: PricingPlan) => {
  if (!user) {
    window.location.href = "/sign-in";
    return;
  }

  const response = await fetch("/api/lemonsqueezy/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      variantId: plan.variantId,
      email: user.emailAddresses[0]?.emailAddress,
      name: user.fullName || user.firstName || "Customer",
      customData: {
        // 🎯 중요: Clerk user ID를 custom_data에 포함
        clerk_user_id: user.id,  
        planId: plan.id,
        planName: plan.name,
      },
    }),
  });

  const data = await response.json();
  if (data.checkoutUrl) {
    window.location.href = data.checkoutUrl;
  }
};
```

### 2. API 라우트 구현

```typescript
// app/api/lemonsqueezy/checkout/route.ts

export async function POST(request: Request) {
  const { variantId, email, name, customData } = await request.json();

  const checkoutData = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email,
          name,
          custom: customData, // Webhook에서 meta.custom_data로 전달됨
        },
      },
      relationships: {
        store: {
          data: {
            type: "stores",
            id: process.env.LEMONSQUEEZY_STORE_ID,
          },
        },
        variant: {
          data: {
            type: "variants", 
            id: variantId,
          },
        },
      },
    },
  };

  const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify(checkoutData),
  });

  const result = await response.json();
  return Response.json({ 
    checkoutUrl: result.data.attributes.url 
  });
}
```

## 🧪 테스트 방법

### 1. Webhook 테스트

```typescript
// Convex MCP를 사용한 실시간 모니터링
const deploymentSelector = "ownDev:...";

// 로그 실시간 모니터링
await mcp__convex__logs({ 
  deploymentSelector,
  limit: 10
});

// 구독 데이터 확인
await mcp__convex__data({
  deploymentSelector,
  tableName: "subscriptions",
  order: "desc",
  limit: 5
});
```

### 2. Test Mode 사용

1. **Lemon Squeezy Test Mode 활성화**
   - 대시보드에서 Test Mode 토글

2. **테스트 카드 사용**
   ```
   카드 번호: 4242 4242 4242 4242
   만료일: 12/34
   CVC: 123
   ```

3. **Webhook 이벤트 확인**
   ```bash
   # 터미널에서 실시간 로그 확인
   npx convex logs --watch
   ```

### 3. 데이터 검증

```typescript
// 사용자-구독 매핑 검증 쿼리
const verificationQuery = `
  import { query } from "convex:/_system/repl/wrappers.js";
  
  export default query({
    handler: async (ctx) => {
      const subscriptions = await ctx.db.query("subscriptions").collect();
      const users = await ctx.db.query("users").collect();
      
      const orphanedSubscriptions = subscriptions.filter(sub => 
        !users.some(user => user._id === sub.userId)
      );
      
      return {
        totalUsers: users.length,
        totalSubscriptions: subscriptions.length,
        orphanedSubscriptions: orphanedSubscriptions.length,
        activeSubscriptions: subscriptions.filter(s => s.status === 'active').length
      };
    },
  });
`;

await mcp__convex__runOneoffQuery({
  deploymentSelector,
  query: verificationQuery
});
```

## 🔒 보안 고려사항

### 1. Webhook 서명 검증 필수
- 모든 Webhook 요청에 대해 HMAC-SHA256 서명 검증
- 환경 변수는 Convex Dashboard에서만 관리

### 2. 사용자 매핑 보안
- `custom_data`를 통한 안전한 사용자 매핑
- Fallback으로 이메일 매칭 제공

### 3. 중복 처리 방지
- 멱등성 보장: 동일한 이벤트 여러 번 수신 시에도 안전
- `lemonSqueezySubscriptionId`로 중복 체크

### 4. 에러 처리
```typescript
// 사용자를 찾지 못한 경우
if (!user) {
  console.error(`User mapping failed for customer: ${customerId}, email: ${email}`);
  // 500 에러 반환하면 Lemon Squeezy가 재시도
  return new Response("User not found", { status: 500 });
}
```

## 🚨 문제 해결

### 1. Webhook이 수신되지 않는 경우

```bash
# Convex 로그 확인
npx convex logs --tail

# 또는 MCP로
mcp__convex__logs({ deploymentSelector, limit: 50 })
```

**체크리스트:**
- [ ] Webhook URL 정확성: `https://neighborly-guineapig-830.convex.site/lemonsqueezy-webhook`
- [ ] `LEMONSQUEEZY_WEBHOOK_SECRET` 환경 변수 설정 확인
- [ ] Lemon Squeezy Test Mode 상태 확인

### 2. 사용자 매핑 실패

```typescript
// 디버깅 쿼리
const debugQuery = `
  import { query } from "convex:/_system/repl/wrappers.js";
  
  export default query({
    handler: async (ctx) => {
      const users = await ctx.db.query("users").collect();
      return users.map(u => ({
        id: u._id,
        externalId: u.externalId,
        lemonSqueezyCustomerId: u.lemonSqueezyCustomerId,
        name: u.name
      }));
    },
  });
`;
```

**해결 방법:**
- Checkout 시 `custom_data`에 `clerk_user_id` 포함 확인
- Clerk와 Convex 사용자 ID 매핑 확인

### 3. 서명 검증 실패

**일반적인 원인:**
- Webhook Secret 불일치
- 헤더 파싱 오류
- 타임스탬프 기반 검증 (Lemon Squeezy는 미사용)

## 🔗 관련 문서

- [Convex MCP 사용 가이드](./CONVEX_MCP_GUIDE.md)
- [Lemon Squeezy Webhook 문서](https://docs.lemonsqueezy.com/help/webhooks)
- [Convex HTTP Actions 문서](https://docs.convex.dev/functions/http-actions)