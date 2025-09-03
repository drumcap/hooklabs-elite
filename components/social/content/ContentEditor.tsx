"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  Edit3, 
  Sparkles, 
  Users, 
  Calendar,
  Hash,
  Image,
  Type,
  Twitter,
  MessageCircle,
  RotateCcw,
  Send,
  Save,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Id } from "@/convex/_generated/dataModel"

interface ContentEditorProps {
  selectedPersona?: {
    _id: Id<"personas">
    name: string
    role: string
    tone: string
    interests: string[]
    expertise: string[]
    avatar?: string
  }
  personas: Array<{
    _id: Id<"personas">
    name: string
    role: string
    tone: string
    interests: string[]
    expertise: string[]
    avatar?: string
    isActive: boolean
  }>
  onPersonaChange: (personaId: Id<"personas">) => void
  onGenerateVariants: (content: string, personaId: Id<"personas">) => void
  onSaveDraft: (content: string, personaId: Id<"personas">) => void
  isGenerating?: boolean
  className?: string
}

interface PlatformConfig {
  name: string
  icon: React.ComponentType<any>
  maxLength: number
  recommendedLength: number
  supportHashtags: boolean
  supportImages: boolean
  supportThreads: boolean
}

const PLATFORMS: Record<string, PlatformConfig> = {
  twitter: {
    name: "Twitter",
    icon: Twitter,
    maxLength: 280,
    recommendedLength: 240,
    supportHashtags: true,
    supportImages: true,
    supportThreads: true
  },
  threads: {
    name: "Threads",
    icon: MessageCircle,
    maxLength: 500,
    recommendedLength: 400,
    supportHashtags: true,
    supportImages: true,
    supportThreads: true
  }
}

