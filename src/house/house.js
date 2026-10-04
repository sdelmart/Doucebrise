import * as THREE from 'three';
import { toon, vertexColorToon, withOutline, getGradientMap, shadedMaterial, withBevel } from '../core/materials.js';
import { FURNITURE, WALLPAPERS, FLOORS, surfaceTexture } from './furniture.js';
import { DEFAULT_HOME, HOME_SIZES } from '../world/home.js';
import { addDecor, SURF } from '../world/decor.js';

// Matière de la couleur principale d'un meuble : tissu (canapés, lits, tapis…), émail
// (cuisine, salle de bains) ou bois peint (le reste) ; avant, une surface unie et mate.
const FABRIC = /canape|fauteuil|pouf|^lit|coussin|tapis|peluche|hamac|transat|panier|lit-chat|guirlande|lampions|lanterne-papier|parasol|bouee/;
const ENAMEL = /cuisiniere|frigo|evier|baignoire|lavabo|machine-cafe|plan-travail|vaisselier|aquarium|tv-retro|poele/;
const _main = new THREE.Color();
function tagFurniture(id, geo, color) {
  const col = geo.attributes.color;
  if (!col || !color) return geo;
  const surf = FABRIC.test(id) ? SURF.fabric : ENAMEL.test(id) ? SURF.ceramic : SURF.painted;
  _main.set(color);
  const prev = geo.attributes.aSurf;
  const out = new Float32Array(col.count);
  for (let i = 0; i < col.count; i++) {
    const same = Math.abs(col.getX(i) - _main.r) + Math.abs(col.getY(i) - _main.g) + Math.abs(col.getZ(i) - _main.b) < 0.004;
    out[i] = same ? surf : prev ? prev.getX(i) : 0;
  }
  geo.setAttribute('aSurf', new THREE.BufferAttribute(out, 1));
  return geo;
}

// Maison du joueur : pièce intérieure (murs en coupe côté caméra), meubles posés
// dedans ou dans le jardin, papier peint et sol, et interactions (lit, cuisinière…).

export const ROOM = { x: 600, z: 600, w: 10, d: 8, h: 3.2 };
const MAX_LIGHTS = 4;
let uid = 1;

