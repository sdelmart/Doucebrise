import * as THREE from 'three';
import { buildAnimal, SPECIES } from './species.js';
import { buildOutfit, cleanOutfit, outfitFromAccessory } from './outfits.js';
import { damp, lerpAngle, clamp } from '../core/math.js';
import { plainVertexColor, withOutline } from '../core/materials.js';

// Un animal : modèle 3D + petite intelligence (flâner, fuir, suivre, dormir…).

export class Animal {
  constructor(def, world, rng) {
    this.id = def.id;
    this.species = def.species;
    this.variant = def.variant;
    this.sp = SPECIES[def.species];
    this.world = world;
    this.rng = rng;
    this.home = { x: def.x, z: def.z, r: def.r ?? 10 };
    this.wildHome = { ...this.home };
    this.model = buildAnimal(def.species, def.variant);
    this.root = this.model.root;
    this.pos = new THREE.Vector3(def.x, world.groundAt(def.x, def.z), def.z);
    this.rotY = rng.range(0, Math.PI * 2);
    this.target = null;
    this.state = 'idle';
    this.stateT = rng.range(0.5, 3);
    this.speed = 0;
    this.phase = rng() * 10;
    this.t = rng() * 10;
    this.blinkT = rng.range(1, 4);
    this.happyT = 0;
    this.petCooldown = 0;
    this.sleeping = false;
    this.swimming = false;
    this.outfitMeshes = [];
    // Pose (garde-robe) : l'animal reste sur place, tourné vers ce point.
    this.posing = null;

    // Données sauvegardées.
    this.trust = 0;
    this.adopted = false;
    this.name = '';
    this.follow = false;
    this.outfit = {};
    this.petToday = 0;
    this.lastPetDay = 0;
    this.sync();
  }

  get label() {
    return this.adopted && this.name ? this.name : this.sp.label;
  }

  get variantName() {
    return this.sp.variants[this.variant % this.sp.variants.length].name;
  }

  // --- Sauvegarde ------------------------------------------------------------

  serialize() {
    return {
      trust: Math.round(this.trust),
      adopted: this.adopted,
      name: this.name,
      follow: this.follow,
      outfit: Object.keys(this.outfit).length ? this.outfit : undefined,
      petToday: this.petToday,
      lastPetDay: this.lastPetDay,
      // Pas dans une pièce (visite, maison) : il retrouvera le jardin au chargement.
      x: this.adopted && this.pos.x < 500 ? +this.pos.x.toFixed(1) : undefined,
      z: this.adopted && this.pos.x < 500 ? +this.pos.z.toFixed(1) : undefined,
    };
  }

  restore(data, yard) {
    if (!data) return;
    this.trust = data.trust ?? 0;
    this.adopted = !!data.adopted;
    this.name = data.name || '';
    this.follow = !!data.follow;
    // Avant la garde-robe (v0.16) : un seul accessoire.
    const outfit = data.outfit || outfitFromAccessory(data.accessory, data.accessoryColor);
    this.petToday = data.petToday || 0;
    this.lastPetDay = data.lastPetDay || 0;
    if (this.adopted) {
      this.home = { ...yard };
      if (typeof data.x === 'number') this.teleport(data.x, data.z);
      else this.teleport(yard.x + (Math.random() - 0.5) * 3, yard.z + (Math.random() - 0.5) * 3);
    }
    this.setOutfit(outfit);
  }

