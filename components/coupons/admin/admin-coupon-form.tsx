"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Wand2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCouponCreation } from "@/hooks/use-coupon-mutations";
import { generateCouponCode, getCouponValueText, formatCurrency } from "@/lib/coupon-utils";
import { COUPON_TYPES } from "@/types/coupon";
import type { CreateCouponFormProps, CreateCouponFormData } from "@/types/coupon";

// Validation schema
const createCouponSchema = z.object({
  code: z.string()
    .min(3, "쿠폰 코드는 최소 3자 이상이어야 합니다")
    .max(20, "쿠폰 코드는 최대 20자까지 입력할 수 있습니다")
    .regex(/^[A-Z0-9]+$/, "쿠폰 코드는 영문 대문자와 숫자만 사용할 수 있습니다"),
  name: z.string()
    .min(1, "쿠폰 이름은 필수입니다")
    .max(100, "쿠폰 이름은 최대 100자까지 입력할 수 있습니다"),
  description: z.string().optional(),
  type: z.enum(['percentage', 'fixed_amount', 'credits']),
  value: z.number()
    .min(0, "값은 0 이상이어야 합니다")
    .refine((val) => val > 0, "할인 값은 0보다 커야 합니다"),
  currency: z.string().default('KRW'),
  minAmount: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  userLimit: z.number().int().min(1).optional(),
  validFrom: z.date(),
  validUntil: z.date().optional(),
  isActive: z.boolean().default(true),
}).refine((data) => {
  // 퍼센트 타입인 경우 100 이하로 제한
  if (data.type === 'percentage' && data.value > 100) {
    return false;
  }
  return true;
}, {
  message: "퍼센트 할인은 100% 이하로 설정해주세요",
  path: ["value"],
}).refine((data) => {
  // 종료일이 시작일보다 나중인지 확인
  if (data.validUntil && data.validUntil <= data.validFrom) {
    return false;
  }
  return true;
}, {
  message: "종료일은 시작일보다 나중이어야 합니다",
  path: ["validUntil"],
});

const steps = [
  {
    id: 'basic',
    title: '기본 정보',
    description: '쿠폰의 기본적인 정보를 입력하세요',
    fields: ['code', 'name', 'description']
  },
  {
    id: 'discount',
    title: '할인 설정',
    description: '할인 타입과 금액을 설정하세요',
    fields: ['type', 'value', 'minAmount', 'maxDiscount']
  },
  {
    id: 'limits',
    title: '사용 제한',
    description: '쿠폰의 사용 제한을 설정하세요',
    fields: ['usageLimit', 'userLimit', 'validFrom', 'validUntil']
  },
  {
    id: 'preview',
    title: '미리보기',
    description: '생성할 쿠폰 정보를 확인하세요',
    fields: []
  }
];

