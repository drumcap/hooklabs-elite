# UI 컴포넌트 아키텍처 설계서

## 개요

HookLabs Elite 쿠폰 관리 시스템의 UI 컴포넌트 아키텍처는 재사용성, 접근성, 성능을 중심으로 설계됩니다. shadcn/ui를 기반으로 하며, 역할 기반 접근 제어와 실시간 데이터 동기화를 지원합니다.

## 컴포넌트 계층 구조

### 전체 컴포넌트 트리

```
CouponSystem/
├── 📁 layout/                          # 레이아웃 컴포넌트
│   ├── CouponLayout.tsx               # 쿠폰 섹션 전체 레이아웃
│   ├── AdminLayout.tsx                # 관리자 전용 레이아웃
│   └── UserLayout.tsx                 # 사용자 전용 레이아웃
│
├── 📁 user/                           # 사용자 쿠폰 컴포넌트
│   ├── 📁 coupon-validator/
│   │   ├── CouponValidator.tsx        # 메인 검증 컴포넌트
│   │   ├── CouponCodeInput.tsx        # 쿠폰 코드 입력
│   │   ├── CouponValidationResult.tsx # 검증 결과 표시
│   │   └── CouponValidationSkeleton.tsx
│   │
│   ├── 📁 checkout-coupon/
│   │   ├── CheckoutCouponForm.tsx     # 결제 시 쿠폰 적용
│   │   ├── CouponSummaryCard.tsx      # 쿠폰 적용 요약
│   │   ├── PriceBreakdown.tsx         # 가격 분해 표시
│   │   └── CouponRemoveButton.tsx     # 쿠폰 제거 버튼
│   │
│   ├── 📁 usage-history/
│   │   ├── CouponUsageHistory.tsx     # 사용 내역 메인
│   │   ├── UsageHistoryTable.tsx      # 테이블 뷰
│   │   ├── UsageHistoryCard.tsx       # 모바일 카드 뷰
│   │   ├── UsageHistoryFilters.tsx    # 필터링 UI
│   │   ├── ExportButton.tsx           # CSV 내보내기
│   │   └── UsageHistorySkeleton.tsx
│   │
│   └── 📁 credit-status/
│       ├── CreditCouponStatus.tsx     # 크레딧 쿠폰 상태
│       └── CreditBalanceDisplay.tsx   # 크레딧 잔액 표시
│
├── 📁 admin/                          # 관리자 컴포넌트
│   ├── 📁 dashboard/
│   │   ├── CouponDashboard.tsx        # 메인 대시보드
│   │   ├── CouponDataTable.tsx        # 데이터 테이블
│   │   ├── CouponTableRow.tsx         # 테이블 행
│   │   ├── DashboardFilters.tsx       # 필터 및 검색
│   │   ├── DashboardActions.tsx       # 액션 버튼들
│   │   └── DashboardSkeleton.tsx
│   │
│   ├── 📁 coupon-form/
│   │   ├── CreateCouponForm.tsx       # 쿠폰 생성 폼
│   │   ├── EditCouponModal.tsx        # 쿠폰 편집 모달
│   │   ├── CouponFormFields.tsx       # 공통 폼 필드
│   │   ├── CouponTypeSelector.tsx     # 타입 선택
│   │   ├── DateRangePicker.tsx        # 날짜 범위 선택
│   │   ├── UsageLimitFields.tsx       # 사용 제한 설정
│   │   └── CouponPreview.tsx          # 쿠폰 미리보기
│   │
│   └── 📁 stats/
│       ├── CouponStatsView.tsx        # 통계 메인 뷰
│       ├── StatsOverviewCard.tsx      # 개요 통계 카드
│       ├── UsageChart.tsx             # 사용량 차트
│       ├── StatsExportButton.tsx      # 통계 내보내기
│       └── StatsSkeleton.tsx
│
├── 📁 shared/                         # 공통 컴포넌트
│   ├── 📁 ui/
│   │   ├── CouponCard.tsx             # 쿠폰 카드 UI
│   │   ├── CouponBadge.tsx            # 쿠폰 상태/타입 배지
│   │   ├── CouponStatusIcon.tsx       # 상태 아이콘
│   │   ├── DiscountDisplay.tsx        # 할인 금액 표시
│   │   └── CouponCodeDisplay.tsx      # 쿠폰 코드 표시
│   │
│   ├── 📁 loading/
│   │   ├── CouponSkeleton.tsx         # 기본 쿠폰 스켈레톤
│   │   ├── TableSkeleton.tsx          # 테이블 스켈레톤
│   │   └── CardSkeleton.tsx           # 카드 스켈레톤
│   │
│   ├── 📁 error/
│   │   ├── CouponErrorBoundary.tsx    # 쿠폰 관련 에러 바운더리
│   │   ├── CouponErrorFallback.tsx    # 에러 폴백 UI
│   │   └── AccessDenied.tsx           # 접근 거부 UI
│   │
│   └── 📁 form/
│       ├── FormField.tsx              # 커스텀 폼 필드
│       ├── FormSection.tsx            # 폼 섹션 래퍼
│       └── FormActions.tsx            # 폼 액션 버튼들
│
└── 📁 hooks/                          # 커스텀 훅
    ├── useCouponValidation.ts         # 쿠폰 검증 훅
    ├── useCouponForm.ts               # 쿠폰 폼 관리 훅
    ├── useAdminPermissions.ts         # 관리자 권한 훅
    ├── useMobileBreakpoint.ts         # 모바일 반응형 훅
    ├── useCouponExport.ts             # 데이터 내보내기 훅
    └── useRealtimeUpdates.ts          # 실시간 업데이트 훅
```

