/* =========================================================
   Scene
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const IS_MOBILE = matchMedia('(max-width: 760px)').matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Y_AXIS = V3(0, 1, 0);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

const canvas = $('#scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
} catch (e) {
  renderer = null;
}
if (!renderer || !renderer.getContext()) { $('#nogl').classList.add('on'); throw new Error('WebGL unavailable'); }

let W = innerWidth, H = innerHeight;
let PR = Math.min(devicePixelRatio || 1, IS_MOBILE ? 1.5 : 1.75);
renderer.setPixelRatio(PR);
renderer.setSize(W, H, false);
renderer.setClearColor(0x000000, 1);
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(45, W / H, 0.5, 14000);
cam.position.set(200, 40, 200);
const controls = new THREE.OrbitControls(cam, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.07;
controls.rotateSpeed = 0.55; controls.zoomSpeed = 0.9; controls.panSpeed = 0.7;
controls.screenSpacePanning = true; controls.minDistance = 12; controls.maxDistance = 900;
controls.enabled = false;

// Shared uniforms
const U = { sun: { value: V3() }, time: { value: 0 }, boost: { value: 0.92 } };

/* ---------- Post-processing (optional) ---------- */
let composer = null, bloom = null, bloomOn = false;
try {
  if (THREE.EffectComposer && THREE.UnrealBloomPass) {
    composer = new THREE.EffectComposer(renderer);
    composer.setPixelRatio(PR);
    composer.setSize(W, H);
    composer.addPass(new THREE.RenderPass(scene, cam));
    bloom = new THREE.UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.9, 0.55, 0.9);
    composer.addPass(bloom);
    bloomOn = true;
  }
} catch (e) { composer = null; bloomOn = false; }

/* ---------- Texture baking (equirectangular, on the GPU) ---------- */
const WHITE_TEX = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat); WHITE_TEX.needsUpdate = true;
const BLACK_TEX = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat); BLACK_TEX.needsUpdate = true;
const bakeMat = new THREE.ShaderMaterial({
  vertexShader: BAKE_VERT, fragmentShader: BAKE_FRAG, depthTest: false, depthWrite: false,
  uniforms: { uType: { value: 0 }, uSeed: { value: 0 }, uMode: { value: 0 }, uA: { value: V3() }, uB: { value: V3() }, uC: { value: V3() }, uD: { value: V3() } }
});
const bakeScene = new THREE.Scene();
const bakeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
const bakeQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bakeMat); bakeQuad.frustumCulled = false; bakeScene.add(bakeQuad);
function bakeTexture(type, seed, cols, mode, w) {
  const h = w / 2;
  const rt = new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true,
    wrapS: THREE.RepeatWrapping, wrapT: THREE.ClampToEdgeWrapping, depthBuffer: false, stencilBuffer: false, format: THREE.RGBAFormat
  });
  rt.texture.anisotropy = Math.min(8, MAX_ANISO);
  const u = bakeMat.uniforms;
  u.uType.value = type; u.uSeed.value = seed; u.uMode.value = mode || 0;
  ['uA', 'uB', 'uC', 'uD'].forEach((k, i) => { const c = (cols && cols[i]) || [0, 0, 0]; u[k].value.set(c[0], c[1], c[2]); });
  renderer.setRenderTarget(rt);
  renderer.render(bakeScene, bakeCam);
  renderer.setRenderTarget(null);
  return rt.texture;
}
const TEX = IS_MOBILE ? 1 : 2; // resolution multiplier
const bakeQueue = [];
let bakeTotal = 0, bakeDone = 0;

/* ---------- Geometry ---------- */
const sphereGeo = new THREE.SphereGeometry(1, 96, 64);
const moonGeo = new THREE.SphereGeometry(1, 32, 24);
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.12, 'rgba(255,240,210,.75)');
  gr.addColorStop(0.35, 'rgba(255,170,90,.22)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); return t;
})();

/* ---------- Background: baked nebula + stars ---------- */
const nebulaMat = new THREE.MeshBasicMaterial({ map: BLACK_TEX, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false });
const nebula = new THREE.Mesh(new THREE.SphereGeometry(6000, 48, 32), nebulaMat);
nebula.renderOrder = -10; scene.add(nebula);
bakeQueue.push({ label: 'Mapping the Milky Way', run: () => { nebulaMat.map = bakeTexture(8, 3.1, null, 0, 1024 * TEX); nebulaMat.needsUpdate = true; } });

