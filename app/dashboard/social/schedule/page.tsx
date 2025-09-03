"use client"

import { useState } from "react"
import { CalendarView } from "@/components/social/scheduling/CalendarView"
import { ScheduledPostsList } from "@/components/social/scheduling/ScheduledPostsList"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  List, 
  Plus,
  Filter,
  Download
} from "lucide-react"
import Link from "next/link"
import type { Id } from "@/convex/_generated/dataModel"

export default function SchedulePage() {
  const [activeView, setActiveView] = useState<"calendar" | "list">("calendar")
  const [selectedPost, setSelectedPost] = useState<Id<"scheduledPosts"> | null>(null)

  const handlePostSelect = (postId: Id<"scheduledPosts">) => {
    setSelectedPost(postId)
    // Could open a detail modal or navigate to edit page
    console.log("Selected post:", postId)
  }

  const handleCreatePost = (date?: string) => {
    // Navigate to compose page with pre-selected date
    const composeUrl = date ? `/dashboard/social/compose?date=${date}` : "/dashboard/social/compose"
    window.location.href = composeUrl
  }

  const handlePostEdit = (postId: Id<"scheduledPosts">) => {
    console.log("Edit post:", postId)
    // Navigate to edit page or open edit modal
  }

  const handlePostView = (postId: Id<"scheduledPosts">) => {
    console.log("View post:", postId)
    // Open detail modal or navigate to detail page
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">스케줄 관리</h1>
          <p className="text-muted-foreground">
            예약된 게시물을 관리하고 발행 일정을 확인하세요
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            필터
          </Button>
          <Link href="/dashboard/social/compose">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 게시물
            </Button>
          </Link>
        </div>
      </div>

      {/* View Toggle */}
      <Tabs value={activeView} onValueChange={(value: any) => setActiveView(value)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="calendar" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>캘린더 뷰</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center space-x-2">
              <List className="h-4 w-4" />
              <span>목록 뷰</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              이번 달 예약된 게시물
            </Badge>
          </div>
        </div>

        <div className="mt-6">
          <TabsContent value="calendar">
            <CalendarView
              onPostSelect={handlePostSelect}
              onCreatePost={handleCreatePost}
            />
          </TabsContent>

          <TabsContent value="list">
            <ScheduledPostsList
              onPostEdit={handlePostEdit}
              onPostView={handlePostView}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}