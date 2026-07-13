# 버스 구간 혼잡도 안내 FE

정류장 QR로 출발지를 확인하고, 목적지까지 갈 수 있는 버스의 입석 부담을 비교하는 React 프로토타입입니다.

현재 도착할 버스가 붐비는지만 보여주는 대신, 사용자가 타는 정류장부터 내리는 정류장까지의 혼잡한 구간을 함께 보여주는 것이 핵심입니다. 혼잡도 예측에 필요한 데이터가 부족할 때는 기능을 막지 않고 목적지에 빨리 도착하는 버스부터 안내합니다.

지금 들어 있는 정류장, 노선, 도착시간, 혼잡도는 화면 개발을 위한 예시 데이터입니다.

배포 화면: https://kd-dinjae-2026-fe.vercel.app

## 주요 흐름

1. 정류장 QR에 포함된 `stopId`로 출발지를 확인합니다.
2. 사용자가 목적지 또는 주변 장소를 검색합니다.
3. 목적지를 확인하면 이용 가능한 버스를 분석합니다.
4. `덜 붐비는 버스`와 `빠른 도착` 기준을 바꿔 비교합니다.
5. 버스를 누르면 구간별 입석 부담을 확인한 뒤 선택할 수 있습니다.

`빠른 도착`은 버스 대기시간과 목적지까지의 이동시간을 더한 값으로 비교합니다. `덜 붐비는 버스`는 이동 중 입석 부담이 예상되는 시간이 짧은 순서로 보여줍니다.

## 실행 방법

Node.js가 설치된 환경에서 아래 명령을 실행합니다.

```bash
npm install
npm run dev
```

개발 서버가 실행되면 `http://localhost:5173`에서 확인할 수 있습니다.

배포용 파일은 다음 명령으로 만듭니다.

```bash
npm run build
```

## 확인 가능한 화면

기본 화면에서 아래 목적지를 선택하면 두 가지 응답을 확인할 수 있습니다.

- `보문역 2번 출구`: 혼잡도 예측 결과가 있는 경우
- `서울시청`: 과거 데이터가 부족해 빠른 도착만 제공하는 경우

개발 중에는 쿼리로 특정 화면을 바로 열 수 있습니다.

```text
http://localhost:5173/?stopId=stop-seongbuk-office
http://localhost:5173/?screen=compare
http://localhost:5173/?screen=limited
http://localhost:5173/?screen=detail
```

## 폴더 구성

```text
src/
├── api/
│   └── busApi.js                 Mock과 Spring API 전환
├── mocks/
│   ├── bootstrap.json            출발 정류장과 목적지 후보
│   └── predictions/
│       ├── bomun.json             혼잡도 예측 성공
│       └── cityhall.json          혼잡도 데이터 부족
├── App.jsx                        화면과 사용자 흐름
├── main.jsx
└── styles.css
```

Figma 화면은 [`../design/figma-import`](../design/figma-import)에서 확인할 수 있습니다.

## Mock 데이터 사용 방식

화면 컴포넌트에서 JSON을 직접 불러오지 않고 `src/api/busApi.js`를 통해 요청합니다. 현재는 `mock` 모드라 로컬 JSON을 반환하고, 백엔드가 준비되면 같은 함수가 Spring API를 호출합니다.

```text
React 화면 → busApi → Mock JSON
                    → Spring API
```

이 구조를 유지하면 실제 API를 연결할 때 화면 코드를 다시 고칠 필요가 없습니다. 대신 Mock JSON의 필드명과 응답 구조는 최종 Swagger 응답과 같아야 합니다.

### 파일별 역할

| 파일 | 사용 시점 | 내용 |
| --- | --- | --- |
| `bootstrap.json` | QR로 처음 들어왔을 때 | 현재 정류장과 목적지 후보 |
| `bomun.json` | 보문역 분석 요청 | 도착시간, 이동시간, 구간별 혼잡도 |
| `cityhall.json` | 서울시청 분석 요청 | 혼잡도 없이 도착시간과 이동시간만 제공 |

### 주요 필드

| 필드 | 의미 | 예시 |
| --- | --- | --- |
| `stopId` | 출발 정류장을 구분하는 ID | `stop-seongbuk-office` |
| `destinationId` | 목적지 후보를 구분하는 ID | `bomun` |
| `routeId` | 버스 노선 ID | `1112` |
| `routeNumber` | 화면에 표시할 노선 번호 | `1112번` |
| `arrivalMinutes` | 버스가 출발 정류장에 올 때까지 남은 시간 | `5` |
| `travelMinutes` | 승차 후 목적지까지 예상 이동시간 | `15` |
| `standingBurdenMinutes` | `보통` 이상 구간의 예상 시간을 모두 더한 값 | `3` |
| `standingBurdenLevel` | 노선 전체의 입석 부담 단계 | `LOW` |
| `congestionLevel` | 한 구간의 예상 혼잡 단계 | `NORMAL` |
| `durationMinutes` | 해당 구간을 지나는 데 걸리는 시간 | `3` |
| `generatedAt` | 예측 결과를 만든 시각 | ISO 8601 문자열 |

`standingBurdenMinutes`는 각 구간 중 `NORMAL` 이상인 구간의 `durationMinutes`를 더한 값입니다. 예를 들어 보통 3분, 여유 12분인 노선이라면 입석 부담 예상 시간은 3분입니다.

혼잡 단계는 코드로 전달하고, 화면에 표시할 한글과 색상은 프론트에서 정합니다.

| API 값 | 화면 표시 |
| --- | --- |
| `RELAXED` | 여유 |
| `NORMAL` | 보통 |
| `CROWDED` | 혼잡 |
| `VERY_CROWDED` | 매우 혼잡 |

노선 전체의 입석 부담은 `LOW`, `MEDIUM`, `HIGH`를 사용합니다. 서버 응답에는 CSS 색상 이름이나 `tone` 같은 화면 전용 값을 넣지 않습니다.

### 데이터가 부족한 경우

혼잡도 데이터 부족은 요청 실패와 구분합니다. 서버는 `200 OK`와 함께 `status`를 `INSUFFICIENT_DATA`로 내려주고, 사용할 수 있는 도착시간과 이동시간은 그대로 제공합니다.

```json
{
  "status": "INSUFFICIENT_DATA",
  "reasonCode": "NOT_ENOUGH_HISTORICAL_SAMPLES",
  "routes": [
    {
      "routeId": "101",
      "routeNumber": "101번",
      "arrivalMinutes": 4,
      "travelMinutes": 18
    }
  ]
}
```

이 응답을 받으면 `덜 붐비는 버스` 선택을 비활성화하고 빠른 도착순으로만 보여줍니다.

## Spring API 연결

백엔드가 준비되면 `.env`를 만들고 모드를 변경합니다.

```bash
VITE_API_MODE=server
VITE_API_BASE_URL=http://localhost:8080
```

현재 프론트에서 사용하는 함수는 다음 두 개입니다.

- `getBootstrap(stopId)`
- `getJourneyPrediction({ originStopId, destinationId })`

목적지 검색은 아직 `bootstrap.json`의 후보를 브라우저에서 필터링합니다. 검색 API가 확정되면 `busApi.searchDestinations`를 추가할 예정입니다.

요청 시점과 응답 예시는 [`docs/API_CONTRACT_DRAFT.md`](docs/API_CONTRACT_DRAFT.md)에 따로 정리했습니다. Swagger가 확정되면 이 문서와 `src/mocks`를 먼저 맞춘 뒤 서버 모드로 전환하면 됩니다.
