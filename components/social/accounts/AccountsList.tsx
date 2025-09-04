"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { 
  Twitter, 
  MessageCircle,
  Linkedin,
  Instagram,
  MoreVertical,
  Settings,
  Trash2,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  BarChart3,
  Zap,
  Shield,
  Loader2,
  Plus,
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Id } from "@/convex/_generated/dataModel"

interface AccountsListProps {
  onAddAccount?: () => void
  className?: string
}

interface SocialAccount {
  _id: Id<"socialAccounts">
  userId: Id<"users">
  platform: string
  accountId: string
  username: string
  displayName: string
  profileImage?: string
  followers?: number
  following?: number
  postsCount?: number
  verificationStatus?: string
  isActive: boolean
  lastSyncedAt: string
  createdAt: string
  updatedAt: string
}

const PLATFORM_CONFIG = {
  twitter: {
    name: "Twitter",
    icon: Twitter,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/20"
  },
  threads: {
    name: "Threads",
    icon: MessageCircle,
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-900/20"
  },
  linkedin: {
    name: "LinkedIn",
    icon: Linkedin,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20"
  },
  instagram: {
    name: "Instagram",
    icon: Instagram,
    color: "text-pink-500",
    bgColor: "bg-pink-50 dark:bg-pink-900/20"
  }
}

