import * as THREE from 'three';
import { ITEMS } from './items.js';
import { zoneAt } from '../world/layout.js';
import { Shape, G, vertexColorToon } from '../core/materials.js';

// Insectes : 22 espèces à attraper au filet (offert par Noé). Chacune a ses lieux,
// ses heures et ses saisons ; certaines ne sortent que sous la pluie ou la nuit.

export const INSECT_RARITY = [
  { label: 'Commun', color: '#9a8574', xp: 10, chance: 0.9 },
  { label: 'Peu commun', color: '#4fb896', xp: 18, chance: 0.78 },
  { label: 'Rare', color: '#6fa8dc', xp: 35, chance: 0.62 },
  { label: 'Légendaire', color: '#e0a000', xp: 80, chance: 0.48 },
];

const I = (id, label, emoji, color, rarity, kind, where, price, extra = {}) => ({ id, label, emoji, color, rarity, kind, where, price, ...extra });
export const INSECTS = [
  I('citron', 'Papillon citron', '🦋', '#ffe27a', 0, 'fly', ['prairie', 'village', 'verger'], 30, { hours: [7, 18], seasons: [0, 1, 2] }),
  I('monarque', 'Monarque', '🦋', '#ff8a3d', 1, 'fly', ['prairie', 'colline', 'belvedere'], 90, { hours: [8, 18], seasons: [1, 2] }),
  I('morpho', 'Morpho bleu', '🦋', '#4fa3ff', 2, 'fly', ['foret'], 180, { hours: [9, 17], seasons: [1] }),
  I('abeille', 'Abeille', '🐝', '#ffd84d', 0, 'fly', ['prairie', 'verger', 'village'], 35, { hours: [8, 17], seasons: [0, 1] }),
  I('libellule', 'Libellule', '🪽', '#5bc0be', 1, 'fly', ['etang', 'plage', 'lac', 'lagon'], 80, { hours: [9, 19], seasons: [1, 2] }),
  I('luciole', 'Luciole', '✨', '#fff27a', 1, 'fly', ['etang', 'foret', 'prairie', 'lac', 'source'], 70, { hours: [20, 4], seasons: [1, 2], glow: true }),
  I('papillon-lune', 'Papillon lune', '🌙', '#c8f0d0', 3, 'fly', ['foret', 'colline'], 600, { hours: [21, 4], seasons: [0, 1, 2], glow: true }),
  I('papillon-givre', 'Papillon de givre', '❄️', '#dff4ff', 2, 'fly', ['village', 'prairie', 'foret', 'colline', 'bourg', 'pinede', 'pic'], 260, { hours: [9, 16], seasons: [3] }),
  I('coccinelle', 'Coccinelle', '🐞', '#e5484d', 0, 'ground', ['prairie', 'verger', 'village', 'bourg'], 25, { hours: [7, 19], seasons: [0, 1] }),
  I('sauterelle', 'Sauterelle', '🦗', '#6fcf97', 0, 'ground', ['prairie', 'colline'], 30, { hours: [8, 19], seasons: [1, 2] }),
  I('chenille', 'Chenille', '🐛', '#8fcf6b', 0, 'ground', ['verger', 'foret'], 28, { hours: [6, 20], seasons: [0] }),
  I('escargot', 'Escargot', '🐌', '#c98b58', 1, 'ground', ['foret', 'village', 'verger', 'prairie', 'pinede', 'bourg'], 60, { rain: true }),
  I('scarabee', 'Scarabée doré', '🪲', '#e0a000', 2, 'ground', ['foret'], 220, { hours: [18, 6], seasons: [1, 2] }),
  // Île des Pins.
  I('bourdon', 'Bourdon', '🐝', '#f2b33d', 0, 'fly', ['bourg', 'pinede', 'pic'], 40, { hours: [8, 18], seasons: [0, 1, 2] }),
  I('apollon', 'Apollon des cimes', '🦋', '#f5f1e6', 1, 'fly', ['pic', 'pinede', 'lac'], 110, { hours: [9, 17], seasons: [1, 2] }),
  I('lucane', 'Lucane cerf-volant', '🪲', '#6b3f2a', 2, 'ground', ['pinede', 'source'], 280, { hours: [18, 4], seasons: [1] }),
  I('papillon-aurore', 'Papillon aurore', '🌈', '#9ff5d8', 3, 'fly', ['pic', 'lac'], 900, { hours: [21, 4], seasons: [3], glow: true }),
  // Île Corail.
  I('bernard', 'Bernard-l\'ermite', '🐚', '#ff9a76', 0, 'ground', ['lagon', 'corail', 'port', 'palmeraie'], 35, {}),
  I('cigale', 'Cigale', '🦗', '#9bb07a', 0, 'ground', ['palmeraie', 'corail', 'belvedere'], 45, { hours: [10, 19], seasons: [1, 2] }),
  I('mante', 'Mante religieuse', '🦗', '#7ed957', 1, 'ground', ['palmeraie', 'lagon', 'belvedere'], 120, { hours: [8, 18], seasons: [1, 2] }),
  I('ornithoptere', 'Ornithoptère émeraude', '🦋', '#3ddc84', 2, 'fly', ['palmeraie', 'corail', 'belvedere'], 320, { hours: [8, 17] }),
  I('hercule', 'Scarabée Hercule', '🪲', '#8a6a2f', 3, 'ground', ['palmeraie'], 850, { hours: [20, 4], seasons: [1, 2] }),
];

