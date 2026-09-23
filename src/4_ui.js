/* =========================================================
   Interface
   ========================================================= */
const doc = document.documentElement, bodyEl = document.body;
const els = {
  panel: $('#panel'), panelBody: $('#panelBody'), drawer: $('#drawer'), drawerBody: $('#drawerBody'), drawerTitle: $('#drawerTitle'), drawerSub: $('#drawerSub'),
  hud: $('#hud'), back: $('#back'), tip: $('#tip'), labels: $('#labels'), timeline: $('#timeline'), tour: $('#tour'), journey: $('#journey'),
  legend: $('#legend'), toast: $('#toast'), nav: $('#nav'), views: $('#views'), q: $('#q'), results: $('#results'), search: $('#search')
};
const MOON_KM = { Moon: 3474, Phobos: 22, Deimos: 12, Io: 3643, Europa: 3122, Ganymede: 5268, Callisto: 4821, Enceladus: 504, Rhea: 1527, Titan: 5150, Iapetus: 1469, Miranda: 472, Ariel: 1158, Titania: 1578, Oberon: 1523, Triton: 2707, Proteus: 420 };
const ICON = {
  close: '<svg viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.5"><path d="m2 2 10 10M12 2 2 12"/></svg>',
  explore: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="5.5"/><ellipse cx="8" cy="8" rx="2.4" ry="5.5"/><path d="M2.5 8h11"/></svg>',
  compare: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="5" cy="9" r="3"/><circle cx="11.5" cy="7.5" r="4.5"/></svg>',
  prev: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 2.5 4.5 7 9 11.5"/></svg>',
  next: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 2.5 9.5 7 5 11.5"/></svg>',
  pause: '<svg viewBox="0 0 14 14" fill="currentColor"><rect x="3" y="2" width="3" height="10" rx="1"/><rect x="8" y="2" width="3" height="10" rx="1"/></svg>',
  play: '<svg viewBox="0 0 14 14" fill="currentColor"><path d="M4 2.2v9.6L11.6 7z"/></svg>'
};
const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtSig = (n) => (n >= 100 ? fmt(n, 0) : n >= 10 ? fmt(n, 1) : n >= 1 ? fmt(n, 2) : fmt(n, 3));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isSmall = () => innerWidth <= 760;
const orb = (b) => {
  const c = b.fallback ? `rgb(${b.fallback.map((v) => Math.round(v * 255)).join(',')})` : '#ffb45e';
  return `radial-gradient(circle at 34% 30%, ${b.accent} 0%, ${c} 45%, #05060c 100%)`;
};

/* ---------- Accent & layout helpers ---------- */
function setAccent(b) { doc.style.setProperty('--accent', b ? b.accent : '#9BD8FF'); }
function setMode(m) {
  S.mode = m;
  bodyEl.classList.remove('mode-overview', 'mode-focus', 'mode-explore', 'mode-compare', 'mode-tour', 'mode-journey');
  bodyEl.classList.add('mode-' + m);
  els.legend.classList.toggle('on', S.view === 'data' && m === 'overview');
}
function panelOffset() {
  if (isSmall()) { const vis = H * 0.42 + 100; return { x: 0, y: H / 2 - vis / 2 }; }
  return { x: (parseFloat(getComputedStyle(els.panel).width) + 20) / 2, y: 0 };
}
function drawerOffset() {
  if (isSmall()) { const vis = H * 0.44 + 100; return { x: 0, y: H / 2 - vis / 2 }; }
  return { x: -(els.drawer.offsetWidth + 20) / 2, y: 0 };
}
function hudOffset() { return isSmall() ? { x: 0, y: H * 0.16 } : { x: -150, y: 0 }; }
function focusMul(b) { const m = b.id === 'sun' ? 5.4 : b.id === 'saturn' ? 7.2 : b.rings ? 6 : 4.4; return isSmall() ? m * 1.45 : m; }
function toast(msg) { els.toast.textContent = msg; els.toast.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => els.toast.classList.remove('on'), 2400); }

