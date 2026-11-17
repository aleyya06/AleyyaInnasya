import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MeshBuilder, type V3 } from "./meshBuilder";
import {
  BRIDGES, BRIDGE_SPAN, COMPOUNDS, FLOOR_H, HALL, MOAT, MOAT_WATER, PAVILION, SKY_BRIDGES, TERRACE,
  rand, type Compound, type Tower, type Volume,
} from "./beijingLayout";

const C = (hex: string) => new THREE.Color(hex);
const TERRACOTTA = C("#B85D43");
const SLATE = C("#2C2A29");
const MARBLE = C("#ece6dc");
const BRICK = C("#aba297");
const WALL_RED = C("#a2493a");
const PLASTER = C("#ddd0bc");
const BEAM = C("#6c2b22");
const WHITE = C("#ffffff");
const FRAME = C("#d8d4ce");
const PODIUM = C("#cfc7bb");
const TAU = Math.PI * 2;
const lerp = THREE.MathUtils.lerp;
const up = (): V3 => [0, 1, 0];
const down = (): V3 => [0, -1, 0];

/** Floor-plate radius as a share of the base: a rounded mound that keeps 40% at the top */
const profile = (t: number) => Math.sqrt(1 - Math.pow(t * 0.93, 2.4));

/** Ellipse of a volume at a (fractional) floor level, grown outward by `grow` metres */
function ring(v: Volume, level: number, grow: number) {
  const t = level / v.floors;
  const f = profile(t);
  const cx = v.x + v.lean[0] * t * t, cz = v.z + v.lean[1] * t * t;
  return {
    cx, cz,
    at: (a: number): [number, number] => [cx + (v.rx * f + grow) * Math.cos(a), cz + (v.rz * f + grow) * Math.sin(a)],
  };
}

export function buildPavilion() {
  const white = new MeshBuilder();
  const glass = new MeshBuilder();
  const SEG = 72, OVER = 1.2, INSET = 0.5, SLAB = 0.9;

  PAVILION.forEach((v) => {
    const radial = (p: V3): V3 => [p[0] - v.x, 0, p[2] - v.z];
    const perimeter = Math.PI * (v.rx + v.rz);
    for (let i = 0; i <= v.floors; i++) {
      const y0 = i * FLOOR_H;
      const outer = ring(v, i, OVER), inner = ring(v, i, -INSET);
      // Floor plate: outer edge, top and underside
      white.surface(SEG, 1, (u, w) => { const [x, z] = outer.at(u * TAU); return [x, y0 + w * SLAB, z]; }, WHITE, radial);
      const annulus = (y: number) => (u: number, w: number): V3 => {
        const [x0, z0] = inner.at(u * TAU), [x1, z1] = outer.at(u * TAU);
        return [lerp(x0, x1, w), y, lerp(z0, z1, w)];
      };
      if (i < v.floors) white.surface(SEG, 1, annulus(y0 + SLAB), WHITE, up);
      if (i > 0) white.surface(SEG, 1, annulus(y0), WHITE, down);
      if (i === v.floors) {
        // Roof: a shallow dome over the last plate
        white.surface(SEG, 6, (u, w) => {
          const [x, z] = outer.at(u * TAU);
          return [lerp(x, outer.cx, w), y0 + SLAB + 2.4 * (1 - (1 - w) ** 2), lerp(z, outer.cz, w)];
        }, WHITE, up);
        break;
      }
      // Continuous ribbon glazing up to the next plate, following the curve inward
      const next = ring(v, i + 1, -INSET);
      glass.surface(SEG, 1, (u, w) => {
        const [x0, z0] = inner.at(u * TAU), [x1, z1] = next.at(u * TAU);
        return [lerp(x0, x1, w), y0 + SLAB + w * (FLOOR_H - SLAB), lerp(z0, z1, w)];
      }, WHITE, radial, [perimeter / 102.4, 1]);
    }
  });

  // Sky-bridges: glazed tubes bowing south toward the plaza
  SKY_BRIDGES.forEach(([from, to, floor]) => {
    const A = PAVILION[from], B = PAVILION[to];
    const end = (v: Volume, other: Volume) => {
      const dx = other.x - v.x, dz = other.z - v.z;
      return ring(v, floor, -INSET - 1).at(Math.atan2(dz / v.rz, dx / v.rx));
    };
    const p0 = end(A, B), p2 = end(B, A);
    const p1: [number, number] = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2 + 11];
    const curve = (u: number): [number, number] => [
      (1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0],
      (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1],
    ];
    const side = (u: number): [number, number] => {
      const a = curve(Math.max(0, u - 0.01)), b = curve(Math.min(1, u + 0.01));
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
    };
    const W = 4.4, y = floor * FLOOR_H + 0.9, H = FLOOR_H - 0.9;
    const at = (u: number, across: number, h: number): V3 => {
      const [cx, cz] = curve(u), [sx, sz] = side(u);
      return [cx + sx * across, y + h, cz + sz * across];
    };
    white.surface(20, 1, (u, w) => at(u, (w - 0.5) * W, H), WHITE, up);
    white.surface(20, 1, (u, w) => at(u, (w - 0.5) * W, 0), WHITE, down);
    [-1, 1].forEach((s) => {
      const [sx, sz] = side(0.5);
      const outward = (): V3 => [sx * s, 0, sz * s];
      const band = (h0: number, h1: number, b: MeshBuilder) =>
        b.surface(20, 1, (u, w) => at(u, (s * W) / 2, lerp(h0, h1, w)), WHITE, outward, [3, 1]);
      band(0, 0.7, white);
      band(0.7, H - 0.6, glass);
      band(H - 0.6, H, white);
    });
  });

  return { white: white.geometry(), glass: glass.geometry() };
}

