// A stylized maquette inspired by the ITS Sukolilo campus: green lawns, a ring road with a
// boulevard and roundabout, lakes and a canal at the edges, a long multi-wing Rektorat landmark
// and low courtyard faculty clusters. It is an interpretation, not a surveyed plan.
// Units are roughly metres; the camera starts south (+z) looking north (-z).

export const WORLD = 780; // ground square, centred on the origin

export interface Building {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  facade: "punched" | "ribbon";
  roof: "flat" | "pitched" | "cap";
  tint: string;
}

export interface Walkway {
  from: [number, number];
  to: [number, number];
}

export interface Lake {
  x: number;
  z: number;
  rx: number;
  rz: number;
}

/** The plaza in front of the Mathematics courtyard, where the camera lands. */
export const PLAZA = { x: 0, z: 6, r: 24 };
export const SCULPTURE_AT: [number, number, number] = [0, 6.4, 6];

export const RING = { cx: 0, cz: -30, rx: 250, rz: 210, width: 12 };
export const ROUNDABOUT = { x: 0, z: 110, r: 17 };
/** Avenue in front of the plaza, running east-west */
export const FRONT_AVENUE_Z = 40;
export const ROAD_W = 12;

/** Straight roads as [x1, z1, x2, z2] centre lines */
export const AVENUES: [number, number, number, number][] = [
  [0, 400, 0, ROUNDABOUT.z + ROUNDABOUT.r], // boulevard from the south gate to the roundabout
  [0, ROUNDABOUT.z - ROUNDABOUT.r, 0, FRONT_AVENUE_Z], // roundabout to the plaza
  [-RING.rx, FRONT_AVENUE_Z, RING.rx, FRONT_AVENUE_Z], // front avenue across the campus
  [-75, FRONT_AVENUE_Z, -75, RING.cz - RING.rz + 6], // west avenue north
  [95, FRONT_AVENUE_Z, 95, RING.cz - RING.rz + 6], // east avenue north
];

export const LAKES: Lake[] = [
  { x: -200, z: 190, rx: 60, rz: 34 }, // south-west lake, outside the ring
  { x: 175, z: 178, rx: 40, rz: 24 },
];

/** Canal along the east edge */
export const CANAL: [number, number][] = [
  [318, -330], [300, -200], [306, -60], [292, 80], [300, 220], [286, 340],
];
export const CANAL_W = 18;

const CREAM = ["#f2ece4", "#ede4d8", "#e9ded0", "#f6f0e8", "#efe6dc"];
let tintIndex = 0;
const tint = () => CREAM[tintIndex++ % CREAM.length];

/** Four bars round a courtyard; `open` leaves one side out (the U faces that way). */
function courtyard(
  cx: number, cz: number, W: number, D: number, floors: number,
  roof: Building["roof"], open?: "south" | "north"
): Building[] {
  const depth = 14;
  const h = floors * 3.6;
  const t = tint();
  const bars: Building[] = [
    { x: cx - W / 2 + depth / 2, z: cz, w: depth, d: D, h, facade: "punched", roof, tint: t },
    { x: cx + W / 2 - depth / 2, z: cz, w: depth, d: D, h, facade: "punched", roof, tint: t },
  ];
  if (open !== "north") bars.push({ x: cx, z: cz - D / 2 + depth / 2, w: W - depth * 2, d: depth, h, facade: "punched", roof, tint: t });
  if (open !== "south") {
    // South side is split so a path can run into the courtyard
    const half = (W - depth * 2 - 10) / 2;
    bars.push({ x: cx - 5 - half / 2, z: cz + D / 2 - depth / 2, w: half, d: depth, h: h - 3.6, facade: "punched", roof, tint: t });
    bars.push({ x: cx + 5 + half / 2, z: cz + D / 2 - depth / 2, w: half, d: depth, h: h - 3.6, facade: "punched", roof, tint: t });
  }
  return bars;
}

const REKTORAT_WHITE = "#f5f2ed";

export const BUILDINGS: Building[] = [
  // Mathematics / FSAD courtyard, open toward the plaza
  ...courtyard(0, -60, 92, 64, 4, "flat", "south"),
  // Rektorat landmark: long ribbon-window bar, taller central block, two wings
  { x: -150, z: -62, w: 130, d: 18, h: 18, facade: "ribbon", roof: "cap", tint: REKTORAT_WHITE },
  { x: -150, z: -52, w: 30, d: 32, h: 27, facade: "ribbon", roof: "cap", tint: REKTORAT_WHITE },
  { x: -207, z: -30, w: 16, d: 48, h: 14.4, facade: "ribbon", roof: "cap", tint: REKTORAT_WHITE },
  { x: -93, z: -30, w: 16, d: 48, h: 14.4, facade: "ribbon", roof: "cap", tint: REKTORAT_WHITE },
  // Faculty clusters
  ...courtyard(-140, -140, 62, 52, 3, "pitched"),
  ...courtyard(140, -140, 70, 52, 4, "flat"),
  ...courtyard(160, -45, 52, 66, 3, "pitched"),
  ...courtyard(140, 85, 56, 44, 4, "flat", "north"),
  { x: -30, z: -175, w: 40, d: 26, h: 14.4, facade: "punched", roof: "pitched", tint: tint() },
  { x: 40, z: -178, w: 46, d: 22, h: 10.8, facade: "punched", roof: "flat", tint: tint() },
  { x: -40, z: 85, w: 34, d: 22, h: 10.8, facade: "punched", roof: "pitched", tint: tint() },
  { x: 60, z: 80, w: 40, d: 20, h: 14.4, facade: "punched", roof: "flat", tint: tint() },
];

