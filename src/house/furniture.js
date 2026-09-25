import * as THREE from 'three';
import { Shape, G } from '../core/materials.js';

// Catalogue des meubles : taille au sol (m), où on peut les poser, prix,
// couleurs possibles et modèle 3D. Tous regardent vers +Z.

export const PALETTE = ['#f7a8b8', '#8fd6e8', '#b5e48c', '#ffd84d', '#b69cf0', '#fffaf2', '#c98b58', '#e5484d', '#6fa8dc', '#3d3744'];

const WOOD = '#c9935f';
const WOOD_D = '#8f6243';
const METAL = '#4e4c62';
const WHITE = '#fffaf2';
const GLOW = '#ffe9a8';

function light(c, f) {
  return `#${new THREE.Color(c).lerp(new THREE.Color('#ffffff'), f).getHexString()}`;
}
function dark(c, f) {
  return `#${new THREE.Color(c).multiplyScalar(1 - f).getHexString()}`;
}
function legs(s, w, d, h, col = WOOD_D, r = 0.04, inset = 0.08) {
  for (const x of [-w / 2 + inset, w / 2 - inset]) for (const z of [-d / 2 + inset, d / 2 - inset]) s.add(G.cyl(r, r * 0.8, h, 6), col, { pos: [x, h / 2, z] });
}
function flowers(s, x, y, z, c, n = 5, r = 0.12) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    s.add(G.sphere(0.06, 6, 4), i % 2 ? c : '#ffffff', { pos: [x + Math.cos(a) * r, y + (i % 3) * 0.04, z + Math.sin(a) * r] });
  }
  s.add(G.sphere(0.05, 6, 4), '#ffd84d', { pos: [x, y + 0.05, z] });
}

const F = {};
const def = (id, o) => {
  F[id] = { id, where: 'in', colors: PALETTE, color: PALETTE[0], ...o };
};

// --- Chambre ------------------------------------------------------------------
def('lit', {
  label: 'Lit douillet', emoji: '🛏️', price: 0, w: 1.2, d: 2.1, color: '#8fd6e8', bed: true,
  build(c) {
    const s = new Shape();
    s.add(G.box(1.2, 0.3, 2.1), WOOD, { pos: [0, 0.25, 0] });
    s.add(G.box(1.1, 0.2, 2.0), WHITE, { pos: [0, 0.48, 0] });
    s.add(G.box(1.16, 0.12, 1.35), c, { pos: [0, 0.6, 0.33] });
    s.add(G.box(1.16, 0.3, 0.05), c, { pos: [0, 0.48, 1.02] });
    s.add(G.sphere(0.25, 10, 6), WHITE, { pos: [0, 0.66, -0.7], scale: [1.6, 0.45, 0.9] });
    s.add(G.box(1.24, 1.0, 0.1), WOOD_D, { pos: [0, 0.6, -1.03] });
    s.add(G.cyl(0.62, 0.62, 0.1, 16, false), WOOD_D, { pos: [0, 1.1, -1.03], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.45] });
    legs(s, 1.2, 2.1, 0.12);
    return s.build();
  },
});
def('lit-double', {
  label: 'Grand lit', emoji: '🛏️', price: 650, w: 2.0, d: 2.2, color: '#f7a8b8', bed: true,
  build(c) {
    const s = new Shape();
    s.add(G.box(2.0, 0.3, 2.2), WOOD, { pos: [0, 0.25, 0] });
    s.add(G.box(1.9, 0.22, 2.1), WHITE, { pos: [0, 0.48, 0] });
    s.add(G.box(1.96, 0.13, 1.4), c, { pos: [0, 0.62, 0.35] });
    s.add(G.box(1.96, 0.13, 0.25), light(c, 0.5), { pos: [0, 0.63, -0.35] });
    for (const x of [-0.45, 0.45]) s.add(G.sphere(0.25, 10, 6), WHITE, { pos: [x, 0.68, -0.75], scale: [1.5, 0.45, 0.9] });
    s.add(G.box(2.1, 1.1, 0.12), WOOD_D, { pos: [0, 0.65, -1.1] });
    legs(s, 2.0, 2.2, 0.12);
    return s.build();
  },
});
def('table-chevet', {
  label: 'Table de chevet', emoji: '🪔', price: 120, w: 0.5, d: 0.45, color: WOOD,
  light: { y: 0.95, color: '#ffd89a', intensity: 3, dist: 5 },
  build(c) {
    const s = new Shape();
    s.add(G.box(0.5, 0.5, 0.45), c, { pos: [0, 0.3, 0] });
    s.add(G.box(0.4, 0.14, 0.02), dark(c, 0.15), { pos: [0, 0.35, 0.23] });
    s.add(G.sphere(0.02, 5, 4), '#ffd84d', { pos: [0, 0.35, 0.25] });
    legs(s, 0.5, 0.45, 0.06);
    s.add(G.cyl(0.07, 0.09, 0.06, 10), METAL, { pos: [0, 0.58, 0] });
    s.add(G.cyl(0.015, 0.015, 0.2, 5), METAL, { pos: [0, 0.7, 0] });
    return s.build();
  },
  glow() {
    return new Shape().add(G.cyl(0.08, 0.14, 0.16, 12, true), '#ffffff', { pos: [0, 0.86, 0] }).build();
  },
});
def('commode', {
  label: 'Commode', emoji: '🗄️', price: 260, w: 1.0, d: 0.5, color: '#fffaf2',
  build(c) {
    const s = new Shape();
    s.add(G.box(1.0, 0.8, 0.5), c, { pos: [0, 0.48, 0] });
    s.add(G.box(1.06, 0.05, 0.54), WOOD, { pos: [0, 0.9, 0] });
    for (let i = 0; i < 3; i++) {
      s.add(G.box(0.9, 0.2, 0.02), light(c, 0.3), { pos: [0, 0.25 + i * 0.25, 0.26] });
      s.add(G.sphere(0.03, 6, 4), '#ffd84d', { pos: [0, 0.25 + i * 0.25, 0.28] });
    }
    legs(s, 1.0, 0.5, 0.08);
    s.add(G.cyl(0.07, 0.05, 0.16, 8), '#8fd6e8', { pos: [0.3, 1.0, 0] });
    flowers(s, 0.3, 1.12, 0, '#f7a8b8', 5, 0.06);
    return s.build();
  },
});
def('miroir', {
  label: 'Miroir sur pied', emoji: '🪞', price: 220, w: 0.7, d: 0.35, color: '#ffd84d',
  build(c) {
    const s = new Shape();
    s.add(G.torus(0.32, 0.05, 8, 24), c, { pos: [0, 1.15, 0], scale: [1, 1.5, 1] });
    s.add(G.cyl(0.31, 0.31, 0.02, 20), '#cfeefb', { pos: [0, 1.15, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 1.5] });
    s.add(G.sphere(0.07, 6, 4), '#ffffff', { pos: [-0.12, 1.35, 0.02], scale: [1, 1.8, 0.2] });
    for (const x of [-0.25, 0.25]) s.add(G.box(0.04, 0.7, 0.04), c, { pos: [x, 0.35, -0.08], rot: [0.12, 0, 0] });
    return s.build();
  },
});
def('coffre', {
  label: 'Coffre à trésors', emoji: '🧰', price: 180, w: 0.9, d: 0.5, color: '#c98b58',
  build(c) {
    const s = new Shape();
    s.add(G.box(0.9, 0.45, 0.5), c, { pos: [0, 0.23, 0] });
    s.add(G.cyl(0.25, 0.25, 0.9, 12, false), dark(c, 0.1), { pos: [0, 0.45, 0], rot: [0, 0, Math.PI / 2], scale: [1, 1, 1] });
    for (const x of [-0.3, 0.3]) s.add(G.box(0.06, 0.72, 0.52), '#ffd84d', { pos: [x, 0.36, 0] });
    s.add(G.box(0.12, 0.14, 0.04), '#ffd84d', { pos: [0, 0.4, 0.26] });
    return s.build();
  },
});