interface Column { x: number; z: number; y: number; h: number; r: number }

/**
 * Hip roof with a concave slope and corners that turn up at the eaves. `vCut` below 1 stops
 * the slope part-way, for the lower tier of a double-eave roof.
 */
function hipRoof(b: MeshBuilder, cx: number, cz: number, HW: number, HD: number, y0: number, rise: number, lift: number, color: THREE.Color, vCut = 1) {
  const alongX = HW >= HD;
  const r = alongX ? HW - HD : HD - HW;
  const ridge = (sx: number, sz: number): [number, number] => (alongX ? [sx * r, 0] : [0, sz * r]);
  const corners: [number, number][] = [[-HW, HD], [HW, HD], [HW, -HD], [-HW, -HD]];
  const ridgeEnds = corners.map(([x, z]) => ridge(Math.sign(x), Math.sign(z)));
  for (let k = 0; k < 4; k++) {
    const e0 = corners[k], e1 = corners[(k + 1) % 4], r0 = ridgeEnds[k], r1 = ridgeEnds[(k + 1) % 4];
    const eave = Math.hypot(e1[0] - e0[0], e1[1] - e0[1]);
    b.surface(16, 8, (u, v) => {
      const vv = v * vCut;
      const ex = lerp(e0[0], e1[0], u), ez = lerp(e0[1], e1[1], u);
      const rx = lerp(r0[0], r1[0], u), rz = lerp(r0[1], r1[1], u);
      const corner = Math.abs(2 * u - 1) ** 5;
      return [cx + lerp(ex, rx, vv), y0 + rise * vv ** 1.7 + lift * (1 - vv) ** 2 * corner, cz + lerp(ez, rz, vv)];
    }, color, up, [eave * 0.6, 4 * vCut]);
  }
  if (vCut === 1 && r > 0.5) {
    const [ax, az] = ridge(-1, -1), [bx, bz] = ridge(1, 1);
    b.bar(cx + ax, cz + az, cx + bx, cz + bz, 0.8, y0 + rise - 0.25, 0.75, SLATE);
    [[ax, az], [bx, bz]].forEach(([x, z]) => b.box(cx + x, cz + z, 0.9, 0.9, y0 + rise, 1.4, SLATE));
  }
  return { cutHW: HW - vCut * Math.min(HW, HD), cutHD: Math.min(HW, HD) * (1 - vCut), top: y0 + rise * vCut ** 1.7 };
}

