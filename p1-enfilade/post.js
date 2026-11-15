import * as THREE from "three";

/* Art styles. A1 "current" renders exactly as before. Every other style renders each frame twice:
   pass A = the normal scene (A1: sky, stars, night, lit rooms, fog, weather, colours … all of it),
   pass B = a DRAWING of the same scene: hand-drawn edge lines that overshoot their corners, faint construction
            lines off the house's long edges, and strokes laid on the shadowed faces (following each surface).
   The last pass combines them per style: where the scene is bright it becomes paper (tinted by the scene's own
   colour), where it is dark (night, shade) the A1 picture stays, and the drawing goes on top in the style's
   medium (ink lines switch to light chalk on dark ground). So night stays night, stars stay, weather stays.
   Pass B uses copies of the objects on layer 2 (same geometry, drawn materials), so nothing is swapped per frame.
   Wall boards and photos are never drawn over: in pass B they mark their pixels and the last pass shows A there.
   "House only": the surroundings get depth-only copies in pass B (they still hide the house) and stay A1. */

const LAYER = 2;

/* style table
   pat: stroke pattern on surfaces (0 hatching, 1 stipple, 2 broad chalk strokes, 3 pencil strokes, 4 marker streaks,
        5 engraving lines, 6 scribble, 7 woodcut, 8 none)
   paper / inkD (ink on light ground) / inkL (ink on dark ground), tint: how much of the scene's colour tints the paper,
   wash: how far bright areas turn into paper, hk / lk / ok: strength of strokes / lines / outlines, sp: stroke spacing (m),
   dark: the paper is dark (page text turns light) */
export const ART = {
  current: { label: "A1 Current (as before)", id: 0 },
  sketch: { label: "A2 Architectural sketch (pen, construction lines, hatching)", id: 1, pat: 0, paper: "#F7F6F2", inkD: "#1E2024", inkL: "#ECEAE2", tint: 0.18, wash: 0.92, hk: 0.62, lk: 0.9, ok: 0.5, sp: 0.085 },
  watercolor: { label: "A3 Watercolour over pencil", id: 2, pat: 0, paper: "#F9F7F0", inkD: "#5A5C62", inkL: "#E4E2DA", tint: 0.9, wash: 0.85, hk: 0.18, lk: 0.55, ok: 0.3, sp: 0.1 },
  charcoal: { label: "A4 Charcoal", id: 3, pat: 2, paper: "#E8E3DA", inkD: "#151515", inkL: "#E8E3DA", tint: 0.06, wash: 0.9, hk: 0.75, lk: 0.85, ok: 0.65, sp: 0.22 },
  blueprint: { label: "A5 Blueprint", id: 4, pat: 0, paper: "#1A4579", inkD: "#EEF4FF", inkL: "#EEF4FF", tint: 0.05, wash: 0.95, hk: 0.42, lk: 0.9, ok: 0.55, sp: 0.1, dark: true },
  ink: { label: "A6 Ink wash (sumi-e)", id: 5, pat: 8, paper: "#F3EDDF", inkD: "#121212", inkL: "#EDE6D6", tint: 0.08, wash: 0.92, hk: 0, lk: 0.85, ok: 0.75, sp: 0.1 },
  marker: { label: "A7 Marker rendering", id: 6, pat: 4, paper: "#FBFAF7", inkD: "#141414", inkL: "#F0EEE8", tint: 1, wash: 0.9, hk: 0, lk: 0.95, ok: 0.7, sp: 0.32 },
  pencil: { label: "A8 Coloured pencil", id: 7, pat: 3, paper: "#F9F7F0", inkD: "#4C4C54", inkL: "#E8E6DE", tint: 1, wash: 0.9, hk: 0, lk: 0.6, ok: 0.4, sp: 0.05 },
  stipple: { label: "A9 Ink stipple (dots)", id: 8, pat: 1, paper: "#FAF9F5", inkD: "#111111", inkL: "#EEEEE8", tint: 0.08, wash: 0.94, hk: 0.85, lk: 0.85, ok: 0.5, sp: 0.045 },
  sanguine: { label: "A10 Sanguine (red chalk)", id: 9, pat: 2, paper: "#EFE3CF", inkD: "#8A3A22", inkL: "#F4E6D0", tint: 0.1, wash: 0.9, hk: 0.7, lk: 0.8, ok: 0.55, sp: 0.2 },
  chalk: { label: "A11 Chalk on blackboard", id: 10, pat: 0, paper: "#22302A", inkD: "#EDEDE6", inkL: "#EDEDE6", tint: 0.15, wash: 0.93, hk: 0.45, lk: 0.85, ok: 0.6, sp: 0.11, dark: true },
  toned: { label: "A12 Toned paper (graphite + white)", id: 11, pat: 0, paper: "#B9AA90", inkD: "#2A2420", inkL: "#F7F2E8", tint: 0.12, wash: 0.88, hk: 0.6, lk: 0.85, ok: 0.5, sp: 0.09 },
  gouache: { label: "A13 Gouache (flat opaque colour)", id: 12, pat: 8, paper: "#F4F0E6", inkD: "#2A2A2A", inkL: "#EDEAE0", tint: 1, wash: 0.9, hk: 0, lk: 0.45, ok: 0.35, sp: 0.1 },
  ballpoint: { label: "A14 Ballpoint pen (blue scribble)", id: 13, pat: 6, paper: "#F6F4EE", inkD: "#1F3A93", inkL: "#C9D6FF", tint: 0.05, wash: 0.93, hk: 0.75, lk: 0.85, ok: 0.5, sp: 0.07 },
  etching: { label: "A15 Etching (engraved lines)", id: 14, pat: 5, paper: "#EFE6D2", inkD: "#2B1D12", inkL: "#EFE6D2", tint: 0.06, wash: 0.93, hk: 0.95, lk: 0.9, ok: 0.55, sp: 0.03 },
  urban: { label: "A16 Urban sketch (pen + loose colour)", id: 15, pat: 0, paper: "#FBFAF6", inkD: "#1A1A1A", inkL: "#EEECE6", tint: 0.2, wash: 0.92, hk: 0.35, lk: 1, ok: 0.6, sp: 0.1 },
  riso: { label: "A17 Risograph print (two inks)", id: 16, pat: 8, paper: "#F5F1E8", inkD: "#0078BF", inkL: "#F5F1E8", tint: 0, wash: 0, hk: 0, lk: 0.8, ok: 0.4, sp: 0.1 },
  woodcut: { label: "A18 Woodcut", id: 17, pat: 7, paper: "#F1EADB", inkD: "#121010", inkL: "#F1EADB", tint: 0, wash: 1, hk: 1, lk: 1, ok: 0.8, sp: 0.12 },
  pastel: { label: "A19 Soft pastel", id: 18, pat: 3, paper: "#EDE6DA", inkD: "#5B5552", inkL: "#F2ECE2", tint: 1, wash: 0.9, hk: 0, lk: 0.45, ok: 0.3, sp: 0.07 },
  sepia: { label: "A20 Sepia ink and wash", id: 19, pat: 0, paper: "#EADBC0", inkD: "#4A2E1A", inkL: "#F2E6CF", tint: 0.12, wash: 0.9, hk: 0.55, lk: 0.9, ok: 0.55, sp: 0.09 },
};

