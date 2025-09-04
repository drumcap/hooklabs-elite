import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// 알림 규칙 생성
export const createAlertRule = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    metricType: v.string(),
    metricName: v.string(),
    condition: v.string(),
    threshold: v.number(),
    aggregationWindow: v.number(),
    aggregationType: v.string(),
    consecutiveBreaches: v.number(),
    channels: v.array(v.object({
      type: v.string(),
      config: v.any(),
    })),
    severity: v.string(),
    cooldownMinutes: v.number(),
    maxAlertsPerDay: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    owner: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("alertRules", {
      ...args,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
});

// 알림 규칙 업데이트
export const updateAlertRule = mutation({
  args: {
    id: v.id("alertRules"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    threshold: v.optional(v.number()),
    channels: v.optional(v.array(v.object({
      type: v.string(),
      config: v.any(),
    }))),
    severity: v.optional(v.string()),
    cooldownMinutes: v.optional(v.number()),
    maxAlertsPerDay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return id;
  },
});

// 알림 규칙 조회
export const getAlertRules = query({
  args: {
    isActive: v.optional(v.boolean()),
    metricType: v.optional(v.string()),
    severity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("alertRules");
    
    if (args.isActive !== undefined) {
      query = query.filter((q) => q.eq(q.field("isActive"), args.isActive));
    }
    
    if (args.metricType) {
      query = query.filter((q) => q.eq(q.field("metricType"), args.metricType));
    }
    
    if (args.severity) {
      query = query.filter((q) => q.eq(q.field("severity"), args.severity));
    }
    
    return await query.collect();
  },
});

// 알림 이력 조회
export const getAlertHistory = query({
  args: {
    ruleId: v.optional(v.id("alertRules")),
    status: v.optional(v.string()),
    severity: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("alertHistory");
    
    if (args.ruleId) {
      query = query.filter((q) => q.eq(q.field("ruleId"), args.ruleId));
    }
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    if (args.severity) {
      query = query.filter((q) => q.eq(q.field("severity"), args.severity));
    }
    
    const limit = args.limit || 100;
    return await query.order("desc").take(limit);
  },
});

// 알림 확인
export const acknowledgeAlert = mutation({
  args: {
    alertId: v.id("alertHistory"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.alertId, {
      status: "acknowledged",
      acknowledgedBy: user._id,
      acknowledgedAt: new Date().toISOString(),
      notes: args.notes,
    });

    return args.alertId;
  },
});

// 알림 해결
export const resolveAlert = mutation({
  args: {
    alertId: v.id("alertHistory"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, {
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      notes: args.notes,
    });

    return args.alertId;
  },
});

// 메트릭 체크 및 알림 트리거 (Action)
export const checkMetricsAndTriggerAlerts = action({
  args: {},
  handler: async (ctx): Promise<{ alertsTriggered: number; errors: string[]; rulesChecked?: number; alerts?: any[] }> => {
    // 활성 알림 규칙 가져오기
    const activeRules: any[] = await ctx.runQuery(api.alerting.getAlertRules, {
      isActive: true,
    });

    const now = new Date();
    const alertsTriggered: any[] = [];

    for (const rule of activeRules) {
      try {
        // 메트릭 데이터 가져오기
        const metricValue = await getMetricValue(ctx, rule);
        
        if (metricValue === null) continue;

        // 조건 체크
        const shouldAlert = checkCondition(metricValue, rule.condition, rule.threshold);

        if (shouldAlert) {
          // 쿨다운 체크
          const recentAlerts = await ctx.runQuery(api.alerting.getAlertHistory, {
            ruleId: rule._id,
            limit: 1,
          });

          if (recentAlerts.length > 0) {
            const lastAlert = recentAlerts[0];
            const lastAlertTime = new Date(lastAlert.triggeredAt);
            const cooldownEnd = new Date(lastAlertTime.getTime() + rule.cooldownMinutes * 60 * 1000);
            
            if (now < cooldownEnd) {
              continue; // 쿨다운 중
            }
          }

          // 일일 최대 알림 수 체크
          if (rule.maxAlertsPerDay) {
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);

            const todayAlerts = await ctx.runQuery(api.alerting.getAlertHistory, {
              ruleId: rule._id,
            });

            const todayCount = todayAlerts.filter((a: any) => 
              new Date(a.triggeredAt) >= todayStart
            ).length;

            if (todayCount >= rule.maxAlertsPerDay) {
              continue; // 일일 한도 초과
            }
          }

          // 알림 트리거
          const alert = await ctx.runMutation(api.alerting.triggerAlert, {
            ruleId: rule._id,
            ruleName: rule.name,
            severity: rule.severity,
            message: formatAlertMessage(rule, metricValue),
            metricValue,
            threshold: rule.threshold,
            condition: rule.condition,
          });

          // 알림 전송
          await sendAlerts(rule.channels, alert);

          alertsTriggered.push(alert);
        }
      } catch (error) {
        console.error(`Error checking rule ${rule.name}:`, error);
      }
    }

    return {
      rulesChecked: activeRules.length,
      alertsTriggered: alertsTriggered.length,
      alerts: alertsTriggered,
      errors: [], // Add missing errors array
    };
  },
});

// 알림 트리거 (내부 사용)
export const triggerAlert = mutation({
  args: {
    ruleId: v.id("alertRules"),
    ruleName: v.string(),
    severity: v.string(),
    message: v.string(),
    metricValue: v.number(),
    threshold: v.number(),
    condition: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("alertHistory", {
      ruleId: args.ruleId,
      ruleName: args.ruleName,
      status: "triggered",
      severity: args.severity,
      message: args.message,
      metricValue: args.metricValue,
      threshold: args.threshold,
      condition: args.condition,
      channelsSent: [],
      sendSuccess: false,
      triggeredAt: new Date().toISOString(),
    });
  },
});

