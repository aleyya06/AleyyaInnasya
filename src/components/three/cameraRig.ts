import * as THREE from "three";
import { SCULPTURE_AT } from "./campusLayout";

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Smoothed values every scene module reads in its own useFrame. Written only by the camera rig. */
export const sceneState = {
  descent: 0,
  orbit: 0,
  /** 0 = morning daylight, 1 = golden hour */
  golden: 0,
  pointerX: 0,
  pointerY: 0,
};

// A curved descent: high over the south-west lake, swinging in toward the plaza.
const descentPath = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-60, 560, 340),
    new THREE.Vector3(-190, 360, 330),
    new THREE.Vector3(-245, 170, 235),
    new THREE.Vector3(-145, 62, 124),
    new THREE.Vector3(-42, 17, 64),
    new THREE.Vector3(0, 6.6, 38),
  ],
  false,
  "centripetal"
);

const LANDING = new THREE.Vector3(...SCULPTURE_AT).setY(6);
const orbitCentre = new THREE.Vector3(SCULPTURE_AT[0], 0, SCULPTURE_AT[2]);
const ORBIT_R = 32;

const lookFrom = new THREE.Vector3();
const look = new THREE.Vector3();
const orbitPos = new THREE.Vector3();
const right = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** Where the opening shot aims: left of the site on wide screens (the hero sheet sits
 *  bottom-left), in front of it on portrait phones (the sheet covers the bottom half). */
function aimOpening(aspect: number) {
  const wide = clamp((aspect - 0.75) / 0.85);
  lookFrom.set(-110 * wide, 0, THREE.MathUtils.lerp(90, 0, wide));
}

export function placeCamera(camera: THREE.PerspectiveCamera, descent: number, orbit: number, px: number, py: number) {
  aimOpening(camera.aspect);
  const e = ease(descent);
  const pos = camera.position.copy(descentPath.getPointAt(e));
  look.lerpVectors(lookFrom, LANDING, ease(clamp((descent - 0.15) / 0.85)));

  // The orbit only takes over once the descent has landed, so jumping from the top
  // (a nav link, say) plays as a quick fly-down instead of a cut to the ground.
  const landed = clamp((descent - 0.97) / 0.03);
  if (orbit > 0 && landed > 0) {
    const a = orbit * Math.PI * 1.1;
    orbitPos.set(Math.sin(a) * ORBIT_R, 6.6 + orbit * 8, Math.cos(a) * ORBIT_R).add(orbitCentre);
    pos.lerp(orbitPos, landed);
  }

  // Parallax: lean a little toward the pointer, more from the air than on the ground
  right.subVectors(look, pos).normalize().cross(UP).normalize();
  const reach = THREE.MathUtils.lerp(10, 2, e);
  pos.addScaledVector(right, px * reach).addScaledVector(UP, -py * reach * 0.55);
  camera.lookAt(look);
}

/** Point in the air above the sculpture where the "• SITE" tag is pinned */
export const SITE_TAG_AT = new THREE.Vector3(SCULPTURE_AT[0], 16, SCULPTURE_AT[2]);