interface HallOptions {
  x: number;
  z: number;
  w: number;
  d: number;
  base?: number;
  podium: number;
  wallH: number;
  roof: THREE.Color;
  wall: THREE.Color;
  /** Which sides carry a colonnade */
  colonnade: ("S" | "N" | "E" | "W")[];
  double?: boolean;
}

function hall(roofs: MeshBuilder, stone: MeshBuilder, columns: Column[], o: HallOptions) {
  const base = o.base ?? 0;
  const floor = base + o.podium;
  stone.box(o.x, o.z, o.w + 2.6, o.d + 2.6, base, o.podium, MARBLE);
  stone.walls(o.x, o.z, o.w - 1.6, o.d - 1.6, floor, o.wallH, o.wall);
  stone.walls(o.x, o.z, o.w + 0.2, o.d + 0.2, floor + o.wallH - 0.8, 0.8, BEAM);

  const r = 0.28 + o.wallH * 0.02;
  const colH = o.wallH - 0.8;
  const line = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(2, Math.round(len / 3.4));
    for (let i = 0; i <= n; i++) columns.push({ x: lerp(x0, x1, i / n), z: lerp(z0, z1, i / n), y: floor, h: colH, r });
  };
  const hw = o.w / 2 - 0.3, hd = o.d / 2 - 0.3;
  if (o.colonnade.includes("S")) line(o.x - hw, o.z + hd, o.x + hw, o.z + hd);
  if (o.colonnade.includes("N")) line(o.x - hw, o.z - hd, o.x + hw, o.z - hd);
  if (o.colonnade.includes("E")) line(o.x + hw, o.z - hd, o.x + hw, o.z + hd);
  if (o.colonnade.includes("W")) line(o.x - hw, o.z - hd, o.x - hw, o.z + hd);

  const over = 1.6 + Math.min(o.w, o.d) * 0.06;
  const eaveY = floor + o.wallH;
  const HW = o.w / 2 + over, HD = o.d / 2 + over;
  const rise = Math.min(HW, HD) * 0.72;
  const lift = 0.5 + Math.min(o.w, o.d) * 0.035;
  if (!o.double) {
    hipRoof(roofs, o.x, o.z, HW, HD, eaveY, rise, lift, o.roof);
    return;
  }
  // Double eaves: a short lower skirt, an upper storey standing on it, then the main roof
  const lower = hipRoof(roofs, o.x, o.z, HW, HD, eaveY, rise * 0.9, lift, o.roof, 0.42);
  const storey = 2.8;
  stone.walls(o.x, o.z, lower.cutHW * 2 - 0.6, lower.cutHD * 2 - 0.6, lower.top - 0.4, storey + 0.4, o.wall);
  stone.walls(o.x, o.z, lower.cutHW * 2 - 0.4, lower.cutHD * 2 - 0.4, lower.top + storey - 0.6, 0.6, BEAM);
  const upHW = lower.cutHW + 1.4, upHD = lower.cutHD + 1.4;
  hipRoof(roofs, o.x, o.z, upHW, upHD, lower.top + storey, Math.min(upHW, upHD) * 0.78, lift * 0.8, o.roof);
}

