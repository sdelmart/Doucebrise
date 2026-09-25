import * as THREE from 'three';

// Petites bulles d'émotion (cœurs, notes, « Zzz », étincelles…) en sprites.

function makeTexture(draw) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  draw(ctx);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const DRAW = {
  heart: (ctx) => {
    ctx.fillStyle = '#ff5d8f';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(32, 54);
    ctx.bezierCurveTo(2, 34, 10, 6, 32, 20);
    ctx.bezierCurveTo(54, 6, 62, 34, 32, 54);
    ctx.stroke();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(21, 24, 5, 3, -0.6, 0, Math.PI * 2);
    ctx.fill();
  },
  note: (ctx) => {
    ctx.fillStyle = '#7b6cf6';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(22, 46, 11, 8, -0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();
    ctx.fillRect(29, 12, 6, 34);
    ctx.fillRect(29, 12, 18, 7);
  },
  zzz: (ctx) => {
    ctx.fillStyle = '#6fa8dc';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.font = '900 44px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('z', 32, 34);
    ctx.fillText('z', 32, 34);
  },
  sparkle: (ctx) => {
    ctx.fillStyle = '#ffe066';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? 8 : 26;
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  },
  alert: (ctx) => {
    ctx.fillStyle = '#ff8a3d';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.font = '900 50px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('!', 32, 34);
    ctx.fillText('!', 32, 34);
  },
  drop: (ctx) => {
    ctx.fillStyle = '#8fd6f5';
    ctx.beginPath();
    ctx.arc(32, 36, 14, 0, Math.PI * 2);
    ctx.fill();
  },
};

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.textures = {};
    for (const [k, fn] of Object.entries(DRAW)) this.textures[k] = makeTexture(fn);
    this.materials = {};
    for (const k of Object.keys(DRAW)) {
      this.materials[k] = new THREE.SpriteMaterial({ map: this.textures[k], transparent: true, depthWrite: false });
    }
    this.pool = [];
    this.active = [];
  }

  emit(kind, pos, { count = 1, spread = 0.3, rise = 0.9, life = 1.4, size = 0.35, delay = 0.12 } = {}) {
    for (let i = 0; i < count; i++) {
      let sp = this.pool.pop();
      if (!sp) {
        sp = new THREE.Sprite(this.materials[kind].clone());
        this.scene.add(sp);
      }
      sp.material.map = this.textures[kind];
      sp.material.opacity = 1;
      sp.visible = true;
      sp.position.set(pos.x + (Math.random() - 0.5) * spread, pos.y, pos.z + (Math.random() - 0.5) * spread);
      sp.scale.setScalar(0.001);
      this.active.push({ sp, t: -i * delay, life, rise, size, drift: (Math.random() - 0.5) * 0.4 });
    }
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.t += dt;
      if (p.t < 0) continue;
      const k = p.t / p.life;
      if (k >= 1) {
        p.sp.visible = false;
        this.pool.push(p.sp);
        this.active.splice(i, 1);
        continue;
      }
      p.sp.position.y += p.rise * dt;
      p.sp.position.x += p.drift * dt;
      const pop = Math.min(1, p.t * 6);
      p.sp.scale.setScalar(p.size * pop * (1 + Math.sin(p.t * 8) * 0.05));
      p.sp.material.opacity = k > 0.7 ? (1 - k) / 0.3 : 1;
    }
  }
}
