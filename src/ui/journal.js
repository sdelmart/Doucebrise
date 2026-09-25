import { STORY, CHAPTERS } from '../game/quests.js';
import { ITEMS, RECIPES, countItem } from '../game/items.js';
import { FISH, RARITY, WHERE_LABELS, fishWhere } from '../game/fish.js';
import { INSECTS, INSECT_RARITY } from '../game/insects.js';
import { SKILLS, LEVELS, MAX_LEVEL, ACHIEVEMENTS, STAR_TRACK, STAR_STEP } from '../game/progress.js';
import { FESTIVALS } from '../game/calendar.js';
import { BIRTHDAYS } from '../npc/villagers.js';
import { SEASONS } from '../world/weather.js';
import { JOB_TYPES } from '../game/jobs.js';
import { FURNITURE } from '../house/furniture.js';
import { OPTIONS } from '../player/appearance.js';
import { heartsString, escapeHtml } from './ui.js';

// Journal (J) : histoire, demandes, défis, métiers, succès, étoiles, habitants,
// collections et calendrier.

const TABS = [
  { id: 'quetes', label: '📜 Histoire' },
  { id: 'demandes', label: '📋 Demandes' },
  { id: 'defis', label: '🎯 Défis' },
  { id: 'metiers', label: '🛠️ Métiers' },
  { id: 'succes', label: '🏅 Succès' },
  { id: 'etoiles', label: '⭐ Étoiles' },
  { id: 'habitants', label: '💞 Habitants' },
  { id: 'collections', label: '📚 Collections' },
  { id: 'calendrier', label: '📅 Calendrier' },
];

export class Journal {
  constructor(game) {
    this.game = game;
    this.tab = 'quetes';
    this.el = document.createElement('aside');
    this.el.id = 'journal';
    this.el.className = 'panel side hidden';
    this.el.innerHTML = `<header class="panel-head"><h2>📜 Journal</h2><button class="close" data-close>✕</button></header>
      <nav class="tabs wrap" id="journal-tabs"></nav><div class="panel-body" id="journal-body"></div>`;
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
    body.querySelectorAll('[data-title]').forEach((b) => {
      b.onclick = () => {
        this.game.progress.setTitle(b.dataset.title);
        this.game.audio.play('ui');
        this.render();
      };
    });
    body.querySelector('[data-hint]')?.addEventListener('click', () => {
      this.game.closePanels();
      this.game.showHint();
    });
    body.querySelector('[data-replay]')?.addEventListener('click', () => {
      this.game.closePanels();
      this.game.quests.showChapter(true);
    });
  }

  rewardText(r) {
    const parts = [];
    if (r.coins) parts.push(`🪙 ${r.coins}`);
    if (r.stars) parts.push(`⭐ ${r.stars}`);
    for (const [id, n] of Object.entries(r.items || {})) parts.push(`${ITEMS[id].emoji} ×${n}`);
    for (const [id, n] of Object.entries(r.furniture || {})) parts.push(`${FURNITURE[id]?.emoji || '🛋️'} ${FURNITURE[id]?.label || id}${n > 1 ? ` ×${n}` : ''}`);
    for (const u of [r.clothing, r.unlock].filter(Boolean)) {
      const [key, id] = u.split(':');
      const opt = OPTIONS[key]?.find((o) => o.id === id);
      parts.push(opt ? `${opt.icon || '👒'} ${opt.label}` : key === 'tool' ? '🥅 Filet à papillons' : '🎁 surprise');
    }
    if (r.title) parts.push(`🏷️ « ${r.title} »`);
    return parts.join(' · ');
  }

