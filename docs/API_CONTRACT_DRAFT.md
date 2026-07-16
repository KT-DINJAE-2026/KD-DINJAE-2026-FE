# FE-백엔드 API 계약 초안

프론트 Mock JSON과 Spring Swagger를 맞추기 위한 회의용 초안입니다. URL과 필드명은 확정 전이지만 화면에 필요한 요청 시점과 데이터 범위는 아래와 같습니다.

## 요청 시점

| 사용자 동작 | 요청 | 화면에서 쓰는 값 |
| --- | --- | --- |
| 정류장 QR 진입 | `GET /api/v1/stops/{stopId}/context` | 현재 정류장과 최근 도착 정류장 |
| 도착 정류장 검색 | `GET /api/v1/stops/search?originStopId={id}&query={text}` | 현재 정류장에서 갈 수 있는 정류장 |
| 도착 정류장 선택 | `POST /api/v1/journeys/predictions` | 운행 가능한 버스와 구간별 입석 부담 |
| 다시 분석 | 위 예측 API 재호출 | 최신 `generatedAt` 결과 |

프로토타입은 `context` 응답의 `destinationStops`를 브라우저에서 검색합니다. 실제 연동에서는 검색어가 바뀔 때 정류장 검색 API를 호출하는 방식으로 바꿀 예정입니다.

## ID 기준

- `stopId`: 출발 정류장과 도착 정류장을 식별합니다.
- `routeId`: 1112번처럼 노선 자체를 식별합니다.
- `tripId`: 현재 도착 예정인 특정 운행 버스를 식별합니다.

같은 노선의 차량이 연달아 올 수 있으므로 비교 결과와 상세 화면 연결에는 `tripId`가 필요합니다. 모델이 예측할 범위는 `originStopId`부터 `destinationStopId`까지입니다.

## 1. QR 진입

```http
GET /api/v1/stops/stop-seongbuk-office/context
```

```json
{
  "generatedAt": "2026-07-13T13:58:00+09:00",
  "currentStop": {
    "stopId": "stop-seongbuk-office",
    "stopName": "성북구청 정류장",
    "directionDescription": "보문역·종로 방면"
  },
  "destinationStops": [
    {
      "stopId": "stop-bomun-exit2",
      "stopName": "보문역 2번 출구 정류장",
      "directionDescription": "신설동·동대문 방면",
      "landmark": "보문역 2번 출구 앞",
      "searchKeywords": ["보문역", "보문", "2번 출구"],
      "servedRouteIds": ["1112", "95", "142", "103"]
    }
  ]
}
```

`destinationStops`는 최근 검색이나 데모용 초기 목록입니다. 버스 도착시간의 기준 시각은 여정 분석 응답에서 따로 제공합니다.

## 2. 도착 정류장 검색

```http
GET /api/v1/stops/search?originStopId=stop-seongbuk-office&query=보문역
```

```json
{
  "destinationStops": [
    {
      "stopId": "stop-bomun-exit2",
      "stopName": "보문역 2번 출구 정류장",
      "directionDescription": "신설동·동대문 방면",
      "landmark": "보문역 2번 출구 앞",
      "servedRouteIds": ["1112", "95", "142", "103"]
    }
  ]
}
```

검색 결과에는 현재 정류장에서 한 번에 갈 수 있는 도착 정류장만 포함합니다. 같은 이름의 정류장을 구분할 수 있도록 `directionDescription`과 `landmark`가 필요합니다. `servedRouteIds`에는 출발 정류장과 도착 정류장을 모두 지나는 노선만 넣습니다.

## 3. 여정 분석

```http
POST /api/v1/journeys/predictions
Content-Type: application/json
```

```json
{
  "originStopId": "stop-seongbuk-office",
  "destinationStopId": "stop-bomun-exit2"
}
```

### 예측 성공 응답

```json
{
  "status": "SUCCESS",
  "generatedAt": "2026-07-13T13:58:00+09:00",
  "originStopId": "stop-seongbuk-office",
  "destinationStopId": "stop-bomun-exit2",
  "predictionBasis": {
    "description": "평일 오후 2시 승하차 패턴",
    "confidence": "MEDIUM"
  },
  "routes": [
    {
      "tripId": "trip-1112-1403",
      "routeId": "1112",
      "routeNumber": "1112번",
      "direction": "보문역·신설동 방면",
      "vehicleType": "저상버스",
      "isLowFloor": true,
      "arrivalMinutes": 5,
      "travelMinutes": 15,
      "standingBurdenMinutes": 3,
      "standingBurdenLevel": "LOW",
      "summaryMessage": "성북소방서부터 여유 예상",
      "segments": [
        {
          "fromStopId": "stop-seongbuk-office",
          "fromStopName": "성북구청",
          "toStopId": "stop-seongbuk-fire-station",
          "toStopName": "성북소방서",
          "durationMinutes": 3,
          "congestionLevel": "NORMAL",
          "description": "입석 이동 가능"
        },
        {
          "fromStopId": "stop-seongbuk-fire-station",
          "fromStopName": "성북소방서",
          "toStopId": "stop-bomun-exit2",
          "toStopName": "보문역 2번 출구",
          "durationMinutes": 12,
          "congestionLevel": "RELAXED",
          "description": "좌석 이용 여건 개선 예상"
        }
      ]
    }
  ]
}
```

