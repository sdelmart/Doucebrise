import * as THREE from 'three';
import { ITEMS, RECIPES, countItem, takeItem } from './items.js';
import { Animal } from '../animals/animal.js';
import { SPECIES } from '../animals/species.js';
import { ZONES, LANDMARKS, islandAt } from '../world/layout.js';
import { villageReachable } from './quests.js';
import { createRng } from '../core/math.js';
import { Shape, G, vertexColorToon } from '../core/materials.js';
import { escapeHtml } from '../ui/ui.js';

// Petits boulots : le tableau de la place propose chaque jour quelques missions
// payées. Une seule à la fois ; le guide (flèche bleue) montre où aller.

export const JOB_TYPES = {
  livraison: { label: 'Livraison de colis', emoji: '📦' },
  courrier: { label: 'Lettre en main propre', emoji: '✉️' },
  promenade: { label: 'Promenade du chien', emoji: '🐕' },
  chat: { label: 'Chat perdu', emoji: '🐈' },
  plage: { label: 'Nettoyage de la plage', emoji: '🧹' },
  commande: { label: 'Commande spéciale', emoji: '🧺' },
};

const DOG_NAMES = ['Biscuit', 'Filou', 'Réglisse', 'Caramel', 'Pompon'];
const CAT_NAMES = ['Pistache', 'Moustache', 'Chaussette', 'Noisette', 'Guimauve'];
const WALK_SPOTS = [
  { name: 'le pique-nique de la prairie', x: 44, z: 17 },
  { name: 'le ponton de l\'étang', x: -44, z: 6 },
  { name: 'le moulin', x: -34, z: 44 },
  { name: 'la plage', x: 12, z: 74 },
  { name: 'le verger', x: 30, z: -26 },
  { name: 'l\'orée du bois', x: -2, z: -44 },
];

function litterGeo(kind) {
  const s = new Shape();
  if (kind === 0) {
    s.add(G.cyl(0.07, 0.07, 0.26, 10), '#8fd6e8', { rot: [0, 0, Math.PI / 2], pos: [0, 0.07, 0] });
    s.add(G.cyl(0.035, 0.035, 0.08, 8), '#8fd6e8', { rot: [0, 0, Math.PI / 2], pos: [0.16, 0.07, 0] });
  } else if (kind === 1) {
    s.add(G.cyl(0.05, 0.05, 0.14, 10), '#e5484d', { rot: [0, 0, Math.PI / 2], pos: [0, 0.05, 0] });
  } else {
    s.add(G.box(0.3, 0.02, 0.22), '#fffaf2', { pos: [0, 0.02, 0], rot: [0, 0.4, 0.1] });
  }
  return s.build();
}

