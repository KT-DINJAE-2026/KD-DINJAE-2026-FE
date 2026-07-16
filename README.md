# 버스 구간 혼잡도 안내 FE

정류장 QR에서 출발해 도착 정류장을 입력하면, 그 구간을 운행하는 버스의 도착시간과 입석 부담을 비교해 주는 React 프로토타입입니다.

현재 차량의 혼잡도만 보여주는 것이 아니라 출발 정류장부터 도착 정류장까지의 구간별 탑승 인원을 예측한다는 점에 초점을 두었습니다. 과거 데이터가 부족한 경우에는 혼잡도를 임의로 만들지 않고 확인 가능한 도착 정보만 제공합니다.

- 배포 화면: https://kd-dinjae-2026-fe.vercel.app
- API 규격: [`docs/API_CONTRACT_DRAFT.md`](docs/API_CONTRACT_DRAFT.md)
- Figma 시안: [`design/figma-import`](design/figma-import)

## 현재 구현 범위

1. 정류장 QR의 `stopId`로 출발 정류장을 확인합니다.
2. 사용자가 도착할 정류장을 검색합니다.
3. 두 정류장을 모두 지나는 도착 예정 버스를 불러옵니다.
4. 버스 도착시간, 전체 소요시간, 앉기 편한 예상 시간을 비교합니다.
5. 상세 화면에서 정류장 구간별 `여유`, `보통`, `혼잡` 단계를 확인합니다.
6. 혼잡도 표본이 부족하면 좌석 관련 정보 없이 빠른 도착순으로 보여줍니다.

환승 경로, 다른 정류장까지 걷는 우회 경로, 좌석 예약 기능은 현재 범위에 포함하지 않습니다.

## 화면에서 사용하는 시간

표시되는 시간은 다음 기준으로 계산합니다.

| 화면 항목 | 계산 기준 |
| --- | --- |
| 버스 도착 | `arrivalMinutes` |
| 버스 이동 | `travelMinutes` |
| 전체 소요 | `arrivalMinutes + travelMinutes` |
| 앉기 편한 시간 | `RELAXED` 구간의 `durationMinutes` 합계 |
| 입석 부담 시간 | `NORMAL` 이상 구간의 `durationMinutes` 합계 |

`앉기 편한 시간`은 여유가 예상되는 구간을 더한 값입니다. 실제 빈 좌석이나 착석을 보장하지 않습니다.

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

기본 개발 주소는 `http://localhost:5173`입니다. 배포용 빌드는 아래 명령으로 확인합니다.

```bash
npm run build
```

## Mock과 서버 모드

화면 컴포넌트는 JSON 파일을 직접 가져오지 않고 `src/api/busApi.js`만 호출합니다.

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

Spring 서버를 연결할 때는 다음과 같이 변경합니다.

```env
VITE_API_MODE=server
VITE_API_BASE_URL=http://localhost:8080
```

Mock과 서버 응답은 같은 필드 구조를 사용해야 합니다. 서버 응답을 별도로 화면 형식에 맞춰 가공하는 대신 Mock JSON을 API 계약의 예시 응답으로 유지하는 방식입니다.

### Mock 파일 역할

| 파일 | 대신하는 API | 내용 |
| --- | --- | --- |
| `src/mocks/bootstrap.json` | `GET /api/v1/stops/{stopId}/context` | 출발 정류장과 초기 도착 정류장 목록 |
| `src/mocks/predictions/bomun.json` | `POST /api/v1/journeys/predictions` | 혼잡도 예측 성공 응답 |
| `src/mocks/predictions/cityhall.json` | `POST /api/v1/journeys/predictions` | 과거 데이터 부족 응답 |

현재 `busApi`에서 실제로 호출하는 함수는 두 개입니다.

```js
busApi.getBootstrap(stopId)
busApi.getJourneyPrediction({ originStopId, destinationStopId })
```

도착 정류장 검색은 `bootstrap.json`의 목록을 브라우저에서 필터링합니다. 실제 서비스에서는 검색 범위가 커지므로 `GET /api/v1/stops/search`를 추가하는 안을 API 문서에 정리했습니다.

## 데모 데이터

검색창에는 아래 정류장을 사용할 수 있습니다.

| 검색어 | 확인되는 상태 |
| --- | --- |
| `보문`, `보문역` | 혼잡도 예측이 있는 버스 4대 |
| `시청`, `서울시청` | 혼잡도 데이터가 부족한 버스 4대 |

개발 중 특정 화면을 바로 확인하려면 쿼리 문자열을 사용할 수 있습니다.

```text
/?stopId=stop-seongbuk-office
/?screen=compare
/?screen=limited
/?screen=detail
```

## 주요 데이터 ID

| 필드 | 용도 | 예시 |
| --- | --- | --- |
| `stopId` | 정류장 식별 | `stop-bomun-exit2` |
| `routeId` | 노선 식별 | `1112` |
| `tripId` | 현재 도착 예정인 특정 운행 버스 식별 | `trip-1112-1403` |

같은 노선의 차량이 연달아 올 수 있으므로 비교 카드와 상세 화면은 `routeId`가 아니라 `tripId`로 연결합니다.

## 프로젝트 구조

```text
src/
├── api/
│   └── busApi.js                 Mock·Spring 요청 전환
├── mocks/
│   ├── bootstrap.json            QR 진입 응답
│   └── predictions/
│       ├── bomun.json             예측 성공 응답
│       └── cityhall.json          데이터 부족 응답
├── App.jsx                        화면 흐름과 데이터 계산
├── main.jsx                       React 진입점
└── styles.css                     큰 글씨·반응형 스타일

design/figma-import/               Figma 가져오기용 SVG와 생성기
docs/API_CONTRACT_DRAFT.md         FE·백엔드 API 협의 문서
```

## 접근성 기준

- 루트 글자 크기는 18px, 일반 본문은 약 20px, 핵심 수치는 22px 이상을 사용합니다.
- 작은 화면에서도 글자를 줄이지 않고 정보 열을 아래로 재배치합니다.
- 일반 글자의 명암비는 4.5:1 이상으로 유지합니다.
- 혼잡 상태는 색상만으로 구분하지 않고 `여유`, `보통`, `혼잡` 문자를 함께 표시합니다.
- 입력과 버튼은 최소 44px의 터치 영역을 확보합니다.
- 브라우저 글자를 200%로 확대해도 내용이 겹치거나 잘리지 않도록 구성합니다.

## Figma 시안 갱신

Figma 가져오기용 SVG는 생성기에서 관리합니다.

```bash
node design/figma-import/generate.mjs
```

생성 후 `design/figma-import/index.html`에서 전체 화면을 확인할 수 있습니다. 화면 모음 이미지는 `contact-sheet.png`입니다.

## 백엔드 연동 전 확인할 것

- Swagger 응답 필드가 Mock JSON과 같은지
- `tripId`가 도착 예정 차량마다 고유한지
- 구간 시간의 합이 `travelMinutes`와 일치하는지
- 데이터 부족을 HTTP 오류가 아닌 `INSUFFICIENT_DATA`로 구분하는지
- 로컬 주소와 Vercel 주소가 Spring CORS에 등록되어 있는지

세부 요청과 필드 조건은 [`docs/API_CONTRACT_DRAFT.md`](docs/API_CONTRACT_DRAFT.md)에서 관리합니다.
