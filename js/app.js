const CFG = window.SITE_CONFIG || {};
const CREDITS = window.PHOTO_CREDITS || {};
const VDNKH = [2, 3, 4, 5, 6];

const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const safeDecode = u => { try { return decodeURI(u); } catch { return u; } };
const link = (href, text) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}</a>`;

const state = {cur: 0, chapter: 0, answers: {}};
const svgMarkers = [];
const ymarks = [];
let ymap = null;

function drawSvgMap() {
  const NS = "http://www.w3.org/2000/svg";
  const svg = $("map");
  const KM_PER_DEG = 111.32;
  const cosLat = Math.cos(55.75 * Math.PI / 180);

  const project = (bounds, x0, y0, scale) => (lat, lon) =>
    [x0 + (lon - bounds.w) * KM_PER_DEG * cosLat * scale, y0 + (bounds.n - lat) * KM_PER_DEG * scale];

  const B = {n: 55.848, s: 55.640, w: 37.465, e: 37.700};
  const W = 600;
  const SC = W / ((B.e - B.w) * KM_PER_DEG * cosLat);
  const H = Math.round((B.n - B.s) * KM_PER_DEG * SC);
  const P = project(B, 0, 0, SC);
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  const el = (tag, attrs = {}, parent = svg) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  };
  const label = (text, x, y, anchor = "start", parent = svg) => {
    el("text", {x, y, class: "maplabel", "text-anchor": anchor}, parent).textContent = text;
  };
  const smooth = pts => pts.slice(0, -1).reduce((d, p1, i) => {
    const p0 = pts[i - 1] || p1, p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    return d + ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6}`
             + ` ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }, `M${pts[0][0]},${pts[0][1]}`);

  const grid = el("g", {class: "grid"});
  for (let x = 0; x < W; x += SC * 2) el("line", {x1: x, y1: 0, x2: x, y2: H}, grid);
  for (let y = 0; y < H; y += SC * 2) el("line", {x1: 0, y1: y, x2: W, y2: y}, grid);

  el("path", {d: smooth(RIVER.map(([a, b]) => P(a, b))), class: "river"});
  const [cx, cy] = P(55.7539, 37.6208);
  el("ellipse", {cx, cy, rx: 2.35 * SC, ry: 2.25 * SC, class: "ring"});
  el("ellipse", {cx, cy, rx: 5.6 * SC, ry: 5.3 * SC, class: "ring"});
  label("Садовое кольцо", cx, cy - 2.25 * SC - 6, "middle");
  label("ТТК", cx, cy - 5.3 * SC - 6, "middle");
  const [rx, ry] = P(55.700, 37.668);
  label("Москва-река", rx + 10, ry);
  const [kx, ky] = P(55.7520, 37.6175);
  el("rect", {x: kx - 7, y: ky - 7, width: 14, height: 14, class: "kremlin", transform: `rotate(45 ${kx} ${ky})`});
  label("Кремль", kx - 12, ky + 22, "end");
  label("С", W - 18, 22);
  el("line", {x1: 18, y1: H - 20, x2: 18 + SC * 2, y2: H - 20, class: "scalebar"});
  label("2 км", 18, H - 28);

  el("polyline", {points: S.map(s => P(s.lat, s.lon).join(",")).join(" "), class: "route"});

  const IB = {n: 55.8370, s: 55.8190, w: 37.6180, e: 37.6440};
  const IW = 214, IX = W - 232, IY = H - 262;
  const ISC = IW / ((IB.e - IB.w) * KM_PER_DEG * cosLat);
  const IH = (IB.n - IB.s) * KM_PER_DEG * ISC;
  const IP = project(IB, IX, IY, ISC);
  const inset = el("g", {class: "inset"});
  el("rect", {x: IX, y: IY, width: IW, height: IH, class: "frame"}, inset);
  const [bx1, by1] = P(IB.n, IB.w), [bx2, by2] = P(IB.s, IB.e);
  el("rect", {x: bx1, y: by1, width: bx2 - bx1, height: by2 - by1, class: "insetbox"});
  el("line", {x1: bx2, y1: by2, x2: IX, y2: IY, class: "insetlead"});
  label("ВДНХ · ост. 3–7", IX + 8, IY + 16, "start", inset);
  el("polyline", {points: VDNKH.map(i => IP(S[i].lat, S[i].lon).join(",")).join(" "), class: "route"}, inset);
  const [vx, vy] = P(55.8260, 37.6320);
  label("ост. 3–7 → врезка", vx + 16, vy - 14);

  S.forEach((s, i) => {
    const inInset = VDNKH.includes(i);
    const [x, y] = inInset ? IP(s.lat, s.lon) : P(s.lat, s.lon);
    const m = el("g", {class: "mk", tabindex: 0, role: "button", "aria-label": `Остановка ${i + 1}: ${s.name}`,
                       transform: `translate(${x},${y})`}, inInset ? inset : svg);
    el("circle", {r: 13}, m);
    el("text", {}, m).textContent = i + 1;
    m.addEventListener("click", () => select(i));
    m.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(i); } });
    svgMarkers.push(m);
  });
}

const RIVER = [[55.787,37.465],[55.770,37.472],[55.752,37.478],[55.743,37.492],[55.748,37.505],[55.759,37.518],
  [55.754,37.535],[55.744,37.552],[55.733,37.562],[55.720,37.548],[55.711,37.556],[55.714,37.578],[55.724,37.594],
  [55.735,37.604],[55.746,37.612],[55.750,37.626],[55.748,37.643],[55.737,37.656],[55.722,37.664],[55.705,37.668],
  [55.690,37.676],[55.675,37.680],[55.660,37.700]];

function loadYandexMap() {
  const key = (CFG.YMAPS_API_KEY || "").trim();
  if (!key) return;
  const script = document.createElement("script");
  script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`;
  script.onload = () => window.ymaps && ymaps.ready(initYandexMap);
  script.onerror = () => setMapNote("Яндекс Карты не загрузились — показана схема");
  document.head.appendChild(script);
}

