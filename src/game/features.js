import { STORY, CHAPTERS } from './quests.js';
import { escapeHtml } from '../ui/ui.js';

// Déblocages : au début, l'essentiel (se promener, parler, caresser, cueillir). Les autres
// activités s'ouvrent au fil de l'histoire, au moment où la quête qui les présente commence,
// et l'habitant qui s'en occupe les explique. Avant, on sait quand et grâce à qui elles
// arriveront ; le journal (onglet « Qui fait quoi ») récapitule tout.

export const FEATURES = [
  { id: 'potager', emoji: '🌱', name: 'Le potager', who: 'rose', at: 'potager', where: 'Derrière ta maison',
    how: 'Approche-toi d\'une parcelle : E pour planter, E pour arroser (la pluie aide), E pour récolter. Mamie Rose vend les semis.' },
  { id: 'cafe', emoji: '🐱', name: 'Le Café des Chats', who: 'mimi', at: 'cafe', where: 'Sur la place',
    how: 'Mimi vend pâtée, jouets et vêtements pour tes animaux : parle-lui, puis « Boutique ».' },
  { id: 'quetes', emoji: '❗', name: 'Les quêtes des habitants', who: null, at: 'cueillette',
    how: 'Un « ! » doré au-dessus d\'un habitant : il a une quête pour toi. Tu les retrouves dans le journal, onglet Quêtes.' },
  { id: 'defis', emoji: '🎯', name: 'Les défis du jour', who: null, at: 'cueillette',
    how: 'Chaque jour, trois petits défis rapportent des étoiles ⭐. Ils sont dans le journal, onglet Défis.' },
  { id: 'marche', emoji: '🧺', name: 'Acheter et vendre', who: 'pomme', at: 'marche', where: 'Le stand rayé de la place',
    how: 'Parle à un marchand puis « Boutique ». Pomme rachète tout ce que tu trouves ; Lila, la couturière, vend des vêtements.' },
  { id: 'insectes', emoji: '🦋', name: 'La chasse aux insectes', who: 'noe', at: 'filet',
    how: 'Avec le filet de Noé : approche-toi doucement d\'un insecte (sans courir) et appuie sur E.' },
  { id: 'peche', emoji: '🎣', name: 'La pêche', who: 'marin', at: 'peche', where: 'Le ponton de la plage, l\'étang',
    how: 'E au coin de pêche, attends que ça morde, ferre (E), puis maintiens E pour mouliner sans casser la ligne.' },
  { id: 'cuisine', emoji: '🍳', name: 'La cuisine', who: 'marin', at: 'cuisine', where: 'Le fourneau de ta maison',
    how: 'Au fourneau, choisis une recette dont tu as les ingrédients. Les plats font de beaux cadeaux !' },
  { id: 'deco', emoji: '🛋️', name: 'Décorer sa maison', who: 'bruno', at: 'chezsoi', where: 'La menuiserie de Bruno',
    how: 'Achète des meubles chez Bruno, puis chez toi : ☰ → Décorer (B) pour les placer.' },
  { id: 'vehicules', emoji: '🚲', name: 'Les véhicules', who: 'leo', at: 'garage', where: 'Le garage de Léo',
    how: 'Léo vend vélos, scooters et plus encore. ☰ → Véhicule pour monter dessus, E pour descendre.' },
  { id: 'boulots', emoji: '📋', name: 'Les petits boulots', who: 'leo', at: 'boulot', where: 'Le tableau en bois, à l\'ouest de la fontaine',
    how: 'Une mission payée à la fois (livraison, courrier, promenade…) : la flèche bleue te guide.' },
  { id: 'demandes', emoji: '🎁', name: 'Cadeaux et demandes du jour', who: null, at: 'voisins',
    how: 'Parle à un habitant pour lui offrir un cadeau (un par jour). Chaque jour, quelques habitants ont une demande : journal, onglet Demandes.' },
  { id: 'adoption', emoji: '💖', name: 'Adopter un animal', who: 'mimi', at: 'adoption',
    how: 'Caresse et nourris un animal : à 5 cœurs, appuie sur R pour l\'adopter. Jusqu\'à 6 compagnons te suivent ; Mimi confie aussi les chats du café.' },
  { id: 'voyages', emoji: '🧭', name: 'Voyager en bateau', who: null, at: 'pont-brumes', where: 'Les panneaux « Voyages »',
    how: 'Les panneaux relient les villages que tu as déjà découverts à pied : E pour choisir la destination.' },
];

