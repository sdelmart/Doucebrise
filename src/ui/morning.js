import { ITEMS } from '../game/items.js';
import { DAYS_PER_SEASON } from '../world/weather.js';
import { escapeHtml, readTime } from './ui.js';

// Carnet du matin : au lever du jour, une petite carte donne l'essentiel (fête, anniversaire,
// potager, courrier : trois lignes au plus) au lieu d'une série de messages séparés. Un clic
// sur l'horloge montre le programme complet (demandes, défis, météo…).

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

export class Morning {
  constructor(game) {
    this.game = game;
    this.pendingDay = null;
    this.el = document.createElement('div');
    this.el.id = 'morning';
    this.el.className = 'morning hidden';
    this.el.setAttribute('role', 'status');
    document.body.appendChild(this.el);
    this.el.addEventListener('click', () => this.hide());
    this.el.addEventListener('mouseenter', () => clearTimeout(this.timer));
    this.el.addEventListener('mouseleave', () => {
      clearTimeout(this.timer);
      if (this.open) this.timer = setTimeout(() => this.hide(), 5000);
    });
  }

  /** Nouveau jour : la carte attendra le matin (et que la joueuse soit disponible). */
  schedule() {
    this.pendingDay = this.game.world.sky.day;
  }

  /** À chaque image : montre la carte du jour dès que c'est le matin et que rien n'occupe l'écran. */
  update() {
    const g = this.game;
    if (this.pendingDay === null || g.state !== 'play' || g.busy || g.panel || g.ui.chapterOpen) return;
    if (this.pendingDay !== g.world.sky.day) {
      this.pendingDay = g.world.sky.day;
      return;
    }
    if (g.world.sky.hour < 5.5 || document.querySelector('#fade')?.classList.contains('on')) return;
    this.pendingDay = null;
    this.show(true);
  }

  /** Lignes du jour : [emoji, texte, important]. Au réveil, seules les importantes (3 au plus). */
  lines() {
    const g = this.game;
    const out = [];
    const w = g.world.weather;
    const cal = g.calendar;
    const name = (id) => g.villagers.get(id)?.def.name || id;
    const f = cal.festival;
    if (f) out.push([f.emoji, `<b>${escapeHtml(f.label)}</b> aujourd'hui ! ${escapeHtml(f.desc)}`, true]);
    const bs = cal.birthdaysOf();
    if (bs.length) out.push(['🎂', `Anniversaire de <b>${escapeHtml(bs.map(name).join(' et de '))}</b> : un petit cadeau ferait très plaisir.`, true]);
    if (w.dayInSeason === 1 && g.world.sky.day > 1) out.push([w.season.emoji, `Nouvelle saison : ${w.season.label} !`, true]);
    // Demain : fête à venir.
    const day = g.world.sky.day;
    const next = cal.festivalOn(Math.floor(day / DAYS_PER_SEASON) % 4, (day % DAYS_PER_SEASON) + 1);
    if (next) out.push(['📅', `Demain : ${next.emoji} ${escapeHtml(next.label)}`]);
    // Potager.
    const gd = g.garden;
    const planted = (gd?.plots || []).filter((p) => p.crop);
    const ripe = planted.filter((p) => gd.ripe(p)).length;
    const dry = planted.filter((p) => !gd.ripe(p) && !gd.watered(p)).length;
    if (ripe) out.push(['🥕', `${plural(ripe, 'plante')} ${ripe > 1 ? 'sont prêtes' : 'est prête'} à cueillir au potager`, true]);
    if (dry) out.push(['💧', `${plural(dry, 'plante')} ${dry > 1 ? 'ont' : 'a'} soif`]);
    // Café des Chats : nouveaux pensionnaires.
    const arr = g.animals.arrivals;
    if (arr?.day === day) out.push(['🐱', arr.n > 1 ? `${arr.n} nouveaux chats attendent une famille au Café des Chats` : 'Un nouveau chat attend une famille au Café des Chats']);
    // Courrier.
    const letters = cal.letters.length;
    if (letters) out.push(['📬', `${plural(letters, 'lettre')} dans ta boîte aux lettres`, true]);
    // Demandes des habitants.
    const reqs = g.features.unlocked('demandes') ? (g.quests.requests || []).filter((r) => !r.done && g.villagers.get(r.villager)?.met) : [];
    if (reqs.length) {
      const list = reqs.slice(0, 3).map((r) => `${escapeHtml(name(r.villager))} (${r.count} ${ITEMS[r.item]?.emoji || ''})`).join(', ');
      out.push(['📋', `Demandes : ${list}`]);
    }
    // Défis du jour.
    const ch = g.features.unlocked('defis') ? g.progress.daily.list.filter((c) => !c.done) : [];
    if (ch.length) {
      const defs = ch.map((c) => g.progress.challengeDef(c.id)).filter(Boolean);
      out.push(['🎯', `Défis : ${defs.map((d) => `${d.emoji} ${escapeHtml(d.label)}`).join(' · ')}`]);
    }
    // Météo.
    const info = w.info;
    out.push([info.emoji, `${escapeHtml(info.label)} · demain : ${escapeHtml(w.forecast())}`]);
    return out;
  }

  /** Programme du jour : l'essentiel au réveil (brief), tout quand on clique sur l'horloge. */
  show(brief = false) {
    const g = this.game;
    const w = g.world.weather;
    const h = g.world.sky.hour;
    const hello = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
    const lines = brief ? this.lines().filter((l) => l[2]).slice(0, 3) : this.lines();
    const rows = lines.map(([e, t]) => `<li><span class="mo-em">${e}</span><span>${t}</span></li>`).join('');
    this.el.classList.toggle('brief', brief);
    this.el.innerHTML = `<div class="mo-head"><b>${hello} ${escapeHtml(g.character.appearance.name)} !</b>
      <small>${w.season.emoji} ${w.season.label} · jour ${g.world.sky.day}</small></div>${rows ? `<ul>${rows}</ul>` : ''}
      <button class="mo-close" aria-label="Fermer">✕</button>`;
    this.el.classList.remove('hidden');
    this.el.classList.remove('out');
    g.audio.play('mail');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.hide(), readTime(rows, brief ? (rows ? 9000 : 4000) : 16000, 40000));
  }

  hide() {
    clearTimeout(this.timer);
    if (this.el.classList.contains('hidden')) return;
    this.el.classList.add('out');
    this.timer = setTimeout(() => this.el.classList.add('hidden'), 350);
  }

  get open() {
    return !this.el.classList.contains('hidden') && !this.el.classList.contains('out');
  }
}
