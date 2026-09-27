// Netteté adaptative : sur les écrans haute définition (Retina, 4K…), le jeu dessine
// jusqu'à ×1,5 ou ×2 pixels. Si la carte graphique n'arrive plus à suivre, la netteté
// baisse un peu — jamais en dessous de la résolution normale de l'écran — puis remonte
// dès qu'il y a de la marge. Le temps réel passé par la carte graphique est mesuré quand
// le navigateur le permet (EXT_disjoint_timer_query_webgl2) ; sinon, la durée des images.

const STEP = 0.125;
const WINDOW = 1.5; // secondes entre deux décisions

export class DynamicResolution {
  constructor(renderer) {
    this.gl = renderer.getContext();
    this.ext = this.gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.pending = [];
    this.active = null;
    this.ratio = null;
    this.reset();
  }

  reset() {
    this.t = 0;
    this.gpuAcc = 0;
    this.gpuN = 0;
    this.frameAcc = 0;
    this.frameN = 0;
    this.clock = 0;
    this.retryAt = 0;
    this.backoff = 15;
    this.ratio = null;
  }

  /** Début de la mesure du temps de la carte graphique (avant le rendu). */
  begin() {
    if (!this.ext || this.active || this.pending.length > 4) return;
    const gl = this.gl;
    this.active = gl.createQuery();
    gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.active);
  }

  /** Fin de la mesure (après le rendu) ; relève les mesures prêtes des images précédentes. */
  end() {
    const gl = this.gl;
    if (this.active) {
      gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.pending.push(this.active);
      this.active = null;
    }
    while (this.pending.length) {
      const q = this.pending[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      if (!gl.getParameter(this.ext.GPU_DISJOINT_EXT)) {
        this.gpuAcc += gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
        this.gpuN++;
      }
      gl.deleteQuery(q);
      this.pending.shift();
    }
  }

  /**
   * Rapport de pixels à utiliser. full : netteté des réglages ; floor : minimum
   * (résolution normale de l'écran) ; targetMs : durée visée d'une image.
   */
  update(dt, full, floor, targetMs) {
    if (this.ratio === null || this.ratio > full || floor >= full) this.ratio = full;
    if (floor >= full) return full;
    this.clock += dt;
    // Onglet caché, chargement… (plus d'une seconde) : ces images ne comptent pas.
    if (dt < 1) {
      this.frameAcc += dt * 1000;
      this.frameN++;
    }
    this.t += dt;
    if (this.t < WINDOW || this.frameN < 4) return this.ratio;
    const frame = this.frameAcc / this.frameN;
    const gpu = this.gpuN >= 4 ? this.gpuAcc / this.gpuN : null;
    this.t = 0;
    this.frameAcc = 0;
    this.frameN = 0;
    this.gpuAcc = 0;
    this.gpuN = 0;
    let r = this.ratio;
    if (gpu !== null) {
      // Le coût suit à peu près le nombre de pixels (ratio²).
      const budget = targetMs * 0.85;
      if (gpu > budget) r = Math.min(r - STEP, r * Math.sqrt((budget * 0.9) / gpu));
      else if (gpu < budget * 0.6 && r < full) r = Math.max(r + STEP, r * Math.sqrt((budget * 0.75) / gpu));
    } else if (frame > targetMs * 1.25) {
      r -= 0.25;
      // Remonter trop tôt referait ramer : on attend de plus en plus longtemps.
      this.retryAt = this.clock + this.backoff;
      this.backoff = Math.min(this.backoff * 2, 240);
    } else if (frame < targetMs * 1.08 && r < full && this.clock > this.retryAt) {
      r += 0.25;
    }
    r = Math.min(full, Math.max(floor, Math.round(r / STEP) * STEP));
    this.ratio = r;
    return r;
  }
}
