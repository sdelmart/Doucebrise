import * as THREE from 'three';
import { Animal } from './animal.js';
import { SPECIES } from './species.js';
import { ITEMS, countItem, takeItem } from '../game/items.js';
import { createRng } from '../core/math.js';

// Peuplement de l'île et interactions joueur ↔ animaux.

const SPAWNS = [
  // espèce, nombre, centre x, z, rayon d'errance
  ['chat', 4, 0, 0, 18],
  ['chien', 2, 4, 6, 20],
  ['chat', 1, 14, 76, 10],
  ['chien', 1, 8, 70, 12],
  ['lapin', 5, 50, 8, 18],
  ['mouton', 3, 58, 22, 12],
  ['herisson', 1, 44, 0, 10],
  ['renard', 2, -6, -60, 18],
  ['faon', 3, 6, -52, 18],
  ['herisson', 2, -14, -48, 12],
  ['lapin', 2, -20, -66, 12],
  ['canard', 5, -52, 6, 9],
  ['mouton', 4, -38, 44, 13],
  ['chien', 1, -30, 36, 10],
  ['herisson', 1, 30, -24, 9],
  ['faon', 1, 34, -30, 10],
  ['renard', 1, 60, -48, 10],
  ['pandaRoux', 2, -14, -44, 12],
  ['poule', 4, -32, 42, 9],
  ['oiseau', 3, 12, 18, 16],
  ['oiseau', 2, 46, -2, 14],
  ['tortue', 2, 8, 86, 7],
];

const TRUST_PET = 7;
const TRUST_PET_DAILY = 35;
const TRUST_FOOD = 12;
const TRUST_FAV = 28;
export const MAX_FOLLOWERS = 3;

export class AnimalManager {
  constructor(game) {
    this.game = game;
    this.world = game.world;
    this.group = new THREE.Group();
    this.animals = [];
    this.discovered = {};
    const rng = createRng(7171);
    let n = 0;
    // Colonie de chats devant le Café des Chats (ajoutée après les autres : les identifiants restent stables).
    const cafe = this.world.village.cafe;
    const spawns = [...SPAWNS, ['chat', 5, cafe.x + cafe.fwd[0] * 6, cafe.z + cafe.fwd[1] * 6, 6]];
    for (const [species, count, cx, cz, r] of spawns) {
      for (let i = 0; i < count; i++) {
        const pos = this.findSpot(rng, cx, cz, r, species);
        const variantCount = SPECIES[species].variants.length;
        const variant = rng.int(0, variantCount - 1);
        const a = new Animal({ id: `${species}-${n++}`, species, variant, x: pos.x, z: pos.z, r }, this.world, createRng(n * 97 + 3));
        a.home = { x: cx, z: cz, r };
        a.wildHome = { ...a.home };
        this.animals.push(a);
        this.group.add(a.root);
      }
    }
  }

  findSpot(rng, cx, cz, r, species) {
    for (let t = 0; t < 40; t++) {
      const a = rng.range(0, Math.PI * 2);
      const d = rng.range(0, r);
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      const h = this.world.groundAt(x, z);
      if (species === 'canard' ? h < -0.3 : h > 0.5) {
        const res = this.world.colliders.resolve(x, z, 0.5);
        if (Math.hypot(res.x - x, res.z - z) < 0.01) return { x, z };
      }
    }
    return { x: cx, z: cz };
  }

  get yard() {
    const y = this.world.village.yard;
    return { x: y.x, z: y.z, r: y.r - 1 };
  }

  followers() {
    return this.animals.filter((a) => a.adopted && a.follow);
  }

  companions() {
    return this.animals.filter((a) => a.adopted);
  }

  discover(a, fav = false) {
    const d = this.discovered[a.species] || (this.discovered[a.species] = { variants: [], fav: false });
    const isNew = !d.variants.includes(a.variant);
    if (isNew) d.variants.push(a.variant);
    if (fav && !d.fav) {
      d.fav = true;
      return 'fav';
    }
    return isNew ? 'variant' : null;
  }

  // --- Boucle ----------------------------------------------------------------

