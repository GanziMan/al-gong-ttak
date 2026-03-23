# Guest Mode + Landing Page Redesign

## Overview

비로그인 사용자가 로그인 없이 서비스의 핵심 가치(AI 공시 분석)를 체험할 수 있도록 하고, 개인화 기능(관심종목, 북마크, 알림) 사용 시에만 로그인을 유도한다.

## 게스트 vs 로그인 사용자

| | 게스트 (비로그인) | 로그인 사용자 |
|---|---|---|
| 공시 데이터 | DART 전체 최신 공시 | 내 관심종목 공시 |
| 기업 재무 | 열람 가능 | 열람 가능 |
| 관심종목 | 없음 | 유저별 저장/관리 |
| 북마크 | 없음 | 유저별 저장 |
| 알림 | 없음 | 텔레그램 알림 |
| 설정 | 없음 | 유저별 필터/키워드 |

## 접근 방식

기존 인증 흐름은 건드리지 않고, public 전용 API 엔드포인트를 추가한다.

---

## 백엔드 변경

### 1. `GET /api/disclosures/public` (신규)

인증 불필요. DART 전체 최신 공시 + AI 분석 결과 반환.

- 파라미터: `days` (기본 7), `category`, `min_score` (기존 필터와 동일)

**처리 흐름:**
1. `days` 파라미터로 `bgn_de` 계산 (`get_all_disclosures`의 기본값은 1일이므로 반드시 명시적으로 전달)
2. `DartClient.get_all_disclosures(bgn_de=..., end_de=...)` 호출
3. 캐시: `dart_cache.py`의 기존 함수 재사용 (키는 문자열이면 무관). 캐시 키 `public_{start}_{end}`, 5분 TTL
4. 캐시된 분석 결과 병렬 조회 (`get_cached_analysis` per rcept_no)
5. 미분석 공시 → `_analyze_batch_public()` 백그라운드 태스크 실행
6. 카테고리/점수 필터 적용 후 반환

**`_analyze_batch_public` (신규 함수):**
- 기존 `_analyze_batch`와 동일하되 `user_id` 없음
- 텔레그램 알림 로직 전체 생략 (유저 설정 로딩 불필요)
- `_enrich_one` 재사용 (이 함수는 user 의존성 없음)
- `Semaphore(5)` 동시 처리 제한 동일

응답 형태:
```json
{
  "disclosures": [...],
  "total": 150,
  "pending_analysis": 10
}
```

**페이지네이션:** 최신 100건으로 제한 (`get_all_disclosures`의 `page_count=100`). 게스트 초기 버전에서는 충분하며, 추후 필요 시 `page` 파라미터 추가.

### 2. `GET /api/dashboard/public` (신규)

인증 불필요. 전체 시장 기준 대시보드 요약.

- `DartClient.get_all_disclosures()` 호출 후 분석 캐시 병렬 조회
- 호재/악재/중요공시 집계
- `watchlist_count`는 0 반환

응답 형태:
```json
{
  "watchlist_count": 0,
  "today_disclosures": 150,
  "bullish": 25,
  "bearish": 12,
  "important_disclosures": [...],
  "recent_disclosures": [...]
}
```

### 3. 기업 재무 API 인증 제거

`routers/financial_api.py`의 4개 엔드포인트에서 `Depends(get_current_user)` 및 `user: User` 파라미터 제거:
- `GET /api/company/{corp_code}/summary`
- `GET /api/company/{corp_code}/financials`
- `GET /api/company/{corp_code}/dividends`
- `GET /api/company/{corp_code}/shareholders`

이유: 유저별 데이터가 아니며, 현재도 `user` 파라미터를 실제 로직에서 사용하지 않음.

---

## 프론트엔드 변경

### 1. `lib/api.ts` - Public API 함수 추가

```typescript
getPublicDisclosures(params): Promise<DisclosureResponse>
getPublicDashboard(): Promise<DashboardSummary>
```

기존 `request()` 함수 재사용. 이 함수는 토큰이 없으면 Authorization 헤더를 생략하므로 게스트에서도 정상 동작. public 엔드포인트는 401을 반환하지 않으므로 로그인 리다이렉트가 발생하지 않음.

기존 `fetchWithRevalidate` 캐싱 적용.

### 2. `components/landing.tsx` - 홈 페이지 리디자인

