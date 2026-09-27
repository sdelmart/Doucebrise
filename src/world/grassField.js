import * as THREE from 'three';
import { toon, addSeason, globalUniforms } from '../core/materials.js';
import { clamp } from '../core/math.js';

// Tapis d'herbe dense autour du joueur : des dizaines de milliers de brins dessinés en
// un seul appel, placés par le GPU sur une grille accrochée au monde (les brins ne
// « glissent » pas quand on avance). Hauteur du sol, couleur et densité viennent de
// textures calculées une fois depuis le terrain (pas d'herbe sur les chemins, le sable,
// la roche, sous les maisons…). Le vent les fait onduler et ils s'écartent au passage.

const SPACING = 0.26; // distance entre deux touffes (m)
const MAX_RADIUS = 34;
const MASK_RES = 0.5; // précision du masque des obstacles (m)

/** Touffe de trois brins effilés (hauteur 1, recalée dans le shader). */
function tuftGeometry() {
  const pos = [];
  const idx = [];
  const blades = 3;
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI * 2 + 0.4;
    const ox = Math.cos(a + 1.3) * 0.045;
    const oz = Math.sin(a + 1.3) * 0.045;
    const cx = Math.cos(a);
    const cz = Math.sin(a);
    const base = pos.length / 3;
    for (const y of [0, 0.5]) {
      const w = 0.028 * (1 - y) ** 0.7;
      pos.push(ox - cx * w, y, oz - cz * w, ox + cx * w, y, oz + cz * w);
    }
    pos.push(ox, 1, oz);
    idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3, base + 2, base + 3, base + 4);
  }
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  geo.setIndex(idx);
  return geo;
}

export class GrassField {
  constructor(world) {
    this.world = world;
    const terrain = world.terrain;
    const row = terrain.n + 1;

    // Hauteurs exactes du terrain (lues sans filtrage, interpolées comme heightAt).
    this.heightTex = new THREE.DataTexture(terrain.heights, row, row, THREE.RedFormat, THREE.FloatType);
    this.heightTex.needsUpdate = true;

    // Couleur du sol et densité d'herbe, par sommet du terrain.
    const data = new Uint8Array(row * row * 4);
    const colors = terrain.vertexColors;
    for (let i = 0; i < row * row; i++) {
      for (let k = 0; k < 3; k++) data[i * 4 + k] = Math.round(Math.sqrt(clamp(colors[i * 3 + k], 0, 1)) * 255);
      data[i * 4 + 3] = Math.round(terrain.grassDensity[i] * 255);
    }
    this.mapTex = new THREE.DataTexture(data, row, row, THREE.RGBAFormat);
    this.mapTex.magFilter = THREE.LinearFilter;
    this.mapTex.minFilter = THREE.LinearFilter;
    this.mapTex.needsUpdate = true;

    this.maskTex = this.buildMask();

    this.uniforms = {
      uGrassGrid: { value: 0 },
      uGrassOrigin: { value: new THREE.Vector2() },
      uGrassFocus: { value: new THREE.Vector3() },
      uGrassPush: { value: new THREE.Vector3() },
      uGrassRadius: { value: 20 },
      uGrassTerrain: { value: new THREE.Vector4(terrain.half, terrain.step, terrain.n, 0) },
      uGrassMaskInfo: { value: new THREE.Vector3(this.maskHalf, MASK_RES, this.maskSize) },
      tGrassHeight: { value: this.heightTex },
      tGrassMap: { value: this.mapTex },
      tGrassMask: { value: this.maskTex },
    };

    this.geometry = tuftGeometry();
    const material = this.material();
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    this.mesh.name = 'grass-field';
    this.setRadius(20);
  }