// --- Salon --------------------------------------------------------------------
def('canape', {
  label: 'Canapé moelleux', emoji: '🛋️', price: 420, w: 2.0, d: 0.9, color: '#b69cf0',
  seats: [[-0.45, 0.1, 0.45], [0.45, 0.1, 0.45]],
  build(c) {
    const s = new Shape();
    s.add(G.box(2.0, 0.3, 0.85), dark(c, 0.1), { pos: [0, 0.25, 0] });
    for (const x of [-0.45, 0.45]) s.add(G.box(0.88, 0.14, 0.7), light(c, 0.15), { pos: [x, 0.46, 0.06] });
    s.add(G.box(1.95, 0.55, 0.22), c, { pos: [0, 0.65, -0.33] });
    for (const x of [-0.95, 0.95]) s.add(G.capsule(0.13, 0.6, 4, 8), c, { pos: [x, 0.52, 0], rot: [Math.PI / 2, 0, 0] });
    s.add(G.box(0.3, 0.3, 0.1), '#ffd84d', { pos: [-0.6, 0.62, -0.18], rot: [0.2, 0.3, 0.2] });
    legs(s, 1.9, 0.8, 0.1, WOOD_D);
    return s.build();
  },
});
def('fauteuil', {
  label: 'Fauteuil', emoji: '💺', price: 240, w: 0.9, d: 0.9, color: '#f7a8b8', seats: [[0, 0.1, 0.45]],
  build(c) {
    const s = new Shape();
    s.add(G.box(0.85, 0.3, 0.8), dark(c, 0.1), { pos: [0, 0.25, 0] });
    s.add(G.box(0.65, 0.14, 0.65), light(c, 0.15), { pos: [0, 0.46, 0.05] });
    s.add(G.box(0.85, 0.6, 0.2), c, { pos: [0, 0.7, -0.32] });
    for (const x of [-0.4, 0.4]) s.add(G.capsule(0.11, 0.55, 4, 8), c, { pos: [x, 0.52, 0], rot: [Math.PI / 2, 0, 0] });
    legs(s, 0.8, 0.75, 0.1, WOOD_D);
    return s.build();
  },
});
def('pouf', {
  label: 'Pouf', emoji: '🟣', price: 90, w: 0.6, d: 0.6, color: '#ffd84d', where: 'both', seats: [[0, 0, 0.4]],
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.3, 0.3, 0.32, 16), c, { pos: [0, 0.2, 0] });
    s.add(G.sphere(0.3, 16, 8), light(c, 0.2), { pos: [0, 0.36, 0], scale: [1, 0.25, 1] });
    s.add(G.torus(0.3, 0.03, 6, 20), dark(c, 0.15), { pos: [0, 0.05, 0], rot: [Math.PI / 2, 0, 0] });
    return s.build();
  },
});
def('table-basse', {
  label: 'Table basse', emoji: '☕', price: 150, w: 1.1, d: 0.6, color: WOOD,
  build(c) {
    const s = new Shape();
    s.add(G.box(1.1, 0.06, 0.6), c, { pos: [0, 0.42, 0] });
    s.add(G.box(1.0, 0.04, 0.5), dark(c, 0.1), { pos: [0, 0.15, 0] });
    legs(s, 1.1, 0.6, 0.42, dark(c, 0.2), 0.03);
    s.add(G.cyl(0.05, 0.04, 0.09, 10), '#ffffff', { pos: [0.25, 0.5, 0.05] });
    s.add(G.torus(0.03, 0.01, 4, 8), '#ffffff', { pos: [0.31, 0.5, 0.05], rot: [0, Math.PI / 2, 0] });
    s.add(G.box(0.25, 0.04, 0.18), '#e5484d', { pos: [-0.2, 0.47, 0] });
    return s.build();
  },
});
def('table', {
  label: 'Table à manger', emoji: '🍽️', price: 200, w: 1.4, d: 0.9, color: WOOD, where: 'in',
  build(c) {
    const s = new Shape();
    s.add(G.box(1.4, 0.07, 0.9), c, { pos: [0, 0.78, 0] });
    legs(s, 1.4, 0.9, 0.76, dark(c, 0.2), 0.045, 0.1);
    s.add(G.box(1.2, 0.01, 0.35), '#ff8fab', { pos: [0, 0.82, 0] });
    s.add(G.cyl(0.07, 0.05, 0.16, 8), '#8fd6e8', { pos: [0, 0.9, 0] });
    flowers(s, 0, 1.02, 0, '#ffd84d', 5, 0.06);
    return s.build();
  },
});
def('table-ronde', {
  label: 'Guéridon', emoji: '🟤', price: 160, w: 1.0, d: 1.0, color: '#fffaf2',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.5, 0.5, 0.06, 20), c, { pos: [0, 0.75, 0] });
    s.add(G.cyl(0.05, 0.07, 0.72, 8), WOOD_D, { pos: [0, 0.38, 0] });
    s.add(G.cyl(0.25, 0.28, 0.04, 12), WOOD_D, { pos: [0, 0.02, 0] });
    s.add(G.cyl(0.12, 0.12, 0.03, 12), '#ffffff', { pos: [0.1, 0.8, 0.1] });
    s.add(G.cyl(0.09, 0.11, 0.06, 12), '#f2c77e', { pos: [0.1, 0.83, 0.1] });
    return s.build();
  },
});
def('chaise', {
  label: 'Chaise', emoji: '🪑', price: 90, w: 0.5, d: 0.5, color: '#f7a8b8', seats: [[0, 0, 0.5]],
  build(c) {
    const s = new Shape();
    s.add(G.box(0.46, 0.05, 0.46), WOOD, { pos: [0, 0.45, 0] });
    s.add(G.box(0.4, 0.05, 0.4), c, { pos: [0, 0.49, 0.02] });
    s.add(G.box(0.46, 0.4, 0.04), WOOD, { pos: [0, 0.75, -0.21] });
    s.add(G.box(0.3, 0.2, 0.02), c, { pos: [0, 0.78, -0.19] });
    legs(s, 0.46, 0.46, 0.44, WOOD_D, 0.025, 0.04);
    return s.build();
  },
});
def('tapis-rond', {
  label: 'Tapis rond', emoji: '⭕', price: 110, w: 2.0, d: 2.0, color: '#f7a8b8', rug: true,
  build(c) {
    const s = new Shape();
    s.add(G.cyl(1.0, 1.0, 0.02, 32), c, { pos: [0, 0.011, 0] });
    s.add(G.cyl(0.75, 0.75, 0.02, 32), light(c, 0.45), { pos: [0, 0.015, 0] });
    s.add(G.cyl(0.4, 0.4, 0.02, 24), c, { pos: [0, 0.019, 0] });
    return s.build();
  },
});
def('tapis', {
  label: 'Grand tapis', emoji: '🟥', price: 150, w: 2.4, d: 1.6, color: '#8fd6e8', rug: true,
  build(c) {
    const s = new Shape();
    s.add(G.box(2.4, 0.02, 1.6), c, { pos: [0, 0.011, 0] });
    s.add(G.box(2.1, 0.02, 1.3), '#fffaf2', { pos: [0, 0.015, 0] });
    s.add(G.box(1.8, 0.02, 1.0), light(c, 0.3), { pos: [0, 0.019, 0] });
    for (let i = 0; i < 6; i++) s.add(G.box(0.02, 0.01, 0.12), '#fffaf2', { pos: [-1.0 + i * 0.4, 0.01, 0.86] });
    return s.build();
  },
});
def('lampadaire', {
  label: 'Lampadaire', emoji: '💡', price: 180, w: 0.5, d: 0.5, color: '#ffd84d',
  light: { y: 1.55, color: '#ffd89a', intensity: 5, dist: 7 },
  build() {
    const s = new Shape();
    s.add(G.cyl(0.2, 0.22, 0.05, 14), METAL, { pos: [0, 0.03, 0] });
    s.add(G.cyl(0.02, 0.02, 1.5, 6), METAL, { pos: [0, 0.78, 0] });
    return s.build();
  },
  glow(c) {
    return new Shape().add(G.cyl(0.15, 0.26, 0.3, 14, true), c, { pos: [0, 1.6, 0] }).build();
  },
});
def('bibliotheque', {
  label: 'Bibliothèque', emoji: '📚', price: 320, w: 1.2, d: 0.4, color: WOOD,
  build(c) {
    const s = new Shape();
    s.add(G.box(1.2, 1.9, 0.05), dark(c, 0.1), { pos: [0, 0.95, -0.18] });
    for (const x of [-0.58, 0.58]) s.add(G.box(0.05, 1.9, 0.4), c, { pos: [x, 0.95, 0] });
    const cols = ['#e5484d', '#6fa8dc', '#ffd84d', '#6fcf97', '#b69cf0', '#f7a8b8', '#ff8a3d'];
    for (let r = 0; r < 4; r++) {
      s.add(G.box(1.15, 0.04, 0.38), c, { pos: [0, 0.05 + r * 0.47, 0] });
      let x = -0.5;
      let k = r * 3;
      while (x < 0.45) {
        const w = 0.06 + ((k * 7) % 5) * 0.012;
        const h = 0.28 + ((k * 3) % 4) * 0.03;
        s.add(G.box(w, h, 0.26), cols[k % cols.length], { pos: [x + w / 2, 0.07 + r * 0.47 + h / 2, 0.02], rot: [0, 0, k % 6 === 0 ? 0.15 : 0] });
        x += w + 0.01;
        k++;
      }
    }
    s.add(G.box(1.2, 0.04, 0.4), c, { pos: [0, 1.9, 0] });
    return s.build();
  },
});
def('cheminee', {
  label: 'Cheminée', emoji: '🔥', price: 900, w: 1.5, d: 0.6, color: '#d6ccbb', anim: 'fire',
  light: { y: 0.5, color: '#ff9a4a', intensity: 7, dist: 8, flicker: true },
  build(c) {
    const s = new Shape();
    s.add(G.box(1.5, 1.2, 0.6), c, { pos: [0, 0.6, 0] });
    s.add(G.box(1.7, 0.12, 0.72), WOOD, { pos: [0, 1.25, 0.02] });
    s.add(G.box(0.8, 0.6, 0.3), '#3b2a2a', { pos: [0, 0.4, 0.18] });
    s.add(G.box(1.0, 0.1, 0.4), dark(c, 0.2), { pos: [0, 0.05, 0.25] });
    for (const x of [-0.12, 0.12]) s.add(G.cyl(0.05, 0.05, 0.5, 6), '#8f6243', { pos: [x, 0.15, 0.2], rot: [0, 0.4, Math.PI / 2] });
    s.add(G.box(0.25, 0.2, 0.05), '#ffd84d', { pos: [-0.45, 1.42, 0.05] });
    s.add(G.cyl(0.06, 0.05, 0.2, 8), '#f7a8b8', { pos: [0.45, 1.41, 0.05] });
    return s.build();
  },
  glow() {
    const s = new Shape();
    s.add(G.cone(0.14, 0.4, 7), '#ffb347', { pos: [0, 0.35, 0.2] });
    s.add(G.cone(0.1, 0.3, 7), '#ffe066', { pos: [-0.14, 0.3, 0.22] });
    s.add(G.cone(0.1, 0.3, 7), '#ff8a3d', { pos: [0.14, 0.3, 0.2] });
    return s.build();
  },
});
def('tourne-disque', {
  label: 'Tourne-disque', emoji: '🎵', price: 380, w: 0.7, d: 0.5, color: '#c98b58', music: true,
  build(c) {
    const s = new Shape();
    s.add(G.box(0.7, 0.6, 0.5), c, { pos: [0, 0.36, 0] });
    s.add(G.box(0.6, 0.35, 0.02), dark(c, 0.2), { pos: [0, 0.36, 0.26] });
    legs(s, 0.7, 0.5, 0.06);
    s.add(G.box(0.6, 0.08, 0.45), '#3d3744', { pos: [0, 0.7, 0] });
    s.add(G.cyl(0.18, 0.18, 0.02, 20), '#2e2e3a', { pos: [-0.05, 0.75, 0] });
    s.add(G.cyl(0.05, 0.05, 0.022, 10), '#e5484d', { pos: [-0.05, 0.76, 0] });
    s.add(G.box(0.02, 0.02, 0.25), '#b8c0cc', { pos: [0.2, 0.78, -0.02], rot: [0, 0.4, 0] });
    return s.build();
  },
});
def('piano', {
  label: 'Petit piano', emoji: '🎹', price: 1100, w: 1.3, d: 0.6, color: '#3d3744', music: 'piano', seats: [],
  build(c) {
    const s = new Shape();
    s.add(G.box(1.3, 1.1, 0.45), c, { pos: [0, 0.65, -0.05] });
    s.add(G.box(1.2, 0.06, 0.3), '#ffffff', { pos: [0, 0.72, 0.28] });
    for (let i = 0; i < 9; i++) s.add(G.box(0.05, 0.04, 0.16), '#2e2e3a', { pos: [-0.5 + i * 0.125, 0.76, 0.22] });
    s.add(G.box(1.3, 0.1, 0.35), c, { pos: [0, 0.65, 0.25] });
    legs(s, 1.2, 0.5, 0.1, dark(c, 0.3));
    s.add(G.cyl(0.05, 0.05, 0.14, 8), '#ffd84d', { pos: [-0.4, 1.28, -0.05] });
    return s.build();
  },
});
def('bureau', {
  label: 'Bureau', emoji: '🖋️', price: 260, w: 1.2, d: 0.6, color: WOOD,
  build(c) {
    const s = new Shape();
    s.add(G.box(1.2, 0.06, 0.6), c, { pos: [0, 0.75, 0] });
    s.add(G.box(0.4, 0.7, 0.55), dark(c, 0.1), { pos: [0.38, 0.37, 0] });
    for (let i = 0; i < 3; i++) s.add(G.sphere(0.025, 5, 4), '#ffd84d', { pos: [0.38, 0.2 + i * 0.22, 0.28] });
    s.add(G.box(0.05, 0.72, 0.55), dark(c, 0.1), { pos: [-0.57, 0.37, 0] });
    s.add(G.box(0.3, 0.04, 0.22), '#fffaf2', { pos: [-0.15, 0.8, 0.05], rot: [0, 0.2, 0] });
    s.add(G.box(0.2, 0.1, 0.15), '#e5484d', { pos: [0.3, 0.83, -0.1] });
    s.add(G.cyl(0.04, 0.035, 0.1, 8), '#8fd6e8', { pos: [-0.45, 0.83, -0.12] });
    return s.build();
  },
});

// --- Cuisine ------------------------------------------------------------------
def('cuisiniere', {
  label: 'Cuisinière', emoji: '🍳', price: 0, w: 0.8, d: 0.7, color: '#8fd6e8', stove: true,
  build(c) {
    const s = new Shape();
    s.add(G.box(0.8, 0.85, 0.7), c, { pos: [0, 0.45, 0] });
    s.add(G.box(0.84, 0.05, 0.74), '#fffaf2', { pos: [0, 0.9, 0] });
    s.add(G.box(0.6, 0.4, 0.02), '#3d3744', { pos: [0, 0.4, 0.36] });
    s.add(G.box(0.5, 0.04, 0.04), '#b8c0cc', { pos: [0, 0.66, 0.38] });
    for (const [x, z] of [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]]) s.add(G.torus(0.09, 0.015, 4, 12), '#3d3744', { pos: [x, 0.93, z], rot: [Math.PI / 2, 0, 0] });
    s.add(G.cyl(0.14, 0.12, 0.18, 12), '#e5484d', { pos: [-0.2, 1.02, -0.15] });
    s.add(G.cyl(0.15, 0.15, 0.02, 12), '#e5484d', { pos: [-0.2, 1.12, -0.15] });
    s.add(G.box(0.8, 0.12, 0.04), dark(c, 0.15), { pos: [0, 1.0, -0.34] });
    for (let i = 0; i < 3; i++) s.add(G.cyl(0.025, 0.025, 0.03, 8), '#fffaf2', { pos: [-0.25 + i * 0.25, 1.0, -0.31], rot: [Math.PI / 2, 0, 0] });
    return s.build();
  },
});
def('frigo', {
  label: 'Frigo rétro', emoji: '🧊', price: 450, w: 0.8, d: 0.7, color: '#b5e48c',
  build(c) {
    const s = new Shape();
    s.add(G.box(0.8, 1.7, 0.7), c, { pos: [0, 0.9, 0] });
    s.add(G.sphere(0.4, 16, 8, 0), c, { pos: [0, 1.75, 0], scale: [1, 0.3, 0.87] });
    s.add(G.box(0.76, 0.02, 0.02), dark(c, 0.2), { pos: [0, 1.2, 0.36] });
    s.add(G.box(0.04, 0.3, 0.05), '#b8c0cc', { pos: [0.3, 1.45, 0.38] });
    s.add(G.box(0.04, 0.3, 0.05), '#b8c0cc', { pos: [0.3, 0.95, 0.38] });
    s.add(G.sphere(0.05, 8, 6), '#e5484d', { pos: [-0.15, 1.5, 0.36], scale: [1, 1, 0.3] });
    s.add(G.sphere(0.05, 8, 6), '#ffd84d', { pos: [0, 1.4, 0.36], scale: [1, 1, 0.3] });
    legs(s, 0.7, 0.6, 0.06, METAL);
    return s.build();
  },
});
def('plan-travail', {
  label: 'Plan de travail', emoji: '🔪', price: 280, w: 1.2, d: 0.6, color: '#fffaf2',
  build(c) {
    const s = new Shape();
    s.add(G.box(1.2, 0.85, 0.6), c, { pos: [0, 0.43, 0] });
    s.add(G.box(1.24, 0.06, 0.64), WOOD, { pos: [0, 0.88, 0] });
    for (const x of [-0.3, 0.3]) {
      s.add(G.box(0.55, 0.7, 0.02), light(c, 0.2), { pos: [x, 0.43, 0.31] });
      s.add(G.sphere(0.025, 6, 4), '#ffd84d', { pos: [x + (x < 0 ? 0.2 : -0.2), 0.6, 0.33] });
    }
    s.add(G.box(0.45, 0.04, 0.35), '#b8c0cc', { pos: [0.25, 0.92, 0] });
    s.add(G.cyl(0.02, 0.02, 0.25, 6), '#b8c0cc', { pos: [0.25, 1.02, -0.2] });
    s.add(G.box(0.3, 0.03, 0.2), WOOD_D, { pos: [-0.3, 0.92, 0.05] });
    s.add(G.sphere(0.06, 8, 6), '#e5484d', { pos: [-0.3, 0.97, 0.05] });
    return s.build();
  },
});
def('caisse-fruits', {
  label: 'Cagette de fruits', emoji: '🍎', price: 90, w: 0.8, d: 0.5, color: WOOD, where: 'both',
  build(c) {
    const s = new Shape();
    s.add(G.box(0.8, 0.3, 0.5), c, { pos: [0, 0.15, 0] });
    const fr = ['#e5484d', '#ffd84d', '#ff8a3d', '#b5e48c'];
    for (let i = 0; i < 8; i++) s.add(G.sphere(0.09, 8, 6), fr[i % 4], { pos: [-0.27 + (i % 4) * 0.18, 0.33, -0.1 + Math.floor(i / 4) * 0.2] });
    return s.build();
  },
});

