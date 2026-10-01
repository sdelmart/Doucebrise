// Registre de tous les objets du jeu : nourriture, récoltes, cueillette, graines, plats.
// `price` = prix de vente au marché, `buy` = prix d'achat en boutique.
// `feed` = peut être donné aux animaux.

export const ITEMS = {
  // Cueillette (nourriture de base des animaux)
  baie: { label: 'Baies', emoji: '🍒', cat: 'food', price: 6, feed: true },
  pomme: { label: 'Pommes', emoji: '🍎', cat: 'food', price: 10, feed: true },
  carotte: { label: 'Carottes', emoji: '🥕', cat: 'food', price: 12, feed: true },
  graine: { label: 'Graines', emoji: '🌻', cat: 'food', price: 4, feed: true },
  poisson: { label: 'Poisson frais', emoji: '🐟', cat: 'food', price: 18, feed: true, tag: 'poisson' },
  friandise: { label: 'Friandises', emoji: '🍪', cat: 'food', price: 35, feed: true, treat: true, desc: 'Tous les animaux en raffolent.' },
  patee: { label: 'Pâtée pour chat', emoji: '🥫', cat: 'food', price: 30, feed: true, catTreat: true, desc: 'Les chats ne résistent pas à la pâtée !' },
  appat: { label: 'Appâts', emoji: '🪱', cat: 'tool', price: 4, desc: 'Utilisé automatiquement : ça mord plus vite et mieux.' },

  // Récoltes du potager
  fraise: { label: 'Fraises', emoji: '🍓', cat: 'crop', price: 24, feed: true },
  tomate: { label: 'Tomates', emoji: '🍅', cat: 'crop', price: 22, feed: true },
  mais: { label: 'Maïs', emoji: '🌽', cat: 'crop', price: 26, feed: true },
  citrouille: { label: 'Citrouilles', emoji: '🎃', cat: 'crop', price: 65, feed: true },
  pasteque: { label: 'Pastèques', emoji: '🍉', cat: 'crop', price: 72, feed: true, desc: 'Juteuse et sucrée : les animaux en raffolent aussi.' },

  // Trouvailles
  champignon: { label: 'Champignons', emoji: '🍄', cat: 'forage', price: 16 },
  coquillage: { label: 'Coquillages', emoji: '🐚', cat: 'forage', price: 12 },
  fleur: { label: 'Fleurs', emoji: '🌷', cat: 'forage', price: 8 },
  myrtille: { label: 'Myrtilles', emoji: '🫐', cat: 'food', price: 14, feed: true },
  'noix-coco': { label: 'Noix de coco', emoji: '🥥', cat: 'food', price: 28, feed: true },
  'pomme-pin': { label: 'Pommes de pin', emoji: '🌰', cat: 'forage', price: 8, feed: true },
  edelweiss: { label: 'Edelweiss', emoji: '🌼', cat: 'forage', price: 30 },
  hibiscus: { label: 'Hibiscus', emoji: '🌺', cat: 'forage', price: 16 },
  cristal: { label: 'Cristaux', emoji: '💎', cat: 'forage', price: 70, desc: 'Ils scintillent sur les flancs du Pic des Neiges.' },
  corail: { label: 'Corail', emoji: '🪸', cat: 'forage', price: 40 },
  'etoile-mer': { label: 'Étoiles de mer', emoji: '✴️', cat: 'forage', price: 26 },
  perle: { label: 'Perle', emoji: '🦪', cat: 'forage', price: 180, desc: 'Un trésor du lagon, rare et précieux.' },
  'lettre-aurele': { label: 'Lettre d\'Aurèle', emoji: '💌', cat: 'quest', price: 0, desc: 'Une lettre cachetée de cire, pour Mamie Rose. L\'écriture tremble un peu.' },
  conque: { label: 'Conque des pêcheurs', emoji: '🐚', cat: 'quest', price: 0, desc: 'Elle chante comme une baleine. À souffler au bout du ponton du lagon, la nuit.' },
  'fragment-etoile': { label: 'Fragment d\'étoile', emoji: '🌠', cat: 'forage', price: 220, desc: 'Tombé d\'une étoile filante, après un vœu.' },

  // Graines à planter
  'sem-carotte': { label: 'Semis de carottes', emoji: '🌱', cat: 'seed', crop: 'carotte', buy: 10, price: 3 },
  'sem-fraise': { label: 'Semis de fraises', emoji: '🌱', cat: 'seed', crop: 'fraise', buy: 16, price: 5 },
  'sem-tomate': { label: 'Semis de tomates', emoji: '🌱', cat: 'seed', crop: 'tomate', buy: 14, price: 4 },
  'sem-mais': { label: 'Semis de maïs', emoji: '🌱', cat: 'seed', crop: 'mais', buy: 18, price: 5 },
  'sem-citrouille': { label: 'Semis de citrouille', emoji: '🌱', cat: 'seed', crop: 'citrouille', buy: 30, price: 8 },
  'sem-pasteque': { label: 'Semis de pastèque', emoji: '🌱', cat: 'seed', crop: 'pasteque', buy: 32, price: 9 },

  // Plats cuisinés
  tarte: { label: 'Tarte aux pommes', emoji: '🥧', cat: 'dish', price: 85 },
  confiture: { label: 'Confiture', emoji: '🍯', cat: 'dish', price: 50 },
  salade: { label: 'Salade du jardin', emoji: '🥗', cat: 'dish', price: 75 },
  soupe: { label: 'Soupe de citrouille', emoji: '🍲', cat: 'dish', price: 140 },
  maki: { label: 'Makis', emoji: '🍣', cat: 'dish', price: 70 },
  popcorn: { label: 'Pop-corn', emoji: '🍿', cat: 'dish', price: 65 },
  jus: { label: 'Jus de fruits', emoji: '🧃', cat: 'dish', price: 55 },
  omelette: { label: 'Poêlée forestière', emoji: '🍳', cat: 'dish', price: 60 },
  'tarte-myrtille': { label: 'Tarte aux myrtilles', emoji: '🫐', cat: 'dish', price: 110 },
  crepe: { label: 'Crêpes', emoji: '🥞', cat: 'dish', price: 80 },
  'jus-coco': { label: 'Jus de coco', emoji: '🥥', cat: 'dish', price: 70 },
  brochette: { label: 'Brochettes de la mer', emoji: '🍢', cat: 'dish', price: 95 },
  'salade-tropicale': { label: 'Salade tropicale', emoji: '🥗', cat: 'dish', price: 120 },
  'soupe-bois': { label: 'Soupe des bois', emoji: '🥣', cat: 'dish', price: 90 },
  croissant: { label: 'Croissant', emoji: '🥐', cat: 'dish', price: 30 },
  chocolat: { label: 'Chocolat chaud', emoji: '☕', cat: 'dish', price: 35 },
  glace: { label: 'Glace', emoji: '🍦', cat: 'dish', price: 30 },
  cocktail: { label: 'Cocktail de fruits', emoji: '🍹', cat: 'dish', price: 40 },
  'tarte-citrouille': { label: 'Tarte à la citrouille', emoji: '🥧', cat: 'dish', price: 160 },
  'jus-pasteque': { label: 'Jus de pastèque', emoji: '🥤', cat: 'dish', price: 120 },
  'sorbet-pasteque': { label: 'Sorbet pastèque', emoji: '🍧', cat: 'dish', price: 170 },
};

