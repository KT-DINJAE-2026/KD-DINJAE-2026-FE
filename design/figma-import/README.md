# Figma 화면 자료

정류장 QR로 들어온 뒤 도착 정류장을 검색하고, 로드뷰로 위치를 확인한 다음 버스별 도착시간과 입석 부담을 비교하는 흐름입니다. 정상 화면만 이어 놓지 않고 검색 결과 없음, 로드뷰 실패, 데이터 부족, 직통 버스 없음, API 오류까지 함께 준비했습니다.

각 화면은 `390 × 844` SVG라서 Figma에 바로 가져올 수 있습니다. 전체 연결 관계는 `00-user-flow.svg`에서 먼저 확인할 수 있습니다.

## 파일 목록

| 파일 | 화면 상태 |
| --- | --- |
| `00-user-flow.svg` | 전체 사용자 흐름과 예외 분기 |
| `00-app-loading.svg` | QR에 등록된 출발 정류장을 불러오는 중 |
| `00-app-error.svg` | 출발 정류장 또는 여정 API 요청 실패 |
| `01-destination-stop.svg` | 도착 정류장 입력 전 기본 화면 |
| `01-A-destination-result.svg` | 도착 정류장 검색 결과 |
| `01-B-destination-empty.svg` | 검색 결과 없음 |
| `02-A-stop-loading.svg` | 사진을 노출하지 않는 로드뷰 로딩 상태 |
| `02-stop-confirm.svg` | 카카오맵 로드뷰, ARS 번호, 방향 확인 |
| `02-B-stop-fallback.svg` | 로드뷰 실패 후 정류장 예시 사진 표시 |
| `03-analyzing.svg` | 직통 버스와 구간별 탑승 인원 분석 중 |
| `04-compare.svg` | 혼잡도 예측이 가능한 버스 비교 |
| `04-compare-unavailable.svg` | 혼잡도 데이터가 부족한 버스 비교 |
| `04-C-no-direct-route.svg` | 두 정류장을 잇는 직통 버스 없음 |
| `05-detail.svg` | 입석 부담이 적은 버스 상세 |
| `05-detail-fast.svg` | 빠르지만 혼잡한 버스 상세 |
| `05-detail-unavailable.svg` | 혼잡도 없이 도착 정보만 있는 상세 |

`index.html`은 모든 화면을 브라우저에서 한 번에 확인하는 파일이고, `contact-sheet.png`는 회의나 Discord 공유용 이미지입니다.

## Figma 파일 구성

Figma에는 아래처럼 페이지를 나누면 찾기 쉽습니다.

| Figma 페이지 | 넣을 내용 |
| --- | --- |
| `00 Flow` | `00-user-flow.svg` |
| `01 Screens` | 15개 모바일 화면 SVG |
| `02 Components` | 버튼, 검색창, 정류장 행, 버스 카드, 상태 배지 |

SVG를 `01 Screens`에 가져온 뒤 각 항목을 같은 이름의 `390 × 844` 프레임으로 감쌉니다. 프레임 이름은 파일명에서 `.svg`만 뺀 값으로 맞춥니다.

## Prototype 연결

### 기본 흐름

```text
00-app-loading
  After Delay → 01-destination-stop

01-destination-stop
  검색 실행 → 01-A-destination-result
  최근 정류장 선택 → 02-A-stop-loading

01-A-destination-result
  결과 행 또는 확인 버튼 → 02-A-stop-loading

02-A-stop-loading
  After Delay → 02-stop-confirm

02-stop-confirm
  이 정류장이 맞아요 → 03-analyzing
  뒤로 / 다시 찾기 → 01-destination-stop

03-analyzing
  After Delay → 04-compare

04-compare
  1014번 카드 → 05-detail
  152번 카드 → 05-detail-fast

05-detail / 05-detail-fast
  버스 비교로 돌아가기 → 04-compare
```

### 검색·로드뷰 예외

```text
01-destination-stop
  검색 결과 0개 → 01-B-destination-empty

01-B-destination-empty
  검색어 다시 입력하기 → 01-destination-stop

02-A-stop-loading
  로드뷰 호출 실패 → 02-B-stop-fallback

02-B-stop-fallback
  이 정류장이 맞아요 → 03-analyzing
  뒤로 / 다시 찾기 → 01-destination-stop
```

### 분석 결과 분기

```text
03-analyzing
  SUCCESS → 04-compare
  INSUFFICIENT_DATA → 04-compare-unavailable
  NO_DIRECT_ROUTE → 04-C-no-direct-route
  HTTP 오류 → 00-app-error

04-compare-unavailable
  버스 카드 → 05-detail-unavailable

05-detail-unavailable
  다른 도착 버스 보기 → 04-compare-unavailable

04-C-no-direct-route
  다른 정류장 찾기 → 01-destination-stop

00-app-error
  다시 시도하기 → 실패한 요청의 직전 화면
```

Figma Prototype은 실제 API 조건을 판단하지 못하므로 정상, 데이터 부족, 직통 버스 없음 흐름은 각각 별도 Flow starting point로 연결하는 편이 낫습니다. 기본 시연 흐름은 `SUCCESS`로 두고 나머지는 발표할 때 별도 시작점으로 보여줍니다.

## 전환 설정

| 화면 | Trigger | 권장 시간 |
| --- | --- | --- |
| `00-app-loading` | After Delay | 600ms |
| `02-A-stop-loading` | After Delay | 800ms |
| `03-analyzing` | After Delay | 800ms |
| 버튼·정류장 행·버스 카드 | On Click | Instant |

고령 사용자가 내용을 읽는 동안 화면이 흐려지지 않도록 Smart Animate나 불투명도 전환은 사용하지 않습니다.

## 화면 표현 기준

- 목적지는 장소가 아니라 도착할 버스 정류장으로 입력합니다.
- 검색 결과에는 정류장명, ARS 번호, 가는 방향을 함께 표시합니다.
- 로드뷰 로딩 중에는 사진과 출처 라벨을 보여주지 않습니다.
- 로드뷰가 준비되면 `카카오맵 로드뷰`, 실패하면 `정류장 모습 예시`라고 구분합니다.
- 비교 기준을 바꾸는 토글은 두지 않고 각 버스 카드에 `입석 부담 적음`, `빠른 도착` 표시를 붙입니다.
- `앉기 편한 시간`은 `여유`로 예측된 구간의 합이며 실제 좌석을 보장하지 않습니다.
- 혼잡도 데이터가 부족하면 혼잡 정보를 만들지 않고 도착시간과 이동시간만 보여줍니다.
- `재차인원` 대신 `탑승 인원`처럼 바로 이해할 수 있는 표현을 사용합니다.
- 주황색 `#B8560A`는 주요 동작, 초록과 빨강은 입석 부담 상태에만 사용합니다.
- 일반 본문은 18px 이상, 핵심 수치와 제목은 22px 이상을 기준으로 합니다.
- 장소 검색, 주변 정류장 추천, 음성 검색, 지도 선택, 환승·도보 우회 경로는 현재 흐름에 넣지 않습니다.

## 다시 생성하기

저장소 루트에서 아래 명령을 실행합니다.

```bash
node design/figma-import/generate.mjs
```

SVG와 `index.html`은 생성 결과물입니다. 화면 수정은 SVG 파일이 아니라 `generate.mjs`에서 해야 다음 생성 때 사라지지 않습니다.
