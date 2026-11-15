import { Component, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { onCoverChange, scrollState } from "../../lib/scrollProgress";
import { isLowTier, useReducedMotion } from "../../hooks/useMotion";
import { CampusMaquette } from "./CampusMaquette";
import { SculptureA } from "./SculptureA";
import { SITE_TAG_AT, placeCamera, sceneState, smoothstep } from "./cameraRig";

const root = document.documentElement;

/** Smooths the scroll and pointer values, moves the camera, and pins the "• SITE" tag. Runs first. */
function CameraRig({ reduced, siteTag }: { reduced: boolean; siteTag: RefObject<HTMLElement | null> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const projected = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    sceneState.descent = scrollState.descent;
    sceneState.orbit = scrollState.orbit;
  }, []);

  // Reduced motion: one still frame of the landed site at golden hour, redrawn only on resize
  useEffect(() => {
    if (!reduced) return;
    Object.assign(sceneState, { descent: 0.82, orbit: 0, golden: 1, pointerX: 0, pointerY: 0 });
    placeCamera(camera, 0.82, 0, 0, 0);
    invalidate();
  }, [reduced, camera, size, invalidate]);

  useFrame((_, delta) => {
    if (!reduced) {
      const k = 1 - Math.exp(-Math.min(delta, 0.05) * 4.5);
      sceneState.descent += (scrollState.descent - sceneState.descent) * k;
      sceneState.orbit += (scrollState.orbit - sceneState.orbit) * k;
      sceneState.pointerX += (scrollState.pointerX - sceneState.pointerX) * k;
      sceneState.pointerY += (scrollState.pointerY - sceneState.pointerY) * k;
      sceneState.golden = smoothstep(0.05, 1, sceneState.descent);
      placeCamera(camera, sceneState.descent, sceneState.orbit, sceneState.pointerX, sceneState.pointerY);
    }

    const tag = siteTag.current;
    if (!tag) return;
    projected.copy(SITE_TAG_AT).project(camera);
    const visible = 1 - smoothstep(0.62, 0.9, sceneState.descent);
    if (projected.z > 1 || visible <= 0) {
      tag.style.opacity = "0";
      return;
    }
    tag.style.opacity = visible.toFixed(3);
    tag.style.transform = `translate(${((projected.x + 1) / 2) * size.width}px, ${((1 - projected.y) / 2) * size.height}px)`;
  });
  return null;
}

const SKY = [new THREE.Color("#d7e6ee"), new THREE.Color("#f6c29f")];
const SUN = [new THREE.Color("#fff4e6"), new THREE.Color("#e89b6b")];
const HEMI_SKY = [new THREE.Color("#eaf1f4"), new THREE.Color("#f6c29f")];
const HEMI_GROUND = [new THREE.Color("#b9c2a4"), new THREE.Color("#6a4352")];
const SUN_DIR = [new THREE.Vector3(0.35, 1, 0.45).normalize(), new THREE.Vector3(-0.72, 0.26, 0.64).normalize()];

/** Morning daylight at altitude turning into golden hour as the camera lands. */
function Atmosphere({ lowTier }: { lowTier: boolean }) {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const fog = useMemo(() => new THREE.FogExp2("#d7e6ee", 0.0006), []);
  const background = useMemo(() => new THREE.Color("#d7e6ee"), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    scene.fog = fog;
    scene.background = background;
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene, fog, background]);

  useFrame(() => {
    const g = sceneState.golden;
    background.lerpColors(SKY[0], SKY[1], g);
    fog.color.copy(background);
    fog.density = THREE.MathUtils.lerp(0.0006, 0.0032, g);
    gl.toneMappingExposure = THREE.MathUtils.lerp(1, 1.06, g);
    const s = sun.current;
    if (s) {
      s.color.lerpColors(SUN[0], SUN[1], g);
      s.intensity = THREE.MathUtils.lerp(2.6, 2.15, g);
      dir.lerpVectors(SUN_DIR[0], SUN_DIR[1], g).normalize();
      s.position.copy(dir).multiplyScalar(420);
      const half = THREE.MathUtils.lerp(330, 90, g);
      const cam = s.shadow.camera;
      cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
      cam.updateProjectionMatrix();
    }
    const h = hemi.current;
    if (h) {
      h.color.lerpColors(HEMI_SKY[0], HEMI_SKY[1], g);
      h.groundColor.lerpColors(HEMI_GROUND[0], HEMI_GROUND[1], g);
      h.intensity = THREE.MathUtils.lerp(1.1, 0.72, g);
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={["#eaf1f4", "#b9c2a4", 1.1]} />
      <directionalLight
        ref={sun}
        castShadow={!lowTier}
        intensity={2.6}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.5}
        shadow-camera-near={10}
        shadow-camera-far={1300}
      />
    </>
  );
}

/** The canvas never takes pointer events (so it can't block scrolling); instead clicks and
 *  hovers on the page are ray-cast against the "A" while the 3D scene is showing. */
function AInteraction({ target, onSelect }: { target: RefObject<THREE.Mesh | null>; onSelect: () => void }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const ignore = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest("a, button, input, textarea, label, .sheet, .pills, .profile, .content");
    const hits = (e: MouseEvent) => {
      if (scrollState.covered || !target.current) return false;
      ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObject(target.current, false).length > 0;
    };
    let raf = 0;
    let last: PointerEvent | null = null;
    const onMove = (e: PointerEvent) => {
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        root.classList.toggle("is-over-a", !!last && !ignore(last.target) && hits(last));
      });
    };
    const onClick = (e: MouseEvent) => {
      if (!ignore(e.target) && hits(e)) onSelect();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove("is-over-a");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("click", onClick);
    };
  }, [camera, target, onSelect]);
  return null;
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    // No WebGL (old device, disabled GPU): the page keeps its painted sky instead.
    root.classList.add("no-webgl");
    console.warn("3D scene unavailable:", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface CitySceneProps {
  siteTag: RefObject<HTMLElement | null>;
  onSelectA: () => void;
}

export default function CityScene({ siteTag, onSelectA }: CitySceneProps) {
  const reduced = useReducedMotion();
  const lowTier = useMemo(isLowTier, []);
  const [covered, setCovered] = useState(scrollState.covered);
  const aRef = useRef<THREE.Mesh>(null);

  useEffect(() => onCoverChange(setCovered), []);

  // Nothing to draw once the solid page covers the canvas
  const frameloop = reduced ? "demand" : covered ? "never" : "always";

  return (
    <SceneBoundary>
      <Canvas
        className="stage__canvas"
        frameloop={frameloop}
        dpr={lowTier ? 1 : [1, 2]}
        shadows={lowTier ? false : "percentage"}
        gl={{ antialias: !lowTier, powerPreference: "high-performance" }}
        camera={{ fov: 45, near: 0.5, far: 2800, position: [-60, 560, 340] }}
        onCreated={() => root.classList.add("has-scene")}
      >
        <CameraRig reduced={reduced} siteTag={siteTag} />
        <Atmosphere lowTier={lowTier} />
        <CampusMaquette lowTier={lowTier} reduced={reduced} />
        <SculptureA ref={aRef} reduced={reduced} lowTier={lowTier} />
        <AInteraction target={aRef} onSelect={onSelectA} />
      </Canvas>
    </SceneBoundary>
  );
}
