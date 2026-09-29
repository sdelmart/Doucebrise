import * as THREE from 'three';
import { Shape, G } from '../core/materials.js';

// Bonhomme de neige : trois boules, des yeux et des boutons en charbon, des bras en
// branches, un nez, un chapeau et une écharpe au choix. Sert à la Fête des neiges
// (bonshommes des habitants, celui de la joueuse) et au trophée du jardin.

export const SNOWMAN_NOSES = {
  carotte: { label: 'Carotte', emoji: '🥕' },
  'pomme-pin': { label: 'Pomme de pin', emoji: '🌰' },
  cerise: { label: 'Cerise', emoji: '🍒' },
};
export const SNOWMAN_HATS = {
  bonnet: { label: 'Bonnet', emoji: '🧶' },
  seau: { label: 'Seau', emoji: '🪣' },
  'haut-de-forme': { label: 'Haut-de-forme', emoji: '🎩' },
  paille: { label: 'Chapeau de paille', emoji: '👒' },
  oreilles: { label: 'Oreilles de chat', emoji: '🐱' },
};
export const SNOWMAN_SCARVES = {
  rouge: { label: 'Rouge', emoji: '❤️', color: '#e5484d' },
  bleue: { label: 'Bleue', emoji: '💙', color: '#4f8fd6' },
  jaune: { label: 'Jaune', emoji: '💛', color: '#ffd84d' },
  rayee: { label: 'Rayée', emoji: '🌈', color: '#ff8fab', stripe: '#fffaf2' },
};

const SNOW = '#f7fbff';
const COAL = '#2e2a33';
const WOOD = '#7a5234';

/**
 * @param {{nose?:string, hat?:string, scarf?:string, sizes?:number[], hatColor?:string, lean?:number}} o
 *   sizes : taille relative des trois boules (1 = bien roulée).
 */
