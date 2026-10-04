import * as THREE from 'three';
import { SPECIES } from '../animals/species.js';
import { ITEMS, HOTBAR, countItem } from '../game/items.js';
import { ZONES, MAP_RANGE } from '../world/layout.js';
import { STORY, CHAPTERS } from '../game/quests.js';
import { JOB_TYPES } from '../game/jobs.js';
import { ACTIONS } from '../core/settings.js';
import { PLACES } from '../house/visits.js';
import { actionKey, keyLabel } from '../core/input.js';

// Libellés de touches des bulles d'action (« E », « Maj »…) → touche réelle du joueur.
const PROMPT_KEYS = { Maj: 'run', Espace: 'jump' };
for (const a of ACTIONS) if (/^Key[A-Z]$/.test(a.logical)) PROMPT_KEYS[a.logical.slice(3)] = a.id;
export function promptKey(k) {
  return PROMPT_KEYS[k] ? actionKey(PROMPT_KEYS[k]) : k;
}

// Écran tactile : pas de lettres du clavier, mais l'icône du bouton d'action à toucher.
const TOUCH_ICONS = { KeyE: '✋', KeyF: '🍓', KeyR: '💞', KeyG: '🪶', KeyV: '🚲', Space: '⤒' };
const TOUCH_BY_ACTION = { interact: '✋', feed: '🍓', adopt: '💞', play: '🪶', vehicle: '🚲', jump: '⤒' };
/** Icône du bouton tactile d'une bulle d'action (« E », « KeyE »…), ou null. */
function touchIcon(k) {
  return TOUCH_ICONS[k] || TOUCH_BY_ACTION[PROMPT_KEYS[k]] || null;
}
export const isTouchUI = () => document.body.classList.contains('touch-ui');

// Interface HTML : HUD, bulle d'interaction, notifications, mini-carte, fenêtres.

const $ = (sel) => document.querySelector(sel);
const _v = new THREE.Vector3();

export class UI {
  constructor(game) {
    this.game = game;
    this.initTouchUI();
    this.el = {
      hud: $('#hud'),
      title: $('#title'),
      loading: $('#loading'),
      clockIcon: $('#clock-icon'),
      clockTime: $('#clock-time'),
      clockDay: $('#clock-day'),
      coins: $('#coins'),
      quest: $('#quest-tracker'),
      zone: $('#zone-label'),
      banner: $('#zone-banner'),
      prompt: $('#prompt'),
      pickCard: $('#pick-card'),
      toasts: $('#toasts'),
      inventory: $('#inventory'),
      followers: $('#followers'),
      minimap: $('#minimap'),
      bigmap: $('#bigmap'),
      dialog: $('#dialog'),
      touch: $('#touch'),
      hint: $('#btn-hint'),
    };
    this.openPanel = null;
    this.promptKey = '';
    this.mapT = 0;
    // Interface épurée : ce qui s'efface, ce qui revient un instant.
    this.hudMode = 'epure';
    this.hudFade = true;
    this.trayOpen = false;
    this.roamT = 0;
    this.stillT = 0;
    this.wakeUntil = 0;
    this.invShowUntil = 0;
    this.invReady = false;
    this.promptFeed = false;
    this.questSig = null;
    this.questSince = 0;
    this.challengeSig = null;

    this.buildInventory();
    this.mapImage = game.world.terrain.renderMap(1024, MAP_RANGE);
    this.mapView = { cx: 0, cz: 0, half: 110 };
    this.initBigMap();

    // Boutons du HUD.
    document.querySelectorAll('[data-open]').forEach((b) => {
      b.addEventListener('click', () => this.game.openPanel(b.dataset.open));
    });
    document.querySelectorAll('[data-close]').forEach((b) => {
      b.addEventListener('click', () => this.game.closePanels());
    });
    this.el.minimap.addEventListener('click', () => this.game.openPanel('map'));
    this.bubbles = [];
    $('#btn-hint').addEventListener('click', () => this.game.showHint());
    $('#btn-vehicle').addEventListener('click', () => this.game.vehicles.toggleMenu());
    $('#challenge-tracker').addEventListener('click', () => {
      this.game.journal.tab = 'defis';
      this.game.openPanel('journal');
    });
    $('#btn-music').addEventListener('click', () => this.game.toggleMusic());
    $('#btn-decor').addEventListener('click', () => this.game.startDecor());
    $('#btn-photo').addEventListener('click', () => this.game.startPhoto());
    this.el.quest.addEventListener('click', (e) => {
      if (e.target.closest('.qt-more')) this.cycleFocus();
      else this.game.openPanel('journal');
    });
    // L'horloge rouvre le carnet du jour (fête, anniversaires, potager, courrier…).
    const clock = document.querySelector('.clock-card');
    clock.title = 'Le programme du jour';
    clock.addEventListener('click', () => this.game.morning?.show());
    // Menus rapides (interface épurée) : un bouton sous la mini-carte les déplie.
    $('#btn-tray').addEventListener('click', () => this.toggleTray());
    $('#hud-buttons').addEventListener('click', (e) => {
      if (e.target.closest('button')) this.toggleTray(false);
    });
    document.addEventListener('pointerdown', (e) => {
      if (this.trayOpen && !e.target.closest?.('#hud-buttons, #btn-tray')) this.toggleTray(false);
    }, { capture: true });
    for (const id of ['#map', '#help']) {
      $(id).addEventListener('click', (e) => {
        if (e.target === e.currentTarget) this.game.closePanels();
      });
    }
    this.setupTouch();
  }

  // --- Écrans ----------------------------------------------------------------

  hideLoading() {
    this.el.loading.classList.add('hidden');
  }

  showTitle() {
    this.el.title.classList.remove('hidden');
    this.game.titleMenu?.render();
    this.el.hud.classList.add('hidden');
  }

  hideTitle() {
    this.el.title.classList.add('hidden');
  }

