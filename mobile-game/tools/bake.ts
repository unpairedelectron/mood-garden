// Offline tool (not shipped): bakes a heavy scanned tree into a multi-angle
// impostor atlas. Run through tools/bake.mjs, which drives this page headlessly.
//
// Output per tree:
//   albedo atlas  – unlit colour + alpha, COLS x ROWS views around the trunk
//   normal atlas  – RG = view-space normal xy, B = sky exposure (soft occlusion)

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const COLS = 4;
const ROWS = 2;
const VIEWS = COLS * ROWS;

interface BakeResult { albedo: string; normal: string; width: number; height: number; cellW: number; cellH: number; tris: number }

async function bake(name: string, cellH = 640): Promise<BakeResult> {
  const gltf = await new GLTFLoader().loadAsync(`/tools/raw/${name}/${name}.gltf`);
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  root.position.set(-centre.x, -box.min.y, -centre.z);
  root.updateMatrixWorld(true);
  const radius = Math.hypot(size.x, size.z) / 2;
  const width = radius * 2;
  const height = size.y;
  const cellW = Math.min(cellH, Math.max(64, Math.round((cellH * width) / height / 16) * 16));

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(cellW, cellH);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(root);
  const cam = new THREE.OrthographicCamera(-radius, radius, height, 0, 0.1, radius * 6 + 10);

  // Three material sets sharing the source diffuse map (for leaf cut-outs).
  let tris = 0;
  const meshes: { mesh: THREE.Mesh; albedo: THREE.Material; normal: THREE.Material; occ: THREE.Material }[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const src = mesh.material as THREE.MeshStandardMaterial;
    const map = src.map;
    const cut = src.alphaTest > 0 || src.transparent || (src as unknown as { alphaMode?: string }).alphaMode === 'MASK';
    const g = mesh.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    mesh.castShadow = mesh.receiveShadow = true;
    const albedo = new THREE.MeshBasicMaterial({ map, color: src.color, alphaTest: cut ? 0.5 : 0, side: THREE.DoubleSide });
    const normal = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { map: { value: map }, cut: { value: cut && map ? 1 : 0 } },
      vertexShader: `varying vec3 vN; varying vec2 vU; void main(){ vN = normalMatrix * normal; vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform sampler2D map; uniform float cut; varying vec3 vN; varying vec2 vU;
        void main(){ if (cut > .5 && texture2D(map, vU).a < .5) discard; vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
        if (n.z < 0.) n.z = -n.z; gl_FragColor = vec4(n * .5 + .5, 1.); }`,
    });
    const occ = new THREE.MeshLambertMaterial({ color: 0xffffff, alphaMap: null, map, alphaTest: cut ? 0.5 : 0, side: THREE.DoubleSide });
    occ.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', '#ifdef USE_MAP\n diffuseColor.a *= texture2D(map, vMapUv).a;\n#endif');
    };
    meshes.push({ mesh, albedo, normal, occ });
  });
  const use = (k: 'albedo' | 'normal' | 'occ') => meshes.forEach((m) => (m.mesh.material = m[k]));

  const light = new THREE.DirectionalLight(0xffffff, Math.PI);
  light.castShadow = true;
  light.shadow.mapSize.set(4096, 4096);
  light.shadow.bias = -0.002;
  light.shadow.normalBias = 0.02;
  const sc = light.shadow.camera;
  sc.left = sc.bottom = -radius * 1.3;
  sc.right = sc.top = radius * 1.3;
  sc.near = 0.1;
  sc.far = height * 4 + radius * 4;
  scene.add(light, light.target);
  light.target.position.set(0, height / 2, 0);

  const mk = (w: number, h: number) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };
  const atlasA = mk(cellW * COLS, cellH * ROWS);
  const atlasN = mk(cellW * COLS, cellH * ROWS);
  const ca = atlasA.getContext('2d')!;
  const cn = atlasN.getContext('2d')!;
  const tmp = mk(cellW, cellH).getContext('2d', { willReadFrequently: true })!;
  const grab = () => {
    tmp.clearRect(0, 0, cellW, cellH);
    tmp.drawImage(renderer.domElement, 0, 0);
    return tmp.getImageData(0, 0, cellW, cellH);
  };
  // Sky-exposure is averaged over a few overhead light directions.
  const lights: [number, number][] = [[0, 1.45], [0.6, 1.0], [2.7, 1.0], [4.8, 1.0]];

  for (let i = 0; i < VIEWS; i++) {
    const th = (i / VIEWS) * Math.PI * 2;
    cam.position.set(Math.sin(th) * radius * 3, 0, Math.cos(th) * radius * 3);
    cam.lookAt(0, 0, 0);
    cam.position.y = 0;
    cam.updateMatrixWorld();
    const x = (i % COLS) * cellW;
    const y = Math.floor(i / COLS) * cellH;

    light.visible = false;
    use('albedo');
    renderer.render(scene, cam);
    const A = grab();
    use('normal');
    renderer.render(scene, cam);
    const N = grab();
    light.visible = true;
    use('occ');
    const acc = new Float32Array(cellW * cellH);
    for (const [az, el] of lights) {
      light.position.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).multiplyScalar(height * 2 + radius * 2);
      light.position.y += height / 2;
      renderer.render(scene, cam);
      const O = grab();
      for (let p = 0; p < acc.length; p++) acc[p] += O.data[p * 4] / lights.length;
    }
    for (let p = 0; p < acc.length; p++) {
      N.data[p * 4 + 2] = Math.min(255, acc[p] * 1.15);
      N.data[p * 4 + 3] = 255;
    }
    // Bleed colour outward into transparent texels so mip-mapping never shows a dark fringe.
    const d = A.data;
    for (let pass = 0; pass < 10; pass++) {
      const snap = new Uint8ClampedArray(d);
      for (let py = 0; py < cellH; py++) {
        for (let px = 0; px < cellW; px++) {
          const k = (py * cellW + px) * 4;
          if (snap[k + 3] > 0) continue;
          let r = 0, g = 0, b = 0, n = 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const qx = px + dx, qy = py + dy;
            if (qx < 0 || qy < 0 || qx >= cellW || qy >= cellH) continue;
            const q = (qy * cellW + qx) * 4;
            if (snap[q + 3] > 0) { r += snap[q]; g += snap[q + 1]; b += snap[q + 2]; n++; }
          }
          if (n) { d[k] = r / n; d[k + 1] = g / n; d[k + 2] = b / n; d[k + 3] = 1; }
        }
      }
    }
    for (let p = 0; p < acc.length; p++) if (d[p * 4 + 3] === 1) d[p * 4 + 3] = 0;
    // (alpha 0 keeps its bled RGB because the PNG is written non-premultiplied)
    ca.putImageData(A, x, y);
    cn.putImageData(N, x, y);
  }
  renderer.dispose();
  renderer.domElement.remove();
  return { albedo: atlasA.toDataURL('image/png'), normal: atlasN.toDataURL('image/png'), width, height, cellW, cellH, tris };
}

(window as unknown as { bake: typeof bake }).bake = bake;
