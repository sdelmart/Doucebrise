import { SPECIES, FOODS } from '../animals/species.js';
import { OUTFIT_SLOTS, OUTFIT_ITEMS, PET_COLORS, outfitLocked, randomOutfit } from '../animals/outfits.js';
import { heartsString, escapeHtml } from './ui.js';
import { MAX_FOLLOWERS } from '../animals/manager.js';
import { petPortrait } from './petPortrait.js';

// Panneau « Mes animaux » : compagnons adoptés (avec leur garde-robe) et carnet des espèces.

const $ = (s) => document.querySelector(s);

export class PetsPanel {
  constructor(game) {
    this.game = game;
    this.tab = 'companions';
    this.body = $('#pets-body');
    this.dressing = null;
    this.slot = 'tete';
    document.querySelectorAll('[data-pets-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        this.endDress();
        this.tab = b.dataset.petsTab;
        document.querySelectorAll('[data-pets-tab]').forEach((x) => x.classList.toggle('active', x === b));
        this.render();
      });
    });
  }

  render() {
    if (this.dressing) this.renderDress();
    else if (this.tab === 'book') this.renderBook();
    else this.renderCompanions();
  }

  portrait(a, size = 96) {
    return petPortrait(this.game.renderer, a.species, a.variant, a.outfit, size);
  }

  renderCompanions() {
    const g = this.game;
    const list = g.animals.companions();
    const b = this.body;
    b.innerHTML = '';
    if (list.length === 0) {
      b.innerHTML = `<div class="empty-state"><div class="big">🐾</div>
        Tu n'as pas encore de compagnon.<br/>Les chats du <b>Café des Chats</b> attendent une famille : demande à Mimi !<br/><br/>
        Tu peux aussi apprivoiser les animaux : caresse-les avec <span class="key">E</span>, nourris-les avec <span class="key">F</span>
        et, quand leurs cœurs sont pleins, adopte-les avec <span class="key">R</span>.</div>`;
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
          <img class="pet-pic" alt="" src="${this.portrait(a)}" />
          <div style="flex:1">
            <input class="pet-name" maxlength="16" value="${escapeHtml(a.name)}" />
            <div class="pet-sub">${a.sp.emoji} ${a.sp.label} · ${escapeHtml(a.variantName)} · ${heartsString(a.trust)}</div>
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
      const dress = document.createElement('button');
      dress.className = 'btn primary';
      dress.textContent = '👗 Habiller';
      dress.onclick = () => this.dress(a);
      const follow = document.createElement('button');
      follow.className = 'btn';
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
      actions.append(dress, follow, call);
      card.appendChild(actions);
      b.appendChild(card);
    }
  }

  // --- Garde-robe ------------------------------------------------------------

  /** Habiller un compagnon : il vient poser devant toi, la caméra le cadre de près. */
  dress(a) {
    const g = this.game;
    if (this.dressing && this.dressing !== a) this.endDress();
    const p = g.player;
    // Écran étroit (téléphone en hauteur) : la caméra recule, sinon l'animal remplit tout.
    const wide = window.innerWidth > 720;
    this.camDist = window.innerWidth > window.innerHeight ? 1.7 : 2.7;
    const { spot, yaw } = this.poseSpot(a);
    a.teleport(spot.x, spot.z);
    a.rotY = Math.atan2(p.pos.x - a.pos.x, p.pos.z - a.pos.z);
    a.posing = { x: p.pos.x, z: p.pos.z };
    a.pet();
    this.dressing = a;
    // Coupe franche (en glissant, la caméra traverserait le personnage).
    g.cam.setPetView(a, this.camDist);
    g.cam.pet.yaw = yaw;
    g.cam.snap = true;
    // Panneau à droite sur grand écran ; en bas sur téléphone (l'animal remonte au-dessus).
    g.cam.setShift(wide ? 0.17 : 0, wide ? 0 : 0.28);
    g.input.enabled = false;
    // Habitants entre la caméra et l'animal : cachés le temps de l'essayage.
    this.hidden = [];
    const cam = this.camPoint(a.pos, a.rotY + yaw, a);
    for (const v of g.villagers.list) {
      if (v.root.visible && segDist(v.pos.x, v.pos.z, cam.x, cam.z, a.pos.x, a.pos.z) < 0.9) {
        v.screened = true;
        this.hidden.push(v);
      }
    }
    this.render();
  }

  camPoint(pos, ry, a) {
    const d = (this.camDist || 1.7) * Math.max(0.7, a.model.scale);
    return { x: pos.x + Math.sin(ry) * d, z: pos.z + Math.cos(ry) * d };
  }

  /**
   * Endroit dégagé autour de la joueuse où faire poser l'animal, et angle de la caméra :
   * ni mur, ni comptoir, ni habitant entre la caméra et lui (devant d'abord, puis autour).
   */
  poseSpot(a) {
    const g = this.game;
    const p = g.player.pos;
    const col = g.world.colliders;
    const free = (x, z, r) => {
      const q = col.resolve(x, z, r);
      return Math.hypot(q.x - x, q.z - z) < 0.01;
    };
    const clearLine = (x0, z0, x1, z1) => {
      for (let i = 1; i <= 6; i++) {
        const t = i / 7;
        if (!free(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, 0.18)) return false;
      }
      return !g.villagers.list.some((v) => segDist(v.pos.x, v.pos.z, x0, z0, x1, z1) < 0.7);
    };
    const base = g.player.rotY;
    for (const off of [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4, Math.PI]) {
      for (const d of [2.2, 1.6]) {
        const x = p.x + Math.sin(base + off) * d;
        const z = p.z + Math.cos(base + off) * d;
        if (!free(x, z, 0.45) || !a.canGo(x, z)) continue;
        const face = Math.atan2(p.x - x, p.z - z);
        for (const yaw of [0.45, -0.45, 0.9, -0.9]) {
          const c = this.camPoint({ x, z }, face + yaw, a);
          if (free(c.x, c.z, 0.3) && clearLine(c.x, c.z, x, z)) return { spot: { x, z }, yaw };
        }
      }
    }
    const x = p.x + Math.sin(base) * 2.2;
    const z = p.z + Math.cos(base) * 2.2;
    return { spot: col.resolve(x, z, 0.45), yaw: 0.45 };
  }

  endDress() {
    const a = this.dressing;
    if (!a) return;
    const g = this.game;
    for (const v of this.hidden || []) v.screened = false;
    this.hidden = [];
    a.posing = null;
    this.dressing = null;
    g.cam.setMode('follow');
    g.cam.snap = true;
    g.cam.setShift(0);
    g.input.enabled = true;
    g.requestSave();
  }

  setPiece(slot, piece) {
    const a = this.dressing;
    const outfit = { ...a.outfit };
    if (piece) outfit[slot] = piece;
    else delete outfit[slot];
    a.setOutfit(outfit);
    a.pet();
    this.game.audio.play('pet');
    this.game.emit('dressPet', { animal: a });
    this.render();
  }

  renderDress() {
    const g = this.game;
    const a = this.dressing;
    const b = this.body;
    const slots = OUTFIT_SLOTS.filter((s) => s.id !== 'yeux' || a.model.anchors.eyes);
    if (!slots.some((s) => s.id === this.slot)) this.slot = 'tete';
    b.innerHTML = `
      <div class="dress-head">
        <img class="pet-pic big" alt="" src="${this.portrait(a, 120)}" />
        <div style="flex:1"><b>${escapeHtml(a.name)}</b><div class="pet-sub">${escapeHtml(a.variantName)} · glisse sur l'image du jeu pour le faire tourner</div></div>
      </div>
      <nav class="tabs dress-slots"></nav>
      <div class="chips dress-items"></div>
      <div class="dress-colors"></div>
      <div class="pet-actions dress-actions"></div>`;
    const tabs = b.querySelector('.dress-slots');
    for (const s of slots) {
      const t = document.createElement('button');
      t.className = `tab${s.id === this.slot ? ' active' : ''}`;
      t.innerHTML = `${s.emoji} ${s.label}${a.outfit[s.id] ? ' <span class="dot">●</span>' : ''}`;
      t.onclick = () => {
        this.slot = s.id;
        this.render();
      };
      tabs.appendChild(t);
    }
    const slot = this.slot;
    const cur = a.outfit[slot];
    const items = b.querySelector('.dress-items');
    const none = document.createElement('button');
    none.className = `chip${cur ? '' : ' active'}`;
    none.textContent = '🚫 Rien';
    none.onclick = () => this.setPiece(slot, null);
    items.appendChild(none);
    for (const item of OUTFIT_ITEMS[slot]) {
      const locked = outfitLocked(slot, item.id, g.unlocks);
      const c = document.createElement('button');
      c.className = `chip${cur?.id === item.id ? ' active' : ''}${locked ? ' locked' : ''}`;
      c.innerHTML = `${locked ? '🔒' : item.emoji} ${item.label}${locked ? ` <small>${item.price} 🪙</small>` : ''}`;
      c.onclick = () => {
        if (locked) {
          g.ui.toast(`🔒 ${item.emoji} ${item.label} : en vente au Café des Chats, chez Mimi (rayon « Garde-robe des minous »).`, 3500);
          return;
        }
        this.setPiece(slot, { id: item.id, color: cur?.id === item.id ? cur.color : item.color });
      };
      items.appendChild(c);
    }
    const item = cur && OUTFIT_ITEMS[slot].find((x) => x.id === cur.id);
    const colors = b.querySelector('.dress-colors');
    if (item && !item.fixed) {
      colors.innerHTML = '<div class="field-title">Couleur</div>';
      const sw = document.createElement('div');
      sw.className = 'swatches';
      for (const col of PET_COLORS) {
        const s = document.createElement('button');
        s.className = `swatch${cur.color === col ? ' active' : ''}`;
        s.style.background = col;
        s.setAttribute('aria-label', col);
        s.onclick = () => this.setPiece(slot, { id: cur.id, color: col });
        sw.appendChild(s);
      }
      colors.appendChild(sw);
    } else if (item?.fixed) {
      colors.innerHTML = `<p class="note">${item.emoji} Couleurs d'origine.</p>`;
    }
    const actions = b.querySelector('.dress-actions');
    const surprise = document.createElement('button');
    surprise.className = 'btn';
    surprise.textContent = '🎲 Surprise !';
    surprise.onclick = () => {
      a.setOutfit(randomOutfit(Math.random, g.unlocks));
      a.pet();
      g.audio.play('pet');
      g.emit('dressPet', { animal: a });
      this.render();
    };
    const clear = document.createElement('button');
    clear.className = 'btn';
    clear.textContent = '🧺 Tout enlever';
    clear.onclick = () => {
      a.setOutfit({});
      this.render();
    };
    const done = document.createElement('button');
    done.className = 'btn primary';
    done.textContent = '✓ Terminé';
    done.onclick = () => {
      this.endDress();
      this.render();
    };
    actions.append(surprise, clear, done);
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

/** Distance d'un point (px, pz) au segment (x0, z0) → (x1, z1). */
function segDist(px, pz, x0, z0, x1, z1) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (pz - z0) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (x0 + dx * t), pz - (z0 + dz * t));
}
