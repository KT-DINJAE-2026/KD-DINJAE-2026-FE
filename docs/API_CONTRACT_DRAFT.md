# 버스 여정 조회 API 규격

React 프로토타입의 Mock JSON을 Spring API로 교체하기 위한 FE·백엔드 협의 문서입니다.

- 문서 버전: `0.4`
- 작성 기준일: `2026-07-17`
- 기본 경로: `/api/v1`
- 데이터 형식: `application/json; charset=UTF-8`
- 인증: 프로토타입 범위에서는 사용하지 않음

URL이나 일부 이름은 Swagger 작성 과정에서 바꿀 수 있지만, 응답이 제공해야 하는 정보와 필드 조건은 이 문서를 기준으로 맞춥니다.

## 1. 현재 Mock과 API 대응

| Mock 파일 | API | 프론트 호출 |
| --- | --- | --- |
| `src/mocks/bootstrap.json` | `GET /api/v1/stops/{stopId}/context` | `getBootstrap(stopId)` |
| `src/mocks/predictions/bomun.json` | `POST /api/v1/journeys/predictions` | `getJourneyPrediction(...)` |
| `src/mocks/predictions/cityhall.json` | `POST /api/v1/journeys/predictions` | `getJourneyPrediction(...)` |

Mock 모드와 서버 모드는 같은 응답 구조를 사용합니다. Spring 연동을 위해 별도의 화면용 변환 계층을 추가하기보다는 Mock JSON 자체를 API 예시 응답으로 유지합니다.

현재 정류장 검색은 `bootstrap.json`에 들어 있는 목록을 브라우저에서 필터링합니다. `GET /api/v1/stops/search`는 실제 연동 시 추가할 API이며 현재 `busApi.js`에는 아직 구현되어 있지 않습니다.

## 2. 공통 규칙

### ID

| 필드 | 설명 | 예시 |
| --- | --- | --- |
| `stopId` | 정류장 고유 ID | `stop-seongbuk-office` |
| `routeId` | 노선 고유 ID | `1112` |
| `tripId` | 현재 도착 예정인 특정 운행 버스 ID | `trip-1112-1403` |

같은 노선 차량이 연달아 올 수 있으므로 `tripId`는 한 응답 안에서 반드시 고유해야 합니다. 프론트는 버스 카드에서 상세 화면으로 이동할 때 `tripId`를 사용합니다.

### 시간과 날짜

- 분 단위 값은 0 이상의 정수이며 필드명에 `Minutes`를 붙입니다.
- `generatedAt`은 시간대가 포함된 ISO 8601 문자열을 사용합니다.
- `arrivalMinutes`는 `generatedAt` 시점부터 버스가 도착할 때까지의 예상 시간입니다.
- 선택 필드가 없을 때는 `null` 대신 필드를 생략합니다.

### 배열

- `routes`는 현재 프로토타입에서 최소 1개가 필요합니다.
- `segments`는 출발 정류장부터 도착 정류장까지 순서대로 전달합니다.
- 직접 운행하는 버스가 없다면 빈 `routes` 대신 `404 NO_DIRECT_ROUTE`를 사용합니다. 빈 결과 화면이 추가되면 이 규칙을 다시 협의합니다.

## 3. 요청 목록

| 시점 | Method | URL | 현재 구현 |
| --- | --- | --- | --- |
| QR 진입 | `GET` | `/api/v1/stops/{stopId}/context` | 사용 중 |
| 도착 정류장 검색 | `GET` | `/api/v1/stops/search` | 연동 전 추가 예정 |
| 정류장 모습 확인 | `-` | 추가 요청 없음 | 검색 응답의 좌표로 프론트에서 카카오 로드뷰 조회 |
| 정류장 확인 완료 | `POST` | `/api/v1/journeys/predictions` | 사용 중 |

## 4. QR 진입 정보

QR에 들어 있는 `stopId`를 이용해 현재 출발 정류장과 초기 도착 정류장 목록을 가져옵니다.

```http
GET /api/v1/stops/stop-seongbuk-office/context
Accept: application/json
```

