import * as THREE from 'three';

// Arbres générés : un squelette de branches pousse selon quelques paramètres par
// essence (algorithme adapté d'EZ-Tree, Daniel Greenheck, licence MIT), puis devient
// deux maillages : l'écorce (tubes texturés) et le feuillage (rameaux photographiés,
// posés en croix au bout des branches). Chaque arbre existe en trois niveaux de
// détail : complet de près, allégé au loin (moins de rameaux, plus grands).
// Unités des paramètres : celles d'EZ-Tree ; l'arbre est ensuite mis à la hauteur voulue.

/** Générateur pseudo-aléatoire (celui d'EZ-Tree : mêmes graines, mêmes arbres). */
class RNG {
  constructor(seed) {
    this.w = (123456789 + seed) & 0xffffffff;
    this.z = (987654321 - seed) & 0xffffffff;
  }

  random(max = 1, min = 0) {
    this.z = (36969 * (this.z & 65535) + (this.z >> 16)) & 0xffffffff;
    this.w = (18000 * (this.w & 65535) + (this.w >> 16)) & 0xffffffff;
    const r = (((this.z << 16) + (this.w & 65535)) >>> 0) / 4294967296;
    return (max - min) * r + min;
  }
}

// Écorces et rameaux disponibles (couches des textures, voir treeTextures.js).
export const BARK = { oak: 0, birch: 1, pine: 2 };
export const LEAF = { oak: 0, ash: 1, aspen: 2, pine: 3, cherry: 4, fresh: 5, apple: 6, tropical: 7, palm: 8 };

// Contour de chaque rameau (niveaux [v, u gauche, u droite], du pied à la pointe) : le
// polygone suit la forme du rameau au lieu d'un carré presque vide, ce qui divise par
// deux les pixels transparents à dessiner. Mesuré sur la transparence des textures.
const SHAPE = {
  oak: [[0, 0.342, 0.781], [0.333, 0.219, 0.793], [0.667, 0.168, 0.832], [1, 0.168, 0.832]],
  ash: [[0, 0.285, 0.613], [0.333, 0.176, 0.826], [0.667, 0.174, 0.826], [1, 0.174, 0.719]],
  aspen: [[0, 0.25, 0.66], [0.332, 0.25, 0.752], [0.664, 0.25, 0.752], [0.996, 0.307, 0.697]],
  pine: [[0, 0.189, 0.83], [0.333, 0.104, 0.896], [0.665, 0.104, 0.896], [0.998, 0.111, 0.666]],
};
// Au loin, un simple rectangle ajusté suffit (moins de sommets).
const box = (sh) => {
  const l = Math.min(...sh.map((p) => p[1]));
  const r = Math.max(...sh.map((p) => p[2]));
  return [[0, l, r], [sh[sh.length - 1][0], l, r]];
};
const LEAF_SHAPES = [SHAPE.oak, SHAPE.ash, SHAPE.aspen, SHAPE.pine, SHAPE.ash, SHAPE.aspen, SHAPE.ash, SHAPE.ash, [[0, 0, 1], [1, 0, 1]]].map((sh) => ({ fine: sh, box: box(sh) }));

// Essences : paramètres par niveau (0 = tronc). height : hauteur finale (m).
// leaves.size : taille d'un rameau ; drop : part du feuillage qui tombe l'hiver.
const OAK = {
  type: 'deciduous', bark: BARK.oak, height: 6.4,
  levels: 3, children: [6, 4, 2], angle: [0, 54, 58, 34], start: [0, 0.46, 0.08, 0.15],
  length: [34, 12, 11, 6.5], radius: [1.6, 0.85, 0.7, 1.1], taper: [0.73, 0.45, 0.69, 0.75],
  gnarl: [0.01, -0.1, -0.15, 0.1], twist: [-0.23, 0.42, 0, 0], sections: [8, 6, 3, 2], segments: [9, 6, 4, 3],
  force: -0.01,
  leaves: { leaf: LEAF.oak, count: 5, start: 0.1, size: 6.2, vary: 0.35, angle: 42, drop: 0.9 },
};

