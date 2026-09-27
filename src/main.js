import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import '@fontsource/nunito/latin-ext-600.css';
import '@fontsource/nunito/latin-ext-800.css';
import '@fontsource/nunito/latin-ext-900.css';
import { Game } from './game.js';
import { loadModels } from './core/models.js';
import { NATURE_MODEL_IDS } from './world/natureModels.js';
import { CHARACTER_MODEL_IDS } from './player/avatar.js';
import { loadGroundTextures } from './world/terrainTextures.js';
import { loadTreeTextures } from './world/trees.js';
import { loadSettings } from './core/settings.js';
import { loadSave } from './core/save.js';

// Point d'entrée : on attend la police (utilisée aussi pour dessiner les enseignes),
// on laisse le navigateur afficher l'écran de chargement, puis on construit le monde.
const canvas = document.querySelector('#game');

async function fontsReady() {
  if (!document.fonts?.load) return;
  const wait = Promise.all(['600 16px Nunito', '800 16px Nunito', '900 16px Nunito'].map((f) => document.fonts.load(f, 'Cœur é')));
  await Promise.race([wait, new Promise((r) => setTimeout(r, 2500))]);
}

// Modèles 3D importés (assets/models/) : chargés avant de construire le monde.
async function modelsReady() {
  const ids = [...NATURE_MODEL_IDS, ...CHARACTER_MODEL_IDS];
  if (!ids.length) return;
  const p = document.querySelector('#loading p');
  const label = p?.textContent;
  await loadModels(ids, (k) => {
    if (p) p.textContent = `Chargement des modèles… ${Math.round(k * 100)} %`;
  });
  if (p) p.textContent = label;
}

// Sol détaillé (textures du terrain) et arbres réalistes, selon les réglages.
async function texturesReady() {
  let g = {};
  try {
    g = loadSettings(loadSave()?.settings).graphics;
  } catch {
    /* réglages illisibles : valeurs par défaut */
  }
  await Promise.all([g.ground !== false && loadGroundTextures(), g.style !== 'cartoon' && loadTreeTextures()]);
}

Promise.all([fontsReady(), modelsReady(), texturesReady()]).then(() =>
  requestAnimationFrame(() =>
    setTimeout(() => {
      try {
        window.game = new Game(canvas);
      } catch (err) {
        console.error(err);
        const p = document.querySelector('#loading p');
        if (p) p.textContent = `Oups, le jeu n'a pas pu démarrer : ${err.message}`;
      }
    }, 30),
  ),
);