function initYandexMap() {
  $("map").setAttribute("hidden", "");
  const box = $("ymap");
  box.hidden = false;
  ymap = new ymaps.Map(box, {
    center: CFG.MAP_CENTER || [55.752, 37.585],
    zoom: CFG.MAP_ZOOM || 11,
    controls: ["zoomControl", "fullscreenControl", "typeSelector"],
  });
  const red = getComputedStyle(document.documentElement).getPropertyValue("--red").trim() || "#C2321C";
  ymap.geoObjects.add(new ymaps.Polyline(S.map(s => [s.lat, s.lon]), {hintContent: "Линия маршрута"},
    {strokeColor: red, strokeWidth: 3, strokeStyle: "shortdash", strokeOpacity: .85}));
  S.forEach((s, i) => {
    const pm = new ymaps.Placemark([s.lat, s.lon],
      {iconContent: String(i + 1), hintContent: `${i + 1}. ${s.name}`},
      {preset: "islands#darkBlueCircleIcon"});
    pm.events.add("click", () => select(i, {fromMap: true}));
    ymap.geoObjects.add(pm);
    ymarks.push(pm);
  });
  setMapNote("Яндекс Карты · метки по реальным координатам");
  paint();
}

function setMapNote(text) { $("mapnote").textContent = text; }

function buildNavigation() {
  S.forEach((s, i) => {
    const b = document.createElement("button");
    b.textContent = i + 1;
    b.setAttribute("aria-label", s.name);
    b.onclick = () => select(i);
    $("chips").appendChild(b);
  });
  CH.forEach(c => {
    const b = document.createElement("button");
    b.className = "chap";
    b.dataset.id = c.id;
    b.textContent = `${c.name} · ${c.years}`;
    b.onclick = () => {
      state.chapter = state.chapter === c.id ? 0 : c.id;
      if (state.chapter) select(S.findIndex(s => s.ch === c.id)); else paint();
    };
    $("chapters").appendChild(b);
  });
}

function paint() {
  const {cur, chapter, answers} = state;
  const dimmed = i => chapter && S[i].ch !== chapter;
  svgMarkers.forEach((m, i) => { m.classList.toggle("on", i === cur); m.classList.toggle("dim", !!dimmed(i)); });
  ymarks.forEach((pm, i) => pm.options.set("preset",
    i === cur ? "islands#redCircleIcon" : dimmed(i) ? "islands#grayCircleIcon" : "islands#darkBlueCircleIcon"));
  [...$("chips").children].forEach((b, i) => {
    const answered = answers[i] !== undefined;
    b.classList.toggle("on", i === cur);
    b.classList.toggle("right", answered && answers[i] === S[i].quiz.a);
    b.classList.toggle("wrong", answered && answers[i] !== S[i].quiz.a);
  });
  [...$("chapters").children].forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.id === chapter)));
  const right = Object.entries(answers).filter(([i, a]) => S[i].quiz.a === a).length;
  $("score").innerHTML = `Квиз: <b>${right}</b> из ${S.length}`;
}

function select(i, {fromMap = false} = {}) {
  state.cur = i;
  if (state.chapter && S[i].ch !== state.chapter) state.chapter = 0;
  renderCard();
  paint();
  if (ymap && !fromMap) ymap.panTo([S[i].lat, S[i].lon], {flying: true, duration: 600});
}

function photoHtml(i) {
  const c = CREDITS[i + 1], s = S[i];
  if (!c) {
    return `<figure class="photo"><div class="ph"><span class="big">${String(i + 1).padStart(2, "0")}</span>
      <small>Место для фотографии объекта</small></div></figure>`;
  }
  const license = c.license ? ", " + (c.licenseUrl ? link(c.licenseUrl, c.license) : esc(c.license)) : "";
  const source = c.page ? ", " + link(c.page, c.source || "Wikimedia Commons") : "";
  const credit = c.author || c.page ? `Фото: ${esc(c.author || "автор не указан")}${license}${source}` : "Источник уточняется";
  return `<figure class="shot">
    <img class="${c.h > c.w ? "tall" : ""}" src="${esc(c.file)}" alt="${esc(s.name)}" loading="lazy">
    <figcaption>Рисунок ${i + 1} — ${esc(s.photoCaption || s.name)}. ${credit}</figcaption>
  </figure>`;
}