  /**
   * Mode tactile : les bulles de touches du clavier (E, C, H…) disparaissent au profit des
   * boutons d'action. On bascule dès qu'on touche l'écran, et on revient au clavier dès
   * qu'une vraie touche est pressée ou qu'une souris est utilisée.
   */
  initTouchUI() {
    const set = (on) => {
      if (on === isTouchUI()) return;
      document.body.classList.toggle('touch-ui', on);
      this.promptKey = null;
      if (this.el?.touch) this.el.touch.classList.toggle('hidden', !(on && !this.el.hud.classList.contains('hidden')));
    };
    set(!!window.matchMedia?.('(hover: none) and (pointer: coarse)').matches);
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') set(true);
      else if (e.pointerType === 'mouse') set(false);
    }, { capture: true, passive: true });
    window.addEventListener('keydown', (e) => {
      if (e.isTrusted && !e.padLogical) set(false);
    }, { capture: true, passive: true });
  }

  showHUD(on) {
    this.el.hud.classList.toggle('hidden', !on);
    if (!on) this.toggleTray(false);
    this.el.touch.classList.toggle('hidden', !(on && (this.game.input.isTouch || isTouchUI())));
    if (!on) {
      this.setPrompt(null);
      this.setPickCard(null);
    }
  }

  // --- Interface épurée ---------------------------------------------------------

  /** Complète (tout affiché), épurée (l'essentiel, le reste au besoin) ou minimale. */
  setHudMode(mode = 'epure', fade = true) {
    this.hudMode = ['complet', 'epure', 'minimal'].includes(mode) ? mode : 'epure';
    this.hudFade = fade !== false;
    const b = document.body.classList;
    b.toggle('hud-full', this.hudMode === 'complet');
    b.toggle('hud-clean', this.hudMode === 'epure');
    b.toggle('hud-min', this.hudMode === 'minimal');
    if (this.hudMode === 'complet') {
      this.toggleTray(false);
      for (const id of ['#btn-decor', '#btn-vehicle']) $(id).classList.remove('hidden');
    }
    this.hintsKey = '';
  }

  /** Ouvre ou ferme les menus rapides. */
  toggleTray(on = !this.trayOpen) {
    on = !!on && this.hudMode !== 'complet' && !this.el.hud.classList.contains('hidden');
    if (on === this.trayOpen) return;
    this.trayOpen = on;
    document.body.classList.toggle('tray-open', on);
    $('#btn-tray').setAttribute('aria-expanded', String(on));
    if (on) {
      // Seulement ce qui sert ici : décorer chez soi, un véhicule si on en a un.
      const g = this.game;
      $('#btn-decor').classList.toggle('hidden', !g.decor.availableArea());
      $('#btn-vehicle').classList.toggle('hidden', !Object.keys(g.vehicles.owned || {}).length);
      this.wake(3);
    }
  }

  /** L'interface revient un instant (quête qui avance, pièces gagnées…). */
  wake(seconds = 3) {
    this.wakeUntil = Math.max(this.wakeUntil, performance.now() + seconds * 1000);
    document.body.classList.remove('hud-roam');
  }

  /** Un élément apparaît quelques secondes (défi qui avance, quête en mode minimal). */
  peek(el, seconds = 5) {
    if (!el) return;
    el.classList.add('peek');
    clearTimeout(el._peekT);
    el._peekT = setTimeout(() => el.classList.remove('peek'), seconds * 1000);
  }

  /** Titre de la chanson qui commence, discret, en bas à droite. */
  nowPlaying(name) {
    const el = $('#now-playing');
    if (!el) return;
    el.textContent = `🎵 ${name}`;
    this.peek(el, 5);
  }

  /** À chaque image : promenade (l'interface s'efface), barre d'objets, ampoule. */
  updateHud(dt) {
    const g = this.game;
    const body = document.body.classList;
    const moving = g.state === 'play' && (g.player.speed || 0) > 0.6 && !g.panel && !g.busy;
    this.roamT = moving ? this.roamT + dt : 0;
    this.stillT = moving ? 0 : this.stillT + dt;
    const canRoam = this.hudFade && this.hudMode !== 'complet' && !this.trayOpen && performance.now() > this.wakeUntil;
    body.toggle('hud-roam', canRoam && (this.roamT > 2.5 || (body.contains('hud-roam') && this.stillT < 0.8)));
    // Barre d'objets : quand un objet arrive ou part, ou quand on peut en donner un.
    const inv = this.el.inventory;
    const any = this.invAny;
    inv.classList.toggle('show', this.hudMode === 'complet' || (any && (performance.now() < this.invShowUntil || this.promptFeed)));
    // L'ampoule s'allume si la quête n'avance plus depuis un moment.
    const stuck = !!g.quests.current && (g.playtime || 0) - this.questSince > 240;
    this.el.hint.classList.toggle('stuck', stuck);
  }

  // --- Inventaire & compagnons ----------------------------------------------

  buildInventory() {
    this.el.inventory.innerHTML = '';
    this.slots = {};
    for (const id of HOTBAR) {
      const f = ITEMS[id];
      const d = document.createElement('div');
      d.className = 'slot';
      d.title = f.label;
      d.innerHTML = `${f.emoji}<span class="count">0</span>`;
      this.el.inventory.appendChild(d);
      this.slots[id] = d;
    }
    const bag = document.createElement('button');
    bag.className = 'slot bag-btn';
    bag.title = 'Mon sac (I)';
    bag.innerHTML = '🎒<span class="count key-hint">I</span>';
    bag.onclick = () => this.game.openPanel('bag');
    this.el.inventory.appendChild(bag);
  }

  refreshInventory() {
    const inv = this.game.inventory;
    let changed = false;
    let any = false;
    for (const [id, d] of Object.entries(this.slots)) {
      const n = countItem(inv, id);
      const c = d.querySelector('.count');
      if (c.textContent !== String(n)) {
        c.textContent = n;
        changed = true;
        d.classList.remove('bump');
        void d.offsetWidth;
        d.classList.add('bump');
      }
      if (n > 0) any = true;
      d.classList.toggle('empty', n === 0);
      d.classList.toggle('hidden', (id === 'friandise' || id === 'patee') && n === 0);
    }
    this.invAny = any;
    // Interface épurée : la barre apparaît quelques secondes quand un objet arrive ou part.
    if (changed && this.invReady) this.invShowUntil = performance.now() + 4500;
    this.invReady = true;
    if (this.openPanel === 'bag') this.game.bag.render();
  }

  refreshCoins(delta = 0) {
    this.el.coins.textContent = `🪙 ${this.game.coins}`;
    if (delta) {
      this.wake(3);
      this.peek(this.el.coins.closest('.clock-card'), 3);
      const f = document.createElement('div');
      f.className = 'coin-pop';
      f.textContent = `${delta > 0 ? '+' : ''}${delta} 🪙`;
      this.el.coins.parentElement.appendChild(f);
      setTimeout(() => f.remove(), 1200);
      this.el.coins.classList.remove('bump');
      void this.el.coins.offsetWidth;
      this.el.coins.classList.add('bump');
    }
  }

  /** Objectifs en cours : histoire, mission, quête d'habitant suivie, page du carnet. */
  objectives() {
    const g = this.game;
    const out = [];
    const q = g.quests.current;
    if (q) {
      const qs = g.quests;
      const i = q.goals.findIndex((goal, k) => qs.goalProgress(q, k) < goal.count);
      const goal = q.goals[Math.max(i, 0)];
      const p = qs.goalProgress(q, Math.max(i, 0));
      const chap = CHAPTERS.find((c) => c.id === q.chapter);
      const inChap = qs.chapterQuests(q.chapter);
      out.push({
        kind: 'story',
        em: '📜',
        text: `${goal.label}${goal.count > 1 ? ` — ${p}/${goal.count}` : ''}`,
        head: `<div class="qt-chap">${chap.emoji} ${chap.id === 'epilogue' ? 'Épilogue' : `Chapitre ${chap.n}`} · ${inChap.indexOf(q) + 1}/${inChap.length}</div><div class="qt-title">📜 ${escapeHtml(q.title)}</div>`,
        name: q.title,
      });
    }
    const job = g.jobs?.active;
    if (job) out.push({ kind: 'job', em: JOB_TYPES[job.type].emoji, text: g.jobs.progressText(), name: JOB_TYPES[job.type].label });
    const sq = g.sideQuests;
    const side = sq?.tracked && sq.get(sq.tracked);
    if (side && sq.active[side.id]) {
      const to = g.villagers.get(sq.turnInOf(side));
      out.push({ kind: 'side', em: '❗', text: `${side.title} — ${sq.isReady(side) ? `retourne voir ${to.def.name}` : sq.progressText(side)}`, name: side.title });
    }
    // Page du carnet : seulement si on a demandé à être guidé (sinon, journal → Carnet).
    const page = q && q.id !== 'pages' && g.carnet?.tracked ? g.carnet.next() : null;
    if (page) out.push({ kind: 'page', em: '📖', text: page.riddle, name: `Page ${page.n} du carnet` });
    if (!out.length) out.push({ kind: 'story', em: '🌟', text: 'Histoire terminée : profite de l\'île !', name: 'Histoire' });
    return out;
  }

  /** Passe à l'objectif suivant (le HUD, le repère et la flèche n'en montrent qu'un). */
  cycleFocus() {
    const list = this.objectives();
    if (list.length < 2) return;
    const i = list.findIndex((o) => o.kind === this.focusKind);
    this.game.focus = list[(i + 1) % list.length].kind;
    this.game.audio.play('ui');
    this.refreshQuest();
    this.game.guide.flash();
  }

  refreshQuest() {
    const g = this.game;
    const el = this.el.quest;
    // Un seul objectif à la fois : celui qu'on suit. Les autres attendent derrière « ⇄ ».
    const list = this.objectives();
    const cur = list.find((o) => o.kind === g.focus) || list[0];
    this.focusKind = cur.kind;
    let html = cur.kind === 'story' && cur.head ? cur.head : '';
    // Habitant à voir endormi : on le dit au lieu de laisser un repère seul devant sa porte.
    const sleep = g.guide?.sleepNote;
    html += `<div class="qt-goal qt-${cur.kind}"><span class="qt-em">${cur.em}</span>${escapeHtml(cur.text)}${sleep ? `<span class="qt-sleep"> — 💤 ${escapeHtml(sleep)}</span>` : ''}</div>`;
    if (list.length > 1) {
      const others = list.filter((o) => o !== cur).map((o) => `${o.em} ${o.name}`).join('\n');
      html += `<button class="qt-more" title="Suivre un autre objectif :\n${escapeHtml(others)}">⇄ ${list.length - 1} autre${list.length > 2 ? 's' : ''}</button>`;
    }
    if (el.innerHTML !== html) el.innerHTML = html;
    el.title = `${cur.name} — Journal (${actionKey('journal')})`;
    // La quête avance : l'interface revient un instant (et la quête s'affiche en mode minimal).
    const sig = html.replace(/<[^>]+>/g, '');
    if (this.questSig !== null && sig !== this.questSig) {
      this.wake(4);
      this.peek(el.parentElement, 6);
    }
    if (sig !== this.questSig) this.questSince = this.game.playtime || 0;
    this.questSig = sig;
  }

  refreshSideQuest() {
    this.refreshQuest();
  }

  refreshChallenges() {
    const g = this.game;
    const el = $('#challenge-tracker');
    const list = g.progress.daily.list;
    if (!list.length || !g.features.unlocked('defis')) {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    // Un défi avance : il s'affiche quelques secondes (interface épurée).
    const ids = list.map((c) => c.id).join();
    const sig = `${ids}|${list.map((c) => `${c.progress}:${c.done}`).join()}`;
    if (this.challengeSig && this.challengeSig.split('|')[0] === ids && sig !== this.challengeSig) this.peek(el, 5);
    this.challengeSig = sig;
    const done = list.filter((c) => c.done).length;
    const next = list.find((c) => !c.done);
    const def = next ? g.progress.challengeDef(next.id) : null;
    el.innerHTML = `<span class="ct-count">🎯 ${done}/${list.length}</span>${def ? `<span class="ct-next">${def.emoji} ${escapeHtml(def.label)} ${next.progress}/${def.count}</span>` : '<span class="ct-next">Défis du jour réussis ! 🌟</span>'}`;
  }

  /** Bonus actifs (source chaude…) sous les défis. */
  refreshBuffs() {
    const g = this.game;
    const el = $('#buffs');
    if (!el) return;
    const a = g.archipelago;
    let html = '';
    if (a?.relaxed) {
      const left = Math.max(0, a.relaxUntil - a.now());
      const h = Math.floor(left);
      const m = Math.floor((left - h) * 6) * 10;
      html += `<span class="buff" title="Bain à la source chaude : +20 % d'expérience"><span class="b-em">♨️</span><span class="b-tx"> Bien-être · +20 % XP ·</span> ${h} h ${String(m).padStart(2, '0')}</span>`;
    }
    const f = g.calendar.festival;
    if (f) html += `<span class="buff fest" title="${escapeHtml(`${f.label} — ${f.desc}`)}"><span class="b-em">${f.emoji}</span><span class="b-tx"> ${escapeHtml(f.label)}</span></span>`;
    if (el.innerHTML !== html) el.innerHTML = html;
  }

  refreshName() {
    const g = this.game;
    const el = $('#player-tag');
    el.innerHTML = `<b>${escapeHtml(g.character.appearance.name)}</b> <span class="title-chip">${escapeHtml(g.progress.title)}</span> <span class="stars-chip" title="Étoiles">⭐ ${g.progress.stars}</span>`;
  }

  xpPop(emoji, amount) {
    const box = $('#xp-pops');
    const d = document.createElement('div');
    d.className = 'xp-pop';
    d.textContent = `+${amount} ${emoji}`;
    box.appendChild(d);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => d.remove(), 1600);
  }

  levelBanner(text) {
    const b = $('#level-banner');
    b.textContent = text;
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
    clearTimeout(this.levelTimer);
    this.levelTimer = setTimeout(() => b.classList.remove('show'), 3200);
  }

  /** Bulle de texte au-dessus d'un personnage (position donnée par une fonction). */
  bubble(posFn, text, ms = 2500) {
    ms = readTime(text, ms, 12000);
    const el = document.createElement('div');
    el.className = 'speech';
    el.textContent = text;
    $('#bubbles').appendChild(el);
    const b = { el, posFn: typeof posFn === 'function' ? posFn : () => posFn, t: ms / 1000 };
    this.bubbles.push(b);
    while (this.bubbles.length > 6) this.removeBubble(this.bubbles[0]);
  }

  removeBubble(b) {
    b.el.remove();
    this.bubbles = this.bubbles.filter((x) => x !== b);
  }

  updateBubbles(dt) {
    for (const b of [...this.bubbles]) {
      b.t -= dt;
      if (b.t <= 0) {
        this.removeBubble(b);
        continue;
      }
      _v.copy(b.posFn()).project(this.game.camera);
      // Pendant les scènes (phare, sapin, retrouvailles…), les répliques restent visibles.
      const g = this.game;
      const hidden = _v.z > 1 || (g.busy && !g.inFinale) || g.panel;
      b.el.style.display = hidden ? 'none' : '';
      b.el.style.left = `${Math.round((_v.x * 0.5 + 0.5) * window.innerWidth)}px`;
      b.el.style.top = `${Math.round((-_v.y * 0.5 + 0.5) * window.innerHeight)}px`;
      b.el.style.opacity = Math.min(1, b.t * 3);
    }
  }

  /** Grande carte d'introduction d'un chapitre. */
  chapterCard(chap) {
    const g = this.game;
    const el = $('#chapter');
    el.innerHTML = `<div class="chapter-card"><div class="chap-emoji">${chap.emoji}</div>
      <div class="chap-num">${chap.id === 'epilogue' ? 'Épilogue' : `Chapitre ${chap.n}`}</div><h2>${escapeHtml(chap.title)}</h2>
      <p>${escapeHtml(chap.text)}</p><div class="chap-sparks">${'✨'.repeat(g.quests.sparks)}${'·'.repeat(Math.max(0, 7 - g.quests.sparks))}</div>
      <button class="btn big primary" data-chap-ok>C'est parti !</button></div>`;
    el.classList.remove('hidden');
    g.audio.play('chapter');
    g.input.enabled = false;
    this.chapterOpen = true;
    el.querySelector('[data-chap-ok]').onclick = () => {
      el.classList.add('hidden');
      g.input.enabled = true;
      this.chapterOpen = false;
      const q = g.quests.current;
      if (q) setTimeout(() => this.toast(`📜 ${q.title} — ${q.desc}`, 6000), 300);
      g.guide?.flash();
    };
  }

  /**
   * Carte de fin de chapitre : le phare et ses étincelles, ce qu'on a vécu, les récompenses,
   * la page du carnet qui s'est envolée et le chapitre suivant.
   */
  chapterEnd(chap, next, reward, done) {
    const g = this.game;
    const el = $('#chapter');
    const q = g.quests;
    const page = g.carnet?.pageOfChapter(chap.id);
    const freshPage = page && !g.carnet.found.has(page.n) ? page : null;
    if (freshPage) g.carnet.introduced = true;
    const nextChap = next ? CHAPTERS.find((c) => c.id === next.chapter) : null;
    let meter = '';
    if (chap.n <= 7) {
      const dots = Array.from({ length: 7 }, (_, i) => `<span class="lh-dot${i < q.sparks ? ' on' : ''}${i === q.sparks - 1 ? ' new' : ''}">✦</span>`).join('');
      meter = `<div class="lh-meter"><div class="lh-tower">🗼</div><div class="lh-dots">${dots}</div><div class="lh-label">Étincelles du Cœur : ${q.sparks}/7</div></div>`;
    }
    const rewards = reward ? g.journal.rewardText(reward).split(' · ').map((r) => `<span class="chip-r">${escapeHtml(r)}</span>`).join('') : '';
    el.innerHTML = `<div class="chapter-card chap-end"><div class="chap-num">${chap.id === 'epilogue' ? 'Épilogue' : `Chapitre ${chap.n}`} · terminé</div>
      <h2>${chap.emoji} ${escapeHtml(chap.title)}</h2>${meter}
      ${chap.recap ? `<p class="chap-recap">${escapeHtml(chap.recap)}</p>` : ''}
      ${rewards ? `<div class="chap-rewards">${rewards}</div>` : ''}
      ${freshPage ? `<div class="chap-page"><b>📖 Une page du carnet du gardien s'est envolée !</b><i>« ${escapeHtml(freshPage.riddle)} »</i></div>` : ''}
      ${nextChap && nextChap.id !== chap.id ? `<div class="chap-next">À suivre — ${nextChap.id === 'epilogue' ? '' : `Chapitre ${nextChap.n} : `}${nextChap.emoji} ${escapeHtml(nextChap.title)}</div>` : ''}
      <div class="chap-btns">${freshPage ? '<button class="btn" data-chap-track>🧭 Me guider vers la page</button>' : ''}<button class="btn big primary" data-chap-ok>Continuer</button></div></div>`;
    el.classList.remove('hidden');
    g.audio.play('chapter');
    g.input.enabled = false;
    this.chapterOpen = true;
    const close = () => {
      el.classList.add('hidden');
      g.input.enabled = true;
      this.chapterOpen = false;
      this.refreshQuest();
      done?.();
    };
    el.querySelector('[data-chap-ok]').onclick = close;
    const tr = el.querySelector('[data-chap-track]');
    if (tr) {
      tr.onclick = () => {
        g.carnet.track(freshPage.n);
        close();
        g.guide?.flash();
      };
    }
  }

  refreshAll() {
    this.refreshInventory();
    this.refreshCoins();
    this.refreshQuest();
    this.refreshFollowers();
    this.refreshChallenges();
    this.refreshName();
  }

  refreshFollowers() {
    const list = this.game.animals.followers();
    this.el.followers.innerHTML = list
      .map((a) => `<div class="follower" title="${escapeHtml(a.name)}"><span class="em">${a.sp.emoji}</span><span class="f-name">${escapeHtml(a.name)}</span></div>`)
      .join('');
  }

  // --- Notifications ----------------------------------------------------------

  toast(msg, ms = 3200) {
    ms = readTime(msg, ms, 12000);
    const box = this.el.toasts;
    // Même message déjà affiché : on le prolonge au lieu d'en empiler un second.
    let t = [...box.children].find((x) => x.textContent === msg && !x.classList.contains('out'));
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      t.textContent = msg;
      box.appendChild(t);
      while (box.children.length > 3) box.firstChild.remove();
    }
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 450);
    }, ms);
  }

  // --- Touches affichées ------------------------------------------------------

  /** Met à jour les touches affichées sur les boutons du HUD (après réassignation). */
  refreshKeyHints() {
    document.querySelectorAll('[data-akey]').forEach((el) => {
      el.textContent = actionKey(el.dataset.akey);
      const btn = el.closest('button');
      if (btn?.title) btn.title = btn.title.replace(/\(([^)]*)\)$/, `(${el.textContent})`);
    });
    this.hintsKey = '';
  }

  /** Barre des touches utiles selon la situation. */
  updateKeyHints() {
    const g = this.game;
    const el = $('#keyhints');
    const mode = g.settings.keyHints;
    if (!el || mode === 'never' || mode === false) return;
    // « Au début » : les touches de base les 15 premières minutes, puis seulement celles
    // d'une situation particulière (assis, pêche, véhicule).
    const basics = mode === 'always' || mode === true || (g.playtime || 0) < 900;
    const K = actionKey;
    const move = ['forward', 'left', 'back', 'right'].map(K).join('');
    let list;
    const veh = g.player.vehicle;
    if (g.sitting) list = [[K('interact'), 'Se lever']];
    else if (g.festivals.snow?.fight) list = [[K('interact'), 'Lancer une boule'], [move, 'Esquiver']];
    else if (g.fishing.active) list = g.fishing.state === 'reel' ? [[K('interact'), 'Maintenir : mouliner'], [move, 'Lâcher la ligne']] : [[K('interact'), 'Ferrer / remonter']];
    else if (veh) list = [[move, 'Conduire'], [K('run'), 'Accélérer'], [K('interact'), veh.def.mode === 'air' ? 'Atterrir' : 'Descendre']];
    else if (!basics) list = [];
    else if (g.indoors) list = [[move, 'Marcher'], [K('interact'), 'Interagir'], ...(g.house.inside ? [[K('decor'), 'Décorer']] : []), [K('bag'), 'Sac'], [keyLabel('Escape'), 'Menu']];
    else {
      list = [[move, 'Marcher'], [K('run'), 'Courir'], [K('jump'), 'Sauter'], [K('interact'), 'Interagir']];
      if (Object.keys(g.vehicles.owned || {}).length) list.push([K('vehicle'), 'Véhicule']);
      // Interface épurée : une seule rangée, les autres menus sont dans les menus rapides.
      if (this.hudMode === 'complet') list.push([K('map'), 'Carte'], [K('journal'), 'Journal'], ['1-5', 'Émotes'], [keyLabel('Escape'), 'Menu']);
      else list.push([K('menu'), 'Menus']);
    }
    const key = JSON.stringify(list);
    if (key === this.hintsKey) return;
    this.hintsKey = key;
    el.innerHTML = list.map(([k, l]) => `<span class="kh"><span class="key">${escapeHtml(k)}</span>${escapeHtml(l)}</span>`).join('');
  }

  /** Aide : les commandes, avec les touches choisies par le joueur. */
  renderHelp() {
    const K = (id) => `<kbd>${escapeHtml(actionKey(id))}</kbd>`;
    const rows = [
      [`${K('forward')}${K('left')}${K('back')}${K('right')} / flèches`, 'Se déplacer'],
      [`${K('run')} · ${K('jump')}`, 'Courir (ça effraie les animaux timides !) · sauter'],
      ['Glisser la souris ou deux doigts de côté sur le pavé tactile · molette ou deux doigts vers le haut / le bas', 'Tourner la caméra (elle suit aussi toute seule quand tu marches) · zoomer'],
      [K('interact'), 'Parler · caresser · cueillir · planter/arroser · pêcher · entrer · s\'asseoir · voyager'],
      [K('feed'), 'Donner à manger · changer de semis · faire un vœu sous une étoile filante 🌠'],
      [K('adopt'), 'Adopter (cœurs pleins) · « suis-moi » / « attends au jardin »'],
      [K('play'), 'Jouer avec un animal (plumeau du Café des Chats)'],
      ['<kbd>1</kbd>…<kbd>5</kbd>', 'Émotes : salut, danse, s\'asseoir, bisou, applaudir'],
      [K('vehicle'), 'Véhicules : monter / descendre (achetés au garage de Léo)'],
      [`${K('hint')} · 💡`, '« Que faire ? » : un indice pour la quête en cours'],
      [K('decor'), 'Décorer (chez toi ou dans ton jardin)'],
      [`${K('creator')} ${K('pets')} ${K('journal')} ${K('bag')} ${K('map')} ${K('photo')}`, 'Tenue · animaux · journal · sac · carte · photo'],
      [`${K('menu')} · ☰`, 'Menus rapides (sous la mini-carte) · un clic sur l\'horloge : le programme du jour'],
      ['<kbd>Échap</kbd>', 'Menu pause : paramètres, sauvegarde, profils'],
      [`<kbd>${escapeHtml(keyLabel('F3'))}</kbd> · <kbd>F11</kbd>`, 'Compteur FPS · plein écran'],
      ['🎮 Manette', 'Stick gauche : bouger · stick droit : caméra · A : interagir · X : nourrir · Y : sauter · Start : menu'],
    ];
    $('#help-grid').innerHTML = rows.map(([k, l]) => `<div>${k}</div><div>${l}</div>`).join('');
  }

  wishPrompt(on) {
    const el = $('#wish');
    if (!el) return;
    el.querySelector('[data-akey]').textContent = isTouchUI() ? TOUCH_ICONS.KeyF : actionKey('feed');
    el.classList.toggle('hidden', !on);
  }

  setZoneLabel(zone) {
    this.el.zone.textContent = zone ? `${zone.emoji} ${zone.name}` : '🏝️ Île de Doucebrise';
  }

  zoneBanner(zone) {
    if (this.game.settings.zoneBanner === false) {
      this.el.zone.textContent = `${zone.emoji} ${zone.name}`;
      return;
    }
    const b = this.el.banner;
    b.textContent = `${zone.emoji} ${zone.name}`;
    b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.remove('show'), 2600);
    this.el.zone.textContent = `${zone.emoji} ${zone.name}`;
  }

  // --- Bulle d'interaction ---------------------------------------------------

  /**
   * @param {null | {pos: THREE.Vector3, title: string, sub?: string, hearts?: number, actions: {key:string,label:string,dim?:boolean}[]}} target
   */
  setPrompt(target) {
    const el = this.el.prompt;
    this.promptFeed = !!target?.actions?.some((a) => a.key === 'F' && !a.dim);
    if (!target) {
      el.classList.add('hidden');
      this.promptKey = '';
      return;
    }
    const touch = isTouchUI();
    // Bulle courte (habitants, animaux pas désignés) : juste la touche et l'action principale.
    const brief = !!target.brief;
    const key = JSON.stringify([target.title, target.sub, target.hearts, target.actions, touch, brief]);
    if (key !== this.promptKey) {
      this.promptKey = key;
      el.classList.toggle('brief', brief);
      el.innerHTML = brief ? this.briefHtml(target, touch) : this.cardHtml(target, touch);
    }
    this.place(el, target.pos);
  }

  /**
   * Touche + action principale, précédées de l'emoji du titre (« 🐱 E Caresser »), et les
   * actions marquées `brief` (« F Nourrir » quand on a de quoi).
   */
  briefHtml(target, touch) {
    const a = target.actions[0];
    const emoji = (target.title || '').split(' ')[0];
    const more = target.actions.slice(1).filter((x) => x.brief).map((x) => `<span class="b-more">${this.keyHtml(x.key, touch)}${escapeHtml(x.short || x.label)}</span>`).join('');
    return `<div class="act">${emoji ? `<span class="b-em">${emoji}</span>` : ''}${a ? `${this.keyHtml(a.key, touch)}${escapeHtml(a.label)}` : ''}${more}</div>`;
  }

  cardHtml(target, touch, note = '') {
    let html = `<div class="p-title">${escapeHtml(target.title)}</div>`;
    if (target.sub) html += `<div class="p-sub">${escapeHtml(target.sub)}</div>`;
    if (target.hearts !== undefined) html += `<div class="hearts">${heartsString(target.hearts)}</div>`;
    if (target.actions?.length) {
      html += '<div class="actions">';
      for (const a of target.actions) html += `<div class="act${a.dim ? ' dim' : ''}">${this.keyHtml(a.key, touch)}${escapeHtml(a.label)}</div>`;
      html += '</div>';
    }
    if (note) html += `<div class="p-note">${escapeHtml(note)}</div>`;
    return html;
  }

  keyHtml(code, touch) {
    if (!touch) return `<span class="key">${escapeHtml(promptKey(code))}</span>`;
    const icon = touchIcon(code);
    return icon ? `<span class="key touch-icon">${icon}</span>` : '';
  }

  /** Place une bulle au-dessus d'un point de la scène (cachée s'il est derrière la caméra). */
  place(el, pos) {
    _v.copy(pos).project(this.game.camera);
    if (_v.z > 1) {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    el.style.left = `${Math.round((_v.x * 0.5 + 0.5) * window.innerWidth)}px`;
    el.style.top = `${Math.round((-_v.y * 0.5 + 0.5) * window.innerHeight - 10)}px`;
  }

  /** Fiche d'un habitant ou d'un animal désigné d'un clic, quand on n'est pas à côté. */
  setPickCard(card) {
    const el = this.el.pickCard;
    if (!card) {
      el.classList.add('hidden');
      this.pickKey = '';
      return;
    }
    const key = JSON.stringify([card.title, card.sub, card.hearts]);
    if (key !== this.pickKey) {
      this.pickKey = key;
      el.innerHTML = this.cardHtml({ ...card, actions: [] }, false, 'Approche-toi pour interagir');
    }
    this.place(el, card.pos);
  }

  // --- HUD par frame ---------------------------------------------------------

  update(dt) {
    const sky = this.game.world.sky;
    const h = sky.hour;
    const w = this.game.world.weather;
    this.el.clockTime.textContent = sky.timeLabel();
    this.el.clockDay.textContent = `${w.season.emoji} ${w.season.label} · jour ${sky.day}`;
    const night = h < 5.5 || h >= 20.5;
    let icon = night ? '🌙' : h < 7.5 ? '🌅' : h >= 18.5 ? '🌇' : '☀️';
    if (w.current !== 'clair') icon = night ? w.info.night : w.info.emoji;
    this.el.clockIcon.textContent = icon;
    this.el.clockIcon.title = `${w.info.label} · Demain : ${w.forecast?.() || ''}`;
    this.updateBubbles(dt);
    this.updateHud(dt);
    this.hintT = (this.hintT || 0) - dt;
    if (this.hintT <= 0) {
      this.hintT = 0.25;
      this.updateKeyHints();
    }
    this.mapT -= dt;
    if (this.mapT <= 0) {
      this.mapT = 0.15;
      this.drawMinimap();
      if (this.openPanel === 'map') this.drawBigMap();
    }
  }

  drawMinimap() {
    const c = this.el.minimap;
    const ctx = c.getContext('2d');
    const size = c.width;
    // Dans la maison, la carte reste centrée sur le jardin.
    const p = this.game.indoors ? this.game.indoorAnchor() : this.game.player.pos;
    const range = 46; // unités visibles de part et d'autre
    const img = this.mapImage;
    const scale = img.width / (MAP_RANGE * 2);
    ctx.save();
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#6fc6e2';
    ctx.fillRect(0, 0, size, size);
    const sx = (p.x - range + MAP_RANGE) * scale;
    const sy = (p.z - range + MAP_RANGE) * scale;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, sx, sy, range * 2 * scale, range * 2 * scale, 0, 0, size, size);
    const toMap = (x, z) => [((x - p.x + range) / (range * 2)) * size, ((z - p.z + range) / (range * 2)) * size];
    this.drawMarkers(ctx, toMap, 1);
    ctx.restore();
  }

  /** Grande carte : zoom à la molette, déplacement à la souris ou au doigt. */
  initBigMap() {
    const c = this.el.bigmap;
    const v = this.mapView;
    const clampView = () => {
      v.half = Math.min(MAP_RANGE, Math.max(30, v.half));
      const m = MAP_RANGE - v.half;
      v.cx = Math.min(m, Math.max(-m, v.cx));
      v.cz = Math.min(m, Math.max(-m, v.cz));
      this.drawBigMap();
    };
    const zoom = (f, mx = 0.5, my = 0.5) => {
      // Zoom autour du point visé.
      const wx = v.cx + (mx - 0.5) * 2 * v.half;
      const wz = v.cz + (my - 0.5) * 2 * v.half;
      v.half *= f;
      v.half = Math.min(MAP_RANGE, Math.max(30, v.half));
      v.cx = wx - (mx - 0.5) * 2 * v.half;
      v.cz = wz - (my - 0.5) * 2 * v.half;
      clampView();
    };
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = c.getBoundingClientRect();
      zoom(e.deltaY > 0 ? 1.18 : 1 / 1.18, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    }, { passive: false });
    let drag = null;
    // Doigts posés sur la carte : un doigt la déplace, deux la zooment (pincer / écarter).
    const pts = new Map();
    let pinch = 0;
    c.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      drag = pts.size === 1 ? { x: e.clientX, y: e.clientY } : null;
      pinch = 0;
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2) {
        const [p, q] = [...pts.values()];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        const r = c.getBoundingClientRect();
        if (pinch && d > 0) zoom(pinch / d, ((p.x + q.x) / 2 - r.left) / r.width, ((p.y + q.y) / 2 - r.top) / r.height);
        pinch = d;
        return;
      }
      if (!drag) return;
      const r = c.getBoundingClientRect();
      v.cx -= ((e.clientX - drag.x) / r.width) * 2 * v.half;
      v.cz -= ((e.clientY - drag.y) / r.height) * 2 * v.half;
      drag = { x: e.clientX, y: e.clientY };
      clampView();
    });
    const end = (e) => {
      pts.delete(e.pointerId);
      pinch = 0;
      const rest = [...pts.values()][0];
      drag = rest ? { x: rest.x, y: rest.y } : null;
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    document.querySelectorAll('[data-mapzoom]').forEach((b) => {
      b.addEventListener('click', () => zoom(Number(b.dataset.mapzoom) > 0 ? 1.4 : 1 / 1.4));
    });
    document.querySelector('[data-mapcenter]')?.addEventListener('click', () => {
      this.centerBigMap();
      clampView();
    });
  }

  centerBigMap(half) {
    const p = this.game.indoors ? this.game.indoorAnchor() : this.game.player.pos;
    this.mapView.cx = p.x;
    this.mapView.cz = p.z;
    if (half) this.mapView.half = half;
    const m = MAP_RANGE - this.mapView.half;
    this.mapView.cx = Math.min(m, Math.max(-m, this.mapView.cx));
    this.mapView.cz = Math.min(m, Math.max(-m, this.mapView.cz));
  }

  drawBigMap() {
    const c = this.el.bigmap;
    const ctx = c.getContext('2d');
    const size = c.width;
    const v = this.mapView;
    const img = this.mapImage;
    const scale = img.width / (MAP_RANGE * 2);
    ctx.fillStyle = '#6fc6e2';
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, (v.cx - v.half + MAP_RANGE) * scale, (v.cz - v.half + MAP_RANGE) * scale, v.half * 2 * scale, v.half * 2 * scale, 0, 0, size, size);
    const toMap = (x, z) => [((x - v.cx + v.half) / (v.half * 2)) * size, ((z - v.cz + v.half) / (v.half * 2)) * size];
    const zoomK = MAP_RANGE / v.half;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const z of ZONES) {
      // Grands noms d'île de loin, lieux détaillés de près.
      const big = z.r >= 70;
      if (big ? v.half < 130 : v.half > 200 && z.r < 20) continue;
      const [x, y] = toMap(z.x, z.z);
      if (x < -60 || y < -20 || x > size + 60 || y > size + 20) continue;
      const fs = big ? 20 : Math.round(Math.min(17, 11 + zoomK * 1.2));
      ctx.font = `${big ? 900 : 800} ${fs}px Nunito, sans-serif`;
      const ly = big ? y - z.r * (size / (v.half * 2)) * 0.55 : y;
      ctx.lineWidth = big ? 5 : 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.fillStyle = big ? '#3f6d8f' : '#5b4636';
      const label = `${z.emoji} ${z.name}`;
      ctx.strokeText(label, x, ly);
      ctx.fillText(label, x, ly);
    }
    this.drawMarkers(ctx, toMap, Math.min(1.7, 1 + zoomK * 0.12));
  }

  drawMarkers(ctx, toMap, k) {
    const g = this.game;
    const v = g.world.village;
    // Maison et lieux utiles.
    const home = v.houses[0];
    const [hx, hy] = toMap(home.x, home.z);
    ctx.font = `${Math.round(16 * k)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏠', hx, hy);
    ctx.font = `${Math.round(12 * k)}px sans-serif`;
    const S = v.shopSpots;
    const places = [[S.cafe, '☕'], [S.garage, '🔧'], [v.jobBoard, '📋'], [S.marche, '🧺'], [S.menuiserie, '🪚'], [S.graines, '🌱'], [S.couture, '👗'],
      [S.patisserie, '🥐'], [S.atelier, '🪵'], [S.capitainerie, '⚓'], [S.galerie, '🖼️'], [S.plongee, '🤿'], [S.paillote, '🍹']];
    const isl = g.world.islands;
    for (const t of isl.travelPoints) places.push([t, '🧭']);
    if (isl.spring) places.push([isl.spring, '♨️']);
    if (isl.telescope) places.push([isl.telescope, '🔭']);
    if (isl.bandstand) places.push([isl.bandstand, '🎼']);
    if (g.sled) places.push([g.sled.startSign, '🛷']);
    // Muséum et aquarium : devant leur porte.
    for (const id of ['musee', 'aquarium']) {
      const pl = PLACES[id];
      const hi = g.visits.houseOf(pl);
      if (hi >= 0) places.push([v.doorFront(hi, 1.6), pl.emoji]);
    }
    // Pages du carnet libérées, pas encore trouvées.
    for (const pg of g.carnet?.available() || []) {
      const sp = g.carnet.spotOf(pg);
      if (sp) places.push([sp, '📖']);
    }
    for (const [pl, em] of places) {
      if (!pl) continue;
      const [px, py] = toMap(pl.x, pl.z);
      ctx.fillText(em, px, py);
    }
    // Objectifs du guide.
    for (const m of g.guide?.mapMarkers() || []) {
      const [mx, my] = toMap(m.x, m.z);
      const col = m.kind === 'job' ? '#5bb6ff' : m.kind === 'side' ? '#c58cff' : m.kind === 'page' ? '#ffb38a' : '#ffcf3a';
      if (m.area) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(mx, my, 14 * k, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.save();
      ctx.translate(mx, my);
      const r = (8 + Math.sin(g.elapsed * 5) * 1.2) * k;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * 0.45 : r;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // Animaux adoptés.
    for (const a of g.animals.companions()) {
      const [ax, ay] = toMap(a.pos.x, a.pos.z);
      ctx.fillStyle = '#ff8fab';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ax, ay, 4.5 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Joueur : flèche orientée.
    const p = g.player;
    const pp = g.indoors ? g.indoorAnchor() : p.pos;
    const [px, py] = toMap(pp.x, pp.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-p.rotY + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#5b4636';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -9 * k);
    ctx.lineTo(7 * k, 7 * k);
    ctx.lineTo(0, 3 * k);
    ctx.lineTo(-7 * k, 7 * k);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // --- Dialogue de nom ------------------------------------------------------

  askName({ title, text, value = '', suggestions = [] }) {
    return new Promise((resolve) => {
      const d = this.el.dialog;
      $('#dialog-title').textContent = title;
      $('#dialog-text').textContent = text;
      const input = $('#dialog-input');
      input.value = value;
      const chips = $('#dialog-chips');
      chips.innerHTML = '';
      for (const s of suggestions) {
        const b = document.createElement('button');
        b.className = 'chip';
        b.textContent = s;
        b.onclick = () => {
          input.value = s;
        };
        chips.appendChild(b);
      }
      d.classList.remove('hidden');
      this.game.input.enabled = false;
      setTimeout(() => input.focus(), 50);
      const done = (val) => {
        d.classList.add('hidden');
        this.game.input.enabled = true;
        $('#dialog-ok').onclick = null;
        $('#dialog-cancel').onclick = null;
        input.onkeydown = null;
        resolve(val);
      };
      $('#dialog-ok').onclick = () => done(input.value.trim() || value || suggestions[0] || '');
      $('#dialog-cancel').onclick = () => done(null);
      input.onkeydown = (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') done(input.value.trim() || value || suggestions[0] || '');
        if (e.key === 'Escape') done(null);
      };
    });
  }

  // --- Tactile ---------------------------------------------------------------

  setupTouch() {
    const input = this.game.input;
    const joy = $('#joystick');
    const stick = joy.querySelector('.stick');
    let id = null;
    const move = (t) => {
      const r = joy.getBoundingClientRect();
      let x = (t.clientX - (r.left + r.width / 2)) / (r.width / 2);
      let y = (t.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const len = Math.hypot(x, y);
      if (len > 1) {
        x /= len;
        y /= len;
      }
      input.joystick.x = x;
      input.joystick.y = -y;
      input.joystick.active = true;
      stick.style.transform = `translate(${x * 36}px, ${y * 36}px)`;
    };
    joy.addEventListener('touchstart', (e) => {
      id = e.changedTouches[0].identifier;
      move(e.changedTouches[0]);
      e.preventDefault();
    }, { passive: false });
    joy.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) if (t.identifier === id) move(t);
      e.preventDefault();
    }, { passive: false });
    const end = () => {
      id = null;
      input.joystick.active = false;
      input.joystick.x = 0;
      input.joystick.y = 0;
      stick.style.transform = '';
    };
    joy.addEventListener('touchend', end);
    joy.addEventListener('touchcancel', end);
    document.querySelectorAll('.tbtn').forEach((b) => {
      b.addEventListener('touchstart', (e) => {
        input.tap(b.dataset.key);
        e.preventDefault();
      }, { passive: false });
      b.addEventListener('click', () => input.tap(b.dataset.key));
    });
  }
}

export function heartsString(trust) {
  const full = Math.floor(trust / 20);
  const half = trust % 20 >= 10 ? 1 : 0;
  let s = '';
  for (let i = 0; i < 5; i++) s += i < full ? '💗' : i === full && half ? '💓' : '🤍';
  return s;
}

/** Temps pour lire un texte tranquillement (au moins `min` ms) : ~15 caractères par seconde. */
export function readTime(text, min = 2500, max = 14000) {
  const n = String(text || '').replace(/<[^>]+>/g, '').length;
  return Math.min(max, Math.max(min, 1800 + n * 65));
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export { SPECIES };
