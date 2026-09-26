import * as THREE from 'three';
import { Shape, G, vertexColorToon } from '../core/materials.js';
import { SLED_COURSE } from '../world/layout.js';

// Course de luge du Pic des Neiges : on dévale la piste jusqu'à Bourg-Sapin en passant
// dans les portes (chaque porte manquée coûte une seconde) et en attrapant les étoiles.
// Chrono et record ; les pièces sont pleines pour les 3 premières descentes du jour.

const GATES = 7;
const STARS = 12;
const GATE_PENALTY = 1;
const PAID_RUNS = 3;

function sledMesh() {
  const s = new Shape();
  for (const x of [-0.28, 0.28]) {
    s.add(G.box(0.05, 0.05, 1.3), '#c0584a', { pos: [x, 0.05, 0] });
    s.add(G.torus(0.12, 0.025, 5, 10, Math.PI), '#c0584a', { pos: [x, 0.17, 0.65], rot: [0, Math.PI / 2, 0] });
    for (const z of [-0.4, 0.3]) s.add(G.box(0.04, 0.16, 0.04), '#8a5a3a', { pos: [x, 0.14, z] });
  }
  for (let i = 0; i < 6; i++) s.add(G.box(0.7, 0.04, 0.16), i % 2 ? '#e8c9a0' : '#d9a86c', { pos: [0, 0.23, -0.5 + i * 0.19] });
  s.add(G.torus(0.3, 0.02, 4, 12, Math.PI), '#e5484d', { pos: [0, 0.3, 0.62], rot: [Math.PI / 2, 0, 0] });
  const m = new THREE.Mesh(s.build(), vertexColorToon());
  m.castShadow = true;
  return m;
}

function gateMesh() {
  const s = new Shape();
  for (const x of [-2.1, 2.1]) {
    s.add(G.cyl(0.07, 0.07, 2.2, 6), '#fffaf2', { pos: [x, 1.1, 0] });
    s.add(G.box(0.02, 0.45, 0.6), x < 0 ? '#e5484d' : '#3f8ee8', { pos: [x, 1.9, 0.3] });
  }
  s.add(G.box(4.3, 0.12, 0.08), '#ffd84d', { pos: [0, 2.2, 0] });
  return s.build();
}

export class SledRace {
  constructor(game) {
    this.game = game;
    this.best = null;
    this.runs = 0;
    this.runsDay = -1;
    this.runsToday = 0;
    this.active = false;
    this.pts = SLED_COURSE.map(([x, z]) => new THREE.Vector2(x, z));
    this.lengths = [0];
    for (let i = 1; i < this.pts.length; i++) this.lengths.push(this.lengths[i - 1] + this.pts[i].distanceTo(this.pts[i - 1]));
    this.total = this.lengths.at(-1);
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.sled = sledMesh();
    this.sled.visible = false;
    this.group.add(this.sled);
    this.buildCourse();
    this.hud = document.createElement('div');
    this.hud.id = 'sled-hud';
    this.hud.className = 'sled-hud hidden';
    document.body.appendChild(this.hud);
    window.addEventListener('keydown', (e) => {
      if (this.active && e.code === 'Escape') this.stop('Course abandonnée.');
    });
  }

  /** Point et direction à une distance donnée le long de la piste. */
  at(d) {
    let i = 1;
    while (i < this.lengths.length - 1 && this.lengths[i] < d) i++;
    const a = this.pts[i - 1];
    const b = this.pts[i];
    const t = Math.min(1, Math.max(0, (d - this.lengths[i - 1]) / (this.lengths[i] - this.lengths[i - 1])));
    const dir = b.clone().sub(a).normalize();
    return { x: a.x + (b.x - a.x) * t, z: a.y + (b.y - a.y) * t, dir };
  }

