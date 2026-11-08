const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const motionOK = () => !reducedMotion.matches;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;

// Rose curves r = cos(kθ) with k = n/d. The curve closes after d·π when n·d is odd, 2d·π otherwise.
function rosePath(n, d) {
  const k = n / d;
  const total = Math.PI * ((n * d) % 2 ? d : 2 * d);
  const steps = Math.round(total * 70);
  let out = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * total;
    const r = Math.cos(k * t);
    out += (i ? "L" : "M") + (r * Math.cos(t)).toFixed(3) + " " + (r * Math.sin(t)).toFixed(3);
  }
  return out + "Z";
}

const roseSvgs = [...document.querySelectorAll("svg[data-rose]")];
roseSvgs.forEach((svg) => {
  const [n, d = 1] = svg.dataset.rose.split("/").map(Number);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", rosePath(n, d));
  path.setAttribute("pathLength", "1");
  svg.append(path);
});

// Fixed on-screen stroke width, from layout width so rotation doesn't thin the line.
// (non-scaling-stroke would be simpler, but Chrome then ignores pathLength for dashes.)
const sizeStroke = (svg, width = svg.clientWidth) => {
  const px = parseFloat(getComputedStyle(svg).getPropertyValue("--stroke-px")) || 1.2;
  if (width) svg.firstElementChild.style.strokeWidth = ((px * svg.viewBox.baseVal.width) / width).toFixed(5);
};
if ("ResizeObserver" in window) {
  const strokeRO = new ResizeObserver((entries) =>
    entries.forEach((e) => sizeStroke(e.target, e.contentRect.width))
  );
  roseSvgs.forEach((svg) => strokeRO.observe(svg));
} else {
  roseSvgs.forEach(sizeStroke);
}

// Wrap words (or letters) in masks so they can rise in. Inline tags like <em> are kept.
function splitText(el, mode) {
  const label = el.textContent.replace(/\s+/g, " ").trim();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  let index = 0;

  nodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        frag.append(" ");
        return;
      }
      const word = document.createElement("span");
      word.className = "w";
      if (mode === "chars") {
        for (const ch of part) {
          const c = document.createElement("span");
          c.className = "c";
          c.style.setProperty("--i", index++);
          c.textContent = ch;
          word.append(c);
        }
      } else {
        const inner = document.createElement("span");
        inner.className = "w__i";
        inner.style.setProperty("--i", index++);
        inner.textContent = part;
        word.append(inner);
      }
      frag.append(word);
    });
    node.replaceWith(frag);
  });

  // Letter spans can be read one by one by screen readers, so expose the plain text instead.
  if (mode === "chars") {
    el.setAttribute("aria-label", label);
    el.querySelectorAll(".w").forEach((w) => w.setAttribute("aria-hidden", "true"));
  }
}

document.querySelectorAll("[data-split]").forEach((el) => splitText(el, el.dataset.split));

document.querySelectorAll("[data-stagger]").forEach((group) => {
  group.querySelectorAll(":scope > [data-reveal]").forEach((el, i) => {
    el.style.setProperty("--d", `${i * 90}ms`);
  });
});

// Scroll reveals
const revealTargets = document.querySelectorAll(
  "[data-reveal], [data-split]:not([data-on-load]), .rose--drift, .rose--contact"
);
if ("IntersectionObserver" in window) {
  const revealIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealIO.unobserve(entry.target);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -6% 0px" }
  );
  revealTargets.forEach((el) => revealIO.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add("is-in"));
}

// Entrance: wait for the fonts (up to 1.2s) so the letters don't jump when they swap in.
const fontsReady = document.fonts
  ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))])
  : Promise.resolve();
fontsReady.then(() =>
  requestAnimationFrame(() => {
    root.classList.add("is-loaded");
    document.querySelectorAll("[data-on-load]").forEach((el) => el.classList.add("is-in"));
  })
);

// Navigation: mobile dropdown
const nav = document.querySelector("[data-nav]");
const toggle = document.getElementById("navToggle");
const links = document.getElementById("navLinks");

const setMenu = (open) => {
  links.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  nav.classList.toggle("is-menu-open", open);
  if (open) nav.classList.remove("is-hidden");
};

