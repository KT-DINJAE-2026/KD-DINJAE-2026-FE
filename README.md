# 버스 구간 혼잡도 안내 FE

정류장 QR을 찍은 뒤 도착 정류장을 입력하면, 두 정류장 사이를 운행하는 버스의 도착시간과 앉기 편한 시간을 비교하는 React 프로토타입입니다.

한 시점의 차량 혼잡도만 보여주는 대신 사용자가 실제로 이동할 구간의 탑승 인원을 예측합니다. 과거 데이터가 부족하면 혼잡도를 임의로 표시하지 않고 확인 가능한 도착 정보만으로 빠른 버스를 안내합니다.

배포 화면: https://kd-dinjae-2026-fe.vercel.app

## 이용 흐름

1. 정류장 QR의 `stopId`로 현재 정류장과 운행 방향을 확인합니다.
2. 가고 싶은 도착 정류장을 이름으로 검색합니다.
3. 현재 정류장에서 도착 정류장까지 운행하는 버스를 조회합니다.
4. 버스별 도착시간, 총 이동시간, 앉기 편한 예상 시간을 비교합니다.
5. 상세 화면에서 정류장 구간별 `여유·보통·혼잡` 예측을 확인합니다.
6. 상세 확인 후에는 비교 화면으로 돌아가 다른 버스를 직접 확인할 수 있습니다.

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

- `보문역 2번 출구 정류장`: 혼잡도 예측이 있는 도착 버스 4대 비교
- `서울시청 앞 정류장`: 과거 데이터가 부족한 도착 버스 4대를 빠른 순서로 비교

개발 중에는 쿼리로 결과 화면을 바로 열 수 있습니다.

```text
/?stopId=stop-seongbuk-office
/?screen=compare
/?screen=limited
/?screen=detail
```

## 폴더 구성

```text
src/
├── api/busApi.js                 Mock과 Spring API 요청 전환
├── mocks/
│   ├── bootstrap.json            현재 정류장과 도착 정류장 예시
│   └── predictions/
│       ├── bomun.json             혼잡도 예측 성공 응답
│       └── cityhall.json          혼잡도 데이터 부족 응답
├── App.jsx                        화면과 사용자 흐름
└── styles.css                     주황색 테마와 반응형 스타일
design/figma-import/               Figma용 흐름도와 화면 SVG
docs/API_CONTRACT_DRAFT.md         백엔드 협의용 요청·응답 초안
```

Figma 화면은 [`design/figma-import`](design/figma-import)에서 확인할 수 있습니다. 전체 화면은 [`contact-sheet.png`](design/figma-import/contact-sheet.png)에 모아두었습니다.

## Mock JSON 구조

화면은 JSON 파일을 직접 읽지 않고 `src/api/busApi.js`만 호출합니다.

```text
React 화면 → busApi → Mock JSON
                    → Spring API
```

기본값은 `VITE_API_MODE=mock`입니다. Swagger가 정해지면 Mock과 서버 응답의 필드명을 맞춘 뒤 `server` 모드로 바꿉니다.

### `bootstrap.json`

QR로 처음 들어왔을 때 필요한 값입니다.

- `currentStop`: 현재 정류장 ID, 이름, 운행 방향
- `destinationStops`: 검색 가능한 도착 정류장 예시
- `directionDescription`, `landmark`: 동명 정류장을 구분하는 설명
- `servedRouteIds`: 현재 정류장과 도착 정류장을 모두 지나는 노선 ID

### `predictions/*.json`

도착 정류장을 선택한 뒤 조회하는 여정 분석 결과입니다.

- `status`: `SUCCESS` 또는 `INSUFFICIENT_DATA`
- `originStopId`, `destinationStopId`: 예측한 이동 구간
- `routes`: 두 정류장 사이를 운행하는 도착 예정 버스
- `standingBurdenMinutes`: 입석 부담이 예상되는 시간
- `segments`: 출발부터 도착까지의 구간별 혼잡 단계
- `predictionBasis`: 예측에 사용한 시간대와 기준

### 자주 쓰는 ID

| 필드 | 의미 | 예시 |
| --- | --- | --- |
| `stopId` | 출발·도착 정류장 고유 ID | `stop-bomun-exit2` |
| `routeId` | 노선 자체의 ID | `1112` |
| `tripId` | 지금 도착할 특정 운행 버스 ID | `trip-1112-1358` |

같은 노선 번호라도 여러 차량이 연달아 올 수 있으므로 비교 결과와 상세 화면은 `tripId`로 연결합니다.

### 혼잡도 값

| API 값 | 화면 표시 |
| --- | --- |
| `RELAXED` | 여유 |
| `NORMAL` | 보통 |
| `CROWDED` | 혼잡 |
| `VERY_CROWDED` | 매우 혼잡 |

`standingBurdenMinutes`는 `NORMAL` 이상으로 예상된 구간의 시간을 합친 서버용 비교 값입니다. 화면의 `앉기 편한 시간`은 반대로 `RELAXED` 구간의 `durationMinutes`를 합산해 표시합니다. `여유`는 앉을 가능성이 상대적으로 높은 단계이며 좌석을 보장한다는 뜻은 아닙니다.

서버는 혼잡도 코드와 수치만 전달하고 한글 문구와 색상은 프론트에서 정합니다. CSS 색상이나 `tone` 같은 화면용 값은 API에 넣지 않습니다.

## 데이터가 부족할 때

예측 데이터 부족과 서버 오류는 다르게 처리합니다. 도착시간과 이동시간을 쓸 수 있다면 서버는 `200 OK`와 `INSUFFICIENT_DATA`를 반환합니다.

```json
{
  "status": "INSUFFICIENT_DATA",
  "reasonCode": "NOT_ENOUGH_HISTORICAL_SAMPLES",
  "originStopId": "stop-seongbuk-office",
  "destinationStopId": "stop-cityhall-front",
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

이 경우 앉기 편한 시간은 표시하지 않고 `arrivalMinutes + travelMinutes`가 짧은 순서로 보여줍니다.

## Spring API 연결

`.env`에 아래 값을 넣으면 `busApi`가 Spring 서버를 호출합니다.

```bash
VITE_API_MODE=server
VITE_API_BASE_URL=http://localhost:8080
```

현재 화면에서 사용하는 함수는 다음 두 개입니다.

- `getBootstrap(stopId)`
- `getJourneyPrediction({ originStopId, destinationStopId })`

정류장 검색은 현재 Mock 목록을 브라우저에서 필터링합니다. 검색 API가 확정되면 `searchDestinationStops`를 추가하면 됩니다. 요청 시점과 응답 예시는 [`docs/API_CONTRACT_DRAFT.md`](docs/API_CONTRACT_DRAFT.md)에 정리했습니다.
