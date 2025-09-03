"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { 
  Calendar, 
  Clock, 
  Send, 
  Settings, 
  Twitter,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Target,
  Clock3,
  Globe
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Id } from "@/convex/_generated/dataModel"

interface PostSchedulerProps {
  post: {
    _id: Id<"socialPosts">
    finalContent: string
    personaId: Id<"personas">
    platforms: string[]
  }
  persona: {
    _id: Id<"personas">
    name: string
    avatar?: string
    role: string
  }
  onSchedule: (scheduleData: ScheduleData) => void
  onPublishNow: () => void
  className?: string
}

interface ScheduleData {
  scheduledFor: string
  platforms: Array<{
    platform: string
    accountId: Id<"socialAccounts">
    scheduledFor: string
  }>
  settings: {
    timezone: string
    retryOnFailure: boolean
    maxRetries: number
    optimizeTime: boolean
  }
}

const TIME_ZONES = [
  { value: "Asia/Seoul", label: "한국 표준시 (KST)", offset: "+09:00" },
  { value: "America/New_York", label: "미국 동부 (EST/EDT)", offset: "-05:00" },
  { value: "America/Los_Angeles", label: "미국 서부 (PST/PDT)", offset: "-08:00" },
  { value: "Europe/London", label: "영국 (GMT/BST)", offset: "+00:00" },
  { value: "UTC", label: "협정 세계시 (UTC)", offset: "+00:00" }
]

const SUGGESTED_TIMES = {
  twitter: [
    { time: "09:00", label: "아침 출근 시간", engagement: 85 },
    { time: "12:00", label: "점심 시간", engagement: 92 },
    { time: "18:00", label: "퇴근 시간", engagement: 88 },
    { time: "21:00", label: "저녁 시간", engagement: 79 }
  ],
  threads: [
    { time: "08:30", label: "아침 일찍", engagement: 78 },
    { time: "12:30", label: "점심 후", engagement: 85 },
    { time: "19:00", label: "저녁 일찍", engagement: 90 },
    { time: "22:00", label: "밤 늦게", engagement: 73 }
  ]
}

