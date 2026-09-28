import * as THREE from 'three';
import { Shape, G, toon, addWind, addSeason, paintGradientY, isRealistic } from '../core/materials.js';
import { createRng, smoothstep } from '../core/math.js';
import { ISLANDS, LANDMARKS, SLED_COURSE } from './layout.js';
import { natureGeometries, kindOffset, flowerColors, surfaceSpots } from './natureModels.js';
import { crownOf } from '../core/models.js';
import { TREE_KINDS, TreeForest, treeTextures, clearTreeCache, treeFocus, updateLeafLighting } from './trees.js';
import { groundTextures } from './terrainTextures.js';
import { rockGeometries, addRockDetail } from './rocks.js';
import { fineFlowerGeo, fineTulipGeo, fineMushroomGeo } from './flowers.js';

// Végétation instanciée : arbres, buissons à baies, fleurs, herbe, rochers,
// champignons, tournesols et carottes sauvages (les trois derniers sont récoltables).

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _c = new THREE.Color();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const FINE_KINDS = new Set(['flower', 'tulip', 'mushroom']);

/** Distance à la piste de luge (dégagée des arbres et des rochers). */
function sledDistance(x, z) {
  let best = Infinity;
  for (let i = 1; i < SLED_COURSE.length; i++) {
    const [ax, az] = SLED_COURSE[i - 1];
    const [bx, bz] = SLED_COURSE[i];
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

// --- Géométries --------------------------------------------------------------

function canopy(s, blobs, low, high, y0, y1) {
  for (const [x, y, z, r] of blobs) {
    s.add(G.ico(r, 1), (g) => paintGradientY(g, low, high, y0, y1), { pos: [x, y, z] });
  }
}

function treeRound(low, high, trunk = '#9a6a4a') {
  const s = new Shape();
  s.add(G.cyl(0.2, 0.34, 2.6, 8), trunk, { pos: [0, 1.3, 0] });
  s.add(G.cyl(0.07, 0.11, 1.1, 6), trunk, { pos: [0.38, 2.2, 0.05], rot: [0, 0, -0.85] });
  canopy(
    s,
    [
      [0, 3.6, 0, 1.9],
      [1.0, 3.1, 0.4, 1.35],
      [-0.9, 3.2, -0.3, 1.45],
      [0.15, 4.6, -0.2, 1.3],
      [-0.3, 3.0, 1.0, 1.25],
      [0.4, 3.2, -1.0, 1.2],
    ],
    low,
    high,
    2.0,
    5.6,
  );
  return s.build();
}

function treePine() {
  const s = new Shape();
  s.add(G.cyl(0.18, 0.3, 2.0, 7), '#8a5d43', { pos: [0, 1.0, 0] });
  const tiers = [
    [2.0, 2.6, 2.3],
    [1.6, 2.3, 3.6],
    [1.15, 2.0, 4.8],
    [0.7, 1.5, 5.8],
  ];
  for (const [r, h, y] of tiers) {
    s.add(G.cone(r, h, 9), (g) => paintGradientY(g, '#3d8a5c', '#78c784', 1.2, 6.8), { pos: [0, y, 0] });
  }
  return s.build();
}

function treeApple() {
  const s = new Shape();
  s.add(G.cyl(0.18, 0.3, 1.9, 8), '#9a6a4a', { pos: [0, 0.95, 0] });
  canopy(
    s,
    [
      [0, 2.9, 0, 1.6],
      [0.9, 2.5, 0.3, 1.1],
      [-0.8, 2.6, -0.2, 1.15],
      [0.1, 3.7, 0, 1.05],
      [-0.2, 2.5, 0.9, 1.0],
    ],
    '#6cbc5c',
    '#a8de7a',
    1.6,
    4.6,
  );
  return s.build();
}

// Positions des fruits sur le feuillage du pommier.
const APPLE_SPOTS = [
  [1.3, 2.6, 0.9], [-1.2, 2.5, 0.8], [0.4, 2.3, 1.7], [1.7, 2.9, -0.4],
  [-1.5, 3.0, -0.7], [0.2, 3.3, -1.5], [-0.6, 2.2, 1.4], [0.9, 3.9, 0.7],
];

function appleGeo() {
  const s = new Shape();
  for (const [x, y, z] of APPLE_SPOTS) {
    s.add(G.sphere(0.2, 10, 8), '#e5484d', { pos: [x, y, z] });
    s.add(G.cyl(0.02, 0.02, 0.12, 4), '#6b4a2a', { pos: [x, y + 0.2, z] });
  }
  return s.build();
}

function bushGeo() {
  const s = new Shape();
  canopy(
    s,
    [
      [0, 0.55, 0, 0.8],
      [0.6, 0.45, 0.2, 0.6],
      [-0.55, 0.45, -0.1, 0.62],
      [0.1, 0.45, 0.6, 0.55],
    ],
    '#4f9e55',
    '#8ed07a',
    0,
    1.3,
  );
  return s.build();
}

const BERRY_SPOTS = [
  [0.5, 0.95, 0.45], [-0.45, 0.9, 0.5], [0.85, 0.6, 0.5], [-0.8, 0.7, 0.25],
  [0.15, 1.2, 0.3], [0.3, 0.6, 0.95], [-0.2, 0.55, 0.95], [0.9, 0.85, -0.2],
  [-0.6, 1.0, -0.4], [0.05, 1.3, -0.35],
];

function berriesGeo() {
  const s = new Shape();
  for (const [x, y, z] of BERRY_SPOTS) s.add(G.sphere(0.1, 8, 6), '#e0385f', { pos: [x, y, z] });
  return s.build();
}

function flowerGeo(petal, center = '#ffd84d') {
  if (isRealistic()) return fineFlowerGeo(petal, center);
  const s = new Shape();
  s.add(G.cyl(0.022, 0.028, 0.46, 4, true), '#4f9e4f', { pos: [0, 0.23, 0] });
  s.add(G.sphere(0.07, 5, 3), '#5fae55', { pos: [0.07, 0.12, 0], scale: [1, 0.3, 0.55], rot: [0, 0, 0.5] });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    s.add(G.sphere(0.075, 6, 4), petal, {
      pos: [Math.cos(a) * 0.075, 0.48, Math.sin(a) * 0.075],
      rot: [0, -a, 0.25],
      scale: [1, 0.32, 0.62],
    });
  }
  s.add(G.sphere(0.045, 6, 4), center, { pos: [0, 0.5, 0] });
  return s.build();
}

function tulipGeo(color) {
  if (isRealistic()) return fineTulipGeo(color);
  const s = new Shape();
  s.add(G.cyl(0.022, 0.028, 0.5, 4, true), '#4f9e4f', { pos: [0, 0.25, 0] });
  s.add(G.sphere(0.08, 5, 3), '#5fae55', { pos: [0.06, 0.18, 0], scale: [0.6, 1.6, 0.3], rot: [0, 0, -0.3] });
  s.add(G.sphere(0.1, 7, 5), color, { pos: [0, 0.56, 0], scale: [1, 1.25, 1] });
  s.add(G.cone(0.05, 0.1, 4), color, { pos: [0, 0.7, 0] });
  return s.build();
}

function grassGeo() {
  const s = new Shape();
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + i;
    const r = 0.06;
    const h = 0.38 + (i % 3) * 0.08;
    s.add(new THREE.ConeGeometry(0.045, h, 3, 1, true), (g) => paintGradientY(g, '#8c8c8c', '#ffffff', 0, 0.5), {
      pos: [Math.cos(a) * r, h / 2, Math.sin(a) * r],
      rot: [Math.sin(a) * 0.35, a, Math.cos(a) * 0.35],
    });
  }
  return s.build();
}

