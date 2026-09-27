import { PRESETS, GRAPHICS_OPTIONS, ACTIONS, FPS_LIMITS, DAY_SPEEDS, matchPreset, saveSettings, defaultSettings } from '../core/settings.js';
import { keyLabel, bindingOf, actionKey } from '../core/input.js';
import { slotSummaries, getSlot, setSlot, clearSave, exportSave, importSave } from '../core/save.js';
import { SEASONS } from '../world/weather.js';
import { escapeHtml } from './ui.js';
import { VERSION, checkForUpdate } from '../core/updates.js';
import { MUSIC_MOODS } from '../core/music.js';

// Menus : écran titre (3 profils), menu pause (Échap), paramètres complets
// (graphismes, affichage, contrôles, audio, jeu) et crédits.

const isDesktop = () => !!window.desktop?.isDesktop;

export function formatPlaytime(sec) {
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  return h ? `${h} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
}

function ago(ts) {
  if (!ts) return '';
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'à l\'instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

/** Redémarre le jeu sur un profil (rechargement propre). */
export function restartOn(slot, action) {
  setSlot(slot);
  try {
    if (action) sessionStorage.setItem('doucebrise-autostart', action);
  } catch {
    /* stockage indisponible */
  }
  window.location.reload();
}

export function toggleFullscreen(on) {
  if (isDesktop()) {
    window.desktop.setFullscreen(on);
    return;
  }
  if (on && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  else if (!on && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}

// --- Écran titre ------------------------------------------------------------------

export class TitleMenu {
  constructor(game) {
    this.game = game;
    this.el = document.querySelector('#title');
    this.view = 'main';
    this.confirm = null;
    this.update = null;
    // Application de bureau : une nouvelle version est-elle publiée ?
    if (isDesktop() && game.settings.checkUpdates !== false) {
      checkForUpdate().then((u) => {
        this.update = u;
        if (u && this.view === 'main' && game.state === 'title') this.render();
      });
    }
  }

  render() {
    const g = this.game;
    const card = this.el.querySelector('.title-card');
    const slots = slotSummaries();
    const active = slots.find((s) => s.slot === getSlot());
    if (this.view === 'main') {
      const cont = active && !active.empty
        ? `<button id="btn-continue" class="btn big primary title-main"><span>▶ Continuer</span><small>${escapeHtml(active.name)} · ${SEASONS[active.season].emoji} jour ${active.day} · profil ${active.slot}</small></button>`
        : '<button id="btn-continue" class="btn big primary hidden">Continuer</button>';
      card.innerHTML = `<div class="logo">Doucebrise</div>
        <p class="tagline">L'archipel des cœurs doux · animaux, amitiés et aventures</p>
        <div class="title-buttons">
          ${cont}
          <button id="btn-new" class="btn big${active && !active.empty ? '' : ' primary'}">✨ Nouvelle partie</button>
          <button id="btn-profiles" class="btn">👥 Profils</button>
          <div class="title-row">
            <button id="btn-title-settings" class="btn">⚙️ Paramètres</button>
            <button id="btn-credits" class="btn">📜 Crédits</button>
            ${isDesktop() ? '<button id="btn-quit" class="btn">🚪 Quitter</button>' : ''}
          </div>
        </div>
        ${this.update ? `<a class="update-link" href="${escapeHtml(this.update.url)}" target="_blank" rel="noopener">✨ La version ${escapeHtml(this.update.version)} est disponible — la télécharger</a>` : ''}
        <p class="hint">Clavier + souris ou manette · Sauvegarde automatique · v${VERSION}</p>`;
      card.querySelector('#btn-continue').onclick = () => g.continueGame();
      card.querySelector('#btn-new').onclick = () => {
        if (!active || active.empty) g.newGame();
        else {
          this.view = 'profiles';
          this.mode = 'new';
          this.render();
        }
      };
      card.querySelector('#btn-profiles').onclick = () => {
        this.view = 'profiles';
        this.mode = 'load';
        this.render();
      };
      card.querySelector('#btn-title-settings').onclick = () => g.openPanel('settings');
      card.querySelector('#btn-credits').onclick = () => g.openPanel('credits');
      card.querySelector('#btn-quit')?.addEventListener('click', () => window.desktop.quit());
      return;
    }
    // Choix du profil.
    const rows = slots.map((s) => {
      const isActive = s.slot === getSlot();
      if (s.empty) {
        return `<div class="pslot empty"><div class="ps-head"><b>Profil ${s.slot}</b><span class="ps-tag">vide</span></div>
          <div class="ps-actions"><button class="btn small primary" data-new="${s.slot}">✨ Nouvelle partie</button>
          <label class="btn small">📥 Importer<input type="file" accept=".json,application/json" data-import="${s.slot}" hidden /></label></div></div>`;
      }
      const confirmNew = this.confirm === `new-${s.slot}`;
      const confirmDel = this.confirm === `del-${s.slot}`;
      return `<div class="pslot${isActive ? ' active' : ''}"><div class="ps-head"><b>Profil ${s.slot} · ${escapeHtml(s.name)}</b>${s.title ? `<span class="ps-tag">${escapeHtml(s.title)}</span>` : ''}</div>
        <div class="ps-info">${SEASONS[s.season].emoji} ${SEASONS[s.season].label} · jour ${s.day} · 🪙 ${s.coins} · ⏱️ ${formatPlaytime(s.playtime)}<br><small>Sauvegardé ${ago(s.savedAt)}</small></div>
        <div class="ps-actions">
          ${this.mode === 'new'
            ? `<button class="btn small${confirmNew ? ' danger' : ''}" data-new="${s.slot}">${confirmNew ? '⚠️ Écraser ? Confirmer' : '✨ Recommencer ici'}</button>`
            : `<button class="btn small primary" data-play="${s.slot}">▶ Jouer</button>`}
          <button class="btn small" data-export="${s.slot}" title="Exporter la sauvegarde">📤</button>
          <button class="btn small${confirmDel ? ' danger' : ''}" data-del="${s.slot}" title="Supprimer">${confirmDel ? 'Supprimer ?' : '🗑️'}</button>
        </div></div>`;
    }).join('');
    card.innerHTML = `<div class="logo small">Doucebrise</div>
      <h2 class="title-sub">${this.mode === 'new' ? '✨ Où commencer ta nouvelle partie ?' : '👥 Choisis ton profil'}</h2>
      <div class="pslots">${rows}</div>
      <button class="btn" data-back>← Retour</button>`;
    card.querySelector('[data-back]').onclick = () => {
      this.view = 'main';
      this.confirm = null;
      this.render();
    };
    card.querySelectorAll('[data-play]').forEach((b) => {
      b.onclick = () => {
        const slot = +b.dataset.play;
        if (slot === getSlot() && g.save) g.continueGame();
        else restartOn(slot, 'continue');
      };
    });
    card.querySelectorAll('[data-new]').forEach((b) => {
      b.onclick = () => {
        const slot = +b.dataset.new;
        const s = slots.find((x) => x.slot === slot);
        if (!s.empty && this.confirm !== `new-${slot}`) {
          this.confirm = `new-${slot}`;
          this.render();
          return;
        }
        if (s.empty && slot === getSlot() && !g.save) {
          g.newGame();
          return;
        }
        clearSave(slot);
        restartOn(slot, 'new');
      };
    });
    card.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = () => {
        const slot = +b.dataset.del;
        if (this.confirm !== `del-${slot}`) {
          this.confirm = `del-${slot}`;
          this.render();
          return;
        }
        clearSave(slot);
        this.confirm = null;
        if (slot === getSlot() && g.save) restartOn(slot, null);
        else this.render();
      };
    });
    card.querySelectorAll('[data-export]').forEach((b) => {
      b.onclick = () => downloadSave(+b.dataset.export);
    });
    card.querySelectorAll('[data-import]').forEach((inp) => {
      inp.onchange = async () => {
        const f = inp.files?.[0];
        if (!f) return;
        try {
          importSave(await f.text(), +inp.dataset.import);
          g.ui.toast('📥 Sauvegarde importée !', 2500);
        } catch (e) {
          g.ui.toast(`⚠️ ${e.message}`, 3500);
        }
        this.render();
      };
    });
  }
}

export function downloadSave(slot) {
  const text = exportSave(slot);
  if (!text) return;
  const name = (() => {
    try {
      return JSON.parse(text).save.appearance?.name || 'profil';
    } catch {
      return 'profil';
    }
  })();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = `doucebrise-profil${slot}-${name}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

// --- Menu pause --------------------------------------------------------------------------

export class PauseMenu {
  constructor(game) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.id = 'pause';
    this.el.className = 'modal hidden pause';
    document.body.appendChild(this.el);
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) game.closePanels();
    });
  }

  render() {
    const g = this.game;
    const a = g.character.appearance;
    const w = g.world.weather;
    this.el.innerHTML = `<div class="modal-card small pause-card">
      <div class="pause-head"><div class="logo small">Doucebrise</div>
        <div class="pause-who"><b>${escapeHtml(a.name)}</b> · ${escapeHtml(g.progress.title)}<br>
        <small>Profil ${getSlot()} · ${w.season.emoji} ${w.season.label}, jour ${g.world.sky.day} · ⏱️ ${formatPlaytime(g.playtime || 0)}</small></div></div>
      <div class="pause-buttons">
        <button class="btn big primary" data-p="resume">▶ Reprendre</button>
        <button class="btn" data-p="settings">⚙️ Paramètres</button>
        <button class="btn" data-p="help">❓ Commandes et aide</button>
        <button class="btn" data-p="save">💾 Sauvegarder</button>
        <button class="btn" data-p="title">🏠 Écran titre / profils</button>
        ${isDesktop() ? '<button class="btn" data-p="quit">🚪 Quitter le jeu</button>' : ''}
      </div></div>`;
    this.el.querySelectorAll('[data-p]').forEach((b) => {
      b.onclick = () => {
        g.audio.play('ui');
        switch (b.dataset.p) {
          case 'resume':
            g.closePanels();
            break;
          case 'settings':
            g.openPanel('settings');
            break;
          case 'help':
            g.openPanel('help');
            break;
          case 'save':
            g.saveNow();
            g.ui.toast('💾 Partie sauvegardée !', 2000);
            break;
          case 'title':
            g.saveNow();
            restartOn(getSlot(), null);
            break;
          case 'quit':
            g.saveNow();
            window.desktop.quit();
            break;
          default:
            break;
        }
      };
    });
  }
}