## 핵심 컴포넌트 상세 설계

### 1. CouponValidator (사용자 쿠폰 검증)

#### Props Interface
```typescript
interface CouponValidatorProps {
  /** 주문 금액 (할인 계산용) */
  orderAmount?: number;
  /** 쿠폰 적용 성공 콜백 */
  onCouponApplied?: (coupon: CouponData) => void;
  /** 쿠폰 제거 콜백 */
  onCouponRemoved?: () => void;
  /** 컴포넌트 비활성화 여부 */
  disabled?: boolean;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** CSS 클래스 */
  className?: string;
  /** 자동 포커스 여부 */
  autoFocus?: boolean;
  /** 입력 최대 길이 */
  maxLength?: number;
}

interface CouponData {
  id: Id<"coupons">;
  code: string;
  name: string;
  type: "percentage" | "fixed_amount" | "credits";
  value: number;
  discountAmount: number;
  currency?: string;
}
```

#### 컴포넌트 구현
```typescript
export const CouponValidator = memo(({
  orderAmount = 0,
  onCouponApplied,
  onCouponRemoved,
  disabled = false,
  placeholder = "쿠폰 코드를 입력하세요",
  className,
  autoFocus = false,
  maxLength = 20
}: CouponValidatorProps) => {
  const [code, setCode] = useState('');
  const [isApplied, setIsApplied] = useState(false);
  
  const debouncedCode = useDebounce(code.trim(), 500);
  const { validation, isLoading } = useCouponValidation(debouncedCode, orderAmount);
  
  const handleApply = useCallback(() => {
    if (validation?.valid && validation.coupon) {
      setIsApplied(true);
      onCouponApplied?.(validation.coupon);
    }
  }, [validation, onCouponApplied]);
  
  const handleRemove = useCallback(() => {
    setCode('');
    setIsApplied(false);
    onCouponRemoved?.();
  }, [onCouponRemoved]);
  
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && validation?.valid) {
      handleApply();
    }
  }, [validation?.valid, handleApply]);
  
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="coupon-input" className="sr-only">
            쿠폰 코드 입력
          </Label>
          <Input
            id="coupon-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || isApplied}
            autoFocus={autoFocus}
            maxLength={maxLength}
            className={cn(
              "transition-colors",
              validation?.error && "border-destructive",
              validation?.valid && "border-green-500"
            )}
            aria-describedby="coupon-status"
            aria-invalid={!!validation?.error}
          />
        </div>
        
        {!isApplied ? (
          <Button
            onClick={handleApply}
            disabled={!validation?.valid || isLoading || disabled}
            className="min-w-[80px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "적용"
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={handleRemove}
            className="min-w-[80px]"
          >
            제거
          </Button>
        )}
      </div>
      
      <div id="coupon-status" role="status" aria-live="polite">
        <CouponValidationResult 
          validation={validation}
          isLoading={isLoading && !!debouncedCode}
          isApplied={isApplied}
        />
      </div>
    </div>
  );
});
```

