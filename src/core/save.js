// Sauvegarde locale (localStorage), en 3 profils. Toutes les lectures/écritures sont
// protégées : en navigation privée ou si le stockage est bloqué, le jeu fonctionne
// sans sauvegarde. Le profil 1 garde l'ancienne clé (compatibilité).

const SLOT_KEY = 'doucebrise-slot';
export const SLOTS = [1, 2, 3];
export const SAVE_VERSION = 2;

const saveKey = (slot) => (slot === 1 ? 'doucebrise-save-v1' : `doucebrise-save-${slot}`);
const photosKey = (slot) => (slot === 1 ? 'doucebrise-photos' : `doucebrise-photos-${slot}`);

export function getSlot() {
  try {
    const n = parseInt(localStorage.getItem(SLOT_KEY) || '1', 10);
    return SLOTS.includes(n) ? n : 1;
  } catch {
    return 1;
  }
}

export function setSlot(slot) {
  try {
    localStorage.setItem(SLOT_KEY, String(slot));
  } catch {
    /* rien */
  }
}

function read(slot) {
  try {
    const raw = localStorage.getItem(saveKey(slot));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !(data.version >= 1 && data.version <= SAVE_VERSION)) return null;
    return data;
  } catch {
    return null;
  }
}

export function loadSave(slot = getSlot()) {
  return read(slot);
}

export function writeSave(data, slot = getSlot()) {
  try {
    localStorage.setItem(saveKey(slot), JSON.stringify({ ...data, version: SAVE_VERSION, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(slot = getSlot()) {
  try {
    localStorage.removeItem(saveKey(slot));
    localStorage.removeItem(photosKey(slot));
  } catch {
    /* rien */
  }
}

/** Résumé de chaque profil pour l'écran titre. */
export function slotSummaries() {
  return SLOTS.map((slot) => {
    const d = read(slot);
    if (!d) return { slot, empty: true };
    const day = d.time?.day || 1;
    return {
      slot,
      empty: false,
      name: d.appearance?.name || 'Sans nom',
      day,
      season: Math.floor((day - 1) / 3) % 4,
      coins: d.coins || 0,
      chapter: d.quests?.c?.length || 0,
      playtime: d.stats?.playtime || 0,
      savedAt: d.savedAt || 0,
      title: d.progress?.title || '',
    };
  });
}

/** Sauvegarde exportée en texte (fichier .json). */
export function exportSave(slot = getSlot()) {
  const d = read(slot);
  if (!d) return null;
  let photos = [];
  try {
    photos = JSON.parse(localStorage.getItem(photosKey(slot)) || '[]');
  } catch {
    photos = [];
  }
  return JSON.stringify({ doucebrise: 1, save: d, photos });
}

export function importSave(text, slot = getSlot()) {
  const data = JSON.parse(text);
  const save = data?.doucebrise ? data.save : data;
  if (!save || !(save.version >= 1 && save.version <= SAVE_VERSION)) throw new Error('Fichier de sauvegarde invalide');
  localStorage.setItem(saveKey(slot), JSON.stringify(save));
  if (Array.isArray(data?.photos)) localStorage.setItem(photosKey(slot), JSON.stringify(data.photos));
  return save;
}

export function loadPhotos() {
  try {
    return JSON.parse(localStorage.getItem(photosKey(getSlot())) || '[]');
  } catch {
    return [];
  }
}

export function savePhotos(list) {
  try {
    localStorage.setItem(photosKey(getSlot()), JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}
