import * as THREE from 'three';
import { Shape, G, toon, vertexColorToon, getGradientMap, addSeason } from '../core/materials.js';
import { createRng } from '../core/math.js';
import { LANDMARKS, ZONES } from './layout.js';

// Le village et les grands décors : maisons, place et fontaine, lampadaires,
// moulin, phare, ponton, étang, pique-nique, plage… Tout le statique est fusionné
// en quelques maillages ; seules les parties animées ou lumineuses sont séparées.

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const _up = new THREE.Vector3(0, 1, 0);

function place(geo, x, y, z, rotY = 0, scale = 1) {
  _q.setFromAxisAngle(_up, rotY);
  _m.compose(_v.set(x, y, z), _q, _s.set(scale, scale, scale));
  geo.applyMatrix4(_m);
  return geo;
}

const WOOD = '#b98457';
const WOOD_DARK = '#8f6243';
const STONE = '#d6ccbb';
const IRON = '#4e4c62';
const WINDOW_NIGHT = new THREE.Color('#ffd98a');

// --- Maisons -----------------------------------------------------------------

function cottage({ w = 5.2, d = 4.6, h = 3.0, wall, roof, trim = '#fffaf0', door = '#9c6b4f', shutter }) {
  const s = new Shape();
  const glass = new Shape();
  const top = 0.5 + h;
  s.add(G.box(w + 0.5, 0.5, d + 0.5), '#cfc4b3', { pos: [0, 0.25, 0] });
  s.add(G.box(w, h, d), wall, { pos: [0, 0.5 + h / 2, 0] });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) s.add(G.box(0.24, h, 0.24), trim, { pos: [sx * (w / 2), 0.5 + h / 2, sz * (d / 2)] });
  }
  s.add(G.box(w + 0.12, 0.2, d + 0.12), trim, { pos: [0, top, 0] });

  // Pignon triangulaire + toit à deux pans.
  const rh = d * 0.45;
  const tri = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, rh)]);
  const gable = new THREE.ExtrudeGeometry(tri, { depth: w - 0.02, bevelEnabled: false });
  gable.rotateY(Math.PI / 2);
  s.add(gable, wall, { pos: [-(w - 0.02) / 2, top + 0.1, 0] });
  const a = Math.atan2(rh, d / 2);
  const L = Math.hypot(d / 2, rh) + 0.7;
  for (const side of [-1, 1]) {
    s.add(G.box(w + 0.9, 0.3, L), roof, {
      pos: [0, top + 0.1 + rh / 2 + 0.2, side * (d / 4 + 0.12)],
      rot: [side * a, 0, 0],
    });
  }
  s.add(G.cyl(0.24, 0.24, w + 1.0, 8), roof, { pos: [0, top + rh + 0.33, 0], rot: [0, 0, Math.PI / 2] });
  s.add(G.box(0.7, 1.8, 0.7), '#c77b62', { pos: [w * 0.26, top + rh * 0.75, -d * 0.18] });
  s.add(G.box(0.85, 0.18, 0.85), '#a8604c', { pos: [w * 0.26, top + rh * 0.75 + 0.95, -d * 0.18] });

  // Porte, perron, fenêtres, jardinières.
  const fz = d / 2;
  s.add(G.box(1.4, 2.2, 0.1), trim, { pos: [0, 0.5 + 1.1, fz + 0.02] });
  s.add(G.box(1.1, 1.95, 0.14), door, { pos: [0, 0.5 + 0.98, fz + 0.05] });
  s.add(G.sphere(0.07, 8, 6), '#ffd166', { pos: [0.35, 0.5 + 0.95, fz + 0.15] });
  s.add(G.box(1.8, 0.28, 0.9), '#cfc4b3', { pos: [0, 0.14, fz + 0.65] });
  const win = (x, y, z, rotY) => {
    const f = new Shape();
    f.add(G.box(1.15, 1.15, 0.1), trim, { pos: [0, 0, 0] });
    f.add(G.box(0.08, 1.0, 0.14), trim, { pos: [0, 0, 0.02] });
    f.add(G.box(1.0, 0.08, 0.14), trim, { pos: [0, 0, 0.02] });
    if (shutter) {
      f.add(G.box(0.45, 1.1, 0.08), shutter, { pos: [-0.85, 0, 0] });
      f.add(G.box(0.45, 1.1, 0.08), shutter, { pos: [0.85, 0, 0] });
    }
    f.add(G.box(1.2, 0.26, 0.36), WOOD, { pos: [0, -0.72, 0.18] });
    const cols = ['#ff8fb1', '#ffd84d', '#c9a0ff', '#ffffff'];
    for (let i = 0; i < 4; i++) f.add(G.sphere(0.13, 7, 5), cols[i], { pos: [-0.42 + i * 0.28, -0.52, 0.2] });
    s.addRaw(place(f.build(), x, y, z, rotY));
    glass.addRaw(place(paintGlass(G.box(0.95, 0.95, 0.05)), x, y, z, rotY));
  };
  const wy = 0.5 + h * 0.56;
  win(-w / 2 + 1.1, wy, fz + 0.04, 0);
  win(w / 2 - 1.1, wy, fz + 0.04, 0);
  win(w / 2 + 0.04, wy, 0, Math.PI / 2);
  win(-w / 2 - 0.04, wy, 0, -Math.PI / 2);
  return { geo: s.build(), glass: glass.build(), w, d };
}

function paintGlass(geo) {
  const s = new Shape();
  s.add(geo, '#ffffff');
  return s.build();
}

// --- Mobilier ----------------------------------------------------------------

function lampGeo() {
  const s = new Shape();
  s.add(G.cyl(0.26, 0.32, 0.25, 8), IRON, { pos: [0, 0.12, 0] });
  s.add(G.cyl(0.08, 0.11, 3.0, 8), IRON, { pos: [0, 1.6, 0] });
  s.add(G.cyl(0.3, 0.2, 0.14, 6), IRON, { pos: [0, 3.12, 0] });
  s.add(G.cone(0.42, 0.4, 6), IRON, { pos: [0, 3.9, 0] });
  s.add(G.sphere(0.08, 6, 4), IRON, { pos: [0, 4.15, 0] });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    s.add(G.box(0.04, 0.55, 0.04), IRON, { pos: [Math.cos(a) * 0.27, 3.45, Math.sin(a) * 0.27] });
  }
  const glow = new Shape();
  glow.add(G.cyl(0.25, 0.25, 0.55, 6), '#ffffff', { pos: [0, 3.45, 0] });
  return { geo: s.build(), glow: glow.build() };
}

