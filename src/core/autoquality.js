// Qualité automatique : le jeu mesure sa propre fluidité et, s'il rame, allège de
// lui-même ses réglages, du moins visible au plus visible (ombres de contact, netteté
// Retina, herbe, ombres, résolution…), puis les remonte quand il y a de la marge.
// Jamais au-delà des réglages choisis. Le niveau atteint est retenu pour la prochaine
// fois : un petit ordinateur démarre directement avec les bons réglages.

/**
 * Paliers d'allègement, cumulés : chaque palier ne fait que baisser ce que les réglages
 * demandent (valeurs minimales, options coupées). fieldK : rayon du tapis d'herbe dense
 * (coûteux) ; grassK : rayon des touffes d'herbe (légères) ; treeK : distances de détail
 * des arbres ; shadowEvery : ombres recalculées une image sur N (ne recompile rien,
 * contrairement à leur suppression). Le sol texturé et les touffes restent le plus
 * longtemps : sans eux, le décor paraît vide.
 */
export const AUTO_LEVELS = [
  {},
  { ao: false },
  { maxRatio: 1.5 },
  { maxRatio: 1.25, fieldK: 0.6 },
  { maxRatio: 1, shadows: 'low', bloom: false },
  { renderScale: 0.85, aa: 'fxaa', treeK: 0.7, fieldK: 0.4 },
  { renderScale: 0.75, shadowEvery: 2 },
  { renderScale: 0.67, fieldK: 0, treeK: 0.5 },
  { renderScale: 0.6, ground: false, grading: false, renderDistance: 200, shadowEvery: 3, grassK: 0.6 },
  { renderScale: 0.52, aa: 'off' },
];
export const MAX_LEVEL = AUTO_LEVELS.length - 1;

const RANK = {
  shadows: ['off', 'low', 'high', 'ultra'],
  aa: ['off', 'fxaa', 'smaa', 'msaa'],
};

/** Réglages effectivement utilisés : ceux choisis, allégés jusqu'au palier donné. */
export function effectiveGraphics(gs, level) {
  const out = { ...gs, grassK: 1, fieldK: 1, treeK: 1, shadowEvery: 1 };
  for (let i = 1; i <= Math.min(level, MAX_LEVEL); i++) {
    for (const [k, v] of Object.entries(AUTO_LEVELS[i])) {
      if (typeof v === 'boolean') out[k] = out[k] && v;
      else if (RANK[k]) out[k] = RANK[k][Math.min(RANK[k].indexOf(out[k]), RANK[k].indexOf(v))] ?? v;
      else if (k === 'shadowEvery') out[k] = Math.max(out[k], v);
      else out[k] = Math.min(out[k], v);
    }
  }
  return out;
}

/** Deux paliers donnent-ils les mêmes réglages (palier sans effet ici) ? */
function sameEffect(gs, a, b, dpr) {
  const x = effectiveGraphics(gs, a);
  const y = effectiveGraphics(gs, b);
  const ratio = (g) => Math.min(dpr, g.maxRatio) * g.renderScale;
  return Object.keys(x).every((k) => k === 'maxRatio' || x[k] === y[k]) && Math.abs(ratio(x) - ratio(y)) < 0.01;
}

/**
 * Palier de départ selon la carte graphique (premier lancement) : les puces graphiques
 * intégrées commencent allégées, la qualité automatique ajuste ensuite.
 */
export function initialLevel(renderer) {
  let name = '';
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  } catch {
    return 0;
  }
  if (/SwiftShader|llvmpipe|softpipe|Software/i.test(name)) return 0;
  if (/Mali|Adreno|PowerVR|Apple A\d/i.test(name)) return 7;
  if (/Intel/i.test(name) && !/Arc/i.test(name)) return /Iris.*Xe|Xe Graphics/i.test(name) ? 5 : 7;
  if (/Radeon\(TM\) (Graphics|Vega)|Radeon Graphics|Vega \d/i.test(name)) return 5;
  if (/Apple M\d+ (Pro|Max|Ultra)/i.test(name)) return 2;
  if (/Apple/i.test(name)) return 4;
  if (/GeForce (GT |MX)|Quadro [KPT]\d{3,4}\b/i.test(name)) return 4;
  return 0;
}

const WINDOW = 2; // secondes par mesure
const SETTLE = 2.5; // secondes ignorées après un changement (compilation, chargement)

