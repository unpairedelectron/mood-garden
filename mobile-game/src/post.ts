// The camera's eye: the scene is drawn into an HDR buffer, then one pass adds
// low-lying mist, moving cloud shadows and light shafts through the leaves,
// tone-maps it and gives it a gentle film grade (split tone, vignette, grain).
//
// Light shafts are computed at half resolution by marching each pixel toward
// the sun through the depth buffer: wherever sky shows between leaves, light
// streams through.

import * as THREE from 'three';

export type Quality = 'low' | 'medium' | 'high';

const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`;

const SHAFT_FRAG = /* glsl */ `
uniform sampler2D tDepth, tColor;
uniform vec2 uSun;
uniform float uAspect;
varying vec2 vUv;
float hsh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 d = uSun - vUv;
  d.x *= uAspect;
  float len = length(d);
  d.x /= uAspect;
  const int N = 28;
  vec2 stepv = d / float(N) * min(1., .55 / max(len, 1e-3));
  vec2 p = vUv + stepv * hsh(vUv * 911.);
  float acc = 0., w = 1.;
  for (int i = 0; i < N; i++) {
    float z = texture2D(tDepth, p).r;
    if (z > .99999) {
      vec3 c = texture2D(tColor, p).rgb;
      acc += w * min(dot(c, vec3(.3, .55, .15)), 6.);
    }
    w *= .955;
    p += stepv;
  }
  // Brightest near the sun, gone half a screen away.
  float fall = 1. - smoothstep(.0, .75, len);
  gl_FragColor = vec4(vec3(acc / float(N) * fall), 1.);
}`;

const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D tColor, tDepth, tShafts;
uniform mat4 uInvProj, uCamWorld;
uniform vec3 uCamPos, uSunDir, uSunColor, uFogColor, uShadowTint, uHighTint;
uniform float uExposure, uTime, uMist, uMistBase, uCloudShadow, uShafts, uSat, uContrast, uVignette, uGrain, uNear, uFar, uWind, uFlash;
uniform vec2 uRes;
varying vec2 vUv;

vec3 aces(vec3 color) {
  // Same fit as three.js ACESFilmicToneMapping.
  const mat3 ACESInputMat = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 ACESOutputMat = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  color *= uExposure / 0.6;
  color = ACESInputMat * color;
  vec3 a = color * (color + 0.0245786) - 0.000090537;
  vec3 b = color * (0.983729 * color + 0.4329510) + 0.238081;
  color = ACESOutputMat * (a / b);
  return clamp(color, 0., 1.);
}
float hsh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y);
}
vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c));
}

void main() {
  vec3 col = texture2D(tColor, vUv).rgb;
  float z = texture2D(tDepth, vUv).r;
  bool sky = z > .99999;

  // Rebuild the view ray and distance from depth.
  vec4 ndc = vec4(vUv * 2. - 1., z * 2. - 1., 1.);
  vec4 vp = uInvProj * ndc;
  vp /= vp.w;
  vec3 rayV = normalize(vp.xyz);
  vec3 ray = normalize((uCamWorld * vec4(rayV, 0.)).xyz);
  float dist = sky ? 400. : length(vp.xyz);
  vec3 wp = uCamPos + ray * dist;

  // Moving cloud shadows on the land.
  if (!sky && uCloudShadow > .001) {
    vec2 q = wp.xz * .011 + vec2(uTime * .02, uTime * .012) * (.4 + uWind);
    float c = vn(q) * .65 + vn(q * 2.3 + 5.) * .35;
    col *= 1. - smoothstep(.45, .7, c) * uCloudShadow;
  }

  // Low mist: density falls off with height, integrated along the view ray.
  float b = .32;
  float ry = abs(ray.y) < 1e-3 ? 1e-3 : ray.y;
  float camH = max(uCamPos.y - uMistBase, 0.);
  float mist = uMist * exp(-b * camH) * (1. - exp(-b * ry * min(dist, 260.))) / (b * ry);
  mist = 1. - exp(-max(mist, 0.));
  float toward = pow(max(dot(ray, uSunDir), 0.), 6.);
  vec3 mistCol = uFogColor * 1.05 + uSunColor * toward * .5;
  col = mix(col, mistCol, clamp(mist, 0., sky ? .3 : .9));

  // Light through the leaves.
  float sh = texture2D(tShafts, vUv).r;
  col += uSunColor * sh * uShafts * (1. + toward);

  col = aces(col);

  // Grade: gentle S-curve, saturation, split toning, vignette, grain.
  col = mix(col, col * col * (3. - 2. * col), uContrast);
  float l = dot(col, vec3(.2126, .7152, .0722));
  col = mix(vec3(l), col, uSat);
  col *= mix(uShadowTint, vec3(1.), smoothstep(.0, .45, l));
  col *= mix(vec3(1.), uHighTint, smoothstep(.45, 1., l));
  vec2 vq = vUv - .5;
  col *= 1. - dot(vq, vq) * uVignette;
  col += uFlash;
  col = toSRGB(clamp(col, 0., 1.));
  float g = hsh(vUv * uRes + fract(uTime * 7.13) * 100.) - .5;
  col += g * uGrain * (1.2 - l);
  gl_FragColor = vec4(col, 1.);
}`;

