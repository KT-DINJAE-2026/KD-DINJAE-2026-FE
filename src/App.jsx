import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  BusFront,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Footprints,
  Info,
  Landmark,
  LoaderCircle,
  Map as MapIcon,
  MapPin,
  Maximize2,
  RefreshCw,
  Search,
  Signpost,
  X,
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
  LOW: "여유 예상 구간을 더한 시간이에요. 실제 좌석을 보장하지는 않아요.",
  MEDIUM: "여유 예상 구간만 더한 시간이에요. 보통 구간에서는 좌석 이용이 어려울 수 있어요.",
  HIGH: "여유 예상 구간만 더한 시간이에요. 혼잡 구간에서는 좌석 이용이 어려울 수 있어요.",
};

const getDestinationResultKey = (result) => (
  result.type === "PLACE" ? result.placeId : result.stop.stopId
);

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
      const seatFriendlyMinutes = route.segments?.reduce(
        (minutes, segment) => minutes + (segment.congestionLevel === "RELAXED" ? segment.durationMinutes : 0),
        0,
      );
      return {
        ...route,
        burdenLabel: burdenMeta?.label,
        tone: burdenMeta?.tone,
        seatFriendlyMinutes,
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

function StatusScreen({
  error = false,
  title,
  description,
  onRetry = () => window.location.reload(),
}) {
  const heading = title ?? (error ? "정보를 불러오지 못했어요" : "정류장 정보를 불러오고 있어요");
  const body = description ?? (error ? "잠시 후 다시 시도해주세요." : "잠시만 기다려주세요.");

  return (
    <main className="screen screen--centered status-screen" aria-live="polite">
      <div className={`analysis-visual ${error ? "is-error" : ""}`}>
        {error ? <AlertTriangle aria-hidden="true" /> : <LoaderCircle aria-hidden="true" />}
      </div>
      <section className="analysis-heading">
        <h1>{heading}</h1>
        <p>{body}</p>
      </section>
      {error && (
        <div className="screen-bottom">
          <button className="primary-button" type="button" onClick={onRetry}>다시 시도하기</button>
        </div>
      )}
    </main>
  );
}

function DestinationScreen({
  currentStop,
  recentDestinations,
  onSelectResult,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(recentDestinations);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const keyword = query.trim();
    let active = true;

    if (!keyword) {
      setResults(recentDestinations);
      setIsSearching(false);
      return undefined;
    }

    setIsSearching(true);
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await busApi.searchDestinations({
          originStopId: currentStop.stopId,
          query: keyword,
        });
        if (!active) return;
        setResults(response.results);
        setSearchMessage(response.results.length ? "" : "일치하는 장소나 정류장이 없어요.");
      } catch {
        if (active) setSearchMessage("검색하지 못했어요. 잠시 후 다시 시도해주세요.");
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [currentStop.stopId, query, recentDestinations]);

  const submitSearch = (event) => {
    event.preventDefault();
    if (!query.trim()) {
      setSearchMessage("가려는 장소나 도착 정류장을 입력해주세요.");
      inputRef.current?.focus();
      return;
    }
    if (isSearching) {
      setSearchMessage("검색하고 있어요. 잠시만 기다려주세요.");
      return;
    }
    if (results.length === 1) {
      onSelectResult(results[0]);
      return;
    }
    if (results.length > 1) {
      setSearchMessage("검색 결과에서 한 곳을 선택해주세요.");
      return;
    }
    setSearchMessage("일치하는 장소나 정류장이 없어요. 다른 이름으로 검색해주세요.");
    inputRef.current?.focus();
  };

  return (
    <main className="screen screen--destination" aria-labelledby="destination-title">
      <CurrentStopBadge currentStop={currentStop} />
      <section className="screen-heading">
        <h1 id="destination-title">어디까지<br />가세요?</h1>
        <p>장소나 도착 정류장 이름을 입력해주세요.</p>
      </section>

      <form id="destination-form" className="search-form" onSubmit={submitSearch}>
        <Search aria-hidden="true" />
        <label className="sr-only" htmlFor="destination-search">장소 또는 도착 정류장 검색</label>
        <input
          id="destination-search"
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSearchMessage("");
          }}
          placeholder="예: 보문역 또는 서울시청 앞"
          autoComplete="off"
          enterKeyHint="search"
        />
      </form>
      <p className="search-message" aria-live="polite">{searchMessage}</p>

      <section className="place-section" aria-labelledby="place-title" aria-busy={isSearching}>
        <h2 id="place-title">
          {query ? `검색 결과 ${isSearching ? "" : `${results.length}개`}` : "최근 목적지"}
        </h2>
        <div className="place-list" aria-live="polite">
          {isSearching && <div className="searching-result"><LoaderCircle aria-hidden="true" />검색하고 있어요</div>}
          {!isSearching && results.map((result) => {
            const isPlace = result.type === "PLACE";
            const title = isPlace ? result.name : result.stop.stopName;
            const detail = isPlace
              ? result.address
              : `${result.stop.directionDescription} · ${result.stop.landmark}`;
            const ResultIcon = isPlace ? Building2 : BusFront;

            return (
              <button
                className="place-row"
                type="button"
                key={getDestinationResultKey(result)}
                onClick={() => onSelectResult(result)}
              >
                <span className="place-row__icon"><ResultIcon aria-hidden="true" /></span>
                <span className="place-row__copy">
                  <span className={`result-type result-type--${isPlace ? "place" : "stop"}`}>
                    {isPlace ? "장소" : "정류장"}
                  </span>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            );
          })}
          {!isSearching && !results.length && <div className="empty-result">다른 이름으로 검색해주세요.</div>}
        </div>
      </section>

      <div className="screen-bottom destination-bottom">
        <button className="primary-button" type="submit" form="destination-form">검색하기</button>
      </div>
    </main>
  );
}

