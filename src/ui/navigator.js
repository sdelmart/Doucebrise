// Navigation dans les menus à la manette et aux flèches du clavier : la croix, le stick
// gauche ou les flèches déplacent la sélection d'un bouton à l'autre (au plus proche dans
// la direction choisie), A / Entrée valide, B / Échap revient, LB / RB changent d'onglet.

// Fenêtres, de la plus haute à la plus basse.
const LAYERS = ['#dialog', '#settings', '#credits', '#help', '#pause', '#chapter', '#letters', '#travel', '#vehicles', '#jobs', '#shop', '#adoption', '#cooking', '#snowman', '#dialogue', '#map', '#journal', '#bag', '#pets', '#creator', '#title'];
const FOCUSABLE = 'button:not(:disabled), input:not([type="hidden"]):not([hidden]), select, label.btn, [tabindex]:not([tabindex="-1"])';
const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

function visible(el) {
  if (!el || el.classList.contains('hidden')) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
}

export class UINavigator {
  constructor(game) {
    this.game = game;
    this.focused = null;
    this.layerEl = null;
    this.pad = [];
    this.stickT = 0;
    this.usingPad = false;
    window.addEventListener('keydown', (e) => this.onKey(e), true);
    window.addEventListener('mousemove', () => this.clearHighlight(), { passive: true });
  }

  /** Fenêtre au premier plan (ou null en pleine partie). */
  layer() {
    for (const sel of LAYERS) {
      const el = document.querySelector(sel);
      if (visible(el)) return el;
    }
    return null;
  }

  get active() {
    return !!this.layer();
  }

  items(layer) {
    return [...layer.querySelectorAll(FOCUSABLE)].filter((el) => {
      if (el.closest('.hidden')) return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    });
  }

  onKey(e) {
    if (!DIRS[e.code]) return;
    const layer = this.layer();
    if (!layer) return;
    const t = e.target;
    // Les curseurs et les champs de texte gardent leurs flèches.
    if (t && (t.tagName === 'INPUT' && t.type !== 'checkbox') && (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || t.type === 'text')) return;
    if (t && t.tagName === 'SELECT') return;
    e.preventDefault();
    e.stopPropagation();
    this.move(...DIRS[e.code]);
  }

  /** Déplace la sélection vers le bouton le plus proche dans une direction. */
  move(dx, dy) {
    const layer = this.layer();
    if (!layer) return;
    const list = this.items(layer);
    if (!list.length) return;
    const cur = list.includes(this.focused) ? this.focused : list.includes(document.activeElement) ? document.activeElement : null;
    if (!cur) {
      this.focus(layer.querySelector('.primary:not(:disabled)') && list.includes(layer.querySelector('.primary:not(:disabled)')) ? layer.querySelector('.primary:not(:disabled)') : list[0]);
      return;
    }
    const a = cur.getBoundingClientRect();
    const ax = a.left + a.width / 2;
    const ay = a.top + a.height / 2;
    let best = null;
    let bestScore = Infinity;
    for (const el of list) {
      if (el === cur) continue;
      const b = el.getBoundingClientRect();
      const bx = b.left + b.width / 2;
      const by = b.top + b.height / 2;
      const along = (bx - ax) * dx + (by - ay) * dy;
      if (along <= 4) continue;
      const across = Math.abs((bx - ax) * dy) + Math.abs((by - ay) * dx);
      const score = along + across * 2.2;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    if (best) this.focus(best);
  }

  focus(el) {
    this.clearHighlight();
    this.focused = el;
    el.focus({ preventScroll: true });
    el.classList.add('nav-focus');
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    this.game.audio.play('hover');
  }

  clearHighlight() {
    if (this.focused) this.focused.classList.remove('nav-focus');
  }

  activate() {
    const layer = this.layer();
    if (!layer) return;
    const el = this.focused && layer.contains(this.focused) && visible(this.focused) ? this.focused : null;
    if (!el) {
      this.move(0, 1);
      return;
    }
    if (el.tagName === 'INPUT' && el.type === 'checkbox') {
      el.click();
      return;
    }
    if (el.tagName === 'INPUT' && el.type === 'range') return;
    el.click();
    // Le contenu a pu être redessiné : on garde une sélection valable.
    setTimeout(() => {
      if (!this.focused || !document.contains(this.focused) || !visible(this.focused)) {
        this.focused = null;
        if (this.usingPad) this.move(0, 1);
      }
    }, 60);
  }

  back() {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape', key: 'Escape', bubbles: true }));
  }

  /** Onglet précédent / suivant de la fenêtre. */
  tab(dir) {
    const layer = this.layer();
    if (!layer) return;
    const tabs = [...layer.querySelectorAll('.tab, .stab')].filter(visible);
    if (!tabs.length) return;
    const i = tabs.findIndex((t) => t.classList.contains('active'));
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    next.click();
    this.focused = null;
  }

  /** Curseur (volume, résolution…) : gauche / droite à la manette. */
  nudge(dir) {
    const el = this.focused;
    if (!el || el.tagName !== 'INPUT' || el.type !== 'range') return false;
    const step = parseFloat(el.step) || 1;
    el.value = String(Math.min(parseFloat(el.max), Math.max(parseFloat(el.min), parseFloat(el.value) + step * dir)));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  /**
   * Manette : appelé à chaque image. Renvoie true si la manette pilote un menu
   * (les boutons ne doivent alors pas agir sur le personnage).
   */
  update(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = [...pads].find((p) => p && p.connected);
    const layer = this.layer();
    if (layer !== this.layerEl) {
      this.layerEl = layer;
      this.clearHighlight();
      this.focused = null;
      if (layer && this.usingPad) setTimeout(() => this.layer() === layer && this.move(0, 1), 80);
    }
    if (!gp) return false;
    const pressed = (i) => !!gp.buttons[i]?.pressed;
    const edge = (i) => pressed(i) && !this.pad[i];
    let used = false;
    if (layer) {
      const ax = gp.axes[0] || 0;
      const ay = gp.axes[1] || 0;
      let dx = edge(15) ? 1 : edge(14) ? -1 : 0;
      let dy = edge(13) ? 1 : edge(12) ? -1 : 0;
      this.stickT -= dt;
      if (!dx && !dy && (Math.abs(ax) > 0.55 || Math.abs(ay) > 0.55) && this.stickT <= 0) {
        this.stickT = 0.22;
        if (Math.abs(ax) > Math.abs(ay)) dx = Math.sign(ax);
        else dy = Math.sign(ay);
      }
      if (Math.abs(ax) < 0.3 && Math.abs(ay) < 0.3) this.stickT = 0;
      if (dx || dy) {
        this.usingPad = true;
        if (!(dx && this.nudge(dx))) this.move(dx, dy);
      }
      if (edge(0)) {
        this.usingPad = true;
        this.activate();
      }
      if (edge(1) || edge(9)) this.back();
      if (edge(4)) this.tab(-1);
      if (edge(5)) this.tab(1);
      used = true;
    }
    gp.buttons.forEach((b, i) => {
      this.pad[i] = b.pressed;
    });
    return used;
  }
}
