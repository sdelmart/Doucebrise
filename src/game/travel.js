import * as THREE from 'three';
import { ZONES } from '../world/layout.js';
import { escapeHtml } from '../ui/ui.js';

// Archipel : voyages rapides entre les villages (panneaux « Voyages » et bateau de Nérée),
// bain à la source chaude et longue-vue du belvédère.

const DEST_ZONE = { main: 'village', pins: 'bourg', corail: 'port' };
const HOW_TO = {
  pins: 'Traverse le Pont des Brumes, au nord-ouest du village, pour découvrir Bourg-Sapin.',
  corail: 'Traverse le Pont du Soleil, à l\'est de la prairie, pour découvrir Port-Corail.',
};
const RELAX_HOURS = 4;

export class Archipelago {
  constructor(game) {
    this.game = game;
    this.bathedDay = 0;
    this.relaxUntil = 0;
    this.gazing = false;
    this.el = document.createElement('div');
    this.el.id = 'travel';
    this.el.className = 'modal hidden';
    document.body.appendChild(this.el);
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Escape') this.close();
    });
    this.isOpen = false;
  }

  get islands() {
    return this.game.world.islands;
  }

  get points() {
    return this.islands.travelPoints;
  }

  discovered(id) {
    return id === 'main' || this.game.progress.zones.has(DEST_ZONE[id]);
  }

  /** Bonus de détente de la source chaude (XP ×1,2). */
  get relaxed() {
    return this.now() < this.relaxUntil;
  }

  now() {
    const s = this.game.world.sky;
    return s.day * 24 + s.hour;
  }

  // --- Voyages ---------------------------------------------------------------------------

  nearestSign(max = 1.9) {
    const p = this.game.player.pos;
    return this.points.find((t) => Math.hypot(t.x - p.x, t.z - p.z) < max) || null;
  }

  open(from) {
    const g = this.game;
    this.isOpen = true;
    g.input.enabled = false;
    const rows = this.points.map((t) => {
      const here = t.id === from.id;
      const known = this.discovered(t.id);
      const zone = ZONES.find((z) => z.id === DEST_ZONE[t.id]);
      const status = here ? 'Tu es ici' : known ? `${zone?.name || t.name}` : HOW_TO[t.id];
      return `<button class="travel-row${here ? ' here' : ''}" data-go="${t.id}" ${here || !known ? 'disabled' : ''}>
        <span class="tr-emoji">${known ? t.emoji : '❔'}</span>
        <span class="tr-text"><b>${escapeHtml(known ? t.name : '???')}</b><small>${escapeHtml(status)}</small></span>
        <span class="tr-go">${here ? '📍' : known ? '⛵' : '🔒'}</span></button>`;
    }).join('');
    this.el.innerHTML = `<div class="modal-card small travel-card"><button class="close" data-tclose>✕</button>
      <h2>🧭 Voyages</h2><p class="note">Le bateau de Nérée relie les villages de l'archipel. C'est gratuit… et ça sent bon l'iode !</p>
      <div class="travel-list">${rows}</div></div>`;
    this.el.classList.remove('hidden');
    this.el.querySelector('[data-tclose]').onclick = () => this.close();
    this.el.querySelectorAll('[data-go]').forEach((b) => {
      b.onclick = () => this.go(this.points.find((t) => t.id === b.dataset.go));
    });
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.add('hidden');
    this.game.input.enabled = true;
  }

  go(dest) {
    const g = this.game;
    this.close();
    if (g.vehicles.riding) g.vehicles.dismount(true);
    g.audio.play('mail');
    g.fade(() => {
      const rot = Math.atan2(-dest.x + (g.world.village.centers[dest.id]?.x ?? 0), -dest.z + (g.world.village.centers[dest.id]?.z ?? 0));
      g.player.teleport(dest.x, dest.z, rot);
      for (const a of g.animals.followers()) a.teleport(dest.x + (Math.random() - 0.5) * 2, dest.z + (Math.random() - 0.5) * 2);
      g.cam.yaw = rot + Math.PI;
      g.cam.snap = true;
      g.world.sky.hour = Math.min(g.world.sky.hour + 0.5, 23.9);
      g.emit('travel', { to: dest.id });
      setTimeout(() => g.ui.toast(`⛵ Bienvenue à ${dest.emoji} ${dest.name} !`, 3000), 500);
      g.requestSave();
    }, 700);
  }

  // --- Source chaude -----------------------------------------------------------------------

  inSpring() {
    const s = this.islands.spring;
    if (!s) return false;
    const p = this.game.player.pos;
    return Math.hypot(p.x - s.x, p.z - s.z) < s.r + 1.4;
  }

  bathe() {
    const g = this.game;
    const s = this.islands.spring;
    const p = g.player.pos;
    // Place le joueur dans l'eau, sur le bord le plus proche, tourné vers le centre.
    const a = Math.atan2(p.x - s.x, p.z - s.z);
    const r = Math.max(0.5, s.r - 1.2);
    const x = s.x + Math.sin(a) * r;
    const z = s.z + Math.cos(a) * r;
    g.sitOn({ x, y: s.y - 0.62, z, rot: a + Math.PI, seatY: 0.12, bath: true });
    g.particles.emit('smoke', new THREE.Vector3(x, s.y + 0.4, z), { count: 3, spread: 0.8, size: 1.2, life: 2.5 });
    const day = g.world.sky.day;
    g.emit('bathe', {});
    if (this.bathedDay !== day) {
      this.bathedDay = day;
      this.relaxUntil = this.now() + RELAX_HOURS;
      setTimeout(() => {
        if (!g.sitting?.bath) return;
        g.ui.toast(`♨️ Quelle détente… Bonus « Bien-être » : +20 % d'expérience pendant ${RELAX_HOURS} h !`, 5000);
        g.ui.refreshBuffs?.();
      }, 1800);
    } else {
      setTimeout(() => g.sitting?.bath && g.ui.toast('♨️ L\'eau est délicieusement chaude…', 2500), 1500);
    }
  }

  // --- Longue-vue ------------------------------------------------------------------------------

  nearTelescope() {
    const t = this.islands.telescope;
    if (!t) return false;
    const p = this.game.player.pos;
    return Math.hypot(p.x - t.x, p.z - t.z) < 2.2;
  }

  stargaze() {
    const g = this.game;
    const t = this.islands.telescope;
    const sky = g.world.sky;
    const night = sky.isNight;
    this.gazing = true;
    g.player.face(t.x, t.z);
    const eye = new THREE.Vector3(t.x, t.y + 2.2, t.z);
    // De nuit : le ciel étoilé ; de jour : le phare de Doucebrise, au loin.
    const look = night ? eye.clone().add(new THREE.Vector3(0.6, 1.2, 0.9).multiplyScalar(40)) : new THREE.Vector3(68, 18, -58);
    g.fade(() => {
      g.cam.setCinematic(eye, look);
      g.cam.snap = true;
      g.ui.showHUD(false);
    }, 400);
    const lines = night
      ? ['🔭 La constellation du Chat scintille au-dessus du pic…', '🔭 On distingue les anneaux d\'une planète lointaine !', '🔭 La Voie lactée traverse tout le ciel…', '🔭 Une étoile clignote, comme un clin d\'œil.']
      : ['🔭 Au loin, le phare de Doucebrise veille sur l\'archipel.', '🔭 On aperçoit les toits du village et le moulin qui tourne.', '🔭 Des mouettes planent au-dessus de l\'île Corail.'];
    setTimeout(() => g.ui.toast(lines[Math.floor(Math.random() * lines.length)], 4200), 900);
    if (night) {
      g.emit('stargaze', {});
      // Une étoile filante passe presque toujours devant la lunette.
      setTimeout(() => g.world.sky.spawnShootingStar?.(eye, look), 2200);
    }
    setTimeout(() => {
      g.fade(() => {
        this.gazing = false;
        g.cam.setMode('follow');
        g.cam.snap = true;
        g.ui.showHUD(true);
      }, 400);
    }, 6500);
  }

  // --- Sauvegarde ------------------------------------------------------------------------------

  serialize() {
    return { bd: this.bathedDay, ru: +this.relaxUntil.toFixed(2) };
  }

  restore(d) {
    if (!d) return;
    this.bathedDay = d.bd || 0;
    this.relaxUntil = d.ru || 0;
  }
}