function renderCard() {
  const i = state.cur, s = S[i], chapter = CH[s.ch - 1], card = $("card");
  card.innerHTML = `
    <div class="head">
      <div class="eyebrow">Глава ${esc(chapter.name)}</div>
      <div class="num">Остановка ${i + 1} из ${S.length}</div>
      <h2>${esc(s.name)}</h2>
    </div>
    <div class="facts">
      <span>Годы: <b>${esc(s.years)}</b></span>
      <span>Адрес: <b>${esc(s.addr)}</b></span>
      <span class="mono">${s.lat.toFixed(4)}° с. ш., ${s.lon.toFixed(4)}° в. д.</span>
    </div>
    ${photoHtml(i)}
    <div class="text">${s.text.map(p => `<p>${esc(p)}</p>`).join("")}</div>
    <div class="sig"><div class="eyebrow">Значимость для Москвы и России</div><p>${esc(s.sig)}</p></div>
    <div class="quiz">
      <h3>Проверь себя</h3>
      <p class="q">${esc(s.quiz.q)}</p>
      <div class="opts"></div>
      <p class="explain" hidden></p>
    </div>
    <div class="nav">
      <p class="next-note">${s.next ? "Дальше: " + esc(s.next) : "Конец маршрута. Пройди квиз на всех остановках."}</p>
      <div class="btns">
        <button class="btn" data-go="-1" ${i === 0 ? "disabled" : ""}>← Назад</button>
        <button class="btn primary" data-go="1" ${i === S.length - 1 ? "disabled" : ""}>Следующая остановка →</button>
      </div>
    </div>`;

  renderQuiz(card.querySelector(".opts"), card.querySelector(".explain"), i);

  card.querySelectorAll("[data-go]").forEach(b => b.onclick = () => {
    select(i + Number(b.dataset.go));
    if (innerWidth <= 860) card.scrollIntoView({behavior: "smooth", block: "start"});
  });
}

function renderQuiz(box, explain, i) {
  const q = S[i].quiz;
  const order = [0, 1, 2].sort((a, b) => ((a * 7 + i * 3) % 5) - ((b * 7 + i * 3) % 5));
  const showResult = () => {
    const a = state.answers[i];
    if (a === undefined) return;
    [...box.children].forEach(btn => {
      const k = Number(btn.dataset.k);
      btn.disabled = true;
      if (k === q.a) btn.classList.add("right");
      else if (k === a) btn.classList.add("wrong");
    });
    explain.hidden = false;
    explain.textContent = (a === q.a ? "Верно. " : "Не совсем. ") + q.e;
  };
  order.forEach(k => {
    const b = document.createElement("button");
    b.className = "opt";
    b.dataset.k = k;
    b.textContent = q.o[k];
    b.onclick = () => { state.answers[i] = k; showResult(); paint(); };
    box.appendChild(b);
  });
  showResult();
}

function buildTimeline() {
  TL.forEach(([year, text, stop, key]) => {
    const li = document.createElement("li");
    if (key) li.className = "key";
    li.innerHTML = `<span class="yr">${year}</span><p>${esc(text)}</p>`;
    if (stop >= 0) {
      const b = document.createElement("button");
      b.textContent = `ост. ${stop + 1} →`;
      b.onclick = () => { select(stop); document.querySelector(".board").scrollIntoView({behavior: "smooth"}); };
      li.appendChild(b);
    }
    $("tl").appendChild(li);
  });
}

function buildSources() {
  SRC.forEach(s => {
    const li = document.createElement("li");
    li.innerHTML = esc(gostRef(s)).replace(/URL: (\S+)/, (_, u) => `URL: ${link(s.u, safeDecode(s.u))}`);
    $("src").appendChild(li);
  });
  const nums = Object.keys(CREDITS).map(Number).sort((a, b) => a - b);
  if (!nums.length) { $("photosrc").parentElement.hidden = true; return; }
  nums.forEach(n => {
    const c = CREDITS[n], li = document.createElement("li");
    if (!c.page) {
      li.textContent = `Рисунок ${n}. ${c.title} — источник уточняется.`;
      $("photosrc").appendChild(li);
      return;
    }
    const license = c.license ? ` – Лицензия: ${esc(c.license)}.` : "";
    li.innerHTML = `Рисунок ${n}. ${esc(c.title)} / ${esc(c.author || "автор не указан")} // ${esc(c.source || "Wikimedia Commons")} : [сайт].`
      + ` – URL: ${link(c.page, safeDecode(c.page))} (дата обращения: ${ACCESS_DATE}).${license} – Изображение : электронное.`;
    $("photosrc").appendChild(li);
  });
}

drawSvgMap();
buildNavigation();
buildTimeline();
buildSources();
renderCard();
paint();
loadYandexMap();
