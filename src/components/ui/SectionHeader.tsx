import type { ReactNode } from "react";
import type { Link } from "../../data/portfolio";

interface SectionHeaderProps {
  kicker: string;
  title: ReactNode;
  titleId: string;
  action?: Link;
}

/** Mono kicker with a rule, then a bold statement headline and an optional right-aligned link. */
export function SectionHeader({ kicker, title, titleId, action }: SectionHeaderProps) {
  return (
    <>
      <p className="kicker" data-reveal><span>{kicker}</span></p>
      <div className="section__head" data-reveal>
        <h2 className="section__title" id={titleId}>{title}</h2>
        {action && (
          <a
            className="section__action link"
            href={action.href}
            {...(action.external ? { target: "_blank", rel: "noopener" } : {})}
          >
            {action.label}
          </a>
        )}
      </div>
    </>
  );
}
