import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { nav } from "./data/portfolio";
import { startScrollTracking } from "./lib/scrollProgress";
import { useActiveSection, useRevealOnScroll } from "./hooks/usePageEffects";
import { PillNav } from "./components/hud/PillNav";
import { HeroSheet } from "./components/hud/HeroSheet";
import { ProfileCard } from "./components/hud/ProfileCard";
import { AboutEducation } from "./components/sections/AboutEducation";
import { ProjectsSection } from "./components/sections/ProjectsSection";
import { ExperienceSkills } from "./components/sections/ExperienceSkills";
import { ContactFooter } from "./components/sections/ContactFooter";

// Three.js is the heaviest dependency, so the scene loads after the page content is on screen.
const CityScene = lazy(() => import("./components/three/CityScene"));

const SECTION_IDS = ["hero", "about", "projects", "experience", "skills", "contact"];

export function App() {
  const flightRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const siteTagRef = useRef<HTMLSpanElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const openProfile = useCallback(() => setProfileOpen(true), []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);

  useEffect(() => {
    if (flightRef.current && contentRef.current) return startScrollTracking(flightRef.current, contentRef.current);
  }, []);
  useRevealOnScroll();
  const active = useActiveSection(SECTION_IDS);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      {/* Keyboard route to the profile card that the 3D "A" opens on click */}
      <button className="skip-link skip-link--profile" type="button" onClick={openProfile}>
        Open profile card
      </button>

      <div className="stage" aria-hidden="true">
        <Suspense fallback={null}>
          <CityScene siteTag={siteTagRef} onSelectA={openProfile} />
        </Suspense>
        <span className="stage__tag" ref={siteTagRef}>Site</span>
      </div>

      <PillNav items={nav} activeId={active} homeHref="#hero" />

      <main id="main">
        <section className="flight" id="hero" ref={flightRef} aria-labelledby="heroTitle">
          <HeroSheet />
        </section>
        <div className="content" id="content" ref={contentRef}>
          <AboutEducation />
          <ProjectsSection />
          <ExperienceSkills />
          <ContactFooter />
        </div>
      </main>

      <ProfileCard open={profileOpen} onClose={closeProfile} />
    </>
  );
}
