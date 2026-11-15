/* P1 lake house. A house is drawn as a plan: rectangles of rooms on two floors (1 m grid). From the plan
   this file makes walls (with doors and windows), floors, the U-stair, stilts, furniture, the wall stops and the
   walking route between them (through doors and up the stair).
   Coordinates in metres: x to the right, y up, z towards the shore (the lake is in -z). The front door is on z = 0. */

const UP = 3.6, H = 3.4, SHORE = 12;

/* ---------------- house shapes ---------------- */
export const SHAPES = {
  L: {
    label: "H1 L-shaped",
    floors: [
      { living: [-9, -8, -3, 0], hall: [-3, -6, 1, 0], stair: [1, -6, 4, 0], kitchen: [-3, -12, 4, -6] },
      { bedroom: [-9, -8, -3, 0], gallery: [-3, -6, 1, 0], stair: [1, -6, 4, 0], study: [-3, -12, 4, -6], reading: [-9, -14, -3, -8] },
    ],
    doors: [[0, "hall", "living"], [0, "hall", "kitchen"], [0, "hall", "stair", [1, -0.8]],
      [1, "gallery", "stair", [1, -0.8]], [1, "gallery", "bedroom"], [1, "gallery", "study", [-1, -6]], [1, "bedroom", "reading", [-6, -8]]],
    entrance: [-1, 0],
    stops: [["living", "w"], ["kitchen", "n"], ["bedroom", "w"], ["study", "n"], ["reading", "w"]],
    exit: ["reading", "n", [-6, -14]],
  },
  stack: {
    label: "H2 Stacked boxes",
    floors: [
      { living: [-8, -8, -2, 0], hall: [-2, -8, 1, 0], stair: [1, -6, 4, 0], kitchen: [4, -8, 10, 0] },
      { bedroom: [-8, -6, -2, 0], gallery: [-2, -6, 1, 0], stair: [1, -6, 4, 0], study: [-8, -14, -1, -6], reading: [-1, -14, 6, -6] },
    ],
    doors: [[0, "hall", "living", [-2, -4]], [0, "hall", "stair", [1, -0.8]], [0, "stair", "kitchen", [4, -0.8]],
      [1, "gallery", "stair", [1, -0.8]], [1, "gallery", "bedroom"], [1, "gallery", "reading", [0, -6]], [1, "study", "reading", [-1, -10]]],
    entrance: [-0.5, 0],
    stops: [["living", "w"], ["kitchen", "e"], ["bedroom", "w"], ["study", "n"], ["reading", "e"]],
    exit: ["reading", "n", [2.5, -14]],
  },
  court: {
    label: "H3 Around a courtyard deck",
    floors: [
      { living: [-10, -10, -4, 0], hall: [-4, -5, 0, 0], stair: [0, -6, 3, 0], kitchen: [3, -10, 9, 0] },
      { bedroom: [-10, -10, -4, 0], gallery: [-4, -5, 0, 0], stair: [0, -6, 3, 0], study: [3, -10, 9, 0], reading: [-10, -16, 9, -10] },
    ],
    doors: [[0, "hall", "living", [-4, -2.5]], [0, "hall", "stair", [0, -0.8]], [0, "stair", "kitchen", [3, -0.8]],
      [1, "gallery", "stair", [0, -0.8]], [1, "gallery", "bedroom", [-4, -2.5]], [1, "stair", "study", [3, -0.8]],
      [1, "bedroom", "reading", [-7, -10]], [1, "study", "reading", [6, -10]]],
    entrance: [-2, 0],
    deck: [-4, -10, 3, -5],
    stops: [["living", "w"], ["kitchen", "e"], ["bedroom", "w"], ["study", "e"], ["reading", "n"]],
    exit: ["reading", "w", [-10, -13]],
  },
};

const SIDE_N = { w: [1, 0], e: [-1, 0], n: [0, 1], s: [0, -1] };   // inward normal of each side

