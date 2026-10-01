import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ModelBody } from '../player/avatar.js';
import { Character, CLASSIC_FRAME } from '../player/character.js';
import { getModel, pixelsOf } from '../core/models.js';
import { vertexColorToon } from '../core/materials.js';

// Habitants en personnages KayKit animés (même squelette et mêmes animations que le
// joueur). Chaque habitant reçoit un modèle repeint à ses couleurs (peau, cheveux,
// vêtements, chaussures) et garde ses chapeaux, lunettes et écharpes, fixés sur la tête ou
// le torse. Tout est fusionné en un seul maillage animé par habitant, avec un matériau
// partagé par tous : un seul appel de dessin chacun. Les habitants lointains sont animés
// moins souvent.

/** Modèle KayKit de chaque habitant (coiffure et silhouette les plus proches). */
export const VILLAGER_MODELS = {
  rose: 'Mage', lila: 'Mage', mimi: 'Mage', coralie: 'Mage', maelys: 'Mage',
  pomme: 'Rogue', elise: 'Rogue', sacha: 'Rogue',
  aurele: 'Barbarian', bruno: 'Barbarian', marin: 'Barbarian',
  leo: 'Knight', noe: 'Knight', neree: 'Knight', paco: 'Knight',
  hugo: 'Ranger',
};
const FALLBACK = ['Mage', 'Rogue', 'Knight', 'Ranger', 'Barbarian'];

const HEIGHT = 1.5; // taille à l'échelle 1 (tête comprise, sans chapeau)
const HIDDEN = /hat|helmet|visor|cape|quiver|mask/i; // chapeaux, capes et carquois d'aventurier

// --- Couleurs -------------------------------------------------------------------------
// Chaque case de la palette KayKit (16 colonnes × 8 lignes) a un rôle, selon le modèle et
// la pièce (Head, Body, Arm, Leg) : peau, cheveux, haut, bas… Les cases non listées gardent
// leur couleur (yeux, ceintures, boucles). « 0-1,2 » : colonnes 0 à 1, ligne 2.

const ROLE = { keep: 0, skin: 1, hair: 2, top: 3, top2: 4, sleeve: 5, sleeve2: 6, lower: 7, legs: 8, shoes: 9, bag: 10 };
const COMMON = {
  Head: { skin: ['0-1,0-1'], hair: ['2-3,0-1'] },
  Leg: { shoes: ['6-7,4-5'], legs: ['14-15,2-3'] },
};
const ROLES = {
  Mage: {
    // Sacoche (cases bleu canard 4,4-5) : assortie à la tenue au lieu de rester bleue.
    Body: { top: ['0-1,2'], lower: ['0-1,3'], top2: ['6-7,0-1'], bag: ['4,4-5'] },
    Arm: { skin: ['15,5'], sleeve: ['0-1,2-3'], sleeve2: ['9,0-1'] },
  },
  Knight: {
    // Armure → vêtements ; sous la ceinture, c'est le bas.
    Body: { top: ['6-7,0-1', '14-15,0', '4,2'], lower: ['14,3'], top2: ['0-1,2-3'], split: 0.62 },
    Arm: { sleeve: ['6-7,0-1', '14,0', '8,1'], skin: ['12-13,0-1'] },
    Leg: { shoes: ['6,0-1', '14-15,0', '6-7,4-5'], legs: ['14,2-3'] },
  },
  Barbarian: {
    // Torse nu → pull ; la barbe prend la couleur des cheveux.
    Body: { top: ['0-1,0-1'], top2: ['14-15,1'], lower: ['4,3'] },
    Arm: { skin: ['0-1,0-1'], sleeve: ['12-13,1', '10,3'], sleeve2: ['4,2'] },
    Leg: { shoes: ['6-7,4-5'], legs: ['14-15,3', '5,3', '6-7,2'] },
  },
  Ranger: {
    Body: { top: ['14-15,0-1'], top2: ['0-3,2-3'] },
    Arm: { skin: ['0-1,0-1'], sleeve: ['14-15,1', '15,4', '14-15,5'], sleeve2: ['2,3'] },
  },
  Rogue: {
    Body: { top: ['2-3,2'], lower: ['0-1,3'], top2: ['10-12,0-1', '0-1,2'] },
    Arm: { skin: ['0-1,0-1'], sleeve: ['0-3,2', '0-1,3'], sleeve2: ['10,1', '14-15,5'] },
  },
};

