import * as THREE from 'three';
import { Shape, G, vertexColorToon, withOutline } from '../core/materials.js';

// Espèces d'animaux : fiche (nom, nourriture préférée, caractère) + modèle 3D
// construit à partir de primitives. Chaque animal regarde vers +Z, pieds à y = 0.

// Les nourritures sont des objets du registre général.
export { ITEMS as FOODS } from '../game/items.js';

export const SPECIES = {
  chat: {
    label: 'Chat', emoji: '🐱', fav: 'poisson', shy: 0.2, speed: 1.4, gait: 'walk', sound: 'Miaou !',
    desc: 'Indépendant mais très câlin une fois en confiance.',
    variants: [
      { name: 'Roux tigré', main: '#f5a55a', belly: '#fff4e6', accent: '#e07b39', stripes: true },
      { name: 'Minuit', main: '#3d3744', belly: '#5a5263', accent: '#2a2530', eye: '#e8c547' },
      { name: 'Neige', main: '#fbf8f4', belly: '#ffffff', accent: '#ffd0dc', eye: '#5aa9e6' },
      { name: 'Gris perle', main: '#a3abb8', belly: '#eef1f5', accent: '#7d8694', stripes: true },
      { name: 'Siamois', main: '#f3e6d3', belly: '#fff8ee', accent: '#5e4436', points: true, eye: '#5aa9e6' },
      { name: 'Calico', main: '#fffaf2', belly: '#ffffff', accent: '#f2a65a', patches: ['#f2a65a', '#3d3744'] },
      { name: 'Maine Coon', main: '#8a6a52', belly: '#e8d8c4', accent: '#5a4032', stripes: true, fluffy: true, tufts: true, big: true, eye: '#8fb84a' },
      { name: 'Persan crème', main: '#f3e3c8', belly: '#fffaf0', accent: '#e8cfa8', fluffy: true, flat: true, eye: '#e0a000' },
      { name: 'Sphynx', main: '#f2c9b6', belly: '#f7dccf', accent: '#e8b4a0', hairless: true, eye: '#5aa9e6' },
      { name: 'Smoking', main: '#2e2a33', belly: '#ffffff', accent: '#2e2a33', tuxedo: true, eye: '#8fd66a' },
      { name: 'Écaille de tortue', main: '#3d2c24', belly: '#6b4326', accent: '#d9793a', patches: ['#d9793a', '#8a5a3a'], eye: '#e0a000' },
      { name: 'Chartreux', main: '#8a93a8', belly: '#a3abbd', accent: '#737c90', eye: '#e0a000' },
      { name: 'Bengal', main: '#e0a060', belly: '#fff0dc', accent: '#5a3a22', spots: true, eye: '#8fb84a' },
      { name: 'Scottish Fold', main: '#c9c2b8', belly: '#f3efe8', accent: '#9a938a', fold: true, stripes: true, eye: '#e0a000' },
      { name: 'Munchkin', main: '#f5a55a', belly: '#fff4e6', accent: '#e07b39', short: true, stripes: true },
      { name: 'Ragdoll', main: '#f5efe6', belly: '#ffffff', accent: '#8a7a6a', points: true, fluffy: true, eye: '#5aa9e6' },
      { name: 'Chaton roux', main: '#f5a55a', belly: '#fff4e6', accent: '#e07b39', stripes: true, baby: true },
      { name: 'Chaton gris', main: '#a3abb8', belly: '#eef1f5', accent: '#7d8694', baby: true, eye: '#5aa9e6' },
      { name: 'Chaton noir', main: '#3d3744', belly: '#56505e', accent: '#2a2530', baby: true, eye: '#8fd66a' },
    ],
  },
  chien: {
    label: 'Chien', emoji: '🐶', fav: 'pomme', shy: 0.1, speed: 1.8, gait: 'walk', sound: 'Ouaf !',
    desc: 'Joueur et fidèle, il adore les balades.',
    variants: [
      { name: 'Shiba', main: '#e8a25c', belly: '#fff5e8', accent: '#fff5e8', ears: 'pointy', tail: 'curl' },
      { name: 'Golden', main: '#e9c47e', belly: '#f8e6c0', accent: '#d9a95e', ears: 'floppy', tail: 'fluffy' },
      { name: 'Noir et feu', main: '#35313c', belly: '#d9894a', accent: '#d9894a', ears: 'floppy', tail: 'thin' },
      { name: 'Dalmatien', main: '#fbf8f4', belly: '#ffffff', accent: '#2e2a33', ears: 'floppy', tail: 'thin', spots: '#2e2a33' },
      { name: 'Corgi', main: '#e89a4f', belly: '#ffffff', accent: '#ffffff', ears: 'pointy', tail: 'pom', short: true },
    ],
  },
  lapin: {
    label: 'Lapin', emoji: '🐰', fav: 'carotte', shy: 0.6, speed: 1.9, gait: 'hop', sound: '*frétille du nez*',
    desc: 'Timide : approche-toi en marchant, sans courir.',
    variants: [
      { name: 'Flocon', main: '#fbf8f4', belly: '#ffffff', accent: '#ffc2d1' },
      { name: 'Noisette', main: '#c09068', belly: '#f3e3d0', accent: '#ffc2d1' },
      { name: 'Nuage', main: '#a9a9b5', belly: '#eeeef2', accent: '#ffc2d1' },
      { name: 'Bélier', main: '#ead7b8', belly: '#fff8ec', accent: '#ffc2d1', lop: true },
      { name: 'Hollandais', main: '#3d3744', belly: '#ffffff', accent: '#ffc2d1', mask: true },
    ],
  },
  renard: {
    label: 'Renard', emoji: '🦊', fav: 'baie', shy: 0.85, speed: 2.0, gait: 'walk', sound: '*glapit doucement*',
    desc: 'Très farouche. Nourris-le avant de tenter une caresse.',
    variants: [
      { name: 'Roux', main: '#f08a3c', belly: '#fff6ea', accent: '#3a2c2a' },
      { name: 'Arctique', main: '#f4f6fa', belly: '#ffffff', accent: '#b9c2d0' },
      { name: 'Argenté', main: '#6f6a78', belly: '#e8e6ee', accent: '#2e2a33' },
    ],
  },
  canard: {
    label: 'Canard', emoji: '🦆', fav: 'graine', shy: 0.4, speed: 1.1, gait: 'waddle', sound: 'Coin coin !',
    desc: "Il adore barboter dans l'étang.",
    variants: [
      { name: 'Blanc', main: '#fbf8f4', belly: '#ffffff', accent: '#ffa53a', head: '#fbf8f4' },
      { name: 'Colvert', main: '#b7b0a4', belly: '#8a5a3e', accent: '#ffa53a', head: '#2f8f5a', collar: true },
      { name: 'Caneton', main: '#ffe27a', belly: '#fff0a8', accent: '#ffa53a', head: '#ffe27a', baby: true },
    ],
  },
  mouton: {
    label: 'Mouton', emoji: '🐑', fav: 'carotte', shy: 0.3, speed: 1.1, gait: 'walk', sound: 'Bêêê !',
    desc: 'Doux comme un nuage, un peu gourmand.',
    variants: [
      { name: 'Laineux', main: '#fbf6ee', belly: '#fbf6ee', accent: '#3d3744' },
      { name: 'Crème', main: '#f3e3c3', belly: '#f3e3c3', accent: '#f0d2b4' },
      { name: 'Charbon', main: '#5a5462', belly: '#5a5462', accent: '#2a2530' },
      { name: 'Barbe à papa', main: '#ffd6e5', belly: '#ffd6e5', accent: '#f5e1d6' },
    ],
  },
  faon: {
    label: 'Faon', emoji: '🦌', fav: 'pomme', shy: 0.9, speed: 2.2, gait: 'walk', sound: '*remue les oreilles*',
    desc: 'Le plus farouche de la forêt. Beaucoup de patience !',
    variants: [
      { name: 'Tacheté', main: '#c98b58', belly: '#fff6ea', accent: '#4a3428' },
      { name: 'Doré', main: '#e3ad62', belly: '#fff6ea', accent: '#5a4030' },
      { name: 'Lune', main: '#f3ece3', belly: '#ffffff', accent: '#b9a99a' },
    ],
  },
  herisson: {
    label: 'Hérisson', emoji: '🦔', fav: 'baie', shy: 0.5, speed: 0.8, gait: 'walk', sound: '*renifle*',
    desc: 'Petit, piquant et très curieux.',
    variants: [
      { name: 'Châtaigne', main: '#7a5a44', belly: '#f3dcc0', accent: '#5a4032' },
      { name: 'Sable', main: '#c9a57a', belly: '#fff1e0', accent: '#a07e58' },
      { name: 'Chocolat', main: '#4d3a30', belly: '#e8cfb2', accent: '#35271f' },
    ],
  },
  pandaRoux: {
    label: 'Panda roux', emoji: '🦝', fav: 'fraise', shy: 0.6, speed: 1.5, gait: 'walk', sound: '*couine joyeusement*',
    desc: 'Un grimpeur gourmand qui adore les fruits rouges.',
    variants: [
      { name: 'Classique', main: '#c8552f', belly: '#3a2c2a', accent: '#fff4e6' },
      { name: 'Cannelle', main: '#d9793a', belly: '#4a3428', accent: '#fff4e6' },
      { name: 'Chocolat', main: '#7a4a32', belly: '#2e2420', accent: '#f3e3d0' },
    ],
  },
  poule: {
    label: 'Poule', emoji: '🐔', fav: 'mais', shy: 0.3, speed: 1.2, gait: 'waddle', sound: 'Cot cot !',
    desc: 'Elle picore près du moulin et adore le maïs.',
    variants: [
      { name: 'Rousse', main: '#c9743a', belly: '#e9a86a', accent: '#ffb02e' },
      { name: 'Blanche', main: '#fbf8f4', belly: '#ffffff', accent: '#ffb02e' },
      { name: 'Noire', main: '#3d3744', belly: '#56505e', accent: '#ffb02e' },
      { name: 'Poussin', main: '#ffe27a', belly: '#fff0a8', accent: '#ff9f2e', baby: true },
    ],
  },
  oiseau: {
    label: 'Oiseau', emoji: '🐦', fav: 'graine', shy: 0.75, speed: 1.6, gait: 'hop', sound: 'Cui cui !',
    desc: 'Minuscule et craintif. Les graines l\'attirent.',
    variants: [
      { name: 'Mésange bleue', main: '#5aa9e6', belly: '#ffe066', accent: '#2e2a33' },
      { name: 'Rouge-gorge', main: '#a0785a', belly: '#ff8a3d', accent: '#f3e3d0' },
      { name: 'Moineau', main: '#b08a64', belly: '#f3e3d0', accent: '#6b4a3a' },
      { name: 'Canari', main: '#ffd84d', belly: '#fff0a8', accent: '#ff9f2e' },
    ],
  },
  tortue: {
    label: 'Tortue', emoji: '🐢', fav: 'tomate', shy: 0.25, speed: 0.5, gait: 'walk', sound: '*cligne lentement*',
    desc: 'Elle prend son temps sur la plage.',
    variants: [
      { name: 'Verte', main: '#7cbc55', belly: '#f3e3b0', accent: '#8a6a3a' },
      { name: 'Lagon', main: '#6fc4b8', belly: '#e8f6f0', accent: '#3a7f86' },
      { name: 'Étoilée', main: '#8fbf5a', belly: '#f3e3b0', accent: '#3d3744', stars: true },
    ],
  },
  // Île des Pins.
  ecureuil: {
    label: 'Écureuil', emoji: '🐿️', fav: 'pomme-pin', shy: 0.7, speed: 2.1, gait: 'hop', sound: '*grignote*',
    desc: 'Il cache ses provisions dans la Grande Pinède.',
    variants: [
      { name: 'Roux', main: '#c8642f', belly: '#fff0dc', accent: '#a04a22' },
      { name: 'Gris', main: '#8d8a94', belly: '#f1eef2', accent: '#6d6a74' },
      { name: 'Noir', main: '#3a3038', belly: '#5a4d56', accent: '#2a2228' },
    ],
  },
  chevre: {
    label: 'Chèvre des neiges', emoji: '🐐', fav: 'myrtille', shy: 0.45, speed: 1.4, gait: 'walk', sound: 'Mêêê !',
    desc: 'Elle escalade les rochers du Pic des Neiges sans jamais glisser.',
    variants: [
      { name: 'Blanche', main: '#f6f3ec', belly: '#ffffff', accent: '#b9aa94' },
      { name: 'Chamois', main: '#b98a5a', belly: '#f0dcc0', accent: '#4a3428' },
      { name: 'Pie', main: '#fbf8f4', belly: '#ffffff', accent: '#3d3744', patch: '#3d3744' },
      { name: 'Chevreau', main: '#e9dccb', belly: '#fff8ee', accent: '#b9a99a', baby: true },
    ],
  },
  loutre: {
    label: 'Loutre', emoji: '🦦', fav: 'poisson', shy: 0.5, speed: 1.6, gait: 'waddle', sound: '*fait des bulles*',
    desc: 'Elle nage sur le dos dans le Lac Miroir. Elle adore le poisson.',
    variants: [
      { name: 'Châtaigne', main: '#7a5238', belly: '#e8cfae', accent: '#4f3322' },
      { name: 'Caramel', main: '#b07a4a', belly: '#f5e3c8', accent: '#7a5238' },
      { name: 'Loutre de mer', main: '#5d4b43', belly: '#d9cbbd', accent: '#3a2c26' },
    ],
  },
  // Île Corail.
  perroquet: {
    label: 'Perroquet', emoji: '🦜', fav: 'noix-coco', shy: 0.55, speed: 1.3, gait: 'hop', sound: 'Coucou ! Coucou !',
    desc: 'Bavard et coloré, il répète tout ce qu\'il entend à Port-Corail.',
    variants: [
      { name: 'Ara rouge', main: '#e5484d', belly: '#ffd84d', accent: '#3f8ee8', tail: '#3f8ee8' },
      { name: 'Ara bleu', main: '#3f8ee8', belly: '#ffd84d', accent: '#2e2a33', tail: '#3f8ee8' },
      { name: 'Perruche verte', main: '#5fc46a', belly: '#c6f07a', accent: '#e5484d', tail: '#3f8ee8' },
      { name: 'Cacatoès', main: '#fbf8f4', belly: '#fffbe8', accent: '#ffd84d', tail: '#fbf8f4', crest: true },
    ],
  },
};

