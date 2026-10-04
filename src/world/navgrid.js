// Grille de déplacement des animaux : le monde découpé en cases de 50 cm, chacune libre
// ou bloquée (obstacle, potager, eau…). Les cases sont évaluées à la demande puis gardées ;
// quand un obstacle apparaît ou disparaît (meuble posé, fête qui s'installe), seules les
// cases autour sont oubliées. Un animal qui ne voit pas son but en ligne droite y cherche
// un chemin (A*) et le suit de coin en coin, au lieu de foncer et de glisser contre les murs.

const CELL = 0.5;
const CLEAR = 0.35; // marge autour des obstacles (rayon d'un animal moyen)
const KNOWN = 1;
const LAND = 2; // sol ferme (animaux terrestres)
const SWIM = 4; // sol ou eau peu profonde (canards, loutres)
const BLOCK = 8; // obstacle, ou sol interdit aux animaux (world.addCover)
const MAX_NODES = 5000; // cases explorées au plus par recherche (le tour d'un étang)

const NEIGH = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

export class NavGrid {
  constructor(world, half) {
    this.world = world;
    this.half = half;
    this.n = Math.ceil((half * 2) / CELL);
    this.cells = new Uint8Array(this.n * this.n);
  }

  inside(x, z) {
    return Math.abs(x) < this.half - 1 && Math.abs(z) < this.half - 1;
  }

  index(x, z) {
    const ix = Math.floor((x + this.half) / CELL);
    const iz = Math.floor((z + this.half) / CELL);
    if (ix < 0 || iz < 0 || ix >= this.n || iz >= this.n) return -1;
    return iz * this.n + ix;
  }

  center(i) {
    return { x: (i % this.n) * CELL - this.half + CELL / 2, z: Math.floor(i / this.n) * CELL - this.half + CELL / 2 };
  }

  /** Oublie les cases autour d'un obstacle qui change (centre x, z ; rayon r). */
  invalidate(x, z, r) {
    const pad = r + CLEAR + CELL;
    const x0 = Math.max(0, Math.floor((x - pad + this.half) / CELL));
    const x1 = Math.min(this.n - 1, Math.floor((x + pad + this.half) / CELL));
    const z0 = Math.max(0, Math.floor((z - pad + this.half) / CELL));
    const z1 = Math.min(this.n - 1, Math.floor((z + pad + this.half) / CELL));
    if (x0 > x1 || z0 > z1) return;
    for (let iz = z0; iz <= z1; iz++) this.cells.fill(0, iz * this.n + x0, iz * this.n + x1 + 1);
  }

  bits(i) {
    let b = this.cells[i];
    if (b) return b;
    const { x, z } = this.center(i);
    const w = this.world;
    const h = w.groundAt(x, z);
    b = KNOWN;
    if (h > 0.25) b |= LAND;
    if (h > -3) b |= SWIM;
    const r = w.colliders.resolve(x, z, CLEAR);
    if (Math.abs(r.x - x) + Math.abs(r.z - z) > 1e-4 || w.covered(x, z, CLEAR, 'animals')) b |= BLOCK;
    this.cells[i] = b;
    return b;
  }

  /** La case est-elle praticable (swim : canards et loutres, qui nagent) ? */
  open(i, swim) {
    if (i < 0) return false;
    const b = this.bits(i);
    return !(b & BLOCK) && !!(b & (swim ? SWIM : LAND));
  }

  walkable(x, z, swim = false) {
    return this.open(this.index(x, z), swim);
  }

