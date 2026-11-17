import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { CAR_LOOPS, TOWERS, WORLD, rand, treeSpots, type Tower } from "./beijingLayout";
import { buildImperial, buildPavilion, buildTowers, moatWater } from "./architecture";
import { curtainWallTextures, groundTexture, ribbonGlowTexture, roofTileTexture } from "./proceduralTextures";
import { descentPath, sceneState, smoothstep } from "./cameraRig";

/** Soft sky gradient used only as a reflection map for glass and water */
function skyReflections(gl: THREE.WebGLRenderer): THREE.Texture {
  const geo = new THREE.SphereGeometry(40, 32, 16);
  const colors: number[] = [];
  const pos = geo.attributes.position;
  const zenith = new THREE.Color("#8fb6cf"), horizon = new THREE.Color("#f2e1d0"), ground = new THREE.Color("#8d8a7c");
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 40;
    if (y >= 0) c.lerpColors(horizon, zenith, Math.pow(y, 0.6));
    else c.lerpColors(horizon, ground, Math.min(1, -y * 3));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geo, mat));
  const pmrem = new THREE.PMREMGenerator(gl);
  const env = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  geo.dispose();
  mat.dispose();
  return env;
}

/** Caps each tower so the descent always passes at least 25 m above and beside it. */
function clearanceHeight() {
  const samples = descentPath.getSpacedPoints(240);
  return (t: Tower) => {
    let h = t.h;
    const reach = Math.max(t.w, t.d) / 2 + 30;
    samples.forEach((p) => {
      if (Math.abs(p.x - t.x) < reach && Math.abs(p.z - t.z) < reach) h = Math.min(h, p.y - 25);
    });
    return Math.max(30, h);
  };
}

/** Pine-like crown: three stacked canopy tiers */
function tieredCrown(): THREE.BufferGeometry {
  const tiers = [
    [3, 4.4, 0.62],
    [2.35, 6.3, 0.7],
    [1.55, 7.9, 0.85],
  ].map(([r, y, squash]) => new THREE.IcosahedronGeometry(r, 0).scale(1, squash, 1).translate(0, y, 0));
  const merged = mergeGeometries(tiers);
  tiers.forEach((t) => t.dispose());
  return merged;
}

interface BeijingMaquetteProps {
  lowTier: boolean;
  reduced: boolean;
}