export const WALKWAYS: Walkway[] = [
  { from: [-46, -28], to: [46, -28] }, // along the open side of the Mathematics courtyard
  { from: [-85, -34], to: [-46, -34] }, // Rektorat wing to the Mathematics courtyard
  { from: [118, -92], to: [118, -14] }, // between the eastern clusters
];

export const PORTICO = { x: -150, z: -28, w: 28, d: 10, h: 6 };

/** Closed loops the cars drive round: [x, z] points joined by a smooth curve. */
export const CAR_LOOPS: [number, number][][] = [
  // Front avenue, east side of the ring and back up the boulevard
  [
    [0, 127], [0, 93], [0, 52], [12, FRONT_AVENUE_Z], [120, FRONT_AVENUE_Z], [232, FRONT_AVENUE_Z],
    [216, 75], [160, 131], [85, 167], [43, 177], [10, 180], [0, 168],
  ],
  // Same on the west side, driven the other way round
  [
    [0, 127], [0, 168], [-10, 180], [-43, 177], [-85, 167], [-160, 131], [-216, 75],
    [-232, FRONT_AVENUE_Z], [-120, FRONT_AVENUE_Z], [-12, FRONT_AVENUE_Z], [0, 52], [0, 93],
  ],
];

// Seeded random, so the trees land in the same places on every visit.
let seed = 20261115;
export const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const insideEllipse = (x: number, z: number, cx: number, cz: number, rx: number, rz: number) =>
  ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 <= 1;

const distToSegment = (px: number, pz: number, x1: number, z1: number, x2: number, z2: number) => {
  const dx = x2 - x1, dz = z2 - z1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
};

/** True where nothing should grow: roads, water, buildings, the plaza. */
export function isBlocked(x: number, z: number, margin = 4): boolean {
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + 8) return true;
  // Ring road band
  const ringIn = insideEllipse(x, z, RING.cx, RING.cz, RING.rx - RING.width / 2 - margin, RING.rz - RING.width / 2 - margin);
  const ringOut = insideEllipse(x, z, RING.cx, RING.cz, RING.rx + RING.width / 2 + margin, RING.rz + RING.width / 2 + margin);
  if (ringOut && !ringIn) return true;
  if (Math.hypot(x - ROUNDABOUT.x, z - ROUNDABOUT.z) < ROUNDABOUT.r + 8) return true;
  if (AVENUES.some(([x1, z1, x2, z2]) => distToSegment(x, z, x1, z1, x2, z2) < ROAD_W / 2 + margin)) return true;
  if (LAKES.some((l) => insideEllipse(x, z, l.x, l.z, l.rx + margin, l.rz + margin))) return true;
  for (let i = 1; i < CANAL.length; i++) {
    const [x1, z1] = CANAL[i - 1], [x2, z2] = CANAL[i];
    if (distToSegment(x, z, x1, z1, x2, z2) < CANAL_W / 2 + margin) return true;
  }
  if (BUILDINGS.some((b) => Math.abs(x - b.x) < b.w / 2 + margin && Math.abs(z - b.z) < b.d / 2 + margin)) return true;
  if (Math.abs(x - PORTICO.x) < PORTICO.w / 2 + margin && Math.abs(z - PORTICO.z) < PORTICO.d / 2 + margin) return true;
  return false;
}

/** Tree positions in groves, along the boulevard and around the lakes. */
export function treeSpots(count: number): [number, number, number][] {
  const spots: [number, number, number][] = [];
  const half = WORLD / 2 - 10;
  // Avenue trees along both sides of the boulevard
  for (let z = 400; z > ROUNDABOUT.z + 26; z -= 12) {
    spots.push([-ROAD_W / 2 - 5, z, 1.1], [ROAD_W / 2 + 5, z, 1.1]);
  }
  // Groves: density rises and falls across the campus so trees bunch together
  let tries = 0;
  while (spots.length < count && tries < count * 40) {
    tries++;
    const x = (rand() * 2 - 1) * half;
    const z = (rand() * 2 - 1) * half;
    const density = 0.5 + 0.5 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.027 - 0.4);
    const nearWater = LAKES.some((l) => insideEllipse(x, z, l.x, l.z, l.rx + 26, l.rz + 26));
    if (rand() > (nearWater ? 0.9 : density * 0.75)) continue;
    if (isBlocked(x, z)) continue;
    spots.push([x, z, 0.75 + rand() * 0.65]);
  }
  return spots;
}
