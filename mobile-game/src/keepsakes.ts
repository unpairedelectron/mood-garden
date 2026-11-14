// Things to find while wandering: feathers in the woods, stones by the water,
// flowers to press from the glades, and a rare seed at each of the land's
// places that lets you grow a new kind of tree. They lie where they lie (the
// same for everyone), catch the light when you are near, and are picked up by
// walking over them. Also here: a small lantern on each of your trees after
// dark, so your own trees lead you home at night.

import * as THREE from 'three';
import { LIGHT } from './forest';
import { SEED_SPECIES, speciesOf } from './moods';
import type { TreeSave } from './state';
import { LAND_LIMIT, PLACES, forestDensity, heightAt, placeById, pondShape, streamNearest, waterAt } from './terrain';

export type KeepsakeKind = 'feather' | 'stone' | 'flower' | 'seed';
export interface Keepsake {
  id: string;
  kind: KeepsakeKind;
  name: string;
  line: string;
  x: number;
  z: number;
  /** For seeds: the kind of tree it grows. */
  species?: string;
}

const FEATHERS: [string, string][] = [
  ['A jay’s blue feather', 'Barred blue and black, bright as a scrap of sky.'],
  ['A wood pigeon feather', 'Soft grey, the colour of a cloudy morning.'],
  ['An owl’s feather', 'So soft at the edge it would make no sound in flight.'],
  ['A wren’s feather', 'Tiny and brown, easy to miss.'],
  ['A crow’s feather', 'Glossy black with a green sheen in the light.'],
  ['A robin’s breast feather', 'A small curl of orange.'],
  ['A woodpecker’s feather', 'Black with white spots, stiff and strong.'],
  ['A buzzard’s feather', 'Long and banded, from high overhead.'],
  ['A goldfinch feather', 'A flash of yellow at the tip.'],
  ['A heron’s feather', 'Long and pale grey, left by the water.'],
  ['A blackbird’s feather', 'Plain black, and somehow beautiful for it.'],
  ['A swallow’s feather', 'Dark blue and narrow, built for speed.'],
];
const STONES: [string, string][] = [
  ['A smooth river stone', 'Worn round by years of water.'],
  ['A stone with a hole through it', 'Old stories say you can see far through one.'],
  ['A white quartz pebble', 'It glitters when you turn it.'],
  ['A striped stone', 'Grey with a single white band right round it.'],
  ['A heart-shaped stone', 'Not quite a heart, but close enough.'],
  ['A flat skimming stone', 'Perfect for the pond.'],
  ['A piece of green slate', 'Cool and smooth, with a fossil fern pressed into it.'],
  ['A speckled pebble', 'Like a bird’s egg made of stone.'],
  ['A warm red stone', 'Still holding the day’s sun.'],
  ['A tiny fossil shell', 'From when all of this was sea.'],
];
const FLOWERS: [string, string][] = [
  ['A pressed buttercup', 'Still shining yellow between the pages.'],
  ['A dog-violet', 'Small and purple, from the edge of the trees.'],
  ['A sprig of heather', 'From the open ground up high.'],
  ['A wild rose', 'Five pale petals and a faint scent.'],
  ['A cornflower', 'The bluest thing in the field.'],
  ['A daisy', 'The one that was open widest to the sun.'],
  ['A clover with four leaves', 'You looked twice to be sure.'],
  ['A foxglove bell', 'Speckled inside like a thrush.'],
  ['A sprig of yarrow', 'Feathery leaves and a flat white flower head.'],
  ['A poppy', 'Pressed thin as paper, still red.'],
];

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