/* ---------------- shared GLSL ---------------- */
const NOISE = /* glsl */ `
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.0), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 sat(vec3 c, float s) { return mix(vec3(lum(c)), c, s); }`;

/* ---------------- pass B: drawn surfaces → (strokes, 0, shade, 1) ---------------- */
const surfVert = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vW, vN; varying float vD;
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
  vW = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vN = normalize((vec4(transformedNormal, 0.0) * viewMatrix).xyz);
  vD = -mvPosition.z;
}`;

const surfFrag = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform int uPat, uKind;            // kind: 0 lit surface, 1 flat colour, 2 sky, 3 glowing, 4 water
uniform vec3 uColor, uSun;
uniform float uOpacity, uFog, uSp;
varying vec3 vW, vN; varying float vD;
${NOISE}
// parallel strokes: t runs across them (1 = one spacing), 'along' along them (m); wpx = width in px
float strokes(float t, float along, float wpx, float brk, float waver) {
  t += waver * (noise(vec2(along * 0.7, floor(t) * 3.1)) - 0.5);
  float fw = max(fwidth(t), 1e-4), d = abs(fract(t + 0.5) - 0.5);
  float l = 1.0 - smoothstep(max(0.5 * wpx - 0.5, 0.0) * fw, (0.5 * wpx + 0.5) * fw, d);
  l *= smoothstep(brk - 0.06, brk + 0.06, noise(vec2(along * 0.9 + floor(t) * 7.3, floor(t) * 1.7)));
  return mix(l, min(1.0, fw * wpx * 1.1), smoothstep(0.18, 0.4, fw));       // too dense to draw: a tone
}
// strokes whose width is a fraction of the spacing (engraving, woodcut): fatter where darker
float bands(float t, float along, float frac, float waver) {
  t += waver * (noise(vec2(along * 0.5, floor(t) * 3.1)) - 0.5);
  float fw = max(fwidth(t), 1e-4), d = abs(fract(t + 0.5) - 0.5);
  float l = 1.0 - smoothstep(0.5 * frac - fw, 0.5 * frac + fw, d);
  return mix(l, frac, smoothstep(0.25, 0.5, fw));
}
void main() {
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  float fog = uKind == 2 ? 1.0 : 1.0 - exp(-uFog * uFog * vD * vD);
  float ndl = dot(N, uSun), s = 0.0;
  if (uKind == 0) {
    s = 0.5 * smoothstep(0.05, -0.45, ndl);                                  // turned well away from the sun
    s = max(s, 0.55 * smoothstep(-0.45, -0.85, N.y));                        // undersides
    s += 0.15 * (1.0 - lum(pow(uColor, vec3(1.0 / 2.2))));
    s *= mix(0.45, 1.0, uOpacity);                                           // see-through walls: barely
  } else if (uKind == 1) s = 0.3 * (1.0 - lum(pow(uColor, vec3(1.0 / 2.2))));
  s = clamp(s, 0.0, 1.0) * (1.0 - fog);

  float u, v;                                                                // coordinates on the surface
  if (abs(N.y) < 0.6) { vec3 tg = normalize(vec3(-N.z, 0.0, N.x) + 1e-5); u = dot(vW, tg); v = vW.y; }
  else { u = vW.x; v = vW.z; }
  float sp = uSp, R = 0.0;
  if (uPat == 0) {
    float h1 = strokes(u / sp, v, 1.3, 0.22, 0.18), h2 = strokes((u + v) / (sp * 1.3), v - u, 1.2, 0.28, 0.18), h3 = strokes(v / (sp * 0.7), u, 1.2, 0.3, 0.18);
    R = max(h1 * smoothstep(0.16, 0.3, s), max(h2 * smoothstep(0.6, 0.72, s), h3 * smoothstep(0.8, 0.92, s)));
  } else if (uPat == 1) {                    // stipple: jittered dots, more of them where darker
    vec2 q = vec2(u, v) / sp, id = floor(q), f = fract(q) - 0.5 - (vec2(hash(id), hash(id + 7.7)) - 0.5) * 0.6;
    float fw = max(fwidth(q.x), 1e-4), r = 0.9 * fw + 0.04;
    float dot1 = (1.0 - smoothstep(r - fw, r + fw, length(f))) * step(hash(id + 3.1), s * 1.5);
    R = mix(dot1, s * 0.6, smoothstep(0.25, 0.5, fw));
  } else if (uPat == 2) {                    // broad chalk/charcoal strokes on the tooth of the paper
    float br = strokes(u / sp, v, 3.0, 0.1, 0.25) * 0.5 + 0.5 * noise(vec2(u * 2.0, v * 9.0));
    R = smoothstep(0.15, 0.95, s * 1.15 + 0.35 * (br - 0.5));
  } else if (uPat == 3) {                    // pencil strokes (the last pass decides how much colour they carry)
    R = clamp(strokes(u / sp, v, 1.6, 0.15, 0.2) + strokes((u - v) / (sp * 1.2), u + v, 1.4, 0.2, 0.2) * smoothstep(0.35, 0.6, s), 0.0, 1.0);
  } else if (uPat == 4) {                    // marker streaks where strokes overlap
    R = smoothstep(0.86, 1.0, fract(u / sp + 0.3 * noise(vec2(v * 0.4, 0.0))));
  } else if (uPat == 5) {                    // engraving: fine lines, fatter in shade, crossed in deep shade
    R = max(bands(u / sp, v, 0.06 + 0.55 * s, 0.12), bands((u + v) / (sp * 1.2), v - u, 0.5 * smoothstep(0.55, 0.9, s), 0.12));
  } else if (uPat == 6) {                    // ballpoint scribble
    float a = strokes((u * 0.8 + v * 0.6) / sp, v - u, 1.2, 0.12, 0.9), b = strokes((u * 0.6 - v * 0.8) / (sp * 1.1), u + v, 1.2, 0.18, 0.9);
    R = max(a * smoothstep(0.14, 0.3, s), b * smoothstep(0.45, 0.62, s));
  } else if (uPat == 7) {                    // woodcut: carved bands
    R = max(bands(u / sp, v, 0.08 + 0.85 * s, 0.35), step(0.8, s));
  }
  if (uKind == 4) R = max(R, strokes(vW.z / 3.2, vW.x * 0.25, 1.4, 0.7, 0.18) * 0.7 * (1.0 - fog));   // loose strokes on water
  if (uKind == 2 || uKind == 3) R = 0.0;
  gl_FragColor = vec4(R * (1.0 - fog), 0.0, s, uOpacity);
}`;

