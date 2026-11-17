import * as THREE from "three";
import {
  AVENUE, AXIS_WAY, BOULEVARD, BOULEVARD_HALF, COMPOUNDS, FORECOURT, HALL, MOAT, MOAT_WATER, PLAZA,
  PRECINCT, PRECINCT_LAWNS, RING, RING_W, STREETS, STREET_W, TERRACE, TOWERS, WORLD, rand,
} from "./beijingLayout";

const canvas = (w: number, h = w) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("2D canvas unavailable");
  return { c, g };
};

const toTexture = (c: HTMLCanvasElement, repeat = true, color = true) => {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

export interface GlassTextures {
  map: THREE.CanvasTexture;
  lit: THREE.CanvasTexture;
}

/** Curtain wall: one tile holds 8 x 8 modules (3.2 m wide, 3.6 m floors) with mullions and floor lines. */
export function curtainWallTextures(): GlassTextures {
  const { c: base, g: b } = canvas(256);
  const { c: lit, g: l } = canvas(256);
  b.fillStyle = "#cfd6dd";
  b.fillRect(0, 0, 256, 256);
  l.fillStyle = "#000000";
  l.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const x = col * 32, y = row * 32;
      const shade = 0.88 + rand() * 0.12;
      b.fillStyle = `rgb(${Math.round(160 * shade)},${Math.round(172 * shade)},${Math.round(186 * shade)})`;
      b.fillRect(x + 2, y + 3, 29, 26);
      if (rand() < 0.38) {
        l.fillStyle = rand() < 0.5 ? "#ffd29a" : "#ffe6c4";
        l.fillRect(x + 3, y + 4, 27, 24);
      }
    }
    b.fillStyle = "#e8ebee";
    b.fillRect(0, row * 32, 256, 3);
  }
  return { map: toTexture(base), lit: toTexture(lit) };
}

/** Warm interior glow behind the pavilion's ribbon glazing, varying bay by bay */
export function ribbonGlowTexture(): THREE.CanvasTexture {
  const { c, g } = canvas(256, 8);
  for (let x = 0; x < 256; x += 8) {
    const v = 0.8 + rand() * 0.2;
    g.fillStyle = `rgb(${Math.round(255 * v)},${Math.round(198 * v)},${Math.round(140 * v)})`;
    g.fillRect(x, 0, 8, 8);
    g.fillStyle = "#3a2a20";
    g.fillRect(x + 7, 0, 1, 8); // mullion
  }
  return toTexture(c);
}

/** Roof tiles: rows running down the slope, as light and dark stripes */
export function roofTileTexture(): THREE.CanvasTexture {
  const { c, g } = canvas(64);
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 64, 64);
  for (let x = 0; x < 64; x += 16) {
    g.fillStyle = "#c9c9c9";
    g.fillRect(x, 0, 5, 64);
    g.fillStyle = "#e6e6e6";
    g.fillRect(x + 5, 0, 3, 64);
  }
  for (let y = 0; y < 64; y += 16) {
    g.fillStyle = "rgba(0,0,0,0.08)";
    g.fillRect(0, y, 64, 2);
  }
  return toTexture(c);
}

