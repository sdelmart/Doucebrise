import * as THREE from 'three';
import { smoothstep, clamp, createRng } from '../core/math.js';
import { Shape, G, toon, isRealistic } from '../core/materials.js';

// Cycle jour/nuit : ciel dégradé, soleil, lune, étoiles, nuages, lumières et brouillard.

const KEYS = [
  // h, haut du ciel, horizon, soleil, int. soleil, ciel hémi, sol hémi, int. hémi
  // (le jour : lumière d'hémisphère bleu ciel pastel en haut, pêche très douce en bas,
  // soleil crème doré)
  [0, '#101c40', '#28396c', '#a9bcff', 0.5, '#6676bd', '#2a3650', 0.85],
  [4.5, '#152350', '#34427a', '#a9bcff', 0.46, '#6a77ba', '#2c3650', 0.82],
  [5.6, '#3a4a8c', '#e59aa4', '#ffb89a', 0.5, '#9a8ab8', '#5a4a50', 0.75],
  [7, '#86bdf0', '#ffd3a8', '#ffd9a8', 1.6, '#ffe4d0', '#e0b08e', 1.0],
  [9.5, '#6fc4f5', '#d4f1fd', '#fff0d2', 2.3, '#d4eaff', '#f0c6a2', 1.1],
  [15.5, '#72c2f2', '#dff2fb', '#ffeccc', 2.2, '#d9edff', '#f2c8a4', 1.08],
  [18, '#7c8fd8', '#ffc08e', '#ffbd80', 1.5, '#ffd6c0', '#e2a886', 0.95],
  [19.4, '#46508e', '#f08f8a', '#ff9a78', 0.7, '#b58ab0', '#4d4658', 0.78],
  [20.8, '#1b2656', '#4a4a86', '#a9bcff', 0.48, '#6d76b8', '#2c3650', 0.84],
  [24, '#101c40', '#28396c', '#a9bcff', 0.5, '#6676bd', '#2a3650', 0.85],
];
// Rendu ACES (exposition 1,15, voir game.js) : Three.js multiplie l'image par exposition / 0,6
// avant de la compresser. Lumières et ciel sont donc atténués pour garder les mêmes tons
// moyens qu'avant, avec des hautes lumières plus douces.
const LIGHT_SCALE = { sun: 0.74, hemi: 0.84, ambient: 0.8, sky: 0.82 };
// Rendu réaliste : le ciel éclaire la scène (voir updateEnvironment) ; la lumière
// d'hémisphère et la lumière ambiante ne font plus que compléter.
export const REALISTIC_LIGHT = { env: 0.44, hemi: 0.27, ambient: 0.3, sun: 0.9 };

const _UP = new THREE.Vector3(0, 1, 0);
const _lx = new THREE.Vector3();
const _ly = new THREE.Vector3();
const _lz = new THREE.Vector3();
const _snap = new THREE.Vector3();

const KEY_COLORS = KEYS.map((k) => [k[0], new THREE.Color(k[1]), new THREE.Color(k[2]), new THREE.Color(k[3]), k[4], new THREE.Color(k[5]), new THREE.Color(k[6]), k[7]]);