### 응답 예시

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
      "servedRouteIds": ["1112", "95", "142", "103"],
      "location": {
        "latitude": 37.58575,
        "longitude": 127.019
      },
      "roadviewFallback": {
        "imageUrl": "/images/stop-preview/bomun-stop.webp",
        "altText": "지하철 출입구 옆 인도에 있는 보문역 2번 출구 버스 정류장 모습 예시",
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
| `currentStop.stopId` | string | O | 출발 정류장 ID |
| `currentStop.stopName` | string | O | 화면에 표시할 정류장 이름 |
| `currentStop.directionDescription` | string | O | 정류장 운행 방향 |
| `destinationStops` | array | O | 최근 검색 또는 초기 추천 목록 |
| `destinationStops[].stopId` | string | O | 도착 정류장 ID |
| `destinationStops[].stopName` | string | O | 도착 정류장 이름 |
| `destinationStops[].directionDescription` | string | O | 동명 정류장 구분용 방향 |
| `destinationStops[].landmark` | string | O | 동명 정류장 구분용 주변 장소 |
| `destinationStops[].searchKeywords` | string[] | O | Mock의 클라이언트 검색용 키워드 |
| `destinationStops[].servedRouteIds` | string[] | O | 두 정류장을 모두 지나는 노선 ID |
| `destinationStops[].location` | object | O | 정류장의 WGS84 좌표 |
| `destinationStops[].location.latitude` | number | O | 위도, 범위 `-90`~`90` |
| `destinationStops[].location.longitude` | number | O | 경도, 범위 `-180`~`180` |
| `destinationStops[].roadviewFallback` | object | 선택 | 카카오 로드뷰를 표시하지 못할 때 사용할 정류장 이미지 |
| `destinationStops[].roadviewFallback.imageUrl` | string | 조건부 | 대체 이미지 URL |
| `destinationStops[].roadviewFallback.altText` | string | 조건부 | 대체 이미지의 화면 낭독용 설명 |
| `destinationStops[].roadviewFallback.label` | string | 조건부 | `정류장 모습 예시`와 같은 이미지 출처 문구 |

`destinationStops`는 전체 정류장 목록이 아닙니다. QR 진입 직후 보여줄 최근 목적지나 데모용 초기 목록으로 사용합니다.

## 5. 도착 정류장 검색

실제 데이터 규모에서는 전체 정류장을 브라우저에 내려받지 않고 서버에서 검색합니다.

```http
GET /api/v1/stops/search?originStopId=stop-seongbuk-office&query=보문역
Accept: application/json
```

### Query parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `originStopId` | string | O | 출발 정류장 ID |
| `query` | string | O | 사용자가 입력한 정류장 이름, 방향 또는 랜드마크 |

검색어 앞뒤 공백을 제거한 뒤 최소 1글자 이상일 때 요청합니다. 디바운스 시간은 프론트에서 결정합니다.

### 응답 예시

```json
{
  "destinationStops": [
    {
      "stopId": "stop-bomun-exit2",
      "stopName": "보문역 2번 출구 정류장",
      "directionDescription": "신설동·동대문 방면",
      "landmark": "보문역 2번 출구 앞",
      "servedRouteIds": ["1112", "95", "142", "103"],
      "location": {
        "latitude": 37.58575,
        "longitude": 127.019
      },
      "roadviewFallback": {
        "imageUrl": "https://cdn.example.com/stops/stop-bomun-exit2.webp",
        "altText": "보문역 2번 출구 앞 버스 정류장 모습",
        "label": "2026년 7월 촬영"
      }
    }
  ]
}
```

검색 결과에는 `originStopId`에서 한 번에 갈 수 있는 정류장만 포함합니다. 같은 이름의 정류장을 구분할 수 있도록 `directionDescription`과 `landmark`는 필수입니다.

프론트는 사용자가 검색 결과를 누르면 `location` 좌표에서 가장 가까운 카카오 로드뷰를 조회합니다. 따라서 Spring 서버가 카카오 로드뷰나 이미지 URL을 대신 조회할 필요는 없습니다. 주변에 로드뷰가 없거나 SDK를 불러오지 못하면 선택 필드인 `roadviewFallback`을 표시하고, 이 값도 없으면 정류장명·방향·랜드마크만 보여줍니다. 서버가 대체 이미지를 제공할 때 `imageUrl`은 HTTPS 절대 URL을 사용합니다.

검색 결과가 없으면 `200 OK`와 빈 `destinationStops` 배열을 반환합니다.

## 6. 여정 분석

로드뷰를 확인하고 `이 정류장이 맞아요`를 눌렀을 때 두 정류장 사이를 운행하는 도착 예정 버스와 구간별 혼잡도 예측을 요청합니다.

```http
POST /api/v1/journeys/predictions
Content-Type: application/json
Accept: application/json
```

### 요청 본문

```json
{
  "originStopId": "stop-seongbuk-office",
  "destinationStopId": "stop-bomun-exit2"
}
```

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `originStopId` | string | O | QR로 확인한 출발 정류장 ID |
| `destinationStopId` | string | O | 사용자가 선택한 도착 정류장 ID |

### 공통 응답 필드

| 경로 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `status` | enum | O | `SUCCESS` 또는 `INSUFFICIENT_DATA` |
| `reasonCode` | string | 조건부 | 데이터 부족 사유 코드 |
| `generatedAt` | string | O | 도착·혼잡도 예측 기준 시각 |
| `originStopId` | string | O | 요청한 출발 정류장 ID |
| `destinationStopId` | string | O | 요청한 도착 정류장 ID |
| `predictionBasis` | object | O | 예측 설명과 신뢰도 |
| `predictionBasis.description` | string | O | 화면에 표시할 예측 기준 문구 |
| `predictionBasis.confidence` | enum | O | 예측 신뢰도 |
| `routes` | array | O | 도착 예정 버스 목록 |

## 7. 예측 성공 응답

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
          "description": "서서 갈 가능성이 있어요"
        },
        {
          "fromStopId": "stop-seongbuk-fire-station",
          "fromStopName": "성북소방서",
          "toStopId": "stop-bomun-exit2",
          "toStopName": "보문역 2번 출구",
          "durationMinutes": 12,
          "congestionLevel": "RELAXED",
          "description": "앉을 가능성이 높아져요"
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
| `routeId` | string | O | 노선 ID |
| `routeNumber` | string | O | 화면 표시용 노선 번호 |
| `direction` | string | O | 운행 방향 |
| `vehicleType` | string | O | `저상버스`, `일반버스` 등 표시 문구 |
| `isLowFloor` | boolean | O | 저상버스 여부 |
| `arrivalMinutes` | integer | O | 버스 도착까지 남은 시간 |
| `travelMinutes` | integer | O | 승차 후 도착 정류장까지 이동시간 |
| `standingBurdenMinutes` | integer | O | `NORMAL` 이상 구간 시간의 합계 |
| `standingBurdenLevel` | enum | O | 여정 전체 입석 부담 단계 |
| `summaryMessage` | string | O | 비교·상세 카드에 표시할 요약 문구 |
| `segments` | array | O | 출발부터 도착까지 순서가 보장된 구간 목록 |

### `segments[]`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `fromStopId` | string | O | 구간 출발 정류장 ID |
| `fromStopName` | string | O | 구간 출발 정류장 표시 이름 |
| `toStopId` | string | O | 구간 도착 정류장 ID |
| `toStopName` | string | O | 구간 도착 정류장 표시 이름 |
| `durationMinutes` | integer | O | 해당 구간 이동시간 |
| `congestionLevel` | enum | O | 구간 혼잡도 단계 |
| `description` | string | O | 구간 아래에 표시할 쉬운 설명 |

현재 프론트는 `summaryMessage`, `predictionBasis.description`, `segments[].description`을 그대로 화면에 표시합니다. 색상, 배지 이름, 정렬용 `tone`은 프론트가 enum 값에서 결정하므로 API에 포함하지 않습니다.

## 8. 데이터 부족 응답

혼잡도 표본이 부족해도 도착시간과 이동시간을 제공할 수 있다면 HTTP 오류로 처리하지 않습니다. `200 OK`와 `INSUFFICIENT_DATA`를 반환합니다.

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

이 응답에서는 아래 필드를 보내지 않습니다.

- `standingBurdenMinutes`
- `standingBurdenLevel`
- `segments`

프론트는 좌석·혼잡 정보를 숨기고 `arrivalMinutes + travelMinutes`가 짧은 순서로 버스를 보여줍니다.

## 9. 프론트 계산과 정렬

서버와 프론트가 같은 의미로 값을 사용하도록 아래 규칙을 고정합니다.

```text
전체 소요시간 = arrivalMinutes + travelMinutes
앉기 편한 시간 = RELAXED 구간의 durationMinutes 합계
입석 부담 시간 = NORMAL 이상 구간의 durationMinutes 합계
```

예측 성공 시 프론트 정렬 기준은 다음과 같습니다.

1. `standingBurdenMinutes`가 가장 짧은 버스를 먼저 표시합니다.
2. 전체 소요시간이 가장 짧은 버스를 빠른 도착으로 표시합니다.
3. 나머지 버스는 입석 부담 시간, 전체 소요시간 순으로 정렬합니다.

데이터 부족 시에는 전체 소요시간, 버스 도착시간 순으로 정렬합니다. 서버가 전달한 배열 순서에는 의존하지 않습니다.

## 10. 서버 데이터 검증 규칙

예측 성공 응답은 아래 조건을 만족해야 합니다.

- 모든 `Minutes` 값은 0 이상의 정수입니다.
- `segments[].durationMinutes` 합계는 `travelMinutes`와 같습니다.
- `RELAXED`를 제외한 구간 시간 합계는 `standingBurdenMinutes`와 같습니다.
- 첫 구간의 `fromStopId`는 `originStopId`와 같습니다.
- 마지막 구간의 `toStopId`는 `destinationStopId`와 같습니다.
- 앞 구간의 `toStopId`와 다음 구간의 `fromStopId`는 같습니다.
- `tripId`는 한 응답의 `routes` 안에서 중복되지 않습니다.
- `routeId`는 선택한 도착 정류장의 `servedRouteIds`에 포함됩니다.

조건이 맞지 않으면 화면 계산 결과도 달라지므로 Swagger 예시와 백엔드 테스트에 포함하는 것이 좋습니다.

## 11. enum

| 필드 | 값 |
| --- | --- |
| `status` | `SUCCESS`, `INSUFFICIENT_DATA` |
| `predictionBasis.confidence` | `HIGH`, `MEDIUM`, `LOW`, `UNAVAILABLE` |
| `standingBurdenLevel` | `LOW`, `MEDIUM`, `HIGH` |
| `congestionLevel` | `RELAXED`, `NORMAL`, `CROWDED`, `VERY_CROWDED` |
| `reasonCode` | `NOT_ENOUGH_HISTORICAL_SAMPLES`부터 시작하며 추가 값은 Swagger에서 협의 |

프론트 표시 기준은 다음과 같습니다.

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

최소한 아래 Origin에서 `GET`, `POST`, `OPTIONS` 요청을 허용해야 합니다.

- `http://localhost:5173`
- `https://kd-dinjae-2026-fe.vercel.app`

개발 포트가 달라지면 해당 Origin을 추가합니다. 요청 헤더는 `Accept`, `Content-Type`을 허용합니다.

## 14. Swagger 확정 전 체크

- URL과 HTTP method
- 각 필드의 필수·조건부 여부
- `null` 대신 필드 생략 규칙
- `tripId` 제공 가능 여부와 고유성
- 동명 정류장 구분용 방향·랜드마크 제공 여부
- 검색 결과에서 WGS84 위도·경도를 제공할 수 있는지
- 선택 필드인 `roadviewFallback` 이미지 제공 여부
- 검색 결과를 출발 정류장에서 바로 갈 수 있는 곳으로 제한할 수 있는지
- 도착시간 갱신 주기와 캐시 기준
- 입석 부담 단계 산정 기준
- `reasonCode`와 공통 오류 코드
- Vercel·로컬 CORS 설정

Swagger가 확정되면 다음 순서로 맞춥니다.

1. 이 문서의 URL과 필드명을 수정합니다.
2. `src/mocks` JSON을 Swagger 예시와 동일하게 바꿉니다.
3. `src/api/busApi.js` 요청 함수를 맞춥니다.
4. `VITE_API_MODE=server`로 실제 응답을 확인합니다.
5. 성공, 데이터 부족, HTTP 오류 세 경우를 각각 테스트합니다.
