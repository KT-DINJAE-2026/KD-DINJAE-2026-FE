# 버스 여정 조회 API 규격

React 프로토타입의 Mock JSON을 Spring API로 교체하기 위한 FE·백엔드 협의 문서입니다.

- 문서 버전: `0.3`
- 작성 기준일: `2026-07-17`
- 기본 경로: `/api/v1`
- 데이터 형식: `application/json; charset=UTF-8`
- 인증: 프로토타입 범위에서는 사용하지 않음

URL은 Swagger 작성 과정에서 바꿀 수 있지만, 화면이 필요로 하는 데이터와 필드 조건은 이 문서를 기준으로 맞춥니다.

## 1. 화면 흐름과 요청 시점

```text
정류장 QR
  → 장소 또는 정류장 검색
  → [장소 선택] 바로 갈 수 있는 주변 정류장 조회
  → 도착 정류장 모습·방향 확인
  → 버스 도착 및 구간별 혼잡도 예측
```

| 시점 | Method | URL | 프론트 함수 |
| --- | --- | --- | --- |
| QR 진입 | `GET` | `/stops/{stopId}/context` | `getBootstrap(stopId)` |
| 검색어 입력 | `GET` | `/destinations/search` | `searchDestinations(...)` |
| 장소 선택 | `GET` | `/places/{placeId}/reachable-stops` | `getReachableStops(...)` |
| 정류장 확인 완료 | `POST` | `/journeys/predictions` | `getJourneyPrediction(...)` |

정류장을 검색 결과에서 직접 선택하면 주변 정류장 조회는 생략합니다. 다만 동명 정류장과 반대편 정류장을 구분하기 위해 `정류장 확인` 화면은 항상 거칩니다.

## 2. Mock 파일과 API 대응

| Mock 파일 | 대신하는 API |
| --- | --- |
| `src/mocks/bootstrap.json` | `GET /stops/{stopId}/context` |
| `src/mocks/destination-search.json` | `GET /destinations/search` |
| `src/mocks/reachable-stops/bomun-station.json` | `GET /places/{placeId}/reachable-stops` |
| `src/mocks/reachable-stops/seoul-cityhall.json` | `GET /places/{placeId}/reachable-stops` |
| `src/mocks/predictions/*.json` | `POST /journeys/predictions` |

Mock 모드와 서버 모드는 같은 응답 구조를 사용합니다. 화면 컴포넌트는 JSON을 직접 가져오지 않고 `src/api/busApi.js`만 호출합니다.

## 3. 공통 규칙

### ID

| 필드 | 설명 | 예시 |
| --- | --- | --- |
| `stopId` | 정류장 고유 ID | `stop-bomun-exit2` |
| `placeId` | 장소 검색 결과 ID | `place-bomun-station` |
| `routeId` | 노선 고유 ID | `1112` |
| `tripId` | 현재 도착 예정인 차량 단위 ID | `trip-1112-1403` |

같은 노선 차량이 연달아 올 수 있으므로 `tripId`는 한 예측 응답 안에서 반드시 고유해야 합니다.

### 시간과 배열

- 분 단위 값은 0 이상의 정수이며 필드명에 `Minutes`를 붙입니다.
- 거리는 0 이상의 정수이며 미터 단위인 `distanceMeters`를 사용합니다.
- `generatedAt`은 시간대가 포함된 ISO 8601 문자열을 사용합니다.
- 선택 필드가 없을 때는 `null`보다 필드 생략을 사용합니다.
- 검색 결과가 없을 때는 `200 OK`와 빈 배열을 반환합니다.

## 4. 공통 도착 정류장 객체

검색 결과에서 직접 고른 정류장과 장소 주변 정류장은 같은 구조를 사용합니다.