export function ContentEditor({
  selectedPersona,
  personas,
  onPersonaChange,
  onGenerateVariants,
  onSaveDraft,
  isGenerating = false,
  className
}: ContentEditorProps) {
  const [content, setContent] = useState("")
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["twitter"])
  const [hashtags, setHashtags] = useState<string[]>([])
  const [newHashtag, setNewHashtag] = useState("")
  const [includeImages, setIncludeImages] = useState(false)
  const [createThread, setCreateThread] = useState(false)
  const [activeTab, setActiveTab] = useState("write")

  const activePersona = selectedPersona || personas.find(p => p.isActive)

  // Character count for selected platforms
  const getCharacterStatus = () => {
    if (selectedPlatforms.length === 0) return null

    const platform = PLATFORMS[selectedPlatforms[0]] // Use first selected platform
    const currentLength = content.length
    const maxLength = platform.maxLength
    const recommendedLength = platform.recommendedLength

    const percentage = (currentLength / maxLength) * 100
    let status: "good" | "warning" | "error" = "good"
    
    if (currentLength > maxLength) {
      status = "error"
    } else if (currentLength > recommendedLength) {
      status = "warning"
    }

    return { currentLength, maxLength, recommendedLength, percentage, status }
  }

  const characterStatus = getCharacterStatus()

  const addHashtag = () => {
    if (newHashtag && !hashtags.includes(newHashtag)) {
      setHashtags([...hashtags, newHashtag.startsWith("#") ? newHashtag : `#${newHashtag}`])
      setNewHashtag("")
    }
  }

  const removeHashtag = (hashtag: string) => {
    setHashtags(hashtags.filter(h => h !== hashtag))
  }

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const handleGenerateVariants = () => {
    if (!activePersona || !content.trim()) return
    onGenerateVariants(content, activePersona._id)
    setActiveTab("variants")
  }

  const handleSaveDraft = () => {
    if (!activePersona || !content.trim()) return
    onSaveDraft(content, activePersona._id)
  }

  const getContentWithHashtags = () => {
    if (hashtags.length === 0) return content
    return `${content}\n\n${hashtags.join(" ")}`
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">콘텐츠 작성</h2>
          <p className="text-muted-foreground">
            AI와 함께 매력적인 소셜 미디어 콘텐츠를 만들어보세요
          </p>
        </div>
        {activePersona && (
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              {activePersona.avatar ? (
                <img src={activePersona.avatar} alt={activePersona.name} />
              ) : (
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  {activePersona.name.charAt(0)}
                </div>
              )}
            </Avatar>
            <div className="text-sm">
              <p className="font-medium">{activePersona.name}</p>
              <p className="text-muted-foreground">{activePersona.role}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Persona Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Users className="h-5 w-5" />
                <span>페르소나 선택</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={activePersona?._id} 
                onValueChange={(value) => onPersonaChange(value as Id<"personas">)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="페르소나를 선택해주세요" />
                </SelectTrigger>
                <SelectContent>
                  {personas.filter(p => p.isActive).map((persona) => (
                    <SelectItem key={persona._id} value={persona._id}>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          {persona.avatar ? (
                            <img src={persona.avatar} alt={persona.name} />
                          ) : (
                            <div className="bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                              {persona.name.charAt(0)}
                            </div>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium">{persona.name}</p>
                          <p className="text-xs text-muted-foreground">{persona.role}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Content Writing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Edit3 className="h-5 w-5" />
                <span>콘텐츠 작성</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={activePersona 
                    ? `${activePersona.name}의 톤으로 콘텐츠를 작성해보세요...`
                    : "콘텐츠를 작성해보세요..."
                  }
                  className="w-full h-32 p-3 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {characterStatus && (
                  <div className={cn(
                    "absolute bottom-2 right-2 text-xs font-medium px-2 py-1 rounded",
                    characterStatus.status === "good" && "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/20",
                    characterStatus.status === "warning" && "text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20",
                    characterStatus.status === "error" && "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/20"
                  )}>
                    {characterStatus.currentLength}/{characterStatus.maxLength}
                  </div>
                )}
              </div>

              {/* Character Count Progress */}
              {characterStatus && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>문자 수</span>
                    <span className={cn(
                      characterStatus.status === "good" && "text-green-600",
                      characterStatus.status === "warning" && "text-yellow-600",
                      characterStatus.status === "error" && "text-red-600"
                    )}>
                      {characterStatus.currentLength}/{characterStatus.maxLength}
                    </span>
                  </div>
                  <Progress 
                    value={characterStatus.percentage} 
                    className={cn(
                      "h-2",
                      characterStatus.status === "error" && "[&>div]:bg-red-500"
                    )}
                  />
                  {characterStatus.status === "warning" && (
                    <p className="text-xs text-yellow-600 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      권장 길이를 초과했습니다
                    </p>
                  )}
                  {characterStatus.status === "error" && (
                    <p className="text-xs text-red-600 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      최대 길이를 초과했습니다
                    </p>
                  )}
                </div>
              )}

              {/* Hashtags */}
              <div className="space-y-3">
                <Label className="flex items-center space-x-2">
                  <Hash className="h-4 w-4" />
                  <span>해시태그</span>
                </Label>
                <div className="flex space-x-2">
                  <Input
                    value={newHashtag}
                    onChange={(e) => setNewHashtag(e.target.value)}
                    placeholder="해시태그 입력"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addHashtag()
                      }
                    }}
                  />
                  <Button type="button" onClick={addHashtag} size="sm">
                    추가
                  </Button>
                </div>
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {hashtags.map((hashtag) => (
                      <Badge 
                        key={hashtag} 
                        variant="secondary"
                        className="cursor-pointer hover:bg-red-100 hover:text-red-700"
                        onClick={() => removeHashtag(hashtag)}
                      >
                        {hashtag} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4">
                <Button 
                  onClick={handleGenerateVariants}
                  disabled={!activePersona || !content.trim() || isGenerating}
                  className="flex-1 sm:flex-none"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      AI 생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI 변형 생성
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSaveDraft}
                  disabled={!activePersona || !content.trim()}
                  className="flex-1 sm:flex-none"
                >
                  <Save className="h-4 w-4 mr-2" />
                  임시저장
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Platform Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">플랫폼 선택</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(PLATFORMS).map(([key, platform]) => {
                const Icon = platform.icon
                const isSelected = selectedPlatforms.includes(key)
                
                return (
                  <div 
                    key={key}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:bg-muted/50"
                    )}
                    onClick={() => handlePlatformToggle(key)}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{platform.name}</p>
                        <p className="text-xs text-muted-foreground">
                          최대 {platform.maxLength}자
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center",
                      isSelected 
                        ? "border-primary bg-primary" 
                        : "border-muted-foreground"
                    )}>
                      {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>설정</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center space-x-2">
                    <Image className="h-4 w-4" />
                    <span>이미지 포함</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    콘텐츠에 이미지를 포함합니다
                  </p>
                </div>
                <Switch
                  checked={includeImages}
                  onCheckedChange={setIncludeImages}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center space-x-2">
                    <Type className="h-4 w-4" />
                    <span>스레드 생성</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    긴 콘텐츠를 여러 게시물로 나눕니다
                  </p>
                </div>
                <Switch
                  checked={createThread}
                  onCheckedChange={setCreateThread}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {content && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">미리보기</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">
                    {getContentWithHashtags()}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}