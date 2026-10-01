import { OPTIONS, SKIN_TONES, HAIR_COLORS, EYE_COLORS, CLOTH_COLORS, randomAppearance } from '../player/appearance.js';
import { availableModels, modelLabel, modelIcon, resolveModel } from '../player/avatar.js';

// Panneau de personnalisation : onglets, puces d'options, nuanciers et curseurs.

const $ = (s) => document.querySelector(s);

// Couleurs qui repeignent aussi un aventurier (peau, cheveux, tenue).
const PAINT_KEYS = new Set(['skin', 'hairColor', 'topColor', 'topColor2', 'bottomColor', 'shoesColor', 'top', 'bottom']);

const TABS = [
  { id: 'style', label: 'Style' },
  { id: 'corps', label: 'Corps' },
  { id: 'visage', label: 'Visage' },
  { id: 'cheveux', label: 'Cheveux' },
  { id: 'tenue', label: 'Tenue' },
  { id: 'accessoires', label: 'Accessoires' },
  { id: 'tenues', label: '💾 Mes tenues' },
];
const MAX_LOOKS = 6;

export class Creator {
  constructor(game) {
    this.game = game;
    this.tab = availableModels().length ? 'style' : 'corps';
    this.a = null;
    this.tabsEl = $('#cr-tabs');
    this.body = $('#cr-body');
    this.nameInput = $('#cr-name');
    this.nameInput.addEventListener('input', () => {
      this.a.name = this.nameInput.value.slice(0, 16);
      this.commit(false);
    });
    this.nameInput.addEventListener('keydown', (e) => e.stopPropagation());
    $('#cr-random').addEventListener('click', () => {
      const name = this.a.name;
      // Aventurier : le hasard choisit aussi ses couleurs (sinon rien ne changerait).
      this.a = { ...randomAppearance(), name, model: this.a.model, modelColors: !!resolveModel(this.a) || this.a.modelColors };
      this.commit();
      this.render();
    });
    $('#cr-done').addEventListener('click', () => {
      // Un pseudo est obligatoire.
      if (!this.nameInput.value.trim()) {
        this.nameInput.classList.remove('shake');
        void this.nameInput.offsetWidth;
        this.nameInput.classList.add('shake');
        this.nameInput.focus();
        this.game.ui.toast('✏️ Choisis d\'abord ton pseudo !', 2500);
        return;
      }
      this.game.closePanels();
    });
    this.renderTabs();
  }

  open(appearance, isNew) {
    this.a = { ...appearance };
    this.nameInput.value = this.a.name;
    $('#cr-done').textContent = isNew ? "C'est parti !" : 'Terminé';
    this.render();
  }

  commit(rebuild = true) {
    this.game.setAppearance({ ...this.a }, rebuild);
  }

  set(key, value) {
    this.a[key] = value;
    this.paintModel(key);
    this.commit();
    this.render();
    this.game.audio.play('ui');
  }

  /** Aventurier : choisir une couleur de tenue passe aux couleurs « à mon goût ». */
  paintModel(key) {
    if (!PAINT_KEYS.has(key) || this.a.modelColors || !resolveModel(this.a)) return;
    this.a.modelColors = true;
    this.game.ui.toast('🎨 Ton aventurier prend tes couleurs ! (Style → « D\'origine » pour revenir)', 3200);
  }

  renderTabs() {
    this.tabsEl.innerHTML = '';
    for (const t of TABS) {
      if (t.id === 'style' && !availableModels().length) continue;
      const b = document.createElement('button');
      b.className = `tab${t.id === this.tab ? ' active' : ''}`;
      b.textContent = t.label;
      b.onclick = () => {
        this.tab = t.id;
        this.renderTabs();
        this.render();
      };
      this.tabsEl.appendChild(b);
    }
  }

  // --- Contrôles --------------------------------------------------------------

  chips(title, key, options, note = '') {
    const f = field(title, note);
    const wrap = document.createElement('div');
    wrap.className = 'chips';
    for (const o of options) {
      const b = document.createElement('button');
      const locked = this.game.isLocked(key, o.id);
      b.className = `chip${this.a[key] === o.id ? ' active' : ''}${locked ? ' locked' : ''}`;
      b.textContent = `${locked ? '🔒 ' : ''}${o.icon ? `${o.icon} ` : ''}${o.label}`;
      const where = { atelier: 'chez Hugo (Atelier du bois, Bourg-Sapin)', paillote: 'chez Paco (Paillote du lagon)', plongee: 'chez Coralie (Club de plongée, Port-Corail)' }[o.shop] || 'chez Lila (Couture)';
      b.title = locked ? (o.price ? `En vente ${where} : ${o.price} 🪙` : `Cadeau de ${o.reward}`) : '';
      b.onclick = () => {
        if (locked) {
          this.game.ui.toast(o.price ? `🔒 ${o.label} : en vente ${where} (${o.price} 🪙).` : `🔒 ${o.label} : un cadeau de ${o.reward}… Deviens son ami !`);
          return;
        }
        this.set(key, o.id);
      };
      wrap.appendChild(b);
    }
    f.appendChild(wrap);
    return f;
  }

