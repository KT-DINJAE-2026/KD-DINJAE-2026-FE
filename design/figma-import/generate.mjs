import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROADVIEW_PATH = path.resolve(OUT_DIR, "../../public/images/stop-preview/bomun-stop.webp");
const ROADVIEW_DATA = `data:image/webp;base64,${(await fs.readFile(ROADVIEW_PATH)).toString("base64")}`;
const W = 390;
const H = 844;
const TYPE_SCALE = 1.125;

const C = {
  page: "#F4F5F5",
  surface: "#FFFFFF",
  text: "#191919",
  subtext: "#555555",
  muted: "#5F5F5F",
  border: "#E5E5E5",
  blue: "#B8560A",
  blueText: "#9C4708",
  blueSoft: "#FFF0E6",
  green: "#2F7248",
  greenSoft: "#EAF4ED",
  amber: "#B86E00",
  amberSoft: "#FFF4D6",
  red: "#C83D3D",
  redSoft: "#FBECEC",
};

const esc = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

function rect(x, y, width, height, fill, radius = 8, stroke = "none", strokeWidth = 1) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

function line(x1, y1, x2, y2, stroke, strokeWidth = 2, dash = "") {
  const dashed = dash ? ` stroke-dasharray="${dash}"` : "";
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"${dashed}/>`;
}

function circle(cx, cy, r, fill, stroke = "none", strokeWidth = 1) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

function bitmap(x, y, width, height, dataUrl, clipId) {
  return [
    `<defs><clipPath id="${clipId}">${rect(x, y, width, height, C.surface, 8)}</clipPath></defs>`,
    `<image x="${x}" y="${y}" width="${width}" height="${height}" href="${dataUrl}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`,
  ].join("\n");
}

function typeSize(size) {
  return Number((size * TYPE_SCALE).toFixed(2));
}

function text(x, y, value, size = 16, weight = 500, color = C.text, options = {}) {
  const anchor = options.anchor || "start";
  const baseline = options.baseline || "middle";
  return `<text x="${x}" y="${y}" font-family="Noto Sans CJK KR, Malgun Gothic, sans-serif" font-size="${typeSize(size)}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" dominant-baseline="${baseline}" letter-spacing="0">${esc(value)}</text>`;
}

