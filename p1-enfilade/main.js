import * as THREE from "three";
import { initLab, reducedMotion } from "../shared/kit.js";
import { E, LOOK, clamp, applyPalette, PALETTES } from "./common.js";
import { buildWorld, disposeWorld } from "./world.js";
import { paintAll, placePhoto, photosLoaded } from "./boards.js";
import { initWalk, setWorld, measureAnchors, scroll, stepAtScroll, pose, holdY, phone, wrapA } from "./walk.js";
import { ART, createArtPass } from "./post.js";
import { openSheet, justClosed } from "./explore.js";

/* P1 Enfilade: a line-drawn house you walk through. Only the entrance is HTML; every other section hangs on a wall
   (photo + text drawn into the scene). The camera walks up to each wall, turns, holds still and the photo moves aside to
   reveal the text. The page text (screen readers, the plain page) is filled by page.js, which loads first.
   Files: common.js (sizes, the decided look, materials, house colours), world.js (builds the house, lake and sky),
   layouts.js (the plan and walking route), boards.js (the wall boards), walk.js (scroll → camera), merge.js (speed),
   post.js (art styles), explore.js (the project sheet), bench.js (?bench: the benchmark). */

const CV = window.CV;
const $ = (s) => document.querySelector(s);
const html = document.documentElement;

// ?bench: the benchmark sets some options itself (speed, art style, pixel ratio, …) and drives the walk
const bench = new URLSearchParams(location.search).has("bench") ? await import("./bench.js") : null;
const BX = bench?.overrides() || {};

/* ================= renderer, scene ================= */
const canvas = $("#world");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", logarithmicDepthBuffer: BX.logDepth ?? true });
renderer.setPixelRatio(BX.dpr ?? Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.info.autoReset = false;          // the art styles render three times a frame: count the whole frame (reset in frame())

const scene = new THREE.Scene();
const air = new THREE.Color(LOOK.air), duskAir = new THREE.Color(0x2e3a55);
scene.background = air.clone();
scene.fog = new THREE.FogExp2(LOOK.air, LOOK.fog);
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 700);
camera.position.set(0.35, E, 4);
const hemi = new THREE.HemisphereLight(LOOK.hemiSky, 0x6f7780, LOOK.hemi);
scene.add(hemi);
const sun = new THREE.DirectionalLight(LOOK.sunColor, LOOK.sun);       // the moon, really
sun.position.set(-4, 12, 6);
scene.add(sun);
const art = createArtPass(renderer, scene, camera);
initWalk(camera);
html.dataset.night = "1";                                              // page text turns light on the night sky (style.css)

/* lamps (panel: Q): the light over each wall board and the room lights (colour, strength) */
const LAMPS = {
  warm: { label: "Q2 Warm white", board: 0xffe2bd, room: 0xffdcae, k: 0.8 },
  neutral: { label: "Q3 Neutral white", board: 0xfff4ea, room: 0xfff0e0, k: 0.75 },
  cool: { label: "Q4 Cool daylight", board: 0xe8f0ff, room: 0xe6eeff, k: 0.75 },
  dim: { label: "Q5 Soft and dim (neutral)", board: 0xfff4ea, room: 0xfff0e0, k: 0.35 },
  off: { label: "Q6 Off (room lights only)", board: 0xffffff, room: 0xfff0e0, k: 0 },
};
let LAMP = LAMPS.warm;
function applyLamps() {
  for (const s of W.stations) { s.lamp.color.set(LAMP.board); s.lamp.intensity = 5 * LAMP.k; }
  for (const pl of W.fx.rooms) { pl.color.set(LAMP.room); pl.intensity = pl.userData.base * Math.max(LAMP.k, 0.35); }   // rooms still light up at night
}
const SPEEDS = {
  fast: { label: "S2 Faster: still parts drawn together (looks the same)", merge: true },
  plain: { label: "S1 As before: every part drawn on its own", merge: false },
};