/* ---------- Ink indicators for nav & view switch ---------- */
function moveInk(container, ink) {
  const on = container.querySelector('button.on');
  if (!on) { ink.style.opacity = 0; return; }
  ink.style.opacity = 1; ink.style.left = on.offsetLeft + 'px'; ink.style.width = on.offsetWidth + 'px';
}
function setNavActive(key) {
  $$('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.nav === key));
  moveInk(els.nav, $('.nav-ink'));
}
function syncViewTabs() {
  $$('#views button').forEach((b) => { const on = b.dataset.view === S.view; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  moveInk(els.views, $('.views-ink'));
  bodyEl.classList.remove('view-realistic', 'view-data', 'view-compare');
  bodyEl.classList.add('view-' + S.view);
  els.legend.classList.toggle('on', S.view === 'data' && S.mode === 'overview');
}

/* =========================================================
   Visualisations
   ========================================================= */
function vizOrbit(b) {
  const X = (au) => 8 + 284 * Math.sqrt(au / 30.1);
  let s = `<svg viewBox="0 0 300 48" role="img" aria-label="Position among the planets"><line x1="8" y1="18" x2="292" y2="18" stroke="rgba(190,205,240,.22)"/>`;
  s += `<circle cx="8" cy="18" r="${b.id === 'sun' ? 6 : 4}" fill="#FFB45E"/>`;
  PLANETS.forEach((p) => {
    const x = X(p.au), cur = p === b;
    if (cur) s += `<circle cx="${x}" cy="18" r="10" fill="none" stroke="${p.accent}" stroke-opacity=".55"/><circle cx="${x}" cy="18" r="4.5" fill="${p.accent}"/>`;
    else s += `<circle cx="${x}" cy="18" r="2.2" fill="rgba(233,237,245,.55)"/>`;
  });
  [[1, '1 AU'], [5.2, '5'], [9.58, '10'], [19.2, '19'], [30.1, '30 AU']].forEach(([a, t]) => { s += `<text x="${X(a)}" y="44" text-anchor="middle">${t}</text>`; });
  return s + '</svg>';
}
function vizSize(b) {
  const ref = b.id === 'earth' ? { name: 'Moon', d: 3474, c: '#b9b6b0' } : { name: 'Earth', d: 12756, c: '#6FB7FF' };
  const big = Math.max(b.dKm, ref.d), R = 30;
  const r1 = Math.max(0.8, R * b.dKm / big), r2 = Math.max(0.8, R * ref.d / big);
  const base = 64;
  return `<svg viewBox="0 0 150 82" role="img" aria-label="${b.name} compared with ${ref.name}">
    <defs><radialGradient id="sg-${b.id}" cx="35%" cy="30%"><stop offset="0" stop-color="${b.accent}"/><stop offset="1" stop-color="#101320"/></radialGradient></defs>
    <circle cx="${50}" cy="${base - r1}" r="${r1}" fill="url(#sg-${b.id})"/>
    <circle cx="${Math.max(50 + r1 + r2 + 10, 110)}" cy="${base - r2}" r="${r2}" fill="${ref.c}" opacity=".85"/>
    <line x1="10" y1="${base}" x2="140" y2="${base}" stroke="rgba(190,205,240,.18)"/>
    <text x="50" y="78" text-anchor="middle">${b.name}</text><text x="${Math.max(50 + r1 + r2 + 10, 110)}" y="78" text-anchor="middle">${ref.name}</text></svg>`;
}
function vizGauge(b) {
  const gE = b.g / 9.81, f = Math.min(gE / 3, 1), L = Math.PI * 40;
  const ang = Math.PI * (1 - f), nx = 50 + Math.cos(ang) * 32, ny = 48 - Math.sin(ang) * 32;
  const ex = 50 + Math.cos(Math.PI * (1 - 1 / 3)) * 46, ey = 48 - Math.sin(Math.PI * (1 - 1 / 3)) * 46;
  return `<svg viewBox="0 0 100 60" role="img" aria-label="Gravity ${gE.toFixed(2)} times Earth's">
    <path d="M10 48 A40 40 0 0 1 90 48" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="6" stroke-linecap="round"/>
    <path class="g-arc" d="M10 48 A40 40 0 0 1 90 48" fill="none" stroke="${b.accent}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L}" data-off="${L * (1 - f)}" style="transition:stroke-dashoffset 1.3s cubic-bezier(.22,.8,.2,1)"/>
    <line x1="50" y1="48" x2="${nx}" y2="${ny}" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><circle cx="50" cy="48" r="2.5" fill="#fff"/>
    <circle cx="${ex}" cy="${ey}" r="1.6" fill="#6FB7FF"/><text x="${ex}" y="${ey - 4}" text-anchor="middle">Earth</text>
    <text x="10" y="59" text-anchor="middle">0 g</text><text x="90" y="59" text-anchor="middle">3 g</text></svg>`;
}
function strip(pct, ticks, label) {
  return `<div class="strip" role="img" aria-label="${esc(label)}"><i data-w="${clamp(pct, 1.5, 100)}"></i>${ticks.map((t) => `<em style="left:${t[0]}%"></em>`).join('')}</div>
  <div class="strip-ticks">${ticks.map((t) => `<span style="left:${t[0]}%">${t[1]}</span>`).join('')}</div>`;
}
const logPct = (v, lo, hi) => clamp((Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) * 100, 0, 100);
function tempPct(t) { return clamp((t + 230) / 730 * 100, 0, 100); }
function lightTime(au) { const m = au * 8.317; return m < 60 ? `${m.toFixed(1)} minutes` : `${(m / 60).toFixed(1)} hours`; }

function card(cls, label, value, sub, viz, delay) {
  return `<div class="card ${cls}" style="animation-delay:${delay}ms"><div class="c-lab"><span>${label}</span></div>${value ? `<div class="c-val">${value}</div>` : ''}${sub ? `<div class="c-sub">${sub}</div>` : ''}${viz ? `<div class="c-viz">${viz}</div>` : ''}</div>`;
}

function panelHTML(b) {
  const idx = BODIES.indexOf(b), prev = BODIES[(idx - 1 + BODIES.length) % BODIES.length], next = BODIES[(idx + 1) % BODIES.length];
  const isSun = b.id === 'sun';
  let d = 40; const step = () => (d += 55);
  const orderText = isSun ? 'Star at the centre of the Solar System' : `Planet ${b.order} from the Sun`;
  let h = `<button class="p-close" data-act="close" aria-label="Close guide">${ICON.close}</button>
  <div class="p-order">${orderText}</div><h2 class="p-name">${b.name}</h2><div class="p-kind">${b.kind}</div>
  <div class="p-actions"><button class="btn primary" data-act="explore">${ICON.explore}Explore ${isSun ? 'the Sun' : 'planet'}</button>${isSun ? '' : `<button class="btn" data-act="compare">${ICON.compare}Compare</button>`}</div>
  <p class="p-over">${b.overview}</p><div class="cards">`;

  h += card('', 'Distance from the Sun', isSun ? 'Centre of the system' : `<span data-count="${b.distM}" data-dec="1">${fmt(b.distM, 1)}</span><small>million km</small>`,
    isSun ? 'Every planet orbits here. Neptune is 4.5 billion km away.' : `${b.au} AU. Sunlight takes ${lightTime(b.au)} to arrive.`, vizOrbit(b), step());
  h += card('half', 'Diameter', `<span data-count="${b.dKm}">${fmt(b.dKm)}</span><small>km</small>`,
    b.id === 'earth' ? '3.7 × the Moon' : `${fmtSig(b.dKm / 12756)} × Earth`, vizSize(b), step());
  h += card('half', 'Surface gravity', `${fmt(b.g, 1)}<small>m/s²</small>`, isSun ? '27.9 g, far off this dial' : `${(b.g / 9.81).toFixed(2)} g`, vizGauge(b), step());
  h += card('', 'Mass', `${fmt(b.massKg[0], 2)}<small>× 10<sup>${b.massKg[1]}</sup> kg</small>`,
    isSun ? '333,000 Earths — about 99.8% of all mass in the Solar System' : `${fmtSig(b.massE)} Earth masses`,
    strip(logPct(b.massE, 0.01, 400), [[logPct(1, 0.01, 400), 'Earth'], [logPct(317.8, 0.01, 400), 'Jupiter']], 'Mass on a logarithmic scale'), step());
  h += card('', 'Length of day and year', '', '',
    `<div class="c-lab"><span>Day</span><span style="color:var(--ink)">${b.dayLabel}</span></div>${b.daySub ? `<div class="c-sub" style="margin-top:2px">${b.daySub}</div>` : ''}
     ${strip(logPct(b.dayH, 1, 10000), [[logPct(24, 1, 10000), 'Earth day']], 'Day length, logarithmic')}
     <div class="c-lab" style="margin-top:14px"><span>Year</span><span style="color:var(--ink)">${b.yearLabel}</span></div>${b.yearSub ? `<div class="c-sub" style="margin-top:2px">${b.yearSub}</div>` : ''}
     ${strip(logPct(b.yearD, 10, 100000), [[logPct(365.25, 10, 100000), 'Earth year']], 'Year length, logarithmic')}`, step());

  // Personal
  h += `<div class="card" style="animation-delay:${step()}ms"><div class="c-lab"><span>You on ${b.name}</span></div>
    <div class="personal"><span>Weighing</span><input type="number" min="1" max="500" value="70" data-in="w" aria-label="Your weight in kg on Earth"><span>kg on Earth, you would feel like <b data-out="w"></b> kg.</span></div>
    ${isSun ? '' : `<div class="personal"><span>At</span><input type="number" min="1" max="130" value="30" data-in="a" aria-label="Your age in Earth years"><span>Earth years old, you would be <b data-out="a"></b> ${b.name} years old.</span></div>`}</div>`;

  // Temperature
  const tp = tempPct(b.tempC);
  const range = b.tempRange ? `<span class="range" style="left:${tempPct(b.tempRange[0])}%;width:${tempPct(b.tempRange[1]) - tempPct(b.tempRange[0])}%"></span>` : '';
  const tSub = isSun ? 'Its core reaches about 15 million °C.' : b.tempRange ? `Ranges from ${b.tempRange[0]} °C to ${b.tempRange[1]} °C` : b.id === 'venus' ? 'Nearly the same by day and night, at the poles and equator' : 'Measured at the level where pressure equals Earth’s at sea level';
  h += card('', 'Average temperature', `<span data-count="${b.tempC}">${fmt(b.tempC)}</span><small>°C · ${fmt(b.tempC * 9 / 5 + 32)} °F</small>`, tSub,
    `<div class="temp-bar" role="img" aria-label="Temperature scale">${range}<span class="mk" data-l="${tp}" style="left:${tempTo0()}%"></span><span class="earth" style="left:${tempPct(15)}%">Earth</span></div>
     <div class="strip-ticks" style="margin-top:18px"><span style="left:0%;transform:none">−230 °C</span><span style="left:${tempPct(0)}%">0 °C</span><span style="left:100%;transform:translateX(-100%)">${isSun ? '5,500 °C →' : '500 °C'}</span></div>`, step());

  // Moons
  let moonsViz = '';
  if (isSun) moonsViz = `<div class="dots">${PLANETS.map((p, i) => `<i style="width:10px;height:10px;background:${p.accent};animation-delay:${i * 40}ms"></i>`).join('')}</div>`;
  else if (b.moons) {
    const n = Math.min(b.moons, 300), tiny = n > 60;
    moonsViz = `<div class="dots ${tiny ? 'tiny' : ''}">${Array.from({ length: n }, (_, i) => `<i style="animation-delay:${Math.min(i * (tiny ? 3 : 40), 900)}ms${b.moons === 1 ? ';width:14px;height:14px' : ''}"></i>`).join('')}</div>`;
    if (b.moonsList.length) moonsViz += `<div class="chips">${b.moonsList.map((m, i) => `<button class="chip" data-moon="${i}"><span class="cd" style="background:rgb(${m.a.map((v) => Math.round(v * 255)).join(',')})"></span>${m.name}</button>`).join('')}</div>`;
  }
  h += card('', isSun ? 'Planets in orbit' : 'Known moons', `<span data-count="${b.moons}">${b.moons}</span>`,
    isSun ? 'Plus dwarf planets, asteroids and comets' : b.moons === 0 ? `${b.name} has no moons.` : b.moons > 20 ? 'Count as of mid-2026 and still rising. Tap a major moon to fly to it.' : 'Tap a moon to fly to it.', moonsViz, step());

  // Atmosphere
  const tot = b.atmo.reduce((a, g) => a + g[1], 0);
  h += card('', b.atmoTitle, '', b.pressure,
    `<div class="atmo-bar" role="img" aria-label="Composition">${b.atmo.map((g) => `<i style="flex-grow:${g[1] / tot};background:${GAS[g[0]] || GAS.Other}"></i>`).join('')}</div>
     <div class="atmo-leg">${b.atmo.map((g) => `<span><i style="background:${GAS[g[0]] || GAS.Other}"></i>${g[0]}<b>${g[1] < 1 ? g[1] : fmt(g[1], g[1] % 1 ? 1 : 0)}%</b></span>`).join('')}</div>`, step());

  h += card('', 'Worth knowing', '', '', `<ul class="facts">${b.facts.map((f) => `<li>${f}</li>`).join('')}</ul>`, step());
  h += `</div><div class="p-nav"><button data-go="${prev.id}"><small>Previous</small><b>${prev.name}</b></button><button data-go="${next.id}"><small>Next</small><b>${next.name}</b></button></div>`;
  return h;
}
function tempTo0() { return tempPct(15); }

function animatePanel(root) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('.strip i', root).forEach((i) => { i.style.width = i.dataset.w + '%'; });
    $$('.g-arc', root).forEach((p) => { p.style.strokeDashoffset = p.dataset.off; });
    $$('.temp-bar .mk', root).forEach((m) => { m.style.left = m.dataset.l + '%'; });
  }));
  $$('[data-count]', root).forEach((el) => {
    const to = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10);
    if (REDUCED || !isFinite(to)) return;
    const t0 = performance.now(), dur = 1100;
    const tick = (now) => { const k = easeOut(Math.min(1, (now - t0) / dur)); el.textContent = fmt(to * k, dec); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}
function updatePersonal(root, b) {
  const w = parseFloat($('[data-in="w"]', root)?.value) || 0;
  const a = parseFloat($('[data-in="a"]', root)?.value) || 0;
  const ow = $('[data-out="w"]', root), oa = $('[data-out="a"]', root);
  if (ow) ow.textContent = fmt(w * b.g / 9.81, w * b.g / 9.81 < 10 ? 1 : 0);
  if (oa) oa.textContent = fmt(a * 365.25 / b.yearD, a * 365.25 / b.yearD < 10 ? 1 : 0);
}

/* ---------- Panel open/close ---------- */
let panelBody = null;
function openPanel(b) {
  panelBody = b;
  els.panelBody.innerHTML = panelHTML(b);
  els.panelBody.scrollTop = 0;
  els.panel.classList.remove('on'); void els.panel.offsetWidth;
  els.panel.classList.add('on'); els.panel.classList.remove('expanded');
  els.panel.setAttribute('aria-hidden', 'false');
  bodyEl.classList.add('panel-open');
  updatePersonal(els.panelBody, b);
  animatePanel(els.panelBody);
  if (isSmall()) closeDrawer(true);
}
function closePanel() {
  els.panel.classList.remove('on'); els.panel.setAttribute('aria-hidden', 'true'); bodyEl.classList.remove('panel-open'); panelBody = null;
}
els.panelBody.addEventListener('input', (e) => { if (e.target.matches('[data-in]') && panelBody) updatePersonal(els.panelBody, panelBody); });
els.panelBody.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t || !panelBody) return;
  const b = panelBody;
  if (t.dataset.act === 'close') goHome();
  else if (t.dataset.act === 'explore') exploreTarget({ b });
  else if (t.dataset.act === 'compare') { CMP.a = b.id; CMP.b = b.id === 'earth' ? 'jupiter' : 'earth'; setView('compare'); }
  else if (t.dataset.go) selectBody(byId[t.dataset.go]);
  else if (t.dataset.moon != null) exploreTarget({ b, moon: b.moonObjs[+t.dataset.moon] });
});
$('#panelHandle').addEventListener('click', () => els.panel.classList.toggle('expanded'));

