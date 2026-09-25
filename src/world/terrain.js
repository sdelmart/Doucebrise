import * as THREE from 'three';
import { createRng, createNoise2D, fbm, smoothstep, lerp, clamp, distToPolyline } from '../core/math.js';
import { toon, addSeason } from '../core/materials.js';
import { WORLD_SEED, PATHS, LANDMARKS } from './layout.js';

// Terrain de l'île : une grille de hauteurs partagée entre le rendu et le gameplay,
// pour que les pieds du personnage collent exactement au sol affiché.

export const TERRAIN_SIZE = 300;
export const TERRAIN_SEGMENTS = 240;
export const SEA_FLOOR = -8;

const COLORS = {
  grassA: new THREE.Color('#8fd06b'),
  grassB: new THREE.Color('#aedc6f'),
  grassC: new THREE.Color('#79c265'),
  forest: new THREE.Color('#5fa65d'),
  forestB: new THREE.Color('#6fb45f'),
  meadow: new THREE.Color('#bde277'),
  sand: new THREE.Color('#f3dfae'),
  wetSand: new THREE.Color('#dcc38f'),
  path: new THREE.Color('#e0c697'),
  plaza: new THREE.Color('#ead9bb'),
  rock: new THREE.Color('#aba398'),
  hill: new THREE.Color('#c4dc74'),
};

const angDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
const bump = (x, z, cx, cz, r) => {
  const d = Math.hypot(x - cx, z - cz) / r;
  return d >= 1 ? 0 : (1 - d * d) * (1 - d * d);
};

export class Terrain {
  constructor() {
    const rng = createRng(WORLD_SEED);
    this.noiseA = createNoise2D(rng);
    this.noiseB = createNoise2D(rng);
    this.noiseC = createNoise2D(rng);
    const N = TERRAIN_SEGMENTS;
    this.n = N;
    this.step = TERRAIN_SIZE / N;
    this.half = TERRAIN_SIZE / 2;
    this.heights = new Float32Array((N + 1) * (N + 1));
    for (let iz = 0; iz <= N; iz++) {
      for (let ix = 0; ix <= N; ix++) {
        const x = -this.half + ix * this.step;
        const z = -this.half + iz * this.step;
        this.heights[iz * (N + 1) + ix] = this.computeHeight(x, z);
      }
    }
  }

  // --- Forme de l'île -------------------------------------------------------

  coastRadius(x, z) {
    const a = Math.atan2(z, x);
    const cx = Math.cos(a);
    const cz = Math.sin(a);
    let r = 94 + 9 * this.noiseA(cx * 1.2, cz * 1.2) + 5 * this.noiseB(cx * 3 + 7, cz * 3 + 7);
    // Baie de la plage (sud) et cap du phare (nord-est) contrôlés à la main.
    const beachA = Math.atan2(82, 16);
    r = lerp(r, 93, Math.exp(-(angDiff(a, beachA) ** 2) / 0.06));
    const capeA = Math.atan2(LANDMARKS.lighthouse.z, LANDMARKS.lighthouse.x);
    r = lerp(r, 101, Math.exp(-(angDiff(a, capeA) ** 2) / 0.03));
    return r;
  }

  beachWidth(x, z) {
    const a = Math.atan2(z, x);
    return 12 * Math.exp(-(angDiff(a, Math.atan2(82, 16)) ** 2) / 0.09);
  }

  pathDistance(x, z) {
    let d = Infinity;
    for (const p of PATHS) d = Math.min(d, distToPolyline(x, z, p));
    return d;
  }

  computeHeight(x, z) {
    const r = Math.hypot(x, z);
    const inland = this.coastRadius(x, z) - r;
    let h = 2.4 + fbm(this.noiseA, x * 0.016, z * 0.016, 4) * 2.6 + this.noiseC(x * 0.07, z * 0.07) * 0.3;
    // Reliefs.
    const hill = bump(x, z, LANDMARKS.windmill.x, LANDMARKS.windmill.z, 26);
    h += Math.min(hill * 1.25, 1) * 8.5;
    h += bump(x, z, -8, -60, 36) * 2.8;
    h += bump(x, z, LANDMARKS.lighthouse.x, LANDMARKS.lighthouse.z, 20) * 6.5;
    h += bump(x, z, 34, 34, 15) * 1.8;
    // Place du village bien plate.
    h = lerp(h, 2.3, smoothstep(30, 15, Math.hypot(x, z)));
    // Chemins un peu adoucis.
    const pd = this.pathDistance(x, z);
    h = lerp(h, h * 0.9 + 0.25, smoothstep(4, 1, pd));
    // Étang.
    const pond = Math.hypot(x - LANDMARKS.pond.x, z - LANDMARKS.pond.z) + this.noiseB(x * 0.12, z * 0.12) * 2.2;
    h = lerp(h, -2.4, smoothstep(15, 6.5, pond));
    // Côte : plage en pente douce puis fond marin.
    const bw = this.beachWidth(x, z);
    const shore = clamp((0.15 - bw * 0.007) * inland + 0.35, SEA_FLOOR, 3);
    h = lerp(shore, h, smoothstep(4 + bw, 18 + bw, inland));
    return clamp(h, SEA_FLOOR, 40);
  }

  // --- Échantillonnage (même triangulation que le mesh) ---------------------

