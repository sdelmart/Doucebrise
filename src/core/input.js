import { ACTIONS } from './settings.js';

// Entrées clavier / souris / tactile / manette. `event.code` suit la position physique
// des touches : ZQSD sur AZERTY et WASD sur QWERTY fonctionnent tous les deux.
// Les touches sont réassignables : chaque touche physique est traduite vers le code
// « logique » (QWERTY) de l'action qu'elle déclenche.

// Disposition du clavier : code physique → caractère affiché.
let layoutMap = null;
const learned = new Map();
let current = null;

export async function initKeyboardLayout() {
  try {
    if (navigator.keyboard?.getLayoutMap) layoutMap = await navigator.keyboard.getLayoutMap();
  } catch {
    layoutMap = null;
  }
  current?.rebuild(true);
}

const NAMES = {
  Space: 'Espace', ShiftLeft: 'Maj', ShiftRight: 'Maj D', ControlLeft: 'Ctrl', ControlRight: 'Ctrl D', AltLeft: 'Alt', AltRight: 'Alt Gr',
  Escape: 'Échap', Enter: 'Entrée', Tab: 'Tab', Backspace: '⌫', CapsLock: 'Verr. Maj', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  MetaLeft: 'Cmd', MetaRight: 'Cmd',
};

/** Nom lisible d'une touche physique, selon la disposition du clavier. */
export function keyLabel(code) {
  if (!code) return '—';
  if (NAMES[code]) return NAMES[code];
  const ch = layoutMap?.get(code) || learned.get(code);
  if (ch && ch.trim()) return ch.toUpperCase();
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad/.test(code)) return `Pavé ${code.slice(6)}`;
  return code;
}

/** Touche physique qui produit cette lettre sur le clavier du joueur. */
function codeForLetter(letter) {
  if (layoutMap) for (const [code, ch] of layoutMap) if (ch === letter) return code;
  for (const [code, ch] of learned) if (ch === letter) return code;
  return null;
}

/** Touche associée à une action (réglages du joueur, sinon défaut adapté au clavier). */
export function bindingOf(actionId, keys = current?.userKeys || {}) {
  if (keys[actionId]) return keys[actionId];
  const a = ACTIONS.find((x) => x.id === actionId);
  if (!a) return null;
  return (a.letter && codeForLetter(a.letter)) || a.logical;
}

/** Libellé de la touche d'une action (pour le HUD et l'aide). */
export function actionKey(actionId) {
  return keyLabel(bindingOf(actionId));
}

/** Code logique d'un événement clavier (null si la touche est désactivée). */
export function logicalCode(e) {
  if (e.padLogical || !current) return e.code;
  return current.logical(e.code);
}

