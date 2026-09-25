import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import '@fontsource/nunito/latin-ext-600.css';
import '@fontsource/nunito/latin-ext-800.css';
import '@fontsource/nunito/latin-ext-900.css';
import { Game } from './game.js';

// Point d'entrée : on attend la police (utilisée aussi pour dessiner les enseignes),
// on laisse le navigateur afficher l'écran de chargement, puis on construit le monde.
const canvas = document.querySelector('#game');

async function fontsReady() {
  if (!document.fonts?.load) return;
  const wait = Promise.all(['600 16px Nunito', '800 16px Nunito', '900 16px Nunito'].map((f) => document.fonts.load(f, 'Cœur é')));
  await Promise.race([wait, new Promise((r) => setTimeout(r, 2500))]);
}

fontsReady().then(() =>
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
