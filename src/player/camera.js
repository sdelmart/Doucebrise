import * as THREE from 'three';
import { clamp, damp, smoothstep } from '../core/math.js';

// Caméra à la troisième personne (orbite autour du joueur), avec deux modes
// supplémentaires : « studio » pour la personnalisation et « titre » (survol de l'île).

// Caméra qui suit : vitesse (radians par seconde, en marchant) à laquelle elle se replace
// derrière le personnage quand il part sur le côté (réglage « Caméra qui suit »).
const FOLLOW = { normale: 0.75, douce: 0.4, off: 0 };
// Après un geste à la souris, au pavé tactile ou au stick : la caméra obéit, puis reprend
// son suivi au bout de ce délai (secondes).
const MANUAL_HOLD = 1.2;

export class FollowCamera {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.yaw = Math.PI * 0.08;
    this.pitch = 0.36;
    this.dist = 9;
    this.target = new THREE.Vector3();
    this.mode = 'follow';
    this.studio = { yaw: 0, dist: 3.3, height: 0.95, fit: 1 };
    this.shift = 0;
    this.shiftTarget = 0;
    this.shiftY = 0;
    this.shiftYTarget = 0;
    this.current = new THREE.Vector3(20, 20, 20);
    this.snap = true;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'studio') this.studio.yaw = 0;
  }

  /** Plan fixe (cinématique) : position et point visé. */
  setCinematic(pos, look) {
    this.mode = 'cine';
    this.cine = { pos: pos.clone(), look: look.clone() };
  }

  /** Gros plan sur un animal (garde-robe). */
  setPetView(animal, dist = 1.7) {
    this.mode = 'pet';
    this.pet = { animal, yaw: 0.45, dist: dist * Math.max(0.7, animal.model.scale) };
  }

  /** Vue plongeante sur une zone (décoration). */
  /** Vue d'ensemble (décoration) ; pitch : inclinaison (vue plongeante par défaut). */
  setOverview(target, dist = 12, pitch = 0.95) {
    this.mode = 'overview';
    this.over = { target: target.clone(), dist, yaw: this.yaw, pitch };
  }

  /**
   * Décalage de l'image (fraction de largeur, et de hauteur) pour laisser place à un
   * panneau : à droite sur grand écran, en bas sur téléphone.
   */
  setShift(f, fy = 0) {
    this.shiftTarget = f;
    this.shiftYTarget = fy;
  }

  /**
   * Personnalisation : le personnage au milieu de la place que laisse le panneau (à droite
   * sur grand écran, en bas sur téléphone ou dans une fenêtre étroite), un peu plus loin
   * s'il faut pour qu'il y tienne en entier. now : sans glissement (à l'ouverture).
   */
  frameBeside(el, { now = false } = {}) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const r = el?.getBoundingClientRect();
    let fx = 0;
    let fy = 0;
    let fit = 1;
    if (r && r.width && r.height) {
      if (r.top > H * 0.2) {
        // Panneau en bas : le haut de l'écran est libre.
        const free = Math.max(r.top, H * 0.2);
        fy = (H - free) / 2 / H;
        fit = Math.max(1, (0.75 * H) / free);
      } else {
        // Panneau à droite : la gauche est libre.
        const free = Math.max(r.left, W * 0.2);
        fx = (W - free) / 2 / W;
        fit = Math.max(1, (0.47 * H) / free);
      }
    }
    this.studio.fit = fit;
    this.setShift(fx, fy);
    if (now) {
      this.shift = fx;
      this.shiftY = fy;
    }
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
      const d = this.studio.dist * this.studio.fit;
      desired.set(Math.sin(ry) * d, 0.25, Math.cos(ry) * d).add(look);
    } else if (this.mode === 'pet' && this.pet) {
      // Garde-robe : gros plan sur l'animal, qu'on fait tourner en glissant.
      const pv = this.pet;
      const a = pv.animal;
      pv.yaw -= drag.dx * 0.01;
      pv.dist = clamp(pv.dist + wheel * 0.18, 0.9, 4.5);
      const h = a.model.height * a.model.scale;
      look.set(a.pos.x, a.pos.y + h * 0.55, a.pos.z);
      const ry = a.rotY + pv.yaw;
      desired.set(Math.sin(ry) * pv.dist, h * 0.35 + pv.dist * 0.28, Math.cos(ry) * pv.dist).add(look);
    } else if (this.mode === 'cine') {
      desired.copy(this.cine.pos);
      look.copy(this.cine.look);
    } else if (this.mode === 'overview') {
      const o = this.over;
      o.yaw -= drag.dx * 0.006;
      o.dist = clamp(o.dist * (1 + wheel * 0.1), 6, 22);
      this.yaw = o.yaw;
      look.copy(o.target);
      const pitch = o.pitch ?? 0.95;
      desired.set(Math.sin(o.yaw) * Math.cos(pitch) * o.dist, Math.sin(pitch) * o.dist, Math.cos(o.yaw) * Math.cos(pitch) * o.dist).add(look);
    } else {
      if (drag.dx || drag.dy || input.drag.active) this.manualT = MANUAL_HOLD;
      else this.manualT = Math.max(0, (this.manualT || 0) - dt);
      this.yaw -= drag.dx * 0.0055;
      this.pitch = clamp(this.pitch + drag.dy * 0.004, this.photo ? -0.3 : -0.05, 1.3);
      this.dist = clamp(this.dist * (1 + wheel * 0.1), this.photo ? 1.6 : 3.5, this.photo ? 30 : 18);
      // Caméra qui suit : quand le personnage se déplace, elle se replace peu à peu derrière
      // lui, d'autant plus vite qu'il part sur le côté (en tournant à droite, la vue tourne
      // avec lui). Quand il vient vers l'écran (on recule), elle ne pivote pas : elle
      // tournerait en rond. Un geste manuel la met en pause un instant.
      const follow = FOLLOW[this.autoFollow === true ? 'normale' : this.autoFollow === false ? 'off' : this.autoFollow] ?? FOLLOW.normale;
      if (follow && !this.photo && this.manualT <= 0 && player.speed > 0.5) {
        const behind = player.rotY + Math.PI;
        const diff = Math.atan2(Math.sin(behind - this.yaw), Math.cos(behind - this.yaw));
        const pace = Math.min(player.speed / 4.6, 1.6);
        const facing = 1 - smoothstep(2.2, 2.9, Math.abs(diff));
        this.yaw += Math.sin(diff) * follow * pace * facing * dt;
      }
      look.copy(player.pos).add(new THREE.Vector3(0, this.photo ? 0.9 : 1.25, 0));
      // Si une maison ou une colline cache le joueur, la caméra monte au-dessus (et, en dernier
      // recours, se rapproche).
      const place = (pitch, dist) => {
        const cp = Math.cos(pitch);
        desired.set(Math.sin(this.yaw) * cp * dist, Math.sin(pitch) * dist, Math.cos(this.yaw) * cp * dist).add(look);
      };
      const blocked = (terrain) => {
        for (let i = 2; i <= 12; i++) {
          const t = i / 12;
          const x = look.x + (desired.x - look.x) * t;
          const y = look.y + (desired.y - look.y) * t;
          const z = look.z + (desired.z - look.z) * t;
          if (terrain ? y < this.world.heightAt(x, z) + 0.35 : this.world.cameraBlocked(x, y, z)) return t;
        }
        return 0;
      };
      let pitch = this.pitch;
      place(pitch, this.dist);
      let hit = blocked(false);
      while (hit && pitch < 1.3) {
        pitch += 0.08;
        place(pitch, this.dist);
        hit = blocked(false);
      }
      if (hit) place(this.pitch, Math.max(this.dist * (hit - 0.1), 2.5));
      // Colline ou montagne entre la caméra et le joueur : la caméra se rapproche.
      const th = blocked(true);
      if (th) {
        const d = Math.hypot(desired.x - look.x, desired.y - look.y, desired.z - look.z);
        place(pitch, Math.max(d * (th - 0.12), 2.2));
        // Toujours bloquée de très près : on monte un peu.
        let k = 0;
        while (blocked(true) && k++ < 6) place(pitch + k * 0.1, Math.max(d * (th - 0.12), 2.2));
      }
      this.autoPitch = pitch;
      const ground = Math.max(this.world.heightAt(desired.x, desired.z), 0) + 0.6;
      if (desired.y < ground) desired.y = ground;
    }

    if (this.snap) {
      this.current.copy(desired);
      this.target.copy(look);
      this.snap = false;
    } else {
      const k = this.mode === 'title' ? 2 : this.mode === 'cine' ? 1.2 : this.mode === 'studio' || this.mode === 'overview' ? 6 : 10;
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
    this.shiftY = damp(this.shiftY, this.shiftYTarget, 8, dt);
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (Math.abs(this.shift) > 0.001 || Math.abs(this.shiftY) > 0.001) this.camera.setViewOffset(w, h, w * this.shift, h * this.shiftY, w, h);
    else if (this.camera.view?.enabled) this.camera.clearViewOffset();
  }
}
