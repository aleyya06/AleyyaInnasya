import * as THREE from "three";
import {
  AVENUES, CANAL, CANAL_W, FRONT_AVENUE_Z, LAKES, PLAZA, RING, ROAD_W, ROUNDABOUT, WORLD, rand,
} from "./campusLayout";

const canvas = (size: number) => {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  if (!g) throw new Error("2D canvas unavailable");
  return { c, g };
};

const toTexture = (c: HTMLCanvasElement, repeat = true) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

export interface FacadeTextures {
  map: THREE.CanvasTexture;
  lit: THREE.CanvasTexture;
}

/** One tile holds 8 x 8 window modules (3 m wide, 3.6 m floor height).
 *  `punched`: separate windows with sills. `ribbon`: continuous horizontal glazing bands. */
export function facadeTextures(kind: "punched" | "ribbon"): FacadeTextures {
  const { c: base, g: b } = canvas(256);
  const { c: lit, g: l } = canvas(256);
  b.fillStyle = "#ffffff";
  b.fillRect(0, 0, 256, 256);
  l.fillStyle = "#000000";
  l.fillRect(0, 0, 256, 256);

  for (let row = 0; row < 8; row++) {
    const y = row * 32;
    if (kind === "ribbon") {
      b.fillStyle = "#4f5662";
      b.fillRect(0, y + 9, 256, 14);
      b.fillStyle = "#d9d4ce";
      for (let x = 0; x < 256; x += 16) b.fillRect(x, y + 9, 2, 14);
      for (let col = 0; col < 16; col++) {
        if (rand() < 0.4) {
          l.fillStyle = rand() < 0.5 ? "#ffd29a" : "#ffe4c0";
          l.fillRect(col * 16 + 2, y + 9, 14, 14);
        }
      }
    } else {
      for (let col = 0; col < 8; col++) {
        const x = col * 32;
        b.fillStyle = "#555b67";
        b.fillRect(x + 8, y + 8, 16, 17);
        b.fillStyle = "#dcd6cf";
        b.fillRect(x + 7, y + 25, 18, 2);
        if (rand() < 0.34) {
          l.fillStyle = rand() < 0.5 ? "#ffd29a" : "#ffe4c0";
          l.fillRect(x + 8, y + 8, 16, 17);
        }
      }
    }
  }
  return { map: toTexture(base), lit: toTexture(lit) };
}

/** Lawns, roads, markings, crossings, plaza paving and water edges, painted onto one texture. */
export function groundTexture(size: number): THREE.CanvasTexture {
  const { c, g } = canvas(size);
  const s = size / WORLD;
  const P = (v: number) => (v + WORLD / 2) * s;

  // Manicured lawn with faint mowing stripes
  g.fillStyle = "#9fb88a";
  g.fillRect(0, 0, size, size);
  for (let z = -WORLD / 2; z < WORLD / 2; z += 16) {
    g.fillStyle = (Math.floor(z / 16) % 2 === 0) ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
    g.fillRect(0, P(z), size, 8 * s);
  }

  const stroke = (draw: () => void, color: string, width: number, dash?: number[]) => {
    g.save();
    g.strokeStyle = color;
    g.lineWidth = width * s;
    g.lineCap = "round";
    g.lineJoin = "round";
    if (dash) g.setLineDash(dash.map((d) => d * s));
    g.beginPath();
    draw();
    g.stroke();
    g.restore();
  };
  const ring = () => g.ellipse(P(RING.cx), P(RING.cz), RING.rx * s, RING.rz * s, 0, 0, Math.PI * 2);
  const avenues = () => AVENUES.forEach(([x1, z1, x2, z2]) => { g.moveTo(P(x1), P(z1)); g.lineTo(P(x2), P(z2)); });
  const roundabout = () => g.arc(P(ROUNDABOUT.x), P(ROUNDABOUT.z), ROUNDABOUT.r * s, 0, Math.PI * 2);
  const canal = () => CANAL.forEach(([x, z], i) => (i ? g.lineTo(P(x), P(z)) : g.moveTo(P(x), P(z))));

  // Water: banks first, then the surface (the reflective meshes sit on top)
  LAKES.forEach((l) => {
    g.fillStyle = "#b7c8a2";
    g.beginPath();
    g.ellipse(P(l.x), P(l.z), (l.rx + 6) * s, (l.rz + 6) * s, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#6f9cab";
    g.beginPath();
    g.ellipse(P(l.x), P(l.z), l.rx * s, l.rz * s, 0, 0, Math.PI * 2);
    g.fill();
  });
  stroke(canal, "#b7c8a2", CANAL_W + 10);
  stroke(canal, "#6f9cab", CANAL_W);

  // Sidewalks under the roads, then asphalt, then markings
  stroke(ring, "#dcd3c6", RING.width + 6);
  stroke(avenues, "#dcd3c6", ROAD_W + 6);
  stroke(roundabout, "#dcd3c6", 16);
  stroke(ring, "#5a5560", RING.width);
  stroke(avenues, "#5a5560", ROAD_W);
  stroke(roundabout, "#5a5560", 10);
  stroke(ring, "#efe5d6", 0.5, [4, 4]);
  stroke(avenues, "#efe5d6", 0.5, [4, 4]);

  // Roundabout island
  g.fillStyle = "#8fab79";
  g.beginPath();
  g.arc(P(ROUNDABOUT.x), P(ROUNDABOUT.z), (ROUNDABOUT.r - 5) * s, 0, Math.PI * 2);
  g.fill();

  // Zebra crossings where the boulevard meets the front avenue and at the roundabout
  g.fillStyle = "#f4ece2";
  const zebraAcrossX = (cx: number, cz: number) => {
    for (let q = -5; q <= 5; q += 2) g.fillRect(P(cx + q), P(cz), 1 * s, 3 * s);
  };
  const zebraAcrossZ = (cx: number, cz: number) => {
    for (let q = -5; q <= 5; q += 2) g.fillRect(P(cx), P(cz + q), 3 * s, 1 * s);
  };
  zebraAcrossX(0, FRONT_AVENUE_Z + ROAD_W / 2 + 1);
  zebraAcrossX(0, ROUNDABOUT.z + ROUNDABOUT.r + 4);
  zebraAcrossZ(-ROAD_W / 2 - 4, FRONT_AVENUE_Z);
  zebraAcrossZ(ROAD_W / 2 + 1, FRONT_AVENUE_Z);
  [-75, 95].forEach((x) => zebraAcrossZ(x + ROAD_W / 2 + 1, FRONT_AVENUE_Z));

  // Paved footpaths between buildings
  const path = (pts: [number, number][]) =>
    stroke(() => pts.forEach(([x, z], i) => (i ? g.lineTo(P(x), P(z)) : g.moveTo(P(x), P(z)))), "#e6dccd", 3);
  path([[0, PLAZA.z - PLAZA.r], [0, -60]]);
  path([[-46, -28], [-150, -28], [-150, -62]]);
  path([[46, -28], [118, -28], [118, -110]]);
  path([[-150, -100], [-140, -114]]);
  path([[-200, 160], [-150, 120], [-110, 100]]);

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
