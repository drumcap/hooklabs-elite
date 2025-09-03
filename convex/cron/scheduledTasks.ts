import { internalAction } from "../_generated/server";
import { api } from "../_generated/api";

// 예약된 게시물 처리
export const processScheduledPosts = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("🕐 예약된 게시물 처리 시작");
    
    // 예약 시간이 된 게시물들 조회
    const dueSchedules = await ctx.runQuery(api.scheduledPosts.getDueSchedules);
    
    let processed = 0;
    let failed = 0;

    for (const schedule of dueSchedules) {
      try {
        // 게시물 정보 가져오기
        const post = await ctx.runQuery(api.socialPosts.get, { id: schedule.postId });
        if (!post) {
          console.error(`게시물을 찾을 수 없습니다: ${schedule.postId}`);
          continue;
        }

        // 소셜 계정 정보 가져오기
        const socialAccount = await ctx.runQuery(api.socialAccounts.getWithTokens, { 
          id: schedule.socialAccountId 
        });
        
        if (!socialAccount || !socialAccount.isActive) {
          await ctx.runMutation(api.scheduledPosts.updateStatus, {
            id: schedule._id,
            status: "failed",
            error: "소셜 계정이 비활성화되었거나 찾을 수 없습니다",
          });
          failed++;
          continue;
        }

        // 크레딧 확인
        const creditBalance = await ctx.runQuery(api.credits.getUserBalance, { 
          userId: post.userId 
        });
        
        const requiredCredits = 5; // 게시물 발행 크레딧
        if (!creditBalance || creditBalance.availableCredits < requiredCredits) {
          await ctx.runMutation(api.scheduledPosts.updateStatus, {
            id: schedule._id,
            status: "failed",
            error: "크레딧이 부족합니다",
          });
          failed++;
          continue;
        }

        // 스케줄 상태를 처리중으로 업데이트
        await ctx.runMutation(api.scheduledPosts.updateStatus, {
          id: schedule._id,
          status: "processing",
        });

        // 플랫폼별 발행
        let result;
        const content = schedule.variantId 
          ? (await ctx.runQuery(api.postVariants.get, { id: schedule.variantId }))?.content || post.finalContent
          : post.finalContent;

        switch (schedule.platform) {
          case "twitter":
            result = await ctx.runAction(api.actions.socialPublishing.publishToTwitter, {
              socialAccountId: schedule.socialAccountId,
              content,
              mediaUrls: post.mediaUrls,
            });
            break;

          case "threads":
            result = await ctx.runAction(api.actions.socialPublishing.publishToThreads, {
              socialAccountId: schedule.socialAccountId,
              content,
              imageUrl: post.mediaUrls?.[0],
            });
            break;

          default:
            throw new Error(`지원하지 않는 플랫폼: ${schedule.platform}`);
        }

        if (result.success) {
          // 성공 시 상태 업데이트
          await ctx.runMutation(api.scheduledPosts.updateStatus, {
            id: schedule._id,
            status: "published",
            publishedAt: result.publishedAt,
            publishedPostId: result.platformPostId,
          });

          // 게시물 상태 업데이트
          await ctx.runMutation(api.socialPosts.updateStatus, {
            id: schedule.postId,
            status: "published",
            publishedAt: result.publishedAt,
          });

          // 크레딧 차감
          await ctx.runMutation(api.credits.deduct, {
            userId: post.userId,
            amount: requiredCredits,
            description: `${schedule.platform} 게시물 발행`,
          });

          processed++;
          console.log(`✅ 게시물 발행 성공: ${schedule._id} (${schedule.platform})`);
        }

      } catch (error) {
        console.error(`❌ 게시물 발행 실패: ${schedule._id}`, error);
        
        // 실패 시 상태 업데이트 (재시도 로직 포함)
        await ctx.runMutation(api.scheduledPosts.updateStatus, {
          id: schedule._id,
          status: "failed",
          error: error instanceof Error ? error.message : "알 수 없는 오류",
        });
        
        failed++;
      }
    }

    console.log(`📊 예약 게시물 처리 완료: ${processed}개 성공, ${failed}개 실패`);
    return { processed, failed };
  },
});

