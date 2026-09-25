import * as THREE from 'three';
import { lerpAngle, damp } from '../core/math.js';

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
