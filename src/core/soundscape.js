// Paysage sonore synthétisé (aucun fichier audio) : chœur des oiseaux à l'aube (merle,
// mésange, pinson, rouge-gorge, moineaux, tourterelle, coucou, pic, loriot sous les
// tropiques, corneilles en hiver), mouettes au bord de la mer, grillons le soir,
// grenouilles près de l'eau, chouette la nuit, cigales l'été, vagues qui déferlent,
// feuillage au vent, source qui bouillonne, cris des animaux proches.

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
/** Rampe montante de a à b, palier, puis descente de c à d (en heures ; peut passer minuit). */
function trapezoid(h, a, b, c, d) {
  if (d < a) {
    // Plage qui passe minuit : les heures d'après minuit comptent au-delà de 24 h.
    if (h < a) h += 24;
    if (b < a) b += 24;
    if (c < a) c += 24;
    d += 24;
  }
  if (h <= a || h >= d) return 0;
  if (h < b) return (h - a) / (b - a);
  if (h <= c) return 1;
  return (d - h) / (d - c);
}

// Oiseaux chanteurs selon le lieu.
const BIRDS = {
  foret: ['merle', 'pinson', 'mesange', 'rougegorge', 'merle', 'pinson'],
  village: ['merle', 'mesange', 'moineau', 'rougegorge', 'pinson', 'moineau'],
  champs: ['merle', 'pinson', 'mesange', 'alouette', 'rougegorge'],
  mer: ['moineau', 'merle'],
  tropiques: ['loriot', 'loriot', 'moineau', 'merle'],
  montagne: ['mesange', 'pinson', 'rougegorge', 'mesange'],
  hiver: ['rougegorge', 'mesange', 'mesange'],
};
const PLACE = {
  foret: 'foret', pinede: 'foret', verger: 'village', village: 'village', prairie: 'champs', colline: 'champs',
  etang: 'champs', plage: 'mer', phare: 'mer', port: 'mer', lagon: 'mer', palmeraie: 'tropiques',
  belvedere: 'tropiques', corail: 'tropiques', bourg: 'montagne', pic: 'montagne', lac: 'montagne', source: 'montagne',
};
const WOODS = new Set(['foret', 'pinede', 'verger', 'palmeraie', 'source']);
const FRESH = new Set(['etang', 'lac', 'source']);
const HOT = new Set(['palmeraie', 'belvedere', 'corail', 'lagon', 'prairie', 'colline']);

export class Soundscape {
  constructor(audio) {
    this.audio = audio;
    this.t = {};
    this.crickets = Array.from({ length: 6 }, (_, i) => ({ t: rand(0, 2), f: 4300 + i * 130 + rand(-40, 40), pan: rand(-0.9, 0.9), far: rand(0.1, 0.7), period: rand(0.45, 0.8) }));
    this.frogs = Array.from({ length: 4 }, () => ({ t: rand(0, 3), f: rand(170, 320), pan: rand(-0.8, 0.8), far: rand(0.1, 0.6) }));
    this.gust = 0;
  }

  get ctx() {
    return this.audio.ctx;
  }

  /** Événement aléatoire, en moyenne `rate` fois par seconde (le taux peut varier). */
  timer(id, dt, rate, fn) {
    if (rate <= 0) return;
    const s = (this.t[id] ||= { acc: 0, next: rand(0.3, 1.2) });
    s.acc += dt * rate;
    if (s.acc >= s.next) {
      s.acc = 0;
      s.next = rand(0.5, 1.5);
      fn();
    }
  }

  // --- Briques de son ---------------------------------------------------------------

  /** Sortie placée dans l'espace : à gauche ou à droite, plus sourde au loin. */
  out(pan, far, nodes, bus = 'ambience') {
    const ctx = this.ctx;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 14000 * Math.pow(0.2, far);
    const g = ctx.createGain();
    g.gain.value = 1 - far * 0.55;
    p.connect(f).connect(g).connect(this.audio.buses[bus]);
    nodes.push(p, f, g);
    return p;
  }