/** Lawns, granite paving, roads, markings, crossings, the moat banks and courtyard floors on one texture. */
export function groundTexture(size: number): THREE.CanvasTexture {
  const { c, g } = canvas(size);
  const s = size / WORLD;
  const P = (v: number) => (v + WORLD / 2) * s;
  const rect = (x0: number, z0: number, x1: number, z1: number, color: string) => {
    g.fillStyle = color;
    g.fillRect(P(Math.min(x0, x1)), P(Math.min(z0, z1)), Math.abs(x1 - x0) * s, Math.abs(z1 - z0) * s);
  };
  const joints = (x0: number, z0: number, x1: number, z1: number, step: number, color: string) => {
    g.fillStyle = color;
    const t = Math.max(1, 0.18 * s);
    for (let x = x0; x <= x1; x += step) g.fillRect(P(x), P(z0), t, (z1 - z0) * s);
    for (let z = z0; z <= z1; z += step) g.fillRect(P(x0), P(z), (x1 - x0) * s, t);
  };

  // Lawn with faint mowing stripes
  g.fillStyle = "#9fb88a";
  g.fillRect(0, 0, size, size);
  for (let z = -WORLD / 2; z < WORLD / 2; z += 16) {
    g.fillStyle = Math.floor(z / 16) % 2 === 0 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
    g.fillRect(0, P(z), size, 8 * s);
  }

  // Precinct: granite paving with joints, lawn panels set into it
  rect(-PRECINCT.x, PRECINCT.zN, PRECINCT.x, PRECINCT.zS, "#e2d9cc");
  joints(-PRECINCT.x, PRECINCT.zN, PRECINCT.x, PRECINCT.zS, 6, "rgba(120,104,90,0.16)");
  PRECINCT_LAWNS.forEach(([x0, z0, x1, z1]) => {
    rect(x0 - 1, z0 - 1, x1 + 1, z1 + 1, "#cfc4b4");
    rect(x0, z0, x1, z1, "#98b383");
  });
  // Marble imperial path down the axis, and the terrace forecourt
  rect(-AXIS_WAY.half, TERRACE.d / 2 + HALL.z, AXIS_WAY.half, AXIS_WAY.z1, "#ebe3d7");
  rect(-3, HALL.z + TERRACE.d / 2, 3, AXIS_WAY.z1, "#f4eee5");
  rect(-TERRACE.w / 2 - 8, HALL.z - TERRACE.d / 2 - 8, TERRACE.w / 2 + 8, HALL.z + TERRACE.d / 2 + 8, "#e8e0d3");

  // Moat: stone banks, then water (the reflective mesh sits on top)
  const band = (half: number, color: string) => {
    g.strokeStyle = color;
    g.lineWidth = half * 2 * s;
    g.strokeRect(P(-MOAT.x), P(MOAT.zN), MOAT.x * 2 * s, (MOAT.zS - MOAT.zN) * s);
  };
  band(MOAT.w / 2 + 2, "#cbc2b4");
  band(MOAT_WATER / 2, "#5f8f9f");

  // Forecourt between the moat and the avenue
  rect(-FORECOURT.half, FORECOURT.z0, FORECOURT.half, FORECOURT.z1, "#e6ddd0");
  joints(-FORECOURT.half, FORECOURT.z0, FORECOURT.half, FORECOURT.z1, 4, "rgba(120,104,90,0.14)");

  // Roads: sidewalks first, then asphalt, then markings
  const SIDEWALK = "#dcd3c6", ASPHALT = "#5a5560", LINE = "#efe5d6", CENTRE = "#e9cf8f";
  const ringPath = (half: number) => {
    g.beginPath();
    g.roundRect(P(-RING - half), P(-RING - half), (RING + half) * 2 * s, (RING + half) * 2 * s, 26 * s);
    g.roundRect(P(-RING + half), P(-RING + half), (RING - half) * 2 * s, (RING - half) * 2 * s, 14 * s);
    g.fill("evenodd");
  };
  g.fillStyle = SIDEWALK;
  ringPath(RING_W / 2 + 3);
  rect(-RING, AVENUE.z - AVENUE.w / 2 - 3, RING, AVENUE.z + AVENUE.w / 2 + 3, SIDEWALK);
  rect(-BOULEVARD_HALF - 3, BOULEVARD.z0, BOULEVARD_HALF + 3, BOULEVARD.z1, SIDEWALK);
  STREETS.forEach(([x1, z1, x2, z2]) =>
    x1 === x2 ? rect(x1 - STREET_W / 2 - 3, z1, x1 + STREET_W / 2 + 3, z2, SIDEWALK) : rect(x1, z1 - STREET_W / 2 - 3, x2, z1 + STREET_W / 2 + 3, SIDEWALK)
  );
  g.fillStyle = ASPHALT;
  ringPath(RING_W / 2);
  rect(-RING, AVENUE.z - AVENUE.w / 2, RING, AVENUE.z + AVENUE.w / 2, ASPHALT);
  rect(-BOULEVARD_HALF, BOULEVARD.z0, BOULEVARD_HALF, BOULEVARD.z1, ASPHALT);
  STREETS.forEach(([x1, z1, x2, z2]) =>
    x1 === x2 ? rect(x1 - STREET_W / 2, z1, x1 + STREET_W / 2, z2, ASPHALT) : rect(x1, z1 - STREET_W / 2, x2, z1 + STREET_W / 2, ASPHALT)
  );
  // Boulevard median: kerbed planting strip
  rect(-BOULEVARD.median / 2, BOULEVARD.z0 + 4, BOULEVARD.median / 2, BOULEVARD.z1, "#d8cfc2");
  rect(-BOULEVARD.median / 2 + 0.8, BOULEVARD.z0 + 4.8, BOULEVARD.median / 2 - 0.8, BOULEVARD.z1, "#89a673");

  const dashes = (x0: number, z0: number, x1: number, z1: number, color: string, dash = 4, gap = 4, width = 0.4) => {
    g.save();
    g.strokeStyle = color;
    g.lineWidth = width * s;
    g.setLineDash(dash ? [dash * s, gap * s] : []);
    g.beginPath();
    g.moveTo(P(x0), P(z0));
    g.lineTo(P(x1), P(z1));
    g.stroke();
    g.restore();
  };
  // Lane lines: a solid double centre line on the avenue, dashed lanes everywhere
  dashes(-RING, AVENUE.z - 0.35, RING, AVENUE.z - 0.35, CENTRE, 0, 0, 0.3);
  dashes(-RING, AVENUE.z + 0.35, RING, AVENUE.z + 0.35, CENTRE, 0, 0, 0.3);
  [-1, 1].forEach((k) => {
    dashes(-RING, AVENUE.z + k * 6.5, RING, AVENUE.z + k * 6.5, LINE);
    const x = k * (BOULEVARD.median / 2 + BOULEVARD.carriage / 2);
    dashes(x, BOULEVARD.z0, x, BOULEVARD.z1, LINE);
  });
  STREETS.forEach(([x1, z1, x2, z2]) => dashes(x1, z1, x2, z2, LINE));
  g.save();
  g.strokeStyle = LINE;
  g.lineWidth = 0.4 * s;
  g.setLineDash([4 * s, 4 * s]);
  g.beginPath();
  g.roundRect(P(-RING), P(-RING), RING * 2 * s, RING * 2 * s, 20 * s);
  g.stroke();
  g.restore();

  // Zebra crossings: across the avenue on the axis, at the boulevard junctions and side streets
  g.fillStyle = "#f4ece2";
  const zebraAcrossZ = (cx: number, half: number, z0: number, z1: number) => {
    for (let x = cx - half; x <= cx + half; x += 2) g.fillRect(P(x), P(z0), 1 * s, (z1 - z0) * s);
  };
  const zebraAcrossX = (cz: number, half: number, x0: number, x1: number) => {
    for (let z = cz - half; z <= cz + half; z += 2) g.fillRect(P(x0), P(z), (x1 - x0) * s, 1 * s);
  };
  zebraAcrossZ(0, 13, AVENUE.z - AVENUE.w / 2 + 1, AVENUE.z + AVENUE.w / 2 - 1);
  zebraAcrossX(BOULEVARD.z0 + 3, 1.5, -BOULEVARD_HALF, BOULEVARD_HALF);
  zebraAcrossX(RING - RING_W / 2 - 4, 1.5, -BOULEVARD_HALF, BOULEVARD_HALF);
  zebraAcrossX(RING + RING_W / 2 + 4, 1.5, -BOULEVARD_HALF, BOULEVARD_HALF);
  [-200, 200].forEach((x) => {
    zebraAcrossX(AVENUE.z - AVENUE.w / 2 - 3, 1.5, x - STREET_W / 2, x + STREET_W / 2);
    zebraAcrossX(AVENUE.z + AVENUE.w / 2 + 3, 1.5, x - STREET_W / 2, x + STREET_W / 2);
  });

  // Courtyard floors: grey brick with a cross of paths and four planted beds
  COMPOUNDS.forEach(({ x, z, w, d }) => {
    rect(x - w / 2, z - d / 2, x + w / 2, z + d / 2, "#d4cbbd");
    joints(x - w / 2, z - d / 2, x + w / 2, z + d / 2, 2.5, "rgba(90,80,70,0.1)");
    rect(x - 2.5, z - d / 2, x + 2.5, z + d / 2, "#e6ddd0");
    rect(x - w / 2, z + d * 0.06 - 2, x + w / 2, z + d * 0.06 + 2, "#e6ddd0");
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const bx = x + sx * w * 0.17, bz = z + d * 0.06 + sz * d * 0.12;
      rect(bx - 5, bz - 4, bx + 5, bz + 4, "#8faa78");
    });
  });

  // Tower plazas
  TOWERS.forEach((t) => {
    rect(t.x - t.w / 2 - 9, t.z - t.d / 2 - 9, t.x + t.w / 2 + 9, t.z + t.d / 2 + 9, "#d9d1c5");
    joints(t.x - t.w / 2 - 9, t.z - t.d / 2 - 9, t.x + t.w / 2 + 9, t.z + t.d / 2 + 9, 3, "rgba(90,80,70,0.1)");
  });

  // Plaza: circular paving with rings and radial joints
  g.fillStyle = "#efe6da";
  g.beginPath();
  g.arc(P(PLAZA.x), P(PLAZA.z), PLAZA.r * s, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(177,102,146,0.32)";
  g.lineWidth = Math.max(1, 0.3 * s);
  for (let r = 5; r < PLAZA.r; r += 3.2) {
    g.beginPath();
    g.arc(P(PLAZA.x), P(PLAZA.z), r * s, 0, Math.PI * 2);
    g.stroke();
  }
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
    g.beginPath();
    g.moveTo(P(PLAZA.x + Math.cos(a) * 5), P(PLAZA.z + Math.sin(a) * 5));
    g.lineTo(P(PLAZA.x + Math.cos(a) * PLAZA.r), P(PLAZA.z + Math.sin(a) * PLAZA.r));
    g.stroke();
  }

  return toTexture(c, false);
}
