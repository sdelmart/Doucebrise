// Sons synthétisés (aucun fichier audio) : effets doux, ambiances (oiseaux, grillons,
// vagues, vent, pluie, tonnerre) et musique générative qui change selon l'île et l'heure
// (jouée seulement quand aucune chanson n'est disponible, voir music.js).
// Trois bus réglables séparément : musique, effets, ambiance (plus un volume général).

const NOTES = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5 };

// Ambiances musicales : gamme, accords, timbre et tempo.
const MOODS = {
  village: { scale: [NOTES.C4, NOTES.D4, NOTES.E4, NOTES.G4, NOTES.A4, NOTES.C5, NOTES.D5, NOTES.E5, NOTES.G5], chords: [[0, 2, 4], [3, 5, 7], [4, 6, 8], [2, 4, 6]], bar: 2.4, lead: 'triangle', leadVol: 0.045, density: 0.75 },
  pins: { scale: [NOTES.D4, NOTES.E4, NOTES.G4, NOTES.A4, NOTES.B4, NOTES.D5, NOTES.E5, NOTES.G5, NOTES.A5], chords: [[0, 2, 4], [2, 4, 6], [1, 3, 5], [0, 3, 5]], bar: 3.0, lead: 'sine', leadVol: 0.05, density: 0.55 },
  corail: { scale: [NOTES.F4, NOTES.G4, NOTES.A4, NOTES.C5, NOTES.D5, NOTES.F5, NOTES.G5, NOTES.A5, NOTES.C6], chords: [[0, 2, 4], [1, 3, 5], [3, 5, 7], [2, 4, 6]], bar: 2.0, lead: 'square', leadVol: 0.018, density: 0.9, bounce: true },
  nuit: { scale: [NOTES.A4 / 2, NOTES.C4, NOTES.D4, NOTES.E4, NOTES.G4, NOTES.A4, NOTES.C5, NOTES.D5, NOTES.E5], chords: [[0, 2, 4], [1, 3, 5], [2, 4, 6], [0, 3, 5]], bar: 3.4, lead: 'sine', leadVol: 0.04, density: 0.45 },
};

// Musique de fond : nettement plus bas que les bruitages et l'ambiance (≈ −8 dB), et
// adoucie (voix des chansons en retrait) pour rester un fond sonore.
export const MUSIC_BED = 0.4;

export class Audio {
  constructor() {
    this.ctx = null;
    this.musicOn = false;
    this.musicTimer = null;
    this.mood = 'village';
    this.levels = { master: 0.8, music: 0.6, sfx: 0.9, ambience: 0.7 };
    this.amb = { birdT: 2, cricketT: 1, level: {} };
  }

  get sfxOn() {
    return this.levels.sfx > 0.001;
  }

  set sfxOn(v) {
    this.levels.sfx = v ? this.levels.sfx || 0.9 : 0;
    this.applyLevels();
  }