function rockGeo() {
  const s = new Shape();
  s.add(G.dodeca(1), (g) => paintGradientY(g, '#8f8a84', '#cfc9bf', -0.6, 0.9), { scale: [1, 0.68, 0.9] });
  s.add(G.dodeca(0.45), (g) => paintGradientY(g, '#8f8a84', '#cfc9bf', -0.6, 0.9), { pos: [0.8, -0.1, 0.3] });
  return s.build();
}

function mushroomGeo() {
  if (isRealistic()) return fineMushroomGeo();
  const s = new Shape();
  s.add(G.cyl(0.07, 0.09, 0.25, 7), '#fbf3e4', { pos: [0, 0.12, 0] });
  s.add(new THREE.SphereGeometry(0.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#e8504f', { pos: [0, 0.22, 0], scale: [1, 0.8, 1] });
  s.add(new THREE.CircleGeometry(0.2, 12), '#f3e6d0', { pos: [0, 0.22, 0], rot: [Math.PI / 2, 0, 0] });
  const dots = [[0.1, 0.33, 0.06], [-0.08, 0.34, 0.08], [0.02, 0.37, -0.1], [-0.12, 0.28, -0.08], [0.14, 0.27, -0.06]];
  for (const [x, y, z] of dots) s.add(G.sphere(0.035, 6, 4), '#ffffff', { pos: [x, y, z] });
  s.add(G.cyl(0.05, 0.065, 0.16, 6), '#fbf3e4', { pos: [0.22, 0.08, 0.1] });
  s.add(new THREE.SphereGeometry(0.12, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#e8504f', { pos: [0.22, 0.15, 0.1], scale: [1, 0.8, 1] });
  return s.build();
}

function sunflowerGeo() {
  const s = new Shape();
  s.add(G.cyl(0.04, 0.06, 1.6, 6), '#5aa04f', { pos: [0, 0.8, 0] });
  s.add(G.sphere(0.18, 6, 4), '#5fae55', { pos: [0.14, 0.7, 0], scale: [1, 0.25, 0.5], rot: [0, 0, 0.4] });
  s.add(G.sphere(0.18, 6, 4), '#5fae55', { pos: [-0.14, 1.0, 0], scale: [1, 0.25, 0.5], rot: [0, 0, -0.4] });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    s.add(G.sphere(0.13, 6, 4), '#ffcf3a', {
      pos: [Math.cos(a) * 0.25, 1.7 + Math.sin(a) * 0.25, 0.08],
      rot: [0, 0, a],
      scale: [1, 0.42, 0.18],
    });
  }
  s.add(G.cyl(0.16, 0.16, 0.08, 12), '#7a9a3a', { pos: [0, 1.7, 0.02], rot: [Math.PI / 2, 0, 0] });
  return s.build();
}

function sunflowerSeedsGeo() {
  const s = new Shape();
  s.add(G.sphere(0.2, 12, 8), '#6b4326', { pos: [0, 1.7, 0.1], scale: [1, 1, 0.35] });
  return s.build();
}

function carrotGeo() {
  const s = new Shape();
  s.add(G.cone(0.1, 0.2, 7), '#f28a2e', { pos: [0, 0.03, 0], rot: [Math.PI, 0, 0] });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    s.add(G.cone(0.05, 0.42, 4), '#5fb04f', { pos: [Math.cos(a) * 0.05, 0.3, Math.sin(a) * 0.05], rot: [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35] });
  }
  return s.build();
}

// --- Îles : sapins enneigés, palmiers, cristaux, coraux… -------------------------

function treePineSnow() {
  const s = new Shape();
  s.add(G.cyl(0.18, 0.3, 2.0, 7), '#7a5038', { pos: [0, 1.0, 0] });
  const tiers = [[2.1, 2.6, 2.3], [1.65, 2.3, 3.6], [1.2, 2.0, 4.8], [0.72, 1.5, 5.8]];
  for (const [r, h, y] of tiers) {
    s.add(G.cone(r, h, 9), (g) => paintGradientY(g, '#2f7650', '#5fae78', 1.2, 6.8), { pos: [0, y, 0] });
    s.add(G.cone(r * 0.8, h * 0.45, 9), '#f4f8ff', { pos: [0, y + h * 0.3, 0] });
  }
  return s.build();
}

function treeFir() {
  const s = new Shape();
  s.add(G.cyl(0.14, 0.24, 1.6, 7), '#7a5038', { pos: [0, 0.8, 0] });
  s.add(G.cone(1.25, 5.2, 8), (g) => paintGradientY(g, '#2f6f4c', '#6fb07f', 1.0, 6.6), { pos: [0, 3.9, 0] });
  return s.build();
}

function palmGeo() {
  const s = new Shape();
  let x = 0;
  let y = 0;
  for (let i = 0; i < 7; i++) {
    const nx = x + 0.12 + i * 0.03;
    const ny = y + 0.85;
    const len = Math.hypot(nx - x, ny - y);
    const g = G.cyl(0.2 - i * 0.012, 0.23 - i * 0.012, len, 8);
    s.add(g, i % 2 ? '#b98a5f' : '#a47a52', { pos: [(x + nx) / 2, (y + ny) / 2, 0], rot: [0, 0, -Math.atan2(nx - x, ny - y)] });
    s.add(G.torus(0.2 - i * 0.012, 0.03, 4, 10), '#8f6a45', { pos: [x, y, 0], rot: [Math.PI / 2, 0, -Math.atan2(nx - x, ny - y)] });
    x = nx;
    y = ny;
  }
  const top = [x, y, 0];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    for (let k = 0; k < 4; k++) {
      const d = 0.45 + k * 0.55;
      const droop = -0.12 * k * k;
      s.add(G.sphere(0.32 - k * 0.04, 6, 4), (g) => paintGradientY(g, '#3f9a4f', '#8fd46a', -1.5, 0.3), {
        pos: [top[0] + Math.cos(a) * d, top[1] + droop + 0.1, top[2] + Math.sin(a) * d],
        rot: [0, -a, 0],
        scale: [1.5, 0.22, 0.55],
      });
    }
  }
  return { geo: s.build(), top };
}

function coconutsGeo(top) {
  const s = new Shape();
  for (const [x, z] of [[0.18, 0.1], [-0.12, 0.16], [0.02, -0.2], [-0.2, -0.05]]) s.add(G.sphere(0.16, 8, 6), '#6b4a2e', { pos: [top[0] + x, top[1] - 0.25, top[2] + z] });
  return s.build();
}

function crystalGeo() {
  const s = new Shape();
  s.add(G.dodeca(0.6), '#9a948c', { scale: [1.2, 0.5, 1] });
  const cols = ['#c9a0ff', '#9fd8ff', '#ffb3e6', '#b9f0ff'];
  const spikes = [[0, 0, 0, 0.9, 0], [0.3, 0, 0.2, 0.6, 0.35], [-0.3, 0, 0.1, 0.7, -0.3], [0.1, 0, -0.3, 0.55, 0.2], [-0.15, 0, 0.3, 0.45, -0.5]];
  spikes.forEach(([x, y, z, h, tilt], i) => {
    s.add(G.cyl(0.13, 0.16, h, 6), cols[i % cols.length], { pos: [x, y + h / 2 + 0.1, z], rot: [tilt * 0.5, 0, tilt] });
    s.add(G.cone(0.13, 0.22, 6), cols[i % cols.length], { pos: [x - Math.sin(tilt) * h * 0.5, y + h + 0.2, z + Math.sin(tilt * 0.5) * h * 0.25], rot: [tilt * 0.5, 0, tilt] });
  });
  return s.build();
}

function edelweissGeo() {
  const s = new Shape();
  s.add(G.cyl(0.018, 0.022, 0.3, 4, true), '#8fb58a', { pos: [0, 0.15, 0] });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    s.add(G.sphere(0.06, 5, 3), '#f7f7f0', { pos: [Math.cos(a) * 0.07, 0.31, Math.sin(a) * 0.07], rot: [0, -a, 0.15], scale: [1.3, 0.3, 0.55] });
  }
  s.add(G.sphere(0.035, 6, 4), '#ffe27a', { pos: [0, 0.33, 0] });
  return s.build();
}

