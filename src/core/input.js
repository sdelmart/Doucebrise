// Entrées clavier / souris / tactile. `event.code` suit la position physique des
// touches : ZQSD sur AZERTY et WASD sur QWERTY fonctionnent tous les deux.

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

    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

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
    const d = { dx: this.drag.dx, dy: this.drag.dy };
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