function kindOf(o) {
  for (const n of [o.name, o.parent?.isBone ? '' : o.parent?.name || '']) {
    if (/head/i.test(n)) return 'Head';
    if (/body/i.test(n)) return 'Body';
    if (/leg/i.test(n)) return 'Leg';
    if (/arm(?!ature)/i.test(n)) return 'Arm';
  }
  return 'Other';
}

/** Table case → rôle pour un modèle et une pièce. */
function roleTable(model, kind) {
  const spec = { ...COMMON[kind], ...ROLES[model]?.[kind] };
  const table = new Map();
  for (const [role, cells] of Object.entries(spec)) {
    if (role === 'split') continue;
    for (const cell of cells) {
      const [cs, rs] = cell.split(',');
      const [c0, c1 = c0] = cs.split('-').map(Number);
      const [r0, r1 = r0] = rs.split('-').map(Number);
      for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) table.set(c + r * 16, ROLE[role]);
    }
  }
  table.split = spec.split ?? null;
  return table;
}

/** Couleur de chaque rôle pour une apparence d'habitant. */
const LEATHER = new THREE.Color('#7a5236');

function paletteOf(a) {
  const dress = a.top === 'robe';
  const overalls = a.top === 'salopette';
  const bareLegs = dress || a.bottom === 'jupe';
  const out = [];
  out[ROLE.skin] = a.skin;
  out[ROLE.hair] = a.hairColor;
  out[ROLE.top] = a.topColor;
  out[ROLE.top2] = a.topColor2;
  out[ROLE.sleeve] = overalls ? a.topColor2 : a.topColor;
  out[ROLE.sleeve2] = overalls ? a.topColor : a.topColor2;
  out[ROLE.lower] = dress || overalls ? a.topColor : a.bottomColor;
  out[ROLE.legs] = bareLegs ? a.skin : overalls ? a.topColor : a.bottomColor;
  out[ROLE.shoes] = a.shoesColor;
  // Sacoche : deuxième couleur de la tenue, un peu cuir.
  out[ROLE.bag] = a.topColor2 ? new THREE.Color(a.topColor2).lerp(LEATHER, 0.35) : null;
  return out.map((c) => (c ? new THREE.Color(c) : null));
}

// --- Modèle de base (fusionné, mesuré), commun à tous les habitants d'un même modèle -----

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _w = new THREE.Vector3();
const _t = new THREE.Vector3();
const _b = new THREE.Vector3();
const _i = new THREE.Vector4();
const _k = new THREE.Vector4();
const _m = new THREE.Matrix4();
const _c = new THREE.Color();

function close(a, b) {
  for (let i = 0; i < 16; i++) if (Math.abs(a.elements[i] - b.elements[i]) > 1e-4) return false;
  return true;
}

const bases = new Map();

function modelBase(name) {
  if (bases.has(name)) return bases.get(name);
  let base = null;
  const gltf = getModel(`characters/${name}`);
  if (gltf) {
    try {
      base = buildBase(name, gltf);
    } catch (e) {
      console.warn(`Habitant ${name} : modèle inutilisable`, e);
    }
  }
  bases.set(name, base);
  return base;
}

