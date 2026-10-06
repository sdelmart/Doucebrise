import * as THREE from 'three';
import { lerpAngle, damp, clamp } from '../core/math.js';

// Déplacement du joueur : relatif à la caméra, glisse le long des obstacles,
// gravité et saut, petites marches (pontons) franchissables.

const WALK = 4.6;
const RUN = 8.2;
const GRAVITY = 24;
const JUMP = 7.4;
const RADIUS = 0.36;
const STEP = 0.75;

export class Player {
  constructor(world, character) {
    this.world = world;
    this.character = character;
    this.pos = new THREE.Vector3(0, 0, 8);
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.rotY = Math.PI;
    this.grounded = true;
    this.running = false;
    this.speed = 0;
    this.frozen = false;
    this.teleport(-6, 12, Math.PI);
  }

  teleport(x, z, rotY = this.rotY) {
    this.pos.set(x, this.world.groundAt(x, z), z);
    this.vel.set(0, 0, 0);
    this.vy = 0;
    this.rotY = rotY;
    this.sync();
  }

  forward(out = new THREE.Vector3()) {
    return out.set(Math.sin(this.rotY), 0, Math.cos(this.rotY));
  }

  canStand(x, z, fromY) {
    if (!this.world.isWalkable(x, z)) return false;
    return this.world.groundAt(x, z) - fromY <= STEP;
  }

  update(dt, input, camYaw) {
    if (this.vehicle) {
      this.updateVehicle(dt, input, camYaw);
      return;
    }
    if (this.seated) {
      this.speed = 0;
      this.sync();
      this.character.update(dt, { speed: 0, running: false, grounded: true, vy: 0 });
      return;
    }
    const mv = this.frozen ? { x: 0, y: 0 } : input.moveVector();
    this.running = !this.frozen && (input.down('ShiftLeft', 'ShiftRight') || Math.hypot(mv.x, mv.y) > 0.92 && input.joystick.active);
    const fx = -Math.sin(camYaw);
    const fz = -Math.cos(camYaw);
    const rx = Math.cos(camYaw);
    const rz = -Math.sin(camYaw);
    let dx = fx * mv.y + rx * mv.x;
    let dz = fz * mv.y + rz * mv.x;
    const len = Math.hypot(dx, dz);
    const max = this.running ? RUN : WALK;
    const tx = len > 0.01 ? (dx / Math.max(len, 1)) * max : 0;
    const tz = len > 0.01 ? (dz / Math.max(len, 1)) * max : 0;
    const accel = this.grounded ? 12 : 4;
    this.vel.x = damp(this.vel.x, tx, accel, dt);
    this.vel.z = damp(this.vel.z, tz, accel, dt);

    // Déplacement avec glissement : on essaie X+Z, puis chaque axe séparément.
    const y0 = this.pos.y;
    let nx = this.pos.x + this.vel.x * dt;
    let nz = this.pos.z + this.vel.z * dt;
    const res = this.world.colliders.resolve(nx, nz, RADIUS);
    nx = res.x;
    nz = res.z;
    // On ne traverse pas les habitants.
    for (const o of this.obstacles ? this.obstacles() : []) {
      const dx = nx - o.x;
      const dz = nz - o.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.7 && d > 1e-4) {
        nx = o.x + (dx / d) * 0.7;
        nz = o.z + (dz / d) * 0.7;
      }
    }
    if (this.canStand(nx, nz, y0)) {
      this.pos.x = nx;
      this.pos.z = nz;
    } else if (this.canStand(nx, this.pos.z, y0)) {
      this.pos.x = nx;
      this.vel.z = 0;
    } else if (this.canStand(this.pos.x, nz, y0)) {
      this.pos.z = nz;
      this.vel.x = 0;
    } else {
      this.vel.x = 0;
      this.vel.z = 0;
    }

