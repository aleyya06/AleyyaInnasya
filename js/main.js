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