/* =========================================================
   Core navigation actions
   ========================================================= */
function stopTransient() {
  if (S.mode === 'tour') endTour(true);
  if (S.mode === 'journey') endJourney(true);
}
function leaveCompare() {
  if (S.view !== 'compare') return;
  S.view = 'realistic'; setArrange(0); S.gridTo = 0; S.orbitTo = 1; syncViewTabs();
  if (els.drawer.dataset.kind === 'compare') closeDrawer(true);
}
function resetExploreFx() { PLANETS.forEach((p) => { p.scanTo = 0; }); }

function selectBody(b) {
  stopTransient(); leaveCompare(); hideHud(); resetExploreFx();
  S.sel = b; S.focus = { b }; setMode('focus');
  setAccent(b); openPanel(b); els.back.classList.add('on'); setNavActive(null);
  S.voTo = panelOffset();
  if (els.drawer.classList.contains('on') && !isSmall() && els.drawer.dataset.kind !== 'planets') closeDrawer(true);
  flyTo(() => poseFor({ b }, focusMul(b)), { dur: 2.6, follow: { b } });
  timelineActive(b.id);
  hideTip();
}
function exploreTarget(t) {
  stopTransient(); leaveCompare(); closePanel(); closeDrawer(true);
  const b = t.b; S.sel = b; S.focus = t; setMode('explore');
  setAccent(b); els.back.classList.add('on'); setNavActive(null);
  showHud(t); S.voTo = hudOffset();
  const mul = t.moon ? 4.2 : b.id === 'sun' ? 3.4 : b.id === 'saturn' ? 3.9 : 2.9;
  flyTo(() => poseFor(t, isSmall() ? mul * 1.35 : mul), { dur: 2.4, follow: t });
  timelineActive(b.id);
  syncViewTabs();
}
function goHome() {
  stopTransient(); leaveCompare(); closePanel(); hideHud(); closeDrawer(true); resetExploreFx();
  S.sel = null; S.focus = null; setMode('overview'); setAccent(null);
  els.back.classList.remove('on'); S.voTo = { x: 0, y: 0 };
  flyTo(homePose, { dur: 2.6 });
  setNavActive('system'); timelineActive(null); syncViewTabs();
}
function setView(v) {
  if (S.mode === 'landing') return;
  if (v === 'compare') {
    stopTransient(); closePanel(); hideHud(); resetExploreFx();
    S.view = 'compare'; S.sel = null; S.focus = null; setMode('compare'); setAccent(null);
    setArrange(1); S.gridTo = 0; S.orbitTo = 0;
    els.back.classList.remove('on');
    openDrawer('compare');
    S.voTo = drawerOffset();
    flyTo(comparePose, { dur: 2.6, lift: 40 });
    setNavActive('compare'); timelineActive(null);
  } else {
    const wasCompare = S.view === 'compare';
    S.view = v;
    S.gridTo = v === 'data' ? 1 : 0; S.orbitTo = v === 'data' ? 2.6 : 1;
    if (wasCompare) {
      setArrange(0); if (els.drawer.dataset.kind === 'compare') closeDrawer(true);
      setMode('overview'); els.back.classList.remove('on'); S.voTo = { x: 0, y: 0 };
      flyTo(homePose, { dur: 2.6 }); setNavActive('system');
    } else if (v === 'data' && S.mode === 'overview') toast('Data view: gravity wells, orbital distances and live labels');
  }
  syncViewTabs();
}

