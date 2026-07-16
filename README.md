# 버스 구간 혼잡도 안내 FE

정류장 QR에서 출발해 목적지까지 바로 가는 버스를 찾고, 이동 구간의 입석 부담을 비교하는 React 프로토타입입니다.

현재 버스 한 대의 혼잡도만 보여주는 대신 출발 정류장부터 도착 정류장까지 구간별 탑승 인원을 예측합니다. 과거 데이터가 부족하면 혼잡도를 임의로 만들지 않고 확인 가능한 도착 정보만 제공합니다.

- 배포 화면: https://kd-dinjae-2026-fe.vercel.app
- API 규격: [`docs/API_CONTRACT_DRAFT.md`](docs/API_CONTRACT_DRAFT.md)
- Figma 자료: [`design/figma-import`](design/figma-import)

## 이용 흐름

1. 정류장 QR의 `stopId`로 현재 출발 정류장을 확인합니다.
2. 가려는 장소 또는 도착 정류장을 검색합니다.
3. 장소를 고르면 현재 정류장에서 환승 없이 갈 수 있는 주변 정류장만 보여줍니다.
4. 정류장을 직접 고르면 주변 정류장 선택 단계는 건너뜁니다.
5. 정류장 모습, 방향, 랜드마크를 확인한 뒤 여정 분석을 시작합니다.
6. 버스 도착시간과 앉기 편한 예상 시간을 비교합니다.
7. 상세 화면에서 각 정류장 구간의 `여유`, `보통`, `혼잡` 단계를 확인합니다.

정류장 모습이 없는 경우에는 지도와 방향·랜드마크 정보가 먼저 열립니다. 현재 포함된 사진은 화면 검증용 예시이며 실제 서비스에서는 지도 제공사 또는 백엔드에서 전달한 이미지로 교체합니다.

환승 경로, 다른 출발 정류장까지 걷는 우회 경로, 좌석 예약은 현재 범위에 포함하지 않습니다.

## 표시 시간 기준

| 화면 항목 | 계산 기준 |
| --- | --- |
| 버스 도착 | `arrivalMinutes` |
| 버스 이동 | `travelMinutes` |
| 전체 소요 | `arrivalMinutes + travelMinutes` |
| 앉기 편한 시간 | `RELAXED` 구간의 `durationMinutes` 합계 |
| 입석 부담 시간 | `RELAXED`가 아닌 구간의 `durationMinutes` 합계 |

`앉기 편한 시간`은 여유가 예상되는 구간의 합입니다. 빈 좌석이나 착석을 보장하는 값은 아닙니다.

## 기술 구성

- React 19
- Vite 8
- Lucide React
- Mock JSON
- Spring API 연동 예정
- Vercel 배포

## 실행 방법

Node.js 20 이상을 기준으로 합니다.

```bash
npm install
cp .env.example .env
npm run dev
```

기본 개발 주소는 `http://localhost:5173`입니다.

```bash
npm run build
npm run validate:mocks
```

`validate:mocks`는 정류장 노선 수, 사진 조건, 구간 연결, 이동시간 합계를 검사합니다.

## Mock과 서버 전환

화면은 JSON 파일을 직접 가져오지 않고 `src/api/busApi.js`만 호출합니다.

```text
React 화면
   ↓
busApi
   ├─ mock 모드   → src/mocks/*.json
   └─ server 모드 → Spring API
```

기본값은 Mock 모드입니다.

```env
VITE_API_MODE=mock
VITE_API_BASE_URL=http://localhost:8080
```

Spring 서버를 연결할 때는 아래처럼 바꿉니다.

```env
VITE_API_MODE=server
VITE_API_BASE_URL=http://localhost:8080
```

현재 사용하는 요청 함수는 네 개입니다.

```js
busApi.getBootstrap(stopId)
busApi.searchDestinations({ originStopId, query })
busApi.getReachableStops({ originStopId, placeId })
busApi.getJourneyPrediction({ originStopId, destinationStopId })
```

Mock과 서버 응답의 필드 구조가 같아야 환경 변수만 바꿔 연동할 수 있습니다.

### Mock 파일 역할

| 파일 | 대신하는 API | 내용 |
| --- | --- | --- |
| `src/mocks/bootstrap.json` | `GET /stops/{stopId}/context` | QR 출발 정류장과 최근 목적지 |
| `src/mocks/destination-search.json` | `GET /destinations/search` | 장소·정류장 혼합 검색 결과 |
| `src/mocks/reachable-stops/*.json` | `GET /places/{placeId}/reachable-stops` | 장소 주변의 직행 가능한 정류장 |
| `src/mocks/predictions/*.json` | `POST /journeys/predictions` | 도착 예정 버스와 구간별 예측 |