### 2. CouponDashboard (관리자 대시보드)

#### Props Interface
```typescript
interface CouponDashboardProps {
  /** 초기 필터 상태 */
  initialFilter?: {
    isActive?: boolean;
    searchTerm?: string;
  };
  /** 페이지 크기 */
  pageSize?: number;
  /** 쿠폰 선택 콜백 */
  onCouponSelect?: (couponId: Id<"coupons">) => void;
  /** 액션 버튼 표시 여부 */
  showActions?: boolean;
  /** 컴팩트 모드 */
  compact?: boolean;
}
```

#### 컴포넌트 구현
```typescript
export const CouponDashboard = ({
  initialFilter = {},
  pageSize = 20,
  onCouponSelect,
  showActions = true,
  compact = false
}: CouponDashboardProps) => {
  const [filters, setFilters] = useState({
    isActive: initialFilter.isActive,
    searchTerm: initialFilter.searchTerm || '',
  });
  
  const [selectedCoupons, setSelectedCoupons] = useState<Set<Id<"coupons">>>(new Set());
  
  const { coupons, isLoading, isAdmin } = useAdminCoupons(filters.isActive);
  const { isMobile } = useMobileBreakpoint();
  
  // 권한 확인
  if (!isAdmin) {
    return <AccessDenied />;
  }
  
  const filteredCoupons = useMemo(() => {
    if (!coupons || !filters.searchTerm) return coupons;
    
    const searchLower = filters.searchTerm.toLowerCase();
    return coupons.filter(coupon =>
      coupon.code.toLowerCase().includes(searchLower) ||
      coupon.name.toLowerCase().includes(searchLower) ||
      coupon.description?.toLowerCase().includes(searchLower)
    );
  }, [coupons, filters.searchTerm]);
  
  const handleBulkAction = useCallback(async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedCoupons.size === 0) return;
    
    const confirmed = await confirm(`선택된 ${selectedCoupons.size}개의 쿠폰을 ${
      action === 'activate' ? '활성화' :
      action === 'deactivate' ? '비활성화' : '삭제'
    }하시겠습니까?`);
    
    if (confirmed) {
      // 벌크 액션 실행 로직
      toast.success(`${selectedCoupons.size}개의 쿠폰이 처리되었습니다.`);
      setSelectedCoupons(new Set());
    }
  }, [selectedCoupons]);
  
  if (isLoading) {
    return <DashboardSkeleton compact={compact} />;
  }
  
  return (
    <div className={cn("space-y-6", compact && "space-y-4")}>
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 max-w-md">
          <DashboardFilters
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
        
        {showActions && (
          <DashboardActions
            selectedCount={selectedCoupons.size}
            onBulkAction={handleBulkAction}
            onCreateNew={() => router.push('/admin/coupons/create')}
          />
        )}
      </div>
      
      {selectedCoupons.size > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {selectedCoupons.size}개의 쿠폰이 선택되었습니다.
          </AlertDescription>
        </Alert>
      )}
      
      {isMobile ? (
        <CouponMobileList
          coupons={filteredCoupons || []}
          onCouponSelect={onCouponSelect}
          selectedCoupons={selectedCoupons}
          onSelectionChange={setSelectedCoupons}
        />
      ) : (
        <CouponDataTable
          coupons={filteredCoupons || []}
          onCouponSelect={onCouponSelect}
          selectedCoupons={selectedCoupons}
          onSelectionChange={setSelectedCoupons}
          compact={compact}
        />
      )}
      
      {filteredCoupons?.length === 0 && (
        <EmptyState
          icon={Ticket}
          title="쿠폰이 없습니다"
          description="새로운 쿠폰을 생성해보세요."
          action={
            <Button asChild>
              <Link href="/admin/coupons/create">
                <Plus className="h-4 w-4 mr-2" />
                쿠폰 생성
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
};
```