  quetes() {
    const q = this.game.quests;
    const cur = q.current;
    let html = `<div class="sparks-row" title="Étincelles du Cœur">🗼 Étincelles du Cœur : ${'✨'.repeat(q.sparks)}${'<span class="dim">✨</span>'.repeat(Math.max(0, 7 - q.sparks))} ${q.lighthouseLit ? '— le phare brille à nouveau ! 💛' : ''}</div>`;
    if (cur) {
      const chap = CHAPTERS.find((c) => c.id === cur.chapter);
      const giver = cur.giver ? this.game.villagers.get(cur.giver) : null;
      html += `<div class="chap-banner">${chap.emoji} ${chap.n <= 8 ? `Chapitre ${chap.n}` : 'Épilogue'} — ${escapeHtml(chap.title)} <button class="btn small" data-replay>Relire</button></div>`;
      html += `<div class="quest-card current"><div class="q-title">${escapeHtml(cur.title)}</div>
        ${giver ? `<div class="q-giver">${giver.def.emoji} ${escapeHtml(giver.def.name)}</div>` : ''}
        <p class="q-desc">${escapeHtml(cur.desc)}</p>`;
      cur.goals.forEach((goal, i) => {
        const p = q.goalProgress(cur, i);
        const pct = Math.round((p / goal.count) * 100);
        html += `<div class="q-goal${p >= goal.count ? ' done' : ''}"><span>${p >= goal.count ? '✅' : '▫️'} ${escapeHtml(goal.label)}</span><span>${p}/${goal.count}</span></div>
          <div class="q-bar"><span style="width:${pct}%"></span></div>`;
      });
      html += `<div class="q-reward">Récompense : ${this.rewardText(cur.reward)}</div>
        <button class="btn small primary" data-hint>💡 Que faire ?</button></div>`;
      // Autres quêtes du chapitre.
      const list = q.chapterQuests(cur.chapter);
      html += '<div class="field-title" style="margin-top:12px">Dans ce chapitre</div>';
      for (const s of list) {
        const done = q.completed.includes(s.id);
        html += `<div class="q-done${s === cur ? ' now' : ''}">${done ? '✅' : s === cur ? '▶️' : '🔒'} ${done || s === cur ? escapeHtml(s.title) : '???'}</div>`;
      }
    } else {
      html += '<div class="quest-card current"><div class="q-title">🌟 Histoire terminée !</div><p class="q-desc">Tu as rallumé le Cœur de Doucebrise et accompli l\'épilogue. Continue à cultiver, décorer, adopter et collectionner !</p></div>';
    }
    html += `<div class="field-title" style="margin-top:14px">Chapitres</div>`;
    const ci = q.chapterIndex;
    CHAPTERS.forEach((c, i) => {
      html += `<div class="q-done${i === ci ? ' now' : ''}">${i < ci ? '✅' : i === ci ? '▶️' : '🔒'} ${c.emoji} ${i <= ci ? escapeHtml(c.title) : '???'}</div>`;
    });
    html += `<p class="note">${q.completed.length}/${STORY.length} quêtes terminées.</p>`;
    return html;
  }

  demandes() {
    const g = this.game;
    g.quests.refreshRequests();
    let html = '';
    const job = g.jobs.active;
    if (job) {
      const t = JOB_TYPES[job.type];
      html += `<div class="quest-card current"><div class="q-title">${t.emoji} Petit boulot : ${t.label}</div><p class="q-desc">${escapeHtml(g.jobs.describe(job))}</p>
        <div class="q-goal"><span>${escapeHtml(g.jobs.progressText())}</span><span>🪙 ${job.reward}</span></div></div>`;
    } else {
      html += '<p class="note">📋 Le tableau des petits boulots, sur la place, propose des missions payées chaque jour.</p>';
    }
    html += '<p class="note" style="font-weight:700">Chaque jour, trois habitants ont besoin d\'un coup de main. Parle-leur pour livrer.</p>';
    for (const r of g.quests.requests) {
      const v = g.villagers.get(r.villager);
      const it = ITEMS[r.item];
      const have = countItem(g.inventory, r.item);
      html += `<div class="quest-card${r.done ? ' finished' : ''}"><div class="q-title">${v.def.emoji} ${escapeHtml(v.def.name)}</div>
        <p class="q-desc">« ${escapeHtml(r.text)} » — ${it.emoji} ${escapeHtml(it.label)} ×${r.count}</p>
        <div class="q-goal"><span>${r.done ? '✅ Livré' : `Dans ton sac : ${have}/${r.count}`}</span><span>🪙 ${r.reward}</span></div></div>`;
    }
    return html;
  }

  defis() {
    const g = this.game;
    const p = g.progress;
    p.refreshDaily();
    let html = '<p class="note">Trois défis par jour. Réussis-les tous pour un bonus ! Ils rapportent des pièces et des ⭐.</p>';
    for (const c of p.daily.list) {
      const def = p.challengeDef(c.id);
      if (!def) continue;
      const pct = Math.round((c.progress / def.count) * 100);
      html += `<div class="quest-card${c.done ? ' finished' : ''}"><div class="q-title">${def.emoji} ${escapeHtml(def.label)}</div>
        <div class="q-goal${c.done ? ' done' : ''}"><span>${c.done ? '✅ Réussi !' : `${c.progress}/${def.count}`}</span><span>🪙 ${c.reward} · ⭐ 3</span></div>
        <div class="q-bar"><span style="width:${pct}%"></span></div></div>`;
    }
    html += `<div class="q-desc">${p.daily.bonus ? '🌟 Bonus du jour obtenu !' : '🎁 Bonus si les 3 défis sont réussis : 🪙 100 · ⭐ 5 · 🍪 ×2'}</div>`;
    return html;
  }

