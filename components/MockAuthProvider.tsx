'use client'

import React, { createContext, useContext, useState } from 'react'

interface MockUser {
  id: string
  firstName: string | null
  lastName: string | null
  emailAddresses: Array<{ emailAddress: string }>
  imageUrl: string
}

interface MockAuthContextType {
  isLoaded: boolean
  isSignedIn: boolean
  user: MockUser | null
  signIn: () => void
  signOut: () => void
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined)

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false)
  
  const mockUser: MockUser = {
    id: 'mock-user-123',
    firstName: '테스트',
    lastName: '사용자',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    imageUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=테스트사용자'
  }

  const value: MockAuthContextType = {
    isLoaded: true,
    isSignedIn,
    user: isSignedIn ? mockUser : null,
    signIn: () => setIsSignedIn(true),
    signOut: () => setIsSignedIn(false)
  }

  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(MockAuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within MockAuthProvider')
  }
  return context
}

export function useUser() {
  const { user } = useAuth()
  return { user, isLoaded: true }
}

export function SignInButton({ children }: { children: React.ReactNode }) {
  const { signIn } = useAuth()
  return (
    <button onClick={signIn} className="text-blue-600 hover:text-blue-800">
      {children}
    </button>
  )
}

export function SignUpButton({ children }: { children: React.ReactNode }) {
  const { signIn } = useAuth()
  return (
    <button onClick={signIn} className="text-green-600 hover:text-green-800">
      {children}
    </button>
  )
}

export function UserButton() {
  const { user, signOut } = useAuth()
  
  if (!user) return null
  
  return (
    <div className="flex items-center gap-2">
      <img 
        src={user.imageUrl} 
        alt={`${user.firstName} ${user.lastName}`}
        className="w-8 h-8 rounded-full"
      />
      <span>{user.firstName} {user.lastName}</span>
      <button 
        onClick={signOut}
        className="text-red-600 hover:text-red-800 text-sm"
      >
        로그아웃
      </button>
    </div>
  )
}