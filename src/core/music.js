import { MUSIC_BED } from './audio.js';

// Musiques du jeu : une ambiance par moment (nuit, fêtes, village, pluie, maison…).
// Les chansons viennent du dossier music/<ambiance>/ (intégrées au jeu) et de
// « Ma musique » (fichiers ajoutés depuis les paramètres, gardés dans le navigateur).
// Longs fondus enchaînés entre les lieux, reprise là où la chanson s'était arrêtée, volumes égalisés.

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

// Transitions (secondes). On attend que la nouvelle ambiance se confirme (settle) : traverser
// un lieu ou y entrer une seconde ne change rien. Puis la chanson en cours s'efface lentement
// (out) et la suivante monte doucement un peu après (lag, in), sans à-coup ni blanc.
const PLACE = { settle: 6, out: 7, in: 7, lag: 2 }; // lieu, heure, temps qu'il fait
const MOMENT = { settle: 0.8, out: 3, in: 3, lag: 0.6 }; // scène tendre, longue-vue, luge, vœu
const FIRST = { in: 3 }; // première chanson (rien ne jouait)
const NEXT = { gap: 1.2, in: 1 }; // chanson suivante de la même ambiance
const RESUME_MS = 10 * 60 * 1000; // on reprend la chanson là où elle en était pendant 10 min
const DEFAULT_GAIN = 0.35; // chanson non mesurée (souvent une chanson pop, forte)
const AUDIO_FILE = /\.(mp3|ogg|oga|m4a|aac|wav|flac|opus|webm)$/i;

// Chansons du dossier music/ (copiées dans le jeu au moment de la construction).
const BUNDLED = import.meta.glob('/music/*/*.{mp3,ogg,oga,m4a,aac,wav,flac,opus,webm,MP3}', { query: '?url', import: 'default', eager: true });
const LEVELS = Object.values(import.meta.glob('/music/levels.json', { import: 'default', eager: true }))[0] || {};
const nfc = (s) => String(s).normalize('NFC');

/**
 * Courbe de volume d'un fondu : arrivée en cosinus surélevé (la chanson monte de nulle part,
 * sans attaque) ; départ à puissance constante (elle s'éloigne sans trou pendant le fondu enchaîné).
 */
