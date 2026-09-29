import * as THREE from 'three';
import { Shape, G, vertexColorToon } from '../core/materials.js';
import { createRng, damp } from '../core/math.js';
import { snowmanGeometry, SNOWMAN_NOSES, SNOWMAN_HATS, SNOWMAN_SCARVES } from '../world/snowman.js';
import { escapeHtml } from '../ui/ui.js';

// Fête des neiges (premier jour de l'hiver), à la Prairie aux Fleurs, près du kiosque :
// - concours de bonshommes de neige : on roule trois boules (petit jeu d'adresse), on
//   choisit le nez, le chapeau et l'écharpe, puis Hugo, descendu du bourg, juge ;
// - bataille de boules de neige contre l'équipe de Noé (Léo et Sacha) : une minute pour en
//   placer le plus possible quand ils sortent de derrière leurs murets, en esquivant les leurs.

const OPEN = [9, 17];
const FIGHT_TIME = 60;
const TEAM = ['noe', 'leo', 'sacha'];
const GRAV = 9.8;
const rand = (a, b) => a + Math.random() * (b - a);

// Bonshommes des habitants, concurrents du concours.
const RIVALS = [
  { name: 'Mamie Rose', o: { nose: 'carotte', hat: 'paille', scarf: 'rouge' } },
  { name: 'Bruno', o: { nose: 'pomme-pin', hat: 'seau', scarf: 'bleue', hatColor: '#8a8f99' } },
  { name: 'Lila', o: { nose: 'cerise', hat: 'bonnet', scarf: 'rayee', hatColor: '#b69cf0' } },
  { name: 'Mimi', o: { nose: 'carotte', hat: 'oreilles', scarf: 'jaune' } },
  { name: 'Pomme', o: { nose: 'carotte', hat: 'bonnet', scarf: 'rouge', hatColor: '#7fd1b9' } },
];

// Goûts de Hugo : points par choix de décoration.
const TASTE = {
  nose: { 'pomme-pin': 12, carotte: 8, cerise: 6 },
  hat: { 'haut-de-forme': 10, oreilles: 9, bonnet: 8, seau: 6, paille: 6 },
  scarf: { rayee: 10, rouge: 8, bleue: 6, jaune: 6 },
};
// Accords qui plaisent en plus.
const MATCHES = [['haut-de-forme', 'rouge'], ['bonnet', 'rayee'], ['paille', 'jaune'], ['oreilles', 'jaune'], ['seau', 'bleue']];

function wallGeometry() {
  const s = new Shape();
  s.add(G.sphere(1, 18, 10), '#f4f8fd', { pos: [0, -0.05, 0], scale: [0.55, 0.85, 1.6] });
  s.add(G.sphere(0.3, 10, 8), '#ffffff', { pos: [0.1, 0.6, 0.7] });
  s.add(G.sphere(0.24, 10, 8), '#ffffff', { pos: [0.08, 0.62, -0.5] });
  return s.build();
}

function postGeometry() {
  const s = new Shape();
  for (const x of [-0.7, 0.7]) s.add(G.cyl(0.05, 0.06, 1.5, 8), '#8a5a3a', { pos: [x, 0.75, 0] });
  s.add(G.box(1.8, 0.62, 0.06), '#c98b58', { pos: [0, 1.25, -0.02] });
  return s.build();
}

/** Panneau peint (texte sur une planche). */
function signBoard(text) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 176;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff6ec';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 160, 26);
  ctx.fill();
  ctx.fillStyle = '#5b4636';
  ctx.font = '900 54px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 90);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.58), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
}

