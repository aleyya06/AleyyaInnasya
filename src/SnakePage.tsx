import { nav, profile, snakeDeck } from "./data/portfolio";
import { useRevealOnScroll } from "./hooks/usePageEffects";
import { PillNav } from "./components/hud/PillNav";
import { Emphasize } from "./components/ui/Emphasize";

/** /projects/snake-game.html: the full description and the embedded presentation deck. */
export function SnakePage() {
  useRevealOnScroll();
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <PillNav items={nav} activeId={null} base="/" homeHref="/" />
      <main id="main">
        <section className="section">
          <div className="section__inner">
            <a className="page__back" href="/#projects"><span aria-hidden="true">←</span> Back to all projects</a>
            <p className="kicker" data-reveal><span>[02] Selected Projects · Sheet P-03</span></p>
            <div className="section__head" data-reveal>
              <h1 className="section__title">{snakeDeck.title}</h1>
              <span className="badge badge--plum">{snakeDeck.tech}</span>
            </div>
            <p className="page__meta" data-reveal>
              <Emphasize text={snakeDeck.description} words={snakeDeck.emphasis} />
            </p>
            <div className="deck" data-reveal>
              <embed src={snakeDeck.pdf} type="application/pdf" />
            </div>
            <p className="deck__fallback">
              Can't view the deck? <a className="link" href={snakeDeck.pdf} download>Download the PDF</a>
            </p>
          </div>
        </section>
        <section className="section section--plum">
          <div className="section__inner">
            <footer className="footer">
              <span>© 2026 {profile.fullName}</span>
              <a className="link" href="/">Back to home ↑</a>
            </footer>
          </div>
        </section>
      </main>
    </>
  );
}
