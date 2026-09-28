import * as THREE from 'three';

// Feux d'artifice : fusées qui montent en laissant une traînée, puis éclatent en pivoine,
// saule doré, anneau, cœur (face à la caméra) ou étoiles crépitantes. Particules calculées
// sur le processeur, dessinées en un seul appel (points additifs). La détonation arrive
// avec le retard du son (340 m/s).

const MAX = 3000;
const GRAVITY = -5.5;
const rand = (a, b) => a + Math.random() * (b - a);

export const FIREWORK_COLORS = ['#ff5a7a', '#ffd84d', '#6fe0ff', '#b98cff', '#7dff9a', '#ff9a3d', '#ffffff', '#ff8fd8'];
const KINDS = ['pivoine', 'pivoine', 'saule', 'anneau', 'coeur', 'crepitant', 'palmier'];

export class Fireworks {
  constructor(scene, audio) {
    this.audio = audio;
    this.parts = [];
    this.rockets = [];
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.alpha = new Float32Array(MAX);
    this.size = new Float32Array(MAX);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    this.uniforms = { uScale: { value: 600 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec3 color; attribute float alpha; attribute float size; uniform float uScale;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(uScale * size / -mv.z, 1.5, 48.0);
          vColor = color; vAlpha = alpha;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float core = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(mix(vColor, vec3(1.0), core * core * 0.6) * core, core * vAlpha);
        }`,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.tmp = new THREE.Vector3();
  }

  get busy() {
    return this.parts.length > 0 || this.rockets.length > 0;
  }

  /**
   * Lance une fusée depuis `from` ; elle éclate vers `height` mètres plus haut.
   * camera : pour tourner les cœurs vers le joueur et placer le son.
   */
  launch(from, { color = null, kind = null, height = rand(17, 26), camera = null } = {}) {
    const c = new THREE.Color(color || FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);
    const k = kind || KINDS[Math.floor(Math.random() * KINDS.length)];
    const speed = rand(22, 27);
    this.rockets.push({
      p: new THREE.Vector3(from.x, from.y, from.z),
      v: new THREE.Vector3(rand(-1.2, 1.2), speed, rand(-1.2, 1.2)),
      life: Math.max(0.8, height / speed),
      color: c,
      kind: k,
      trailT: 0,
      camera,
    });
    this.sound('launch', from, camera);
  }

  /** Son placé : plus faible et en retard au loin, à gauche ou à droite. */
  sound(kind, p, camera) {
    const a = this.audio;
    if (!a?.ctx || !camera) return;
    const d = camera.position.distanceTo(p);
    const right = this.tmp.set(1, 0, 0).applyQuaternion(camera.quaternion);
    const dir = p.clone().sub(camera.position).normalize();
    a.firework(kind, { delay: kind === 'launch' ? 0 : d / 340, dist: d, pan: dir.dot(right) * 0.7 });
  }

  burst(r) {
    const n = r.kind === 'saule' ? 110 : r.kind === 'coeur' ? 90 : r.kind === 'anneau' ? 70 : r.kind === 'palmier' ? 36 : 120;
    const base = r.color;
    const alt = base.clone().offsetHSL(rand(-0.08, 0.08), 0, 0.12);
    const cam = r.camera;
    const right = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3(0, 1, 0);
    if (cam) right.set(1, 0, 0).applyQuaternion(cam.quaternion).setY(0).normalize();
    // Plan de l'anneau : incliné au hasard.
    const ringN = new THREE.Vector3(rand(-1, 1), rand(0.4, 1), rand(-1, 1)).normalize();
    const ringA = new THREE.Vector3().crossVectors(ringN, up).normalize();
    const ringB = new THREE.Vector3().crossVectors(ringN, ringA).normalize();
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3();
      let life = rand(1.4, 2.1);
      let drag = 1.6;
      let grav = 1;
      let size = 0.8;
      if (r.kind === 'coeur') {
        const t = (i / n) * Math.PI * 2;
        const x = 16 * Math.sin(t) ** 3;
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        v.copy(right).multiplyScalar(x * 0.55).addScaledVector(up, y * 0.55);
        grav = 0.25;
        drag = 2.2;
      } else if (r.kind === 'anneau') {
        const t = (i / n) * Math.PI * 2;
        v.copy(ringA).multiplyScalar(Math.cos(t) * 13).addScaledVector(ringB, Math.sin(t) * 13);
      } else {
        // Direction au hasard sur la sphère.
        const u = rand(-1, 1);
        const th = rand(0, Math.PI * 2);
        const s = Math.sqrt(1 - u * u);
        const sp = r.kind === 'saule' ? rand(7, 10) : r.kind === 'palmier' ? rand(11, 14) : rand(9, 14);
        v.set(s * Math.cos(th), u, s * Math.sin(th)).multiplyScalar(sp);
        if (r.kind === 'saule') {
          life = rand(2.8, 3.6);
          drag = 1.1;
          grav = 0.7;
          size = 0.65;
        } else if (r.kind === 'palmier') {
          life = rand(2, 2.6);
          size = 1.0;
        } else if (r.kind === 'crepitant') {
          life = rand(1.2, 1.9);
          size = 0.6;
        }
      }
      const gold = r.kind === 'saule' || r.kind === 'palmier';
      this.parts.push({
        p: r.p.clone(),
        v,
        age: 0,
        life,
        drag,
        grav,
        size,
        c: gold ? new THREE.Color('#ffc75a') : i % 3 === 0 ? alt : base,
        twinkle: r.kind === 'crepitant',
        trail: gold || r.kind === 'pivoine',
        trailT: rand(0, 0.05),
      });
    }
    // Éclair central.
    this.parts.push({ p: r.p.clone(), v: new THREE.Vector3(), age: 0, life: 0.25, drag: 0, grav: 0, size: 5, c: new THREE.Color('#fff6e0') });
    this.sound(r.kind === 'crepitant' ? 'crackle' : 'boom', r.p, cam);
  }

  update(dt, camera) {
    if (!this.busy) {
      this.points.geometry.setDrawRange(0, 0);
      return;
    }
    this.uniforms.uScale.value = window.innerHeight;
    // Fusées : montée avec une traînée d'étincelles.
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.v.y += GRAVITY * 0.35 * dt;
      r.p.addScaledVector(r.v, dt);
      r.life -= dt;
      r.trailT -= dt;
      if (r.trailT <= 0) {
        r.trailT = 0.02;
        this.parts.push({ p: r.p.clone(), v: new THREE.Vector3(rand(-0.4, 0.4), -1, rand(-0.4, 0.4)), age: 0, life: 0.5, drag: 2, grav: 0.3, size: 0.45, c: new THREE.Color('#ffd9a0') });
      }
      if (r.life <= 0) {
        this.rockets.splice(i, 1);
        r.camera = r.camera || camera;
        this.burst(r);
      }
    }
    // Étincelles.
    const add = [];
    let n = 0;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i];
      q.age += dt;
      if (q.age >= q.life || n >= MAX) {
        this.parts[i] = this.parts[this.parts.length - 1];
        this.parts.pop();
        continue;
      }
      q.v.multiplyScalar(Math.max(0, 1 - q.drag * dt));
      q.v.y += GRAVITY * q.grav * dt;
      q.p.addScaledVector(q.v, dt);
      if (q.trail) {
        q.trailT -= dt;
        if (q.trailT <= 0 && q.age < q.life * 0.8) {
          q.trailT = 0.06;
          add.push({ p: q.p.clone(), v: new THREE.Vector3(0, -0.3, 0), age: 0, life: 0.45, drag: 0, grav: 0.1, size: q.size * 0.6, c: q.c });
        }
      }
      const k = 1 - q.age / q.life;
      let a = Math.min(1, k * 1.6);
      if (q.twinkle) a *= Math.random() < 0.45 ? 1 : 0.15;
      this.pos[n * 3] = q.p.x;
      this.pos[n * 3 + 1] = q.p.y;
      this.pos[n * 3 + 2] = q.p.z;
      this.col[n * 3] = q.c.r;
      this.col[n * 3 + 1] = q.c.g;
      this.col[n * 3 + 2] = q.c.b;
      this.alpha[n] = a;
      this.size[n] = q.size * (0.6 + 0.4 * k);
      n++;
    }
    for (const q of add) if (this.parts.length < MAX) this.parts.push(q);
    const g = this.points.geometry;
    g.setDrawRange(0, n);
    for (const name of ['position', 'color', 'alpha', 'size']) g.attributes[name].needsUpdate = true;
  }
}