const BY_ID = Object.fromEntries(FEATURES.map((f) => [f.id, f]));
const AT = Object.fromEntries(FEATURES.map((f) => [f.id, STORY.findIndex((q) => q.id === f.at)]));

// Boutiques ouvertes avec une activité (celles des autres îles : dès qu'on y arrive).
export const SHOP_FEATURE = { graines: 'potager', cafe: 'cafe', marche: 'marche', couture: 'marche', menuiserie: 'deco', garage: 'vehicules' };

export class Features {
  constructor(game) {
    this.game = game;
    this.known = new Set(); // déjà présentées (carte « Nouveau ! »)
    this.extra = new Set(); // ouvertes d'avance (anciennes parties qui s'en servaient déjà)
    this.all = false; // tests : tout ouvert
    this.primed = false;
    this.t = 0;
  }

  unlocked(id) {
    if (this.all || this.extra.has(id) || !BY_ID[id]) return true;
    const q = this.game.quests;
    return !q.current || q.index >= AT[id];
  }

  /** Chapitre où l'activité s'ouvre. */
  chapterOf(id) {
    const q = STORY[AT[id]];
    return q ? CHAPTERS.find((c) => c.id === q.chapter) : null;
  }

  /** « Marin t'apprendra à pêcher au chapitre 4 » : quand et grâce à qui. */
  lockedNote(id) {
    const f = BY_ID[id];
    const c = this.chapterOf(id);
    const v = f.who && this.game.villagers.get(f.who);
    const by = v ? `${v.def.name} t'en parlera` : 'Ça viendra avec l\'histoire';
    return `🔒 ${by}${c ? ` (chapitre ${c.n})` : ''}`;
  }

  /** Réplique d'un habitant à qui l'on demande une activité pas encore ouverte. */
  sayLocked(id, villagerId) {
    const f = BY_ID[id];
    const c = this.chapterOf(id);
    if (f.who === villagerId) return `Ma boutique ? Reviens me voir un peu plus tard${c ? ` (chapitre ${c.n})` : ''} : je te réserve une surprise !`;
    return `Pas encore ! ${this.lockedNote(id).replace('🔒 ', '')}.`;
  }

  /** Message quand on essaie une activité pas encore ouverte. */
  tellLocked(id) {
    const f = BY_ID[id];
    this.game.ui.toast(`${f.emoji} ${f.name} : ${this.lockedNote(id).replace('🔒 ', '')}. Suis l'histoire !`, 3800);
  }

  /** Activités tout juste ouvertes : une carte « Nouveau ! » chacune (quand l'écran est libre). */
  update(dt) {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 0.5;
    const g = this.game;
    if (!this.primed) {
      // Partie chargée : ce qui est déjà ouvert l'était avant, pas de cartes en rafale.
      for (const f of FEATURES) if (this.unlocked(f.id)) this.known.add(f.id);
      this.primed = true;
      return;
    }
    if (g.state !== 'play' || g.busy || g.panel || g.ui.chapterOpen || g.dialogue.open || g.tips.current) return;
    const f = FEATURES.find((x) => !this.known.has(x.id) && this.unlocked(x.id));
    if (!f) return;
    this.known.add(f.id);
    g.requestSave();
    const v = f.who && g.villagers.get(f.who);
    const who = [v ? `${v.def.emoji} ${v.def.name}` : '', f.where || ''].filter(Boolean).join(' · ');
    g.tips.announce({
      emoji: f.emoji,
      title: `Nouveau : ${f.name}`,
      html: `${escapeHtml(f.how)}${who ? `<br><small>${escapeHtml(who)}</small>` : ''}<br><small>Tout est résumé dans le journal → 🧭 Qui fait quoi.</small>`,
    });
    g.ui.refreshQuest?.();
    g.ui.refreshChallenges?.();
  }

  /** Anciennes parties : ce dont on se servait déjà reste ouvert. */
  grandfather() {
    const g = this.game;
    const used = {
      quetes: g.sideQuests.done.size > 0 || Object.keys(g.sideQuests.active).length > 0,
      peche: (g.quests.stats?.fish || 0) > 0,
      vehicules: Object.keys(g.vehicles.owned || {}).length > 0,
      boulots: (g.jobs.done || 0) > 0 || !!g.jobs.active,
      adoption: g.animals.companions().length > 0,
    };
    for (const [id, yes] of Object.entries(used)) if (yes) this.extra.add(id);
  }

  serialize() {
    return { k: [...this.known], x: [...this.extra] };
  }

  restore(d) {
    this.known = new Set(d?.k || []);
    this.extra = new Set(d?.x || []);
    this.primed = !!d;
    if (!d) this.grandfather();
  }
}
