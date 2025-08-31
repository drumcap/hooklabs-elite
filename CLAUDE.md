# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Next.js 15 SaaS starter template with integrated authentication (Clerk), real-time database (Convex), and subscription billing (Lemon Squeezy).

## Development Commands

### Core Development
- `npm run dev` - Start development server with Turbopack on http://localhost:3000
- `npm run build` - Build production bundle
- `npm start` - Start production server
- `npm run lint` - Run Next.js linting

### Convex Development
- `npx convex dev` - Start Convex development server (required for database)
- Run this in a separate terminal alongside `npm run dev`

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
- All database operations in `convex/` directory

#### Payment Integration
1. Lemon Squeezy handles subscription management and checkout
2. Custom pricing component in `components/pricing-table.tsx`
3. Payment-gated content uses `<PaymentGate>` component
4. Webhook events update subscription and payment status in Convex
5. Customer portal for subscription management

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
├── schema.ts         # Database schema
├── users.ts          # User CRUD operations
├── subscriptions.ts  # Subscription queries/mutations
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

## Shadcn Component Installation Rules
When installing shadcn/ui components:
- ALWAYS use `bunx --bun shadcn@latest add [component-name]` instead of `npx`
- If dependency installation fails, manually install with `bun install [dependency-name]`
- Check components.json for existing configuration before installing
- Verify package.json after installation to ensure dependencies were added
- Multiple components can be installed at once: `bunx --bun shadcn@latest add button card drawer`