function sideLine(r, side) {         // wall line of a room side: a, b ([x, z]) and inward normal
  const [x0, z0, x1, z1] = r;
  if (side === "w") return { a: [x0, z0], b: [x0, z1], n: [1, 0] };
  if (side === "e") return { a: [x1, z0], b: [x1, z1], n: [-1, 0] };
  if (side === "n") return { a: [x0, z0], b: [x1, z0], n: [0, 1] };
  return { a: [x0, z1], b: [x1, z1], n: [0, -1] };
}
const opposite = { w: "e", e: "w", n: "s", s: "n" };
const inRect = (r, x, z) => x > r[0] && x < r[2] && z > r[1] && z < r[3];

/* walls of one floor: every edge between two different owners (room / room, room / outside) */
function floorWalls(rooms) {
  const own = new Map();
  for (const [name, [x0, z0, x1, z1]] of Object.entries(rooms)) for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) own.set(`${x},${z}`, name);
  const at = (x, z) => own.get(`${x},${z}`) || null;
  const xs = [...own.keys()].map((k) => +k.split(",")[0]), zs = [...own.keys()].map((k) => +k.split(",")[1]);
  const [mx0, mx1, mz0, mz1] = [Math.min(...xs) - 1, Math.max(...xs) + 2, Math.min(...zs) - 1, Math.max(...zs) + 2];
  const pieces = [];
  for (let X = mx0; X <= mx1; X++) for (let z = mz0; z < mz1; z++) { const a = at(X - 1, z), b = at(X, z); if (a !== b) pieces.push({ o: "v", line: X, s: z, a, b }); }
  for (let Z = mz0; Z <= mz1; Z++) for (let x = mx0; x < mx1; x++) { const a = at(x, Z - 1), b = at(x, Z); if (a !== b) pieces.push({ o: "h", line: Z, s: x, a, b }); }
  pieces.sort((p, q) => (p.o + p.line + p.a + p.b).localeCompare(q.o + q.line + q.a + q.b) || p.s - q.s);
  const segs = [];
  for (const p of pieces) {
    const last = segs[segs.length - 1];
    if (last && last.o === p.o && last.line === p.line && last.a === p.a && last.b === p.b && last.s1 === p.s) last.s1 = p.s + 1;
    else segs.push({ o: p.o, line: p.line, s0: p.s, s1: p.s + 1, a: p.a, b: p.b });
  }
  return segs;
}