/* =========================================================
   Drawers: planets, missions, about, compare
   ========================================================= */
const CMP = { a: 'earth', b: 'jupiter' };
function openDrawer(kind) {
  els.drawer.dataset.kind = kind;
  els.drawer.classList.toggle('wide', kind === 'compare');
  let title = '', sub = '', html = '';
  if (kind === 'planets') {
    title = 'Planets'; sub = 'Eight worlds and the star they circle, in order from the Sun.';
    html = `<div class="pgrid">${BODIES.map((b) => `<button class="pcard" data-go="${b.id}" style="--oc:${b.accent}"><span class="au">${b.id === 'sun' ? 'Centre' : b.au + ' AU'}</span><div class="orb" style="background:${orb(b)}"></div><b>${b.name}</b><small>${b.kind}</small></button>`).join('')}</div>`;
  } else if (kind === 'missions') {
    title = 'Missions'; sub = 'Spacecraft that shaped what we know. Fly to each destination.';
    html = `<div class="mlist">${MISSIONS.map((m, i) => `<article class="mcard" id="mission-${i}"><h3>${m.name}</h3><div class="meta"><span>${m.agency}</span><span>${m.years}</span><span style="color:var(--ink-2)">${m.status}</span></div><p>${m.text}</p><div class="row">${m.targets.map((t) => `<button class="chip" data-go="${t}"><span class="cd" style="background:${byId[t].accent}"></span>Fly to ${byId[t].name}</button>`).join('')}</div></article>`).join('')}</div>`;
  } else if (kind === 'about') {
    title = 'About Orrery'; sub = 'An interactive atlas of the Solar System.';
    html = `<div class="about">
      <p>Every surface, cloud layer, ring and star in this atlas is generated on your device with WebGL, so nothing is downloaded but the code itself.</p>
      <p>Planetary figures come from NASA’s Planetary Fact Sheet. Moon counts follow NASA as of mid-2026 and keep climbing as telescopes find small, distant moons.</p>
      <p>In the Realistic view, distances and sizes are compressed so all eight planets fit on screen. The Comparison view lines the planets up at their true relative sizes.</p>
      <h3>Controls</h3>
      <div class="keys"><kbd>Drag</kbd><span>Rotate the view</span><kbd>Scroll</kbd><span>Zoom, or travel in Scroll journey</span><kbd>Right-drag</kbd><span>Pan the Solar System</span><kbd>← →</kbd><span>Previous or next planet</span><kbd>/</kbd><span>Search</span><kbd>Esc</kbd><span>Step back</span></div>
    </div>`;
  } else if (kind === 'compare') {
    title = 'Compare worlds'; sub = 'The planets now stand side by side at true relative size.';
    html = compareHTML();
  }
  els.drawerTitle.textContent = title; els.drawerSub.textContent = sub; els.drawerBody.innerHTML = html; els.drawerBody.scrollTop = 0;
  els.drawer.classList.add('on'); els.drawer.setAttribute('aria-hidden', 'false'); bodyEl.classList.add('drawer-open');
  if (kind !== 'compare') setNavActive(kind);
  if (kind !== 'compare' && S.mode === 'overview') S.voTo = drawerOffset();
  if (isSmall() && kind !== 'compare') closePanel();
  if (kind === 'compare') animateCompare();
}
function closeDrawer(silent) {
  if (!els.drawer.classList.contains('on')) return;
  const kind = els.drawer.dataset.kind;
  els.drawer.classList.remove('on'); els.drawer.setAttribute('aria-hidden', 'true'); bodyEl.classList.remove('drawer-open');
  els.drawer.dataset.kind = '';
  if (S.mode === 'overview') S.voTo = { x: 0, y: 0 };
  if (!silent) {
    if (kind === 'compare') setView('realistic');
    else setNavActive(S.mode === 'overview' ? 'system' : null);
  }
}
$('#drawerClose').addEventListener('click', () => closeDrawer());
els.drawerBody.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.go) { closeDrawer(true); selectBody(byId[t.dataset.go]); }
  if (t.dataset.cmp) { CMP[t.dataset.cmp] = t.dataset.id; els.drawerBody.innerHTML = compareHTML(); animateCompare(); }
});

const METRICS = [
  { k: 'dKm', label: 'Diameter', f: (v) => `${fmt(v)} km`, noun: 'wide' },
  { k: 'massE', label: 'Mass', f: (v) => `${fmtSig(v)} Earths`, noun: 'as massive' },
  { k: 'g', label: 'Surface gravity', f: (v) => `${fmt(v, 1)} m/s²`, noun: 'as strong' },
  { k: 'dayH', label: 'Length of day', f: (v) => (v > 72 ? `${fmt(v / 24, 0)} days` : `${fmt(v, 1)} h`), noun: 'as long' },
  { k: 'yearD', label: 'Length of year', f: (v) => (v > 730 ? `${fmt(v / 365.25, 1)} years` : `${fmt(v, 0)} days`), noun: 'as long' },
  { k: 'distM', label: 'Distance from the Sun', f: (v) => `${fmt(v, 1)} M km`, noun: 'as far' },
  { k: 'moons', label: 'Known moons', f: (v) => fmt(v), noun: 'as many' }
];
function compareHTML() {
  const A = byId[CMP.a], B = byId[CMP.b];
  const chips = (slot) => PLANETS.map((p) => `<button class="chip ${CMP[slot] === p.id ? 'on' : ''}" data-cmp="${slot}" data-id="${p.id}"><span class="cd" style="background:${p.accent}"></span>${p.name}</button>`).join('');
  const big = Math.max(A.dKm, B.dKm), R = 62;
  const rA = Math.max(0.7, R * A.dKm / big), rB = Math.max(0.7, R * B.dKm / big);
  const cx1 = 20 + (A.rings ? rA * 2.3 : rA), cx2 = Math.max(cx1 + (A.rings ? rA * 2.3 : rA) + (B.rings ? rB * 2.3 : rB) + 22, 210);
  const ringSvg = (p, cx, r) => (p.rings ? `<ellipse cx="${cx}" cy="${80}" rx="${r * 2.25}" ry="${r * 0.5}" fill="none" stroke="${p.accent}" stroke-opacity=".6" stroke-width="${Math.max(1, r * 0.35)}"/>` : '');
  const ball = (p, cx, r) => `<defs><radialGradient id="cg-${p.id}${cx | 0}" cx="35%" cy="30%"><stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="#0c0e18"/></radialGradient></defs><circle cx="${cx}" cy="80" r="${r}" fill="url(#cg-${p.id}${cx | 0})"/>`;
  const vbW = Math.max(360, cx2 + (B.rings ? rB * 2.3 : rB) + 20);
  let h = `<div class="cmp-pick"><div><div class="lab">First world</div><div class="chips">${chips('a')}</div></div><div><div class="lab">Second world</div><div class="chips">${chips('b')}</div></div></div>
  <div class="cmp-scale"><svg viewBox="0 0 ${vbW} 172" role="img" aria-label="${A.name} and ${B.name} at true relative size">${ball(A, cx1, rA)}${ringSvg(A, cx1, rA)}${ball(B, cx2, rB)}${ringSvg(B, cx2, rB)}
  <text x="${cx1}" y="166" text-anchor="middle">${A.name}</text><text x="${cx2}" y="166" text-anchor="middle">${B.name}</text></svg></div><div class="cmp-rows">`;
  METRICS.forEach((m) => {
    const a = A[m.k], b = B[m.k], mx = Math.max(a, b, 1e-9);
    let ratio = '';
    if (A !== B && a > 0 && b > 0) { const [hi, lo] = a >= b ? [A, B] : [B, A]; const r = Math.max(a, b) / Math.min(a, b); ratio = r < 1.05 ? `${A.name} and ${B.name} are about the same.` : `${hi.name} is ${fmtSig(r)} × ${m.noun} as ${lo.name}.`.replace('as as', 'as'); }
    else if (A !== B && (a === 0 || b === 0) && m.k === 'moons') ratio = `${a === 0 ? A.name : B.name} has no moons.`;
    h += `<div class="cmp-row"><div class="top-l"><span>${m.label}</span></div><div class="bars">
      <div class="bar"><span><i data-w="${Math.max(1.2, a / mx * 100)}" style="width:0;background:${A.accent}"></i></span><b>${m.f(a)}</b></div>
      <div class="bar"><span><i data-w="${Math.max(1.2, b / mx * 100)}" style="width:0;background:${B.accent}"></i></span><b>${m.f(b)}</b></div></div>${ratio ? `<div class="ratio">${ratio}</div>` : ''}</div>`;
  });
  h += `<div class="cmp-row"><div class="top-l"><span>Average temperature</span><span>${A.tempC} °C and ${B.tempC} °C</span></div>
    <div class="temp-bar" style="margin-top:12px"><span class="mk" style="left:${tempPct(A.tempC)}%;background:${A.accent};box-shadow:0 0 10px ${A.accent}"></span><span class="mk" style="left:${tempPct(B.tempC)}%;background:${B.accent};box-shadow:0 0 10px ${B.accent}"></span></div></div>`;
  h += `</div><div class="row" style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap"><button class="btn" data-go="${A.id}">Open ${A.name} guide</button><button class="btn" data-go="${B.id}">Open ${B.name} guide</button></div>`;
  return h;
}
function animateCompare() { requestAnimationFrame(() => requestAnimationFrame(() => $$('.cmp-row .bar i', els.drawerBody).forEach((i) => { i.style.width = i.dataset.w + '%'; }))); }