export const SPECIES = {
  oak: OAK,
  apple: {
    ...OAK, height: 5.2, children: [5, 4, 2], length: [26, 11, 9, 6], radius: [1.5, 0.85, 0.7, 1.1], start: [0, 0.4, 0.08, 0.15],
    leaves: { ...OAK.leaves, leaf: LEAF.apple, count: 6, size: 6.2 },
  },
  cherry: {
    ...OAK, height: 5.6, children: [5, 4, 3], angle: [0, 62, 52, 34], length: [24, 14, 9, 6], radius: [1.4, 0.8, 0.7, 1.1],
    gnarl: [0.03, -0.14, -0.12, 0.1], start: [0, 0.42, 0.1, 0.15],
    leaves: { ...OAK.leaves, leaf: LEAF.cherry, count: 5, size: 5.4, vary: 0.3 },
  },
  golden: {
    ...OAK, bark: BARK.oak, height: 6.0, children: [7, 4, 2], length: [34, 13, 9, 6],
    leaves: { ...OAK.leaves, leaf: LEAF.aspen, count: 5, size: 6, drop: 0.95 },
  },
  birch: {
    type: 'deciduous', bark: BARK.birch, height: 6.6,
    levels: 2, children: [10, 4, 0], angle: [0, 58, 34], start: [0, 0.5, 0.25],
    length: [50, 9, 11], radius: [0.8, 0.45, 0.7], taper: [0.45, 0.2, 0.7],
    gnarl: [0.04, 0.12, 0.12], twist: [0, 0, 0], sections: [12, 8, 5], segments: [8, 5, 3],
    force: 0.012,
    leaves: { leaf: LEAF.fresh, count: 9, start: 0.1, size: 8, vary: 0.35, angle: 32, drop: 0.9 },
  },
  tropical: {
    ...OAK, height: 5.6, children: [6, 4, 2], angle: [0, 66, 50, 34], length: [26, 15, 10, 6],
    leaves: { ...OAK.leaves, leaf: LEAF.tropical, count: 5, size: 6.2, drop: 0 },
  },
  pine: {
    type: 'evergreen', bark: BARK.pine, height: 6.8,
    levels: 1, children: [34], angle: [0, 112], start: [0, 0.2],
    length: [50, 22], radius: [1.1, 0.4], taper: [0.7, 0.7],
    gnarl: [0.03, 0.08], twist: [0, 0], sections: [10, 5], segments: [8, 4],
    force: -0.004,
    leaves: { leaf: LEAF.pine, count: 9, start: 0.1, size: 7.2, vary: 0.25, angle: 40, drop: 0 },
  },
  // Buissons (d'après les modèles « bush » d'EZ-Tree) : tiges qui partent du sol.
  bush: {
    type: 'deciduous', bark: BARK.oak, height: 1.35,
    levels: 3, children: [6, 3, 2], angle: [0, 26, 60, 58], start: [0, 0.5, 0.3, 0],
    length: [0.1, 15, 5.6, 4.6], radius: [0.6, 0.9, 0.7, 0.6], taper: [0.7, 0.7, 0.7, 0.7],
    gnarl: [0.1, 0.09, 0.05, 0.09], twist: [0.3, -0.07, 0, 0], sections: [3, 5, 5, 4], segments: [4, 4, 3, 3],
    force: -0.02,
    leaves: { leaf: LEAF.apple, count: 8, start: 0, size: 3.4, vary: 0.45, angle: 55, drop: 0.6 },
  },
  blueberry: {
    type: 'deciduous', bark: BARK.oak, height: 1.0,
    levels: 2, children: [12, 3, 0], angle: [0, 24, 34], start: [0, 0.6, 0.5],
    length: [0.1, 18, 7.5], radius: [0.6, 0.9, 0.7], taper: [0.7, 0.7, 0.7],
    gnarl: [0.02, 0.11, 0.05], twist: [0.35, -0.04, 0], sections: [3, 4, 5], segments: [3, 3, 3],
    force: -0.02,
    leaves: { leaf: LEAF.ash, count: 10, start: 0, size: 3.6, vary: 0.4, angle: 55, drop: 0 },
  },
  // Palmier : tronc courbe annelé, couronne de palmes (unités : mètres).
  palm: {
    type: 'palm', bark: BARK.oak, barkTint: [1.45, 1.3, 1.1], trunk: 5.4, bend: 1.1, radius: 0.2,
    fronds: 15, frondLength: 3.1, frondWidth: 1.25,
    leaves: { leaf: LEAF.palm, drop: 0 },
  },
  fir: {
    type: 'evergreen', bark: BARK.pine, height: 7.0,
    levels: 1, children: [40], angle: [0, 118], start: [0, 0.14],
    length: [54, 15], radius: [1.0, 0.35], taper: [0.7, 0.7],
    gnarl: [0.02, 0.06], twist: [0, 0], sections: [10, 4], segments: [8, 4],
    force: -0.006,
    leaves: { leaf: LEAF.pine, count: 7, start: 0.1, size: 6.4, vary: 0.2, angle: 36, drop: 0 },
  },
};

