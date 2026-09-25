import { ITEMS, CATEGORIES } from '../game/items.js';
import { escapeHtml } from './ui.js';
import { FURNITURE } from '../house/furniture.js';

// Petits panneaux : le sac (I) et les réglages (⚙️).

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

export const QUALITY = {
  basse: { label: 'Basse', ratio: 1, shadows: false, grass: 0 },
  moyenne: { label: 'Moyenne', ratio: 1.25, shadows: true, shadowSize: 1024, grass: 45 },
  haute: { label: 'Haute', ratio: 2, shadows: true, shadowSize: 2048, grass: 80 },
};

export const DAY_SPEEDS = {
  lente: { label: 'Lente (~24 min)', k: 0.6 },
  normale: { label: 'Normale (~14 min)', k: 1 },
  rapide: { label: 'Rapide (~7 min)', k: 2 },
};

export class SettingsPanel {
  constructor(game) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.id = 'settings';
    this.el.className = 'modal hidden';
    document.body.appendChild(this.el);
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) game.closePanels();
    });
    this.confirmReset = false;
  }

  render() {
    const g = this.game;
    const s = g.settings;
    this.el.innerHTML = `<div class="modal-card"><button class="close" data-close>✕</button><h2>⚙️ Réglages</h2>
      <div class="field"><div class="field-title">Qualité graphique</div><div class="chips">${Object.entries(QUALITY)
        .map(([id, q]) => `<button class="chip${s.quality === id ? ' active' : ''}" data-q="${id}">${q.label}</button>`)
        .join('')}</div><div class="note">« Basse » est conseillée sur les petits téléphones.</div></div>
      <div class="field"><div class="field-title">Durée d'une journée</div><div class="chips">${Object.entries(DAY_SPEEDS)
        .map(([id, d]) => `<button class="chip${s.daySpeed === id ? ' active' : ''}" data-d="${id}">${d.label}</button>`)
        .join('')}</div></div>
      <div class="field"><div class="field-title">Son</div>
        <label class="toggle"><input type="checkbox" id="set-music" ${g.audio.musicOn ? 'checked' : ''}/> Musique douce</label>
        <label class="toggle"><input type="checkbox" id="set-sfx" ${g.audio.sfxOn ? 'checked' : ''}/> Bruitages</label>
        <input type="range" class="range" id="set-volume" min="0" max="1" step="0.05" value="${s.volume}"/></div>
      <div class="field"><div class="field-title">Partie</div>
        <button class="btn" data-reset>${this.confirmReset ? '⚠️ Vraiment tout effacer ? Clique encore' : '🗑️ Recommencer une nouvelle partie'}</button></div>
    </div>`;
    this.el.querySelector('[data-close]').onclick = () => g.closePanels();
    this.el.querySelectorAll('[data-q]').forEach((b) => {
      b.onclick = () => {
        s.quality = b.dataset.q;
        g.applySettings();
        this.render();
      };
    });
    this.el.querySelectorAll('[data-d]').forEach((b) => {
      b.onclick = () => {
        s.daySpeed = b.dataset.d;
        g.applySettings();
        this.render();
      };
    });
    this.el.querySelector('#set-music').onchange = (e) => {
      if (e.target.checked !== g.audio.musicOn) g.toggleMusic();
    };
    this.el.querySelector('#set-sfx').onchange = (e) => {
      g.audio.sfxOn = e.target.checked;
      g.requestSave();
    };
    this.el.querySelector('#set-volume').oninput = (e) => {
      s.volume = parseFloat(e.target.value);
      g.applySettings();
    };
    this.el.querySelector('[data-reset]').onclick = () => {
      if (!this.confirmReset) {
        this.confirmReset = true;
        this.render();
        return;
      }
      g.resetGame();
    };
  }
}
