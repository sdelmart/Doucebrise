import * as THREE from 'three';
import { Shape, G } from '../core/materials.js';

// Garde-robe des compagnons : quatre emplacements (tête, yeux, cou, corps), chacun avec ses
// articles et une couleur au choix. Les pièces se posent sur les repères du modèle de
// l'animal (haut de la tête, yeux, cou, torse : voir species.js), à son échelle.

export const OUTFIT_SLOTS = [
  { id: 'tete', label: 'Tête', emoji: '🎩' },
  { id: 'yeux', label: 'Yeux', emoji: '👓' },
  { id: 'cou', label: 'Cou', emoji: '🎀' },
  { id: 'corps', label: 'Corps', emoji: '👕' },
];

export const PET_COLORS = ['#ff6f91', '#ffb3c7', '#e5484d', '#ff9f43', '#ffd84d', '#b5e48c', '#6fcf97', '#8fd6e8', '#6fa8dc', '#b69cf0', '#ffffff', '#2e2e3a'];

// `price` : à acheter au Café des Chats (rayon « Garde-robe des minous ») ; `fixed` : couleurs
// de l'article imposées (pastèque, couronne en or…).
const it = (id, label, emoji, color, extra = {}) => ({ id, label, emoji, color, ...extra });
export const OUTFIT_ITEMS = {
  tete: [
    it('noeud', 'Nœud', '🎀', '#ff6f91'),
    it('fete', 'Chapeau de fête', '🥳', '#6fa8dc'),
    it('fleurs', 'Couronne de fleurs', '🌸', '#ff6f91'),
    it('paille', 'Chapeau de paille', '👒', '#e5484d'),
    it('bonnet', 'Bonnet à pompon', '🧶', '#8fd6e8'),
    it('beret', 'Béret', '🎨', '#e5484d'),
    it('lapin', 'Oreilles de lapin', '🐰', '#ffffff'),
    it('sorciere', 'Chapeau de sorcière', '🧙', '#b69cf0', { price: 220 }),
    it('hautdeforme', 'Haut-de-forme', '🎩', '#e5484d', { price: 260 }),
    it('couronne', 'Couronne royale', '👑', '#e5484d', { price: 380 }),
    it('pasteque', 'Casque pastèque', '🍉', '#3f9d4a', { price: 300, fixed: true }),
  ],
  yeux: [
    it('rondes', 'Lunettes rondes', '👓', '#2e2e3a'),
    it('soleil', 'Lunettes de soleil', '🕶️', '#ff6f91'),
    it('coeur', 'Lunettes cœur', '💖', '#ff6f91', { price: 180 }),
    it('pasteque', 'Lunettes pastèque', '🍉', '#3f9d4a', { price: 200, fixed: true }),
  ],
  cou: [
    it('collier', 'Collier à grelot', '🔔', '#ff6f91'),
    it('foulard', 'Foulard', '🧣', '#6fcf97'),
    it('noeudpap', 'Nœud papillon', '🎀', '#2e2e3a'),
    it('echarpe', 'Écharpe', '🧣', '#e5484d'),
    it('collerette', 'Collerette', '🌼', '#ffffff'),
    it('perles', 'Collier de perles', '📿', '#ffffff', { price: 240, fixed: true }),
    it('pasteque', 'Collier pastèque', '🍉', '#3f9d4a', { price: 160, fixed: true }),
  ],
  corps: [
    it('pull', 'Pull douillet', '🧶', '#ff6f91'),
    it('marin', 'Marinière', '⚓', '#6fa8dc'),
    it('cape', 'Cape', '🦸', '#b69cf0'),
    it('tutu', 'Tutu', '🩰', '#ffb3c7'),
    it('pasteque', 'Pull pastèque', '🍉', '#ff5a6e', { price: 320, fixed: true }),
  ],
};

export function outfitItem(slot, id) {
  return OUTFIT_ITEMS[slot]?.find((x) => x.id === id) || null;
}

/** Article verrouillé (à acheter au café) ? */
export function outfitLocked(slot, id, unlocks) {
  const item = outfitItem(slot, id);
  return !!item?.price && !unlocks.has(`pet:${slot}:${id}`);
}