export const CATEGORIES = [
  { id: 'food', label: 'Nourriture' },
  { id: 'fish', label: 'Poissons' },
  { id: 'insect', label: 'Insectes' },
  { id: 'crop', label: 'Récoltes' },
  { id: 'forage', label: 'Trouvailles' },
  { id: 'seed', label: 'Graines' },
  { id: 'dish', label: 'Plats' },
  { id: 'tool', label: 'Matériel' },
  { id: 'quest', label: 'Objets de quête' },
];

/** Objets affichés en permanence dans la barre du bas. */
export const HOTBAR = ['baie', 'pomme', 'carotte', 'graine', 'poisson', 'friandise', 'patee'];

export const RECIPES = [
  { id: 'friandise', needs: { graine: 2, baie: 1 }, known: true },
  { id: 'confiture', needs: { baie: 3 }, known: true },
  { id: 'tarte', needs: { pomme: 2, baie: 1 }, known: true },
  { id: 'jus', needs: { pomme: 1, fraise: 1 }, known: false, from: 'Pomme' },
  { id: 'salade', needs: { tomate: 1, carotte: 1 }, known: false, from: 'Mamie Rose' },
  { id: 'maki', needs: { poisson: 2 }, known: false, from: 'Marin' },
  { id: 'popcorn', needs: { mais: 2 }, known: false, from: 'Noé' },
  { id: 'omelette', needs: { champignon: 2, tomate: 1 }, known: false, from: 'Lila' },
  { id: 'soupe', needs: { citrouille: 1, carotte: 2 }, known: false, from: 'Bruno' },
  { id: 'tarte-myrtille', needs: { myrtille: 3, pomme: 1 }, known: false, from: 'Élise' },
  { id: 'crepe', needs: { mais: 1, fraise: 2 }, known: false, from: 'Élise' },
  { id: 'soupe-bois', needs: { champignon: 2, carotte: 1, 'pomme-pin': 1 }, known: false, from: 'Hugo' },
  { id: 'jus-coco', needs: { 'noix-coco': 1, fraise: 1 }, known: false, from: 'Paco' },
  { id: 'brochette', needs: { poisson: 2, tomate: 1 }, known: false, from: 'Nérée' },
  { id: 'salade-tropicale', needs: { 'noix-coco': 1, pomme: 1, fraise: 1 }, known: false, from: 'Coralie' },
  { id: 'tarte-citrouille', needs: { citrouille: 1, pomme: 1, baie: 2 }, known: false, from: 'Mimi', how: 'concours de cuisine' },
  { id: 'jus-pasteque', needs: { pasteque: 1, fraise: 1 }, known: true },
  { id: 'sorbet-pasteque', needs: { pasteque: 1, baie: 2 }, known: false, from: 'Paco' },
];

