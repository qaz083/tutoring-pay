/* 웹으로 내보낸 뒤, 아이폰 홈 화면 앱처럼 동작하도록 다듬는다.
   - Safari 주소창 없이 전체화면으로 뜨게 하는 메타 태그
   - 홈 화면 아이콘 (외부 파일 없이 SVG를 data URI로)
   - 오프라인에서도 열리도록 서비스 워커
   실행: npm run build:web */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "/tutoring-pay";
const OUT = "docs";                 // GitHub Pages가 main 브랜치의 이 폴더를 본다

console.log("› 웹 번들 생성");
execSync(`npx expo export --platform web --output-dir ${OUT}`, { stdio: "inherit" });

/* 홈 화면 아이콘 — 달력에 원화 표시 */
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
<rect width="180" height="180" rx="40" fill="#3b6ef5"/>
<rect x="38" y="46" width="104" height="94" rx="12" fill="#fff"/>
<rect x="38" y="46" width="104" height="22" rx="12" fill="#dbe4ff"/>
<circle cx="62" cy="88" r="7" fill="#3b6ef5"/><circle cx="90" cy="88" r="7" fill="#3b6ef5"/>
<circle cx="118" cy="88" r="7" fill="#c7d3f7"/><circle cx="62" cy="114" r="7" fill="#c7d3f7"/>
<circle cx="90" cy="114" r="7" fill="#16a34a"/><circle cx="118" cy="114" r="7" fill="#c7d3f7"/>
</svg>`;
const iconUri = "data:image/svg+xml;base64," + Buffer.from(icon).toString("base64");

/* 오프라인 캐시 — 첫 방문 뒤에는 인터넷 없이도 열린다 */
const assets = [];
const walk = (dir, prefix = "") => {
  for (const e of readdirSync(join(OUT, dir), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) walk(join(dir, e.name), rel);
    else if (/\.(js|css|html|json)$/.test(e.name)) assets.push(`${BASE}/${rel}`);
  }
};
walk(".");

const sw = `const CACHE = "tutoring-pay-v${Date.now()}";
const ASSETS = ${JSON.stringify([`${BASE}/`, ...assets])};
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // 캐시를 먼저 주고, 네트워크가 되면 조용히 갱신한다
  e.respondWith(caches.match(e.request).then((hit) => {
    const live = fetch(e.request)
      .then((res) => { caches.open(CACHE).then((c) => c.put(e.request, res.clone())); return res; })
      .catch(() => hit || caches.match("${BASE}/"));
    return hit || live;
  }));
});`;
writeFileSync(join(OUT, "sw.js"), sw);

const manifest = {
  name: "과외 정산", short_name: "과외 정산",
  start_url: `${BASE}/`, scope: `${BASE}/`,
  display: "standalone", background_color: "#f4f5f7", theme_color: "#f4f5f7",
  icons: [{ src: iconUri, sizes: "180x180", type: "image/svg+xml", purpose: "any" }],
};
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

/* index.html에 홈 화면 앱 설정을 심는다 */
const htmlPath = join(OUT, "index.html");
let html = readFileSync(htmlPath, "utf8");
const head = `
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="과외 정산">
<meta name="theme-color" content="#f4f5f7">
<link rel="apple-touch-icon" href="${iconUri}">
<link rel="icon" href="${iconUri}">
<link rel="manifest" href="${BASE}/manifest.json">
<script>
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("${BASE}/sw.js").catch(() => {}));
  }
</script>
`;
html = html.replace("</head>", head + "</head>");
writeFileSync(htmlPath, html);

/* GitHub Pages가 _expo 폴더를 Jekyll로 건드리지 않게 한다 */
writeFileSync(join(OUT, ".nojekyll"), "");

console.log(`✔ ${OUT}/ 준비 완료 — 캐시 대상 ${assets.length}개`);
