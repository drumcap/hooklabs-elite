"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

// 동적 임포트로 큰 컴포넌트들을 레이지 로딩
const ContentEditor = dynamic(
  () => import("@/components/social/content/ContentEditor"),
  {
    loading: () => <Skeleton className="h-96 w-full" />,
    ssr: false
  }
)

const VariantGenerator = dynamic(
  () => import("@/components/social/content/VariantGenerator"),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    ),
    ssr: false
  }
)

const ContentPreview = dynamic(
  () => import("@/components/social/content/ContentPreview"),
  {
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    ),
    ssr: false
  }
)

const PostScheduler = dynamic(
  () => import("@/components/social/scheduling/PostScheduler"),
  {
    loading: () => <Skeleton className="h-80 w-full" />,
    ssr: false
  }
)
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Edit3, 
  Sparkles, 
  Eye, 
  Send,
  Save,
  ArrowRight,
  CheckCircle,
  Clock,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import type { Id } from "@/convex/_generated/dataModel"

interface ComposePageState {
  selectedPersona?: {
    _id: Id<"personas">
    name: string
    role: string
    tone: string
    interests: string[]
    expertise: string[]
    avatar?: string
  }
  currentPost?: {
    _id: Id<"socialPosts">
    originalContent: string
    finalContent: string
    personaId: Id<"personas">
    platforms: string[]
  }
  selectedVariant?: any
}