export class SnowFestival {
  constructor(game, festivals) {
    this.game = game;
    this.fest = festivals;
    this.group = new THREE.Group();
    this.group.visible = false;
    game.scene.add(this.group);
    this.mat = vertexColorToon();
    this.state = null; // { day, snowman, fight, hits } : résultats du jour (gardés le lendemain)
    this.fight = null;
    this.building = null;
    this.posted = new Set();
    this.colliders = [];
    this.balls = [];
    this.pool = [];
    this.ballGeo = new THREE.SphereGeometry(0.11, 10, 8);
    this.ballMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 });
    this.buildUI();
  }

  get active() {
    return this.fest.festivalId === 'neige';
  }

  get open() {
    const h = this.game.world.sky.hour;
    return this.active && h >= OPEN[0] && h < OPEN[1];
  }

  // --- Lieux ---------------------------------------------------------------------------

  /** Prairie aux Fleurs, près du kiosque : le concours à l'ouest, la bataille à l'est. */
  layout() {
    if (this.lay) return this.lay;
    const w = this.game.world;
    const spot = (x, z, r = 0.7) => {
      const res = w.colliders.resolve(x, z, r);
      return { x: res.x, z: res.z, y: w.groundAt(res.x, res.z) };
    };
    const judge = spot(33.2, 4.2);
    this.lay = {
      judge: { ...judge, rot: Math.PI / 2 },
      sign: spot(33.3, 6.3, 0.9),
      rivals: [[35.4, -1.4], [35, 1.5], [35, 8.5], [35.6, 11.1], [37.6, 12.7]].map(([x, z]) => spot(x, z, 0.8)),
      mine: spot(37.6, -3.3, 0.8),
      camp: spot(41, 5, 0.6),
      walls: [[50, 1], [50, 5], [50, 9]].map(([x, z]) => spot(x, z, 1.2)),
    };
    return this.lay;
  }

  facing(x, z) {
    // Les bonshommes regardent vers le chemin qui vient du village.
    return Math.atan2(22 - x, 5 - z);
  }

  // --- Décor du jour ---------------------------------------------------------------------

  onNewDay() {
    const g = this.game;
    const day = g.world.sky.day;
    if (this.fight) this.endFight(true);
    this.release();
    this.clearDecor();
    if (!this.active) return;
    if (this.state?.day !== day) this.state = { day, snowman: null, fight: null, hits: 0 };
    this.buildDecor(day);
  }

  buildDecor(day) {
    const g = this.game;
    const L = this.layout();
    const w = g.world;
    const add = (geo, x, y, z, rot) => {
      const m = new THREE.Mesh(geo, this.mat);
      m.position.set(x, y, z);
      m.rotation.y = rot;
      m.castShadow = true;
      this.group.add(m);
      return m;
    };
    const rng = createRng(day * 97 + 3);
    RIVALS.forEach((r, i) => {
      const p = L.rivals[i];
      const sizes = [0.9 + rng() * 0.2, 0.88 + rng() * 0.2, 0.9 + rng() * 0.2];
      add(snowmanGeometry({ ...r.o, sizes, lean: (rng() - 0.5) * 0.06 }), p.x, p.y - 0.04, p.z, this.facing(p.x, p.z));
      this.colliders.push(w.colliders.addCircle(p.x, p.z, 0.45));
    });
    for (const wl of L.walls) {
      add(wallGeometry(), wl.x, wl.y, wl.z, 0);
      this.colliders.push(w.colliders.addBox(wl.x, wl.z, 0.5, 1.5, 0));
    }
    // Panneau du concours.
    const s = L.sign;
    const rot = Math.PI / 2;
    add(postGeometry(), s.x, s.y, s.z, rot);
    const board = signBoard('☃️ Concours');
    board.position.set(s.x + 0.05, s.y + 1.25, s.z);
    board.rotation.y = rot;
    this.group.add(board);
    this.colliders.push(w.colliders.addCircle(s.x, s.z, 0.25));
    if (this.state?.snowman) this.placeMine(this.state.snowman.o, this.state.snowman.sizes);
    this.group.visible = true;
  }

  clearDecor() {
    for (const c of this.colliders) this.game.world.colliders.remove(c);
    this.colliders = [];
    for (const m of [...this.group.children]) {
      m.removeFromParent();
      m.geometry.dispose();
      if (m.material !== this.mat) {
        m.material.map?.dispose();
        m.material.dispose();
      }
    }
    this.mine = null;
    this.group.visible = false;
  }

  /** Le bonhomme de la joueuse, à sa place. */
  placeMine(o, sizes) {
    const L = this.layout();
    const p = L.mine;
    if (this.mine) {
      this.mine.geometry.dispose();
      this.mine.geometry = snowmanGeometry({ ...o, sizes });
      return;
    }
    this.mine = new THREE.Mesh(snowmanGeometry({ ...o, sizes }), this.mat);
    this.mine.position.set(p.x, p.y - 0.04, p.z);
    this.mine.rotation.y = this.facing(p.x, p.z);
    this.mine.castShadow = true;
    this.group.add(this.mine);
  }

  // --- Habitants à leur poste ------------------------------------------------------------

  /** Hugo au jury, l'équipe de Noé derrière ses murets (leurs quêtes restent visibles). */
  post() {
    const g = this.game;
    const L = this.layout();
    const put = (id, o) => {
      const v = g.villagers.get(id);
      if (!v || this.posted.has(id) || (v.override && !v.override.snow)) return;
      v.override = { ...o, festival: true, snow: true };
      this.posted.add(id);
    };
    put('hugo', { x: L.judge.x, z: L.judge.z, rot: L.judge.rot });
    TEAM.forEach((id, i) => {
      const wl = L.walls[i];
      put(id, { x: wl.x + 1.1, z: wl.z, rot: -Math.PI / 2, dy: 0 });
    });
  }

  release() {
    const g = this.game;
    for (const id of this.posted) {
      const v = g.villagers.get(id);
      if (!v?.override?.snow) continue;
      v.override = null;
      v.placeAt(v.scheduled(g.world.sky.hour));
    }
    this.posted.clear();
  }

  // --- Concours de bonshommes ----------------------------------------------------------

  buildUI() {
    const el = document.createElement('div');
    el.id = 'snowman';
    el.className = 'modal hidden snowman-modal';
    el.innerHTML = `<div class="modal-card snowman-card">
      <h2>☃️ Ton bonhomme de neige</h2>
      <div class="sm-roll">
        <div class="sm-step"></div>
        <p class="note">Appuie sur <b>E</b> (ou touche la carte) quand la boule a la bonne taille : dans la zone dorée !</p>
        <div class="plating-track"><div class="plating-zone"><div class="plating-perfect"></div></div><div class="plating-cursor"></div></div>
        <div class="plating-steps"></div>
        <div class="plating-info"></div>
      </div>
      <div class="sm-deco hidden"></div></div>`;
    document.body.appendChild(el);
    this.el = el;
    const press = (e) => {
      if (this.building?.stage !== 'roll') return;
      if (e.type === 'keydown') {
        if (!['KeyE', 'Space', 'Enter'].includes(e.code) || e.repeat) return;
        e.preventDefault();
      }
      this.rollPress();
    };
    window.addEventListener('keydown', press);
    el.querySelector('.sm-roll').addEventListener('pointerdown', press);
  }

  startBuild() {
    const g = this.game;
    const L = this.layout();
    const p = L.mine;
    g.dialogue.close();
    g.closePanels();
    this.building = { stage: 'roll', round: 0, points: 0, marks: [], x: 0, dir: 1, speed: 0.7, zone: 0.3, zoneX: rand(0.2, 0.5), wait: 0, sizes: [], o: { nose: 'carotte', hat: 'bonnet', scarf: 'rouge' } };
    g.input.enabled = false;
    // Caméra sur l'emplacement du bonhomme.
    const f = this.facing(p.x, p.z);
    g.cam.setCinematic(new THREE.Vector3(p.x + Math.sin(f) * 4.2 + Math.cos(f) * 1.2, p.y + 2.2, p.z + Math.cos(f) * 4.2 - Math.sin(f) * 1.2), new THREE.Vector3(p.x, p.y + 0.9, p.z));
    this.el.classList.remove('hidden');
    this.el.querySelector('.sm-roll').classList.remove('hidden');
    this.el.querySelector('.sm-deco').classList.add('hidden');
    this.previewBalls();
    this.renderRoll();
    let last = performance.now();
    const loop = (now) => {
      const b = this.building;
      if (!b || b.stage !== 'roll') return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (b.wait > 0) b.wait -= dt;
      else {
        b.x += b.dir * b.speed * dt;
        if (b.x > 1) {
          b.x = 1;
          b.dir = -1;
        } else if (b.x < 0) {
          b.x = 0;
          b.dir = 1;
        }
      }
      this.el.querySelector('.plating-cursor').style.left = `${b.x * 100}%`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  renderRoll() {
    const b = this.building;
    const el = this.el;
    const names = ['Grosse boule', 'Ventre', 'Tête'];
    el.querySelector('.sm-step').textContent = b.round < 3 ? `${b.round + 1}/3 · ${names[b.round]}` : 'Trois boules !';
    const zone = el.querySelector('.plating-zone');
    zone.style.left = `${b.zoneX * 100}%`;
    zone.style.width = `${b.zone * 100}%`;
    el.querySelector('.plating-steps').innerHTML = ['⚪', '⚪', '⚪'].map((e, i) => `<span class="${i < b.marks.length ? `done ${b.marks[i]}` : i === b.round ? 'now' : ''}">${e}</span>`).join('');
  }

  /** Aperçu pendant qu'on roule : les boules déjà faites, empilées. */
  previewBalls() {
    const b = this.building;
    if (b.sizes.length >= 3) {
      this.placeMine(b.o, b.sizes);
      return;
    }
    const L = this.layout();
    const p = L.mine;
    if (this.mine) {
      this.mine.removeFromParent();
      this.mine.geometry.dispose();
      this.mine = null;
    }
    if (!b.sizes.length) return;
    const s = new Shape();
    const rad = [0.46, 0.34, 0.25];
    let y = 0;
    b.sizes.forEach((k, i) => {
      const r = rad[i] * k;
      y += i === 0 ? r * 0.9 : rad[i - 1] * b.sizes[i - 1] * 0.75 + r * 0.8;
      s.add(G.sphere(r, 16, 12), '#f7fbff', { pos: [0, y, 0] });
    });
    this.mine = new THREE.Mesh(s.build(), this.mat);
    this.mine.position.set(p.x, p.y - 0.04, p.z);
    this.group.add(this.mine);
  }

  rollPress() {
    const b = this.building;
    const g = this.game;
    if (!b || b.wait > 0 || b.round >= 3) return;
    const center = b.zoneX + b.zone / 2;
    const d = Math.abs(b.x - center);
    let res = 'rate';
    if (d < b.zone * 0.17) res = 'parfait';
    else if (d < b.zone / 2) res = 'bien';
    b.points += { parfait: 2, bien: 1, rate: 0 }[res];
    b.marks.push(res);
    // Taille de la boule : parfaite, un peu trop petite ou trop grosse.
    const off = res === 'parfait' ? 0 : res === 'bien' ? 0.09 : 0.22;
    b.sizes.push(1 + (b.x < center ? -off : off));
    g.audio.play(res === 'rate' ? 'ui' : res === 'parfait' ? 'fav' : 'pick');
    this.el.querySelector('.plating-info').textContent = { parfait: '✨ Bien ronde !', bien: '👍 Pas mal', rate: '😅 Un peu cabossée…' }[res];
    b.round++;
    b.wait = 0.45;
    b.speed *= 1.25;
    b.zone = Math.max(0.16, b.zone * 0.84);
    b.zoneX = rand(0.05, 0.95 - b.zone);
    this.previewBalls();
    this.renderRoll();
    if (b.round >= 3) setTimeout(() => this.showDeco(), 650);
  }

  showDeco() {
    const b = this.building;
    if (!b) return;
    b.stage = 'deco';
    this.el.querySelector('.sm-roll').classList.add('hidden');
    const box = this.el.querySelector('.sm-deco');
    box.classList.remove('hidden');
    const row = (key, label, defs) => `<div class="sm-row"><div class="sm-label">${label}</div><div class="chips">${Object.entries(defs)
      .map(([id, d]) => `<button class="chip${b.o[key] === id ? ' active' : ''}" data-k="${key}" data-v="${id}">${d.emoji} ${escapeHtml(d.label)}</button>`)
      .join('')}</div></div>`;
    box.innerHTML = `<p class="note">Habille-le : Hugo juge la forme… et le style !</p>
      ${row('nose', 'Nez', SNOWMAN_NOSES)}${row('hat', 'Chapeau', SNOWMAN_HATS)}${row('scarf', 'Écharpe', SNOWMAN_SCARVES)}
      <div class="sm-actions"><button class="btn primary" data-present>🏆 Présenter à Hugo</button></div>`;
    box.querySelectorAll('[data-k]').forEach((btn) => {
      btn.onclick = () => {
        b.o[btn.dataset.k] = btn.dataset.v;
        box.querySelectorAll(`[data-k="${btn.dataset.k}"]`).forEach((x) => x.classList.toggle('active', x === btn));
        this.game.audio.play('ui');
        this.placeMine(b.o, b.sizes);
      };
    });
    box.querySelector('[data-present]').onclick = () => this.present();
    this.placeMine(b.o, b.sizes);
    setTimeout(() => box.querySelector('[data-present]')?.focus(), 50);
  }

  /** Note de Hugo et classement contre les bonshommes des habitants. */
  judge(o, points) {
    const day = this.state?.day ?? this.game.world.sky.day;
    let score = 40 + points * 8 + TASTE.nose[o.nose] + TASTE.hat[o.hat] + TASTE.scarf[o.scarf];
    const match = MATCHES.some(([h, s]) => h === o.hat && s === o.scarf);
    if (match) score += 5;
    score += Math.floor(Math.random() * 6);
    const comments = [];
    comments.push(points >= 6 ? 'Trois boules parfaitement rondes : c\'est de la sculpture !' : points >= 4 ? 'Belle silhouette, bien d\'aplomb.' : points >= 2 ? 'Un peu penché… mais il a du caractère.' : 'Il est… original. J\'aime l\'audace.');
    if (o.nose === 'pomme-pin') comments.push('Un nez en pomme de pin ! Voilà un bonhomme qui vient de la montagne.');
    if (o.hat === 'oreilles') comments.push('Des oreilles de chat ?! Mimi va être jalouse.');
    if (o.hat === 'haut-de-forme') comments.push('Un haut-de-forme, rien que ça. Très chic.');
    if (match) comments.push('Et le chapeau va si bien avec l\'écharpe !');
    const rng = createRng(day * 131 + 9);
    const rivals = RIVALS.map((r) => ({ name: r.name, score: Math.round(74 + rng() * 44) }));
    const me = this.game.character.appearance.name;
    const all = [...rivals, { name: me, score, me: true }].sort((a, b) => b.score - a.score || (a.me ? -1 : 1));
    return { score, comments, all, rank: all.findIndex((x) => x.me) + 1 };
  }

  present() {
    const g = this.game;
    const b = this.building;
    if (!b) return;
    this.building = null;
    this.el.classList.add('hidden');
    g.input.enabled = true;
    g.cam.setMode('follow');
    g.cam.yaw = g.player.rotY + Math.PI;
    const r = this.judge(b.o, b.points);
    const first = !this.state.snowman;
    this.state.snowman = { rank: r.rank, score: r.score, o: { ...b.o }, sizes: b.sizes };
    this.placeMine(b.o, b.sizes);
    g.emit('snowman', { rank: r.rank, score: r.score });
    const hugo = g.villagers.get('hugo');
    const podium = r.all.slice(0, 3).map((x, i) => `${['🥇', '🥈', '🥉'][i]} ${x.name} (${x.score})`).join(' · ');
    if (hugo) {
      g.dialogue.start(hugo);
      g.dialogue.render(`${r.comments.join(' ')} — ${r.score} points. ${r.rank === 1 ? 'Tu remportes le concours ! ☃️🏆' : `Tu termines ${r.rank}e !`} ${podium}`);
    }
    if (first) {
      const prizes = {
        1: { coins: 600, furniture: { 'bonhomme-neige': 1 }, stars: 8 },
        2: { coins: 250, items: { chocolat: 2 } },
        3: { coins: 120, items: { chocolat: 1 } },
      };
      setTimeout(() => g.grantReward(prizes[r.rank] || { coins: 50 }, null, `☃️ Concours de bonshommes — ${r.rank === 1 ? '1re' : `${r.rank}e`} place :`), 400);
    }
    g.requestSave();
  }

  // --- Bataille de boules de neige ---------------------------------------------------------

  startFight() {
    const g = this.game;
    const L = this.layout();
    g.dialogue.close();
    this.post();
    g.player.teleport(L.camp.x, L.camp.z, Math.PI / 2);
    g.cam.setMode('follow');
    g.cam.yaw = g.player.rotY + Math.PI;
    g.cam.snap = true;
    this.fight = {
      t: FIGHT_TIME,
      count: 3,
      my: 0,
      their: 0,
      cd: 0,
      opp: TEAM.map((id, i) => ({ id, v: g.villagers.get(id), wall: L.walls[i], up: false, timer: rand(0.3, 1.4), throwT: rand(0.8, 2), side: 0, dy: -0.62 })).filter((o) => o.v?.override),
    };
    this.hud.classList.remove('hidden');
    this.renderHud();
  }

  renderHud() {
    const f = this.fight;
    if (!f) return;
    const top = f.count > 0 ? `<div class="sled-big">${Math.ceil(f.count)}</div>` : `<div class="sled-row">❄️ ${Math.ceil(f.t)} s</div>`;
    const html = `${top}<div class="sled-row">Toi <b>${f.my}</b> — <b>${f.their}</b> Équipe de Noé</div><div class="sled-help">E : lancer une boule · bouge pour esquiver</div>`;
    if (html !== this.hudHtml) {
      this.hudHtml = html;
      this.hud.innerHTML = html;
    }
  }

  /** Pendant la bataille : E lance une boule (à la place des autres actions). */
  fightInput(input) {
    const f = this.fight;
    const g = this.game;
    g.ui.setPrompt(null);
    if (!f || f.count > 0) return;
    if (!input.hit('KeyE') || f.cd > 0) return;
    f.cd = 0.5;
    const p = g.player.pos;
    // Visée aidée : l'adversaire le plus proche de la direction de la caméra.
    const cam = new THREE.Vector3();
    g.camera.getWorldDirection(cam);
    cam.y = 0;
    cam.normalize();
    let best = null;
    let bestA = 0.7;
    for (const o of f.opp) {
      const dx = o.v.pos.x - p.x;
      const dz = o.v.pos.z - p.z;
      const len = Math.hypot(dx, dz) || 1;
      const a = Math.acos(Math.max(-1, Math.min(1, (dx * cam.x + dz * cam.z) / len)));
      if (a < bestA && o.dy > -0.3) {
        bestA = a;
        best = o;
      }
    }
    const to = best ? new THREE.Vector3(best.v.pos.x + rand(-0.2, 0.2), best.v.pos.y + 0.85 - best.dy, best.v.pos.z + rand(-0.2, 0.2)) : new THREE.Vector3(p.x + cam.x * 12, p.y + 1, p.z + cam.z * 12);
    g.player.rotY = Math.atan2(to.x - p.x, to.z - p.z);
    g.player.character.play('throw', 0.5);
    const from = new THREE.Vector3(p.x + Math.sin(g.player.rotY) * 0.3, p.y + 1.3, p.z + Math.cos(g.player.rotY) * 0.3);
    this.throwBall(from, to, 'me');
    g.audio.play('snowthrow');
  }

  throwBall(from, to, owner) {
    const d = Math.hypot(to.x - from.x, to.z - from.z);
    const T = Math.min(1.3, Math.max(0.5, d / 13));
    const vel = new THREE.Vector3((to.x - from.x) / T, (to.y - from.y + 0.5 * GRAV * T * T) / T, (to.z - from.z) / T);
    const mesh = this.pool.pop() || new THREE.Mesh(this.ballGeo, this.ballMat);
    mesh.position.copy(from);
    this.game.scene.add(mesh);
    this.balls.push({ mesh, pos: from.clone(), vel, owner, life: 3 });
  }

  splat(b, hit) {
    const g = this.game;
    b.mesh.removeFromParent();
    this.pool.push(b.mesh);
    this.balls = this.balls.filter((x) => x !== b);
    g.particles.emit('smoke', b.pos, { count: 5, spread: 0.25, rise: 0.35, life: 0.55, size: 0.3, delay: 0, grow: 1.2, alpha: 0.9 });
    const f = this.fight;
    if (!f || !hit) return;
    if (hit === 'me') {
      f.their++;
      g.audio.play('snowhit');
      this.splatScreen();
      return;
    }
    f.my++;
    this.state.hits = (this.state.hits || 0) + 1;
    if (g.player.pos.distanceTo(b.pos) < 30) g.audio.play('snowhit');
    if (Math.random() < 0.35) hit.v.say(['Aïe !', 'Bien visé !', 'Hé ! Pas juste !', 'Brrr, c\'est froid !', 'Tu vas voir !'][Math.floor(Math.random() * 5)], 1400);
    // Touché : il se cache un moment.
    hit.up = false;
    hit.timer = rand(0.8, 1.4);
    g.emit('snowball', { hits: f.my });
  }

  splatScreen() {
    const el = this.splatEl;
    el.classList.remove('on');
    void el.offsetWidth;
    el.style.setProperty('--sx', `${rand(20, 80)}%`);
    el.style.setProperty('--sy', `${rand(25, 70)}%`);
    el.classList.add('on');
  }

  endFight(silent = false) {
    const g = this.game;
    const f = this.fight;
    if (!f) return;
    this.fight = null;
    this.hud.classList.add('hidden');
    this.hudHtml = '';
    for (const o of f.opp) {
      const ov = o.v.override;
      if (ov?.snow) {
        ov.dy = 0;
        ov.z = o.wall.z;
        ov.rot = -Math.PI / 2;
      }
    }
    if (silent) return;
    const win = f.my > f.their;
    const tie = f.my === f.their;
    const first = !this.state.fight;
    const best = this.state.fight;
    if (!best || f.my - f.their > best.my - best.their) this.state.fight = { win, tie, my: f.my, their: f.their };
    g.emit('snowfight', { win, my: f.my, their: f.their });
    const noe = g.villagers.get('noe');
    if (noe) {
      g.dialogue.start(noe);
      g.dialogue.render(win ? `${f.my} à ${f.their} ! Tu nous as battus à plate couture ! Léo, Sacha… on se retrouve l'an prochain pour la revanche !` : tie ? `${f.my} partout ! Égalité ! On est tous trempés, c'était génial !` : `${f.their} à ${f.my} pour nous ! Hé hé, l'équipe de Noé est invincible ! Tu veux ta revanche ?`);
    }
    if (first) {
      const prize = win ? { coins: 300, items: { chocolat: 2 }, stars: 4 } : tie ? { coins: 150, items: { chocolat: 1 } } : { coins: 80 };
      setTimeout(() => g.grantReward(prize, null, `❄️ Bataille de boules de neige — ${win ? 'victoire' : tie ? 'égalité' : 'défaite'} :`), 400);
    }
    g.requestSave();
  }

  // --- Dialogues -------------------------------------------------------------------------

  dialogueChoices(v, dialogue) {
    const out = [];
    if (!this.open || !this.state) return out;
    const id = v.def.id;
    if (id === 'hugo' && !this.state.snowman) {
      out.push({ label: '☃️ Concours de bonshommes : construire le mien', primary: true, action: () => this.startBuild() });
    }
    if (TEAM.includes(id) && !this.fight) {
      out.push({ label: this.state.fight ? '❄️ Bataille de boules de neige : la revanche !' : '❄️ Bataille de boules de neige : je joue !', primary: !this.state.fight, action: () => this.startFight() });
    }
    void dialogue;
    return out;
  }

  // --- Mise à jour -----------------------------------------------------------------------

  update(dt) {
    const g = this.game;
    if (!this.hud) this.buildHud();
    if (!this.active) {
      if (this.fight) this.endFight(true);
      if (this.posted.size) this.release();
      if (this.group.visible) this.clearDecor();
      return;
    }
    if (!this.group.visible && this.state?.day === g.world.sky.day) this.buildDecor(this.state.day);
    if (this.open) {
      if (this.posted.size < TEAM.length + 1) this.post();
      const L = this.layout();
      if (g.state === 'play' && Math.hypot(g.player.pos.x - L.camp.x, g.player.pos.z - L.camp.z) < 22) g.tips.show('neige');
    } else if (this.posted.size && !this.fight) this.release();
    const f = this.fight;
    if (f) {
      if (f.count > 0) f.count -= dt;
      else {
        f.t -= dt;
        f.cd -= dt;
      }
      const p = g.player.pos;
      for (const o of f.opp) {
        const ov = o.v.override;
        if (!ov) continue;
        if (f.count <= 0) {
          o.timer -= dt;
          if (o.timer <= 0) {
            o.up = !o.up;
            o.timer = o.up ? rand(1.3, 2.4) : rand(0.7, 1.5);
            if (o.up) o.side = rand(-0.9, 0.9);
          }
        }
        o.dy = damp(o.dy, o.up ? 0 : -0.62, 10, dt);
        ov.dy = o.dy;
        ov.x = o.wall.x + 1.1;
        ov.z = damp(ov.z, o.wall.z + o.side, 4, dt);
        ov.rot = Math.atan2(p.x - ov.x, p.z - ov.z);
        if (o.up && f.count <= 0) {
          o.throwT -= dt;
          if (o.throwT <= 0 && o.dy > -0.15) {
            o.throwT = rand(1.3, 2.6);
            o.v.character.play('throw', 0.6);
            const to = new THREE.Vector3(p.x + rand(-0.6, 0.6), p.y + 0.9, p.z + rand(-0.6, 0.6));
            this.throwBall(new THREE.Vector3(ov.x - 0.3, o.v.pos.y + 1.3, ov.z), to, o);
          }
        }
      }
      this.renderHud();
      if (f.t <= 0) this.endFight();
    }
    // Boules en vol.
    const walls = this.layout().walls;
    for (const b of [...this.balls]) {
      b.vel.y -= GRAV * dt;
      b.pos.addScaledVector(b.vel, dt);
      b.mesh.position.copy(b.pos);
      b.life -= dt;
      let hit = null;
      const fi = this.fight;
      if (fi && b.owner === 'me') {
        for (const o of fi.opp) {
          const vp = o.v.pos;
          if (o.dy > -0.3 && Math.hypot(b.pos.x - vp.x, b.pos.y - (vp.y + 0.8), b.pos.z - vp.z) < 0.55) hit = o;
        }
      } else if (fi && b.owner !== 'me') {
        const pp = g.player.pos;
        if (Math.hypot(b.pos.x - pp.x, b.pos.y - (pp.y + 0.85), b.pos.z - pp.z) < 0.6) hit = 'me';
      }
      const inWall = walls.some((wl) => ((b.pos.x - wl.x) / 0.55) ** 2 + ((b.pos.y - wl.y) / 0.85) ** 2 + ((b.pos.z - wl.z) / 1.6) ** 2 < 1);
      if (hit || inWall || b.life <= 0 || b.pos.y < g.world.groundAt(b.pos.x, b.pos.z) + 0.05) this.splat(b, hit);
    }
  }

  buildHud() {
    this.hud = document.createElement('div');
    this.hud.id = 'snow-hud';
    this.hud.className = 'sled-hud hidden';
    document.body.appendChild(this.hud);
    this.splatEl = document.createElement('div');
    this.splatEl.className = 'snow-splat';
    document.body.appendChild(this.splatEl);
  }

  serialize() {
    return this.state;
  }

  restore(d) {
    this.state = d || null;
  }
}
