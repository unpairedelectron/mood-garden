// Procedural flora: trunks grown from recursive branches, canopies built from
// camera-facing leaf cards with spherical normals (soft, painterly volume),
// rocks, the six great mood trees and the Heart Tree.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { type Rng, Noise2D, lerp, mulberry32 } from '../core/math';
import { HEART_POS, MOODS, MOOD_BY_ID, type MoodId } from '../data/moods';
import { COMMON_GLSL, FLAT_NORMAL, G, patchMaterial, replace } from '../render/shared';
import type { Terrain } from './terrain';

export interface Collider {
  x: number;
  z: number;
  r: number;
}

// --------------------------------------------------------------- textures
function leafTexture(style: 'leaf' | 'blossom' | 'needle' | 'strand', seed: number): THREE.CanvasTexture {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  const rng = mulberry32(seed);
  g.clearRect(0, 0, S, S);
  const leaf = (x: number, y: number, a: number, len: number, wid: number, shade: number) => {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    const v = Math.round(shade * 255);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(len * 0.5, -wid, len, 0);
    g.quadraticCurveTo(len * 0.5, wid, 0, 0);
    g.fill();
    g.strokeStyle = `rgba(0,0,0,0.18)`;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(len * 0.92, 0);
    g.stroke();
    g.restore();
  };
  if (style === 'leaf' || style === 'blossom') {
    const n = style === 'leaf' ? 70 : 44;
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.pow(rng(), 0.6) * S * 0.36;
      // Leaves deeper in the clump are darker, which reads as volume.
      const shade = 0.42 + 0.58 * Math.min(1, i / (n * 0.7)) * (0.75 + rng() * 0.25);
      leaf(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r, a + (rng() - 0.5) * 2.2, S * (0.1 + rng() * 0.08), S * (0.035 + rng() * 0.02), shade);
    }
    if (style === 'blossom') {
      for (let i = 0; i < 9; i++) {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * S * 0.34;
        const cx = S / 2 + Math.cos(a) * r;
        const cy = S / 2 + Math.sin(a) * r;
        const pr = S * (0.05 + rng() * 0.03);
        for (let p = 0; p < 5; p++) {
          const pa = (p / 5) * Math.PI * 2 + a;
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.ellipse(cx + Math.cos(pa) * pr * 0.7, cy + Math.sin(pa) * pr * 0.7, pr * 0.62, pr * 0.42, pa, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = '#d8d8d8';
        g.beginPath();
        g.arc(cx, cy, pr * 0.25, 0, Math.PI * 2);
        g.fill();
      }
    }
  } else if (style === 'needle') {
    for (let i = 0; i < 60; i++) {
      const a = Math.PI / 2 + (rng() - 0.5) * 2.6;
      const x = S / 2 + (rng() - 0.5) * S * 0.5;
      const y = S * 0.3 + rng() * S * 0.3;
      leaf(x, y, a, S * (0.2 + rng() * 0.15), S * 0.022, 0.6 + rng() * 0.4);
    }
  } else {
    // hanging willow strands
    for (let i = 0; i < 6; i++) {
      const x = S * (0.14 + (i / 5) * 0.72) + (rng() - 0.5) * 10;
      let y = S * 0.02 + rng() * 10;
      const end = S * (0.7 + rng() * 0.28);
      while (y < end) {
        const side = rng() < 0.5 ? -1 : 1;
        leaf(x + Math.sin(y * 0.05) * 4, y, Math.PI / 2 + side * 0.5, S * 0.075, S * 0.016, 0.55 + rng() * 0.45);
        y += 7 + rng() * 6;
      }
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// --------------------------------------------------------------- geometry
function tube(points: THREE.Vector3[], radii: number[], sides: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const t = new THREE.Vector3();
  const n = new THREE.Vector3();
  const b = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const xa = new THREE.Vector3(1, 0, 0);
  const prevN = new THREE.Vector3();
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)];
    const c = points[Math.min(points.length - 1, i + 1)];
    t.subVectors(c, a).normalize();
    if (i === 0) n.crossVectors(t, Math.abs(t.y) > 0.95 ? xa : up).normalize();
    else n.copy(prevN).addScaledVector(t, -prevN.dot(t)).normalize();
    prevN.copy(n);
    b.crossVectors(t, n);
    for (let s = 0; s <= sides; s++) {
      const ang = (s / sides) * Math.PI * 2;
      const cx = Math.cos(ang);
      const sy = Math.sin(ang);
      const nx = n.x * cx + b.x * sy;
      const ny = n.y * cx + b.y * sy;
      const nz = n.z * cx + b.z * sy;
      pos.push(points[i].x + nx * radii[i], points[i].y + ny * radii[i], points[i].z + nz * radii[i]);
      nor.push(nx, ny, nz);
      uv.push(s / sides, i / (points.length - 1));
    }
  }
  const ring = sides + 1;
  for (let i = 0; i < points.length - 1; i++) {
    for (let s = 0; s < sides; s++) {
      const a = i * ring + s;
      idx.push(a, a + 1, a + ring, a + 1, a + ring + 1, a + ring);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

interface Blob {
  c: THREE.Vector3;
  r: THREE.Vector3;
  cards: number;
  order: number;
  group: number;
}

/** Cards share their centre position; the vertex shader expands them toward the camera. */
function foliageGeometry(blobs: Blob[], rng: Rng, treeTop: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const corner: number[] = [];
  const data: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const d = new THREE.Vector3();
  for (const bl of blobs) {
    for (let i = 0; i < bl.cards; i++) {
      const y = 1 - ((i + 0.5) / bl.cards) * 1.75; // skip the very underside
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const th = i * 2.39996 + rng() * 0.6;
      const shell = 0.72 + rng() * 0.3;
      d.set(Math.cos(th) * rad, y, Math.sin(th) * rad);
      const px = bl.c.x + d.x * bl.r.x * shell;
      const py = bl.c.y + d.y * bl.r.y * shell;
      const pz = bl.c.z + d.z * bl.r.z * shell;
      // Normal: mostly outward from the blob, pulled a little toward "up".
      const nx = d.x;
      const ny = d.y * 0.8 + 0.45;
      const nz = d.z;
      const nl = Math.hypot(nx, ny, nz) || 1;
      const ao = lerp(0.2, 1, Math.pow(Math.min(1, Math.max(0, (d.y + 1) * 0.5 * 0.7 + (py / treeTop) * 0.2 + (shell - 0.72) * 0.6)), 1.3));
      const base = pos.length / 3;
      const rnd = rng();
      const size = 0.8 + rng() * 0.5;
      for (let k = 0; k < 4; k++) {
        pos.push(px, py, pz);
        nor.push(nx / nl, ny / nl, nz / nl);
        const cx = k % 2 === 0 ? -1 : 1;
        const cy = k < 2 ? -1 : 1;
        corner.push(cx, cy, size);
        uv.push(cx * 0.5 + 0.5, cy * 0.5 + 0.5);
        data.push(rnd, ao, bl.order, bl.group);
      }
      idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aCorner', new THREE.Float32BufferAttribute(corner, 3));
  g.setAttribute('aData', new THREE.Float32BufferAttribute(data, 4));
  g.setIndex(idx);
  g.computeBoundingSphere();
  if (g.boundingSphere) g.boundingSphere.radius += 3;
  return g;
}

interface TreeSpec {
  seed: number;
  trunkH: number;
  trunkR: number;
  lean: number;
  gnarl: number;
  branches: number;
  branchLen: number;
  branchAngle: number;
  branchStart: number;
  levels: number;
  droop: number;
  blob: [number, number, number];
  cards: number;
  hang?: number; // willow: canopy hangs below the branch tip
  conifer?: boolean;
  groups?: number;
}

interface TreeGeo {
  trunk: THREE.BufferGeometry;
  foliage: THREE.BufferGeometry;
  height: number;
  tips: THREE.Vector3[];
}

function buildTree(spec: TreeSpec): TreeGeo {
  const rng = mulberry32(spec.seed);
  const tubes: THREE.BufferGeometry[] = [];
  const blobs: Blob[] = [];
  const tips: THREE.Vector3[] = [];
  let top = 1;
  const tmp = new THREE.Vector3();
  const perp = new THREE.Vector3();

  const grow = (p0: THREE.Vector3, dir: THREE.Vector3, len: number, r0: number, level: number, order: number) => {
    const segs = level === 0 ? 7 : 5;
    const pts = [p0.clone()];
    const radii = [level === 0 ? r0 * 1.55 : r0];
    const d = dir.clone();
    const last = level === spec.levels;
    for (let i = 1; i <= segs; i++) {
      d.x += (rng() - 0.5) * spec.gnarl;
      d.z += (rng() - 0.5) * spec.gnarl;
      d.y += level === 0 ? 0.04 : (rng() - 0.5) * spec.gnarl * 0.6 - spec.droop * (i / segs);
      d.normalize();
      pts.push(pts[i - 1].clone().addScaledVector(d, len / segs));
      const k = i / segs;
      radii.push(r0 * (1 - k * (last ? 0.86 : 0.5)) * (level === 0 && i === 1 ? 1.12 : 1));
    }
    tubes.push(tube(pts, radii, level === 0 ? 9 : level === 1 ? 6 : 5));
    const tip = pts[segs];
    top = Math.max(top, tip.y);
    if (!spec.conifer) {
      const s = level === 0 ? 1.15 : 1 - (level - 1) * 0.12;
      const jitter = 0.85 + rng() * 0.3;
      const c = tip.clone();
      if (spec.hang) c.y -= spec.blob[1] * spec.hang;
      if (last || level === 0) {
        tips.push(tip.clone());
        blobs.push({
          c,
          r: new THREE.Vector3(spec.blob[0] * s * jitter, spec.blob[1] * s * jitter, spec.blob[2] * s * jitter),
          cards: Math.round(spec.cards * s),
          order: Math.min(1, order + 0.15 + rng() * 0.2),
          group: spec.groups ? Math.floor((((Math.atan2(c.z, c.x) / (Math.PI * 2) + 1.5) % 1) * spec.groups)) : 0,
        });
      }
    }
    if (level < spec.levels) {
      const n = level === 0 ? spec.branches : 2 + Math.floor(rng() * 2);
      const phase = rng() * Math.PI * 2;
      for (let k = 0; k < n; k++) {
        const tpos = level === 0 ? lerp(spec.branchStart, 0.98, (k + rng() * 0.6) / n) : lerp(0.45, 0.95, (k + rng()) / n);
        const fi = tpos * segs;
        const i0 = Math.min(segs - 1, Math.floor(fi));
        const pt = pts[i0].clone().lerp(pts[i0 + 1], fi - i0);
        const rr = lerp(radii[i0], radii[i0 + 1], fi - i0);
        const az = phase + k * 2.39996 + (rng() - 0.5) * 0.5;
        tmp.subVectors(pts[i0 + 1], pts[i0]).normalize();
        perp.set(Math.cos(az), 0, Math.sin(az));
        perp.addScaledVector(tmp, -perp.dot(tmp)).normalize();
        const ang = spec.branchAngle * (0.8 + rng() * 0.4);
        const nd = tmp.clone().multiplyScalar(Math.cos(ang)).addScaledVector(perp, Math.sin(ang)).normalize();
        grow(pt, nd, len * spec.branchLen * (0.75 + rng() * 0.5), rr * 0.62, level + 1, order + 0.3);
      }
    }
  };

  const d0 = new THREE.Vector3((rng() - 0.5) * spec.lean, 1, (rng() - 0.5) * spec.lean).normalize();
  grow(new THREE.Vector3(0, -0.4, 0), d0, spec.trunkH, spec.trunkR, 0, 0);

  if (spec.conifer) {
    const tiers = 6;
    for (let i = 0; i < tiers; i++) {
      const k = i / (tiers - 1);
      const y = lerp(spec.trunkH * 0.28, spec.trunkH * 1.02, k);
      const r = lerp(spec.blob[0], spec.blob[0] * 0.22, k);
      blobs.push({
        c: new THREE.Vector3(d0.x * y, y, d0.z * y),
        r: new THREE.Vector3(r, spec.blob[1], r),
        cards: Math.round(lerp(spec.cards, spec.cards * 0.4, k)),
        order: k,
        group: 0,
      });
    }
    top = spec.trunkH * 1.15;
  }
  const trunk = mergeGeometries(tubes)!;
  trunk.computeBoundingSphere();
  return { trunk, foliage: foliageGeometry(blobs, rng, top), height: top, tips };
}

// -------------------------------------------------------------- materials
const GROW_GLSL = /* glsl */ `
vec3 growScale(float g) {
  float s = smoothstep(0., 0.72, g);
  return vec3(pow(s, 1.7), pow(s, 0.8), pow(s, 1.7));
}`;

interface FoliageUniforms {
  uGrow: { value: number };
  uGlow: { value: number };
  uLeafA: { value: THREE.Color };
  uLeafB: { value: THREE.Color };
  uTintAmt: { value: number };
  uCard: { value: number };
  uForceVit: { value: number };
  uSway: { value: number };
  uGroupGrow: { value: number[] };
  uMoodCol: { value: THREE.Color[] };
  [k: string]: THREE.IUniform;
}

function foliageUniforms(a: number, b: number, card: number, tint = 0.3): FoliageUniforms {
  return {
    uGrow: { value: 1 },
    uGlow: { value: 0 },
    uLeafA: { value: new THREE.Color(a) },
    uLeafB: { value: new THREE.Color(b) },
    uTintAmt: { value: tint },
    uCard: { value: card },
    uForceVit: { value: 0 },
    uSway: { value: 1 },
    uGroupGrow: { value: [1, 1, 1, 1, 1, 1] },
    uMoodCol: { value: MOODS.map((m) => new THREE.Color(m.color)) },
  };
}

function foliageVertex(heart: boolean, depth: boolean) {
  const pars = /* glsl */ `
    attribute vec3 aCorner; attribute vec4 aData;
    uniform float uGrow, uGlow, uTintAmt, uCard, uForceVit, uSway;
    uniform vec3 uLeafA, uLeafB;
    uniform float uGroupGrow[6];
    uniform vec3 uMoodCol[6];
    varying vec3 vCol; varying vec3 vWP; varying float vGlowAmt;
    float fSize;
    ${COMMON_GLSL}
    ${GROW_GLSL}
  `;
  const begin = /* glsl */ `
    vec3 transformed = position;
    #ifdef USE_INSTANCING
      mat4 fim = modelMatrix * instanceMatrix;
    #else
      mat4 fim = modelMatrix;
    #endif
    vec3 fOrigin = fim[3].xyz;
    float fScale = length(fim[0].xyz);
    vec3 fTint;
    float fVit = max(vitality(fOrigin.xz, fTint), uForceVit);
    ${heart
      ? `int gi = int(aData.w + 0.5);
         float gg = uGroupGrow[gi];
         float fG = smoothstep(aData.z * 0.5, aData.z * 0.5 + 0.5, gg);
         vec3 moodC = uMoodCol[gi];`
      : `float fG = smoothstep(aData.z * 0.55 + 0.12, aData.z * 0.55 + 0.5, uGrow);
         transformed *= growScale(uGrow);`}
    vec3 fW = (fim * vec4(transformed, 1.0)).xyz;
    float fWind = windAt(fW.xz * 0.6 + fW.y * 0.3);
    float hgt = max(position.y, 0.) * 0.07;
    transformed.xz += vec2(0.85, 0.5) * fWind * hgt * uSway / max(fScale, 0.01);
    transformed.y += sin(uTime * 1.3 + aData.x * 30.) * 0.03 * uSway * uWind;
    float keep = step(aData.x, 0.28 + 0.72 * fVit);
    fSize = uCard * aCorner.z * mix(0.6, 1.0, fVit) * fG * keep * fScale;
    ${depth
      ? ''
      : `vWP = fW;
         vec3 lush = mix(uLeafA, uLeafB, aData.y);
         ${heart
           ? `lush = mix(moodC * 0.35, moodC * 1.1 + 0.08, aData.y);`
           : `lush = mix(lush, lush * (0.35 + s2l(fTint) * 2.2), uTintAmt * (1. - uForceVit));`}
         lush *= 0.82 + 0.36 * hash12(fOrigin.xz + aData.x);
         vec3 dry = mix(s2l(vec3(0.32, 0.30, 0.30)), s2l(vec3(0.58, 0.55, 0.50)), aData.y);
         vCol = mix(dry, lush, fVit);
         vGlowAmt = uGlow * (0.4 + 0.6 * aData.y) * fG;`}
  `;
  const project = /* glsl */ `
    vec4 mvPosition = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      mvPosition = instanceMatrix * mvPosition;
    #endif
    mvPosition = modelViewMatrix * mvPosition;
    float fl = aData.x * 6.2831 + sin(uTime * 2.1 + aData.x * 50.) * 0.14 * uWind;
    vec2 cr = mat2(cos(fl), -sin(fl), sin(fl), cos(fl)) * aCorner.xy;
    // Leaves right in front of the lens melt away instead of filling the screen.
    float fNear = smoothstep(1.0, 4.5, -mvPosition.z);
    ${depth
      ? ''
      : `// Part the canopy when it hangs between the camera and the keeper.
         vec3 pv = (viewMatrix * vec4(uPlayerPos + vec3(0., 1., 0.), 1.)).xyz;
         float between = step(mvPosition.z, 0.) * step(pv.z + 0.6, mvPosition.z);
         float off = length(mvPosition.xy - pv.xy * (mvPosition.z / min(pv.z, -0.01)));
         fNear *= mix(1., smoothstep(0.7, 2.6, off), between);`}
    mvPosition.xy += cr * fSize * fNear;
    gl_Position = projectionMatrix * mvPosition;
  `;
  return { pars, begin, project };
}

function foliageMaterial(tex: THREE.Texture, uniforms: FoliageUniforms, heart = false, strand = false) {
  const key = `foliage-${heart ? 'h' : 'n'}-${strand ? 's' : 'c'}`;
  const v = foliageVertex(heart, false);
  // Willow strands keep their texture upright instead of spinning per card.
  const project = strand ? v.project.replace('float fl = aData.x * 6.2831 +', 'float fl = ') : v.project;
  const mat = patchMaterial(
    new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.42, side: THREE.DoubleSide }),
    key,
    (s) => {
      s.vertexShader = replace(s.vertexShader, '#include <common>', `#include <common>\n${v.pars}`);
      s.vertexShader = replace(s.vertexShader, '#include <begin_vertex>', v.begin);
      s.vertexShader = replace(s.vertexShader, '#include <project_vertex>', project);
      s.fragmentShader = replace(
        s.fragmentShader,
        '#include <common>',
        `#include <common>\nvarying vec3 vCol; varying vec3 vWP; varying float vGlowAmt;\n${COMMON_GLSL}`,
      );
      s.fragmentShader = replace(s.fragmentShader, '#include <normal_fragment_begin>', FLAT_NORMAL);
      s.fragmentShader = replace(s.fragmentShader, '#include <color_fragment>', 'diffuseColor.rgb *= vCol;');
      s.fragmentShader = replace(
        s.fragmentShader,
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         totalEmissiveRadiance += diffuseColor.rgb * vGlowAmt * (0.25 + 1.5 * uNight);
         totalEmissiveRadiance += uWaveColor * waveGlow(vWP) * 0.7;`,
      );
      s.fragmentShader = replace(
        s.fragmentShader,
        '#include <opaque_fragment>',
        `vec3 Vw = normalize(cameraPosition - vWP);
         outgoingLight += diffuseColor.rgb * uSunColor * pow(max(dot(Vw, -uSunDir), 0.), 2.5) * 1.1;
         #include <opaque_fragment>`,
      );
    },
    uniforms,
  );
  const dv = foliageVertex(heart, true);
  const dproject = strand ? dv.project.replace('float fl = aData.x * 6.2831 +', 'float fl = ') : dv.project;
  const depth = patchMaterial(
    new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.42 }),
    key + '-depth',
    (s) => {
      s.vertexShader = replace(s.vertexShader, '#include <common>', `#include <common>\n${dv.pars}`);
      s.vertexShader = replace(s.vertexShader, '#include <begin_vertex>', dv.begin);
      s.vertexShader = replace(s.vertexShader, '#include <project_vertex>', dproject);
    },
    uniforms,
  );
  return { mat, depth };
}

function barkMaterial(color: number, uniforms: { uGrow: { value: number }; uLife?: { value: number } }) {
  return patchMaterial(
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 }),
    'bark',
    (s) => {
      s.vertexShader = replace(
        s.vertexShader,
        '#include <common>',
        `#include <common>\nuniform float uGrow;\nvarying vec2 vBUv;\nvarying vec3 vBW;\n${GROW_GLSL}`,
      );
      s.vertexShader = replace(
        s.vertexShader,
        '#include <begin_vertex>',
        `vec3 transformed = position * growScale(uGrow);\nvBUv = uv;
         #ifdef USE_INSTANCING
           vBW = (modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
         #else
           vBW = (modelMatrix * vec4(0., 0., 0., 1.)).xyz;
         #endif`,
      );
      s.fragmentShader = replace(
        s.fragmentShader,
        '#include <common>',
        `#include <common>\nvarying vec2 vBUv;\nvarying vec3 vBW;\nuniform float uLife;\n${COMMON_GLSL}`,
      );
      s.fragmentShader = replace(
        s.fragmentShader,
        '#include <color_fragment>',
        `float bk = vnoise(vec2(vBUv.x * 14., vBUv.y * 5.)) * 0.6 + vnoise(vec2(vBUv.x * 40., vBUv.y * 18.)) * 0.4;
         vec3 bt; float bv = max(vitality(vBW.xz, bt), uLife);
         vec3 dead = mix(vec3(dot(diffuseColor.rgb, vec3(0.33))), s2l(vec3(0.62, 0.6, 0.58)), 0.75);
         diffuseColor.rgb = mix(dead, diffuseColor.rgb * 1.6, bv) * (0.6 + 0.8 * bk);`,
      );
    },
    { uGrow: uniforms.uGrow, uLife: uniforms.uLife ?? { value: 0 } },
  );
}

