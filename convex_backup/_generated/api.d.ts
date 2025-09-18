/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as actions_contentGeneration from "../actions/contentGeneration.js";
import type * as actions_socialPublishing from "../actions/socialPublishing.js";
import type * as ai from "../ai.js";
import type * as aiGenerations from "../aiGenerations.js";
import type * as alerting from "../alerting.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as coupons from "../coupons.js";
import type * as credits from "../credits.js";
import type * as cron_scheduledTasks from "../cron/scheduledTasks.js";
import type * as cron from "../cron.js";
import type * as featureFlags from "../featureFlags.js";
import type * as http from "../http.js";
import type * as lemonSqueezyTypes from "../lemonSqueezyTypes.js";
import type * as lemonSqueezyWebhooks from "../lemonSqueezyWebhooks.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_crud from "../lib/crud.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_validators from "../lib/validators.js";
import type * as manualUserSync from "../manualUserSync.js";
import type * as metrics from "../metrics.js";
import type * as migrations_optimizationMigration from "../migrations/optimizationMigration.js";
import type * as notifications from "../notifications.js";
import type * as optimized_advancedPagination from "../optimized/advancedPagination.js";
import type * as optimized_apiDocumentationGenerator from "../optimized/apiDocumentationGenerator.js";
import type * as optimized_apiResponseOptimizer from "../optimized/apiResponseOptimizer.js";
import type * as optimized_batchProcessingOptimized from "../optimized/batchProcessingOptimized.js";
import type * as optimized_cacheManager from "../optimized/cacheManager.js";
import type * as optimized_externalApiOptimizer from "../optimized/externalApiOptimizer.js";
import type * as optimized_performanceMonitoring from "../optimized/performanceMonitoring.js";
import type * as optimized_rateLimitingAndErrorHandling from "../optimized/rateLimitingAndErrorHandling.js";
import type * as optimized_realtimeOptimized from "../optimized/realtimeOptimized.js";
import type * as optimized_scheduledPostsOptimized from "../optimized/scheduledPostsOptimized.js";
import type * as optimized_schemaOptimized from "../optimized/schemaOptimized.js";
import type * as optimized_socialPostsOptimized from "../optimized/socialPostsOptimized.js";
import type * as paymentAttemptTypes from "../paymentAttemptTypes.js";
import type * as paymentAttempts from "../paymentAttempts.js";
import type * as performanceMetrics from "../performanceMetrics.js";
import type * as personas from "../personas.js";
import type * as postVariants from "../postVariants.js";
import type * as scheduledPosts from "../scheduledPosts.js";
import type * as schema_ai from "../schema/ai.js";
import type * as schema_analytics from "../schema/analytics.js";
import type * as schema_auth from "../schema/auth.js";
import type * as schema_billing from "../schema/billing.js";
import type * as schema_monitoring from "../schema/monitoring.js";
import type * as schema_payments from "../schema/payments.js";
import type * as schema_pipeline from "../schema/pipeline.js";
import type * as schema_social from "../schema/social.js";
import type * as schema_users from "../schema/users.js";
import type * as schemaUpdated from "../schemaUpdated.js";
import type * as schema_backup from "../schema_backup.js";
import type * as socialAccounts from "../socialAccounts.js";
import type * as socialMetrics from "../socialMetrics.js";
import type * as socialPosts from "../socialPosts.js";
import type * as subscriptions from "../subscriptions.js";
import type * as syncClerkUsers from "../syncClerkUsers.js";
import type * as usage from "../usage.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "actions/contentGeneration": typeof actions_contentGeneration;
  "actions/socialPublishing": typeof actions_socialPublishing;
  ai: typeof ai;
  aiGenerations: typeof aiGenerations;
  alerting: typeof alerting;
  analytics: typeof analytics;
  auth: typeof auth;
  coupons: typeof coupons;
  credits: typeof credits;
  "cron/scheduledTasks": typeof cron_scheduledTasks;
  cron: typeof cron;
  featureFlags: typeof featureFlags;
  http: typeof http;
  lemonSqueezyTypes: typeof lemonSqueezyTypes;
  lemonSqueezyWebhooks: typeof lemonSqueezyWebhooks;
  "lib/auth": typeof lib_auth;
  "lib/crud": typeof lib_crud;
  "lib/encryption": typeof lib_encryption;
  "lib/errors": typeof lib_errors;
  "lib/validators": typeof lib_validators;
  manualUserSync: typeof manualUserSync;
  metrics: typeof metrics;
  "migrations/optimizationMigration": typeof migrations_optimizationMigration;
  notifications: typeof notifications;
  "optimized/advancedPagination": typeof optimized_advancedPagination;
  "optimized/apiDocumentationGenerator": typeof optimized_apiDocumentationGenerator;
  "optimized/apiResponseOptimizer": typeof optimized_apiResponseOptimizer;
  "optimized/batchProcessingOptimized": typeof optimized_batchProcessingOptimized;
  "optimized/cacheManager": typeof optimized_cacheManager;
  "optimized/externalApiOptimizer": typeof optimized_externalApiOptimizer;
  "optimized/performanceMonitoring": typeof optimized_performanceMonitoring;
  "optimized/rateLimitingAndErrorHandling": typeof optimized_rateLimitingAndErrorHandling;
  "optimized/realtimeOptimized": typeof optimized_realtimeOptimized;
  "optimized/scheduledPostsOptimized": typeof optimized_scheduledPostsOptimized;
  "optimized/schemaOptimized": typeof optimized_schemaOptimized;
  "optimized/socialPostsOptimized": typeof optimized_socialPostsOptimized;
  paymentAttemptTypes: typeof paymentAttemptTypes;
  paymentAttempts: typeof paymentAttempts;
  performanceMetrics: typeof performanceMetrics;
  personas: typeof personas;
  postVariants: typeof postVariants;
  scheduledPosts: typeof scheduledPosts;
  "schema/ai": typeof schema_ai;
  "schema/analytics": typeof schema_analytics;
  "schema/auth": typeof schema_auth;
  "schema/billing": typeof schema_billing;
  "schema/monitoring": typeof schema_monitoring;
  "schema/payments": typeof schema_payments;
  "schema/pipeline": typeof schema_pipeline;
  "schema/social": typeof schema_social;
  "schema/users": typeof schema_users;
  schemaUpdated: typeof schemaUpdated;
  schema_backup: typeof schema_backup;
  socialAccounts: typeof socialAccounts;
  socialMetrics: typeof socialMetrics;
  socialPosts: typeof socialPosts;
  subscriptions: typeof subscriptions;
  syncClerkUsers: typeof syncClerkUsers;
  usage: typeof usage;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
