// Paramètres du jeu, communs à tous les profils : graphismes (préréglages ou
// personnalisés), affichage, contrôles (touches réassignables), audio, jeu.

const KEY = 'doucebrise-settings';

export const PRESETS = {
  basse: { label: 'Basse', desc: 'Pour les petits ordinateurs', style: 'cartoon', renderScale: 0.75, maxRatio: 1, auto: true, shadows: 'off', ao: false, ground: false, renderDistance: 160, grass: 0, aa: 'off', bloom: false, grading: false, water: 'simple', clouds: 'low' },
  moyenne: { label: 'Moyenne', desc: 'Équilibrée', style: 'realiste', renderScale: 1, maxRatio: 1.25, auto: true, shadows: 'low', ao: false, ground: true, renderDistance: 220, grass: 45, aa: 'fxaa', bloom: true, grading: true, water: 'simple', clouds: 'medium' },
  haute: { label: 'Haute', desc: 'Recommandée', style: 'realiste', renderScale: 1, maxRatio: 2, auto: true, shadows: 'high', ao: true, ground: true, renderDistance: 300, grass: 80, aa: 'smaa', bloom: true, grading: true, water: 'reflets', clouds: 'high' },
  ultra: { label: 'Ultra', desc: 'Pour les cartes graphiques puissantes', style: 'realiste', renderScale: 1, maxRatio: 2, auto: true, shadows: 'ultra', ao: true, ground: true, renderDistance: 420, grass: 110, aa: 'msaa', bloom: true, grading: true, water: 'reflets', clouds: 'high' },
};

export const SHADOW_SIZES = { off: 0, low: 1024, high: 2048, ultra: 4096 };

