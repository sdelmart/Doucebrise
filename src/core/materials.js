import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------------
// Rendu « toon » doux : quelques paliers de lumière pour un look cartoon pastel.
// ---------------------------------------------------------------------------

let gradientMap = null;
export function getGradientMap() {
  if (gradientMap) return gradientMap;
  const steps = [120, 175, 215, 240, 255];
  const data = new Uint8Array(steps);
  gradientMap = new THREE.DataTexture(data, steps.length, 1, THREE.RedFormat);
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.generateMipmaps = false;
  gradientMap.needsUpdate = true;
  return gradientMap;
}

export function toon(color = '#ffffff', opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: getGradientMap(), ...opts });
}

/** Matériau partagé à couleurs par sommet (animaux, personnages, décor fusionné). */
let vcMaterial = null;
export function vertexColorToon() {
  if (!vcMaterial) vcMaterial = toon('#ffffff', { vertexColors: true });
  return vcMaterial;
}

// ---------------------------------------------------------------------------
// Vent : fait onduler la végétation via un petit ajout au vertex shader.
// ---------------------------------------------------------------------------

export const globalUniforms = {
  uTime: { value: 0 },
  uSnow: { value: 0 },
  uAutumn: { value: 0 },
  uWet: { value: 0 },
};

// ---------------------------------------------------------------------------
// Saisons : feuillage d'automne, neige sur les surfaces tournées vers le ciel,
// sol assombri par la pluie. S'ajoute à un éventuel onBeforeCompile existant.
// ---------------------------------------------------------------------------

export function addSeason(material, { leaf = 0, ground = false, snowLo = 0.45, snowHi = 0.8, snow = 1, key = 'season' } = {}) {
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey ? material.customProgramCacheKey() : '';
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev.call(material, shader, renderer);
    shader.uniforms.uSnow = globalUniforms.uSnow;
    shader.uniforms.uAutumn = globalUniforms.uAutumn;
    shader.uniforms.uWet = globalUniforms.uWet;
    shader.vertexShader = `varying vec3 vSeasonPos;\nvarying vec3 vSeasonNormal;\n${shader.vertexShader}`.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      {
        vec4 sp = vec4(transformed, 1.0);
        vec3 sn = objectNormal;
        #ifdef USE_INSTANCING
          sp = instanceMatrix * sp;
          sn = mat3(instanceMatrix) * sn;
        #endif
        vSeasonPos = (modelMatrix * sp).xyz;
        vSeasonNormal = normalize(mat3(modelMatrix) * sn);
      }`,
    );
    shader.fragmentShader = `uniform float uSnow;\nuniform float uAutumn;\nuniform float uWet;\nvarying vec3 vSeasonPos;\nvarying vec3 vSeasonNormal;\n${shader.fragmentShader}`.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      {
        float green = clamp((diffuseColor.g - max(diffuseColor.r, diffuseColor.b)) * 6.0, 0.0, 1.0);
        ${leaf > 0 ? `
        float hh = fract(sin(dot(floor(vSeasonPos.xz * 0.3), vec2(12.9898, 78.233))) * 43758.5453);
        vec3 autumn = mix(vec3(0.92, 0.28, 0.04), vec3(0.72, 0.08, 0.05), step(0.55, hh));
        autumn = mix(autumn, vec3(0.93, 0.62, 0.08), step(0.8, hh));
        diffuseColor.rgb = mix(diffuseColor.rgb, autumn * (0.55 + diffuseColor.g * 0.9), green * uAutumn * ${leaf.toFixed(2)});` : ''}
        ${ground ? `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.45, 0.12) * (0.5 + diffuseColor.g), green * uAutumn * 0.55);` : ''}
        float up = smoothstep(${snowLo.toFixed(2)}, ${snowHi.toFixed(2)}, vSeasonNormal.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.94, 1.0), up * uSnow * ${snow.toFixed(2)});
        diffuseColor.rgb *= 1.0 - uWet * 0.16 * (1.0 - up * uSnow);
      }`,
    );
  };
  material.customProgramCacheKey = () => `${prevKey}|${key}-${leaf}-${ground}-${snowLo}-${snowHi}-${snow}`;
  return material;
}