/* ---------------- pass B: drawn lines → (0, 1, 0, alpha) ---------------- */
const lineVert = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aFade;
varying float vD, vFade;
void main() {
  #include <begin_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
  vD = -mvPosition.z; vFade = aFade;
}`;
const lineFrag = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uOpacity, uFog;
varying float vD, vFade;
void main() {
  #include <logdepthbuf_fragment>
  float fog = 1.0 - exp(-uFog * uFog * vD * vD);
  gl_FragColor = vec4(0.0, 1.0, 0.0, uOpacity * (1.0 - fog) * (1.0 - vFade));
}`;
// wall boards / photos: "leave this alone" (blue = -1, no blending)
const markVert = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  #include <begin_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
}`;
const markFrag = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  gl_FragColor = vec4(0.0, 0.0, -1.0, 0.0);
}`;

/* ---------------- the last pass ---------------- */
const postVert = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const postFrag = /* glsl */ `
precision highp float;
uniform sampler2D tA, tB, tDepth;
uniform vec2 uRes; uniform float uScale, uLogF, uFog, uExposure;
uniform int uStyle;
uniform vec3 uPaper, uInkD, uInkL;
uniform float uTint, uWash, uHK, uLK, uOK, uDay, uHatch;   // uHatch: 1 strokes on surfaces, 0 none   // uDay: daylight of the whole scene (0 night … 1 day)
varying vec2 vUv;
${NOISE}
vec3 RRTAndODTFit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 aces(vec3 c) {   // the renderer's own tone mapping (three r170), so pass A looks exactly like A1
  const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  c *= uExposure / 0.6; c = O * RRTAndODTFit(I * c); return clamp(c, 0.0, 1.0);
}
vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(0.41666)) - 0.055, step(0.0031308, c)); }
vec3 sceneAt(vec2 uv) { return srgb(aces(texture2D(tA, uv).rgb)); }
vec2 px2uv(vec2 p) { return p * uScale / uRes; }
float iz(vec2 uv) { float d = texture2D(tDepth, uv).x; return d > 0.99999 ? 0.0 : 1.0 / max(exp2(d * uLogF) - 1.0, 0.05); }
float edge(vec2 uv, float r) {
  vec2 dx = vec2(r * uScale / uRes.x, 0.0), dy = vec2(0.0, r * uScale / uRes.y);
  float i0 = iz(uv), il = iz(uv - dx), ir = iz(uv + dx), id = iz(uv - dy), iu = iz(uv + dy);
  float m = max(max(i0, max(il, ir)), max(id, iu));
  return smoothstep(0.06, 0.2, (abs(il + ir - 2.0 * i0) + abs(id + iu - 2.0 * i0)) / max(m, 1e-4));
}
vec3 hue(vec3 c) { return clamp(c / max(lum(c), 0.06), 0.0, 2.5); }
vec3 posterise(vec3 c, float n) { return floor(c * n + 0.5) / n; }
// a halftone dot screen: 1 = ink
float halftone(vec2 p, float amt, float ang, float cell) {
  vec2 r = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p / cell;
  float d = length(fract(r) - 0.5), rad = sqrt(clamp(amt, 0.0, 1.0)) * 0.62;
  return 1.0 - smoothstep(rad - 0.08, rad + 0.08, d);
}

void main() {
  vec2 uv = vUv, p = gl_FragCoord.xy / uScale;
  vec3 a = sceneAt(uv);
  vec4 B = texture2D(tB, uv);
  if (B.b < -0.3) { gl_FragColor = vec4(srgb(clamp(texture2D(tA, uv).rgb, 0.0, 1.0)), 1.0); return; }  // a wall board
  float mask = clamp(B.a, 0.0, 1.0);
  if (mask < 0.003) { gl_FragColor = vec4(a, 1.0); return; }                                           // not drawn (house only)
  float R = clamp(B.r / mask, 0.0, 1.0) * uHatch + ((uStyle == 7 || uStyle == 18) ? 0.5 * (1.0 - uHatch) : 0.0), G = clamp(B.g / mask, 0.0, 1.0), s = clamp(B.b / mask, 0.0, 1.0);

  // brightness of the neighbourhood (so small bright things — stars, lit windows — keep their own look)
  float Lb = 0.0;
  for (int i = 0; i < 6; i++) { float t = float(i) * 1.047; Lb += lum(sceneAt(uv + px2uv(vec2(cos(t), sin(t)) * 7.0))); }
  Lb = mix(Lb / 6.0, lum(a), 0.3);
  float day = max(smoothstep(0.12, 0.55, Lb), uDay * smoothstep(0.03, 0.22, Lb));   // in daylight shade becomes paper too
  float z0 = iz(uv), dist = z0 > 0.0 ? 1.0 / z0 : 1e4, near = exp(-uFog * uFog * dist * dist);
  float grain = fbm(p * 0.45), tooth = noise(p * 0.9);
  vec2 wob = (vec2(noise(p * 0.015), noise(p * 0.015 + 31.7)) - 0.5) * 2.6;
  float e = edge(px2uv(p + wob), (uStyle == 3 || uStyle == 5 || uStyle == 17) ? 1.6 : 1.0) * near;

  vec3 src = a;
  if (uStyle == 3 || uStyle == 9) {                                    // chalks: smudged
    vec2 sm = (vec2(fbm(p * 0.02), fbm(p * 0.02 + 5.0)) - 0.5) * 8.0;
    src = mix(a, sceneAt(px2uv(p + sm)), 0.4);
  } else if (uStyle == 2 || uStyle == 15) {                            // watercolours: pigment bleeds past the lines
    vec2 bl = (vec2(fbm(p * 0.035), fbm(p * 0.035 + 9.0)) - 0.5) * (uStyle == 15 ? 26.0 : 14.0);
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 6; i++) { float t = float(i) * 1.047 + grain; acc += sceneAt(px2uv(p + bl + vec2(cos(t), sin(t)) * 3.0)); }
    src = mix(a, acc / 6.0, 0.75);
  }
  float Ls = lum(src), chroma = length(src - vec3(Ls));
  // bright → paper (tinted by the scene's colour), dark → the scene as it is
  vec3 paperC = uPaper * mix(vec3(1.0), hue(src), uTint);
  vec3 base = mix(src, paperC, uWash * day);
  vec3 o;

  if (uStyle == 2) {                       // watercolour: transparent washes, wet edges, the sheet fades out
    vec3 pig = 1.0 - (1.0 - sat(src, 1.45)) * 0.8;
    vec3 w = uPaper * pig * (0.92 + 0.14 * fbm(p * 0.05));
    vec2 d = vec2(3.0, 0.0);
    float wet = smoothstep(0.08, 0.3, length(sceneAt(px2uv(p + d)) - sceneAt(px2uv(p - d))) + length(sceneAt(px2uv(p + d.yx)) - sceneAt(px2uv(p - d.yx))));
    base = mix(src, w * (1.0 - 0.12 * wet), 0.85 * day);
    float vig = smoothstep(0.6, 0.95, length((uv - 0.5) * vec2(1.1, 1.0)) + 0.2 * (fbm(p * 0.01) - 0.5));
    base = mix(base, uPaper, vig * 0.85 * day);
  } else if (uStyle == 5) {                // ink wash: three greys
    float q = clamp(floor(max(s * 0.9, 1.0 - Ls) * 3.0 + 0.3 + 0.5 * (fbm(p * 0.04) - 0.5)) / 3.0, 0.0, 1.0);
    base = mix(src, uPaper * (1.0 - 0.7 * q) * (0.96 + 0.05 * noise(p * vec2(0.08, 0.6))), uWash * day);
  } else if (uStyle == 6) {                // marker: flat bold colour, streaks, white highlights
    vec3 m = mix(posterise(sat(src, 1.35), 5.0), sat(src, 1.35), 0.5) * (1.0 - 0.1 * R) * (1.0 - 0.25 * s);
    m = mix(m, uPaper, smoothstep(0.82, 0.92, Ls + 0.06 * (noise(p * 0.05) - 0.5)));
    base = mix(src, m, day);
  } else if (uStyle == 7 || uStyle == 18) { // coloured pencil / pastel: colour carried by strokes on the tooth
    float amt = clamp((1.0 - Ls) * 1.2 + chroma * 0.8 + 0.1, 0.0, 1.0);
    float cover = uStyle == 7
      ? clamp(R * smoothstep(0.05, 0.5, amt) + 0.55 * smoothstep(0.7, 1.0, amt), 0.0, 1.0)
      : smoothstep(tooth - 0.3, tooth + 0.2, amt * 0.9 + 0.25 * R);
    vec3 pig = uStyle == 7 ? sat(src, 1.35) : sat(src, 0.85) * 1.12 + 0.06;
    base = mix(src, mix(uPaper, pig, cover * 0.92), day);
  } else if (uStyle == 12) {               // gouache: flat opaque planes, brush texture
    vec3 g = posterise(sat(src, 1.2), 4.0) * (0.95 + 0.08 * fbm(p * vec2(0.05, 0.2)));
    base = mix(src, mix(g, uPaper, 0.12), 0.9 * day);
  } else if (uStyle == 16) {               // risograph: pink + blue inks in halftone, slightly off-register
    float t = 1.0 - Ls, warm = clamp(src.r - src.b + 0.5, 0.0, 1.0);
    float pink = halftone(p + vec2(1.5, -1.0), t * (0.35 + 0.65 * warm), 0.26, 5.0);
    float blue = halftone(p, t * (1.0 - 0.6 * warm) + 0.15 * s, 1.31, 5.0);
    base = uPaper * mix(vec3(1.0), vec3(1.0, 0.28, 0.69), pink * 0.9) * mix(vec3(1.0), vec3(0.0, 0.47, 0.75), blue * 0.9);
    base = mix(src, base, 0.35 + 0.65 * smoothstep(0.03, 0.2, Lb));     // the darkest night keeps its own look
  } else if (uStyle == 17) {               // woodcut: black and white only
    float dk = max(R, 1.0 - smoothstep(0.3, 0.42, Ls + 0.08 * (noise(p * 0.2) - 0.5)));
    base = mix(uPaper, uInkD, step(0.5, dk));
    base = mix(base, src, 0.25 * (1.0 - day));
  } else if (uStyle == 11) {               // toned paper: white chalk on the lit faces
    float hl = smoothstep(0.7, 0.92, Ls) * (1.0 - s) * smoothstep(0.3, 0.7, noise(p * vec2(0.6, 0.08)));
    base = mix(base, uInkL, hl * 0.6 * day);
  } else if (uStyle == 19 || uStyle == 14) { // sepia / etching: aged sheet, darker towards the edges
    float vig = smoothstep(0.45, 1.0, length((uv - 0.5) * vec2(1.1, 1.0)));
    base *= 1.0 - (0.18 * vig + 0.06 * fbm(p * 0.008)) * day;
  } else if (uStyle == 10) {               // chalk dust on the board
    base += 0.035 * fbm(p * 0.02) * day;
  }

  vec3 ink = mix(uInkL, uInkD, smoothstep(0.28, 0.5, lum(base)));
  if (uStyle == 4 || uStyle == 10) ink = uInkD;
  o = mix(base, ink, clamp(R * uHK * mix(0.35, 1.0, day), 0.0, 1.0));
  o = mix(o, ink, clamp(G * uLK, 0.0, 1.0));
  float br = (uStyle == 5) ? smoothstep(0.25, 0.45, noise(p * vec2(0.25, 0.05)) + 0.3) : 1.0;   // dry brush
  o = mix(o, ink, clamp(e * uOK * br, 0.0, 1.0));
  if (uStyle == 4) {                       // blueprint grid
    vec2 gp = abs(fract(p / 24.0) - 0.5) * 24.0;
    o += (1.0 - smoothstep(0.0, 0.9, min(gp.x, gp.y))) * 0.07 * day;
  }
  o *= mix(1.0, 0.975 + 0.04 * grain, day);                          // paper tooth
  gl_FragColor = vec4(mix(a, o, mask), 1.0);
}`;