function benchGeo() {
  const s = new Shape();
  for (let i = 0; i < 3; i++) s.add(G.box(2.2, 0.08, 0.16), WOOD, { pos: [0, 0.5, -0.2 + i * 0.2] });
  for (let i = 0; i < 2; i++) s.add(G.box(2.2, 0.16, 0.06), WOOD, { pos: [0, 0.78 + i * 0.22, -0.34], rot: [-0.15, 0, 0] });
  for (const x of [-0.9, 0.9]) {
    s.add(G.box(0.1, 0.5, 0.1), IRON, { pos: [x, 0.25, 0.15] });
    s.add(G.box(0.1, 1.0, 0.1), IRON, { pos: [x, 0.5, -0.33] });
  }
  return s.build();
}

function fenceGeo(points, h = 0.9) {
  const s = new Shape();
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay, az] = points[i];
    const [bx, by, bz] = points[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const rot = Math.atan2(bx - ax, bz - az);
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const my = (ay + by) / 2;
    const tilt = Math.atan2(by - ay, len);
    for (const y of [0.35, 0.7]) {
      s.add(G.box(0.08, 0.1, len), '#f5ecdc', { pos: [mx, my + y * h, mz], rot: [-tilt, rot, 0], order: 'YXZ' });
    }
  }
  for (const [x, y, z] of points) {
    s.add(G.box(0.16, h + 0.15, 0.16), '#fff8ea', { pos: [x, y + (h + 0.15) / 2 - 0.05, z] });
    s.add(G.cone(0.13, 0.18, 4), '#fff8ea', { pos: [x, y + h + 0.17, z], rot: [0, Math.PI / 4, 0] });
  }
  return s.build();
}

function stallGeo() {
  const s = new Shape();
  s.add(G.box(3.2, 1.0, 1.2), WOOD, { pos: [0, 0.5, 0] });
  s.add(G.box(3.4, 0.1, 1.4), WOOD_DARK, { pos: [0, 1.05, 0] });
  for (const x of [-1.6, 1.6]) {
    for (const z of [-0.6, 0.6]) s.add(G.cyl(0.07, 0.07, 2.6, 6), WOOD_DARK, { pos: [x, 1.3, z] });
  }
  for (let i = 0; i < 8; i++) {
    s.add(G.box(0.45, 0.08, 1.9), i % 2 ? '#ffffff' : '#ff8fa3', { pos: [-1.57 + i * 0.45, 2.7, 0.1], rot: [0.28, 0, 0] });
    s.add(G.cone(0.225, 0.3, 3), i % 2 ? '#ffffff' : '#ff8fa3', { pos: [-1.57 + i * 0.45, 2.3, 1.02], rot: [Math.PI, 0, 0] });
  }
  const crate = (x, col) => {
    s.add(G.box(0.8, 0.35, 0.6), WOOD_DARK, { pos: [x, 1.28, 0.1] });
    for (let i = 0; i < 6; i++) s.add(G.sphere(0.13, 8, 6), col, { pos: [x - 0.25 + (i % 3) * 0.25, 1.5, 0 + Math.floor(i / 3) * 0.22] });
  };
  crate(-1, '#e5484d');
  crate(0, '#f28a2e');
  crate(1, '#ffcf3a');
  return s.build();
}

function fountain() {
  const s = new Shape();
  s.add(G.cyl(2.8, 3.0, 0.7, 24), STONE, { pos: [0, 0.35, 0] });
  s.add(G.torus(2.8, 0.25, 8, 32), '#e6ddcd', { pos: [0, 0.72, 0], rot: [Math.PI / 2, 0, 0] });
  s.add(G.cyl(0.4, 0.55, 1.9, 12), STONE, { pos: [0, 1.4, 0] });
  s.add(new THREE.SphereGeometry(1.1, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), STONE, { pos: [0, 2.45, 0], scale: [1, 0.5, 1] });
  s.add(G.torus(1.1, 0.12, 6, 24), '#e6ddcd', { pos: [0, 2.45, 0], rot: [Math.PI / 2, 0, 0] });
  s.add(G.cyl(0.18, 0.25, 0.7, 10), STONE, { pos: [0, 2.8, 0] });
  s.add(G.sphere(0.32, 12, 8), '#e6ddcd', { pos: [0, 3.25, 0] });
  const water = new Shape();
  water.add(G.cyl(2.62, 2.62, 0.05, 24), '#9fe6f2', { pos: [0, 0.62, 0] });
  water.add(G.cyl(1.0, 1.0, 0.04, 16), '#9fe6f2', { pos: [0, 2.42, 0] });
  return { geo: s.build(), water: water.build() };
}

function seedStandGeo() {
  const s = new Shape();
  s.add(G.box(1.8, 0.8, 0.8), WOOD, { pos: [0, 0.4, 0] });
  s.add(G.box(1.9, 0.08, 0.9), WOOD_DARK, { pos: [0, 0.82, 0] });
  const cols = ['#ff8fb1', '#ffd84d', '#8fd6e8', '#b5e48c', '#ffb27a', '#c9a0ff'];
  for (let i = 0; i < 6; i++) {
    s.add(G.box(0.22, 0.3, 0.05), cols[i], { pos: [-0.65 + i * 0.26, 1.0, 0.1 + (i % 2) * 0.12], rot: [-0.25, 0, 0] });
  }
  for (const x of [-0.6, 0.6]) s.add(G.cyl(0.22, 0.18, 0.3, 10), '#c77b62', { pos: [x, 1.0, -0.2] });
  s.add(G.sphere(0.2, 8, 6), '#5fae55', { pos: [-0.6, 1.25, -0.2] });
  s.add(G.sphere(0.2, 8, 6), '#ff8fb1', { pos: [0.6, 1.25, -0.2] });
  return s.build();
}

