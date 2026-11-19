/* ?bench: a benchmark of the walk, to run on any device. It loads the page once per setting (so each starts fresh, as a
   visitor would), walks the whole house by itself twice (the 1st time shaders and textures are new: what a first visit
   feels), and between the two walks measures how long one frame takes to draw at each stop. Results stay on this device
   (sessionStorage while it runs, then localStorage); "Copy" puts them on the clipboard as text. Nothing is sent anywhere. */

const KEY = "p1-bench", LAST = "p1-bench-last";
const WALK_S = 12;                                   // seconds per walk through the house
const BASE = { l: "warm", k: "drafting", i: "webp" };  // the same lamps, colours and images for every setting
const CONFIGS = [
  { id: "s2", label: "S2 Faster: the site as it is (A1 Plain)", o: { f: "fast", y: "current" }, on: true },
  { id: "s1", label: "S1 As before: every part drawn on its own", o: { f: "plain", y: "current" }, on: true },
  { id: "a2", label: "S2 with an art style (A2 Architectural sketch)", o: { f: "fast", y: "sketch" }, on: true },
  { id: "dpr1", label: "What-if: pixel ratio 1", o: { f: "fast", y: "current", dpr: 1 }, whatIf: true },
  { id: "dpr125", label: "What-if: pixel ratio 1.25", o: { f: "fast", y: "current", dpr: 1.25 }, whatIf: true },
  { id: "nolog", label: "What-if: no logarithmic depth buffer", o: { f: "fast", y: "current", logDepth: false }, whatIf: true },
];
const byId = (id) => CONFIGS.find((c) => c.id === id);
const siteDpr = () => Math.min(devicePixelRatio, 1.5);
const dprOf = (c) => (c.o.dpr ? Math.min(devicePixelRatio, c.o.dpr) : siteDpr());

const store = (s) => { try { return JSON.parse(s.getItem(KEY) || "null"); } catch { return null; } };
const save = (st) => { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
const params = new URLSearchParams(location.search);
const state = store(sessionStorage);
const running = params.get("bench") === "run" && state && state.i < state.plan.length;
const current = running ? byId(state.plan[state.i]) : null;

// main.js asks before it makes the renderer: which options this load runs with
export function overrides() {
  if (!current) return {};
  return { ...BASE, ...current.o, dpr: dprOf(current) };
}

/* ---------------- measuring ---------------- */
const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
const frames = async (n) => { for (let i = 0; i < n; i++) await nextFrame(); };
async function intervals(n) {
  const out = []; let prev = await nextFrame();
  for (let i = 0; i < n; i++) { const t = await nextFrame(); out.push(t - prev); prev = t; }
  return out;
}
const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };
const max = (a) => (a.length ? Math.max(...a) : null);

// GPU time per frame, where the browser allows it (desktop Chrome, mostly; not Safari)
function gpuTimer(gl) {
  const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
  if (!ext) return null;
  const pending = []; let q = null;
  return {
    begin() { if (q) return; q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); },
    end(idx) { if (!q) return; gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push([q, idx]); q = null; },
    poll(rec) {
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
      while (pending.length) {
        const [qq, idx] = pending[0];
        if (!gl.getQueryParameter(qq, gl.QUERY_RESULT_AVAILABLE)) break;
        if (!disjoint) rec[idx].gpu = gl.getQueryParameter(qq, gl.QUERY_RESULT) / 1e6;
        gl.deleteQuery(qq); pending.shift();
      }
    },
  };
}

// the names of the parts of the walk: the entrance, each wall, the ending
const segNames = () => [...document.querySelectorAll("[data-step]")].map((s, k) => (k === 0 ? "entrance" : s.id === "contact" ? "ending" : s.id));

