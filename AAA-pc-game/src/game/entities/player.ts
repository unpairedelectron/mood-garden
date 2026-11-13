// The Keeper: a small robed wanderer with a wide hat, a trailing scarf that
// gains a band of colour for every grove awakened, and a lantern wisp.

import * as THREE from 'three';
import { clamp, damp, dampAngle, lerp } from '../core/math';
import { MOODS } from '../data/moods';
import { patchMaterial, replace } from '../render/shared';
import { glowPoints, type Collider } from '../world/flora';
import type { Terrain } from '../world/terrain';

export interface PlayerInput {
  moveX: number;
  moveY: number;
  sprint: boolean;
  jump: boolean;
  jumpHeld: boolean;
}
export interface PlayerEvents {
  step: boolean;
  jumped: boolean;
  landed: number;
  splash: boolean;
}

const WALK = 5.4;
const RUN = 9.6;
const GRAVITY = 27;
const JUMP = 9.4;
const RADIUS = 0.38;
const SCARF_N = 13;

export class Player {
  readonly group = new THREE.Group();
  readonly scarf: THREE.Mesh;
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  readonly light = new THREE.PointLight(0xffd9a0, 0, 16, 1.6);
  /** World position of the lantern wisp (motes and particles home in on it). */
  readonly wisp = new THREE.Vector3();
  yaw = Math.PI;
  grounded = true;
  gliding = false;
  speed = 0;
  wading = false;
  events: PlayerEvents = { step: false, jumped: false, landed: 0, splash: false };

  private terrain: Terrain;
  private grid = new Map<number, Collider[]>();
  private body = new THREE.Group();
  private armL: THREE.Mesh;
  private armR: THREE.Mesh;
  private hat: THREE.Mesh;
  private wispMesh: THREE.Mesh;
  private wispGlow: THREE.Points;
  private sway = { value: new THREE.Vector3() };
  private flare = { value: 0 };
  private stepPhase = 0;
  private coyote = 0;
  private jumpBuffer = 0;
  private airTime = 0;
  private squash = 0;
  private squashVel = 0;
  private bank = 0;
  private time = 0;
  private scarfPts: THREE.Vector3[] = [];
  private scarfPrev: THREE.Vector3[] = [];
  private scarfColors: Float32Array;
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private n = new THREE.Vector3();

