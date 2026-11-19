import * as THREE from "three";
import { initLab, reducedMotion } from "../shared/kit.js";
import { lakeHouse, SHAPES } from "./layouts.js";
import { ART, createArtPass } from "./post.js";
import { openSheet, pic, justClosed } from "./explore.js";

/* P1 Enfilade: a line-drawn house you walk through. Only the entrance is HTML; every other section
   hangs on a wall (photo + text drawn into the scene). The camera walks up to each wall, turns,
   holds still and the photo moves aside to reveal the text (F04 inside the scene). */

const CV = window.CV;
const IMG = "../shared/img/";
const $ = (s) => document.querySelector(s);
const html = document.documentElement;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

/* the HTML sections (screen readers + scroll length) are filled by page.js, which loads first */

/* ================= endings ================= */
const ENDINGS = {
  plan: "G1 rise above: the layout becomes a plan",
  sky: "G2 dusk on the balcony: look up, text among the stars",
};
const SKINS = {
  plan: { bg: "#EEF0EE", ink: "#27313B" },
  sky: { clear: true, ink: "#F6F1E4" },
};

/* ================= renderer ================= */
const H = 3.4, UP = 3.6, T = 0.16, E = 1.62;     // wall height, upper floor level, wall thickness, eye height
const CW = 4.4, CH = 2.3, PW = 2.4;              // wall board size, photo width after the reveal
const C = { fog: 0xa9b0b8, garden: 0xcdd6c6, chalk: 0xeef0ee, slate: 0x27313b, sodium: 0xe9b44c };

const canvas = $("#world");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const fogIn = new THREE.Color(C.fog), fogOut = new THREE.Color(C.garden), duskAir = new THREE.Color(0x2e3a55);
scene.background = fogIn.clone();
scene.fog = new THREE.FogExp2(C.fog, 0.034);
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 700);
camera.position.set(0.35, E, 4);
const hemi = new THREE.HemisphereLight(0xf2f4f6, 0x6f7780, 1.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e0, 0.6);
sun.position.set(-4, 12, 6);
scene.add(sun);

const wallMat = new THREE.MeshStandardMaterial({ color: 0xbcc3ca, roughness: 0.95, transparent: true, opacity: 0.42 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0xd6e2e6, roughness: 0.1, transparent: true, opacity: 0.14 });
const lineMat = new THREE.LineBasicMaterial({ color: C.slate });
const sketchMat = new THREE.LineBasicMaterial({ color: C.slate, transparent: true, opacity: 0.6 });
const stepMat = new THREE.MeshStandardMaterial({ color: 0xc4cad0, roughness: 1 });
const leafA = new THREE.MeshStandardMaterial({ color: 0x6e8c5e, roughness: 1, flatShading: true });
const leafB = new THREE.MeshStandardMaterial({ color: 0x86a272, roughness: 1, flatShading: true });
const bark = new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 1 });
const shared = new Set([wallMat, glassMat, lineMat, sketchMat, stepMat, leafA, leafB, bark]);

const art = createArtPass(renderer, scene, camera);

let world = new THREE.Group();
scene.add(world);

/* house colours: walls, drawing ink, floor, stairs/dock and the furniture materials.
   Lamps (warm glow) and plant leaves stay the same in every palette. */
const PALETTES = {
  drafting: { label: "K1 Drafting grey-blue", wallSee: 0xbcc3ca, wallSolid: 0xd9dbd8, ink: 0x27313b, floor: "#B9BFC6", grid: "rgba(39,49,59,.22)", glow: 0x3a4048, post: 0x6b5a48, step: 0xc4cad0,
    wood: 0xb08a62, fabric: 0x8c9aa6, white: 0xe6e6e1, dark: 0x3c4248, rug: 0xcdbfa6, books: [0x8c5a4a, 0x4f6e77, 0xc9a96e, 0x5f6b55, 0xa77f66] },
  concrete: { label: "K2 Concrete greys", wallSee: 0xbdbdbb, wallSolid: 0xd3d3d0, ink: 0x2b2b2b, floor: "#ABABA8", grid: "rgba(40,40,40,.22)", glow: 0x3c3c3b, post: 0x4a4a49, step: 0xc2c2bf,
    wood: 0x8e8d89, fabric: 0x6f7070, white: 0xe0e0dd, dark: 0x343434, rug: 0xbebebb, books: [0x5a5a5a, 0x7e7e7d, 0xa6a6a4, 0x474747, 0x929290] },
  graphite: { label: "K3 Graphite (dark greys)", wallSee: 0x6f7174, wallSolid: 0x606265, ink: 0xd6d8da, floor: "#4C4E51", grid: "rgba(220,222,224,.18)", glow: 0x1c1d1f, post: 0x2a2b2d, step: 0x56585b,
    wood: 0x434446, fabric: 0x8f9194, white: 0xa8aaac, dark: 0x1f2022, rug: 0x7a7c7f, books: [0xb5b7b9, 0x5a5c5f, 0x8a8c8f, 0xd0d2d4, 0x3a3b3d] },
  nordic: { label: "K4 Nordic ice", wallSee: 0xc6d3dc, wallSolid: 0xe2eaef, ink: 0x1f3448, floor: "#B6C5D0", grid: "rgba(31,52,72,.2)", glow: 0x34465a, post: 0x5d6b78, step: 0xd2dde4,
    wood: 0xc4c9c6, fabric: 0x7f9db5, white: 0xeef3f6, dark: 0x2d3f50, rug: 0xaac0d0, books: [0x3f6680, 0x7aa0b8, 0xb9cfdc, 0x2c4a5e, 0x8fa9b6] },
  primaries: { label: "K8 Gallery primaries", wallSee: 0xd4d4cf, wallSolid: 0xf0f0ea, ink: 0x1a1a1a, floor: "#D2D1CA", grid: "rgba(26,26,26,.18)", glow: 0x404040, post: 0x2a2a2a, step: 0xdedcd4,
    wood: 0xcdb98e, fabric: 0x2f4f9e, white: 0xf4f4ef, dark: 0x1a1a1a, rug: 0xd6a72c, books: [0xb8372b, 0x2f4f9e, 0xd6a72c, 0x1a1a1a, 0xe8e8e2] },
};
let PAL = PALETTES.drafting;

// a drafting-grid floor texture (1 square = 1 m), redrawn when the palette changes
const gridCanvas = document.createElement("canvas"); gridCanvas.width = gridCanvas.height = 128;
function paintGrid() {
  const g = gridCanvas.getContext("2d");
  g.fillStyle = PAL.floor; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = PAL.grid; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128);
}
paintGrid();
let floorMats = [];
function floorMat(w, d) {
  const t = new THREE.CanvasTexture(gridCanvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w, d); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 1, emissive: PAL.glow });
  floorMats.push(m);
  return m;
}

function block(parent, w, h, d, x, y, z, { fill = true, mat = lineMat, solid = null, rotY = 0 } = {}) {
  if (w <= 0.001 || h <= 0.001 || d <= 0.001) return null;
  const g = new THREE.BoxGeometry(w, h, d);
  const grp = new THREE.Group();
  if (fill) grp.add(new THREE.Mesh(g, solid || wallMat));
  if (mat) grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), mat));
  grp.position.set(x, y, z); grp.rotation.y = rotY;
  parent.add(grp);
  return grp;
}