### 3. CreateCouponForm (쿠폰 생성 폼)

#### Props Interface
```typescript
interface CreateCouponFormProps {
  /** 초기값 */
  defaultValues?: Partial<CouponFormData>;
  /** 생성 완료 콜백 */
  onSuccess?: (couponId: Id<"coupons">) => void;
  /** 취소 콜백 */
  onCancel?: () => void;
  /** 모달 모드 여부 */
  isModal?: boolean;
  /** 단계별 폼 사용 여부 */
  useSteps?: boolean;
}

interface CouponFormData {
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'credits';
  value: number;
  currency: string;
  minAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  userLimit?: number;
  validFrom: Date;
  validUntil?: Date;
  isActive: boolean;
}
```

#### 컴포넌트 구현
```typescript
export const CreateCouponForm = ({
  defaultValues,
  onSuccess,
  onCancel,
  isModal = false,
  useSteps = false
}: CreateCouponFormProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { createCoupon } = useCouponCreation();
  
  const form = useCouponForm({
    defaultValues: {
      code: '',
      name: '',
      description: '',
      type: 'percentage',
      value: 0,
      currency: 'KRW',
      validFrom: new Date(),
      isActive: true,
      ...defaultValues
    }
  });
  
  const steps = useMemo(() => [
    {
      title: '기본 정보',
      description: '쿠폰의 기본적인 정보를 입력하세요',
      fields: ['code', 'name', 'description']
    },
    {
      title: '할인 설정',
      description: '할인 타입과 금액을 설정하세요',
      fields: ['type', 'value', 'minAmount', 'maxDiscount']
    },
    {
      title: '사용 제한',
      description: '쿠폰의 사용 제한을 설정하세요',
      fields: ['usageLimit', 'userLimit', 'validFrom', 'validUntil']
    },
    {
      title: '미리보기',
      description: '생성할 쿠폰 정보를 확인하세요',
      fields: []
    }
  ], []);
  
  const currentStepFields = steps[currentStep]?.fields || [];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  
  const validateCurrentStep = useCallback(() => {
    if (currentStepFields.length === 0) return true;
    
    return currentStepFields.every(field => 
      !form.formState.errors[field as keyof CouponFormData]
    );
  }, [form.formState.errors, currentStepFields]);
  
  const handleNext = useCallback(async () => {
    if (!validateCurrentStep()) {
      await form.trigger(currentStepFields as any);
      return;
    }
    
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  }, [validateCurrentStep, form, currentStepFields, steps.length]);
  
  const handlePrevious = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);
  
  const onSubmit = async (data: CouponFormData) => {
    try {
      const couponId = await createCoupon(data);
      onSuccess?.(couponId);
    } catch (error) {
      console.error('Coupon creation failed:', error);
    }
  };
  
  const generateRandomCode = useCallback(() => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    form.setValue('code', code);
  }, [form]);
  
  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {useSteps && (
          <div className="mb-6">
            <StepsIndicator
              steps={steps}
              currentStep={currentStep}
            />
          </div>
        )}
        
        {(!useSteps || currentStep === 0) && (
          <FormSection title="기본 정보">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          className="uppercase"
                          maxLength={20}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateRandomCode}
                        size="sm"
                      >
                        생성
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>쿠폰명 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="신규 회원 할인" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="쿠폰에 대한 상세 설명을 입력하세요"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>
        )}
        
        {(!useSteps || currentStep === 1) && (
          <FormSection title="할인 설정">
            <CouponTypeSelector
              control={form.control}
              watch={form.watch}
            />
          </FormSection>
        )}
        
        {(!useSteps || currentStep === 2) && (
          <FormSection title="사용 제한">
            <UsageLimitFields
              control={form.control}
            />
            
            <DateRangePicker
              control={form.control}
              startName="validFrom"
              endName="validUntil"
            />
          </FormSection>
        )}
        
        {(!useSteps || currentStep === 3) && (
          <FormSection title="미리보기">
            <CouponPreview
              data={form.getValues()}
            />
          </FormSection>
        )}
        
        <FormActions
          isModal={isModal}
          useSteps={useSteps}
          currentStep={currentStep}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onCancel={onCancel}
          isSubmitting={form.formState.isSubmitting}
        />
      </form>
    </Form>
  );
  
  if (isModal) {
    return (
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>새 쿠폰 생성</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
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
};
```

