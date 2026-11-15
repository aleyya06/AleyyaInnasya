import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  BUILDINGS, CANAL, CANAL_W, CAR_LOOPS, LAKES, PORTICO, WALKWAYS, WORLD, rand, treeSpots,
  type Building,
} from "./campusLayout";
import { facadeTextures, groundTexture } from "./proceduralTextures";
import { sceneState, smoothstep } from "./cameraRig";

type V3 = [number, number, number];

/** Collects quads and triangles into one merged geometry, so each material draws in one call. */
class Batch {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  idx: number[] = [];
  n = 0;

  private vert(p: V3, normal: V3, u: number, v: number, c: THREE.Color) {
    this.pos.push(...p);
    this.nor.push(...normal);
    this.uv.push(u, v);
    this.col.push(c.r, c.g, c.b);
  }
  /** a b c d counter-clockwise as seen from outside */
  quad(a: V3, b: V3, c: V3, d: V3, normal: V3, uw: number, vh: number, color: THREE.Color) {
    this.vert(a, normal, 0, 0, color);
    this.vert(b, normal, uw, 0, color);
    this.vert(c, normal, uw, vh, color);
    this.vert(d, normal, 0, vh, color);
    const n = this.n;
    this.idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    this.n += 4;
  }
  tri(a: V3, b: V3, c: V3, color: THREE.Color) {
    const normal = new THREE.Vector3()
      .subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a))
      .cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c), new THREE.Vector3(...a)))
      .normalize();
    const nArr: V3 = [normal.x, normal.y, normal.z];
    this.vert(a, nArr, 0, 0, color);
    this.vert(b, nArr, 1, 0, color);
    this.vert(c, nArr, 0.5, 1, color);
    this.idx.push(this.n, this.n + 1, this.n + 2);
    this.n += 3;
  }
  /** Box sides only (no top), walls textured per window module */
  walls(x: number, z: number, w: number, d: number, y0: number, h: number, color: THREE.Color) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, y1 = y0 + h;
    const U = (len: number) => len / 24;
    const V = h / 28.8;
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], U(w), V, color);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], U(w), V, color);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], U(d), V, color);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], U(d), V, color);
  }
  top(x: number, z: number, w: number, d: number, y: number, color: THREE.Color) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], 1, 1, color);
  }
  /** A solid slab: four sides plus a top */
  slab(x: number, z: number, w: number, d: number, y0: number, h: number, color: THREE.Color) {
    this.walls(x, z, w, d, y0, h, color);
    this.top(x, z, w, d, y0 + h, color);
  }
  /** Gable roof with its ridge along the longer side */
  gable(b: Building, color: THREE.Color) {
    const along = b.w >= b.d;
    const span = along ? b.d : b.w;
    const rise = span * 0.32;
    const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2;
    const y = b.h, top = b.h + rise;
    if (along) {
      this.quadAuto([x0, y, z1], [x1, y, z1], [x1, top, b.z], [x0, top, b.z], color);
      this.quadAuto([x1, y, z0], [x0, y, z0], [x0, top, b.z], [x1, top, b.z], color);
      this.tri([x0, y, z0], [x0, y, z1], [x0, top, b.z], color);
      this.tri([x1, y, z1], [x1, y, z0], [x1, top, b.z], color);
    } else {
      this.quadAuto([x1, y, z1], [x1, y, z0], [b.x, top, z0], [b.x, top, z1], color);
      this.quadAuto([x0, y, z0], [x0, y, z1], [b.x, top, z1], [b.x, top, z0], color);
      this.tri([x0, y, z1], [x1, y, z1], [b.x, top, z1], color);
      this.tri([x1, y, z0], [x0, y, z0], [b.x, top, z0], color);
    }
  }
  private quadAuto(a: V3, b: V3, c: V3, d: V3, color: THREE.Color) {
    const n = new THREE.Vector3()
      .subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a))
      .cross(new THREE.Vector3().subVectors(new THREE.Vector3(...d), new THREE.Vector3(...a)))
      .normalize();
    this.quad(a, b, c, d, [n.x, n.y, n.z], 1, 1, color);
  }
  geometry(): THREE.BufferGeometry {
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

const TERRACOTTA = new THREE.Color("#b9674a");
const WARM_BROWN = new THREE.Color("#8b5a44");
const ROOF_GREY = new THREE.Color("#cfc8bf");

function buildArchitecture() {
  const punched = new Batch();
  const ribbon = new Batch();
  const roofs = new Batch();

  BUILDINGS.forEach((b) => {
    const tint = new THREE.Color(b.tint);
    (b.facade === "ribbon" ? ribbon : punched).walls(b.x, b.z, b.w, b.d, 0, b.h, tint);
    if (b.roof === "pitched") {
      roofs.gable(b, TERRACOTTA);
    } else if (b.roof === "cap") {
      // Rektorat: a thin terracotta cap that overhangs the white walls
      roofs.slab(b.x, b.z, b.w + 2.4, b.d + 2.4, b.h, 1.1, TERRACOTTA);
    } else {
      roofs.top(b.x, b.z, b.w, b.d, b.h, ROOF_GREY);
      roofs.walls(b.x, b.z, b.w + 0.6, b.d + 0.6, b.h, 0.6, WARM_BROWN); // parapet edge round the grey roof
    }
  });

  // Rektorat portico: a deep canopy on columns
  const p = PORTICO;
  roofs.slab(p.x, p.z, p.w, p.d, p.h, 0.9, TERRACOTTA);
  for (let i = 0; i < 6; i++) {
    roofs.slab(p.x - p.w / 2 + 2 + i * ((p.w - 4) / 5), p.z + p.d / 2 - 1, 0.8, 0.8, 0, p.h, ROOF_GREY);
  }

  // Covered walkways: a slim roof on posts
  WALKWAYS.forEach(({ from: [x1, z1], to: [x2, z2] }) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    roofs.slab(cx, cz, alongX ? len : 3.4, alongX ? 3.4 : len, 3, 0.35, WARM_BROWN);
    for (let t = 0; t <= len; t += 8) {
      const px = x1 + ((x2 - x1) * t) / len, pz = z1 + ((z2 - z1) * t) / len;
      roofs.slab(px, pz, 0.3, 0.3, 0, 3, ROOF_GREY);
    }
  });

  return { punched: punched.geometry(), ribbon: ribbon.geometry(), roofs: roofs.geometry() };
}