function fadeCurve(from, to, n = 48) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    c[i] = to < from ? to + (from - to) * Math.cos((x * Math.PI) / 2) : from + (to - from) * (1 - Math.cos(x * Math.PI)) / 2;
  }
  c[n - 1] = to;
  return c;
}
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
    this.fading = []; // chansons qui s'effacent (on peut les rattraper si on revient)
    this.wantMoment = false;
    this.moment = false; // l'ambiance jouée vient d'un moment (scène, longue-vue…)
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
   * À chaque image : wanted = ambiance voulue par le jeu ; moment = elle vient d'un moment
   * (scène, longue-vue, luge…) plutôt que d'un lieu. Change de chanson en fondu enchaîné
   * quand l'ambiance reste la même assez longtemps.
   */
  update(dt, wanted, moment = false) {
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
      this.wantMoment = moment;
    }
    const target = this.resolve(this.want);
    // Entrer dans un moment ou en sortir : plus réactif. Changer de lieu : lent et fondu.
    const T = this.previewMood || this.wantMoment || this.moment ? MOMENT : PLACE;
    const immediate = !this.deck || this.previewMood;
    if (target !== this.mood && (immediate || now - this.wantSince >= T.settle * 1000)) {
      this.moment = !!(this.previewMood || this.wantMoment);
      this.switchTo(target, T);
    }
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

  switchTo(mood, T = PLACE) {
    const list = mood ? this.tracksFor(mood) : [];
    // On revient vers une chanson qui s'efface encore : elle remonte, sans recommencer.
    const back = this.fading.find((d) => d.track.mood === mood && list.includes(d.track) && !d.el.ended && d.el.duration - d.el.currentTime > 10);
    const crossing = !!this.deck;
    this.release(T.out);
    this.mood = mood;
    if (!mood) return;
    if (back) {
      this.revive(back, T.in);
      return;
    }
    const saved = this.positions[mood];
    let track = null;
    let time = 0;
    if (saved && performance.now() - saved.at < RESUME_MS) {
      track = list.find((t) => t.id === saved.id) || null;
      if (track) time = saved.time;
    }
    if (!track) track = this.nextTrack(mood);
    this.play(track, time, crossing ? { delay: T.lag, fadeIn: T.in } : { fadeIn: FIRST.in });
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

  /** Lance une chanson : après delay secondes (le temps que l'autre s'efface), en fondu sur fadeIn. */
  play(track, time = 0, { delay = 0, fadeIn = FIRST.in } = {}) {
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
    const target = track.gain * (node ? 1 : this.audio.levels.music * MUSIC_BED * this.audio.levels.master);
    const deck = { el, gain, node, track, target, fadeIn, startAt: time, env: null, timer: 0, kill: 0 };
    this.deck = deck;
    this.cursor[track.mood] = track.id;
    el.addEventListener('ended', () => {
      if (this.deck !== deck) return;
      this.positions[track.mood] = null;
      this.release(0.3);
      this.mood = track.mood;
      this.play(this.nextTrack(track.mood, track.id), 0, { delay: NEXT.gap, fadeIn: NEXT.in });
    });
    el.addEventListener('loadedmetadata', () => {
      if (deck.startAt > 0 && deck.startAt < el.duration - 5) el.currentTime = deck.startAt;
    }, { once: true });
    el.addEventListener('error', () => {
      if (this.deck !== deck || deck.disposed) return;
      console.warn('Musique illisible :', track.name);
      this.broken.add(track.id);
      this.dispose(deck);
      this.mood = null;
    });
    if (delay > 0) {
      deck.timer = setTimeout(() => {
        deck.timer = 0;
        if (this.deck === deck) this.start(deck);
      }, delay * 1000);
    } else this.start(deck);
  }

  start(deck) {
    deck.blocked = false;
    const p = deck.el.play();
    p?.then(() => {
      if (deck.disposed || this.deck !== deck) return;
      if (!deck.playing && this.onTrack) this.onTrack(deck.track);
      deck.playing = true;
      if (!deck.node) {
        deck.el.volume = Math.min(1, deck.target);
        return;
      }
      this.fade(deck, deck.target, deck.fadeIn);
    }).catch(() => {
      if (!deck.disposed) deck.blocked = true;
    });
  }

  /** Volume du deck à l'instant t (d'après le fondu en cours). */
  level(deck, t) {
    const e = deck.env;
    if (!e) return 0;
    const x = Math.min(1, Math.max(0, (t - e.t0) / e.dur)) * (e.curve.length - 1);
    const i = Math.floor(x);
    const j = Math.min(e.curve.length - 1, i + 1);
    return e.curve[i] + (e.curve[j] - e.curve[i]) * (x - i);
  }

  /** Emmène le volume d'un deck vers « to » en « dur » secondes, par une courbe douce. */
  fade(deck, to, dur) {
    const ctx = this.audio.ctx;
    const p = deck.gain.gain;
    const now = ctx.currentTime;
    const from = this.level(deck, now);
    const d = Math.max(0.05, dur);
    const curve = fadeCurve(from, to);
    deck.env = { t0: now, dur: d, curve };
    p.cancelScheduledValues(now);
    try {
      p.setValueCurveAtTime(curve, now, d);
    } catch {
      // Navigateur qui refuse la courbe (fondu précédent encore en cours) : rampe simple.
      try {
        p.setValueAtTime(from, now);
        p.linearRampToValueAtTime(to, now + d);
      } catch {
        try {
          p.setTargetAtTime(to, now, d / 3);
        } catch {
          /* on garde le volume actuel */
        }
      }
    }
  }

  /** Coupe la chanson en cours en fondu (et retient où elle en était). */
  release(fade = PLACE.out) {
    const deck = this.deck;
    if (!deck) return;
    this.deck = null;
    const { el, node, track } = deck;
    if (el.currentTime > 3 && !el.ended) this.positions[track.mood] = { id: track.id, time: el.currentTime, at: performance.now() };
    clearTimeout(deck.timer);
    deck.timer = 0;
    // Pas encore lancée (attente, chargement) ou sans Web Audio : on arrête tout de suite.
    if (!node || !this.audio.ctx || !deck.playing || !deck.env) {
      if (!node && deck.playing) setTimeout(() => this.dispose(deck), fade * 1000);
      else this.dispose(deck);
      return;
    }
    this.fade(deck, 0, fade);
    this.fading.push(deck);
    deck.kill = setTimeout(() => this.dispose(deck), fade * 1000 + 150);
  }

  /** Une chanson qui s'effaçait remonte (on est revenu avant la fin du fondu). */
  revive(deck, fadeIn) {
    clearTimeout(deck.kill);
    deck.kill = 0;
    this.fading = this.fading.filter((d) => d !== deck);
    this.deck = deck;
    this.cursor[deck.track.mood] = deck.track.id;
    this.fade(deck, deck.target, fadeIn);
  }

  dispose(deck) {
    if (deck.disposed) return;
    deck.disposed = true;
    clearTimeout(deck.timer);
    clearTimeout(deck.kill);
    this.fading = this.fading.filter((d) => d !== deck);
    if (this.deck === deck) this.deck = null;
    const { el, gain, node } = deck;
    el.pause();
    node?.disconnect();
    gain.disconnect();
    el.removeAttribute('src');
    el.load();
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