/* ---------- building kit handed to the layouts ---------- */
const kit = {
  // a straight wall from a to b ([x, z]), y0..y1, with openings { at (m from a), w, y0, y1 } (absolute heights)
  wall(a, b, y0, y1, openings = [], { th = T, solid = null, mat = lineMat } = {}) {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), rot = -Math.atan2(dz, dx);
    const ux = dx / L, uz = dz / L;
    const piece = (s0, s1, ya, yb) => {
      if (s1 - s0 < 0.01 || yb - ya < 0.01) return;
      const m = (s0 + s1) / 2;
      block(world, s1 - s0, yb - ya, th, a[0] + ux * m, (ya + yb) / 2, a[1] + uz * m, { rotY: rot, solid, mat });
    };
    const groups = {};
    for (const o of openings) (groups[`${o.at}|${o.w}`] ||= { at: o.at, w: o.w, list: [] }).list.push(o);
    const gs = Object.values(groups).sort((p, q) => p.at - q.at);
    let s = 0;
    for (const gr of gs) {
      const s0 = gr.at - gr.w / 2, s1 = gr.at + gr.w / 2;
      piece(s, s0, y0, y1);
      let y = y0;
      for (const o of gr.list.sort((p, q) => p.y0 - q.y0)) { piece(s0, s1, y, o.y0); y = o.y1; }
      piece(s0, s1, y, y1);
      s = s1;
    }
    piece(s, L, y0, y1);
  },
  glass(a, b, y0, y1) { kit.wall(a, b, y0, y1, [], { th: 0.04, solid: glassMat, mat: sketchMat }); },
  hedge(a, b, h) { kit.wall(a, b, 0, h, [], { th: 0.9, solid: leafA, mat: sketchMat }); },
  // a floor slab whose top is at y, optionally with one rectangular opening [x0, z0, x1, z1]
  slab(x0, z0, x1, z1, y, { th = 0.2, hole = null } = {}) {
    const r = (a0, b0, a1, b1) => {
      if (a1 - a0 < 0.01 || b1 - b0 < 0.01) return;
      block(world, a1 - a0, th, b1 - b0, (a0 + a1) / 2, y - th / 2, (b0 + b1) / 2, { solid: floorMat(a1 - a0, b1 - b0), mat: sketchMat });
    };
    if (!hole) return r(x0, z0, x1, z1);
    const [hx0, hz0, hx1, hz1] = hole;
    r(x0, z0, hx0, z1); r(hx1, z0, x1, z1); r(hx0, z0, hx1, hz0); r(hx0, hz1, hx1, z1);
  },
  plinth(x0, z0, x1, z1, y) { block(world, x1 - x0, -y, z1 - z0, (x0 + x1) / 2, y / 2, (z0 + z1) / 2, { solid: stepMat, mat: sketchMat }); },
  // a straight flight of floating treads from a to b ([x, z]) rising y0 → y1
  flight(a, b, y0, y1, w = 1.2, n = 18) {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), rot = -Math.atan2(dz, dx);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, top = y0 + ((y1 - y0) * (i + (y1 > y0 ? 1 : 0))) / n;
      block(world, L / n + 0.02, 0.07, w, a[0] + dx * t, top - 0.035, a[1] + dz * t, { rotY: rot, solid: stepMat, mat: sketchMat });
    }
    const px = (-dz / L) * (w / 2), pz = (dx / L) * (w / 2);
    kit.rail([[a[0] + px, y0 + 0.9, a[1] + pz], [b[0] + px, y1 + 0.9, b[1] + pz]]);
  },
  ramp(a, b, y0, y1, w = 2) {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    const g = new THREE.BoxGeometry(Math.hypot(L, y1 - y0), 0.15, w);
    const inner = new THREE.Group();
    inner.add(new THREE.Mesh(g, stepMat), new THREE.LineSegments(new THREE.EdgesGeometry(g), sketchMat));
    inner.rotation.z = Math.atan2(y1 - y0, L);
    const outer = new THREE.Group();
    outer.add(inner);
    outer.position.set((a[0] + b[0]) / 2, (y0 + y1) / 2 - 0.075, (a[1] + b[1]) / 2);
    outer.rotation.y = -Math.atan2(dz, dx);
    world.add(outer);
  },
  rail(points, mat = lineMat) { world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p))), mat)); },
  box(w, h, d, x, y, z, rotY = 0) { block(world, w, h, d, x, y, z, { fill: false, mat: sketchMat, rotY }); },
  tree(x, z, y = 0, s = 1) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.12 * s, 1.6 * s, 7), bark);
    trunk.position.set(x, y + 0.8 * s, z);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 * s, 0), rnd() > 0.5 ? leafA : leafB);
    crown.position.set(x, y + 2.1 * s, z); crown.rotation.set(rnd(), rnd(), rnd());
    world.add(trunk, crown);
    if (LT?.bare) {                                    // bare branches with a few buds / last leaves
      crown.scale.setScalar(LT.bare);
      const pts = [];
      for (let k = 0; k < 7; k++) { const a = rnd() * 6.28, up = 0.6 + rnd() * 0.8;
        pts.push(new THREE.Vector3(x, y + 1.4 * s, z), new THREE.Vector3(x + Math.cos(a) * 1.1 * s, y + (1.4 + up) * s, z + Math.sin(a) * 1.1 * s)); }
      world.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), M.branch));
    }
    (fx.sway ||= []).push([crown, crown.rotation.z, rnd() * 6]);
    if (LT?.snow) { const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 * s, 0), M.snow); cap.position.set(x, y + 2.45 * s, z); cap.scale.y = 0.55; world.add(cap); }
  },
  lawn(x0, z0, x1, z1, y = 0) {
    const t = grassTexture().clone(); t.needsUpdate = true; t.repeat.set((x1 - x0) / 3, (z1 - z0) / 3);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    world.add(m);
  },
  stones(points) {
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, , az] = points[i], [bx, , bz] = points[i + 1], L = Math.hypot(bx - ax, bz - az);
      for (let s = 0; s < L; s += 0.85) {
        const d = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.04, 12), stepMat);
        d.position.set(ax + ((bx - ax) * s) / L + (rnd() - 0.5) * 0.2, 0.02, az + ((bz - az) * s) / L);
        world.add(d);
      }
    }
  },
  // a freestanding concrete wall with a thin roof, facing n
  pavilion(x, z, nx, nz) {
    const tx = -nz, tz = nx, rot = -Math.atan2(tz, tx);
    block(world, 6, 3.2, 0.3, x, 1.6, z, { rotY: rot, solid: stepMat });
    block(world, 7, 0.12, 4.4, x + nx * 1.9, 3.5, z + nz * 1.9, { rotY: rot, solid: stepMat });
    block(world, 0.12, 3.44, 0.12, x + nx * 3.9 + tx * 3.2, 1.72, z + nz * 3.9 + tz * 3.2, { solid: stepMat, mat: sketchMat });
    block(world, 0.12, 3.44, 0.12, x + nx * 3.9 - tx * 3.2, 1.72, z + nz * 3.9 - tz * 3.2, { solid: stepMat, mat: sketchMat });
    block(world, 7, 0.04, 5, x + nx * 2.2, 0.02, z + nz * 2.2, { rotY: rot, solid: stepMat, mat: sketchMat });
  },
  // a raised platform on posts with a flight up to it
  lookout(x, z, y, from, to, { w = 4, d = 4 } = {}) {
    kit.slab(x - w / 2, z - d / 2, x + w / 2, z + d / 2, y);
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) block(world, 0.14, y, 0.14, x + (px * w) / 2, y / 2, z + (pz * d) / 2, { solid: stepMat, mat: sketchMat });
    kit.flight(from, to, 0, y, 1.4, Math.round(y / 0.2));
  },
  stairRoom(z0) {            // straight stair along the right wall rising through an opening (enfilade)
    const sx = 4 - 0.7;
    kit.flight([sx, z0 - 0.8], [sx, z0 - 5.6], 0, UP, 1.1, 18);
    kit.slab(-4, z0 - 10, 4, z0, UP, { hole: [4 - 1.35, z0 - 5.8, 4, z0] });
    kit.rail([[4 - 1.35, UP + 0.9, z0], [4 - 1.35, UP + 0.9, z0 - 5.8]]);
  },
  spiralGallery({ cz, ts, k, end, doors }) {
    const yAt = (t) => Math.max(0, t - ts) * k, R = 11.2;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 64), floorMat(22, 22));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.001, cz); world.add(floor);
    const step = 0.1;
    for (let t = ts; t < end; t += step) {                       // the ramp, in short pieces
      const m = t + step / 2, y = yAt(m);
      block(world, 4, 0.15, 9 * step + 0.06, 9 * Math.cos(m), y - 0.075, cz + 9 * Math.sin(m), { rotY: -m, solid: stepMat, mat: null });
    }
    const pts = [], pts2 = [];
    for (let t = ts; t <= end; t += 0.05) { pts.push([7 * Math.cos(t), yAt(t) + 1, cz + 7 * Math.sin(t)]); pts2.push([7 * Math.cos(t), yAt(t), cz + 7 * Math.sin(t)]); }
    kit.rail(pts); kit.rail(pts2, sketchMat);
    for (let p = 0; p < Math.PI * 2 - 1e-6; p += step) {         // the round wall rises with the ramp
      let top = H;
      for (let t = p; t < end + 0.2; t += Math.PI * 2) if (t >= ts - 0.2) top = Math.max(top, yAt(t) + H);
      const m = p + step / 2, a = [R * Math.cos(p), cz + R * Math.sin(p)], b = [R * Math.cos(p + step), cz + R * Math.sin(p + step)];
      const ops = [];
      for (const [dt, dy] of doors) {
        const dd = Math.atan2(Math.sin(m - dt), Math.cos(m - dt));
        if (Math.abs(dd) < 0.09) ops.push({ at: 0.56, w: 1.13, y0: dy, y1: dy + 2.5 });
      }
      kit.wall(a, b, 0, top, ops);
    }
  },
  pier({ len, panels, deck, flight }) {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x7c96a3, roughness: 0.25, metalness: 0.25 }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, -0.7, -len / 2); world.add(water);
    kit.lawn(-300, 3, 300, 300, 0);
    kit.slab(-3, -len, 3, 3, 0, { th: 0.25 });
    for (let z = 2; z > -len; z -= 4) for (const s of [-1, 1]) block(world, 0.18, 1.6, 0.18, s * 2.9, -0.8, z, { solid: bark, mat: sketchMat });
    for (let z = -3; z > -len + 6; z -= 10) {             // portals
      for (const s of [-1, 1]) block(world, 0.14, 4, 0.14, s * 3, 2, z, { solid: stepMat, mat: sketchMat });
      block(world, 6.14, 0.14, 0.14, 0, 4, z, { solid: stepMat, mat: sketchMat });
    }
    for (const [s, z] of panels) block(world, 0.12, 2.9, 5.2, s * 2.85, 1.45 + 0.3, z, { solid: stepMat, mat: sketchMat });
    const [x0, z0, x1, z1, y] = deck;
    kit.slab(x0, z0, x1, z1, y);
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) block(world, 0.16, y + 0.7, 0.16, px, (y - 0.7) / 2, pz, { solid: stepMat, mat: sketchMat });
    kit.flight(flight[0], flight[1], 0, y, 1.6, 18);
  },
};

/* ---------- furniture, room labels, lake ---------- */
const M = {
  wood: new THREE.MeshStandardMaterial({ color: 0xb08a62, roughness: 0.9 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0x8c9aa6, roughness: 1 }),
  white: new THREE.MeshStandardMaterial({ color: 0xe6e6e1, roughness: 0.9 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x3c4248, roughness: 0.8 }),
  rug: new THREE.MeshStandardMaterial({ color: 0xcdbfa6, roughness: 1 }),
  warm: new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffd58a, emissiveIntensity: 0.6 }),
  sand: new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 1 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x9a9f9e, roughness: 1, flatShading: true }),
  pad: new THREE.MeshStandardMaterial({ color: 0x5f8a55, roughness: 0.8, side: THREE.DoubleSide }),
  reed: new THREE.LineBasicMaterial({ color: 0x6f7f4e }),
  reedDry: new THREE.LineBasicMaterial({ color: 0x9a8f72 }),
  pine: new THREE.MeshStandardMaterial({ color: 0x3f5f45, roughness: 1, flatShading: true }),
  snow: new THREE.MeshStandardMaterial({ color: 0xf2f5f7, roughness: 1, flatShading: true }),
  ice: new THREE.MeshStandardMaterial({ color: 0xf4f8fa, roughness: 0.4, transparent: true, opacity: 0.85 }),
  hill: new THREE.MeshStandardMaterial({ color: 0x93aa82, roughness: 1, flatShading: true }),
  mountain: new THREE.MeshStandardMaterial({ color: 0x7f8ea3, roughness: 1, flatShading: true }),
  redwood: new THREE.MeshStandardMaterial({ color: 0x9c4a3c, roughness: 1 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x4a4f55, roughness: 1, flatShading: true }),
  cliff: new THREE.MeshStandardMaterial({ color: 0x8d8f8a, roughness: 1, flatShading: true }),
  birch: new THREE.MeshStandardMaterial({ color: 0xe9e6dd, roughness: 1 }),
  windowLit: new THREE.MeshBasicMaterial({ color: 0xffd58a }),
  branch: new THREE.LineBasicMaterial({ color: 0x5a4a3c }),
  frozen: new THREE.MeshStandardMaterial({ color: 0xe8f0f4, roughness: 0.35, metalness: 0.05 }),
};
M.warm.userData.artKind = M.windowLit.userData.artKind = "glow";
M.post = bark.clone(); M.vWhite = M.white.clone(); M.vWood = M.wood.clone();       // the village keeps its own colours
Object.values(M).forEach((m) => shared.add(m));
const books = [0x8c5a4a, 0x4f6e77, 0xc9a96e, 0x5f6b55, 0xa77f66].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
books.forEach((m) => shared.add(m));

/* lamps: the light over each wall board and the room lights after dark (colour, strength) */
const LAMPS = {
  warm: { label: "Q2 Warm white", board: 0xffe2bd, room: 0xffdcae, k: 0.8 },
  neutral: { label: "Q3 Neutral white", board: 0xfff4ea, room: 0xfff0e0, k: 0.75 },
  cool: { label: "Q4 Cool daylight", board: 0xe8f0ff, room: 0xe6eeff, k: 0.75 },
  dim: { label: "Q5 Soft and dim (neutral)", board: 0xfff4ea, room: 0xfff0e0, k: 0.35 },
  off: { label: "Q6 Off (room lights only)", board: 0xffffff, room: 0xfff0e0, k: 0 },
};
let LAMP = LAMPS.warm;
function applyLamps(st) {
  for (const s of st ? [st] : stations) { s.lamp.color.set(LAMP.board); s.lamp.intensity = 5 * LAMP.k; }
  for (const pl of fx.rooms || []) { pl.color.set(LAMP.room); pl.intensity = pl.userData.base * Math.max(LAMP.k, 0.35); }   // rooms still light up at night
}

function applyPalette(kKey, walls) {
  PAL = PALETTES[kKey] || PALETTES.drafting;
  const solid = walls === "solid";                       // walls: see-through or solid plaster
  wallMat.transparent = !solid; wallMat.opacity = solid ? 1 : 0.42; wallMat.color.set(solid ? PAL.wallSolid : PAL.wallSee); wallMat.needsUpdate = true;
  lineMat.color.set(PAL.ink); sketchMat.color.set(PAL.ink); stepMat.color.set(PAL.step); M.post.color.set(PAL.post);
  for (const k of ["wood", "fabric", "white", "dark", "rug"]) M[k].color.set(PAL[k]);
  books.forEach((m, i) => m.color.set(PAL.books[i]));
  paintGrid();
  for (const m of floorMats) { m.emissive.set(PAL.glow); if (m.map) m.map.needsUpdate = true; }
}