const srgb3 = (hex) => { const n = parseInt(hex.slice(1), 16); return new THREE.Vector3((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255); };
const h1 = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function createArtPass(renderer, scene, camera) {
  let style = 0, S = null;
  const U = { uPat: { value: 0 }, uSun: { value: new THREE.Vector3(-4, 12, 6).normalize() }, uFog: { value: 0 }, uSp: { value: 0.085 } };

  const surfCache = new WeakMap();
  function surface(orig) {
    let m = surfCache.get(orig);
    if (!m) {
      const k = orig.userData.artKind;
      const kind = k === "sky" ? 2 : k === "glow" ? 3 : k === "water" ? 4
        : orig.isMeshBasicMaterial ? 1 : orig.emissive && orig.emissiveIntensity * Math.max(orig.emissive.r, orig.emissive.g) > 0.4 ? 3 : 0;
      m = new THREE.ShaderMaterial({
        vertexShader: surfVert, fragmentShader: surfFrag,
        uniforms: { ...U, uKind: { value: kind }, uColor: { value: orig.color || new THREE.Color(1, 1, 1) }, uOpacity: { value: 1 } },
      });
      m.userData.orig = orig;
      surfCache.set(orig, m);
    }
    m.side = orig.side; m.transparent = orig.transparent; m.depthWrite = orig.depthWrite; m.depthTest = orig.depthTest;
    m.uniforms.uOpacity.value = orig.opacity;                 // see-through / solid walls
    return m;
  }
  const lineMat = (op) => new THREE.ShaderMaterial({ vertexShader: lineVert, fragmentShader: lineFrag, transparent: true, depthWrite: false,
    uniforms: { uFog: U.uFog, uOpacity: { value: op } } });
  const inkMat = lineMat(0.9), conMat = lineMat(0.3);
  const markMat = new THREE.ShaderMaterial({ vertexShader: markVert, fragmentShader: markFrag, blending: THREE.NoBlending, side: THREE.DoubleSide });
  const hideMat = new THREE.MeshBasicMaterial({ colorWrite: false });   // surroundings in "house only": depth only

  // an edge-line geometry redrawn by hand: every stroke overshoots its corners, some are drawn twice
  function handLines(obj) {
    const src = obj.geometry.attributes.position, n = src.count / 2;
    obj.updateWorldMatrix(true, false);
    const sc = new THREE.Vector3(); obj.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), sc);
    const k = 1 / Math.max(1e-3, (sc.x + sc.y + sc.z) / 3);   // metres → this object's units
    const out = [], a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), q = new THREE.Vector3();
    const id0 = obj.id * 13.7;
    for (let i = 0; i < n; i++) {
      a.fromBufferAttribute(src, 2 * i); b.fromBufferAttribute(src, 2 * i + 1);
      const L = a.distanceTo(b); if (L < 1e-5) continue;
      d.subVectors(b, a).divideScalar(L);
      const r1 = h1(id0 + i), r2 = h1(id0 + i + 0.37), r3 = h1(id0 + i + 0.71);
      const cap = Math.min(0.35 * L, (0.07 + 0.16 * r1) * k), cap2 = Math.min(0.35 * L, (0.05 + 0.14 * r2) * k);
      out.push(a.x - d.x * cap, a.y - d.y * cap, a.z - d.z * cap, b.x + d.x * cap2, b.y + d.y * cap2, b.z + d.z * cap2);
      if (r3 < 0.45 && L / k > 0.25) {                       // a second pass a hair off the first
        q.set(d.y - d.z, d.z - d.x, d.x - d.y).normalize().multiplyScalar((0.008 + 0.012 * r1) * k);
        const s0 = (0.1 * r2 - 0.04) * L, s1 = (0.1 * r1 - 0.04) * L;
        out.push(a.x + q.x + d.x * s0, a.y + q.y + d.y * s0, a.z + q.z + d.z * s0, b.x + q.x - d.x * s1, b.y + q.y - d.y * s1, b.z + q.z - d.z * s1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    return g;
  }

  // faint construction lines along the long edges of the house, running off past its corners
  function constructionLines(world, bounds) {
    const [x0, z0, x1, z1] = bounds, pts = [], fade = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
    const inside = (p) => p.x > x0 - 0.6 && p.x < x1 + 0.6 && p.z > z0 - 0.6 && p.z < z1 + 0.6 && p.y > -1 && p.y < 9;
    const seen = new Set();
    world.traverse((o) => {
      if (!o.isLineSegments || o.userData.isArtClone || o.geometry.type !== "EdgesGeometry") return;
      const src = o.geometry.attributes.position;
      o.updateWorldMatrix(true, false);
      for (let i = 0; i < src.count / 2; i++) {
        a.fromBufferAttribute(src, 2 * i).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(src, 2 * i + 1).applyMatrix4(o.matrixWorld);
        const L = a.distanceTo(b);
        if (L < 2.4 || !inside(a) || !inside(b)) continue;
        d.subVectors(b, a).divideScalar(L);
        const vert = Math.abs(d.y) > 0.95, flat = Math.abs(d.y) < 0.05;
        if (!vert && !flat) continue;
        const key = [a.x, a.y, a.z, b.x, b.y, b.z].map((v) => v.toFixed(1)).join(",");
        if (seen.has(key)) continue; seen.add(key);
        const r = h1(seen.size * 3.3);
        if (r > 0.4) continue;
        const e0 = vert ? 0.6 + 1.6 * h1(r * 91) : 3 + 16 * h1(r * 57), e1 = vert ? 0.8 + 2.4 * h1(r * 23) : 3 + 16 * h1(r * 77);
        pts.push(a.x, a.y, a.z, a.x - d.x * e0, a.y - d.y * e0, a.z - d.z * e0); fade.push(0, 1);
        pts.push(b.x, b.y, b.z, b.x + d.x * e1, b.y + d.y * e1, b.z + d.z * e1); fade.push(0, 1);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    g.setAttribute("aFade", new THREE.Float32BufferAttribute(fade, 1));
    const ls = new THREE.LineSegments(g, conMat);
    ls.userData.isArtClone = true; ls.frustumCulled = false; ls.layers.set(LAYER);
    return ls;
  }

  function cloneOf(o, make) {
    let c = o.userData.artClone;
    if (!c) { c = make(); c.userData.isArtClone = true; c.layers.set(LAYER); o.add(c); o.userData.artClone = c; }
    return c;
  }

  /* ---------------- targets and the last pass ---------------- */
  const depthTexture = new THREE.DepthTexture(1, 1);
  const rtA = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4, depthTexture });
  const rtB = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const post = new THREE.ShaderMaterial({
    vertexShader: postVert, fragmentShader: postFrag, depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: {
      tA: { value: rtA.texture }, tB: { value: rtB.texture }, tDepth: { value: depthTexture }, uRes: { value: new THREE.Vector2(1, 1) },
      uScale: { value: 1 }, uLogF: { value: 1 }, uFog: U.uFog, uExposure: { value: 1 }, uStyle: { value: 0 },
      uPaper: { value: new THREE.Vector3() }, uInkD: { value: new THREE.Vector3() }, uInkL: { value: new THREE.Vector3() },
      uTint: { value: 0 }, uWash: { value: 0 }, uDay: { value: 1 }, uHatch: { value: 1 }, uHK: { value: 0 }, uLK: { value: 0 }, uOK: { value: 0 },
    },
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post);
  quad.frustumCulled = false;
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(quad);
  const size = new THREE.Vector2(), clear = new THREE.Color();

  return {
    get on() { return style !== 0; },
    setHatching(on) { post.uniforms.uHatch.value = on ? 1 : 0; },   // without: lines, paper and colour only
    setStyle(key) {
      S = ART[key] && ART[key].id ? ART[key] : null;
      style = S ? S.id : 0;
      if (!S) return;
      const u = post.uniforms;
      u.uStyle.value = style; u.uPaper.value.copy(srgb3(S.paper)); u.uInkD.value.copy(srgb3(S.inkD)); u.uInkL.value.copy(srgb3(S.inkL));
      u.uTint.value = S.tint; u.uWash.value = S.wash; u.uHK.value = S.hk; u.uLK.value = S.lk; u.uOK.value = S.ok;
      U.uPat.value = S.pat; U.uSp.value = S.sp;
    },
    // build/refresh the drawn copies (layer 2). Call after every rebuild or option change.
    apply(world, { bounds, sun, houseOnly = false } = {}) {
      if (sun) U.uSun.value.copy(sun).normalize();
      if (!style) return;
      const visit = (o, house) => {
        if (o.userData.isArtClone) return;
        house = house || !!o.userData.house;
        if (o.userData.keep) cloneOf(o, () => new THREE.Mesh(o.geometry, markMat));
        else if (o.isMesh) {
          const c = cloneOf(o, () => new THREE.Mesh(o.geometry));
          const env = houseOnly && !house;
          c.visible = !(env && o.material?.userData?.artKind === "sky");
          c.material = env ? hideMat : Array.isArray(o.material) ? o.material.map(surface) : surface(o.material);
        } else if (o.isLineSegments && o.geometry.type === "EdgesGeometry") {
          const c = cloneOf(o, () => new THREE.LineSegments(handLines(o), inkMat));
          c.visible = !houseOnly || house;
        }
        for (const ch of [...o.children]) visit(ch, house);
      };
      visit(world, false);
      if (!world.userData.artCons && bounds) { world.userData.artCons = constructionLines(world, bounds); world.add(world.userData.artCons); }
      conMat.uniforms.uOpacity.value = 0.3 * S.lk;
    },
    resize() {
      renderer.getDrawingBufferSize(size);
      rtA.setSize(size.x, size.y); rtB.setSize(size.x, size.y);
      post.uniforms.uRes.value.copy(size);
      post.uniforms.uScale.value = renderer.getPixelRatio();
    },
    render(daylight = 1) {
      if (!style) { renderer.render(scene, camera); return; }
      const u = post.uniforms;
      u.uDay.value = daylight;
      U.uFog.value = scene.fog ? scene.fog.density : 0;
      u.uLogF.value = Math.log2(camera.far + 1); u.uExposure.value = renderer.toneMappingExposure;
      renderer.setRenderTarget(rtA); renderer.render(scene, camera);          // A: the scene as in A1
      const bg = scene.background, ca = renderer.getClearAlpha(); renderer.getClearColor(clear);
      scene.background = null; renderer.setClearColor(0x000000, 0);
      camera.layers.set(LAYER);
      renderer.setRenderTarget(rtB); renderer.render(scene, camera);          // B: the drawing
      camera.layers.set(0);
      scene.background = bg; renderer.setClearColor(clear, ca);
      renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    },
  };
}
