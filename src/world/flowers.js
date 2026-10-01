import * as THREE from 'three';
import { Shape, G, paintGradientY } from '../core/materials.js';

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

// --- Plantes et décors des îles (rendu réaliste) -----------------------------------

const _m4 = new THREE.Matrix4();
const _L = new THREE.Vector3();
const _N = new THREE.Vector3();
const _W = new THREE.Vector3();

/** Lame posée dans un plan : longueur selon `L`, face (creux) vers `N`. */
function orientedBlade(geo, L, N) {
  _L.copy(L).normalize();
  _N.copy(N).normalize();
  _W.crossVectors(_L, _N);
  return geo.applyMatrix4(_m4.makeBasis(_L, _N, _W));
}

/** Tournesol : grande tige souple, larges feuilles, deux rangs de pétales autour du cœur. */
export function fineSunflowerGeo() {
  const s = new Shape();
  const top = 1.7;
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, top * 0.55, -0.04), new THREE.Vector3(0, top - 0.06, -0.02));
  s.add(new THREE.TubeGeometry(curve, 8, 0.032, 6, false), (g) => paintGradientY(g, '#3f7a34', '#5f9e45', 0, top));
  for (const [y, a] of [[0.45, 0.4], [0.75, 2.6], [1.05, 4.6], [1.32, 1.4]]) {
    s.add(blade(0.34, 0.13, { cup: 0.35, curl: -0.45, rows: 5, base: '#3a7a33', tip: '#6db24d', taper: 0.75 }), keep, { pos: [0, y, 0], rot: [0, a, 0.55], order: 'YZX' });
  }
  // Dos du capitule (sépales verts), puis le cœur sous les graines.
  s.add(G.cyl(0.19, 0.15, 0.07, 16), '#5f8a35', { pos: [0, top, 0.0], rot: [Math.PI / 2, 0, 0] });
  s.add(new THREE.CircleGeometry(0.18, 20), '#6e5a2a', { pos: [0, top, 0.04] });
  const center = new THREE.Vector3(0, top, 0.05);
  const facing = new THREE.Vector3(0, 0, 1);
  for (const [n, r, z, base, tip, len, phase] of [[16, 0.16, -0.01, '#e9930f', '#fbc22e', 0.19, 0.5], [16, 0.15, 0.0, '#f4a614', '#ffd84a', 0.21, 0]]) {
    for (let i = 0; i < n; i++) {
      const a = ((i + phase) / n) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
      const g = orientedBlade(blade(len, 0.045, { cup: 0.18, curl: -0.18, rows: 3, base, tip, taper: 0.7 }), dir, facing);
      s.add(g, keep, { pos: [center.x + dir.x * r, center.y + dir.y * r, center.z + z] });
    }
  }
  return s.build();
}

