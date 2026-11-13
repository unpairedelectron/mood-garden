// Trees up close. Far away a tree is a two-triangle impostor; when you walk
// near one it cross-fades into a real 3D tree: a bark-textured trunk and
// branches, under a canopy of leaf cards cut from the same photo-scan, so it
// still holds together when you stand underneath and look up.
//
// Nothing here is modelled by hand. Each species' trunk position, lean, canopy
// height and canopy shape are measured from the alpha of its baked impostor
// views, so the near tree lines up with the far one it replaces.

import * as THREE from 'three';
import { LIGHT } from './forest';
import type { MoodDef, MoodId } from './moods';
import type { TreeSave } from './state';

const ASSETS = `${import.meta.env.BASE_URL}assets/`;

/** Hand-set character for each species; everything else is measured. */
interface Style {
  bark: string;
  stems: number;
  branches: number;
  /** Trunk radius at the base as a share of the measured base width. */
  girth: number;
  /** Conifers: the stem runs to the top and cards hang off it in tiers. */
  spire?: boolean;
  /** Cards per tree. */
  cards: number;
  /** Card size in units of tree height. */
  card: number;
}
const STYLES: Record<MoodId, Style> = {
  joy: { bark: 'bark_willow_02', stems: 2, branches: 5, girth: 0.42, cards: 144, card: 0.15 },
  calm: { bark: 'bark_brown_02', stems: 1, branches: 5, girth: 0.5, cards: 128, card: 0.16 },
  love: { bark: 'bark_brown_02', stems: 1, branches: 6, girth: 0.45, cards: 160, card: 0.14 },
  hope: { bark: 'bark_brown_02', stems: 1, branches: 0, girth: 0.5, spire: true, cards: 96, card: 0.2 },
  courage: { bark: 'eucalyptus_bark', stems: 1, branches: 7, girth: 0.5, cards: 73, card: 0.17 },
  sorrow: { bark: 'bark_willow_02', stems: 5, branches: 0, girth: 0.3, cards: 144, card: 0.14 },
};

/** What the impostor views tell us, in units of the tree's height. */
interface Profile {
  aspect: number;
  /** Trunk base offset and radius. */
  base: THREE.Vector2;
  baseR: number;
  /** Where leaves begin, 0..1 of height. */
  canopyBase: number;
  /** Canopy centre offset at canopy base and at the top. */
  lean: THREE.Vector2;
  /** Canopy radius at 16 heights from canopyBase to the top. */
  radius: number[];
  /** Atlas rectangles (u0, v0, u1, v1) full of leaves. */
  crops: THREE.Vector4[];
}

const BINS = 16;