function PlatformScheduler({ 
  platform, 
  accounts, 
  selectedAccount,
  onAccountChange,
  scheduledTime,
  onTimeChange,
  suggestions = []
}: {
  platform: string
  accounts: Array<{ _id: Id<"socialAccounts">; username: string; profileImage?: string }>
  selectedAccount?: Id<"socialAccounts">
  onAccountChange: (accountId: Id<"socialAccounts">) => void
  scheduledTime: string
  onTimeChange: (time: string) => void
  suggestions: Array<{ time: string; label: string; engagement: number }>
}) {
  const Icon = platform === "twitter" ? Twitter : MessageCircle
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Icon className="h-5 w-5" />
          <span className="capitalize">{platform}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Selection */}
        <div>
          <Label className="text-sm font-medium">계정 선택</Label>
          <Select value={selectedAccount} onValueChange={onAccountChange}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="계정을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account._id} value={account._id}>
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      {account.profileImage ? (
                        <img src={account.profileImage} alt={account.username} />
                      ) : (
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                          {account.username.charAt(0)}
                        </div>
                      )}
                    </Avatar>
                    <span>@{account.username}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time Selection */}
        <div>
          <Label className="text-sm font-medium">발행 시간</Label>
          <Input
            type="time"
            value={scheduledTime}
            onChange={(e) => onTimeChange(e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Suggested Times */}
        {suggestions.length > 0 && (
          <div>
            <Label className="text-sm font-medium mb-2 block">추천 시간</Label>
            <div className="grid grid-cols-2 gap-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion.time}
                  variant="outline"
                  size="sm"
                  onClick={() => onTimeChange(suggestion.time)}
                  className={cn(
                    "flex flex-col items-center p-2 h-auto",
                    scheduledTime === suggestion.time && "border-primary bg-primary/5"
                  )}
                >
                  <span className="font-medium">{suggestion.time}</span>
                  <span className="text-xs text-muted-foreground">{suggestion.label}</span>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {suggestion.engagement}% 참여도
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PostScheduler({ 
  post, 
  persona, 
  onSchedule, 
  onPublishNow,
  className 
}: PostSchedulerProps) {
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [timezone, setTimezone] = useState("Asia/Seoul")
  const [retryOnFailure, setRetryOnFailure] = useState(true)
  const [maxRetries, setMaxRetries] = useState(3)
  const [optimizeTime, setOptimizeTime] = useState(false)
  
  // Platform-specific scheduling data
  const [platformSchedules, setPlatformSchedules] = useState<Record<string, {
    accountId?: Id<"socialAccounts">
    time: string
  }>>({})

  // Fetch social accounts
  const socialAccounts = useQuery(api.socialAccounts.getByPlatforms, {
    platforms: post.platforms
  })

  const schedulePost = useMutation(api.scheduledPosts.create)

  useEffect(() => {
    // Initialize platform schedules
    const initialSchedules: typeof platformSchedules = {}
    post.platforms.forEach(platform => {
      initialSchedules[platform] = {
        time: optimizeTime ? 
          SUGGESTED_TIMES[platform as keyof typeof SUGGESTED_TIMES]?.[0]?.time || "12:00" : 
          "12:00"
      }
    })
    setPlatformSchedules(initialSchedules)
  }, [post.platforms, optimizeTime])

  const updatePlatformSchedule = (platform: string, key: string, value: any) => {
    setPlatformSchedules(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [key]: value
      }
    }))
  }

  const canSchedule = () => {
    return post.platforms.every(platform => {
      const schedule = platformSchedules[platform]
      const accounts = socialAccounts?.filter(acc => acc.platform === platform) || []
      return schedule?.accountId && schedule?.time && accounts.length > 0
    })
  }

  const getScheduleDateTime = (platform: string) => {
    const schedule = platformSchedules[platform]
    if (!schedule?.time) return null
    
    return `${scheduledDate}T${schedule.time}:00`
  }

  const handleSchedule = async () => {
    if (!canSchedule()) {
      toast.error("모든 플랫폼에 대해 계정과 시간을 설정해주세요.")
      return
    }

    try {
      const scheduleData: ScheduleData = {
        scheduledFor: `${scheduledDate}T12:00:00`, // Default time for the post
        platforms: post.platforms.map(platform => ({
          platform,
          accountId: platformSchedules[platform].accountId!,
          scheduledFor: getScheduleDateTime(platform)!
        })),
        settings: {
          timezone,
          retryOnFailure,
          maxRetries,
          optimizeTime
        }
      }

      await onSchedule(scheduleData)
      toast.success("게시물이 예약되었습니다!")
    } catch (error) {
      console.error("스케줄링 오류:", error)
      toast.error("게시물 예약에 실패했습니다.")
    }
  }

  const handlePublishNow = async () => {
    try {
      await onPublishNow()
      toast.success("게시물이 발행되었습니다!")
    } catch (error) {
      console.error("즉시 발행 오류:", error)
      toast.error("게시물 발행에 실패했습니다.")
    }
  }

  if (!socialAccounts) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const hasConnectedAccounts = socialAccounts.length > 0

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">게시물 스케줄링</h3>
          <p className="text-muted-foreground">
            언제, 어디에 게시물을 발행할지 설정하세요
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            {persona.avatar ? (
              <img src={persona.avatar} alt={persona.name} />
            ) : (
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                {persona.name.charAt(0)}
              </div>
            )}
          </Avatar>
          <div className="text-sm">
            <p className="font-medium">{persona.name}</p>
            <p className="text-muted-foreground">{persona.role}</p>
          </div>
        </div>
      </div>

      {!hasConnectedAccounts ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">소셜 계정을 연결해주세요</h3>
            <p className="text-muted-foreground mb-4">
              게시물을 발행하려면 먼저 소셜 미디어 계정을 연결해야 합니다.
            </p>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              계정 연결하기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Global Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>전역 설정</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">발행 날짜</Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">시간대</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_ZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          <div>
                            <p className="font-medium">{tz.label}</p>
                            <p className="text-xs text-muted-foreground">{tz.offset}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advanced Settings */}
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">최적 시간 추천</Label>
                    <p className="text-xs text-muted-foreground">
                      각 플랫폼의 최적 발행 시간을 자동으로 제안합니다
                    </p>
                  </div>
                  <Switch
                    checked={optimizeTime}
                    onCheckedChange={setOptimizeTime}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">실패 시 재시도</Label>
                    <p className="text-xs text-muted-foreground">
                      발행 실패 시 자동으로 재시도합니다
                    </p>
                  </div>
                  <Switch
                    checked={retryOnFailure}
                    onCheckedChange={setRetryOnFailure}
                  />
                </div>

                {retryOnFailure && (
                  <div>
                    <Label className="text-sm font-medium">최대 재시도 횟수</Label>
                    <Select
                      value={maxRetries.toString()}
                      onValueChange={(value) => setMaxRetries(parseInt(value))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1회</SelectItem>
                        <SelectItem value="2">2회</SelectItem>
                        <SelectItem value="3">3회</SelectItem>
                        <SelectItem value="5">5회</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Platform-specific Scheduling */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">플랫폼별 설정</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {post.platforms.map((platform) => {
                const accounts = socialAccounts.filter(acc => acc.platform === platform)
                const suggestions = SUGGESTED_TIMES[platform as keyof typeof SUGGESTED_TIMES] || []
                
                return (
                  <PlatformScheduler
                    key={platform}
                    platform={platform}
                    accounts={accounts}
                    selectedAccount={platformSchedules[platform]?.accountId}
                    onAccountChange={(accountId) => updatePlatformSchedule(platform, 'accountId', accountId)}
                    scheduledTime={platformSchedules[platform]?.time || "12:00"}
                    onTimeChange={(time) => updatePlatformSchedule(platform, 'time', time)}
                    suggestions={optimizeTime ? suggestions : []}
                  />
                )
              })}
            </div>
          </div>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>발행 미리보기</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 p-4 rounded-lg mb-4">
                <p className="text-sm whitespace-pre-wrap">{post.finalContent}</p>
              </div>
              
              <div className="space-y-2">
                {post.platforms.map((platform) => {
                  const schedule = platformSchedules[platform]
                  const account = socialAccounts.find(acc => acc._id === schedule?.accountId)
                  const dateTime = getScheduleDateTime(platform)
                  
                  return (
                    <div key={platform} className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {platform === "twitter" ? <Twitter className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                        <span className="font-medium capitalize">{platform}</span>
                        {account && (
                          <Badge variant="outline" className="text-xs">
                            @{account.username}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {dateTime ? new Date(dateTime).toLocaleString('ko-KR') : "시간 설정 필요"}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handlePublishNow}
              className="flex-1"
              disabled={!hasConnectedAccounts}
            >
              <Send className="h-4 w-4 mr-2" />
              지금 발행
            </Button>
            <Button 
              onClick={handleSchedule}
              variant="outline"
              className="flex-1"
              disabled={!canSchedule()}
            >
              <Clock className="h-4 w-4 mr-2" />
              예약 발행
            </Button>
          </div>
        </>
      )}
    </div>
  )
}