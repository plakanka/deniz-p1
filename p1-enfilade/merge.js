import * as THREE from "three";
import { wallMat } from "./common.js";

/* Speed (panel S2): draw everything that never moves in a few big pieces.
   The house and the forest are thousands of small meshes and outlines (each tree, wall piece, chair leg…), and each one is a
   separate draw call. Pieces that never move, never change material and are opaque are merged, per material and per
   house / surroundings (the art styles' "house only" needs that split). Boards, moving things, points and transparent pieces
   (the see-through walls: their draw order matters) stay as they are. Looks the same; S1 in the panel draws them one by one.
   The cost: a merged piece is drawn whole whenever any of it is in view (no culling of what is behind the camera), so the
   GPU gets more triangles (about 40k instead of 10–25k) in far fewer calls. */
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

// keepRoots: objects that move or change (they and everything under them stay as they are)
export function mergeStatic(world, keepRoots) {
  world.updateMatrixWorld(true);
  const keep = new Set();
  for (const r of keepRoots) if (r?.isObject3D) r.traverse((n) => keep.add(n));
  const inv = new THREE.Matrix4().copy(world.matrixWorld).invert(), m = new THREE.Matrix4();
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