const starMat = new THREE.ShaderMaterial({
  vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uTime: U.time, uPR: { value: PR }, uOpacity: { value: 1 } }
});
function makeStars() {
  const nMain = IS_MOBILE ? 5000 : 9000, nBand = IS_MOBILE ? 7000 : 15000, n = nMain + nBand;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), ph = new Float32Array(n);
  const palette = [[0.62, 0.74, 1.0], [0.8, 0.87, 1.0], [1, 1, 1], [1, 0.95, 0.85], [1, 0.84, 0.64], [1, 0.72, 0.55]];
  const bn = V3(0.25, 1.0, -0.35).normalize();
  const bu = V3(1, 0, 0).cross(bn).normalize(), bv = bn.clone().cross(bu).normalize();
  const core = V3(-0.8, -0.05, 0.55).normalize();
  const gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += Math.random(); return (s - 2) / 2; };
  const tmp = V3();
  for (let i = 0; i < n; i++) {
    let r = 3000 + Math.random() * 1200;
    if (i < nMain) {
      const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      tmp.set(s * Math.cos(t), u, s * Math.sin(t));
      size[i] = 0.7 + Math.pow(Math.random(), 7) * 4.2;
      const c = palette[(Math.random() * palette.length) | 0], k = 0.55 + Math.random() * 0.45;
      col.set([c[0] * k, c[1] * k, c[2] * k], i * 3);
    } else {
      const t = Math.random() * Math.PI * 2;
      tmp.copy(bu).multiplyScalar(Math.cos(t)).addScaledVector(bv, Math.sin(t));
      const nearCore = Math.max(0, tmp.dot(core));
      tmp.addScaledVector(bn, gauss() * (0.1 + 0.12 * nearCore * nearCore)).normalize();
      size[i] = 0.5 + Math.random() * 1.1;
      const c = palette[(Math.random() * 4 + 1) | 0], k = 0.25 + Math.random() * 0.35 + nearCore * 0.2;
      col.set([c[0] * k, c[1] * k, c[2] * k], i * 3);
    }
    pos.set([tmp.x * r, tmp.y * r, tmp.z * r], i * 3);
    ph[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  const p = new THREE.Points(g, starMat); p.frustumCulled = false; p.renderOrder = -9;
  return p;
}
const stars = makeStars(); scene.add(stars);

/* ---------- Sun ---------- */
const SUN = byId.sun;
const sunMat = new THREE.ShaderMaterial({ vertexShader: SUN_VERT, fragmentShader: SUN_FRAG, uniforms: { uTime: U.time } });
SUN.group = new THREE.Group(); scene.add(SUN.group);
SUN.spin = new THREE.Mesh(sphereGeo, sunMat); SUN.group.add(SUN.spin);
SUN.group.scale.setScalar(SUN.r);
const coronaMat = new THREE.ShaderMaterial({
  vertexShader: CORONA_VERT, fragmentShader: CORONA_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uTime: U.time, uR: { value: 10 / 45 }, uOpacity: { value: 1 } }
});
const corona = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), coronaMat); scene.add(corona);
const glowA = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd9a0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
glowA.scale.setScalar(64); scene.add(glowA);
const glowB = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a50, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
glowB.scale.setScalar(200); scene.add(glowB);
SUN.pos = V3();

/* ---------- Planets ---------- */
function planetMaterial(b) {
  const m = new THREE.ShaderMaterial({
    vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG,
    uniforms: {
      uMap: { value: WHITE_TEX }, uNight: { value: BLACK_TEX }, uBaked: { value: 0 },
      uHasNight: { value: b.night ? 1 : 0 }, uSpec: { value: b.spec || 0 }, uWrap: { value: b.wrap || 0 },
      uFallback: { value: V3(...b.fallback) }, uSun: U.sun,
      uAtmo: { value: V3(...(b.atmoCol || [0, 0, 0])) }, uAtmoAmt: { value: b.atmoCol ? b.atmoAmt : 0 },
      uScan: { value: 0 }, uScanCol: { value: new THREE.Color(b.accent) }, uTime: U.time, uLightBoost: U.boost
    }
  });
  m.extensions.derivatives = true;
  return m;
}
function moonMaterial(m, seed) {
  return new THREE.ShaderMaterial({
    vertexShader: MOON_VERT, fragmentShader: MOON_FRAG,
    uniforms: { uA: { value: V3(...m.a) }, uB: { value: V3(...m.b) }, uSun: U.sun, uSeed: { value: seed }, uTwoTone: { value: m.twoTone || 0 }, uLightBoost: U.boost }
  });
}
function circleGeo(radius, seg) {
  const pos = new Float32Array(seg * 3), t = new Float32Array(seg);
  for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; pos[i * 3] = Math.cos(a) * radius; pos[i * 3 + 2] = -Math.sin(a) * radius; t[i] = i / seg; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.BufferAttribute(t, 1));
  return g;
}
const TWO_PI = Math.PI * 2;

