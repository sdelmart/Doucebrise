// Sons synthétisés (aucun fichier audio) : petits effets doux et boîte à musique.

const NOTES = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5 };

export class Audio {
  constructor() {
    this.ctx = null;
    this.musicOn = false;
    this.sfxOn = true;
    this.musicTimer = null;
  }

  ensure() {
    if (this.ctx) return this.ctx;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume ?? 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  tone(freq, { t = 0, dur = 0.2, type = 'sine', vol = 0.2, slide = 0 } = {}) {
    const ctx = this.ensure();
    if (!ctx) return;
    const start = ctx.currentTime + t;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, start + dur);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  noise({ t = 0, dur = 0.3, vol = 0.15, freq = 1200 } = {}) {
    const ctx = this.ensure();
    if (!ctx) return;
    const start = ctx.currentTime + t;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(this.master);
    src.start(start);
  }

  play(name) {
    if (!this.sfxOn) return;
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
      case 'jump':
        this.tone(NOTES.C5, { dur: 0.12, type: 'sine', vol: 0.06, slide: 1.6 });
        break;
      default:
        break;
    }
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  /** Bruit de pluie en boucle (0 = coupé). */
  setRain(level) {
    if (!this.ctx) return;
    if (!this.rainGain && level > 0.02) {
      const ctx = this.ctx;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 0.6;
      this.rainGain = ctx.createGain();
      this.rainGain.gain.value = 0;
      src.connect(filter).connect(this.rainGain).connect(this.master);
      src.start();
    }
    if (this.rainGain) this.rainGain.gain.value = this.sfxOn ? level * 0.09 : 0;
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

  startMusic() {
    if (!this.ensure()) return;
    const scale = [NOTES.C4, NOTES.D4, NOTES.E4, NOTES.G4, NOTES.A4, NOTES.C5, NOTES.D5, NOTES.E5, NOTES.G5];
    const chords = [[0, 2, 4], [3, 5, 7], [4, 6, 8], [2, 4, 6]];
    let bar = 0;
    const playBar = () => {
      if (!this.musicOn) return;
      const chord = chords[bar % chords.length];
      chord.forEach((n, i) => this.tone(scale[n] / 2, { t: i * 0.02, dur: 2.4, type: 'sine', vol: 0.035 }));
      for (let i = 0; i < 4; i++) {
        if (Math.random() < 0.75) {
          const n = chord[Math.floor(Math.random() * 3)] + (Math.random() < 0.5 ? 0 : 2);
          this.tone(scale[Math.min(n, scale.length - 1)] * 2, { t: i * 0.6 + 0.05, dur: 0.9, type: 'triangle', vol: 0.045 });
        }
      }
      bar++;
      this.musicTimer = setTimeout(playBar, 2400);
    };
    playBar();
  }
}