  heightAt(x, z) {
    const N = this.n;
    const gx = (x + this.half) / this.step;
    const gz = (z + this.half) / this.step;
    if (gx < 0 || gz < 0 || gx >= N || gz >= N) return SEA_FLOOR;
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = gx - ix;
    const fz = gz - iz;
    const row = N + 1;
    const h00 = this.heights[iz * row + ix];
    const h10 = this.heights[iz * row + ix + 1];
    const h01 = this.heights[(iz + 1) * row + ix];
    const h11 = this.heights[(iz + 1) * row + ix + 1];
    if (fx + fz <= 1) return h00 + (h10 - h00) * fx + (h01 - h00) * fz;
    return h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
  }

  normalAt(x, z, out = new THREE.Vector3()) {
    const e = 0.6;
    const hx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
    const hz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    return out.set(-hx, 2 * e, -hz).normalize();
  }

  slopeAt(x, z) {
    return 1 - this.normalAt(x, z).y;
  }

  // --- Couleurs ---------------------------------------------------------------

  colorAt(x, z, h, normalY, out = new THREE.Color()) {
    const n1 = this.noiseB(x * 0.045, z * 0.045);
    const n2 = this.noiseC(x * 0.18, z * 0.18);
    out.copy(COLORS.grassA).lerp(COLORS.grassB, smoothstep(-0.4, 0.6, n1));
    out.lerp(COLORS.grassC, smoothstep(0.2, 0.8, n2) * 0.5);

    const forest = smoothstep(40, 22, Math.hypot(x + 4, z + 58));
    out.lerp(n2 > 0 ? COLORS.forest : COLORS.forestB, forest * 0.9);
    const meadow = smoothstep(30, 12, Math.hypot(x - 50, z - 8));
    out.lerp(COLORS.meadow, meadow * 0.7);
    const hill = smoothstep(20, 8, Math.hypot(x - LANDMARKS.windmill.x, z - LANDMARKS.windmill.z));
    out.lerp(COLORS.hill, hill * 0.6);

    const pd = this.pathDistance(x, z) + n2 * 0.5;
    out.lerp(COLORS.path, smoothstep(2.6, 1.5, pd));
    const plaza = Math.hypot(x, z) + n2 * 0.6;
    out.lerp(COLORS.plaza, smoothstep(14.5, 13, plaza));

    out.lerp(COLORS.rock, smoothstep(0.82, 0.7, normalY));
    out.lerp(COLORS.sand, smoothstep(1.35, 0.85, h + n2 * 0.15));
    out.lerp(COLORS.wetSand, smoothstep(0.1, -0.6, h));
    return out;
  }

  // --- Mesh -----------------------------------------------------------------

  createMesh() {
    const N = this.n;
    const row = N + 1;
    const count = row * row;
    const positions = new Float32Array(count * 3);
    for (let iz = 0; iz <= N; iz++) {
      for (let ix = 0; ix <= N; ix++) {
        const i = iz * row + ix;
        positions[i * 3] = -this.half + ix * this.step;
        positions[i * 3 + 1] = this.heights[i];
        positions[i * 3 + 2] = -this.half + iz * this.step;
      }
    }
    const indices = new Uint32Array(N * N * 6);
    let k = 0;
    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const a = iz * row + ix; // (x0,z0)
        const b = a + 1; // (x1,z0)
        const c = a + row; // (x0,z1)
        const d = c + 1; // (x1,z1)
        indices[k++] = a;
        indices[k++] = c;
        indices[k++] = b;
        indices[k++] = c;
        indices[k++] = d;
        indices[k++] = b;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();

    const normals = geo.attributes.normal;
    const colors = new Float32Array(count * 3);
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      this.colorAt(positions[i * 3], positions[i * 3 + 2], positions[i * 3 + 1], normals.getY(i), col);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.vertexColors = colors;

    const mesh = new THREE.Mesh(geo, addSeason(toon('#ffffff', { vertexColors: true }), { ground: true, snowLo: 0.55, snowHi: 0.85 }));
    mesh.receiveShadow = true;
    mesh.name = 'terrain';
    return mesh;
  }

  /** Texture de profondeur pour l'eau (0 = fond marin, 1 = +8 m). */
  createHeightTexture() {
    const N = this.n;
    const row = N + 1;
    const data = new Uint8Array(row * row * 4);
    for (let i = 0; i < row * row; i++) {
      const v = Math.round(clamp((this.heights[i] - SEA_FLOOR) / 16, 0, 1) * 255);
      data[i * 4] = v;
      data[i * 4 + 1] = v;
      data[i * 4 + 2] = v;
      data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, row, row, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  /** Image de la carte (vue du dessus) pour la mini-carte. */
  renderMap(size = 256, range = 110) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    const col = new THREE.Color();
    const water = new THREE.Color('#7fd3e6');
    const deep = new THREE.Color('#4aa8d8');
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const x = (px / size) * 2 * range - range;
        const z = (py / size) * 2 * range - range;
        const h = this.heightAt(x, z);
        if (h < 0) {
          col.copy(water).lerp(deep, smoothstep(0, 5, -h));
        } else {
          this.colorAt(x, z, h, 1, col);
          const shade = 0.88 + clamp(h / 14, 0, 1) * 0.2;
          col.multiplyScalar(shade);
        }
        const i = (py * size + px) * 4;
        img.data[i] = Math.round(clamp(col.r, 0, 1) ** (1 / 2.2) * 255);
        img.data[i + 1] = Math.round(clamp(col.g, 0, 1) ** (1 / 2.2) * 255);
        img.data[i + 2] = Math.round(clamp(col.b, 0, 1) ** (1 / 2.2) * 255);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }
}
