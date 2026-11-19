/* Looking into a project: the sheet that opens over the house (text, renders, drawing sheets) and the
   full-screen image viewer it opens. Plain DOM; the texts come from content.js (CV.ui). */
const IMG = "../shared/img/";
// WebP unless the panel's "Images" option says JPEG (the originals, to compare)
export const pic = (f) => (document.documentElement.dataset.i === "jpeg" ? f : f.replace(/\.jpg$/, ".webp"));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* open dialogs, topmost last. While one is open everything else on the page is inert (no clicks, no focus, hidden from
   screen readers); keys go to the topmost one wherever the focus is (clicking plain text moves focus to the body). */
const stack = [];
let closedAt = -1e9;
export const justClosed = () => performance.now() - closedAt < 450;   // the 2nd click of a double click on × is not for the house
const setInert = () => { const top = stack.at(-1)?.el; for (const n of document.body.children) n.inert = !!top && n !== top; };
addEventListener("keydown", (e) => {
  const top = stack.at(-1);
  if (!top) return;
  if (e.key === "Escape") { e.preventDefault(); top.close(); }
  else top.onKey?.(e);
});
function modal(el, onClose, onKey) {
  const before = document.activeElement;
  const entry = { el, onKey, close };
  stack.push(entry); setInert();
  document.documentElement.classList.add("locked");                 // no page scroll (main.js also pauses the 3D)
  let closed = false;
  function close() {
    if (closed) return;                                              // a double click on × or the backdrop
    closed = true;
    stack.splice(stack.indexOf(entry), 1); setInert();
    closedAt = performance.now();
    document.documentElement.classList.toggle("locked", stack.length > 0);
    onClose();
    before?.focus?.({ preventScroll: true });
  }
  return close;
}

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
  const stage = el.querySelector(".v-stage"), img = el.querySelector("img");
  const show = () => {
    const it = items[i];
    el.classList.remove("zoom");
    img.src = IMG + pic(it.src);
    img.alt = it.caption || `${title} ${ui.render} ${i + 1}`;
    el.querySelector(".v-cap").textContent = it.caption ? `${ui.sheet}: ${it.caption}` : `${title} · ${ui.zoom}`;
    el.querySelector(".v-count").textContent = `${i + 1} / ${items.length}`;
    new Image().src = IMG + pic(items[(i + 1) % items.length].src);      // the next one is ready when asked for
  };
  const go = (d) => { i = (i + d + items.length) % items.length; show(); };
  el.querySelector(".v-prev").onclick = () => go(-1);
  el.querySelector(".v-next").onclick = () => go(1);
  // zoom: the image at its own size, centred on where it was clicked
  img.addEventListener("click", (e) => {
    if (dragged) { dragged = false; return; }                     // the end of a drag is not a click
    if (el.classList.contains("zoom")) { el.classList.remove("zoom"); return; }
    const r = img.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    el.classList.add("zoom");
    requestAnimationFrame(() => { stage.scrollLeft = fx * img.offsetWidth - stage.clientWidth / 2; stage.scrollTop = fy * img.offsetHeight - stage.clientHeight / 2; });
  });
  // drag to pan when zoomed (touch pans natively)
  let drag = null, dragged = false;
  stage.addEventListener("pointerdown", (e) => { dragged = false; if (el.classList.contains("zoom") && e.pointerType === "mouse") drag = { x: e.clientX, y: e.clientY, l: stage.scrollLeft, t: stage.scrollTop }; });
  const move = (e) => {
    if (!drag) return;
    if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) dragged = true;
    stage.scrollLeft = drag.l - (e.clientX - drag.x); stage.scrollTop = drag.t - (e.clientY - drag.y);
  };
  const up = () => { drag = null; };
  addEventListener("pointermove", move); addEventListener("pointerup", up);
  // swipe on touch when not zoomed
  let sx = null;
  stage.addEventListener("touchstart", (e) => { sx = el.classList.contains("zoom") ? null : e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }, { passive: true });
  const keys = (e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); };
  const close = modal(el, () => { el.remove(); removeEventListener("pointermove", move); removeEventListener("pointerup", up); }, keys);
  el.querySelector(".v-close").onclick = close;
  show();
  el.querySelector(".v-close").focus();
  return close;
}

/* ---------- the project sheet over the house ---------- */
// what the grid shows each image at; with three sizes a 2× screen takes the 1100 px one, not the full file
const SIZES = { render: "(max-width: 760px) 50vw, 25vw", sheet: "(max-width: 760px) 100vw, 33vw" };
function projectHTML(p) {
  const ui = window.CV.ui;
  const renders = p.gallery.filter((g) => g.kind === "render"), sheets = p.gallery.filter((g) => g.kind === "sheet");
  // k-render / k-sheet (not "sheet": that is the D1 overlay); srcset lets wide grids use the full image
  const fig = (g, k) => `<button class="g-item k-${g.kind}" type="button" data-i="${k}">
      <img src="${IMG + pic(g.thumb)}" srcset="${IMG + pic(g.thumb)} 560w, ${IMG + pic(g.mid)} 1100w, ${IMG + pic(g.src)} ${g.w}w" sizes="${SIZES[g.kind]}"
        alt="${esc(g.caption || `${p.title}, ${ui.render} ${k + 1}`)}" loading="lazy" width="${g.w}" height="${g.h}">
      ${g.caption ? `<span>${esc(g.caption)}</span>` : ""}</button>`;
  return `
    <p class="s-kind">${esc(p.kind)}</p>
    <h2 class="s-title">${esc(p.title)}</h2>
    <div class="s-text"><p>${esc(p.text)}</p><dl>${p.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>
    <h3 class="s-h">${esc(ui.renders)} <small>${renders.length}</small></h3>
    <div class="g-grid">${renders.map((g) => fig(g, p.gallery.indexOf(g))).join("")}</div>
    <h3 class="s-h">${esc(ui.sheets)} <small>${sheets.length}</small></h3>
    <div class="g-grid sheets">${sheets.map((g) => fig(g, p.gallery.indexOf(g))).join("")}</div>`;
}
function wireGallery(root, p) {
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
  requestAnimationFrame(() => el.classList.add("on"));
  wireGallery(el, p);
  const close = modal(el, () => { el.classList.remove("on"); setTimeout(() => el.remove(), 350); });
  el.querySelector(".s-close").onclick = close;
  el.addEventListener("click", (e) => { if (e.target === el) close(); });     // click outside the panel
  el.querySelector(".s-close").focus();
  return close;
}