// --- Aides de construction --------------------------------------------------

const _dir = new THREE.Vector3();
function onSphere(center, r, az, el, scale = [1, 1, 1]) {
  _dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  return {
    pos: [center[0] + _dir.x * r * scale[0], center[1] + _dir.y * r * scale[1], center[2] + _dir.z * r * scale[2]],
    dir: [_dir.x, _dir.y, _dir.z],
  };
}

/** Deux yeux brillants autour de `center` (repère de la tête). */
function eyes(headR, { az = 0.52, el = 0.12, size = 0.042, color = '#2b1d1d', scale = [1, 1, 1] } = {}) {
  const s = new Shape();
  const spots = [-1, 1].map((side) => onSphere([0, 0, 0], headR * 0.97, side * az, el, scale));
  const cy = spots[0].pos[1];
  const cz = spots[0].pos[2];
  for (const [i, p] of spots.entries()) {
    const side = i === 0 ? -1 : 1;
    const pos = [p.pos[0], p.pos[1] - cy, p.pos[2] - cz];
    s.add(G.sphere(size, 12, 10), color, { pos, dir: p.dir, scale: [1, 1.18, 0.55] });
    if (color !== '#2b1d1d') s.add(G.sphere(size * 0.55, 10, 8), '#1d1418', { pos: [pos[0] + p.dir[0] * size * 0.42, pos[1] + p.dir[1] * size * 0.42, pos[2] + p.dir[2] * size * 0.42], dir: p.dir, scale: [0.62, 1.2, 0.45] });
    s.add(G.sphere(size * 0.34, 8, 6), '#ffffff', {
      pos: [pos[0] + p.dir[0] * size * 0.45 - side * size * 0.25, pos[1] + size * 0.4, pos[2] + p.dir[2] * size * 0.45],
    });
  }
  return { geo: s.build(), center: [0, cy, cz] };
}

function legGeo(len, r, main, paw) {
  const s = new Shape();
  s.add(G.capsule(r, Math.max(len - r * 2, 0.01), 4, 8), main, { pos: [0, -len / 2, 0] });
  s.add(G.sphere(r * 1.12, 10, 8), paw, { pos: [0, -len + r * 0.6, r * 0.25], scale: [1, 0.75, 1.2] });
  return s.build();
}