/** Flat water surfaces: one ellipse per lake plus a ribbon along the canal */
function buildWater() {
  const geos: THREE.BufferGeometry[] = LAKES.map((l) => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, l.rx, l.rz, 0, Math.PI * 2, false, 0);
    const g = new THREE.ShapeGeometry(shape, 48);
    g.rotateX(-Math.PI / 2);
    g.translate(l.x, 0.12, l.z);
    return g;
  });
  const curve = new THREE.CatmullRomCurve3(CANAL.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const pts = curve.getSpacedPoints(80);
  const pos: number[] = [];
  const idx: number[] = [];
  pts.forEach((p, i) => {
    const tan = curve.getTangentAt(i / (pts.length - 1));
    const nx = -tan.z, nz = tan.x;
    pos.push(p.x + (nx * CANAL_W) / 2, 0.12, p.z + (nz * CANAL_W) / 2, p.x - (nx * CANAL_W) / 2, 0.12, p.z - (nz * CANAL_W) / 2);
    if (i) {
      const k = i * 2;
      idx.push(k - 2, k, k - 1, k - 1, k, k + 1);
    }
  });
  const canal = new THREE.BufferGeometry();
  canal.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  canal.setIndex(idx);
  canal.computeVertexNormals();
  return [...geos, canal];
}

interface CampusMaquetteProps {
  lowTier: boolean;
  reduced: boolean;
}

