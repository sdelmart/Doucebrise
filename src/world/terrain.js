import * as THREE from 'three';
import { createRng, createNoise2D, fbm, smoothstep, lerp, clamp, distToPolyline } from '../core/math.js';
import { toon, addSeason } from '../core/materials.js';
import { groundTextures, addGroundDetail } from './terrainTextures.js';
import { WORLD_SEED, PATHS, LANDMARKS, ISLANDS, MAP_RANGE, islandAt } from './layout.js';

// Terrain de l'île : une grille de hauteurs partagée entre le rendu et le gameplay,
// pour que les pieds du personnage collent exactement au sol affiché.

export const TERRAIN_SIZE = 520;
export const TERRAIN_SEGMENTS = 416;
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
  pineGrass: new THREE.Color('#6fb567'),
  alpine: new THREE.Color('#9fd07a'),
  snow: new THREE.Color('#f4f8ff'),
  pebble: new THREE.Color('#b9b3aa'),
  stone: new THREE.Color('#d8d2c6'),
  tropic: new THREE.Color('#b6e07a'),
  tropicB: new THREE.Color('#8fd46a'),
  coralTiles: new THREE.Color('#f3d8b8'),
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
    let h = this.mainHeight(x, z);
    for (const I of Object.values(ISLANDS)) h = Math.max(h, this.islandHeight(x, z, I));
    return h;
  }

  /** Relief d'une île secondaire (montagne des Pins, lagon de l'île Corail). */
  islandHeight(x, z, I) {
    const dx = x - I.x;
    const dz = z - I.z;
    const r = Math.hypot(dx, dz);
    if (r > I.r + 50) return SEA_FLOOR;
    const a = Math.atan2(dz, dx);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const coast = I.r + 7 * this.noiseA(ca * 1.1 + I.seed, sa * 1.1 - I.seed) + 4 * this.noiseB(ca * 2.7 + I.seed, sa * 2.7 + I.seed);
    const inland = coast - r;
    let h = I.base + fbm(this.noiseA, x * 0.018 + I.seed, z * 0.018 - I.seed, 4) * I.rough + this.noiseC(x * 0.07, z * 0.07) * 0.3;
    if (I.id === 'pins') {
      const P = LANDMARKS.peak;
      const d = Math.hypot(x - P.x, z - P.z) + this.noiseB(x * 0.05, z * 0.05) * 5;
      h += Math.pow(Math.max(0, 1 - d / 46), 1.7) * 21 + Math.max(0, 1 - d / 12) * 3;
      h += bump(x, z, -146, -176, 20) * 5 + bump(x, z, -190, -140, 16) * 4;
      const B = LANDMARKS.bourg;
      h = lerp(h, B.h, smoothstep(B.r * 2.1, B.r, Math.hypot(x - B.x, z - B.z)));
      const S = LANDMARKS.hotspring;
      h = lerp(h, 2.6, smoothstep(S.r * 2.4, S.r * 1.4, Math.hypot(x - S.x, z - S.z)));
    } else {
      h += bump(x, z, LANDMARKS.lookout.x, LANDMARKS.lookout.z, 22) * LANDMARKS.lookout.h;
      const Pt = LANDMARKS.port;
      h = lerp(h, Pt.h, smoothstep(Pt.r * 2, Pt.r, Math.hypot(x - Pt.x, z - Pt.z)));
    }
    const pd = this.pathDistance(x, z);
    h = lerp(h, h * 0.9 + 0.25, smoothstep(4, 1, pd));
    const bw = I.beach + this.noiseC(ca * 3 + I.seed, sa * 3) * 2;
    const shore = clamp((0.15 - bw * 0.007) * inland + 0.35, SEA_FLOOR, 3);
    h = lerp(shore, h, smoothstep(4 + bw, 18 + bw, inland));
    if (I.id === 'pins') {
      const L = LANDMARKS.lake;
      const ld = Math.hypot(x - L.x, z - L.z) + this.noiseB(x * 0.12, z * 0.12) * 2;
      h = lerp(h, -2.2, smoothstep(L.r * 1.3, L.r * 0.6, ld));
    } else {
      const G = LANDMARKS.lagoon;
      const gd = Math.hypot(x - G.x, z - G.z) + this.noiseB(x * 0.08, z * 0.08) * 3;
      const k = smoothstep(G.r * 1.35, G.r * 0.75, gd);
      h = lerp(h, Math.max(-0.9, Math.min(h, -0.9)), k);
    }
    return clamp(h, SEA_FLOOR, 40);
  }

  mainHeight(x, z) {
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

  /**
   * Couleur du sol ; w (facultatif, 7 nombres) reçoit en plus la part de chaque type de
   * sol (voir GROUND_LAYERS : herbe, sous-bois, terre, sable, roche, pavés, neige).
   */
  colorAt(x, z, h, normalY, out = new THREE.Color(), w = null) {
    // Mélange vers une couleur et, pour le sol détaillé, vers le type de sol correspondant.
    const mix = (color, layer, t) => {
      out.lerp(color, t);
      if (w && t > 0) {
        for (let k = 0; k < 7; k++) w[k] *= 1 - t;
        w[layer] += t;
      }
    };
    if (w) {
      w.fill(0);
      w[0] = 1;
    }
    const n1 = this.noiseB(x * 0.045, z * 0.045);
    const n2 = this.noiseC(x * 0.18, z * 0.18);
    out.copy(COLORS.grassA).lerp(COLORS.grassB, smoothstep(-0.4, 0.6, n1));
    mix(COLORS.grassC, 0, smoothstep(0.2, 0.8, n2) * 0.5);

    const forest = smoothstep(40, 22, Math.hypot(x + 4, z + 58));
    mix(n2 > 0 ? COLORS.forest : COLORS.forestB, 1, forest * 0.9);
    const meadow = smoothstep(30, 12, Math.hypot(x - 50, z - 8));
    mix(COLORS.meadow, 0, meadow * 0.7);
    const hill = smoothstep(20, 8, Math.hypot(x - LANDMARKS.windmill.x, z - LANDMARKS.windmill.z));
    mix(COLORS.hill, 0, hill * 0.6);

    const pd = this.pathDistance(x, z) + n2 * 0.5;
    mix(COLORS.path, 2, smoothstep(2.6, 1.5, pd));
    const plaza = Math.hypot(x, z) + n2 * 0.6;
    mix(COLORS.plaza, 5, smoothstep(14.5, 13, plaza));

    const isl = islandAt(x, z);
    if (isl === 'pins') {
      mix(COLORS.pineGrass, 0, 0.55 + n2 * 0.15);
      const B = LANDMARKS.bourg;
      mix(COLORS.alpine, 0, smoothstep(30, 14, Math.hypot(x - B.x, z - B.z)) * 0.6);
      mix(COLORS.path, 2, smoothstep(2.6, 1.5, pd));
      mix(COLORS.stone, 5, smoothstep(11.5, 10, Math.hypot(x - B.x, z - B.z) + n2 * 0.6));
      mix(COLORS.rock, 4, smoothstep(0.86, 0.72, normalY));
      mix(COLORS.rock, 4, smoothstep(11, 15, h) * 0.6);
      mix(COLORS.snow, 6, smoothstep(14.5, 17.5, h + n1 * 1.5));
      mix(COLORS.pebble, 4, smoothstep(1.3, 0.8, h + n2 * 0.15));
      mix(COLORS.wetSand, 3, smoothstep(0.1, -0.6, h) * 0.6);
      return out;
    }
    if (isl === 'corail') {
      out.copy(COLORS.tropic).lerp(COLORS.tropicB, smoothstep(-0.3, 0.6, n1));
      if (w) {
        w.fill(0);
        w[0] = 1;
      }
      mix(COLORS.path, 2, smoothstep(2.6, 1.5, pd));
      const P = LANDMARKS.port;
      mix(COLORS.coralTiles, 5, smoothstep(12.5, 11, Math.hypot(x - P.x, z - P.z) + n2 * 0.6));
      mix(COLORS.rock, 4, smoothstep(0.82, 0.7, normalY));
      mix(COLORS.sand, 3, smoothstep(1.8, 1.1, h + n2 * 0.15));
      mix(COLORS.wetSand, 3, smoothstep(0.1, -0.6, h));
      return out;
    }
    mix(COLORS.rock, 4, smoothstep(0.82, 0.7, normalY));
    mix(COLORS.sand, 3, smoothstep(1.35, 0.85, h + n2 * 0.15));
    mix(COLORS.wetSand, 3, smoothstep(0.1, -0.6, h));
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
    // Sol détaillé : part de chaque type de sol par sommet (l'herbe prend le reste).
    const detailed = !!groundTextures();
    const w = new Float32Array(7);
    const splatA = detailed ? new Float32Array(count * 3) : null;
    const splatB = detailed ? new Float32Array(count * 3) : null;
    // Part d'herbe par sommet (tapis d'herbe dense : pas sur les chemins, le sable, la roche…).
    this.grassDensity = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const h = positions[i * 3 + 1];
      const ny = normals.getY(i);
      this.colorAt(positions[i * 3], positions[i * 3 + 2], h, ny, col, w);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
      this.grassDensity[i] = clamp(w[0] + w[1] * 0.55, 0, 1) * smoothstep(1.05, 1.5, h) * smoothstep(0.62, 0.8, ny);
      if (detailed) {
        splatA.set([w[1], w[2], w[3]], i * 3);
        splatB.set([w[4], w[5], w[6]], i * 3);
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    if (detailed) {
      geo.setAttribute('splatA', new THREE.BufferAttribute(splatA, 3));
      geo.setAttribute('splatB', new THREE.BufferAttribute(splatB, 3));
    }
    this.vertexColors = colors;

    let material = addSeason(toon('#ffffff', { vertexColors: true }), { ground: true, snowLo: 0.55, snowHi: 0.85 });
    if (material.isMeshStandardMaterial) material.roughness = 0.92;
    if (detailed) material = addGroundDetail(material);
    const mesh = new THREE.Mesh(geo, material);
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
  renderMap(size = 256, range = MAP_RANGE) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    const col = new THREE.Color();
    const water = new THREE.Color('#8fdcec');
    const deep = new THREE.Color('#3f97cf');
    const foam = new THREE.Color('#e8fbff');
    const step = (2 * range) / size;
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const x = (px / size) * 2 * range - range;
        const z = (py / size) * 2 * range - range;
        const h = this.heightAt(x, z);
        if (h < 0) {
          col.copy(water).lerp(deep, smoothstep(0, 7, -h));
          // Liseré d'écume près des côtes.
          col.lerp(foam, smoothstep(-0.5, 0, h) * 0.6);
        } else {
          this.colorAt(x, z, h, 1, col);
          // Ombrage du relief (lumière venant du nord-ouest).
          const dx = this.heightAt(x + step, z) - this.heightAt(x - step, z);
          const dz = this.heightAt(x, z + step) - this.heightAt(x, z - step);
          const shade = clamp(1 + (-dx - dz) * (0.9 / step) * 0.35, 0.62, 1.3);
          col.multiplyScalar(shade * (0.94 + clamp(h / 20, 0, 1) * 0.12));
        }
        const i = (py * size + px) * 4;
        img.data[i] = Math.round(clamp(col.r, 0, 1) ** (1 / 2.2) * 255);
        img.data[i + 1] = Math.round(clamp(col.g, 0, 1) ** (1 / 2.2) * 255);
        img.data[i + 2] = Math.round(clamp(col.b, 0, 1) ** (1 / 2.2) * 255);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // Chemins.
    const k = size / (2 * range);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [w, c] of [[3.4, 'rgba(120, 90, 60, 0.35)'], [2.2, 'rgba(250, 236, 205, 0.95)']]) {
      ctx.lineWidth = w * k;
      ctx.strokeStyle = c;
      for (const path of PATHS) {
        ctx.beginPath();
        path.forEach(([x, z], i) => ctx[i ? 'lineTo' : 'moveTo']((x + range) * k, (z + range) * k));
        ctx.stroke();
      }
    }
    return canvas;
  }
}
