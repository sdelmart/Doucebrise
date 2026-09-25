import * as THREE from 'three';
import { Shape, G, toon, addWind, paintGradientY } from '../core/materials.js';
import { createRng, smoothstep } from '../core/math.js';

// Végétation instanciée : arbres, buissons à baies, fleurs, herbe, rochers,
// champignons, tournesols et carottes sauvages (les trois derniers sont récoltables).

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _c = new THREE.Color();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

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

// --- Mise en place ------------------------------------------------------------

function makeInstanced(geo, material, count, { cast = true, receive = true } = {}) {
  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  mesh.count = 0;
  return mesh;
}

function pushInstance(mesh, x, y, z, rotY = 0, scale = 1, color = null, tilt = null) {
  const i = mesh.count;
  if (tilt) _q.setFromUnitVectors(_up, tilt).multiply(new THREE.Quaternion().setFromAxisAngle(_up, rotY));
  else _q.setFromAxisAngle(_up, rotY);
  _m.compose(_p.set(x, y, z), _q, _s.set(scale, scale, scale));
  mesh.setMatrixAt(i, _m);
  if (color) mesh.setColorAt(i, color);
  mesh.count++;
  return i;
}

export class Vegetation {
  constructor(world) {
    this.world = world;
    this.group = new THREE.Group();
    this.group.name = 'vegetation';
    this.resources = [];
    const rng = createRng(4242);
    this.rng = rng;

    const leafMat = addWind(toon('#ffffff', { vertexColors: true }), { strength: 0.006, base: 1.5, key: 'tree' });
    const bushMat = addWind(toon('#ffffff', { vertexColors: true }), { strength: 0.05, base: 0.2, key: 'bush' });
    const flowerMat = addWind(toon('#ffffff', { vertexColors: true }), { strength: 0.5, base: 0.05, key: 'flower' });
    const grassMat = addWind(toon('#ffffff', { vertexColors: true }), { strength: 0.6, base: 0.0, key: 'grass' });
    const tallMat = addWind(toon('#ffffff', { vertexColors: true }), { strength: 0.025, base: 0.1, key: 'tall' });
    const staticMat = toon('#ffffff', { vertexColors: true });

    this.placeTrees(rng, leafMat);
    this.placeBushes(rng, bushMat);
    this.placeFlowers(rng, flowerMat);
    this.placeGrass(rng, grassMat);
    this.placeRocks(rng, staticMat);
    this.placeMushrooms(rng, staticMat);
    this.placeSunflowers(rng, tallMat);
    this.placeCarrots(rng, flowerMat);
  }

  add(mesh) {
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
      round: makeInstanced(treeRound('#63b35a', '#a6dd7a'), mat, 140),
      light: makeInstanced(treeRound('#86c75f', '#d0ea84'), mat, 60),
      cherry: makeInstanced(treeRound('#f19ab8', '#ffd9e6', '#8a5a4a'), mat, 40),
      golden: makeInstanced(treeRound('#f0a45a', '#ffd98a', '#8a5a43'), mat, 30),
      pine: makeInstanced(treePine(), mat, 160),
      apple: makeInstanced(treeApple(), mat, 16),
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
    const apples = makeInstanced(appleGeo(), toon('#ffffff', { vertexColors: true }), 16);
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
    const bushes = makeInstanced(bushGeo(), mat, 50);
    const berries = makeInstanced(berriesGeo(), toon('#ffffff', { vertexColors: true }), 50);
    berries.castShadow = false;
    const zonesD = (x, z) => 0.25 + 0.75 * Math.max(smoothstep(50, 25, Math.hypot(x + 4, z + 58)), smoothstep(34, 10, Math.hypot(x - 50, z - 8)));
    this.scatter(rng, 34, 3000, { area: 95, pad: 2, pathPad: 2.5, density: (x, z) => zonesD(x, z) * smoothstep(16, 22, Math.hypot(x, z)) }, (x, z, h) => {
      const rot = rng.range(0, 6.28);
      const sc = rng.range(0.9, 1.2);
      pushInstance(bushes, x, h - 0.05, z, rot, sc);
      const bi = pushInstance(berries, x, h - 0.05, z, rot, sc);
      this.world.colliders.addCircle(x, z, 0.75 * sc);
      this.world.reserve(x, z, 1.5);
      this.resources.push({
        type: 'bush', x, z, y: h + 1, mesh: berries, index: bi, label: 'Cueillir des baies', item: 'baie', amount: [2, 3], regrow: 6,
      });
    });
    this.add(bushes);
    this.add(berries);
  }