  /** Distance le long de la piste du point le plus proche, et écart latéral. */
  project(x, z) {
    let best = { d: 0, off: Infinity };
    for (let i = 1; i < this.pts.length; i++) {
      const a = this.pts[i - 1];
      const b = this.pts[i];
      const ab = b.clone().sub(a);
      const t = Math.min(1, Math.max(0, ((x - a.x) * ab.x + (z - a.y) * ab.y) / ab.lengthSq()));
      const px = a.x + ab.x * t;
      const pz = a.y + ab.y * t;
      const off = Math.hypot(x - px, z - pz);
      if (off < best.off) best = { d: this.lengths[i - 1] + ab.length() * t, off };
    }
    return best;
  }

  buildCourse() {
    const w = this.game.world;
    const geo = gateMesh();
    const mat = vertexColorToon();
    this.gates = [];
    for (let k = 0; k < GATES; k++) {
      const d = (this.total * (k + 1)) / (GATES + 1);
      const p = this.at(d);
      const side = (k % 2 ? 1 : -1) * 1.2;
      const x = p.x - p.dir.y * side;
      const z = p.z + p.dir.x * side;
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, w.heightAt(x, z), z);
      m.rotation.y = Math.atan2(p.dir.x, p.dir.y);
      m.castShadow = true;
      this.group.add(m);
      this.gates.push({ x, z, d, mesh: m });
    }
    // Panneau de départ.
    const s = new Shape();
    s.add(G.cyl(0.1, 0.12, 2.6, 6), '#6b4a3a', { pos: [0, 1.3, 0] });
    s.add(G.box(1.5, 0.7, 0.1), '#fff6e8', { pos: [0, 2.3, 0] });
    s.add(G.box(1.6, 0.08, 0.12), '#c0584a', { pos: [0, 2.68, 0] });
    const start = this.at(0);
    const sx = start.x - start.dir.y * 2.6;
    const sz = start.z + start.dir.x * 2.6;
    const sign = new THREE.Mesh(s.build(), mat);
    sign.position.set(sx, w.heightAt(sx, sz), sz);
    sign.rotation.y = Math.atan2(-start.dir.x, -start.dir.y);
    this.group.add(sign);
    w.colliders.addCircle(sx, sz, 0.2);
    this.startSign = { x: sx, z: sz };
    // Étoiles à attraper.
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.14 : 0.32;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const sg = new THREE.ExtrudeGeometry(star, { depth: 0.08, bevelEnabled: false });
    sg.center();
    const smat = new THREE.MeshBasicMaterial({ color: '#ffd84d' });
    this.stars = [];
    for (let k = 0; k < STARS; k++) {
      const d = (this.total * (k + 0.5)) / STARS;
      const p = this.at(d);
      const side = Math.sin(k * 2.1) * 1.8;
      const x = p.x - p.dir.y * side;
      const z = p.z + p.dir.x * side;
      const m = new THREE.Mesh(sg, smat);
      m.position.set(x, w.heightAt(x, z) + 1.1, z);
      m.visible = false;
      this.group.add(m);
      this.stars.push({ x, z, mesh: m, got: false });
    }
  }

  nearStart() {
    const p = this.game.player.pos;
    return Math.hypot(p.x - this.startSign.x, p.z - this.startSign.z) < 2.4;
  }

  begin() {
    const g = this.game;
    if (g.vehicles.riding) g.vehicles.dismount(true);
    g.standUp();
    g.tips.show('luge');
    g.fade(() => {
      const s = this.at(0.5);
      this.heading = Math.atan2(s.dir.x, s.dir.y);
      this.pos = new THREE.Vector2(s.x, s.z);
      this.speed = 0;
      this.t = 0;
      this.countdown = 3.2;
      this.gatesOk = new Set();
      this.gotStars = 0;
      this.stuckT = 0;
      this.maxD = 0;
      for (const st of this.stars) {
        st.got = false;
        st.mesh.visible = true;
      }
      this.active = true;
      this.sled.visible = true;
      g.player.teleport(s.x, s.z, this.heading);
      g.player.seated = true;
      g.player.frozen = true;
      g.character.setSit(true, 0.3);
      g.cam.yaw = this.heading + Math.PI;
      g.cam.pitch = 0.3;
      g.cam.dist = 7;
      g.cam.snap = true;
      clearTimeout(this.hideT);
      this.hud.classList.remove('hidden');
      g.audio.play('bell');
    }, 400);
  }

  update(dt) {
    if (!this.active) return;
    const g = this.game;
    const w = g.world;
    const p = g.player;
    if (this.countdown > 0) {
      const before = Math.ceil(this.countdown);
      this.countdown -= dt;
      const now = Math.ceil(this.countdown);
      if (now !== before && now > 0) g.audio.play('ui');
      if (this.countdown <= 0) g.audio.play('bite');
      this.renderHud(this.countdown > 0 ? `${Math.max(1, now)}…` : 'Partez !');
      this.place(dt);
      return;
    }
    this.t += dt;
    // Pente : on accélère en descente, la neige freine un peu.
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    const h0 = w.heightAt(this.pos.x, this.pos.y);
    const h1 = w.heightAt(this.pos.x + fx * 1.5, this.pos.y + fz * 1.5);
    const slope = (h0 - h1) / 1.5;
    const mv = g.input.moveVector();
    const brake = mv.y < -0.3 ? 1 : 0;
    this.speed += (slope * 26 - 1.2 - brake * 8) * dt;
    this.speed = Math.min(14, Math.max(4.5 - brake * 3.5, this.speed));
    this.heading -= mv.x * 2.1 * dt * (0.6 + this.speed / 20);
    let nx = this.pos.x + fx * this.speed * dt;
    let nz = this.pos.y + fz * this.speed * dt;
    const r = w.colliders.resolve(nx, nz, 0.45);
    if (Math.hypot(r.x - nx, r.z - nz) > 0.01) {
      this.speed *= 0.6;
      g.particles.emit('smoke', new THREE.Vector3(r.x, h0 + 0.4, r.z), { count: 2, spread: 0.6, size: 0.6, life: 0.8 });
    }
    nx = r.x;
    nz = r.z;
    this.pos.set(nx, nz);
    if (Math.abs(mv.x) > 0.3 && Math.random() < 0.5) g.particles.emit('smoke', new THREE.Vector3(nx, h0 + 0.1, nz), { count: 1, spread: 0.4, size: 0.5, life: 0.6 });
    this.place(dt);
    // Portes et étoiles.
    for (const gt of this.gates) {
      if (this.gatesOk.has(gt) || Math.hypot(gt.x - nx, gt.z - nz) > 2.3) continue;
      this.gatesOk.add(gt);
      g.audio.play('pick');
      g.particles.emit('sparkle', new THREE.Vector3(gt.x, w.heightAt(gt.x, gt.z) + 2.2, gt.z), { count: 4, spread: 1.5 });
    }
    for (const st of this.stars) {
      if (st.got || Math.hypot(st.x - nx, st.z - nz) > 1.6) continue;
      st.got = true;
      st.mesh.visible = false;
      this.gotStars++;
      g.audio.play('fav');
    }
    const proj = this.project(nx, nz);
    this.maxD = Math.max(this.maxD, proj.d);
    this.stuckT = this.speed < 1 ? this.stuckT + dt : 0;
    if (proj.off > 16) return this.stop('Hors piste ! Reste entre les fanions.');
    if (this.stuckT > 3) return this.stop('Bloqué·e ! Réessaie en évitant les obstacles.');
    if (proj.d > this.total - 2.5 && proj.off < 8) return this.finish();
    this.renderHud(this.t < 1 ? 'Partez !' : '');
  }

  place(dt) {
    const g = this.game;
    const w = g.world;
    const y = w.heightAt(this.pos.x, this.pos.y);
    g.player.pos.set(this.pos.x, y + 0.05, this.pos.y);
    g.player.rotY = this.heading;
    g.player.sync();
    this.sled.position.set(this.pos.x, y, this.pos.y);
    this.sled.rotation.y = this.heading;
    const ahead = w.heightAt(this.pos.x + Math.sin(this.heading), this.pos.y + Math.cos(this.heading));
    this.sled.rotation.x = Math.atan2(y - ahead, 1);
    // La caméra suit la luge.
    const target = this.heading + Math.PI;
    let d = target - g.cam.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.cam.yaw += d * Math.min(1, 4 * dt);
  }

  renderHud(big = '') {
    if (!this.hudRow) {
      this.hud.innerHTML = '<div class="sled-big"></div><div class="sled-row"></div><div class="sled-help">Gauche / droite pour tourner · arrière pour freiner · Échap pour abandonner</div>';
      [this.hudBig, this.hudRow] = this.hud.children;
    }
    if (big !== this.hudBigText) {
      this.hudBigText = big;
      // Nouvel élément : l'animation d'apparition rejoue à chaque message.
      const el = this.hudBig.cloneNode(false);
      el.textContent = big;
      el.hidden = !big;
      this.hudBig.replaceWith(el);
      this.hudBig = el;
    }
    const row = `🛷 ${(this.t || 0).toFixed(1)} s · 🚩 ${this.gatesOk?.size || 0}/${GATES} portes · ⭐ ${this.gotStars || 0}/${STARS}${this.best ? ` · record ${this.best.toFixed(1)} s` : ''}`;
    if (row !== this.hudRowText) {
      this.hudRowText = row;
      this.hudRow.textContent = row;
    }
  }

  end() {
    const g = this.game;
    this.active = false;
    this.sled.visible = false;
    for (const st of this.stars) st.mesh.visible = false;
    g.player.seated = false;
    g.player.frozen = false;
    g.character.setSit(false);
    this.hideT = setTimeout(() => this.hud.classList.add('hidden'), 3500);
  }

  stop(reason) {
    this.end();
    this.renderHud(reason);
    this.game.ui.toast(`🛷 ${reason}`, 3500);
  }

  finish() {
    const g = this.game;
    const missed = GATES - this.gatesOk.size;
    const time = this.t + missed * GATE_PENALTY;
    const record = this.best === null || time < this.best;
    if (record) this.best = time;
    this.runs++;
    const day = g.world.sky.day;
    if (this.runsDay !== day) {
      this.runsDay = day;
      this.runsToday = 0;
    }
    this.runsToday++;
    const paid = this.runsToday <= PAID_RUNS;
    this.end();
    const coins = (paid ? Math.max(30, Math.round(200 - time * 12)) : 0) + this.gotStars * 5;
    this.renderHud(`${record ? '🏆 Nouveau record ! ' : 'Arrivée ! '}${time.toFixed(1)} s`);
    g.particles.emit('sparkle', g.player.pos.clone().setY(g.player.pos.y + 1.5), { count: 10, spread: 2 });
    g.character.play('celebrate', 2);
    g.audio.play('adopt');
    g.emit('sled', { time, gates: this.gatesOk.size, stars: this.gotStars, record });
    const detail = missed ? `${this.t.toFixed(1)} s + ${missed} s (portes manquées)` : `${time.toFixed(1)} s, sans faute`;
    setTimeout(() => {
      g.grantReward({ coins, stars: record ? 3 : paid ? 1 : 0 }, null, `🛷 Luge : ${detail} ·`);
      if (!paid && this.runsToday === PAID_RUNS + 1) g.ui.toast('🛷 Hugo : « Les pièces, c\'est pour les 3 premières descentes du jour. Mais les étoiles comptent toujours ! »', 4500);
    }, 800);
    g.requestSave();
  }

  serialize() {
    return { best: this.best, runs: this.runs, day: this.runsDay, today: this.runsToday };
  }

  restore(d) {
    if (!d) return;
    this.best = d.best ?? null;
    this.runs = d.runs || 0;
    this.runsDay = d.day ?? -1;
    this.runsToday = d.today || 0;
  }
}
