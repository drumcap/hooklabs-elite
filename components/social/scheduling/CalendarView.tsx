"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Clock,
  Twitter,
  MessageCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock3
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Id } from "@/convex/_generated/dataModel"

interface CalendarViewProps {
  onPostSelect?: (postId: Id<"scheduledPosts">) => void
  onCreatePost?: (date: string) => void
  className?: string
}

interface ScheduledPost {
  _id: Id<"scheduledPosts">
  postId: Id<"socialPosts">
  platform: string
  scheduledFor: string
  status: "pending" | "processing" | "published" | "failed" | "cancelled"
  publishedAt?: string
  error?: string
  post: {
    finalContent: string
    personaId: Id<"personas">
  }
  socialAccount: {
    username: string
    profileImage?: string
  }
}

const MONTHS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월"
]

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

const STATUS_CONFIG = {
  pending: {
    label: "대기 중",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50 dark:bg-blue-900/20"
  },
  processing: {
    label: "처리 중",
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20"
  },
  published: {
    label: "발행됨",
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50 dark:bg-green-900/20"
  },
  failed: {
    label: "실패",
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50 dark:bg-red-900/20"
  },
  cancelled: {
    label: "취소됨",
    color: "bg-gray-500",
    textColor: "text-gray-700",
    bgColor: "bg-gray-50 dark:bg-gray-900/20"
  }
}