export const GRAPHICS_OPTIONS = {
  style: { label: 'Style de rendu', type: 'choice', choices: [['realiste', 'Réaliste'], ['cartoon', 'Cartoon']], restart: true, note: 'Réaliste : lumière douce du ciel, reflets, ombres de contact. Cartoon : aplats et contours.' },
  renderScale: { label: 'Résolution de rendu', type: 'range', min: 0.5, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)} %` },
  maxRatio: { label: 'Netteté (écrans Retina / 4K)', type: 'choice', choices: [[1, '×1'], [1.25, '×1,25'], [1.5, '×1,5'], [2, '×2']] },
  auto: { label: 'Qualité automatique', type: 'toggle', note: 'Si le jeu rame, les réglages les plus coûteux baissent d\'eux-mêmes (ombres de contact, netteté Retina, herbe, ombres, résolution…), puis remontent quand il y a de la marge. Jamais au-delà de tes réglages.' },
  shadows: { label: 'Ombres', type: 'choice', choices: [['off', 'Aucune'], ['low', 'Basses'], ['high', 'Hautes'], ['ultra', 'Ultra']] },
  ao: { label: 'Ombres de contact (occlusion ambiante)', type: 'toggle' },
  ground: { label: 'Sol détaillé (textures)', type: 'toggle', restart: true },
  renderDistance: { label: 'Distance d\'affichage', type: 'range', min: 120, max: 480, step: 20, fmt: (v) => `${v} m` },
  grass: { label: 'Herbe (rayon)', type: 'range', min: 0, max: 140, step: 5, fmt: (v) => (v ? `${v} m` : 'Aucune') },
  aa: { label: 'Anticrénelage', type: 'choice', choices: [['off', 'Aucun'], ['fxaa', 'FXAA'], ['smaa', 'SMAA'], ['msaa', 'MSAA ×4']] },
  bloom: { label: 'Halo lumineux (bloom)', type: 'toggle' },
  grading: { label: 'Étalonnage des couleurs et vignette', type: 'toggle' },
  water: { label: 'Eau', type: 'choice', choices: [['simple', 'Simple'], ['reflets', 'Reflets du ciel']] },
  clouds: { label: 'Nuages', type: 'choice', choices: [['low', 'Peu'], ['medium', 'Moyens'], ['high', 'Beaucoup']] },
};

// Actions réassignables. `logical` = code interne utilisé par le jeu (clavier QWERTY),
// `letter` = lettre mnémonique (sa position change selon la disposition du clavier).
export const ACTIONS = [
  { id: 'forward', label: 'Avancer', logical: 'KeyW', group: 'Déplacements' },
  { id: 'back', label: 'Reculer', logical: 'KeyS', group: 'Déplacements' },
  { id: 'left', label: 'Aller à gauche', logical: 'KeyA', group: 'Déplacements' },
  { id: 'right', label: 'Aller à droite', logical: 'KeyD', group: 'Déplacements' },
  { id: 'run', label: 'Courir', logical: 'ShiftLeft', group: 'Déplacements' },
  { id: 'jump', label: 'Sauter', logical: 'Space', group: 'Déplacements' },
  { id: 'interact', label: 'Interagir / parler', logical: 'KeyE', letter: 'e', group: 'Actions' },
  { id: 'feed', label: 'Nourrir · faire un vœu', logical: 'KeyF', letter: 'f', group: 'Actions' },
  { id: 'play', label: 'Jouer avec un animal', logical: 'KeyG', letter: 'g', group: 'Actions' },
  { id: 'adopt', label: 'Adopter / suivre', logical: 'KeyR', letter: 'r', group: 'Actions' },
  { id: 'vehicle', label: 'Véhicule', logical: 'KeyV', letter: 'v', group: 'Actions' },
  { id: 'hint', label: 'Indice', logical: 'KeyT', letter: 't', group: 'Actions' },
  { id: 'map', label: 'Carte', logical: 'KeyM', letter: 'm', group: 'Menus' },
  { id: 'journal', label: 'Journal', logical: 'KeyJ', letter: 'j', group: 'Menus' },
  { id: 'bag', label: 'Sac', logical: 'KeyI', letter: 'i', group: 'Menus' },
  { id: 'pets', label: 'Compagnons', logical: 'KeyP', letter: 'p', group: 'Menus' },
  { id: 'creator', label: 'Personnalisation', logical: 'KeyC', letter: 'c', group: 'Menus' },
  { id: 'decor', label: 'Décorer', logical: 'KeyB', letter: 'b', group: 'Menus' },
  { id: 'photo', label: 'Mode photo', logical: 'KeyO', letter: 'o', group: 'Menus' },
  { id: 'help', label: 'Aide', logical: 'KeyH', letter: 'h', group: 'Menus' },
  { id: 'menu', label: 'Menus rapides', logical: 'Tab', group: 'Menus' },
  { id: 'fps', label: 'Compteur FPS', logical: 'F3', group: 'Menus' },
];

export const FPS_LIMITS = [[0, 'Illimité'], [30, '30'], [60, '60'], [120, '120'], [144, '144']];
export const DAY_SPEEDS = {
  lente: { label: 'Lente (~24 min)', k: 0.6 },
  normale: { label: 'Normale (~14 min)', k: 1 },
  rapide: { label: 'Rapide (~7 min)', k: 2 },
};

export function defaultSettings() {
  const mobile = typeof window !== 'undefined' && (window.innerWidth < 720 || /Mobi|Android/i.test(navigator.userAgent));
  const preset = mobile ? 'basse' : 'haute';
  return {
    v: 1,
    preset,
    graphics: { ...PRESETS[preset] },
    fpsLimit: 0,
    showFps: 'off', // off | fps | detail
    fov: 50,
    uiScale: 1,
    hud: 'epure', // complet | epure | minimal
    hudFade: true, // l'interface s'efface pendant qu'on se promène
    keyHints: 'auto', // auto (les premières minutes et au besoin) | always | never
    minimap: true,
    guideArrow: true,
    zoneBanner: true,
    camSensitivity: 1,
    invertY: false,
    camAuto: true,
    audio: { master: 0.8, music: 0.6, sfx: 0.9, ambience: 0.7 },
    musicOn: true,
    musicHidden: [], // chansons intégrées masquées (Ma musique)
    musicTitles: true, // afficher le titre de la chanson qui commence
    footsteps: true, // bruits de pas
    keys: {}, // action → code physique (absent = défaut)
    daySpeed: 'normale',
    fullscreen: false,
    checkUpdates: true,
  };
}

/** Charge les paramètres (et reprend l'ancien format rangé dans la sauvegarde). */
export function loadSettings(legacy = null) {
  const base = defaultSettings();
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    stored = null;
  }
  if (stored) {
    // Réglages ajoutés depuis : on les prend dans le préréglage choisi.
    const presetBase = PRESETS[stored.preset] || base.graphics;
    const graphics = { ...base.graphics, ...presetBase, ...(stored.graphics || {}) };
    // Ancienne « netteté adaptative » : remplacée par la qualité automatique (activée).
    if ('dynres' in graphics) {
      delete graphics.dynres;
      graphics.auto = true;
    }
    // Ancienne aide des touches (oui / non) : « auto » ou « jamais ».
    if (typeof stored.keyHints === 'boolean') stored.keyHints = stored.keyHints ? 'auto' : 'never';
    return {
      ...base,
      ...stored,
      graphics,
      audio: { ...base.audio, ...(stored.audio || {}) },
      keys: { ...(stored.keys || {}) },
    };
  }
  if (legacy) {
    const map = { basse: 'basse', moyenne: 'moyenne', haute: 'haute' };
    const p = map[legacy.quality] || base.preset;
    base.preset = p;
    base.graphics = { ...PRESETS[p] };
    if (legacy.daySpeed) base.daySpeed = legacy.daySpeed;
    if (typeof legacy.volume === 'number') base.audio.master = legacy.volume;
    if (legacy.music !== undefined) base.musicOn = !!legacy.music;
    if (legacy.sfx === false) base.audio.sfx = 0;
  }
  return base;
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* stockage plein ou indisponible */
  }
}

/** Le préréglage actuel correspond-il toujours aux options graphiques ? */
export function matchPreset(graphics) {
  for (const [id, p] of Object.entries(PRESETS)) {
    if (Object.keys(GRAPHICS_OPTIONS).every((k) => p[k] === graphics[k])) return id;
  }
  return 'perso';
}