// Niveaux de détail : branches gardées, facettes des tubes, part des rameaux gardés.
export const LODS = [
  { maxLevel: 3, seg: 1, keep: 1, sectionStep: 1, trunkStep: 1, shape: 'fine' },
  { maxLevel: 2, seg: 0.7, keep: 0.55, sectionStep: 2, trunkStep: 1, shape: 'fine' },
  { maxLevel: 1, seg: 0.55, keep: 0.2, sectionStep: 2, trunkStep: 2, shape: 'box', evergreenLevel: 0 },
];

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _q3 = new THREE.Quaternion();
const _e = new THREE.Euler();

/** Palmier : tronc qui se courbe vers le haut, palmes rayonnant du sommet. */
function growPalm(sp, seed) {
  const rng = new RNG(seed);
  const H = sp.trunk * (0.85 + rng.random(0.3));
  const bend = sp.bend * (0.4 + rng.random(0.9));
  const az = rng.random(Math.PI * 2);
  const dir = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
  const N = 22;
  const sections = [];
  const tan = new THREE.Vector3();
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const o = new THREE.Vector3().copy(dir).multiplyScalar(bend * t * t).setY(H * t);
    tan.copy(dir).multiplyScalar(2 * bend * t).setY(H).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, tan);
    sections.push({ origin: o, orientation: new THREE.Euler().setFromQuaternion(q), radius: sp.radius * (1.2 - 0.4 * t) });
  }
  const top = sections[N].origin.clone();
  const leaves = [];
  const F = sp.fronds;
  const a0 = rng.random(Math.PI * 2);
  for (let k = 0; k < F; k++) {
    // Palmes jeunes (redressées) au centre, anciennes (retombantes) autour.
    const young = k % 3 === 0;
    leaves.push({
      frond: true,
      origin: top.clone().add(new THREE.Vector3(0, young ? 0.05 : -0.08, 0)),
      az: a0 + (2 * Math.PI * k) / F + rng.random(0.25, -0.25),
      el: young ? 0.75 + rng.random(0.3) : 0.1 + rng.random(0.4),
      length: sp.frondLength * (young ? 0.8 : 1) * (0.85 + rng.random(0.3)),
      droop: young ? 0.25 : 0.55 + rng.random(0.35),
      width: sp.frondWidth * (0.85 + rng.random(0.3)),
      size: sp.frondLength,
      rank: rng.random(),
    });
  }
  return { sp, branches: [{ level: 0, segments: 10, sections, length: H, rings: true }], leaves, height: top.y + 1, top };
}

