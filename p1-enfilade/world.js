import * as THREE from "three";
import { T, E, CW, C, STEPS, LOOK, wallMat, lineMat, sketchMat, stepMat, leafA, bark, M, books, shared, floorMat, floorMats, grassTexture } from "./common.js";
import { lakeHouse } from "./layouts.js";
import { makeStation } from "./boards.js";
import { mergeStatic } from "./merge.js";

/* The world: the lake house (the plan comes from layouts.js), the lake and forest around it, the mountains, the night sky,
   the balcony and the last board among the stars. buildWorld() makes all of it; nothing here runs per frame. */

let G = null, fx = null;                          // the group being built and its moving parts
let seed = 7;                                     // the forest, rocks and reeds are the same on every visit
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

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

/* ---------- the building kit handed to layouts.js ---------- */
const kit = {
  // a straight wall from a to b ([x, z]), y0..y1, with openings { at (m from a), w, y0, y1 } (absolute heights)
  wall(a, b, y0, y1, openings = [], { th = T, solid = null, mat = lineMat } = {}) {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), rot = -Math.atan2(dz, dx);
    const ux = dx / L, uz = dz / L;
    const piece = (s0, s1, ya, yb) => {
      if (s1 - s0 < 0.01 || yb - ya < 0.01) return;
      const m = (s0 + s1) / 2;
      block(G, s1 - s0, yb - ya, th, a[0] + ux * m, (ya + yb) / 2, a[1] + uz * m, { rotY: rot, solid, mat });
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
  // a floor slab whose top is at y, optionally with one rectangular opening [x0, z0, x1, z1]
  slab(x0, z0, x1, z1, y, { th = 0.2, hole = null } = {}) {
    const r = (a0, b0, a1, b1) => {
      if (a1 - a0 < 0.01 || b1 - b0 < 0.01) return;
      block(G, a1 - a0, th, b1 - b0, (a0 + a1) / 2, y - th / 2, (b0 + b1) / 2, { solid: floorMat(a1 - a0, b1 - b0), mat: sketchMat });
    };
    if (!hole) return r(x0, z0, x1, z1);
    const [hx0, hz0, hx1, hz1] = hole;
    r(x0, z0, hx0, z1); r(hx1, z0, x1, z1); r(hx0, z0, hx1, hz0); r(hx0, hz1, hx1, z1);
  },
  // a straight flight of floating treads from a to b ([x, z]) rising y0 → y1
  flight(a, b, y0, y1, w = 1.2, n = 18) {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), rot = -Math.atan2(dz, dx);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, top = y0 + ((y1 - y0) * (i + (y1 > y0 ? 1 : 0))) / n;
      block(G, L / n + 0.02, 0.07, w, a[0] + dx * t, top - 0.035, a[1] + dz * t, { rotY: rot, solid: stepMat, mat: sketchMat });
    }
    const px = (-dz / L) * (w / 2), pz = (dx / L) * (w / 2);
    kit.rail([[a[0] + px, y0 + 0.9, a[1] + pz], [b[0] + px, y1 + 0.9, b[1] + pz]]);
  },
  rail(points, mat = lineMat) { G.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p))), mat)); },
  post(x, z, y0, y1) { block(G, 0.2, y1 - y0, 0.2, x, (y0 + y1) / 2, z, { solid: M.post, mat: sketchMat }); },
  boardwalk(x0, z0, x1, z1) {
    kit.slab(x0, Math.min(z0, z1) + 0.05, x1, Math.max(z0, z1), 0.07, { th: 0.15 });
    for (let z = Math.max(z0, z1); z >= Math.min(z0, z1); z -= 3) for (const x of [x0 + 0.1, x1 - 0.1]) kit.post(x, z, -1.6, 0);
  },
  boat(x, z) {
    const g = new THREE.Group(); g.position.set(x, -0.5, z); G.add(g);
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
  // simple solid furniture; local +z is the front, rot turns it (π/2 = facing +x)
  furn(type, x, y, z, rot = 0, size = []) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; G.add(g);
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
};

function pine(x, z, y = 0, s = 1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.1 * s, 1.2 * s, 6), bark);
  trunk.position.set(x, y + 0.6 * s, z); G.add(trunk);
  for (let k = 0; k < 3; k++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry((1.15 - k * 0.3) * s, 1.6 * s, 7), M.pine);
    c.position.set(x, y + (1.5 + k * 0.85) * s, z); c.rotation.y = rnd() * 3; G.add(c);
  }
}