function hibiscusGeo() {
  const s = new Shape();
  s.add(G.ico(0.45, 1), (g) => paintGradientY(g, '#3f8f4a', '#79c65f', 0, 0.8), { pos: [0, 0.4, 0], scale: [1.2, 0.9, 1.1] });
  const cols = ['#ff5d73', '#ff8fb1', '#ffb347'];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const x = Math.cos(a) * 0.42;
    const z = Math.sin(a) * 0.38;
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2;
      s.add(G.sphere(0.07, 5, 3), cols[i % 3], { pos: [x + Math.cos(pa) * 0.06, 0.62 + Math.sin(i) * 0.1, z + Math.sin(pa) * 0.06], scale: [1, 0.4, 1] });
    }
    s.add(G.sphere(0.03, 4, 3), '#ffe27a', { pos: [x, 0.66 + Math.sin(i) * 0.1, z] });
  }
  return s.build();
}

function coralGeo() {
  const s = new Shape();
  const cols = ['#ff7f91', '#ffb3a0', '#c9a0ff'];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const h = 0.25 + (i % 3) * 0.1;
    s.add(G.cyl(0.035, 0.05, h, 5), cols[i % 3], { pos: [Math.cos(a) * 0.12, h / 2, Math.sin(a) * 0.12], rot: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4] });
    s.add(G.sphere(0.05, 5, 4), cols[(i + 1) % 3], { pos: [Math.cos(a) * (0.12 + h * 0.4), h, Math.sin(a) * (0.12 + h * 0.4)] });
  }
  return s.build();
}

function starfishGeo() {
  const s = new Shape();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    s.add(G.sphere(0.07, 6, 4), '#ff8a5c', { pos: [Math.cos(a) * 0.09, 0.02, Math.sin(a) * 0.09], rot: [0, -a, 0], scale: [1.8, 0.35, 0.6] });
  }
  s.add(G.sphere(0.06, 6, 4), '#ff9f7a', { pos: [0, 0.03, 0], scale: [1, 0.4, 1] });
  return s.build();
}

function pineconeGeo() {
  const s = new Shape();
  for (const [x, z, r] of [[0, 0, 0], [0.22, 0.1, 1], [-0.15, 0.18, 2]]) {
    s.add(G.sphere(0.07, 7, 6), '#8a5a3a', { pos: [x, 0.07, z], rot: [Math.PI / 2, r, 0], scale: [0.8, 1.5, 0.8] });
    s.add(G.cone(0.075, 0.1, 6), '#6b4228', { pos: [x, 0.07, z + 0.1], rot: [Math.PI / 2, 0, 0] });
  }
  return s.build();
}

function blueberryBushGeo() {
  const s = new Shape();
  canopy(s, [[0, 0.45, 0, 0.62], [0.45, 0.35, 0.15, 0.45], [-0.4, 0.35, -0.1, 0.48]], '#3f7f55', '#79b87a', 0, 1.0);
  return s.build();
}

function blueberriesGeo() {
  const s = new Shape();
  for (const [x, y, z] of [[0.4, 0.7, 0.35], [-0.35, 0.7, 0.4], [0.6, 0.45, 0.4], [-0.6, 0.55, 0.15], [0.1, 0.95, 0.25], [0.25, 0.45, 0.7], [-0.15, 0.4, 0.7], [0.1, 1.0, -0.3]]) {
    s.add(G.sphere(0.075, 7, 5), '#4a5fb8', { pos: [x, y, z] });
  }
  return s.build();
}

// --- Mise en place ------------------------------------------------------------

function makeInstanced(geo, material, count, { cast = true, receive = true } = {}) {
  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  mesh.count = 0;
  return mesh;
}

function pushInstance(mesh, x, y, z, rotY = 0, scale = 1, color = null, tilt = null) {
  if (mesh.isVariants) return mesh.push(x, y, z, rotY, scale, color, tilt);
  const i = mesh.count;
  if (tilt) _q.setFromUnitVectors(_up, tilt).multiply(new THREE.Quaternion().setFromAxisAngle(_up, rotY));
  else _q.setFromAxisAngle(_up, rotY);
  _m.compose(_p.set(x, y, z), _q, _s.set(scale, scale, scale));
  mesh.setMatrixAt(i, _m);
  if (color) mesh.setColorAt(i, color);
  mesh.count++;
  return i;
}

/**
 * Plusieurs modèles importés pour un même type de plante : chaque instance prend l'un
 * d'eux selon sa position (sans toucher au tirage aléatoire : le monde reste identique).
 */
class Variants extends THREE.Group {
  constructor(geos, material, count, opts, yOffset = 0) {
    super();
    this.isVariants = true;
    this.cap = count;
    this.yOffset = yOffset;
    this.meshes = geos.map((g) => makeInstanced(g, material, count, opts));
    this.meshes.forEach((m) => this.add(m));
  }

  get count() {
    return this.meshes.reduce((n, m) => n + m.count, 0);
  }

  get instanceMatrix() {
    return { count: this.cap };
  }

  push(x, y, z, rotY, scale, color, tilt) {
    const h = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453);
    const m = this.meshes[Math.floor(h) % this.meshes.length];
    return pushInstance(m, x, y + this.yOffset * scale, z, rotY, scale, color, tilt);
  }

  finish() {
    for (const m of this.meshes) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
      m.visible = m.count > 0;
    }
  }
}

/** Fruits (sphères) posés sur les points donnés. */
function fruitsGeo(spots, color, r, stem = null) {
  const s = new Shape();
  for (const p of spots) {
    s.add(G.sphere(r, 8, 6), color, { pos: [p.x, p.y, p.z] });
    if (stem) s.add(G.cyl(0.02, 0.02, r * 0.6, 4), stem, { pos: [p.x, p.y + r, p.z] });
  }
  return s.build();
}

export class Vegetation {
  constructor(world) {
    this.world = world;
    this.group = new THREE.Group();
    this.group.name = 'vegetation';
    this.resources = [];
    const rng = createRng(4242);
    this.rng = rng;

    const vc = () => toon('#ffffff', { vertexColors: true });
    const leafMat = addSeason(addWind(vc(), { strength: 0.006, base: 1.5, key: 'tree' }), { leaf: 1, snowLo: 0.25, snowHi: 0.65 });
    const pineMat = addSeason(addWind(vc(), { strength: 0.006, base: 1.5, key: 'pine' }), { snowLo: 0.2, snowHi: 0.6, snow: 0.9 });
    const bushMat = addSeason(addWind(vc(), { strength: 0.05, base: 0.2, key: 'bush' }), { leaf: 1, snowLo: 0.3, snowHi: 0.7 });
    const flowerMat = addSeason(addWind(vc(), { strength: 0.5, base: 0.05, key: 'flower' }), { snowLo: 0.3, snowHi: 0.8, snow: 0.6 });
    // Pétales et feuilles fins (rendu réaliste) : visibles des deux côtés.
    if (isRealistic()) flowerMat.side = THREE.DoubleSide;
    const grassMat = addSeason(addWind(vc(), { strength: 0.6, base: 0.0, key: 'grass' }), { leaf: 0.7, snowLo: -1, snowHi: 0, snow: 0.75 });
    const tallMat = addSeason(addWind(vc(), { strength: 0.025, base: 0.1, key: 'tall' }), { leaf: 0.5, snowLo: 0.4, snowHi: 0.8, snow: 0.8 });
    const staticMat = addSeason(vc(), { snowLo: 0.4, snowHi: 0.8 });
    // Rochers générés (rendu réaliste) : roche photographiée du sol, un peu de mousse.
    this.rockMat = isRealistic() && groundTextures() ? addRockDetail(addSeason(vc(), { snowLo: 0.4, snowHi: 0.8, key: 'rock' }), { moss: 0.45 }) : null;
    this.pineMat = pineMat;
    this.flowerMat = flowerMat;
    this.forests = {};

    this.placeTrees(rng, leafMat);
    this.placeBushes(rng, bushMat);
    this.placeFlowers(rng, flowerMat);
    this.placeGrass(rng, grassMat);
    this.placeRocks(rng, staticMat);
    this.placeMushrooms(rng, staticMat);
    this.placeSunflowers(rng, tallMat);
    this.placeCarrots(rng, flowerMat);
    this.mats = { leafMat, pineMat, bushMat, flowerMat, grassMat, tallMat, staticMat };
    this.islandGroups = {};
    this.placePins(createRng(9191));
    this.placeCorail(createRng(7373));
    for (const f of Object.values(this.forests)) f.build();
    clearTreeCache();
  }