## 반응형 디자인 전략

### 1. 브레이크포인트 정의
```typescript
// tailwind.config.js
export const breakpoints = {
  sm: '640px',   // 스마트폰 (세로)
  md: '768px',   // 태블릿 (세로)
  lg: '1024px',  // 태블릿 (가로) / 작은 데스크톱
  xl: '1280px',  // 데스크톱
  '2xl': '1536px' // 큰 데스크톱
};

// 커스텀 훅
export const useMobileBreakpoint = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  useEffect(() => {
    const checkBreakpoint = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);
  
  return { isMobile, isTablet };
};
```

### 2. 반응형 컴포넌트 패턴
```typescript
// 적응형 테이블/카드 뷰
export const AdaptiveDataView = ({ data, renderCard, renderTable }) => {
  const { isMobile } = useMobileBreakpoint();
  
  return isMobile ? (
    <div className="space-y-3">
      {data.map(item => (
        <Card key={item.id} className="p-4">
          {renderCard(item)}
        </Card>
      ))}
    </div>
  ) : (
    <div className="rounded-md border">
      <Table>
        {renderTable(data)}
      </Table>
    </div>
  );
};

// 반응형 그리드
export const ResponsiveGrid = ({ children }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {children}
  </div>
);
```

## 접근성 구현 전략

### 1. 키보드 탐색
```typescript
export const useKeyboardNavigation = (items: any[], onSelect: (item: any) => void) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < items.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          onSelect(items[selectedIndex]);
        }
        break;
        
      case 'Escape':
        setSelectedIndex(-1);
        break;
    }
  }, [items, selectedIndex, onSelect]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  return { selectedIndex, setSelectedIndex };
};

// 키보드 탐색 가능한 리스트 컴포넌트
export const KeyboardNavigableList = ({ items, onSelect, renderItem }) => {
  const { selectedIndex } = useKeyboardNavigation(items, onSelect);
  
  return (
    <div role="listbox" aria-label="쿠폰 목록">
      {items.map((item, index) => (
        <div
          key={item.id}
          role="option"
          tabIndex={index === selectedIndex ? 0 : -1}
          aria-selected={index === selectedIndex}
          className={cn(
            "p-3 cursor-pointer",
            index === selectedIndex && "bg-accent"
          )}
          onClick={() => onSelect(item)}
        >
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
};
```