// --- Plantes & animaux ----------------------------------------------------------
def('plante', {
  label: 'Plante en pot', emoji: '🪴', price: 70, w: 0.5, d: 0.5, color: '#e0a07a', where: 'both',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.2, 0.15, 0.35, 12), c, { pos: [0, 0.18, 0] });
    s.add(G.torus(0.2, 0.03, 5, 14), dark(c, 0.1), { pos: [0, 0.35, 0], rot: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      s.add(G.sphere(0.14, 8, 6), i % 2 ? '#5fae55' : '#79c265', { pos: [Math.cos(a) * 0.1, 0.5 + (i % 2) * 0.1, Math.sin(a) * 0.1], scale: [1, 0.8, 1] });
    }
    return s.build();
  },
});
def('plante-grande', {
  label: 'Grande plante', emoji: '🌿', price: 150, w: 0.7, d: 0.7, color: '#fffaf2', where: 'both',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.26, 0.2, 0.45, 12), c, { pos: [0, 0.23, 0] });
    s.add(G.cyl(0.02, 0.03, 1.0, 5), '#5fae55', { pos: [0, 0.9, 0] });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      s.add(G.sphere(0.22, 8, 5), i % 2 ? '#3f8f45' : '#5fae55', { pos: [Math.cos(a) * 0.25, 0.8 + (i % 3) * 0.25, Math.sin(a) * 0.25], rot: [0, -a, 0.6], scale: [1.3, 0.15, 0.7] });
    }
    return s.build();
  },
});
def('cactus', {
  label: 'Cactus', emoji: '🌵', price: 60, w: 0.4, d: 0.4, color: '#f7a8b8', where: 'both',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.16, 0.12, 0.25, 10), c, { pos: [0, 0.13, 0] });
    s.add(G.capsule(0.09, 0.35, 4, 8), '#5fae55', { pos: [0, 0.5, 0] });
    s.add(G.capsule(0.05, 0.12, 4, 8), '#5fae55', { pos: [0.12, 0.55, 0], rot: [0, 0, -0.9] });
    s.add(G.sphere(0.04, 6, 4), '#ff8fab', { pos: [0, 0.78, 0] });
    return s.build();
  },
});
def('aquarium', {
  label: 'Aquarium', emoji: '🐠', price: 700, w: 1.2, d: 0.5, color: WOOD, anim: 'fish',
  build(c) {
    const s = new Shape();
    s.add(G.box(1.2, 0.6, 0.5), c, { pos: [0, 0.3, 0] });
    s.add(G.box(1.1, 0.05, 0.42), '#f3dfae', { pos: [0, 0.63, 0] });
    s.add(G.box(1.2, 0.05, 0.5), METAL, { pos: [0, 1.25, 0] });
    for (const [x, h] of [[-0.4, 0.3], [-0.3, 0.2], [0.35, 0.35]]) s.add(G.cone(0.05, h, 5), '#5fae55', { pos: [x, 0.65 + h / 2, -0.1] });
    return s.build();
  },
  glow() {
    return new Shape().add(G.box(1.16, 0.58, 0.46), '#bfeaff', { pos: [0, 0.94, 0] }).build();
  },
  transparentGlow: true,
});
def('arbre-chat', {
  label: 'Arbre à chat', emoji: '🐈', price: 350, w: 0.9, d: 0.9, color: '#f7a8b8', where: 'both',
  build(c) {
    const s = new Shape();
    s.add(G.box(0.9, 0.08, 0.9), c, { pos: [0, 0.04, 0] });
    for (const [x, z, h] of [[-0.25, -0.25, 1.4], [0.25, 0.2, 0.8]]) s.add(G.cyl(0.07, 0.07, h, 8), '#e9d5b7', { pos: [x, h / 2, z] });
    s.add(G.box(0.6, 0.06, 0.5), c, { pos: [0.2, 0.82, 0.15] });
    s.add(G.box(0.5, 0.06, 0.5), c, { pos: [-0.2, 1.42, -0.2] });
    s.add(G.torus(0.18, 0.06, 6, 12), light(c, 0.3), { pos: [-0.2, 1.5, -0.2], rot: [Math.PI / 2, 0, 0] });
    s.add(G.sphere(0.05, 6, 4), '#ffd84d', { pos: [0.4, 0.65, 0.35] });
    s.add(G.cyl(0.005, 0.005, 0.15, 3), '#ffffff', { pos: [0.4, 0.75, 0.35] });
    return s.build();
  },
});
def('panier', {
  label: 'Panier pour animal', emoji: '🧺', price: 160, w: 0.9, d: 0.7, color: '#ff8fab', where: 'both', petBed: true,
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.45, 0.4, 0.2, 18, false), '#c98b58', { pos: [0, 0.1, 0], scale: [1, 1, 0.78] });
    s.add(G.torus(0.42, 0.08, 6, 20), '#d9a86c', { pos: [0, 0.22, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 0.78, 1] });
    s.add(G.cyl(0.36, 0.36, 0.08, 18), c, { pos: [0, 0.22, 0], scale: [1, 1, 0.78] });
    s.add(G.sphere(0.08, 8, 6), '#ffffff', { pos: [0.2, 0.3, -0.1], scale: [1, 0.5, 1] });
    return s.build();
  },
});
def('gamelle', {
  label: 'Gamelles', emoji: '🥣', price: 60, w: 0.6, d: 0.4, color: '#6fa8dc', where: 'both',
  build(c) {
    const s = new Shape();
    for (const x of [-0.15, 0.15]) {
      s.add(G.cyl(0.13, 0.1, 0.1, 14), c, { pos: [x, 0.05, 0] });
      s.add(G.cyl(0.1, 0.1, 0.02, 12), x < 0 ? '#c8844e' : '#8fd6e8', { pos: [x, 0.1, 0] });
    }
    return s.build();
  },
});

// --- Murs -------------------------------------------------------------------------
def('tableau', {
  label: 'Tableau', emoji: '🖼️', price: 200, w: 1.0, d: 0.1, color: '#ffd84d', wall: true, mountY: 1.7,
  build(c) {
    const s = new Shape();
    s.add(G.box(1.0, 0.75, 0.06), c, { pos: [0, 0, 0] });
    s.add(G.box(0.86, 0.6, 0.02), '#9ed8f5', { pos: [0, 0, 0.03] });
    s.add(G.sphere(0.35, 12, 6, 0), '#6fcf97', { pos: [-0.15, -0.3, 0.04], scale: [1.2, 0.6, 0.05] });
    s.add(G.sphere(0.3, 12, 6), '#5fae55', { pos: [0.25, -0.3, 0.045], scale: [1, 0.5, 0.05] });
    s.add(G.sphere(0.08, 10, 6), '#ffd84d', { pos: [0.28, 0.15, 0.04], scale: [1, 1, 0.2] });
    return s.build();
  },
});
def('horloge', {
  label: 'Horloge', emoji: '🕰️', price: 140, w: 0.5, d: 0.1, color: '#f7a8b8', wall: true, mountY: 2.0,
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.25, 0.25, 0.06, 20), c, { rot: [Math.PI / 2, 0, 0] });
    s.add(G.cyl(0.21, 0.21, 0.02, 20), '#fffaf2', { pos: [0, 0, 0.03], rot: [Math.PI / 2, 0, 0] });
    s.add(G.box(0.02, 0.14, 0.01), '#3d3744', { pos: [0, 0.06, 0.05] });
    s.add(G.box(0.1, 0.02, 0.01), '#3d3744', { pos: [0.04, 0, 0.05] });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      s.add(G.box(0.015, 0.03, 0.01), '#3d3744', { pos: [Math.sin(a) * 0.17, Math.cos(a) * 0.17, 0.045], rot: [0, 0, -a] });
    }
    return s.build();
  },
});
def('etagere', {
  label: 'Étagère murale', emoji: '🪜', price: 130, w: 1.0, d: 0.3, color: WOOD, wall: true, mountY: 1.5,
  build(c) {
    const s = new Shape();
    s.add(G.box(1.0, 0.05, 0.28), c, { pos: [0, 0, 0.04] });
    for (const x of [-0.4, 0.4]) s.add(G.box(0.04, 0.15, 0.2), dark(c, 0.2), { pos: [x, -0.08, 0] });
    s.add(G.cyl(0.07, 0.05, 0.12, 8), '#e0a07a', { pos: [-0.3, 0.09, 0.04] });
    s.add(G.sphere(0.09, 8, 6), '#5fae55', { pos: [-0.3, 0.2, 0.04] });
    for (let i = 0; i < 4; i++) s.add(G.box(0.05, 0.22, 0.15), ['#e5484d', '#6fa8dc', '#ffd84d', '#b69cf0'][i], { pos: [0.05 + i * 0.06, 0.13, 0.04] });
    s.add(G.sphere(0.06, 8, 6), '#f7a8b8', { pos: [0.38, 0.08, 0.04] });
    return s.build();
  },
});
def('guirlande', {
  label: 'Guirlande lumineuse', emoji: '✨', price: 170, w: 2.0, d: 0.1, color: '#ffd84d', wall: true, mountY: 2.75,
  build() {
    const s = new Shape();
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const x = -1 + (i / 16) * 2;
      pts.push(new THREE.Vector3(x, -Math.sin((i / 16) * Math.PI) * 0.25, 0.05));
    }
    s.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.008, 4), '#4e4c62');
    return s.build();
  },
  glow() {
    const s = new Shape();
    const cols = ['#ffd84d', '#ff8fab', '#8fd6e8', '#b5e48c', '#b69cf0'];
    for (let i = 1; i < 16; i += 2) {
      const x = -1 + (i / 16) * 2;
      s.add(G.sphere(0.045, 8, 6), cols[(i >> 1) % cols.length], { pos: [x, -Math.sin((i / 16) * Math.PI) * 0.25 - 0.04, 0.06] });
    }
    return s.build();
  },
});

// --- Jardin ---------------------------------------------------------------------
def('banc-jardin', {
  label: 'Banc de jardin', emoji: '🪑', price: 220, w: 1.6, d: 0.6, color: '#fffaf2', where: 'out', seats: [[-0.4, 0, 0.48], [0.4, 0, 0.48]],
  build(c) {
    const s = new Shape();
    for (let i = 0; i < 3; i++) s.add(G.box(1.6, 0.05, 0.14), c, { pos: [0, 0.45, -0.15 + i * 0.16] });
    for (let i = 0; i < 2; i++) s.add(G.box(1.6, 0.12, 0.04), c, { pos: [0, 0.7 + i * 0.18, -0.27], rot: [-0.12, 0, 0] });
    for (const x of [-0.7, 0.7]) {
      s.add(G.box(0.06, 0.45, 0.5), dark(c, 0.25), { pos: [x, 0.22, 0] });
      s.add(G.box(0.06, 0.95, 0.06), dark(c, 0.25), { pos: [x, 0.47, -0.27] });
    }
    return s.build();
  },
});
def('lanterne', {
  label: 'Lanterne de jardin', emoji: '🏮', price: 150, w: 0.4, d: 0.4, color: METAL, where: 'out',
  light: { y: 1.2, color: '#ffd89a', intensity: 4, dist: 6, night: true },
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.04, 0.05, 1.0, 6), c, { pos: [0, 0.5, 0] });
    s.add(G.cyl(0.16, 0.12, 0.05, 6), c, { pos: [0, 1.02, 0] });
    s.add(G.cone(0.2, 0.18, 6), c, { pos: [0, 1.42, 0] });
    return s.build();
  },
  glow() {
    return new Shape().add(G.cyl(0.12, 0.12, 0.28, 6), '#ffffff', { pos: [0, 1.19, 0] }).build();
  },
});
def('bain-oiseaux', {
  label: 'Bain d\'oiseaux', emoji: '🐦', price: 190, w: 0.7, d: 0.7, color: '#d6ccbb', where: 'out',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.25, 0.3, 0.1, 12), c, { pos: [0, 0.05, 0] });
    s.add(G.cyl(0.08, 0.12, 0.7, 10), c, { pos: [0, 0.45, 0] });
    s.add(G.cyl(0.35, 0.18, 0.15, 16), c, { pos: [0, 0.85, 0] });
    s.add(G.cyl(0.3, 0.3, 0.02, 16), '#8fe3f0', { pos: [0, 0.91, 0] });
    s.add(G.sphere(0.06, 8, 6), '#6fa8dc', { pos: [0.28, 0.98, 0], scale: [1.3, 1, 1] });
    s.add(G.sphere(0.04, 8, 6), '#6fa8dc', { pos: [0.33, 1.05, 0] });
    s.add(G.cone(0.015, 0.04, 4), '#ffa53a', { pos: [0.38, 1.05, 0], rot: [0, 0, -Math.PI / 2] });
    return s.build();
  },
});
def('pot-fleurs', {
  label: 'Pot de fleurs', emoji: '💐', price: 80, w: 0.6, d: 0.6, color: '#f7a8b8', where: 'both',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.25, 0.18, 0.35, 12), '#e0a07a', { pos: [0, 0.18, 0] });
    s.add(G.cyl(0.23, 0.23, 0.04, 12), '#6b4a3a', { pos: [0, 0.34, 0] });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      s.add(G.cyl(0.01, 0.01, 0.25, 4), '#5fae55', { pos: [Math.cos(a) * 0.1, 0.46, Math.sin(a) * 0.1] });
      flowers(s, Math.cos(a) * 0.12, 0.58, Math.sin(a) * 0.12, i % 2 ? c : '#ffd84d', 5, 0.045);
    }
    return s.build();
  },
});
def('nain', {
  label: 'Nain de jardin', emoji: '🧙', price: 120, w: 0.4, d: 0.4, color: '#e5484d', where: 'out',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.14, 0.17, 0.3, 10), '#6fa8dc', { pos: [0, 0.15, 0] });
    s.add(G.sphere(0.12, 10, 8), '#fbd5bd', { pos: [0, 0.42, 0] });
    s.add(G.cone(0.13, 0.3, 10), c, { pos: [0, 0.65, -0.02], rot: [-0.2, 0, 0] });
    s.add(G.cone(0.1, 0.18, 8), '#ffffff', { pos: [0, 0.32, 0.08], rot: [Math.PI + 0.3, 0, 0] });
    s.add(G.sphere(0.03, 6, 4), '#ff8fab', { pos: [0, 0.42, 0.12] });
    return s.build();
  },
});
def('balancoire', {
  label: 'Balançoire', emoji: '🎠', price: 480, w: 2.0, d: 1.2, color: '#ff8fab', where: 'out', seats: [[0, 0, 0.55]], anim: 'swing',
  build() {
    const s = new Shape();
    for (const x of [-0.95, 0.95]) {
      s.add(G.cyl(0.06, 0.06, 2.3, 6), WOOD, { pos: [x, 1.1, -0.4], rot: [-0.35, 0, 0] });
      s.add(G.cyl(0.06, 0.06, 2.3, 6), WOOD, { pos: [x, 1.1, 0.4], rot: [0.35, 0, 0] });
    }
    s.add(G.cyl(0.06, 0.06, 2.0, 6), WOOD_D, { pos: [0, 2.15, 0], rot: [0, 0, Math.PI / 2] });
    return s.build();
  },
  swing(c) {
    const s = new Shape();
    for (const x of [-0.3, 0.3]) s.add(G.cyl(0.012, 0.012, 1.6, 4), '#fffaf2', { pos: [x, -0.8, 0] });
    s.add(G.box(0.7, 0.06, 0.35), c, { pos: [0, -1.62, 0] });
    return s.build();
  },
});
def('table-jardin', {
  label: 'Salon de jardin', emoji: '⛱️', price: 520, w: 1.8, d: 1.8, color: '#8fd6e8', where: 'out',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.45, 0.45, 0.05, 16), '#fffaf2', { pos: [0, 0.72, 0] });
    s.add(G.cyl(0.04, 0.06, 0.7, 6), '#fffaf2', { pos: [0, 0.36, 0] });
    s.add(G.cyl(0.02, 0.02, 2.2, 5), '#fffaf2', { pos: [0, 1.4, 0] });
    for (let i = 0; i < 8; i++) {
      const g = new THREE.ConeGeometry(1.0, 0.35, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4);
      s.add(g, i % 2 ? '#ffffff' : c, { pos: [0, 2.35, 0] });
    }
    for (const a of [0, Math.PI]) s.add(G.cyl(0.18, 0.18, 0.4, 10), c, { pos: [Math.sin(a) * 0.75, 0.2, Math.cos(a) * 0.75] });
    return s.build();
  },
  doubleSide: true,
});
def('arche', {
  label: 'Arche de roses', emoji: '🌹', price: 600, w: 1.8, d: 0.5, color: '#ff8fab', where: 'out',
  build(c) {
    const s = new Shape();
    for (const x of [-0.8, 0.8]) s.add(G.cyl(0.04, 0.04, 1.6, 6), '#fffaf2', { pos: [x, 0.8, 0] });
    s.add(G.torus(0.8, 0.04, 6, 24, Math.PI), '#fffaf2', { pos: [0, 1.6, 0] });
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const a = Math.PI * t;
      const x = i < 3 ? -0.8 : i > 10 ? 0.8 : Math.cos(a) * 0.8;
      const y = i < 3 ? 0.4 + i * 0.4 : i > 10 ? 0.4 + (13 - i) * 0.4 : 1.6 + Math.sin(a) * 0.8;
      s.add(G.sphere(0.12, 8, 6), '#5fae55', { pos: [x, y, 0.02] });
      if (i % 2 === 0) s.add(G.sphere(0.08, 8, 6), c, { pos: [x + 0.05, y + 0.04, 0.1] });
    }
    return s.build();
  },
});
def('trophee', {
  label: 'Cœur de Doucebrise', emoji: '🏆', price: 0, w: 0.6, d: 0.6, color: '#ffd84d', where: 'both', noShop: true,
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.28, 0.3, 0.5, 12), '#fffaf2', { pos: [0, 0.25, 0] });
    s.add(G.cyl(0.32, 0.32, 0.06, 12), c, { pos: [0, 0.52, 0] });
    const hs = new THREE.Shape();
    hs.moveTo(0, -0.22);
    hs.bezierCurveTo(-0.34, 0.02, -0.16, 0.26, 0, 0.1);
    hs.bezierCurveTo(0.16, 0.26, 0.34, 0.02, 0, -0.22);
    const hg = new THREE.ExtrudeGeometry(hs, { depth: 0.1, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 10 });
    hg.translate(0, 0, -0.05);
    s.add(hg, '#ff6f91', { pos: [0, 0.82, 0] });
    return s.build();
  },
});


