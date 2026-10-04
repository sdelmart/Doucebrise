import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Fusion des modèles articulés (animaux, habitants) : toutes les pièces qui partagent un
// matériau deviennent un seul maillage « skinné » dont les os sont… les pièces d'origine,
// gardées invisibles dans la hiérarchie. Les animations (rotation des pattes, de la tête,
// clignement des yeux…) continuent de manipuler les mêmes objets, à l'identique, mais le
// modèle se dessine en un appel au lieu d'un par pièce (ombre comprise).

const _inv = new THREE.Matrix4();
// Les pièces fusionnées ne servent plus que d'os : leur géométrie est libérée.
const EMPTY = new THREE.BufferGeometry();
const _m = new THREE.Matrix4();
const _n = new THREE.Matrix3();

/** Copie de la géométrie d'une pièce, dans le repère de la racine, rattachée à l'os `bone`. */
function partGeometry(mesh, bone, rootInv, uv, surf) {
  const src = mesh.geometry;
  const geo = new THREE.BufferGeometry();
  const pos = src.attributes.position;
  const count = pos.count;
  _m.multiplyMatrices(rootInv, mesh.matrixWorld);
  _n.getNormalMatrix(_m);
  const p = new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3);
  const n = new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3);
  const c = new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(_m);
    p.setXYZ(i, v.x, v.y, v.z);
    if (src.attributes.normal) {
      v.fromBufferAttribute(src.attributes.normal, i).applyMatrix3(_n).normalize();
      n.setXYZ(i, v.x, v.y, v.z);
    }
    if (src.attributes.color) c.setXYZ(i, src.attributes.color.getX(i), src.attributes.color.getY(i), src.attributes.color.getZ(i));
  }
  geo.setAttribute('position', p);
  geo.setAttribute('normal', n);
  geo.setAttribute('color', c);
  if (uv) geo.setAttribute('uv', src.attributes.uv.clone());
  // Matière de chaque sommet (peau, tissu, cuir…), 0 si la pièce n'en précise pas.
  if (surf) geo.setAttribute('aSurf', src.attributes.aSurf ? src.attributes.aSurf.clone() : new THREE.Float32BufferAttribute(new Float32Array(count), 1));
  const si = new Uint16Array(count * 4);
  const sw = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    si[i * 4] = bone;
    sw[i * 4] = 1;
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  if (src.index) geo.setIndex(src.index.clone());
  else geo.setIndex([...Array(count).keys()]);
  // Pièce retournée par une échelle négative : on inverse l'ordre des sommets.
  if (_m.determinant() < 0) {
    const idx = geo.index.array;
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  }
  return geo;
}

/**
 * Fusionne les pièces de `root` (maillages simples, visibles, hors contours) par matériau
 * et par réglage d'ombre. Le contour d'une pièce (style cartoon) est fusionné de même.
 * Une pièce marquée userData.noMerge (canne à pêche, parapluie…) reste à part ;
 * `only` (facultatif) limite la fusion à un ensemble de maillages.
 * Renvoie les maillages fusionnés (déjà ajoutés à `root`).
 */
export function mergeRig(root, { only = null } = {}) {
  root.updateMatrixWorld(true);
  const rootInv = _inv.copy(root.matrixWorld).invert().clone();
  const parts = [];
  root.traverse((o) => {
    if (o.isMesh && !o.isSkinnedMesh && o.name !== 'outline' && !o.userData.noMerge && !Array.isArray(o.material) && (!only || only.has(o))) parts.push(o);
  });
  // Seules les pièces réellement affichées (elles et tous leurs parents visibles).
  const shown = (o) => {
    for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return false;
    return true;
  };
  const groups = new Map();
  const outlines = new Map();
  for (const part of parts) {
    if (!shown(part)) continue;
    const key = `${part.material.uuid}|${part.castShadow ? 1 : 0}${part.receiveShadow ? 1 : 0}`;
    if (!groups.has(key)) groups.set(key, { material: part.material, cast: part.castShadow, receive: part.receiveShadow, list: [] });
    groups.get(key).list.push(part);
    const om = part.children.find((c) => c.name === 'outline')?.material;
    if (om) {
      if (!outlines.has(om)) outlines.set(om, []);
      outlines.get(om).push(part);
    }
  }
  const merged = [];
  const build = (material, list, cast, receive) => {
    // Coordonnées de texture gardées si le matériau en a besoin (tissu à motif, visage).
    const uv = !!material.map && list.every((p) => p.geometry.attributes.uv);
    const surf = list.some((p) => p.geometry.attributes.aSurf);
    const geos = list.map((part, i) => partGeometry(part, i, rootInv, uv, surf));
    const geo = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!geo) return;
    const mesh = new THREE.SkinnedMesh(geo, material);
    mesh.name = 'rig';
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    root.add(mesh);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(list), mesh.matrixWorld);
    mesh.computeBoundingSphere();
    // Marge pour les mouvements (pattes, queue, tête qui tourne, bras).
    mesh.boundingSphere.radius *= 1.35;
    merged.push(mesh);
  };
  const done = new Set();
  for (const { material, cast, receive, list } of groups.values()) {
    if (list.length < 2) continue;
    build(material, list, cast, receive);
    for (const part of list) {
      part.visible = false;
      done.add(part);
    }
  }
  for (const [material, list] of outlines) {
    const hidden = list.filter((p) => done.has(p));
    // (Le contour d'une pièce restée seule reste affiché avec elle.)
    if (hidden.length) build(material, hidden, false, false);
  }
  for (const part of done) {
    part.geometry.dispose();
    part.geometry = EMPTY;
    for (const c of part.children) if (c.name === 'outline') c.geometry = EMPTY;
  }
  return merged;
}
