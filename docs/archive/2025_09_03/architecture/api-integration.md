# API 통합 사양서 - 쿠폰 관리 시스템

## 개요

이 문서는 쿠폰 관리 시스템 UI와 Convex 백엔드 간의 API 통합 방법을 상세히 설명합니다. Convex의 실시간 쿼리/뮤테이션 패턴과 Clerk 인증 시스템과의 통합 방법을 포함합니다.

## Convex API 아키텍처 패턴

### 1. 실시간 쿼리 패턴 (useQuery)

```typescript
// 기본 쿼리 패턴
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const MyComponent = () => {
  const data = useQuery(api.coupons.getAllCoupons, {
    isActive: true,
    limit: 50
  });
  
  // data는 undefined | 쿠폰배열
  if (data === undefined) {
    return <LoadingSpinner />;
  }
  
  return <CouponList coupons={data} />;
};
```

### 2. 뮤테이션 패턴 (useMutation)

```typescript
// 기본 뮤테이션 패턴
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const CreateCouponForm = () => {
  const createCoupon = useMutation(api.coupons.createCoupon);
  
  const handleSubmit = async (formData: CouponFormData) => {
    try {
      const couponId = await createCoupon({
        code: formData.code.toUpperCase(),
        name: formData.name,
        type: formData.type,
        value: formData.value,
        // ... 기타 필드
      });
      
      toast.success("쿠폰이 성공적으로 생성되었습니다!");
      return couponId;
    } catch (error) {
      toast.error("쿠폰 생성 중 오류가 발생했습니다.");
      console.error(error);
    }
  };
  
  return <form onSubmit={handleSubmit}>{/* 폼 내용 */}</form>;
};
```

## 쿠폰 API 함수별 통합 가이드

### 1. validateCoupon - 쿠폰 검증

#### API 시그니처
```typescript
validateCoupon(ctx, { 
  code: string, 
  userId?: Id<"users">, 
  orderAmount?: number 
}): Promise<ValidationResult>

interface ValidationResult {
  valid: boolean;
  error?: string;
  coupon?: {
    id: Id<"coupons">;
    code: string;
    name: string;
    description?: string;
    type: string;
    value: number;
    currency?: string;
    discountAmount: number;
  };
}
```

#### React 통합 패턴

```typescript
// 커스텀 훅으로 쿠폰 검증 로직 캡슐화
export const useCouponValidation = (code: string, orderAmount?: number) => {
  const { user } = useUser();
  const userId = user?.id as Id<"users"> | undefined;
  
  // 코드가 있을 때만 쿼리 실행
  const validation = useQuery(
    api.coupons.validateCoupon,
    code.trim() ? { 
      code: code.trim().toUpperCase(), 
      userId, 
      orderAmount 
    } : "skip"
  );
  
  return {
    validation,
    isLoading: validation === undefined && code.trim() !== '',
    isValid: validation?.valid ?? false,
    error: validation?.error,
    discountAmount: validation?.coupon?.discountAmount ?? 0,
    couponData: validation?.coupon
  };
};

// 컴포넌트에서 사용
const CouponValidator = ({ orderAmount }: { orderAmount: number }) => {
  const [code, setCode] = useState('');
  const debouncedCode = useDebounce(code, 500); // 500ms 디바운스
  
  const { validation, isLoading, isValid, error, discountAmount } = 
    useCouponValidation(debouncedCode, orderAmount);
  
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="coupon-code">쿠폰 코드</Label>
        <Input
          id="coupon-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="쿠폰 코드를 입력하세요"
          className={cn(
            "transition-colors",
            error && "border-red-500",
            isValid && "border-green-500"
          )}
        />
      </div>
      
      {isLoading && <Spinner />}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isValid && (
        <Alert variant="default" className="border-green-500">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription>
            할인 적용: {discountAmount.toLocaleString()}원
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
```

### 2. useCoupon - 쿠폰 사용 기록