/** Tenue nettoyée : seulement des emplacements et articles connus. */
export function cleanOutfit(o) {
  const out = {};
  for (const { id: slot } of OUTFIT_SLOTS) {
    const p = o?.[slot];
    const item = p && outfitItem(slot, p.id);
    if (item) out[slot] = { id: item.id, color: typeof p.color === 'string' ? p.color : item.color };
  }
  return out;
}

/** Ancien accessoire unique (v0.16 et avant) → tenue. */
export function outfitFromAccessory(id, color) {
  const map = { collier: ['cou', 'collier'], foulard: ['cou', 'foulard'], noeud: ['tete', 'noeud'], chapeau: ['tete', 'fete'], couronne: ['tete', 'fleurs'] };
  const m = map[id];
  return m ? { [m[0]]: { id: m[1], color: color || outfitItem(m[0], m[1]).color } } : {};
}

const lighten = (c, f) => `#${new THREE.Color(c).lerp(new THREE.Color('#ffffff'), f).getHexString()}`;
const darken = (c, f) => `#${new THREE.Color(c).multiplyScalar(1 - f).getHexString()}`;

const RIND = '#3f9d4a';
const RIND_D = '#24693a';
const FLESH = '#ff5a6e';
const PITH = '#f4f7e8';
const SEED = '#2b2420';
const GOLD = '#ffd84d';

/**
 * Pièces de la tenue pour un modèle d'animal : une géométrie dans le repère de la tête
 * (tête, yeux) et une dans celui du corps (cou, corps).
 */
export function buildOutfit(model, outfit) {
  const head = new Shape();
  const body = new Shape();
  const A = model.anchors;
  const S = (A.headR || 0.2) / 0.2;
  const o = cleanOutfit(outfit);
  if (o.tete) headItem(head, A, S, o.tete.id, o.tete.color);
  if (o.yeux && A.eyes) eyeItem(head, A.eyes, S, o.yeux.id, o.yeux.color);
  if (o.cou) neckItem(body, A.neck, S, o.cou.id, o.cou.color);
  if (o.corps && A.torso) bodyItem(body, A.torso, A.neck, S, o.corps.id, o.corps.color);
  return { head: head.empty ? null : head.build(), body: body.empty ? null : body.build() };
}

