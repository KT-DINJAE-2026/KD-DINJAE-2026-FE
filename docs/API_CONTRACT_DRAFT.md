# FE-백엔드 API 계약 초안

> 확정본이 아니다. 프론트 Mock JSON과 백엔드 Swagger가 같은 구조를 사용하기 위한 회의용 초안이다.

## 요청 시점

| 사용자 동작 | 프론트 요청 | 비고 |
| --- | --- | --- |
| 정류장 QR 진입 | `GET /api/v1/stops/{stopId}/context` | 현재 정류장과 초기 목적지 후보 조회 |
| 목적지 검색 | `GET /api/v1/destinations?originStopId={id}&query={text}` | 입력 중 300ms 디바운스 또는 검색 버튼 클릭 시 요청 |
| 목적지 확인 | `POST /api/v1/journeys/predictions` | 도착 예정 버스와 구간별 혼잡도 예측을 한 번에 조회 |
| 다시 분석/새로고침 | 위 여정 분석 API 재호출 | 최신 `generatedAt` 기준으로 화면 교체 |
| 버스 선택 | 요청 없음 | 예약·알림 기능을 추가할 때만 별도 API 필요 |

대안 버스는 여정 분석의 `routes` 배열에 함께 포함한다. 같은 기준 시각으로 비교해야 하므로 별도 API로 나누지 않는 편이 단순하다.

## 여정 분석 요청

```http
POST /api/v1/journeys/predictions
Content-Type: application/json
```

```json
{
  "originStopId": "stop-seongbuk-office",
  "destinationId": "bomun"
}
```

## 예측 성공 응답

```json
{
  "status": "SUCCESS",
  "generatedAt": "2026-07-13T13:58:00+09:00",
  "originStopId": "stop-seongbuk-office",
  "destinationId": "bomun",
  "routes": [
    {
      "routeId": "1112",
      "routeNumber": "1112번",
      "arrivalMinutes": 5,
      "travelMinutes": 15,
      "standingBurdenMinutes": 3,
      "standingBurdenLevel": "LOW",
      "summaryMessage": "성북소방서부터 여유 예상",
      "segments": [
        {
          "fromStopName": "성북구청",
          "toStopName": "성북소방서",
          "durationMinutes": 3,
          "congestionLevel": "NORMAL",
          "description": "입석 이동 가능"
        }
      ]
    }
  ]
}
```

## 데이터 부족 응답

혼잡도 데이터 부족은 HTTP 오류가 아니다. 도착·이동시간을 이용할 수 있으므로 `200 OK`와 `INSUFFICIENT_DATA` 상태를 반환한다.

```json
{
  "status": "INSUFFICIENT_DATA",
  "reasonCode": "NOT_ENOUGH_HISTORICAL_SAMPLES",
  "generatedAt": "2026-07-13T13:58:00+09:00",
  "originStopId": "stop-seongbuk-office",
  "destinationId": "cityhall",
  "routes": [
    {
      "routeId": "101",
      "routeNumber": "101번",
      "arrivalMinutes": 4,
      "travelMinutes": 18,
      "summaryMessage": "지금 기준 가장 빨리 도착해요"
    }
  ]
}
```

## 반드시 합의할 항목

- 이름 대신 `stopId`, `routeId`, `destinationId`를 요청 기준으로 사용
- 시간 숫자는 분 단위이며 필드명에 `Minutes` 명시
- `status`, `reasonCode`, `standingBurdenLevel`, `congestionLevel`의 enum 값
- 필수·선택 필드와 `null` 허용 여부
- HTTP 오류 형식과 상태 코드
- `generatedAt`의 ISO 8601 형식과 시간대
- Spring CORS 허용 주소: 로컬 개발 URL과 Vercel 배포 URL

현재 목적지 검색은 `bootstrap.json`을 브라우저에서 필터링한다. 검색 API가 확정되면 `busApi.searchDestinations`를 추가하고 컴포넌트는 그 함수만 호출하도록 바꾼다.

Swagger가 확정되면 이 문서와 `src/mocks`를 먼저 맞춘 뒤 `VITE_API_MODE=server`로 전환한다.