  /** Arbres générés d'une île (rendu réaliste), dessinés en deux lots. */
  forest(where) {
    return (this.forests[where] ||= new TreeForest(where));
  }

  /** Niveau de détail des arbres selon la caméra ; scale : distances (qualité). */
  updateTrees(cam, scale = 1, focus = null) {
    if (focus) treeFocus.value.set(focus.x, focus.y + 1, focus.z);
    if (Object.keys(this.forests).length) updateLeafLighting(this.world.sky, this.world.scene);
    for (const f of Object.values(this.forests)) {
      f.lodScale = scale;
      if (!f.parent || f.parent.visible) f.update(cam);
    }
  }

  /**
   * Maillage instancié d'un type de plante : modèles importés s'il y en a (plusieurs
   * variantes, ou un seul si single), sinon la géométrie construite en code.
   */
  kind(kind, fallback, material, count, opts = {}, { single = false, extra = null, key = '', where = 'main' } = {}) {
    if (TREE_KINDS[kind] && isRealistic() && treeTextures()) return this.forest(where).kind(kind, count);
    if (kind === 'rock' && this.rockMat) return new Variants((this.rockGeos ||= rockGeometries(6, 1.15)), this.rockMat, count, opts, 0);
    // Fleurs et champignons : versions construites, plus fines, en rendu réaliste.
    if (FINE_KINDS.has(kind) && isRealistic()) {
      const mesh = makeInstanced(fallback(), material, count, opts);
      mesh.userData.model = null;
      return mesh;
    }
    const geos = natureGeometries(kind, { extra, key });
    if (!geos) {
      const mesh = makeInstanced(fallback(), material, count, opts);
      mesh.userData.model = null;
      return mesh;
    }
    if (single || geos.length === 1) {
      const mesh = makeInstanced(geos[0], material, count, opts);
      mesh.userData.model = kind;
      return mesh;
    }
    return new Variants(geos, material, count, opts, kindOffset(kind));
  }

  /**
   * Fruits d'une plante générée : un maillage par variante (baies et noix restent
   * sur la forme de chaque buisson ou palmier). Renvoie aussi le maillage d'une position.
   */
  fruitMeshes(plant, geoOf, cap) {
    const meshes = plant.seeds.map((_, v) => makeInstanced(geoOf(v), toon('#ffffff', { vertexColors: true }), cap, { cast: false }));
    return { meshes, at: (x, z) => meshes[plant.variantAt(x, z)] };
  }

  /** Végétation d'une île secondaire, dans son propre groupe (masqué quand elle est loin). */
  islandGroup(id) {
    if (!this.islandGroups[id]) {
      const g = new THREE.Group();
      g.name = `vegetation-${id}`;
      g.userData.island = ISLANDS[id];
      this.group.add(g);
      this.islandGroups[id] = g;
    }
    return this.islandGroups[id];
  }

