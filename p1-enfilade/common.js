import * as THREE from "three";

/* What every part of P1 shares: sizes, the decided look, the stops, materials and house colours. */

export const H = 3.4, UP = 3.6, T = 0.16, E = 1.62;     // wall height, upper floor level, wall thickness, eye height
export const CW = 4.4, CH = 2.3, PW = 2.4;              // wall board size, photo width after the reveal
export const C = { chalk: 0xeef0ee, slate: 0x27313b, sodium: 0xe9b44c };

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// the stops, in walking order; the last one ("contact") hangs in the night sky beyond the balcony
export const STEPS = ["about", ...window.CV.projects.map((p) => p.id), "path"];

/* The decided look (2026-11-15): a forest lake under mountains (S9), summer (N1), a clear night with a moon (T6, W1).
   The other lakes, seasons, times of day and weathers are in git history (before 2026-11-19). */
export const LOOK = {
  air: "#1D2433", sky: ["#0B1020", "#26324A"], fog: 0.0032,
  sun: 0.25, sunColor: "#C8D4FF", hemi: 0.45, hemiSky: "#6070A0",
  waterBase: "#1E2C38", waterTint: "#8899AA", moon: [-90, 110, 10, "#F2F2E6"],
  lake: { rx: 50, rz: 45, treeN: 460, reeds: 70, pads: 60 },
  roomLight: 4,                       // a warm light in every room
};

/* ---------------- materials ---------------- */
export const wallMat = new THREE.MeshStandardMaterial({ color: 0xbcc3ca, roughness: 0.95, transparent: true, opacity: 0.42 });   // see-through walls
export const lineMat = new THREE.LineBasicMaterial({ color: C.slate });
export const sketchMat = new THREE.LineBasicMaterial({ color: C.slate, transparent: true, opacity: 0.6 });
export const stepMat = new THREE.MeshStandardMaterial({ color: 0xc4cad0, roughness: 1 });
export const leafA = new THREE.MeshStandardMaterial({ color: 0x6e8c5e, roughness: 1, flatShading: true });
export const bark = new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 1 });
export const M = {
  wood: new THREE.MeshStandardMaterial({ color: 0xb08a62, roughness: 0.9 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0x8c9aa6, roughness: 1 }),
  white: new THREE.MeshStandardMaterial({ color: 0xe6e6e1, roughness: 0.9 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x3c4248, roughness: 0.8 }),
  rug: new THREE.MeshStandardMaterial({ color: 0xcdbfa6, roughness: 1 }),
  warm: new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffd58a, emissiveIntensity: 2.2 }),   // lamp shades, lit at night
  sand: new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 1 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x9a9f9e, roughness: 1, flatShading: true }),
  pad: new THREE.MeshStandardMaterial({ color: 0x5f8a55, roughness: 0.8, side: THREE.DoubleSide }),
  reed: new THREE.LineBasicMaterial({ color: 0x6f7f4e }),
  pine: new THREE.MeshStandardMaterial({ color: 0x2c3d31, roughness: 1, flatShading: true }),
  snow: new THREE.MeshStandardMaterial({ color: 0xf2f5f7, roughness: 1, flatShading: true }),   // the mountain tops
  mountain: new THREE.MeshStandardMaterial({ color: 0x7f8ea3, roughness: 1, flatShading: true }),
};
M.warm.userData.artKind = "glow";
M.post = bark.clone();
export const books = [0x8c5a4a, 0x4f6e77, 0xc9a96e, 0x5f6b55, 0xa77f66].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
// materials that live as long as the page (a rebuild disposes only the others)
export const shared = new Set([wallMat, lineMat, sketchMat, stepMat, leafA, bark, ...Object.values(M), ...books]);

/* ---------------- house colours (panel: K) ----------------
   walls, drawing ink, floor, stairs/dock and the furniture; lamps and plant leaves stay the same in every palette */