function headItem(s, A, S, id, c) {
  const [tx, ty, tz] = A.top.pos;
  switch (id) {
    case 'noeud':
      s.add(G.sphere(0.05 * S, 10, 8), c, { pos: [tx + 0.1 * S, ty - 0.02 * S, tz + 0.02 * S], scale: [1.4, 1, 0.5], rot: [0, 0, -0.4] });
      s.add(G.sphere(0.05 * S, 10, 8), c, { pos: [tx + 0.02 * S, ty + 0.03 * S, tz + 0.02 * S], scale: [1.4, 1, 0.5], rot: [0, 0, 0.8] });
      s.add(G.sphere(0.025 * S, 8, 6), darken(c, 0.12), { pos: [tx + 0.06 * S, ty, tz + 0.03 * S] });
      break;
    case 'fete':
      s.add(G.cone(0.07 * S, 0.16 * S, 12), c, { pos: [tx, ty + 0.06 * S, tz], rot: [0, 0, 0.2] });
      s.add(G.sphere(0.025 * S, 8, 6), '#ffffff', { pos: [tx - 0.03 * S, ty + 0.14 * S, tz] });
      s.add(G.torus(0.065 * S, 0.012 * S, 5, 14), '#ffffff', { pos: [tx + 0.005 * S, ty - 0.01 * S, tz], rot: [Math.PI / 2, 0.2, 0] });
      for (let i = 0; i < 3; i++) s.add(G.sphere(0.012 * S, 6, 4), ['#ffd84d', '#ffffff', '#6fcf97'][i], { pos: [tx + (0.03 - i * 0.02) * S, ty + (0.02 + i * 0.035) * S, tz + 0.045 * S] });
      break;
    case 'fleurs': {
      const cols = [c, '#ffffff', GOLD];
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        s.add(G.sphere(0.03 * S, 8, 6), cols[i % 3], { pos: [tx + Math.cos(a) * 0.09 * S, ty - 0.02 * S, tz + Math.sin(a) * 0.09 * S] });
      }
      s.add(G.torus(0.09 * S, 0.012 * S, 5, 16), '#5fae55', { pos: [tx, ty - 0.03 * S, tz], rot: [Math.PI / 2, 0, 0] });
      break;
    }
    case 'paille':
      s.add(G.cyl(0.17 * S, 0.17 * S, 0.012 * S, 22), '#f2d58a', { pos: [tx, ty - 0.005 * S, tz], rot: [-0.08, 0, 0.1] });
      s.add(G.cyl(0.085 * S, 0.095 * S, 0.07 * S, 18), '#f2d58a', { pos: [tx, ty + 0.035 * S, tz], rot: [-0.08, 0, 0.1] });
      s.add(G.cyl(0.097 * S, 0.097 * S, 0.022 * S, 18), c, { pos: [tx, ty + 0.012 * S, tz], rot: [-0.08, 0, 0.1] });
      s.add(G.sphere(0.022 * S, 8, 6), c, { pos: [tx + 0.09 * S, ty + 0.02 * S, tz + 0.03 * S], scale: [1.3, 1, 0.6] });
      break;
    case 'bonnet':
      s.add(new THREE.SphereGeometry(0.15 * S, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), c, { pos: [tx, ty - 0.07 * S, tz], scale: [1.12, 1.05, 1.06], rot: [-0.12, 0, 0] });
      s.add(G.torus(0.162 * S, 0.026 * S, 6, 22), lighten(c, 0.45), { pos: [tx, ty - 0.065 * S, tz], rot: [Math.PI / 2 - 0.12, 0, 0], scale: [1.04, 1, 1] });
      s.add(G.sphere(0.05 * S, 10, 8), '#ffffff', { pos: [tx, ty + 0.1 * S, tz - 0.02 * S] });
      break;
    case 'beret':
      s.add(G.sphere(0.13 * S, 16, 10), c, { pos: [tx + 0.02 * S, ty + 0.01 * S, tz], scale: [1.25, 0.32, 1.15], rot: [0, 0, 0.28] });
      s.add(G.cyl(0.012 * S, 0.012 * S, 0.04 * S, 6), darken(c, 0.2), { pos: [tx + 0.01 * S, ty + 0.055 * S, tz], rot: [0, 0, 0.28] });
      break;
    case 'lapin':
      s.add(G.torus(0.12 * S, 0.012 * S, 5, 18, Math.PI), c, { pos: [tx, ty - 0.04 * S, tz], rot: [0, 0, 0] });
      for (const sx of [-1, 1]) {
        s.add(G.capsule(0.035 * S, 0.14 * S, 4, 10), c, { pos: [tx + sx * 0.05 * S, ty + 0.12 * S, tz], rot: [0, 0, -sx * 0.25], scale: [1, 1, 0.45] });
        s.add(G.capsule(0.02 * S, 0.11 * S, 4, 8), '#ffb3c7', { pos: [tx + sx * 0.05 * S, ty + 0.12 * S, tz + 0.012 * S], rot: [0, 0, -sx * 0.25], scale: [1, 1, 0.3] });
      }
      break;
    case 'sorciere':
      s.add(G.cyl(0.16 * S, 0.16 * S, 0.012 * S, 22), c, { pos: [tx, ty, tz], rot: [-0.1, 0, 0] });
      s.add(G.cone(0.085 * S, 0.2 * S, 16), c, { pos: [tx, ty + 0.1 * S, tz - 0.01 * S], rot: [-0.18, 0, 0] });
      s.add(G.cone(0.035 * S, 0.09 * S, 10), c, { pos: [tx, ty + 0.22 * S, tz - 0.06 * S], rot: [-0.8, 0, 0] });
      s.add(G.cyl(0.086 * S, 0.088 * S, 0.025 * S, 16), GOLD, { pos: [tx, ty + 0.015 * S, tz], rot: [-0.1, 0, 0] });
      break;
    case 'hautdeforme':
      s.add(G.cyl(0.12 * S, 0.12 * S, 0.012 * S, 20), '#2e2e3a', { pos: [tx, ty, tz], rot: [0, 0, -0.12] });
      s.add(G.cyl(0.075 * S, 0.072 * S, 0.15 * S, 18), '#2e2e3a', { pos: [tx - 0.01 * S, ty + 0.078 * S, tz], rot: [0, 0, -0.12] });
      s.add(G.cyl(0.077 * S, 0.077 * S, 0.03 * S, 18), c, { pos: [tx - 0.004 * S, ty + 0.025 * S, tz], rot: [0, 0, -0.12] });
      break;
    case 'couronne': {
      s.add(new THREE.CylinderGeometry(0.075 * S, 0.068 * S, 0.055 * S, 16, 1, true), GOLD, { pos: [tx, ty + 0.025 * S, tz] });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        s.add(G.cone(0.02 * S, 0.05 * S, 4), GOLD, { pos: [tx + Math.cos(a) * 0.072 * S, ty + 0.075 * S, tz + Math.sin(a) * 0.072 * S] });
        s.add(G.sphere(0.012 * S, 6, 4), i % 2 ? c : '#ffffff', { pos: [tx + Math.cos(a) * 0.075 * S, ty + 0.03 * S, tz + Math.sin(a) * 0.075 * S] });
      }
      break;
    }
    case 'pasteque': {
      // Le fameux casque en écorce de pastèque : dôme vert rayé, bord blanc puis rouge.
      const r = 0.165 * S;
      const y0 = ty - 0.075 * S;
      s.add(new THREE.SphereGeometry(r, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), RIND, { pos: [tx, y0, tz], scale: [1.08, 0.95, 1.03] });
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        s.add(new THREE.SphereGeometry(r * 1.012, 3, 10, a, 0.2, 0, Math.PI * 0.5), RIND_D, { pos: [tx, y0, tz], scale: [1.08, 0.95, 1.03] });
      }
      s.add(G.torus(r * 1.02, 0.02 * S, 6, 26), PITH, { pos: [tx, y0, tz], rot: [Math.PI / 2, 0, 0], scale: [1.08, 1.03, 1] });
      s.add(G.torus(r * 0.97, 0.018 * S, 6, 26), FLESH, { pos: [tx, y0 - 0.012 * S, tz], rot: [Math.PI / 2, 0, 0], scale: [1.08, 1.03, 1] });
      s.add(G.cyl(0.01 * S, 0.012 * S, 0.04 * S, 5), '#8a6a3a', { pos: [tx, y0 + r * 0.96, tz] });
      break;
    }
    default:
      break;
  }
}

