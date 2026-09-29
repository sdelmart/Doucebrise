import * as THREE from 'three';
import { ITEMS, RECIPES } from './items.js';
import { ZONES } from '../world/layout.js';
import { Shape, G, vertexColorToon } from '../core/materials.js';
import { createRng } from '../core/math.js';
import { Fireworks, FIREWORK_COLORS } from '../world/fireworks.js';
import { escapeHtml } from '../ui/ui.js';
import { SnowFestival } from './snowfest.js';

// Fêtes de saison avec leur mini-jeu (le premier jour de chaque saison) :
// - printemps : Chasse aux œufs — des œufs peints cachés sur l'île, à montrer à Mamie Rose ;
// - été : Fête de l'été — grand feu d'artifice sur la plage (21 h – 23 h), et une caisse de
//   fusées pour lancer les siennes ; les habitants viennent regarder ;
// - automne : Concours de cuisine — un plat présenté au jury (Mimi, Élise, Pomme) après un
//   petit jeu de dressage de l'assiette ;
// - hiver : Fête des neiges — bonshommes de neige et bataille de boules de neige (snowfest.js).

ITEMS['oeuf-peint'] = { label: 'Œuf peint', emoji: '🥚', cat: 'forage', price: 15, desc: 'Caché pendant la Chasse aux œufs du printemps. Montre-les à Mamie Rose !' };
ITEMS['oeuf-choco'] = { label: 'Œuf en chocolat', emoji: '🍫', cat: 'dish', price: 45 };

const EGGS = 14;
const EGG_ZONES = ['village', 'prairie', 'verger', 'colline', 'foret', 'plage', 'etang'];
const EGG_COLORS = ['#ff8fab', '#ffd84d', '#8fd6e8', '#b69cf0', '#7fd1b9', '#ffb27a', '#ffffff', '#e5484d'];
const MAIN_VILLAGERS = ['rose', 'pomme', 'bruno', 'lila', 'marin', 'noe', 'mimi', 'leo'];
const AUTUMN = ['citrouille', 'pomme', 'champignon', 'myrtille', 'pomme-pin', 'mais'];
const rand = (a, b) => a + Math.random() * (b - a);

/** Œuf peint : rayures et pois, posé sur le sol. */
function eggGeometry(rng) {
  const g = new THREE.SphereGeometry(0.19, 14, 10);
  g.scale(1, 1.3, 1);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const pick = () => new THREE.Color(EGG_COLORS[Math.floor(rng() * EGG_COLORS.length)]);
  const a = pick();
  const b = pick();
  const c = pick();
  const bands = rng() < 0.5;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 0.247;
    const ang = Math.atan2(pos.getZ(i), pos.getX(i));
    let k = a;
    if (bands) {
      if (Math.abs(y - 0.3) < 0.12 || Math.abs(y + 0.25) < 0.12) k = b;
      else if (Math.abs(y - 0.02) < 0.06) k = c;
    } else if (Math.sin(ang * 5) * Math.sin(y * 7) > 0.55) k = b;
    else if (y > 0.7) k = c;
    col[i * 3] = k.r;
    col[i * 3 + 1] = k.g;
    col[i * 3 + 2] = k.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.translate(0, 0.22, 0);
  return g;
}

/** Caisse de fusées (Fête de l'été). */
function crateGeometry() {
  const s = new Shape();
  s.add(G.box(1.1, 0.55, 0.8), '#b07a4a', { pos: [0, 0.28, 0] });
  s.add(G.box(1.14, 0.08, 0.84), '#8a5a33', { pos: [0, 0.57, 0] });
  const cols = ['#ff5a7a', '#ffd84d', '#6fe0ff', '#b98cff', '#7dff9a'];
  for (let i = 0; i < 6; i++) {
    const x = -0.36 + (i % 3) * 0.36;
    const z = i < 3 ? -0.18 : 0.18;
    s.add(G.cyl(0.06, 0.06, 0.5, 8), cols[i % cols.length], { pos: [x, 0.85, z] });
    s.add(G.cone(0.07, 0.14, 8), '#fffaf2', { pos: [x, 1.17, z] });
  }
  return s.build();
}

