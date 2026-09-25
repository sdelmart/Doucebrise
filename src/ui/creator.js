import { OPTIONS, SKIN_TONES, HAIR_COLORS, EYE_COLORS, CLOTH_COLORS, randomAppearance } from '../player/appearance.js';

// Panneau de personnalisation : onglets, puces d'options, nuanciers et curseurs.

const $ = (s) => document.querySelector(s);

const TABS = [
  { id: 'corps', label: 'Corps' },
  { id: 'visage', label: 'Visage' },
  { id: 'cheveux', label: 'Cheveux' },
  { id: 'tenue', label: 'Tenue' },
  { id: 'accessoires', label: 'Accessoires' },
];

export class Creator {
  constructor(game) {
    this.game = game;
    this.tab = 'corps';
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
      this.a = { ...randomAppearance(), name };
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
    this.commit();
    this.render();
    this.game.audio.play('ui');
  }

  renderTabs() {
    this.tabsEl.innerHTML = '';
    for (const t of TABS) {
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
      b.title = locked ? (o.price ? `En vente chez Lila (Couture) : ${o.price} 🪙` : `Cadeau de ${o.reward}`) : '';
      b.onclick = () => {
        if (locked) {
          this.game.ui.toast(o.price ? `🔒 ${o.label} : en vente chez Lila, à la Couture (${o.price} 🪙).` : `🔒 ${o.label} : un cadeau de ${o.reward}… Deviens son ami !`);
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
    switch (this.tab) {
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
