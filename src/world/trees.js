import * as THREE from 'three';
import barkUrl from '/assets/textures/trees-bark.jpg?url';
import barkNormalUrl from '/assets/textures/trees-bark-normal.jpg?url';
import leavesUrl from '/assets/textures/trees-leaves.jpg?url';
import leavesAlphaUrl from '/assets/textures/trees-leaves-alpha.png?url';
import { addWind, addSeason, globalUniforms } from '../core/materials.js';
import { loadImage, arrayTexture } from './terrainTextures.js';
import { SPECIES, LODS, growTree, barkGeometry, leafGeometry, crownSpots } from './treeGen.js';

// Arbres réalistes (rendu « réaliste ») : générés au lancement (treeGen.js), texturés
// (écorces et rameaux photographiés, assets/textures/trees-*), et dessinés par île en
// deux lots seulement (écorce, feuillage) : chaque arbre y est trié, écarté s'il est hors
// champ, et prend le niveau de détail qui convient à sa distance.

/** Types de plantes du décor dessinés en arbres générés : essence, variantes, neige. */
export const TREE_KINDS = {
  treeRound: { species: 'oak', variants: 3 },
  treeLight: { species: 'birch', variants: 3 },
  treeCherry: { species: 'cherry', variants: 3 },
  treeGolden: { species: 'golden', variants: 2 },
  treeApple: { species: 'apple', variants: 1 },
  treeTropical: { species: 'tropical', variants: 2 },
  pine: { species: 'pine', variants: 3 },
  fir: { species: 'fir', variants: 3 },
  pineSnow: { species: 'pine', variants: 3, snow: 0.6, seed: 5 },
  bush: { species: 'bush', variants: 3 },
  bushBlue: { species: 'blueberry', variants: 2 },
  palm: { species: 'palm', variants: 4 },
  palmCoco: { species: 'palm', variants: 2, seed: 3 },
};

const LEAF_LAYERS = 8; // couches de l'image des rameaux (la palme, dessinée, s'y ajoute)
const BARK_LAYERS = 3;
const LEAF_SIZE = 512; // côté d'une couche de rameau (px)
let textures = null;

function pixelsOf(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

/** Charge les textures des arbres (à appeler avant de construire le monde). */
export async function loadTreeTextures() {
  if (textures) return textures;
  // Les arbres sont dessinés par lots (plusieurs arbres en un appel) : sans cette
  // possibilité (Firefox), chaque arbre coûterait un dessin, et le jeu reprend les
  // arbres des packs de modèles, plus légers.
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ok = !!gl?.getExtension('WEBGL_multi_draw');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    if (!ok) {
      console.info('Arbres réalistes indisponibles ici (WEBGL_multi_draw absent) : arbres simples.');
      return null;
    }
  } catch {
    return null;
  }
  try {
    const [bark, barkN, leaves, alpha] = await Promise.all([barkUrl, barkNormalUrl, leavesUrl, leavesAlphaUrl].map(loadImage));
    // Rameaux : couleur (JPEG) + transparence (PNG en niveaux de gris).
    const px = pixelsOf(leaves);
    const pa = pixelsOf(alpha);
    for (let i = 3; i < px.length; i += 4) px[i] = pa[i - 3];
    const w = leaves.naturalWidth;
    const lh = leaves.naturalHeight / LEAF_LAYERS;
    const all = new Uint8Array(px.length + w * lh * 4);
    all.set(px);
    all.set(frondLayer(w, lh), px.length);
    const tex = new THREE.DataArrayTexture(all, w, lh, LEAF_LAYERS + 1);
    tex.format = THREE.RGBAFormat;
    tex.type = THREE.UnsignedByteType;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    textures = { bark: arrayTexture(bark, BARK_LAYERS, true), barkNormal: arrayTexture(barkN, BARK_LAYERS, false), leaves: tex };
  } catch (err) {
    console.warn('Textures des arbres indisponibles :', err);
    textures = null;
  }
  return textures;
}

export const treeTextures = () => textures;