// --- Nouveautés : chambre -----------------------------------------------------------
def('armoire', {
  label: 'Armoire', emoji: '🚪', price: 380, w: 1.3, d: 0.6, color: '#fffaf2', cat: 'chambre',
  build(c) {
    const s = new Shape();
    s.add(G.box(1.3, 2.0, 0.6), c, { pos: [0, 1.08, 0] });
    s.add(G.box(1.4, 0.1, 0.66), dark(c, 0.12), { pos: [0, 2.12, 0] });
    for (const x of [-0.32, 0.32]) {
      s.add(G.box(0.6, 1.8, 0.03), light(c, 0.2), { pos: [x, 1.1, 0.31] });
      s.add(G.box(0.4, 0.6, 0.02), dark(c, 0.06), { pos: [x, 1.45, 0.33] });
      s.add(G.sphere(0.035, 6, 5), '#ffd84d', { pos: [x > 0 ? 0.06 : -0.06, 1.1, 0.35] });
    }
    legs(s, 1.3, 0.6, 0.08);
    return s.build();
  },
});
def('coiffeuse', {
  label: 'Coiffeuse', emoji: '💄', price: 340, w: 1.1, d: 0.5, color: '#f7a8b8', cat: 'chambre',
  build(c) {
    const s = new Shape();
    s.add(G.box(1.1, 0.08, 0.5), WHITE, { pos: [0, 0.75, 0] });
    s.add(G.box(0.4, 0.3, 0.45), c, { pos: [-0.33, 0.58, 0] });
    s.add(G.box(0.4, 0.3, 0.45), c, { pos: [0.33, 0.58, 0] });
    legs(s, 1.1, 0.5, 0.72, WHITE, 0.03);
    s.add(G.cyl(0.36, 0.36, 0.04, 20), WHITE, { pos: [0, 1.25, -0.2], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 1.25] });
    s.add(G.cyl(0.31, 0.31, 0.02, 20), '#dff4ff', { pos: [0, 1.25, -0.17], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 1.25] });
    s.add(G.cyl(0.05, 0.04, 0.12, 8), '#ff6f91', { pos: [0.3, 0.85, 0.05] });
    s.add(G.sphere(0.05, 8, 6), '#b69cf0', { pos: [0.15, 0.82, 0.08] });
    s.add(G.box(0.12, 0.04, 0.08), '#ffd84d', { pos: [-0.3, 0.81, 0.05] });
    return s.build();
  },
});
def('lit-baldaquin', {
  label: 'Lit à baldaquin', emoji: '👑', price: 1200, w: 2.0, d: 2.3, color: '#b69cf0', bed: true, cat: 'chambre', doubleSide: true,
  build(c) {
    const s = new Shape();
    s.add(G.box(2.0, 0.32, 2.2), WOOD_D, { pos: [0, 0.26, 0] });
    s.add(G.box(1.9, 0.22, 2.1), WHITE, { pos: [0, 0.5, 0] });
    s.add(G.box(1.96, 0.14, 1.4), c, { pos: [0, 0.64, 0.36] });
    for (const x of [-0.45, 0.45]) s.add(G.sphere(0.25, 10, 6), WHITE, { pos: [x, 0.7, -0.75], scale: [1.5, 0.45, 0.9] });
    for (const x of [-0.95, 0.95]) for (const z of [-1.08, 1.08]) s.add(G.cyl(0.05, 0.05, 2.4, 8), WOOD_D, { pos: [x, 1.2, z] });
    s.add(G.box(2.05, 0.1, 2.25), WOOD_D, { pos: [0, 2.42, 0] });
    for (const x of [-1.0, 1.0]) s.add(G.box(0.02, 1.4, 2.1), light(c, 0.45), { pos: [x, 1.7, 0] });
    s.add(G.box(1.95, 0.35, 0.02), light(c, 0.3), { pos: [0, 2.2, 1.1] });
    s.add(G.box(2.1, 1.3, 0.12), WOOD_D, { pos: [0, 0.8, -1.12] });
    return s.build();
  },
});
def('peluche-geante', {
  label: 'Nounours géant', emoji: '🧸', price: 280, w: 0.9, d: 0.8, color: '#c98b58', cat: 'chambre', where: 'both',
  build(c) {
    const s = new Shape();
    s.add(G.sphere(0.36, 14, 10), c, { pos: [0, 0.4, 0], scale: [1, 1.05, 0.9] });
    s.add(G.sphere(0.2, 12, 8), light(c, 0.5), { pos: [0, 0.38, 0.22], scale: [1, 1.1, 0.5] });
    s.add(G.sphere(0.27, 14, 10), c, { pos: [0, 0.95, 0.02] });
    for (const x of [-0.18, 0.18]) {
      s.add(G.sphere(0.09, 10, 8), c, { pos: [x, 1.18, 0] });
      s.add(G.sphere(0.05, 8, 6), light(c, 0.5), { pos: [x, 1.18, 0.04] });
      s.add(G.sphere(0.12, 10, 8), c, { pos: [x * 1.9, 0.52, 0.12], scale: [1, 1.4, 1] });
      s.add(G.sphere(0.14, 10, 8), c, { pos: [x * 1.3, 0.12, 0.3], scale: [1, 0.8, 1.4] });
      s.add(G.sphere(0.03, 6, 5), '#2b1d1d', { pos: [x * 0.45, 1.0, 0.26] });
    }
    s.add(G.sphere(0.1, 10, 8), light(c, 0.5), { pos: [0, 0.9, 0.24], scale: [1.2, 0.8, 0.7] });
    s.add(G.sphere(0.035, 6, 5), '#2b1d1d', { pos: [0, 0.93, 0.31] });
    s.add(G.torus(0.12, 0.04, 6, 12), '#ff6f91', { pos: [0, 0.72, 0.05], rot: [Math.PI / 2, 0, 0] });
    return s.build();
  },
});
def('lampe-lune', {
  label: 'Lampe lune', emoji: '🌙', price: 0, w: 0.5, d: 0.5, color: '#fff3c4', cat: 'chambre', noShop: true,
  light: { y: 0.6, color: '#fff1c4', intensity: 3.5, dist: 6 },
  build() {
    const s = new Shape();
    s.add(G.cyl(0.18, 0.22, 0.06, 14), WOOD, { pos: [0, 0.03, 0] });
    s.add(G.cyl(0.015, 0.015, 0.2, 5), METAL, { pos: [0, 0.14, 0] });
    return s.build();
  },
  glow(c) {
    const s = new Shape();
    s.add(G.sphere(0.24, 16, 12), c, { pos: [0, 0.5, 0] });
    s.add(G.sphere(0.05, 8, 6), dark(c, 0.15), { pos: [0.1, 0.58, 0.19] });
    s.add(G.sphere(0.035, 8, 6), dark(c, 0.15), { pos: [-0.08, 0.44, 0.2] });
    return s.build();
  },
});
def('coussin-coeur', {
  label: 'Coussin cœur', emoji: '💗', price: 0, w: 0.6, d: 0.5, color: '#ff8fab', cat: 'chambre', where: 'both', noShop: true, seats: [[0, 0, 0.2]],
  build(c) {
    const s = new Shape();
    const hs = new THREE.Shape();
    hs.moveTo(0, -0.26);
    hs.bezierCurveTo(-0.4, 0.02, -0.2, 0.3, 0, 0.12);
    hs.bezierCurveTo(0.2, 0.3, 0.4, 0.02, 0, -0.26);
    const g = new THREE.ExtrudeGeometry(hs, { depth: 0.12, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3, curveSegments: 12 });
    g.rotateX(-Math.PI / 2);
    s.add(g, c, { pos: [0, 0.08, 0.02] });
    return s.build();
  },
});
def('fauteuil-nuage', {
  label: 'Fauteuil nuage', emoji: '☁️', price: 0, w: 1.1, d: 1.0, color: '#fffaf2', cat: 'salon', noShop: true, seats: [[0, 0.1, 0.4]],
  build(c) {
    const s = new Shape();
    for (const [x, y, z, r] of [[0, 0.28, 0.05, 0.42], [-0.4, 0.4, 0, 0.3], [0.4, 0.4, 0, 0.3], [0, 0.62, -0.3, 0.38], [-0.3, 0.6, -0.25, 0.28], [0.3, 0.6, -0.25, 0.28], [0, 0.85, -0.35, 0.25]]) {
      s.add(G.sphere(r, 12, 10), c, { pos: [x, y, z] });
    }
    s.add(G.sphere(0.12, 8, 6), '#8fd6e8', { pos: [-0.25, 0.55, 0.15], scale: [1, 0.6, 1] });
    return s.build();
  },
});

