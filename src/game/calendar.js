import * as THREE from 'three';
import { ITEMS } from './items.js';
import { SEASONS, DAYS_PER_SEASON } from '../world/weather.js';
import { BIRTHDAYS } from '../npc/villagers.js';
import { createRng } from '../core/math.js';
import { escapeHtml } from '../ui/ui.js';

// Calendrier : une fête par saison, les anniversaires des habitants, le courrier
// qui arrive chaque matin dans la boîte aux lettres, et le concours de pêche.

export const FESTIVALS = [
  { id: 'fleurs', season: 0, day: 2, label: 'Fête des Fleurs', emoji: '🌸', desc: 'Les fleurs se vendent le double et les habitants sont ravis d\'en recevoir.' },
  { id: 'peche', season: 1, day: 2, label: 'Concours de pêche', emoji: '🎣', desc: 'De 6 h à 18 h : pêche le plus gros poisson possible et présente-le à Marin !' },
  { id: 'recolte', season: 2, day: 2, label: 'Fête des Récoltes', emoji: '🎃', desc: 'Pomme rachète récoltes et plats 50 % plus cher.' },
  { id: 'etoiles', season: 3, day: 2, label: 'Nuit des Étoiles', emoji: '🌟', desc: 'Lanternes sur la place, cadeaux au courrier et étoiles filantes la nuit.' },
];

const LETTER_LINES = [
  'Je pensais à toi en préparant ceci. J\'espère que ça te plaira !',
  'Merci d\'être un·e si bon·ne ami·e. Passe me voir bientôt !',
  'J\'en avais trop, alors je partage avec toi !',
  'Petit cadeau, grand merci. Tu rends l\'île plus douce.',
  'Tu as l\'air si occupé·e ces temps-ci ! Voilà de quoi te donner des forces.',
];