export class House {
  constructor(game) {
    this.game = game;
    this.storage = {};
    this.placed = [];
    this.wallId = 'creme';
    this.floorId = 'parquet';
    this.ownedWalls = new Set(['creme']);
    this.ownedFloors = new Set(['parquet']);
    this.exterior = { ...DEFAULT_HOME, extras: [...DEFAULT_HOME.extras] };
    this.ownedStyles = new Set(['roof:classique', 'facade:enduit', 'extra:cheminee', 'extra:jardinieres', 'extra:volets']);
    this.group = new THREE.Group();
    this.group.name = 'house';
    game.scene.add(this.group);
    this.inside = false;
    this.anims = [];
    this.buildRoom();
    this.lights = [];
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const l = new THREE.PointLight('#ffd89a', 0, 7, 1.5);
      this.group.add(l);
      this.lights.push(l);
    }
    this.fill = new THREE.PointLight('#ffe2b8', 0, 20, 1.2);
    this.fill.position.set(ROOM.x, 2.9, ROOM.z);
    this.group.add(this.fill);
    const yard = game.world.village.yard;
    this.areas = {
      interior: { id: 'interior', cx: ROOM.x, cz: ROOM.z },
      yard: { id: 'yard', cx: yard.x, cz: yard.z, r: yard.r - 0.55 },
    };
    game.world.addPlatform(ROOM.x, ROOM.z, ROOM.w / 2 + 0.2, ROOM.d / 2 + 0.2, 0, 0);
    this.platform = game.world.platforms[game.world.platforms.length - 1];
    this.lightT = 0;
  }

  // --- Extérieur & agrandissements ---------------------------------------------

  get size() {
    return this.exterior.size || 0;
  }

  /** Applique le style extérieur (maison du village) et la taille de la pièce. */
  applyExterior() {
    this.game.world.village.setHomeStyle(this.exterior);
    const r = (HOME_SIZES[this.size] || HOME_SIZES[0]).room;
    if (r.w !== ROOM.w || r.d !== ROOM.d) {
      ROOM.w = r.w;
      ROOM.d = r.d;
      this.buildShell();
      // Les objets accrochés aux murs suivent les murs (et ce qui est posé sur les étagères).
      for (const p of this.placed) {
        const f = FURNITURE[p.id];
        if (!f.wall) continue;
        const on = f.top !== undefined ? this.itemsOn(p) : [];
        const [ox, oz] = [p.x, p.z];
        const inset = 0.1 + f.d / 2;
        if (p.wallName === 'back') p.z = -ROOM.d / 2 + inset;
        else if (p.wallName === 'left') p.x = -ROOM.w / 2 + inset;
        else if (p.wallName === 'right') p.x = ROOM.w / 2 - inset;
        p.obj.position.copy(this.worldPos(p));
        for (const it of on) {
          it.x += p.x - ox;
          it.z += p.z - oz;
          it.obj.position.copy(this.worldPos(it));
        }
      }
    }
  }

  setExterior(patch) {
    Object.assign(this.exterior, patch);
    this.applyExterior();
    this.game.requestSave();
  }

  toggleExtra(id) {
    const ex = new Set(this.exterior.extras);
    if (ex.has(id)) ex.delete(id);
    else ex.add(id);
    this.setExterior({ extras: [...ex] });
  }

  upgrade() {
    if (this.size >= HOME_SIZES.length - 1) return false;
    this.setExterior({ size: this.size + 1 });
    return true;
  }

  // --- Pièce ------------------------------------------------------------------

  buildRoom() {
    const { x, z } = ROOM;
    const g = new THREE.Group();
    this.room = g;
    this.group.add(g);
    // Pelouse autour de la maison (visible à travers les murs coupés).
    const lawn = new THREE.Mesh(new THREE.CircleGeometry(38, 48), toon('#9ad472'));
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(x, -0.32, z);
    lawn.receiveShadow = true;
    g.add(lawn);
    this.floorMat = shadedMaterial({ gradientMap: getGradientMap() });
    this.wallMat = shadedMaterial({ gradientMap: getGradientMap() });
    this.trimMat = toon('#fffaf2');
    this.baseMat = toon('#c9a27a');
    this.doorMat = toon('#9c6b4f');
    this.knobMat = toon('#ffd166');
    const skyTex = (() => {
      const c = document.createElement('canvas');
      c.width = 32;
      c.height = 64;
      const ctx = c.getContext('2d');
      const grd = ctx.createLinearGradient(0, 0, 0, 64);
      grd.addColorStop(0, '#8fd0f0');
      grd.addColorStop(0.7, '#dff4ff');
      grd.addColorStop(1, '#9ad472');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 32, 64);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    this.windowMat = new THREE.MeshBasicMaterial({ map: skyTex });
    this.buildShell();
  }

  /** Sol, murs et fenêtres de la pièce (reconstruits quand la maison s'agrandit). */
  buildShell() {
    const col = this.game.world.colliders;
    if (this.shell) {
      this.shell.removeFromParent();
      this.shell.traverse((o) => {
        if (o.isMesh) o.geometry.dispose();
      });
      for (const c of this.shellColliders) col.remove(c);
    }
    const { x, z, w, d, h } = ROOM;
    const g = new THREE.Group();
    this.shell = g;
    this.room.add(g);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.3, d + 0.4), [
      this.baseMat, this.baseMat, this.floorMat, this.baseMat, this.baseMat, this.baseMat,
    ]);
    floor.position.set(x, -0.15, z);
    floor.receiveShadow = true;
    g.add(floor);

    const trim = this.trimMat;
    const T = 0.2;
    const makeWall = (len, cx, cz, rotY, withDoor = false) => {
      const wall = new THREE.Group();
      wall.position.set(cx, 0, cz);
      wall.rotation.y = rotY;
      const full = new THREE.Group();
      const add = (mesh) => {
        mesh.receiveShadow = true;
        full.add(mesh);
      };
      if (withDoor) {
        const side = (len - 1.4) / 2;
        for (const sd of [-1, 1]) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(side, h, T), this.wallMat);
          m.position.set(sd * (0.7 + side / 2), h / 2, 0);
          add(m);
        }
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, h - 2.2, T), this.wallMat);
        top.position.set(0, 2.2 + (h - 2.2) / 2, 0);
        add(top);
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.1, 0.08), this.doorMat);
        door.position.set(0, 1.05, 0);
        add(door);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), this.knobMat);
        knob.position.set(0.4, 1.0, -0.08);
        add(knob);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.3, 0.12), trim);
        frame.position.set(0, 1.12, 0.02);
        full.add(frame);
      } else {
        const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, T), this.wallMat);
        m.position.set(0, h / 2, 0);
        add(m);
      }
      const base = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, T + 0.06), trim);
      base.position.set(0, 0.07, 0);
      full.add(base);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(len + T, 0.1, T + 0.1), trim);
      cap.position.set(0, h, 0);
      full.add(cap);
      wall.add(full);
      // Version basse, affichée quand le mur est « coupé » pour laisser voir la pièce.
      const low = new THREE.Mesh(new THREE.BoxGeometry(len, 0.35, T), this.wallMat);
      low.position.set(0, 0.175, 0);
      low.visible = false;
      wall.add(low);
      g.add(wall);
      return { wall, full, low, rotY };
    };
    this.walls = {
      back: { ...makeWall(w, x, z - d / 2, 0), n: [0, -1], plane: z - d / 2 },
      front: { ...makeWall(w, x, z + d / 2, Math.PI, true), n: [0, 1], plane: z + d / 2 },
      left: { ...makeWall(d, x - w / 2, z, Math.PI / 2), n: [-1, 0], plane: x - w / 2 },
      right: { ...makeWall(d, x + w / 2, z, -Math.PI / 2), n: [1, 0], plane: x + w / 2 },
    };
    // Fenêtres (vue sur le ciel) sur le mur du fond.
    this.windowXs = w <= 10 ? [-2.6, 2.6] : w <= 13 ? [-4.2, 0, 4.2] : [-5.6, -1.9, 1.9, 5.6];
    for (const wx of this.windowXs) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 0.1), trim);
      frame.position.set(wx, 1.7, 0.12);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.2, 0.1), this.windowMat);
      glass.position.set(wx, 1.7, 0.15);
      const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.12), trim);
      bar1.position.set(wx, 1.7, 0.18);
      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.12), trim);
      bar2.position.set(wx, 1.7, 0.18);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.3), trim);
      sill.position.set(wx, 0.98, 0.2);
      this.walls.back.full.add(frame, glass, bar1, bar2, sill);
    }
    // Murs : collisions.
    this.shellColliders = [
      col.addBox(x, z - d / 2 - 0.05, w / 2 + 0.2, 0.2, 0),
      col.addBox(x, z + d / 2 + 0.05, w / 2 + 0.2, 0.2, 0),
      col.addBox(x - w / 2 - 0.05, z, 0.2, d / 2 + 0.2, 0),
      col.addBox(x + w / 2 + 0.05, z, 0.2, d / 2 + 0.2, 0),
    ];
    if (this.platform) {
      this.platform.hw = w / 2 + 0.2;
      this.platform.hd = d / 2 + 0.2;
      this.game.world.platGrid = null;
    }
    this.applySurfaces();
  }

  applySurfaces() {
    const wp = WALLPAPERS.find((p) => p.id === this.wallId) || WALLPAPERS[0];
    const fl = FLOORS.find((p) => p.id === this.floorId) || FLOORS[0];
    this.wallMat.map?.dispose();
    this.floorMat.map?.dispose();
    this.wallMat.map = surfaceTexture(wp.draw, [ROOM.w / 2, 1.6]);
    this.floorMat.map = surfaceTexture(fl.draw, [ROOM.w / 2, ROOM.d / 2]);
    this.wallMat.needsUpdate = true;
    this.floorMat.needsUpdate = true;
  }

  setWall(id) {
    this.wallId = id;
    this.applySurfaces();
  }

  setFloor(id) {
    this.floorId = id;
    this.applySurfaces();
  }

  get entryPoint() {
    return { x: ROOM.x, z: ROOM.z + ROOM.d / 2 - 1.1 };
  }

  nearDoorInside(maxDist = 1.5) {
    const p = this.game.player.pos;
    const e = this.entryPoint;
    return this.inside && Math.hypot(p.x - e.x, p.z - (e.z + 0.3)) < maxDist;
  }

  // --- Meubles -------------------------------------------------------------------

  label(id) {
    return FURNITURE[id]?.label || id;
  }

  addToStorage(id, n = 1) {
    this.storage[id] = (this.storage[id] || 0) + n;
  }

  /** Objet 3D d'un meuble (couleur donnée). */
  buildObject(id, color, { ghost = false } = {}) {
    const f = FURNITURE[id];
    const obj = new THREE.Group();
    const mat = ghost
      ? shadedMaterial({ vertexColors: true, gradientMap: getGradientMap(), transparent: true, opacity: 0.72, emissive: '#39d98a', emissiveIntensity: 0.25 })
      : f.doubleSide
        ? addDecor(shadedMaterial({ vertexColors: true, gradientMap: getGradientMap(), side: THREE.DoubleSide }), { object: true })
        : vertexColorToon();
    const body = new THREE.Mesh(tagFurniture(id, withBevel(() => f.build(color)), color), mat);
    body.castShadow = !ghost;
    body.receiveShadow = true;
    if (!ghost && !f.rug) withOutline(body, 0.012);
    obj.add(body);
    obj.userData.body = body;
    if (f.glow) {
      const gm = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: !!f.transparentGlow || ghost, opacity: f.transparentGlow ? 0.45 : ghost ? 0.7 : 1 });
      const glow = new THREE.Mesh(f.glow(color), gm);
      obj.add(glow);
      obj.userData.glow = glow;
    }
    if (f.swing) {
      const sw = new THREE.Group();
      sw.position.y = 2.15;
      const seat = new THREE.Mesh(f.swing(color), mat);
      seat.castShadow = true;
      sw.add(seat);
      obj.add(sw);
      obj.userData.swing = sw;
    }
    if (f.anim === 'fish' && !ghost) {
      const fish = new THREE.Group();
      fish.position.y = 0.95;
      const cols = ['#ff8a3d', '#ffd84d', '#6fa8dc'];
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), toon(cols[i]));
        m.scale.set(1.6, 1, 0.6);
        m.userData.phase = i * 2.1;
        fish.add(m);
      }
      obj.add(fish);
      obj.userData.fish = fish;
    }
    obj.userData.mat = mat;
    return obj;
  }

  footprint(id, rotQ) {
    const f = FURNITURE[id];
    return rotQ % 2 === 0 ? [f.w, f.d] : [f.d, f.w];
  }

  /** Position monde d'un meuble posé. */
  worldPos(p) {
    const a = this.areas[p.area];
    const x = a.cx + p.x;
    const z = a.cz + p.z;
    const f = FURNITURE[p.id];
    // Posé sur un meuble : hauteur de son plateau (gardée telle quelle).
    if (p.y !== undefined) return new THREE.Vector3(x, p.y, z);
    let y = p.area === 'interior' ? 0 : this.game.world.heightAt(x, z);
    // Tapis du jardin : posé au plus haut du terrain dessous, pour ne pas s'enfoncer dans la pente.
    if (p.area === 'yard' && f.rug) {
      const [fw, fd] = this.footprint(p.id, p.rot);
      for (const [cx, cz] of [[-fw / 2, -fd / 2], [fw / 2, -fd / 2], [-fw / 2, fd / 2], [fw / 2, fd / 2]]) y = Math.max(y, this.game.world.heightAt(x + cx, z + cz));
    }
    if (f.wall) y = f.mountY;
    return new THREE.Vector3(x, y, z);
  }

  place(p) {
    const f = FURNITURE[p.id];
    p.uid = p.uid || uid++;
    const obj = this.buildObject(p.id, p.color);
    const pos = this.worldPos(p);
    obj.position.copy(pos);
    obj.rotation.y = f.wall ? p.wallRot : p.rot * (Math.PI / 2);
    this.group.add(obj);
    p.obj = obj;
    obj.userData.placed = p;
    if (!f.rug && !f.wall && p.y === undefined) {
      const [fw, fd] = this.footprint(p.id, p.rot);
      p.collider = this.game.world.colliders.addBox(pos.x, pos.z, fw / 2 - 0.05, fd / 2 - 0.05, 0);
    }
    // Dans le jardin : pas d'herbe à travers le meuble (ni le tapis).
    if (p.area === 'yard' && !f.wall && p.y === undefined) {
      const [fw, fd] = this.footprint(p.id, p.rot);
      p.cover = this.game.world.addCover({ x: pos.x, z: pos.z, hw: fw / 2, hd: fd / 2 }, { animals: false });
    }
    this.placed.push(p);
    this.lightT = 0;
    return p;
  }

  unplace(p) {
    p.obj.removeFromParent();
    p.obj.traverse((o) => {
      if (o.isMesh && o.name !== 'outline') o.geometry.dispose();
    });
    if (p.collider) this.game.world.colliders.remove(p.collider);
    if (p.cover) this.game.world.removeCover(p.cover);
    this.placed = this.placed.filter((x) => x !== p);
    this.lightT = 0;
  }

  /** Vérifie qu'un meuble peut aller là (dans la zone, sans chevaucher). */
  canPlace(id, area, x, z, rot, ignore = null, wallInfo = null) {
    const f = FURNITURE[id];
    if (area === 'interior' && f.where === 'out') return false;
    if (area === 'yard' && f.where === 'in') return false;
    if (f.wall) {
      if (area !== 'interior' || !wallInfo) return false;
      const half = f.w / 2;
      for (const p of this.placed) {
        if (p === ignore || !FURNITURE[p.id].wall || p.wallName !== wallInfo.name) continue;
        if (Math.abs(p.along - wallInfo.along) < half + FURNITURE[p.id].w / 2) return false;
      }
      const onWindow = wallInfo.name === 'back' && FURNITURE[id].mountY < 2.5 && this.windowXs.some((wx) => Math.abs(wallInfo.along - wx) < 0.75 + half);
      return Math.abs(wallInfo.along) + half <= wallInfo.len / 2 - 0.1 && !onWindow;
    }
    const [fw, fd] = this.footprint(id, rot);
    if (area === 'interior') {
      if (Math.abs(x) + fw / 2 > ROOM.w / 2 - 0.08 || Math.abs(z) + fd / 2 > ROOM.d / 2 - 0.08) return false;
      // Garder le passage devant la porte.
      if (!f.rug && Math.abs(x) < 0.8 + fw / 2 && z + fd / 2 > ROOM.d / 2 - 1.3) return false;
    } else {
      const a = this.areas.yard;
      for (const [cx, cz] of [[-fw / 2, -fd / 2], [fw / 2, -fd / 2], [-fw / 2, fd / 2], [fw / 2, fd / 2]]) {
        if (Math.hypot(x + cx, z + cz) > a.r) return false;
      }
      // Pas sur le potager ni sur la niche.
      const g = this.game.garden;
      if (g) {
        for (const pl of g.plots) {
          const px = pl.x - a.cx;
          const pz = pl.z - a.cz;
          if (Math.abs(px - x) < 0.7 + fw / 2 && Math.abs(pz - z) < 0.7 + fd / 2) return false;
        }
      }
      const dir = this.game.world.village.yard.dir;
      const dhx = dir.x * 2.6;
      const dhz = dir.z * 2.6;
      if (Math.abs(dhx - x) < 1.0 + fw / 2 && Math.abs(dhz - z) < 1.0 + fd / 2) return false;
    }
    for (const p of this.placed) {
      if (p === ignore || p.area !== area || FURNITURE[p.id].wall || p.y !== undefined) continue;
      const pf = FURNITURE[p.id];
      if (pf.rug !== f.rug) continue; // un tapis peut passer sous les meubles
      const [pw, pd] = this.footprint(p.id, p.rot);
      if (Math.abs(p.x - x) < (pw + fw) / 2 - 0.02 && Math.abs(p.z - z) < (pd + fd) / 2 - 0.02) return false;
    }
    return true;
  }

  // --- Déco superposable -------------------------------------------------------

  /** Plateau d'un meuble support : centre, demi-tailles (repère du monde) et hauteur. */
  supportBox(sp) {
    const f = FURNITURE[sp.id];
    const o = sp.obj;
    const turned = Math.abs(Math.sin(o.rotation.y)) > 0.5;
    return { x: o.position.x, z: o.position.z, hw: (turned ? f.d : f.w) / 2, hd: (turned ? f.w : f.d) / 2, top: o.position.y + f.top };
  }

  /** Objets posés sur ce meuble. */
  itemsOn(sp) {
    const b = this.supportBox(sp);
    return this.placed.filter((p) => p !== sp && p.y !== undefined && Math.abs(p.y - b.top) < 0.03 && Math.abs(p.obj.position.x - b.x) <= b.hw + 0.01 && Math.abs(p.obj.position.z - b.z) <= b.hd + 0.01);
  }

  /** Un petit objet peut-il aller sur ce meuble, centré en (wx, wz) (repère du monde) ? */
  canStack(id, area, wx, wz, rot, sp, ignore = null) {
    const f = FURNITURE[id];
    if (!f.small || FURNITURE[sp.id].top === undefined) return false;
    if ((area === 'interior' && f.where === 'out') || (area === 'yard' && f.where === 'in')) return false;
    const b = this.supportBox(sp);
    const [fw, fd] = this.footprint(id, rot);
    // Il peut dépasser un peu du bord, pas tomber.
    if (fw / 2 > b.hw + 0.08 || fd / 2 > b.hd + 0.08) return false;
    const mx = Math.min(b.hw, Math.max(0.03, fw * 0.2));
    const mz = Math.min(b.hd, Math.max(0.03, fd * 0.2));
    if (Math.abs(wx - b.x) > b.hw - mx + 1e-6 || Math.abs(wz - b.z) > b.hd - mz + 1e-6) return false;
    for (const p of this.itemsOn(sp)) {
      if (p === ignore) continue;
      const [pw, pd] = this.footprint(p.id, p.rot);
      if (Math.abs(p.obj.position.x - wx) < (pw + fw) * 0.4 && Math.abs(p.obj.position.z - wz) < (pd + fd) * 0.4) return false;
    }
    return true;
  }

  /** Sièges proches (meubles et bancs du village). */
  nearestSeat(maxDist = 1.1) {
    const pl = this.game.player.pos;
    let best = null;
    let bestD = maxDist;
    for (const p of this.placed) {
      const f = FURNITURE[p.id];
      if (!f.seats?.length) continue;
      const rot = p.rot * (Math.PI / 2);
      for (const [sx, sz, sy] of f.seats) {
        const c = Math.cos(rot);
        const s = Math.sin(rot);
        const wx = p.obj.position.x + sx * c + sz * s;
        const wz = p.obj.position.z - sx * s + sz * c;
        const d = Math.hypot(wx - pl.x, wz - pl.z);
        if (d < bestD) {
          bestD = d;
          best = { x: wx, z: wz, y: p.obj.position.y, seatY: sy, rot, placed: p };
        }
      }
    }
    for (const b of this.game.world.village.benches) {
      const d = Math.hypot(b.x - pl.x, b.z - pl.z);
      if (d < bestD) {
        bestD = d;
        best = { x: b.x, z: b.z, y: b.y - 0.5, seatY: 0.5, rot: b.rot };
      }
    }
    return best;
  }

  /** Meuble « utilisable » le plus proche (lit, cuisinière, musique). */
  nearestUsable(maxDist = 1.6) {
    const pl = this.game.player.pos;
    let best = null;
    let bestD = maxDist;
    for (const p of this.placed) {
      const f = FURNITURE[p.id];
      if (!f.bed && !f.stove && !f.music) continue;
      const [fw, fd] = this.footprint(p.id, p.rot);
      const o = p.obj.position;
      const dx = Math.max(Math.abs(pl.x - o.x) - fw / 2, 0);
      const dz = Math.max(Math.abs(pl.z - o.z) - fd / 2, 0);
      const d = Math.hypot(dx, dz);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  petBeds() {
    return this.placed.filter((p) => FURNITURE[p.id].petBed).map((p) => p.obj.position.clone().add(new THREE.Vector3(0, 0.2, 0)));
  }

  hasStove() {
    return this.placed.some((p) => FURNITURE[p.id].stove);
  }

  // --- Mise à jour -----------------------------------------------------------------

  update(dt, elapsed, camera) {
    const p = this.game.player.pos;
    this.inside = Math.hypot(p.x - ROOM.x, p.z - ROOM.z) < 20;
    this.fill.intensity = this.inside ? 5 + this.game.world.sky.nightFactor * 5 : 0;

    // Murs coupés côté caméra.
    if (this.inside || this.game.decorMode?.area === 'interior') {
      const c = camera.position;
      for (const w of Object.values(this.walls)) {
        const out = w.n[0] !== 0 ? (c.x - w.plane) * w.n[0] > -0.3 : (c.z - w.plane) * w.n[1] > -0.3;
        w.full.visible = !out;
        w.low.visible = out;
        for (const pl of this.placed) if (pl.wallName && this.walls[pl.wallName] === w) pl.obj.visible = !out;
      }
    }

    // Animations : feu, poissons, balançoire.
    for (const pl of this.placed) {
      const u = pl.obj.userData;
      if (u.fish) {
        u.fish.children.forEach((f, i) => {
          const t = elapsed * 0.6 + f.userData.phase;
          f.position.set(Math.sin(t) * 0.42, Math.sin(t * 1.7) * 0.12, Math.cos(t * 1.3) * 0.1);
          f.rotation.y = Math.cos(t) > 0 ? 0 : Math.PI;
        });
      }
      if (u.swing) u.swing.rotation.x = Math.sin(elapsed * 1.2) * (pl.occupied ? 0.35 : 0.06);
      if (FURNITURE[pl.id].anim === 'fire' && u.glow) u.glow.scale.y = 0.85 + Math.sin(elapsed * 12) * 0.08 + Math.sin(elapsed * 7.3) * 0.07;
    }

    // Lumières : on attribue les quelques lampes réelles aux meubles lumineux les plus proches.
    this.lightT -= dt;
    const night = this.game.world.sky.nightFactor;
    if (this.lightT <= 0) {
      this.lightT = 0.5;
      const lit = this.placed
        .filter((pl) => FURNITURE[pl.id].light)
        .map((pl) => ({ pl, d: pl.obj.position.distanceTo(p) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, MAX_LIGHTS);
      this.lights.forEach((l, i) => {
        const e = lit[i];
        l.userData.target = e ? e.pl : null;
        if (e) {
          const L = FURNITURE[e.pl.id].light;
          l.position.copy(e.pl.obj.position).add(new THREE.Vector3(0, L.y, 0));
          l.color.set(L.color);
          l.distance = L.dist;
          l.userData.base = L.intensity;
          l.userData.flicker = !!L.flicker;
          l.userData.night = !!L.night;
        }
      });
    }
    for (const l of this.lights) {
      const t = l.userData.target;
      if (!t) {
        l.intensity = 0;
        continue;
      }
      const k = l.userData.night ? night : 0.55 + night * 0.45;
      l.intensity = l.userData.base * k * (l.userData.flicker ? 0.85 + Math.sin(elapsed * 13) * 0.1 + Math.sin(elapsed * 5.3) * 0.08 : 1);
    }
    for (const pl of this.placed) {
      const gl = pl.obj.userData.glow;
      const L = FURNITURE[pl.id].light;
      if (gl && L?.night) gl.material.color.setScalar(0.5 + night * 0.7);
    }
  }

  // --- Sauvegarde ----------------------------------------------------------------

  serialize() {
    return {
      storage: this.storage,
      placed: this.placed.map((p) => ({ id: p.id, area: p.area, x: +p.x.toFixed(3), z: +p.z.toFixed(3), y: p.y === undefined ? undefined : +p.y.toFixed(3), rot: p.rot, color: p.color, wallName: p.wallName, along: p.along, wallRot: p.wallRot })),
      wall: this.wallId,
      floor: this.floorId,
      ownedWalls: [...this.ownedWalls],
      ownedFloors: [...this.ownedFloors],
      exterior: this.exterior,
      ownedStyles: [...this.ownedStyles],
    };
  }

  restore(d) {
    for (const p of [...this.placed]) this.unplace(p);
    if (d?.exterior) this.exterior = { ...DEFAULT_HOME, ...d.exterior };
    if (d?.ownedStyles) for (const k of d.ownedStyles) this.ownedStyles.add(k);
    this.applyExterior();
    if (!d) {
      this.defaultLayout();
      return;
    }
    this.storage = d.storage || {};
    for (const p of d.placed || []) if (FURNITURE[p.id]) this.place({ ...p });
    this.wallId = d.wall || 'creme';
    this.floorId = d.floor || 'parquet';
    this.ownedWalls = new Set(d.ownedWalls || ['creme']);
    this.ownedFloors = new Set(d.ownedFloors || ['parquet']);
    this.applySurfaces();
  }

  defaultLayout() {
    const items = [
      { id: 'lit', x: -3.8, z: -2.7, rot: 0, color: '#8fd6e8' },
      { id: 'tapis-rond', x: 0.5, z: 0.3, rot: 0, color: '#f7a8b8' },
      { id: 'table-ronde', x: 0.5, z: 0.3, rot: 0, color: '#fffaf2' },
      { id: 'chaise', x: 0.5, z: 1.25, rot: 2, color: '#f7a8b8' },
      { id: 'cuisiniere', x: 4.2, z: -3.3, rot: 0, color: '#8fd6e8' },
      { id: 'lampadaire', x: -2.3, z: -3.4, rot: 0, color: '#ffd84d' },
      { id: 'plante', x: 4.4, z: 3.2, rot: 0, color: '#e0a07a' },
    ];
    for (const it of items) this.place({ ...it, area: 'interior' });
    this.applySurfaces();
  }
}
