import * as THREE from 'three';
import { Shape, G, toon, vertexColorToon, addSeason, shadedMaterial } from '../core/materials.js';
import { createRng } from '../core/math.js';
import { ISLANDS, LANDMARKS } from './layout.js';
import { place, rotate2, signBoard, benchGeo, boatGeo, WOOD, WOOD_DARK, IRON, STONE } from './village.js';
import { SURF } from './decor.js';

// L'archipel : les deux ponts, Bourg-Sapin (chalets de montagne, source chaude,
// lac, belvédère) et Port-Corail (maisons colorées, port, pilotis, paillote).
// Chaque île a son propre groupe : on peut la masquer quand elle est loin.

// --- Chalets ------------------------------------------------------------------------

function chalet({ w = 5.6, d = 5.0, h = 3.2, wood = '#a8714a', roof = '#7a3b2e', shutter = '#c0584a', trim = '#f3e6d0', balcony = true }) {
  const s = new Shape();
  const glass = new Shape();
  const top = 0.9 + h;
  const stone = ['#b8b0a4', '#a39c92', '#c9c2b6'];
  s.add(G.box(w + 0.6, 0.9, d + 0.6), '#aaa398', { pos: [0, 0.45, 0], surf: SURF.stone });
  for (let i = 0; i < 18; i++) {
    const side = i % 4;
    const along = ((i * 0.37) % 1) - 0.5;
    const L = side < 2 ? w : d;
    const px = side < 2 ? along * L : (side === 2 ? 1 : -1) * (w / 2 + 0.31);
    const pz = side < 2 ? (side === 0 ? 1 : -1) * (d / 2 + 0.31) : along * L;
    s.add(G.box(side < 2 ? 0.55 : 0.08, 0.28, side < 2 ? 0.08 : 0.55), stone[i % 3], { pos: [px, 0.3 + (i % 3) * 0.22, pz], surf: SURF.stone });
  }
  // Murs en rondins : bandes et bouts de rondins aux angles.
  s.add(G.box(w, h, d), wood, { pos: [0, 0.9 + h / 2, 0], surf: SURF.planks });
  const dark = new THREE.Color(wood).multiplyScalar(0.78).getStyle();
  for (let y = 1.1; y < top - 0.1; y += 0.34) {
    s.add(G.box(w + 0.02, 0.05, d + 0.02), dark, { pos: [0, y, 0] });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.add(G.cyl(0.13, 0.13, 0.5, 7), '#c08a5c', { pos: [sx * (w / 2 + 0.05), y + 0.12, sz * (d / 2 + 0.05)], rot: [0, 0, Math.PI / 2] });
  }
  // Toit pentu, débord, neige.
  const rh = d * 0.62;
  const tri = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, rh)]);
  const gable = new THREE.ExtrudeGeometry(tri, { depth: w - 0.02, bevelEnabled: false });
  gable.rotateY(Math.PI / 2);
  s.add(gable, '#b8834f', { pos: [-(w - 0.02) / 2, top, 0], surf: SURF.planks });
  const a = Math.atan2(rh, d / 2);
  const L = Math.hypot(d / 2, rh) + 1.0;
  for (const side of [-1, 1]) {
    s.add(G.box(w + 1.5, 0.32, L), roof, { pos: [0, top + rh / 2 + 0.05, side * (d / 4 + 0.2)], rot: [side * a, 0, 0], surf: SURF.tiles });
    s.add(G.box(w + 1.55, 0.14, L * 0.62), '#f7fbff', { pos: [0, top + rh * 0.72 + 0.28, side * (d / 8 + 0.12)], rot: [side * a, 0, 0], surf: SURF.plain });
  }
  s.add(G.box(w + 1.6, 0.3, 0.5), '#f7fbff', { pos: [0, top + rh + 0.24, 0], surf: SURF.plain });
  // Pignon décoré : croix de bois et œil-de-bœuf.
  for (const sz of [-1, 1]) {
    s.add(G.box(0.12, rh * 0.9, 0.08), trim, { pos: [0, top + rh * 0.45, sz * (d / 2 - 0.02)] });
    s.add(G.torus(0.3, 0.06, 6, 14), trim, { pos: [w * 0, top + rh * 0.4, sz * (d / 2 + 0.02)], rot: [0, 0, 0] });
  }
  for (const sx of [-1, 1]) {
    s.add(G.box(0.08, rh * 0.9, 0.12), trim, { pos: [sx * (w / 2 + 0.02), top + rh * 0.35, 0] });
    s.add(G.torus(0.28, 0.05, 6, 14), trim, { pos: [sx * (w / 2 + 0.03), top + rh * 0.42, 0], rot: [0, Math.PI / 2, 0] });
    glass.add(G.cyl(0.24, 0.24, 0.04, 12), '#ffffff', { pos: [sx * (w / 2 + 0.04), top + rh * 0.42, 0], rot: [0, 0, Math.PI / 2] });
  }
  // Cheminée en pierre.
  s.add(G.box(0.8, 2.2, 0.8), '#a39c92', { pos: [w * 0.3, top + rh * 0.65, -d * 0.18], surf: SURF.stone });
  s.add(G.box(0.95, 0.18, 0.95), '#8f887e', { pos: [w * 0.3, top + rh * 0.65 + 1.15, -d * 0.18], surf: SURF.stone });
  s.add(G.box(0.96, 0.12, 0.96), '#f7fbff', { pos: [w * 0.3, top + rh * 0.65 + 1.28, -d * 0.18], surf: SURF.plain });
  const smoke = [w * 0.3, top + rh * 0.65 + 1.5, -d * 0.18];
  // Porte, fenêtres à volets, jardinières de géraniums.
  const fz = d / 2;
  s.add(G.box(1.4, 2.25, 0.1), trim, { pos: [0, 0.9 + 1.1, fz + 0.02] });
  s.add(G.box(1.1, 2.0, 0.14), '#7a4a32', { pos: [0, 0.9 + 1.0, fz + 0.05], surf: SURF.planks });
  for (const y of [1.3, 1.9, 2.5]) s.add(G.box(1.0, 0.05, 0.02), '#5e3826', { pos: [0, 0.9 + y - 0.35, fz + 0.13] });
  s.add(G.sphere(0.07, 8, 6), '#ffd166', { pos: [0.35, 0.9 + 0.95, fz + 0.15] });
  s.add(G.box(2.0, 0.3, 1.0), '#9a948c', { pos: [0, 0.75, fz + 0.75], surf: SURF.stone });
  const win = (x, y, z, rotY) => {
    const f = new Shape();
    f.add(G.box(1.05, 1.05, 0.1), trim, {});
    f.add(G.box(0.07, 0.95, 0.14), trim, { pos: [0, 0, 0.02] });
    f.add(G.box(0.95, 0.07, 0.14), trim, { pos: [0, 0, 0.02] });
    for (const sx of [-0.78, 0.78]) {
      f.add(G.box(0.42, 1.05, 0.08), shutter, { pos: [sx, 0, 0], surf: SURF.planks });
      f.add(G.sphere(0.07, 6, 4), '#fff3d6', { pos: [sx, 0.15, 0.05], scale: [1, 1.2, 0.3] });
    }
    f.add(G.box(1.2, 0.24, 0.36), WOOD_DARK, { pos: [0, -0.66, 0.18] });
    for (let i = 0; i < 5; i++) {
      f.add(G.sphere(0.12, 6, 5), '#4f9e4f', { pos: [-0.44 + i * 0.22, -0.52, 0.2] });
      f.add(G.sphere(0.07, 6, 4), i % 2 ? '#e5484d' : '#ff6f91', { pos: [-0.44 + i * 0.22, -0.42, 0.28] });
    }
    const g = f.build();
    g.rotateY(rotY);
    g.translate(x, y, z);
    s.addRaw(g);
    const gl = new Shape().add(G.box(0.88, 0.88, 0.05), '#ffffff', {}).build();
    gl.rotateY(rotY);
    gl.translate(x, y, z);
    glass.addRaw(gl);
  };
  const wy = 0.9 + h * 0.5;
  win(-w / 2 + 1.15, wy, fz + 0.04, 0);
  win(w / 2 - 1.15, wy, fz + 0.04, 0);
  win(w / 2 + 0.04, wy, 0, Math.PI / 2);
  win(-w / 2 - 0.04, wy, 0, -Math.PI / 2);
  // Balcon à l'étage (sous le pignon).
  if (balcony) {
    const by = top - 0.05;
    s.add(G.box(w - 0.6, 0.12, 1.0), '#8a5a3a', { pos: [0, by, fz + 0.5] });
    for (let i = 0; i <= 8; i++) s.add(G.box(0.08, 0.7, 0.08), trim, { pos: [-(w - 0.8) / 2 + (i * (w - 0.8)) / 8, by + 0.4, fz + 0.95] });
    s.add(G.box(w - 0.6, 0.08, 0.1), '#8a5a3a', { pos: [0, by + 0.78, fz + 0.95] });
    for (let i = 0; i < 6; i++) s.add(G.sphere(0.13, 6, 4), i % 2 ? '#e5484d' : '#ff8fab', { pos: [-(w - 1.4) / 2 + (i * (w - 1.4)) / 5, by + 0.86, fz + 0.95] });
    for (const sx of [-1, 1]) s.add(G.box(0.12, 0.9, 0.12), '#6b4a3a', { pos: [sx * (w / 2 - 0.4), by - 0.45, fz + 0.9] });
  }
  return { geo: s.build(), glass: glass.build(), w, d, smoke, top: top + rh + 0.6 };
}

// --- Maisons de Port-Corail -----------------------------------------------------------