PLANETS.forEach((b, idx) => {
  b.theta = b.angle0;
  b.omega = (TWO_PI / 130) * Math.sqrt(365.25 / b.yearD);
  b.spinRate = Math.sign(b.spinH) * (TWO_PI / 22) * Math.pow(23.93 / Math.abs(b.spinH), 0.42);
  b.pos = V3(); b.orbitPos = V3(); b.rowPos = V3();
  const g = new THREE.Group(); scene.add(g); b.group = g;
  const tilt = new THREE.Group(); tilt.rotation.x = -b.tilt * DEG; g.add(tilt); b.tiltGroup = tilt;
  b.mat = planetMaterial(b);
  b.spin = new THREE.Mesh(sphereGeo, b.mat); tilt.add(b.spin);
  b.spin.rotation.y = idx * 1.3;

  if (b.atmoCol) {
    const am = new THREE.ShaderMaterial({
      vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uSun: U.sun, uCol: { value: V3(...b.atmoCol) }, uSunset: { value: V3(...b.sunset) }, uAmt: { value: b.atmoAmt }, uEdge: { value: Math.sqrt(1 - 1 / (b.shell * b.shell)) } }
    });
    b.atmoMesh = new THREE.Mesh(sphereGeo, am); b.atmoMesh.scale.setScalar(b.shell); b.atmoMesh.renderOrder = 3; tilt.add(b.atmoMesh);
  }
  if (b.clouds) {
    b.cloudMat = new THREE.ShaderMaterial({
      vertexShader: PLANET_VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false,
      uniforms: { uMap: { value: WHITE_TEX }, uBaked: { value: 0 }, uSun: U.sun, uOpacity: { value: 1 }, uLightBoost: U.boost }
    });
    b.cloud = new THREE.Mesh(sphereGeo, b.cloudMat); b.cloud.scale.setScalar(1.012); b.cloud.renderOrder = 1; tilt.add(b.cloud);
  }
  if (b.rings) {
    const rg = new THREE.RingGeometry(b.rings.inner, b.rings.outer, 192, 1);
    b.ringMat = new THREE.ShaderMaterial({
      vertexShader: RING_VERT, fragmentShader: RING_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        uInner: { value: b.rings.inner }, uOuter: { value: b.rings.outer }, uStyle: { value: b.rings.style }, uOpacity: { value: b.rings.opacity },
        uA: { value: V3(...b.rings.a) }, uB: { value: V3(...b.rings.b) }, uSun: U.sun, uPlanetPos: { value: V3() }, uPlanetR: { value: 1 }, uLightBoost: U.boost
      }
    });
    b.ringMat.extensions.derivatives = true;
    b.ring = new THREE.Mesh(rg, b.ringMat); b.ring.rotation.x = -Math.PI / 2; b.ring.renderOrder = 2; tilt.add(b.ring);
  }
  // Moons orbit in the planet's equatorial plane
  b.moonGroup = new THREE.Group(); tilt.add(b.moonGroup);
  b.moonObjs = b.moonsList.map((m, i) => {
    const pivot = new THREE.Group(); pivot.rotation.x = m.inc * DEG; pivot.rotation.z = (i * 0.37) % 0.2; b.moonGroup.add(pivot);
    const orb = new THREE.Group(); orb.rotation.y = i * 2.1 + idx; pivot.add(orb);
    const mesh = new THREE.Mesh(moonGeo, moonMaterial(m, i * 3.7 + idx)); mesh.position.set(m.d, 0, 0); mesh.scale.setScalar(m.r); orb.add(mesh);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xbfd2ff, transparent: true, opacity: 0.12, depthWrite: false });
    const line = new THREE.LineLoop(circleGeo(m.d, 128), lineMat); pivot.add(line);
    return { data: m, parent: b, mesh, orb, line, speed: 0.9 * Math.pow(m.d, -1.5), pos: V3() };
  });

  // Orbit path with a trail behind the planet
  b.orbitMat = new THREE.ShaderMaterial({
    vertexShader: ORBIT_VERT, fragmentShader: ORBIT_FRAG, transparent: true, depthWrite: false,
    uniforms: { uAngle: { value: 0 }, uColor: { value: new THREE.Color(b.accent).lerp(new THREE.Color('#ffffff'), 0.35) }, uBase: { value: 0.09 }, uTrail: { value: 0.55 }, uOpacity: { value: 1 } }
  });
  b.orbitLine = new THREE.LineLoop(circleGeo(b.orbit, 512), b.orbitMat); scene.add(b.orbitLine);

  // bake jobs
  const w = (['earth', 'jupiter', 'saturn', 'mars'].includes(b.id) ? 1024 : 512) * TEX;
  bakeQueue.push({ label: `Rendering ${b.name}`, run: () => { b.mat.uniforms.uMap.value = bakeTexture(b.bake.type, b.bake.seed, b.bake.cols, 0, w); b.bakedAt = performance.now(); } });
  if (b.clouds) bakeQueue.push({ label: 'Forming cloud systems', run: () => { b.cloudMat.uniforms.uMap.value = bakeTexture(2, b.bake.seed, null, 1, w); } });
  if (b.night) bakeQueue.push({ label: 'Switching on city lights', run: () => { b.mat.uniforms.uNight.value = bakeTexture(2, b.bake.seed, null, 2, w); } });
});
bakeTotal = bakeQueue.length;

