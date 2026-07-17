import { useEffect, useRef, useState } from "react";
import { Info, LoaderCircle } from "lucide-react";
import { loadKakaoMaps } from "../lib/kakaoMaps.js";

const KAKAO_MAP_APP_KEY = import.meta.env.VITE_KAKAO_MAP_APP_KEY?.trim();
const ROADVIEW_SEARCH_RADIUS_METERS = 50;
const ROADVIEW_LOAD_TIMEOUT_MS = 10000;

export default function KakaoRoadview({ location, fallback, stopName }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const hasFallbackImage = Boolean(fallback?.imageUrl);
  const isReady = status === "ready";
  const fallbackLabel = fallback?.label
    ?? (hasFallbackImage ? "정류장 모습 예시" : "정류장 모습 없음");

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !KAKAO_MAP_APP_KEY || !hasCoordinates) {
      setStatus("fallback");
      return undefined;
    }

    let active = true;
    let maps = null;
    let roadview = null;
    let initListener = null;
    let resizeObserver = null;
    let loadTimeoutId = null;

    setStatus("loading");

    loadKakaoMaps(KAKAO_MAP_APP_KEY)
      .then((loadedMaps) => {
        if (!active) return;

        maps = loadedMaps;
        const position = new maps.LatLng(latitude, longitude);
        roadview = new maps.Roadview(container);

        initListener = () => {
          if (!active) return;
          window.clearTimeout(loadTimeoutId);
          roadview.relayout();
          setStatus("ready");
        };
        maps.event.addListener(roadview, "init", initListener);

        if (typeof ResizeObserver === "function") {
          resizeObserver = new ResizeObserver(() => roadview?.relayout());
          resizeObserver.observe(container);
        }

        const roadviewClient = new maps.RoadviewClient();
        roadviewClient.getNearestPanoId(position, ROADVIEW_SEARCH_RADIUS_METERS, (panoId) => {
          if (!active) return;
          if (panoId == null) {
            setStatus("fallback");
            return;
          }

          loadTimeoutId = window.setTimeout(() => {
            if (active) setStatus("fallback");
          }, ROADVIEW_LOAD_TIMEOUT_MS);
          roadview.setPanoId(panoId, position);
        });
      })
      .catch(() => {
        if (active) setStatus("fallback");
      });

    return () => {
      active = false;
      window.clearTimeout(loadTimeoutId);
      resizeObserver?.disconnect();
      if (maps && roadview && initListener) {
        maps.event.removeListener(roadview, "init", initListener);
      }
      container.replaceChildren();
    };
  }, [hasCoordinates, latitude, longitude]);

  return (
    <figure className={`roadview-preview is-${status}`}>
      {status === "fallback" && hasFallbackImage && (
        <img
          className="roadview-preview__fallback"
          src={fallback.imageUrl}
          alt={fallback.altText ?? `${stopName} 정류장 모습 예시`}
        />
      )}

      <div
        ref={containerRef}
        className="roadview-preview__canvas"
        role={isReady ? "region" : undefined}
        aria-label={isReady ? `${stopName} 주변 카카오맵 로드뷰` : undefined}
        aria-hidden={!isReady}
      />

      {status === "loading" && (
        <div className="roadview-preview__status" role="status">
          <LoaderCircle aria-hidden="true" />
          <strong>정류장 모습을 불러오고 있어요.</strong>
        </div>
      )}

      {status === "fallback" && !hasFallbackImage && (
        <div className="roadview-preview__empty" role="img" aria-label="정류장 모습 없음">
          <Info aria-hidden="true" />
          <strong>정류장 모습을 준비 중이에요.</strong>
        </div>
      )}

      {status !== "loading" && (
        <figcaption>{isReady ? "카카오맵 로드뷰" : fallbackLabel}</figcaption>
      )}
    </figure>
  );
}
