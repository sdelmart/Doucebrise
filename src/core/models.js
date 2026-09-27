import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Modèles 3D importés (dossier assets/models/, voir le README) :
//   characters/  personnages KayKit Adventurers (.glb, squelette « Rig_Medium »)
//   animations/  animations KayKit partagées par tous les personnages (.glb)
//   nature/      arbres, fleurs, rochers… (KayKit Forest en .gltf + .bin + texture, Kenney en .glb)
// Tout est trouvé automatiquement : il suffit de déposer les fichiers dans ces dossiers.
// Sans fichiers, le jeu garde ses modèles construits en code.

const FILES = import.meta.glob('/assets/models/**/*.{glb,gltf,bin,png,jpg,jpeg,webp}', { query: '?url', import: 'default', eager: true });

const nfc = (s) => String(s).normalize('NFC');
const baseName = (p) => nfc(decodeURIComponent(String(p).split(/[?#]/)[0].split('/').pop()));
const stem = (p) => baseName(p).replace(/\.[a-z0-9]+$/i, '');

// Fichiers annexes (.bin, textures) retrouvés par leur nom, quel que soit le nom
// définitif donné par la construction du jeu.
const BY_NAME = new Map();
for (const [path, url] of Object.entries(FILES)) BY_NAME.set(baseName(path), url);

/** Modèles disponibles : { id, path, url, dir, name } (id = dossier/nom sans extension). */
export const MODEL_FILES = Object.entries(FILES)
  .filter(([p]) => /\.(glb|gltf)$/i.test(p))
  .map(([path, url]) => {
    const rel = nfc(path.replace(/^\/assets\/models\//, ''));
    const dir = rel.split('/').slice(0, -1).join('/');
    return { id: `${dir}/${stem(rel)}`, path: rel, url, dir, name: stem(rel) };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

export const hasModels = MODEL_FILES.length > 0;

/** Modèles d'un dossier (ex. 'characters', 'nature'). */
export function modelsIn(dir) {
  return MODEL_FILES.filter((m) => m.dir === dir || m.dir.startsWith(`${dir}/`));
}

// Paquet de modèles : certains hébergeurs ne servent pas les fichiers .glb / .gltf / .bin ;
// la version publiée en ligne les regroupe alors dans un seul .json (nom → base64).
let packed = null;

/** Charge un paquet de modèles (URL d'un .json { "fichier.glb": "base64…" }). */
export async function loadModelPack(url) {
  try {
    const pack = await (await fetch(url)).json();
    packed = new Map();
    for (const [name, b64] of Object.entries(pack)) {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      packed.set(name, URL.createObjectURL(new Blob([bytes])));
    }
  } catch (e) {
    console.warn('Paquet de modèles illisible', e?.message || e);
  }
}

const manager = new THREE.LoadingManager();
manager.setURLModifier((url) => {
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  const found = BY_NAME.get(baseName(url)) || url;
  return packed?.get(baseName(found)) || found;
});
const loader = new GLTFLoader(manager);
const cache = new Map(); // id → gltf

export function getModel(id) {
  return cache.get(id) || null;
}

/** Charge une liste de modèles (ids) ; onProgress(0..1). Les erreurs sont ignorées. */
export async function loadModels(ids, onProgress = () => {}) {
  const todo = [...new Set(ids)].filter((id) => !cache.has(id));
  let done = 0;
  await Promise.all(todo.map(async (id) => {
    const file = MODEL_FILES.find((m) => m.id === id);
    if (!file) return;
    try {
      const gltf = await loader.loadAsync(file.url);
      gltf.scene.updateMatrixWorld(true);
      cache.set(id, gltf);
    } catch (e) {
      console.warn(`Modèle illisible : ${file.path}`, e?.message || e);
    }
    onProgress(++done / todo.length);
  }));
}

/** Ombres portées et reçues sur tous les maillages d'un modèle. */
export function enableShadows(root, cast = true, receive = true) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
  return root;
}

// --- Géométrie « cuite » pour la végétation instanciée -------------------------------------
// Chaque modèle est fusionné en une seule géométrie à couleurs par sommet (couleur du
// matériau × texture lue sous chaque sommet). Les arbres importés utilisent ainsi les
// mêmes matériaux que le reste du décor : vent, saisons, neige et un seul appel de dessin.

const pixelCache = new Map();
function pixelsOf(texture) {
  const img = texture?.image;
  if (!img) return null;
  if (pixelCache.has(img)) return pixelCache.get(img);
  const w = img.width;
  const h = img.height;
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = { w, h, px: ctx.getImageData(0, 0, w, h).data, flipY: texture.flipY };
  pixelCache.set(img, data);
  return data;
}

const _c = new THREE.Color();
const _t = new THREE.Color();

function bakeMesh(mesh) {
  const src = mesh.geometry;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', src.attributes.position.clone());
  if (src.attributes.normal) geo.setAttribute('normal', src.attributes.normal.clone());
  if (src.index) geo.setIndex(src.index.clone());
  const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const n = src.attributes.position.count;
  const colors = new Float32Array(n * 3);
  const uv = src.attributes.uv;
  const tex = mat?.map ? pixelsOf(mat.map) : null;
  const vc = src.attributes.color;
  for (let i = 0; i < n; i++) {
    _c.copy(mat?.color || _t.setRGB(1, 1, 1));
    if (tex && uv) {
      let u = uv.getX(i) % 1;
      let v = uv.getY(i) % 1;
      if (u < 0) u += 1;
      if (v < 0) v += 1;
      if (tex.flipY) v = 1 - v;
      const x = Math.min(tex.w - 1, Math.floor(u * tex.w));
      const y = Math.min(tex.h - 1, Math.floor(v * tex.h));
      const k = (y * tex.w + x) * 4;
      _t.setRGB(tex.px[k] / 255, tex.px[k + 1] / 255, tex.px[k + 2] / 255, THREE.SRGBColorSpace);
      _c.multiply(_t);
    }
    if (vc) _c.multiply(_t.setRGB(vc.getX(i), vc.getY(i), vc.getZ(i)));
    colors[i * 3] = _c.r;
    colors[i * 3 + 1] = _c.g;
    colors[i * 3 + 2] = _c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  geo.applyMatrix4(mesh.matrixWorld);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo.index ? geo : geo.toNonIndexed();
}

const bakeCache = new Map();

/**
 * Géométrie à couleurs par sommet d'un modèle, posée au sol (y = 0), le pied centré
 * sur l'origine, mise à la hauteur voulue.
 * @param {string} id
 * @param {{height?:number, recolor?:(c:THREE.Color, y:number, n:THREE.Vector3)=>void}} opts
 */
export function bakedGeometry(id, { height = 1, recolor = null, key = '' } = {}) {
  const ck = `${id}|${height}|${key}`;
  if (bakeCache.has(ck)) return bakeCache.get(ck);
  const gltf = cache.get(id);
  if (!gltf) return null;
  const parts = [];
  gltf.scene.traverse((o) => {
    if (o.isMesh && !o.isSkinnedMesh && o.visible) parts.push(bakeMesh(o));
  });
  if (!parts.length) return null;
  const allIndexed = parts.every((g) => g.index);
  const geo = mergeGeometries(allIndexed ? parts : parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
  parts.forEach((g) => g.dispose());
  // Mise à l'échelle et centrage sur le pied (moyenne des sommets les plus bas).
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const h = bb.max.y - bb.min.y || 1;
  const pos = geo.attributes.position;
  let fx = 0;
  let fz = 0;
  let fn = 0;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < bb.min.y + h * 0.08) {
      fx += pos.getX(i);
      fz += pos.getZ(i);
      fn++;
    }
  }
  const s = height / h;
  geo.translate(-(fn ? fx / fn : (bb.min.x + bb.max.x) / 2), -bb.min.y, -(fn ? fz / fn : (bb.min.z + bb.max.z) / 2));
  geo.scale(s, s, s);
  if (recolor) {
    const col = geo.attributes.color;
    const nor = geo.attributes.normal;
    const nv = new THREE.Vector3();
    for (let i = 0; i < col.count; i++) {
      _c.setRGB(col.getX(i), col.getY(i), col.getZ(i));
      nv.set(nor.getX(i), nor.getY(i), nor.getZ(i));
      recolor(_c, pos.getY(i) / height, nv);
      col.setXYZ(i, _c.r, _c.g, _c.b);
    }
  }
  geo.computeBoundingSphere();
  bakeCache.set(ck, geo);
  return geo;
}

/** Point haut d'un modèle cuit (centre des sommets du sommet), pour y accrocher des fruits. */
export function crownOf(geo, frac = 0.85) {
  geo.computeBoundingBox();
  const top = geo.boundingBox.max.y;
  const pos = geo.attributes.position;
  let x = 0;
  let z = 0;
  let n = 0;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > top * frac) {
      x += pos.getX(i);
      z += pos.getZ(i);
      n++;
    }
  }
  return new THREE.Vector3(n ? x / n : 0, top * frac, n ? z / n : 0);
}
