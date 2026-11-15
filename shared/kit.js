// Shared behaviour for all prototypes: F01/F02 parallax, F03 typewriter, F04 photo reveal + lab panel.
// Each prototype styles these itself; this file only moves things.

export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ---------- one rAF loop for every scroll-driven thing ---------- */
const tasks = new Set();
let queued = false;
function frame() {
  queued = false;
  const vh = innerHeight;
  for (const t of tasks) t(vh);
}
function request() {
  if (!queued) { queued = true; requestAnimationFrame(frame); }
}
addEventListener("scroll", request, { passive: true });
addEventListener("resize", request);
export function onScroll(fn) { tasks.add(fn); request(); return () => tasks.delete(fn); }

/* ---------- F01 / F02: parallax ----------
   <div data-parallax="0.35"> moves at (1 - 0.35) of scroll speed relative to its parent.
   Positive = lags behind (background feel), negative = moves ahead. */
export function initParallax(root = document) {
  if (reducedMotion) return;
  const els = [...root.querySelectorAll("[data-parallax]")];
  onScroll((vh) => {
    for (const el of els) {
      const host = el.parentElement.getBoundingClientRect();
      if (host.bottom < -vh * 0.5 || host.top > vh * 1.5) continue;
      const speed = parseFloat(el.dataset.parallax);
      const offset = (host.top + host.height / 2 - vh / 2) * -speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    }
  });
}

/* ---------- F03: typewriter ----------
   Types a phrase, holds, erases, types the next. Starts when the line is 70% visible.
   Screen readers get a static sentence; the animated text is aria-hidden. */
export function initTyper(el, phrases, { type = 55, erase = 28, hold = 1300, gap = 350 } = {}) {
  el.textContent = "";
  const sr = document.createElement("span");
  sr.className = "sr-only";
  sr.textContent = phrases.slice(0, 2).join(" ");
  const out = document.createElement("span");
  out.setAttribute("aria-hidden", "true");
  out.className = "typer-text";
  const caret = document.createElement("span");
  caret.setAttribute("aria-hidden", "true");
  caret.className = "typer-caret";
  el.append(sr, out, caret);

  if (reducedMotion) { out.textContent = phrases[1] ?? phrases[0]; return; }

  let i = 0, n = 0, dir = 1, started = false;
  const tick = () => {
    const word = phrases[i];
    n += dir;
    out.textContent = word.slice(0, n);
    let wait = dir > 0 ? type + Math.random() * 40 : erase;
    if (dir > 0 && n === word.length) { dir = -1; wait = hold; el.dataset.phrase = i; }
    else if (dir < 0 && n === 0) { dir = 1; i = (i + 1) % phrases.length; wait = gap; }
    setTimeout(tick, wait);
  };
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting && !started) { started = true; obs.disconnect(); setTimeout(tick, 250); }
  }, { threshold: 0.7 }).observe(el);
}

/* ---------- F04: full-screen photo makes room for the project text ----------
   Markup: <section class="f04"><div class="f04-stage"><div class="f04-text">…</div>
           <figure class="f04-media"><img></figure></div></section>
   Sets --p (0 → 1) on each section. Mode comes from <html data-a data-b data-c>. */
export const F04_OPTIONS = {
  a: { label: "Photo", options: [["crop", "A2 crop to side"], ["resize", "A1 resize"], ["slide", "A3 slide aside"]] },
  b: { label: "Text", options: [["behind", "B3 was behind"], ["palette", "B1 photo colours"], ["exact", "B4 exact photo, veiled"], ["letters", "B5 photo in the letters"], ["fade", "B2 fade in"]] },
  c: { label: "Timing", options: [["scrub", "C1 follows scroll"], ["trigger", "C2 plays once"]] },
  e: { label: "Space between projects", options: [["frame", "E1 colour frame"], ["blend", "E2 colours blend"], ["photos", "E3 photos blend"], ["swatches", "E4 colour swatches"], ["none", "E0 no space"]] },
};

export function initF04(root = document) {
  const sections = [...root.querySelectorAll(".f04")];
  const html = document.documentElement;
  onScroll((vh) => {
    const mode = html.dataset.c;
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      const travel = r.height - vh;
      const prog = clamp(-r.top / travel);
      s.style.setProperty("--prog", prog.toFixed(3));
      if (reducedMotion) { s.style.setProperty("--p", 1); continue; }
      if (mode === "trigger") {
        const on = prog > 0.08 || (r.top < vh * 0.2 && r.bottom > 0 && prog > 0);
        s.classList.toggle("is-on", on);
        s.style.setProperty("--p", on ? 1 : 0);
      } else {
        s.classList.remove("is-on");
        const p = clamp((prog - 0.12) / 0.5);
        s.style.setProperty("--p", (p * p * (3 - 2 * p)).toFixed(4)); // smoothstep
      }
    }
  });
}