export function addWind(material, { strength = 0.04, base = 0, key = 'wind' } = {}) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = globalUniforms.uTime;
    shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      {
        float hh = max(position.y - ${base.toFixed(3)}, 0.0);
        vec3 wp = vec3(0.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix[3].xyz;
        #endif
        float ph = wp.x * 0.21 + wp.z * 0.17;
        float sw = sin(uTime * 1.7 + ph) * 0.6 + sin(uTime * 3.1 + ph * 1.9) * 0.25;
        transformed.x += sw * hh * hh * ${strength.toFixed(4)};
        transformed.z += cos(uTime * 1.3 + ph) * 0.35 * hh * hh * ${strength.toFixed(4)};
      }`,
    );
  };
  material.customProgramCacheKey = () => `${key}-${strength}-${base}`;
  return material;
}

// ---------------------------------------------------------------------------
// Contours : coque inversée poussée le long des normales (personnages, animaux).
// ---------------------------------------------------------------------------

const outlineMaterials = new Map();
export function outlineMaterial(thickness = 0.018, color = '#3b2a2a') {
  const key = `${thickness}-${color}`;
  if (outlineMaterials.has(key)) return outlineMaterials.get(key);
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      transformed += normalize(normal) * ${thickness.toFixed(4)};`,
    );
  };
  mat.customProgramCacheKey = () => `outline-${key}`;
  outlineMaterials.set(key, mat);
  return mat;
}

/** Ajoute une coque de contour à un mesh (enfant qui suit ses animations). */
export function withOutline(mesh, thickness = 0.018) {
  const o = new THREE.Mesh(mesh.geometry, outlineMaterial(thickness));
  o.name = 'outline';
  o.raycast = () => {};
  mesh.add(o);
  return mesh;
}

// ---------------------------------------------------------------------------
// Constructeur de formes : fusionne des primitives colorées en une géométrie.
// ---------------------------------------------------------------------------

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _c = new THREE.Color();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _z = new THREE.Vector3(0, 0, 1);

export function paint(geo, color) {
  _c.set(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = _c.r;
    arr[i * 3 + 1] = _c.g;
    arr[i * 3 + 2] = _c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function normalizeGeo(geo) {
  if (!geo.index) {
    const n = geo.attributes.position.count;
    const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  if (!geo.attributes.uv) {
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  }
  for (const name of Object.keys(geo.attributes)) {
    if (!['position', 'normal', 'uv', 'color'].includes(name)) geo.deleteAttribute(name);
  }
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo;
}

export class Shape {
  constructor() {
    this.parts = [];
  }

  /**
   * @param {THREE.BufferGeometry} geo  géométrie (sera consommée)
   * @param {string|number} color
   * @param {{pos?:number[], rot?:number[], scale?:number[]|number, dir?:number[]}} t
   *   `dir` oriente l'axe +Z local de la pièce vers une direction donnée.
   */
  add(geo, color, t = {}) {
    const pos = t.pos || [0, 0, 0];
    const sc = t.scale === undefined ? [1, 1, 1] : typeof t.scale === 'number' ? [t.scale, t.scale, t.scale] : t.scale;
    if (t.dir) {
      _v.set(t.dir[0], t.dir[1], t.dir[2]).normalize();
      _q.setFromUnitVectors(_z, _v);
    } else {
      const r = t.rot || [0, 0, 0];
      _q.setFromEuler(_e.set(r[0], r[1], r[2], t.order || 'XYZ'));
    }
    _m.compose(_v.set(pos[0], pos[1], pos[2]), _q, _s.set(sc[0], sc[1], sc[2]));
    geo.applyMatrix4(_m);
    if (typeof color === 'function') {
      color(geo);
    } else {
      paint(geo, color);
    }
    this.parts.push(normalizeGeo(geo));
    return this;
  }

  /** Ajoute une géométrie déjà colorée et positionnée. */
  addRaw(geo) {
    this.parts.push(normalizeGeo(geo));
    return this;
  }

  get empty() {
    return this.parts.length === 0;
  }

  build() {
    if (this.parts.length === 0) return new THREE.BufferGeometry();
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    merged.computeBoundingSphere();
    return merged;
  }
}

// Raccourcis de primitives (géométries neuves à chaque appel).
export const G = {
  sphere: (r = 1, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h),
  box: (x = 1, y = 1, z = 1) => new THREE.BoxGeometry(x, y, z),
  cyl: (rt = 1, rb = 1, h = 1, s = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open),
  cone: (r = 1, h = 1, s = 12) => new THREE.ConeGeometry(r, h, s),
  capsule: (r = 0.5, len = 1, cs = 6, rs = 12) => new THREE.CapsuleGeometry(r, len, cs, rs),
  torus: (r = 1, tube = 0.2, rs = 8, ts = 20, arc = Math.PI * 2) => new THREE.TorusGeometry(r, tube, rs, ts, arc),
  ico: (r = 1, d = 1) => new THREE.IcosahedronGeometry(r, d),
  dodeca: (r = 1) => new THREE.DodecahedronGeometry(r, 0),
};

/** Dégradé vertical de couleurs par sommet (ex. herbe plus claire au bout). */
export function paintGradientY(geo, colBottom, colTop, yMin, yMax) {
  const a = new THREE.Color(colBottom);
  const b = new THREE.Color(colTop);
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - yMin) / (yMax - yMin)));
    _c.copy(a).lerp(b, t);
    arr[i * 3] = _c.r;
    arr[i * 3 + 1] = _c.g;
    arr[i * 3 + 2] = _c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}
