# 버스 구간 혼잡도 안내 FE

정류장 QR로 출발지를 확인하고, 목적지까지 가는 버스의 입석 부담과 도착시간을 비교하는 React 프로토타입입니다.

현재 버스 한 대의 혼잡도만 보여주는 방식이 아니라 사용자가 타는 정류장부터 내리는 정류장까지 구간별 탑승 인원을 예측합니다. 과거 데이터가 부족한 구간은 혼잡도를 억지로 표시하지 않고, 확인 가능한 도착 정보로 빠른 버스를 안내합니다.

배포 화면: https://kd-dinjae-2026-fe.vercel.app

## 이용 흐름

1. 정류장 QR의 `stopId`로 출발 정류장과 운행 방향을 확인합니다.
2. 목적지나 주변 장소를 검색창에 입력합니다.
3. 목적지 주변에서 이동하기 편한 하차 정류장을 거리 사진과 도보 거리로 확인합니다.
4. 현재 도착 예정 버스별 이동시간과 구간별 입석 부담을 비교합니다.
5. 버스 상세에서 `여유·보통·혼잡` 구간과 예상 도착시간을 확인합니다.
6. 입석 부담이 높은 버스에는 추가 시간과 부담 감소량을 함께 보여주고, 덜 붐비는 버스 비교로 돌아갈 수 있게 안내합니다.

## 실행 방법

```bash
npm install
npm run dev
```

개발 서버는 기본적으로 `http://localhost:5173`에서 열립니다. 배포용 빌드는 아래 명령으로 확인합니다.

```bash
npm run build
```

## 확인할 수 있는 경우

- `보문역 2번 출구`: 1112번의 낮은 입석 부담과 95번의 대안 안내를 확인하는 경우
- `서울시청`: 과거 데이터가 부족해 빠른 도착만 제공하는 경우

개발 중 특정 화면을 바로 열 수 있습니다.

```text
/?stopId=stop-seongbuk-office
/?screen=alighting
/?screen=compare
/?screen=limited
/?screen=detail
```

## 폴더 구성

```text
public/images/                    하차 정류장 거리 사진 예시
src/
├── api/busApi.js                 Mock과 Spring API 요청을 한곳에서 전환
├── mocks/
│   ├── bootstrap.json            출발 정류장과 목적지·하차 후보
│   └── predictions/
│       ├── bomun.json             혼잡도 예측 성공 응답
│       └── cityhall.json          혼잡도 데이터 부족 응답
├── App.jsx                        화면과 사용자 흐름
└── styles.css                     주황색 테마와 반응형 스타일
design/figma-import/               Figma용 흐름도와 화면 SVG
docs/API_CONTRACT_DRAFT.md         백엔드 협의용 요청·응답 초안
```

Figma 화면은 [`design/figma-import`](design/figma-import)에서 확인할 수 있습니다. 한눈에 볼 때는 [`contact-sheet.png`](design/figma-import/contact-sheet.png)가 가장 편합니다.

## Mock JSON 구조

화면 컴포넌트는 JSON 파일을 직접 읽지 않고 `src/api/busApi.js`만 호출합니다.

```text
React 화면 → busApi → Mock JSON
                    → Spring API
```

현재 `VITE_API_MODE`의 기본값은 `mock`입니다. Swagger가 정해지면 Mock JSON과 서버 응답의 필드명을 먼저 맞추고 `server` 모드로 바꿉니다.

### `bootstrap.json`

QR로 처음 들어왔을 때 필요한 데이터를 한 번에 담습니다.

- `currentStop`: 현재 정류장 ID, 이름, 운행 방향
- `destinations`: 검색용 목적지와 목적지 주변 하차 정류장 후보
- `alightingCandidates`: 정류장 이름, 랜드마크, 도보 시간, 사진, 운행 노선

### `predictions/*.json`

사용자가 하차 정류장을 정한 뒤 조회하는 여정 분석 결과입니다.

- `status`: `SUCCESS` 또는 `INSUFFICIENT_DATA`
- `routes`: 비교할 도착 예정 버스
- `standingBurdenMinutes`: 입석 부담이 예상되는 시간
- `segments`: 출발지부터 하차 지점까지의 구간별 혼잡 단계
- `predictionBasis`: 예측에 사용한 시간대와 기준 설명

### 자주 쓰는 ID

| 필드 | 의미 | 예시 |
| --- | --- | --- |
| `stopId` | 정류장 고유 ID | `stop-seongbuk-office` |
| `destinationId` | 장소 검색 결과 ID | `bomun` |
| `candidateId` | 목적지 주변 하차 후보 ID | `bomun-exit2` |
| `routeId` | 노선 자체의 ID | `1112` |
| `tripId` | 지금 도착할 특정 운행 버스 ID | `trip-1112-1358` |

같은 노선 번호라도 도착 시각과 차량 종류가 다른 운행이 올 수 있으므로 비교 결과와 상세 화면을 연결할 때는 `routeId`가 아니라 `tripId`를 사용합니다.

### 혼잡도 값

| API 값 | 화면 표시 |
| --- | --- |
| `RELAXED` | 여유 |
| `NORMAL` | 보통 |
| `CROWDED` | 혼잡 |
| `VERY_CROWDED` | 매우 혼잡 |

`standingBurdenMinutes`는 `NORMAL` 이상으로 예상된 구간의 시간을 합친 값입니다. `여유`는 앉을 가능성이 상대적으로 높은 단계이며 좌석을 보장한다는 뜻은 아닙니다.

서버는 혼잡도 코드와 수치만 전달하고 한글 문구와 색상은 프론트에서 정합니다. CSS 색상이나 `tone` 같은 화면용 값은 API에 넣지 않습니다.

## 데이터가 부족할 때

예측 데이터 부족과 서버 오류는 다르게 처리합니다. 도착시간과 이동시간을 쓸 수 있다면 서버는 `200 OK`와 `INSUFFICIENT_DATA`를 반환합니다.

```json
{
  "status": "INSUFFICIENT_DATA",
  "reasonCode": "NOT_ENOUGH_HISTORICAL_SAMPLES",
  "routes": [
    {
      "tripId": "trip-101-1402",
      "routeId": "101",
      "routeNumber": "101번",
      "arrivalMinutes": 4,
      "travelMinutes": 18
    }
  ]
}
```

이 경우 `덜 붐비는 버스`는 비활성화하고 `arrivalMinutes + travelMinutes`가 짧은 순서로 보여줍니다.

## Spring API 연결

`.env`에 아래 값을 넣으면 `busApi`가 Spring 서버를 호출합니다.

```bash
VITE_API_MODE=server
VITE_API_BASE_URL=http://localhost:8080
```

현재 화면에서 사용하는 함수는 다음과 같습니다.

- `getBootstrap(stopId)`
- `getJourneyPrediction({ originStopId, destinationId, destinationStopId })`

목적지 검색은 현재 Mock 후보를 브라우저에서 필터링합니다. 검색 API가 확정되면 `busApi.searchDestinations`를 추가할 예정입니다. 요청 시점과 전체 응답 예시는 [`docs/API_CONTRACT_DRAFT.md`](docs/API_CONTRACT_DRAFT.md)에 정리했습니다.
