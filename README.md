# 교통약자 버스 안내 FE

정류장 QR을 찍고 도착 정류장을 입력하면, 두 정류장 사이를 운행하는 버스의 도착시간과 입석 부담을 비교해 주는 React 프로토타입입니다.

한 시점의 차량 혼잡도만 보여주는 대신 출발 정류장부터 도착 정류장까지의 구간을 나눠 예측합니다. 과거 데이터가 충분하지 않을 때는 혼잡도를 임의로 채우지 않고 확인 가능한 도착 정보만 보여줍니다.

- 배포: https://kd-dinjae-2026-fe.vercel.app
- 백엔드: https://backend-827716553089.asia-northeast3.run.app
- Swagger: https://backend-827716553089.asia-northeast3.run.app/swagger-ui.html
- API 협의 문서: [`docs/API_CONTRACT_DRAFT.md`](docs/API_CONTRACT_DRAFT.md)
- Figma 화면 자료: [`design/figma-import`](design/figma-import)

## 사용자 흐름

1. 정류장에 붙은 QR의 `stopId`로 출발 정류장을 확인합니다.
2. 사용자가 도착할 버스 정류장의 이름이나 ARS 번호를 입력합니다.
3. 검색 결과에서 정류장 번호와 가는 방향을 확인합니다.
4. 카카오맵 로드뷰로 도착 정류장의 실제 위치를 한 번 더 확인합니다.
5. 두 정류장을 한 번에 잇는 도착 예정 버스를 분석합니다.
6. 버스별 전체 소요시간과 앉기 편한 예상 시간을 비교합니다.
7. 상세 화면에서 구간별 `여유`, `보통`, `혼잡` 상태를 확인합니다.

목적지는 장소나 건물이 아니라 도착할 **버스 정류장**입니다. 주변 정류장 추천, 음성 검색, 지도에서 정류장 선택, 환승 경로, 다른 정류장까지 걷는 우회 경로는 현재 범위에서 제외했습니다.

## 준비된 화면

React 데모에는 QR 정보 로딩·오류, 도착 정류장 검색, 로드뷰 확인, 여정 분석, 버스 비교, 구간별 상세 화면이 구현되어 있습니다. 예측 성공과 혼잡도 데이터 부족 시나리오를 각각 확인할 수 있습니다.

Figma 자료에는 발표와 백엔드 협의에 필요한 상태를 더 세분화했습니다.

| 구간 | 포함된 상태 |
| --- | --- |
| QR 진입 | 로딩, 요청 실패 |
| 정류장 검색 | 입력 전, 검색 결과, 검색 결과 없음 |
| 정류장 확인 | 로드뷰 로딩, 로드뷰 완료, 대체 사진 |
| 여정 분석 | 분석 중, 예측 성공, 데이터 부족, 직통 버스 없음 |
| 버스 상세 | 입석 부담 적음, 빠른 도착, 혼잡도 정보 없음 |

전체 15개 화면과 연결표는 [`design/figma-import/README.md`](design/figma-import/README.md)에 정리했습니다.

## 실행

Node.js 20 이상을 기준으로 합니다.

```bash
npm install
cp .env.example .env.local
npm run dev
```

개발 주소는 `http://localhost:5173`입니다. Mock 검증과 배포용 빌드는 아래 명령으로 실행합니다.

```bash
npm run validate:mocks
npm run build
```

`npm run build`를 실행하면 빌드 전에 Mock의 정류장 연결, 노선 ID, 구간 순서와 시간 합계를 검사합니다.

## 환경변수

```env
VITE_API_MODE=mock
VITE_API_BASE_URL=http://localhost:8080
VITE_KAKAO_MAP_APP_KEY=카카오_JavaScript_키
```

| 변수 | 설명 |
| --- | --- |
| `VITE_API_MODE` | `mock` 또는 `server` |
| `VITE_API_BASE_URL` | Spring API 기본 주소 |
| `VITE_KAKAO_MAP_APP_KEY` | 카카오맵 JavaScript 키 |

키는 `.env.local`과 Vercel 환경변수에서 관리하고 저장소에는 올리지 않습니다.

## 카카오맵 로드뷰

카카오 Developers 앱에서 카카오맵 사용 설정을 켜고 JavaScript 키의 SDK 도메인에 아래 주소를 등록해야 합니다.

```text
http://localhost:5173
https://kd-dinjae-2026-fe.vercel.app
```

도착 정류장의 WGS84 좌표를 `KakaoRoadview`에 전달하면 가장 가까운 로드뷰 지점을 찾습니다. 화면 상태는 다음 순서로 구분합니다.

