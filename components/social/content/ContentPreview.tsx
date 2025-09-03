"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  Twitter, 
  MessageCircle, 
  Heart, 
  Repeat, 
  Share, 
  MoreHorizontal,
  Bookmark,
  MessageSquare,
  Send,
  Eye,
  Clock,
  CheckCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ContentPreviewProps {
  content: string
  persona: {
    name: string
    avatar?: string
    role: string
  }
  platforms: string[]
  includeHashtags?: boolean
  hashtags?: string[]
  className?: string
}

interface PlatformPreviewProps {
  content: string
  persona: ContentPreviewProps["persona"]
  hashtags?: string[]
  includeHashtags?: boolean
}

// Twitter Preview Component
function TwitterPreview({ content, persona, hashtags, includeHashtags }: PlatformPreviewProps) {
  const fullContent = includeHashtags && hashtags?.length ? 
    `${content}\n\n${hashtags.join(' ')}` : content
    
  const isOverLimit = fullContent.length > 280
  const remainingChars = 280 - fullContent.length

  return (
    <Card className="max-w-md">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start space-x-3 mb-3">
          <Avatar className="h-10 w-10">
            {persona.avatar ? (
              <img src={persona.avatar} alt={persona.name} className="object-cover" />
            ) : (
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {persona.name.charAt(0)}
              </div>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1">
              <p className="font-semibold text-sm truncate">{persona.name}</p>
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground truncate">@{persona.name.toLowerCase().replace(/\s+/g, '')}</p>
            <p className="text-xs text-muted-foreground">지금</p>
          </div>
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className={cn(
            "text-sm whitespace-pre-wrap",
            isOverLimit && "text-red-500"
          )}>
            {fullContent}
          </p>
          {isOverLimit && (
            <p className="text-xs text-red-500 mt-1">
              {Math.abs(remainingChars)}자 초과
            </p>
          )}
        </div>

        {/* Character count */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <div className="flex items-center space-x-4">
            <span>오후 2:30</span>
            <span>·</span>
            <span>2024년 1월 15일</span>
          </div>
          <span className={cn(
            remainingChars < 20 && remainingChars >= 0 && "text-yellow-500",
            remainingChars < 0 && "text-red-500"
          )}>
            {fullContent.length}/280
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs">24</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-muted-foreground">
            <Repeat className="h-4 w-4" />
            <span className="text-xs">12</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-muted-foreground">
            <Heart className="h-4 w-4" />
            <span className="text-xs">156</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-muted-foreground">
            <Share className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Threads Preview Component
function ThreadsPreview({ content, persona, hashtags, includeHashtags }: PlatformPreviewProps) {
  const fullContent = includeHashtags && hashtags?.length ? 
    `${content}\n\n${hashtags.join(' ')}` : content
    
  const isOverLimit = fullContent.length > 500
  const remainingChars = 500 - fullContent.length

  return (
    <Card className="max-w-md">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start space-x-3 mb-3">
          <Avatar className="h-10 w-10">
            {persona.avatar ? (
              <img src={persona.avatar} alt={persona.name} className="object-cover" />
            ) : (
              <div className="bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {persona.name.charAt(0)}
              </div>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1">
              <p className="font-semibold text-sm truncate">{persona.name}</p>
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground">지금</p>
          </div>
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className={cn(
            "text-sm whitespace-pre-wrap",
            isOverLimit && "text-red-500"
          )}>
            {fullContent}
          </p>
          {isOverLimit && (
            <p className="text-xs text-red-500 mt-1">
              {Math.abs(remainingChars)}자 초과
            </p>
          )}
        </div>

        {/* Character count */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3" />
            <span>방금 전</span>
          </div>
          <span className={cn(
            remainingChars < 50 && remainingChars >= 0 && "text-yellow-500",
            remainingChars < 0 && "text-red-500"
          )}>
            {fullContent.length}/500
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-muted-foreground">
            <Heart className="h-4 w-4" />
            <span className="text-xs">89</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">7</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-muted-foreground">
            <Repeat className="h-4 w-4" />
            <span className="text-xs">23</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-muted-foreground">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// LinkedIn Preview Component  
function LinkedInPreview({ content, persona, hashtags, includeHashtags }: PlatformPreviewProps) {
  const fullContent = includeHashtags && hashtags?.length ? 
    `${content}\n\n${hashtags.join(' ')}` : content

  return (
    <Card className="max-w-lg">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start space-x-3 mb-4">
          <Avatar className="h-12 w-12">
            {persona.avatar ? (
              <img src={persona.avatar} alt={persona.name} className="object-cover" />
            ) : (
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold">
                {persona.name.charAt(0)}
              </div>
            )}
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-base">{persona.name}</p>
            <p className="text-sm text-muted-foreground">{persona.role}</p>
            <p className="text-xs text-muted-foreground">1시간 • 🌐</p>
          </div>
          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {fullContent}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-muted-foreground hover:text-blue-600">
            <div className="w-5 h-5 bg-blue-600 rounded text-white flex items-center justify-center text-xs">
              👍
            </div>
            <span className="text-sm">공감 42</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm">댓글 5</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-muted-foreground">
            <Repeat className="h-4 w-4" />
            <span className="text-sm">재게시 8</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-muted-foreground">
            <Send className="h-4 w-4" />
            <span className="text-sm">보내기</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ContentPreview({ 
  content, 
  persona, 
  platforms, 
  includeHashtags = false,
  hashtags = [],
  className 
}: ContentPreviewProps) {
  const [activeTab, setActiveTab] = useState(platforms[0] || "twitter")

  // Update active tab when platforms change
  useEffect(() => {
    if (!platforms.includes(activeTab)) {
      setActiveTab(platforms[0] || "twitter")
    }
  }, [platforms, activeTab])

  if (!content.trim()) {
    return (
      <div className={cn("space-y-4", className)}>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Eye className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">미리보기가 준비 중입니다</h3>
            <p className="text-muted-foreground">
              콘텐츠를 입력하면 플랫폼별 미리보기를 확인할 수 있습니다
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-lg font-semibold mb-2">플랫폼 미리보기</h3>
        <p className="text-muted-foreground text-sm">
          각 플랫폼에서 콘텐츠가 어떻게 보일지 확인해보세요
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          {platforms.includes("twitter") && (
            <TabsTrigger value="twitter" className="flex items-center space-x-2">
              <Twitter className="h-4 w-4" />
              <span>Twitter</span>
            </TabsTrigger>
          )}
          {platforms.includes("threads") && (
            <TabsTrigger value="threads" className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>Threads</span>
            </TabsTrigger>
          )}
        </TabsList>

        {platforms.includes("twitter") && (
          <TabsContent value="twitter">
            <div className="flex justify-center">
              <TwitterPreview 
                content={content}
                persona={persona}
                hashtags={hashtags}
                includeHashtags={includeHashtags}
              />
            </div>
          </TabsContent>
        )}

        {platforms.includes("threads") && (
          <TabsContent value="threads">
            <div className="flex justify-center">
              <ThreadsPreview 
                content={content}
                persona={persona}
                hashtags={hashtags}
                includeHashtags={includeHashtags}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Character count summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">문자 수 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {platforms.map((platform) => {
              const fullContent = includeHashtags && hashtags.length ? 
                `${content}\n\n${hashtags.join(' ')}` : content
              
              const limits = {
                twitter: 280,
                threads: 500,
                linkedin: 3000
              }
              
              const limit = limits[platform as keyof typeof limits]
              const currentLength = fullContent.length
              const remaining = limit - currentLength
              const isOverLimit = remaining < 0
              
              return (
                <div key={platform} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2">
                    {platform === "twitter" && <Twitter className="h-4 w-4" />}
                    {platform === "threads" && <MessageCircle className="h-4 w-4" />}
                    <span className="capitalize font-medium">{platform}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={cn(
                      "text-sm font-mono",
                      isOverLimit ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {currentLength}/{limit}
                    </span>
                    <Badge variant={isOverLimit ? "destructive" : "secondary"} className="text-xs">
                      {isOverLimit ? `${Math.abs(remaining)} 초과` : `${remaining} 남음`}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}