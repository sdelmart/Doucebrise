import * as THREE from 'three';
import { toon, getGradientMap, shadedMaterial, Shape, G, vertexColorToon, withOutline } from '../core/materials.js';
import { FURNITURE, WALLPAPERS, FLOORS, surfaceTexture } from './furniture.js';
import { vehicleModel, wheelGeo } from '../world/vehicleModels.js';
import { VEHICLES } from '../game/vehicles.js';
import { INSECTS, insectMesh } from '../game/insects.js';
import { FISH } from '../game/fish.js';

// Visites chez les habitants : on frappe à leur porte (de 6 h à 22 h) et on entre dans
// leur maison, meublée à leur image. Lieux publics (café, garage, musée, aquarium) : on y
// entre aux heures d'ouverture. Une seule pièce, loin de l'île, réaménagée à chaque visite.

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

// --- Lieux publics ------------------------------------------------------------------------
// Le café et le garage sont aussi les maisons de Mimi et Léo ; le muséum et l'aquarium
// occupent deux maisons libres de Bourg-Sapin et Port-Corail. Objets « @… » : construits ici
// (comptoir, véhicules exposés, vitrines, bassins, grands panneaux de collection).
export const PLACES = {
  cafe: {
    house: 'cafe', host: 'mimi', emoji: '☕', name: 'Café des Chats', hours: [7, 21],
    sub: 'Les pensionnaires du café t\'attendent !',
    hostAt: [-2.3, -3.05],
    greet: ['Bienvenue au café ! Les minous sont tous de sortie.', 'Installe-toi ! Un chocolat chaud, et un chat sur les genoux ?', 'Chut… il y en a un qui fait la sieste. Les autres veulent des câlins !'],
    layout: L('menthe-pois', 'damier', [
      ['tapis-rond', 1.8, 0.3, 0], ['@comptoir', -2.3, -2.3, 0], ['gateau-etage', -0.55, -3.0, 0],
      ['table-bistrot', 1.8, 0.3, 0], ['tabouret', 1.15, 0.3, 0], ['tabouret', 2.45, 0.3, 0],
      ['table-bistrot', -2.6, 1.3, 0], ['tabouret', -3.25, 1.3, 0], ['tabouret', -1.95, 1.3, 0],
      ['arbre-chat', 3.85, -2.85, 0], ['lit-chat', 2.6, -3.05, 0], ['maison-chat', 1.2, -3.0, 0], ['statue-chat', 4.0, -1.4, 0],
      ['griffoir', -3.95, -0.3, 0], ['fontaine-chat', 3.95, 2.85, 0], ['panier', 2.6, 2.5, 0], ['plante-grande', -3.95, 2.85, 0],
    ], [['horloge-coucou', -3.7], ['guirlande-coeurs', 0], ['tableau-chat', 3.7]]),
  },
  garage: {
    house: 'garage', host: 'leo', emoji: '🔧', name: 'Garage de Léo', hours: [8, 20],
    sub: 'Les véhicules de Léo, bichonnés',
    hostAt: [0.4, -1.4],
    greet: ['Salut ! Fais attention, la peinture du scooter est encore fraîche.', 'Bienvenue à l\'atelier ! Tout ce qui roule passe entre mes mains.', 'Tu viens admirer les bolides ? Prends ton temps !'],
    layout: L('creme', 'damier', [
      ['tapis', -2.9, 1.95, 1], ['@vehicule', -2.5, -2.3, 1, 'voiturette'], ['@vehicule', 1.7, -2.4, 0, 'scooter'], ['@vehicule', 3.05, -2.4, 0, 'velo'],
      ['@vehicule', 2.6, 0.6, 3, 'trottinette'], ['@etabli', 3.95, 1.8, 3], ['@pneus', -0.3, -3.0, 0],
      ['canape', -3.95, 1.95, 1, '#6fa8dc'], ['table-basse', -2.75, 1.95, 1], ['lampadaire', -4.0, 0.4, 0], ['trophee', 4.0, -0.5, 0],
    ], [['cadre-photo', -3.7], ['horloge', 0], ['etagere', 3.7]]),
  },
  musee: {
    house: 'pins-4', emoji: '🏛️', name: 'Muséum des Pins', hours: [8, 20],
    sub: 'Tes insectes y sont exposés',
    welcome: '🏛️ Bienvenue au Muséum des Pins ! Chaque insecte que tu attrapes rejoint la collection.',
    layout: L('lambris', 'parquet', [
      ['tapis-tresse', 0, -0.25, 0],
      ['@vitrine', -2.9, -1.2, 0, 0], ['@vitrine', -1.0, -1.2, 0, 1], ['@vitrine', 1.0, -1.2, 0, 2], ['@vitrine', 2.9, -1.2, 0, 3],
      ['@vitrine', -2.9, 0.7, 0, 4], ['@vitrine', -1.0, 0.7, 0, 5], ['@vitrine', 1.0, 0.7, 0, 6], ['@vitrine', 2.9, 0.7, 0, 7],
      ['banc-rondins', -3.85, 2.3, 1], ['plante-grande', 3.95, 2.85, 0], ['plante-grande', -3.95, -2.95, 0], ['globe', 3.95, -3.0, 0],
      ['lanterne-chalet', 3.95, 1.6, 0], ['pile-livres', 2.6, -3.1, 0],
    ], [['@panneau', 0, 'insectes'], ['tableau-montagne', -3.7], ['vitrine-papillons', 3.7]]),
  },
  aquarium: {
    house: 'corail-1', emoji: '🐠', name: 'Aquarium du lagon', hours: [8, 20],
    sub: 'Les poissons que tu pêches y nagent',
    welcome: '🐠 Bienvenue à l\'Aquarium du lagon ! Chaque poisson pêché vient y nager.',
    layout: L('menthe-pois', 'nuage', [
      ['@bassin', -3.85, -0.5, 1], ['@bassin', 3.85, -0.5, 3], ['@colonne', 0, -0.7, 0],
      ['coquillage-geant', -3.6, 2.6, 0], ['palmier-pot', 3.9, 2.8, 0], ['bocal-poisson', -2.6, -3.1, 0], ['planche-surf', 2.6, -3.15, 0],
      ['banc-jardin', -1.9, 1.7, 0],
    ], [['@panneau', 0, 'poissons'], ['tableau-lagon', -3.7], ['bouee', 3.7]]),
  },
};

