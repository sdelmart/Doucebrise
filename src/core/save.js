// Sauvegarde locale (localStorage). Toutes les lectures/écritures sont protégées :
// en navigation privée ou si le stockage est bloqué, le jeu fonctionne sans sauvegarde.

const KEY = 'doucebrise-save-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && data.version === 1 ? data : null;
  } catch {
    return null;
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, version: 1, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* rien */
  }
}