// --- Nouveautés : salon -----------------------------------------------------------
def('canape-velours', {
  label: 'Canapé arrondi', emoji: '🛋️', price: 680, w: 2.2, d: 1.0, color: '#6fcf97', cat: 'salon',
  seats: [[-0.5, 0.12, 0.45], [0.5, 0.12, 0.45]],
  build(c) {
    const s = new Shape();
    s.add(G.capsule(0.35, 1.5, 6, 12), dark(c, 0.08), { pos: [0, 0.3, 0.05], rot: [0, 0, Math.PI / 2], scale: [1, 1, 1.25] });
    s.add(G.capsule(0.28, 1.5, 6, 12), c, { pos: [0, 0.72, -0.3], rot: [0, 0, Math.PI / 2], scale: [1, 1, 0.8] });
    for (const x of [-1.0, 1.0]) s.add(G.sphere(0.3, 12, 10), c, { pos: [x, 0.5, 0.05], scale: [0.7, 1, 1.3] });
    s.add(G.box(0.34, 0.3, 0.1), '#fffaf2', { pos: [0.5, 0.66, -0.12], rot: [0.2, -0.2, 0.1] });
    for (const x of [-0.8, 0.8]) for (const z of [-0.3, 0.3]) s.add(G.cyl(0.04, 0.03, 0.12, 6), '#ffd84d', { pos: [x, 0.06, z] });
    return s.build();
  },
});
def('tv-retro', {
  label: 'Télé rétro', emoji: '📺', price: 520, w: 1.0, d: 0.55, color: '#ffb27a', cat: 'salon',
  build(c) {
    const s = new Shape();
    s.add(G.box(0.95, 0.12, 0.5), WOOD, { pos: [0, 0.42, 0] });
    for (const x of [-0.4, 0.4]) s.add(G.cyl(0.025, 0.02, 0.42, 5), WOOD_D, { pos: [x, 0.2, 0], rot: [0, 0, x > 0 ? -0.15 : 0.15] });
    s.add(G.box(0.8, 0.62, 0.5), c, { pos: [0, 0.8, 0] });
    s.add(G.box(0.55, 0.45, 0.04), '#2e3a4a', { pos: [-0.08, 0.8, 0.25] });
    s.add(G.box(0.46, 0.36, 0.02), '#6fa8dc', { pos: [-0.08, 0.8, 0.27] });
    for (const y of [0.9, 0.72]) s.add(G.cyl(0.04, 0.04, 0.04, 10), '#fffaf2', { pos: [0.3, y, 0.26], rot: [Math.PI / 2, 0, 0] });
    for (const r of [-0.4, 0.4]) s.add(G.cyl(0.008, 0.008, 0.45, 4), METAL, { pos: [r * 0.4, 1.28, -0.05], rot: [0, 0, r] });
    return s.build();
  },
});
def('rocking-chair', {
  label: 'Rocking-chair', emoji: '🪑', price: 300, w: 0.8, d: 1.0, color: WOOD, cat: 'salon', where: 'both', seats: [[0, 0.05, 0.46]],
  build(c) {
    const s = new Shape();
    for (const x of [-0.33, 0.33]) {
      s.add(G.torus(1.0, 0.03, 4, 16, 0.9), dark(c, 0.15), { pos: [x, 1.02, 0.05], rot: [0, Math.PI / 2, Math.PI + 1.12] });
      s.add(G.box(0.05, 0.45, 0.05), c, { pos: [x, 0.3, 0.2] });
      s.add(G.box(0.05, 1.0, 0.05), c, { pos: [x, 0.62, -0.25], rot: [-0.15, 0, 0] });
    }
    s.add(G.box(0.72, 0.06, 0.55), c, { pos: [0, 0.46, 0] });
    for (let i = 0; i < 4; i++) s.add(G.box(0.05, 0.6, 0.03), c, { pos: [-0.22 + i * 0.15, 0.85, -0.27], rot: [-0.15, 0, 0] });
    s.add(G.box(0.62, 0.06, 0.45), '#ff8fab', { pos: [0, 0.51, 0.02] });
    return s.build();
  },
});
def('lampe-champignon', {
  label: 'Lampe champignon', emoji: '🍄', price: 190, w: 0.5, d: 0.5, color: '#e5484d', cat: 'salon', where: 'both',
  light: { y: 0.7, color: '#ffc9a0', intensity: 3, dist: 5 },
  build() {
    const s = new Shape();
    s.add(G.cyl(0.1, 0.14, 0.55, 12), '#fffaf2', { pos: [0, 0.28, 0] });
    return s.build();
  },
  glow(c) {
    const s = new Shape();
    s.add(new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), c, { pos: [0, 0.55, 0] });
    for (const [x, z] of [[0.12, 0.1], [-0.1, 0.14], [0, -0.16], [0.16, -0.08]]) s.add(G.sphere(0.045, 6, 5), '#ffffff', { pos: [x, 0.55 + Math.sqrt(Math.max(0, 0.078 - x * x - z * z)), z] });
    return s.build();
  },
});
def('tapis-arcenciel', {
  label: 'Tapis arc-en-ciel', emoji: '🌈', price: 0, w: 2.4, d: 1.4, color: '#ff8fab', cat: 'salon', rug: true, noShop: true,
  build() {
    const s = new Shape();
    const cols = ['#ff6f91', '#ffb27a', '#ffd84d', '#b5e48c', '#8fd6e8', '#b69cf0'];
    cols.forEach((col, i) => s.add(new THREE.RingGeometry(1.2 - i * 0.16, 1.2 - (i + 1) * 0.16 + 0.005, 32, 1, 0, Math.PI), col, { pos: [0, 0.012 + i * 0.001, 0.6], rot: [-Math.PI / 2, 0, 0] }));
    s.add(new THREE.CircleGeometry(0.24, 16, 0, Math.PI), '#fffaf2', { pos: [0, 0.02, 0.6], rot: [-Math.PI / 2, 0, 0] });
    return s.build();
  },
});
def('pouf-poire', {
  label: 'Pouf poire', emoji: '🫘', price: 160, w: 0.8, d: 0.8, color: '#8fd6e8', cat: 'salon', where: 'both', seats: [[0, 0, 0.32]],
  build(c) {
    const s = new Shape();
    s.add(G.sphere(0.42, 14, 10), c, { pos: [0, 0.3, 0], scale: [1, 0.72, 1] });
    s.add(G.sphere(0.3, 12, 8), light(c, 0.15), { pos: [0, 0.48, -0.18], scale: [1.1, 1, 0.8] });
    return s.build();
  },
});
def('horloge-comtoise', {
  label: 'Horloge comtoise', emoji: '🕰️', price: 560, w: 0.6, d: 0.4, color: WOOD, cat: 'salon',
  build(c) {
    const s = new Shape();
    s.add(G.box(0.5, 1.9, 0.36), c, { pos: [0, 0.97, 0] });
    s.add(G.box(0.6, 0.12, 0.4), dark(c, 0.15), { pos: [0, 1.96, 0] });
    s.add(G.cyl(0.3, 0.3, 0.1, 16, false), dark(c, 0.15), { pos: [0, 2.02, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.5] });
    s.add(G.cyl(0.19, 0.19, 0.03, 18), '#fffaf2', { pos: [0, 1.62, 0.19], rot: [Math.PI / 2, 0, 0] });
    s.add(G.box(0.015, 0.12, 0.01), '#3d3744', { pos: [0, 1.66, 0.21] });
    s.add(G.box(0.1, 0.015, 0.01), '#3d3744', { pos: [0.04, 1.62, 0.21] });
    s.add(G.box(0.3, 0.9, 0.02), '#dff4ff', { pos: [0, 0.9, 0.18] });
    s.add(G.cyl(0.08, 0.08, 0.02, 12), '#ffd84d', { pos: [0, 0.65, 0.19], rot: [Math.PI / 2, 0, 0] });
    s.add(G.box(0.012, 0.5, 0.01), '#ffd84d', { pos: [0, 0.95, 0.19] });
    return s.build();
  },
});

// --- Nouveautés : cuisine -----------------------------------------------------------
def('evier', {
  label: 'Évier', emoji: '🚰', price: 360, w: 1.2, d: 0.65, color: '#8fd6e8', cat: 'cuisine',
  build(c) {
    const s = new Shape();
    s.add(G.box(1.2, 0.86, 0.62), c, { pos: [0, 0.43, 0] });
    s.add(G.box(1.24, 0.06, 0.66), WHITE, { pos: [0, 0.89, 0] });
    s.add(G.box(0.6, 0.04, 0.4), '#b8c0cc', { pos: [-0.15, 0.91, 0.03] });
    s.add(G.box(0.52, 0.02, 0.32), '#8a93a1', { pos: [-0.15, 0.92, 0.03] });
    s.add(G.cyl(0.025, 0.025, 0.3, 6), METAL, { pos: [-0.15, 1.05, -0.22] });
    s.add(G.cyl(0.02, 0.02, 0.2, 6), METAL, { pos: [-0.15, 1.18, -0.13], rot: [Math.PI / 2, 0, 0] });
    for (const x of [-0.3, 0.3]) s.add(G.box(0.5, 0.7, 0.02), light(c, 0.2), { pos: [x, 0.45, 0.32] });
    s.add(G.box(0.3, 0.12, 0.2), '#ffd84d', { pos: [0.4, 0.98, 0.05] });
    return s.build();
  },
});
def('vaisselier', {
  label: 'Vaisselier', emoji: '🍽️', price: 480, w: 1.3, d: 0.5, color: '#b5e48c', cat: 'cuisine',
  build(c) {
    const s = new Shape();
    s.add(G.box(1.3, 0.85, 0.5), c, { pos: [0, 0.45, 0] });
    s.add(G.box(1.36, 0.06, 0.54), WHITE, { pos: [0, 0.9, 0] });
    s.add(G.box(1.2, 1.1, 0.25), c, { pos: [0, 1.48, -0.12] });
    for (const y of [1.2, 1.55]) s.add(G.box(1.1, 0.04, 0.22), WHITE, { pos: [0, y, -0.08] });
    const cols = ['#ff8fab', '#8fd6e8', '#ffd84d', '#fffaf2', '#b69cf0'];
    for (let i = 0; i < 5; i++) {
      s.add(G.cyl(0.1, 0.1, 0.02, 14), cols[i], { pos: [-0.44 + i * 0.22, 1.33, -0.02], rot: [Math.PI / 2 - 0.2, 0, 0] });
      s.add(G.cyl(0.05, 0.04, 0.09, 8), cols[4 - i], { pos: [-0.44 + i * 0.22, 1.62, -0.05] });
    }
    for (const x of [-0.32, 0.32]) {
      s.add(G.box(0.58, 0.7, 0.02), light(c, 0.25), { pos: [x, 0.45, 0.26] });
      s.add(G.sphere(0.03, 6, 5), '#ffd84d', { pos: [x > 0 ? 0.08 : -0.08, 0.5, 0.28] });
    }
    return s.build();
  },
});
def('table-bistrot', {
  label: 'Table bistrot', emoji: '☕', price: 180, w: 0.8, d: 0.8, color: '#fffaf2', cat: 'cuisine', where: 'both',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.4, 0.4, 0.05, 20), c, { pos: [0, 0.75, 0] });
    s.add(G.cyl(0.03, 0.03, 0.72, 6), METAL, { pos: [0, 0.38, 0] });
    s.add(G.cyl(0.22, 0.25, 0.04, 12), METAL, { pos: [0, 0.02, 0] });
    s.add(G.cyl(0.05, 0.04, 0.08, 10), '#ff8fab', { pos: [0.1, 0.81, 0.05] });
    s.add(G.cyl(0.03, 0.03, 0.1, 6), '#b5e48c', { pos: [-0.12, 0.82, -0.06] });
    s.add(G.sphere(0.05, 6, 4), '#ffd84d', { pos: [-0.12, 0.9, -0.06] });
    return s.build();
  },
});
def('tabouret', {
  label: 'Tabouret', emoji: '🪑', price: 70, w: 0.45, d: 0.45, color: '#ffd84d', cat: 'cuisine', where: 'both', seats: [[0, 0, 0.62]],
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.21, 0.21, 0.06, 16), c, { pos: [0, 0.62, 0] });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      s.add(G.cyl(0.02, 0.025, 0.62, 5), WOOD_D, { pos: [Math.cos(a) * 0.13, 0.31, Math.sin(a) * 0.13], rot: [Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12] });
    }
    s.add(G.torus(0.13, 0.015, 4, 12), WOOD_D, { pos: [0, 0.25, 0], rot: [Math.PI / 2, 0, 0] });
    return s.build();
  },
});
def('machine-cafe', {
  label: 'Machine à café', emoji: '☕', price: 150, w: 0.4, d: 0.35, color: '#e5484d', cat: 'cuisine',
  build(c) {
    const s = new Shape();
    s.add(G.box(0.4, 0.06, 0.35), METAL, { pos: [0, 0.03, 0] });
    s.add(G.box(0.3, 0.45, 0.3), c, { pos: [0, 0.3, -0.02] });
    s.add(G.box(0.34, 0.08, 0.34), dark(c, 0.15), { pos: [0, 0.56, -0.01] });
    s.add(G.cyl(0.05, 0.04, 0.08, 10), WHITE, { pos: [0, 0.1, 0.1] });
    s.add(G.cyl(0.02, 0.02, 0.06, 6), METAL, { pos: [0, 0.22, 0.1] });
    s.add(G.sphere(0.025, 6, 5), '#ffd84d', { pos: [0.1, 0.42, 0.14] });
    return s.build();
  },
});
def('gateau-etage', {
  label: 'Gâteau à étages', emoji: '🎂', price: 240, w: 0.5, d: 0.5, color: '#ff8fab', cat: 'cuisine', where: 'both',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.03, 0.05, 0.4, 8), WHITE, { pos: [0, 0.2, 0] });
    s.add(G.cyl(0.25, 0.25, 0.03, 18), WHITE, { pos: [0, 0.41, 0] });
    s.add(G.cyl(0.2, 0.2, 0.16, 18), '#fff3e0', { pos: [0, 0.51, 0] });
    s.add(G.cyl(0.14, 0.14, 0.14, 16), c, { pos: [0, 0.66, 0] });
    s.add(G.cyl(0.085, 0.085, 0.12, 14), '#fff3e0', { pos: [0, 0.79, 0] });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      s.add(G.sphere(0.035, 6, 5), i % 2 ? c : '#ffffff', { pos: [Math.cos(a) * 0.2, 0.6, Math.sin(a) * 0.2] });
    }
    s.add(G.sphere(0.05, 8, 6), '#e5484d', { pos: [0, 0.88, 0] });
    return s.build();
  },
});

