import * as THREE from 'three';
import { Shape, G, toon, vertexColorToon, withOutline } from '../core/materials.js';
import { ITEMS } from './items.js';

// Potager : 9 parcelles dans le jardin. On plante, on arrose (la pluie aide),
// la plante grandit en 4 stades puis on récolte. L'arrosage à la main (waterUntil)
// et la pluie (rainUntil) sont comptés à part : la pluie fait pousser, mais on peut
// toujours arroser soi-même une parcelle mouillée par la pluie.

export const CROPS = {
  carotte: { hours: 16, yield: [2, 3] },
  fraise: { hours: 22, yield: [3, 4] },
  tomate: { hours: 28, yield: [3, 5] },
  mais: { hours: 34, yield: [2, 4] },
  citrouille: { hours: 44, yield: [1, 2] },
  pasteque: { hours: 40, yield: [1, 2] },
};

const LEAF = '#5fb04f';
const LEAF_D = '#3f8f45';

function plantGeo(crop, stage) {
  const s = new Shape();
  if (stage === 0) {
    s.add(G.cyl(0.015, 0.02, 0.14, 4), LEAF_D, { pos: [0, 0.07, 0] });
    s.add(G.sphere(0.06, 6, 4), '#8fd66a', { pos: [0.05, 0.15, 0], scale: [1.2, 0.35, 0.7], rot: [0, 0, 0.4] });
    s.add(G.sphere(0.06, 6, 4), '#8fd66a', { pos: [-0.05, 0.15, 0], scale: [1.2, 0.35, 0.7], rot: [0, 0, -0.4] });
    return s.build();
  }
  const k = stage === 1 ? 0.6 : 1;
  switch (crop) {
    case 'carotte':
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        s.add(G.cone(0.05 * k, 0.45 * k, 4), LEAF, { pos: [Math.cos(a) * 0.05, 0.22 * k, Math.sin(a) * 0.05], rot: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4] });
      }
      if (stage === 3) s.add(G.cone(0.1, 0.22, 8), '#f28a2e', { pos: [0, 0.04, 0], rot: [Math.PI, 0, 0] });
      break;
    case 'fraise':
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        s.add(G.sphere(0.13 * k, 7, 5), i % 2 ? LEAF : LEAF_D, { pos: [Math.cos(a) * 0.14 * k, 0.12 * k, Math.sin(a) * 0.14 * k], scale: [1, 0.45, 1] });
      }
      if (stage === 2) for (let i = 0; i < 3; i++) s.add(G.sphere(0.035, 6, 4), '#ffffff', { pos: [Math.cos(i * 2.1) * 0.18, 0.2, Math.sin(i * 2.1) * 0.18] });
      if (stage === 3) {
        for (let i = 0; i < 5; i++) {
          const a = i * 1.3;
          s.add(G.cone(0.05, 0.1, 7), '#e5384f', { pos: [Math.cos(a) * 0.2, 0.12, Math.sin(a) * 0.2], rot: [Math.PI, 0, 0] });
        }
      }
      break;
    case 'tomate':
      s.add(G.cyl(0.015, 0.015, 0.9 * k + 0.1, 4), '#a0785a', { pos: [0.08, (0.9 * k + 0.1) / 2, 0] });
      for (let i = 0; i < 5; i++) {
        s.add(G.sphere(0.12 * k, 7, 5), i % 2 ? LEAF : LEAF_D, { pos: [Math.sin(i * 2.4) * 0.1, 0.15 + i * 0.14 * k, Math.cos(i * 2.4) * 0.1], scale: [1, 0.7, 1] });
      }
      if (stage >= 2) {
        for (let i = 0; i < 4; i++) {
          s.add(G.sphere(0.06, 8, 6), stage === 3 ? '#e5484d' : '#9fd46a', { pos: [Math.sin(i * 1.7) * 0.16, 0.25 + i * 0.15, Math.cos(i * 1.7) * 0.16] });
        }
      }
      break;
    case 'mais': {
      const h = 0.4 + k * 0.9 * (stage >= 2 ? 1.2 : 1);
      s.add(G.cyl(0.03, 0.04, h, 5), '#7cbc55', { pos: [0, h / 2, 0] });
      for (let i = 0; i < 4; i++) {
        const a = i * 1.6;
        s.add(G.sphere(0.2 * k, 6, 4), LEAF, { pos: [Math.cos(a) * 0.12, 0.2 + i * h * 0.2, Math.sin(a) * 0.12], rot: [0, -a, 0.7], scale: [1.4, 0.12, 0.35] });
      }
      if (stage === 3) {
        s.add(G.capsule(0.06, 0.18, 3, 8), '#ffd84d', { pos: [0.09, h * 0.62, 0], rot: [0, 0, -0.3] });
        s.add(G.sphere(0.08, 6, 4), '#9ed36a', { pos: [0.1, h * 0.55, 0], scale: [0.8, 1.6, 0.8], rot: [0, 0, -0.3] });
      }
      break;
    }
    case 'citrouille':
      for (let i = 0; i < 4; i++) {
        const a = i * 1.57 + 0.3;
        s.add(G.sphere(0.2 * k, 7, 5), i % 2 ? LEAF : LEAF_D, { pos: [Math.cos(a) * 0.25 * k, 0.08, Math.sin(a) * 0.25 * k], scale: [1, 0.3, 1] });
      }
      if (stage >= 2) {
        const r = stage === 3 ? 0.3 : 0.14;
        s.add(G.sphere(r, 14, 10), stage === 3 ? '#f58a2a' : '#8fc45a', { pos: [0, r * 0.8, 0.05], scale: [1.15, 0.85, 1.15] });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          s.add(G.sphere(r * 0.25, 6, 4), stage === 3 ? '#e57a20' : '#7fb44a', { pos: [Math.cos(a) * r * 1.05, r * 0.8, 0.05 + Math.sin(a) * r * 1.05], scale: [0.6, 3.2, 0.6] });
        }
        s.add(G.cyl(0.03, 0.04, 0.12, 5), '#6b8f3a', { pos: [0, r * 1.6, 0.05] });
      }
      break;
    case 'pasteque':
      // Tige rampante, grandes feuilles découpées, puis une pastèque rayée.
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26 + 0.2;
        s.add(G.sphere(0.17 * k, 7, 5), i % 2 ? LEAF : LEAF_D, { pos: [Math.cos(a) * 0.24 * k, 0.07, Math.sin(a) * 0.24 * k], scale: [1, 0.25, 0.8], rot: [0, -a, 0] });
      }
      s.add(G.torus(0.16 * k, 0.012, 4, 10, Math.PI * 1.4), LEAF_D, { pos: [0, 0.05, 0], rot: [Math.PI / 2, 0, 0.5] });
      if (stage >= 2) {
        const r = stage === 3 ? 0.27 : 0.12;
        const z = 0.08;
        s.add(G.sphere(r, 16, 12), stage === 3 ? '#3f9d4a' : '#8fc45a', { pos: [0.02, r * 0.78, z], scale: [1.2, 0.85, 0.95] });
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          s.add(new THREE.SphereGeometry(r * 1.012, 3, 12, a, 0.22, 0, Math.PI), stage === 3 ? '#24693a' : '#6fa84a', { pos: [0.02, r * 0.78, z], scale: [1.2, 0.85, 0.95] });
        }
        s.add(G.cyl(0.015, 0.02, 0.06, 5), '#8a6a3a', { pos: [0.02, r * 1.58, z] });
      }
      break;
    default:
      break;
  }
  return s.build();
}