Object.assign(kit, {
  // simple solid furniture; local +z is the front, rot turns it (π/2 = facing +x)
  furn(type, x, y, z, rot = 0, size = []) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; world.add(g);
    const b = (w, h, d, bx, by, bz, m) => block(g, w, h, d, bx, by, bz, { solid: m, mat: sketchMat });
    const cyl = (r, h, bx, by, bz, m) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14), m); c.position.set(bx, by, bz); g.add(c); };
    const chair = (cx, cz, r) => { const c = new THREE.Group(); c.position.set(cx, 0, cz); c.rotation.y = r; g.add(c);
      block(c, 0.45, 0.05, 0.45, 0, 0.45, 0, { solid: M.wood, mat: sketchMat }); block(c, 0.45, 0.45, 0.04, 0, 0.7, -0.21, { solid: M.wood, mat: sketchMat });
      for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) block(c, 0.04, 0.45, 0.04, lx, 0.22, lz, { solid: M.wood, mat: null }); };
    switch (type) {
      case "sofa": b(2.2, 0.42, 0.9, 0, 0.21, 0, M.fabric); b(2.2, 0.5, 0.22, 0, 0.67, -0.34, M.fabric); b(0.2, 0.6, 0.9, -1.0, 0.3, 0, M.fabric); b(0.2, 0.6, 0.9, 1.0, 0.3, 0, M.fabric); break;
      case "armchair": b(0.9, 0.42, 0.85, 0, 0.21, 0, M.fabric); b(0.9, 0.5, 0.2, 0, 0.67, -0.32, M.fabric); b(0.16, 0.6, 0.85, -0.37, 0.3, 0, M.fabric); b(0.16, 0.6, 0.85, 0.37, 0.3, 0, M.fabric); break;
      case "coffee": b(1.1, 0.05, 0.6, 0, 0.4, 0, M.wood); b(0.9, 0.34, 0.4, 0, 0.19, 0, M.white); break;
      case "rug": b(size[0] || 2, 0.02, size[1] || 3, 0, 0.012, 0, M.rug); break;
      case "lamp": cyl(0.03, 1.5, 0, 0.75, 0, M.dark); cyl(0.22, 0.3, 0, 1.6, 0, M.warm); cyl(0.18, 0.03, 0, 0.015, 0, M.dark); break;
      case "plant": cyl(0.22, 0.4, 0, 0.2, 0, M.white); { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), leafA); f.position.set(0, 0.85, 0); g.add(f); } break;
      case "bench": b(1.6, 0.06, 0.4, 0, 0.45, 0, M.wood); b(0.06, 0.42, 0.36, -0.7, 0.21, 0, M.wood); b(0.06, 0.42, 0.36, 0.7, 0.21, 0, M.wood); break;
      case "shelf": b(2, 2.1, 0.35, 0, 1.05, 0, M.white);
        for (let k = 0; k < 4; k++) for (let j = 0; j < 6; j++) if ((j + k) % 3) b(0.22, 0.32, 0.25, -0.75 + j * 0.3, 0.32 + k * 0.5, 0.06, books[(j + k) % books.length]);
        break;
      case "counter": { const L = size[0] || 4; b(L, 0.88, 0.65, 0, 0.44, 0, M.white); b(L + 0.04, 0.04, 0.68, 0, 0.9, 0, M.wood); b(L, 0.7, 0.35, 0, 1.95, -0.15, M.white); b(0.6, 0.02, 0.4, L / 4, 0.93, 0.02, M.dark); break; }
      case "island": b(2.2, 0.88, 0.9, 0, 0.44, 0, M.white); b(2.3, 0.04, 1.0, 0, 0.9, 0, M.wood); break;
      case "dining": b(1.8, 0.05, 0.9, 0, 0.74, 0, M.wood);
        for (const [lx, lz] of [[-0.8, -0.38], [0.8, -0.38], [-0.8, 0.38], [0.8, 0.38]]) b(0.05, 0.72, 0.05, lx, 0.36, lz, M.wood);
        chair(-0.45, -0.7, 0); chair(0.45, -0.7, 0); chair(-0.45, 0.7, Math.PI); chair(0.45, 0.7, Math.PI); break;
      case "bed": b(1.7, 0.3, 2.1, 0, 0.15, 0, M.wood); b(1.6, 0.22, 2.0, 0, 0.41, 0.02, M.white); b(1.62, 0.06, 1.3, 0, 0.55, 0.38, M.fabric);
        b(0.6, 0.12, 0.35, -0.4, 0.58, -0.75, M.white); b(0.6, 0.12, 0.35, 0.4, 0.58, -0.75, M.white); b(1.8, 1.0, 0.08, 0, 0.5, -1.05, M.wood); break;
      case "nightstand": b(0.45, 0.5, 0.4, 0, 0.25, 0, M.wood); cyl(0.1, 0.25, 0, 0.63, 0, M.warm); break;
      case "wardrobe": b(2.0, 2.2, 0.6, 0, 1.1, 0, M.white); b(0.01, 2.0, 0.01, 0, 1.1, 0.31, M.dark); break;
      case "desk": b(1.6, 0.04, 0.7, 0, 0.74, 0, M.wood); b(0.04, 0.72, 0.66, -0.76, 0.36, 0, M.wood); b(0.04, 0.72, 0.66, 0.76, 0.36, 0, M.wood); b(0.5, 0.32, 0.03, 0.2, 0.95, -0.25, M.dark); break;
      case "chair": chair(0, 0, 0); break;
      case "stove": cyl(0.3, 0.8, 0, 0.4, 0, M.dark); cyl(0.07, 2.4, 0, 2.0, 0, M.dark); break;
      case "sidetable": cyl(0.26, 0.04, 0, 0.55, 0, M.wood); cyl(0.04, 0.53, 0, 0.27, 0, M.dark); cyl(0.07, 0.22, 0.05, 0.68, 0, M.white); break;
      case "vase": cyl(0.16, 0.6, 0, 0.3, 0, M.white); { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), leafA); f.position.set(0, 0.85, 0); f.scale.y = 1.3; g.add(f); } break;
      case "stool": cyl(0.19, 0.05, 0, 0.66, 0, M.wood); cyl(0.03, 0.64, 0, 0.32, 0, M.dark); cyl(0.15, 0.02, 0, 0.01, 0, M.dark); break;
      case "pendant": { const ln = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 3.35, 0), new THREE.Vector3(0, 2.55, 0)]), sketchMat); g.add(ln); }
        cyl(0.24, 0.22, 0, 2.45, 0, M.warm); break;
      case "frame": b(size?.[0] || 0.9, 0.7, 0.04, 0, 1.65, 0.02, M.wood); b((size?.[0] || 0.9) - 0.12, 0.58, 0.02, 0, 1.65, 0.05, books[Math.floor(rnd() * books.length)]); break;
      case "tallplant": cyl(0.24, 0.45, 0, 0.22, 0, M.white); cyl(0.03, 1.2, 0, 1.0, 0, bark);
        for (const [ox, oy, oz] of [[0.2, 1.5, 0], [-0.2, 1.8, 0.1], [0, 2.05, -0.15]]) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 0), leafA); f.position.set(ox, oy, oz); g.add(f); } break;
      case "basket": cyl(0.24, 0.32, 0, 0.16, 0, M.wood); break;
      case "sideboard": b(1.8, 0.65, 0.45, 0, 0.36, 0, M.wood); b(1.7, 0.01, 0.01, 0, 0.36, 0.23, M.dark); cyl(0.08, 0.3, 0.5, 0.84, 0, M.white); b(0.35, 0.05, 0.25, -0.4, 0.71, 0, books[2]); break;
      case "cushions": for (const [ox, c] of [[-0.6, 1], [0.6, 3], [0, 0]]) b(0.42, 0.36, 0.14, ox, 0.62, -0.18, books[c]); break;
    }
  },
  // room name lettered on the floor, readable as you walk in
  label(text, x, z, y = 0) {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 160;
    const g = c.getContext("2d");
    if ("fontStretch" in g) g.fontStretch = "expanded";
    g.font = "500 92px Archivo"; g.fillStyle = "rgba(39,49,59,.78)"; g.textAlign = "center"; g.textBaseline = "middle";
    const draw = () => { g.clearRect(0, 0, 1024, 160); g.fillText(text, 512, 84); t.needsUpdate = true; };
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    document.fonts.ready.then(draw); draw();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.5), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    m.userData.keep = true;
    m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.02, z);
    world.add(m);
  },
  post(x, z, y0, y1) { block(world, 0.2, y1 - y0, 0.2, x, (y0 + y1) / 2, z, { solid: M.post, mat: sketchMat }); },
  boardwalk(x0, z0, x1, z1) {
    kit.slab(x0, Math.min(z0, z1) + 0.05, x1, Math.max(z0, z1), 0.07, { th: 0.15 });
    for (let z = Math.max(z0, z1); z >= Math.min(z0, z1); z -= 3) for (const x of [x0 + 0.1, x1 - 0.1]) kit.post(x, z, -1.6, 0);
  },
  boat(x, z, bob) {
    const g = new THREE.Group(); g.position.set(x, -0.5, z); world.add(g);
    block(g, 1.2, 0.35, 3.0, 0, 0.17, 0, { solid: M.wood, mat: sketchMat });
    block(g, 0.85, 0.36, 2.2, 0, 0.32, 0, { solid: M.white, mat: sketchMat });
    block(g, 1.2, 0.05, 0.25, 0, 0.36, 0.3, { solid: M.wood, mat: sketchMat });
    fx.boat = g;
  },
  // big steel-framed window: returns the opening and draws the glazing bars
  window(a, b, at, w, y0, y1) {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
    const p = (s, y) => [a[0] + ux * s, y, a[1] + uz * s];
    for (let s = at - w / 2; s <= at + w / 2 + 1e-6; s += w / Math.max(2, Math.round(w / 1.2))) kit.rail([p(s, y0), p(s, y1)]);
    for (const y of [y0, (y0 + y1) / 2, y1]) kit.rail([p(at - w / 2, y), p(at + w / 2, y)]);
    return { at, w, y0, y1 };
  },
  pine(x, z, y = 0, s = 1, snow = false) {
    fx.pines = (fx.pines || 0) + 1;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.1 * s, 1.2 * s, 6), bark);
    trunk.position.set(x, y + 0.6 * s, z); world.add(trunk);
    for (let k = 0; k < 3; k++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry((1.15 - k * 0.3) * s, 1.6 * s, 7), snow && k === 2 ? M.snow : M.pine);
      c.position.set(x, y + (1.5 + k * 0.85) * s, z); c.rotation.y = rnd() * 3; world.add(c);
    }
    if (snow) { const cap = new THREE.Mesh(new THREE.ConeGeometry(0.98 * s, 0.7 * s, 7), M.snow); cap.position.set(x, y + 2.2 * s, z); world.add(cap); }
  },
  // the lake and its surroundings: landscape from SR, colours and season from LT
  lake(sc, lt, shoreZ, dockX) {
    const { rx, rz } = sc, cx = 0;
    const wob = (t) => 1 + 0.07 * Math.sin(3 * t + 1.3) + 0.045 * Math.sin(7 * t + 0.4) + 0.025 * Math.sin(13 * t + 2.1);
    const cz = shoreZ - rz * wob(Math.PI / 2);
    const P = (t, k = 1) => [cx + rx * k * wob(t) * Math.cos(t), cz + rz * k * wob(t) * Math.sin(t)];
    const out = (t) => { const a = P(t, 1), b = P(t, 1.01); const l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
    const ring = (k) => { const pts = []; for (let i = 0; i < 160; i++) { const [x, z] = P((i / 160) * Math.PI * 2, k); pts.push(new THREE.Vector2(x, -z)); } return pts; };
    const flat = (shape, mat, y) => { const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 1), mat); m.rotation.x = -Math.PI / 2; m.position.y = y; world.add(m); return m; };
    const nearDock = (x, z, r) => Math.abs(x - dockX) < r && z > shoreZ - r * 1.5 && z < shoreZ + r * 2;
    const inLake = (x, z, k = 1) => { const t = Math.atan2((z - cz) / rz, (x - cx) / rx); return Math.hypot((x - cx) / rx, (z - cz) / rz) < k * wob(t); };
    const nearHouse = (x, z, m = 6) => x > -12 - m && x < 12 + m && z > -22 - m && z < shoreZ + 4;
    const snow = !!lt.snow;
    // water
    const wc = document.createElement("canvas"); wc.width = wc.height = 256;
    const g = wc.getContext("2d");
    g.fillStyle = lt.waterBase; g.fillRect(0, 0, 256, 256);
    let sd = 11; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) { g.strokeStyle = r() > 0.5 ? "rgba(214,228,230,.22)" : "rgba(40,62,70,.25)"; g.lineWidth = 1 + r() * 1.5;
      const x = r() * 256, y = r() * 256, l = 8 + r() * 26; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 2, x + l, y); g.stroke(); }
    const wt = new THREE.CanvasTexture(wc); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(70, 70); wt.colorSpace = THREE.SRGBColorSpace;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.18, metalness: 0.3, color: lt.waterTint }));
    water.rotation.x = -Math.PI / 2; water.position.set(cx, -0.6, cz); world.add(water);
    fx.water = wt; water.material.userData.artKind = "water";
    // land with a hole for the lake and a thin edge
    const land = new THREE.Shape([new THREE.Vector2(cx - 450, -(cz - 450)), new THREE.Vector2(cx + 450, -(cz - 450)), new THREE.Vector2(cx + 450, -(cz + 450)), new THREE.Vector2(cx - 450, -(cz + 450))]);
    land.holes.push(new THREE.Path(ring(1.015)));
    const gt = (snow ? snowTexture() : grassTexture(lt.grass)).clone(); gt.needsUpdate = true; gt.repeat.set(1 / 3, 1 / 3);
    flat(land, new THREE.MeshStandardMaterial({ map: gt, roughness: 1 }), 0.0);
    const beach = new THREE.Shape(ring(1.015)); beach.holes.push(new THREE.Path(ring(1.0)));
    flat(beach, snow ? M.snow : M.sand, -0.05);
    // reeds and rocks at the edge, lily pads, ice
    const reedMat = snow || lt.dry ? M.reedDry : M.reed;
    const reedClump = (x, z, n = 14, spread = 1.6) => {
      const pts = [];
      for (let k = 0; k < n; k++) { const ox = x + (rnd() - 0.5) * spread, oz = z + (rnd() - 0.5) * spread, hgt = 0.8 + rnd() * 1.1;
        pts.push(new THREE.Vector3(ox, -0.6, oz), new THREE.Vector3(ox + (rnd() - 0.5) * 0.2, hgt - 0.6, oz + (rnd() - 0.5) * 0.2)); }
      world.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), reedMat));
    };
    for (let i = 0; i < (sc.reeds ?? 70); i++) { const t = rnd() * Math.PI * 2, [x, z] = P(t, 0.96 + rnd() * 0.035); if (!nearDock(x, z, 8)) reedClump(x, z); }
    for (let i = 0; i < 40; i++) {
      const t = rnd() * Math.PI * 2, [x, z] = P(t, 1.0 + rnd() * 0.05), s = 0.3 + rnd() * 0.9;
      if (nearDock(x, z, 4)) continue;
      const rk = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), M.rock); rk.position.set(x, -0.1, z); rk.rotation.set(rnd(), rnd(), rnd()); world.add(rk);
    }
    if (!snow) for (let i = 0; i < (sc.pads ?? 60); i++) {
      const side = rnd() > 0.5 ? 1 : -1, x = side * (13 + rnd() * 20), z = -4 - rnd() * 40;
      if (!inLake(x, z, 0.9)) continue;
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.3 + rnd() * 0.25, 12, 0.3, Math.PI * 1.8), M.pad);
      pad.rotation.x = -Math.PI / 2; pad.rotation.z = rnd() * 6; pad.position.set(x, -0.585, z); world.add(pad);
    }
    if (lt.frozen) { const ice = new THREE.Shape(ring(1.0)); const m = flat(ice, M.frozen, -0.5); m.material = M.frozen; }
    if (lt.ice && !lt.frozen) for (let i = 0; i < 80; i++) {
      const t = rnd() * Math.PI * 2, [x, z] = P(t, 0.82 + rnd() * 0.16);
      if (nearDock(x, z, 10) || nearHouse(x, z, 4)) continue;
      const fl = new THREE.Mesh(new THREE.CircleGeometry(1 + rnd() * 3, 7), M.ice);
      fl.rotation.x = -Math.PI / 2; fl.scale.set(1, 0.6 + rnd() * 0.6, 1); fl.position.set(x, -0.57, z); world.add(fl);
    }
    // trees on the shore
    const tree = (x, z, s, y = 0) => {
      const kind = sc.trees === "mixed" ? (rnd() > 0.5 ? "pine" : "round") : sc.trees;
      if (kind === "round") kit.tree(x, z, y, s);
      else if (kind === "birch") kit.birch(x, z, y, s);
      else kit.pine(x, z, y, s * 1.2, snow);
    };
    const k0 = sc.treeNear ? 1.03 : 1.09, k1 = sc.treeNear ? 1.7 : 1.44;
    for (let i = 0; i < (sc.treeN ?? 140); i++) {
      const t = rnd() * Math.PI * 2, [x, z] = P(t, k0 + rnd() * (k1 - k0));
      if (nearDock(x, z, 10)) continue;
      tree(x, z, 1 + rnd() * 1.8);
    }
    // landscape features
    if (sc.hills) for (let i = 0; i < 12; i++) {             // hills sit back from the shore, never into the lake
      const t = rnd() * Math.PI * 2, R = 30 + rnd() * 45;
      if (Math.abs(t - Math.PI / 2) < 0.7) continue;
      const [ex, ez] = P(t, 1.05), [ox, oz] = out(t), d = R + 6 + rnd() * 40;
      const hl = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 10), snow ? M.snow : M.hill); hl.scale.y = 0.16 + rnd() * 0.14; hl.position.set(ex + ox * d, -R * 0.02, ez + oz * d); world.add(hl);
    }
    // the mountain ring is always the same (S3's): its own random sequence and centre, whatever the lake size
    let ms = 4242; const mr = () => ((ms = (ms * 16807) % 2147483647) / 2147483647);
    const mcz = shoreZ - 70 * wob(Math.PI / 2);
    if (sc.mountains) for (let i = 0; i < 26; i++) {
      const t = (i / 26) * Math.PI * 2 + mr() * 0.2, d = 230 + mr() * 120, h = 70 + mr() * 90, rad = 70 + mr() * 60;
      if (Math.sin(t) > 0.55) continue;
      const x = cx + Math.cos(t) * d, z = mcz + Math.sin(t) * d;
      const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 6 + (i % 3)), M.mountain); m.position.set(x, h / 2 - 4, z); m.rotation.y = mr() * 3; world.add(m);
      const capH = h * (snow ? 0.55 : 0.3);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(rad * (capH / h) * 1.045, capH, 6 + (i % 3)), M.snow); cap.position.set(x, h - 4 - capH / 2 + h * 0.012, z); cap.rotation.y = m.rotation.y; world.add(cap);
    }
    const cottage = (x, z, rot) => {
      const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = rot; world.add(grp);
      block(grp, 4, 2.6, 3, 0, 1.3, 0, { solid: rnd() > 0.5 ? M.vWhite : M.redwood, mat: sketchMat });
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 4.4, 3, 1), snow ? M.snow : M.roof); roof.rotation.z = Math.PI / 2; roof.position.set(0, 3.2, 0); roof.scale.set(1, 1, 0.9); grp.add(roof);
      if (lt.indoor) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), M.windowLit); w.position.set(0.8, 1.4, 1.51); grp.add(w); }
    };
    if (sc.cottages) for (let i = 0; i < sc.cottages; i++) {
      const t = -Math.PI / 2 + (rnd() - 0.5) * (sc.cottages > 10 ? 5.4 : 3.4), [x, z] = P(t, sc.cottages > 10 ? 1.09 + rnd() * 0.2 : 1.25 + rnd() * 0.5);
      if (nearDock(x, z, 12)) continue;
      cottage(x, z, Math.atan2(-(x - cx), -(z - cz)));
    }
    if (sc.jetties) for (let i = 0; i < sc.jetties; i++) {      // little jetties poking out from the village
      const t = -Math.PI / 2 + (rnd() - 0.5) * 5, [x, z] = P(t, 1.0), [ox, oz] = out(t);
      if (nearDock(x, z, 14)) continue;
      const grp = new THREE.Group(); grp.position.set(x - ox * 3.5, 0, z - oz * 3.5); grp.rotation.y = Math.atan2(ox, oz); world.add(grp);
      block(grp, 1.4, 0.12, 7, 0, 0.0, 0, { solid: M.vWood, mat: sketchMat });
      if (rnd() > 0.4) { const b = new THREE.Group(); b.position.set(1.5, -0.5, -1); grp.add(b); block(b, 1.1, 0.35, 2.6, 0, 0.17, 0, { solid: M.vWood, mat: sketchMat }); }
    }
    if (sc.islands) for (let i = 0, made = 0; i < 60 && made < sc.islands; i++) {
      const x = cx + (rnd() - 0.5) * rx * 1.5, z = cz + (rnd() - 0.5) * rz * 1.5, R = 3 + rnd() * 6;
      if (!inLake(x, z, 0.7) || nearHouse(x, z, 10)) continue;
      made++;
      const is = new THREE.Mesh(new THREE.SphereGeometry(R, 18, 8), snow ? M.snow : M.hill); is.scale.y = 0.22; is.position.set(x, -0.6, z); world.add(is);
      for (let k = 0; k < 2 + R / 2; k++) { const a = rnd() * 6.28, d = rnd() * R * 0.6; kit.pine(x + Math.cos(a) * d, z + Math.sin(a) * d, 0, 0.8 + rnd() * 0.8, snow); }
    }
    if (sc.cliffs) for (let i = 0; i < 90; i++) {               // tall rock faces along the shore, pines on top
      const t = rnd() * Math.PI * 2;
      if (Math.abs(t - Math.PI / 2) < 0.45) continue;
      const [ex, ez] = P(t, 1.03 + rnd() * 0.06), h = 4 + rnd() * 10, w = 4 + rnd() * 6;
      const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(w, 0), M.cliff); rk.scale.set(1, h / w, 0.8); rk.position.set(ex, h * 0.35, ez); rk.rotation.set(rnd() * 0.4, rnd() * 3, rnd() * 0.4); world.add(rk);
      if (rnd() > 0.5) kit.pine(ex, ez, h * 0.9, 1 + rnd(), snow);
    }
    if (sc.marsh) for (let i = 0; i < 70; i++) {                // grassy hummocks and reed beds out in the shallows
      const t = rnd() * Math.PI * 2, [x, z] = P(t, 0.78 + rnd() * 0.2);
      if (nearHouse(x, z, 6) || nearDock(x, z, 10)) continue;
      const hm = new THREE.Mesh(new THREE.SphereGeometry(1 + rnd() * 2.2, 10, 6), snow ? M.snow : M.hill); hm.scale.y = 0.3; hm.position.set(x, -0.6, z); world.add(hm);
      reedClump(x, z, 22, 2.6);
    }
    // sky dome, sun or moon, stars
    const c = document.createElement("canvas"); c.width = 4; c.height = 256;
    const gg = c.getContext("2d"), gr = gg.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, lt.sky[0]); gr.addColorStop(0.5, lt.sky[1]); gr.addColorStop(1, lt.sky[1]);
    gg.fillStyle = gr; gg.fillRect(0, 0, 4, 256);
    const st = new THREE.CanvasTexture(c); st.colorSpace = THREE.SRGBColorSpace;
    fx.dome = new THREE.Mesh(new THREE.SphereGeometry(620, 32, 16), new THREE.MeshBasicMaterial({ map: st, side: THREE.BackSide, fog: false, depthWrite: false }));
    fx.dome.material.userData.artKind = "sky";
    fx.dome.position.set(cx, 0, cz); world.add(fx.dome);
    if (lt.disc) {
      const [dx, dy, size, col] = lt.disc;
      const d = new THREE.Mesh(new THREE.CircleGeometry(size, 48), new THREE.MeshBasicMaterial({ color: col, fog: false, transparent: true }));
      d.position.set(cx + dx, dy, cz - 520); d.lookAt(0, 2, 0); world.add(d); fx.disc = d;
    }
    if (lt.stars) {
      const n = lt.manyStars ? 4000 : 1200, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = rnd() * 6.28, el = 0.05 + rnd() * 1.45, R = 560; pos[i * 3] = cx + Math.cos(a) * Math.cos(el) * R; pos[i * 3 + 1] = Math.sin(el) * R; pos[i * 3 + 2] = cz + Math.sin(a) * Math.cos(el) * R; }
      const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      fx.nightStars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, fog: false, transparent: true, opacity: 0.9, depthWrite: false }));
      world.add(fx.nightStars);
    }
    return { cx, cz };
  },
  birch(x, z, y = 0, s = 1) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.09 * s, 2.6 * s, 6), M.birch);
    trunk.position.set(x, y + 1.3 * s, z); world.add(trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 * s, 0), leafB); crown.scale.y = 1.4;
    crown.position.set(x, y + 2.9 * s, z); crown.rotation.set(rnd(), rnd(), rnd()); world.add(crown);
    (fx.sway ||= []).push([crown, crown.rotation.z, rnd() * 6]);
  },
});