export function CampusMaquette({ lowTier, reduced }: CampusMaquetteProps) {
  const anisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());

  const assets = useMemo(() => {
    const ground = groundTexture(lowTier ? 2048 : 4096);
    ground.anisotropy = anisotropy;
    const punchedTex = facadeTextures("punched");
    const ribbonTex = facadeTextures("ribbon");
    const arch = buildArchitecture();
    const water = buildWater();

    const groundGeo = new THREE.PlaneGeometry(WORLD, WORLD).rotateX(-Math.PI / 2);
    const outskirtsGeo = new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2).translate(0, -0.1, 0);
    const wall = (tex: { map: THREE.Texture; lit: THREE.Texture }) =>
      new THREE.MeshStandardMaterial({
        map: tex.map, emissiveMap: tex.lit, emissive: "#ffffff", emissiveIntensity: 0,
        vertexColors: true, roughness: 0.85, metalness: 0.03,
      });

    const materials = {
      ground: new THREE.MeshStandardMaterial({ map: ground, roughness: 0.96 }),
      outskirts: new THREE.MeshStandardMaterial({ color: "#a9bd93", roughness: 1 }),
      punched: wall(punchedTex),
      ribbon: wall(ribbonTex),
      roofs: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
      water: new THREE.MeshStandardMaterial({ color: "#6b98a8", roughness: 0.08, metalness: 0.35, side: THREE.DoubleSide }),
      trunk: new THREE.MeshStandardMaterial({ color: "#6e5548", roughness: 1 }),
      crown: new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }),
      car: new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.2 }),
    };

    // Trees: tropical canopies in several greens, instanced
    const spots = treeSpots(lowTier ? 320 : 720);
    const trunkGeo = new THREE.CylinderGeometry(0.32, 0.46, 3.4, 6).translate(0, 1.7, 0);
    const crownGeo = new THREE.IcosahedronGeometry(2.9, 0).translate(0, 5.2, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, materials.trunk, spots.length);
    const crowns = new THREE.InstancedMesh(crownGeo, materials.crown, spots.length);
    const greens = ["#6f8f5f", "#7f9f68", "#5f7f55", "#94ab78", "#83a06c"].map((c) => new THREE.Color(c));
    const dummy = new THREE.Object3D();
    spots.forEach(([x, z, s], k) => {
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.scale.set(s * (0.9 + rand() * 0.3), s, s * (0.9 + rand() * 0.3));
      dummy.updateMatrix();
      trunks.setMatrixAt(k, dummy.matrix);
      crowns.setMatrixAt(k, dummy.matrix);
      crowns.setColorAt(k, greens[k % greens.length]);
    });

    // Cars and campus shuttles on closed loops; Indonesia drives on the left
    const loops = CAR_LOOPS.map(
      (pts) => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "catmullrom", 0.15)
    );
    const carCount = lowTier ? 18 : 36;
    const carGeo = new THREE.BoxGeometry(2, 1.3, 4.3).translate(0, 0.85, 0);
    const busGeo = new THREE.BoxGeometry(2.5, 2.6, 9).translate(0, 1.5, 0);
    const cars = new THREE.InstancedMesh(carGeo, materials.car, carCount);
    const buses = new THREE.InstancedMesh(busGeo, materials.car, 3);
    const carColors = ["#fbf6f3", "#230a18", "#b16692", "#d8d2cc", "#8a8790", "#b9674a"].map((c) => new THREE.Color(c));
    const movers = [
      ...Array.from({ length: carCount }, (_, k) => {
        cars.setColorAt(k, carColors[k % carColors.length]);
        return { mesh: cars, index: k, loop: loops[k % loops.length], t: rand(), speed: 9 + rand() * 6 };
      }),
      ...[0, 1, 2].map((k) => {
        buses.setColorAt(k, new THREE.Color(k === 1 ? "#b16692" : "#f2ece4"));
        return { mesh: buses, index: k, loop: loops[k % loops.length], t: k / 3 + 0.1, speed: 6 };
      }),
    ];
    const loopLengths = new Map(loops.map((l) => [l, l.getLength()]));

    return {
      ground, punchedTex, ribbonTex, arch, water, groundGeo, outskirtsGeo, materials,
      trunks, crowns, trunkGeo, crownGeo, cars, buses, carGeo, busGeo, movers, loopLengths, dummy,
    };
  }, [lowTier, anisotropy]);

  // Dispose everything this component created when it unmounts
  useEffect(
    () => () => {
      const a = assets;
      [a.ground, a.punchedTex.map, a.punchedTex.lit, a.ribbonTex.map, a.ribbonTex.lit].forEach((t) => t.dispose());
      [a.arch.punched, a.arch.ribbon, a.arch.roofs, a.groundGeo, a.outskirtsGeo, a.trunkGeo, a.crownGeo, a.carGeo, a.busGeo, ...a.water]
        .forEach((g) => g.dispose());
      Object.values(a.materials).forEach((m) => m.dispose());
      [a.trunks, a.crowns, a.cars, a.buses].forEach((m) => m.dispose());
    },
    [assets]
  );

  const tangent = useMemo(() => new THREE.Vector3(), []);
  const point = useMemo(() => new THREE.Vector3(), []);

  const placeMovers = (dt: number) => {
    const { movers, loopLengths, dummy } = assets;
    movers.forEach((m) => {
      m.t = (m.t + (m.speed * dt) / (loopLengths.get(m.loop) ?? 1)) % 1;
      m.loop.getPointAt(m.t, point);
      m.loop.getTangentAt(m.t, tangent);
      // Keep left: offset to the left of the direction of travel
      dummy.position.set(point.x + tangent.z * 2.8, 0, point.z - tangent.x * 2.8);
      dummy.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      m.mesh.setMatrixAt(m.index, dummy.matrix);
    });
    assets.cars.instanceMatrix.needsUpdate = true;
    assets.buses.instanceMatrix.needsUpdate = true;
  };

  // Place the cars once up front, for the reduced-motion still frame
  useEffect(() => {
    placeMovers(0);
  });

  useFrame((_, delta) => {
    const lit = smoothstep(0.45, 1, sceneState.golden);
    assets.materials.punched.emissiveIntensity = lit * 0.7;
    assets.materials.ribbon.emissiveIntensity = lit * 0.75;
    if (!reduced) placeMovers(Math.min(delta, 0.05));
  });

  const { materials: m, arch } = assets;
  return (
    <group>
      <mesh geometry={assets.outskirtsGeo} material={m.outskirts} receiveShadow />
      <mesh geometry={assets.groundGeo} material={m.ground} receiveShadow />
      {assets.water.map((g, i) => <mesh key={i} geometry={g} material={m.water} receiveShadow />)}
      <mesh geometry={arch.punched} material={m.punched} castShadow={!lowTier} receiveShadow />
      <mesh geometry={arch.ribbon} material={m.ribbon} castShadow={!lowTier} receiveShadow />
      <mesh geometry={arch.roofs} material={m.roofs} castShadow={!lowTier} receiveShadow />
      <primitive object={assets.trunks} castShadow={!lowTier} receiveShadow />
      <primitive object={assets.crowns} castShadow={!lowTier} receiveShadow />
      <primitive object={assets.cars} castShadow={!lowTier} />
      <primitive object={assets.buses} castShadow={!lowTier} />
    </group>
  );
}
