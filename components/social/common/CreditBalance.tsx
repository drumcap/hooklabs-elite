"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Zap, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  Clock,
  AlertTriangle,
  Sparkles,
  CreditCard,
  Gift,
  History,
  ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CreditBalanceProps {
  showDetails?: boolean
  variant?: "compact" | "detailed" | "widget"
  onPurchaseCredits?: () => void
  className?: string
}

interface CreditBalance {
  totalCredits: number
  availableCredits: number
  usedCredits: number
  expiredCredits: number
  lastUpdated: string
}

interface CreditUsage {
  today: number
  thisWeek: number
  thisMonth: number
  average: number
}

export function CreditBalance({ 
  showDetails = true, 
  variant = "detailed",
  onPurchaseCredits,
  className 
}: CreditBalanceProps) {
  const [showHistory, setShowHistory] = useState(false)

  // Query credit balance
  const creditBalance = useQuery(api.credits.getBalance) as CreditBalance | undefined
  const creditUsage = useQuery(api.credits.getUsageStats) as CreditUsage | undefined
  const recentTransactions = useQuery(api.credits.getRecentTransactions, { limit: 5 })

  if (!creditBalance) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="p-4">
          <div className="h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  const usagePercentage = creditBalance.totalCredits > 0 
    ? (creditBalance.usedCredits / creditBalance.totalCredits) * 100 
    : 0

  const getBalanceStatus = () => {
    if (creditBalance.availableCredits <= 0) {
      return { 
        status: "empty", 
        color: "text-red-600", 
        bgColor: "bg-red-50 dark:bg-red-900/20",
        message: "크레딧이 부족합니다" 
      }
    }
    if (creditBalance.availableCredits < 100) {
      return { 
        status: "low", 
        color: "text-yellow-600", 
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
        message: "크레딧이 부족해집니다" 
      }
    }
    if (creditBalance.availableCredits < 500) {
      return { 
        status: "medium", 
        color: "text-blue-600", 
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        message: "충분한 크레딧" 
      }
    }
    return { 
      status: "high", 
      color: "text-green-600", 
      bgColor: "bg-green-50 dark:bg-green-900/20",
      message: "풍부한 크레딧" 
    }
  }

  const balanceStatus = getBalanceStatus()

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const getDaysRemaining = () => {
    if (!creditUsage || creditUsage.average <= 0) return "∞"
    const daysLeft = Math.floor(creditBalance.availableCredits / creditUsage.average)
    return daysLeft > 999 ? "999+" : daysLeft.toString()
  }

  // Compact Widget Variant
  if (variant === "widget") {
    return (
      <Card className={cn("hover:shadow-md transition-shadow cursor-pointer", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn("p-2 rounded-full", balanceStatus.bgColor)}>
                <Zap className={cn("h-4 w-4", balanceStatus.color)} />
              </div>
              <div>
                <p className="text-lg font-bold">{formatNumber(creditBalance.availableCredits)}</p>
                <p className="text-xs text-muted-foreground">크레딧 잔액</p>
              </div>
            </div>
            {balanceStatus.status === "empty" || balanceStatus.status === "low" ? (
              <Button size="sm" onClick={onPurchaseCredits}>
                <Plus className="h-4 w-4 mr-1" />
                충전
              </Button>
            ) : (
              <Badge variant="outline" className={balanceStatus.color}>
                {balanceStatus.message}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Compact Variant
  if (variant === "compact") {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold">크레딧</span>
            </div>
            <Button variant="outline" size="sm" onClick={onPurchaseCredits}>
              <Plus className="h-4 w-4 mr-1" />
              충전
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{formatNumber(creditBalance.availableCredits)}</span>
              <Badge variant="secondary" className={balanceStatus.color}>
                {balanceStatus.status === "high" ? "풍부" : 
                 balanceStatus.status === "medium" ? "충분" :
                 balanceStatus.status === "low" ? "부족" : "없음"}
              </Badge>
            </div>
            <Progress 
              value={(creditBalance.availableCredits / creditBalance.totalCredits) * 100} 
              className="h-2"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>총 {formatNumber(creditBalance.totalCredits)}</span>
              <span>약 {getDaysRemaining()}일 사용 가능</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Detailed Variant
  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Balance Card */}
      <Card className={cn("transition-all", balanceStatus.bgColor)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              <span>크레딧 잔액</span>
            </CardTitle>
            <Button onClick={onPurchaseCredits} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              크레딧 구매
            </Button>
          </div>
          <CardDescription>{balanceStatus.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Balance */}
          <div className="text-center">
            <p className="text-4xl font-bold mb-2">
              {formatNumber(creditBalance.availableCredits)}
            </p>
            <p className="text-muted-foreground">사용 가능한 크레딧</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>사용률</span>
              <span>{usagePercentage.toFixed(1)}%</span>
            </div>
            <Progress value={usagePercentage} className="h-3" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>사용: {formatNumber(creditBalance.usedCredits)}</span>
              <span>총: {formatNumber(creditBalance.totalCredits)}</span>
            </div>
          </div>

          {/* Quick Stats */}
          {showDetails && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">
                  +{formatNumber(creditBalance.totalCredits - creditBalance.usedCredits - creditBalance.expiredCredits)}
                </p>
                <p className="text-xs text-muted-foreground">획득한 크레딧</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">
                  -{formatNumber(creditBalance.usedCredits)}
                </p>
                <p className="text-xs text-muted-foreground">사용한 크레딧</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-600">
                  -{formatNumber(creditBalance.expiredCredits)}
                </p>
                <p className="text-xs text-muted-foreground">만료된 크레딧</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      {showDetails && creditUsage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">사용량 통계</CardTitle>
            <CardDescription>최근 크레딧 사용 패턴을 확인하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                <p className="text-lg font-bold">{creditUsage.today}</p>
                <p className="text-xs text-muted-foreground">오늘</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <BarChart3 className="h-5 w-5 text-green-500 mx-auto mb-2" />
                <p className="text-lg font-bold">{creditUsage.thisWeek}</p>
                <p className="text-xs text-muted-foreground">이번 주</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <TrendingDown className="h-5 w-5 text-purple-500 mx-auto mb-2" />
                <p className="text-lg font-bold">{creditUsage.thisMonth}</p>
                <p className="text-xs text-muted-foreground">이번 달</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <Clock className="h-5 w-5 text-orange-500 mx-auto mb-2" />
                <p className="text-lg font-bold">{creditUsage.average}</p>
                <p className="text-xs text-muted-foreground">일평균</p>
              </div>
            </div>

            {creditUsage.average > 0 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    예상 사용 가능 기간
                  </span>
                </div>
                <p className="text-lg font-bold text-blue-600 mt-1">
                  약 {getDaysRemaining()}일
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-200">
                  현재 사용 패턴을 기준으로 계산됨
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Low Balance Warning */}
      {(balanceStatus.status === "empty" || balanceStatus.status === "low") && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                  {balanceStatus.status === "empty" ? "크레딧이 모두 소진되었습니다!" : "크레딧이 부족합니다!"}
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                  {balanceStatus.status === "empty" 
                    ? "AI 기능을 계속 사용하려면 크레딧을 구매해주세요."
                    : "원활한 서비스 이용을 위해 미리 크레딧을 충전하시는 것을 권장합니다."
                  }
                </p>
                <div className="flex items-center space-x-3">
                  <Button onClick={onPurchaseCredits} size="sm">
                    <CreditCard className="h-4 w-4 mr-2" />
                    크레딧 구매하기
                  </Button>
                  <Button variant="outline" size="sm">
                    <Gift className="h-4 w-4 mr-2" />
                    무료 크레딧 받기
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      {showDetails && recentTransactions && recentTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">최근 내역</CardTitle>
                <CardDescription>최근 크레딧 거래 내역입니다</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4 mr-2" />
                전체 보기
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.slice(0, 3).map((transaction: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    {transaction.type === "earned" ? (
                      <div className="p-1 bg-green-100 rounded-full">
                        <Plus className="h-3 w-3 text-green-600" />
                      </div>
                    ) : transaction.type === "used" ? (
                      <div className="p-1 bg-blue-100 rounded-full">
                        <Sparkles className="h-3 w-3 text-blue-600" />
                      </div>
                    ) : (
                      <div className="p-1 bg-gray-100 rounded-full">
                        <Clock className="h-3 w-3 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "text-sm font-semibold",
                    transaction.amount > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {transaction.amount > 0 ? "+" : ""}{transaction.amount}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}