export class Garden {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    game.scene.add(this.group);
    const yard = game.world.village.yard;
    const dir = yard.dir;
    const side = { x: -dir.z, z: dir.x };
    this.plots = [];
    this.selectedSeed = null;
    const dry = new THREE.Color('#9a6f4c');
    this.colors = { dry, wet: new THREE.Color('#5b3e2b') };
    const frame = new Shape();
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const f = -0.9 - (j - 1) * 1.5;
        const sd = (i - 1) * 1.5;
        const x = yard.x + dir.x * f + side.x * sd;
        const z = yard.z + dir.z * f + side.z * sd;
        const y = game.world.heightAt(x, z);
        frame.add(G.box(1.32, 0.16, 1.32), '#b98457', { pos: [x, y + 0.05, z], rot: [0, Math.atan2(dir.x, dir.z), 0] });
        const soilMat = toon(dry.clone());
        const soil = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.1, 1.18), soilMat);
        soil.position.set(x, y + 0.1, z);
        soil.rotation.y = Math.atan2(dir.x, dir.z);
        soil.receiveShadow = true;
        this.group.add(soil);
        const plant = new THREE.Group();
        plant.position.set(x, y + 0.15, z);
        this.group.add(plant);
        this.plots.push({ x, z, y: y + 0.15, soil, plant, crop: null, growth: 0, waterUntil: -1, rainUntil: -1, stage: -1, mesh: null });
      }
    }
    const fm = new THREE.Mesh(frame.build(), vertexColorToon());
    fm.receiveShadow = true;
    this.group.add(fm);
    this.tickT = 0;
  }

  now() {
    const s = this.game.world.sky;
    return s.day * 24 + s.hour;
  }

  seedsOwned() {
    return Object.keys(ITEMS).filter((id) => ITEMS[id].cat === 'seed' && this.game.inventory[id] > 0);
  }

  currentSeed() {
    const owned = this.seedsOwned();
    if (!owned.length) return null;
    if (!owned.includes(this.selectedSeed)) this.selectedSeed = owned[0];
    return this.selectedSeed;
  }

  cycleSeed() {
    const owned = this.seedsOwned();
    if (owned.length < 2) return;
    const i = owned.indexOf(this.currentSeed());
    this.selectedSeed = owned[(i + 1) % owned.length];
    this.game.audio.play('ui');
  }

  nearest(maxDist = 1.15) {
    const p = this.game.player.pos;
    let best = null;
    let bestD = maxDist;
    for (const pl of this.plots) {
      const d = Math.hypot(pl.x - p.x, pl.z - p.z);
      if (d < bestD) {
        best = pl;
        bestD = d;
      }
    }
    return best;
  }

  ripe(pl) {
    return pl.crop && pl.growth >= CROPS[pl.crop].hours;
  }

  /** Terre mouillée (arrosoir ou pluie) : la plante pousse. */
  watered(pl) {
    return this.now() < Math.max(pl.waterUntil, pl.rainUntil);
  }

  /** Arrosée à la main : plus besoin d'y revenir. */
  handWatered(pl) {
    return this.now() < pl.waterUntil;
  }

  /** Bulle d'interaction pour une parcelle. */
  prompt(pl) {
    const pos = new THREE.Vector3(pl.x, pl.y + 1.3, pl.z);
    if (!pl.crop) {
      const seed = this.currentSeed();
      if (!seed) return { pos, title: '🟫 Parcelle libre', sub: 'Achète des semis chez Mamie Rose', actions: [] };
      const owned = this.seedsOwned();
      const actions = [{ key: 'E', label: `Planter ${ITEMS[ITEMS[seed].crop].emoji} (${this.game.inventory[seed]})` }];
      if (owned.length > 1) actions.push({ key: 'F', label: 'Changer de semis' });
      return { pos, title: '🟫 Parcelle libre', sub: ITEMS[seed].label, actions };
    }
    const it = ITEMS[pl.crop];
    if (this.ripe(pl)) return { pos, title: `${it.emoji} ${it.label}`, sub: 'Prêt à récolter !', actions: [{ key: 'E', label: 'Récolter' }] };
    const pct = Math.floor((pl.growth / CROPS[pl.crop].hours) * 100);
    const done = this.handWatered(pl);
    return {
      pos,
      title: `${it.emoji} ${it.label} · ${pct} %`,
      sub: done ? '💧 Arrosé — ça pousse !' : this.watered(pl) ? '🌧️ La pluie l\'a mouillé — ça pousse !' : 'La terre est sèche…',
      actions: done ? [] : [{ key: 'E', label: 'Arroser 💧' }],
    };
  }

  interact(pl) {
    const g = this.game;
    if (!pl.crop) {
      const seed = this.currentSeed();
      if (!seed) {
        g.ui.toast('Il te faut des semis ! Mamie Rose en vend près de sa maison. 🌱');
        return;
      }
      g.inventory[seed] -= 1;
      pl.crop = ITEMS[seed].crop;
      pl.growth = 0;
      pl.stage = -1;
      g.player.face(pl.x, pl.z);
      g.player.character.play('pick', 0.8);
      g.audio.play('pick');
      g.ui.toast(`🌱 Tu as planté : ${ITEMS[pl.crop].label}. N'oublie pas d'arroser !`);
      g.emit('plant', { crop: pl.crop });
      g.progress.addXp('jardin', 4);
      this.refresh(pl);
    } else if (this.ripe(pl)) {
      const [a, b] = CROPS[pl.crop].yield;
      let n = a + Math.floor(Math.random() * (b - a + 1));
      const bonus = Math.random() < g.progress.perk('jardin') * 0.06;
      if (bonus) n *= 2;
      g.inventory[pl.crop] += n;
      g.player.face(pl.x, pl.z);
      g.player.character.play('pick', 0.8);
      g.particles.emit('sparkle', new THREE.Vector3(pl.x, pl.y + 0.6, pl.z), { count: 3, spread: 0.6 });
      g.audio.play('pick');
      g.ui.toast(`+${n} ${ITEMS[pl.crop].emoji} ${ITEMS[pl.crop].label}${bonus ? ' — récolte double ! 🌟' : ''}`);
      g.emit('harvest', { crop: pl.crop, count: n });
      g.progress.addXp('jardin', 8 + Math.round(ITEMS[pl.crop].price / 6));
      pl.crop = null;
      pl.growth = 0;
      this.refresh(pl);
    } else if (!this.handWatered(pl)) {
      this.water(pl);
      g.player.face(pl.x, pl.z);
      g.player.character.play('feed', 0.9);
      g.particles.emit('drop', new THREE.Vector3(pl.x, pl.y + 0.8, pl.z), { count: 6, spread: 0.7, rise: -0.4, size: 0.18, life: 0.8 });
      g.audio.play('splash');
      g.emit('water', {});
      g.progress.addXp('jardin', 2);
    }
    g.ui.refreshInventory();
    g.requestSave();
  }

  water(pl) {
    pl.waterUntil = this.now() + 24;
    this.refresh(pl);
  }

  refresh(pl) {
    const wet = this.watered(pl);
    pl.soil.material.color.copy(wet ? this.colors.wet : this.colors.dry);
    const stage = pl.crop ? Math.min(3, Math.floor((pl.growth / CROPS[pl.crop].hours) * 3 + (this.ripe(pl) ? 1 : 0))) : -1;
    if (stage === pl.stage) return;
    pl.stage = stage;
    if (pl.mesh) {
      pl.mesh.removeFromParent();
      pl.mesh.geometry.dispose();
      pl.mesh = null;
    }
    if (stage >= 0) {
      pl.mesh = new THREE.Mesh(plantGeo(pl.crop, stage), vertexColorToon());
      pl.mesh.castShadow = true;
      withOutline(pl.mesh, 0.01);
      pl.plant.add(pl.mesh);
    }
  }

  /** Avance la pousse (appelé avec le temps de jeu écoulé, en heures). */
  update(dt) {
    this.tickT -= dt;
    if (this.tickT > 0) return;
    this.tickT = 1;
    const now = this.now();
    const hours = this.lastNow === undefined ? 0 : Math.max(0, Math.min(now - this.lastNow, 48));
    this.lastNow = now;
    const w = this.game.world.weather;
    const winter = w.seasonIndex === 3 ? 0.5 : 1;
    for (const pl of this.plots) {
      if (w.isRaining) pl.rainUntil = now + 24;
      if (pl.crop && pl.waterUntil > now && !this.ripe(pl)) pl.growth = Math.min(CROPS[pl.crop].hours, pl.growth + hours * winter);
      this.refresh(pl);
    }
  }

  serialize() {
    return this.plots.map((p) => {
      const o = { w: +p.waterUntil.toFixed(2), r: +p.rainUntil.toFixed(2) };
      return p.crop ? { c: p.crop, g: +p.growth.toFixed(2), ...o } : o;
    });
  }

  restore(data) {
    if (!Array.isArray(data)) return;
    data.forEach((d, i) => {
      const pl = this.plots[i];
      if (!pl || !d) return;
      pl.crop = d.c || null;
      pl.growth = d.g || 0;
      // Anciennes sauvegardes : un seul « mouillé » qui mêlait pluie et arrosoir ;
      // on le compte comme de la pluie pour qu'on puisse de nouveau arroser.
      const old = d.r === undefined;
      pl.waterUntil = old ? -1 : d.w ?? -1;
      pl.rainUntil = (old ? d.w : d.r) ?? -1;
      pl.stage = -2;
      this.refresh(pl);
    });
  }
}
