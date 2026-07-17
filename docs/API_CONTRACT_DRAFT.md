# 버스 여정 조회 API 규격

React 프로토타입의 Mock JSON을 Spring API로 교체하기 위한 FE·백엔드 협의 문서입니다.

- 문서 버전: `0.6`
- 작성 기준일: `2026-07-17`
- 기본 경로: `/api/v1`
- 데이터 형식: `application/json; charset=UTF-8`
- 인증: 프로토타입 범위에서는 사용하지 않음

URL과 일부 필드명은 Swagger 작성 과정에서 조정할 수 있습니다. 다만 정류장 식별 방식, 시간 계산, 데이터 부족 처리 방식은 프론트와 백엔드가 같은 기준을 사용해야 합니다.

## 1. 데모 데이터 기준

현재 Mock은 아래 서울시 2026년 7월 1일 자료를 기준으로 만들었습니다.

- [서울시 버스정류소 위치정보](https://data.seoul.go.kr/dataList/OA-15067/S/1/datasetView.do)
- [서울시 버스 노선별 정류소 정보](https://data.seoul.go.kr/dataList/OA-1095/L/1/datasetView.do)

공식 자료를 사용한 값은 정류장 ID, ARS 번호, 정류장 원문명, 좌표와 Mock에 포함한 노선의 ID·번호·정류장 경유 순서입니다. 어떤 노선을 현재 비교 대상으로 보여줄지와 버스 도착시간, 이동시간, 차량 종류, 혼잡도, 입석 부담은 UI 동작 확인용 Mock 시나리오입니다.

이 구분은 Mock JSON의 `dataSource`에 기록합니다. 실제 Spring 응답에서는 운영 데이터 출처를 관리할 필요가 없다면 `dataSource`를 생략해도 됩니다.

## 2. Mock과 API 대응

| Mock 파일 | API | 프론트 함수 |
| --- | --- | --- |
| `src/mocks/bootstrap.json` | `GET /api/v1/stops/{stopId}/context` | `getBootstrap(stopId)` |
| `src/mocks/predictions/bomun.json` | `POST /api/v1/journeys/predictions` | `getJourneyPrediction(...)` |
| `src/mocks/predictions/sinseoldong.json` | `POST /api/v1/journeys/predictions` | `getJourneyPrediction(...)` |

Mock 모드와 서버 모드는 화면에서 같은 응답 구조를 사용합니다. 현재 도착 정류장 검색은 `bootstrap.json`의 작은 목록을 브라우저에서 필터링하며, 실제 연동 때는 `GET /api/v1/stops/search`를 추가합니다.

## 3. 공통 규칙

### ID와 이름

| 필드 | 설명 | 예시 |
| --- | --- | --- |
| `stopId` | 서울시 정류장 고유 ID | `107000089` |
| `arsId` | 정류장 표지판에서 확인하는 ARS 번호 | `08179` |
| `stopName` | 공공데이터의 정류장 원문명 | `보문역2번출구` |
| `displayName` | 띄어쓰기를 다듬은 화면 표시 이름 | `보문역 2번 출구` |
| `routeId` | 서울시 노선 고유 ID | `100100129` |
| `routeNumber` | 사용자에게 보이는 노선 번호 | `1014번` |
| `tripId` | 현재 도착 예정인 차량 단위 ID | `mock-trip-100100129-1405` |

같은 노선 차량이 연달아 올 수 있으므로 `tripId`는 한 응답의 `routes` 안에서 고유해야 합니다. 프론트는 비교 카드에서 상세 화면으로 이동할 때 `tripId`를 사용합니다.

### 시간과 선택 필드

- 분 단위 값은 0 이상의 정수이며 필드명에 `Minutes`를 붙입니다.
- `generatedAt`은 시간대가 포함된 ISO 8601 문자열입니다.
- `arrivalMinutes`는 `generatedAt`부터 버스가 출발 정류장에 도착할 때까지의 예상 시간입니다.
- `travelMinutes`는 출발 정류장에서 승차한 뒤 도착 정류장까지 이동하는 예상 시간입니다.
- 선택 값이 없을 때는 `null`보다 필드 생략을 우선합니다.

### 좌표

`location`은 WGS84 경위도를 사용합니다.

```json
{
  "latitude": 37.5858514183,
  "longitude": 127.0189209428
}
```

프론트는 이 좌표로 가장 가까운 카카오맵 로드뷰를 찾습니다.

## 4. 요청 목록

| 시점 | Method | URL | 상태 |
| --- | --- | --- | --- |
| QR 진입 | `GET` | `/api/v1/stops/{stopId}/context` | 사용 중 |
| 도착 정류장 검색 | `GET` | `/api/v1/stops/search` | 서버 연동 때 추가 |
| 정류장 모습 확인 | `-` | 백엔드 요청 없음 | 좌표로 카카오 로드뷰 조회 |
| 정류장 확인 완료 | `POST` | `/api/v1/journeys/predictions` | 사용 중 |

## 5. QR 진입 정보

QR에 들어 있는 서울시 `stopId`로 출발 정류장과 초기 도착 정류장 목록을 가져옵니다.

```http
GET /api/v1/stops/107000087/context
Accept: application/json
```

### 응답 예시

```json
{
  "generatedAt": "2026-07-17T09:00:00+09:00",
  "currentStop": {
    "stopId": "107000087",
    "arsId": "08177",
    "stopName": "성북구청.성북경찰서",
    "displayName": "성북구청·성북경찰서",
    "directionDescription": "보문역 방면",
    "location": {
      "latitude": 37.5881513802,
      "longitude": 127.0174306588
    }
  },
  "destinationStops": [
    {
      "stopId": "107000089",
      "arsId": "08179",
      "stopName": "보문역2번출구",
      "displayName": "보문역 2번 출구",
      "directionDescription": "신설동·창신동 방면",
      "landmark": "보문역 2번 출구 앞",
      "searchKeywords": ["보문역", "보문", "2번 출구", "08179"],
      "servedRoutes": [
        { "routeId": "100100129", "routeNumber": "1014" },
        { "routeId": "100100031", "routeNumber": "152" },
        { "routeId": "100100008", "routeNumber": "103" },
        { "routeId": "100100021", "routeNumber": "142" }
      ],
      "location": {
        "latitude": 37.5858514183,
        "longitude": 127.0189209428
      },
      "roadviewFallback": {
        "imageUrl": "/images/stop-preview/bomun-stop.webp",
        "altText": "보문역 2번 출구 인근 버스 정류장 모습 예시",
        "label": "정류장 모습 예시"
      }
    }
  ]
}
```

### 필드

| 경로 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `generatedAt` | string | O | 응답 생성 시각 |
| `currentStop` | object | O | QR로 확인한 출발 정류장 |
| `currentStop.stopId` | string | O | 서울시 정류장 ID |
| `currentStop.arsId` | string | O | 앞자리 0을 포함한 ARS 번호 |
| `currentStop.stopName` | string | O | 공공데이터 원문명 |
| `currentStop.displayName` | string | O | 화면 표시 이름 |
| `currentStop.directionDescription` | string | O | 정류장 진행 방향 안내 |
| `currentStop.location` | object | O | 정류장 WGS84 좌표 |
| `destinationStops` | array | O | 최근 검색 또는 초기 추천 목록 |
| `destinationStops[].stopId` | string | O | 도착 정류장 ID |
| `destinationStops[].arsId` | string | O | 도착 정류장 ARS 번호 |
| `destinationStops[].stopName` | string | O | 공공데이터 원문명 |
| `destinationStops[].displayName` | string | O | 화면 표시 이름 |
| `destinationStops[].directionDescription` | string | O | 동명 정류장 구분용 방향 |
| `destinationStops[].landmark` | string | O | 동명 정류장 구분용 주변 장소 |
| `destinationStops[].searchKeywords` | string[] | Mock만 | 브라우저 검색용 키워드 |
| `destinationStops[].servedRoutes` | object[] | O | 해당 시점에 비교 대상으로 내려주는 직통 노선 |
| `destinationStops[].servedRoutes[].routeId` | string | O | 서울시 노선 ID |
| `destinationStops[].servedRoutes[].routeNumber` | string | O | 노선 번호 |
| `destinationStops[].location` | object | O | 정류장 WGS84 좌표 |
| `destinationStops[].roadviewFallback` | object | 선택 | 로드뷰 실패 시 사용할 정보 |
| `destinationStops[].roadviewFallback.imageUrl` | string | 선택 | 대체 이미지 URL |
| `destinationStops[].roadviewFallback.altText` | string | 조건부 | 이미지 제공 시 대체 설명 |
| `destinationStops[].roadviewFallback.label` | string | 선택 | 이미지 하단 출처·상태 문구 |

`destinationStops`는 전체 정류장 목록이 아니라 QR 진입 직후 보여줄 최근 목적지나 데모용 목록입니다.

## 6. 도착 정류장 검색

실제 데이터 규모에서는 전체 정류장을 브라우저로 보내지 않고 서버에서 검색합니다.

```http
GET /api/v1/stops/search?originStopId=107000087&query=보문역
Accept: application/json
```

| Query | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `originStopId` | string | O | QR로 확인한 출발 정류장 ID |
| `query` | string | O | 정류장명, ARS 번호 또는 노선 번호 |

검색 결과의 정류장 객체는 5장의 `destinationStops[]`와 같은 구조를 사용합니다. 검색은 이름이나 ARS 번호가 일치하는 정류장을 반환하고, `servedRoutes`에는 `originStopId`와 해당 정류장을 함께 지나는 직통 노선을 넣습니다. 직통 노선이 없으면 정류장을 검색 결과에서 숨기지 않고 `servedRoutes: []`로 반환합니다. 그래야 존재하지 않는 정류장과 직통 버스가 없는 정류장을 화면에서 구분할 수 있습니다.

같은 이름의 정류장을 구분할 수 있도록 `arsId`, `directionDescription`, `location`을 반드시 제공합니다. 프론트는 `servedRoutes`가 비어 있어도 정류장 위치를 확인할 수 있게 검색 결과를 표시하고, 사용자가 선택하면 여정 분석 결과의 `NO_DIRECT_ROUTE` 화면으로 안내합니다.

검색 결과가 없으면 `200 OK`와 빈 배열을 반환합니다.

```json
{
  "destinationStops": []
}
```

검색 결과가 있다는 사실은 직통 버스가 있다는 뜻이 아닙니다. `destinationStops: []`는 정류장 검색 실패, `NO_DIRECT_ROUTE`는 정류장은 확인됐지만 두 정류장을 함께 지나는 노선이 없는 경우로 사용합니다.

Spring 서버가 카카오 로드뷰를 대신 요청할 필요는 없습니다. 프론트가 검색 결과의 좌표로 로드뷰를 조회합니다.

## 7. 여정 분석

사용자가 도착 정류장의 로드뷰와 방향을 확인한 뒤 요청합니다.

```http
POST /api/v1/journeys/predictions
Content-Type: application/json
Accept: application/json
```

### 요청 본문

```json
{
  "originStopId": "107000087",
  "destinationStopId": "107000089"
}
```

### 공통 응답 필드

| 경로 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `status` | enum | O | `SUCCESS` 또는 `INSUFFICIENT_DATA` |
| `reasonCode` | string | 조건부 | 데이터 부족 사유 코드 |
| `generatedAt` | string | O | 도착·혼잡도 예측 기준 시각 |
| `originStopId` | string | O | 요청한 출발 정류장 ID |
| `destinationStopId` | string | O | 요청한 도착 정류장 ID |
| `predictionBasis.description` | string | O | 화면에 표시할 예측 기준 문구 |
| `predictionBasis.confidence` | enum | O | 예측 신뢰도 |
| `routes` | array | O | 현재 도착 예정인 직통 버스 목록 |

## 8. 예측 성공 응답

```json
{
  "status": "SUCCESS",
  "generatedAt": "2026-07-17T09:00:00+09:00",
  "originStopId": "107000087",
  "destinationStopId": "107000089",
  "predictionBasis": {
    "description": "평일 오후 2시 Mock 승하차 시나리오",
    "confidence": "MEDIUM"
  },
  "routes": [
    {
      "tripId": "mock-trip-100100129-1405",
      "routeId": "100100129",
      "routeNumber": "1014번",
      "direction": "보문역·신설동 방면",
      "vehicleType": "저상버스",
      "isLowFloor": true,
      "arrivalMinutes": 5,
      "travelMinutes": 3,
      "standingBurdenMinutes": 0,
      "standingBurdenLevel": "LOW",
      "summaryMessage": "짧은 구간 동안 여유가 예상돼요",
      "segments": [
        {
          "fromStopId": "107000087",
          "fromStopName": "성북구청.성북경찰서",
          "fromStopDisplayName": "성북구청·성북경찰서",
          "toStopId": "107000089",
          "toStopName": "보문역2번출구",
          "toStopDisplayName": "보문역 2번 출구",
          "durationMinutes": 3,
          "congestionLevel": "RELAXED",
          "description": "앉아서 갈 가능성이 높아요"
        }
      ]
    }
  ]
}
```

### `routes[]`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `tripId` | string | O | 도착 예정 차량 단위 ID |
| `routeId` | string | O | 서울시 노선 ID |
| `routeNumber` | string | O | 화면 표시용 노선 번호 |
| `direction` | string | O | 운행 방향 |
| `vehicleType` | string | O | `저상버스`, `일반버스` 등 표시 문구 |
| `isLowFloor` | boolean | O | 저상버스 여부 |
| `arrivalMinutes` | integer | O | 버스 도착까지 남은 시간 |
| `travelMinutes` | integer | O | 승차 후 도착 정류장까지 이동시간 |
| `standingBurdenMinutes` | integer | O | `NORMAL` 이상 구간 시간 합계 |
| `standingBurdenLevel` | enum | O | 여정 전체 입석 부담 단계 |
| `summaryMessage` | string | O | 비교·상세 카드의 쉬운 요약 |
| `segments` | array | O | 출발부터 도착까지 순서가 보장된 구간 |

### `segments[]`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `fromStopId` | string | O | 구간 출발 정류장 ID |
| `fromStopName` | string | O | 구간 출발 정류장 원문명 |
| `fromStopDisplayName` | string | 선택 | 구간 출발 정류장 표시 이름 |
| `toStopId` | string | O | 구간 도착 정류장 ID |
| `toStopName` | string | O | 구간 도착 정류장 원문명 |
| `toStopDisplayName` | string | 선택 | 구간 도착 정류장 표시 이름 |
| `durationMinutes` | integer | O | 해당 구간 이동시간 |
| `congestionLevel` | enum | O | 구간 혼잡도 단계 |
| `description` | string | O | 구간 아래에 표시할 쉬운 설명 |

`summaryMessage`, `predictionBasis.description`, `segments[].description`은 화면에 그대로 표시합니다. 색상과 배지 문구는 프론트가 enum 값으로 결정합니다.

## 9. 데이터 부족 응답

혼잡도 표본이 부족해도 도착·이동시간을 제공할 수 있다면 HTTP 오류로 처리하지 않고 `200 OK`를 반환합니다.

```json
{
  "status": "INSUFFICIENT_DATA",
  "reasonCode": "NOT_ENOUGH_HISTORICAL_SAMPLES",
  "generatedAt": "2026-07-17T09:00:00+09:00",
  "originStopId": "107000087",
  "destinationStopId": "100000147",
  "predictionBasis": {
    "description": "과거 승하차 Mock 표본 부족",
    "confidence": "UNAVAILABLE"
  },
  "routes": [
    {
      "tripId": "mock-trip-100100129-1404",
      "routeId": "100100129",
      "routeNumber": "1014번",
      "direction": "신설동·동묘앞 방면",
      "vehicleType": "저상버스",
      "isLowFloor": true,
      "arrivalMinutes": 4,
      "travelMinutes": 10,
      "summaryMessage": "지금 기준 가장 빨리 도착해요"
    }
  ]
}
```

이 응답에서는 `standingBurdenMinutes`, `standingBurdenLevel`, `segments`를 보내지 않습니다. 프론트는 혼잡·좌석 정보를 숨기고 전체 소요시간이 짧은 순서로 보여줍니다.

## 10. 계산과 검증 규칙

```text
전체 소요시간 = arrivalMinutes + travelMinutes
앉기 편한 시간 = RELAXED 구간의 durationMinutes 합계
입석 부담 시간 = NORMAL 이상 구간의 durationMinutes 합계
```

예측 성공 응답은 아래 조건을 만족해야 합니다.

- 모든 `Minutes` 값은 0 이상의 정수입니다.
- 구간 시간 합계는 `travelMinutes`와 같습니다.
- `RELAXED`를 제외한 구간 시간 합계는 `standingBurdenMinutes`와 같습니다.
- 첫 구간의 `fromStopId`는 `originStopId`와 같습니다.
- 마지막 구간의 `toStopId`는 `destinationStopId`와 같습니다.
- 앞 구간의 `toStopId`와 다음 구간의 `fromStopId`는 같습니다.
- 각 구간은 해당 `routeId`의 실제 정류장 경유 순서를 따릅니다.
- `tripId`는 한 응답의 `routes` 안에서 중복되지 않습니다.
- `routeId`는 선택한 도착 정류장의 `servedRoutes[].routeId`에 포함됩니다.

예측 성공 시 프론트는 입석 부담 시간, 전체 소요시간 순으로 정렬합니다. 별도로 전체 소요시간이 가장 짧은 차량에 `빠른 도착`을 표시합니다. 데이터 부족 시에는 전체 소요시간, 버스 도착시간 순으로 정렬합니다.

## 11. enum

| 필드 | 값 |
| --- | --- |
| `status` | `SUCCESS`, `INSUFFICIENT_DATA` |
| `predictionBasis.confidence` | `HIGH`, `MEDIUM`, `LOW`, `UNAVAILABLE` |
| `standingBurdenLevel` | `LOW`, `MEDIUM`, `HIGH` |
| `congestionLevel` | `RELAXED`, `NORMAL`, `CROWDED`, `VERY_CROWDED` |
| `reasonCode` | 우선 `NOT_ENOUGH_HISTORICAL_SAMPLES`, 추가 값은 Swagger에서 협의 |

| `congestionLevel` | 화면 표시 |
| --- | --- |
| `RELAXED` | 여유 |
| `NORMAL` | 보통 |
| `CROWDED` | 혼잡 |
| `VERY_CROWDED` | 매우 혼잡 |

## 12. 오류 응답

HTTP 오류는 혼잡도 데이터 부족과 구분합니다.

```json
{
  "code": "STOP_NOT_FOUND",
  "message": "정류장 정보를 찾을 수 없습니다.",
  "traceId": "7e91d8d5"
}
```

| HTTP status | `code` 예시 | 사용 상황 |
| --- | --- | --- |
| `400` | `INVALID_REQUEST` | 필수값 누락, 잘못된 ID 형식 |
| `404` | `STOP_NOT_FOUND` | 출발 또는 도착 정류장 없음 |
| `404` | `NO_DIRECT_ROUTE` | 두 정류장을 한 번에 잇는 버스 없음 |
| `409` | `STOP_DIRECTION_MISMATCH` | 정류장은 있지만 선택 방향으로 이동 불가 |
| `500` | `INTERNAL_SERVER_ERROR` | 서버 처리 실패 |

`message`는 사용자 안내에 직접 사용하지 않고 개발 로그 확인용으로 사용합니다. `traceId`는 서버 로그와 프론트 오류를 맞춰 보기 위해 포함합니다.

## 13. CORS

아래 Origin에서 `GET`, `POST`, `OPTIONS` 요청을 허용해야 합니다.

- `http://localhost:5173`
- `https://kd-dinjae-2026-fe.vercel.app`

요청 헤더는 `Accept`, `Content-Type`을 허용합니다.

## 14. Swagger 확정 전 체크

- 서울시 `stopId`, `arsId`, `routeId`를 그대로 제공할 수 있는지
- `tripId`를 도착 예정 차량마다 고유하게 만들 수 있는지
- 동명 정류장을 구분할 방향과 좌표를 제공할 수 있는지
- 검색 결과를 출발 정류장에서 환승 없이 갈 수 있는 곳으로 제한할 수 있는지
- 구간별 정류장 순서와 시간 합계를 백엔드에서 검증하는지
- 도착시간 갱신 주기와 캐시 기준
- 입석 부담 단계 산정 기준
- 데이터 부족을 HTTP 오류와 구분하는지
- Vercel·로컬 CORS 설정

Swagger가 확정되면 문서, Mock JSON, `busApi.js` 순서로 맞추고 `VITE_API_MODE=server`에서 성공·데이터 부족·HTTP 오류를 각각 확인합니다.
