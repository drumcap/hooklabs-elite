"use client";

import { useQuery } from "convex/react";
import { useMemo, useState, useCallback, useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { 
  UseAIGenerationsOptions, 
  AIGenerationHistory, 
  AIGenerationStats,
  GenerationFilters,
  PaginationParams 
} from "../../types/social-analytics";

/**
 * AI 생성 히스토리 관리를 위한 커스텀 훅
 * 
 * @param options - 훅 옵션
 * @returns AI 생성 히스토리 관련 데이터와 기능들
 */
export function useAIGenerations(options: UseAIGenerationsOptions = {}) {
  const {
    filters: initialFilters = {},
    pagination: initialPagination = { page: 1, limit: 20, total: 0, hasNext: false, hasPrevious: false },
    realtime = false
  } = options;

  const [filters, setFilters] = useState<GenerationFilters>(initialFilters);
  const [pagination, setPagination] = useState<PaginationParams>(initialPagination);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // 변형 통계 조회 (AI 생성 통계 대용)
  const variantStats = useQuery(api.postVariants.getUserVariantStats, {
    startDate: filters.dateRange?.start,
    endDate: filters.dateRange?.end,
  });

  // 실시간 업데이트 (realtime 모드일 때)
  useEffect(() => {
    if (!realtime) return;

    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // 30초마다 업데이트

    return () => clearInterval(interval);
  }, [realtime]);

  // 모의 생성 히스토리 데이터
  const mockGenerations = useMemo((): AIGenerationHistory[] => {
    const generations: AIGenerationHistory[] = [];
    const now = new Date();
    
    // 최근 30일간의 모의 데이터 생성
    for (let i = 0; i < 50; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000 * Math.random());
      const types = ["content_generation", "variant_creation", "optimization", "analysis"];
      const models = ["gemini-1.5-pro", "gpt-4", "claude-3", "gpt-3.5-turbo"];
      const type = types[Math.floor(Math.random() * types.length)] as any;
      const model = models[Math.floor(Math.random() * models.length)];
      
      generations.push({
        _id: `gen_${i}` as any,
        userId: "user1" as any,
        postId: Math.random() > 0.5 ? `post_${Math.floor(Math.random() * 10)}` as any : undefined,
        type,
        prompt: `${type}을 위한 프롬프트 예제 ${i + 1}`,
        response: `AI가 생성한 응답 내용 ${i + 1}`,
        model,
        creditsUsed: Math.floor(Math.random() * 20) + 5,
        generationTime: Math.floor(Math.random() * 5000) + 1000,
        inputTokens: Math.floor(Math.random() * 200) + 50,
        outputTokens: Math.floor(Math.random() * 150) + 30,
        temperature: Math.random() * 0.5 + 0.5,
        success: Math.random() > 0.1, // 90% 성공률
        errorMessage: Math.random() > 0.9 ? "API 연결 시간 초과" : undefined,
        createdAt: date.toISOString(),
      });
    }
    
    return generations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [lastUpdate]);

  // 필터링된 생성 히스토리
  const filteredGenerations = useMemo(() => {
    let filtered = [...mockGenerations];

    // 타입 필터
    if (filters.type && filters.type !== "all") {
      filtered = filtered.filter(gen => gen.type === filters.type);
    }

    // 모델 필터
    if (filters.model && filters.model !== "all") {
      filtered = filtered.filter(gen => gen.model === filters.model);
    }

    // 성공/실패 필터
    if (filters.success !== undefined) {
      filtered = filtered.filter(gen => gen.success === filters.success);
    }

    // 날짜 범위 필터
    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      filtered = filtered.filter(gen => {
        const genDate = new Date(gen.createdAt);
        return genDate >= startDate && genDate <= endDate;
      });
    }

    // 검색 필터
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(gen => 
        gen.prompt.toLowerCase().includes(searchLower) ||
        gen.response.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [mockGenerations, filters]);

  // 페이지네이션 적용
  const paginatedGenerations = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const items = filteredGenerations.slice(startIndex, endIndex);
    
    const totalPages = Math.ceil(filteredGenerations.length / pagination.limit);
    const updatedPagination: PaginationParams = {
      ...pagination,
      total: filteredGenerations.length,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };

    return {
      items,
      pagination: updatedPagination,
    };
  }, [filteredGenerations, pagination]);

  // 통계 계산
  const statistics = useMemo((): AIGenerationStats => {
    const generations = filteredGenerations;
    const successful = generations.filter(g => g.success);
    
    // 모델별 사용량 분석
    const modelUsageBreakdown = generations.reduce((acc, gen) => {
      if (!acc[gen.model]) {
        acc[gen.model] = {
          count: 0,
          percentage: 0,
          averageCredits: 0,
          averageScore: 0,
        };
      }
      acc[gen.model].count++;
      return acc;
    }, {} as Record<string, any>);

    // 백분율 계산
    Object.keys(modelUsageBreakdown).forEach(model => {
      modelUsageBreakdown[model].percentage = 
        (modelUsageBreakdown[model].count / generations.length) * 100;
      modelUsageBreakdown[model].averageCredits = 
        generations.filter(g => g.model === model)
          .reduce((sum, g) => sum + g.creditsUsed, 0) / modelUsageBreakdown[model].count;
      modelUsageBreakdown[model].averageScore = 
        75 + Math.random() * 20; // 모의 점수
    });

    // 타입별 분석
    const typeBreakdown = generations.reduce((acc, gen) => {
      if (!acc[gen.type]) {
        acc[gen.type] = { count: 0, percentage: 0 };
      }
      acc[gen.type].count++;
      return acc;
    }, {} as Record<string, any>);

    Object.keys(typeBreakdown).forEach(type => {
      typeBreakdown[type].percentage = 
        (typeBreakdown[type].count / generations.length) * 100;
    });

    // 일별 통계
    const dailyStats = generateDailyStats(generations);

    return {
      totalGenerations: generations.length,
      totalCreditsUsed: generations.reduce((sum, g) => sum + g.creditsUsed, 0),
      averageGenerationTime: successful.reduce((sum, g) => sum + g.generationTime, 0) / successful.length || 0,
      averageScore: 75 + Math.random() * 20, // 모의 평균 점수
      successRate: (successful.length / generations.length) * 100 || 0,
      modelUsageBreakdown,
      typeBreakdown,
      dailyStats,
    };
  }, [filteredGenerations]);

  // 필터 업데이트
  const updateFilters = useCallback((newFilters: Partial<GenerationFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // 필터 변경 시 첫 페이지로
  }, []);

  // 페이지 변경
  const changePage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  // 페이지 크기 변경
  const changePageSize = useCallback((limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  // 필터 초기화
  const resetFilters = useCallback(() => {
    setFilters({});
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // 생성 히스토리 내보내기
  const exportData = useCallback((format: "csv" | "json" = "json") => {
    const data = filteredGenerations.map(gen => ({
      id: gen._id,
      type: gen.type,
      model: gen.model,
      prompt: gen.prompt,
      response: gen.response,
      creditsUsed: gen.creditsUsed,
      generationTime: gen.generationTime,
      success: gen.success,
      createdAt: gen.createdAt,
    }));

    if (format === "csv") {
      const csv = convertToCSV(data);
      downloadFile(csv, "ai-generations.csv", "text/csv");
    } else {
      const json = JSON.stringify(data, null, 2);
      downloadFile(json, "ai-generations.json", "application/json");
    }
  }, [filteredGenerations]);

  // 트렌드 분석
  const trendAnalysis = useMemo(() => {
    const recentWeek = filteredGenerations.filter(gen => {
      const genDate = new Date(gen.createdAt);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return genDate >= weekAgo;
    });

    const previousWeek = filteredGenerations.filter(gen => {
      const genDate = new Date(gen.createdAt);
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return genDate >= twoWeeksAgo && genDate < weekAgo;
    });

    const recentCount = recentWeek.length;
    const previousCount = previousWeek.length;
    const countChange = previousCount === 0 ? 0 : ((recentCount - previousCount) / previousCount) * 100;

    const recentCredits = recentWeek.reduce((sum, g) => sum + g.creditsUsed, 0);
    const previousCredits = previousWeek.reduce((sum, g) => sum + g.creditsUsed, 0);
    const creditsChange = previousCredits === 0 ? 0 : ((recentCredits - previousCredits) / previousCredits) * 100;

    return {
      countChange,
      creditsChange,
      recentActivity: recentCount,
      trending: countChange > 10 ? "up" : countChange < -10 ? "down" : "stable",
    };
  }, [filteredGenerations]);

  return {
    // 데이터
    generations: paginatedGenerations.items,
    statistics,
    trendAnalysis,
    
    // 상태
    pagination: paginatedGenerations.pagination,
    filters,
    isLoading: variantStats === undefined,
    lastUpdate,
    
    // 액션
    updateFilters,
    changePage,
    changePageSize,
    resetFilters,
    exportData,
    
    // 새로고침
    refresh: () => setLastUpdate(new Date()),
  };
}

// 일별 통계 생성 함수
function generateDailyStats(generations: AIGenerationHistory[]) {
  const dailyMap = new Map<string, {
    date: string;
    generations: number;
    credits: number;
    averageScore: number;
  }>();

  generations.forEach(gen => {
    const date = new Date(gen.createdAt).toISOString().split('T')[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        generations: 0,
        credits: 0,
        averageScore: 0,
      });
    }
    
    const daily = dailyMap.get(date)!;
    daily.generations++;
    daily.credits += gen.creditsUsed;
  });

  return Array.from(dailyMap.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30); // 최근 30일
}

// CSV 변환 함수
function convertToCSV(data: any[]): string {
  if (data.length === 0) return "";
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(",");
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      return typeof value === "string" ? `"${value.replace(/"/g, '""')}"` : value;
    }).join(",")
  );
  
  return [csvHeaders, ...csvRows].join("\n");
}

// 파일 다운로드 함수
function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default useAIGenerations;