// --- Nouveautés : salle de bain -----------------------------------------------------
def('baignoire', {
  label: 'Baignoire à pattes', emoji: '🛁', price: 700, w: 1.7, d: 0.85, color: '#fffaf2', cat: 'bain',
  build(c) {
    const s = new Shape();
    s.add(G.capsule(0.38, 0.9, 6, 14), c, { pos: [0, 0.5, 0], rot: [0, 0, Math.PI / 2], scale: [1, 1, 1.05] });
    s.add(G.capsule(0.3, 0.85, 6, 14), '#9fe0f5', { pos: [0, 0.62, 0], rot: [0, 0, Math.PI / 2], scale: [1, 0.25, 0.95] });
    for (let i = 0; i < 5; i++) s.add(G.sphere(0.08, 8, 6), '#ffffff', { pos: [-0.4 + i * 0.2, 0.72, (i % 2) * 0.1 - 0.05] });
    for (const x of [-0.6, 0.6]) for (const z of [-0.25, 0.25]) s.add(G.sphere(0.07, 8, 6), '#ffd84d', { pos: [x, 0.07, z] });
    s.add(G.cyl(0.025, 0.025, 0.35, 6), METAL, { pos: [-0.72, 0.9, 0] });
    s.add(G.sphere(0.1, 8, 6), '#ffd84d', { pos: [0.3, 0.8, 0.1], scale: [1, 0.8, 1.2] });
    return s.build();
  },
});
def('lavabo', {
  label: 'Lavabo', emoji: '🪥', price: 260, w: 0.7, d: 0.5, color: '#8fd6e8', cat: 'bain',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.08, 0.12, 0.75, 10), WHITE, { pos: [0, 0.38, -0.05] });
    s.add(G.cyl(0.3, 0.2, 0.18, 16), WHITE, { pos: [0, 0.82, 0], scale: [1, 1, 0.75] });
    s.add(G.cyl(0.25, 0.25, 0.02, 16), '#9fe0f5', { pos: [0, 0.9, 0], scale: [1, 1, 0.75] });
    s.add(G.cyl(0.02, 0.02, 0.16, 6), METAL, { pos: [0, 0.98, -0.18] });
    s.add(G.box(0.55, 0.7, 0.04), c, { pos: [0, 1.45, -0.23] });
    s.add(G.box(0.46, 0.6, 0.02), '#dff4ff', { pos: [0, 1.45, -0.2] });
    s.add(G.cyl(0.03, 0.03, 0.1, 6), '#ff8fab', { pos: [0.2, 0.96, 0.05] });
    return s.build();
  },
});
def('porte-serviettes', {
  label: 'Porte-serviettes', emoji: '🧺', price: 120, w: 0.6, d: 0.35, color: '#ff8fab', cat: 'bain',
  build(c) {
    const s = new Shape();
    for (const x of [-0.25, 0.25]) s.add(G.cyl(0.02, 0.02, 1.0, 6), METAL, { pos: [x, 0.5, 0] });
    for (const y of [0.55, 0.9]) s.add(G.cyl(0.015, 0.015, 0.5, 6), METAL, { pos: [0, y, 0], rot: [0, 0, Math.PI / 2] });
    s.add(G.box(0.46, 0.5, 0.06), c, { pos: [0, 0.68, 0.02] });
    s.add(G.box(0.4, 0.35, 0.06), light(c, 0.5), { pos: [0, 0.73, -0.04] });
    for (const x of [-0.25, 0.25]) s.add(G.box(0.12, 0.03, 0.3), METAL, { pos: [x, 0.02, 0] });
    return s.build();
  },
});
def('tapis-bain', {
  label: 'Tapis de bain nuage', emoji: '☁️', price: 70, w: 1.0, d: 0.7, color: '#8fd6e8', cat: 'bain', rug: true,
  build(c) {
    const s = new Shape();
    for (const [x, z, r] of [[0, 0, 0.3], [-0.3, 0.05, 0.22], [0.3, 0.05, 0.22], [-0.15, -0.15, 0.2], [0.15, -0.15, 0.2]]) s.add(G.cyl(r, r, 0.03, 16), c, { pos: [x, 0.015, z] });
    return s.build();
  },
});
def('miroir-rond', {
  label: 'Miroir soleil', emoji: '🌞', price: 190, w: 0.8, d: 0.1, color: '#ffd84d', cat: 'bain', wall: true, mountY: 1.6,
  build(c) {
    const s = new Shape();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      s.add(G.box(0.06, 0.16, 0.03), c, { pos: [Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0], rot: [0, 0, a - Math.PI / 2] });
    }
    s.add(G.cyl(0.28, 0.28, 0.05, 20), c, { rot: [Math.PI / 2, 0, 0] });
    s.add(G.cyl(0.23, 0.23, 0.02, 20), '#dff4ff', { pos: [0, 0, 0.03], rot: [Math.PI / 2, 0, 0] });
    return s.build();
  },
});

// --- Nouveautés : décoration ---------------------------------------------------------
def('vase-fleurs', {
  label: 'Vase de fleurs', emoji: '💐', price: 90, w: 0.4, d: 0.4, color: '#8fd6e8', cat: 'deco', where: 'both',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.1, 0.14, 0.35, 12), c, { pos: [0, 0.18, 0] });
    s.add(G.torus(0.1, 0.025, 5, 12), light(c, 0.3), { pos: [0, 0.35, 0], rot: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      s.add(G.cyl(0.008, 0.008, 0.3, 4), '#5fae55', { pos: [Math.cos(a) * 0.05, 0.48, Math.sin(a) * 0.05], rot: [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3] });
      flowers(s, Math.cos(a) * 0.12, 0.62, Math.sin(a) * 0.12, ['#ff8fab', '#ffd84d', '#ffffff', '#c9a0ff'][i % 4], 5, 0.04);
    }
    return s.build();
  },
});
def('pile-livres', {
  label: 'Pile de livres', emoji: '📚', price: 60, w: 0.45, d: 0.35, color: '#e5484d', cat: 'deco', where: 'both',
  build(c) {
    const s = new Shape();
    const cols = [c, '#6fa8dc', '#ffd84d', '#6fcf97', '#b69cf0'];
    for (let i = 0; i < 5; i++) s.add(G.box(0.4 - (i % 2) * 0.05, 0.07, 0.3 - (i % 3) * 0.03), cols[i], { pos: [(i % 2) * 0.02, 0.035 + i * 0.07, 0], rot: [0, (i - 2) * 0.12, 0] });
    s.add(G.cyl(0.04, 0.035, 0.07, 8), '#fffaf2', { pos: [0.05, 0.4, 0.02] });
    return s.build();
  },
});
def('globe', {
  label: 'Globe terrestre', emoji: '🌍', price: 170, w: 0.45, d: 0.45, color: WOOD, cat: 'deco',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.15, 0.18, 0.05, 12), c, { pos: [0, 0.03, 0] });
    s.add(G.cyl(0.02, 0.02, 0.2, 6), c, { pos: [0, 0.14, 0] });
    s.add(G.torus(0.22, 0.012, 4, 20, Math.PI), '#ffd84d', { pos: [0, 0.45, 0], rot: [0, 0, 0.4] });
    s.add(G.sphere(0.19, 16, 12), '#6fa8dc', { pos: [0, 0.45, 0] });
    for (const [x, y, z, r] of [[0.12, 0.5, 0.1, 0.08], [-0.08, 0.4, 0.15, 0.07], [0.02, 0.55, -0.16, 0.08]]) s.add(G.sphere(r, 8, 6), '#6fcf97', { pos: [x, y, z], scale: [1, 0.8, 0.5] });
    return s.build();
  },
});
def('bougies', {
  label: 'Bougies', emoji: '🕯️', price: 80, w: 0.4, d: 0.3, color: '#fff3d6', cat: 'deco', where: 'both',
  light: { y: 0.4, color: '#ffb46b', intensity: 2, dist: 4, flicker: true },
  build(c) {
    const s = new Shape();
    for (const [x, h] of [[-0.1, 0.22], [0.02, 0.32], [0.12, 0.16]]) s.add(G.cyl(0.045, 0.045, h, 10), c, { pos: [x, h / 2, 0] });
    return s.build();
  },
  glow() {
    const s = new Shape();
    for (const [x, h] of [[-0.1, 0.22], [0.02, 0.32], [0.12, 0.16]]) s.add(G.sphere(0.03, 6, 5), '#ffb46b', { pos: [x, h + 0.04, 0], scale: [1, 1.8, 1] });
    return s.build();
  },
});
def('maison-poupee', {
  label: 'Maison de poupée', emoji: '🏠', price: 420, w: 0.9, d: 0.5, color: '#ff8fab', cat: 'deco',
  build(c) {
    const s = new Shape();
    s.add(G.box(0.8, 0.5, 0.45), WHITE, { pos: [0, 0.3, 0] });
    s.add(G.box(0.8, 0.02, 0.45), light(c, 0.4), { pos: [0, 0.3, 0] });
    for (const side of [-1, 1]) s.add(G.box(0.55, 0.05, 0.5), c, { pos: [side * 0.2, 0.7, 0], rot: [0, 0, -side * 0.75] });
    s.add(G.box(0.12, 0.2, 0.02), '#9c6b4f', { pos: [0.15, 0.15, 0.23] });
    for (const x of [-0.2, 0.2]) s.add(G.box(0.14, 0.12, 0.02), '#9ed8f5', { pos: [x, 0.42, 0.23] });
    s.add(G.box(0.14, 0.12, 0.02), '#9ed8f5', { pos: [-0.2, 0.15, 0.23] });
    s.add(G.box(0.9, 0.05, 0.5), WOOD, { pos: [0, 0.03, 0] });
    return s.build();
  },
});
def('lanterne-papier', {
  label: 'Lanterne en papier', emoji: '🏮', price: 0, w: 0.5, d: 0.5, color: '#ff8fab', cat: 'deco', where: 'both', noShop: true,
  light: { y: 1.1, color: '#ffc9b8', intensity: 3.5, dist: 6 },
  build() {
    const s = new Shape();
    s.add(G.cyl(0.18, 0.2, 0.04, 12), METAL, { pos: [0, 0.02, 0] });
    s.add(G.cyl(0.015, 0.015, 1.4, 5), METAL, { pos: [0, 0.7, 0] });
    s.add(G.box(0.4, 0.02, 0.02), METAL, { pos: [0.18, 1.4, 0] });
    return s.build();
  },
  glow(c) {
    const s = new Shape();
    s.add(G.sphere(0.2, 14, 10), c, { pos: [0.36, 1.12, 0], scale: [1, 1.2, 1] });
    for (const y of [0.9, 1.34]) s.add(G.cyl(0.08, 0.08, 0.04, 10), dark(c, 0.3), { pos: [0.36, y, 0] });
    return s.build();
  },
});
def('etoile-murale', {
  label: 'Étoile lumineuse', emoji: '⭐', price: 0, w: 0.6, d: 0.1, color: '#ffd84d', cat: 'deco', wall: true, mountY: 2.1, noShop: true,
  light: { y: 0, color: '#fff1b8', intensity: 2, dist: 4 },
  build() {
    return new Shape().add(G.box(0.02, 0.02, 0.02), '#ffffff', {}).build();
  },
  glow(c) {
    const st = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.12 : 0.28;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      if (i === 0) st.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else st.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return new Shape().add(new THREE.ExtrudeGeometry(st, { depth: 0.05, bevelEnabled: false }), c, {}).build();
  },
});
def('fenetre-ronde', {
  label: 'Hublot fleuri', emoji: '🪟', price: 260, w: 0.9, d: 0.12, color: '#fffaf2', cat: 'deco', wall: true, mountY: 1.7,
  build(c) {
    const s = new Shape();
    s.add(G.torus(0.38, 0.06, 8, 24), c, {});
    s.add(G.box(0.03, 0.74, 0.03), c, {});
    s.add(G.box(0.74, 0.03, 0.03), c, {});
    s.add(G.box(0.8, 0.08, 0.2), WOOD, { pos: [0, -0.45, 0.08] });
    flowers(s, -0.2, -0.33, 0.1, '#ff8fab', 5, 0.06);
    flowers(s, 0.2, -0.33, 0.1, '#ffd84d', 5, 0.06);
    return s.build();
  },
  glow() {
    return new Shape().add(G.cyl(0.35, 0.35, 0.02, 20), '#bfe6f5', { rot: [Math.PI / 2, 0, 0] }).build();
  },
});
def('cadre-photo', {
  label: 'Cadres photo', emoji: '🖼️', price: 120, w: 1.0, d: 0.08, color: '#ff8fab', cat: 'deco', wall: true, mountY: 1.6,
  build(c) {
    const s = new Shape();
    const frames = [[-0.3, 0.1, 0.35, 0.45, c], [0.12, 0.15, 0.3, 0.3, '#ffd84d'], [0.35, -0.12, 0.25, 0.3, '#8fd6e8'], [0.05, -0.2, 0.25, 0.2, '#b5e48c']];
    for (const [x, y, w, h, col] of frames) {
      s.add(G.box(w, h, 0.04), col, { pos: [x, y, 0] });
      s.add(G.box(w - 0.08, h - 0.08, 0.02), ['#ffe3eb', '#e8f3ff', '#fff6d8', '#f6e8ff'][Math.floor((x + 1) * 2) % 4], { pos: [x, y, 0.025] });
      s.add(G.sphere(Math.min(w, h) * 0.18, 8, 6), '#fbd5bd', { pos: [x, y + 0.02, 0.035], scale: [1, 1, 0.2] });
    }
    return s.build();
  },
});
def('etagere-plantes', {
  label: 'Étagère à plantes', emoji: '🪴', price: 210, w: 1.0, d: 0.3, color: '#fffaf2', cat: 'deco', wall: true, mountY: 1.9,
  build(c) {
    const s = new Shape();
    for (const y of [0, -0.45]) s.add(G.box(1.0, 0.04, 0.26), c, { pos: [0, y, 0.04] });
    for (const x of [-0.45, 0.45]) s.add(G.box(0.03, 0.5, 0.03), METAL, { pos: [x, -0.22, 0.15] });
    for (const [x, y] of [[-0.3, 0], [0.1, 0], [0.35, -0.45], [-0.2, -0.45]]) {
      s.add(G.cyl(0.07, 0.05, 0.1, 8), '#e0a07a', { pos: [x, y + 0.07, 0.04] });
      s.add(G.sphere(0.1, 8, 6), '#5fae55', { pos: [x, y + 0.17, 0.04] });
    }
    for (let i = 0; i < 5; i++) s.add(G.sphere(0.05, 6, 4), '#6fbf5f', { pos: [-0.3 + (i % 2) * 0.03, -0.05 - i * 0.08, 0.1] });
    return s.build();
  },
});
def('horloge-coucou', {
  label: 'Horloge coucou', emoji: '🐦', price: 230, w: 0.5, d: 0.2, color: WOOD, cat: 'deco', wall: true, mountY: 2.0,
  build(c) {
    const s = new Shape();
    s.add(G.box(0.36, 0.4, 0.16), c, { pos: [0, 0, 0.06] });
    for (const side of [-1, 1]) s.add(G.box(0.3, 0.04, 0.22), dark(c, 0.25), { pos: [side * 0.12, 0.28, 0.06], rot: [0, 0, -side * 0.6] });
    s.add(G.cyl(0.11, 0.11, 0.02, 16), '#fffaf2', { pos: [0, -0.03, 0.15], rot: [Math.PI / 2, 0, 0] });
    s.add(G.box(0.1, 0.1, 0.02), '#3d3744', { pos: [0, 0.15, 0.15] });
    s.add(G.sphere(0.035, 6, 5), '#ffd84d', { pos: [0, 0.15, 0.18] });
    for (const x of [-0.06, 0.06]) {
      s.add(G.cyl(0.004, 0.004, 0.4, 3), '#4e4c62', { pos: [x, -0.4, 0.08] });
      s.add(G.cone(0.03, 0.12, 6), '#4e4c62', { pos: [x, -0.62, 0.08], rot: [Math.PI, 0, 0] });
    }
    return s.build();
  },
});
def('guirlande-coeurs', {
  label: 'Guirlande de cœurs', emoji: '💕', price: 150, w: 1.8, d: 0.1, color: '#ff8fab', cat: 'deco', wall: true, mountY: 2.5,
  build(c) {
    const s = new Shape();
    const pts = [];
    for (let i = 0; i <= 12; i++) pts.push(new THREE.Vector3(-0.9 + (i / 12) * 1.8, -Math.sin((i / 12) * Math.PI) * 0.2, 0.04));
    s.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.008, 4), '#fffaf2');
    for (let i = 1; i < 12; i += 2) {
      const x = -0.9 + (i / 12) * 1.8;
      const hs = new THREE.Shape();
      hs.moveTo(0, -0.07);
      hs.bezierCurveTo(-0.1, 0.0, -0.05, 0.08, 0, 0.035);
      hs.bezierCurveTo(0.05, 0.08, 0.1, 0.0, 0, -0.07);
      s.add(new THREE.ExtrudeGeometry(hs, { depth: 0.02, bevelEnabled: false, curveSegments: 6 }), i % 4 === 1 ? c : '#ffffff', { pos: [x, -Math.sin((i / 12) * Math.PI) * 0.2 - 0.08, 0.04] });
    }
    return s.build();
  },
});
def('vitrine-papillons', {
  label: 'Vitrine à papillons', emoji: '🦋', price: 0, w: 0.9, d: 0.1, color: WOOD, cat: 'deco', wall: true, mountY: 1.7, noShop: true,
  build(c) {
    const s = new Shape();
    s.add(G.box(0.9, 0.65, 0.06), c, {});
    s.add(G.box(0.8, 0.55, 0.02), '#fffaf2', { pos: [0, 0, 0.03] });
    const cols = ['#6fa8dc', '#ffb27a', '#ffd84d', '#b69cf0', '#ff8fab', '#6fcf97'];
    for (let i = 0; i < 6; i++) {
      const x = -0.26 + (i % 3) * 0.26;
      const y = 0.12 - Math.floor(i / 3) * 0.24;
      for (const sd of [-1, 1]) s.add(G.sphere(0.06, 8, 6), cols[i], { pos: [x + sd * 0.05, y, 0.045], scale: [1, 1.2, 0.15] });
      s.add(G.box(0.015, 0.08, 0.01), '#3d3744', { pos: [x, y, 0.05] });
    }
    return s.build();
  },
});
def('trophee-peche', {
  label: 'Trophée de pêche', emoji: '🎣', price: 0, w: 0.9, d: 0.12, color: WOOD, cat: 'deco', wall: true, mountY: 1.8, noShop: true,
  build(c) {
    const s = new Shape();
    s.add(G.box(0.7, 0.5, 0.05), c, {});
    s.add(G.sphere(0.2, 12, 8), '#6fa8dc', { pos: [0, 0, 0.06], scale: [1.8, 0.8, 0.4] });
    s.add(G.cone(0.14, 0.2, 4), '#6fa8dc', { pos: [0.42, 0, 0.06], rot: [0, 0, -Math.PI / 2], scale: [1, 1, 0.3] });
    s.add(G.sphere(0.03, 6, 5), '#2b1d1d', { pos: [-0.25, 0.04, 0.13] });
    s.add(G.box(0.3, 0.08, 0.02), '#ffd84d', { pos: [0, -0.2, 0.04] });
    return s.build();
  },
});

