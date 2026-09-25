// Plan de l'archipel de Doucebrise : l'île principale, l'île des Pins (montagne)
// et l'île Corail (lagon), reliées par deux ponts. Zones, chemins et repères.
// (−Z = nord, +X = est)

export const WORLD_SEED = 20260925;

/** Demi-taille du monde affiché sur la carte. */
export const MAP_RANGE = 250;

/** Îles secondaires : centre, rayon, relief. */
export const ISLANDS = {
  pins: { id: 'pins', x: -152, z: -138, r: 70, seed: 11, base: 3.6, rough: 3.2, beach: 2 },
  corail: { id: 'corail', x: 162, z: 96, r: 66, seed: 23, base: 1.7, rough: 1.3, beach: 9 },
};

export const LANDMARKS = {
  plaza: { x: 0, z: 0, r: 13 },
  pond: { x: -52, z: 6, r: 13 },
  windmill: { x: -40, z: 50 },
  lighthouse: { x: 68, z: -58 },
  pier: { x: 16, z: 84, len: 20 },
  playerHouse: { x: -16, z: 14, rot: Math.PI * 0.72 },
  // Île des Pins.
  bourg: { x: -128, z: -116, r: 13, h: 4.4 },
  peak: { x: -174, z: -164, h: 24 },
  lake: { x: -186, z: -112, r: 13 },
  hotspring: { x: -116, z: -156, r: 6 },
  // Île Corail.
  port: { x: 141, z: 70, r: 14, h: 2.3 },
  lookout: { x: 186, z: 124, h: 7 },
  lagoon: { x: 212, z: 96, r: 22 },
  palms: { x: 170, z: 108 },
};

export const ZONES = [
  { id: 'village', name: 'Place du Village', x: 0, z: 0, r: 26, emoji: '🏡' },
  { id: 'prairie', name: 'Prairie aux Fleurs', x: 50, z: 8, r: 30, emoji: '🌷' },
  { id: 'foret', name: 'Bois Chuchotant', x: -2, z: -56, r: 36, emoji: '🌲' },
  { id: 'etang', name: 'Étang des Canards', x: -52, z: 6, r: 22, emoji: '🦆' },
  { id: 'colline', name: 'Colline du Moulin', x: -40, z: 50, r: 26, emoji: '🌾' },
  { id: 'plage', name: 'Plage Coquillage', x: 16, z: 80, r: 26, emoji: '🐚' },
  { id: 'phare', name: 'Cap du Phare', x: 66, z: -56, r: 20, emoji: '🗼' },
  { id: 'verger', name: 'Verger Pommelé', x: 30, z: -26, r: 16, emoji: '🍎' },
  // Île des Pins.
  { id: 'pont-pins', name: 'Pont des Brumes', x: -84, z: -76, r: 18, emoji: '🌉' },
  { id: 'bourg', name: 'Bourg-Sapin', x: -128, z: -116, r: 24, emoji: '🏔️' },
  { id: 'pic', name: 'Pic des Neiges', x: -174, z: -164, r: 26, emoji: '🗻' },
  { id: 'lac', name: 'Lac Miroir', x: -186, z: -112, r: 20, emoji: '🏞️' },
  { id: 'source', name: 'Source Chaude', x: -116, z: -156, r: 14, emoji: '♨️' },
  { id: 'pinede', name: 'Grande Pinède', x: -152, z: -138, r: 75, emoji: '🌲' },
  // Île Corail.
  { id: 'pont-corail', name: 'Pont du Soleil', x: 91, z: 54, r: 16, emoji: '🌉' },
  { id: 'port', name: 'Port-Corail', x: 141, z: 70, r: 24, emoji: '⚓' },
  { id: 'palmeraie', name: 'Palmeraie', x: 170, z: 108, r: 26, emoji: '🌴' },
  { id: 'lagon', name: 'Lagon Turquoise', x: 212, z: 96, r: 24, emoji: '🐠' },
  { id: 'belvedere', name: 'Colline aux Mouettes', x: 186, z: 124, r: 18, emoji: '🕊️' },
  { id: 'corail', name: 'Île Corail', x: 162, z: 96, r: 72, emoji: '🏝️' },
];

/** Île où se trouve un point ('main', 'pins' ou 'corail'). */
export function islandAt(x, z) {
  for (const i of Object.values(ISLANDS)) if (Math.hypot(x - i.x, z - i.z) < i.r + 18) return i.id;
  return 'main';
}

export const PATHS = [
  // Île principale.
  [[0, 0], [22, 5], [50, 8]],
  [[0, 0], [-3, -24], [0, -46], [-4, -70]],
  [[0, 0], [-24, 4], [-38, 6]],
  [[0, 0], [-14, 22], [-34, 42], [-40, 50]],
  [[0, 0], [8, 28], [13, 55], [16, 76]],
  [[0, 0], [16, -12], [30, -26], [50, -44], [64, -54]],
  // Vers les ponts.
  [[-3, -24], [-26, -38], [-50, -54], [-70, -64]],
  [[50, 8], [64, 26], [80, 46]],
  // Île des Pins.
  [[-108, -98], [-118, -107], [-128, -116]],
  [[-128, -116], [-140, -134], [-156, -150], [-168, -160]],
  [[-128, -116], [-150, -112], [-172, -112]],
  [[-128, -116], [-120, -136], [-117, -150]],
  // Île Corail.
  [[109, 64.5], [124, 66], [141, 70]],
  [[141, 70], [154, 88], [168, 104], [184, 120]],
  [[141, 70], [162, 76], [184, 86], [198, 94]],
  [[141, 70], [134, 54], [128, 46]],
];
// Premier indice des chemins des îles secondaires (le relief de l'île principale ne les voit pas).
export const MAIN_PATH_COUNT = 8;

export function zoneAt(x, z) {
  let best = null;
  let bestD = Infinity;
  for (const zone of ZONES) {
    const r = Math.hypot(x - zone.x, z - zone.z) / zone.r;
    // Les grandes zones (une île entière) ne l'emportent que hors des lieux précis.
    const d = zone.r >= 70 ? r + 1 : r;
    if (r < 1 && d < bestD) {
      best = zone;
      bestD = d;
    }
  }
  return best;
}