function workbenchGeo() {
  const s = new Shape();
  s.add(G.box(1.9, 0.12, 0.8), WOOD, { pos: [0, 0.85, 0] });
  for (const x of [-0.85, 0.85]) for (const z of [-0.3, 0.3]) s.add(G.box(0.1, 0.8, 0.1), WOOD_DARK, { pos: [x, 0.4, z] });
  s.add(G.box(1.6, 0.06, 0.6), WOOD_DARK, { pos: [0, 0.25, 0] });
  for (let i = 0; i < 3; i++) s.add(G.box(1.3, 0.06, 0.18), '#d9a86c', { pos: [0.1, 0.95 + i * 0.07, -0.15 + i * 0.03], rot: [0, 0.1 * i, 0] });
  s.add(G.box(0.4, 0.12, 0.03), '#b8c0cc', { pos: [-0.55, 0.97, 0.2], rot: [0, 0.4, 0] });
  s.add(G.box(0.12, 0.06, 0.05), '#e5484d', { pos: [-0.35, 0.97, 0.28], rot: [0, 0.4, 0] });
  s.add(G.cyl(0.03, 0.03, 0.3, 5), WOOD_DARK, { pos: [0.6, 0.97, 0.25], rot: [0, 0, Math.PI / 2] });
  s.add(G.box(0.12, 0.1, 0.08), '#8a8f99', { pos: [0.78, 0.97, 0.25] });
  return s.build();
}

function tailorGeo() {
  const s = new Shape();
  s.add(G.box(1.5, 0.75, 0.7), '#f6e8ff', { pos: [0.3, 0.375, 0] });
  s.add(G.box(1.6, 0.07, 0.8), '#b69cf0', { pos: [0.3, 0.78, 0] });
  const cols = ['#ff8fab', '#8fd6e8', '#ffd84d', '#b5e48c'];
  for (let i = 0; i < 4; i++) s.add(G.cyl(0.09, 0.09, 0.6, 10), cols[i], { pos: [-0.1 + i * 0.22, 0.91, 0], rot: [Math.PI / 2, 0, 0] });
  // Mannequin de couture.
  s.add(G.cyl(0.03, 0.03, 1.0, 6), WOOD_DARK, { pos: [-0.75, 0.5, 0] });
  s.add(G.cyl(0.2, 0.05, 0.05, 8), WOOD_DARK, { pos: [-0.75, 0.03, 0] });
  s.add(G.sphere(0.22, 12, 10), '#ff8fab', { pos: [-0.75, 1.15, 0], scale: [1, 1.3, 0.8] });
  s.add(G.cone(0.3, 0.45, 12), '#ff8fab', { pos: [-0.75, 0.82, 0] });
  s.add(G.sphere(0.06, 6, 5), WOOD_DARK, { pos: [-0.75, 1.48, 0] });
  return s.build();
}

function signBoard(text, w = 2.6, h = 0.6, bg = '#f6e7c8', fg = '#6b4a2e') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round((512 * h) / w);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#b98457';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = Math.round(canvas.height * 0.5);
  ctx.font = `800 ${size}px Nunito, "Trebuchet MS", sans-serif`;
  while (ctx.measureText(text).width > canvas.width - 40 && size > 10) {
    size -= 2;
    ctx.font = `800 ${size}px Nunito, "Trebuchet MS", sans-serif`;
  }
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshToonMaterial({ map: tex, gradientMap: getGradientMap() });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), [
    toon(WOOD), toon(WOOD), toon(WOOD), toon(WOOD), mat, mat,
  ]);
  mesh.castShadow = true;
  mesh.userData.redraw = (t) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    ctx.fillStyle = fg;
    let sz = Math.round(canvas.height * 0.5);
    ctx.font = `800 ${sz}px Nunito, "Trebuchet MS", sans-serif`;
    while (ctx.measureText(t).width > canvas.width - 40 && sz > 10) {
      sz -= 2;
      ctx.font = `800 ${sz}px Nunito, "Trebuchet MS", sans-serif`;
    }
    ctx.fillText(t, canvas.width / 2, canvas.height / 2 + 2);
    tex.needsUpdate = true;
  };
  return mesh;
}

// --- Grands décors -----------------------------------------------------------

function windmill() {
  const s = new Shape();
  s.add(G.cyl(1.7, 2.5, 7.5, 10), '#f6ecd9', { pos: [0, 3.75, 0] });
  s.add(G.cyl(2.6, 2.7, 0.5, 10), '#cfc4b3', { pos: [0, 0.25, 0] });
  s.add(G.cone(2.35, 2.4, 10), '#cf6d58', { pos: [0, 8.7, 0] });
  s.add(G.cyl(2.3, 2.1, 0.3, 10), '#fffaf0', { pos: [0, 7.55, 0] });
  s.add(G.box(1.1, 1.9, 0.2), '#9c6b4f', { pos: [0, 1.45, 2.3], rot: [-0.1, 0, 0] });
  s.add(G.box(0.8, 0.8, 0.2), '#fffaf0', { pos: [0, 4.6, 2.05], rot: [-0.1, 0, 0] });
  s.add(G.cyl(0.25, 0.25, 1.2, 8), WOOD_DARK, { pos: [0, 7.4, 2.2], rot: [Math.PI / 2, 0, 0] });
  const blades = new Shape();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    blades.add(G.box(0.22, 4.6, 0.12), WOOD_DARK, { pos: [-sn * 2.3, c * 2.3, 0], rot: [0, 0, a] });
    blades.add(G.box(1.2, 3.6, 0.05), '#fff4e2', { pos: [-sn * 2.6 + c * 0.7, c * 2.6 + sn * 0.7, 0.05], rot: [0, 0, a] });
  }
  blades.add(G.sphere(0.4, 10, 8), WOOD_DARK, {});
  return { geo: s.build(), blades: blades.build() };
}

