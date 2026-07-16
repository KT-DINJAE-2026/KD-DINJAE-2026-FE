import bootstrapMock from "../mocks/bootstrap.json";
import destinationSearchMock from "../mocks/destination-search.json";
import bomunReachableStopsMock from "../mocks/reachable-stops/bomun-station.json";
import cityhallReachableStopsMock from "../mocks/reachable-stops/seoul-cityhall.json";
import bomunPredictionMock from "../mocks/predictions/bomun.json";
import bomunCommunityPredictionMock from "../mocks/predictions/bomun-community.json";
import cityhallPredictionMock from "../mocks/predictions/cityhall.json";

const API_MODE = import.meta.env.VITE_API_MODE ?? "mock";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
const MOCK_DELAY_MS = 350;

const predictionMocks = {
  "stop-bomun-exit2": bomunPredictionMock,
  "stop-bomun-community-center": bomunCommunityPredictionMock,
  "stop-cityhall-front": cityhallPredictionMock,
};

const reachableStopMocks = {
  "place-bomun-station": bomunReachableStopsMock,
  "place-seoul-cityhall": cityhallReachableStopsMock,
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
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return response.json();
}

async function getBootstrap(stopId) {
  if (API_MODE === "mock") {
    await wait(MOCK_DELAY_MS);
    return clone(bootstrapMock);
  }

  return request(`/api/v1/stops/${encodeURIComponent(stopId)}/context`);
}

function getSearchText(result) {
  if (result.type === "STOP") {
    return [
      result.stop.stopName,
      result.stop.directionDescription,
      result.stop.landmark,
      ...(result.searchKeywords ?? []),
      ...(result.stop.servedRouteIds ?? []),
    ].join(" ");
  }

  return [result.name, result.address, ...(result.searchKeywords ?? [])].join(" ");
}

async function searchDestinations({ originStopId, query }) {
  if (API_MODE === "mock") {
    await wait(MOCK_DELAY_MS);
    const keyword = query.trim().toLocaleLowerCase("ko-KR");
    const results = destinationSearchMock.results.filter((result) =>
      getSearchText(result).toLocaleLowerCase("ko-KR").includes(keyword),
    );
    return clone({ results });
  }

  const search = new URLSearchParams({ originStopId, query });
  return request(`/api/v1/destinations/search?${search.toString()}`);
}

async function getReachableStops({ originStopId, placeId }) {
  if (API_MODE === "mock") {
    await wait(MOCK_DELAY_MS);
    const response = reachableStopMocks[placeId];
    if (!response) throw new Error(`등록되지 않은 Mock 장소: ${placeId}`);
    return clone(response);
  }

  const search = new URLSearchParams({ originStopId });
  return request(`/api/v1/places/${encodeURIComponent(placeId)}/reachable-stops?${search.toString()}`);
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
  searchDestinations,
  getReachableStops,
  getJourneyPrediction,
};