/* ---------- Belts & solar wind ---------- */
function makeBelt(n, r0, r1, thick, color, opacity, scale) {
  const pos = new Float32Array(n * 3), sz = new Float32Array(n), sh = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = Math.random() * TWO_PI, rr = r0 + (r1 - r0) * Math.pow(Math.random(), 0.8) * (0.85 + Math.random() * 0.15);
    pos[i * 3] = Math.cos(t) * rr; pos[i * 3 + 1] = (Math.random() + Math.random() - 1) * thick; pos[i * 3 + 2] = Math.sin(t) * rr;
    sz[i] = 0.6 + Math.pow(Math.random(), 3) * 2.2; sh[i] = 0.45 + Math.random() * 0.55;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1)); g.setAttribute('aShade', new THREE.BufferAttribute(sh, 1));
  const m = new THREE.ShaderMaterial({ vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false,
    uniforms: { uPR: { value: PR }, uScale: { value: scale }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } } });
  const p = new THREE.Points(g, m); p.userData.baseOpacity = opacity; return p;
}
const asteroidBelt = makeBelt(IS_MOBILE ? 1500 : 3200, 80, 97, 1.6, '#b8aa98', 0.8, 150); scene.add(asteroidBelt);
const kuiperBelt = makeBelt(IS_MOBILE ? 900 : 1800, 245, 320, 5, '#8fa6c8', 0.45, 180); scene.add(kuiperBelt);
const wind = (() => {
  const n = IS_MOBILE ? 500 : 1000, dir = new Float32Array(n * 3), seed = new Float32Array(n), pos = new Float32Array(n * 3);
  const v = V3();
  for (let i = 0; i < n; i++) { v.set(Math.random() * 2 - 1, (Math.random() * 2 - 1) * 0.3, Math.random() * 2 - 1).normalize(); dir.set([v.x, v.y, v.z], i * 3); seed[i] = Math.random(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({ vertexShader: WIND_VERT, fragmentShader: WIND_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: U.time, uPR: { value: PR }, uOpacity: { value: 0.5 } } });
  const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
})();
scene.add(wind);

/* ---------- Gravity-well grid (Data view) ---------- */
const GW = { sun: [700, 300], mercury: [3, 3], venus: [7, 5], earth: [7.5, 5], mars: [4, 3], jupiter: [60, 40], saturn: [40, 34], uranus: [18, 16], neptune: [19, 16] };
const gridGeo = new THREE.PlaneGeometry(720, 720, IS_MOBILE ? 140 : 220, IS_MOBILE ? 140 : 220); gridGeo.rotateX(-Math.PI / 2);
const gridMat = new THREE.ShaderMaterial({
  vertexShader: GRID_VERT, fragmentShader: GRID_FRAG, transparent: true, depthWrite: false,
  uniforms: { uBodies: { value: BODIES.map(() => new THREE.Vector4()) }, uOpacity: { value: 0 }, uCool: { value: new THREE.Color('#5fa8ff') }, uWarm: { value: new THREE.Color('#ffb45e') } }
});
gridMat.extensions.derivatives = true;
const grid = new THREE.Mesh(gridGeo, gridMat); grid.position.y = -9; grid.visible = false; grid.frustumCulled = false; scene.add(grid);

/* ---------- Hover ring ---------- */
const hoverRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.03, 128), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
scene.add(hoverRing);