  update(dt, night) {
    const player = this.game.player;
    const followers = this.followers();
    const ctx = {
      player,
      night,
      hold: !!player.vehicle && player.vehicle.def.mode !== 'ground',
      followIndex: 0,
      onStartle: (a) => this.game.particles.emit('alert', a.headPosition(), { count: 1, size: 0.4 }),
    };
    this.zzzT = (this.zzzT || 0) - dt;
    const zzz = this.zzzT <= 0;
    if (zzz) this.zzzT = 1.4;
    // Les compagnons restés à la maison dorment dans leurs paniers la nuit.
    const beds = this.game.house ? this.game.house.petBeds() : [];
    let bi = 0;
    for (const a of this.animals) {
      if (!a.adopted || a.follow) {
        a.inBed = false;
        continue;
      }
      if (night && bi < beds.length) {
        const b = beds[bi++];
        if (!a.inBed || a.pos.distanceTo(b) > 0.5) {
          a.teleport(b.x, b.z);
          a.pos.y = b.y;
          a.inBed = true;
        }
        a.sleeping = true;
        a.state = 'sleep';
        a.target = null;
      } else if (a.inBed) {
        a.inBed = false;
        a.sleeping = false;
        a.state = 'idle';
        a.teleport(a.home.x, a.home.z);
      }
    }
    for (const a of this.animals) {
      const d = a.pos.distanceTo(player.pos);
      const far = d > 75 && !(a.adopted && a.follow);
      a.root.visible = !far;
      if (far) continue;
      ctx.followIndex = followers.indexOf(a) + 1;
      a.update(dt, ctx);
      if (zzz && a.state === 'sleep' && d < 25) this.game.particles.emit('zzz', a.headPosition(), { size: 0.3, rise: 0.5, life: 1.6 });
    }
  }