/* ---------------- build one shape into a layout the engine can walk ---------------- */
export function lakeHouse(key, level = 0) {
  const S = SHAPES[key];
  const R = (f, name) => S.floors[f][name];
  const stopRooms = Object.fromEntries(S.stops.map(([room, side]) => [room, side]));
  const sr = R(0, "stair"), [sx0, sz0, sx1, sz1] = sr;
  const laneA = sx0 + 0.75, laneB = sx1 - 0.75, half = UP / 2;

  // doors resolved to a point + normal on the shared wall
  const doors = S.doors.map(([f, r1, r2, at]) => {
    const segs = floorWalls(S.floors[f]).filter((s) => (s.a === r1 && s.b === r2) || (s.a === r2 && s.b === r1));
    let seg = segs[0], p;
    if (at) { seg = segs.find((s) => (s.o === "v" ? s.line === at[0] && at[1] > s.s0 && at[1] < s.s1 : s.line === at[1] && at[0] > s.s0 && at[0] < s.s1)) || seg; p = at; }
    else p = seg.o === "v" ? [seg.line, (seg.s0 + seg.s1) / 2] : [(seg.s0 + seg.s1) / 2, seg.line];
    return { f, r1, r2, p, n: seg.o === "v" ? [1, 0] : [0, 1] };
  });
  const ex = S.exit, exR = R(1, ex[0]), exN = SIDE_N[ex[1]];
  const exitP = ex[2];

  /* ---- walking route ---- */
  const nodes = {};
  const link = (a, b, pts) => { (nodes[a] ||= []).push({ to: b, pts }); (nodes[b] ||= []).push({ to: a, pts: [...pts].reverse() }); };
  for (const d of doors) {
    const y = d.f * UP, rA = R(d.f, d.r1);
    const s = inRect(rA, d.p[0] + d.n[0] * 0.5, d.p[1] + d.n[1] * 0.5) ? 1 : -1;     // which side r1 is on
    link(`${d.f}:${d.r1}`, `${d.f}:${d.r2}`, [[d.p[0] + s * d.n[0] * 0.8, y, d.p[1] + s * d.n[1] * 0.8], [d.p[0] - s * d.n[0] * 0.8, y, d.p[1] - s * d.n[1] * 0.8]]);
  }
  link("0:stair", "1:stair", [[laneA, 0, sz1 - 1.0], [laneA, 0, sz1 - 1.7], [laneA, half, sz1 - 4.4], [(laneA + laneB) / 2, half, sz1 - 5.2],
    [laneB, half, sz1 - 4.4], [laneB, UP, sz1 - 1.7], [laneB, UP, sz1 - 0.9]]);
  const route = (from, to) => {           // breadth-first search through rooms; returns the points to walk through
    const prev = { [from]: null }, q = [from];
    while (q.length) { const n = q.shift(); if (n === to) break; for (const e of nodes[n] || []) if (!(e.to in prev)) { prev[e.to] = { n, e }; q.push(e.to); } }
    const pts = []; let n = to;
    while (prev[n]) { pts.unshift(...prev[n].e.pts); n = prev[n].n; }
    return pts;
  };
  const roomFloor = (name) => (name in S.floors[0] && !(name in S.floors[1]) ? 0 : name in S.floors[1] && !(name in S.floors[0]) ? 1 : 0);
  const node = (room) => `${roomFloor(room)}:${room}`;

  const [ex0, ez] = S.entrance;
  const stops = S.stops.map(([room, side], i) => {
    const f = roomFloor(room), r = R(f, room), L = sideLine(r, side), n = SIDE_N[side];
    const c = [(L.a[0] + L.b[0]) / 2 + n[0] * 0.08, f * UP, (L.a[1] + L.b[1]) / 2 + n[1] * 0.08];
    const via = i === 0
      ? [[ex0, 0, SHORE - 2], [ex0, 0, ez + 2.5], [ex0, 0, ez + 0.6], [ex0, 0, ez - 1.0], ...route("0:hall", node(room))]
      : route(node(S.stops[i - 1][0]), node(room));
    return { c, n, via };
  });
  const exitVia = route(node(S.stops[4][0]), `1:${ex[0]}`);

  const all = S.floors.flatMap((fl) => Object.values(fl));
  const bounds = [Math.min(...all.map((r) => r[0])), Math.min(...all.map((r) => r[1])), Math.max(...all.map((r) => r[2])), SHORE];

  /* ---- geometry ---- */
  function build(h) {
    for (let f = 0; f < 2; f++) {
      const y0 = f * UP, y1 = f ? UP + H : UP, rooms = S.floors[f];
      for (const seg of floorWalls(rooms)) {
        const a = seg.o === "v" ? [seg.line, seg.s0] : [seg.s0, seg.line], b = seg.o === "v" ? [seg.line, seg.s1] : [seg.s1, seg.line];
        const len = seg.s1 - seg.s0, ops = [];
        const along = (p) => (seg.o === "v" ? p[1] - seg.s0 : p[0] - seg.s0);
        const onSeg = (p) => (seg.o === "v" ? p[0] === seg.line && p[1] > seg.s0 && p[1] < seg.s1 : p[1] === seg.line && p[0] > seg.s0 && p[0] < seg.s1);
        if (seg.a && seg.b) {                                    // inside wall: maybe a door
          for (const d of doors) if (d.f === f && ((d.r1 === seg.a && d.r2 === seg.b) || (d.r1 === seg.b && d.r2 === seg.a)) && onSeg(d.p)) ops.push({ at: along(d.p), w: 1.2, y0, y1: y0 + 2.4 });
        } else {                                                 // outside wall: front door, exit, windows unless it carries a board
          const room = seg.a || seg.b;
          const side = seg.o === "v" ? (seg.a ? "e" : "w") : (seg.a ? "s" : "n");
          const isStop = stopRooms[room] === side && f === roomFloor(room);
          if (f === 0 && room === "hall" && onSeg([ex0, ez])) ops.push({ at: along([ex0, ez]), w: 1.6, y0, y1: y0 + 2.5 });
          else if (f === 1 && room === ex[0] && onSeg(exitP)) ops.push({ at: along(exitP), w: 2.6, y0, y1: y0 + 2.7 });
          else if (!isStop && len >= 2.5 && room !== "stair") { const w = Math.min(len - 1, 5.5); ops.push(h.window(a, b, len / 2, w, y0 + 0.5, y0 + 3.0)); }
          else if (room === "stair" && len >= 3) ops.push(h.window(a, b, len / 2, 1.4, y0 + 0.9, y1 - 0.6));
        }
        h.wall(a, b, y0, y1, ops);
      }
      for (const [name, r] of Object.entries(rooms)) {
        if (f === 1 && name === "stair") h.slab(r[0], r[3] - 1.6, r[2], r[3], UP);       // top landing of the U-stair
        else h.slab(r[0], r[1], r[2], r[3], y0, { th: 0.3 });
      }
    }
    // the U-stair: up one side, turn on a half landing, back up the other side
    h.flight([laneA, sz1 - 1.6], [laneA, sz1 - 4.4], 0, half, 1.2, 10);
    h.slab(sx0, sz0, sx1, sz1 - 4.4, half, { th: 0.15 });
    h.flight([laneB, sz1 - 4.4], [laneB, sz1 - 1.6], half, UP, 1.2, 10);
    h.rail([[sx0, UP + 0.9, sz1 - 1.6], [sx1, UP + 0.9, sz1 - 1.6]]);
    if (S.deck) h.slab(S.deck[0], S.deck[1], S.deck[2], S.deck[3], 0, { th: 0.2 });
    // stilts under the ground floor
    for (const r of Object.values(S.floors[0])) for (let x = r[0]; x <= r[2]; x += Math.max(2, (r[2] - r[0]) / 2)) for (const z of [r[1], r[3]]) h.post(x, z, -2.2, -0.3);
    // boardwalk to the shore
    h.boardwalk(ex0 - 1.2, ez, ex0 + 1.2, SHORE + 3);
    h.boat(ex0 + 3, ez + 5, 0);
    // furniture against the wall opposite each board (and a little in the hall)
    for (const f of [0, 1]) for (const [name, r] of Object.entries(S.floors[f])) {
      const side = stopRooms[name] && roomFloor(name) === f ? opposite[stopRooms[name]] : null;
      const dps = doors.filter((d) => d.f === f && (d.r1 === name || d.r2 === name)).map((d) => d.p);
      if (name === ex[0] && f === 1) dps.push(exitP);
      if (side) furnish(h, name, r, side, f * UP, dps, level);
      else if (name === "hall" || name === "gallery") { h.furn("plant", r[0] + 0.5, f * UP, r[1] + 0.5); if (level) hallExtras(h, r, f * UP, dps, level); }
    }
  }

  return {
    label: S.label, outdoor: true, noGround: true, build,
    start: [ex0, 0, SHORE + 7], stops,
    exit: { sill: [exitP[0] + exN[0] * 0.4, UP, exitP[1] + exN[1] * 0.4], dir: [-exN[0], -exN[1]], via: exitVia },
    bounds, shore: SHORE, dock: ex0,
    rects: all,
    rooms: S.floors.flatMap((fl, f) => Object.entries(fl).filter(([n]) => n !== "stair").map(([, r]) => [(r[0] + r[2]) / 2, f * UP, (r[1] + r[3]) / 2])),
  };
}

