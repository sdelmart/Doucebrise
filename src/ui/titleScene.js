import * as THREE from 'three';
import { escapeHtml } from './ui.js';

// Écran titre « Douce brise » : l'archipel en cartes postales (plans lents, chacun à sa plus
// belle heure, avec sa légende), et une brise qui traverse l'écran — pétales, feuilles ou
// flocons selon la saison — que la souris (ou le doigt) fait souffler.

// cam / look : [x, hauteur au-dessus du sol, z]. Chaque plan tourne doucement autour de son
// point de vue et s'en approche un peu.
const SHOTS = [
  { id: 'cafe', emoji: '☕', label: 'Le Café des Chats', place: 'Place du village', hour: 10.4, cam: [-1.1, 5.5, -11.6], look: [-10.1, 4, -21.8] },
  { id: 'phare', emoji: '🗼', label: 'Le vieux phare', place: 'Cap du Phare', hour: 18.25, cam: [44, 6, -34], look: [68, 7, -58] },
  { id: 'place', emoji: '🏮', label: 'La place, le soir', place: 'Village de Doucebrise', hour: 20.6, cam: [16, 9, 20], look: [0, 1.5, 0] },
  { id: 'moulin', emoji: '🌾', label: 'La colline du moulin', place: 'Doucebrise', hour: 8.1, cam: [-30, 4, 66], look: [-40, 7, 50] },
  { id: 'bourg', emoji: '🏔️', label: 'Bourg-Sapin', place: 'Île des Pins', hour: 12, cam: [-104, 9, -96], look: [-128, 3, -116] },
  { id: 'lagon', emoji: '🐠', label: 'Le lagon', place: 'Port-Corail', hour: 16.5, cam: [190, 6, 78], look: [215, 0, 100] },
  { id: 'plage', emoji: '🌅', label: 'La plage Coquillage', place: 'Doucebrise', hour: 18.85, cam: [16, 6, 64], look: [16, 1, 100] },
];
const SHOT_TIME = 9.5;
const FADE = 0.75;

// Ce que la brise emporte, selon la saison.
const BREEZE = {
  printemps: { kind: 'petal', colors: ['#ffc4d6', '#ffd9e4', '#ffb0c8', '#fff0f5'] },
  ete: { kind: 'mix', colors: ['#ff6f91', '#ffd166', '#ff9fb5', '#ffffff'] },
  automne: { kind: 'leaf', colors: ['#e9873a', '#d4582a', '#f2b33d', '#b5652e'] },
  hiver: { kind: 'snow', colors: ['#ffffff', '#eef6ff', '#dcecff'] },
};

