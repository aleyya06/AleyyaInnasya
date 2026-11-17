// A stylised maquette inspired by Beijing: a north-south ceremonial axis through a moated
// precinct, Siheyuan courtyards either side of it, a curved pavilion behind the plaza and
// CBD towers in the outer districts. It is an interpretation, not a surveyed plan.
// Units are roughly metres; the camera starts south (+z) looking north (-z).

export const WORLD = 780; // ground square, centred on the origin

/** The circular plaza where the camera lands */
export const PLAZA = { x: 0, z: 6, r: 24 };
export const SCULPTURE_AT: [number, number, number] = [0, 6.4, 6];

/** Square ring road, centre line at ±RING */
export const RING = 330;
export const RING_W = 14;
/** East-west avenue in front of the precinct */
export const AVENUE = { z: 120, w: 26 };
/** Grand axis boulevard south of the avenue: two carriageways either side of a planted median */
export const BOULEVARD = { median: 12, carriage: 11, z0: AVENUE.z + AVENUE.w / 2, z1: WORLD / 2 };
export const BOULEVARD_HALF = BOULEVARD.median / 2 + BOULEVARD.carriage;
export const STREET_W = 14;
/** Secondary streets as [x1, z1, x2, z2] centre lines */
export const STREETS: [number, number, number, number][] = [
  [-200, -RING, -200, RING],
  [200, -RING, 200, RING],
  [-RING, -270, RING, -270],
];

/** Moat round the precinct: centre-line rectangle and full width including the stone banks */
export const MOAT = { x: 158, zN: -238, zS: 88, w: 14 };
export const MOAT_WATER = 11;
/** Inside edge of the moat */
export const PRECINCT = { x: MOAT.x - MOAT.w / 2, zN: MOAT.zN + MOAT.w / 2, zS: MOAT.zS - MOAT.w / 2 };
/** Paved ceremonial way from the plaza south to the moat, then the forecourt up to the avenue */
export const AXIS_WAY = { half: 15, z0: PLAZA.z + PLAZA.r, z1: PRECINCT.zS };
export const FORECOURT = { half: 42, z0: MOAT.zS + MOAT.w / 2, z1: AVENUE.z - AVENUE.w / 2 };
/** Arched pedestrian bridges over the south moat: [x, deck width] */
export const BRIDGES: [number, number][] = [[-28, 5], [-14, 5], [0, 7], [14, 5], [28, 5]];
export const BRIDGE_SPAN: [number, number] = [MOAT.zS - 14, MOAT.zS + 14];

export interface Volume {
  x: number;
  z: number;
  rx: number;
  rz: number;
  floors: number;
  /** How far the top floor drifts from the base centre, [dx, dz] */
  lean: [number, number];
}
export const FLOOR_H = 3.8;
/** Curved pavilion behind the plaza: a tall central volume and two lower ones */
export const PAVILION: Volume[] = [
  { x: 0, z: -92, rx: 40, rz: 30, floors: 10, lean: [0, -6] },
  { x: -60, z: -60, rx: 21, rz: 17, floors: 7, lean: [-4, -2] },
  { x: 60, z: -60, rx: 21, rz: 17, floors: 7, lean: [4, -2] },
];
/** Sky-bridges as [from volume, to volume, floor] */
export const SKY_BRIDGES: [number, number, number][] = [[0, 1, 2], [0, 2, 2], [0, 1, 5], [0, 2, 5]];

export interface Compound {
  x: number;
  z: number;
  w: number;
  d: number;
}
const pair = (x: number, z: number, w: number, d: number): Compound[] => [{ x: -x, z, w, d }, { x, z, w, d }];
/** Walled Siheyuan courtyards, mirrored across the axis */
export const COMPOUNDS: Compound[] = [
  ...pair(100, 30, 70, 80), // inside the precinct, either side of the plaza
  ...pair(115, -150, 64, 90), // behind the pavilion
  ...pair(75, 185, 90, 80), // flanking the boulevard
  ...pair(75, 280, 90, 74),
];
/** Imperial hall on a three-step terrace at the north end of the axis */
export const HALL = { x: 0, z: -190, w: 44, d: 22 };
export const TERRACE = { w: 72, d: 52 };

/** Lawn panels inside the paved precinct: [x0, z0, x1, z1] */
export const PRECINCT_LAWNS: [number, number, number, number][] = [
  [25, -34, 58, 76], [-58, -34, -25, 76],
  [88, -100, 148, -16], [-148, -100, -88, -16],
  [44, -226, 78, -128], [-78, -226, -44, -128],
];

// Seeded random, so towers and trees land in the same places on every visit.
let seed = 20261117;
export const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

