import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BusFront,
  Check,
  ChevronRight,
  Circle,
  Clock3,
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
    generatedAt: prediction.generatedAt,
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
    <div className="stop-badge" aria-label={`현재 출발지 ${currentStop.stopName}, QR 확인됨`}>
      <span className="stop-badge__dot" aria-hidden="true" />
      <strong>{currentStop.stopName}</strong>
      <span>QR 확인</span>
    </div>
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

function DestinationScreen({ currentStop, destinations, onSelect }) {
  const [query, setQuery] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");
  const inputRef = useRef(null);

  const matches = useMemo(() => {
    const keyword = query.trim();
    if (!keyword) return destinations;
    return destinations.filter((destination) =>
      `${destination.stopName} ${destination.nearbyDescription}`.includes(keyword),
    );
  }, [destinations, query]);

  const submitSearch = (event) => {
    event.preventDefault();
    if (matches.length > 0) {
      onSelect(matches[0]);
      return;
    }
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
    recognition.onerror = () => setVoiceMessage("잘 듣지 못했어요. 직접 입력해주세요.");
    recognition.start();
  };

  return (
    <main className="screen screen--destination" aria-labelledby="destination-title">
      <CurrentStopBadge currentStop={currentStop} />
      <section className="screen-heading">
        <h1 id="destination-title">어디까지<br />가세요?</h1>
        <p>도착할 정류장이나 주변 장소를 입력하세요.</p>
      </section>

      <form id="destination-form" className="search-form" onSubmit={submitSearch}>
        <Search aria-hidden="true" />
        <label className="sr-only" htmlFor="destination-search">목적지 검색</label>
        <input
          id="destination-search"
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="예: 보문역 2번 출구"
          autoComplete="off"
        />
        <button type="button" className="voice-button" onClick={startVoiceInput} aria-label="음성으로 목적지 입력" title="음성으로 입력">
          <Mic aria-hidden="true" />
        </button>
      </form>
      <p className="voice-message" aria-live="polite">{voiceMessage}</p>

      <section className="place-section" aria-labelledby="recent-title">
        <h2 id="recent-title">{query ? "검색 결과" : "최근 목적지"}</h2>
        <div className="place-list">
          {matches.map((destination) => (
            <button className="place-row" type="button" key={destination.destinationId} onClick={() => onSelect(destination)}>
              <span className="place-row__icon"><MapPin aria-hidden="true" /></span>
              <span className="place-row__copy">
                <strong>{destination.displayName}</strong>
                <small>{destination.transportInfo}</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
          {matches.length === 0 && (
            <div className="empty-result">일치하는 목적지가 없어요.</div>
          )}
        </div>
      </section>

      <div className="screen-bottom">
        <InfoBand>목적지를 선택하면 도착 예정 버스의 혼잡한 구간을 비교해드려요.</InfoBand>
        <button className="primary-button" type="submit" form="destination-form">
          목적지 찾기
        </button>
        <p className="fine-print">도착 정보는 실제 운행 상황에 따라 달라질 수 있어요.</p>
      </div>
    </main>
  );
}

function ConfirmScreen({ currentStop, destination, onBack, onConfirm }) {
  return (
    <main className="screen" aria-labelledby="confirm-title">
      <BackHeader title={currentStop.stopName} onBack={onBack} />
      <section className="screen-heading screen-heading--compact">
        <h1 id="confirm-title">목적지가<br />여기가 맞나요?</h1>
        <p>비슷한 정류장이 있어 한 번 확인해주세요.</p>
      </section>

      <div className="map-preview" aria-label={`${destination.stopName} 지도 위치 미리보기`}>
        <span className="map-road map-road--one" />
        <span className="map-road map-road--two" />
        <span className="map-road map-road--three" />
        <span className="map-pin"><MapPin aria-hidden="true" /></span>
      </div>

      <section className="destination-summary">
        <h2>{destination.stopName}</h2>
        <p>{currentStop.stopName.replace(" 정류장", "")}에서 {destination.stopCount}개 정류장</p>
        <div>{destination.nearbyDescription}</div>
      </section>

      <div className="screen-bottom screen-bottom--actions">
        <div className="button-pair">
          <button className="secondary-button" type="button" onClick={onBack}>다시 찾기</button>
          <button className="primary-button" type="button" onClick={onConfirm}>여기가 맞아요</button>
        </div>
        <p className="fine-print">사용자가 확인한 정류장만 분석에 사용해요.</p>
      </div>
    </main>
  );
}

function AnalyzingScreen({ currentStop, destination, onBack }) {
  return (
    <main className="screen screen--centered" aria-labelledby="analyzing-title">
      <BackHeader title={currentStop.stopName} onBack={onBack} />
      <div className="analysis-visual"><LoaderCircle aria-hidden="true" /></div>
      <section className="analysis-heading">
        <h1 id="analyzing-title">목적지까지 갈 수 있는<br />버스를 비교하고 있어요</h1>
        <p>{destination.displayName}까지 잠시만 기다려주세요.</p>
      </section>
      <ol className="progress-list">
        <li className="is-complete"><span><Check aria-hidden="true" /></span>도착 예정 버스 확인</li>
        <li className="is-active"><span><Circle aria-hidden="true" /></span>구간별 탑승 인원 예측</li>
        <li><span><Circle aria-hidden="true" /></span>이동시간과 혼잡 부담 비교</li>
      </ol>
      <p className="fine-print analysis-footnote">과거 승하차 패턴과 현재 운행 정보를 사용해요.</p>
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

const getTotalMinutes = (route) => route.arrivalMinutes + route.travelMinutes;

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

function BusOption({ route, mode, rank, predictionAvailable, onClick }) {
  const isRecommended = rank === 0;
  const total = getTotalMinutes(route);
  const badge = predictionAvailable
    ? mode === "comfort" ? "덜 붐비는 선택" : "빠른 도착"
    : "가장 빠름";

  return (
    <button className={`bus-option ${isRecommended ? "is-recommended" : ""}`} type="button" onClick={onClick}>
      <span className="bus-option__header">
        <strong>{route.routeNumber}</strong>
        {isRecommended && <span className={`status-badge status-badge--${mode === "comfort" ? "comfortable" : "fast"}`}>{badge}</span>}
      </span>
      <span className="bus-metrics">
        <span><small>{predictionAvailable ? "대기" : "버스 도착"}</small><strong className="metric-primary">{route.arrivalMinutes}분{predictionAvailable ? "" : " 후"}</strong></span>
        <span><small>이동</small><strong>{route.travelMinutes}분</strong></span>
        <span>
          <small>{predictionAvailable ? "보통 이상" : "목적지까지"}</small>
          <strong className={predictionAvailable ? route.tone : ""}>
            {predictionAvailable ? `약 ${route.standingBurdenMinutes}분` : `약 ${total}분`}
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

function CompareScreen({ destination, mode, onModeChange, onBack, onRoute }) {
  const routes = useMemo(
    () => sortRoutes(destination.routes, mode, destination.hasPrediction),
    [destination, mode],
  );

  const comfortable = destination.hasPrediction
    ? sortRoutes(destination.routes, "comfort", true)[0]
    : null;
  const fastest = sortRoutes(destination.routes, "fast", destination.hasPrediction)[0];
  const comfortDelay = comfortable ? getTotalMinutes(comfortable) - getTotalMinutes(fastest) : 0;
  const crowdedTimeSaved = comfortable
    ? fastest.standingBurdenMinutes - comfortable.standingBurdenMinutes
    : 0;

  return (
    <main className="screen" aria-labelledby="compare-title">
      <BackHeader title={destination.displayName} onBack={onBack} />
      <section className="screen-heading screen-heading--compare">
        <h1 id="compare-title">어떤 버스가<br />더 나을까요?</h1>
      </section>
      <ModeControl mode={mode} onChange={onModeChange} predictionAvailable={destination.hasPrediction} />

      {destination.hasPrediction ? (
        mode === "comfort" ? (
          <InfoBand>
            <strong>
              {comfortable.routeId === fastest.routeId
                ? `${comfortable.routeNumber}이 빠르고 입석 부담도 가장 낮아요.`
                : `${comfortable.routeNumber}은 ${comfortDelay}분 늦지만`}
            </strong>
            {comfortable.routeId !== fastest.routeId && <span>보통 이상 구간이 약 {crowdedTimeSaved}분 짧아요.</span>}
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
            key={route.routeId}
            route={route}
            mode={mode}
            rank={index}
            predictionAvailable={destination.hasPrediction}
            onClick={() => onRoute(route.routeId)}
          />
        ))}
      </section>

      <div className="compare-note">
        {destination.hasPrediction ? <Clock3 aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
        <span>
          {destination.hasPrediction
            ? "예측 기준 · 평일 오후 2시 승하차 패턴"
            : "혼잡도 데이터가 생기면 자동으로 갱신해요."}
        </span>
      </div>
      <p className="fine-print compare-footnote">도착 정보는 실제 운행 상황에 따라 달라질 수 있어요.</p>
    </main>
  );
}

function DetailScreen({ currentStop, destination, route, onBack, onSelect }) {
  const predictionAvailable = destination.hasPrediction && route.segments;
  const bannerTone = predictionAvailable ? route.tone : "fast";

  return (
    <main className="screen" aria-labelledby="detail-title">
      <BackHeader title={destination.displayName} onBack={onBack} />
      <section className="route-title">
        <h1 id="detail-title">{route.routeNumber}</h1>
        <p>{currentStop.stopName.replace(" 정류장", "")} → {destination.displayName}</p>
      </section>

      <section className={`route-summary route-summary--${bannerTone}`}>
        <span className={`status-badge status-badge--${bannerTone}`}>
          {predictionAvailable ? `입석 부담 ${route.burdenLabel}` : "빠른 도착"}
        </span>
        <h2>{predictionAvailable ? route.summaryMessage : `${route.arrivalMinutes}분 후 도착해요.`}</h2>
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
          <InfoBand>여유는 좌석 이용 가능성이 상대적으로 높은 혼잡 단계를 의미해요.</InfoBand>
        </>
      ) : (
        <>
          <section className="arrival-metrics" aria-label="도착 정보">
            <div><small>버스 도착</small><strong>{route.arrivalMinutes}분 후</strong></div>
            <div><small>이동시간</small><strong>{route.travelMinutes}분</strong></div>
            <div><small>목적지까지</small><strong>약 {route.arrivalMinutes + route.travelMinutes}분</strong></div>
          </section>
          <InfoBand tone="warning" icon={AlertTriangle}>
            <strong>아직 데이터가 부족해 혼잡도는 보여드리기 어려워요.</strong>
          </InfoBand>
        </>
      )}

      <div className="screen-bottom detail-bottom">
        <button className="primary-button" type="button" onClick={onSelect}>{route.routeNumber} 선택하기</button>
        <p className="fine-print">최근 정보 갱신 · 오후 1:58</p>
      </div>
    </main>
  );
}

function SelectedScreen({ currentStop, destination, route, onChange }) {
  return (
    <main className="screen screen--selected" aria-labelledby="selected-title">
      <div className="selected-icon"><Check aria-hidden="true" /></div>
      <section>
        <h1 id="selected-title">{route.routeNumber}을 선택했어요</h1>
        <p>{route.arrivalMinutes}분 후 {currentStop.stopName} 도착 예정이에요.</p>
      </section>
      <div className="selected-route">
        <BusFront aria-hidden="true" />
        <div>
          <strong>{currentStop.stopName}</strong>
          <span>{destination.stopName}</span>
        </div>
      </div>
      <div className="screen-bottom">
        <button className="secondary-button secondary-button--full" type="button" onClick={onChange}>다른 버스 보기</button>
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
  const [destinations, setDestinations] = useState([]);
  const [destination, setDestination] = useState(null);
  const [routeId, setRouteId] = useState(null);
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

        if (!["compare", "limited", "detail"].includes(requestedScreen)) {
          setScreen("destination");
          return;
        }

        const destinationId = requestedScreen === "limited" ? "cityhall" : "bomun";
        const baseDestination = bootstrap.destinations.find((item) => item.destinationId === destinationId);
        const prediction = await busApi.getJourneyPrediction({
          originStopId: bootstrap.currentStop.stopId,
          destinationId,
        });
        if (!active) return;

        const nextDestination = withPrediction(baseDestination, prediction);
        setDestination(nextDestination);
        setRouteId(nextDestination.routes[0]?.routeId ?? null);
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

  const route = destination?.routes?.find((candidate) => candidate.routeId === routeId) ?? destination?.routes?.[0];

  const selectDestination = (nextDestination) => {
    setDestination(nextDestination);
    setRouteId(null);
    setCompareMode("comfort");
    setScreen("confirm");
  };

  const analyzeDestination = async () => {
    const requestId = analysisRequestRef.current + 1;
    analysisRequestRef.current = requestId;
    setScreen("analyzing");

    try {
      const [prediction] = await Promise.all([
        busApi.getJourneyPrediction({
          originStopId: currentStop.stopId,
          destinationId: destination.destinationId,
        }),
        new Promise((resolve) => window.setTimeout(resolve, 1000)),
      ]);
      if (analysisRequestRef.current !== requestId) return;

      const nextDestination = withPrediction(destination, prediction);
      setDestination(nextDestination);
      setRouteId(nextDestination.routes[0]?.routeId ?? null);
      setCompareMode(nextDestination.hasPrediction ? "comfort" : "fast");
      setScreen("compare");
    } catch {
      if (analysisRequestRef.current === requestId) setScreen("error");
    }
  };

  const cancelAnalysis = () => {
    analysisRequestRef.current += 1;
    setScreen("confirm");
  };

  if (screen === "loading" || screen === "error") {
    return (
      <div className="app-shell">
        <div className="phone-frame">
          <StatusScreen error={screen === "error"} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="phone-frame">
        {screen === "destination" && currentStop && (
          <DestinationScreen currentStop={currentStop} destinations={destinations} onSelect={selectDestination} />
        )}
        {screen === "confirm" && currentStop && destination && (
          <ConfirmScreen
            currentStop={currentStop}
            destination={destination}
            onBack={() => setScreen("destination")}
            onConfirm={analyzeDestination}
          />
        )}
        {screen === "analyzing" && currentStop && destination && (
          <AnalyzingScreen currentStop={currentStop} destination={destination} onBack={cancelAnalysis} />
        )}
        {screen === "compare" && destination && (
          <CompareScreen
            destination={destination}
            mode={compareMode}
            onModeChange={setCompareMode}
            onBack={() => setScreen("confirm")}
            onRoute={(nextRouteId) => {
              setRouteId(nextRouteId);
              setScreen("detail");
            }}
          />
        )}
        {screen === "detail" && currentStop && destination && route && (
          <DetailScreen
            currentStop={currentStop}
            destination={destination}
            route={route}
            onBack={() => setScreen("compare")}
            onSelect={() => setScreen("selected")}
          />
        )}
        {screen === "selected" && currentStop && destination && route && (
          <SelectedScreen currentStop={currentStop} destination={destination} route={route} onChange={() => setScreen("compare")} />
        )}
      </div>
    </div>
  );
}