function buildBase(name, gltf) {
  const scene = cloneSkinned(gltf.scene);
  scene.updateMatrixWorld(true);
  const meshes = [];
  scene.traverse((o) => {
    if (o.isMesh && !HIDDEN.test(o.name)) meshes.push(o);
  });
  const ref = meshes.find((m) => m.isSkinnedMesh && kindOf(m) === 'Body') || meshes.find((m) => m.isSkinnedMesh);
  if (!ref) return null;
  const bind = ref.bindMatrix.clone();
  const bindInv = bind.clone().invert();

  // Os du squelette fusionné : ceux du maillage de référence, puis les autres au besoin.
  const joints = [];
  const joint = (bone, inverse) => {
    let k = joints.findIndex((j) => j.bone === bone && close(j.inverse, inverse));
    if (k < 0) {
      k = joints.length;
      joints.push({ bone, inverse: inverse.clone() });
    }
    return k;
  };
  ref.skeleton.bones.forEach((b, i) => joint(b, ref.skeleton.boneInverses[i]));

  let count = 0;
  for (const m of meshes) count += m.geometry.attributes.position.count;
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const color = new Float32Array(count * 3);
  const skinIndex = new Uint16Array(count * 4);
  const skinWeight = new Float32Array(count * 4);
  const role = new Uint8Array(count);
  const kind = new Uint8Array(count); // 0 tête, 1 corps, 2 bras, 3 jambes, 4 autre
  const cell = new Uint8Array(count);
  const lum = new Float32Array(count);
  const rest = new Float32Array(count * 3); // position au repos (repère du modèle)
  const index = [];
  const KINDS = ['Head', 'Body', 'Arm', 'Leg', 'Other'];

  let off = 0;
  for (const m of meshes) {
    const g = m.geometry;
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const uv = g.attributes.uv;
    const n = pos.count;
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    const tex = mat?.map ? pixelsOf(mat.map) : null;
    const kd = kindOf(m);
    const table = roleTable(name, kd);
    let A;
    let map = null;
    let rigid = 0;
    if (m.isSkinnedMesh) {
      A = bindInv.clone().multiply(m.bindMatrix);
      map = m.skeleton.bones.map((b, i) => joint(b, m.skeleton.boneInverses[i]));
    } else {
      // Pièce rigide accrochée à un os : elle le suit entièrement.
      let b = m.parent;
      while (b && !b.isBone) b = b.parent;
      b ||= ref.skeleton.bones[0];
      rigid = joint(b, b.matrixWorld.clone().invert());
      A = bindInv.clone().multiply(m.matrixWorld);
    }
    const NA = new THREE.Matrix3().getNormalMatrix(A);
    const si = g.attributes.skinIndex;
    const sw = g.attributes.skinWeight;
    for (let i = 0; i < n; i++) {
      const k = off + i;
      _v.fromBufferAttribute(pos, i);
      if (m.isSkinnedMesh) {
        _i.fromBufferAttribute(si, i);
        _k.fromBufferAttribute(sw, i);
        _b.copy(_v).applyMatrix4(m.bindMatrix);
        _w.set(0, 0, 0);
        for (let j = 0; j < 4; j++) {
          const wgt = _k.getComponent(j);
          const bi = _i.getComponent(j);
          skinIndex[k * 4 + j] = wgt ? map[bi] : 0;
          skinWeight[k * 4 + j] = wgt;
          if (!wgt) continue;
          _m.multiplyMatrices(m.skeleton.bones[bi].matrixWorld, m.skeleton.boneInverses[bi]);
          _w.addScaledVector(_t.copy(_b).applyMatrix4(_m), wgt);
        }
      } else {
        _w.copy(_v).applyMatrix4(m.matrixWorld);
        skinIndex[k * 4] = rigid;
        skinWeight[k * 4] = 1;
      }
      _w.toArray(rest, k * 3);
      _v.applyMatrix4(A).toArray(position, k * 3);
      if (nor) _n.fromBufferAttribute(nor, i).applyMatrix3(NA).normalize();
      else _n.set(0, 1, 0);
      _n.toArray(normal, k * 3);

      // Couleur de la palette sous le sommet, et sa case.
      let r = 1;
      let gg = 1;
      let bb = 1;
      let cl = 255;
      if (tex && uv) {
        let u = uv.getX(i) % 1;
        let v = uv.getY(i) % 1;
        if (u < 0) u += 1;
        if (v < 0) v += 1;
        cl = Math.min(15, Math.floor(u * 16)) + Math.min(7, Math.floor(v * 8)) * 16;
        if (tex.flipY) v = 1 - v;
        const x = Math.min(tex.w - 1, Math.floor(u * tex.w));
        const y = Math.min(tex.h - 1, Math.floor(v * tex.h));
        const q = (y * tex.w + x) * 4;
        r = tex.px[q] / 255;
        gg = tex.px[q + 1] / 255;
        bb = tex.px[q + 2] / 255;
      }
      if (mat?.color) {
        // Couleur du matériau (sRGB) × texture.
        mat.color.getRGB(_c, THREE.SRGBColorSpace);
        r *= _c.r;
        gg *= _c.g;
        bb *= _c.b;
      }
      _c.setRGB(r, gg, bb, THREE.SRGBColorSpace);
      color[k * 3] = _c.r;
      color[k * 3 + 1] = _c.g;
      color[k * 3 + 2] = _c.b;
      lum[k] = 0.2126 * r + 0.7152 * gg + 0.0722 * bb;
      cell[k] = cl;
      kind[k] = KINDS.indexOf(kd);
      let ro = table.get(cl) || 0;
      if (ro === ROLE.top && table.split !== null && _w.y < table.split) ro = ROLE.lower;
      role[k] = ro;
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) index.push(g.index.getX(i) + off);
    else for (let i = 0; i < n; i++) index.push(i + off);
    off += n;
  }

  // Nuances : chaque sommet garde sa clarté par rapport à la moyenne de son rôle
  // (plis, ombres peintes, dégradés de la palette), appliquée à la nouvelle couleur.
  const sum = new Float64Array(16);
  const num = new Float64Array(16);
  for (let k = 0; k < count; k++) {
    sum[role[k]] += lum[k];
    num[role[k]]++;
  }
  const shade = new Float32Array(count);
  for (let k = 0; k < count; k++) {
    const mean = sum[role[k]] / Math.max(1, num[role[k]]) || 1;
    shade[k] = Math.pow(THREE.MathUtils.clamp(lum[k] / mean, 0.6, 1.3), 2.2);
  }

  // --- Mesures (repère du modèle, au repos) -------------------------------------------
  const box = new THREE.Box3();
  for (let k = 0; k < count; k++) box.expandByPoint(_v.fromArray(rest, k * 3));
  const P = (k) => _v.fromArray(rest, k * 3);
  // Tête : du menton (bas de la peau du visage) au sommet des cheveux.
  let chin = Infinity;
  let top = -Infinity;
  for (let k = 0; k < count; k++) {
    if (kind[k] !== 0) continue;
    const y = rest[k * 3 + 1];
    top = Math.max(top, y);
    if (role[k] === ROLE.skin) chin = Math.min(chin, y);
  }
  const H = box.max.y - box.min.y;
  if (!Number.isFinite(top)) top = box.max.y;
  if (!Number.isFinite(chin)) chin = box.min.y + H * 0.55;
  const head = new THREE.Box3();
  for (let k = 0; k < count; k++) if (kind[k] === 0 && rest[k * 3 + 1] >= chin) head.expandByPoint(P(k));
  if (head.isEmpty()) head.set(new THREE.Vector3(-H * 0.2, chin, -H * 0.2), new THREE.Vector3(H * 0.2, top, H * 0.2));
  const center = new THREE.Vector3((head.min.x + head.max.x) / 2, (chin + top) / 2, (head.min.z + head.max.z) / 2);
  // Rayon de la tête (cheveux compris) selon la direction : les chapeaux épousent sa forme.
  const radius = radiusMap(count, (k) => kind[k] === 0, P, center);
  // Yeux : cases sombres du visage (colonnes 4-5, lignes 0-1).
  const eyes = [new THREE.Vector3(), new THREE.Vector3()];
  const en = [0, 0];
  for (let k = 0; k < count; k++) {
    const cx = cell[k] % 16;
    const cy = Math.floor(cell[k] / 16);
    if (kind[k] !== 0 || cx < 4 || cx > 5 || cy > 1 || lum[k] > 0.35) continue;
    const s = rest[k * 3] < center.x ? 0 : 1;
    eyes[s].add(P(k));
    en[s]++;
  }
  let eyeInfo = null;
  if (en[0] && en[1]) {
    eyes[0].divideScalar(en[0]);
    eyes[1].divideScalar(en[1]);
    eyeInfo = { mid: eyes[0].clone().add(eyes[1]).multiplyScalar(0.5), gap: Math.abs(eyes[1].x - eyes[0].x), halfW: 0 };
    eyeInfo.mid.z = Math.max(eyes[0].z, eyes[1].z);
    // Demi-largeur de la tête à hauteur des yeux : les branches s'arrêtent aux tempes.
    for (let k = 0; k < count; k++) {
      if (kind[k] === 0 && Math.abs(rest[k * 3 + 1] - eyeInfo.mid.y) < H * 0.03) eyeInfo.halfW = Math.max(eyeInfo.halfW, Math.abs(rest[k * 3] - center.x));
    }
  }
  // Torse : de la hanche au cou, largeur et épaisseur à hauteur de poitrine.
  const bone = (n) => joints.find((j) => j.bone.name === THREE.PropertyBinding.sanitizeNodeName(n))?.bone || scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n));
  const hipsBone = bone('hips');
  const headBone = bone('head');
  const chestBone = bone('chest') || bone('spine') || hipsBone;
  const hipsY = hipsBone ? hipsBone.getWorldPosition(new THREE.Vector3()).y : box.min.y + (box.max.y - box.min.y) * 0.25;
  let bodyTop = -Infinity;
  for (let k = 0; k < count; k++) if (kind[k] === 1) bodyTop = Math.max(bodyTop, rest[k * 3 + 1]);
  const neckY = Math.min(Number.isFinite(bodyTop) ? bodyTop : chin, chin + 0.04);
  const xs = [];
  const zs = [];
  for (let k = 0; k < count; k++) {
    const y = rest[k * 3 + 1];
    if (kind[k] !== 1 || y < hipsY + (neckY - hipsY) * 0.35 || y > hipsY + (neckY - hipsY) * 0.8) continue;
    xs.push(Math.abs(rest[k * 3]));
    zs.push(rest[k * 3 + 2]);
  }
  xs.sort((a, b) => a - b);
  zs.sort((a, b) => a - b);
  const pct = (arr, p) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * p))] : 0.3);
  const front = pct(zs, 0.92);
  const back = pct(zs, 0.08);
  const torso = { hipsY, neckY, halfX: pct(xs, 0.9) || 0.3, cz: (front + back) / 2, halfZ: (front - back) / 2 || 0.25 };

  const headJoint = headBone ? joint(headBone, headBone.matrixWorld.clone().invert()) : 0;
  const chestJoint = chestBone ? joint(chestBone, chestBone.matrixWorld.clone().invert()) : 0;

  return {
    name,
    count,
    position,
    normal,
    color,
    skinIndex,
    skinWeight,
    role,
    shade,
    index,
    bind,
    bindInv,
    jointNames: joints.map((j) => j.bone.name),
    jointInverses: joints.map((j) => j.inverse),
    box,
    height: box.max.y - box.min.y,
    head: { center, radius, chin, top },
    eyes: eyeInfo,
    torso,
    headJoint,
    chestJoint,
  };
}