// walk the whole page from top to bottom in WALK_S seconds, as smooth scrolling would, recording every frame
function sweep(api) {
  return new Promise((done) => {
    const maxY = document.documentElement.scrollHeight - innerHeight, nSeg = segNames().length;
    const gl = api.renderer.getContext(), gpu = gpuTimer(gl), rec = [];
    let t0 = null, prev = null;
    api.hooks.before = (now) => {
      if (t0 === null) t0 = now;
      scrollTo({ top: Math.min(1, (now - t0) / (WALK_S * 1000)) * maxY, behavior: "instant" });
      gpu?.begin();
    };
    api.hooks.after = (now, cpu) => {
      const i = api.renderer.info.render;
      rec.push({ dt: prev === null ? null : now - prev, cpu, seg: Math.min(nSeg - 1, Math.floor(api.walkAt())), calls: i.calls, tris: i.triangles });
      gpu?.end(rec.length - 1); gpu?.poll(rec);
      prev = now;
      if (now - t0 < WALK_S * 1000) return;
      api.hooks.before = api.hooks.after = null;
      (async () => { for (let k = 0; k < 10; k++) { await nextFrame(); gpu?.poll(rec); } done(rec); })();
    };
  });
}

// how long one frame takes at each stop when it does not wait for the screen: draw, then read one pixel back
// (that waits until the GPU has finished). Lower is better; 16.7 ms fits 60 frames a second, 8.3 ms fits 120.
async function stopCosts(api) {
  const gl = api.renderer.getContext(), px = new Uint8Array(4), out = [];
  const secs = [...document.querySelectorAll("[data-step]")], names = segNames();
  api.hooks.paused = true;
  await nextFrame();
  for (let k = 0; k < secs.length; k++) {
    scrollTo({ top: k === 0 ? 0 : api.holdY(secs[k].id), behavior: "instant" });
    api.snap();
    for (let w = 0; w < 4; w++) { api.frame(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }   // new shaders, uploads
    await nextFrame();
    const ts = [];
    for (let r = 0; r < 15; r++) { const a = performance.now(); api.frame(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - a); }
    const i = api.renderer.info.render;
    out.push({ name: names[k], ms: pct(ts, 50), calls: i.calls, tris: i.triangles });
    await nextFrame();
  }
  api.hooks.paused = false;
  return out;
}

function summary(rec, refresh) {
  const dts = rec.map((r) => r.dt).filter((d) => d !== null), cpu = rec.map((r) => r.cpu), gpu = rec.map((r) => r.gpu).filter((g) => g != null);
  const total = dts.reduce((a, b) => a + b, 0);
  return {
    frames: dts.length, fps: dts.length / (total / 1000), med: pct(dts, 50), p95: pct(dts, 95), p99: pct(dts, 99), worst: max(dts),
    dropped: dts.filter((d) => d > 1.5 * refresh).length / Math.max(1, dts.length),
    cpu: pct(cpu, 50), cpu95: pct(cpu, 95), gpu: gpu.length ? pct(gpu, 50) : null, gpu95: gpu.length ? pct(gpu, 95) : null,
    calls: max(rec.map((r) => r.calls)), tris: max(rec.map((r) => r.tris)),
  };
}

function environment(api) {
  const gl = api.renderer.getContext(), dbg = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    when: new Date().toISOString().slice(0, 16).replace("T", " "),
    ua: navigator.userAgent,
    gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    screen: `${innerWidth}×${innerHeight} CSS px, device pixel ratio ${devicePixelRatio}`,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    timer: !!gl.getExtension("EXT_disjoint_timer_query_webgl2"),
  };
}

