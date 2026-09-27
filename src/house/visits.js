import * as THREE from 'three';
import { toon, getGradientMap, shadedMaterial } from '../core/materials.js';
import { FURNITURE, WALLPAPERS, FLOORS, surfaceTexture } from './furniture.js';

// Visites chez les habitants : on frappe à leur porte (de 6 h à 22 h) et on entre dans
// leur maison, meublée à leur image. Une seule pièce, loin de l'île, redécorée à chaque visite.

export const VISIT = { x: 700, z: 600, w: 9, d: 7, h: 3.1 };

// Aménagement : [meuble, x, z, quart de tour, couleur?] ; murs : [meuble, x] sur le mur du fond.
const L = (wall, floor, items, walls = []) => ({ wall, floor, items, walls });
const LAYOUTS = {
  rose: L('fleuri', 'tomettes', [
    ['tapis-rond', 1.6, 0.2, 0], ['lit', -3.3, -2.3, 0, '#f7a8b8'], ['table-chevet', -2.2, -3.0, 0], ['cuisiniere', 3.9, -2.9, 0], ['plan-travail', 2.8, -3.0, 0],
    ['table-ronde', 1.6, 0.2, 0], ['chaise', 1.6, -0.8, 0], ['chaise', 1.6, 1.2, 2], ['rocking-chair', -3.3, 1.2, 1], ['plante-grande', 4.0, 2.8, 0],
    ['pot-fleurs', -4.0, 2.9, 0], ['lampadaire', -4.0, -0.3, 0],
  ], [['cadre-photo', -0.6], ['horloge-coucou', 1.0]]),
  pomme: L('vichy', 'parquet-clair', [
    ['tapis', -2.5, 0.2, 0], ['lit', 3.6, -2.2, 0, '#ffb27a'], ['commode', 1.9, -3.1, 0], ['caisse-fruits', -3.8, -3.1, 0], ['caisse-fruits', -2.8, -3.1, 0],
    ['table', -2.5, 0.2, 0], ['tabouret', -3.5, 0.2, 0], ['tabouret', -1.5, 0.2, 0], ['frigo', -4.0, -1.6, 1], ['plante', 4.0, 2.8, 0], ['panier', 3.5, 1.2, 0],
  ], [['horloge', 0.2]]),
  bruno: L('lambris', 'parquet', [
    ['tapis-tresse', -2.4, 0.2, 0], ['bureau', 2.3, -3.1, 0], ['chaise', 2.3, -2.4, 2], ['etagere-rondins', -0.6, -3.2, 0], ['cheminee', -3.9, -1.2, 1],
    ['fauteuil-plaid', -2.5, 0.0, 1], ['table-rondins', 1.9, 1.2, 0], ['lit', 3.8, 0.4, 0, '#8fb0d8'], ['lanterne-chalet', -4.0, 2.9, 0],
  ], [['tete-elan', -2.4], ['skis-deco', 3.4]]),
  lila: L('rose-rayures', 'moquette', [
    ['tapis-arcenciel', 0, 0, 0], ['lit-baldaquin', -3.2, -2.2, 0, '#c9a4ff'], ['coiffeuse', 0, -3.2, 0], ['miroir', 1.3, -3.3, 0], ['armoire', 3.6, -3.1, 0],
    ['canape-velours', 3.5, 1.2, 3, '#ff8fb1'], ['pouf', 2.2, 1.2, 0], ['peluche-geante', -3.8, 2.4, 0], ['lampe-lune', -4.0, 0.6, 0],
  ], [['guirlande-coeurs', 0]]),
  marin: L('lambris', 'parquet', [
    ['tapis', 2.2, 0.4, 0], ['lit', -3.4, -2.2, 0, '#6fa8dc'], ['coffre', -2.0, -3.1, 0], ['aquarium', 1.0, -3.1, 0], ['maquette-bateau', 3.2, -3.1, 0],
    ['fauteuil', 3.4, 0.4, 3], ['table-basse', 2.1, 0.4, 1], ['lanterne-marine', -4.0, 2.8, 0], ['coffre-pirate', -3.7, 0.6, 1],
  ], [['trophee-peche', -1.3], ['bouee', 3.0]]),
  noe: L('ciel-etoiles', 'moquette', [
    ['tapis-rond', -2.2, 0.9, 0], ['lit', -3.4, -2.2, 0, '#8fd6e8'], ['bureau', 1.5, -3.1, 0], ['chaise', 1.5, -2.4, 2], ['globe', 3.0, -3.1, 0],
    ['pile-livres', 3.9, -3.1, 0], ['pouf-poire', -3.0, 1.5, 0], ['lampe-champignon', -4.0, -0.4, 0], ['arbre-chat', 3.8, 2.6, 0],
  ], [['vitrine-papillons', 0.2], ['etoile-murale', -2.6]]),
  mimi: L('menthe-pois', 'damier', [
    ['tapis-rond', -1.8, 0.4, 0], ['arbre-chat', -3.8, -2.8, 0], ['lit-chat', -2.6, -3.0, 0], ['maison-chat', 3.7, -2.9, 0], ['griffoir', 2.5, -3.1, 0],
    ['lit', 3.8, -0.4, 0, '#ffd6e5'], ['table-bistrot', -1.8, 0.4, 0], ['tabouret', -2.7, 0.4, 0], ['statue-chat', -4.0, 2.6, 0], ['panier', -2.6, 2.3, 0], ['fontaine-chat', 4.0, 2.7, 0],
  ], [['tableau-chat', 0.4]]),
  leo: L('creme', 'damier', [
    ['tapis', 2.6, 0.6, 1], ['lit', -3.4, -2.2, 0, '#e5484d'], ['bureau', 1.0, -3.1, 0], ['tv-retro', 3.4, -3.1, 0], ['canape', 3.6, 0.6, 3, '#6fa8dc'],
    ['table-basse', 2.3, 0.6, 1], ['tourne-disque', -3.9, 0.4, 1], ['lampadaire', -4.0, 2.8, 0], ['trophee', -1.6, -3.1, 0],
  ], [['horloge', 3.4]]),
  aurele: L('lambris', 'parquet', [
    ['tapis-tresse', 2.2, 0.2, 0], ['lit-chalet', -3.4, -2.1, 0], ['poele', 2.8, -3.0, 0], ['fauteuil-plaid', 2.0, -0.4, 2], ['rocking-chair', 3.7, 0.9, 3],
    ['etagere-rondins', -0.8, -3.2, 0], ['lanterne-chalet', -4.0, 2.8, 0], ['plante', 4.0, 2.8, 0], ['bougies', -1.8, -3.2, 0],
  ], [['tableau-montagne', 1.0], ['skis-deco', -2.6]]),
  elise: L('vichy', 'tomettes', [
    ['cuisiniere', -3.8, -3.0, 0], ['plan-travail', -2.6, -3.0, 0], ['evier', -1.2, -3.0, 0], ['vaisselier', 1.4, -3.2, 0], ['lit', 3.8, -2.2, 0, '#fff1dc'],
    ['tapis-rond', 2.2, 0.5, 0], ['table-ronde', 2.2, 0.5, 0], ['chaise', 2.2, -0.4, 0], ['chaise', 2.2, 1.4, 2], ['gateau-etage', -2.8, 0.6, 0], ['pot-fleurs', -4.0, 2.8, 0],
  ], [['horloge', 1.4]]),
  hugo: L('lambris', 'parquet', [
    ['tapis-tresse', -2.0, -0.6, 0], ['lit-chalet', 3.6, -2.1, 0], ['poele', -3.8, -3.0, 0], ['banc-rondins', -2.0, -3.1, 0], ['table-rondins', -2.0, -1.6, 0],
    ['etagere-rondins', 0.8, -3.2, 0], ['luge', -3.9, 1.6, 0], ['fauteuil-plaid', 3.5, 1.4, 3], ['lanterne-chalet', 4.0, 2.9, 0],
  ], [['tete-elan', -2.0], ['skis-deco', 0.8]]),
  sacha: L('ciel-etoiles', 'moquette', [
    ['tapis-rond', -2.6, 1.0, 0], ['lit', 3.6, -2.2, 0, '#6fcf97'], ['bureau', -2.4, -3.1, 0], ['chaise', -2.4, -2.4, 2], ['globe', -0.8, -3.1, 0],
    ['pile-livres', 0.2, -3.1, 0], ['pouf-poire', -3.2, 1.2, 0], ['lampe-lune', -4.0, 2.8, 0], ['luge', 4.0, 1.8, 0],
  ], [['etoile-murale', 2.0], ['tableau-montagne', -2.4]]),
  neree: L('lambris', 'parquet', [
    ['tapis', 2.6, 0.6, 0], ['lit', -3.4, -2.2, 0, '#3d5a98'], ['coffre-pirate', -2.0, -3.0, 0], ['maquette-bateau', 0.8, -3.1, 0], ['lanterne-marine', 4.0, -3.1, 0],
    ['bureau', 2.6, -3.1, 0], ['fauteuil', 2.6, 0.9, 2], ['globe', 4.0, 2.7, 0], ['coffre', -3.8, 1.0, 1],
  ], [['barre-gouvernail', 2.6], ['bouee', -0.6]]),
  coralie: L('menthe-pois', 'nuage', [
    ['tapis-rond', 1.4, 0.6, 0], ['aquarium-geant', 1.5, -3.1, 0], ['bocal-poisson', 3.4, -3.1, 0], ['coquillage-geant', -3.6, 2.5, 0], ['lit', -3.4, -2.2, 0, '#8fe3e0'],
    ['bureau', 3.6, 0.4, 3], ['chaise', 2.8, 0.4, 1], ['planche-surf', -1.6, -3.2, 0], ['plante-grande', 4.0, 2.8, 0],
  ], [['tableau-lagon', 1.5]]),
  paco: L('menthe-pois', 'parquet-clair', [
    ['tapis', 1.0, 0.6, 0], ['bar-tiki', -2.5, -3.0, 0], ['tabouret', -3.1, -2.1, 0], ['tabouret', -1.9, -2.1, 0], ['bouee-licorne', 3.0, 1.6, 0],
    ['palmier-pot', 4.0, -3.0, 0], ['lit', 3.6, -1.5, 0, '#ffd84d'], ['planche-surf', -4.1, 1.0, 1], ['tourne-disque', 1.2, -3.1, 0],
  ], [['guirlande', 1.2]]),
  maelys: L('creme', 'parquet-clair', [
    ['tapis-arcenciel', 0.6, 0.2, 0], ['chevalet', 1.8, -1.8, 0], ['sculpture', -3.8, 2.6, 0], ['lit', -3.4, -2.2, 0, '#b69cf0'], ['table', 2.8, 1.4, 0],
    ['chaise', 2.8, 2.3, 2], ['tabouret', 1.8, -0.9, 0], ['pot-fleurs', 4.0, -3.0, 0], ['bibliotheque', 0.0, -3.3, 0],
  ], [['tableau-phare', -1.8], ['tableau-lagon', 2.2]]),
};

