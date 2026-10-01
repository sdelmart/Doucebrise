import { actionKey } from '../core/input.js';
import { escapeHtml } from './ui.js';

// Astuces de première fois : une petite carte explique une nouveauté la première
// fois qu'on la croise (voyages, vœux, quêtes des habitants, source chaude…).

const TIPS = {
  guide: { emoji: '🧭', title: 'Où aller ?', text: () => `Suis la flèche dorée, ou l'étoile sur la mini-carte. Un doute ? L'ampoule 💡 à côté de ta quête (ou ${actionKey('hint')}) donne un indice.` },
  menus: { emoji: '☰', title: 'Les menus rapides', text: () => `Sac, journal, tenue, carte, photo… tout est rangé derrière le bouton ☰ sous la mini-carte (${actionKey('menu')}). Quand tu te promènes, l'interface se fait discrète. Un clic sur l'horloge montre le programme du jour.` },
  quete: { emoji: '❗', title: 'Quêtes des habitants', text: () => 'Un « ! » doré au-dessus d\'un habitant : il a une quête pour toi. Un « ? » vert : tu peux la lui rendre. Tes quêtes sont dans le journal (J), onglet Quêtes.' },
  voyage: { emoji: '🧭', title: 'Voyager', text: () => `Les panneaux « Voyages » relient les villages que tu as déjà découverts à pied. Appuie sur ${actionKey('interact')} pour choisir ta destination.` },
  etoile: { emoji: '🌠', title: 'Une étoile filante est passée', text: () => `Les nuits claires, tourne la caméra vers le ciel (clic maintenu en glissant vers le haut) : quand une étoile filante passe devant toi, appuie vite sur ${actionKey('feed')} pour faire un vœu.` },
  voeu: { emoji: '🌠', title: 'Une étoile filante !', text: () => `Quand une étoile filante traverse le ciel, appuie vite sur ${actionKey('feed')} pour faire un vœu. Parfois, un cadeau arrive au courrier le lendemain…` },
  source: { emoji: '♨️', title: 'La source chaude', text: () => 'Un bain par jour donne le bonus « Bien-être » : +20 % d\'expérience pendant 4 heures.' },
  kiosque: { emoji: '🎼', title: 'Le kiosque à musique', text: () => 'Joue un air sur le kiosque : les habitants autour viendront t\'applaudir !' },
  bourg: { emoji: '🏔️', title: 'Bienvenue à Bourg-Sapin', text: () => 'Pâtisserie d\'Élise, atelier de Hugo, source chaude, Lac Miroir et, tout en haut, le Pic des Neiges. Les pommes de pin, myrtilles et cristaux ne poussent qu\'ici.' },
  port: { emoji: '⚓', title: 'Bienvenue à Port-Corail', text: () => 'Capitainerie, galerie, club de plongée et la paillote du lagon. Secoue les cocotiers, et cherche des perles dans le corail !' },
  nuit: { emoji: '🌙', title: 'La nuit tombe', text: () => 'Lève les yeux : étoiles, lune et parfois des étoiles filantes. Les lucioles sortent près de l\'étang. Dors dans ton lit pour passer au matin.' },
  pause: { emoji: '⏸️', title: 'Le menu', text: () => `${escapeHtml('Échap')} ouvre le menu : paramètres (graphismes, touches, son), sauvegarde et profils. ${escapeHtml(actionKey('fps'))} affiche le compteur d'images par seconde.` },
  neige: { emoji: '☃️', title: 'La Fête des neiges', text: () => `Parle à Hugo pour construire ton bonhomme de neige (il juge la forme et le style), et à Noé, Léo ou Sacha pour la bataille de boules de neige : ${actionKey('interact')} pour lancer, bouge pour esquiver !` },
  luge: { emoji: '🛷', title: 'La course de luge', text: () => 'Au sommet du Pic, prends la luge de Hugo et dévale la pente jusqu\'au bourg. Chaque porte manquée coûte une seconde, et les étoiles rapportent des pièces !' },
  visite: { emoji: '🚪', title: 'Rendre visite', text: () => `Frappe à la porte d'un habitant (${actionKey('interact')}) quand il est chez lui, le soir ou tôt le matin. Chacun a décoré sa maison à sa façon !` },
};

export class Tips {
  constructor(game) {
    this.game = game;
    this.seen = new Set();
    this.queue = [];
    this.el = document.createElement('div');
    this.el.id = 'tip';
    this.el.className = 'tip hidden';
    document.body.appendChild(this.el);
    this.el.addEventListener('click', () => this.hide());
  }

  /** Affiche l'astuce une seule fois par profil. */
  show(id) {
    if (this.seen.has(id) || !TIPS[id] || this.game.state !== 'play') return;
    this.seen.add(id);
    this.queue.push(id);
    this.game.requestSave();
    if (!this.current) this.next();
  }

  next() {
    const id = this.queue.shift();
    this.current = id || null;
    if (!id) {
      this.el.classList.add('hidden');
      return;
    }
    const t = TIPS[id];
    this.el.innerHTML = `<div class="tip-emoji">${t.emoji}</div><div class="tip-body"><b>${escapeHtml(t.title)}</b><p>${t.text()}</p></div><button class="tip-close" aria-label="Fermer">✕</button>`;
    this.el.classList.remove('hidden');
    this.game.audio.play('mail');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.hide(), 11000);
  }

  hide() {
    clearTimeout(this.timer);
    this.el.classList.add('hidden');
    setTimeout(() => this.next(), 400);
  }

  serialize() {
    return [...this.seen];
  }

  restore(list) {
    this.seen = new Set(list || []);
  }
}
