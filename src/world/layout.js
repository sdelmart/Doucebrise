// Plan de l'île de Doucebrise : zones, chemins, points d'intérêt.
// (−Z = nord, +X = est)

export const WORLD_SEED = 20260925;

export const ZONES = [
  { id: 'village', name: 'Place du Village', x: 0, z: 0, r: 26, emoji: '🏡' },
  { id: 'prairie', name: 'Prairie aux Fleurs', x: 50, z: 8, r: 30, emoji: '🌷' },
  { id: 'foret', name: 'Bois Chuchotant', x: -2, z: -56, r: 36, emoji: '🌲' },
  { id: 'etang', name: 'Étang des Canards', x: -52, z: 6, r: 22, emoji: '🦆' },
  { id: 'colline', name: 'Colline du Moulin', x: -40, z: 50, r: 26, emoji: '🌾' },
  { id: 'plage', name: 'Plage Coquillage', x: 16, z: 80, r: 26, emoji: '🐚' },
  { id: 'phare', name: 'Cap du Phare', x: 66, z: -56, r: 20, emoji: '🗼' },
  { id: 'verger', name: 'Verger Pommelé', x: 30, z: -26, r: 16, emoji: '🍎' },
];

export const PATHS = [
  [[0, 0], [22, 5], [50, 8]],
  [[0, 0], [-3, -24], [0, -46], [-4, -70]],
  [[0, 0], [-24, 4], [-38, 6]],
  [[0, 0], [-14, 22], [-34, 42], [-40, 50]],
  [[0, 0], [8, 28], [13, 55], [16, 76]],
  [[0, 0], [16, -12], [30, -26], [50, -44], [64, -54]],
];

export const LANDMARKS = {
  plaza: { x: 0, z: 0, r: 13 },
  pond: { x: -52, z: 6, r: 13 },
  windmill: { x: -40, z: 50 },
  lighthouse: { x: 68, z: -58 },
  pier: { x: 16, z: 84, len: 20 },
  playerHouse: { x: -16, z: 14, rot: Math.PI * 0.72 },
};

export function zoneAt(x, z) {
  let best = null;
  let bestD = Infinity;
  for (const zone of ZONES) {
    const d = Math.hypot(x - zone.x, z - zone.z) / zone.r;
    if (d < 1 && d < bestD) {
      best = zone;
      bestD = d;
    }
  }
  return best;
}