/** Carotte sauvage : épaule orange qui sort de terre, fanes fines et retombantes. */
export function fineCarrotGeo() {
  const s = new Shape();
  // Seul le collet dépasse de la terre.
  s.add(G.cone(0.07, 0.24, 12), (g) => paintGradientY(g, '#c95a14', '#f39236', -0.2, 0.04), { pos: [0, -0.08, 0], rot: [Math.PI, 0, 0] });
  s.add(G.sphere(0.07, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#f39a3c', { pos: [0, 0.04, 0], scale: [1, 0.35, 1] });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + (i % 2) * 0.2;
    s.add(blade(0.32 + (i % 3) * 0.05, 0.028, { cup: 0.2, curl: -0.35, rows: 5, base: '#4a9238', tip: '#86c75e', taper: 0.45 }), keep, { pos: [0, 0.06, 0], rot: [0, a, 1.2 - (i % 2) * 0.18], order: 'YZX' });
  }
  return s.build();
}

/** Edelweiss : étoile de bractées laineuses blanches, cœur jaune pâle, feuilles grises. */
export function fineEdelweissGeo() {
  const s = new Shape();
  const h = 0.27;
  s.add(stem(h, 0.01, 0.02), '#8fa98a');
  for (let i = 0; i < 3; i++) {
    s.add(blade(0.12, 0.022, { cup: 0.4, curl: -0.4, base: '#8ea38a', tip: '#c3cdbd', taper: 0.6 }), keep, { pos: [0, 0.02 + i * 0.03, 0], rot: [0, i * 2.1, 0.8], order: 'YZX' });
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    s.add(blade(0.075, 0.021, { cup: 0.3, curl: -0.15, rows: 3, base: '#e4e7da', tip: '#ffffff', taper: 0.9 }), keep, { pos: [0, h, 0], rot: [0, a, 0.18], order: 'YZX' });
  }
  for (const [x, z] of [[0, 0], [0.018, 0.01], [-0.016, 0.012], [0.004, -0.019], [-0.014, -0.012]]) s.add(G.sphere(0.013, 6, 4), '#eadf9e', { pos: [x, h + 0.012, z] });
  return s.build();
}

/** Fleur d'hibiscus orientée vers +Z : cinq larges pétales et un long pistil. */
function hibiscusFlower(color) {
  const f = new Shape();
  const base = darken(color, 0.3);
  const tip = lighten(color, 0.12);
  for (let p = 0; p < 5; p++) {
    f.add(blade(0.13, 0.065, { cup: 0.55, curl: 0.25, rows: 4, base, tip, taper: 0.55 }), keep, { rot: [0, (p / 5) * Math.PI * 2, 0.7], order: 'YZX' });
  }
  f.add(G.cyl(0.006, 0.008, 0.12, 5), '#fbe27a', { pos: [0, 0.06, 0] });
  f.add(G.sphere(0.014, 6, 4), '#ffd23a', { pos: [0, 0.125, 0] });
  return f.build().rotateX(Math.PI / 2);
}

/** Hibiscus : buisson de feuilles luisantes et grandes fleurs tropicales. */
export function fineHibiscusGeo() {
  const s = new Shape();
  // Feuillage : feuilles couchées sur un dôme (pointe vers l'extérieur et le haut),
  // assez serrées pour couvrir le cœur du buisson.
  const n = 96;
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const el = Math.asin(t * 0.98) - 0.15 + Math.sin(i * 3.7) * 0.08;
    const az = i * 2.39996 + Math.sin(i * 5.1) * 0.25;
    const dir = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).normalize();
    const p = new THREE.Vector3(dir.x * 0.34, 0.34 + dir.y * 0.3, dir.z * 0.32);
    const tangent = up.clone().addScaledVector(dir, -dir.dot(up));
    if (tangent.lengthSq() < 1e-4) tangent.set(1, 0, 0);
    // Un peu de désordre : taille, inclinaison et rotation propres à chaque feuille.
    const r1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    const r2 = Math.abs(Math.sin(i * 78.233) * 12543.341) % 1;
    const r3 = Math.abs(Math.sin(i * 39.425) * 24634.633) % 1;
    const L = tangent.normalize().multiplyScalar(0.8).addScaledVector(dir, 0.3 + r1 * 0.8).normalize();
    L.applyAxisAngle(dir, (r2 - 0.5) * 1.6);
    const dark = r3 < 0.35;
    const len = 0.15 + r1 * 0.12;
    const g = orientedBlade(blade(len, len * 0.4, { cup: 0.2 + r2 * 0.2, curl: -0.25 - r3 * 0.4, rows: 3, base: dark ? '#2f6f35' : '#3a8a3e', tip: dark ? '#4f9a45' : r3 > 0.8 ? '#86cf62' : '#6cbf55', taper: 0.7 }), L, dir);
    s.add(g, keep, { pos: [p.x + (r2 - 0.5) * 0.05, p.y + (r1 - 0.5) * 0.05, p.z + (r3 - 0.5) * 0.05] });
  }
  s.add(G.sphere(0.28, 10, 7), (g) => paintGradientY(g, '#2f6f35', '#46924a', 0.1, 0.6), { pos: [0, 0.32, 0], scale: [1.1, 0.85, 1] });
  const cols = ['#ff4d6a', '#ff8fb1', '#ffa53d'];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const d = new THREE.Vector3(Math.cos(a), 0.55 + Math.sin(i) * 0.15, Math.sin(a)).normalize();
    s.add(hibiscusFlower(cols[i % 3]), keep, { pos: [d.x * 0.42, 0.42 + d.y * 0.32, d.z * 0.38], dir: [d.x, d.y, d.z] });
  }
  return s.build();
}

