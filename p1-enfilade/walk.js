import * as THREE from "three";
import { E, CW, PW, STEPS, clamp, ss } from "./common.js";

/* Scroll → camera. Each [data-step] section of the page is one leg: walk from the last wall to the next (the first part of
   the section), turn to it and hold still while its photo moves aside. The last leg walks out onto the balcony and looks up
   at the sky, where the contact text hangs among the stars. */

let W = null, camera = null;
export const scroll = { anchors: [], pageH: 0 };     // the sections' tops in px (and the end), the page height

export function initWalk(cam) { camera = cam; }
export function setWorld(w) { W = w; curves.clear(); }

export function measureAnchors() {
  scroll.pageH = document.documentElement.scrollHeight;
  scroll.anchors = [...document.querySelectorAll("[data-step]")].map((s) => s.getBoundingClientRect().top + scrollY);
  scroll.anchors.push(document.documentElement.scrollHeight - innerHeight);
  curves.clear();
}
// where in the walk a scroll position is: leg k (0 = the entrance) plus how far along it
export function stepAtScroll(y) {
  const A = scroll.anchors;
  for (let k = 0; k < A.length - 1; k++) {
    if (y < A[k + 1]) return k + Math.max(0, (y - A[k]) / (A[k + 1] - A[k]));
  }
  return A.length - 1;
}

const v3 = (p, eye = E) => new THREE.Vector3(p[0], p[1] + eye, p[2]);
const tanHalf = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
// phones (portrait): stand close and face the photo; the board's text is shown as a card at the bottom instead
export const phone = () => camera.aspect < 0.85;
// distance from a wall so the whole board fits the screen
const viewDist = () => phone() ? 4.3 : Math.max(3.3, (CW / 2 + 0.25) / (tanHalf() * camera.aspect));
export const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const angLerp = (a, b, t) => a + wrapA(b - a) * t;

function holdOf(i) {          // where the camera stands to read stop i (-1 = the entrance)
  const L = W.L;
  if (i < 0) return { pos: v3(L.start), yaw: 0 };
  const s = L.stops[i], d = viewDist(), st = W.stations[i];
  const side = phone() && st?.info.photo ? st.pd * (CW - PW) / 2 : 0;    // phones: in front of where the photo ends up
  return { pos: new THREE.Vector3(s.c[0] + s.n[0] * d + s.n[1] * side, s.c[1] + E, s.c[2] + s.n[1] * d - s.n[0] * side), yaw: Math.atan2(s.n[0], s.n[1]) };
}
const curves = new Map();
function legCurve(i) {        // walking line from stop i-1 to stop i (i = STEPS.length → to the exit sill)
  if (curves.has(i)) return curves.get(i);
  const L = W.L, from = holdOf(i - 1).pos, isExit = i === STEPS.length;
  const via = (isExit ? L.exit.via : L.stops[i].via).map((p) => v3(p));
  const to = isExit ? v3(L.exit.sill) : holdOf(i).pos;
  const curve = new THREE.CatmullRomCurve3([from, ...via, to], false, "centripetal");
  const len = curve.getLength();
  const out = { curve, a: clamp(0.18 + len / 90, 0.28, 0.55) };     // a: the part of the leg spent walking
  curves.set(i, out);
  return out;
}
function walk(i, u, fromYaw, toYaw) {
  const { curve } = legCurve(i), p = curve.getPointAt(u), tg = curve.getTangentAt(u);
  const ty = Math.atan2(-tg.x, -tg.z);
  let yaw = angLerp(fromYaw, ty, ss(0, 0.2, u));
  yaw = angLerp(yaw, toYaw, ss(0.7, 1, u));
  return { pos: p, yaw };
}

/* the camera's target at a point of the walk: position, yaw, pitch, still (0 walking … 1 holding), the board being read,
   reveal (its photo moving aside, 0 … 1) and dusk (the ending: the sky darkens, the stars come out) */
export function pose(stepF) {
  const L = W.L, fx = W.fx;
  const out = { pos: v3(L.start), yaw: 0, pitch: 0, still: 0, st: null, reveal: 0, dusk: 0 };
  const r = Math.min(STEPS.length + 1, Math.floor(stepF)), f = clamp(stepF - r);
  if (r === 0) return out;
  if (r <= STEPS.length) {                                     // walk to a wall, then hold still
    const i = r - 1, { a } = legCurve(i), from = holdOf(i - 1), to = holdOf(i);
    if (f < a) { const w = walk(i, ss(0, a, f), from.yaw, to.yaw); out.pos = w.pos; out.yaw = w.yaw; }
    else { out.pos = to.pos; out.yaw = to.yaw; }
    out.still = ss(a - 0.04, a + 0.04, f);
    if (phone()) out.pitch = -0.14 * out.still;                  // look down a little: the board sits above the card
    out.st = W.stations[i]; out.reveal = ss(a + 0.05, a + 0.25, f);
    return out;
  }
  // the last leg: walk to the exit, step onto the balcony, look up at the sky
  const i = STEPS.length, { a } = legCurve(i), from = holdOf(i - 1);
  const [dx, dz] = L.exit.dir, outYaw = Math.atan2(-dx, -dz);
  out.st = W.stations[STEPS.length];
  if (f < a) { const w = walk(i, ss(0, a, f), from.yaw, outYaw); out.pos = w.pos; out.yaw = w.yaw; return out; }
  const g = (f - a) / (1 - a), sill = v3(L.exit.sill);
  out.pos = sill.clone().lerp(v3(fx.balcony), ss(0, 0.2, g));
  out.yaw = fx.skyYaw;
  out.pitch = 0.4 * ss(0.3, 0.65, g);
  out.dusk = ss(0.05, 0.7, g); out.still = ss(0.62, 0.7, g); out.reveal = ss(0.7, 0.9, g);
  return out;
}

// the menu (About, Work, …): a section's top is where the walk *to* its wall starts, so go to where the camera holds
// at that wall with its text out instead; the same for a #link opened from outside
export function holdY(id) {
  const k = [...document.querySelectorAll("[data-step]")].findIndex((s) => s.id === id), A = scroll.anchors;
  if (k < 1 || !W) return 0;
  const { a } = legCurve(k - 1);
  const f = k <= STEPS.length ? Math.min(0.9, a + 0.32) : a + 0.92 * (1 - a);     // walls: text revealed; the last: the sky text
  return A[k] + f * (A[k + 1] - A[k]);
}