export class Calendar {
  constructor(game) {
    this.game = game;
    this.letters = [];
    this.mailDay = 0;
    this.contest = null;
    this.el = document.createElement('div');
    this.el.id = 'letters';
    this.el.className = 'modal hidden';
    document.body.appendChild(this.el);
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.closeMail();
    });
    window.addEventListener('keydown', (e) => {
      if (this.mailOpen && e.code === 'Escape') this.closeMail();
    });
    this.starT = 0;
  }

  // --- Dates ---------------------------------------------------------------------

  get season() {
    return this.game.world.weather.seasonIndex;
  }

  get dayInSeason() {
    return this.game.world.weather.dayInSeason;
  }

  festivalOn(season = this.season, day = this.dayInSeason) {
    return FESTIVALS.find((f) => f.season === season && f.day === day) || null;
  }

  get festival() {
    return this.festivalOn();
  }

  birthdayOf(season = this.season, day = this.dayInSeason) {
    return Object.entries(BIRTHDAYS).find(([, [s, d]]) => s === season && d === day)?.[0] || null;
  }

  isBirthday(villagerId) {
    return this.birthdayOf() === villagerId;
  }

  /** Prix de vente, avec les bonus de fête. */
  sellPrice(id) {
    const it = ITEMS[id];
    const f = this.festival?.id;
    if (f === 'fleurs' && id === 'fleur') return it.price * 2;
    if (f === 'recolte' && (it.cat === 'crop' || it.cat === 'dish')) return Math.round(it.price * 1.5);
    return it.price;
  }

  // --- Nouveau jour ------------------------------------------------------------------

  onNewDay(announce = true) {
    const g = this.game;
    const day = g.world.sky.day;
    const f = this.festival;
    g.world.village.setFestival(f?.id || null);
    if (this.mailDay !== day) {
      this.mailDay = day;
      this.deliverMail(day);
    }
    if (f?.id === 'peche' && this.contest?.day !== day) this.contest = { day, best: 0, fish: null, done: false };
    if (!announce) return;
    if (f) setTimeout(() => g.ui.toast(`${f.emoji} Aujourd'hui : ${f.label} ! ${f.desc}`, 6000), 1800);
    const b = this.birthdayOf();
    if (b) {
      const v = g.villagers.get(b);
      setTimeout(() => g.ui.toast(`🎂 C'est l'anniversaire de ${v.def.name} aujourd'hui ! Un cadeau lui ferait très plaisir.`, 5000), f ? 7000 : 1800);
    }
  }

  // --- Courrier --------------------------------------------------------------------

  addLetter(letter) {
    this.letters.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...letter });
    this.game.world.village.hasMail = true;
    this.game.requestSave();
  }

  deliverMail(day) {
    const g = this.game;
    const rng = createRng(day * 313 + 11);
    // Lettres d'amitié.
    const friends = g.villagers.list.filter((v) => v.met && v.friendship >= 40);
    let sent = 0;
    for (const v of friends.sort(() => rng() - 0.5)) {
      if (sent >= 2 || rng() > 0.35) continue;
      const liked = v.def.likes.filter((id) => ITEMS[id] && id !== 'poisson');
      const gift = rng() < 0.6 && liked.length ? { items: { [liked[Math.floor(rng() * liked.length)]]: 1 + Math.floor(rng() * 2) } } : { coins: 50 + Math.floor(rng() * 4) * 25 };
      this.addLetter({ from: v.def.id, text: LETTER_LINES[Math.floor(rng() * LETTER_LINES.length)], gift });
      sent++;
    }
    // Veille d'anniversaire.
    const tomorrowSeason = Math.floor(day / DAYS_PER_SEASON) % 4;
    const tomorrowDay = (day % DAYS_PER_SEASON) + 1;
    const b = this.birthdayOf(tomorrowSeason, tomorrowDay);
    if (b) {
      const v = g.villagers.get(b);
      this.addLetter({ from: 'rose', text: `Psst ! Demain, c'est l'anniversaire de ${v.def.name}. Ne l'oublie pas, un petit cadeau lui ferait tant plaisir ! 🎂` });
    }
    // Nuit des étoiles : tout le monde envoie un petit mot.
    if (this.festival?.id === 'etoiles') {
      this.addLetter({ from: 'lila', text: 'Joyeuse Nuit des Étoiles ! Ce soir, regarde le ciel au-dessus de la place… ✨', gift: { items: { friandise: 2 }, coins: 100 } });
    }
  }

  openMail() {
    const g = this.game;
    if (!this.letters.length) {
      g.ui.toast('📭 La boîte aux lettres est vide. Le facteur passe chaque matin !');
      return;
    }
    this.mailOpen = true;
    g.input.enabled = false;
    g.audio.play('mail');
    this.el.classList.remove('hidden');
    this.renderMail();
  }

  closeMail() {
    if (!this.mailOpen) return;
    this.mailOpen = false;
    this.game.input.enabled = true;
    this.el.classList.add('hidden');
  }

  renderMail() {
    const g = this.game;
    const L = this.letters[0];
    if (!L) {
      this.closeMail();
      return;
    }
    const v = L.from ? g.villagers.get(L.from) : null;
    const who = v ? `${v.def.emoji} ${v.def.name}` : L.signature || '💌 Doucebrise';
    const gift = L.gift ? `<div class="letter-gift">🎁 ${this.rewardText(L.gift)}</div>` : '';
    this.el.innerHTML = `<div class="modal-card letter-card"><button class="close" data-lclose>✕</button>
      <div class="letter-paper"><div class="letter-head">${L.title ? escapeHtml(L.title) : `Chère ${escapeHtml(g.character.appearance.name)},`}</div>
      <p>${escapeHtml(L.text)}</p><div class="letter-sign">— ${escapeHtml(who)}</div>${gift}</div>
      <div class="dialog-buttons"><span class="note">${this.letters.length > 1 ? `${this.letters.length - 1} autre(s) lettre(s)` : ''}</span>
      <button class="btn primary" data-ltake>${L.gift ? 'Prendre le cadeau' : 'Ranger la lettre'}</button></div></div>`;
    this.el.querySelector('[data-lclose]').onclick = () => this.closeMail();
    this.el.querySelector('[data-ltake]').onclick = () => {
      this.letters.shift();
      if (L.gift) g.grantReward(L.gift, null, `💌 Cadeau de ${who} :`);
      g.world.village.hasMail = this.letters.length > 0;
      g.audio.play('pick');
      g.emit('mail', { letter: L });
      g.requestSave();
      if (this.letters.length) this.renderMail();
      else this.closeMail();
    };
  }

  rewardText(r) {
    const parts = [];
    if (r.coins) parts.push(`🪙 ${r.coins}`);
    for (const [id, n] of Object.entries(r.items || {})) if (ITEMS[id]) parts.push(`${ITEMS[id].emoji} ${ITEMS[id].label} ×${n}`);
    return parts.join(' · ');
  }

  // --- Concours de pêche ---------------------------------------------------------------

  get contestActive() {
    const h = this.game.world.sky.hour;
    return this.festival?.id === 'peche' && h >= 6 && h < 18;
  }

  onCatch(d) {
    if (!this.contestActive || !this.contest || this.contest.done) return;
    if (d.size > this.contest.best) {
      this.contest.best = d.size;
      this.contest.fish = d.fish;
      this.game.ui.toast(`🏆 Nouvelle meilleure prise pour le concours : ${d.size} cm !`, 2500);
    }
  }

  /** Résultats, annoncés par Marin. */
  contestResults() {
    const g = this.game;
    const c = this.contest;
    const rng = createRng(c.day * 71 + 3);
    const rivals = [
      { name: 'Noé', size: Math.round(20 + rng() * 40) },
      { name: 'Pomme', size: Math.round(30 + rng() * 45) },
      { name: 'Bruno', size: Math.round(45 + rng() * 60) },
      { name: 'Léo', size: Math.round(35 + rng() * 55) },
    ];
    const all = [...rivals, { name: g.character.appearance.name, size: c.best, me: true }].sort((a, b) => b.size - a.size);
    const rank = all.findIndex((x) => x.me) + 1;
    c.done = true;
    const prizes = { 1: { coins: 800, furniture: { 'trophee-peche': 1 }, stars: 10 }, 2: { coins: 350, items: { appat: 10 } }, 3: { coins: 150, items: { appat: 5 } } };
    const prize = prizes[rank] || { coins: 50 };
    if (rank === 1) g.emit('contest', { rank });
    setTimeout(() => g.grantReward(prize, null, `🏆 Concours de pêche — ${rank === 1 ? '1re' : `${rank}e`} place :`), 400);
    return { rank, all };
  }

  // --- Étoiles filantes -----------------------------------------------------------------

  update(dt) {
    const g = this.game;
    if (this.festival?.id !== 'etoiles' || !g.world.sky.isNight || g.house.inside) return;
    this.starT -= dt;
    if (this.starT > 0) return;
    this.starT = 0.6 + Math.random() * 1.2;
    const p = g.player.pos;
    const pos = new THREE.Vector3(p.x + (Math.random() - 0.5) * 50, 28 + Math.random() * 10, p.z + (Math.random() - 0.5) * 50);
    g.particles.emit('sparkle', pos, { count: 3, spread: 2.5, size: 0.8, life: 1.6 });
  }

  // --- Sauvegarde ----------------------------------------------------------------------

  serialize() {
    return { letters: this.letters, mailDay: this.mailDay, contest: this.contest };
  }

  restore(d) {
    if (!d) return;
    this.letters = d.letters || [];
    this.mailDay = d.mailDay || 0;
    this.contest = d.contest || null;
    this.game.world.village.hasMail = this.letters.length > 0;
  }
}

export function seasonLabel(i) {
  return SEASONS[i];
}