/** Grappe de cristaux : prismes hexagonaux pointus, clairs à la pointe, sur un socle de roche. */
export function fineCrystalGeo() {
  const s = new Shape();
  s.add(G.ico(0.55, 1), (g) => paintGradientY(g, '#6f6a64', '#a39d94', -0.2, 0.3), { scale: [1.25, 0.45, 1.05] });
  const cols = [['#7d5fd6', '#e6d6ff'], ['#4f9fd8', '#d8f2ff'], ['#d65fae', '#ffd6f0'], ['#5fc8d6', '#e0fbff']];
  const list = [[0, 0, 0, 1.0, 0, 0.15], [0.28, 0, 0.18, 0.7, 0.4, 0.12], [-0.3, 0, 0.1, 0.78, -0.35, 0.13], [0.08, 0, -0.3, 0.6, 0.25, 0.11], [-0.14, 0, 0.3, 0.5, -0.55, 0.1], [0.34, 0, -0.16, 0.42, 0.65, 0.09], [-0.36, 0, -0.18, 0.38, -0.7, 0.08]];
  list.forEach(([x, y, z, h, tilt, r], i) => {
    const [lo, hi] = cols[i % cols.length];
    const c = new Shape();
    c.add(G.cyl(r * 0.88, r, h, 6), (g) => paintGradientY(g, lo, lighten(lo, 0.45), -h / 2, h / 2), { pos: [0, h / 2, 0] });
    c.add(G.cone(r * 0.88, r * 2.2, 6), (g) => paintGradientY(g, lighten(lo, 0.45), hi, h, h + r * 2.2), { pos: [0, h + r * 1.1, 0] });
    s.add(c.build(), keep, { pos: [x, y + 0.05, z], rot: [tilt * 0.5, i * 0.7, tilt] });
  });
  return s.build();
}

/** Corail : branches qui montent en se divisant, bouts arrondis, et un petit corail-cerveau. */
export function fineCoralGeo() {
  const s = new Shape();
  // Couleurs vives : sous l'eau, elles se délavent.
  const cols = [['#d42f55', '#ff7f9a'], ['#e5582c', '#ffa56e'], ['#7440c4', '#b98cff']];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const [lo, hi] = cols[i];
    const bx = Math.cos(a) * 0.1;
    const bz = Math.sin(a) * 0.1;
    const h = 0.3 + i * 0.06;
    const trunk = new THREE.QuadraticBezierCurve3(new THREE.Vector3(bx, 0, bz), new THREE.Vector3(bx * 1.6, h * 0.5, bz * 1.6), new THREE.Vector3(bx * 2.2, h, bz * 2.2));
    s.add(new THREE.TubeGeometry(trunk, 5, 0.03, 6, false), (g) => paintGradientY(g, lo, hi, 0, h + 0.15));
    s.add(G.sphere(0.034, 8, 6), hi, { pos: [bx * 2.2, h, bz * 2.2] });
    for (const side of [-1, 1]) {
      const sa = a + side * 0.9;
      const start = trunk.getPoint(0.55);
      const end = start.clone().add(new THREE.Vector3(Math.cos(sa) * 0.1, 0.14, Math.sin(sa) * 0.1));
      const br = new THREE.QuadraticBezierCurve3(start, start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, -0.02, 0)), end);
      s.add(new THREE.TubeGeometry(br, 4, 0.022, 5, false), (g) => paintGradientY(g, lo, hi, 0, h + 0.15));
      s.add(G.sphere(0.026, 6, 5), hi, { pos: [end.x, end.y, end.z] });
    }
  }
  s.add(G.sphere(0.11, 12, 8), (g) => paintGradientY(g, '#b36a2a', '#eba24a', -0.05, 0.12), { pos: [-0.16, 0.04, -0.12], scale: [1, 0.65, 1] });
  return s.build();
}
