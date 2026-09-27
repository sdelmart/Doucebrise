import * as THREE from 'three';
import { Terrain } from './terrain.js';
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

// Le monde : assemble terrain, ciel, eau, village, végétation et vie ambiante,
// et répond aux questions du gameplay (hauteur du sol, obstacles, zones libres).

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = new Colliders();
    this.reserved = [];
    this.platforms = [];
    this.fishingSpots = [];
    this.camBlockers = [];

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

  update(dt, elapsed, focus, grassRadius = 80) {
    globalUniforms.uTime.value = elapsed;
    this.sky.update(dt, focus, elapsed);
    this.weather.update(dt, focus);
    const night = this.sky.nightFactor;
    this.vegetation.updateGrass(focus, grassRadius);
    // Tapis d'herbe dense : environ un tiers du rayon de l'herbe (réglage « Herbe »).
    const field = Math.min(34, grassRadius * 0.3);
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
    this.ambient.update(dt, elapsed, night, focus, this.weather);
  }
}

