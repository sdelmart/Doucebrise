import * as THREE from 'three';
import { Shape, G } from '../core/materials.js';
import { SURF } from './decor.js';

// Maison du joueur, entièrement personnalisable : taille (3 agrandissements),
// couleurs, style de toit, façade et petits extras (cheminée, auvent, lierre…).

export const HOME_SIZES = [
  { w: 5.8, d: 5.0, h: 3.0, room: { w: 10, d: 8 }, label: 'Cottage' },
  { w: 7.4, d: 5.4, h: 3.2, room: { w: 13, d: 9.5 }, label: 'Maison' },
  { w: 9.0, d: 5.8, h: 3.4, room: { w: 16, d: 11 }, label: 'Grande maison' },
];

export const HOME_COLORS = {
  wall: ['#fff1dc', '#ffe3eb', '#e8f3ff', '#f1ffe9', '#fff6d8', '#f6e8ff', '#ffd6c2', '#d9f2ee', '#e9d5b7', '#ffffff', '#c9e4ff', '#f7c6d2'],
  roof: ['#ef7f6b', '#6fa8dc', '#8fcf9b', '#b69cf0', '#f7a8b8', '#f2b35a', '#5a6b8c', '#c0584a', '#4fae8a', '#8f6243', '#e5484d', '#3d3744'],
  trim: ['#fffaf0', '#fff3d6', '#e8f3ff', '#ffe3eb', '#d6ccbb', '#8f6243', '#3d3744', '#b69cf0'],
  door: ['#9c6b4f', '#e5484d', '#6fa8dc', '#6fcf97', '#ffd84d', '#b69cf0', '#ff8fab', '#3d3744', '#ffffff'],
  shutter: ['#8fc9a8', '#ffd166', '#ef7f6b', '#6fa8dc', '#b69cf0', '#ff8fab', '#fffaf0', '#8f6243'],
  fence: ['#fff8ea', '#f5ecdc', '#b98457', '#8f6243', '#ff8fab', '#8fd6e8', '#b5e48c', '#b69cf0'],
};

export const ROOF_STYLES = [
  { id: 'classique', label: 'Deux pans', price: 0 },
  { id: 'pointu', label: 'Toit pointu', price: 900 },
  { id: 'arrondi', label: 'Toit de chaume', price: 1200 },
];

export const FACADES = [
  { id: 'enduit', label: 'Enduit lisse', price: 0 },
  { id: 'bardage', label: 'Bardage bois', price: 700 },
  { id: 'colombages', label: 'Colombages', price: 1100 },
  { id: 'pierre', label: 'Soubassement en pierre', price: 900 },
];

export const HOME_EXTRAS = [
  { id: 'cheminee', label: 'Cheminée', emoji: '🧱', price: 0 },
  { id: 'jardinieres', label: 'Jardinières fleuries', emoji: '🌷', price: 0 },
  { id: 'volets', label: 'Volets', emoji: '🪟', price: 0 },
  { id: 'auvent', label: 'Auvent rayé', emoji: '⛱️', price: 400 },
  { id: 'lanternes', label: 'Lanternes', emoji: '🏮', price: 450 },
  { id: 'perron', label: 'Porche à colonnes', emoji: '🏛️', price: 800 },
  { id: 'lierre', label: 'Lierre grimpant', emoji: '🌿', price: 350 },
  { id: 'girouette', label: 'Girouette', emoji: '🐓', price: 300 },
  { id: 'massifs', label: 'Massifs de fleurs', emoji: '💐', price: 380 },
  { id: 'banc', label: 'Banc de façade', emoji: '🪑', price: 320 },
  { id: 'coeur', label: 'Cœur sur le pignon', emoji: '💗', price: 250 },
];

export const DEFAULT_HOME = {
  size: 0,
  wall: '#fff1dc',
  roof: '#ef7f6b',
  trim: '#fffaf0',
  door: '#9c6b4f',
  shutter: '#8fc9a8',
  fence: '#fff8ea',
  roofStyle: 'classique',
  facade: 'enduit',
  extras: ['cheminee', 'jardinieres', 'volets'],
};

function shade(c, f) {
  const col = new THREE.Color(c);
  return `#${(f < 0 ? col.multiplyScalar(1 + f) : col.lerp(new THREE.Color('#ffffff'), f)).getHexString()}`;
}

function heartShape(size) {
  const hs = new THREE.Shape();
  hs.moveTo(0, -size);
  hs.bezierCurveTo(-size * 1.5, size * 0.1, -size * 0.7, size * 1.2, 0, size * 0.45);
  hs.bezierCurveTo(size * 0.7, size * 1.2, size * 1.5, size * 0.1, 0, -size);
  return hs;
}