/** Squelette : branches (sections successives) et rameaux, à la bonne échelle. */
export function growTree(sp, seed) {
  if (sp.type === 'palm') return growPalm(sp, seed);
  const rng = new RNG(seed);
  const rank = new RNG(seed * 7 + 3);
  const branches = [];
  const leaves = [];
  const levels = sp.levels;
  const qForce = new THREE.Quaternion().setFromUnitVectors(UP, UP);

  const leaf = (origin, orientation) => {
    const L = sp.leaves;
    leaves.push({
      origin: origin.clone(),
      orientation: orientation.clone(),
      size: L.size * (1 + rng.random(L.vary, -L.vary)),
      rank: rank.random(),
    });
  };

  const queue = [{ origin: new THREE.Vector3(), orientation: new THREE.Euler(), length: sp.length[0], radius: sp.radius[0], level: 0, sections: sp.sections[0], segments: sp.segments[0] }];
  while (queue.length) {
    const b = queue.shift();
    const orient = b.orientation.clone();
    const origin = b.origin.clone();
    const secLen = b.length / b.sections;
    const sections = [];
    for (let i = 0; i <= b.sections; i++) {
      let r = b.radius;
      if (i === b.sections && b.level === levels) r = 0.001;
      else if (sp.type === 'deciduous') r *= 1 - sp.taper[b.level] * (i / b.sections);
      else r *= 1 - i / b.sections;
      sections.push({ origin: origin.clone(), orientation: orient.clone(), radius: r });
      origin.add(_v.set(0, secLen, 0).applyEuler(orient));
      const gn = Math.max(1, 1 / Math.sqrt(Math.max(r, 1e-3))) * sp.gnarl[b.level];
      orient.x += rng.random(gn, -gn);
      orient.z += rng.random(gn, -gn);
      const q = new THREE.Quaternion().setFromEuler(orient);
      q.multiply(_q1.setFromAxisAngle(UP, sp.twist[b.level]));
      q.rotateTowards(qForce, sp.force / Math.max(r, 1e-3));
      orient.setFromQuaternion(q);
    }
    branches.push({ level: b.level, segments: b.segments, sections, length: b.length });

    // Feuillus : la branche se prolonge par une branche terminale.
    if (sp.type === 'deciduous') {
      const last = sections[sections.length - 1];
      if (b.level < levels) {
        queue.push({ origin: last.origin, orientation: last.orientation, length: sp.length[b.level + 1], radius: last.radius, level: b.level + 1, sections: b.sections, segments: b.segments });
      } else {
        leaf(last.origin, last.orientation);
      }
    }

    if (b.level === levels) {
      // Rameaux le long des dernières branches.
      const off = rng.random();
      const L = sp.leaves;
      for (let i = 0; i < L.count; i++) {
        const t = rng.random(1, L.start);
        const { o, q } = along(sections, t);
        _q1.setFromAxisAngle(_v.set(1, 0, 0), THREE.MathUtils.degToRad(L.angle));
        _q2.setFromAxisAngle(UP, 2 * Math.PI * (off + i / L.count));
        leaf(o, new THREE.Euler().setFromQuaternion(q.multiply(_q2.multiply(_q1))));
      }
    } else {
      const level = b.level + 1;
      const count = sp.children[b.level];
      const off = rng.random();
      for (let i = 0; i < count; i++) {
        const t = rng.random(1, sp.start[level]);
        const { o, q, r } = along(sections, t);
        _q1.setFromAxisAngle(_v.set(1, 0, 0), THREE.MathUtils.degToRad(sp.angle[level]));
        _q2.setFromAxisAngle(UP, 2 * Math.PI * (off + i / count));
        const orientation = new THREE.Euler().setFromQuaternion(q.multiply(_q2.multiply(_q1)));
        const length = sp.length[level] * (sp.type === 'evergreen' ? 1 - t : 1);
        queue.push({ origin: o, orientation, length, radius: sp.radius[level] * r, level, sections: sp.sections[level], segments: sp.segments[level] });
      }
    }
  }

  // Mise à l'échelle : hauteur voulue (sommet des branches et des rameaux).
  let top = 0;
  for (const b of branches) for (const s of b.sections) top = Math.max(top, s.origin.y);
  for (const l of leaves) top = Math.max(top, l.origin.y + l.size * 0.6);
  const k = sp.height / top;
  for (const b of branches) {
    b.length *= k;
    for (const s of b.sections) {
      s.origin.multiplyScalar(k);
      s.radius *= k;
    }
  }
  for (const l of leaves) {
    l.origin.multiplyScalar(k);
    l.size *= k;
  }
  return { sp, branches, leaves, height: sp.height };
}

/** Point, orientation et rayon à une fraction t d'une branche. */
function along(sections, t) {
  const n = sections.length - 1;
  const i = Math.min(n, Math.floor(t * n));
  const a = sections[i];
  const b = sections[Math.min(n, i + 1)];
  const f = n ? (t - i / n) * n : 0;
  const o = new THREE.Vector3().lerpVectors(a.origin, b.origin, f);
  const q = _q3.setFromEuler(b.orientation).slerp(new THREE.Quaternion().setFromEuler(a.orientation), f).clone();
  return { o, q, r: (1 - f) * a.radius + f * b.radius };
}

/** Couronne : centre et demi-axes de l'ellipsoïde qui englobe les rameaux. */
function crownOf(tree) {
  const box = new THREE.Box3();
  for (const l of tree.leaves) box.expandByPoint(l.origin);
  const c = box.getCenter(new THREE.Vector3());
  const r = box.getSize(new THREE.Vector3()).multiplyScalar(0.5).max(_v.set(0.4, 0.4, 0.4));
  return { c, r };
}

/**
 * Écorce : tubes le long des branches. Attributs : position, normal, uv (u autour,
 * v le long, en mètres / tuile), color (ombrage), aBark (couche d'écorce, neige).
 */