function eyeItem(s, E, S, id, c) {
  const [cx, cy, cz] = E.pos;
  const dx = E.dx;
  const r = Math.max(E.size * 1.55, 0.05 * S);
  const z = cz + E.size * 0.9;
  const frame = (col) => {
    s.add(G.cyl(0.006 * S, 0.006 * S, Math.max(0.01, 2 * dx - 2 * r), 5), col, { pos: [cx, cy + r * 0.25, z], rot: [0, 0, Math.PI / 2] });
    for (const sx of [-1, 1]) {
      const g = G.cyl(0.005 * S, 0.005 * S, 0.12 * S, 4);
      g.rotateX(Math.PI / 2);
      s.add(g, col, { pos: [cx + sx * (dx + r * 0.95), cy + r * 0.2, z - 0.06 * S], rot: [0, -sx * 0.25, 0] });
    }
  };
  switch (id) {
    case 'rondes':
    case 'soleil':
      for (const sx of [-1, 1]) {
        s.add(G.torus(r, 0.008 * S, 6, 20), c, { pos: [cx + sx * dx, cy, z] });
        if (id === 'soleil') s.add(G.cyl(r, r, 0.004 * S, 18), '#2e2e3a', { pos: [cx + sx * dx, cy, z - 0.002 * S], rot: [Math.PI / 2, 0, 0] });
      }
      frame(c);
      break;
    case 'coeur':
      for (const sx of [-1, 1]) s.add(heartGeo(r * 1.25, 0.01 * S), c, { pos: [cx + sx * dx, cy, z] });
      frame(c);
      break;
    case 'pasteque':
      for (const sx of [-1, 1]) {
        // Verres en tranche de pastèque (demi-disque, écorce en bas).
        s.add(new THREE.CircleGeometry(r * 1.1, 18, Math.PI, Math.PI), FLESH, { pos: [cx + sx * dx, cy + r * 0.45, z + 0.003 * S] });
        s.add(new THREE.RingGeometry(r * 1.1, r * 1.38, 18, 1, Math.PI, Math.PI), RIND, { pos: [cx + sx * dx, cy + r * 0.45, z + 0.002 * S] });
        for (const [px, py] of [[-0.4, -0.35], [0, -0.6], [0.4, -0.35]]) s.add(G.sphere(0.008 * S, 5, 4), SEED, { pos: [cx + sx * dx + px * r, cy + r * 0.45 + py * r, z + 0.008 * S], scale: [0.7, 1.2, 0.4] });
      }
      frame(RIND);
      break;
    default:
      break;
  }
}

