import * as THREE from 'three';
import { globalUniforms } from '../core/materials.js';
import { createRng, damp, clamp, smoothstep } from '../core/math.js';

// Saisons (3 jours chacune) et météo : ciel couvert, pluie, orage (éclairs et tonnerre),
// brouillard matinal, neige, arc-en-ciel ; pétales au printemps, feuilles en automne,
// aurores boréales les nuits d'hiver.

export const SEASONS = [
  { id: 'printemps', label: 'Printemps', emoji: '🌸' },
  { id: 'ete', label: 'Été', emoji: '☀️' },
  { id: 'automne', label: 'Automne', emoji: '🍂' },
  { id: 'hiver', label: 'Hiver', emoji: '❄️' },
];
export const DAYS_PER_SEASON = 3;

export const WEATHERS = {
  clair: { label: 'Ensoleillé', emoji: '☀️', night: '🌙', cloud: 0, rain: 0, snow: 0 },
  nuageux: { label: 'Nuageux', emoji: '⛅', night: '☁️', cloud: 0.55, rain: 0, snow: 0 },
  pluie: { label: 'Pluie', emoji: '🌧️', night: '🌧️', cloud: 0.9, rain: 1, snow: 0 },
  neige: { label: 'Neige', emoji: '🌨️', night: '🌨️', cloud: 0.7, rain: 0, snow: 1 },
  orage: { label: 'Orage', emoji: '⛈️', night: '⛈️', cloud: 1, rain: 1, snow: 0, storm: true },
  brouillard: { label: 'Brouillard', emoji: '🌫️', night: '🌫️', cloud: 0.3, rain: 0, snow: 0, fog: true },
};

const CHANCES = {
  printemps: [['clair', 0.45], ['nuageux', 0.22], ['pluie', 0.2], ['orage', 0.05], ['brouillard', 0.08]],
  ete: [['clair', 0.68], ['nuageux', 0.14], ['pluie', 0.06], ['orage', 0.1], ['brouillard', 0.02]],
  automne: [['clair', 0.3], ['nuageux', 0.3], ['pluie', 0.22], ['orage', 0.06], ['brouillard', 0.12]],
  hiver: [['clair', 0.35], ['nuageux', 0.22], ['neige', 0.38], ['brouillard', 0.05]],
};

const GREY_TOP = new THREE.Color('#8e9aad');
const GREY_HORIZON = new THREE.Color('#c3cad4');
const FLASH = new THREE.Color('#eef2ff');
const STORM_TOP = new THREE.Color('#4f5566');
const STORM_HORIZON = new THREE.Color('#7d8595');