/**
 * Palme dessinée (couche ajoutée aux rameaux) : nervure centrale et folioles serrées,
 * plus longues au milieu, inclinées vers la pointe. Pied en bas de l'image, pointe en haut.
 */
function frondLayer(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const greens = ['#3d7a2c', '#4a8a33', '#57963a', '#447f30', '#5f9c3f'];
  const N = 44;
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N; // 0 : pied, 1 : pointe
      const y = h * (1 - t);
      const len = w * 0.47 * Math.pow(Math.sin(Math.PI * (0.08 + 0.9 * t)), 0.75) * (0.9 + rnd() * 0.15);
      const ang = (58 + rnd() * 10) * (Math.PI / 180);
      const ex = w / 2 + side * Math.sin(ang) * len;
      const ey = y - Math.cos(ang) * len * 0.55;
      const lw = (h / N) * (0.55 + 0.25 * Math.sin(Math.PI * t));
      ctx.fillStyle = greens[Math.floor(rnd() * greens.length)];
      ctx.beginPath();
      ctx.moveTo(w / 2, y);
      ctx.quadraticCurveTo((w / 2 + ex) / 2, (y + ey) / 2 - lw, ex, ey);
      ctx.quadraticCurveTo((w / 2 + ex) / 2, (y + ey) / 2 + lw, w / 2, y + lw * 0.8);
      ctx.fill();
      // Nervure de la foliole.
      ctx.strokeStyle = 'rgba(160, 190, 90, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2, y + lw * 0.3);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
  }
  // Nervure centrale.
  ctx.strokeStyle = '#8a8a4a';
  ctx.lineWidth = Math.max(3, w / 90);
  ctx.beginPath();
  ctx.moveTo(w / 2, h);
  ctx.lineTo(w / 2, 0);
  ctx.stroke();
  const d = ctx.getImageData(0, 0, w, h).data;
  // Pixels transparents : couleur moyenne de la palme (pas de liseré sombre au loin).
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) {
      d[i] = 74;
      d[i + 1] = 130;
      d[i + 2] = 50;
    }
  }
  return d;
}

// --- Matériaux -----------------------------------------------------------------

// Textures d'une case : elles activent les coordonnées de texture et le relief dans
// les shaders de three.js ; les vraies textures (tableaux) les remplacent.
function tiny(r, g, b) {
  const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
}
const WHITE = tiny(255, 255, 255);
const FLAT = tiny(128, 128, 255);

const WIND = { strength: 0.006, base: 1.5 };

// Rameaux : transparence (plus pleine au loin : les petits niveaux de la texture
// l'éclaircissent), chute des feuilles en hiver (rang du rameau < part tombée).
/** Point suivi par la caméra (tête du personnage) : les arbres entre les deux s'effacent. */
export const treeFocus = { value: new THREE.Vector3(0, -1000, 0) };

// La vue n'est jamais bouchée : ce qui est tout près de la caméra, ou entre elle et le
// personnage, s'efface (0 : gardé, 1 : effacé).
const TREE_FADE = `uniform vec3 uTreeFocus;
float treeFade(vec3 p) {
  vec3 toF = p - cameraPosition;
  vec3 toP = uTreeFocus - cameraPosition;
  float lp = max(length(toP), 0.001);
  vec3 dir = toP / lp;
  float along = dot(toF, dir);
  float side = length(toF - dir * along);
  float inWay = step(0.0, along) * (1.0 - smoothstep(lp - 1.2, lp - 0.4, along)) * (1.0 - smoothstep(1.1, 2.2, side));
  return 1.0 - smoothstep(0.9, 2.4, length(toF)) * (1.0 - inWay);
}`;

