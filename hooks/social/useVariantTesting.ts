"use client";

import { useQuery, useMutation } from "convex/react";
import { useMemo, useState, useCallback } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { UseVariantTestingOptions, VariantPerformance, VariantComparison } from "../../types/social-analytics";
import { toast } from "sonner";

/**
 * 게시물 변형 A/B 테스팅을 위한 커스텀 훅
 * 
 * @param options - 훅 옵션
 * @returns 변형 테스팅 관련 데이터와 기능들
 */
export function useVariantTesting(options: UseVariantTestingOptions) {
  const { postId, autoRefresh = true, includeMetrics = true } = options;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // 변형들 조회
  const variants = useQuery(api.postVariants.getByPost, { postId });
  
  // 최고 점수 변형 조회
  const bestVariant = useQuery(api.postVariants.getBestVariant, { postId });
  
  // 현재 선택된 변형 조회
  const selectedVariant = useQuery(api.postVariants.getSelectedVariant, { postId });
  
  // 평균 점수 조회
  const averageScores = useQuery(api.postVariants.getAverageScores, { postId });

  // 변형 선택/해제 뮤테이션
  const selectVariantMutation = useMutation(api.postVariants.selectVariant);
  const deselectVariantMutation = useMutation(api.postVariants.deselectVariant);
  const removeVariantMutation = useMutation(api.postVariants.remove);

  // 종합 비교 데이터 생성
  const comparison = useMemo((): VariantComparison | null => {
    if (!variants || !averageScores) return null;

    const performanceRange = {
      min: Math.min(...variants.map(v => v.overallScore)),
      max: Math.max(...variants.map(v => v.overallScore)),
      spread: 0,
    };
    performanceRange.spread = performanceRange.max - performanceRange.min;

    return {
      variants,
      bestVariant: bestVariant || undefined,
      selectedVariant: selectedVariant || undefined,
      averageScores,
      performanceRange,
    };
  }, [variants, bestVariant, selectedVariant, averageScores]);

  // 변형 성능 분석
  const performanceAnalysis = useMemo(() => {
    if (!comparison) return null;

    const { variants } = comparison;
    if (variants.length === 0) return null;

    // 점수 분포 분석
    const scores = variants.map(v => v.overallScore);
    const scoreDistribution = {
      excellent: scores.filter(s => s >= 90).length,
      good: scores.filter(s => s >= 70 && s < 90).length,
      average: scores.filter(s => s >= 50 && s < 70).length,
      poor: scores.filter(s => s < 50).length,
    };

    // 카테고리별 최고 성능 변형
    const topByCategory = {
      engagement: variants.reduce((best, current) => 
        current.scoreBreakdown.engagement > best.scoreBreakdown.engagement ? current : best
      ),
      virality: variants.reduce((best, current) => 
        current.scoreBreakdown.virality > best.scoreBreakdown.virality ? current : best
      ),
      personaMatch: variants.reduce((best, current) => 
        current.scoreBreakdown.personaMatch > best.scoreBreakdown.personaMatch ? current : best
      ),
      readability: variants.reduce((best, current) => 
        current.scoreBreakdown.readability > best.scoreBreakdown.readability ? current : best
      ),
      trending: variants.reduce((best, current) => 
        current.scoreBreakdown.trending > best.scoreBreakdown.trending ? current : best
      ),
    };

    // AI 모델별 성능 분석
    const modelPerformance = variants.reduce((acc, variant) => {
      if (!acc[variant.aiModel]) {
        acc[variant.aiModel] = {
          count: 0,
          totalScore: 0,
          averageScore: 0,
          bestScore: 0,
          worstScore: 100,
          totalCredits: 0,
        };
      }
      
      const model = acc[variant.aiModel];
      model.count++;
      model.totalScore += variant.overallScore;
      model.totalCredits += variant.creditsUsed;
      model.bestScore = Math.max(model.bestScore, variant.overallScore);
      model.worstScore = Math.min(model.worstScore, variant.overallScore);
      model.averageScore = model.totalScore / model.count;
      
      return acc;
    }, {} as Record<string, any>);

    return {
      scoreDistribution,
      topByCategory,
      modelPerformance,
      totalVariants: variants.length,
      totalCreditsUsed: variants.reduce((sum, v) => sum + v.creditsUsed, 0),
      averageCreditsPerVariant: variants.reduce((sum, v) => sum + v.creditsUsed, 0) / variants.length,
    };
  }, [comparison]);

  // 변형 선택
  const selectVariant = useCallback(async (variantId: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await selectVariantMutation({ id: variantId as Id<"postVariants"> });
      setSelectedVariantId(variantId);
      toast.success("변형이 선택되었습니다");
      return true;
    } catch (error) {
      console.error("변형 선택 오류:", error);
      toast.error("변형 선택에 실패했습니다");
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [selectVariantMutation, isProcessing]);

  // 변형 선택 해제
  const deselectVariant = useCallback(async (variantId: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await deselectVariantMutation({ id: variantId as Id<"postVariants"> });
      setSelectedVariantId(null);
      toast.success("변형 선택이 해제되었습니다");
      return true;
    } catch (error) {
      console.error("변형 선택 해제 오류:", error);
      toast.error("변형 선택 해제에 실패했습니다");
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [deselectVariantMutation, isProcessing]);

  // 변형 삭제
  const removeVariant = useCallback(async (variantId: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await removeVariantMutation({ id: variantId as Id<"postVariants"> });
      toast.success("변형이 삭제되었습니다");
      return true;
    } catch (error) {
      console.error("변형 삭제 오류:", error);
      toast.error("변형 삭제에 실패했습니다");
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [removeVariantMutation, isProcessing]);

  // 최적 변형 자동 선택
  const selectBestVariant = useCallback(async () => {
    if (!bestVariant) {
      toast.error("선택할 최적 변형이 없습니다");
      return false;
    }
    
    return await selectVariant(bestVariant._id);
  }, [bestVariant, selectVariant]);

  // 변형 비교 리포트 생성
  const generateReport = useCallback(() => {
    if (!comparison || !performanceAnalysis) return null;

    const { variants, averageScores } = comparison;
    const { scoreDistribution, modelPerformance } = performanceAnalysis;

    return {
      summary: {
        totalVariants: variants.length,
        averageScore: averageScores.overallScore,
        bestScore: comparison.performanceRange.max,
        worstScore: comparison.performanceRange.min,
        scoreRange: comparison.performanceRange.spread,
      },
      distribution: scoreDistribution,
      models: modelPerformance,
      recommendations: generateRecommendations(comparison, performanceAnalysis),
      createdAt: new Date().toISOString(),
    };
  }, [comparison, performanceAnalysis]);

  // 점수 기반 색상 반환
  const getScoreColor = useCallback((score: number): string => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  }, []);

  // 변형 비교 점수 계산
  const getComparisonScore = useCallback((variant: VariantPerformance): number => {
    if (!averageScores) return 0;
    return variant.overallScore - averageScores.overallScore;
  }, [averageScores]);

  return {
    // 데이터
    variants: variants || [],
    bestVariant,
    selectedVariant,
    comparison,
    performanceAnalysis,
    
    // 상태
    isLoading: variants === undefined,
    isProcessing,
    
    // 액션
    selectVariant,
    deselectVariant,
    removeVariant,
    selectBestVariant,
    
    // 유틸리티
    getScoreColor,
    getComparisonScore,
    generateReport,
  };
}

// 추천사항 생성 함수
function generateRecommendations(
  comparison: VariantComparison,
  analysis: any
): Array<{ type: string; title: string; description: string; priority: "high" | "medium" | "low" }> {
  const recommendations = [];
  
  // 점수 분포에 따른 추천
  if (analysis.scoreDistribution.poor > 0) {
    recommendations.push({
      type: "content_improvement",
      title: "저성능 변형 개선 필요",
      description: `${analysis.scoreDistribution.poor}개의 변형이 낮은 점수(50점 미만)를 받았습니다. 프롬프트나 페르소나 설정을 개선해보세요.`,
      priority: "high" as const,
    });
  }
  
  // 모델 성능에 따른 추천
  const bestModel = Object.entries(analysis.modelPerformance)
    .sort(([,a], [,b]) => (b as any).averageScore - (a as any).averageScore)[0];
  
  if (bestModel) {
    recommendations.push({
      type: "model_optimization",
      title: "최적 AI 모델 활용",
      description: `${bestModel[0]} 모델이 평균 ${(bestModel[1] as any).averageScore.toFixed(1)}점으로 가장 좋은 성능을 보였습니다.`,
      priority: "medium" as const,
    });
  }
  
  // 선택되지 않은 최고 점수 변형에 대한 추천
  if (comparison.bestVariant && !comparison.bestVariant.isSelected) {
    recommendations.push({
      type: "selection_optimization",
      title: "최고 점수 변형 선택 고려",
      description: `현재 선택된 변형보다 ${comparison.bestVariant.overallScore}점을 받은 변형이 있습니다.`,
      priority: "medium" as const,
    });
  }
  
  return recommendations;
}

export default useVariantTesting;