/* =========================================================
   Explore HUD
   ========================================================= */
function showHud(t) {
  const b = t.b, mo = t.moon;
  const name = mo ? mo.data.name : b.name;
  const kind = mo ? `Moon of ${b.name}` : b.kind;
  const tg = (key, label, on, hidden) => `<button class="tg" data-tg="${key}" aria-pressed="${on}" ${hidden ? 'hidden' : ''}>${label}<span class="sw"></span></button>`;
  let h = `<div><div class="h-kind">${kind}</div><h2>${name}</h2></div>
    <div class="h-box glass"><div class="telemetry"><div><span>Latitude</span><b id="tLat">—</b></div><div><span>Longitude</span><b id="tLon">—</b></div><div><span>Altitude</span><b id="tAlt">—</b></div></div></div>`;
  if (!mo) {
    h += `<div class="h-box glass"><div class="toggles">
      ${tg('atmo', 'Atmosphere glow', b.atmoMesh ? b.atmoMesh.visible : false, !b.atmoMesh)}
      ${tg('clouds', 'Cloud layer', b.cloud ? b.cloud.visible : false, !b.cloud)}
      ${tg('moons', 'Moons and orbits', b.moonsVisible !== false, !(b.moonObjs && b.moonObjs.length))}
      ${tg('scan', 'Survey grid', false, b.id === 'sun')}
      ${tg('orbit', 'Auto-orbit camera', !!S.autoOrbit)}
    </div><div class="range-row"><span>Spin</span><input type="range" min="0" max="4" step="0.1" value="${S.spinMul}" id="spinRange" aria-label="Rotation speed"><output id="spinOut">${S.spinMul.toFixed(1)}×</output></div>
    ${b.moonObjs && b.moonObjs.length ? `<div class="chips h-hide-sm">${b.moonObjs.map((m, i) => `<button class="chip" data-moon="${i}">${m.data.name}</button>`).join('')}</div>` : ''}</div>`;
  } else {
    h += `<div class="h-box glass"><div class="moon-note">${mo.data.note}</div><div class="c-sub">${fmt(MOON_KM[mo.data.name] || 0)} km across</div></div>`;
  }
  h += `<div class="row">${mo ? `<button class="btn primary" data-act="parent">Back to ${b.name}</button>` : `<button class="btn primary" data-act="guide">Open guide</button>`}<button class="btn" data-act="home">Solar System</button></div>`;
  els.hud.innerHTML = h;
  els.hud.classList.add('on');
  els.legend.classList.remove('on');
}
function hideHud() { els.hud.classList.remove('on'); }
els.hud.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t || !S.focus) return;
  const b = S.focus.b;
  if (t.dataset.tg) {
    const on = t.getAttribute('aria-pressed') !== 'true'; t.setAttribute('aria-pressed', on);
    const k = t.dataset.tg;
    if (k === 'atmo' && b.atmoMesh) { b.atmoMesh.visible = on; b.mat.uniforms.uAtmoAmt.value = on ? b.atmoAmt : 0; }
    if (k === 'clouds' && b.cloud) b.cloud.visible = on;
    if (k === 'moons') b.moonsVisible = on;
    if (k === 'scan') b.scanTo = on ? 1 : 0;
    if (k === 'orbit') { S.autoOrbit = on; controls.autoRotate = on && !REDUCED; controls.autoRotateSpeed = 0.35; }
  } else if (t.dataset.moon != null) exploreTarget({ b, moon: b.moonObjs[+t.dataset.moon] });
  else if (t.dataset.act === 'guide') selectBody(b);
  else if (t.dataset.act === 'parent') exploreTarget({ b });
  else if (t.dataset.act === 'home') goHome();
});
els.hud.addEventListener('input', (e) => {
  if (e.target.id === 'spinRange') { S.spinMul = parseFloat(e.target.value); $('#spinOut').textContent = S.spinMul.toFixed(1) + '×'; }
});
const _lc = V3();
function updateTelemetry() {
  if (S.mode !== 'explore' || !S.focus || S.flight) return;
  if (frameN % 4) return;
  const t = S.focus, obj = t.moon ? t.moon.mesh : t.b.spin;
  _lc.copy(cam.position); obj.worldToLocal(_lc);
  const r = _lc.length(); _lc.normalize();
  const lat = Math.asin(clamp(_lc.y, -1, 1)) / DEG, lon = Math.atan2(_lc.z, -_lc.x) / DEG;
  const km = t.moon ? (MOON_KM[t.moon.data.name] || 1000) / 2 : t.b.dKm / 2;
  const la = $('#tLat'), lo = $('#tLon'), al = $('#tAlt');
  if (!la) return;
  la.textContent = `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'}`;
  lo.textContent = `${Math.abs(lon).toFixed(1)}° ${lon >= 0 ? 'E' : 'W'}`;
  const alt = Math.max(0, (r - 1) * km);
  al.textContent = alt > 99999 ? `${fmt(alt / 1e6, 2)}M km` : `${fmt(alt)} km`;
}

/* =========================================================
   Timeline rail
   ========================================================= */
const tlNodes = {};
(function buildTimeline() {
  let h = '<div class="tl-track"></div><div class="tl-ship" id="tlShip"></div>';
  BODIES.forEach((b, i) => {
    const s = b.id === 'sun' ? 14 : 6 + Math.sqrt(b.dKm / 142984) * 8;
    h += `<button class="tl-node ${i % 2 ? 'dn' : 'up'}" data-go="${b.id}" style="--c:${b.accent};--s:${s.toFixed(1)}px" aria-label="${b.name}"><i></i><span>${b.name}</span></button>`;
  });
  els.timeline.innerHTML = h;
  $$('.tl-node', els.timeline).forEach((n) => { tlNodes[n.dataset.go] = n; });
})();
function tlX(b) { return isSmall() ? 4 + (b.order / 8) * 92 : 2 + 96 * Math.sqrt(b.au / 30.1); }
function layoutTimeline() { BODIES.forEach((b) => { tlNodes[b.id].style.left = tlX(b) + '%'; }); }
function timelineActive(id) { Object.entries(tlNodes).forEach(([k, n]) => n.classList.toggle('on', k === id)); }
els.timeline.addEventListener('click', (e) => { const n = e.target.closest('.tl-node'); if (!n) return; if (S.mode === 'journey') { S.journeyTo = JOURNEY.indexOf(n.dataset.go); return; } selectBody(byId[n.dataset.go]); });