function lighthouse() {
  const s = new Shape();
  const bands = 6;
  const H = 11;
  for (let i = 0; i < bands; i++) {
    const r0 = 2.0 - (i / bands) * 0.8;
    const r1 = 2.0 - ((i + 1) / bands) * 0.8;
    s.add(G.cyl(r1, r0, H / bands, 16), i % 2 ? '#e8575a' : '#fffaf2', { pos: [0, (i + 0.5) * (H / bands), 0] });
  }
  s.add(G.cyl(2.8, 3.0, 0.6, 16), '#cfc4b3', { pos: [0, 0.3, 0] });
  s.add(G.box(1.0, 1.8, 0.3), '#6d8fb5', { pos: [0, 1.4, 1.95] });
  s.add(G.cyl(1.9, 1.9, 0.3, 16), '#4e4c62', { pos: [0, H + 0.15, 0] });
  s.add(G.torus(1.8, 0.05, 4, 24), '#4e4c62', { pos: [0, H + 0.9, 0], rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    s.add(G.cyl(0.04, 0.04, 0.8, 4), '#4e4c62', { pos: [Math.cos(a) * 1.8, H + 0.6, Math.sin(a) * 1.8] });
  }
  s.add(new THREE.SphereGeometry(1.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#e8575a', { pos: [0, H + 1.9, 0] });
  s.add(G.sphere(0.2, 8, 6), '#4e4c62', { pos: [0, H + 3.25, 0] });
  const glass = new Shape();
  glass.add(G.cyl(1.0, 1.0, 1.6, 12), '#ffffff', { pos: [0, H + 1.1, 0] });
  return { geo: s.build(), glass: glass.build(), lampY: H + 1.1 };
}

function boatGeo() {
  const s = new Shape();
  s.add(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#f4f1ea', { scale: [0.95, 0.55, 2.1] });
  s.add(G.torus(1, 0.08, 6, 24), '#5b8fd6', { rot: [Math.PI / 2, 0, 0], scale: [0.95, 2.1, 1] });
  s.add(G.box(1.6, 0.08, 0.35), WOOD, { pos: [0, -0.1, 0.3] });
  s.add(G.box(0.1, 0.06, 1.8), WOOD_DARK, { pos: [0.5, 0.05, -0.2], rot: [0, 0.3, 0] });
  return s.build();
}

function picnicGeo() {
  const s = new Shape();
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) s.add(G.box(0.5, 0.03, 0.5), (i + j) % 2 ? '#ffffff' : '#ff7b8a', { pos: [-1.25 + i * 0.5, 0.02, -1.25 + j * 0.5] });
  }
  s.add(G.cyl(0.35, 0.3, 0.4, 10), '#c89b63', { pos: [0.6, 0.22, -0.5] });
  s.add(G.torus(0.3, 0.04, 5, 12, Math.PI), '#a67c4a', { pos: [0.6, 0.42, -0.5] });
  s.add(G.sphere(0.12, 8, 6), '#e5484d', { pos: [0.55, 0.46, -0.45] });
  s.add(G.cyl(0.25, 0.25, 0.04, 12), '#fffaf0', { pos: [-0.5, 0.05, 0.4] });
  s.add(G.cyl(0.16, 0.16, 0.12, 12), '#f2c77e', { pos: [-0.5, 0.12, 0.4] });
  s.add(G.cyl(0.16, 0.16, 0.04, 12), '#ff8fb1', { pos: [-0.5, 0.2, 0.4] });
  return s.build();
}

function umbrellaGeo() {
  const s = new Shape();
  s.add(G.cyl(0.05, 0.05, 2.6, 6), '#fffaf0', { pos: [0, 1.3, 0], rot: [0, 0, 0.12] });
  for (let i = 0; i < 8; i++) {
    const g = new THREE.ConeGeometry(1.9, 0.7, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4);
    s.add(g, i % 2 ? '#ffffff' : '#5bc0be', { pos: [0.3, 2.75, 0], rot: [0, 0, 0.12] });
  }
  for (let i = 0; i < 5; i++) s.add(G.box(0.36, 0.02, 1.8), i % 2 ? '#ffd84d' : '#ff8fb1', { pos: [1.4 + i * 0.36 - 0.72, 0.03, 0.6] });
  // Château de sable.
  s.add(G.cyl(0.5, 0.6, 0.45, 8), '#e9cf94', { pos: [-1.6, 0.22, 1.2] });
  s.add(G.cyl(0.18, 0.2, 0.4, 8), '#e9cf94', { pos: [-1.6, 0.62, 1.2] });
  s.add(G.cone(0.2, 0.25, 8), '#e9cf94', { pos: [-1.6, 0.94, 1.2] });
  s.add(G.box(0.02, 0.2, 0.14), '#ff5d73', { pos: [-1.6, 1.15, 1.26] });
  return s.build();
}

function doghouseGeo() {
  const s = new Shape();
  s.add(G.box(1.5, 1.1, 1.6), '#f2a65a', { pos: [0, 0.55, 0] });
  s.add(G.box(1.7, 0.12, 1.2), '#cf6d58', { pos: [0, 1.35, 0.36], rot: [0.62, 0, 0] });
  s.add(G.box(1.7, 0.12, 1.2), '#cf6d58', { pos: [0, 1.35, -0.36], rot: [-0.62, 0, 0] });
  const tri = new THREE.Shape([new THREE.Vector2(-0.8, 0), new THREE.Vector2(0.8, 0), new THREE.Vector2(0, 0.6)]);
  const gable = new THREE.ExtrudeGeometry(tri, { depth: 1.5, bevelEnabled: false });
  gable.rotateY(Math.PI / 2);
  s.add(gable, '#f2a65a', { pos: [-0.75, 1.1, 0] });
  s.add(new THREE.CircleGeometry(0.4, 16), '#3b2a2a', { pos: [0, 0.55, 0.81] });
  s.add(G.box(0.8, 0.8, 0.02), '#3b2a2a', { pos: [0, 0.3, 0.81] });
  // Gamelle.
  s.add(G.cyl(0.3, 0.22, 0.16, 12), '#5b8fd6', { pos: [1.3, 0.08, 0.9] });
  s.add(G.cyl(0.24, 0.24, 0.02, 12), '#c8844e', { pos: [1.3, 0.16, 0.9] });
  return s.build();
}

function mailboxGeo() {
  const s = new Shape();
  s.add(G.box(0.12, 1.1, 0.12), WOOD, { pos: [0, 0.55, 0] });
  s.add(G.box(0.45, 0.35, 0.6), '#5b8fd6', { pos: [0, 1.25, 0] });
  s.add(G.cyl(0.225, 0.225, 0.6, 12, false), '#5b8fd6', { pos: [0, 1.42, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.8] });
  s.add(G.box(0.04, 0.3, 0.08), '#ff5d73', { pos: [0.25, 1.5, -0.1] });
  return s.build();
}

function haystackGeo() {
  const s = new Shape();
  s.add(G.cyl(0.9, 1.0, 1.0, 12), '#f0cf6a', { pos: [0, 0.5, 0] });
  s.add(G.sphere(0.9, 12, 8), '#f5d97e', { pos: [0, 1.0, 0], scale: [1, 0.6, 1] });
  return s.build();
}

function lilyGeo(flower) {
  const s = new Shape();
  s.add(new THREE.CircleGeometry(0.6, 14, 0.3, Math.PI * 2 - 0.6), '#5fae55', { rot: [-Math.PI / 2, 0, 0] });
  if (flower) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      s.add(G.sphere(0.1, 6, 4), '#ffb0c8', { pos: [Math.cos(a) * 0.1, 0.08, Math.sin(a) * 0.1], rot: [0, -a, 0.7], scale: [1, 0.4, 0.5] });
    }
    s.add(G.sphere(0.05, 6, 4), '#ffd84d', { pos: [0, 0.1, 0] });
  }
  return s.build();
}

