# Figma 화면 자료

정류장 QR로 출발지를 확인한 뒤 장소 또는 정류장을 검색하고, 실제로 내릴 정류장을 확인한 다음 버스를 비교하는 흐름입니다. 각 SVG는 Figma에 바로 가져올 수 있습니다.

## 파일 구성

| 파일 | 화면 |
| --- | --- |
| `00-user-flow.svg` | 기본 흐름과 사진·데이터 부족 분기 |
| `01-destination-search.svg` | 장소·정류장 통합 검색 |
| `02-nearby-stops.svg` | 출발지에서 바로 갈 수 있는 주변 정류장 |
| `03-stop-confirm.svg` | 정류장 모습·방향 확인 |
| `03-stop-confirm-map.svg` | 정류장 사진이 없을 때 지도 대체 |
| `04-analyzing.svg` | 운행 버스와 구간별 탑승 인원 분석 |
| `05-compare.svg` | 앉기 편한 시간과 빠른 도착 비교 |
| `05-compare-unavailable.svg` | 혼잡도 데이터가 부족한 비교 화면 |
| `06-detail.svg` | 입석 부담이 낮은 버스의 구간별 예상 |
| `06-detail-fast.svg` | 빠르지만 입석 부담이 높은 버스 상세 |
| `06-detail-unavailable.svg` | 혼잡도 없이 도착 정보만 제공하는 상세 |

`index.html`은 전체 화면 확인용이고, `contact-sheet.png`는 회의나 Discord 공유용입니다.

## Figma에 가져오기

1. Figma에 `00 User Flow`와 `01 Core Screens` 페이지를 만듭니다.
2. `00-user-flow.svg`는 첫 페이지로 가져옵니다.
3. 나머지 SVG는 `01 Core Screens`에 가져온 뒤 `390 × 844` 프레임으로 감쌉니다.
4. 검색 결과, 정류장 후보, 사진·지도 탭, 버스 카드, 상태 표시를 각각 컴포넌트로 묶습니다.
5. 아래 표대로 Prototype 탭의 클릭 동작을 연결합니다.

## 화면 연결

```text
01-destination-search
  장소 보문역 → 02-nearby-stops
  정류장 직접 선택 → 03-stop-confirm

02-nearby-stops
  보문역 2번 출구 → 03-stop-confirm
  보문동 주민센터 → 03-stop-confirm-map

03-stop-confirm / 03-stop-confirm-map
  이 정류장으로 가기 → 04-analyzing
  다른 주변 정류장 보기 → 02-nearby-stops

04-analyzing
  약 800ms 뒤 → 05-compare

05-compare
  1112번 → 06-detail
  95번 → 06-detail-fast

05-compare-unavailable
  101번 → 06-detail-unavailable
```

화면 전환은 `Instant`로 두고 분석 화면만 약 800ms 뒤 자동 전환합니다. 내용을 읽는 중 화면이 흐려지지 않도록 불투명도 애니메이션은 사용하지 않습니다.

## 표현 기준

- 검색 결과는 `장소`와 `정류장`을 글자로 구분합니다.
- 장소를 선택했을 때는 현재 출발지에서 환승 없이 갈 수 있는 정류장만 거리순으로 보여줍니다.
- 정류장 직접 선택도 사진·방향 확인 화면을 거칩니다.
- 사진이 없으면 지도, 운행 방향, 랜드마크로 대체합니다.
- 비교 기준을 고르는 토글 없이 카드에 `입석 부담 적음`, `빠른 도착` 표시를 붙입니다.
- `앉기 편한 시간`은 `여유` 예상 구간의 합이며 좌석을 보장하지 않습니다.
- 예측 데이터가 부족하면 혼잡 정보를 숨기고 빠른 도착순으로 보여줍니다.
- `재차인원` 대신 `탑승 인원`을 사용합니다.
- 화면 글자는 최소 18px, 일반 본문은 20px, 핵심 수치는 22px 이상을 기본으로 합니다.
- 작은 화면에서도 글자를 줄이지 않고 정보를 세로로 재배치합니다.
- 주황색 `#B8560A`는 주요 동작, 초록색과 빨간색은 입석 부담 상태에만 사용합니다.

## 다시 생성하기

```bash
node design/figma-import/generate.mjs
```

생성된 SVG를 직접 고치면 다음 실행 때 덮어써집니다. 화면 변경은 `generate.mjs`에서 수정합니다.