/* ================= the world ================= */
let W = null;                                     // { group, L, stations, fx, dust } from world.js
const timing = { build: 0 };
function build(merge) {
  if (W) { scene.remove(W.group); disposeWorld(W); }
  const t0 = performance.now();
  W = buildWorld({ merge });
  timing.build = performance.now() - t0;
  scene.add(W.group);
  setWorld(W);
  document.fonts.ready.then(() => paintAll(W.stations));
  requestAnimationFrame(measure);
}

function measure() {
  measureAnchors();
  renderer.setSize(innerWidth, innerHeight, false);
  art.resize();
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < 760 ? 64 : 52;
  camera.updateProjectionMatrix();
}

/* ================= page events ================= */
const mouse = { x: 0, y: 0 };
addEventListener("pointermove", (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; });
// resize: the sections are in vh, so a phone turned sideways changes every length in px; stay at the same place in the walk
// (by the time "resize" fires the browser has already clamped scrollY to the new height, so use the place from the last frame)
let walkAt = null;
addEventListener("resize", () => {
  const was = walkAt, h0 = scroll.pageH;
  measure();
  if (was === null || Math.abs(document.documentElement.scrollHeight - h0) < 2) return;   // (address bar showing/hiding: no change)
  const A = scroll.anchors, k = Math.min(Math.floor(was), A.length - 2), f = was - k;
  scrollTo({ top: A[k] + f * (A[k + 1] - A[k]), behavior: "instant" });
});

// the menu (About, Work, …) goes to where the camera holds at that wall with its text out (walk.js holdY)
const plainPage = () => html.classList.contains("no-gl");     // main.js failed after starting: index.html shows the plain page
$(".bar").addEventListener("click", (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link || plainPage()) return;
  e.preventDefault();
  const id = link.getAttribute("href").slice(1);
  scrollTo({ top: id === "top" ? 0 : holdY(id), behavior: reducedMotion ? "instant" : "smooth" });
  history.replaceState(null, "", id === "top" ? location.pathname + location.search : `#${id}`);
});
// main.js is imported dynamically, so the page may already have loaded by now
const onLoad = () => {
  if (plainPage()) return;
  measure();
  const id = window.startHash;                        // set (and taken off the address) by content.js
  if (!id) return;
  scrollTo({ top: holdY(id), behavior: "instant" });
  history.replaceState(null, "", `#${id}`);
  snapCam = true;                                      // stand there at once instead of flying through the house
};
if (document.readyState === "complete") requestAnimationFrame(onLoad); else addEventListener("load", onLoad);
// a #wall typed into the address bar (or back/forward between them)
addEventListener("hashchange", () => {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!plainPage() && id && document.getElementById(id)?.dataset.step) { scrollTo({ top: holdY(id), behavior: "instant" }); snapCam = true; }
});

// the last text is clickable (email); a project board opens its sheet (explore.js)
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function aim(e) { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); }
function contactHit(e) {
  const st = W.stations.find((s) => s.info.contact);
  aim(e);
  return ray.intersectObject(st.board).length > 0;
}
function projectHit(e) {                   // the project board under the pointer, if it is near enough to read
  aim(e);
  const sts = W.stations.filter((s) => s.info.project);
  const hit = ray.intersectObjects(sts.map((s) => s.board), false)[0];
  return hit && hit.distance < 16 ? sts.find((s) => s.board === hit.object) : null;
}
addEventListener("pointermove", (e) => { if (e.target === canvas) canvas.classList.toggle("pointer", contactHit(e) || !!projectHit(e)); });
addEventListener("click", (e) => {
  if (e.target !== canvas || justClosed()) return;
  if (contactHit(e)) { location.href = `mailto:${CV.email}`; return; }
  const st = projectHit(e);
  if (st) openSheet(st.info.project);
});