function measure(img: HTMLImageElement | ImageBitmap, info: { width: number; height: number; cols: number; rows: number }): Profile {
  const W = 512;
  const H = Math.round((W * img.height) / img.width);
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img as CanvasImageSource, 0, 0, W, H);
  const px = g.getImageData(0, 0, W, H).data;
  const cw = W / info.cols, ch = H / info.rows;
  const aspect = info.width / info.height;
  const views = info.cols * info.rows;
  const alpha = (x: number, y: number) => px[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] / 255;

  // Per view: row coverage (width in units of height) and centroid.
  const rowsW: number[][] = [], rowsC: number[][] = [];
  for (let v = 0; v < views; v++) {
    const x0 = (v % info.cols) * cw, y0 = Math.floor(v / info.cols) * ch;
    const wv: number[] = [], cv2: number[] = [];
    for (let r = 0; r < Math.floor(ch); r++) {
      let n = 0, sx = 0, lo = Infinity, hi = -Infinity;
      for (let c = 0; c < Math.floor(cw); c++) {
        if (alpha(x0 + c, y0 + r) > 0.5) {
          n++;
          sx += c;
          lo = Math.min(lo, c);
          hi = Math.max(hi, c);
        }
      }
      // Row r counts from the top of the cell; store bottom-up.
      wv.unshift(n ? ((hi - lo + 1) / cw) * aspect : 0);
      cv2.unshift(n ? (sx / n / cw - 0.5) * aspect : 0);
    }
    rowsW.push(wv);
    rowsC.push(cv2);
  }
  const R = rowsW[0].length;
  // The trunk at the base: lowest few percent of rows that have anything.
  const baseRows = Math.max(2, Math.round(R * 0.04));
  let baseW = 0;
  const baseOff = new THREE.Vector2();
  for (let v = 0; v < views; v++) {
    const phi = (v * Math.PI * 2) / views;
    let w = 0, c = 0, k = 0;
    for (let r = 0; r < R && k < baseRows; r++) {
      if (rowsW[v][r] > 0) {
        w += rowsW[v][r];
        c += rowsC[v][r];
        k++;
      }
    }
    baseW += w / Math.max(1, k) / views;
    // Image x = local.x cos(phi) - local.z sin(phi)
    baseOff.x += ((c / Math.max(1, k)) * Math.cos(phi) * 2) / views;
    baseOff.y += (-(c / Math.max(1, k)) * Math.sin(phi) * 2) / views;
  }
  // Average silhouette width by height.
  const avgW = new Array(R).fill(0).map((_, r) => rowsW.reduce((s, wv) => s + wv[r], 0) / views);
  const maxW = Math.max(...avgW);
  let cb = 0;
  for (let r = baseRows; r < R; r++) {
    if (avgW[r] > Math.max(baseW * 3.2, maxW * 0.3)) {
      cb = r / R;
      break;
    }
  }
  let top = 1;
  for (let r = R - 1; r > 0; r--) {
    if (avgW[r] > maxW * 0.05) {
      top = (r + 1) / R;
      break;
    }
  }
  // Canopy centre (lean) from the centroid of the canopy rows in each view.
  const lean = new THREE.Vector2();
  for (let v = 0; v < views; v++) {
    const phi = (v * Math.PI * 2) / views;
    let c = 0, k = 0;
    for (let r = Math.floor(cb * R); r < Math.floor(top * R); r++) {
      if (rowsW[v][r] > 0) {
        c += rowsC[v][r];
        k++;
      }
    }
    c /= Math.max(1, k);
    lean.x += (c * Math.cos(phi) * 2) / views;
    lean.y += (-c * Math.sin(phi) * 2) / views;
  }
  const radius: number[] = [];
  for (let b = 0; b < BINS; b++) {
    const y = cb + ((top - cb) * (b + 0.5)) / BINS;
    const r = Math.min(R - 1, Math.floor(y * R));
    radius.push(avgW[r] * 0.5);
  }
  // Leafy crops: square-ish windows inside the canopy that are mostly opaque.
  const crops: THREE.Vector4[] = [];
  // About 1/8 of the cell: leaves on a card come out near their real size.
  const side = cw * 0.13;
  const sideY = side * (ch / cw) / Math.max(0.6, Math.min(1.6, aspect));
  const rnd = mulberry(7);
  // Sparse trees (needles) need a lower bar for what counts as "full of leaves".
  for (let tries = 0, need = 0.62; tries < 2400 && crops.length < 28; tries++) {
    if (tries === 1200 && crops.length < 10) need = 0.3;
    const v = Math.floor(rnd() * views);
    const x0 = (v % info.cols) * cw, y0 = Math.floor(v / info.cols) * ch;
    const cx = x0 + rnd() * (cw - side);
    const cy = y0 + (1 - top) * ch + rnd() * Math.max(1, (top - cb) * ch * 0.85 - sideY);
    let n = 0;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) n += alpha(cx + ((i + 0.5) / 6) * side, cy + ((j + 0.5) / 6) * sideY) > 0.5 ? 1 : 0;
    if (n / 36 < need) continue;
    crops.push(new THREE.Vector4(cx / W, 1 - (cy + sideY) / H, (cx + side) / W, 1 - cy / H));
  }
  return { aspect, base: baseOff, baseR: baseW * 0.5, canopyBase: cb, lean, radius: radius.map((r) => r), crops, ...{ top } } as Profile & { top: number };
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------- wood

/** A tapered tube along a curve, with bark UVs that wrap around it. */
function tube(path: THREE.Vector3[], r0: number, r1: number, seg: number, out: { pos: number[]; nrm: number[]; uv: number[]; idx: number[] }) {
  const curve = new THREE.CatmullRomCurve3(path);
  const n = path.length * 3;
  const frames = curve.computeFrenetFrames(n, false);
  const start = out.pos.length / 3;
  const len = curve.getLength();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = curve.getPointAt(t);
    const r = r0 + (r1 - r0) * Math.pow(t, 0.8);
    // Root flare at the very base.
    const flare = i === 0 && r0 > 0.01 ? 1.35 : 1;
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const nx = frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      out.pos.push(p.x + nx.x * r * flare, p.y + nx.y * r * flare, p.z + nx.z * r * flare);
      out.nrm.push(nx.x, nx.y, nx.z);
      out.uv.push((j / seg) * Math.max(1, Math.round(r0 * 14)), t * len * 2.2);
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < seg; j++) {
      const a = start + i * (seg + 1) + j;
      const b = a + seg + 1;
      out.idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
}