export class DayNight {
  constructor(scene) {
    this.scene = scene;
    this.real = REALISTIC_LIGHT;
    this.hour = 8.5;
    this.day = 1;
    this.speed = 1;

    this.skyTop = new THREE.Color();
    this.skyHorizon = new THREE.Color();
    this.sunColor = new THREE.Color();
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.moonDir = new THREE.Vector3(0, -1, 0);

    // Lumières.
    this.hemi = new THREE.HemisphereLight('#e3f5ff', '#90b06a', 1.1);
    scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight('#ffffff', 0.18 * LIGHT_SCALE.ambient * (isRealistic() ? REALISTIC_LIGHT.ambient : 1));
    scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight('#fff6e4', 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -42;
    sc.right = 42;
    sc.top = 42;
    sc.bottom = -42;
    sc.near = 1;
    sc.far = 240;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.radius = 3; // ombres adoucies (filtrage PCF)
    scene.add(this.sun);
    scene.add(this.sun.target);

    scene.fog = new THREE.Fog('#d4f1fd', 70, 280);

    this.createDome();
    this.createClouds();
    this.update(0, new THREE.Vector3());
  }

  createDome() {
    this.domeUniforms = {
      uTop: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3() },
      uSunColor: { value: new THREE.Color() },
      uMoonDir: { value: new THREE.Vector3() },
      uMoonPhase: { value: Math.PI },
      uStars: { value: 0 },
      uTime: { value: 0 },
      uAurora: { value: 0 },
      uExposure: { value: LIGHT_SCALE.sky },
      uShootA: { value: [new THREE.Vector4(), new THREE.Vector4()] },
      uShootB: { value: [new THREE.Vector4(), new THREE.Vector4()] },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.domeUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSunColor;
        uniform vec3 uMoonDir; uniform float uMoonPhase; uniform float uStars; uniform float uTime; uniform float uAurora; uniform float uExposure;
        uniform vec4 uShootA[2]; uniform vec4 uShootB[2];
        varying vec3 vDir;
        float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise2(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
        }
        float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise2(p); p *= 2.03; a *= 0.5; } return v; }
        // Traînée d'étoile filante : a.xyz départ, b.xyz arrivée, a.w progression (0 → 1), b.w éclat.
        float streak(vec3 d, vec4 a, vec4 b) {
          if (b.w <= 0.0) return 0.0;
          float t = a.w;
          vec3 head = normalize(mix(a.xyz, b.xyz, t));
          vec3 tail = normalize(mix(a.xyz, b.xyz, max(t - 0.35, 0.0)));
          vec3 ba = head - tail;
          float k = clamp(dot(d - tail, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
          float dist = length(d - tail - ba * k);
          float w = mix(0.0006, 0.0028, k);
          return smoothstep(w, 0.0, dist) * k * k * sin(t * 3.14159) * b.w + smoothstep(0.006, 0.0, length(d - head)) * sin(t * 3.14159) * b.w * 0.8;
        }
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.62, h), 0.75));
          col = mix(col, uHorizon * 0.92, smoothstep(0.0, -0.25, h));
          float sd = dot(d, uSunDir);
          float sunVis = smoothstep(-0.12, 0.05, uSunDir.y);
          // Halo chaud autour du soleil, plus large quand il est bas (lever, coucher).
          float low = 1.0 - smoothstep(0.0, 0.45, uSunDir.y);
          col += uSunColor * (smoothstep(0.9982, 0.9990, sd) * 1.4 + pow(max(sd, 0.0), 48.0) * 0.3 + pow(max(sd, 0.0), 6.0) * (0.08 + low * 0.18)) * sunVis;
          col += uSunColor * pow(max(sd, 0.0), 2.0) * low * smoothstep(0.3, 0.0, abs(h)) * 0.25 * sunVis;
          float night = uStars;
          if (night > 0.01 && h > -0.05) {
            // Voie lactée : une bande nuageuse qui traverse le ciel.
            vec3 axis = normalize(vec3(0.35, 0.25, 1.0));
            float band = 1.0 - abs(dot(d, axis));
            float mw = smoothstep(0.78, 1.0, band) * fbm(d.xz * 6.0 + d.y * 3.0) ;
            col += vec3(0.55, 0.5, 0.8) * mw * 0.22 * night * smoothstep(0.0, 0.3, h);
            // Étoiles scintillantes, de couleurs variées.
            for (int layer = 0; layer < 2; layer++) {
              float scale = layer == 0 ? 140.0 : 260.0;
              vec3 p = d * scale;
              vec3 c = floor(p);
              float r = hash(c + float(layer) * 11.0);
              float thr = layer == 0 ? 0.965 : 0.93 - mw * 0.08;
              if (r > thr) {
                vec3 o = vec3(hash(c + 1.3), hash(c + 7.1), hash(c + 3.7)) - 0.5;
                float s = length(fract(p) - 0.5 - o * 0.5);
                float tw = 0.55 + 0.45 * sin(uTime * (1.5 + r * 4.0) + r * 40.0);
                vec3 sc = mix(vec3(1.0, 0.85, 0.7), vec3(0.75, 0.85, 1.0), hash(c + 5.5));
                float size = layer == 0 ? 0.12 : 0.09;
                col += sc * smoothstep(size, 0.0, s) * night * tw * smoothstep(0.0, 0.25, h) * (layer == 0 ? 1.0 : 0.55);
              }
            }
            // Aurore boréale (nuits d'hiver) : rideaux ondulants vers le nord.
            if (uAurora > 0.01) {
              float az = atan(d.x, -d.z);
              float north = smoothstep(-0.2, 0.6, -d.z);
              float wave = sin(az * 5.0 + uTime * 0.25 + sin(az * 11.0 - uTime * 0.18) * 1.4) * 0.5 + 0.5;
              float curtain = pow(wave, 2.5) * (0.55 + 0.45 * sin(az * 90.0 + uTime * 0.7 + fbm(vec2(az * 8.0, uTime * 0.1)) * 6.0));
              float hb = smoothstep(0.04, 0.2, h) * smoothstep(0.75, 0.25, h - wave * 0.12);
              vec3 ac = mix(vec3(0.25, 1.0, 0.65), vec3(0.75, 0.35, 1.0), smoothstep(0.2, 0.6, h + wave * 0.15));
              col += ac * curtain * hb * north * uAurora * 0.55;
            }
          }
          // Lune, avec ses phases et ses cratères.
          float md = dot(d, uMoonDir);
          float moonVis = smoothstep(-0.1, 0.1, uMoonDir.y);
          if (md > 0.995) {
            vec3 up = abs(uMoonDir.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
            vec3 tx = normalize(cross(up, uMoonDir));
            vec3 ty = cross(uMoonDir, tx);
            vec3 rel = d - uMoonDir * md;
            vec2 uv = vec2(dot(rel, tx), dot(rel, ty)) / 0.03;
            float r2 = dot(uv, uv);
            if (r2 < 1.0) {
              vec3 n = vec3(uv, sqrt(1.0 - r2));
              vec3 L = vec3(sin(uMoonPhase), 0.0, -cos(uMoonPhase));
              float lit = smoothstep(-0.08, 0.12, dot(n, L));
              float crater = fbm(uv * 3.5 + 7.0);
              vec3 mc = vec3(1.0, 0.97, 0.9) * (0.82 + crater * 0.3);
              float edge = smoothstep(1.0, 0.94, r2);
              col = mix(col, mc * max(lit, 0.08) * 1.15, edge * moonVis);
            }
          }
          col += vec3(0.9, 0.92, 1.0) * pow(max(md, 0.0), 160.0) * 0.22 * moonVis * night;
          col += vec3(0.8, 0.85, 1.0) * pow(max(md, 0.0), 12.0) * 0.05 * moonVis * night;
          // Étoiles filantes.
          if (night > 0.01) {
            float st = streak(d, uShootA[0], uShootB[0]) + streak(d, uShootA[1], uShootB[1]);
            col += vec3(1.0, 0.95, 0.85) * st * 1.6;
          }
          gl_FragColor = vec4(col * uExposure, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(450, 48, 24), mat);
    this.dome.renderOrder = -1;
    this.dome.frustumCulled = false;
    this.scene.add(this.dome);
    this.shooting = [null, null];
  }

  /** Lance une étoile filante (vers un point de vue donné, sinon au hasard). */
  spawnShootingStar(eye = null, look = null) {
    const slot = this.shooting[0] ? (this.shooting[1] ? -1 : 1) : 0;
    if (slot < 0) return null;
    let base;
    if (eye && look) base = look.clone().sub(eye).normalize();
    else {
      const a = Math.random() * Math.PI * 2;
      base = new THREE.Vector3(Math.cos(a), 0.55 + Math.random() * 0.3, Math.sin(a)).normalize();
    }
    base.y = Math.max(base.y, 0.3);
    base.normalize();
    const side = new THREE.Vector3(-base.z, 0, base.x).normalize();
    const a = base.clone().addScaledVector(side, -0.28).add(new THREE.Vector3(0, 0.12, 0)).normalize();
    const b = base.clone().addScaledVector(side, 0.3).add(new THREE.Vector3(0, -0.14, 0)).normalize();
    if (Math.random() < 0.5) a.x = -a.x, b.x = -b.x;
    const s = { a, b, t: 0, dur: 1.1 + Math.random() * 0.6, slot };
    this.shooting[slot] = s;
    this.onShootingStar?.(s);
    return s;
  }

  updateShooting(dt) {
    const u = this.domeUniforms;
    for (let i = 0; i < 2; i++) {
      const s = this.shooting[i];
      if (!s) {
        u.uShootB.value[i].w = 0;
        continue;
      }
      s.t += dt / s.dur;
      if (s.t >= 1) {
        this.shooting[i] = null;
        u.uShootB.value[i].w = 0;
        continue;
      }
      u.uShootA.value[i].set(s.a.x, s.a.y, s.a.z, s.t);
      u.uShootB.value[i].set(s.b.x, s.b.y, s.b.z, 1);
    }
  }

  createClouds() {
    const rng = createRng(77);
    this.clouds = new THREE.Group();
    this.cloudMat = toon('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.25 });
    for (let i = 0; i < 40; i++) {
      const s = new Shape();
      const puffs = rng.int(5, 9);
      const big = rng() < 0.35;
      for (let p = 0; p < puffs; p++) {
        const r = rng.range(3, 6.5) * (big ? 1.5 : 1);
        const cx = (p - puffs / 2) * 4 * (big ? 1.4 : 1) + rng.range(-1, 1);
        // Le centre du nuage est plus haut que ses bords.
        const cy = Math.cos((p / (puffs - 1) - 0.5) * Math.PI) * rng.range(1.2, 3.2);
        s.add(G.sphere(r, 12, 9), '#ffffff', { pos: [cx, cy, rng.range(-2.5, 2.5)], scale: [1, 0.72, 1] });
      }
      // Base plate.
      s.add(G.sphere(1, 16, 8), '#ffffff', { pos: [0, -0.4, 0], scale: [puffs * 2.3 * (big ? 1.4 : 1), 1.6, 5.5] });
      const m = new THREE.Mesh(s.build(), this.cloudMat);
      const a = rng.range(0, Math.PI * 2);
      const d = rng.range(40, 230);
      m.position.set(Math.cos(a) * d, rng.range(52, 82), Math.sin(a) * d);
      m.rotation.y = rng.range(-0.3, 0.3);
      m.userData.speed = rng.range(0.6, 1.4);
      m.userData.rank = rng();
      this.clouds.add(m);
    }
    this.cloudQuality = 0.6;
    this.cloudCover = 0;
    this.scene.add(this.clouds);
  }

  get nightFactor() {
    // 0 en plein jour, 1 en pleine nuit.
    const h = this.hour;
    return 1 - smoothstep(5.2, 7.2, h) * smoothstep(20.6, 18.8, h);
  }

  get isNight() {
    return this.hour < 5.5 || this.hour >= 20.3;
  }

  /** Durée réelle d'une heure de jeu : journées lentes, nuits plus courtes. */
  secondsPerHour() {
    return this.hour >= 6 && this.hour < 20 ? 45 : 22;
  }

  timeLabel() {
    const h = Math.floor(this.hour);
    const m = Math.floor((this.hour - h) * 60 / 10) * 10;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  update(dt, focus, elapsed = 0) {
    this.hour += (dt * this.speed) / this.secondsPerHour();
    if (this.hour >= 24) {
      this.hour -= 24;
      this.day += 1;
    }
    this.interpolate(this.hour);

    // Soleil : lever à 6h à l'est (+X), coucher à 19h30 à l'ouest.
    const sunT = (this.hour - 6) / 13.5;
    const sa = sunT * Math.PI;
    this.sunDir.set(Math.cos(sa), Math.sin(sa) * 0.95, -0.35).normalize();
    const moonT = ((this.hour + 24 - 19.5) % 24) / 10.5;
    const ma = moonT * Math.PI;
    this.moonDir.set(Math.cos(ma), Math.sin(ma) * 0.85 + 0.05, 0.3).normalize();

    const sunUp = this.sunDir.y > 0.02;
    const lightDir = sunUp ? this.sunDir : this.moonDir;
    const horizonFade = clamp(Math.abs(lightDir.y) * 6, 0, 1);
    this.sun.intensity = this.sunIntensity * horizonFade * (isRealistic() ? REALISTIC_LIGHT.sun : 1);
    this.scene.environmentIntensity = REALISTIC_LIGHT.env;
    this.sun.color.copy(this.sunColor);
    // Ombres stables : le cadre de la carte d'ombre avance par pas d'un texel (sinon les
    // bords des ombres scintillent quand on marche).
    const sc = this.sun.shadow.camera;
    const texel = (sc.right - sc.left) / Math.max(1, this.sun.shadow.mapSize.x);
    _lz.copy(lightDir).negate();
    _lx.crossVectors(_UP, _lz);
    if (_lx.lengthSq() < 1e-6) _lx.set(1, 0, 0);
    _lx.normalize();
    _ly.crossVectors(_lz, _lx);
    const fx = Math.round(focus.dot(_lx) / texel) * texel;
    const fy = Math.round(focus.dot(_ly) / texel) * texel;
    _snap.copy(_lx).multiplyScalar(fx).addScaledVector(_ly, fy).addScaledVector(_lz, focus.dot(_lz));
    this.sun.position.copy(_snap).addScaledVector(lightDir, 110);
    this.sun.target.position.copy(_snap);

    const u = this.domeUniforms;
    u.uTop.value.copy(this.skyTop);
    u.uHorizon.value.copy(this.skyHorizon);
    u.uSunDir.value.copy(this.sunDir);
    u.uSunColor.value.copy(this.sunColor);
    u.uMoonDir.value.copy(this.moonDir);
    u.uStars.value = this.nightFactor;
    u.uTime.value = elapsed;
    this.dome.position.copy(focus);

    this.scene.fog.color.copy(this.skyHorizon).lerp(this.skyTop, 0.25);

    const nf = this.nightFactor;
    this.cloudMat.color.setRGB(1, 1, 1).lerp(this.skyTop, 0.3 + nf * 0.35);
    // Nuages dorés au lever et au coucher du soleil.
    const golden = sunUp ? 1 - smoothstep(0.05, 0.4, this.sunDir.y) : 0;
    this.cloudMat.emissive.copy(this.skyHorizon).multiplyScalar(0.3).lerp(this.sunColor, golden * 0.35);
    // Couverture : quelques nuages par beau temps, beaucoup quand c'est couvert.
    const shown = this.cloudQuality * (0.35 + this.cloudCover * 0.65);
    for (const c of this.clouds.children) {
      c.visible = c.userData.rank < shown;
      if (!c.visible) continue;
      c.position.x += dt * c.userData.speed * (0.8 + this.cloudCover * 1.2);
      if (c.position.x - focus.x > 240) c.position.x -= 480;
      if (c.position.x - focus.x < -240) c.position.x += 480;
      if (c.position.z - focus.z > 240) c.position.z -= 480;
      if (c.position.z - focus.z < -240) c.position.z += 480;
    }
    // Phase de la lune (cycle de 8 jours) et étoiles filantes.
    u.uMoonPhase.value = ((this.day % 8) / 8) * Math.PI * 2 + Math.PI;
    if (dt > 0 && nf > 0.85 && this.cloudCover < 0.5) {
      this.shootT = (this.shootT ?? 8) - dt;
      if (this.shootT <= 0) {
        const [a, b] = this.shootEvery || [18, 40];
        this.shootT = a + Math.random() * (b - a);
        this.spawnShootingStar();
      }
    }
    this.updateShooting(dt);
  }

  /**
   * Éclairage d'environnement (rendu réaliste) : le ciel du moment, flouté, éclaire tous
   * les matériaux et s'y reflète ; un sol vert-brun renvoie un peu de lumière par en
   * dessous. Recalculé quand l'heure a assez changé (ou à la demande).
   */
  updateEnvironment(renderer, force = false) {
    if (!isRealistic()) return;
    if (!this.pmrem) {
      this.pmrem = new THREE.PMREMGenerator(renderer);
      this.envScene = new THREE.Scene();
      this.envScene.add(new THREE.Mesh(this.dome.geometry, this.dome.material));
      const ground = new THREE.SphereGeometry(400, 32, 12, 0, Math.PI * 2, Math.PI / 2 + 0.03, Math.PI / 2 - 0.03);
      this.envGround = new THREE.Mesh(ground, new THREE.MeshBasicMaterial({ color: '#56703e', side: THREE.BackSide, fog: false }));
      this.envScene.add(this.envGround);
      this.envCube = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
      this.envCamera = new THREE.CubeCamera(1, 1000, this.envCube);
      this.envGroundTint = new THREE.Color('#4a6a36');
    }
    if (!force && this.envHour !== undefined && Math.abs(this.hour - this.envHour) < 0.12 && Math.abs((this.cloudCover || 0) - this.envCover) < 0.1) return;
    this.envHour = this.hour;
    this.envCover = this.cloudCover || 0;
    const day = 1 - this.nightFactor;
    this.envGround.material.color.copy(this.hemi.groundColor).lerp(this.envGroundTint, 0.5).multiplyScalar(0.18 + 0.3 * day);
    // Toujours la même texture d'environnement, mise à jour sur place : les matériaux
    // n'ont pas à se reconfigurer (pas de petit à-coup toutes les quelques secondes).
    this.envCamera.update(renderer, this.envScene);
    this.envRT = this.pmrem.fromCubemap(this.envCube.texture, this.envRT || null);
    this.scene.environment = this.envRT.texture;
  }

  interpolate(h) {
    let i = 0;
    while (i < KEY_COLORS.length - 2 && KEY_COLORS[i + 1][0] <= h) i++;
    const a = KEY_COLORS[i];
    const b = KEY_COLORS[i + 1];
    const t = smoothstep(0, 1, (h - a[0]) / (b[0] - a[0]));
    this.skyTop.copy(a[1]).lerp(b[1], t);
    this.skyHorizon.copy(a[2]).lerp(b[2], t);
    this.sunColor.copy(a[3]).lerp(b[3], t);
    this.sunIntensity = (a[4] + (b[4] - a[4]) * t) * LIGHT_SCALE.sun;
    this.hemi.color.copy(a[5]).lerp(b[5], t);
    this.hemi.groundColor.copy(a[6]).lerp(b[6], t);
    this.hemi.intensity = (a[7] + (b[7] - a[7]) * t) * LIGHT_SCALE.hemi * (isRealistic() ? REALISTIC_LIGHT.hemi : 1);
  }
}