/** Table du jury (Concours de cuisine) : nappe à carreaux, cloche et trophée. */
function juryTableGeometry() {
  const s = new Shape();
  s.add(G.box(2.4, 0.08, 0.9), '#fffaf2', { pos: [0, 0.82, 0] });
  for (let i = 0; i < 6; i++) s.add(G.box(0.4, 0.085, 0.9), '#e5484d', { pos: [-1.0 + i * 0.4, 0.822, 0], scale: [i % 2 ? 0 : 1, 1, 1] });
  for (const x of [-1.1, 1.1]) for (const z of [-0.36, 0.36]) s.add(G.cyl(0.04, 0.04, 0.8, 6), '#8a5a33', { pos: [x, 0.4, z] });
  s.add(G.sphere(0.2, 12, 8), '#d9dde3', { pos: [-0.6, 0.86, 0], scale: [1, 0.8, 1] });
  s.add(G.sphere(0.03, 6, 5), '#d9dde3', { pos: [-0.6, 1.04, 0] });
  s.add(G.cyl(0.05, 0.08, 0.1, 10), '#e0a000', { pos: [0.6, 0.91, 0] });
  s.add(G.cyl(0.12, 0.05, 0.2, 12), '#ffd84d', { pos: [0.6, 1.06, 0] });
  return s.build();
}