/* ---------- the lake, the forest on its shore, the mountains and the night sky ---------- */
function lake(shoreZ, dockX) {
  const { rx, rz } = LOOK.lake, cx = 0;
  const wob = (t) => 1 + 0.07 * Math.sin(3 * t + 1.3) + 0.045 * Math.sin(7 * t + 0.4) + 0.025 * Math.sin(13 * t + 2.1);
  const cz = shoreZ - rz * wob(Math.PI / 2);
  const P = (t, k = 1) => [cx + rx * k * wob(t) * Math.cos(t), cz + rz * k * wob(t) * Math.sin(t)];
  const ring = (k) => { const pts = []; for (let i = 0; i < 160; i++) { const [x, z] = P((i / 160) * Math.PI * 2, k); pts.push(new THREE.Vector2(x, -z)); } return pts; };
  const flat = (shape, mat, y) => { const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 1), mat); m.rotation.x = -Math.PI / 2; m.position.y = y; G.add(m); return m; };
  const nearDock = (x, z, r) => Math.abs(x - dockX) < r && z > shoreZ - r * 1.5 && z < shoreZ + r * 2;
  const inLake = (x, z, k = 1) => { const t = Math.atan2((z - cz) / rz, (x - cx) / rx); return Math.hypot((x - cx) / rx, (z - cz) / rz) < k * wob(t); };
  // water
  const wc = document.createElement("canvas"); wc.width = wc.height = 256;
  const g = wc.getContext("2d");
  g.fillStyle = LOOK.waterBase; g.fillRect(0, 0, 256, 256);
  let sd = 11; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++) { g.strokeStyle = r() > 0.5 ? "rgba(214,228,230,.22)" : "rgba(40,62,70,.25)"; g.lineWidth = 1 + r() * 1.5;
    const x = r() * 256, y = r() * 256, l = 8 + r() * 26; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 2, x + l, y); g.stroke(); }
  const wt = new THREE.CanvasTexture(wc); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(70, 70); wt.colorSpace = THREE.SRGBColorSpace;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.18, metalness: 0.3, color: LOOK.waterTint }));
  water.rotation.x = -Math.PI / 2; water.position.set(cx, -0.6, cz); G.add(water);
  fx.water = wt; water.material.userData.artKind = "water";
  // land with a hole for the lake and a thin beach
  const land = new THREE.Shape([new THREE.Vector2(cx - 450, -(cz - 450)), new THREE.Vector2(cx + 450, -(cz - 450)), new THREE.Vector2(cx + 450, -(cz + 450)), new THREE.Vector2(cx - 450, -(cz + 450))]);
  land.holes.push(new THREE.Path(ring(1.015)));
  const gt = grassTexture().clone(); gt.needsUpdate = true; gt.repeat.set(1 / 3, 1 / 3);
  flat(land, new THREE.MeshStandardMaterial({ map: gt, roughness: 1 }), 0.0);
  const beach = new THREE.Shape(ring(1.015)); beach.holes.push(new THREE.Path(ring(1.0)));
  flat(beach, M.sand, -0.05);
  // reeds and rocks at the edge, lily pads
  for (let i = 0; i < LOOK.lake.reeds; i++) {
    const t = rnd() * Math.PI * 2, [x, z] = P(t, 0.96 + rnd() * 0.035);
    if (nearDock(x, z, 8)) continue;
    const pts = [];
    for (let k = 0; k < 14; k++) { const ox = x + (rnd() - 0.5) * 1.6, oz = z + (rnd() - 0.5) * 1.6, hgt = 0.8 + rnd() * 1.1;
      pts.push(new THREE.Vector3(ox, -0.6, oz), new THREE.Vector3(ox + (rnd() - 0.5) * 0.2, hgt - 0.6, oz + (rnd() - 0.5) * 0.2)); }
    G.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), M.reed));
  }
  for (let i = 0; i < 40; i++) {
    const t = rnd() * Math.PI * 2, [x, z] = P(t, 1.0 + rnd() * 0.05), s = 0.3 + rnd() * 0.9;
    if (nearDock(x, z, 4)) continue;
    const rk = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), M.rock); rk.position.set(x, -0.1, z); rk.rotation.set(rnd(), rnd(), rnd()); G.add(rk);
  }
  for (let i = 0; i < LOOK.lake.pads; i++) {
    const side = rnd() > 0.5 ? 1 : -1, x = side * (13 + rnd() * 20), z = -4 - rnd() * 40;
    if (!inLake(x, z, 0.9)) continue;
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.3 + rnd() * 0.25, 12, 0.3, Math.PI * 1.8), M.pad);
    pad.rotation.x = -Math.PI / 2; pad.rotation.z = rnd() * 6; pad.position.set(x, -0.585, z); G.add(pad);
  }
  // pines close around the shore
  for (let i = 0; i < LOOK.lake.treeN; i++) {
    const t = rnd() * Math.PI * 2, [x, z] = P(t, 1.03 + rnd() * (1.7 - 1.03));
    if (nearDock(x, z, 10)) continue;
    pine(x, z, 0, (1 + rnd() * 1.8) * 1.2);
  }
  // the mountain ring: its own random sequence, so it stays put whatever else changes
  let ms = 4242; const mr = () => ((ms = (ms * 16807) % 2147483647) / 2147483647);
  const mcz = shoreZ - 70 * wob(Math.PI / 2);
  for (let i = 0; i < 26; i++) {
    const t = (i / 26) * Math.PI * 2 + mr() * 0.2, d = 230 + mr() * 120, h = 70 + mr() * 90, rad = 70 + mr() * 60;
    if (Math.sin(t) > 0.55) continue;
    const x = cx + Math.cos(t) * d, z = mcz + Math.sin(t) * d;
    const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 6 + (i % 3)), M.mountain); m.position.set(x, h / 2 - 4, z); m.rotation.y = mr() * 3; G.add(m);
    const capH = h * 0.3;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(rad * (capH / h) * 1.045, capH, 6 + (i % 3)), M.snow); cap.position.set(x, h - 4 - capH / 2 + h * 0.012, z); cap.rotation.y = m.rotation.y; G.add(cap);
  }
  // sky dome, the moon, stars
  const c = document.createElement("canvas"); c.width = 4; c.height = 256;
  const gg = c.getContext("2d"), gr = gg.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, LOOK.sky[0]); gr.addColorStop(0.5, LOOK.sky[1]); gr.addColorStop(1, LOOK.sky[1]);
  gg.fillStyle = gr; gg.fillRect(0, 0, 4, 256);
  const st = new THREE.CanvasTexture(c); st.colorSpace = THREE.SRGBColorSpace;
  fx.dome = new THREE.Mesh(new THREE.SphereGeometry(620, 32, 16), new THREE.MeshBasicMaterial({ map: st, side: THREE.BackSide, fog: false, depthWrite: false }));
  fx.dome.material.userData.artKind = "sky";
  fx.dome.position.set(cx, 0, cz); G.add(fx.dome);
  const [dx, dy, size, col] = LOOK.moon;
  const moon = new THREE.Mesh(new THREE.CircleGeometry(size, 48), new THREE.MeshBasicMaterial({ color: col, fog: false, transparent: true }));
  moon.position.set(cx + dx, dy, cz - 520); moon.lookAt(0, 2, 0); G.add(moon); fx.moon = moon;
  const n = 1200, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = rnd() * 6.28, el = 0.05 + rnd() * 1.45, R = 560; pos[i * 3] = cx + Math.cos(a) * Math.cos(el) * R; pos[i * 3 + 1] = Math.sin(el) * R; pos[i * 3 + 2] = cz + Math.sin(a) * Math.cos(el) * R; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  fx.nightStars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, fog: false, transparent: true, opacity: 0.9, depthWrite: false }));
  G.add(fx.nightStars);
}