function NearbyStopsScreen({ currentStop, place, stops, onBack, onSelectStop }) {
  return (
    <main className="screen" aria-labelledby="nearby-title">
      <BackHeader title="도착 정류장 찾기" onBack={onBack} />
      <section className="screen-heading screen-heading--nearby">
        <span className="heading-kicker"><MapPin aria-hidden="true" />{place.name}</span>
        <h1 id="nearby-title">어느 정류장에서<br />내릴까요?</h1>
        <p>{place.address}</p>
      </section>

      <InfoBand icon={BusFront}>
        <strong>{currentStop.stopName.replace(" 정류장", "")}에서 바로 갈 수 있는 정류장이에요.</strong>
      </InfoBand>

      {stops.length ? (
        <section className="nearby-stop-list" aria-label={`${place.name} 주변 정류장`}>
          {stops.map((stop, index) => (
            <button
              className={`nearby-stop ${index === 0 ? "is-nearest" : ""}`}
              type="button"
              key={stop.stopId}
              onClick={() => onSelectStop(stop)}
            >
              <span className="nearby-stop__topline">
                <span className="result-type result-type--stop">정류장</span>
                {index === 0 && <span className="nearest-badge">가장 가까움</span>}
              </span>
              <strong>{stop.stopName}</strong>
              <span className="nearby-stop__direction">{stop.directionDescription} · {stop.landmark}</span>
              <span className="nearby-stop__facts">
                <span><Footprints aria-hidden="true" />{place.name}까지 도보 {stop.walkMinutes}분</span>
                <span><BusFront aria-hidden="true" />직행 버스 {stop.directRouteCount}개</span>
              </span>
              <span className="nearby-stop__distance">약 {stop.distanceMeters}m <ChevronRight aria-hidden="true" /></span>
            </button>
          ))}
        </section>
      ) : (
        <div className="no-reachable-stops">
          <AlertTriangle aria-hidden="true" />
          <strong>지금 바로 갈 수 있는 정류장이 없어요.</strong>
          <button className="text-button" type="button" onClick={onBack}>다른 목적지 찾기</button>
        </div>
      )}
    </main>
  );
}