function seaHouse({ w = 5.2, d = 4.6, h = 3.4, wall = '#8fd6e8', trim = '#ffffff', shutter = '#2f7fc1', roof = 'terrasse', awning = '#ff8fab' }) {
  const s = new Shape();
  const glass = new Shape();
  const top = 0.4 + h;
  s.add(G.box(w + 0.4, 0.4, d + 0.4), '#f3e3c8', { pos: [0, 0.2, 0], surf: SURF.stone });
  s.add(G.box(w, h, d), wall, { pos: [0, 0.4 + h / 2, 0], surf: SURF.plaster });
  s.add(G.box(w + 0.06, 0.35, d + 0.06), trim, { pos: [0, 0.55, 0] });
  if (roof === 'terrasse') {
    s.add(G.box(w + 0.2, 0.16, d + 0.2), trim, { pos: [0, top + 0.05, 0] });
    s.add(G.box(w + 0.2, 0.45, 0.12), wall, { pos: [0, top + 0.35, d / 2 + 0.04], surf: SURF.plaster });
    s.add(G.box(w + 0.2, 0.45, 0.12), wall, { pos: [0, top + 0.35, -d / 2 - 0.04], surf: SURF.plaster });
    for (const sx of [-1, 1]) s.add(G.box(0.12, 0.45, d + 0.2), wall, { pos: [sx * (w / 2 + 0.04), top + 0.35, 0], surf: SURF.plaster });
    s.add(G.box(w + 0.3, 0.08, d + 0.3), trim, { pos: [0, top + 0.6, 0] });
    // Parasol et pots sur la terrasse.
    s.add(G.cyl(0.03, 0.03, 1.6, 5), '#fffaf2', { pos: [w * 0.2, top + 0.9, -d * 0.1] });
    for (let i = 0; i < 6; i++) s.add(new THREE.ConeGeometry(1.0, 0.35, 6, 1, true, (i / 6) * Math.PI * 2, Math.PI / 3), i % 2 ? '#ffffff' : awning, { pos: [w * 0.2, top + 1.75, -d * 0.1] });
    for (const [px, pz] of [[-w / 2 + 0.5, d / 2 - 0.5], [-w / 2 + 0.5, -d / 2 + 0.5]]) {
      s.add(G.cyl(0.22, 0.17, 0.35, 8), '#d98a62', { pos: [px, top + 0.35, pz] });
      s.add(G.sphere(0.3, 7, 5), '#4f9e4f', { pos: [px, top + 0.65, pz] });
    }
  } else {
    // Toit de tuiles à quatre pans.
    const r = Math.hypot(w, d) / 2 + 0.55;
    const cone = new THREE.ConeGeometry(r, 1.6, 4, 1);
    cone.rotateY(Math.PI / 4);
    s.add(cone, '#d9784f', { pos: [0, top + 0.8, 0], scale: [(w + 0.9) / (r * Math.SQRT2), 1, (d + 0.9) / (r * Math.SQRT2)], surf: SURF.tiles });
    for (let i = 0; i < 4; i++) s.add(G.box(w + 0.95 - i * 0.5, 0.05, 0.05), '#b85f3c', { pos: [0, top + 0.2 + i * 0.35, d / 2 + 0.45 - i * 0.24] });
  }
  // Porte en arc, auvent, fenêtres à volets bleus.
  const fz = d / 2;
  s.add(G.box(1.3, 2.0, 0.1), trim, { pos: [0, 0.4 + 1.0, fz + 0.02] });
  s.add(new THREE.CylinderGeometry(0.65, 0.65, 0.1, 16, 1, false, -Math.PI / 2, Math.PI), trim, { pos: [0, 0.4 + 2.0, fz + 0.02], rot: [Math.PI / 2, 0, 0] });
  s.add(G.box(1.0, 1.9, 0.14), '#3f7fb8', { pos: [0, 0.4 + 0.95, fz + 0.05], surf: SURF.planks });
  s.add(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 16, 1, false, -Math.PI / 2, Math.PI), '#3f7fb8', { pos: [0, 0.4 + 1.9, fz + 0.05], rot: [Math.PI / 2, 0, 0] });
  s.add(G.sphere(0.06, 8, 6), '#ffd166', { pos: [0.3, 0.4 + 0.95, fz + 0.15] });
  for (let i = 0; i < 6; i++) {
    s.add(G.box(0.34, 0.05, 0.95), i % 2 ? '#ffffff' : awning, { pos: [-0.85 + i * 0.34, 0.4 + 2.55, fz + 0.45], rot: [0.35, 0, 0], surf: SURF.plain });
  }
  const win = (x, y, z, rotY) => {
    const f = new Shape();
    f.add(G.box(0.95, 1.1, 0.1), trim, {});
    for (const sx of [-0.7, 0.7]) {
      f.add(G.box(0.4, 1.1, 0.08), shutter, { pos: [sx, 0, 0], surf: SURF.wood });
      for (const yy of [-0.3, 0, 0.3]) f.add(G.box(0.34, 0.04, 0.1), new THREE.Color(shutter).multiplyScalar(0.8).getStyle(), { pos: [sx, yy, 0.01] });
    }
    f.add(G.box(1.0, 0.22, 0.34), '#d98a62', { pos: [0, -0.68, 0.16] });
    for (let i = 0; i < 4; i++) f.add(G.sphere(0.12, 6, 5), i % 2 ? '#ff5d73' : '#ffd84d', { pos: [-0.33 + i * 0.22, -0.5, 0.2] });
    const g = f.build();
    g.rotateY(rotY);
    g.translate(x, y, z);
    s.addRaw(g);
    const gl = new Shape().add(G.box(0.8, 0.95, 0.05), '#ffffff', {}).build();
    gl.rotateY(rotY);
    gl.translate(x, y, z);
    glass.addRaw(gl);
  };
  const wy = 0.4 + h * 0.58;
  win(-w / 2 + 1.05, wy, fz + 0.04, 0);
  win(w / 2 - 1.05, wy, fz + 0.04, 0);
  win(w / 2 + 0.04, wy, 0, Math.PI / 2);
  win(-w / 2 - 0.04, wy, 0, -Math.PI / 2);
  // Bougainvillier grimpant sur un angle.
  for (let y = 0.6; y < top; y += 0.3) {
    s.add(G.sphere(0.24, 6, 4), '#4f9e4f', { pos: [w / 2 - 0.1, y, fz + 0.1], scale: [1, 0.8, 0.6] });
    s.add(G.sphere(0.12, 6, 4), y % 0.6 < 0.3 ? '#e04f9c' : '#ff7fbf', { pos: [w / 2 - 0.2 + Math.sin(y * 7) * 0.15, y + 0.1, fz + 0.22] });
  }
  return { geo: s.build(), glass: glass.build(), w, d };
}

function stiltHut(color = '#ffd84d') {
  const s = new Shape();
  for (const sx of [-1.4, 1.4]) for (const sz of [-1.4, 1.4]) s.add(G.cyl(0.14, 0.16, 3.2, 7), WOOD_DARK, { pos: [sx, -0.5, sz] });
  s.add(G.box(3.8, 0.18, 3.8), WOOD, { pos: [0, 1.1, 0] });
  s.add(G.box(2.8, 2.0, 2.6), color, { pos: [0, 2.2, -0.3] });
  s.add(G.box(0.9, 1.5, 0.08), '#3f7fb8', { pos: [0, 1.95, 1.02] });
  s.add(new THREE.ConeGeometry(2.6, 1.8, 10), '#e8c77e', { pos: [0, 4.05, -0.3] });
  s.add(new THREE.ConeGeometry(2.62, 0.4, 10, 1, true), '#d9b264', { pos: [0, 3.3, -0.3] });
  for (let i = 0; i < 7; i++) s.add(G.box(0.08, 0.6, 0.08), WOOD_DARK, { pos: [-1.8 + i * 0.6, 1.5, 1.8] });
  s.add(G.box(3.7, 0.08, 0.1), WOOD_DARK, { pos: [0, 1.82, 1.8] });
  for (let i = 0; i < 5; i++) s.add(G.box(0.5, 0.06, 0.12), WOOD, { pos: [2.2, 0.9 - i * 0.35, 1.2], rot: [0, 0, 0] });
  s.add(G.torus(0.35, 0.08, 6, 14), '#e5484d', { pos: [1.3, 2.4, 0.95] });
  return s.build();
}

function paillote() {
  const s = new Shape();
  for (const sx of [-1.6, 1.6]) for (const sz of [-1.2, 1.2]) s.add(G.cyl(0.1, 0.12, 2.8, 7), '#a47a52', { pos: [sx, 1.4, sz] });
  s.add(new THREE.ConeGeometry(3.0, 1.5, 8), '#e8c77e', { pos: [0, 3.4, 0] });
  s.add(new THREE.ConeGeometry(3.05, 0.35, 8, 1, true), '#d9b264', { pos: [0, 2.75, 0] });
  s.add(G.box(3.4, 1.0, 0.7), '#c98b58', { pos: [0, 0.5, 0.8] });
  s.add(G.box(3.6, 0.1, 0.9), '#8a5a3a', { pos: [0, 1.05, 0.8] });
  for (let i = 0; i < 5; i++) s.add(G.cyl(0.06, 0.05, 0.22, 8), ['#ff8fab', '#ffd84d', '#8fd6e8', '#b5e48c', '#ffb27a'][i], { pos: [-1.2 + i * 0.6, 1.2, 0.75] });
  for (let i = 0; i < 4; i++) s.add(G.sphere(0.15, 8, 6), ['#e5484d', '#ffd84d', '#6fcf97', '#ff8a3d'][i], { pos: [-1.2 + i * 0.8, 2.55, -1.1] });
  for (const sx of [-1.1, 0, 1.1]) {
    s.add(G.cyl(0.22, 0.22, 0.06, 10), '#fffaf2', { pos: [sx, 0.75, 2.0] });
    s.add(G.cyl(0.04, 0.04, 0.72, 5), '#8a5a3a', { pos: [sx, 0.38, 2.0] });
  }
  return s.build();
}

// --- Décors remarquables -------------------------------------------------------------