let snowTex = null;
function snowTexture() {
  if (snowTex) return snowTex;
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d"); g.fillStyle = "#EEF2F5"; g.fillRect(0, 0, 256, 256);
  let sd = 5; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2500; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,.7)" : "rgba(190,205,218,.35)"; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2); }
  snowTex = new THREE.CanvasTexture(c); snowTex.wrapS = snowTex.wrapT = THREE.RepeatWrapping; snowTex.colorSpace = THREE.SRGBColorSpace;
  return snowTex;
}
const grassCache = {};
const GRASS = {
  summer: ["#8FA67F", ["#7E9970", "#A6BC95", "#8BA27A", "#9AB389", "#738E66", "#B3C6A0"]],
  spring: ["#93B57C", ["#86AD6C", "#B2D294", "#9CC27F", "#A9CC8C", "#7CA563", "#E7EFC8"]],
  autumn: ["#A39C6C", ["#9A8F5C", "#B9A970", "#8E8A5B", "#C2A462", "#7E7B52", "#B98A4E"]],
};
function grassTexture(kind = "summer") {           // a tiling patch of grass blades
  if (grassCache[kind]) return grassCache[kind];
  let grassTex;
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const g = c.getContext("2d");
  const [base, greens] = GRASS[kind] || GRASS.summer;
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  let sd = 3; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9000; i++) {
    const x = r() * 512, y = r() * 512, l = 4 + r() * 9, a = -Math.PI / 2 + (r() - 0.5) * 0.9;
    g.strokeStyle = greens[Math.floor(r() * greens.length)]; g.lineWidth = 1 + r() * 1.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  grassTex = new THREE.CanvasTexture(c);
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.colorSpace = THREE.SRGBColorSpace; grassTex.anisotropy = 8;
  return (grassCache[kind] = grassTex);
}

/* ================= wall stations ================= */
const loader = new THREE.TextureLoader();
const texCache = {};
function photoTexture(name) {
  const file = pic(name);                                      // .webp, or the .jpg original (panel: Images)
  if (!texCache[file]) {
    texCache[file] = new Promise((res) => loader.load(IMG + file, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; res(t); }));
  }
  return texCache[file];
}