export class AutoQuality {
  constructor(renderer) {
    this.gl = renderer.getContext();
    this.ext = this.gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.pending = [];
    this.active = null;
    this.level = 0;
    this.frames = [];
    this.gpuAcc = 0;
    this.gpuN = 0;
    this.gpuSeen = false;
    this.t = 0;
    this.settle = SETTLE;
    this.calm = 0; // secondes fluides d'affilée
    this.good = 0; // mesures d'affilée avec de la marge (temps de la carte graphique)
    this.wait = 20; // secondes fluides avant d'essayer de remonter (sans mesure GPU)
    this.probe = null; // essai de remontée en cours : { from, until }
    this.struggle = 0; // mesures d'affilée encore trop lentes au dernier palier
  }

  /** Début de la mesure du temps de la carte graphique (si le navigateur le permet). */
  begin() {
    if (!this.ext || this.active || this.pending.length > 4) return;
    this.active = this.gl.createQuery();
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.active);
  }

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
        const ms = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
        this.gpuAcc += ms;
        this.gpuN++;
        // Certains navigateurs renvoient toujours 0 : la mesure n'est alors pas fiable.
        if (ms > 0.2) this.gpuSeen = true;
      }
      gl.deleteQuery(q);
      this.pending.shift();
    }
  }

  /** Recommence les mesures (réglages changés, chargement, retour dans l'onglet…). */
  restart(level = this.level) {
    this.level = level;
    this.frames.length = 0;
    this.gpuAcc = 0;
    this.gpuN = 0;
    this.t = 0;
    this.settle = SETTLE;
    this.calm = 0;
    this.good = 0;
  }

  /**
   * Une image de plus. Renvoie le nouveau palier quand il change, sinon null.
   * gs : réglages choisis ; targetMs : durée visée d'une image ; dpr : écran.
   */
  update(dt, gs, targetMs, dpr) {
    if (dt > 0.5) {
      this.settle = Math.max(this.settle, 1);
      return null;
    }
    if (this.settle > 0) {
      this.settle -= dt;
      this.gpuAcc = 0;
      this.gpuN = 0;
      return null;
    }
    this.frames.push(dt * 1000);
    this.t += dt;
    if (this.t < WINDOW || this.frames.length < 8) return null;
    // Durée typique d'une image (les à-coups isolés ne comptent pas).
    const sorted = this.frames.sort((a, b) => a - b);
    const frame = sorted[Math.floor(sorted.length * 0.6)];
    const gpu = this.gpuSeen && this.gpuN >= 4 ? this.gpuAcc / this.gpuN : null;
    const span = this.t;
    this.frames.length = 0;
    this.t = 0;
    this.gpuAcc = 0;
    this.gpuN = 0;

    // Même tout allégé, toujours lent : le jeu proposera le préréglage Basse.
    this.struggle = this.level === MAX_LEVEL && frame > targetMs * 1.7 ? this.struggle + 1 : 0;
    let next = this.level;
    if (frame > targetMs * 1.2 && this.level < MAX_LEVEL) {
      // Trop lent : un palier (deux si c'est très lent).
      next = this.level + (frame > targetMs * 2 ? 2 : 1);
      if (this.probe && this.probe.from === this.level) {
        // L'essai de remontée a échoué : on attendra plus longtemps la prochaine fois.
        this.wait = Math.min(this.wait * 2, 600);
      }
      this.probe = null;
      this.calm = 0;
      this.good = 0;
    } else if (this.level > 0) {
      this.calm += span;
      if (this.probe && this.calm > 12) this.probe = null;
      if (gpu !== null) {
        // Temps de la carte graphique connu : on remonte quand elle a de la marge.
        this.good = gpu < targetMs * 0.45 && frame < targetMs * 1.1 ? this.good + 1 : 0;
        if (this.good >= 3) next = this.level - 1;
      } else if (frame < targetMs * 1.08 && this.calm > this.wait) {
        next = this.level - 1;
        this.probe = { from: next };
      }
    }
    next = Math.max(0, Math.min(MAX_LEVEL, next));
    // Paliers sans effet sur cet écran : on les saute.
    const dir = Math.sign(next - this.level);
    while (dir && next > 0 && next < MAX_LEVEL && sameEffect(gs, next, next - dir, dpr)) next += dir;
    if (next === this.level) return null;
    this.restart(next);
    return next;
  }
}