function compound(roofs: MeshBuilder, stone: MeshBuilder, columns: Column[], rocks: V3[], c: Compound) {
  const { x, z, w, d } = c;
  const T = 1, H = 3.2, gate = 7;
  const n = z - d / 2, s = z + d / 2, wx = x - w / 2, ex = x + w / 2;
  const wall = (x1: number, z1: number, x2: number, z2: number) => {
    stone.bar(x1, z1, x2, z2, T, 0, H, BRICK);
    stone.bar(x1, z1, x2, z2, T + 0.7, H, 0.35, SLATE);
  };
  wall(wx, n, ex, n);
  wall(wx, n, wx, s);
  wall(ex, n, ex, s);
  wall(wx, s, x - gate / 2, s);
  wall(x + gate / 2, s, ex, s);

  hall(roofs, stone, columns, { x, z: s, w: 10, d: 6.5, podium: 0.6, wallH: 3.4, roof: SLATE, wall: WALL_RED, colonnade: ["S"] });
  const mainD = 12;
  hall(roofs, stone, columns, {
    x, z: n + 3 + mainD / 2, w: w * 0.58, d: mainD, podium: 1.3, wallH: 4.6,
    roof: TERRACOTTA, wall: WALL_RED, colonnade: ["S"], double: w >= 80,
  });
  const sideW = 8, sideD = d * 0.4;
  const sideX = w / 2 - T - sideW / 2 - 2.5;
  hall(roofs, stone, columns, { x: x - sideX, z: z + d * 0.06, w: sideW, d: sideD, podium: 0.8, wallH: 3.6, roof: SLATE, wall: PLASTER, colonnade: ["E"] });
  hall(roofs, stone, columns, { x: x + sideX, z: z + d * 0.06, w: sideW, d: sideD, podium: 0.8, wallH: 3.6, roof: SLATE, wall: PLASTER, colonnade: ["W"] });

  // Stone garden in the courtyard
  for (let k = 0; k < 5; k++) {
    rocks.push([x + (rand() - 0.5) * w * 0.22, 0.6 + rand() * 0.9, z + d * 0.18 + (rand() - 0.5) * 6]);
  }
}

function imperialHall(roofs: MeshBuilder, stone: MeshBuilder, columns: Column[]) {
  const { x, z } = HALL;
  const step = 1.7;
  let y = 0;
  [[TERRACE.w, TERRACE.d], [TERRACE.w - 8, TERRACE.d - 7], [TERRACE.w - 16, TERRACE.d - 14]].forEach(([w, d]) => {
    stone.box(x, z, w, d, y, step, MARBLE);
    y += step;
    // Balustrade round the edge of each step
    const hw = w / 2 - 0.3, hd = d / 2 - 0.3;
    stone.bar(x - hw, z + hd, x - 6, z + hd, 0.3, y, 0.9, MARBLE);
    stone.bar(x + 6, z + hd, x + hw, z + hd, 0.3, y, 0.9, MARBLE);
    stone.bar(x - hw, z - hd, x + hw, z - hd, 0.3, y, 0.9, MARBLE);
    stone.bar(x - hw, z - hd, x - hw, z + hd, 0.3, y, 0.9, MARBLE);
    stone.bar(x + hw, z - hd, x + hw, z + hd, 0.3, y, 0.9, MARBLE);
  });
  // Central stair up the south face
  for (let k = 0; k < 3; k++) stone.box(x, z + TERRACE.d / 2 - k * 3.5 + 2, 10, 4, 0, step * (k + 0.6), MARBLE);
  hall(roofs, stone, columns, {
    x, z, w: HALL.w, d: HALL.d, base: y, podium: 0.5, wallH: 7,
    roof: TERRACOTTA, wall: WALL_RED, colonnade: ["S", "N", "E", "W"], double: true,
  });
}

/** Moat embankment walls and the arched marble bridges over its south side */
function moatWorks(stone: MeshBuilder) {
  const off = MOAT_WATER / 2 + 0.75;
  [-off, off].forEach((o) => {
    const X = MOAT.x + o, N = MOAT.zN - o, S = MOAT.zS + o;
    stone.bar(-X, N, X, N, 1.5, 0, 1.1, BRICK);
    stone.bar(-X, S, X, S, 1.5, 0, 1.1, BRICK);
    stone.bar(-X, N, -X, S, 1.5, 0, 1.1, BRICK);
    stone.bar(X, N, X, S, 1.5, 0, 1.1, BRICK);
  });
}

