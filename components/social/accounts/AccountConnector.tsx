"use client"

import { useState } from "react"
import { useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Twitter, 
  MessageCircle, 
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  ExternalLink,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  Link as LinkIcon,
  Unlock,
  Lock,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface AccountConnectorProps {
  onConnectionSuccess?: (platform: string) => void
  className?: string
}

interface PlatformConfig {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  color: string
  bgColor: string
  features: string[]
  requirements: string[]
  available: boolean
  comingSoon?: boolean
  oauth: {
    scopes: string[]
    permissions: string[]
  }
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "twitter",
    name: "Twitter / X",
    description: "트윗, 리트윗, 답글을 자동으로 게시하고 관리하세요",
    icon: Twitter,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    features: [
      "트윗 자동 게시",
      "스레드 게시 지원",
      "리트윗 및 답글",
      "실시간 분석"
    ],
    requirements: [
      "Twitter 계정 필요",
      "API 사용 권한 필요"
    ],
    available: true,
    oauth: {
      scopes: ["tweet.read", "tweet.write", "users.read"],
      permissions: [
        "트윗 읽기 및 쓰기",
        "사용자 프로필 정보 읽기",
        "팔로워 및 팔로잉 정보 읽기"
      ]
    }
  },
  {
    id: "threads",
    name: "Threads",
    description: "Meta의 새로운 소셜 플랫폼에서 콘텐츠를 공유하세요",
    icon: MessageCircle,
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    features: [
      "Threads 게시",
      "이미지 및 동영상",
      "해시태그 지원",
      "크로스 포스팅"
    ],
    requirements: [
      "Threads 계정 필요",
      "Instagram 계정 연동 필요"
    ],
    available: true,
    oauth: {
      scopes: ["threads_basic", "threads_content_publish"],
      permissions: [
        "Threads 게시물 작성",
        "기본 프로필 정보 읽기",
        "게시물 관리"
      ]
    }
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "전문적인 네트워크에서 콘텐츠를 공유하고 연결하세요",
    icon: Linkedin,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    features: [
      "LinkedIn 게시",
      "회사 페이지 지원",
      "전문 네트워킹",
      "비즈니스 분석"
    ],
    requirements: [
      "LinkedIn 계정 필요",
      "회사 페이지 관리 권한 (선택사항)"
    ],
    available: false,
    comingSoon: true,
    oauth: {
      scopes: ["r_liteprofile", "r_emailaddress", "w_member_social"],
      permissions: [
        "프로필 정보 읽기",
        "소셜 콘텐츠 게시",
        "회사 페이지 관리"
      ]
    }
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "시각적 콘텐츠로 더 많은 팔로워와 소통하세요",
    icon: Instagram,
    color: "text-pink-500",
    bgColor: "bg-pink-50 dark:bg-pink-900/20",
    features: [
      "피드 게시",
      "스토리 게시",
      "릴스 지원",
      "해시태그 최적화"
    ],
    requirements: [
      "Instagram 비즈니스 계정 필요",
      "Facebook 페이지 연동 필요"
    ],
    available: false,
    comingSoon: true,
    oauth: {
      scopes: ["instagram_basic", "instagram_content_publish"],
      permissions: [
        "Instagram 게시물 작성",
        "미디어 업로드",
        "인사이트 데이터 읽기"
      ]
    }
  }
]