```json
{
  "stopId": "stop-bomun-exit2",
  "stopName": "보문역 2번 출구 정류장",
  "directionDescription": "신설동·동대문 방면",
  "landmark": "보문역 2번 출구 앞",
  "latitude": 37.5854,
  "longitude": 127.0194,
  "walkMinutes": 2,
  "distanceMeters": 120,
  "directRouteCount": 4,
  "servedRouteIds": ["1112", "95", "142", "103"],
  "roadview": {
    "available": true,
    "imageUrl": "https://api.example.com/media/stops/stop-bomun-exit2.webp",
    "altText": "지하철 출입구 옆에 있는 보문역 2번 출구 버스 정류장 모습",
    "capturedAtLabel": "2026년 7월 촬영"
  }
}
```

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `stopId` | string | O | 도착 정류장 ID |
| `stopName` | string | O | 화면 표시 이름 |
| `directionDescription` | string | O | 동명·반대편 정류장 구분용 방향 |
| `landmark` | string | O | 정류장과 가까운 출구·건물 |
| `latitude` | number | O | WGS84 위도 |
| `longitude` | number | O | WGS84 경도 |
| `walkMinutes` | integer | 장소 경유 시 | 해당 장소까지 예상 도보 시간 |
| `distanceMeters` | integer | 장소 경유 시 | 해당 장소까지 도보 거리 |
| `directRouteCount` | integer | O | 출발 정류장에서 바로 가는 노선 수 |
| `servedRouteIds` | string[] | O | 출발·도착 정류장을 모두 지나는 노선 ID |
| `roadview` | object | O | 정류장 모습 제공 여부와 미디어 정보 |
| `roadview.available` | boolean | O | 정류장 모습 제공 가능 여부 |
| `roadview.imageUrl` | string | 조건부 | `available=true`일 때 필수 |
| `roadview.altText` | string | 조건부 | `available=true`일 때 필수 |
| `roadview.capturedAtLabel` | string | 조건부 | 촬영 시점 또는 `정류장 모습 예시` 같은 출처 표시 |

`roadview.available=false`이면 프론트는 지도와 방향·랜드마크 정보를 먼저 보여줍니다. 현재 Mock의 이미지는 화면 검증용 예시이며, 실제 연동에서는 지도 제공사 또는 백엔드 미디어 URL로 교체합니다.

## 5. QR 진입 정보

```http
GET /api/v1/stops/stop-seongbuk-office/context
Accept: application/json
```

```json
{
  "generatedAt": "2026-07-17T14:00:00+09:00",
  "currentStop": {
    "stopId": "stop-seongbuk-office",
    "stopName": "성북구청 정류장",
    "directionDescription": "보문역·종로 방면",
    "latitude": 37.5898,
    "longitude": 127.0167
  },
  "recentDestinations": [
    {
      "type": "PLACE",
      "placeId": "place-bomun-station",
      "name": "보문역",
      "address": "서울 성북구 보문로"
    },
    {
      "type": "STOP",
      "stop": {
        "stopId": "stop-cityhall-front",
        "stopName": "서울시청 앞 정류장",
        "directionDescription": "시청·서소문 방면",
        "landmark": "서울광장 맞은편",
        "latitude": 37.5662,
        "longitude": 126.9782,
        "directRouteCount": 4,
        "servedRouteIds": ["101", "102", "103", "104"],
        "roadview": {
          "available": true,
          "imageUrl": "https://api.example.com/media/stops/stop-cityhall-front.webp",
          "altText": "서울광장 맞은편에 있는 서울시청 앞 정류장 모습",
          "capturedAtLabel": "2026년 7월 촬영"
        }
      }
    }
  ]
}
```

`recentDestinations`는 전체 검색 데이터가 아니라 QR 진입 직후 보여줄 최근 목적지입니다. 각 항목의 `type`은 `PLACE` 또는 `STOP`입니다.

## 6. 장소·정류장 검색

```http
GET /api/v1/destinations/search?originStopId=stop-seongbuk-office&query=보문역
Accept: application/json
```

| Query | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `originStopId` | string | O | QR로 확인한 출발 정류장 |
| `query` | string | O | 장소 또는 정류장 검색어, 공백 제거 후 1글자 이상 |

```json
{
  "results": [
    {
      "type": "PLACE",
      "placeId": "place-bomun-station",
      "name": "보문역",
      "address": "서울 성북구 보문로"
    },
    {
      "type": "STOP",
      "stop": {
        "stopId": "stop-bomun-exit2",
        "stopName": "보문역 2번 출구 정류장",
        "directionDescription": "신설동·동대문 방면",
        "landmark": "보문역 2번 출구 앞",
        "latitude": 37.5854,
        "longitude": 127.0194,
        "directRouteCount": 4,
        "servedRouteIds": ["1112", "95", "142", "103"],
        "roadview": {
          "available": true,
          "imageUrl": "https://api.example.com/media/stops/stop-bomun-exit2.webp",
          "altText": "보문역 2번 출구 옆 정류장 모습",
          "capturedAtLabel": "2026년 7월 촬영"
        }
      }
    }
  ]
}
```

검색 결과 규칙은 다음과 같습니다.

- `PLACE`는 장소 이름과 주소를 표시하고 다음 단계에서 주변 정류장을 조회합니다.
- `STOP`은 출발 정류장에서 바로 갈 수 있는 정류장만 반환합니다.
- `PLACE`도 직행 가능한 주변 정류장이 하나 이상 있는 장소만 반환하는 것을 권장합니다.
- 장소와 정류장 이름이 같더라도 별도 결과로 보내며 프론트가 유형 배지를 표시합니다.

