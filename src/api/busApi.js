import bootstrapMock from "../mocks/bootstrap.json";
import bomunPredictionMock from "../mocks/predictions/bomun.json";
import sinseoldongPredictionMock from "../mocks/predictions/sinseoldong.json";

const API_MODE = import.meta.env.VITE_API_MODE ?? "mock";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
const MOCK_DELAY_MS = 350;

const predictionMocks = {
  "107000089": bomunPredictionMock,
  "100000147": sinseoldongPredictionMock,
};

const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const clone = (value) => (
  typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value))
);

async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const apiError = new Error(error.message ?? `API 요청 실패: ${response.status}`);
    apiError.status = response.status;
    apiError.code = error.code;
    apiError.traceId = error.traceId;
    throw apiError;
  }

  return response.json();
}

async function searchDestinationStops({ originStopId, query }) {
  if (API_MODE === "mock") {
    await wait(MOCK_DELAY_MS);
    const keyword = query.trim().toLocaleLowerCase("ko-KR");
    const destinationStops = bootstrapMock.destinationStops.filter((destinationStop) =>
      [
        destinationStop.stopName,
        destinationStop.displayName,
        destinationStop.arsId,
        destinationStop.directionDescription,
        destinationStop.landmark,
        ...(destinationStop.searchKeywords ?? []),
        ...(destinationStop.servedRoutes ?? []).flatMap((route) => [route.routeId, route.routeNumber]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ko-KR")
        .includes(keyword),
    );
    return { destinationStops: clone(destinationStops) };
  }

  const params = new URLSearchParams({ originStopId, query });
  return request(`/api/v1/stops/search?${params.toString()}`);
}

async function getBootstrap(stopId) {
  if (API_MODE === "mock") {
    await wait(MOCK_DELAY_MS);
    if (String(stopId) !== bootstrapMock.currentStop.stopId) {
      throw new Error(`등록되지 않은 Mock 출발 정류장: ${stopId}`);
    }
    return clone(bootstrapMock);
  }

  return request(`/api/v1/stops/${encodeURIComponent(stopId)}/context`);
}

async function getJourneyPrediction({ originStopId, destinationStopId }) {
  if (API_MODE === "mock") {
    await wait(MOCK_DELAY_MS);
    const response = predictionMocks[destinationStopId];
    if (!response) throw new Error(`등록되지 않은 Mock 도착 정류장: ${destinationStopId}`);
    return clone(response);
  }

  return request("/api/v1/journeys/predictions", {
    method: "POST",
    body: JSON.stringify({ originStopId, destinationStopId }),
  });
}

export const busApi = {
  getBootstrap,
  searchDestinationStops,
  getJourneyPrediction,
};