  placeFlowers(rng, mat) {
    const palette = ['#ff8fb1', '#ffffff', '#c9a0ff', '#ffd84d', '#8fc7ff', '#ff9f68'];
    const meshes = palette.map((c, i) => makeInstanced(i === 1 ? flowerGeo('#ffffff', '#ffc94d') : flowerGeo(c), mat, 500, { cast: false }));
    const tulips = ['#ff6f91', '#ffb0c8', '#fff07a'].map((c) => makeInstanced(tulipGeo(c), mat, 200, { cast: false }));
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
      for (let i = 0; i < n; i++) {
        const x = cx + rng.range(-2.2, 2.2);
        const z = cz + rng.range(-2.2, 2.2);
        if (mesh.count >= mesh.instanceMatrix.count) break;
        if (!this.world.canPlace(x, z, { pad: 0.3, pathPad: 1.8, minH: 0.95, maxSlope: 0.3 })) continue;
        pushInstance(mesh, x, this.world.heightAt(x, z) - 0.02, z, rng.range(0, 6.28), rng.range(0.8, 1.35));
      }
    }
    [...meshes, ...tulips].forEach((m) => this.add(m));
  }

  placeGrass(rng, mat) {
    const count = 9000;
    const grass = makeInstanced(grassGeo(), mat, count, { cast: false });
    const terrain = this.world.terrain;
    for (let t = 0; t < count * 3 && grass.count < count; t++) {
      const x = rng.range(-100, 100);
      const z = rng.range(-100, 100);
      const h = terrain.heightAt(x, z);
      if (h < 1.1) continue;
      if (Math.hypot(x, z) < 15) continue;
      if (terrain.pathDistance(x, z) < 1.9) continue;
      if (terrain.slopeAt(x, z) > 0.3) continue;
      terrain.colorAt(x, z, h, 1, _c).multiplyScalar(1.28);
      pushInstance(grass, x, h - 0.03, z, rng.range(0, 6.28), rng.range(0.7, 1.4), _c);
    }
    this.add(grass);
  }

  placeRocks(rng, mat) {
    const rocks = makeInstanced(rockGeo(), mat, 70);
    this.scatter(rng, 55, 2000, { area: 100, pad: 2, pathPad: 2.5, minH: -1.5, maxSlope: 0.6 }, (x, z, h) => {
      const sc = rng.range(0.4, 1.3);
      pushInstance(rocks, x, h + 0.1 * sc, z, rng.range(0, 6.28), sc, _c.setScalar(rng.range(0.9, 1.1)));
      if (sc > 0.6) this.world.colliders.addCircle(x, z, 0.9 * sc);
      this.world.reserve(x, z, 1.2 * sc);
    });
    this.add(rocks);
  }

  placeMushrooms(rng, mat) {
    const shrooms = makeInstanced(mushroomGeo(), mat, 60, { cast: false });
    this.scatter(rng, 55, 2000, { area: 44, center: [-4, -58], pad: 0.5, pathPad: 1.5 }, (x, z, h) => {
      pushInstance(shrooms, x, h - 0.02, z, rng.range(0, 6.28), rng.range(0.8, 1.6));
    });
    this.add(shrooms);
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