function multiline(x, y, lines, size = 16, weight = 500, color = C.text, lineHeight = 1.4, options = {}) {
  const anchor = options.anchor || "start";
  const scaledSize = typeSize(size);
  const spans = lines.map((value, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : Math.round(scaledSize * lineHeight)}">${esc(value)}</tspan>`).join("");
  return `<text x="${x}" y="${y}" font-family="Noto Sans CJK KR, Malgun Gothic, sans-serif" font-size="${scaledSize}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" letter-spacing="0">${spans}</text>`;
}

function icon(name, x, y, size = 24, color = C.text, strokeWidth = 2) {
  const scale = size / 24;
  const common = `fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"`;
  const paths = {
    arrowLeft: `<path d="M19 12H5M12 19l-7-7 7-7" ${common}/>` ,
    arrowRight: `<path d="M5 12h14M12 5l7 7-7 7" ${common}/>` ,
    chevronRight: `<path d="m9 18 6-6-6-6" ${common}/>` ,
    search: `<circle cx="11" cy="11" r="8" ${common}/><path d="m21 21-4.35-4.35" ${common}/>` ,
    check: `<path d="m5 12 4 4L19 6" ${common}/>` ,
    refresh: `<path d="M20 11a8.1 8.1 0 1 0 2.2 5.5M20 4v7h-7" ${common}/>` ,
    pin: `<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" ${common}/><circle cx="12" cy="10" r="2.5" ${common}/>` ,
    clock: `<circle cx="12" cy="12" r="9" ${common}/><path d="M12 7v5l3 2" ${common}/>` ,
    info: `<circle cx="12" cy="12" r="9" ${common}/><path d="M12 11v5M12 8h.01" ${common}/>` ,
    alert: `<path d="M10.3 3.8 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" ${common}/><path d="M12 9v4M12 17h.01" ${common}/>` ,
    bus: `<rect x="4" y="3" width="16" height="16" rx="3" ${common}/><path d="M4 11h16M8 19v2M16 19v2" ${common}/><circle cx="8" cy="15" r="1" fill="${color}"/><circle cx="16" cy="15" r="1" fill="${color}"/>` ,
    building: `<path d="M4 21V5l8-3 8 3v16M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h6M2 21h20" ${common}/>` ,
    walk: `<circle cx="12" cy="4" r="2" ${common}/><path d="m10 22 1-6-3-3 2-5 4 3 3 1M14 11l-2 5 4 6" ${common}/>` ,
    map: `<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" ${common}/><path d="M9 3v15M15 6v15" ${common}/>` ,
  };
  return `<g transform="translate(${x} ${y}) scale(${scale})">${paths[name]}</g>`;
}

function screen(name, content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(name)}">
  <title>${esc(name)}</title>
  ${rect(0, 0, W, H, C.surface, 0)}
  ${content}
</svg>\n`;
}

function currentStop() {
  return [
    rect(24, 24, 185, 72, C.blueSoft, 8),
    circle(42, 49, 5, C.blue),
    text(56, 46, "성북구청 정류장", 18, 700, C.blueText),
    text(56, 75, "보문역·종로 방면", 16, 600, C.blueText),
  ].join("\n");
}

function header(title = "성북구청 정류장") {
  return [
    rect(20, 24, 52, 52, C.page, 8),
    icon("arrowLeft", 33, 37, 26, C.text),
    text(366, 50, title, 16, 700, C.subtext, { anchor: "end" }),
  ].join("\n");
}

function primaryButton(y, label, width = 342, x = 24) {
  return [
    rect(x, y, width, 64, C.blue, 8),
    text(x + width / 2, y + 32, label, 19, 700, C.surface, { anchor: "middle" }),
  ].join("\n");
}

function resultRow(y, type, title, detail) {
  const isPlace = type === "장소";
  return [
    rect(24, y, 342, 112, C.page, 8),
    circle(54, y + 58, 19, C.surface),
    icon(isPlace ? "building" : "bus", 44, y + 48, 20, isPlace ? C.blue : C.green),
    rect(84, y + 12, isPlace ? 46 : 60, 26, isPlace ? "#FFE4D1" : C.greenSoft, 5),
    text(84 + (isPlace ? 23 : 30), y + 25, type, 16, 800, isPlace ? C.blueText : C.green, { anchor: "middle" }),
    text(84, y + 57, title, 20, 700),
    text(84, y + 88, detail, 16, 600, C.subtext),
    icon("chevronRight", 330, y + 47, 22, C.muted),
  ].join("\n");
}

function nearbyStopCard(y, options) {
  const { title, detail, walk, routeCount, distance, nearest = false } = options;
  return [
    rect(24, y, 342, 180, C.surface, 8, nearest ? C.blue : C.border, nearest ? 2 : 1),
    rect(42, y + 14, 60, 26, C.greenSoft, 5),
    text(72, y + 27, "정류장", 16, 800, C.green, { anchor: "middle" }),
    nearest ? rect(110, y + 14, 88, 26, C.blueSoft, 5) : "",
    nearest ? text(154, y + 27, "가장 가까움", 16, 800, C.blueText, { anchor: "middle" }) : "",
    text(42, y + 64, title, 21, 800),
    text(42, y + 94, detail, 16, 600, C.subtext),
    line(42, y + 116, 348, y + 116, C.border, 1),
    icon("walk", 42, y + 132, 19, C.blue),
    text(70, y + 142, walk, 16, 700, C.subtext),
    icon("bus", 202, y + 132, 19, C.blue),
    text(230, y + 142, routeCount, 16, 700, C.subtext),
    text(310, y + 166, distance, 16, 800, C.blueText, { anchor: "end" }),
    icon("chevronRight", 328, y + 154, 20, C.blue),
  ].join("\n");
}

function confirmMap(x, y, width, height, stopName, landmark) {
  return [
    rect(x, y, width, height, "#EEF1EE", 8),
    `<path d="M${x - 12} ${y + 150}L${x + width + 12} ${y + 105}" stroke="#FFFFFF" stroke-width="58"/>`,
    `<path d="M${x + 65} ${y - 12}L${x + 118} ${y + height + 12}" stroke="#FFFFFF" stroke-width="45"/>`,
    line(x + 72, y + 148, x + 265, y + 120, C.blue, 7),
    circle(x + 245, y + 122, 24, C.blue, C.surface, 4),
    icon("pin", x + 235, y + 112, 20, C.surface, 2.2),
    rect(x + 80, y + 150, 238, 34, C.surface, 5, C.border),
    text(x + 199, y + 167, stopName, 16, 800, C.text, { anchor: "middle" }),
    rect(x + 160, y + 28, 158, 32, C.surface, 5, C.border),
    text(x + 239, y + 44, landmark, 16, 700, C.green, { anchor: "middle" }),
  ].join("\n");
}

function metric(x, y, label, value, valueColor = C.text) {
  return [
    text(x, y, label, 16, 600, C.subtext),
    text(x, y + 30, value, 20, 800, valueColor),
  ].join("\n");
}

function routeCard(y, options) {
  const {
    route,
    meta,
    badge,
    badgeFill,
    badgeColor,
    wait,
    total,
    seatTime,
    seatTimeColor,
    description,
    recommended = false,
  } = options;
  const badgeX = route.length >= 5 ? 154 : 132;
  const badgeWidth = badge === "빠른 도착" ? 100 : 130;
  return [
    rect(24, y, 342, 184, C.surface, 8, recommended ? C.blue : C.border, recommended ? 2 : 1),
    text(42, y + 30, route, 28, 800),
    badge ? rect(badgeX, y + 13, badgeWidth, 36, badgeFill, 6) : "",
    badge ? text(badgeX + badgeWidth / 2, y + 31, badge, 16, 800, badgeColor, { anchor: "middle" }) : "",
    text(42, y + 66, meta, 16, 600, C.subtext),
    metric(42, y + 96, "버스 도착", wait, C.blue),
    metric(142, y + 96, "전체 소요", total),
    metric(246, y + 96, "앉기 편한 시간", seatTime, seatTimeColor),
    line(42, y + 154, 348, y + 154, C.border, 1),
    text(42, y + 172, description, 16, 600, C.subtext),
    icon("chevronRight", 328, y + 160, 20, recommended ? C.blue : C.muted),
  ].join("\n");
}

function fastRouteCard(y, options) {
  const { route, meta, badge, wait, total, description, recommended = false } = options;
  return [
    rect(24, y, 342, 184, C.surface, 8, recommended ? C.blue : C.border, recommended ? 2 : 1),
    text(42, y + 30, route, 28, 800),
    badge ? rect(132, y + 13, 100, 36, C.blueSoft, 6) : "",
    badge ? text(182, y + 31, badge, 16, 800, C.blueText, { anchor: "middle" }) : "",
    text(42, y + 66, meta, 16, 600, C.subtext),
    metric(42, y + 96, "버스 도착", wait, C.blue),
    metric(146, y + 96, "전체 소요", total),
    metric(250, y + 96, "좌석 정보", "확인 어려움", C.muted),
    line(42, y + 154, 348, y + 154, C.border, 1),
    text(42, y + 172, description, 16, 600, C.subtext),
    icon("chevronRight", 326, y + 160, 22, recommended ? C.blue : C.muted),
  ].join("\n");
}

const screens = [
  {
    file: "01-destination-search.svg",
    title: "01 장소·정류장 검색",
    svg: screen("장소 또는 도착 정류장 검색 화면", [
      currentStop(),
      multiline(24, 146, ["어디까지", "가세요?"], 40, 800, C.text, 1.2),
      text(24, 254, "장소나 도착 정류장 이름을 입력해주세요.", 18, 500, C.subtext),
      rect(24, 286, 342, 72, C.page, 8),
      icon("search", 44, 310, 24, C.subtext),
      text(82, 322, "예: 보문역 또는 서울시청 앞", 16, 500, C.muted),
      text(24, 400, "검색 결과 2개", 18, 700, C.subtext),
      resultRow(426, "장소", "보문역", "서울 성북구 보문로"),
      resultRow(550, "정류장", "보문역 2번 출구 정류장", "신설동 방면 · 보문역 2번 출구 앞"),
      primaryButton(752, "검색하기"),
    ].join("\n")),
  },
  {
    file: "02-nearby-stops.svg",
    title: "02 주변 정류장 선택",
    svg: screen("목적지 주변의 직행 가능한 정류장 선택 화면", [
      header("도착 정류장 찾기"),
      icon("pin", 24, 100, 20, C.blue),
      text(54, 110, "보문역", 17, 800, C.blueText),
      multiline(24, 150, ["어느 정류장에서", "내릴까요?"], 34, 800, C.text, 1.25),
      text(24, 246, "서울 성북구 보문로", 17, 500, C.subtext),
      rect(24, 276, 342, 84, C.blueSoft, 8),
      icon("bus", 42, 306, 22, C.blue),
      multiline(78, 298, ["성북구청에서 바로 갈 수 있는", "정류장이에요."], 16, 700, C.subtext, 1.4),
      nearbyStopCard(378, {
        title: "보문역 2번 출구 정류장",
        detail: "신설동 방면 · 보문역 2번 출구 앞",
        walk: "보문역까지 도보 2분",
        routeCount: "직행 4개",
        distance: "약 120m",
        nearest: true,
      }),
      nearbyStopCard(574, {
        title: "보문동 주민센터 정류장",
        detail: "신설동 방면 · 주민센터 맞은편",
        walk: "보문역까지 도보 5분",
        routeCount: "직행 2개",
        distance: "약 340m",
      }),
    ].join("\n")),
  },
  {
    file: "03-stop-confirm.svg",
    title: "03 정류장 모습 확인",
    svg: screen("정류장 모습과 방향 확인 화면", [
      header("도착 정류장 확인"),
      multiline(24, 112, ["이 정류장이", "맞나요?"], 34, 800, C.text, 1.25),
      text(24, 208, "정류장 모습과 방향을 확인해주세요.", 17, 500, C.subtext),
      rect(24, 234, 342, 60, "#ECEEEE", 8),
      rect(28, 238, 165, 52, C.surface, 6),
      icon("building", 58, 254, 20, C.blue),
      text(122, 264, "정류장 모습", 16, 800, C.blueText, { anchor: "middle" }),
      icon("map", 230, 254, 20, C.subtext),
      text(296, 264, "지도", 16, 800, C.subtext, { anchor: "middle" }),
      bitmap(24, 306, 342, 224, ROADVIEW_DATA, "roadview-confirm"),
      rect(38, 484, 116, 32, "#303030", 5),
      text(96, 500, "정류장 모습 예시", 16, 800, C.surface, { anchor: "middle" }),
      text(24, 568, "보문역 2번 출구 정류장", 24, 800),
      icon("arrowRight", 26, 602, 20, C.blue),
      text(58, 612, "가는 방향", 16, 700, C.subtext),
      text(170, 612, "신설동·동대문 방면", 16, 800),
      icon("pin", 26, 638, 20, C.blue),
      text(58, 648, "가까운 곳", 16, 700, C.subtext),
      text(170, 648, "보문역 2번 출구 앞", 16, 800),
      icon("walk", 26, 674, 20, C.blue),
      text(58, 684, "내린 다음", 16, 700, C.subtext),
      text(170, 684, "보문역까지 도보 2분", 16, 800),
      rect(24, 708, 342, 42, C.blueSoft, 8),
      icon("bus", 42, 719, 20, C.blue),
      text(76, 729, "성북구청에서 바로 가는 버스 4개", 16, 700, C.subtext),
      primaryButton(764, "이 정류장으로 가기"),
    ].join("\n")),
  },
  {
    file: "03-stop-confirm-map.svg",
    title: "03-A 지도 확인·사진 없음",
    svg: screen("정류장 모습이 없을 때 지도 확인 화면", [
      header("도착 정류장 확인"),
      multiline(24, 112, ["이 정류장이", "맞나요?"], 34, 800, C.text, 1.25),
      text(24, 208, "정류장 모습과 방향을 확인해주세요.", 17, 500, C.subtext),
      rect(24, 234, 342, 60, "#ECEEEE", 8),
      icon("building", 58, 254, 20, C.muted),
      text(122, 264, "정류장 모습", 16, 800, C.muted, { anchor: "middle" }),
      rect(197, 238, 165, 52, C.surface, 6),
      icon("map", 230, 254, 20, C.blue),
      text(296, 264, "지도", 16, 800, C.blueText, { anchor: "middle" }),
      confirmMap(24, 306, 342, 224, "보문동 주민센터 정류장", "주민센터 맞은편"),
      rect(38, 484, 292, 32, "#303030", 5),
      text(184, 500, "정류장 모습이 없어 지도 안내", 16, 800, C.surface, { anchor: "middle" }),
      text(24, 568, "보문동 주민센터 정류장", 24, 800),
      icon("arrowRight", 26, 602, 20, C.blue),
      text(58, 612, "가는 방향", 16, 700, C.subtext),
      text(170, 612, "신설동 방면", 16, 800),
      icon("pin", 26, 638, 20, C.blue),
      text(58, 648, "가까운 곳", 16, 700, C.subtext),
      text(170, 648, "주민센터 맞은편", 16, 800),
      icon("walk", 26, 674, 20, C.blue),
      text(58, 684, "내린 다음", 16, 700, C.subtext),
      text(170, 684, "보문역까지 도보 5분", 16, 800),
      rect(24, 708, 342, 42, C.blueSoft, 8),
      icon("bus", 42, 719, 20, C.blue),
      text(76, 729, "성북구청에서 바로 가는 버스 2개", 16, 700, C.subtext),
      primaryButton(764, "이 정류장으로 가기"),
    ].join("\n")),
  },
  {
    file: "04-analyzing.svg",
    title: "04 버스 분석 중",
    svg: screen("버스 혼잡도 분석 중 화면", [
      header("보문역 2번 출구 정류장"),
      circle(195, 184, 54, C.blueSoft),
      circle(195, 184, 33, "none", C.blue, 6),
      line(195, 151, 195, 164, C.surface, 6),
      multiline(195, 280, ["두 정류장을 잇는 버스를", "비교하고 있어요"], 30, 800, C.text, 1.35, { anchor: "middle" }),
      text(195, 370, "성북구청에서 출발해요.", 18, 500, C.subtext, { anchor: "middle" }),
      rect(40, 414, 310, 232, C.page, 8),
      circle(72, 462, 14, C.green),
      icon("check", 64, 454, 16, C.surface, 2.5),
      text(102, 462, "두 정류장 운행 버스 확인", 18, 700),
      line(72, 480, 72, 516, C.border, 2),
      circle(72, 534, 14, C.blueSoft, C.blue, 2),
      circle(72, 534, 5, C.blue),
      text(102, 534, "구간별 탑승 인원 예측", 18, 700, C.blueText),
      line(72, 552, 72, 582, C.border, 2),
      circle(72, 598, 14, C.surface, C.border, 2),
      text(102, 598, "앉기 편한 시간과 도착시간 비교", 18, 600, C.muted),
      multiline(195, 774, ["과거 승하차 패턴과 현재 운행 정보를", "함께 사용해요."], 16, 600, C.subtext, 1.45, { anchor: "middle" }),
    ].join("\n")),
  },
  {
    file: "05-compare.svg",
    title: "05 버스 비교",
    svg: screen("앉기 편한 시간과 빠른 도착 버스 비교 화면", [
      header("보문역 2번 출구 정류장"),
      text(24, 110, "어떤 버스가", 33, 800),
      text(24, 152, "더 나을까요?", 33, 800),
      text(24, 190, "도착 예정 버스 4대를 비교했어요.", 16, 500, C.subtext),
      rect(24, 210, 342, 104, C.blueSoft, 8),
      icon("info", 42, 246, 22, C.blue),
      multiline(76, 228, ["1112번은 5분 늦지만", "앉기 편한 시간이 약 10분 더 길어요.", "여유 구간 기준 · 좌석 보장 아님"], 16, 700, C.subtext, 1.45),
      routeCard(326, {
        route: "1112번",
        meta: "보문역·신설동 방면 · 저상버스",
        badge: "입석 부담 적음",
        badgeFill: C.greenSoft,
        badgeColor: C.green,
        wait: "5분 후",
        total: "약 20분",
        seatTime: "약 12분",
        seatTimeColor: C.green,
        description: "성북소방서부터 여유 예상",
        recommended: true,
      }),
      routeCard(524, {
        route: "95번",
        meta: "보문역·동대문 방면 · 일반버스",
        badge: "빠른 도착",
        badgeFill: C.blueSoft,
        badgeColor: C.blueText,
        wait: "3분 후",
        total: "약 15분",
        seatTime: "약 2분",
        seatTimeColor: C.green,
        description: "보문역까지 혼잡 구간이 길어요",
        recommended: true,
      }),
      rect(24, 722, 342, 68, C.page, 8),
      icon("clock", 42, 745, 22, C.subtext),
      text(78, 756, "예측 기준 · 평일 오후 2시 승하차 패턴", 16, 600, C.subtext),
      multiline(195, 812, ["도착 및 혼잡 예측은 실제 운행 상황에 따라", "달라질 수 있어요."], 16, 600, C.subtext, 1.4, { anchor: "middle" }),
    ].join("\n")),
  },
  {
    file: "06-detail.svg",
    title: "06 구간별 상세",
    svg: screen("버스 구간별 혼잡도 상세 화면", [
      header("보문역 2번 출구"),
      text(24, 108, "1112번", 42, 800),
      text(24, 150, "보문역·신설동 방면 · 저상버스", 18, 600, C.subtext),
      rect(24, 174, 342, 126, C.greenSoft, 8),
      rect(40, 190, 130, 38, C.green, 6),
      text(105, 209, "입석 부담 낮음", 16, 800, C.surface, { anchor: "middle" }),
      text(40, 262, "성북소방서부터 여유 예상", 24, 800),
      rect(24, 316, 342, 126, C.page, 8),
      metric(40, 338, "버스 도착", "5분 후"),
      metric(205, 338, "버스 이동", "약 15분"),
      metric(40, 394, "전체 소요", "약 20분"),
      metric(205, 394, "앉기 편한 시간", "약 12분", C.green),
      rect(24, 454, 342, 80, C.blueSoft, 8),
      icon("info", 42, 483, 22, C.blue),
      multiline(78, 474, ["여유 예상 구간을 더한 시간이에요.", "실제 좌석을 보장하지는 않아요."], 16, 700, C.subtext, 1.45),
      text(24, 564, "구간별 예상", 24, 700, C.subtext),
      line(42, 596, 42, 796, C.border, 3),
      circle(42, 604, 8, C.amber),
      text(64, 594, "성북구청 → 성북소방서", 20, 700),
      text(64, 624, "3분 · 서서 갈 가능성 있음", 18, 600, C.amber),
      rect(300, 610, 66, 38, C.amberSoft, 6),
      text(333, 629, "보통", 16, 800, C.amber, { anchor: "middle" }),
      circle(42, 682, 8, C.green),
      text(64, 672, "성북소방서 → 성북경찰서", 20, 700),
      text(64, 702, "4분 · 앉을 가능성 높음", 18, 600, C.green),
      rect(300, 688, 66, 38, C.greenSoft, 6),
      text(333, 707, "여유", 16, 800, C.green, { anchor: "middle" }),
      circle(42, 760, 8, C.green),
      text(64, 750, "성북경찰서 → 보문역 2번 출구", 20, 700),
      text(64, 780, "8분 · 여유 예상", 18, 600, C.green),
      rect(300, 766, 66, 38, C.greenSoft, 6),
      text(333, 785, "여유", 16, 800, C.green, { anchor: "middle" }),
      text(195, 828, "버스 비교로 돌아가기", 18, 800, C.blue, { anchor: "middle" }),
    ].join("\n")),
  },
  {
    file: "06-detail-fast.svg",
    title: "06-A 빠른 버스 상세",
    svg: screen("빠른 도착 버스의 구간별 혼잡도 화면", [
      header("보문역 2번 출구"),
      text(24, 108, "95번", 42, 800),
      text(24, 150, "보문역·동대문 방면 · 일반버스", 18, 600, C.subtext),
      rect(24, 174, 342, 126, C.redSoft, 8),
      rect(40, 190, 130, 38, C.red, 6),
      text(105, 209, "입석 부담 높음", 16, 800, C.surface, { anchor: "middle" }),
      multiline(40, 258, ["보문역까지 혼잡 구간이", "길어요."], 24, 800, C.text, 1.2),
      rect(24, 316, 342, 126, C.page, 8),
      metric(40, 338, "버스 도착", "3분 후"),
      metric(205, 338, "버스 이동", "약 12분"),
      metric(40, 394, "전체 소요", "약 15분"),
      metric(205, 394, "앉기 편한 시간", "약 2분", C.green),
      rect(24, 454, 342, 80, C.amberSoft, 8),
      icon("alert", 42, 483, 22, C.amber, 2),
      multiline(78, 474, ["여유 예상 구간만 더한 시간이에요.", "혼잡 구간에서는 좌석 이용이 어려워요."], 16, 700, C.subtext, 1.45),
      text(24, 564, "구간별 예상", 24, 700, C.subtext),
      line(42, 596, 42, 796, C.border, 3),
      circle(42, 604, 8, C.red),
      text(64, 594, "성북구청 → 성북소방서", 20, 700),
      text(64, 624, "4분 · 몸이 닿을 수 있음", 18, 600, C.red),
      rect(300, 610, 66, 38, C.redSoft, 6),
      text(333, 629, "혼잡", 16, 800, C.red, { anchor: "middle" }),
      circle(42, 682, 8, C.amber),
      text(64, 672, "성북소방서 → 성북경찰서", 20, 700),
      text(64, 702, "6분 · 서서 갈 가능성 있음", 18, 600, C.amber),
      rect(300, 688, 66, 38, C.amberSoft, 6),
      text(333, 707, "보통", 16, 800, C.amber, { anchor: "middle" }),
      circle(42, 760, 8, C.green),
      text(64, 750, "성북경찰서 → 보문역 2번 출구", 20, 700),
      text(64, 780, "2분 · 앉을 가능성 높음", 18, 600, C.green),
      rect(300, 766, 66, 38, C.greenSoft, 6),
      text(333, 785, "여유", 16, 800, C.green, { anchor: "middle" }),
      text(195, 828, "버스 비교로 돌아가기", 18, 800, C.blue, { anchor: "middle" }),
    ].join("\n")),
  },
  {
    file: "05-compare-unavailable.svg",
    title: "05-B 혼잡도 데이터 부족",
    svg: screen("혼잡도 데이터가 부족한 버스 비교 화면", [
      header("서울시청 앞 정류장"),
      text(24, 110, "어떤 버스가", 33, 800),
      text(24, 152, "더 나을까요?", 33, 800),
      text(24, 190, "도착 예정 버스 4대를 비교했어요.", 16, 500, C.subtext),
      rect(24, 210, 342, 96, C.amberSoft, 8),
      icon("alert", 42, 243, 22, C.amber, 2),
      multiline(78, 230, ["아직 데이터가 부족해", "혼잡도는 예측하기 어려워요.", "빠른 도착순으로 보여드릴게요."], 16, 700, C.subtext, 1.42),
      fastRouteCard(320, {
        route: "101번",
        meta: "종로·시청 방면 · 저상버스",
        badge: "빠른 도착",
        wait: "4분 후",
        total: "약 22분",
        description: "지금 기준 가장 빨리 도착해요",
        recommended: true,
      }),
      fastRouteCard(518, {
        route: "102번",
        meta: "종로·시청 방면 · 저상버스",
        wait: "7분 후",
        total: "약 24분",
        description: "다음으로 빠르게 도착해요",
      }),
      rect(24, 716, 342, 68, C.page, 8),
      icon("refresh", 42, 739, 22, C.subtext),
      multiline(78, 738, ["혼잡도 데이터가 생기면", "자동으로 갱신해요."], 16, 600, C.subtext, 1.35),
      multiline(195, 808, ["도착 정보는 실제 운행 상황에 따라", "달라질 수 있어요."], 16, 600, C.subtext, 1.4, { anchor: "middle" }),
    ].join("\n")),
  },
  {
    file: "06-detail-unavailable.svg",
    title: "06-B 데이터 부족 상세",
    svg: screen("혼잡도 데이터가 부족한 버스 상세 화면", [
      header("서울시청 앞 정류장"),
      text(24, 108, "101번", 42, 800),
      text(24, 150, "종로·시청 방면 · 저상버스", 18, 600, C.subtext),
      rect(24, 174, 342, 126, C.blueSoft, 8),
      rect(40, 190, 108, 38, C.blue, 6),
      text(94, 209, "빠른 도착", 16, 800, C.surface, { anchor: "middle" }),
      text(40, 262, "4분 후 도착해요.", 24, 800),
      rect(24, 316, 342, 126, C.page, 8),
      metric(40, 338, "버스 도착", "4분 후", C.blue),
      metric(205, 338, "버스 이동", "약 18분"),
      metric(40, 394, "전체 소요", "약 22분"),
      metric(205, 394, "좌석 정보", "확인 어려움", C.muted),
      rect(24, 472, 342, 116, C.amberSoft, 8),
      icon("alert", 42, 506, 22, C.amber, 2),
      multiline(78, 492, ["아직 데이터가 부족해", "구간별 앉기 편한 시간은", "보여드리기 어려워요."], 16, 700, C.subtext, 1.5),
      text(195, 642, "다른 도착 버스 보기", 18, 800, C.blue, { anchor: "middle" }),
      multiline(195, 800, ["도착 정보는 실제 운행 상황에 따라", "달라질 수 있어요."], 16, 600, C.subtext, 1.4, { anchor: "middle" }),
    ].join("\n")),
  },
];

function flowCard(x, y, number, titleValue, detail, color = C.blue) {
  const detailLines = Array.isArray(detail) ? detail : [detail];
  const detailY = detailLines.length > 1 ? y + 100 : y + 102;
  return [
    rect(x, y, 220, 134, C.surface, 8, C.border),
    circle(x + 28, y + 28, 16, color),
    text(x + 28, y + 28, number, 16, 800, C.surface, { anchor: "middle" }),
    text(x + 24, y + 70, titleValue, 19, 800),
    multiline(x + 24, detailY, detailLines, 16, 500, C.subtext, 1.3),
  ].join("\n");
}

function flowArrow(x1, y, x2) {
  return [
    line(x1, y, x2, y, C.muted, 2),
    `<path d="M${x2 - 8} ${y - 6}L${x2} ${y}L${x2 - 8} ${y + 6}" fill="none" stroke="${C.muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  ].join("\n");
}

const flowSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1720" height="760" viewBox="0 0 1720 760" role="img" aria-label="사용자 흐름도">
  <title>교통약자 버스 서비스 사용자 흐름</title>
  ${rect(0, 0, 1720, 760, C.page, 0)}
  ${text(64, 70, "교통약자 버스 서비스 · 사용자 흐름", 32, 800)}
  ${text(64, 110, "QR로 출발 정류장을 확인한 뒤 목적지와 도착 정류장을 구분하고, 정류장 모습을 확인한 다음 버스를 비교합니다.", 16, 500, C.subtext)}
  ${rect(64, 148, 290, 38, C.blueSoft, 8)}
  ${icon("pin", 80, 157, 20, C.blue)}
  ${text(110, 167, "QR 확인 · 성북구청 정류장", 16, 700, C.blue)}
  ${flowCard(64, 236, "1", "목적지 검색", ["장소·정류장 유형", "구분"])}
  ${flowArrow(284, 303, 326)}
  ${flowCard(326, 236, "2", "주변 정류장", ["직행 가능한 곳만", "거리순 표시"])}
  ${flowArrow(546, 303, 588)}
  ${flowCard(588, 236, "3", "정류장 확인", ["정류장 모습·지도", "방향 확인"])}
  ${flowArrow(808, 303, 850)}
  ${flowCard(850, 236, "4", "여정 분석", ["운행 버스·탑승 인원", "예측"])}
  ${flowArrow(1070, 303, 1112)}
  ${flowCard(1112, 236, "5", "버스 비교", ["앉기 편한 시간", "빠른 도착 비교"])}
  ${flowArrow(1332, 303, 1374)}
  ${flowCard(1374, 236, "6", "구간별 상세", ["큰 글씨로 구간 정보", "확인"], C.green)}
  ${line(698, 370, 698, 474, C.muted, 2, "6 6")}
  <path d="M692 466L698 474L704 466" fill="none" stroke="${C.muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  ${flowCard(588, 474, "3-A", "사진 없음", ["지도·방향·랜드마크", "대체 안내"], C.muted)}
  ${line(1222, 370, 1222, 474, C.muted, 2, "6 6")}
  <path d="M1216 466L1222 474L1228 466" fill="none" stroke="${C.muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  ${flowCard(1112, 474, "5-B", "데이터 부족", "빠른 도착만 제공", C.muted)}
  ${flowArrow(1332, 541, 1374)}
  ${flowCard(1374, 474, "6-B", "도착 정보 상세", "혼잡도 없이 확인", C.muted)}
  ${text(64, 696, "Prototype · 정류장 직접 선택 시 2단계를 건너뛰고 3단계 확인 화면으로 이동", 16, 600, C.muted)}
