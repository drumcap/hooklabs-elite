// HookLabs Elite Service Worker
// 성능 최적화를 위한 캐싱 전략 구현

const CACHE_NAME = 'hooklabs-elite-v1';
const STATIC_CACHE_NAME = 'hooklabs-static-v1';
const DYNAMIC_CACHE_NAME = 'hooklabs-dynamic-v1';

// 정적 자원 캐시 목록 (중요한 파일들)
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/_next/static/css/app.css',
];

// 동적 캐시에서 제외할 경로들
const EXCLUDE_PATHS = [
  '/api/',
  '/convex/',
  '/_next/webpack-hmr',
  '/_next/static/hmr',
];

// Install 이벤트 - 정적 자원 프리캐싱
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(STATIC_ASSETS.filter(url => !EXCLUDE_PATHS.some(path => url.includes(path))));
      })
      .catch(error => {
        console.warn('[SW] Failed to precache some static assets:', error);
      })
  );
  
  // 즉시 활성화
  self.skipWaiting();
});

// Activate 이벤트 - 이전 캐시 정리
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // 모든 클라이언트에서 즉시 제어권 획득
        return self.clients.claim();
      })
  );
});

// Fetch 이벤트 - 캐싱 전략
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // HTTPS 요청만 캐시
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    return;
  }
  
  // 제외 경로는 네트워크만 사용
  if (EXCLUDE_PATHS.some(path => url.pathname.includes(path))) {
    return;
  }
  
  // GET 요청만 캐시
  if (request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    handleRequest(request)
  );
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // 정적 자원 처리 (Cache First)
    if (isStaticAsset(url)) {
      return await cacheFirst(request);
    }
    
    // API 요청 처리 (Network First)
    if (isApiRequest(url)) {
      return await networkFirst(request);
    }
    
    // HTML 페이지 처리 (Stale While Revalidate)
    if (isHTMLRequest(request)) {
      return await staleWhileRevalidate(request);
    }
    
    // 기본: Network First
    return await networkFirst(request);
    
  } catch (error) {
    console.warn('[SW] Request failed:', request.url, error);
    
    // 오프라인 폴백
    if (isHTMLRequest(request)) {
      const cachedResponse = await caches.match('/');
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    throw error;
  }
}

// Cache First 전략 (정적 자원용)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    const cache = await caches.open(STATIC_CACHE_NAME);
    await cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Network First 전략 (API 요청용)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Stale While Revalidate 전략 (HTML 페이지용)
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      const cache = caches.open(DYNAMIC_CACHE_NAME);
      cache.then(c => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(error => {
    console.warn('[SW] Network request failed:', error);
    return null;
  });
  
  return cachedResponse || await fetchPromise;
}

// 헬퍼 함수들
function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') ||
         url.pathname.startsWith('/static/') ||
         url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2|ttf|eot|ico)$/);
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/') ||
         url.pathname.startsWith('/convex/') ||
         url.hostname.includes('convex.cloud') ||
         url.hostname.includes('lemonsqueezy.com') ||
         url.hostname.includes('clerk.dev');
}

function isHTMLRequest(request) {
  const acceptHeader = request.headers.get('accept') || '';
  return acceptHeader.includes('text/html');
}

// 백그라운드 동기화 (선택적 구현)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // 오프라인 시 저장된 데이터 동기화 로직
  // 예: 드래프트 게시물, 사용자 설정 등
  console.log('[SW] Background sync completed');
}

// Push 알림 처리 (선택적 구현)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    console.log('[SW] Push notification received:', data);
    
    const options = {
      body: data.body || '새로운 알림이 있습니다',
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      vibrate: [100, 50, 100],
      data: data.url || '/',
      actions: [
        { action: 'open', title: '열기' },
        { action: 'close', title: '닫기' }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'HookLabs Elite', options)
    );
  }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data || '/';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});

console.log('[SW] Service Worker loaded successfully');