  addTo(id, mesh) {
    if (mesh.isTreeKind) {
      if (!mesh.forest.parent) this.islandGroup(id).add(mesh.forest);
      return mesh;
    }
    if (mesh.isVariants) {
      mesh.finish();
      this.islandGroup(id).add(mesh);
      return mesh;
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    this.islandGroup(id).add(mesh);
    return mesh;
  }

  placePins(rng) {
    const I = ISLANDS.pins;
    const { pineMat, leafMat, staticMat, flowerMat, bushMat } = this.mats;
    const area = { area: I.r + 12, center: [I.x, I.z] };
    const where = { where: 'pins' };
    const pines = this.kind('pine', treePine, pineMat, 520, {}, where);
    const firs = this.kind('fir', treeFir, pineMat, 260, {}, where);
    const snowy = this.kind('pineSnow', treePineSnow, pineMat, 200, {}, where);
    const golden = this.kind('treeGolden', () => treeRound('#f0a45a', '#ffd98a', '#8a5a43'), leafMat, 40, {}, where);
    const tint = () => _c.setScalar(rng.range(0.9, 1.08));
    this.scatter(rng, 900, 12000, { ...area, pad: 1.9, pathPad: 2.6, minH: 0.8, maxSlope: 0.5 }, (x, z, h) => {
      const B = LANDMARKS.bourg;
      if (Math.hypot(x - B.x, z - B.z) < 22 && rng() < 0.85) return false;
      if (sledDistance(x, z) < 5) return false;
      // Sommet dégagé (roche et neige), clairières autour du lac et de la source.
      if (h > 16 || (h > 12 && rng() < 0.6)) return false;
      const P = LANDMARKS.peak;
      const L = LANDMARKS.lake;
      const S = LANDMARKS.hotspring;
      if (Math.hypot(x - P.x, z - P.z) < 14) return false;
      if (Math.hypot(x - L.x, z - L.z) < L.r + 9 && rng() < 0.75) return false;
      if (Math.hypot(x - S.x, z - S.z) < S.r + 8) return false;
      const high = h > 10;
      const mesh = high ? (rng() < 0.7 ? snowy : firs) : rng() < 0.5 ? pines : rng() < 0.75 ? firs : rng() < 0.93 ? snowy : golden;
      if (mesh.count >= mesh.instanceMatrix.count) return false;
      pushInstance(mesh, x, h - 0.1, z, rng.range(0, 6.28), rng.range(0.85, 1.45), tint());
      this.world.colliders.addCircle(x, z, 0.55);
      this.world.reserve(x, z, 1.1);
      return true;
    });
    [pines, firs, snowy, golden].forEach((m) => this.addTo('pins', m));

    // Rochers du Pic.
    const rocks = this.kind('rock', rockGeo, staticMat, 120);
    this.scatter(rng, 110, 3000, { ...area, pad: 1.5, pathPad: 2.2, minH: 0.3, maxSlope: 0.9 }, (x, z, h) => {
      if (sledDistance(x, z) < 5.5) return false;
      const sc = rng.range(0.5, 1.6) * (h > 9 ? 1.4 : 1);
      pushInstance(rocks, x, h + 0.1 * sc, z, rng.range(0, 6.28), sc, _c.setScalar(rng.range(0.9, 1.1)));
      if (sc > 0.7) this.world.colliders.addCircle(x, z, 0.85 * sc);
      this.world.reserve(x, z, 1.1 * sc);
    });
    this.addTo('pins', rocks);

    // Cristaux sur les flancs de la montagne (récoltables).
    const crystals = makeInstanced(crystalGeo(), toon('#ffffff', { vertexColors: true, emissive: '#6a5aa0', emissiveIntensity: 0.25 }), 16, { cast: true });
    const P = LANDMARKS.peak;
    let n = 0;
    for (let t = 0; t < 600 && n < 14; t++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(8, 32);
      const x = P.x + Math.cos(a) * r;
      const z = P.z + Math.sin(a) * r;
      const h = this.world.heightAt(x, z);
      if (h < 5 || !this.world.canPlace(x, z, { minH: 5, maxSlope: 0.7, pathPad: 1.5, pad: 2 })) continue;
      const i = pushInstance(crystals, x, h - 0.05, z, rng.range(0, 6.28), rng.range(0.9, 1.3));
      this.world.colliders.addCircle(x, z, 0.6);
      this.world.reserve(x, z, 1.5);
      this.resources.push({ type: 'crystal', x, z, y: h + 0.8, mesh: crystals, index: i, label: 'Détacher un cristal', item: 'cristal', amount: [1, 2], regrow: 30 });
      n++;
    }
    this.addTo('pins', crystals);

    // Myrtilles, edelweiss, pommes de pin, champignons.
    const bb = this.kind('bushBlue', blueberryBushGeo, bushMat, 30, {}, { single: true, where: 'pins' });
    const blue = bb.isTreeKind
      ? this.fruitMeshes(bb, (v) => fruitsGeo(bb.spots(9, { minY: 0.3, out: 0.03 }, v), '#4b5fc9', 0.045), 30)
      : (() => {
        const shape = bb.userData.model ? fruitsGeo(surfaceSpots(bb.geometry, 9, { minY: 0.3, out: 0.04, seed: 7 }), '#4b5fc9', 0.075) : blueberriesGeo();
        const m = makeInstanced(shape, toon('#ffffff', { vertexColors: true }), 30, { cast: false });
        return { meshes: [m], at: () => m };
      })();
    this.scatter(rng, 24, 3000, { ...area, pad: 1.8, pathPad: 2.2, maxSlope: 0.35 }, (x, z, h) => {
      if (h > 12) return false;
      const rot = rng.range(0, 6.28);
      pushInstance(bb, x, h - 0.05, z, rot, 1);
      const berries = blue.at(x, z);
      const i = pushInstance(berries, x, h - 0.05, z, rot, 1);
      this.world.colliders.addCircle(x, z, 0.6);
      this.world.reserve(x, z, 1.3);
      this.resources.push({ type: 'bush', x, z, y: h + 0.8, mesh: berries, index: i, label: 'Cueillir des myrtilles', item: 'myrtille', amount: [2, 3], regrow: 8 });
    });
    this.addTo('pins', bb);
    for (const m of blue.meshes) this.addTo('pins', m);
    const edel = makeInstanced(edelweissGeo(), flowerMat, 160, { cast: false });
    for (let c = 0; c < 26; c++) {
      const cx = I.x + rng.range(-60, 60);
      const cz = I.z + rng.range(-60, 60);
      let pick = c % 2 === 0;
      for (let k = 0; k < 7; k++) {
        const x = cx + rng.range(-2, 2);
        const z = cz + rng.range(-2, 2);
        const h = this.world.heightAt(x, z);
        if (h < 6 || edel.count >= 160 || !this.world.canPlace(x, z, { minH: 6, maxSlope: 0.6, pathPad: 1.2, pad: 0.2 })) continue;
        const i = pushInstance(edel, x, h - 0.02, z, rng.range(0, 6.28), rng.range(0.9, 1.4));
        if (pick) {
          pick = false;
          this.resources.push({ type: 'flower', x, z, y: h + 0.4, mesh: edel, index: i, label: 'Cueillir un edelweiss', item: 'edelweiss', amount: [1, 1], regrow: 16 });
        }
      }
    }
    this.addTo('pins', edel);
    const cones = makeInstanced(pineconeGeo(), staticMat, 40, { cast: false });
    this.scatter(rng, 30, 2000, { ...area, pad: 0.6, pathPad: 1.5, maxSlope: 0.5 }, (x, z, h) => {
      if (h > 12) return false;
      const i = pushInstance(cones, x, h, z, rng.range(0, 6.28), 1.3);
      this.resources.push({ type: 'cone', x, z, y: h + 0.3, mesh: cones, index: i, label: 'Ramasser des pommes de pin', item: 'pomme-pin', amount: [1, 3], regrow: 10 });
    });
    this.addTo('pins', cones);
    const shrooms = this.kind('mushroom', mushroomGeo, staticMat, 50, { cast: false }, { single: true });
    let m = 0;
    this.scatter(rng, 40, 2000, { ...area, pad: 0.5, pathPad: 1.5, maxSlope: 0.45 }, (x, z, h) => {
      if (h > 10) return false;
      const i = pushInstance(shrooms, x, h - 0.02, z, rng.range(0, 6.28), rng.range(0.8, 1.6));
      if (m++ % 3 === 0) this.resources.push({ type: 'mushroom', x, z, y: h + 0.3, mesh: shrooms, index: i, label: 'Ramasser des champignons', item: 'champignon', amount: [1, 2], regrow: 14 });
    });
    this.addTo('pins', shrooms);
    this.placeIslandGrass(rng, 'pins', 5200, 12);
  }

  placeCorail(rng) {
    const I = ISLANDS.corail;
    const { leafMat, staticMat, flowerMat, tallMat } = this.mats;
    const area = { area: I.r + 12, center: [I.x, I.z] };
    const palmMat = addSeason(addWind(toon('#ffffff', { vertexColors: true }), { strength: 0.012, base: 3.5, key: 'palm' }), { leaf: 0.3, snowLo: 0.4, snowHi: 0.8, snow: 0.5 });
    let palm = null;
    const palmFallback = () => (palm ||= palmGeo()).geo;
    const palms = this.kind('palm', palmFallback, palmMat, 170, {}, { where: 'corail' });
    // Cocotiers : noix sous la couronne de chaque forme de cocotier.
    const cocoPalms = palms.userData?.model === null ? palms : this.kind('palmCoco', palmFallback, palmMat, 40, {}, { single: true, where: 'corail' });
    let nuts;
    if (cocoPalms.isTreeKind) {
      nuts = this.fruitMeshes(cocoPalms, (v) => {
        const t = cocoPalms.top(v);
        return coconutsGeo([t.x, t.y + 0.05, t.z]);
      }, 40);
    } else {
      const crown = cocoPalms.userData?.model ? crownOf(cocoPalms.geometry) : null;
      const m = makeInstanced(coconutsGeo(crown ? [crown.x, crown.y + 0.1, crown.z] : (palm ||= palmGeo()).top), toon('#ffffff', { vertexColors: true }), 40);
      nuts = { meshes: [m], at: () => m };
    }
    const nutCount = () => nuts.meshes.reduce((n, m) => n + m.count, 0);
    const palmCount = () => palms.count + (cocoPalms === palms ? 0 : cocoPalms.count);
    const round = this.kind('treeTropical', () => treeRound('#5fb35a', '#b5e07a'), leafMat, 40, {}, { where: 'corail' });
    const tint = () => _c.setScalar(rng.range(0.92, 1.08));
    let k = 0;
    this.scatter(rng, 150, 6000, { ...area, pad: 2.6, pathPad: 2.5, minH: 0.5, maxSlope: 0.4 }, (x, z, h) => {
      const Pt = LANDMARKS.port;
      if (Math.hypot(x - Pt.x, z - Pt.z) < 18) return false;
      const palmsHere = h < 4 || rng() < 0.75;
      if (palmsHere) {
        if (palmCount() >= 170) return false;
        const rot = rng.range(0, 6.28);
        const sc = rng.range(0.85, 1.25);
        const coco = k++ % 4 === 0 && nutCount() < 40;
        pushInstance(coco ? cocoPalms : palms, x, h - 0.1, z, rot, sc, tint());
        if (coco) {
          const coconuts = nuts.at(x, z);
          const ci = pushInstance(coconuts, x, h - 0.1, z, rot, sc);
          this.resources.push({ type: 'palm', x, z, y: h + 1.5, mesh: coconuts, index: ci, label: 'Secouer le cocotier', item: 'noix-coco', amount: [1, 2], regrow: 12 });
        }
      } else {
        if (round.count >= 40) return false;
        pushInstance(round, x, h - 0.1, z, rng.range(0, 6.28), rng.range(0.9, 1.2), tint());
      }
      this.world.colliders.addCircle(x, z, 0.45);
      this.world.reserve(x, z, 1.6);
      return true;
    });
    this.addTo('corail', palms);
    if (cocoPalms !== palms) this.addTo('corail', cocoPalms);
    for (const m of nuts.meshes) this.addTo('corail', m);
    this.addTo('corail', round);

    // Hibiscus, fleurs, étoiles de mer, coquillages, coraux du lagon.
    const hib = makeInstanced(hibiscusGeo(), tallMat, 40);
    this.scatter(rng, 32, 3000, { ...area, pad: 1.6, pathPad: 2, maxSlope: 0.35 }, (x, z, h) => {
      const i = pushInstance(hib, x, h - 0.05, z, rng.range(0, 6.28), rng.range(0.9, 1.3));
      this.world.colliders.addCircle(x, z, 0.45);
      this.world.reserve(x, z, 1.1);
      if (i % 2 === 0) this.resources.push({ type: 'flower', x, z, y: h + 0.8, mesh: hib, index: i, label: 'Cueillir un hibiscus', item: 'hibiscus', amount: [1, 2], regrow: 10 });
    });
    this.addTo('corail', hib);
    const flowers = ['#ff8fb1', '#ffd84d', '#ff9f68'].map((c) => this.kind('flower', () => flowerGeo(c), flowerMat, 160, { cast: false }, { single: true, extra: flowerColors(c), key: c }));
    for (let c = 0; c < 40; c++) {
      const cx = I.x + rng.range(-55, 55);
      const cz = I.z + rng.range(-55, 55);
      const mesh = rng.pick(flowers);
      for (let j = 0; j < 7; j++) {
        const x = cx + rng.range(-2, 2);
        const z = cz + rng.range(-2, 2);
        if (mesh.count >= 160 || !this.world.canPlace(x, z, { pad: 0.3, pathPad: 1.8, minH: 1.4, maxSlope: 0.3 })) continue;
        pushInstance(mesh, x, this.world.heightAt(x, z) - 0.02, z, rng.range(0, 6.28), rng.range(0.8, 1.3));
      }
    }
    flowers.forEach((f) => this.addTo('corail', f));
    const stars = makeInstanced(starfishGeo(), staticMat, 40, { cast: false });
    const corals = makeInstanced(coralGeo(), staticMat, 70, { cast: false });
    let sp = 0;
    for (let t = 0; t < 3000; t++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(I.r - 20, I.r + 22);
      const x = I.x + Math.cos(a) * r;
      const z = I.z + Math.sin(a) * r;
      const h = this.world.heightAt(x, z);
      if (h > 0.15 && h < 1.2 && stars.count < 40 && t % 2 === 0) {
        const i = pushInstance(stars, x, h + 0.02, z, rng.range(0, 6.28), rng.range(0.9, 1.4));
        if (sp++ % 2 === 0) this.resources.push({ type: 'shell', x, z, y: h + 0.2, mesh: stars, index: i, label: 'Ramasser une étoile de mer', item: 'etoile-mer', amount: [1, 1], regrow: 12 });
      } else if (h > -0.5 && h < 0.1 && corals.count < 70) {
        const i = pushInstance(corals, x, h, z, rng.range(0, 6.28), rng.range(1, 1.8));
        if (corals.count % 3 === 0) this.resources.push({ type: 'coral', x, z, y: Math.max(h, 0) + 0.3, mesh: corals, index: i, label: 'Ramasser du corail', item: 'corail', amount: [1, 1], regrow: 14, bonus: { item: 'perle', chance: 0.12 } });
      }
    }
    this.addTo('corail', stars);
    this.addTo('corail', corals);
    const rocks = this.kind('rock', rockGeo, staticMat, 40);
    this.scatter(rng, 30, 1500, { ...area, pad: 2, pathPad: 2.5, minH: -1.5, maxSlope: 0.6 }, (x, z, h) => {
      const sc = rng.range(0.4, 1.1);
      pushInstance(rocks, x, h + 0.1 * sc, z, rng.range(0, 6.28), sc, _c.setScalar(rng.range(0.95, 1.12)));
      if (sc > 0.6) this.world.colliders.addCircle(x, z, 0.9 * sc);
      this.world.reserve(x, z, 1.2 * sc);
    });
    this.addTo('corail', rocks);
    this.placeIslandGrass(rng, 'corail', 4200, 20);
  }

  /** Herbe d'une île, découpée en tuiles pour ne dessiner que ce qui est proche. */
  placeIslandGrass(rng, id, count, TILE) {
    const I = ISLANDS[id];
    const terrain = this.world.terrain;
    const buckets = new Map();
    let placed = 0;
    for (let t = 0; t < count * 3 && placed < count; t++) {
      const x = I.x + rng.range(-I.r - 8, I.r + 8);
      const z = I.z + rng.range(-I.r - 8, I.r + 8);
      const h = terrain.heightAt(x, z);
      if (h < 1.3 || (id === 'pins' && h > 13)) continue;
      if (terrain.pathDistance(x, z) < 1.9) continue;
      if (terrain.slopeAt(x, z) > 0.32) continue;
      const key = `${Math.floor(x / TILE)},${Math.floor(z / TILE)}`;
      if (!buckets.has(key)) buckets.set(key, []);
      const col = terrain.colorAt(x, z, h, 1, new THREE.Color()).multiplyScalar(1.25);
      buckets.get(key).push([x, h - 0.03, z, rng.range(0, 6.28), rng.range(0.7, 1.4), col]);
      placed++;
    }
    const geo = this.grassGeo || (this.grassGeo = grassGeo());
    for (const list of buckets.values()) {
      const mesh = makeInstanced(geo, this.mats.grassMat, list.length, { cast: false });
      let cx = 0;
      let cz = 0;
      for (const [x, y, z, r, sc, col] of list) {
        pushInstance(mesh, x, y, z, r, sc, col);
        cx += x;
        cz += z;
      }
      mesh.userData.center = new THREE.Vector2(cx / list.length, cz / list.length);
      this.addTo(id, mesh);
      this.grassChunks.push(mesh);
    }
  }

  /** Masque les îles lointaines (distance d'affichage). */
  updateIslands(focus, range) {
    for (const g of Object.values(this.islandGroups)) {
      const I = g.userData.island;
      g.visible = Math.hypot(I.x - focus.x, I.z - focus.z) - I.r < range;
    }
  }

  add(mesh) {
    if (mesh.isTreeKind) {
      if (!mesh.forest.parent) this.group.add(mesh.forest);
      return mesh;
    }
    if (mesh.isVariants) {
      mesh.finish();
      this.group.add(mesh);
      return mesh;
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    this.group.add(mesh);
    return mesh;
  }

  /** Cherche des positions libres selon une fonction de densité. */
  scatter(rng, count, tries, { minH = 0.9, maxSlope = 0.25, pathPad = 3, pad = 1.5, density = () => 1, area = 100, center = [0, 0] }, fn) {
    let placed = 0;
    for (let t = 0; t < tries && placed < count; t++) {
      const x = center[0] + rng.range(-area, area);
      const z = center[1] + rng.range(-area, area);
      if (rng() > density(x, z)) continue;
      if (!this.world.canPlace(x, z, { minH, maxSlope, pathPad, pad })) continue;
      if (fn(x, z, this.world.heightAt(x, z)) !== false) placed++;
    }
    return placed;
  }

  placeTrees(rng, mat) {
    const types = {
      round: this.kind('treeRound', () => treeRound('#63b35a', '#a6dd7a'), mat, 140),
      light: this.kind('treeLight', () => treeRound('#86c75f', '#d0ea84'), mat, 60),
      cherry: this.kind('treeCherry', () => treeRound('#f19ab8', '#ffd9e6', '#8a5a4a'), mat, 40),
      golden: this.kind('treeGolden', () => treeRound('#f0a45a', '#ffd98a', '#8a5a43'), mat, 30),
      pine: this.kind('pine', treePine, this.pineMat, 160),
      apple: this.kind('treeApple', treeApple, mat, 16, {}, { single: true }),
    };
    const forestD = (x, z) => smoothstep(44, 18, Math.hypot(x + 4, z + 58));
    const tint = () => _c.setScalar(rng.range(0.92, 1.08));

    // Forêt dense au nord.
    this.scatter(rng, 150, 4000, { area: 46, center: [-4, -58], pad: 2.2, density: (x, z) => forestD(x, z) }, (x, z, h) => {
      const mesh = rng() < 0.62 ? types.pine : rng() < 0.8 ? types.round : types.golden;
      pushInstance(mesh, x, h - 0.1, z, rng.range(0, 6.28), rng.range(0.85, 1.35), tint());
      this.world.colliders.addCircle(x, z, 0.55);
      this.world.reserve(x, z, 1.2);
    });

    // Arbres épars sur l'île.
    this.scatter(rng, 110, 3000, { area: 95, pad: 3.5, density: (x, z) => 0.35 * (1 - forestD(x, z)) * smoothstep(18, 30, Math.hypot(x, z)) }, (x, z, h) => {
      const r = rng();
      const mesh = r < 0.4 ? types.round : r < 0.62 ? types.light : r < 0.82 ? types.cherry : r < 0.92 ? types.golden : types.pine;
      pushInstance(mesh, x, h - 0.1, z, rng.range(0, 6.28), rng.range(0.8, 1.25), tint());
      this.world.colliders.addCircle(x, z, 0.55);
      this.world.reserve(x, z, 1.4);
    });

    // Cerisiers autour de la place et de l'étang.
    const ring = [[16, -10], [-18, -8], [19, 12], [-10, -19], [8, -20], [-40, -6], [-62, 16], [-58, -8], [-44, 20], [24, 20]];
    for (const [x, z] of ring) {
      if (!this.world.canPlace(x, z, { pad: 2.5, pathPad: 2.5 })) continue;
      pushInstance(types.cherry, x, this.world.heightAt(x, z) - 0.1, z, rng.range(0, 6.28), rng.range(1, 1.2), tint());
      this.world.colliders.addCircle(x, z, 0.55);
      this.world.reserve(x, z, 1.4);
    }

    // Verger : pommiers récoltables.
    // Pommes posées sur le feuillage (celui du modèle importé s'il y en a un).
    const appleShape = types.apple.isTreeKind
      ? fruitsGeo(types.apple.spots(8, { minY: 0.4, out: 0.02 }), '#d8343c', 0.15, '#6b4a2a')
      : types.apple.userData.model ? fruitsGeo(surfaceSpots(types.apple.geometry, 8, { minY: 0.42, out: 0.1, seed: 3 }), '#e5484d', 0.2, '#6b4a2a') : appleGeo();
    const apples = makeInstanced(appleShape, toon('#ffffff', { vertexColors: true }), 16);
    this.apples = apples;
    const o = { x: 30, z: -26 };
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const x = o.x - 9 + i * 8 + rng.range(-1, 1);
        const z = o.z - 7 + j * 7 + rng.range(-1, 1);
        if (!this.world.canPlace(x, z, { pad: 1.5, pathPad: 2 })) continue;
        const h = this.world.heightAt(x, z) - 0.1;
        const rot = rng.range(0, 6.28);
        const idx = pushInstance(types.apple, x, h, z, rot, 1, tint());
        const ai = pushInstance(apples, x, h, z, rot, 1);
        this.world.colliders.addCircle(x, z, 0.5);
        this.world.reserve(x, z, 1.4);
        this.resources.push({
          type: 'apple', x, z, y: h + 1.2, mesh: apples, index: ai, matrix: null, treeIndex: idx,
          label: 'Secouer le pommier', item: 'pomme', amount: [1, 3], regrow: 8,
        });
      }
    }
    for (const m of Object.values(types)) this.add(m);
    this.add(apples);
    this.treeMeshes = types;
  }