### 2. 스크린 리더 지원
```typescript
// Live Region 컴포넌트
export const LiveRegion = ({ 
  children, 
  politeness = 'polite' as 'polite' | 'assertive' | 'off' 
}) => (
  <div 
    aria-live={politeness}
    aria-atomic="true"
    className="sr-only"
  >
    {children}
  </div>
);

// 상태 변경 알림 컴포넌트
export const StatusAnnouncer = () => {
  const [announcement, setAnnouncement] = useState('');
  
  // 전역 상태 변경 감지 및 알림
  useEffect(() => {
    const handleStatusChange = (event: CustomEvent) => {
      setAnnouncement(event.detail.message);
      
      // 3초 후 메시지 제거
      setTimeout(() => setAnnouncement(''), 3000);
    };
    
    window.addEventListener('statusChange', handleStatusChange);
    return () => window.removeEventListener('statusChange', handleStatusChange);
  }, []);
  
  return <LiveRegion>{announcement}</LiveRegion>;
};

// 쿠폰 적용 상태 알림
export const CouponStatusAnnouncer = ({ validation, isLoading }) => {
  const prevValidation = useRef(validation);
  const [announcement, setAnnouncement] = useState('');
  
  useEffect(() => {
    if (isLoading) {
      setAnnouncement('쿠폰 확인 중...');
    } else if (validation?.valid && !prevValidation.current?.valid) {
      setAnnouncement(`쿠폰 적용 완료. ${validation.coupon?.discountAmount}원 할인`);
    } else if (validation?.error && validation.error !== prevValidation.current?.error) {
      setAnnouncement(`쿠폰 적용 실패: ${validation.error}`);
    }
    
    prevValidation.current = validation;
  }, [validation, isLoading]);
  
  return <LiveRegion politeness="assertive">{announcement}</LiveRegion>;
};
```

### 3. ARIA 속성 및 시맨틱 HTML
```typescript
// 접근성이 고려된 데이터 테이블
export const AccessibleDataTable = ({ columns, data, caption }) => (
  <div className="overflow-x-auto">
    <Table role="table">
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow role="row">
          {columns.map((column, index) => (
            <TableHead
              key={column.key}
              role="columnheader"
              aria-sort={column.sortable ? 'none' : undefined}
              tabIndex={column.sortable ? 0 : undefined}
              className={cn(column.sortable && "cursor-pointer")}
            >
              {column.label}
              {column.sortable && (
                <span className="sr-only">정렬 가능한 열</span>
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, rowIndex) => (
          <TableRow key={row.id} role="row">
            {columns.map((column, colIndex) => (
              <TableCell
                key={`${row.id}-${column.key}`}
                role="gridcell"
                aria-describedby={
                  colIndex === 0 ? `row-${rowIndex}-description` : undefined
                }
              >
                {row[column.key]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

// 접근성 폼 필드
export const AccessibleFormField = ({ 
  label, 
  error, 
  required, 
  children, 
  helpText 
}) => {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;
  
  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="필수 입력">
            *
          </span>
        )}
      </Label>
      
      <div>
        {React.cloneElement(children, {
          id: fieldId,
          'aria-describedby': cn(
            error && errorId,
            helpText && helpId
          ),
          'aria-invalid': !!error,
          'aria-required': required
        })}
      </div>
      
      {helpText && (
        <p id={helpId} className="text-sm text-muted-foreground">
          {helpText}
        </p>
      )}
      
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
```

## 성능 최적화 패턴

### 1. 메모이제이션 및 최적화
```typescript
// 무거운 계산 최적화
export const OptimizedCouponList = ({ coupons, filters }) => {
  const filteredCoupons = useMemo(() => {
    if (!filters.search) return coupons;
    
    const searchLower = filters.search.toLowerCase();
    return coupons.filter(coupon =>
      coupon.name.toLowerCase().includes(searchLower) ||
      coupon.code.toLowerCase().includes(searchLower)
    );
  }, [coupons, filters.search]);
  
  const sortedCoupons = useMemo(() => {
    return [...filteredCoupons].sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
  }, [filteredCoupons, filters.sortBy]);
  
  return (
    <div>
      {sortedCoupons.map(coupon => (
        <MemoizedCouponCard key={coupon.id} coupon={coupon} />
      ))}
    </div>
  );
};

const MemoizedCouponCard = memo(({ coupon }) => (
  <CouponCard coupon={coupon} />
), (prevProps, nextProps) => {
  return prevProps.coupon._id === nextProps.coupon._id &&
         prevProps.coupon.updatedAt === nextProps.coupon.updatedAt;
});
```

