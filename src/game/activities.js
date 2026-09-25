import * as THREE from 'three';
import { ITEMS } from './items.js';
import { Shape, G, vertexColorToon } from '../core/materials.js';

// Activités : cueillette (baies, pommes, carottes, graines) et pêche.

export class Resources {
  constructor(game) {
    this.game = game;
    this.nodes = game.world.vegetation.resources;
    this.nodes.forEach((n, i) => {
      n.id = `${n.type}-${i}`;
      n.harvestedAt = null;
    });
    this.checkT = 0;
  }

  now() {
    const s = this.game.world.sky;
    return s.day * 24 + s.hour;
  }

  available(n) {
    return n.harvestedAt === null || this.now() - n.harvestedAt >= n.regrow;
  }

  nearest(maxDist = 2.3) {
    const p = this.game.player;
    let best = null;
    let bestD = Infinity;
    for (const n of this.nodes) {
      const reach = n.type === 'apple' ? maxDist + 1.1 : n.type === 'bush' ? maxDist + 0.5 : maxDist;
      const d = Math.hypot(n.x - p.pos.x, n.z - p.pos.z);
      if (d < reach && d < bestD && this.available(n)) {
        best = n;
        bestD = d;
      }
    }
    return best;
  }

  harvest(n) {
    const g = this.game;
    const [a, b] = n.amount;
    const count = a + Math.floor(Math.random() * (b - a + 1));
    g.inventory[n.item] = (g.inventory[n.item] || 0) + count;
    n.harvestedAt = this.now();
    g.world.vegetation.setResourceVisible(n, false);
    g.player.face(n.x, n.z);
    g.player.character.play(n.type === 'apple' ? 'wave' : 'pick', 0.8);
    g.particles.emit('sparkle', new THREE.Vector3(n.x, n.y, n.z), { count: 2, spread: 0.8 });
    g.audio?.play('pick');
    const f = ITEMS[n.item];
    g.ui.toast(`+${count} ${f.emoji} ${f.label}`);
    g.emit('gather', { item: n.item, count });
    g.ui.refreshInventory();
    g.requestSave();
  }

  update(dt) {
    this.checkT -= dt;
    if (this.checkT > 0) return;
    this.checkT = 2;
    for (const n of this.nodes) {
      if (n.harvestedAt !== null && this.available(n)) {
        n.harvestedAt = null;
        this.game.world.vegetation.setResourceVisible(n, true);
      }
    }
  }

  serialize() {
    const out = {};
    for (const n of this.nodes) if (n.harvestedAt !== null) out[n.id] = +n.harvestedAt.toFixed(2);
    return out;
  }

  restore(data) {
    if (!data) return;
    for (const n of this.nodes) {
      if (data[n.id] !== undefined) {
        n.harvestedAt = data[n.id];
        if (!this.available(n)) this.game.world.vegetation.setResourceVisible(n, false);
        else n.harvestedAt = null;
      }
    }
  }
}

export const FISH = [
  { name: 'Gardon', min: 12, max: 25, w: 30 },
  { name: 'Perche', min: 15, max: 35, w: 22 },
  { name: 'Truite arc-en-ciel', min: 25, max: 50, w: 14 },
  { name: 'Sardine', min: 10, max: 18, w: 20 },
  { name: 'Poisson-clown', min: 8, max: 12, w: 6 },
  { name: 'Carpe koï', min: 40, max: 70, w: 5 },
  { name: 'Poisson-lune', min: 60, max: 120, w: 2 },
  { name: 'Vieille botte 👢', min: 30, max: 30, w: 3, junk: true },
];

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
  }

  get active() {
    return this.state !== 'off';
  }

  nearestSpot(maxDist = 2.4) {
    const p = this.game.player.pos;
    for (const s of this.game.world.fishingSpots) {
      if (Math.hypot(s.x - p.x, s.z - p.z) < maxDist) return s;
    }
    return null;
  }

  start(spot) {
    const g = this.game;
    this.spot = spot;
    this.state = 'wait';
    this.t = 2.5 + Math.random() * 4;
    g.player.frozen = true;
    g.player.face(spot.x + spot.dirX * 10, spot.z + spot.dirZ * 10);
    g.player.character.setFishing(true);
    this.bobberPos = new THREE.Vector3(spot.x + spot.dirX * 4.5, 0.02, spot.z + spot.dirZ * 4.5);
    this.bobber.position.copy(this.bobberPos);
    this.bobber.visible = true;
    this.line.visible = true;
    g.audio?.play('cast');
  }

  stop() {
    const g = this.game;
    this.state = 'off';
    this.bobber.visible = false;
    this.line.visible = false;
    g.player.frozen = false;
    g.player.character.setFishing(false);
  }

  /** Appui sur E pendant la pêche. */
  action() {
    const g = this.game;
    if (this.state === 'bite') {
      this.catchFish();
    } else {
      g.ui.toast('Trop tôt ! Attends que le flotteur plonge… 🎣');
      this.stop();
    }
  }

  catchFish() {
    const g = this.game;
    const total = FISH.reduce((s, f) => s + f.w, 0);
    let r = Math.random() * total;
    let fish = FISH[0];
    for (const f of FISH) {
      r -= f.w;
      if (r <= 0) {
        fish = f;
        break;
      }
    }
    const size = Math.round(fish.min + Math.random() * (fish.max - fish.min));
    if (fish.junk) {
      g.ui.toast(`Oups… tu as repêché une ${fish.name} !`);
    } else {
      g.inventory.poisson = (g.inventory.poisson || 0) + 1;
      const record = !this.best[fish.name] || size > this.best[fish.name];
      if (record) this.best[fish.name] = size;
      g.ui.toast(`🐟 Tu as pêché : ${fish.name} (${size} cm)${record ? ' — record !' : ''}`);
      g.emit('catch', { fish: fish.name, size });
      g.particles.emit('sparkle', this.bobberPos.clone().setY(0.6), { count: 3, spread: 0.6 });
      g.player.character.play('celebrate', 1.2);
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
      this.t = 1.3;
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
    }
    this.bobber.position.set(this.bobberPos.x, this.bobberPos.y + dip, this.bobberPos.z);
    const tip = new THREE.Vector3();
    g.player.character.rodTip.getWorldPosition(tip);
    const pos = this.line.geometry.attributes.position;
    pos.setXYZ(0, tip.x, tip.y, tip.z);
    pos.setXYZ(1, this.bobber.position.x, this.bobber.position.y + 0.2, this.bobber.position.z);
    pos.needsUpdate = true;
  }
}