/** Kiosque à musique octogonal, toit rayé et guirlande lumineuse. */
function bandstand() {
  const s = new Shape();
  const glow = new Shape();
  s.add(new THREE.CylinderGeometry(4.3, 4.5, 1.3, 8), '#ece2d2', { pos: [0, 0.0, 0], rot: [0, Math.PI / 8, 0] });
  s.add(new THREE.CylinderGeometry(4.45, 4.45, 0.1, 8), '#c9b89e', { pos: [0, 0.68, 0], rot: [0, Math.PI / 8, 0] });
  s.add(new THREE.CylinderGeometry(4.0, 4.0, 0.06, 8), '#c98b58', { pos: [0, 0.72, 0], rot: [0, Math.PI / 8, 0] });
  for (let i = 0; i < 3; i++) s.add(G.box(2.4, 0.24, 0.55), '#e2d6c2', { pos: [0, 0.12 + i * 0.22, 5.0 - i * 0.5] });
  const R = 3.75;
  const pillars = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.sin(a) * R;
    const z = Math.cos(a) * R;
    pillars.push([x, z]);
    s.add(G.cyl(0.13, 0.16, 3.2, 8), '#fffaf2', { pos: [x, 0.75 + 1.6, z] });
    s.add(G.cyl(0.22, 0.22, 0.14, 8), '#e5d8c4', { pos: [x, 0.82, z] });
  }
  // Rambardes (ouvertes vers l'avant, côté +Z).
  for (let i = 0; i < 8; i++) {
    const [x0, z0] = pillars[i];
    const [x1, z1] = pillars[(i + 1) % 8];
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    if (mz > 3) continue;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const rot = Math.atan2(x1 - x0, z1 - z0);
    s.add(G.box(0.1, 0.1, len), '#fffaf2', { pos: [mx, 1.75, mz], rot: [0, rot, 0] });
    s.add(G.box(0.08, 0.08, len), '#fffaf2', { pos: [mx, 1.05, mz], rot: [0, rot, 0] });
    for (let k = 1; k < 6; k++) {
      const t = k / 6;
      s.add(G.cyl(0.035, 0.035, 0.7, 5), '#fffaf2', { pos: [x0 + (x1 - x0) * t, 1.4, z0 + (z1 - z0) * t] });
    }
  }
  // Toit rayé rose et crème, festons, fleuron.
  for (let k = 0; k < 8; k++) s.add(new THREE.ConeGeometry(4.9, 2.2, 8, 1, true, (k / 8) * Math.PI * 2 + Math.PI / 8, Math.PI / 4), k % 2 ? '#fffaf2' : '#ff8fab', { pos: [0, 5.05, 0] });
  s.add(new THREE.CircleGeometry(4.85, 8).rotateX(Math.PI / 2), '#f3e6d0', { pos: [0, 3.95, 0], rot: [0, Math.PI / 8, 0] });
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    s.add(G.sphere(0.32, 8, 6), k % 2 ? '#ff8fab' : '#fffaf2', { pos: [Math.sin(a) * 4.55, 3.85, Math.cos(a) * 4.55], scale: [1, 0.55, 0.6] });
    glow.add(G.sphere(0.09, 6, 5), '#ffffff', { pos: [Math.sin(a + 0.13) * 4.3, 3.62, Math.cos(a + 0.13) * 4.3] });
  }
  s.add(G.sphere(0.3, 10, 8), '#ffd84d', { pos: [0, 6.25, 0] });
  s.add(G.cyl(0.03, 0.03, 1.1, 4), IRON, { pos: [0, 6.8, 0] });
  s.add(G.box(0.02, 0.35, 0.6), '#e5484d', { pos: [0, 7.1, 0.3] });
  // Pupitres et chaises de musiciens.
  for (const [x, z, r] of [[-1.4, -1.2, 0.5], [1.4, -1.2, -0.5], [0, -2.2, 0]]) {
    s.add(G.cyl(0.03, 0.03, 1.0, 4), IRON, { pos: [x, 1.25, z] });
    s.add(G.box(0.55, 0.4, 0.04), '#4e4c62', { pos: [x, 1.8, z], rot: [-0.4, r, 0] });
  }
  return { geo: s.build(), glow: glow.build(), pillars };
}

/** Arche fleurie à l'entrée d'un pont. */
function flowerArch(width = 4.4) {
  const s = new Shape();
  const r = width / 2;
  for (const sx of [-1, 1]) {
    s.add(G.box(0.22, 2.6, 0.22), '#fffaf2', { pos: [sx * r, 1.3, 0] });
    s.add(G.box(0.36, 0.3, 0.36), '#e5d8c4', { pos: [sx * r, 0.15, 0] });
  }
  s.add(new THREE.TorusGeometry(r, 0.12, 6, 24, Math.PI), '#fffaf2', { pos: [0, 2.6, 0] });
  const cols = ['#ff8fab', '#ffd84d', '#ffffff', '#c58cff', '#ff6f7d', '#8fd6e8'];
  for (let i = 0; i <= 30; i++) {
    const a = (i / 30) * Math.PI;
    const x = Math.cos(a) * r;
    const y = 2.6 + Math.sin(a) * r;
    s.add(G.sphere(0.22, 6, 5), i % 3 === 0 ? '#6fcf97' : '#8fd66a', { pos: [x, y, 0.05], scale: [1, 1, 0.8] });
    if (i % 2 === 0) s.add(G.sphere(0.16, 7, 6), cols[i % cols.length], { pos: [x * 1.02, y + 0.05, 0.2] });
  }
  for (const sx of [-1, 1]) {
    for (let y = 0.5; y < 2.6; y += 0.35) {
      s.add(G.sphere(0.2, 6, 5), '#6fcf97', { pos: [sx * r + (y % 0.7 > 0.35 ? 0.1 : -0.1), y, 0.12] });
      s.add(G.sphere(0.13, 6, 5), cols[Math.floor(y * 3) % cols.length], { pos: [sx * r, y + 0.1, 0.25] });
    }
  }
  return s.build();
}

/** Gloriette blanche au toit turquoise. */
function gazebo() {
  const s = new Shape();
  s.add(new THREE.CylinderGeometry(3.0, 3.2, 0.9, 12), '#f3ece0', { pos: [0, 0.0, 0] });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    s.add(G.cyl(0.11, 0.13, 2.8, 8), '#ffffff', { pos: [Math.sin(a) * 2.6, 0.45 + 1.4, Math.cos(a) * 2.6] });
  }
  s.add(new THREE.SphereGeometry(3.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#5fc8c0', { pos: [0, 3.2, 0], scale: [1, 0.55, 1] });
  s.add(new THREE.CylinderGeometry(3.15, 3.15, 0.25, 16), '#ffffff', { pos: [0, 3.2, 0] });
  s.add(G.sphere(0.25, 8, 6), '#ffd84d', { pos: [0, 5.0, 0] });
  // Banc circulaire.
  s.add(new THREE.TorusGeometry(1.9, 0.18, 6, 20, Math.PI * 1.4), '#c98b58', { pos: [0, 0.95, 0], rot: [Math.PI / 2, 0, Math.PI * 0.8] });
  return s.build();
}

/** Baleine à bosse, en trois morceaux (corps, nageoires, queue) pour l'animer. */
export function whaleModel() {
  const root = new THREE.Group();
  const body = new Shape();
  const blue = '#3d5a98';
  const belly = '#dfe8f5';
  body.add(G.sphere(1, 20, 14), blue, { pos: [0, 0, 0], scale: [2.1, 1.7, 5.6] });
  body.add(G.sphere(1, 16, 10), belly, { pos: [0, -0.55, 0.6], scale: [1.8, 1.25, 4.6] });
  for (let i = 0; i < 7; i++) body.add(G.box(0.12, 0.05, 3.2), '#c5d2ea', { pos: [-0.9 + i * 0.3, -1.45, 1.6], rot: [0.15, 0, 0] });
  for (const sx of [-1, 1]) {
    body.add(G.sphere(0.18, 10, 8), '#ffffff', { pos: [sx * 1.45, 0.45, 3.3] });
    body.add(G.sphere(0.1, 8, 6), '#1f2a44', { pos: [sx * 1.55, 0.47, 3.38] });
    for (let k = 0; k < 4; k++) body.add(G.sphere(0.13, 6, 5), '#8da3cf', { pos: [sx * (0.5 + k * 0.25), 1.35 - k * 0.08, 3.6 - k * 0.5] });
  }
  body.add(G.sphere(1, 10, 8), blue, { pos: [0, 1.5, -2.4], scale: [0.25, 0.6, 0.9], rot: [-0.5, 0, 0] });
  const mat = vertexColorToon();
  const bodyMesh = new THREE.Mesh(body.build(), mat);
  root.add(bodyMesh);
  const fins = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 1.8, -0.6, 1.8);
    const f = new Shape().add(G.sphere(1, 12, 8), blue, { pos: [sx * 1.6, 0, -0.4], scale: [1.8, 0.18, 0.6], rot: [0, sx * 0.4, sx * -0.3] });
    pivot.add(new THREE.Mesh(f.build(), mat));
    root.add(pivot);
    fins.push({ pivot, sx });
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.2, -5.2);
  const t = new Shape();
  t.add(G.sphere(1, 12, 8), blue, { pos: [0, 0, -1.2], scale: [0.7, 0.6, 1.6] });
  for (const sx of [-1, 1]) t.add(G.sphere(1, 12, 8), blue, { pos: [sx * 1.3, 0.1, -2.6], scale: [1.6, 0.16, 0.8], rot: [0, sx * -0.5, 0] });
  tail.add(new THREE.Mesh(t.build(), mat));
  root.add(tail);
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { root, fins, tail };
}

// --- Petits éléments --------------------------------------------------------------------

function lanternPost() {
  const s = new Shape();
  const glow = new Shape();
  s.add(G.cyl(0.08, 0.1, 2.6, 6), WOOD_DARK, { pos: [0, 1.3, 0] });
  s.add(G.box(0.6, 0.08, 0.08), WOOD_DARK, { pos: [0.25, 2.55, 0] });
  s.add(G.cyl(0.015, 0.015, 0.25, 4), IRON, { pos: [0.48, 2.42, 0] });
  s.add(G.box(0.26, 0.05, 0.26), IRON, { pos: [0.48, 2.28, 0] });
  s.add(G.cone(0.2, 0.18, 4), IRON, { pos: [0.48, 2.05, 0], rot: [0, Math.PI / 4, 0] });
  glow.add(G.box(0.18, 0.26, 0.18), '#ffffff', { pos: [0.48, 1.84, 0] });
  s.add(G.box(0.24, 0.04, 0.24), IRON, { pos: [0.48, 1.7, 0] });
  return { geo: s.build(), glow: glow.build() };
}

function woodpile() {
  const s = new Shape();
  for (let r = 0; r < 3; r++) for (let i = 0; i < 5 - r; i++) {
    s.add(G.cyl(0.16, 0.16, 1.4, 8), i % 2 ? '#a8714a' : '#b98457', { pos: [-0.66 + i * 0.33 + r * 0.16, 0.16 + r * 0.29, 0], rot: [Math.PI / 2, 0, 0] });
    s.add(G.cyl(0.13, 0.13, 1.42, 8), '#e8c9a0', { pos: [-0.66 + i * 0.33 + r * 0.16, 0.16 + r * 0.29, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1.001, 1] });
  }
  return s.build();
}

function bigFirWithLights() {
  const s = new Shape();
  const glow = new Shape();
  s.add(G.cyl(0.35, 0.5, 2.4, 8), '#7a5038', { pos: [0, 1.2, 0] });
  const tiers = [[3.6, 3.6, 3.4], [2.9, 3.2, 5.6], [2.2, 2.8, 7.6], [1.4, 2.4, 9.4]];
  for (const [r, h, y] of tiers) s.add(G.cone(r, h, 12), (g) => {
    const c = new THREE.Color('#2f7650');
    const pos = g.attributes.position;
    const arr = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getY(i) + h / 2) / h;
      c.set('#2f7650').lerp(new THREE.Color('#6fb07f'), t);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  }, { pos: [0, y, 0] });
  const cols = ['#ffd84d', '#ff8fab', '#8fd6e8', '#fff3c4'];
  let k = 0;
  for (const [r, h, y] of tiers) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + y;
      const rr = r * 0.78;
      glow.add(G.sphere(0.12, 6, 5), cols[k++ % cols.length], { pos: [Math.cos(a) * rr, y - h * 0.28, Math.sin(a) * rr] });
    }
  }
  const st = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.2 : 0.5;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) st.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else st.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  glow.add(new THREE.ExtrudeGeometry(st, { depth: 0.12, bevelEnabled: false }), '#ffe27a', { pos: [0, 11.0, -0.06] });
  return { geo: s.build(), glow: glow.build() };
}

