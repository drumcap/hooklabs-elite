"use client";

import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface AccessDeniedProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
  className?: string;
}

export function AccessDenied({ 
  title = "접근 권한이 없습니다",
  description = "관리자 권한이 필요한 페이지입니다. 관리자에게 문의해주세요.",
  showBackButton = true,
  className
}: AccessDeniedProps) {
  const router = useRouter();

  return (
    <div className={className}>
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex flex-col items-center text-center space-y-4 pt-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          
          {showBackButton && (
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              이전 페이지로
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

AccessDenied.displayName = 'AccessDenied';