`destination-search.json`의 `searchKeywords`는 Mock 모드에서 브라우저 검색을 흉내 내기 위한 값입니다. 서버가 직접 검색하는 실제 API 응답에서는 생략해도 됩니다.

## 7. 장소 주변의 직행 정류장

```http
GET /api/v1/places/place-bomun-station/reachable-stops?originStopId=stop-seongbuk-office
Accept: application/json
```

```json
{
  "place": {
    "placeId": "place-bomun-station",
    "name": "보문역",
    "address": "서울 성북구 보문로",
    "latitude": 37.5855,
    "longitude": 127.0193
  },
  "stops": [
    {
      "stopId": "stop-bomun-exit2",
      "stopName": "보문역 2번 출구 정류장",
      "directionDescription": "신설동·동대문 방면",
      "landmark": "보문역 2번 출구 앞",
      "latitude": 37.5854,
      "longitude": 127.0194,
      "walkMinutes": 2,
      "distanceMeters": 120,
      "directRouteCount": 4,
      "servedRouteIds": ["1112", "95", "142", "103"],
      "roadview": {
        "available": true,
        "imageUrl": "https://api.example.com/media/stops/stop-bomun-exit2.webp",
        "altText": "보문역 2번 출구 옆 정류장 모습",
        "capturedAtLabel": "2026년 7월 촬영"
      }
    }
  ]
}
```

`stops`에는 다음 조건을 모두 만족하는 정류장만 포함합니다.

- `originStopId`에서 환승 없이 갈 수 있음
- 장소에서 설정한 검색 반경 안에 있음
- 정류장 방향과 노선이 유효함
- `walkMinutes`, `distanceMeters` 오름차순으로 정렬됨

운행 정보가 바뀌어 결과가 없어지면 `200 OK`와 빈 `stops`를 반환합니다. 프론트는 다른 목적지를 검색하도록 안내합니다.

## 8. 버스 도착·혼잡도 예측

```http
POST /api/v1/journeys/predictions
Content-Type: application/json
Accept: application/json
```

```json
{
  "originStopId": "stop-seongbuk-office",
  "destinationStopId": "stop-bomun-exit2"
}
```

### 공통 응답

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `status` | enum | O | `SUCCESS`, `INSUFFICIENT_DATA` |
| `reasonCode` | string | 조건부 | 데이터 부족 사유 |
| `generatedAt` | string | O | 도착·혼잡도 예측 기준 시각 |
| `originStopId` | string | O | 요청한 출발 정류장 |
| `destinationStopId` | string | O | 요청한 도착 정류장 |
| `predictionBasis.description` | string | O | 화면에 표시할 예측 기준 문구 |
| `predictionBasis.confidence` | enum | O | `HIGH`, `MEDIUM`, `LOW`, `UNAVAILABLE` |
| `routes` | array | O | 도착 예정 버스 목록 |

### 예측 성공 예시

