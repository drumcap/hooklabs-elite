import PaymentGate from "@/components/payment-gate";

function FeaturesCard() {
  return (
    <div className="px-4 lg:px-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">고급 기능</h1>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">프리미엄 전용 페이지</h2>
          <p className="text-muted-foreground">
            이 페이지는 유료 플랜 사용자만 접근할 수 있습니다. 다양한 고급 기능들을 제공합니다.
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              고급 분석 대시보드
            </div>
            <div className="flex items-center text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              API 접근 권한
            </div>
            <div className="flex items-center text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              우선 고객 지원
            </div>
            <div className="flex items-center text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              팀 협업 기능
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PremiumPage() {
  return (
    <PaymentGate
      title="프리미엄 기능 접근"
      description="이 페이지의 고급 기능들을 사용하려면 유료 플랜 구독이 필요합니다."
    >
      <FeaturesCard />
    </PaymentGate>
  );
} 