## 데모에서 확인할 수 있는 경우

| 동작 | 결과 |
| --- | --- |
| `보문역` 검색 후 `장소` 선택 | 주변 정류장 2곳을 거리순으로 표시 |
| 보문역 2번 출구 정류장 선택 | 정류장 사진, 버스 4대, 구간별 예측 표시 |
| 보문동 주민센터 정류장 선택 | 사진 없음 지도 대체, 버스 2대 표시 |
| `서울시청 앞` 정류장 직접 선택 | 주변 정류장 단계를 생략하고 확인 화면으로 이동 |
| 서울시청 버스 분석 | 혼잡도 데이터 부족, 빠른 도착순 표시 |

개발 중 특정 화면으로 바로 들어갈 수도 있습니다.

```text
/?screen=nearby
/?screen=confirm
/?screen=compare
/?screen=limited
/?screen=detail
```

## 주요 데이터 ID

| 필드 | 용도 | 예시 |
| --- | --- | --- |
| `stopId` | 정류장 식별 | `stop-bomun-exit2` |
| `placeId` | 장소 검색 결과 식별 | `place-bomun-station` |
| `routeId` | 노선 식별 | `1112` |
| `tripId` | 현재 도착 예정인 차량 식별 | `trip-1112-1403` |

같은 노선 차량이 연달아 올 수 있으므로 버스 카드와 상세 화면은 `routeId`가 아니라 `tripId`로 연결합니다.

## 프로젝트 구조

```text
public/images/stop-preview/           정류장 모습 예시 이미지
src/
├── api/
│   └── busApi.js                     Mock·Spring 요청 전환
├── mocks/
│   ├── bootstrap.json                QR 진입 응답
│   ├── destination-search.json       통합 검색 응답
│   ├── reachable-stops/              장소 주변 직행 정류장 응답
│   └── predictions/                  여정 예측 응답
├── App.jsx                            화면 흐름과 데이터 계산
├── main.jsx                           React 진입점
└── styles.css                         큰 글씨·반응형 스타일

design/figma-import/                   Figma 가져오기용 SVG와 생성기
docs/API_CONTRACT_DRAFT.md             FE·백엔드 API 협의 문서
```

## 접근성 기준

- 루트 글자 크기는 18px, 일반 본문은 약 20px, 핵심 수치는 22px 이상을 사용합니다.
- 장소와 정류장은 색상만이 아니라 유형 글자로 구분합니다.
- 혼잡 상태도 `여유`, `보통`, `혼잡` 문자를 함께 표시합니다.
- 입력과 버튼은 최소 44px 이상의 터치 영역을 확보합니다.
- 작은 화면에서도 글자를 줄이지 않고 정보 열을 아래로 재배치합니다.
- 200% 글자 확대에서도 내용이 겹치거나 잘리지 않도록 구성합니다.
- 정류장 사진에는 대체 텍스트를 제공하고, 사진이 없으면 지도와 텍스트 정보로 대체합니다.

## Figma 자료 갱신

Figma 가져오기용 SVG는 생성기에서 관리합니다.

```bash
node design/figma-import/generate.mjs
```

`design/figma-import/index.html`에서 전체 흐름을 확인할 수 있습니다. `contact-sheet.png`는 회의나 Discord 공유용 한 장 이미지입니다.

## 백엔드 연동 전에 볼 것

- Swagger의 네 API가 Mock JSON과 같은 응답 구조인지
- 장소 검색 결과와 정류장 검색 결과를 `type`으로 구분하는지
- 주변 정류장이 출발지에서 실제로 환승 없이 갈 수 있는지
- 정류장 방향, 랜드마크, 좌표와 사진 제공 여부가 있는지
- `tripId`가 도착 예정 차량마다 고유한지
- 구간 시간의 합이 `travelMinutes`와 일치하는지
- 데이터 부족을 HTTP 오류가 아닌 `INSUFFICIENT_DATA`로 구분하는지
- 로컬 주소와 Vercel 주소가 Spring CORS에 등록되어 있는지

요청과 필드 조건은 [`docs/API_CONTRACT_DRAFT.md`](docs/API_CONTRACT_DRAFT.md)에서 관리합니다.