/* ---------- Comparison-view lineup at true relative size ---------- */
(function layoutRow() {
  const gap = 3.5;
  const ext = (b) => b.cmpR * (b.id === 'saturn' ? 2.34 : b.id === 'uranus' ? 2.05 : 1);
  let x = 0; const xs = [];
  PLANETS.forEach((b, i) => { if (i) x += gap; x += ext(b); xs.push(x); x += ext(b); });
  const mid = x / 2;
  PLANETS.forEach((b, i) => b.rowPos.set(mid - xs[i], 0, 300));
  window.__rowWidth = x;
})();
const COMPARE_LIGHT = V3(170, 90, 140);

/* =========================================================
   State & camera
   ========================================================= */
const S = {
  mode: 'landing', view: 'realistic', sel: null, hover: null, focus: null,
  simSpeed: 1, spinMul: 1,
  arrange: 0, arrFrom: 0, arrTo: 0, arrT: 1,
  gridOp: 0, gridTo: 0, orbitOp: 1, orbitTo: 1,
  vo: { x: 0, y: 0 }, voTo: { x: 0, y: 0 },
  flight: null, follow: null, followLast: V3(),
  journeyT: 0, journeyTo: 0,
  landingT: 0, mouse: { x: 0, y: 0 }
};
const ndc = new THREE.Vector2(9, 9);
const raycaster = new THREE.Raycaster();

function tgtPos(t) { return t.moon ? t.moon.pos : t.b.pos; }
function tgtR(t) { return t.moon ? t.moon.parent.group.scale.x * t.moon.data.r : t.b.group.scale.x; }
function poseFor(t, distMul) {
  const p = tgtPos(t).clone(), R = tgtR(t);
  let dir;
  if (!t.moon && t.b.id === 'sun') dir = V3(0.42, 0.28, 1).normalize();
  else {
    dir = p.clone().setY(0).negate();
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    dir.normalize().applyAxisAngle(Y_AXIS, 0.78); dir.y = 0.3; dir.normalize();
  }
  return { pos: p.clone().addScaledVector(dir, R * distMul), target: p };
}
function homePose() {
  const a = W / H;
  const k = a < 1 ? clamp(1.25 / a, 1, 2.3) : 1;
  return { pos: V3(0, 185 * k, 328 * k), target: V3(0, -8, -6) };
}
function comparePose() {
  const usable = W > 760 ? Math.max(360, W - 500) : W;
  const a = usable / H;
  const need = (window.__rowWidth + 16) / 2;
  let D = need / (Math.tan(22.5 * DEG) * a) * 1.14;
  D = Math.min(D, a < 1 ? 150 : 260);
  return { pos: V3(0, D * 0.2, 300 - D), target: V3(0, 0, 300) };
}
function landingPose(t) {
  const a = 0.55 + t * 0.012;
  const r = W / H < 1 ? 330 : 250;
  return { pos: V3(Math.sin(a) * r + S.mouse.x * 8, 34 - S.mouse.y * 6, Math.cos(a) * r), target: V3(0, 6, 0) };
}

