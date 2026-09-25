import * as THREE from 'three';
import { ROOM } from '../house/house.js';
import { escapeHtml } from './ui.js';

// Guide : une balise lumineuse sur l'objectif, une flèche au bord de l'écran avec
// la distance, et une étoile sur la mini-carte. Dorée pour l'histoire, bleue pour
// les petits boulots.

const COLORS = { story: '#ffcf3a', job: '#5bb6ff' };

function starTexture(color) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 12 : 28;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(32 + Math.cos(a) * r, 34 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

class Beacon {
  constructor(scene, color) {
    this.group = new THREE.Group();
    const beamGeo = new THREE.CylinderGeometry(0.35, 0.6, 40, 16, 1, true);
    beamGeo.translate(0, 20, 0);
    this.beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.group.add(new THREE.Mesh(beamGeo, this.beamMat));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    this.ring = ring;
    this.group.add(ring);
    this.star = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTexture(color), depthWrite: false, depthTest: false }));
    this.star.scale.setScalar(0.9);
    this.star.renderOrder = 10;
    this.group.add(this.star);
    this.group.visible = false;
    scene.add(this.group);
  }

  set(t, time, near) {
    if (!t) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    this.group.position.set(t.x, t.y, t.z);
    this.star.position.y = (t.area ? 6 : 3.1) + Math.sin(time * 3) * 0.25;
    this.ring.scale.setScalar(t.area ? 8 : 1 + Math.sin(time * 4) * 0.08);
    this.beamMat.opacity = near ? 0.1 : 0.22;
  }
}

export class Guide {
  constructor(game) {
    this.game = game;
    this.beacons = { story: new Beacon(game.scene, COLORS.story), job: new Beacon(game.scene, COLORS.job) };
    this.arrow = document.createElement('div');
    this.arrow.id = 'guide-arrow';
    this.arrow.className = 'guide-arrow hidden';
    this.arrow.innerHTML = '<div class="ga-pointer"><span class="ga-glyph">➤</span></div><div class="ga-text"></div>';
    document.body.appendChild(this.arrow);
    this.targets = { story: null, job: null };
    this.enabled = true;
    this.t = 0;
    this._v = new THREE.Vector3();
  }

  /** Résout une cible : si on est dans la maison, on guide d'abord vers la porte. */
  resolve(t) {
    if (!t) return null;
    const g = this.game;
    const out = { ...t };
    if (g.house.inside && !t.inside) {
      const e = g.house.entryPoint;
      return { x: e.x, z: e.z + 0.3, y: 0, label: '🚪 Sortir de la maison', exit: true };
    }
    out.y = t.y ?? g.world.groundAt(t.x, t.z);
    return out;
  }

  update(dt) {
    const g = this.game;
    this.t += dt;
    const playing = g.state === 'play' && this.enabled && !g.photo.active;
    const story = playing ? this.resolve(g.quests.target()) : null;
    const job = playing ? this.resolve(g.jobs.target()) : null;
    this.targets = { story, job };
    const p = g.player.pos;
    const near = (t) => t && Math.hypot(t.x - p.x, t.z - p.z) < 6;
    this.beacons.story.set(story, this.t, near(story));
    this.beacons.job.set(job, this.t, near(job));
    // La flèche suit la mission en cours en priorité (plus urgente), sinon l'histoire.
    const main = job ? { ...job, kind: 'job' } : story ? { ...story, kind: 'story' } : null;
    this.updateArrow(main);
  }

  updateArrow(t) {
    const g = this.game;
    const el = this.arrow;
    if (!t || g.busy || g.panel || g.decor.active) {
      el.classList.add('hidden');
      return;
    }
    const p = g.player.pos;
    const dist = Math.hypot(t.x - p.x, t.z - p.z);
    const cam = g.camera;
    const v = this._v.set(t.x, t.y + 2.2, t.z).project(cam);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const behind = v.z > 1;
    let x = (v.x * 0.5 + 0.5) * w;
    let y = (-v.y * 0.5 + 0.5) * h;
    const margin = 56;
    const onScreen = !behind && x > margin && x < w - margin && y > margin + 40 && y < h - margin - 60;
    if (dist < 3.2 && onScreen) {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    el.classList.toggle('job', t.kind === 'job');
    let angle = Math.PI / 2;
    if (onScreen) {
      el.classList.add('onscreen');
    } else {
      el.classList.remove('onscreen');
      if (behind) {
        x = w - x;
        y = h - y;
      }
      const cx = w / 2;
      const cy = h / 2;
      let dx = x - cx;
      let dy = y - cy;
      if (behind && Math.abs(dy) < 1) dy = 1;
      angle = Math.atan2(dy, dx);
      const sx = (w / 2 - margin) / Math.max(Math.abs(dx), 1e-3);
      const sy = (h / 2 - margin - 50) / Math.max(Math.abs(dy), 1e-3);
      const k = Math.min(sx, sy);
      x = cx + dx * k;
      y = cy + dy * k;
      dx = 0;
    }
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(y)}px`;
    el.querySelector('.ga-glyph').style.transform = `rotate(${angle}rad)`;
    const txt = `${t.label ? `${escapeHtml(t.label)} · ` : ''}${Math.round(dist)} m`;
    const tEl = el.querySelector('.ga-text');
    if (tEl.innerHTML !== txt) tEl.innerHTML = txt;
  }

  /** Marqueurs pour la mini-carte. */
  mapMarkers() {
    const out = [];
    const g = this.game;
    for (const [kind, t] of Object.entries(this.targets)) {
      if (!t) continue;
      if (t.exit) {
        const d = g.world.village.doorFront(0, 1.6);
        out.push({ x: d.x, z: d.z, kind });
      } else if (Math.abs(t.x - ROOM.x) > 100) out.push({ x: t.x, z: t.z, kind, area: t.area });
    }
    return out;
  }

  flash() {
    this.arrow.classList.remove('pulse');
    void this.arrow.offsetWidth;
    this.arrow.classList.add('pulse');
  }
}
