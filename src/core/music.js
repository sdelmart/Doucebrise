import { MUSIC_BED } from './audio.js';

// Musiques du jeu : une ambiance par moment (nuit, fêtes, village, pluie, maison…).
// Les chansons viennent du dossier music/<ambiance>/ (intégrées au jeu) et de
// « Ma musique » (fichiers ajoutés depuis les paramètres, gardés dans le navigateur).
// Fondus enchaînés, reprise là où la chanson s'était arrêtée, volumes égalisés.

export const MUSIC_MOODS = [
  { id: 'leger', emoji: '☀️', label: 'Léger', when: 'Le village de Doucebrise en journée' },
  { id: 'nature', emoji: '🌿', label: 'Nature', when: 'Forêt, prairie, plage, étang, île Corail' },
  { id: 'montagnard', emoji: '🏔️', label: 'Montagnard', when: 'Bourg-Sapin et le Pic des Neiges' },
  { id: 'nuit', emoji: '🌙', label: 'Nuit', when: 'Dehors, la nuit' },
  { id: 'melancolique', emoji: '🌧️', label: 'Mélancolique', when: 'Pluie et orage' },
  { id: 'festif', emoji: '🎉', label: 'Festif', when: 'Fêtes des villages, course de luge' },
  { id: 'cozy', emoji: '🏡', label: 'Cozy', when: 'À la maison et chez les habitants' },
  { id: 'mignon', emoji: '🐱', label: 'Mignon', when: 'Boutiques et Café des Chats' },
  { id: 'tendre', emoji: '💞', label: 'Tendre', when: 'Scènes d\'amitié et grands moments de l\'histoire' },
  { id: 'magique', emoji: '✨', label: 'Magique', when: 'Écran titre, longue-vue, étoiles filantes' },
];
const MOOD_IDS = new Set(MUSIC_MOODS.map((m) => m.id));

// Ambiance sans chanson : on se rabat sur une ambiance proche.
const FALLBACK = {
  leger: ['nature', 'cozy', 'mignon'],
  nature: ['leger', 'montagnard'],
  montagnard: ['nature', 'leger'],
  nuit: ['magique', 'tendre', 'cozy'],
  melancolique: ['nuit', 'tendre'],
  festif: ['leger', 'mignon'],
  cozy: ['tendre', 'leger'],
  mignon: ['leger', 'cozy'],
  tendre: ['cozy', 'magique'],
  magique: ['nuit', 'tendre'],
};

const FADE = 2.4; // secondes
const SETTLE = 2; // l'ambiance doit rester stable ce temps avant de changer de chanson
const RESUME_MS = 10 * 60 * 1000; // on reprend la chanson là où elle en était pendant 10 min
const DEFAULT_GAIN = 0.35; // chanson non mesurée (souvent une chanson pop, forte)
const AUDIO_FILE = /\.(mp3|ogg|oga|m4a|aac|wav|flac|opus|webm)$/i;

// Chansons du dossier music/ (copiées dans le jeu au moment de la construction).
const BUNDLED = import.meta.glob('/music/*/*.{mp3,ogg,oga,m4a,aac,wav,flac,opus,webm,MP3}', { query: '?url', import: 'default', eager: true });
const LEVELS = Object.values(import.meta.glob('/music/levels.json', { import: 'default', eager: true }))[0] || {};
const nfc = (s) => String(s).normalize('NFC');
const LEVELS_NFC = Object.fromEntries(Object.entries(LEVELS).map(([k, v]) => [nfc(k), v]));

/** Titre lisible à partir du nom de fichier. */
export function trackTitle(file) {
  return nfc(file)
    .replace(/^.*[\\/]/, '')
    .replace(AUDIO_FILE, '')
    .replace(/\((?:[^)]*\b(?:lyrics?|paroles|clip officiel|official[^)]*|audio|video|vidéo|visualizer|hd|4k)\b[^)]*)\)/gi, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\b(?:M\/V|MV)\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+-\s*$/, '')
    .trim();
}

