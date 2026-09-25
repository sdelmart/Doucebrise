import { Game } from './game.js';

// Point d'entrée : on laisse le navigateur afficher l'écran de chargement,
// puis on construit le monde.
const canvas = document.querySelector('#game');
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
);
