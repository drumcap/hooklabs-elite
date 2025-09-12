# 인덱스 최적화 분석 보고서

## 현재 인덱스 문제점

### 1. 과도한 인덱스 생성
현재 스키마에서 대부분의 필드에 개별 인덱스가 생성되어 있어 다음 문제가 발생:

- **쓰기 성능 저하**: 각 INSERT/UPDATE마다 다수의 인덱스 업데이트 필요
- **스토리지 오버헤드**: 인덱스 크기가 실제 데이터보다 클 수 있음
- **메모리 사용량 증가**: 불필요한 인덱스가 메모리 점유

### 2. 복합 인덱스 부족
단일 컬럼 인덱스만 있고, 실제 쿼리 패턴에 맞는 복합 인덱스 부족

### 3. 미사용 인덱스
제거 예정인 테이블들의 인덱스가 리소스만 소모

## 최적화된 인덱스 전략

### 핵심 원칙
1. **쿼리 패턴 기반**: 실제 쿼리에서 사용되는 필터 조건에만 인덱스 생성
2. **복합 인덱스 활용**: WHERE 절에서 함께 사용되는 컬럼들을 복합 인덱스로 구성
3. **카디널리티 고려**: 고유값이 많은 컬럼을 인덱스 앞쪽에 배치
4. **쓰기 최적화**: 쓰기 빈도가 높은 테이블은 최소한의 인덱스만 유지

## 테이블별 최적화된 인덱스 구성

### 1. Core Tables (높은 쿼리 빈도)

#### users
```typescript
.index("byExternalId", ["externalId"])  // Clerk 인증용 - 필수
// 제거: byLemonSqueezyCustomerId (필요시에만 full scan)
```

#### socialPosts
```typescript
.index("byUserId", ["userId"])                    // 사용자별 게시물 조회
.index("byUserStatus", ["userId", "status"])      // 사용자별 상태 필터링 (복합)
.index("byPersonaId", ["personaId"])              // 페르소나별 게시물
.index("byScheduled", ["scheduledFor"])           // 예약 게시물 처리
// 제거: byStatus (단독으로 거의 사용되지 않음)
```

#### socialMetrics (통합된)
```typescript
.index("byPostId", ["postId"])                    // 특정 게시물 메트릭
.index("byPostPlatform", ["postId", "platform"])  // 게시물-플랫폼별 메트릭 (복합)
.index("byAccountPlatform", ["accountId", "platform"]) // 계정별 플랫폼 성과
// 제거: byPlatform, byFetchedAt (단독 사용 빈도 낮음)
```

#### subscriptions
```typescript
.index("byUserId", ["userId"])                    // 사용자 구독 조회
.index("byUserStatus", ["userId", "status"])      // 활성 구독 확인 (복합)
.index("byLemonSqueezyId", ["lemonSqueezySubscriptionId"]) // 웹훅 처리용
// 제거: byStatus, byCustomerId (필요시 full scan)
```

#### usage
```typescript
.index("byUserId", ["userId"])                    // 사용자별 사용량
.index("byUserResource", ["userId", "resourceType"]) // 사용자별 리소스 타입 (복합)
.index("byUserTime", ["userId", "timestamp"])     // 시간별 사용량 분석 (복합)
.index("byPostId", ["postId"])                    // 게시물별 사용량
// 제거: byResourceType, byTimestamp, byCreatedAt (단독 사용 빈도 낮음)
```

### 2. Medium Frequency Tables

#### credits
```typescript
.index("byUserId", ["userId"])                    // 사용자 크레딧 조회
.index("byUserType", ["userId", "type"])          // 크레딧 타입별 조회 (복합)
.index("byExpires", ["expiresAt"])                // 만료 예정 크레딧
// 제거: byType, byCreatedAt
```

#### personas
```typescript
.index("byUserId", ["userId"])                    // 사용자별 페르소나
// 제거: 다른 모든 인덱스 (full scan으로도 충분)
```

#### scheduledPosts
```typescript
.index("byScheduledFor", ["scheduledFor"])        // 예약 실행용
.index("byStatusScheduled", ["status", "scheduledFor"]) // 상태별 예약 시간 (복합)
.index("byPostId", ["postId"])                    // 게시물별 예약 정보
// 제거: byPlatform, byStatus, bySocialAccountId, byNextRetryAt
```

### 3. Low Frequency Tables

#### socialAccounts
```typescript
.index("byUserId", ["userId"])                    // 사용자별 계정
.index("byPlatform", ["platform"])                // 플랫폼별 계정
// 제거: byIsActive, byAccountId (필요시 full scan)
```

#### payments, checkouts, licenses
```typescript
// 각각 최소한의 인덱스만 유지
payments: .index("byUserId", ["userId"]), .index("byLemonSqueezyOrderId", ["lemonSqueezyOrderId"])
checkouts: .index("byUserId", ["userId"])
licenses: .index("byUserId", ["userId"]), .index("byLicenseKey", ["licenseKey"])
```

## 인덱스 최적화 효과 예측

### 성능 개선
- **쿼리 속도**: 복합 인덱스로 20-40% 향상
- **쓰기 성능**: 인덱스 수 감소로 15-25% 향상
- **메모리 사용량**: 30-50% 감소

### 리소스 절약
- **스토리지**: 불필요한 인덱스 제거로 20-30% 절약
- **CPU**: 인덱스 유지보수 오버헤드 감소
- **I/O**: 인덱스 읽기/쓰기 작업 감소

## 마이그레이션 주의사항

### 1. 단계적 적용
- 한 번에 모든 인덱스 변경하지 말고 테이블별로 순차 적용
- 각 변경 후 성능 모니터링 필수

### 2. 백업 계획
- 인덱스 변경 전 데이터 백업
- 롤백 계획 수립

### 3. 성능 테스트
- 실제 쿼리 패턴으로 부하 테스트
- 프로덕션과 유사한 데이터 볼륨으로 테스트

### 4. 모니터링
- 쿼리 실행 계획 분석
- 응답 시간 변화 추적
- 리소스 사용량 모니터링

## 권장 구현 순서

1. **Phase 1**: 핵심 테이블 인덱스 최적화 (users, socialPosts, usage)
2. **Phase 2**: 미사용 테이블 제거 및 인덱스 정리
3. **Phase 3**: 중간 빈도 테이블 인덱스 최적화
4. **Phase 4**: 성능 모니터링 및 추가 튜닝