export function disposeWorld(w) {
  w.group.traverse((n) => {
    n.geometry?.dispose?.();
    const ms = Array.isArray(n.material) ? n.material : n.material ? [n.material] : [];
    for (const m of ms) if (!shared.has(m)) { m.map?.dispose?.(); m.dispose?.(); }
  });
}

/* Build everything. merge: draw the still parts together (panel: Speed). Returns
   { group, L (the plan and walking route), stations (one board per stop, then the last one), fx (the parts that move), dust } */
export function buildWorld({ merge = true } = {}) {
  floorMats.length = 0;
  const L = lakeHouse();
  G = new THREE.Group(); fx = {};
  seed = 7;
  const stations = [];
  const house = (from) => G.children.slice(from).forEach((o) => (o.userData.house = true));   // "house only" art styles

  lake(L.shore, L.dock);
  const h0 = G.children.length;
  L.build(kit);
  house(h0);
  // lit rooms at night: a warm light in every room
  fx.rooms = [];
  for (const r of L.rooms) { const pl = new THREE.PointLight(0xffc77a, LOOK.roomLight, 9, 1.5); pl.userData.base = LOOK.roomLight; pl.position.set(r[0], r[1] + 2.6, r[2]); G.add(pl); fx.rooms.push(pl); }

  // wall stops; the 1st project's photo moves right, the 2nd left, …
  const h1 = G.children.length;
  let n = 2, proj = 0;
  STEPS.forEach((step, i) => {
    const s = L.stops[i];
    const pd = window.CV.projects.some((p) => p.id === step) ? (proj++ % 2 === 0 ? 1 : -1) : 1;
    stations.push(makeStation(G, step, n++, { c: s.c, nrm: s.n, pd }));
  });

  // the exit: a balcony just outside
  const ex = L.exit, [sx, sy, sz] = ex.sill, [dx, dz] = ex.dir, rot = -Math.atan2(dz, dx);
  block(G, 2.4, 0.2, 3.6, sx + dx * 1.5, sy - 0.1, sz + dz * 1.5, { rotY: rot, solid: stepMat, mat: sketchMat });
  const px = -dz, pz = dx;
  kit.rail([[sx + dx * 0.3 + px * 1.8, sy + 1, sz + dz * 0.3 + pz * 1.8], [sx + dx * 2.7 + px * 1.8, sy + 1, sz + dz * 2.7 + pz * 1.8],
    [sx + dx * 2.7 - px * 1.8, sy + 1, sz + dz * 2.7 - pz * 1.8], [sx + dx * 0.3 - px * 1.8, sy + 1, sz + dz * 0.3 - pz * 1.8]]);
  fx.balcony = [sx + dx * 1.6, sy, sz + dz * 1.6];
  house(h1);

  // the ending (G2): on the balcony, look up; the contact text hangs among the stars
  const yaw = Math.atan2(-dx, -dz), up = 0.5, dist = 30;
  const [cx, cy, cz] = [fx.balcony[0], fx.balcony[1] + E, fx.balcony[2]];
  const f = [-Math.sin(yaw) * Math.cos(up), Math.sin(up), -Math.cos(yaw) * Math.cos(up)];
  stations.push(makeStation(G, "contact", n, { sky: true,
    place: (g) => { g.position.set(cx + f[0] * dist, cy + f[1] * dist, cz + f[2] * dist); g.lookAt(cx, cy, cz); g.scale.setScalar(17 / CW); } }));
  const stars = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const a = rnd() * Math.PI * 2, el = 0.12 + rnd() * 1.35, R = 600;
    stars[i * 3] = cx + Math.cos(a) * Math.cos(el) * R; stars[i * 3 + 1] = cy + Math.sin(el) * R; stars[i * 3 + 2] = cz + Math.sin(a) * Math.cos(el) * R;
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(stars, 3));
  fx.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfff6e0, size: 2.6, fog: false, transparent: true, opacity: 0, depthWrite: false }));
  G.add(fx.stars);
  fx.skyYaw = yaw;

  // dust / pollen in the air, all around
  const [bx0, bz0, bx1, bz1] = L.bounds, bcx = (bx0 + bx1) / 2, bcz = (bz0 + bz1) / 2;
  const DUST = 9000, pos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    pos[i * 3] = bcx + (Math.random() - 0.5) * 320;
    pos[i * 3 + 1] = Math.random() * 14;
    pos[i * 3 + 2] = bcz - 60 + (Math.random() - 0.5) * 320;
  }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: C.chalk, size: 0.03, transparent: true, opacity: 0.7, depthWrite: false }));
  G.add(dust);

  if (merge) mergeStatic(G, [...Object.values(fx).flat(), ...stations.map((st) => st.grp)]);
  return { group: G, L, stations, fx, dust };
}