function woodGeometry(p: Profile & { top: number }, st: Style, seed: number): THREE.BufferGeometry {
  const r = mulberry(seed);
  const out = { pos: [] as number[], nrm: [] as number[], uv: [] as number[], idx: [] as number[] };
  const cb = Math.max(0.12, p.canopyBase);
  // A clump of stems is measured as one wide base; give each stem a slender trunk instead.
  const baseR = st.stems > 2 ? 0.014 : Math.max(0.006, p.baseR * st.girth);
  const crownAt = (y: number) => {
    const k = Math.min(1, y / cb);
    return new THREE.Vector3(p.base.x + (p.lean.x - p.base.x) * k, y, p.base.y + (p.lean.y - p.base.y) * k);
  };
  const rAt = (y: number) => {
    const t = Math.min(BINS - 1, Math.max(0, Math.floor(((y - cb) / Math.max(0.05, p.top - cb)) * BINS)));
    return p.radius[t] ?? 0.1;
  };
  for (let s = 0; s < st.stems; s++) {
    const spread = st.stems > 1 ? 0.25 + r() * 0.5 : 0;
    const a0 = (s / st.stems) * Math.PI * 2 + r();
    const foot = new THREE.Vector3(p.base.x + Math.cos(a0) * baseR * spread * 2, 0, p.base.y + Math.sin(a0) * baseR * spread * 2);
    const end = st.spire ? p.top * 0.96 : cb * (st.stems > 2 ? 0.9 : 1.05);
    const pts: THREE.Vector3[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = (i / steps) * end;
      const c = crownAt(y);
      const k = i / steps;
      // Stems wander a little and splay apart as they rise.
      const wob = Math.sin(k * 3 + seed + s) * baseR * 1.2;
      const splay = st.stems > 1 ? k * rAt(cb + 0.05) * 0.35 : 0;
      pts.push(new THREE.Vector3(foot.x + (c.x - p.base.x) + Math.cos(a0) * splay + wob, y, foot.z + (c.z - p.base.y) + Math.sin(a0) * splay - wob * 0.5));
    }
    const rs = baseR / Math.sqrt(st.stems);
    tube(pts, rs, rs * (st.spire ? 0.12 : 0.55), 9, out);

    // Limbs: from the upper stem out and up into the canopy.
    for (let b = 0; b < st.branches / st.stems; b++) {
      const from = 0.65 + r() * 0.3;
      const i0 = Math.min(steps - 1, Math.floor(from * steps));
      const p0 = pts[i0].clone().lerp(pts[i0 + 1], from * steps - i0);
      const ang = r() * Math.PI * 2;
      const rise = cb + (p.top - cb) * (0.25 + r() * 0.35);
      const reach = rAt(rise) * (0.45 + r() * 0.35);
      const c = crownAt(rise);
      const tip = new THREE.Vector3(c.x + Math.cos(ang) * reach, rise, c.z + Math.sin(ang) * reach);
      // Limbs leave the stem low and bow upward, with a kink where they forked.
      const m1 = p0.clone().lerp(tip, 0.3);
      m1.y = p0.y + (tip.y - p0.y) * 0.12;
      const m2 = p0.clone().lerp(tip, 0.65);
      m2.y = p0.y + (tip.y - p0.y) * 0.55;
      m2.x += (r() - 0.5) * reach * 0.25;
      m2.z += (r() - 0.5) * reach * 0.25;
      const mid = m2;
      const br = rs * (0.35 + r() * 0.15);
      tube([p0, m1, m2, tip], br, br * 0.22, 6, out);
      // Two twigs off each limb.
      for (let k = 0; k < 2; k++) {
        const q0 = mid.clone().lerp(tip, 0.4 + r() * 0.4);
        const a2 = ang + (r() - 0.5) * 2;
        const q1 = q0.clone().add(new THREE.Vector3(Math.cos(a2) * reach * 0.4, reach * (0.15 + r() * 0.3), Math.sin(a2) * reach * 0.4));
        tube([q0, q0.clone().lerp(q1, 0.5).add(new THREE.Vector3(0, reach * 0.05, 0)), q1], br * 0.3, br * 0.06, 4, out);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out.nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
  g.setIndex(out.idx);
  g.computeBoundingSphere();
  return g;
}

// ------------------------------------------------------------------ leaves

const CARD_VERT = /* glsl */ `
attribute vec4 aCrop;
attribute vec3 aCentre;
attribute float aFade;
uniform float uTime, uWind;
varying vec2 vUv, vCard;
varying vec3 vN, vWorld, vCentre;
varying float vFade, vSeed, vH;
void main() {
  vUv = mix(aCrop.xy, aCrop.zw, uv);
  vCard = uv;
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.);
  vec3 root = (modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
  float H = length(instanceMatrix[1].xyz);
  // Branches sway with height; leaves flutter on top of that.
  float k = position.y;
  float s = root.x * .37 + root.z * .21;
  wp.x += (sin(uTime * .9 + s) * .012 + sin(uTime * 2.3 + s * 3.) * .005) * uWind * H * k * k;
  wp.xyz += vec3(sin(uTime * 4.7 + wp.y * 3. + wp.x), sin(uTime * 5.3 + wp.z * 2.), cos(uTime * 4.1 + wp.x * 2.)) * .025 * uWind * k;
  vWorld = wp.xyz;
  vCentre = (modelMatrix * instanceMatrix * vec4(aCentre, 1.)).xyz;
  // Foliage normals: half the card, half "out from the crown" for soft volume.
  vec3 cn = normalize(mat3(modelMatrix * instanceMatrix) * normal);
  vN = normalize(cn * .35 + normalize(wp.xyz - vCentre) * .65);
  vFade = aFade;
  vSeed = fract(root.x * 3.17 + root.z * 1.31);
  vH = k;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const CARD_FRAG = /* glsl */ `
uniform sampler2D uAlbedo;
uniform vec3 uSunDir, uSunColor, uSky, uGround, uFogColor, uAutumnCol, uBloomCol;
uniform float uFogDensity, uCover, uAutumn, uBloom, uSnow;
varying vec2 vUv, vCard;
varying vec3 vN, vWorld, vCentre;
varying float vFade, vSeed, vH;
float hsh(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y);
}
float bayer(vec2 p) {
  vec2 q = mod(floor(p), 4.);
  return (mod(q.x * 2. + q.y * 3. + q.x * q.y, 7.) + hsh(q) * .99) / 8.;
}
void main() {
  if (vFade > .001 && vFade > bayer(gl_FragCoord.xy)) discard;
  // Ragged round clusters, so no card shows a straight edge.
  vec2 cq = vCard - .5;
  float ang = atan(cq.y, cq.x);
  float edge = .5 - .13 * (.5 + .5 * sin(ang * 5. + vSeed * 40.)) - .07 * vn(vCard * 9. + vSeed * 17.);
  if (length(cq) > edge) discard;
  vec4 al = texture2D(uAlbedo, vUv);
  if (al.a < .5) discard;
  float leafy = smoothstep(-.002, .014, al.g - max(al.r, al.b));
  float ln = vn(vUv * vec2(260., 160.) + vSeed * 31.) * .7 + vn(vUv * vec2(60., 38.) + vSeed * 7.) * .3;
  if (leafy > .5 && ln > uCover) discard;
  float lum = dot(al.rgb, vec3(.3, .55, .15));
  al.rgb = mix(al.rgb, lum * uAutumnCol, uAutumn * leafy * (.6 + .4 * vn(vUv * 40. + vSeed * 9.)));
  al.rgb = mix(al.rgb, lum * uBloomCol * 1.5, uBloom * leafy * smoothstep(.45, .75, vn(vUv * vec2(320., 200.) + vSeed * 5.)));
  vec3 n = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  if (!gl_FrontFacing) n = -n;
  al.rgb = mix(al.rgb, vec3(.9, .93, .97), uSnow * smoothstep(.3, .8, n.y) * .85);
  // Inner leaves are shaded by outer ones.
  float depth = clamp(distance(vWorld, vCentre) / max(.5, length(vCentre - vWorld) + .001), 0., 1.);
  float occ = mix(.45, 1., smoothstep(.0, 1., vH));
  float diff = max(dot(n, uSunDir), 0.) * .75 + .25;
  vec3 amb = mix(uGround, uSky, n.y * .5 + .5) * 1.3 * occ;
  // Sun through the leaves when you look up toward it.
  float back = pow(max(dot(-V, uSunDir), 0.), 4.) * leafy;
  vec3 col = al.rgb * (amb + uSunColor * diff * occ + uSunColor * back * vec3(.6, .8, .3) * 1.4);
  float d = distance(cameraPosition, vWorld);
  col = mix(col, uFogColor, 1. - exp(-uFogDensity * uFogDensity * d * d));
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}`;

const CARD_DEPTH_FRAG = /* glsl */ `
uniform sampler2D uAlbedo;
uniform float uCover;
varying vec2 vUv, vCard;
varying float vFade, vSeed;
float hsh(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  if (vFade > .5) discard;
  // Ragged round clusters, so no card shows a straight edge.
  vec2 cq = vCard - .5;
  float ang = atan(cq.y, cq.x);
  float edge = .5 - .13 * (.5 + .5 * sin(ang * 5. + vSeed * 40.)) - .07 * vn(vCard * 9. + vSeed * 17.);
  if (length(cq) > edge) discard;
  vec4 al = texture2D(uAlbedo, vUv);
  if (al.a < .5) discard;
  float leafy = step(.006, al.g - max(al.r, al.b));
  float ln = vn(vUv * vec2(260., 160.) + vSeed * 31.) * .7 + vn(vUv * vec2(60., 38.) + vSeed * 7.) * .3;
  if (leafy > .5 && ln > uCover) discard;
  gl_FragColor = vec4(1.);
}`;

function cardGeometry(p: Profile & { top: number }, st: Style, seed: number): THREE.BufferGeometry | null {
  if (!p.crops.length) return null;
  const r = mulberry(seed);
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], crop: number[] = [], centre: number[] = [], idx: number[] = [];
  const cb = st.spire ? Math.max(0.08, p.canopyBase) : Math.max(0.12, p.canopyBase);
  const span = p.top - cb;
  const cy = cb + span * 0.5;
  const C = new THREE.Vector3(p.lean.x, cy, p.lean.y);
  const q = new THREE.Quaternion();
  const corner = [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]];
  for (let i = 0; i < st.cards; i++) {
    // Fill the measured canopy, favouring its outer shell.
    const t = Math.pow(r(), 0.85);
    const bin = Math.min(BINS - 1, Math.floor(t * BINS));
    const y = cb + span * t;
    const rr = p.radius[bin] * (st.spire ? 0.75 : 0.95) * Math.sqrt(0.25 + 0.75 * r());
    const a = r() * Math.PI * 2;
    const c = new THREE.Vector3(p.lean.x + Math.cos(a) * rr, y, p.lean.y + Math.sin(a) * rr);
    const out = c.clone().sub(C).normalize();
    // Face mostly outward, tilted randomly, so from any side there is cover.
    const nrmV = out.clone().lerp(new THREE.Vector3(r() - 0.5, r() - 0.3, r() - 0.5).normalize(), 0.55).normalize();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrmV);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (r() - 0.5) * 1.2));
    const size = st.card * (0.75 + r() * 0.5) * (st.spire ? 0.6 + 0.6 * (1 - t) : 1);
    const cr = p.crops[Math.floor(r() * p.crops.length)];
    const base = pos.length / 3;
    for (const [cx, cy2] of corner) {
      const v = new THREE.Vector3(cx * size, cy2 * size, 0).applyQuaternion(q).add(c);
      pos.push(v.x, v.y, v.z);
      nrm.push(nrmV.x, nrmV.y, nrmV.z);
      uv.push(cx + 0.5, cy2 + 0.5);
      crop.push(cr.x, cr.y, cr.z, cr.w);
      centre.push(C.x, C.y, C.z);
    }
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aCrop', new THREE.Float32BufferAttribute(crop, 4));
  g.setAttribute('aCentre', new THREE.Float32BufferAttribute(centre, 3));
  g.setIndex(idx);
  return g;
}

// ------------------------------------------------------------------ manager

interface Near {
  wood: THREE.InstancedMesh;
  leaves: THREE.InstancedMesh | null;
  fade: THREE.InstancedBufferAttribute;
  woodFade: THREE.InstancedBufferAttribute;
  profile: Profile & { top: number };
}

/** How many trees at once may be drawn in full. */
const NEAR_CAP = 14;

export interface ImpostorSpecies {
  def: MoodDef;
  rot: THREE.InstancedBufferAttribute;
  posH: THREE.InstancedBufferAttribute;
  count: number;
  trees: TreeSave[];
  albedo: THREE.Texture;
  info: { width: number; height: number; cols: number; rows: number };
  uniforms: Record<string, THREE.IUniform>;
}

export class NearTrees {
  readonly group = new THREE.Group();
  private near = new Map<MoodId, Near>();
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private s = new THREE.Vector3();
  private v = new THREE.Vector3();
  private order: { sp: ImpostorSpecies; i: number; d: number }[] = [];
  /** Distance at which full trees begin to replace impostors, scaled by tree height. */
  range = 1;

  async load(species: ImpostorSpecies[], maxAniso: number) {
    const tl = new THREE.TextureLoader();
    const barks = new Map<string, Promise<THREE.MeshStandardMaterial>>();
    const barkMat = (name: string) => {
      let p = barks.get(name);
      if (!p) {
        p = Promise.all([tl.loadAsync(`${ASSETS}bark/${name}_diff.webp`), tl.loadAsync(`${ASSETS}bark/${name}_nor.webp`)]).then(([d, n]) => {
          for (const t of [d, n]) {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.anisotropy = Math.min(4, maxAniso);
          }
          d.colorSpace = THREE.SRGBColorSpace;
          const m = new THREE.MeshStandardMaterial({ map: d, normalMap: n, roughness: 0.92, metalness: 0 });
          patchWood(m);
          return m;
        });
        barks.set(name, p);
      }
      return p;
    };
    await Promise.all(
      species.map(async (sp) => {
        const st = STYLES[sp.def.id];
        const img = sp.albedo.image as HTMLImageElement;
        const profile = measure(img, sp.info) as Profile & { top: number };
        // A spindly conifer's silhouette is too ragged to trust for lean.
        if (st.spire) profile.lean.copy(profile.base);
        sp.uniforms.uCanopyBase.value = profile.canopyBase;
        const mat = await barkMat(st.bark);
        const woodGeo = woodGeometry(profile, st, sp.def.id.length * 131);
        const woodFade = new THREE.InstancedBufferAttribute(new Float32Array(NEAR_CAP), 1);
        woodFade.setUsage(THREE.DynamicDrawUsage);
        woodGeo.setAttribute('aFade', woodFade);
        const wood = new THREE.InstancedMesh(woodGeo, mat, NEAR_CAP);
        wood.count = 0;
        wood.castShadow = wood.receiveShadow = true;
        wood.frustumCulled = false;
        this.group.add(wood);

        const cg = cardGeometry(profile, st, sp.def.id.length * 977 + 3);
        const fade = new THREE.InstancedBufferAttribute(new Float32Array(NEAR_CAP), 1);
        fade.setUsage(THREE.DynamicDrawUsage);
        let leaves: THREE.InstancedMesh | null = null;
        if (cg) {
          cg.setAttribute('aFade', fade);
          const u = {
            ...LIGHT,
            uAlbedo: { value: sp.albedo },
            uCover: sp.uniforms.uCover,
            uAutumn: sp.uniforms.uAutumn,
            uBloom: sp.uniforms.uBloom,
            uAutumnCol: sp.uniforms.uAutumnCol,
            uBloomCol: sp.uniforms.uBloomCol,
          };
          const lm = new THREE.ShaderMaterial({ vertexShader: CARD_VERT, fragmentShader: CARD_FRAG, uniforms: u, side: THREE.DoubleSide });
          leaves = new THREE.InstancedMesh(cg, lm, NEAR_CAP);
          leaves.customDepthMaterial = new THREE.ShaderMaterial({ vertexShader: CARD_VERT, fragmentShader: CARD_DEPTH_FRAG, uniforms: u, side: THREE.DoubleSide });
          leaves.count = 0;
          leaves.castShadow = true;
          leaves.frustumCulled = false;
          this.group.add(leaves);
        }
        this.near.set(sp.def.id, { wood, leaves, fade, woodFade, profile });
      }),
    );
  }

  /** Places on the outer canopy where a small bird could sit, in world space. */
  perches(t: TreeSave, H: number, groundY: number, n: number, seed: number): THREE.Vector3[] {
    const n0 = this.near.get(t.mood);
    if (!n0) return [];
    const p = n0.profile;
    const r = mulberry(seed);
    const out: THREE.Vector3[] = [];
    const c = Math.cos(t.rot), s = Math.sin(t.rot);
    for (let i = 0; i < n; i++) {
      const k = 0.25 + r() * 0.6;
      const y = p.canopyBase + (p.top - p.canopyBase) * k;
      const rad = p.radius[Math.min(BINS - 1, Math.floor(k * BINS))] * (0.7 + r() * 0.2);
      const a = r() * Math.PI * 2;
      const lx = p.lean.x + Math.cos(a) * rad, lz = p.lean.y + Math.sin(a) * rad;
      out.push(new THREE.Vector3(t.x + (lx * c + lz * s) * H, groundY + y * H, t.z + (-lx * s + lz * c) * H));
    }
    return out;
  }

  /** Choose which trees are drawn in full this frame and set every fade. */
  update(species: ImpostorSpecies[], eye: THREE.Vector3) {
    this.order.length = 0;
    for (const sp of species) {
      for (let i = 0; i < sp.count; i++) {
        const t = sp.trees[i];
        const d = Math.hypot(t.x - eye.x, t.z - eye.z);
        const H = sp.posH.getW(i);
        const far = (11 + H * 0.9) * this.range;
        if (d < far) this.order.push({ sp, i, d: d / far });
        else if (sp.rot.getZ(i) !== 1) {
          sp.rot.setZ(i, 1);
          sp.rot.needsUpdate = true;
        }
      }
    }
    this.order.sort((a, b) => a.d - b.d);
    for (const n of this.near.values()) {
      n.wood.count = 0;
      if (n.leaves) n.leaves.count = 0;
    }
    for (let k = 0; k < this.order.length; k++) {
      const { sp, i, d } = this.order[k];
      // Full detail inside 70% of the range, a dithered blend to the edge.
      const fade = k < NEAR_CAP ? THREE.MathUtils.smoothstep(d, 0.7, 1) : 1;
      if (sp.rot.getZ(i) !== fade) {
        sp.rot.setZ(i, fade);
        sp.rot.needsUpdate = true;
      }
      if (fade >= 1) continue;
      const n = this.near.get(sp.def.id)!;
      const t = sp.trees[i];
      const H = sp.posH.getW(i);
      this.q.setFromEuler(this.e.set(0, t.rot, 0));
      this.m4.compose(this.v.set(sp.posH.getX(i), sp.posH.getY(i), sp.posH.getZ(i)), this.q, this.s.set(H, H, H));
      const j = n.wood.count++;
      n.wood.setMatrixAt(j, this.m4);
      n.woodFade.setX(j, fade);
      if (n.leaves) {
        n.leaves.setMatrixAt(j, this.m4);
        n.fade.setX(j, fade);
        n.leaves.count = j + 1;
      }
    }
    for (const n of this.near.values()) {
      n.wood.instanceMatrix.needsUpdate = true;
      n.woodFade.needsUpdate = true;
      if (n.leaves) {
        n.leaves.instanceMatrix.needsUpdate = true;
        n.fade.needsUpdate = true;
      }
    }
  }
}

/** Bark: dithered fade, wet darkening and snow on top. */
function patchWood(m: THREE.MeshStandardMaterial) {
  m.onBeforeCompile = (s) => {
    s.uniforms.uWet = LIGHT.uWet;
    s.uniforms.uSnow = LIGHT.uSnow;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aFade;\nvarying float vFade;\nvarying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;\nvWN = normalize(mat3(modelMatrix * instanceMatrix) * normal);');
    s.fragmentShader = s.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uWet, uSnow;
         varying float vFade;
         varying vec3 vWN;
         float hshW(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
         float bayerW(vec2 p) { vec2 q = mod(floor(p), 4.); return (mod(q.x * 2. + q.y * 3. + q.x * q.y, 7.) + hshW(q) * .99) / 8.; }`,
      )
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vFade > .001 && vFade > bayerW(gl_FragCoord.xy)) discard;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
         diffuseColor.rgb *= 1. - uWet * .4;
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.9, .93, .97), uSnow * smoothstep(.55, .9, vWN.y));`,
      );
  };
  m.customProgramCacheKey = () => 'wood';
}