const LEAF_FRAG_PARS = `uniform highp sampler2DArray tLeaves;
uniform float uBare;
varying vec4 vLeaf;`;
const LEAF_FRAG = `{
    vec2 luv = vec2(vMapUv.x, 1.0 - vMapUv.y);
    vec4 lt = texture(tLeaves, vec3(luv, vLeaf.x));
    #ifndef TREE_LEAF_DEPTH
    vec2 lpx = luv * ${LEAF_SIZE.toFixed(1)};
    vec2 ldx = dFdx(lpx);
    vec2 ldy = dFdy(lpx);
    float lmip = max(0.0, 0.5 * log2(max(dot(ldx, ldx), dot(ldy, ldy))));
    lt.a = min(1.0, lt.a * (1.0 + lmip * 0.3));
    #endif
    if (vLeaf.y < vLeaf.z * uBare) lt.a = 0.0;
    #ifdef TREE_NEAR_FADE
    lt.a *= 1.0 - treeFade(vSeasonPos);
    #endif
    diffuseColor *= lt;
  }`;
const LEAF_VERT_PARS = `attribute vec4 aLeaf;
varying vec4 vLeaf;`;
// Frémissement des rameaux (le vent général est ajouté par addWind).
const LEAF_VERT = `#ifndef TREE_LEAF_DEPTH
  vec3 objectNormal = vec3(normal);
  #endif
  #include <begin_vertex>
  vLeaf = aLeaf;
  transformed += normal * sin(uTime * 4.7 + aLeaf.y * 37.0 + position.x * 1.7 + position.z * 1.3) * 0.035 * uv.y;`;

// Éclairage des rameaux, calculé par sommet et non par pixel : les rameaux se
// superposent beaucoup, et leurs normales arrondies (couronne) varient doucement, si bien
// que le résultat est le même pour une fraction du coût. Soleil (avec ses ombres), ciel
// dessus et dessous, et un peu de lumière qui traverse les feuilles à contre-jour.
export const leafLight = {
  uLeafSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uLeafSun: { value: new THREE.Color() },
  uLeafSkyUp: { value: new THREE.Color() },
  uLeafSkyDown: { value: new THREE.Color() },
  uLeafSheen: { value: new THREE.Color() },
  uLeafShadowMap: { value: null },
  uLeafShadowMatrix: { value: new THREE.Matrix4() },
  uLeafShadow: { value: 0 },
};
const LEAF_LIGHT_PARS = `uniform vec3 uLeafSunDir;
uniform vec3 uLeafSun;
uniform vec3 uLeafSkyUp;
uniform vec3 uLeafSkyDown;
uniform vec3 uLeafSheen;
uniform highp sampler2DShadow uLeafShadowMap;
uniform mat4 uLeafShadowMatrix;
uniform float uLeafShadow;
varying vec3 vLeafLight;
varying vec3 vLeafSheen;`;
const LEAF_LIGHT_VERT = `{
    vec3 N = normalize(vSeasonNormal);
    float lit = clamp((dot(N, uLeafSunDir) + 0.3) / 1.3, 0.0, 1.0);
    float sh = 1.0;
    if (uLeafShadow > 0.5) {
      vec4 sc = uLeafShadowMatrix * vec4(vSeasonPos + N * 0.1, 1.0);
      sc.xyz /= sc.w;
      if (sc.x > 0.0 && sc.x < 1.0 && sc.y > 0.0 && sc.y < 1.0 && sc.z < 1.0) sh = texture(uLeafShadowMap, vec3(sc.xy, sc.z - 0.002));
    }
    float back = pow(max(dot(normalize(vSeasonPos - cameraPosition), uLeafSunDir), 0.0), 4.0) * 0.35;
    vLeafLight = mix(uLeafSkyDown, uLeafSkyUp, N.y * 0.5 + 0.5) + uLeafSun * sh * (lit + back);
    // Reflet du ciel sur les feuilles (léger, bleuté).
    vLeafSheen = uLeafSheen * (0.6 + 0.4 * N.y);
  }
  #include <fog_vertex>`;

