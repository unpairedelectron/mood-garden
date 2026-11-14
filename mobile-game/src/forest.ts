// The forest: photo-scanned trees drawn as multi-angle impostors, plus real
// scanned meshes (ferns, shrubs, flowers, rocks, grass) scattered around them.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MOODS, type MoodId, type SpeciesDef, SPECIES_BY_ID, speciesOf } from './moods';
import type { TreeSave } from './state';
import { FALLS, HILL, LAND, LAND_LIMIT, LocalHeight, RIDGE, WORLD, forestDensity, heightAt, placeById, waterAt } from './terrain';

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
  /** 1 when the render target is multisampled: LOD fades use alpha-to-coverage instead of a dither. */
  uA2C: { value: 0 },
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
uniform float uFogDensity, uTime, uWind, uCover, uAutumn, uBloom, uSnow, uWet, uCanopyBase, uA2C;
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
  if (uA2C < .5 && vFade < .999 && vFade <= bayer(gl_FragCoord.xy)) discard;
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
  // With MSAA the fade resolves as smooth sub-pixel coverage rather than a dot pattern.
  gl_FragColor = vec4(col, alpha * (uA2C > .5 ? vFade : 1.));
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
  def: SpeciesDef;
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

/** Impostors per species: enough for the woods within view of the walker. */
const CAP = 4000;

/** Height of a tree in metres for its growth, with a little per-tree variety. */
export function treeHeight(t: TreeSave): number {
  const def = speciesOf(t);
  const g = Math.min(1.25, t.growth);
  const k = g < 1 ? 1 - Math.pow(1 - g, 1.6) : g;
  return def.height * (0.07 + 0.93 * k) * (0.88 + (((Math.abs(t.id) * 37) % 100) / 100) * 0.24) * (t.size ?? 1);
}
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