/* ---------- Lab panel: switch F04 options live ---------- */
export function initLab({ defaults = { a: "crop", b: "behind", c: "scrub", e: "frame" }, groups = F04_OPTIONS, storageKey = "f04-lab", backHref = "../index.html", onChange } = {}) {
  const html = document.documentElement;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch {}
  const state = { ...defaults };
  for (const k in saved) if (groups[k]?.options.some(([v]) => v === saved[k])) state[k] = saved[k];
  const apply = () => {
    for (const k in groups) html.dataset[k] = state[k];
    onChange?.(state);
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
    request();
  };

  const panel = document.createElement("aside");
  panel.className = "lab";
  panel.setAttribute("aria-label", "Prototype options");
  panel.innerHTML = `
    <button class="lab-toggle" type="button" aria-expanded="false">F04 options</button>
    <div class="lab-body" hidden>
      ${Object.entries(groups).map(([k, g]) => `
        <fieldset><legend>${g.label}</legend>
          ${g.options.map(([v, l]) => `<label><input type="radio" name="lab-${k}" value="${v}" ${state[k] === v ? "checked" : ""}> ${l}</label>`).join("")}
        </fieldset>`).join("")}
      <a class="lab-back" href="${backHref}">All prototypes</a>
    </div>`;
  document.body.append(panel);
  const btn = panel.querySelector(".lab-toggle");
  const body = panel.querySelector(".lab-body");
  btn.addEventListener("click", () => {
    const open = body.hidden;
    body.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
  });
  panel.addEventListener("change", (e) => {
    const [, k] = e.target.name.split("-");
    state[k] = e.target.value;
    apply();
  });
  apply();
}

/* ---------- helper: build an F04 project section from content data ---------- */
const abs = (path) => new URL(path, location.href).href;

export function f04Section(p, imgBase, { index, total, extra = "", flip = false } = {}) {
  const { bg, ink, accent } = p.palette;
  return `
  <section class="f04${flip ? " f04--flip" : ""}" id="${p.id}" style="--bg:${bg};--ink:${ink};--accent:${accent};--img:url('${abs(imgBase + p.img)}')" aria-labelledby="t-${p.id}">
    <div class="f04-stage">
      <div class="f04-text">
        ${index != null ? `<p class="f04-count">Project ${index} of ${total}</p>` : ""}
        <h3 class="f04-title" id="t-${p.id}">${p.title}</h3>
        <p class="f04-kind">${p.kind}, ${p.year}</p>
        <p class="f04-body">${p.text}</p>
        <dl class="f04-data">
          <div><dt>Area</dt><dd>${p.area}</dd></div>
          <div><dt>Location</dt><dd>${p.place}</dd></div>
          <div><dt>Role</dt><dd>${p.role}</dd></div>
        </dl>
        ${extra}
      </div>
      <figure class="f04-media"><img src="${imgBase}${p.img}" alt="${p.title}, ${p.kind.toLowerCase()}" loading="lazy" decoding="async"></figure>
    </div>
  </section>`;
}

/* ---------- helper: the space between two big project photos (option E) ----------
   a = project above, b = project below. Purely visual, hidden from screen readers. */
export function f04Gap(a, b, imgBase) {
  const sw = (b.swatches || [b.palette.bg, b.palette.accent, b.palette.ink])
    .map((c) => `<span class="sw" style="--c:${c}"><i>${c.toUpperCase()}</i></span>`).join("");
  return `
  <div class="f04-gap" aria-hidden="true" style="--a-bg:${a.palette.bg};--a-acc:${a.palette.accent};--b-bg:${b.palette.bg};--b-acc:${b.palette.accent};--a-img:url('${abs(imgBase + a.img)}');--b-img:url('${abs(imgBase + b.img)}')">
    <div class="gap-photos"><span class="ga"></span><span class="gb"></span></div>
    <div class="gap-swatches">${sw}</div>
  </div>`;
}

/* Project list with gaps between them, alternating sides (1st photo goes right, 2nd left, …) */
export function f04List(projects, imgBase, { startFlip = false, ...opts } = {}) {
  return projects.map((p, i) =>
    (i ? f04Gap(projects[i - 1], p, imgBase) : "") +
    f04Section(p, imgBase, { index: i + 1, total: projects.length, flip: (i % 2 === 1) !== startFlip, ...opts })
  ).join("");
}