function wellGeo() {
  const s = new Shape();
  const stones = ['#b8b0a4', '#cfc4b3', '#a8a095'];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + r * 0.26;
    s.add(G.box(0.4, 0.24, 0.24), stones[(i + r) % 3], { pos: [Math.cos(a) * 0.7, 0.12 + r * 0.24, Math.sin(a) * 0.7], rot: [0, -a, 0] });
  }
  s.add(G.cyl(0.58, 0.58, 0.05, 16), '#3a6a8a', { pos: [0, 0.55, 0] });
  for (const x of [-0.75, 0.75]) s.add(G.box(0.12, 1.7, 0.12), WOOD_DARK, { pos: [x, 1.2, 0] });
  s.add(G.cyl(0.06, 0.06, 1.6, 8), WOOD, { pos: [0, 1.7, 0], rot: [0, 0, Math.PI / 2] });
  for (const side of [-1, 1]) {
    s.add(G.box(1.1, 0.07, 1.3), '#7a3b2e', { pos: [side * 0.4, 2.25, 0], rot: [0, 0, -side * 0.6] });
    s.add(G.box(1.12, 0.05, 1.32), '#f7fbff', { pos: [side * 0.38, 2.3, 0], rot: [0, 0, -side * 0.6], scale: [0.7, 1, 1] });
  }
  s.add(G.cyl(0.14, 0.12, 0.2, 10), '#b8c0cc', { pos: [0, 1.25, 0] });
  return s.build();
}

function dolphinFountain() {
  const s = new Shape();
  s.add(G.cyl(2.2, 2.4, 0.6, 22), '#f3e3c8', { pos: [0, 0.3, 0] });
  s.add(G.torus(2.2, 0.2, 8, 28), '#ffffff', { pos: [0, 0.62, 0], rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    s.add(G.box(0.5, 0.05, 0.3), i % 2 ? '#3fa7c9' : '#ffffff', { pos: [Math.cos(a) * 2.35, 0.45, Math.sin(a) * 2.35], rot: [0, -a, 0] });
  }
  s.add(G.cyl(0.35, 0.5, 1.2, 12), '#f3e3c8', { pos: [0, 1.0, 0] });
  // Dauphin.
  s.add(G.sphere(0.45, 12, 10), '#7fb8e6', { pos: [0, 2.05, 0], scale: [0.55, 1.4, 0.55], rot: [0, 0, 0.35] });
  s.add(G.cone(0.14, 0.4, 8), '#7fb8e6', { pos: [-0.28, 2.75, 0], rot: [0, 0, 0.6] });
  s.add(G.box(0.08, 0.35, 0.5), '#7fb8e6', { pos: [0.28, 1.45, 0], rot: [0, 0, 0.35] });
  s.add(G.cone(0.1, 0.28, 6), '#7fb8e6', { pos: [0.12, 2.15, 0.25], rot: [0.4, 0, 0] });
  s.add(G.sphere(0.04, 6, 5), '#2e2e3a', { pos: [-0.1, 2.5, 0.2] });
  const water = new Shape();
  water.add(G.cyl(2.05, 2.05, 0.05, 22), '#8fe3f0', { pos: [0, 0.55, 0] });
  return { geo: s.build(), water: water.build() };
}

function hotSpringGeo(r) {
  const s = new Shape();
  const stones = ['#8f887e', '#a39c92', '#b8b0a4'];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    s.add(G.dodeca(0.55), stones[i % 3], { pos: [Math.cos(a) * r, 0.15, Math.sin(a) * r], scale: [1.1, 0.7, 1] });
  }
  // Cabane de bain, lanternes, étendoir à serviettes.
  const hx = r + 3.5;
  s.add(G.box(3.2, 2.4, 2.6), '#b98457', { pos: [hx, 1.2, 0] });
  s.add(G.box(3.8, 0.2, 3.2), '#7a3b2e', { pos: [hx, 2.55, 0.35], rot: [0.25, 0, 0] });
  s.add(G.box(3.8, 0.12, 2.2), '#f7fbff', { pos: [hx, 2.68, 0.1], rot: [0.25, 0, 0] });
  s.add(G.box(1.0, 1.8, 0.1), '#e8c9a0', { pos: [hx - 0.4, 0.9, 1.32] });
  s.add(G.box(0.9, 0.35, 0.05), '#fff3d6', { pos: [hx + 0.8, 1.9, 1.33] });
  for (let i = 0; i < 3; i++) s.add(G.box(0.5, 0.7, 0.04), ['#ff8fab', '#8fd6e8', '#ffffff'][i], { pos: [-r - 1.2 + i * 0.55, 1.0, -r - 0.5] });
  for (const x of [-r - 1.5, -r + 0.3]) s.add(G.cyl(0.04, 0.04, 1.5, 5), WOOD_DARK, { pos: [x, 0.75, -r - 0.5] });
  s.add(G.cyl(0.03, 0.03, 1.9, 5), WOOD_DARK, { pos: [-r - 0.6, 1.45, -r - 0.5], rot: [0, 0, Math.PI / 2] });
  return s.build();
}

function telescopeGeo() {
  const s = new Shape();
  s.add(G.box(3.4, 0.18, 3.0), WOOD, { pos: [0, 0.09, 0] });
  for (const [x, z] of [[-1.6, -1.4], [1.6, -1.4], [-1.6, 1.4], [1.6, 1.4]]) s.add(G.box(0.12, 1.0, 0.12), WOOD_DARK, { pos: [x, 0.6, z] });
  s.add(G.box(3.3, 0.08, 0.1), WOOD_DARK, { pos: [0, 1.05, -1.4] });
  s.add(G.box(0.1, 0.08, 2.9), WOOD_DARK, { pos: [-1.6, 1.05, 0] });
  s.add(G.box(0.1, 0.08, 2.9), WOOD_DARK, { pos: [1.6, 1.05, 0] });
  for (const a of [0, 2.1, 4.2]) s.add(G.cyl(0.03, 0.03, 1.2, 5), '#4e4c62', { pos: [Math.cos(a) * 0.25, 0.65, Math.sin(a) * 0.25], rot: [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3] });
  s.add(G.cyl(0.1, 0.16, 1.3, 12), '#c9a0ff', { pos: [0, 1.45, 0.2], rot: [-0.9, 0, 0] });
  s.add(G.cyl(0.17, 0.17, 0.1, 12), '#ffd84d', { pos: [0, 1.85, 0.72], rot: [-0.9, 0, 0] });
  return s.build();
}

function harborExtras() {
  const s = new Shape();
  // Caisses, tonneaux, filets.
  for (let i = 0; i < 3; i++) s.add(G.box(0.8, 0.7, 0.8), i % 2 ? WOOD : '#c98b58', { pos: [i * 0.9, 0.35, 0], rot: [0, i * 0.3, 0] });
  s.add(G.box(0.7, 0.6, 0.7), WOOD, { pos: [0.45, 1.0, 0.1], rot: [0, 0.2, 0] });
  for (let i = 0; i < 2; i++) s.add(G.cyl(0.38, 0.38, 0.9, 10), '#8f6243', { pos: [-1.2, 0.45, i * 0.9 - 0.4] });
  s.add(G.torus(0.6, 0.08, 6, 16), '#f2e3c0', { pos: [2.6, 0.08, 0.3], rot: [Math.PI / 2, 0, 0] });
  s.add(G.sphere(0.45, 8, 6), '#f2e3c0', { pos: [2.6, 0.2, 0.3], scale: [1, 0.3, 1] });
  return s.build();
}

// --- Construction de l'archipel ----------------------------------------------------------

export class IslandVillages {
  constructor(world) {
    this.world = world;
    this.village = world.village;
    this.groups = {};
    this.shapes = {};
    this.boats = [];
    this.smokes = [];
    this.lights = [];
    this.windowMat = this.village.windowMat;
    this.glowMat = this.village.glowMat;
    this.staticMat = this.village.staticMat;
    this.village.centers = { main: { x: 0, z: 0, ring: 6.8 } };
    this.village.benchesBy = { main: [...this.village.benches] };
    this.travelPoints = [];
    for (const id of ['pins', 'corail', 'bridges']) {
      this.shapes[id] = { static: new Shape(), glass: new Shape(), glow: new Shape() };
    }
    // Sur l'île principale, les voyages partent du poteau indicateur de la place.
    this.travelPoints.push({ id: 'main', name: 'Place du Village', emoji: '🏡', x: -8.5, z: 11.3 });
    this.buildBridges();
    this.buildBandstand();
    this.buildBourg();
    this.buildPort();
    this.buildGazebo();
    for (const [id, sh] of Object.entries(this.shapes)) {
      const g = new THREE.Group();
      g.name = `island-${id}`;
      g.userData.island = ISLANDS[id] || null;
      const stat = new THREE.Mesh(sh.static.build(), this.staticMat);
      stat.castShadow = true;
      stat.receiveShadow = true;
      g.add(stat);
      if (!sh.glass.empty) g.add(new THREE.Mesh(sh.glass.build(), this.windowMat));
      if (!sh.glow.empty) g.add(new THREE.Mesh(sh.glow.build(), this.glowMat));
      this.groups[id] = g;
      world.scene.add(g);
    }
    for (const b of this.boats) this.groups.corail.add(b.mesh);
    for (const x of this.extraMeshes || []) this.groups[x.island].add(x.mesh);
  }

  h(x, z) {
    return this.world.heightAt(x, z);
  }

  /** Décors des fêtes de l'archipel. */
  setFestival(id, firDone = false) {
    this.festivalId = id;
    this.setFirLit(firDone || id === 'hiver');
    if (id === 'lanternes' && !this.lanterns) this.buildLanterns();
    if (id === 'port' && !this.sailboats) this.buildSailboats();
    if (this.lanterns) this.lanterns.visible = id === 'lanternes';
    if (this.sailboats) this.sailboats.visible = id === 'port';
  }

