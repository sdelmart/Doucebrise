import * as THREE from 'three';
import { Shape, G } from '../core/materials.js';

// Fleurs et champignons du rendu réaliste, construits en code : pétales courbés en
// dégradé, tige souple et feuilles, formes arrondies (les modèles importés, anguleux,
// restent pour le style cartoon). Légers : environ 150 triangles par fleur.

const keep = (g) => g;
const _c = new THREE.Color();
const _d = new THREE.Color();

/**
 * Lame courbée (pétale ou feuille) le long de +x : largeur arrondie, bords relevés
 * (cup), pointe recourbée (curl). Couleurs du pied à la pointe.
 */
function blade(len, wid, { cup = 0.4, curl = 0.2, rows = 4, base, tip, taper = 0.8 }) {
  const pos = [];
  const col = [];
  const idx = [];
  _c.set(base);
  _d.set(tip);
  for (let j = 0; j <= rows; j++) {
    const t = j / rows;
    const x = len * t;
    const w = wid * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * t)), taper) + wid * 0.08;
    const y = curl * len * t * t;
    for (const k of [-1, 0, 1]) {
      pos.push(x, y + (k ? cup * w : 0), k * w);
      const c = _c.clone().lerp(_d, t * (k ? 1 : 0.85));
      col.push(c.r, c.g, c.b);
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let k = 0; k < 2; k++) {
      const a = j * 3 + k;
      idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Tige légèrement courbée, du sol à (0, h, 0). */
function stem(h, r = 0.011, bend = 0.03) {
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(bend, h * 0.5, 0), new THREE.Vector3(0, h, 0));
  return new THREE.TubeGeometry(curve, 4, r, 4, false);
}

const lighten = (hex, f) => `#${new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), f).getHexString()}`;
const darken = (hex, f) => `#${new THREE.Color(hex).multiplyScalar(1 - f).getHexString()}`;

function leaves(s, h, n = 2, len = 0.17) {
  for (let i = 0; i < n; i++) {
    const a = i * 2.4 + 0.6;
    s.add(blade(len, 0.03, { cup: 0.6, curl: -0.5, base: '#3f8a3a', tip: '#6fb54f', taper: 0.6 }), keep, { pos: [0, h * (0.08 + i * 0.1), 0], rot: [0, a, 0.9] });
  }
}

/** Fleur des champs : pétales en corolle autour d'un cœur bombé. */
export function fineFlowerGeo(petal, center = '#ffd84d') {
  const s = new Shape();
  const h = 0.52;
  s.add(stem(h), '#4f9e4f');
  leaves(s, h);
  const n = 9;
  const tip = lighten(petal, 0.25);
  const base = darken(petal, 0.18);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    s.add(blade(0.13, 0.036, { cup: 0.25, curl: -0.25, base, tip }), keep, { pos: [0, h + 0.01, 0], rot: [0, a, 0.3], order: 'YZX' });
  }
  s.add(new THREE.SphereGeometry(0.045, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), center, { pos: [0, h + 0.005, 0], scale: [1, 0.6, 1] });
  return s.build();
}

/** Tulipe : coupe de six pétales refermés, longues feuilles. */
export function fineTulipGeo(color) {
  const s = new Shape();
  const h = 0.56;
  s.add(stem(h, 0.012, 0.02), '#4f9e4f');
  leaves(s, h, 2, 0.26);
  const base = darken(color, 0.25);
  const tip = lighten(color, 0.15);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + (i % 2 ? 0.3 : 0);
    const out = i % 2 ? 0.03 : 0.02;
    s.add(blade(0.17, 0.055, { cup: 0.9, curl: -0.35, base, tip, taper: 0.5 }), keep, {
      pos: [Math.cos(a) * out, h - 0.01, -Math.sin(a) * out],
      rot: [0, a, 1.28],
      order: 'YZX',
    });
  }
  return s.build();
}

/** Champignons (amanite et son petit) : chapeau lisse à pois, pied crème. */
export function fineMushroomGeo() {
  const s = new Shape();
  const cap = (r, x, y, z) => {
    s.add(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), (g) => {
      // Dégradé : bord plus sombre, sommet plus vif.
      const pos = g.attributes.position;
      g.computeBoundingBox();
      const { min, max } = g.boundingBox;
      const col = new Float32Array(pos.count * 3);
      const lo = new THREE.Color('#b8322f');
      const hi = new THREE.Color('#f0574e');
      for (let i = 0; i < pos.count; i++) {
        const c = lo.clone().lerp(hi, (pos.getY(i) - min.y) / Math.max(1e-4, max.y - min.y));
        col.set([c.r, c.g, c.b], i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }, { pos: [x, y, z], scale: [1, 0.75, 1] });
    s.add(new THREE.CircleGeometry(r * 0.98, 16), '#efe2c8', { pos: [x, y + 0.002, z], rot: [Math.PI / 2, 0, 0] });
  };
  s.add(G.cyl(0.055, 0.075, 0.24, 10), '#f6eedd', { pos: [0, 0.12, 0] });
  cap(0.19, 0, 0.22, 0);
  const dots = [[0.09, 0.3, 0.07], [-0.08, 0.31, 0.08], [0.02, 0.35, -0.08], [-0.11, 0.27, -0.07], [0.13, 0.26, -0.05], [0.0, 0.36, 0.02]];
  for (const [x, y, z] of dots) s.add(G.sphere(0.022, 6, 4), '#fffaf0', { pos: [x, y, z], scale: [1, 0.5, 1] });
  s.add(G.cyl(0.04, 0.055, 0.15, 8), '#f6eedd', { pos: [0.22, 0.075, 0.1] });
  cap(0.11, 0.22, 0.14, 0.1);
  return s.build();
}
