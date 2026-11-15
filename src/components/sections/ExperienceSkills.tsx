import { useCallback, useState } from "react";
import { certificates, experience, skillGroups } from "../../data/portfolio";
import { SectionHeader } from "../ui/SectionHeader";
import { CertLightbox, type LightboxImage } from "../ui/CertLightbox";

export function ExperienceSkills() {
  // The first row starts open so the section never looks empty.
  const [openRows, setOpenRows] = useState<Set<string>>(() => new Set([experience[0].id]));
  const [preview, setPreview] = useState<LightboxImage | null>(null);
  const closePreview = useCallback(() => setPreview(null), []);

  const toggle = (id: string) =>
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  return (
    <section className="section" id="experience" aria-labelledby="experienceTitle">
      <div className="section__inner">
        <SectionHeader kicker="[03] Experience & Skills" title="Where I've contributed." titleId="experienceTitle" />

        <div className="rows" data-reveal>
          {experience.map((exp) => {
            const open = openRows.has(exp.id);
            return (
              <div className="row" key={exp.id}>
                <h3 className="row__head">
                  <button
                    className="row__btn"
                    type="button"
                    id={`${exp.id}-btn`}
                    aria-expanded={open}
                    aria-controls={exp.id}
                    onClick={() => toggle(exp.id)}
                  >
                    <span className="row__period">{exp.period}</span>
                    <span className="row__title">{exp.role}</span>
                    <span className="row__org">{exp.org}</span>
                    <span className="row__icon" aria-hidden="true" />
                  </button>
                </h3>
                <div className={`row__panel${open ? " is-open" : ""}`} id={exp.id} role="region" aria-labelledby={`${exp.id}-btn`}>
                  <div className="row__inner">
                    <ul className="row__points">
                      {exp.points.map((pt) => <li key={pt}>{pt}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="skills" id="skills">
          <h3 className="skills__title" data-reveal>Data &amp; Programming</h3>
          <div className="skillrows" data-reveal>
            {skillGroups.map((g) => (
              <div className="skillrow" key={g.name}>
                <h4 className="skillrow__name">{g.name}</h4>
                <ul className="pills-list">
                  {g.skills.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <h3 className="minor-title" id="achievements">Certifications</h3>
          <div className="certs" data-reveal>
            {certificates.map((c) => (
              <figure className="cert" key={c.name}>
                <button
                  className="cert__frame"
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => setPreview({ src: c.image, alt: c.alt })}
                >
                  <img src={c.image} alt={c.alt} loading="lazy" />
                </button>
                <figcaption className="cert__body">
                  <span className="cert__name">{c.name}</span>
                  <span className="cert__meta">{c.issuer} · {c.date}</span>
                  <a className="cert__verify link" href={c.verifyUrl} target="_blank" rel="noopener">Verify certificate ↗</a>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
      <CertLightbox image={preview} onClose={closePreview} />
    </section>
  );
}