  ensure() {
    if (this.ctx) return this.ctx;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.buses = {};
      for (const b of ['music', 'sfx', 'ambience']) {
        this.buses[b] = this.ctx.createGain();
        if (b !== 'music') this.buses[b].connect(this.master);
      }
      // Musique : creux dans les médiums (présence des voix), aigus adoucis, puis un
      // atténuateur pour la baisser encore pendant les dialogues.
      const ctx = this.ctx;
      const presence = ctx.createBiquadFilter();
      presence.type = 'peaking';
      presence.frequency.value = 2800;
      presence.Q.value = 0.9;
      presence.gain.value = -5;
      const air = ctx.createBiquadFilter();
      air.type = 'highshelf';
      air.frequency.value = 7000;
      air.gain.value = -4;
      this.musicDuck = ctx.createGain();
      this.buses.music.connect(presence).connect(air).connect(this.musicDuck).connect(this.master);
      this.applyLevels();
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  setLevels(levels) {
    this.levels = { ...this.levels, ...levels };
    this.applyLevels();
  }

  applyLevels() {
    if (!this.ctx) return;
    this.master.gain.value = this.levels.master;
    this.buses.music.gain.value = this.levels.music * MUSIC_BED;
    this.buses.sfx.gain.value = this.levels.sfx;
    this.buses.ambience.gain.value = this.levels.ambience;
  }

  /** Musique encore un peu plus bas (dialogues, scènes) ; en douceur. */
  setMusicDuck(on) {
    if (!this.ctx || this.ducked === on) return;
    this.ducked = on;
    this.musicDuck.gain.setTargetAtTime(on ? 0.6 : 1, this.ctx.currentTime, 0.5);
  }

  /** Ancien réglage unique (compatibilité). */
  setVolume(v) {
    this.setLevels({ master: v });
  }

  tone(freq, { t = 0, dur = 0.2, type = 'sine', vol = 0.2, slide = 0, bus = 'sfx', attack = 0.015 } = {}) {
    const ctx = this.ensure();
    if (!ctx) return;
    const start = ctx.currentTime + t;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, start + dur);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(this.buses[bus]);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  noiseBuffer(seconds) {
    const ctx = this.ctx;
    const key = `n${seconds}`;
    this.noiseCache ||= {};
    if (this.noiseCache[key]) return this.noiseCache[key];
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseCache[key] = buffer;
    return buffer;
  }

  noise({ t = 0, dur = 0.3, vol = 0.15, freq = 1200, bus = 'sfx', type = 'lowpass', decay = true } = {}) {
    const ctx = this.ensure();
    if (!ctx) return;
    const start = ctx.currentTime + t;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(Math.max(0.5, Math.ceil(dur)));
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, start);
    if (decay) gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(filter).connect(gain).connect(this.buses[bus]);
    src.start(start);
    src.stop(start + dur + 0.05);
  }

  play(name) {
    if (!this.ctx && !this.ensure()) return;
    switch (name) {
      case 'pet':
        this.tone(NOTES.E5, { dur: 0.12, type: 'triangle', vol: 0.12 });
        this.tone(NOTES.G5, { t: 0.08, dur: 0.16, type: 'triangle', vol: 0.12 });
        break;
      case 'eat':
        this.tone(NOTES.C5, { dur: 0.08, type: 'square', vol: 0.04 });
        this.tone(NOTES.C5, { t: 0.12, dur: 0.08, type: 'square', vol: 0.04 });
        break;
      case 'fav':
        [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6].forEach((f, i) => this.tone(f, { t: i * 0.07, dur: 0.2, type: 'triangle', vol: 0.12 }));
        break;
      case 'adopt':
        [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.E5, NOTES.G5, NOTES.C6].forEach((f, i) => this.tone(f, { t: i * 0.11, dur: 0.3, type: 'triangle', vol: 0.14 }));
        break;
      case 'pick':
        this.tone(NOTES.A5, { dur: 0.1, type: 'sine', vol: 0.15, slide: 1.5 });
        break;
      case 'cast':
        this.noise({ dur: 0.25, vol: 0.08, freq: 2500 });
        break;
      case 'bite':
        this.tone(NOTES.G5, { dur: 0.08, type: 'square', vol: 0.06 });
        this.tone(NOTES.G5, { t: 0.1, dur: 0.08, type: 'square', vol: 0.06 });
        break;
      case 'splash':
        this.noise({ dur: 0.4, vol: 0.18, freq: 900 });
        this.tone(NOTES.C6, { t: 0.15, dur: 0.2, type: 'triangle', vol: 0.1 });
        break;
      case 'ui':
        this.tone(NOTES.E5, { dur: 0.06, type: 'sine', vol: 0.08 });
        break;
      case 'hover':
        this.tone(NOTES.G5, { dur: 0.04, type: 'sine', vol: 0.03 });
        break;
      case 'jump':
        this.tone(NOTES.C5, { dur: 0.12, type: 'sine', vol: 0.06, slide: 1.6 });
        break;
      case 'honk':
        this.tone(330, { dur: 0.16, type: 'square', vol: 0.06 });
        this.tone(262, { t: 0.2, dur: 0.22, type: 'square', vol: 0.06 });
        break;
      case 'bell':
        this.tone(NOTES.C6, { dur: 0.3, type: 'sine', vol: 0.1 });
        this.tone(NOTES.C6, { t: 0.18, dur: 0.4, type: 'sine', vol: 0.08 });
        break;
      case 'swoosh':
        this.noise({ dur: 0.2, vol: 0.07, freq: 3200 });
        break;
      case 'mail':
        [NOTES.G5, NOTES.C6].forEach((f, i) => this.tone(f, { t: i * 0.1, dur: 0.18, type: 'triangle', vol: 0.1 }));
        break;
      case 'chapter':
        [NOTES.C5, NOTES.G5, NOTES.E5, NOTES.C6, NOTES.G5, NOTES.E6].forEach((f, i) => this.tone(f, { t: i * 0.14, dur: 0.45, type: 'triangle', vol: 0.12 }));
        break;
      case 'wish':
        [NOTES.E6, NOTES.C6, NOTES.G5, NOTES.E6, NOTES.C6 * 1.5].forEach((f, i) => this.tone(f, { t: i * 0.09, dur: 0.6, type: 'sine', vol: 0.08 }));
        break;
      case 'star':
        this.tone(NOTES.E6, { dur: 0.9, type: 'sine', vol: 0.05, slide: 0.5, bus: 'ambience' });
        break;
      default:
        break;
    }
  }