function precipMaterial(kind) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: globalUniforms.uTime,
      uOrigin: { value: new THREE.Vector3() },
      uAmount: { value: 0 },
      uBox: { value: new THREE.Vector3(46, 24, 46) },
      uSpeed: { value: kind === 'rain' ? 19 : kind === 'snow' ? 1.8 : 1.2 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform vec3 uOrigin; uniform vec3 uBox; uniform float uSpeed; uniform float uAmount;
      varying vec2 vUv; varying float vA; varying float vSeed;
      float wrap(float v, float o, float w) { return o - w * 0.5 + mod(v - (o - w * 0.5), w); }
      void main() {
        vec3 base = instanceMatrix[3].xyz;
        float seed = fract(base.x * 0.137 + base.z * 0.071);
        vec3 c;
        c.y = uOrigin.y - uBox.y * 0.35 + mod(base.y - uTime * uSpeed * (0.8 + seed * 0.4), uBox.y);
        float sway = ${kind === 'rain' ? '0.0' : kind === 'snow' ? 'sin(uTime * 1.3 + seed * 20.0) * 0.8' : 'sin(uTime * 0.9 + seed * 20.0) * 2.2 + uTime * 1.4'};
        c.x = wrap(base.x + sway, uOrigin.x, uBox.x);
        c.z = wrap(base.z + ${kind === 'rain' ? '0.0' : kind === 'snow' ? 'cos(uTime * 1.1 + seed * 13.0) * 0.6' : 'cos(uTime * 0.7 + seed * 13.0) * 1.6 + uTime * 0.6'}, uOrigin.z, uBox.z);
        vec3 right = normalize(vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]));
        vec3 up = ${kind === 'rain' ? 'vec3(0.0, 1.0, 0.0)' : 'normalize(vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]))'};
        vec2 q = position.xy;
        ${kind === 'petal' || kind === 'leaf' ? 'float ang = uTime * (1.5 + seed * 2.0) + seed * 30.0; q = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q; q.x *= 0.55 + 0.45 * sin(uTime * 3.0 + seed * 9.0);' : ''}
        vec3 p = c + right * q.x + up * q.y;
        vUv = uv;
        vSeed = seed;
        vA = step(seed, uAmount);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; varying float vA; varying float vSeed;
      void main() {
        ${{
          rain: 'float a = (1.0 - abs(vUv.x - 0.5) * 2.0) * vUv.y * 0.55; vec3 col = vec3(0.8, 0.88, 1.0);',
          snow: 'float a = smoothstep(0.5, 0.2, length(vUv - 0.5)) * 0.95; vec3 col = vec3(1.0);',
          petal: 'vec2 d = vUv - 0.5; d.y *= 1.4; float a = smoothstep(0.5, 0.4, length(d) + abs(d.x) * 0.3); vec3 col = mix(vec3(1.0, 0.78, 0.86), vec3(1.0, 0.92, 0.95), vSeed);',
          leaf: 'vec2 d = vUv - 0.5; float a = smoothstep(0.5, 0.42, length(d * vec2(1.8, 1.0))); vec3 col = mix(vec3(0.95, 0.45, 0.15), vec3(0.98, 0.75, 0.25), fract(vSeed * 7.0)); col = mix(col, vec3(0.8, 0.25, 0.15), step(0.8, fract(vSeed * 13.0)));',
        }[kind]}
        if (vA < 0.5 || a < 0.01) discard;
        gl_FragColor = vec4(col, a);
      }`,
  });
}

function precipitation(kind, count) {
  const geo = kind === 'rain' ? new THREE.PlaneGeometry(0.035, 0.75) : kind === 'snow' ? new THREE.PlaneGeometry(0.13, 0.13) : new THREE.PlaneGeometry(0.2, 0.2);
  const mesh = new THREE.InstancedMesh(geo, precipMaterial(kind), count);
  const m = new THREE.Matrix4();
  const rng = createRng({ rain: 11, snow: 12, petal: 13, leaf: 14 }[kind]);
  for (let i = 0; i < count; i++) {
    m.makeTranslation(rng.range(0, 46), rng.range(0, 24), rng.range(0, 46));
    mesh.setMatrixAt(i, m);
  }
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  mesh.visible = false;
  return mesh;
}

function rainbow() {
  const geo = new THREE.TorusGeometry(70, 5, 12, 64, Math.PI);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: { uOpacity: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying vec3 vP;
      vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
      void main() {
        float r = length(vP.xy);
        float t = clamp((r - 65.0) / 10.0, 0.0, 1.0);
        float edge = smoothstep(0.0, 0.15, t) * smoothstep(1.0, 0.85, t);
        float fadeLow = smoothstep(0.0, 25.0, vP.y);
        gl_FragColor = vec4(hue(t * 0.8) * edge * fadeLow * uOpacity * 0.55, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  mesh.frustumCulled = false;
  return mesh;
}

export class Weather {
  constructor(scene, sky) {
    this.sky = sky;
    this.rain = precipitation('rain', 2600);
    this.snow = precipitation('snow', 1800);
    this.petals = precipitation('petal', 320);
    this.leaves = precipitation('leaf', 280);
    this.rainbow = rainbow();
    scene.add(this.rain, this.snow, this.petals, this.leaves, this.rainbow);
    this.petalAmt = 0;
    this.leafAmt = 0;
    this.fogAmt = 0;
    this.flash = 0;
    this.flashT = 6;
    this.fogScale = 1;
    this.cloud = 0;
    this.rainAmt = 0;
    this.snowAmt = 0;
    this.rainbowAmt = 0;
    this.current = 'clair';
    this.lastPeriod = null;
    this.rainbowUntil = -1;
    this.override = null;
  }

  get seasonIndex() {
    return Math.floor((this.sky.day - 1) / DAYS_PER_SEASON) % 4;
  }

  get season() {
    return SEASONS[this.seasonIndex];
  }

  get dayInSeason() {
    return ((this.sky.day - 1) % DAYS_PER_SEASON) + 1;
  }

  get isRaining() {
    return this.current === 'pluie' || this.current === 'orage';
  }

  get isStorm() {
    return this.current === 'orage';
  }

  get isSnowing() {
    return this.current === 'neige';
  }

  get info() {
    return WEATHERS[this.current];
  }

  /** Météo d'une période de 6 h, déterministe (la même après rechargement). */
  weatherFor(day, period) {
    const seasonId = SEASONS[Math.floor((day - 1) / DAYS_PER_SEASON) % 4].id;
    if (day === 1 && period < 3) return 'clair'; // un premier jour ensoleillé pour bien démarrer
    const rng = createRng(day * 131 + period * 17 + 7);
    let r = rng();
    for (const [id, p] of CHANCES[seasonId]) {
      r -= p;
      // Le brouillard ne tombe que le matin.
      if (r <= 0) return id === 'brouillard' && period > 1 ? 'nuageux' : id;
    }
    return 'clair';
  }

  /** Prévisions pour demain (matin / après-midi). */
  forecast() {
    const d = this.sky.day + 1;
    const a = WEATHERS[this.weatherFor(d, 1)];
    const b = WEATHERS[this.weatherFor(d, 2)];
    return a === b ? `${a.emoji} ${a.label}` : `${a.emoji} puis ${b.emoji} ${b.label.toLowerCase()}`;
  }

  absHours() {
    return this.sky.day * 24 + this.sky.hour;
  }

  update(dt, focus) {
    const sky = this.sky;
    const period = Math.floor(sky.hour / 6);
    const key = `${sky.day}-${period}`;
    if (key !== this.lastPeriod) {
      const prev = this.current;
      this.current = this.override || this.weatherFor(sky.day, period);
      if (prev === 'pluie' && this.current !== 'pluie' && this.lastPeriod !== null) this.rainbowUntil = this.absHours() + 1.5;
      this.lastPeriod = key;
    }
    const w = WEATHERS[this.current];
    this.cloud = damp(this.cloud, w.cloud, 0.6, dt);
    this.fogAmt = damp(this.fogAmt, w.fog ? 1 : 0, 0.4, dt);
    this.stormAmt = damp(this.stormAmt || 0, w.storm ? 1 : 0, 0.5, dt);
    sky.cloudCover = this.cloud;
    this.rainAmt = damp(this.rainAmt, w.rain, 0.5, dt);
    this.snowAmt = damp(this.snowAmt, w.snow, 0.5, dt);
    const showRainbow = this.absHours() < this.rainbowUntil && sky.hour > 7 && sky.hour < 18.5;
    this.rainbowAmt = damp(this.rainbowAmt, showRainbow ? 1 : 0, 0.8, dt);

    // Saisons : feuilles rousses en automne, neige en hiver (avec transitions douces).
    const si = this.seasonIndex;
    const t = (this.dayInSeason - 1 + sky.hour / 24) / DAYS_PER_SEASON; // 0 → 1 dans la saison
    let autumn = 0;
    let snow = 0;
    if (si === 2) autumn = smoothstep(0, 0.25, t);
    if (si === 3) {
      autumn = 1 - smoothstep(0, 0.15, t);
      snow = smoothstep(0.02, 0.2, t);
    }
    if (si === 0) snow = 1 - smoothstep(0, 0.12, t);
    globalUniforms.uAutumn.value = autumn;
    globalUniforms.uSnow.value = Math.max(snow, this.snowAmt * 0.6);
    globalUniforms.uWet.value = this.rainAmt;

    // Ciel plus gris quand c'est couvert.
    const c = this.cloud;
    const u = sky.domeUniforms;
    u.uTop.value.lerp(GREY_TOP, c * 0.65 * (1 - sky.nightFactor * 0.7));
    u.uHorizon.value.lerp(GREY_HORIZON, c * 0.55 * (1 - sky.nightFactor * 0.7));
    // Ciel d'orage : bien plus sombre.
    const st = this.stormAmt;
    if (st > 0.01) {
      u.uTop.value.lerp(STORM_TOP, st * 0.75 * (1 - sky.nightFactor * 0.6));
      u.uHorizon.value.lerp(STORM_HORIZON, st * 0.7 * (1 - sky.nightFactor * 0.6));
      sky.hemi.intensity *= 1 - st * 0.3;
    }
    sky.scene.fog.color.copy(u.uHorizon.value).lerp(u.uTop.value, 0.25);
    // Brouillard : lié à la distance d'affichage, plus dense par temps couvert ou brumeux.
    const fs = this.fogScale;
    sky.scene.fog.near = (70 - c * 35) * fs * (1 - this.fogAmt * 0.88);
    sky.scene.fog.far = (280 - c * 110) * fs * (1 - this.fogAmt * 0.7);
    if (this.fogAmt > 0.01) sky.scene.fog.color.lerp(GREY_HORIZON, this.fogAmt * 0.6 * (1 - sky.nightFactor * 0.8));
    sky.sun.intensity *= 1 - c * 0.65;
    sky.hemi.intensity *= 1 + c * 0.08;
    u.uSunColor.value.multiplyScalar(1 - c * 0.9);
    sky.cloudMat.color.lerp(GREY_TOP, c * 0.5).lerp(STORM_TOP, (this.stormAmt || 0) * 0.6);

    // Orage : éclairs (le ciel s'illumine) puis tonnerre.
    if (w.storm && dt > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) {
        this.flashT = 5 + Math.random() * 11;
        this.flash = 1;
        this.onThunder?.(0.4 + Math.random() * 1.6);
      }
    }
    this.flash = Math.max(0, this.flash - dt * 3.2);
    if (this.flash > 0) {
      const f = this.flash * (0.6 + Math.sin(this.flash * 40) * 0.4);
      u.uTop.value.lerp(FLASH, f * 0.7);
      u.uHorizon.value.lerp(FLASH, f * 0.6);
      sky.hemi.intensity += f * 1.6;
    }

    // Pétales au printemps, feuilles mortes en automne (pas sous la pluie).
    const calm = 1 - Math.max(this.rainAmt, this.snowAmt);
    this.petalAmt = damp(this.petalAmt, si === 0 ? calm * 0.9 : 0, 0.5, dt);
    this.leafAmt = damp(this.leafAmt, si === 2 ? calm * 0.8 : 0, 0.5, dt);
    for (const [m, amt] of [[this.petals, this.petalAmt], [this.leaves, this.leafAmt]]) {
      m.visible = amt > 0.02 && this.particlesOn !== false && !this.indoors;
      m.material.uniforms.uAmount.value = amt;
      m.material.uniforms.uOrigin.value.copy(focus);
    }

    // Aurores boréales : nuits d'hiver dégagées.
    u.uAurora.value = si === 3 ? sky.nightFactor * (1 - c) * (this.auroraBoost || 0.7) : 0;

    // Pluie et neige autour de la caméra.
    this.rain.visible = this.rainAmt > 0.02 && !this.indoors;
    this.snow.visible = this.snowAmt > 0.02 && !this.indoors;
    this.rain.material.uniforms.uAmount.value = this.rainAmt;
    this.snow.material.uniforms.uAmount.value = this.snowAmt;
    this.rain.material.uniforms.uOrigin.value.copy(focus);
    this.snow.material.uniforms.uOrigin.value.copy(focus);

    // Arc-en-ciel à l'opposé du soleil.
    this.rainbow.visible = this.rainbowAmt > 0.02;
    if (this.rainbow.visible) {
      const d = sky.sunDir;
      const ax = -d.x;
      const az = -d.z;
      const len = Math.hypot(ax, az) || 1;
      this.rainbow.position.set(focus.x + (ax / len) * 150, -8, focus.z + (az / len) * 150);
      this.rainbow.lookAt(focus.x, -8, focus.z);
      this.rainbow.material.uniforms.uOpacity.value = this.rainbowAmt;
    }
  }

  /** Pour les réglages / tests : force une météo. */
  force(id) {
    this.override = id;
    this.lastPeriod = null;
  }

  serialize() {
    return { rainbowUntil: this.rainbowUntil };
  }

  restore(d) {
    if (d?.rainbowUntil) this.rainbowUntil = d.rainbowUntil;
  }
}

export { clamp };