export function barkGeometry(tree, lod = 0, { snow = 0 } = {}) {
  const L = LODS[lod];
  const sp = tree.sp;
  const pos = [];
  const nor = [];
  const uv = [];
  const col = [];
  const idx = [];
  const TILE = 1.6; // mètres d'écorce par répétition de la texture (en hauteur)
  // Au loin, les conifères ne gardent que le tronc (les branches sont sous les aiguilles).
  const maxLevel = sp.type === 'evergreen' && L.evergreenLevel !== undefined ? L.evergreenLevel : L.maxLevel;
  for (const b of tree.branches) {
    if (b.level > maxLevel) continue;
    const segs = Math.max(3, Math.round(b.segments * L.seg));
    const step = b.level === 0 ? L.trunkStep : L.sectionStep;
    const secs = [];
    b.sections.forEach((s, i) => {
      if (i % step === 0 || i === b.sections.length - 1) secs.push(s);
    });
    // Tronc : pied évasé, prolongé sous terre (terrain en pente).
    if (b.level === 0) {
      const s0 = secs[0];
      secs.unshift({ origin: s0.origin.clone().add(_v.set(0, -0.45, 0)), orientation: s0.orientation, radius: s0.radius * 1.45 });
      secs[1] = { ...s0, radius: s0.radius * 1.3 };
    }
    const uRep = Math.max(1, Math.round((2 * Math.PI * secs[Math.min(1, secs.length - 1)].radius) / 1.1));
    const start = pos.length / 3;
    let v = 0;
    const tint = sp.barkTint || [1, 1, 1];
    secs.forEach((s, i) => {
      if (i > 0) v += s.origin.distanceTo(secs[i - 1].origin) / TILE;
      let ao = b.level === 0 ? THREE.MathUtils.clamp(0.72 + s.origin.y * 0.25, 0.72, 1) : 0.92;
      if (b.rings && i % 2) ao *= 0.78; // anneaux du palmier
      for (let j = 0; j <= segs; j++) {
        const a = (2 * Math.PI * (j % segs)) / segs;
        _n.set(Math.cos(a), 0, Math.sin(a)).applyEuler(s.orientation);
        _v.copy(_n).multiplyScalar(s.radius).add(s.origin);
        pos.push(_v.x, _v.y, _v.z);
        nor.push(_n.x, _n.y, _n.z);
        uv.push((j / segs) * uRep, v);
        col.push(ao * tint[0], ao * tint[1], ao * tint[2]);
      }
    });
    const N = segs + 1;
    for (let i = 0; i < secs.length - 1; i++) {
      for (let j = 0; j < segs; j++) {
        const v1 = start + i * N + j;
        const v2 = v1 + 1;
        const v3 = v1 + N;
        const v4 = v2 + N;
        idx.push(v1, v3, v2, v2, v3, v4);
      }
    }
  }
  const n = pos.length / 3;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const bark = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    bark[i * 2] = sp.bark;
    bark[i * 2 + 1] = snow;
  }
  g.setAttribute('aBark', new THREE.BufferAttribute(bark, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/**
 * Feuillage : rameaux en croix. Normales arrondies (couronne éclairée comme un volume),
 * rameaux intérieurs plus sombres. Attributs : aLeaf (couche, rang, chute d'hiver, neige).
 */
export function leafGeometry(tree, lod = 0, { snow = 0, leaf = null } = {}) {
  if (tree.sp.type === 'palm') return frondGeometry(tree, lod, { snow });
  const L = LODS[lod];
  const sp = tree.sp;
  const layer = leaf ?? sp.leaves.leaf;
  const { c, r } = crownOf(tree);
  const pos = [];
  const nor = [];
  const uv = [];
  const col = [];
  const lf = [];
  const idx = [];
  const grow = 1 / Math.sqrt(L.keep); // rameaux plus grands quand il y en a moins
  const shape = (LEAF_SHAPES[layer] || LEAF_SHAPES[LEAF.ash])[L.shape];
  for (const l of tree.leaves) {
    if (l.rank >= L.keep) continue;
    const size = l.size * grow;
    _n.copy(l.origin).sub(c).divide(r);
    const d = _n.length();
    // Cœur de la couronne : caché par les rameaux extérieurs, on n'en garde qu'un peu.
    if (d < 0.42 && l.rank > 0.3 * L.keep) continue;
    const ao = THREE.MathUtils.clamp(0.5 + d * 0.5, 0.5, 1) * (0.9 + 0.1 * THREE.MathUtils.clamp(l.origin.y / tree.height, 0, 1));
    const tint = 0.94 + l.rank * 0.12;
    // Neige tenace (sommets) : sur les rameaux hauts et une partie seulement, en taches.
    const cardSnow = snow * THREE.MathUtils.smoothstep(l.origin.y / tree.height, 0.25, 0.6) * (l.rank < 0.6 ? 1 : 0.25);
    for (const rot of [0, Math.PI / 2]) {
      const base = pos.length / 3;
      for (const [v, ul, ur] of shape) {
        for (const u of [ul, ur]) {
          _v.set((u - 0.5) * size, v * size, 0).applyEuler(_e.set(0, rot, 0)).applyEuler(l.orientation).add(l.origin);
          pos.push(_v.x, _v.y, _v.z);
          // Normale : direction depuis le cœur de la couronne (un peu relevée).
          _n.copy(_v).sub(c).divide(r).normalize();
          _n.y += 0.25;
          _n.normalize();
          nor.push(_n.x, _n.y, _n.z);
          uv.push(u, v);
          col.push(ao * tint, ao, ao * (2 - tint));
          lf.push(layer, l.rank, sp.leaves.drop, cardSnow);
        }
      }
      for (let k = 0; k < shape.length - 1; k++) {
        const a = base + k * 2;
        idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aLeaf', new THREE.Float32BufferAttribute(lf, 4));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/**
 * Palmes : rubans courbés (pliés en V le long de la nervure) qui retombent sous leur
 * poids, texturés par la couche « palme ». Toutes gardées au loin (elles font la
 * silhouette), avec moins de segments.
 */
function frondGeometry(tree, lod, { snow = 0 } = {}) {
  const segs = [8, 5, 3][lod];
  const pos = [];
  const nor = [];
  const uv = [];
  const col = [];
  const lf = [];
  const idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  const d = new THREE.Vector3();
  const side = new THREE.Vector3();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (const f of tree.leaves) {
    d.set(Math.cos(f.az), 0, Math.sin(f.az));
    side.set(-d.z, 0, d.x);
    const w = f.width / 2;
    const base = pos.length / 3;
    for (let j = 0; j <= segs; j++) {
      const s = j / segs;
      const along = f.length * s;
      p.copy(f.origin).addScaledVector(d, Math.cos(f.el) * along).addScaledVector(up, Math.sin(f.el) * along - (f.droop * along * along) / f.length);
      // Largeur : étroite au pied (la texture dessine la forme), bords relevés en V.
      const ww = w * Math.min(1, 0.35 + s * 3);
      const ao = 0.78 + 0.22 * s;
      n.copy(up).multiplyScalar(0.8).addScaledVector(d, 0.45).normalize();
      for (const k of [-1, 0, 1]) {
        const q = p.clone().addScaledVector(side, k * ww).addScaledVector(up, k ? ww * 0.22 : 0);
        pos.push(q.x, q.y, q.z);
        nor.push(n.x, n.y, n.z);
        uv.push((k + 1) / 2, s);
        col.push(ao * 0.96, ao, ao * 0.94);
        lf.push(LEAF.palm, f.rank, 0, snow * s);
      }
    }
    for (let j = 0; j < segs; j++) {
      for (let k = 0; k < 2; k++) {
        const a = base + j * 3 + k;
        idx.push(a, a + 1, a + 4, a, a + 4, a + 3);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aLeaf', new THREE.Float32BufferAttribute(lf, 4));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/**
 * Points sur l'extérieur de la couronne (fruits), bien répartis : origines des rameaux
 * gardés au niveau de détail le plus bas (visibles de près comme de loin).
 */
export function crownSpots(tree, count, { minY = 0.45, out = 0.12 } = {}) {
  // Palmier : sous la couronne, autour du sommet du tronc (noix de coco).
  if (tree.top) return Array.from({ length: count }, (_, i) => tree.top.clone().add(new THREE.Vector3(Math.cos(i * 2.4) * 0.2, -0.3, Math.sin(i * 2.4) * 0.2)));
  const { c, r } = crownOf(tree);
  const cands = [];
  for (const l of tree.leaves) {
    if (l.origin.y < tree.height * minY) continue;
    _n.copy(l.origin).sub(c).divide(r);
    if (_n.length() < 0.7) continue;
    cands.push(l.origin.clone().add(_n.normalize().multiplyScalar(out)));
  }
  const picks = [];
  if (!cands.length) return picks;
  picks.push(cands[0]);
  while (picks.length < count && picks.length < cands.length) {
    let best = null;
    let bestD = -1;
    for (const p of cands) {
      let d = Infinity;
      for (const q of picks) d = Math.min(d, p.distanceToSquared(q));
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
    picks.push(best);
  }
  return picks;
}