```json
{
  "status": "SUCCESS",
  "generatedAt": "2026-07-17T14:00:00+09:00",
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
| `routeNumber` | string | O | 화면 표시 노선 번호 |
| `direction` | string | O | 운행 방향 |
| `vehicleType` | string | O | `저상버스`, `일반버스` 등 |
| `isLowFloor` | boolean | O | 저상버스 여부 |
| `arrivalMinutes` | integer | O | 버스가 출발 정류장에 올 때까지의 시간 |
| `travelMinutes` | integer | O | 승차 후 도착 정류장까지 이동시간 |
| `standingBurdenMinutes` | integer | 성공 시 | `RELAXED`가 아닌 구간 시간의 합 |
| `standingBurdenLevel` | enum | 성공 시 | `LOW`, `MEDIUM`, `HIGH` |
| `summaryMessage` | string | O | 비교·상세 카드의 쉬운 요약 문구 |
| `segments` | array | 성공 시 | 출발부터 도착까지 순서가 보장된 구간 |

### `segments[]`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `fromStopId`, `toStopId` | string | O | 구간 시작·도착 정류장 ID |
| `fromStopName`, `toStopName` | string | O | 화면 표시 이름 |
| `durationMinutes` | integer | O | 해당 구간 이동시간 |
| `congestionLevel` | enum | O | `RELAXED`, `NORMAL`, `CROWDED`, `VERY_CROWDED` |
| `description` | string | O | `서서 갈 가능성이 있어요` 같은 쉬운 설명 |

프론트는 `summaryMessage`, `predictionBasis.description`, `segments[].description`을 그대로 표시합니다. 색상과 `여유·보통·혼잡` 표시는 enum에서 결정합니다.

## 9. 데이터 부족 응답

혼잡도 표본이 부족해도 도착 정보가 있으면 HTTP 오류로 처리하지 않고 `200 OK`를 반환합니다.

```json
{
  "status": "INSUFFICIENT_DATA",
  "reasonCode": "NOT_ENOUGH_HISTORICAL_SAMPLES",
  "generatedAt": "2026-07-17T14:00:00+09:00",
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

이 응답에서는 `standingBurdenMinutes`, `standingBurdenLevel`, `segments`를 보내지 않습니다. 프론트는 좌석·혼잡 정보를 숨기고 빠른 도착순으로 보여줍니다.

## 10. 프론트 계산과 정렬

```text
전체 소요시간 = arrivalMinutes + travelMinutes
앉기 편한 시간 = RELAXED 구간의 durationMinutes 합계
입석 부담 시간 = RELAXED가 아닌 구간의 durationMinutes 합계
```

예측 성공 시에는 입석 부담 시간이 짧은 버스를 먼저 배치하고, 전체 소요시간이 가장 짧은 버스에 `빠른 도착` 표시를 붙입니다. 데이터 부족 시에는 전체 소요시간, 버스 도착시간 순으로 정렬합니다.

## 11. 서버 데이터 검증 규칙

- `directRouteCount`는 `servedRouteIds.length`와 같습니다.
- 주변 정류장의 `walkMinutes`, `distanceMeters`는 0 이상의 정수입니다.
- `roadview.available=true`이면 `imageUrl`, `altText`, `capturedAtLabel`이 모두 존재합니다.
- 예측 성공 시 `segments[].durationMinutes` 합계는 `travelMinutes`와 같습니다.
- `RELAXED`가 아닌 구간 시간 합계는 `standingBurdenMinutes`와 같습니다.
- 첫 구간의 `fromStopId`는 `originStopId`, 마지막 구간의 `toStopId`는 `destinationStopId`와 같습니다.
- 앞 구간의 `toStopId`와 다음 구간의 `fromStopId`는 같습니다.
- `tripId`는 한 응답의 `routes` 안에서 중복되지 않습니다.
- 모든 `routeId`는 확인 화면에서 전달된 `servedRouteIds`에 포함됩니다.

이 조건은 Swagger 예시뿐 아니라 Spring 테스트에서도 확인하는 것이 좋습니다.

## 12. 오류 응답

```json
{
  "code": "STOP_NOT_FOUND",
  "message": "정류장 정보를 찾을 수 없습니다.",
  "traceId": "7e91d8d5"
}
```

| HTTP status | `code` 예시 | 사용 상황 |
| --- | --- | --- |
| `400` | `INVALID_REQUEST` | 필수값 누락, 잘못된 ID |
| `404` | `STOP_NOT_FOUND` | 출발 또는 도착 정류장 없음 |
| `404` | `PLACE_NOT_FOUND` | 장소 ID 없음 |
| `409` | `STOP_DIRECTION_MISMATCH` | 선택 방향으로 이동할 수 없음 |
| `500` | `INTERNAL_SERVER_ERROR` | 서버 처리 실패 |

`message`는 사용자에게 그대로 노출하지 않고, `traceId`와 함께 개발 로그 확인에 사용합니다.

## 13. CORS와 미디어

최소한 아래 Origin에서 `GET`, `POST`, `OPTIONS` 요청을 허용합니다.

- `http://localhost:5173`
- `https://kd-dinjae-2026-fe.vercel.app`

정류장 이미지가 다른 도메인에 있다면 브라우저에서 표시 가능한 공개 URL이나 만료 시간이 충분한 서명 URL을 전달해야 합니다. 지도 제공사의 비밀 키를 JSON에 포함하면 안 됩니다.

## 14. Swagger 확정 전 체크

- 네 API의 URL과 HTTP method
- `PLACE`와 `STOP` 검색 결과 구분 방식
- 출발지에서 직행 가능한 정류장만 검색·후보에 포함할 수 있는지
- `directionDescription`, `landmark`, 좌표 제공 여부
- 정류장 사진 제공 주체, 갱신 주기, 사진이 없을 때의 처리
- `tripId` 고유성, 도착시간 갱신 주기
- 입석 부담 단계 산정 기준과 `reasonCode`
- Vercel·로컬 CORS 설정

Swagger가 확정되면 Mock JSON과 `busApi.js`를 먼저 맞춘 뒤 `VITE_API_MODE=server`로 성공, 데이터 부족, 빈 검색, HTTP 오류를 각각 확인합니다.