function StopMapPreview({ destinationStop }) {
  return (
    <div
      className="stop-map"
      role="img"
      aria-label={`${destinationStop.stopName}, ${destinationStop.landmark} 위치 안내`}
    >
      <span className="stop-map__road stop-map__road--horizontal" aria-hidden="true" />
      <span className="stop-map__road stop-map__road--vertical" aria-hidden="true" />
      <span className="stop-map__block stop-map__block--one" aria-hidden="true" />
      <span className="stop-map__block stop-map__block--two" aria-hidden="true" />
      <span className="stop-map__pin"><MapPin aria-hidden="true" /></span>
      <span className="stop-map__label stop-map__label--stop">{destinationStop.stopName}</span>
      <span className="stop-map__label stop-map__label--landmark">{destinationStop.landmark}</span>
    </div>
  );
}

function PreviewDialog({ destinationStop, open, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-dialog-title">
      <div className="preview-dialog__panel">
        <header>
          <h2 id="preview-dialog-title">{destinationStop.stopName}</h2>
          <button
            ref={closeButtonRef}
            className="icon-button icon-button--inverse"
            type="button"
            onClick={onClose}
            aria-label="큰 정류장 모습 닫기"
            title="닫기"
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <img src={destinationStop.roadview.imageUrl} alt={destinationStop.roadview.altText} />
        <p>{destinationStop.directionDescription} · {destinationStop.landmark}</p>
      </div>
    </div>
  );
}