// 헬퍼 함수들
async function getMetricValue(ctx: any, rule: any): Promise<number | null> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - rule.aggregationWindow * 60 * 1000);

  switch (rule.metricType) {
    case 'webVitals':
      const webVitals = await ctx.runQuery(api.performanceMetrics.getWebVitalsSummary, {
        timeRange: '1h',
      });
      
      if (!webVitals) return null;
      
      // 메트릭 이름에 따라 값 반환
      const vitalsMetric = webVitals.metrics[rule.metricName];
      if (!vitalsMetric) return null;
      
      return vitalsMetric[rule.aggregationType] || vitalsMetric.avg;

    case 'api':
      const apiMetrics = await ctx.runQuery(api.performanceMetrics.getApiPerformanceSummary, {
        timeRange: '1h',
      });
      
      if (!apiMetrics) return null;
      
      switch (rule.metricName) {
        case 'responseTime':
          return apiMetrics.summary.p95ResponseTime;
        case 'errorRate':
          return 100 - apiMetrics.summary.successRate;
        case 'requestCount':
          return apiMetrics.summary.totalRequests;
        default:
          return null;
      }

    case 'business':
      const businessMetrics = await ctx.runQuery(api.performanceMetrics.getBusinessMetricsDashboard, {
        timeRange: '1h',
      });
      
      if (!businessMetrics) return null;
      
      // 비즈니스 메트릭 값 추출
      const [type, name] = rule.metricName.split('.');
      if (businessMetrics.metrics[type] && businessMetrics.metrics[type][name]) {
        const metric = businessMetrics.metrics[type][name];
        return metric[rule.aggregationType] || metric.avg;
      }
      
      return null;

    default:
      return null;
  }
}

function checkCondition(value: number, condition: string, threshold: number): boolean {
  switch (condition) {
    case 'gt':
      return value > threshold;
    case 'lt':
      return value < threshold;
    case 'gte':
      return value >= threshold;
    case 'lte':
      return value <= threshold;
    case 'eq':
      return value === threshold;
    case 'neq':
      return value !== threshold;
    default:
      return false;
  }
}

function formatAlertMessage(rule: any, metricValue: number): string {
  const conditionText: Record<string, string> = {
    gt: '초과',
    lt: '미만',
    gte: '이상',
    lte: '이하',
    eq: '일치',
    neq: '불일치',
  };
  const text = conditionText[rule.condition] || rule.condition;

  return `⚠️ ${rule.name}: ${rule.metricName} 값(${metricValue.toFixed(2)})이 임계값 ${rule.threshold} ${text}입니다.`;
}

async function sendAlerts(channels: any[], alert: any) {
  const results: string[] = [];
  const errors: string[] = [];

  for (const channel of channels) {
    try {
      switch (channel.type) {
        case 'slack':
          await sendSlackAlert(channel.config, alert);
          results.push('slack');
          break;
        
        case 'discord':
          await sendDiscordAlert(channel.config, alert);
          results.push('discord');
          break;
        
        case 'email':
          await sendEmailAlert(channel.config, alert);
          results.push('email');
          break;
        
        case 'webhook':
          await sendWebhookAlert(channel.config, alert);
          results.push('webhook');
          break;
        
        default:
          errors.push(`Unknown channel type: ${channel.type}`);
      }
    } catch (error: any) {
      errors.push(`${channel.type}: ${error.message}`);
    }
  }

  // 알림 전송 결과 업데이트
  // Note: 실제 구현에서는 ctx를 통해 업데이트해야 함
  return { results, errors };
}

async function sendSlackAlert(config: any, alert: any) {
  const webhookUrl = config.webhookUrl;
  
  const message = {
    text: alert.message,
    attachments: [{
      color: getSeverityColor(alert.severity),
      fields: [
        { title: "규칙", value: alert.ruleName, short: true },
        { title: "심각도", value: alert.severity, short: true },
        { title: "메트릭 값", value: alert.metricValue.toString(), short: true },
        { title: "임계값", value: alert.threshold.toString(), short: true },
        { title: "시간", value: new Date(alert.triggeredAt).toLocaleString(), short: false },
      ],
    }],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.statusText}`);
  }
}

async function sendDiscordAlert(config: any, alert: any) {
  const webhookUrl = config.webhookUrl;
  
  const embed = {
    title: "🚨 성능 알림",
    description: alert.message,
    color: getSeverityColorNumber(alert.severity),
    fields: [
      { name: "규칙", value: alert.ruleName, inline: true },
      { name: "심각도", value: alert.severity, inline: true },
      { name: "메트릭 값", value: alert.metricValue.toString(), inline: true },
      { name: "임계값", value: alert.threshold.toString(), inline: true },
      { name: "시간", value: new Date(alert.triggeredAt).toLocaleString(), inline: false },
    ],
    timestamp: alert.triggeredAt,
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.statusText}`);
  }
}

async function sendEmailAlert(config: any, alert: any) {
  // 실제 구현에서는 이메일 서비스 (SendGrid, AWS SES 등) 사용
  console.log('Email alert would be sent to:', config.to);
}

async function sendWebhookAlert(config: any, alert: any) {
  const response = await fetch(config.url, {
    method: config.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    body: JSON.stringify({
      ...alert,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.statusText}`);
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return '#FFA500';
    case 'low':
      return 'good';
    default:
      return '#808080';
  }
}

function getSeverityColorNumber(severity: string): number {
  switch (severity) {
    case 'critical':
      return 0xFF0000; // Red
    case 'high':
      return 0xFFA500; // Orange
    case 'medium':
      return 0xFFFF00; // Yellow
    case 'low':
      return 0x00FF00; // Green
    default:
      return 0x808080; // Gray
  }
}