for (const b of INSECTS) ITEMS[b.id] = { label: b.label, emoji: b.emoji, cat: 'insect', price: b.price, tag: 'insecte', rarity: b.rarity };

const MAX_ACTIVE = 7;

function inHours(h, [a, b]) {
  return a <= b ? h >= a && h < b : h >= a || h < b;
}

function insectMesh(def) {
  const s = new Shape();
  const wings = new Shape();
  const c = def.color;
  if (def.kind === 'fly') {
    s.add(G.capsule(0.03, 0.12, 3, 6), '#3d3744', { rot: [Math.PI / 2, 0, 0] });
    if (def.id === 'abeille') {
      s.add(G.sphere(0.07, 8, 6), c, { pos: [0, 0, -0.03], scale: [1, 0.9, 1.3] });
      s.add(G.torus(0.065, 0.015, 4, 10), '#3d3744', { pos: [0, 0, -0.03] });
      wings.add(G.sphere(0.06, 8, 6), '#ffffff', { pos: [0.06, 0.05, 0], scale: [1, 0.2, 0.7] });
    } else if (def.id === 'libellule') {
      s.add(G.cyl(0.015, 0.015, 0.3, 5), c, { pos: [0, 0, -0.15], rot: [Math.PI / 2, 0, 0] });
      wings.add(G.sphere(0.12, 8, 6), '#e8fbff', { pos: [0.12, 0, 0.03], scale: [1, 0.1, 0.25] });
      wings.add(G.sphere(0.1, 8, 6), '#e8fbff', { pos: [0.1, 0, -0.04], scale: [1, 0.1, 0.25] });
    } else if (def.id === 'luciole') {
      s.add(G.sphere(0.05, 8, 6), c, { pos: [0, 0, -0.06] });
      wings.add(G.sphere(0.05, 8, 6), '#ffffff', { pos: [0.04, 0.03, 0], scale: [1, 0.2, 0.6] });
    } else {
      wings.add(G.sphere(0.14, 10, 8), c, { pos: [0.13, 0, 0.04], scale: [1, 0.12, 0.8] });
      wings.add(G.sphere(0.09, 10, 8), c, { pos: [0.1, 0, -0.1], scale: [1, 0.12, 0.8] });
      wings.add(G.sphere(0.04, 8, 6), '#ffffff', { pos: [0.17, 0.015, 0.07], scale: [1, 0.12, 1] });
    }
  } else if (def.id === 'escargot') {
    s.add(G.capsule(0.04, 0.16, 4, 8), '#e6c9a8', { pos: [0, 0.04, 0], rot: [Math.PI / 2, 0, 0] });
    s.add(G.torus(0.07, 0.04, 8, 14), c, { pos: [0, 0.12, -0.02], rot: [0, Math.PI / 2, 0] });
    for (const x of [-0.02, 0.02]) s.add(G.cyl(0.006, 0.006, 0.06, 4), '#e6c9a8', { pos: [x, 0.1, 0.11] });
  } else if (def.id === 'bernard') {
    s.add(G.cone(0.08, 0.16, 8), c, { pos: [0, 0.1, -0.02], rot: [-1.2, 0, 0] });
    s.add(G.torus(0.06, 0.028, 6, 12), '#ffd1bd', { pos: [0, 0.09, 0.02], rot: [0.3, 0, 0] });
    for (const x of [-0.05, 0.05]) s.add(G.sphere(0.028, 6, 5), '#e5484d', { pos: [x, 0.05, 0.09] });
  } else if (def.id === 'mante' || def.id === 'cigale') {
    s.add(G.capsule(0.03, def.id === 'mante' ? 0.2 : 0.12, 4, 8), c, { pos: [0, 0.07, 0], rot: [Math.PI / 2, 0, 0] });
    s.add(G.sphere(0.035, 8, 6), c, { pos: [0, 0.1, 0.12] });
    for (const x of [-0.04, 0.04]) s.add(G.box(0.012, 0.012, 0.1), c, { pos: [x, 0.1, 0.14], rot: [-0.8, 0, 0] });
    if (def.id === 'cigale') for (const x of [-0.04, 0.04]) s.add(G.sphere(0.06, 8, 6), '#e8fbff', { pos: [x, 0.1, -0.02], scale: [0.6, 0.15, 1.4] });
  } else if (def.id === 'chenille') {
    for (let i = 0; i < 5; i++) s.add(G.sphere(0.045, 8, 6), i === 4 ? '#ffd84d' : c, { pos: [0, 0.045 + Math.sin(i) * 0.01, -0.12 + i * 0.06] });
  } else if (def.id === 'sauterelle') {
    s.add(G.capsule(0.035, 0.14, 4, 8), c, { pos: [0, 0.06, 0], rot: [Math.PI / 2, 0, 0] });
    for (const x of [-0.05, 0.05]) s.add(G.box(0.012, 0.1, 0.14), c, { pos: [x, 0.08, -0.05], rot: [0.7, 0, 0] });
  } else {
    s.add(new THREE.SphereGeometry(0.07, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), c, { pos: [0, 0.02, 0], scale: [1, 0.8, 1.2] });
    s.add(G.sphere(0.035, 8, 6), '#3d3744', { pos: [0, 0.03, 0.08] });
    if (def.id === 'coccinelle') for (const [x, z] of [[0.03, 0.02], [-0.03, 0.02], [0.02, -0.04], [-0.02, -0.04]]) s.add(G.sphere(0.014, 5, 4), '#2e2e3a', { pos: [x, 0.075, z] });
    if (def.id === 'scarabee') s.add(G.cone(0.015, 0.06, 5), '#3d3744', { pos: [0, 0.07, 0.1], rot: [-0.8, 0, 0] });
    if (def.id === 'hercule') s.add(G.cone(0.02, 0.16, 5), '#2e2e3a', { pos: [0, 0.09, 0.14], rot: [-1.1, 0, 0] });
    if (def.id === 'lucane') for (const x of [-0.03, 0.03]) s.add(G.cone(0.014, 0.1, 5), '#4a2a1a', { pos: [x, 0.05, 0.14], rot: [-1.4, 0, x * 8] });
  }
  const group = new THREE.Group();
  const mat = def.glow ? new THREE.MeshBasicMaterial({ vertexColors: true }) : vertexColorToon();
  const body = new THREE.Mesh(s.build(), mat);
  group.add(body);
  const wingPairs = [];
  if (!wings.empty) {
    const wg = wings.build();
    const wmat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: def.id === 'libellule', opacity: 0.8 });
    for (const side of [1, -1]) {
      const w = new THREE.Mesh(wg, wmat);
      w.scale.x = side;
      group.add(w);
      wingPairs.push({ mesh: w, side });
    }
  }
  if (def.glow) {
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ color: def.color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(0.5);
    group.add(halo);
  }
  group.scale.setScalar(def.kind === 'fly' ? 1.9 : 2.1);
  return { group, wings: wingPairs };
}

