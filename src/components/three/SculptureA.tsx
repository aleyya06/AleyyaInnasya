import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SCULPTURE_AT } from "./beijingLayout";
import { sceneState } from "./cameraRig";

/** Outer "A" contour (legs, flat apex, crossbar notch) with a triangular counter cut out of it. */
function letterAGeometry(): THREE.ExtrudeGeometry {
  const outer = new THREE.Shape();
  outer.moveTo(-2.6, 0);
  outer.lineTo(-0.7, 6);
  outer.lineTo(0.7, 6);
  outer.lineTo(2.6, 0);
  outer.lineTo(1.5, 0);
  outer.lineTo(1.05, 1.5);
  outer.lineTo(-1.05, 1.5);
  outer.lineTo(-1.5, 0);
  outer.closePath();

  // The counter's sides run parallel to the inner edges of the legs
  const counter = new THREE.Path();
  counter.moveTo(-0.78, 2.4);
  counter.lineTo(0.78, 2.4);
  counter.lineTo(0, 5);
  counter.closePath();
  outer.holes.push(counter);

  const geometry = new THREE.ExtrudeGeometry(outer, {
    depth: 0.35,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 4,
  });
  geometry.center();
  return geometry;
}

interface SculptureAProps {
  reduced: boolean;
  lowTier: boolean;
}

/** The plaza centrepiece: a beveled "A" on a stone pedestal, turning slowly and hovering. */
export const SculptureA = forwardRef<THREE.Mesh, SculptureAProps>(function SculptureA({ reduced, lowTier }, ref) {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(letterAGeometry, []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#F3B8DC",
        emissive: "#B16692",
        emissiveIntensity: 0.12,
        roughness: 0.25,
        metalness: 0.15,
      }),
    []
  );
  const pedestal = useMemo(() => new THREE.CylinderGeometry(3.1, 3.5, 1.3, 48), []);
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ color: "#efe6de", roughness: 0.9 }), []);
  const ringGeo = useMemo(() => new THREE.RingGeometry(17.2, 17.9, 128), []);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#B16692", transparent: true, opacity: 0.85 }), []);

  useEffect(
    () => () => {
      [geometry, pedestal, ringGeo].forEach((g) => g.dispose());
      [material, stone, ringMat].forEach((m) => m.dispose());
    },
    [geometry, material, pedestal, stone, ringGeo, ringMat]
  );

  const [x, y, z] = SCULPTURE_AT;
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    material.emissiveIntensity = THREE.MathUtils.lerp(0.12, 0.55, sceneState.golden);
    if (reduced) return;
    const t = state.clock.elapsedTime;
    g.rotation.y = t * 0.35;
    g.position.y = y + Math.sin(t * 1.2) * 0.25;
  });

  return (
    <group>
      <group ref={group} position={[x, y, z]} scale={1.5}>
        <mesh ref={ref} geometry={geometry} material={material} castShadow={!lowTier} />
      </group>
      <mesh geometry={pedestal} material={stone} position={[x, 0.65, z]} receiveShadow castShadow={!lowTier} />
      <mesh geometry={ringGeo} material={ringMat} position={[x, 0.08, z]} rotation-x={-Math.PI / 2} />
      <pointLight color="#e8a2c8" intensity={40} distance={60} decay={1.6} position={[x, y, z + 4]} />
    </group>
  );
});
