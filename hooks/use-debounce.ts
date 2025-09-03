"use client";

import { useState, useEffect } from "react";

/**
 * 값을 디바운스하는 커스텀 훅
 * API 호출 최적화를 위해 사용합니다.
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};