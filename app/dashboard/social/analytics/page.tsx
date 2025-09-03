"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users,
  Heart,
  MessageCircle,
  Repeat,
  Eye,
  Calendar,
  Target,
  Zap,
  Award,
  RefreshCw,
  Download,
  Filter
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("7d")
  const [selectedPlatform, setSelectedPlatform] = useState("all")
  const [selectedPersona, setSelectedPersona] = useState("all")

  // Query analytics data (placeholder - implement actual queries)
  const overviewStats = useQuery(api.analytics.getOverview, { 
    timeRange, 
    platform: selectedPlatform === "all" ? undefined : selectedPlatform 
  })
  const engagementData = useQuery(api.analytics.getEngagement, { timeRange })
  const topPosts = useQuery(api.analytics.getTopPosts, { limit: 10, timeRange })
  const personas = useQuery(api.personas.list)

  // Mock data for demonstration
  const mockStats = {
    totalPosts: 24,
    totalViews: 15420,
    totalEngagements: 1240,
    avgEngagementRate: 8.04,
    topPerformingTime: "오후 2:00-3:00",
    growthRate: 12.5
  }

  const mockPlatformData = [
    {
      platform: "twitter",
      posts: 15,
      views: 8500,
      engagements: 680,
      engagementRate: 8.0,
      followers: 1240,
      growth: 15
    },
    {
      platform: "threads", 
      posts: 9,
      views: 6920,
      engagements: 560,
      engagementRate: 8.1,
      followers: 890,
      growth: 8
    }
  ]

  const mockTopPosts = [
    {
      id: "1",
      content: "AI 기반 콘텐츠 생성의 새로운 패러다임에 대해 이야기해보겠습니다...",
      platform: "twitter",
      persona: "테크 전문가",
      publishedAt: "2024-01-15T14:30:00Z",
      metrics: {
        views: 2400,
        likes: 180,
        shares: 45,
        comments: 23
      },
      engagementRate: 10.3
    },
    {
      id: "2", 
      content: "스타트업에서 프로덕트 마케팅을 할 때 가장 중요한 것은...",
      platform: "threads",
      persona: "마케터",
      publishedAt: "2024-01-14T16:45:00Z",
      metrics: {
        views: 1800,
        likes: 150,
        shares: 32,
        comments: 18
      },
      engagementRate: 11.1
    }
  ]

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">분석</h1>
          <p className="text-muted-foreground">
            소셜 미디어 성과를 분석하고 인사이트를 얻으세요
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            리포트 다운로드
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="기간 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">오늘</SelectItem>
                  <SelectItem value="7d">최근 7일</SelectItem>
                  <SelectItem value="30d">최근 30일</SelectItem>
                  <SelectItem value="90d">최근 3개월</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="플랫폼 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 플랫폼</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="threads">Threads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="페르소나 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 페르소나</SelectItem>
                  {personas?.map((persona) => (
                    <SelectItem key={persona._id} value={persona._id}>
                      {persona.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <BarChart3 className="h-8 w-8 text-blue-500 mr-4" />
            <div>
              <p className="text-2xl font-bold">{mockStats.totalPosts}</p>
              <p className="text-sm text-muted-foreground">게시물</p>
              <p className="text-xs text-green-600">+{mockStats.growthRate}% 증가</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Eye className="h-8 w-8 text-purple-500 mr-4" />
            <div>
              <p className="text-2xl font-bold">{formatNumber(mockStats.totalViews)}</p>
              <p className="text-sm text-muted-foreground">총 조회수</p>
              <p className="text-xs text-green-600">+18% 증가</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Heart className="h-8 w-8 text-red-500 mr-4" />
            <div>
              <p className="text-2xl font-bold">{formatNumber(mockStats.totalEngagements)}</p>
              <p className="text-sm text-muted-foreground">총 참여</p>
              <p className="text-xs text-green-600">+25% 증가</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <TrendingUp className="h-8 w-8 text-green-500 mr-4" />
            <div>
              <p className="text-2xl font-bold">{mockStats.avgEngagementRate}%</p>
              <p className="text-sm text-muted-foreground">평균 참여율</p>
              <p className="text-xs text-green-600">+2.1% 증가</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="platforms">플랫폼별</TabsTrigger>
          <TabsTrigger value="personas">페르소나별</TabsTrigger>
          <TabsTrigger value="content">콘텐츠 분석</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Engagement Trend Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">참여도 트렌드</CardTitle>
              <CardDescription>시간별 참여도 변화를 확인하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">차트 데이터 로딩 중...</p>
                  <p className="text-sm text-muted-foreground">
                    충분한 데이터가 수집되면 트렌드 차트가 표시됩니다
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Best Performance Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">최적 발행 시간</CardTitle>
                <CardDescription>가장 높은 참여율을 보인 시간대</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6">
                  <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <p className="text-2xl font-bold text-blue-600">{mockStats.topPerformingTime}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    이 시간대에 게시된 콘텐츠의 평균 참여율은 {mockStats.avgEngagementRate + 2.3}%입니다
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">주간 성과</CardTitle>
                <CardDescription>요일별 성과 분석</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {["월", "화", "수", "목", "금", "토", "일"].map((day, index) => {
                    const performance = Math.random() * 100
                    return (
                      <div key={day} className="flex items-center space-x-3">
                        <span className="text-sm font-medium w-8">{day}</span>
                        <Progress value={performance} className="flex-1" />
                        <span className="text-xs text-muted-foreground w-12">
                          {performance.toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockPlatformData.map((platform) => (
              <Card key={platform.platform}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg capitalize flex items-center">
                      {platform.platform === "twitter" ? 
                        <Twitter className="h-5 w-5 mr-2" /> : 
                        <MessageCircle className="h-5 w-5 mr-2" />
                      }
                      {platform.platform}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      +{platform.growth}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/30 rounded">
                      <p className="text-lg font-bold">{platform.posts}</p>
                      <p className="text-xs text-muted-foreground">게시물</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded">
                      <p className="text-lg font-bold">{formatNumber(platform.views)}</p>
                      <p className="text-xs text-muted-foreground">조회수</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded">
                      <p className="text-lg font-bold">{formatNumber(platform.engagements)}</p>
                      <p className="text-xs text-muted-foreground">참여</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded">
                      <p className="text-lg font-bold">{platform.engagementRate}%</p>
                      <p className="text-xs text-muted-foreground">참여율</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">팔로워 성장</span>
                      <span className="text-sm font-medium">+{platform.growth}%</span>
                    </div>
                    <Progress value={platform.growth * 5} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="personas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">페르소나별 성과</CardTitle>
              <CardDescription>각 페르소나의 콘텐츠 성과를 비교해보세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">페르소나별 분석 데이터 수집 중...</p>
                <p className="text-sm text-muted-foreground">
                  각 페르소나로 게시물을 발행하면 상세한 분석 데이터를 제공합니다
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          {/* Top Performing Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">최고 성과 게시물</CardTitle>
              <CardDescription>가장 좋은 성과를 낸 게시물들</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTopPosts.map((post, index) => (
                  <div key={post.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-orange-600 rounded flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <Badge variant="outline" className="text-xs mr-2">
                            {post.platform === "twitter" ? "Twitter" : "Threads"}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {post.persona}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">
                          {post.engagementRate}% 참여율
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.publishedAt).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-sm mb-3 line-clamp-2">{post.content}</p>
                    
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-sm font-bold">{formatNumber(post.metrics.views)}</p>
                        <p className="text-xs text-muted-foreground">조회</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold">{post.metrics.likes}</p>
                        <p className="text-xs text-muted-foreground">좋아요</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold">{post.metrics.shares}</p>
                        <p className="text-xs text-muted-foreground">공유</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold">{post.metrics.comments}</p>
                        <p className="text-xs text-muted-foreground">댓글</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}