function earGeo(type, size, main, inner, side) {
  const s = new Shape();
  switch (type) {
    case 'round':
      s.add(G.sphere(size, 10, 8), main, { scale: [1, 1, 0.45] });
      s.add(G.sphere(size * 0.62, 8, 6), inner, { pos: [0, 0, size * 0.22], scale: [1, 1, 0.3] });
      break;
    case 'long':
      s.add(G.sphere(size, 12, 10), main, { pos: [0, size * 2.2, 0], scale: [0.55, 2.4, 0.3] });
      s.add(G.sphere(size * 0.7, 10, 8), inner, { pos: [0, size * 2.2, size * 0.08], scale: [0.45, 2.6, 0.25] });
      break;
    case 'lop':
      s.add(G.sphere(size, 12, 10), main, { pos: [side * size * 0.6, -size * 1.4, 0], rot: [0, 0, side * 0.25], scale: [0.55, 2.0, 0.35] });
      break;
    case 'floppy':
      s.add(G.sphere(size, 12, 10), main, { pos: [side * size * 0.3, -size * 0.9, 0], rot: [0, 0, side * 0.35], scale: [0.6, 1.5, 0.35] });
      break;
    default: // pointy
      s.add(G.cone(size * 0.75, size * 1.5, 8), main, { pos: [0, size * 0.7, 0], scale: [1, 1, 0.5] });
      s.add(G.cone(size * 0.45, size * 1.0, 8), inner, { pos: [0, size * 0.6, size * 0.12], scale: [1, 1, 0.35] });
      break;
  }
  return s;
}

// --- Construction du modèle -------------------------------------------------

export function buildAnimal(speciesId, variantIndex) {
  const sp = SPECIES[speciesId];
  const v = sp.variants[variantIndex % sp.variants.length];
  const m = {
    root: new THREE.Group(),
    body: new THREE.Group(),
    head: new THREE.Group(),
    legs: [],
    tail: null,
    wings: [],
    eyes: null,
    anchors: { neck: { pos: [0, 0.5, 0.2], r: 0.12 }, top: { pos: [0, 0.2, 0] } },
    height: 0.8,
    radius: 0.4,
    scale: 1,
  };
  m.root.add(m.body);
  m.body.add(m.head);
  const builders = {
    chat: buildCat, chien: buildDog, lapin: buildRabbit, renard: buildFox, canard: buildDuck, mouton: buildSheep, faon: buildDeer, herisson: buildHedgehog,
    pandaRoux: buildRedPanda, poule: buildHen, oiseau: buildBird, tortue: buildTurtle, ecureuil: buildSquirrel, chevre: buildGoat, loutre: buildOtter, perroquet: buildParrot,
  };
  builders[speciesId](m, v);
  const mat = vertexColorToon();
  const meshes = [];
  m.root.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  for (const o of meshes) {
    o.castShadow = true;
    if (o.userData.outline !== false) withOutline(o, 0.012);
  }
  m.root.scale.setScalar(m.scale);
  m.material = mat;
  return m;
}

function mesh(geo, parent, { outline = true } = {}) {
  const me = new THREE.Mesh(geo, vertexColorToon());
  me.userData.outline = outline;
  parent.add(me);
  return me;
}

function addLegs(m, positions, len, main, paw, r = 0.05) {
  for (const [x, y, z, pair] of positions) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    m.body.add(pivot);
    mesh(legGeo(len, r, main, paw), pivot);
    m.legs.push({ pivot, pair });
  }
}

function addEyes(m, headR, opts) {
  const e = eyes(headR, opts);
  m.eyes = mesh(e.geo, m.head, { outline: false });
  m.eyes.position.set(...e.center);
}

function addTail(m, pos, shape) {
  const pivot = new THREE.Group();
  pivot.position.set(...pos);
  m.body.add(pivot);
  mesh(shape.build(), pivot);
  m.tail = pivot;
}

function buildCat(m, v) {
  const main = v.main;
  const acc = v.accent;
  const pts = v.points;
  const legLen = v.short ? 0.14 : 0.26;
  const by = legLen + 0.04;
  const b = new Shape();
  b.add(G.sphere(1, 16, 12), main, { pos: [0, by, 0], scale: [0.17, 0.16, 0.26] });
  b.add(G.sphere(1, 12, 10), v.belly, { pos: [0, by - 0.04, 0.06], scale: [0.13, 0.12, 0.19] });
  if (v.stripes) {
    for (let i = 0; i < 3; i++) b.add(G.sphere(1, 10, 6), acc, { pos: [0, by + 0.1, -0.12 + i * 0.1], scale: [0.12, 0.06, 0.03] });
  }
  if (v.spots) {
    const sp = [[0.1, 0.1, -0.1], [-0.08, 0.12, 0.02], [0.05, 0.14, 0.1], [-0.12, 0.05, -0.12], [0.13, 0.04, 0.06], [-0.02, 0.15, -0.16]];
    for (const [x, y, z] of sp) b.add(G.sphere(0.03, 8, 6), acc, { pos: [x, by + y, z], scale: [1, 0.6, 1.3] });
  }
  if (v.patches) {
    b.add(G.sphere(0.09, 10, 8), v.patches[0], { pos: [0.08, by + 0.08, -0.08], scale: [1, 0.7, 1.3] });
    b.add(G.sphere(0.08, 10, 8), v.patches[1], { pos: [-0.09, by + 0.06, 0.06], scale: [1, 0.7, 1.2] });
  }
  if (v.tuxedo) b.add(G.sphere(1, 12, 10), '#ffffff', { pos: [0, by - 0.01, 0.16], scale: [0.1, 0.12, 0.1] });
  if (v.fluffy) {
    b.add(G.ico(0.13, 1), v.belly, { pos: [0, by + 0.08, 0.2], scale: [1.35, 1, 0.9] });
    for (const side of [-1, 1]) b.add(G.ico(0.1, 1), main, { pos: [side * 0.13, by + 0.02, -0.02], scale: [0.6, 0.9, 1.6] });
  }
  mesh(b.build(), m.body);
  m.head.position.set(0, by + 0.22, 0.26);
  const h = new Shape();
  h.add(G.sphere(0.2, 18, 14), main, { scale: [1.12, 0.95, 1] });
  const muz = v.flat ? 0.14 : 0.16;
  const muzCol = pts ? acc : v.tuxedo ? '#ffffff' : v.belly;
  h.add(G.sphere(0.06, 10, 8), muzCol, { pos: [-0.045, -0.07, muz], scale: [1, 0.8, 0.8] });
  h.add(G.sphere(0.06, 10, 8), muzCol, { pos: [0.045, -0.07, muz], scale: [1, 0.8, 0.8] });
  h.add(G.sphere(0.025, 8, 6), '#ff9fb2', { pos: [0, -0.035, muz + 0.04], scale: [1.2, 0.8, 0.8] });
  if (v.fluffy) for (const side of [-1, 1]) h.add(G.ico(0.07, 1), v.belly, { pos: [side * 0.2, -0.07, 0.06], scale: [0.8, 1, 1] });
  for (const side of [-1, 1]) {
    const earCol = pts ? acc : main;
    let g;
    if (v.fold) {
      const e = new Shape();
      e.add(G.cone(0.06, 0.08, 8), earCol, { pos: [0, 0.03, 0.02], rot: [0.9, 0, 0], scale: [1, 1, 0.6] });
      g = e.build();
      g.translate(side * 0.1, 0.15, 0);
    } else {
      const size = v.hairless ? 0.13 : 0.1;
      const e = earGeo('pointy', size, earCol, '#ffb3c2', side);
      if (v.tufts) e.add(G.cone(0.015, 0.08, 4), acc, { pos: [0, size * 1.65, 0] });
      g = e.build();
      g.rotateZ(-side * (v.hairless ? 0.45 : 0.3));
      g.translate(side * 0.12, 0.13, -0.01);
    }
    h.addRaw(g);
  }
  if (v.patches) h.add(G.sphere(0.09, 10, 8), v.patches[0], { pos: [0.1, 0.1, 0.05], scale: [1, 0.8, 0.9] });
  mesh(h.build(), m.head);
  addEyes(m, 0.2, { az: 0.48, el: 0.05, size: v.baby ? 0.055 : 0.045, color: v.eye || '#2b1d1d', scale: [1.12, 0.95, 1] });
  const paw = pts ? acc : v.belly;
  const legCol = pts ? acc : main;
  addLegs(m, [[0.09, legLen, 0.14, 0], [-0.09, legLen, 0.14, 1], [0.09, legLen, -0.15, 1], [-0.09, legLen, -0.15, 0]], legLen, legCol, v.tuxedo ? '#ffffff' : paw, 0.052);
  // Queue en point d'interrogation (touffue pour les poils longs).
  const t = new Shape();
  const tr = v.fluffy ? 1.7 : v.hairless ? 0.75 : 1;
  const tipCol = v.stripes || pts ? acc : v.tuxedo ? '#ffffff' : main;
  t.add(G.capsule(0.042 * tr, 0.14, 4, 8), main, { pos: [0, 0.05, -0.08], rot: [-1.1, 0, 0] });
  t.add(G.capsule(0.04 * tr, 0.12, 4, 8), main, { pos: [0, 0.16, -0.15], rot: [-0.25, 0, 0] });
  t.add(G.capsule(0.038 * tr, 0.1, 4, 8), tipCol, { pos: [0, 0.27, -0.12], rot: [0.7, 0, 0] });
  addTail(m, [0, by + 0.06, -0.24], t);
  m.anchors = { neck: { pos: [0, by + 0.13, 0.2], r: 0.12 }, top: { pos: [0, 0.2, 0] } };
  m.height = by + 0.5;
  m.radius = 0.35;
  if (v.big) m.scale = 1.25;
  if (v.baby) m.scale = 0.62;
}

