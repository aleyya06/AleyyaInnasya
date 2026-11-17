import { useEffect, useRef } from "react";
import { profile } from "../../data/portfolio";
import { onScrollUpdate } from "../../lib/scrollProgress";

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** Drafting sheet pinned bottom-left during the flight. Fully visible for the first quarter
 *  of the descent, gone by about two thirds; the fade is written straight to the DOM. */
export function HeroSheet() {
  const ref = useRef<HTMLElement>(null);

  useEffect(
    () =>
      onScrollUpdate(({ descent }) => {
        const el = ref.current;
        if (!el) return;
        const o = 1 - clamp((descent - 0.25) / 0.38);
        el.style.setProperty("--hero-o", o.toFixed(3));
        const gone = o <= 0.001;
        el.classList.toggle("is-gone", gone);
        el.inert = gone;
      }),
    []
  );

  return (
    <article className="sheet sheet--hero" ref={ref}>
      <div className="sheet__meta">
        <span>Sheet 00 · Beijing Axis · 1:5000</span>
        <span className="sheet__site">• Site — Central Plaza</span>
      </div>
      <div className="sheet__body">
        <h1 className="hero__title" id="heroTitle">
          <span className="hero__line">{profile.firstLine}</span>
          <span className="hero__line hero__line--rose">{profile.secondLine}</span>
        </h1>
        <p className="hero__lede">{profile.tagline}</p>
        <p className="hero__links">
          <a className="link" href={profile.linkedin} target="_blank" rel="noopener">LinkedIn ↗</a>
          <a className="link" href={`mailto:${profile.email}`}>{profile.email}</a>
        </p>
      </div>
      <div className="sheet__foot">
        <span className="scalebar">
          <svg className="scalebar__bar" viewBox="0 0 160 8" aria-hidden="true" focusable="false">
            <rect x="0.5" y="0.5" width="40" height="7" className="is-filled" />
            <rect x="40.5" y="0.5" width="40" height="7" />
            <rect x="80.5" y="0.5" width="79" height="7" className="is-filled" />
          </svg>
          <span className="scalebar__labels" aria-hidden="true">
            <span>0</span><span>50</span><span>100</span><span>200 M</span>
          </span>
        </span>
        <span className="hero__cue">Scroll to land on site ↓</span>
      </div>
    </article>
  );
}
