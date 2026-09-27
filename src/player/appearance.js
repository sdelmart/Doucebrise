// Catalogue de personnalisation du personnage et valeurs par défaut.

export const SKIN_TONES = [
  '#ffe6d6', '#fbd5bd', '#f3c4a2', '#e6ae88', '#d39469', '#b87850',
  '#9a5f3e', '#7a4630', '#5e3423', '#d9ecff', '#e9dcff', '#d8f5df',
];

export const HAIR_COLORS = [
  '#2a1d17', '#4a2f22', '#6e4430', '#94603e', '#c58b52', '#e3b875',
  '#f4e1a8', '#c8553a', '#9aa0ab', '#f7f5f0', '#ff9ec7', '#c7a4ff',
  '#7fb8ff', '#7fdcbd', '#ffcf5c', '#ff7a6b',
];

export const EYE_COLORS = [
  '#3b2519', '#6b4226', '#9b6a2f', '#3f7cc0', '#3d9970', '#7a5cc2',
  '#d64f7a', '#2e2e3a', '#4fb6c9', '#c9483f',
];

export const CLOTH_COLORS = [
  '#ffffff', '#fff3d6', '#2e2e3a', '#7a7f8c', '#f7a8b8', '#ff6f91',
  '#e5484d', '#ffb27a', '#ffd84d', '#c5e38a', '#6fcf97', '#2f9e74',
  '#8fd6e8', '#6fa8dc', '#3d5a98', '#b69cf0', '#e9d5b7', '#a0785a',
];

const o = (id, label, icon = '') => ({ id, label, icon });
// Articles à acheter chez Lila (price) ou à recevoir en cadeau (reward : qui le donne).
const buy = (id, label, icon, price, shop) => ({ id, label, icon, price, shop });
const gift = (id, label, icon, from) => ({ id, label, icon, reward: from });

export const OPTIONS = {
  eyes: [o('rond', 'Ronds', '👀'), o('petillants', 'Pétillants', '✨'), o('doux', 'Doux', '😌'), o('points', 'Points', '•'), o('chat', 'Félins', '🐱'), o('rieurs', 'Rieurs', '😊'), o('endormis', 'Endormis', '😪')],
  brows: [o('doux', 'Doux'), o('fins', 'Fins'), o('epais', 'Épais'), o('froncés', 'Déterminés'), o('aucun', 'Aucun')],
  mouth: [o('sourire', 'Sourire'), o('rire', 'Rire'), o('chat', 'Chaton'), o('o', 'Surpris'), o('langue', 'Espiègle'), o('neutre', 'Calme')],
  hair: [o('court', 'Court'), o('carre', 'Carré'), o('long', 'Long'), o('queue', 'Queue'), o('couettes', 'Couettes'), o('chignon', 'Chignon'), o('boucles', 'Bouclés'), o('herisse', 'Hérissé'), o('meche', 'Mèche'), o('rase', 'Ras')],
  top: [o('tshirt', 'T-shirt'), o('pull', 'Pull'), o('sweat', 'Sweat à capuche'), o('robe', 'Robe'), o('salopette', 'Salopette'), o('kimono', 'Kimono'), buy('veste', 'Veste', '🧥', 500)],
  pattern: [o('uni', 'Uni'), o('rayures', 'Rayures'), o('pois', 'Pois'), o('carreaux', 'Vichy'), o('coeurs', 'Cœurs'), o('etoiles', 'Étoiles'), o('fleurs', 'Fleurs')],
  bottom: [o('short', 'Short'), o('pantalon', 'Pantalon'), o('jupe', 'Jupe'), o('jupeLongue', 'Jupe longue')],
  shoes: [o('baskets', 'Baskets'), o('bottes', 'Bottes'), o('ballerines', 'Ballerines'), o('sabots', 'Sabots')],
  hat: [o('aucun', 'Aucun'), o('beret', 'Béret'), o('casquette', 'Casquette'), o('paille', 'Chapeau de paille'), o('bonnet', 'Bonnet'), o('chat', 'Oreilles de chat'), o('lapin', 'Oreilles de lapin'), o('fleurs', 'Couronne de fleurs'), o('noeud', 'Gros nœud'), o('grenouille', 'Chapeau grenouille'), o('sorciere', 'Chapeau de sorcière'),
    buy('ours', "Oreilles d'ours", '🐻', 300), buy('melon', 'Chapeau melon', '🎩', 350), buy('cowboy', 'Chapeau de cowboy', '🤠', 450),
    gift('fleur', 'Grande fleur', '🌺', 'Mamie Rose'), gift('couronne', 'Couronne', '👑', 'Lila'), gift('chef', 'Toque de chef', '👨‍🍳', 'Bruno'),
    gift('marin', 'Bob de marin', '⚓', 'Marin'), gift('etoile', 'Serre-tête étoile', '⭐', 'la quête « Grande famille »'),
    buy('casque', 'Casque de vélo', '⛑️', 250), buy('bandeau', 'Bandeau à nœud', '🎀', 180),
    gift('aureole', 'Auréole', '😇', 'le carnet d\'étoiles'), gift('chatBonnet', 'Bonnet chat', '🐱', 'le carnet d\'étoiles'),
    gift('capitaine', 'Casquette de capitaine', '🧑‍✈️', 'Léo'), gift('tasse', 'Chapeau tasse de thé', '☕', 'Mimi'),
    buy('pompon', 'Bonnet à pompon', '🧶', 380, 'atelier'), buy('capeline', 'Capeline de plage', '👒', 420, 'paillote'), buy('hibiscus', 'Couronne d\'hibiscus', '🌺', 360, 'plongee')],
  glasses: [o('aucune', 'Aucunes'), o('rondes', 'Rondes'), o('carrees', 'Carrées'), o('soleil', 'Soleil'), o('coeur', 'Cœur'), buy('etoiles', 'Étoiles', '🤩', 250), buy('monocle', 'Monocle', '🧐', 200),
    buy('aviateur', 'Aviateur', '🕶️', 300), gift('lune', 'Lunettes lune', '🌙', 'le carnet d\'étoiles'), gift('plongee', 'Masque de plongée', '🤿', 'Coralie')],
  back: [o('aucun', 'Rien'), o('sac', 'Sac à dos'), o('ailes', 'Ailes de fée'), o('cape', 'Cape'), o('echarpe', 'Écharpe'), o('queueRenard', 'Queue de renard'),
    buy('guitare', 'Guitare', '🎸', 600), buy('papillon', 'Ailes de papillon', '🦋', 800),
    gift('panier', 'Panier à dos', '🧺', 'Pomme'), gift('nounours', 'Sac nounours', '🧸', 'Noé'),
    buy('sacChat', 'Sac chat', '🐈', 450), gift('ailesAnge', "Ailes d'ange", '🪽', 'le carnet d\'étoiles'),
    gift('ailesArcEnCiel', 'Ailes arc-en-ciel', '🌈', 'le carnet d\'étoiles'), gift('filet', 'Filet en bandoulière', '🎒', 'Noé'),
    gift('sacRando', 'Sac de randonnée', '🎒', 'Sacha'), buy('surf', 'Planche de surf', '🏄', 650, 'paillote'), buy('luge', 'Petite luge', '🛷', 520, 'atelier')],
};