export class Festivals {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.eggs = [];
    this.hunt = null;
    this.cook = null;
    this.summer = null;
    this.fireworks = new Fireworks(game.scene, game.audio);
    this.mat = vertexColorToon();
    this.hintT = 0;
    this.showT = 0;
    this.crateCd = 0;
    this.fwColor = 0;
    this.gathered = new Set();
    this.today = null;
    this.buildPlating();
    this.snow = new SnowFestival(game, this);
  }

  get festivalId() {
    return this.game.calendar.festival?.id || null;
  }

  // --- Lieux -------------------------------------------------------------------------

  /** Plage de la Fête de l'été : caisse sur le sable sec, tir au large, public en arc. */
  beach() {
    if (this.beachSpot) return this.beachSpot;
    const w = this.game.world;
    const P = ZONES.find((z) => z.id === 'plage');
    const len = Math.hypot(P.x, P.z) || 1;
    const dir = { x: P.x / len, z: P.z / len };
    let best = { x: P.x, z: P.z };
    for (let t = -18; t <= 18; t += 0.5) {
      const x = P.x + dir.x * t;
      const z = P.z + dir.z * t;
      const h = w.heightAt(x, z);
      if (h > 0.8 && h < 1.8) best = { x, z };
    }
    const rot = Math.atan2(dir.x, dir.z);
    this.beachSpot = {
      crate: { x: best.x, z: best.z, y: w.groundAt(best.x, best.z), rot },
      launch: new THREE.Vector3(best.x + dir.x * 34, 0.4, best.z + dir.z * 34),
      dir,
      side: { x: dir.z, z: -dir.x },
    };
    return this.beachSpot;
  }

  /** Table du jury, devant le café. */
  jurySpot() {
    const cafe = this.game.world.village.shopSpots.cafe;
    if (!cafe) return null;
    const x = cafe.x + Math.sin(cafe.rot) * 3.2 + Math.cos(cafe.rot) * 2.5;
    const z = cafe.z + Math.cos(cafe.rot) * 3.2 - Math.sin(cafe.rot) * 2.5;
    return { x, z, y: this.game.world.groundAt(x, z), rot: cafe.rot };
  }

  // --- Nouveau jour ------------------------------------------------------------------

  onNewDay() {
    const g = this.game;
    const day = g.world.sky.day;
    const f = this.festivalId;
    if (this.today === day) return;
    this.today = day;
    this.clearEggs();
    this.releaseAudience();
    if (this.crate) this.crate.visible = f === 'ete';
    if (this.jury) this.jury.visible = f === 'cuisine';
    if (f === 'oeufs') {
      if (this.hunt?.day !== day) this.hunt = { day, found: [], done: false };
      this.spawnEggs(day);
    }
    if (f === 'ete') {
      if (this.summer?.day !== day) this.summer = { day, launched: 0 };
      if (!this.crate) {
        const c = this.beach().crate;
        this.crate = new THREE.Mesh(crateGeometry(), this.mat);
        this.crate.position.set(c.x, c.y, c.z);
        this.crate.rotation.y = c.rot;
        this.group.add(this.crate);
      }
      this.crate.visible = true;
    }
    if (f === 'cuisine') {
      if (this.cook?.day !== day) this.cook = { day, done: false };
      const j = this.jurySpot();
      if (!this.jury && j) {
        this.jury = new THREE.Mesh(juryTableGeometry(), this.mat);
        this.jury.position.set(j.x, j.y, j.z);
        this.jury.rotation.y = j.rot;
        this.group.add(this.jury);
      }
      if (this.jury) this.jury.visible = true;
    }
    this.snow.onNewDay();
  }

  // --- Chasse aux œufs ----------------------------------------------------------------

  eggSpots(day) {
    const w = this.game.world;
    const rng = createRng(day * 977 + 5);
    const zones = EGG_ZONES.map((id) => ZONES.find((z) => z.id === id)).filter(Boolean);
    const out = [];
    for (let tries = 0; out.length < EGGS && tries < 800; tries++) {
      const z = zones[out.length % zones.length];
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * z.r * 0.95;
      const x = z.x + Math.cos(a) * r;
      const zz = z.z + Math.sin(a) * r;
      if (w.heightAt(x, zz) < 0.7 || w.terrain.slopeAt(x, zz) > 0.35 || w.onPlatform(x, zz)) continue;
      const res = w.colliders.resolve(x, zz, 0.5);
      if (Math.hypot(res.x - x, res.z - zz) > 0.01) continue;
      if (out.some((e) => Math.hypot(e.x - x, e.z - zz) < 6)) continue;
      out.push({ id: out.length, x, z: zz, y: w.groundAt(x, zz), rng: createRng(day * 31 + out.length) });
    }
    return out;
  }

  spawnEggs(day) {
    const found = new Set(this.hunt?.found || []);
    for (const e of this.eggSpots(day)) {
      if (found.has(e.id)) continue;
      const m = new THREE.Mesh(eggGeometry(e.rng), this.mat);
      m.position.set(e.x, e.y - 0.03, e.z);
      m.rotation.set(rand(-0.25, 0.25), rand(0, Math.PI * 2), rand(-0.25, 0.25));
      this.group.add(m);
      this.eggs.push({ ...e, mesh: m });
    }
  }

  clearEggs() {
    for (const e of this.eggs) {
      e.mesh.removeFromParent();
      e.mesh.geometry.dispose();
    }
    this.eggs = [];
  }

  get huntOpen() {
    const h = this.game.world.sky.hour;
    return this.festivalId === 'oeufs' && h >= 7 && h < 20;
  }

  nearestEgg(maxDist = 1.5) {
    if (!this.huntOpen) return null;
    const p = this.game.player.pos;
    let best = null;
    let bd = maxDist;
    for (const e of this.eggs) {
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  pickEgg(e) {
    const g = this.game;
    this.eggs = this.eggs.filter((x) => x !== e);
    e.mesh.removeFromParent();
    e.mesh.geometry.dispose();
    this.hunt.found.push(e.id);
    g.inventory['oeuf-peint'] = (g.inventory['oeuf-peint'] || 0) + 1;
    g.particles.emit('sparkle', new THREE.Vector3(e.x, e.y + 0.5, e.z), { count: 4, spread: 0.5 });
    g.audio.play('pick');
    g.player.character.play('celebrate', 0.8);
    const n = this.hunt.found.length;
    g.ui.toast(`🥚 Un œuf peint ! (${n}/${EGGS})${n === EGGS ? ' Tu les as tous trouvés !' : ''} Montre-les à Mamie Rose.`, 2600);
    g.emit('egg', { count: n });
    g.ui.refreshInventory();
    g.requestSave();
  }

  huntResults() {
    const g = this.game;
    const h = this.hunt;
    const mine = h.found.length;
    const rng = createRng(h.day * 53 + 7);
    const rivals = [
      { name: 'Noé', n: 3 + Math.floor(rng() * 8) },
      { name: 'Mimi', n: 2 + Math.floor(rng() * 7) },
      { name: 'Léo', n: 3 + Math.floor(rng() * 7) },
      { name: 'Pomme', n: 4 + Math.floor(rng() * 7) },
    ];
    const all = [...rivals, { name: g.character.appearance.name, n: mine, me: true }].sort((a, b) => b.n - a.n || (a.me ? -1 : 1));
    const rank = all.findIndex((x) => x.me) + 1;
    h.done = true;
    h.rank = rank;
    g.inventory['oeuf-peint'] = Math.max(0, (g.inventory['oeuf-peint'] || 0) - mine);
    const prizes = {
      1: { coins: 500, furniture: { 'panier-oeufs': 1 }, items: { 'oeuf-choco': 3 }, stars: 8 },
      2: { coins: 250, items: { 'oeuf-choco': 2 } },
      3: { coins: 120, items: { 'oeuf-choco': 1 } },
    };
    const prize = prizes[rank] || { coins: 50, items: { 'oeuf-choco': 1 } };
    g.emit('egghunt', { rank, count: mine });
    g.ui.refreshInventory();
    setTimeout(() => g.grantReward(prize, null, `🥚 Chasse aux œufs — ${rank === 1 ? '1re' : `${rank}e`} place :`), 400);
    return { rank, all };
  }

  // --- Fête de l'été : feu d'artifice ---------------------------------------------------

  get showOn() {
    const h = this.game.world.sky.hour;
    return this.festivalId === 'ete' && h >= 21 && h < 23.25;
  }

  get crateOpen() {
    const h = this.game.world.sky.hour;
    return this.festivalId === 'ete' && (h >= 19 || h < 1);
  }

  nearCrate() {
    if (!this.crate?.visible || !this.crateOpen) return false;
    const c = this.beach().crate;
    const p = this.game.player.pos;
    return Math.hypot(c.x - p.x, c.z - p.z) < 2;
  }

  launchOwn() {
    const g = this.game;
    if (this.crateCd > 0) return;
    this.crateCd = 1.1;
    const b = this.beach();
    const c = b.crate;
    const from = new THREE.Vector3(c.x + b.dir.x * 7, c.y + 0.4, c.z + b.dir.z * 7);
    const color = FIREWORK_COLORS[this.fwColor++ % FIREWORK_COLORS.length];
    this.fireworks.launch(from, { color, height: rand(16, 22), camera: g.camera, kind: this.fwColor % 5 === 0 ? 'coeur' : null });
    if (this.summer) this.summer.launched++;
    g.player.character.play('clap', 1.2);
    g.emit('firework', { zone: g.zone?.id || null });
    g.requestSave();
  }

  /**
   * Tout l'archipel vient voir le feu d'artifice sur la plage : les habitants du village
   * devant, ceux de Bourg-Sapin et de Port-Corail juste derrière, en rangs décalés.
   */
  gatherAudience() {
    const g = this.game;
    const w = g.world;
    const b = this.beach();
    const c = b.crate;
    const others = g.villagers.list.map((v) => v.def.id).filter((id) => !MAIN_VILLAGERS.includes(id));
    const PER_ROW = 6;
    [...MAIN_VILLAGERS, ...others].forEach((id, i) => {
      const v = g.villagers.get(id);
      if (!v || this.gathered.has(id) || (v.override && !v.override.audience)) return;
      const row = Math.floor(i / PER_ROW);
      const k = ((i % PER_ROW) - (PER_ROW - 1) / 2) * 1.7 + (row % 2) * 0.85;
      const back = 3 + row * 1.6;
      let x = c.x + b.side.x * k - b.dir.x * back;
      let z = c.z + b.side.z * k - b.dir.z * back;
      // Ni dans l'eau, ni dans un rocher ou un palmier.
      for (let n = 0; n < 4 && w.heightAt(x, z) < 0.3; n++) {
        x -= b.dir.x * 1.5;
        z -= b.dir.z * 1.5;
      }
      const res = w.colliders.resolve(x, z, 0.4);
      x = res.x;
      z = res.z;
      v.override = { x, z, rot: Math.atan2(b.launch.x - x, b.launch.z - z), audience: true };
      this.gathered.add(id);
    });
  }

  releaseAudience() {
    const g = this.game;
    for (const id of this.gathered) {
      const v = g.villagers.get(id);
      if (!v) continue;
      v.override = null;
      v.placeAt(v.scheduled(g.world.sky.hour));
    }
    this.gathered.clear();
  }

  // --- Concours de cuisine ------------------------------------------------------------

  get contestOpen() {
    const h = this.game.world.sky.hour;
    return this.festivalId === 'cuisine' && h >= 9 && h < 18 && this.cook && !this.cook.done;
  }

  dishes() {
    const inv = this.game.inventory;
    return Object.keys(ITEMS).filter((id) => ITEMS[id].cat === 'dish' && inv[id] > 0);
  }

  /** Note d'un plat : goût (prix), dressage (0 à 6 points), goûts du jury, saison. */
  score(dishId, points) {
    const g = this.game;
    const it = ITEMS[dishId];
    const taste = 38 + Math.min(it.price, 150) * 0.38;
    const look = points * 6;
    const comments = [];
    let likes = 0;
    for (const id of ['mimi', 'elise', 'pomme']) {
      const v = g.villagers.get(id);
      const r = v ? v.reaction(dishId) : 'neutral';
      const bonus = { love: 10, like: 5, neutral: 0, dislike: -6 }[r];
      likes += bonus;
      const name = v?.def.name || id;
      comments.push(r === 'love' ? `${name} : « Mon plat préféré ! »` : r === 'like' ? `${name} : « Délicieux ! »` : r === 'dislike' ? `${name} : « Hum… pas trop mon goût. »` : `${name} : « Bien assaisonné. »`);
    }
    const recipe = RECIPES.find((r) => r.id === dishId);
    const autumn = recipe && Object.keys(recipe.needs).some((id) => AUTUMN.includes(id)) ? 8 : 0;
    if (autumn) comments.push('Le jury : « Des saveurs d\'automne, bravo ! »');
    if (points >= 5) comments.push('Le jury : « Quelle présentation ! »');
    return { total: Math.round(taste + look + likes + autumn), comments };
  }

  contestResults(dishId, points) {
    const g = this.game;
    const c = this.cook;
    const { total, comments } = this.score(dishId, points);
    const rng = createRng(c.day * 61 + 17);
    const rivals = [
      { name: 'Bruno', dish: 'soupe' },
      { name: 'Lila', dish: 'tarte' },
      { name: 'Marin', dish: 'maki' },
      { name: 'Hugo', dish: 'soupe-bois' },
      { name: 'Maëlys', dish: 'crepe' },
    ].map((r) => ({ ...r, score: Math.round(72 + rng() * 52) }));
    const all = [...rivals, { name: g.character.appearance.name, dish: dishId, score: total, me: true }].sort((a, b) => b.score - a.score || (a.me ? -1 : 1));
    const rank = all.findIndex((x) => x.me) + 1;
    c.done = true;
    c.rank = rank;
    c.score = total;
    g.inventory[dishId] = Math.max(0, (g.inventory[dishId] || 0) - 1);
    const prizes = {
      1: { coins: 700, furniture: { 'trophee-cuisine': 1 }, stars: 10, title: 'Grand·e chef' },
      2: { coins: 300, items: { 'sem-citrouille': 3, friandise: 2 } },
      3: { coins: 150, items: { friandise: 3 } },
    };
    const prize = prizes[rank] || { coins: 60 };
    g.emit('cookcontest', { rank, score: total, dish: dishId });
    g.progress.addXp('cuisine', 30 + Math.max(0, 4 - rank) * 15);
    g.ui.refreshInventory();
    setTimeout(() => g.grantReward(prize, null, `🏆 Concours de cuisine — ${rank === 1 ? '1re' : `${rank}e`} place :`), 400);
    return { rank, all, total, comments };
  }

  /** Choix du plat dans le dialogue (comme le menu des cadeaux). */
  pickDish(dialogue, onPick) {
    const g = this.game;
    const list = this.dishes();
    dialogue.el.querySelector('.d-text').textContent = 'Quel plat présentes-tu au jury ?';
    const box = dialogue.el.querySelector('.d-choices');
    box.innerHTML = '';
    box.classList.add('grid');
    for (const id of list) {
      const b = document.createElement('button');
      b.className = 'd-item';
      b.title = ITEMS[id].label;
      b.innerHTML = `<span>${ITEMS[id].emoji}</span><small>${g.inventory[id]}</small>`;
      b.onclick = () => {
        box.classList.remove('grid');
        onPick(id);
      };
      box.appendChild(b);
    }
    const back = document.createElement('button');
    back.className = 'd-choice';
    back.textContent = '↩️ Retour';
    back.onclick = () => {
      box.classList.remove('grid');
      dialogue.render(dialogue.villager.greeting());
    };
    box.appendChild(back);
  }

  // --- Dressage de l'assiette (mini-jeu du concours) ---------------------------------------

  buildPlating() {
    const el = document.createElement('div');
    el.id = 'plating';
    el.className = 'modal hidden';
    el.innerHTML = `<div class="modal-card plating-card">
      <h2>🍽️ Dressage de l'assiette</h2>
      <div class="plating-dish"></div>
      <p class="note">Appuie sur <b>E</b> (ou touche l'assiette) quand le curseur passe dans la zone dorée : trois garnitures à poser !</p>
      <div class="plating-track"><div class="plating-zone"><div class="plating-perfect"></div></div><div class="plating-cursor"></div></div>
      <div class="plating-steps"></div>
      <div class="plating-info"></div></div>`;
    document.body.appendChild(el);
    this.platingEl = el;
    const press = (e) => {
      if (!this.plating) return;
      if (e.type === 'keydown') {
        if (!['KeyE', 'Space', 'Enter'].includes(e.code) || e.repeat) return;
        e.preventDefault();
      }
      this.platingPress();
    };
    window.addEventListener('keydown', press);
    el.querySelector('.plating-card').addEventListener('pointerdown', press);
  }

  startPlating(dishId, done) {
    const g = this.game;
    const it = ITEMS[dishId];
    this.plating = { dishId, done, round: 0, points: 0, x: 0, dir: 1, speed: 0.75, marks: [], zone: 0.3, zoneX: rand(0.2, 0.5), wait: 0 };
    g.input.enabled = false;
    this.platingEl.classList.remove('hidden');
    this.platingEl.querySelector('.plating-dish').innerHTML = `<span class="plating-emoji">${it.emoji}</span> ${escapeHtml(it.label)}`;
    this.renderPlating();
    let last = performance.now();
    const loop = (now) => {
      const p = this.plating;
      if (!p) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (p.wait > 0) p.wait -= dt;
      else {
        p.x += p.dir * p.speed * dt;
        if (p.x > 1) {
          p.x = 1;
          p.dir = -1;
        } else if (p.x < 0) {
          p.x = 0;
          p.dir = 1;
        }
      }
      this.platingEl.querySelector('.plating-cursor').style.left = `${p.x * 100}%`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  renderPlating() {
    const p = this.plating;
    const el = this.platingEl;
    const zone = el.querySelector('.plating-zone');
    zone.style.left = `${p.zoneX * 100}%`;
    zone.style.width = `${p.zone * 100}%`;
    const garnish = ['🌿', '🍓', '✨'];
    el.querySelector('.plating-steps').innerHTML = garnish.map((gm, i) => `<span class="${i < p.marks.length ? `done ${p.marks[i]}` : i === p.round ? 'now' : ''}">${gm}</span>`).join('');
  }

  platingPress() {
    const p = this.plating;
    const g = this.game;
    if (!p || p.wait > 0 || p.round >= 3) return;
    const center = p.zoneX + p.zone / 2;
    const d = Math.abs(p.x - center);
    let res = 'rate';
    if (d < p.zone * 0.17) res = 'parfait';
    else if (d < p.zone / 2) res = 'bien';
    p.points += { parfait: 2, bien: 1, rate: 0 }[res];
    p.marks.push(res);
    g.audio.play(res === 'rate' ? 'ui' : res === 'parfait' ? 'fav' : 'pick');
    this.platingEl.querySelector('.plating-info').textContent = { parfait: '✨ Parfait !', bien: '👍 Bien placé', rate: '😅 Un peu à côté…' }[res];
    p.round++;
    p.wait = 0.45;
    p.speed *= 1.3;
    p.zone = Math.max(0.16, p.zone * 0.82);
    p.zoneX = rand(0.05, 0.95 - p.zone);
    this.renderPlating();
    if (p.round >= 3) {
      setTimeout(() => {
        const { dishId, done, points } = p;
        this.plating = null;
        this.platingEl.classList.add('hidden');
        this.platingEl.querySelector('.plating-info').textContent = '';
        g.input.enabled = true;
        done(dishId, points);
      }, 700);
    }
  }

  // --- Dialogues ----------------------------------------------------------------------

  dialogueChoices(v, dialogue) {
    const g = this.game;
    const f = this.festivalId;
    const out = [];
    const id = v.def.id;
    if (id === 'rose' && f === 'oeufs' && this.hunt && !this.hunt.done) {
      const n = this.hunt.found.length;
      out.push({
        label: n ? `🥚 Chasse aux œufs : montrer mes ${n} œuf${n > 1 ? 's' : ''}` : '🥚 Chasse aux œufs : les règles ?',
        primary: n > 0,
        action: () => {
          if (!n) {
            dialogue.render(`Aujourd'hui, j'ai caché ${EGGS} œufs peints sur l'île : au village, dans la prairie, au verger, sur la colline, dans la forêt, à la plage et près de l'étang ! Cherche bien, ils brillent un peu au soleil. Reviens me les montrer avant ce soir !`);
            return;
          }
          const r = this.huntResults();
          const podium = r.all.slice(0, 3).map((x, i) => `${['🥇', '🥈', '🥉'][i]} ${x.name} (${x.n})`).join(' · ');
          dialogue.render(r.rank === 1 ? `${n} œufs ! Tu as l'œil, mon petit ! Tu gagnes la chasse ! ${podium}` : `${n} œufs, bravo ! Tu termines ${r.rank}e. ${podium}`);
        },
      });
    }
    out.push(...this.snow.dialogueChoices(v, dialogue));
    if (id === 'mimi' && this.contestOpen) {
      const has = this.dishes().length > 0;
      out.push({
        label: has ? '🏆 Concours de cuisine : présenter un plat' : '🏆 Concours de cuisine : les règles ?',
        primary: has,
        action: () => {
          if (!has) {
            dialogue.render('Aujourd\'hui, c\'est le concours de cuisine ! Prépare un plat à ta cuisinière, puis présente-le au jury avant 18 h : Élise, Pomme et moi. On note le goût, la présentation… et les saveurs d\'automne !');
            return;
          }
          this.pickDish(dialogue, (dishId) => {
            dialogue.close();
            // Mimi attend le résultat sur place.
            const held = !v.override;
            if (held) v.override = { x: v.pos.x, z: v.pos.z, rot: v.rotY };
            this.startPlating(dishId, (d, points) => {
              if (held) v.override = null;
              const r = this.contestResults(d, points);
              g.dialogue.start(v);
              const podium = r.all.slice(0, 3).map((x, i) => `${['🥇', '🥈', '🥉'][i]} ${x.name} (${x.score})`).join(' · ');
              g.dialogue.render(`${r.comments.join(' ')} — Note : ${r.total} points. ${r.rank === 1 ? 'Tu remportes le concours ! 🏆' : `Tu termines ${r.rank}e !`} ${podium}`);
            });
          });
        },
      });
    }
    return out;
  }

  // --- Interaction et mise à jour ---------------------------------------------------------

  /** Invites d'action (œufs, caisse de fusées) ; renvoie vrai si une invite est affichée. */
  interact(input) {
    const g = this.game;
    if (g.indoors || g.vehicles.riding) return false;
    const e = this.nearestEgg();
    if (e) {
      g.ui.setPrompt({ pos: new THREE.Vector3(e.x, e.y + 0.9, e.z), title: '🥚 Œuf peint', sub: 'Chasse aux œufs', actions: [{ key: 'E', label: 'Ramasser' }] });
      if (input.hit('KeyE')) this.pickEgg(e);
      return true;
    }
    if (this.nearCrate()) {
      const c = this.beach().crate;
      g.ui.setPrompt({ pos: new THREE.Vector3(c.x, c.y + 2, c.z), title: '🎆 Caisse de fusées', sub: g.world.sky.isNight ? 'Fête de l\'été' : 'Plus joli à la nuit tombée !', actions: [{ key: 'E', label: 'Lancer une fusée' }] });
      if (input.hit('KeyE')) this.launchOwn();
      return true;
    }
    return false;
  }

  update(dt) {
    const g = this.game;
    this.crateCd = Math.max(0, this.crateCd - dt);
    // Œufs : un petit éclat de temps en temps pour aider à les repérer.
    if (this.eggs.length && this.huntOpen) {
      this.hintT -= dt;
      if (this.hintT <= 0) {
        this.hintT = 2.2;
        const p = g.player.pos;
        for (const e of this.eggs) if (Math.hypot(e.x - p.x, e.z - p.z) < 28) g.particles.emit('sparkle', new THREE.Vector3(e.x, e.y + 0.45, e.z), { count: 1, spread: 0.2, size: 0.25 });
      }
    }
    for (const e of this.eggs) e.mesh.visible = this.huntOpen;
    // Feu d'artifice de la Fête de l'été.
    if (this.showOn && g.state === 'play') {
      this.gatherAudience();
      this.showT -= dt;
      if (this.showT <= 0) {
        const h = g.world.sky.hour;
        const finale = h >= 22.9;
        const b = this.beach();
        const n = finale ? 3 : Math.random() < 0.15 ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const k = rand(-12, 12);
          const from = b.launch.clone().add(new THREE.Vector3(b.side.x * k, 0, b.side.z * k));
          this.fireworks.launch(from, { camera: g.camera, height: rand(17, 26) });
        }
        this.showT = finale ? rand(0.35, 0.7) : rand(0.8, 2);
      }
    } else if (this.gathered.size && !this.showOn) this.releaseAudience();
    this.fireworks.update(dt, g.camera);
    this.snow.update(dt);
  }

  // --- Sauvegarde ------------------------------------------------------------------------

  serialize() {
    return { hunt: this.hunt, cook: this.cook, summer: this.summer, snow: this.snow.serialize() };
  }

  restore(d) {
    if (!d) return;
    this.hunt = d.hunt || null;
    this.cook = d.cook || null;
    this.summer = d.summer || null;
    this.snow.restore(d.snow);
  }
}