// 게시물 메트릭 수집
export const collectPostMetrics = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("📈 게시물 메트릭 수집 시작");

    // 최근 7일간 발행된 게시물들 조회
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const recentPosts = await ctx.runQuery(api.socialPosts.list, {
      // 발행된 게시물만 필터링하는 로직 필요
    });

    let collected = 0;
    let failed = 0;

    // 실제로는 발행된 게시물만 필터링해야 함
    const publishedPosts = recentPosts.page?.filter(post => 
      post.status === "published" && post.publishedAt && post.publishedAt >= sevenDaysAgo
    ) || [];

    for (const post of publishedPosts) {
      try {
        const schedules = await ctx.runQuery(api.scheduledPosts.getByPost, { postId: post._id });
        const publishedSchedules = schedules.filter(s => s.status === "published" && s.publishedPostId);

        for (const schedule of publishedSchedules) {
          try {
            let metrics;

            switch (schedule.platform) {
              case "twitter":
                metrics = await ctx.runAction(api.actions.socialPublishing.collectTwitterMetrics, {
                  socialAccountId: schedule.socialAccountId,
                  tweetId: schedule.publishedPostId!,
                });
                break;

              case "threads":
                metrics = await ctx.runAction(api.actions.socialPublishing.collectThreadsMetrics, {
                  socialAccountId: schedule.socialAccountId,
                  postId: schedule.publishedPostId!,
                });
                break;

              default:
                continue;
            }

            // 메트릭 업데이트
            await ctx.runMutation(api.socialPosts.updateMetrics, {
              id: post._id,
              platform: schedule.platform,
              metrics,
            });

            collected++;
            console.log(`✅ 메트릭 수집 성공: ${post._id} (${schedule.platform})`);

          } catch (error) {
            console.error(`❌ 메트릭 수집 실패: ${post._id} (${schedule.platform})`, error);
            failed++;
          }
        }

      } catch (error) {
        console.error(`❌ 게시물 처리 실패: ${post._id}`, error);
        failed++;
      }
    }

    console.log(`📊 메트릭 수집 완료: ${collected}개 성공, ${failed}개 실패`);
    return { collected, failed };
  },
});

// 만료된 토큰 갱신
export const refreshExpiredTokens = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 만료된 토큰 갱신 시작");

    // 12시간 내에 만료되는 토큰들 조회
    const expiringAccounts = await ctx.runQuery(api.socialAccounts.getExpiringTokens, { 
      hoursThreshold: 12 
    });

    let refreshed = 0;
    let failed = 0;

    for (const account of expiringAccounts) {
      try {
        if (account.platform === "twitter") {
          const result = await ctx.runAction(api.actions.socialPublishing.refreshTwitterToken, {
            socialAccountId: account._id,
          });

          if (result.success) {
            refreshed++;
            console.log(`✅ 토큰 갱신 성공: ${account.username} (${account.platform})`);
          }
        }

        // 다른 플랫폼의 토큰 갱신 로직 추가 가능

      } catch (error) {
        console.error(`❌ 토큰 갱신 실패: ${account.username}`, error);
        
        // 토큰 갱신 실패 시 계정을 비활성화하거나 사용자에게 알림
        await ctx.runMutation(api.socialAccounts.update, {
          id: account._id,
          isActive: false, // 토큰 갱신 실패 시 계정 비활성화
        });

        failed++;
      }
    }

    console.log(`📊 토큰 갱신 완료: ${refreshed}개 성공, ${failed}개 실패`);
    return { refreshed, failed };
  },
});

