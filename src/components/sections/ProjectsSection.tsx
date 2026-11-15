import { useState } from "react";
import { profile, projectFilters, projects } from "../../data/portfolio";
import { SectionHeader } from "../ui/SectionHeader";
import { ProjectVisual } from "../ui/ProjectVisual";
import { Emphasize } from "../ui/Emphasize";

type FilterId = (typeof projectFilters)[number]["id"];

export function ProjectsSection() {
  const [filter, setFilter] = useState<FilterId>("all");
  const visible = projects.filter((p) => filter === "all" || p.category === filter);

  return (
    <section className="section" id="projects" aria-labelledby="projectsTitle">
      <div className="section__inner">
        <SectionHeader
          kicker="[02] Selected Projects"
          title="Things I've built."
          titleId="projectsTitle"
          action={{ label: "See my GitHub ↗", href: profile.github, external: true }}
        />

        <div className="filters" role="group" aria-label="Filter projects" data-reveal>
          {projectFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              className="filter"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="visually-hidden" aria-live="polite">
          Showing {visible.length} {visible.length === 1 ? "project" : "projects"}
        </p>

        <div className="projects">
          {visible.map((p) => (
            <article key={p.id} className={`card card--${p.visual}`}>
              <div className={`card__visual card__visual--${p.visual}`}>
                <span className="badge badge--sheet">{p.sheet}</span>
                <span className={`badge ${p.category === "upcoming" ? "badge--outline" : "badge--plum"}`}>{p.tech}</span>
                <ProjectVisual project={p} />
              </div>
              <h3 className="card__title">{p.title}</h3>
              <p className="card__desc"><Emphasize text={p.description} words={p.emphasis} /></p>
              {p.links.length > 0 && (
                <p className="card__links">
                  {p.links.map((l) => (
                    <a
                      key={l.href}
                      className="link"
                      href={l.href}
                      {...(l.external ? { target: "_blank", rel: "noopener" } : {})}
                    >
                      {l.label}
                    </a>
                  ))}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