// --- Nouveautés : animaux -------------------------------------------------------------
def('lit-chat', {
  label: 'Lit douillet pour chat', emoji: '🐱', price: 220, w: 0.7, d: 0.7, color: '#b69cf0', cat: 'animaux', where: 'both', petBed: true,
  build(c) {
    const s = new Shape();
    s.add(G.torus(0.28, 0.12, 8, 18), c, { pos: [0, 0.13, 0], rot: [Math.PI / 2, 0, 0] });
    s.add(G.cyl(0.3, 0.3, 0.08, 18), light(c, 0.4), { pos: [0, 0.06, 0] });
    for (const x of [-0.18, 0.18]) s.add(G.cone(0.09, 0.16, 4), c, { pos: [x, 0.32, -0.22], rot: [0, Math.PI / 4, 0] });
    return s.build();
  },
});
def('griffoir', {
  label: 'Griffoir', emoji: '🪵', price: 110, w: 0.5, d: 0.5, color: '#ff8fab', cat: 'animaux', where: 'both',
  build(c) {
    const s = new Shape();
    s.add(G.box(0.5, 0.06, 0.5), c, { pos: [0, 0.03, 0] });
    s.add(G.cyl(0.09, 0.09, 0.8, 10), '#e9d5b7', { pos: [0, 0.45, 0] });
    for (let i = 0; i < 6; i++) s.add(G.torus(0.095, 0.01, 4, 12), '#d9c09a', { pos: [0, 0.15 + i * 0.12, 0], rot: [Math.PI / 2, 0, 0] });
    s.add(G.cyl(0.18, 0.18, 0.05, 12), c, { pos: [0, 0.87, 0] });
    s.add(G.sphere(0.04, 6, 4), '#ffd84d', { pos: [0.16, 0.7, 0] });
    s.add(G.cyl(0.004, 0.004, 0.18, 3), '#ffffff', { pos: [0.16, 0.8, 0] });
    return s.build();
  },
});
def('fontaine-chat', {
  label: 'Fontaine à chat', emoji: '⛲', price: 0, w: 0.5, d: 0.5, color: '#8fd6e8', cat: 'animaux', where: 'both', noShop: true,
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.22, 0.2, 0.14, 16), c, { pos: [0, 0.07, 0] });
    s.add(G.cyl(0.18, 0.18, 0.02, 16), '#bfeefd', { pos: [0, 0.14, 0] });
    s.add(G.cyl(0.06, 0.08, 0.14, 10), WHITE, { pos: [0, 0.2, 0] });
    s.add(G.sphere(0.05, 8, 6), '#bfeefd', { pos: [0, 0.3, 0] });
    for (const x of [-0.05, 0.05]) s.add(G.cone(0.03, 0.05, 4), WHITE, { pos: [x, 0.3, 0] });
    return s.build();
  },
});
def('statue-chat', {
  label: 'Statue de chat doré', emoji: '🐈', price: 0, w: 0.5, d: 0.5, color: '#ffd84d', cat: 'animaux', where: 'both', noShop: true,
  build(c) {
    const s = new Shape();
    s.add(G.box(0.46, 0.2, 0.46), '#fffaf2', { pos: [0, 0.1, 0] });
    s.add(G.sphere(0.18, 12, 10), c, { pos: [0, 0.4, 0], scale: [1, 1.2, 0.9] });
    s.add(G.sphere(0.14, 12, 10), c, { pos: [0, 0.68, 0.03] });
    for (const x of [-0.08, 0.08]) s.add(G.cone(0.05, 0.1, 4), c, { pos: [x, 0.82, 0.02] });
    s.add(G.capsule(0.04, 0.22, 4, 8), c, { pos: [0.13, 0.62, 0.1], rot: [0.2, 0, -0.1] });
    s.add(G.torus(0.14, 0.035, 6, 12, Math.PI), c, { pos: [-0.16, 0.26, 0], rot: [0, Math.PI / 2, 0] });
    for (const x of [-0.05, 0.05]) s.add(G.sphere(0.02, 6, 4), '#2e9e74', { pos: [x, 0.7, 0.16] });
    return s.build();
  },
});
def('maison-chat', {
  label: 'Maisonnette à chat', emoji: '🏡', price: 290, w: 0.8, d: 0.7, color: '#f7a8b8', cat: 'animaux', where: 'both', petBed: true,
  build(c) {
    const s = new Shape();
    s.add(G.box(0.7, 0.55, 0.6), c, { pos: [0, 0.3, 0] });
    for (const side of [-1, 1]) s.add(G.box(0.55, 0.05, 0.7), dark(c, 0.25), { pos: [side * 0.2, 0.72, 0], rot: [0, 0, -side * 0.7] });
    const tri = new THREE.Shape([new THREE.Vector2(-0.35, 0), new THREE.Vector2(0.35, 0), new THREE.Vector2(0, 0.32)]);
    s.add(new THREE.ExtrudeGeometry(tri, { depth: 0.6, bevelEnabled: false }), c, { pos: [0, 0.57, -0.3] });
    s.add(G.cyl(0.16, 0.16, 0.02, 16), '#3b2a2a', { pos: [0, 0.3, 0.31], rot: [Math.PI / 2, 0, 0] });
    s.add(G.cyl(0.24, 0.24, 0.04, 14), '#fffaf2', { pos: [0, 0.03, 0.4], scale: [1, 1, 0.5] });
    return s.build();
  },
});

