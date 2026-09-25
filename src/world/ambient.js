import * as THREE from 'three';
import { createRng } from '../core/math.js';

// Vie ambiante : papillons le jour, lucioles la nuit, pétales qui volent.

function wingTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(34, 22, 26, 18, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(28, 46, 18, 14, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(38, 22, 6, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const TMP = {
  m: new THREE.Matrix4(),
  q: new THREE.Quaternion(),
  e: new THREE.Euler(),
  s: new THREE.Vector3(),
  p: new THREE.Vector3(),
  dir: new THREE.Vector3(),
  flip: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI),
};

export class Ambient {
  constructor(world) {
    this.world = world;
    this.group = new THREE.Group();
    const rng = createRng(555);
    this.rng = rng;

    // Papillons : deux ailes instanciées par papillon.
    const N = 36;
    const wingGeo = new THREE.PlaneGeometry(0.34, 0.34);
    wingGeo.translate(0.17, 0, 0);
    wingGeo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ map: wingTexture(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
    this.wings = new THREE.InstancedMesh(wingGeo, mat, N * 2);
    this.wings.frustumCulled = false;
    const colors = ['#ffb3c7', '#ffe27a', '#b9a4ff', '#9ad9ff', '#ffffff', '#ffb27a'];
    this.butterflies = [];
    const col = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const home = this.randomHome(rng);
      this.butterflies.push({
        home,
        pos: new THREE.Vector3(home.x, home.y, home.z),
        target: new THREE.Vector3(home.x, home.y, home.z),
        phase: rng() * 10,
        speed: rng.range(1.2, 2.2),
        heading: 0,
      });
      col.set(rng.pick(colors));
      this.wings.setColorAt(i * 2, col);
      this.wings.setColorAt(i * 2 + 1, col);
    }
    this.group.add(this.wings);

    // Lucioles.
    const F = 160;
    const fg = new THREE.BufferGeometry();
    const fp = new Float32Array(F * 3);
    const seeds = new Float32Array(F);
    this.fireflies = [];
    for (let i = 0; i < F; i++) {
      const h = this.randomHome(rng, true);
      this.fireflies.push({ x: h.x, y: h.y, z: h.z, a: rng() * 10, r: rng.range(0.5, 2.5) });
      fp[i * 3] = h.x;
      fp[i * 3 + 1] = h.y;
      fp[i * 3 + 2] = h.z;
      seeds[i] = rng() * 100;
    }
    fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    fg.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
    this.fireflyUniforms = { uTime: { value: 0 }, uAlpha: { value: 0 }, uScale: { value: 300 } };
    const fm = new THREE.ShaderMaterial({
      uniforms: this.fireflyUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float seed; uniform float uTime; uniform float uScale; varying float vA;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          vA = 0.5 + 0.5 * sin(uTime * (1.5 + fract(seed) * 2.0) + seed);
          gl_PointSize = uScale * 0.22 / -mv.z;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uAlpha; varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vec3(1.0, 0.95, 0.55) * a, a * vA * uAlpha);
        }`,
    });
    this.fireflyPoints = new THREE.Points(fg, fm);
    this.fireflyPoints.frustumCulled = false;
    this.group.add(this.fireflyPoints);
  }

  randomHome(rng, low = false) {
    for (let t = 0; t < 50; t++) {
      const x = rng.range(-85, 85);
      const z = rng.range(-85, 85);
      const h = this.world.heightAt(x, z);
      if (h < 0.8) continue;
      return { x, y: h + (low ? rng.range(0.6, 2.4) : rng.range(0.6, 1.8)), z };
    }
    return { x: 40, y: 3, z: 8 };
  }

  update(dt, elapsed, night, focus) {
    const day = 1 - night;
    const { m, q, e, s, p, dir, flip } = TMP;
    this.butterflies.forEach((b, i) => {
      b.phase += dt * 16;
      if (b.pos.distanceToSquared(b.target) < 0.3 || Math.random() < dt * 0.2) {
        b.target.set(
          b.home.x + this.rng.range(-6, 6),
          0,
          b.home.z + this.rng.range(-6, 6),
        );
        b.target.y = Math.max(this.world.heightAt(b.target.x, b.target.z), 0) + this.rng.range(0.5, 2);
      }
      dir.copy(b.target).sub(b.pos);
      const len = dir.length();
      if (len > 0.01) {
        dir.multiplyScalar(Math.min(1, (b.speed * dt) / len));
        b.pos.add(dir);
        b.heading = Math.atan2(dir.x, dir.z);
      }
      const bob = Math.sin(b.phase * 0.25) * 0.15;
      const flap = Math.sin(b.phase) * 1.1;
      const sc = day > 0.3 ? 1 : 0;
      for (let w = 0; w < 2; w++) {
        e.set(0, b.heading, (w === 0 ? 1 : -1) * flap, 'YXZ');
        q.setFromEuler(e);
        if (w === 1) q.multiply(flip);
        m.compose(p.set(b.pos.x, b.pos.y + bob, b.pos.z), q, s.setScalar(sc));
        this.wings.setMatrixAt(i * 2 + w, m);
      }
    });
    this.wings.instanceMatrix.needsUpdate = true;

    // Lucioles : elles tournent doucement autour de leur point de départ.
    this.fireflyUniforms.uTime.value = elapsed;
    this.fireflyUniforms.uAlpha.value = Math.max(0, night - 0.3) / 0.7;
    if (night > 0.3) {
      const pos = this.fireflyPoints.geometry.attributes.position;
      this.fireflies.forEach((f, i) => {
        const a = elapsed * 0.4 + f.a;
        pos.setXYZ(i, f.x + Math.cos(a) * f.r, f.y + Math.sin(a * 1.7) * 0.4, f.z + Math.sin(a * 0.8) * f.r);
      });
      pos.needsUpdate = true;
    }
    this.fireflyUniforms.uScale.value = window.innerHeight;
  }
}