// --- Paramètres ----------------------------------------------------------------------------

const TABS = [
  ['graphismes', '🎨 Graphismes'],
  ['affichage', '🖥️ Affichage'],
  ['controles', '🎮 Contrôles'],
  ['audio', '🔊 Audio'],
  ['jeu', '🏝️ Jeu'],
];

export class SettingsPanel {
  constructor(game) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.id = 'settings';
    this.el.className = 'modal hidden';
    document.body.appendChild(this.el);
    this.tab = 'graphismes';
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) game.closePanels();
    });
  }

  get s() {
    return this.game.settings;
  }

  apply() {
    this.game.applySettings();
  }

  render() {
    const g = this.game;
    // La fenêtre n'est construite qu'une fois : ensuite on ne redessine que le contenu
    // (pas d'animation d'ouverture rejouée à chaque clic).
    if (!this.body || !this.el.contains(this.body)) {
      this.el.innerHTML = `<div class="modal-card settings-card"><button class="close" data-close>✕</button>
        <h2>⚙️ Paramètres</h2>
        <div class="settings-layout"><nav class="settings-tabs">${TABS.map(([id, l]) => `<button class="stab" data-tab="${id}">${l}</button>`).join('')}</nav>
        <div class="settings-body"></div></div></div>`;
      this.body = this.el.querySelector('.settings-body');
      this.el.querySelector('[data-close]').onclick = () => g.closePanels();
      this.el.querySelectorAll('[data-tab]').forEach((b) => {
        b.onclick = () => {
          this.tab = b.dataset.tab;
          this.listening = null;
          g.input.listening = null;
          this.render();
          this.body.scrollTop = 0;
        };
      });
    }
    this.el.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === this.tab));
    const scroll = this.body.scrollTop;
    this.body.innerHTML = this[this.tab]();
    this.body.scrollTop = scroll;
    this.bind();
  }

  /** À l'ouverture : on rejoue l'animation de la fenêtre. */
  open() {
    this.body = null;
    this.confirmReset = false;
    this.render();
  }

  // Petits composants.
  row(label, control, note = '') {
    return `<div class="srow"><div class="slabel">${label}${note ? `<small>${note}</small>` : ''}</div><div class="sctl">${control}</div></div>`;
  }

  chips(path, choices, value) {
    return `<div class="chips">${choices.map(([v, l]) => `<button class="chip${String(v) === String(value) ? ' active' : ''}" data-set="${path}" data-val="${v}">${l}</button>`).join('')}</div>`;
  }

  toggle(path, value) {
    return `<label class="switch"><input type="checkbox" data-set="${path}" ${value ? 'checked' : ''}/><span></span></label>`;
  }

  range(path, value, min, max, step, text) {
    return `<div class="range-row"><input type="range" class="range" data-set="${path}" min="${min}" max="${max}" step="${step}" value="${value}"/><span class="rval">${text}</span></div>`;
  }

  graphismes() {
    const s = this.s;
    const gs = s.graphics;
    let html = `<div class="presets">${Object.entries(PRESETS).map(([id, p]) => `<button class="preset${s.preset === id ? ' active' : ''}" data-preset="${id}"><b>${p.label}</b><small>${p.desc}</small></button>`).join('')}
      <button class="preset${s.preset === 'perso' ? ' active' : ''}" disabled><b>Perso</b><small>Réglages sur mesure</small></button></div>`;
    for (const [k, o] of Object.entries(GRAPHICS_OPTIONS)) {
      const v = gs[k];
      let ctl;
      if (o.type === 'choice') ctl = this.chips(`graphics.${k}`, o.choices, v);
      else if (o.type === 'toggle') ctl = this.toggle(`graphics.${k}`, v);
      else ctl = this.range(`graphics.${k}`, v, o.min, o.max, o.step, o.fmt(v));
      html += this.row(o.label, ctl);
    }
    html += '<p class="note">Astuce : F3 affiche le compteur d\'images par seconde. Si le jeu saccade, baisse d\'abord les ombres, la distance d\'affichage et la résolution de rendu.</p>';
    return html;
  }

  affichage() {
    const s = this.s;
    const fs = isDesktop() ? !!this.game.fullscreen : !!document.fullscreenElement;
    return [
      this.row('Plein écran', this.toggle('fullscreen', fs), isDesktop() ? '' : 'F11 fonctionne aussi'),
      this.row('Compteur FPS', this.chips('showFps', [['off', 'Masqué'], ['fps', 'Simple'], ['detail', 'Détaillé']], s.showFps), `Touche ${keyLabel('F3')}`),
      this.row('Limite d\'images par seconde', this.chips('fpsLimit', FPS_LIMITS, s.fpsLimit)),
      this.row('Champ de vision', this.range('fov', s.fov, 38, 75, 1, `${s.fov}°`)),
      this.row('Taille de l\'interface', this.range('uiScale', s.uiScale, 0.75, 1.35, 0.05, `${Math.round(s.uiScale * 100)} %`)),
      this.row('Aide des touches (en bas)', this.toggle('keyHints', s.keyHints)),
      this.row('Mini-carte', this.toggle('minimap', s.minimap)),
      this.row('Flèche du guide', this.toggle('guideArrow', s.guideArrow)),
      this.row('Nom des lieux à l\'écran', this.toggle('zoneBanner', s.zoneBanner)),
    ].join('');
  }

  controles() {
    const s = this.s;
    let html = [
      this.row('Sensibilité de la caméra', this.range('camSensitivity', s.camSensitivity, 0.3, 2.5, 0.05, `×${(+s.camSensitivity).toFixed(2)}`)),
      this.row('Inverser l\'axe vertical', this.toggle('invertY', s.invertY)),
      this.row('Caméra qui suit en marchant', this.toggle('camAuto', s.camAuto)),
    ].join('');
    let group = '';
    html += '<div class="keys">';
    for (const a of ACTIONS) {
      if (a.group !== group) {
        group = a.group;
        html += `<div class="field-title">${group}</div>`;
      }
      const listening = this.listening === a.id;
      const custom = !!s.keys[a.id];
      html += `<div class="krow"><span>${a.label}</span><button class="keybtn${listening ? ' listening' : ''}${custom ? ' custom' : ''}" data-rebind="${a.id}">${listening ? 'Appuie sur une touche…' : escapeHtml(keyLabel(bindingOf(a.id)))}</button></div>`;
    }
    html += `</div><div class="srow"><div class="slabel">Autres touches<small>1 à 5 : émotes · Échap : menu · molette : zoom · clic-glisser : caméra</small></div>
      <div class="sctl"><button class="btn small" data-resetkeys>↺ Touches par défaut</button></div></div>
      <div class="field-title">🎮 Manette</div>
      <p class="note">Stick gauche : se déplacer · stick droit : caméra · A : interagir · X : nourrir / vœu · Y : sauter · B / Start : retour / menu · LB : carte · RB : journal · Select : sac · gâchette gauche : courir · croix : émotes.</p>`;
    return html;
  }

  audio() {
    const a = this.s.audio;
    const pct = (v) => `${Math.round(v * 100)} %`;
    return [
      this.row('Volume général', this.range('audio.master', a.master, 0, 1, 0.05, pct(a.master))),
      this.row('Musique', this.range('audio.music', a.music, 0, 1, 0.05, pct(a.music))),
      this.row('Effets sonores', this.range('audio.sfx', a.sfx, 0, 1, 0.05, pct(a.sfx))),
      this.row('Ambiance (oiseaux, vagues, pluie…)', this.range('audio.ambience', a.ambience, 0, 1, 0.05, pct(a.ambience))),
      this.row('Musique', this.toggle('musicOn', this.game.audio.musicOn), 'Elle change selon l\'endroit, l\'heure, la météo et les fêtes'),
      this.row('Titre de la chanson', this.toggle('musicTitles', this.s.musicTitles !== false), 'Un petit message quand une chanson commence'),
    ].join('') + this.myMusic();
  }

  /** Ma musique : les chansons de chaque ambiance, à écouter, ajouter ou retirer. */
  myMusic() {
    const m = this.game.music;
    const playing = m.playing;
    const hidden = m.hidden;
    const moodLabel = (id) => MUSIC_MOODS.find((x) => x.id === id)?.label || id;
    let html = `<div class="field-title mm-title-main">🎵 Ma musique</div>
      <p class="note">Une ou plusieurs chansons par ambiance ; le jeu passe de l'une à l'autre en fondu. « Ajouter » prend des fichiers audio de ton ordinateur (MP3, M4A, OGG, WAV…) : ils restent dans le jeu, sur cet ordinateur.${playing ? `<br>En ce moment : <b>${escapeHtml(playing.name)}</b> (${escapeHtml(moodLabel(playing.mood))}).` : ''}</p>`;
    for (const mood of MUSIC_MOODS) {
      const list = m.tracks.filter((t) => t.mood === mood.id);
      const fallback = m.resolve(mood.id);
      html += `<div class="mm-mood${playing?.mood === mood.id ? ' playing' : ''}"><div class="mm-head"><div class="mm-name"><b>${mood.emoji} ${mood.label}</b><small>${escapeHtml(mood.when)}</small></div>
        <div class="mm-actions"><button class="btn small" data-mm-play="${mood.id}"${fallback ? '' : ' disabled'}>▶ Écouter</button>
        <label class="btn small">➕ Ajouter<input type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav,.flac,.aac,.opus" multiple data-mm-add="${mood.id}" hidden /></label></div></div>`;
      if (list.length) {
        html += `<ul class="mm-list">${list.map((t) => {
          const off = hidden.has(t.id);
          const btn = t.source === 'user'
            ? `<button class="btn small" data-mm-del="${escapeHtml(t.id)}" title="Retirer cette chanson">🗑️</button>`
            : `<button class="btn small" data-mm-hide="${escapeHtml(t.id)}">${off ? 'Réactiver' : 'Masquer'}</button>`;
          return `<li class="${off ? 'off' : ''}${playing?.id === t.id ? ' now' : ''}"><span>${playing?.id === t.id ? '🔊' : t.source === 'user' ? '🎧' : '📁'} ${escapeHtml(t.name)}</span>${btn}</li>`;
        }).join('')}</ul>`;
      } else {
        html += `<p class="mm-empty">Pas encore de chanson : ${fallback ? `le jeu joue celles de « ${escapeHtml(moodLabel(fallback))} »` : 'la petite musique du jeu'}.</p>`;
      }
      html += '</div>';
    }
    return html;
  }

  jeu() {
    const s = this.s;
    const playing = this.game.state !== 'title';
    return [
      this.row('Durée d\'une journée', this.chips('daySpeed', Object.entries(DAY_SPEEDS).map(([id, d]) => [id, d.label]), s.daySpeed)),
      this.row('Langue', '<div class="chips"><button class="chip active">🇫🇷 Français</button></div>'),
      isDesktop() ? this.row('Nouvelles versions', this.toggle('checkUpdates', s.checkUpdates !== false), `Version installée : ${VERSION}. L'écran titre prévient quand une mise à jour est publiée.`) : '',
      this.row('Sauvegarde', `<div class="chips"><button class="btn small" data-export>📤 Exporter le profil ${getSlot()}</button></div>`, 'Un fichier à garder précieusement, ou à importer sur un autre ordinateur (écran titre → Profils).'),
      playing ? this.row('Recommencer', `<button class="btn small${this.confirmReset ? ' danger' : ''}" data-reset>${this.confirmReset ? '⚠️ Vraiment tout effacer ? Clique encore' : '🗑️ Effacer ce profil et recommencer'}</button>`) : '',
      this.row('Tout réinitialiser', '<button class="btn small" data-defaults>↺ Paramètres par défaut</button>', 'Remet les graphismes, l\'affichage, les touches et le son d\'origine.'),
    ].join('');
  }

  bind() {
    const g = this.game;
    const s = this.s;
    const set = (path, val) => {
      const parts = path.split('.');
      let o = s;
      for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
      o[parts.at(-1)] = val;
      if (parts[0] === 'graphics') s.preset = matchPreset(s.graphics);
    };
    this.el.querySelectorAll('button[data-set]').forEach((b) => {
      b.onclick = () => {
        const raw = b.dataset.val;
        const val = raw === 'true' ? true : raw === 'false' ? false : Number.isNaN(Number(raw)) ? raw : Number(raw);
        set(b.dataset.set, val);
        this.apply();
        this.render();
      };
    });
    this.el.querySelectorAll('input[type="checkbox"][data-set]').forEach((i) => {
      i.onchange = () => {
        const path = i.dataset.set;
        if (path === 'fullscreen') {
          toggleFullscreen(i.checked);
          return;
        }
        if (path === 'musicOn') {
          if (i.checked !== g.audio.musicOn) g.toggleMusic();
          return;
        }
        set(path, i.checked);
        this.apply();
        this.render();
      };
    });
    this.el.querySelectorAll('input[type="range"][data-set]').forEach((i) => {
      i.oninput = () => {
        set(i.dataset.set, parseFloat(i.value));
        const out = i.parentElement.querySelector('.rval');
        const path = i.dataset.set;
        const v = parseFloat(i.value);
        if (path.startsWith('audio.')) out.textContent = `${Math.round(v * 100)} %`;
        else if (path === 'fov') out.textContent = `${v}°`;
        else if (path === 'uiScale') out.textContent = `${Math.round(v * 100)} %`;
        else if (path === 'camSensitivity') out.textContent = `×${v.toFixed(2)}`;
        else if (path.startsWith('graphics.')) out.textContent = GRAPHICS_OPTIONS[path.split('.')[1]].fmt(v);
        // Les réglages lourds (résolution, distance) sont appliqués au relâchement.
        if (!path.startsWith('graphics.')) this.apply();
      };
      i.onchange = () => {
        this.apply();
        if (i.dataset.set.startsWith('graphics.')) this.render();
      };
    });
    this.el.querySelectorAll('[data-preset]').forEach((b) => {
      b.onclick = () => {
        s.preset = b.dataset.preset;
        s.graphics = { ...PRESETS[s.preset] };
        this.apply();
        this.render();
      };
    });
    this.el.querySelectorAll('[data-rebind]').forEach((b) => {
      b.onclick = () => {
        this.listening = b.dataset.rebind;
        this.render();
        g.input.listening = (e) => {
          e.preventDefault();
          e.stopImmediatePropagation?.();
          const id = this.listening;
          g.input.listening = null;
          this.listening = null;
          if (e.code !== 'Escape') {
            // Échange avec l'action qui utilisait déjà cette touche.
            const other = ACTIONS.find((a) => a.id !== id && bindingOf(a.id, s.keys) === e.code);
            if (other) s.keys[other.id] = bindingOf(id, s.keys);
            s.keys[id] = e.code;
            this.apply();
            if (other) g.ui.toast(`🔁 ${other.label} passe sur ${keyLabel(s.keys[other.id])}`, 2500);
          }
          this.suppressEsc = true;
          this.render();
        };
      };
    });
    this.el.querySelector('[data-resetkeys]')?.addEventListener('click', () => {
      s.keys = {};
      this.apply();
      this.render();
    });
    this.el.querySelector('[data-export]')?.addEventListener('click', () => downloadSave(getSlot()));
    // Ma musique.
    const m = g.music;
    this.el.querySelectorAll('[data-mm-play]').forEach((b) => {
      b.onclick = () => {
        g.audio.ensure();
        if (!g.audio.musicOn) g.toggleMusic();
        m.preview(b.dataset.mmPlay);
        setTimeout(() => this.tab === 'audio' && this.render(), 400);
      };
    });
    this.el.querySelectorAll('[data-mm-add]').forEach((input) => {
      input.onchange = async () => {
        const files = [...input.files];
        if (!files.length) return;
        g.ui.toast(`⏳ Ajout de ${files.length} chanson${files.length > 1 ? 's' : ''}…`, 2000);
        try {
          const n = await m.addFiles(input.dataset.mmAdd, files);
          g.ui.toast(n ? `✅ ${n} chanson${n > 1 ? 's ajoutées' : ' ajoutée'}` : '⚠️ Ce ne sont pas des fichiers audio', 2500);
        } catch {
          g.ui.toast('⚠️ Impossible d\'enregistrer ces chansons ici', 3000);
        }
        if (this.tab === 'audio') this.render();
      };
    });
    this.el.querySelectorAll('[data-mm-del]').forEach((b) => {
      b.onclick = async () => {
        await m.removeUser(b.dataset.mmDel);
        this.render();
      };
    });
    this.el.querySelectorAll('[data-mm-hide]').forEach((b) => {
      b.onclick = () => {
        m.setHidden(b.dataset.mmHide, !m.hidden.has(b.dataset.mmHide));
        saveSettings(s);
        this.render();
      };
    });
    this.el.querySelector('[data-reset]')?.addEventListener('click', () => {
      if (!this.confirmReset) {
        this.confirmReset = true;
        this.render();
        return;
      }
      g.resetGame();
    });
    this.el.querySelector('[data-defaults]')?.addEventListener('click', () => {
      const d = defaultSettings();
      Object.assign(s, d);
      g.audio.musicOn = d.musicOn;
      this.apply();
      saveSettings(s);
      this.render();
    });
  }
}