/* =========================================================
   Guided tour
   ========================================================= */
const TOURS = { i: 0, paused: false, armed: -1 };
const TOUR_READ = 9;
function startTour() {
  if (S.mode === 'landing') return;
  stopTransient(); leaveCompare(); closePanel(); hideHud(); closeDrawer(true); resetExploreFx();
  setMode('tour'); els.back.classList.add('on'); setNavActive(null);
  TOURS.paused = false; S.voTo = isSmall() ? { x: 0, y: H * 0.17 } : { x: 0, y: 105 };
  runTourStep(0);
}
function runTourStep(i) {
  TOURS.i = clamp(i, 0, TOUR.length - 1); TOURS.armed = -1;
  const st = TOUR[TOURS.i];
  const done = () => { TOURS.armed = T; };
  if (st.id === 'system') {
    S.focus = null; S.sel = null; setAccent(null); timelineActive(null);
    flyTo(homePose, { dur: 3, onDone: done });
  } else {
    const b = byId[st.id]; S.sel = b; S.focus = { b }; setAccent(b); timelineActive(b.id);
    flyTo(() => poseFor({ b }, focusMul(b) * 1.25), { dur: 3.2, follow: { b }, onDone: done });
  }
  renderTourCard();
}
function renderTourCard() {
  const st = TOUR[TOURS.i], last = TOURS.i === TOUR.length - 1;
  const b = byId[st.id];
  els.tour.innerHTML = `<div class="fc-step">Step ${TOURS.i + 1} of ${TOUR.length}</div><h3 class="fc-title">${st.title}</h3><p class="fc-text">${st.text}</p>
    <div class="fc-bar"><i id="tourFill"></i></div>
    <div class="fc-row"><div class="grp"><button class="icon-btn" data-t="prev" aria-label="Previous step" ${TOURS.i === 0 ? 'disabled style="opacity:.35"' : ''}>${ICON.prev}</button><button class="icon-btn" data-t="pause" aria-label="${TOURS.paused ? 'Resume' : 'Pause'} tour">${TOURS.paused ? ICON.play : ICON.pause}</button><button class="icon-btn" data-t="next" aria-label="Next step" ${last ? 'disabled style="opacity:.35"' : ''}>${ICON.next}</button></div>
    <div class="grp">${b ? `<button class="btn" data-t="guide">Open ${b.name} guide</button>` : ''}<button class="btn ${last ? 'primary' : ''}" data-t="exit">${last ? 'Finish tour' : 'Exit tour'}</button></div></div>`;
  els.tour.classList.add('on');
}
els.tour.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return;
  const a = t.dataset.t;
  if (a === 'prev') runTourStep(TOURS.i - 1);
  else if (a === 'next') runTourStep(TOURS.i + 1);
  else if (a === 'pause') { TOURS.paused = !TOURS.paused; if (!TOURS.paused && TOURS.armed >= 0) TOURS.armed = T - TOURS.pausedAt; else TOURS.pausedAt = TOURS.armed >= 0 ? T - TOURS.armed : 0; renderTourCard(); }
  else if (a === 'guide') { const b = byId[TOUR[TOURS.i].id]; endTour(true); selectBody(b); }
  else if (a === 'exit') { endTour(true); goHome(); }
});
function endTour(silent) {
  els.tour.classList.remove('on');
  if (S.mode === 'tour') setMode('overview');
  S.follow = null;
  if (!silent) goHome();
}
function tickTour() {
  if (S.mode !== 'tour' || TOURS.armed < 0) return;
  const fill = $('#tourFill'); if (!fill) return;
  if (TOURS.paused) return;
  const k = (T - TOURS.armed) / TOUR_READ;
  fill.style.width = Math.min(100, k * 100) + '%';
  if (k >= 1 && TOURS.i < TOUR.length - 1) runTourStep(TOURS.i + 1);
}

/* =========================================================
   Scroll journey
   ========================================================= */
let journeyNearest = -1;
function startJourney() {
  if (S.mode === 'landing') return;
  stopTransient(); leaveCompare(); closePanel(); hideHud(); closeDrawer(true); resetExploreFx();
  const start = S.sel ? JOURNEY.indexOf(S.sel.id) : 0;
  S.journeyT = S.journeyTo = Math.max(0, start);
  setMode('journey'); S.focus = null; S.voTo = { x: 0, y: 0 };
  els.back.classList.add('on'); setNavActive(null);
  $('#journeyBtn').setAttribute('aria-pressed', 'true'); $('#journeyBtn').classList.add('on');
  journeyNearest = -1;
  flyTo(() => journeyPose(S.journeyT), { dur: 2.4 });
  $('#tlShip').classList.add('on');
}
function endJourney(silent) {
  els.journey.classList.remove('on'); $('#tlShip').classList.remove('on');
  $('#journeyBtn').setAttribute('aria-pressed', 'false'); $('#journeyBtn').classList.remove('on');
  if (S.mode === 'journey') { setMode('overview'); S.flight = null; applyControlMode(); controls.target.copy(controls.target); }
  if (!silent) goHome();
}
function tickJourney() {
  if (S.mode !== 'journey') return;
  const t = clamp(S.journeyT, 0, JOURNEY.length - 1);
  const i0 = Math.floor(t), i1 = Math.min(i0 + 1, JOURNEY.length - 1), f = t - i0;
  $('#tlShip').style.left = `calc(${lerp(tlX(byId[JOURNEY[i0]]), tlX(byId[JOURNEY[i1]]), f)}% - 1px)`;
  const n = Math.round(t);
  if (n !== journeyNearest) {
    journeyNearest = n;
    const b = byId[JOURNEY[n]];
    setAccent(b); timelineActive(b.id); S.sel = b;
    els.journey.innerHTML = `<div class="fc-step">${n === 0 ? 'Scroll or swipe to travel outward' : b.id === 'neptune' ? 'The edge of the planets' : `${b.au} AU from the Sun`}</div><h3 class="fc-title">${b.name}</h3><p class="fc-text">${b.oneLiner}</p>
      <div class="fc-row"><div class="grp"><button class="icon-btn" data-j="-1" aria-label="Previous world">${ICON.prev}</button><button class="icon-btn" data-j="1" aria-label="Next world">${ICON.next}</button></div>
      <div class="grp"><button class="btn primary" data-j="guide">Open ${b.name} guide</button><button class="btn" data-j="exit">Exit journey</button></div></div>`;
    els.journey.classList.add('on');
  }
}
els.journey.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return;
  const a = t.dataset.j;
  if (a === 'guide') { const b = byId[JOURNEY[journeyNearest]]; endJourney(true); selectBody(b); }
  else if (a === 'exit') endJourney(false);
  else S.journeyTo = clamp(Math.round(S.journeyTo) + parseInt(a, 10), 0, JOURNEY.length - 1);
});
$('#journeyBtn').addEventListener('click', () => (S.mode === 'journey' ? endJourney(false) : startJourney()));
$('#tourBtn').addEventListener('click', startTour);

/* =========================================================
   Search
   ========================================================= */
