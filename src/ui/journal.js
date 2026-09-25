import { STORY } from '../game/quests.js';
import { ITEMS, RECIPES } from '../game/items.js';
import { FISH } from '../game/activities.js';
import { heartsString, escapeHtml } from './ui.js';

// Journal (J) : quêtes, demandes du jour, habitants et collections.

const TABS = [
  { id: 'quetes', label: 'Quêtes' },
  { id: 'demandes', label: 'Demandes' },
  { id: 'habitants', label: 'Habitants' },
  { id: 'collections', label: 'Collections' },
];

export class Journal {
  constructor(game) {
    this.game = game;
    this.tab = 'quetes';
    this.el = document.createElement('aside');
    this.el.id = 'journal';
    this.el.className = 'panel side hidden';
    this.el.innerHTML = `<header class="panel-head"><h2>📜 Journal</h2><button class="close" data-close>✕</button></header>
      <nav class="tabs" id="journal-tabs"></nav><div class="panel-body" id="journal-body"></div>`;
    document.body.appendChild(this.el);
    this.el.querySelector('[data-close]').onclick = () => game.closePanels();
  }

  render() {
    const tabs = this.el.querySelector('#journal-tabs');
    tabs.innerHTML = '';
    for (const t of TABS) {
      const b = document.createElement('button');
      b.className = `tab${t.id === this.tab ? ' active' : ''}`;
      b.textContent = t.label;
      b.onclick = () => {
        this.tab = t.id;
        this.render();
      };
      tabs.appendChild(b);
    }
    const body = this.el.querySelector('#journal-body');
    body.innerHTML = this[this.tab]();
  }

  quetes() {
    const q = this.game.quests;
    const cur = q.current;
    let html = '';
    if (cur) {
      const giver = cur.giver ? this.game.villagers.get(cur.giver) : null;
      html += `<div class="quest-card current"><div class="q-title">${escapeHtml(cur.title)}</div>
        ${giver ? `<div class="q-giver">${giver.def.emoji} ${escapeHtml(giver.def.name)}</div>` : ''}
        <p class="q-desc">${escapeHtml(cur.desc)}</p>`;
      cur.goals.forEach((goal, i) => {
        const p = q.goalProgress(cur, i);
        const pct = Math.round((p / goal.count) * 100);
        html += `<div class="q-goal${p >= goal.count ? ' done' : ''}"><span>${p >= goal.count ? '✅' : '▫️'} ${escapeHtml(goal.label)}</span><span>${p}/${goal.count}</span></div>
          <div class="q-bar"><span style="width:${pct}%"></span></div>`;
      });
      html += `<div class="q-reward">Récompense : ${this.rewardText(cur.reward)}</div></div>`;
    } else {
      html += '<div class="quest-card current"><div class="q-title">🌟 Histoire terminée !</div><p class="q-desc">Tu es devenu·e un vrai habitant de Doucebrise. Continue à cultiver, décorer et adopter !</p></div>';
    }
    html += `<div class="field-title" style="margin-top:14px">Terminées (${q.completed.length}/${STORY.length})</div>`;
    for (const id of [...q.completed].reverse()) {
      const s = STORY.find((x) => x.id === id);
      if (s) html += `<div class="q-done">✅ ${escapeHtml(s.title)}</div>`;
    }
    return html;
  }

  rewardText(r) {
    const parts = [];
    if (r.coins) parts.push(`🪙 ${r.coins}`);
    for (const [id, n] of Object.entries(r.items || {})) parts.push(`${ITEMS[id].emoji} ×${n}`);
    for (const [id, n] of Object.entries(r.furniture || {})) parts.push(`🛋️ ${this.game.decor.label(id)}${n > 1 ? ` ×${n}` : ''}`);
    if (r.unlock) parts.push('👒 tenue spéciale');
    return parts.join(' · ');
  }

  demandes() {
    const g = this.game;
    g.quests.refreshRequests();
    let html = '<p class="note" style="font-weight:700">Chaque jour, trois habitants ont besoin d\'un coup de main. Parle-leur pour livrer.</p>';
    for (const r of g.quests.requests) {
      const v = g.villagers.get(r.villager);
      const it = ITEMS[r.item];
      const have = g.inventory[r.item] || 0;
      html += `<div class="quest-card${r.done ? ' finished' : ''}"><div class="q-title">${v.def.emoji} ${escapeHtml(v.def.name)}</div>
        <p class="q-desc">« ${escapeHtml(r.text)} » — ${it.emoji} ${escapeHtml(it.label)} ×${r.count}</p>
        <div class="q-goal"><span>${r.done ? '✅ Livré' : `Dans ton sac : ${have}/${r.count}`}</span><span>🪙 ${r.reward}</span></div></div>`;
    }
    return html;
  }

  habitants() {
    const g = this.game;
    let html = '';
    for (const v of g.villagers.list) {
      const known = v.met;
      const loves = v.def.loves.filter((id) => g.knownLoves.has(`${v.def.id}:${id}`));
      html += `<div class="quest-card"><div class="q-title">${v.def.emoji} ${known ? escapeHtml(v.def.name) : '???'} <span class="d-job">${known ? escapeHtml(v.def.job) : ''}</span></div>
        <div class="hearts">${heartsString(v.friendship)}</div>
        <p class="q-desc">${known ? `Adore : ${loves.length ? loves.map((id) => ITEMS[id].emoji).join(' ') : '❔ (offre-lui des cadeaux pour découvrir)'}` : 'Pas encore rencontré.'}</p>
        ${known ? `<p class="q-desc">${this.nextReward(v)}</p>` : ''}</div>`;
    }
    return html;
  }

  nextReward(v) {
    const next = Object.keys(v.def.rewards).map(Number).sort((a, b) => a - b).find((t) => !v.rewardsGiven.includes(t));
    return next ? `🎁 Surprise à ${next / 20} cœurs` : '🎁 Toutes les surprises reçues !';
  }

  collections() {
    const g = this.game;
    const fishBest = g.fishing.best;
    const knownR = g.cooking.known;
    let html = `<div class="field-title">🍳 Recettes (${knownR.size}/${RECIPES.length})</div><div class="book">`;
    for (const r of RECIPES) {
      const k = knownR.has(r.id);
      const it = ITEMS[r.id];
      html += `<div class="book-card${k ? '' : ' unknown'}"><div class="b-em">${k ? it.emoji : '❔'}</div><div class="b-title">${k ? escapeHtml(it.label) : '???'}</div>
        <div class="b-line">${k ? Object.entries(r.needs).map(([id, n]) => `${ITEMS[id].emoji}×${n}`).join(' + ') : `Apprise auprès de ${r.from}`}</div></div>`;
    }
    html += `</div><div class="field-title" style="margin-top:14px">🐟 Poissons (${Object.keys(fishBest).length}/${FISH.filter((f) => !f.junk).length})</div><div class="book">`;
    for (const f of FISH.filter((x) => !x.junk)) {
      const b = fishBest[f.name];
      html += `<div class="book-card${b ? '' : ' unknown'}"><div class="b-title">${b ? escapeHtml(f.name) : '???'}</div><div class="b-line">${b ? `Record : ${b} cm` : 'Pas encore pêché'}</div></div>`;
    }
    const s = g.quests.stats;
    html += `</div><div class="field-title" style="margin-top:14px">📊 Statistiques</div>
      <div class="q-desc">Plats cuisinés : ${s.cooked} · Poissons pêchés : ${s.fish} · Objets vendus : ${s.sold} · Pièces gagnées : ${s.earned}</div>`;
    return html;
  }
}
