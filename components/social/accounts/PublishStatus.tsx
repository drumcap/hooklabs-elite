"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Loader2,
  Twitter,
  MessageCircle,
  BarChart3,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Play,
  Pause,
  Activity
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Id } from "@/convex/_generated/dataModel"

interface PublishStatusProps {
  postId?: Id<"socialPosts">
  showRealtimeUpdates?: boolean
  className?: string
}

interface PublishJob {
  _id: Id<"scheduledPosts">
  platform: string
  status: "pending" | "processing" | "published" | "failed" | "cancelled"
  scheduledFor: string
  publishedAt?: string
  error?: string
  retryCount: number
  progress?: number
  socialAccount: {
    username: string
    displayName: string
    profileImage?: string
  }
}

interface PublishMetrics {
  total: number
  pending: number
  processing: number
  published: number
  failed: number
  cancelled: number
  successRate: number
}

const STATUS_CONFIG = {
  pending: {
    label: "대기 중",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    icon: Clock,
    description: "발행 시간을 기다리는 중"
  },
  processing: {
    label: "발행 중",
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    icon: Loader2,
    description: "플랫폼에 게시물을 전송하는 중"
  },
  published: {
    label: "발행 완료",
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    icon: CheckCircle,
    description: "성공적으로 발행됨"
  },
  failed: {
    label: "발행 실패",
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    icon: AlertTriangle,
    description: "발행 중 오류 발생"
  },
  cancelled: {
    label: "취소됨",
    color: "bg-gray-500",
    textColor: "text-gray-700",
    bgColor: "bg-gray-50 dark:bg-gray-900/20",
    icon: XCircle,
    description: "사용자에 의해 취소됨"
  }
}