function PlatformCard({ 
  platform, 
  onConnect, 
  isConnecting 
}: { 
  platform: PlatformConfig
  onConnect: (platformId: string) => void
  isConnecting: boolean
}) {
  const Icon = platform.icon
  
  const handleConnect = () => {
    if (!platform.available) {
      toast.info(`${platform.name}은 곧 지원 예정입니다!`)
      return
    }
    onConnect(platform.id)
  }

  return (
    <Card className={cn(
      "group hover:shadow-lg transition-all duration-200 cursor-pointer",
      !platform.available && "opacity-60"
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn("p-3 rounded-lg", platform.bgColor)}>
              <Icon className={cn("h-6 w-6", platform.color)} />
            </div>
            <div>
              <CardTitle className="text-lg">{platform.name}</CardTitle>
              <CardDescription className="text-sm">
                {platform.description}
              </CardDescription>
            </div>
          </div>
          {!platform.available && platform.comingSoon && (
            <Badge variant="outline" className="text-xs">
              곧 출시
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Features */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center">
            <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
            주요 기능
          </h4>
          <ul className="space-y-1">
            {platform.features.map((feature, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-center">
                <span className="w-1 h-1 rounded-full bg-muted-foreground mr-2" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Requirements */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center">
            <Info className="h-4 w-4 mr-1 text-blue-500" />
            필요사항
          </h4>
          <ul className="space-y-1">
            {platform.requirements.map((req, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-center">
                <span className="w-1 h-1 rounded-full bg-muted-foreground mr-2" />
                {req}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Permissions */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center">
            <Shield className="h-4 w-4 mr-1 text-yellow-500" />
            권한 요청
          </h4>
          <ul className="space-y-1">
            {platform.oauth.permissions.map((permission, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-center">
                <span className="w-1 h-1 rounded-full bg-muted-foreground mr-2" />
                {permission}
              </li>
            ))}
          </ul>
        </div>

        {/* Connect Button */}
        <Button 
          onClick={handleConnect}
          disabled={!platform.available || isConnecting}
          className="w-full"
          variant={platform.available ? "default" : "outline"}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              연결 중...
            </>
          ) : platform.available ? (
            <>
              <LinkIcon className="h-4 w-4 mr-2" />
              {platform.name} 연결하기
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              {platform.comingSoon ? "곧 출시 예정" : "사용 불가"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export function AccountConnector({ onConnectionSuccess, className }: AccountConnectorProps) {
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)
  
  // OAuth connection action
  const initiateOAuth = useAction(api.social.initiateOAuth)

  const handleConnect = async (platformId: string) => {
    setConnectingPlatform(platformId)
    
    try {
      const result = await initiateOAuth({ platform: platformId })
      
      if (result.authUrl) {
        // Redirect to OAuth URL
        window.location.href = result.authUrl
      } else {
        throw new Error("OAuth URL을 받지 못했습니다")
      }
    } catch (error: any) {
      console.error("OAuth 시작 오류:", error)
      toast.error(error.message || "계정 연결에 실패했습니다")
      setConnectingPlatform(null)
    }
  }

  const availablePlatforms = PLATFORMS.filter(p => p.available)
  const comingSoonPlatforms = PLATFORMS.filter(p => !p.available)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">소셜 계정 연결</h2>
        <p className="text-muted-foreground">
          다양한 소셜 미디어 플랫폼에 자동으로 콘텐츠를 게시하세요
        </p>
      </div>

      {/* Security Notice */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                보안 및 개인정보
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-200">
                모든 계정 연결은 OAuth 2.0 표준을 사용하며, 귀하의 로그인 정보는 저장되지 않습니다. 
                언제든지 연결을 해제할 수 있고, 필요한 권한만 요청합니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Platforms */}
      {availablePlatforms.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">사용 가능한 플랫폼</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availablePlatforms.map((platform) => (
              <PlatformCard
                key={platform.id}
                platform={platform}
                onConnect={handleConnect}
                isConnecting={connectingPlatform === platform.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Coming Soon Platforms */}
      {comingSoonPlatforms.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">곧 출시 예정</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comingSoonPlatforms.map((platform) => (
              <PlatformCard
                key={platform.id}
                platform={platform}
                onConnect={handleConnect}
                isConnecting={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>연결 도움말</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                연결 후 가능한 작업
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 자동 게시물 발행</li>
                <li>• 스케줄링 및 예약 게시</li>
                <li>• 여러 계정 동시 관리</li>
                <li>• 실시간 성과 분석</li>
                <li>• AI 기반 콘텐츠 최적화</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                주의사항
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 각 플랫폼의 이용약관을 준수해주세요</li>
                <li>• 스팸 또는 부적절한 콘텐츠 금지</li>
                <li>• API 사용량 제한이 적용될 수 있습니다</li>
                <li>• 계정 보안을 위해 정기적인 권한 확인</li>
                <li>• 문제 발생 시 즉시 연결 해제 권장</li>
              </ul>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">문제가 있으신가요?</p>
              <p className="text-sm text-muted-foreground">
                계정 연결에 문제가 있으면 고객지원팀에 문의해주세요.
              </p>
            </div>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              도움말 보기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}