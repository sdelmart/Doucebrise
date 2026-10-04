import * as THREE from 'three';
import { ITEMS } from './items.js';

// Cueillette : baies, pommes, carottes, graines, champignons, coquillages, fleurs,
// et sur les îles : myrtilles, cristaux, pommes de pin, noix de coco, corail (perles).

// Ressources précieuses : plusieurs coups de E (le cristal se fissure, puis se détache).
const HITS = { crystal: 2, coral: 2 };
const STRIKE = {
  crystal: '⛏️ Le cristal se fissure… encore un coup !',
  coral: '🪸 Le corail se détache un peu… encore un coup !',
};

export class Resources {
  constructor(game) {
    this.game = game;
    this.nodes = game.world.vegetation.resources;
    this.nodes.forEach((n, i) => {
      n.id = `${n.type}-${i}`;
      n.harvestedAt = null;
      n.hits = HITS[n.type] || 1;
      n.struck = 0;
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
      const reach = n.type === 'apple' || n.type === 'palm' ? maxDist + 1.1 : n.type === 'bush' || n.type === 'crystal' ? maxDist + 0.5 : maxDist;
      const d = Math.hypot(n.x - p.pos.x, n.z - p.pos.z);
      if (d < reach && d < bestD && this.available(n)) {
        best = n;
        bestD = d;
      }
    }
    return best;
  }

  /** Ressource disponible la plus proche (pour le guide). */
  closestAvailable() {
    const p = this.game.player.pos;
    let best = null;
    let bestD = Infinity;
    for (const n of this.nodes) {
      if (!this.available(n)) continue;
      const d = Math.hypot(n.x - p.x, n.z - p.z);
      if (d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
  }

  /** Ressource disponible la plus proche donnant cet objet. */
  closestOf(item) {
    const p = this.game.player.pos;
    let best = null;
    let bestD = Infinity;
    for (const n of this.nodes) {
      if (n.item !== item || !this.available(n)) continue;
      const d = Math.hypot(n.x - p.x, n.z - p.z);
      if (d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
  }

  /** Coups déjà donnés (remis à zéro si l'on s'en va un moment). */
  strikes(n) {
    if (n.struck && performance.now() - n.struckAt > 10000) n.struck = 0;
    return n.struck;
  }

  harvest(n) {
    const g = this.game;
    if (n.hits > 1 && this.strikes(n) + 1 < n.hits) {
      n.struck++;
      n.struckAt = performance.now();
      g.player.face(n.x, n.z);
      g.player.character.play('pick', 0.6);
      g.particles.emit('sparkle', new THREE.Vector3(n.x, n.y, n.z), { count: 4, spread: 0.5 });
      g.audio?.play('snowhit');
      g.ui.toast(STRIKE[n.type] || 'Encore un coup !', 1800);
      return false;
    }
    n.struck = 0;
    const [a, b] = n.amount;
    let count = a + Math.floor(Math.random() * (b - a + 1));
    if (Math.random() < g.progress.perk('cueillette') * 0.07) count++;
    g.inventory[n.item] = (g.inventory[n.item] || 0) + count;
    n.harvestedAt = this.now();
    g.world.vegetation.setResourceVisible(n, false);
    g.player.face(n.x, n.z);
    g.player.character.play(n.type === 'apple' || n.type === 'palm' ? 'wave' : 'pick', 0.8);
    g.particles.emit('sparkle', new THREE.Vector3(n.x, n.y, n.z), { count: 2, spread: 0.8 });
    g.audio?.play('pick');
    const f = ITEMS[n.item];
    g.ui.toast(`+${count} ${f.emoji} ${f.label}`);
    g.emit('gather', { item: n.item, count });
    // Trouvaille bonus (une perle dans le corail…).
    if (n.bonus && Math.random() < n.bonus.chance * (1 + g.progress.perk('cueillette') * 0.1)) {
      const b = ITEMS[n.bonus.item];
      g.inventory[n.bonus.item] = (g.inventory[n.bonus.item] || 0) + 1;
      setTimeout(() => g.ui.toast(`✨ Quelle chance ! +1 ${b.emoji} ${b.label}`, 3000), 500);
      g.emit('gather', { item: n.bonus.item, count: 1 });
    }
    g.progress.addXp('cueillette', 3 + count);
    g.ui.refreshInventory();
    g.requestSave();
    return true;
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