if (nav && toggle && links) {
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

// Highlight the nav link for the section in the middle of the screen
if (links && "IntersectionObserver" in window) {
  const navLinks = new Map(
    [...links.querySelectorAll('a[href^="#"]')].map((a) => [a.getAttribute("href").slice(1), a])
  );
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.removeAttribute("aria-current"));
        navLinks.get(entry.target.id)?.setAttribute("aria-current", "location");
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  document.querySelectorAll("main section[id]").forEach((s) => spy.observe(s));
}

// Scroll-linked effects, batched into one frame
const progressBar = nav?.querySelector(".nav__progress");
const toneSections = [...document.querySelectorAll("main [data-tone], footer[data-tone]")];
const chapters = [...document.querySelectorAll("[data-chapter]")];
const parallaxEls = [...document.querySelectorAll("[data-parallax]")];
const timeline = document.querySelector("[data-timeline]");
const timelineItems = timeline ? [...timeline.querySelectorAll(".timeline__item")] : [];
const heroInner = document.querySelector(".hero__inner");
let lastY = window.scrollY;
let scrollQueued = false;

function onScroll() {
  scrollQueued = false;
  const y = window.scrollY;
  const vh = window.innerHeight;
  const max = root.scrollHeight - vh;

  if (nav) {
    if (progressBar) progressBar.style.transform = `scaleX(${max > 0 ? (y / max).toFixed(4) : 0})`;
    nav.classList.toggle("is-scrolled", y > 24);

    // Tuck the bar away while reading down, bring it back on the way up
    const keepVisible = links?.classList.contains("is-open") || nav.querySelector(":focus-visible");
    if (y > lastY + 6 && y > 240 && !keepVisible) nav.classList.add("is-hidden");
    else if (y < lastY - 6 || keepVisible) nav.classList.remove("is-hidden");

    const probe = nav.offsetHeight / 2;
    const under = toneSections.find((el) => {
      const r = el.getBoundingClientRect();
      return r.top <= probe && r.bottom > probe;
    });
    const tone = under?.dataset.tone;
    nav.dataset.navTone = tone === "night" || tone === "plum" ? "dark" : "light";
  }
  lastY = y;

  if (!motionOK()) {
    timelineItems.forEach((item) => item.classList.add("is-reached"));
    return;
  }

  chapters.forEach((ch) => {
    const top = ch.getBoundingClientRect().top;
    ch.style.setProperty("--p", clamp((vh - top) / (vh * 0.55), 0, 1).toFixed(3));
  });

  parallaxEls.forEach((el) => {
    const host = el.parentElement.getBoundingClientRect();
    if (host.bottom < -200 || host.top > vh + 200) return;
    const speed = parseFloat(el.dataset.parallax) || 0;
    el.style.translate = `0 ${((host.top + host.height / 2 - vh / 2) * speed).toFixed(1)}px`;
  });

  if (timeline) {
    const r = timeline.getBoundingClientRect();
    const fill = clamp((vh * 0.62 - r.top) / r.height, 0, 1);
    timeline.style.setProperty("--fill", fill.toFixed(4));
    timelineItems.forEach((item) => item.classList.toggle("is-reached", item.offsetTop <= fill * r.height + 12));
  }

  if (heroInner && y < vh * 1.3) {
    heroInner.style.opacity = Math.max(0, 1 - y / (vh * 0.9)).toFixed(3);
    heroInner.style.translate = `0 ${(y * -0.1).toFixed(1)}px`;
  }
}

// Floating curves: they lean toward the pointer and turn as the page scrolls, then settle.
const floaters = [...document.querySelectorAll("[data-float]")].map((el) => ({
  el,
  depth: parseFloat(el.dataset.float) || 0,
  x: 0, y: 0, r: 0,
}));
const pointer = { x: 0, y: 0 };
let floatRunning = false;

function floatTick() {
  const sy = window.scrollY;
  let moving = false;
  floaters.forEach((f) => {
    const tx = pointer.x * 22 * f.depth;
    const ty = pointer.y * 16 * f.depth;
    const tr = sy * 0.025 * f.depth + pointer.x * 5 * f.depth;
    f.x = lerp(f.x, tx, 0.06);
    f.y = lerp(f.y, ty, 0.06);
    f.r = lerp(f.r, tr, 0.06);
    if (Math.abs(f.x - tx) + Math.abs(f.y - ty) + Math.abs(f.r - tr) > 0.03) moving = true;
    f.el.style.translate = `${f.x.toFixed(2)}px ${f.y.toFixed(2)}px`;
    f.el.style.rotate = `${f.r.toFixed(2)}deg`;
  });
  floatRunning = moving;
  if (moving) requestAnimationFrame(floatTick);
}