/* a helper to put things against any wall of a room, away from doors; `back` limits it to the half of a
   side wall nearest the back wall (behind the camera while reading the board) */
function wallPlacer(h, r, y, doorPts, backSide) {
  const back = backSide ? sideLine(r, backSide) : null;
  return (side, type, s, out, w, extra = 0, size, hy = 0) => {
    const L = sideLine(r, side), n = L.n, len = Math.hypot(L.b[0] - L.a[0], L.b[1] - L.a[1]);
    const t = [(L.b[0] - L.a[0]) / len, (L.b[1] - L.a[1]) / len];
    let mid = [(L.a[0] + L.b[0]) / 2, (L.a[1] + L.b[1]) / 2];
    if (back && side !== backSide) {                      // measure from the end of this wall that touches the back wall
      const bm = [(back.a[0] + back.b[0]) / 2, (back.a[1] + back.b[1]) / 2];
      const sgn = Math.sign((bm[0] - mid[0]) * t[0] + (bm[1] - mid[1]) * t[1]) || 1;
      s = sgn * (len / 2 - Math.max(Math.abs(s), w / 2 + 0.2));   // s = distance from the back corner
    }
    const blocked = doorPts.filter((p) => Math.abs((p[0] - mid[0]) * n[0] + (p[1] - mid[1]) * n[1]) < 0.3).map((p) => (p[0] - mid[0]) * t[0] + (p[1] - mid[1]) * t[1]);
    if (Math.abs(s) + w / 2 > len / 2 - 0.15 || blocked.some((b) => Math.abs(b - s) < w / 2 + 0.9)) return false;
    h.furn(type, mid[0] + t[0] * s + n[0] * out, y + hy, mid[1] + t[1] * s + n[1] * out, Math.atan2(n[0], n[1]) + extra, size);
    return true;
  };
}
const sidesOf = (back) => (back === "w" || back === "e" ? ["n", "s"] : ["w", "e"]);