const NEUTRAL = { bg: "#EEF0EE", ink: "#27313B", accent: "#27313B" };
function drawCover(g, img, x, y, w, h) {
  const ia = img.width / img.height, ca = w / h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ia > ca) { sw = img.height * ca; sx = (img.width - sw) / 2; } else { sh = img.width / ca; sy = (img.height - sh) / 2; }
  g.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
function wrap(g, text, maxW) {
  const out = []; let line = "";
  for (const word of String(text).split(" ")) {
    const t = line ? line + " " + word : word;
    if (g.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t;
  }
  if (line) out.push(line);
  return out;
}
const font = (g, weight, size, wide = false) => {
  if ("fontStretch" in g) g.fontStretch = wide ? "expanded" : "normal";
  g.font = `${weight} ${size}px Archivo`;
};

// What each stop says.
function stationContent(step, n) {
  const tag = `R.0${n}`;
  if (step === "about") return {
    tag: `${tag}  ${CV.ui.studio}`, title: CV.ui.about, photo: "about.jpg", palette: { bg: "#63534D", ink: "#F2EEEA", accent: "#D8D2CE" },
    body: CV.intro, rows: CV.facts,
  };
  if (step === "path") return {
    tag: `${tag}  ${CV.ui.archive}`, title: CV.ui.skillsTitle, photo: null,
    columns: [CV.skills, CV.principles], heads: [CV.ui.skills, CV.ui.approach],
  };
  if (step === "contact") return {
    tag: `${tag}  ${CV.ui.exit}`, title: CV.ui.contactTitle, photo: null, contact: true,
    body: CV.email, foot: CV.links.map((l) => l.label).join("     "),
  };
  const p = CV.projects.find((x) => x.id === step);
  return {
    tag: `${tag}  ${p.kind}`, title: p.title, photo: p.img, palette: p.palette, project: p,
    sub: p.kind, body: p.text, rows: p.rows,
  };
}

// f scales all the text: a board whose text runs off the bottom is painted again a little smaller
function paintBoard(st, f = 1) {
  const mode = html.dataset.b;
  const c = st.canvas;
  const g = c.getContext("2d");
  const Wc = c.width, Hc = c.height, k = Wc / 2048 * f;
  const info = st.info, img = st.img;
  const usePal = info.palette && ["palette", "exact", "letters"].includes(mode);
  const col = st.skin ? { bg: SKINS[st.skin].bg, ink: SKINS[st.skin].ink, accent: SKINS[st.skin].ink } : usePal ? info.palette : NEUTRAL;
  const photoTitle = ["exact", "letters"].includes(mode) && img;
  g.globalCompositeOperation = "source-over";
  const sk = st.skin ? SKINS[st.skin] : null;
  g.shadowColor = "transparent"; g.shadowBlur = 0;
  if (sk?.clear) g.clearRect(0, 0, Wc, Hc);
  else { g.fillStyle = col.bg; g.fillRect(0, 0, Wc, Hc); }
  if (sk?.clear) { g.shadowColor = "rgba(20,28,24,.6)"; g.shadowBlur = (sk.bold ? 28 : 18) * k; g.shadowOffsetY = 3 * k; }
  if (mode === "exact" && img) {          // B4: the exact pixels stay behind, under a veil in the photo's colour
    drawCover(g, img, 0, 0, Wc, Hc);
    g.fillStyle = col.bg; g.globalAlpha = 0.86; g.fillRect(0, 0, Wc, Hc); g.globalAlpha = 1;
  }
  // text column: the part the photo leaves free (or the whole board when there is no photo)
  const pad = 90 * k;
  const freeW = info.photo ? Wc * (CW - PW) / CW : Wc;
  const x0 = info.photo && st.pd < 0 ? Wc - freeW : 0;
  const x = x0 + pad, w = freeW - pad * 2;
  let y = pad + 20 * k;
  g.fillStyle = col.ink;
  font(g, 500, 30 * k); g.fillText(info.tag, x, y); y += 70 * k;

  const tSize = (info.contact ? 132 : 118) * k;
  font(g, photoTitle ? 700 : 300, tSize, true);
  const tLines = wrap(g, info.title, info.columns ? Wc - pad * 2 : w);
  const tTop = y + tSize * 0.85;
  if (photoTitle) {                        // B4/B5: letters filled with the photo's pixels at the same spot
    const off = document.createElement("canvas"); off.width = Wc; off.height = Hc;
    const o = off.getContext("2d");
    font(o, 700, tSize, true); o.fillStyle = "#000";
    tLines.forEach((l, i) => o.fillText(l, x, tTop + i * tSize * 0.95));
    o.globalCompositeOperation = "source-in";
    drawCover(o, img, 0, 0, Wc, Hc);
    g.drawImage(off, 0, 0);
    g.strokeStyle = col.ink; g.globalAlpha = 0.45; g.lineWidth = 2 * k;
    tLines.forEach((l, i) => g.strokeText(l, x, tTop + i * tSize * 0.95));
    g.globalAlpha = 1;
  } else {
    g.fillStyle = mode === "palette" && usePal ? col.accent : col.ink;
    tLines.forEach((l, i) => g.fillText(l, x, tTop + i * tSize * 0.95));
  }
  y = tTop + (tLines.length - 1) * tSize * 0.95 + (info.contact ? 120 : 86) * k;
  g.fillStyle = col.ink;

  if (info.sub) { font(g, 500, 32 * k); g.fillText(info.sub, x, y); y += 64 * k; }
  if (info.body) {
    font(g, info.contact ? 500 : 400, (info.contact ? 64 : 37) * k);
    for (const l of wrap(g, info.body, w)) { g.fillText(l, x, y); y += (info.contact ? 84 : 52) * k; }
    y += 26 * k;
  }
  if (info.rows) {
    for (const [a, b] of info.rows) {
      font(g, 500, 28 * k); g.globalAlpha = 0.65; g.fillText(a, x, y); g.globalAlpha = 1;
      font(g, 400, 30 * k);
      const ls = wrap(g, b, w - 240 * k);
      ls.forEach((l, i) => g.fillText(l, x + 240 * k, y + i * 38 * k));
      y += Math.max(1, ls.length) * 38 * k + 8 * k;
    }
  }
  if (info.foot) { font(g, 500, 40 * k); g.fillText(info.foot, x, y + 40 * k); }
  let bottom = info.foot ? y + 40 * k : y;
  if (info.columns) {
    const colW = (Wc - pad * 3) / 2;
    info.columns.forEach((list, ci) => {
      let yy = y;
      const cx = pad + ci * (colW + pad);
      font(g, 600, 40 * k); g.fillText(info.heads[ci], cx, yy); yy += 70 * k;
      for (const [a, b] of list) {
        font(g, 600, 34 * k); g.fillText(a, cx, yy);
        font(g, 400, 33 * k);
        const ls = wrap(g, b, colW - (ci ? 0 : 190 * k));
        const bx = ci ? cx : cx + 190 * k, by = ci ? yy + 42 * k : yy;
        ls.forEach((l, i) => g.fillText(l, bx, by + i * 41 * k));
        yy = by + ls.length * 41 * k + 22 * k;
      }
      bottom = Math.max(bottom, yy - 22 * k);
    });
  }
  if (bottom > Hc - 50 * (Wc / 2048) && f > 0.55) return paintBoard(st, f * 0.93);
  st.boardTex.needsUpdate = true;
}

const stations = [];
function makeStation(parent, step, n, { c = null, nrm = null, pd = 1, garden = false, skin = null, place = null, far = false }) {
  const info = stationContent(step, n);
  const grp = new THREE.Group();
  if (place) place(grp);
  else { grp.position.set(c[0] + nrm[0] * 0.03, c[1] + 1.75, c[2] + nrm[1] * 0.03); grp.rotation.y = Math.atan2(nrm[0], nrm[1]); }
  parent.add(grp);

  const cv = document.createElement("canvas");
  cv.width = 2048; cv.height = Math.round(2048 * CH / CW);
  const boardTex = new THREE.CanvasTexture(cv);
  boardTex.colorSpace = THREE.SRGBColorSpace; boardTex.anisotropy = 8;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshBasicMaterial({ map: boardTex, toneMapped: false, transparent: true }));
  board.position.z = 0.01; board.userData.keep = true;      // art styles leave the boards as they are
  if (far) { board.material.fog = false; board.material.depthWrite = false; }
  grp.add(board);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(CW + 0.14, CH + 0.14)), lineMat);
  frame.position.z = 0.012;
  grp.add(frame);
  if (skin && skin !== "plan") frame.visible = false;

  const st = { step, info, grp, board, boardTex, canvas: cv, c, nrm, pd, garden, skin, p: 0, tStart: null, photo: null, img: null, uv: null };
  if (info.photo) {
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    photo.position.z = 0.03; photo.visible = false; photo.userData.keep = true;
    grp.add(photo);
    st.photo = photo;
    photoTexture(info.photo).then((t) => {
      const tex = t.clone(); tex.needsUpdate = true;
      mat.map = tex; mat.needsUpdate = true;
      st.img = t.image; st.uv = coverUV(t.image);
      document.fonts.ready.then(() => paintBoard(st));
    });
  }
  const lamp = new THREE.PointLight(C.sodium, 5, 7, 1.6);
  lamp.position.set(0, 1.2, 1.4);
  grp.add(lamp);
  st.lamp = lamp; applyLamps(st);
  stations.push(st);
  return st;
}

const coverUV = (img) => {                                       // cover-crop a photo to the board
  const ia = img.width / img.height, ca = CW / CH;
  return ia > ca ? { u0: (1 - ca / ia) / 2, uw: ca / ia, v0: 0, vh: 1 } : { u0: 0, uw: 1, v0: (1 - ia / ca) / 2, vh: ia / ca };
};
// F04 inside the scene: move the photo aside on the wall (A1 resize / A2 crop / A3 slide)
function placePhoto(st, p) {
  const ph = st.photo;
  st.board.material.opacity = st.skin ? p : html.dataset.b === "fade" && ph ? clamp(p * 1.4 - 0.3) : 1;
  if (!ph || !st.uv) return;
  ph.visible = true;
  const a = html.dataset.a, d = st.pd, tex = ph.material.map;
  let w = CW, h = CH, x = 0, u0 = st.uv.u0, uw = st.uv.uw;
  if (a === "resize") {
    const s = lerp(1, PW / CW, p);
    w = CW * s; h = CH * s;
    x = d * (CW / 2 - w / 2 + (w / 4) * p);          // ends 3/4 inside the frame, 1/4 out over the wall
  } else if (a === "crop") {
    w = lerp(CW, PW, p); x = d * (CW / 2 - w / 2);
    const left = (x - w / 2 + CW / 2) / CW;                     // keep the pixels where they were
    u0 = st.uv.u0 + st.uv.uw * left; uw = st.uv.uw * (w / CW);
  } else {
    x = d * (CW - PW) * p;
  }
  ph.scale.set(w, h, 1);
  ph.position.x = x;
  tex.repeat.set(uw, st.uv.vh);
  tex.offset.set(u0, st.uv.v0);
}