  constructor(terrain: Terrain, colliders: Collider[]) {
    this.terrain = terrain;
    for (const c of colliders) this.addCollider(c);

    const cloth = (color: number) =>
      patchMaterial(
        new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide }),
        'cloth',
        (s) => {
          s.vertexShader = replace(s.vertexShader, '#include <common>', '#include <common>\nuniform vec3 uSway; uniform float uFlare;');
          s.vertexShader = replace(
            s.vertexShader,
            '#include <begin_vertex>',
            `vec3 transformed = position;
             float low = pow(clamp(1. - position.y / 1.05, 0., 1.), 1.6);
             transformed.xz *= 1. + uFlare * low * 0.9;
             transformed.xz += uSway.xz * low;
             transformed.y += uSway.y * low * 0.5;`,
          );
        },
        { uSway: this.sway, uFlare: this.flare },
      );
    const lathe = (pts: [number, number][], mat: THREE.Material, seg = 20) => {
      const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg), mat);
      m.castShadow = true;
      return m;
    };
    const robe = lathe(
      [[0.36, 0.02], [0.37, 0.08], [0.31, 0.36], [0.22, 0.7], [0.17, 0.94], [0.12, 1.06]],
      cloth(0xefe6d2),
    );
    const trim = lathe([[0.365, 0.0], [0.385, 0.06], [0.375, 0.13]], cloth(0x2f4c8c));
    const cape = lathe(
      [[0.1, 1.12], [0.2, 1.05], [0.275, 0.92], [0.29, 0.78], [0.27, 0.76]],
      new THREE.MeshStandardMaterial({ color: 0x2f4c8c, roughness: 0.8, side: THREE.DoubleSide }),
    );
    const skin = new THREE.MeshStandardMaterial({ color: 0xf2cba6, roughness: 0.7 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.155, 20, 16), skin);
    head.position.y = 1.22;
    head.castShadow = true;
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1b1a22 });
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), eyeMat);
      eye.position.set(sx * 0.058, 1.235, 0.14);
      eye.scale.y = 1.4;
      this.body.add(eye);
    }
    this.hat = lathe(
      [[0.0, 1.56], [0.07, 1.5], [0.2, 1.4], [0.45, 1.3], [0.47, 1.285], [0.44, 1.28], [0.18, 1.345], [0.0, 1.36]],
      new THREE.MeshStandardMaterial({ color: 0xd8ad62, roughness: 0.9, side: THREE.DoubleSide }),
      26,
    );
    const band = lathe([[0.215, 1.392], [0.23, 1.378], [0.245, 1.372]], new THREE.MeshStandardMaterial({ color: 0xc8432f, roughness: 0.7, side: THREE.DoubleSide }));
    const sleeve = new THREE.MeshStandardMaterial({ color: 0xefe6d2, roughness: 0.85 });
    const armGeo = new THREE.CapsuleGeometry(0.058, 0.3, 4, 10);
    armGeo.translate(0, -0.2, 0);
    this.armL = new THREE.Mesh(armGeo, sleeve);
    this.armR = new THREE.Mesh(armGeo, sleeve);
    this.armL.position.set(0.2, 1.0, 0);
    this.armR.position.set(-0.2, 1.0, 0);
    this.armL.castShadow = this.armR.castShadow = true;
    this.body.add(robe, trim, cape, head, this.hat, band, this.armL, this.armR);
    this.group.add(this.body);
    this.group.rotation.order = 'YXZ';

    // Lantern wisp
    this.wispMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 10),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.6, 1.8) }),
    );
    this.wispGlow = glowPoints([new THREE.Vector3()], 0xffcf8a, 1.4);

    // Scarf ribbon simulated with verlet points, rebuilt every frame in world space.
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SCARF_N * 2 * 3), 3));
    this.scarfColors = new Float32Array(SCARF_N * 2 * 3);
    sg.setAttribute('color', new THREE.BufferAttribute(this.scarfColors, 3));
    const idx: number[] = [];
    for (let i = 0; i < SCARF_N - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    sg.setIndex(idx);
    this.scarf = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    this.scarf.frustumCulled = false;
    for (let i = 0; i < SCARF_N; i++) {
      this.scarfPts.push(new THREE.Vector3());
      this.scarfPrev.push(new THREE.Vector3());
    }
    this.setAwakened([], 1);
  }

  /** Objects that live in world space rather than under the player group. */
  get extras(): THREE.Object3D[] {
    return [this.scarf, this.wispMesh, this.wispGlow, this.light];
  }

  addCollider(c: Collider) {
    const k = (Math.floor(c.x / 8) + 512) * 1024 + Math.floor(c.z / 8) + 512;
    let l = this.grid.get(k);
    if (!l) this.grid.set(k, (l = []));
    l.push(c);
  }

  /**
   * Fraction (0..1) along the ground segment a->b at which a solid obstacle
   * (rock, standing stone, big trunk) is first met. Used to keep the camera out of them.
   */
  segmentHit(ax: number, az: number, bx: number, bz: number, pad = 0.45): number {
    let best = 1;
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-6) return 1;
    const x0 = Math.floor(Math.min(ax, bx) / 8) - 1;
    const x1 = Math.floor(Math.max(ax, bx) / 8) + 1;
    const z0 = Math.floor(Math.min(az, bz) / 8) - 1;
    const z1 = Math.floor(Math.max(az, bz) / 8) + 1;
    for (let gx = x0; gx <= x1; gx++) {
      for (let gz = z0; gz <= z1; gz++) {
        const list = this.grid.get((gx + 512) * 1024 + gz + 512);
        if (!list) continue;
        for (const c of list) {
          if (c.r < 0.55) continue; // thin trunks are fine to orbit past
          const r = c.r + pad;
          const fx = ax - c.x;
          const fz = az - c.z;
          const b = fx * dx + fz * dz;
          const cc = fx * fx + fz * fz - r * r;
          if (cc < 0) continue; // the target itself is inside: ignore
          const disc = b * b - len2 * cc;
          if (disc < 0) continue;
          const t = (-b - Math.sqrt(disc)) / len2;
          if (t >= 0 && t < best) best = t;
        }
      }
    }
    return best;
  }

  /** Colour the scarf: one glowing band per awakened grove. */
  setAwakened(ids: string[], light: number) {
    const c = new THREE.Color();
    const base = new THREE.Color(0x9a938a);
    for (let i = 0; i < SCARF_N; i++) {
      const seg = Math.min(5, Math.floor((i / SCARF_N) * 6));
      const m = MOODS[seg];
      if (ids.includes(m.id)) c.set(m.color).multiplyScalar(0.55 + light * 1.2);
      else c.copy(base).multiplyScalar(0.25 + light * 0.75);
      for (let k = 0; k < 2; k++) c.toArray(this.scarfColors, (i * 2 + k) * 3);
    }
    (this.scarf.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  teleport(x: number, z: number, yaw = this.yaw) {
    this.pos.set(x, this.terrain.heightAt(x, z), z);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.grounded = true;
    this.syncVisual(0);
    for (let i = 0; i < SCARF_N; i++) {
      this.scarfPts[i].copy(this.pos).add(this.tmp.set(-Math.sin(yaw) * i * 0.1, 1.08 - i * 0.05, -Math.cos(yaw) * i * 0.1));
      this.scarfPrev[i].copy(this.scarfPts[i]);
    }
  }

  update(dt: number, input: PlayerInput, camYaw: number, night: number) {
    const t = this.terrain;
    const ev = this.events;
    ev.step = ev.jumped = ev.splash = false;
    ev.landed = 0;
    this.time += dt;

    // Desired velocity relative to the camera.
    const fx = -Math.sin(camYaw);
    const fz = -Math.cos(camYaw);
    let dx = fx * input.moveY + -fz * input.moveX;
    let dz = fz * input.moveY + fx * input.moveX;
    const mag = Math.min(1, Math.hypot(dx, dz));
    if (mag > 0.001) {
      const l = Math.hypot(dx, dz);
      dx /= l;
      dz /= l;
    }
    const ground = t.heightAt(this.pos.x, this.pos.z);
    this.wading = ground < 0.05 && this.pos.y < 0.3;
    let top = input.sprint ? RUN : WALK;
    if (this.wading) top *= 0.62;
    if (this.gliding) top = 8.5;
    // Uphill is slower, downhill a touch faster.
    if (this.grounded && mag > 0) {
      const ahead = t.heightAt(this.pos.x + dx * 0.8, this.pos.z + dz * 0.8);
      const grade = (ahead - ground) / 0.8;
      top *= clamp(1 - grade * 0.45, 0.45, 1.12);
    }
    const accel = this.grounded ? (mag > 0 ? 34 : 26) : 9;
    this.vel.x = damp(this.vel.x, dx * mag * top, accel / top, dt);
    this.vel.z = damp(this.vel.z, dz * mag * top, accel / top, dt);

    // Jump with coyote time and input buffering; hold to glide on the way down.
    this.coyote = this.grounded ? 0.12 : this.coyote - dt;
    this.jumpBuffer = input.jump ? 0.14 : this.jumpBuffer - dt;
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vel.y = JUMP;
      this.grounded = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.airTime = 0;
      ev.jumped = true;
      this.squashVel = 4;
    }
    if (!this.grounded) {
      this.airTime += dt;
      this.vel.y -= GRAVITY * dt;
      this.gliding = input.jumpHeld && this.vel.y < -0.5 && this.airTime > 0.28;
      if (this.gliding) this.vel.y = damp(this.vel.y, -2.3, 9, dt);
    } else this.gliding = false;

    // Integrate horizontally, refusing cliffs that are too steep and deep water.
    const px = this.pos.x;
    const pz = this.pos.z;
    let nx = px + this.vel.x * dt;
    let nz = pz + this.vel.z * dt;
    const tryMove = (x: number, z: number) => {
      const h = t.heightAt(x, z);
      if (h < -1.15) return false;
      if (this.grounded && h > this.pos.y + 0.05 && t.slopeAt(x, z) > 0.4) return false;
      if (!this.grounded && h > this.pos.y + 0.9) return false;
      return true;
    };
    if (!tryMove(nx, nz)) {
      if (tryMove(nx, pz)) nz = pz;
      else if (tryMove(px, nz)) nx = px;
      else {
        nx = px;
        nz = pz;
      }
      this.vel.x = (nx - px) / Math.max(dt, 1e-4);
      this.vel.z = (nz - pz) / Math.max(dt, 1e-4);
    }
    // Circle colliders (trees, rocks, standing stones).
    const cx = Math.floor(nx / 8);
    const cz = Math.floor(nz / 8);
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      for (let gz = cz - 1; gz <= cz + 1; gz++) {
        const list = this.grid.get((gx + 512) * 1024 + gz + 512);
        if (!list) continue;
        for (const c of list) {
          const ox = nx - c.x;
          const oz = nz - c.z;
          const d = Math.hypot(ox, oz);
          const min = c.r + RADIUS;
          if (d < min && d > 1e-4) {
            nx = c.x + (ox / d) * min;
            nz = c.z + (oz / d) * min;
          }
        }
      }
    }
    this.pos.x = nx;
    this.pos.z = nz;
    this.pos.y += this.vel.y * dt;

    const gh = t.heightAt(nx, nz);
    const floor = Math.max(gh, -0.55); // wade, never sink
    if (this.grounded) {
      if (this.pos.y - floor < 0.55) this.pos.y = floor;
      else this.grounded = false;
      this.vel.y = 0;
    } else if (this.pos.y <= floor && this.vel.y <= 0) {
      ev.landed = Math.min(1, -this.vel.y / 16);
      this.squashVel = -3 - ev.landed * 5;
      this.pos.y = floor;
      this.vel.y = 0;
      this.grounded = true;
      if (gh < 0) ev.splash = true;
    }

    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.speed > 0.4) {
      const want = Math.atan2(this.vel.x, this.vel.z);
      const before = this.yaw;
      this.yaw = dampAngle(this.yaw, want, 11, dt);
      this.bank = damp(this.bank, clamp((this.yaw - before) / Math.max(dt, 1e-4), -6, 6) * -0.05, 8, dt);
    } else this.bank = damp(this.bank, 0, 8, dt);

    if (this.grounded && this.speed > 0.6) {
      const before = Math.floor(this.stepPhase);
      this.stepPhase += this.speed * dt * 0.62;
      if (Math.floor(this.stepPhase) !== before) {
        ev.step = true;
        if (this.wading) ev.splash = true;
      }
    }
    this.syncVisual(dt);
    this.updateScarf(dt);

    // Wisp hovers by the shoulder, bobbing, and lights the way at night.
    const wy = 1.25 + Math.sin(this.time * 1.7) * 0.12;
    const wa = this.yaw + 2.2 + Math.sin(this.time * 0.6) * 0.3;
    this.tmp.set(this.pos.x + Math.sin(wa) * 0.62, this.pos.y + wy, this.pos.z + Math.cos(wa) * 0.62);
    this.wisp.lerp(this.tmp, 1 - Math.exp(-7 * dt));
    this.wispMesh.position.copy(this.wisp);
    this.wispGlow.position.copy(this.wisp);
    this.light.position.copy(this.wisp).y += 0.5;
    this.light.intensity = lerp(0.6, 16, night);
  }

  private syncVisual(dt: number) {
    const g = this.group;
    const moving = this.grounded ? Math.min(1, this.speed / RUN) : 0;
    const bob = Math.abs(Math.sin(this.stepPhase * Math.PI)) * 0.07 * moving;
    this.squashVel += (-this.squash * 190 - this.squashVel * 15) * dt;
    this.squash += this.squashVel * dt;
    g.position.set(this.pos.x, this.pos.y + bob, this.pos.z);
    g.rotation.y = this.yaw;
    g.rotation.x = this.gliding ? 0.42 : (this.speed / RUN) * 0.2;
    g.rotation.z = this.bank;
    const sq = clamp(this.squash, -0.3, 0.3);
    this.body.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);

    // Robe lags behind motion; arms swing; glide spreads everything out.
    const sy = Math.sin(-this.yaw);
    const cy = Math.cos(-this.yaw);
    const lx = this.vel.x * cy + this.vel.z * sy;
    const lz = -this.vel.x * sy + this.vel.z * cy;
    const sw = this.sway.value;
    const k = 1 - Math.exp(-8 * Math.max(dt, 0.001));
    sw.x += (-lx * 0.03 + Math.sin(this.time * 2.1) * 0.012 - sw.x) * k;
    sw.z += (-lz * 0.035 + Math.sin(this.stepPhase * Math.PI * 2) * 0.03 * moving - sw.z) * k;
    sw.y += (clamp(-this.vel.y * 0.03, -0.1, 0.35) - sw.y) * k;
    this.flare.value += ((this.gliding ? 1 : this.grounded ? 0 : 0.35) - this.flare.value) * k;
    const swing = Math.sin(this.stepPhase * Math.PI) * 0.75 * moving;
    const spread = this.flare.value * 1.35;
    this.armL.rotation.set(swing, 0, 0.12 + spread);
    this.armR.rotation.set(-swing, 0, -0.12 - spread);
    this.hat.rotation.x = -0.06 + sw.y * 0.4;
  }

  private updateScarf(dt: number) {
    const pts = this.scarfPts;
    const prev = this.scarfPrev;
    const sy = Math.sin(this.yaw);
    const cy = Math.cos(this.yaw);
    // Anchor at the back of the neck.
    pts[0].set(this.group.position.x - sy * 0.13, this.group.position.y + 1.1, this.group.position.z - cy * 0.13);
    const wind = Math.sin(this.time * 1.3) * 0.5 + 0.8;
    const step = Math.min(dt, 1 / 30);
    for (let i = 1; i < SCARF_N; i++) {
      const p = pts[i];
      const vx = (p.x - prev[i].x) * 0.94;
      const vy = (p.y - prev[i].y) * 0.94;
      const vz = (p.z - prev[i].z) * 0.94;
      prev[i].copy(p);
      p.x += vx + (0.9 * wind + Math.sin(this.time * 3.1 + i * 0.7) * 0.6) * step * step * 3;
      p.y += vy + (-5.5 + Math.sin(this.time * 4.3 + i) * 1.6) * step * step;
      p.z += vz + (0.5 * wind + Math.cos(this.time * 2.7 + i * 0.9) * 0.6) * step * step * 3;
    }
    const seg = 0.115;
    for (let it = 0; it < 3; it++) {
      for (let i = 1; i < SCARF_N; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        this.tmp.subVectors(b, a);
        const d = this.tmp.length() || 1e-4;
        b.copy(a).addScaledVector(this.tmp, seg / d);
        const gh = this.terrain.heightAt(b.x, b.z) + 0.05;
        if (b.y < gh) b.y = gh;
      }
    }
    const pa = this.scarf.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < SCARF_N; i++) {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(SCARF_N - 1, i + 1)];
      this.tmp.subVectors(b, a).normalize();
      this.n.set(0, 1, 0).cross(this.tmp);
      if (this.n.lengthSq() < 1e-4) this.n.set(1, 0, 0);
      this.n.normalize().multiplyScalar(0.07 * (1 - (i / SCARF_N) * 0.35));
      this.tmp2.copy(pts[i]).add(this.n);
      pa.setXYZ(i * 2, this.tmp2.x, this.tmp2.y, this.tmp2.z);
      this.tmp2.copy(pts[i]).sub(this.n);
      pa.setXYZ(i * 2 + 1, this.tmp2.x, this.tmp2.y, this.tmp2.z);
    }
    pa.needsUpdate = true;
  }
}