  colors(title, key, palette, { allowSame = null } = {}) {
    const f = field(title);
    const wrap = document.createElement('div');
    wrap.className = 'swatches';
    if (allowSame) {
      const b = document.createElement('button');
      b.className = `chip${this.a[key] === this.a[allowSame] ? ' active' : ''}`;
      b.textContent = 'Comme la racine';
      b.onclick = () => this.set(key, this.a[allowSame]);
      wrap.appendChild(b);
    }
    for (const c of palette) {
      const b = document.createElement('button');
      b.className = `swatch${this.a[key].toLowerCase() === c.toLowerCase() ? ' active' : ''}`;
      b.style.background = c;
      b.title = c;
      b.onclick = () => this.set(key, c);
      wrap.appendChild(b);
    }
    // Couleur libre.
    const custom = document.createElement('label');
    custom.className = 'swatch swatch-custom';
    custom.title = 'Couleur personnalisée';
    const input = document.createElement('input');
    input.type = 'color';
    input.value = this.a[key];
    input.addEventListener('input', () => {
      this.a[key] = input.value;
      this.paintModel(key);
      this.commit();
    });
    input.addEventListener('change', () => this.render());
    custom.appendChild(input);
    wrap.appendChild(custom);
    f.appendChild(wrap);
    return f;
  }

  slider(title, key, min, max, labels) {
    const f = field(title);
    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'range';
    input.min = min;
    input.max = max;
    input.step = 0.01;
    input.value = this.a[key];
    input.addEventListener('input', () => {
      this.a[key] = parseFloat(input.value);
      this.commit();
    });
    f.appendChild(input);
    if (labels) {
      const l = document.createElement('div');
      l.className = 'note';
      l.style.display = 'flex';
      l.style.justifyContent = 'space-between';
      l.innerHTML = `<span>${labels[0]}</span><span>${labels[1]}</span>`;
      f.appendChild(l);
    }
    return f;
  }