let NO_SHADOW = null;
function noShadow() {
  if (!NO_SHADOW) {
    NO_SHADOW = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
    NO_SHADOW.format = THREE.DepthFormat;
    NO_SHADOW.compareFunction = THREE.LessEqualCompare;
    NO_SHADOW.minFilter = THREE.LinearFilter;
    NO_SHADOW.magFilter = THREE.LinearFilter;
    NO_SHADOW.needsUpdate = true;
  }
  return NO_SHADOW;
}

const _up3 = new THREE.Color();
const _dn3 = new THREE.Color();
const _t3 = new THREE.Color();

// Réglages ajustés pour que le feuillage ait la même lumière qu'avec l'éclairage complet
// (mesuré à plusieurs heures du jour) : ciel diffus, soleil, reflet du ciel.
const LEAF_SKY = 0.54;
const LEAF_SUN = 0.88;
const LEAF_SHEEN = 0.05;

/** Met à jour l'éclairage du feuillage d'après le soleil, le ciel et l'environnement. */
export function updateLeafLighting(sky, scene) {
  const u = leafLight;
  const sun = sky.sun;
  u.uLeafSunDir.value.subVectors(sun.position, sun.target.position).normalize();
  u.uLeafSun.value.copy(sun.color).multiplyScalar((sun.intensity / Math.PI) * LEAF_SUN);
  const hemi = sky.hemi;
  const amb = sky.ambient;
  const kh = hemi.intensity / Math.PI;
  _t3.copy(amb.color).multiplyScalar(amb.intensity / Math.PI);
  _up3.copy(hemi.color).multiplyScalar(kh).add(_t3);
  _dn3.copy(hemi.groundColor).multiplyScalar(kh).add(_t3);
  // Lumière du ciel (environnement) : haut du ciel au-dessus, sol et horizon en dessous.
  u.uLeafSheen.value.setRGB(0, 0, 0);
  if (scene.environment && sky.skyTop) {
    const e = scene.environmentIntensity;
    _t3.copy(sky.skyHorizon).lerp(sky.skyTop, 0.6).multiplyScalar(e);
    _up3.add(_t3);
    u.uLeafSheen.value.copy(_t3).multiplyScalar(LEAF_SHEEN);
    _t3.copy(sky.envGround ? sky.envGround.material.color : sky.hemi.groundColor).lerp(sky.skyHorizon, 0.3).multiplyScalar(e);
    _dn3.add(_t3);
  }
  u.uLeafSkyUp.value.copy(_up3).multiplyScalar(LEAF_SKY);
  u.uLeafSkyDown.value.copy(_dn3).multiplyScalar(LEAF_SKY);
  const map = sun.castShadow && sun.shadow.map ? sun.shadow.map.depthTexture : null;
  // Sans ombres, une petite texture de profondeur tient la place (jamais lue).
  u.uLeafShadowMap.value = map || noShadow();
  u.uLeafShadow.value = map ? 1 : 0;
  u.uLeafShadowMatrix.value = sun.shadow.matrix;
}

function leafInject(material, depth) {
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    prev.call(material, shader, renderer);
    shader.uniforms.tLeaves = { value: textures.leaves };
    shader.uniforms.uBare = globalUniforms.uBare;
    shader.uniforms.uTreeFocus = treeFocus;
    shader.vertexShader = `${depth ? '#define TREE_LEAF_DEPTH\n' : ''}${LEAF_VERT_PARS}\n${shader.vertexShader}`.replace('#include <begin_vertex>', LEAF_VERT);
    let fs = `${depth ? '#define TREE_LEAF_DEPTH\n' : `#define TREE_NEAR_FADE\n${TREE_FADE}\n`}${LEAF_FRAG_PARS}\n${shader.fragmentShader}`.replace('#include <map_fragment>', LEAF_FRAG);
    if (!depth) {
      Object.assign(shader.uniforms, leafLight);
      shader.vertexShader = `${LEAF_LIGHT_PARS}\n${shader.vertexShader}`.replace('#include <fog_vertex>', LEAF_LIGHT_VERT);
      fs = `${LEAF_LIGHT_PARS}\n${fs}`.replace('vec3 outgoingLight = reflectedLight.indirectDiffuse;', 'vec3 outgoingLight = reflectedLight.indirectDiffuse * vLeafLight + vLeafSheen;');
    }
    shader.fragmentShader = fs;
  };
  material.customProgramCacheKey = () => `${prevKey}|tree-leaf-${depth ? 'd' : 'c'}`;
  return material;
}

