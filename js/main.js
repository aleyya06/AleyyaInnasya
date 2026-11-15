// Page interactions shared by every page. The 3D scene lives separately in scene.js.
const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const motionOK = () => !reducedMotion.matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// Sheets slide up as they reach the viewport
const revealTargets = document.querySelectorAll("[data-reveal]");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    }),
    { threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
  );
  revealTargets.forEach((el) => io.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add("is-in"));
}

// Navbar: on phones the section links open as a dropdown
const nav = document.querySelector("[data-nav]");
const toggle = document.getElementById("navToggle");
const links = document.getElementById("navLinks");
if (nav && toggle && links) {
  const setMenu = (open) => {
    links.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && links.classList.contains("is-open")) {
      setMenu(false);
      toggle.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (links.classList.contains("is-open") && !nav.contains(e.target)) setMenu(false);
  });
}

// Mark the nav link for whatever is in the middle of the screen
if (links && "IntersectionObserver" in window) {
  const navLinks = new Map(
    [...links.querySelectorAll('a[href^="#"]')].map((a) => [a.getAttribute("href").slice(1), a])
  );
  const spy = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.removeAttribute("aria-current"));
      navLinks.get(e.target.id)?.setAttribute("aria-current", "location");
    }),
    { rootMargin: "-48% 0px -48% 0px" }
  );
  // Education and Skills sit inside larger sheets, so they are watched on their own.
  document.querySelectorAll("main section[id], #education, #skills").forEach((el) => spy.observe(el));
}

// Hero sheet: fully visible for the first quarter of the descent, gone by about two thirds
const flight = document.getElementById("hero");
const heroSheet = document.querySelector("[data-hero]");
if (flight && heroSheet) {
  let queued = false;
  const update = () => {
    queued = false;
    const land = flight.offsetTop + flight.offsetHeight - innerHeight;
    const p = land > 0 ? clamp(scrollY / land) : 1;
    const o = 1 - clamp((p - 0.25) / 0.38);
    heroSheet.style.setProperty("--hero-o", o.toFixed(3));
    const gone = o <= 0.001;
    heroSheet.classList.toggle("is-gone", gone);
    heroSheet.inert = gone;
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  update();
}

// Project filters
const filterButtons = document.querySelectorAll("[data-filter]");
const projectCards = document.querySelectorAll(".project");
const filterStatus = document.getElementById("filterStatus");
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const f = btn.dataset.filter;
    filterButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    let shown = 0;
    projectCards.forEach((card) => {
      const show = f === "all" || card.dataset.cat === f;
      const wasHidden = card.hidden;
      card.hidden = !show;
      if (show) {
        shown++;
        if (wasHidden && motionOK()) {
          card.classList.add("is-entering");
          requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove("is-entering")));
        }
      }
    });
    if (filterStatus) filterStatus.textContent = `Showing ${shown} ${shown === 1 ? "project" : "projects"}`;
  });
});

// Accordions
document.querySelectorAll(".acc__btn").forEach((btn) => {
  const panel = document.getElementById(btn.getAttribute("aria-controls"));
  if (!panel) return;
  btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", String(open));
    panel.classList.toggle("is-open", open);
  });
});

// Project cards lean toward the pointer
if (finePointer.matches && motionOK()) {
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.classList.add("is-tilting");
      card.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width - 0.5) * 5).toFixed(2)}deg`);
      card.style.setProperty("--rx", `${(((e.clientY - r.top) / r.height - 0.5) * -5).toFixed(2)}deg`);
    });
    card.addEventListener("pointerleave", () => {
      card.classList.remove("is-tilting");
      card.style.removeProperty("--rx");
      card.style.removeProperty("--ry");
    });
  });
}

// Touch screens have no hover, so the snake takes one lap when its card comes into view.
const snake = document.querySelector(".snake");
if (snake && !finePointer.matches && motionOK() && "IntersectionObserver" in window) {
  let lap;
  new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      snake.classList.add("is-playing");
      clearTimeout(lap);
      lap = setTimeout(() => snake.classList.remove("is-playing"), 6000);
    }),
    { threshold: 0.6 }
  ).observe(snake);
}

// Certificate preview
const lightbox = document.getElementById("lightbox");
if (lightbox) {
  const img = document.getElementById("lightboxImg");
  const closeBtn = document.getElementById("lightboxClose");
  let returnFocus = null;
  let hideTimer;

  const open = (source) => {
    clearTimeout(hideTimer);
    returnFocus = document.activeElement;
    img.src = source.currentSrc || source.src;
    img.alt = source.alt;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => requestAnimationFrame(() => lightbox.classList.add("is-open")));
    closeBtn.focus();
  };
  const close = () => {
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
    const finish = () => { lightbox.hidden = true; img.src = ""; };
    if (motionOK()) hideTimer = setTimeout(finish, 350); else finish();
    returnFocus?.focus();
  };

  document.querySelectorAll(".cert").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("a")) return; // the Verify link opens Dicoding instead
      const source = card.querySelector("img");
      if (source) open(source);
    });
  });
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target === closeBtn) close();
  });
  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "Tab") { e.preventDefault(); closeBtn.focus(); } // the close button is the only control
  });
}

// Contact form: no server behind the site, so it hands the message to the visitor's email app.
const form = document.getElementById("inquiry");
if (form) {
  const note = document.getElementById("inquiryNote");
  const fields = {
    name: { el: form.elements.name, msg: "Please add your name." },
    email: { el: form.elements.email, msg: "Please add an email address I can reply to." },
    message: { el: form.elements.message, msg: "Please write a short message." },
  };
  const emailOK = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const check = (key) => {
    const { el, msg } = fields[key];
    const value = el.value.trim();
    const bad = !value || (key === "email" && !emailOK(value));
    const error = document.getElementById(`${el.id}-err`);
    el.setAttribute("aria-invalid", String(bad));
    if (error) {
      error.textContent = bad ? (key === "email" && value ? "That email address doesn't look complete." : msg) : "";
      if (bad) el.setAttribute("aria-describedby", error.id); else el.removeAttribute("aria-describedby");
    }
    return !bad;
  };

  Object.keys(fields).forEach((key) => {
    fields[key].el.addEventListener("blur", () => { if (fields[key].el.value) check(key); });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const results = Object.keys(fields).map((key) => [key, check(key)]);
    const firstBad = results.find(([, ok]) => !ok);
    if (firstBad) {
      fields[firstBad[0]].el.focus();
      note.textContent = "A field needs attention before the message can be sent.";
      return;
    }
    const name = fields.name.el.value.trim();
    const email = fields.email.el.value.trim();
    const message = fields.message.el.value.trim();
    const subject = `Message from ${name} via aleyya.my.id`;
    const body = `${message}\n\n${name}\n${email}`;
    window.location.href = `mailto:aleyyainnasya@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    note.textContent = "Your email app should open with the message ready. If it doesn't, write to aleyyainnasya@gmail.com directly.";
  });
}
