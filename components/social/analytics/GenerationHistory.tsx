"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { Separator } from "../../ui/separator";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { 
  Calendar,
  Search,
  Filter,
  Brain,
  Clock,
  Zap,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Sparkles,
  BarChart3,
  Eye,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Target
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { toast } from "sonner";

interface GenerationHistoryProps {
  /** 컴포넌트의 스타일 클래스 */
  className?: string;
  /** 페이지당 항목 수 */
  pageSize?: number;
  /** 필터 활성화 여부 */
  enableFilters?: boolean;
  /** 상세 모드 활성화 여부 */
  detailed?: boolean;
}

interface AIGeneration {
  _id: string;
  userId: string;
  postId?: string;
  personaId?: string;
  type: string;
  prompt: string;
  response: string;
  model: string;
  creditsUsed: number;
  generationTime: number;
  inputTokens?: number;
  outputTokens?: number;
  temperature?: number;
  metadata?: any;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

interface FilterState {
  type: string;
  model: string;
  success: string;
  dateRange: string;
  search: string;
}

/**
 * AI 생성 히스토리를 페이지네이션과 필터링과 함께 표시하는 컴포넌트
 */
export function GenerationHistory({
  className,
  pageSize = 10,
  enableFilters = true,
  detailed = true,
}: GenerationHistoryProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [filters, setFilters] = React.useState<FilterState>({
    type: "all",
    model: "all",
    success: "all",
    dateRange: "all",
    search: "",
  });
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // AI 생성 히스토리 조회 - 실제 Convex API 사용
  const aiGenerationsQuery = useQuery(api.aiGenerations.list, {
    limit: 100, // 충분한 수의 데이터를 가져와서 클라이언트에서 필터링
    paginationOpts: { numItems: 100 }
  });

  // 사용자 통계 조회
  const userStats = useQuery(api.aiGenerations.getUserStats, {});

  // 월별 트렌드 조회
  const monthlyTrends = useQuery(api.aiGenerations.getMonthlyTrends, { months: 12 });

  // 생성 타입별 아이콘과 라벨
  const generationTypes = {
    content_generation: { label: "콘텐츠 생성", icon: <MessageSquare className="h-4 w-4" />, color: "text-blue-600" },
    variant_creation: { label: "변형 생성", icon: <Sparkles className="h-4 w-4" />, color: "text-purple-600" },
    optimization: { label: "최적화", icon: <Zap className="h-4 w-4" />, color: "text-yellow-600" },
    analysis: { label: "분석", icon: <BarChart3 className="h-4 w-4" />, color: "text-green-600" },
    content_scoring: { label: "콘텐츠 평가", icon: <Target className="h-4 w-4" />, color: "text-indigo-600" },
  };

  // 실제 데이터 사용
  const allGenerations: AIGeneration[] = React.useMemo(() => {
    if (!aiGenerationsQuery?.page) return [];
    return aiGenerationsQuery.page.map((gen: any) => ({
      _id: gen._id,
      userId: gen.userId,
      postId: gen.postId,
      personaId: gen.personaId,
      type: gen.type,
      prompt: gen.prompt,
      response: gen.response,
      model: gen.model,
      creditsUsed: gen.creditsUsed,
      generationTime: gen.generationTime,
      inputTokens: gen.inputTokens,
      outputTokens: gen.outputTokens,
      temperature: gen.temperature,
      metadata: gen.metadata,
      success: gen.success,
      errorMessage: gen.errorMessage,
      createdAt: gen.createdAt,
    }));
  }, [aiGenerationsQuery]);

  // 필터링된 데이터
  const filteredGenerations = React.useMemo(() => {
    return allGenerations.filter((generation) => {
      if (filters.type !== "all" && generation.type !== filters.type) return false;
      if (filters.model !== "all" && generation.model !== filters.model) return false;
      if (filters.success !== "all") {
        const isSuccess = filters.success === "true";
        if (generation.success !== isSuccess) return false;
      }
      if (filters.search && !generation.prompt.toLowerCase().includes(filters.search.toLowerCase()) &&
          !generation.response.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [allGenerations, filters]);

  // 페이지네이션된 데이터
  const paginatedGenerations = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredGenerations.slice(startIndex, startIndex + pageSize);
  }, [filteredGenerations, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredGenerations.length / pageSize);

  // 텍스트 복사 핸들러
  const handleCopyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("텍스트가 복사되었습니다");
    } catch (error) {
      console.error("텍스트 복사 실패:", error);
      toast.error("텍스트 복사에 실패했습니다");
    }
  };

  // 필터 변경 핸들러
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
  };

  // 시간 포맷팅
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // 상대 시간 포맷팅
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return "방금 전";
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <span>AI 생성 히스토리</span>
          <Badge variant="secondary">{filteredGenerations.length}개 항목</Badge>
        </CardTitle>
        <CardDescription>
          AI가 생성한 콘텐츠의 전체 히스토리를 확인하고 관리하세요
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 필터 섹션 */}
        {enableFilters && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">필터</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">타입</label>
                <Select value={filters.type} onValueChange={(value) => handleFilterChange("type", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 타입</SelectItem>
                    <SelectItem value="content_generation">콘텐츠 생성</SelectItem>
                    <SelectItem value="variant_creation">변형 생성</SelectItem>
                    <SelectItem value="optimization">최적화</SelectItem>
                    <SelectItem value="analysis">분석</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">모델</label>
                <Select value={filters.model} onValueChange={(value) => handleFilterChange("model", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 모델</SelectItem>
                    <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="claude-3">Claude 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">상태</label>
                <Select value={filters.success} onValueChange={(value) => handleFilterChange("success", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 상태</SelectItem>
                    <SelectItem value="true">성공</SelectItem>
                    <SelectItem value="false">실패</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">검색</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="프롬프트 또는 응답 검색..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* 생성 히스토리 목록 */}
        <div className="space-y-4">
          {paginatedGenerations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-medium mb-2">생성 히스토리가 없습니다</h3>
              <p>AI 콘텐츠를 생성하면 여기에 히스토리가 표시됩니다.</p>
            </div>
          ) : (
            paginatedGenerations.map((generation) => {
              const typeInfo = generationTypes[generation.type as keyof typeof generationTypes];
              
              return (
                <div
                  key={generation._id}
                  className={cn(
                    "p-4 border rounded-lg transition-all hover:shadow-sm",
                    !generation.success && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20"
                  )}
                >
                  {/* 헤더 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={cn("p-2 rounded-lg bg-muted", typeInfo?.color)}>
                        {typeInfo?.icon}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{typeInfo?.label}</Badge>
                          <Badge variant="secondary">{generation.model}</Badge>
                          {generation.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatRelativeTime(generation.createdAt)}</span>
                          <span>•</span>
                          <span>{formatDuration(generation.generationTime)}</span>
                          <span>•</span>
                          <span>{generation.creditsUsed} 크레딧</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {generation.postId && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyText(generation.response, generation._id)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* 프롬프트 */}
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium mb-1">프롬프트</div>
                      <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-md">
                        {generation.prompt}
                      </div>
                    </div>

                    {/* 응답 */}
                    {generation.success ? (
                      <div>
                        <div className="text-sm font-medium mb-1">생성된 콘텐츠</div>
                        <div className="text-sm p-3 bg-background border rounded-md">
                          {generation.response}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-medium mb-1 text-red-600">오류</div>
                        <div className="text-sm text-red-600 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-md">
                          {generation.errorMessage || "알 수 없는 오류가 발생했습니다"}
                        </div>
                      </div>
                    )}

                    {/* 상세 정보 (detailed 모드일 때만) */}
                    {detailed && generation.success && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                        {generation.inputTokens && (
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">입력 토큰</div>
                            <div className="text-sm font-medium">{generation.inputTokens.toLocaleString()}</div>
                          </div>
                        )}
                        {generation.outputTokens && (
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">출력 토큰</div>
                            <div className="text-sm font-medium">{generation.outputTokens.toLocaleString()}</div>
                          </div>
                        )}
                        {generation.temperature && (
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">Temperature</div>
                            <div className="text-sm font-medium">{generation.temperature}</div>
                          </div>
                        )}
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">효율성</div>
                          <div className="text-sm font-medium">
                            {generation.outputTokens && generation.inputTokens 
                              ? `${(generation.outputTokens / generation.inputTokens).toFixed(2)}x`
                              : "N/A"
                            }
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {filteredGenerations.length}개 중 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredGenerations.length)}개 표시
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 접근성 개선을 위한 ARIA 레이블
GenerationHistory.displayName = "GenerationHistory";

export default GenerationHistory;