import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  const source = await fs.readFile(path.join(ROOT, relativePath), "utf8");
  return JSON.parse(source);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateRoadview(stop) {
  assert(stop.roadview && typeof stop.roadview.available === "boolean", `${stop.stopId}: roadview.available 필요`);
  if (stop.roadview.available) {
    assert(stop.roadview.imageUrl, `${stop.stopId}: roadview.imageUrl 필요`);
    assert(stop.roadview.altText, `${stop.stopId}: roadview.altText 필요`);
    assert(stop.roadview.capturedAtLabel, `${stop.stopId}: roadview.capturedAtLabel 필요`);
  }
}

function validateStop(stop, { requireWalking = false } = {}) {
  assert(stop.stopId && stop.stopName, "정류장 ID와 이름 필요");
  assert(stop.directionDescription && stop.landmark, `${stop.stopId}: 방향과 랜드마크 필요`);
  assert(Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude), `${stop.stopId}: 좌표 필요`);
  assert(stop.directRouteCount === stop.servedRouteIds.length, `${stop.stopId}: 직행 노선 수 불일치`);
  if (requireWalking) {
    assert(Number.isInteger(stop.walkMinutes) && stop.walkMinutes >= 0, `${stop.stopId}: 도보 시간 오류`);
    assert(Number.isInteger(stop.distanceMeters) && stop.distanceMeters >= 0, `${stop.stopId}: 도보 거리 오류`);
  }
  validateRoadview(stop);
}

function validatePrediction(prediction, destinationStop) {
  assert(prediction.destinationStopId === destinationStop.stopId, `${destinationStop.stopId}: 예측 도착지 ID 불일치`);
  assert(Array.isArray(prediction.routes) && prediction.routes.length > 0, `${destinationStop.stopId}: 도착 버스 필요`);

  const tripIds = new Set();
  for (const route of prediction.routes) {
    assert(!tripIds.has(route.tripId), `${destinationStop.stopId}: tripId 중복 ${route.tripId}`);
    tripIds.add(route.tripId);
    assert(destinationStop.servedRouteIds.includes(route.routeId), `${route.tripId}: 도착 정류장 노선 목록과 불일치`);
    assert(Number.isInteger(route.arrivalMinutes) && route.arrivalMinutes >= 0, `${route.tripId}: 도착시간 오류`);
    assert(Number.isInteger(route.travelMinutes) && route.travelMinutes >= 0, `${route.tripId}: 이동시간 오류`);

    if (prediction.status === "SUCCESS") {
      assert(Array.isArray(route.segments) && route.segments.length > 0, `${route.tripId}: 구간 정보 필요`);
      const travelMinutes = route.segments.reduce((sum, segment) => sum + segment.durationMinutes, 0);
      const burdenMinutes = route.segments.reduce(
        (sum, segment) => sum + (segment.congestionLevel === "RELAXED" ? 0 : segment.durationMinutes),
        0,
      );
      assert(travelMinutes === route.travelMinutes, `${route.tripId}: 구간 합 ${travelMinutes} != 이동시간 ${route.travelMinutes}`);
      assert(burdenMinutes === route.standingBurdenMinutes, `${route.tripId}: 입석 부담시간 불일치`);
      assert(route.segments[0].fromStopId === prediction.originStopId, `${route.tripId}: 첫 구간 출발지 불일치`);
      assert(route.segments.at(-1).toStopId === prediction.destinationStopId, `${route.tripId}: 마지막 구간 도착지 불일치`);
      for (let index = 1; index < route.segments.length; index += 1) {
        assert(
          route.segments[index - 1].toStopId === route.segments[index].fromStopId,
          `${route.tripId}: ${index}번째 구간이 이어지지 않음`,
        );
      }
    } else {
      assert(route.segments === undefined, `${route.tripId}: 데이터 부족 응답에 segments 포함`);
      assert(route.standingBurdenMinutes === undefined, `${route.tripId}: 데이터 부족 응답에 입석 부담시간 포함`);
      assert(route.standingBurdenLevel === undefined, `${route.tripId}: 데이터 부족 응답에 입석 부담단계 포함`);
    }
  }

  return prediction.routes.length;
}

const bootstrap = await readJson("src/mocks/bootstrap.json");
const search = await readJson("src/mocks/destination-search.json");
const reachableFiles = [
  "src/mocks/reachable-stops/bomun-station.json",
  "src/mocks/reachable-stops/seoul-cityhall.json",
];
const predictionFiles = new Map([
  ["stop-bomun-exit2", "src/mocks/predictions/bomun.json"],
  ["stop-bomun-community-center", "src/mocks/predictions/bomun-community.json"],
  ["stop-cityhall-front", "src/mocks/predictions/cityhall.json"],
]);

assert(bootstrap.currentStop?.stopId, "bootstrap.currentStop 필요");
assert(Array.isArray(bootstrap.recentDestinations), "bootstrap.recentDestinations 필요");
for (const result of [...bootstrap.recentDestinations, ...search.results]) {
  assert(["PLACE", "STOP"].includes(result.type), "검색 결과 type 오류");
  if (result.type === "PLACE") {
    assert(result.placeId && result.name && result.address, "장소 ID, 이름, 주소 필요");
  } else {
    validateStop(result.stop);
  }
}

let stopCount = 0;
let tripCount = 0;
for (const relativePath of reachableFiles) {
  const response = await readJson(relativePath);
  assert(response.place?.placeId, `${relativePath}: place 필요`);
  assert(Array.isArray(response.stops), `${relativePath}: stops 필요`);
  for (let index = 0; index < response.stops.length; index += 1) {
    const stop = response.stops[index];
    validateStop(stop, { requireWalking: true });
    if (index > 0) {
      assert(response.stops[index - 1].distanceMeters <= stop.distanceMeters, `${response.place.placeId}: 거리순 정렬 오류`);
    }
    const predictionPath = predictionFiles.get(stop.stopId);
    assert(predictionPath, `${stop.stopId}: 예측 Mock 파일 매핑 필요`);
    tripCount += validatePrediction(await readJson(predictionPath), stop);
    stopCount += 1;
  }
}

console.log(`Mock data validation passed: ${stopCount} destination stops, ${tripCount} trips.`);