export function itemLabel(id, n = 1) {
  const it = ITEMS[id];
  if (!it) return id;
  return `${it.emoji} ${n > 1 ? `${n} ` : ''}${it.label}`;
}

/** Quantité d'un objet ; « poisson » compte aussi tous les poissons pêchés. */
export function countItem(inv, id) {
  if (id !== 'poisson') return inv[id] || 0;
  let n = 0;
  for (const [k, it] of Object.entries(ITEMS)) if (it.tag === 'poisson' && k !== 'poisson') n += inv[k] || 0;
  return n + (inv.poisson || 0);
}

/** Retire n objets (pour « poisson », les moins précieux d'abord). Renvoie les ids retirés. */
export function takeItem(inv, id, n = 1) {
  const taken = [];
  if (id !== 'poisson') {
    inv[id] = Math.max(0, (inv[id] || 0) - n);
    for (let i = 0; i < n; i++) taken.push(id);
    return taken;
  }
  const fish = ['poisson', ...Object.keys(ITEMS).filter((k) => ITEMS[k].tag === 'poisson' && k !== 'poisson').sort((a, b) => ITEMS[a].price - ITEMS[b].price)];
  for (const k of fish) {
    while (n > 0 && inv[k] > 0) {
      inv[k]--;
      n--;
      taken.push(k);
    }
  }
  return taken;
}

export function createInventory() {
  const inv = {};
  for (const id of Object.keys(ITEMS)) inv[id] = 0;
  return inv;
}