#### API 시그니처
```typescript
useCoupon(ctx, {
  userId: Id<"users">;
  couponCode: string;
  orderId?: string;
  subscriptionId?: Id<"subscriptions">;
  discountAmount: number;
  currency?: string;
}): Promise<Id<"couponUsages">>
```

#### React 통합 패턴

```typescript
export const useCouponApplication = () => {
  const useCouponMutation = useMutation(api.coupons.useCoupon);
  const { user } = useUser();
  
  const applyCoupon = async (
    couponCode: string, 
    discountAmount: number,
    orderId?: string,
    subscriptionId?: Id<"subscriptions">
  ) => {
    if (!user?.id) throw new Error("사용자 인증이 필요합니다.");
    
    try {
      const usageId = await useCouponMutation({
        userId: user.id as Id<"users">,
        couponCode,
        discountAmount,
        orderId,
        subscriptionId,
        currency: "KRW"
      });
      
      return usageId;
    } catch (error) {
      console.error("쿠폰 사용 중 오류:", error);
      throw error;
    }
  };
  
  return { applyCoupon };
};

// 결제 플로우에서 사용
const CheckoutCouponSection = ({ orderAmount }: { orderAmount: number }) => {
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  
  const { validation, isValid } = useCouponValidation(appliedCoupon || '', orderAmount);
  const { applyCoupon } = useCouponApplication();
  
  const handleApplyCoupon = async (couponCode: string) => {
    if (isValid && validation?.coupon) {
      setAppliedCoupon(couponCode);
      setDiscountAmount(validation.coupon.discountAmount);
    }
  };
  
  const handleCompletePurchase = async (orderId: string) => {
    if (appliedCoupon && discountAmount > 0) {
      try {
        await applyCoupon(appliedCoupon, discountAmount, orderId);
        toast.success("쿠폰이 적용되었습니다!");
      } catch (error) {
        toast.error("쿠폰 적용 중 오류가 발생했습니다.");
      }
    }
  };
  
  const finalAmount = orderAmount - discountAmount;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>쿠폰 적용</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CouponValidator orderAmount={orderAmount} onApply={handleApplyCoupon} />
        
        {appliedCoupon && (
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex justify-between">
              <span>원래 금액:</span>
              <span>{orderAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>할인 금액:</span>
              <span>-{discountAmount.toLocaleString()}원</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>최종 금액:</span>
              <span>{finalAmount.toLocaleString()}원</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

### 3. getUserCouponUsages - 사용자 쿠폰 내역

#### API 시그니처
```typescript
getUserCouponUsages(ctx, {
  userId: Id<"users">;
  limit?: number;
}): Promise<CouponUsageWithCoupon[]>

interface CouponUsageWithCoupon {
  _id: Id<"couponUsages">;
  userId: Id<"users">;
  couponId: Id<"coupons">;
  orderId?: string;
  subscriptionId?: Id<"subscriptions">;
  discountAmount: number;
  currency?: string;
  usedAt: string;
  coupon: {
    code: string;
    name: string;
    type: string;
  } | null;
}
```

#### React 통합 패턴

```typescript
export const useCouponUsageHistory = (limit = 20) => {
  const { user } = useUser();
  const userId = user?.id as Id<"users"> | undefined;
  
  const usages = useQuery(
    api.coupons.getUserCouponUsages,
    userId ? { userId, limit } : "skip"
  );
  
  return {
    usages,
    isLoading: usages === undefined && userId,
    isEmpty: usages?.length === 0
  };
};