  metiers() {
    const p = this.game.progress;
    let html = '<p class="note">Chaque activité fait progresser un métier. Chaque niveau apporte des récompenses et un bonus permanent.</p>';
    for (const [id, s] of Object.entries(SKILLS)) {
      const lvl = p.level(id);
      const xp = p.xp[id] || 0;
      const pct = Math.round(p.levelProgress(id) * 100);
      const next = lvl >= MAX_LEVEL ? 'Niveau max !' : `${xp - LEVELS[lvl - 1]}/${LEVELS[lvl] - LEVELS[lvl - 1]} XP`;
      html += `<div class="quest-card skill"><div class="q-title">${s.emoji} ${s.label} <span class="lvl">Niv. ${lvl}</span></div>
        <div class="q-bar"><span style="width:${pct}%"></span></div>
        <div class="q-goal"><span>${next}</span><span>${lvl >= MAX_LEVEL ? `🏷️ ${escapeHtml(s.title)}` : `Niv. 10 : « ${escapeHtml(s.title)} »`}</span></div>
        <p class="q-desc">✨ ${escapeHtml(s.perk)}${lvl > 1 ? ` (bonus ×${lvl - 1})` : ''}</p></div>`;
    }
    return html;
  }

  succes() {
    const p = this.game.progress;
    const done = ACHIEVEMENTS.filter((a) => p.done.has(a.id)).length;
    let html = `<p class="note">${done}/${ACHIEVEMENTS.length} succès débloqués. Chacun rapporte ⭐ 5 (et parfois plus !).</p><div class="book">`;
    for (const a of ACHIEVEMENTS) {
      const ok = p.done.has(a.id);
      const extra = { ...a.reward };
      delete extra.stars;
      const rt = this.rewardText(extra);
      html += `<div class="book-card ach${ok ? '' : ' unknown'}"><div class="b-em">${ok ? '🏅' : '🔒'}</div><div class="b-title">${escapeHtml(a.label)}</div><div class="b-line">${escapeHtml(a.desc)}</div>${rt ? `<div class="b-line">🎁 ${rt}</div>` : ''}</div>`;
    }
    return `${html}</div>`;
  }

  etoiles() {
    const p = this.game.progress;
    const claimed = p.starClaimed;
    let html = `<div class="stars-big">⭐ ${p.stars} étoiles</div><p class="note">Gagne des étoiles avec les défis, les succès, les métiers, les chapitres et les petits boulots. Tous les ${STAR_STEP} ⭐, un palier du carnet se débloque !</p>`;
    html += '<div class="field-title">🏷️ Mes titres (clique pour l\'afficher)</div><div class="chips">';
    for (const t of p.titles) html += `<button class="chip${t === p.title ? ' active' : ''}" data-title="${escapeHtml(t)}">${escapeHtml(t)}</button>`;
    html += '</div><div class="field-title" style="margin-top:12px">📖 Carnet d\'étoiles</div><div class="star-track">';
    STAR_TRACK.forEach((tier, i) => {
      const ok = i < claimed;
      html += `<div class="star-tier${ok ? ' ok' : i === claimed ? ' next' : ''}"><div class="st-num">${(i + 1) * STAR_STEP} ⭐</div><div class="st-rew">${this.rewardText(tier)}</div>${ok ? '<div class="st-ok">✓</div>' : ''}</div>`;
    });
    return `${html}</div>`;
  }