/** Rayon maximal d'un nuage de points autour d'un centre, par direction (16 × 8 cases). */
function radiusMap(count, keep, P, center) {
  const AZ = 16;
  const EL = 8;
  const grid = new Float32Array(AZ * EL);
  const cellOf = (d) => {
    const r = d.length() || 1;
    const az = Math.atan2(d.x, d.z);
    const el = Math.asin(THREE.MathUtils.clamp(d.y / r, -1, 1));
    const a = ((az + Math.PI) / (Math.PI * 2)) * AZ;
    const e = ((el + Math.PI / 2) / Math.PI) * EL;
    return [a, e, r];
  };
  for (let k = 0; k < count; k++) {
    if (!keep(k)) continue;
    const [a, e, r] = cellOf(_t.copy(P(k)).sub(center));
    const i = (Math.min(AZ - 1, Math.floor(a)) + Math.min(EL - 1, Math.floor(e)) * AZ);
    grid[i] = Math.max(grid[i], r);
  }
  // Cases vides : moyenne des voisines ; puis lissage vers l'extérieur (jamais plus petit).
  const at = (a, e) => grid[((a + AZ) % AZ) + THREE.MathUtils.clamp(e, 0, EL - 1) * AZ];
  for (let pass = 0; pass < 6; pass++) {
    for (let e = 0; e < EL; e++) {
      for (let a = 0; a < AZ; a++) {
        if (grid[a + e * AZ]) continue;
        const nb = [at(a - 1, e), at(a + 1, e), at(a, e - 1), at(a, e + 1)].filter((x) => x > 0);
        if (nb.length) grid[a + e * AZ] = nb.reduce((s, x) => s + x, 0) / nb.length;
      }
    }
  }
  const smooth = new Float32Array(grid);
  for (let e = 0; e < EL; e++) {
    for (let a = 0; a < AZ; a++) {
      const avg = (at(a - 1, e) + at(a + 1, e) + at(a, e - 1) + at(a, e + 1)) / 4;
      smooth[a + e * AZ] = Math.max(grid[a + e * AZ], avg);
    }
  }
  return (dir) => {
    const [a, e] = cellOf(dir);
    const a0 = Math.floor(a - 0.5);
    const e0 = Math.floor(e - 0.5);
    const fa = a - 0.5 - a0;
    const fe = e - 0.5 - e0;
    const g = (x, y) => smooth[((x + AZ) % AZ) + THREE.MathUtils.clamp(y, 0, EL - 1) * AZ];
    return (g(a0, e0) * (1 - fa) + g(a0 + 1, e0) * fa) * (1 - fe) + (g(a0, e0 + 1) * (1 - fa) + g(a0 + 1, e0 + 1) * fa) * fe;
  };
}

