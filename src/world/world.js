import * as THREE from 'three';
import { Terrain, TERRAIN_SIZE } from './terrain.js';
import { NavGrid } from './navgrid.js';
import { GrassField } from './grassField.js';
import { DayNight } from './sky.js';
import { createWater } from './water.js';
import { Colliders } from './collision.js';
import { Village } from './village.js';
import { IslandVillages } from './islands.js';
import { Vegetation } from './vegetation.js';
import { Ambient } from './ambient.js';
import { Weather } from './weather.js';
import { globalUniforms } from '../core/materials.js';
import { decorUniforms } from './decor.js';

// Le monde : assemble terrain, ciel, eau, village, végétation et vie ambiante,
// et répond aux questions du gameplay (hauteur du sol, obstacles, zones libres).

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = new Colliders();
    // Chemins des animaux autour des obstacles : réévalués là où un obstacle change.
    this.nav = new NavGrid(this, TERRAIN_SIZE / 2);
    this.colliders.onChange = (x, z, r) => this.nav.invalidate(x, z, r);
    this.reserved = [];
    this.platforms = [];
    this.fishingSpots = [];
    this.camBlockers = [];
    // Sols couverts (potager, nappe, meubles du jardin…) : pas d'herbe dessus, et les
    // animaux en font le tour pour laisser la place au joueur (voir addCover).
    this.covers = [];
    this.coversVersion = 0;

    this.terrain = new Terrain();
    this.terrainMesh = this.terrain.createMesh();
    scene.add(this.terrainMesh);

    this.sky = new DayNight(scene);
    this.weather = new Weather(scene, this.sky);
    this.water = createWater(this.terrain, this.sky);
    scene.add(this.water);

    this.village = new Village(this);
    scene.add(this.village.group);
    this.islands = new IslandVillages(this);
    this.renderDistance = 300;
    this.treeLod = 1; // distances de détail des arbres (qualité automatique)
    this.grassFieldK = 1; // rayon du tapis d'herbe dense (qualité automatique)
    this.particles = null;
    this.vegetation = new Vegetation(this);
    scene.add(this.vegetation.group);
    this.grassField = new GrassField(this);
    scene.add(this.grassField.mesh);
    this.ambient = new Ambient(this);
    scene.add(this.ambient.group);
  }

  heightAt(x, z) {
    return this.terrain.heightAt(x, z);
  }

  /** Hauteur du sol marchable (terrain ou ponton). */
  /** Grille des plateformes (ponts, pontons, kiosque…) pour ne tester que les proches. */
  platformGrid() {
    if (this.platGrid) return this.platGrid;
    const grid = new Map();
    const C = 8;
    for (const p of this.platforms) {
      const r = Math.hypot(p.hw, p.hd);
      for (let gx = Math.floor((p.x - r) / C); gx <= Math.floor((p.x + r) / C); gx++) {
        for (let gz = Math.floor((p.z - r) / C); gz <= Math.floor((p.z + r) / C); gz++) {
          const k = gx * 10007 + gz;
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(p);
        }
      }
    }
    this.platGrid = grid;
    return grid;
  }

  groundAt(x, z) {
    let h = this.terrain.heightAt(x, z);
    const cell = this.platformGrid().get(Math.floor(x / 8) * 10007 + Math.floor(z / 8));
    if (!cell) return h;
    for (const p of cell) {
      const dx = x - p.x;
      const dz = z - p.z;
      const lx = dx * p.cos - dz * p.sin;
      const lz = dx * p.sin + dz * p.cos;
      if (Math.abs(lx) <= p.hw && Math.abs(lz) <= p.hd) h = Math.max(h, p.y);
    }
    return h;
  }

  onPlatform(x, z) {
    return this.groundAt(x, z) > this.terrain.heightAt(x, z) + 0.05;
  }

  /** Marchable : pas d'eau profonde. */
  isWalkable(x, z) {
    return this.groundAt(x, z) > -0.55;
  }

  addPlatform(x, z, hw, hd, rot, y) {
    this.platforms.push({ x, z, hw, hd, y, cos: Math.cos(rot), sin: Math.sin(rot) });
    this.platGrid = null;
    this.nav?.invalidate(x, z, Math.hypot(hw, hd));
  }

  /** Volume qui bloque la caméra (maison, moulin…) : boîte orientée ou cylindre. */
  addCamBlocker(b) {
    this.camBlockers.push({ cos: Math.cos(b.rot || 0), sin: Math.sin(b.rot || 0), ...b });
  }

  cameraBlocked(x, y, z) {
    for (const b of this.camBlockers) {
      if (y > b.top) continue;
      const dx = x - b.x;
      const dz = z - b.z;
      if (b.r) {
        if (dx * dx + dz * dz < b.r * b.r) return true;
      } else {
        const lx = dx * b.cos - dz * b.sin;
        const lz = dx * b.sin + dz * b.cos;
        if (Math.abs(lx) < b.hw && Math.abs(lz) < b.hd) return true;
      }
    }
    return false;
  }

  /**
   * Objet posé au sol : { x, z, r } (disque) ou { x, z, hw, hd, rot } (rectangle).
   * grass : l'herbe ne pousse pas dessus ; animals : les animaux n'y entrent pas.
   */
  addCover(area, { grass = true, animals = true } = {}) {
    const rot = area.rot || 0;
    const c = { ...area, cos: Math.cos(rot), sin: Math.sin(rot), grass, animals };
    this.covers.push(c);
    this.coversVersion++;
    this.nav.invalidate(c.x, c.z, c.r ?? Math.hypot(c.hw, c.hd));
    return c;
  }

  removeCover(c) {
    const i = this.covers.indexOf(c);
    if (i < 0) return;
    this.covers.splice(i, 1);
    this.coversVersion++;
    this.nav.invalidate(c.x, c.z, c.r ?? Math.hypot(c.hw, c.hd));
  }

  /** Le point (avec une marge) est-il sur un sol couvert ? (kind : 'grass' ou 'animals') */
  covered(x, z, pad = 0, kind = 'grass') {
    for (const c of this.covers) {
      if (!c[kind]) continue;
      const dx = x - c.x;
      const dz = z - c.z;
      if (c.r !== undefined) {
        if (dx * dx + dz * dz < (c.r + pad) ** 2) return true;
      } else if (Math.abs(dx * c.cos - dz * c.sin) < c.hw + pad && Math.abs(dx * c.sin + dz * c.cos) < c.hd + pad) return true;
    }
    return false;
  }

  /** Repousse un animal (cercle x, z, r) hors des sols qui lui sont interdits. */
  keepOff(x, z, r) {
    const out = { x, z };
    for (const c of this.covers) {
      if (!c.animals) continue;
      const dx = out.x - c.x;
      const dz = out.z - c.z;
      if (c.r !== undefined) {
        const d = Math.hypot(dx, dz);
        const min = c.r + r;
        if (d < min) {
          const k = d > 1e-5 ? min / d : 0;
          out.x = c.x + (k ? dx * k : min);
          out.z = c.z + dz * k;
        }
        continue;
      }
      // Repère du rectangle : on sort par le bord le plus proche.
      const lx = dx * c.cos - dz * c.sin;
      const lz = dx * c.sin + dz * c.cos;
      const px = c.hw + r - Math.abs(lx);
      const pz = c.hd + r - Math.abs(lz);
      if (px <= 0 || pz <= 0) continue;
      let nx = lx;
      let nz = lz;
      if (px < pz) nx = Math.sign(lx || 1) * (c.hw + r);
      else nz = Math.sign(lz || 1) * (c.hd + r);
      out.x = c.x + nx * c.cos + nz * c.sin;
      out.z = c.z - nx * c.sin + nz * c.cos;
    }
    return out;
  }

  reserve(x, z, r) {
    this.reserved.push({ x, z, r });
  }

  canPlace(x, z, { minH = 0.9, maxSlope = 0.25, pathPad = 3, pad = 1.5 } = {}) {
    const h = this.terrain.heightAt(x, z);
    if (h < minH) return false;
    if (Math.hypot(x, z) < 15.5) return false;
    if (this.terrain.slopeAt(x, z) > maxSlope) return false;
    if (pathPad > 0 && this.terrain.pathDistance(x, z) < pathPad) return false;
    for (const r of this.reserved) {
      const d = Math.hypot(x - r.x, z - r.z);
      if (d < r.r + pad) return false;
    }
    return true;
  }

  /** Sol détaillé (textures) ou simples couleurs des biomes, sans redémarrer. */
  setGroundDetail(on) {
    const u = this.terrainMesh.userData;
    const m = on && u.detailed ? u.detailed : u.plain;
    if (m) for (const chunk of this.terrainMesh.children) chunk.material = m;
    // Grain des maisons et du mobilier : coupé avec le sol détaillé (petits ordinateurs).
    decorUniforms.uDecor.value = on ? 1 : 0;
  }

  update(dt, elapsed, focus, grassRadius = 80, camera = null) {
    globalUniforms.uTime.value = elapsed;
    this.sky.update(dt, focus, elapsed);
    this.weather.update(dt, focus);
    const night = this.sky.nightFactor;
    this.vegetation.updateGrass(focus, grassRadius);
    // Tapis d'herbe dense : environ un tiers du rayon de l'herbe (réglage « Herbe »).
    let field = Math.min(34, grassRadius * 0.3) * this.grassFieldK;
    if (field < 4) field = 0;
    if (field !== this.grassField.radius) this.grassField.setRadius(field);
    this.grassField.update(focus);
    const winter = this.weather.seasonIndex === 3;
    if (this.vegetation.flowerMeshes[0].visible === winter) {
      for (const m of this.vegetation.flowerMeshes) m.visible = !winter;
    }
    this.water.userData.update();
    this.village.update(dt, elapsed, night);
    this.islands.update(dt, elapsed, night, focus, this.particles, this.renderDistance);
    this.vegetation.updateIslands(focus, this.renderDistance);
    this.vegetation.updateTrees(camera ? camera.position : focus, (this.renderDistance / 300) * this.treeLod, focus);
    this.ambient.update(dt, elapsed, night, focus, this.weather);
  }
}