function hallExtras(h, r, y, doorPts, level) {
  const put = wallPlacer(h, r, y, doorPts, null);
  for (const sd of ["w", "e", "n", "s"]) if (put(sd, "frame", 0, 0.03, 1.2, 0, null)) break;
  if (level >= 2) { put("e", "bench", 0.8, 0.3, 1.7) || put("w", "bench", 0.8, 0.3, 1.7); put("n", "basket", 1.2, 0.35, 0.6); }
  if (level >= 3) { put("s", "tallplant", 1.4, 0.45, 0.8) || put("n", "tallplant", -1.4, 0.45, 0.8); put("w", "rug", 0, 1.3, 1, 0, [2.4, 1.4]); }
}

/* furniture along one wall, kept clear of doors and out of the reading view */
function furnish(h, type, r, side, y, doorPts, level = 0) {
  const L = sideLine(r, side), n = L.n, len = Math.hypot(L.b[0] - L.a[0], L.b[1] - L.a[1]);
  const t = [(L.b[0] - L.a[0]) / len, (L.b[1] - L.a[1]) / len], mid = [(L.a[0] + L.b[0]) / 2, (L.a[1] + L.b[1]) / 2];
  const roomDepth = side === "w" || side === "e" ? r[2] - r[0] : r[3] - r[1];
  const maxOut = roomDepth - 4.5;                          // keep the space where the camera stands to read clear
  const rot = Math.atan2(n[0], n[1]);
  const blocked = doorPts.map((p) => (p[0] - mid[0]) * t[0] + (p[1] - mid[1]) * t[1])
    .filter((_, i) => { const p = doorPts[i]; return Math.abs((p[0] - mid[0]) * n[0] + (p[1] - mid[1]) * n[1]) < 0.3; });
  const free = (s, w) => Math.abs(s) + w / 2 < len / 2 - 0.2 && blocked.every((b) => Math.abs(b - s) > w / 2 + 0.9);
  const put = (type2, s, out, w, extra = 0, size) => {
    if (!free(s, w) || out + 0.45 > maxOut + 1.0) return false;
    h.furn(type2, mid[0] + t[0] * s + n[0] * out, y, mid[1] + t[1] * s + n[1] * out, rot + extra, size);
    return true;
  };
  const first = (cands, fn) => { for (const s of cands) if (fn(s)) return s; return null; };
  if (type === "living") {
    const s = first([0, -1.2, 1.2, -2, 2], (s) => put("sofa", s, 0.55, 2.4));
    if (s !== null) { put("coffee", s, 1.5, 1.2); put("rug", s, 1.2, 1, 0, [3, 2.2]); put("lamp", s - 1.6, 0.35, 0.4); put("plant", s + 1.7, 0.4, 0.6); }
    put("stove", s !== null && s < 0 ? len / 2 - 0.8 : -len / 2 + 0.8, 0.5, 0.7);
  } else if (type === "kitchen") {
    const s = first([-1.2, 0, 1.2, -2], (s) => put("counter", s, 0.35, 3.6, 0, [3.6]));
    first([2.6, -2.8, 2.2], (s2) => (s === null || Math.abs(s2 - s) > 2.8) && put("dining", s2, 1.0, 1.6, Math.PI / 2));
  } else if (type === "bedroom") {
    const s = first([-0.6, 0.6, -1.4, 1.4], (s) => put("bed", s, 0.95, 2.2, Math.PI / 2));
    if (s !== null) { put("nightstand", s - 1.4, 0.3, 0.5); put("wardrobe", s + 2.6, 0.35, 2.0); put("rug", s, 2.0, 1, 0, [2.6, 1.2]); }
  } else if (type === "study") {
    const s = first([-0.6, 0.6, -1.6, 1.6], (s) => put("desk", s, 0.45, 1.7));
    if (s !== null) { put("chair", s, 1.15, 0.5, Math.PI); put("shelf", s + 2.1, 0.2, 2.0); put("lamp", s - 1.4, 0.35, 0.4); }
  } else if (type === "reading") {
    const s = first([-1.1, 0, 1.1, -2.2], (s) => put("shelf", s, 0.2, 2.0));
    if (s !== null) { put("shelf", s + 2.15, 0.2, 2.0); put("armchair", s - 2.0, 0.9, 0.9, 0.5); put("lamp", s - 2.9, 0.35, 0.4); }
  }
  if (!level) return;
  // more life in the room, level by level: side walls (back half), corners, ceiling
  const P = wallPlacer(h, r, y, doorPts, side), [sa, sb] = sidesOf(side);
  const both = (fn) => fn(sa) || fn(sb);
  const cx = (r[0] + r[2]) / 2, cz = (r[1] + r[3]) / 2;
  const pend = () => h.furn("pendant", mid[0] + n[0] * 1.3, y, mid[1] + n[1] * 1.3);   // near the back wall, behind the camera
  if (type === "living") {
    both((sd) => P(sd, "sideboard", 1.6, 0.3, 1.9));
    P(sa, "frame", 1.6, 0.03, 1.1); P(sb, "frame", 1.4, 0.03, 0.9);
    both((sd) => P(sd, "tallplant", 0.5, 0.5, 0.8));
    both((sd) => P(sd, "armchair", 3.2, 0.7, 0.9));
    if (level >= 2) { pend(); put("sidetable", 1.5, 0.45, 0.5); put("cushions", 0, 0.55, 0.1); put("basket", -2.3, 0.4, 0.5); P(sb, "vase", 0.5, 0.35, 0.4); }
    if (level >= 3) { both((sd) => P(sd, "shelf", 3.6, 0.2, 2.0)); P(sa, "plant", 3.3, 0.45, 0.6); P(sb, "plant", 3.3, 0.45, 0.6); put("rug", 0, 2.5, 1, 0, [1.8, 1.2]); }
  } else if (type === "kitchen") {
    for (const k of [-0.6, 0.2, 1.0]) put("stool", (first([-1.2, 0, 1.2, -2], () => true) ?? 0) + k, 1.05, 0.4);
    P(sa, "frame", 1.6, 0.03, 1.0);
    both((sd) => P(sd, "tallplant", 0.5, 0.5, 0.8));
    if (level >= 2) { pend(); both((sd) => P(sd, "sideboard", 2.2, 0.3, 1.9)); P(sb, "basket", 0.6, 0.4, 0.5); P(sb, "frame", 1.8, 0.03, 0.8); }
    if (level >= 3) { both((sd) => P(sd, "shelf", 3.8, 0.2, 2.0)); P(sa, "plant", 3.4, 0.45, 0.6); P(sb, "vase", 3.0, 0.35, 0.4); }
  } else if (type === "bedroom") {
    P(sa, "frame", 1.4, 0.03, 1.2); both((sd) => P(sd, "tallplant", 0.5, 0.5, 0.8)); both((sd) => P(sd, "armchair", 2.4, 0.6, 0.9));
    if (level >= 2) { pend(); put("sidetable", -2.9, 0.35, 0.5); P(sb, "basket", 0.7, 0.4, 0.5); P(sb, "frame", 1.6, 0.03, 0.9); }
    if (level >= 3) { both((sd) => P(sd, "shelf", 3.4, 0.2, 2.0)); P(sa, "plant", 3.2, 0.45, 0.6); put("bench", 0, 2.3, 1.7) || P(sb, "bench", 2.8, 0.3, 1.7); }
  } else if (type === "study") {
    both((sd) => P(sd, "shelf", 1.2, 0.2, 2.0)); P(sb, "frame", 1.6, 0.03, 1.0); both((sd) => P(sd, "tallplant", 0.5, 0.5, 0.8));
    if (level >= 2) { pend(); both((sd) => P(sd, "armchair", 2.8, 0.7, 0.9)); put("basket", 2.6, 0.4, 0.5); P(sa, "sidetable", 2.9, 0.4, 0.5); }
    if (level >= 3) { both((sd) => P(sd, "shelf", 3.4, 0.2, 2.0)); P(sa, "plant", 3.6, 0.45, 0.6); put("rug", 0, 1.6, 1, 0, [2.2, 1.6]); }
  } else if (type === "reading") {
    both((sd) => P(sd, "tallplant", 0.5, 0.5, 0.8)); P(sa, "frame", 1.6, 0.03, 1.1); put("sidetable", -3.0, 0.9, 0.5);
    if (level >= 2) { pend(); put("rug", -1, 1.5, 1, 0, [2.6, 1.8]); both((sd) => P(sd, "armchair", 2.2, 0.7, 0.9)); P(sb, "basket", 0.7, 0.4, 0.5); }
    if (level >= 3) { both((sd) => P(sd, "shelf", 3.2, 0.2, 2.0)); P(sb, "shelf", 3.2, 0.2, 2.0); P(sa, "plant", 3.4, 0.45, 0.6); P(sb, "vase", 1.6, 0.35, 0.4); }
  }
  // fuller rooms: a small seating corner in the back half, and plants flanking the board
  const depth = roomDepth;
  if (level >= 2 && depth >= 7.5) for (const sg of [1, -1]) {
    const a = sg * len / 3;
    if (put("rug", a, 1.75, 1.0, 0, [1.7, 1.4])) { put("armchair", a - sg * 0.35, 1.95, 0.9, Math.PI * 0.85); put("sidetable", a + sg * 0.55, 1.6, 0.5); break; }
  }
  if (level >= 3) { P(sa, "basket", 1.1, 0.35, 0.5); P(sb, "vase", 1.1, 0.35, 0.4); }
}
