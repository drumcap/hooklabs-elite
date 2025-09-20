'use client'

import React from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from "next-themes"
import {
  Authenticated,
  Unauthenticated,
  AuthLoading
} from "convex/react"
import {
  SignInButton,
  SignUpButton,
  UserButton
} from "@clerk/nextjs"

interface AuthSectionProps {
  isMounted: boolean
  isScrolled: boolean
}

export const AuthSection: React.FC<AuthSectionProps> = ({ isMounted, isScrolled }) => {
  const { theme } = useTheme()
  const [dark, setDark] = React.useState<any>(null)

  const appearance = React.useMemo(() => ({
    baseTheme: theme === "dark" && dark ? dark : undefined,
  }), [theme, dark])

  React.useEffect(() => {
    // Load dark theme dynamically
    import('@clerk/themes').then(mod => {
      setDark(mod.dark)
    })
  }, [])

  if (!isMounted) {
    return (
      <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
        <div className="animate-pulse w-16 h-8 bg-muted rounded" />
        <div className="animate-pulse w-20 h-8 bg-muted rounded" />
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
      <AuthLoading>
        <div className="flex items-center justify-center">
          <Loader2 className="size-8 p-2 animate-spin" />
        </div>
      </AuthLoading>

      <Authenticated>
        <Button asChild size="sm">
          <Link href="/dashboard">
            <span>Dashboard</span>
          </Link>
        </Button>
        <UserButton appearance={appearance} />
      </Authenticated>

      <Unauthenticated>
        <SignInButton mode="modal">
          <Button
            asChild
            variant="outline"
            size="sm"
            className={cn(isScrolled && 'lg:hidden')}>
            <Link href="#">
              <span>Login</span>
            </Link>
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button
            asChild
            size="sm"
            className={cn(isScrolled && 'lg:hidden')}>
            <Link href="#">
              <span>Sign Up</span>
            </Link>
          </Button>
        </SignUpButton>
        <SignUpButton mode="modal">
          <Button
            asChild
            size="sm"
            className={cn(isScrolled ? 'lg:inline-flex' : 'hidden')}>
            <Link href="#">
              <span>Get Started</span>
            </Link>
          </Button>
        </SignUpButton>
      </Unauthenticated>
    </div>
  )
}