/* ================= surroundings (always a lake) ================= */
const SURROUNDINGS = {
  open: { label: "S1 Open lake", rx: 95, rz: 80, fog: 0.02, trees: "round", treeN: 140 },
  small: { label: "S2 Small lake, meadows, hills", rx: 36, rz: 32, fog: 0.006, trees: "round", treeN: 70, hills: true, cottages: 7 },
  mountain: { label: "S3 Mountain lake", rx: 80, rz: 70, fog: 0.0032, trees: "pine", treeN: 170, mountains: true },
  forest: { label: "S4 Forest lake", rx: 46, rz: 42, fog: 0.022, trees: "pine", treeN: 460, treeNear: true },
  islands: { label: "S5 Lake with islands", rx: 100, rz: 90, fog: 0.008, trees: "mixed", treeN: 120, islands: 8 },
  cliffs: { label: "S6 Cliffs and a rocky shore", rx: 70, rz: 62, fog: 0.01, trees: "pine", treeN: 90, cliffs: true, reeds: 20, pads: 20 },
  marsh: { label: "S7 Marsh with birches", rx: 75, rz: 65, fog: 0.012, trees: "birch", treeN: 160, marsh: true, reeds: 220, pads: 140 },
  village: { label: "S8 Lakeside village", rx: 85, rz: 72, fog: 0.009, trees: "mixed", treeN: 90, cottages: 22, jetties: 7 },
  forestPeaks: { label: "S9 Forest lake under mountains", rx: 50, rz: 45, fog: 0.0032, trees: "pine", treeN: 460, treeNear: true, mountains: true },
};
const SEASONS = {
  summer: { label: "N1 Summer", grass: "summer", leaves: ["#6E8C5E", "#86A272"], hill: "#93AA82" },
  spring: { label: "N2 Spring blossom", grass: "spring", leaves: ["#7FAE6A", "#E8B7C9"], hill: "#93B57C" },
  autumn: { label: "N3 Autumn", grass: "autumn", leaves: ["#C8742F", "#D9A33A"], hill: "#A89F6E", dry: true },
  winter: { label: "N4 Winter", leaves: ["#DCE3E8", "#C9D3DA"], snow: true, ice: true, water: "#A9BCC6" },
  early: { label: "N5 Early spring", grass: "spring", leaves: ["#A9C98A", "#C6DCA4"], hill: "#9DB487", bare: 0.45, dry: true },
  late: { label: "N6 Late summer", grass: "autumn", leaves: ["#556F48", "#6A8452"], hill: "#B0A675", dry: true },
  deep: { label: "N7 Deep winter, frozen lake", leaves: ["#E8EDF1", "#D9E1E6"], snow: true, frozen: true, water: "#C9D6DD" },
  lateAutumn: { label: "N8 Late autumn", grass: "autumn", leaves: ["#8E5A34", "#A86E3A"], hill: "#9C9068", bare: 0.5, dry: true },
};
const LIGHTS = {
  day: { label: "T1 Midday", air: "#CDD6C6", sky: ["#CDD6C6", "#CDD6C6"], sun: 2.2, sunColor: "#FFF4E0", hemi: 1.6, hemiSky: "#F2F4F6", waterBase: "#5D7C84", waterTint: "#DFE8EA" },
  morning: { label: "T2 Morning", air: "#D9E2E6", sky: ["#9DBAD6", "#E3EAEC"], sun: 2.0, sunColor: "#FFF2DC", hemi: 1.5, hemiSky: "#EEF3F8", waterBase: "#5C7E8C", waterTint: "#E6EEF0", disc: [-160, 60, 16, "#FFF6E2"] },
  golden: { label: "T3 Golden hour", air: "#E9D3AE", sky: ["#8FA7C6", "#F2D6A2"], sun: 2.3, sunColor: "#FFC977", hemi: 1.4, hemiSky: "#FFE6BC", waterBase: "#5F7480", waterTint: "#FFF0D8", disc: [130, 34, 20, "#FFD58C"] },
  evening: { label: "T4 Sunset", air: "#EEC9A4", sky: ["#56638F", "#F4B98A"], sun: 1.8, sunColor: "#FFB36B", hemi: 1.4, hemiSky: "#FFD2A8", waterBase: "#566A92", waterTint: "#FFFFFF", disc: [120, 18, 24, "#FFC98A"] },
  bluehour: { label: "T5 Blue hour", air: "#5B6A8F", sky: ["#27345C", "#8A95B8"], sun: 0.35, sunColor: "#B8C4FF", hemi: 0.8, hemiSky: "#8090C0", waterBase: "#344260", waterTint: "#FFFFFF", indoor: 0.8 },
  night: { label: "T6 Night with a moon", air: "#1D2433", sky: ["#0B1020", "#26324A"], sun: 0.25, sunColor: "#C8D4FF", hemi: 0.45, hemiSky: "#6070A0", waterBase: "#1E2C38", waterTint: "#8899AA", stars: true, indoor: 1, disc: [-90, 110, 10, "#F2F2E6"] },
  dawn: { label: "T7 Dawn", air: "#EFD6CF", sky: ["#A9B6D8", "#F6CBB8"], sun: 1.4, sunColor: "#FFC2A0", hemi: 1.3, hemiSky: "#FFE2D6", waterBase: "#7A86A0", waterTint: "#FFFFFF", disc: [-140, 18, 26, "#FFD4B8"] },
  starry: { label: "T8 Starry night, no moon", air: "#0E1320", sky: ["#04060E", "#141C30"], sun: 0.08, sunColor: "#9AA8D0", hemi: 0.3, hemiSky: "#4A5680", waterBase: "#121C26", waterTint: "#6A7A8C", stars: true, manyStars: true, indoor: 1 },
};
const WEATHER = {
  clear: { label: "W1 Clear" },
  cloudy: { label: "W2 Cloudy", clouds: 28, darken: 0.15, fog: 0.004 },
  fog: { label: "W3 Fog", darken: 0.05, fog: 0.045, haze: 0.55 },
  rain: { label: "W4 Rain", rain: 2600, clouds: 32, darken: 0.32, fog: 0.01, haze: 0.2 },
  storm: { label: "W5 Thunderstorm", rain: 4800, clouds: 44, darken: 0.55, fog: 0.016, wind: 1, lightning: true, haze: 0.25 },
  snow: { label: "W6 Snowfall", snow: 3200, clouds: 22, darken: 0.2, fog: 0.012, haze: 0.35 },
  windy: { label: "W7 Windy", wind: 1.5, leaves: 380, clouds: 16, cloudSpeed: 4 },
  rainbow: { label: "W8 Drizzle and a rainbow", rain: 700, clouds: 10, darken: 0.08, rainbow: true },
};
let SR = SURROUNDINGS.open, LT = { ...LIGHTS.day, ...SEASONS.summer }, WT = WEATHER.clear;
const env = { fog: 0.02, sun: 2.2, hemi: 1.6, dome: 1 };

/* ================= build a layout ================= */
const STEPS = ["about", ...CV.projects.map((p) => p.id), "path"];
let L = null, layoutKey = null, endingKey = null, buildKey = null, dust = null, fx = {};
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const v3 = (p, eye = E) => new THREE.Vector3(p[0], p[1] + eye, p[2]);

function disposeTree(o) {
  o.traverse((n) => {
    n.geometry?.dispose?.();
    const ms = Array.isArray(n.material) ? n.material : n.material ? [n.material] : [];
    for (const m of ms) if (!shared.has(m)) { m.map?.dispose?.(); m.dispose?.(); }
  });
}

function buildLayout(key, ending, sKey, lKey, wKey, nKey, pKey) {
  floorMats = [];
  layoutKey = key; endingKey = ending; buildKey = [key, ending, sKey, lKey, wKey, nKey, pKey].join("|");
  L = lakeHouse(key, +pKey || 0); SR = SURROUNDINGS[sKey]; WT = WEATHER[wKey];
  // light (time of day) and season combine into one look
  const LI = LIGHTS[lKey], SE = SEASONS[nKey];
  LT = { ...LI, ...SE, label: LI.label };
  if (SE.water) LT.waterBase = "#" + new THREE.Color(LI.waterBase).lerp(new THREE.Color(SE.water), 0.55).getHexString();
  // light and season colour everything; weather darkens and thickens the air
  const grey = new THREE.Color("#8C939A"), mist = new THREE.Color("#E2E6E6");
  fogOut.set(LT.air).lerp(grey, WT.darken || 0).lerp(mist, (WT.haze || 0) * (LT.indoor ? 0.25 : 1));
  env.fog = SR.fog + (WT.fog || 0); env.sun = LT.sun * (1 - (WT.darken || 0)); env.hemi = LT.hemi * (1 - 0.6 * (WT.darken || 0)); env.dome = 1 - 0.6 * (WT.darken || 0);
  sun.color.set(LT.sunColor); hemi.color.set(LT.hemiSky);
  leafA.color.set(LT.leaves[0]); leafB.color.set(LT.leaves[1]);
  M.pine.color.set(LT.snow ? "#46604C" : LT.indoor ? "#2C3D31" : "#3F5F45");
  M.hill.color.set(LT.hill || "#93AA82");
  scene.remove(world); disposeTree(world); stations.length = 0; fx = {}; curveCache.clear();
  world = new THREE.Group(); scene.add(world);
  seed = 7;

  const [bx0, bz0, bx1, bz1] = L.bounds, bcx = (bx0 + bx1) / 2, bcz = (bz0 + bz1) / 2;
  const along = bz1 - bz0 >= bx1 - bx0;
  const Bw = clamp((along ? bz1 - bz0 : bx1 - bx0) * 0.8, 14, 40), Bh = (Bw * CH) / CW;
  const textArea = along ? [bx1 + 1, bcz - Bw / 2 - 4, bx1 + 5 + Bh + 4, bcz + Bw / 2 + 4] : [bcx - Bw / 2 - 4, bz1 + 1, bcx + Bw / 2 + 4, bz1 + 5 + Bh + 4];
  const inText = (x, z) => ending === "plan" && x > textArea[0] && x < textArea[2] && z > textArea[1] && z < textArea[3];
  if (!L.noGround) {                                   // grass all around, trees outside the footprint
    const g = L.ground ?? -0.02;
    kit.lawn(bcx - 220, bcz - 220, bcx + 220, bcz + 220, g);
    for (let i = 0; i < 60; i++) {
      const a = rnd() * Math.PI * 2, r = 6 + rnd() * 30;
      const x = bcx + Math.cos(a) * ((bx1 - bx0) / 2 + r), z = bcz + Math.sin(a) * ((bz1 - bz0) / 2 + r);
      if (L.outdoor && L.stops.some((s) => Math.hypot(s.c[0] - x, s.c[2] - z) < 9)) continue;
      if (inText(x, z)) continue;
      kit.tree(x, z, g, 0.8 + rnd() * 1.1);
    }
  }
  const lakeAt = kit.lake(SR, LT, L.shore, L.dock);
  const h0 = world.children.length;
  L.build(kit);
  world.children.slice(h0).forEach((o) => (o.userData.house = true));   // "house only" sketches
  // lit rooms at night: a warm light in every room
  fx.rooms = [];
  if (LT.indoor) for (const r of L.rooms) { const pl = new THREE.PointLight(0xffc77a, 4 * LT.indoor, 9, 1.5); pl.userData.base = 4 * LT.indoor; pl.position.set(r[0], r[1] + 2.6, r[2]); world.add(pl); fx.rooms.push(pl); }
  applyLamps();
  M.warm.emissiveIntensity = LT.indoor ? 2.2 : 0.6;
  buildWeather(lakeAt);

  // wall stops
  const h1 = world.children.length;
  let n = 2, proj = 0;
  STEPS.forEach((step, i) => {
    const s = L.stops[i];
    const isProj = CV.projects.some((p) => p.id === step);
    const pd = isProj ? (proj++ % 2 === 0 ? 1 : -1) : 1;      // 1st project's photo goes right, 2nd left, …
    makeStation(world, step, n++, { c: s.c, nrm: s.n, pd });
  });

  // the exit: a balcony just outside, and the last stop for the chosen ending
  const ex = L.exit, [sx, sy, sz] = ex.sill, [dx, dz] = ex.dir, rot = -Math.atan2(dz, dx);
  const bxC = sx + dx * 1.5, bzC = sz + dz * 1.5;
  block(world, 2.4, 0.2, 3.6, bxC, sy - 0.1, bzC, { rotY: rot, solid: stepMat, mat: sketchMat });
  const px = -dz, pz = dx;
  kit.rail([[sx + dx * 0.3 + px * 1.8, sy + 1, sz + dz * 0.3 + pz * 1.8], [sx + dx * 2.7 + px * 1.8, sy + 1, sz + dz * 2.7 + pz * 1.8],
    [sx + dx * 2.7 - px * 1.8, sy + 1, sz + dz * 2.7 - pz * 1.8], [sx + dx * 0.3 - px * 1.8, sy + 1, sz + dz * 0.3 - pz * 1.8]]);
  fx.balcony = [sx + dx * 1.6, sy, sz + dz * 1.6];
  world.children.slice(h1).forEach((o) => (o.userData.house = true));

  if (ending === "plan") {
    const w = bx1 - bx0, d = bz1 - bz0;                    // lay the text beside the long side
    const place = along
      ? (g) => { g.rotation.order = "YXZ"; g.rotation.set(-Math.PI / 2, Math.PI / 2, 0); g.position.set(bx1 + 3 + Bh / 2, 0.08, bcz); g.scale.setScalar(Bw / CW); }
      : (g) => { g.rotation.x = -Math.PI / 2; g.position.set(bcx, 0.08, bz1 + 3 + Bh / 2); g.scale.setScalar(Bw / CW); };
    makeStation(world, "contact", n, { garden: true, skin: "plan", far: true, place });
    fx.plan = along
      ? { yaw: Math.PI / 2, cx: (bx0 - 2 + bx1 + 3 + Bh + 2) / 2, cz: bcz, long: Math.max(d, Bw) + 8, short: w + Bh + 9 }
      : { yaw: 0, cx: bcx, cz: (bz0 - 2 + bz1 + 3 + Bh + 2) / 2, long: Math.max(w, Bw) + 8, short: d + Bh + 9 };
  } else {
    const yaw = Math.atan2(-dx, -dz), up = 0.5, dist = 30;
    const [cx, cy, cz] = [fx.balcony[0], fx.balcony[1] + E, fx.balcony[2]];
    const f = [-Math.sin(yaw) * Math.cos(up), Math.sin(up), -Math.cos(yaw) * Math.cos(up)];
    makeStation(world, "contact", n, { garden: true, skin: "sky", far: true,
      place: (g) => { g.position.set(cx + f[0] * dist, cy + f[1] * dist, cz + f[2] * dist); g.lookAt(cx, cy, cz); g.scale.setScalar(17 / CW); } });
    const stars = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const a = rnd() * Math.PI * 2, el = 0.12 + rnd() * 1.35, R = 600;
      stars[i * 3] = cx + Math.cos(a) * Math.cos(el) * R; stars[i * 3 + 1] = cy + Math.sin(el) * R; stars[i * 3 + 2] = cz + Math.sin(a) * Math.cos(el) * R;
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(stars, 3));
    fx.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfff6e0, size: 2.6, fog: false, transparent: true, opacity: 0, depthWrite: false }));
    world.add(fx.stars);
    fx.skyYaw = yaw;
  }

  const DUST = 9000, pos = new Float32Array(DUST * 3);  // dust / pollen in the air, all around
  for (let i = 0; i < DUST; i++) {
    pos[i * 3] = bcx + (Math.random() - 0.5) * 320;
    pos[i * 3 + 1] = Math.random() * 14;
    pos[i * 3 + 2] = bcz - 60 + (Math.random() - 0.5) * 320;
  }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: C.chalk, size: 0.03, transparent: true, opacity: 0.7, depthWrite: false }));
  world.add(dust);

  if (SPEED.merge) mergeStatic(world);
  document.fonts.ready.then(() => stations.forEach((st) => (st.img || !st.info.photo) && paintBoard(st)));
  requestAnimationFrame(measure);
}

