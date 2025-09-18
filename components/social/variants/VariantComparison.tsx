"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { Separator } from "../../ui/separator";
import { Progress } from "../../ui/progress";
import { Button } from "../../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Crown,
  Target,
  Eye,
  MessageSquare,
  Zap,
  BookOpen,
  Hash,
  Star,
  Copy,
  CheckCircle
} from "lucide-react";
import { cn } from "../../../lib/utils";

interface VariantComparisonProps {
  /** 비교할 게시물 ID */
  postId: Id<"socialPosts">;
  /** 컴포넌트의 스타일 클래스 */
  className?: string;
  /** 간단한 보기 모드 */
  compact?: boolean;
  /** 복사 기능 활성화 */
  enableCopy?: boolean;
}

interface ScoreBreakdown {
  engagement: number;
  virality: number;
  personaMatch: number;
  readability: number;
  trending: number;
}

interface Variant {
  _id: string;
  content: string;
  overallScore: number;
  scoreBreakdown: ScoreBreakdown;
  isSelected: boolean;
  aiModel: string;
  generatedAt: string;
}

/**
 * 게시물 변형들의 성능을 비교하는 A/B 테스트 결과 컴포넌트
 */
export function VariantComparison({
  postId,
  className,
  compact = false,
  enableCopy = true,
}: VariantComparisonProps) {
  const [copiedVariant, setCopiedVariant] = React.useState<string | null>(null);

  // 변형들 조회
  const variants = useQuery(api.postVariants.getByPostId, { postId });
  
  // 최고 점수 변형 조회
  const bestVariant = useQuery(api.postVariants.getBestVariant, { postId });

  // 평균 점수 조회
  const averageScores = useQuery(api.postVariants.getAverageScores, { postId });

  // 점수 카테고리 정보
  const scoreCategories = [
    {
      key: "engagement" as keyof ScoreBreakdown,
      label: "참여도",
      icon: <MessageSquare className="h-4 w-4" />,
      description: "좋아요, 댓글, 공유를 유도하는 능력",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      key: "virality" as keyof ScoreBreakdown,
      label: "바이럴성",
      icon: <Zap className="h-4 w-4" />,
      description: "빠른 확산 가능성",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      key: "personaMatch" as keyof ScoreBreakdown,
      label: "페르소나 일치도",
      icon: <Target className="h-4 w-4" />,
      description: "설정된 페르소나와의 일치도",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    {
      key: "readability" as keyof ScoreBreakdown,
      label: "가독성",
      icon: <BookOpen className="h-4 w-4" />,
      description: "읽기 쉬움과 이해도",
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
    },
    {
      key: "trending" as keyof ScoreBreakdown,
      label: "트렌드",
      icon: <Hash className="h-4 w-4" />,
      description: "현재 트렌드와의 부합도",
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-900/20",
    },
  ];

  // 텍스트 복사 핸들러
  const handleCopyText = async (text: string, variantId: string) => {
    if (!enableCopy) return;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopiedVariant(variantId);
      setTimeout(() => setCopiedVariant(null), 2000);
    } catch (error) {
      console.error("텍스트 복사 실패:", error);
    }
  };

  // 점수 색상 결정
  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  // 점수 바 색상 결정
  const getScoreBarColor = (score: number): string => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  // 로딩 상태
  if (variants === undefined || bestVariant === undefined || averageScores === undefined) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-16 w-full" />
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <Skeleton key={j} className="h-8 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!variants || variants.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-medium mb-2">변형이 없습니다</h3>
            <p>이 게시물에 대한 변형을 먼저 생성해 주세요.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 변형들을 점수순으로 정렬
  const sortedVariants = [...variants].sort((a, b) => b.overallScore - a.overallScore);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>변형 성능 비교</span>
          <Badge variant="secondary">{variants.length}개 변형</Badge>
        </CardTitle>
        <CardDescription>
          AI가 생성한 변형들의 성능을 비교하여 최적의 콘텐츠를 선택하세요
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="comparison" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="comparison">상세 비교</TabsTrigger>
            <TabsTrigger value="summary">요약</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="space-y-4 mt-4">
            {/* 변형별 상세 비교 */}
            <div className="space-y-4">
              {sortedVariants.map((variant, index) => (
                <div
                  key={variant._id}
                  className={cn(
                    "p-4 border rounded-lg transition-all hover:shadow-sm",
                    variant.isSelected && "border-primary bg-primary/5",
                    index === 0 && !variant.isSelected && "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20"
                  )}
                >
                  {/* 헤더 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Badge variant={variant.isSelected ? "default" : "outline"}>
                        변형 {index + 1}
                      </Badge>
                      {index === 0 && (
                        <Badge variant="secondary" className="text-amber-600">
                          <Crown className="h-3 w-3 mr-1" />
                          최고 점수
                        </Badge>
                      )}
                      {variant.isSelected && (
                        <Badge variant="default">
                          <Star className="h-3 w-3 mr-1" />
                          선택됨
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className={cn("text-2xl font-bold", getScoreColor(variant.overallScore))}>
                        {variant.overallScore}
                      </div>
                      {enableCopy && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyText(variant.content, variant._id)}
                          className="h-8 w-8 p-0"
                        >
                          {copiedVariant === variant._id ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 콘텐츠 */}
                  {!compact && (
                    <div className="mb-4 p-3 bg-muted/30 rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{variant.content}</p>
                    </div>
                  )}

                  {/* 점수 세부 분석 */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {scoreCategories.map((category) => {
                      const score = variant.scoreBreakdown[category.key];
                      return (
                        <div key={category.key} className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <div className={cn("p-1 rounded", category.color)}>
                              {category.icon}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mb-1">
                            {category.label}
                          </div>
                          <div className={cn("text-sm font-bold", getScoreColor(score))}>
                            {score}
                          </div>
                          <Progress 
                            value={score} 
                            className="h-1 mt-1"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* 메타데이터 */}
                  <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                    <div>모델: {variant.aiModel}</div>
                    <div>생성: {new Date(variant.generatedAt).toLocaleDateString('ko-KR')}</div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6 mt-4">
            {/* 전체 통계 요약 */}
            {averageScores && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center space-x-2">
                  <Eye className="h-4 w-4" />
                  <span>전체 평균 점수</span>
                </h4>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">평균 점수</span>
                    <span className={cn("text-xl font-bold", getScoreColor(averageScores.overallScore))}>
                      {averageScores.overallScore}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {scoreCategories.map((category) => {
                      const score = averageScores.scoreBreakdown[category.key];
                      return (
                        <div key={category.key} className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <div className={cn("p-1 rounded", category.color)}>
                              {category.icon}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mb-1">
                            {category.label}
                          </div>
                          <div className={cn("text-sm font-bold", getScoreColor(score))}>
                            {score}
                          </div>
                          <Progress 
                            value={score} 
                            className="h-1 mt-1"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 성능 분석 */}
            <Separator />
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>성능 분석</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">최고 점수</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {Math.max(...variants.map(v => v.overallScore))}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">최저 점수</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {Math.min(...variants.map(v => v.overallScore))}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">점수 범위</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {Math.max(...variants.map(v => v.overallScore)) - Math.min(...variants.map(v => v.overallScore))}
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// 접근성 개선을 위한 ARIA 레이블
VariantComparison.displayName = "VariantComparison";

export default VariantComparison;