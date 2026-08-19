import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BusFront,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Hash,
  House,
  Info,
  Landmark,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Search,
  Signpost,
} from "lucide-react";
import { busApi } from "./api/busApi.js";
import KakaoRoadview from "./components/KakaoRoadview.jsx";

const DEFAULT_STOP_ID = "107000087";
const MAX_RECENT_DESTINATIONS = 5;

const STANDING_BURDEN_META = {
  LOW: { label: "낮음", tone: "comfortable" },
  MEDIUM: { label: "보통", tone: "moderate" },
  HIGH: { label: "높음", tone: "crowded" },
};

const CONGESTION_META = {
  RELAXED: { label: "여유", tone: "comfortable" },
  NORMAL: { label: "보통", tone: "moderate" },
  CROWDED: { label: "혼잡", tone: "crowded" },
  VERY_CROWDED: { label: "매우 혼잡", tone: "crowded" },
};

const DETAIL_GUIDANCE = {
  LOW: "여유 예상 구간을 더한 시간이에요. 실제 좌석을 보장하지는 않아요.",
  MEDIUM: "여유 예상 구간만 더한 시간이에요. 보통 구간에서는 좌석 이용이 어려울 수 있어요.",
  HIGH: "여유 예상 구간만 더한 시간이에요. 혼잡 구간에서는 좌석 이용이 어려울 수 있어요.",
};

const CONGESTION_DESCRIPTION = {
  RELAXED: "비교적 여유롭게 이동할 수 있어요.",
  NORMAL: "일반적인 혼잡도가 예상돼요.",
  CROWDED: "입석 이용이 예상돼요.",
  VERY_CROWDED: "사람들과 몸이 닿을 수 있어요.",
};

const CONFIDENCE_LABEL = {
  HIGH: "높은 신뢰도",
  MEDIUM: "보통 신뢰도",
  LOW: "낮은 신뢰도",
  UNAVAILABLE: "예측 불가",
};

function getRouteSummary(route, hasPrediction) {
  if (!hasPrediction) return `${route.arrivalMinutes}분 후 도착해요.`;
  if (route.standingBurdenLevel === "LOW") return "입석 부담이 적은 버스예요.";
  if (route.standingBurdenLevel === "HIGH") return "혼잡한 구간이 예상돼요.";
  return "보통 수준의 입석 부담이 예상돼요.";
}

function getRequestedScreen() {
  return new URLSearchParams(window.location.search).get("screen");
}

function getRequestedStopId() {
  return new URLSearchParams(window.location.search).get("stopId") ?? DEFAULT_STOP_ID;
}

function getRecentDestinationKey(originStopId) {
  return `movegap:recent-destinations:${originStopId}`;
}

function readRecentDestinations(originStopId) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(getRecentDestinationKey(originStopId)) ?? "[]");
    return Array.isArray(stored)
      ? stored.filter((stop) => stop?.stopId && stop.stopId !== originStopId).slice(0, MAX_RECENT_DESTINATIONS)
      : [];
  } catch {
    return [];
  }
}

function saveRecentDestinations(originStopId, destinations) {
  try {
    window.localStorage.setItem(getRecentDestinationKey(originStopId), JSON.stringify(destinations));
  } catch {
    // 저장 공간이 차단되어도 현재 탐색 흐름은 그대로 진행한다.
  }
}

function withPrediction(destination, prediction) {
  const hasPrediction = prediction.status === "SUCCESS";
  return {
    ...destination,
    hasPrediction,
    predictionStatus: prediction.status,
    reasonCode: prediction.reasonCode,
    generatedAt: prediction.generatedAt,
    predictionBasis: {
      ...prediction.predictionBasis,
      description: CONFIDENCE_LABEL[prediction.predictionBasis?.confidence] ?? "예측 정보",
    },
    routes: prediction.routes.map((route) => {
      const burdenMeta = STANDING_BURDEN_META[route.standingBurdenLevel];
      const seatFriendlyMinutes = route.segments?.reduce(
        (minutes, segment) => minutes + (segment.congestionLevel === "RELAXED" ? segment.durationMinutes : 0),
        0,
      );
      return {
        ...route,
        summaryMessage: getRouteSummary(route, hasPrediction),
        burdenLabel: burdenMeta?.label,
        tone: burdenMeta?.tone,
        seatFriendlyMinutes,
        segments: route.segments?.map((segment) => {
          const congestionMeta = CONGESTION_META[segment.congestionLevel];
          return {
            ...segment,
            description: CONGESTION_DESCRIPTION[segment.congestionLevel] ?? "혼잡도 정보를 확인해주세요.",
            congestionLabel: congestionMeta?.label ?? segment.congestionLevel,
            tone: congestionMeta?.tone ?? "moderate",
          };
        }),
      };
    }),
  };
}