대안 버스는 같은 시각의 결과를 비교할 수 있도록 별도 API가 아닌 `routes` 배열에 함께 담습니다. 혼잡도 예측이 있으면 `standingBurdenMinutes`가 짧은 순서로 배치하고, `arrivalMinutes + travelMinutes`가 가장 짧은 버스에는 별도로 `빠른 도착` 표시를 붙입니다. 데이터가 부족하면 빠른 도착순으로 배치합니다.

화면의 `앉기 편한 시간`은 별도 API 필드가 아니라 `congestionLevel`이 `RELAXED`인 구간의 `durationMinutes` 합계로 계산합니다. 좌석을 보장하는 값이 아니므로 화면에도 여유 예상 구간의 합계라는 안내를 함께 표시합니다.

상세 화면에서는 다른 버스를 별도로 추천하지 않습니다. 사용자는 구간별 예상과 혼잡 단계 의미를 확인한 뒤 비교 화면으로 돌아가 다른 버스를 직접 선택합니다. 환승이나 다른 정류장까지 걷는 우회 경로도 현재 범위에 포함하지 않습니다.

## 데이터 부족 응답

혼잡도 데이터 부족은 서버 오류가 아닙니다. 도착시간과 이동시간을 제공할 수 있다면 `200 OK`와 `INSUFFICIENT_DATA`를 반환합니다.

```json
{
  "status": "INSUFFICIENT_DATA",
  "reasonCode": "NOT_ENOUGH_HISTORICAL_SAMPLES",
  "generatedAt": "2026-07-13T13:58:00+09:00",
  "originStopId": "stop-seongbuk-office",
  "destinationStopId": "stop-cityhall-front",
  "predictionBasis": {
    "description": "과거 승하차 표본 부족",
    "confidence": "UNAVAILABLE"
  },
  "routes": [
    {
      "tripId": "trip-101-1402",
      "routeId": "101",
      "routeNumber": "101번",
      "direction": "종로·시청 방면",
      "vehicleType": "저상버스",
      "isLowFloor": true,
      "arrivalMinutes": 4,
      "travelMinutes": 18,
      "summaryMessage": "지금 기준 가장 빨리 도착해요"
    }
  ]
}
```

이 응답에는 `standingBurdenMinutes`, `standingBurdenLevel`, `segments`를 넣지 않습니다. 프론트는 앉기 편한 시간 표시 없이 빠른 도착순으로만 보여줍니다.

## enum과 단위

| 필드 | 값 |
| --- | --- |
| `status` | `SUCCESS`, `INSUFFICIENT_DATA` |
| `confidence` | `HIGH`, `MEDIUM`, `LOW`, `UNAVAILABLE` |
| `standingBurdenLevel` | `LOW`, `MEDIUM`, `HIGH` |
| `congestionLevel` | `RELAXED`, `NORMAL`, `CROWDED`, `VERY_CROWDED` |

시간은 분 단위이며 필드명에 `Minutes`를 붙입니다. `generatedAt`은 시간대가 포함된 ISO 8601 문자열을 사용합니다.

## 오류 응답

HTTP 오류는 데이터 부족 응답과 구분합니다.

```json
{
  "code": "STOP_NOT_FOUND",
  "message": "정류장 정보를 찾을 수 없습니다.",
  "traceId": "7e91d8d5"
}
```

최소한 `400`, `404`, `409`, `500`의 오류 코드와 프론트 처리 방식을 Swagger에서 합의해야 합니다.

## 회의에서 확정할 항목

- 검색 결과를 현재 정류장에서 갈 수 있는 정류장으로 제한할 수 있는지
- 동명 정류장 구분용 방향·랜드마크 데이터 제공 여부
- 실제 도착 차량을 구분할 수 있는 `tripId` 제공 여부
- 각 필드의 필수·선택 여부와 `null` 허용 여부
- enum 값과 데이터 부족 `reasonCode`
- 도착시간 갱신 주기와 캐시 기준
- 로컬 개발 주소와 Vercel 주소에 대한 Spring CORS 설정
- 공통 오류 형식과 Swagger 예시 응답

Swagger가 확정되면 이 문서, `src/mocks`, `src/api/busApi.js` 순서로 맞춘 뒤 `VITE_API_MODE=server`로 전환합니다.
