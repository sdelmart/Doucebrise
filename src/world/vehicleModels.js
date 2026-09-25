import * as THREE from 'three';
import { Shape, G } from '../core/materials.js';

// Modèles 3D des véhicules (orientés vers +Z, origine au sol). Les roues sont
// renvoyées à part pour pouvoir tourner.

const DARK = '#3d3744';
const METAL = '#b8c0cc';
const TIRE = '#2e2e3a';
const SEAT = '#6b4a3a';

function lighten(c, f) {
  return `#${new THREE.Color(c).lerp(new THREE.Color('#ffffff'), f).getHexString()}`;
}
function darken(c, f) {
  return `#${new THREE.Color(c).multiplyScalar(1 - f).getHexString()}`;
}

export function wheelGeo(r, width = 0.08, hub = '#fffaf2') {
  const s = new Shape();
  s.add(G.torus(r - width * 0.5, width * 0.6, 8, 20), TIRE, { rot: [0, Math.PI / 2, 0] });
  s.add(G.cyl(r * 0.55, r * 0.55, width * 0.8, 14), hub, { rot: [0, 0, Math.PI / 2] });
  s.add(G.box(width * 1.1, r * 1.3, 0.04), METAL, {});
  s.add(G.box(width * 1.1, 0.04, r * 1.3), METAL, {});
  return s.build();
}

