// The forest: photo-scanned trees drawn as multi-angle impostors, plus real
// scanned meshes (ferns, shrubs, flowers, rocks, grass) scattered around them.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MOODS, MOOD_BY_ID, type MoodDef, type MoodId } from './moods';
import type { TreeSave } from './state';
import { WORLD, heightAt } from './terrain';

const ASSETS = `${import.meta.env.BASE_URL}assets/`;

/** Lighting shared by every impostor so trees match the sky they stand under. */
export const LIGHT = {
  uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.3).normalize() },
  uSunColor: { value: new THREE.Color(1, 1, 1) },
  uSky: { value: new THREE.Color(0.5, 0.6, 0.8) },
  uGround: { value: new THREE.Color(0.2, 0.2, 0.15) },
  uFogColor: { value: new THREE.Color(0.7, 0.8, 0.9) },
  uFogDensity: { value: 0.012 },
  uTime: { value: 0 },
  uWind: { value: 1 },
  /** Lying snow, 0..1. */
  uSnow: { value: 0 },
  /** Rain-wet surfaces, 0..1. */
  uWet: { value: 0 },
  /** Season weights: spring, summer, autumn, winter. */
  uSeason: { value: new THREE.Vector4(0, 1, 0, 0) },
};

/** Per-species seasonal look, recomputed when the season changes. */
export interface SpeciesSeason {
  cover: number;
  autumn: number;
  bloom: number;
}

const IMPOSTOR_VERT = /* glsl */ `
attribute vec4 iPosH;   // xyz = base position, w = current height (m)
attribute vec3 iRot;    // x = yaw offset, y = random seed, z = impostor opacity (fades out up close)
uniform float uAspect, uTime, uWind;
varying vec2 vUv0, vUv1;
varying float vBlend, vSeed, vFade, vH;
varying vec3 vRight, vToCam, vWorld;
vec2 cell(float i, vec2 c) {
  float col = mod(i, 4.);
  float row = floor(i / 4.);
  return vec2((col + c.x) / 4., 1. - (row + 1. - c.y) / 2.);
}
void main() {
  vec3 base = iPosH.xyz;
  float H = iPosH.w;
  float W = H * uAspect;
  vec3 toCam = cameraPosition - base;
  toCam.y = 0.;
  toCam = normalize(toCam + vec3(0., 0., 1e-5));
  vec3 right = vec3(toCam.z, 0., -toCam.x);
  float f = mod((atan(toCam.x, toCam.z) - iRot.x) / 6.2831853 * 8., 8.);
  float i0 = floor(f);
  vBlend = f - i0;
  vec2 c = vec2(position.x + .5, position.y);
  vUv0 = cell(i0, c);
  vUv1 = cell(mod(i0 + 1., 8.), c);
  float sway = (sin(uTime * .9 + iRot.y * 20.) * .012 + sin(uTime * 2.3 + iRot.y * 7.) * .005) * uWind;
  vec3 wp = base + right * (position.x * W + sway * H * position.y * position.y) + vec3(0., position.y * H, 0.);
  vRight = right;
  vToCam = toCam;
  vWorld = wp;
  vSeed = iRot.y;
  vFade = iRot.z;
  vH = position.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.);
}`;