// --- Nouveautés : jardin --------------------------------------------------------------
def('parasol', {
  label: 'Parasol', emoji: '⛱️', price: 260, w: 0.6, d: 0.6, color: '#ff8fab', cat: 'jardin', where: 'out', doubleSide: true,
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.22, 0.26, 0.1, 12), '#fffaf2', { pos: [0, 0.05, 0] });
    s.add(G.cyl(0.03, 0.03, 2.3, 6), '#fffaf2', { pos: [0, 1.15, 0] });
    for (let i = 0; i < 8; i++) s.add(new THREE.ConeGeometry(1.4, 0.5, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4), i % 2 ? '#ffffff' : c, { pos: [0, 2.3, 0] });
    return s.build();
  },
});
def('transat', {
  label: 'Transat', emoji: '🏖️', price: 200, w: 0.7, d: 1.5, color: '#8fd6e8', cat: 'jardin', where: 'out', seats: [[0, 0.1, 0.3]],
  build(c) {
    const s = new Shape();
    for (const x of [-0.3, 0.3]) {
      s.add(G.box(0.05, 0.05, 1.3), WOOD, { pos: [x, 0.25, 0.05], rot: [-0.1, 0, 0] });
      s.add(G.box(0.05, 0.05, 0.8), WOOD, { pos: [x, 0.6, -0.5], rot: [0.9, 0, 0] });
    }
    for (let i = 0; i < 5; i++) s.add(G.box(0.56, 0.02, 0.26), i % 2 ? '#ffffff' : c, { pos: [0, 0.3 + (i < 2 ? 0 : (i - 1) * 0.18), 0.45 - i * 0.26], rot: [i < 2 ? -0.1 : 0.9, 0, 0] });
    return s.build();
  },
});
def('barbecue', {
  label: 'Barbecue', emoji: '🍖', price: 380, w: 0.8, d: 0.6, color: '#e5484d', cat: 'jardin', where: 'out',
  build(c) {
    const s = new Shape();
    s.add(new THREE.SphereGeometry(0.35, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), c, { pos: [0, 0.8, 0] });
    s.add(G.cyl(0.35, 0.35, 0.02, 16), '#4e4c62', { pos: [0, 0.8, 0] });
    for (const [x, z] of [[0.1, 0], [-0.12, 0.08], [0.02, -0.12]]) s.add(G.capsule(0.04, 0.12, 4, 6), '#b8603c', { pos: [x, 0.84, z], rot: [0, x * 5, Math.PI / 2] });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      s.add(G.cyl(0.02, 0.02, 0.65, 5), '#4e4c62', { pos: [Math.cos(a) * 0.2, 0.33, Math.sin(a) * 0.2], rot: [Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2] });
    }
    s.add(G.box(0.25, 0.03, 0.3), WOOD, { pos: [0.45, 0.7, 0] });
    return s.build();
  },
});
def('puits', {
  label: 'Puits', emoji: '🪣', price: 900, w: 1.4, d: 1.4, color: '#cf6d58', cat: 'jardin', where: 'out',
  build(c) {
    const s = new Shape();
    const stones = ['#b8b0a4', '#cfc4b3', '#a8a095'];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + r * 0.26;
      s.add(G.box(0.34, 0.2, 0.2), stones[(i + r) % 3], { pos: [Math.cos(a) * 0.55, 0.1 + r * 0.2, Math.sin(a) * 0.55], rot: [0, -a, 0] });
    }
    s.add(G.cyl(0.46, 0.46, 0.05, 16), '#3a6a8a', { pos: [0, 0.4, 0] });
    for (const x of [-0.6, 0.6]) s.add(G.box(0.1, 1.4, 0.1), WOOD_D, { pos: [x, 1.0, 0] });
    s.add(G.cyl(0.05, 0.05, 1.3, 8), WOOD, { pos: [0, 1.4, 0], rot: [0, 0, Math.PI / 2] });
    for (const side of [-1, 1]) s.add(G.box(0.85, 0.06, 1.1), c, { pos: [side * 0.33, 1.85, 0], rot: [0, 0, -side * 0.6] });
    s.add(G.cyl(0.12, 0.1, 0.16, 10), '#b8c0cc', { pos: [0, 1.0, 0] });
    s.add(G.cyl(0.008, 0.008, 0.35, 3), '#8f6243', { pos: [0, 1.22, 0] });
    return s.build();
  },
});
def('fontaine-jardin', {
  label: 'Fontaine de jardin', emoji: '⛲', price: 780, w: 1.3, d: 1.3, color: '#d6ccbb', cat: 'jardin', where: 'out',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.62, 0.66, 0.35, 20), c, { pos: [0, 0.18, 0] });
    s.add(G.cyl(0.55, 0.55, 0.04, 20), '#9fe6f2', { pos: [0, 0.33, 0] });
    s.add(G.cyl(0.1, 0.14, 0.6, 10), c, { pos: [0, 0.6, 0] });
    s.add(new THREE.SphereGeometry(0.32, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), c, { pos: [0, 0.95, 0], scale: [1, 0.5, 1] });
    s.add(G.cyl(0.28, 0.28, 0.02, 14), '#9fe6f2', { pos: [0, 0.94, 0] });
    s.add(G.sphere(0.08, 8, 6), '#dff7ff', { pos: [0, 1.1, 0] });
    s.add(G.sphere(0.12, 8, 6), '#5fae55', { pos: [0.4, 0.4, 0.3] });
    return s.build();
  },
});
def('cabane-oiseaux', {
  label: 'Cabane à oiseaux', emoji: '🐦', price: 170, w: 0.5, d: 0.5, color: '#6fa8dc', cat: 'jardin', where: 'out',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.04, 0.05, 1.4, 6), WOOD_D, { pos: [0, 0.7, 0] });
    s.add(G.box(0.34, 0.34, 0.32), c, { pos: [0, 1.55, 0] });
    for (const side of [-1, 1]) s.add(G.box(0.3, 0.04, 0.42), '#cf6d58', { pos: [side * 0.12, 1.82, 0], rot: [0, 0, -side * 0.7] });
    s.add(G.cyl(0.06, 0.06, 0.02, 12), '#3b2a2a', { pos: [0, 1.6, 0.17], rot: [Math.PI / 2, 0, 0] });
    s.add(G.cyl(0.012, 0.012, 0.1, 4), WOOD_D, { pos: [0, 1.48, 0.2], rot: [Math.PI / 2, 0, 0] });
    s.add(G.sphere(0.06, 8, 6), '#ffd84d', { pos: [0.1, 1.77, 0.08] });
    return s.build();
  },
});
def('epouvantail', {
  label: 'Épouvantail rigolo', emoji: '🧑‍🌾', price: 240, w: 0.9, d: 0.4, color: '#e5484d', cat: 'jardin', where: 'out',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.04, 0.04, 1.8, 6), WOOD_D, { pos: [0, 0.9, 0] });
    s.add(G.cyl(0.03, 0.03, 1.2, 6), WOOD_D, { pos: [0, 1.35, 0], rot: [0, 0, Math.PI / 2] });
    s.add(G.box(0.5, 0.55, 0.25), c, { pos: [0, 1.2, 0] });
    for (const x of [-0.45, 0.45]) s.add(G.box(0.3, 0.14, 0.14), c, { pos: [x, 1.35, 0] });
    for (const x of [-0.62, 0.62]) s.add(G.cone(0.07, 0.15, 5), '#f0cf6a', { pos: [x, 1.35, 0], rot: [0, 0, x > 0 ? -Math.PI / 2 : Math.PI / 2] });
    s.add(G.sphere(0.2, 12, 10), '#f5d99e', { pos: [0, 1.72, 0] });
    s.add(G.cyl(0.35, 0.35, 0.03, 18), '#f3d98f', { pos: [0, 1.88, 0] });
    s.add(G.cyl(0.16, 0.2, 0.18, 14), '#f3d98f', { pos: [0, 1.98, 0] });
    for (const x of [-0.07, 0.07]) s.add(G.sphere(0.025, 6, 5), '#2b1d1d', { pos: [x, 1.76, 0.18] });
    s.add(G.torus(0.05, 0.01, 4, 10, Math.PI), '#2b1d1d', { pos: [0, 1.68, 0.18], rot: [0, 0, Math.PI] });
    return s.build();
  },
});
def('brouette', {
  label: 'Brouette fleurie', emoji: '🌼', price: 230, w: 0.7, d: 1.3, color: '#6fcf97', cat: 'jardin', where: 'out',
  build(c) {
    const s = new Shape();
    s.add(G.box(0.6, 0.3, 0.7), c, { pos: [0, 0.5, 0.05] });
    s.add(G.box(0.5, 0.1, 0.6), '#7a5236', { pos: [0, 0.62, 0.05] });
    s.add(G.torus(0.15, 0.05, 6, 12), '#2e2e3a', { pos: [0, 0.2, 0.52], rot: [0, Math.PI / 2, 0] });
    for (const x of [-0.25, 0.25]) {
      s.add(G.cyl(0.025, 0.025, 1.0, 5), WOOD, { pos: [x, 0.45, -0.3], rot: [Math.PI / 2 - 0.3, 0, 0] });
      s.add(G.cyl(0.025, 0.025, 0.35, 5), WOOD_D, { pos: [x, 0.2, -0.1] });
    }
    const cols = ['#ff8fb1', '#ffd84d', '#ffffff', '#c9a0ff', '#ff6f91'];
    for (let i = 0; i < 8; i++) flowers(s, -0.18 + (i % 3) * 0.18, 0.72, -0.2 + Math.floor(i / 3) * 0.22, cols[i % 5], 5, 0.05);
    return s.build();
  },
});
def('tonneau-fleuri', {
  label: 'Tonneau fleuri', emoji: '🛢️', price: 160, w: 0.7, d: 0.7, color: '#ff8fb1', cat: 'jardin', where: 'out',
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.32, 0.3, 0.6, 12), '#a8704a', { pos: [0, 0.3, 0] });
    for (const y of [0.12, 0.48]) s.add(G.torus(0.32, 0.025, 4, 16), METAL, { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0] });
    s.add(G.sphere(0.3, 10, 8), '#5fae55', { pos: [0, 0.62, 0], scale: [1, 0.5, 1] });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      flowers(s, Math.cos(a) * 0.18, 0.72, Math.sin(a) * 0.18, i % 2 ? c : '#ffd84d', 5, 0.05);
    }
    return s.build();
  },
});
def('hamac', {
  label: 'Hamac', emoji: '🌴', price: 450, w: 2.6, d: 0.9, color: '#ffd84d', cat: 'jardin', where: 'out', seats: [[0, 0, 0.55]], doubleSide: true,
  build(c) {
    const s = new Shape();
    for (const x of [-1.2, 1.2]) {
      s.add(G.box(0.12, 1.6, 0.12), WOOD_D, { pos: [x, 0.8, 0] });
      s.add(G.box(0.12, 0.12, 0.8), WOOD_D, { pos: [x, 0.06, 0] });
    }
    const pts = [];
    for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector3(-1.15 + (i / 10) * 2.3, 1.3 - Math.sin((i / 10) * Math.PI) * 0.8, 0));
    const curve = new THREE.CatmullRomCurve3(pts);
    for (let k = -2; k <= 2; k++) {
      const g = new THREE.TubeGeometry(curve, 16, 0.07, 4);
      s.add(g, k % 2 ? '#ffffff' : c, { pos: [0, 0, k * 0.1], scale: [1, 1, 1] });
    }
    return s.build();
  },
});
def('mare', {
  label: 'Petite mare', emoji: '🐸', price: 520, w: 1.8, d: 1.4, color: '#9fe6f2', cat: 'jardin', where: 'out', rug: true,
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.9, 0.9, 0.04, 20), '#b8b0a4', { pos: [0, 0.02, 0], scale: [1, 1, 0.78] });
    s.add(G.cyl(0.78, 0.78, 0.04, 20), c, { pos: [0, 0.035, 0], scale: [1, 1, 0.78] });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      s.add(G.dodeca(0.1), ['#b8b0a4', '#cfc4b3'][i % 2], { pos: [Math.cos(a) * 0.86, 0.06, Math.sin(a) * 0.68], scale: [1.2, 0.6, 1] });
    }
    s.add(new THREE.CircleGeometry(0.16, 12, 0.3, Math.PI * 2 - 0.6), '#5fae55', { pos: [0.25, 0.06, 0.1], rot: [-Math.PI / 2, 0, 0] });
    s.add(G.sphere(0.07, 8, 6), '#6fcf97', { pos: [0.25, 0.1, 0.1], scale: [1.2, 0.8, 1] });
    for (const x of [-0.035, 0.035]) s.add(G.sphere(0.025, 6, 5), '#ffffff', { pos: [0.25 + x, 0.15, 0.14] });
    for (let i = 0; i < 4; i++) s.add(G.cyl(0.012, 0.012, 0.5, 4), '#5fae55', { pos: [-0.6 + i * 0.05, 0.25, -0.3 + (i % 2) * 0.05] });
    return s.build();
  },
});
def('lampadaire-jardin', {
  label: 'Réverbère de jardin', emoji: '🏮', price: 290, w: 0.5, d: 0.5, color: '#4e4c62', cat: 'jardin', where: 'out',
  light: { y: 2.1, color: '#ffd89a', intensity: 6, dist: 8, night: true },
  build(c) {
    const s = new Shape();
    s.add(G.cyl(0.18, 0.22, 0.2, 10), c, { pos: [0, 0.1, 0] });
    s.add(G.cyl(0.05, 0.06, 1.9, 8), c, { pos: [0, 1.1, 0] });
    s.add(G.cone(0.25, 0.25, 6), c, { pos: [0, 2.45, 0] });
    s.add(G.cyl(0.18, 0.12, 0.08, 6), c, { pos: [0, 1.95, 0] });
    return s.build();
  },
  glow() {
    return new Shape().add(G.cyl(0.16, 0.16, 0.34, 6), '#ffffff', { pos: [0, 2.15, 0] }).build();
  },
});

// Catégories des meubles historiques (les nouveaux la précisent eux-mêmes).
const CATS = {
  chambre: ['lit', 'lit-double', 'table-chevet', 'commode', 'miroir', 'coffre'],
  salon: ['canape', 'fauteuil', 'pouf', 'table-basse', 'tapis-rond', 'tapis', 'lampadaire', 'bibliotheque', 'cheminee', 'tourne-disque', 'piano', 'bureau'],
  cuisine: ['table', 'table-ronde', 'chaise', 'cuisiniere', 'frigo', 'plan-travail', 'caisse-fruits'],
  deco: ['plante', 'plante-grande', 'cactus', 'aquarium', 'tableau', 'horloge', 'etagere', 'guirlande', 'trophee'],
  animaux: ['arbre-chat', 'panier', 'gamelle'],
  jardin: ['banc-jardin', 'lanterne', 'bain-oiseaux', 'pot-fleurs', 'nain', 'balancoire', 'table-jardin', 'arche'],
};
for (const [cat, ids] of Object.entries(CATS)) for (const id of ids) if (F[id]) F[id].cat = cat;
for (const f of Object.values(F)) f.cat ||= f.where === 'out' ? 'jardin' : 'deco';

export const FURNITURE_CATS = [
  { id: 'chambre', label: '🛏️ Chambre' },
  { id: 'salon', label: '🛋️ Salon' },
  { id: 'cuisine', label: '🍳 Cuisine' },
  { id: 'bain', label: '🛁 Bain' },
  { id: 'deco', label: '🖼️ Déco' },
  { id: 'animaux', label: '🐾 Animaux' },
  { id: 'jardin', label: '🌳 Jardin' },
];

export const FURNITURE = F;

/** Meubles vendus par Bruno (hors récompenses). */
export const SHOP_FURNITURE = Object.values(F).filter((f) => f.price > 0 && !f.noShop);

// --- Papiers peints et sols -------------------------------------------------------

export const WALLPAPERS = [
  { id: 'creme', label: 'Crème', price: 0, draw: { base: '#fff3e0', accent: '#f6e2c8', pattern: 'uni' } },
  { id: 'rose-rayures', label: 'Rayures roses', price: 180, draw: { base: '#ffe3eb', accent: '#ffc9d6', pattern: 'rayures' } },
  { id: 'menthe-pois', label: 'Pois menthe', price: 180, draw: { base: '#e2f7ef', accent: '#b8e8d6', pattern: 'pois' } },
  { id: 'ciel-etoiles', label: 'Ciel étoilé', price: 240, draw: { base: '#c9dcff', accent: '#fff6c9', pattern: 'etoiles' } },
  { id: 'fleuri', label: 'Fleuri', price: 240, draw: { base: '#fff8e8', accent: '#ffb3c7', pattern: 'fleurs' } },
  { id: 'lambris', label: 'Lambris bois', price: 260, draw: { base: '#e9c99a', accent: '#d9b27a', pattern: 'lambris' } },
  { id: 'lavande', label: 'Lavande', price: 160, draw: { base: '#ece3ff', accent: '#d9ccff', pattern: 'uni' } },
  { id: 'vichy', label: 'Vichy jaune', price: 200, draw: { base: '#fff6d6', accent: '#ffe08a', pattern: 'carreaux' } },
];

export const FLOORS = [
  { id: 'parquet', label: 'Parquet', price: 0, draw: { base: '#d9a86c', accent: '#c48f55', pattern: 'parquet' } },
  { id: 'damier', label: 'Damier', price: 200, draw: { base: '#fffaf2', accent: '#8fd6e8', pattern: 'damier' } },
  { id: 'moquette', label: 'Moquette rose', price: 160, draw: { base: '#f7c6d2', accent: '#f0b6c5', pattern: 'uni' } },
  { id: 'tomettes', label: 'Tomettes', price: 220, draw: { base: '#d98a62', accent: '#c47450', pattern: 'hexa' } },
  { id: 'parquet-clair', label: 'Parquet clair', price: 180, draw: { base: '#f0d3a8', accent: '#e2bf8c', pattern: 'parquet' } },
  { id: 'nuage', label: 'Nuage bleu', price: 180, draw: { base: '#d6ecff', accent: '#c0dcf7', pattern: 'uni' } },
];

export function surfaceTexture({ base, accent, pattern }, repeat = [4, 2]) {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = accent;
  ctx.strokeStyle = accent;
  switch (pattern) {
    case 'rayures':
      ctx.fillRect(0, 0, S / 4, S);
      ctx.fillRect(S / 2, 0, S / 4, S);
      break;
    case 'pois':
      for (const [x, y] of [[32, 32], [96, 96]]) {
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'etoiles':
      for (const [x, y, r] of [[30, 30, 10], [96, 90, 12], [90, 30, 5], [30, 100, 6]]) {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rr = i % 2 ? r * 0.45 : r;
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.fill();
      }
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
    case 'lambris':
      ctx.lineWidth = 4;
      for (let x = 0; x <= S; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, S);
        ctx.stroke();
      }
      break;
    case 'carreaux':
      ctx.globalAlpha = 0.6;
      ctx.fillRect(0, 0, S, S / 2);
      ctx.fillRect(0, 0, S / 2, S);
      ctx.globalAlpha = 1;
      break;
    case 'parquet':
      ctx.lineWidth = 3;
      for (let y = 0; y < S; y += 32) {
        ctx.fillRect(0, y, S, 2);
        const off = (y / 32) % 2 ? 40 : 90;
        ctx.fillRect(off, y, 2, 32);
      }
      break;
    case 'damier':
      ctx.fillRect(0, 0, S / 2, S / 2);
      ctx.fillRect(S / 2, S / 2, S / 2, S / 2);
      break;
    case 'hexa':
      ctx.lineWidth = 3;
      for (let y = 0; y < S + 32; y += 28) {
        for (let x = (y / 28) % 2 ? 16 : 0; x < S + 32; x += 32) {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
            ctx.lineTo(x + Math.cos(a) * 17, y + Math.sin(a) * 17);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      break;
    default:
      break;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 4;
  return tex;
}