// --- Accessoires (chapeaux, lunettes, écharpe, sac) --------------------------------------

const BACKS = new Set(['sac', 'echarpe', 'panier', 'nounours', 'sacChat', 'sacRando', 'filet', 'guitare', 'surf', 'luge']);

/** Accessoires du personnage classique, construits par ses propres fonctions. */
function classicParts(a) {
  const parts = { head: [], glasses: [], torso: [] };
  const sink = (headKey) => ({
    head: headKey,
    torso: 'torso',
    parts: [],
    materials: [],
    addPart(parent, geo) {
      parts[parent].push(geo);
      return null;
    },
  });
  const proto = Character.prototype;
  if (a.hat && a.hat !== 'aucun') proto.buildHat.call(sink('head'), a);
  if (a.glasses && a.glasses !== 'aucune') proto.buildGlasses.call(sink('glasses'), a);
  if (BACKS.has(a.back)) proto.buildBack.call(sink('head'), a, 1);
  return parts;
}

const F = CLASSIC_FRAME;

/** Place les accessoires sur le modèle (repère du modèle au repos). */
function fitParts(parts, base) {
  const out = [];
  const { center, radius } = base.head;
  const d = new THREE.Vector3();
  for (const geo of parts.head) {
    // Chapeaux : même direction depuis le centre de la tête, distance rapportée à la
    // forme de la tête importée (cheveux compris).
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      d.set((pos.getX(i) - F.HC[0]) / (F.R * F.HEAD_SCALE[0]), (pos.getY(i) - F.HC[1]) / (F.R * F.HEAD_SCALE[1]), (pos.getZ(i) - F.HC[2]) / (F.R * F.HEAD_SCALE[2]));
      const r = d.length() || 1e-6;
      d.divideScalar(r);
      // Le classique a des cheveux épais (~6 % du rayon) : les chapeaux sont un peu au-dessus.
      _v.copy(d).multiplyScalar((r / 1.06) * radius(d)).add(center);
      pos.setXYZ(i, _v.x, _v.y, _v.z);
    }
    out.push({ geo, joint: base.headJoint });
  }
  if (base.eyes) {
    const g = base.eyes.gap / (F.eyes[0] * 2);
    // Verres sur les yeux ; branches (au-delà de 0,2 dans le repère classique) ramenées
    // jusqu'aux tempes, quelle que soit la largeur de la tête.
    const lens = 0.2 * g;
    const temple = Math.max(lens, base.eyes.halfW * 0.97);
    const mapX = (x) => {
      const a = Math.abs(x);
      if (a <= 0.2) return x * g;
      return Math.sign(x) * (lens + ((a - 0.2) / (0.345 - 0.2)) * (temple - lens));
    };
    for (const geo of parts.glasses) {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.setXYZ(
          i,
          base.eyes.mid.x + mapX(pos.getX(i)),
          base.eyes.mid.y + (pos.getY(i) - F.eyes[1]) * g,
          base.eyes.mid.z + (pos.getZ(i) - F.eyes[2]) * g + 0.025,
        );
      }
      out.push({ geo, joint: base.headJoint });
    }
  }
  const t = base.torso;
  const sx = t.halfX / F.torsoHalf[0];
  const sz = t.halfZ / F.torsoHalf[1];
  const sy = (t.neckY - t.hipsY) / F.neck;
  for (const geo of parts.torso) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * sx, t.hipsY + pos.getY(i) * sy, t.cz + pos.getZ(i) * sz);
    geo.computeVertexNormals();
    out.push({ geo, joint: base.chestJoint });
  }
  return out;
}

