import * as THREE from 'three';
import { Shape, G, vertexColorToon } from '../core/materials.js';

// Gestes de métier : pendant leurs heures de travail, les habitants s'activent à leur étal
// ou à leur poste, un outil en main — Bruno cloue et scie, Élise étale la pâte, Rose arrose
// ses semis, Noé scrute l'horizon aux jumelles, Paco secoue ses cocktails… Chaque geste est
// une pose construite par-dessus l'animation (bras, buste, tête), parfois une animation
// importée (ramasser, poser). Les outils sont tenus dans le repère du personnage, avec un
// mouvement propre (le marteau bascule avec le bras). Certains gestes font un bruit
// (marteau, scie, balai, couteau, shaker), entendu de près.

const WOOD = '#a0785a';
const METAL = '#9aa1ab';

function mesh(s) {
  return new THREE.Mesh(s.build(), vertexColorToon());
}

// Outils : poignée à l'origine (dans la main), manche le long de +Y.
const PROPS = {
  marteau() {
    const s = new Shape();
    s.add(G.cyl(0.018, 0.022, 0.34, 6), WOOD, { pos: [0, 0.12, 0] });
    s.add(G.box(0.05, 0.05, 0.16), '#6f7680', { pos: [0, 0.3, 0.02] });
    return mesh(s);
  },
  scie() {
    const s = new Shape();
    s.add(G.box(0.04, 0.12, 0.09), '#c0584a', { pos: [0, 0.02, 0] });
    s.add(G.box(0.006, 0.46, 0.11), '#d7dce2', { pos: [0, 0.3, 0.015] });
    return mesh(s);
  },
  pomme() {
    const s = new Shape();
    s.add(G.sphere(0.055, 10, 8), '#e5484d', { pos: [0, 0.03, 0.03] });
    s.add(G.cyl(0.005, 0.005, 0.03, 4), '#6b4a3a', { pos: [0, 0.09, 0.03] });
    return mesh(s);
  },
  rouleau() {
    const s = new Shape();
    s.add(G.cyl(0.032, 0.032, 0.34, 10), '#e9c99a', { pos: [0, 0.22, 0] });
    for (const y of [0.02, 0.42]) s.add(G.cyl(0.014, 0.014, 0.1, 6), '#c9a97a', { pos: [0, y, 0] });
    return mesh(s);
  },
  fouet() {
    const s = new Shape();
    s.add(G.cyl(0.014, 0.016, 0.14, 6), '#e5484d', { pos: [0, 0.03, 0] });
    for (let i = 0; i < 3; i++) s.add(G.torus(0.035, 0.004, 4, 12), METAL, { pos: [0, 0.16, 0], rot: [0, (i * Math.PI) / 3, 0], scale: [1, 1.8, 1] });
    return mesh(s);
  },
  bol() {
    const s = new Shape();
    s.add(new THREE.SphereGeometry(0.12, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#fffaf2', { pos: [0, 0.12, 0.06] });
    s.add(G.cyl(0.1, 0.1, 0.01, 14), '#f3dfb6', { pos: [0, 0.1, 0.06] });
    return mesh(s);
  },
  chiffon() {
    const s = new Shape();
    s.add(G.box(0.16, 0.025, 0.12), '#8fd6e8', { pos: [0, 0.01, 0.02] });
    return mesh(s);
  },
  plateau() {
    const s = new Shape();
    s.add(G.cyl(0.19, 0.19, 0.018, 16), '#d9dde3', { pos: [0, 0.03, 0.02] });
    s.add(G.cyl(0.04, 0.035, 0.08, 10), '#ffffff', { pos: [0.06, 0.08, 0.02] });
    s.add(G.cyl(0.035, 0.03, 0.02, 10), '#6b4a3a', { pos: [0.06, 0.115, 0.02] });
    s.add(G.sphere(0.035, 8, 6), '#ffb27a', { pos: [-0.07, 0.06, 0.04] });
    return mesh(s);
  },
  aiguille() {
    const s = new Shape();
    s.add(G.cyl(0.004, 0.002, 0.09, 4), '#e6e9ee', { pos: [0, 0.05, 0] });
    s.add(G.cyl(0.002, 0.002, 0.2, 3), '#ff8fab', { pos: [0, -0.06, 0.02], rot: [0.5, 0, 0] });
    return mesh(s);
  },
  tissu() {
    const s = new Shape();
    s.add(G.box(0.24, 0.012, 0.18), '#ff8fab', { pos: [0.04, 0.02, 0.04] });
    s.add(G.box(0.24, 0.013, 0.02), '#ffffff', { pos: [0.04, 0.021, 0.1] });
    return mesh(s);
  },
  arrosoir() {
    const s = new Shape();
    s.add(G.cyl(0.08, 0.09, 0.17, 12), '#7fd1b9', { pos: [0, -0.1, 0.02] });
    s.add(G.torus(0.06, 0.012, 5, 12, Math.PI), '#5fb89e', { pos: [0, -0.01, 0.02], rot: [0, Math.PI / 2, 0] });
    s.add(G.cyl(0.012, 0.018, 0.24, 6), '#5fb89e', { pos: [0, -0.06, 0.17], rot: [1.0, 0, 0] });
    s.add(G.cyl(0.03, 0.012, 0.03, 8), '#5fb89e', { pos: [0, 0.01, 0.27], rot: [1.0, 0, 0] });
    return mesh(s);
  },
  cle() {
    const s = new Shape();
    s.add(G.box(0.022, 0.2, 0.012), METAL, { pos: [0, 0.08, 0] });
    s.add(G.torus(0.028, 0.01, 5, 10, Math.PI * 1.6), METAL, { pos: [0, 0.2, 0], rot: [Math.PI / 2, 0, 0] });
    return mesh(s);
  },
  jumelles() {
    // Décalées vers les yeux (le -Z local monte une fois les jumelles tournées vers l'avant).
    const s = new Shape();
    // La main droite est à 0,23 m du milieu du visage : les jumelles sont centrées.
    for (const x of [0.185, 0.275]) {
      s.add(G.cyl(0.03, 0.036, 0.13, 10), '#3d3744', { pos: [x, 0.1, -0.3] });
      s.add(G.cyl(0.037, 0.037, 0.01, 10), '#8fd6e8', { pos: [x, 0.17, -0.3] });
    }
    s.add(G.box(0.05, 0.03, 0.02), '#3d3744', { pos: [0.23, 0.1, -0.3] });
    return mesh(s);
  },
  balai() {
    const s = new Shape();
    s.add(G.cyl(0.018, 0.018, 1.25, 6), WOOD, { pos: [0, 0.25, 0] });
    s.add(G.cone(0.13, 0.28, 10), '#e0c070', { pos: [0, 0.98, 0], rot: [Math.PI, 0, 0], scale: [1, 1, 0.45] });
    s.add(G.cyl(0.03, 0.03, 0.05, 8), '#c0584a', { pos: [0, 0.83, 0] });
    return mesh(s);
  },
  couteau() {
    const s = new Shape();
    s.add(G.box(0.02, 0.09, 0.025), '#6b4a3a', { pos: [0, 0.02, 0] });
    s.add(G.box(0.005, 0.07, 0.02), '#e6e9ee', { pos: [0, 0.1, 0.004] });
    return mesh(s);
  },
  buche() {
    const s = new Shape();
    s.add(G.cyl(0.05, 0.05, 0.18, 8), '#e9d5b7', { pos: [0, 0.05, 0.03], rot: [0, 0, Math.PI / 2] });
    return mesh(s);
  },
  carte() {
    const s = new Shape();
    s.add(G.box(0.36, 0.006, 0.26), '#fff1dc', { pos: [0.14, 0, 0.05] });
    s.add(G.box(0.18, 0.007, 0.1), '#7fd1b9', { pos: [0.1, 0, 0.02] });
    s.add(G.box(0.08, 0.008, 0.06), '#8fd6e8', { pos: [0.22, 0, 0.1] });
    s.add(G.box(0.1, 0.008, 0.012), '#e5484d', { pos: [0.18, 0, 0.0] });
    return mesh(s);
  },
  longuevue() {
    // Oculaire à hauteur de l'œil (voir les jumelles).
    const s = new Shape();
    s.add(G.cyl(0.03, 0.036, 0.16, 12), '#e0b84a', { pos: [0.19, 0.16, -0.22] });
    s.add(G.cyl(0.04, 0.046, 0.16, 12), '#d4a93c', { pos: [0.19, 0.31, -0.22] });
    s.add(G.cyl(0.05, 0.055, 0.16, 12), '#e0b84a', { pos: [0.19, 0.46, -0.22] });
    for (const y of [0.235, 0.385]) s.add(G.cyl(0.05, 0.05, 0.02, 12), '#8a5a33', { pos: [0.19, y, -0.22] });
    s.add(G.cyl(0.05, 0.05, 0.01, 12), '#bfe8f5', { pos: [0.19, 0.545, -0.22] });
    return mesh(s);
  },
  masque() {
    const s = new Shape();
    s.add(G.box(0.17, 0.08, 0.035), '#3d3744', { pos: [0.02, 0.05, 0.05] });
    s.add(G.box(0.14, 0.06, 0.037), '#bfe8f5', { pos: [0.02, 0.05, 0.05] });
    s.add(G.cyl(0.012, 0.012, 0.18, 5), '#ff9a3d', { pos: [0.12, 0.12, 0.05], rot: [0, 0, 0.4] });
    return mesh(s);
  },
  shaker() {
    const s = new Shape();
    s.add(G.cyl(0.042, 0.034, 0.16, 12), '#d9dde3', { pos: [0, 0.06, 0] });
    s.add(G.cyl(0.03, 0.042, 0.05, 12), '#c9ced6', { pos: [0, 0.165, 0] });
    s.add(G.sphere(0.016, 6, 5), '#c9ced6', { pos: [0, 0.2, 0] });
    return mesh(s);
  },
  pinceau() {
    const s = new Shape();
    s.add(G.cyl(0.008, 0.01, 0.22, 6), '#e5484d', { pos: [0, 0.08, 0] });
    s.add(G.cone(0.014, 0.05, 6), '#6fa8dc', { pos: [0, 0.21, 0] });
    return mesh(s);
  },
  palette() {
    const s = new Shape();
    s.add(G.cyl(0.14, 0.14, 0.014, 16), '#e9c99a', { pos: [0.05, 0.01, 0.06], scale: [1, 1, 0.8] });
    const cols = ['#e5484d', '#ffd84d', '#6fa8dc', '#7fd1b9', '#b69cf0'];
    cols.forEach((c, i) => {
      const a = (i / cols.length) * Math.PI * 1.4 + 0.4;
      s.add(G.sphere(0.022, 6, 4), c, { pos: [0.05 + Math.cos(a) * 0.09, 0.02, 0.06 + Math.sin(a) * 0.07], scale: [1, 0.4, 1] });
    });
    return mesh(s);
  },
};

const P2 = Math.PI * 2;
const up = (t, hz) => 0.5 - 0.5 * Math.cos(t * hz * P2); // 0 → 1 → 0
const sin = (t, hz, ph = 0) => Math.sin(t * hz * P2 + ph);

// Un geste : durée [min, max], outils (main droite r, main gauche l), pose(t, T) qui tourne
// les os (T(os, x, y, z)) et renvoie l'orientation des outils (angles dans le repère du
// personnage), éventuellement des animations importées (clips : [[action, début]]),
// un rythme (coups par seconde) et le bruit de chaque coup.
const M = (o) => ({ dur: [3, 5], ...o });

export const JOBS = {
  rose: {
    rest: [2, 5],
    moves: [
      M({
        name: 'arroser', props: { r: 'arrosoir' }, dur: [3.5, 5],
        pose(t, T) {
          const tilt = up(t, 0.35);
          T('upperarm.r', -1.15 - tilt * 0.15, 0, 0.12);
          T('lowerarm.r', -0.3, 0, 0);
          T('chest', 0.12, 0, 0);
          T('head', 0.3, 0, 0);
          return { r: [0.15 + tilt * 0.75, 0, 0] };
        },
      }),
    ],
  },
  pomme: {
    rest: [2, 4],
    moves: [
      M({ name: 'ranger les fruits', props: { r: 'pomme' }, dur: [3, 3], clips: [['pick', 0], ['pet', 1.5]], pose: () => ({ r: [0, 0, 0] }) }),
      M({
        name: 'appeler les clients', dur: [2, 2.5],
        pose(t, T) {
          T('upperarm.r', -1.15, 0, 0.45);
          T('lowerarm.r', -1.9, 0, 0);
          T('upperarm.l', 0, 0, 1.6 + sin(t, 2) * 0.35);
          T('head', -0.15, 0, 0);
          return {};
        },
      }),
    ],
  },
  bruno: {
    rest: [1.5, 4],
    moves: [
      M({
        name: 'clouer', props: { r: 'marteau' }, beat: 1.6, sound: 'knock', dur: [3.5, 6],
        pose(t, T) {
          const lift = up(t + 0.3125, 1.6);
          T('upperarm.r', -0.55 - lift * 0.55, 0, 0.18);
          T('lowerarm.r', -0.35 - lift * 0.55, 0, 0);
          T('upperarm.l', -0.55, 0, -0.1);
          T('lowerarm.l', -0.5, 0, 0);
          T('chest', 0.1, 0, 0);
          T('head', 0.25, 0, 0);
          return { r: [1.55 - lift * 1.35, 0, 0] };
        },
      }),
      M({
        name: 'scier', props: { r: 'scie' }, beat: 2.4, sound: 'saw', dur: [3, 5],
        pose(t, T) {
          const s = sin(t, 1.2);
          T('upperarm.r', -0.75 + s * 0.3, 0, 0.15);
          T('lowerarm.r', -0.7 - s * 0.45, 0, 0);
          T('upperarm.l', -0.7, 0, -0.15);
          T('lowerarm.l', -0.5, 0, 0);
          T('chest', 0.18, 0.1, 0);
          T('head', 0.22, 0, 0);
          return { r: [1.95 + s * 0.2, 0, 0] };
        },
      }),
    ],
  },
  lila: {
    rest: [2, 4],
    moves: [
      M({
        name: 'coudre', props: { r: 'aiguille', l: 'tissu' }, dur: [4, 6],
        pose(t, T) {
          const pull = Math.max(0, sin(t, 0.7)) ** 2;
          T('upperarm.l', -0.65, 0, -0.3);
          T('lowerarm.l', -0.85, 0, 0);
          T('upperarm.r', -0.65 - pull * 0.35, 0, 0.3 - pull * 0.7);
          T('lowerarm.r', -0.85 + pull * 0.45, 0, 0);
          T('head', 0.35, 0, 0);
          return { r: [0.9 - pull * 0.6, 0, 0], l: [0, 0, 0] };
        },
      }),
    ],
  },
  noe: {
    rest: [1.5, 3],
    moves: [
      M({
        name: 'jumelles', props: { r: 'jumelles' }, dur: [3, 5],
        pose(t, T) {
          const look = sin(t, 0.18) * 0.45;
          // Mains de part et d'autre du visage (angles calculés pour ces bras courts).
          T('upperarm.l', -1.3, 0, -1.2);
          T('upperarm.r', -1.3, 0, 1.2);
          T('lowerarm.l', -1.4, 0, 0);
          T('lowerarm.r', -1.3, 0, 0);
          T('chest', -0.05, look * 0.5, 0);
          T('head', -0.15, look, 0);
          return { r: [Math.PI / 2 - 0.15, look * 1.5, 0] };
        },
      }),
    ],
  },
  mimi: {
    rest: [2, 4],
    moves: [
      M({
        name: 'essuyer le comptoir', props: { r: 'chiffon' }, beat: 0.9, sound: 'swish', dur: [3, 5],
        pose(t, T) {
          T('upperarm.r', -1.05 + sin(t, 0.9) * 0.12, 0, 0.2 + Math.cos(t * 0.9 * P2) * 0.22);
          T('lowerarm.r', -0.4, 0, 0);
          T('chest', 0.15, sin(t, 0.9) * 0.08, 0);
          T('head', 0.3, 0, 0);
          return { r: [0, 0, 0] };
        },
      }),
      M({
        name: 'servir', props: { l: 'plateau' }, dur: [2.5, 3.5],
        pose(t, T) {
          T('upperarm.l', -0.55, 0, 0.35);
          T('lowerarm.l', -1.7, 0, 0);
          T('upperarm.r', -0.2, 0, -0.15);
          T('head', 0, sin(t, 0.3) * 0.3, 0);
          return { l: [0, 0, 0] };
        },
      }),
    ],
  },
  leo: {
    rest: [2, 4],
    moves: [
      M({
        name: 'visser', props: { r: 'cle' }, beat: 1.5, dur: [3, 5],
        pose(t, T) {
          const tw = sin(t, 1.5);
          T('upperarm.r', -0.8, 0, 0.2);
          T('lowerarm.r', -0.55, tw * 0.25, 0);
          T('upperarm.l', -0.75, 0, -0.25);
          T('lowerarm.l', -0.3, 0, 0);
          T('chest', 0.35, 0, 0);
          T('head', 0.35, 0, 0);
          return { r: [Math.PI / 2, 0, tw * 0.7] };
        },
      }),
      M({ name: 'vérifier une roue', props: { r: 'cle' }, dur: [1.6, 1.6], clips: [['pick', 0]], pose: () => ({ r: [Math.PI / 2, 0, 0] }) }),
    ],
  },
  aurele: {
    rest: [1.5, 3.5],
    moves: [
      M({
        name: 'balayer', props: { r: 'balai' }, beat: 1.6, sound: 'swish', dur: [4, 6],
        pose(t, T) {
          const s = sin(t, 0.8);
          T('upperarm.r', -0.55, 0, 0.15 + s * 0.25);
          T('upperarm.l', -0.75, 0, -0.1 + s * 0.25);
          T('lowerarm.l', -0.6, 0, 0);
          T('lowerarm.r', -0.2, 0, 0);
          T('chest', 0.2, s * 0.25, 0);
          T('head', 0.3, 0, 0);
          return { r: [2.5, 0, s * 0.35] };
        },
      }),
    ],
  },
  elise: {
    rest: [2, 4],
    moves: [
      M({
        name: 'étaler la pâte', props: { r: 'rouleau' }, dur: [3.5, 5],
        pose(t, T) {
          const s = sin(t, 0.9);
          T('upperarm.l', -1.2 - s * 0.15, 0, -0.35);
          T('upperarm.r', -1.2 - s * 0.15, 0, 0.35);
          T('lowerarm.l', -0.3 + s * 0.3, 0, 0);
          T('lowerarm.r', -0.3 + s * 0.3, 0, 0);
          T('chest', 0.2 + s * 0.08, 0, 0);
          T('head', 0.3, 0, 0);
          return { r: [0, 0, -Math.PI / 2] };
        },
      }),
      M({
        name: 'fouetter', props: { r: 'fouet', l: 'bol' }, beat: 2.5, dur: [3, 4],
        pose(t, T) {
          T('upperarm.l', -0.7, 0, -0.25);
          T('lowerarm.l', -0.9, 0, 0);
          T('upperarm.r', -0.7 + sin(t, 2.5) * 0.08, 0, 0.32 + Math.cos(t * 2.5 * P2) * 0.08);
          T('lowerarm.r', -0.95, 0, 0);
          T('head', 0.35, 0, 0);
          return { r: [2.7, 0, 0], l: [0, 0, 0] };
        },
      }),
    ],
  },
  hugo: {
    rest: [2, 4],
    moves: [
      M({
        name: 'sculpter', props: { r: 'couteau', l: 'buche' }, beat: 1.3, sound: 'scrape', dur: [4, 6],
        pose(t, T) {
          const k = (t * 1.3) % 1;
          const stroke = k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.65;
          T('upperarm.l', -0.7, 0, -0.25);
          T('lowerarm.l', -0.85, 0, 0);
          T('upperarm.r', -0.65 + stroke * 0.18, 0, 0.35);
          T('lowerarm.r', -0.85 + stroke * 0.35, 0, 0);
          T('chest', 0.2, 0, 0);
          T('head', 0.38, 0, 0);
          return { r: [1.1 + stroke * 0.3, 0, 0], l: [0, 0, 0] };
        },
      }),
    ],
  },
  sacha: {
    rest: [1.5, 3],
    moves: [
      M({
        name: 'lire la carte', props: { r: 'carte' }, dur: [3, 4.5],
        pose(t, T) {
          T('upperarm.l', -0.85, 0, -0.35);
          T('upperarm.r', -0.85, 0, 0.35);
          T('lowerarm.l', -0.7, 0, 0);
          T('lowerarm.r', -0.7, 0, 0);
          T('head', 0.4, sin(t, 0.25) * 0.15, 0);
          return { r: [-0.9, 0, 0] };
        },
      }),
      M({
        name: 'montrer les sommets', dur: [2, 2.5],
        pose(t, T) {
          T('upperarm.r', -1.65, 0, 0.1);
          T('lowerarm.r', -0.1, 0, 0);
          T('head', -0.25, 0, 0);
          return {};
        },
      }),
    ],
  },
  neree: {
    rest: [2, 4],
    moves: [
      M({
        name: 'longue-vue', props: { r: 'longuevue' }, dur: [3.5, 5],
        pose(t, T) {
          const look = sin(t, 0.15) * 0.4;
          T('upperarm.r', -0.4, 0, 1.2);
          T('lowerarm.r', -2.1, 0, 0);
          T('upperarm.l', -0.8, 0, -1.2);
          T('lowerarm.l', -1.4, 0, 0);
          T('chest', -0.05, look * 0.6, 0);
          T('head', -0.1, look, 0);
          return { r: [Math.PI / 2 - 0.1, look * 1.6, 0] };
        },
      }),
    ],
  },
  coralie: {
    rest: [2, 4],
    moves: [
      M({
        name: 'nettoyer le masque', props: { l: 'masque', r: 'chiffon' }, dur: [3.5, 5],
        pose(t, T) {
          T('upperarm.l', -0.75, 0, -0.2);
          T('lowerarm.l', -0.8, 0, 0);
          T('upperarm.r', -0.75 + sin(t, 1.2) * 0.1, 0, 0.3 + Math.cos(t * 1.2 * P2) * 0.1);
          T('lowerarm.r', -0.9, 0, 0);
          T('head', 0.3, 0, 0);
          return { l: [-0.35, 0, 0], r: [0, 0, 0] };
        },
      }),
    ],
  },
  paco: {
    rest: [2, 4],
    moves: [
      M({
        name: 'secouer un cocktail', props: { r: 'shaker' }, beat: 3, sound: 'shake', dur: [2.5, 3.5],
        pose(t, T) {
          const s = sin(t, 3);
          T('upperarm.r', -0.9 + s * 0.22, 0, -0.2);
          T('lowerarm.r', -1.75 + s * 0.15, 0, 0);
          T('upperarm.l', -1.05 + s * 0.22, 0, -0.55);
          T('lowerarm.l', -1.6, 0, 0);
          T('chest', 0, 0, s * 0.05);
          T('head', 0, 0.2, 0);
          return { r: [0.2, 0, s * 0.2] };
        },
      }),
    ],
  },
  maelys: {
    rest: [2, 4],
    moves: [
      M({
        name: 'peindre', props: { r: 'pinceau', l: 'palette' }, dur: [4, 6],
        pose(t, T) {
          T('upperarm.l', -0.5, 0, -0.2);
          T('lowerarm.l', -1.0, 0, 0);
          T('upperarm.r', -0.95 + sin(t, 0.8) * 0.18, 0, 0.2 + sin(t, 0.35) * 0.12);
          T('lowerarm.r', -0.55 + sin(t, 0.8, 1) * 0.12, 0, 0);
          T('head', 0.1, sin(t, 0.35) * 0.1, 0);
          return { r: [1.25, 0, 0], l: [0, 0, 0] };
        },
      }),
    ],
  },
};

/** Outil d'un geste (construit à la demande, gardé pour les fois suivantes). */
export function buildProp(name) {
  const make = PROPS[name];
  return make ? make() : null;
}