  placeBushes(rng, mat) {
    const bushes = this.kind('bush', bushGeo, mat, 50, {}, { single: true });
    let red;
    if (bushes.isTreeKind) {
      red = this.fruitMeshes(bushes, (v) => fruitsGeo(bushes.spots(10, { minY: 0.3, out: 0.03 }, v), '#e0385f', 0.055), 50);
    } else {
      const shape = bushes.userData.model ? fruitsGeo(surfaceSpots(bushes.geometry, 10, { minY: 0.3, out: 0.05, seed: 5 }), '#e0385f', 0.1) : berriesGeo();
      const m = makeInstanced(shape, toon('#ffffff', { vertexColors: true }), 50, { cast: false });
      red = { meshes: [m], at: () => m };
    }
    const zonesD = (x, z) => 0.25 + 0.75 * Math.max(smoothstep(50, 25, Math.hypot(x + 4, z + 58)), smoothstep(34, 10, Math.hypot(x - 50, z - 8)));
    this.scatter(rng, 34, 3000, { area: 95, pad: 2, pathPad: 2.5, density: (x, z) => zonesD(x, z) * smoothstep(16, 22, Math.hypot(x, z)) }, (x, z, h) => {
      const rot = rng.range(0, 6.28);
      const sc = rng.range(0.9, 1.2);
      pushInstance(bushes, x, h - 0.05, z, rot, sc);
      const berries = red.at(x, z);
      const bi = pushInstance(berries, x, h - 0.05, z, rot, sc);
      this.world.colliders.addCircle(x, z, 0.75 * sc);
      this.world.reserve(x, z, 1.5);
      this.resources.push({
        type: 'bush', x, z, y: h + 1, mesh: berries, index: bi, label: 'Cueillir des baies', item: 'baie', amount: [2, 3], regrow: 6,
      });
    });
    this.add(bushes);
    for (const m of red.meshes) this.add(m);
  }

