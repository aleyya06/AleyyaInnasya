// The 3D campus behind the page. Everything is generated here, so there are no models or images to load.
import * as THREE from "three";

const canvas = document.getElementById("scene");
const siteTag = document.getElementById("siteTag");
const flight = document.getElementById("hero");
const root = document.documentElement;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
// Phones and small or older machines get no shadows, fewer props and a 1x pixel ratio.
const LOW = !finePointer.matches || Math.min(innerWidth, innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const col = (hex) => new THREE.Color(hex);

// Seeded random, so the city is laid out the same way on every visit.
let seed = 20261115;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

// City grid in scene units (about a metre each): 9 x 9 blocks around the central site.
const BLOCK = 44, ROAD = 14, PITCH = BLOCK + ROAD, HALF = 4;
const EXTENT = (HALF + 0.5) * PITCH;
const PARKS = new Set(["-2,-1", "2,2", "3,-3", "-1,3", "1,-2", "-4,-4", "4,1"]);

// A river along the bottom-left of the opening view (camera looks from +z, so that is -x, +z).
const river = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-340, 0, 30), new THREE.Vector3(-250, 0, 64), new THREE.Vector3(-178, 0, 140),
  new THREE.Vector3(-150, 0, 222), new THREE.Vector3(-96, 0, 292), new THREE.Vector3(-30, 0, 350),
]);
const RIVER_W = 26;
const riverPts = river.getSpacedPoints(160);
const riverDist = (x, z) => riverPts.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.z - z)), Infinity);

class RoseCurve extends THREE.Curve {
  // r = cos(kθ), k = n/d; closes after d·π when n·d is odd, 2d·π otherwise. A small z wave gives it depth.
  constructor(n, d, scale) {
    super();
    this.k = n / d;
    this.span = Math.PI * ((n * d) % 2 ? d : 2 * d);
    this.scale = scale;
  }
  getPoint(t, target = new THREE.Vector3()) {
    const th = t * this.span;
    const r = Math.cos(this.k * th) * this.scale;
    return target.set(r * Math.cos(th), r * Math.sin(th), Math.sin(th * 0.5) * 0.55);
  }
}