const GREETINGS = [
  'Oh, de la visite ! Entre, entre, fais comme chez toi !',
  'Quelle bonne surprise ! Tu veux quelque chose à boire ?',
  'Bienvenue chez moi ! Ne fais pas attention au désordre…',
  'Ah, c\'est toi ! Viens, je vais te montrer ma maison.',
];

// Couleurs des poissons de l'aquarium (les autres : d'après leur nom).
const FISH_COLORS = {
  sardine: '#b8c7d6', maquereau: '#5f8fb0', crevette: '#ff9b85', crabe: '#e5604d', meduse: '#e6b8ff', dorade: '#e8c86a', bar: '#9fb3c2',
  calamar: '#f0a0a0', 'poisson-clown': '#ff8a3d', hippocampe: '#ffd84d', pieuvre: '#d96b8a', raie: '#8a8f9c', 'poisson-lune': '#c9d3dc',
  espadon: '#4f7fb0', gardon: '#c0c8b0', perche: '#8fb05a', carpe: '#c9a25a', truite: '#e8a0b8', anguille: '#6b7a4a', 'poisson-chat': '#7a6a5a',
  koi: '#ff7a3d', brochet: '#7a9a5a', esturgeon: '#8a8a8a', 'poisson-dore': '#ffd23d', ombre: '#9aa8b8', ecrevisse: '#c0503d', omble: '#e08a5a',
  lotte: '#9a8a6a', saumon: '#ff9a7a', huchon: '#c08a8a', demoiselle: '#3d7fff', chirurgien: '#3da0ff', perroquet: '#3ddc9a', barracuda: '#b0c0c8',
  'poisson-ange': '#ffe066', merou: '#a07a5a', 'raie-manta': '#4a5a7a', coelacanthe: '#5a6a9a',
};
// Pensionnaires de l'aquarium, toujours là (même avant la première pêche).
const HOUSE_FISH = [['#3d7fff', 0.26], ['#ff8a3d', 0.22], ['#ffe066', 0.24], ['#3ddc9a', 0.28], ['#ff8fab', 0.22]];

const _box = new THREE.Box3();
const _size = new THREE.Vector3();

function canvasTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

/** Grand panneau de collection : une case par espèce (emoji et nom, ou « ??? »). */
function collectionBoard(title, entries, cols, w = 2.8, h = 1.65) {
  const cw = 1024;
  const ch = Math.round((cw * h) / w);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff8ec';
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = '#5b4636';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 44px Nunito, "Trebuchet MS", sans-serif';
  ctx.fillText(title, cw / 2, 40);
  const rows = Math.ceil(entries.length / cols);
  const top = 78;
  const pad = 10;
  const cellW = (cw - pad * 2) / cols;
  const cellH = (ch - top - pad) / rows;
  entries.forEach((e, i) => {
    const x = pad + (i % cols) * cellW;
    const y = top + Math.floor(i / cols) * cellH;
    ctx.fillStyle = e.known ? '#ffffff' : '#efe6d8';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 4, cellW - 8, cellH - 8, 14);
    ctx.fill();
    if (e.known) {
      ctx.strokeStyle = e.color || '#e7c9a0';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    const em = Math.min(cellW, cellH) * 0.42;
    ctx.font = `${em}px ${EMOJI_FONT}`;
    ctx.fillStyle = '#b8a894';
    ctx.fillText(e.known ? e.emoji : '?', x + cellW / 2, y + cellH * 0.42);
    let size = Math.round(Math.min(cellH * 0.15, 22));
    ctx.font = `800 ${size}px Nunito, "Trebuchet MS", sans-serif`;
    const label = e.known ? e.label : '???';
    while (ctx.measureText(label).width > cellW - 14 && size > 9) {
      size -= 1;
      ctx.font = `800 ${size}px Nunito, "Trebuchet MS", sans-serif`;
    }
    ctx.fillStyle = e.known ? '#5b4636' : '#b8a894';
    ctx.fillText(label, x + cellW / 2, y + cellH * 0.82);
  });
  const group = new THREE.Group();
  const frame = new Shape();
  frame.add(G.box(w + 0.16, h + 0.16, 0.06), '#8f6243', { pos: [0, 0, -0.01] });
  const fm = new THREE.Mesh(frame.build(), vertexColorToon());
  group.add(fm);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(w, h), shadedMaterial({ map: canvasTexture(canvas), gradientMap: getGradientMap() }));
  board.position.z = 0.025;
  group.add(board);
  return group;
}

/** Petite étiquette sous une vitrine. */
function plaque(text, color = '#5b4636') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f6e7c8';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 30;
  ctx.font = `800 ${size}px Nunito, "Trebuchet MS", sans-serif`;
  while (ctx.measureText(text).width > 236 && size > 12) {
    size -= 2;
    ctx.font = `800 ${size}px Nunito, "Trebuchet MS", sans-serif`;
  }
  ctx.fillText(text, 128, 34);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.125), shadedMaterial({ map: canvasTexture(canvas), gradientMap: getGradientMap() }));
  return m;
}