function PublishJobCard({ job }: { job: PublishJob }) {
  const status = STATUS_CONFIG[job.status]
  const StatusIcon = status.icon
  const PlatformIcon = job.platform === "twitter" ? Twitter : MessageCircle
  
  const scheduledTime = new Date(job.scheduledFor)
  const publishedTime = job.publishedAt ? new Date(job.publishedAt) : null
  const isProcessing = job.status === "processing"

  return (
    <Card className={cn("transition-all duration-200", status.bgColor)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              {job.socialAccount.profileImage ? (
                <img 
                  src={job.socialAccount.profileImage} 
                  alt={job.socialAccount.displayName}
                  className="object-cover" 
                />
              ) : (
                <div className="bg-muted flex items-center justify-center text-xs">
                  {job.socialAccount.username.charAt(0)}
                </div>
              )}
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <PlatformIcon className="h-4 w-4" />
                <p className="font-medium text-sm">@{job.socialAccount.username}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {job.socialAccount.displayName}
              </p>
            </div>
          </div>
          
          <Badge variant="secondary" className={cn("text-xs", status.textColor)}>
            <StatusIcon className={cn("h-3 w-3 mr-1", isProcessing && "animate-spin")} />
            {status.label}
          </Badge>
        </div>

        {/* Progress Bar for Processing */}
        {isProcessing && job.progress !== undefined && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>발행 진행률</span>
              <span>{job.progress}%</span>
            </div>
            <Progress value={job.progress} className="h-2" />
          </div>
        )}

        {/* Timestamps */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">예약 시간:</span>
            <span>{scheduledTime.toLocaleString('ko-KR')}</span>
          </div>
          {publishedTime && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">발행 시간:</span>
              <span className="text-green-600">
                {publishedTime.toLocaleString('ko-KR')}
              </span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {job.status === "failed" && job.error && (
          <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-red-700 text-xs">
            <div className="flex items-center space-x-1 mb-1">
              <AlertTriangle className="h-3 w-3" />
              <span className="font-medium">오류:</span>
            </div>
            <p>{job.error}</p>
            {job.retryCount > 0 && (
              <p className="mt-1 text-muted-foreground">
                재시도 {job.retryCount}회 시도함
              </p>
            )}
          </div>
        )}

        {/* Success Actions */}
        {job.status === "published" && (
          <div className="mt-3 flex items-center space-x-2">
            <Button variant="outline" size="sm" className="text-xs h-6">
              <ExternalLink className="h-3 w-3 mr-1" />
              게시물 보기
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-6">
              <BarChart3 className="h-3 w-3 mr-1" />
              분석 보기
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MetricsOverview({ metrics }: { metrics: PublishMetrics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card>
        <CardContent className="flex items-center p-3">
          <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
          <div>
            <p className="text-lg font-bold">{metrics.total}</p>
            <p className="text-xs text-muted-foreground">총 작업</p>
          </div>
        </CardContent>
      </Card>

      {Object.entries(STATUS_CONFIG).map(([status, config]) => {
        const count = metrics[status as keyof PublishMetrics] as number
        const StatusIcon = config.icon
        
        return (
          <Card key={status}>
            <CardContent className="flex items-center p-3">
              <StatusIcon className={cn("h-5 w-5 mr-2", config.textColor)} />
              <div>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function SuccessRateIndicator({ metrics }: { metrics: PublishMetrics }) {
  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return "text-green-600"
    if (rate >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getSuccessRateLabel = (rate: number) => {
    if (rate >= 90) return "매우 좋음"
    if (rate >= 70) return "보통"
    return "개선 필요"
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">발행 성공률</CardTitle>
        <CardDescription>
          전체 발행 작업 중 성공한 비율입니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">성공률</span>
              <span className={cn("text-2xl font-bold", getSuccessRateColor(metrics.successRate))}>
                {metrics.successRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={metrics.successRate} className="h-3" />
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>성공: {metrics.published}</span>
              <span className={getSuccessRateColor(metrics.successRate)}>
                {getSuccessRateLabel(metrics.successRate)}
              </span>
              <span>실패: {metrics.failed}</span>
            </div>
          </div>
          <div className="text-center">
            <TrendingUp className={cn("h-8 w-8", getSuccessRateColor(metrics.successRate))} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RealtimeStatus({ isEnabled, onToggle }: { isEnabled: boolean; onToggle: () => void }) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    if (!isEnabled) return

    const interval = setInterval(() => {
      setLastUpdate(new Date())
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [isEnabled])

  return (
    <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "w-3 h-3 rounded-full",
              isEnabled ? "bg-green-500 animate-pulse" : "bg-gray-400"
            )} />
            <div>
              <p className="font-medium text-sm">실시간 업데이트</p>
              <p className="text-xs text-muted-foreground">
                {isEnabled 
                  ? `마지막 업데이트: ${lastUpdate.toLocaleTimeString('ko-KR')}`
                  : "실시간 업데이트가 비활성화됨"
                }
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggle}
            className="flex items-center space-x-2"
          >
            {isEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isEnabled ? "일시정지" : "시작"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function PublishStatus({ 
  postId, 
  showRealtimeUpdates = true, 
  className 
}: PublishStatusProps) {
  const [realtimeEnabled, setRealtimeEnabled] = useState(showRealtimeUpdates)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Query publish jobs
  const publishJobs = useQuery(
    postId ? api.scheduledPosts.getByPostId : api.scheduledPosts.getRecent,
    postId ? { postId } : { limit: 10 }
  ) as PublishJob[] | undefined

  // Calculate metrics
  const metrics: PublishMetrics = publishJobs ? {
    total: publishJobs.length,
    pending: publishJobs.filter(j => j.status === "pending").length,
    processing: publishJobs.filter(j => j.status === "processing").length,
    published: publishJobs.filter(j => j.status === "published").length,
    failed: publishJobs.filter(j => j.status === "failed").length,
    cancelled: publishJobs.filter(j => j.status === "cancelled").length,
    successRate: publishJobs.length > 0 
      ? (publishJobs.filter(j => j.status === "published").length / publishJobs.length) * 100 
      : 0
  } : {
    total: 0, pending: 0, processing: 0, published: 0, failed: 0, cancelled: 0, successRate: 0
  }

  const handleRefresh = () => {
    setLastRefresh(new Date())
    // Trigger data refetch - this would typically be handled by Convex's real-time updates
  }

  const handleRealtimeToggle = () => {
    setRealtimeEnabled(!realtimeEnabled)
  }

  if (publishJobs === undefined) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const hasActiveJobs = publishJobs.some(job => 
    job.status === "pending" || job.status === "processing"
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center">
            <Activity className="h-6 w-6 mr-2" />
            발행 상태
          </h3>
          <p className="text-muted-foreground">
            {postId ? "선택된 게시물의 " : "최근 "}발행 작업 상태를 확인하세요
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Real-time Status */}
      {showRealtimeUpdates && (
        <RealtimeStatus 
          isEnabled={realtimeEnabled}
          onToggle={handleRealtimeToggle}
        />
      )}

      {/* Metrics Overview */}
      <div>
        <h4 className="text-lg font-semibold mb-4">요약</h4>
        <MetricsOverview metrics={metrics} />
      </div>

      {/* Success Rate */}
      {metrics.total > 0 && (
        <SuccessRateIndicator metrics={metrics} />
      )}

      {/* Active Jobs Alert */}
      {hasActiveJobs && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
              <div>
                <p className="font-medium text-sm text-yellow-800 dark:text-yellow-200">
                  진행 중인 작업이 있습니다
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  {metrics.pending}개 대기, {metrics.processing}개 처리 중
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold">발행 작업</h4>
          <Badge variant="outline" className="text-xs">
            총 {publishJobs.length}개
          </Badge>
        </div>

        {publishJobs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">발행 작업이 없습니다</h3>
              <p className="text-muted-foreground">
                {postId 
                  ? "이 게시물에 대한 발행 작업이 없습니다."
                  : "최근 발행된 게시물이 없습니다."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publishJobs.map((job) => (
              <PublishJobCard key={job._id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>마지막 업데이트: {lastRefresh.toLocaleString('ko-KR')}</span>
            {realtimeEnabled && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>실시간 모니터링 중</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}