const GREETINGS = [
  'Oh, de la visite ! Entre, entre, fais comme chez toi !',
  'Quelle bonne surprise ! Tu veux quelque chose à boire ?',
  'Bienvenue chez moi ! Ne fais pas attention au désordre…',
  'Ah, c\'est toi ! Viens, je vais te montrer ma maison.',
];

export class Visits {
  constructor(game) {
    this.game = game;
    this.active = null;
    this.visitedDay = {};
    this.group = new THREE.Group();
    this.group.name = 'visits';
    this.group.visible = false;
    game.scene.add(this.group);
    this.furniture = new THREE.Group();
    this.group.add(this.furniture);
    this.colliders = [];
    this.buildShell();
  }

  buildShell() {
    const { x, z, w, d, h } = VISIT;
    const g = this.group;
    const col = this.game.world.colliders;
    const lawn = new THREE.Mesh(new THREE.CircleGeometry(30, 40), toon('#9ad472'));
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(x, -0.32, z);
    g.add(lawn);
    this.floorMat = shadedMaterial({ gradientMap: getGradientMap() });
    this.wallMat = shadedMaterial({ gradientMap: getGradientMap() });
    const trim = toon('#fffaf2');
    const base = toon('#c9a27a');
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.3, d + 0.4), [base, base, this.floorMat, base, base, base]);
    floor.position.set(x, -0.15, z);
    floor.receiveShadow = true;
    g.add(floor);
    const T = 0.2;
    const makeWall = (len, cx, cz, rotY, door) => {
      const wall = new THREE.Group();
      wall.position.set(cx, 0, cz);
      wall.rotation.y = rotY;
      const full = new THREE.Group();
      if (door) {
        const side = (len - 1.4) / 2;
        for (const sd of [-1, 1]) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(side, h, T), this.wallMat);
          m.position.set(sd * (0.7 + side / 2), h / 2, 0);
          full.add(m);
        }
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, h - 2.2, T), this.wallMat);
        top.position.set(0, 2.2 + (h - 2.2) / 2, 0);
        full.add(top);
        const dr = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.1, 0.08), toon('#9c6b4f'));
        dr.position.set(0, 1.05, 0);
        full.add(dr);
      } else {
        const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, T), this.wallMat);
        m.position.set(0, h / 2, 0);
        full.add(m);
      }
      const cap = new THREE.Mesh(new THREE.BoxGeometry(len + T, 0.1, T + 0.1), trim);
      cap.position.set(0, h, 0);
      full.add(cap);
      const skirting = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, T + 0.06), trim);
      skirting.position.set(0, 0.07, 0);
      full.add(skirting);
      full.traverse((o) => {
        if (o.isMesh) o.receiveShadow = true;
      });
      wall.add(full);
      const low = new THREE.Mesh(new THREE.BoxGeometry(len, 0.35, T), this.wallMat);
      low.position.set(0, 0.175, 0);
      low.visible = false;
      wall.add(low);
      g.add(wall);
      return { full, low };
    };
    this.walls = [
      { ...makeWall(w, x, z - d / 2, 0, false), n: [0, -1], plane: z - d / 2 },
      { ...makeWall(w, x, z + d / 2, Math.PI, true), n: [0, 1], plane: z + d / 2 },
      { ...makeWall(d, x - w / 2, z, Math.PI / 2, false), n: [-1, 0], plane: x - w / 2 },
      { ...makeWall(d, x + w / 2, z, -Math.PI / 2, false), n: [1, 0], plane: x + w / 2 },
    ];
    // Fenêtres sur le mur du fond.
    const sky = new THREE.MeshBasicMaterial({ color: '#bfe6fa' });
    for (const wx of [-2.2, 2.2]) {
      const fr = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.2, 0.1), trim);
      fr.position.set(wx, 1.9, 0.12);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.1), sky);
      gl.position.set(wx, 1.9, 0.15);
      this.walls[0].full.add(fr, gl);
    }
    this.skyMat = sky;
    col.addBox(x, z - d / 2 - 0.05, w / 2 + 0.2, 0.2, 0);
    col.addBox(x, z + d / 2 + 0.05, w / 2 + 0.2, 0.2, 0);
    col.addBox(x - w / 2 - 0.05, z, 0.2, d / 2 + 0.2, 0);
    col.addBox(x + w / 2 + 0.05, z, 0.2, d / 2 + 0.2, 0);
    this.game.world.addPlatform(x, z, w / 2 + 0.2, d / 2 + 0.2, 0, 0);
    this.fill = new THREE.PointLight('#ffe2b8', 0, 16, 1.2);
    this.fill.position.set(x, 2.7, z);
    g.add(this.fill);
  }

  get entryPoint() {
    return { x: VISIT.x, z: VISIT.z + VISIT.d / 2 - 1.1 };
  }

  /** Porte d'habitant la plus proche (dehors). */
  nearestDoor(max = 1.35) {
    const g = this.game;
    const p = g.player.pos;
    for (const v of g.villagers.list) {
      const hi = v.def.house;
      if (!hi || !LAYOUTS[v.def.id]) continue;
      const door = g.world.village.doorFront(hi, 1.0);
      if (Math.hypot(door.x - p.x, door.z - p.z) < max) return { v, door };
    }
    return null;
  }

  canVisit() {
    const h = this.game.world.sky.hour;
    return h >= 6 && h < 22;
  }

  nearExit(max = 1.5) {
    if (!this.active) return false;
    const p = this.game.player.pos;
    const e = this.entryPoint;
    return Math.hypot(p.x - e.x, p.z - (e.z + 0.3)) < max;
  }

  furnish(id) {
    for (const c of this.colliders) this.game.world.colliders.remove(c);
    this.colliders = [];
    for (const o of [...this.furniture.children]) {
      o.removeFromParent();
      o.traverse((m) => {
        if (m.isMesh && m.name !== 'outline') m.geometry.dispose();
      });
    }
    const lay = LAYOUTS[id];
    const wp = WALLPAPERS.find((p) => p.id === lay.wall) || WALLPAPERS[0];
    const fl = FLOORS.find((p) => p.id === lay.floor) || FLOORS[0];
    this.wallMat.map?.dispose();
    this.floorMat.map?.dispose();
    this.wallMat.map = surfaceTexture(wp.draw, [VISIT.w / 2, 1.6]);
    this.floorMat.map = surfaceTexture(fl.draw, [VISIT.w / 2, VISIT.d / 2]);
    this.wallMat.needsUpdate = true;
    this.floorMat.needsUpdate = true;
    const house = this.game.house;
    const col = this.game.world.colliders;
    this.lamps = [];
    for (const [fid, lx, lz, rot = 0, color] of lay.items) {
      const f = FURNITURE[fid];
      if (!f) continue;
      const obj = house.buildObject(fid, color || f.color);
      obj.position.set(VISIT.x + lx, 0, VISIT.z + lz);
      obj.rotation.y = rot * (Math.PI / 2);
      this.furniture.add(obj);
      if (!f.rug) {
        const [fw, fd] = rot % 2 === 0 ? [f.w, f.d] : [f.d, f.w];
        this.colliders.push(col.addBox(VISIT.x + lx, VISIT.z + lz, fw / 2 - 0.05, fd / 2 - 0.05, 0));
      }
      if (f.light) this.lamps.push(obj);
    }
    for (const [fid, lx] of lay.walls) {
      const f = FURNITURE[fid];
      if (!f) continue;
      const obj = house.buildObject(fid, f.color);
      obj.position.set(VISIT.x + lx, f.mountY || 1.7, VISIT.z - VISIT.d / 2 + 0.12 + f.d / 2);
      this.walls[0].full.add(obj);
      obj.position.sub(new THREE.Vector3(VISIT.x, 0, VISIT.z - VISIT.d / 2));
      this.furniture.userData.wallItems = [...(this.furniture.userData.wallItems || []), obj];
    }
  }

  clearWallItems() {
    for (const o of this.furniture.userData.wallItems || []) o.removeFromParent();
    this.furniture.userData.wallItems = [];
  }

  enter(v) {
    const g = this.game;
    if (!this.canVisit()) {
      g.ui.toast(`🌙 Chut… ${v.def.name} dort déjà. Reviens demain (de 6 h à 22 h) !`, 3500);
      return;
    }
    g.audio.play('bell');
    g.fade(() => {
      this.clearWallItems();
      this.furnish(v.def.id);
      this.active = v;
      this.group.visible = true;
      const e = this.entryPoint;
      g.player.teleport(e.x, e.z, Math.PI);
      for (const a of g.animals.followers()) a.teleport(e.x + (Math.random() - 0.5) * 2, e.z - 0.8);
      v.character.setSit(false);
      v.character.setFishing(false);
      v.override = { x: VISIT.x + 0.3, z: VISIT.z - 0.6, rot: 0 };
      g.cam.yaw = 0;
      g.cam.pitch = 0.75;
      g.cam.dist = 10;
      g.cam.snap = true;
      setTimeout(() => v.say(GREETINGS[Math.floor(Math.random() * GREETINGS.length)], 3200), 600);
      const day = g.world.sky.day;
      if (this.visitedDay[v.def.id] !== day) {
        this.visitedDay[v.def.id] = day;
        g.dialogue.addFriendship(v, 3);
      }
      g.emit('visit', { villager: v });
      g.tips.show('visite');
    }, 450);
  }

  exit() {
    const g = this.game;
    const v = this.active;
    if (!v) return;
    g.fade(() => {
      const d = g.world.village.doorFront(v.def.house, 1.7);
      g.player.teleport(d.x, d.z, d.rot);
      for (const a of g.animals.followers()) a.teleport(d.x + Math.sin(d.rot) * 1.2, d.z + Math.cos(d.rot) * 1.2);
      v.override = null;
      v.placeAt(v.scheduled(g.world.sky.hour));
      this.active = null;
      this.group.visible = false;
      g.cam.yaw = d.rot + Math.PI;
      g.cam.pitch = 0.36;
      g.cam.dist = 9;
      g.cam.snap = true;
    }, 400);
  }

  update(camera) {
    if (!this.active) {
      this.fill.intensity = 0;
      return;
    }
    const night = this.game.world.sky.nightFactor;
    this.fill.intensity = 6 + night * 5;
    this.skyMat.color.setRGB(0.75, 0.9, 0.98).lerp(new THREE.Color('#2b3566'), night);
    const c = camera.position;
    for (const w of this.walls) {
      const out = w.n[0] !== 0 ? (c.x - w.plane) * w.n[0] > -0.3 : (c.z - w.plane) * w.n[1] > -0.3;
      w.full.visible = !out;
      w.low.visible = out;
    }
    // L'habitant regarde le joueur.
    const v = this.active;
    const p = this.game.player.pos;
    if (v.override) v.override.rot = Math.atan2(p.x - v.override.x, p.z - v.override.z);
  }

  serialize() {
    return this.visitedDay;
  }

  restore(d) {
    this.visitedDay = d || {};
  }
}
