import * as THREE from 'three';
import { clamp, damp, lerpAngle } from '../core/math.js';

// Caméra à la troisième personne (orbite autour du joueur), avec deux modes
// supplémentaires : « studio » pour la personnalisation et « titre » (survol de l'île).

export class FollowCamera {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.yaw = Math.PI * 0.08;
    this.pitch = 0.36;
    this.dist = 9;
    this.target = new THREE.Vector3();
    this.mode = 'follow';
    this.studio = { yaw: 0, dist: 3.3, height: 0.95 };
    this.shift = 0;
    this.shiftTarget = 0;
    this.current = new THREE.Vector3(20, 20, 20);
    this.snap = true;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'studio') this.studio.yaw = 0;
  }

  /** Décalage horizontal de l'image (fraction de largeur) pour laisser place à un panneau. */
  setShift(f) {
    this.shiftTarget = f;
  }

  update(dt, player, input, elapsed) {
    const drag = input.consumeDrag();
    const wheel = input.consumeWheel();
    const desired = new THREE.Vector3();
    const look = new THREE.Vector3();

    if (this.mode === 'title') {
      const a = elapsed * 0.05;
      desired.set(Math.cos(a) * 38, 17, Math.sin(a) * 38);
      look.set(0, 3, 0);
    } else if (this.mode === 'studio') {
      this.studio.yaw -= drag.dx * 0.01;
      this.studio.dist = clamp(this.studio.dist + wheel * 0.25, 2.2, 9);
      const h = player.character.appearance.height;
      const ry = player.rotY + this.studio.yaw;
      look.copy(player.pos).add(new THREE.Vector3(0, this.studio.height * h, 0));
      desired.set(Math.sin(ry) * this.studio.dist, 0.25, Math.cos(ry) * this.studio.dist).add(look);
    } else {
      this.yaw -= drag.dx * 0.0055;
      this.pitch = clamp(this.pitch + drag.dy * 0.004, -0.05, 1.25);
      this.dist = clamp(this.dist * (1 + wheel * 0.1), 3.5, 18);
      // La caméra suit doucement la direction du joueur quand il avance sans qu'on touche la souris.
      // (uniquement quand il avance « dans » l'écran, sinon on tournerait en rond en reculant).
      const behind = player.rotY + Math.PI;
      const off = Math.abs(Math.atan2(Math.sin(behind - this.yaw), Math.cos(behind - this.yaw)));
      if (!input.drag.active && player.speed > 1 && off < 1.3) {
        this.yaw = lerpAngle(this.yaw, behind, 1 - Math.exp(-0.5 * dt * (player.speed / 4)));
      }
      look.copy(player.pos).add(new THREE.Vector3(0, 1.25, 0));
      const cp = Math.cos(this.pitch);
      desired.set(Math.sin(this.yaw) * cp * this.dist, Math.sin(this.pitch) * this.dist, Math.cos(this.yaw) * cp * this.dist).add(look);
      // Si une maison se trouve entre le joueur et la caméra, on rapproche la caméra.
      const steps = 14;
      for (let i = 2; i <= steps; i++) {
        const t = i / steps;
        const x = look.x + (desired.x - look.x) * t;
        const y = look.y + (desired.y - look.y) * t;
        const z = look.z + (desired.z - look.z) * t;
        if (this.world.cameraBlocked(x, y, z)) {
          const k = Math.max((i - 1.5) / steps, 0.12);
          desired.set(look.x + (desired.x - look.x) * k, look.y + (desired.y - look.y) * k, look.z + (desired.z - look.z) * k);
          break;
        }
      }
      const ground = Math.max(this.world.heightAt(desired.x, desired.z), 0) + 0.6;
      if (desired.y < ground) desired.y = ground;
    }

    if (this.snap) {
      this.current.copy(desired);
      this.target.copy(look);
      this.snap = false;
    } else {
      const k = this.mode === 'title' ? 2 : this.mode === 'studio' ? 6 : 10;
      this.current.x = damp(this.current.x, desired.x, k, dt);
      this.current.y = damp(this.current.y, desired.y, k, dt);
      this.current.z = damp(this.current.z, desired.z, k, dt);
      this.target.x = damp(this.target.x, look.x, k * 1.5, dt);
      this.target.y = damp(this.target.y, look.y, k * 1.5, dt);
      this.target.z = damp(this.target.z, look.z, k * 1.5, dt);
    }
    this.camera.position.copy(this.current);
    this.camera.lookAt(this.target);

    // Décalage de l'image (le personnage glisse à gauche quand un panneau s'ouvre à droite).
    this.shift = damp(this.shift, this.shiftTarget, 8, dt);
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (Math.abs(this.shift) > 0.001) this.camera.setViewOffset(w, h, w * this.shift, 0, w, h);
    else if (this.camera.view?.enabled) this.camera.clearViewOffset();
  }
}