const INDEX = [
  ...BODIES.map((b) => ({ type: 'body', b, name: b.name, sub: b.kind, color: b.accent })),
  ...PLANETS.flatMap((b) => b.moonObjs.map((mo) => ({ type: 'moon', b, mo, name: mo.data.name, sub: `Moon of ${b.name}`, color: `rgb(${mo.data.a.map((v) => Math.round(v * 255)).join(',')})` }))),
  ...MISSIONS.map((m, i) => ({ type: 'mission', i, name: m.name, sub: `${m.agency} mission to ${m.targets.map((t) => byId[t].name).join(' and ')}`, color: byId[m.targets[0]].accent }))
];
let resSel = 0, resItems = [];
function runSearch() {
  const q = els.q.value.trim().toLowerCase();
  if (!q) { els.results.classList.remove('open'); resItems = []; return; }
  resItems = INDEX.filter((it) => it.name.toLowerCase().includes(q) || it.sub.toLowerCase().includes(q)).slice(0, 8);
  resSel = 0;
  els.results.innerHTML = resItems.length
    ? resItems.map((it, i) => `<button role="option" data-i="${i}" class="${i === 0 ? 'sel' : ''}"><span class="r-dot" style="background:radial-gradient(circle at 35% 30%, ${it.color}, #0a0c16)"></span><span><b>${esc(it.name)}</b><small>${esc(it.sub)}</small></span></button>`).join('')
    : `<div class="empty">No matches for “${esc(q)}”. Try a planet, a moon like Titan, or a mission like Juno.</div>`;
  els.results.classList.add('open');
}
function chooseResult(it) {
  if (!it) return;
  els.q.value = ''; els.results.classList.remove('open'); els.q.blur(); els.search.classList.remove('open');
  if (S.mode === 'landing') return;
  if (it.type === 'body') selectBody(it.b);
  else if (it.type === 'moon') exploreTarget({ b: it.b, moon: it.mo });
  else { openDrawer('missions'); const el = $('#mission-' + it.i); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.style.borderColor = 'var(--accent-line)'; } }
}
els.q.addEventListener('input', runSearch);
els.q.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); if (!resItems.length) return;
    resSel = (resSel + (e.key === 'ArrowDown' ? 1 : -1) + resItems.length) % resItems.length;
    $$('button', els.results).forEach((b, i) => b.classList.toggle('sel', i === resSel));
  } else if (e.key === 'Enter') chooseResult(resItems[resSel]);
  else if (e.key === 'Escape') { els.q.value = ''; runSearch(); els.q.blur(); els.search.classList.remove('open'); }
});
els.results.addEventListener('mousedown', (e) => { const b = e.target.closest('button'); if (b) { e.preventDefault(); chooseResult(resItems[+b.dataset.i]); } });
els.search.addEventListener('click', (e) => { if (e.target === els.q) return; els.search.classList.add('open'); els.q.focus(); });
els.q.addEventListener('blur', () => setTimeout(() => { if (!els.q.value) { els.search.classList.remove('open'); els.results.classList.remove('open'); } }, 150));

/* =========================================================
   Labels & tooltip
   ========================================================= */
