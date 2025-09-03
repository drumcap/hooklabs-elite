import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

// Cron 작업 정의
const crons = cronJobs();

// 1. 예약된 게시물 처리 (1분마다)
crons.interval(
  "process-scheduled-posts",
  { minutes: 1 },
  api.cron.processScheduledPosts
);

// 2. 메트릭 수집 (10분마다)
crons.interval(
  "collect-metrics",
  { minutes: 10 },
  api.cron.collectPostMetrics
);

// 3. 토큰 갱신 (1시간마다)
crons.interval(
  "refresh-tokens",
  { hours: 1 },
  api.cron.refreshExpiredTokens
);

// 4. 크레딧 정리 (매일 자정)
crons.cron(
  "cleanup-expired-credits",
  "0 0 * * *", // 매일 00:00
  api.cron.cleanupExpiredCredits
);

// 5. 보안 로그 정리 (매주 일요일)
crons.cron(
  "cleanup-security-logs",
  "0 2 * * 0", // 매주 일요일 02:00
  api.cron.cleanupOldSecurityLogs
);

// 6. 사용량 집계 (매일 새벽 1시)
crons.cron(
  "aggregate-usage",
  "0 1 * * *", // 매일 01:00
  api.cron.aggregateUsageStats
);

export default crons;