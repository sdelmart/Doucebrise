import * as THREE from 'three';
import { ITEMS } from './items.js';
import { Shape, G, vertexColorToon } from '../core/materials.js';

// Pêche : 24 espèces (rareté, lieu, heures, saisons, météo), mini-jeu de ferrage,
// cannes à pêche, appâts, bouteilles à la mer et records de taille.

export const RARITY = [
  { label: 'Commun', color: '#9a8574', xp: 12, weight: 60 },
  { label: 'Peu commun', color: '#4fb896', xp: 20, weight: 26 },
  { label: 'Rare', color: '#6fa8dc', xp: 40, weight: 8 },
  { label: 'Légendaire', color: '#e0a000', xp: 90, weight: 1.3 },
];

// where : mer (ponton, port, falaise), falaise (falaise seulement), etang, lac (Lac Miroir),
// lagon (Lagon Turquoise) — ou une liste de ces lieux.
// hours : [début, fin] (peut passer minuit), seasons : indices de saison, rain : seulement sous la pluie.
const F = (id, label, emoji, rarity, where, size, price, extra = {}) => ({ id, label, emoji, rarity, where, size, price, ...extra });
export const FISH = [
  F('sardine', 'Sardine', '🐟', 0, 'mer', [10, 18], 20),
  F('maquereau', 'Maquereau', '🐟', 0, 'mer', [20, 35], 30),
  F('crevette', 'Crevette', '🦐', 0, 'mer', [5, 10], 25),
  F('crabe', 'Crabe', '🦀', 0, 'mer', [8, 20], 35),
  F('meduse', 'Méduse', '🪼', 0, 'mer', [15, 30], 12, { seasons: [1, 2] }),
  F('dorade', 'Dorade', '🐟', 1, 'mer', [25, 45], 55),
  F('bar', 'Bar', '🐟', 1, 'mer', [30, 60], 65, { seasons: [2, 3] }),
  F('calamar', 'Calamar', '🦑', 1, 'mer', [20, 40], 70, { hours: [19, 5] }),
  F('poisson-clown', 'Poisson-clown', '🐠', 1, ['mer', 'lagon'], [8, 12], 85, { seasons: [0, 1], hours: [8, 18] }),
  F('hippocampe', 'Hippocampe', '🐠', 2, ['mer', 'lagon'], [10, 20], 160, { seasons: [1, 2] }),
  F('pieuvre', 'Pieuvre', '🐙', 2, 'mer', [40, 90], 190, { hours: [18, 6] }),
  F('raie', 'Raie', '🐟', 2, 'falaise', [50, 120], 210),
  F('poisson-lune', 'Poisson-lune', '🐡', 3, 'falaise', [80, 180], 800, { seasons: [1], hours: [10, 17] }),
  F('espadon', 'Espadon', '🗡️', 3, 'falaise', [120, 250], 950, { seasons: [2, 3] }),
  F('gardon', 'Gardon', '🐟', 0, 'etang', [12, 25], 18),
  F('perche', 'Perche', '🐟', 0, 'etang', [15, 35], 28),
  F('carpe', 'Carpe', '🐟', 1, 'etang', [30, 70], 60),
  F('truite', 'Truite arc-en-ciel', '🌈', 1, ['etang', 'lac'], [25, 50], 80, { rain: true }),
  F('anguille', 'Anguille', '🐍', 1, 'etang', [40, 90], 90, { hours: [19, 5] }),
  F('poisson-chat', 'Poisson-chat', '🐱', 1, 'etang', [30, 60], 75, { hours: [17, 7] }),
  F('koi', 'Carpe koï', '🎏', 2, 'etang', [40, 80], 260, { seasons: [0, 1] }),
  F('brochet', 'Brochet', '🐟', 2, ['etang', 'lac'], [50, 110], 230, { seasons: [2, 3] }),
  F('esturgeon', 'Esturgeon', '🐟', 3, 'etang', [100, 200], 1000, { seasons: [3] }),
  F('poisson-dore', 'Poisson doré', '✨', 3, 'etang', [5, 10], 1200, { hours: [5, 8] }),
  // Lac Miroir (île des Pins) : eaux froides de montagne.
  F('ombre', 'Ombre commun', '🐟', 0, 'lac', [20, 40], 30),
  F('ecrevisse', 'Écrevisse', '🦞', 0, 'lac', [8, 15], 35),
  F('omble', 'Omble chevalier', '🐟', 1, 'lac', [25, 55], 90),
  F('lotte', 'Lotte de lac', '🐟', 1, 'lac', [30, 60], 95, { hours: [18, 6] }),
  F('saumon', 'Saumon', '🍣', 2, 'lac', [50, 100], 280, { seasons: [2] }),
  F('huchon', 'Huchon', '🐉', 3, 'lac', [90, 160], 1100, { seasons: [3], hours: [6, 10] }),
  // Lagon Turquoise (île Corail) : poissons tropicaux.
  F('demoiselle', 'Demoiselle bleue', '🐟', 0, 'lagon', [5, 10], 28),
  F('chirurgien', 'Poisson chirurgien', '🐠', 0, 'lagon', [15, 30], 38),
  F('perroquet', 'Poisson-perroquet', '🦜', 1, 'lagon', [30, 60], 95),
  F('barracuda', 'Barracuda', '🐟', 1, 'lagon', [60, 120], 110, { hours: [6, 20] }),
  F('poisson-ange', 'Poisson-ange', '👼', 2, 'lagon', [15, 30], 240, { seasons: [0, 1] }),
  F('merou', 'Mérou', '🐟', 2, 'lagon', [60, 130], 260),
  F('raie-manta', 'Raie manta', '🪽', 3, 'lagon', [200, 450], 1400, { seasons: [1], rain: false, hours: [9, 16] }),
  F('coelacanthe', 'Cœlacanthe', '🦕', 3, 'lagon', [120, 190], 1600, { hours: [0, 4] }),
];

