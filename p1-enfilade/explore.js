/* Looking into a project: the full-screen image viewer (used by every "Project detail" option) and the
   D1 project sheet that opens over the house. Plain DOM; the texts come from content.js (CV.ui). */
const IMG = "../shared/img/";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// keep keyboard focus inside an open dialog; return focus where it was on close
function modal(el, onClose) {
  const before = document.activeElement;
  const keys = (e) => {
    if (e.key === "Escape") { e.stopPropagation(); close(); }
    if (e.key !== "Tab") return;
    const f = [...el.querySelectorAll("button, a[href], [tabindex='0']")].filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  };
  el.addEventListener("keydown", keys);
  function close() { el.removeEventListener("keydown", keys); onClose(); before?.focus?.(); }
  return close;
}
let locks = 0;
const lockScroll = (on) => { locks += on ? 1 : -1; document.documentElement.classList.toggle("locked", locks > 0); };

/* ---------- viewer: one image at a time, arrows, click to zoom to full size (then drag / scroll to pan) ---------- */
export function openViewer(items, start = 0, { title = "" } = {}) {
  const ui = window.CV.ui;
  let i = start;
  const el = document.createElement("div");
  el.className = "viewer";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title);
  el.innerHTML = `
    <div class="v-stage" tabindex="0"><img alt=""></div>
    <div class="v-bar">
      <span class="v-cap"></span>
      <span class="v-count"></span>
    </div>
    <button class="v-btn v-prev" type="button" aria-label="${esc(ui.prev)}">‹</button>
    <button class="v-btn v-next" type="button" aria-label="${esc(ui.next)}">›</button>
    <button class="v-close" type="button" aria-label="${esc(ui.close)}">×</button>`;
  document.body.append(el);
  lockScroll(true);
  const stage = el.querySelector(".v-stage"), img = el.querySelector("img");
  const show = () => {
    const it = items[i];
    el.classList.remove("zoom");
    img.src = IMG + it.src;
    img.alt = it.caption || `${title} ${ui.render} ${i + 1}`;
    el.querySelector(".v-cap").textContent = it.caption ? `${ui.sheet}: ${it.caption}` : `${title} · ${ui.zoom}`;
    el.querySelector(".v-count").textContent = `${i + 1} / ${items.length}`;
    new Image().src = IMG + items[(i + 1) % items.length].src;      // the next one is ready when asked for
  };
  const go = (d) => { i = (i + d + items.length) % items.length; show(); };
  el.querySelector(".v-prev").onclick = () => go(-1);
  el.querySelector(".v-next").onclick = () => go(1);
  // zoom: the image at its own size, centred on where it was clicked
  img.addEventListener("click", (e) => {
    if (el.classList.contains("zoom")) { el.classList.remove("zoom"); return; }
    const r = img.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    el.classList.add("zoom");
    requestAnimationFrame(() => { stage.scrollLeft = fx * img.offsetWidth - stage.clientWidth / 2; stage.scrollTop = fy * img.offsetHeight - stage.clientHeight / 2; });
  });
  // drag to pan when zoomed (touch pans natively)
  let drag = null;
  stage.addEventListener("pointerdown", (e) => { if (el.classList.contains("zoom") && e.pointerType === "mouse") drag = { x: e.clientX, y: e.clientY, l: stage.scrollLeft, t: stage.scrollTop, moved: false }; });
  const move = (e) => { if (!drag) return; drag.moved = true; stage.scrollLeft = drag.l - (e.clientX - drag.x); stage.scrollTop = drag.t - (e.clientY - drag.y); };
  const up = () => { if (drag?.moved) img.addEventListener("click", (e) => e.stopImmediatePropagation(), { capture: true, once: true }); drag = null; };
  addEventListener("pointermove", move); addEventListener("pointerup", up);
  // swipe on touch when not zoomed
  let sx = null;
  stage.addEventListener("touchstart", (e) => { sx = el.classList.contains("zoom") ? null : e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }, { passive: true });
  el.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); });
  const close = modal(el, () => { el.remove(); lockScroll(false); removeEventListener("pointermove", move); removeEventListener("pointerup", up); });
  el.querySelector(".v-close").onclick = close;
  show();
  el.querySelector(".v-close").focus();
  return close;
}

/* ---------- D1: the project sheet over the house ---------- */
export function projectHTML(p, { heading = "h2", sizes = ["(max-width: 760px) 50vw, 25vw", "(max-width: 760px) 100vw, 33vw"] } = {}) {
  const ui = window.CV.ui, H = heading;
  const renders = p.gallery.filter((g) => g.kind === "render"), sheets = p.gallery.filter((g) => g.kind === "sheet");
  // k-render / k-sheet (not "sheet": that is the D1 overlay); srcset lets wide grids use the full image
  const fig = (g, k) => `<button class="g-item k-${g.kind}" type="button" data-i="${k}">
      <img src="${IMG + g.thumb}" srcset="${IMG + g.thumb} 560w, ${IMG + g.src} ${g.w}w" sizes="${sizes[g.kind === "sheet" ? 1 : 0]}"
        alt="${esc(g.caption || `${p.title}, ${ui.render} ${k + 1}`)}" loading="lazy" width="${g.w}" height="${g.h}">
      ${g.caption ? `<span>${esc(g.caption)}</span>` : ""}</button>`;
  return `
    <p class="s-kind">${esc(p.kind)}</p>
    <${H} class="s-title">${esc(p.title)}</${H}>
    <div class="s-text"><p>${esc(p.text)}</p><dl>${p.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>
    <h3 class="s-h">${esc(ui.renders)} <small>${renders.length}</small></h3>
    <div class="g-grid">${renders.map((g) => fig(g, p.gallery.indexOf(g))).join("")}</div>
    <h3 class="s-h">${esc(ui.sheets)} <small>${sheets.length}</small></h3>
    <div class="g-grid sheets">${sheets.map((g) => fig(g, p.gallery.indexOf(g))).join("")}</div>`;
}
export function wireGallery(root, p) {
  root.addEventListener("click", (e) => {
    const b = e.target.closest(".g-item");
    if (b) openViewer(p.gallery, +b.dataset.i, { title: p.title });
  });
}

export function openSheet(p) {
  const ui = window.CV.ui;
  const el = document.createElement("div");
  el.className = "sheet";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", p.title);
  el.innerHTML = `<div class="s-panel"><button class="s-close" type="button" aria-label="${esc(ui.close)}">×</button>${projectHTML(p)}</div>`;
  document.body.append(el);
  lockScroll(true);
  requestAnimationFrame(() => el.classList.add("on"));
  wireGallery(el, p);
  const close = modal(el, () => { el.classList.remove("on"); lockScroll(false); setTimeout(() => el.remove(), 350); });
  el.querySelector(".s-close").onclick = close;
  el.addEventListener("click", (e) => { if (e.target === el) close(); });     // click outside the panel
  el.querySelector(".s-close").focus();
  return close;
}