export const DEFAULT_APPEARANCE = {
  model: 'auto', // 'auto' : personnage importé s'il y en a, 'classique' : construit en code
  name: 'Lou',
  skin: '#fbd5bd',
  height: 1,
  build: 1,
  head: 1,
  eyes: 'rond',
  eyeColor: '#6b4226',
  lashes: true,
  brows: 'doux',
  mouth: 'sourire',
  blush: true,
  freckles: false,
  hair: 'carre',
  hairColor: '#6e4430',
  hairTip: '#6e4430',
  top: 'tshirt',
  topColor: '#f7a8b8',
  topColor2: '#ffffff',
  pattern: 'uni',
  bottom: 'short',
  bottomColor: '#6fa8dc',
  shoes: 'baskets',
  shoesColor: '#ffffff',
  hat: 'aucun',
  hatColor: '#ffd84d',
  glasses: 'aucune',
  glassesColor: '#4e4c62',
  back: 'aucun',
  backColor: '#ff8fa3',
};

const NAMES = ['Lou', 'Maé', 'Noa', 'Lilou', 'Sacha', 'Nina', 'Eliott', 'Jade', 'Timéo', 'Léna', 'Rose', 'Milo', 'Anaïs', 'Isaac', 'Zoé', 'Camille'];

export function randomAppearance(rand = Math.random) {
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const pickId = (key) => pick(OPTIONS[key].filter((x) => !x.price && !x.reward)).id;
  const hairColor = pick(HAIR_COLORS);
  return {
    ...DEFAULT_APPEARANCE,
    name: pick(NAMES),
    skin: pick(SKIN_TONES.slice(0, 9)),
    height: 0.92 + rand() * 0.16,
    build: 0.9 + rand() * 0.2,
    head: 0.95 + rand() * 0.1,
    eyes: pickId('eyes'),
    eyeColor: pick(EYE_COLORS),
    lashes: rand() < 0.5,
    brows: pick(OPTIONS.brows.slice(0, 4)).id,
    mouth: pickId('mouth'),
    blush: rand() < 0.7,
    freckles: rand() < 0.25,
    hair: pickId('hair'),
    hairColor,
    hairTip: rand() < 0.3 ? pick(HAIR_COLORS) : hairColor,
    top: pickId('top'),
    topColor: pick(CLOTH_COLORS),
    topColor2: pick(CLOTH_COLORS),
    pattern: rand() < 0.5 ? 'uni' : pickId('pattern'),
    bottom: pickId('bottom'),
    bottomColor: pick(CLOTH_COLORS),
    shoes: pickId('shoes'),
    shoesColor: pick(CLOTH_COLORS),
    hat: rand() < 0.4 ? 'aucun' : pickId('hat'),
    hatColor: pick(CLOTH_COLORS),
    glasses: rand() < 0.7 ? 'aucune' : pickId('glasses'),
    glassesColor: pick(['#4e4c62', '#c0584a', '#e3b875', '#6fa8dc', '#ff8fb1']),
    back: rand() < 0.5 ? 'aucun' : pickId('back'),
    backColor: pick(CLOTH_COLORS),
  };
}

/** L'option est-elle verrouillée (à acheter ou à recevoir) ? */
export function isLocked(key, id, unlocks) {
  const opt = OPTIONS[key]?.find((x) => x.id === id);
  if (!opt || (!opt.price && !opt.reward)) return false;
  return !unlocks.has(`${key}:${id}`);
}

/** Articles de la boutique de Lila. */
export function shopClothes(shop = 'couture') {
  const out = [];
  for (const [key, list] of Object.entries(OPTIONS)) for (const opt of list) if (opt.price && (opt.shop || 'couture') === shop) out.push({ key, ...opt });
  return out;
}

/** Complète une apparence sauvegardée avec les champs ajoutés depuis. */
export function normalizeAppearance(a) {
  const out = { ...DEFAULT_APPEARANCE, ...(a || {}) };
  for (const key of Object.keys(OPTIONS)) {
    if (!OPTIONS[key].some((opt) => opt.id === out[key])) out[key] = DEFAULT_APPEARANCE[key];
  }
  return out;
}