function bridges(): THREE.BufferGeometry {
  const L = BRIDGE_SPAN[1] - BRIDGE_SPAN[0];
  const deck = (s: number) => 0.2 + 2.4 * (1 - (2 * s / L) ** 2);
  const parts: THREE.BufferGeometry[] = [];
  BRIDGES.forEach(([bx, width]) => {
    const shape = new THREE.Shape();
    shape.moveTo(-L / 2, 0);
    for (let i = 1; i <= 20; i++) {
      const s = -L / 2 + (L * i) / 20;
      shape.lineTo(s, deck(s));
    }
    shape.lineTo(L / 2, 0);
    shape.lineTo(6, 0);
    for (let i = 1; i < 16; i++) {
      const a = (Math.PI * i) / 16;
      shape.lineTo(6 * Math.cos(a), 1.7 * Math.sin(a));
    }
    shape.lineTo(-6, 0);
    shape.closePath();
    const rail = new THREE.Shape();
    rail.moveTo(-L / 2, deck(-L / 2));
    for (let i = 1; i <= 20; i++) { const s = -L / 2 + (L * i) / 20; rail.lineTo(s, deck(s)); }
    for (let i = 20; i >= 0; i--) { const s = -L / 2 + (L * i) / 20; rail.lineTo(s, deck(s) + 0.9); }
    rail.closePath();

    const place = (g: THREE.BufferGeometry, x0: number) => {
      g.rotateY(Math.PI / 2);
      g.translate(x0, 0, (BRIDGE_SPAN[0] + BRIDGE_SPAN[1]) / 2);
      parts.push(g);
    };
    place(new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, curveSegments: 4 }), bx - width / 2);
    place(new THREE.ExtrudeGeometry(rail, { depth: 0.3, bevelEnabled: false }), bx - width / 2);
    place(new THREE.ExtrudeGeometry(rail, { depth: 0.3, bevelEnabled: false }), bx + width / 2 - 0.3);
  });
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

export function buildImperial() {
  const roofs = new MeshBuilder();
  const stone = new MeshBuilder();
  const columns: Column[] = [];
  const rocks: V3[] = [];
  COMPOUNDS.forEach((c) => compound(roofs, stone, columns, rocks, c));
  imperialHall(roofs, stone, columns);
  moatWorks(stone);
  return { roofs: roofs.geometry(), stone: stone.geometry(), bridges: bridges(), columns, rocks };
}

/** The moat's water: a rectangular ring */
export function moatWater(): THREE.BufferGeometry {
  const o = MOAT_WATER / 2;
  const rect = (x: number, zN: number, zS: number) => {
    // Shape space is (x, -z) because the shape is laid flat with rotateX(-90°)
    const p = new THREE.Path();
    p.moveTo(-x, -zS); p.lineTo(x, -zS); p.lineTo(x, -zN); p.lineTo(-x, -zN); p.closePath();
    return p;
  };
  const shape = new THREE.Shape(rect(MOAT.x + o, MOAT.zN - o, MOAT.zS + o).getPoints());
  shape.holes.push(rect(MOAT.x - o, MOAT.zN + o, MOAT.zS - o));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0.25, 0);
  return g;
}

/** Chamfered rectangle, scaled about the tower centre, ordered so wall quads face outward */
function footprint(t: Tower, scale: number, y: number): V3[] {
  const w = (t.w / 2) * scale, d = (t.d / 2) * scale, c = t.chamfer * scale;
  const pts: [number, number][] = [
    [-w + c, d], [w - c, d], [w, d - c], [w, -d + c], [w - c, -d], [-w + c, -d], [-w, -d + c], [-w, d - c],
  ];
  return pts.map(([x, z]) => [t.x + x, y, t.z + z]);
}