| 상태 | 화면 처리 |
| --- | --- |
| 불러오는 중 | 사진 없이 불투명한 회색 영역과 로딩 표시만 노출 |
| 불러오기 완료 | 실제 로드뷰와 `카카오맵 로드뷰` 라벨 노출 |
| SDK·로드뷰 실패 | 등록된 대체 이미지 또는 준비 중 안내 노출 |

로딩 중에는 대체 사진과 `정류장 모습 예시` 문구를 미리 보여주지 않습니다. 실제 실패가 확인된 뒤에만 대체 상태로 바뀝니다.

## Mock JSON

화면은 JSON 파일을 직접 읽지 않고 `src/api/busApi.js`를 통해 데이터를 받습니다.

```text
React 화면
  └─ busApi
      ├─ mock 모드   → src/mocks/*.json
      └─ server 모드 → Spring API
```

현재 사용하는 함수는 세 개입니다.

```js
busApi.getBootstrap(stopId)
busApi.searchDestinationStops({ originStopId, query })
busApi.getJourneyPrediction({ originStopId, destinationStopId })
```

| Mock 파일 | 대신하는 요청 | 담긴 내용 |
| --- | --- | --- |
| `src/mocks/bootstrap.json` | `GET /api/v1/stops/{stopId}/context` | QR 출발 정류장, 검색용 도착 정류장, 좌표 |
| `src/mocks/predictions/bomun.json` | `POST /api/v1/journeys/predictions` | 혼잡도 예측 성공 응답 |
| `src/mocks/predictions/sinseoldong.json` | `POST /api/v1/journeys/predictions` | 과거 데이터 부족 응답 |

Mock 모드에서는 `bootstrap.json`을 브라우저에서 필터링하고, 현재 Vercel의 server 모드에서는 `GET /api/v1/stops/search`를 호출합니다. 검색 결과의 `servedRoutes: []`는 검색 실패가 아니라 해당 출발지에서 직통 노선이 없다는 뜻이며, 화면에 `직통 노선 없음`으로 표시합니다.

### 데모 정류장

| 구분 | 정류장 | ID / ARS | 데모 상태 |
| --- | --- | --- | --- |
| 출발 | 성북구청·성북경찰서 | `107000087` / `08177` | QR 진입 정류장 |
| 도착 | 보문역 2번 출구 | `107000089` / `08179` | 혼잡도 예측 성공 |
| 도착 | 신설동역 오거리 | `100000147` / `01243` | 혼잡도 데이터 부족 |

보문역 2번 출구의 데모 노선은 1014, 152, 103, 142번이고 신설동역 오거리의 데모 노선은 1014, 152, 103번입니다.

정류장 ID, ARS 번호, 정류장명, 좌표와 노선 경유 순서는 서울시 공개 자료를 기준으로 확인했습니다.