    // Gravité, saut, accroche au sol dans les descentes.
    const ground = this.world.groundAt(this.pos.x, this.pos.z);
    if (this.grounded && !this.frozen && input.hit('Space')) {
      this.vy = JUMP;
      this.grounded = false;
    }
    this.vy -= GRAVITY * dt;
    this.pos.y += this.vy * dt;
    if (this.pos.y <= ground) {
      this.pos.y = ground;
      this.vy = 0;
      this.grounded = true;
    } else if (this.grounded && this.vy <= 0 && this.pos.y - ground < 0.45) {
      this.pos.y = ground;
      this.vy = 0;
    } else {
      this.grounded = false;
    }

    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (len > 0.05) this.rotY = lerpAngle(this.rotY, Math.atan2(dx, dz), 1 - Math.exp(-12 * dt));
    this.sync();
    this.character.update(dt, { speed: this.speed, running: this.running && this.speed > 5, grounded: this.grounded, vy: this.vy });
  }

  /** Conduite : on tourne progressivement vers la direction voulue, avec inertie. */
  updateVehicle(dt, input, camYaw) {
    const v = this.vehicle;
    const def = v.def;
    const mv = this.frozen || v.landing ? { x: 0, y: 0 } : input.moveVector();
    const fx = -Math.sin(camYaw);
    const fz = -Math.cos(camYaw);
    const rx = Math.cos(camYaw);
    const rz = -Math.sin(camYaw);
    const dx = fx * mv.y + rx * mv.x;
    const dz = fz * mv.y + rz * mv.x;
    const len = Math.hypot(dx, dz);
    let target = 0;
    let turn = 0;
    if (len > 0.1) {
      const want = Math.atan2(dx, dz);
      const diff = Math.atan2(Math.sin(want - this.rotY), Math.cos(want - this.rotY));
      const rate = def.turn * (0.55 + 0.45 * clamp(1 - Math.abs(v.speed) / (def.speed * 1.4), 0, 1));
      turn = clamp(diff, -rate * dt, rate * dt);
      this.rotY += turn;
      target = def.speed * Math.min(1, len) * (Math.abs(diff) > 2.0 ? 0.35 : Math.abs(diff) > 1.0 ? 0.7 : 1);
    }
    const boost = !this.frozen && input.down('ShiftLeft', 'ShiftRight') ? 1.25 : 1;
    v.speed = damp(v.speed, target * boost, target > v.speed ? def.accel * 0.6 : 2.2, dt);
    v.roll = damp(v.roll || 0, dt > 0 ? clamp((-turn / dt) * 0.12 * clamp(v.speed / def.speed, 0, 1), -0.3, 0.3) : 0, 6, dt);

    const ok = (x, z) => {
      if (def.mode === 'water') return this.world.terrain.heightAt(x, z) < -0.45 && !this.world.onPlatform(x, z);
      if (def.mode === 'air') return Math.hypot(x, z) < 135;
      return this.world.isWalkable(x, z) && this.world.groundAt(x, z) - this.pos.y <= 1.0;
    };
    // Par petits pas : lancé à pleine vitesse pendant une image lente (île qui se charge,
    // téléphone), un véhicule sauterait par-dessus une rambarde fine (ponts) au lieu de
    // s'y arrêter.
    const step = v.speed * dt;
    const n = def.mode === 'air' ? 1 : Math.max(1, Math.ceil(Math.abs(step) / Math.min(0.25, def.radius * 0.5)));
    const obstacles = def.mode !== 'air' && this.obstacles ? this.obstacles() : [];
    let slide = false;
    let blocked = false;
    for (let k = 0; k < n; k++) {
      let nx = this.pos.x + (Math.sin(this.rotY) * step) / n;
      let nz = this.pos.z + (Math.cos(this.rotY) * step) / n;
      if (def.mode !== 'air') {
        const res = this.world.colliders.resolve(nx, nz, def.radius);
        nx = res.x;
        nz = res.z;
        for (const o of obstacles) {
          const ddx = nx - o.x;
          const ddz = nz - o.z;
          const d = Math.hypot(ddx, ddz);
          const min = def.radius + 0.4;
          if (d < min && d > 1e-4) {
            nx = o.x + (ddx / d) * min;
            nz = o.z + (ddz / d) * min;
          }
        }
      }
      if (ok(nx, nz)) {
        this.pos.x = nx;
        this.pos.z = nz;
      } else if (ok(nx, this.pos.z)) {
        this.pos.x = nx;
        slide = true;
      } else if (ok(this.pos.x, nz)) {
        this.pos.z = nz;
        slide = true;
      } else {
        blocked = true;
        break;
      }
    }
    if (blocked) v.speed *= 0.4;
    else if (slide) v.speed *= 0.96;

    const ground = this.world.groundAt(this.pos.x, this.pos.z);
    if (def.mode === 'water') {
      this.pos.y = Math.sin(performance.now() / 700) * 0.04;
    } else if (def.mode === 'air') {
      const cruise = Math.max(def.altitude, Math.max(ground, 0) + 12);
      const goal = v.landing ? Math.max(ground, 0) : cruise;
      this.pos.y = damp(this.pos.y, goal, v.landing ? 0.9 : 0.35, dt);
      if (!v.landing && this.pos.y < goal) this.pos.y = Math.min(goal, this.pos.y + dt * 1.2);
      if (v.landing) this.pos.y = Math.max(Math.max(ground, 0), this.pos.y - dt * 1.5);
    } else {
      this.pos.y = damp(this.pos.y, ground, 20, dt);
    }
    this.vy = 0;
    this.grounded = true;
    this.running = false;
    this.speed = Math.abs(v.speed);
    this.vel.set(Math.sin(this.rotY) * v.speed, 0, Math.cos(this.rotY) * v.speed);
    this.sync();
    this.character.root.rotation.z = def.mode === 'ground' ? v.roll : 0;
    this.character.setRideSpeed(v.speed);
    this.character.update(dt, { speed: 0, running: false, grounded: true, vy: 0 });
  }

  /** Oriente doucement le joueur vers un point (pour caresser un animal…). */
  face(x, z) {
    this.rotY = Math.atan2(x - this.pos.x, z - this.pos.z);
    this.sync();
  }

  sync() {
    this.character.root.position.copy(this.pos);
    this.character.root.rotation.y = this.rotY;
  }

  /** Profondeur d'eau sous les pieds (0 si au sec). */
  get wading() {
    return Math.max(0, -this.pos.y);
  }
}