const bucket = (x: number, z: number) => Math.floor((z + LAND / 2) / 64) * 1000 + Math.floor((x + LAND / 2) / 64);
const h2 = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** Smooth value noise for where each kind of tree grows. */
function vnoise2(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  let fx = x - xi, fy = y - yi;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
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
  private species = new Map<string, Species>();
  private loadingSpecies = new Map<string, Promise<void>>();
  private maxAniso = 4;
  private lastSeason: Parameters<Forest['setSeason']>[0] | null = null;
  /** Called when a species finishes loading late (a seed's tree), so the world can re-sync. */
  onSpeciesLoaded: (sp: Species) => void = () => {};
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
    /** How wooded the land is (r), across the whole land. */
    uForest: { value: null as THREE.Texture | null },
    uHeightOrigin: { value: new THREE.Vector2() },
  };
  /** The wild woods, bucketed by 64 m square for quick lookup around the walker. */
  private wildBuckets = new Map<number, TreeSave[]>();
  /** Wild trees with trunks close to the walker, for bumping into. */
  readonly nearWild: TreeSave[] = [];
  /** How far wild trees are drawn (metres); set from the quality tier. */
  wildRadius = 320;
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();

  async load(local: LocalHeight, forestTex: THREE.Texture, maxAniso: number, progress: (p: number) => void) {
    this.grassU.uHeight.value = local.texture;
    this.grassU.uHeightOrigin.value = local.origin;
    this.grassU.uForest.value = forestTex;
    let done = 0;
    const total = MOODS.length + 11;
    const tick = () => progress(++done / total);

    this.maxAniso = maxAniso;
    await Promise.all(
      MOODS.map(async (m) => {
        await this.loadSpecies(SPECIES_BY_ID[m.id]);
        tick();
      }),
    );

    // Understory: real scanned meshes, instanced.
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const want: [string, number, number, boolean, number][] = [
      // asset, variants to keep, capacity, casts shadow, typical size in metres
      ['fern_02', 2, 2200, false, 0.75],
      ['shrub_03', 2, 520, true, 0.95],
      ['shrub_02', 1, 300, true, 1.2],
      ['shrub_04', 1, 300, true, 1.0],
      ['flower_gazania', 2, 1800, false, 0.3],
      ['dandelion_01', 2, 1800, false, 0.28],
      ['periwinkle_plant', 2, 700, false, 0.45],
      ['rock_moss_set_01', 3, 160, true, 1.1],
      ['rock_07', 1, 120, true, 1.6],
      ['tree_stump_01', 1, 40, true, 0.8],
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
      this.grass.push(im);
      this.group.add(im);
    });
    tick();
    this.buildScenery();
  }


  /** Load one kind of tree's impostor. Seed species load on demand, when first needed. */
  loadSpecies(def: SpeciesDef): Promise<void> {
    let p = this.loadingSpecies.get(def.id);
    if (p) return p;
    const tl = new THREE.TextureLoader();
    const maxAniso = this.maxAniso;
    p = (async () => {
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
        const sp: Species = { def, mesh, posH, rot, aspect: info.width / info.height, count: 0, uniforms, albedo, normal, info, trees: [] };
        this.species.set(def.id, sp);
        if (this.lastSeason) this.setSeason(this.lastSeason);
        this.onSpeciesLoaded(sp);
    })();
    this.loadingSpecies.set(def.id, p);
    return p;
  }

  /** Make sure every kind of tree in this list is (or is being) loaded. */
  need(trees: TreeSave[]) {
    for (const t of trees) {
      const d = speciesOf(t);
      if (!this.loadingSpecies.has(d.id)) void this.loadSpecies(d);
    }
  }

  /** Wrap grass instances around the camera, seat them on the terrain and let them sway. */
  private patchGrass(mat: THREE.MeshStandardMaterial, height: number) {
    const u = this.grassU;
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, u, { uGrassH: { value: height } });
      s.vertexShader = s.vertexShader
        .replace('#include <common>', `#include <common>\nuniform vec3 uCenter; uniform vec2 uHeightOrigin; uniform float uTile, uTime, uWind, uGrassH; uniform sampler2D uHeight, uWorldMask, uForest;\nvec3 gShift; float gFade; varying float vBend;`)
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = position;
           vec3 ip = instanceMatrix[3].xyz;
           float HALF = uTile * .5;
           vec2 rel = mod(ip.xz - uCenter.xz + HALF, uTile) - HALF;
           vec2 wxz = uCenter.xz + rel;
           float gy = texture2D(uHeight, (wxz - uHeightOrigin) / ${LocalHeight.SIZE.toFixed(1)} + .5).r;
           gFade = 1. - smoothstep(HALF * .7, HALF * .98, length(rel));
           // Grass gives way on worn paths and in water.
           vec4 wm = texture2D(uWorldMask, wxz / ${WORLD.toFixed(1)} + .5);
           gFade *= 1. - smoothstep(.25, .7, wm.r) * .92;
           gFade *= 1. - smoothstep(.1, .4, wm.g);
           // Deep woods: little grass grows in the shade, ferns and leaf litter take over.
           float wood = texture2D(uForest, wxz / ${LAND.toFixed(1)} + .5).r;
           gFade *= 1. - smoothstep(.3, .85, wood) * .88;
           // Nothing grows on rock faces.
           vec2 hu = (wxz - uHeightOrigin) / ${LocalHeight.SIZE.toFixed(1)} + .5;
           float dhx = texture2D(uHeight, hu + vec2(1. / ${LocalHeight.SIZE.toFixed(1)}, 0.)).r - gy;
           float dhz = texture2D(uHeight, hu + vec2(0., 1. / ${LocalHeight.SIZE.toFixed(1)})).r - gy;
           gFade *= 1. - smoothstep(.75, 1.2, length(vec2(dhx, dhz)));
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
    this.lastSeason = s;
    this.flowerSeason = Math.min(1, s.spring * 1.2 + s.summer + s.autumn * 0.35);
    for (const sp of this.species.values()) {
      const d = sp.def;
      const u = sp.uniforms;
      u.uCover.value = d.deciduous ? 0.08 + s.leaf * 1.1 : 1.2;
      // Turning peaks mid-autumn and lingers on what is left in early winter.
      u.uAutumn.value = d.deciduous ? Math.min(1, s.autumn * 1.4 + s.winter * 0.5) : s.autumn * 0.15;
      u.uBloom.value = d.blossom ? s.bloom * (d.id === 'love' || d.id === 'othonna' ? 0.85 : 0.35) : 0;
    }
  }

  get speciesList() {
    return [...this.species.values()];
  }

  private grass: THREE.InstancedMesh[] = [];
  /** Share of grass clumps drawn (the biggest single cost on a phone). */
  setGrassDensity(k: number) {
    for (const im of this.grass) im.count = Math.round(im.instanceMatrix.count * k);
  }

  setWorldMask(t: THREE.Texture) {
    this.grassU.uWorldMask.value = t;
  }

  setFocus(p: THREE.Vector3) {
    this.grassU.uCenter.value.copy(p);
  }

  // ------------------------------------------------------------ placement
  private put(kind: string, variant: number, x: number, z: number, scale: number, yaw: number, tilt = 0, sink = 0) {
    const k = this.kinds.get(kind);
    if (!k) return;
    // Nothing grows in open water.
    if (waterAt(x, z) !== null) return;
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
    // A broad flat rock on the hilltop to sit on and look out over the grove.
    this.put('rock_07', 0, HILL.x + 0.6, HILL.z - 0.4, 2.2, 0.8, 0, 0.35);
    this.put('rock_moss_set_01', 1, HILL.x - 2.5, HILL.z + 1.8, 1.4, 2.1, 0.1, 0.12);
    this.growWilds();
    this.buildPlaces();
    this.sceneryMark();
  }

  /** Trees that belong to a place and are always drawn, wherever you are. */
  private landmarks: TreeSave[] = [];

  /** The places' own trees and stones. */
  private buildPlaces() {
    const r = rnd(777);
    const tree = (id: number, mood: MoodId, x: number, z: number, size: number, rot = r() * 6.28) =>
      this.landmarks.push({ id, mood, note: '', planted: 0, x, z, rot, growth: 1, size, y: heightAt(x, z) });
    // The Old One: an ancient broadleaf that stands far above the canopy, with a few elders near it.
    const old = placeById('oldone');
    tree(-900001, 'joy', old.x, old.z, 3.1, 0.6);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + 0.4, d = 17 + r() * 4;
      tree(-900010 - i, i % 2 ? 'calm' : 'joy', old.x + Math.cos(a) * d, old.z + Math.sin(a) * d, 1.5 + r() * 0.4);
    }
    for (let i = 0; i < 9; i++) {
      const a = r() * 6.28, d = 4 + r() * 9;
      this.put('fern_02', i, old.x + Math.cos(a) * d, old.z + Math.sin(a) * d, 1.1 + r() * 0.7, r() * 6.28);
    }
    // Sunset Ridge: a lone quiver tree on the crest and a flat stone facing west.
    const ridge = placeById('ridge');
    tree(-900020, 'courage', RIDGE.x + 4, RIDGE.z - 7, 1.4);
    this.put('rock_07', 0, ridge.x, ridge.z, 2.3, Math.PI * 0.5, 0, 0.35);
    this.put('rock_moss_set_01', 2, ridge.x + 3, ridge.z + 3, 1.2, 1.2, 0.1, 0.12);
    // The Falls: boulders flank the pool and the lip.
    {
      const f = placeById('falls');
      // Positions across (s) and upstream (up) of the source, in metres.
      const side = (s: number, up: number) => [f.x - FALLS.dx * up - FALLS.dz * s, f.z - FALLS.dz * up + FALLS.dx * s] as const;
      // At the foot of the face either side of the pool, and up on top beside the lip.
      for (const [s, up, sc] of [[-4.4, 0, 2.2], [4.6, -0.3, 2], [-6.5, 0.4, 2.8], [6.8, 0.2, 2.6], [-3.2, -2.2, 1.3], [3.4, -2.6, 1.1], [-4.5, 7.5, 2.6], [4.8, 8, 2.4]] as const) {
        const [x, z] = side(s, up);
        this.put(sc > 2 ? 'rock_07' : 'rock_moss_set_01', Math.round(sc * 3), x, z, sc, r() * 6.28, (r() - 0.5) * 0.2, 0.3);
      }
    }
    // The Ruin: the footing of a small stone house, a doorway gap on the south side, some stones fallen.
    const ru = placeById('ruin');
    const W = 9, D = 6.5;
    const edge = (x0: number, z0: number, x1: number, z1: number, gapAt = -1) => {
      const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.85);
      const yaw = Math.atan2(x1 - x0, z1 - z0);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        if (gapAt >= 0 && Math.abs(t - gapAt) < 0.12) continue;
        // A stretch here and there has fallen.
        const fallen = Math.sin(t * 9 + x0) > 0.75;
        const x = ru.x + x0 + (x1 - x0) * t + (r() - 0.5) * 0.15, z = ru.z + z0 + (z1 - z0) * t + (r() - 0.5) * 0.15;
        this.put('rock_07', i, x, z, 0.85 + r() * 0.35, yaw + (r() - 0.5) * 0.4, (r() - 0.5) * 0.12, 0.2);
        // A second course of stones on top where the wall still stands.
        if (!fallen && r() < 0.8) this.put('rock_moss_set_01', i, x, z, 0.7 + r() * 0.3, yaw + (r() - 0.5) * 0.6, (r() - 0.5) * 0.15, -0.55);
      }
    };
    edge(-W / 2, -D / 2, W / 2, -D / 2, 0.5);
    edge(W / 2, -D / 2, W / 2, D / 2);
    edge(W / 2, D / 2, -W / 2, D / 2);
    edge(-W / 2, D / 2, -W / 2, -D / 2);
    // Tumbled stones and the old hearth.
    for (let i = 0; i < 6; i++) this.put('rock_moss_set_01', i, ru.x + (r() - 0.5) * 16, ru.z + (r() - 0.5) * 14, 0.6 + r() * 0.6, r() * 6.28, (r() - 0.5) * 0.5, 0.1);
    this.put('rock_07', 1, ru.x + 2.2, ru.z + 1.4, 1.4, 0.3, 0, 0.3);
    this.put('tree_stump_01', 0, ru.x - 5.5, ru.z - 6, 1.3, 1.1, 0, 0.03);
    // A young tree growing up through the floor, as they do in old ruins.
    tree(-900030, 'calm', ru.x - 1.5, ru.z + 0.8, 0.9);
  }

  /**
   * The wild forest: every tree in the land, placed once from the woodland map.
   * Broadleaf canopy trees, fir and thicket beneath them, quiver trees on dry
   * open ground, and now and then an ancient giant.
   */
  private growWilds() {
    const r = rnd(4242);
    const CELL = 10;
    const half = LAND / 2;
    let id = -1;
    for (let z = -half; z < half; z += CELL) {
      for (let x = -half; x < half; x += CELL) {
        const cx = x + CELL / 2, cz = z + CELL / 2;
        const R = Math.hypot(cx, cz);
        if (R < 56 || R > LAND_LIMIT + 70) continue;
        const d = forestDensity(cx, cz);
        // Expected trees per cell; glades keep a few scattered trees.
        const want = d * 2.6 + (d < 0.15 && R > 90 ? 0.06 : 0);
        let n = Math.floor(want);
        if (r() < want - n) n++;
        for (let k = 0; k < n; k++) {
          const tx = x + r() * CELL, tz = z + r() * CELL;
          if (waterAt(tx, tz) !== null || waterAt(tx + 2.5, tz) !== null || waterAt(tx - 2.5, tz) !== null || waterAt(tx, tz + 2.5) !== null || waterAt(tx, tz - 2.5) !== null) continue;
          if (Math.hypot(tx - HILL.x, tz - HILL.z) < HILL.radius * 0.55) continue;
          // Which kind grows here: damp hollows favour shade trees and jacaranda,
          // dry ground broadleaf and quiver trees; fir and thicket fill the understorey.
          const damp = vnoise2(tx * 0.008 + 7, tz * 0.008 - 3);
          const u = r();
          let mood: MoodId;
          if (u < 0.22) mood = 'hope';
          else if (u < 0.36) mood = 'sorrow';
          else if (d < 0.35 && damp < 0.45 && r() < 0.5) mood = 'courage';
          else if (damp > 0.55) mood = r() < 0.7 ? 'calm' : 'love';
          else mood = r() < 0.72 ? 'joy' : r() < 0.6 ? 'calm' : 'love';
          let size = 0.85 + r() * 0.5;
          if ((mood === 'joy' || mood === 'calm') && d > 0.6 && r() < 0.012) size = 2 + r() * 0.7;
          if (mood === 'hope') size = 0.9 + r() * 0.9;
          const t: TreeSave = { id: id--, mood, note: '', planted: 0, x: tx, z: tz, rot: r() * 6.28, growth: 1, size, y: heightAt(tx, tz) };
          const key = bucket(tx, tz);
          let list = this.wildBuckets.get(key);
          if (!list) this.wildBuckets.set(key, (list = []));
          list.push(t);
          this.wildCount++;
        }
      }
    }
  }
  wildCount = 0;

  /** Wild trees within `radius` of a point. */
  private wildNear(x: number, z: number, radius: number, out: TreeSave[]) {
    const B = 64;
    const half = LAND / 2;
    const i0 = Math.floor((x - radius + half) / B), i1 = Math.floor((x + radius + half) / B);
    const j0 = Math.floor((z - radius + half) / B), j1 = Math.floor((z + radius + half) / B);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const list = this.wildBuckets.get(j * 1000 + i);
        if (!list) continue;
        for (const t of list) if (Math.hypot(t.x - x, t.z - z) < radius) out.push(t);
      }
    }
  }
  private wildScratch: TreeSave[] = [];
  private baseCounts = new Map<THREE.InstancedMesh, number>();
  private sceneryMark() {
    for (const k of this.kinds.values()) for (const m of k.meshes) this.baseCounts.set(m, m.count);
  }

  /** Rebuild every instance from the player's trees. Cheap enough to call each second. */
  /** Rebuild instances. Understory is only grown around trees near `focus`, which keeps a
   *  year-old grove of hundreds of trees cheap; the world re-syncs as you walk. */
  sync(trees: TreeSave[], focus?: { x: number; z: number }) {
    for (const sp of this.species.values()) sp.count = 0;
    for (const [m, n] of this.baseCounts) m.count = n;
    const add = (t: TreeSave) => {
      const sp = this.species.get(speciesOf(t).id);
      if (!sp || sp.count >= CAP) return;
      const h = treeHeight(t);
      sp.posH.setXYZW(sp.count, t.x, (t.y ?? heightAt(t.x, t.z)) - 0.02 * h, t.z, h);
      sp.rot.setXYZ(sp.count, t.rot, ((t.id * 0.6180339) % 1 + 1) % 1, 1);
      sp.trees[sp.count] = t;
      sp.count++;
    };
    const fx = focus?.x ?? 0, fz = focus?.z ?? 0;
    // The wild woods within sight, nearest first so the cap drops only the farthest.
    const wild = this.wildScratch;
    wild.length = 0;
    this.wildNear(fx, fz, this.wildRadius, wild);
    wild.sort((a, b) => Math.hypot(a.x - fx, a.z - fz) - Math.hypot(b.x - fx, b.z - fz));
    // Landmark trees first, and from anywhere: the Old One shows over the canopy from afar.
    for (const t of this.landmarks) add(t);
    for (const t of wild) add(t);
    this.nearWild.length = 0;
    for (const t of this.landmarks) if (Math.hypot(t.x - fx, t.z - fz) < 40) this.nearWild.push(t);
    for (const t of wild) {
      if (Math.hypot(t.x - fx, t.z - fz) > 40) break;
      this.nearWild.push(t);
    }
    this.wildUnderstory(fx, fz);
    for (const t of trees) {
      add(t);
      if (focus && Math.hypot(t.x - focus.x, t.z - focus.z) > 55) continue;
      // The forest floor answers each tree: ferns, shrubs and flowers move in as it grows.
      const life = Math.min(1, Math.max(0, (t.growth - 0.25) / 0.6));
      if (life <= 0) continue;
      const def = speciesOf(t);
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
      ring(def.mood === 'sorrow' || def.mood === 'calm' ? 4 : 1, 'periwinkle_plant', 0.8, reach * 1.2, 0.9, 1.5);
    }
    for (const sp of this.species.values()) {
      (sp.mesh.geometry as THREE.InstancedBufferGeometry).instanceCount = sp.count;
      sp.posH.needsUpdate = true;
      sp.rot.needsUpdate = true;
    }
    for (const k of this.kinds.values()) for (const m of k.meshes) m.instanceMatrix.needsUpdate = true;
  }

  /**
   * The floor of the wild woods around the walker: ferns and shrubs where it is
   * wooded, rocks and stumps here and there, wild flowers in the glades.
   */
  private wildUnderstory(fx: number, fz: number) {
    const C = 6;
    const R = 38;
    for (let gz = Math.floor((fz - R) / C); gz <= Math.floor((fz + R) / C); gz++) {
      for (let gx = Math.floor((fx - R) / C); gx <= Math.floor((fx + R) / C); gx++) {
        const cx = (gx + 0.5) * C, cz = (gz + 0.5) * C;
        if (Math.hypot(cx - fx, cz - fz) > R) continue;
        const rr = Math.hypot(cx, cz);
        if (rr < 64 || rr > LAND_LIMIT + 20) continue;
        const r = rnd((gx * 73856093) ^ (gz * 19349663));
        const d = forestDensity(cx, cz);
        const at = () => [gx * C + r() * C, gz * C + r() * C] as const;
        const nf = Math.floor(d * 4 + r());
        for (let i = 0; i < nf; i++) {
          const [x, z] = at();
          this.put('fern_02', Math.floor(r() * 4), x, z, 0.9 + r() * 0.9, r() * 6.28);
        }
        // Shrubs at eye level break up the long views through the woods.
        for (let k = 0, ns = Math.floor(d * 1.3 + r() * 0.6); k < ns; k++) {
          const [x, z] = at();
          this.put(r() < 0.5 ? 'shrub_03' : r() < 0.5 ? 'shrub_02' : 'shrub_04', Math.floor(r() * 4), x, z, 0.8 + r() * 0.8, r() * 6.28);
        }
        if (r() < d * 0.5) {
          const [x, z] = at();
          this.put('periwinkle_plant', Math.floor(r() * 4), x, z, 0.9 + r() * 0.6, r() * 6.28);
        }
        if (r() < 0.07) {
          const [x, z] = at();
          const big = r() < 0.35;
          this.put(big ? 'rock_07' : 'rock_moss_set_01', Math.floor(r() * 4), x, z, big ? 0.8 + r() * 1.8 : 0.7 + r() * 1.3, r() * 6.28, (r() - 0.5) * 0.3, 0.12);
        }
        if (r() < d * 0.025) {
          const [x, z] = at();
          this.put('tree_stump_01', 0, x, z, 0.8 + r() * 0.6, r() * 6.28, 0, 0.03);
        }
        // Glades flower in their season; the meadow most of all.
        const fl = this.flowerSeason;
        const mead = placeById('meadow');
        const inMeadow = Math.hypot(cx - mead.x, cz - mead.z) < mead.glade * 0.9;
        if ((d < 0.3 || inMeadow) && fl > 0.05) {
          const nfl = Math.floor((inMeadow ? 15 : (0.3 - d) * 10 * r()) * fl);
          for (let i = 0; i < nfl; i++) {
            const [x, z] = at();
            const big = inMeadow ? 1.6 : 1;
            this.put(r() < (inMeadow ? 0.35 : 0.6) ? 'dandelion_01' : 'flower_gazania', Math.floor(r() * 4), x, z, (0.8 + r() * 0.9) * fl * big, r() * 6.28);
          }
        }
      }
    }
  }

  /** Spots where flowers grow, for butterflies and bees to visit. */
  flowerSpots(trees: TreeSave[], out: THREE.Vector3[]) {
    out.length = 0;
    for (const t of trees) {
      if (t.growth < 0.45) continue;
      const def = speciesOf(t);
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
