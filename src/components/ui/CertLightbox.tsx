import { useEffect, useRef, useState } from "react";

export interface LightboxImage {
  src: string;
  alt: string;
}

interface CertLightboxProps {
  image: LightboxImage | null;
  onClose: () => void;
}

/** Full-size certificate preview. Esc, the backdrop or the close button close it; focus returns to the card. */
export function CertLightbox({ image, onClose }: CertLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<Element | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!image) return;
    returnFocus.current = document.activeElement;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        e.preventDefault(); // the close button is the only control
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      setShown(false);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      if (returnFocus.current instanceof HTMLElement) returnFocus.current.focus();
    };
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div
      className={`lightbox${shown ? " is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Certificate preview"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button ref={closeRef} className="lightbox__close" type="button" aria-label="Close preview" onClick={onClose}>
        ×
      </button>
      <img className="lightbox__img" src={image.src} alt={image.alt} />
    </div>
  );
}
