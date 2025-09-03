/**
 * 이미지 최적화 유틸리티
 * - WebP, AVIF 형식 변환
 * - 반응형 이미지 생성
 * - 지연 로딩 최적화
 */

export interface ImageConfig {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

/**
 * 이미지 품질별 설정
 */
export const IMAGE_QUALITIES = {
  thumbnail: 50,
  low: 60,
  medium: 75,
  high: 85,
  max: 95,
} as const;

/**
 * 디바이스별 이미지 크기
 */
export const DEVICE_SIZES = {
  mobile: 640,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  large: 1920,
} as const;

/**
 * 반응형 이미지 사이즈 생성
 */
export function generateResponsiveSizes(
  breakpoints: Record<string, number>
): string {
  return Object.entries(breakpoints)
    .map(([device, size]) => `(max-width: ${size}px) ${size}px`)
    .join(', ');
}

/**
 * 이미지 로더 최적화
 */
export function optimizedImageLoader({
  src,
  width,
  quality = IMAGE_QUALITIES.medium,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  const url = new URL(src, process.env.NEXT_PUBLIC_APP_URL);
  url.searchParams.set('w', width.toString());
  url.searchParams.set('q', quality.toString());
  return url.href;
}

/**
 * 블러 플레이스홀더 생성
 */
export function generateBlurDataURL(
  width: number = 16,
  height: number = 16,
  color: string = '#f3f4f6'
): string {
  const svg = `
    <svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="g">
          <stop stop-color="${color}" offset="20%" />
          <stop stop-color="${adjustBrightness(color, 0.1)}" offset="50%" />
          <stop stop-color="${color}" offset="70%" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#g)" />
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * 색상 밝기 조정
 */
function adjustBrightness(hex: string, factor: number): string {
  const color = hex.replace('#', '');
  const num = parseInt(color, 16);
  const amt = Math.round(2.55 * factor * 100);
  
  let R = (num >> 16) + amt;
  let G = (num >> 8 & 0x00FF) + amt;
  let B = (num & 0x0000FF) + amt;
  
  R = R < 255 ? (R < 1 ? 0 : R) : 255;
  G = G < 255 ? (G < 1 ? 0 : G) : 255;
  B = B < 255 ? (B < 1 ? 0 : B) : 255;
  
  return `#${(R << 16 | G << 8 | B).toString(16).padStart(6, '0')}`;
}

/**
 * 이미지 형식별 최적화 설정
 */
export const IMAGE_FORMATS = {
  avatar: {
    sizes: [32, 48, 64, 96, 128],
    quality: IMAGE_QUALITIES.high,
    formats: ['image/avif', 'image/webp'],
  },
  thumbnail: {
    sizes: [150, 300, 450],
    quality: IMAGE_QUALITIES.medium,
    formats: ['image/avif', 'image/webp'],
  },
  hero: {
    sizes: [640, 828, 1200, 1920],
    quality: IMAGE_QUALITIES.high,
    formats: ['image/avif', 'image/webp'],
  },
  icon: {
    sizes: [16, 24, 32, 48, 64],
    quality: IMAGE_QUALITIES.max,
    formats: ['image/png'], // 아이콘은 PNG 유지
  },
  chart: {
    sizes: [400, 600, 800, 1200],
    quality: IMAGE_QUALITIES.high,
    formats: ['image/png'], // 차트는 선명도가 중요
  },
} as const;

/**
 * 지연 로딩 최적화 설정
 */
export const LAZY_LOADING_CONFIG = {
  rootMargin: '50px',
  threshold: 0.1,
  // 중요한 이미지는 우선 로딩
  priority: {
    hero: true,
    logo: true,
    avatar: false,
    thumbnail: false,
    chart: false,
  },
};

/**
 * CDN 최적화 설정
 */
export function getCDNOptimizedURL(
  src: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'avif' | 'png' | 'jpg';
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  } = {}
): string {
  const {
    width,
    height,
    quality = IMAGE_QUALITIES.medium,
    format = 'auto',
    fit = 'cover',
  } = options;

  // 이미 최적화된 URL인지 확인
  if (src.includes('/_next/image') || src.startsWith('data:')) {
    return src;
  }

  const url = new URL(src, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  
  if (width) url.searchParams.set('w', width.toString());
  if (height) url.searchParams.set('h', height.toString());
  url.searchParams.set('q', quality.toString());
  url.searchParams.set('fm', format);
  url.searchParams.set('fit', fit);

  return url.href;
}

/**
 * 이미지 사전 로딩
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 여러 이미지 사전 로딩
 */
export async function preloadImages(
  sources: string[],
  options: { concurrent?: number; timeout?: number } = {}
): Promise<void> {
  const { concurrent = 3, timeout = 10000 } = options;
  
  for (let i = 0; i < sources.length; i += concurrent) {
    const batch = sources.slice(i, i + concurrent);
    const promises = batch.map(src => 
      Promise.race([
        preloadImage(src),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ])
    );
    
    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.warn('이미지 사전 로딩 중 일부 실패:', error);
    }
  }
}

/**
 * 이미지 메타데이터 추출
 */
export async function getImageMetadata(
  src: string
): Promise<{
  width: number;
  height: number;
  aspectRatio: number;
  size?: number;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      });
    };
    
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 반응형 이미지 소스셋 생성
 */
export function generateSrcSet(
  src: string,
  sizes: number[],
  quality?: number
): string {
  return sizes
    .map(size => {
      const optimizedSrc = getCDNOptimizedURL(src, { width: size, quality });
      return `${optimizedSrc} ${size}w`;
    })
    .join(', ');
}

/**
 * 이미지 압축 추천 설정
 */
export function getCompressionSettings(
  type: 'photo' | 'illustration' | 'icon' | 'screenshot'
) {
  const settings = {
    photo: {
      format: 'webp' as const,
      quality: IMAGE_QUALITIES.high,
      progressive: true,
    },
    illustration: {
      format: 'webp' as const,
      quality: IMAGE_QUALITIES.medium,
      progressive: false,
    },
    icon: {
      format: 'png' as const,
      quality: IMAGE_QUALITIES.max,
      progressive: false,
    },
    screenshot: {
      format: 'webp' as const,
      quality: IMAGE_QUALITIES.high,
      progressive: true,
    },
  };

  return settings[type];
}