  habitants() {
    const g = this.game;
    let html = '';
    for (const v of g.villagers.list) {
      const known = v.met;
      const loves = v.def.loves.filter((id) => g.knownLoves.has(`${v.def.id}:${id}`));
      const b = BIRTHDAYS[v.def.id];
      const bd = b ? `${SEASONS[b[0]].emoji} ${SEASONS[b[0]].label}, jour ${b[1]}` : '';
      html += `<div class="quest-card"><div class="q-title">${v.def.emoji} ${known ? escapeHtml(v.def.name) : '???'} <span class="d-job">${known ? escapeHtml(v.def.job) : ''}</span></div>
        <div class="hearts">${heartsString(v.friendship)}</div>
        <p class="q-desc">${known ? `Adore : ${loves.length ? loves.map((id) => ITEMS[id]?.emoji || '❔').join(' ') : '❔ (offre-lui des cadeaux pour découvrir)'}` : 'Pas encore rencontré.'}</p>
        ${known ? `<p class="q-desc">🎂 Anniversaire : ${bd} · 💬 Scènes : ${v.seenEvents.length}/2</p><p class="q-desc">${this.nextReward(v)}</p>` : ''}</div>`;
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
    html += `</div><div class="field-title" style="margin-top:14px">🐟 Poissons (${Object.keys(fishBest).length}/${FISH.length})</div><div class="book">`;
    for (const f of FISH) {
      const b = fishBest[f.id];
      const rar = RARITY[f.rarity];
      html += `<div class="book-card${b ? '' : ' unknown'}"><div class="b-em">${b ? f.emoji : '❔'}</div><div class="b-title">${b ? escapeHtml(f.label) : '???'}</div>
        <div class="b-line" style="color:${rar.color}">${rar.label}</div><div class="b-line">${b ? `Record : ${b} cm` : this.fishHint(f)}</div></div>`;
    }
    const caught = g.insects.caught;
    html += `</div><div class="field-title" style="margin-top:14px">🦋 Insectes (${Object.keys(caught).length}/${INSECTS.length})</div><div class="book">`;
    for (const b of INSECTS) {
      const n = caught[b.id];
      const rar = INSECT_RARITY[b.rarity];
      html += `<div class="book-card${n ? '' : ' unknown'}"><div class="b-em">${n ? b.emoji : '❔'}</div><div class="b-title">${n ? escapeHtml(b.label) : '???'}</div>
        <div class="b-line" style="color:${rar.color}">${rar.label}</div><div class="b-line">${n ? `Attrapé ×${n}` : this.insectHint(b)}</div></div>`;
    }
    const s = g.quests.stats;
    html += `</div><div class="field-title" style="margin-top:14px">📊 Statistiques</div>
      <div class="q-desc">Plats cuisinés : ${s.cooked} · Poissons pêchés : ${s.fish} · Objets vendus : ${s.sold} · Pièces gagnées : ${s.earned} · Petits boulots : ${g.jobs.done}</div>`;
    return html;
  }

  fishHint(f) {
    const parts = [fishWhere(f).map((w) => WHERE_LABELS[w]).join(' / ')];
    if (f.hours) parts.push(`${f.hours[0]} h–${f.hours[1]} h`);
    if (f.seasons) parts.push(f.seasons.map((i) => SEASONS[i].emoji).join(''));
    if (f.rain === true) parts.push('🌧️');
    if (f.rain === false) parts.push('☀️');
    return parts.join(' · ');
  }

  insectHint(b) {
    const parts = [];
    if (b.hours) parts.push(`${b.hours[0]} h–${b.hours[1]} h`);
    if (b.seasons) parts.push(b.seasons.map((i) => SEASONS[i].emoji).join(''));
    if (b.rain) parts.push('🌧️ sous la pluie');
    return parts.join(' · ') || 'Partout';
  }

  calendrier() {
    const g = this.game;
    const w = g.world.weather;
    let html = `<p class="note">Une année = 4 saisons de 3 jours. Aujourd'hui : ${w.season.emoji} ${w.season.label}, jour ${w.dayInSeason} (jour ${g.world.sky.day}).</p>`;
    SEASONS.forEach((s, si) => {
      html += `<div class="field-title">${s.emoji} ${s.label}</div><div class="cal-row">`;
      for (let d = 1; d <= 3; d++) {
        const today = si === w.seasonIndex && d === w.dayInSeason;
        const f = FESTIVALS.find((x) => x.season === si && x.day === d);
        const b = Object.entries(BIRTHDAYS).find(([, [bs, bd]]) => bs === si && bd === d);
        const v = b ? g.villagers.get(b[0]) : null;
        html += `<div class="cal-day${today ? ' today' : ''}"><div class="cal-num">Jour ${d}</div>
          ${f ? `<div class="cal-ev" title="${escapeHtml(f.desc)}">${f.emoji} ${escapeHtml(f.label)}</div>` : ''}
          ${v ? `<div class="cal-ev">🎂 ${v.met ? escapeHtml(v.def.name) : '???'}</div>` : ''}</div>`;
      }
      html += '</div>';
    });
    html += '<div class="field-title" style="margin-top:10px">Les fêtes</div>';
    for (const f of FESTIVALS) html += `<div class="q-desc">${f.emoji} <b>${escapeHtml(f.label)}</b> — ${escapeHtml(f.desc)}</div>`;
    return html;
  }
}