**구조:**
```
히어로 (간결화)
  - "공시, 알아서 잘 딱 분석해드립니다"
  - 부제 + [카카오 로그인]
  - Mock 대시보드, 플로팅 카드, 가짜 차트 제거

실시간 요약 카드
  - public dashboard API에서 실제 데이터
  - [오늘 공시 N건] [호재 N] [악재 N]

최신 공시 목록
  - public disclosures API에서 실제 데이터
  - AI 분석 결과 포함 (카테고리, 점수, 요약)
  - 기업명 클릭 → /company/{corp_code}
  - "관심종목 추가" → 인라인 로그인 안내
  - "북마크" → 인라인 로그인 안내

기능 소개 (3개로 축소)
  - AI 공시 분석
  - 관심종목 + 알림
  - 공시 추이 분석

CTA
  - "로그인하면 관심종목 저장, 알림 등 더 많은 기능"
```

**제거:**
- Mock 데이터 (가짜 숫자, 가짜 차트)
- "시작하는 법" 3단계 섹션
- 플로팅 카드 애니메이션

### 3. `components/nav.tsx` - 네비게이션 분기

**비로그인:**
- 데스크톱: 홈 / 공시 / 로그인
- 모바일 하단탭: 홈 / 공시 / 로그인

**로그인 후 (기존 유지):**
- 데스크톱: 대시보드 / 관심종목 / 공시 / 설정
- 모바일 하단탭: 홈 / 공시 / 관심 / 설정

### 4. `app/page.tsx` - 홈 페이지 분기

```
비로그인 → 리디자인된 <Landing /> (실제 데이터 포함)
로그인 → 기존 <Dashboard /> (변경 없음)
```

### 5. `app/disclosures/page.tsx` - 공시 페이지 분기

```
비로그인 → getPublicDisclosures() 호출 → 전체 공시
로그인 → 기존 api.getDisclosures() → 관심종목 공시
```

기존 필터(카테고리, 중요도, 기간)는 양쪽 모두 동일하게 사용.

**게스트 가드 필수:** 현재 `api.getBookmarks()`가 마운트 시 무조건 호출됨. 비로그인 시 이 호출을 건너뛰어야 함 (`isLoggedIn` 체크). 북마크 토글 콜백도 게스트일 경우 인라인 로그인 안내로 대체.

### 6. `app/company/[corp_code]/page.tsx` - 에러 폴백 수정

현재 에러 시 "관심종목으로 돌아가기" (`/watchlist`) 링크가 있음. 게스트는 관심종목 페이지에 접근할 수 없으므로:
- 비로그인: "홈으로 돌아가기" (`/`) 링크
- 로그인: 기존 "관심종목으로 돌아가기" 유지

### 7. 인라인 로그인 안내

로그인이 필요한 버튼(관심종목 추가, 북마크) 클릭 시:
- 모달/페이지 이동 없이 해당 위치에 인라인 텍스트 표시
- "로그인하면 관심종목을 저장할 수 있어요" + 카카오 로그인 링크

### 8. 라우트 보호

게스트가 URL 직접 입력으로 `/watchlist`, `/settings`에 접근 시:
- `/login`으로 리다이렉트 (기존 동작: API 401 → `request()`에서 `/login` 리다이렉트)
- 기존 동작이 이미 이를 처리하므로 추가 작업 불필요

---

## 건드리지 않는 것

- 인증 시스템 전체 (JWT, AuthProvider, dependencies.py)
- 관심종목 API (`/api/watchlist`) - 인증 유지
- 북마크 API (`/api/bookmarks`) - 인증 유지
- 설정 API (`/api/settings`) - 인증 유지
- 로그인 사용자의 기존 경험 전부
- 캐시 워밍업 로직 (기존 유지)

---

## 변경 파일 목록

### 백엔드 (3파일)
| 파일 | 변경 |
|------|------|
| `backend/app/routers/disclosure_api.py` | `GET /public` 엔드포인트 + `_analyze_batch_public` 함수 추가 |
| `backend/app/routers/dashboard_api.py` | `GET /public` 엔드포인트 추가 |
| `backend/app/routers/financial_api.py` | 4개 엔드포인트 인증 제거 |

### 프론트엔드 (6파일)
| 파일 | 변경 |
|------|------|
| `frontend/src/lib/api.ts` | public API 함수 추가 |
| `frontend/src/components/landing.tsx` | 히어로 간결화 + 실제 데이터 통합 |
| `frontend/src/components/nav.tsx` | 비로그인 시 탭 축소 |
| `frontend/src/app/page.tsx` | 비로그인 시 리디자인된 Landing |
| `frontend/src/app/disclosures/page.tsx` | 비로그인 시 public API 호출 + 북마크 가드 |
| `frontend/src/app/company/[corp_code]/page.tsx` | 에러 폴백 링크 게스트 대응 |