  /** Animal le plus proche devant le joueur, à portée d'interaction. */
  nearest(maxDist = 2.6) {
    const p = this.game.player;
    const fwd = p.forward(new THREE.Vector3());
    let best = null;
    let bestScore = Infinity;
    for (const a of this.animals) {
      if (!a.root.visible) continue;
      const dx = a.pos.x - p.pos.x;
      const dz = a.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > maxDist + a.model.radius) continue;
      const facing = d > 0.01 ? (dx * fwd.x + dz * fwd.z) / d : 1;
      if (facing < -0.2) continue;
      const score = d - facing * 0.8;
      if (score < bestScore) {
        best = a;
        bestScore = score;
      }
    }
    return best;
  }

  // --- Actions du joueur -----------------------------------------------------

  pet(a) {
    const g = this.game;
    const day = g.world.sky.day;
    if (a.lastPetDay !== day) {
      a.lastPetDay = day;
      a.petToday = 0;
    }
    if (a.petCooldown > 0) return;
    if (!a.adopted && a.sp.shy > 0.55 && a.trust < 15) {
      a.startle();
      g.particles.emit('alert', a.headPosition(), { size: 0.4 });
      g.ui.toast(`${a.sp.emoji} Le ${a.sp.label.toLowerCase()} est trop timide… offre-lui d'abord à manger !`);
      return;
    }
    a.pet();
    a.petCooldown = 1.5;
    g.player.face(a.pos.x, a.pos.z);
    g.player.character.play('pet', 1.2);
    g.particles.emit('heart', a.headPosition(), { count: 3, spread: 0.4 });
    g.audio?.play('pet');
    if (Math.random() < 0.5) g.ui.bubble?.(a.headPosition(), a.sp.sound);
    const first = a.petToday === 0;
    const gain = a.petToday < TRUST_PET_DAILY ? TRUST_PET : 1;
    a.petToday += gain;
    this.addTrust(a, gain);
    g.progress.addXp('soins', first ? 6 : 2);
    if (this.discover(a) === 'variant') g.ui.toast(`📖 Nouveau dans ton carnet : ${a.sp.label} ${a.variantName} !`);
    g.emit('pet', { animal: a });
    g.requestSave();
  }

  /** Nourriture préférée d'un animal (« poisson » = n'importe quel poisson, le moins cher). */
  hasFav(a) {
    return countItem(this.game.inventory, a.sp.fav) > 0;
  }

  /** Choisit ce qu'on donne : pâtée (chats), plat préféré, friandise, sinon n'importe quelle nourriture. */
  pickFood(a) {
    const inv = this.game.inventory;
    if (a.species === 'chat' && inv.patee > 0) return 'patee';
    if (this.hasFav(a)) return a.sp.fav;
    if (inv.friandise > 0) return 'friandise';
    return Object.keys(ITEMS).find((f) => ITEMS[f].feed && !ITEMS[f].catTreat && inv[f] > 0 && ITEMS[f].tag !== 'poisson') || (countItem(inv, 'poisson') > 0 ? 'poisson' : null);
  }

  feed(a) {
    const g = this.game;
    const inv = g.inventory;
    const fav = a.sp.fav;
    const food = this.pickFood(a);
    if (!food) {
      g.ui.toast('Ton sac est vide ! Cueille des baies, des pommes ou des carottes… 🧺');
      return;
    }
    const eaten = takeItem(inv, food, 1)[0] || food;
    a.pet();
    a.petCooldown = 1.2;
    g.player.face(a.pos.x, a.pos.z);
    g.player.character.play('feed', 1.0);
    const isFav = food === fav;
    const great = isFav || ITEMS[food].treat || (ITEMS[food].catTreat && a.species === 'chat');
    g.particles.emit(great ? 'heart' : 'note', a.headPosition(), { count: great ? 5 : 2, spread: 0.5 });
    if (great) g.particles.emit('sparkle', a.headPosition(), { count: 2, spread: 0.6 });
    g.audio?.play(great ? 'fav' : 'eat');
    this.addTrust(a, great ? TRUST_FAV : TRUST_FOOD);
    g.progress.addXp('soins', great ? 10 : 5);
    const res = this.discover(a, isFav);
    if (res === 'fav') {
      g.ui.toast(`✨ Le plat préféré du ${a.sp.label.toLowerCase()} : ${ITEMS[fav].emoji} ${ITEMS[fav].label} !`);
    } else {
      g.ui.toast(`${a.sp.emoji} ${a.label} a mangé ${ITEMS[eaten].emoji} ${isFav ? '— son préféré !' : great ? '— un régal !' : ''}`);
    }
    g.emit('feed', { animal: a, food, fav: isFav });
    g.ui.refreshInventory();
    g.requestSave();
  }

  /** Jouer avec le plumeau (touche G). */
  play(a) {
    const g = this.game;
    if (!g.unlocks.has('tool:plumeau')) {
      g.ui.toast('🪶 Il te faut un plumeau ! Mimi en vend au Café des Chats.');
      return;
    }
    if (a.playCooldown > 0) return;
    if (!a.adopted && a.sp.shy > 0.55 && a.trust < 15) {
      a.startle();
      g.ui.toast(`${a.sp.emoji} Il a pris peur… Donne-lui d'abord à manger.`);
      return;
    }
    a.pet();
    a.stateT = 2.2;
    a.playCooldown = 3;
    g.player.face(a.pos.x, a.pos.z);
    g.player.character.play('wave', 1.8);
    const loves = ['chat', 'chien', 'pandaRoux', 'renard'].includes(a.species);
    g.particles.emit(loves ? 'heart' : 'note', a.headPosition(), { count: loves ? 4 : 2, spread: 0.6 });
    g.ui.bubble?.(a.headPosition(), loves ? '✨ Encore ! ✨' : a.sp.sound);
    g.audio?.play('pet');
    this.addTrust(a, loves ? 12 : 6);
    g.progress.addXp('soins', 6);
    g.emit('play', { animal: a });
    g.requestSave();
  }

  addTrust(a, amount) {
    const before = a.trust;
    const bonus = 1 + this.game.progress.perk('soins') * 0.07;
    a.trust = Math.min(100, a.trust + amount * bonus);
    if (!a.adopted && before < 100 && a.trust >= 100) {
      this.game.ui.toast(`💖 ${a.sp.label} ${a.variantName} t'adore ! Appuie sur R pour l'adopter.`);
    }
  }

  adopt(a, name) {
    const g = this.game;
    a.adopted = true;
    a.name = name || a.sp.label;
    a.follow = this.followers().length < MAX_FOLLOWERS;
    a.home = { ...this.yard };
    a.trust = 100;
    g.player.character.play('celebrate', 1.6);
    g.particles.emit('heart', a.headPosition(), { count: 6, spread: 0.8 });
    g.particles.emit('sparkle', a.headPosition(), { count: 4, spread: 0.8 });
    g.audio?.play('adopt');
    g.ui.toast(
      a.follow
        ? `🎉 ${a.name} fait maintenant partie de ta famille et te suit !`
        : `🎉 ${a.name} est adopté ! Il t'attend dans ton jardin (3 compagnons max. à la fois).`,
    );
    g.emit('adopt', { animal: a });
    g.progress.addXp('soins', 50);
    g.requestSave();
  }

  toggleFollow(a) {
    const g = this.game;
    if (!a.follow && this.followers().length >= MAX_FOLLOWERS) {
      g.ui.toast(`Tu as déjà ${MAX_FOLLOWERS} compagnons avec toi. Renvoie-en un à la maison d'abord.`);
      return false;
    }
    a.follow = !a.follow;
    if (!a.follow) {
      a.home = { ...this.yard };
      a.state = 'wander';
      a.target = { x: a.home.x, z: a.home.z };
      a.stateT = 60;
      g.ui.toast(`🏡 ${a.name} rentre au jardin.`);
    } else {
      g.ui.toast(`🐾 ${a.name} te suit !`);
    }
    g.requestSave();
    return true;
  }

  // --- Sauvegarde ------------------------------------------------------------

  serialize() {
    const animals = {};
    for (const a of this.animals) {
      if (a.trust > 0 || a.adopted) animals[a.id] = a.serialize();
    }
    return { animals, discovered: this.discovered };
  }

  restore(data) {
    if (!data) return;
    this.discovered = data.discovered || {};
    for (const a of this.animals) a.restore(data.animals?.[a.id], this.yard);
  }
}

// Position de la tête dans le monde (pour les bulles d'émotion).
Animal.prototype.headPosition = function headPosition() {
  return new THREE.Vector3(this.pos.x, this.pos.y + this.model.height * this.model.scale + 0.15, this.pos.z);
};