function PostCard({ 
  post, 
  onClick,
  size = "default" 
}: { 
  post: ScheduledPost
  onClick?: () => void
  size?: "small" | "default"
}) {
  const Icon = post.platform === "twitter" ? Twitter : MessageCircle
  const status = STATUS_CONFIG[post.status]
  const time = new Date(post.scheduledFor).toLocaleTimeString('ko-KR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  if (size === "small") {
    return (
      <div 
        className={cn(
          "p-2 rounded text-xs cursor-pointer hover:shadow-sm transition-shadow",
          status.bgColor
        )}
        onClick={onClick}
      >
        <div className="flex items-center space-x-1 mb-1">
          <Icon className="h-3 w-3" />
          <span className="font-medium truncate">{time}</span>
          <div className={cn("w-2 h-2 rounded-full", status.color)} />
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {post.post.finalContent}
        </p>
      </div>
    )
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Icon className="h-4 w-4" />
            <Badge variant="outline" className="text-xs">
              @{post.socialAccount.username}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className={cn("text-xs", status.textColor)}>
              {status.label}
            </Badge>
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
        </div>
        
        <p className="text-sm line-clamp-2 mb-2">{post.post.finalContent}</p>
        
        {post.status === "failed" && post.error && (
          <div className="flex items-center space-x-1 text-red-600 text-xs">
            <AlertCircle className="h-3 w-3" />
            <span className="truncate">{post.error}</span>
          </div>
        )}
        
        {post.status === "published" && post.publishedAt && (
          <div className="flex items-center space-x-1 text-green-600 text-xs">
            <CheckCircle className="h-3 w-3" />
            <span>
              {new Date(post.publishedAt).toLocaleString('ko-KR')} 발행
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CalendarGrid({ 
  currentDate, 
  scheduledPosts, 
  onDateClick, 
  onPostClick 
}: {
  currentDate: Date
  scheduledPosts: ScheduledPost[]
  onDateClick: (date: string) => void
  onPostClick: (post: ScheduledPost) => void
}) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingWeekday = firstDay.getDay()
  
  // Create calendar grid
  const calendarDays = []
  
  // Previous month's trailing days
  const prevMonth = new Date(year, month - 1, 0)
  for (let i = startingWeekday - 1; i >= 0; i--) {
    const day = prevMonth.getDate() - i
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: new Date(year, month - 1, day)
    })
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: true,
      date: new Date(year, month, day)
    })
  }
  
  // Next month's leading days
  const remainingDays = 42 - calendarDays.length // 6 weeks * 7 days
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: new Date(year, month + 1, day)
    })
  }

  const getPostsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return scheduledPosts.filter(post => {
      const postDate = new Date(post.scheduledFor).toISOString().split('T')[0]
      return postDate === dateStr
    })
  }

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  return (
    <div className="grid grid-cols-7 gap-1">
      {/* Weekday headers */}
      {WEEKDAYS.map((day) => (
        <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
          {day}
        </div>
      ))}
      
      {/* Calendar days */}
      {calendarDays.map((calendarDay, index) => {
        const posts = getPostsForDate(calendarDay.date)
        const dateStr = calendarDay.date.toISOString().split('T')[0]
        const isToday = dateStr === todayStr
        const isPast = calendarDay.date < today && dateStr !== todayStr
        
        return (
          <div
            key={index}
            className={cn(
              "min-h-24 p-1 border border-border cursor-pointer hover:bg-muted/30 transition-colors",
              !calendarDay.isCurrentMonth && "text-muted-foreground bg-muted/20",
              isToday && "bg-primary/5 border-primary",
              isPast && "opacity-60"
            )}
            onClick={() => onDateClick(dateStr)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={cn(
                "text-sm font-medium",
                isToday && "text-primary font-bold"
              )}>
                {calendarDay.day}
              </span>
              {posts.length > 0 && (
                <Badge variant="secondary" className="text-xs h-4">
                  {posts.length}
                </Badge>
              )}
            </div>
            
            <div className="space-y-1">
              {posts.slice(0, 2).map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  size="small"
                  onClick={() => onPostClick(post)}
                />
              ))}
              {posts.length > 2 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{posts.length - 2} 더보기
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ListView({ 
  scheduledPosts, 
  onPostClick 
}: {
  scheduledPosts: ScheduledPost[]
  onPostClick: (post: ScheduledPost) => void
}) {
  // Group posts by date
  const groupedPosts = useMemo(() => {
    const groups: Record<string, ScheduledPost[]> = {}
    
    scheduledPosts.forEach(post => {
      const date = new Date(post.scheduledFor).toISOString().split('T')[0]
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(post)
    })
    
    // Sort posts within each date by time
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => 
        new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
      )
    })
    
    return groups
  }, [scheduledPosts])

  const sortedDates = Object.keys(groupedPosts).sort()

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">예약된 게시물이 없습니다</h3>
        <p className="text-muted-foreground">
          새로운 콘텐츠를 작성하고 발행 일정을 설정해보세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sortedDates.map(date => {
        const posts = groupedPosts[date]
        const dateObj = new Date(date)
        const isToday = date === new Date().toISOString().split('T')[0]
        
        return (
          <div key={date}>
            <div className="flex items-center space-x-2 mb-4">
              <h3 className={cn(
                "text-lg font-semibold",
                isToday && "text-primary"
              )}>
                {dateObj.toLocaleDateString('ko-KR', { 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}
              </h3>
              {isToday && <Badge className="text-xs">오늘</Badge>}
              <Badge variant="outline" className="text-xs">
                {posts.length}개
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.map(post => (
                <PostCard
                  key={post._id}
                  post={post}
                  onClick={() => onPostClick(post)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function CalendarView({ 
  onPostSelect, 
  onCreatePost, 
  className 
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"calendar" | "list">("calendar")

  // Query scheduled posts
  const scheduledPosts = useQuery(api.scheduledPosts.list, {}) as ScheduledPost[] | undefined

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const handlePostClick = (post: ScheduledPost) => {
    onPostSelect?.(post._id)
  }

  const handleDateClick = (date: string) => {
    onCreatePost?.(date)
  }

  if (!scheduledPosts) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const monthName = MONTHS[currentDate.getMonth()]
  const year = currentDate.getFullYear()

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold">
              {year}년 {monthName}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            오늘
          </Button>
        </div>

        <Tabs value={view} onValueChange={(value) => setView(value as "calendar" | "list")}>
          <TabsList>
            <TabsTrigger value="calendar">
              <Calendar className="h-4 w-4 mr-2" />
              달력
            </TabsTrigger>
            <TabsTrigger value="list">
              <Eye className="h-4 w-4 mr-2" />
              목록
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = scheduledPosts.filter(p => p.status === status).length
          return (
            <Card key={status}>
              <CardContent className="flex items-center p-4">
                <div className={cn("w-3 h-3 rounded-full mr-3", config.color)} />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          {view === "calendar" ? (
            <CalendarGrid
              currentDate={currentDate}
              scheduledPosts={scheduledPosts}
              onDateClick={handleDateClick}
              onPostClick={handlePostClick}
            />
          ) : (
            <ListView
              scheduledPosts={scheduledPosts}
              onPostClick={handlePostClick}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}