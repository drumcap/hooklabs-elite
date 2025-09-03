# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Next.js 15 SaaS starter template with integrated authentication (Clerk), real-time database (Convex), and subscription billing (Lemon Squeezy). The project has evolved into an enterprise-grade billing system with comprehensive usage tracking, credit management, and coupon systems.

## Development Commands

### Core Development
- `bun dev` - Start development server with Turbopack on http://localhost:3000
- `bun build` - Build production bundle
- `bun start` - Start production server
- `bun lint` - Run Next.js linting
- `bun type-check` - TypeScript type checking

### Testing Commands
- `bun test` - Run all tests with Vitest
- `bun test:unit` - Run unit tests (Convex functions)
- `bun test:integration` - Run integration tests (API endpoints)
- `bun test:components` - Run component tests (React components)
- `bun test:e2e` - Run end-to-end tests with Playwright
- `bun test:coverage` - Run tests with coverage report
- `bun test:watch` - Run tests in watch mode
- `bun test:ui` - Run tests with Vitest UI

### Convex Development
- `bunx convex dev` - Start Convex development server (required for database)
- Run this in a separate terminal alongside `bun dev`

## Architecture Overview

### Tech Stack
- **Next.js 15** with App Router and Turbopack
- **Convex** for real-time database and serverless functions
- **Clerk** for authentication and user management
- **Lemon Squeezy** for subscription payments and billing
- **TailwindCSS v4** with custom UI components (shadcn/ui)
- **TypeScript** throughout

### Key Architectural Patterns

#### Authentication Flow
1. Clerk handles all authentication via `middleware.ts`
2. JWT tokens are configured with "convex" template in Clerk dashboard
3. Users are synced to Convex via webhooks at `/api/clerk-users-webhook`
4. Protected routes redirect unauthenticated users to sign-in

#### Database Architecture
- **Convex** provides real-time sync and serverless functions
- Schema defined in `convex/schema.ts`:
  - `users` table: Synced from Clerk (externalId maps to Clerk ID, added lemonSqueezyCustomerId)
  - `subscriptions` table: Tracks Lemon Squeezy subscription data
  - `payments` table: Records payment/order information
  - `checkouts` table: Tracks checkout sessions
  - `licenses` table: License key management (optional)
  - `paymentAttempts` table: Legacy table (to be phased out)
  - `usage` table: **NEW** - Comprehensive usage tracking with timestamps and metadata
  - `credits` table: **NEW** - Credit management system with expiration dates
  - `coupons` table: **NEW** - Coupon system with validation and usage tracking
- All database operations in `convex/` directory with enhanced business logic

#### Payment Integration
1. Lemon Squeezy handles subscription management and checkout
2. Custom pricing component in `components/pricing-table.tsx`
3. Payment-gated content uses `<PaymentGate>` component
4. Webhook events update subscription and payment status in Convex
5. Customer portal for subscription management
6. **NEW**: Enterprise-grade billing with usage tracking and credit system
7. **NEW**: Coupon management for promotional campaigns

### Project Structure
```
app/
├── (landing)/         # Public landing page components
├── api/lemonsqueezy/  # Lemon Squeezy API routes
│   ├── checkout/      # Checkout creation
│   ├── portal/        # Customer portal access
│   └── subscription/  # Subscription management
├── dashboard/         # Protected dashboard area
│   └── payment-gated/ # Subscription-only content
├── layout.tsx         # Root layout with providers
└── middleware.ts      # Auth protection

components/
├── ui/               # shadcn/ui components
├── pricing-table.tsx # Lemon Squeezy pricing component
├── payment-gate.tsx  # Access control component
├── subscription-manager.tsx # Subscription management UI
└── ConvexClientProvider.tsx

convex/
├── schema.ts         # Database schema with enhanced billing tables
├── users.ts          # User CRUD operations
├── subscriptions.ts  # Subscription queries/mutations
├── usage.ts          # **NEW** - Usage tracking and analytics
├── credits.ts        # **NEW** - Credit management system
├── coupons.ts        # **NEW** - Coupon validation and management
├── lemonSqueezyTypes.ts # Webhook data types
├── lemonSqueezyWebhooks.ts # Webhook handlers
├── paymentAttempts.ts # Legacy payment tracking
├── http.ts           # Webhook endpoints
└── auth.config.ts    # JWT configuration
```

## Key Integration Points

### Environment Variables Required
- `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` (from Clerk JWT template)
- `CLERK_WEBHOOK_SECRET` (set in Convex dashboard)
- `LEMONSQUEEZY_API_KEY` (from Lemon Squeezy dashboard)
- `LEMONSQUEEZY_STORE_ID` (from Lemon Squeezy dashboard)
- `LEMONSQUEEZY_WEBHOOK_SECRET` (set in Convex dashboard)
- `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL` (optional, for custom checkout flow)

### Webhook Configuration
#### Clerk webhooks:
- Endpoint: `{your_domain}/convex/clerk-users-webhook`
- Events: `user.created`, `user.updated`, `user.deleted`

#### Lemon Squeezy webhooks:
- Endpoint: `{your_domain}/convex/lemonsqueezy-webhook`
- Events: 
  - `subscription_created`, `subscription_updated`, `subscription_cancelled`
  - `subscription_resumed`, `subscription_expired`, `subscription_paused`
  - `subscription_payment_success`, `subscription_payment_failed`
  - `order_created`, `order_refunded`
  - `license_key_created`, `license_key_updated`

### Real-time Data Flow
1. UI components use Convex hooks (`useQuery`, `useMutation`)
2. Convex provides automatic real-time updates
3. Authentication context from `useAuth()` (Clerk)
4. User data synced between Clerk and Convex
5. Subscription status updates trigger real-time UI changes
6. Lemon Squeezy webhooks update Convex data in real-time

## Enterprise Billing Features

### Usage Tracking System
- Comprehensive usage analytics with `convex/usage.ts`
- Real-time usage monitoring and reporting
- Configurable usage limits per subscription tier
- Historical usage data for analytics

### Credit Management System
- Flexible credit-based billing with `convex/credits.ts`
- Automatic credit deduction for usage
- Credit expiration and renewal policies
- Admin credit management interface

### Coupon System
- Advanced coupon management with `convex/coupons.ts`
- Percentage and fixed amount discounts
- Usage limits and expiration dates
- Coupon validation and redemption tracking

### Testing Infrastructure
- Comprehensive test suite with Vitest and Playwright
- Unit tests for business logic (80% coverage target)
- Integration tests for API endpoints
- E2E tests for user workflows
- Component tests for React UI elements

## Shadcn Component Installation Rules
When installing shadcn/ui components:
- ALWAYS use `bunx --bun shadcn@latest add [component-name]` instead of `npx`
- If dependency installation fails, manually install with `bun install [dependency-name]`
- Check components.json for existing configuration before installing
- Verify package.json after installation to ensure dependencies were added
- Multiple components can be installed at once: `bunx --bun shadcn@latest add button card drawer`