// 만료된 크레딧 정리
export const cleanupExpiredCredits = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("🧹 만료된 크레딧 정리 시작");

    const now = new Date().toISOString();
    
    // 만료된 크레딧 조회
    const expiredCredits = await ctx.runQuery(api.credits.getExpired, { 
      beforeDate: now 
    });

    let cleaned = 0;

    for (const credit of expiredCredits) {
      try {
        // 만료된 크레딧을 "expired" 타입으로 기록
        await ctx.runMutation(api.credits.create, {
          userId: credit.userId,
          amount: -credit.amount, // 차감
          type: "expired",
          description: `크레딧 만료 (원본 ID: ${credit._id})`,
          expiresAt: undefined,
          relatedOrderId: credit.relatedOrderId,
        });

        // 사용자 크레딧 잔액 업데이트
        await ctx.runMutation(api.credits.updateBalance, {
          userId: credit.userId,
        });

        cleaned++;

      } catch (error) {
        console.error(`❌ 크레딧 정리 실패: ${credit._id}`, error);
      }
    }

    console.log(`📊 크레딧 정리 완료: ${cleaned}개 처리`);
    return { cleaned };
  },
});

// 오래된 보안 로그 정리
export const cleanupOldSecurityLogs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("🧹 오래된 보안 로그 정리 시작");

    // 90일 이전 로그 삭제
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    
    let deleted = 0;

    try {
      // API 사용량 로그 정리
      const oldApiUsage = await ctx.runQuery(api.apiUsage.getOldRecords, { 
        beforeDate: cutoffDate 
      });

      for (const record of oldApiUsage) {
        await ctx.runMutation(api.apiUsage.delete, { id: record._id });
        deleted++;
      }

      // 보안 이벤트 로그 정리 (심각도가 낮은 것만)
      const oldSecurityEvents = await ctx.runQuery(api.securityEvents.getOldLowSeverity, {
        beforeDate: cutoffDate,
        maxSeverity: "medium",
      });

      for (const event of oldSecurityEvents) {
        await ctx.runMutation(api.securityEvents.delete, { id: event._id });
        deleted++;
      }

    } catch (error) {
      console.error("❌ 로그 정리 중 오류 발생:", error);
    }

    console.log(`📊 로그 정리 완료: ${deleted}개 레코드 삭제`);
    return { deleted };
  },
});

// 사용량 통계 집계
export const aggregateUsageStats = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("📊 사용량 통계 집계 시작");

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startDate = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
    const endDate = today.toISOString().split('T')[0];

    try {
      // 전체 사용자 목록 조회
      const users = await ctx.runQuery(api.users.list, {});

      let aggregated = 0;

      for (const user of users) {
        try {
          // 사용자별 일일 통계 계산
          const [
            aiStats,
            postStats,
            creditStats
          ] = await Promise.all([
            ctx.runQuery(api.aiGenerations.getUserStats, {
              startDate,
              endDate,
            }),
            ctx.runQuery(api.socialPosts.getDashboardStats, {
              startDate,
              endDate,
            }),
            ctx.runQuery(api.credits.getUserDailyUsage, {
              userId: user._id,
              date: startDate,
            }),
          ]);

          // 일일 통계 저장
          await ctx.runMutation(api.dailyStats.create, {
            userId: user._id,
            date: startDate,
            stats: {
              aiGenerations: aiStats.total,
              aiCreditsUsed: aiStats.totalCreditsUsed,
              postsCreated: postStats.total,
              postsPublished: postStats.published,
              creditsUsed: creditStats.totalUsed,
              creditsEarned: creditStats.totalEarned,
            },
          });

          aggregated++;

        } catch (error) {
          console.error(`❌ 사용자 통계 집계 실패: ${user._id}`, error);
        }
      }

      console.log(`📊 통계 집계 완료: ${aggregated}명의 사용자 처리`);
      return { aggregated };

    } catch (error) {
      console.error("❌ 통계 집계 중 오류 발생:", error);
      return { aggregated: 0 };
    }
  },
});