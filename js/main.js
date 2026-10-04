// Mobile navigation toggle
const toggle = document.getElementById("navToggle");
const links = document.getElementById("navLinks");

toggle.addEventListener("click", () => {
  const open = links.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
});

// Close the mobile menu after picking a section
links.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    links.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  })
);

// Fade-in sections as they enter the viewport
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// Certificate lightbox: click a card to view the full certificate
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");

if (lightbox) {
  const openLightbox = (img) => {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    lightbox.hidden = true;
    lightboxImg.src = "";
    document.body.style.overflow = "";
  };

  document.querySelectorAll(".cert-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("a")) return; // let the Verify link behave normally
      const img = card.querySelector("img");
      if (img) openLightbox(img);
    });
  });

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target.id === "lightboxClose") closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
  });
}

// Wind parallax: decorative layers drift at their own speed while scrolling,
// and the hero gently fades and rises out of view.
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!prefersReduced) {
  const driftEls = Array.from(document.querySelectorAll("[data-parallax]"));
  const heroInner = document.querySelector(".hero__inner");
  let ticking = false;

  const applyParallax = () => {
    ticking = false;
    const vh = window.innerHeight;

    driftEls.forEach((el) => {
      const host = el.closest("section");
      if (!host) return;
      const rect = host.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) return; // offscreen

      const speed = parseFloat(el.dataset.parallax) || 0;
      const offset = (rect.top + rect.height / 2 - vh / 2) * speed * -1;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });

    if (heroInner) {
      const y = window.scrollY;
      heroInner.style.opacity = Math.max(0, 1 - y / 620);
      heroInner.style.transform = `translate3d(0, ${(y * -0.12).toFixed(1)}px, 0)`;
    }
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(applyParallax);
      }
    },
    { passive: true }
  );

  applyParallax();
}