/** Poisson d'aquarium (corps, queue, nageoire, yeux), tourné vers +z. */
function fishMesh(color, len) {
  const s = new Shape();
  const c = new THREE.Color(color);
  const belly = '#' + c.clone().lerp(new THREE.Color('#ffffff'), 0.45).getHexString();
  s.add(G.sphere(1, 12, 8), color, { scale: [len * 0.17, len * 0.24, len * 0.5] });
  s.add(G.sphere(1, 10, 6), belly, { pos: [0, -len * 0.06, len * 0.04], scale: [len * 0.13, len * 0.14, len * 0.38] });
  s.add(G.cone(len * 0.2, len * 0.28, 4), color, { pos: [0, 0, -len * 0.55], rot: [-Math.PI / 2, 0, 0], scale: [0.25, 1, 1] });
  s.add(G.cone(len * 0.1, len * 0.18, 4), color, { pos: [0, len * 0.24, -len * 0.05], rot: [-0.5, 0, 0], scale: [0.2, 1, 1] });
  for (const x of [-1, 1]) s.add(G.sphere(len * 0.045, 6, 5), '#2b1d1d', { pos: [x * len * 0.12, len * 0.06, len * 0.32] });
  return new THREE.Mesh(s.build(), vertexColorToon());
}

const rot2 = (x, z, r) => [x * Math.cos(r) + z * Math.sin(r), -x * Math.sin(r) + z * Math.cos(r)];