  /** Lanternes flottantes sur le Lac Miroir. */
  buildLanterns() {
    const L = LANDMARKS.lake;
    const body = new Shape();
    body.add(G.box(0.36, 0.3, 0.36), '#e8663d', { pos: [0, 0.15, 0] });
    body.add(G.box(0.46, 0.05, 0.46), '#8a5a3a', { pos: [0, 0.02, 0] });
    const glow = new Shape().add(G.box(0.28, 0.32, 0.28), '#ffffff', { pos: [0, 0.16, 0] });
    const n = 36;
    const bm = new THREE.InstancedMesh(body.build(), vertexColorToon(), n);
    const gm = new THREE.InstancedMesh(glow.build(), this.glowMat, n);
    bm.frustumCulled = false;
    gm.frustumCulled = false;
    const rng = createRng(4242);
    this.lanternData = [];
    for (let i = 0; i < n; i++) this.lanternData.push({ a: rng.range(0, Math.PI * 2), r: rng.range(1.5, L.r - 2.5), s: rng.range(0.02, 0.06) * (rng() < 0.5 ? -1 : 1), p: rng.range(0, 6) });
    this.lanterns = new THREE.Group();
    this.lanterns.add(bm, gm);
    this.lanterns.userData = { bm, gm, L };
    this.groups.pins.add(this.lanterns);
  }