/** Lieux où l'on peut pêcher chaque habitat de poisson. */
const HABITAT_OK = {
  mer: ['mer', 'falaise'],
  falaise: ['falaise'],
  etang: ['etang'],
  lac: ['lac'],
  lagon: ['lagon'],
};

export const WHERE_LABELS = { mer: 'En mer', falaise: 'Falaise du phare', etang: 'Étang', lac: 'Lac Miroir', lagon: 'Lagon Turquoise' };

export function fishWhere(f) {
  return Array.isArray(f.where) ? f.where : [f.where];
}

function fishHere(f, habitat) {
  return fishWhere(f).some((w) => HABITAT_OK[w]?.includes(habitat));
}

// Chaque poisson est un objet du sac (vendable), compté comme « poisson » pour les recettes et les chats.
for (const f of FISH) {
  ITEMS[f.id] = { label: f.label, emoji: f.emoji, cat: 'fish', price: f.price, feed: true, tag: 'poisson', rarity: f.rarity };
}

export const RODS = {
  bambou: { label: 'Canne en bambou', wait: 1, rare: 1, zone: 0, strikes: 2 },
  fibre: { label: 'Canne en fibre', wait: 0.8, rare: 1.5, zone: 0.05, strikes: 2, price: 800 },
  doree: { label: 'Canne dorée', wait: 0.62, rare: 2.2, zone: 0.1, strikes: 3, price: 3000 },
};

const HITS = [1, 2, 2, 3];
const ZONE = [0.3, 0.24, 0.18, 0.13];
const SPEED = [0.9, 1.15, 1.45, 1.8];

function inHours(h, [a, b]) {
  return a <= b ? h >= a && h < b : h >= a || h < b;
}

