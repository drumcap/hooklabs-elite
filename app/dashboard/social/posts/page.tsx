"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Send,
  Twitter,
  MessageCircle,
  RefreshCw,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { PostStatus, SocialPostWithPersona, PostStats } from "@/types/social-posts"
import { PostDetailModal } from "@/components/social/posts/PostDetailModal"

const getStatusColor = (status: PostStatus) => {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    case "scheduled":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
    case "published":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

const getStatusIcon = (status: PostStatus) => {
  switch (status) {
    case "draft":
      return <FileText className="h-4 w-4" />
    case "scheduled":
      return <Clock className="h-4 w-4" />
    case "published":
      return <CheckCircle2 className="h-4 w-4" />
    case "failed":
      return <AlertCircle className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

const getStatusText = (status: PostStatus) => {
  switch (status) {
    case "draft":
      return "임시저장"
    case "scheduled":
      return "예약됨"
    case "published":
      return "발행됨"
    case "failed":
      return "실패"
    default:
      return "알수없음"
  }
}

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case "twitter":
      return <Twitter className="h-4 w-4" />
    case "threads":
      return <MessageCircle className="h-4 w-4" />
    default:
      return <MessageCircle className="h-4 w-4" />
  }
}

export default function SocialPostsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<PostStatus | "all">("all")
  const [platformFilter, setPlatformFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "popular">("newest")
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Convex queries
  const posts = useQuery(api.socialPosts.list, { limit: 100 })
  const personas = useQuery(api.personas.list)

  // Loading states
  const isLoading = posts === undefined || personas === undefined

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    if (!posts || !posts.page) return []

    let filtered = posts.page as SocialPostWithPersona[]

    // Search filter
    if (search) {
      filtered = filtered.filter(post =>
        post.originalContent.toLowerCase().includes(search.toLowerCase()) ||
        post.finalContent.toLowerCase().includes(search.toLowerCase()) ||
        post.persona?.name?.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(post => post.status === statusFilter)
    }

    // Platform filter
    if (platformFilter !== "all") {
      filtered = filtered.filter(post =>
        post.platforms.includes(platformFilter)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b._creationTime).getTime() - new Date(a._creationTime).getTime()
        case "oldest":
          return new Date(a._creationTime).getTime() - new Date(b._creationTime).getTime()
        case "popular":
          const aEngagement = a.metrics?.engagement || 0
          const bEngagement = b.metrics?.engagement || 0
          return bEngagement - aEngagement
        default:
          return 0
      }
    })

    return filtered
  }, [posts, search, statusFilter, platformFilter, sortBy])

  // Modal handlers
  const handleViewPost = (postId: string) => {
    setSelectedPostId(postId)
    setIsDetailModalOpen(true)
  }

  const handleEditPost = (postId: string) => {
    // TODO: Navigate to edit page or open edit modal
    console.log("Edit post:", postId)
  }

  const handleDeletePost = (postId: string) => {
    // TODO: Implement delete functionality
    console.log("Delete post:", postId)
  }

  // Stats
  const stats: PostStats = useMemo(() => {
    if (!posts || !posts.page) return { total: 0, draft: 0, scheduled: 0, published: 0, failed: 0 }

    return {
      total: posts.page.length,
      draft: posts.page.filter(p => p.status === "draft").length,
      scheduled: posts.page.filter(p => p.status === "scheduled").length,
      published: posts.page.filter(p => p.status === "published").length,
      failed: posts.page.filter(p => p.status === "failed").length,
    }
  }, [posts])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">소셜 게시물 관리</h1>
          <p className="text-muted-foreground">
            AI로 생성된 소셜 미디어 게시물을 관리하고 발행하세요
          </p>
        </div>
        <Link href="/dashboard/social/compose">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            새 게시물 작성
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <FileText className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">전체 게시물</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-4">
            <Edit className="h-8 w-8 text-gray-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.draft}</p>
              <p className="text-sm text-muted-foreground">임시저장</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-4">
            <Clock className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.scheduled}</p>
              <p className="text-sm text-muted-foreground">예약됨</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-4">
            <CheckCircle2 className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.published}</p>
              <p className="text-sm text-muted-foreground">발행됨</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-4">
            <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.failed}</p>
              <p className="text-sm text-muted-foreground">실패</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="게시물 내용이나 페르소나로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PostStatus | "all")}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="draft">임시저장</SelectItem>
                <SelectItem value="scheduled">예약됨</SelectItem>
                <SelectItem value="published">발행됨</SelectItem>
                <SelectItem value="failed">실패</SelectItem>
              </SelectContent>
            </Select>

            {/* Platform Filter */}
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="플랫폼 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 플랫폼</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
                <SelectItem value="threads">Threads</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as "newest" | "oldest" | "popular")}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">최신순</SelectItem>
                <SelectItem value="oldest">오래된순</SelectItem>
                <SelectItem value="popular">인기순</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">게시물을 불러오는 중...</p>
          </div>
        ) : !posts || !posts.page ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-red-600">데이터를 불러올 수 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                네트워크 연결을 확인하고 다시 시도해주세요.
              </p>
              <Button onClick={() => window.location.reload()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                다시 시도
              </Button>
            </CardContent>
          </Card>
        ) : filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">게시물이 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                {search || statusFilter !== "all" || platformFilter !== "all"
                  ? "검색 조건에 맞는 게시물이 없습니다"
                  : "아직 작성된 게시물이 없습니다"
                }
              </p>
              {!search && statusFilter === "all" && platformFilter === "all" && (
                <Link href="/dashboard/social/compose">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    첫 게시물 작성하기
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <Card key={post._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {/* Persona Avatar */}
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {post.persona?.name?.charAt(0) || "P"}
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{post.persona?.name || "Unknown Persona"}</h3>
                            <Badge variant="outline" className="text-xs">
                              {post.persona?.role || "Unknown"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(post._creationTime), "PPP", { locale: ko })}
                          </p>
                        </div>
                      </div>

                      {/* Status and Actions */}
                      <div className="flex items-center space-x-2">
                        <Badge className={cn("flex items-center space-x-1", getStatusColor(post.status))}>
                          {getStatusIcon(post.status)}
                          <span>{getStatusText(post.status)}</span>
                        </Badge>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>작업</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewPost(post._id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              보기
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditPost(post._id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              편집
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Send className="h-4 w-4 mr-2" />
                              재발행
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeletePost(post._id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm line-clamp-3">
                        {post.finalContent || post.originalContent}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Platforms */}
                        <div className="flex items-center space-x-1">
                          {post.platforms.map((platform) => (
                            <div
                              key={platform}
                              className="p-1 bg-muted rounded flex items-center justify-center"
                              title={platform}
                            >
                              {getPlatformIcon(platform)}
                            </div>
                          ))}
                        </div>

                        {/* Hashtags */}
                        {post.hashtags && post.hashtags.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-muted-foreground">
                              #{post.hashtags.length}개 해시태그
                            </span>
                          </div>
                        )}

                        {/* Credits Used */}
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-muted-foreground">
                            {post.creditsUsed} 크레딧 사용
                          </span>
                        </div>
                      </div>

                      {/* Metrics */}
                      {post.metrics && post.status === "published" && (
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          {post.metrics.likes && (
                            <div className="flex items-center space-x-1">
                              <span>👍</span>
                              <span>{post.metrics.likes}</span>
                            </div>
                          )}
                          {post.metrics.comments && (
                            <div className="flex items-center space-x-1">
                              <span>💬</span>
                              <span>{post.metrics.comments}</span>
                            </div>
                          )}
                          {post.metrics.shares && (
                            <div className="flex items-center space-x-1">
                              <span>🔄</span>
                              <span>{post.metrics.shares}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Scheduled Time */}
                      {post.status === "scheduled" && post.scheduledFor && (
                        <div className="flex items-center space-x-1 text-sm text-blue-600">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(post.scheduledFor), "PPp", { locale: ko })}
                          </span>
                        </div>
                      )}

                      {/* Error Message */}
                      {post.status === "failed" && post.errorMessage && (
                        <div className="flex items-center space-x-1 text-sm text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="truncate max-w-xs" title={post.errorMessage}>
                            {post.errorMessage}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Load More */}
      {filteredPosts.length > 0 && (
        <div className="text-center py-4">
          <Button variant="outline">
            더 보기
          </Button>
        </div>
      )}

      {/* Post Detail Modal */}
      <PostDetailModal
        postId={selectedPostId as any}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
      />
    </div>
  )
}