// Collects quads for one merged mesh, so the whole city's walls draw in a single call.
class Batch {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.col = []; this.idx = []; this.n = 0; }
  quad(a, b, c, d, normal, uw, vh, color) {
    for (const [p, u, v] of [[a, 0, 0], [b, uw, 0], [c, uw, vh], [d, 0, vh]]) {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(normal[0], normal[1], normal[2]);
      this.uv.push(u, v);
      this.col.push(color.r, color.g, color.b);
    }
    const n = this.n;
    this.idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    this.n += 4;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

// Window module is 3 m wide and 3.2 m tall; the texture holds 8 x 8 of them.
function addBuilding(walls, roofs, x, z, w, d, h, color) {
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
  const U = (len) => len / 24, V = h / 25.6;
  walls.quad([x0, 0, z1], [x1, 0, z1], [x1, h, z1], [x0, h, z1], [0, 0, 1], U(w), V, color);
  walls.quad([x1, 0, z0], [x0, 0, z0], [x0, h, z0], [x1, h, z0], [0, 0, -1], U(w), V, color);
  walls.quad([x1, 0, z1], [x1, 0, z0], [x1, h, z0], [x1, h, z1], [1, 0, 0], U(d), V, color);
  walls.quad([x0, 0, z0], [x0, 0, z1], [x0, h, z1], [x0, h, z0], [-1, 0, 0], U(d), V, color);
  roofs.quad([x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0], [0, 1, 0], 1, 1, color);
}

function windowTextures() {
  const make = () => { const c = document.createElement("canvas"); c.width = c.height = 256; return c; };
  const base = make(), lit = make();
  const b = base.getContext("2d"), l = lit.getContext("2d");
  b.fillStyle = "#ffffff"; b.fillRect(0, 0, 256, 256);
  l.fillStyle = "#000000"; l.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      b.fillStyle = "#6c7480"; b.fillRect(i * 32 + 6, j * 32 + 7, 20, 17);
      b.fillStyle = "#d9d3cf"; b.fillRect(i * 32 + 6, j * 32 + 24, 20, 2);
      if (rand() < 0.36) { l.fillStyle = rand() < 0.5 ? "#ffd29a" : "#ffe3bd"; l.fillRect(i * 32 + 6, j * 32 + 7, 20, 17); }
    }
  }
  return [base, lit].map((c) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

// Roads, lane markings, crosswalks, lots, parks, plaza paving and the river, painted onto one ground texture.
function groundTexture(size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const W = EXTENT * 2 + 120;
  const s = size / W;
  const P = (v) => (v + W / 2) * s;

  g.fillStyle = "#c9c1ab"; g.fillRect(0, 0, size, size);
  g.fillStyle = "#57505a"; g.fillRect(P(-EXTENT), P(-EXTENT), EXTENT * 2 * s, EXTENT * 2 * s);

  g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath();
  riverPts.forEach((p, i) => (i ? g.lineTo(P(p.x), P(p.z)) : g.moveTo(P(p.x), P(p.z))));
  g.strokeStyle = "#a7b98f"; g.lineWidth = (RIVER_W + 14) * s; g.stroke();
  g.strokeStyle = "#6e97a6"; g.lineWidth = RIVER_W * s; g.stroke();

  for (let i = -HALF; i <= HALF; i++) {
    for (let j = -HALF; j <= HALF; j++) {
      const cx = i * PITCH, cz = j * PITCH;
      const nearRiver = riverDist(cx, cz) < RIVER_W / 2 + BLOCK * 0.62;
      g.fillStyle = "#d8d0c7";
      g.fillRect(P(cx - BLOCK / 2 - 2), P(cz - BLOCK / 2 - 2), (BLOCK + 4) * s, (BLOCK + 4) * s);
      if (i === 0 && j === 0) {
        g.fillStyle = "#efe5da"; g.fillRect(P(cx - BLOCK / 2), P(cz - BLOCK / 2), BLOCK * s, BLOCK * s);
        g.strokeStyle = "rgba(177,102,146,0.35)"; g.lineWidth = Math.max(1, 0.35 * s);
        for (let r = 4; r < 22; r += 3) { g.beginPath(); g.arc(P(0), P(9), r * s, 0, Math.PI * 2); g.stroke(); }
      } else if (PARKS.has(`${i},${j}`) || nearRiver) {
        g.fillStyle = "#9db386"; g.fillRect(P(cx - BLOCK / 2), P(cz - BLOCK / 2), BLOCK * s, BLOCK * s);
        g.strokeStyle = "#e6dccd"; g.lineWidth = 2.2 * s;
        g.beginPath(); g.moveTo(P(cx - BLOCK / 2), P(cz)); g.quadraticCurveTo(P(cx), P(cz - 12), P(cx + BLOCK / 2), P(cz + 6)); g.stroke();
      } else {
        g.fillStyle = "#cbc1b8"; g.fillRect(P(cx - BLOCK / 2), P(cz - BLOCK / 2), BLOCK * s, BLOCK * s);
      }
    }
  }

  // Dashed centre lines along every road
  g.strokeStyle = "#efe4d4"; g.lineWidth = Math.max(1, 0.4 * s); g.setLineDash([3 * s, 3 * s]); g.lineCap = "butt";
  for (let k = -HALF - 1; k <= HALF; k++) {
    const c0 = (k + 0.5) * PITCH;
    g.beginPath(); g.moveTo(P(-EXTENT), P(c0)); g.lineTo(P(EXTENT), P(c0)); g.stroke();
    g.beginPath(); g.moveTo(P(c0), P(-EXTENT)); g.lineTo(P(c0), P(EXTENT)); g.stroke();
  }
  g.setLineDash([]);

  // Zebra crossings on each approach to an intersection
  g.fillStyle = "#f4ece2";
  for (let a = -HALF - 1; a <= HALF; a++) {
    for (let b2 = -HALF - 1; b2 <= HALF; b2++) {
      const ix = (a + 0.5) * PITCH, iz = (b2 + 0.5) * PITCH;
      for (let q = -5; q <= 5; q += 2) {
        g.fillRect(P(ix + q), P(iz + ROAD / 2 + 0.6), 1 * s, 3 * s);
        g.fillRect(P(ix + q), P(iz - ROAD / 2 - 3.6), 1 * s, 3 * s);
        g.fillRect(P(ix + ROAD / 2 + 0.6), P(iz + q), 3 * s, 1 * s);
        g.fillRect(P(ix - ROAD / 2 - 3.6), P(iz + q), 3 * s, 1 * s);
      }
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { texture: t, worldSize: W };
}

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: "high-performance" });
  renderer.setPixelRatio(LOW ? 1 : Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = !LOW;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2(0xdbe8ef, 0.0011);
  scene.fog = fog;
  scene.background = new THREE.Color(0xdbe8ef);

  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.5, 2600);

  // Ground
  const { texture: groundTex, worldSize } = groundTexture(LOW ? 2048 : 4096);
  groundTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(worldSize, worldSize),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const outskirts = new THREE.Mesh(new THREE.PlaneGeometry(5200, 5200), new THREE.MeshStandardMaterial({ color: 0xc6bea6, roughness: 1 }));
  outskirts.rotation.x = -Math.PI / 2;
  outskirts.position.y = -0.08;
  scene.add(outskirts);

  // River surface: a ribbon that catches the low sun
  {
    const pos = [], idx = [];
    riverPts.forEach((p, i) => {
      const tan = river.getTangentAt(i / (riverPts.length - 1));
      const nx = -tan.z, nz = tan.x;
      pos.push(p.x + nx * RIVER_W / 2, 0.12, p.z + nz * RIVER_W / 2, p.x - nx * RIVER_W / 2, 0.12, p.z - nz * RIVER_W / 2);
      if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const water = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x6f99a9, roughness: 0.12, metalness: 0.35, side: THREE.DoubleSide }));
    water.receiveShadow = true;
    scene.add(water);
  }

  // Buildings
  const [winTex, litTex] = windowTextures();
  const walls = new Batch(), roofs = new Batch();
  const tints = ["#f1e8e1", "#e3d6cd", "#d09c86", "#bf9396", "#a08592", "#e8d0d0", "#d8cbbd"].map(col);
  const parkSpots = [];
  for (let i = -HALF; i <= HALF; i++) {
    for (let j = -HALF; j <= HALF; j++) {
      if (i === 0 && j === 0) continue;
      const cx = i * PITCH, cz = j * PITCH;
      if (PARKS.has(`${i},${j}`) || riverDist(cx, cz) < RIVER_W / 2 + BLOCK * 0.62) { parkSpots.push([cx, cz]); continue; }
      const ring = Math.max(Math.abs(i), Math.abs(j));
      const tall = [0, 1, 0.8, 0.55, 0.38][ring];
      const lots = rand() < 0.22
        ? [[cx, cz, BLOCK - 8]]
        : [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [cx + a * (BLOCK / 4), cz + b * (BLOCK / 4), BLOCK / 2 - 5]);
      lots.forEach(([lx, lz, size]) => {
        const w = size * (0.72 + rand() * 0.28), d = size * (0.72 + rand() * 0.28);
        const h = 7 + (8 + rand() * rand() * 78) * tall;
        addBuilding(walls, roofs, lx, lz, w, d, h, tints[Math.floor(rand() * tints.length)]);
      });
    }
  }
  const wallMat = new THREE.MeshStandardMaterial({
    map: winTex, emissiveMap: litTex, emissive: 0xffffff, emissiveIntensity: 0,
    vertexColors: true, roughness: 0.82, metalness: 0.04,
  });
  const roofMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, color: 0xb9aea8 });
  const wallMesh = new THREE.Mesh(walls.geometry(), wallMat);
  const roofMesh = new THREE.Mesh(roofs.geometry(), roofMat);
  [wallMesh, roofMesh].forEach((m) => { m.castShadow = true; m.receiveShadow = true; scene.add(m); });

  // Trees: parks, the riverbank and the plaza corners
  const treeSpots = [];
  parkSpots.forEach(([cx, cz]) => {
    for (let x = -BLOCK / 2 + 5; x <= BLOCK / 2 - 5; x += LOW ? 11 : 7.5) {
      for (let z = -BLOCK / 2 + 5; z <= BLOCK / 2 - 5; z += LOW ? 11 : 7.5) {
        if (rand() < 0.72) treeSpots.push([cx + x + (rand() - 0.5) * 4, cz + z + (rand() - 0.5) * 4]);
      }
    }
  });
  [[-17, -17], [17, -17], [-17, 19], [17, 19]].forEach((p) => treeSpots.push(p));
  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.46, 3, 6).translate(0, 1.5, 0);
  const crownGeo = new THREE.IcosahedronGeometry(2.6, 0).translate(0, 4.7, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x6e5548, roughness: 1 }), treeSpots.length);
  const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), treeSpots.length);
  const greens = ["#7f9a6a", "#93a877", "#6f8b63", "#a4b585", "#88a070"].map(col);
  const dummy = new THREE.Object3D();
  treeSpots.forEach(([x, z], k) => {
    const sc = 0.8 + rand() * 0.6;
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, rand() * Math.PI, 0);
    dummy.scale.set(sc, sc * (0.9 + rand() * 0.3), sc);
    dummy.updateMatrix();
    trunks.setMatrixAt(k, dummy.matrix);
    crowns.setMatrixAt(k, dummy.matrix);
    crowns.setColorAt(k, greens[k % greens.length]);
  });
  [trunks, crowns].forEach((m) => { m.castShadow = !LOW; m.receiveShadow = true; scene.add(m); });

  // Cars. Indonesia drives on the left, so each car keeps to the left of its direction of travel.
  const carCount = LOW ? 34 : 70;
  const carGeo = new THREE.BoxGeometry(2, 1.25, 4.3).translate(0, 0.85, 0);
  const cars = new THREE.InstancedMesh(carGeo, new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.2 }), carCount);
  const carColors = ["#fbf6f3", "#230a18", "#b16692", "#d8d2cc", "#8a8790", "#c0714f"].map(col);
  const carState = Array.from({ length: carCount }, (_, k) => {
    const alongX = rand() < 0.5;
    const line = (Math.floor(rand() * (HALF * 2 + 2)) - HALF - 1 + 0.5) * PITCH;
    const dir = rand() < 0.5 ? 1 : -1;
    cars.setColorAt(k, carColors[k % carColors.length]);
    return { alongX, dir, speed: 7 + rand() * 7, t: (rand() * 2 - 1) * EXTENT, lane: line + (alongX ? -dir * 3.2 : dir * 3.2) };
  });
  cars.castShadow = !LOW;
  scene.add(cars);
  const placeCars = (dt) => {
    carState.forEach((c, k) => {
      c.t += c.speed * c.dir * dt;
      if (c.t > EXTENT) c.t = -EXTENT; else if (c.t < -EXTENT) c.t = EXTENT;
      if (c.alongX) { dummy.position.set(c.t, 0, c.lane); dummy.rotation.set(0, c.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0); }
      else { dummy.position.set(c.lane, 0, c.t); dummy.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0); }
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      cars.setMatrixAt(k, dummy.matrix);
    });
    cars.instanceMatrix.needsUpdate = true;
  };
  placeCars(0);

  // The site: glass-and-terracotta studio with the rose-curve sculpture in front of it
  const site = new THREE.Group();
  scene.add(site);
  const terracotta = new THREE.MeshStandardMaterial({ color: 0xbf6f4f, roughness: 0.82 });
  const stone = new THREE.MeshStandardMaterial({ color: 0xefe6de, roughness: 0.9 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9fb3bf, roughness: 0.06, metalness: 0.25, transparent: true, opacity: 0.55,
    emissive: col("#f6c29f"), emissiveIntensity: 0,
  });
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = !LOW; m.receiveShadow = true; site.add(m); return m;
  };
  box(26, 0.6, 16, stone, 0, 0.3, -9);
  box(22, 9, 12, glass, 0, 5.1, -9);
  box(21.4, 0.4, 11.4, stone, 0, 5, -9);
  box(25.5, 0.9, 15.5, terracotta, 0, 10.05, -9);
  for (let k = 0; k < 12; k++) box(0.55, 9, 1.1, terracotta, -10.45 + k * 1.9, 5.1, -2.6);

  const roseMat = new THREE.MeshStandardMaterial({
    color: 0xb16692, emissive: 0xb16692, emissiveIntensity: 0.7, roughness: 0.32, metalness: 0.45,
  });
  const sculpture = new THREE.Group();
  sculpture.position.set(0, 7.4, 9);
  const roseMesh = new THREE.Mesh(new THREE.TubeGeometry(new RoseCurve(5, 4, 4.8), LOW ? 520 : 960, 0.17, 8, true), roseMat);
  roseMesh.castShadow = !LOW;
  sculpture.add(roseMesh);
  site.add(sculpture);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.1, 1.3, 40), stone);
  pedestal.position.set(0, 0.65, 9);
  pedestal.receiveShadow = true;
  site.add(pedestal);
  const glow = new THREE.PointLight(0xd77fae, 30, 70, 1.6);
  glow.position.set(0, 7.4, 11);
  site.add(glow);
  const ring = new THREE.Mesh(new THREE.RingGeometry(16.4, 17.1, 128), new THREE.MeshBasicMaterial({ color: 0xb16692, transparent: true, opacity: 0.85 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.1;
  site.add(ring);

  // Light
  const hemi = new THREE.HemisphereLight(0xeaf1f4, 0xbfb6aa, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff5e8, 2.6);
  sun.castShadow = !LOW;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.5;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 1200;
  scene.add(sun, sun.target);

  const SKY = [col("#d7e6ee"), col("#f6c29f")];
  const SUN = [col("#fff4e6"), col("#e89b6b")];
  const HEMI_SKY = [col("#eaf1f4"), col("#f6c29f")];
  const HEMI_GROUND = [col("#bfb6aa"), col("#6a4352")];
  const SUN_DIR = [new THREE.Vector3(0.35, 1, 0.45).normalize(), new THREE.Vector3(-0.72, 0.26, 0.64).normalize()];
  const tmpC = new THREE.Color(), tmpV = new THREE.Vector3();

  const setDaylight = (g) => {
    tmpC.lerpColors(SKY[0], SKY[1], g);
    scene.background.copy(tmpC);
    fog.color.copy(tmpC);
    fog.density = THREE.MathUtils.lerp(0.0006, 0.0034, g);
    sun.color.lerpColors(SUN[0], SUN[1], g);
    sun.intensity = THREE.MathUtils.lerp(2.6, 2.15, g);
    tmpV.lerpVectors(SUN_DIR[0], SUN_DIR[1], g).normalize();
    sun.position.copy(tmpV).multiplyScalar(420);
    const half = THREE.MathUtils.lerp(300, 85, g);
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half });
    sun.shadow.camera.updateProjectionMatrix();
    hemi.color.lerpColors(HEMI_SKY[0], HEMI_SKY[1], g);
    hemi.groundColor.lerpColors(HEMI_GROUND[0], HEMI_GROUND[1], g);
    hemi.intensity = THREE.MathUtils.lerp(1.1, 0.72, g);
    wallMat.emissiveIntensity = smoothstep(0.45, 1, g) * 0.75;
    glass.emissiveIntensity = smoothstep(0.35, 1, g) * 0.55;
    roseMat.emissiveIntensity = THREE.MathUtils.lerp(0.7, 1.9, g);
    glow.intensity = THREE.MathUtils.lerp(30, 140, g);
    renderer.toneMappingExposure = THREE.MathUtils.lerp(1, 1.06, g);
  };

  // Camera: a curved descent onto the site, then an orbit around it
  const descentPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-10, 540, 260), new THREE.Vector3(-110, 340, 300), new THREE.Vector3(-185, 160, 215),
    new THREE.Vector3(-125, 52, 100), new THREE.Vector3(-36, 15, 46), new THREE.Vector3(0, 7, 33),
  ], false, "centripetal");
  // The opening view aims away from the hero sheet: left of the site on wide screens (sheet at
  // bottom-left), in front of it on portrait phones (sheet across the bottom half).
  const LOOK_FROM = new THREE.Vector3(), LOOK_AT = new THREE.Vector3(0, 6.6, 0);
  const aimOpening = () => {
    const wide = clamp((camera.aspect - 0.75) / 0.85);
    LOOK_FROM.set(-95 * wide, 0, THREE.MathUtils.lerp(80, 10, wide));
  };
  aimOpening();
  const SITE_TAG_AT = new THREE.Vector3(0, 16, 9);
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), orbitPos = new THREE.Vector3();
  const right = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

  const placeCamera = (descent, orbit, px, py) => {
    const e = ease(descent);
    camPos.copy(descentPath.getPointAt(e));
    camLook.lerpVectors(LOOK_FROM, LOOK_AT, ease(clamp((descent - 0.15) / 0.85)));
    // The orbit only takes over once the descent has landed, so a jump from the top
    // (a nav link, say) plays as a quick fly-down instead of a cut to the ground.
    const landed = clamp((descent - 0.97) / 0.03);
    if (orbit > 0 && landed > 0) {
      const a = orbit * Math.PI * 1.25;
      const r = 33 - orbit * 3;
      orbitPos.set(Math.sin(a) * r, 7 + orbit * 7, Math.cos(a) * r);
      camPos.lerp(orbitPos, landed);
    }
    right.subVectors(camLook, camPos).normalize().cross(UP).normalize();
    const reach = THREE.MathUtils.lerp(9, 2.2, e);
    camPos.addScaledVector(right, px * reach).addScaledVector(UP, -py * reach * 0.55);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  };

  // Scroll mapping: the descent spans the tall #hero section, the orbit spans the rest of the page.
  let land = 1, maxScroll = 1;
  const measure = () => {
    land = Math.max(1, flight.offsetTop + flight.offsetHeight - innerHeight);
    maxScroll = Math.max(land + 1, root.scrollHeight - innerHeight);
  };
  const targetProgress = () => ({
    descent: clamp(scrollY / land),
    orbit: clamp((scrollY - land) / (maxScroll - land)),
  });

  const tagScreen = new THREE.Vector3();
  const placeSiteTag = (descent) => {
    if (!siteTag) return;
    tagScreen.copy(SITE_TAG_AT).project(camera);
    const visible = 1 - smoothstep(0.62, 0.9, descent);
    if (tagScreen.z > 1 || visible <= 0) { siteTag.style.opacity = "0"; return; }
    siteTag.style.opacity = visible.toFixed(3);
    siteTag.style.transform = `translate(${((tagScreen.x + 1) / 2) * innerWidth}px, ${((1 - tagScreen.y) / 2) * innerHeight}px)`;
  };

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    aimOpening();
    measure();
  };
  window.addEventListener("resize", resize);
  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(document.body);
  measure();

  // Visitors who ask for less motion get one still frame of the site at golden hour, with no camera travel.
  if (reducedMotion.matches) {
    const still = () => { setDaylight(1); placeCamera(0.82, 0, 0, 0); placeSiteTag(1); renderer.render(scene, camera); };
    window.addEventListener("resize", still);
    still();
    root.classList.add("has-scene");
    return;
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (finePointer.matches) {
    window.addEventListener("pointermove", (e) => {
      pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  const smooth = targetProgress();
  let last = performance.now();
  let first = true;
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const target = targetProgress();
    const k = 1 - Math.exp(-dt * 4.5);
    smooth.descent += (target.descent - smooth.descent) * k;
    smooth.orbit += (target.orbit - smooth.orbit) * k;
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;

    setDaylight(smoothstep(0.05, 1, smooth.descent));
    placeCamera(smooth.descent, smooth.orbit, pointer.x, pointer.y);
    sculpture.rotation.y += dt * 0.28;
    placeCars(dt);
    placeSiteTag(smooth.descent);
    renderer.render(scene, camera);

    if (first) { root.classList.add("has-scene"); first = false; }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  canvas.addEventListener("webglcontextlost", () => root.classList.add("no-webgl"));
}

try {
  init();
} catch (err) {
  // No WebGL (old device, disabled GPU): the page keeps its painted sky background instead.
  root.classList.add("no-webgl");
  console.warn("3D scene unavailable:", err);
}