const GLOW_VERT = /* glsl */ `
attribute float aSeed;
uniform float uTime, uSize, uShow, uPx;
varying float vA;
void main() {
  vec3 p = position;
  p.y += sin(uTime * 0.8 + aSeed * 40.) * 0.18;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float tw = 0.65 + 0.35 * sin(uTime * (1.2 + aSeed * 2.) + aSeed * 70.);
  vA = tw * uShow;
  gl_PointSize = uSize * uPx * (0.6 + aSeed * 0.8) * uShow / max(-mv.z, 0.1);
  gl_Position = projectionMatrix * mv;
}`;
const GLOW_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uBoost;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.;
  float a = pow(max(1. - d, 0.), 2.2);
  float core = smoothstep(0.35, 0.0, d);
  gl_FragColor = vec4(uColor * (a * 0.9 + core * 2.2) * vA * uBoost, 1.);
}`;

/** Soft additive light points (tree lanterns, shrine sparks). */
export function glowPoints(points: THREE.Vector3[], color: number, size: number) {
  const g = new THREE.BufferGeometry().setFromPoints(points);
  const seeds = new Float32Array(points.length);
  for (let i = 0; i < seeds.length; i++) seeds[i] = (i * 0.618034) % 1;
  g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    uniforms: {
      uTime: G.uTime,
      uSize: { value: size },
      uShow: { value: 1 },
      uPx: PIXEL_SCALE,
      uColor: { value: new THREE.Color(color) },
      uBoost: { value: 1 },
    },
  });
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  return p;
}
/** Viewport height in px / (2 tan(fov/2)) – keeps point sprites world-sized. */
export const PIXEL_SCALE = { value: 800 };

// ----------------------------------------------------------- hero trees
const MOOD_TREE: Record<MoodId, { spec: TreeSpec; a: number; b: number; bark: number; card: number; tex: 'leaf' | 'blossom' | 'strand'; scale: number; sway: number }> = {
  joy: {
    spec: { seed: 11, trunkH: 6.5, trunkR: 0.62, lean: 0.12, gnarl: 0.2, branches: 7, branchLen: 0.6, branchAngle: 1.05, branchStart: 0.45, levels: 2, droop: -0.05, blob: [2.9, 2.1, 2.9], cards: 40 },
    a: 0xd9861a, b: 0xffe04a, bark: 0x6a4a2c, card: 1.25, tex: 'leaf', scale: 1.25, sway: 1,
  },
  calm: {
    spec: { seed: 22, trunkH: 9.5, trunkR: 0.5, lean: 0.3, gnarl: 0.12, branches: 6, branchLen: 0.62, branchAngle: 1.25, branchStart: 0.5, levels: 2, droop: -0.02, blob: [3.2, 0.95, 3.2], cards: 34 },
    a: 0x157f86, b: 0x7ff0df, bark: 0x55534c, card: 1.15, tex: 'leaf', scale: 1.2, sway: 0.7,
  },
  love: {
    spec: { seed: 33, trunkH: 4.4, trunkR: 0.68, lean: 0.45, gnarl: 0.34, branches: 6, branchLen: 0.9, branchAngle: 1.05, branchStart: 0.5, levels: 2, droop: 0.02, blob: [2.6, 1.7, 2.6], cards: 36 },
    a: 0xe2488a, b: 0xffd3e4, bark: 0x4a332c, card: 1.2, tex: 'blossom', scale: 1.3, sway: 1,
  },
  hope: {
    spec: { seed: 44, trunkH: 14, trunkR: 0.42, lean: 0.06, gnarl: 0.08, branches: 11, branchLen: 0.24, branchAngle: 0.85, branchStart: 0.3, levels: 1, droop: -0.12, blob: [1.7, 1.5, 1.7], cards: 30 },
    a: 0x4ea52a, b: 0xdcff7a, bark: 0xd9d6cc, card: 1.0, tex: 'leaf', scale: 1.25, sway: 1.3,
  },
  courage: {
    spec: { seed: 55, trunkH: 5.2, trunkR: 1.15, lean: 0.25, gnarl: 0.4, branches: 6, branchLen: 0.95, branchAngle: 1.2, branchStart: 0.5, levels: 2, droop: 0.0, blob: [2.9, 2.0, 2.9], cards: 40 },
    a: 0xb3301a, b: 0xffa23a, bark: 0x3d2c25, card: 1.35, tex: 'leaf', scale: 1.3, sway: 0.8,
  },
  sorrow: {
    spec: { seed: 66, trunkH: 6.5, trunkR: 0.66, lean: 0.35, gnarl: 0.22, branches: 7, branchLen: 0.85, branchAngle: 1.2, branchStart: 0.55, levels: 2, droop: 0.2, blob: [1.5, 2.5, 1.5], cards: 15, hang: 0.62 },
    a: 0x2f3f9c, b: 0x9db4f0, bark: 0x3c3a44, card: 1.7, tex: 'strand', scale: 1.25, sway: 2.2,
  },
};

export class MoodTree {
  readonly group = new THREE.Group();
  readonly height: number;
  private grow = { value: 0 };
  private fol: FoliageUniforms;
  private lights: THREE.Points;
  readonly mood: MoodId;
  constructor(mood: MoodId, tex: Record<string, THREE.Texture>) {
    this.mood = mood;
    const def = MOOD_TREE[mood];
    const m = MOOD_BY_ID[mood];
    const geo = buildTree(def.spec);
    this.height = geo.height * def.scale;
    this.fol = foliageUniforms(def.a, def.b, def.card, 0);
    this.fol.uGrow = this.grow;
    this.fol.uForceVit.value = 1;
    this.fol.uSway.value = def.sway;
    const { mat, depth } = foliageMaterial(tex[def.tex], this.fol, false, def.tex === 'strand');
    const trunk = new THREE.Mesh(geo.trunk, barkMaterial(def.bark, { uGrow: this.grow, uLife: { value: 1 } }));
    trunk.castShadow = trunk.receiveShadow = true;
    const leaves = new THREE.Mesh(geo.foliage, mat);
    leaves.customDepthMaterial = depth;
    leaves.castShadow = leaves.receiveShadow = true;
    const rng = mulberry32(def.spec.seed * 7);
    const lp: THREE.Vector3[] = [];
    for (const t of geo.tips) {
      for (let i = 0; i < 2; i++) {
        lp.push(new THREE.Vector3(t.x + (rng() - 0.5) * 3, t.y - 0.6 - rng() * 2.2, t.z + (rng() - 0.5) * 3));
      }
    }
    this.lights = glowPoints(lp, m.soft, 1.1);
    this.group.add(trunk, leaves, this.lights);
    this.group.scale.setScalar(def.scale);
    for (const o of [trunk, leaves]) o.frustumCulled = false;
    this.setGrow(0);
  }
  setGrow(g: number) {
    this.grow.value = g;
    this.group.visible = g > 0.001;
    (this.lights.material as THREE.ShaderMaterial).uniforms.uShow.value = Math.max(0, (g - 0.8) * 5);
  }
  /** Night makes the canopy and its lanterns glow. */
  setNight(n: number) {
    this.fol.uGlow.value = 0.35;
    (this.lights.material as THREE.ShaderMaterial).uniforms.uBoost.value = 0.35 + n * 1.4;
  }
}

export class HeartTree {
  readonly group = new THREE.Group();
  readonly height: number;
  private fol: FoliageUniforms;
  private life = { value: 0 };
  private lights: THREE.Points;
  private target = [0, 0, 0, 0, 0, 0];
  constructor(tex: Record<string, THREE.Texture>) {
    const spec: TreeSpec = {
      seed: 7, trunkH: 10, trunkR: 1.7, lean: 0.14, gnarl: 0.3, branches: 9, branchLen: 0.92, branchAngle: 1.12,
      branchStart: 0.42, levels: 2, droop: -0.02, blob: [3.6, 2.5, 3.6], cards: 46, groups: 6,
    };
    const geo = buildTree(spec);
    const scale = 1.45;
    this.height = geo.height * scale;
    this.fol = foliageUniforms(0xffffff, 0xffffff, 1.5, 0);
    this.fol.uForceVit.value = 1;
    this.fol.uGroupGrow.value = [0, 0, 0, 0, 0, 0];
    this.fol.uGlow.value = 0.5;
    const { mat, depth } = foliageMaterial(tex.blossom, this.fol, true);
    const trunk = new THREE.Mesh(geo.trunk, barkMaterial(0x6b5340, { uGrow: { value: 1 }, uLife: this.life }));
    trunk.castShadow = trunk.receiveShadow = true;
    const leaves = new THREE.Mesh(geo.foliage, mat);
    leaves.customDepthMaterial = depth;
    leaves.castShadow = leaves.receiveShadow = true;
    leaves.frustumCulled = false;
    const rng = mulberry32(99);
    const lp: THREE.Vector3[] = [];
    for (const t of geo.tips) {
      for (let i = 0; i < 2; i++) lp.push(new THREE.Vector3(t.x + (rng() - 0.5) * 4, t.y - 1 - rng() * 3, t.z + (rng() - 0.5) * 4));
    }
    this.lights = glowPoints(lp, 0xfff1c9, 1.3);
    this.group.add(trunk, leaves, this.lights);
    this.group.scale.setScalar(scale);
    this.setAwake([], true);
  }
  setAwake(ids: MoodId[], instant = false) {
    MOODS.forEach((m, i) => {
      this.target[i] = ids.includes(m.id) ? 1 : 0;
      if (instant) this.fol.uGroupGrow.value[i] = this.target[i];
    });
  }
  update(dt: number, night: number) {
    let sum = 0;
    const gg = this.fol.uGroupGrow.value;
    for (let i = 0; i < 6; i++) {
      gg[i] += (this.target[i] - gg[i]) * Math.min(1, dt * 0.45);
      sum += gg[i];
    }
    this.life.value = sum / 6;
    const lm = this.lights.material as THREE.ShaderMaterial;
    lm.uniforms.uShow.value = sum / 6;
    lm.uniforms.uBoost.value = 0.3 + night * 1.5;
  }
}

// ------------------------------------------------------------- the forest
export class Flora {
  readonly group = new THREE.Group();
  readonly colliders: Collider[] = [];
  readonly textures: Record<string, THREE.Texture>;
  /** Tree base positions, used to perch birds and scatter motes away from trunks. */
  readonly treeSpots: THREE.Vector3[] = [];

  private terrain: Terrain;
  constructor(terrain: Terrain) {
    this.terrain = terrain;
    this.textures = {
      leaf: leafTexture('leaf', 1),
      blossom: leafTexture('blossom', 2),
      needle: leafTexture('needle', 3),
      strand: leafTexture('strand', 4),
    };
    this.buildForest();
    this.buildRocks();
  }

  private clearOfSites(x: number, z: number, r: number) {
    for (const m of MOODS) if (Math.hypot(x - m.pos[0], z - m.pos[1]) < r) return false;
    if (Math.hypot(x - HEART_POS[0], z - HEART_POS[1]) < r + 10) return false;
    if (Math.hypot(x - this.terrain.start.x, z - this.terrain.start.z) < 9) return false;
    return true;
  }
  private clearOfPath(x: number, z: number, r: number) {
    const t = this.terrain;
    return t.pathAt(x, z) < 0.05 && t.pathAt(x + r, z) < 0.05 && t.pathAt(x - r, z) < 0.05 && t.pathAt(x, z + r) < 0.05 && t.pathAt(x, z - r) < 0.05;
  }

  private buildForest() {
    const t = this.terrain;
    const rng = mulberry32(4242);
    const noise = new Noise2D(77);
    const love = MOOD_BY_ID.love.pos;
    const joy = MOOD_BY_ID.joy.pos;
    const courage = MOOD_BY_ID.courage.pos;
    const sorrow = MOOD_BY_ID.sorrow.pos;

    type Kind = { geos: TreeGeo[]; list: THREE.Matrix4[][]; tex: string; a: number; b: number; bark: number; card: number; tint: number };
    const mk = (specs: TreeSpec[], tex: string, a: number, b: number, bark: number, card: number, tint: number): Kind => ({
      geos: specs.map(buildTree),
      list: specs.map(() => []),
      tex, a, b, bark, card, tint,
    });
    const broad = (seed: number, h: number, br: number): TreeSpec => ({
      seed, trunkH: h, trunkR: 0.3, lean: 0.25, gnarl: 0.22, branches: br, branchLen: 0.6, branchAngle: 1.0,
      branchStart: 0.5, levels: 1, droop: 0.0, blob: [1.75, 1.35, 1.75], cards: 24,
    });
    const kinds = {
      broad: mk([broad(1, 4.6, 5), broad(2, 5.6, 6), broad(3, 3.8, 4)], 'leaf', 0x1f5a1c, 0x86b93a, 0x5a4330, 1.05, 0.32),
      blossom: mk([broad(4, 4.2, 5), broad(5, 5.0, 6)], 'blossom', 0xc24f86, 0xffd9e8, 0x4d3830, 1.05, 0.12),
      willow: mk(
        [{ seed: 6, trunkH: 4.6, trunkR: 0.34, lean: 0.4, gnarl: 0.22, branches: 6, branchLen: 0.8, branchAngle: 1.15, branchStart: 0.55, levels: 1, droop: 0.2, blob: [1.2, 2.6, 1.2], cards: 16, hang: 0.7 }],
        'strand', 0x2f5f6e, 0x9fd0c8, 0x47443f, 1.9, 0.4,
      ),
      conifer: mk(
        [
          { seed: 7, trunkH: 9.5, trunkR: 0.26, lean: 0.06, gnarl: 0.03, branches: 0, branchLen: 0, branchAngle: 0, branchStart: 0, levels: 0, droop: 0, blob: [2.3, 0.75, 2.3], cards: 30, conifer: true },
          { seed: 8, trunkH: 7.2, trunkR: 0.22, lean: 0.1, gnarl: 0.03, branches: 0, branchLen: 0, branchAngle: 0, branchStart: 0, levels: 0, droop: 0, blob: [1.9, 0.7, 1.9], cards: 26, conifer: true },
        ],
        'needle', 0x10392c, 0x4f8a52, 0x3e3029, 1.15, 0.2,
      ),
    };
    const bushGeos = [0, 1].map((i) => {
      const r = mulberry32(300 + i);
      const blobs: Blob[] = [];
      for (let b = 0; b < 3; b++) {
        blobs.push({
          c: new THREE.Vector3((r() - 0.5) * 1.4, 0.45 + r() * 0.3, (r() - 0.5) * 1.4),
          r: new THREE.Vector3(0.9, 0.6, 0.9),
          cards: 13, order: 0, group: 0,
        });
      }
      return foliageGeometry(blobs, r, 1.2);
    });
    const bushes: THREE.Matrix4[][] = [[], []];

    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    const ps = new THREE.Vector3();
    const yAxis = new THREE.Vector3(0, 1, 0);
    const placed: Collider[] = [];
    let tries = 0;
    while (placed.length < 760 && tries++ < 40000) {
      const x = (rng() - 0.5) * 440;
      const z = (rng() - 0.5) * 440;
      if (t.grassAt(x, z) < 0.6) continue;
      const h = t.heightAt(x, z);
      if (h < 2.4) continue;
      if (!this.clearOfSites(x, z, 15) || !this.clearOfPath(x, z, 3)) continue;
      const dJoy = Math.hypot(x - joy[0], z - joy[1]);
      let dens = noise.fbm(x * 0.011, z * 0.011, 3) * 0.5 + 0.5;
      if (dJoy < 50) dens -= 0.3 * (1 - dJoy / 50); // the meadow stays open
      if (dens < 0.4 + rng() * 0.22) continue;
      let ok = true;
      for (const p of placed) {
        if (Math.abs(p.x - x) < 4.2 && Math.abs(p.z - z) < 4.2 && Math.hypot(p.x - x, p.z - z) < 4.2) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      const dCourage = Math.hypot(x - courage[0], z - courage[1]);
      let kind: Kind = kinds.broad;
      if (h > 16 || (dCourage < 80 && rng() < 0.8)) kind = kinds.conifer;
      else if (Math.hypot(x - love[0], z - love[1]) < 58 && rng() < 0.75) kind = kinds.blossom;
      else if (Math.hypot(x - sorrow[0], z - sorrow[1]) < 46 && rng() < 0.35) kind = kinds.willow;
      const vi = Math.floor(rng() * kind.geos.length);
      const s = 0.85 + rng() * 0.6;
      q.setFromAxisAngle(yAxis, rng() * Math.PI * 2);
      m4.compose(ps.set(x, h, z), q, sc.set(s, s * (0.9 + rng() * 0.25), s));
      kind.list[vi].push(m4.clone());
      placed.push({ x, z, r: 0.45 * s });
      this.treeSpots.push(new THREE.Vector3(x, h + kind.geos[vi].height * s, z));
    }
    this.colliders.push(...placed);

    // Bushes fill the understory.
    let n = 0;
    tries = 0;
    while (n < 420 && tries++ < 20000) {
      const x = (rng() - 0.5) * 440;
      const z = (rng() - 0.5) * 440;
      if (t.grassAt(x, z) < 0.7 || !this.clearOfSites(x, z, 9) || !this.clearOfPath(x, z, 2)) continue;
      if (noise.fbm(x * 0.02 + 9, z * 0.02, 2) < -0.05) continue;
      const s = 0.8 + rng() * 0.9;
      q.setFromAxisAngle(yAxis, rng() * Math.PI * 2);
      m4.compose(ps.set(x, t.heightAt(x, z) - 0.1, z), q, sc.set(s, s, s));
      bushes[n % 2].push(m4.clone());
      n++;
    }

    const instance = (geo: THREE.BufferGeometry, mat: THREE.Material, list: THREE.Matrix4[], depth?: THREE.Material) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      if (depth) mesh.customDepthMaterial = depth;
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
    };
    const one = { value: 1 };
    for (const kind of Object.values(kinds)) {
      const fu = foliageUniforms(kind.a, kind.b, kind.card, kind.tint);
      if (kind.tex === 'strand') fu.uSway.value = 2;
      const { mat, depth } = foliageMaterial(this.textures[kind.tex], fu, false, kind.tex === 'strand');
      const bark = barkMaterial(kind.bark, { uGrow: one });
      kind.geos.forEach((g, i) => {
        instance(g.trunk, bark, kind.list[i]);
        instance(g.foliage, mat, kind.list[i], depth);
      });
    }
    const bu = foliageUniforms(0x24541d, 0x7cab3a, 0.8, 0.5);
    const bm = foliageMaterial(this.textures.leaf, bu);
    bushGeos.forEach((g, i) => instance(g, bm.mat, bushes[i], bm.depth));
  }

  private buildRocks() {
    const t = this.terrain;
    const rng = mulberry32(9001);
    const noise = new Noise2D(5);
    const geos = [0, 1, 2].map((v) => {
      const g = new THREE.IcosahedronGeometry(1, 2);
      const p = g.attributes.position as THREE.BufferAttribute;
      const vec = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        vec.fromBufferAttribute(p, i);
        const n = noise.fbm(vec.x * 0.9 + v * 10, vec.y * 0.9 + vec.z * 1.3, 3);
        const n2 = noise.get(vec.z * 1.4 - v * 7, vec.x * 1.1 + vec.y);
        vec.multiplyScalar(1 + n * 0.32 + n2 * 0.12);
        vec.y *= 0.72;
        p.setXYZ(i, vec.x, vec.y, vec.z);
      }
      g.computeVertexNormals();
      return g;
    });
    const mat = patchMaterial(
      new THREE.MeshStandardMaterial({ color: 0x8b8782, roughness: 0.92, flatShading: true }),
      'rock',
      (s) => {
        s.vertexShader = replace(s.vertexShader, '#include <common>', `#include <common>\nvarying vec3 vRW;\nvarying float vRUp;`);
        s.vertexShader = replace(
          s.vertexShader,
          '#include <begin_vertex>',
          `#include <begin_vertex>
           #ifdef USE_INSTANCING
             vRW = (modelMatrix * instanceMatrix * vec4(position, 1.)).xyz;
             vRUp = normalize(mat3(instanceMatrix) * normal).y;
           #else
             vRW = (modelMatrix * vec4(position, 1.)).xyz;
             vRUp = normal.y;
           #endif`,
        );
        s.fragmentShader = replace(s.fragmentShader, '#include <common>', `#include <common>\nvarying vec3 vRW;\nvarying float vRUp;\n${COMMON_GLSL}`);
        s.fragmentShader = replace(
          s.fragmentShader,
          '#include <color_fragment>',
          `vec3 rt; float rv = vitality(vRW.xz, rt);
           float rn = vnoise(vRW.xz * 1.3 + vRW.y * 2.) * 0.6 + vnoise(vRW.xy * 6.) * 0.4;
           diffuseColor.rgb *= 0.6 + 0.7 * rn;
           float moss = smoothstep(0.35, 0.8, vRUp + (rn - 0.5) * 0.5);
           vec3 mossC = mix(s2l(vec3(0.42, 0.42, 0.38)), s2l(vec3(0.3, 0.46, 0.16)), rv);
           diffuseColor.rgb = mix(diffuseColor.rgb, mossC, moss * (0.35 + 0.5 * rv));`,
        );
      },
    );
    const lists: THREE.Matrix4[][] = [[], [], []];
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const sc = new THREE.Vector3();
    const ps = new THREE.Vector3();
    let n = 0;
    let tries = 0;
    while (n < 300 && tries++ < 30000) {
      const x = (rng() - 0.5) * 460;
      const z = (rng() - 0.5) * 460;
      const h = t.heightAt(x, z);
      if (h < -0.6) continue;
      const sl = t.slopeAt(x, z);
      const rocky = sl > 0.1 || h > 20 || h < 1.8;
      if (!rocky && rng() > 0.12) continue;
      if (!this.clearOfSites(x, z, 10) || !this.clearOfPath(x, z, 3)) continue;
      const big = rng() < 0.18;
      const s = big ? 2 + rng() * 2.4 : 0.45 + rng() * 1.1;
      e.set((rng() - 0.5) * 0.7, rng() * 6.28, (rng() - 0.5) * 0.7);
      q.setFromEuler(e);
      m4.compose(ps.set(x, h - s * 0.22, z), q, sc.set(s * (0.8 + rng() * 0.5), s * (0.7 + rng() * 0.6), s * (0.8 + rng() * 0.5)));
      lists[n % 3].push(m4.clone());
      if (s > 0.95) this.colliders.push({ x, z, r: s * 0.82 });
      n++;
    }
    geos.forEach((g, i) => {
      const mesh = new THREE.InstancedMesh(g, mat, lists[i].length);
      lists[i].forEach((m, k) => mesh.setMatrixAt(k, m));
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
    });
  }
}
