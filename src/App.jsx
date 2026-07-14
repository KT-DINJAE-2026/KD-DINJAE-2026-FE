import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BusFront,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Footprints,
  ImageIcon,
  Info,
  LoaderCircle,
  MapPin,
  Mic,
  RefreshCw,
  Search,
} from "lucide-react";
import { busApi } from "./api/busApi.js";

const DEFAULT_STOP_ID = "stop-seongbuk-office";

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
  LOW: "여유는 좌석 이용 가능성이 상대적으로 높은 단계이며 좌석을 보장하지는 않아요.",
  MEDIUM: "보통은 입석 이동이 가능하지만 좌석 이용이 어려울 수 있는 단계예요.",
  HIGH: "현재 기준에 맞는 덜 붐비는 버스를 찾지 못했어요.",
};

function getRequestedScreen() {
  return new URLSearchParams(window.location.search).get("screen");
}

function getRequestedStopId() {
  return new URLSearchParams(window.location.search).get("stopId") ?? DEFAULT_STOP_ID;
}

function withPrediction(destination, prediction) {
  return {
    ...destination,
    hasPrediction: prediction.status === "SUCCESS",
    predictionStatus: prediction.status,
    reasonCode: prediction.reasonCode,
    generatedAt: prediction.generatedAt,
    predictionBasis: prediction.predictionBasis,
    routes: prediction.routes.map((route) => {
      const burdenMeta = STANDING_BURDEN_META[route.standingBurdenLevel];
      return {
        ...route,
        burdenLabel: burdenMeta?.label,
        tone: burdenMeta?.tone,
        segments: route.segments?.map((segment) => {
          const congestionMeta = CONGESTION_META[segment.congestionLevel];
          return {
            ...segment,
            congestionLabel: congestionMeta?.label ?? segment.congestionLevel,
            tone: congestionMeta?.tone ?? "moderate",
          };
        }),
      };
    }),
  };
}

const getTotalMinutes = (route) => route.arrivalMinutes + route.travelMinutes;

const ALTERNATIVE_MAX_TOTAL_RATIO = 1.5;
const ALTERNATIVE_MAX_EXTRA_MINUTES = 15;
const ALTERNATIVE_MIN_BURDEN_SAVING_MINUTES = 3;

function findComfortAlternative(currentRoute, routes) {
  if (currentRoute.standingBurdenLevel !== "HIGH") return null;

  const currentTotalMinutes = getTotalMinutes(currentRoute);
  return routes
    .filter((candidate) => candidate.tripId !== currentRoute.tripId)
    .map((candidate) => ({
      route: candidate,
      totalMinutes: getTotalMinutes(candidate),
      burdenSavingMinutes: currentRoute.standingBurdenMinutes - candidate.standingBurdenMinutes,
    }))
    .filter(({ route, totalMinutes, burdenSavingMinutes }) => (
      Number.isFinite(route.standingBurdenMinutes)
      && burdenSavingMinutes >= ALTERNATIVE_MIN_BURDEN_SAVING_MINUTES
      && totalMinutes <= currentTotalMinutes * ALTERNATIVE_MAX_TOTAL_RATIO
      && totalMinutes - currentTotalMinutes <= ALTERNATIVE_MAX_EXTRA_MINUTES
    ))
    .sort((a, b) => (
      b.burdenSavingMinutes - a.burdenSavingMinutes
      || a.totalMinutes - b.totalMinutes
      || a.route.arrivalMinutes - b.route.arrivalMinutes
    ))[0] ?? null;
}