function buildDog(m, v) {
  const short = v.short;
  const legLen = short ? 0.17 : 0.28;
  const by = legLen + 0.08;
  const b = new Shape();
  b.add(G.sphere(1, 16, 12), v.main, { pos: [0, by, 0], scale: [0.2, 0.19, 0.3] });
  b.add(G.sphere(1, 12, 10), v.belly, { pos: [0, by - 0.04, 0.1], scale: [0.15, 0.14, 0.2] });
  if (v.spots) {
    const sp = [[0.12, by + 0.1, -0.1], [-0.1, by + 0.12, 0.05], [0.05, by + 0.16, 0.12], [-0.13, by + 0.02, -0.15], [0.16, by, 0.08]];
    for (const p of sp) b.add(G.sphere(0.04, 8, 6), v.spots, { pos: p, scale: [1, 0.6, 1.2] });
  }
  mesh(b.build(), m.body);
  m.head.position.set(0, by + 0.25, 0.3);
  const h = new Shape();
  h.add(G.sphere(0.22, 18, 14), v.main, { scale: [1.08, 0.98, 1] });
  h.add(G.sphere(1, 12, 10), v.belly, { pos: [0, -0.07, 0.17], scale: [0.11, 0.085, 0.12] });
  h.add(G.sphere(0.04, 10, 8), '#2b1d1d', { pos: [0, -0.04, 0.29], scale: [1.2, 0.9, 0.8] });
  h.add(G.torus(0.03, 0.01, 4, 8, Math.PI), '#6b2f2f', { pos: [0, -0.1, 0.27], rot: [0, 0, Math.PI] });
  if (v.spots) h.add(G.sphere(0.07, 8, 6), v.spots, { pos: [0.13, 0.08, 0.08], scale: [1, 1, 0.5] });
  for (const side of [-1, 1]) {
    const g = earGeo(v.ears, 0.1, v.ears === 'pointy' ? v.main : v.accent === v.belly ? v.main : v.accent, '#ffc2cc', side).build();
    if (v.ears === 'pointy') g.rotateZ(-side * 0.25);
    g.translate(side * (v.ears === 'pointy' ? 0.13 : 0.2), v.ears === 'pointy' ? 0.15 : 0.1, -0.02);
    h.addRaw(g);
  }
  mesh(h.build(), m.head);
  addEyes(m, 0.22, { az: 0.45, el: 0.12, size: 0.045, scale: [1.08, 0.98, 1] });
  addLegs(m, [[0.1, by - 0.02, 0.17, 0], [-0.1, by - 0.02, 0.17, 1], [0.1, by - 0.02, -0.17, 1], [-0.1, by - 0.02, -0.17, 0]], by - 0.02, v.main, v.accent, 0.06);
  const t = new Shape();
  switch (v.tail) {
    case 'curl':
      t.add(G.torus(0.08, 0.045, 8, 14, Math.PI * 1.5), v.main, { pos: [0, 0.1, -0.04], rot: [0, Math.PI / 2, 0] });
      t.add(G.sphere(0.05, 8, 6), v.belly, { pos: [0, 0.18, -0.02] });
      break;
    case 'fluffy':
      t.add(G.sphere(1, 12, 8), v.main, { pos: [0, 0.08, -0.14], rot: [-0.7, 0, 0], scale: [0.07, 0.07, 0.18] });
      break;
    case 'pom':
      t.add(G.sphere(0.06, 8, 6), v.main, { pos: [0, 0.02, -0.03] });
      break;
    default:
      t.add(G.capsule(0.035, 0.2, 4, 8), v.main, { pos: [0, 0.1, -0.08], rot: [-0.9, 0, 0] });
  }
  addTail(m, [0, by + 0.08, -0.28], t);
  m.anchors = { neck: { pos: [0, by + 0.14, 0.24], r: 0.14 }, top: { pos: [0, 0.22, 0] } };
  m.height = by + 0.5;
  m.radius = 0.42;
}

function buildRabbit(m, v) {
  const b = new Shape();
  b.add(G.sphere(1, 16, 12), v.main, { pos: [0, 0.2, -0.02], scale: [0.17, 0.16, 0.2] });
  b.add(G.sphere(1, 12, 10), v.belly, { pos: [0, 0.18, 0.08], scale: [0.12, 0.12, 0.12] });
  if (v.mask) b.add(G.sphere(1, 12, 10), v.belly, { pos: [0, 0.24, 0.04], scale: [0.175, 0.07, 0.15] });
  // Grosses pattes arrière.
  for (const side of [-1, 1]) b.add(G.sphere(1, 10, 8), v.main, { pos: [side * 0.12, 0.08, -0.06], scale: [0.06, 0.08, 0.13] });
  mesh(b.build(), m.body);
  m.head.position.set(0, 0.38, 0.14);
  const h = new Shape();
  h.add(G.sphere(0.16, 16, 12), v.main, { scale: [1.08, 1, 1] });
  if (v.mask) h.add(G.sphere(0.12, 12, 8), v.belly, { pos: [0, -0.05, 0.07], scale: [0.8, 0.8, 0.8] });
  h.add(G.sphere(0.05, 8, 6), v.belly, { pos: [-0.035, -0.06, 0.12] });
  h.add(G.sphere(0.05, 8, 6), v.belly, { pos: [0.035, -0.06, 0.12] });
  h.add(G.sphere(0.022, 8, 6), '#ff9fb2', { pos: [0, -0.03, 0.155] });
  for (const side of [-1, 1]) {
    const g = earGeo(v.lop ? 'lop' : 'long', 0.07, v.main, v.accent, side).build();
    if (!v.lop) g.rotateZ(-side * 0.12);
    g.translate(side * (v.lop ? 0.13 : 0.06), v.lop ? 0.06 : 0.1, -0.02);
    h.addRaw(g);
  }
  mesh(h.build(), m.head);
  addEyes(m, 0.16, { az: 0.55, el: 0.1, size: 0.04, scale: [1.08, 1, 1] });
  addLegs(m, [[0.07, 0.14, 0.1, 0], [-0.07, 0.14, 0.1, 0]], 0.14, v.main, v.belly, 0.045);
  const t = new Shape();
  t.add(G.sphere(0.065, 10, 8), v.belly === v.main ? '#ffffff' : v.belly);
  addTail(m, [0, 0.2, -0.22], t);
  m.anchors = { neck: { pos: [0, 0.3, 0.12], r: 0.1 }, top: { pos: [0, 0.16, 0] } };
  m.height = 0.75;
  m.radius = 0.3;
}