// --- Crédits -------------------------------------------------------------------------------

export class Credits {
  constructor(game) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.id = 'credits';
    this.el.className = 'modal hidden';
    this.el.innerHTML = `<div class="modal-card small credits-card"><button class="close" data-close>✕</button>
      <div class="logo small">Doucebrise</div>
      <p class="tagline">L'archipel des cœurs doux</p>
      <div class="credits-list">
        <p><b>Un jeu fait avec ♥</b><br>pour les soirées douces, les amis à poils et les grandes balades.</p>
        <p><b>Conception, programmation, graphismes, sons</b><br>Tout est fabriqué dans le jeu, sans image externe : modèles 3D, ciel, eau, bruitages et ambiances sont générés en direct.</p>
        <p><b>Technologies</b><br>Three.js (moteur 3D) · Vite · Electron (applications Windows et macOS)</p>
        <p><b>Police</b><br>Nunito — SIL Open Font License</p>
        ${game.music.tracks.some((t) => t.source === 'bundled') ? `<p><b>Musiques choisies avec amour</b><br>${[...new Set(game.music.tracks.filter((t) => t.source === 'bundled').map((t) => t.name))].map(escapeHtml).join('<br>')}</p>` : ''}
        <p><b>Développé avec l'aide de Claude</b></p>
        <p class="note">Version ${VERSION}</p>
        <p class="note">Merci d'avoir joué ! 🌸🐱🌊</p>
      </div></div>`;
    document.body.appendChild(this.el);
    this.el.querySelector('[data-close]').onclick = () => game.closePanels();
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) game.closePanels();
    });
  }
}

export { actionKey };