function AccountCard({ 
  account, 
  onToggleActive, 
  onRefresh, 
  onDisconnect,
  isLoading 
}: {
  account: SocialAccount
  onToggleActive: (accountId: Id<"socialAccounts">) => void
  onRefresh: (accountId: Id<"socialAccounts">) => void
  onDisconnect: (accountId: Id<"socialAccounts">) => void
  isLoading: boolean
}) {
  const platformConfig = PLATFORM_CONFIG[account.platform as keyof typeof PLATFORM_CONFIG]
  const Icon = platformConfig?.icon || MessageCircle
  
  const lastSynced = new Date(account.lastSyncedAt)
  const isRecentlySync = Date.now() - lastSynced.getTime() < 60 * 60 * 1000 // 1 hour
  
  const formatNumber = (num?: number) => {
    if (!num) return "0"
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getVerificationBadge = () => {
    if (account.verificationStatus === "verified") {
      return (
        <CheckCircle className="h-4 w-4 text-blue-500" />
      )
    }
    return null
  }

  const getSyncStatus = () => {
    if (isRecentlySync) {
      return {
        color: "text-green-600",
        icon: CheckCircle,
        text: "최신"
      }
    } else {
      return {
        color: "text-yellow-600",
        icon: Clock,
        text: "동기화 필요"
      }
    }
  }

  const syncStatus = getSyncStatus()
  const SyncIcon = syncStatus.icon

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              {account.profileImage ? (
                <img 
                  src={account.profileImage} 
                  alt={account.displayName}
                  className="object-cover" 
                />
              ) : (
                <div className={cn("flex items-center justify-center text-white font-semibold", platformConfig?.bgColor)}>
                  <Icon className={cn("h-6 w-6", platformConfig?.color)} />
                </div>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-base truncate">{account.displayName}</h3>
                {getVerificationBadge()}
              </div>
              <p className="text-sm text-muted-foreground">@{account.username}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Icon className={cn("h-4 w-4", platformConfig?.color)} />
                <span className="text-sm font-medium">{platformConfig?.name}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={account.isActive}
              onCheckedChange={() => onToggleActive(account._id)}
              disabled={isLoading}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isLoading}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onRefresh(account._id)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  정보 새로고침
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  계정 설정
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  프로필 보기
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDisconnect(account._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  연결 해제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold">{formatNumber(account.followers)}</p>
            <p className="text-xs text-muted-foreground">팔로워</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold">{formatNumber(account.following)}</p>
            <p className="text-xs text-muted-foreground">팔로잉</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold">{formatNumber(account.postsCount)}</p>
            <p className="text-xs text-muted-foreground">게시물</p>
          </div>
        </div>

        <Separator />

        {/* Status & Last Sync */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={cn(
              "flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium",
              account.isActive 
                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                account.isActive ? "bg-green-500" : "bg-gray-400"
              )} />
              <span>{account.isActive ? "활성" : "비활성"}</span>
            </div>
          </div>
          
          <div className={cn("flex items-center space-x-1 text-xs", syncStatus.color)}>
            <SyncIcon className="h-3 w-3" />
            <span>{syncStatus.text}</span>
          </div>
        </div>

        {/* Last Sync Time */}
        <div className="text-xs text-muted-foreground">
          마지막 동기화: {lastSynced.toLocaleString('ko-KR')}
        </div>

        {/* Connection Health */}
        <div className="flex items-center space-x-2 text-xs">
          <Shield className="h-3 w-3 text-green-500" />
          <span className="text-green-600">연결 상태 양호</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function AccountsList({ onAddAccount, className }: AccountsListProps) {
  const [actionLoading, setActionLoading] = useState<Id<"socialAccounts"> | null>(null)

  // Query social accounts
  const socialAccounts = useQuery(api.socialAccounts.list, {}) as SocialAccount[] | undefined

  // Mutations
  const toggleActive = useMutation(api.socialAccounts.toggleActive)
  const refreshAccount = useMutation(api.socialAccounts.refresh)
  const disconnectAccount = useMutation(api.socialAccounts.disconnect)

  const handleToggleActive = async (accountId: Id<"socialAccounts">) => {
    setActionLoading(accountId)
    try {
      await toggleActive({ accountId })
      toast.success("계정 상태가 변경되었습니다.")
    } catch (error: any) {
      console.error("계정 상태 변경 오류:", error)
      toast.error(error.message || "계정 상태 변경에 실패했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRefresh = async (accountId: Id<"socialAccounts">) => {
    setActionLoading(accountId)
    try {
      await refreshAccount({ accountId })
      toast.success("계정 정보가 새로고침되었습니다.")
    } catch (error: any) {
      console.error("계정 새로고침 오류:", error)
      toast.error(error.message || "계정 새로고침에 실패했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDisconnect = async (accountId: Id<"socialAccounts">) => {
    if (!confirm("정말로 이 계정의 연결을 해제하시겠습니까?\n모든 예약된 게시물이 취소됩니다.")) {
      return
    }

    setActionLoading(accountId)
    try {
      await disconnectAccount({ accountId })
      toast.success("계정 연결이 해제되었습니다.")
    } catch (error: any) {
      console.error("계정 연결 해제 오류:", error)
      toast.error(error.message || "계정 연결 해제에 실패했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  if (socialAccounts === undefined) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const activeAccounts = socialAccounts.filter(acc => acc.isActive)
  const inactiveAccounts = socialAccounts.filter(acc => !acc.isActive)
  
  // Group by platform
  const accountsByPlatform = socialAccounts.reduce((acc, account) => {
    if (!acc[account.platform]) {
      acc[account.platform] = []
    }
    acc[account.platform].push(account)
    return acc
  }, {} as Record<string, SocialAccount[]>)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">연결된 계정</h2>
          <p className="text-muted-foreground">
            총 {socialAccounts.length}개의 소셜 미디어 계정이 연결되어 있습니다
          </p>
        </div>
        <Button onClick={onAddAccount}>
          <Plus className="h-4 w-4 mr-2" />
          계정 추가
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <Users className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{socialAccounts.length}</p>
              <p className="text-xs text-muted-foreground">전체 계정</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-4">
            <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{activeAccounts.length}</p>
              <p className="text-xs text-muted-foreground">활성 계정</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-4">
            <Clock className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{inactiveAccounts.length}</p>
              <p className="text-xs text-muted-foreground">비활성 계정</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-4">
            <BarChart3 className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{Object.keys(accountsByPlatform).length}</p>
              <p className="text-xs text-muted-foreground">플랫폼 수</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {socialAccounts.length === 0 ? (
        /* Empty State */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">연결된 계정이 없습니다</h3>
            <p className="text-muted-foreground mb-6">
              소셜 미디어 계정을 연결하여 자동 게시를 시작하세요
            </p>
            <Button onClick={onAddAccount}>
              <Plus className="h-4 w-4 mr-2" />
              첫 계정 연결하기
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Accounts Grid */
        <div className="space-y-6">
          {Object.entries(accountsByPlatform).map(([platform, accounts]) => {
            const platformConfig = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]
            const Icon = platformConfig?.icon || MessageCircle
            
            return (
              <div key={platform}>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Icon className={cn("h-5 w-5 mr-2", platformConfig?.color)} />
                  {platformConfig?.name || platform} ({accounts.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {accounts.map((account) => (
                    <AccountCard
                      key={account._id}
                      account={account}
                      onToggleActive={handleToggleActive}
                      onRefresh={handleRefresh}
                      onDisconnect={handleDisconnect}
                      isLoading={actionLoading === account._id}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>계정 관리 팁</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2 flex items-center">
                <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                효율적인 관리
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 자주 사용하지 않는 계정은 비활성화</li>
                <li>• 정기적으로 계정 정보 새로고침</li>
                <li>• 각 플랫폼의 최적 게시 시간 활용</li>
                <li>• 계정별 콘텐츠 맞춤화</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center">
                <Shield className="h-4 w-4 mr-2 text-green-500" />
                보안 관리
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 의심스러운 활동 발견 시 즉시 연결 해제</li>
                <li>• 정기적인 계정 보안 점검</li>
                <li>• 불필요한 권한은 최소화</li>
                <li>• 비밀번호 변경 시 재연결 필요</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}