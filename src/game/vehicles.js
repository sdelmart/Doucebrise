import * as THREE from 'three';
import { vehicleModel, wheelGeo } from '../world/vehicleModels.js';
import { vertexColorToon, withOutline } from '../core/materials.js';

// Véhicules : achetés au garage de Léo, appelés avec V, repeints à volonté.
// Terrestres (trottinette, vélo, scooter, voiturette), bateau (sur l'eau) et
// montgolfière (au-dessus de toute l'île).

export const VEHICLES = {
  trottinette: { label: 'Trottinette', emoji: '🛴', price: 450, speed: 8.6, accel: 5, turn: 3.2, pose: 'stand', seat: 0.2, radius: 0.45, mode: 'ground', desc: 'Légère et facile : parfaite pour débuter.' },
  velo: { label: 'Vélo fleuri', emoji: '🚲', price: 900, speed: 10.5, accel: 4.5, turn: 2.8, pose: 'bike', seat: 0.92, radius: 0.5, mode: 'ground', desc: 'Avec un panier plein de fleurs !' },
  scooter: { label: 'Scooter rétro', emoji: '🛵', price: 2800, speed: 14, accel: 5.5, turn: 2.4, pose: 'sit', seat: 0.9, radius: 0.6, mode: 'ground', desc: 'Pour filer d\'un bout à l\'autre de l\'île.' },
  voiturette: { label: 'Voiturette', emoji: '🚗', price: 6500, speed: 16, accel: 5.5, turn: 2.0, pose: 'sit', seat: 0.78, radius: 1.05, mode: 'ground', desc: 'Décapotable, avec klaxon qui fait « pouet ».' },
  bateau: { label: 'Petit bateau', emoji: '🚤', price: 4000, speed: 11, accel: 3.5, turn: 1.9, pose: 'boat', seat: 0.45, radius: 1.0, mode: 'water', desc: 'À mettre à l\'eau depuis la plage, le ponton ou l\'étang.' },
  montgolfiere: { label: 'Montgolfière', emoji: '🎈', price: 15000, speed: 8, accel: 1.6, turn: 1.4, pose: 'balloon', seat: 0.14, radius: 0, mode: 'air', altitude: 26, desc: 'Survole toute l\'île… la plus belle vue de Doucebrise !' },
};

export const VEHICLE_COLORS = ['#ff8fab', '#8fd6e8', '#ffd84d', '#b5e48c', '#b69cf0', '#e5484d', '#fffaf2', '#ffb27a', '#6fa8dc', '#3d3744', '#3f9d4a', '#ff5a6e'];