// the hint under a project board (desktop; phones have the button in the card)
const dhint = document.createElement("p");
dhint.className = "dhint"; dhint.setAttribute("aria-hidden", "true"); dhint.textContent = CV.ui.clickHint;
document.body.append(dhint);
const updateHint = (target) => dhint.classList.toggle("on", !!target.st?.info.project && !phone() && target.reveal > 0.6);

// the phone card: the text of the wall the camera is holding at (copied from its screen-reader section)
const card = $(".card");
let cardStep = null;
function updateCard(target) {
  const step = phone() && target.st && target.reveal > 0.3 ? target.st.step : null;
  if (step === cardStep) return;
  cardStep = step;
  if (step) {
    card.innerHTML = (document.getElementById(step)?.innerHTML || "").replace(/ id="[^"]*"/g, "");
    card.querySelectorAll("a, button").forEach((n) => (n.tabIndex = -1));   // a copy for the eyes; keyboard users have the sections
    card.scrollTop = 0;
  }
  card.classList.toggle("on", !!step);
}

// slow device: if frames stay slow (>45 ms, ~22 fps) for 3 s while visible, drop to 1 pixel per CSS pixel, once
let slowFor = 0, lastT = 0;
function watchSpeed(t) {
  const dt = t - lastT; lastT = t;
  if (bench || renderer.getPixelRatio() <= 1 || document.hidden || dt > 0.5) return;   // (not while benchmarking)
  slowFor = dt > 0.045 ? slowFor + dt : 0;
  if (slowFor > 3) { renderer.setPixelRatio(1); measure(); }
}

// ?stats in the address: a small readout of frame rate, draw calls and triangles (to compare the speed settings)
const stats = new URLSearchParams(location.search).has("stats") ? Object.assign(document.createElement("pre"), { className: "stats" }) : null;
if (stats) { document.body.append(stats); window.p1scene = scene; }      // ?stats only: the scene for a closer look in the console
let statN = 0, statT = 0;
function showStats(t) {
  statN++;
  if (t - statT < 1) return;
  const i = renderer.info.render;
  stats.textContent = `${(statN / (t - statT)).toFixed(0)} fps\n${i.calls} draw calls\n${(i.triangles / 1000).toFixed(0)}k triangles\n${i.lines} lines`;
  window.p1stats = { fps: statN / (t - statT), calls: i.calls, triangles: i.triangles, lines: i.lines, objects: scene.children.length };
  statN = 0; statT = t;
}

