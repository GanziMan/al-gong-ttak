const CACHE_NAME = "alzalttak-v2";
const STATIC_ASSETS = ["/", "/disclosures", "/watchlist"];

// Install: 기본 페이지 캐시
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: 오래된 캐시 삭제
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-first 전략 (API 제외)
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 확장 프로그램(chrome-extension://), about:, data: 등은 처리하지 않음
  if (!(url.protocol === "http:" || url.protocol === "https:")) return;
  // API 요청/비GET/외부 오리진은 캐시하지 않음
  if (
    url.pathname.startsWith("/api/") ||
    request.method !== "GET" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // 성공 시 캐시 업데이트
        if (response.ok) {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, clone))
            .catch(() => {
              // 캐시 실패는 네트워크 응답에 영향 주지 않음
            });
        }
        return response;
      })
      .catch(() => {
        // 오프라인 시 캐시에서 반환
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // 네비게이션 요청이면 메인 페이지 반환
          if (request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
