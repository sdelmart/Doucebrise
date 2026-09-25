import { ITEMS, RECIPES, countItem, takeItem } from './items.js';
import { escapeHtml } from '../ui/ui.js';

// Cuisine : recettes connues, ingrédients du sac, préparation à la cuisinière.

export class Cooking {
  constructor(game) {
    this.game = game;
    this.known = new Set(RECIPES.filter((r) => r.known).map((r) => r.id));
    this.el = document.createElement('div');
    this.el.id = 'cooking';
    this.el.className = 'modal hidden';
    this.el.innerHTML = `<div class="modal-card"><button class="close" data-cclose>✕</button>
      <h2>🍳 Cuisine</h2><p class="note">Les plats se vendent bien plus cher que leurs ingrédients, et font d'excellents cadeaux.</p>
      <div id="cook-list" class="cook-list"></div></div>`;
    document.body.appendChild(this.el);
    this.el.querySelector('[data-cclose]').onclick = () => this.close();
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Escape') this.close();
    });
    this.isOpen = false;
  }

  learn(id) {
    if (this.known.has(id)) return false;
    this.known.add(id);
    return true;
  }

  canCook(r) {
    return Object.entries(r.needs).every(([id, n]) => countItem(this.game.inventory, id) >= n);
  }

  open() {
    this.isOpen = true;
    this.game.input.enabled = false;
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
    const g = this.game;
    const list = this.el.querySelector('#cook-list');
    list.innerHTML = '';
    for (const r of RECIPES) {
      const known = this.known.has(r.id);
      const it = ITEMS[r.id];
      const row = document.createElement('div');
      row.className = `cook-row${known ? '' : ' unknown'}`;
      const needs = Object.entries(r.needs)
        .map(([id, n]) => {
          const have = countItem(g.inventory, id);
          return `<span class="${have >= n ? 'ok' : 'missing'}">${ITEMS[id].emoji} ${have}/${n}</span>`;
        })
        .join(' ');
      row.innerHTML = `<div class="cook-em">${known ? it.emoji : '❔'}</div>
        <div class="cook-info"><div class="cook-name">${known ? escapeHtml(it.label) : 'Recette inconnue'}</div>
        <div class="cook-needs">${known ? needs : `Apprise auprès de ${escapeHtml(r.from)} (amitié)`}</div></div>
        <div class="cook-price">${known ? `🪙 ${it.price}` : ''}</div>`;
      if (known) {
        const b = document.createElement('button');
        b.className = 'btn small primary';
        b.textContent = 'Cuisiner';
        b.disabled = !this.canCook(r);
        b.onclick = () => this.cook(r);
        row.appendChild(b);
      }
      list.appendChild(row);
    }
  }

  cook(r) {
    const g = this.game;
    if (!this.canCook(r)) return;
    for (const [id, n] of Object.entries(r.needs)) takeItem(g.inventory, id, n);
    const extra = Math.random() < g.progress.perk('cuisine') * 0.06 ? 1 : 0;
    g.inventory[r.id] = (g.inventory[r.id] || 0) + 1 + extra;
    g.audio.play('fav');
    g.player.character.play('celebrate', 0.9);
    g.ui.toast(`🍳 Tu as préparé : ${ITEMS[r.id].emoji} ${ITEMS[r.id].label} !${extra ? ' Et un de plus en bonus ! 🌟' : ''}`);
    g.emit('cook', { id: r.id });
    g.progress.addXp('cuisine', 12 + Math.round(ITEMS[r.id].price / 8));
    g.ui.refreshInventory();
    g.requestSave();
    this.render();
  }

  serialize() {
    return [...this.known];
  }

  restore(d) {
    if (Array.isArray(d)) for (const id of d) this.known.add(id);
  }
}
