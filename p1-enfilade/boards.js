import * as THREE from "three";
import { CW, CH, PW, C, lineMat, lerp } from "./common.js";
import { pic } from "./explore.js";

/* The wall boards: the photo and the text painted on a canvas, hung on a wall. When the camera holds at a board the photo
   shrinks to its side (A2 crop: its pixels stay where they were) and the text behind it shows (B4: the photo under a veil
   in its own colour, the title's letters filled with the photo). */

const CV = window.CV;
const IMG = "../shared/img/";

const loader = new THREE.TextureLoader();
const texCache = {};
function photoTexture(name) {
  const file = pic(name);                                      // .webp, or the .jpg original (panel: Images)
  if (!texCache[file]) {
    texCache[file] = new Promise((res) => loader.load(IMG + file, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; res(t); }));
  }
  return texCache[file];
}
export const photosLoaded = () => Promise.all(Object.values(texCache));

const NEUTRAL = { bg: "#EEF0EE", ink: "#27313B", accent: "#27313B" };
const SKY_INK = "#F6F1E4";                                     // the last board: light letters on the night sky, no ground
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
export function paintBoard(st, f = 1) {
  const c = st.canvas;
  const g = c.getContext("2d");
  const Wc = c.width, Hc = c.height, k = Wc / 2048 * f;
  const info = st.info, img = st.img;
  const col = st.sky ? { ink: SKY_INK } : info.palette || NEUTRAL;
  g.globalCompositeOperation = "source-over";
  g.shadowColor = "transparent"; g.shadowBlur = 0;
  if (st.sky) { g.clearRect(0, 0, Wc, Hc); g.shadowColor = "rgba(20,28,24,.6)"; g.shadowBlur = 18 * k; g.shadowOffsetY = 3 * k; }
  else { g.fillStyle = col.bg; g.fillRect(0, 0, Wc, Hc); }
  if (img) {                               // B4: the exact pixels stay behind, under a veil in the photo's colour
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
  font(g, img ? 700 : 300, tSize, true);
  const tLines = wrap(g, info.title, info.columns ? Wc - pad * 2 : w);
  const tTop = y + tSize * 0.85;
  if (img) {                               // letters filled with the photo's pixels at the same spot
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
    g.fillStyle = col.ink;
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
// paint every board whose photo has arrived (and the ones without a photo)
export const paintAll = (stations) => stations.forEach((st) => (st.img || !st.info.photo) && paintBoard(st));

/* a board on a wall at c facing nrm, or placed by `place` (the last one, in the sky: sky = true).
   pd: which way the photo moves (1 right, -1 left) */
export function makeStation(parent, step, n, { c = null, nrm = null, pd = 1, sky = false, place = null }) {
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
  if (sky) { board.material.fog = false; board.material.depthWrite = false; }
  grp.add(board);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(CW + 0.14, CH + 0.14)), lineMat);
  frame.position.z = 0.012;
  grp.add(frame);
  if (sky) frame.visible = false;

  const st = { step, info, grp, board, boardTex, canvas: cv, c, nrm, pd, sky, p: 0, photo: null, img: null, uv: null };
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
  const lamp = new THREE.PointLight(C.sodium, 5, 7, 1.6);    // colour and strength: panel "Lamps" (main.js)
  lamp.position.set(0, 1.2, 1.4);
  grp.add(lamp);
  st.lamp = lamp;
  return st;
}

const coverUV = (img) => {                                       // cover-crop a photo to the board
  const ia = img.width / img.height, ca = CW / CH;
  return ia > ca ? { u0: (1 - ca / ia) / 2, uw: ca / ia, v0: 0, vh: 1 } : { u0: 0, uw: 1, v0: (1 - ia / ca) / 2, vh: ia / ca };
};
// p 0 → 1: the photo shrinks to its side of the board, keeping its pixels where they were (A2 crop)
export function placePhoto(st, p) {
  const ph = st.photo;
  st.board.material.opacity = st.sky ? p : 1;                // the sky text fades in
  if (!ph || !st.uv) return;
  ph.visible = true;
  const tex = ph.material.map;
  const w = lerp(CW, PW, p), x = st.pd * (CW / 2 - w / 2);
  const left = (x - w / 2 + CW / 2) / CW;
  ph.scale.set(w, CH, 1);
  ph.position.x = x;
  tex.repeat.set(st.uv.uw * (w / CW), st.uv.vh);
  tex.offset.set(st.uv.u0 + st.uv.uw * left, st.uv.v0);
}