function flyTo(getDest, { dur = 2.4, lift = null, follow = null, onDone = null } = {}) {
  const d0 = getDest();
  const dist = cam.position.distanceTo(d0.pos);
  S.flight = {
    t: 0, dur: REDUCED ? 0.6 : dur, fromPos: cam.position.clone(), fromTarget: controls.target.clone(), getDest,
    lift: lift == null ? clamp(dist * 0.28, 4, 90) : lift, follow, onDone
  };
  S.follow = null;
  controls.enabled = false;
  controls.autoRotate = false;
}
function stepCamera(dt) {
  if (S.flight) {
    const f = S.flight;
    f.t = Math.min(1, f.t + dt / f.dur);
    const k = ease(f.t), kt = easeOut(Math.min(1, f.t * 1.25));
    const d = f.getDest();
    cam.position.lerpVectors(f.fromPos, d.pos, k);
    cam.position.y += Math.sin(Math.PI * k) * f.lift;
    controls.target.lerpVectors(f.fromTarget, d.target, kt);
    cam.lookAt(controls.target);
    if (f.t >= 1) {
      S.flight = null;
      if (f.follow) { S.follow = f.follow; S.followLast.copy(tgtPos(f.follow)); }
      applyControlMode();
      if (f.onDone) f.onDone();
    }
    return;
  }
  if (S.mode === 'landing') {
    const p = landingPose(S.landingT);
    cam.position.lerp(p.pos, 0.05); controls.target.lerp(p.target, 0.05); cam.lookAt(controls.target);
    return;
  }
  if (S.mode === 'journey') { stepJourney(dt); return; }
  if (S.follow) {
    const p = tgtPos(S.follow);
    const dx = p.x - S.followLast.x, dy = p.y - S.followLast.y, dz = p.z - S.followLast.z;
    cam.position.x += dx; cam.position.y += dy; cam.position.z += dz;
    controls.target.x += dx; controls.target.y += dy; controls.target.z += dz;
    S.followLast.copy(p);
  }
  controls.update();
}
function applyControlMode() {
  const m = S.mode;
  controls.enabled = !['landing', 'journey'].includes(m) && !S.flight;
  controls.enablePan = m === 'overview' || m === 'compare';
  controls.autoRotate = false;
  if (m === 'overview' || (m === 'tour' && !S.focus)) { controls.minDistance = 14; controls.maxDistance = 900; }
  else if (m === 'compare') { controls.minDistance = 10; controls.maxDistance = 600; }
  else if (S.focus) {
    const R = tgtR(S.focus);
    if (m === 'explore') { controls.minDistance = R * 1.18; controls.maxDistance = R * 14; controls.autoRotate = !!S.autoOrbit && !REDUCED; controls.autoRotateSpeed = 0.35; }
    else { controls.minDistance = R * 1.35; controls.maxDistance = R * 40; }
  }
}

/* ---------- Journey (scroll-driven travel) ---------- */
const JOURNEY = ['sun', ...PLANETS.map((p) => p.id)];
function journeyPose(i) {
  const b = byId[JOURNEY[clamp(i, 0, JOURNEY.length - 1)]];
  return poseFor({ b }, b.id === 'sun' ? 6.5 : b.rings ? 7.5 : 6.5);
}
function stepJourney(dt) {
  S.journeyT += (S.journeyTo - S.journeyT) * Math.min(1, dt * 2.6);
  const t = clamp(S.journeyT, 0, JOURNEY.length - 1);
  const i = Math.floor(t), f = t - i;
  const A = journeyPose(i), B = journeyPose(Math.min(i + 1, JOURNEY.length - 1));
  const k = f * f * (3 - 2 * f);
  const lift = Math.sin(Math.PI * f) * clamp(A.pos.distanceTo(B.pos) * 0.22, 3, 50);
  cam.position.lerpVectors(A.pos, B.pos, k); cam.position.y += lift;
  controls.target.lerpVectors(A.target, B.target, k);
  cam.lookAt(controls.target);
}

/* ---------- Arrangement: orbits ↔ lineup ---------- */
function setArrange(to) { if (S.arrTo === to) return; S.arrFrom = S.arrange; S.arrTo = to; S.arrT = 0; }

/* ---------- Picking ---------- */
const _oc = V3();
function raySphere(ray, c, R) {
  _oc.subVectors(ray.origin, c);
  const b = _oc.dot(ray.direction), cc = _oc.lengthSq() - R * R, h = b * b - cc;
  if (h < 0) return Infinity;
  const t = -b - Math.sqrt(h);
  return t > 0 ? t : (cc < 0 ? 0 : Infinity);
}
function pickAt(v2) {
  raycaster.setFromCamera(v2, cam);
  const ray = raycaster.ray;
  let best = null, bd = Infinity;
  const test = (target, pos, R) => { const t = raySphere(ray, pos, R); if (t < bd) { bd = t; best = target; } };
  BODIES.forEach((b) => {
    const R = b.group.scale.x, d = cam.position.distanceTo(b.pos);
    const hitR = b.id === 'sun' ? R * 1.15 : Math.max(R * (b.rings ? 1.9 : 1.45), d * 0.017);
    test({ b }, b.pos, hitR);
  });
  if (S.focus && (S.mode === 'focus' || S.mode === 'explore') && S.arrange < 0.05) {
    const pb = S.focus.b;
    (pb.moonObjs || []).forEach((mo) => {
      if (!pb.moonGroup.visible) return;
      const R = pb.group.scale.x * mo.data.r, d = cam.position.distanceTo(mo.pos);
      test({ b: pb, moon: mo }, mo.pos, Math.max(R * 1.8, d * 0.012));
    });
  }
  return best;
}

