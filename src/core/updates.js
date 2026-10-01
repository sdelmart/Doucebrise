// Version du jeu et vérification des mises à jour (application de bureau) :
// on compare la version installée à la dernière version publiée sur GitHub.

/* global __APP_VERSION__ */
export const VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

const REPO = 'sdelmart/Doucebrise';
const CACHE_KEY = 'doucebrise-update';
const CACHE_MS = 6 * 3600 * 1000;

/** Compare deux versions « 1.2.3 » : > 0 si a est plus récente que b. */
export function compareVersions(a, b) {
  const pa = String(a).replace(/^v/i, '').split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/i, '').split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (c && Date.now() - c.at < CACHE_MS) return c;
  } catch {
    /* stockage indisponible */
  }
  return null;
}

function writeCache(latest) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), latest }));
  } catch {
    /* stockage indisponible */
  }
}

/**
 * Renvoie { version, url } si une version plus récente est publiée, sinon null.
 * Sans connexion (ou dépôt privé), la vérification échoue en silence.
 */
export async function checkForUpdate() {
  let latest = readCache()?.latest;
  if (latest === undefined) {
    latest = null;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { signal: ctrl.signal, headers: { Accept: 'application/vnd.github+json' } });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data.tag_name && !data.draft && !data.prerelease) latest = { version: data.tag_name.replace(/^v/i, ''), url: data.html_url };
      }
    } catch {
      return null;
    }
    writeCache(latest);
  }
  if (!latest || !/^https:\/\/github\.com\//.test(latest.url)) return null;
  return compareVersions(latest.version, VERSION) > 0 ? latest : null;
}