function heartGeo(size, depth) {
  const h = new THREE.Shape();
  const k = size;
  h.moveTo(0, -0.9 * k);
  h.bezierCurveTo(-1.4 * k, 0.1 * k, -0.6 * k, 1.1 * k, 0, 0.45 * k);
  h.bezierCurveTo(0.6 * k, 1.1 * k, 1.4 * k, 0.1 * k, 0, -0.9 * k);
  const g = new THREE.ExtrudeGeometry(h, { depth, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -depth / 2);
  return g;
}

// Repère du cou : anneau perpendiculaire à `axis`, « devant » = vers l'avant de l'animal.
function neckFrame(n) {
  const a = new THREE.Vector3(...(n.axis || [0, 1, 0])).normalize();
  const f = new THREE.Vector3(0, 0, 1).addScaledVector(a, -a.z).normalize();
  const side = new THREE.Vector3().crossVectors(a, f);
  return { a, f, side, dir: [a.x, a.y, a.z] };
}

function onNeck(n, ang, k = 1) {
  const { f, side } = neckFrame(n);
  const r = n.r * k;
  return [n.pos[0] + (f.x * Math.cos(ang) + side.x * Math.sin(ang)) * r, n.pos[1] + (f.y * Math.cos(ang) + side.y * Math.sin(ang)) * r, n.pos[2] + (f.z * Math.cos(ang) + side.z * Math.sin(ang)) * r];
}

function neckItem(s, n, S, id, c) {
  const front = onNeck(n, 0, 1.05);
  switch (id) {
    case 'collier':
      s.add(G.torus(n.r, 0.02 * S, 6, 18), c, { pos: n.pos, dir: neckFrame(n).dir });
      s.add(G.sphere(0.03 * S, 8, 6), GOLD, { pos: [front[0], front[1] - 0.03 * S, front[2]] });
      s.add(G.torus(0.012 * S, 0.004 * S, 4, 8), darken(GOLD, 0.3), { pos: [front[0], front[1] - 0.03 * S, front[2] + 0.02 * S] });
      break;
    case 'foulard':
      s.add(G.torus(n.r, 0.025 * S, 6, 18), c, { pos: n.pos, dir: neckFrame(n).dir });
      s.add(G.cone(n.r * 0.75, n.r * 1.0, 3), c, { pos: [front[0], front[1] - n.r * 0.45, front[2] - n.r * 0.05], rot: [Math.PI + 0.35, 0, 0], scale: [1, 1, 0.3] });
      for (let i = 0; i < 3; i++) s.add(G.sphere(0.012 * S, 5, 4), '#ffffff', { pos: [front[0] + (i - 1) * n.r * 0.28, front[1] - n.r * (0.3 + (i % 2) * 0.22), front[2] + 0.012 * S] });
      break;
    case 'noeudpap':
      s.add(G.torus(n.r, 0.012 * S, 5, 18), c, { pos: n.pos, dir: neckFrame(n).dir });
      for (const sx of [-1, 1]) s.add(G.cone(0.035 * S, 0.06 * S, 4), c, { pos: [front[0] + sx * 0.03 * S, front[1] - 0.02 * S, front[2] + 0.01 * S], rot: [0, 0, sx * Math.PI / 2], scale: [1, 1, 0.45] });
      s.add(G.sphere(0.018 * S, 8, 6), darken(c, 0.15), { pos: [front[0], front[1] - 0.02 * S, front[2] + 0.015 * S] });
      break;
    case 'echarpe':
      s.add(G.torus(n.r * 1.02, 0.034 * S, 6, 18), c, { pos: n.pos, dir: neckFrame(n).dir });
      s.add(G.torus(n.r * 1.03, 0.012 * S, 5, 18), lighten(c, 0.5), { pos: [n.pos[0], n.pos[1] + 0.012 * S, n.pos[2]], dir: neckFrame(n).dir });
      for (const [i, sx] of [[0, 1], [1, 0.6]]) s.add(G.box(0.045 * S, 0.13 * S, 0.016 * S), i ? lighten(c, 0.25) : c, { pos: [front[0] + sx * 0.05 * S, front[1] - 0.07 * S, front[2] + 0.01 * S], rot: [0.2, 0, 0.12 - i * 0.2] });
      break;
    case 'collerette':
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const p = onNeck(n, a, 1.12);
        s.add(G.sphere(0.03 * S, 8, 6), i % 2 ? c : lighten(c, 0.6), { pos: p, scale: [1.3, 0.55, 1.3] });
      }
      break;
    case 'perles':
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        s.add(G.sphere(0.014 * S, 8, 6), '#f8f2e8', { pos: onNeck(n, a, 1.04) });
      }
      s.add(G.sphere(0.024 * S, 10, 8), '#ffe6f0', { pos: [front[0], front[1] - 0.025 * S, front[2] + 0.005 * S] });
      break;
    case 'pasteque': {
      s.add(G.torus(n.r, 0.02 * S, 6, 18), RIND, { pos: n.pos, dir: neckFrame(n).dir });
      // Breloque : une petite tranche de pastèque.
      const y = front[1] - 0.045 * S;
      s.add(new THREE.CircleGeometry(0.035 * S, 12, Math.PI, Math.PI), FLESH, { pos: [front[0], y + 0.02 * S, front[2] + 0.012 * S] });
      s.add(new THREE.RingGeometry(0.035 * S, 0.045 * S, 12, 1, Math.PI, Math.PI), RIND, { pos: [front[0], y + 0.02 * S, front[2] + 0.011 * S] });
      s.add(G.box(0.09 * S, 0.012 * S, 0.012 * S), FLESH, { pos: [front[0], y + 0.02 * S, front[2] + 0.006 * S] });
      for (const px of [-0.012, 0.012]) s.add(G.sphere(0.005 * S, 5, 4), SEED, { pos: [front[0] + px * S, y + 0.005 * S, front[2] + 0.016 * S] });
      break;
    }
    default:
      break;
  }
}