/* ---------- Resize ---------- */
function onResize() {
  W = innerWidth; H = innerHeight;
  cam.aspect = W / H; cam.updateProjectionMatrix();
  renderer.setSize(W, H, false);
  if (composer) { composer.setSize(W, H); }
  if (typeof onLayoutChange === 'function') onLayoutChange();
}
addEventListener('resize', onResize);

/* =========================================================
   Frame loop
   ========================================================= */
let last = performance.now(), T = 0, frameN = 0, perfAcc = 0, perfN = 0, lastNear = 0.5;
const _v = V3(), _q = new THREE.Quaternion();

function updateWorld(dt) {
  // arrangement tween
  if (S.arrT < 1) { S.arrT = Math.min(1, S.arrT + dt / (REDUCED ? 0.5 : 1.9)); S.arrange = lerp(S.arrFrom, S.arrTo, ease(S.arrT)); }
  const e = S.arrange;
  U.sun.value.set(0, 0, 0).lerp(COMPARE_LIGHT, e);

  const orbitK = S.simSpeed;
  const spinK = S.spinMul * (S.simSpeed === 0 ? 1 : Math.sqrt(S.simSpeed));
  const moonK = S.simSpeed === 0 ? 0 : Math.sqrt(S.simSpeed);
  SUN.spin.rotation.y += dt * 0.02 * spinK;

  PLANETS.forEach((b) => {
    b.theta += b.omega * dt * orbitK;
    b.orbitPos.set(Math.cos(b.theta) * b.orbit, 0, -Math.sin(b.theta) * b.orbit);
    b.group.position.lerpVectors(b.orbitPos, b.rowPos, e);
    b.group.scale.setScalar(lerp(b.r, b.cmpR, e));
    b.pos.copy(b.group.position);
    b.spin.rotation.y += b.spinRate * dt * spinK;
    if (b.cloud) b.cloud.rotation.y += b.spinRate * dt * spinK * 1.06;
    b.group.updateMatrixWorld(true);
    if (b.ring) { b.ringMat.uniforms.uPlanetPos.value.copy(b.pos); b.ringMat.uniforms.uPlanetR.value = b.group.scale.x; }
    b.orbitMat.uniforms.uAngle.value = ((b.theta / TWO_PI) % 1 + 1) % 1;
    const selected = S.sel === b;
    b.orbitMat.uniforms.uOpacity.value = S.orbitOp * (1 - e) * (selected ? 1.8 : 1);
    b.orbitLine.visible = (1 - e) > 0.01 && S.orbitOp > 0.01;
    b.moonGroup.visible = e < 0.05 && b.moonsVisible !== false;
    const near = cam.position.distanceTo(b.pos) / b.group.scale.x;
    const moonLineOp = clamp(1 - (near - 12) / 30, 0, 1) * 0.16;
    b.moonObjs.forEach((mo) => {
      mo.orb.rotation.y += mo.speed * dt * moonK;
      mo.line.material.opacity = moonLineOp; mo.line.visible = moonLineOp > 0.005;
      mo.mesh.getWorldPosition(mo.pos);
      mo.mesh.rotation.y += dt * 0.1;
    });
    // fade in freshly baked surfaces
    if (b.bakedAt) { const u = b.mat.uniforms.uBaked; u.value = Math.min(1, u.value + dt * 1.6); if (b.cloudMat && b.cloudMat.uniforms.uMap.value !== WHITE_TEX) b.cloudMat.uniforms.uBaked.value = u.value; }
    // scan tween
    const su = b.mat.uniforms.uScan; su.value += ((b.scanTo || 0) - su.value) * Math.min(1, dt * 4);
  });

  // sun + corona face the camera
  corona.quaternion.copy(cam.quaternion);
  const sunDist = cam.position.length();
  coronaMat.uniforms.uOpacity.value = clamp(0.35 + sunDist / 400, 0.4, 1) * (1 - e * 0.8);
  glowA.material.opacity = 0.55 * (1 - e * 0.8); glowB.material.opacity = 0.2 * (1 - e);
  wind.material.uniforms.uOpacity.value = 0.5 * (1 - e);
  asteroidBelt.material.uniforms.uOpacity.value = asteroidBelt.userData.baseOpacity * (1 - e);
  kuiperBelt.material.uniforms.uOpacity.value = kuiperBelt.userData.baseOpacity * (1 - e);
  asteroidBelt.visible = kuiperBelt.visible = wind.visible = e < 0.98;
  asteroidBelt.rotation.y += dt * 0.004 * orbitK;
  kuiperBelt.rotation.y += dt * 0.0012 * orbitK;
  nebula.position.copy(cam.position);

  // grid
  S.gridOp += (S.gridTo - S.gridOp) * Math.min(1, dt * 2.5);
  gridMat.uniforms.uOpacity.value = S.gridOp * (1 - e);
  grid.visible = gridMat.uniforms.uOpacity.value > 0.01;
  if (grid.visible) {
    BODIES.forEach((b, i) => { const g = GW[b.id]; gridMat.uniforms.uBodies.value[i].set(b.pos.x, b.pos.z, g[0], g[1]); });
  }
  S.orbitOp += (S.orbitTo - S.orbitOp) * Math.min(1, dt * 3);

  // hover ring
  const hv = S.hover && !S.hover.moon ? S.hover.b : null;
  const ringTarget = hv && S.mode !== 'explore' && S.mode !== 'landing' ? 0.55 : 0;
  hoverRing.material.opacity += (ringTarget - hoverRing.material.opacity) * Math.min(1, dt * 8);
  if (hv) {
    hoverRing.position.copy(hv.pos);
    const R = hv.group.scale.x * (hv.rings ? hv.rings.outer * 1.06 : hv.id === 'sun' ? 1.5 : 1.5);
    const minR = cam.position.distanceTo(hv.pos) * 0.022;
    hoverRing.scale.setScalar(Math.max(R, minR));
    hoverRing.material.color.set(hv.accent);
  }
  hoverRing.quaternion.copy(cam.quaternion);
  hoverRing.visible = hoverRing.material.opacity > 0.01;
}

