"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  FileText,
  MessageSquare,
  Calendar,
  TrendingUp,
  Share2,
  Edit,
  Trash2,
  Eye,
  Sparkles,
  Clock,
  Loader2,
  AlertCircle
} from "lucide-react"
import { ContentPreview } from "../content/ContentPreview"
import { VariantGenerator } from "../content/VariantGenerator"
import { VariantScorer } from "../content/VariantScorer"
import { PostScheduler } from "../scheduling/PostScheduler"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import type { Id } from "@/convex/_generated/dataModel"

interface PostDetailModalProps {
  postId: Id<"socialPosts"> | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (postId: Id<"socialPosts">) => void
  onDelete?: (postId: Id<"socialPosts">) => void
}

function getStatusIcon(status: string) {
  switch (status) {
    case "draft":
      return <FileText className="h-4 w-4" />
    case "scheduled":
      return <Clock className="h-4 w-4" />
    case "published":
      return <Share2 className="h-4 w-4" />
    case "failed":
      return <TrendingUp className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "draft":
      return "bg-gray-500"
    case "scheduled":
      return "bg-blue-500"
    case "published":
      return "bg-green-500"
    case "failed":
      return "bg-red-500"
    default:
      return "bg-gray-500"
  }
}

export function PostDetailModal({
  postId,
  open,
  onOpenChange,
  onEdit,
  onDelete
}: PostDetailModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<any>(null)

  // Query post details
  const post = useQuery(
    api.socialPosts.get,
    postId ? { id: postId } : "skip"
  )

  if (!postId) {
    return null
  }

  // Loading state
  if (post === undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">게시물을 불러오는 중...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Error state
  if (!post) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-red-600">게시물을 찾을 수 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                게시물이 삭제되었거나 접근 권한이 없습니다.
              </p>
              <Button onClick={() => onOpenChange(false)} variant="outline">
                닫기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const handleVariantSelect = (variant: any) => {
    setSelectedVariant(variant)
  }

  const handleGenerateMore = () => {
    // Refresh will happen automatically via Convex real-time updates
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn("p-2 rounded-full", getStatusColor(post.status))}>
                {getStatusIcon(post.status)}
              </div>
              <div>
                <DialogTitle className="text-xl">
                  게시물 상세정보
                </DialogTitle>
                <DialogDescription className="flex items-center space-x-4">
                  <Badge variant="outline" className="capitalize">
                    {post.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(post._creationTime), {
                      addSuffix: true,
                      locale: ko
                    })}
                  </span>
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(postId)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  편집
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(postId)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="content" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 flex-shrink-0">
              <TabsTrigger value="content" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>콘텐츠</span>
              </TabsTrigger>
              <TabsTrigger value="variants" className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>AI 변형</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>미리보기</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>스케줄</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>분석</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto p-1">
              <TabsContent value="content" className="space-y-6 mt-0">
                {/* Post Meta Information */}
                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-4 bg-muted/30 rounded-lg">
                    <Avatar className="h-12 w-12">
                      {post.persona?.avatar ? (
                        <img src={post.persona.avatar} alt={post.persona.name} />
                      ) : (
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {post.persona?.name?.charAt(0) || "?"}
                        </div>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold">{post.persona?.name || "Unknown Persona"}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {post.persona?.role || "No Role"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {post.persona?.description || "페르소나 설명이 없습니다"}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>플랫폼: {post.platforms?.join(", ") || "없음"}</span>
                        <span>해시태그: {post.hashtags?.length || 0}개</span>
                        {post.threadCount && post.threadCount > 1 && (
                          <span>스레드: {post.threadCount}개</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content Display */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">원본 콘텐츠</h4>
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <p className="whitespace-pre-wrap">{post.originalContent}</p>
                      </div>
                    </div>

                    {post.finalContent !== post.originalContent && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">최종 콘텐츠</h4>
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <p className="whitespace-pre-wrap">{post.finalContent}</p>
                        </div>
                      </div>
                    )}

                    {post.hashtags && post.hashtags.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">해시태그</h4>
                        <div className="flex flex-wrap gap-2">
                          {post.hashtags.map((tag, index) => (
                            <Badge key={index} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="variants" className="mt-0">
                <VariantGenerator
                  postId={postId}
                  originalContent={post.originalContent}
                  persona={{
                    _id: post.persona?._id || postId, // fallback
                    name: post.persona?.name || "Unknown",
                    role: post.persona?.role || "Unknown",
                    tone: post.persona?.tone || "neutral",
                    interests: post.persona?.interests || [],
                    expertise: post.persona?.expertise || [],
                    avatar: post.persona?.avatar
                  }}
                  onVariantSelect={handleVariantSelect}
                  onGenerateMore={handleGenerateMore}
                />
              </TabsContent>

              <TabsContent value="preview" className="mt-0">
                <ContentPreview
                  content={selectedVariant?.content || post.finalContent}
                  persona={{
                    name: post.persona?.name || "Unknown",
                    avatar: post.persona?.avatar,
                    role: post.persona?.role || "Unknown"
                  }}
                  platforms={post.platforms || ["twitter"]}
                  includeHashtags={true}
                  hashtags={post.hashtags || []}
                />
              </TabsContent>

              <TabsContent value="schedule" className="mt-0">
                <PostScheduler
                  postId={postId}
                  currentStatus={post.status}
                  platforms={post.platforms || []}
                />
              </TabsContent>

              <TabsContent value="analytics" className="mt-0">
                <div className="space-y-6">
                  {post.variants && post.variants.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">변형 성능 분석</h3>
                      {post.variants.map((variant: any) => (
                        <VariantScorer
                          key={variant._id}
                          variant={variant}
                          showDetails={false}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">분석 데이터 없음</h3>
                      <p className="text-muted-foreground">
                        아직 분석할 수 있는 데이터가 없습니다.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}