// -----------------------------------------------------------------------------

export class Village {
  constructor(world) {
    this.world = world;
    this.group = new THREE.Group();
    this.group.name = 'village';
    this.static = new Shape();
    this.glowShape = new Shape();
    this.houses = [];
    this.lampLights = [];
    const rng = createRng(99);
    this.rng = rng;

    this.windowMat = new THREE.MeshBasicMaterial({ color: '#bfe6f5' });
    this.glowMat = new THREE.MeshBasicMaterial({ color: '#fff3c4' });
    this.buildPlaza();
    this.buildHouses();
    this.buildLamps();
    this.buildProps(rng);
    this.buildShops();
    this.buildWindmill();
    this.buildLighthouse();
    this.buildPier();
    this.buildPond(rng);
    this.buildSigns();

    const stat = new THREE.Mesh(this.static.build(), addSeason(toon('#ffffff', { vertexColors: true }), { snowLo: 0.5, snowHi: 0.8, key: 'village' }));
    stat.castShadow = true;
    stat.receiveShadow = true;
    this.group.add(stat);
    const glow = new THREE.Mesh(this.glowShape.build(), this.glowMat);
    this.group.add(glow);
  }

  h(x, z) {
    return this.world.heightAt(x, z);
  }

  buildPlaza() {
    const y = 2.3;
    const s = new Shape();
    s.add(G.cyl(13, 13.2, 0.3, 48), '#e7dac2', { pos: [0, y - 0.1, 0] });
    s.add(G.cyl(9.5, 9.5, 0.3, 48), '#efe3cc', { pos: [0, y - 0.09, 0] });
    s.add(G.cyl(6, 6, 0.3, 40), '#e2d3b8', { pos: [0, y - 0.08, 0] });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      s.add(G.box(0.12, 0.3, 3.4), '#d9c9ad', { pos: [Math.cos(a) * 7.8, y - 0.07, Math.sin(a) * 7.8], rot: [0, -a, 0] });
    }
    this.static.addRaw(s.build());
    const f = fountain();
    this.static.addRaw(place(f.geo, 0, y, 0));
    this.fountainWater = new THREE.Mesh(place(f.water, 0, y, 0), toon('#9fe6f2', { emissive: '#4fb8d0', emissiveIntensity: 0.3 }));
    this.group.add(this.fountainWater);
    this.world.colliders.addCircle(0, 0, 3.1);
    this.world.addCamBlocker({ x: 0, z: 0, r: 3.2, top: y + 3.6 });