/* ---------------- one setting (this page load) ---------------- */
async function runOne(api) {
  history.scrollRestoration = "manual";
  scrollTo({ top: 0, behavior: "instant" });
  const ov = overlay();
  let hidden = false;
  addEventListener("visibilitychange", () => { if (document.hidden) hidden = true; });
  ov.say(`${state.i + 1} of ${state.plan.length}: ${current.label}`, "loading");
  await document.fonts.ready; await api.photosLoaded(); await frames(30);
  const ready = performance.now();
  ov.say(null, "measuring the screen's refresh");
  api.hooks.paused = true; const refresh = pct(await intervals(40), 50); api.hooks.paused = false;
  ov.say(null, "1st walk (cold: shaders and textures are new)");
  const cold = await sweep(api);
  ov.say(null, "frame cost at each stop");
  const stops = await stopCosts(api);
  scrollTo({ top: 0, behavior: "instant" }); api.snap(); await frames(20);
  ov.say(null, "2nd walk (warm)");
  const warm = await sweep(api);
  const names = segNames();
  const segs = names.map((name, k) => ({ name, ...summary(warm.filter((r) => r.seg === k), refresh) }));
  const r = api.renderer;
  state.results.push({
    id: current.id, label: current.label, dpr: r.getPixelRatio(), refresh, build: api.timing.build, ready,
    cold: summary(cold, refresh), warm: summary(warm, refresh), segs, stops,
    programs: r.info.programs?.length ?? null, geometries: r.info.memory.geometries, textures: r.info.memory.textures, hidden,
  });
  if (state.i === 0) state.env = environment(api);
  state.i++; save(state);
  location.replace(state.i < state.plan.length ? `?bench=run&n=${state.i}` : "?bench=done");
}

