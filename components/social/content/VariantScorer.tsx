"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  MessageCircle, 
  Eye, 
  Award, 
  Zap,
  Target,
  BarChart3,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Id } from "@/convex/_generated/dataModel"

interface VariantScorerProps {
  variant: {
    _id: Id<"postVariants">
    content: string
    overallScore: number
    scoreBreakdown: {
      engagement: number
      virality: number
      personaMatch: number
      readability: number
      trending: number
    }
    aiModel: string
    creditsUsed: number
    generatedAt: string
  }
  showDetails?: boolean
  className?: string
}

interface ScoreMetric {
  key: keyof VariantScorerProps["variant"]["scoreBreakdown"]
  title: string
  description: string
  icon: React.ComponentType<any>
  color: string
  tips: string[]
}

const SCORE_METRICS: ScoreMetric[] = [
  {
    key: "engagement",
    title: "참여도",
    description: "좋아요, 댓글, 공유가 얼마나 많이 발생할지 예측",
    icon: MessageCircle,
    color: "bg-blue-500",
    tips: [
      "질문이나 토론을 유도하는 내용",
      "감정적인 반응을 이끌어내는 표현",
      "독자와의 상호작용을 촉진하는 콜투액션"
    ]
  },
  {
    key: "virality",
    title: "바이럴 가능성",
    description: "콘텐츠가 널리 공유될 가능성",
    icon: TrendingUp,
    color: "bg-green-500",
    tips: [
      "트렌딩 토픽이나 시의성 있는 내용",
      "놀라운 정보나 유용한 팁",
      "공감대가 높은 경험이나 감정"
    ]
  },
  {
    key: "personaMatch",
    title: "페르소나 일치도",
    description: "설정된 페르소나의 톤과 스타일 일치 정도",
    icon: Award,
    color: "bg-purple-500",
    tips: [
      "페르소나의 톤과 말투가 일관성 있게 반영",
      "전문 분야의 지식과 경험이 드러남",
      "페르소나의 가치관과 관점이 표현됨"
    ]
  },
  {
    key: "readability",
    title: "가독성",
    description: "내용을 이해하기 쉽고 읽기 편한 정도",
    icon: Eye,
    color: "bg-orange-500",
    tips: [
      "짧고 명확한 문장 구조",
      "적절한 띄어쓰기와 문단 나누기",
      "복잡한 전문용어 대신 쉬운 표현 사용"
    ]
  },
  {
    key: "trending",
    title: "트렌드 적합성",
    description: "현재 트렌드와 관심사에 부합하는 정도",
    icon: Zap,
    color: "bg-pink-500",
    tips: [
      "최신 이슈나 화제성 있는 주제 활용",
      "인기 있는 해시태그나 키워드 포함",
      "시의성 있는 이벤트나 시점 활용"
    ]
  }
]

function getScoreColor(score: number): string {
  if (score >= 90) return "text-purple-600"
  if (score >= 80) return "text-green-600"
  if (score >= 70) return "text-blue-600"
  if (score >= 60) return "text-yellow-600"
  return "text-red-600"
}

function getScoreGrade(score: number): { grade: string; color: string; description: string } {
  if (score >= 90) return { 
    grade: "S", 
    color: "bg-purple-500", 
    description: "완벽한 품질" 
  }
  if (score >= 80) return { 
    grade: "A", 
    color: "bg-green-500", 
    description: "매우 우수" 
  }
  if (score >= 70) return { 
    grade: "B", 
    color: "bg-blue-500", 
    description: "우수" 
  }
  if (score >= 60) return { 
    grade: "C", 
    color: "bg-yellow-500", 
    description: "보통" 
  }
  return { 
    grade: "D", 
    color: "bg-red-500", 
    description: "개선 필요" 
  }
}