- [서울시 버스정류소 위치정보](https://data.seoul.go.kr/dataList/OA-15067/S/1/datasetView.do)
- [서울시 버스 노선별 정류소 정보](https://data.seoul.go.kr/dataList/OA-1095/L/1/datasetView.do)

버스 도착시간, 이동시간, 차량 종류, 탑승 인원, 혼잡도, 예측 신뢰도와 안내 문구는 화면 테스트를 위한 Mock 값입니다. 이 구분은 각 JSON의 `dataSource`에도 기록했습니다.

## 시간 계산

```text
전체 소요시간 = arrivalMinutes + travelMinutes
앉기 편한 시간 = RELAXED 구간의 durationMinutes 합계
입석 부담 시간 = NORMAL 이상 구간의 durationMinutes 합계
```

`앉기 편한 시간`은 여유로 예측된 구간을 더한 값입니다. 빈 좌석이나 실제 착석을 보장한다는 뜻은 아닙니다. 모든 구간의 `durationMinutes` 합은 반드시 `travelMinutes`와 같아야 합니다.

## 배포된 Spring API 연결

Vercel은 아래 환경변수로 GCP Cloud Run의 Spring API와 연결되어 있습니다.

```env
VITE_API_MODE=server
VITE_API_BASE_URL=https://backend-827716553089.asia-northeast3.run.app
```

로컬 Spring 서버를 사용할 때만 `VITE_API_BASE_URL=http://localhost:8080`으로 바꿉니다. Cloud Run과 로컬 서버 모두 `http://localhost:5173` 및 운영 Vercel Origin을 허용합니다.

Mock과 Spring 응답은 같은 필드 구조를 사용합니다. 현재 서버 응답은 실제 AI 예측 연동 전의 계약 검증용 데모 데이터이며 응답 스키마는 그대로 유지됩니다.

우선 맞춰야 할 요청은 다음 세 가지입니다.

| 시점 | 요청 |
| --- | --- |
| QR 진입 | `GET /api/v1/stops/{stopId}/context` |
| 도착 정류장 검색 | `GET /api/v1/stops/search?originStopId=...&query=...` |
| 정류장 확인 후 분석 | `POST /api/v1/journeys/predictions` |

혼잡도 표본이 부족한 경우는 HTTP 오류가 아니라 `200 OK`의 `INSUFFICIENT_DATA`로 구분합니다. 반대로 잘못된 정류장, 직통 버스 없음, 서버 장애는 오류 코드로 구분해 화면 상태를 결정합니다. 자세한 필드와 검증 규칙은 [`docs/API_CONTRACT_DRAFT.md`](docs/API_CONTRACT_DRAFT.md)에 있습니다.

Cloud Run이 유휴 상태라면 첫 요청에 10초 이상 걸릴 수 있습니다. API 오류에는 `traceId`가 포함되므로 문제 응답을 전달할 때 함께 공유하면 서버 로그를 추적할 수 있습니다.

## 주요 ID

| 필드 | 용도 | 예시 |
| --- | --- | --- |
| `stopId` | 서울시 정류장 고유 ID | `107000089` |
| `arsId` | 정류장 표지판의 번호 | `08179` |
| `routeId` | 서울시 노선 고유 ID | `100100129` |
| `routeNumber` | 화면에 보이는 노선 번호 | `1014번` |
| `tripId` | 현재 도착 예정인 차량 식별값 | `mock-trip-100100129-1405` |

같은 노선의 차량이 연달아 올 수 있으므로 비교 카드와 상세 화면은 `routeId`가 아니라 `tripId`로 연결합니다. `stopName`은 공공데이터 원문, `displayName`은 화면에서 읽기 좋게 다듬은 이름입니다.

## 프로젝트 구조

```text
src/
├── api/busApi.js                 Mock·Spring 요청 전환
├── components/KakaoRoadview.jsx  로드뷰 로딩·완료·실패 처리
├── lib/kakaoMaps.js              카카오 지도 SDK 로더
├── mocks/bootstrap.json          QR 진입 응답
├── mocks/predictions/            예측 성공·데이터 부족 응답
├── App.jsx                       화면 흐름과 시간 계산
├── main.jsx                      React 진입점
└── styles.css                    큰 글씨와 반응형 스타일

public/images/stop-preview/        로드뷰 대체 이미지
design/figma-import/               Figma SVG, 흐름도, 생성기
docs/API_CONTRACT_DRAFT.md         FE·백엔드 API 규격
scripts/validate-mocks.mjs         Mock 연결과 시간 검증
```

## 접근성 기준

- 일반 본문은 18px 이상, 핵심 수치와 제목은 22px 이상을 사용합니다.
- 작은 화면에서도 글자를 줄이지 않고 정보 열을 세로로 재배치합니다.
- 버튼과 입력 영역은 최소 44px 높이를 확보합니다.
- 혼잡 상태는 색상만 쓰지 않고 `여유`, `보통`, `혼잡` 문자를 함께 표시합니다.
- 주요 본문은 4.5:1 이상의 명암비를 유지합니다.
- 브라우저 글자를 200%로 확대해도 내용이 겹치지 않도록 구성합니다.

## Figma 자료 갱신

Figma 가져오기용 SVG는 생성기로 관리합니다.

```bash
node design/figma-import/generate.mjs
```

생성 후 [`design/figma-import/index.html`](design/figma-import/index.html)을 열면 흐름도와 15개 화면을 한 번에 확인할 수 있습니다. 생성된 SVG를 직접 수정하면 다음 실행 때 덮어써지므로 화면 변경은 `generate.mjs`에서 합니다.

## 연동 전에 확인할 것

- Swagger의 필드명과 enum이 Mock JSON과 같은지
- 검색 결과에 `stopId`, `arsId`, 방향, WGS84 좌표가 모두 있는지
- `tripId`가 도착 예정 차량마다 고유한지
- 구간 시간 합이 `travelMinutes`와 일치하는지
- 데이터 부족과 HTTP 오류를 서로 다른 상태로 내려주는지
- `NO_DIRECT_ROUTE`를 별도 코드로 구분하는지
- 로컬 주소와 Vercel 주소가 Spring CORS에 등록되어 있는지
