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
