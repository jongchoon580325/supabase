# PWA(Progressive Web App) 구현 절차

> 이 문서는 Next.js 등 현대적 프론트엔드 프로젝트에서 PWA를 정상적으로 구현하기 위한 실전 가이드입니다. 실제 적용 예시와 체크리스트를 포함합니다.

---

## 1. manifest.json 작성
- 위치: `/public/manifest.json`
- 주요 항목:
  - `name`, `short_name`, `description`: 앱 이름, 설명
  - `start_url`: 앱 시작 경로(`/`)
  - `display`: `standalone`(앱처럼 동작)
  - `background_color`, `theme_color`: 배경/테마 색상
  - `icons`: 다양한 크기의 앱 아이콘(권장: 72x72, 96x96, 128x128, 192x192, 256x256, 384x384, 512x512)
    - 192x192, 512x512는 필수(PWA 설치용)
    - 72/96/128/256/384 등은 다양한 디바이스/OS에서 권장
    - `purpose: any maskable` 옵션 아이콘도 포함 권장
  - SNS/오픈그래프 이미지: SNS 공유/설치 안내용 썸네일(권장: 1200x630, 600x600 등)
    - 1200x630: Facebook, Kakao 등 대표 OG 이미지
    - 600x600: Twitter, 일부 플랫폼 권장
    - 512x512: Android 홈화면 아이콘, 일부 SNS 썸네일

**예시:**
```json
{
  "name": "Smart Dividend Portfolio",
  "short_name": "DividendPortfolio",
  "description": "미국 ETF/배당주 포트폴리오 관리 PWA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#181e29",
  "theme_color": "#facc15",
  "icons": [
    {
      "src": "/usa_etf_dividend-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/usa_etf_dividend-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/usa_etf_dividend-128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/usa_etf_dividend-256.png",
      "sizes": "256x256",
      "type": "image/png"
    }
  ],
  "og:image": "/open_graph_image_1200x630.png"
}
```

---

## 2. 서비스워커(sw.js) 구현
- 위치: `/public/sw.js`
- 주요 역할: 오프라인 캐싱, 캐시 관리, fetch 가로채기

**예시:**
```js
const CACHE_NAME = 'dividend-portfolio-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/usa_etf_dividend.ico',
  '/open_graph_image.png',
  // 기타 정적 리소스 추가
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
});
```

---

## 3. 루트 레이아웃(HTML head) 설정
- `<link rel="manifest" href="/manifest.json" />`
- `<link rel="icon" href="/아이콘경로.ico" />`
- `<meta name="theme-color" content="#facc15" />`
- **서비스워커 등록 스크립트**
  ```js
  <script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js'); }); }` }} />
  ```
- **Open Graph 등 메타태그** (SNS 공유/설치 안내)

---

## 4. 아이콘 및 오픈그래프 이미지 준비
- 다양한 크기의 아이콘(192x192, 512x512 등)
- `purpose: any maskable` 옵션 권장
- SNS 공유용 썸네일(1200x630 등)
  - 권장 사이즈: 72x72, 96x96, 128x128, 192x192, 256x256, 384x384, 512x512 (아이콘)
  - 오픈그래프/카카오/페이스북: 1200x630 (og:image)
  - 트위터/일부 플랫폼: 600x600, 512x512
  - Android 홈화면: 192x192, 512x512
  - iOS 홈화면: 180x180 (apple-touch-icon)
  - maskable 아이콘: 512x512 권장

---

## 5. 오프라인/설치 테스트
- 크롬 개발자도구 > Application > Manifest/Service Worker에서 정상 인식 확인
- 모바일/데스크탑에서 "홈 화면에 추가" 시 앱처럼 동작하는지 확인
- 오프라인 상태에서 캐시된 리소스 제공되는지 확인

---

## 6. 체크리스트
- [x] manifest.json 작성 및 등록
- [x] 서비스워커(sw.js) 구현 및 등록
- [x] 아이콘/이미지 준비 및 경로 확인
- [x] 메타태그(OG, theme-color 등) 적용
- [x] 오프라인/설치 테스트 완료

---

## 7. 실무 팁
- 서비스워커/manifest 경로는 반드시 public 루트에 위치해야 함
- Next.js 등 프레임워크의 빌드/배포 환경에 따라 경로가 달라질 수 있으니 주의
- 캐시 버전(CACHE_NAME) 변경 시, activate 이벤트에서 이전 캐시 삭제 필요
- iOS는 일부 PWA 기능(푸시, 백그라운드 등) 미지원

---

## 8. 참고 링크
- [MDN: Progressive web apps (PWA)](https://developer.mozilla.org/ko/docs/Web/Progressive_web_apps)
- [Google Developers: Your First Progressive Web App](https://web.dev/learn/pwa/)
- [Next.js 공식문서: PWA](https://nextjs.org/docs/advanced-features/progressive-web-apps)