function buildFox(m, v) {
  const b = new Shape();
  b.add(G.sphere(1, 16, 12), v.main, { pos: [0, 0.32, 0], scale: [0.16, 0.15, 0.28] });
  b.add(G.sphere(1, 12, 10), v.belly, { pos: [0, 0.29, 0.14], scale: [0.11, 0.12, 0.14] });
  mesh(b.build(), m.body);
  m.head.position.set(0, 0.54, 0.3);
  const h = new Shape();
  h.add(G.sphere(0.18, 16, 12), v.main, { scale: [1.15, 0.95, 1] });
  h.add(G.cone(0.08, 0.2, 10), v.belly, { pos: [0, -0.06, 0.2], rot: [Math.PI / 2, 0, 0], scale: [1.1, 1, 0.8] });
  h.add(G.sphere(1, 10, 8), v.belly, { pos: [0.1, -0.05, 0.08], scale: [0.08, 0.07, 0.07] });
  h.add(G.sphere(1, 10, 8), v.belly, { pos: [-0.1, -0.05, 0.08], scale: [0.08, 0.07, 0.07] });
  h.add(G.sphere(0.028, 8, 6), '#2b1d1d', { pos: [0, -0.06, 0.3] });
  for (const side of [-1, 1]) {
    const e = new Shape();
    e.add(G.cone(0.1, 0.2, 8), v.main, { pos: [0, 0.1, 0], scale: [1, 1, 0.5] });
    e.add(G.cone(0.055, 0.08, 8), v.accent, { pos: [0, 0.17, 0.005], scale: [1, 1, 0.55] });
    e.add(G.cone(0.06, 0.12, 8), '#fff6ea', { pos: [0, 0.08, 0.03], scale: [1, 1, 0.35] });
    const g = e.build();
    g.rotateZ(-side * 0.3);
    g.translate(side * 0.12, 0.1, -0.02);
    h.addRaw(g);
  }
  mesh(h.build(), m.head);
  addEyes(m, 0.18, { az: 0.5, el: 0.1, size: 0.04, scale: [1.15, 0.95, 1] });
  addLegs(m, [[0.08, 0.28, 0.15, 0], [-0.08, 0.28, 0.15, 1], [0.08, 0.28, -0.16, 1], [-0.08, 0.28, -0.16, 0]], 0.28, v.accent, v.accent, 0.045);
  const t = new Shape();
  t.add(G.sphere(1, 14, 10), v.main, { pos: [0, 0.02, -0.2], rot: [-0.35, 0, 0], scale: [0.11, 0.11, 0.24] });
  t.add(G.sphere(1, 12, 8), '#ffffff', { pos: [0, 0.1, -0.41], rot: [-0.35, 0, 0], scale: [0.08, 0.08, 0.1] });
  addTail(m, [0, 0.34, -0.24], t);
  m.anchors = { neck: { pos: [0, 0.45, 0.24], r: 0.11 }, top: { pos: [0, 0.18, 0] } };
  m.height = 0.85;
  m.radius = 0.38;
}

function buildDuck(m, v) {
  const b = new Shape();
  b.add(G.sphere(1, 16, 12), v.main, { pos: [0, 0.24, 0], scale: [0.16, 0.14, 0.22], rot: [-0.15, 0, 0] });
  b.add(G.sphere(1, 12, 10), v.belly, { pos: [0, 0.22, 0.1], scale: [0.13, 0.12, 0.13] });
  b.add(G.cone(0.08, 0.14, 8), v.main, { pos: [0, 0.32, -0.22], rot: [-2.2, 0, 0], scale: [1, 1, 0.5] });
  if (v.collar) b.add(G.torus(0.07, 0.015, 5, 14), '#ffffff', { pos: [0, 0.36, 0.14], rot: [Math.PI / 2 - 0.3, 0, 0] });
  b.add(G.cyl(0.06, 0.07, 0.16, 10), v.head, { pos: [0, 0.38, 0.13] });
  mesh(b.build(), m.body);
  m.head.position.set(0, 0.5, 0.15);
  const h = new Shape();
  h.add(G.sphere(0.12, 16, 12), v.head);
  h.add(G.sphere(1, 12, 8), v.accent, { pos: [0, -0.02, 0.13], scale: [0.06, 0.022, 0.075] });
  h.add(G.sphere(1, 12, 8), v.accent, { pos: [0, -0.04, 0.12], scale: [0.05, 0.015, 0.06] });
  if (v.baby) h.add(G.cone(0.02, 0.06, 5), v.head, { pos: [0, 0.13, 0], rot: [-0.3, 0, 0] });
  mesh(h.build(), m.head);
  addEyes(m, 0.12, { az: 0.6, el: 0.2, size: 0.03 });
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.14, 0.28, 0.02);
    m.body.add(pivot);
    const w = new Shape();
    w.add(G.sphere(1, 12, 8), v.main === v.belly ? v.main : v.main, { pos: [0, 0, -0.06], scale: [0.03, 0.09, 0.16], rot: [0.2, 0, 0] });
    mesh(w.build(), pivot);
    m.wings.push({ pivot, side });
  }
  addLegs(m, [[0.06, 0.13, 0.02, 0], [-0.06, 0.13, 0.02, 1]], 0.13, v.accent, v.accent, 0.022);
  m.anchors = { neck: { pos: [0, 0.4, 0.13], r: 0.075 }, top: { pos: [0, 0.11, 0] } };
  m.height = 0.7;
  m.radius = 0.28;
  if (v.baby) m.scale = 0.65;
}

function buildSheep(m, v) {
  const b = new Shape();
  const wool = [
    [0, 0.44, 0, 0.2], [0.12, 0.42, 0.14, 0.14], [-0.12, 0.42, 0.14, 0.14], [0.13, 0.42, -0.14, 0.14],
    [-0.13, 0.42, -0.14, 0.14], [0, 0.54, 0.08, 0.14], [0, 0.54, -0.1, 0.14], [0.16, 0.5, 0, 0.13],
    [-0.16, 0.5, 0, 0.13], [0, 0.36, 0.2, 0.13], [0, 0.4, -0.22, 0.13], [0.1, 0.32, 0, 0.14], [-0.1, 0.32, 0, 0.14],
  ];
  for (const [x, y, z, r] of wool) b.add(G.ico(r, 1), v.main, { pos: [x, y, z] });
  mesh(b.build(), m.body);
  m.head.position.set(0, 0.54, 0.34);
  const h = new Shape();
  h.add(G.sphere(1, 14, 10), v.accent, { scale: [0.12, 0.14, 0.13] });
  h.add(G.ico(0.09, 1), v.main, { pos: [0, 0.12, -0.02] });
  h.add(G.ico(0.07, 1), v.main, { pos: [0.07, 0.1, 0] });
  h.add(G.ico(0.07, 1), v.main, { pos: [-0.07, 0.1, 0] });
  for (const side of [-1, 1]) {
    h.add(G.sphere(1, 8, 6), v.accent, { pos: [side * 0.15, 0.02, -0.02], rot: [0, 0, side * 0.6], scale: [0.08, 0.035, 0.045] });
  }
  h.add(G.sphere(0.02, 6, 5), '#ff9fb2', { pos: [0, -0.06, 0.125] });
  mesh(h.build(), m.head);
  const dark = v.accent === '#3d3744' || v.accent === '#2a2530';
  addEyes(m, 0.13, { az: 0.55, el: 0.15, size: 0.032, color: dark ? '#ffffff' : '#2b1d1d', scale: [0.95, 1.05, 1] });
  addLegs(m, [[0.1, 0.3, 0.14, 0], [-0.1, 0.3, 0.14, 1], [0.1, 0.3, -0.14, 1], [-0.1, 0.3, -0.14, 0]], 0.3, v.accent, darken(v.accent), 0.045);
  const t = new Shape();
  t.add(G.ico(0.07, 1), v.main);
  addTail(m, [0, 0.46, -0.3], t);
  m.anchors = { neck: { pos: [0, 0.48, 0.26], r: 0.1 }, top: { pos: [0, 0.2, 0] } };
  m.height = 0.95;
  m.radius = 0.45;
}

function buildDeer(m, v) {
  const b = new Shape();
  b.add(G.sphere(1, 16, 12), v.main, { pos: [0, 0.52, 0], scale: [0.16, 0.16, 0.3] });
  b.add(G.sphere(1, 12, 10), v.belly, { pos: [0, 0.47, 0.03], scale: [0.12, 0.11, 0.22] });
  const spots = [[0.07, 0.66, 0.08], [-0.08, 0.66, -0.02], [0.05, 0.67, -0.12], [-0.06, 0.65, 0.14], [0.11, 0.62, -0.05], [-0.11, 0.61, 0.04], [0, 0.68, 0.02]];
  for (const p of spots) b.add(G.sphere(0.025, 6, 5), '#fff6ea', { pos: p, scale: [1, 0.5, 1] });
  b.add(G.cyl(0.07, 0.09, 0.26, 10), v.main, { pos: [0, 0.7, 0.24], rot: [0.5, 0, 0] });
  mesh(b.build(), m.body);
  m.head.position.set(0, 0.88, 0.33);
  const h = new Shape();
  h.add(G.sphere(0.15, 16, 12), v.main, { scale: [1, 0.95, 1.05] });
  h.add(G.sphere(1, 12, 8), v.belly, { pos: [0, -0.05, 0.12], scale: [0.08, 0.07, 0.09] });
  h.add(G.sphere(0.028, 8, 6), '#2b1d1d', { pos: [0, -0.03, 0.21] });
  for (const side of [-1, 1]) {
    h.add(G.sphere(1, 10, 8), v.main, { pos: [side * 0.17, 0.08, -0.03], rot: [0, 0, side * 0.55], scale: [0.12, 0.05, 0.05] });
    h.add(G.sphere(1, 8, 6), '#ffc2cc', { pos: [side * 0.17, 0.08, -0.005], rot: [0, 0, side * 0.55], scale: [0.09, 0.035, 0.02] });
  }
  mesh(h.build(), m.head);
  addEyes(m, 0.15, { az: 0.55, el: 0.1, size: 0.042 });
  addLegs(m, [[0.08, 0.46, 0.18, 0], [-0.08, 0.46, 0.18, 1], [0.08, 0.46, -0.18, 1], [-0.08, 0.46, -0.18, 0]], 0.46, v.main, v.accent, 0.04);
  const t = new Shape();
  t.add(G.sphere(1, 8, 6), '#ffffff', { pos: [0, 0.02, -0.03], scale: [0.05, 0.07, 0.04], rot: [0.5, 0, 0] });
  addTail(m, [0, 0.6, -0.29], t);
  m.anchors = { neck: { pos: [0, 0.78, 0.3], r: 0.08 }, top: { pos: [0, 0.14, 0] } };
  m.height = 1.15;
  m.radius = 0.42;
}

