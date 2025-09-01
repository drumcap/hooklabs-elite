export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  variantId: string;
  features: string[];
  popular?: boolean;
  buttonText?: string;
  trialDays?: number;
}

export interface LemonSqueezyProduct {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  trialDays?: number;
}

export interface PricingFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface PricingConfig {
  basic: LemonSqueezyProduct;
  pro: LemonSqueezyProduct;
}