"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { 
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  X,
  Edit,
  Copy,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar,
  Twitter,
  MessageCircle,
  Loader2,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Id } from "@/convex/_generated/dataModel"

interface ScheduledPostsListProps {
  onPostEdit?: (postId: Id<"scheduledPosts">) => void
  onPostView?: (postId: Id<"scheduledPosts">) => void
  className?: string
}

interface ScheduledPost {
  _id: Id<"scheduledPosts">
  postId: Id<"socialPosts">
  platform: string
  scheduledFor: string
  status: "pending" | "processing" | "published" | "failed" | "cancelled"
  publishedAt?: string
  publishedPostId?: string
  error?: string
  retryCount: number
  maxRetries: number
  nextRetryAt?: string
  createdAt: string
  updatedAt: string
  post: {
    _id: Id<"socialPosts">
    finalContent: string
    personaId: Id<"personas">
    hashtags: string[]
    persona: {
      name: string
      avatar?: string
      role: string
    }
  }
  socialAccount: {
    _id: Id<"socialAccounts">
    username: string
    displayName: string
    profileImage?: string
    platform: string
  }
}

const STATUS_CONFIG = {
  pending: {
    label: "대기 중",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    icon: Clock
  },
  processing: {
    label: "처리 중",
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    icon: Loader2
  },
  published: {
    label: "발행됨",
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    icon: CheckCircle
  },
  failed: {
    label: "실패",
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    icon: AlertTriangle
  },
  cancelled: {
    label: "취소됨",
    color: "bg-gray-500",
    textColor: "text-gray-700",
    bgColor: "bg-gray-50 dark:bg-gray-900/20",
    icon: XCircle
  }
}