export class Jobs {
  constructor(game) {
    this.game = game;
    this.offers = [];
    this.offerDay = 0;
    this.active = null;
    this.done = 0;
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.el = document.createElement('div');
    this.el.id = 'jobs';
    this.el.className = 'modal hidden';
    document.body.appendChild(this.el);
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Escape') this.close();
    });
  }

  // --- Offres du jour -----------------------------------------------------------------

  refresh() {
    const g = this.game;
    const day = g.world.sky.day;
    if (this.offerDay === day) return;
    const yesterday = new Set((this.offers || []).map((o) => o.type));
    this.offerDay = day;
    const rng = createRng(day * 4441 + 9);
    // Missions proches : habitants des villages déjà visités (l'île principale d'abord).
    const reachable = g.villagers.list.filter((v) => villageReachable(g, v.villageId));
    const villagers = reachable.length >= 2 ? reachable : g.villagers.list;
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const bonus = 1 + g.progress.perk('service') * 0.08;
    // Quatre missions sur six, en privilégiant celles qu'il n'y avait pas hier.
    const types = ['livraison', 'courrier', 'promenade', 'chat', 'plage', 'commande']
      .map((t) => ({ t, k: (yesterday.has(t) ? 1 : 0) + rng() }))
      .sort((a, b) => a.k - b.k)
      .slice(0, 4)
      .map((x) => x.t);
    this.offers = types.map((type) => {
      const from = pick(villagers).def.id;
      let to = pick(villagers).def.id;
      if (to === from) to = villagers[(villagers.findIndex((v) => v.def.id === from) + 1) % villagers.length].def.id;
      const o = { type, from, to, id: `${day}-${type}` };
      switch (type) {
        case 'livraison':
          o.reward = 70 + Math.floor(rng() * 5) * 10;
          break;
        case 'courrier':
          o.reward = 60 + Math.floor(rng() * 4) * 10;
          break;
        case 'promenade': {
          o.from = pick(['bruno', 'pomme', 'lila', 'leo']);
          o.pet = pick(DOG_NAMES);
          o.variant = Math.floor(rng() * 6);
          const spots = [...WALK_SPOTS].sort(() => rng() - 0.5).slice(0, 2);
          o.spots = spots;
          o.reward = 160 + Math.floor(rng() * 4) * 15;
          break;
        }
        case 'chat': {
          o.from = 'mimi';
          o.pet = pick(CAT_NAMES);
          o.variant = Math.floor(rng() * 19);
          // Un endroit connu : l'île principale ou un lieu déjà visité.
          const zones = ZONES.filter((z) => z.id !== 'village' && (islandAt(z.x, z.z) === 'main' || g.progress.zones.has(z.id)));
          const z = pick(zones);
          o.zone = z.id;
          o.reward = 180 + Math.floor(rng() * 4) * 20;
          break;
        }
        case 'plage':
          o.from = 'marin';
          o.reward = 130 + Math.floor(rng() * 4) * 10;
          break;
        case 'commande': {
          const known = RECIPES.filter((r) => g.cooking.known.has(r.id)).map((r) => r.id);
          const pool = ['baie', 'pomme', 'carotte', 'champignon', 'coquillage', 'fleur', 'poisson', ...known];
          o.item = pick(pool);
          o.count = ITEMS[o.item].price >= 50 ? 1 : 2 + Math.floor(rng() * 3);
          o.reward = Math.round((ITEMS[o.item].price * o.count * 1.6 + 40) / 5) * 5;
          break;
        }
        default:
          break;
      }
      o.reward = Math.round((o.reward * bonus) / 5) * 5;
      return o;
    });
    if (this.active && this.active.day !== day && ['promenade', 'chat'].includes(this.active.type) === false) {
      // Une mission non terminée reste valable : rien à faire.
    }
  }

  describe(o) {
    const g = this.game;
    const name = (id) => g.villagers.get(id)?.def.name || '???';
    switch (o.type) {
      case 'livraison':
        return `${name(o.from)} a un colis pour ${name(o.to)}. Dépose-le devant sa porte !`;
      case 'courrier':
        return `Porte une lettre de ${name(o.from)} à ${name(o.to)}, en main propre.`;
      case 'promenade':
        return `${name(o.from)} n'a pas le temps de promener ${o.pet}. Emmène-le à ${o.spots.map((s) => s.name).join(' puis à ')}, puis ramène-le.`;
      case 'chat': {
        const z = ZONES.find((zz) => zz.id === o.zone);
        return `${o.pet}, un des chats de Mimi, a fait une fugue du côté de : ${z.emoji} ${z.name}. Retrouve-le et ramène-le au café !`;
      }
      case 'plage':
        return 'Des déchets se sont échoués sur la plage. Ramasse-les tous pour Marin !';
      case 'commande':
        return `${name(o.from)} voudrait ${o.count} × ${ITEMS[o.item].emoji} ${ITEMS[o.item].label}.`;
      default:
        return '';
    }
  }

  // --- Tableau ------------------------------------------------------------------------

  open() {
    const g = this.game;
    this.refresh();
    this.isOpen = true;
    g.input.enabled = false;
    this.el.classList.remove('hidden');
    this.render();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.game.input.enabled = true;
    this.el.classList.add('hidden');
  }

  render() {
    let html = '<div class="modal-card"><button class="close" data-jclose>✕</button><h2>📋 Petits boulots</h2>';
    if (this.active) {
      const t = JOB_TYPES[this.active.type];
      html += `<div class="quest-card current"><div class="q-title">${t.emoji} En cours : ${t.label}</div><p class="q-desc">${escapeHtml(this.describe(this.active))}</p>
        <div class="q-goal"><span>${escapeHtml(this.progressText())}</span><span>🪙 ${this.active.reward}</span></div>
        <button class="btn small" data-jcancel>Abandonner</button></div>`;
    }
    html += '<p class="note">De nouvelles missions chaque jour. Une seule à la fois : la flèche bleue te guide !</p><div class="job-list">';
    for (const o of this.offers) {
      const t = JOB_TYPES[o.type];
      const taken = o.taken;
      html += `<div class="job-card${taken ? ' done' : ''}"><div class="job-em">${t.emoji}</div><div class="job-info"><b>${t.label}</b><small>${escapeHtml(this.describe(o))}</small></div>
        <div class="job-side"><div class="si-price">🪙 ${o.reward}</div>${taken ? '<span class="note">Pris ✓</span>' : `<button class="btn small primary" data-jtake="${o.id}" ${this.active ? 'disabled' : ''}>Accepter</button>`}</div></div>`;
    }
    html += '</div></div>';
    this.el.innerHTML = html;
    this.el.querySelector('[data-jclose]').onclick = () => this.close();
    this.el.querySelector('[data-jcancel]')?.addEventListener('click', () => {
      this.cancel();
      this.render();
    });
    this.el.querySelectorAll('[data-jtake]').forEach((b) => {
      b.onclick = () => {
        const o = this.offers.find((x) => x.id === b.dataset.jtake);
        this.accept(o);
        this.close();
      };
    });
  }

  accept(o) {
    const g = this.game;
    o.taken = true;
    this.active = { ...o, stage: 0, day: g.world.sky.day };
    this.setup();
    g.audio.play('pick');
    g.ui.toast(`${JOB_TYPES[o.type].emoji} Mission acceptée : ${JOB_TYPES[o.type].label}. Suis la flèche bleue !`, 3500);
    g.ui.refreshQuest();
    g.requestSave();
  }

  cancel() {
    this.cleanup();
    this.active = null;
    this.game.ui.toast('Mission abandonnée.');
    this.game.ui.refreshQuest();
    this.game.requestSave();
  }

  /** Crée ce qu'il faut dans le monde (chien, chat, déchets). */
  setup() {
    const g = this.game;
    const a = this.active;
    this.cleanup();
    if (a.type === 'promenade' && a.stage < 3) {
      const p = g.player.pos;
      this.pet = this.makePet('chien', a.variant, p.x + 1.2, p.z + 1.2);
      this.pet.adopted = true;
      this.pet.follow = true;
      this.pet.name = a.pet;
    } else if (a.type === 'chat') {
      if (!a.spot) {
        const z = ZONES.find((zz) => zz.id === a.zone);
        for (let t = 0; t < 40; t++) {
          const ang = Math.random() * Math.PI * 2;
          const r = Math.random() * z.r * 0.6;
          const x = z.x + Math.cos(ang) * r;
          const zz = z.z + Math.sin(ang) * r;
          if (g.world.groundAt(x, zz) > 0.6) {
            a.spot = { x, z: zz };
            break;
          }
        }
        a.spot ||= { x: z.x, z: z.z };
      }
      const pos = a.stage >= 1 ? g.player.pos : a.spot;
      this.pet = this.makePet('chat', a.variant, pos.x + (a.stage >= 1 ? 1 : 0), pos.z);
      this.pet.name = a.pet;
      if (a.stage >= 1) {
        this.pet.adopted = true;
        this.pet.follow = true;
      }
    } else if (a.type === 'plage') {
      a.litter ||= Array.from({ length: 6 }, (_, i) => {
        for (let t = 0; t < 30; t++) {
          const x = LANDMARKS.pier.x - 22 + Math.random() * 38;
          const z = 70 + Math.random() * 16;
          const h = g.world.heightAt(x, z);
          if (h > 0.15 && h < 1.6) return { x, z, k: i % 3, got: false };
        }
        return { x: 10 + i * 2, z: 76, k: i % 3, got: false };
      });
      this.litter = a.litter.map((l) => {
        if (l.got) return null;
        const m = new THREE.Mesh(litterGeo(l.k), vertexColorToon());
        m.position.set(l.x, g.world.heightAt(l.x, l.z), l.z);
        m.rotation.y = Math.random() * 6;
        this.group.add(m);
        return m;
      });
    }
  }

  makePet(species, variant, x, z) {
    const a = new Animal({ id: `job-${species}`, species, variant: variant % SPECIES[species].variants.length, x, z, r: 3 }, this.game.world, createRng(Date.now() % 1000));
    a.trust = 100;
    this.group.add(a.root);
    return a;
  }

  cleanup() {
    if (this.pet) {
      this.pet.root.removeFromParent();
      this.pet = null;
    }
    for (const m of this.litter || []) {
      if (!m) continue;
      m.removeFromParent();
      m.geometry.dispose();
    }
    this.litter = null;
  }

  progressText() {
    const a = this.active;
    if (!a) return '';
    const name = (id) => this.game.villagers.get(id)?.def.name || '???';
    switch (a.type) {
      case 'livraison':
        return `Aller à la porte de ${name(a.to)}`;
      case 'courrier':
        return `Parler à ${name(a.to)}`;
      case 'promenade':
        return a.stage < 2 ? `Aller à ${a.spots[a.stage].name} (${a.stage}/2)` : `Ramener ${a.pet} à ${name(a.from)}`;
      case 'chat':
        return a.stage === 0 ? `Chercher ${a.pet}` : `Ramener ${a.pet} à Mimi`;
      case 'plage':
        return `Déchets ramassés : ${a.litter ? a.litter.filter((l) => l.got).length : 0}/6`;
      case 'commande':
        return `${ITEMS[a.item].emoji} ${countItem(this.game.inventory, a.item)}/${a.count} → ${name(a.from)}`;
      default:
        return '';
    }
  }

  /** Où aller (pour le guide). */
  target() {
    const g = this.game;
    const a = this.active;
    if (!a) return null;
    const villagerPos = (id) => {
      const v = g.villagers.get(id);
      if (!v) return null;
      if (v.home) {
        const d = g.world.village.doorFront(v.def.house, 1.2);
        return { x: d.x, z: d.z };
      }
      return { x: v.pos.x, z: v.pos.z, y: v.pos.y };
    };
    switch (a.type) {
      case 'livraison': {
        const v = g.villagers.get(a.to);
        const d = g.world.village.doorFront(v.def.house, 1.0);
        return { x: d.x, z: d.z, label: `Porte de ${v.def.name}` };
      }
      case 'courrier':
        return { ...villagerPos(a.to), label: g.villagers.get(a.to).def.name };
      case 'promenade':
        if (a.stage < 2) return { x: a.spots[a.stage].x, z: a.spots[a.stage].z, label: a.spots[a.stage].name };
        return { ...villagerPos(a.from), label: g.villagers.get(a.from).def.name };
      case 'chat': {
        if (a.stage >= 1) return { ...villagerPos('mimi'), label: 'Mimi' };
        const near = this.pet && this.pet.pos.distanceTo(g.player.pos) < 14;
        if (near) return { x: this.pet.pos.x, z: this.pet.pos.z, label: a.pet };
        const z = ZONES.find((zz) => zz.id === a.zone);
        return { x: z.x, z: z.z, label: `Quelque part : ${z.name}`, area: true };
      }
      case 'plage': {
        const l = (a.litter || []).map((x, i) => ({ ...x, i })).filter((x) => !x.got).sort((p, q) => Math.hypot(p.x - g.player.pos.x, p.z - g.player.pos.z) - Math.hypot(q.x - g.player.pos.x, q.z - g.player.pos.z))[0];
        return l ? { x: l.x, z: l.z, label: 'Déchet' } : null;
      }
      case 'commande':
        return { ...villagerPos(a.from), label: g.villagers.get(a.from).def.name };
      default:
        return null;
    }
  }

  // --- Interactions -----------------------------------------------------------------

  /** Choix supplémentaires dans le dialogue avec un habitant. */
  dialogueChoices(v, dialogue) {
    const g = this.game;
    const a = this.active;
    if (!a) return [];
    const id = v.def.id;
    if (a.type === 'courrier' && a.to === id) {
      return [{ label: '✉️ Donner la lettre', primary: true, action: () => {
        dialogue.addFriendship(v, 5);
        this.complete(`Oh, une lettre de ${g.villagers.get(a.from).def.name} ! Merci beaucoup, c'est gentil d'avoir fait tout ce chemin.`, dialogue);
      } }];
    }
    if (a.type === 'promenade' && a.stage === 2 && a.from === id) {
      return [{ label: `🐕 Rendre ${a.pet}`, primary: true, action: () => this.complete(`${a.pet} a l'air tout content ! Merci de l'avoir promené, il en avait besoin.`, dialogue) }];
    }
    if (a.type === 'chat' && a.stage >= 1 && id === 'mimi') {
      return [{ label: `🐈 Ramener ${a.pet}`, primary: true, action: () => this.complete(`${a.pet} ! Te voilà, petite canaille ! Merci merci merci ! Tu es un·e héros·ïne !`, dialogue) }];
    }
    if (a.type === 'commande' && a.from === id) {
      const have = countItem(g.inventory, a.item);
      return [{ label: `🧺 Livrer ${ITEMS[a.item].emoji} ${have}/${a.count}`, primary: have >= a.count, disabled: have < a.count, action: () => {
        takeItem(g.inventory, a.item, a.count);
        g.ui.refreshInventory();
        this.complete('Parfait, c\'est exactement ce qu\'il me fallait ! Merci !', dialogue);
      } }];
    }
    return [];
  }

  /** Invite d'interaction dans le monde (chat perdu, déchets). */
  interaction() {
    const g = this.game;
    const a = this.active;
    if (!a) return null;
    const p = g.player.pos;
    if (a.type === 'chat' && a.stage === 0 && this.pet && this.pet.pos.distanceTo(p) < 2.2) {
      return {
        prompt: { pos: this.pet.headPosition().add(new THREE.Vector3(0, 0.35, 0)), title: `🐈 ${a.pet}`, sub: 'Le chat de Mimi !', actions: [{ key: 'E', label: 'Le rassurer et le ramener' }] },
        act: () => {
          a.stage = 1;
          this.pet.adopted = true;
          this.pet.follow = true;
          this.pet.pet();
          g.particles.emit('heart', this.pet.headPosition(), { count: 3 });
          g.audio.play('pet');
          g.ui.toast(`🐈 ${a.pet} te suit ! Ramène-le à Mimi, au Café des Chats.`, 3000);
          g.requestSave();
        },
      };
    }
    if (a.type === 'plage' && this.litter) {
      for (let i = 0; i < a.litter.length; i++) {
        const l = a.litter[i];
        if (l.got || Math.hypot(l.x - p.x, l.z - p.z) > 1.6) continue;
        return {
          prompt: { pos: new THREE.Vector3(l.x, g.world.heightAt(l.x, l.z) + 0.8, l.z), title: '🗑️ Déchet', actions: [{ key: 'E', label: 'Ramasser' }] },
          act: () => {
            l.got = true;
            const m = this.litter[i];
            if (m) {
              m.removeFromParent();
              m.geometry.dispose();
              this.litter[i] = null;
            }
            g.player.character.play('pick', 0.5);
            g.audio.play('pick');
            g.progress.addXp('cueillette', 3);
            if (a.litter.every((x) => x.got)) this.complete('La plage est toute propre ! Marin sera ravi.');
            else g.ui.toast(`🧹 ${a.litter.filter((x) => x.got).length}/6`, 1200);
            g.ui.refreshQuest();
            g.requestSave();
          },
        };
      }
    }
    return null;
  }

  complete(text, dialogue = null) {
    const g = this.game;
    const a = this.active;
    const t = JOB_TYPES[a.type];
    this.cleanup();
    this.active = null;
    this.done++;
    g.progress.addXp('service', 25 + Math.round(a.reward / 10));
    g.emit('job', { type: a.type });
    if (a.type === 'promenade') g.progress.addXp('soins', 15);
    setTimeout(() => g.grantReward({ coins: a.reward, stars: 2 }, null, `${t.emoji} Mission réussie :`), dialogue ? 200 : 600);
    g.audio.play('adopt');
    if (dialogue) dialogue.render(text);
    else g.ui.toast(`${t.emoji} ${text}`, 3000);
    g.ui.refreshQuest();
    g.requestSave();
  }

  update(dt) {
    const g = this.game;
    const a = this.active;
    if (!a) return;
    const p = g.player.pos;
    if (this.pet) {
      const pet = this.pet;
      const dist = pet.pos.distanceTo(p);
      pet.root.visible = dist < 75 || pet.follow;
      pet.update(dt, { player: g.player, night: false, followIndex: 4, hold: !!g.player.vehicle && g.player.vehicle.def.mode !== 'ground' });
      if (a.type === 'chat' && a.stage === 0 && dist < 10) {
        this.meowT = (this.meowT || 0) - dt;
        if (this.meowT <= 0) {
          this.meowT = 3;
          g.ui.bubble?.(() => pet.headPosition(), 'Miaou ?', 1500);
        }
      }
    }
    if (a.type === 'livraison') {
      const v = g.villagers.get(a.to);
      const d = g.world.village.doorFront(v.def.house, 1.0);
      if (Math.hypot(d.x - p.x, d.z - p.z) < 2.2 && !g.player.vehicle) this.complete(`Colis déposé devant chez ${v.def.name} !`);
    }
    if (a.type === 'promenade' && a.stage < 2) {
      const s = a.spots[a.stage];
      if (Math.hypot(s.x - p.x, s.z - p.z) < 5) {
        a.stage++;
        g.particles.emit('heart', this.pet ? this.pet.headPosition() : p.clone().setY(p.y + 1.5), { count: 3 });
        g.ui.toast(a.stage < 2 ? `🐕 ${a.pet} adore cet endroit ! Direction : ${a.spots[a.stage].name}.` : `🐕 Belle balade ! Ramène ${a.pet} à ${g.villagers.get(a.from).def.name}.`, 3200);
        g.ui.refreshQuest();
        g.requestSave();
      }
    }
  }

  serialize() {
    return { offers: this.offers, day: this.offerDay, active: this.active, done: this.done };
  }

  restore(d) {
    if (!d) return;
    this.offers = d.offers || [];
    this.offerDay = d.day || 0;
    this.active = d.active || null;
    this.done = d.done || 0;
    if (this.active) this.setup();
  }
}