### 2. 가상화 (Virtualization)
```typescript
import { FixedSizeList as List } from 'react-window';

export const VirtualizedCouponList = ({ coupons }) => {
  const Row = useCallback(({ index, style }) => (
    <div style={style}>
      <CouponCard coupon={coupons[index]} />
    </div>
  ), [coupons]);
  
  return (
    <List
      height={600}
      itemCount={coupons.length}
      itemSize={120}
      className="w-full"
    >
      {Row}
    </List>
  );
};
```

## 테스팅 전략

### 1. 컴포넌트 단위 테스트
```typescript
// CouponValidator.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CouponValidator } from './CouponValidator';

describe('CouponValidator', () => {
  const mockProps = {
    orderAmount: 10000,
    onCouponApplied: vi.fn(),
    onCouponRemoved: vi.fn(),
  };
  
  it('should render coupon input field', () => {
    render(<CouponValidator {...mockProps} />);
    
    expect(screen.getByLabelText(/쿠폰 코드/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /적용/i })).toBeInTheDocument();
  });
  
  it('should validate coupon code on input', async () => {
    render(<CouponValidator {...mockProps} />);
    
    const input = screen.getByLabelText(/쿠폰 코드/i);
    fireEvent.change(input, { target: { value: 'VALID20' } });
    
    await waitFor(() => {
      expect(screen.getByText(/할인 적용/i)).toBeInTheDocument();
    });
  });
  
  it('should call onCouponApplied when valid coupon is applied', async () => {
    render(<CouponValidator {...mockProps} />);
    
    const input = screen.getByLabelText(/쿠폰 코드/i);
    const applyButton = screen.getByRole('button', { name: /적용/i });
    
    fireEvent.change(input, { target: { value: 'VALID20' } });
    
    await waitFor(() => {
      expect(applyButton).toBeEnabled();
    });
    
    fireEvent.click(applyButton);
    
    expect(mockProps.onCouponApplied).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALID20',
        discountAmount: expect.any(Number)
      })
    );
  });
});
```

### 2. 접근성 테스트
```typescript
// accessibility.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('CouponValidator should have no accessibility violations', async () => {
    const { container } = render(
      <CouponValidator orderAmount={10000} />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('CouponDashboard should be keyboard navigable', () => {
    render(<CouponDashboard />);
    
    // 키보드 탐색 테스트
    const firstInteractiveElement = screen.getByRole('textbox');
    firstInteractiveElement.focus();
    
    expect(document.activeElement).toBe(firstInteractiveElement);
  });
});
```

## 스타일링 가이드라인

### 1. TailwindCSS 클래스 패턴
```typescript
// 일관된 스타일링 패턴
export const stylePatterns = {
  // 카드 스타일
  card: "rounded-lg border border-border bg-card text-card-foreground shadow-sm",
  
  // 버튼 변형
  button: {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
  },
  
  // 입력 필드
  input: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  
  // 상태 표시
  status: {
    success: "text-green-600 bg-green-50 border-green-200",
    error: "text-red-600 bg-red-50 border-red-200",
    warning: "text-yellow-600 bg-yellow-50 border-yellow-200",
    info: "text-blue-600 bg-blue-50 border-blue-200"
  }
};
```

### 2. 다크 모드 지원
```typescript
// 테마 인식 컴포넌트
export const ThemeAwareCouponCard = ({ coupon }) => (
  <Card className="transition-colors duration-200 dark:border-gray-700">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">
            {coupon.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {coupon.code}
          </p>
        </div>
        <CouponBadge 
          status={coupon.isActive ? 'active' : 'inactive'}
          className="dark:bg-opacity-20"
        />
      </div>
    </CardContent>
  </Card>
);
```

---

**문서 버전**: v1.0  
**작성일**: 2025년 9월 3일  
**작성자**: UI Architecture Specialist  
**검토자**: [검토 예정]  
**승인자**: [승인 예정]