/* ---------- speed: draw everything that never moves in a few big pieces ----------
   The house and the forest are thousands of small meshes and outlines (each tree, wall piece, chair leg…), and each one is a
   separate draw call. Pieces that never move, never change material and are opaque are merged, per material and per
   house / surroundings (the art styles' "house only" needs that split). Boards, moving things, points and transparent pieces
   (the see-through walls: their draw order matters) stay as they are. Looks the same; S1 in the panel draws them one by one. */
function stripToSegments(g, loop) {                            // a polyline as pairs of points
  const p = g.attributes.position, n = p.count, out = [];
  for (let i = 0; i < n - 1 + (loop ? 1 : 0); i++) {
    const a = i, b = (i + 1) % n;
    out.push(p.getX(a), p.getY(a), p.getZ(a), p.getX(b), p.getY(b), p.getZ(b));
  }
  const s = new THREE.BufferGeometry(); s.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  g.dispose();
  return s;
}
function mergeStatic(world) {
  world.updateMatrixWorld(true);
  const keep = new Set();
  const mark = (o) => o?.isObject3D && o.traverse((n) => keep.add(n));
  for (const v of Object.values(fx)) (Array.isArray(v) ? v.flat() : [v]).forEach(mark);
  stations.forEach((st) => mark(st.grp));
  if (wx) { mark(wx.parts); wx.clouds?.forEach(mark); }                 // weather moves
  const inv = new THREE.Matrix4().copy(world.matrixWorld).invert(), m = new THREE.Matrix4(), nm = new THREE.Matrix3();
  const groups = new Map(), drop = [];
  world.traverse((o) => {
    if (keep.has(o) || o.children.length || !o.visible || o.renderOrder || o.userData.keep) return;
    const line = o.isLine, mesh = o.isMesh && !o.isInstancedMesh;
    if (!line && !mesh) return;
    const mat = o.material;
    // transparent meshes keep their own draw order; transparent lines are thin and are drawn before them (below)
    if (Array.isArray(mat) || (mesh && mat.transparent) || mat === wallMat || o.geometry.morphAttributes?.position) return;
    let house = false, hidden = false;
    for (let a = o; a && a !== world; a = a.parent) { if (a.userData.house) house = true; if (!a.visible) hidden = true; }
    if (hidden) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    if (line && !o.isLineSegments) g = stripToSegments(g, o.isLineLoop);
    const edges = line && o.geometry.type === "EdgesGeometry";             // the art styles redraw only outlines
    const names = line ? ["position"] : Object.keys(g.attributes).filter((n) => ["position", "normal", "uv"].includes(n)).sort();
    const key = `${line ? "L" : "M"}|${mat.uuid}|${house}|${edges}|${names.join(",")}`;
    m.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(m);
    let G = groups.get(key);
    if (!G) groups.set(key, (G = { line, edges, mat, house, names, parts: [] }));
    G.parts.push(g); drop.push([o, G]);
  });
  for (const { line, edges, mat, house, names, parts } of groups.values()) {
    if (parts.length < 2) { parts[0].dispose(); continue; }
    const out = new THREE.BufferGeometry();
    for (const n of names) {
      const size = parts[0].attributes[n].itemSize, total = parts.reduce((t, g) => t + g.attributes[n].count, 0);
      const arr = new Float32Array(total * size);
      let off = 0;
      for (const g of parts) { arr.set(g.attributes[n].array.subarray(0, g.attributes[n].count * size), off); off += g.attributes[n].count * size; }
      out.setAttribute(n, new THREE.BufferAttribute(arr, size));
    }
    parts.forEach((g) => g.dispose());
    const obj = line ? new THREE.LineSegments(out, mat) : new THREE.Mesh(out, mat);
    obj.userData.house = house; obj.userData.merged = true;
    if (edges) obj.userData.edges = true;                      // the art styles redraw these as hand-drawn lines
    if (line && mat.transparent) obj.renderOrder = -1;         // before the see-through walls, as they were when sorted one by one
    world.add(obj);
  }
  // take out the originals that went into a merged piece (a piece alone in its group stays where it was);
  // their geometry is not disposed here: some is shared with pieces that stay
  for (const [o, G] of drop) if (G.parts.length >= 2) o.removeFromParent();
}

