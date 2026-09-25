import * as THREE from 'three';

// Visage dessiné sur un canvas, plaqué sur une calotte sphérique devant la tête.
// Le canvas couvre ±60° autour de l'avant et θ ∈ [0.36π, 0.80π] depuis le sommet,
// avec des pixels « carrés » sur la sphère (512 × 340).

export const FACE_W = 512;
export const FACE_H = 340;
export const FACE_PHI = Math.PI * (2 / 3);
export const FACE_THETA0 = Math.PI * 0.36;
export const FACE_THETA_LEN = Math.PI * 0.44;

const EYE_Y = 158;
const EYE_DX = 80;
const MOUTH_Y = 244;
const BROW_Y = 92;
const BLUSH_Y = 206;
const EYE_SCALE = 1.38;

function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
}

function drawEye(ctx, x, y, a, side, expr) {
  const lash = a.lashes;
  const ink = '#2b1d1d';
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(EYE_SCALE, EYE_SCALE);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const closedArc = (up) => {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 7;
    ctx.beginPath();
    if (up) ctx.arc(0, 10, 22, Math.PI * 1.15, Math.PI * 1.85);
    else ctx.arc(0, -8, 22, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    if (lash) {
      ctx.beginPath();
      const ox = side * 20;
      ctx.moveTo(ox, up ? -4 : 2);
      ctx.lineTo(ox + side * 9, up ? -10 : -4);
      ctx.stroke();
    }
  };

  if (expr === 'blink' || a.eyes === 'rieurs' || expr === 'happy') {
    closedArc(expr === 'happy' || a.eyes === 'rieurs');
    ctx.restore();
    return;
  }

  const iris = a.eyeColor;
  switch (a.eyes) {
    case 'points': {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-3, -5, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'chat': {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(0, 0, 25, 19, side * -0.15, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createRadialGradient(0, 2, 2, 0, 0, 20);
      g.addColorStop(0, shade(iris, 1.4));
      g.addColorStop(1, iris);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 25, 19, side * -0.15, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-6, -7, 4.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: {
      // rond, pétillants, doux, endormis : grand œil brillant.
      const tall = a.eyes === 'petillants' ? 30 : 25;
      const wide = a.eyes === 'petillants' ? 21 : 20;
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(0, 0, wide, tall, 0, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createLinearGradient(0, -tall, 0, tall);
      g.addColorStop(0, shade(iris, 0.55));
      g.addColorStop(0.55, iris);
      g.addColorStop(1, shade(iris, 1.6));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 2, wide - 4, tall - 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(iris, 0.3);
      ctx.beginPath();
      ctx.ellipse(0, 2, wide * 0.42, tall * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(-side * 6 - 1, -tall * 0.38, 7.5, 9, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(side * 7, tall * 0.42, 4, 0, Math.PI * 2);
      ctx.fill();
      if (a.eyes === 'petillants') {
        ctx.save();
        ctx.translate(side * 8, -tall * 0.1);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 ? 1.6 : 5.5;
          const an = (i / 8) * Math.PI * 2;
          ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
        }
        ctx.fill();
        ctx.restore();
      }
      if (a.eyes === 'doux' || a.eyes === 'endormis') {
        // Paupière supérieure.
        const lid = a.eyes === 'endormis' ? 0.2 : -0.35;
        ctx.fillStyle = a.skin;
        ctx.beginPath();
        ctx.rect(-wide - 3, -tall - 6, wide * 2 + 6, tall * (1 + lid) + 6);
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-wide - 1, tall * lid);
        ctx.quadraticCurveTo(0, tall * lid - 4, wide + 1, tall * lid);
        ctx.stroke();
      } else {
        ctx.strokeStyle = ink;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, wide + 1, tall + 1, 0, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
    }
  }
  if (lash) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 5;
    const ox = side * 20;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(ox - side * i * 7, -18 + i * 4);
      ctx.lineTo(ox + side * (9 - i * 3), -27 + i * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBrow(ctx, x, y, a, side) {
  if (a.brows === 'aucun') return;
  const col = shade(a.hairColor, 0.7);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.25, 1.25);
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineCap = 'round';
  switch (a.brows) {
    case 'fins':
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 14, 22, Math.PI * 1.25, Math.PI * 1.75);
      ctx.stroke();
      break;
    case 'epais':
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(-16, 2);
      ctx.lineTo(16, 0);
      ctx.stroke();
      break;
    case 'froncés':
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-side * 18, -6);
      ctx.lineTo(side * 16, 5);
      ctx.stroke();
      break;
    default:
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(0, 16, 20, Math.PI * 1.3, Math.PI * 1.7);
      ctx.stroke();
  }
  ctx.restore();
}

function drawMouth(ctx, x, y, a, expr) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.2, 1.2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#6b2f2f';
  ctx.lineWidth = 5.5;
  const kind = expr === 'happy' ? 'rire' : a.mouth;
  switch (kind) {
    case 'rire':
      ctx.fillStyle = '#8c3a3f';
      ctx.beginPath();
      ctx.moveTo(-17, -4);
      ctx.quadraticCurveTo(0, -1, 17, -4);
      ctx.quadraticCurveTo(15, 20, 0, 20);
      ctx.quadraticCurveTo(-15, 20, -17, -4);
      ctx.fill();
      ctx.fillStyle = '#ff8fa3';
      ctx.beginPath();
      ctx.ellipse(0, 13, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'chat':
      ctx.beginPath();
      ctx.moveTo(-15, -2);
      ctx.quadraticCurveTo(-8, 10, 0, 0);
      ctx.quadraticCurveTo(8, 10, 15, -2);
      ctx.stroke();
      break;
    case 'o':
      ctx.fillStyle = '#8c3a3f';
      ctx.beginPath();
      ctx.ellipse(0, 2, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'langue':
      ctx.beginPath();
      ctx.arc(0, -8, 14, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
      ctx.fillStyle = '#ff7f96';
      ctx.beginPath();
      ctx.ellipse(5, 7, 6, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'neutre':
      ctx.beginPath();
      ctx.moveTo(-8, 2);
      ctx.lineTo(8, 2);
      ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, -8, 14, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
  }
  ctx.restore();
}

export function drawFace(canvas, a, expr = 'normal') {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, FACE_W, FACE_H);
  const cx = FACE_W / 2;
  if (a.blush) {
    for (const s of [-1, 1]) {
      const g = ctx.createRadialGradient(cx + s * 126, BLUSH_Y, 2, cx + s * 126, BLUSH_Y, 38);
      g.addColorStop(0, 'rgba(255,120,140,0.6)');
      g.addColorStop(1, 'rgba(255,120,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx + s * 126, BLUSH_Y, 40, 26, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (a.freckles) {
    ctx.fillStyle = 'rgba(160,90,60,0.6)';
    const pts = [[-20, -12], [-6, -4], [8, -14], [14, 2], [-12, 8], [24, -2]];
    for (const s of [-1, 1]) {
      for (const [dx, dy] of pts) {
        ctx.beginPath();
        ctx.arc(cx + s * (100 + dx), BLUSH_Y - 18 + dy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  for (const s of [-1, 1]) {
    drawBrow(ctx, cx + s * EYE_DX, BROW_Y, a, s);
    drawEye(ctx, cx + s * EYE_DX, EYE_Y, a, s, expr);
  }
  // Petit nez discret.
  ctx.strokeStyle = 'rgba(150,80,60,0.45)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, 206, 6, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
  drawMouth(ctx, cx, MOUTH_Y, a, expr);
}

/** Crée les textures (normal, clignement, joie) pour une apparence. */
export function createFaceTextures(a) {
  const out = {};
  for (const expr of ['normal', 'blink', 'happy']) {
    const canvas = document.createElement('canvas');
    canvas.width = FACE_W;
    canvas.height = FACE_H;
    drawFace(canvas, a, expr);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    out[expr] = tex;
  }
  return out;
}

/** Motif de vêtement (canvas répété). */
export function createPatternTexture(pattern, base, accent) {
  const S = 128;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = accent;
  ctx.strokeStyle = accent;
  switch (pattern) {
    case 'rayures':
      ctx.fillRect(0, 0, S, S / 4);
      ctx.fillRect(0, S / 2, S, S / 4);
      break;
    case 'pois':
      for (const [x, y] of [[32, 32], [96, 96]]) {
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'carreaux':
      ctx.globalAlpha = 0.55;
      ctx.fillRect(0, 0, S, S / 2);
      ctx.fillRect(0, 0, S / 2, S);
      ctx.globalAlpha = 1;
      break;
    case 'coeurs':
      for (const [x, y] of [[32, 36], [96, 100]]) heart(ctx, x, y, 14);
      break;
    case 'etoiles':
      for (const [x, y] of [[32, 32], [96, 96]]) star(ctx, x, y, 16);
      break;
    case 'fleurs':
      for (const [x, y] of [[32, 32], [96, 96]]) {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffd84d';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accent;
      }
      break;
    default:
      break;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function heart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.2, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  ctx.fill();
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.fill();
}

export { heart as drawHeart };