/** Point de la surface du torse (angle autour de l'échine, f de -1 arrière à 1 avant). */
function onTorso(T, a, f, k = 1) {
  const q = Math.sqrt(Math.max(0, 1 - f * f));
  const p = [T.pos[0] + Math.cos(a) * T.r[0] * q * k, T.pos[1] + Math.sin(a) * T.r[1] * q * k, T.pos[2] + f * T.r[2] * k];
  const nrm = new THREE.Vector3(Math.cos(a) * q / T.r[0], Math.sin(a) * q / T.r[1], f / T.r[2]).normalize();
  return { pos: p, dir: [nrm.x, nrm.y, nrm.z] };
}

function bodyItem(s, T, n, S, id, c) {
  const [rx, ry, rz] = T.r;
  // Le vêtement couvre l'avant et le milieu du torse (l'arrière reste libre pour la queue).
  const coat = { pos: [T.pos[0], T.pos[1] + ry * 0.03, T.pos[2] + rz * 0.22], r: [rx * 1.1, ry * 1.1, rz * 0.8] };
  const band = (f, col, w = 0.03) => {
    const k = Math.sqrt(Math.max(0, 1 - f * f)) * 1.02;
    s.add(G.sphere(1, 20, 12), col, { pos: [coat.pos[0], coat.pos[1], coat.pos[2] + f * coat.r[2]], scale: [coat.r[0] * k, coat.r[1] * k, w * S] });
  };
  const sweater = (col) => s.add(G.sphere(1, 22, 16), col, { pos: coat.pos, scale: coat.r });
  switch (id) {
    case 'pull':
      sweater(c);
      band(-0.82, lighten(c, 0.45));
      band(0.1, lighten(c, 0.2), 0.022);
      if (n) s.add(G.torus(n.r * 1.02, 0.024 * S, 6, 18), lighten(c, 0.45), { pos: n.pos, dir: neckFrame(n).dir });
      break;
    case 'marin':
      sweater('#ffffff');
      for (const f of [-0.6, -0.25, 0.1, 0.45]) band(f, c, 0.03);
      band(-0.85, c, 0.035);
      if (n) s.add(G.torus(n.r * 1.02, 0.022 * S, 6, 18), c, { pos: n.pos, dir: neckFrame(n).dir });
      break;
    case 'cape': {
      s.add(new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), c, { pos: [T.pos[0], T.pos[1] - ry * 0.05, T.pos[2] - rz * 0.05], scale: [rx * 1.2, ry * 1.22, rz * 1.06], rot: [-0.1, 0, 0] });
      s.add(new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), lighten(c, 0.55), { pos: [T.pos[0], T.pos[1] - ry * 0.07, T.pos[2] - rz * 0.05], scale: [rx * 1.18, ry * 1.2, rz * 1.04], rot: [-0.1, 0, 0] });
      if (n) {
        s.add(G.torus(n.r * 1.02, 0.018 * S, 6, 18), c, { pos: n.pos, dir: neckFrame(n).dir });
        const f = onNeck(n, 0, 1.06);
        s.add(G.sphere(0.022 * S, 8, 6), GOLD, { pos: f });
      }
      break;
    }
    case 'tutu': {
      const z = T.pos[2] - rz * 0.3;
      const q = Math.sqrt(1 - 0.09);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const p = [T.pos[0] + Math.cos(a) * rx * q * 1.22, T.pos[1] + Math.sin(a) * ry * q * 1.18, z];
        s.add(G.sphere(0.05 * S, 8, 6), i % 2 ? c : lighten(c, 0.5), { pos: p, dir: [Math.cos(a), Math.sin(a), -0.25], scale: [1.2, 0.7, 0.45] });
      }
      const k = q * 1.04;
      s.add(G.sphere(1, 20, 12), lighten(c, 0.25), { pos: [T.pos[0], T.pos[1], z], scale: [rx * k, ry * k, 0.035 * S] });
      break;
    }
    case 'pasteque': {
      sweater(FLESH);
      band(-0.86, RIND, 0.04);
      band(-0.74, PITH, 0.025);
      if (n) {
        s.add(G.torus(n.r * 1.02, 0.026 * S, 6, 18), RIND, { pos: n.pos, dir: neckFrame(n).dir });
        s.add(G.torus(n.r * 1.04, 0.012 * S, 5, 18), PITH, { pos: [n.pos[0], n.pos[1] - 0.02 * S, n.pos[2]], dir: neckFrame(n).dir });
      }
      // Pépins sur le dos et les flancs.
      const C = { pos: coat.pos, r: coat.r };
      for (const [a, f] of [[1.2, 0.4], [1.9, 0.4], [1.57, 0.05], [0.9, -0.15], [2.25, -0.15], [1.57, -0.4], [1.1, -0.55], [2.05, -0.55], [0.55, 0.2], [2.6, 0.2], [0.3, -0.35], [2.85, -0.35]]) {
        const p = onTorso(C, a, f, 1.0);
        s.add(G.sphere(0.014 * S, 6, 4), SEED, { pos: p.pos, dir: p.dir, scale: [0.7, 1.3, 0.4] });
      }
      break;
    }
    default:
      break;
  }
}

/** Tenue au hasard (bouton « Surprise ! »), articles disponibles seulement. */
export function randomOutfit(rand, unlocks) {
  const out = {};
  for (const { id: slot } of OUTFIT_SLOTS) {
    if (rand() < (slot === 'yeux' ? 0.35 : 0.6)) {
      const items = OUTFIT_ITEMS[slot].filter((x) => !outfitLocked(slot, x.id, unlocks));
      const item = items[Math.floor(rand() * items.length)];
      if (item) out[slot] = { id: item.id, color: item.fixed ? item.color : PET_COLORS[Math.floor(rand() * PET_COLORS.length)] };
    }
  }
  return out;
}