export class TitleScene {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.el = document.querySelector('#title');
    this.veil = document.createElement('div');
    this.veil.className = 'title-veil';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'title-breeze';
    this.postcard = document.createElement('div');
    this.postcard.className = 'title-postcard';
    this.el.prepend(this.veil, this.canvas);
    this.el.appendChild(this.postcard);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.wind = { x: 0, y: 0 };
    this.gust = 0;
    this.pointer = null;
    this.onMove = (e) => {
      const p = { x: e.clientX, y: e.clientY, t: performance.now() };
      if (this.pointer) {
        const dt = Math.max(16, p.t - this.pointer.t) / 1000;
        const vx = (p.x - this.pointer.x) / dt;
        const vy = (p.y - this.pointer.y) / dt;
        this.pointer.vx = vx;
        this.pointer.vy = vy;
        this.gust = Math.min(1, this.gust + Math.hypot(vx, vy) / 6000);
      }
      this.pointer = { ...p, vx: this.pointer?.vx || 0, vy: this.pointer?.vy || 0 };
    };
    this.onResize = () => this.resize();
  }

  get reduced() {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  start() {
    const g = this.game;
    if (this.active) return;
    this.active = true;
    const p = g.player;
    this.saved = { x: p.pos.x, z: p.pos.z, rot: p.rotY };
    // Le personnage reste chez lui : on ne fait que se promener avec la caméra.
    g.character.root.visible = false;
    this.shots = this.buildShots();
    // Un point de départ au hasard (la maison d'abord quand une partie existe).
    this.order = this.shots.map((_, i) => i);
    const start = this.shots[0].id === 'home' ? 0 : Math.floor(Math.random() * this.shots.length);
    this.index = start - 1;
    this.next();
    const season = g.world.weather?.season?.id || 'printemps';
    this.breeze = BREEZE[season] || BREEZE.printemps;
    this.resize();
    this.particles = [];
    const n = this.reduced ? 0 : window.innerWidth < 720 ? 22 : 40;
    for (let i = 0; i < n; i++) this.particles.push(this.spawn(true));
    window.addEventListener('pointermove', this.onMove, { passive: true });
    window.addEventListener('resize', this.onResize);
  }

  stop() {
    const g = this.game;
    if (!this.active) return;
    this.active = false;
    g.titleHour = undefined;
    g.character.root.visible = true;
    g.player.teleport(this.saved.x, this.saved.z, this.saved.rot);
    for (const a of this.posed || []) a.posing = null;
    this.posed = [];
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('resize', this.onResize);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.postcard.classList.remove('on');
    this.veil.classList.remove('on');
  }

  /** Plans de la visite ; « Chez toi » en premier quand une partie existe. */
  buildShots() {
    const g = this.game;
    const list = [...SHOTS];
    if (g.save) {
      const home = g.world.village.houses[0];
      const y = g.world.village.yard;
      const name = g.character.appearance.name || 'toi';
      list.unshift({
        id: 'home', emoji: '🏡', label: `Chez ${name}`, place: 'Ta maison à Doucebrise', hour: 9.6,
        cam: [y.x + y.dir.x * 8.5 + y.dir.z * 2.5, 4.4, y.z + y.dir.z * 8.5 - y.dir.x * 2.5], look: [y.x * 0.7 + home.x * 0.3, 1.4, y.z * 0.7 + home.z * 0.3],
      });
    }
    return list;
  }

  next() {
    const g = this.game;
    this.index = (this.index + 1) % this.shots.length;
    const s = this.shots[this.index];
    this.shot = s;
    this.t = 0;
    this.fading = false;
    const gy = (x, z) => Math.max(0, g.world.groundAt(x, z));
    const look = new THREE.Vector3(s.look[0], gy(s.look[0], s.look[2]) + s.look[1], s.look[2]);
    const cam = new THREE.Vector3(s.cam[0], gy(s.cam[0], s.cam[2]) + s.cam[1], s.cam[2]);
    this.look = look;
    this.base = { dx: cam.x - look.x, dz: cam.z - look.z, y: cam.y };
    // Le personnage (invisible) suit la caméra : herbe, habitants et animaux s'affichent
    // autour de lui.
    g.player.teleport(look.x, look.z, 0);
    g.titleHour = s.hour;
    g.world.sky.hour = s.hour;
    for (const a of this.posed || []) a.posing = null;
    this.posed = [];
    if (s.id === 'home') this.poseCompanions(cam);
    g.cam.setCinematic(cam, look);
    g.cam.snap = true;
    this.postcard.innerHTML = `<span class="tp-stamp">${s.emoji}</span><div><b>${escapeHtml(s.label)}</b><small>${escapeHtml(s.place)}</small></div><span class="tp-mark" aria-hidden="true"></span>`;
    this.postcard.classList.remove('on');
    void this.postcard.offsetWidth;
    this.postcard.classList.add('on');
    this.veil.classList.remove('on');
  }

  /** Compagnons dans le jardin, tournés vers la caméra, pour la carte postale « Chez toi ». */
  poseCompanions(cam) {
    const g = this.game;
    const list = g.animals.companions().slice(0, 4);
    // Au milieu de l'image, sur la pelouse : aux deux tiers entre la caméra et la maison.
    const dx = this.look.x - cam.x;
    const dz = this.look.z - cam.z;
    const len = Math.hypot(dx, dz) || 1;
    const sx = -dz / len;
    const sz = dx / len;
    list.forEach((a, i) => {
      const off = (i - (list.length - 1) / 2) * 1.2 + 0.9;
      const x = cam.x + dx * 0.6 + sx * off;
      const z = cam.z + dz * 0.6 + sz * off;
      a.teleport(x, z);
      a.rotY = Math.atan2(cam.x - x, cam.z - z);
      a.posing = { x: cam.x, z: cam.z };
      this.posed.push(a);
    });
  }

  update(dt) {
    if (!this.active) return;
    const g = this.game;
    this.t += dt;
    // Plan : lente rotation autour du sujet, en s'approchant un peu.
    const k = Math.min(1, this.t / SHOT_TIME);
    const move = this.reduced ? 0 : k - 0.5;
    const ang = move * 0.22;
    const push = 1 - move * 0.12;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const { dx, dz, y } = this.base;
    // Écran en hauteur (téléphone) : on recule, les plans sont cadrés pour un écran large.
    const far = window.innerWidth < window.innerHeight ? 1.75 : 1;
    if (g.cam.cine) {
      g.cam.cine.pos.set(this.look.x + (dx * c - dz * s) * push * far, y + (far - 1) * 4 + (this.reduced ? 0 : move * 0.6), this.look.z + (dx * s + dz * c) * push * far);
      g.cam.cine.look.copy(this.look);
    }
    if (!this.fading && this.t > SHOT_TIME - FADE) {
      this.fading = true;
      this.veil.classList.add('on');
      this.postcard.classList.remove('on');
    }
    if (this.t >= SHOT_TIME) this.next();
    this.gust = Math.max(0, this.gust - dt * 0.6);
    this.flutterLogo();
    this.drawBreeze(dt);
  }

  // --- Logo dans le vent ------------------------------------------------------------

  flutterLogo() {
    const letters = this.el.querySelectorAll('.brise .lt');
    if (!letters.length || this.reduced) return;
    const t = performance.now() / 1000;
    const g = 0.25 + this.gust * 1.4;
    letters.forEach((l, i) => {
      const r = Math.sin(t * 2.1 - i * 0.55) * 4 * g;
      const yy = Math.sin(t * 2.1 - i * 0.55 + 1.2) * 5 * g;
      l.style.transform = `translateY(${yy.toFixed(2)}px) rotate(${r.toFixed(2)}deg)`;
    });
  }

  // --- La brise -------------------------------------------------------------------

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  spawn(anywhere = false) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const b = this.breeze || BREEZE.printemps;
    const kind = b.kind === 'mix' ? (Math.random() < 0.25 ? 'melon' : 'petal') : b.kind;
    const size = kind === 'snow' ? 2 + Math.random() * 3.5 : kind === 'melon' ? 9 + Math.random() * 4 : 6 + Math.random() * 6;
    return {
      x: anywhere ? Math.random() * W : -20 - Math.random() * 80,
      y: anywhere ? Math.random() * H : Math.random() * H * 0.9,
      vx: 30 + Math.random() * 40,
      vy: 8 + Math.random() * 18,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 2.4,
      flip: Math.random() * Math.PI * 2,
      flipSpeed: 1.5 + Math.random() * 2.5,
      size,
      kind,
      color: b.colors[Math.floor(Math.random() * b.colors.length)],
      sway: Math.random() * Math.PI * 2,
    };
  }

  drawBreeze(dt) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (!this.particles.length) return;
    const t = performance.now() / 1000;
    // Rafales douces, plus fortes quand la souris souffle.
    const base = 1 + Math.sin(t * 0.35) * 0.35 + this.gust * 2.2;
    const pt = this.pointer;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      // Souffle de la souris : ce qui passe près du pointeur est poussé dans son sens.
      if (pt && Math.hypot(p.x - pt.x, p.y - pt.y) < 150) {
        p.vx += (pt.vx * 0.06 - p.vx * 0.02) * dt * 8;
        p.vy += (pt.vy * 0.06 - p.vy * 0.02) * dt * 8;
      }
      p.vx += ((35 + 25 * base) - p.vx) * dt * 0.4;
      p.vy += ((14 + Math.sin(t + p.sway) * 10) - p.vy) * dt * 0.4;
      p.x += p.vx * dt * base * 0.8;
      p.y += p.vy * dt + Math.sin(t * 1.3 + p.sway) * 0.4;
      p.rot += p.spin * dt;
      p.flip += p.flipSpeed * dt;
      if (p.x > W + 30 || p.y > H + 30 || p.y < -60 || p.x < -140) this.particles[i] = this.spawn();
      this.drawOne(ctx, p);
    }
    if (pt) {
      pt.vx *= 0.9;
      pt.vy *= 0.9;
    }
  }

  drawOne(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    const fl = Math.cos(p.flip);
    ctx.scale(1, 0.35 + Math.abs(fl) * 0.65);
    ctx.globalAlpha = 0.9;
    const s = p.size;
    switch (p.kind) {
      case 'snow':
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'leaf':
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.quadraticCurveTo(0, -s * 0.75, s, 0);
        ctx.quadraticCurveTo(0, s * 0.75, -s, 0);
        ctx.fill();
        ctx.strokeStyle = 'rgba(90,50,20,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.lineTo(s, 0);
        ctx.stroke();
        break;
      case 'melon':
        // Petite tranche de pastèque.
        ctx.fillStyle = '#3f9d4a';
        ctx.beginPath();
        ctx.arc(0, -s * 0.2, s, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#ff5a6e';
        ctx.beginPath();
        ctx.arc(0, -s * 0.2, s * 0.78, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#2b2420';
        for (const dx of [-0.35, 0, 0.35]) {
          ctx.beginPath();
          ctx.ellipse(dx * s, s * (dx ? 0.12 : 0.28), 1.2, 1.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      default: {
        // Pétale en cœur, comme ceux des cerisiers.
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.6);
        ctx.bezierCurveTo(-s, 0, -s * 0.7, -s * 0.9, -s * 0.12, -s * 0.55);
        ctx.lineTo(0, -s * 0.35);
        ctx.lineTo(s * 0.12, -s * 0.55);
        ctx.bezierCurveTo(s * 0.7, -s * 0.9, s, 0, 0, s * 0.6);
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
}
