import { ITEMS, CATEGORIES } from '../game/items.js';
import { escapeHtml } from './ui.js';

// Boutiques : achat (catalogue fourni par le jeu) et vente au marché.

export class Shop {
  constructor(game) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.id = 'shop';
    this.el.className = 'modal hidden';
    this.el.innerHTML = `<div class="modal-card shop-card">
      <button class="close" data-shop-close>✕</button>
      <h2 id="shop-title"></h2>
      <p id="shop-greet" class="note"></p>
      <div class="shop-bar"><nav class="tabs" id="shop-tabs"></nav><div class="coins" id="shop-coins"></div></div>
      <div id="shop-body" class="shop-grid"></div>
    </div>`;
    document.body.appendChild(this.el);
    this.el.querySelector('[data-shop-close]').onclick = () => this.close();
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Escape') this.close();
    });
    this.isOpen = false;
  }

  open(shopId, villager) {
    const g = this.game;
    this.shopId = shopId;
    this.villager = villager;
    this.isOpen = true;
    g.input.enabled = false;
    const names = {
      graines: 'Graines de Mamie Rose', marche: 'Marché de Pomme', menuiserie: 'Menuiserie de Bruno', couture: 'Couture de Lila', cafe: 'Café des Chats de Mimi', garage: 'Garage de Léo',
      patisserie: 'Pâtisserie d\'Élise', atelier: 'Atelier de Hugo', capitainerie: 'Capitainerie de Nérée', galerie: 'Galerie de Maëlys', plongee: 'Club de plongée de Coralie', paillote: 'La Paillote de Paco',
    };
    this.el.querySelector('#shop-title').textContent = names[shopId] || 'Boutique';
    this.el.querySelector('#shop-greet').textContent = villager ? `${villager.def.emoji} « ${villager.def.lines.shop} »` : '';
    this.tabs = g.shopTabs(shopId);
    this.discount = g.calendar.discountFor(shopId);
    if (this.discount < 1) this.el.querySelector('#shop-greet').textContent += ` 🎉 ${g.calendar.festival.label} : -${Math.round((1 - this.discount) * 100)} % sur tout !`;
    if (!this.tabs.some((t) => t.id === this.tab)) this.tab = this.tabs[0].id;
    this.el.classList.remove('hidden');
    this.render();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.add('hidden');
    this.game.input.enabled = true;
    this.game.requestSave();
  }

  render() {
    const g = this.game;
    const tabs = this.el.querySelector('#shop-tabs');
    tabs.innerHTML = '';
    for (const t of this.tabs) {
      const b = document.createElement('button');
      b.className = `tab${t.id === this.tab ? ' active' : ''}`;
      b.textContent = t.label;
      b.onclick = () => {
        this.tab = t.id;
        this.render();
      };
      tabs.appendChild(b);
    }
    this.el.querySelector('#shop-coins').textContent = `🪙 ${g.coins}`;
    const body = this.el.querySelector('#shop-body');
    body.innerHTML = '';
    if (this.tab === 'vendre') {
      this.renderSell(body);
      return;
    }
    const entries = this.tabs.find((t) => t.id === this.tab).items();
    if (!entries.length) body.innerHTML = '<p class="empty-state">Rien à vendre pour le moment.</p>';
    for (const e of entries) {
      const card = document.createElement('div');
      card.className = `shop-item${e.owned ? ' owned' : ''}`;
      card.innerHTML = `<div class="si-icon" style="${e.color ? `background:${e.color}` : ''}">${e.emoji}</div>
        <div class="si-name">${escapeHtml(e.label)}</div>
        ${e.desc ? `<div class="si-desc">${escapeHtml(e.desc)}</div>` : ''}
        <div class="si-price">${e.owned ? e.ownedLabel || 'Acquis ✓' : `🪙 ${Math.round(e.price * this.discount)}${this.discount < 1 ? ` <s class="old-price">${e.price}</s>` : ''}`}</div>`;
      if (e.locked) {
        card.classList.add('owned');
        const note = document.createElement('div');
        note.className = 'si-desc';
        note.textContent = e.locked;
        card.appendChild(note);
        body.appendChild(card);
        continue;
      }
      const btn = document.createElement('button');
      btn.className = 'btn small primary';
      btn.textContent = e.owned && !e.repeatable ? 'Acquis' : 'Acheter';
      const price = Math.round(e.price * this.discount);
      btn.disabled = (e.owned && !e.repeatable) || g.coins < price;
      btn.onclick = () => {
        if (g.coins < price) return;
        g.coins -= price;
        e.buy();
        g.audio.play('pick');
        g.emit('buy', { id: e.id, shop: this.shopId });
        g.ui.refreshInventory();
        g.ui.refreshCoins();
        g.ui.toast(`🛍️ ${e.label} acheté !`, 1800);
        this.render();
      };
      card.appendChild(btn);
      body.appendChild(card);
    }
  }

  renderSell(body) {
    const g = this.game;
    const owned = Object.keys(ITEMS).filter((id) => g.inventory[id] > 0);
    if (!owned.length) {
      body.innerHTML = '<p class="empty-state">Ton sac est vide. Reviens avec des récoltes, des poissons ou des plats !</p>';
      return;
    }
    for (const cat of CATEGORIES) {
      if (cat.id === 'quest') continue;
      const ids = owned.filter((id) => ITEMS[id].cat === cat.id);
      if (!ids.length) continue;
      const h = document.createElement('div');
      h.className = 'shop-cat';
      h.textContent = cat.label;
      body.appendChild(h);
      for (const id of ids) {
        const it = ITEMS[id];
        const n = g.inventory[id];
        const price = g.calendar.sellPrice(id);
        const card = document.createElement('div');
        card.className = 'shop-item';
        card.innerHTML = `<div class="si-icon">${it.emoji}</div><div class="si-name">${escapeHtml(it.label)} ×${n}</div><div class="si-price">🪙 ${price} / pièce${price > it.price ? ' 🎉' : ''}</div>`;
        const row = document.createElement('div');
        row.className = 'si-row';
        const sell = (count) => {
          g.inventory[id] -= count;
          g.addCoins(price * count);
          g.audio.play('pick');
          g.emit('sell', { id, count, total: price * count });
          g.ui.refreshInventory();
          this.render();
        };
        const one = document.createElement('button');
        one.className = 'btn small';
        one.textContent = 'Vendre 1';
        one.onclick = () => sell(1);
        const all = document.createElement('button');
        all.className = 'btn small primary';
        all.textContent = `Tout (${price * n})`;
        all.onclick = () => sell(n);
        row.append(one, all);
        card.appendChild(row);
        body.appendChild(card);
      }
    }
  }
}
