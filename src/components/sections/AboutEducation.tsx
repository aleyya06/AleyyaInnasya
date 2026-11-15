import { about, awards, education, profile } from "../../data/portfolio";
import { SectionHeader } from "../ui/SectionHeader";

export function AboutEducation() {
  return (
    <section className="section" id="about" aria-labelledby="aboutTitle">
      <div className="section__inner">
        <SectionHeader
          kicker="[01] About & Education"
          title={about.headline}
          titleId="aboutTitle"
          action={{ label: "View LinkedIn profile ↗", href: profile.linkedin, external: true }}
        />
        <div className="about" data-reveal>
          <div className="about__bio">
            <p className="about__lead">{about.lead}</p>
            <p>{about.body}</p>
          </div>
          <div className="about__side" id="education">
            <div className="edu">
              <span className="badge badge--rose">{education.period}</span>
              <h3 className="edu__school">{education.school}</h3>
              <p className="edu__degree">{education.degree}</p>
              <p className="edu__role">{education.focus}</p>
            </div>
            <div className="awards">
              <h3 className="minor-title">Awards</h3>
              {awards.map((a) => (
                <div className="award" key={a.title}>
                  <span className="award__name">{a.title}</span>
                  <span className="award__year">{a.year}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
