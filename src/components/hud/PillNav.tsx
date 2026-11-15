import { useEffect, useRef, useState } from "react";
import type { NavItem } from "../../data/portfolio";

interface PillNavProps {
  items: NavItem[];
  activeId: string | null;
  /** Prefix for in-page links when the nav is used on a subpage, e.g. "/" */
  base?: string;
  homeHref: string;
}

/** Geometric "A" mark: two legs and a crossbar */
export function AMark() {
  return (
    <svg className="pill__mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 21 L12 3 L20 21" />
      <path d="M7.6 14 H16.4" />
    </svg>
  );
}

export function PillNav({ items, activeId, base = "", homeHref }: PillNavProps) {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  return (
    <header className="pills" ref={navRef}>
      <a className="pill pill--brand" href={homeHref}>
        <AMark />
        <span className="pill__name">Aleyya.</span>
        <span className="pill__meta">Mathematics · Data · Surabaya</span>
      </a>
      <nav className={`pill pill--nav${open ? " is-open" : ""}`} id="navLinks" aria-label="Sections">
        {items.map((item) => (
          <a
            key={item.href}
            href={base + item.href}
            aria-current={activeId && item.href === `#${activeId}` ? "location" : undefined}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <button
        ref={toggleRef}
        className="pill pill--menu"
        type="button"
        aria-expanded={open}
        aria-controls="navLinks"
        onClick={() => setOpen((o) => !o)}
      >
        Menu
      </button>
      <a className="pill pill--cta" href={`${base}#contact`}>
        Get in touch <span className="pill__arrow" aria-hidden="true">→</span>
      </a>
    </header>
  );
}