function barkInject(material, depth) {
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    prev.call(material, shader, renderer);
    if (depth) return;
    shader.uniforms.tBark = { value: textures.bark };
    shader.uniforms.tBarkN = { value: textures.barkNormal };
    shader.vertexShader = `attribute vec2 aBark;\nvarying vec2 vBark;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBark = aBark;');
    shader.uniforms.uTreeFocus = treeFocus;
    shader.fragmentShader = `uniform highp sampler2DArray tBark;\nuniform highp sampler2DArray tBarkN;\nvarying vec2 vBark;\n${TREE_FADE}\n${shader.fragmentShader}`
      .replace('#include <map_fragment>', `diffuseColor *= texture(tBark, vec3(vMapUv, vBark.x));
      // Tronc et branches qui boucheraient la vue : effacés en pointillé fin.
      if (treeFade(vSeasonPos) > fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))))) discard;`)
      .replace('texture2D( normalMap, vNormalMapUv )', 'texture(tBarkN, vec3(vNormalMapUv, vBark.x))');
  };
  material.customProgramCacheKey = () => `${prevKey}|tree-bark-${depth ? 'd' : 'c'}`;
  return material;
}

let materials = null;

/** Matériaux partagés par tous les arbres générés (écorce, feuillage, et leurs ombres). */
export function treeMaterials() {
  if (materials) return materials;
  const bark = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0, map: WHITE, normalMap: FLAT });
  bark.normalScale.set(1.2, 1.2);
  addWind(bark, { ...WIND, key: 'tree-bark' });
  addSeason(bark, { snowLo: 0.35, snowHi: 0.8, snow: 0.9, key: 'tree-bark', snowExpr: 'vBark.y' });
  barkInject(bark, false);

  const leaves = new THREE.MeshBasicMaterial({ vertexColors: true, map: WHITE, side: THREE.DoubleSide, alphaTest: 0.5 });
  addWind(leaves, { ...WIND, key: 'tree-leaf' });
  addSeason(leaves, { leaf: 1, snowLo: 0.5, snowHi: 0.95, snow: 0.8, key: 'tree-leaf', autumnExpr: 'step(0.01, vLeaf.z)', snowExpr: 'vLeaf.w' });
  leafInject(leaves, false);

  // Ombres : même vent, mêmes découpes des rameaux.
  const barkDepth = barkInject(addWind(new THREE.MeshDepthMaterial(), { ...WIND, key: 'tree-bark-depth' }), true);
  const leafDepth = leafInject(addWind(new THREE.MeshDepthMaterial({ map: WHITE, alphaTest: 0.5, side: THREE.DoubleSide }), { ...WIND, key: 'tree-leaf-depth' }), true);
  materials = { bark, leaves, barkDepth, leafDepth };
  return materials;
}

// --- Géométries (partagées entre les îles) --------------------------------------

const treeCache = new Map();
function treeOf(species, seed) {
  const k = `${species}|${seed}`;
  if (!treeCache.has(k)) treeCache.set(k, growTree(SPECIES[species], seed));
  return treeCache.get(k);
}

const geoCache = new Map();
function geometriesOf(species, seed, lod, snow) {
  const k = `${species}|${seed}|${lod}|${snow}`;
  if (!geoCache.has(k)) {
    const t = treeOf(species, seed);
    geoCache.set(k, { bark: barkGeometry(t, lod, { snow }), leaf: leafGeometry(t, lod, { snow }) });
  }
  return geoCache.get(k);
}

/** Libère les géométries de travail (une fois toutes les îles construites). */
export function clearTreeCache() {
  for (const g of geoCache.values()) {
    g.bark.dispose();
    g.leaf.dispose();
  }
  geoCache.clear();
  treeCache.clear();
}

// --- Forêts ---------------------------------------------------------------------

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _c = new THREE.Color();

/** Distances (m) de passage aux niveaux de détail 1 et 2, et marge anti-clignotement. */
const LOD_DIST = [26, 64];
const LOD_MARGIN = 2.5;

/**
 * Un type d'arbre dans une forêt. Mêmes usages qu'un maillage instancié de la
 * végétation (pushInstance, count, capacité) ; un arbre prend l'une des variantes selon
 * sa position (le tirage aléatoire du monde reste identique).
 */
class TreeKind {
  constructor(forest, name, def, cap) {
    this.isVariants = true;
    this.isTreeKind = true;
    this.forest = forest;
    this.name = name;
    this.species = def.species;
    this.snow = def.snow || 0;
    const base = (def.seed || 1) * 1009;
    this.seeds = Array.from({ length: def.variants || 1 }, (_, i) => base + i * 7919 + 17);
    this.cap = cap;
    this.n = 0;
    this.userData = { model: name };
  }

  get count() {
    return this.n;
  }

  get instanceMatrix() {
    return { count: this.cap };
  }

  push(x, y, z, rotY, scale, color) {
    this.n++;
    return this.forest.pushTree(this, this.variantAt(x, z), x, y, z, rotY, scale, color);
  }

  /** Variante prise par un arbre placé en (x, z) (même tirage que push). */
  variantAt(x, z) {
    const h = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453);
    return Math.floor(h) % this.seeds.length;
  }

  /** Sommet du tronc d'une variante (palmiers : noix de coco). */
  top(variant = 0) {
    return treeOf(this.species, this.seeds[variant]).top || new THREE.Vector3(0, 3, 0);
  }

  /** Points pour des fruits sur la couronne d'une variante. */
  spots(count, opts, variant = 0) {
    return crownSpots(treeOf(this.species, this.seeds[variant]), count, opts);
  }

  finish() {}
}

/**
 * Ombres portées : chaque arbre y est dessiné dans sa version la plus légère (même
 * silhouette, bien moins de rameaux), puis reprend son niveau de détail pour l'image.
 */
const SHADOW_LOD = LODS.length - 1;
function shadowLod(mesh, trees, idKey, part) {
  let swapped = false;
  mesh.onBeforeShadow = function (renderer, object, camera, shadowCamera, geometry, depthMaterial) {
    for (const t of trees) if (t.lod !== SHADOW_LOD) this.setGeometryIdAt(t[idKey], t.ids[SHADOW_LOD][part]);
    swapped = true;
    // (BatchedMesh.onBeforeShadow passerait par onBeforeRender, remplacé ci-dessous.)
    THREE.BatchedMesh.prototype.onBeforeRender.call(this, renderer, null, shadowCamera, geometry, depthMaterial);
  };
  mesh.onBeforeRender = function (...args) {
    if (swapped) {
      for (const t of trees) if (t.lod !== SHADOW_LOD) this.setGeometryIdAt(t[idKey], t.ids[t.lod][part]);
      swapped = false;
    }
    THREE.BatchedMesh.prototype.onBeforeRender.apply(this, args);
  };
}

export class TreeForest extends THREE.Group {
  constructor(name) {
    super();
    this.name = `arbres-${name}`;
    this.kinds = [];
    this.trees = [];
    this.lodScale = 1;
    this.lastCam = new THREE.Vector3(1e9, 0, 0);
  }

  kind(name, cap) {
    const k = new TreeKind(this, name, TREE_KINDS[name], cap);
    this.kinds.push(k);
    return k;
  }

  pushTree(kind, variant, x, y, z, rotY, scale, color) {
    this.trees.push({ kind, variant, x, y, z, rotY, scale, tint: color ? color.r : 1, lod: -1, bid: -1, lid: -1 });
    return this.trees.length - 1;
  }

  /** Construit les deux lots (écorce, feuillage) une fois tous les arbres placés. */
  build() {
    if (!this.trees.length) return;
    const mats = treeMaterials();
    // Géométries utilisées : type × variante × niveau de détail.
    const used = new Map();
    for (const t of this.trees) {
      const key = `${t.kind.name}|${t.variant}`;
      if (!used.has(key)) {
        const seed = t.kind.seeds[t.variant];
        used.set(key, LODS.map((_, lod) => geometriesOf(t.kind.species, seed, lod, t.kind.snow)));
      }
      t.geos = used.get(key);
    }
    let vb = 0;
    let ib = 0;
    let vl = 0;
    let il = 0;
    for (const lods of used.values()) {
      for (const g of lods) {
        vb += g.bark.attributes.position.count;
        ib += g.bark.index.count;
        vl += g.leaf.attributes.position.count;
        il += g.leaf.index.count;
      }
    }
    const n = this.trees.length;
    this.bark = new THREE.BatchedMesh(n, vb, ib, mats.bark);
    this.leaves = new THREE.BatchedMesh(n, vl, il, mats.leaves);
    this.bark.name = 'écorce';
    this.leaves.name = 'feuillage';
    const ids = new Map();
    for (const lods of used.values()) {
      for (const g of lods) ids.set(g, { bark: this.bark.addGeometry(g.bark), leaf: this.leaves.addGeometry(g.leaf) });
    }
    for (const t of this.trees) {
      t.ids = t.geos.map((g) => ids.get(g));
      t.lod = LODS.length - 1;
      const id = t.ids[t.lod];
      t.bid = this.bark.addInstance(id.bark);
      t.lid = this.leaves.addInstance(id.leaf);
      _q.setFromAxisAngle(_up, t.rotY);
      _m.compose(_p.set(t.x, t.y, t.z), _q, _s.setScalar(t.scale));
      this.bark.setMatrixAt(t.bid, _m);
      this.leaves.setMatrixAt(t.lid, _m);
      _c.setScalar(t.tint);
      this.bark.setColorAt(t.bid, _c);
      this.leaves.setColorAt(t.lid, _c);
      delete t.geos;
    }
    for (const m of [this.bark, this.leaves]) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.computeBoundingBox();
      m.computeBoundingSphere();
      this.add(m);
    }
    this.bark.customDepthMaterial = mats.barkDepth;
    this.leaves.customDepthMaterial = mats.leafDepth;
    shadowLod(this.bark, this.trees, 'bid', 'bark');
    shadowLod(this.leaves, this.trees, 'lid', 'leaf');
  }

  /** Niveau de détail de chaque arbre selon sa distance à la caméra. */
  update(cam) {
    if (!this.bark || !this.visible) return;
    if (this.lastCam.distanceToSquared(cam) < 0.25) return;
    this.lastCam.copy(cam);
    const t0 = LOD_DIST[0] * this.lodScale;
    const t1 = LOD_DIST[1] * this.lodScale;
    for (const t of this.trees) {
      const d = Math.hypot(t.x - cam.x, t.z - cam.z, (t.y - cam.y) * 0.5);
      let l = t.lod;
      if (l === 0) {
        if (d > t0 + LOD_MARGIN) l = d > t1 + LOD_MARGIN ? 2 : 1;
      } else if (l === 1) {
        if (d < t0 - LOD_MARGIN) l = 0;
        else if (d > t1 + LOD_MARGIN) l = 2;
      } else if (d < t1 - LOD_MARGIN) {
        l = d < t0 - LOD_MARGIN ? 0 : 1;
      }
      if (l !== t.lod) {
        t.lod = l;
        this.bark.setGeometryIdAt(t.bid, t.ids[l].bark);
        this.leaves.setGeometryIdAt(t.lid, t.ids[l].leaf);
      }
    }
  }

  /** Nombre d'arbres et répartition par niveau de détail (tests, compteur de détail). */
  stats() {
    const out = { trees: this.trees.length, lod: [0, 0, 0] };
    for (const t of this.trees) out.lod[t.lod]++;
    return out;
  }
}