const MODELS = {
  velo(c) {
    const s = new Shape();
    const tube = (a, b, r = 0.035, col = c) => {
      const va = new THREE.Vector3(...a);
      const vb = new THREE.Vector3(...b);
      const len = va.distanceTo(vb);
      const g = G.cyl(r, r, len, 6);
      const mid = va.clone().add(vb).multiplyScalar(0.5);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
      g.applyQuaternion(q);
      g.translate(mid.x, mid.y, mid.z);
      s.add(g, col);
    };
    tube([0, 0.36, -0.55], [0, 0.72, -0.12]);
    tube([0, 0.36, -0.55], [0, 0.42, 0.05]);
    tube([0, 0.42, 0.05], [0, 0.72, -0.12]);
    tube([0, 0.42, 0.05], [0, 0.95, 0.42]);
    tube([0, 0.72, -0.12], [0, 0.9, 0.38]);
    tube([0, 0.36, 0.55], [0, 1.0, 0.42], 0.03, METAL);
    tube([0, 0.72, -0.12], [0, 0.86, -0.18], 0.025, METAL);
    s.add(G.box(0.2, 0.07, 0.3), SEAT, { pos: [0, 0.9, -0.2] });
    s.add(G.cyl(0.02, 0.02, 0.6, 6), METAL, { pos: [0, 1.02, 0.42], rot: [0, 0, Math.PI / 2] });
    for (const x of [-0.3, 0.3]) s.add(G.cyl(0.03, 0.03, 0.1, 6), DARK, { pos: [x, 1.02, 0.42], rot: [0, 0, Math.PI / 2] });
    // Panier fleuri et garde-boues.
    s.add(G.box(0.36, 0.22, 0.26), '#d9a86c', { pos: [0, 0.9, 0.68] });
    for (let i = 0; i < 4; i++) s.add(G.sphere(0.06, 6, 4), ['#ff8fb1', '#ffd84d', '#ffffff', '#c9a0ff'][i], { pos: [-0.1 + (i % 2) * 0.2, 1.04, 0.62 + Math.floor(i / 2) * 0.12] });
    s.add(G.cyl(0.04, 0.04, 0.05, 8), '#ffd84d', { pos: [0, 0.35, 0.02], rot: [0, 0, Math.PI / 2] });
    s.add(G.torus(0.36, 0.03, 4, 12, Math.PI * 0.7), c, { pos: [0, 0.36, -0.55], rot: [0, Math.PI / 2, 0.3] });
    return { geo: s.build(), wheels: [[0, 0.36, 0.55, 0.36], [0, 0.36, -0.55, 0.36]], wheelW: 0.06 };
  },
  trottinette(c) {
    const s = new Shape();
    s.add(G.box(0.2, 0.06, 0.8), c, { pos: [0, 0.14, -0.05] });
    s.add(G.box(0.18, 0.02, 0.6), DARK, { pos: [0, 0.18, -0.05] });
    s.add(G.cyl(0.03, 0.03, 0.95, 8), METAL, { pos: [0, 0.6, 0.38], rot: [-0.12, 0, 0] });
    s.add(G.cyl(0.02, 0.02, 0.5, 6), METAL, { pos: [0, 1.06, 0.43], rot: [0, 0, Math.PI / 2] });
    for (const x of [-0.24, 0.24]) s.add(G.cyl(0.03, 0.03, 0.1, 6), c, { pos: [x, 1.06, 0.43], rot: [0, 0, Math.PI / 2] });
    s.add(G.box(0.08, 0.04, 0.2), c, { pos: [0, 0.2, 0.32], rot: [0.3, 0, 0] });
    s.add(G.sphere(0.04, 6, 4), '#ffd84d', { pos: [0, 0.95, 0.46] });
    return { geo: s.build(), wheels: [[0, 0.12, 0.38, 0.12], [0, 0.12, -0.42, 0.12]], wheelW: 0.06 };
  },
  scooter(c) {
    const s = new Shape();
    s.add(G.sphere(0.4, 14, 10), c, { pos: [0, 0.55, -0.35], scale: [0.85, 0.7, 1.3] });
    s.add(G.box(0.4, 0.1, 0.7), darken(c, 0.2), { pos: [0, 0.26, 0.15] });
    s.add(G.box(0.46, 0.1, 0.62), SEAT, { pos: [0, 0.85, -0.35] });
    s.add(G.sphere(0.23, 10, 8), SEAT, { pos: [0, 0.86, -0.35], scale: [1, 0.3, 1.35] });
    s.add(G.box(0.5, 0.75, 0.12), c, { pos: [0, 0.65, 0.42], rot: [-0.25, 0, 0] });
    s.add(G.cyl(0.05, 0.05, 0.35, 8), METAL, { pos: [0, 0.95, 0.53], rot: [-0.3, 0, 0] });
    s.add(G.cyl(0.025, 0.025, 0.7, 6), METAL, { pos: [0, 1.12, 0.58], rot: [0, 0, Math.PI / 2] });
    s.add(G.sphere(0.12, 10, 8), lighten(c, 0.3), { pos: [0, 1.1, 0.64], scale: [1.2, 0.9, 0.8] });
    s.add(G.cyl(0.08, 0.08, 0.05, 12), '#fff6c9', { pos: [0, 1.1, 0.73], rot: [Math.PI / 2, 0, 0] });
    for (const x of [-0.36, 0.36]) {
      s.add(G.cyl(0.012, 0.012, 0.25, 5), METAL, { pos: [x, 1.25, 0.56] });
      s.add(G.sphere(0.05, 6, 5), METAL, { pos: [x, 1.38, 0.56], scale: [1, 0.7, 0.4] });
    }
    s.add(G.sphere(0.26, 10, 8), c, { pos: [0, 0.38, 0.55], scale: [0.6, 0.55, 0.9] });
    s.add(G.box(0.36, 0.06, 0.3), METAL, { pos: [0, 0.92, -0.82] });
    return { geo: s.build(), wheels: [[0, 0.24, 0.62, 0.24], [0, 0.24, -0.62, 0.24]], wheelW: 0.12 };
  },
  voiturette(c) {
    const s = new Shape();
    s.add(G.box(1.4, 0.5, 2.3), c, { pos: [0, 0.55, 0] });
    s.add(G.sphere(0.72, 16, 10), c, { pos: [0, 0.62, 0.72], scale: [1, 0.55, 0.75] });
    s.add(G.sphere(0.72, 16, 10), c, { pos: [0, 0.62, -0.78], scale: [1, 0.55, 0.65] });
    s.add(G.box(1.3, 0.12, 1.2), '#fff3d6', { pos: [0, 0.62, -0.25] });
    s.add(G.box(1.3, 0.1, 0.12), darken(c, 0.15), { pos: [0, 0.82, 0.3] });
    s.add(G.box(1.2, 0.5, 0.06), '#dff4ff', { pos: [0, 1.08, 0.35], rot: [-0.3, 0, 0] });
    s.add(G.box(1.3, 0.06, 0.1), METAL, { pos: [0, 1.33, 0.28], rot: [-0.3, 0, 0] });
    // Banquette et volant.
    s.add(G.box(1.1, 0.14, 0.5), '#fff3d6', { pos: [0, 0.72, -0.5] });
    s.add(G.box(1.1, 0.55, 0.14), '#fff3d6', { pos: [0, 0.98, -0.78], rot: [-0.15, 0, 0] });
    s.add(G.torus(0.14, 0.025, 6, 14), DARK, { pos: [0.28, 1.0, 0.12], rot: [-0.9, 0, 0] });
    s.add(G.cyl(0.02, 0.02, 0.35, 5), DARK, { pos: [0.28, 0.88, 0.22], rot: [-0.9, 0, 0] });
    for (const x of [-0.5, 0.5]) {
      s.add(G.cyl(0.13, 0.13, 0.06, 12), '#fff6c9', { pos: [x, 0.66, 1.25], rot: [Math.PI / 2, 0, 0] });
      s.add(G.box(0.24, 0.1, 0.05), '#ff6f91', { pos: [x, 0.62, -1.18] });
    }
    s.add(G.box(1.5, 0.12, 0.14), METAL, { pos: [0, 0.4, 1.2] });
    s.add(G.box(1.5, 0.12, 0.14), METAL, { pos: [0, 0.4, -1.2] });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.add(new THREE.SphereGeometry(0.34, 10, 6, 0, Math.PI), darken(c, 0.15), { pos: [sx * 0.72, 0.62, sz * 0.72], scale: [0.35, 0.8, 1] });
    return { geo: s.build(), wheels: [[-0.72, 0.3, 0.72, 0.3], [0.72, 0.3, 0.72, 0.3], [-0.72, 0.3, -0.72, 0.3], [0.72, 0.3, -0.72, 0.3]], wheelW: 0.18 };
  },
  bateau(c) {
    const s = new Shape();
    s.add(new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), c, { pos: [0, 0.35, 0], scale: [0.85, 0.55, 1.7] });
    s.add(G.torus(1, 0.07, 6, 28), '#fffaf2', { pos: [0, 0.35, 0], rot: [Math.PI / 2, 0, 0], scale: [0.85, 1.7, 1] });
    s.add(G.box(1.4, 0.08, 0.35), '#b98457', { pos: [0, 0.3, -0.35] });
    s.add(G.box(1.2, 0.08, 0.3), '#b98457', { pos: [0, 0.3, 0.6] });
    s.add(G.box(0.3, 0.45, 0.3), DARK, { pos: [0, 0.55, -1.6] });
    s.add(G.box(0.12, 0.6, 0.12), METAL, { pos: [0, 0.15, -1.7] });
    s.add(G.box(0.34, 0.1, 0.34), '#e5484d', { pos: [0, 0.8, -1.6] });
    s.add(G.cyl(0.02, 0.02, 1.1, 5), '#fffaf2', { pos: [0, 0.9, 1.25] });
    s.add(G.box(0.02, 0.22, 0.34), '#ff8fab', { pos: [0, 1.32, 1.1] });
    return { geo: s.build(), wheels: [], wheelW: 0 };
  },
  montgolfiere(c) {
    const s = new Shape();
    s.add(G.cyl(0.75, 0.62, 0.9, 12), '#c98b58', { pos: [0, 0.45, 0] });
    s.add(G.torus(0.75, 0.06, 6, 20), '#8f6243', { pos: [0, 0.9, 0], rot: [Math.PI / 2, 0, 0] });
    s.add(G.cyl(0.6, 0.6, 0.06, 12), '#8f6243', { pos: [0, 0.12, 0] });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(a) * 0.7;
      const z = Math.sin(a) * 0.7;
      s.add(G.cyl(0.015, 0.015, 2.4, 4), '#8f6243', { pos: [x * 1.25, 2.1, z * 1.25], rot: [Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14] });
    }
    s.add(G.cyl(0.2, 0.25, 0.2, 10), DARK, { pos: [0, 3.25, 0] });
    const cols = [c, '#ffffff'];
    for (let i = 0; i < 12; i++) {
      const g = new THREE.SphereGeometry(2.4, 6, 14, (i / 12) * Math.PI * 2, Math.PI / 6, 0, Math.PI * 0.78);
      s.add(g, cols[i % 2], { pos: [0, 5.6, 0], scale: [1, 1.15, 1] });
    }
    s.add(new THREE.ConeGeometry(1.25, 1.4, 12, 1, true), c, { pos: [0, 3.7, 0], rot: [Math.PI, 0, 0] });
    s.add(G.sphere(0.25, 8, 6), '#ffd84d', { pos: [0, 8.35, 0] });
    return { geo: s.build(), wheels: [], wheelW: 0 };
  },
};

export function vehicleModel(id, color) {
  return MODELS[id](color);
}
