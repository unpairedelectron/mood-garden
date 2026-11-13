// HDR post chain: scene -> bloom -> light shafts -> cinematic grade -> tone map.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';

const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

/**
 * Screen-space light shafts. The sky near the sun is far brighter than any
 * lit surface in the HDR buffer, so a luminance threshold doubles as the
 * occlusion mask – no depth pre-pass needed.
 */
class ShaftsPass extends Pass {
  readonly sun = new THREE.Vector2(0.5, 0.5);
  strength = 0;
  private rt: THREE.WebGLRenderTarget;
  private blur: THREE.ShaderMaterial;
  private comp: THREE.ShaderMaterial;
  private quad = new FullScreenQuad();

  constructor() {
    super();
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
    this.blur = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      depthTest: false,
      depthWrite: false,
      uniforms: { tDiffuse: { value: null }, uSun: { value: this.sun }, uAspect: { value: 1 } },
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform sampler2D tDiffuse; uniform vec2 uSun; uniform float uAspect;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          const int N = 36;
          vec2 delta = (uSun - vUv) / float(N) * 0.92;
          vec2 uv = vUv + delta * hash(vUv * 913.7);
          vec3 acc = vec3(0.);
          float w = 1.;
          for (int i = 0; i < N; i++) {
            vec3 c = texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).rgb;
            float l = max(c.r, max(c.g, c.b));
            acc += c * smoothstep(3.0, 9.0, l) * w;
            w *= 0.965;
            uv += delta;
          }
          vec2 d = (vUv - uSun) * vec2(uAspect, 1.);
          float fall = 1. / (1. + dot(d, d) * 2.2);
          gl_FragColor = vec4(min(acc / float(N), vec3(6.)) * fall, 1.);
        }`,
    });
    this.comp = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      depthTest: false,
      depthWrite: false,
      uniforms: { tDiffuse: { value: null }, tShafts: { value: this.rt.texture }, uStrength: { value: 0 } },
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform sampler2D tDiffuse, tShafts; uniform float uStrength;
        void main() {
          vec3 c = texture2D(tDiffuse, vUv).rgb;
          gl_FragColor = vec4(c + texture2D(tShafts, vUv).rgb * uStrength, 1.);
        }`,
    });
  }
  setSize(w: number, h: number) {
    this.rt.setSize(Math.max(2, Math.floor(w / 3)), Math.max(2, Math.floor(h / 3)));
    this.blur.uniforms.uAspect.value = w / h;
  }
  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    this.blur.uniforms.tDiffuse.value = readBuffer.texture;
    this.quad.material = this.blur;
    renderer.setRenderTarget(this.rt);
    this.quad.render(renderer);
    this.comp.uniforms.tDiffuse.value = readBuffer.texture;
    this.comp.uniforms.uStrength.value = this.strength;
    this.quad.material = this.comp;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() {
    this.rt.dispose();
    this.blur.dispose();
    this.comp.dispose();
    this.quad.dispose();
  }
}

class GradePass extends Pass {
  readonly uniforms = {
    tDiffuse: { value: null as THREE.Texture | null },
    uSat: { value: 1 },
    uVignette: { value: 0.35 },
    uFade: { value: 0 },
    uTime: { value: 0 },
    uWarm: { value: 0 },
    uExposure: { value: 1 },
    uFocus: { value: 0 },
  };
  private mat: THREE.ShaderMaterial;
  private quad: FullScreenQuad;
  constructor() {
    super();
    this.mat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      depthTest: false,
      depthWrite: false,
      uniforms: this.uniforms,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform float uSat, uVignette, uFade, uTime, uWarm, uExposure, uFocus;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          vec2 c = vUv - 0.5;
          float r2 = dot(c, c);
          // A whisper of chromatic fringing toward the frame edge.
          vec2 off = c * r2 * (0.006 + uFocus * 0.02);
          vec3 col = vec3(texture2D(tDiffuse, vUv - off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + off).b);
          col *= uExposure;
          float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
          col = mix(vec3(lum), col, uSat);
          // Split tone: cool shadows, warm highlights.
          float t = smoothstep(0.0, 1.2, lum);
          col *= mix(vec3(0.93, 0.98, 1.09), vec3(1.07, 1.0, 0.92), t);
          col = mix(col, col * vec3(1.1, 0.98, 0.84), uWarm);
          // Gentle filmic contrast around mid grey.
          col = mix(col, col * col * (3. - 2. * clamp(col, 0., 1.)), 0.1);
          col *= 1. - uVignette * smoothstep(0.12, 0.85, r2 * 1.9);
          col += (hash(vUv * vec2(1920., 1080.) + fract(uTime) * 61.) - 0.5) * 0.012 * (0.4 + lum);
          col *= 1. - uFade;
          gl_FragColor = vec4(max(col, 0.), 1.);
        }`,
    });
    this.quad = new FullScreenQuad(this.mat);
  }
  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    this.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() {
    this.mat.dispose();
    this.quad.dispose();
  }
}

export class PostFX {
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  readonly shafts = new ShaftsPass();
  readonly grade = new GradePass();
  private renderer: THREE.WebGLRenderer;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, samples: number) {
    this.renderer = renderer;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.32, 0.75, 1.9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.shafts);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
  }

  setSize(w: number, h: number, pixelRatio: number) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
  }

  render(dt: number) {
    this.grade.uniforms.uTime.value += dt;
    this.composer.render(dt);
  }

  dispose() {
    this.composer.dispose();
    this.renderer.setRenderTarget(null);
  }
}
