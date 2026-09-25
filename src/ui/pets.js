import { SPECIES, FOODS, PET_ACCESSORIES, PET_COLORS } from '../animals/species.js';
import { heartsString, escapeHtml } from './ui.js';
import { MAX_FOLLOWERS } from '../animals/manager.js';

// Panneau « Mes animaux » : compagnons adoptés et carnet des espèces.

const $ = (s) => document.querySelector(s);

export class PetsPanel {
  constructor(game) {
    this.game = game;
    this.tab = 'companions';
    this.body = $('#pets-body');
    document.querySelectorAll('[data-pets-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        this.tab = b.dataset.petsTab;
        document.querySelectorAll('[data-pets-tab]').forEach((x) => x.classList.toggle('active', x === b));
        this.render();
      });
    });
  }

  render() {
    if (this.tab === 'book') this.renderBook();
    else this.renderCompanions();
  }

  renderCompanions() {
    const g = this.game;
    const list = g.animals.companions();
    const b = this.body;
    b.innerHTML = '';
    if (list.length === 0) {
      b.innerHTML = `<div class="empty-state"><div class="big">🐾</div>
        Tu n'as pas encore de compagnon.<br/>Caresse les animaux avec <span class="key">E</span>, nourris-les avec <span class="key">F</span>
        et, quand leurs cœurs sont pleins, adopte-les avec <span class="key">R</span> !</div>`;
      return;
    }
    const followers = g.animals.followers().length;
    const info = document.createElement('p');
    info.className = 'note';
    info.style.fontWeight = '700';
    info.textContent = `${followers}/${MAX_FOLLOWERS} compagnons te suivent. Les autres t'attendent au jardin.`;
    b.appendChild(info);
    for (const a of list) {
      const card = document.createElement('div');
      card.className = 'pet-card';
      card.innerHTML = `
        <div class="pet-top">
          <div class="pet-em">${a.sp.emoji}</div>
          <div style="flex:1">
            <input class="pet-name" maxlength="16" value="${escapeHtml(a.name)}" />
            <div class="pet-sub">${a.sp.label} · ${escapeHtml(a.variantName)} · ${heartsString(a.trust)}</div>
          </div>
        </div>`;
      const nameInput = card.querySelector('.pet-name');
      nameInput.addEventListener('keydown', (e) => e.stopPropagation());
      nameInput.addEventListener('change', () => {
        a.name = nameInput.value.trim() || a.sp.label;
        g.ui.refreshFollowers();
        g.requestSave();
      });

      const actions = document.createElement('div');
      actions.className = 'pet-actions';
      const follow = document.createElement('button');
      follow.className = `btn${a.follow ? '' : ' primary'}`;
      follow.textContent = a.follow ? '🏡 Au jardin' : '🐾 Me suivre';
      follow.onclick = () => {
        if (g.animals.toggleFollow(a)) {
          g.ui.refreshFollowers();
          this.render();
        }
      };
      const call = document.createElement('button');
      call.className = 'btn';
      call.textContent = '📣 Appeler';
      call.onclick = () => {
        const p = g.player;
        const back = p.rotY + Math.PI;
        a.teleport(p.pos.x + Math.sin(back) * 1.5, p.pos.z + Math.cos(back) * 1.5);
        a.pet();
        g.particles.emit('heart', a.headPosition(), { count: 2 });
        g.ui.toast(`${a.sp.emoji} ${a.name} accourt vers toi !`);
      };
      actions.append(follow, call);
      card.appendChild(actions);

      const accTitle = document.createElement('div');
      accTitle.className = 'field-title';
      accTitle.style.marginTop = '10px';
      accTitle.textContent = 'Accessoire';
      const chips = document.createElement('div');
      chips.className = 'chips';
      for (const acc of PET_ACCESSORIES) {
        const c = document.createElement('button');
        c.className = `chip${a.accessory === acc.id ? ' active' : ''}`;
        c.textContent = acc.label;
        c.onclick = () => {
          a.setAccessory(acc.id, a.accessoryColor);
          g.requestSave();
          this.render();
        };
        chips.appendChild(c);
      }
      card.append(accTitle, chips);
      if (a.accessory !== 'aucun') {
        const sw = document.createElement('div');
        sw.className = 'swatches';
        sw.style.marginTop = '8px';
        for (const col of PET_COLORS) {
          const s = document.createElement('button');
          s.className = `swatch${a.accessoryColor === col ? ' active' : ''}`;
          s.style.background = col;
          s.onclick = () => {
            a.setAccessory(a.accessory, col);
            g.requestSave();
            this.render();
          };
          sw.appendChild(s);
        }
        card.appendChild(sw);
      }
      b.appendChild(card);
    }
  }

  renderBook() {
    const g = this.game;
    const b = this.body;
    const disc = g.animals.discovered;
    const total = Object.values(SPECIES).reduce((s, sp) => s + sp.variants.length, 0);
    const found = Object.values(disc).reduce((s, d) => s + d.variants.length, 0);
    b.innerHTML = `<p class="note" style="font-weight:800">Pelages découverts : ${found} / ${total} — caresse ou nourris un animal pour l'ajouter.</p>`;
    const grid = document.createElement('div');
    grid.className = 'book';
    for (const [id, sp] of Object.entries(SPECIES)) {
      const d = disc[id];
      const card = document.createElement('div');
      card.className = `book-card${d ? '' : ' unknown'}`;
      const fav = d?.fav ? `${FOODS[sp.fav].emoji} ${FOODS[sp.fav].label}` : '❔ à découvrir';
      const adopted = g.animals.companions().filter((a) => a.species === id).length;
      card.innerHTML = `
        <div class="b-em">${sp.emoji}</div>
        <div class="b-title">${d ? sp.label : '???'}</div>
        <div class="b-line">Plat préféré : ${fav}</div>
        <div class="b-line">${d ? sp.desc : 'Pas encore rencontré.'}</div>
        ${adopted ? `<div class="b-line">💗 Adopté·s : ${adopted}</div>` : ''}
        <div class="variant-dots">${sp.variants
          .map((v, i) => (d?.variants.includes(i) ? `<span class="found">${escapeHtml(v.name)}</span>` : '<span>?</span>'))
          .join('')}</div>`;
      grid.appendChild(card);
    }
    b.appendChild(grid);
  }
}