function buildHedgehog(m, v) {
  const b = new Shape();
  b.add(G.sphere(1, 16, 12), v.belly, { pos: [0, 0.13, 0.02], scale: [0.14, 0.11, 0.19] });
  b.add(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), v.main, { pos: [0, 0.12, -0.02], scale: [0.16, 0.15, 0.2], rot: [-0.25, 0, 0] });
  for (let i = 0; i < 30; i++) {
    const az = (i * 2.399) % (Math.PI * 2);
    const el = 0.25 + ((i * 0.618) % 1) * 1.1;
    const dir = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el) - 0.45];
    if (dir[2] > 0.3 && el < 0.7) continue;
    const len = Math.hypot(...dir);
    const d = dir.map((x) => x / len);
    // Cône couché sur +Z puis orienté vers l'extérieur du dos.
    b.add(G.cone(0.035, 0.12, 5).rotateX(Math.PI / 2), v.accent, { pos: [d[0] * 0.15, 0.12 + d[1] * 0.14, -0.02 + d[2] * 0.18], dir: d });
  }
  mesh(b.build(), m.body);
  m.head.position.set(0, 0.14, 0.16);
  const h = new Shape();
  h.add(G.sphere(0.1, 14, 10), v.belly);
  h.add(G.cone(0.06, 0.12, 10), v.belly, { pos: [0, -0.02, 0.1], rot: [Math.PI / 2, 0, 0] });
  h.add(G.sphere(0.022, 8, 6), '#2b1d1d', { pos: [0, -0.02, 0.165] });
  for (const side of [-1, 1]) h.add(G.sphere(0.03, 8, 6), v.main, { pos: [side * 0.07, 0.07, -0.01], scale: [1, 1, 0.5] });
  mesh(h.build(), m.head);
  addEyes(m, 0.1, { az: 0.6, el: 0.2, size: 0.024 });
  addLegs(m, [[0.07, 0.07, 0.08, 0], [-0.07, 0.07, 0.08, 1], [0.07, 0.07, -0.08, 1], [-0.07, 0.07, -0.08, 0]], 0.07, v.belly, v.belly, 0.035);
  m.anchors = { neck: { pos: [0, 0.12, 0.1], r: 0.08 }, top: { pos: [0, 0.1, 0] } };
  m.height = 0.45;
  m.radius = 0.25;
}

function buildRedPanda(m, v) {
  const b = new Shape();
  b.add(G.sphere(1, 16, 12), v.main, { pos: [0, 0.3, 0], scale: [0.18, 0.17, 0.27] });
  b.add(G.sphere(1, 12, 10), v.belly, { pos: [0, 0.25, 0.05], scale: [0.14, 0.12, 0.2] });
  mesh(b.build(), m.body);
  m.head.position.set(0, 0.52, 0.27);
  const h = new Shape();
  h.add(G.sphere(0.2, 18, 14), v.main, { scale: [1.18, 0.95, 1] });
  h.add(G.sphere(1, 12, 8), v.accent, { pos: [0, -0.07, 0.14], scale: [0.11, 0.08, 0.09] });
  h.add(G.sphere(0.028, 8, 6), '#2b1d1d', { pos: [0, -0.04, 0.23] });
  for (const side of [-1, 1]) {
    h.add(G.sphere(1, 10, 8), v.accent, { pos: [side * 0.09, 0.06, 0.15], scale: [0.045, 0.03, 0.03] });
    h.add(G.sphere(1, 10, 8), v.accent, { pos: [side * 0.14, -0.05, 0.12], scale: [0.06, 0.05, 0.05] });
    h.add(G.sphere(1, 10, 8), v.main, { pos: [side * 0.16, 0.14, -0.01], scale: [0.085, 0.085, 0.04] });
    h.add(G.sphere(1, 8, 6), v.accent, { pos: [side * 0.16, 0.15, 0.01], scale: [0.06, 0.06, 0.03] });
  }
  mesh(h.build(), m.head);
  addEyes(m, 0.2, { az: 0.45, el: 0.08, size: 0.04, scale: [1.18, 0.95, 1] });
  addLegs(m, [[0.1, 0.24, 0.14, 0], [-0.1, 0.24, 0.14, 1], [0.1, 0.24, -0.15, 1], [-0.1, 0.24, -0.15, 0]], 0.24, v.belly, v.belly, 0.055);
  const t = new Shape();
  for (let i = 0; i < 5; i++) t.add(G.sphere(0.09 - i * 0.004, 10, 8), i % 2 ? v.accent : v.main, { pos: [0, 0.02 + i * 0.03, -0.06 - i * 0.07], scale: [1, 1, 0.7] });
  addTail(m, [0, 0.32, -0.24], t);
  m.anchors = { neck: { pos: [0, 0.42, 0.21], r: 0.12 }, top: { pos: [0, 0.2, 0] } };
  m.height = 0.8;
  m.radius = 0.36;
}

function buildHen(m, v) {
  const b = new Shape();
  b.add(G.sphere(1, 16, 12), v.main, { pos: [0, 0.3, 0], scale: [0.16, 0.16, 0.2] });
  b.add(G.sphere(1, 12, 10), v.belly, { pos: [0, 0.28, 0.07], scale: [0.12, 0.13, 0.12] });
  for (let i = 0; i < 3; i++) b.add(G.sphere(1, 8, 6), v.main, { pos: [(i - 1) * 0.05, 0.42, -0.18], rot: [-0.6 + i * 0.1, 0, (i - 1) * 0.3], scale: [0.04, 0.12, 0.05] });
  mesh(b.build(), m.body);
  m.head.position.set(0, 0.5, 0.13);
  const h = new Shape();
  h.add(G.sphere(0.1, 14, 10), v.main);
  h.add(G.cone(0.035, 0.08, 6), v.accent, { pos: [0, -0.01, 0.12], rot: [Math.PI / 2, 0, 0] });
  if (!v.baby) {
    for (let i = 0; i < 3; i++) h.add(G.sphere(0.03, 8, 6), '#e5484d', { pos: [0, 0.1 + (i === 1 ? 0.02 : 0), -0.03 + i * 0.035] });
    h.add(G.sphere(0.022, 6, 5), '#e5484d', { pos: [0, -0.06, 0.09], scale: [1, 1.5, 1] });
  }
  mesh(h.build(), m.head);
  addEyes(m, 0.1, { az: 0.65, el: 0.15, size: 0.026 });
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.15, 0.32, 0);
    m.body.add(pivot);
    mesh(new Shape().add(G.sphere(1, 10, 8), v.main, { pos: [0, -0.02, -0.03], scale: [0.03, 0.09, 0.13] }).build(), pivot);
    m.wings.push({ pivot, side });
  }
  addLegs(m, [[0.05, 0.16, 0.02, 0], [-0.05, 0.16, 0.02, 1]], 0.16, v.accent, v.accent, 0.02);
  m.anchors = { neck: { pos: [0, 0.42, 0.12], r: 0.08 }, top: { pos: [0, 0.12, 0] } };
  m.height = 0.7;
  m.radius = 0.25;
  if (v.baby) m.scale = 0.55;
}