function sortRoutes(routes, mode, predictionAvailable) {
  const result = [...routes];
  if (mode === "comfort" && predictionAvailable) {
    return result.sort(
      (a, b) => a.standingBurdenMinutes - b.standingBurdenMinutes || getTotalMinutes(a) - getTotalMinutes(b),
    );
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

function BackHeader({ title, onBack }) {
  return (
    <header className="top-bar">
      <button className="icon-button" type="button" onClick={onBack} aria-label="뒤로 가기" title="뒤로 가기">
        <ArrowLeft aria-hidden="true" />
      </button>
      <span className="top-bar__title">{title}</span>
    </header>
  );
}

function CurrentStopBadge({ currentStop }) {
  return (
    <div className="stop-badge" aria-label={`현재 출발지 ${currentStop.stopName}, ${currentStop.directionDescription}`}>
      <span className="stop-badge__dot" aria-hidden="true" />
      <span>
        <strong>{currentStop.stopName}</strong>
        <small>{currentStop.directionDescription}</small>
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
  destinations,
  onSelectDestination,
}) {
  const [query, setQuery] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");
  const inputRef = useRef(null);

  const matches = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("ko-KR");
    if (!keyword) return destinations;
    return destinations.filter((destination) =>
      [destination.displayName, destination.nearbyDescription, ...destination.searchKeywords]
        .join(" ")
        .toLocaleLowerCase("ko-KR")
        .includes(keyword),
    );
  }, [destinations, query]);

  const submitSearch = (event) => {
    event.preventDefault();
    if (!query.trim()) {
      setVoiceMessage("목적지를 먼저 입력해주세요.");
      inputRef.current?.focus();
      return;
    }
    if (matches.length === 1) {
      onSelectDestination(matches[0]);
      return;
    }
    if (matches.length > 1) {
      setVoiceMessage("검색 결과에서 목적지를 선택해주세요.");
      return;
    }
    setVoiceMessage("일치하는 장소가 없어요. 다른 이름으로 검색해주세요.");
    inputRef.current?.focus();
  };

  const startVoiceInput = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceMessage("이 브라우저에서는 음성 입력을 지원하지 않아요.");
      inputRef.current?.focus();
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    setVoiceMessage("목적지를 듣고 있어요.");
    recognition.onresult = (event) => {
      setQuery(event.results[0][0].transcript);
      setVoiceMessage("목적지를 입력했어요.");
    };
    recognition.onerror = () => {
      setVoiceMessage("잘 듣지 못했어요. 직접 입력해주세요.");
      inputRef.current?.focus();
    };
    recognition.start();
  };

  return (
    <main className="screen screen--destination" aria-labelledby="destination-title">
      <CurrentStopBadge currentStop={currentStop} />
      <section className="screen-heading">
        <h1 id="destination-title">어디까지<br />가세요?</h1>
        <p>장소를 입력하거나 마이크 버튼을 눌러 말씀해주세요.</p>
      </section>

      <form id="destination-form" className="search-form" onSubmit={submitSearch}>
        <Search aria-hidden="true" />
        <label className="sr-only" htmlFor="destination-search">목적지 검색</label>
        <input
          id="destination-search"
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setVoiceMessage("");
          }}
          placeholder="예: 보문역 2번 출구"
          autoComplete="off"
        />
        <button type="button" className="voice-button" onClick={startVoiceInput} aria-label="음성으로 목적지 입력" title="음성으로 입력">
          <Mic aria-hidden="true" />
        </button>
      </form>
      <p className="voice-message" aria-live="polite">{voiceMessage}</p>

      <section className="place-section" aria-labelledby="place-title">
        <h2 id="place-title">{query ? "검색 결과" : "최근 목적지"}</h2>
        <div className="place-list">
          {matches.map((destination) => (
            <button
              className="place-row"
              type="button"
              key={destination.destinationId}
              onClick={() => onSelectDestination(destination)}
            >
              <span className="place-row__icon"><MapPin aria-hidden="true" /></span>
              <span className="place-row__copy">
                <strong>{destination.displayName}</strong>
                <small>{destination.category} · {destination.nearbyDescription}</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
          {!matches.length && <div className="empty-result">일치하는 목적지가 없어요.</div>}
        </div>
      </section>

      <div className="screen-bottom destination-bottom">
        <button className="primary-button" type="submit" form="destination-form">목적지 찾기</button>
      </div>
    </main>
  );
}

function AlightingScreen({
  destination,
  candidates,
  selectedCandidate,
  onBack,
  onSelectCandidate,
  onConfirm,
}) {
  const [showCandidates, setShowCandidates] = useState(false);

  return (
    <main className="screen" aria-labelledby="alighting-title">
      <BackHeader title={destination.displayName} onBack={onBack} />
      <section className="screen-heading screen-heading--compact alighting-heading">
        <h1 id="alighting-title">이 정류장에서<br />내릴까요?</h1>
        <p>목적지와 가깝고 이동하기 편한 곳을 먼저 찾았어요.</p>
      </section>

      <figure className="street-preview">
        <img src={selectedCandidate.streetImageUrl} alt={selectedCandidate.streetImageAlt} />
        <figcaption><ImageIcon aria-hidden="true" /> 거리 사진 예시</figcaption>
      </figure>

      <section className="stop-confirmation" aria-labelledby="candidate-name">
        <span className="candidate-label">추천 하차 정류장</span>
        <h2 id="candidate-name">{selectedCandidate.stopName}</h2>
        <p>{selectedCandidate.landmark}</p>
        <div className="walk-metrics">
          <span><Footprints aria-hidden="true" /><strong>도보 {selectedCandidate.walkMinutes}분</strong></span>
          <span>{selectedCandidate.walkingDistanceMeters}m</span>
        </div>
      </section>

      {candidates.length > 1 && (
        <div className="candidate-switcher">
          <button className="text-button" type="button" onClick={() => setShowCandidates((value) => !value)}>
            {showCandidates ? "후보 닫기" : "다른 정류장 보기"}
          </button>
          {showCandidates && (
            <div className="candidate-list" aria-label="다른 하차 정류장">
              {candidates.map((candidate) => (
                <button
                  type="button"
                  key={candidate.candidateId}
                  className={candidate.candidateId === selectedCandidate.candidateId ? "is-selected" : ""}
                  onClick={() => {
                    onSelectCandidate(candidate.candidateId);
                    setShowCandidates(false);
                  }}
                >
                  <span><strong>{candidate.stopName}</strong><small>{candidate.landmark}</small></span>
                  <span>도보 {candidate.walkMinutes}분</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="screen-bottom screen-bottom--actions">
        <div className="button-pair">
          <button className="secondary-button" type="button" onClick={onBack}>다시 찾기</button>
          <button className="primary-button" type="button" onClick={onConfirm}>여기서 내려요</button>
        </div>
        <p className="fine-print">거리 사진은 위치 확인을 돕는 프로토타입용 예시 이미지예요.</p>
      </div>
    </main>
  );
}

function AnalyzingScreen({ currentStop, selectedCandidate, onBack }) {
  return (
    <main className="screen screen--centered" aria-labelledby="analyzing-title">
      <BackHeader title={selectedCandidate.stopName} onBack={onBack} />
      <div className="analysis-visual"><LoaderCircle aria-hidden="true" /></div>
      <section className="analysis-heading">
        <h1 id="analyzing-title">목적지까지 갈 버스를<br />비교하고 있어요</h1>
        <p>{currentStop.stopName.replace(" 정류장", "")}에서 출발해요.</p>
      </section>
      <ol className="progress-list">
        <li className="is-complete"><span><Check aria-hidden="true" /></span>도착 예정 버스 확인</li>
        <li className="is-active"><span><Circle aria-hidden="true" /></span>구간별 탑승 인원 예측</li>
        <li><span><Circle aria-hidden="true" /></span>입석 부담과 도착시간 비교</li>
      </ol>
      <p className="fine-print analysis-footnote">과거 승하차 패턴과 현재 운행 정보를 함께 사용해요.</p>
    </main>
  );
}

function ModeControl({ mode, onChange, predictionAvailable }) {
  return (
    <div className="mode-control" role="group" aria-label="버스 정렬 기준">
      <button
        type="button"
        aria-pressed={mode === "comfort"}
        disabled={!predictionAvailable}
        className={mode === "comfort" ? "is-active" : ""}
        onClick={() => onChange("comfort")}
      >
        덜 붐비는 버스
      </button>
      <button
        type="button"
        aria-pressed={mode === "fast"}
        className={mode === "fast" ? "is-active" : ""}
        onClick={() => onChange("fast")}
      >
        빠른 도착
      </button>
    </div>
  );
}

function BusOption({ route, mode, rank, predictionAvailable, onClick }) {
  const isRecommended = rank === 0;
  const total = getTotalMinutes(route);
  const badge = predictionAvailable
    ? mode === "comfort" ? "입석 부담 적음" : "가장 빠름"
    : "가장 빠름";

  return (
    <button className={`bus-option ${isRecommended ? "is-recommended" : ""}`} type="button" onClick={onClick}>
      <span className="bus-option__header">
        <strong>{route.routeNumber}</strong>
        {isRecommended && <span className={`status-badge status-badge--${mode === "comfort" ? "comfortable" : "fast"}`}>{badge}</span>}
      </span>
      <span className="route-meta">{route.direction} · {route.vehicleType}</span>
      <span className="bus-metrics">
        <span><small>버스 도착</small><strong className="metric-primary">{route.arrivalMinutes}분 후</strong></span>
        <span><small>목적지까지</small><strong>약 {total}분</strong></span>
        <span>
          <small>{predictionAvailable ? "입석 부담" : "혼잡도"}</small>
          <strong className={predictionAvailable ? route.tone : ""}>
            {predictionAvailable ? `약 ${route.standingBurdenMinutes}분` : "확인 어려움"}
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

function CompareScreen({ destination, selectedCandidate, mode, onModeChange, onBack, onRoute }) {
  const routes = useMemo(
    () => sortRoutes(destination.routes, mode, destination.hasPrediction),
    [destination, mode],
  );
  const comfortable = destination.hasPrediction ? sortRoutes(destination.routes, "comfort", true)[0] : null;
  const fastest = sortRoutes(destination.routes, "fast", destination.hasPrediction)[0];
  const comfortDelay = comfortable ? getTotalMinutes(comfortable) - getTotalMinutes(fastest) : 0;
  const burdenSaved = comfortable
    ? fastest.standingBurdenMinutes - comfortable.standingBurdenMinutes
    : 0;

  return (
    <main className="screen" aria-labelledby="compare-title">
      <BackHeader title={selectedCandidate.stopName} onBack={onBack} />
      <section className="screen-heading screen-heading--compare">
        <h1 id="compare-title">어떤 버스가<br />더 나을까요?</h1>
        <p>{destination.displayName}까지 비교했어요.</p>
      </section>
      <ModeControl mode={mode} onChange={onModeChange} predictionAvailable={destination.hasPrediction} />

      {destination.hasPrediction ? (
        mode === "comfort" ? (
          <InfoBand>
            <strong>
              {comfortable.tripId === fastest.tripId
                ? `${comfortable.routeNumber}이 빠르고 입석 부담도 가장 적어요.`
                : `${comfortable.routeNumber}은 ${comfortDelay}분 늦지만`}
            </strong>
            {comfortable.tripId !== fastest.tripId && <span>입석 부담 예상 시간이 약 {burdenSaved}분 짧아요.</span>}
          </InfoBand>
        ) : (
          <InfoBand icon={Clock3}>
            <strong>{fastest.routeNumber}은 목적지까지 약 {getTotalMinutes(fastest)}분</strong>
            <span>지금 비교한 버스 중 가장 빨리 도착해요.</span>
          </InfoBand>
        )
      ) : (
        <InfoBand tone="warning" icon={AlertTriangle}>
          <strong>아직 데이터가 부족해</strong>
          <span>혼잡도는 예측하기 어려워요.</span>
          <span>빠른 도착순으로 보여드릴게요.</span>
        </InfoBand>
      )}

      <section className="bus-list" aria-label="버스 비교 결과">
        {routes.map((route, index) => (
          <BusOption
            key={route.tripId}
            route={route}
            mode={mode}
            rank={index}
            predictionAvailable={destination.hasPrediction}
            onClick={() => onRoute(route.tripId)}
          />
        ))}
      </section>

      <div className="compare-note">
        {destination.hasPrediction ? <Clock3 aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
        <span>
          {destination.hasPrediction
            ? `예측 기준 · ${destination.predictionBasis.description}`
            : "혼잡도 데이터가 생기면 자동으로 갱신해요."}
        </span>
      </div>
      <p className="fine-print compare-footnote">예측 결과는 실제 승하차 상황에 따라 달라질 수 있어요.</p>
    </main>
  );
}

function DetailScreen({ destination, selectedCandidate, route, onBack, onCompareComfort }) {
  const predictionAvailable = Boolean(destination.hasPrediction && route.segments?.length);
  const bannerTone = predictionAvailable ? route.tone : "fast";
  const total = getTotalMinutes(route);
  const alternative = predictionAvailable ? findComfortAlternative(route, destination.routes) : null;
  const extraMinutes = alternative ? alternative.totalMinutes - total : 0;
  const alternativeTimeMessage = extraMinutes > 0
    ? `${extraMinutes}분 더 걸리지만`
    : extraMinutes < 0
      ? `${Math.abs(extraMinutes)}분 더 빠르고`
      : "도착시간은 비슷하지만";

  return (
    <main className="screen" aria-labelledby="detail-title">
      <BackHeader title={selectedCandidate.stopName} onBack={onBack} />
      <section className="route-title">
        <h1 id="detail-title">{route.routeNumber}</h1>
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
        <div><small>목적지까지</small><strong>약 {total}분</strong></div>
        <div><small>입석 부담</small><strong>{predictionAvailable ? `약 ${route.standingBurdenMinutes}분` : "확인 어려움"}</strong></div>
      </section>

      {predictionAvailable ? (
        <>
          <section className="segment-section" aria-labelledby="segment-title">
            <h2 id="segment-title">구간별 예상</h2>
            <ol className="segment-list">
              {route.segments.map((segment) => (
                <li key={`${segment.fromStopName}-${segment.toStopName}`} className={`segment segment--${segment.tone}`}>
                  <span className="segment__dot" aria-hidden="true" />
                  <div>
                    <strong>{segment.fromStopName} → {segment.toStopName}</strong>
                    <p>{segment.durationMinutes}분 · {segment.description}</p>
                  </div>
                  <span className="segment__badge">{segment.congestionLabel}</span>
                </li>
              ))}
            </ol>
          </section>
          {!alternative && (
            <InfoBand tone={route.standingBurdenLevel === "HIGH" ? "warning" : "info"}>
              {DETAIL_GUIDANCE[route.standingBurdenLevel]}
            </InfoBand>
          )}
        </>
      ) : (
        <InfoBand tone="warning" icon={AlertTriangle}>
          <strong>아직 데이터가 부족해 구간별 입석 부담은 보여드리기 어려워요.</strong>
        </InfoBand>
      )}

      {alternative ? (
        <section className="alternative-recommendation" aria-labelledby="alternative-title">
          <div className="alternative-recommendation__heading">
            <span className="alternative-recommendation__icon"><BusFront aria-hidden="true" /></span>
            <div>
              <span>다른 선택지도 있어요</span>
              <h2 id="alternative-title">{alternative.route.routeNumber}은 {alternativeTimeMessage}</h2>
            </div>
          </div>
          <p>입석 부담 예상 시간이 약 {alternative.burdenSavingMinutes}분 짧아요.</p>
          <span className="alternative-recommendation__meta">
            {alternative.route.arrivalMinutes}분 후 도착 · {alternative.route.vehicleType}
          </span>
          <button className="secondary-button recommendation-button" type="button" onClick={onCompareComfort}>
            {alternative.route.routeNumber}과 비교하기
          </button>
        </section>
      ) : (
        <div className="detail-return">
          <button className="text-button" type="button" onClick={onBack}>
            {predictionAvailable ? "버스 비교로 돌아가기" : "다른 도착 버스 보기"}
          </button>
        </div>
      )}

    </main>
  );
}

export default function App() {
  const requestedScreen = useMemo(getRequestedScreen, []);
  const requestedStopId = useMemo(getRequestedStopId, []);
  const analysisRequestRef = useRef(0);
  const [screen, setScreen] = useState("loading");
  const [currentStop, setCurrentStop] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [destination, setDestination] = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [compareMode, setCompareMode] = useState("comfort");

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
        setDestinations(bootstrap.destinations);

        if (requestedScreen === "alighting") {
          const nextDestination = bootstrap.destinations.find((item) => item.destinationId === "bomun");
          setDestination(nextDestination);
          setSelectedCandidateId(nextDestination.alightingCandidates.find((item) => item.recommended)?.candidateId);
          setScreen("alighting");
          return;
        }

        if (!["compare", "limited", "detail"].includes(requestedScreen)) {
          setScreen("destination");
          return;
        }

        const destinationId = requestedScreen === "limited" ? "cityhall" : "bomun";
        const baseDestination = bootstrap.destinations.find((item) => item.destinationId === destinationId);
        const candidate = baseDestination.alightingCandidates.find((item) => item.recommended);
        const prediction = await busApi.getJourneyPrediction({
          originStopId: bootstrap.currentStop.stopId,
          destinationId,
          destinationStopId: candidate.stopId,
        });
        if (!active) return;
        const nextDestination = withPrediction(baseDestination, prediction);
        setDestination(nextDestination);
        setSelectedCandidateId(candidate.candidateId);
        setSelectedTripId(nextDestination.routes[0]?.tripId ?? null);
        setCompareMode(nextDestination.hasPrediction ? "comfort" : "fast");
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

  const candidatePool = destination?.alightingCandidates ?? [];
  const selectedCandidate = candidatePool.find((candidate) => candidate.candidateId === selectedCandidateId)
    ?? candidatePool[0]
    ?? null;
  const selectedRoute = destination?.routes?.find((route) => route.tripId === selectedTripId)
    ?? destination?.routes?.[0]
    ?? null;

  const selectDestination = (nextDestination) => {
    const candidates = nextDestination.alightingCandidates;
    const candidate = candidates.find((item) => item.recommended) ?? candidates[0];
    setDestination(nextDestination);
    setSelectedCandidateId(candidate.candidateId);
    setSelectedTripId(null);
    setScreen("alighting");
  };

  const analyzeJourney = async () => {
    const requestId = analysisRequestRef.current + 1;
    analysisRequestRef.current = requestId;
    setScreen("analyzing");

    try {
      const [prediction] = await Promise.all([
        busApi.getJourneyPrediction({
          originStopId: currentStop.stopId,
          destinationId: destination.destinationId,
          destinationStopId: selectedCandidate.stopId,
        }),
        new Promise((resolve) => window.setTimeout(resolve, 900)),
      ]);
      if (analysisRequestRef.current !== requestId) return;
      const nextDestination = withPrediction(destination, prediction);
      setDestination(nextDestination);
      setSelectedTripId(nextDestination.routes[0]?.tripId ?? null);
      setCompareMode(nextDestination.hasPrediction ? "comfort" : "fast");
      setScreen("compare");
    } catch {
      if (analysisRequestRef.current === requestId) setScreen("error");
    }
  };

  const cancelAnalysis = () => {
    analysisRequestRef.current += 1;
    setScreen("alighting");
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
            destinations={destinations}
            onSelectDestination={selectDestination}
          />
        )}
        {screen === "alighting" && currentStop && destination && selectedCandidate && (
          <AlightingScreen
            destination={destination}
            candidates={candidatePool}
            selectedCandidate={selectedCandidate}
            onBack={() => setScreen("destination")}
            onSelectCandidate={setSelectedCandidateId}
            onConfirm={analyzeJourney}
          />
        )}
        {screen === "analyzing" && currentStop && selectedCandidate && (
          <AnalyzingScreen currentStop={currentStop} selectedCandidate={selectedCandidate} onBack={cancelAnalysis} />
        )}
        {screen === "compare" && destination && selectedCandidate && (
          <CompareScreen
            destination={destination}
            selectedCandidate={selectedCandidate}
            mode={compareMode}
            onModeChange={setCompareMode}
            onBack={() => setScreen("alighting")}
            onRoute={(tripId) => {
              setSelectedTripId(tripId);
              setScreen("detail");
            }}
          />
        )}
        {screen === "detail" && currentStop && destination && selectedCandidate && selectedRoute && (
          <DetailScreen
            destination={destination}
            selectedCandidate={selectedCandidate}
            route={selectedRoute}
            onBack={() => setScreen("compare")}
            onCompareComfort={() => {
              setCompareMode("comfort");
              setScreen("compare");
            }}
          />
        )}
      </div>
    </div>
  );
}
