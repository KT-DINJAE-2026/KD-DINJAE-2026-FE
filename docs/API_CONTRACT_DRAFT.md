# FE-백엔드 API 계약 초안

프론트 Mock JSON과 Spring Swagger의 구조를 맞추기 위한 회의용 문서입니다. URL과 필드명은 확정 전이지만, 화면에 필요한 요청 시점과 데이터 범위는 이 기준으로 맞추면 됩니다.

## 요청 시점

| 사용자 동작 | 요청 | 화면에서 쓰는 값 |
| --- | --- | --- |
| 정류장 QR 진입 | `GET /api/v1/stops/{stopId}/context` | 현재 정류장, 도착 예정 버스, 초기 목적지 후보 |
| 목적지 검색 | `GET /api/v1/destinations?originStopId={id}&query={text}` | 장소와 주변 하차 정류장 후보, 추가 예정 |
| 하차 정류장 확정 | `POST /api/v1/journeys/predictions` | 도착 버스별 이동시간과 구간별 입석 부담 |
| 다시 분석 | 위 예측 API 재호출 | 최신 `generatedAt` 결과 |
| 버스 최종 선택 | 요청 없음 | 예약이나 알림 기능이 생길 때 별도 논의 |

현재 프론트는 `context` 응답에서 정류장 정보, 도착 버스, 초기 목적지 후보를 함께 받습니다. 첫 연동 때는 이 구조를 그대로 제공해야 합니다. 목적지 검색 API가 추가되면 입력 검색 결과만 별도 요청으로 바꾸고, 목적지 객체와 하차 후보의 구조는 그대로 유지합니다.

## ID 기준

- `stopId`: 정류장을 식별합니다.
- `destinationId`: 사용자가 검색한 장소를 식별합니다.
- `candidateId`: 한 장소 주변의 하차 후보를 식별합니다.
- `routeId`: 1112번과 같은 노선 자체를 식별합니다.
- `tripId`: 현재 도착 예정인 특정 운행 버스를 식별합니다.

같은 노선의 버스가 연달아 올 수 있으므로 비교와 선택에는 `tripId`가 필요합니다. 모델이 예측할 구간은 `originStopId`부터 `destinationStopId`까지입니다.

