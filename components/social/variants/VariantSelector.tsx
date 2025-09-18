"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { Progress } from "../../ui/progress";
import { Textarea } from "../../ui/textarea";
import { Separator } from "../../ui/separator";
import { Alert, AlertDescription } from "../../ui/alert";
import { 
  CheckCircle, 
  Star, 
  Crown, 
  Target,
  MessageSquare,
  Zap,
  BookOpen,
  Hash,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  Copy,
  Check
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { toast } from "sonner";

interface VariantSelectorProps {
  /** 변형을 선택할 게시물 ID */
  postId: Id<"socialPosts">;
  /** 컴포넌트의 스타일 클래스 */
  className?: string;
  /** 선택 후 콜백 함수 */
  onSelectionChange?: (variantId: string | null) => void;
  /** 미리보기 모드 */
  preview?: boolean;
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
 * 게시물 변형 중 최적의 것을 선택할 수 있는 인터페이스 컴포넌트
 */
export function VariantSelector({
  postId,
  className,
  onSelectionChange,
  preview = false,
}: VariantSelectorProps) {
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  // 변형들 조회
  const variants = useQuery(api.postVariants.getByPostId, { postId });
  
  // 현재 선택된 변형 조회
  const currentSelection = useQuery(api.postVariants.getSelectedVariant, { postId });
  
  // 최고 점수 변형 조회
  const bestVariant = useQuery(api.postVariants.getBestVariant, { postId });

  // 변형 선택 뮤테이션
  const selectVariant = useMutation(api.postVariants.selectVariant);
  const deselectVariant = useMutation(api.postVariants.deselectVariant);

  // 점수 카테고리 정보
  const scoreCategories = [
    { key: "engagement" as keyof ScoreBreakdown, label: "참여도", icon: <MessageSquare className="h-3 w-3" /> },
    { key: "virality" as keyof ScoreBreakdown, label: "바이럴성", icon: <Zap className="h-3 w-3" /> },
    { key: "personaMatch" as keyof ScoreBreakdown, label: "페르소나", icon: <Target className="h-3 w-3" /> },
    { key: "readability" as keyof ScoreBreakdown, label: "가독성", icon: <BookOpen className="h-3 w-3" /> },
    { key: "trending" as keyof ScoreBreakdown, label: "트렌드", icon: <Hash className="h-3 w-3" /> },
  ];

  // 변형 선택 핸들러
  const handleSelectVariant = async (variantId: string) => {
    if (preview) return;
    
    setIsProcessing(true);
    try {
      await selectVariant({ id: variantId as Id<"postVariants"> });
      setSelectedVariantId(variantId);
      onSelectionChange?.(variantId);
      toast.success("변형이 선택되었습니다");
    } catch (error) {
      console.error("변형 선택 오류:", error);
      toast.error("변형 선택에 실패했습니다");
    } finally {
      setIsProcessing(false);
    }
  };

  // 변형 선택 해제 핸들러
  const handleDeselectVariant = async (variantId: string) => {
    if (preview) return;
    
    setIsProcessing(true);
    try {
      await deselectVariant({ id: variantId as Id<"postVariants"> });
      setSelectedVariantId(null);
      onSelectionChange?.(null);
      toast.success("변형 선택이 해제되었습니다");
    } catch (error) {
      console.error("변형 선택 해제 오류:", error);
      toast.error("변형 선택 해제에 실패했습니다");
    } finally {
      setIsProcessing(false);
    }
  };

  // 텍스트 복사 핸들러
  const handleCopyText = async (text: string, variantId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(variantId);
      setTimeout(() => setCopiedText(null), 2000);
      toast.success("텍스트가 복사되었습니다");
    } catch (error) {
      console.error("텍스트 복사 실패:", error);
      toast.error("텍스트 복사에 실패했습니다");
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

  // 현재 선택된 변형 ID 업데이트
  React.useEffect(() => {
    if (currentSelection) {
      setSelectedVariantId(currentSelection._id);
    }
  }, [currentSelection]);

  // 로딩 상태
  if (variants === undefined || bestVariant === undefined) {
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
                  <Skeleton className="h-9 w-20" />
                </div>
                <Skeleton className="h-16 w-full" />
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <Skeleton key={j} className="h-6 w-12" />
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
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-medium mb-2">선택할 변형이 없습니다</h3>
            <p>먼저 게시물 변형을 생성해 주세요.</p>
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
          <Target className="h-5 w-5" />
          <span>최적 변형 선택</span>
          <Badge variant="secondary">{variants.length}개 변형</Badge>
        </CardTitle>
        <CardDescription>
          AI가 생성한 변형들 중에서 게시할 최적의 콘텐츠를 선택하세요
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 추천 변형 알림 */}
        {bestVariant && !bestVariant.isSelected && (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <strong>추천:</strong> 변형 {sortedVariants.findIndex(v => v._id === bestVariant._id) + 1}이 
              가장 높은 점수({bestVariant.overallScore})를 받았습니다.
            </AlertDescription>
          </Alert>
        )}

        {/* 변형 목록 */}
        <div className="space-y-4">
          {sortedVariants.map((variant, index) => {
            const isSelected = variant.isSelected;
            const isBest = bestVariant?._id === variant._id;
            
            return (
              <div
                key={variant._id}
                className={cn(
                  "p-4 border rounded-lg transition-all",
                  isSelected && "border-primary bg-primary/5 shadow-sm",
                  isBest && !isSelected && "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20"
                )}
              >
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Badge variant={isSelected ? "default" : "outline"}>
                      변형 {index + 1}
                    </Badge>
                    {isBest && (
                      <Badge variant="secondary" className="text-amber-600">
                        <Crown className="h-3 w-3 mr-1" />
                        최고 점수
                      </Badge>
                    )}
                    {isSelected && (
                      <Badge variant="default">
                        <Star className="h-3 w-3 mr-1" />
                        선택됨
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className={cn("text-lg font-bold", getScoreColor(variant.overallScore))}>
                      {variant.overallScore}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyText(variant.content, variant._id)}
                      className="h-8 w-8 p-0"
                    >
                      {copiedText === variant._id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* 콘텐츠 */}
                <div className="mb-4">
                  <Textarea
                    value={variant.content}
                    readOnly
                    className="min-h-[100px] resize-none bg-background"
                  />
                </div>

                {/* 점수 세부 분석 */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {scoreCategories.map((category) => {
                    const score = variant.scoreBreakdown[category.key];
                    return (
                      <div key={category.key} className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          {category.icon}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {category.label}
                        </div>
                        <div className={cn("text-xs font-bold", getScoreColor(score))}>
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

                {/* 선택 버튼 */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    모델: {variant.aiModel} • 생성: {new Date(variant.generatedAt).toLocaleDateString('ko-KR')}
                  </div>
                  
                  {!preview && (
                    <div>
                      {isSelected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeselectVariant(variant._id)}
                          disabled={isProcessing}
                          className="text-muted-foreground"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          선택 해제
                        </Button>
                      ) : (
                        <Button
                          variant={isBest ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSelectVariant(variant._id)}
                          disabled={isProcessing}
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          이것으로 선택
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 선택 상태 요약 */}
        <Separator />
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            {currentSelection ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">
                  변형 {sortedVariants.findIndex(v => v._id === currentSelection._id) + 1}이 선택되었습니다
                </span>
              </>
            ) : (
              <>
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">선택된 변형이 없습니다</span>
              </>
            )}
          </div>
          
          {!preview && currentSelection && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeselectVariant(currentSelection._id)}
              disabled={isProcessing}
              className="h-8 text-muted-foreground"
            >
              모두 해제
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 접근성 개선을 위한 ARIA 레이블
VariantSelector.displayName = "VariantSelector";

export default VariantSelector;