export class Insects {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.active = [];
    this.caught = {};
    this.spawnT = 1;
  }

  get hasNet() {
    return this.game.unlocks.has('tool:filet');
  }

  /** Espèces présentes à cet endroit, maintenant. */
  available(zoneId) {
    const w = this.game.world;
    const h = w.sky.hour;
    const season = w.weather.seasonIndex;
    const rain = w.weather.isRaining;
    return INSECTS.filter((b) => {
      if (!b.where.includes(zoneId)) return false;
      if (b.hours && !inHours(h, b.hours)) return false;
      if (b.seasons && !b.seasons.includes(season)) return false;
      if (b.rain && !rain) return false;
      if (!b.rain && rain && b.kind === 'fly') return false;
      return true;
    });
  }

  spawn() {
    const g = this.game;
    const p = g.player.pos;
    for (let t = 0; t < 8; t++) {
      const a = Math.random() * Math.PI * 2;
      const r = 10 + Math.random() * 18;
      const x = p.x + Math.cos(a) * r;
      const z = p.z + Math.sin(a) * r;
      const zone = zoneAt(x, z);
      if (!zone) continue;
      const ground = g.world.groundAt(x, z);
      if (ground < 0.4) continue;
      const list = this.available(zone.id);
      if (!list.length) continue;
      const weights = list.map((b) => [6, 3, 1.2, 0.35][b.rarity]);
      let k = Math.random() * weights.reduce((s, w) => s + w, 0);
      let def = list[0];
      for (let i = 0; i < list.length; i++) {
        k -= weights[i];
        if (k <= 0) {
          def = list[i];
          break;
        }
      }
      const m = insectMesh(def);
      const y = def.kind === 'fly' ? ground + 0.8 + Math.random() * 1.2 : ground;
      m.group.position.set(x, y, z);
      this.group.add(m.group);
      this.active.push({ def, ...m, home: new THREE.Vector3(x, y, z), pos: new THREE.Vector3(x, y, z), t: Math.random() * 10, heading: Math.random() * 6, flee: 0, speed: def.kind === 'fly' ? 1.2 : 0.25 });
      return;
    }
  }

  remove(b) {
    b.group.removeFromParent();
    b.group.traverse((o) => {
      if (o.isMesh && o.geometry) o.geometry.dispose();
    });
    this.active = this.active.filter((x) => x !== b);
  }

  nearest(maxDist = 1.9) {
    const p = this.game.player.pos;
    let best = null;
    let bd = maxDist;
    for (const b of this.active) {
      if (b.flee > 0) continue;
      const d = Math.hypot(b.pos.x - p.x, b.pos.z - p.z);
      if (d < bd && Math.abs(b.pos.y - p.y) < 3) {
        bd = d;
        best = b;
      }
    }
    return best;
  }

  /** Insecte le plus proche (pour le guide). */
  closest() {
    const p = this.game.player.pos;
    let best = null;
    let bd = Infinity;
    for (const b of this.active) {
      const d = b.pos.distanceTo(p);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }

  prompt(b) {
    const rar = INSECT_RARITY[b.def.rarity];
    return {
      pos: b.pos.clone().add(new THREE.Vector3(0, 0.7, 0)),
      title: `${b.def.emoji} ${this.caught[b.def.id] ? b.def.label : '???'}`,
      sub: rar.label,
      actions: [{ key: 'E', label: this.hasNet ? 'Attraper au filet' : 'Il te faut un filet (Noé)', dim: !this.hasNet }],
    };
  }

  catch(b) {
    const g = this.game;
    if (!this.hasNet) {
      g.ui.toast('🥅 Il te faut un filet à papillons. Noé, le petit explorateur, en a un !');
      return;
    }
    if (this.swinging) return;
    this.swinging = true;
    g.player.face(b.pos.x, b.pos.z);
    g.character.setNet(true);
    g.character.play('swing', 0.6);
    g.audio.play('swoosh');
    const running = g.player.speed > 5;
    const chance = INSECT_RARITY[b.def.rarity].chance + g.progress.perk('insectes') * 0.035 - (running ? 0.3 : 0);
    const ok = Math.random() < chance;
    setTimeout(() => {
      this.swinging = false;
      g.character.setNet(false);
      if (!this.active.includes(b)) return;
      if (ok) {
        const first = !this.caught[b.def.id];
        this.caught[b.def.id] = (this.caught[b.def.id] || 0) + 1;
        g.inventory[b.def.id] = (g.inventory[b.def.id] || 0) + 1;
        const rar = INSECT_RARITY[b.def.rarity];
        g.particles.emit('sparkle', b.pos.clone(), { count: 2 + b.def.rarity * 2, spread: 0.5 });
        g.ui.toast(`${b.def.emoji} ${b.def.label} attrapé ! — ${rar.label}${first ? ' · nouvelle espèce !' : ''}`, 3200);
        g.audio.play(b.def.rarity >= 2 ? 'fav' : 'pick');
        g.player.character.play('celebrate', 1.0);
        g.progress.addXp('insectes', rar.xp);
        g.emit('insect', { id: b.def.id, rarity: b.def.rarity });
        this.remove(b);
        g.ui.refreshInventory();
        g.requestSave();
      } else {
        b.flee = 2.5;
        g.ui.toast(running ? 'Oups, tu as couru : il s\'est envolé ! Approche doucement…' : 'Raté ! Il t\'a échappé…', 2200);
      }
    }, 450);
  }

  update(dt) {
    const g = this.game;
    const p = g.player.pos;
    const outside = g.state === 'play' && !g.indoors;
    this.spawnT -= dt;
    if (outside && this.spawnT <= 0) {
      this.spawnT = 2.5;
      if (this.active.length < MAX_ACTIVE) this.spawn();
    }
    for (const b of [...this.active]) {
      b.t += dt;
      const d = b.pos.distanceTo(p);
      if (d > 45 || !outside) {
        this.remove(b);
        continue;
      }
      // Fuite si le joueur court tout près, ou après un raté.
      if (b.flee <= 0 && g.player.speed > 5.5 && d < 3.2 && b.def.rarity >= 1) b.flee = 2.5;
      if (b.flee > 0) {
        b.flee -= dt;
        const away = b.pos.clone().sub(p).setY(0).normalize();
        b.pos.addScaledVector(away, dt * 4);
        if (b.def.kind === 'fly') b.pos.y += dt * 2;
        b.group.scale.setScalar(Math.max(0.01, b.group.scale.x - dt * 0.4));
        if (b.flee <= 0) {
          this.remove(b);
          continue;
        }
      } else if (b.def.kind === 'fly') {
        b.heading += (Math.sin(b.t * 0.7) + Math.sin(b.t * 1.9)) * dt * 1.2;
        const tx = b.home.x + Math.cos(b.heading) * 2.2;
        const tz = b.home.z + Math.sin(b.heading * 1.3) * 2.2;
        b.pos.x += (tx - b.pos.x) * dt * 0.8;
        b.pos.z += (tz - b.pos.z) * dt * 0.8;
        b.pos.y = b.home.y + Math.sin(b.t * 2.1) * 0.35;
      } else {
        b.heading += Math.sin(b.t * 0.5) * dt;
        const nx = b.pos.x + Math.cos(b.heading) * b.speed * dt;
        const nz = b.pos.z + Math.sin(b.heading) * b.speed * dt;
        if (Math.hypot(nx - b.home.x, nz - b.home.z) < 2.5) {
          b.pos.x = nx;
          b.pos.z = nz;
        } else b.heading += Math.PI * dt;
        b.pos.y = g.world.groundAt(b.pos.x, b.pos.z);
      }
      b.group.position.copy(b.pos);
      b.group.rotation.y = -b.heading + Math.PI / 2;
      for (const w of b.wings) w.mesh.rotation.z = w.side * Math.sin(b.t * (b.def.id === 'abeille' || b.def.id === 'libellule' ? 40 : 14)) * 0.8;
    }
  }

  serialize() {
    return { caught: this.caught };
  }

  restore(d) {
    if (d?.caught) this.caught = { ...d.caught };
  }
}
