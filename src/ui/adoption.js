import { petPortrait } from './petPortrait.js';
import { escapeHtml } from './ui.js';
import { MAX_FOLLOWERS } from '../animals/manager.js';

// Adoption au Café des Chats : Mimi présente ses pensionnaires (portrait, race, caractère).
// On choisit un nom, on adopte ; un nouveau chat arrive au café le lendemain.

const NAMES = ['Mochi', 'Caramel', 'Pistache', 'Biscuit', 'Nougat', 'Praline', 'Tigrou', 'Minette', 'Moka', 'Cannelle', 'Noisette', 'Filou',
  'Pépite', 'Plume', 'Choupette', 'Pastèque', 'Guimauve', 'Réglisse', 'Grisou', 'Câline', 'Flocon', 'Sushi', 'Muffin', 'Pompon'];
const TRAITS = [
  ['💗', 'Très câlin', 'ronronne dès qu\'on le prend dans les bras'],
  ['🧶', 'Joueur', 'ne résiste à aucune pelote'],
  ['🐟', 'Gourmand', 'connaît l\'heure de la pâtée par cœur'],
  ['🔍', 'Curieux', 'veut tout voir, tout renifler'],
  ['💤', 'Grand dormeur', 'fait des siestes de champion'],
  ['🌸', 'Timide mais doux', 'se blottit une fois en confiance'],
  ['🎵', 'Bavard', 'miaule pour te raconter sa journée'],
  ['🧭', 'Aventurier', 'rêve de suivre quelqu\'un partout'],
];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function catTrait(a) {
  return TRAITS[hash(a.id) % TRAITS.length];
}

export class Adoption {
  constructor(game) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.id = 'adoption';
    this.el.className = 'modal hidden';
    this.el.innerHTML = `<div class="modal-card adopt-card">
      <button class="close" data-adopt-close aria-label="Fermer">✕</button>
      <h2>🐱 Chats à l'adoption</h2>
      <p class="note adopt-greet"></p>
      <div class="adopt-grid"></div>
    </div>`;
    document.body.appendChild(this.el);
    this.el.querySelector('[data-adopt-close]').onclick = () => this.close();
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Escape') this.close();
    });
    this.isOpen = false;
    this.names = {};
  }

  open(villager) {
    const g = this.game;
    this.villager = villager;
    this.isOpen = true;
    g.input.enabled = false;
    this.el.classList.remove('hidden');
    this.render();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.add('hidden');
    this.game.input.enabled = true;
  }

  suggestName(a) {
    if (!this.names[a.id]) {
      const taken = new Set(this.game.animals.companions().map((x) => x.name));
      const start = hash(`${a.id}-nom`) % NAMES.length;
      let name = NAMES[start];
      for (let i = 0; i < NAMES.length && taken.has(name); i++) name = NAMES[(start + i) % NAMES.length];
      this.names[a.id] = name;
    }
    return this.names[a.id];
  }

  render(adopted = null) {
    const g = this.game;
    const greet = this.el.querySelector('.adopt-greet');
    const grid = this.el.querySelector('.adopt-grid');
    const list = g.animals.adoptable();
    greet.textContent = adopted
      ? `${this.villager?.def.emoji || '☕'} « ${adopted.name} va être tellement heureux avec toi ! Reviens voir les autres quand tu veux. »`
      : `${this.villager?.def.emoji || '☕'} « Ils attendent tous une famille ! Choisis celui qui te fait craquer, donne-lui un nom… et il rentre avec toi. »`;
    grid.innerHTML = '';
    if (adopted) {
      const done = document.createElement('div');
      done.className = 'adopt-done';
      done.innerHTML = `<img alt="" src="${petPortrait(g.renderer, adopted.species, adopted.variant, adopted.outfit)}" />
        <div><b>🎉 Bienvenue ${escapeHtml(adopted.name)} !</b><br/><small>${adopted.follow ? 'Il te suit déjà.' : `Il t'attend au jardin (${MAX_FOLLOWERS} compagnons avec toi au plus).`} Un nouveau pensionnaire arrivera au café demain.</small></div>`;
      const dress = document.createElement('button');
      dress.className = 'btn primary';
      dress.textContent = '👗 L\'habiller';
      dress.onclick = () => {
        this.close();
        g.openPanel('pets');
        g.pets.dress(adopted);
      };
      done.appendChild(dress);
      grid.appendChild(done);
    }
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.innerHTML = '<span class="big">🏡</span><br/>Tous les chats du café ont trouvé une famille !<br/>De nouveaux pensionnaires arrivent dès demain matin.';
      grid.appendChild(empty);
      return;
    }
    for (const a of list) {
      const [emoji, trait, more] = catTrait(a);
      const v = a.sp.variants[a.variant % a.sp.variants.length];
      const card = document.createElement('div');
      card.className = 'adopt-item';
      card.innerHTML = `<img class="adopt-pic" alt="" src="${petPortrait(g.renderer, a.species, a.variant)}" />
        <div class="adopt-breed">${escapeHtml(v.name)}${v.baby ? ' · chaton' : ''}</div>
        <div class="adopt-trait">${emoji} <b>${trait}</b> : ${more}.</div>
        <label class="adopt-name">Son nom <input maxlength="16" value="${escapeHtml(this.suggestName(a))}" /></label>`;
      const input = card.querySelector('input');
      input.addEventListener('keydown', (e) => e.stopPropagation());
      input.addEventListener('input', () => (this.names[a.id] = input.value));
      const btn = document.createElement('button');
      btn.className = 'btn primary';
      btn.textContent = '💗 Adopter';
      btn.onclick = () => {
        const name = input.value.trim() || this.suggestName(a);
        // Le chat attend devant la joueuse pour faire connaissance.
        const p = g.player;
        a.teleport(p.pos.x + Math.sin(p.rotY) * 1.6, p.pos.z + Math.cos(p.rotY) * 1.6);
        g.animals.adoptFromCafe(a, name);
        this.render(a);
      };
      card.appendChild(btn);
      grid.appendChild(card);
    }
  }
}
