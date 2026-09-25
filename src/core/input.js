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
  current?.rebuild();
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
    this.drag = { active: false, dx: 0, dy: 0 };
    this.wheel = 0;
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
      if (!layoutMap && e.key && e.key.length === 1 && /[a-z]/i.test(e.key) && learned.get(e.code) !== e.key.toLowerCase()) {
        learned.set(e.code, e.key.toLowerCase());
        this.rebuild();
      }
      if (this.listening) {
        this.listening(e);
        return;
      }
      const code = logicalCode(e);
      if (!code) return;
      if (!this.keys.has(code)) this.pressed.add(code);
      this.keys.add(code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(code) || e.code === 'F3') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      const code = logicalCode(e);
      if (code) this.keys.delete(code);
    });
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('gamepadconnected', () => (this.pad.connected = true));
    window.addEventListener('gamepaddisconnected', () => (this.pad.connected = false));

    // Rotation caméra : glisser avec la souris (n'importe quel bouton) sur le canvas.
    let last = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      last = { x: e.clientX, y: e.clientY };
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
      this.drag.active = false;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener(
      'wheel',
      (e) => {
        this.wheel += Math.sign(e.deltaY);
        e.preventDefault();
      },
      { passive: false },
    );

    // Tactile : glisser sur la moitié droite de l'écran = caméra.
    const touches = new Map();
    canvas.addEventListener(
      'touchstart',
      (e) => {
        for (const t of e.changedTouches) touches.set(t.identifier, { x: t.clientX, y: t.clientY });
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
      for (const t of e.changedTouches) touches.delete(t.identifier);
    };
    canvas.addEventListener('touchend', tend, { passive: true });
    canvas.addEventListener('touchcancel', tend, { passive: true });
  }

  /** Applique les touches choisies par le joueur. */
  setBindings(keys = {}) {
    this.userKeys = { ...keys };
    this.rebuild();
  }

  rebuild() {
    const map = new Map();
    for (const a of ACTIONS) {
      const phys = bindingOf(a.id, this.userKeys);
      if (phys) map.set(phys, a.logical);
    }
    // Une touche par défaut réaffectée ailleurs ne déclenche plus son ancienne action.
    for (const a of ACTIONS) if (!map.has(a.logical)) map.set(a.logical, null);
    this.remap = map;
    this.keys.clear();
    this.onRebuild?.();
  }

  logical(code) {
    return this.remap.has(code) ? this.remap.get(code) : code;
  }

  /** Manette : sticks (déplacement, caméra) et boutons (traduits en touches). */
  pollGamepad(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = [...pads].find((p) => p && p.connected);
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
  }
}

function isTyping(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}