export interface GradeParams {
  exposure: number;
  sunDir: THREE.Vector3;
  sunColor: THREE.Color;
  fogColor: THREE.Color;
  mist: number;
  cloudShadow: number;
  shafts: number;
  night: number;
  golden: number;
  wet: number;
  wind: number;
  time: number;
}

export class Post {
  readonly quality: Quality;
  private rt: THREE.WebGLRenderTarget;
  private shaftRT: THREE.WebGLRenderTarget;
  private quad: THREE.Mesh;
  private fsScene = new THREE.Scene();
  private fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private shaftMat: THREE.ShaderMaterial;
  private compMat: THREE.ShaderMaterial;
  private sunNdc = new THREE.Vector3();
  /** A named look the player can pick in photo mode. */
  look: 'natural' | 'warm' | 'faded' | 'mono' = 'natural';
  /** Brief white flash for the camera shutter. */
  flash = 0;

  constructor(quality: Quality) {
    this.quality = quality;
    const depth = new THREE.DepthTexture(1, 1);
    depth.type = THREE.UnsignedIntType;
    this.rt = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: quality === 'low' ? 0 : 4,
      depthTexture: depth,
      depthBuffer: true,
    });
    this.shaftRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType, depthBuffer: false });
    this.shaftMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: SHAFT_FRAG,
      uniforms: { tDepth: { value: depth }, tColor: { value: this.rt.texture }, uSun: { value: new THREE.Vector2() }, uAspect: { value: 1 } },
      depthTest: false,
      depthWrite: false,
    });
    this.compMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COMPOSITE_FRAG,
      uniforms: {
        tColor: { value: this.rt.texture },
        tDepth: { value: depth },
        tShafts: { value: this.shaftRT.texture },
        uInvProj: { value: new THREE.Matrix4() },
        uCamWorld: { value: new THREE.Matrix4() },
        uCamPos: { value: new THREE.Vector3() },
        uSunDir: { value: new THREE.Vector3() },
        uSunColor: { value: new THREE.Color() },
        uFogColor: { value: new THREE.Color() },
        uShadowTint: { value: new THREE.Color(1, 1, 1) },
        uHighTint: { value: new THREE.Color(1, 1, 1) },
        uExposure: { value: 1 },
        uTime: { value: 0 },
        uMist: { value: 0 },
        uMistBase: { value: 0 },
        uCloudShadow: { value: 0 },
        uShafts: { value: 0 },
        uSat: { value: 1 },
        uContrast: { value: 0.2 },
        uVignette: { value: 0.7 },
        uGrain: { value: 0.03 },
        uNear: { value: 0.1 },
        uFar: { value: 400 },
        uWind: { value: 0 },
        uFlash: { value: 0 },
        uRes: { value: new THREE.Vector2(1, 1) },
      },
      depthTest: false,
      depthWrite: false,
    });
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.quad = new THREE.Mesh(tri, this.compMat);
    this.quad.frustumCulled = false;
    this.fsScene.add(this.quad);
  }

  setSize(w: number, h: number) {
    this.rt.setSize(w, h);
    this.shaftRT.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1));
    this.compMat.uniforms.uRes.value.set(w, h);
    this.shaftMat.uniforms.uAspect.value = w / Math.max(1, h);
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, g: GradeParams) {
    renderer.setRenderTarget(this.rt);
    renderer.render(scene, camera);

    const u = this.compMat.uniforms;
    // Where is the sun on screen?
    this.sunNdc.copy(camera.position).addScaledVector(g.sunDir, 200).project(camera);
    const ahead = camera.getWorldDirection(new THREE.Vector3()).dot(g.sunDir);
    const onScreen = Math.max(0, 1 - Math.max(0, Math.max(Math.abs(this.sunNdc.x), Math.abs(this.sunNdc.y)) - 1) * 1.2);
    let shafts = g.shafts * onScreen * THREE.MathUtils.smoothstep(ahead, 0.05, 0.4);
    if (this.quality === 'low') shafts = 0;
    if (shafts > 0.002) {
      this.shaftMat.uniforms.uSun.value.set(this.sunNdc.x * 0.5 + 0.5, this.sunNdc.y * 0.5 + 0.5);
      this.quad.material = this.shaftMat;
      renderer.setRenderTarget(this.shaftRT);
      renderer.render(this.fsScene, this.fsCam);
    }
    u.uShafts.value = shafts;

    u.uInvProj.value.copy(camera.projectionMatrixInverse);
    u.uCamWorld.value.copy(camera.matrixWorld);
    u.uCamPos.value.copy(camera.position);
    u.uSunDir.value.copy(g.sunDir);
    u.uSunColor.value.copy(g.sunColor);
    u.uFogColor.value.copy(g.fogColor);
    u.uExposure.value = g.exposure;
    u.uTime.value = g.time;
    u.uMist.value = g.mist;
    u.uMistBase.value = camera.position.y - 1.6;
    u.uCloudShadow.value = g.cloudShadow;
    u.uWind.value = g.wind;
    u.uFlash.value = this.flash;
    this.grade(g);

    this.quad.material = this.compMat;
    renderer.setRenderTarget(null);
    renderer.render(this.fsScene, this.fsCam);
  }

  /** Time of day and weather set the grade; photo-mode looks sit on top. */
  private grade(g: GradeParams) {
    const u = this.compMat.uniforms;
    const shadow = u.uShadowTint.value as THREE.Color;
    const high = u.uHighTint.value as THREE.Color;
    // Day: faintly cool shadows, warm highlights. Golden hour: teal and amber. Night: blue.
    shadow.setRGB(0.96, 0.99, 1.04).lerp(new THREE.Color(0.86, 0.98, 1.06), g.golden).lerp(new THREE.Color(0.82, 0.9, 1.12), g.night);
    high.setRGB(1.03, 1.0, 0.96).lerp(new THREE.Color(1.1, 1.0, 0.86), g.golden).lerp(new THREE.Color(0.92, 0.97, 1.06), g.night);
    let sat = 1.08 - g.night * 0.35 - g.wet * 0.12;
    let contrast = 0.18 + g.golden * 0.06;
    let vignette = 0.75;
    let grain = 0.028 + g.night * 0.02;
    switch (this.look) {
      case 'warm':
        high.multiply(new THREE.Color(1.08, 1.0, 0.88));
        shadow.multiply(new THREE.Color(1.02, 0.98, 0.94));
        sat *= 1.1;
        break;
      case 'faded':
        sat *= 0.78;
        contrast = -0.1;
        shadow.multiply(new THREE.Color(1.06, 1.06, 1.1));
        grain *= 1.6;
        break;
      case 'mono':
        sat = 0;
        contrast = 0.32;
        vignette = 1.0;
        grain *= 1.8;
        break;
    }
    u.uSat.value = sat;
    u.uContrast.value = contrast;
    u.uVignette.value = vignette;
    u.uGrain.value = grain;
  }

  dispose() {
    this.rt.dispose();
    this.shaftRT.dispose();
  }
}

/** A first guess at what this device can carry; frame timing adjusts from there. */
export function detectQuality(renderer: THREE.WebGLRenderer): Quality {
  const forced = new URLSearchParams(location.search).get('quality');
  if (forced === 'low' || forced === 'medium' || forced === 'high') return forced;
  try {
    const stored = localStorage.getItem('moodgarden.quality');
    if (stored === 'low' || stored === 'medium' || stored === 'high') return stored;
  } catch {
    /* no storage */
  }
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  if (/Mali-(T|G5|G6[0-8])|Adreno \(TM\) [3-5]\d\d|PowerVR|SwiftShader/i.test(name) || mem <= 2) return 'low';
  if (/Apple GPU|Adreno \(TM\) (7[3-9]\d|8\d\d)|Mali-G7[1-9]|Mali-G[7-9]\d\d|Immortalis|NVIDIA|AMD|Radeon|Intel/i.test(name)) return 'high';
  return 'medium';
}