export interface Tower {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  chamfer: number;
  /** Top footprint as a share of the base */
  taper: number;
  /** Height share where the shaft steps in, 0 for one continuous taper */
  setback: number;
}

/** CBD towers: [x, z, height]. The tallest sit north and east, away from the flight path. */
const TOWER_SLOTS: [number, number, number][] = [
  [240, -295, 150], [292, -225, 120], [240, -150, 170], [292, -75, 110], [240, 0, 135], [292, 60, 95],
  [240, 175, 90], [292, 245, 75], [240, 300, 60],
  [-240, -295, 130], [-292, -220, 105], [-240, -145, 145], [-292, -70, 120], [-240, 5, 100], [-292, 65, 85],
  [-240, 175, 70], [-292, 250, 55], [-240, 300, 50],
  [-150, -298, 115], [-80, -300, 160], [80, -300, 165], [150, -298, 120],
];
export const TOWERS: Tower[] = TOWER_SLOTS.map(([x, z, h]) => ({
  x,
  z,
  w: 26 + rand() * 10,
  d: 24 + rand() * 8,
  h: h * (0.9 + rand() * 0.2),
  chamfer: 3 + rand() * 4,
  taper: 0.62 + rand() * 0.24,
  setback: rand() < 0.5 ? 0.55 + rand() * 0.2 : 0,
}));

/** Traffic keeps right. Lane centre lines: */
const LANE_R = RING - 3.5;
const LANE_B = BOULEVARD.median / 2 + BOULEVARD.carriage / 2;
const LANE_EAST = AVENUE.z + 5;
const LANE_WEST = AVENUE.z - 5;
/** Closed loops as lane corner points, each turn a right turn */
const LOOP_CORNERS: [number, number][][] = [
  // North up the boulevard, east along the avenue, back by the ring
  [[LANE_B, LANE_R], [LANE_B, LANE_EAST], [LANE_R, LANE_EAST], [LANE_R, LANE_R]],
  // South down the boulevard, west by the ring, back along the avenue
  [[-LANE_B, LANE_EAST], [-LANE_B, LANE_R], [-LANE_R, LANE_R], [-LANE_R, LANE_EAST]],
  // The northern ring and the westbound side of the avenue
  [[-LANE_R, LANE_WEST], [-LANE_R, -LANE_R], [LANE_R, -LANE_R], [LANE_R, LANE_WEST]],
];

/** Corner points become straight runs with points every `step` metres and a short rounded turn. */
function roundedLoop(corners: [number, number][], step = 40, turn = 9): [number, number][] {
  const out: [number, number][] = [];
  corners.forEach((c, i) => {
    const next = corners[(i + 1) % corners.length];
    const len = Math.hypot(next[0] - c[0], next[1] - c[1]);
    const ux = (next[0] - c[0]) / len, uz = (next[1] - c[1]) / len;
    for (let t = turn; t < len - turn; t += step) out.push([c[0] + ux * t, c[1] + uz * t]);
    out.push([next[0] - ux * turn, next[1] - uz * turn]);
  });
  return out;
}
export const CAR_LOOPS = LOOP_CORNERS.map((c) => roundedLoop(c));

const insideEllipse = (x: number, z: number, cx: number, cz: number, rx: number, rz: number) =>
  ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 <= 1;
const inRect = (x: number, z: number, x0: number, z0: number, x1: number, z1: number) =>
  x >= Math.min(x0, x1) && x <= Math.max(x0, x1) && z >= Math.min(z0, z1) && z <= Math.max(z0, z1);

/** True on any road band, including its sidewalks */
export function onRoad(x: number, z: number, margin = 0): boolean {
  const ringBand = (v: number) => Math.abs(Math.abs(v) - RING) < RING_W / 2 + margin;
  if ((ringBand(x) && Math.abs(z) <= RING + RING_W / 2 + margin) || (ringBand(z) && Math.abs(x) <= RING + RING_W / 2 + margin)) return true;
  if (Math.abs(z - AVENUE.z) < AVENUE.w / 2 + margin && Math.abs(x) <= RING) return true;
  if (z > BOULEVARD.z0 - margin && Math.abs(x) < BOULEVARD_HALF + margin) return true;
  return STREETS.some(([x1, z1, x2, z2]) =>
    x1 === x2
      ? Math.abs(x - x1) < STREET_W / 2 + margin && inRect(0, z, 0, z1, 0, z2)
      : Math.abs(z - z1) < STREET_W / 2 + margin && inRect(x, 0, x1, 0, x2, 0)
  );
}