export function snowmanShape(o = {}) {
  const s = new Shape();
  const [a = 1, b = 1, c = 1] = o.sizes || [];
  const r1 = 0.46 * a;
  const r2 = 0.34 * b;
  const r3 = 0.25 * c;
  const y1 = r1 * 0.9;
  const y2 = y1 + r1 * 0.75 + r2 * 0.8;
  const y3 = y2 + r2 * 0.75 + r3 * 0.85;
  const lean = o.lean || 0;
  s.add(G.sphere(r1, 18, 14), SNOW, { pos: [0, y1, 0], scale: [1, 0.92, 1] });
  s.add(G.sphere(r2, 16, 12), SNOW, { pos: [lean * 0.4, y2, 0], scale: [1, 0.94, 1] });
  s.add(G.sphere(r3, 16, 12), SNOW, { pos: [lean, y3, 0] });
  // Visage : yeux, sourire en charbon, nez.
  for (const x of [-1, 1]) s.add(G.sphere(0.032, 8, 6), COAL, { pos: [lean + x * r3 * 0.36, y3 + r3 * 0.22, r3 * 0.9] });
  for (let i = 0; i < 5; i++) {
    const t = (i - 2) / 2;
    s.add(G.sphere(0.02, 6, 4), COAL, { pos: [lean + t * r3 * 0.42, y3 - r3 * 0.3 + Math.abs(t) * r3 * 0.14, r3 * 0.9] });
  }
  const nose = o.nose || 'carotte';
  if (nose === 'carotte') s.add(G.cone(0.045, 0.24, 10), '#f28a2e', { pos: [lean, y3, r3 + 0.1], rot: [Math.PI / 2, 0, 0] });
  else if (nose === 'pomme-pin') s.add(G.sphere(0.06, 8, 6), '#8a5a3a', { pos: [lean, y3, r3 + 0.03], scale: [0.9, 0.9, 1.4] });
  else s.add(G.sphere(0.055, 10, 8), '#d62f4a', { pos: [lean, y3, r3 + 0.02] });
  // Boutons.
  for (let i = 0; i < 3; i++) s.add(G.sphere(0.03, 8, 6), COAL, { pos: [lean * 0.4, y2 + r2 * (0.45 - i * 0.4), r2 * 0.96] });
  // Bras en branches.
  for (const x of [-1, 1]) {
    s.add(G.cyl(0.018, 0.026, 0.62, 6), WOOD, { pos: [x * (r2 + 0.22), y2 + 0.12, 0], rot: [0, 0, x * -1.05] });
    s.add(G.cyl(0.012, 0.016, 0.16, 5), WOOD, { pos: [x * (r2 + 0.44), y2 + 0.3, 0], rot: [0, 0, x * -0.3] });
  }
  // Écharpe : un tour au cou et un pan qui tombe.
  const sc = SNOWMAN_SCARVES[o.scarf] || SNOWMAN_SCARVES.rouge;
  const neckY = y2 + r2 * 0.72;
  s.add(G.torus(r2 * 0.72, 0.055, 8, 20), sc.color, { pos: [lean * 0.6, neckY, 0], rot: [Math.PI / 2, 0, 0] });
  s.add(G.box(0.11, 0.3, 0.035), sc.color, { pos: [lean * 0.6 + r2 * 0.4, neckY - 0.15, r2 * 0.72], rot: [0.15, 0, 0.18] });
  if (sc.stripe) {
    s.add(G.torus(r2 * 0.72, 0.057, 8, 20, Math.PI * 0.5), sc.stripe, { pos: [lean * 0.6, neckY, 0], rot: [Math.PI / 2, 0, 0.6] });
    s.add(G.box(0.113, 0.05, 0.037), sc.stripe, { pos: [lean * 0.6 + r2 * 0.4 + 0.01, neckY - 0.2, r2 * 0.72 + 0.005], rot: [0.15, 0, 0.18] });
  }
  // Chapeau.
  const top = y3 + r3 * 0.8;
  const hat = o.hat || 'bonnet';
  if (hat === 'bonnet') {
    const col = o.hatColor || '#ff8fab';
    s.add(new THREE.SphereGeometry(r3 * 0.92, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), col, { pos: [lean, top - r3 * 0.35, 0] });
    s.add(G.torus(r3 * 0.88, 0.035, 6, 18), '#fffaf2', { pos: [lean, top - r3 * 0.33, 0], rot: [Math.PI / 2, 0, 0] });
    s.add(G.sphere(0.06, 8, 6), '#fffaf2', { pos: [lean, top + r3 * 0.6, 0] });
  } else if (hat === 'seau') {
    s.add(G.cyl(r3 * 0.62, r3 * 0.8, 0.22, 14), o.hatColor || '#6f9fd6', { pos: [lean, top + 0.04, 0], rot: [0, 0, 0.12] });
  } else if (hat === 'haut-de-forme') {
    s.add(G.cyl(r3 * 1.05, r3 * 1.05, 0.025, 16), COAL, { pos: [lean, top - 0.02, 0] });
    s.add(G.cyl(r3 * 0.62, r3 * 0.62, 0.26, 16), COAL, { pos: [lean, top + 0.11, 0] });
    s.add(G.cyl(r3 * 0.63, r3 * 0.63, 0.045, 16), '#c0304f', { pos: [lean, top + 0.02, 0] });
  } else if (hat === 'paille') {
    s.add(G.cyl(r3 * 1.35, r3 * 1.35, 0.025, 18), '#e8c874', { pos: [lean, top - 0.03, 0] });
    s.add(G.cyl(r3 * 0.6, r3 * 0.68, 0.14, 14), '#e8c874', { pos: [lean, top + 0.04, 0] });
    s.add(G.cyl(r3 * 0.69, r3 * 0.69, 0.03, 14), '#ef6f94', { pos: [lean, top + 0.0, 0] });
  } else if (hat === 'oreilles') {
    for (const x of [-1, 1]) s.add(G.cone(0.08, 0.16, 4), o.hatColor || '#f2a65a', { pos: [lean + x * r3 * 0.55, top + 0.02, 0], rot: [0, Math.PI / 4, x * -0.3] });
  }
  return s;
}

/** Géométrie prête (couleurs par sommet), hauteur ≈ 1,6 m pour des boules bien roulées. */
export function snowmanGeometry(o) {
  return snowmanShape(o).build();
}