export class Vehicles {
  constructor(game) {
    this.game = game;
    this.owned = {};
    this.current = null;
    this.group = null;
    this.wheels = [];
    this.el = document.createElement('div');
    this.el.id = 'vehicles';
    this.el.className = 'modal hidden';
    document.body.appendChild(this.el);
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.closeMenu();
    });
    window.addEventListener('keydown', (e) => {
      if (this.menuOpen && e.code === 'Escape') this.closeMenu();
    });
  }

  has(id) {
    return id in this.owned;
  }

  buy(id, color = VEHICLE_COLORS[Object.keys(this.owned).length % VEHICLE_COLORS.length]) {
    this.owned[id] = color;
    this.game.emit('vehicle', { id });
  }

  get riding() {
    return !!this.current;
  }

  // --- Menu (V) --------------------------------------------------------------------

  toggleMenu() {
    if (this.current) {
      this.dismount();
      return;
    }
    if (this.menuOpen) this.closeMenu();
    else this.openMenu();
  }

  openMenu() {
    const g = this.game;
    if (!Object.keys(this.owned).length) {
      g.ui.toast('🚲 Tu n\'as pas encore de véhicule. Léo en vend au garage, au nord-est de la place !', 3800);
      return;
    }
    this.menuOpen = true;
    g.input.enabled = false;
    this.el.classList.remove('hidden');
    this.render();
  }

  closeMenu() {
    if (!this.menuOpen) return;
    this.menuOpen = false;
    this.game.input.enabled = true;
    this.el.classList.add('hidden');
  }

  render() {
    let html = '<div class="modal-card"><button class="close" data-vclose>✕</button><h2>🚲 Mes véhicules</h2><p class="note">Choisis un véhicule et sa couleur. Appuie sur V (ou E) pour descendre.</p><div class="veh-list">';
    for (const [id, color] of Object.entries(this.owned)) {
      const v = VEHICLES[id];
      html += `<div class="veh-row"><div class="veh-em">${v.emoji}</div><div class="veh-info"><b>${v.label}</b><small>${v.desc}</small>
        <div class="swatches small">${VEHICLE_COLORS.map((c) => `<button class="swatch${c === color ? ' active' : ''}" style="background:${c}" data-vcol="${id}|${c}"></button>`).join('')}</div></div>
        <button class="btn primary" data-vride="${id}">Monter</button></div>`;
    }
    html += '</div></div>';
    this.el.innerHTML = html;
    this.el.querySelector('[data-vclose]').onclick = () => this.closeMenu();
    this.el.querySelectorAll('[data-vcol]').forEach((b) => {
      b.onclick = () => {
        const [id, c] = b.dataset.vcol.split('|');
        this.owned[id] = c;
        this.game.audio.play('ui');
        this.game.requestSave();
        this.render();
      };
    });
    this.el.querySelectorAll('[data-vride]').forEach((b) => {
      b.onclick = () => {
        this.closeMenu();
        this.mount(b.dataset.vride);
      };
    });
  }

  // --- Monter / descendre ----------------------------------------------------------------

  /** Point d'eau navigable le plus proche (pour le bateau). */
  findWater(p, maxR = 18) {
    const t = this.game.world.terrain;
    for (let r = 1; r <= maxR; r += 0.75) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const x = p.x + Math.cos(a) * r;
        const z = p.z + Math.sin(a) * r;
        if (t.heightAt(x, z) < -0.7 && !this.game.world.onPlatform(x, z)) return { x, z };
      }
    }
    return null;
  }

  /** Terre ferme la plus proche (pour débarquer). */
  findLand(p, maxR = 10, minH = -0.3) {
    const w = this.game.world;
    for (let r = 0; r <= maxR; r += 0.6) {
      for (let i = 0; i < (r ? 24 : 1); i++) {
        const a = (i / 24) * Math.PI * 2;
        const x = p.x + Math.cos(a) * r;
        const z = p.z + Math.sin(a) * r;
        if (w.groundAt(x, z) < minH) continue;
        const res = w.colliders.resolve(x, z, 0.4);
        if (Math.hypot(res.x - x, res.z - z) < 0.01) return { x, z };
      }
    }
    return null;
  }

  mount(id) {
    const g = this.game;
    const def = VEHICLES[id];
    const p = g.player.pos;
    if (g.indoors) {
      g.ui.toast('🏡 Sors de la maison pour prendre ton véhicule !');
      return;
    }
    let spot = { x: p.x, z: p.z };
    if (def.mode === 'water') {
      spot = this.findWater(p);
      if (!spot) {
        g.ui.toast('🚤 Approche-toi de l\'eau (plage, ponton ou étang) pour mettre ton bateau à l\'eau.', 3500);
        return;
      }
    } else if (g.world.groundAt(p.x, p.z) < 0.1 && def.mode === 'ground') {
      g.ui.toast('Il faut être sur la terre ferme !');
      return;
    }
    g.standUp();
    if (g.fishing.active) g.fishing.stop();
    this.current = id;
    this.buildMesh(id, this.owned[id]);
    g.player.vehicle = { def, id, speed: 0, roll: 0, landing: false };
    g.player.teleport(spot.x, spot.z, g.player.rotY);
    if (def.mode === 'water') g.player.pos.y = 0;
    g.character.setRide(def.pose, def.seat);
    if (def.mode === 'air') {
      g.cam.dist = Math.max(g.cam.dist, 16);
      g.ui.toast('🎈 Décollage ! Dirige-toi avec les flèches, V pour atterrir.', 3500);
    } else {
      g.ui.toast(`${def.emoji} En route ! (V ou E pour descendre${def.mode === 'ground' ? ', Maj pour accélérer' : ''})`, 2600);
    }
    g.audio.play(id === 'voiturette' ? 'honk' : id === 'velo' ? 'bell' : 'ui');
    g.particles.emit('sparkle', p.clone().setY(p.y + 1), { count: 3 });
    g.emit('ride', { id });
  }

  dismount(force = false) {
    const g = this.game;
    const v = g.player.vehicle;
    if (!v) return;
    const p = g.player.pos;
    let spot = { x: p.x, z: p.z };
    if (!force) {
      if (v.def.mode === 'water') {
        spot = this.findLand(p, 10);
        if (!spot) {
          g.ui.toast('🚤 Approche-toi de la rive pour débarquer.');
          return;
        }
      } else if (v.def.mode === 'air') {
        if (g.world.groundAt(p.x, p.z) < 0.15) {
          g.ui.toast('🎈 Pose-toi au-dessus de la terre ferme !');
          return;
        }
        if (!v.landing) {
          v.landing = true;
          g.ui.toast('🎈 Atterrissage en douceur…', 2000);
          return;
        }
        if (p.y - Math.max(g.world.groundAt(p.x, p.z), 0) > 0.3) return;
        spot = this.findLand(p, 6) || spot;
      }
    }
    this.removeMesh();
    this.current = null;
    g.player.vehicle = null;
    g.character.setRide(null);
    g.character.root.rotation.z = 0;
    g.player.teleport(spot.x, spot.z, g.player.rotY);
  }

  buildMesh(id, color) {
    this.removeMesh();
    const m = vehicleModel(id, color);
    const group = new THREE.Group();
    const body = new THREE.Mesh(m.geo, vertexColorToon());
    body.castShadow = true;
    withOutline(body, 0.012);
    group.add(body);
    this.wheels = [];
    if (m.wheels.length) {
      const r0 = m.wheels[0][3];
      const wg = wheelGeo(r0, m.wheelW);
      for (const [x, y, z, r] of m.wheels) {
        const w = new THREE.Mesh(r === r0 ? wg : wheelGeo(r, m.wheelW), vertexColorToon());
        w.position.set(x, y, z);
        w.castShadow = true;
        group.add(w);
        this.wheels.push({ mesh: w, r });
      }
    }
    this.group = group;
    this.game.scene.add(group);
  }

  removeMesh() {
    if (!this.group) return;
    this.group.removeFromParent();
    const seen = new Set();
    this.group.traverse((o) => {
      if (o.isMesh && o.name !== 'outline' && !seen.has(o.geometry)) {
        seen.add(o.geometry);
        o.geometry.dispose();
      }
    });
    this.group = null;
    this.wheels = [];
  }

  update(dt) {
    const g = this.game;
    const v = g.player.vehicle;
    if (!v || !this.group) return;
    const p = g.player.pos;
    this.group.position.set(p.x, p.y, p.z);
    this.group.rotation.set(0, g.player.rotY, v.def.mode === 'ground' ? v.roll : v.def.mode === 'water' ? Math.sin(g.elapsed * 1.3) * 0.04 : 0);
    if (v.def.mode === 'air') this.group.rotation.x = Math.sin(g.elapsed * 0.7) * 0.02;
    for (const w of this.wheels) w.mesh.rotation.x += (v.speed * dt) / w.r;
    // Atterrissage de la montgolfière terminé.
    if (v.landing && p.y - Math.max(g.world.groundAt(p.x, p.z), 0) < 0.08) this.dismount();
    // Sillage du bateau.
    if (v.def.mode === 'water' && Math.abs(v.speed) > 3) {
      this.wakeT = (this.wakeT || 0) - dt;
      if (this.wakeT <= 0) {
        this.wakeT = 0.12;
        const back = new THREE.Vector3(p.x - Math.sin(g.player.rotY) * 1.6, 0.1, p.z - Math.cos(g.player.rotY) * 1.6);
        g.particles.emit('drop', back, { count: 2, spread: 0.5, rise: 0.4, size: 0.16 });
      }
    }
  }

  serialize() {
    return { owned: this.owned };
  }

  restore(d) {
    if (d?.owned) this.owned = { ...d.owned };
  }
}