  release(nodes, seconds) {
    setTimeout(() => {
      for (const n of nodes) n.disconnect();
    }, (seconds + 0.3) * 1000);
  }

  /**
   * Un chant d'une seule voix : notes enchaînées [départ, durée, fréquence de départ,
   * fréquence d'arrivée, volume], dans l'ordre et sans se chevaucher.
   */
  sing(notes, { type = 'sine', vol = 0.03, pan = 0, far = 0, vibrato = 0, rate = 6, formant = null, delay = 0, bus = 'ambience' } = {}) {
    const ctx = this.ctx;
    const nodes = [];
    const t0 = ctx.currentTime + 0.03 + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = notes[0][2];
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, t0);
    let end = 0;
    for (const [t, d, f0, f1 = f0, v = 1] of notes) {
      const a = t0 + t;
      osc.frequency.setValueAtTime(f0, a);
      if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, a + d);
      const atk = Math.min(0.015, d * 0.25);
      gain.gain.setValueAtTime(0, a);
      gain.gain.linearRampToValueAtTime(v * vol, a + atk);
      gain.gain.linearRampToValueAtTime(v * vol * 0.7, a + d * 0.75);
      gain.gain.linearRampToValueAtTime(0, a + d);
      end = Math.max(end, t + d);
    }
    let src = osc;
    if (vibrato) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rate;
      const depth = ctx.createGain();
      depth.gain.value = vibrato;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + end + 0.1);
      nodes.push(lfo, depth);
    }
    if (formant) {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = formant[0];
      f.Q.value = formant[1];
      src.connect(f);
      src = f;
      nodes.push(f);
    }
    src.connect(gain).connect(this.out(pan, far, nodes, bus));
    osc.start(t0);
    osc.stop(t0 + end + 0.1);
    nodes.push(osc, gain);
    this.release(nodes, delay + end + 0.2);
  }

  /** Bruit filtré (bouffée, vague, frappe) avec balayage de fréquence et enveloppe. */
  hiss({ t = 0, attack = 0.01, dur = 0.3, type = 'bandpass', f = 1000, f1 = f, fPeak = null, q = 0.7, vol = 0.05, pan = 0, far = 0, bus = 'ambience' } = {}) {
    const ctx = this.ctx;
    const nodes = [];
    const t0 = ctx.currentTime + 0.03 + t;
    const src = ctx.createBufferSource();
    src.buffer = this.audio.noiseBuffer(2);
    src.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.Q.value = q;
    // Fréquence posée dès la création : un saut depuis la valeur par défaut claque.
    flt.frequency.value = f;
    flt.frequency.setValueAtTime(f, t0);
    if (fPeak) {
      flt.frequency.exponentialRampToValueAtTime(fPeak, t0 + attack);
      flt.frequency.exponentialRampToValueAtTime(f1, t0 + attack + dur);
    } else if (f1 !== f) flt.frequency.exponentialRampToValueAtTime(f1, t0 + attack + dur);
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + dur);
    src.connect(flt).connect(g).connect(this.out(pan, far, nodes, bus));
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + attack + dur + 0.05);
    nodes.push(src, flt, g);
    this.release(nodes, t + attack + dur + 0.1);
  }

  /** Boucle continue (bruit filtré, éventuellement pulsé) dont on règle le niveau. */
  bed(id, { type = 'bandpass', f = 1000, q = 0.7, pulse = 0, depth = 0.8 } = {}) {
    this.beds ||= {};
    if (this.beds[id]) return this.beds[id];
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.audio.noiseBuffer(2);
    src.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    flt.Q.value = q;
    const level = ctx.createGain();
    level.gain.value = 0;
    let chain = src.connect(flt);
    if (pulse) {
      // Stridulation : volume battu très vite (cigales).
      const am = ctx.createGain();
      am.gain.value = 1 - depth / 2;
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = pulse;
      const d = ctx.createGain();
      d.gain.value = depth / 2;
      lfo.connect(d).connect(am.gain);
      lfo.start();
      chain = chain.connect(am);
    }
    chain.connect(level).connect(this.audio.buses.ambience);
    src.start();
    this.beds[id] = { level, flt };
    return this.beds[id];
  }

  setBed(id, value, opts, smooth = 0.6) {
    if (value < 0.0005 && !this.beds?.[id]) return null;
    const b = this.bed(id, opts);
    b.level.gain.setTargetAtTime(value, this.ctx.currentTime, smooth);
    return b;
  }

  // --- Oiseaux ------------------------------------------------------------------------

  bird(kind, pan, far) {
    const o = { pan, far };
    switch (kind) {
      case 'merle': {
        // Phrase flûtée et lente, terminée par un gazouillis aigu.
        const notes = [];
        let t = 0;
        const n = 4 + Math.floor(rand(0, 5));
        let f = rand(1500, 2300);
        for (let i = 0; i < n; i++) {
          const d = rand(0.09, 0.26);
          const f1 = f * rand(0.8, 1.3);
          notes.push([t, d, f, f1, rand(0.7, 1)]);
          t += d + rand(0.02, 0.07);
          f = Math.min(3400, Math.max(1300, f1 * rand(0.85, 1.2)));
        }
        for (let i = 0; i < 3; i++) {
          notes.push([t, 0.04, rand(4200, 6200), rand(3800, 6000), 0.4]);
          t += 0.055;
        }
        this.sing(notes, { ...o, vol: 0.03, vibrato: 25, rate: 18 });
        break;
      }
      case 'mesange': {
        // « Ti-tu ti-tu ti-tu » (mésange charbonnière).
        const hi = rand(4800, 5700);
        const lo = hi * rand(0.66, 0.74);
        const notes = [];
        const n = 3 + Math.floor(rand(0, 3));
        for (let i = 0; i < n; i++) {
          notes.push([i * 0.27, 0.07, hi, hi * 0.96, 0.8]);
          notes.push([i * 0.27 + 0.1, 0.1, lo, lo * 1.02, 1]);
        }
        this.sing(notes, { ...o, vol: 0.022 });
        break;
      }
      case 'pinson': {
        // Trille qui descend et accélère, puis une fioriture finale.
        const notes = [];
        let t = 0;
        let f = rand(5200, 6000);
        for (let i = 0; i < 6; i++) {
          notes.push([t, 0.035, f, f * 0.9, 0.7]);
          t += 0.062;
          f *= 0.97;
        }
        f *= 0.8;
        for (let i = 0; i < 5; i++) {
          notes.push([t, 0.03, f, f * 0.85, 0.9]);
          t += 0.048;
          f *= 0.97;
        }
        notes.push([t + 0.02, 0.07, 4300, 5200, 1]);
        notes.push([t + 0.1, 0.16, 5000, 2300, 0.9]);
        this.sing(notes, { ...o, vol: 0.02 });
        break;
      }
      case 'rougegorge': {
        // Gazouillis fin et très varié, notes perlées.
        const notes = [];
        let t = 0;
        const n = 9 + Math.floor(rand(0, 8));
        for (let i = 0; i < n; i++) {
          const d = rand(0.03, 0.13);
          notes.push([t, d, rand(2800, 7200), rand(2600, 7400), rand(0.5, 1)]);
          t += d + rand(0.01, 0.05);
        }
        this.sing(notes, { ...o, vol: 0.016 });
        break;
      }
      case 'moineau': {
        // Pépiements : « tchip, tchip ».
        const notes = [];
        const n = 2 + Math.floor(rand(0, 5));
        let t = 0;
        for (let i = 0; i < n; i++) {
          const f = rand(3000, 3800);
          notes.push([t, 0.06, f, f * 0.75, 1]);
          t += rand(0.16, 0.34);
        }
        this.sing(notes, { ...o, type: 'triangle', vol: 0.018, formant: [3300, 1.5] });
        break;
      }
      case 'alouette': {
        // Chant long et enjoué, haut dans le ciel.
        const notes = [];
        let t = 0;
        for (let i = 0; i < 22; i++) {
          const d = rand(0.03, 0.08);
          notes.push([t, d, rand(3500, 6500), rand(3500, 6500), rand(0.5, 1)]);
          t += d + 0.012;
        }
        this.sing(notes, { ...o, vol: 0.012, far: Math.max(far, 0.5) });
        break;
      }
      case 'loriot': {
        // Sifflement tropical en glissandos, « di-dli-o ».
        const f = rand(1300, 1700);
        this.sing([[0, 0.13, f, f * 1.25], [0.15, 0.1, f * 1.5, f * 1.2], [0.28, 0.32, f * 1.3, f * 0.95]], { ...o, vol: 0.03, vibrato: 12, rate: 9 });
        break;
      }
      case 'tourterelle': {
        // Roucoulement grave : « hou-HOUU-hou ».
        const f = rand(470, 560);
        this.sing([[0, 0.25, f * 0.95, f], [0.34, 0.5, f * 1.08, f * 0.93, 1.2], [0.95, 0.32, f, f * 0.9]], { ...o, vol: 0.045, type: 'sine', formant: [f * 1.2, 1] });
        break;
      }
      case 'coucou': {
        const n = 2 + Math.floor(rand(0, 3));
        const notes = [];
        for (let i = 0; i < n; i++) {
          notes.push([i * 0.95, 0.22, 710, 690]);
          notes.push([i * 0.95 + 0.29, 0.34, 585, 565]);
        }
        this.sing(notes, { ...o, vol: 0.035, far: Math.max(far, 0.4) });
        break;
      }
      case 'pic': {
        // Tambourinage du pic sur un tronc.
        const n = 14 + Math.floor(rand(0, 9));
        for (let i = 0; i < n; i++) {
          const k = 1 - i / (n + 4);
          this.hiss({ t: i * 0.058, attack: 0.002, dur: 0.03, f: 1100, q: 2.5, vol: 0.05 * k, pan, far: Math.max(far, 0.35) });
        }
        break;
      }
      case 'mouette': {
        // Cris nasillards : « kyaou » puis rire.
        const notes = [];
        let t = 0;
        notes.push([t, 0.08, 1250, 2150, 0.9]);
        notes.push([t + 0.08, 0.3, 2150, 1450, 1]);
        t = 0.55;
        const n = Math.floor(rand(0, 5));
        for (let i = 0; i < n; i++) {
          notes.push([t, 0.13, 1850, 1450, 0.8]);
          t += 0.19;
        }
        this.sing(notes, { ...o, type: 'sawtooth', vol: 0.02, formant: [1800, 1.4], vibrato: 30, rate: 22 });
        break;
      }
      case 'corneille': {
        const n = 1 + Math.floor(rand(0, 3));
        const notes = [];
        for (let i = 0; i < n; i++) notes.push([i * 0.42, 0.26, rand(520, 640), rand(430, 500)]);
        this.sing(notes, { ...o, type: 'sawtooth', vol: 0.02, formant: [1100, 1.2], vibrato: 40, rate: 35 });
        break;
      }
      case 'chouette': {
        // Hulotte : « hou-ou… hou, hou-hou-houuu ».
        this.sing(
          [[0, 0.55, 430, 405], [1.9, 0.12, 440, 430, 0.6], [2.15, 0.12, 445, 430, 0.7], [2.42, 0.14, 445, 430, 0.8], [2.72, 0.95, 455, 380]],
          { ...o, vol: 0.04, vibrato: 7, rate: 11, far: Math.max(far, 0.3) },
        );
        break;
      }
      default:
        break;
    }
  }

  // --- Insectes et grenouilles --------------------------------------------------------

  cricket(c) {
    // Stridulation : 3 ou 4 impulsions sur une note aiguë.
    const n = 3 + (Math.random() < 0.4 ? 1 : 0);
    const notes = [];
    for (let i = 0; i < n; i++) notes.push([i * 0.034, 0.02, c.f, c.f * 0.995]);
    this.sing(notes, { vol: 0.013, pan: c.pan, far: c.far });
  }

  frog(fr, loud) {
    // Coassement : impulsions rapides d'une voix grave nasillarde, « rrrèt ».
    const n = 6 + Math.floor(rand(0, 6));
    const notes = [];
    for (let i = 0; i < n; i++) notes.push([i * 0.028, 0.018, fr.f, fr.f * 0.97, i < 2 ? 0.6 : 1]);
    if (Math.random() < 0.5) notes.push([n * 0.028 + 0.08, 0.12, fr.f * 1.3, fr.f * 1.1, 0.8]);
    this.sing(notes, { type: 'sawtooth', vol: 0.028 * loud, pan: fr.pan, far: fr.far, formant: [fr.f * 3, 2] });
  }

  // --- Vagues --------------------------------------------------------------------------

  wave(level, storm) {
    // La vague monte, se brise, puis l'écume se retire en chuintant.
    const attack = rand(1, 1.7);
    const pan = rand(-0.5, 0.5);
    this.hiss({ type: 'lowpass', f: 220, fPeak: rand(1100, 1600) * (storm ? 1.3 : 1), f1: 350, attack, dur: rand(2.4, 3.4), q: 0.4, vol: level * 0.11, pan });
    this.hiss({ t: attack * 0.9, type: 'highpass', f: 2600, f1: 4200, attack: 0.25, dur: rand(1.6, 2.4), q: 0.5, vol: level * 0.028, pan: pan * 0.6 });
  }

  // --- Animaux --------------------------------------------------------------------------

  animal(species, pan, far) {
    const o = { pan, far };
    switch (species) {
      case 'mouton':
      case 'chevre': {
        const goat = species === 'chevre';
        const f = goat ? rand(430, 520) : rand(290, 370);
        this.sing([[0, goat ? 0.45 : 0.7, f, f * 0.94]], { ...o, type: 'sawtooth', vol: 0.02, vibrato: goat ? 22 : 14, rate: goat ? 10 : 7, formant: [goat ? 1400 : 1100, 1.3] });
        break;
      }
      case 'canard': {
        const n = 2 + Math.floor(rand(0, 3));
        const notes = [];
        for (let i = 0; i < n; i++) notes.push([i * 0.2, 0.11, rand(270, 310), 240]);
        this.sing(notes, { ...o, type: 'sawtooth', vol: 0.02, formant: [1250, 3] });
        break;
      }
      case 'poule': {
        const notes = [];
        let t = 0;
        const n = 3 + Math.floor(rand(0, 4));
        for (let i = 0; i < n; i++) {
          notes.push([t, 0.06, rand(560, 700), 520]);
          t += rand(0.14, 0.24);
        }
        if (Math.random() < 0.4) notes.push([t + 0.1, 0.4, 650, 900]);
        this.sing(notes, { ...o, type: 'triangle', vol: 0.02, formant: [1500, 1.5] });
        break;
      }
      case 'coq':
        this.sing([[0, 0.15, 620, 700], [0.2, 0.15, 700, 760], [0.4, 0.22, 820, 880], [0.66, 0.8, 880, 690]], { ...o, type: 'sawtooth', vol: 0.028, formant: [1500, 1.4], vibrato: 18, rate: 12, far: Math.max(far, 0.3) });
        break;
      case 'chat': {
        const f = rand(520, 640);
        this.sing([[0, 0.45, f, f * 1.35], [0.45, 0.25, f * 1.35, f * 0.85]], { ...o, type: 'sawtooth', vol: 0.014, formant: [1400, 2], vibrato: 8, rate: 6 });
        break;
      }
      case 'chien': {
        const n = 1 + Math.floor(rand(0, 3));
        for (let i = 0; i < n; i++) {
          this.sing([[i * 0.28, 0.1, rand(330, 400), 250]], { ...o, type: 'sawtooth', vol: 0.02, formant: [900, 1.5] });
          this.hiss({ t: i * 0.28, attack: 0.005, dur: 0.08, f: 800, q: 1, vol: 0.012, pan, far });
        }
        break;
      }
      default:
        break;
    }
  }

  // --- Mise à jour ------------------------------------------------------------------------

  /**
   * env : heure, saison (0 printemps … 3 hiver), pluie, orage, proximité de la mer, lieu
   * (zone), île, animaux proches [{ species, pan, far }], dedans / dehors.
   */
  update(dt, env) {
    if (!this.ctx) return;
    const { hour: h = 12, season = 1, rain = 0, storm = false, sea = 0, zone = null, island = 'main', animals = [], out = 1 } = env;
    const now = this.ctx.currentTime;
    const dry = clamp01(1 - rain * 1.6);
    const place = PLACE[zone] || (island === 'corail' ? 'tropiques' : island === 'pins' ? 'montagne' : 'champs');
    const woods = WOODS.has(zone) ? 1 : 0;
    const fresh = FRESH.has(zone) ? 1 : 0;

    // Vent dans les feuillages (bourrasques lentes), plus fort pendant l'orage.
    this.gust += dt * 0.35;
    const gust = 0.5 + Math.sin(this.gust) * 0.3 + Math.sin(this.gust * 2.7 + 1) * 0.2;
    const leaves = this.setBed('leaves', woods * out * (storm ? 0.05 : 0.018) * gust * (season === 3 && zone !== 'pinede' ? 0.4 : 1), { f: 2600, q: 0.4 }, 0.8);
    if (leaves) leaves.flt.frequency.setTargetAtTime(2000 + gust * 1600, now, 0.8);

    // Source chaude : bouillonnement.
    const spring = zone === 'source' ? out : 0;
    this.setBed('stream', spring * 0.02, { f: 1300, q: 0.6 });

    // Cigales : l'été, aux heures chaudes, dans les lieux ensoleillés.
    const cicada = (season === 1 && HOT.has(zone) ? trapezoid(h, 9.5, 11.5, 17, 19) : 0) * dry * out;
    this.setBed('cicadas', cicada * 0.011 * (0.6 + 0.4 * Math.sin(now * 0.4) ** 2), { f: 5600, q: 3, pulse: 95, depth: 0.9 }, 1.2);

    if (out < 0.5) return; // Dedans : seulement des sons étouffés (voir le filtre du bus).

    // Vagues qui déferlent.
    if (sea > 0.08) this.timer('wave', dt, (storm ? 1 / 4.5 : 1 / 7.5), () => this.wave(Math.min(1, sea * 1.4), storm));

    // Oiseaux : chœur à l'aube, plus calme l'après-midi, un peu le soir ; rares l'hiver.
    const daylight = trapezoid(h, 4.7, 6, 19.3, 20.8);
    const dawn = trapezoid(h, 4.8, 5.8, 7.8, 9.5);
    const evening = trapezoid(h, 17, 18.5, 19.5, 20.8);
    const siesta = trapezoid(h, 11.5, 13, 15, 16.5);
    const seasonK = [1.25, 1, 0.65, 0.3][season];
    const seaside = place === 'mer' ? 0.35 : 1;
    const birds = daylight * (0.5 + dawn * 1.0 + evening * 0.4 - siesta * 0.25) * seasonK * seaside * dry;
    const list = season === 3 ? BIRDS.hiver : BIRDS[place];
    this.timer('bird', dt, birds * 0.45, () => this.bird(pick(list), rand(-0.9, 0.9), rand(0, 0.8)));
    // Un deuxième chanteur à l'aube : les chants se répondent.
    this.timer('bird2', dt, birds * dawn * 0.2, () => this.bird(pick(list), rand(-0.9, 0.9), rand(0.3, 0.9)));
    if (place !== 'mer' && place !== 'montagne') this.timer('dove', dt, daylight * dry * (season === 3 ? 0 : 1 / 30), () => this.bird('tourterelle', rand(-0.8, 0.8), rand(0.2, 0.7)));
    if (season === 0 && (place === 'foret' || place === 'champs')) this.timer('cuckoo', dt, trapezoid(h, 5.5, 7, 12, 14) * dry / 40, () => this.bird('coucou', rand(-0.9, 0.9), 0.6));
    if (woods && zone !== 'palmeraie' && season !== 3) this.timer('pic', dt, trapezoid(h, 7, 8, 16, 18) * dry / 35, () => this.bird('pic', rand(-0.9, 0.9), rand(0.3, 0.7)));
    if (season === 3 || zone === 'pic' || zone === 'bourg') this.timer('crow', dt, daylight / 30, () => this.bird('corneille', rand(-0.9, 0.9), rand(0.3, 0.8)));
    // Mouettes au bord de la mer (et au port), le jour.
    if (sea > 0.15 || zone === 'port') this.timer('gull', dt, trapezoid(h, 5.5, 7, 19, 20.5) * (0.4 + sea) / 9, () => this.bird('mouette', rand(-0.9, 0.9), rand(0.1, 0.7)));
    // Chouette la nuit dans les bois.
    if (woods || zone === 'colline' || zone === 'village') this.timer('owl', dt, trapezoid(h, 21, 22.5, 4, 5.5) * dry / 45, () => this.bird('chouette', rand(-0.9, 0.9), rand(0.3, 0.7)));

    // Grillons : dès le soir, surtout l'été ; se taisent sous la pluie et l'hiver.
    const crick = trapezoid(h, 18.5, 20.5, 3, 5.5) * [0.35, 1, 0.75, 0][season] * dry * (place === 'mer' ? 0.4 : 1);
    const active = Math.round(crick * this.crickets.length);
    for (let i = 0; i < active; i++) {
      const c = this.crickets[i];
      c.t -= dt;
      if (c.t <= 0) {
        c.t = c.period * rand(0.9, 1.15);
        this.cricket(c);
      }
    }

    // Grenouilles près de l'étang, du lac et de la source : la nuit, et sous la pluie.
    if (fresh && season !== 3) {
      const frog = (trapezoid(h, 18.5, 20.5, 4, 6) + rain * 0.7) * [1, 0.9, 0.4, 0][season];
      const n = Math.round(clamp01(frog) * this.frogs.length);
      for (let i = 0; i < n; i++) {
        const fr = this.frogs[i];
        fr.t -= dt;
        if (fr.t <= 0) {
          fr.t = rand(0.8, 2.6);
          this.frog(fr, 0.7 + rain * 0.5);
        }
      }
    }

    // Source : bulles.
    if (spring) this.timer('bubble', dt, 5, () => {
      const f = rand(500, 1300);
      this.sing([[0, rand(0.03, 0.06), f, f * rand(1.4, 1.9)]], { vol: 0.012, pan: rand(-0.5, 0.5), far: rand(0, 0.5) });
    });

    // Animaux proches : un cri de temps en temps (le coq chante au lever du jour).
    for (const a of animals) {
      const rate = a.species === 'poule' ? 1 / 14 : a.species === 'chat' || a.species === 'chien' ? 1 / 40 : 1 / 22;
      this.timer(`a-${a.species}`, dt, rate * (h > 6 && h < 21 ? 1 : 0.2), () => this.animal(a.species, a.pan, a.far));
      if (a.species === 'poule') this.timer('coq', dt, trapezoid(h, 5, 5.8, 7.5, 9) / 18, () => this.animal('coq', a.pan * 0.6, Math.min(0.9, a.far + 0.3)));
    }
  }
}
