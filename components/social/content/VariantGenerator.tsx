"use client"

import { useState, useEffect } from "react"
import { useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  Sparkles, 
  RotateCcw, 
  Copy, 
  Check, 
  Star,
  TrendingUp,
  MessageCircle,
  Eye,
  Zap,
  Award,
  RefreshCw,
  AlertCircle,
  Loader2
} from "lucide-react"
import { VariantScorer } from "./VariantScorer"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Id } from "@/convex/_generated/dataModel"

interface VariantGeneratorProps {
  postId?: Id<"socialPosts">
  originalContent: string
  persona: {
    _id: Id<"personas">
    name: string
    role: string
    tone: string
    interests: string[]
    expertise: string[]
    avatar?: string
  }
  onVariantSelect: (variant: PostVariant) => void
  onGenerateMore: () => void
  className?: string
}

interface PostVariant {
  _id: Id<"postVariants">
  postId: Id<"socialPosts">
  content: string
  overallScore: number
  scoreBreakdown: {
    engagement: number
    virality: number
    personaMatch: number
    readability: number
    trending: number
  }
  isSelected: boolean
  aiModel: string
  promptUsed: string
  creditsUsed: number
  generatedAt: string
}

interface ScoreCardProps {
  title: string
  score: number
  icon: React.ComponentType<any>
  description: string
  color: string
}

function ScoreCard({ title, score, icon: Icon, description, color }: ScoreCardProps) {
  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
      <div className={cn("p-2 rounded-full", color)}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{title}</p>
          <Badge variant="outline" className="text-xs">
            {score}점
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function VariantCard({ 
  variant, 
  persona, 
  onSelect, 
  isSelected, 
  onCopy 
}: { 
  variant: PostVariant
  persona: VariantGeneratorProps["persona"]
  onSelect: () => void
  isSelected: boolean
  onCopy: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(variant.content)
      setCopied(true)
      onCopy()
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("복사에 실패했습니다")
    }
  }

  const getOverallGrade = (score: number) => {
    if (score >= 90) return { grade: "S", color: "bg-purple-500" }
    if (score >= 80) return { grade: "A", color: "bg-green-500" }
    if (score >= 70) return { grade: "B", color: "bg-blue-500" }
    if (score >= 60) return { grade: "C", color: "bg-yellow-500" }
    return { grade: "D", color: "bg-red-500" }
  }

  const { grade, color } = getOverallGrade(variant.overallScore)

  return (
    <Card className={cn(
      "group cursor-pointer transition-all duration-200 hover:shadow-md",
      isSelected && "ring-2 ring-primary shadow-md"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm", color)}>
              {grade}
            </div>
            <div>
              <p className="font-semibold text-sm">변형 #{variant._id.slice(-4)}</p>
              <p className="text-xs text-muted-foreground">
                전체 점수: {variant.overallScore}점
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            {isSelected && (
              <Badge variant="default" className="text-xs">
                선택됨
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4" onClick={onSelect}>
        {/* Content Preview */}
        <div className="bg-muted/30 p-3 rounded-lg">
          <p className="text-sm whitespace-pre-wrap line-clamp-4">
            {variant.content}
          </p>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-2 gap-2">
          <ScoreCard
            title="참여도"
            score={variant.scoreBreakdown.engagement}
            icon={MessageCircle}
            description="좋아요, 댓글 예상"
            color="bg-blue-500"
          />
          <ScoreCard
            title="바이럴"
            score={variant.scoreBreakdown.virality}
            icon={TrendingUp}
            description="공유 가능성"
            color="bg-green-500"
          />
          <ScoreCard
            title="페르소나"
            score={variant.scoreBreakdown.personaMatch}
            icon={Award}
            description="톤 일치도"
            color="bg-purple-500"
          />
          <ScoreCard
            title="가독성"
            score={variant.scoreBreakdown.readability}
            icon={Eye}
            description="읽기 편함"
            color="bg-orange-500"
          />
        </div>

        {/* Meta Information */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center space-x-4">
            <span>모델: {variant.aiModel}</span>
            <span>크레딧: {variant.creditsUsed}</span>
          </div>
          <span>{new Date(variant.generatedAt).toLocaleTimeString('ko-KR')}</span>
        </div>

        {/* Action Button */}
        <Button 
          onClick={onSelect}
          variant={isSelected ? "default" : "outline"}
          className="w-full"
          size="sm"
        >
          {isSelected ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              선택됨
            </>
          ) : (
            <>
              <Star className="h-4 w-4 mr-2" />
              이 변형 선택
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export function VariantGenerator({
  postId,
  originalContent,
  persona,
  onVariantSelect,
  onGenerateMore,
  className
}: VariantGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState<Id<"postVariants"> | null>(null)

  // Query variants for this post
  const variants = useQuery(
    api.postVariants.getByPostId, 
    postId ? { postId } : "skip"
  ) as PostVariant[] | undefined

  // Action to generate new variants
  const generateVariants = useAction(api.ai.generatePostVariants)

  const sortedVariants = variants?.sort((a, b) => b.overallScore - a.overallScore) || []
  const selectedVariant = variants?.find(v => v._id === selectedVariantId)

  const handleGenerateVariants = async () => {
    if (!postId) return
    
    setIsGenerating(true)
    try {
      await generateVariants({ postId })
      toast.success("새로운 변형이 생성되었습니다!")
    } catch (error) {
      console.error("변형 생성 오류:", error)
      toast.error("변형 생성에 실패했습니다.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleVariantSelect = (variant: PostVariant) => {
    setSelectedVariantId(variant._id)
    onVariantSelect(variant)
  }

  const handleCopyVariant = () => {
    toast.success("변형이 클립보드에 복사되었습니다!")
  }

  if (!postId) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">AI 변형 생성 준비됨</h3>
            <p className="text-muted-foreground mb-4">
              콘텐츠를 입력하고 "AI 변형 생성" 버튼을 클릭하세요
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (variants === undefined) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">AI 생성 변형</h3>
          <p className="text-muted-foreground">
            {persona.name}의 스타일로 생성된 {sortedVariants.length}개의 변형
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline"
            onClick={handleGenerateVariants}
            disabled={isGenerating}
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                더 생성
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Original Content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>원본 콘텐츠</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
            <Avatar className="h-10 w-10">
              {persona.avatar ? (
                <img src={persona.avatar} alt={persona.name} />
              ) : (
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {persona.name.charAt(0)}
                </div>
              )}
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <p className="font-semibold text-sm">{persona.name}</p>
                <Badge variant="outline" className="text-xs">{persona.tone}</Badge>
              </div>
              <p className="text-sm whitespace-pre-wrap">{originalContent}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variants Grid */}
      {sortedVariants.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedVariants.map((variant) => (
            <VariantCard
              key={variant._id}
              variant={variant}
              persona={persona}
              onSelect={() => handleVariantSelect(variant)}
              isSelected={selectedVariantId === variant._id}
              onCopy={handleCopyVariant}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">아직 생성된 변형이 없습니다</h3>
            <p className="text-muted-foreground mb-6">
              AI가 {persona.name}의 스타일로 다양한 변형을 생성해드립니다
            </p>
            <Button onClick={handleGenerateVariants} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  변형 생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  첫 변형 생성하기
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Selected Variant Details */}
      {selectedVariant && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span>선택된 변형</span>
            </CardTitle>
            <CardDescription>
              이 변형이 게시물 발행에 사용됩니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VariantScorer variant={selectedVariant} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}