/* ================= weather ================= */
let wx = null;
function buildWeather({ cx, cz }) {
  wx = { parts: null, kind: null, clouds: [], flash: 0, nextFlash: 3 };
  const rects = L.rects;                                      // no rain or snow inside the house
  wx.inside = (x, z, y) => y < UP + H + 0.3 && rects.some((r) => x > r[0] && x < r[2] && z > r[1] && z < r[3]);
  const BOX = 36;
  const make = (n, kind) => {
    const pos = new Float32Array(n * (kind === "rain" ? 6 : 3)), seedP = [];
    for (let i = 0; i < n; i++) seedP.push([rnd() * BOX * 2 - BOX, rnd() * 26, rnd() * BOX * 2 - BOX, 0.6 + rnd() * 0.8]);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const obj = kind === "rain"
      ? new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: LT.indoor ? 0x9aa6c0 : 0xc8d2da, transparent: true, opacity: 0.55 }))
      : new THREE.Points(g, new THREE.PointsMaterial({ color: kind === "snow" ? 0xffffff : 0xc9862f, size: kind === "snow" ? 0.09 : 0.12, transparent: true, opacity: 0.9, depthWrite: false }));
    obj.frustumCulled = false;
    world.add(obj);
    wx.parts = { obj, seedP, kind, BOX };
  };
  if (WT.rain) make(WT.rain, "rain");
  else if (WT.snow) make(WT.snow, "snow");
  else if (WT.leaves) make(WT.leaves, "leaves");
  const cloudMat = new THREE.MeshStandardMaterial({ color: LT.indoor ? 0x3a4256 : WT.darken > 0.4 ? 0x6e747c : 0xf2f4f5, roughness: 1, flatShading: true, transparent: true, opacity: 0.92 });
  for (let i = 0; i < (WT.clouds || 0); i++) {
    const grp = new THREE.Group(), n = 3 + Math.floor(rnd() * 4);
    for (let k = 0; k < n; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(8 + rnd() * 10, 1), cloudMat); b.position.set(k * 11 - n * 5, rnd() * 4, rnd() * 8); b.scale.y = 0.45; grp.add(b); }
    grp.position.set(cx + (rnd() - 0.5) * 700, 70 + rnd() * 50, cz + (rnd() - 0.5) * 700);
    world.add(grp); wx.clouds.push(grp);
  }
  if (WT.rainbow) {
    const cols = ["#FF6B6B", "#FFA94D", "#FFE066", "#8CE99A", "#74C0FC", "#9775FA"];
    cols.forEach((col, i) => {
      const arc = new THREE.Mesh(new THREE.RingGeometry(150 + i * 4, 154 + i * 4, 96, 1, 0, Math.PI), new THREE.MeshBasicMaterial({ color: col, fog: false, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
      arc.position.set(cx + 40, -20, cz - 300); world.add(arc);
    });
  }
}
function updateWeather(t, target) {
  if (!wx) return;
  const dt = Math.min(0.05, t - (wx.t ?? t)); wx.t = t;
  const wind = WT.wind || 0;
  if (fx.sway && wind && !reducedMotion) for (const [m, z0, ph] of fx.sway) m.rotation.z = z0 + Math.sin(t * 1.8 + ph) * 0.08 * wind;
  for (const c of wx.clouds) { c.position.x += dt * (WT.cloudSpeed || 1) * 1.5; if (c.position.x > 420) c.position.x -= 840; }
  if (WT.lightning && !reducedMotion) {                       // flashes now and then
    if (t > wx.nextFlash) { wx.flash = 1; wx.nextFlash = t + 4 + Math.random() * 7; }
    wx.flash = Math.max(0, wx.flash - dt * 4);
    hemi.intensity += wx.flash * 4; scene.background.lerp(new THREE.Color(0xdfe6ff), wx.flash * 0.6); scene.fog.color.copy(scene.background);
  }
  const P = wx.parts;
  if (!P || reducedMotion) return;
  const arr = P.obj.geometry.attributes.position.array, c = camera.position, B = P.BOX;
  const fall = P.kind === "rain" ? 22 : P.kind === "snow" ? 1.6 : 0.8, slant = P.kind === "rain" ? 0.25 + wind * 0.5 : wind * 2.5;
  for (let i = 0; i < P.seedP.length; i++) {
    const s = P.seedP[i];
    s[1] -= fall * s[3] * dt;
    if (P.kind === "snow") s[0] += Math.sin(t + i) * 0.3 * dt; else s[0] += slant * fall * s[3] * dt * (P.kind === "leaves" ? 3 : 1);
    if (P.kind === "leaves") s[1] += Math.sin(t * 2 + i) * 0.6 * dt;
    if (s[1] < -1) s[1] += 26;
    // wrap the box around the camera
    let x = ((s[0] - c.x + B) % (2 * B) + 2 * B) % (2 * B) - B + c.x;
    let z = ((s[2] - c.z + B) % (2 * B) + 2 * B) % (2 * B) - B + c.z;
    let y = s[1] + c.y - 8;
    if (y < -0.6 || wx.inside(x, z, y)) y = -500;
    if (P.kind === "rain") { const k = i * 6; arr[k] = x; arr[k + 1] = y; arr[k + 2] = z; arr[k + 3] = x - slant * 0.5; arr[k + 4] = y + 0.55; arr[k + 5] = z; }
    else { const k = i * 3; arr[k] = x; arr[k + 1] = y; arr[k + 2] = z; }
  }
  P.obj.geometry.attributes.position.needsUpdate = true;
}

/* ================= scroll → camera ================= */
let anchors = [], pageH = 0;
function measure() {
  pageH = document.documentElement.scrollHeight;
  anchors = [...document.querySelectorAll("[data-step]")].map((s) => s.getBoundingClientRect().top + scrollY);
  anchors.push(document.documentElement.scrollHeight - innerHeight);
  renderer.setSize(innerWidth, innerHeight, false);
  art.resize();
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < 760 ? 64 : 52;
  camera.updateProjectionMatrix();
  curveCache.clear();
}
function stepAtScroll(y) {
  for (let k = 0; k < anchors.length - 1; k++) {
    if (y < anchors[k + 1]) return k + Math.max(0, (y - anchors[k]) / (anchors[k + 1] - anchors[k]));
  }
  return anchors.length - 1;
}
const tanHalf = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
// phones (portrait): stand close and face the photo; the board's text is shown as a card at the bottom instead
const phone = () => camera.aspect < 0.85;
// distance from a wall so the whole board (and an overhanging photo) fits the screen
const viewDist = () => phone() ? 4.3 : Math.max(3.3, (CW / 2 + 0.25 + (html.dataset.a === "resize" ? PW / 4 : 0)) / (tanHalf() * camera.aspect));
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const angLerp = (a, b, t) => a + wrapA(b - a) * t;

function holdOf(i) {          // where the camera stands to read stop i (-1 = the entrance)
  if (i < 0) return { pos: v3(L.start), yaw: 0 };
  const s = L.stops[i], d = viewDist(), st = stations[i];
  const side = phone() && st?.info.photo ? st.pd * (CW - PW) / 2 : 0;    // where the photo ends up (A2 crop), along the board
  return { pos: new THREE.Vector3(s.c[0] + s.n[0] * d + s.n[1] * side, s.c[1] + E, s.c[2] + s.n[1] * d - s.n[0] * side), yaw: Math.atan2(s.n[0], s.n[1]) };
}
const curveCache = new Map();
function legCurve(i) {        // walking line from stop i-1 to stop i (i = STEPS.length → to the exit sill)
  const key = `${layoutKey}:${i}`;
  if (curveCache.has(key)) return curveCache.get(key);
  const from = holdOf(i - 1).pos, isExit = i === STEPS.length;
  const via = (isExit ? L.exit.via : L.stops[i].via).map((p) => v3(p));
  const to = isExit ? v3(L.exit.sill) : holdOf(i).pos;
  const curve = new THREE.CatmullRomCurve3([from, ...via, to], false, "centripetal");
  const len = curve.getLength();
  const out = { curve, a: clamp(0.18 + len / 90, 0.28, 0.55) };
  curveCache.set(key, out);
  return out;
}
function walk(i, u, fromYaw, toYaw) {
  const { curve } = legCurve(i), p = curve.getPointAt(u), tg = curve.getTangentAt(u);
  const ty = Math.atan2(-tg.x, -tg.z);
  let yaw = angLerp(fromYaw, ty, ss(0, 0.2, u));
  yaw = angLerp(yaw, toYaw, ss(0.7, 1, u));
  return { pos: p, yaw };
}

function pose(stepF) {
  const out = { pos: v3(L.start), yaw: 0, pitch: 0, still: 0, st: null, reveal: 0, dusk: 0, high: 0 };
  const r = Math.min(STEPS.length + 1, Math.floor(stepF)), f = clamp(stepF - r);
  if (r === 0) return out;
  if (r <= STEPS.length) {                                     // walk to a wall, then hold still
    const i = r - 1, { a } = legCurve(i), from = holdOf(i - 1), to = holdOf(i);
    if (f < a) { const w = walk(i, ss(0, a, f), from.yaw, to.yaw); out.pos = w.pos; out.yaw = w.yaw; }
    else { out.pos = to.pos; out.yaw = to.yaw; }
    out.still = ss(a - 0.04, a + 0.04, f);
    if (phone()) out.pitch = -0.14 * out.still;                  // look down a little: the board sits above the card
    out.st = stations[i]; out.reveal = ss(a + 0.05, a + 0.25, f);
    return out;
  }
  // the last stop: walk to the exit, step onto the balcony, then the ending
  const i = STEPS.length, { a } = legCurve(i), from = holdOf(i - 1);
  const [dx, dz] = L.exit.dir, outYaw = Math.atan2(-dx, -dz);
  const bal = v3(fx.balcony);
  out.st = stations[STEPS.length];
  if (f < a) { const w = walk(i, ss(0, a, f), from.yaw, outYaw); out.pos = w.pos; out.yaw = w.yaw; return out; }
  const g = (f - a) / (1 - a), sill = v3(L.exit.sill);
  out.pos = sill.clone().lerp(bal, ss(0, 0.2, g)); out.yaw = outYaw;
  if (endingKey === "plan") {
    const P = fx.plan, tf = tanHalf();
    const tall = Math.max(L.exit.sill[1], ...L.stops.map((s) => s.c[1])) + H;
    const h = Math.max(P.long / 2 / (tf * camera.aspect), P.short / 2 / tf) + 2 + tall * 0.7;
    const up = ss(0.15, 0.7, g);
    out.pos = new THREE.Vector3(lerp(out.pos.x, P.cx, up), lerp(out.pos.y, h, up * up), lerp(out.pos.z, P.cz, up));
    out.pitch = -1.55 * ss(0.2, 0.6, g);
    out.yaw = angLerp(outYaw, P.yaw, ss(0.3, 0.7, g));
    out.high = up; out.still = ss(0.66, 0.74, g); out.reveal = ss(0.72, 0.92, g);
  } else {
    out.yaw = fx.skyYaw;
    out.pitch = 0.4 * ss(0.3, 0.65, g);
    out.dusk = ss(0.05, 0.7, g); out.still = ss(0.62, 0.7, g); out.reveal = ss(0.7, 0.9, g);
  }
  return out;
}

const mouse = { x: 0, y: 0 };
addEventListener("pointermove", (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; });
// resize: the sections are in vh, so a phone turned sideways changes every length in px; stay at the same place in the walk
// (by the time "resize" fires the browser has already clamped scrollY to the new height, so use the place from the last frame)
let walkAt = null;
addEventListener("resize", () => {
  const was = walkAt, h0 = pageH;
  measure();
  if (was === null || Math.abs(document.documentElement.scrollHeight - h0) < 2) return;   // (address bar showing/hiding: no change)
  const k = Math.min(Math.floor(was), anchors.length - 2), f = was - k;
  scrollTo({ top: anchors[k] + f * (anchors[k + 1] - anchors[k]), behavior: "instant" });
});

// the menu (About, Work, …): a section's top is where the walk *to* its wall starts, so go to where the camera holds
// at that wall with its text out instead; the same for a #link opened from outside
function holdY(id) {
  const k = [...document.querySelectorAll("[data-step]")].findIndex((s) => s.id === id);
  if (k < 1 || !L) return 0;
  const { a } = legCurve(k - 1);
  const f = k <= STEPS.length ? Math.min(0.9, a + 0.32) : a + 0.92 * (1 - a);     // walls: text revealed; the last: the ending's text
  return anchors[k] + f * (anchors[k + 1] - anchors[k]);
}
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

// the last text is clickable (email)
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function contactHit(e) {
  const st = stations.find((s) => s.info.contact);
  if (!st) return false;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObject(st.board).length > 0;
}
/* ---------- clicking a project board opens its sheet (explore.js) ---------- */
function projectHit(e) {                   // the project board under the pointer, if it is near enough to read
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const sts = stations.filter((s) => s.info.project);
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

const cam = { pos: new THREE.Vector3(0.35, E, 4), yaw: 0, pitch: 0 };
let lastFrame = 0, snapCam = false;
let mYaw = 0, mPitch = 0;
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
// slow device: if frames stay slow (>45 ms, ~22 fps) for 3 s while visible, drop to 1 pixel per CSS pixel, once
let slowFor = 0, lastT = 0;
function watchSpeed(t) {
  const dt = t - lastT; lastT = t;
  if (renderer.getPixelRatio() <= 1 || document.hidden || dt > 0.5) return;
  slowFor = dt > 0.045 ? slowFor + dt : 0;
  if (slowFor > 3) { renderer.setPixelRatio(1); measure(); }
}
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
function render() {
  if (html.classList.contains("locked")) { requestAnimationFrame(render); return; }   // a sheet or the viewer covers it: rest
  const t = clock.getElapsedTime();
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

  for (const st of stations) {                         // the photo moves aside once the camera holds
    let p = 0;
    if (st === target.st) {
      if (reducedMotion) p = 1;
      else if (html.dataset.c === "trigger") {
        if (target.reveal > 0 && st.tStart === null) st.tStart = t;
        p = st.tStart === null ? 0 : ss(0, 1.3, t - st.tStart);
      } else p = target.reveal;
    } else st.tStart = null;
    st.p += (p - st.p) * (html.dataset.c === "trigger" ? 1 : per(0.2));
    placePhoto(st, st.p);
  }

  // air: grey inside, greener outside, darker at dusk, clearer high up
  const [dx, dz] = L.exit.dir;
  const o = L.outdoor ? 1 : clamp(tmp.copy(cam.pos).sub(v3(L.exit.sill, 0)).dot(new THREE.Vector3(dx, 0, dz)) / 3);
  scene.background.copy(fogIn).lerp(fogOut, o);
  if (target.dusk) scene.background.lerp(duskAir, target.dusk);
  scene.fog.color.copy(scene.background);
  scene.fog.density = lerp(0.034, env.fog, o) * (1 - 0.95 * target.high);
  sun.intensity = lerp(0.6, env.sun, o) * (1 - 0.85 * target.dusk);
  if (fx.dome) (fx.dome.userData.art?.mat || fx.dome.material).color.setScalar(env.dome * (1 - 0.78 * target.dusk));
  hemi.intensity = env.hemi * (1 - 0.6 * target.dusk);
  updateWeather(t, target);
  if (fx.stars) fx.stars.material.opacity = target.dusk;
  if (dust && !reducedMotion) { dust.rotation.y = Math.sin(t * 0.05) * 0.01; dust.position.y = Math.sin(t * 0.2) * 0.08; }
  if (fx.water && !reducedMotion) { const w = 1 + (WT.wind || 0) * 2.5 + (WT.rain ? 1 : 0); fx.water.offset.set(t * 0.004 * w, t * 0.0025 * w); }
  if (fx.boat && !reducedMotion) { fx.boat.position.y = -0.5 + Math.sin(t * 1.1) * 0.03; fx.boat.rotation.z = Math.sin(t * 0.8) * 0.02; }

  // the board being read stays crisp in the art styles; it comes into focus as the camera settles
  art.render(clamp(env.sun / 1.6) * (1 - target.dusk));   // the art styles keep night as night
  if (stats) showStats(t);
  requestAnimationFrame(render);
}

/* ================= speed ================= */
const SPEEDS = {
  fast: { label: "S2 Faster: still parts drawn together (looks the same)", merge: true },
  plain: { label: "S1 As before: every part drawn on its own", merge: false },
};
let SPEED = SPEEDS.fast;

/* ================= options panel ================= */
// decided (2026-11-15): these options are fixed; only lamps, art style and house colours stay switchable
const FIXED = { h: "stack", p: "3", s: "forestPeaks", n: "summer", t: "night", x: "clear", w: "see", g: "sky", u: "off", v: "house", a: "crop", b: "exact", c: "scrub" };
for (const k of ["a", "b", "c"]) html.dataset[k] = FIXED[k];
initLab({
  defaults: { l: "warm", y: "current", k: "drafting", f: "fast", i: "webp" },
  groups: {
    l: { label: "Lamps", options: Object.entries(LAMPS).map(([k, v]) => [k, v.label]) },
    y: { label: "Art style", options: Object.entries(ART).map(([k, v]) => [k, v.label]) },
    k: { label: "House colours", options: Object.entries(PALETTES).map(([k, v]) => [k, v.label]) },
    f: { label: "Speed (add ?stats to the address for a frame-rate readout)", options: Object.entries(SPEEDS).map(([k, v]) => [k, v.label]) },
    i: { label: "Images", options: [["webp", "I2 WebP (about 40% smaller download)"], ["jpeg", "I1 JPEG (as before)"]] },
  },
  storageKey: "p1-lake3",
  title: "Options",
  backHref: location.hostname.endsWith("github.io") ? null : "../index.html",   // the hosted copy has no prototype list
  onChange: (picked) => {
    const s = { ...FIXED, ...picked };
    LAMP = LAMPS[s.l] || LAMPS.warm;
    applyPalette(s.k, s.w); art.setStyle(s.y); art.setHatching(s.u !== "off");
    const want = [s.h, s.g, s.s, s.t, s.x, s.n, s.p, s.f, s.i].join("|");   // speed and image format rebuild the scene too
    if (want !== buildKey) { SPEED = SPEEDS[s.f] || SPEEDS.fast; buildLayout(s.h, s.g, s.s, s.t, s.x, s.n, s.p); buildKey = want; }
    else stations.forEach((st) => (st.img || !st.info.photo) && paintBoard(st));
    const d = LT.disc;                                   // the art styles shade the faces turned from the sun / moon
    art.apply(world, { bounds: L.bounds, sun: d ? new THREE.Vector3(d[0], d[1], -520) : new THREE.Vector3(-4, 12, 6), houseOnly: s.v === "house" });
    html.dataset.night = LT.sun < 1 ? "1" : "0";        // page text turns light on the night sky
    html.dataset.paper = !art.on || s.v === "house" || LT.sun < 1 ? "none" : ART[s.y].dark ? "dark" : "light";   // page text on the sketch
    applyLamps();
    curveCache.clear();
  },
});
measure();
requestAnimationFrame(() => { canvas.classList.add("ready"); render(); });