export function BeijingMaquette({ lowTier, reduced }: BeijingMaquetteProps) {
  const gl = useThree((s) => s.gl);
  const anisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());

  const assets = useMemo(() => {
    const ground = groundTexture(lowTier ? 2048 : 4096);
    ground.anisotropy = anisotropy;
    const tiles = roofTileTexture();
    tiles.anisotropy = anisotropy;
    const curtain = curtainWallTextures();
    curtain.map.anisotropy = anisotropy;
    const glow = ribbonGlowTexture();
    const env = skyReflections(gl);

    const pavilion = buildPavilion();
    const imperial = buildImperial();
    const towers = buildTowers(TOWERS, clearanceHeight());
    const water = moatWater();

    const groundGeo = new THREE.PlaneGeometry(WORLD, WORLD).rotateX(-Math.PI / 2);
    const outskirtsGeo = new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2).translate(0, -0.1, 0);

    const materials = {
      ground: new THREE.MeshStandardMaterial({ map: ground, roughness: 0.96 }),
      outskirts: new THREE.MeshStandardMaterial({ color: "#a9bd93", roughness: 1 }),
      water: new THREE.MeshPhysicalMaterial({
        color: "#5d8e9e", roughness: 0.12, metalness: 0.1, clearcoat: 0.9, clearcoatRoughness: 0.08,
        envMap: env, envMapIntensity: 1.1,
      }),
      roofs: new THREE.MeshStandardMaterial({ map: tiles, vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }),
      stone: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 }),
      marble: new THREE.MeshStandardMaterial({ color: "#eee8df", roughness: 0.55 }),
      lacquer: new THREE.MeshStandardMaterial({ color: "#9a3b2b", roughness: 0.55 }),
      rock: new THREE.MeshStandardMaterial({ color: "#9c968d", roughness: 0.95, flatShading: true }),
      pavilionWhite: new THREE.MeshStandardMaterial({ vertexColors: true, color: "#f6f3ef", roughness: 0.32, metalness: 0.04 }),
      pavilionGlass: new THREE.MeshPhysicalMaterial({
        color: "#3a434d", roughness: 0.15, metalness: 0.2, envMap: env, envMapIntensity: 1,
        emissive: "#ffc68a", emissiveMap: glow, emissiveIntensity: 0.12,
      }),
      towerGlass: new THREE.MeshPhysicalMaterial({
        map: curtain.map, color: "#58636f", roughness: 0.15, metalness: 0.2, envMap: env, envMapIntensity: 1.2,
        emissive: "#ffd29a", emissiveMap: curtain.lit, emissiveIntensity: 0,
      }),
      towerFrame: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.35 }),
      trunk: new THREE.MeshStandardMaterial({ color: "#6e5548", roughness: 1 }),
      crown: new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }),
      car: new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.2 }),
    };
    glow.wrapS = THREE.RepeatWrapping;

    // Colonnade pillars and courtyard rocks, instanced
    const dummy = new THREE.Object3D();
    const columnGeo = new THREE.CylinderGeometry(1, 1, 1, 10).translate(0, 0.5, 0);
    const columns = new THREE.InstancedMesh(columnGeo, materials.lacquer, imperial.columns.length);
    imperial.columns.forEach((c, k) => {
      dummy.position.set(c.x, c.y, c.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(c.r, c.h, c.r);
      dummy.updateMatrix();
      columns.setMatrixAt(k, dummy.matrix);
    });
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rocks = new THREE.InstancedMesh(rockGeo, materials.rock, imperial.rocks.length);
    imperial.rocks.forEach(([x, y, z], k) => {
      dummy.position.set(x, y * 0.5, z);
      dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      dummy.scale.set(y, y * (0.8 + rand() * 0.8), y);
      dummy.updateMatrix();
      rocks.setMatrixAt(k, dummy.matrix);
    });

    // Trees: tiered canopies in several greens
    const spots = treeSpots(lowTier ? 420 : 950);
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 3.6, 6).translate(0, 1.8, 0);
    const crownGeo = tieredCrown();
    const trunks = new THREE.InstancedMesh(trunkGeo, materials.trunk, spots.length);
    const crowns = new THREE.InstancedMesh(crownGeo, materials.crown, spots.length);
    const greens = ["#5f7f55", "#6f8f5f", "#577a52", "#7f9f68", "#4f6f4c"].map((c) => new THREE.Color(c));
    spots.forEach(([x, z, s], k) => {
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.scale.set(s * (0.9 + rand() * 0.25), s, s * (0.9 + rand() * 0.25));
      dummy.updateMatrix();
      trunks.setMatrixAt(k, dummy.matrix);
      crowns.setMatrixAt(k, dummy.matrix);
      crowns.setColorAt(k, greens[k % greens.length]);
    });

    // Traffic on closed loops; every loop is driven in its lane, so no offset is needed
    const loops = CAR_LOOPS.map(
      (pts) => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "centripetal")
    );
    loops.forEach((l) => (l.arcLengthDivisions = 600));
    const carCount = lowTier ? 24 : 54;
    const carGeo = new THREE.BoxGeometry(2, 1.3, 4.3).translate(0, 0.85, 0);
    const busGeo = new THREE.BoxGeometry(2.5, 2.8, 11).translate(0, 1.6, 0);
    const cars = new THREE.InstancedMesh(carGeo, materials.car, carCount);
    const buses = new THREE.InstancedMesh(busGeo, materials.car, 4);
    const carColors = ["#fbf6f3", "#230a18", "#b16692", "#d8d2cc", "#8a8790", "#2c2a29", "#b85d43"].map((c) => new THREE.Color(c));
    const movers = [
      ...Array.from({ length: carCount }, (_, k) => {
        cars.setColorAt(k, carColors[k % carColors.length]);
        return { mesh: cars, index: k, loop: loops[k % loops.length], t: rand(), speed: 10 + rand() * 6 };
      }),
      ...[0, 1, 2, 3].map((k) => {
        buses.setColorAt(k, new THREE.Color(k % 2 ? "#b16692" : "#f2ece4"));
        return { mesh: buses, index: k, loop: loops[k % loops.length], t: k / 4 + 0.1, speed: 7 };
      }),
    ];
    const loopLengths = new Map(loops.map((l) => [l, l.getLength()]));

    return {
      textures: [ground, tiles, curtain.map, curtain.lit, glow, env],
      geometries: [
        pavilion.white, pavilion.glass, imperial.roofs, imperial.stone, imperial.bridges, towers.glass, towers.frame,
        water, groundGeo, outskirtsGeo, columnGeo, rockGeo, trunkGeo, crownGeo, carGeo, busGeo,
      ],
      pavilion, imperial, towers, water, groundGeo, outskirtsGeo, materials,
      columns, rocks, trunks, crowns, cars, buses, movers, loopLengths, dummy,
    };
  }, [lowTier, anisotropy, gl]);

  // Dispose everything this component created when it unmounts
  useEffect(
    () => () => {
      assets.textures.forEach((t) => t.dispose());
      assets.geometries.forEach((g) => g.dispose());
      Object.values(assets.materials).forEach((m) => m.dispose());
      [assets.columns, assets.rocks, assets.trunks, assets.crowns, assets.cars, assets.buses].forEach((m) => m.dispose());
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
      dummy.position.set(point.x, 0, point.z);
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
    assets.materials.towerGlass.emissiveIntensity = lit * 0.75;
    assets.materials.pavilionGlass.emissiveIntensity = 0.12 + lit * 0.85;
    if (!reduced) placeMovers(Math.min(delta, 0.05));
  });

  const { materials: m, pavilion, imperial, towers } = assets;
  const cast = !lowTier;
  return (
    <group>
      <mesh geometry={assets.outskirtsGeo} material={m.outskirts} receiveShadow />
      <mesh geometry={assets.groundGeo} material={m.ground} receiveShadow />
      <mesh geometry={assets.water} material={m.water} receiveShadow />
      <mesh geometry={pavilion.white} material={m.pavilionWhite} castShadow={cast} receiveShadow />
      <mesh geometry={pavilion.glass} material={m.pavilionGlass} castShadow={cast} receiveShadow />
      <mesh geometry={imperial.roofs} material={m.roofs} castShadow={cast} receiveShadow />
      <mesh geometry={imperial.stone} material={m.stone} castShadow={cast} receiveShadow />
      <mesh geometry={imperial.bridges} material={m.marble} castShadow={cast} receiveShadow />
      <mesh geometry={towers.glass} material={m.towerGlass} castShadow={cast} receiveShadow />
      <mesh geometry={towers.frame} material={m.towerFrame} castShadow={cast} receiveShadow />
      <primitive object={assets.columns} castShadow={cast} receiveShadow />
      <primitive object={assets.rocks} castShadow={cast} receiveShadow />
      <primitive object={assets.trunks} castShadow={cast} receiveShadow />
      <primitive object={assets.crowns} castShadow={cast} receiveShadow />
      <primitive object={assets.cars} castShadow={cast} />
      <primitive object={assets.buses} castShadow={cast} />
    </group>
  );
}