## 1. 정류장 진입

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
  "arrivals": [
    {
      "tripId": "trip-1112-1403",
      "routeId": "1112",
      "routeNumber": "1112번",
      "direction": "보문역·신설동 방면",
      "arrivalMinutes": 5,
      "vehicleType": "저상버스",
      "isLowFloor": true
    }
  ],
  "destinations": [
    {
      "destinationId": "bomun",
      "displayName": "보문역 2번 출구",
      "category": "지하철역",
      "nearbyDescription": "보문역 6호선 · 보문숲길도서관 인근",
      "searchKeywords": ["보문역", "보문", "6호선"],
      "alightingCandidates": [
        {
          "candidateId": "bomun-exit2",
          "stopId": "stop-bomun-exit2",
          "stopName": "보문역 2번 출구 정류장",
          "landmark": "보문역 2번 출구와 엘리베이터 앞",
          "walkMinutes": 2,
          "walkingDistanceMeters": 140,
          "streetImageUrl": "https://example.com/stops/bomun-exit2.jpg",
          "streetImageAlt": "지하철 출입구와 버스 정류장이 함께 보이는 거리 사진",
          "servedRouteIds": ["1112", "95"],
          "recommended": true
        }
      ]
    }
  ]
}
```

`arrivalMinutes`는 최상단 `generatedAt` 시각을 기준으로 계산합니다.

## 2. 목적지 검색과 하차 후보

```http
GET /api/v1/destinations?originStopId=stop-seongbuk-office&query=보문역
```

```json
{
  "destinations": [
    {
      "destinationId": "bomun",
      "displayName": "보문역 2번 출구",
      "category": "지하철역",
      "nearbyDescription": "보문역 6호선 · 보문숲길도서관 인근",
      "alightingCandidates": [
        {
          "candidateId": "bomun-exit2",
          "stopId": "stop-bomun-exit2",
          "stopName": "보문역 2번 출구 정류장",
          "landmark": "보문역 2번 출구와 엘리베이터 앞",
          "walkMinutes": 2,
          "walkingDistanceMeters": 140,
          "streetImageUrl": "https://example.com/stops/bomun-exit2.jpg",
          "streetImageAlt": "지하철 출입구와 버스 정류장이 함께 보이는 거리 사진",
          "servedRouteIds": ["1112", "95"],
          "recommended": true
        }
      ]
    }
  ]
}
```

하차 후보는 목적지에서 가까운 순서만으로 정하지 않습니다. 도보 거리, 엘리베이터나 횡단보도 같은 이동 정보, 출발 정류장에서 해당 정류장까지 운행하는 노선을 함께 고려해야 합니다.

`streetImageUrl`은 현재 프로토타입 사진용 필드입니다. 실제 로드뷰 SDK를 프론트에서 직접 쓰기로 하면 이 필드 대신 좌표와 로드뷰 식별자를 합의하면 됩니다.

## 3. 여정 분석 요청

```http
POST /api/v1/journeys/predictions
Content-Type: application/json
```

```json
{
  "originStopId": "stop-seongbuk-office",
  "destinationId": "bomun",
  "destinationStopId": "stop-bomun-exit2",
  "preferredTripId": "trip-1112-1403"
}
```

`preferredTripId`는 버스를 먼저 고른 경우에만 전달하며 그 외에는 `null`입니다. 먼저 고른 버스가 운행 종료나 도착 완료로 더 이상 유효하지 않다면 서버는 다른 버스 결과를 정상 반환하고, 필요하면 별도 `reasonCode`를 추가합니다.

## 예측 성공 응답

```json
{
  "status": "SUCCESS",
  "generatedAt": "2026-07-13T13:58:00+09:00",
  "originStopId": "stop-seongbuk-office",
  "destinationId": "bomun",
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
          "toStopId": "stop-seongbuk-police-station",
          "toStopName": "성북경찰서",
          "durationMinutes": 4,
          "congestionLevel": "RELAXED",
          "description": "좌석 이용 여건 개선 예상"
        }
      ]
    }
  ]
}
```

대안 버스는 별도 API로 나누지 않고 같은 `routes` 배열에 담습니다. 같은 시각의 데이터로 비교해야 하기 때문입니다. 프론트는 다음 기준으로 정렬합니다.

- 덜 붐비는 버스: `standingBurdenMinutes`가 짧은 순서
- 빠른 도착: `arrivalMinutes + travelMinutes`가 짧은 순서

## 데이터 부족 응답

혼잡도 데이터 부족은 서버 오류가 아닙니다. 도착시간과 이동시간을 쓸 수 있다면 `200 OK`와 `INSUFFICIENT_DATA`를 반환합니다.

```json
{
  "status": "INSUFFICIENT_DATA",
  "reasonCode": "NOT_ENOUGH_HISTORICAL_SAMPLES",
  "generatedAt": "2026-07-13T13:58:00+09:00",
  "originStopId": "stop-seongbuk-office",
  "destinationId": "cityhall",
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

이 응답에는 `standingBurdenMinutes`, `standingBurdenLevel`, `segments`를 넣지 않습니다. 프론트는 혼잡도 탭을 비활성화하고 빠른 도착순으로만 보여줍니다.

## enum과 단위

| 필드 | 값 |
| --- | --- |
| `status` | `SUCCESS`, `INSUFFICIENT_DATA` |
| `confidence` | `HIGH`, `MEDIUM`, `LOW`, `UNAVAILABLE` |
| `standingBurdenLevel` | `LOW`, `MEDIUM`, `HIGH` |
| `congestionLevel` | `RELAXED`, `NORMAL`, `CROWDED`, `VERY_CROWDED` |

시간 숫자는 모두 분 단위이며 필드명에 `Minutes`를 붙입니다. 거리 숫자는 미터 단위이며 `Meters`를 붙입니다. `generatedAt`은 시간대가 포함된 ISO 8601 문자열을 사용합니다.

## 오류 응답

HTTP 오류는 데이터 부족 응답과 다른 형식을 사용합니다.

```json
{
  "code": "STOP_NOT_FOUND",
  "message": "정류장 정보를 찾을 수 없습니다.",
  "traceId": "7e91d8d5"
}
```

최소한 `400`, `404`, `409`, `500`의 `code`와 처리 방식을 Swagger에서 합의해야 합니다.

## 회의에서 확정할 항목

- 목적지 검색 API가 하차 후보까지 한 번에 반환하는지 여부
- 실제 도착 버스를 구분할 수 있는 `tripId` 제공 여부
- 각 필드의 필수·선택 여부와 `null` 허용 여부
- enum 값과 데이터 부족 `reasonCode`
- 거리 사진 URL을 줄지, 좌표와 로드뷰 식별자를 줄지
- 도착시간의 갱신 주기와 캐시 기준
- 로컬 개발 주소와 Vercel 주소에 대한 Spring CORS 설정
- 공통 오류 형식과 Swagger 예시 응답

Swagger가 확정되면 이 문서, `src/mocks`, `src/api/busApi.js` 순서로 맞춘 뒤 `VITE_API_MODE=server`로 전환합니다.