  /** Voiliers de la Fête du Port, qui tournent dans la baie. */
  buildSailboats() {
    const Pt = LANDMARKS.port;
    const a = (246 * Math.PI) / 180;
    const cx = Pt.x + Math.cos(a) * 58;
    const cz = Pt.z + Math.sin(a) * 58;
    this.sailboats = new THREE.Group();
    this.sailboats.userData.center = { x: cx, z: cz };
    const cols = ['#ff8fab', '#ffd84d', '#8fd6e8', '#b5e48c', '#c9a4ff'];
    cols.forEach((col, i) => {
      const s = new Shape();
      s.addRaw(boatGeo());
      s.add(G.cyl(0.05, 0.06, 3.2, 6), WOOD_DARK, { pos: [0, 1.9, 0.1] });
      const tri = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1.5, 0), new THREE.Vector2(0, 2.6)]);
      s.add(new THREE.ExtrudeGeometry(tri, { depth: 0.04, bevelEnabled: false }).rotateY(-Math.PI / 2), col, { pos: [0, 0.6, 0.15] });
      s.add(G.box(0.02, 0.35, 0.5), col, { pos: [0, 3.4, 0.35] });
      const m = new THREE.Mesh(s.build(), vertexColorToon());
      m.castShadow = true;
      m.userData = { a: (i / cols.length) * Math.PI * 2, r: 9 + (i % 3) * 4, sp: 0.08 + (i % 2) * 0.03, p: i * 1.3 };
      this.sailboats.add(m);
    });
    this.groups.corail.add(this.sailboats);
  }

  setFirLit(on) {
    if (!this.firOn) return;
    this.firOn.visible = on;
    this.firOff.visible = !on;
  }

  add(id, geo, x, y, z, rot = 0, scale = 1) {
    this.shapes[id].static.addRaw(place(geo, x, y, z, rot, scale));
  }

  addGlow(id, geo, x, y, z, rot = 0) {
    this.shapes[id].glow.addRaw(place(geo, x, y, z, rot));
  }

  addGlass(id, geo, x, y, z, rot = 0) {
    this.shapes[id].glass.addRaw(place(geo, x, y, z, rot));
  }

  sign(id, text, x, y, z, rot, w = 2.2, colors = ['#fff1dc', '#6b4a2e']) {
    const b = signBoard(text, w, 0.5, colors[0], colors[1]);
    b.position.set(x, y, z);
    b.rotation.y = rot;
    (this.extraMeshes ||= []).push({ island: id, mesh: b });
    return b;
  }

  // --- Ponts ---------------------------------------------------------------------------

  buildBridges() {
    for (const I of Object.values(ISLANDS)) {
      const len = Math.hypot(I.x, I.z);
      const dx = I.x / len;
      const dz = I.z / len;
      let a = 60;
      while (this.h(dx * a, dz * a) > 0.6) a += 0.25;
      let b = len - 30;
      while (this.h(dx * b, dz * b) > 0.6) b -= 0.25;
      a -= 1.5;
      b += 1.5;
      this.buildBridge({ x: dx * a, z: dz * a }, { x: dx * b, z: dz * b }, I.id === 'pins' ? '#a8714a' : '#c9935f');
      // Arche fleurie côté village, sur la terre ferme.
      const ax = dx * (a - 2.2);
      const az = dz * (a - 2.2);
      const rot = Math.atan2(dx, dz);
      this.add('bridges', flowerArch(4.4), ax, this.h(ax, az), az, rot);
      for (const sd of [-1, 1]) this.world.colliders.addCircle(ax + Math.cos(rot) * sd * 2.2, az - Math.sin(rot) * sd * 2.2, 0.25);
      this.world.reserve(ax, az, 3);
    }
  }

  buildBridge(A, B, wood) {
    const s = this.shapes.bridges.static;
    const glow = this.shapes.bridges.glow;
    const ha = this.h(A.x, A.z);
    const hb = this.h(B.x, B.z);
    const len = Math.hypot(B.x - A.x, B.z - A.z);
    const rot = Math.atan2(B.x - A.x, B.z - A.z);
    const segs = Math.ceil(len / 2.2);
    this.world.reserve(A.x, A.z, 3.5);
    this.world.reserve(B.x, B.z, 3.5);
    const arch = 1.4 + len * 0.03;
    const yAt = (t) => ha + (hb - ha) * t + Math.sin(Math.PI * t) * arch;
    const fx = Math.sin(rot);
    const fz = Math.cos(rot);
    const rx = fz;
    const rz = -fx;
    const col = this.world.colliders;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      const tm = (t0 + t1) / 2;
      const y0 = yAt(t0);
      const y1 = yAt(t1);
      const ym = yAt(tm);
      const seg = len / segs;
      const cx = A.x + fx * len * tm;
      const cz = A.z + fz * len * tm;
      const pitch = Math.atan2(y1 - y0, seg);
      const deck = new Shape();
      for (let k = 0; k < 4; k++) deck.add(G.box(3.3, 0.14, seg / 4 - 0.04), (i * 4 + k) % 3 === 0 ? '#d9a86c' : wood, { pos: [0, -0.07, -seg / 2 + seg / 8 + (k * seg) / 4] });
      for (const sd of [-1, 1]) {
        deck.add(G.box(0.12, 0.12, seg + 0.02), WOOD_DARK, { pos: [sd * 1.7, 0.95, 0] });
        deck.add(G.box(0.1, 0.9, 0.1), WOOD_DARK, { pos: [sd * 1.7, 0.45, -seg / 2] });
        deck.add(G.box(0.14, 0.2, seg), WOOD_DARK, { pos: [sd * 1.62, -0.12, 0] });
      }
      const dg = deck.build();
      dg.rotateX(-pitch);
      dg.rotateY(rot);
      dg.translate(cx, ym, cz);
      s.addRaw(dg);
      this.world.addPlatform(cx, cz, 1.62, seg / 2 + 0.06, rot, ym);
      for (const sd of [-1, 1]) col.addBox(cx + rx * sd * 1.75, cz + rz * sd * 1.75, 0.12, seg / 2 + 0.05, rot);
      // Piliers dans l'eau et lanternes.
      if (i % 2 === 0) {
        for (const sd of [-1, 1]) {
          const px = cx + rx * sd * 1.6;
          const pz = cz + rz * sd * 1.6;
          const floor = this.h(px, pz);
          if (floor < ym - 0.5) s.addRaw(place(new Shape().add(G.cyl(0.18, 0.22, ym - floor, 7), WOOD_DARK, { pos: [0, (ym - floor) / 2 - 0.1, 0] }).build(), px, floor, pz));
        }
      }
      if (i % 5 === 2) {
        for (const sd of [-1, 1]) {
          const px = cx + rx * sd * 1.72;
          const pz = cz + rz * sd * 1.72;
          s.addRaw(place(new Shape().add(G.cyl(0.05, 0.06, 1.7, 6), WOOD_DARK, { pos: [0, 0.85, 0] }).add(G.cone(0.2, 0.2, 4), IRON, { pos: [0, 2.0, 0], rot: [0, Math.PI / 4, 0] }).build(), px, ym, pz));
          glow.addRaw(place(new Shape().add(G.box(0.2, 0.26, 0.2), '#ffffff', { pos: [0, 1.8, 0] }).build(), px, ym, pz));
        }
      }
    }
  }

  // --- Kiosque à musique (Prairie aux Fleurs) -------------------------------------------

  buildBandstand() {
    const x = 38;
    const z = 21;
    const rot = Math.atan2(22 - x, 5 - z) + 0.35; // entrée tournée vers le chemin
    const y = this.h(x, z) - 0.05;
    const b = bandstand();
    this.add('bridges', b.geo, x, y, z, rot);
    this.addGlow('bridges', b.glow, x, y, z, rot);
    this.world.reserve(x, z, 7);
    const deck = y + 0.75;
    this.world.addPlatform(x, z, 3.1, 3.1, rot, deck);
    for (let i = 1; i <= 3; i++) {
      const o = rotate2(0, 5.0 - (i - 1) * 0.5, rot);
      this.world.addPlatform(x + o[0], z + o[1], 1.15, 0.26, rot, y + 0.24 + (i - 1) * 0.22);
    }
    for (const [px, pz] of b.pillars) {
      const o = rotate2(px, pz, rot);
      this.world.colliders.addCircle(x + o[0], z + o[1], 0.2);
    }
    this.bandstand = { x, z, y: deck, rot };
    this.sign('bridges', 'Kiosque à musique', x + rotate2(2.2, 5.6, rot)[0], y + 1.6, z + rotate2(2.2, 5.6, rot)[1], rot, 2.4, ['#fff1f5', '#c0406a']);
  }

  // --- Gloriette de la Colline aux Mouettes ---------------------------------------------

  buildGazebo() {
    const L = LANDMARKS.lookout;
    const x = L.x + 2;
    const z = L.z - 1;
    const y = this.h(x, z) - 0.1;
    this.add('corail', gazebo(), x, y, z, 0.4);
    this.world.reserve(x, z, 5);
    this.world.addPlatform(x, z, 2.2, 2.2, 0.4, y + 0.45);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      this.world.colliders.addCircle(x + Math.sin(a) * 2.6, z + Math.cos(a) * 2.6, 0.18);
    }
    this.gazebo = { x, z, y: y + 0.45 };
  }

  // --- Bourg-Sapin ---------------------------------------------------------------------

  buildBourg() {
    const id = 'pins';
    const B = LANDMARKS.bourg;
    const y0 = this.h(B.x, B.z);
    this.village.centers.pins = { x: B.x, z: B.z, ring: 7 };
    this.world.reserve(B.x, B.z, 13);
    // Grand sapin illuminé au centre de la place.
    const fir = bigFirWithLights();
    this.add(id, fir.geo, B.x, y0 - 0.05, B.z);
    // Guirlandes : éteintes jusqu'à la Nuit des Veilleurs (chapitre 9).
    const bulbs = place(fir.glow, B.x, y0 - 0.05, B.z);
    this.firOn = new THREE.Mesh(bulbs, this.glowMat);
    this.firOff = new THREE.Mesh(bulbs, toon('#6d7a70'));
    (this.extraMeshes ||= []).push({ island: id, mesh: this.firOn }, { island: id, mesh: this.firOff });
    this.setFirLit(false);
    this.world.colliders.addCircle(B.x, B.z, 1.4);
    this.world.addCamBlocker({ x: B.x, z: B.z, r: 1.2, top: y0 + 11 });
    // Anneau de pavés et bancs.
    const ring = new Shape();
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      ring.add(G.box(0.9, 0.12, 0.45), i % 2 ? '#c9c2b6' : '#b8b0a4', { pos: [Math.cos(a) * 3.4, 0.03, Math.sin(a) * 3.4], rot: [0, -a, 0] });
    }
    this.add(id, ring.build(), B.x, y0, B.z);
    const benches = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = B.x + Math.cos(a) * 5.4;
      const z = B.z + Math.sin(a) * 5.4;
      const rot = Math.atan2(B.x - x, B.z - z);
      this.add(id, benchGeo(), x, y0, z, rot);
      this.world.colliders.addBox(x, z, 1.15, 0.45, rot);
      for (const off of [-0.5, 0.5]) {
        const o = rotate2(off, 0.05, rot);
        benches.push({ x: x + o[0], z: z + o[1], rot, y: y0 + 0.5 });
      }
    }
    this.village.benchesBy.pins = benches;
    this.village.benches.push(...benches);
    // Chalets.
    const palettes = [
      { wood: '#a8714a', roof: '#7a3b2e', shutter: '#c0584a' },
      { wood: '#b98457', roof: '#5a6b8c', shutter: '#6fa8dc' },
      { wood: '#9a6a4a', roof: '#4f7a5a', shutter: '#e5a93a' },
      { wood: '#b07a52', roof: '#8a4a5a', shutter: '#6fcf97' },
      { wood: '#a0704c', roof: '#6b4a3a', shutter: '#ff8fab' },
      { wood: '#b98a60', roof: '#3d5a78', shutter: '#e5484d' },
    ];
    const angles = [5, 80, 130, 203, 264, 325];
    angles.forEach((deg, i) => {
      const a = (deg * Math.PI) / 180;
      const r = deg === 325 ? 18 : 19;
      const x = B.x + Math.cos(a) * r;
      const z = B.z + Math.sin(a) * r;
      const rot = Math.atan2(B.x - x, B.z - z);
      const y = this.h(x, z) - 0.2;
      const c = chalet({ ...palettes[i], w: i === 0 ? 6.4 : 5.6, d: 5.0, balcony: i !== 3 });
      this.add(id, c.geo, x, y, z, rot);
      this.addGlass(id, c.glass, x, y, z, rot);
      this.world.colliders.addBox(x, z, c.w / 2 + 0.4, c.d / 2 + 0.4, rot);
      this.world.addCamBlocker({ x, z, hw: c.w / 2 + 0.9, hd: c.d / 2 + 0.9, rot, top: y + c.top });
      this.world.reserve(x, z, 7);
      const sm = rotate2(c.smoke[0], c.smoke[2], rot);
      this.smokes.push({ x: x + sm[0], y: y + c.smoke[1], z: z + sm[1], t: Math.random() * 3 });
      this.village.houses.push({ x, z, rot, d: c.d + 0.8, w: c.w, player: false, id: `pins-${i}`, village: 'pins' });
    });
    // Lanternes autour de la place.
    const lp = lanternPost();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = B.x + Math.cos(a) * 10.5;
      const z = B.z + Math.sin(a) * 10.5;
      const rot = -a;
      this.add(id, lp.geo, x, y0, z, rot);
      this.addGlow(id, lp.glow, x, y0, z, rot);
      this.world.colliders.addCircle(x, z, 0.2);
    }
    // Puits, tas de bois, luge.
    const wx = B.x + 7.5;
    const wz = B.z - 5.5;
    this.add(id, wellGeo(), wx, this.h(wx, wz), wz, 0.4);
    this.world.colliders.addCircle(wx, wz, 1.0);
    this.world.reserve(wx, wz, 2);
    for (const [ox, oz, r] of [[-9, 4, 0.5], [6, 8, -0.3], [-4, -9, 1.2]]) {
      const x = B.x + ox;
      const z = B.z + oz;
      this.add(id, woodpile(), x, this.h(x, z), z, r);
      this.world.colliders.addBox(x, z, 0.9, 0.4, r);
      this.world.reserve(x, z, 1.6);
    }
    // Boutiques : pâtisserie d'Élise, atelier de Hugo.
    this.shop(id, 'patisserie', 'Pâtisserie', 1, pastryStand(), '#fff1dc', '#c0584a');
    this.shop(id, 'atelier', 'Atelier du bois', 2, woodStand(), '#fff1dc', '#6b4a2e');
    // Panneau de voyage.
    this.travelSign(id, 'pins', 'Bourg-Sapin', '🏔️', B.x - 6.5, B.z + 7.5);
    // Source chaude.
    const S = LANDMARKS.hotspring;
    const sy = this.h(S.x, S.z);
    this.add(id, hotSpringGeo(S.r), S.x, sy, S.z, 0.3);
    this.world.reserve(S.x, S.z, S.r + 3.5);
    this.world.colliders.addBox(S.x + Math.cos(0.3) * (S.r + 3.5), S.z - Math.sin(0.3) * (S.r + 3.5), 1.7, 1.4, 0.3);
    const spring = new THREE.Mesh(new THREE.CircleGeometry(S.r - 0.2, 32), shadedMaterial({ color: '#8fe3e0', emissive: '#4fb8c9', emissiveIntensity: 0.35, transparent: true, opacity: 0.88 }));
    spring.rotation.x = -Math.PI / 2;
    spring.position.set(S.x, sy + 0.25, S.z);
    (this.extraMeshes ||= []).push({ island: id, mesh: spring });
    this.spring = { x: S.x, z: S.z, y: sy + 0.25, r: S.r - 0.6 };
    for (let i = 0; i < 6; i++) this.smokes.push({ x: S.x + (Math.random() - 0.5) * S.r, y: sy + 0.4, z: S.z + (Math.random() - 0.5) * S.r, t: Math.random() * 3, steam: true });
    this.sign(id, 'Source Chaude', S.x - (S.r + 1.5), sy + 2.1, S.z + 1.5, Math.PI / 2, 2.0);
    // Ponton du lac.
    const L = LANDMARKS.lake;
    this.dock(id, L.x + 13.5, L.z, -1, 0, 'lac', 'le Lac Miroir');
    // Belvédère et longue-vue près du sommet.
    const P = LANDMARKS.peak;
    const bx = P.x + 13;
    const bz = P.z + 10;
    const by = this.h(bx, bz);
    this.add(id, telescopeGeo(), bx, by, bz, -0.8);
    this.world.reserve(bx, bz, 3.2);
    this.world.addPlatform(bx, bz, 1.7, 1.5, -0.8, by + 0.18);
    this.telescope = { x: bx, z: bz, y: by };
    this.sign(id, 'Belvédère', bx + 2, by + 1.8, bz + 1.5, -0.8, 1.6);
  }

  // --- Port-Corail --------------------------------------------------------------------

  buildPort() {
    const id = 'corail';
    const Pt = LANDMARKS.port;
    const y0 = this.h(Pt.x, Pt.z);
    this.village.centers.corail = { x: Pt.x, z: Pt.z, ring: 7.5 };
    this.world.reserve(Pt.x, Pt.z, 13);
    const f = dolphinFountain();
    this.add(id, f.geo, Pt.x, y0, Pt.z);
    const water = new THREE.Mesh(place(f.water, Pt.x, y0, Pt.z), toon('#8fe3f0', { emissive: '#4fb8d0', emissiveIntensity: 0.3 }));
    (this.extraMeshes ||= []).push({ island: id, mesh: water });
    this.world.colliders.addCircle(Pt.x, Pt.z, 2.5);
    // Palmiers en pots et bancs.
    const benches = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Pt.x + Math.cos(a) * 6;
      const z = Pt.z + Math.sin(a) * 6;
      const rot = Math.atan2(Pt.x - x, Pt.z - z);
      this.add(id, benchGeo(), x, y0, z, rot);
      this.world.colliders.addBox(x, z, 1.15, 0.45, rot);
      for (const off of [-0.5, 0.5]) {
        const o = rotate2(off, 0.05, rot);
        benches.push({ x: x + o[0], z: z + o[1], rot, y: y0 + 0.5 });
      }
      const px = Pt.x + Math.cos(a + Math.PI / 4) * 8.5;
      const pz = Pt.z + Math.sin(a + Math.PI / 4) * 8.5;
      const pot = new Shape().add(G.cyl(0.6, 0.5, 0.7, 10), '#d98a62', { pos: [0, 0.35, 0], surf: SURF.plaster }).add(G.torus(0.6, 0.06, 5, 14), '#fff3d6', { pos: [0, 0.7, 0], rot: [Math.PI / 2, 0, 0] });
      this.add(id, pot.build(), px, y0, pz);
      this.world.colliders.addCircle(px, pz, 0.7);
      (this.pots ||= []).push([px, y0 + 0.6, pz]);
    }
    this.village.benchesBy.corail = benches;
    this.village.benches.push(...benches);
    // Maisons colorées.
    const palettes = [
      { wall: '#8fd6e8', shutter: '#2f7fc1', awning: '#ff8fab', roof: 'terrasse' },
      { wall: '#ffb3a0', shutter: '#3f9a7a', awning: '#ffd84d', roof: 'tuiles' },
      { wall: '#fff0a8', shutter: '#2f7fc1', awning: '#ff7f91', roof: 'terrasse' },
      { wall: '#c9b3ff', shutter: '#ffd84d', awning: '#8fd6e8', roof: 'tuiles' },
      { wall: '#b5e8c9', shutter: '#e5484d', awning: '#ffb27a', roof: 'terrasse' },
      { wall: '#ffc9e0', shutter: '#3f7fb8', awning: '#6fcf97', roof: 'tuiles' },
    ];
    const angles = [90, 125, 160, 280, 315, 350];
    const lights = [];
    angles.forEach((deg, i) => {
      const a = (deg * Math.PI) / 180;
      const x = Pt.x + Math.cos(a) * 19;
      const z = Pt.z + Math.sin(a) * 19;
      const rot = Math.atan2(Pt.x - x, Pt.z - z);
      const y = this.h(x, z) - 0.15;
      const c = seaHouse({ ...palettes[i], w: i === 0 ? 5.8 : 5.2 });
      this.add(id, c.geo, x, y, z, rot);
      this.addGlass(id, c.glass, x, y, z, rot);
      this.world.colliders.addBox(x, z, c.w / 2 + 0.3, c.d / 2 + 0.3, rot);
      this.world.addCamBlocker({ x, z, hw: c.w / 2 + 0.7, hd: c.d / 2 + 0.7, rot, top: y + 6.5 });
      this.world.reserve(x, z, 6.5);
      this.village.houses.push({ x, z, rot, d: c.d, w: c.w, player: false, id: `corail-${i}`, village: 'corail' });
      const f2 = rotate2(0, c.d / 2 + 0.3, rot);
      lights.push([x + f2[0], y + 3.2, z + f2[1]]);
    });
    // Guirlandes lumineuses entre les maisons voisines.
    const glow = this.shapes[id].glow;
    const wire = this.shapes[id].static;
    for (let i = 0; i < lights.length - 1; i++) {
      if (i === 2) continue;
      const [ax, ay, az] = lights[i];
      const [bx, by, bz] = lights[i + 1];
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        const x = ax + (bx - ax) * t;
        const z = az + (bz - az) * t;
        const y = ay + (by - ay) * t - Math.sin(Math.PI * t) * 1.2;
        if (k > 0 && k < 10) glow.add(G.sphere(0.1, 6, 5), ['#ffd84d', '#ff8fab', '#8fd6e8'][k % 3], { pos: [x, y - 0.1, z] });
        if (k < 10) {
          const t2 = (k + 1) / 10;
          const x2 = ax + (bx - ax) * t2;
          const z2 = az + (bz - az) * t2;
          const y2 = ay + (by - ay) * t2 - Math.sin(Math.PI * t2) * 1.2;
          const len = Math.hypot(x2 - x, y2 - y, z2 - z);
          const g = G.cyl(0.015, 0.015, len, 4);
          g.rotateX(Math.PI / 2);
          g.lookAt(new THREE.Vector3(x2 - x, y2 - y, z2 - z));
          g.translate((x + x2) / 2, (y + y2) / 2, (z + z2) / 2);
          wire.add(g, '#4e4c62');
        }
      }
    }
    // Boutiques.
    this.shop(id, 'capitainerie', 'Capitainerie', 3, fishStand(), '#e8f3ff', '#2f5f8a');
    this.shop(id, 'galerie', 'Galerie', 4, easelStand(), '#fff6e8', '#8a4a9a');
    this.shop(id, 'plongee', 'Plongée', 5, diveStand(), '#e2f7ef', '#2f7f6a');
    this.travelSign(id, 'corail', 'Port-Corail', '⚓', Pt.x + 6.8, Pt.z - 7.2);
    // Port : pontons, bateaux amarrés, capitainerie.
    this.harbor(id);
    // Paillote de Paco au bord du lagon.
    const G2 = LANDMARKS.lagoon;
    const px = G2.x - 27;
    const pz = G2.z + 2;
    const py = this.h(px, pz);
    const prot = Math.atan2(G2.x - px, G2.z - pz);
    this.add(id, paillote(), px, py, pz, prot);
    this.world.reserve(px, pz, 5);
    this.world.colliders.addBox(px, pz, 1.8, 1.0, prot);
    const fwd = [Math.sin(prot), Math.cos(prot)];
    this.village.shopSpots.paillote = { x: px - fwd[0] * 0.2, z: pz - fwd[1] * 0.2, rot: prot };
    this.sign(id, 'Paillote de Paco', px, py + 3.2, pz + 0.2, prot, 2.4, ['#fff6d6', '#c0584a']);
    // Transats et parasols sur la plage du lagon.
    for (let i = 0; i < 4; i++) {
      const bx = G2.x - 22 + i * 2.8;
      const bz = G2.z + 9 + (i % 2);
      const by = this.h(bx, bz);
      const u = new Shape();
      u.add(G.cyl(0.04, 0.04, 2.3, 5), '#fffaf2', { pos: [0, 1.15, 0] });
      for (let k = 0; k < 8; k++) u.add(new THREE.ConeGeometry(1.2, 0.4, 8, 1, true, (k / 8) * Math.PI * 2, Math.PI / 4), k % 2 ? '#ffffff' : ['#ff8fab', '#8fd6e8', '#ffd84d', '#b5e48c'][i], { pos: [0, 2.3, 0] });
      for (let k = 0; k < 4; k++) u.add(G.box(0.55, 0.05, 0.3), k % 2 ? '#ffffff' : '#ff8fab', { pos: [0.9, 0.3 + (k > 1 ? (k - 1) * 0.18 : 0), -0.6 + k * 0.3], rot: [k > 1 ? 0.6 : 0, 0, 0] });
      this.add(id, u.build(), bx, by, bz, 0.3);
      this.world.reserve(bx, bz, 2);
      this.world.colliders.addCircle(bx, bz, 0.15);
    }
    this.dock(id, G2.x - 20, G2.z - 6, 1, 0.3, 'lagon', 'le Lagon Turquoise');
    // Maisons sur pilotis au bord du port.
    for (const [x, z, c, r] of [[112, 52, '#ffd84d', 0.6], [117, 40, '#ff8fab', 0.9], [108, 62, '#8fd6e8', 0.3]]) {
      const floor = this.h(x, z);
      if (floor > 0.2) continue;
      this.add(id, stiltHut(c), x, 0, z, r);
      this.world.reserve(x, z, 3.5);
      this.world.colliders.addBox(x, z, 1.9, 1.9, r);
    }
  }

  harbor(id) {
    const dir = { x: Math.cos((246 * Math.PI) / 180), z: Math.sin((246 * Math.PI) / 180) };
    const Pt = LANDMARKS.port;
    let r = 12;
    while (r < 60 && this.h(Pt.x + dir.x * r, Pt.z + dir.z * r) > 0.45) r += 0.5;
    const sx = Pt.x + dir.x * (r - 2);
    const sz = Pt.z + dir.z * (r - 2);
    const rot = Math.atan2(dir.x, dir.z);
    const len = 20;
    const deckY = 1.1;
    const s = new Shape();
    for (let i = 0; i < len / 0.55; i++) s.add(G.box(3.4, 0.14, 0.5), i % 3 === 0 ? '#c9935f' : WOOD, { pos: [0, deckY - 0.07, i * 0.55] });
    // Quai en T au bout.
    for (let i = 0; i < 20; i++) s.add(G.box(0.5, 0.14, 3.0), i % 3 === 0 ? '#c9935f' : WOOD, { pos: [-5 + i * 0.52, deckY - 0.07, len + 1.2] });
    for (let i = 0; i <= len; i += 3.5) {
      for (const px of [-1.6, 1.6]) s.add(G.cyl(0.15, 0.17, 3.5, 7), WOOD_DARK, { pos: [px, deckY - 1.6, i] });
    }
    for (const px of [-5, 0, 5]) s.add(G.cyl(0.2, 0.2, 1.4, 8), '#4e4c62', { pos: [px, deckY + 0.3, len + 2.6] });
    // Phare de port au bout.
    s.add(G.cyl(0.5, 0.6, 2.8, 10), '#ffffff', { pos: [5.2, deckY + 1.4, len + 1.2] });
    s.add(G.cyl(0.52, 0.52, 0.5, 10), '#e5484d', { pos: [5.2, deckY + 2.0, len + 1.2] });
    s.add(G.cone(0.6, 0.6, 10), '#e5484d', { pos: [5.2, deckY + 3.4, len + 1.2] });
    const geo = s.build();
    this.add(id, geo, sx, 0, sz, rot);
    this.world.reserve(sx, sz, 4.5);
    this.addGlow(id, new Shape().add(G.cyl(0.35, 0.35, 0.5, 10), '#ffffff', { pos: [5.2, deckY + 2.95, len + 1.2] }).build(), sx, 0, sz, rot);
    const mid = rotate2(0, len / 2, rot);
    this.world.addPlatform(sx + mid[0], sz + mid[1], 1.75, len / 2 + 0.3, rot, deckY);
    const t = rotate2(0, len + 1.2, rot);
    this.world.addPlatform(sx + t[0], sz + t[1], 5.3, 1.55, rot, deckY);
    this.world.colliders.addBox(sx + rotate2(0, len + 2.75, rot)[0], sz + rotate2(0, len + 2.75, rot)[1], 5.3, 0.12, rot);
    const lh = rotate2(5.2, len + 1.2, rot);
    this.world.colliders.addCircle(sx + lh[0], sz + lh[1], 0.7);
    const fs = rotate2(-4, len + 2.2, rot);
    this.world.fishingSpots.push({ x: sx + fs[0], z: sz + fs[1], y: deckY, dirX: Math.sin(rot), dirZ: Math.cos(rot), name: 'le port de Port-Corail', habitat: 'mer' });
    this.add(id, harborExtras(), sx + rotate2(2.6, 1, rot)[0], this.h(sx, sz), sz + rotate2(2.6, 1, rot)[1], rot);
    // Bateaux amarrés qui dansent sur l'eau.
    const cols = ['#f4f1ea', '#ffd84d', '#8fd6e8', '#ff8fab'];
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? 1 : -1;
      const o = rotate2(side * 3.6, 5 + i * 3.5, rot);
      const m = new THREE.Mesh(boatGeo(), vertexColorToon());
      m.castShadow = true;
      m.userData.phase = i * 1.7;
      m.scale.setScalar(1.1);
      const g = m.geometry;
      const colAttr = g.attributes.color;
      const c = new THREE.Color(cols[i]);
      const base = new THREE.Color('#f4f1ea');
      for (let k = 0; k < colAttr.count; k++) {
        if (Math.abs(colAttr.getX(k) - base.r) < 0.02 && Math.abs(colAttr.getY(k) - base.g) < 0.02) colAttr.setXYZ(k, c.r, c.g, c.b);
      }
      m.position.set(sx + o[0], 0.2, sz + o[1]);
      m.rotation.y = rot + (side > 0 ? 0.1 : -0.1);
      this.boats.push({ mesh: m, phase: i * 1.7 });
      this.world.colliders.addBox(sx + o[0], sz + o[1], 1.0, 2.1, rot);
    }
    this.harborStart = { x: sx, z: sz, rot };
  }

  /** Petit ponton de pêche. */
  dock(id, x, z, dirX, dirZ, habitat, name) {
    const rot = Math.atan2(dirX, dirZ);
    const deckY = Math.max(this.h(x, z), 0) + 0.8;
    const s = new Shape();
    const len = 6;
    for (let i = 0; i < len / 0.55; i++) s.add(G.box(2.4, 0.14, 0.5), i % 3 === 0 ? '#c9935f' : WOOD, { pos: [0, deckY - 0.07, i * 0.55] });
    for (let i = 0; i <= len; i += 2.5) for (const px of [-1.1, 1.1]) s.add(G.cyl(0.12, 0.14, 3, 7), WOOD_DARK, { pos: [px, deckY - 1.5, i] });
    this.add(id, s.build(), x, 0, z, rot);
    this.world.reserve(x, z, 3);
    const mid = rotate2(0, len / 2, rot);
    this.world.addPlatform(x + mid[0], z + mid[1], 1.25, len / 2 + 0.3, rot, deckY);
    const end = rotate2(0, len - 0.8, rot);
    this.world.fishingSpots.push({ x: x + end[0], z: z + end[1], y: deckY, dirX: Math.sin(rot), dirZ: Math.cos(rot), name, habitat });
  }

  /** Comptoir de boutique devant une maison du village. */
  shop(id, shopId, label, houseIdx, geo, bg, fg) {
    const list = this.village.houses.filter((hh) => hh.village === id);
    const h = list[houseIdx];
    const fwd = [Math.sin(h.rot), Math.cos(h.rot)];
    const side = [fwd[1], -fwd[0]];
    const sx = h.x + fwd[0] * (h.d / 2 + 2.6) + side[0] * 2.3;
    const sz = h.z + fwd[1] * (h.d / 2 + 2.6) + side[1] * 2.3;
    const y = this.h(sx, sz);
    this.add(id, geo, sx, y, sz, h.rot);
    this.world.colliders.addBox(sx, sz, 0.95, 0.45, h.rot);
    this.world.reserve(sx, sz, 2.8);
    this.village.shopSpots[shopId] = { x: sx - fwd[0] * 1.0, z: sz - fwd[1] * 1.0, rot: h.rot };
    const post = rotate2(1.35, 0, h.rot);
    this.add(id, new Shape().add(G.box(0.1, 1.9, 0.1), WOOD_DARK, { pos: [0, 0.95, 0] }).build(), sx + post[0], y, sz + post[1], h.rot);
    this.sign(id, label, sx + post[0], y + 2.0, sz + post[1], h.rot, 1.6, [bg, fg]);
    this.world.colliders.addCircle(sx + post[0], sz + post[1], 0.15);
  }

  travelSign(id, travelId, name, emoji, x, z) {
    const y = this.h(x, z);
    const s = new Shape();
    s.add(G.cyl(0.12, 0.14, 3.2, 8), WOOD_DARK, { pos: [0, 1.6, 0] });
    s.add(G.sphere(0.2, 8, 6), '#ffd84d', { pos: [0, 3.3, 0] });
    this.add(id, s.build(), x, y, z);
    this.world.colliders.addCircle(x, z, 0.25);
    this.world.reserve(x, z, 2);
    this.sign(id, `🧭 Voyages`, x, y + 2.7, z, Math.atan2(-x, -z), 1.5, ['#fff6d6', '#2f5f8a']);
    this.travelPoints.push({ id: travelId, name, emoji, x: x + 1.2, z: z + 1.2 });
  }

  update(dt, elapsed, night, focus, particles, range = 300) {
    if (this.lanterns?.visible) {
      const { bm, gm, L } = this.lanterns.userData;
      const m = new THREE.Matrix4();
      this.lanternData.forEach((d, i) => {
        d.a += d.s * dt;
        m.makeTranslation(L.x + Math.cos(d.a) * d.r, 0.08 + Math.sin(elapsed * 1.3 + d.p) * 0.05, L.z + Math.sin(d.a) * d.r);
        bm.setMatrixAt(i, m);
        gm.setMatrixAt(i, m);
      });
      bm.instanceMatrix.needsUpdate = true;
      gm.instanceMatrix.needsUpdate = true;
    }
    if (this.sailboats?.visible) {
      const c = this.sailboats.userData.center;
      for (const b of this.sailboats.children) {
        const u = b.userData;
        u.a += u.sp * dt;
        b.position.set(c.x + Math.cos(u.a) * u.r, 0.15 + Math.sin(elapsed * 1.1 + u.p) * 0.08, c.z + Math.sin(u.a) * u.r);
        b.rotation.y = -u.a;
        b.rotation.z = Math.sin(elapsed * 0.9 + u.p) * 0.06;
      }
    }
    for (const b of this.boats) {
      b.mesh.position.y = 0.15 + Math.sin(elapsed * 1.2 + b.phase) * 0.07;
      b.mesh.rotation.z = Math.sin(elapsed * 0.9 + b.phase) * 0.05;
    }
    for (const g of Object.values(this.groups)) {
      const I = g.userData.island;
      if (I) g.visible = Math.hypot(I.x - focus.x, I.z - focus.z) - I.r < range;
    }
    // Fumée des cheminées et vapeur de la source.
    this.smokeT = (this.smokeT || 0) - dt;
    if (this.smokeT <= 0 && particles) {
      this.smokeT = 0.35;
      for (const s of this.smokes) {
        if (Math.hypot(s.x - focus.x, s.z - focus.z) > 70) continue;
        if (Math.random() < (s.steam ? 0.5 : 0.35)) particles.emit('smoke', new THREE.Vector3(s.x, s.y, s.z), { count: 1, spread: s.steam ? 1.2 : 0.3, rise: s.steam ? 0.6 : 0.9, life: s.steam ? 2.4 : 3.2, size: s.steam ? 0.9 : 0.8 });
      }
    }
  }
}