function buildBird(m, v) {
  const b = new Shape();
  b.add(G.sphere(1, 14, 10), v.main, { pos: [0, 0.14, 0], scale: [0.075, 0.075, 0.1], rot: [-0.3, 0, 0] });
  b.add(G.sphere(1, 12, 8), v.belly, { pos: [0, 0.12, 0.03], scale: [0.06, 0.06, 0.07] });
  b.add(G.sphere(1, 8, 6), v.accent, { pos: [0, 0.16, -0.12], rot: [-0.5, 0, 0], scale: [0.03, 0.015, 0.08] });
  mesh(b.build(), m.body);
  m.head.position.set(0, 0.23, 0.05);
  const h = new Shape();
  h.add(G.sphere(0.065, 12, 10), v.main);
  h.add(G.sphere(0.05, 10, 8), v.belly, { pos: [0, -0.02, 0.025] });
  h.add(G.cone(0.018, 0.05, 5), '#3d3744', { pos: [0, -0.005, 0.08], rot: [Math.PI / 2, 0, 0] });
  mesh(h.build(), m.head);
  addEyes(m, 0.065, { az: 0.75, el: 0.2, size: 0.016 });
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.07, 0.16, 0);
    m.body.add(pivot);
    mesh(new Shape().add(G.sphere(1, 8, 6), v.accent === '#2e2a33' ? v.main : v.main, { pos: [0, 0, -0.02], scale: [0.015, 0.05, 0.08] }).build(), pivot);
    m.wings.push({ pivot, side });
  }
  addLegs(m, [[0.025, 0.08, 0, 0], [-0.025, 0.08, 0, 0]], 0.08, '#e8a04a', '#e8a04a', 0.01);
  m.anchors = { neck: { pos: [0, 0.2, 0.05], r: 0.05 }, top: { pos: [0, 0.07, 0] } };
  m.height = 0.32;
  m.radius = 0.12;
}

function buildTurtle(m, v) {
  const b = new Shape();
  b.add(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), v.accent, { pos: [0, 0.1, 0], scale: [0.22, 0.17, 0.27] });
  b.add(G.cyl(1, 1, 0.04, 18), v.belly, { pos: [0, 0.1, 0], scale: [0.23, 1, 0.28] });
  const spots = [[0, 0.26, 0], [0.1, 0.22, 0.1], [-0.1, 0.22, 0.1], [0.1, 0.22, -0.1], [-0.1, 0.22, -0.1], [0, 0.2, 0.18], [0, 0.2, -0.18]];
  for (const [x, y, z] of spots) {
    const dir = [x / 0.22, (y - 0.1) / 0.17, z / 0.27];
    s_add(b, v.stars ? '#ffd84d' : v.main, [x * 1.01, y, z * 1.01], dir);
  }
  mesh(b.build(), m.body);
  m.head.position.set(0, 0.16, 0.3);
  const h = new Shape();
  h.add(G.sphere(0.08, 12, 10), v.main, { scale: [1, 0.9, 1.15] });
  h.add(G.cyl(0.05, 0.06, 0.12, 8), v.main, { pos: [0, -0.02, -0.08], rot: [Math.PI / 2 - 0.3, 0, 0] });
  h.add(G.torus(0.025, 0.006, 4, 8, Math.PI), '#6b2f2f', { pos: [0, -0.03, 0.085], rot: [0, 0, Math.PI] });
  mesh(h.build(), m.head);
  addEyes(m, 0.08, { az: 0.7, el: 0.2, size: 0.022, scale: [1, 0.9, 1.15] });
  addLegs(m, [[0.15, 0.08, 0.14, 0], [-0.15, 0.08, 0.14, 1], [0.15, 0.08, -0.14, 1], [-0.15, 0.08, -0.14, 0]], 0.08, v.main, v.main, 0.045);
  const t = new Shape();
  t.add(G.cone(0.03, 0.08, 6), v.main, { rot: [-Math.PI / 2, 0, 0] });
  addTail(m, [0, 0.1, -0.28], t);
  m.anchors = { neck: { pos: [0, 0.16, 0.25], r: 0.06 }, top: { pos: [0, 0.07, 0] } };
  m.height = 0.4;
  m.radius = 0.3;
}

function buildSquirrel(m, v) {
  const b = new Shape();
  b.add(G.sphere(1, 14, 12), v.main, { pos: [0, 0.2, 0], scale: [0.12, 0.14, 0.16], rot: [-0.5, 0, 0] });
  b.add(G.sphere(1, 12, 10), v.belly, { pos: [0, 0.19, 0.06], scale: [0.08, 0.11, 0.08], rot: [-0.5, 0, 0] });
  mesh(b.build(), m.body);
  m.head.position.set(0, 0.38, 0.1);
  const h = new Shape();
  h.add(G.sphere(0.11, 14, 12), v.main, { scale: [1, 0.95, 1.05] });
  h.add(G.sphere(1, 10, 8), v.belly, { pos: [0, -0.03, 0.07], scale: [0.065, 0.05, 0.05] });
  h.add(G.sphere(0.018, 6, 5), '#2b1d1d', { pos: [0, -0.01, 0.12] });
  for (const side of [-1, 1]) {
    h.add(G.cone(0.035, 0.09, 6), v.main, { pos: [side * 0.06, 0.12, -0.01], rot: [0, 0, -side * 0.25] });
    h.add(G.cone(0.012, 0.05, 4), v.accent, { pos: [side * 0.07, 0.19, -0.01], rot: [0, 0, -side * 0.25] });
  }
  mesh(h.build(), m.head);
  addEyes(m, 0.11, { az: 0.6, el: 0.15, size: 0.025 });
  addLegs(m, [[0.05, 0.1, 0.07, 0], [-0.05, 0.1, 0.07, 1], [0.06, 0.1, -0.06, 1], [-0.06, 0.1, -0.06, 0]], 0.1, v.main, v.accent, 0.03);
  const t = new Shape();
  for (let i = 0; i < 6; i++) {
    const a = i / 5;
    t.add(G.sphere(0.07 + a * 0.03, 10, 8), i % 2 ? v.accent : v.main, { pos: [0, 0.05 + a * 0.32, -0.08 - Math.sin(a * 2.4) * 0.1], scale: [0.8, 1, 0.8] });
  }
  addTail(m, [0, 0.14, -0.13], t);
  m.anchors = { neck: { pos: [0, 0.3, 0.09], r: 0.07 }, top: { pos: [0, 0.1, 0] } };
  m.height = 0.55;
  m.radius = 0.2;
}

function buildGoat(m, v) {
  const b = new Shape();
  b.add(G.sphere(1, 16, 12), v.main, { pos: [0, 0.5, 0], scale: [0.18, 0.17, 0.3] });
  b.add(G.sphere(1, 12, 10), v.belly, { pos: [0, 0.45, 0.02], scale: [0.14, 0.12, 0.24] });
  if (v.patch) b.add(G.sphere(0.12, 10, 8), v.patch, { pos: [0.08, 0.58, -0.08], scale: [1, 0.6, 1.4] });
  b.add(G.cyl(0.07, 0.09, 0.22, 10), v.main, { pos: [0, 0.66, 0.24], rot: [0.5, 0, 0] });
  mesh(b.build(), m.body);
  m.head.position.set(0, 0.82, 0.33);
  const h = new Shape();
  h.add(G.sphere(0.13, 14, 12), v.main, { scale: [0.95, 1, 1.15] });
  h.add(G.sphere(1, 10, 8), v.belly, { pos: [0, -0.06, 0.1], scale: [0.07, 0.06, 0.08] });
  h.add(G.sphere(0.022, 6, 5), '#2b1d1d', { pos: [0, -0.05, 0.175] });
  h.add(G.cone(0.035, 0.1, 6), v.belly, { pos: [0, -0.15, 0.06], rot: [Math.PI, 0, 0] });
  for (const side of [-1, 1]) {
    h.add(G.sphere(1, 8, 6), v.main, { pos: [side * 0.14, 0.02, -0.02], rot: [0, 0, side * 0.3], scale: [0.08, 0.035, 0.04] });
    if (!v.baby) h.add(G.torus(0.06, 0.018, 5, 10, Math.PI * 1.1), v.accent, { pos: [side * 0.05, 0.12, -0.05], rot: [0, Math.PI / 2, 0.4] });
  }
  mesh(h.build(), m.head);
  addEyes(m, 0.13, { az: 0.62, el: 0.12, size: 0.032, scale: [0.95, 1, 1.15] });
  addLegs(m, [[0.09, 0.42, 0.18, 0], [-0.09, 0.42, 0.18, 1], [0.09, 0.42, -0.18, 1], [-0.09, 0.42, -0.18, 0]], 0.42, v.main, '#5a4a3a', 0.045);
  const t = new Shape();
  t.add(G.sphere(1, 8, 6), v.main, { pos: [0, 0.04, -0.02], scale: [0.04, 0.07, 0.04], rot: [-0.6, 0, 0] });
  addTail(m, [0, 0.58, -0.29], t);
  m.anchors = { neck: { pos: [0, 0.72, 0.28], r: 0.08 }, top: { pos: [0, 0.16, 0] } };
  m.height = 1.05;
  m.radius = 0.42;
  if (v.baby) m.scale = 0.62;
}