/** Géométrie d'un habitant : modèle repeint + accessoires, en un seul maillage animé. */
function villagerGeometry(base, a) {
  const pal = paletteOf(a);
  const acc = fitParts(classicParts(a), base);
  let extra = 0;
  for (const p of acc) extra += p.geo.attributes.position.count;
  const total = base.count + extra;
  const position = new Float32Array(total * 3);
  const normal = new Float32Array(total * 3);
  const color = new Float32Array(total * 3);
  const skinIndex = new Uint16Array(total * 4);
  const skinWeight = new Float32Array(total * 4);
  position.set(base.position);
  normal.set(base.normal);
  skinIndex.set(base.skinIndex);
  skinWeight.set(base.skinWeight);
  for (let k = 0; k < base.count; k++) {
    const target = pal[base.role[k]];
    if (!target) {
      color[k * 3] = base.color[k * 3];
      color[k * 3 + 1] = base.color[k * 3 + 1];
      color[k * 3 + 2] = base.color[k * 3 + 2];
      continue;
    }
    const s = base.shade[k];
    color[k * 3] = Math.min(1, target.r * s);
    color[k * 3 + 1] = Math.min(1, target.g * s);
    color[k * 3 + 2] = Math.min(1, target.b * s);
  }
  const index = base.index.slice();
  const box = base.box.clone();
  const NB = new THREE.Matrix3().getNormalMatrix(base.bindInv);
  let off = base.count;
  for (const { geo, joint } of acc) {
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    const col = geo.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      const k = off + i;
      _v.fromBufferAttribute(pos, i);
      box.expandByPoint(_v);
      _v.applyMatrix4(base.bindInv).toArray(position, k * 3);
      _n.fromBufferAttribute(nor, i).applyMatrix3(NB).normalize().toArray(normal, k * 3);
      if (col) {
        color[k * 3] = col.getX(i);
        color[k * 3 + 1] = col.getY(i);
        color[k * 3 + 2] = col.getZ(i);
      }
      skinIndex[k * 4] = joint;
      skinWeight[k * 4] = 1;
    }
    if (geo.index) for (let i = 0; i < geo.index.count; i++) index.push(geo.index.getX(i) + off);
    else for (let i = 0; i < pos.count; i++) index.push(i + off);
    off += pos.count;
    geo.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(color, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  geo.setIndex(total > 65535 ? new THREE.Uint32BufferAttribute(index, 1) : new THREE.Uint16BufferAttribute(index, 1));
  return { geo, box };
}

// --- Habitant animé -------------------------------------------------------------------------

class VillagerBody extends ModelBody {
  prepareMeshes() {
    const base = this.opts.base;
    const old = [];
    this.model.traverse((o) => {
      if (o.isMesh) old.push(o);
    });
    for (const o of old) o.removeFromParent();

    const { geo, box } = villagerGeometry(base, this.appearance);
    const bones = base.jointNames.map((n) => this.byName[n]);
    const skeleton = new THREE.Skeleton(bones, base.jointInverses.map((m) => m.clone()));
    const mesh = new THREE.SkinnedMesh(geo, vertexColorToon());
    mesh.name = 'villager';
    this.model.add(mesh);
    mesh.bind(skeleton, base.bind);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Volumes englobants fixes (repère du maillage) : pas de recalcul à chaque image, et
    // l'habitant n'est pas dessiné quand il est hors champ.
    this.model.updateMatrixWorld(true);
    const toLocal = mesh.matrixWorld.clone().invert();
    mesh.boundingBox = box.clone().applyMatrix4(toLocal);
    mesh.boundingSphere = mesh.boundingBox.getBoundingSphere(new THREE.Sphere());
    mesh.boundingSphere.radius *= 1.3; // bras levés, assis…
    mesh.frustumCulled = true;
    this.tick = Math.floor(Math.random() * 12);
    this.every = 1;
    this.pending = 0;
    return [mesh];
  }

  get targetHeight() {
    return HEIGHT;
  }

  measureHeight() {
    return this.opts.base.height;
  }

  /** Échelle : taille et carrure de l'habitant, pieds posés sur le sol. */
  applyScale() {
    const s = this.unit * (this.appearance.height || 1);
    const w = 1 + ((this.appearance.build || 1) - 1) * 0.6;
    this.model.scale.set(s * w, s, s * w);
    this.model.position.y = 0;
    this.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.model);
    this.model.position.y = this.pivot.getWorldPosition(_v).y - box.min.y;
  }

  /** Animation moins fréquente au loin (distance à la caméra, en mètres). */
  setDistance(d) {
    this.every = d < 22 ? 1 : d < 40 ? 2 : d < 60 ? 3 : 4;
  }

  update(dt, s) {
    this.pending += dt;
    this.tick++;
    if (this.every > 1 && this.tick % this.every) return;
    super.update(this.pending, s);
    this.pending = 0;
  }

  play(action, duration) {
    this.every = 1;
    super.play(action, duration);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
    for (const m of this.meshes) m.geometry.dispose();
  }
}

/** Habitant animé (modèle importé), ou null si aucun modèle n'est disponible. */
export function createVillagerBody(id, appearance) {
  const wanted = VILLAGER_MODELS[id];
  for (const name of [wanted, ...FALLBACK]) {
    if (!name) continue;
    const base = modelBase(name);
    if (base) {
      try {
        return new VillagerBody(`characters/${name}`, appearance, { base });
      } catch (e) {
        console.warn(`Habitant ${id} : personnage classique`, e);
        return null;
      }
    }
  }
  return null;
}