  /** Ligne droite praticable de a à b (la case de départ ne compte pas : on peut frôler un mur). */
  clear(ax, az, bx, bz, swim = false) {
    const d = Math.hypot(bx - ax, bz - az);
    const steps = Math.ceil(d / (CELL * 0.5));
    const start = this.index(ax, az);
    let last = start;
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      const i = this.index(ax + (bx - ax) * t, az + (bz - az) * t);
      if (i === last) continue;
      last = i;
      if (!this.open(i, swim)) return false;
    }
    return true;
  }

  /** Case libre la plus proche de (x, z), à moins de `radius` m (ou -1). */
  nearestOpen(x, z, swim, radius = 2) {
    const i0 = this.index(x, z);
    if (i0 < 0) return -1;
    if (this.open(i0, swim)) return i0;
    const n = this.n;
    const cx = i0 % n;
    const cz = Math.floor(i0 / n);
    const R = Math.ceil(radius / CELL);
    for (let r = 1; r <= R; r++) {
      let best = -1;
      let bestD = Infinity;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const ix = cx + dx;
          const iz = cz + dz;
          if (ix < 0 || iz < 0 || ix >= n || iz >= n) continue;
          const i = iz * n + ix;
          const dd = dx * dx + dz * dz;
          if (dd < bestD && this.open(i, swim)) {
            best = i;
            bestD = dd;
          }
        }
      }
      if (best >= 0) return best;
    }
    return -1;
  }

  /**
   * Chemin de (ax, az) vers (bx, bz) : liste de points à suivre, déjà lissée (on va droit
   * d'un coin à l'autre). Si le but est hors d'atteinte, le chemin mène au plus près.
   * Renvoie { pts, reached } ou null (aucune case libre autour du départ).
   */
  findPath(ax, az, bx, bz, swim = false) {
    const n = this.n;
    const start = this.index(ax, az);
    if (start < 0) return null;
    const goal = this.nearestOpen(bx, bz, swim, 2.5);
    const target = goal >= 0 ? goal : this.index(bx, bz);
    if (target < 0) return null;
    const tx = target % n;
    const tz = Math.floor(target / n);
    const hOf = (i) => {
      const dx = Math.abs((i % n) - tx);
      const dz = Math.abs(Math.floor(i / n) - tz);
      return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
    };
    const g = new Map([[start, 0]]);
    const from = new Map();
    const closed = new Set();
    // Tas binaire (f, case).
    const heapF = [];
    const heapI = [];
    const push = (f, i) => {
      let k = heapF.length;
      heapF.push(f);
      heapI.push(i);
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heapF[p] <= f) break;
        heapF[k] = heapF[p];
        heapI[k] = heapI[p];
        k = p;
      }
      heapF[k] = f;
      heapI[k] = i;
    };
    const pop = () => {
      const top = heapI[0];
      const f = heapF.pop();
      const i = heapI.pop();
      if (heapF.length) {
        let k = 0;
        const len = heapF.length;
        for (;;) {
          const l = 2 * k + 1;
          if (l >= len) break;
          const r = l + 1;
          const c = r < len && heapF[r] < heapF[l] ? r : l;
          if (heapF[c] >= f) break;
          heapF[k] = heapF[c];
          heapI[k] = heapI[c];
          k = c;
        }
        heapF[k] = f;
        heapI[k] = i;
      }
      return top;
    };
    push(hOf(start), start);
    let best = start;
    let bestH = hOf(start);
    let found = false;
    let explored = 0;
    while (heapF.length && explored < MAX_NODES) {
      const cur = pop();
      if (closed.has(cur)) continue;
      closed.add(cur);
      explored++;
      if (cur === target) {
        found = true;
        best = cur;
        break;
      }
      const h = hOf(cur);
      if (h < bestH) {
        bestH = h;
        best = cur;
      }
      const cx = cur % n;
      const cz = Math.floor(cur / n);
      const gc = g.get(cur);
      for (const [dx, dz, cost] of NEIGH) {
        const ix = cx + dx;
        const iz = cz + dz;
        if (ix < 0 || iz < 0 || ix >= n || iz >= n) continue;
        const ni = iz * n + ix;
        if (closed.has(ni) || !this.open(ni, swim)) continue;
        // En diagonale, sans couper le coin d'un obstacle.
        if (dx && dz && (!this.open(cz * n + ix, swim) || !this.open(iz * n + cx, swim))) continue;
        const ng = gc + cost;
        if (ng < (g.get(ni) ?? Infinity)) {
          g.set(ni, ng);
          from.set(ni, cur);
          push(ng + hOf(ni), ni);
        }
      }
    }
    if (best === start && !found) return null;
    // Remonte le chemin, puis ne garde que les coins (on va droit tant que la vue est dégagée).
    const cells = [];
    for (let i = best; i !== undefined; i = from.get(i)) cells.push(i);
    cells.reverse();
    const raw = cells.map((i) => this.center(i));
    // But atteint dans sa propre case : on finit pile dessus (sinon au centre de la case libre).
    const reached = found && target === this.index(bx, bz);
    if (reached) raw[raw.length - 1] = { x: bx, z: bz };
    const pts = [];
    let ax0 = ax;
    let az0 = az;
    let k = 0;
    while (k < raw.length - 1) {
      let j = raw.length - 1;
      while (j > k + 1 && !this.clear(ax0, az0, raw[j].x, raw[j].z, swim)) j--;
      pts.push(raw[j]);
      ax0 = raw[j].x;
      az0 = raw[j].z;
      k = j;
    }
    if (!pts.length) pts.push(raw[raw.length - 1]);
    return { pts, reached };
  }
}
