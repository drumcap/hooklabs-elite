# HookLabs Elite - Enterprise SaaS Platform

A sophisticated, enterprise-grade SaaS platform built with Next.js 15, featuring advanced billing systems, comprehensive usage tracking, and credit management. Built for scale with Convex real-time database, Clerk authentication, and Lemon Squeezy payments.

[🌐 Live Demo](https://elite-next-clerk-convex-starter.vercel.app/) – Try the app in your browser!


## Features

### 🚀 Core Platform Features
- 🚀 **Next.js 15 with App Router** - Latest React framework with server components
- ⚡️ **Turbopack** - Ultra-fast development with hot module replacement
- 🎨 **TailwindCSS v4** - Modern utility-first CSS with custom design system
- 🔐 **Clerk Authentication** - Complete user management with social logins
- 💳 **Lemon Squeezy** - Modern subscription billing and payment processing
- 🗄️ **Convex Real-time Database** - Serverless backend with real-time sync

### 🏢 Enterprise Billing & Management
- 📊 **Advanced Usage Tracking** - Real-time analytics and monitoring
- 💎 **Credit Management System** - Flexible credit-based billing with expiration
- 🎫 **Coupon Management** - Promotional campaigns with usage limits
- 📈 **Business Intelligence** - Comprehensive reporting and analytics
- 🔄 **Subscription Lifecycle** - Complete subscription management

### 🛡️ Security & Quality
- 🛡️ **Protected Routes** - Authentication-based route protection
- 💰 **Payment Gating** - Subscription-based content access
- 🧪 **Comprehensive Testing** - Unit, integration, and E2E test coverage
- 🔒 **Enterprise Security** - Production-ready security measures

### 🎨 User Experience
- 🎭 **Beautiful 404 Page** - Custom animated error page
- 🌗 **Dark/Light Theme** - System-aware theme switching
- 📱 **Responsive Design** - Mobile-first approach with modern layouts
- ✨ **Custom Animations** - React Bits and Framer Motion effects
- 🧩 **shadcn/ui Components** - Modern component library with Radix UI
- 📊 **Interactive Dashboard** - Complete admin interface with charts
- �� **Webhook Integration** - Automated user and payment sync
- 🚢 **Vercel Ready** - One-click deployment

### 🔧 Development & Deployment
- 🐳 **Docker Support** - Containerized deployment options
- 📊 **Monitoring & Analytics** - Built-in performance monitoring
- 🧪 **Testing Infrastructure** - Comprehensive test coverage with Vitest & Playwright

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TailwindCSS v4** - Utility-first CSS framework
- **shadcn/ui** - Modern component library
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Smooth animations and transitions
- **Motion Primitives** - Advanced animation components
- **Lucide React & Tabler Icons** - Beautiful icon libraries
- **Recharts** - Data visualization components
- **React Bits** - Custom animation components

### Backend & Services
- **Convex** - Real-time database and serverless functions
- **Clerk** - Authentication and user management
- **Lemon Squeezy** - Subscription billing and payment processing
- **Svix** - Webhook handling and validation

### Development & Deployment
- **TypeScript** - Type safety throughout
- **Vercel** - Deployment platform
- **Turbopack** - Fast build tool

### Testing & Quality Assurance
- **Vitest** - Unit and integration testing framework
- **Playwright** - End-to-end testing automation
- **React Testing Library** - Component testing utilities
- **Happy DOM** - Lightweight DOM implementation for testing
- **MSW (Mock Service Worker)** - API mocking for testing
- **Coverage Reports** - Comprehensive code coverage analysis

## Getting Started

### Prerequisites

- Node.js 18+ 
- Clerk account for authentication
- Convex account for database
- Lemon Squeezy account for payment processing

### Installation

1. Download and set up the starter template:

```bash
# Download the template files to your project directory
# Then navigate to your project directory and install dependencies
npm install #or pnpm / yarn / bun
```

2. Set up your environment variables:

```bash
cp .env.example .env.local
```

3. Configure your environment variables in `.env.local`:

3a. run `npx convex dev` or `bunx convex dev` to configure your convex database variables

```bash
# Clerk Authentication
# Get these from your Clerk dashboard at https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here

# Clerk Frontend API URL (from JWT template - see step 5)
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-clerk-frontend-api-url.clerk.accounts.dev

# Clerk Redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Lemon Squeezy Configuration
# Get these from your Lemon Squeezy dashboard at https://app.lemonsqueezy.com
LEMONSQUEEZY_API_KEY=your_lemon_squeezy_api_key_here
LEMONSQUEEZY_STORE_ID=your_store_id_here
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://your-store.lemonsqueezy.com/checkout

# Note: LEMONSQUEEZY_WEBHOOK_SECRET should be set in your Convex dashboard environment variables
# Do not add it to this .env.local file for security reasons
```

4. Initialize Convex:

```bash
npx convex dev
```

5. Set up Clerk JWT Template:
   - Go to your Clerk dashboard
   - Navigate to JWT Templates
   - Create a new template with name "convex"
   - Copy the Issuer URL - this becomes your `NEXT_PUBLIC_CLERK_FRONTEND_API_URL`
   - Add this URL to both your `.env.local` and Convex environment variables

6. Set up Convex environment variables in your Convex dashboard:

```bash
# In Convex Dashboard Environment Variables
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-clerk-frontend-api-url.clerk.accounts.dev
```

7. Set up Clerk webhooks (in Clerk Dashboard, not Convex):
   - Go to your Clerk dashboard → Webhooks section
   - Create a new endpoint with URL: `https://your-deployed-app.com/api/clerk-users-webhook`
   - Enable these events:
     - `user.created` - Syncs new users to Convex
     - `user.updated` - Updates user data in Convex
     - `user.deleted` - Removes users from Convex
     - `paymentAttempt.updated` - Tracks subscription payments
   - Copy the webhook signing secret (starts with `whsec_`)
   - Add it to your Convex dashboard environment variables as `CLERK_WEBHOOK_SECRET`
   
   **Note**: The webhook URL `/clerk-users-webhook` is handled by Convex's HTTP router, not Next.js. Svix is used to verify webhook signatures for security.

8. Configure Clerk Billing:
   - Set up your pricing plans in Clerk dashboard
   - Configure payment methods and billing settings

### Development

Start the development server:

```bash
npm run dev
```

Your application will be available at `http://localhost:3000`.

### Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit           # Unit tests (Convex functions & utilities)
npm run test:integration    # Integration tests (API endpoints & webhooks)  
npm run test:components     # Component tests (React components)
npm run test:e2e           # End-to-end tests (User workflows)

# Advanced testing options
npm run test:coverage       # Generate coverage reports
npm run test:watch         # Run tests in watch mode
npm run test:ui            # Interactive test UI
npm run test:e2e:headed    # E2E tests with browser UI
npm run test:e2e:debug     # E2E tests in debug mode
```

The testing infrastructure includes:
- **80%+ code coverage** target for business logic
- **Automated CI/CD testing** on every pull request
- **Real-time test monitoring** with detailed reporting
- **Cross-browser E2E testing** with Playwright

## Architecture

### Key Routes
- `/` - Beautiful landing page with pricing
- `/dashboard` - Protected user dashboard
- `/dashboard/payment-gated` - Subscription-protected content
- `/clerk-users-webhook` - Clerk webhook handler

### Authentication Flow
- Seamless sign-up/sign-in with Clerk
- Automatic user sync to Convex database
- Protected routes with middleware
- Social login support
- Automatic redirects to dashboard after auth

### Payment Flow
- Custom Clerk pricing table component
- Subscription-based access control
- Real-time payment status updates
- Webhook-driven payment tracking

### Database Schema
```typescript
// Users table - Enhanced with billing integration
users: {
  name: string,
  externalId: string, // Clerk user ID
  lemonSqueezyCustomerId?: string // Billing integration
}

// Enterprise billing tables
usage: {
  userId: Id<"users">,
  feature: string,
  amount: number,
  timestamp: number,
  metadata?: any
}

credits: {
  userId: Id<"users">,
  amount: number,
  expiresAt?: number,
  source: string, // "purchase" | "bonus" | "refund"
  isActive: boolean
}

coupons: {
  code: string,
  discountType: "percentage" | "fixed_amount",
  discountValue: number,
  usageLimit?: number,
  usedCount: number,
  expiresAt?: number,
  isActive: boolean
}

// Subscription and payment tracking
subscriptions: {
  userId: Id<"users">,
  lemonSqueezySubscriptionId: string,
  status: string,
  planName: string,
  // ... subscription details
}
```

## Project Structure

```
├── app/
│   ├── (landing)/          # Landing page components
│   │   ├── hero-section.tsx
│   │   ├── features-one.tsx
│   │   ├── pricing.tsx
│   │   └── ...
│   ├── dashboard/          # Protected dashboard
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── payment-gated/
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── not-found.tsx       # Custom 404 page
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── custom-clerk-pricing.tsx
│   ├── theme-provider.tsx
│   └── ...
├── convex/                 # Enterprise backend functions
│   ├── schema.ts           # Enhanced database schema
│   ├── users.ts            # User management
│   ├── usage.ts            # Usage tracking & analytics
│   ├── credits.ts          # Credit management system
│   ├── coupons.ts          # Coupon validation & management
│   ├── subscriptions.ts    # Subscription lifecycle
│   ├── lemonSqueezyWebhooks.ts # Payment webhook handlers
│   └── http.ts             # HTTP endpoint routing
├── lib/
│   └── utils.ts            # Utility functions
└── middleware.ts           # Route protection
```

## Key Components

### Landing Page
- **Hero Section** - Animated hero with CTAs
- **Features Section** - Interactive feature showcase
- **Pricing Table** - Custom Clerk billing integration
- **Testimonials** - Social proof section
- **FAQ Section** - Common questions
- **Footer** - Links and information

### Dashboard
- **Sidebar Navigation** - Collapsible sidebar with user menu
- **Interactive Charts** - Data visualization with Recharts
- **Data Tables** - Sortable and filterable tables
- **Payment Gating** - Subscription-based access control

### Animations & Effects
- **Splash Cursor** - Interactive cursor effects
- **Animated Lists** - Smooth list animations
- **Progressive Blur** - Modern blur effects
- **Infinite Slider** - Continuous scrolling elements

## Theme Customization

The starter kit includes a fully customizable theme system. You can customize colors, typography, and components using:

- **Theme Tools**: [tweakcn.com](https://tweakcn.com/editor/theme?tab=typography), [themux.vercel.app](https://themux.vercel.app/shadcn-themes), or [ui.jln.dev](https://ui.jln.dev/)
- **Global CSS**: Modify `app/globals.css` for custom styling
- **Component Themes**: Update individual component styles in `components/ui/`

## Environment Variables

### Required for .env.local

- `CONVEX_DEPLOYMENT` - Your Convex deployment URL
- `NEXT_PUBLIC_CONVEX_URL` - Your Convex client URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` - Clerk frontend API URL (from JWT template)
- `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` - Redirect after sign in
- `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` - Redirect after sign up
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` - Fallback redirect for sign in
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` - Fallback redirect for sign up

### Required for Convex Dashboard

- `CLERK_WEBHOOK_SECRET` - Clerk webhook secret (set in Convex dashboard)
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` - Clerk frontend API URL (set in Convex dashboard)

## 🚀 Production Deployment

### Quick Deployment (Vercel + GitHub Actions)

1. **Fork/Clone** this repository
2. **Connect to Vercel** - Import project from GitHub
3. **Set environment variables** in Vercel dashboard
4. **Push to main branch** - Automatic deployment via GitHub Actions

### Complete Production Setup

For a full production-ready deployment with monitoring, security, and CI/CD:

📚 **[View Complete Deployment Guide →](docs/deployment/README.md)**

Key features included:
- ✅ **Automated CI/CD** with GitHub Actions
- ✅ **Multi-environment** setup (dev/staging/prod)
- ✅ **Health monitoring** with Sentry error tracking
- ✅ **Performance monitoring** with Web Vitals
- ✅ **Security hardening** with CSP, Rate Limiting, DDoS protection
- ✅ **Docker containerization** for flexibility
- ✅ **Comprehensive logging** with structured logs
- ✅ **Real-time analytics** with Google Analytics & Mixpanel

### Environment-Specific Guides

- 🛠️ **[Environment Setup Guide](docs/deployment/environment-setup.md)** - Detailed configuration for each environment
- 📊 **[Monitoring & Operations Guide](docs/deployment/monitoring-guide.md)** - Complete monitoring and alerting setup

### Quick Commands

```bash
# Development
npm run dev                    # Start dev server
npm run docker:dev            # Run with Docker (dev mode)

# Testing  
npm run test                   # All tests
npm run test:e2e              # End-to-end tests
npm run security-audit        # Security scan

# Production Build
npm run build                  # Production build
npm run build:analyze         # Bundle analysis
npm run docker:prod           # Docker production build

# Health & Monitoring
npm run health-check          # Test health endpoint
npm run lighthouse           # Performance audit
```

### Production Checklist

Before going live, ensure:

- [ ] **Environment variables** configured in Vercel
- [ ] **Convex production** deployment created
- [ ] **Clerk production** instance configured
- [ ] **Lemon Squeezy** live mode enabled  
- [ ] **Custom domain** connected with SSL
- [ ] **Sentry error tracking** configured
- [ ] **Health monitoring** alerts setup
- [ ] **Backup strategy** implemented
- [ ] **Security headers** configured
- [ ] **Performance optimization** completed

### Architecture Overview

```
Production Stack:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel CDN    │    │ GitHub Actions  │    │    Sentry       │
│   (Frontend)    │    │    (CI/CD)      │    │ (Monitoring)    │  
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │◄──►│ Convex Backend  │    │ Upstash Redis   │
│    (Server)     │    │  (Serverless)   │    │   (Caching)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Performance Optimizations

Built-in production optimizations:
- **Advanced caching** strategies with Redis
- **Image optimization** with Next.js Image component
- **Bundle splitting** for optimal loading
- **CDN integration** via Vercel Edge Network
- **Database query optimization** with Convex indexing
- **Rate limiting** to prevent abuse

### Security Features

Production security measures:
- **Content Security Policy** (CSP) headers
- **Rate limiting** with Redis-backed counters  
- **DDoS protection** with automated IP blocking
- **XSS protection** with sanitized inputs
- **CSRF protection** with SameSite cookies
- **Secure headers** (HSTS, X-Frame-Options, etc.)

### Manual Deployment

Build and deploy manually:

```bash
# Build for production
npm run build

# Test production build locally
npm start

# Deploy with Vercel CLI
npx vercel --prod
```

## Customization

### Styling
- Modify `app/globals.css` for global styles
- Update TailwindCSS configuration
- Customize component themes in `components/ui/`

### Branding
- Update logo in `components/logo.tsx`
- Modify metadata in `app/layout.tsx`
- Customize color scheme in CSS variables

### Features
- Add new dashboard pages in `app/dashboard/`
- Extend database schema in `convex/schema.ts`
- Create custom components in `components/`

## Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Why Starter.diy?

**THE EASIEST TO SET UP. EASIEST IN TERMS OF CODE.**

- ✅ **Clerk + Convex + Clerk Billing** make it incredibly simple
- ✅ **No complex payment integrations** - Clerk handles everything
- ✅ **Real-time user sync** - Webhooks work out of the box
- ✅ **Beautiful UI** - Tailark.com inspired landing page blocks
- ✅ **Production ready** - Authentication, payments, and database included
- ✅ **Type safe** - Full TypeScript support throughout

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

---

**Stop rebuilding the same foundation over and over.** Starter.diy eliminates weeks of integration work by providing a complete, production-ready SaaS template with authentication, payments, and real-time data working seamlessly out of the box.

Built with ❤️ using Next.js 15, Convex, Clerk, and modern web technologies.