/* ================= each frame ================= */
const cam = { pos: new THREE.Vector3(0.35, E, 4), yaw: 0, pitch: 0 };
let lastFrame = 0, snapCam = false;
let mYaw = 0, mPitch = 0;
const clock = new THREE.Clock();
function frame() {
  const t = clock.getElapsedTime();
  renderer.info.reset();
  watchSpeed(t);
  walkAt = stepAtScroll(scrollY);
  const target = pose(walkAt);
  updateCard(target);
  updateHint(target);
  // the camera follows its target; time-based, so 30, 60 and 120 Hz screens move alike (0.075 per frame at 60 fps)
  const dt = Math.min(0.1, t - lastFrame); lastFrame = t;
  const per = (x) => 1 - Math.pow(1 - x, dt * 60);           // a per-frame (60 fps) factor for this frame's length
  const ease = reducedMotion || snapCam ? 1 : per(0.075);
  snapCam = false;
  cam.pos.lerp(target.pos, ease);
  cam.yaw += wrapA(target.yaw - cam.yaw) * ease;
  cam.pitch += (target.pitch - cam.pitch) * ease;
  const free = 1 - target.still;                       // hold the view still at a wall
  mYaw += ((-mouse.x * 0.12 * free) - mYaw) * per(0.05);
  mPitch += ((-mouse.y * 0.05 * free) - mPitch) * per(0.05);
  camera.position.copy(cam.pos);
  if (!reducedMotion) camera.position.y += Math.sin(t * 0.6) * 0.012 * free;
  camera.rotation.set(cam.pitch + mPitch, cam.yaw + mYaw, 0, "YXZ");

  for (const st of W.stations) {                       // the photo moves aside once the camera holds
    const p = st === target.st ? (reducedMotion ? 1 : target.reveal) : 0;
    st.p += (p - st.p) * per(0.2);
    placePhoto(st, st.p);
  }

  // the night air; at the end, on the balcony looking up, the sky darkens and the stars come out
  const fx = W.fx, dusk = target.dusk;
  scene.background.copy(air);
  if (dusk) scene.background.lerp(duskAir, dusk);
  scene.fog.color.copy(scene.background);
  scene.fog.density = LOOK.fog;
  sun.intensity = LOOK.sun * (1 - 0.85 * dusk);
  hemi.intensity = LOOK.hemi * (1 - 0.6 * dusk);
  fx.dome.material.color.setScalar(1 - 0.78 * dusk);
  fx.stars.material.opacity = dusk;
  if (!reducedMotion) {
    W.dust.rotation.y = Math.sin(t * 0.05) * 0.01; W.dust.position.y = Math.sin(t * 0.2) * 0.08;
    fx.water.offset.set(t * 0.004, t * 0.0025);
    fx.boat.position.y = -0.5 + Math.sin(t * 1.1) * 0.03; fx.boat.rotation.z = Math.sin(t * 0.8) * 0.02;
  }
  art.render(clamp(LOOK.sun / 1.6) * (1 - dusk));          // the art styles keep night as night
  if (stats) showStats(t);
}
// the benchmark's hooks: pause the loop, run something before / after each frame
const hooks = { paused: false, before: null, after: null };
function loop(now) {
  if (!html.classList.contains("locked") && !hooks.paused) {   // a sheet or the viewer covers it: rest
    hooks.before?.(now);
    const c0 = performance.now();
    frame();
    hooks.after?.(now, performance.now() - c0);
  }
  requestAnimationFrame(loop);
}

/* ================= options panel ================= */
// decided (2026-11-15): everything else is fixed (see common.js LOOK, layouts.js, boards.js); these stay switchable
initLab({
  defaults: { l: "warm", y: "current", k: "drafting", f: "fast", i: "webp" },
  groups: {
    l: { label: "Lamps", options: Object.entries(LAMPS).map(([k, v]) => [k, v.label]) },
    y: { label: "Art style", options: Object.entries(ART).map(([k, v]) => [k, v.label]) },
    k: { label: "House colours", options: Object.entries(PALETTES).map(([k, v]) => [k, v.label]) },
    f: { label: "Speed (add ?stats to the address for a frame-rate readout, ?bench for a benchmark)", options: Object.entries(SPEEDS).map(([k, v]) => [k, v.label]) },
    i: { label: "Images", options: [["webp", "I2 WebP (about 40% smaller download)"], ["jpeg", "I1 JPEG (as before)"]] },
  },
  storageKey: "p1-lake3",
  title: "Options",
  backHref: location.hostname.endsWith("github.io") ? null : "../index.html",   // the hosted copy has no prototype list
  onChange: (picked) => {
    const s = { ...picked, ...BX };
    LAMP = LAMPS[s.l] || LAMPS.warm;
    applyPalette(s.k); art.setStyle(s.y);
    const key = `${s.f}|${s.i}`;                          // speed and image format rebuild the scene
    if (key !== W?.key) { build((SPEEDS[s.f] || SPEEDS.fast).merge); W.key = key; }
    else paintAll(W.stations);
    const m = LOOK.moon;                                  // the art styles shade the faces turned from the moon
    art.apply(W.group, { bounds: W.L.bounds, sun: new THREE.Vector3(m[0], m[1], -520) });
    applyLamps();
  },
});
measure();
requestAnimationFrame((now) => { canvas.classList.add("ready"); loop(now); });
bench?.start({ renderer, camera, hooks, frame, timing, photosLoaded, holdY, snap: () => (snapCam = true), walkAt: () => walkAt });
