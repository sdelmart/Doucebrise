import { ITEMS } from '../game/items.js';
import { DAYS_PER_SEASON } from '../world/weather.js';
import { escapeHtml } from './ui.js';

// Carnet du matin : au lever du jour, une petite carte résume la journée (saison, fête,
// anniversaires, potager, courrier, demandes des habitants, défis, météo) au lieu d'une
// série de messages séparés. Un clic sur l'horloge la rouvre à tout moment.

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
  }

  /** Nouveau jour : la carte attendra le matin (et que la joueuse soit disponible). */
  schedule() {
    this.pendingDay = this.game.world.sky.day;
  }

  /** À chaque image : montre la carte du jour dès que c'est le matin et que rien n'occupe l'écran. */
  update() {
    const g = this.game;
    if (this.pendingDay === null || g.state !== 'play' || g.busy || g.panel) return;
    if (this.pendingDay !== g.world.sky.day) {
      this.pendingDay = g.world.sky.day;
      return;
    }
    if (g.world.sky.hour < 5.5 || document.querySelector('#fade')?.classList.contains('on')) return;
    this.pendingDay = null;
    this.show();
  }

  /** Lignes du jour : [emoji, texte]. */
  lines() {
    const g = this.game;
    const out = [];
    const w = g.world.weather;
    const cal = g.calendar;
    const name = (id) => g.villagers.get(id)?.def.name || id;
    if (w.dayInSeason === 1 && g.world.sky.day > 1) out.push([w.season.emoji, `Nouvelle saison : ${w.season.label} !`]);
    const f = cal.festival;
    if (f) out.push([f.emoji, `<b>${escapeHtml(f.label)}</b> aujourd'hui ! ${escapeHtml(f.desc)}`]);
    const bs = cal.birthdaysOf();
    if (bs.length) out.push(['🎂', `Anniversaire de <b>${escapeHtml(bs.map(name).join(' et de '))}</b> : un petit cadeau ferait très plaisir.`]);
    // Demain : fête à venir.
    const day = g.world.sky.day;
    const next = cal.festivalOn(Math.floor(day / DAYS_PER_SEASON) % 4, (day % DAYS_PER_SEASON) + 1);
    if (next) out.push(['📅', `Demain : ${next.emoji} ${escapeHtml(next.label)}`]);
    // Potager.
    const gd = g.garden;
    const planted = (gd?.plots || []).filter((p) => p.crop);
    const ripe = planted.filter((p) => gd.ripe(p)).length;
    const dry = planted.filter((p) => !gd.ripe(p) && !gd.watered(p)).length;
    if (ripe) out.push(['🥕', `${plural(ripe, 'plante')} ${ripe > 1 ? 'sont prêtes' : 'est prête'} à cueillir au potager`]);
    if (dry) out.push(['💧', `${plural(dry, 'plante')} ${dry > 1 ? 'ont' : 'a'} soif`]);
    // Courrier.
    const letters = cal.letters.length;
    if (letters) out.push(['📬', `${plural(letters, 'lettre')} dans ta boîte aux lettres`]);
    // Demandes des habitants.
    const reqs = (g.quests.requests || []).filter((r) => !r.done && g.villagers.get(r.villager)?.met);
    if (reqs.length) {
      const list = reqs.slice(0, 3).map((r) => `${escapeHtml(name(r.villager))} (${r.count} ${ITEMS[r.item]?.emoji || ''})`).join(', ');
      out.push(['📋', `Demandes : ${list}`]);
    }
    // Défis du jour.
    const ch = g.progress.daily.list.filter((c) => !c.done);
    if (ch.length) {
      const defs = ch.map((c) => g.progress.challengeDef(c.id)).filter(Boolean);
      out.push(['🎯', `Défis : ${defs.map((d) => `${d.emoji} ${escapeHtml(d.label)}`).join(' · ')}`]);
    }
    // Météo.
    const info = w.info;
    out.push([info.emoji, `${escapeHtml(info.label)} · demain : ${escapeHtml(w.forecast())}`]);
    return out;
  }

  /** Affiche le programme du jour (au matin, ou quand on clique sur l'horloge). */
  show() {
    const g = this.game;
    const w = g.world.weather;
    const h = g.world.sky.hour;
    const hello = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
    const rows = this.lines().map(([e, t]) => `<li><span class="mo-em">${e}</span><span>${t}</span></li>`).join('');
    this.el.innerHTML = `<div class="mo-head"><b>${hello} ${escapeHtml(g.character.appearance.name)} !</b>
      <small>${w.season.emoji} ${w.season.label} · jour ${g.world.sky.day}</small></div><ul>${rows}</ul>
      <button class="mo-close" aria-label="Fermer">✕</button>`;
    this.el.classList.remove('hidden');
    this.el.classList.remove('out');
    g.audio.play('mail');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.hide(), 16000);
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