function bundledTracks() {
  return Object.entries(BUNDLED)
    .map(([path, url]) => {
      const rel = nfc(path.replace(/^\/music\//, ''));
      const [mood, file] = rel.split('/');
      if (!MOOD_IDS.has(mood)) return null;
      return { id: `b:${rel}`, mood, name: trackTitle(file), url, gain: LEVELS_NFC[rel] ?? DEFAULT_GAIN, source: 'bundled' };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// --- Ma musique : fichiers ajoutés par la joueuse (IndexedDB) -------------------------------

const DB_NAME = 'doucebrise-music';

function openDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB indisponible'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('tracks', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction('tracks', mode);
    const store = t.objectStore('tracks');
    const out = fn(store);
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

// --- Lecteur ----------------------------------------------------------------------------------

export class MusicPlayer {
  /** settings : objet des paramètres, ou fonction qui le renvoie. */
  constructor(audio, settings) {
    this.audio = audio;
    this.settingsOf = typeof settings === 'function' ? settings : () => settings;
    this.tracks = bundledTracks();
    this.want = null;
    this.wantSince = 0;
    this.mood = null; // ambiance jouée (après repli)
    this.deck = null; // { el, gain, track }
    this.positions = {}; // ambiance → { id, time, at }
    this.cursor = {}; // ambiance → dernière chanson jouée
    this.previewMood = null;
    this.previewUntil = 0;
    this.retryT = 0;
    this.broken = new Set(); // chansons illisibles, ignorées
    this.onTrack = null;
    this.ready = this.loadUserTracks();
  }

  get hidden() {
    return new Set(this.settingsOf().musicHidden || []);
  }

  /** Chansons actives d'une ambiance. */
  tracksFor(mood) {
    const hidden = this.hidden;
    return this.tracks.filter((t) => t.mood === mood && !hidden.has(t.id) && !this.broken.has(t.id));
  }

  /** Ambiance réellement jouée (repli si aucune chanson), ou null. */
  resolve(mood) {
    if (!mood) return null;
    if (this.tracksFor(mood).length) return mood;
    for (const m of FALLBACK[mood] || []) if (this.tracksFor(m).length) return m;
    return MUSIC_MOODS.map((m) => m.id).find((m) => this.tracksFor(m).length) || null;
  }

  get playing() {
    return this.deck?.track || null;
  }

  /** Fait écouter une ambiance (paramètres) pendant 45 secondes. */
  preview(mood) {
    this.previewMood = mood;
    this.previewUntil = performance.now() + 45000;
    this.want = null;
  }

  /**
   * À chaque image : wanted = ambiance voulue par le jeu. Change de chanson (en fondu)
   * quand l'ambiance reste la même assez longtemps.
   */
  update(dt, wanted) {
    const a = this.audio;
    if (this.previewMood && performance.now() < this.previewUntil) wanted = this.previewMood;
    else this.previewMood = null;
    if (!a.ctx || !a.musicOn) {
      if (this.deck) this.stop();
      a.proceduralMuted = false;
      return;
    }
    if (a.ctx.state === 'suspended') return;
    // Temps réel (et non temps du jeu) : la musique suit même si les images ralentissent.
    const now = performance.now();
    if (wanted !== this.want) {
      this.want = wanted;
      this.wantSince = now;
    }
    const target = this.resolve(this.want);
    const immediate = !this.deck || this.previewMood;
    if (target !== this.mood && (immediate || now - this.wantSince >= SETTLE * 1000)) this.switchTo(target);
    // Lecture refusée par le navigateur (pas encore de clic) : on réessaie.
    if (this.deck?.blocked) {
      this.retryT -= dt;
      if (this.retryT <= 0) {
        this.retryT = 1;
        this.start(this.deck);
      }
    }
    a.proceduralMuted = !!this.deck;
  }

  switchTo(mood) {
    this.release();
    this.mood = mood;
    if (!mood) return;
    const list = this.tracksFor(mood);
    const saved = this.positions[mood];
    let track = null;
    let time = 0;
    if (saved && performance.now() - saved.at < RESUME_MS) {
      track = list.find((t) => t.id === saved.id) || null;
      if (track) time = saved.time;
    }
    if (!track) track = this.nextTrack(mood);
    this.play(track, time);
  }

  /** Chanson suivante de l'ambiance (ordre mélangé, sans répéter la précédente). */
  nextTrack(mood, after = null) {
    const list = this.tracksFor(mood);
    if (!list.length) return null;
    if (list.length === 1) return list[0];
    const last = after || this.cursor[mood];
    const others = list.filter((t) => t.id !== last);
    return others[Math.floor(Math.random() * others.length)];
  }

  play(track, time = 0) {
    if (!track) return;
    const ctx = this.audio.ctx;
    const el = new Audio();
    el.preload = 'auto';
    el.src = track.url;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    let node = null;
    try {
      node = ctx.createMediaElementSource(el);
      node.connect(gain).connect(this.audio.buses.music);
    } catch {
      // Sans Web Audio : volume direct de l'élément.
      node = null;
    }
    const deck = { el, gain, node, track, startAt: time };
    this.deck = deck;
    this.cursor[track.mood] = track.id;
    el.addEventListener('ended', () => {
      if (this.deck !== deck) return;
      this.positions[track.mood] = null;
      this.release(0.3);
      this.mood = track.mood;
      this.play(this.nextTrack(track.mood, track.id));
    });
    el.addEventListener('loadedmetadata', () => {
      if (deck.startAt > 0 && deck.startAt < el.duration - 5) el.currentTime = deck.startAt;
    }, { once: true });
    el.addEventListener('error', () => {
      if (this.deck !== deck) return;
      console.warn('Musique illisible :', track.name);
      this.broken.add(track.id);
      this.deck = null;
      this.mood = null;
    });
    this.start(deck);
    if (this.onTrack) this.onTrack(track);
  }

  start(deck) {
    const ctx = this.audio.ctx;
    const target = deck.track.gain * (deck.node ? 1 : this.audio.levels.music * MUSIC_BED * this.audio.levels.master);
    deck.blocked = false;
    const p = deck.el.play();
    p?.then(() => {
      if (!deck.node) {
        deck.el.volume = Math.min(1, target);
        return;
      }
      const now = ctx.currentTime;
      deck.gain.gain.cancelScheduledValues(now);
      deck.gain.gain.setValueAtTime(deck.gain.gain.value, now);
      deck.gain.gain.linearRampToValueAtTime(target, now + FADE);
    }).catch(() => {
      deck.blocked = true;
    });
  }

  /** Coupe la chanson en cours en fondu (et retient où elle en était). */
  release(fade = FADE) {
    const deck = this.deck;
    if (!deck) return;
    this.deck = null;
    const { el, gain, node, track } = deck;
    if (el.currentTime > 3 && !el.ended) this.positions[track.mood] = { id: track.id, time: el.currentTime, at: performance.now() };
    const ctx = this.audio.ctx;
    if (node && ctx) {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + fade);
    }
    setTimeout(() => {
      el.pause();
      node?.disconnect();
      gain.disconnect();
      el.removeAttribute('src');
      el.load();
    }, fade * 1000 + 80);
  }

  stop() {
    this.release(0.8);
    this.mood = null;
    this.want = null;
  }

  /** Recharge la liste (chanson ajoutée, masquée…) et relance si besoin. */
  refresh() {
    const t = this.playing;
    if (t && !this.tracksFor(t.mood).some((x) => x.id === t.id)) {
      this.release(0.8);
      this.mood = null;
    } else if (this.mood && this.resolve(this.want) !== this.mood) this.wantSince = 0;
  }

  // --- Ma musique -------------------------------------------------------------------------

  async loadUserTracks() {
    try {
      const db = await openDb();
      const rows = await tx(db, 'readonly', (s) => s.getAll());
      for (const r of rows || []) {
        if (!MOOD_IDS.has(r.mood) || !r.blob) continue;
        this.tracks.push({ id: r.id, mood: r.mood, name: trackTitle(r.name), url: URL.createObjectURL(r.blob), gain: r.gain ?? DEFAULT_GAIN, source: 'user' });
      }
      db.close();
    } catch {
      /* stockage indisponible : seulement les musiques intégrées */
    }
  }

  /** Mesure le volume moyen d'un fichier pour l'égaliser avec les autres. */
  async measure(blob) {
    try {
      const ctx = this.audio.ensure();
      const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
      const data = buf.getChannelData(0);
      let sum = 0;
      let n = 0;
      for (let i = 0; i < data.length; i += 16) {
        sum += data[i] * data[i];
        n++;
      }
      const mean = 10 * Math.log10(sum / Math.max(1, n) + 1e-12);
      let peak = 0;
      for (let i = 0; i < data.length; i += 4) peak = Math.max(peak, Math.abs(data[i]));
      const db = Math.min(-21 - mean, 8, -20 * Math.log10(peak + 1e-9) - 0.5);
      return Math.round(10 ** (db / 20) * 1000) / 1000;
    } catch {
      return null;
    }
  }

  /** Ajoute des fichiers audio à une ambiance. Renvoie le nombre de chansons ajoutées. */
  async addFiles(mood, files) {
    if (!MOOD_IDS.has(mood)) return 0;
    let added = 0;
    const db = await openDb();
    for (const file of files) {
      if (!(file.type?.startsWith('audio/') || AUDIO_FILE.test(file.name))) continue;
      const id = `u:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
      const gain = (await this.measure(file)) ?? DEFAULT_GAIN;
      await tx(db, 'readwrite', (s) => s.put({ id, mood, name: file.name, blob: file, gain, added: Date.now() }));
      this.tracks.push({ id, mood, name: trackTitle(file.name), url: URL.createObjectURL(file), gain, source: 'user' });
      added++;
    }
    db.close();
    this.refresh();
    return added;
  }

  async removeUser(id) {
    const i = this.tracks.findIndex((t) => t.id === id && t.source === 'user');
    if (i < 0) return;
    const [t] = this.tracks.splice(i, 1);
    try {
      const db = await openDb();
      await tx(db, 'readwrite', (s) => s.delete(id));
      db.close();
    } catch {
      /* déjà absent */
    }
    this.refresh();
    setTimeout(() => URL.revokeObjectURL(t.url), 5000);
  }

  /** Masque ou réactive une chanson intégrée (réglage gardé dans les paramètres). */
  setHidden(id, hide) {
    const set = this.hidden;
    if (hide) set.add(id);
    else set.delete(id);
    this.settingsOf().musicHidden = [...set];
    this.refresh();
  }
}
