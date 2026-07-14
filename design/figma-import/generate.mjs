import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = path.dirname(fileURLToPath(import.meta.url));
const W = 390;
const H = 844;
const STREET_IMAGE_PATH = path.resolve(OUT_DIR, "assets/street-bomun.jpg");
const STREET_IMAGE_DATA = `data:image/jpeg;base64,${(await fs.readFile(STREET_IMAGE_PATH)).toString("base64")}`;

const C = {
  page: "#F4F5F5",
  surface: "#FFFFFF",
  text: "#191919",
  subtext: "#555555",
  muted: "#888888",
  border: "#E5E5E5",
  blue: "#B8560A",
  blueSoft: "#FFF0E6",
  green: "#2F7D4A",
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

function image(x, y, width, height, href, radius = 8) {
  const clipId = `clip-${x}-${y}-${width}-${height}`;
  return `<defs><clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}"/></clipPath></defs><image x="${x}" y="${y}" width="${width}" height="${height}" href="${href}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`;
}

function text(x, y, value, size = 16, weight = 500, color = C.text, options = {}) {
  const anchor = options.anchor || "start";
  const baseline = options.baseline || "middle";
  return `<text x="${x}" y="${y}" font-family="Noto Sans CJK KR, Malgun Gothic, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" dominant-baseline="${baseline}" letter-spacing="0">${esc(value)}</text>`;
}

function multiline(x, y, lines, size = 16, weight = 500, color = C.text, lineHeight = 1.4, options = {}) {
  const anchor = options.anchor || "start";
  const spans = lines.map((value, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : Math.round(size * lineHeight)}">${esc(value)}</tspan>`).join("");
  return `<text x="${x}" y="${y}" font-family="Noto Sans CJK KR, Malgun Gothic, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" letter-spacing="0">${spans}</text>`;
}

function icon(name, x, y, size = 24, color = C.text, strokeWidth = 2) {
  const scale = size / 24;
  const common = `fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"`;
  const paths = {
    arrowLeft: `<path d="M19 12H5M12 19l-7-7 7-7" ${common}/>` ,
    arrowRight: `<path d="M5 12h14M12 5l7 7-7 7" ${common}/>` ,
    chevronRight: `<path d="m9 18 6-6-6-6" ${common}/>` ,
    search: `<circle cx="11" cy="11" r="8" ${common}/><path d="m21 21-4.35-4.35" ${common}/>` ,
    mic: `<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" ${common}/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" ${common}/>` ,
    check: `<path d="m5 12 4 4L19 6" ${common}/>` ,
    refresh: `<path d="M20 11a8.1 8.1 0 1 0 2.2 5.5M20 4v7h-7" ${common}/>` ,
    pin: `<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" ${common}/><circle cx="12" cy="10" r="2.5" ${common}/>` ,
    clock: `<circle cx="12" cy="12" r="9" ${common}/><path d="M12 7v5l3 2" ${common}/>` ,
    bus: `<rect x="4" y="3" width="16" height="16" rx="3" ${common}/><path d="M4 11h16M8 19v2M16 19v2M8 7h.01M16 7h.01" ${common}/>` ,
    info: `<circle cx="12" cy="12" r="9" ${common}/><path d="M12 11v5M12 8h.01" ${common}/>` ,
    alert: `<path d="M10.3 3.8 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" ${common}/><path d="M12 9v4M12 17h.01" ${common}/>` ,
    image: `<rect x="3" y="5" width="18" height="14" rx="2" ${common}/><circle cx="8.5" cy="10" r="1.5" ${common}/><path d="m21 15-5-5L5 19" ${common}/>` ,
    walk: `<circle cx="12" cy="4" r="2" ${common}/><path d="m10 22 1-7-2-2-1 4M14 22l-1-6 3-3 2 4M8 12l3-4 4 3 3 1" ${common}/>` ,
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
    rect(24, 24, 150, 58, C.blueSoft, 8),
    circle(42, 44, 5, C.blue),
    text(56, 42, "성북구청 정류장", 14, 700, C.blue),
    text(56, 64, "보문역·종로 방면", 11, 500, C.blue),
  ].join("\n");
}

function header(title = "성북구청 정류장") {
  return [
    rect(20, 24, 48, 48, C.page, 8),
    icon("arrowLeft", 32, 36, 24, C.text),
    text(366, 48, title, 14, 700, C.subtext, { anchor: "end" }),
  ].join("\n");
}

function primaryButton(y, label, width = 342, x = 24) {
  return [
    rect(x, y, width, 56, C.blue, 8),
    text(x + width / 2, y + 28, label, 17, 700, C.surface, { anchor: "middle" }),
  ].join("\n");
}

function placeRow(y, title, detail) {
  return [
    rect(24, y, 342, 68, C.page, 8),
    circle(52, y + 34, 16, C.surface),
    icon("pin", 43, y + 25, 18, C.muted),
    text(80, y + 27, title, 16, 700),
    text(80, y + 49, detail, 13, 500, C.muted),
    icon("chevronRight", 330, y + 22, 22, C.muted),
  ].join("\n");
}

function metric(x, y, label, value, valueColor = C.text) {
  return [
    text(x, y, label, 12, 600, C.muted),
    text(x, y + 25, value, 16, 800, valueColor),
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
    burden,
    burdenColor,
    description,
    recommended = false,
  } = options;
  return [
    rect(24, y, 342, 154, C.surface, 8, recommended ? C.blue : C.border, recommended ? 2 : 1),
    text(42, y + 27, route, 23, 800),
    badge ? rect(112, y + 16, badge === "빠른 도착" ? 82 : 104, 28, badgeFill, 6) : "",
    badge ? text(badge === "빠른 도착" ? 153 : 164, y + 30, badge, 12, 800, badgeColor, { anchor: "middle" }) : "",
    text(42, y + 54, meta, 12, 500, C.muted),
    metric(42, y + 78, "버스 도착", wait, C.blue),
    metric(142, y + 78, "목적지까지", total),
    metric(252, y + 78, "입석 부담", burden, burdenColor),
    line(42, y + 124, 348, y + 124, C.border, 1),
    text(42, y + 142, description, 12, 600, C.subtext),
    icon("chevronRight", 328, y + 130, 20, recommended ? C.blue : C.muted),
  ].join("\n");
}

function fastRouteCard(y, options) {
  const { route, meta, badge, wait, total, description, recommended = false } = options;
  return [
    rect(24, y, 342, 146, C.surface, 8, recommended ? C.blue : C.border, recommended ? 2 : 1),
    text(42, y + 27, route, 23, 800),
    badge ? rect(112, y + 16, 78, 28, C.blueSoft, 6) : "",
    badge ? text(151, y + 30, badge, 12, 800, C.blue, { anchor: "middle" }) : "",
    text(42, y + 54, meta, 12, 500, C.muted),
    metric(42, y + 78, "버스 도착", wait, C.blue),
    metric(155, y + 78, "목적지까지", total),
    metric(274, y + 78, "혼잡도", "확인 어려움", C.muted),
    line(42, y + 116, 348, y + 116, C.border, 1),
    text(42, y + 134, description, 12, 600, C.subtext),
    icon("chevronRight", 326, y + 117, 22, recommended ? C.blue : C.muted),
  ].join("\n");
}

const screens = [
  {
    file: "01-destination.svg",
    title: "01 목적지 입력",
    svg: screen("목적지 입력 화면", [
      currentStop(),
      multiline(24, 136, ["어디까지", "가세요?"], 34, 800, C.text, 1.22),
      multiline(24, 230, ["장소를 입력하거나 마이크 버튼을 눌러", "말씀해주세요."], 15, 500, C.subtext, 1.5),
      rect(24, 292, 342, 64, C.page, 8),
      icon("search", 44, 313, 22, C.subtext),
      text(78, 324, "예: 보문역 2번 출구", 15, 500, C.muted),
      rect(314, 300, 44, 48, C.blueSoft, 8),
      icon("mic", 326, 312, 20, C.blue),
      text(24, 414, "최근 목적지", 14, 700, C.subtext),
      placeRow(440, "보문역 2번 출구", "지하철역 · 보문숲길도서관 인근"),
      placeRow(520, "서울시청", "공공기관 · 시청역 인근"),
      primaryButton(760, "목적지 찾기"),
    ].join("\n")),
  },
  {
    file: "02-alighting.svg",
    title: "02 하차 정류장 확인",
    svg: screen("목적지 주변 하차 정류장 확인 화면", [
      header("보문역 2번 출구"),
      multiline(24, 116, ["이 정류장에서", "내릴까요?"], 30, 800, C.text, 1.2),
      multiline(24, 204, ["목적지와 가깝고 이동하기 편한 곳을", "먼저 찾았어요."], 15, 500, C.subtext, 1.45),
      image(24, 258, 342, 228, STREET_IMAGE_DATA, 8),
      rect(36, 270, 116, 34, C.surface, 6),
      icon("image", 46, 278, 18, C.subtext),
      text(76, 287, "거리 사진 예시", 12, 700, C.subtext),
      text(24, 518, "추천 하차 정류장", 12, 800, C.blue),
      text(24, 548, "보문역 2번 출구 정류장", 22, 800),
      text(24, 578, "보문역 2번 출구와 엘리베이터 앞", 13, 500, C.subtext),
      rect(24, 610, 342, 52, C.page, 8),
      icon("walk", 42, 625, 20, C.blue),
      text(78, 636, "도보 2분", 14, 700),
      text(346, 636, "140m", 13, 700, C.subtext, { anchor: "end" }),
      text(195, 696, "다른 정류장 보기", 14, 700, C.blue, { anchor: "middle" }),
      rect(24, 730, 158, 56, C.page, 8),
      text(103, 758, "다시 찾기", 16, 700, C.text, { anchor: "middle" }),
      rect(194, 730, 172, 56, C.blue, 8),
      text(280, 758, "여기서 내려요", 16, 700, C.surface, { anchor: "middle" }),
      text(195, 814, "사진은 위치 확인을 돕는 프로토타입용 예시예요.", 10, 500, C.muted, { anchor: "middle" }),
    ].join("\n")),
  },
  {
    file: "03-analyzing.svg",
    title: "03 버스 분석 중",
    svg: screen("버스 혼잡도 분석 중 화면", [
      header("보문역 2번 출구 정류장"),
      circle(195, 184, 54, C.blueSoft),
      circle(195, 184, 33, "none", C.blue, 6),
      line(195, 151, 195, 164, C.surface, 6),
      multiline(195, 282, ["목적지까지 갈 버스를", "비교하고 있어요"], 27, 800, C.text, 1.35, { anchor: "middle" }),
      text(195, 364, "성북구청에서 출발해요.", 16, 500, C.subtext, { anchor: "middle" }),
      rect(44, 420, 302, 204, C.page, 8),
      circle(72, 462, 14, C.green),
      icon("check", 64, 454, 16, C.surface, 2.5),
      text(102, 462, "도착 예정 버스 확인", 16, 700),
      line(72, 480, 72, 516, C.border, 2),
      circle(72, 534, 14, C.blueSoft, C.blue, 2),
      circle(72, 534, 5, C.blue),
      text(102, 534, "구간별 탑승 인원 예측", 16, 700, C.blue),
      line(72, 552, 72, 582, C.border, 2),
      circle(72, 598, 14, C.surface, C.border, 2),
      text(102, 598, "입석 부담과 도착시간 비교", 16, 600, C.muted),
      text(195, 782, "과거 승하차 패턴과 현재 운행 정보를 함께 사용해요.", 12, 500, C.muted, { anchor: "middle" }),
    ].join("\n")),
  },
  {
    file: "04-compare.svg",
    title: "04 덜 붐비는 버스 비교",
    svg: screen("덜 붐비는 버스 비교 화면", [
      header("보문역 2번 출구 정류장"),
      text(24, 108, "어떤 버스가", 29, 800),
      text(24, 146, "더 나을까요?", 29, 800),
      rect(24, 184, 342, 44, C.page, 8),
      rect(28, 188, 167, 36, C.surface, 6),
      text(111, 206, "덜 붐비는 버스", 14, 800, C.blue, { anchor: "middle" }),
      text(280, 206, "빠른 도착", 14, 700, C.muted, { anchor: "middle" }),
      rect(24, 248, 342, 66, C.blueSoft, 8),
      icon("info", 42, 267, 20, C.blue),
      multiline(74, 270, ["1112번은 5분 늦지만", "입석 부담 예상 시간이 약 7분 짧아요."], 14, 700, C.subtext, 1.45),
      routeCard(334, {
        route: "1112번",
        meta: "보문역·신설동 방면 · 저상버스",
        badge: "입석 부담 적음",
        badgeFill: C.greenSoft,
        badgeColor: C.green,
        wait: "5분 후",
        total: "약 20분",
        burden: "약 3분",
        burdenColor: C.green,
        description: "성북소방서부터 여유 예상",
        recommended: true,
      }),
      routeCard(506, {
        route: "95번",
        meta: "보문역·동대문 방면 · 일반버스",
        wait: "3분 후",
        total: "약 15분",
        burden: "약 10분",
        burdenColor: C.red,
        description: "보문역까지 혼잡 구간이 길어요",
      }),
      rect(24, 684, 342, 56, C.page, 8),
      icon("clock", 42, 702, 20, C.subtext),
      text(74, 712, "예측 기준 · 평일 오후 2시 승하차 패턴", 13, 600, C.subtext),
      text(195, 790, "추천은 예상값이며 실제 운행 상황과 다를 수 있어요.", 11, 500, C.muted, { anchor: "middle" }),
    ].join("\n")),
  },
  {
    file: "04-compare-fast.svg",
    title: "04-A 빠른 도착 비교",
    svg: screen("빠른 도착 기준 버스 비교 화면", [
      header("보문역 2번 출구 정류장"),
      text(24, 108, "어떤 버스가", 29, 800),
      text(24, 146, "더 나을까요?", 29, 800),
      rect(24, 184, 342, 44, C.page, 8),
      text(111, 206, "덜 붐비는 버스", 14, 700, C.muted, { anchor: "middle" }),
      rect(195, 188, 167, 36, C.surface, 6),
      text(280, 206, "빠른 도착", 14, 800, C.blue, { anchor: "middle" }),
      rect(24, 248, 342, 66, C.blueSoft, 8),
      icon("clock", 42, 267, 20, C.blue),
      multiline(74, 270, ["95번은 목적지까지 약 15분", "지금 비교한 버스 중 가장 빨리 도착해요."], 14, 700, C.subtext, 1.45),
      routeCard(334, {
        route: "95번",
        meta: "보문역·동대문 방면 · 일반버스",
        badge: "빠른 도착",
        badgeFill: C.blueSoft,
        badgeColor: C.blue,
        wait: "3분 후",
        total: "약 15분",
        burden: "약 10분",
        burdenColor: C.red,
        description: "보문역까지 혼잡 구간이 길어요",
        recommended: true,
      }),
      routeCard(506, {
        route: "1112번",
        meta: "보문역·신설동 방면 · 저상버스",
        wait: "5분 후",
        total: "약 20분",
        burden: "약 3분",
        burdenColor: C.green,
        description: "성북소방서부터 여유 예상",
      }),
      rect(24, 684, 342, 56, C.page, 8),
      icon("clock", 42, 702, 20, C.subtext),
      text(74, 712, "예측 기준 · 평일 오후 2시 승하차 패턴", 13, 600, C.subtext),
      text(195, 790, "도착 정보는 실제 운행 상황에 따라 달라질 수 있어요.", 11, 500, C.muted, { anchor: "middle" }),
    ].join("\n")),
  },
  {
    file: "05-detail.svg",
    title: "05 구간별 상세",
    svg: screen("버스 구간별 혼잡도 상세 화면", [
      header("보문역 2번 출구"),
      text(24, 104, "1112번", 29, 800),
      text(24, 140, "보문역·신설동 방면 · 저상버스", 14, 500, C.subtext),
      rect(24, 174, 342, 112, C.greenSoft, 8),
      rect(40, 190, 100, 28, C.green, 6),
      text(90, 204, "입석 부담 낮음", 12, 800, C.surface, { anchor: "middle" }),
      text(40, 246, "성북소방서부터 여유 예상", 18, 800),
      rect(24, 302, 342, 76, C.page, 8),
      metric(40, 322, "버스 도착", "5분 후"),
      metric(148, 322, "목적지까지", "약 20분"),
      metric(268, 322, "입석 부담", "약 3분", C.green),
      text(24, 414, "구간별 예상", 14, 700, C.subtext),
      line(42, 448, 42, 628, C.border, 3),
      circle(42, 462, 8, C.amber),
      text(64, 454, "성북구청 → 성북소방서", 14, 700),
      text(64, 478, "3분 · 입석 이동 가능", 12, 600, C.amber),
      rect(300, 446, 66, 28, C.amberSoft, 6),
      text(333, 460, "보통", 12, 800, C.amber, { anchor: "middle" }),
      circle(42, 536, 8, C.green),
      text(64, 528, "성북소방서 → 성북경찰서", 14, 700),
      text(64, 552, "4분 · 좌석 이용 여건 개선 예상", 12, 600, C.green),
      rect(300, 520, 66, 28, C.greenSoft, 6),
      text(333, 534, "여유", 12, 800, C.green, { anchor: "middle" }),
      circle(42, 610, 8, C.green),
      text(64, 602, "성북경찰서 → 보문역 2번 출구", 14, 700),
      text(64, 626, "8분 · 여유 단계 유지 예상", 12, 600, C.green),
      rect(300, 594, 66, 28, C.greenSoft, 6),
      text(333, 608, "여유", 12, 800, C.green, { anchor: "middle" }),
      rect(24, 662, 342, 58, C.blueSoft, 8),
      icon("info", 42, 681, 20, C.blue),
      multiline(74, 680, ["여유는 좌석 이용 가능성이 상대적으로 높은", "단계이며 좌석을 보장하지는 않아요."], 12, 600, C.subtext, 1.45),
      text(195, 782, "버스 비교로 돌아가기", 15, 800, C.blue, { anchor: "middle" }),
    ].join("\n")),
  },
  {
    file: "05-detail-fast.svg",
    title: "05-A 빠른 버스 상세",
    svg: screen("빠른 도착 순서에서 확인한 버스의 구간별 혼잡도 화면", [
      header("보문역 2번 출구"),
      text(24, 104, "95번", 29, 800),
      text(24, 140, "보문역·동대문 방면 · 일반버스", 14, 500, C.subtext),
      rect(24, 174, 342, 112, C.redSoft, 8),
      rect(40, 190, 100, 28, C.red, 6),
      text(90, 204, "입석 부담 높음", 12, 800, C.surface, { anchor: "middle" }),
      text(40, 246, "보문역까지 혼잡 구간이 길어요.", 18, 800),
      rect(24, 302, 342, 76, C.page, 8),
      metric(40, 322, "버스 도착", "3분 후"),
      metric(148, 322, "목적지까지", "약 15분"),
      metric(268, 322, "입석 부담", "약 10분", C.red),
      text(24, 414, "구간별 예상", 14, 700, C.subtext),
      line(42, 448, 42, 628, C.border, 3),
      circle(42, 462, 8, C.red),
      text(64, 454, "성북구청 → 성북소방서", 14, 700),
      text(64, 478, "4분 · 신체 접촉이 발생할 수 있음", 12, 600, C.red),
      rect(300, 446, 66, 28, C.redSoft, 6),
      text(333, 460, "혼잡", 12, 800, C.red, { anchor: "middle" }),
      circle(42, 536, 8, C.amber),
      text(64, 528, "성북소방서 → 성북경찰서", 14, 700),
      text(64, 552, "6분 · 입석 이동 가능", 12, 600, C.amber),
      rect(300, 520, 66, 28, C.amberSoft, 6),
      text(333, 534, "보통", 12, 800, C.amber, { anchor: "middle" }),
      circle(42, 610, 8, C.green),
      text(64, 602, "성북경찰서 → 보문역 2번 출구", 14, 700),
      text(64, 626, "2분 · 좌석 이용 여건 개선 예상", 12, 600, C.green),
      rect(300, 594, 66, 28, C.greenSoft, 6),
      text(333, 608, "여유", 12, 800, C.green, { anchor: "middle" }),
      rect(24, 642, 342, 190, "#FFF8F3", 8, "#EFC6AA"),
      rect(42, 658, 40, 40, C.blueSoft, 8),
      icon("bus", 51, 667, 22, C.blue),
      text(96, 666, "다른 선택지도 있어요", 12, 800, C.blue),
      text(96, 690, "1112번은 5분 더 걸리지만", 16, 800),
      text(42, 724, "입석 부담 예상 시간이 약 7분 짧아요.", 14, 700, C.subtext),
      text(42, 750, "5분 후 도착 · 저상버스", 12, 600, C.muted),
      rect(42, 770, 306, 48, C.surface, 8, C.blue),
      text(195, 794, "1112번과 비교하기", 15, 800, C.blue, { anchor: "middle" }),
    ].join("\n")),
  },
  {
    file: "04-compare-unavailable.svg",
    title: "04-B 혼잡도 데이터 부족",
    svg: screen("혼잡도 데이터가 부족한 버스 비교 화면", [
      header("서울시청 인근 정류장"),
      text(24, 108, "어떤 버스가", 29, 800),
      text(24, 146, "더 나을까요?", 29, 800),
      rect(24, 184, 342, 44, C.page, 8),
      text(111, 206, "덜 붐비는 버스", 14, 700, C.muted, { anchor: "middle" }),
      rect(195, 188, 167, 36, C.surface, 6),
      text(280, 206, "빠른 도착", 14, 800, C.blue, { anchor: "middle" }),
      rect(24, 248, 342, 84, C.amberSoft, 8),
      icon("alert", 42, 278, 20, C.amber, 2),
      multiline(74, 266, ["아직 데이터가 부족해", "혼잡도는 예측하기 어려워요.", "빠른 도착순으로 보여드릴게요."], 14, 700, C.subtext, 1.45),
      fastRouteCard(348, {
        route: "101번",
        meta: "종로·시청 방면 · 저상버스",
        badge: "가장 빠름",
        wait: "4분 후",
        total: "약 22분",
        description: "지금 기준 가장 빨리 도착해요",
        recommended: true,
      }),
      fastRouteCard(510, {
        route: "102번",
        meta: "종로·시청 방면 · 저상버스",
        wait: "7분 후",
        total: "약 24분",
        description: "다음으로 빠르게 도착해요",
      }),
      rect(24, 680, 342, 56, C.page, 8),
      icon("refresh", 42, 698, 20, C.subtext),
      text(74, 708, "혼잡도 데이터가 생기면 자동으로 갱신해요.", 13, 600, C.subtext),
      text(195, 790, "도착 정보는 실제 운행 상황에 따라 달라질 수 있어요.", 11, 500, C.muted, { anchor: "middle" }),
    ].join("\n")),
  },
  {
    file: "05-detail-unavailable.svg",
    title: "05-B 데이터 부족 상세",
    svg: screen("혼잡도 데이터가 부족한 버스 상세 화면", [
      header("서울시청 앞 정류장"),
      text(24, 104, "101번", 29, 800),
      text(24, 140, "종로·시청 방면 · 저상버스", 14, 500, C.subtext),
      rect(24, 174, 342, 112, C.blueSoft, 8),
      rect(40, 190, 82, 28, C.blue, 6),
      text(81, 204, "빠른 도착", 12, 800, C.surface, { anchor: "middle" }),
      text(40, 246, "4분 후 도착해요.", 18, 800),
      rect(24, 302, 342, 76, C.page, 8),
      metric(40, 322, "버스 도착", "4분 후", C.blue),
      metric(148, 322, "목적지까지", "약 22분"),
      metric(268, 322, "입석 부담", "확인 어려움", C.muted),
      rect(24, 408, 342, 92, C.amberSoft, 8),
      icon("alert", 42, 432, 20, C.amber, 2),
      multiline(74, 426, ["아직 데이터가 부족해 구간별 입석 부담은", "보여드리기 어려워요."], 14, 700, C.subtext, 1.55),
      text(195, 554, "다른 도착 버스 보기", 15, 800, C.blue, { anchor: "middle" }),
      text(195, 790, "도착 정보는 실제 운행 상황에 따라 달라질 수 있어요.", 11, 500, C.muted, { anchor: "middle" }),
    ].join("\n")),
  },
];

function flowCard(x, y, number, titleValue, detail, color = C.blue) {
  return [
    rect(x, y, 220, 134, C.surface, 8, C.border),
    circle(x + 28, y + 28, 16, color),
    text(x + 28, y + 28, number, 13, 800, C.surface, { anchor: "middle" }),
    text(x + 24, y + 70, titleValue, 19, 800),
    text(x + 24, y + 102, detail, 13, 500, C.subtext),
  ].join("\n");
}

function flowArrow(x1, y, x2) {
  return [
    line(x1, y, x2, y, C.muted, 2),
    `<path d="M${x2 - 8} ${y - 6}L${x2} ${y}L${x2 - 8} ${y + 6}" fill="none" stroke="${C.muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  ].join("\n");
}

const flowSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="760" viewBox="0 0 1440 760" role="img" aria-label="사용자 흐름도">
  <title>교통약자 버스 서비스 사용자 흐름</title>
  ${rect(0, 0, 1440, 760, C.page, 0)}
  ${text(64, 70, "교통약자 버스 서비스 · 사용자 흐름", 32, 800)}
  ${text(64, 110, "QR로 출발지를 확정한 뒤, 목적지 주변의 하차 정류장과 실제 도착 버스를 비교합니다.", 16, 500, C.subtext)}
  ${rect(64, 148, 232, 38, C.blueSoft, 8)}
  ${icon("pin", 80, 157, 20, C.blue)}
  ${text(110, 167, "QR 확인 · 성북구청 정류장", 14, 700, C.blue)}
  ${flowCard(64, 236, "1", "목적지 입력", "장소 검색·음성 입력")}
  ${flowArrow(284, 303, 326)}
  ${flowCard(326, 236, "2", "하차 정류장 확인", "거리 사진·도보 거리 확인")}
  ${flowArrow(546, 303, 588)}
  ${flowCard(588, 236, "3", "여정 분석", "탑승 인원·운행 정보 예측")}
  ${flowArrow(808, 303, 850)}
  ${flowCard(850, 236, "4", "버스 비교", "덜 붐빔·빠른 도착 비교")}
  ${flowArrow(1070, 303, 1112)}
  ${flowCard(1112, 236, "5", "구간별 상세", "근거 확인·필요 시 재비교", C.green)}
  ${line(698, 370, 698, 474, C.muted, 2, "6 6")}
  <path d="M692 466L698 474L704 466" fill="none" stroke="${C.muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  ${flowCard(588, 474, "4-B", "데이터 부족", "빠른 도착만 제공", C.muted)}
  ${flowArrow(808, 541, 850)}
  ${flowCard(850, 474, "5-B", "도착 정보 상세", "혼잡도 없이 확인", C.muted)}
  ${rect(1112, 474, 220, 134, C.blueSoft, 8)}
  ${text(1140, 510, "대안 안내 원칙", 15, 800, C.blue)}
  ${multiline(1140, 548, ["부담 감소와 추가 시간을", "함께 보여준 뒤 재비교"], 14, 600, C.subtext, 1.55)}
  ${text(64, 696, "Prototype · 화면 전환은 즉시 연결  |  분석 화면만 약 800ms 뒤 결과 표시", 13, 600, C.muted)}
</svg>\n`;

await fs.mkdir(OUT_DIR, { recursive: true });

const legacyFiles = [
  "01-arrivals", "02-destination", "03-confirm", "04-analyzing", "05-result",
  "01-arrivals.svg", "02-destination.svg", "03-confirm.svg", "04-analyzing.svg", "05-result.svg",
  "00-user-flow", "01-destination", "01-bus-select", "01-bus-select.svg", "01-destination-preferred", "01-destination-preferred.svg", "02-confirm", "02-alighting", "03-analyzing",
  "04-compare", "04-compare-fast", "04-compare-unavailable", "05-detail", "05-detail-fast",
  "06-unavailable", "02-confirm.svg", "06-unavailable.svg",
];
await Promise.all(legacyFiles.map((file) => fs.rm(path.join(OUT_DIR, file), { force: true })));

await fs.writeFile(path.join(OUT_DIR, "00-user-flow.svg"), flowSvg, "utf8");
for (const item of screens) {
  await fs.writeFile(path.join(OUT_DIR, item.file), item.svg, "utf8");
}

const previewOrder = [
  "01-destination.svg",
  "02-alighting.svg",
  "03-analyzing.svg",
  "04-compare.svg",
  "04-compare-fast.svg",
  "04-compare-unavailable.svg",
  "05-detail.svg",
  "05-detail-fast.svg",
  "05-detail-unavailable.svg",
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
    .flow { display: block; width: min(100%, 1440px); margin-bottom: 36px; border: 1px solid #dddddd; }
    main { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 390px)); gap: 28px; align-items: start; }
    figure { margin: 0; }
    figure img { display: block; width: 100%; border: 1px solid #dddddd; box-shadow: 0 10px 30px rgba(25,25,25,.08); }
    figcaption { padding-top: 10px; font-size: 14px; font-weight: 700; }
  </style>
</head>
<body>
  <h1>교통약자 버스 서비스 · Figma 시안</h1>
  <p>목적지까지 빠른 버스와 덜 붐비는 버스를 함께 비교하는 모바일 프로토타입입니다.</p>
  <img class="flow" src="./00-user-flow.svg" alt="사용자 흐름도">
  <main>${previewCards}</main>
</body>
</html>\n`;

await fs.writeFile(path.join(OUT_DIR, "index.html"), preview, "utf8");
console.log(`Generated flow map and ${screens.length} screens in ${OUT_DIR}`);