function StopConfirmationScreen({
  currentStop,
  destinationStop,
  selectedPlace,
  onBack,
  onConfirm,
  onChooseOtherStop,
}) {
  const hasRoadview = Boolean(destinationStop.roadview?.available && destinationStop.roadview.imageUrl);
  const [previewMode, setPreviewMode] = useState(hasRoadview ? "roadview" : "map");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setPreviewMode(hasRoadview ? "roadview" : "map");
    setPreviewOpen(false);
  }, [destinationStop.stopId, hasRoadview]);

  return (
    <main className="screen screen--confirm" aria-labelledby="confirm-title">
      <BackHeader title="도착 정류장 확인" onBack={onBack} />
      <section className="screen-heading screen-heading--confirm">
        <h1 id="confirm-title">이 정류장이<br />맞나요?</h1>
        <p>정류장 모습과 방향을 확인해주세요.</p>
      </section>

      <div className="preview-tabs" role="tablist" aria-label="정류장 확인 방법">
        <button
          type="button"
          role="tab"
          aria-selected={previewMode === "roadview"}
          className={previewMode === "roadview" ? "is-active" : ""}
          onClick={() => setPreviewMode("roadview")}
          disabled={!hasRoadview}
        >
          <Building2 aria-hidden="true" />정류장 모습
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={previewMode === "map"}
          className={previewMode === "map" ? "is-active" : ""}
          onClick={() => setPreviewMode("map")}
        >
          <MapIcon aria-hidden="true" />지도
        </button>
      </div>

      <figure className="stop-preview">
        {previewMode === "roadview" && hasRoadview ? (
          <>
            <img src={destinationStop.roadview.imageUrl} alt={destinationStop.roadview.altText} />
            <button
              className="preview-expand"
              type="button"
              onClick={() => setPreviewOpen(true)}
              aria-label="정류장 모습 크게 보기"
              title="크게 보기"
            >
              <Maximize2 aria-hidden="true" />
            </button>
            <figcaption>{destinationStop.roadview.capturedAtLabel}</figcaption>
          </>
        ) : (
          <StopMapPreview destinationStop={destinationStop} />
        )}
      </figure>

      {previewMode === "map" && !hasRoadview && (
        <p className="map-fallback-note">
          <Info aria-hidden="true" />정류장 사진이 없어 지도로 안내해요.
        </p>
      )}

      <section className="stop-confirmation" aria-label="선택한 도착 정류장 정보">
        <h2>{destinationStop.stopName}</h2>
        <dl>
          <div>
            <dt><Signpost aria-hidden="true" />가는 방향</dt>
            <dd>{destinationStop.directionDescription}</dd>
          </div>
          <div>
            <dt><Landmark aria-hidden="true" />가까운 곳</dt>
            <dd>{destinationStop.landmark}</dd>
          </div>
          {selectedPlace && Number.isFinite(destinationStop.walkMinutes) && (
            <div>
              <dt><Footprints aria-hidden="true" />내린 다음</dt>
              <dd>{selectedPlace.name}까지 도보 {destinationStop.walkMinutes}분</dd>
            </div>
          )}
        </dl>
      </section>

      <InfoBand icon={BusFront}>
        <strong>{currentStop.stopName.replace(" 정류장", "")}에서 바로 가는 버스 {destinationStop.directRouteCount}개</strong>
      </InfoBand>

      <div className="screen-bottom confirm-bottom">
        <button className="primary-button" type="button" onClick={onConfirm}>이 정류장으로 가기</button>
        {selectedPlace && (
          <button className="text-button" type="button" onClick={onChooseOtherStop}>다른 주변 정류장 보기</button>
        )}
      </div>

      {hasRoadview && (
        <PreviewDialog
          destinationStop={destinationStop}
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </main>
  );
}

function AnalyzingScreen({ currentStop, destinationStop, onBack }) {
  return (
    <main className="screen screen--centered" aria-labelledby="analyzing-title">
      <BackHeader title={destinationStop.stopName} onBack={onBack} />
      <div className="analysis-visual"><LoaderCircle aria-hidden="true" /></div>
      <section className="analysis-heading">
        <h1 id="analyzing-title">두 정류장을 잇는 버스를<br />비교하고 있어요</h1>
        <p>{currentStop.stopName.replace(" 정류장", "")}에서 출발해요.</p>
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

function BusOption({ route, isComfortBest, isFastest, predictionAvailable, onClick }) {
  const isRecommended = isComfortBest || isFastest;
  const total = getTotalMinutes(route);

  return (
    <button className={`bus-option ${isRecommended ? "is-recommended" : ""}`} type="button" onClick={onClick}>
      <span className="bus-option__header">
        <strong>{route.routeNumber}</strong>
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

function CompareScreen({ destinationStop, onBack, onRoute }) {
  const routes = useMemo(
    () => sortRoutes(destinationStop.routes, destinationStop.hasPrediction),
    [destinationStop],
  );
  const comfortable = destinationStop.hasPrediction ? routes[0] : null;
  const fastest = [...destinationStop.routes].sort(
    (a, b) => getTotalMinutes(a) - getTotalMinutes(b) || a.arrivalMinutes - b.arrivalMinutes,
  )[0];
  const comfortDelay = comfortable ? getTotalMinutes(comfortable) - getTotalMinutes(fastest) : 0;
  const extraSeatFriendlyMinutes = comfortable
    ? comfortable.seatFriendlyMinutes - fastest.seatFriendlyMinutes
    : 0;

  return (
    <main className="screen" aria-labelledby="compare-title">
      <BackHeader title={destinationStop.stopName} onBack={onBack} />
      <section className="screen-heading screen-heading--compare">
        <h1 id="compare-title">어떤 버스가<br />더 나을까요?</h1>
        <p>도착 예정 버스 {routes.length}대를 비교했어요.</p>
      </section>

      {destinationStop.hasPrediction ? (
        <InfoBand>
          <strong>
            {comfortable.tripId === fastest.tripId
              ? `${comfortable.routeNumber}이 빠르고 앉아서 갈 가능성도 높아요.`
              : `${comfortable.routeNumber}은 ${comfortDelay}분 늦지만`}
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

      <div className="compare-note">
        {destinationStop.hasPrediction ? <Clock3 aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
        <span>
          {destinationStop.hasPrediction
            ? `예측 기준 · ${destinationStop.predictionBasis.description}`
            : "혼잡도 데이터가 생기면 자동으로 갱신해요."}
        </span>
      </div>
      <p className="fine-print compare-footnote">도착 및 혼잡 예측은 실제 운행 상황에 따라 달라질 수 있어요.</p>
    </main>
  );
}

function DetailScreen({ destinationStop, route, onBack }) {
  const predictionAvailable = Boolean(destinationStop.hasPrediction && route.segments?.length);
  const bannerTone = predictionAvailable ? route.tone : "fast";
  const total = getTotalMinutes(route);

  return (
    <main className="screen" aria-labelledby="detail-title">
      <BackHeader title={destinationStop.stopName} onBack={onBack} />
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
  const placeRequestRef = useRef(0);
  const [screen, setScreen] = useState("loading");
  const [currentStop, setCurrentStop] = useState(null);
  const [recentDestinations, setRecentDestinations] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [reachableStops, setReachableStops] = useState([]);
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
        setRecentDestinations(bootstrap.recentDestinations);

        if (!["nearby", "confirm", "compare", "limited", "detail"].includes(requestedScreen)) {
          setScreen("destination");
          return;
        }

        const placeId = requestedScreen === "limited"
          ? "place-seoul-cityhall"
          : "place-bomun-station";
        const nearbyResponse = await busApi.getReachableStops({
          originStopId: bootstrap.currentStop.stopId,
          placeId,
        });
        if (!active) return;
        setSelectedPlace(nearbyResponse.place);
        setReachableStops(nearbyResponse.stops);

        if (requestedScreen === "nearby") {
          setScreen("nearby");
          return;
        }

        const baseDestinationStop = nearbyResponse.stops[0];
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

  const openSearchResult = async (result) => {
    analysisRequestRef.current += 1;

    if (result.type === "STOP") {
      setSelectedPlace(null);
      setReachableStops([]);
      setDestinationStop(result.stop);
      setSelectedTripId(null);
      setScreen("confirm");
      return;
    }

    const requestId = placeRequestRef.current + 1;
    placeRequestRef.current = requestId;
    setSelectedPlace(result);
    setReachableStops([]);
    setDestinationStop(null);
    setScreen("place-loading");

    try {
      const response = await busApi.getReachableStops({
        originStopId: currentStop.stopId,
        placeId: result.placeId,
      });
      if (placeRequestRef.current !== requestId) return;
      setSelectedPlace(response.place);
      setReachableStops(response.stops);
      setScreen("nearby");
    } catch {
      if (placeRequestRef.current === requestId) setScreen("error");
    }
  };

  const openStopConfirmation = (stop) => {
    setDestinationStop(stop);
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
    } catch {
      if (analysisRequestRef.current === requestId) setScreen("error");
    }
  };

  const cancelAnalysis = () => {
    analysisRequestRef.current += 1;
    setScreen("confirm");
  };

  if (screen === "loading" || screen === "place-loading" || screen === "error") {
    const isPlaceLoading = screen === "place-loading";
    return (
      <div className="app-shell">
        <div className="phone-frame">
          <StatusScreen
            error={screen === "error"}
            title={isPlaceLoading ? "갈 수 있는 정류장을 찾고 있어요" : undefined}
            description={isPlaceLoading ? "현재 정류장에서 바로 갈 수 있는 곳만 확인할게요." : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="phone-frame">
        {screen === "destination" && currentStop && (
          <DestinationScreen
            currentStop={currentStop}
            recentDestinations={recentDestinations}
            onSelectResult={openSearchResult}
          />
        )}
        {screen === "nearby" && currentStop && selectedPlace && (
          <NearbyStopsScreen
            currentStop={currentStop}
            place={selectedPlace}
            stops={reachableStops}
            onBack={() => setScreen("destination")}
            onSelectStop={openStopConfirmation}
          />
        )}
        {screen === "confirm" && currentStop && destinationStop && (
          <StopConfirmationScreen
            currentStop={currentStop}
            destinationStop={destinationStop}
            selectedPlace={selectedPlace}
            onBack={() => setScreen(selectedPlace ? "nearby" : "destination")}
            onConfirm={() => analyzeJourney(destinationStop)}
            onChooseOtherStop={() => setScreen("nearby")}
          />
        )}
        {screen === "analyzing" && currentStop && destinationStop && (
          <AnalyzingScreen
            currentStop={currentStop}
            destinationStop={destinationStop}
            onBack={cancelAnalysis}
          />
        )}
        {screen === "compare" && destinationStop && (
          <CompareScreen
            destinationStop={destinationStop}
            onBack={() => setScreen("confirm")}
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
          />
        )}
      </div>
    </div>
  );
}