// --- Comptoirs des boutiques ------------------------------------------------------------

function pastryStand() {
  const s = new Shape();
  s.add(G.box(1.8, 0.9, 0.8), '#fff6e8', { pos: [0, 0.45, 0] });
  s.add(G.box(1.9, 0.08, 0.9), '#c0584a', { pos: [0, 0.92, 0] });
  for (let i = 0; i < 5; i++) s.add(G.box(0.36, 0.9, 0.02), i % 2 ? '#fff6e8' : '#f7c6d2', { pos: [-0.72 + i * 0.36, 0.45, 0.41] });
  s.add(G.box(1.5, 0.45, 0.6), '#dff4ff', { pos: [0, 1.2, -0.05] });
  for (let i = 0; i < 3; i++) {
    s.add(G.torus(0.12, 0.06, 6, 10, Math.PI * 1.3), '#e3b875', { pos: [-0.45 + i * 0.45, 1.05, -0.05], rot: [Math.PI / 2, 0, 0.4] });
  }
  s.add(G.cyl(0.18, 0.18, 0.2, 14), '#8a4a2a', { pos: [0.6, 1.08, 0.1] });
  s.add(G.cyl(0.15, 0.15, 0.04, 14), '#fffaf2', { pos: [0.6, 1.2, 0.1] });
  return s.build();
}