function updateNear() {
  const d = cam.position.distanceTo(controls.target);
  let near = clamp(d * 0.012, 0.02, 3);
  if (S.focus && (S.mode === 'explore' || S.mode === 'focus')) near = clamp((d - tgtR(S.focus)) * 0.3, 0.01, near);
  if (Math.abs(near - lastNear) / lastNear > 0.04) { cam.near = near; lastNear = near; cam.updateProjectionMatrix(); }
}
function updateViewOffset(dt) {
  const k = Math.min(1, dt * 3.2);
  S.vo.x += (S.voTo.x - S.vo.x) * k; S.vo.y += (S.voTo.y - S.vo.y) * k;
  if (Math.abs(S.vo.x) < 0.5 && Math.abs(S.vo.y) < 0.5 && S.voTo.x === 0 && S.voTo.y === 0) { if (cam.view && cam.view.enabled) cam.clearViewOffset(); }
  else cam.setViewOffset(W, H, S.vo.x, S.vo.y, W, H);
}

function perfAdapt(dt) {
  perfAcc += dt; perfN++;
  if (perfN >= 120) {
    const avg = perfAcc / perfN; perfAcc = 0; perfN = 0;
    if (avg > 1 / 38 && document.visibilityState === 'visible') {
      if (PR > 1) {
        PR = Math.max(1, PR - 0.25);
        renderer.setPixelRatio(PR); if (composer) composer.setPixelRatio(PR); renderer.setSize(W, H, false); if (composer) composer.setSize(W, H);
        starMat.uniforms.uPR.value = PR; wind.material.uniforms.uPR.value = PR;
        asteroidBelt.material.uniforms.uPR.value = PR; kuiperBelt.material.uniforms.uPR.value = PR;
      } else if (bloomOn && avg > 1 / 26) { bloomOn = false; }
    }
  }
}

function bakeStep() {
  if (!bakeQueue.length) return;
  if (frameN < 3 || frameN % 2) return;
  const job = bakeQueue.shift();
  try { job.run(); } catch (e) { console.warn('Bake failed', e); }
  bakeDone++;
  if (typeof onBakeProgress === 'function') onBakeProgress(bakeDone, bakeTotal, bakeQueue.length ? bakeQueue[0].label : 'Ready');
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  T += dt; frameN++;
  U.time.value = T;
  if (S.mode === 'landing') S.landingT += dt;
  updateWorld(dt);
  stepCamera(dt);
  updateViewOffset(dt);
  updateNear();
  if (typeof updateOverlay === 'function') updateOverlay(dt);
  if (composer && bloomOn) composer.render(); else renderer.render(scene, cam);
  bakeStep();
  if (frameN > 60) perfAdapt(dt);
}