    // Jet d'eau en particules.
    const n = 90;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.fountainSeeds = Array.from({ length: n }, () => ({ a: Math.random() * Math.PI * 2, t: Math.random(), s: 0.8 + Math.random() * 0.4 }));
    this.fountainDrops = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#dff7ff', size: 0.16, transparent: true, opacity: 0.9 }));
    this.fountainDrops.position.set(0, y, 0);
    this.fountainDrops.frustumCulled = false;
    this.group.add(this.fountainDrops);
  }

  buildHouses() {
    const palette = [
      { wall: '#fff1dc', roof: '#ef7f6b', shutter: '#8fc9a8' },
      { wall: '#e8f3ff', roof: '#6fa8dc', shutter: '#ffd166' },
      { wall: '#fff6d8', roof: '#8fcf9b', shutter: '#ef7f6b' },
      { wall: '#f6e8ff', roof: '#b69cf0', shutter: '#fff1dc' },
      { wall: '#ffe9ea', roof: '#f7a8b8', shutter: '#6fa8dc' },
      { wall: '#f1ffe9', roof: '#f2b35a', shutter: '#b69cf0' },
    ];
    const angles = [146, 43, 98, 216, -67, -12];
    const glass = new Shape();
    angles.forEach((deg, i) => {
      const a = (deg * Math.PI) / 180;
      const r = i === 0 ? 21 : 21.5;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const rot = Math.atan2(-x, -z);
      const y = this.h(x, z) - 0.15;
      const c = cottage({ ...palette[i], w: i === 0 ? 5.8 : 5.2, d: i === 0 ? 5.0 : 4.6, h: 3.0 });
      this.static.addRaw(place(c.geo, x, y, z, rot));
      glass.addRaw(place(c.glass, x, y, z, rot));
      this.world.colliders.addBox(x, z, c.w / 2 + 0.25, c.d / 2 + 0.25, rot);
      this.world.addCamBlocker({ x, z, hw: c.w / 2 + 0.7, hd: c.d / 2 + 0.7, rot, top: y + 6.2 });
      this.world.reserve(x, z, 6);
      this.houses.push({ x, z, rot, player: i === 0 });
    });
    this.windows = new THREE.Mesh(glass.build(), this.windowMat);
    this.group.add(this.windows);

    // Jardin de la maison du joueur : clôture, niche, gamelle, boîte aux lettres.
    const home = this.houses[0];
    const dx = Math.cos((146 * Math.PI) / 180);
    const dz = Math.sin((146 * Math.PI) / 180);
    const yard = { x: home.x + dx * 8.5, z: home.z + dz * 8.5, r: 5.5, dir: { x: dx, z: dz } };
    this.yard = yard;
    const pts = [];
    const start = Math.atan2(-dz, -dx) + 0.7;
    for (let i = 0; i <= 12; i++) {
      const a = start + (i / 12) * (Math.PI * 2 - 1.4);
      const px = yard.x + Math.cos(a) * yard.r;
      const pz = yard.z + Math.sin(a) * yard.r;
      pts.push([px, this.h(px, pz) - 0.05, pz]);
    }
    this.static.addRaw(fenceGeo(pts));
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, , az] = pts[i];
      const [bx, , bz] = pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      this.world.colliders.addBox((ax + bx) / 2, (az + bz) / 2, 0.15, len / 2, Math.atan2(bx - ax, bz - az));
    }
    this.world.reserve(yard.x, yard.z, yard.r + 1);
    const dhx = yard.x + dx * 2.6;
    const dhz = yard.z + dz * 2.6;
    this.static.addRaw(place(doghouseGeo(), dhx, this.h(dhx, dhz) - 0.05, dhz, Math.atan2(-dx, -dz)));
    this.world.colliders.addBox(dhx, dhz, 0.85, 0.9, Math.atan2(-dx, -dz));
    const side = rotate2(2.3, 3.3, home.rot);
    const mbx = home.x + side[0];
    const mbz = home.z + side[1];
    this.static.addRaw(place(mailboxGeo(), mbx, this.h(mbx, mbz), mbz, home.rot));
    this.world.colliders.addCircle(mbx, mbz, 0.35);

    // Pancarte « Chez … » devant la maison.
    const sp = rotate2(-2.5, 3.7, home.rot);
    const sx = home.x + sp[0];
    const sz = home.z + sp[1];
    const sy = this.h(sx, sz);
    this.static.addRaw(place(new Shape().add(G.box(0.12, 1.2, 0.12), WOOD, { pos: [0, 0.6, 0] }).build(), sx, sy, sz, home.rot));
    this.homeSign = signBoard('Chez vous', 1.8, 0.55, '#fff1dc', '#c0584a');
    this.homeSign.position.set(sx, sy + 1.3, sz);
    this.homeSign.rotation.y = home.rot;
    this.group.add(this.homeSign);
    this.world.colliders.addCircle(sx, sz, 0.2);
  }

  /** Échoppes devant les maisons des artisans (graines, menuiserie, couture). */
  buildShops() {
    const defs = [
      { id: 'graines', house: 2, label: 'Graines', geo: seedStandGeo() },
      { id: 'menuiserie', house: 5, label: 'Menuiserie', geo: workbenchGeo() },
      { id: 'couture', house: 1, label: 'Couture', geo: tailorGeo() },
    ];
    for (const d of defs) {
      const h = this.houses[d.house];
      const fwd = [Math.sin(h.rot), Math.cos(h.rot)];
      const side = [fwd[1], -fwd[0]];
      const sx = h.x + fwd[0] * 5.2 + side[0] * 2.4;
      const sz = h.z + fwd[1] * 5.2 + side[1] * 2.4;
      const y = this.h(sx, sz);
      this.static.addRaw(place(d.geo, sx, y, sz, h.rot));
      this.world.colliders.addBox(sx, sz, 0.95, 0.45, h.rot);
      const px = sx - fwd[0] * 1.0;
      const pz = sz - fwd[1] * 1.0;
      this.shopSpots[d.id] = { x: px, z: pz, rot: h.rot };
      // Panneau de l'échoppe.
      const postX = sx + side[0] * 1.35;
      const postZ = sz + side[1] * 1.35;
      this.static.addRaw(place(new Shape().add(G.box(0.1, 1.9, 0.1), WOOD_DARK, { pos: [0, 0.95, 0] }).build(), postX, y, postZ, h.rot));
      const sign = signBoard(d.label, 1.5, 0.42, '#fff1dc', '#6b4a2e');
      sign.position.set(postX, y + 2.0, postZ);
      sign.rotation.y = h.rot;
      this.group.add(sign);
      this.world.colliders.addCircle(postX, postZ, 0.15);
    }
    // Enseigne du marché.
    const m = this.shopSpots.marche;
    const sign = signBoard('Marché', 1.6, 0.44, '#ffe3eb', '#c0584a');
    const o = rotate2(0, 1.25, m.rot);
    sign.position.set(m.x + o[0], 5.95, m.z + o[1]);
    sign.rotation.y = m.rot;
    this.group.add(sign);
  }

  /** Point devant la porte d'une maison (pour entrer / sortir). */
  doorFront(i, dist = 1.4) {
    const h = this.houses[i];
    const d = i === 0 ? 5.0 : 4.6;
    return { x: h.x + Math.sin(h.rot) * (d / 2 + dist), z: h.z + Math.cos(h.rot) * (d / 2 + dist), rot: h.rot };
  }

  buildLamps() {
    const lamp = lampGeo();
    const spots = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      spots.push([Math.cos(a) * 11.5, Math.sin(a) * 11.5]);
    }
    spots.push([24, 8], [-26, 7], [-3, -32], [10, 40], [-22, 30], [30, -22], [14, 66], [0, -58], [48, 14]);
    spots.forEach(([x, z], i) => {
      const y = this.h(x, z);
      this.static.addRaw(place(lamp.geo.clone(), x, y, z));
      this.glowShape.addRaw(place(lamp.glow.clone(), x, y, z));
      this.world.colliders.addCircle(x, z, 0.3);
      this.world.reserve(x, z, 1);
      if (i % 2 === 0 && i < 8) {
        const light = new THREE.PointLight('#ffd89a', 0, 16, 1.6);
        light.position.set(x, y + 3.4, z);
        this.group.add(light);
        this.lampLights.push(light);
      }
    });
  }

  buildProps(rng) {
    const bench = benchGeo();
    this.benches = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4 + 0.1;
      const x = Math.cos(a) * 9.8;
      const z = Math.sin(a) * 9.8;
      const rot = Math.atan2(-x, -z);
      this.static.addRaw(place(bench.clone(), x, 2.3, z, rot));
      this.world.colliders.addBox(x, z, 1.15, 0.45, rot);
      // Deux places assises par banc.
      for (const off of [-0.5, 0.5]) {
        const o = rotate2(off, 0.05, rot);
        this.benches.push({ x: x + o[0], z: z + o[1], rot, y: 2.3 + 0.5 });
      }
    }
    // Stand du marché.
    {
      const x = 6.5;
      const z = -7.5;
      const rot = Math.atan2(-x, -z);
      this.static.addRaw(place(stallGeo(), x, 2.3, z, rot));
      this.world.colliders.addBox(x, z, 1.8, 0.8, rot);
      const back = rotate2(0, -1.25, rot);
      this.shopSpots = { marche: { x: x + back[0], z: z + back[1], rot } };
    }
    // Tonneaux et caisses.
    const crates = new Shape();
    crates.add(G.cyl(0.4, 0.4, 0.9, 10), WOOD_DARK, { pos: [0, 0.45, 0] });
    crates.add(G.torus(0.41, 0.04, 4, 14), IRON, { pos: [0, 0.2, 0], rot: [Math.PI / 2, 0, 0] });
    crates.add(G.torus(0.41, 0.04, 4, 14), IRON, { pos: [0, 0.7, 0], rot: [Math.PI / 2, 0, 0] });
    crates.add(G.box(0.8, 0.7, 0.8), WOOD, { pos: [0.9, 0.35, 0.2], rot: [0, 0.3, 0] });
    const crateGeo = crates.build();
    for (const [x, z] of [[9.2, -4.2], [-8.5, 9], [14.5, 70]]) {
      this.static.addRaw(place(crateGeo.clone(), x, this.h(x, z), z, rng.range(0, 6)));
      this.world.colliders.addCircle(x + 0.4, z, 0.9);
    }
    // Pique-nique dans la prairie.
    {
      const x = 44;
      const z = 17;
      this.static.addRaw(place(picnicGeo(), x, this.h(x, z) + 0.02, z, 0.3));
      this.world.reserve(x, z, 2.5);
    }
    // Plage : parasol, serviette, château de sable.
    {
      const x = 5;
      const z = 82;
      this.static.addRaw(place(umbrellaGeo(), x, this.h(x, z), z, -0.4));
      this.world.colliders.addCircle(x, z, 0.2);
      this.world.reserve(x, z, 3);
    }
    // Meules de foin au pied du moulin.
    const hay = haystackGeo();
    for (const [ox, oz] of [[6, 2], [7, -1.5], [-6, 4]]) {
      const x = LANDMARKS.windmill.x + ox;
      const z = LANDMARKS.windmill.z + oz;
      this.static.addRaw(place(hay.clone(), x, this.h(x, z) - 0.1, z, rng.range(0, 6)));
      this.world.colliders.addCircle(x, z, 1.0);
      this.world.reserve(x, z, 1.6);
    }
  }

  buildWindmill() {
    const { x, z } = LANDMARKS.windmill;
    const y = this.h(x, z) - 0.2;
    const rot = Math.atan2(-x, -z);
    const w = windmill();
    this.static.addRaw(place(w.geo, x, y, z, rot));
    this.windmillBlades = new THREE.Mesh(w.blades, vertexColorToon());
    this.windmillBlades.castShadow = true;
    const hub = rotate2(0, 2.85, rot);
    this.windmillBlades.position.set(x + hub[0], y + 7.4, z + hub[1]);
    this.windmillBlades.rotation.y = rot;
    this.group.add(this.windmillBlades);
    this.world.colliders.addCircle(x, z, 2.7);
    this.world.addCamBlocker({ x, z, r: 3, top: y + 9.5 });
    this.world.reserve(x, z, 7);
  }

  buildLighthouse() {
    const { x, z } = LANDMARKS.lighthouse;
    const y = this.h(x, z) - 0.2;
    const lh = lighthouse();
    this.static.addRaw(place(lh.geo, x, y, z, Math.atan2(-x, -z)));
    this.glowShape.addRaw(place(lh.glass, x, y, z));
    this.world.colliders.addCircle(x, z, 2.2);
    this.world.addCamBlocker({ x, z, r: 2.6, top: y + 14.5 });
    this.world.reserve(x, z, 5);
    // Faisceau tournant, visible la nuit.
    const beamGeo = new THREE.ConeGeometry(3.5, 40, 16, 1, true);
    beamGeo.translate(0, -20, 0);
    beamGeo.rotateZ(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#fff1b8',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.beam = new THREE.Group();
    this.beam.position.set(x, y + lh.lampY, z);
    const b1 = new THREE.Mesh(beamGeo, beamMat);
    const b2 = new THREE.Mesh(beamGeo, beamMat);
    b2.rotation.y = Math.PI;
    this.beam.add(b1, b2);
    this.beamMat = beamMat;
    this.group.add(this.beam);
  }

  buildPier() {
    const { x } = LANDMARKS.pier;
    let z0 = 70;
    while (z0 < 100 && this.h(x, z0) > 0.35) z0 += 0.5;
    z0 -= 2;
    const len = 22;
    const deckY = 1.0;
    const s = new Shape();
    for (let i = 0; i < len / 0.55; i++) {
      const z = z0 + i * 0.55;
      s.add(G.box(3.2, 0.14, 0.5), i % 3 === 0 ? '#c9935f' : WOOD, { pos: [x, deckY - 0.07, z] });
    }
    for (let i = 0; i <= len; i += 3.5) {
      for (const sx of [-1.5, 1.5]) {
        const z = z0 + i;
        const bottom = this.h(x + sx, z);
        const hgt = deckY + 0.5 - bottom;
        s.add(G.cyl(0.14, 0.16, hgt, 7), WOOD_DARK, { pos: [x + sx, bottom + hgt / 2, z] });
      }
    }
    // Bout du ponton : petite rambarde et une lanterne.
    s.add(G.box(3.2, 0.1, 0.1), WOOD_DARK, { pos: [x, deckY + 0.5, z0 + len] });
    this.static.addRaw(s.build());
    this.world.addPlatform(x, z0 + len / 2, 1.65, len / 2 + 0.3, 0, deckY);
    this.world.colliders.addBox(x, z0 + len + 0.2, 1.6, 0.1, 0);
    this.world.reserve(x, z0 + 4, 3);

    this.boat = new THREE.Mesh(boatGeo(), vertexColorToon());
    this.boat.castShadow = true;
    this.boat.position.set(x + 3.4, 0.25, z0 + len * 0.6);
    this.boat.rotation.y = 0.15;
    this.group.add(this.boat);

    this.world.fishingSpots.push({ x, z: z0 + len - 0.8, y: deckY, dirX: 0, dirZ: 1, name: 'le ponton' });
  }

  buildPond(rng) {
    const { x: px, z: pz } = LANDMARKS.pond;
    // Petit embarcadère côté est de l'étang.
    let ex = px + 4;
    while (ex < px + 20 && this.h(ex, pz) < 0.4) ex += 0.5;
    const len = 6;
    const deckY = 0.85;
    const s = new Shape();
    for (let i = 0; i < len / 0.55; i++) {
      s.add(G.box(0.5, 0.14, 2.4), i % 3 === 0 ? '#c9935f' : WOOD, { pos: [ex + 1 - i * 0.55, deckY - 0.07, pz] });
    }
    for (let i = 0; i <= len; i += 2.5) {
      for (const sz of [-1.1, 1.1]) {
        const xx = ex + 1 - i;
        const bottom = this.h(xx, pz + sz);
        const hgt = deckY + 0.4 - bottom;
        s.add(G.cyl(0.12, 0.14, hgt, 7), WOOD_DARK, { pos: [xx, bottom + hgt / 2, pz + sz] });
      }
    }
    this.static.addRaw(s.build());
    this.world.addPlatform(ex + 1 - len / 2, pz, len / 2 + 0.3, 1.25, 0, deckY);
    this.world.fishingSpots.push({ x: ex + 1 - len + 0.8, z: pz, y: deckY, dirX: -1, dirZ: 0, name: "l'étang" });

    // Nénuphars.
    const lily = new Shape();
    const lilyF = new Shape();
    for (let i = 0; i < 22; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(2, 9);
      const x = px + Math.cos(a) * r;
      const z = pz + Math.sin(a) * r;
      if (this.h(x, z) > -0.4) continue;
      if (Math.abs(z - pz) < 2 && x > px + 2) continue;
      const target = i % 4 === 0 ? lilyF : lily;
      target.addRaw(place(lilyGeo(i % 4 === 0), x, 0.06, z, rng.range(0, 6), rng.range(0.8, 1.4)));
    }
    const lilies = new THREE.Mesh(new Shape().addRaw(lily.build()).addRaw(lilyF.build()).build(), vertexColorToon());
    lilies.receiveShadow = true;
    this.group.add(lilies);
  }

  buildSigns() {
    // Panneau indicateur au bord de la place.
    const x = -8.5;
    const z = 9.8;
    const y = 2.3;
    const post = new Shape();
    post.add(G.cyl(0.12, 0.14, 3.6, 8), WOOD_DARK, { pos: [0, 1.8, 0] });
    post.add(G.sphere(0.18, 8, 6), WOOD_DARK, { pos: [0, 3.65, 0] });
    this.static.addRaw(place(post.build(), x, y, z));
    this.world.colliders.addCircle(x, z, 0.25);
    const targets = ['prairie', 'foret', 'etang', 'plage', 'colline', 'phare'];
    targets.forEach((id, i) => {
      const zone = ZONES.find((zz) => zz.id === id);
      const board = signBoard(`${zone.name}`, 2.0, 0.38);
      const a = Math.atan2(zone.x - x, zone.z - z);
      board.position.set(x, y + 3.35 - i * 0.42, z);
      board.rotation.y = a - Math.PI / 2;
      board.translateX(1.05);
      this.group.add(board);
    });
  }

  setPlayerName(name) {
    this.homeSign.userData.redraw(`Chez ${name || 'vous'}`);
  }

  update(dt, elapsed, night) {
    this.windmillBlades.rotateZ(-dt * 0.6);
    this.beam.rotation.y += dt * 0.5;
    this.beamMat.opacity = night * 0.22;
    for (const l of this.lampLights) l.intensity = night * 14;
    this.glowMat.color.setRGB(1, 0.95, 0.75).multiplyScalar(0.55 + night * 0.6);
    this.windowMat.color.set('#bfe6f5').lerp(WINDOW_NIGHT, night);
    this.boat.position.y = 0.2 + Math.sin(elapsed * 1.3) * 0.06;
    this.boat.rotation.z = Math.sin(elapsed * 0.9) * 0.04;

    // Fontaine.
    const pos = this.fountainDrops.geometry.attributes.position;
    for (let i = 0; i < this.fountainSeeds.length; i++) {
      const p = this.fountainSeeds[i];
      p.t += dt * 0.7 * p.s;
      if (p.t > 1) {
        p.t -= 1;
        p.a = Math.random() * Math.PI * 2;
      }
      const r = p.t * 1.9 * p.s;
      const yy = 3.5 + p.t * 1.2 - p.t * p.t * 3.4;
      pos.setXYZ(i, Math.cos(p.a) * r, Math.max(yy, 0.62), Math.sin(p.a) * r);
    }
    pos.needsUpdate = true;
  }
}

function rotate2(x, z, rot) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return [x * c + z * s, -x * s + z * c];
}