/** True where nothing should grow: roads, water, paving, buildings. */
export function isBlocked(x: number, z: number, margin = 4): boolean {
  if (Math.abs(x) > WORLD / 2 - 6 || Math.abs(z) > WORLD / 2 - 6) return true;
  if (onRoad(x, z, margin)) return true;
  // Moat band, and inside the precinct only the lawn panels may hold trees
  const outerMoat = inRect(x, z, -MOAT.x - MOAT.w / 2 - margin, MOAT.zN - MOAT.w / 2 - margin, MOAT.x + MOAT.w / 2 + margin, MOAT.zS + MOAT.w / 2 + margin);
  if (outerMoat) {
    const lawn = PRECINCT_LAWNS.some(([x0, z0, x1, z1]) => inRect(x, z, x0 + margin, z0 + margin, x1 - margin, z1 - margin));
    if (!lawn) return true;
  }
  if (inRect(x, z, -FORECOURT.half - margin, FORECOURT.z0, FORECOURT.half + margin, FORECOURT.z1)) return true;
  if (COMPOUNDS.some((c) => inRect(x, z, c.x - c.w / 2 - margin, c.z - c.d / 2 - margin, c.x + c.w / 2 + margin, c.z + c.d / 2 + margin))) return true;
  if (PAVILION.some((v) => insideEllipse(x, z, v.x, v.z, v.rx + margin + 6, v.rz + margin + 6))) return true;
  if (TOWERS.some((t) => Math.abs(x - t.x) < t.w / 2 + 10 + margin && Math.abs(z - t.z) < t.d / 2 + 10 + margin)) return true;
  return false;
}

/** Tree positions as [x, z, scale]: rows along the avenues and moat, a few in each courtyard, then groves. */
export function treeSpots(count: number): [number, number, number][] {
  const spots: [number, number, number][] = [];
  const row = (x0: number, z0: number, x1: number, z1: number, gap: number, s: number, skip?: (x: number, z: number) => boolean) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    for (let t = 0; t <= len; t += gap) {
      const x = x0 + ((x1 - x0) * t) / len, z = z0 + ((z1 - z0) * t) / len;
      if (!skip?.(x, z)) spots.push([x, z, s * (0.9 + rand() * 0.2)]);
    }
  };
  const nearRing = (_x: number, z: number) => Math.abs(z - RING) < RING_W / 2 + 6;
  // Boulevard: two rows in the median, one on each outer sidewalk
  [-2.6, 2.6].forEach((x) => row(x, BOULEVARD.z0 + 8, x, WORLD / 2 - 6, 10, 0.95, nearRing));
  [-BOULEVARD_HALF - 3.5, BOULEVARD_HALF + 3.5].forEach((x) => row(x, BOULEVARD.z0 + 8, x, WORLD / 2 - 6, 12, 1.1, nearRing));
  // Avenue sidewalks, leaving the junctions clear
  const junction = (x: number) => Math.abs(x) < BOULEVARD_HALF + 8 || Math.abs(Math.abs(x) - 200) < STREET_W / 2 + 6;
  [AVENUE.z - AVENUE.w / 2 - 3.5, AVENUE.z + AVENUE.w / 2 + 3.5].forEach((z) =>
    row(-RING + 14, z, RING - 14, z, 13, 1.05, (x) => junction(x) || (z < AVENUE.z && Math.abs(x) < FORECOURT.half + 4))
  );
  // Willows on the outer moat banks
  const bank = MOAT.w / 2 + 4;
  [-MOAT.x - bank, MOAT.x + bank].forEach((x) => row(x, MOAT.zN - bank, x, MOAT.zS + bank, 12, 1.15));
  row(-MOAT.x - bank, MOAT.zN - bank, MOAT.x + bank, MOAT.zN - bank, 12, 1.15);
  // Courtyard gardens
  COMPOUNDS.forEach((c) => {
    spots.push([c.x - c.w * 0.17, c.z + c.d * 0.08, 0.85], [c.x + c.w * 0.17, c.z + c.d * 0.08, 0.85]);
  });
  // Groves: density rises and falls across the city so trees bunch together
  const half = WORLD / 2 - 8;
  let tries = 0;
  while (spots.length < count && tries < count * 50) {
    tries++;
    const x = (rand() * 2 - 1) * half;
    const z = (rand() * 2 - 1) * half;
    const density = 0.5 + 0.5 * Math.sin(x * 0.019 + 1.3) * Math.cos(z * 0.023 - 0.4);
    if (rand() > density * 0.8) continue;
    if (isBlocked(x, z)) continue;
    spots.push([x, z, 0.8 + rand() * 0.55]);
  }
  return spots;
}
