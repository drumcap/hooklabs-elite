import { Suspense } from "react"
import dynamic from "next/dynamic"
import { SectionCards } from "@/app/dashboard/section-cards"
import { Skeleton } from "@/components/ui/skeleton"

// 동적 임포트로 레이지 로딩 구현
const ChartAreaInteractive = dynamic(
  () => import("@/app/dashboard/chart-area-interactive").then(mod => ({ default: mod.ChartAreaInteractive })),
  {
    loading: () => (
      <div className="px-4 lg:px-6">
        <Skeleton className="h-[400px] w-full" />
      </div>
    ),
    ssr: false // 차트는 클라이언트 사이드에서만 렌더링
  }
)

const DataTable = dynamic(
  () => import("@/app/dashboard/data-table").then(mod => ({ default: mod.DataTable })),
  {
    loading: () => (
      <div className="px-4 lg:px-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }
)

import data from "./data.json"

export default function Page() {
  return (
    <>
      {/* 즉시 로드되는 중요한 컴포넌트 */}
      <SectionCards />
      
      {/* 지연 로딩되는 컴포넌트들 */}
      <Suspense fallback={
        <div className="px-4 lg:px-6">
          <Skeleton className="h-[400px] w-full" />
        </div>
      }>
        <ChartAreaInteractive />
      </Suspense>
      
      <Suspense fallback={
        <div className="px-4 lg:px-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      }>
        <DataTable data={data} />
      </Suspense>
    </>
  )
}
