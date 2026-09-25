import * as THREE from 'three';
import { smoothstep, clamp, createRng } from '../core/math.js';
import { Shape, G, toon } from '../core/materials.js';

// Cycle jour/nuit : ciel dégradé, soleil, lune, étoiles, nuages, lumières et brouillard.

const KEYS = [
  // h, haut du ciel, horizon, soleil, int. soleil, ciel hémi, sol hémi, int. hémi
  [0, '#101c40', '#28396c', '#a9bcff', 0.5, '#6676bd', '#2a3650', 0.85],
  [4.5, '#152350', '#34427a', '#a9bcff', 0.46, '#6a77ba', '#2c3650', 0.82],
  [5.6, '#3a4a8c', '#e59aa4', '#ffb89a', 0.5, '#9a8ab8', '#4a4a50', 0.75],
  [7, '#86bdf0', '#ffd3a8', '#ffd6a6', 1.6, '#ffe7d2', '#8a9a66', 1.0],
  [9.5, '#6fc4f5', '#d4f1fd', '#fff6e4', 2.3, '#e3f5ff', '#90b06a', 1.1],
  [15.5, '#72c2f2', '#dff2fb', '#fff1dc', 2.2, '#e8f3ff', '#94ae6a', 1.08],
  [18, '#7c8fd8', '#ffc08e', '#ffbd80', 1.5, '#ffd9c2', '#8a8a60', 0.95],
  [19.4, '#46508e', '#f08f8a', '#ff9a78', 0.7, '#b58ab0', '#4d4658', 0.78],
  [20.8, '#1b2656', '#4a4a86', '#a9bcff', 0.48, '#6d76b8', '#2c3650', 0.84],
  [24, '#101c40', '#28396c', '#a9bcff', 0.5, '#6676bd', '#2a3650', 0.85],
];
const KEY_COLORS = KEYS.map((k) => [k[0], new THREE.Color(k[1]), new THREE.Color(k[2]), new THREE.Color(k[3]), k[4], new THREE.Color(k[5]), new THREE.Color(k[6]), k[7]]);

export class DayNight {
  constructor(scene) {
    this.scene = scene;
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
    this.ambient = new THREE.AmbientLight('#ffffff', 0.18);
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
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
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
      uStars: { value: 0 },
      uTime: { value: 0 },
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
        uniform vec3 uMoonDir; uniform float uStars; uniform float uTime;
        varying vec3 vDir;
        float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.62, h), 0.75));
          col = mix(col, uHorizon * 0.92, smoothstep(0.0, -0.25, h));
          float sd = dot(d, uSunDir);
          float sunVis = smoothstep(-0.12, 0.05, uSunDir.y);
          col += uSunColor * (smoothstep(0.9982, 0.9990, sd) * 1.2 + pow(max(sd, 0.0), 48.0) * 0.28 + pow(max(sd, 0.0), 6.0) * 0.08) * sunVis;
          float md = dot(d, uMoonDir);
          float moonVis = smoothstep(-0.1, 0.1, uMoonDir.y);
          col += vec3(1.0, 0.96, 0.88) * (smoothstep(0.9993, 0.9996, md) * 0.9 + pow(max(md, 0.0), 180.0) * 0.18) * moonVis;
          if (uStars > 0.01 && h > 0.0) {
            vec3 p = d * 140.0;
            vec3 c = floor(p);
            float r = hash(c);
            if (r > 0.965) {
              vec3 o = vec3(hash(c + 1.3), hash(c + 7.1), hash(c + 3.7)) - 0.5;
              float s = length(fract(p) - 0.5 - o * 0.5);
              float tw = 0.6 + 0.4 * sin(uTime * (1.5 + r * 3.0) + r * 40.0);
              col += vec3(1.0, 0.95, 0.85) * smoothstep(0.12, 0.0, s) * uStars * tw * smoothstep(0.0, 0.25, h);
            }
          }
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), mat);
    this.dome.renderOrder = -1;
    this.dome.frustumCulled = false;
    this.scene.add(this.dome);
  }

  createClouds() {
    const rng = createRng(77);
    this.clouds = new THREE.Group();
    this.cloudMat = toon('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.25 });
    for (let i = 0; i < 16; i++) {
      const s = new Shape();
      const puffs = rng.int(4, 7);
      for (let p = 0; p < puffs; p++) {
        const r = rng.range(3, 6.5);
        s.add(G.sphere(r, 12, 9), '#ffffff', {
          pos: [(p - puffs / 2) * 4 + rng.range(-1, 1), rng.range(0, 2.5), rng.range(-2.5, 2.5)],
          scale: [1, 0.75, 1],
        });
      }
      const m = new THREE.Mesh(s.build(), this.cloudMat);
      const a = rng.range(0, Math.PI * 2);
      const d = rng.range(40, 170);
      m.position.set(Math.cos(a) * d, rng.range(48, 70), Math.sin(a) * d);
      m.rotation.y = rng.range(0, Math.PI);
      m.userData.speed = rng.range(0.6, 1.4);
      this.clouds.add(m);
    }
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
    this.sun.intensity = this.sunIntensity * horizonFade;
    this.sun.color.copy(this.sunColor);
    this.sun.position.copy(focus).addScaledVector(lightDir, 110);
    this.sun.target.position.copy(focus);

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
    this.cloudMat.color.setRGB(1, 1, 1).lerp(this.skyTop, 0.35 + nf * 0.3);
    this.cloudMat.emissive.copy(this.skyHorizon).multiplyScalar(0.35);
    for (const c of this.clouds.children) {
      c.position.x += dt * c.userData.speed * 0.8;
      if (c.position.x > 190) c.position.x = -190;
    }
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
    this.sunIntensity = a[4] + (b[4] - a[4]) * t;
    this.hemi.color.copy(a[5]).lerp(b[5], t);
    this.hemi.groundColor.copy(a[6]).lerp(b[6], t);
    this.hemi.intensity = a[7] + (b[7] - a[7]) * t;
  }
}
