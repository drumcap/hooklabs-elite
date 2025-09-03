"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { CreditBalance } from "@/components/social/common/CreditBalance"
import { PublishStatus } from "@/components/social/accounts/PublishStatus"
import { 
  Users, 
  FileText, 
  Calendar, 
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Sparkles,
  Twitter,
  MessageCircle,
  Edit,
  Send,
  Target,
  Activity
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function SocialDashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  // Query dashboard data
  const personas = useQuery(api.personas.list)
  const socialPosts = useQuery(api.socialPosts.getRecent, { limit: 10 })
  const scheduledPosts = useQuery(api.scheduledPosts.getUpcoming, { limit: 5 })
  const socialAccounts = useQuery(api.socialAccounts.list)
  const analytics = useQuery(api.analytics.getDashboardStats)

  const activePersonas = personas?.filter(p => p.isActive) || []
  const activeAccounts = socialAccounts?.filter(acc => acc.isActive) || []
  const recentPosts = socialPosts?.slice(0, 5) || []
  const upcomingPosts = scheduledPosts || []

  const stats = {
    personas: personas?.length || 0,
    activePersonas: activePersonas.length,
    posts: socialPosts?.length || 0,
    scheduledPosts: scheduledPosts?.length || 0,
    accounts: socialAccounts?.length || 0,
    activeAccounts: activeAccounts.length,
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">소셜 미디어 자동화</h1>
          <p className="text-muted-foreground">
            AI 기반 소셜 미디어 콘텐츠 생성 및 자동 발행 관리
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/dashboard/social/compose">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 게시물
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-blue-500 mr-4" />
            <div>
              <p className="text-2xl font-bold">{stats.activePersonas}</p>
              <p className="text-sm text-muted-foreground">활성 페르소나</p>
              <p className="text-xs text-muted-foreground">총 {stats.personas}개</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <FileText className="h-8 w-8 text-green-500 mr-4" />
            <div>
              <p className="text-2xl font-bold">{stats.posts}</p>
              <p className="text-sm text-muted-foreground">작성된 게시물</p>
              <p className="text-xs text-muted-foreground">이번 달</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Calendar className="h-8 w-8 text-purple-500 mr-4" />
            <div>
              <p className="text-2xl font-bold">{stats.scheduledPosts}</p>
              <p className="text-sm text-muted-foreground">예약된 게시물</p>
              <p className="text-xs text-muted-foreground">대기 중</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <BarChart3 className="h-8 w-8 text-orange-500 mr-4" />
            <div>
              <p className="text-2xl font-bold">{stats.activeAccounts}</p>
              <p className="text-sm text-muted-foreground">연결된 계정</p>
              <p className="text-xs text-muted-foreground">총 {stats.accounts}개</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">개요</TabsTrigger>
              <TabsTrigger value="recent">최근 활동</TabsTrigger>
              <TabsTrigger value="scheduled">예약 게시물</TabsTrigger>
              <TabsTrigger value="analytics">분석</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">빠른 작업</CardTitle>
                  <CardDescription>자주 사용하는 기능들에 빠르게 접근하세요</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link href="/dashboard/social/compose">
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="flex items-center p-4">
                          <div className="p-3 bg-blue-100 rounded-lg mr-4">
                            <Edit className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold">새 게시물 작성</p>
                            <p className="text-sm text-muted-foreground">AI와 함께 콘텐츠 생성</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>

                    <Link href="/dashboard/social/personas">
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="flex items-center p-4">
                          <div className="p-3 bg-green-100 rounded-lg mr-4">
                            <Users className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold">페르소나 관리</p>
                            <p className="text-sm text-muted-foreground">AI 페르소나 설정</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>

                    <Link href="/dashboard/social/schedule">
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="flex items-center p-4">
                          <div className="p-3 bg-purple-100 rounded-lg mr-4">
                            <Calendar className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-semibold">스케줄 관리</p>
                            <p className="text-sm text-muted-foreground">발행 일정 확인</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>

                    <Link href="/dashboard/social/accounts">
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="flex items-center p-4">
                          <div className="p-3 bg-orange-100 rounded-lg mr-4">
                            <Activity className="h-6 w-6 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-semibold">계정 관리</p>
                            <p className="text-sm text-muted-foreground">소셜 계정 연결</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Active Personas */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">활성 페르소나</CardTitle>
                      <CardDescription>현재 사용 중인 AI 페르소나들</CardDescription>
                    </div>
                    <Link href="/dashboard/social/personas">
                      <Button variant="outline" size="sm">
                        전체 보기
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {activePersonas.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">활성화된 페르소나가 없습니다</p>
                      <Link href="/dashboard/social/personas">
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          첫 페르소나 만들기
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activePersonas.slice(0, 4).map((persona) => (
                        <Card key={persona._id} className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {persona.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold">{persona.name}</p>
                              <p className="text-sm text-muted-foreground">{persona.role}</p>
                              <div className="flex items-center space-x-1 mt-1">
                                <Badge variant="secondary" className="text-xs">{persona.tone}</Badge>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recent" className="space-y-4">
              {/* Recent Posts */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">최근 게시물</CardTitle>
                  <CardDescription>최근에 작성된 게시물들</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentPosts.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">작성된 게시물이 없습니다</p>
                      <Link href="/dashboard/social/compose">
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          첫 게시물 작성하기
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentPosts.map((post: any) => (
                        <div key={post._id} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {post.persona?.name?.charAt(0) || "P"}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="font-medium text-sm">{post.persona?.name || "Unknown"}</p>
                              <Badge variant="outline" className="text-xs">
                                {post.status === "draft" ? "임시저장" : 
                                 post.status === "scheduled" ? "예약됨" : 
                                 post.status === "published" ? "발행됨" : "실패"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {post.finalContent || post.originalContent}
                            </p>
                            <div className="flex items-center space-x-4 mt-2">
                              <div className="flex items-center space-x-1">
                                {post.platforms?.includes("twitter") && <Twitter className="h-3 w-3" />}
                                {post.platforms?.includes("threads") && <MessageCircle className="h-3 w-3" />}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-4">
              {/* Upcoming Posts */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">예약된 게시물</CardTitle>
                  <CardDescription>곧 발행될 게시물들</CardDescription>
                </CardHeader>
                <CardContent>
                  {upcomingPosts.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">예약된 게시물이 없습니다</p>
                      <Link href="/dashboard/social/compose">
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          게시물 예약하기
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingPosts.map((scheduledPost: any) => (
                        <div key={scheduledPost._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="font-medium text-sm">
                                {scheduledPost.platform === "twitter" ? "Twitter" : "Threads"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                @{scheduledPost.socialAccount?.username}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {new Date(scheduledPost.scheduledFor).toLocaleDateString('ko-KR')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(scheduledPost.scheduledFor).toLocaleTimeString('ko-KR')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">분석 개요</CardTitle>
                  <CardDescription>소셜 미디어 성과 분석</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">분석 데이터 수집 중...</p>
                    <p className="text-sm text-muted-foreground">
                      게시물 발행 후 24시간 이내에 분석 데이터가 표시됩니다
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Credit Balance */}
          <CreditBalance variant="compact" />

          {/* Publish Status */}
          <PublishStatus showRealtimeUpdates={false} />

          {/* Connected Accounts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">연결된 계정</CardTitle>
                <Link href="/dashboard/social/accounts">
                  <Button variant="outline" size="sm">
                    관리
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {activeAccounts.length === 0 ? (
                <div className="text-center py-6">
                  <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">연결된 계정이 없습니다</p>
                  <Link href="/dashboard/social/accounts">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      계정 연결
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeAccounts.slice(0, 3).map((account: any) => (
                    <div key={account._id} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        {account.platform === "twitter" ? 
                          <Twitter className="h-4 w-4" /> : 
                          <MessageCircle className="h-4 w-4" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">@{account.username}</p>
                        <p className="text-xs text-muted-foreground capitalize">{account.platform}</p>
                      </div>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  ))}
                  {activeAccounts.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{activeAccounts.length - 3}개 더보기
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
                팁
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    AI 페르소나 활용하기
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">
                    다양한 페르소나를 만들어 각각 다른 톤으로 콘텐츠를 생성해보세요.
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    최적 시간에 발행
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-200 mt-1">
                    각 플랫폼의 최적 발행 시간을 활용해 더 많은 도달률을 얻으세요.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}