/** Géométrie de la maison (centrée, porte vers +Z). */
export function buildHome(style) {
  const st = { ...DEFAULT_HOME, ...style };
  const ex = new Set(st.extras || []);
  const { w, d, h } = HOME_SIZES[st.size] || HOME_SIZES[0];
  const s = new Shape();
  const glass = new Shape();
  const glow = new Shape();
  const top = 0.5 + h;
  const { wall, roof, trim, door } = st;
  const beam = '#6b4a3a';

  s.add(G.box(w + 0.5, 0.5, d + 0.5), '#cfc4b3', { pos: [0, 0.25, 0], surf: SURF.stone });
  s.add(G.box(w, h, d), wall, { pos: [0, 0.5 + h / 2, 0], surf: st.facade === 'bardage' ? SURF.planks : SURF.plaster });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.add(G.box(0.24, h, 0.24), st.facade === 'colombages' ? beam : trim, { pos: [sx * (w / 2), 0.5 + h / 2, sz * (d / 2)] });
  s.add(G.box(w + 0.12, 0.2, d + 0.12), st.facade === 'colombages' ? beam : trim, { pos: [0, top, 0] });

  // Façade.
  const faces = [
    { n: [0, 1], len: w, off: d / 2 },
    { n: [0, -1], len: w, off: d / 2 },
    { n: [1, 0], len: d, off: w / 2 },
    { n: [-1, 0], len: d, off: w / 2 },
  ];
  const onFace = (f, along, y, geo, col, rotZ = 0, surf = undefined) => {
    const rotY = Math.atan2(f.n[0], f.n[1]);
    const px = f.n[0] * (f.off + 0.03) + Math.cos(rotY) * along;
    const pz = f.n[1] * (f.off + 0.03) - Math.sin(rotY) * along;
    s.add(geo, col, { pos: [px, y, pz], rot: [0, rotY, rotZ], order: 'YXZ', surf });
  };
  if (st.facade === 'bardage') {
    const plank = shade(wall, -0.08);
    for (const f of faces) {
      for (let y = 0.75; y < top - 0.1; y += 0.34) onFace(f, 0, y, G.box(f.len - 0.1, 0.1, 0.05), plank, 0, SURF.planks);
    }
  } else if (st.facade === 'colombages') {
    for (const f of faces) {
      onFace(f, 0, 0.5 + h * 0.5, G.box(f.len - 0.1, 0.14, 0.06), beam);
      onFace(f, 0, top - 0.16, G.box(f.len - 0.1, 0.16, 0.07), beam);
      onFace(f, 0, 0.66, G.box(f.len - 0.1, 0.16, 0.07), beam);
      for (const sx of [-1, 1]) onFace(f, sx * (f.len / 2 - 0.3), 0.5 + h / 2, G.box(0.16, h, 0.07), beam);
      const n = Math.max(2, Math.round(f.len / 1.6));
      for (let i = 1; i < n; i++) {
        const a = -f.len / 2 + (i / n) * f.len;
        onFace(f, a, 0.5 + h * 0.25, G.box(0.14, h * 0.5, 0.06), beam);
        onFace(f, a, 0.5 + h * 0.75, G.box(0.14, h * 0.5, 0.06), beam);
      }
      if (f.n[0] !== 0) {
        onFace(f, -f.len / 4, 0.5 + h * 0.25, G.box(0.12, Math.hypot(f.len / 2, h / 2) * 0.9, 0.05), beam, 0.9);
        onFace(f, f.len / 4, 0.5 + h * 0.25, G.box(0.12, Math.hypot(f.len / 2, h / 2) * 0.9, 0.05), beam, -0.9);
      }
    }
  } else if (st.facade === 'pierre') {
    const stones = ['#b8b0a4', '#cfc4b3', '#a8a095', '#c4bbb0'];
    for (const f of faces) {
      let i = 0;
      for (let row = 0; row < 3; row++) {
        const y = 0.62 + row * 0.3;
        for (let a = -f.len / 2 + 0.25 + (row % 2) * 0.25; a < f.len / 2 - 0.2; a += 0.52) {
          onFace(f, a, y, G.box(0.46, 0.26, 0.08), stones[i++ % stones.length], 0, SURF.stone);
        }
      }
    }
  }

  // Toit.
  let ridgeY = top + d * 0.45 + 0.33;
  if (st.roofStyle === 'arrondi') {
    const R = d / 2 + 0.4;
    const roofGeo = new THREE.CylinderGeometry(R, R, w + 0.8, 20, 1, false, -Math.PI / 2, Math.PI);
    roofGeo.rotateZ(Math.PI / 2);
    s.add(roofGeo, roof, { pos: [0, top + 0.05, 0], scale: [1, 0.72, 1], surf: SURF.tiles });
    const half = new THREE.Shape();
    half.absarc(0, 0, d / 2, 0, Math.PI, false);
    const gable = new THREE.ExtrudeGeometry(half, { depth: w - 0.02, bevelEnabled: false, curveSegments: 16 });
    gable.rotateY(Math.PI / 2);
    s.add(gable, wall, { pos: [-(w - 0.02) / 2, top + 0.05, 0], scale: [1, 0.72, 1], surf: st.facade === 'bardage' ? SURF.planks : SURF.plaster });
    for (let i = 0; i < 4; i++) s.add(G.torus(R + 0.02, 0.05, 5, 18, Math.PI), shade(roof, -0.15), { pos: [-w / 2 + 0.2 + (i / 3) * (w - 0.4), top + 0.05, 0], rot: [0, Math.PI / 2, 0], scale: [1, 0.72, 1] });
    ridgeY = top + R * 0.72;
  } else {
    const rh = d * (st.roofStyle === 'pointu' ? 0.78 : 0.45);
    const tri = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, rh)]);
    const gable = new THREE.ExtrudeGeometry(tri, { depth: w - 0.02, bevelEnabled: false });
    gable.rotateY(Math.PI / 2);
    s.add(gable, wall, { pos: [-(w - 0.02) / 2, top + 0.1, 0], surf: st.facade === 'bardage' ? SURF.planks : SURF.plaster });
    const a = Math.atan2(rh, d / 2);
    const L = Math.hypot(d / 2, rh) + 0.7;
    for (const side of [-1, 1]) {
      s.add(G.box(w + 0.9, 0.3, L), roof, {
        pos: [0, top + 0.1 + rh / 2 + 0.2 - (st.roofStyle === 'pointu' ? 0.08 : 0), side * (d / 4 + 0.12)],
        rot: [side * a, 0, 0],
        surf: SURF.tiles,
      });
    }
    s.add(G.cyl(0.24, 0.24, w + 1.0, 8), roof, { pos: [0, top + rh + 0.33, 0], rot: [0, 0, Math.PI / 2], surf: SURF.tiles });
    ridgeY = top + rh + 0.33;
    if (ex.has('coeur')) {
      for (const sx of [-1, 1]) s.add(new THREE.ExtrudeGeometry(heartShape(0.28), { depth: 0.08, bevelEnabled: false, curveSegments: 10 }), '#ff6f91', { pos: [sx * (w / 2 + 0.02), top + rh * 0.42, 0], rot: [0, sx * Math.PI / 2, 0] });
    }
    // Lucarne sur la grande maison.
    if (st.size >= 2) {
      const lz = d / 4 + 0.35;
      const ly = top + rh * 0.42;
      s.add(G.box(1.3, 1.1, 1.0), wall, { pos: [0, ly + 0.35, lz], surf: SURF.plaster });
      s.add(G.box(1.6, 0.14, 1.3), roof, { pos: [-0.38, ly + 1.05, lz + 0.05], rot: [0, 0, 0.5], surf: SURF.tiles });
      s.add(G.box(1.6, 0.14, 1.3), roof, { pos: [0.38, ly + 1.05, lz + 0.05], rot: [0, 0, -0.5], surf: SURF.tiles });
      s.add(G.box(0.8, 0.7, 0.08), trim, { pos: [0, ly + 0.35, lz + 0.52] });
      glass.add(G.box(0.62, 0.52, 0.05), '#ffffff', { pos: [0, ly + 0.35, lz + 0.56] });
    }
  }
  if (ex.has('cheminee')) {
    const cy = st.roofStyle === 'arrondi' ? top + 0.8 : top + d * (st.roofStyle === 'pointu' ? 0.6 : 0.34);
    s.add(G.box(0.7, 1.8, 0.7), '#c77b62', { pos: [w * 0.28, cy, -d * 0.18], surf: SURF.stone });
    s.add(G.box(0.85, 0.18, 0.85), '#a8604c', { pos: [w * 0.28, cy + 0.95, -d * 0.18], surf: SURF.stone });
  }
  if (ex.has('girouette')) {
    s.add(G.cyl(0.03, 0.03, 1.0, 5), '#4e4c62', { pos: [-w * 0.3, ridgeY + 0.45, 0] });
    s.add(G.box(0.5, 0.03, 0.03), '#4e4c62', { pos: [-w * 0.3, ridgeY + 0.55, 0] });
    s.add(G.box(0.03, 0.03, 0.5), '#4e4c62', { pos: [-w * 0.3, ridgeY + 0.55, 0] });
    s.add(G.sphere(0.14, 8, 6), '#4e4c62', { pos: [-w * 0.3, ridgeY + 0.95, 0], scale: [1.4, 1, 0.3] });
    s.add(G.cone(0.08, 0.2, 5), '#4e4c62', { pos: [-w * 0.3 - 0.2, ridgeY + 1.1, 0] });
  }

  // Porte, perron.
  const fz = d / 2;
  s.add(G.box(1.4, 2.2, 0.1), trim, { pos: [0, 0.5 + 1.1, fz + 0.02], surf: SURF.wood });
  s.add(G.box(1.1, 1.95, 0.14), door, { pos: [0, 0.5 + 0.98, fz + 0.05], surf: SURF.planks });
  s.add(G.box(0.8, 0.06, 0.02), shade(door, -0.2), { pos: [0, 0.5 + 1.5, fz + 0.13] });
  s.add(G.sphere(0.07, 8, 6), '#ffd166', { pos: [0.35, 0.5 + 0.95, fz + 0.15] });
  s.add(G.box(1.8, 0.28, 0.9), '#cfc4b3', { pos: [0, 0.14, fz + 0.65], surf: SURF.stone });
  if (ex.has('perron')) {
    s.add(G.box(2.6, 0.3, 1.6), '#e7dac2', { pos: [0, 0.15, fz + 0.8] });
    for (const sx of [-1, 1]) {
      s.add(G.cyl(0.12, 0.14, 2.6, 10), trim, { pos: [sx * 1.1, 1.6, fz + 1.4] });
      s.add(G.box(0.3, 0.12, 0.3), trim, { pos: [sx * 1.1, 2.95, fz + 1.4] });
    }
    s.add(G.box(2.8, 0.14, 1.9), roof, { pos: [0, 3.1, fz + 0.9], rot: [-0.18, 0, 0], surf: SURF.tiles });
    s.add(G.box(2.7, 0.12, 0.12), trim, { pos: [0, 2.98, fz + 1.4] });
  }
  if (ex.has('auvent') && !ex.has('perron')) {
    for (let i = 0; i < 6; i++) {
      s.add(G.box(0.34, 0.06, 1.0), i % 2 ? '#ffffff' : st.shutter, { pos: [-0.85 + i * 0.34, 0.5 + 2.45, fz + 0.45], rot: [0.35, 0, 0], surf: SURF.plain });
      s.add(G.cone(0.17, 0.2, 3), i % 2 ? '#ffffff' : st.shutter, { pos: [-0.85 + i * 0.34, 0.5 + 2.18, fz + 0.93], rot: [Math.PI, 0, 0], surf: SURF.plain });
    }
  }
  if (ex.has('lanternes')) {
    for (const sx of [-1, 1]) {
      s.add(G.box(0.08, 0.3, 0.2), '#4e4c62', { pos: [sx * 1.0, 0.5 + 1.95, fz + 0.12] });
      s.add(G.cone(0.16, 0.16, 4), '#4e4c62', { pos: [sx * 1.0, 0.5 + 2.28, fz + 0.28], rot: [0, Math.PI / 4, 0] });
      s.add(G.box(0.24, 0.05, 0.24), '#4e4c62', { pos: [sx * 1.0, 0.5 + 1.83, fz + 0.28] });
      glow.add(G.box(0.18, 0.26, 0.18), '#ffffff', { pos: [sx * 1.0, 0.5 + 2.0, fz + 0.28] });
    }
  }

  // Fenêtres.
  const win = (x, y, z, rotY) => {
    const f = new Shape();
    f.add(G.box(1.15, 1.15, 0.1), trim, { pos: [0, 0, 0] });
    f.add(G.box(0.08, 1.0, 0.14), trim, { pos: [0, 0, 0.02] });
    f.add(G.box(1.0, 0.08, 0.14), trim, { pos: [0, 0, 0.02] });
    if (ex.has('volets')) {
      f.add(G.box(0.45, 1.1, 0.08), st.shutter, { pos: [-0.85, 0, 0], surf: SURF.planks });
      f.add(G.box(0.45, 1.1, 0.08), st.shutter, { pos: [0.85, 0, 0], surf: SURF.planks });
      for (const sx of [-0.85, 0.85]) for (const yy of [-0.25, 0.25]) f.add(G.box(0.36, 0.05, 0.1), shade(st.shutter, -0.15), { pos: [sx, yy, 0.01] });
    }
    if (ex.has('jardinieres')) {
      f.add(G.box(1.2, 0.26, 0.36), '#b98457', { pos: [0, -0.72, 0.18] });
      const cols = ['#ff8fb1', '#ffd84d', '#c9a0ff', '#ffffff'];
      for (let i = 0; i < 4; i++) f.add(G.sphere(0.13, 7, 5), cols[i], { pos: [-0.42 + i * 0.28, -0.52, 0.2] });
    }
    const g = f.build();
    g.rotateY(rotY);
    g.translate(x, y, z);
    s.addRaw(g);
    const gl = G.box(0.95, 0.95, 0.05);
    const gs = new Shape().add(gl, '#ffffff').build();
    gs.rotateY(rotY);
    gs.translate(x, y, z);
    glass.addRaw(gs);
  };
  const wy = 0.5 + h * 0.56;
  const fronts = st.size === 0 ? [-w / 2 + 1.1, w / 2 - 1.1] : st.size === 1 ? [-w / 2 + 1.2, w / 2 - 1.2] : [-w / 2 + 1.1, -1.95, 1.95, w / 2 - 1.1];
  for (const x of fronts) win(x, wy, fz + 0.04, 0);
  for (const x of st.size === 0 ? [0] : [-w / 4, w / 4]) win(x, wy, -fz - 0.04, Math.PI);
  win(w / 2 + 0.04, wy, 0, Math.PI / 2);
  win(-w / 2 - 0.04, wy, 0, -Math.PI / 2);

  // Lierre, massifs, banc.
  if (ex.has('lierre')) {
    const greens = ['#5fae55', '#4f9a4a', '#6fbf5f'];
    let i = 0;
    for (const sx of [-1, 1]) {
      for (let y = 0.6; y < top; y += 0.28) {
        const wob = Math.sin(y * 5 + sx) * 0.12;
        s.add(G.sphere(0.2, 6, 5), greens[i++ % 3], { pos: [sx * (w / 2 + 0.05) - sx * wob, y, fz + 0.08], scale: [1, 0.8, 0.5] });
        if (y < top * 0.6) s.add(G.sphere(0.16, 6, 5), greens[i++ % 3], { pos: [sx * (w / 2 - 0.35 - wob), y + 0.1, fz + 0.1], scale: [1, 0.8, 0.5] });
      }
    }
  }
  if (ex.has('massifs')) {
    const cols = ['#ff8fb1', '#ffd84d', '#c9a0ff', '#ff6f91', '#ffffff', '#8fd6e8'];
    let i = 0;
    for (const sx of [-1, 1]) {
      for (let x = 1.3; x < w / 2 + 0.2; x += 0.45) {
        s.add(G.sphere(0.28, 7, 5), '#5fae55', { pos: [sx * x, 0.25, fz + 0.55], scale: [1, 0.8, 0.9] });
        s.add(G.sphere(0.1, 6, 4), cols[i++ % cols.length], { pos: [sx * x + 0.08, 0.5, fz + 0.62] });
        s.add(G.sphere(0.1, 6, 4), cols[i++ % cols.length], { pos: [sx * x - 0.1, 0.46, fz + 0.72] });
      }
    }
  }
  if (ex.has('banc')) {
    const bx = -w / 2 + 1.2;
    for (let i = 0; i < 3; i++) s.add(G.box(1.3, 0.07, 0.14), '#b98457', { pos: [bx, 0.55, fz + 0.75 + i * 0.16] });
    s.add(G.box(1.3, 0.3, 0.06), '#b98457', { pos: [bx, 0.82, fz + 0.66] });
    for (const x of [-0.55, 0.55]) s.add(G.box(0.08, 0.5, 0.45), '#8f6243', { pos: [bx + x, 0.3, fz + 0.9] });
  }
  return { geo: s.build(), glass: glass.build(), glow: glow.empty ? null : glow.build(), w, d, h };
}

export function fencePoints(yard, h) {
  const pts = [];
  const { dir } = yard;
  const start = Math.atan2(-dir.z, -dir.x) + 0.7;
  for (let i = 0; i <= 12; i++) {
    const a = start + (i / 12) * (Math.PI * 2 - 1.4);
    const px = yard.x + Math.cos(a) * yard.r;
    const pz = yard.z + Math.sin(a) * yard.r;
    pts.push([px, h(px, pz) - 0.05, pz]);
  }
  return pts;
}