export const PALETTES = {
  drafting: { label: "K1 Drafting grey-blue", wall: 0xbcc3ca, ink: 0x27313b, floor: "#B9BFC6", grid: "rgba(39,49,59,.22)", glow: 0x3a4048, post: 0x6b5a48, step: 0xc4cad0,
    wood: 0xb08a62, fabric: 0x8c9aa6, white: 0xe6e6e1, dark: 0x3c4248, rug: 0xcdbfa6, books: [0x8c5a4a, 0x4f6e77, 0xc9a96e, 0x5f6b55, 0xa77f66] },
  concrete: { label: "K2 Concrete greys", wall: 0xbdbdbb, ink: 0x2b2b2b, floor: "#ABABA8", grid: "rgba(40,40,40,.22)", glow: 0x3c3c3b, post: 0x4a4a49, step: 0xc2c2bf,
    wood: 0x8e8d89, fabric: 0x6f7070, white: 0xe0e0dd, dark: 0x343434, rug: 0xbebebb, books: [0x5a5a5a, 0x7e7e7d, 0xa6a6a4, 0x474747, 0x929290] },
  graphite: { label: "K3 Graphite (dark greys)", wall: 0x6f7174, ink: 0xd6d8da, floor: "#4C4E51", grid: "rgba(220,222,224,.18)", glow: 0x1c1d1f, post: 0x2a2b2d, step: 0x56585b,
    wood: 0x434446, fabric: 0x8f9194, white: 0xa8aaac, dark: 0x1f2022, rug: 0x7a7c7f, books: [0xb5b7b9, 0x5a5c5f, 0x8a8c8f, 0xd0d2d4, 0x3a3b3d] },
  nordic: { label: "K4 Nordic ice", wall: 0xc6d3dc, ink: 0x1f3448, floor: "#B6C5D0", grid: "rgba(31,52,72,.2)", glow: 0x34465a, post: 0x5d6b78, step: 0xd2dde4,
    wood: 0xc4c9c6, fabric: 0x7f9db5, white: 0xeef3f6, dark: 0x2d3f50, rug: 0xaac0d0, books: [0x3f6680, 0x7aa0b8, 0xb9cfdc, 0x2c4a5e, 0x8fa9b6] },
  primaries: { label: "K8 Gallery primaries", wall: 0xd4d4cf, ink: 0x1a1a1a, floor: "#D2D1CA", grid: "rgba(26,26,26,.18)", glow: 0x404040, post: 0x2a2a2a, step: 0xdedcd4,
    wood: 0xcdb98e, fabric: 0x2f4f9e, white: 0xf4f4ef, dark: 0x1a1a1a, rug: 0xd6a72c, books: [0xb8372b, 0x2f4f9e, 0xd6a72c, 0x1a1a1a, 0xe8e8e2] },
};
let PAL = PALETTES.drafting;

// the drafting-grid floor (1 square = 1 m), redrawn when the palette changes
const gridCanvas = document.createElement("canvas"); gridCanvas.width = gridCanvas.height = 128;
function paintGrid() {
  const g = gridCanvas.getContext("2d");
  g.fillStyle = PAL.floor; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = PAL.grid; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128);
}
paintGrid();
export const floorMats = [];                 // this build's floors (emptied by each rebuild)
export function floorMat(w, d) {
  const t = new THREE.CanvasTexture(gridCanvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w, d); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 1, emissive: PAL.glow });
  floorMats.push(m);
  return m;
}

export function applyPalette(key) {
  PAL = PALETTES[key] || PALETTES.drafting;
  wallMat.color.set(PAL.wall);
  lineMat.color.set(PAL.ink); sketchMat.color.set(PAL.ink); stepMat.color.set(PAL.step); M.post.color.set(PAL.post);
  for (const k of ["wood", "fabric", "white", "dark", "rug"]) M[k].color.set(PAL[k]);
  books.forEach((m, i) => m.color.set(PAL.books[i]));
  paintGrid();
  for (const m of floorMats) { m.emissive.set(PAL.glow); if (m.map) m.map.needsUpdate = true; }
}

// a tiling patch of summer grass blades (the land around the lake)
let grassTex = null;
export function grassTexture() {
  if (grassTex) return grassTex;
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const g = c.getContext("2d");
  const greens = ["#7E9970", "#A6BC95", "#8BA27A", "#9AB389", "#738E66", "#B3C6A0"];
  g.fillStyle = "#8FA67F"; g.fillRect(0, 0, 512, 512);
  let sd = 3; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9000; i++) {
    const x = r() * 512, y = r() * 512, l = 4 + r() * 9, a = -Math.PI / 2 + (r() - 0.5) * 0.9;
    g.strokeStyle = greens[Math.floor(r() * greens.length)]; g.lineWidth = 1 + r() * 1.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  grassTex = new THREE.CanvasTexture(c);
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.colorSpace = THREE.SRGBColorSpace; grassTex.anisotropy = 8;
  return grassTex;
}