/** Where everything lies. The same for every player. */
function catalogue(): Keepsake[] {
  const out: Keepsake[] = [];
  const r = rnd(9157);
  const dry = (x: number, z: number) => waterAt(x, z) === null && waterAt(x + 1.5, z) === null && waterAt(x, z + 1.5) === null;
  // Seeds, one at each place, a few steps from its heart.
  for (const s of SEED_SPECIES) {
    const p = placeById(s.seed!.place);
    for (let k = 0; k < 40; k++) {
      const a = r() * 6.28, d = 3 + r() * 4;
      const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      if (!dry(x, z)) continue;
      out.push({ id: `seed-${s.id}`, kind: 'seed', name: s.seed!.name, line: s.seed!.line, x, z, species: s.id });
      break;
    }
  }
  // Feathers in the woods.
  FEATHERS.forEach(([name, line], i) => {
    for (let k = 0; k < 300; k++) {
      const a = r() * 6.28, d = 80 + r() * (LAND_LIMIT - 140);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (dry(x, z) && forestDensity(x, z) > 0.45) {
        out.push({ id: `feather-${i}`, kind: 'feather', name, line, x, z });
        break;
      }
    }
  });
  // Stones by the water (pond, stream, falls) and a few on the high ground.
  STONES.forEach(([name, line], i) => {
    for (let k = 0; k < 400; k++) {
      let x: number, z: number;
      if (i < 7) {
        const sn = Math.floor(r() * 3);
        if (sn === 0) {
          const a = r() * 6.28;
          x = -26 + Math.cos(a) * 13;
          z = 20 + Math.sin(a) * 10;
        } else {
          x = -120 + r() * 100;
          z = -70 + r() * 95;
          const near = streamNearest(x, z);
          if (near.d < 2.5 || near.d > 5) continue;
        }
        if (pondShape(x, z) > -0.08 && sn === 0) continue;
      } else {
        const p = [placeById('ridge'), placeById('hill'), placeById('ruin')][i - 7];
        const a = r() * 6.28, d = 4 + r() * 10;
        x = p.x + Math.cos(a) * d;
        z = p.z + Math.sin(a) * d;
      }
      if (dry(x, z)) {
        out.push({ id: `stone-${i}`, kind: 'stone', name, line, x, z });
        break;
      }
    }
  });
  // Flowers to press, in glades and the meadow.
  FLOWERS.forEach(([name, line], i) => {
    for (let k = 0; k < 600; k++) {
      let x: number, z: number;
      if (i < 4) {
        const m = placeById('meadow');
        const a = r() * 6.28, d = r() * 40;
        x = m.x + Math.cos(a) * d;
        z = m.z + Math.sin(a) * d;
      } else {
        const a = r() * 6.28, d = 70 + r() * 450;
        x = Math.cos(a) * d;
        z = Math.sin(a) * d;
        if (forestDensity(x, z) > 0.15) continue;
      }
      if (dry(x, z)) {
        out.push({ id: `flower-${i}`, kind: 'flower', name, line, x, z });
        break;
      }
    }
  });
  // Heather belongs on the ridge.
  const h = out.find((k) => k.id === 'flower-2');
  if (h) {
    const p = placeById('ridge');
    h.x = p.x + 5;
    h.z = p.z - 6;
  }
  return out;
}

export const KEEPSAKES: Keepsake[] = catalogue();

/** Where something was found, in words. */
export function whereabouts(x: number, z: number): string {
  let best = '', bd = 70;
  for (const p of PLACES) {
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bd) {
      bd = d;
      best = p.name;
    }
  }
  if (best) return `near ${best.replace(/^The /, 'the ')}`;
  if (Math.hypot(x, z) < 70) return 'in the clearing';
  if (streamNearest(x, z).d < 8) return 'by the stream';
  return forestDensity(x, z) > 0.55 ? 'deep in the woods' : 'in a glade';
}

// ------------------------------------------------------------------ drawing

const GLINT_VERT = /* glsl */ `
attribute vec2 aKind;   // x = kind (0 feather, 1 stone, 2 flower, 3 seed), y = 1 if still to be found
uniform float uTime, uPx;
varying float vA, vKind;
void main() {
  vKind = aKind.x;
  vec4 mv = viewMatrix * vec4(position, 1.);
  float d = -mv.z;
  // Seen from about thirty metres; a gentle twinkle, brighter for seeds.
  float tw = .55 + .45 * sin(uTime * 2.3 + position.x * 3.1 + position.z * 1.7);
  vA = aKind.y * (1. - smoothstep(18., 32., d)) * tw * (aKind.x > 2.5 ? 1.4 : 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (.55 * uPx / max(d, .5)) * (aKind.x > 2.5 ? 1.5 : 1.);
}`;

const GLINT_FRAG = /* glsl */ `
uniform vec3 uSunColor, uSky;
varying float vA, vKind;
void main() {
  vec2 q = gl_PointCoord - .5;
  // A soft point with a four-pointed glint.
  float core = exp(-dot(q, q) * 60.);
  float star = exp(-abs(q.x) * 40.) * exp(-abs(q.y) * 6.) + exp(-abs(q.y) * 40.) * exp(-abs(q.x) * 6.);
  float a = (core + star * .55) * vA;
  vec3 tint = vKind > 2.5 ? vec3(1., .86, .5) : vKind > 1.5 ? vec3(1., .8, .9) : vec3(.9, .95, 1.);
  vec3 c = tint * (uSky * 2. + uSunColor * .8 + .25) * a;
  gl_FragColor = vec4(c, a);
  #include <colorspace_fragment>
}`;

