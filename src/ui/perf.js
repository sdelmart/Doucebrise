// Compteur d'images par seconde (F3) : simple (FPS) ou détaillé (temps d'image,
// graphique, appels de dessin, triangles, résolution, carte graphique).

export class PerfOverlay {
  constructor(game) {
    this.game = game;
    this.mode = 'off';
    this.el = document.createElement('div');
    this.el.id = 'perf';
    this.el.className = 'perf hidden';
    this.el.innerHTML = '<div class="perf-fps"></div><canvas width="160" height="36"></canvas><div class="perf-detail"></div>';
    document.body.appendChild(this.el);
    this.fpsEl = this.el.querySelector('.perf-fps');
    this.detailEl = this.el.querySelector('.perf-detail');
    this.canvas = this.el.querySelector('canvas');
    this.samples = new Float32Array(160);
    this.si = 0;
    this.acc = 0;
    this.frames = 0;
    this.fps = 0;
    this.worst = 0;
    this.gpu = this.detectGpu();
  }

  detectGpu() {
    try {
      const gl = this.game.renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      return String(name).replace(/ANGLE \((.*)\)/, '$1').split(',').slice(0, 2).join(',').slice(0, 60);
    } catch {
      return '';
    }
  }

  setMode(mode) {
    this.mode = mode || 'off';
    this.el.classList.toggle('hidden', this.mode === 'off');
    this.el.classList.toggle('detail', this.mode === 'detail');
  }

  update(dt) {
    if (this.mode === 'off') return;
    this.samples[this.si] = dt * 1000;
    this.si = (this.si + 1) % this.samples.length;
    this.acc += dt;
    this.frames++;
    this.worst = Math.max(this.worst, dt * 1000);
    if (this.acc < 0.5) return;
    this.fps = Math.round(this.frames / this.acc);
    const avg = (this.acc / this.frames) * 1000;
    const worst = this.worst;
    this.acc = 0;
    this.frames = 0;
    this.worst = 0;
    const col = this.fps >= 55 ? '#4fb896' : this.fps >= 30 ? '#e0a000' : '#e5484d';
    this.fpsEl.innerHTML = `<b style="color:${col}">${this.fps}</b> FPS`;
    if (this.mode !== 'detail') return;
    const g = this.game;
    const info = g.renderer.info;
    const r = g.renderer;
    const w = Math.round(r.domElement.width);
    const h = Math.round(r.domElement.height);
    const gs = g.settings.graphics;
    this.detailEl.innerHTML = `${avg.toFixed(1)} ms · pire ${worst.toFixed(1)} ms<br>
      ${info.render.calls} dessins · ${(info.render.triangles / 1000).toFixed(0)} k triangles<br>
      ${info.memory.geometries} géométries · ${info.memory.textures} textures<br>
      ${w}×${h} · ombres ${gs.shadows} · ${gs.aa.toUpperCase()}${gs.bloom ? ' · bloom' : ''}<br>
      <span class="perf-gpu">${this.gpu}</span>`;
    this.drawGraph();
  }

  drawGraph() {
    const c = this.canvas;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    const y60 = c.height - (16.7 / 50) * c.height;
    ctx.fillRect(0, y60, c.width, 1);
    for (let i = 0; i < this.samples.length; i++) {
      const v = this.samples[(this.si + i) % this.samples.length];
      const hh = Math.min(c.height, (v / 50) * c.height);
      ctx.fillStyle = v <= 17.5 ? '#7fe0a0' : v <= 34 ? '#ffd166' : '#ff6f7d';
      ctx.fillRect(i, c.height - hh, 1, hh);
    }
  }
}