function ScoreBar({ 
  metric, 
  score, 
  showTips = false 
}: { 
  metric: ScoreMetric
  score: number
  showTips?: boolean 
}) {
  const Icon = metric.icon
  const scoreColor = getScoreColor(score)
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={cn("p-2 rounded-full", metric.color)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-medium text-sm">{metric.title}</p>
            <p className="text-xs text-muted-foreground">{metric.description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn("text-lg font-bold", scoreColor)}>{score}</p>
          <p className="text-xs text-muted-foreground">/ 100</p>
        </div>
      </div>
      
      <Progress value={score} className="h-2" />
      
      {showTips && score < 80 && (
        <div className="bg-muted/30 p-3 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center">
            <Info className="h-3 w-3 mr-1" />
            개선 방법:
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {metric.tips.map((tip, index) => (
              <li key={index} className="flex items-start space-x-1">
                <span className="text-primary">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function VariantScorer({ 
  variant, 
  showDetails = true, 
  className 
}: VariantScorerProps) {
  const overallGrade = getScoreGrade(variant.overallScore)
  const averageScore = Object.values(variant.scoreBreakdown).reduce((a, b) => a + b, 0) / 5
  
  const getRecommendation = () => {
    if (variant.overallScore >= 85) {
      return {
        type: "success",
        icon: CheckCircle,
        title: "훌륭한 콘텐츠입니다!",
        description: "이 변형은 높은 성과를 기대할 수 있습니다."
      }
    } else if (variant.overallScore >= 70) {
      return {
        type: "warning",
        icon: AlertTriangle,
        title: "좋은 콘텐츠입니다",
        description: "일부 영역에서 개선하면 더 나은 결과를 얻을 수 있습니다."
      }
    } else {
      return {
        type: "info",
        icon: Info,
        title: "개선 여지가 있습니다",
        description: "다른 변형을 시도하거나 콘텐츠를 수정해보세요."
      }
    }
  }

  const recommendation = getRecommendation()
  const RecommendationIcon = recommendation.icon

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overall Score */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg",
                overallGrade.color
              )}>
                {overallGrade.grade}
              </div>
              <div>
                <CardTitle className="text-xl">전체 점수</CardTitle>
                <CardDescription>{overallGrade.description}</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className={cn("text-3xl font-bold", getScoreColor(variant.overallScore))}>
                {variant.overallScore}
              </p>
              <p className="text-muted-foreground">/ 100</p>
            </div>
          </div>
          <Progress value={variant.overallScore} className="h-3" />
        </CardHeader>
        
        {/* Recommendation */}
        <CardContent>
          <div className={cn(
            "flex items-start space-x-3 p-4 rounded-lg",
            recommendation.type === "success" && "bg-green-50 dark:bg-green-900/10",
            recommendation.type === "warning" && "bg-yellow-50 dark:bg-yellow-900/10",
            recommendation.type === "info" && "bg-blue-50 dark:bg-blue-900/10"
          )}>
            <RecommendationIcon className={cn(
              "h-5 w-5 mt-0.5",
              recommendation.type === "success" && "text-green-600",
              recommendation.type === "warning" && "text-yellow-600",
              recommendation.type === "info" && "text-blue-600"
            )} />
            <div>
              <p className="font-medium text-sm">{recommendation.title}</p>
              <p className="text-xs text-muted-foreground">{recommendation.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {showDetails && (
        <>
          {/* Detailed Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>세부 점수 분석</span>
              </CardTitle>
              <CardDescription>
                각 항목별 점수와 개선 방법을 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {SCORE_METRICS.map((metric) => (
                <ScoreBar
                  key={metric.key}
                  metric={metric}
                  score={variant.scoreBreakdown[metric.key]}
                  showTips={true}
                />
              ))}
            </CardContent>
          </Card>

          {/* Content Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>콘텐츠 분석</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{variant.content}</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {variant.content.length}
                  </p>
                  <p className="text-xs text-muted-foreground">문자 수</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {variant.content.split(/\s+/).length}
                  </p>
                  <p className="text-xs text-muted-foreground">단어 수</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {variant.content.split('\n').length}
                  </p>
                  <p className="text-xs text-muted-foreground">줄 수</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {(variant.content.match(/#\w+/g) || []).length}
                  </p>
                  <p className="text-xs text-muted-foreground">해시태그</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generation Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5" />
                <span>생성 정보</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-500 p-2 rounded-full">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">AI 모델</p>
                    <p className="text-xs text-muted-foreground">{variant.aiModel}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-green-500 p-2 rounded-full">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">사용 크레딧</p>
                    <p className="text-xs text-muted-foreground">{variant.creditsUsed} 크레딧</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-500 p-2 rounded-full">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">생성 시간</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(variant.generatedAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}