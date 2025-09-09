'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

export default function TestClerkPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Clerk 테스트 페이지</h1>
      <div className="space-y-4">
        <div>
          <p className="text-lg font-medium">Clerk 인증 상태:</p>
          <ul className="list-disc ml-6">
            <li>로드됨: {isLoaded ? '✅' : '❌'}</li>
            <li>로그인 상태: {isSignedIn ? '✅ 로그인됨' : '❌ 로그아웃됨'}</li>
            <li>사용자: {user ? `${user.firstName} ${user.lastName} (${user.emailAddresses?.[0]?.emailAddress})` : '없음'}</li>
          </ul>
        </div>

        <div className="flex gap-4">
          {!isSignedIn ? (
            <>
              <SignInButton>로그인</SignInButton>
              <SignUpButton>회원가입</SignUpButton>
            </>
          ) : (
            <UserButton />
          )}
        </div>
        
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">🔐 실제 Clerk 인증</h3>
          <p className="text-blue-700 mb-2">
            이제 실제 Clerk 인증 시스템을 사용합니다.
          </p>
          <ul className="text-blue-700 space-y-1">
            <li>• 로그인 버튼 클릭 → Clerk 로그인 페이지로 이동</li>
            <li>• 실제 이메일/패스워드 또는 소셜 로그인</li>
            <li>• 실제 사용자 프로필 정보 표시</li>
            <li>• 완전한 인증 플로우</li>
          </ul>
        </div>
        
        {!isLoaded && (
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-2">⚠️ DNS 문제 발생 시</h3>
            <p className="text-yellow-700">
              만약 Clerk가 로드되지 않으면 DNS 설정을 1.1.1.1 또는 8.8.8.8로 변경해주세요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}