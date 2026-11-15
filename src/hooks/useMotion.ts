import { useEffect, useState } from "react";

const query = "(prefers-reduced-motion: reduce)";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export const finePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/** Phones, small screens and low-core machines get a lighter 3D scene. */
export const isLowTier = () =>
  !finePointer() || Math.min(innerWidth, innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;