function PostCard({ 
  post, 
  onEdit, 
  onView, 
  onCancel, 
  onRetry, 
  onDuplicate,
  isActionLoading 
}: {
  post: ScheduledPost
  onEdit: (postId: Id<"scheduledPosts">) => void
  onView: (postId: Id<"scheduledPosts">) => void
  onCancel: (postId: Id<"scheduledPosts">) => void
  onRetry: (postId: Id<"scheduledPosts">) => void
  onDuplicate: (postId: Id<"scheduledPosts">) => void
  isActionLoading: boolean
}) {
  const status = STATUS_CONFIG[post.status]
  const StatusIcon = status.icon
  const PlatformIcon = post.platform === "twitter" ? Twitter : MessageCircle
  
  const scheduledDate = new Date(post.scheduledFor)
  const isPast = scheduledDate < new Date()
  const isToday = scheduledDate.toDateString() === new Date().toDateString()
  
  const canCancel = post.status === "pending" && !isPast
  const canRetry = post.status === "failed"
  const canEdit = post.status === "pending" && !isPast

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              {post.post.persona.avatar ? (
                <img src={post.post.persona.avatar} alt={post.post.persona.name} />
              ) : (
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  {post.post.persona.name.charAt(0)}
                </div>
              )}
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{post.post.persona.name}</p>
              <p className="text-xs text-muted-foreground">{post.post.persona.role}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isActionLoading}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(post._id)}>
                <Eye className="h-4 w-4 mr-2" />
                상세 보기
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={() => onEdit(post._id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  수정
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDuplicate(post._id)}>
                <Copy className="h-4 w-4 mr-2" />
                복제
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canRetry && (
                <DropdownMenuItem onClick={() => onRetry(post._id)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  재시도
                </DropdownMenuItem>
              )}
              {canCancel && (
                <DropdownMenuItem 
                  onClick={() => onCancel(post._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  취소
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content Preview */}
        <div className="mb-4">
          <p className="text-sm line-clamp-3 mb-2">{post.post.finalContent}</p>
          {post.post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.post.hashtags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {post.post.hashtags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{post.post.hashtags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Platform & Account */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <PlatformIcon className="h-4 w-4" />
              <span className="text-sm font-medium capitalize">{post.platform}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                {post.socialAccount.profileImage ? (
                  <img src={post.socialAccount.profileImage} alt={post.socialAccount.username} />
                ) : (
                  <div className="bg-muted flex items-center justify-center text-xs">
                    {post.socialAccount.username.charAt(0)}
                  </div>
                )}
              </Avatar>
              <span className="text-sm text-muted-foreground">
                @{post.socialAccount.username}
              </span>
            </div>
          </div>
        </div>

        {/* Status & Schedule */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <StatusIcon className={cn(
              "h-4 w-4",
              post.status === "processing" && "animate-spin",
              status.textColor
            )} />
            <Badge variant="secondary" className={cn("text-xs", status.textColor)}>
              {status.label}
            </Badge>
            {post.status === "failed" && post.retryCount < post.maxRetries && post.nextRetryAt && (
              <Badge variant="outline" className="text-xs">
                {new Date(post.nextRetryAt).toLocaleTimeString('ko-KR')} 재시도
              </Badge>
            )}
          </div>
          <div className="text-right">
            <p className={cn(
              "text-sm font-medium",
              isToday && "text-primary",
              isPast && post.status === "pending" && "text-red-600"
            )}>
              {scheduledDate.toLocaleDateString('ko-KR')}
            </p>
            <p className="text-xs text-muted-foreground">
              {scheduledDate.toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>
        </div>

        {/* Error Message */}
        {post.status === "failed" && post.error && (
          <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-red-700 text-xs">
            <div className="flex items-center space-x-1">
              <AlertTriangle className="h-3 w-3" />
              <span className="font-medium">오류:</span>
            </div>
            <p className="mt-1">{post.error}</p>
            <p className="mt-1 text-muted-foreground">
              재시도 횟수: {post.retryCount}/{post.maxRetries}
            </p>
          </div>
        )}

        {/* Published Info */}
        {post.status === "published" && post.publishedAt && (
          <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded text-green-700 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-3 w-3" />
                <span>발행 완료</span>
              </div>
              <span>{new Date(post.publishedAt).toLocaleString('ko-KR')}</span>
            </div>
            {post.publishedPostId && (
              <p className="mt-1 text-muted-foreground">
                게시물 ID: {post.publishedPostId}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ScheduledPostsList({ 
  onPostEdit, 
  onPostView, 
  className 
}: ScheduledPostsListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [platformFilter, setPlatformFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"date" | "status" | "platform">("date")
  const [actionLoading, setActionLoading] = useState<Id<"scheduledPosts"> | null>(null)

  // Query scheduled posts
  const scheduledPosts = useQuery(api.scheduledPosts.list, {}) as ScheduledPost[] | undefined

  // Mutations
  const cancelPost = useMutation(api.scheduledPosts.cancel)
  const retryPost = useMutation(api.scheduledPosts.retry)
  const duplicatePost = useMutation(api.scheduledPosts.duplicate)

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    if (!scheduledPosts) return []

    let filtered = scheduledPosts

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.post.finalContent.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.post.persona.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.socialAccount.username.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(post => post.status === statusFilter)
    }

    // Platform filter
    if (platformFilter !== "all") {
      filtered = filtered.filter(post => post.platform === platformFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
        case "status":
          return a.status.localeCompare(b.status)
        case "platform":
          return a.platform.localeCompare(b.platform)
        default:
          return 0
      }
    })

    return filtered
  }, [scheduledPosts, searchTerm, statusFilter, platformFilter, sortBy])

  const handleCancel = async (postId: Id<"scheduledPosts">) => {
    if (!confirm("정말로 이 게시물 예약을 취소하시겠습니까?")) return
    
    setActionLoading(postId)
    try {
      await cancelPost({ scheduledPostId: postId })
      toast.success("게시물 예약이 취소되었습니다.")
    } catch (error) {
      console.error("취소 오류:", error)
      toast.error("게시물 취소에 실패했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRetry = async (postId: Id<"scheduledPosts">) => {
    setActionLoading(postId)
    try {
      await retryPost({ scheduledPostId: postId })
      toast.success("게시물 재시도가 예약되었습니다.")
    } catch (error) {
      console.error("재시도 오류:", error)
      toast.error("게시물 재시도에 실패했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDuplicate = async (postId: Id<"scheduledPosts">) => {
    setActionLoading(postId)
    try {
      await duplicatePost({ scheduledPostId: postId })
      toast.success("게시물이 복제되었습니다.")
    } catch (error) {
      console.error("복제 오류:", error)
      toast.error("게시물 복제에 실패했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  if (!scheduledPosts) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Get unique platforms for filter
  const availablePlatforms = Array.from(
    new Set(scheduledPosts.map(post => post.platform))
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header & Stats */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold">예약된 게시물</h3>
            <p className="text-muted-foreground">
              총 {scheduledPosts.length}개의 예약된 게시물이 있습니다
            </p>
          </div>
        </div>

        {/* Status Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const count = scheduledPosts.filter(p => p.status === status).length
            return (
              <Card key={status}>
                <CardContent className="flex items-center p-4">
                  <div className={cn("w-3 h-3 rounded-full mr-3", config.color)} />
                  <div>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="게시물 내용, 페르소나, 계정으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <SelectItem key={status} value={status}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 플랫폼</SelectItem>
                  {availablePlatforms.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      <div className="flex items-center space-x-2">
                        {platform === "twitter" ? 
                          <Twitter className="h-4 w-4" /> : 
                          <MessageCircle className="h-4 w-4" />
                        }
                        <span className="capitalize">{platform}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">날짜순</SelectItem>
                  <SelectItem value="status">상태순</SelectItem>
                  <SelectItem value="platform">플랫폼순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm || statusFilter !== "all" || platformFilter !== "all"
                ? "조건에 맞는 게시물이 없습니다"
                : "예약된 게시물이 없습니다"
              }
            </h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all" || platformFilter !== "all"
                ? "다른 조건으로 검색해보세요."
                : "새로운 콘텐츠를 작성하고 발행 일정을 설정해보세요."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPosts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onEdit={onPostEdit || (() => {})}
              onView={onPostView || (() => {})}
              onCancel={handleCancel}
              onRetry={handleRetry}
              onDuplicate={handleDuplicate}
              isActionLoading={actionLoading === post._id}
            />
          ))}
        </div>
      )}
    </div>
  )
}