  /** Masque des obstacles (maisons, murets, pontons, troncs…) : 0 = pas d'herbe. */
  buildMask() {
    const half = 150;
    const size = Math.round((half * 2) / MASK_RES);
    this.maskHalf = half;
    this.maskSize = size;
    const mask = new Uint8Array(size * size).fill(255);
    const seen = new Set();
    const paint = (c, pad, test) => {
      const r = c.r ?? Math.hypot(c.hw, c.hd);
      const x0 = Math.max(0, Math.floor((c.x - r - pad + half) / MASK_RES));
      const x1 = Math.min(size - 1, Math.ceil((c.x + r + pad + half) / MASK_RES));
      const z0 = Math.max(0, Math.floor((c.z - r - pad + half) / MASK_RES));
      const z1 = Math.min(size - 1, Math.ceil((c.z + r + pad + half) / MASK_RES));
      for (let iz = z0; iz <= z1; iz++) {
        for (let ix = x0; ix <= x1; ix++) {
          const x = ix * MASK_RES - half + MASK_RES / 2;
          const z = iz * MASK_RES - half + MASK_RES / 2;
          if (test(x - c.x, z - c.z)) mask[iz * size + ix] = 0;
        }
      }
    };
    const inBox = (c, pad) => (dx, dz) => {
      const lx = dx * c.cos - dz * c.sin;
      const lz = dx * c.sin + dz * c.cos;
      return Math.abs(lx) < c.hw + pad && Math.abs(lz) < c.hd + pad;
    };
    for (const list of this.world.colliders.grid.values()) {
      for (const c of list) {
        if (seen.has(c)) continue;
        seen.add(c);
        if (c.type === 'circle') {
          // Troncs et rochers : un peu d'herbe tout autour, pas dedans.
          const rr = c.r * 0.85;
          paint(c, 0, (dx, dz) => dx * dx + dz * dz < rr * rr);
        } else {
          paint(c, 0.15, inBox(c, 0.15));
        }
      }
    }
    for (const p of this.world.platforms) paint(p, 0.1, inBox(p, 0.1));
    const tex = new THREE.DataTexture(mask, size, size, THREE.RedFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  material() {
    const u = this.uniforms;
    const base = toon('#ffffff', { side: THREE.DoubleSide });
    if (base.isMeshStandardMaterial) base.roughness = 0.75;
    const mat = addSeason(base, { leaf: 0.7, snowLo: -1, snowHi: 0, snow: 0.75, key: 'grass-field' });
    const prev = mat.onBeforeCompile;
    const prevKey = mat.customProgramCacheKey();
    mat.onBeforeCompile = (shader, renderer) => {
      prev.call(mat, shader, renderer);
      Object.assign(shader.uniforms, u);
      shader.uniforms.uTime = globalUniforms.uTime;
      shader.vertexShader = `uniform float uTime;
uniform float uSnow;
uniform float uGrassGrid;
uniform vec2 uGrassOrigin;
uniform vec3 uGrassFocus;
uniform vec3 uGrassPush;
uniform float uGrassRadius;
uniform vec4 uGrassTerrain;
uniform vec3 uGrassMaskInfo;
uniform highp sampler2D tGrassHeight;
uniform sampler2D tGrassMap;
uniform sampler2D tGrassMask;
varying vec3 vGrassColor;
varying float vGrassY;
float grassHash(vec2 p) {
  p = fract(p * vec2(0.1031, 0.1030));
  p += dot(p, p.yx + 33.33);
  return fract((p.x + p.y) * p.x);
}
float grassGround(vec2 p) {
  vec2 g = (p + uGrassTerrain.x) / uGrassTerrain.y;
  vec2 c = clamp(floor(g), vec2(0.0), vec2(uGrassTerrain.z - 1.0));
  vec2 f = g - c;
  ivec2 i = ivec2(c);
  float h00 = texelFetch(tGrassHeight, i, 0).r;
  float h10 = texelFetch(tGrassHeight, i + ivec2(1, 0), 0).r;
  float h01 = texelFetch(tGrassHeight, i + ivec2(0, 1), 0).r;
  float h11 = texelFetch(tGrassHeight, i + ivec2(1, 1), 0).r;
  if (f.x + f.y <= 1.0) return h00 + (h10 - h00) * f.x + (h01 - h00) * f.y;
  return h11 + (h01 - h11) * (1.0 - f.x) + (h10 - h11) * (1.0 - f.y);
}
${shader.vertexShader}`
        .replace(
          '#include <beginnormal_vertex>',
          `// Touffe écartée (hors du rayon, chemin, obstacle…) : réduite à un point, sans calcul.
          vec3 grassPos = vec3(0.0, -500.0, 0.0);
          vec3 objectNormal = vec3(0.0, 1.0, 0.0);
          vGrassColor = vec3(0.0);
          vGrassY = 0.0;
          {
            float grid = uGrassGrid;
            float id = float(gl_InstanceID);
            vec2 cellI = vec2(mod(id, grid), floor(id / grid));
            vec2 cell = uGrassOrigin + cellI - floor(grid * 0.5);
            vec2 jitter = vec2(grassHash(cell), grassHash(cell + 19.7));
            vec2 wp = (cell + jitter) * ${SPACING.toFixed(3)};
            float dist = length(wp - uGrassFocus.xz);
            vec4 m = vec4(0.0);
            if (dist < uGrassRadius) m = texture(tGrassMap, ((wp + uGrassTerrain.x) / uGrassTerrain.y + 0.5) / (uGrassTerrain.z + 1.0));
            float keep = 0.0;
            float dens = 0.0;
            if (m.a > 0.1) {
              float mask = texture(tGrassMask, (wp + uGrassMaskInfo.x) / (uGrassMaskInfo.y * uGrassMaskInfo.z)).r;
              dens = m.a * smoothstep(0.35, 0.9, mask);
              // Densité : les touffes disparaissent une à une (pas de bord net), plus clairsemées au loin.
              float thin = mix(1.0, 0.45, smoothstep(uGrassRadius * 0.45, uGrassRadius, dist));
              keep = step(grassHash(cell + 7.3), smoothstep(0.25, 0.75, dens) * thin) * step(dist, uGrassRadius * 0.82 + grassHash(cell + 2.9) * uGrassRadius * 0.18);
            }
            if (keep > 0.0) {
              // Sous la neige, l'herbe est tassée.
              float h = mix(0.26, 0.5, grassHash(cell + 3.1)) * (0.75 + 0.35 * dens) * (1.0 - uSnow * 0.55);
              float ang = grassHash(cell + 11.9) * 6.2832;
              vec2 cs = vec2(cos(ang), sin(ang));
              vec3 p = position;
              p.xz = vec2(p.x * cs.x - p.z * cs.y, p.x * cs.y + p.z * cs.x) * (0.85 + 0.4 * grassHash(cell + 5.3));
              float y = p.y;
              // Vent (rafales qui traversent le pré) et passage du joueur.
              float gust = sin(uTime * 1.6 + wp.x * 0.32 + wp.y * 0.21) * 0.5 + sin(uTime * 2.7 + wp.x * 0.9 - wp.y * 0.6) * 0.22;
              vec2 bend = vec2(0.55, 0.3) * (0.35 + gust) * 0.45 + (jitter - 0.5) * 0.5;
              vec2 away = wp - uGrassPush.xz;
              float pd = length(away);
              bend += (pd > 0.001 ? away / pd : vec2(0.0)) * smoothstep(1.1, 0.2, pd) * 1.4;
              vec2 off = bend * y * y * h;
              grassPos = vec3(wp.x + p.x + off.x, grassGround(wp) - 0.02 + y * h * (1.0 - 0.35 * dot(bend, bend) * y), wp.y + p.z + off.y);
              objectNormal = normalize(vec3(off.x * 0.6, 1.0, off.y * 0.6));
              vGrassColor = m.rgb * m.rgb;
              vGrassY = y;
            }
          }`,
        )
        .replace('#include <begin_vertex>', 'vec3 transformed = grassPos;');
      shader.fragmentShader = `varying vec3 vGrassColor;
varying float vGrassY;
${shader.fragmentShader}`
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          diffuseColor.rgb *= vGrassColor * mix(0.42, 1.12, smoothstep(0.0, 1.0, vGrassY));`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          normal = normalize(vNormal);`,
        );
    };
    mat.customProgramCacheKey = () => `${prevKey}|grass-field`;
    return mat;
  }

  /** Rayon du tapis d'herbe (m) ; 0 le masque. */
  setRadius(radius) {
    const r = Math.min(MAX_RADIUS, radius);
    this.radius = r;
    const grid = Math.ceil((r * 2) / SPACING / 2) * 2;
    this.uniforms.uGrassGrid.value = grid;
    this.uniforms.uGrassRadius.value = r;
    this.geometry.instanceCount = r > 0 ? grid * grid : 0;
    this.mesh.visible = r > 0;
  }

  /** focus : centre du tapis ; push : position qui écarte les brins (le joueur). */
  update(focus, push = focus) {
    this.uniforms.uGrassOrigin.value.set(Math.floor(focus.x / SPACING), Math.floor(focus.z / SPACING));
    this.uniforms.uGrassFocus.value.copy(focus);
    this.uniforms.uGrassPush.value.copy(push);
  }
}
