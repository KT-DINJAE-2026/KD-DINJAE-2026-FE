# Figma 화면 자료

정류장 QR로 출발지를 확인한 뒤 목적지, 하차 정류장, 탑승할 버스를 차례로 정하는 흐름입니다. React 프로토타입과 같은 내용으로 맞춰 두었으며 각 SVG는 Figma에 바로 가져올 수 있습니다.

버스 선택은 필수 단계가 아닙니다. 기본 흐름은 목적지를 먼저 찾고, 이미 탈 버스를 알고 있는 사용자만 보조 화면에서 버스를 먼저 고릅니다.

## 파일 구성

| 파일 | 화면 |
| --- | --- |
| `00-user-flow.svg` | 기본 흐름, 버스 우선 선택, 데이터 부족 분기 |
| `01-destination.svg` | QR 출발지와 목적지 입력 |
| `01-bus-select.svg` | 곧 도착할 버스 중 하나를 먼저 선택 |
| `01-destination-preferred.svg` | 먼저 고른 버스가 반영된 목적지 입력 |
| `02-alighting.svg` | 거리 사진과 도보 거리로 하차 정류장 확인 |
| `03-analyzing.svg` | 도착 버스와 구간별 탑승 인원 분석 |
| `04-compare.svg` | 입석 부담이 적은 순서로 비교 |
| `04-compare-fast.svg` | 빠른 도착 순서로 비교 |
| `04-compare-unavailable.svg` | 혼잡도 데이터가 부족한 경우 |
| `05-detail.svg` | 1112번의 구간별 예상 |
| `05-detail-fast.svg` | 95번의 구간별 예상 |
| `06-selected-comfort.svg` | 1112번 선택 완료 |
| `06-selected-fast.svg` | 95번 선택 완료 |

`index.html`은 모든 화면을 한 페이지에서 확인하는 용도입니다. `contact-sheet.png`는 회의 자료나 Discord 공유에 쓰기 편하도록 한 장으로 정리한 이미지입니다.

## Figma에 가져오기

1. Figma에 `00 User Flow`와 `01 Core Screens` 페이지를 만듭니다.
2. `00-user-flow.svg`는 첫 페이지로 가져옵니다.
3. 나머지 SVG는 `01 Core Screens`에 가져온 뒤 각각 `390 × 844` 프레임으로 감쌉니다.
4. 정류장 표시, 버스 카드, 상태 표시, 하단 버튼을 컴포넌트로 묶습니다.
5. 아래 연결표에 맞춰 Prototype 탭에서 클릭 동작을 연결합니다.

## 화면 연결

```text
기본 흐름
01-destination
  목적지 선택/찾기 → 02-alighting
02-alighting
  여기서 내려요 → 03-analyzing
03-analyzing
  분석 완료 → 04-compare
04-compare
  빠른 도착 → 04-compare-fast
  1112번 → 05-detail
05-detail
  1112번 선택하기 → 06-selected-comfort

버스를 먼저 고르는 흐름
01-destination
  탈 버스를 이미 알고 있어요 → 01-bus-select
01-bus-select
  1112번 → 01-destination-preferred
01-destination-preferred
  목적지 선택/찾기 → 02-alighting
  해제 → 01-destination
  다른 버스 고르기 → 01-bus-select

비교와 예외
04-compare-fast
  덜 붐비는 버스 → 04-compare
  95번 → 05-detail-fast
05-detail-fast
  95번 선택하기 → 06-selected-fast
04-compare-unavailable
  혼잡도 비교는 비활성화
  101번 → 빠른 도착 상세 또는 선택 완료
06-selected-*
  다른 버스 보기 → 직전 비교 화면
  새 목적지 찾기 → 01-destination
```

화면 전환은 `Instant`로 두고 분석 화면만 약 800ms 뒤 비교 화면으로 넘어가게 설정합니다. 고령 사용자가 내용을 읽는 중 화면이 흐려지지 않도록 불투명도 애니메이션은 사용하지 않습니다.

## 표현 기준

- `빠른 도착`은 버스가 올 때까지의 시간과 승차 후 이동시간을 합쳐 비교합니다.
- `덜 붐비는 버스`는 이동 중 입석 부담이 예상되는 시간이 짧은 순서입니다.
- 분석 과정에는 `재차인원` 대신 `탑승 인원`을 사용합니다.
- 결과는 `입석 부담 예상 시간`과 `여유·보통·혼잡` 단계를 함께 보여줍니다.
- `여유`는 앉을 가능성이 상대적으로 높은 단계이며 좌석을 보장하지 않습니다.
- 예측 데이터가 부족해도 도착 정보가 있으면 빠른 버스는 계속 안내합니다.

주요 동작에는 주황색 `#B8560A`를 사용합니다. 초록색과 빨간색은 각각 입석 부담이 낮거나 높은 상태에만 사용해 의미가 섞이지 않게 했습니다.

하차 정류장 화면의 거리 사진은 위치 확인 흐름을 보여주기 위한 프로토타입용 예시 이미지입니다. 실제 서비스에서는 지도 또는 로드뷰 사업자의 API와 사용 조건을 확인한 뒤 교체해야 합니다.

## 다시 생성하기

화면을 수정할 때는 생성 스크립트를 고친 뒤 저장소 루트에서 실행합니다.

```bash
node design/figma-import/generate.mjs
```

생성된 SVG를 직접 수정하면 다음 실행 때 덮어써집니다.
