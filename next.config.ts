import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // 기본 설정
  reactStrictMode: true,
  swcMinify: true,
  
  // 성능 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  
  // 이미지 최적화
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // 실험적 기능
  experimental: {
    // App Router 최적화
    optimizePackageImports: [
      '@radix-ui/react-avatar',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'lucide-react',
      '@tabler/icons-react',
      'framer-motion',
    ],
    
    // 서버 액션 최적화
    serverComponentsExternalPackages: ['@lemonsqueezy/lemonsqueezy.js'],
    
    // 메모리 최적화
    optimizeCss: true,
    
    // 번들 분석 (환경 변수로 제어)
    ...(process.env.ANALYZE === 'true' && {
      bundlePagesRouterDependencies: true,
    }),
  },
  
  // 웹팩 설정
  webpack: (config, { dev, isServer }) => {
    // 프로덕션에서 소스맵 최적화
    if (!dev && !isServer) {
      config.devtool = 'source-map';
    }
    
    // 번들 크기 최적화
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        common: {
          name: 'common',
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    };
    
    // 번들 분석기 설정
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html',
        })
      );
    }
    
    return config;
  },
  
  // 환경 변수
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // 리다이렉트 설정
  async redirects() {
    return [
      // 이전 버전 호환성
      {
        source: '/old-dashboard',
        destination: '/dashboard',
        permanent: true,
      },
      // SEO 최적화를 위한 슬래시 정규화
      {
        source: '/dashboard/',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
  
  // 리라이트 설정 (프록시)
  async rewrites() {
    return [
      // Health check 별칭
      {
        source: '/healthz',
        destination: '/api/health'
      },
      {
        source: '/health',
        destination: '/api/health'
      },
      // API 프록시 (개발 환경에서 CORS 우회)
      ...(process.env.NODE_ENV === 'development' ? [
        {
          source: '/api/proxy/:path*',
          destination: 'http://localhost:3001/api/:path*',
        },
      ] : []),
    ];
  },
  
  // 헤더 설정 (보안)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // 보안 헤더
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          // HSTS (HTTPS 강제)
          ...(process.env.NODE_ENV === 'production' ? [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains'
            }
          ] : []),
          // CSP (Content Security Policy)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.clerk.dev https://www.googletagmanager.com https://cdn.mixpanel.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.convex.cloud https://api.lemonsqueezy.com https://clerk.dev https://www.google-analytics.com https://api.mixpanel.com wss://*.convex.cloud",
              "frame-src 'self' https://js.clerk.dev https://checkout.lemonsqueezy.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
      // 정적 자산 캐싱
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      // 이미지 캐싱
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600'
          }
        ]
      }
    ];
  },
  
  // 정적 파일 생성 제외
  staticPageGenerationTimeout: 1000
};

// Sentry 설정 적용 (프로덕션에서만)
const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

export default process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
