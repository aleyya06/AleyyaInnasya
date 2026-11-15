import { useEffect, useRef } from "react";
import { education, profile } from "../../data/portfolio";

interface ProfileCardProps {
  open: boolean;
  onClose: () => void;
}

/** Quick profile card opened by clicking the 3D "A" (or its keyboard button). */
export function ProfileCard({ open, onClose }: ProfileCardProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (returnFocus.current instanceof HTMLElement) returnFocus.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="profile" role="dialog" aria-modal="false" aria-labelledby="profileTitle">
      <div className="profile__meta">
        <span>Sheet A · Profile</span>
        <button ref={closeRef} className="profile__close" type="button" aria-label="Close profile card" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="profile__body">
        <h2 className="profile__name" id="profileTitle">
          {profile.firstLine} <span>{profile.secondLine}</span>
        </h2>
        <p className="profile__tagline">{profile.tagline}</p>
        <dl className="profile__facts">
          <div><dt>Study</dt><dd>{education.degree}, {education.period}</dd></div>
          <div><dt>Campus</dt><dd>{education.school}</dd></div>
          <div><dt>Based in</dt><dd>{profile.location}</dd></div>
        </dl>
        <p className="profile__links">
          <a className="link" href="#contact" onClick={onClose}>Get in touch →</a>
          <a className="link" href={profile.linkedin} target="_blank" rel="noopener">LinkedIn ↗</a>
        </p>
      </div>
    </div>
  );
}
