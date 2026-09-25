// Sauvegarde locale (localStorage). Toutes les lectures/écritures sont protégées :
// en navigation privée ou si le stockage est bloqué, le jeu fonctionne sans sauvegarde.

const KEY = 'doucebrise-save-v1';
const PHOTOS = 'doucebrise-photos';
export const SAVE_VERSION = 2;

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !(data.version >= 1 && data.version <= SAVE_VERSION)) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, version: SAVE_VERSION, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(PHOTOS);
  } catch {
    /* rien */
  }
}

export function loadPhotos() {
  try {
    return JSON.parse(localStorage.getItem(PHOTOS) || '[]');
  } catch {
    return [];
  }
}

export function savePhotos(list) {
  try {
    localStorage.setItem(PHOTOS, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}