export class Visits {
  constructor(game) {
    this.game = game;
    this.active = null;
    this.visitedDay = {};
    this.placesSeen = new Set();
    this.group = new THREE.Group();
    this.group.name = 'visits';
    this.group.visible = false;
    game.scene.add(this.group);
    this.furniture = new THREE.Group();
    this.group.add(this.furniture);
    this.colliders = [];
    this.spots = [];
    this.anims = [];
    this.guests = [];
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

  /** Index de maison d'un lieu (repéré par l'identifiant de la maison). */
  houseOf(place) {
    if (place._house === undefined) place._house = this.game.world.village.houses.findIndex((h) => h.id === place.house);
    return place._house;
  }

  /** Porte la plus proche (dehors) : maison d'habitant ou lieu public. */
  nearestDoor(max = 1.35) {
    const g = this.game;
    const p = g.player.pos;
    const vil = g.world.village;
    for (const [id, place] of Object.entries(PLACES)) {
      const house = this.houseOf(place);
      if (house < 0) continue;
      const door = vil.doorFront(house, 1.0);
      if (Math.hypot(door.x - p.x, door.z - p.z) < max) return { id, place, house, door, v: place.host ? g.villagers.get(place.host) : null };
    }
    for (const v of g.villagers.list) {
      const hi = v.def.house;
      if (!hi || !LAYOUTS[v.def.id] || Object.values(PLACES).some((pl) => pl.host === v.def.id)) continue;
      const door = vil.doorFront(hi, 1.0);
      if (Math.hypot(door.x - p.x, door.z - p.z) < max) return { v, house: hi, door };
    }
    return null;
  }

  /** Horaires de visite : 6 h–22 h chez les habitants, heures d'ouverture des lieux. */
  hoursOf(target) {
    return target?.place ? target.place.hours : [6, 22];
  }

  canVisit(target = null) {
    const h = this.game.world.sky.hour;
    const [a, b] = this.hoursOf(target);
    return h >= a && h < b;
  }

  /** Texte de la porte (dehors). */
  doorPrompt(target) {
    const open = this.canVisit(target);
    const [a, b] = this.hoursOf(target);
    if (target.place) {
      const pl = target.place;
      return {
        title: `${pl.emoji} ${pl.name}`,
        sub: open ? pl.sub : `Fermé · ouvert de ${a} h à ${b} h`,
        actions: [{ key: 'E', label: open ? 'Entrer' : 'Toquer', dim: !open }],
      };
    }
    const v = target.v;
    return {
      title: `🚪 Maison de ${v.met ? v.def.name : '???'}`,
      sub: open ? 'Tu peux rendre visite' : `${v.def.name} dort (visites de ${a} h à ${b} h)`,
      actions: [{ key: 'E', label: open ? 'Frapper à la porte' : 'Frapper doucement', dim: !open }],
    };
  }

  nearExit(max = 1.5) {
    if (!this.active) return false;
    const p = this.game.player.pos;
    const e = this.entryPoint;
    return Math.hypot(p.x - e.x, p.z - (e.z + 0.3)) < max;
  }

  /** Nom du lieu visité (« Chez Rose », « Café des Chats »). */
  get label() {
    const a = this.active;
    if (!a) return '';
    return a.place ? a.place.name : `Chez ${a.v.def.name}`;
  }

  get emoji() {
    return this.active?.place?.emoji || '🚪';
  }

  /** Objet à regarder de près dans un lieu public (vitrine, bassin, véhicule…). */
  nearSpot() {
    if (!this.active) return null;
    const p = this.game.player.pos;
    let best = null;
    let bestD = Infinity;
    for (const s of this.spots) {
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      if (d < s.r && d < bestD) {
        best = s;
        bestD = d;
      }
    }
    return best;
  }

  clearRoom() {
    for (const c of this.colliders) this.game.world.colliders.remove(c);
    this.colliders = [];
    this.spots = [];
    this.anims = [];
    this.clearWallItems();
    for (const o of [...this.furniture.children]) {
      o.removeFromParent();
      o.traverse((m) => {
        if (!m.isMesh || m.name === 'outline') return;
        m.geometry.dispose();
        if (m.userData.ownMaterial) {
          m.material.map?.dispose();
          m.material.dispose();
        }
      });
    }
  }

  furnish(lay) {
    this.clearRoom();
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
    for (const [fid, lx, lz, rot = 0, extra] of lay.items) {
      if (fid.startsWith('@')) {
        this.special(fid.slice(1), lx, lz, rot, extra);
        continue;
      }
      const f = FURNITURE[fid];
      if (!f) continue;
      const obj = house.buildObject(fid, extra || f.color);
      obj.position.set(VISIT.x + lx, 0, VISIT.z + lz);
      obj.rotation.y = rot * (Math.PI / 2);
      this.furniture.add(obj);
      if (!f.rug) {
        const [fw, fd] = rot % 2 === 0 ? [f.w, f.d] : [f.d, f.w];
        this.colliders.push(col.addBox(VISIT.x + lx, VISIT.z + lz, fw / 2 - 0.05, fd / 2 - 0.05, 0));
      }
      if (f.light) this.lamps.push(obj);
    }
    for (const [fid, lx, extra] of lay.walls) {
      let obj;
      let mountY;
      let depth;
      if (fid === '@panneau') {
        obj = this.board(extra);
        mountY = 1.78;
        depth = 0.08;
      } else {
        const f = FURNITURE[fid];
        if (!f) continue;
        obj = house.buildObject(fid, f.color);
        mountY = f.mountY || 1.7;
        depth = f.d;
      }
      obj.position.set(lx, mountY, 0.12 + depth / 2);
      this.walls[0].full.add(obj);
      this.furniture.userData.wallItems = [...(this.furniture.userData.wallItems || []), obj];
    }
  }

  clearWallItems() {
    for (const o of this.furniture.userData.wallItems || []) {
      o.removeFromParent();
      o.traverse((m) => {
        if (!m.isMesh || m.name === 'outline') return;
        m.geometry.dispose();
        if (m.userData.ownMaterial) {
          m.material.map?.dispose();
          m.material.dispose();
        }
      });
    }
    this.furniture.userData.wallItems = [];
  }

  /** Ajoute un objet construit ici, avec son obstacle (boîte, dans le repère de l'objet). */
  addSpecial(obj, lx, lz, rot, hw, hd) {
    obj.position.set(VISIT.x + lx, 0, VISIT.z + lz);
    obj.rotation.y = rot * (Math.PI / 2);
    obj.traverse((m) => {
      if (m.isMesh && !m.material.transparent) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    this.furniture.add(obj);
    const [w, d] = rot % 2 === 0 ? [hw, hd] : [hd, hw];
    if (hw > 0) this.colliders.push(this.game.world.colliders.addBox(VISIT.x + lx, VISIT.z + lz, w, d, 0));
    return obj;
  }

  special(kind, lx, lz, rot, extra) {
    const g = this.game;
    switch (kind) {
      case 'comptoir': {
        // Comptoir du café : vitrine à gâteaux, machine à café, caisse.
        const s = new Shape();
        s.add(G.box(2.6, 0.95, 0.85), '#fffaf2', { pos: [0, 0.475, 0] });
        s.add(G.box(2.7, 0.08, 0.95), '#ff8fab', { pos: [0, 0.99, 0] });
        for (let i = 0; i < 7; i++) s.add(G.box(0.37, 0.95, 0.02), i % 2 ? '#ffe3eb' : '#ff8fab', { pos: [-1.11 + i * 0.37, 0.475, 0.43] });
        for (const sx of [-1, 1]) s.add(G.sphere(0.09, 8, 6), '#ffffff', { pos: [sx * 0.35, 0.6, 0.45], scale: [1, 1, 0.3] });
        s.add(G.sphere(0.12, 10, 8), '#ffffff', { pos: [0, 0.48, 0.45], scale: [1, 0.85, 0.3] });
        // Vitrine à gâteaux (verre à part).
        s.add(G.box(1.2, 0.04, 0.6), '#fffaf2', { pos: [-0.55, 1.05, 0] });
        const cakes = ['#ffe3a8', '#f7c6d2', '#c9a0ff', '#ffd6a5', '#b5e48c'];
        const tops = ['#ff8fab', '#ffffff', '#ffd84d', '#e5484d', '#ffffff'];
        for (let i = 0; i < 5; i++) {
          s.add(G.cyl(0.09, 0.08, 0.09, 10), cakes[i], { pos: [-0.98 + i * 0.21, 1.11, 0] });
          s.add(G.sphere(0.075, 8, 6), tops[i], { pos: [-0.98 + i * 0.21, 1.18, 0], scale: [1, 0.6, 1] });
        }
        // Machine à café et tasses.
        s.add(G.box(0.42, 0.5, 0.36), '#4e4c62', { pos: [0.75, 1.28, -0.12] });
        s.add(G.box(0.3, 0.08, 0.2), '#b8c0cc', { pos: [0.75, 1.09, 0.1] });
        s.add(G.cyl(0.05, 0.04, 0.08, 8), '#fffaf2', { pos: [0.75, 1.07, 0.12] });
        s.add(G.cyl(0.04, 0.04, 0.05, 8), '#e5484d', { pos: [0.65, 1.5, 0.02], rot: [Math.PI / 2, 0, 0] });
        // Caisse.
        s.add(G.box(0.32, 0.18, 0.26), '#8fd6e8', { pos: [1.15, 1.12, 0.05] });
        s.add(G.box(0.26, 0.1, 0.03), '#dff4ff', { pos: [1.15, 1.26, 0.0], rot: [-0.5, 0, 0] });
        const obj = new THREE.Group();
        const body = new THREE.Mesh(s.build(), vertexColorToon());
        withOutline(body, 0.012);
        obj.add(body);
        const glass = new THREE.Mesh(G.box(1.18, 0.34, 0.58), shadedMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.28, depthWrite: false, gradientMap: getGradientMap() }));
        glass.userData.ownMaterial = true;
        glass.position.set(-0.55, 1.24, 0);
        obj.add(glass);
        this.addSpecial(obj, lx, lz, rot, 1.3, 0.45);
        break;
      }
      case 'vehicule': {
        const id = extra;
        const owned = g.vehicles.owned[id];
        const color = owned || { voiturette: '#8fd6e8', scooter: '#ff8fab', velo: '#b5e48c', trottinette: '#ffd84d' }[id] || '#ff8fab';
        const m = vehicleModel(id, color);
        const s = new Shape().addRaw(m.geo);
        for (const [wx, wy, wz, r] of m.wheels) {
          const wg = wheelGeo(r, m.wheelW);
          wg.translate(wx, wy, wz);
          s.addRaw(wg);
        }
        const geo = s.build();
        geo.computeBoundingBox();
        geo.boundingBox.getSize(_size);
        const obj = new THREE.Group();
        const body = new THREE.Mesh(geo, vertexColorToon());
        withOutline(body, 0.012);
        obj.add(body);
        // Petit panneau sur pied : « À toi ! » ou le prix.
        const def = VEHICLES[id];
        const tag = plaque(owned ? `${def.emoji} À toi !` : `${def.emoji} ${def.price} pièces`, owned ? '#2f9e74' : '#c0584a');
        tag.userData.ownMaterial = true;
        const [tx, tz] = [0, _size.z / 2 + 0.35];
        tag.position.set(tx, 0.55, tz);
        tag.rotation.x = -0.35;
        obj.add(tag);
        obj.add(new THREE.Mesh(new Shape().add(G.cyl(0.015, 0.015, 0.5, 5), '#6b6b78', { pos: [tx, 0.25, tz] }).build(), vertexColorToon()));
        this.addSpecial(obj, lx, lz, rot, _size.x / 2, _size.z / 2);
        this.spots.push({
          x: VISIT.x + lx, z: VISIT.z + lz, r: Math.max(_size.x, _size.z) / 2 + 1.0,
          title: `${def.emoji} ${def.label}`,
          sub: owned ? 'À toi ! (V pour l\'appeler dehors)' : `${def.price} pièces · ${def.desc}`,
          label: 'Boutique de Léo',
          act: () => {
            const leo = g.villagers.get('leo');
            g.shop.open('garage', leo);
          },
        });
        break;
      }
      case 'etabli': {
        const s = new Shape();
        s.add(G.box(2.2, 0.1, 0.7), '#b98457', { pos: [0, 0.9, 0] });
        for (const x of [-1.0, 1.0]) for (const z of [-0.28, 0.28]) s.add(G.box(0.1, 0.88, 0.1), '#4e4c62', { pos: [x, 0.44, z] });
        s.add(G.box(2.0, 0.06, 0.6), '#4e4c62', { pos: [0, 0.25, 0] });
        // Panneau à outils contre le mur.
        s.add(G.box(2.2, 1.0, 0.05), '#d9a86c', { pos: [0, 1.6, -0.33] });
        const tools = ['#e5484d', '#ffd84d', '#6fa8dc', '#b8c0cc', '#6fcf97', '#ff8fab'];
        tools.forEach((c, i) => {
          s.add(G.box(0.06, 0.38, 0.03), c, { pos: [-0.85 + i * 0.34, 1.6, -0.29] });
          s.add(G.box(0.16, 0.07, 0.04), '#b8c0cc', { pos: [-0.85 + i * 0.34, 1.82, -0.28] });
        });
        s.add(G.torus(0.16, 0.05, 6, 12), '#2e2e3a', { pos: [-0.6, 1.0, 0.05], rot: [Math.PI / 2, 0, 0] });
        s.add(G.box(0.4, 0.22, 0.26), '#e5484d', { pos: [0.4, 1.06, 0] });
        s.add(G.cyl(0.1, 0.1, 0.18, 10), '#6fa8dc', { pos: [0.85, 1.04, 0.1] });
        const obj = new THREE.Group();
        const body = new THREE.Mesh(s.build(), vertexColorToon());
        withOutline(body, 0.012);
        obj.add(body);
        this.addSpecial(obj, lx, lz, rot, 1.15, 0.4);
        break;
      }
      case 'pneus': {
        const s = new Shape();
        for (let i = 0; i < 3; i++) s.add(G.torus(0.34, 0.14, 8, 16), '#2e2e3a', { pos: [0, 0.15 + i * 0.28, 0], rot: [Math.PI / 2, 0, 0] });
        s.add(G.cyl(0.2, 0.2, 0.05, 10), '#b8c0cc', { pos: [0, 0.86, 0] });
        const obj = new THREE.Group();
        obj.add(new THREE.Mesh(s.build(), vertexColorToon()));
        this.addSpecial(obj, lx, lz, rot, 0.45, 0.45);
        break;
      }
      case 'vitrine': this.vitrine(lx, lz, rot, extra); break;
      case 'bassin': this.tank(lx, lz, rot); break;
      case 'colonne': this.column(lx, lz); break;
      default: break;
    }
  }

  /** Insectes attrapés, des plus rares aux plus communs. */
  caughtInsects() {
    const caught = this.game.insects.caught;
    return INSECTS.filter((b) => caught[b.id]).sort((a, b) => b.rarity - a.rarity || b.price - a.price);
  }

  vitrine(lx, lz, rot, slot) {
    const g = this.game;
    const s = new Shape();
    s.add(G.box(0.62, 0.86, 0.62), '#fffaf2', { pos: [0, 0.43, 0] });
    s.add(G.box(0.7, 0.06, 0.7), '#b98457', { pos: [0, 0.89, 0] });
    s.add(G.box(0.7, 0.08, 0.7), '#b98457', { pos: [0, 0.04, 0] });
    s.add(G.cyl(0.2, 0.22, 0.05, 14), '#c0584a', { pos: [0, 0.945, 0] });
    const obj = new THREE.Group();
    const body = new THREE.Mesh(s.build(), vertexColorToon());
    withOutline(body, 0.012);
    obj.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), shadedMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.25, depthWrite: false, gradientMap: getGradientMap() }));
    dome.userData.ownMaterial = true;
    dome.position.y = 0.92;
    dome.scale.y = 1.3;
    obj.add(dome);
    const def = this.caughtInsects()[slot];
    const tag = plaque(def ? `${def.emoji} ${def.label}` : '??? · à découvrir', def ? '#5b4636' : '#9a8574');
    tag.userData.ownMaterial = true;
    tag.position.set(0, 0.62, 0.315);
    obj.add(tag);
    if (def) {
      const { group } = insectMesh(def);
      group.scale.multiplyScalar(0.85);
      group.position.y = def.kind === 'fly' ? 1.12 : 0.98;
      group.traverse((m) => {
        if (m.isMesh) m.userData.ownMaterial = m.material !== vertexColorToon();
      });
      obj.add(group);
      this.anims.push((dt) => {
        group.rotation.y += dt * 0.6;
      });
    }
    this.addSpecial(obj, lx, lz, rot, 0.36, 0.36);
    const rar = ['Commun', 'Peu commun', 'Rare', 'Légendaire'];
    this.spots.push({
      x: VISIT.x + lx, z: VISIT.z + lz, r: 0.95,
      title: def ? `${def.emoji} ${def.label}` : '🔍 Vitrine vide',
      sub: def ? `${rar[def.rarity]} · attrapé ×${g.insects.caught[def.id]}` : 'Attrape d\'autres insectes pour la remplir !',
      label: 'Voir la collection',
      act: () => this.openCollections(),
    });
  }

  /** Bassin rectangulaire (vitre vers +z dans son repère), ouvert sur le dessus. */
  tank(lx, lz, rot) {
    const L = 3.3;
    const D = 0.84;
    const s = new Shape();
    s.add(G.box(L + 0.1, 0.5, D + 0.06), '#8f6243', { pos: [0, 0.25, 0] });
    s.add(G.box(L - 0.1, 0.08, D - 0.14), '#f2dfb4', { pos: [0, 0.56, 0] });
    // Cadre : montants aux coins et rebord en haut (on voit les poissons d'en haut).
    for (const x of [-L / 2, L / 2]) for (const z of [-D / 2, D / 2]) s.add(G.box(0.06, 1.32, 0.06), '#b98457', { pos: [x, 1.16, z] });
    for (const z of [-D / 2, D / 2]) s.add(G.box(L + 0.06, 0.06, 0.06), '#b98457', { pos: [0, 1.83, z] });
    for (const x of [-L / 2, L / 2]) s.add(G.box(0.06, 0.06, D + 0.06), '#b98457', { pos: [x, 1.83, 0] });
    for (const [x, c, h] of [[-1.3, '#ff8fab', 0.35], [-0.6, '#3f9d4a', 0.55], [0.3, '#ffb27a', 0.3], [1.0, '#3f9d4a', 0.45], [1.4, '#c9a0ff', 0.28]]) {
      s.add(G.cone(0.09, h, 6), c, { pos: [x, 0.6 + h / 2, -0.2] });
      s.add(G.cone(0.07, h * 0.8, 6), c, { pos: [x + 0.12, 0.6 + h * 0.4, -0.1] });
    }
    for (const x of [-1.0, 0.7]) s.add(G.dodeca(0.14), '#b8a894', { pos: [x, 0.66, 0.12], scale: [1.3, 0.7, 1] });
    const obj = new THREE.Group();
    obj.add(new THREE.Mesh(s.build(), vertexColorToon()));
    const water = new THREE.Mesh(G.box(L - 0.06, 1.18, D - 0.06), new THREE.MeshBasicMaterial({ color: '#4fc3e8', transparent: true, opacity: 0.32, depthWrite: false }));
    water.userData.ownMaterial = true;
    water.position.y = 1.18;
    water.renderOrder = 2;
    obj.add(water);
    this.addSpecial(obj, lx, lz, rot, L / 2 + 0.05, D / 2 + 0.03);
    (this.tanks ||= []).push({ obj, kind: 'box', L });
    const [wx, wz] = rot2(0, 0.9, rot * (Math.PI / 2));
    this.spots.push({ x: VISIT.x + lx + wx, z: VISIT.z + lz + wz, r: 1.6, ...this.fishSpot() });
  }

  /** Grand aquarium cylindrique au centre. */
  column(lx, lz) {
    const s = new Shape();
    s.add(G.cyl(0.78, 0.82, 0.45, 20), '#8f6243', { pos: [0, 0.225, 0] });
    s.add(G.cyl(0.72, 0.72, 0.06, 20), '#f2dfb4', { pos: [0, 0.48, 0] });
    s.add(G.torus(0.74, 0.05, 6, 28), '#b98457', { pos: [0, 2.56, 0], rot: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      s.add(G.box(0.05, 2.1, 0.05), '#b98457', { pos: [Math.cos(a) * 0.74, 1.51, Math.sin(a) * 0.74] });
    }
    for (const [x, z, c, h] of [[-0.3, -0.2, '#3f9d4a', 0.7], [0.25, 0.3, '#ff8fab', 0.4], [0.1, -0.35, '#ffb27a', 0.35], [-0.2, 0.35, '#3f9d4a', 0.5]]) s.add(G.cone(0.1, h, 6), c, { pos: [x, 0.5 + h / 2, z] });
    const obj = new THREE.Group();
    obj.add(new THREE.Mesh(s.build(), vertexColorToon()));
    const water = new THREE.Mesh(G.cyl(0.71, 0.71, 2.0, 28), new THREE.MeshBasicMaterial({ color: '#4fc3e8', transparent: true, opacity: 0.3, depthWrite: false }));
    water.userData.ownMaterial = true;
    water.position.y = 1.51;
    water.renderOrder = 2;
    obj.add(water);
    this.addSpecial(obj, lx, lz, 0, 0.8, 0.8);
    (this.tanks ||= []).push({ obj, kind: 'round' });
    this.spots.push({ x: VISIT.x + lx, z: VISIT.z + lz, r: 1.7, ...this.fishSpot() });
  }

  fishSpot() {
    const n = Object.keys(this.game.fishing.best).length;
    return {
      title: '🐠 Bassin',
      sub: n ? `${n} espèce${n > 1 ? 's' : ''} pêchée${n > 1 ? 's' : ''} sur ${FISH.length}` : 'Pêche des poissons pour les voir nager ici !',
      label: 'Voir la collection',
      act: () => this.openCollections(),
    };
  }

  /** Poissons de l'aquarium : les pensionnaires, puis chaque espèce pêchée. */
  stockTanks() {
    const tanks = this.tanks || [];
    if (!tanks.length) return;
    const best = this.game.fishing.best;
    const list = HOUSE_FISH.map(([c, len]) => ({ color: c, len }));
    for (const f of FISH) {
      if (!best[f.id]) continue;
      const cm = (f.size ? (f.size[0] + f.size[1]) / 2 : 30);
      list.push({ color: FISH_COLORS[f.id] || '#9fb3c2', len: THREE.MathUtils.clamp(0.2 + cm / 350, 0.22, 0.5) });
    }
    list.forEach((f, i) => {
      const tank = tanks[i % tanks.length];
      const m = fishMesh(f.color, f.len);
      tank.obj.add(m);
      const sp = 0.25 + ((i * 37) % 10) / 25;
      const ph = i * 1.7;
      const dir = i % 2 ? 1 : -1;
      if (tank.kind === 'box') {
        const rx = tank.L / 2 - 0.2 - f.len / 2;
        const y = 0.85 + ((i * 53) % 7) / 10;
        const cx = (((i * 29) % 5) - 2) * 0.08;
        this.anims.push((dt, t) => {
          const a = t * sp * dir + ph;
          m.position.set(cx + Math.sin(a) * rx, y + Math.sin(a * 2.3) * 0.05, Math.cos(a) * 0.2);
          m.rotation.y = Math.atan2(Math.cos(a) * rx * dir, -Math.sin(a) * 0.2 * dir) + Math.sin(t * 9 + i) * 0.12;
        });
      } else {
        const r = 0.3 + ((i * 17) % 4) * 0.06;
        const y = 0.85 + ((i * 41) % 12) / 10;
        this.anims.push((dt, t) => {
          const a = t * sp * dir + ph;
          m.position.set(Math.sin(a) * r, y + Math.sin(a * 1.7) * 0.06, Math.cos(a) * r);
          m.rotation.y = a + (dir > 0 ? Math.PI / 2 : -Math.PI / 2) + Math.sin(t * 9 + i) * 0.12;
        });
      }
    });
  }

  /** Grand panneau de la collection (insectes ou poissons), sur le mur du fond. */
  board(kind) {
    let entries;
    let title;
    let cols;
    if (kind === 'insectes') {
      const caught = this.game.insects.caught;
      entries = INSECTS.map((b) => ({ known: !!caught[b.id], emoji: b.emoji, label: b.label, color: b.color }));
      title = `🦋 Insectes de l'archipel · ${entries.filter((e) => e.known).length}/${entries.length}`;
      cols = 6;
    } else {
      const best = this.game.fishing.best;
      entries = FISH.map((f) => ({ known: !!best[f.id], emoji: f.emoji, label: f.label, color: FISH_COLORS[f.id] }));
      title = `🐟 Poissons de l'archipel · ${entries.filter((e) => e.known).length}/${entries.length}`;
      cols = 8;
    }
    const obj = collectionBoard(title, entries, cols);
    obj.traverse((m) => {
      if (m.isMesh && m.material !== vertexColorToon()) m.userData.ownMaterial = true;
    });
    this.spots.push({
      x: VISIT.x, z: VISIT.z - VISIT.d / 2 + 0.7, r: 1.7,
      title: kind === 'insectes' ? '🦋 Collection d\'insectes' : '🐟 Collection de poissons',
      sub: `${entries.filter((e) => e.known).length} espèces sur ${entries.length}`,
      label: 'Voir le détail',
      act: () => this.openCollections(),
    });
    return obj;
  }

  openCollections() {
    const g = this.game;
    g.journal.tab = 'collections';
    g.openPanel('journal');
  }

  /** Les chats du café entrent avec nous (et retrouvent leur terrasse en sortant). */
  inviteCafeCats() {
    const g = this.game;
    const room = { x: VISIT.x, z: VISIT.z, hw: VISIT.w / 2 - 0.5, hd: VISIT.d / 2 - 0.5 };
    const spots = [[0.3, -0.9], [-0.7, 0.3], [3.2, -1.6], [-1.2, -1.2], [3.4, 1.4], [-3.4, 0.4], [0.9, 1.5]];
    this.guests = g.animals.adoptable();
    this.guests.forEach((a, i) => {
      const [sx, sz] = spots[i % spots.length];
      const r = g.world.colliders.resolve(VISIT.x + sx, VISIT.z + sz, 0.3);
      a.room = room;
      a.home = { x: VISIT.x, z: VISIT.z, r: 3 };
      a.teleport(r.x, r.z);
      a.state = 'idle';
      a.stateT = 0.5 + i * 0.4;
    });
  }

  sendGuestsHome() {
    const g = this.game;
    for (const a of this.guests) {
      a.room = null;
      if (a.adopted) {
        // Adopté pendant la visite sans pouvoir suivre : il file au jardin.
        if (!a.follow) a.teleport(a.home.x, a.home.z);
        continue;
      }
      a.home = { ...a.wildHome };
      const ang = Math.random() * Math.PI * 2;
      a.teleport(a.home.x + Math.cos(ang) * 2.5, a.home.z + Math.sin(ang) * 2.5);
    }
    this.guests = [];
    // Un pensionnaire adopté pendant la visite : il suit, plus d'enclos.
    for (const a of g.animals.animals) a.room = null;
  }

  /**
   * Entrer : maison d'habitant (cible { v, house }) ou lieu public ({ id, place, house, v }).
   * Un habitant seul (ancien appel) est accepté aussi.
   */
  enter(target) {
    const g = this.game;
    if (target && target.def) target = { v: target, house: target.def.house };
    const { v, place } = target;
    if (!this.canVisit(target)) {
      const [a, b] = this.hoursOf(target);
      g.ui.toast(place ? `${place.emoji} ${place.name} est fermé. Ouvert de ${a} h à ${b} h !` : `🌙 Chut… ${v.def.name} dort déjà. Reviens demain (de ${a} h à ${b} h) !`, 3500);
      return;
    }
    g.audio.play('bell');
    g.fade(() => {
      this.tanks = [];
      this.furnish(place ? place.layout : LAYOUTS[v.def.id]);
      this.stockTanks();
      this.active = { ...target, id: target.id || v.def.id };
      this.group.visible = true;
      const e = this.entryPoint;
      g.player.teleport(e.x, e.z, Math.PI);
      for (const a of g.animals.followers()) a.teleport(e.x + (Math.random() - 0.5) * 2, e.z - 0.8);
      if (target.id === 'cafe') this.inviteCafeCats();
      if (v) {
        v.character.setSit(false);
        v.character.setFishing(false);
        const at = place?.hostAt || [0.3, -0.6];
        v.override = { x: VISIT.x + at[0], z: VISIT.z + at[1], rot: 0 };
        const lines = place?.greet || GREETINGS;
        setTimeout(() => v.say(lines[Math.floor(Math.random() * lines.length)], 3200), 600);
        const day = g.world.sky.day;
        if (this.visitedDay[v.def.id] !== day) {
          this.visitedDay[v.def.id] = day;
          g.dialogue.addFriendship(v, 3);
        }
      } else if (place?.welcome) {
        setTimeout(() => g.ui.toast(place.welcome, 3800), 500);
      }
      if (place) this.placesSeen.add(target.id);
      g.cam.yaw = 0;
      g.cam.pitch = 0.75;
      g.cam.dist = 10;
      g.cam.snap = true;
      g.emit('visit', { villager: v, place: target.id && place ? target.id : null });
      g.tips.show('visite');
      g.dirty = true;
    }, 450);
  }

  exit() {
    const g = this.game;
    const act = this.active;
    if (!act) return;
    g.fade(() => {
      const d = g.world.village.doorFront(act.house, 1.7);
      g.player.teleport(d.x, d.z, d.rot);
      for (const a of g.animals.followers()) a.teleport(d.x + Math.sin(d.rot) * 1.2, d.z + Math.cos(d.rot) * 1.2);
      this.sendGuestsHome();
      if (act.v) {
        act.v.override = null;
        act.v.placeAt(act.v.scheduled(g.world.sky.hour));
      }
      this.active = null;
      this.group.visible = false;
      this.clearRoom();
      this.tanks = [];
      g.cam.yaw = d.rot + Math.PI;
      g.cam.pitch = 0.36;
      g.cam.dist = 9;
      g.cam.snap = true;
    }, 400);
  }

  update(camera, dt = 0) {
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
    this.t = (this.t || 0) + dt;
    for (const f of this.anims) f(dt, this.t);
    // L'hôte regarde le joueur.
    const v = this.active.v;
    const p = this.game.player.pos;
    if (v?.override) v.override.rot = Math.atan2(p.x - v.override.x, p.z - v.override.z);
  }

  serialize() {
    return { ...this.visitedDay, _places: [...this.placesSeen] };
  }

  restore(d) {
    const { _places, ...days } = d || {};
    this.visitedDay = days;
    this.placesSeen = new Set(Array.isArray(_places) ? _places : []);
  }
}
