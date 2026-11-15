import { useEffect, useRef } from "react";
import type { Project } from "../../data/portfolio";
import { finePointer } from "../../hooks/useMotion";

/** Snake moving round a grid board. Runs on hover; touch screens get one lap when it scrolls into view. */
function SnakeBoard() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || finePointer() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let lap: number | undefined;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          el.classList.add("is-playing");
          window.clearTimeout(lap);
          lap = window.setTimeout(() => el.classList.remove("is-playing"), 6000);
        }),
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(lap);
    };
  }, []);

  return (
    <div className="snake" ref={ref} aria-hidden="true">
      <span className="snake__food" />
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="snake__seg" style={{ ["--i" as string]: i }} />
      ))}
    </div>
  );
}

/** The card's preview: frames around the real logos, never an invented screenshot. */
export function ProjectVisual({ project }: { project: Project }) {
  switch (project.visual) {
    case "phone":
      return (
        <div className="phone" aria-hidden="true">
          <span className="phone__notch" />
          {project.image && <img src={project.image} alt="" className="phone__icon" width={320} height={320} loading="lazy" />}
          <span className="phone__name">{project.imageCaption}</span>
        </div>
      );
    case "browser":
      return (
        <div className="browser" aria-hidden="true">
          <span className="browser__bar">
            <i /><i /><i />
            <span className="browser__url">{project.imageCaption}</span>
          </span>
          {project.image && <img src={project.image} alt="" className="browser__logo" loading="lazy" />}
        </div>
      );
    case "snake":
      return <SnakeBoard />;
    case "soon":
      return <span className="card__tilde" aria-hidden="true">~</span>;
  }
}
