import { ITEMS, CATEGORIES } from '../game/items.js';
import { escapeHtml } from './ui.js';
import { FURNITURE } from '../house/furniture.js';

// Petit panneau : le sac (I).

export class BagPanel {
  constructor(game) {
    this.game = game;
    this.el = document.createElement('aside');
    this.el.id = 'bag';
    this.el.className = 'panel side hidden';
    document.body.appendChild(this.el);
  }

  render() {
    const g = this.game;
    let html = `<header class="panel-head"><h2>🎒 Mon sac</h2><div class="coins big">🪙 ${g.coins}</div><button class="close" data-close>✕</button></header><div class="panel-body">`;
    let any = false;
    for (const cat of CATEGORIES) {
      const ids = Object.keys(ITEMS).filter((id) => ITEMS[id].cat === cat.id && g.inventory[id] > 0);
      if (!ids.length) continue;
      any = true;
      html += `<div class="field-title">${cat.label}</div><div class="bag-grid">`;
      for (const id of ids) {
        const it = ITEMS[id];
        html += `<div class="bag-item" title="${escapeHtml(it.label)} — vaut ${it.price} 🪙"><span>${it.emoji}</span><small>${escapeHtml(it.label)}</small><b>${g.inventory[id]}</b></div>`;
      }
      html += '</div>';
    }
    if (!any) html += '<div class="empty-state"><div class="big">🧺</div>Ton sac est vide. Cueille, pêche et récolte pour le remplir !</div>';
    const stored = Object.entries(g.house.storage).filter(([, n]) => n > 0);
    if (stored.length) {
      html += '<div class="field-title">Meubles rangés</div><div class="bag-grid">';
      for (const [id, n] of stored) html += `<div class="bag-item"><span>${FURNITURE[id]?.emoji || '🛋️'}</span><small>${escapeHtml(g.house.label(id))}</small><b>${n}</b></div>`;
      html += '</div><p class="note">Entre chez toi ou va dans ton jardin, puis appuie sur B pour les placer.</p>';
    }
    html += '</div>';
    this.el.innerHTML = html;
    this.el.querySelector('[data-close]').onclick = () => g.closePanels();
  }
}