  /** Habille l'animal : { tete, yeux, cou, corps } → { id, color }. */
  setOutfit(outfit) {
    this.outfit = cleanOutfit(outfit);
    for (const m of this.outfitMeshes) {
      m.removeFromParent();
      m.geometry.dispose();
    }
    this.outfitMeshes = [];
    const parts = buildOutfit(this.model, this.outfit);
    for (const [where, geo] of [['head', parts.head], ['body', parts.body]]) {
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, plainVertexColor());
      mesh.castShadow = true;
      withOutline(mesh, 0.01);
      // Repères de la tête et des yeux : dans le repère de la tête ; cou et torse : du corps.
      (where === 'head' ? this.model.head : this.model.body).add(mesh);
      this.outfitMeshes.push(mesh);
    }
  }

  teleport(x, z) {
    // Jamais posé sur le potager, une nappe, devant la porte… (world.addCover).
    if (!this.room) ({ x, z } = this.world.keepOff(x, z, this.model.radius * this.model.scale));
    this.pos.set(x, this.world.groundAt(x, z), z);
    this.target = null;
    this.sync();
  }

  // --- Réactions -------------------------------------------------------------

  pet() {
    this.happyT = 1.3;
    this.state = 'happy';
    this.stateT = 1.3;
    this.sleeping = false;
  }

  startle() {
    this.state = 'flee';
    this.stateT = 2.2;
  }

  // --- Intelligence ----------------------------------------------------------

  pickWanderTarget() {
    for (let i = 0; i < 12; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const r = this.rng.range(1.5, this.home.r);
      const x = this.home.x + Math.cos(a) * r;
      const z = this.home.z + Math.sin(a) * r;
      if (this.canGo(x, z) && !this.offLimits(x, z)) return { x, z };
    }
    // Centre du domaine (le jardin : le potager) interdit : on reste où l'on est.
    if (this.offLimits(this.home.x, this.home.z)) return { x: this.pos.x, z: this.pos.z };
    return { x: this.home.x, z: this.home.z };
  }

  /** Sol où l'animal ne va pas (potager, nappe, devant la porte…), dehors seulement. */
  offLimits(x, z) {
    return !this.room && this.world.covered(x, z, this.model.radius * this.model.scale + 0.3, 'animals');
  }

  canGo(x, z) {
    // Dans une pièce (chats du café pendant la visite) : rester entre les murs.
    const rm = this.room;
    if (rm) return Math.abs(x - rm.x) < rm.hw && Math.abs(z - rm.z) < rm.hd;
    const h = this.world.groundAt(x, z);
    if (this.species === 'canard' || this.species === 'loutre') return h > -3;
    return h > 0.25;
  }

  /**
   * @param {number} dt
   * @param {{player:any, night:boolean, followIndex:number}} ctx
   */
  update(dt, ctx) {
    this.t += dt;
    this.petCooldown = Math.max(0, this.petCooldown - dt);
    this.playCooldown = Math.max(0, (this.playCooldown || 0) - dt);
    this.happyT = Math.max(0, this.happyT - dt);
    const p = ctx.player.pos;
    const dx = p.x - this.pos.x;
    const dz = p.z - this.pos.z;
    const distP = Math.hypot(dx, dz);
    let moveSpeed = 0;
    let goal = null;

    this.stateT -= dt;
    const following = this.adopted && this.follow && !ctx.hold;

    if (this.posing) {
      // Garde-robe : immobile, tourné vers la caméra.
      this.sleeping = false;
      this.state = 'idle';
      this.lookAt(this.posing.x, this.posing.z, dt, 6);
    } else if (following) {
      this.sleeping = false;
      // Place derrière le joueur selon l'ordre du compagnon : rangs de trois
      // (milieu, gauche, droite), le deuxième rang un peu plus loin.
      const i = ctx.followIndex - 1;
      const col = [0, -1, 1][i % 3];
      const row = Math.floor(i / 3);
      const back = ctx.player.rotY + Math.PI + col * (0.62 - row * 0.18);
      const d = 2 + row * 1.5 + (col ? 0.25 : 0);
      let fx = p.x + Math.sin(back) * d;
      let fz = p.z + Math.cos(back) * d;
      // Place dans le potager (on jardine) : il attend au bord, sans piétiner sur place.
      if (!this.room) ({ x: fx, z: fz } = this.world.keepOff(fx, fz, this.model.radius * this.model.scale + 0.05));
      const gap = Math.hypot(fx - this.pos.x, fz - this.pos.z);
      if (distP > 35) {
        this.teleport(fx, fz);
      } else if (gap > 0.6 && this.state !== 'happy') {
        goal = { x: fx, z: fz };
        // Au pas du joueur, et un rattrapage tranquille quand il s'arrête.
        const pSpeed = ctx.player.speed;
        moveSpeed = pSpeed > 0.5 ? clamp(pSpeed * 1.03 + gap * 0.25, 0, 9) : clamp(gap * 0.7, 0.9, 2.6);
        this.state = 'follow';
      } else if (this.state !== 'happy') {
        this.state = 'idle';
        this.lookAt(p.x, p.z, dt, 4);
      }
    } else if (this.state === 'happy') {
      this.lookAt(p.x, p.z, dt, 8);
      if (this.stateT <= 0) {
        this.state = 'idle';
        this.stateT = this.rng.range(1, 3);
      }
    } else if (this.inBed) {
      this.state = 'sleep';
    } else if (ctx.night && !this.adopted && this.state !== 'flee') {
      if (!this.sleeping) {
        this.sleeping = true;
        this.state = 'sleep';
      }
    } else {
      if (this.sleeping && !ctx.night) {
        this.sleeping = false;
        this.state = 'idle';
      }
      if (this.adopted && this.sleeping && ctx.night) this.state = 'sleep';
      // Fuite si le joueur court tout près d'un animal farouche.
      const fear = this.sp.shy * (1 - this.trust / 100);
      if (!this.adopted && ctx.player.running && ctx.player.speed > 5 && distP < 3 + fear * 6 && fear > 0.25 && this.state !== 'flee') {
        this.startle();
        ctx.onStartle?.(this);
      }
      if (this.state === 'flee') {
        const len = Math.max(distP, 0.01);
        goal = { x: this.pos.x - (dx / len) * 4, z: this.pos.z - (dz / len) * 4 };
        moveSpeed = this.sp.speed * 2.2;
        if (this.stateT <= 0) {
          this.state = 'idle';
          this.stateT = this.rng.range(1, 2);
        }
      } else if (this.state === 'sleep') {
        // Réveil au matin (géré plus haut).
      } else if (this.state === 'wander') {
        // Balade tranquille : bien plus lente qu'une course.
        goal = this.target;
        moveSpeed = this.sp.speed * 0.6;
        if (!this.target || this.stateT <= 0) {
          this.state = 'idle';
          this.stateT = this.rng.range(3, 8);
        }
      } else {
        // idle : regarde le joueur s'il est proche et curieux.
        if (distP < 5 && this.trust > 15) this.lookAt(p.x, p.z, dt, 3);
        if (this.stateT <= 0) {
          this.state = 'wander';
          this.target = this.pickWanderTarget();
          this.stateT = 12;
        }
      }
    }

    // Déplacement.
    if (goal && moveSpeed > 0) {
      const gx = goal.x - this.pos.x;
      const gz = goal.z - this.pos.z;
      const gd = Math.hypot(gx, gz);
      if (gd < 0.35) {
        if (this.state === 'wander') {
          this.state = 'idle';
          this.stateT = this.rng.range(3, 8);
        }
      } else {
        this.rotY = lerpAngle(this.rotY, Math.atan2(gx, gz), 1 - Math.exp(-8 * dt));
        const step = Math.min(moveSpeed * dt, gd);
        const nx = this.pos.x + Math.sin(this.rotY) * step;
        const nz = this.pos.z + Math.cos(this.rotY) * step;
        let r = this.world.colliders.resolve(nx, nz, this.model.radius * this.model.scale);
        // Il contourne le potager et les objets posés au sol, comme un obstacle.
        if (!this.room) r = this.world.keepOff(r.x, r.z, this.model.radius * this.model.scale);
        if (this.canGo(r.x, r.z) || following) {
          this.pos.x = r.x;
          this.pos.z = r.z;
          this.speed = damp(this.speed, moveSpeed, 10, dt);
        } else {
          this.target = this.pickWanderTarget();
          this.speed = 0;
        }
      }
    } else {
      this.speed = damp(this.speed, 0, 10, dt);
    }

    // Hauteur : sol, ou surface de l'eau pour les canards.
    const ground = this.inBed ? this.pos.y : this.world.groundAt(this.pos.x, this.pos.z);
    this.swimming = (this.species === 'canard' || this.species === 'loutre') && ground < -0.1;
    const targetY = this.swimming ? -0.12 + Math.sin(this.t * 2) * 0.02 : ground;
    this.pos.y = damp(this.pos.y, targetY, 12, dt);
    // Animation différée (troupeau) : jouée après la caméra, si l'animal peut être vu.
    if (ctx.defer) this.animDt = Math.min((this.animDt || 0) + dt, 1);
    else this.animate(dt);
    this.sync();
  }

  lookAt(x, z, dt, k) {
    this.rotY = lerpAngle(this.rotY, Math.atan2(x - this.pos.x, z - this.pos.z), 1 - Math.exp(-k * dt));
  }

  // --- Animation -------------------------------------------------------------

  animate(dt) {
    const m = this.model;
    const moving = this.speed > 0.1;
    const amp = clamp(this.speed / 2, 0, 1);
    this.phase += dt * (4 + this.speed * 5);
    const s = Math.sin(this.phase);
    const gait = this.sp.gait;
    let bodyY = 0;
    let bodyRoll = 0;
    let bodyPitch = 0;

    for (const leg of m.legs) {
      let target = 0;
      if (moving) {
        if (gait === 'hop') target = Math.sin(this.phase) * 0.9;
        else target = (leg.pair === 0 ? s : -s) * 0.7 * amp;
      }
      if (this.state === 'sleep') target = leg.pivot.position.z > 0 ? -1.2 : 1.2;
      leg.pivot.rotation.x = damp(leg.pivot.rotation.x, target, 14, dt);
      // Pattes rentrées dans l'eau (les pièces sont des os du maillage fusionné : on les
      // réduit au lieu de les masquer).
      leg.pivot.scale.setScalar(this.swimming ? 0.001 : 1);
    }

    if (moving) {
      if (gait === 'hop') bodyY = Math.abs(Math.sin(this.phase)) * 0.18;
      else if (gait === 'waddle') bodyRoll = s * 0.18;
      else bodyY = Math.abs(Math.cos(this.phase)) * 0.03;
    }
    if (this.state === 'happy') {
      bodyY += Math.abs(Math.sin(this.t * 10)) * 0.14;
    }
    if (this.state === 'sleep') {
      bodyY = -m.legs[0]?.pivot.position.y * 0.55 || -0.05;
      bodyPitch = 0;
    }
    if (this.swimming) bodyRoll = Math.sin(this.t * 1.5) * 0.05;

    m.body.position.y = damp(m.body.position.y, bodyY, 16, dt);
    m.body.rotation.z = damp(m.body.rotation.z, bodyRoll, 10, dt);
    m.body.rotation.x = damp(m.body.rotation.x, bodyPitch, 10, dt);

    // Tête : hoche en marchant, regarde autour à l'arrêt, se pose en dormant.
    const headBase = m.head.userData.base || (m.head.userData.base = m.head.position.clone());
    // (En pose pour la garde-robe : tête levée vers la caméra, sans regarder ailleurs.)
    const look = this.posing ? 0 : !moving && this.state !== 'sleep' ? Math.sin(this.t * 0.7) * 0.4 : 0;
    m.head.rotation.y = damp(m.head.rotation.y, look, 4, dt);
    m.head.rotation.x = damp(m.head.rotation.x, this.posing ? -0.18 : this.state === 'sleep' ? 0.35 : moving ? Math.sin(this.phase * 2) * 0.05 : Math.sin(this.t * 1.1) * 0.05, 8, dt);
    m.head.rotation.z = damp(m.head.rotation.z, this.state === 'happy' ? Math.sin(this.t * 8) * 0.2 : 0, 8, dt);
    m.head.position.y = headBase.y + (this.state === 'sleep' ? -0.06 : 0);

    // Queue qui remue (vite quand il est content).
    if (m.tail) {
      const wag = this.state === 'happy' || this.happyT > 0 ? 14 : this.adopted ? 6 : 3;
      m.tail.rotation.y = Math.sin(this.t * wag) * (this.state === 'sleep' ? 0.05 : 0.35);
      m.tail.rotation.x = moving ? -0.2 : 0;
    }
    for (const w of m.wings) {
      const flap = this.state === 'happy' ? Math.abs(Math.sin(this.t * 18)) * 0.9 : moving ? Math.abs(s) * 0.15 : 0;
      w.pivot.rotation.z = w.side * flap;
    }

    // Yeux : clignement, plissés quand heureux, fermés en dormant.
    this.blinkT -= dt;
    if (this.blinkT < 0) this.blinkT = this.rng.range(2, 5);
    const blink = this.blinkT < 0.12;
    const eyeY = this.state === 'sleep' ? 0.12 : this.state === 'happy' ? 0.35 : blink ? 0.15 : 1;
    if (m.eyes) m.eyes.scale.y = damp(m.eyes.scale.y, eyeY, 25, dt);
  }

  sync() {
    this.root.position.copy(this.pos);
    this.root.rotation.y = this.rotY;
  }
}
