// Scroll state shared with the 3D scene and the hero sheet. It is a plain mutable object:
// one listener writes it, useFrame and DOM refs read it, so scrolling never re-renders React.

export interface ScrollState {
  /** 0 at the top, 1 when the camera has landed (end of the #hero flight section) */
  descent: number;
  /** 0 at landing, 1 at the bottom of the page */
  orbit: number;
  /** True once the solid content page covers the whole viewport */
  covered: boolean;
  /** Pointer position from -1 to 1, used for parallax */
  pointerX: number;
  pointerY: number;
}

export const scrollState: ScrollState = { descent: 0, orbit: 0, covered: false, pointerX: 0, pointerY: 0 };

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

type Listener = (state: ScrollState) => void;
const scrollListeners = new Set<Listener>();
const coverListeners = new Set<(covered: boolean) => void>();

/** Called on every (rAF-batched) scroll update, for DOM-only effects like the hero fade. */
export function onScrollUpdate(fn: Listener): () => void {
  scrollListeners.add(fn);
  fn(scrollState);
  return () => scrollListeners.delete(fn);
}

/** Called only when the content page starts or stops covering the canvas. */
export function onCoverChange(fn: (covered: boolean) => void): () => void {
  coverListeners.add(fn);
  return () => coverListeners.delete(fn);
}

export function startScrollTracking(flight: HTMLElement, content: HTMLElement): () => void {
  let land = 1;
  let max = 2;
  let queued = false;

  const measure = () => {
    land = Math.max(1, flight.offsetTop + flight.offsetHeight - innerHeight);
    max = Math.max(land + 1, document.documentElement.scrollHeight - innerHeight);
  };

  const update = () => {
    queued = false;
    const y = scrollY;
    scrollState.descent = clamp(y / land);
    scrollState.orbit = clamp((y - land) / (max - land));
    const covered = content.getBoundingClientRect().top <= 0;
    if (covered !== scrollState.covered) {
      scrollState.covered = covered;
      coverListeners.forEach((fn) => fn(covered));
    }
    scrollListeners.forEach((fn) => fn(scrollState));
  };

  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };
  const onResize = () => { measure(); queue(); };
  const onPointer = (e: PointerEvent) => {
    scrollState.pointerX = (e.clientX / innerWidth - 0.5) * 2;
    scrollState.pointerY = (e.clientY / innerHeight - 0.5) * 2;
  };

  measure();
  update();
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("pointermove", onPointer, { passive: true });
  const ro = new ResizeObserver(onResize);
  ro.observe(document.body);

  return () => {
    window.removeEventListener("scroll", queue);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onPointer);
    ro.disconnect();
  };
}
