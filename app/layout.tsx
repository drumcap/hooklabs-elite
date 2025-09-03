import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import WebVitalsMonitor from "@/components/WebVitalsMonitor";

import { ClerkProvider } from '@clerk/nextjs'
import ConvexClientProvider from '@/components/ConvexClientProvider'
import { ClerkErrorBoundary } from '@/components/ClerkErrorBoundary'


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "HookLabs Elite - 소셜 미디어 자동화 플랫폼",
    template: "%s | HookLabs Elite"
  },
  description: "AI 기반 소셜 미디어 자동화 및 콘텐츠 관리 플랫폼. 페르소나 관리, 콘텐츠 생성, 스케줄링을 한 번에.",
  keywords: ["소셜미디어", "자동화", "AI", "콘텐츠", "관리", "페르소나", "스케줄링"],
  authors: [{ name: "HookLabs" }],
  creator: "HookLabs",
  publisher: "HookLabs",
  applicationName: "HookLabs Elite",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HookLabs Elite",
    startupImage: [
      "/apple-touch-startup-image-768x1004.png",
      {
        url: "/apple-touch-startup-image-1536x2008.png",
        media: "(device-width: 768px) and (device-height: 1024px)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "HookLabs Elite",
    title: {
      default: "HookLabs Elite - 소셜 미디어 자동화 플랫폼",
      template: "%s | HookLabs Elite"
    },
    description: "AI 기반 소셜 미디어 자동화 및 콘텐츠 관리 플랫폼",
    locale: "ko_KR",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "HookLabs Elite - 소셜 미디어 자동화 플랫폼",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: {
      default: "HookLabs Elite - 소셜 미디어 자동화 플랫폼",
      template: "%s | HookLabs Elite"
    },
    description: "AI 기반 소셜 미디어 자동화 및 콘텐츠 관리 플랫폼",
    images: ["/twitter-image.png"],
    creator: "@hooklabs",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  verification: {
    google: "google-site-verification-token",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "theme-color": "#000000",
    "msapplication-TileColor": "#000000",
    "msapplication-config": "/browserconfig.xml",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overscroll-none`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkErrorBoundary>
            <ClerkProvider 
              publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
              appearance={{
                elements: {
                  rootBox: "font-sans"
                }
              }}
              initialState={{
                signInRedirectUrl: '/dashboard',
                signUpRedirectUrl: '/dashboard',
              }}
            >
              <ConvexClientProvider>
                <ServiceWorkerRegister />
                <WebVitalsMonitor />
                {children}
              </ConvexClientProvider>
            </ClerkProvider>
          </ClerkErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
