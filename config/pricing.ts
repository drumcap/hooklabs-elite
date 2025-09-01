import { PricingPlan, PricingConfig } from "@/types/pricing";

// Lemon Squeezy 제품 설정 (실제 API에서 가져온 데이터 기반)
export const LEMON_SQUEEZY_PRODUCTS: PricingConfig = {
  basic: {
    id: "basic",
    productId: "623890", 
    variantId: "977151",
    name: "Basic",
    price: 5900, // $59.00 in cents
    currency: "usd",
    interval: "month",
    trialDays: 14,
  },
  pro: {
    id: "pro",
    productId: "623895",
    variantId: "977158", 
    name: "Pro",
    price: 9900, // $99.00 in cents
    currency: "usd",
    interval: "month",
    trialDays: 0,
  },
};

// 실제 UI에서 사용할 플랜 데이터
export const PRICING_PLANS: PricingPlan[] = [
  {
    ...LEMON_SQUEEZY_PRODUCTS.basic,
    description: "개인 사용자를 위한 기본 플랜",
    features: [
      "14일 무료 평가판",
      "기본 기능 접근",
      "이메일 지원", 
      "기본 템플릿",
      "월간 리포트",
    ],
    buttonText: "Basic 플랜 시작",
  },
  {
    ...LEMON_SQUEEZY_PRODUCTS.pro,
    description: "전문가와 팀을 위한 고급 플랜",
    features: [
      "모든 Basic 기능",
      "고급 분석 도구",
      "우선 지원",
      "고급 템플릿", 
      "팀 협업 기능",
      "API 접근",
      "무제한 보고서",
    ],
    popular: true,
    buttonText: "Pro 플랜 시작",
  },
];

// 환경별 설정 준비 (향후 확장용)
export const getPricingPlans = (): PricingPlan[] => {
  // 나중에 환경별 로직 추가 가능
  // if (process.env.NODE_ENV === 'production') {
  //   return await fetchPricingFromAPI();
  // }
  return PRICING_PLANS;
};

// 특정 플랜 조회 유틸리티 함수
export const getPlanById = (planId: string): PricingPlan | undefined => {
  return PRICING_PLANS.find(plan => plan.id === planId);
};

// Variant ID로 플랜 조회 유틸리티 함수  
export const getPlanByVariantId = (variantId: string): PricingPlan | undefined => {
  return PRICING_PLANS.find(plan => plan.variantId === variantId);
};