const getTotalMinutes = (route) => route.arrivalMinutes + route.travelMinutes;
const getStopDisplayName = (stop) => stop?.displayName ?? stop?.stopName ?? "";

function sortRoutes(routes, predictionAvailable) {
  const result = [...routes];
  if (predictionAvailable) {
    const byComfort = result.sort(
      (a, b) => a.standingBurdenMinutes - b.standingBurdenMinutes || getTotalMinutes(a) - getTotalMinutes(b),
    );
    const fastest = [...routes].sort(
      (a, b) => getTotalMinutes(a) - getTotalMinutes(b) || a.arrivalMinutes - b.arrivalMinutes,
    )[0];
    return [
      byComfort[0],
      ...(fastest.tripId === byComfort[0].tripId ? [] : [fastest]),
      ...byComfort.filter((route) => route.tripId !== byComfort[0].tripId && route.tripId !== fastest.tripId),
    ];
  }
  return result.sort(
    (a, b) => getTotalMinutes(a) - getTotalMinutes(b) || a.arrivalMinutes - b.arrivalMinutes,
  );
}

function InfoBand({ tone = "info", icon: Icon = Info, children }) {
  return (
    <div className={`info-band info-band--${tone}`}>
      <Icon className="info-band__icon" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

function BackHeader({ title, onBack, onHome }) {
  return (
    <header className="top-bar">
      <button className="icon-button" type="button" onClick={onBack} aria-label="뒤로 가기" title="뒤로 가기">
        <ArrowLeft aria-hidden="true" />
      </button>
      <span className="top-bar__title">{title}</span>
      {onHome && (
        <button
          className="icon-button"
          type="button"
          onClick={onHome}
          aria-label="목적지 검색으로 돌아가기"
          title="목적지 검색으로 돌아가기"
        >
          <House aria-hidden="true" />
        </button>
      )}
    </header>
  );
}

function CurrentStopBadge({ currentStop }) {
  const stopDisplayName = getStopDisplayName(currentStop);

  return (
    <div className="stop-badge" aria-label={`현재 출발지 ${stopDisplayName}, 정류장 번호 ${currentStop.arsId}, ${currentStop.directionDescription}`}>
      <span className="stop-badge__dot" aria-hidden="true" />
      <span>
        <strong>{stopDisplayName}</strong>
        <small>{currentStop.directionDescription} · 정류장 {currentStop.arsId}</small>
      </span>
    </div>
  );
}

function StatusScreen({ error = false }) {
  return (
    <main className="screen screen--centered status-screen" aria-live="polite">
      <div className={`analysis-visual ${error ? "is-error" : ""}`}>
        {error ? <AlertTriangle aria-hidden="true" /> : <LoaderCircle aria-hidden="true" />}
      </div>
      <section className="analysis-heading">
        <h1>{error ? "정보를 불러오지 못했어요" : "정류장 정보를 불러오고 있어요"}</h1>
        <p>{error ? "잠시 후 다시 시도해주세요." : "잠시만 기다려주세요."}</p>
      </section>
      {error && (
        <div className="screen-bottom">
          <button className="primary-button" type="button" onClick={() => window.location.reload()}>다시 시도하기</button>
        </div>
      )}
    </main>
  );
}

function DestinationScreen({
  currentStop,
  destinationStops,
  hasRecentDestinations,
  onSelectDestinationStop,
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState(destinationStops);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const inputRef = useRef(null);
  const searchRequestRef = useRef(0);

  useEffect(() => {
    const keyword = query.trim();
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;

    if (!keyword) {
      setMatches(destinationStops);
      setIsSearching(false);
      return undefined;
    }

    setIsSearching(true);
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await busApi.searchDestinationStops({
          originStopId: currentStop.stopId,
          query: keyword,
        });
        if (searchRequestRef.current !== requestId) return;
        setMatches(response.destinationStops ?? []);
        setSearchMessage("");
      } catch {
        if (searchRequestRef.current !== requestId) return;
        setMatches([]);
        setSearchMessage("검색 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
      } finally {
        if (searchRequestRef.current === requestId) setIsSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [currentStop.stopId, destinationStops, query]);

  const submitSearch = (event) => {
    event.preventDefault();
    if (!query.trim()) {
      setSearchMessage("도착 정류장을 먼저 입력해주세요.");
      inputRef.current?.focus();
      return;
    }
    if (isSearching) {
      setSearchMessage("검색 중이에요. 잠시만 기다려주세요.");
      return;
    }
    if (matches.length === 1) {
      onSelectDestinationStop(matches[0]);
      return;
    }
    if (matches.length > 1) {
      setSearchMessage("검색 결과에서 도착 정류장을 선택해주세요.");
      return;
    }
    setSearchMessage("일치하는 정류장이 없어요. 다른 이름으로 검색해주세요.");
    inputRef.current?.focus();
  };

  return (
    <main className="screen screen--destination" aria-labelledby="destination-title">
      <CurrentStopBadge currentStop={currentStop} />
      <section className="screen-heading">
        <h1 id="destination-title">어느 정류장까지<br />가세요?</h1>
        <p>도착할 정류장 이름을 입력해주세요.</p>
      </section>

      <form id="destination-form" className="search-form" onSubmit={submitSearch}>
        <Search aria-hidden="true" />
        <label className="sr-only" htmlFor="destination-search">도착 정류장 검색</label>
        <input
          id="destination-search"
          ref={inputRef}
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            if (nextQuery.trim()) {
              setMatches([]);
              setIsSearching(true);
            }
            setSearchMessage("");
          }}
          placeholder="예: 보문역 2번 출구"
          autoComplete="off"
        />
      </form>
      <p className="search-message" aria-live="polite">{searchMessage}</p>

      <section className="place-section" aria-labelledby="place-title">
        <h2 id="place-title">
          {query ? "검색 결과" : hasRecentDestinations ? "최근 도착 정류장" : "추천 도착 정류장"}
        </h2>
        <div className="place-list">
          {matches.map((destinationStop) => (
            <button
              className="place-row"
              type="button"
              key={destinationStop.stopId}
              onClick={() => onSelectDestinationStop(destinationStop)}
            >
              <span className="place-row__icon"><MapPin aria-hidden="true" /></span>
              <span className="place-row__copy">
                <strong>{getStopDisplayName(destinationStop)}</strong>
                <small>정류장 {destinationStop.arsId} · {destinationStop.directionDescription}</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
          {isSearching && <div className="empty-result">정류장을 검색하고 있어요.</div>}
          {!isSearching && !matches.length && <div className="empty-result">일치하는 정류장이 없어요.</div>}
        </div>
      </section>

      <div className="screen-bottom destination-bottom">
        <button className="primary-button" type="submit" form="destination-form">도착 정류장 찾기</button>
      </div>
    </main>
  );
}

function StopConfirmationScreen({
  currentStop,
  destinationStop,
  onBack,
  onConfirm,
}) {
  const directRouteCount = destinationStop.servedRoutes?.length ?? 0;
  const destinationDisplayName = getStopDisplayName(destinationStop);
  const currentStopDisplayName = getStopDisplayName(currentStop);

  return (
    <main className="screen screen--confirm" aria-labelledby="confirm-title">
      <BackHeader title="도착 정류장 확인" onBack={onBack} />
      <section className="screen-heading screen-heading--confirm">
        <h1 id="confirm-title">이 정류장이<br />맞나요?</h1>
        <p>정류장 모습과 방향을 확인해주세요.</p>
      </section>

      <KakaoRoadview
        location={destinationStop.location}
        fallback={destinationStop.roadviewFallback}
        stopName={destinationDisplayName}
      />

      <section className="stop-confirmation" aria-label="선택한 도착 정류장 정보">
        <h2>{destinationDisplayName}</h2>
        <dl>
          <div>
            <dt><Hash aria-hidden="true" />정류장 번호</dt>
            <dd>{destinationStop.arsId}</dd>
          </div>
          <div>
            <dt><Signpost aria-hidden="true" />가는 방향</dt>
            <dd>{destinationStop.directionDescription}</dd>
          </div>
          {destinationStop.landmark && <div>
            <dt><Landmark aria-hidden="true" />가까운 곳</dt>
            <dd>{destinationStop.landmark}</dd>
          </div>}
        </dl>
      </section>

      <InfoBand icon={BusFront}>
        <strong>{currentStopDisplayName}에서 바로 가는 버스 {directRouteCount}개</strong>
      </InfoBand>

      <div className="screen-bottom confirm-bottom">
        <button className="primary-button" type="button" onClick={onConfirm}>이 정류장이 맞아요</button>
        <button className="text-button" type="button" onClick={onBack}>다시 찾기</button>
      </div>
    </main>
  );
}

function AnalyzingScreen({ currentStop, destinationStop, onBack }) {
  return (
    <main className="screen screen--centered" aria-labelledby="analyzing-title">
      <BackHeader title={getStopDisplayName(destinationStop)} onBack={onBack} />
      <div className="analysis-visual"><LoaderCircle aria-hidden="true" /></div>
      <section className="analysis-heading">
        <h1 id="analyzing-title">두 정류장을 잇는 버스를<br />비교하고 있어요</h1>
        <p>{getStopDisplayName(currentStop)}에서 출발해요.</p>
      </section>
      <ol className="progress-list">
        <li className="is-complete"><span><Check aria-hidden="true" /></span>두 정류장 운행 버스 확인</li>
        <li className="is-active"><span><Circle aria-hidden="true" /></span>구간별 탑승 인원 예측</li>
        <li><span><Circle aria-hidden="true" /></span>앉기 편한 시간과 도착시간 비교</li>
      </ol>
      <p className="fine-print analysis-footnote">과거 승하차 패턴과 현재 운행 정보를 함께 사용해요.</p>
    </main>
  );
}

function NoDirectRouteScreen({ destinationStop, onBack }) {
  return (
    <main className="screen screen--centered" aria-labelledby="no-direct-route-title">
      <BackHeader title={getStopDisplayName(destinationStop)} onBack={onBack} />
      <div className="analysis-visual"><BusFront aria-hidden="true" /></div>
      <section className="analysis-heading">
        <h1 id="no-direct-route-title">한 번에 가는 버스가<br />없어요</h1>
        <p>현재 출발 정류장에서<br />환승 없이 갈 수 있는 버스를 찾지 못했어요.</p>
      </section>
      <InfoBand>
        <strong>다른 도착 정류장을 검색하면</strong>
        <span>직통 버스를 다시 확인할 수 있어요.</span>
      </InfoBand>
      <div className="screen-bottom">
        <button className="primary-button" type="button" onClick={onBack}>다른 정류장 찾기</button>
        <p className="fine-print">환승 경로는 현재 제공하지 않아요.</p>
      </div>
    </main>
  );
}

function BusOption({ route, isComfortBest, isFastest, predictionAvailable, onClick }) {
  const isRecommended = isComfortBest || isFastest;
  const total = getTotalMinutes(route);

  return (
    <button className={`bus-option ${isRecommended ? "is-recommended" : ""}`} type="button" onClick={onClick}>
      <span className="bus-option__header">
        <strong>{route.routeNumber}번</strong>
        <span className="bus-option__badges">
          {isComfortBest && <span className="status-badge status-badge--comfortable">입석 부담 적음</span>}
          {isFastest && <span className="status-badge status-badge--fast">빠른 도착</span>}
        </span>
      </span>
      <span className="route-meta">{route.direction} · {route.vehicleType}</span>
      <span className="bus-metrics">
        <span><small>버스 도착</small><strong className="metric-primary">{route.arrivalMinutes}분 후</strong></span>
        <span><small>전체 소요</small><strong>약 {total}분</strong></span>
        <span>
          <small>{predictionAvailable ? "앉기 편한 시간" : "좌석 정보"}</small>
          <strong className={predictionAvailable ? "comfortable" : ""}>
            {predictionAvailable ? `약 ${route.seatFriendlyMinutes}분` : "확인 어려움"}
          </strong>
        </span>
      </span>
      <span className="bus-option__footer">
        <span>{route.summaryMessage}</span>
        <ChevronRight aria-hidden="true" />
      </span>
    </button>
  );
}

function CompareScreen({ destinationStop, onBack, onHome, onRoute }) {
  const routes = useMemo(
    () => sortRoutes(destinationStop.routes, destinationStop.hasPrediction),
    [destinationStop],
  );
  const noRealtimeArrivals = routes.length === 0;
  const comfortable = destinationStop.hasPrediction ? routes[0] : null;
  const fastest = noRealtimeArrivals
    ? null
    : [...destinationStop.routes].sort(
        (a, b) => getTotalMinutes(a) - getTotalMinutes(b) || a.arrivalMinutes - b.arrivalMinutes,
      )[0];
  const comfortDelay = comfortable ? getTotalMinutes(comfortable) - getTotalMinutes(fastest) : 0;
  const extraSeatFriendlyMinutes = comfortable
    ? comfortable.seatFriendlyMinutes - fastest.seatFriendlyMinutes
    : 0;

  return (
    <main className="screen" aria-labelledby="compare-title">
      <BackHeader title={getStopDisplayName(destinationStop)} onBack={onBack} onHome={onHome} />
      <section className="screen-heading screen-heading--compare">
        <h1 id="compare-title">어떤 버스가<br />더 나을까요?</h1>
        <p>
          {noRealtimeArrivals
            ? "지금 도착 예정인 버스 정보가 없어요."
            : `도착 예정 버스 ${routes.length}대를 비교했어요.`}
        </p>
      </section>

      {noRealtimeArrivals ? (
        <InfoBand tone="info" icon={Clock3}>
          <strong>실시간 도착 정보가 없어요</strong>
          <span>심야 시간대이거나 운행이 종료됐을 수 있어요.</span>
        </InfoBand>
      ) : destinationStop.hasPrediction ? (
        <InfoBand>
          <strong>
            {comfortable.tripId === fastest.tripId
              ? `${comfortable.routeNumber}번이 빠르고 앉아서 갈 가능성도 높아요.`
              : `${comfortable.routeNumber}번은 ${comfortDelay}분 늦지만`}
          </strong>
          {comfortable.tripId !== fastest.tripId && <span>앉기 편한 시간이 약 {extraSeatFriendlyMinutes}분 더 길어요.</span>}
          <span>여유 예상 구간을 더한 값이며, 좌석을 보장하지 않아요.</span>
        </InfoBand>
      ) : (
        <InfoBand tone="warning" icon={AlertTriangle}>
          <strong>아직 데이터가 부족해</strong>
          <span>혼잡도는 예측하기 어려워요.</span>
          <span>빠른 도착순으로 보여드릴게요.</span>
        </InfoBand>
      )}

      {!noRealtimeArrivals && (
        <section className="bus-list" aria-label="버스 비교 결과">
          {routes.map((route) => (
            <BusOption
              key={route.tripId}
              route={route}
              isComfortBest={comfortable?.tripId === route.tripId}
              isFastest={fastest.tripId === route.tripId}
              predictionAvailable={destinationStop.hasPrediction}
              onClick={() => onRoute(route.tripId)}
            />
          ))}
        </section>
      )}

      <div className="compare-note">
        {noRealtimeArrivals ? (
          <RefreshCw aria-hidden="true" />
        ) : destinationStop.hasPrediction ? (
          <Clock3 aria-hidden="true" />
        ) : (
          <RefreshCw aria-hidden="true" />
        )}
        <span>
          {noRealtimeArrivals
            ? "운행 시간대에 다시 확인해 주세요."
            : destinationStop.hasPrediction
              ? `예측 기준 · ${destinationStop.predictionBasis.description}`
              : "혼잡도 데이터가 생기면 자동으로 갱신해요."}
        </span>
      </div>
      <p className="fine-print compare-footnote">도착 및 혼잡 예측은 실제 운행 상황에 따라 달라질 수 있어요.</p>
    </main>
  );
}

function DetailScreen({ destinationStop, route, onBack, onHome }) {
  const predictionAvailable = Boolean(destinationStop.hasPrediction && route.segments?.length);
  const bannerTone = predictionAvailable ? route.tone : "fast";
  const total = getTotalMinutes(route);

  return (
    <main className="screen" aria-labelledby="detail-title">
      <BackHeader title={getStopDisplayName(destinationStop)} onBack={onBack} onHome={onHome} />
      <section className="route-title">
        <h1 id="detail-title">{route.routeNumber}번</h1>
        <p>{route.direction} · {route.vehicleType}</p>
      </section>

      <section className={`route-summary route-summary--${bannerTone}`}>
        <span className={`status-badge status-badge--${bannerTone}`}>
          {predictionAvailable ? `입석 부담 ${route.burdenLabel}` : "빠른 도착"}
        </span>
        <h2>{predictionAvailable ? route.summaryMessage : `${route.arrivalMinutes}분 후 도착해요.`}</h2>
      </section>

      <section className="journey-metrics" aria-label="여정 요약">
        <div><small>버스 도착</small><strong>{route.arrivalMinutes}분 후</strong></div>
        <div><small>버스 이동</small><strong>약 {route.travelMinutes}분</strong></div>
        <div><small>전체 소요</small><strong>약 {total}분</strong></div>
        <div><small>{predictionAvailable ? "앉기 편한 시간" : "좌석 정보"}</small><strong className={predictionAvailable ? "comfortable" : ""}>{predictionAvailable ? `약 ${route.seatFriendlyMinutes}분` : "확인 어려움"}</strong></div>
      </section>

      {predictionAvailable ? (
        <>
          <InfoBand tone={route.standingBurdenLevel === "HIGH" ? "warning" : "info"}>
            {DETAIL_GUIDANCE[route.standingBurdenLevel]}
          </InfoBand>
          <section className="segment-section" aria-labelledby="segment-title">
            <h2 id="segment-title">구간별 예상</h2>
            <ol className="segment-list">
              {route.segments.map((segment) => (
                <li key={`${segment.fromStopId}-${segment.toStopId}`} className={`segment segment--${segment.tone}`}>
                  <span className="segment__dot" aria-hidden="true" />
                  <div>
                    <strong>{segment.fromStopDisplayName ?? segment.fromStopName} → {segment.toStopDisplayName ?? segment.toStopName}</strong>
                    <p>{segment.durationMinutes}분 · {segment.description}</p>
                  </div>
                  <span className="segment__badge">{segment.congestionLabel}</span>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : (
        <InfoBand tone="warning" icon={AlertTriangle}>
          <strong>아직 데이터가 부족해 구간별 앉기 편한 시간은 보여드리기 어려워요.</strong>
        </InfoBand>
      )}

      <div className="detail-return">
        <button className="text-button" type="button" onClick={onBack}>
          {predictionAvailable ? "버스 비교로 돌아가기" : "다른 도착 버스 보기"}
        </button>
      </div>

    </main>
  );
}

export default function App() {
  const requestedScreen = useMemo(getRequestedScreen, []);
  const requestedStopId = useMemo(getRequestedStopId, []);
  const analysisRequestRef = useRef(0);
  const [screen, setScreen] = useState("loading");
  const [currentStop, setCurrentStop] = useState(null);
  const [destinationStops, setDestinationStops] = useState([]);
  const [hasRecentDestinations, setHasRecentDestinations] = useState(false);
  const [destinationStop, setDestinationStop] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [screen]);

  useEffect(() => {
    let active = true;

    async function loadBootstrap() {
      try {
        const bootstrap = await busApi.getBootstrap(requestedStopId);
        if (!active) return;
        setCurrentStop(bootstrap.currentStop);
        const recentDestinations = readRecentDestinations(bootstrap.currentStop.stopId);
        setDestinationStops(recentDestinations.length ? recentDestinations : bootstrap.destinationStops);
        setHasRecentDestinations(recentDestinations.length > 0);

        if (!["confirm", "compare", "limited", "detail"].includes(requestedScreen)) {
          setScreen("destination");
          return;
        }

        const destinationStopId = requestedScreen === "limited"
          ? "100000147"
          : "107000089";
        const baseDestinationStop = bootstrap.destinationStops.find(
          (item) => item.stopId === destinationStopId,
        );
        if (!baseDestinationStop) {
          throw new Error(`등록되지 않은 도착 정류장: ${destinationStopId}`);
        }
        setDestinationStop(baseDestinationStop);
        if (requestedScreen === "confirm") {
          setScreen("confirm");
          return;
        }

        const prediction = await busApi.getJourneyPrediction({
          originStopId: bootstrap.currentStop.stopId,
          destinationStopId: baseDestinationStop.stopId,
        });
        if (!active) return;
        const nextDestinationStop = withPrediction(baseDestinationStop, prediction);
        setDestinationStop(nextDestinationStop);
        setSelectedTripId(nextDestinationStop.routes[0]?.tripId ?? null);
        setScreen(requestedScreen === "detail" ? "detail" : "compare");
      } catch {
        if (active) setScreen("error");
      }
    }

    loadBootstrap();
    return () => {
      active = false;
    };
  }, [requestedScreen, requestedStopId]);

  const selectedRoute = destinationStop?.routes?.find((route) => route.tripId === selectedTripId)
    ?? destinationStop?.routes?.[0]
    ?? null;

  const openStopConfirmation = (nextDestinationStop) => {
    analysisRequestRef.current += 1;
    const storedDestinations = readRecentDestinations(currentStop.stopId);
    const recentDestinations = [
      nextDestinationStop,
      ...storedDestinations.filter((stop) => stop.stopId !== nextDestinationStop.stopId),
    ].slice(0, MAX_RECENT_DESTINATIONS);
    setDestinationStops(recentDestinations);
    setHasRecentDestinations(true);
    saveRecentDestinations(currentStop.stopId, recentDestinations);
    setDestinationStop(nextDestinationStop);
    setSelectedTripId(null);
    setScreen("confirm");
  };

  const analyzeJourney = async (nextDestinationStop) => {
    const requestId = analysisRequestRef.current + 1;
    analysisRequestRef.current = requestId;
    setDestinationStop(nextDestinationStop);
    setSelectedTripId(null);
    setScreen("analyzing");

    try {
      const [prediction] = await Promise.all([
        busApi.getJourneyPrediction({
          originStopId: currentStop.stopId,
          destinationStopId: nextDestinationStop.stopId,
        }),
        new Promise((resolve) => window.setTimeout(resolve, 900)),
      ]);
      if (analysisRequestRef.current !== requestId) return;
      const destinationWithPrediction = withPrediction(nextDestinationStop, prediction);
      setDestinationStop(destinationWithPrediction);
      setSelectedTripId(destinationWithPrediction.routes[0]?.tripId ?? null);
      setScreen("compare");
    } catch (error) {
      if (analysisRequestRef.current !== requestId) return;
      setScreen(error.code === "NO_DIRECT_ROUTE" ? "no-direct-route" : "error");
    }
  };

  const cancelAnalysis = () => {
    analysisRequestRef.current += 1;
    setScreen("confirm");
  };

  const returnToDestinationSearch = () => {
    analysisRequestRef.current += 1;
    setDestinationStop(null);
    setSelectedTripId(null);
    setScreen("destination");
  };

  if (screen === "loading" || screen === "error") {
    return (
      <div className="app-shell">
        <div className="phone-frame"><StatusScreen error={screen === "error"} /></div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="phone-frame">
        {screen === "destination" && currentStop && (
          <DestinationScreen
            currentStop={currentStop}
            destinationStops={destinationStops}
            hasRecentDestinations={hasRecentDestinations}
            onSelectDestinationStop={openStopConfirmation}
          />
        )}
        {screen === "confirm" && currentStop && destinationStop && (
          <StopConfirmationScreen
            currentStop={currentStop}
            destinationStop={destinationStop}
            onBack={() => setScreen("destination")}
            onConfirm={() => analyzeJourney(destinationStop)}
          />
        )}
        {screen === "analyzing" && currentStop && destinationStop && (
          <AnalyzingScreen
            currentStop={currentStop}
            destinationStop={destinationStop}
            onBack={cancelAnalysis}
          />
        )}
        {screen === "no-direct-route" && destinationStop && (
          <NoDirectRouteScreen
            destinationStop={destinationStop}
            onBack={() => setScreen("destination")}
          />
        )}
        {screen === "compare" && destinationStop && (
          <CompareScreen
            destinationStop={destinationStop}
            onBack={() => setScreen("confirm")}
            onHome={returnToDestinationSearch}
            onRoute={(tripId) => {
              setSelectedTripId(tripId);
              setScreen("detail");
            }}
          />
        )}
        {screen === "detail" && currentStop && destinationStop && selectedRoute && (
          <DetailScreen
            destinationStop={destinationStop}
            route={selectedRoute}
            onBack={() => setScreen("compare")}
            onHome={returnToDestinationSearch}
          />
        )}
      </div>
    </div>
  );
}