export default function ComposePage() {
  const [activeTab, setActiveTab] = useState<"write" | "variants" | "preview" | "schedule">("write")
  const [state, setState] = useState<ComposePageState>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Query data
  const personas = useQuery(api.personas.getActive)
  const socialAccounts = useQuery(api.socialAccounts.list)

  // Mutations
  const createPost = useMutation(api.socialPosts.create)
  const updatePost = useMutation(api.socialPosts.update)
  const generateVariants = useMutation(api.ai.generateVariants)
  const schedulePost = useMutation(api.scheduledPosts.schedule)

  const handlePersonaChange = (personaId: Id<"personas">) => {
    const persona = personas?.find(p => p._id === personaId)
    if (persona) {
      setState(prev => ({ ...prev, selectedPersona: persona }))
    }
  }

  const handleGenerateVariants = async (content: string, personaId: Id<"personas">) => {
    if (!content.trim()) {
      toast.error("콘텐츠를 입력해주세요")
      return
    }

    setIsGenerating(true)
    try {
      // First create or update the post
      let postId: Id<"socialPosts">
      
      if (state.currentPost) {
        await updatePost({
          id: state.currentPost._id,
          originalContent: content,
          finalContent: content
        })
        postId = state.currentPost._id
      } else {
        postId = await createPost({
          personaId,
          originalContent: content,
          finalContent: content,
          platforms: ["twitter", "threads"]
        })
        
        // Update state with new post
        setState(prev => ({
          ...prev,
          currentPost: {
            _id: postId,
            originalContent: content,
            finalContent: content,
            personaId,
            platforms: ["twitter", "threads"]
          }
        }))
      }

      // Generate variants
      await generateVariants({ postId, content, personaId })
      
      setActiveTab("variants")
      toast.success("AI 변형이 생성되었습니다!")
    } catch (error: any) {
      console.error("변형 생성 오류:", error)
      toast.error(error.message || "변형 생성에 실패했습니다")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveDraft = async (content: string, personaId: Id<"personas">) => {
    if (!content.trim()) {
      toast.error("콘텐츠를 입력해주세요")
      return
    }

    setIsSaving(true)
    try {
      if (state.currentPost) {
        await updatePost({
          id: state.currentPost._id,
          originalContent: content,
          finalContent: content
        })
      } else {
        const postId = await createPost({
          personaId,
          originalContent: content,
          finalContent: content,
          platforms: ["twitter", "threads"],
          status: "draft"
        })
        
        setState(prev => ({
          ...prev,
          currentPost: {
            _id: postId,
            originalContent: content,
            finalContent: content,
            personaId,
            platforms: ["twitter", "threads"]
          }
        }))
      }
      
      toast.success("임시저장되었습니다!")
    } catch (error: any) {
      console.error("임시저장 오류:", error)
      toast.error(error.message || "임시저장에 실패했습니다")
    } finally {
      setIsSaving(false)
    }
  }

  const handleVariantSelect = (variant: any) => {
    setState(prev => ({ ...prev, selectedVariant: variant }))
    setActiveTab("preview")
  }

  const handleSchedule = async (scheduleData: any) => {
    if (!state.currentPost) {
      toast.error("먼저 게시물을 생성해주세요")
      return
    }

    try {
      await schedulePost({
        postId: state.currentPost._id,
        ...scheduleData
      })
      toast.success("게시물이 예약되었습니다!")
    } catch (error: any) {
      console.error("스케줄링 오류:", error)
      toast.error(error.message || "스케줄링에 실패했습니다")
    }
  }

  const handlePublishNow = async () => {
    if (!state.currentPost) {
      toast.error("먼저 게시물을 생성해주세요")
      return
    }

    try {
      // Implement immediate publishing logic
      toast.success("게시물이 발행되었습니다!")
    } catch (error: any) {
      console.error("발행 오류:", error)
      toast.error(error.message || "발행에 실패했습니다")
    }
  }

  if (!personas) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const canGenerateVariants = state.selectedPersona && state.currentPost
  const canSchedule = state.currentPost && socialAccounts && socialAccounts.length > 0

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">게시물 작성</h1>
        <p className="text-muted-foreground">
          AI 페르소나와 함께 매력적인 소셜 미디어 콘텐츠를 만들어보세요
        </p>
      </div>

      {/* Progress Indicator */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center space-x-8">
            <div className={`flex items-center space-x-2 ${
              activeTab === "write" ? "text-primary font-semibold" : 
              state.currentPost ? "text-green-600" : "text-muted-foreground"
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                activeTab === "write" ? "bg-primary text-white" :
                state.currentPost ? "bg-green-500 text-white" : "bg-muted"
              }`}>
                {state.currentPost && activeTab !== "write" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Edit3 className="h-4 w-4" />
                )}
              </div>
              <span>콘텐츠 작성</span>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            <div className={`flex items-center space-x-2 ${
              activeTab === "variants" ? "text-primary font-semibold" : 
              state.selectedVariant ? "text-green-600" : "text-muted-foreground"
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                activeTab === "variants" ? "bg-primary text-white" :
                state.selectedVariant ? "bg-green-500 text-white" : "bg-muted"
              }`}>
                {state.selectedVariant && activeTab !== "variants" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </div>
              <span>AI 변형 생성</span>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            <div className={`flex items-center space-x-2 ${
              activeTab === "preview" ? "text-primary font-semibold" : "text-muted-foreground"
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                activeTab === "preview" ? "bg-primary text-white" : "bg-muted"
              }`}>
                <Eye className="h-4 w-4" />
              </div>
              <span>미리보기</span>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            <div className={`flex items-center space-x-2 ${
              activeTab === "schedule" ? "text-primary font-semibold" : "text-muted-foreground"
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                activeTab === "schedule" ? "bg-primary text-white" : "bg-muted"
              }`}>
                <Send className="h-4 w-4" />
              </div>
              <span>발행 설정</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList>
          <TabsTrigger value="write" className="flex items-center space-x-2">
            <Edit3 className="h-4 w-4" />
            <span>작성</span>
          </TabsTrigger>
          <TabsTrigger 
            value="variants" 
            className="flex items-center space-x-2"
            disabled={!canGenerateVariants}
          >
            <Sparkles className="h-4 w-4" />
            <span>AI 변형</span>
            {!canGenerateVariants && (
              <Badge variant="outline" className="ml-2 text-xs">
                콘텐츠 작성 필요
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>미리보기</span>
          </TabsTrigger>
          <TabsTrigger 
            value="schedule" 
            className="flex items-center space-x-2"
            disabled={!canSchedule}
          >
            <Send className="h-4 w-4" />
            <span>발행</span>
            {!canSchedule && (
              <Badge variant="outline" className="ml-2 text-xs">
                계정 연결 필요
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="write">
            <ContentEditor
              selectedPersona={state.selectedPersona}
              personas={personas || []}
              onPersonaChange={handlePersonaChange}
              onGenerateVariants={handleGenerateVariants}
              onSaveDraft={handleSaveDraft}
              isGenerating={isGenerating}
            />
          </TabsContent>

          <TabsContent value="variants">
            {state.currentPost && state.selectedPersona ? (
              <VariantGenerator
                postId={state.currentPost._id}
                originalContent={state.currentPost.originalContent}
                persona={state.selectedPersona}
                onVariantSelect={handleVariantSelect}
                onGenerateMore={() => {}}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">AI 변형 생성 대기</h3>
                  <p className="text-muted-foreground">
                    먼저 콘텐츠를 작성하고 "AI 변형 생성" 버튼을 클릭해주세요
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="preview">
            {state.currentPost && state.selectedPersona ? (
              <ContentPreview
                content={state.selectedVariant?.content || state.currentPost.finalContent}
                persona={{
                  name: state.selectedPersona.name,
                  avatar: state.selectedPersona.avatar,
                  role: state.selectedPersona.role
                }}
                platforms={state.currentPost.platforms}
                includeHashtags={true}
                hashtags={[]}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">미리보기 준비</h3>
                  <p className="text-muted-foreground">
                    콘텐츠를 작성하면 플랫폼별 미리보기를 확인할 수 있습니다
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="schedule">
            {state.currentPost && state.selectedPersona && socialAccounts && socialAccounts.length > 0 ? (
              <PostScheduler
                post={state.currentPost}
                persona={state.selectedPersona}
                onSchedule={handleSchedule}
                onPublishNow={handlePublishNow}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Send className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">발행 설정 준비</h3>
                  <p className="text-muted-foreground mb-4">
                    {!state.currentPost 
                      ? "먼저 콘텐츠를 작성해주세요"
                      : !socialAccounts || socialAccounts.length === 0
                        ? "소셜 미디어 계정을 연결해주세요"
                        : "발행 설정을 진행할 수 있습니다"
                    }
                  </p>
                  {(!socialAccounts || socialAccounts.length === 0) && (
                    <Button>
                      소셜 계정 연결하기
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Action Bar */}
      <Card className="sticky bottom-4 bg-background/95 backdrop-blur-sm border-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {state.selectedPersona && (
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    {state.selectedPersona.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium">{state.selectedPersona.name}</span>
                </div>
              )}
              {state.currentPost && (
                <Badge variant="secondary" className="text-xs">
                  <Save className="h-3 w-3 mr-1" />
                  저장됨
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {activeTab === "write" && (
                <Button
                  variant="outline"
                  onClick={() => state.selectedPersona && handleSaveDraft(state.currentPost?.originalContent || "", state.selectedPersona._id)}
                  disabled={!state.selectedPersona || isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  임시저장
                </Button>
              )}
              
              {activeTab === "variants" && state.selectedVariant && (
                <Button onClick={() => setActiveTab("preview")}>
                  미리보기
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              
              {activeTab === "preview" && (
                <Button onClick={() => setActiveTab("schedule")} disabled={!canSchedule}>
                  발행 설정
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}