export function AdminCouponForm({
  defaultValues,
  onSuccess,
  onCancel,
  isModal = false,
  useSteps = true
}: CreateCouponFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createCoupon } = useCouponCreation();

  const form = useForm<CreateCouponFormData>({
    resolver: zodResolver(createCouponSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      type: 'percentage',
      value: 10,
      currency: 'KRW',
      validFrom: new Date(),
      isActive: true,
      ...defaultValues,
    },
    mode: 'onChange'
  });

  const watchedValues = form.watch();
  const currentStepFields = steps[currentStep]?.fields || [];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // 현재 스텝의 필드가 유효한지 확인
  const validateCurrentStep = useCallback(async () => {
    if (currentStepFields.length === 0) return true;
    
    const result = await form.trigger(currentStepFields as any);
    return result;
  }, [form, currentStepFields]);

  const handleNext = useCallback(async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  }, [validateCurrentStep]);

  const handlePrevious = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const generateRandomCode = useCallback(() => {
    const code = generateCouponCode(8);
    form.setValue('code', code, { shouldValidate: true });
  }, [form]);

  const onSubmit = async (data: CreateCouponFormData) => {
    setIsSubmitting(true);
    try {
      const couponId = await createCoupon(data);
      onSuccess?.(couponId);
    } catch (error) {
      console.error('Coupon creation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 미리보기 데이터 준비
  const previewData = useMemo(() => {
    if (!watchedValues) return null;
    
    return {
      ...watchedValues,
      valueText: getCouponValueText(watchedValues),
      formattedValidFrom: format(watchedValues.validFrom, 'PPP', { locale: ko }),
      formattedValidUntil: watchedValues.validUntil 
        ? format(watchedValues.validUntil, 'PPP', { locale: ko })
        : '무제한'
    };
  }, [watchedValues]);

  const StepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
              index < currentStep && "bg-primary text-primary-foreground",
              index === currentStep && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
              index > currentStep && "bg-muted text-muted-foreground"
            )}>
              {index < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "w-12 h-0.5 mx-2",
                index < currentStep ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold">{steps[currentStep].title}</h2>
        <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
      </div>
      <div className="mt-4">
        <Progress value={((currentStep + 1) / steps.length) * 100} className="h-2" />
      </div>
    </div>
  );

  const BasicInfoStep = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>쿠폰 코드 *</FormLabel>
            <div className="flex gap-2">
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="SAVE20"
                  className="uppercase font-mono"
                  maxLength={20}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <Button
                type="button"
                variant="outline"
                onClick={generateRandomCode}
                className="shrink-0"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                자동 생성
              </Button>
            </div>
            <FormDescription>
              영문 대문자와 숫자만 사용 가능합니다 (3-20자)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>쿠폰 이름 *</FormLabel>
            <FormControl>
              <Input {...field} placeholder="신규 회원 할인 쿠폰" />
            </FormControl>
            <FormDescription>
              사용자에게 표시될 쿠폰 이름입니다
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>설명 (선택)</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                placeholder="쿠폰에 대한 상세 설명을 입력하세요"
                rows={3}
              />
            </FormControl>
            <FormDescription>
              쿠폰의 자세한 설명이나 사용 조건을 입력하세요
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const DiscountStep = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>할인 타입 *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="할인 타입을 선택하세요" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.entries(COUPON_TYPES).map(([key, { label, description }]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-muted-foreground">{description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="value"
        render={({ field }) => (
          <FormItem>
            <FormLabel>할인 값 *</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  min="0"
                  step={watchedValues.type === 'percentage' ? '1' : '100'}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-muted-foreground text-sm">
                    {watchedValues.type === 'percentage' && '%'}
                    {watchedValues.type === 'fixed_amount' && '원'}
                    {watchedValues.type === 'credits' && '크레딧'}
                  </span>
                </div>
              </div>
            </FormControl>
            <FormDescription>
              {watchedValues.type === 'percentage' && '1-100 사이의 퍼센트 값을 입력하세요'}
              {watchedValues.type === 'fixed_amount' && '고정 할인 금액을 원 단위로 입력하세요'}
              {watchedValues.type === 'credits' && '지급할 크레딧 수를 입력하세요'}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="minAmount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>최소 주문 금액 (선택)</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  min="0"
                  step="1000"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-muted-foreground text-sm">원</span>
                </div>
              </div>
            </FormControl>
            <FormDescription>
              쿠폰 사용을 위한 최소 주문 금액을 설정하세요
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {watchedValues.type === 'percentage' && (
        <FormField
          control={form.control}
          name="maxDiscount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>최대 할인 금액 (선택)</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    min="0"
                    step="1000"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-muted-foreground text-sm">원</span>
                  </div>
                </div>
              </FormControl>
              <FormDescription>
                퍼센트 할인의 최대 한도를 설정하세요
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );

  const LimitsStep = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="usageLimit"
        render={({ field }) => (
          <FormItem>
            <FormLabel>전체 사용 횟수 제한 (선택)</FormLabel>
            <FormControl>
              <Input
                type="number"
                {...field}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                min="1"
                placeholder="무제한"
              />
            </FormControl>
            <FormDescription>
              쿠폰이 전체적으로 사용될 수 있는 최대 횟수입니다
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="userLimit"
        render={({ field }) => (
          <FormItem>
            <FormLabel>사용자별 사용 횟수 제한 (선택)</FormLabel>
            <FormControl>
              <Input
                type="number"
                {...field}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                min="1"
                placeholder="무제한"
              />
            </FormControl>
            <FormDescription>
              한 사용자가 이 쿠폰을 사용할 수 있는 최대 횟수입니다
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="validFrom"
        render={({ field }) => (
          <FormItem>
            <FormLabel>유효 기간 시작일 *</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? (
                      format(field.value, "PPP", { locale: ko })
                    ) : (
                      <span>날짜를 선택하세요</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="validUntil"
        render={({ field }) => (
          <FormItem>
            <FormLabel>유효 기간 종료일 (선택)</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? (
                      format(field.value, "PPP", { locale: ko })
                    ) : (
                      <span>무제한 (선택 안함)</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) => 
                    date <= watchedValues.validFrom || 
                    date < new Date(new Date().setHours(0, 0, 0, 0))
                  }
                  initialFocus
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
            <FormDescription>
              설정하지 않으면 무제한으로 사용할 수 있습니다
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">즉시 활성화</FormLabel>
              <FormDescription>
                생성 즉시 쿠폰을 활성화합니다
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );

  const PreviewStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{previewData?.name}</span>
            <Badge variant={previewData?.isActive ? 'default' : 'secondary'}>
              {previewData?.isActive ? '활성' : '비활성'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">쿠폰 코드:</span>
              <p className="font-mono font-medium">{previewData?.code}</p>
            </div>
            <div>
              <span className="text-muted-foreground">할인:</span>
              <p className="font-medium">{previewData?.valueText}</p>
            </div>
          </div>
          
          {previewData?.description && (
            <div>
              <span className="text-muted-foreground text-sm">설명:</span>
              <p className="text-sm">{previewData.description}</p>
            </div>
          )}
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">유효 기간:</span>
              <p>{previewData?.formattedValidFrom} ~ {previewData?.formattedValidUntil}</p>
            </div>
            <div>
              <span className="text-muted-foreground">사용 제한:</span>
              <p>
                전체: {previewData?.usageLimit || '무제한'}회{' / '}
                개인: {previewData?.userLimit || '무제한'}회
              </p>
            </div>
          </div>
          
          {previewData?.minAmount && (
            <div className="text-sm">
              <span className="text-muted-foreground">최소 주문 금액:</span>
              <p>{formatCurrency(previewData.minAmount)}</p>
            </div>
          )}
          
          {previewData?.maxDiscount && (
            <div className="text-sm">
              <span className="text-muted-foreground">최대 할인 금액:</span>
              <p>{formatCurrency(previewData.maxDiscount)}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <BasicInfoStep />;
      case 1:
        return <DiscountStep />;
      case 2:
        return <LimitsStep />;
      case 3:
        return <PreviewStep />;
      default:
        return null;
    }
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {useSteps && <StepIndicator />}
        
        <div className="min-h-[400px]">
          {useSteps ? renderCurrentStep() : (
            <div className="space-y-8">
              <BasicInfoStep />
              <DiscountStep />
              <LimitsStep />
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <div>
            {useSteps && !isFirstStep && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={isSubmitting}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                이전
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                취소
              </Button>
            )}

            {useSteps && !isLastStep ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                다음
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    생성 중...
                  </>
                ) : (
                  '쿠폰 생성'
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );

  if (isModal) {
    return (
      <div className="max-w-2xl max-h-[90vh] overflow-auto">
        {formContent}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>새 쿠폰 생성</CardTitle>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}

AdminCouponForm.displayName = 'AdminCouponForm';