  /** Coup de tonnerre (après l'éclair). */
  thunder(delay = 0.8) {
    if (!this.ensure()) return;
    this.noise({ t: delay, dur: 3.2, vol: 0.55, freq: 180, bus: 'ambience' });
    this.noise({ t: delay + 0.05, dur: 1.2, vol: 0.25, freq: 600, bus: 'ambience' });
    this.tone(48, { t: delay, dur: 2.5, type: 'sine', vol: 0.25, bus: 'ambience', attack: 0.08 });
  }

  // --- Boucles d'ambiance -----------------------------------------------------------------

  loop(id, { freq = 1800, type = 'bandpass', q = 0.6 } = {}) {
    this.loops ||= {};
    if (this.loops[id]) return this.loops[id];
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(2);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(this.buses.ambience);
    src.start();
    this.loops[id] = { gain, filter };
    return this.loops[id];
  }

  setLoop(id, level, opts) {
    if (!this.ctx) return;
    if (level < 0.01 && !this.loops?.[id]) return;
    const l = this.loop(id, opts);
    l.gain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.4);
    return l;
  }

  /** Bruit de pluie en boucle (0 = coupé). */
  setRain(level) {
    this.setLoop('rain', level * 0.12, { freq: 1800 });
  }

  /**
   * Ambiance selon le lieu et l'heure : oiseaux le jour, grillons la nuit,
   * vagues près de la mer, vent en altitude ou pendant l'orage.
   */
  updateAmbience(dt, { night = false, rain = 0, sea = 0, altitude = 0, storm = false, inside = false, active = true } = {}) {
    if (!this.ctx) return;
    const out = inside || !active ? 0.15 : 1;
    const now = this.ctx.currentTime;
    // Vagues : houle lente.
    const w = this.setLoop('waves', sea * 0.07 * out * (0.65 + Math.sin(now * 0.7) * 0.35), { freq: 500, type: 'lowpass', q: 0.3 });
    void w;
    // Vent : en montagne et pendant les orages.
    const wind = Math.min(1, Math.max(0, (altitude - 9) / 12)) + (storm ? 0.6 : 0);
    const wl = this.setLoop('wind', wind * 0.05 * out * (0.7 + Math.sin(now * 0.37) * 0.3), { freq: 420, type: 'bandpass', q: 1.2 });
    if (wl) wl.filter.frequency.setTargetAtTime(380 + Math.sin(now * 0.23) * 140, now, 0.5);
    if (!active || inside) return;
    // Oiseaux (jour, beau temps).
    this.amb.birdT -= dt;
    if (!night && rain < 0.3 && this.amb.birdT <= 0) {
      this.amb.birdT = 1.5 + Math.random() * 5;
      const base = 2200 + Math.random() * 1600;
      const n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) this.tone(base * (1 + Math.random() * 0.15), { t: i * 0.11, dur: 0.09, type: 'sine', vol: 0.025, slide: Math.random() < 0.5 ? 1.35 : 0.8, bus: 'ambience' });
    }
    // Grillons (nuit).
    this.amb.cricketT -= dt;
    if (night && rain < 0.3 && this.amb.cricketT <= 0) {
      this.amb.cricketT = 0.6 + Math.random() * 1.4;
      const f = 4200 + Math.random() * 500;
      for (let i = 0; i < 3; i++) this.tone(f, { t: i * 0.05, dur: 0.035, type: 'square', vol: 0.006, bus: 'ambience' });
    }
  }

  /** Petite mélodie au piano (touches pentatoniques). */
  piano() {
    const notes = [NOTES.C5, NOTES.D5, NOTES.E5, NOTES.G5, NOTES.A5, NOTES.C6];
    let t = 0;
    for (let i = 0; i < 8; i++) {
      this.tone(notes[Math.floor(Math.random() * notes.length)], { t, dur: 0.5, type: 'triangle', vol: 0.12 });
      t += Math.random() < 0.3 ? 0.36 : 0.18;
    }
  }

  lullaby() {
    [NOTES.G5, NOTES.E5, NOTES.C5, NOTES.E5, NOTES.D5, NOTES.C5].forEach((f, i) => this.tone(f, { t: i * 0.28, dur: 0.6, type: 'sine', vol: 0.1 }));
  }

  toggleMusic() {
    this.musicOn = !this.musicOn;
    if (this.musicOn) this.startMusic();
    else clearTimeout(this.musicTimer);
    return this.musicOn;
  }

  setMood(mood) {
    if (MOODS[mood]) this.mood = mood;
  }

  startMusic() {
    if (!this.ensure()) return;
    clearTimeout(this.musicTimer);
    let bar = 0;
    const playBar = () => {
      if (!this.musicOn) return;
      const m = MOODS[this.mood] || MOODS.village;
      // Une chanson (dossier music/ ou « Ma musique ») joue : la musique générée se tait.
      if (this.proceduralMuted) {
        this.musicTimer = setTimeout(playBar, m.bar * 1000);
        return;
      }
      const scale = m.scale;
      const chord = m.chords[bar % m.chords.length];
      chord.forEach((n, i) => this.tone(scale[n] / 2, { t: i * 0.02, dur: m.bar, type: 'sine', vol: 0.035, bus: 'music', attack: 0.2 }));
      const steps = m.bounce ? 8 : 4;
      const stepT = m.bar / steps;
      for (let i = 0; i < steps; i++) {
        if (Math.random() < m.density) {
          const n = chord[Math.floor(Math.random() * 3)] + (Math.random() < 0.5 ? 0 : 2);
          this.tone(scale[Math.min(n, scale.length - 1)] * 2, { t: i * stepT + 0.05, dur: m.bounce ? 0.25 : 0.9, type: m.lead, vol: m.leadVol, bus: 'music' });
        }
      }
      if (m.bounce && bar % 2 === 0) for (let i = 0; i < 4; i++) this.tone(scale[chord[0]] / 2, { t: i * (m.bar / 4), dur: 0.15, type: 'triangle', vol: 0.03, bus: 'music' });
      bar++;
      this.musicTimer = setTimeout(playBar, m.bar * 1000);
    };
    playBar();
  }
}