export class Fishing {
  constructor(game) {
    this.game = game;
    this.state = 'off';
    this.t = 0;
    const s = new Shape();
    s.add(G.sphere(0.09, 10, 8), '#ffffff', { pos: [0, 0.03, 0] });
    s.add(new THREE.SphereGeometry(0.092, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#e5484d', { pos: [0, 0.03, 0] });
    s.add(G.cyl(0.012, 0.012, 0.1, 4), '#4e4c62', { pos: [0, 0.15, 0] });
    this.bobber = new THREE.Mesh(s.build(), vertexColorToon());
    this.bobber.visible = false;
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 }));
    this.line.visible = false;
    this.line.frustumCulled = false;
    game.scene.add(this.bobber, this.line);
    this.best = {};
    this.rod = 'bambou';
    this.el = document.createElement('div');
    this.el.className = 'reel hidden';
    this.el.innerHTML = '<div class="reel-title"></div><div class="reel-track"><div class="reel-zone"></div><div class="reel-cursor"></div></div><div class="reel-info"></div>';
    document.body.appendChild(this.el);
  }

  get active() {
    return this.state !== 'off';
  }

  get rodInfo() {
    return RODS[this.rod] || RODS.bambou;
  }

  nearestSpot(maxDist = 2.4) {
    const p = this.game.player.pos;
    for (const s of this.game.world.fishingSpots) {
      if (Math.hypot(s.x - p.x, s.z - p.z) < maxDist) return s;
    }
    return null;
  }

  /** Poissons disponibles à cet endroit, maintenant. */
  available(spot) {
    const w = this.game.world;
    const h = w.sky.hour;
    const season = w.weather.seasonIndex;
    const rain = w.weather.isRaining;
    return FISH.filter((f) => {
      if (!fishHere(f, spot.habitat)) return false;
      if (f.hours && !inHours(h, f.hours)) return false;
      if (f.seasons && !f.seasons.includes(season)) return false;
      if (f.rain === true && !rain) return false;
      if (f.rain === false && rain) return false;
      return true;
    });
  }

  start(spot) {
    const g = this.game;
    this.spot = spot;
    this.state = 'wait';
    const lvl = g.progress.perk('peche');
    let wait = (2.5 + Math.random() * 4) * this.rodInfo.wait * (1 - lvl * 0.04);
    this.bait = false;
    if (g.inventory.appat > 0) {
      g.inventory.appat -= 1;
      this.bait = true;
      wait *= 0.6;
      g.ui.refreshInventory();
    }
    this.t = wait;
    g.player.frozen = true;
    g.player.face(spot.x + spot.dirX * 10, spot.z + spot.dirZ * 10);
    g.player.character.setFishing(true);
    this.bobberPos = new THREE.Vector3(spot.x + spot.dirX * 4.5, 0.02, spot.z + spot.dirZ * 4.5);
    this.bobber.position.copy(this.bobberPos);
    this.bobber.visible = true;
    this.line.visible = true;
    g.audio?.play('cast');
    if (this.bait) g.ui.toast('🪱 Appât accroché : ça va mordre plus vite !', 1600);
  }

  stop() {
    const g = this.game;
    this.state = 'off';
    this.bobber.visible = false;
    this.line.visible = false;
    this.el.classList.add('hidden');
    g.player.frozen = false;
    g.player.character.setFishing(false);
  }

  /** Tire au sort la prise. */
  roll() {
    const g = this.game;
    const r = Math.random();
    if (r < 0.025) return { bottle: true };
    if (r < 0.07) return { junk: true };
    const list = this.available(this.spot);
    const lvl = g.progress.perk('peche');
    const rareBoost = this.rodInfo.rare * (this.bait ? 1.5 : 1) * (1 + lvl * 0.08);
    const weights = list.map((f) => RARITY[f.rarity].weight * (f.rarity >= 2 ? rareBoost : 1));
    let t = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) {
      t -= weights[i];
      if (t <= 0) return { fish: list[i] };
    }
    return { fish: list[0] };
  }

  /** Appui sur E pendant la pêche. */
  action() {
    const g = this.game;
    if (this.state === 'bite') {
      this.startReel();
    } else if (this.state === 'reel') {
      this.reelPress();
    } else {
      g.ui.toast('Trop tôt ! Attends que le flotteur plonge… 🎣');
      this.stop();
    }
  }

  startReel() {
    const catchInfo = this.roll();
    this.catch = catchInfo;
    const rar = catchInfo.fish ? catchInfo.fish.rarity : 0;
    this.state = 'reel';
    this.reel = {
      hits: 0,
      need: catchInfo.fish ? HITS[rar] : 1,
      strikes: 0,
      zone: ZONE[rar] + this.rodInfo.zone + this.game.progress.perk('peche') * 0.006,
      zoneX: 0.2 + Math.random() * 0.5,
      speed: SPEED[rar],
      x: 0,
      dir: 1,
      timer: 4,
      rarity: rar,
    };
    this.el.classList.remove('hidden');
    this.renderReel();
  }

  renderReel() {
    const r = this.reel;
    const rar = RARITY[r.rarity];
    this.el.querySelector('.reel-title').innerHTML = `🎣 Ferre ! <span style="color:${rar.color}">${this.catch.fish ? rar.label : '???'}</span>`;
    const zone = this.el.querySelector('.reel-zone');
    zone.style.left = `${r.zoneX * 100}%`;
    zone.style.width = `${r.zone * 100}%`;
    this.el.querySelector('.reel-info').textContent = `Appuie sur E dans la zone verte · ${'💚'.repeat(r.hits)}${'🤍'.repeat(r.need - r.hits)} · ratés : ${r.strikes}/${this.rodInfo.strikes}`;
  }

  reelPress() {
    const r = this.reel;
    const g = this.game;
    if (r.x >= r.zoneX && r.x <= r.zoneX + r.zone) {
      r.hits++;
      g.audio.play('bite');
      if (r.hits >= r.need) {
        this.finish();
        return;
      }
      r.zoneX = 0.05 + Math.random() * (0.9 - r.zone);
      r.speed *= 1.1;
      r.timer = 4;
    } else {
      this.miss();
      if (this.state !== 'reel') return;
    }
    this.renderReel();
  }

  miss() {
    const r = this.reel;
    r.strikes++;
    r.timer = 4;
    this.game.audio.play('ui');
    if (r.strikes >= this.rodInfo.strikes) {
      this.game.ui.toast('Il s\'est échappé… Réessaie ! 🐟💨');
      this.stop();
    }
  }

  finish() {
    const g = this.game;
    const c = this.catch;
    this.el.classList.add('hidden');
    if (c.bottle) {
      const coins = 50 + Math.floor(Math.random() * 6) * 30;
      g.ui.toast('🍾 Une bouteille à la mer ! Il y a un mot dedans…', 3000);
      setTimeout(() => g.grantReward({ coins, items: Math.random() < 0.5 ? { appat: 3 } : { friandise: 1 } }, null, '📜 « À qui trouvera ce message : un petit trésor pour toi ! »'), 1200);
      g.progress.addXp('peche', 15);
    } else if (c.junk) {
      const junk = ['une vieille botte 👢', 'une algue gluante 🌿', 'une canette rouillée 🥫', 'un bout de bois 🪵'][Math.floor(Math.random() * 4)];
      g.ui.toast(`Oups… tu as repêché ${junk} !`);
      g.progress.addXp('peche', 3);
    } else {
      const f = c.fish;
      const size = Math.round(f.size[0] + Math.random() * Math.random() * (f.size[1] - f.size[0]) * 1.2);
      const clamped = Math.min(size, f.size[1]);
      g.inventory[f.id] = (g.inventory[f.id] || 0) + 1;
      const record = !this.best[f.id] || clamped > this.best[f.id];
      const firstTime = !this.best[f.id];
      if (record) this.best[f.id] = clamped;
      const rar = RARITY[f.rarity];
      g.ui.toast(`${f.emoji} ${f.label} (${clamped} cm) — ${rar.label}${firstTime ? ' · nouvelle espèce !' : record ? ' · record !' : ''}`, 3500);
      g.particles.emit('sparkle', this.bobberPos.clone().setY(0.6), { count: 2 + f.rarity * 2, spread: 0.6 });
      g.player.character.play('celebrate', 1.2);
      g.progress.addXp('peche', rar.xp);
      g.emit('catch', { fish: f.id, size: clamped, rarity: f.rarity, spot: this.spot.habitat });
      g.ui.refreshInventory();
      g.requestSave();
    }
    g.audio?.play('splash');
    this.stop();
  }

  update(dt, input) {
    if (!this.active) return;
    const g = this.game;
    const mv = input.moveVector();
    if (Math.hypot(mv.x, mv.y) > 0.2) {
      this.stop();
      return;
    }
    this.t -= dt;
    const time = performance.now() / 1000;
    let dip = Math.sin(time * 2.2) * 0.02;
    if (this.state === 'wait' && this.t <= 0) {
      this.state = 'bite';
      this.t = 1.4;
      g.particles.emit('alert', this.bobberPos.clone().setY(0.5), { size: 0.45 });
      g.particles.emit('drop', this.bobberPos.clone().setY(0.1), { count: 4, spread: 0.5, rise: 0.6, size: 0.18 });
      g.audio?.play('bite');
    } else if (this.state === 'bite') {
      dip = -0.12 + Math.sin(time * 25) * 0.05;
      if (this.t <= 0) {
        g.ui.toast('Il s\'est échappé… Réessaie ! 🐟💨');
        this.stop();
        return;
      }
    } else if (this.state === 'reel') {
      const r = this.reel;
      dip = -0.18 + Math.sin(time * 30) * 0.08;
      r.x += r.dir * r.speed * dt;
      if (r.x > 1) {
        r.x = 1;
        r.dir = -1;
      } else if (r.x < 0) {
        r.x = 0;
        r.dir = 1;
      }
      r.timer -= dt;
      if (r.timer <= 0) this.miss();
      if (this.state === 'reel') this.el.querySelector('.reel-cursor').style.left = `${r.x * 100}%`;
    }
    this.bobber.position.set(this.bobberPos.x, this.bobberPos.y + dip, this.bobberPos.z);
    const tip = new THREE.Vector3();
    g.player.character.rodTip.getWorldPosition(tip);
    const pos = this.line.geometry.attributes.position;
    pos.setXYZ(0, tip.x, tip.y, tip.z);
    pos.setXYZ(1, this.bobber.position.x, this.bobber.position.y + 0.2, this.bobber.position.z);
    pos.needsUpdate = true;
  }

  serialize() {
    return { best: this.best, rod: this.rod };
  }

  restore(d) {
    if (!d) return;
    // Ancien format : records par nom de poisson.
    if (d.best) this.best = d.best;
    else if (typeof d === 'object') this.best = {};
    this.rod = d.rod || 'bambou';
  }
}