  placeFlowers(rng, mat) {
    const palette = ['#ff8fb1', '#ffffff', '#c9a0ff', '#ffd84d', '#8fc7ff', '#ff9f68'];
    const meshes = palette.map((c, i) => this.kind('flower', () => (i === 1 ? flowerGeo('#ffffff', '#ffc94d') : flowerGeo(c)), mat, 500, { cast: false }, { single: true, extra: flowerColors(c), key: c }));
    const tulips = ['#ff6f91', '#ffb0c8', '#fff07a'].map((c) => this.kind('tulip', () => tulipGeo(c), mat, 200, { cast: false }, { single: true, extra: flowerColors(c), key: c }));
    const meadow = (x, z) => smoothstep(34, 12, Math.hypot(x - 50, z - 8));
    // Massifs : on tire un centre puis on plante une touffe de fleurs d'une même couleur.
    for (let c = 0; c < 170; c++) {
      const inMeadow = c < 90;
      const cx = inMeadow ? 50 + rng.range(-26, 26) : rng.range(-90, 90);
      const cz = inMeadow ? 8 + rng.range(-26, 26) : rng.range(-90, 90);
      if (!inMeadow && meadow(cx, cz) > 0.2) continue;
      const useTulip = rng() < 0.3;
      const mesh = useTulip ? rng.pick(tulips) : rng.pick(meshes);
      const n = inMeadow ? rng.int(6, 14) : rng.int(3, 7);
      let pickable = c % 3 === 0;
      for (let i = 0; i < n; i++) {
        const x = cx + rng.range(-2.2, 2.2);
        const z = cz + rng.range(-2.2, 2.2);
        if (mesh.count >= mesh.instanceMatrix.count) break;
        if (!this.world.canPlace(x, z, { pad: 0.3, pathPad: 1.8, minH: 0.95, maxSlope: 0.3 })) continue;
        const y = this.world.heightAt(x, z) - 0.02;
        const idx = pushInstance(mesh, x, y, z, rng.range(0, 6.28), rng.range(0.8, 1.35));
        if (pickable) {
          pickable = false;
          this.resources.push({ type: 'flower', x, z, y: y + 0.5, mesh, index: idx, label: 'Cueillir une fleur', item: 'fleur', amount: [1, 2], regrow: 10 });
        }
      }
    }
    [...meshes, ...tulips].forEach((m) => this.add(m));
    this.flowerMeshes = [...meshes, ...tulips];
  }