const IMPOSTOR_FRAG = /* glsl */ `
uniform sampler2D uAlbedo, uNormal;
uniform vec3 uSunDir, uSunColor, uSky, uGround, uFogColor;
uniform float uFogDensity, uTime, uWind, uCover, uAutumn, uBloom, uSnow, uWet, uCanopyBase;
uniform vec3 uAutumnCol, uBloomCol;
varying vec2 vUv0, vUv1;
varying float vBlend, vSeed, vFade, vH;
varying vec3 vRight, vToCam, vWorld;
float hsh(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y);
}
/** Screen-door dither so LODs can cross-fade without sorting. */
float bayer(vec2 p) {
  vec2 q = mod(floor(p), 4.);
  return (mod(q.x * 2. + q.y * 3. + q.x * q.y, 7.) + hsh(q) * .99) / 8.;
}
void main() {
  if (vFade < .999 && vFade <= bayer(gl_FragCoord.xy)) discard;
  // A slow shimmer in the lookup makes leaves appear to stir.
  vec2 stir = vec2(sin(uTime * 1.7 + vWorld.y * 3.1 + vWorld.x), cos(uTime * 1.3 + vWorld.y * 2.3)) * .0007 * uWind;
  vec4 a0 = texture2D(uAlbedo, vUv0 + stir);
  vec4 a1 = texture2D(uAlbedo, vUv1 + stir);
  float w = smoothstep(.25, .75, vBlend);
  vec4 al = mix(a0, a1, w);
  float alpha = smoothstep(.3, .62, al.a);
  // Leaf pixels are the green ones; bark is grey-brown.
  float leafy = smoothstep(-.002, .014, al.g - max(al.r, al.b)) * step(uCanopyBase * .6, vH);
  // Deciduous trees thin out through autumn and stand bare in winter.
  float ln = vn(vUv0 * vec2(260., 160.) + vSeed * 31.) * .7 + vn(vUv0 * vec2(60., 38.) + vSeed * 7.) * .3;
  if (leafy > .5 && ln > uCover) discard;
  if (alpha < .06) discard;
  vec3 nd = mix(texture2D(uNormal, vUv0), texture2D(uNormal, vUv1), w).rgb;
  vec2 nxy = nd.rg * 2. - 1.;
  vec3 n = normalize(vRight * nxy.x + vec3(0., nxy.y, 0.) + vToCam * sqrt(max(1. - dot(nxy, nxy), .04)));
  float occ = nd.b;
  // Seasons recolour the leaves only.
  float lum = dot(al.rgb, vec3(.3, .55, .15));
  float patchy = smoothstep(.25, .75, vn(vUv0 * vec2(40., 24.) + vSeed * 13.) + (vSeed - .5) * .6);
  vec3 turned = lum * mix(uAutumnCol, uAutumnCol.grb * vec3(1.1, .7, 1.), patchy * .35);
  al.rgb = mix(al.rgb, turned, uAutumn * leafy * (.55 + .45 * patchy));
  float bl = uBloom * leafy * smoothstep(.45, .75, vn(vUv0 * vec2(320., 200.) + vSeed * 5.));
  al.rgb = mix(al.rgb, lum * uBloomCol * 1.5, bl);
  // Snow settles on upward faces; rain darkens bark.
  al.rgb = mix(al.rgb, vec3(.9, .93, .97), uSnow * smoothstep(.15, .6, n.y) * .85);
  al.rgb *= 1. - uWet * (1. - leafy) * .35;
  vec3 V = normalize(cameraPosition - vWorld);
  float diff = max(dot(n, uSunDir) * .62 + .38, 0.);
  vec3 amb = mix(uGround, uSky, n.y * .5 + .5) * mix(.4, 1., occ) * 1.25;
  float back = pow(max(dot(-V, uSunDir), 0.), 3.) * occ;
  vec3 col = al.rgb * (amb + uSunColor * diff * mix(.28, 1., occ) + uSunColor * back * vec3(.55, .7, .25));
  float d = distance(cameraPosition, vWorld);
  col = mix(col, uFogColor, 1. - exp(-uFogDensity * uFogDensity * d * d));
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const DEPTH_FRAG = /* glsl */ `
uniform sampler2D uAlbedo;
uniform float uCover, uCanopyBase;
varying vec2 vUv0;
varying float vSeed, vH, vFade;
float hsh(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  // The full 3D tree takes over the shadow once it is mostly faded in.
  if (vFade < .5) discard;
  vec4 al = texture2D(uAlbedo, vUv0);
  if (al.a < .5) discard;
  float leafy = step(.006, al.g - max(al.r, al.b)) * step(uCanopyBase * .6, vH);
  float ln = vn(vUv0 * vec2(260., 160.) + vSeed * 31.) * .7 + vn(vUv0 * vec2(60., 38.) + vSeed * 7.) * .3;
  if (leafy > .5 && ln > uCover) discard;
  gl_FragColor = vec4(1.);
}`;

interface Species {
  def: MoodDef;
  mesh: THREE.Mesh;
  posH: THREE.InstancedBufferAttribute;
  rot: THREE.InstancedBufferAttribute;
  aspect: number;
  count: number;
  uniforms: Record<string, THREE.IUniform>;
  albedo: THREE.Texture;
  normal: THREE.Texture;
  /** Real size of the baked tree (metres) and its atlas layout. */
  info: { width: number; height: number; cols: number; rows: number };
  /** Instance index -> tree, for the near-tree LOD. */
  trees: TreeSave[];
}

const CAP = 160;
const quad = () => {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, -0.5, 1, 0, 0.5, 1, 0], 3));
  g.setIndex([0, 1, 2, 1, 3, 2]);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  return g;
};

/**
 * Meshopt-compressed models store positions as quantised integers with the
 * real scale on the node. Bake that transform into plain float geometry so
 * instances can be scaled and placed freely.
 */
function unpack(src: THREE.Mesh): THREE.BufferGeometry {
  const geo = src.geometry.clone();
  for (const name of ['position', 'normal']) {
    const a = geo.attributes[name] as THREE.BufferAttribute | undefined;
    if (!a) continue;
    const f = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) f.set([a.getX(i), a.getY(i), a.getZ(i)], i * 3);
    geo.setAttribute(name, new THREE.BufferAttribute(f, 3));
  }
  geo.applyMatrix4(src.matrixWorld);
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const c = bb.getCenter(new THREE.Vector3());
  geo.translate(-c.x, -bb.min.y, -c.z);
  geo.computeBoundingBox();
  return geo;
}

interface ScatterKind {
  meshes: THREE.InstancedMesh[];
  size: number;
}

const rnd = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export class Forest {
  readonly group = new THREE.Group();
  private species = new Map<MoodId, Species>();
  private kinds = new Map<string, ScatterKind>();
  private grassU = {
    uCenter: { value: new THREE.Vector3() },
    uTile: { value: 34 },
    uHeight: { value: null as THREE.Texture | null },
    uTime: LIGHT.uTime,
    uWind: LIGHT.uWind,
    uSeason: LIGHT.uSeason,
    uSnow: LIGHT.uSnow,
    uWet: LIGHT.uWet,
    /** Worn paths and water: r = path wear, g = water. Set by the world. */
    uWorldMask: { value: null as THREE.Texture | null },
  };
  private wild: TreeSave[] = [];
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();

  async load(heightTex: THREE.Texture, maxAniso: number, progress: (p: number) => void) {
    this.grassU.uHeight.value = heightTex;
    const tl = new THREE.TextureLoader();
    let done = 0;
    const total = MOODS.length + 11;
    const tick = () => progress(++done / total);

    await Promise.all(
      MOODS.map(async (def) => {
        const [info, albedo, normal] = await Promise.all([
          fetch(`${ASSETS}trees/${def.asset}.json`).then((r) => r.json() as Promise<{ width: number; height: number; cols: number; rows: number }>),
          tl.loadAsync(`${ASSETS}trees/${def.asset}_albedo.webp`),
          tl.loadAsync(`${ASSETS}trees/${def.asset}_normal.webp`),
        ]);
        albedo.colorSpace = THREE.SRGBColorSpace;
        albedo.anisotropy = Math.min(4, maxAniso);
        albedo.premultiplyAlpha = false;
        const g = quad();
        const posH = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 4), 4);
        const rot = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 3), 3);
        rot.setUsage(THREE.DynamicDrawUsage);
        posH.setUsage(THREE.DynamicDrawUsage);
        g.setAttribute('iPosH', posH);
        g.setAttribute('iRot', rot);
        g.instanceCount = 0;
        const uniforms = {
          ...LIGHT,
          uAlbedo: { value: albedo },
          uNormal: { value: normal },
          uAspect: { value: info.width / info.height },
          uCover: { value: 1.2 },
          uAutumn: { value: 0 },
          uBloom: { value: 0 },
          uAutumnCol: { value: new THREE.Vector3(...def.autumn) },
          uBloomCol: { value: new THREE.Vector3(...(def.blossom ?? [1, 1, 1])) },
          uCanopyBase: { value: 0 },
        };
        const mat = new THREE.ShaderMaterial({ vertexShader: IMPOSTOR_VERT, fragmentShader: IMPOSTOR_FRAG, uniforms, alphaToCoverage: true });
        // Shadow passes default to back faces; a card has none, so ask for both.
        mat.shadowSide = THREE.DoubleSide;
        mat.side = THREE.DoubleSide;
        const mesh = new THREE.Mesh(g, mat);
        mesh.customDepthMaterial = new THREE.ShaderMaterial({ vertexShader: IMPOSTOR_VERT, fragmentShader: DEPTH_FRAG, uniforms, side: THREE.DoubleSide });
        mesh.castShadow = true;
        mesh.frustumCulled = false;
        this.group.add(mesh);
        this.species.set(def.id, { def, mesh, posH, rot, aspect: info.width / info.height, count: 0, uniforms, albedo, normal, info, trees: [] });
        tick();
      }),
    );

    // Understory: real scanned meshes, instanced.
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const want: [string, number, number, boolean, number][] = [
      // asset, variants to keep, capacity, casts shadow, typical size in metres
      ['fern_02', 2, 260, false, 0.75],
      ['shrub_03', 2, 90, true, 0.95],
      ['shrub_02', 1, 60, true, 1.2],
      ['shrub_04', 1, 60, true, 1.0],
      ['flower_gazania', 2, 260, false, 0.3],
      ['dandelion_01', 2, 220, false, 0.28],
      ['periwinkle_plant', 2, 200, false, 0.45],
      ['rock_moss_set_01', 3, 50, true, 1.1],
      ['rock_07', 1, 24, true, 1.6],
      ['tree_stump_01', 1, 10, true, 0.8],
    ];
    await Promise.all(
      want.map(async ([asset, variants, cap, cast, metres]) => {
        const gltf = await loader.loadAsync(`${ASSETS}models/${asset}.glb`);
        const found: THREE.Mesh[] = [];
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((o) => (o as THREE.Mesh).isMesh && found.push(o as THREE.Mesh));
        const kind: ScatterKind = { meshes: [], size: 1 };
        // Scans come as sets of pieces; keep the biggest and bring each to a known size.
        const sized = found.map((src) => {
          const geo = unpack(src);
          const bb = geo.boundingBox!;
          return { src, geo, size: Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z, bb.max.y - bb.min.y) };
        });
        sized.sort((a, b) => b.size - a.size);
        for (const { src, geo, size } of sized.slice(0, variants)) {
          geo.scale(metres / size, metres / size, metres / size);
          const mat = src.material as THREE.MeshStandardMaterial;
          if (mat.map) mat.map.anisotropy = Math.min(4, maxAniso);
          if (mat.alphaTest > 0 || mat.transparent) {
            mat.transparent = false;
            mat.alphaTest = 0.45;
            mat.side = THREE.DoubleSide;
            mat.alphaToCoverage = true;
          }
          const im = new THREE.InstancedMesh(geo, mat, cap);
          im.count = 0;
          im.castShadow = cast;
          im.receiveShadow = true;
          im.frustumCulled = false;
          kind.meshes.push(im);
          this.group.add(im);
        }
        this.kinds.set(asset, kind);
        tick();
      }),
    );

    // Grass: scanned clumps that wrap around the walker so the meadow never ends.
    const grass = await loader.loadAsync(`${ASSETS}models/grass_medium_01.glb`);
    const clumps: THREE.Mesh[] = [];
    grass.scene.updateMatrixWorld(true);
    grass.scene.traverse((o) => (o as THREE.Mesh).isMesh && clumps.push(o as THREE.Mesh));
    const r = rnd(99);
    // Full clumps rather than single blades, but light enough to draw hundreds of.
    const pick = clumps
      .map((src) => ({ src, geo: unpack(src) }))
      .filter((c) => c.geo.attributes.position.count <= 1400)
      .sort((a, b) => b.geo.attributes.position.count - a.geo.attributes.position.count)
      .slice(0, 3);
    pick.forEach(({ src, geo }, vi) => {
      const k = 0.42 / geo.boundingBox!.max.y;
      geo.scale(k, k, k);
      geo.computeBoundingBox();
      // Blades shade far more naturally with the ground's normal than their own.
      const nrm = new Float32Array(geo.attributes.position.count * 3);
      for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
      geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      const bb = geo.boundingBox!;
      const mat = (src.material as THREE.MeshStandardMaterial).clone();
      // The scan's albedo is very dark once lit from above only; lift it to sit with the ground.
      mat.color.setRGB(1.35, 1.5, 1.0);
      // The scan's normal and roughness maps turn some blades into mirrors once their
      // geometric normals point up, so grass is shaded as matte ground instead.
      mat.normalMap = null;
      mat.roughnessMap = null;
      mat.metalnessMap = null;
      mat.roughness = 1;
      mat.metalness = 0;
      mat.transparent = false;
      mat.alphaTest = 0.4;
      mat.side = THREE.DoubleSide;
      mat.alphaToCoverage = true;
      this.patchGrass(mat, bb.max.y - bb.min.y);
      const n = 700;
      const im = new THREE.InstancedMesh(geo, mat, n);
      for (let i = 0; i < n; i++) {
        const sc = 0.8 + r() * 0.9;
        this.q.setFromEuler(this.e.set(0, r() * 6.28, 0));
        this.m4.compose(this.v.set(r() * 34, 0, r() * 34), this.q, this.s.set(sc, sc * (0.8 + r() * 0.5), sc));
        im.setMatrixAt(i, this.m4);
      }
      im.receiveShadow = true;
      im.frustumCulled = false;
      im.userData.variant = vi;
      this.group.add(im);
    });
    tick();
    this.buildScenery();
  }

  /** Wrap grass instances around the camera, seat them on the terrain and let them sway. */
  private patchGrass(mat: THREE.MeshStandardMaterial, height: number) {
    const u = this.grassU;
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, u, { uGrassH: { value: height } });
      s.vertexShader = s.vertexShader
        .replace('#include <common>', `#include <common>\nuniform vec3 uCenter; uniform float uTile, uTime, uWind, uGrassH; uniform sampler2D uHeight, uWorldMask;\nvec3 gShift; float gFade; varying float vBend;`)
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = position;
           vec3 ip = instanceMatrix[3].xyz;
           float HALF = uTile * .5;
           vec2 rel = mod(ip.xz - uCenter.xz + HALF, uTile) - HALF;
           vec2 wxz = uCenter.xz + rel;
           float gy = texture2D(uHeight, wxz / ${WORLD.toFixed(1)} + .5).r;
           gFade = 1. - smoothstep(HALF * .7, HALF * .98, length(rel));
           // Grass gives way on worn paths and in water.
           vec4 wm = texture2D(uWorldMask, wxz / ${WORLD.toFixed(1)} + .5);
           gFade *= 1. - smoothstep(.25, .7, wm.r) * .92;
           gFade *= 1. - smoothstep(.1, .4, wm.g);
           transformed *= gFade;
           float bend = pow(clamp(position.y / uGrassH, 0., 1.), 2.);
           vBend = bend;
           float wv = sin(uTime * 1.6 + wxz.x * .7 + wxz.y * .5) * .06 + sin(uTime * 3.1 + wxz.x * 1.9) * .025;
           transformed.x += wv * bend * uWind;
           transformed.z += wv * .6 * bend * uWind;
           gShift = vec3(wxz.x - ip.x, gy - ip.y, wxz.y - ip.z);`,
        )
        .replace(
          '#include <project_vertex>',
          `vec4 mvPosition = instanceMatrix * vec4(transformed, 1.0);
           mvPosition.xyz += gShift;
           mvPosition = viewMatrix * mvPosition;
           gl_Position = projectionMatrix * mvPosition;`,
        )
        .replace(
          '#include <worldpos_vertex>',
          `vec4 worldPosition = instanceMatrix * vec4(transformed, 1.0);
           worldPosition.xyz += gShift;`,
        );
    };
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (s, r) => {
      prev.call(mat, s, r);
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec4 uSeason; uniform float uSnow, uWet; varying float vBend;')
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
           // Fresh green in spring, sun-bleached in summer, tawny in autumn, dull in winter.
           vec3 tint = uSeason.x * vec3(.95, 1.08, .8) + uSeason.y * vec3(1.08, 1.02, .78) + uSeason.z * vec3(1.18, .9, .62) + uSeason.w * vec3(.88, .86, .8);
           diffuseColor.rgb *= tint;
           diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.92, .95, 1.), uSnow * smoothstep(.3, 1., vBend) * .8);
           diffuseColor.rgb *= 1. - uWet * .2;`,
        );
    };
    mat.customProgramCacheKey = () => 'grass';
  }

  /** 0..1 how much the understory is in flower. */
  private flowerSeason = 1;

  /** Recolour every species for the season. Cheap; call when the season moves. */
  setSeason(s: { spring: number; summer: number; autumn: number; winter: number; leaf: number; bloom: number }) {
    this.flowerSeason = Math.min(1, s.spring * 1.2 + s.summer + s.autumn * 0.35);
    for (const sp of this.species.values()) {
      const d = sp.def;
      const u = sp.uniforms;
      u.uCover.value = d.deciduous ? 0.08 + s.leaf * 1.1 : 1.2;
      // Turning peaks mid-autumn and lingers on what is left in early winter.
      u.uAutumn.value = d.deciduous ? Math.min(1, s.autumn * 1.4 + s.winter * 0.5) : s.autumn * 0.15;
      u.uBloom.value = d.blossom ? s.bloom * (d.id === 'love' ? 0.85 : 0.35) : 0;
    }
  }

  get speciesList() {
    return [...this.species.values()];
  }

  setFocus(p: THREE.Vector3) {
    this.grassU.uCenter.value.copy(p);
  }

  // ------------------------------------------------------------ placement
  private put(kind: string, variant: number, x: number, z: number, scale: number, yaw: number, tilt = 0, sink = 0) {
    const k = this.kinds.get(kind);
    if (!k) return;
    const im = k.meshes[variant % k.meshes.length];
    if (im.count >= im.instanceMatrix.count) return;
    this.q.setFromEuler(this.e.set(tilt, yaw, tilt * 0.6));
    this.m4.compose(this.v.set(x, heightAt(x, z) - sink * scale, z), this.q, this.s.set(scale, scale, scale));
    im.setMatrixAt(im.count++, this.m4);
    im.instanceMatrix.needsUpdate = true;
  }

  /** Rocks, stumps, a ring of wild forest and a few wild flowers that are there from the start. */
  private buildScenery() {
    const r = rnd(2024);
    for (let i = 0; i < 46; i++) {
      const a = r() * 6.28;
      const d = 6 + r() * 70;
      const big = r() < 0.3;
      this.put(big ? 'rock_07' : 'rock_moss_set_01', i, Math.cos(a) * d, Math.sin(a) * d, big ? 0.9 + r() * 1.6 : 0.8 + r() * 1.4, r() * 6.28, (r() - 0.5) * 0.3, 0.12);
    }
    for (let i = 0; i < 7; i++) {
      const a = r() * 6.28;
      const d = 12 + r() * 50;
      this.put('tree_stump_01', 0, Math.cos(a) * d, Math.sin(a) * d, 0.9 + r() * 0.5, r() * 6.28, 0, 0.03);
    }
    this.sceneryMark();
    const ids: MoodId[] = ['joy', 'calm', 'hope', 'sorrow', 'joy', 'calm', 'love'];
    for (let i = 0; i < 120; i++) {
      const a = r() * 6.28;
      const d = 66 + r() * 52;
      this.wild.push({ id: -i - 1, mood: ids[i % ids.length], note: '', planted: 0, x: Math.cos(a) * d, z: Math.sin(a) * d, rot: r() * 6.28, growth: 0.75 + r() * 0.5 });
    }
  }
  private baseCounts = new Map<THREE.InstancedMesh, number>();
  private sceneryMark() {
    for (const k of this.kinds.values()) for (const m of k.meshes) this.baseCounts.set(m, m.count);
  }

  /** Rebuild every instance from the player's trees. Cheap enough to call each second. */
  sync(trees: TreeSave[]) {
    for (const sp of this.species.values()) sp.count = 0;
    for (const [m, n] of this.baseCounts) m.count = n;
    const add = (t: TreeSave) => {
      const sp = this.species.get(t.mood);
      if (!sp || sp.count >= CAP) return;
      const g = Math.min(1.25, t.growth);
      const k = g < 1 ? 1 - Math.pow(1 - g, 1.6) : g;
      const h = sp.def.height * (0.07 + 0.93 * k) * (0.88 + ((t.id * 37) % 100) / 100 * 0.24);
      sp.posH.setXYZW(sp.count, t.x, heightAt(t.x, t.z) - 0.02 * h, t.z, h);
      sp.rot.setXYZ(sp.count, t.rot, ((t.id * 0.6180339) % 1 + 1) % 1, 1);
      sp.trees[sp.count] = t;
      sp.count++;
    };
    for (const t of this.wild) add(t);
    for (const t of trees) {
      add(t);
      // The forest floor answers each tree: ferns, shrubs and flowers move in as it grows.
      const life = Math.min(1, Math.max(0, (t.growth - 0.25) / 0.6));
      if (life <= 0) continue;
      const def = MOOD_BY_ID[t.mood];
      const r = rnd(t.id * 7919 + 13);
      const reach = 1.2 + def.height * 0.28;
      const ring = (n: number, kind: string, min: number, max: number, lo: number, hi: number) => {
        for (let i = 0; i < n; i++) {
          const a = r() * 6.28;
          const d = min + r() * (max - min);
          const appear = Math.min(1, Math.max(0, life * 1.6 - (i / n) * 0.6));
          const sc = (lo + r() * (hi - lo)) * appear;
          const yaw = r() * 6.28;
          const vi = Math.floor(r() * 4);
          if (sc > 0.02) this.put(kind, vi, t.x + Math.cos(a) * d, t.z + Math.sin(a) * d, sc, yaw);
        }
      };
      ring(def.conifer ? 5 : 3, 'fern_02', 0.6, reach, 0.9, 1.7);
      ring(1, r() < 0.5 ? 'shrub_03' : r() < 0.5 ? 'shrub_02' : 'shrub_04', reach * 0.6, reach * 1.3, 0.8, 1.5);
      // Flowers come and go with the seasons.
      const fl = this.flowerSeason;
      if (fl > 0.05) ring(def.flowering ? 6 : 2, def.flowering ? 'flower_gazania' : 'dandelion_01', reach * 0.5, reach * 1.6, 0.9 * fl, 1.6 * fl);
      ring(def.id === 'sorrow' || def.id === 'calm' ? 4 : 1, 'periwinkle_plant', 0.8, reach * 1.2, 0.9, 1.5);
    }
    for (const sp of this.species.values()) {
      (sp.mesh.geometry as THREE.InstancedBufferGeometry).instanceCount = sp.count;
      sp.posH.needsUpdate = true;
      sp.rot.needsUpdate = true;
    }
    for (const k of this.kinds.values()) for (const m of k.meshes) m.instanceMatrix.needsUpdate = true;
  }

  /** Spots where flowers grow, for butterflies and bees to visit. */
  flowerSpots(trees: TreeSave[], out: THREE.Vector3[]) {
    out.length = 0;
    for (const t of trees) {
      if (t.growth < 0.45) continue;
      const def = MOOD_BY_ID[t.mood];
      const r = rnd(t.id * 104729 + 7);
      const n = def.flowering ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const a = r() * 6.28;
        const d = 1 + r() * (1.2 + def.height * 0.3);
        const x = t.x + Math.cos(a) * d;
        const z = t.z + Math.sin(a) * d;
        out.push(new THREE.Vector3(x, heightAt(x, z) + 0.35, z));
      }
    }
  }
}