const labelEls = {};
BODIES.forEach((b) => {
  const d = document.createElement('div'); d.className = 'lbl'; d.style.setProperty('--c', b.accent);
  d.innerHTML = `<div class="lb-in"><b>${b.name}</b><small></small><span class="lb-tick"></span></div>`;
  els.labels.appendChild(d); labelEls[b.id] = { el: d, small: d.querySelector('small') };
});
const auEls = PLANETS.map((b) => { const d = document.createElement('div'); d.className = 'lbl au'; d.innerHTML = `<div class="lb-in"><b>${b.au} AU</b></div>`; els.labels.appendChild(d); return { b, el: d }; });
let labelMode = '';
const _p = V3();
function project(pos) { _p.copy(pos).project(cam); return { x: (_p.x * 0.5 + 0.5) * W, y: (-_p.y * 0.5 + 0.5) * H, z: _p.z }; }
function updateLabels() {
  const show = (S.mode === 'overview' || S.mode === 'compare') && !S.flight || (S.view === 'compare' && S.mode === 'compare');
  els.labels.style.opacity = show ? 1 : 0;
  if (!show && els.labels.dataset.hidden === '1') return;
  els.labels.dataset.hidden = show ? '0' : '1';
  const mode = S.view;
  if (mode !== labelMode) {
    labelMode = mode;
    BODIES.forEach((b) => {
      const s = labelEls[b.id].small;
      if (mode === 'compare') s.textContent = b.id === 'sun' ? '' : `${fmt(b.dKm)} km, ${fmtSig(b.dKm / 12756)} × Earth`;
      else s.textContent = b.id === 'sun' ? '1.39 million km across' : `${b.yearLabel} to orbit`;
    });
  }
  const tanH = Math.tan(cam.fov * DEG / 2);
  BODIES.forEach((b) => {
    const L = labelEls[b.id], p = project(b.pos);
    const dist = cam.position.distanceTo(b.pos);
    const sr = (b.group.scale.x / (dist * tanH)) * (H / 2) * (b.rings ? 1.2 : 1);
    const visible = p.z < 1 && p.x > -60 && p.x < W + 60 && p.y > -60 && p.y < H + 60 && b.id !== 'sun';
    if (!visible) { L.el.style.opacity = 0; return; }
    const y = S.view === 'compare' ? p.y + sr + 6 : p.y - sr - 4;
    L.el.style.opacity = S.hover && S.hover.b === b ? 1 : 0.85;
    L.el.style.transform = `translate3d(${p.x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
  });
  auEls.forEach(({ b, el }) => {
    if (S.view !== 'data') { el.style.opacity = 0; return; }
    _v.set(0, 0, b.orbit); const p = project(_v);
    if (p.z >= 1) { el.style.opacity = 0; return; }
    el.style.opacity = 0.9; el.style.transform = `translate3d(${p.x.toFixed(1)}px,${(p.y + 18).toFixed(1)}px,0)`;
  });
}
let tipFor = null;
function showTip(t, x, y) {
  if (!t) { hideTip(); return; }
  const key = t.moon ? t.moon.data.name : t.b.id;
  if (tipFor !== key) {
    tipFor = key;
    if (t.moon) els.tip.innerHTML = `<div class="t-name">${t.moon.data.name}</div><div class="t-kind">Moon of ${t.b.name}</div><div class="t-row"><div><span>Diameter</span>${fmt(MOON_KM[t.moon.data.name] || 0)} km</div></div><div class="t-hint">Click to fly closer</div>`;
    else {
      const b = t.b;
      els.tip.innerHTML = `<div class="t-name">${b.name}</div><div class="t-kind">${b.kind}</div><div class="t-row"><div><span>From the Sun</span>${b.id === 'sun' ? 'Centre' : b.au + ' AU'}</div><div><span>Diameter</span>${fmt(b.dKm)} km</div><div><span>${b.id === 'sun' ? 'Planets' : 'Moons'}</span>${b.moons}</div></div><div class="t-hint">${S.mode === 'compare' ? 'Click to compare' : 'Click to open the guide'}</div>`;
    }
    els.tip.style.setProperty('--accent', t.b.accent);
  }
  const tw = els.tip.offsetWidth || 220, th = els.tip.offsetHeight || 110;
  const px = x + 18 + tw > W ? x - tw - 18 : x + 18, py = y + 18 + th > H ? y - th - 12 : y + 18;
  els.tip.style.transform = `translate(${px}px,${py}px)`;
  els.tip.classList.add('on');
}
function hideTip() { els.tip.classList.remove('on'); tipFor = null; }

/* =========================================================
   Pointer & keyboard input
   ========================================================= */
const ptr = { x: 0, y: 0, down: false, sx: 0, sy: 0, st: 0, over: false, type: 'mouse' };
canvas.addEventListener('pointermove', (e) => {
  ptr.x = e.clientX; ptr.y = e.clientY; ptr.over = true; ptr.type = e.pointerType;
  ndc.set((e.clientX / W) * 2 - 1, -(e.clientY / H) * 2 + 1);
  S.mouse.x = ndc.x; S.mouse.y = ndc.y;
});
canvas.addEventListener('pointerleave', () => { ptr.over = false; S.hover = null; hideTip(); canvas.classList.remove('hovering'); });
canvas.addEventListener('pointerdown', (e) => { ptr.down = true; ptr.sx = e.clientX; ptr.sy = e.clientY; ptr.st = performance.now(); hideTip(); });
addEventListener('pointerup', (e) => {
  if (!ptr.down) return; ptr.down = false;
  if (e.target !== canvas) return;
  const moved = Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy), dtp = performance.now() - ptr.st;
  if (moved > 7 || dtp > 600 || S.mode === 'landing' || S.flight) return;
  ndc.set((e.clientX / W) * 2 - 1, -(e.clientY / H) * 2 + 1);
  const t = pickAt(ndc);
  if (!t) return;
  if (S.mode === 'compare') {
    if (t.b.id === 'sun') return;
    if (t.b.id === CMP.a) return;
    CMP.b = t.b.id; if (els.drawer.dataset.kind === 'compare') { els.drawerBody.innerHTML = compareHTML(); animateCompare(); }
    else openDrawer('compare');
    toast(`Comparing ${byId[CMP.a].name} with ${byId[CMP.b].name}`);
    return;
  }
  if (S.mode === 'journey') { S.journeyTo = JOURNEY.indexOf(t.b.id); return; }
  if (t.moon) { exploreTarget(t); return; }
  if (S.mode === 'explore' && S.focus && !S.focus.moon && S.focus.b === t.b) return;
  selectBody(t.b);
});
function updateHover() {
  const canHover = ptr.over && !ptr.down && !S.flight && ptr.type === 'mouse' && ['overview', 'compare', 'focus', 'explore', 'tour'].includes(S.mode);
  if (!canHover) { if (S.hover) { S.hover = null; hideTip(); canvas.classList.remove('hovering'); } return; }
  if (frameN % 2) return;
  const t = pickAt(ndc);
  const same = t && S.hover && t.b === S.hover.b && t.moon === S.hover.moon;
  S.hover = t;
  canvas.classList.toggle('hovering', !!t);
  const isFocused = t && S.focus && S.focus.b === t.b && !t.moon && !S.focus.moon && (S.mode === 'explore' || S.mode === 'focus');
  if (t && !isFocused) showTip(t, ptr.x, ptr.y); else hideTip();
  if (same) return;
}

// Wheel: landing → start; journey → travel
addEventListener('wheel', (e) => {
  if (S.mode === 'landing') { if (e.deltaY > 8 && !$('#start').disabled) startExperience(false); return; }
  if (S.mode === 'journey') {
    if (e.target.closest && e.target.closest('.float-card, .drawer, .panel')) return;
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    if (!S.flight) S.journeyTo = clamp(S.journeyTo + dy * 0.0022, 0, JOURNEY.length - 1);
  }
}, { passive: false });
let touchY = null;
addEventListener('touchstart', (e) => { touchY = e.touches.length === 1 ? e.touches[0].clientY : null; }, { passive: true });
addEventListener('touchmove', (e) => {
  if (touchY == null) return;
  const y = e.touches[0].clientY, dy = touchY - y; touchY = y;
  if (S.mode === 'landing' && dy > 12 && !$('#start').disabled) startExperience(false);
  else if (S.mode === 'journey' && !S.flight && e.target === canvas) S.journeyTo = clamp(S.journeyTo + dy * 0.009, 0, JOURNEY.length - 1);
}, { passive: true });

addEventListener('keydown', (e) => {
  const typing = e.target.matches && e.target.matches('input, textarea');
  if (e.key === '/' && !typing) { e.preventDefault(); els.search.classList.add('open'); els.q.focus(); return; }
  if (typing) return;
  if (e.key === 'Escape') {
    if (S.mode === 'explore') { S.focus.moon ? exploreTarget({ b: S.focus.b }) : selectBody(S.focus.b); }
    else if (S.mode === 'focus' || S.mode === 'compare') goHome();
    else if (S.mode === 'tour') endTour(false);
    else if (S.mode === 'journey') endJourney(false);
    else if (els.drawer.classList.contains('on')) closeDrawer();
    return;
  }
  if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && (S.mode === 'focus' || S.mode === 'explore') && S.sel) {
    const i = BODIES.indexOf(S.sel), n = BODIES[(i + (e.key === 'ArrowRight' ? 1 : -1) + BODIES.length) % BODIES.length];
    S.mode === 'explore' ? exploreTarget({ b: n }) : selectBody(n);
  }
  if (S.mode === 'journey' && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    e.preventDefault(); S.journeyTo = clamp(Math.round(S.journeyTo) + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1), 0, JOURNEY.length - 1);
  }
});

/* ---------- Top controls ---------- */
$$('#nav button').forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.nav;
  if (S.mode === 'landing') return;
  if (k === 'system') goHome();
  else if (k === 'compare') setView('compare');
  else { if (els.drawer.dataset.kind === k && els.drawer.classList.contains('on')) { closeDrawer(); return; } if (S.view === 'compare') setView('realistic'); openDrawer(k); }
}));
$$('#views button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
$('#brand').addEventListener('click', () => { if (S.mode !== 'landing') goHome(); });
els.back.addEventListener('click', () => {
  if (S.mode === 'tour') endTour(false);
  else if (S.mode === 'journey') endJourney(false);
  else goHome();
});
$$('#time button').forEach((b) => b.addEventListener('click', () => {
  S.simSpeed = parseFloat(b.dataset.speed);
  $$('#time button').forEach((x) => x.classList.toggle('on', x === b));
  toast(S.simSpeed === 0 ? 'Orbits paused' : `Time runs at ${S.simSpeed}× speed`);
}));

/* ---------- Per-frame overlay ---------- */
function updateOverlay() {
  updateHover(); updateLabels(); updateTelemetry(); tickTour(); tickJourney();
}

/* ---------- Layout changes ---------- */
function onLayoutChange() {
  const small = isSmall();
  const rail = $('#rail'), tools = $('#tools');
  if (small && els.views.parentElement !== rail) rail.insertBefore(els.views, $('.rail-actions'));
  if (!small && els.views.parentElement !== tools) tools.appendChild(els.views);
  layoutTimeline();
  moveInk(els.nav, $('.nav-ink')); moveInk(els.views, $('.views-ink'));
  if (S.mode === 'focus') S.voTo = panelOffset();
  else if (S.mode === 'explore') S.voTo = hudOffset();
  else if (S.mode === 'compare') S.voTo = drawerOffset();
}

/* =========================================================
   Boot & landing
   ========================================================= */
function onBakeProgress(done, total, label) {
  $('#bootFill').style.width = (done / total * 100) + '%';
  $('#bootText').textContent = done >= total ? 'Ready' : label;
  if (done >= 2) { $('#start').disabled = false; $('#startTour').disabled = false; }
  if (done >= total) setTimeout(() => $('#boot').classList.add('done'), 800);
}
function startExperience(tour) {
  if (S.mode !== 'landing') return;
  bodyEl.classList.add('leaving');
  setMode('overview');
  S.voTo = { x: 0, y: 0 };
  flyTo(homePose, { dur: REDUCED ? 0.8 : 3.6, lift: 70, onDone: () => { if (tour) startTour(); } });
  setTimeout(() => {
    bodyEl.classList.remove('is-landing', 'leaving');
    setNavActive('system'); syncViewTabs(); onLayoutChange();
    if (!tour) setTimeout(() => toast(ptr.type === 'mouse' ? 'Drag to orbit, scroll to zoom, click a world to open its guide' : 'Drag to orbit, pinch to zoom, tap a world to open its guide'), 1600);
  }, 1100);
}
$('#start').addEventListener('click', () => startExperience(false));
$('#startTour').addEventListener('click', () => startExperience(true));

/* ---------- Go ---------- */
setMode('landing');
S.voTo = isSmall() ? { x: 0, y: -H * 0.24 } : { x: -W * 0.14, y: 0 };
S.vo = { ...S.voTo };
cam.position.copy(landingPose(0).pos); controls.target.copy(landingPose(0).target); cam.lookAt(controls.target);
layoutTimeline(); syncViewTabs();
requestAnimationFrame(frame);