const PAD_BUTTONS = { 0: 'KeyE', 1: 'Escape', 2: 'KeyF', 3: 'Space', 4: 'KeyM', 5: 'KeyJ', 8: 'KeyI', 9: 'Escape', 12: 'Digit1', 13: 'Digit3', 14: 'Digit2', 15: 'Digit5' };

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // touches enfoncées pendant cette frame
    // Touche physique enfoncée → code logique donné à l'appui : le relâchement retire
    // exactement ce code, même si la correspondance a changé entre-temps.
    this.held = new Map();
    this.drag = { active: false, dx: 0, dy: 0 };
    this.wheel = 0;
    this.click = null; // clic ou toucher bref, sans glisser (pour désigner un animal, un habitant)
    this.enabled = true;
    this.joystick = { x: 0, y: 0, active: false };
    this.touchButtons = new Set();
    this.isTouch = window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.sensitivity = 1;
    this.invertY = false;
    this.userKeys = {};
    this.remap = new Map();
    this.pad = { buttons: [], connected: false };
    current = this;

    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      // Apprend la disposition du clavier (quand le navigateur ne la fournit pas).
      // Les touches déjà maintenues le restent (avant, avancer puis appuyer pour la première
      // fois sur une autre lettre « relâchait » la marche).
      if (!layoutMap && e.key && e.key.length === 1 && /[a-z]/i.test(e.key) && learned.get(e.code) !== e.key.toLowerCase()) {
        learned.set(e.code, e.key.toLowerCase());
        this.rebuild(true);
      }
      if (this.listening) {
        this.listening(e);
        return;
      }
      const code = logicalCode(e);
      if (!code) return;
      if (!this.keys.has(code)) this.pressed.add(code);
      this.keys.add(code);
      this.held.set(physKey(e), code);
      // (Un curseur, une case ou une liste sélectionnés gardent Espace et les flèches.)
      const control = ['INPUT', 'SELECT'].includes(e.target?.tagName);
      if (!control && (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(code) || e.code === 'F3')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      const phys = physKey(e);
      const code = this.held.has(phys) ? this.held.get(phys) : logicalCode(e);
      this.held.delete(phys);
      // Une autre touche physique donne la même action et reste enfoncée : on garde l'action.
      if (code && ![...this.held.values()].includes(code)) this.keys.delete(code);
    });
    const release = () => {
      this.keys.clear();
      this.held.clear();
    };
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', () => document.hidden && release());
    window.addEventListener('gamepadconnected', () => (this.pad.connected = true));
    window.addEventListener('gamepaddisconnected', () => (this.pad.connected = false));

    // Rotation caméra : glisser avec la souris (n'importe quel bouton) sur le canvas.
    let last = null;
    let down = null;
    const tapped = (x, y, start, slop) => {
      if (start && Math.hypot(x - start.x, y - start.y) < slop && performance.now() - start.t < 450) this.click = { x, y };
    };
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      last = { x: e.clientX, y: e.clientY };
      down = e.button === 0 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
      this.drag.active = true;
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!last || e.pointerType === 'touch') return;
      this.drag.dx += e.clientX - last.x;
      this.drag.dy += e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
    });
    const end = () => {
      last = null;
      down = null;
      this.drag.active = false;
    };
    canvas.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'touch') tapped(e.clientX, e.clientY, down, 6);
      end();
    });
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // Molette : un cran = un pas de zoom. Pavé tactile : le défilement à deux doigts arrive
    // par petits bouts (des dizaines d'événements par geste) ; il est pris en proportion, sinon
    // le zoom sautait d'un bout à l'autre. Deux doigts vers le haut / le bas (ou pincer) :
    // zoom ; deux doigts sur le côté : tourner la caméra.
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1;
        const dx = e.deltaX * unit;
        const dy = e.deltaY * unit * (e.ctrlKey ? 4 : 1);
        if (!e.ctrlKey && Math.abs(dx) > Math.abs(dy)) this.drag.dx += dx * 0.6;
        else this.wheel += Math.max(-1, Math.min(1, dy / 100));
      },
      { passive: false },
    );

    // Tactile : glisser sur la moitié droite de l'écran = caméra.
    const touches = new Map();
    canvas.addEventListener(
      'touchstart',
      (e) => {
        for (const t of e.changedTouches) touches.set(t.identifier, { x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, t: performance.now() });
      },
      { passive: true },
    );
    canvas.addEventListener(
      'touchmove',
      (e) => {
        for (const t of e.changedTouches) {
          const p = touches.get(t.identifier);
          if (!p) continue;
          this.drag.dx += (t.clientX - p.x) * 1.2;
          this.drag.dy += (t.clientY - p.y) * 1.2;
          p.x = t.clientX;
          p.y = t.clientY;
        }
      },
      { passive: true },
    );
    const tend = (e) => {
      for (const t of e.changedTouches) {
        const p = touches.get(t.identifier);
        if (p && e.type === 'touchend') tapped(t.clientX, t.clientY, { x: p.sx, y: p.sy, t: p.t }, 12);
        touches.delete(t.identifier);
      }
    };
    canvas.addEventListener('touchend', tend, { passive: true });
    canvas.addEventListener('touchcancel', tend, { passive: true });
  }

  /** Applique les touches choisies par le joueur. */
  setBindings(keys = {}) {
    this.userKeys = { ...keys };
    this.rebuild();
  }

  /** Recalcule la correspondance touches → actions (keep : garder les touches maintenues). */
  rebuild(keep = false) {
    const map = new Map();
    for (const a of ACTIONS) {
      const phys = bindingOf(a.id, this.userKeys);
      if (phys) map.set(phys, a.logical);
    }
    // Une touche par défaut réaffectée ailleurs ne déclenche plus son ancienne action.
    for (const a of ACTIONS) if (!map.has(a.logical)) map.set(a.logical, null);
    this.remap = map;
    if (!keep) {
      this.keys.clear();
      this.held.clear();
    }
    this.onRebuild?.();
  }

  logical(code) {
    return this.remap.has(code) ? this.remap.get(code) : code;
  }

  /** Manette : sticks (déplacement, caméra) et boutons (traduits en touches). */
  pollGamepad(dt, uiMode = false) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = [...pads].find((p) => p && p.connected);
    if (gp && uiMode) {
      // Un menu est ouvert : la manette le pilote (voir UINavigator), pas le personnage.
      gp.buttons.forEach((b, i) => {
        this.pad.buttons[i] = b.pressed;
      });
      if (this.pad.stick) {
        this.pad.stick = false;
        this.joystick.active = false;
        this.joystick.x = 0;
        this.joystick.y = 0;
      }
      return;
    }
    if (!gp) {
      if (this.pad.stick) {
        this.pad.stick = false;
        this.joystick.active = false;
        this.joystick.x = 0;
        this.joystick.y = 0;
      }
      return;
    }
    const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
    const lx = dz(gp.axes[0] || 0);
    const ly = dz(gp.axes[1] || 0);
    if (lx || ly || this.pad.stick) {
      this.pad.stick = !!(lx || ly);
      this.joystick.active = this.pad.stick;
      this.joystick.x = lx;
      this.joystick.y = -ly;
    }
    const rx = dz(gp.axes[2] || 0);
    const ry = dz(gp.axes[3] || 0);
    this.drag.dx += rx * 900 * dt;
    this.drag.dy += ry * 600 * dt;
    const run = (gp.buttons[6]?.value || 0) > 0.4 || (gp.buttons[10]?.pressed ?? false);
    if (run) this.keys.add('ShiftLeft');
    else if (this.pad.run) this.keys.delete('ShiftLeft');
    this.pad.run = run;
    const trig = gp.buttons[7]?.value || 0;
    if (trig > 0.3) this.wheel += dt * 6;
    gp.buttons.forEach((b, i) => {
      const code = PAD_BUTTONS[i];
      const was = this.pad.buttons[i];
      if (!code || b.pressed === was) return;
      this.pad.buttons[i] = b.pressed;
      const ev = new KeyboardEvent(b.pressed ? 'keydown' : 'keyup', { code, key: code === 'Escape' ? 'Escape' : '', bubbles: true });
      ev.padLogical = true;
      window.dispatchEvent(ev);
    });
  }

  down(...codes) {
    if (!this.enabled) return false;
    return codes.some((c) => this.keys.has(c) || this.touchButtons.has(c));
  }

  hit(...codes) {
    if (!this.enabled) return false;
    return codes.some((c) => this.pressed.has(c));
  }

  /** Vecteur de déplacement (x = droite, y = avant), longueur ≤ 1. */
  moveVector() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.joystick.active) {
      x += this.joystick.x;
      y += this.joystick.y;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  consumeDrag() {
    const k = this.sensitivity;
    const d = { dx: this.drag.dx * k, dy: this.drag.dy * k * (this.invertY ? -1 : 1) };
    this.drag.dx = 0;
    this.drag.dy = 0;
    return d;
  }

  consumeWheel() {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  /** Simule un appui (boutons tactiles). */
  tap(code) {
    this.pressed.add(code);
  }

  endFrame() {
    this.pressed.clear();
    this.click = null;
  }
}

// Champs où l'on tape du texte : leurs touches ne vont pas au jeu. Les curseurs, cases à
// cocher et listes des paramètres, eux, ne bloquent plus le jeu (avant, après avoir touché
// un réglage, plus aucune touche ne répondait, pas même Échap).
const TEXT_INPUTS = new Set(['text', 'search', 'email', 'password', 'number', 'tel', 'url']);

export function isTyping(e) {
  const t = e.target;
  if (!t) return false;
  if (t.tagName === 'TEXTAREA' || t.isContentEditable) return true;
  return t.tagName === 'INPUT' && TEXT_INPUTS.has(t.type);
}

/** Identifiant de la touche physique (les boutons de manette ont le leur). */
function physKey(e) {
  return e.padLogical ? `pad:${e.code}` : e.code;
}