  placeGrass(rng, mat) {
    // L'herbe est découpée en tuiles de 20 m : seules celles proches et visibles sont dessinées.
    const count = 9000;
    const TILE = 20;
    const terrain = this.world.terrain;
    const buckets = new Map();
    let placed = 0;
    for (let t = 0; t < count * 3 && placed < count; t++) {
      const x = rng.range(-100, 100);
      const z = rng.range(-100, 100);
      const h = terrain.heightAt(x, z);
      if (h < 1.1) continue;
      if (Math.hypot(x, z) < 15) continue;
      if (terrain.pathDistance(x, z) < 1.9) continue;
      if (terrain.slopeAt(x, z) > 0.3) continue;
      const key = `${Math.floor(x / TILE)},${Math.floor(z / TILE)}`;
      if (!buckets.has(key)) buckets.set(key, []);
      const col = terrain.colorAt(x, z, h, 1, new THREE.Color()).multiplyScalar(1.28);
      buckets.get(key).push([x, h - 0.03, z, rng.range(0, 6.28), rng.range(0.7, 1.4), col]);
      placed++;
    }
    const geo = grassGeo();
    this.grassChunks = [];
    for (const list of buckets.values()) {
      const mesh = makeInstanced(geo, mat, list.length, { cast: false });
      let cx = 0;
      let cz = 0;
      for (const [x, y, z, r, sc, col] of list) {
        pushInstance(mesh, x, y, z, r, sc, col);
        cx += x;
        cz += z;
      }
      mesh.userData.center = new THREE.Vector2(cx / list.length, cz / list.length);
      this.add(mesh);
      this.grassChunks.push(mesh);
    }
  }

  /** Affiche l'herbe seulement près du joueur (distance réglable selon la qualité). */
  updateGrass(focus, radius) {
    if (!this.grassChunks) return;
    for (const m of this.grassChunks) {
      const c = m.userData.center;
      m.visible = radius > 0 && Math.hypot(c.x - focus.x, c.y - focus.z) < radius;
    }
  }

  placeRocks(rng, mat) {
    const rocks = this.kind('rock', rockGeo, mat, 70);
    this.scatter(rng, 55, 2000, { area: 100, pad: 2, pathPad: 2.5, minH: -1.5, maxSlope: 0.6 }, (x, z, h) => {
      const sc = rng.range(0.4, 1.3);
      pushInstance(rocks, x, h + 0.1 * sc, z, rng.range(0, 6.28), sc, _c.setScalar(rng.range(0.9, 1.1)));
      if (sc > 0.6) this.world.colliders.addCircle(x, z, 0.9 * sc);
      this.world.reserve(x, z, 1.2 * sc);
    });
    this.add(rocks);
  }

  placeMushrooms(rng, mat) {
    const shrooms = this.kind('mushroom', mushroomGeo, mat, 60, { cast: false }, { single: true });
    let n = 0;
    this.scatter(rng, 55, 2000, { area: 44, center: [-4, -58], pad: 0.5, pathPad: 1.5 }, (x, z, h) => {
      const i = pushInstance(shrooms, x, h - 0.02, z, rng.range(0, 6.28), rng.range(0.8, 1.6));
      if (n++ % 3 === 0) {
        this.resources.push({ type: 'mushroom', x, z, y: h + 0.3, mesh: shrooms, index: i, label: 'Ramasser des champignons', item: 'champignon', amount: [1, 2], regrow: 14 });
      }
    });
    this.add(shrooms);
    this.placeShells(rng, mat);
  }

  placeShells(rng, mat) {
    const s = new Shape();
    s.add(G.cone(0.14, 0.12, 7), '#ffc9d6', { rot: [0.3, 0, 0], scale: [1, 1, 0.5] });
    s.add(G.cone(0.1, 0.1, 6), '#fff1e0', { pos: [0.25, 0, 0.1], rot: [0.2, 0.5, 0], scale: [1, 1, 0.5] });
    const shells = makeInstanced(s.build(), mat, 40, { cast: false });
    let placed = 0;
    for (let t = 0; t < 400 && placed < 26; t++) {
      const a = rng.range(0.85, 2.2);
      const r = rng.range(78, 96);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const h = this.world.heightAt(x, z);
      if (h < 0.1 || h > 1.1) continue;
      const i = pushInstance(shells, x, h + 0.03, z, rng.range(0, 6.28), rng.range(0.9, 1.4));
      placed++;
      if (placed % 2 === 0) this.resources.push({ type: 'shell', x, z, y: h + 0.2, mesh: shells, index: i, label: 'Ramasser un coquillage', item: 'coquillage', amount: [1, 1], regrow: 10 });
    }
    this.add(shells);
  }

  placeSunflowers(rng, mat) {
    const flowers = makeInstanced(sunflowerGeo(), mat, 20);
    const seeds = makeInstanced(sunflowerSeedsGeo(), mat, 20, { cast: false });
    const spots = [];
    for (let i = 0; i < 7; i++) spots.push([58 + i * 1.6, 20 + Math.sin(i) * 0.6]);
    for (let i = 0; i < 6; i++) spots.push([-30 + i * 1.7, 40 - i * 0.5]);
    for (const [x, z] of spots) {
      if (!this.world.canPlace(x, z, { pad: 0.4, pathPad: 1.5 })) continue;
      const h = this.world.heightAt(x, z) - 0.05;
      const rot = rng.range(-0.4, 0.4);
      pushInstance(flowers, x, h, z, rot, rng.range(0.95, 1.15));
      // Le cœur (graines) reprend exactement la transformation de la fleur.
      const si = seeds.count++;
      flowers.getMatrixAt(flowers.count - 1, _m);
      seeds.setMatrixAt(si, _m);
      this.world.colliders.addCircle(x, z, 0.2);
      this.world.reserve(x, z, 0.8);
      this.resources.push({ type: 'sunflower', x, z, y: h + 1.6, mesh: seeds, index: si, label: 'Récolter des graines', item: 'graine', amount: [2, 4], regrow: 10 });
    }
    this.add(flowers);
    this.add(seeds);
  }

  placeCarrots(rng, mat) {
    const carrots = makeInstanced(carrotGeo(), mat, 40, { cast: false });
    this.scatter(rng, 26, 2000, { area: 30, center: [50, 8], pad: 0.8, pathPad: 2 }, (x, z, h) => {
      const i = pushInstance(carrots, x, h, z, rng.range(0, 6.28), 1.2);
      this.world.reserve(x, z, 0.8);
      this.resources.push({ type: 'carrot', x, z, y: h + 0.4, mesh: carrots, index: i, label: 'Cueillir une carotte', item: 'carotte', amount: [1, 1], regrow: 12 });
    });
    this.add(carrots);
  }

  /** Masque ou réaffiche les fruits d'une ressource. */
  setResourceVisible(res, visible) {
    if (!res.matrix) {
      res.matrix = new THREE.Matrix4();
      res.mesh.getMatrixAt(res.index, res.matrix);
    }
    res.mesh.setMatrixAt(res.index, visible ? res.matrix : ZERO);
    res.mesh.instanceMatrix.needsUpdate = true;
  }
}