export function buildTowers(towers: Tower[], heightOf: (t: Tower) => number) {
  const glass = new MeshBuilder();
  const frame = new MeshBuilder();
  const MOD_U = 25.6, MOD_V = 28.8; // one texture tile: 8 modules of 3.2 m by 8 floors of 3.6 m

  towers.forEach((t) => {
    const h = heightOf(t);
    const s1 = t.setback ? lerp(1, t.taper, t.setback) : t.taper;
    const sections: [number, number, number, number][] = t.setback
      ? [[0, h * t.setback, 1, s1], [h * t.setback, h, s1 * 0.88, t.taper * 0.88]]
      : [[0, h, 1, t.taper]];

    sections.forEach(([y0, y1, a, b], si) => {
      const P0 = footprint(t, a, y0), P1 = footprint(t, b, y1);
      for (let k = 0; k < 8; k++) {
        const k1 = (k + 1) % 8;
        const len = Math.hypot(P0[k1][0] - P0[k][0], P0[k1][2] - P0[k][2]);
        glass.quad(P0[k], P0[k1], P1[k1], P1[k], WHITE, len / MOD_U, (y1 - y0) / MOD_V);
        // Vertical fins on the long faces of the lower shaft
        if (si === 0 && len > 10) {
          const ex = (P0[k1][0] - P0[k][0]) / len, ez = (P0[k1][2] - P0[k][2]) / len;
          const nx = -ez * 0.9, nz = ex * 0.9, tx = ex * 0.15, tz = ez * 0.15;
          for (let sAlong = 2; sAlong < len - 1; sAlong += 4.2) {
            const f = sAlong / len;
            const B: V3 = [lerp(P0[k][0], P0[k1][0], f), y0 + 7.2, lerp(P0[k][2], P0[k1][2], f)];
            const Tt: V3 = [lerp(P1[k][0], P1[k1][0], f), y1 - 2, lerp(P1[k][2], P1[k1][2], f)];
            const o = (p: V3, out: number, side: number): V3 => [p[0] + nx * out + tx * side, p[1], p[2] + nz * out + tz * side];
            frame.quad(o(B, 0, -1), o(B, 1, -1), o(Tt, 1, -1), o(Tt, 0, -1), FRAME);
            frame.quad(o(B, 1, 1), o(B, 0, 1), o(Tt, 0, 1), o(Tt, 1, 1), FRAME);
            frame.quad(o(B, 1, -1), o(B, 1, 1), o(Tt, 1, 1), o(Tt, 1, -1), FRAME);
          }
        }
      }
      if (si === 0 && t.setback) {
        // Flat ring where the shaft steps in
        const inner = footprint(t, sections[1][2], y1);
        for (let k = 0; k < 8; k++) frame.quad(P1[k], P1[(k + 1) % 8], inner[(k + 1) % 8], inner[k], FRAME);
      }
    });

    // Crown band, roof and a plant room on top
    const top = sections[sections.length - 1][3];
    const band0 = footprint(t, top * 1.01, h - 3), band1 = footprint(t, top * 1.01, h + 1.2);
    const roof = footprint(t, top * 1.01, h + 1.2);
    const centre: V3 = [t.x, h + 1.2, t.z];
    for (let k = 0; k < 8; k++) {
      const k1 = (k + 1) % 8;
      frame.quad(band0[k], band0[k1], band1[k1], band1[k], FRAME);
      frame.quad(roof[k], roof[k1], centre, centre, PODIUM);
    }
    frame.box(t.x, t.z, t.w * top * 0.38, t.d * top * 0.38, h + 1.2, 3.6, FRAME);
    frame.box(t.x, t.z, t.w + 10, t.d + 10, 0, 7.2, PODIUM);
  });

  return { glass: glass.geometry(), frame: frame.geometry() };
}