const kickFloat = () => {
  if (floatRunning || !floaters.length || !motionOK()) return;
  floatRunning = true;
  requestAnimationFrame(floatTick);
};

const queueScroll = () => {
  if (!scrollQueued) {
    scrollQueued = true;
    requestAnimationFrame(onScroll);
  }
  kickFloat();
};
window.addEventListener("scroll", queueScroll, { passive: true });
window.addEventListener("resize", queueScroll);
onScroll();

// Pointer-only niceties: cursor ring, magnetic buttons, tilting cards
if (finePointer.matches && motionOK()) {
  root.classList.add("has-cursor");
  const cursor = document.querySelector(".cursor");
  let cx = -100, cy = -100, tx = -100, ty = -100;
  let cursorRunning = false;

  const cursorTick = () => {
    cx = lerp(cx, tx, 0.24);
    cy = lerp(cy, ty, 0.24);
    cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
    if (Math.abs(cx - tx) + Math.abs(cy - ty) > 0.2) requestAnimationFrame(cursorTick);
    else cursorRunning = false;
  };

  window.addEventListener(
    "pointermove",
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
      kickFloat();

      if (!cursor) return;
      const t = e.target instanceof Element ? e.target : null;
      const tone = t?.closest("[data-tone]")?.dataset.tone;
      const overDarkNav = t?.closest('[data-nav-tone="dark"]');
      cursor.classList.remove("is-hidden");
      cursor.classList.toggle("is-active", !!t?.closest("a, button, [data-tilt]"));
      cursor.classList.toggle("is-dark", tone === "night" || tone === "plum" || !!overDarkNav || !!t?.closest(".lightbox"));
      if (!cursorRunning) {
        cursorRunning = true;
        requestAnimationFrame(cursorTick);
      }
    },
    { passive: true }
  );
  root.addEventListener("mouseleave", () => cursor?.classList.add("is-hidden"));

  document.querySelectorAll("[data-magnetic]").forEach((btn) => {
    const label = btn.querySelector(".btn__label");
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      btn.style.translate = `${(dx * 0.22).toFixed(1)}px ${(dy * 0.32).toFixed(1)}px`;
      if (label) label.style.translate = `${(dx * 0.1).toFixed(1)}px ${(dy * 0.12).toFixed(1)}px`;
    });
    btn.addEventListener("pointerleave", () => {
      btn.style.translate = "";
      if (label) label.style.translate = "";
    });
  });

  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.classList.add("is-tilting");
      card.style.setProperty("--ry", `${(px * 6).toFixed(2)}deg`);
      card.style.setProperty("--rx", `${(py * -6).toFixed(2)}deg`);
    });
    card.addEventListener("pointerleave", () => {
      card.classList.remove("is-tilting");
      card.style.removeProperty("--rx");
      card.style.removeProperty("--ry");
    });
  });
}

// Touch screens have no hover, so the snake takes one lap when its card scrolls into view.
const snake = document.querySelector(".snake");
if (snake && !finePointer.matches && motionOK() && "IntersectionObserver" in window) {
  let lapTimer;
  new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        snake.classList.add("is-playing");
        clearTimeout(lapTimer);
        lapTimer = setTimeout(() => snake.classList.remove("is-playing"), 6000);
      });
    },
    { threshold: 0.6 }
  ).observe(snake);
}

// Certificate lightbox
const lightbox = document.getElementById("lightbox");
if (lightbox) {
  const lightboxImg = document.getElementById("lightboxImg");
  const closeBtn = document.getElementById("lightboxClose");
  let returnFocus = null;
  let hideTimer;

  const openLightbox = (img) => {
    clearTimeout(hideTimer);
    returnFocus = document.activeElement;
    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => requestAnimationFrame(() => lightbox.classList.add("is-open")));
    closeBtn.focus();
  };

  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
    const finish = () => {
      lightbox.hidden = true;
      lightboxImg.src = "";
    };
    if (motionOK()) hideTimer = setTimeout(finish, 400);
    else finish();
    returnFocus?.focus();
  };

  document.querySelectorAll(".cert-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("a")) return; // let the Verify link behave normally
      const img = card.querySelector("img");
      if (img) openLightbox(img);
    });
  });

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target === closeBtn) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    // The close button is the only control in the dialog, so focus stays on it.
    if (e.key === "Tab") {
      e.preventDefault();
      closeBtn.focus();
    }
  });
}
