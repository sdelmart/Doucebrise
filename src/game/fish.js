import * as THREE from 'three';
import { ITEMS } from './items.js';
import { Shape, G, vertexColorToon } from '../core/materials.js';

// Pêche : 38 espèces (rareté, lieu, heures, saisons, météo), cannes à pêche, appâts,
// bouteilles à la mer et records de taille. L'ombre du poisson approche du flotteur (sa
// taille trahit la prise), quelques touches trompeuses avant la vraie morsure, puis un
// combat au moulinet : on mouline en maintenant E et on relâche quand le poisson tire,
// sinon la ligne casse.

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

// wait : attente, rare : chance de poissons rares, strength : tension (plus bas = ligne plus
// solide), reel : vitesse du moulinet.
export const RODS = {
  bambou: { label: 'Canne en bambou', wait: 1, rare: 1, strength: 1, reel: 1 },
  fibre: { label: 'Canne en fibre', wait: 0.8, rare: 1.5, strength: 0.85, reel: 1.1, price: 800 },
  doree: { label: 'Canne dorée', wait: 0.62, rare: 2.2, strength: 0.72, reel: 1.2, price: 3000 },
};

// Combat selon la rareté : vitesse du moulinet, force et fréquence des tirages du poisson.
const FIGHT = [
  { reel: 0.38, pull: 0.55, calm: [1.8, 3], rush: [0.4, 0.7], window: 1.5 },
  { reel: 0.27, pull: 1.05, calm: [1.4, 2.5], rush: [0.6, 1.1], window: 1.3 },
  { reel: 0.22, pull: 1.3, calm: [1.1, 2.1], rush: [0.7, 1.3], window: 1.1 },
  { reel: 0.17, pull: 1.55, calm: [0.9, 1.7], rush: [0.8, 1.5], window: 0.95 },
];
const rand = (a, b) => a + Math.random() * (b - a);

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
    // Ombre du poisson sous la surface.
    const sg = new THREE.CircleGeometry(0.5, 20);
    sg.rotateX(-Math.PI / 2);
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const cx = cv.getContext('2d');
    const grd = cx.createRadialGradient(32, 32, 4, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.55, 'rgba(255,255,255,0.8)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = grd;
    cx.fillRect(0, 0, 64, 64);
    this.shadow = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: '#0a1c26', map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0, depthWrite: false }));
    this.shadow.renderOrder = 3;
    this.shadow.visible = false;
    game.scene.add(this.shadow);
    this.el = document.createElement('div');
    this.el.className = 'reel hidden';
    this.el.innerHTML = `<div class="reel-title"></div>
      <div class="reel-track"><div class="reel-water"></div><div class="reel-fish">🐟</div></div>
      <div class="reel-tension"><div class="reel-tension-fill"></div><span>Tension</span></div>
      <div class="reel-info"></div>`;
    document.body.appendChild(this.el);
    // Au doigt ou à la souris : appuyer longuement sur le panneau mouline aussi.
    const hold = (on) => (e) => {
      this.pointerHold = on;
      if (on) e.preventDefault();
    };
    this.el.addEventListener('pointerdown', hold(true));
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) this.el.addEventListener(ev, hold(false));
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
    let wait = (3 + Math.random() * 4) * this.rodInfo.wait * (1 - lvl * 0.04);
    this.bait = false;
    if (g.inventory.appat > 0) {
      g.inventory.appat -= 1;
      this.bait = true;
      wait *= 0.6;
      g.ui.refreshInventory();
    }
    this.t = wait;
    this.waitTotal = wait;
    // La prise est tirée au lancer : son ombre approche du flotteur.
    this.catch = this.roll();
    this.planNibbles(wait);
    g.player.frozen = true;
    g.player.face(spot.x + spot.dirX * 10, spot.z + spot.dirZ * 10);
    g.player.character.setFishing(true);
    this.bobberPos = new THREE.Vector3(spot.x + spot.dirX * 4.5, 0.02, spot.z + spot.dirZ * 4.5);
    this.bobber.position.copy(this.bobberPos);
    this.bobber.visible = true;
    this.line.visible = true;
    this.showShadow();
    g.audio?.play('cast');
    if (this.bait) g.ui.toast('🪱 Appât accroché : ça va mordre plus vite !', 1600);
  }

  /** Touches trompeuses avant la vraie morsure (le poisson goûte l'appât). */
  planNibbles(wait) {
    const n = Math.floor(Math.random() * 3.2);
    this.nibbles = Array.from({ length: n }, () => wait * rand(0.08, 0.45)).sort((a, b) => b - a);
    this.nibbleT = 0;
  }

  /** Ombre du poisson : taille selon la prise, part de loin et s'approche. */
  showShadow() {
    const c = this.catch;
    const len = c.fish ? THREE.MathUtils.clamp((c.fish.size[0] + c.fish.size[1]) / 2 / 55, 0.3, 2.6) : 0.55;
    this.shadowLen = len;
    const a = Math.atan2(this.spot.dirX, this.spot.dirZ) + rand(-1.3, 1.3);
    this.shadowFrom = { a, r: rand(3.2, 4.6) };
    this.shadow.scale.set(len * 0.42, 1, len);
    this.shadow.material.opacity = 0;
    this.shadow.visible = true;
    this.shadowPos = new THREE.Vector3();
  }

  stop() {
    const g = this.game;
    this.state = 'off';
    this.bobber.visible = false;
    this.line.visible = false;
    this.shadow.visible = false;
    this.el.classList.add('hidden');
    this.pointerHold = false;
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
      // Le moulinet se commande en maintenant E (voir update).
    } else if (this.nibbleT > 0) {
      // Ferré sur une simple touche : le poisson se méfie et repart.
      g.ui.toast('Trop tôt ! Ce n\'était qu\'une touche : le poisson se méfie… 🐟', 2200);
      g.audio?.play('splash');
      this.nibbleT = 0;
      const wait = rand(3, 5.5) * this.rodInfo.wait;
      this.t = wait;
      this.waitTotal = wait;
      this.planNibbles(wait);
      this.shadowFrom = { a: this.shadowFrom.a + rand(-0.8, 0.8), r: rand(3.5, 4.8) };
    } else {
      g.ui.toast('Tu remontes ta ligne. 🎣');
      this.stop();
    }
  }

  startReel() {
    const c = this.catch;
    const rar = c.fish ? c.fish.rarity : 0;
    const F = FIGHT[rar];
    this.state = 'reel';
    this.reel = {
      rarity: rar,
      progress: 0.22,
      tension: 0.2,
      rush: false,
      phaseT: rand(...F.calm) * 0.6,
      slack: 0,
      tick: 0,
    };
    this.el.classList.remove('hidden');
    this.el.querySelector('.reel-fish').textContent = c.fish ? c.fish.emoji : c.bottle ? '🍾' : '❔';
    this.renderReel();
  }

  renderReel() {
    const r = this.reel;
    const rar = RARITY[r.rarity];
    this.el.querySelector('.reel-title').innerHTML = `🎣 ${r.rush ? 'Il tire ! Relâche !' : 'Mouline !'} <span style="color:${rar.color}">${this.catch.fish ? rar.label : '???'}</span>`;
    // Le poisson se rapproche (vers la gauche) à mesure qu'on mouline.
    this.el.querySelector('.reel-fish').style.left = `${(1 - r.progress) * 88 + 2}%`;
    this.el.querySelector('.reel-fish').classList.toggle('rush', r.rush);
    const fill = this.el.querySelector('.reel-tension-fill');
    fill.style.width = `${Math.round(r.tension * 100)}%`;
    fill.style.background = r.tension > 0.8 ? '#ef6f94' : r.tension > 0.55 ? '#f4b860' : '#7fd1b9';
    this.el.classList.toggle('danger', r.tension > 0.8);
    this.el.querySelector('.reel-info').textContent = r.rush
      ? '💦 Le poisson tire : relâche E pour ne pas casser la ligne !'
      : 'Maintiens E (ou appuie ici) pour mouliner · relâche quand il tire';
  }

  /** Combat au moulinet, à chaque image. */
  updateReel(dt, holding) {
    const g = this.game;
    const r = this.reel;
    const F = FIGHT[r.rarity];
    const rod = this.rodInfo;
    const lvl = g.progress.perk('peche');
    // Le poisson alterne calme et tirages.
    r.phaseT -= dt;
    if (r.phaseT <= 0) {
      r.rush = !r.rush;
      r.phaseT = r.rush ? rand(...F.rush) : rand(...F.calm);
      if (r.rush) {
        g.audio?.play('fishpull');
        g.particles.emit('drop', this.shadowPos.clone().setY(0.1), { count: 3, spread: 0.6, rise: 0.8, size: 0.2 });
      }
    }
    const strength = rod.strength * (1 - lvl * 0.02);
    if (holding) {
      r.progress += F.reel * rod.reel * (r.rush ? 0.3 : 1) * dt;
      r.tension += (r.rush ? F.pull : 0.22) * strength * dt;
      r.tick -= dt;
      if (r.tick <= 0) {
        r.tick = r.rush ? 0.11 : 0.07;
        g.audio?.play('reeltick');
      }
    } else {
      r.tension -= 0.55 * dt;
      r.progress -= (r.rush ? 0.09 : 0.02) * dt;
    }
    r.tension = Math.max(0, r.tension);
    if (r.tension >= 1) {
      g.audio?.play('snap');
      g.ui.toast('Clac ! La ligne a cassé… Relâche quand le poisson tire ! 🎣', 2800);
      this.stop();
      return;
    }
    if (r.progress <= 0) {
      g.ui.toast('Il a filé au large… Réessaie ! 🐟💨');
      this.stop();
      return;
    }
    if (r.progress >= 1) {
      this.finish();
      return;
    }
    this.renderReel();
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
    // Ombre : loin au lancer, elle s'approche du flotteur pendant l'attente.
    let near = 1 - this.t / this.waitTotal;
    let wiggle = 0.25;
    if (this.state === 'wait') {
      this.nibbleT = Math.max(0, this.nibbleT - dt);
      if (this.nibbles.length && this.t <= this.nibbles[0]) {
        this.nibbles.shift();
        this.nibbleT = 0.5;
        g.audio?.play('nibble');
        g.particles.emit('drop', this.bobberPos.clone().setY(0.05), { count: 1, spread: 0.2, rise: 0.3, size: 0.12 });
      }
      if (this.nibbleT > 0) dip = -0.05 * Math.sin((0.5 - this.nibbleT) * Math.PI * 4);
      if (this.t <= 0) {
        this.state = 'bite';
        this.t = FIGHT[this.catch.fish ? this.catch.fish.rarity : 0].window;
        g.particles.emit('alert', this.bobberPos.clone().setY(0.5), { size: 0.45 });
        g.particles.emit('drop', this.bobberPos.clone().setY(0.1), { count: 4, spread: 0.5, rise: 0.6, size: 0.18 });
        g.audio?.play('bite');
      }
    } else if (this.state === 'bite') {
      near = 1;
      dip = -0.12 + Math.sin(time * 25) * 0.05;
      if (this.t <= 0) {
        g.ui.toast('Il s\'est échappé… Il fallait ferrer quand le flotteur a plongé ! 🐟💨');
        this.stop();
        return;
      }
    } else if (this.state === 'reel') {
      const r = this.reel;
      near = 1;
      wiggle = r.rush ? 1.4 : 0.5;
      dip = -0.18 + Math.sin(time * (r.rush ? 40 : 22)) * (r.rush ? 0.1 : 0.05);
      this.updateReel(dt, this.pointerHold || input.down('KeyE'));
      if (!this.active) return;
    }
    // Ombre : distance au flotteur, petit balancement, orientée vers sa route.
    const from = this.shadowFrom;
    const rr = THREE.MathUtils.lerp(from.r, 0.25, THREE.MathUtils.smoothstep(near, 0, 1));
    const a = from.a + Math.sin(time * 0.9) * wiggle * 0.4;
    const reelPull = this.state === 'reel' && this.reel.rush ? 0.9 + Math.sin(time * 3) * 0.3 : 0;
    const sx = this.bobberPos.x + Math.sin(a) * (rr + reelPull);
    const sz = this.bobberPos.z + Math.cos(a) * (rr + reelPull);
    const prev = this.shadowPos.clone();
    this.shadowPos.set(sx, 0.015, sz);
    this.shadow.position.copy(this.shadowPos);
    if (prev.distanceToSquared(this.shadowPos) > 1e-6) this.shadow.rotation.y = Math.atan2(sx - prev.x, sz - prev.z);
    this.shadow.material.opacity = Math.min(0.6, this.shadow.material.opacity + dt * 0.4);
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