function buildOtter(m, v) {
  const b = new Shape();
  b.add(G.capsule(0.13, 0.36, 6, 12), v.main, { pos: [0, 0.17, 0], rot: [Math.PI / 2, 0, 0] });
  b.add(G.capsule(0.1, 0.26, 6, 10), v.belly, { pos: [0, 0.13, 0.05], rot: [Math.PI / 2, 0, 0] });
  mesh(b.build(), m.body);
  m.head.position.set(0, 0.3, 0.3);
  const h = new Shape();
  h.add(G.sphere(0.12, 14, 12), v.main, { scale: [1.1, 0.9, 1] });
  h.add(G.sphere(1, 12, 8), v.belly, { pos: [0, -0.03, 0.08], scale: [0.09, 0.06, 0.06] });
  h.add(G.sphere(0.024, 6, 5), '#2b1d1d', { pos: [0, 0, 0.13], scale: [1.3, 1, 1] });
  for (const side of [-1, 1]) {
    h.add(G.sphere(0.028, 6, 5), v.main, { pos: [side * 0.11, 0.06, -0.02] });
    for (const dy of [-0.01, -0.03]) h.add(G.box(0.08, 0.004, 0.004), '#fbf8f4', { pos: [side * 0.08, dy, 0.1], rot: [0, 0, side * dy * 4] });
  }
  mesh(h.build(), m.head);
  addEyes(m, 0.12, { az: 0.55, el: 0.18, size: 0.026, scale: [1.1, 0.9, 1] });
  addLegs(m, [[0.08, 0.08, 0.16, 0], [-0.08, 0.08, 0.16, 1], [0.08, 0.08, -0.14, 1], [-0.08, 0.08, -0.14, 0]], 0.08, v.accent, v.accent, 0.04);
  const t = new Shape();
  t.add(G.cone(0.07, 0.34, 8), v.main, { pos: [0, 0, -0.16], rot: [-Math.PI / 2, 0, 0], scale: [1, 1, 0.55] });
  addTail(m, [0, 0.14, -0.3], t);
  m.anchors = { neck: { pos: [0, 0.26, 0.24], r: 0.1 }, top: { pos: [0, 0.14, 0] } };
  m.height = 0.45;
  m.radius = 0.3;
}

function buildParrot(m, v) {
  const b = new Shape();
  b.add(G.sphere(1, 14, 12), v.main, { pos: [0, 0.3, 0], scale: [0.11, 0.15, 0.12], rot: [-0.35, 0, 0] });
  b.add(G.sphere(1, 12, 10), v.belly, { pos: [0, 0.27, 0.05], scale: [0.08, 0.11, 0.07], rot: [-0.35, 0, 0] });
  mesh(b.build(), m.body);
  m.head.position.set(0, 0.5, 0.06);
  const h = new Shape();
  h.add(G.sphere(0.1, 14, 12), v.main);
  h.add(G.sphere(0.06, 10, 8), '#fbf8f4', { pos: [0, 0, 0.06], scale: [1.2, 0.9, 0.6] });
  h.add(G.sphere(1, 10, 8), '#3d3744', { pos: [0, -0.03, 0.11], scale: [0.035, 0.05, 0.045], rot: [0.5, 0, 0] });
  h.add(G.cone(0.02, 0.05, 6), '#3d3744', { pos: [0, -0.075, 0.115], rot: [Math.PI, 0, 0] });
  if (v.crest) for (let i = 0; i < 3; i++) h.add(G.sphere(1, 8, 6), v.accent, { pos: [0, 0.1 + i * 0.03, -0.02 - i * 0.03], rot: [-0.8 - i * 0.2, 0, 0], scale: [0.02, 0.06, 0.02] });
  mesh(h.build(), m.head);
  addEyes(m, 0.1, { az: 0.7, el: 0.2, size: 0.022 });
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.1, 0.34, 0);
    m.body.add(pivot);
    mesh(new Shape().add(G.sphere(1, 10, 8), v.accent === '#2e2a33' ? v.main : v.accent, { pos: [0, -0.04, -0.04], scale: [0.025, 0.12, 0.08] }).build(), pivot);
    m.wings.push({ pivot, side });
  }
  addLegs(m, [[0.04, 0.13, 0.01, 0], [-0.04, 0.13, 0.01, 1]], 0.13, '#8a8a96', '#8a8a96', 0.015);
  const t = new Shape();
  t.add(G.sphere(1, 8, 6), v.tail, { pos: [0, -0.02, -0.14], rot: [-0.9, 0, 0], scale: [0.035, 0.02, 0.18] });
  addTail(m, [0, 0.24, -0.08], t);
  m.anchors = { neck: { pos: [0, 0.42, 0.06], r: 0.06 }, top: { pos: [0, 0.14, 0] } };
  m.height = 0.65;
  m.radius = 0.18;
}

function s_add(shape, color, pos, dir) {
  shape.add(G.sphere(0.06, 8, 6), color, { pos, dir, scale: [1, 1, 0.3] });
}

function darken(hex) {
  return `#${new THREE.Color(hex).multiplyScalar(0.7).getHexString()}`;
}

// --- Accessoires des compagnons ---------------------------------------------

export const PET_ACCESSORIES = [
  { id: 'aucun', label: 'Aucun' },
  { id: 'collier', label: 'Collier' },
  { id: 'noeud', label: 'Nœud' },
  { id: 'foulard', label: 'Foulard' },
  { id: 'chapeau', label: 'Chapeau de fête' },
  { id: 'couronne', label: 'Couronne de fleurs' },
];

export const PET_COLORS = ['#ff6f91', '#ffd84d', '#6fcf97', '#6fa8dc', '#b69cf0', '#e5484d', '#ffffff', '#2e2e3a'];

export function buildAccessory(m, id, color) {
  const s = new Shape();
  const n = m.anchors.neck;
  const t = m.anchors.top;
  switch (id) {
    case 'collier':
      s.add(G.torus(n.r, 0.02, 6, 18), color, { pos: n.pos, rot: [Math.PI / 2 - 0.4, 0, 0] });
      s.add(G.sphere(0.03, 8, 6), '#ffd84d', { pos: [n.pos[0], n.pos[1] - n.r * 0.35, n.pos[2] + n.r * 0.95] });
      return { geo: s.build(), parent: 'body' };
    case 'foulard':
      s.add(G.torus(n.r, 0.025, 6, 18), color, { pos: n.pos, rot: [Math.PI / 2 - 0.4, 0, 0] });
      s.add(G.cone(n.r * 0.8, n.r * 1.1, 3), color, { pos: [n.pos[0], n.pos[1] - n.r * 0.6, n.pos[2] + n.r * 0.85], rot: [Math.PI + 0.3, 0, 0], scale: [1, 1, 0.3] });
      return { geo: s.build(), parent: 'body' };
    case 'noeud':
      s.add(G.sphere(0.05, 10, 8), color, { pos: [t.pos[0] + 0.1, t.pos[1] - 0.02, t.pos[2] + 0.02], scale: [1.4, 1, 0.5], rot: [0, 0, -0.4] });
      s.add(G.sphere(0.05, 10, 8), color, { pos: [t.pos[0] + 0.02, t.pos[1] + 0.03, t.pos[2] + 0.02], scale: [1.4, 1, 0.5], rot: [0, 0, 0.8] });
      s.add(G.sphere(0.025, 8, 6), color, { pos: [t.pos[0] + 0.06, t.pos[1], t.pos[2] + 0.03] });
      return { geo: s.build(), parent: 'head' };
    case 'chapeau':
      s.add(G.cone(0.07, 0.16, 12), color, { pos: [t.pos[0], t.pos[1] + 0.06, t.pos[2]], rot: [0, 0, 0.2] });
      s.add(G.sphere(0.025, 8, 6), '#ffffff', { pos: [t.pos[0] - 0.03, t.pos[1] + 0.14, t.pos[2]] });
      s.add(G.torus(0.065, 0.012, 5, 14), '#ffffff', { pos: [t.pos[0] + 0.005, t.pos[1] - 0.01, t.pos[2]], rot: [Math.PI / 2, 0.2, 0] });
      return { geo: s.build(), parent: 'head' };
    case 'couronne': {
      const cols = [color, '#ffffff', '#ffd84d'];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        s.add(G.sphere(0.03, 8, 6), cols[i % 3], { pos: [t.pos[0] + Math.cos(a) * 0.09, t.pos[1] - 0.02, t.pos[2] + Math.sin(a) * 0.09] });
      }
      s.add(G.torus(0.09, 0.012, 5, 16), '#5fae55', { pos: [t.pos[0], t.pos[1] - 0.03, t.pos[2]], rot: [Math.PI / 2, 0, 0] });
      return { geo: s.build(), parent: 'head' };
    }
    default:
      return null;
  }
}