function woodStand() {
  const s = new Shape();
  s.add(G.box(1.9, 0.12, 0.8), '#b98457', { pos: [0, 0.85, 0] });
  for (const x of [-0.85, 0.85]) for (const z of [-0.3, 0.3]) s.add(G.box(0.12, 0.8, 0.12), WOOD_DARK, { pos: [x, 0.4, z] });
  s.add(G.box(0.5, 0.35, 0.5), '#a8714a', { pos: [-0.5, 1.1, 0] });
  s.add(G.sphere(0.2, 8, 6), '#c98b58', { pos: [0.2, 1.05, 0.1], scale: [1, 1.3, 0.7] });
  s.add(G.sphere(0.12, 8, 6), '#c98b58', { pos: [0.2, 1.35, 0.1] });
  s.add(G.box(0.3, 0.04, 0.08), '#b8c0cc', { pos: [0.6, 0.94, 0.2], rot: [0, 0.4, 0] });
  return s.build();
}

function fishStand() {
  const s = new Shape();
  s.add(G.box(1.9, 0.85, 0.85), '#8fd6e8', { pos: [0, 0.43, 0] });
  s.add(G.box(1.8, 0.1, 0.8), '#e8f3ff', { pos: [0, 0.9, 0] });
  for (let i = 0; i < 4; i++) s.add(G.sphere(0.13, 8, 6), ['#6fa8dc', '#ff8a3d', '#b8c0cc', '#6fcf97'][i], { pos: [-0.6 + i * 0.4, 1.0, 0], scale: [1.8, 0.6, 0.7] });
  s.add(G.torus(0.3, 0.08, 6, 14), '#e5484d', { pos: [0, 1.5, -0.4], rot: [0, 0, 0] });
  s.add(G.cyl(0.03, 0.03, 1.2, 5), WOOD_DARK, { pos: [0, 1.2, -0.4] });
  return s.build();
}

function easelStand() {
  const s = new Shape();
  for (const x of [-0.35, 0.35]) s.add(G.box(0.06, 1.7, 0.06), WOOD, { pos: [x, 0.85, 0], rot: [0, 0, x > 0 ? -0.12 : 0.12] });
  s.add(G.box(0.06, 1.6, 0.06), WOOD, { pos: [0, 0.8, -0.35], rot: [0.25, 0, 0] });
  s.add(G.box(0.95, 0.75, 0.05), '#fffaf2', { pos: [0, 1.25, 0.05] });
  s.add(G.box(0.85, 0.3, 0.02), '#8fd6e8', { pos: [0, 1.4, 0.08] });
  s.add(G.box(0.85, 0.3, 0.02), '#ffd84d', { pos: [0, 1.1, 0.08] });
  s.add(G.sphere(0.08, 8, 6), '#ff8a3d', { pos: [0.2, 1.45, 0.1] });
  s.add(G.box(1.2, 0.8, 0.6), '#c9b3ff', { pos: [0.9, 0.4, 0.1] });
  for (let i = 0; i < 4; i++) s.add(G.cyl(0.05, 0.05, 0.15, 8), ['#e5484d', '#ffd84d', '#6fa8dc', '#6fcf97'][i], { pos: [0.6 + i * 0.2, 0.88, 0.1] });
  return s.build();
}

function diveStand() {
  const s = new Shape();
  s.add(G.box(1.8, 0.85, 0.8), '#b5e8c9', { pos: [0, 0.43, 0] });
  s.add(G.box(1.9, 0.08, 0.9), '#2f7f6a', { pos: [0, 0.9, 0] });
  s.add(G.cyl(0.12, 0.12, 0.7, 10), '#ffd84d', { pos: [-0.5, 1.3, -0.1] });
  s.add(G.sphere(0.12, 8, 6), '#ffd84d', { pos: [-0.5, 1.65, -0.1] });
  s.add(G.box(0.4, 0.2, 0.25), '#2f7fc1', { pos: [0.2, 1.05, 0], rot: [0, 0.2, 0] });
  s.add(G.box(0.18, 0.02, 0.5), '#e5484d', { pos: [0.6, 0.96, 0.1], rot: [0, 0.3, 0] });
  s.add(G.box(0.18, 0.02, 0.5), '#e5484d', { pos: [0.75, 0.96, 0.05], rot: [0, 0.3, 0] });
  return s.build();
}

export { addSeason, createRng, STONE };