/* ---------------- UI ---------------- */
const CSS = `
.bn-wrap { position: fixed; inset: 0; z-index: 50; overflow: auto; overscroll-behavior: contain; background: rgb(14 18 28 / .55); font: 15px/1.45 Archivo, system-ui, sans-serif; color: #27313B; }
.bn { max-width: 860px; margin: 24px auto; padding: 22px 24px 26px; background: #EEF0EE; border-radius: 6px; }
.bn h2 { margin: 0 0 6px; font-size: 22px; font-weight: 600; }
.bn h3 { margin: 22px 0 6px; font-size: 16px; font-weight: 600; }
.bn p, .bn li { margin: 6px 0; } .bn ul { padding-left: 20px; margin: 6px 0; }
.bn label { display: block; margin: 5px 0; } .bn small, .bn .muted { color: #5b6670; }
.bn button, .bn a.bn-btn { font: inherit; padding: 9px 16px; margin: 12px 10px 0 0; border: 1px solid #27313B; border-radius: 4px; background: #27313B; color: #EEF0EE; cursor: pointer; text-decoration: none; display: inline-block; }
.bn button.bn-alt, .bn a.bn-btn.bn-alt { background: transparent; color: #27313B; }
.bn .scroll { overflow-x: auto; } .bn table { border-collapse: collapse; margin: 8px 0; font-size: 13px; font-variant-numeric: tabular-nums; }
.bn th, .bn td { padding: 4px 8px; border-bottom: 1px solid #c9cfd4; text-align: right; white-space: nowrap; } .bn th:first-child, .bn td:first-child { text-align: left; white-space: normal; min-width: 10em; }
.bn th { font-weight: 600; } .bn details { margin: 8px 0; } .bn summary { cursor: pointer; font-weight: 600; }
.bn .warn { background: #f3e2c4; padding: 6px 10px; border-radius: 4px; }
.bn-run { position: fixed; inset: 0; z-index: 50; touch-action: none; }
.bn-run div { position: absolute; left: 12px; right: 12px; top: 12px; margin: auto; max-width: 560px; padding: 10px 14px; border-radius: 6px; background: rgb(238 240 238 / .92); color: #27313B; font: 14px/1.4 Archivo, system-ui, sans-serif; }
.bn-run button { font: inherit; margin-top: 6px; padding: 4px 10px; border: 1px solid #27313B; background: transparent; border-radius: 4px; color: inherit; }
html.bn-on .lab { display: none; }`;
function addCSS() { const s = document.createElement("style"); s.textContent = CSS; document.head.append(s); html.classList.add("bn-on"); }
const html = document.documentElement;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function overlay() {
  addCSS();
  const el = document.createElement("div");
  el.className = "bn-run";
  el.innerHTML = `<div><b>Benchmark running</b> <span class="t"></span><br><span class="s"></span><br>
    <small>Please don't touch the screen or switch tabs. Keep the device plugged in and out of Low Power Mode.</small><br><button type="button">Stop</button></div>`;
  document.body.append(el);
  addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
  addEventListener("keydown", (e) => { if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"].includes(e.key)) e.preventDefault(); });
  el.querySelector("button").onclick = () => { sessionStorage.removeItem(KEY); location.replace("?bench"); };
  return { say(t, s) { if (t) el.querySelector(".t").textContent = "· " + t; el.querySelector(".s").textContent = s; } };
}

const f1 = (v) => (v == null ? "–" : v.toFixed(1)), f0 = (v) => (v == null ? "–" : Math.round(v).toString());
const kt = (v) => (v == null ? "–" : `${(v / 1000).toFixed(0)}k`), pc = (v) => (v == null ? "–" : `${(v * 100).toFixed(1)}%`);

// the results as tables: HTML for the page, plain text for the clipboard
function tables(res) {
  const R = res.results;
  const main = {
    head: ["Setting", "Frame cost* ms (avg of stops)", "fps", "p95 ms", "dropped", "JS ms", "GPU ms", "calls", "triangles", "1st walk dropped", "1st walk worst ms", "build ms", "pixel ratio"],
    rows: R.map((r) => [r.label, f1(r.stops.reduce((a, s) => a + s.ms, 0) / r.stops.length), f0(r.warm.fps), f1(r.warm.p95), pc(r.warm.dropped), f1(r.warm.cpu), f1(r.warm.gpu),
      f0(r.warm.calls), kt(r.warm.tris), pc(r.cold.dropped), f0(r.cold.worst), f0(r.build), r.dpr]),
  };
  const names = R[0]?.stops.map((s) => s.name) || [];
  const stops = { head: ["Frame cost* ms", ...names], rows: R.map((r) => [r.label, ...r.stops.map((s) => f1(s.ms))]) };
  const segs = R.map((r) => ({ title: r.label, head: ["Part of the walk", "fps", "p95 ms", "dropped", "JS ms", "GPU ms", "calls", "triangles"],
    rows: r.segs.map((s) => [s.name, f0(s.fps), f1(s.p95), pc(s.dropped), f1(s.cpu), f1(s.gpu), f0(s.calls), kt(s.tris)]) }));
  return { main, stops, segs };
}
const htmlTable = (t) => `<div class="scroll"><table><tr>${t.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table></div>`;
const textTable = (t) => [t.head, ...t.rows].map((r) => "| " + r.join(" | ") + " |").join("\n").replace(/\n/, "\n|" + t.head.map(() => "---|").join("") + "\n");

function resultsHTML(res) {
  const t = tables(res), e = res.env || {}, refresh = res.results[0]?.refresh;
  const warns = [];
  if (res.results.some((r) => r.hidden)) warns.push("The tab was hidden during a run: those numbers are not reliable. Run it again.");
  if (e.reducedMotion) warns.push("Reduce motion is on: the camera jumps instead of gliding, so the walk is lighter than for most visitors.");
  return `
    <p class="muted">${esc(e.when || "")} · ${esc(e.screen || "")} · screen refresh ≈ ${refresh ? (1000 / refresh).toFixed(0) : "?"} Hz · GPU: ${esc(e.gpu || "?")}</p>
    ${warns.map((w) => `<p class="warn">${esc(w)}</p>`).join("")}
    ${htmlTable(t.main)}
    <h3>Frame cost at each stop</h3>${htmlTable(t.stops)}
    <details><summary>Each part of the walk (2nd walk)</summary>${t.segs.map((s) => `<p><b>${esc(s.title)}</b></p>${htmlTable(s)}`).join("")}</details>
    <h3>How to read it</h3>
    <ul>
      <li><b>Frame cost*</b>: how long one frame takes to draw when it doesn't wait for the screen. It shows the room left over even when the fps is capped. Lower is better: under 16.7 ms fits 60 frames a second, under 8.3 ms fits 120.</li>
      <li><b>fps, p95, dropped</b>: the 2nd walk as a visitor sees it. The fps is capped by the screen (usually 60). <i>Dropped</i> counts frames that took over 1.5× the screen's refresh: these are the visible stutters. <i>p95</i>: 95% of frames were faster than this.</li>
      <li><b>JS ms</b>: time spent in the site's own code per frame (the processor). <b>GPU ms</b>: the graphics chip, where the browser lets a page measure it (not on Safari).</li>
      <li><b>1st walk</b>: right after loading, when shaders are compiled and images uploaded. Stutters here are what a first visit feels.</li>
      <li>Phones slow down when they get warm: if the last setting looks worse than expected, run that one again on its own.</li>
    </ul>`;
}
function resultsText(res) {
  const t = tables(res), e = res.env || {};
  return [`P1 benchmark, ${e.when}`, `Device: ${e.ua}`, `GPU: ${e.gpu}`, `Screen: ${e.screen}; refresh ≈ ${res.results[0] ? (1000 / res.results[0].refresh).toFixed(0) : "?"} Hz; reduced motion: ${e.reducedMotion}`, "",
    textTable(t.main), "", textTable(t.stops), "", ...t.segs.flatMap((s) => [s.title, textTable(s), ""])].join("\n");
}

function panel(api) {
  addCSS();
  api.hooks.paused = true;                                      // the house rests behind the panel
  let done = params.get("bench") === "done" && state?.results?.length ? state : null;
  if (done) { try { localStorage.setItem(LAST, JSON.stringify(done)); } catch {} sessionStorage.removeItem(KEY); }
  let last = done;
  if (!last) { try { last = JSON.parse(localStorage.getItem(LAST) || "null"); } catch {} }
  const wrap = document.createElement("div");
  wrap.className = "bn-wrap";
  const opts = CONFIGS.map((c) => {
    const same = c.o.dpr && dprOf(c) === siteDpr() ? " <small>(the same as the site on this screen)</small>" : "";
    return `<label><input type="checkbox" value="${c.id}" ${c.on ? "checked" : ""}> ${esc(c.label)}${same}</label>`;
  }).join("");
  wrap.innerHTML = `<div class="bn" role="dialog" aria-label="Benchmark">
    <h2>Benchmark</h2>
    <p>The house walks itself through twice for each setting and measures every frame. Each setting reloads the page, so it starts fresh. It takes about ${WALK_S * 2 + 12} seconds per setting.</p>
    <p class="muted">Before you start: plug the device in, turn Low Power Mode off, close other tabs, and don't touch the screen while it runs. The results stay on this device.</p>
    <h3>Settings</h3>${opts}
    <p class="muted">The what-ifs are not on the site. They measure possible speed-ups (see the notes in docs/decisions.md) before deciding on them.</p>
    <button type="button" class="go">Start</button><a class="bn-btn bn-alt" href="${location.pathname}">Back to the site</a>
    <div class="res">${last ? `<h3>${done ? "Results" : "Last results"}</h3>${resultsHTML(last)}<button type="button" class="copy">Copy results</button><span class="copied muted"></span>` : ""}</div>
  </div>`;
  document.body.append(wrap);
  wrap.querySelector(".go").onclick = () => {
    const plan = [...wrap.querySelectorAll("input:checked")].map((i) => i.value);
    if (!plan.length) return;
    save({ plan, i: 0, results: [] });
    location.replace("?bench=run&n=0");
  };
  wrap.querySelector(".copy")?.addEventListener("click", async () => {
    const txt = resultsText(last), note = wrap.querySelector(".copied");
    try { await navigator.clipboard.writeText(txt); note.textContent = " Copied."; }
    catch {                                                     // no clipboard access: show it to copy by hand
      const ta = Object.assign(document.createElement("textarea"), { value: txt, rows: 12 }); ta.style.width = "100%";
      wrap.querySelector(".res").append(ta); ta.select(); note.textContent = " Select all and copy.";
    }
  });
}

export function start(api) {
  if (running) runOne(api).catch((e) => { console.error(e); sessionStorage.removeItem(KEY); alert(`Benchmark stopped: ${e.message}`); });
  else panel(api);
}