const CouponUsageHistory = () => {
  const [limit, setLimit] = useState(20);
  const { usages, isLoading, isEmpty } = useCouponUsageHistory(limit);
  
  const exportToCsv = () => {
    if (!usages) return;
    
    const csvData = usages.map(usage => ({
      '사용일': new Date(usage.usedAt).toLocaleDateString('ko-KR'),
      '쿠폰코드': usage.coupon?.code || '삭제된 쿠폰',
      '쿠폰명': usage.coupon?.name || '삭제된 쿠폰',
      '할인금액': usage.discountAmount,
      '주문ID': usage.orderId || 'N/A'
    }));
    
    const csv = convertToCsv(csvData);
    downloadCsv(csv, 'coupon-usage-history.csv');
  };
  
  if (isLoading) {
    return <CouponUsageHistorySkeleton />;
  }
  
  if (isEmpty) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Ticket className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">사용한 쿠폰이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>쿠폰 사용 내역</CardTitle>
        <Button variant="outline" size="sm" onClick={exportToCsv}>
          <Download className="h-4 w-4 mr-2" />
          CSV 다운로드
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {usages.map((usage) => (
            <div key={usage._id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{usage.coupon?.name || '삭제된 쿠폰'}</p>
                <p className="text-sm text-gray-500">
                  {usage.coupon?.code || 'N/A'} • {new Date(usage.usedAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-green-600">
                  -{usage.discountAmount.toLocaleString()}원
                </p>
                <p className="text-xs text-gray-500">
                  {usage.orderId && `주문 #${usage.orderId.slice(-6)}`}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {usages.length >= limit && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => setLimit(limit + 20)}
            >
              더 보기
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

### 4. getAllCoupons - 관리자 쿠폰 목록

#### API 시그니처
```typescript
getAllCoupons(ctx, {
  isActive?: boolean;
  limit?: number;
}): Promise<Coupon[]>
```

#### React 통합 패턴

```typescript
export const useAdminCoupons = (isActive?: boolean, limit = 100) => {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'admin';
  
  const coupons = useQuery(
    api.coupons.getAllCoupons,
    isAdmin ? { isActive, limit } : "skip"
  );
  
  return {
    coupons,
    isLoading: coupons === undefined && isAdmin,
    isAdmin
  };
};

const AdminCouponDashboard = () => {
  const [filter, setFilter] = useState<boolean | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const { coupons, isLoading, isAdmin } = useAdminCoupons(filter);
  
  if (!isAdmin) {
    return <AccessDenied />;
  }
  
  const filteredCoupons = useMemo(() => {
    if (!coupons || !searchTerm) return coupons;
    
    return coupons.filter(coupon =>
      coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coupon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coupon.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [coupons, searchTerm]);
  
  if (isLoading) {
    return <CouponDashboardSkeleton />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="쿠폰 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select
          value={filter === undefined ? 'all' : filter ? 'active' : 'inactive'}
          onValueChange={(value) => {
            setFilter(value === 'all' ? undefined : value === 'active');
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="active">활성</SelectItem>
            <SelectItem value="inactive">비활성</SelectItem>
          </SelectContent>
        </Select>
        <Button asChild>
          <Link href="/admin/coupons/create">
            <Plus className="h-4 w-4 mr-2" />
            새 쿠폰 생성
          </Link>
        </Button>
      </div>
      
      <CouponDataTable coupons={filteredCoupons || []} />
    </div>
  );
};
```

### 5. createCoupon - 쿠폰 생성

#### API 시그니처
```typescript
createCoupon(ctx, {
  code: string;
  name: string;
  description?: string;
  type: string; // 'percentage' | 'fixed_amount' | 'credits'
  value: number;
  currency?: string;
  minAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  userLimit?: number;
  validFrom: string;
  validUntil?: string;
  metadata?: any;
}): Promise<Id<"coupons">>
```

#### React 통합 패턴

```typescript
// Zod 스키마 정의
const createCouponSchema = z.object({
  code: z.string().min(3, "쿠폰 코드는 최소 3자 이상이어야 합니다").max(20),
  name: z.string().min(1, "쿠폰 이름은 필수입니다"),
  description: z.string().optional(),
  type: z.enum(['percentage', 'fixed_amount', 'credits']),
  value: z.number().min(0, "값은 0 이상이어야 합니다"),
  currency: z.string().default('KRW'),
  minAmount: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  userLimit: z.number().int().min(1).optional(),
  validFrom: z.date(),
  validUntil: z.date().optional(),
});

type CreateCouponFormData = z.infer<typeof createCouponSchema>;

export const useCouponCreation = () => {
  const createCouponMutation = useMutation(api.coupons.createCoupon);
  const router = useRouter();
  
  const createCoupon = async (data: CreateCouponFormData) => {
    try {
      const couponId = await createCouponMutation({
        ...data,
        validFrom: data.validFrom.toISOString(),
        validUntil: data.validUntil?.toISOString(),
      });
      
      toast.success("쿠폰이 성공적으로 생성되었습니다!");
      router.push('/admin/coupons');
      return couponId;
    } catch (error) {
      if (error.message?.includes('이미 존재하는')) {
        toast.error("이미 존재하는 쿠폰 코드입니다.");
      } else {
        toast.error("쿠폰 생성 중 오류가 발생했습니다.");
      }
      throw error;
    }
  };
  
  return { createCoupon };
};

const CreateCouponForm = () => {
  const { createCoupon } = useCouponCreation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<CreateCouponFormData>({
    resolver: zodResolver(createCouponSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      type: 'percentage',
      value: 0,
      currency: 'KRW',
      validFrom: new Date(),
    },
  });
  
  const generateRandomCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    form.setValue('code', code);
  };
  
  const onSubmit = async (data: CreateCouponFormData) => {
    setIsSubmitting(true);
    try {
      await createCoupon(data);
    } catch (error) {
      // 에러는 useCouponCreation에서 처리
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>새 쿠폰 생성</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>쿠폰 코드</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input {...field} placeholder="SAVE20" />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateRandomCode}
                    >
                      자동 생성
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* 기타 폼 필드들... */}
            
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              쿠폰 생성
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
```

### 6. updateCoupon - 쿠폰 업데이트

#### API 시그니처
```typescript
updateCoupon(ctx, {
  couponId: Id<"coupons">;
  updates: {
    name?: string;
    description?: string;
    value?: number;
    minAmount?: number;
    maxDiscount?: number;
    usageLimit?: number;
    userLimit?: number;
    validUntil?: string;
    isActive?: boolean;
  };
}): Promise<Id<"coupons">>
```

#### React 통합 패턴

```typescript
export const useCouponUpdate = () => {
  const updateCouponMutation = useMutation(api.coupons.updateCoupon);
  
  const updateCoupon = async (
    couponId: Id<"coupons">, 
    updates: Parameters<typeof updateCouponMutation>[0]['updates']
  ) => {
    try {
      await updateCouponMutation({ couponId, updates });
      toast.success("쿠폰이 성공적으로 업데이트되었습니다!");
    } catch (error) {
      toast.error("쿠폰 업데이트 중 오류가 발생했습니다.");
      throw error;
    }
  };
  
  return { updateCoupon };
};

const EditCouponModal = ({ 
  coupon, 
  isOpen, 
  onClose 
}: { 
  coupon: Coupon; 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  const { updateCoupon } = useCouponUpdate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm({
    defaultValues: {
      name: coupon.name,
      description: coupon.description || '',
      value: coupon.value,
      minAmount: coupon.minAmount || 0,
      maxDiscount: coupon.maxDiscount || 0,
      usageLimit: coupon.usageLimit || 0,
      userLimit: coupon.userLimit || 0,
      validUntil: coupon.validUntil ? new Date(coupon.validUntil) : undefined,
      isActive: coupon.isActive,
    },
  });
  
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await updateCoupon(coupon._id, {
        ...data,
        validUntil: data.validUntil?.toISOString(),
      });
      onClose();
    } catch (error) {
      // 에러 처리됨
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 이미 사용된 쿠폰인지 확인
  const hasBeenUsed = coupon.usageCount > 0;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>쿠폰 편집</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {hasBeenUsed && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  이미 사용된 쿠폰은 일부 필드만 수정 가능합니다.
                </AlertDescription>
              </Alert>
            )}
            
            {/* 수정 가능한 필드들 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>쿠폰 이름</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* 코드와 타입은 사용된 쿠폰의 경우 수정 불가 */}
            {!hasBeenUsed && (
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>할인 값</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* 기타 편집 가능한 필드들... */}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                업데이트
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
```

### 7. getCouponStats - 쿠폰 통계

#### API 시그니처
```typescript
getCouponStats(ctx, { 
  couponId: Id<"coupons"> 
}): Promise<CouponStatsResult | null>

interface CouponStatsResult {
  coupon: {
    id: Id<"coupons">;
    code: string;
    name: string;
    type: string;
    value: number;
    usageLimit?: number;
    usageCount: number;
  };
  stats: {
    totalUsages: number;
    totalDiscount: number;
    uniqueUsers: number;
    usagesByDate: Record<string, number>;
    remainingUses: number | null;
  };
}
```

#### React 통합 패턴

```typescript
export const useCouponStats = (couponId: Id<"coupons">) => {
  const stats = useQuery(api.coupons.getCouponStats, { couponId });
  
  return {
    stats,
    isLoading: stats === undefined,
    notFound: stats === null
  };
};

const CouponStatsView = ({ couponId }: { couponId: Id<"coupons"> }) => {
  const { stats, isLoading, notFound } = useCouponStats(couponId);
  
  if (isLoading) {
    return <CouponStatsSkeleton />;
  }
  
  if (notFound) {
    return <CouponNotFound />;
  }
  
  const chartData = Object.entries(stats.stats.usagesByDate).map(([date, count]) => ({
    date,
    count,
    formattedDate: new Date(date).toLocaleDateString('ko-KR'),
  }));
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            {stats.coupon.name} ({stats.coupon.code})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {stats.stats.totalUsages}
              </p>
              <p className="text-sm text-gray-500">총 사용 횟수</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.stats.totalDiscount.toLocaleString()}원
              </p>
              <p className="text-sm text-gray-500">총 할인 금액</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {stats.stats.uniqueUsers}
              </p>
              <p className="text-sm text-gray-500">고유 사용자</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {stats.stats.remainingUses ?? '무제한'}
              </p>
              <p className="text-sm text-gray-500">잔여 사용 횟수</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>일별 사용량</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="formattedDate" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8884d8" 
                  strokeWidth={2} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

## 에러 처리 전략

### 1. Convex 에러 처리

```typescript
// 전역 에러 핸들러
export const useConvexErrorHandler = () => {
  const handleError = (error: Error, context: string) => {
    console.error(`[${context}] Convex Error:`, error);
    
    // 특정 에러 타입에 따른 처리
    if (error.message?.includes('이미 존재하는')) {
      toast.error("이미 존재하는 항목입니다.");
    } else if (error.message?.includes('권한')) {
      toast.error("접근 권한이 없습니다.");
    } else if (error.message?.includes('네트워크')) {
      toast.error("네트워크 연결을 확인해주세요.");
    } else {
      toast.error("알 수 없는 오류가 발생했습니다.");
    }
  };
  
  return { handleError };
};

// 뮤테이션에서 에러 처리 사용
const useCouponMutation = () => {
  const { handleError } = useConvexErrorHandler();
  const createCoupon = useMutation(api.coupons.createCoupon);
  
  const createCouponWithErrorHandling = async (data: CreateCouponData) => {
    try {
      return await createCoupon(data);
    } catch (error) {
      handleError(error, 'createCoupon');
      throw error;
    }
  };
  
  return { createCoupon: createCouponWithErrorHandling };
};
```

### 2. 네트워크 상태 모니터링

```typescript
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        toast.success("인터넷 연결이 복구되었습니다.");
        setWasOffline(false);
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      toast.error("인터넷 연결을 확인해주세요.");
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);
  
  return { isOnline, wasOffline };
};
```

## 성능 최적화 패턴

### 1. 쿼리 최적화

```typescript
// 조건부 쿼리 실행
const useOptimizedCouponQuery = (code: string, shouldValidate: boolean) => {
  const validation = useQuery(
    api.coupons.validateCoupon,
    shouldValidate && code ? { code } : "skip"
  );
  
  return validation;
};

// 페이지네이션된 쿼리
const usePaginatedCoupons = (pageSize = 20) => {
  const [page, setPage] = useState(0);
  
  const coupons = useQuery(api.coupons.getAllCoupons, {
    offset: page * pageSize,
    limit: pageSize,
    isActive: true
  });
  
  return {
    coupons,
    page,
    setPage,
    hasMore: coupons?.length === pageSize
  };
};
```

### 2. 캐싱 전략

```typescript
// React Query와 함께 사용할 경우의 캐싱
const useCachedCouponValidation = (code: string, orderAmount: number) => {
  return useQuery({
    queryKey: ['coupon-validation', code, orderAmount],
    queryFn: () => validateCouponApi(code, orderAmount),
    staleTime: 5 * 60 * 1000, // 5분간 캐시
    cacheTime: 10 * 60 * 1000, // 10분간 메모리 보관
    enabled: !!code && code.length >= 3,
  });
};
```

## 실시간 업데이트 패턴

### 1. 실시간 구독 관리

```typescript
export const useRealtimeCouponUpdates = () => {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'admin';
  
  // 관리자는 전체 쿠폰 목록 구독
  const adminCoupons = useQuery(
    api.coupons.getAllCoupons,
    isAdmin ? { limit: 100 } : "skip"
  );
  
  // 일반 사용자는 본인의 쿠폰 사용 내역만 구독
  const userUsages = useQuery(
    api.coupons.getUserCouponUsages,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );
  
  return {
    adminCoupons: isAdmin ? adminCoupons : undefined,
    userUsages: !isAdmin ? userUsages : undefined,
    isAdmin
  };
};
```

### 2. 실시간 알림 시스템

```typescript
export const useCouponNotifications = () => {
  const prevCouponsRef = useRef<Coupon[]>();
  const coupons = useQuery(api.coupons.getAllCoupons, { limit: 100 });
  
  useEffect(() => {
    if (!coupons || !prevCouponsRef.current) {
      prevCouponsRef.current = coupons;
      return;
    }
    
    const prevCoupons = prevCouponsRef.current;
    
    // 새로운 쿠폰 감지
    const newCoupons = coupons.filter(coupon => 
      !prevCoupons.find(prev => prev._id === coupon._id)
    );
    
    if (newCoupons.length > 0) {
      newCoupons.forEach(coupon => {
        toast.success(`새 쿠폰이 생성되었습니다: ${coupon.name}`);
      });
    }
    
    prevCouponsRef.current = coupons;
  }, [coupons]);
};
```

## 타입 안전성 보장

### 1. Convex API 타입 생성

```typescript
// _generated/api.d.ts에서 자동 생성된 타입 사용
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

// 타입 추론을 위한 헬퍼 타입들
export type Coupon = Doc<"coupons">;
export type CouponUsage = Doc<"couponUsages">;
export type CouponId = Id<"coupons">;
export type UserId = Id<"users">;

// API 응답 타입 정의
export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  coupon?: {
    id: CouponId;
    code: string;
    name: string;
    description?: string;
    type: string;
    value: number;
    currency?: string;
    discountAmount: number;
  };
}
```

### 2. 컴포넌트 Props 타입 정의

```typescript
interface CouponValidatorProps {
  orderAmount: number;
  onCouponApplied?: (coupon: CouponValidationResult['coupon']) => void;
  onCouponRemoved?: () => void;
  disabled?: boolean;
  className?: string;
}

interface AdminCouponDashboardProps {
  initialFilter?: boolean;
  pageSize?: number;
  onCouponSelect?: (couponId: CouponId) => void;
}
```

---

**문서 버전**: v1.0  
**작성일**: 2025년 9월 3일  
**작성자**: API Integration Specialist  
**검토자**: [검토 예정]  
**승인자**: [승인 예정]