</svg>\n`;

await fs.mkdir(OUT_DIR, { recursive: true });

const legacyFiles = [
  "01-arrivals", "02-destination", "03-confirm", "04-analyzing", "05-result",
  "01-arrivals.svg", "02-destination.svg", "03-confirm.svg", "04-analyzing.svg", "05-result.svg",
  "00-user-flow", "01-destination", "01-bus-select", "01-bus-select.svg", "01-destination-preferred", "01-destination-preferred.svg", "02-confirm", "02-alighting", "03-analyzing",
  "04-compare", "04-compare-fast", "04-compare-unavailable", "05-detail", "05-detail-fast", "05-detail-unavailable",
  "06-unavailable", "02-confirm.svg", "06-unavailable.svg",
  "01-destination.svg", "02-alighting.svg", "03-analyzing.svg",
  "04-compare.svg", "04-compare-fast.svg", "04-compare-unavailable.svg",
  "05-detail.svg", "05-detail-fast.svg", "05-detail-unavailable.svg",
  "03-compare-fast.svg",
  "01-destination-stop", "02-analyzing", "03-compare", "03-compare-unavailable",
  "04-detail", "04-detail-fast", "04-detail-unavailable",
  "01-destination-stop.svg", "02-analyzing.svg", "03-compare.svg", "03-compare-unavailable.svg",
  "04-detail.svg", "04-detail-fast.svg", "04-detail-unavailable.svg",
  "01-destination-search.svg", "02-nearby-stops.svg", "03-stop-confirm.svg", "03-stop-confirm-map.svg",
  "04-analyzing.svg", "05-compare.svg", "05-compare-unavailable.svg",
  "06-detail.svg", "06-detail-fast.svg", "06-detail-unavailable.svg",
];
await Promise.all(legacyFiles.map((file) => fs.rm(path.join(OUT_DIR, file), { force: true })));

await fs.writeFile(path.join(OUT_DIR, "00-user-flow.svg"), flowSvg, "utf8");
for (const item of screens) {
  await fs.writeFile(path.join(OUT_DIR, item.file), item.svg, "utf8");
}

const previewOrder = [
  "01-destination-search.svg",
  "02-nearby-stops.svg",
  "03-stop-confirm.svg",
  "03-stop-confirm-map.svg",
  "04-analyzing.svg",
  "05-compare.svg",
  "05-compare-unavailable.svg",
  "06-detail.svg",
  "06-detail-fast.svg",
  "06-detail-unavailable.svg",
];

const previewCards = [...screens].sort(
  (a, b) => previewOrder.indexOf(a.file) - previewOrder.indexOf(b.file),
).map((item) => `
  <figure>
    <img src="./${item.file}" alt="${item.title}">
    <figcaption>${item.title}</figcaption>
  </figure>`).join("");

const preview = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>교통약자 버스 서비스 · Figma 시안</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; background: #f0f0ef; color: #191919; font-family: "Noto Sans CJK KR", "Malgun Gothic", sans-serif; }
    h1 { margin: 0 0 8px; font-size: 28px; letter-spacing: 0; }
    p { margin: 0 0 28px; color: #555555; }
    .flow { display: block; width: min(100%, 1720px); margin-bottom: 36px; border: 1px solid #dddddd; }
    main { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 390px)); gap: 28px; align-items: start; }
    figure { margin: 0; }
    figure img { display: block; width: 100%; border: 1px solid #dddddd; box-shadow: 0 10px 30px rgba(25,25,25,.08); }
    figcaption { padding-top: 10px; font-size: 18px; font-weight: 700; }
  </style>
</head>
<body>
  <h1>교통약자 버스 서비스 · Figma 시안</h1>
  <p>장소 또는 정류장을 검색하고 실제 도착 정류장을 확인한 뒤, 해당 구간을 운행하는 버스를 비교하는 모바일 프로토타입입니다.</p>
  <img class="flow" src="./00-user-flow.svg" alt="사용자 흐름도">
  <main>${previewCards}</main>
</body>
</html>\n`;

await fs.writeFile(path.join(OUT_DIR, "index.html"), preview, "utf8");
console.log(`Generated flow map and ${screens.length} screens in ${OUT_DIR}`);
