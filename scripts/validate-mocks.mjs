import { readFile } from "node:fs/promises";

const loadJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const bootstrap = await loadJson("../src/mocks/bootstrap.json");
const predictions = await Promise.all([
  loadJson("../src/mocks/predictions/bomun.json"),
  loadJson("../src/mocks/predictions/sinseoldong.json"),
]);

const destinationById = new Map(
  bootstrap.destinationStops.map((destination) => [destination.stopId, destination]),
);

for (const prediction of predictions) {
  const context = `${prediction.originStopId} -> ${prediction.destinationStopId}`;
  const destination = destinationById.get(prediction.destinationStopId);

  assert(
    prediction.originStopId === bootstrap.currentStop.stopId,
    `${context}: 출발 정류장이 bootstrap과 다릅니다.`,
  );
  assert(destination, `${context}: bootstrap에 도착 정류장이 없습니다.`);

  const servedRouteIds = new Set(destination.servedRoutes.map((route) => route.routeId));
  const tripIds = new Set();

  for (const route of prediction.routes) {
    assert(servedRouteIds.has(route.routeId), `${context}: ${route.routeId}는 직통 노선 목록에 없습니다.`);
    assert(!tripIds.has(route.tripId), `${context}: ${route.tripId}가 중복됐습니다.`);
    tripIds.add(route.tripId);

    if (prediction.status !== "SUCCESS") continue;

    assert(route.segments?.length, `${context}: ${route.routeNumber}에 구간 정보가 없습니다.`);
    const durationTotal = route.segments.reduce((total, segment) => total + segment.durationMinutes, 0);
    const burdenTotal = route.segments.reduce(
      (total, segment) => total + (segment.congestionLevel === "RELAXED" ? 0 : segment.durationMinutes),
      0,
    );

    assert(durationTotal === route.travelMinutes, `${context}: ${route.routeNumber}의 구간 시간 합계가 다릅니다.`);
    assert(burdenTotal === route.standingBurdenMinutes, `${context}: ${route.routeNumber}의 입석 부담 시간 합계가 다릅니다.`);
    assert(route.segments[0].fromStopId === prediction.originStopId, `${context}: 첫 구간 출발지가 다릅니다.`);
    assert(route.segments.at(-1).toStopId === prediction.destinationStopId, `${context}: 마지막 구간 도착지가 다릅니다.`);

    for (let index = 1; index < route.segments.length; index += 1) {
      assert(
        route.segments[index - 1].toStopId === route.segments[index].fromStopId,
        `${context}: ${route.routeNumber}의 구간 순서가 이어지지 않습니다.`,
      );
    }
  }
}

console.log(`Mock 검증 완료: 정류장 ${destinationById.size}개, 예측 응답 ${predictions.length}개`);