  /** Tenues enregistrées : jusqu'à six looks, remis d'un clic. */
  looks() {
    const g = this.game;
    const list = g.looks;
    const f = field('Mes tenues', `Enregistre ton look (personnage, couleurs, accessoires) pour le remettre d'un clic. ${list.length}/${MAX_LOOKS}`);
    const save = document.createElement('button');
    save.className = 'btn primary small';
    save.id = 'cr-look-save';
    save.textContent = '💾 Enregistrer ma tenue actuelle';
    save.disabled = list.length >= MAX_LOOKS;
    save.onclick = () => {
      const { name, ...look } = this.a;
      void name;
      list.push({ name: `Tenue ${list.length + 1}`, look });
      g.dirty = true;
      g.audio.play('ui');
      g.ui.toast('💾 Tenue enregistrée !', 1800);
      this.render();
    };
    f.appendChild(save);
    const grid = document.createElement('div');
    grid.className = 'looks';
    list.forEach((entry, i) => {
      const l = { ...this.a, ...entry.look };
      const worn = sameLook(entry.look, this.a);
      const card = document.createElement('div');
      card.className = `look-card${worn ? ' worn' : ''}`;
      const dots = [l.modelColors || !resolveModel(l) ? l.topColor : null, l.modelColors || !resolveModel(l) ? l.bottomColor : null, l.hat !== 'aucun' ? l.hatColor : null, l.back !== 'aucun' ? l.backColor : null]
        .filter(Boolean).map((c) => `<span class="look-dot" style="background:${c}"></span>`).join('');
      card.innerHTML = `<input class="look-name" maxlength="18" aria-label="Nom de la tenue" />
        <div class="look-dots">${dots}</div><div class="look-sum"></div>`;
      const input = card.querySelector('input');
      input.value = entry.name;
      input.addEventListener('keydown', (e) => e.stopPropagation());
      input.addEventListener('input', () => {
        entry.name = input.value.slice(0, 18);
        g.dirty = true;
      });
      card.querySelector('.look-sum').textContent = lookSummary(l);
      const row = document.createElement('div');
      row.className = 'look-btns';
      const wear = document.createElement('button');
      wear.className = 'btn small';
      wear.textContent = worn ? '✓ Portée' : '👗 Porter';
      wear.onclick = () => {
        this.a = { ...this.a, ...entry.look, name: this.a.name };
        this.commit();
        this.render();
        g.audio.play('ui');
      };
      const del = document.createElement('button');
      del.className = 'btn small';
      del.textContent = '🗑️';
      del.title = 'Oublier cette tenue';
      del.onclick = () => {
        list.splice(i, 1);
        g.dirty = true;
        this.render();
      };
      row.append(wear, del);
      card.appendChild(row);
      grid.appendChild(card);
    });
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'note';
      empty.textContent = 'Aucune tenue pour l\'instant : habille-toi dans les autres onglets, puis enregistre ton look ici.';
      grid.appendChild(empty);
    }
    f.appendChild(grid);
    return f;
  }

  toggle(label, key) {
    const l = document.createElement('label');
    l.className = 'toggle';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!this.a[key];
    input.onchange = () => this.set(key, input.checked);
    l.append(input, document.createTextNode(label));
    return l;
  }

  render() {
    const b = this.body;
    b.innerHTML = '';
    const a = this.a;
    // Caméra : en pied pour choisir le personnage, plus près pour les détails du visage.
    this.game.cam.studio.dist = this.tab === 'style' ? 4.6 : 3.3;
    this.game.cam.studio.height = this.tab === 'style' ? 0.7 : 0.95;
    // Aventurier : ce qui s'applique à lui, onglet par onglet.
    const model = resolveModel(a);
    if (model && this.tab !== 'style') {
      const notes = {
        corps: 'La taille et la carrure s\'appliquent à ton aventurier, la peau aussi avec tes couleurs. La tête concerne le style Classique.',
        visage: 'Le visage de ton aventurier est peint sur le modèle : ces réglages habillent le style Classique.',
        cheveux: 'La couleur s\'applique à ton aventurier ; la coiffure, au style Classique.',
        tenue: 'Les couleurs habillent ton aventurier (robe, jupe et salopette changent aussi ses jambes). Les formes concernent le style Classique.',
        accessoires: 'Chapeaux, lunettes et accessoires de dos vont aussi à ton aventurier ! Un chapeau remplace sa coiffe, un accessoire de dos sa cape.',
      };
      const f = field(`${modelIcon(model)} ${modelLabel(model)}`, notes[this.tab] || '');
      if (!a.modelColors && ['corps', 'cheveux', 'tenue'].includes(this.tab)) {
        const btn = document.createElement('button');
        btn.className = 'btn small';
        btn.textContent = '🎨 Mettre mes couleurs';
        btn.onclick = () => this.set('modelColors', true);
        f.appendChild(btn);
      }
      b.append(f);
    }
    switch (this.tab) {
      case 'style': {
        const current = model || 'classique';
        const opts = [...availableModels().map((m) => ({ id: m.id, label: modelLabel(m.id), icon: modelIcon(m.id) })), { id: 'classique', label: 'Classique', icon: '🎨' }];
        const f = this.chips('Personnage', 'model', opts, 'Les aventuriers sont des modèles 3D animés, à tes couleurs et avec tes accessoires. Le style Classique se personnalise entièrement : visage, coiffure, formes des tenues.');
        f.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('active', opts[i].id === current));
        b.append(f);
        if (model) {
          const cf = this.chips('Couleurs', 'modelColors', [{ id: false, label: 'D\'origine', icon: '🛡️' }, { id: true, label: 'À mon goût', icon: '🎨' }], 'À ton goût : peau, cheveux, haut, bas et chaussures prennent les couleurs choisies dans les autres onglets.');
          b.append(cf);
          const g = field('Équipement d\'aventurier', 'Un chapeau ou un accessoire de dos (onglet Accessoires) le remplace.');
          const row = document.createElement('div');
          row.className = 'row2';
          row.append(this.toggle('Coiffe (chapeau, casque…)', 'gearHat'), this.toggle('Cape / carquois', 'gearCape'));
          g.appendChild(row);
          b.append(g);
        }
        break;
      }
      case 'corps':
        b.append(
          this.colors('Couleur de peau', 'skin', SKIN_TONES),
          this.slider('Taille', 'height', 0.88, 1.12, ['Petit·e', 'Grand·e']),
          this.slider('Carrure', 'build', 0.85, 1.2, ['Fine', 'Ronde']),
          this.slider('Tête', 'head', 0.9, 1.12, ['Petite', 'Grosse']),
        );
        break;
      case 'visage': {
        b.append(this.chips('Yeux', 'eyes', OPTIONS.eyes), this.colors('Couleur des yeux', 'eyeColor', EYE_COLORS));
        b.append(this.chips('Sourcils', 'brows', OPTIONS.brows), this.chips('Bouche', 'mouth', OPTIONS.mouth));
        const f = field('Détails');
        const row = document.createElement('div');
        row.className = 'row2';
        row.append(this.toggle('Cils', 'lashes'), this.toggle('Joues rosées', 'blush'), this.toggle('Taches de rousseur', 'freckles'));
        f.appendChild(row);
        b.append(f);
        break;
      }
      case 'cheveux':
        b.append(
          this.chips('Coiffure', 'hair', OPTIONS.hair),
          this.colors('Couleur', 'hairColor', HAIR_COLORS),
          this.colors('Pointes (dégradé)', 'hairTip', HAIR_COLORS, { allowSame: 'hairColor' }),
        );
        break;
      case 'tenue': {
        b.append(this.chips('Haut', 'top', OPTIONS.top));
        const main = a.top === 'salopette' ? 'Salopette' : a.top === 'veste' ? 'Veste' : 'Couleur principale';
        const second = a.top === 'salopette' || a.top === 'veste' ? 'Chemise' : a.top === 'kimono' ? 'Ceinture & col' : 'Couleur secondaire';
        b.append(this.colors(main, 'topColor', CLOTH_COLORS), this.colors(second, 'topColor2', CLOTH_COLORS), this.chips('Motif', 'pattern', OPTIONS.pattern));
        const covered = a.top === 'robe' || a.top === 'salopette';
        if (covered) {
          b.append(field('Bas', a.top === 'robe' ? 'La robe remplace le bas.' : 'La salopette inclut le pantalon.'));
        } else {
          b.append(this.chips('Bas', 'bottom', OPTIONS.bottom), this.colors('Couleur du bas', 'bottomColor', CLOTH_COLORS));
        }
        b.append(this.chips('Chaussures', 'shoes', OPTIONS.shoes), this.colors('Couleur des chaussures', 'shoesColor', CLOTH_COLORS));
        break;
      }
      case 'tenues':
        b.append(this.looks());
        break;
      case 'accessoires':
        b.append(this.chips('Chapeau', 'hat', OPTIONS.hat));
        if (a.hat !== 'aucun') b.append(this.colors('Couleur du chapeau', 'hatColor', CLOTH_COLORS));
        b.append(this.chips('Lunettes', 'glasses', OPTIONS.glasses));
        if (a.glasses !== 'aucune') b.append(this.colors('Couleur des lunettes', 'glassesColor', CLOTH_COLORS));
        b.append(this.chips('Dos', 'back', OPTIONS.back));
        if (a.back !== 'aucun') b.append(this.colors('Couleur', 'backColor', CLOTH_COLORS));
        break;
      default:
        break;
    }
  }
}

/** Même tenue (le pseudo mis à part), quel que soit l'ordre des champs. */
function sameLook(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.delete('name');
  for (const k of keys) if (a[k] !== b[k]) return false;
  return true;
}

const optLabel = (key, id) => OPTIONS[key].find((o) => o.id === id)?.label || '';

/** Résumé d'une tenue : personnage, haut, accessoires. */
function lookSummary(l) {
  const model = resolveModel(l);
  const bits = [model ? `${modelIcon(model)} ${modelLabel(model)}` : '🎨 Classique'];
  if (!model) bits.push(optLabel('top', l.top));
  if (l.hat !== 'aucun') bits.push(optLabel('hat', l.hat));
  if (l.glasses !== 'aucune') bits.push(optLabel('glasses', l.glasses));
  if (l.back !== 'aucun') bits.push(optLabel('back', l.back));
  return bits.filter(Boolean).join(' · ');
}

function field(title, note = '') {
  const f = document.createElement('div');
  f.className = 'field';
  const l = document.createElement('div');
  l.className = 'field-title';
  l.textContent = title;
  f.appendChild(l);
  if (note) {
    const n = document.createElement('div');
    n.className = 'note';
    n.textContent = note;
    f.appendChild(n);
  }
  return f;
}