const LANTERN_VERT = /* glsl */ `
uniform float uTime, uPx, uNight;
varying float vA;
void main() {
  vec4 mv = viewMatrix * vec4(position, 1.);
  float d = -mv.z;
  vA = uNight * (.8 + .2 * sin(uTime * 1.3 + position.x * 7.));
  gl_Position = projectionMatrix * mv;
  // A warm point near by; never smaller than a few pixels, so far trees still show.
  gl_PointSize = max(1.6 * uPx / max(d, .5), 7.);
}`;
const LANTERN_FRAG = /* glsl */ `
varying float vA;
void main() {
  vec2 q = gl_PointCoord - .5;
  // A bright core in a soft halo.
  float a = (exp(-dot(q, q) * 60.) + exp(-dot(q, q) * 9.) * .45) * vA;
  gl_FragColor = vec4(vec3(1., .72, .36) * a * 4., a);
  #include <colorspace_fragment>
}`;

export class Keepsakes {
  readonly group = new THREE.Group();
  private glints: THREE.Points;
  private kindAttr: THREE.BufferAttribute;
  private glintU = { uTime: LIGHT.uTime, uPx: { value: 800 }, uSunColor: LIGHT.uSunColor, uSky: LIGHT.uSky };
  private lanterns: THREE.Points;
  private lanternU = { uTime: LIGHT.uTime, uPx: this.glintU.uPx, uNight: { value: 0 } };
  private lanternCount = -1;

  constructor() {
    const n = KEEPSAKES.length;
    const pos = new Float32Array(n * 3);
    const kind = new Float32Array(n * 2);
    const kinds: KeepsakeKind[] = ['feather', 'stone', 'flower', 'seed'];
    KEEPSAKES.forEach((k, i) => {
      pos.set([k.x, heightAt(k.x, k.z) + 0.12, k.z], i * 3);
      kind.set([kinds.indexOf(k.kind), 1], i * 2);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.kindAttr = new THREE.BufferAttribute(kind, 2);
    g.setAttribute('aKind', this.kindAttr);
    this.glints = new THREE.Points(
      g,
      new THREE.ShaderMaterial({ vertexShader: GLINT_VERT, fragmentShader: GLINT_FRAG, uniforms: this.glintU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.glints.frustumCulled = false;
    this.group.add(this.glints);

    this.lanterns = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.ShaderMaterial({ vertexShader: LANTERN_VERT, fragmentShader: LANTERN_FRAG, uniforms: this.lanternU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.lanterns.frustumCulled = false;
    this.group.add(this.lanterns);
  }

  setPixelScale(px: number) {
    this.glintU.uPx.value = px;
  }

  /** Hide what has been found. */
  setFound(found: Record<string, number>) {
    KEEPSAKES.forEach((k, i) => this.kindAttr.setY(i, found[k.id] ? 0 : 1));
    this.kindAttr.needsUpdate = true;
  }

  /** Anything within reach of the walker that has not been picked up yet. */
  within(x: number, z: number, found: Record<string, number>, reach = 1.6): Keepsake[] {
    return KEEPSAKES.filter((k) => !found[k.id] && Math.hypot(k.x - x, k.z - z) < reach);
  }

  /** Lanterns on your own trees, glowing from dusk to dawn. */
  setTrees(trees: TreeSave[]) {
    if (trees.length === this.lanternCount) return;
    this.lanternCount = trees.length;
    const pos = new Float32Array(trees.length * 3);
    trees.forEach((t, i) => {
      // Hung at shoulder height on the side of the trunk, small trees a little lower.
      const h = Math.min(1.5, 0.5 + speciesOf(t).height * 0.2);
      pos.set([t.x + Math.cos(t.rot) * 0.45, heightAt(t.x, t.z) + h, t.z + Math.sin(t.rot) * 0.45], i * 3);
    });
    this.lanterns.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.lanterns.geometry.computeBoundingSphere();
  }

  setNight(k: number) {
    this.lanternU.uNight.value = k;
    this.lanterns.visible = k > 0.01;
  }
}
